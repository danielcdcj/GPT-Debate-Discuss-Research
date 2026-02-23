import type { DebateStore } from "./store";
import type { StructuredMemory, GuestMemory } from "./types";
import { type ChatMessage, chatCompletion, streamChatCompletion } from "./api";
import { guestResponsePrompt, guestMemoryUpdatePrompt } from "./prompts/guest";
import { addToHistory } from "./memory";

export async function runGuestRound(
  store: DebateStore,
  roomId: string,
  hostMessage: string
): Promise<string | null> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) return null;

  const defaultGuestModel = state.selectedGuestModel;
  if (!defaultGuestModel) return null;

  store.setPhase(roomId, "GUESTS_RESPONDING");

  // Build research context from completed research files
  const researchContext =
    room.researchFiles
      .filter((f) => f.content && !f.isStreaming)
      .map((f) => `### ${f.researcher.emoji} ${f.researcher.name}: ${f.title}\n${f.content}`)
      .join("\n\n---\n\n") || undefined;

  const currentRound = room.round;

  const guestPromises = room.guests.map(async (guest) => {
    const guestModel = guest.model || defaultGuestModel;

    const msgId = store.addMessage(roomId, {
      role: "guest",
      content: "",
      guestId: guest.id,
      guestName: guest.name,
      guestAvatar: guest.avatar,
      isStreaming: true,
      isSummary: false,
      isError: false,
    });

    const systemPrompt = guestResponsePrompt({
      guestName: guest.name,
      personality: guest.personality,
      topic: room.topic,
      memory: guest.memory,
      hostMessage,
      researchContext,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: hostMessage },
    ];

    return new Promise<{ guestId: string; guestName: string; response: string }>(
      (resolve, reject) => {
        streamChatCompletion(
          state.apiKey,
          guestModel,
          messages,
          (chunk) => {
            store.appendToMessage(roomId, msgId, chunk);
          },
          (fullText) => {
            store.updateMessage(roomId, msgId, { isStreaming: false });
            resolve({ guestId: guest.id, guestName: guest.name, response: fullText });
          },
          (error) => {
            store.updateMessage(roomId, msgId, {
              isStreaming: false,
              isError: true,
              content: `Error: ${error.message}`,
            });
            reject(error);
          },
          state.preferredProviders[guestModel]
        );
      }
    );
  });

  let guestResponses: Array<{ guestId: string; guestName: string; response: string }> = [];
  try {
    guestResponses = (await Promise.allSettled(guestPromises))
      .filter(
        (r): r is PromiseFulfilledResult<{ guestId: string; guestName: string; response: string }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);
  } catch {
    // continue
  }

  if (guestResponses.length === 0) return null;

  // Update guest conversation histories and memories (background)
  for (const gr of guestResponses) {
    // Add host message and own response to history
    const guest = store.getRoom(roomId)?.guests.find((g) => g.id === gr.guestId);
    if (guest) {
      let updatedMemory = addToHistory(
        guest.memory,
        { role: "host", content: hostMessage },
        currentRound
      );
      updatedMemory = addToHistory(
        updatedMemory,
        { role: "self", content: gr.response },
        currentRound
      );
      // Add other guests' responses
      for (const other of guestResponses) {
        if (other.guestId !== gr.guestId) {
          updatedMemory = addToHistory(
            updatedMemory,
            { role: "other_guest", speaker: other.guestName, content: other.response },
            currentRound
          );
        }
      }
      store.updateGuestMemory(roomId, gr.guestId, updatedMemory);

      // Background: update structured memory
      updateGuestStructuredMemoryBackground(store, roomId, gr.guestId, gr.guestName, {
        hostMessage,
        ownResponse: gr.response,
      });
    }
  }

  return guestResponses
    .map((g) => `${g.guestName}: ${g.response}`)
    .join("\n\n---\n\n");
}

function updateGuestStructuredMemoryBackground(
  store: DebateStore,
  roomId: string,
  guestId: string,
  guestName: string,
  event: { hostMessage: string; ownResponse: string }
): void {
  const state = store.getState();
  const room = store.getRoom(roomId);
  const guest = room?.guests.find((g) => g.id === guestId);
  if (!guest) return;

  const prompt = guestMemoryUpdatePrompt({
    guestName,
    currentMemory: guest.memory,
    newEvent: `Host said: "${event.hostMessage}". My response: ${event.ownResponse}`,
  });

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
        const structured: StructuredMemory = JSON.parse(response);
        const currentGuest = store.getRoom(roomId)?.guests.find((g) => g.id === guestId);
        if (currentGuest) {
          const updatedMemory: GuestMemory = {
            ...currentGuest.memory,
            structured,
          };
          store.updateGuestMemory(roomId, guestId, updatedMemory);
        }
      } catch {
        // skip
      }
    })
    .catch(() => {});
}
