import { DebateStore, getStore } from "./store";
import { runHostDecision, updateHostMemoryBackground } from "./host";
import { runGuestRound } from "./guests";
import { runResearchPhase } from "./research";

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
    store.addMessage(roomId, {
      role: "host",
      content: decision.message,
      isStreaming: false,
      isSummary: decision.action === "ask_user" || decision.action === "conclude",
      isError: false,
    });

    contextLog.push(`[Host → ${decision.action}]: ${decision.message}`);

    // Background: update host memory
    const parts: string[] = [];
    if (currentContext.userMessage) parts.push(`User: "${currentContext.userMessage}"`);
    if (currentContext.guestSummary) parts.push(`Guests: ${currentContext.guestSummary}`);
    if (currentContext.researchSummary) parts.push(`Research: ${currentContext.researchSummary}`);
    parts.push(`Decision: ${decision.action} — ${decision.message}`);
    updateHostMemoryBackground(store, roomId, parts.join(" "));

    // ── Route ──

    if (decision.action === "ask_user" || decision.action === "conclude") {
      store.setPhase(roomId, "AWAITING_USER");
      // Check for queued messages
      const next = store.dequeueUserMessage(roomId);
      if (next) {
        await sendMessage(roomId, next);
      }
      return;
    }

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

    if (decision.action === "guests") {
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
        label = `Host${msg.isSummary ? " (Summary)" : ""}`;
        break;
      case "guest":
        label = `${msg.guestAvatar || ""} ${msg.guestName || "Guest"}`;
        break;
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
