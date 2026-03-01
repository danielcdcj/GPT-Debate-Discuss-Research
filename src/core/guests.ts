import type { DebateStore } from "./store";
import type { StructuredMemory, GuestMemory } from "./types";
import { type ChatMessage, chatCompletion, streamChatCompletion } from "./api";
import {
  guestResponsePrompt,
  exchangeResponsePrompt,
  challengeResponsePrompt,
  deepDiveResponsePrompt,
  guestMemoryUpdatePrompt,
} from "./prompts/guest";
import { addToHistory } from "./memory";

// ─── Standard guest round (all guests respond to host) ──────────────

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

  const researchContext = buildResearchContext(store, roomId);
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
      intent: "standard",
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

  const guestResponses = await collectGuestResponses(guestPromises);
  if (guestResponses.length === 0) return null;

  updateAllGuestMemories(store, roomId, currentRound, hostMessage, guestResponses);

  return guestResponses
    .map((g) => `${g.guestName}: ${g.response}`)
    .join("\n\n---\n\n");
}

// ─── Guest exchange (direct guest-to-guest debate) ──────────────────

export async function runGuestExchange(
  store: DebateStore,
  roomId: string,
  hostFraming: string,
  targetGuestNames: string[]
): Promise<string | null> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) return null;

  const defaultGuestModel = state.selectedGuestModel;
  if (!defaultGuestModel) return null;

  store.setPhase(roomId, "GUEST_EXCHANGE");

  const researchContext = buildResearchContext(store, roomId);
  const currentRound = room.round;

  // Find the target guests
  const targetGuests = room.guests.filter((g) =>
    targetGuestNames.some((name) => g.name.toLowerCase().includes(name.toLowerCase()))
  );
  if (targetGuests.length < 2) {
    // Fall back to regular guest round if we can't find the targets
    return runGuestRound(store, roomId, hostFraming);
  }

  // Exchange Round 1: Each target guest states their position
  const round1Promises = targetGuests.map(async (guest) => {
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
      intent: "exchange",
      exchangeRound: 1,
    });

    const systemPrompt = exchangeResponsePrompt({
      guestName: guest.name,
      personality: guest.personality,
      topic: room.topic,
      memory: guest.memory,
      hostFraming,
      otherGuestResponses: [],
      exchangeRound: 1,
      researchContext,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: hostFraming },
    ];

    return new Promise<{ guestId: string; guestName: string; response: string }>(
      (resolve, reject) => {
        streamChatCompletion(
          state.apiKey,
          guestModel,
          messages,
          (chunk) => store.appendToMessage(roomId, msgId, chunk),
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

  const round1Responses = await collectGuestResponses(round1Promises);
  if (round1Responses.length < 2) return null;

  // Exchange Round 2: Each guest responds to the OTHER guests' round 1 responses
  const round2Promises = targetGuests.map(async (guest) => {
    const guestModel = guest.model || defaultGuestModel;
    const othersResponses = round1Responses
      .filter((r) => r.guestId !== guest.id)
      .map((r) => ({ name: r.guestName, response: r.response }));

    const replyTarget = round1Responses.find((r) => r.guestId !== guest.id);

    const msgId = store.addMessage(roomId, {
      role: "guest",
      content: "",
      guestId: guest.id,
      guestName: guest.name,
      guestAvatar: guest.avatar,
      isStreaming: true,
      isSummary: false,
      isError: false,
      intent: "rebuttal",
      replyToGuestId: replyTarget?.guestId,
      replyToGuestName: replyTarget?.guestName,
      exchangeRound: 2,
    });

    const systemPrompt = exchangeResponsePrompt({
      guestName: guest.name,
      personality: guest.personality,
      topic: room.topic,
      memory: guest.memory,
      hostFraming,
      otherGuestResponses: othersResponses,
      exchangeRound: 2,
      researchContext,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Respond to what ${othersResponses.map(o => o.name).join(" and ")} just said.` },
    ];

    return new Promise<{ guestId: string; guestName: string; response: string }>(
      (resolve, reject) => {
        streamChatCompletion(
          state.apiKey,
          guestModel,
          messages,
          (chunk) => store.appendToMessage(roomId, msgId, chunk),
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

  const round2Responses = await collectGuestResponses(round2Promises);

  // Update memories with the full exchange
  const allResponses = [...round1Responses, ...round2Responses];
  updateAllGuestMemories(store, roomId, currentRound, hostFraming, allResponses);

  // Update debate intensity (exchanges increase it)
  store.updateDebateIntensity(roomId, Math.min(1, (room.debateIntensity || 0) + 0.15));

  const summary = [
    "**Exchange Round 1 (Opening Positions):**",
    ...round1Responses.map((g) => `${g.guestName}: ${g.response}`),
    "",
    "**Exchange Round 2 (Rebuttals):**",
    ...round2Responses.map((g) => `${g.guestName}: ${g.response}`),
  ].join("\n\n");

  return summary;
}

// ─── Challenge response (single guest defends position) ─────────────

export async function runChallengeRound(
  store: DebateStore,
  roomId: string,
  challenge: string,
  targetGuestName: string
): Promise<string | null> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) return null;

  const defaultGuestModel = state.selectedGuestModel;
  if (!defaultGuestModel) return null;

  store.setPhase(roomId, "GUESTS_RESPONDING");

  const researchContext = buildResearchContext(store, roomId);
  const currentRound = room.round;

  const targetGuest = room.guests.find((g) =>
    g.name.toLowerCase().includes(targetGuestName.toLowerCase())
  );
  if (!targetGuest) return runGuestRound(store, roomId, challenge);

  const guestModel = targetGuest.model || defaultGuestModel;

  const msgId = store.addMessage(roomId, {
    role: "guest",
    content: "",
    guestId: targetGuest.id,
    guestName: targetGuest.name,
    guestAvatar: targetGuest.avatar,
    isStreaming: true,
    isSummary: false,
    isError: false,
    intent: "challenge_response",
  });

  const systemPrompt = challengeResponsePrompt({
    guestName: targetGuest.name,
    personality: targetGuest.personality,
    topic: room.topic,
    memory: targetGuest.memory,
    challenge,
    researchContext,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: challenge },
  ];

  try {
    const response = await new Promise<string>((resolve, reject) => {
      streamChatCompletion(
        state.apiKey,
        guestModel,
        messages,
        (chunk) => store.appendToMessage(roomId, msgId, chunk),
        (fullText) => {
          store.updateMessage(roomId, msgId, { isStreaming: false });
          resolve(fullText);
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
    });

    // Update memory
    let updatedMemory = addToHistory(
      targetGuest.memory,
      { role: "host", content: `[Challenge] ${challenge}` },
      currentRound
    );
    updatedMemory = addToHistory(
      updatedMemory,
      { role: "self", content: response },
      currentRound
    );
    store.updateGuestMemory(roomId, targetGuest.id, updatedMemory);

    updateGuestStructuredMemoryBackground(store, roomId, targetGuest.id, targetGuest.name, {
      hostMessage: challenge,
      ownResponse: response,
    });

    return `${targetGuest.name} (defending): ${response}`;
  } catch {
    return null;
  }
}

// ─── Deep dive round (guests respond to specific subtopic) ──────────

export async function runDeepDiveRound(
  store: DebateStore,
  roomId: string,
  hostMessage: string,
  subtopic: string
): Promise<string | null> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) return null;

  const defaultGuestModel = state.selectedGuestModel;
  if (!defaultGuestModel) return null;

  store.setPhase(roomId, "GUESTS_RESPONDING");

  const researchContext = buildResearchContext(store, roomId);
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
      intent: "standard",
    });

    const systemPrompt = deepDiveResponsePrompt({
      guestName: guest.name,
      personality: guest.personality,
      topic: room.topic,
      memory: guest.memory,
      subtopic,
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
          (chunk) => store.appendToMessage(roomId, msgId, chunk),
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

  const guestResponses = await collectGuestResponses(guestPromises);
  if (guestResponses.length === 0) return null;

  updateAllGuestMemories(store, roomId, currentRound, hostMessage, guestResponses);

  return guestResponses
    .map((g) => `${g.guestName}: ${g.response}`)
    .join("\n\n---\n\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────

function buildResearchContext(store: DebateStore, roomId: string): string | undefined {
  const room = store.getRoom(roomId);
  if (!room) return undefined;
  return (
    room.researchFiles
      .filter((f) => f.content && !f.isStreaming)
      .map((f) => `### ${f.researcher.emoji} ${f.researcher.name}: ${f.title}\n${f.content}`)
      .join("\n\n---\n\n") || undefined
  );
}

async function collectGuestResponses(
  promises: Promise<{ guestId: string; guestName: string; response: string }>[]
): Promise<Array<{ guestId: string; guestName: string; response: string }>> {
  try {
    return (await Promise.allSettled(promises))
      .filter(
        (r): r is PromiseFulfilledResult<{ guestId: string; guestName: string; response: string }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);
  } catch {
    return [];
  }
}

function updateAllGuestMemories(
  store: DebateStore,
  roomId: string,
  currentRound: number,
  hostMessage: string,
  guestResponses: Array<{ guestId: string; guestName: string; response: string }>
): void {
  for (const gr of guestResponses) {
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

      updateGuestStructuredMemoryBackground(store, roomId, gr.guestId, gr.guestName, {
        hostMessage,
        ownResponse: gr.response,
      });
    }
  }
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
