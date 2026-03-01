import { DebateStore, getStore } from "./store";
import {
  runHostDecision,
  runHostMidRoundDecision,
  runHostPostRoundDecision,
  generateRoundSummary,
  updateHostMemoryBackground,
} from "./host";
import {
  runGuestRound,
  runGuestExchange,
  runChallengeRound,
  runSelectiveGuestRound,
} from "./guests";
import { runResearchPhase, runFactCheck } from "./research";

// ─── Helpers ────────────────────────────────────────────────────────

function checkGuestPrereqs(store: DebateStore, roomId: string): boolean {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!state.selectedGuestModel || !room?.guests.length) {
    store.addMessage(roomId, {
      role: "system",
      content: !state.selectedGuestModel
        ? "No guest model selected. Please select a guest model in the Config tab."
        : "No guests in the room. Add guests in the Guests tab.",
      isStreaming: false,
      isSummary: false,
      isError: true,
    });
    store.setPhase(roomId, "AWAITING_USER");
    return false;
  }
  return true;
}

// ─── Mid-Round Follow-Up Loop ───────────────────────────────────────
//
// After all guests speak once, the host decides who speaks next,
// sets up exchanges, challenges, fact-checks, or ends the round.
//

const MAX_MID_ROUND_ACTIONS = 6;

async function midRoundLoop(
  store: DebateStore,
  roomId: string,
  roundNumber: number,
  roundLog: string[]
): Promise<void> {
  let midRoundActions = 0;

  while (midRoundActions < MAX_MID_ROUND_ACTIONS) {
    midRoundActions++;

    // Host decides mid-round action
    store.setPhase(roomId, "HOST_THINKING");
    const decision = await runHostMidRoundDecision(
      store,
      roomId,
      roundNumber,
      roundLog.join("\n\n")
    );

    // Show host's message
    store.setPhase(roomId, "HOST_PRESENTING");
    store.addMessage(roomId, {
      role: "host",
      content: decision.message,
      isStreaming: false,
      isSummary: false,
      isError: false,
      intent: "standard",
    });
    roundLog.push(`[Host → ${decision.action}]: ${decision.message}`);

    // End round
    if (decision.action === "end_round") {
      return;
    }

    // Call on specific guests
    if (decision.action === "call_on") {
      if (!checkGuestPrereqs(store, roomId)) return;

      const targetNames = decision.target_guests || [];
      const result = await runSelectiveGuestRound(
        store,
        roomId,
        decision.message,
        targetNames
      );
      if (result) {
        roundLog.push(`[Called on ${targetNames.join(", ")}]:\n${result}`);
      }
      continue;
    }

    // Exchange between guests
    if (decision.action === "exchange") {
      if (!checkGuestPrereqs(store, roomId)) return;

      const targetNames = decision.target_guests || [];
      const result = await runGuestExchange(
        store,
        roomId,
        decision.message,
        targetNames
      );
      if (result) {
        roundLog.push(`[Exchange]:\n${result}`);
      }
      // Exchanges increase intensity
      const r = store.getRoom(roomId);
      if (r) {
        store.updateDebateIntensity(roomId, Math.min(1, r.debateIntensity + 0.15));
      }
      continue;
    }

    // Challenge a specific guest
    if (decision.action === "challenge") {
      if (!checkGuestPrereqs(store, roomId)) return;

      const targetName = decision.target_guests?.[0] || "";
      const result = await runChallengeRound(
        store,
        roomId,
        decision.message,
        targetName
      );
      if (result) {
        roundLog.push(`[Challenge → ${targetName}]:\n${result}`);
      }
      const r = store.getRoom(roomId);
      if (r) {
        store.updateDebateIntensity(roomId, Math.min(1, r.debateIntensity + 0.1));
      }
      continue;
    }

    // Fact check
    if (decision.action === "fact_check" && decision.claim_to_check) {
      const result = await runFactCheck(store, roomId, decision.claim_to_check);
      if (result) {
        roundLog.push(`[Fact Check — "${decision.claim_to_check}"]:\n${result}`);
      }
      continue;
    }

    // Research mid-round
    if (decision.action === "research" && decision.research_queries?.length) {
      const result = await runResearchPhase(store, roomId, decision.research_queries);
      if (result) {
        roundLog.push(`[Research]:\n${result}`);
      }
      continue;
    }

    // Unknown action or missing params — end the round
    return;
  }

  // Hit max mid-round actions — force end round
}

