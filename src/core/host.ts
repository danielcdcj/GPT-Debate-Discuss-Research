import type { DebateStore } from "./store";
import type { HostDecision, StructuredMemory } from "./types";
import { chatCompletion } from "./api";
import {
  hostDirectorPrompt,
  hostMidRoundPrompt,
  hostRoundSummaryPrompt,
  hostPostRoundPrompt,
  hostMemoryUpdatePrompt,
} from "./prompts/host";

interface HostContext {
  userMessage?: string;
  guestSummary?: string;
  researchSummary?: string;
  accumulatedContext?: string;
}

export async function runHostDecision(
  store: DebateStore,
  roomId: string,
  context: HostContext
): Promise<HostDecision> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) throw new Error("Room not found");

  const prompt = hostDirectorPrompt({
    topic: room.topic,
    config: room.config,
    hostMemory: room.hostMemory,
    guests: room.guests,
    guestSummaries: context.guestSummary,
    userMessage: context.userMessage,
    researchSummary: context.researchSummary,
    accumulatedContext: context.accumulatedContext,
    debateIntensity: room.debateIntensity,
  });

  store.emit("host:deciding", { roomId });

  try {
    const response = await chatCompletion(
      state.apiKey,
      state.selectedHostModel,
      [
        { role: "system", content: prompt },
        { role: "user", content: "Decide the next action." },
      ],
      true,
      state.preferredProviders[state.selectedHostModel]
    );

    const decision: HostDecision = JSON.parse(response);
    store.emit("host:decided", { roomId, decision });
    return decision;
  } catch {
    const fallback: HostDecision = {
      action: "ask_user",
      message: "I'd like to hear your thoughts. What would you like to explore?",
    };
    store.emit("host:decided", { roomId, decision: fallback });
    return fallback;
  }
}

// ─── Mid-Round Decision ─────────────────────────────────────────────

export async function runHostMidRoundDecision(
  store: DebateStore,
  roomId: string,
  roundNumber: number,
  roundContext: string
): Promise<HostDecision> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) throw new Error("Room not found");

  const prompt = hostMidRoundPrompt({
    topic: room.topic,
    config: room.config,
    hostMemory: room.hostMemory,
    guests: room.guests,
    roundNumber,
    roundContext,
    debateIntensity: room.debateIntensity,
  });

  store.emit("host:deciding", { roomId });

  try {
    const response = await chatCompletion(
      state.apiKey,
      state.selectedHostModel,
      [
        { role: "system", content: prompt },
        { role: "user", content: "Decide the next mid-round action." },
      ],
      true,
      state.preferredProviders[state.selectedHostModel]
    );

    const decision: HostDecision = JSON.parse(response);
    store.emit("host:decided", { roomId, decision });
    return decision;
  } catch {
    // Default to ending the round if parsing fails
    return { action: "end_round", message: "Let me wrap up this round." };
  }
}

// ─── Round Summary Generation ───────────────────────────────────────

export async function generateRoundSummary(
  store: DebateStore,
  roomId: string,
  roundNumber: number,
  roundContext: string
): Promise<string> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) return "Round summary unavailable.";

  const prompt = hostRoundSummaryPrompt({
    topic: room.topic,
    roundNumber,
    roundContext,
    guests: room.guests,
  });

  try {
    const summary = await chatCompletion(
      state.apiKey,
      state.selectedHostModel,
      [
        { role: "system", content: prompt },
        { role: "user", content: "Write the round summary now." },
      ],
      false,
      state.preferredProviders[state.selectedHostModel]
    );
    return summary;
  } catch {
    return `## Round ${roundNumber} Summary\n\nSummary generation failed. The debate continues.`;
  }
}

// ─── Post-Round Decision ────────────────────────────────────────────

export async function runHostPostRoundDecision(
  store: DebateStore,
  roomId: string,
  roundNumber: number,
  roundSummary: string,
  userMessage?: string
): Promise<HostDecision> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) throw new Error("Room not found");

  const prompt = hostPostRoundPrompt({
    topic: room.topic,
    config: room.config,
    hostMemory: room.hostMemory,
    guests: room.guests,
    roundNumber,
    roundSummary,
    totalRoundsCompleted: room.round,
    debateIntensity: room.debateIntensity,
    userMessage,
  });

  store.emit("host:deciding", { roomId });

  try {
    const response = await chatCompletion(
      state.apiKey,
      state.selectedHostModel,
      [
        { role: "system", content: prompt },
        { role: "user", content: "Decide what happens after this round." },
      ],
      true,
      state.preferredProviders[state.selectedHostModel]
    );

    const decision: HostDecision = JSON.parse(response);
    store.emit("host:decided", { roomId, decision });
    return decision;
  } catch {
    return { action: "ask_user", message: "What would you like to explore next?" };
  }
}

// ─── Host Memory Background Update ─────────────────────────────────

export function updateHostMemoryBackground(
  store: DebateStore,
  roomId: string,
  eventDescription: string
): void {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) return;

  const prompt = hostMemoryUpdatePrompt(room.hostMemory, eventDescription);

  chatCompletion(
    state.apiKey,
    state.selectedHostModel,
    [
      { role: "system", content: prompt },
      { role: "user", content: "Update the memory now." },
    ],
    true,
    state.preferredProviders[state.selectedHostModel]
  )
    .then((response) => {
      try {
        const memory: StructuredMemory = JSON.parse(response);
        store.updateHostMemory(roomId, memory);
      } catch {
        // skip malformed response
      }
    })
    .catch(() => {});
}
