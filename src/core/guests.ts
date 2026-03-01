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

type GuestResult = { guestId: string; guestName: string; response: string };

// ─── Helper: stream a single guest response ─────────────────────────

function streamOneGuest(
  store: DebateStore,
  roomId: string,
  apiKey: string,
  model: string,
  msgId: string,
  systemPrompt: string,
  userContent: string,
  providers?: string[]
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  return new Promise<string>((resolve, reject) => {
    streamChatCompletion(
      apiKey,
      model,
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
      providers
    );
  });
}

// ─── Standard guest round (guests respond one-by-one) ───────────────

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

  // Guests speak one-by-one so each can react to what came before
  const guestResponses: GuestResult[] = [];

  for (const guest of room.guests) {
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
      precedingResponses: guestResponses.map((r) => ({ name: r.guestName, response: r.response })),
    });

    try {
      const response = await streamOneGuest(
        store, roomId, state.apiKey, guestModel, msgId,
        systemPrompt, hostMessage, state.preferredProviders[guestModel]
      );
      guestResponses.push({ guestId: guest.id, guestName: guest.name, response });
    } catch {
      // Skip this guest, continue with others
    }
  }

  if (guestResponses.length === 0) return null;

  updateAllGuestMemories(store, roomId, currentRound, hostMessage, guestResponses);

  return guestResponses
    .map((g) => `${g.guestName}: ${g.response}`)
    .join("\n\n---\n\n");
}

// ─── Guest exchange (direct guest-to-guest debate, sequential) ──────

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
    return runGuestRound(store, roomId, hostFraming);
  }

  // Exchange Round 1: Each target guest states their position (one-by-one)
  const round1Responses: GuestResult[] = [];

  for (const guest of targetGuests) {
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
      otherGuestResponses: round1Responses.map((r) => ({ name: r.guestName, response: r.response })),
      exchangeRound: 1,
      researchContext,
    });

    try {
      const response = await streamOneGuest(
        store, roomId, state.apiKey, guestModel, msgId,
        systemPrompt, hostFraming, state.preferredProviders[guestModel]
      );
      round1Responses.push({ guestId: guest.id, guestName: guest.name, response });
    } catch {
      // Skip
    }
  }

  if (round1Responses.length < 2) return null;

  // Exchange Round 2: Each guest rebuts the others (one-by-one)
  const round2Responses: GuestResult[] = [];

  for (const guest of targetGuests) {
    const guestModel = guest.model || defaultGuestModel;
    const othersFromRound1 = round1Responses
      .filter((r) => r.guestId !== guest.id)
      .map((r) => ({ name: r.guestName, response: r.response }));

    // Also include any earlier round-2 rebuttals from other guests
    const earlierRebuttals = round2Responses
      .filter((r) => r.guestId !== guest.id)
      .map((r) => ({ name: r.guestName, response: r.response }));

    const allOtherResponses = [...othersFromRound1, ...earlierRebuttals];

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
      otherGuestResponses: allOtherResponses,
      exchangeRound: 2,
      researchContext,
    });

    const userContent = `Respond to what ${othersFromRound1.map(o => o.name).join(" and ")} just said.`;

    try {
      const response = await streamOneGuest(
        store, roomId, state.apiKey, guestModel, msgId,
        systemPrompt, userContent, state.preferredProviders[guestModel]
      );
      round2Responses.push({ guestId: guest.id, guestName: guest.name, response });
    } catch {
      // Skip
    }
  }

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

  try {
    const response = await streamOneGuest(
      store, roomId, state.apiKey, guestModel, msgId,
      systemPrompt, challenge, state.preferredProviders[guestModel]
    );

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

// ─── Deep dive round (guests respond one-by-one to subtopic) ────────

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

  // Guests speak one-by-one
  const guestResponses: GuestResult[] = [];

  for (const guest of room.guests) {
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
      precedingResponses: guestResponses.map((r) => ({ name: r.guestName, response: r.response })),
    });

    try {
      const response = await streamOneGuest(
        store, roomId, state.apiKey, guestModel, msgId,
        systemPrompt, hostMessage, state.preferredProviders[guestModel]
      );
      guestResponses.push({ guestId: guest.id, guestName: guest.name, response });
    } catch {
      // Skip
    }
  }

  if (guestResponses.length === 0) return null;

  updateAllGuestMemories(store, roomId, currentRound, hostMessage, guestResponses);

  return guestResponses
    .map((g) => `${g.guestName}: ${g.response}`)
    .join("\n\n---\n\n");
}

// ─── Selective guest round (call on specific guests mid-round) ───────

export async function runSelectiveGuestRound(
  store: DebateStore,
  roomId: string,
  hostMessage: string,
  targetGuestNames: string[]
): Promise<string | null> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) return null;

  const defaultGuestModel = state.selectedGuestModel;
  if (!defaultGuestModel) return null;

  store.setPhase(roomId, "GUESTS_RESPONDING");

  const researchContext = buildResearchContext(store, roomId);
  const currentRound = room.round;

  // Find the target guests by name
  const targetGuests = room.guests.filter((g) =>
    targetGuestNames.some((name) => g.name.toLowerCase().includes(name.toLowerCase()))
  );

  if (targetGuests.length === 0) return null;

  const guestResponses: GuestResult[] = [];

  for (const guest of targetGuests) {
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
      precedingResponses: guestResponses.map((r) => ({ name: r.guestName, response: r.response })),
    });

    try {
      const response = await streamOneGuest(
        store, roomId, state.apiKey, guestModel, msgId,
        systemPrompt, hostMessage, state.preferredProviders[guestModel]
      );
      guestResponses.push({ guestId: guest.id, guestName: guest.name, response });
    } catch {
      // Skip this guest
    }
  }

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

function updateAllGuestMemories(
  store: DebateStore,
  roomId: string,
  currentRound: number,
  hostMessage: string,
  guestResponses: GuestResult[]
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
