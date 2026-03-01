import { DebateStore, getStore } from "./store";
import { runHostDecision, updateHostMemoryBackground } from "./host";
import { runGuestRound, runGuestExchange, runChallengeRound, runDeepDiveRound } from "./guests";
import { runResearchPhase, runFactCheck } from "./research";

// ─── Host Decision Loop ──────────────────────────────────────────────

interface LoopContext {
  userMessage?: string;
  guestSummary?: string;
  researchSummary?: string;
}

async function hostDecisionLoop(
  store: DebateStore,
  roomId: string,
  context: LoopContext
): Promise<void> {
  const room = store.getRoom(roomId);
  if (!room) return;

  const maxIterations = room.config.maxRounds;
  let iterations = 0;
  let currentContext = { ...context };
  const contextLog: string[] = [];

  if (context.userMessage) {
    contextLog.push(`[User]: "${context.userMessage}"`);
  }

  while (iterations < maxIterations) {
    iterations++;

    // ── Host decides ──
    store.setPhase(roomId, "HOST_THINKING");

    const decision = await runHostDecision(store, roomId, {
      ...currentContext,
      accumulatedContext: contextLog.length > 1 ? contextLog.join("\n\n") : undefined,
    });

    // ── Show host message ──
    store.setPhase(roomId, "HOST_PRESENTING");

    const isSummaryAction = decision.action === "ask_user" || decision.action === "conclude";
    const isSynthesis = decision.action === "synthesize";

    store.addMessage(roomId, {
      role: "host",
      content: decision.message,
      isStreaming: false,
      isSummary: isSummaryAction,
      isError: false,
      intent: isSynthesis ? "synthesis" : "standard",
    });

    contextLog.push(`[Host → ${decision.action}]: ${decision.message}`);

    // Background: update host memory
    const parts: string[] = [];
    if (currentContext.userMessage) parts.push(`User: "${currentContext.userMessage}"`);
    if (currentContext.guestSummary) parts.push(`Guests: ${currentContext.guestSummary}`);
    if (currentContext.researchSummary) parts.push(`Research: ${currentContext.researchSummary}`);
    parts.push(`Decision: ${decision.action} — ${decision.message}`);
    updateHostMemoryBackground(store, roomId, parts.join(" "));

    // ── Route based on action ──

    // Terminal actions: return control to user
    if (decision.action === "ask_user" || decision.action === "conclude") {
      store.setPhase(roomId, "AWAITING_USER");
      const next = store.dequeueUserMessage(roomId);
      if (next) {
        await sendMessage(roomId, next);
      }
      return;
    }

    // Synthesize: mid-debate summary, then continue the loop
    if (decision.action === "synthesize") {
      // Intensity cools down after synthesis
      const currentRoom = store.getRoom(roomId);
      if (currentRoom) {
        store.updateDebateIntensity(roomId, Math.max(0, currentRoom.debateIntensity - 0.1));
      }
      currentContext = {
        userMessage: undefined,
        guestSummary: undefined,
        researchSummary: undefined,
      };
      continue;
    }

    // Research: gather data
    if (decision.action === "research") {
      if (decision.research_queries?.length) {
        const result = await runResearchPhase(store, roomId, decision.research_queries);
        if (result) {
          contextLog.push(`[Research]:\n${result}`);
        }
        currentContext = {
          userMessage: undefined,
          guestSummary: undefined,
          researchSummary: result || "Research did not return results.",
        };
        continue;
      }
      store.setPhase(roomId, "AWAITING_USER");
      return;
    }

    // Fact check: verify a specific claim
    if (decision.action === "fact_check") {
      if (decision.claim_to_check) {
        const result = await runFactCheck(store, roomId, decision.claim_to_check);
        if (result) {
          contextLog.push(`[Fact Check — "${decision.claim_to_check}"]:\n${result}`);
        }
        currentContext = {
          userMessage: undefined,
          guestSummary: undefined,
          researchSummary: result
            ? `Fact check of "${decision.claim_to_check}": ${result}`
            : "Fact check did not return results.",
        };
        continue;
      }
      store.setPhase(roomId, "AWAITING_USER");
      return;
    }

    // Guest actions require model and guests
    const state = store.getState();
    const latestRoom = store.getRoom(roomId);
    if (!state.selectedGuestModel || !latestRoom?.guests.length) {
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
      return;
    }

    // Standard guest round: all guests respond
    if (decision.action === "guests") {
      const guestResult = await runGuestRound(store, roomId, decision.message);
      if (!guestResult) {
        store.setPhase(roomId, "AWAITING_USER");
        return;
      }

      contextLog.push(`[Guests]:\n${guestResult}`);
      currentContext = {
        userMessage: undefined,
        guestSummary: guestResult,
        researchSummary: undefined,
      };
      store.incrementRound(roomId);
      continue;
    }

    // Exchange: direct guest-to-guest debate
    if (decision.action === "exchange") {
      const targetNames = decision.target_guests || [];
      const exchangeResult = await runGuestExchange(
        store,
        roomId,
        decision.message,
        targetNames
      );
      if (!exchangeResult) {
        store.setPhase(roomId, "AWAITING_USER");
        return;
      }

      contextLog.push(`[Exchange]:\n${exchangeResult}`);
      currentContext = {
        userMessage: undefined,
        guestSummary: exchangeResult,
        researchSummary: undefined,
      };
      store.incrementRound(roomId);
      continue;
    }

    // Challenge: host challenges a specific guest
    if (decision.action === "challenge") {
      const targetName = decision.target_guests?.[0] || "";
      const challengeResult = await runChallengeRound(
        store,
        roomId,
        decision.message,
        targetName
      );
      if (!challengeResult) {
        store.setPhase(roomId, "AWAITING_USER");
        return;
      }

      contextLog.push(`[Challenge → ${targetName}]:\n${challengeResult}`);
      currentContext = {
        userMessage: undefined,
        guestSummary: challengeResult,
        researchSummary: undefined,
      };
      // Challenges increase intensity
      const r = store.getRoom(roomId);
      if (r) {
        store.updateDebateIntensity(roomId, Math.min(1, r.debateIntensity + 0.1));
      }
      store.incrementRound(roomId);
      continue;
    }

    // Deep dive: focused discussion on a subtopic
    if (decision.action === "deep_dive") {
      const subtopic = decision.subtopic || decision.message;
      const deepDiveResult = await runDeepDiveRound(
        store,
        roomId,
        decision.message,
        subtopic
      );
      if (!deepDiveResult) {
        store.setPhase(roomId, "AWAITING_USER");
        return;
      }

      contextLog.push(`[Deep Dive — ${subtopic}]:\n${deepDiveResult}`);
      currentContext = {
        userMessage: undefined,
        guestSummary: deepDiveResult,
        researchSummary: undefined,
      };
      store.incrementRound(roomId);
      continue;
    }

    // Unknown action
    store.setPhase(roomId, "AWAITING_USER");
    return;
  }

  // Max iterations
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
  store.incrementRound(roomId);

  await hostDecisionLoop(store, roomId, {
    userMessage: undefined,
    guestSummary: undefined,
    researchSummary: undefined,
  });
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

  store.incrementRound(roomId);

  await hostDecisionLoop(store, roomId, {
    userMessage,
    guestSummary: undefined,
    researchSummary: undefined,
  });
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
        label = `Host${msg.isSummary ? " (Summary)" : ""}${msg.intent === "synthesis" ? " (Synthesis)" : ""}`;
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
