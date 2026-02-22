import { useDebateStore } from "@/store/debate-store";
import {
  DirectorDecision,
  RESEARCHER_PROFILES,
  StructuredMemory,
} from "@/store/types";
import {
  ChatMessage,
  chatCompletion,
  streamChatCompletion,
} from "./openrouter";
import {
  guestMemoryUpdatePrompt,
  guestResponsePrompt,
  hostDirectorPrompt,
  hostSummarizerPrompt,
  researcherPrompt,
} from "./prompts";

function getStore() {
  return useDebateStore.getState();
}

export async function runDebateRound(roomId: string, userMessage: string) {
  const store = getStore();
  const room = store.rooms.find((r) => r.id === roomId);
  if (!room) return;

  const apiKey = store.apiKey;
  const hostModel = store.selectedHostModel;
  const guestModel = store.selectedGuestModel;
  const researchModel = store.selectedResearchModel;

  if (!hostModel || !guestModel) return;

  // Add user message
  store.addMessage(roomId, {
    role: "user",
    content: userMessage,
    isLoading: false,
    isStreaming: false,
    isSummary: false,
    isError: false,
  });

  store.incrementRound(roomId);

  // Phase 1: Guests respond
  store.setPhase(roomId, "GUESTS_RESPONDING");

  const refreshedRoom = getStore().rooms.find((r) => r.id === roomId);
  if (!refreshedRoom) return;

  // Build host context for initial prompt to guests
  const hostMessageForGuests = `New discussion point from the user: "${userMessage}"${
    refreshedRoom.round > 1
      ? "\n\nPlease respond considering the discussion so far."
      : "\n\nPlease share your initial thoughts."
  }`;

  // Fire all guests in parallel
  const guestPromises = refreshedRoom.guests.map(async (guest) => {
    const msgId = getStore().addMessage(roomId, {
      role: "guest",
      content: "",
      guestId: guest.id,
      guestName: guest.name,
      guestAvatar: guest.avatar,
      isLoading: true,
      isStreaming: false,
      isSummary: false,
      isError: false,
    });

    const systemPrompt = guestResponsePrompt({
      guestName: guest.name,
      personality: guest.personality,
      topic: refreshedRoom.topic,
      memory: guest.memory,
      hostMessage: hostMessageForGuests,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    getStore().updateMessage(roomId, msgId, {
      isLoading: false,
      isStreaming: true,
    });

    return new Promise<{ guestId: string; guestName: string; response: string }>(
      (resolve, reject) => {
        streamChatCompletion(
          apiKey,
          guestModel,
          messages,
          (chunk) => {
            getStore().appendToMessage(roomId, msgId, chunk);
          },
          (fullText) => {
            getStore().updateMessage(roomId, msgId, {
              isStreaming: false,
            });
            resolve({
              guestId: guest.id,
              guestName: guest.name,
              response: fullText,
            });
          },
          (error) => {
            getStore().updateMessage(roomId, msgId, {
              isStreaming: false,
              isError: true,
              content: `Error: ${error.message}`,
            });
            reject(error);
          },
          store.preferredProviders[guestModel]
        );
      }
    );
  });

  let guestResponses: Array<{
    guestId: string;
    guestName: string;
    response: string;
  }> = [];

  try {
    guestResponses = await Promise.allSettled(guestPromises).then((results) =>
      results
        .filter(
          (r): r is PromiseFulfilledResult<{
            guestId: string;
            guestName: string;
            response: string;
          }> => r.status === "fulfilled"
        )
        .map((r) => r.value)
    );
  } catch {
    // Some guests may have failed, continue with what we have
  }

  if (guestResponses.length === 0) {
    store.setPhase(roomId, "AWAITING_USER");
    return;
  }

  // Phase 2: Host summarizes
  store.setPhase(roomId, "HOST_SUMMARIZING");

  const guestSummariesText = guestResponses
    .map((g) => `${g.guestName}: ${g.response}`)
    .join("\n\n---\n\n");

  // Summarizer: stream summary
  const summaryMsgId = getStore().addMessage(roomId, {
    role: "host",
    content: "",
    isLoading: true,
    isStreaming: false,
    isSummary: true,
    isError: false,
  });

  const summarizerMessages: ChatMessage[] = [
    { role: "system", content: hostSummarizerPrompt(guestSummariesText) },
    { role: "user", content: "Please summarize the above responses." },
  ];

  let summaryText = "";
  try {
    summaryText = await new Promise<string>((resolve, reject) => {
      getStore().updateMessage(roomId, summaryMsgId, {
        isLoading: false,
        isStreaming: true,
      });
      streamChatCompletion(
        apiKey,
        hostModel,
        summarizerMessages,
        (chunk) => {
          getStore().appendToMessage(roomId, summaryMsgId, chunk);
        },
        (fullText) => {
          getStore().updateMessage(roomId, summaryMsgId, {
            isStreaming: false,
          });
          resolve(fullText);
        },
        (error) => {
          getStore().updateMessage(roomId, summaryMsgId, {
            isStreaming: false,
            isError: true,
            content: `Error: ${error.message}`,
          });
          reject(error);
        },
        store.preferredProviders[hostModel]
      );
    });
  } catch {
    store.setPhase(roomId, "AWAITING_USER");
    return;
  }

  // Director: decide next action
  const currentRoom = getStore().rooms.find((r) => r.id === roomId);
  if (!currentRoom) return;

  const directorSystemPrompt = hostDirectorPrompt({
    topic: currentRoom.topic,
    config: currentRoom.config,
    hostMemory: currentRoom.hostMemory,
    guestSummaries: summaryText,
    userMessage,
  });

  let decision: DirectorDecision;
  try {
    const directorResponse = await chatCompletion(
      apiKey,
      hostModel,
      [
        { role: "system", content: directorSystemPrompt },
        { role: "user", content: "Decide the next action." },
      ],
      true,
      store.preferredProviders[hostModel]
    );
    decision = JSON.parse(directorResponse);
  } catch {
    // Fallback: present to guests
    decision = {
      action: "present_to_guests",
      message: summaryText,
    };
  }

  // Phase 3: Handle director decision
  store.setPhase(roomId, "HOST_PRESENTING");

  getStore().addMessage(roomId, {
    role: "host",
    content: decision.message,
    isLoading: false,
    isStreaming: false,
    isSummary: false,
    isError: false,
  });

  // Handle research if requested
  if (
    decision.action === "request_research" &&
    decision.research_queries?.length &&
    researchModel
  ) {
    store.setPhase(roomId, "RESEARCH_PHASE");
    await runResearchPhase(roomId, decision.research_queries);
  }

  // Background: update guest memories (fire-and-forget)
  for (const gr of guestResponses) {
    updateGuestMemoryBackground(roomId, gr.guestId, gr.guestName, {
      userMessage,
      hostSummary: summaryText,
      ownResponse: gr.response,
    });
  }

  // Update host memory (fire-and-forget)
  updateHostMemoryBackground(roomId, {
    userMessage,
    guestSummary: summaryText,
    directorDecision: decision,
  });

  store.setPhase(roomId, "AWAITING_USER");

  // Check for queued messages
  const nextMessage = getStore().dequeueUserMessage(roomId);
  if (nextMessage) {
    await runDebateRound(roomId, nextMessage);
  }
}

async function runResearchPhase(roomId: string, queries: string[]) {
  const store = getStore();
  const room = store.rooms.find((r) => r.id === roomId);
  if (!room) return;

  const apiKey = store.apiKey;
  const researchModel = store.selectedResearchModel || store.selectedHostModel;

  store.setRightPanelTab("research");

  const researchPromises = queries.map(async (query, index) => {
    const profile = RESEARCHER_PROFILES[index % RESEARCHER_PROFILES.length];

    const fileId = store.addResearchFile(roomId, {
      title: query,
      researcher: profile,
      content: "",
      isStreaming: true,
    });

    const systemPrompt = researcherPrompt({
      focus: profile.focus,
      topic: room.topic,
      query,
    });

    return new Promise<string>((resolve, reject) => {
      streamChatCompletion(
        apiKey,
        researchModel,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        (chunk) => {
          getStore().appendToResearchFile(roomId, fileId, chunk);
        },
        (fullText) => {
          getStore().updateResearchFile(roomId, fileId, {
            isStreaming: false,
          });
          resolve(fullText);
        },
        (error) => {
          getStore().updateResearchFile(roomId, fileId, {
            isStreaming: false,
            content: `Error: ${error.message}`,
          });
          reject(error);
        },
        store.preferredProviders[researchModel]
      );
    });
  });

  const researchResults = await Promise.allSettled(researchPromises);
  const successfulResults = researchResults
    .filter(
      (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (successfulResults.length > 0) {
    // Summarize research
    const researchSummaryText = successfulResults.join("\n\n---\n\n");
    const summaryMsgId = getStore().addMessage(roomId, {
      role: "host",
      content: "",
      isLoading: false,
      isStreaming: true,
      isSummary: true,
      isError: false,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        streamChatCompletion(
          apiKey,
          store.selectedHostModel,
          [
            {
              role: "system",
              content: hostSummarizerPrompt(researchSummaryText),
            },
            {
              role: "user",
              content: "Summarize the research findings above.",
            },
          ],
          (chunk) => {
            getStore().appendToMessage(roomId, summaryMsgId, chunk);
          },
          () => {
            getStore().updateMessage(roomId, summaryMsgId, {
              isStreaming: false,
            });
            resolve();
          },
          (error) => {
            getStore().updateMessage(roomId, summaryMsgId, {
              isStreaming: false,
              isError: true,
              content: `Error: ${error.message}`,
            });
            reject(error);
          },
          store.preferredProviders[store.selectedHostModel]
        );
      });
    } catch {
      // Research summary failed, continue
    }
  }
}

function updateGuestMemoryBackground(
  roomId: string,
  guestId: string,
  guestName: string,
  event: { userMessage: string; hostSummary: string; ownResponse: string }
) {
  const store = getStore();
  const room = store.rooms.find((r) => r.id === roomId);
  const guest = room?.guests.find((g) => g.id === guestId);
  if (!guest) return;

  const prompt = guestMemoryUpdatePrompt({
    guestName,
    currentMemory: guest.memory,
    newEvent: `User said: "${event.userMessage}". Host summary: ${event.hostSummary}. My response: ${event.ownResponse}`,
  });

  chatCompletion(
    store.apiKey,
    store.selectedHostModel,
    [
      { role: "system", content: prompt },
      { role: "user", content: "Update the memory now." },
    ],
    true,
    store.preferredProviders[store.selectedHostModel]
  )
    .then((response) => {
      try {
        const memory: StructuredMemory = JSON.parse(response);
        getStore().updateGuestMemory(roomId, guestId, memory);
      } catch {
        // Failed to parse memory update, skip
      }
    })
    .catch(() => {
      // Background task failed, non-critical
    });
}

function updateHostMemoryBackground(
  roomId: string,
  event: {
    userMessage: string;
    guestSummary: string;
    directorDecision: DirectorDecision;
  }
) {
  const store = getStore();
  const room = store.rooms.find((r) => r.id === roomId);
  if (!room) return;

  const prompt = guestMemoryUpdatePrompt({
    guestName: "Host",
    currentMemory: room.hostMemory,
    newEvent: `User said: "${event.userMessage}". Guests discussed and the summary was: ${event.guestSummary}. Decision was: ${event.directorDecision.action} - ${event.directorDecision.message}`,
  });

  chatCompletion(
    store.apiKey,
    store.selectedHostModel,
    [
      { role: "system", content: prompt },
      { role: "user", content: "Update the memory now." },
    ],
    true,
    store.preferredProviders[store.selectedHostModel]
  )
    .then((response) => {
      try {
        const memory: StructuredMemory = JSON.parse(response);
        getStore().updateHostMemory(roomId, memory);
      } catch {
        // Failed to parse, skip
      }
    })
    .catch(() => {
      // Background task failed, non-critical
    });
}

export function exportTranscript(
  roomId: string,
  format: "full" | "summary" | "json"
): string {
  const room = getStore().rooms.find((r) => r.id === roomId);
  if (!room) return "";

  if (format === "json") {
    return JSON.stringify(room, null, 2);
  }

  const lines: string[] = [];
  lines.push(`# ${room.name}`);
  lines.push(`**Topic:** ${room.topic}`);
  lines.push(`**Style:** ${room.config.style}`);
  lines.push(`**Rounds:** ${room.round}`);
  lines.push(`**Date:** ${new Date(room.createdAt).toLocaleDateString()}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const msg of room.messages) {
    if (format === "summary" && msg.role === "guest") continue;
    if (format === "summary" && msg.role === "host" && !msg.isSummary) continue;

    const time = new Date(msg.timestamp).toLocaleTimeString();
    let label = "";
    switch (msg.role) {
      case "host":
        label = `🎤 Host${msg.isSummary ? " (Summary)" : ""}`;
        break;
      case "guest":
        label = `${msg.guestAvatar || "👤"} ${msg.guestName || "Guest"}`;
        break;
      case "user":
        label = "👤 You";
        break;
      case "system":
        label = "📢 System";
        break;
    }

    lines.push(`### ${label} — ${time}`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
  }

  if (format === "full" && room.researchFiles.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Research Files");
    lines.push("");

    for (const file of room.researchFiles) {
      lines.push(
        `### ${file.researcher.emoji} ${file.researcher.name}: ${file.title}`
      );
      lines.push("");
      lines.push(file.content);
      lines.push("");
    }
  }

  return lines.join("\n");
}
