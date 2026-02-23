import type { DebateStore } from "./store";
import type { HostDecision, StructuredMemory } from "./types";
import { chatCompletion } from "./api";
import { hostDirectorPrompt, hostMemoryUpdatePrompt } from "./prompts/host";

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
    guestSummaries: context.guestSummary,
    userMessage: context.userMessage,
    researchSummary: context.researchSummary,
    accumulatedContext: context.accumulatedContext,
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