// ─── Structured Round ───────────────────────────────────────────────
//
// A single structured round:
//   1. Host opens with a question/prompt → all guests speak once
//   2. Mid-round follow-ups (host picks who speaks next)
//   3. Host ends round → generates markdown round summary
//

async function runStructuredRound(
  store: DebateStore,
  roomId: string,
  hostOpeningMessage: string,
  roundNumber: number
): Promise<string> {
  const roundLog: string[] = [];
  roundLog.push(`[Host opens round ${roundNumber}]: ${hostOpeningMessage}`);

  // Phase 1: All guests speak once
  if (!checkGuestPrereqs(store, roomId)) return "";

  const guestResult = await runGuestRound(store, roomId, hostOpeningMessage);
  if (!guestResult) {
    return "";
  }
  roundLog.push(`[All guests responded]:\n${guestResult}`);

  // Phase 2: Mid-round follow-ups
  await midRoundLoop(store, roomId, roundNumber, roundLog);

  // Phase 3: Generate round summary
  store.setPhase(roomId, "HOST_THINKING");
  const summaryText = await generateRoundSummary(
    store,
    roomId,
    roundNumber,
    roundLog.join("\n\n")
  );

  // Display the summary as a special message
  store.setPhase(roomId, "HOST_PRESENTING");
  store.addMessage(roomId, {
    role: "host",
    content: summaryText,
    isStreaming: false,
    isSummary: true,
    isError: false,
    intent: "round_summary",
  });

  // Update host memory with round summary
  updateHostMemoryBackground(
    store,
    roomId,
    `Round ${roundNumber} completed. Summary: ${summaryText}`
  );

  // Intensity cools slightly after a round summary
  const r = store.getRoom(roomId);
  if (r) {
    store.updateDebateIntensity(roomId, Math.max(0, r.debateIntensity - 0.05));
  }

  return summaryText;
}

// ─── Main Debate Loop ───────────────────────────────────────────────
//
// Outer loop: host decides opening action → run round → post-round decision → repeat
//

interface LoopContext {
  userMessage?: string;
  researchSummary?: string;
}

async function debateLoop(
  store: DebateStore,
  roomId: string,
  context: LoopContext
): Promise<void> {
  const room = store.getRoom(roomId);
  if (!room) return;

  const maxRounds = room.config.maxRounds;
  let roundsCompleted = 0;
  let pendingResearchSummary = context.researchSummary;
  let pendingUserMessage = context.userMessage;

  while (roundsCompleted < maxRounds) {
    // ── Step 1: Host decides the opening action ──
    store.setPhase(roomId, "HOST_THINKING");

    const openingDecision = await runHostDecision(store, roomId, {
      userMessage: pendingUserMessage,
      researchSummary: pendingResearchSummary,
    });

    // Show host message
    store.setPhase(roomId, "HOST_PRESENTING");

    const isSummaryAction = openingDecision.action === "ask_user" || openingDecision.action === "conclude";
    const isSynthesis = openingDecision.action === "synthesize";

    store.addMessage(roomId, {
      role: "host",
      content: openingDecision.message,
      isStreaming: false,
      isSummary: isSummaryAction,
      isError: false,
      intent: isSynthesis ? "synthesis" : "standard",
    });

    // Update host memory
    const memParts: string[] = [];
    if (pendingUserMessage) memParts.push(`User: "${pendingUserMessage}"`);
    if (pendingResearchSummary) memParts.push(`Research: ${pendingResearchSummary}`);
    memParts.push(`Decision: ${openingDecision.action} — ${openingDecision.message}`);
    updateHostMemoryBackground(store, roomId, memParts.join(" "));

    // Clear pending context
    pendingUserMessage = undefined;
    pendingResearchSummary = undefined;

    // ── Route opening action ──

    // Terminal: return control to user
    if (openingDecision.action === "ask_user" || openingDecision.action === "conclude") {
      store.setPhase(roomId, "AWAITING_USER");
      const next = store.dequeueUserMessage(roomId);
      if (next) {
        await sendMessage(roomId, next);
      }
      return;
    }

    // Synthesize: mid-debate summary, then continue
    if (openingDecision.action === "synthesize") {
      const r = store.getRoom(roomId);
      if (r) {
        store.updateDebateIntensity(roomId, Math.max(0, r.debateIntensity - 0.1));
      }
      continue;
    }

    // Research first (before starting a round)
    if (openingDecision.action === "research") {
      if (openingDecision.research_queries?.length) {
        const result = await runResearchPhase(store, roomId, openingDecision.research_queries);
        pendingResearchSummary = result || "Research did not return results.";
      }
      continue;
    }

    // Fact check (standalone, before a round)
    if (openingDecision.action === "fact_check") {
      if (openingDecision.claim_to_check) {
        const result = await runFactCheck(store, roomId, openingDecision.claim_to_check);
        pendingResearchSummary = result
          ? `Fact check of "${openingDecision.claim_to_check}": ${result}`
          : "Fact check did not return results.";
      }
      continue;
    }

    // ── Step 2: Run a structured round ──
    // Actions that lead to a full round: guests, exchange, deep_dive, challenge, call_on
    if (
      openingDecision.action === "guests" ||
      openingDecision.action === "deep_dive" ||
      openingDecision.action === "exchange" ||
      openingDecision.action === "challenge" ||
      openingDecision.action === "call_on"
    ) {
      store.incrementRound(roomId);
      roundsCompleted++;

      const currentRoundNumber = store.getRoom(roomId)?.round ?? roundsCompleted;

      const roundSummary = await runStructuredRound(
        store,
        roomId,
        openingDecision.message,
        currentRoundNumber
      );

      if (!roundSummary) {
        store.setPhase(roomId, "AWAITING_USER");
        return;
      }

      // ── Step 3: Post-round decision ──
      store.setPhase(roomId, "HOST_THINKING");

      // Check for queued user messages
      const queuedUserMsg = store.dequeueUserMessage(roomId);

      const postDecision = await runHostPostRoundDecision(
        store,
        roomId,
        currentRoundNumber,
        roundSummary,
        queuedUserMsg
      );

      // Route post-round decision
      if (postDecision.action === "ask_user" || postDecision.action === "conclude") {
        store.setPhase(roomId, "HOST_PRESENTING");
        store.addMessage(roomId, {
          role: "host",
          content: postDecision.message,
          isStreaming: false,
          isSummary: true,
          isError: false,
          intent: "standard",
        });
        store.setPhase(roomId, "AWAITING_USER");
        const next = store.dequeueUserMessage(roomId);
        if (next) {
          await sendMessage(roomId, next);
        }
        return;
      }

      if (postDecision.action === "research") {
        if (postDecision.research_queries?.length) {
          const result = await runResearchPhase(store, roomId, postDecision.research_queries);
          pendingResearchSummary = result || "Research did not return results.";
        }
        // Show the host's transition message
        store.setPhase(roomId, "HOST_PRESENTING");
        store.addMessage(roomId, {
          role: "host",
          content: postDecision.message,
          isStreaming: false,
          isSummary: false,
          isError: false,
          intent: "standard",
        });
        continue;
      }

      // "guests" → next round (the default path)
      if (postDecision.action === "guests") {
        // The post-round message becomes context for the next opening decision
        pendingUserMessage = queuedUserMsg;
        continue;
      }

      // Fallback: continue to next round
      continue;
    }

    // Unknown action
    store.setPhase(roomId, "AWAITING_USER");
    return;
  }

  // Max rounds reached
  store.addMessage(roomId, {
    role: "system",
    content: "Maximum rounds reached. Returning control to you.",
    isStreaming: false,
    isSummary: false,
    isError: false,
  });
  store.setPhase(roomId, "AWAITING_USER");
}

// ─── Public API ──────────────────────────────────────────────────────

export async function initDebate(roomId: string): Promise<void> {
  const store = getStore();
  const room = store.getRoom(roomId);
  if (!room) return;

  if (!store.getState().selectedHostModel) return;

  store.setPhase(roomId, "HOST_THINKING");

  await debateLoop(store, roomId, {});
}

export async function sendMessage(roomId: string, userMessage: string): Promise<void> {
  const store = getStore();
  const room = store.getRoom(roomId);
  if (!room) return;

  if (!store.getState().selectedHostModel) return;

  // Add user message to chat
  store.addMessage(roomId, {
    role: "user",
    content: userMessage,
    isStreaming: false,
    isSummary: false,
    isError: false,
  });

  // Add to guest histories
  for (const guest of room.guests) {
    const { addToHistory } = await import("./memory");
    const updated = addToHistory(
      guest.memory,
      { role: "user", content: userMessage },
      room.round
    );
    store.updateGuestMemory(roomId, guest.id, updated);
  }

  await debateLoop(store, roomId, { userMessage });
}

// ─── Steering actions (user-initiated mid-debate commands) ──────────

export async function steerDebate(
  roomId: string,
  action: "research_this" | "go_deeper" | "move_on" | "challenge_guest",
  context?: string
): Promise<void> {
  const store = getStore();
  const room = store.getRoom(roomId);
  if (!room) return;

  let message = "";
  switch (action) {
    case "research_this":
      message = context
        ? `[User wants research on: ${context}]`
        : "[User wants more research on the current topic]";
      break;
    case "go_deeper":
      message = context
        ? `[User wants to go deeper on: ${context}]`
        : "[User wants to go deeper on the current discussion]";
      break;
    case "move_on":
      message = "[User wants to move on to the next point]";
      break;
    case "challenge_guest":
      message = context
        ? `[User wants to challenge: ${context}]`
        : "[User wants to challenge a guest's position]";
      break;
  }

  await sendMessage(roomId, message);
}

export function exportTranscript(
  roomId: string,
  format: "full" | "summary" | "json"
): string {
  const store = getStore();
  const room = store.getRoom(roomId);
  if (!room) return "";

  if (format === "json") return JSON.stringify(room, null, 2);

  const lines: string[] = [];
  lines.push(`# ${room.name}`);
  lines.push(`**Topic:** ${room.topic}`);
  lines.push(`**Style:** ${room.config.style}`);
  lines.push(`**Rounds:** ${room.round}`);
  lines.push(`**Date:** ${new Date(room.createdAt).toLocaleDateString()}`);
  lines.push("", "---", "");

  for (const msg of room.messages) {
    if (format === "summary" && msg.role === "guest") continue;
    if (format === "summary" && msg.role === "host" && !msg.isSummary) continue;

    const time = new Date(msg.timestamp).toLocaleTimeString();
    let label = "";
    switch (msg.role) {
      case "host":
        label = `Host${msg.isSummary ? " (Summary)" : ""}${msg.intent === "synthesis" ? " (Synthesis)" : ""}${msg.intent === "round_summary" ? " (Round Summary)" : ""}`;
        break;
      case "guest": {
        const intentLabel = msg.intent === "rebuttal"
          ? " (Rebuttal)"
          : msg.intent === "exchange"
          ? " (Exchange)"
          : msg.intent === "challenge_response"
          ? " (Defending)"
          : "";
        label = `${msg.guestAvatar || ""} ${msg.guestName || "Guest"}${intentLabel}`;
        break;
      }
      case "user":
        label = "You";
        break;
      case "system":
        label = "System";
        break;
    }

    lines.push(`### ${label} — ${time}`, "", msg.content, "");
  }

  if (format === "full" && room.researchFiles.length > 0) {
    lines.push("---", "", "## Research Files", "");
    for (const file of room.researchFiles) {
      lines.push(`### ${file.researcher.emoji} ${file.researcher.name}: ${file.title}`, "", file.content, "");
    }
  }

  return lines.join("\n");
}
