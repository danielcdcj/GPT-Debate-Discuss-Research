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

// ─── Main entry point ────────────────────────────────────────────────
// Called when the user sends a message. The host always goes first.

export async function runDebateRound(roomId: string, userMessage: string) {
  const store = getStore();
  const room = store.rooms.find((r) => r.id === roomId);
  if (!room) return;

  const apiKey = store.apiKey;
  const hostModel = store.selectedHostModel;
  if (!hostModel) return;

  // Add user message to chat
  store.addMessage(roomId, {
    role: "user",
    content: userMessage,
    isLoading: false,
    isStreaming: false,
    isSummary: false,
    isError: false,
  });

  store.incrementRound(roomId);

  // Hand off to the host-driven loop.
  // The host receives the user message and decides what to do.
  await hostDecisionLoop(roomId, {
    userMessage,
    guestSummary: undefined,
    researchSummary: undefined,
  });
}

// ─── Host decision loop ──────────────────────────────────────────────
// The host is always in control. It receives new context (user message,
// guest responses, or research results), decides what happens next, and
// routes to the appropriate party. This can loop multiple times within
// a single user turn (e.g. host → guests → host → research → host → user).

interface HostContext {
  userMessage?: string;
  guestSummary?: string;
  researchSummary?: string;
}

async function hostDecisionLoop(roomId: string, context: HostContext) {
  const store = getStore();
  const room = getStore().rooms.find((r) => r.id === roomId);
  if (!room) return;

  const apiKey = store.apiKey;
  const hostModel = store.selectedHostModel;

  // Safety: prevent infinite loops
  const maxIterations = room.config.maxRounds;
  let iterations = 0;

  let currentContext = { ...context };

  while (iterations < maxIterations) {
    iterations++;

    // ── Director decides ──
    store.setPhase(roomId, "HOST_SUMMARIZING");

    const currentRoom = getStore().rooms.find((r) => r.id === roomId);
    if (!currentRoom) return;

    const directorSystemPrompt = hostDirectorPrompt({
      topic: currentRoom.topic,
      config: currentRoom.config,
      hostMemory: currentRoom.hostMemory,
      guestSummaries: currentContext.guestSummary,
      userMessage: currentContext.userMessage,
      researchSummary: currentContext.researchSummary,
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
      // Fallback: ask the user
      decision = {
        action: "ask_user",
        message: "I'd like to hear your thoughts on this. What would you like to explore further?",
      };
    }

    // ── Show host message ──
    store.setPhase(roomId, "HOST_PRESENTING");

    getStore().addMessage(roomId, {
      role: "host",
      content: decision.message,
      isLoading: false,
      isStreaming: false,
      isSummary: false,
      isError: false,
    });

    // Update host memory (fire-and-forget)
    updateHostMemoryBackground(roomId, {
      context: currentContext,
      directorDecision: decision,
    });

    // ── Route based on decision ──

    if (decision.action === "ask_user" || decision.action === "conclude_round") {
      // Return control to the user
      store.setPhase(roomId, "AWAITING_USER");

      // Check for queued messages
      const nextMessage = getStore().dequeueUserMessage(roomId);
      if (nextMessage) {
        await runDebateRound(roomId, nextMessage);
      }
      return;
    }

    if (decision.action === "request_research") {
      // Run research, then loop back to host with results
      const researchModelAvailable = store.selectedResearchModel || store.selectedHostModel;
      if (decision.research_queries?.length && researchModelAvailable) {
        store.setPhase(roomId, "RESEARCH_PHASE");
        const researchSummary = await runResearchPhase(roomId, decision.research_queries);
        currentContext = {
          userMessage: undefined,
          guestSummary: undefined,
          researchSummary: researchSummary || "Research did not return results.",
        };
        continue; // loop back to host
      }
      // No queries provided — fall through to ask_user
      store.setPhase(roomId, "AWAITING_USER");
      return;
    }

    if (decision.action === "present_to_guests") {
      // Check prerequisites
      const latestRoom = getStore().rooms.find((r) => r.id === roomId);
      if (!store.selectedGuestModel || !latestRoom?.guests.length) {
        // Can't run guests — tell the user
        getStore().addMessage(roomId, {
          role: "system",
          content: !store.selectedGuestModel
            ? "No guest model selected. Please select a guest model in the Config tab."
            : "No guests in the room. Please add guests in the Guests tab.",
          isLoading: false,
          isStreaming: false,
          isSummary: false,
          isError: true,
        });
        store.setPhase(roomId, "AWAITING_USER");
        return;
      }

      // Run guest round, then loop back to host with their responses
      const guestSummary = await runGuestRound(roomId, decision.message);
      if (!guestSummary) {
        // Guests all failed — return to user
        store.setPhase(roomId, "AWAITING_USER");
        return;
      }
      currentContext = {
        userMessage: undefined,
        guestSummary,
        researchSummary: undefined,
      };
      getStore().incrementRound(roomId);
      continue; // loop back to host
    }

    // Unknown action — stop
    store.setPhase(roomId, "AWAITING_USER");
    return;
  }

  // Max iterations reached — stop and return to user
  getStore().addMessage(roomId, {
    role: "system",
    content: "Maximum rounds reached for this turn. Returning control to you.",
    isLoading: false,
    isStreaming: false,
    isSummary: false,
    isError: false,
  });
  store.setPhase(roomId, "AWAITING_USER");
}

// ─── Guest round ─────────────────────────────────────────────────────
// Fires all guests in parallel, streams their responses, then returns
// a concatenated summary string for the host.

async function runGuestRound(
  roomId: string,
  hostMessage: string
): Promise<string | null> {
  const store = getStore();
  const room = getStore().rooms.find((r) => r.id === roomId);
  if (!room) return null;

  const apiKey = store.apiKey;
  const guestModel = store.selectedGuestModel;
  if (!guestModel) return null;

  store.setPhase(roomId, "GUESTS_RESPONDING");

  const guestPromises = room.guests.map(async (guest) => {
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
      topic: room.topic,
      memory: guest.memory,
      hostMessage,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: hostMessage },
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
            getStore().updateMessage(roomId, msgId, { isStreaming: false });
            resolve({ guestId: guest.id, guestName: guest.name, response: fullText });
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

  // Background: update guest memories (fire-and-forget)
  for (const gr of guestResponses) {
    updateGuestMemoryBackground(roomId, gr.guestId, gr.guestName, {
      hostMessage,
      ownResponse: gr.response,
    });
  }

  // Build a text summary of all guest responses for the host
  const guestSummaryText = guestResponses
    .map((g) => `${g.guestName}: ${g.response}`)
    .join("\n\n---\n\n");

  // Stream a visible host summary of guest responses
  store.setPhase(roomId, "HOST_SUMMARIZING");

  const summaryMsgId = getStore().addMessage(roomId, {
    role: "host",
    content: "",
    isLoading: true,
    isStreaming: false,
    isSummary: true,
    isError: false,
  });

  const apiKey2 = getStore().apiKey;
  const hostModel = getStore().selectedHostModel;

  let summaryText = "";
  try {
    summaryText = await new Promise<string>((resolve, reject) => {
      getStore().updateMessage(roomId, summaryMsgId, {
        isLoading: false,
        isStreaming: true,
      });
      streamChatCompletion(
        apiKey2,
        hostModel,
        [
          { role: "system", content: hostSummarizerPrompt(guestSummaryText) },
          { role: "user", content: "Please summarize the above responses." },
        ],
        (chunk) => {
          getStore().appendToMessage(roomId, summaryMsgId, chunk);
        },
        (fullText) => {
          getStore().updateMessage(roomId, summaryMsgId, { isStreaming: false });
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
        getStore().preferredProviders[hostModel]
      );
    });
  } catch {
    return guestSummaryText; // return raw text if summary fails
  }

  return summaryText;
}

// ─── Research phase ──────────────────────────────────────────────────
// Runs researchers in parallel, streams their output, summarizes, and
// returns the summary text for the host.

async function runResearchPhase(
  roomId: string,
  queries: string[]
): Promise<string | null> {
  const store = getStore();
  const room = store.rooms.find((r) => r.id === roomId);
  if (!room) return null;

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
          getStore().updateResearchFile(roomId, fileId, { isStreaming: false });
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

  const results = await Promise.allSettled(researchPromises);
  const successfulResults = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);

  if (successfulResults.length === 0) return null;

  // Summarize research
  const rawResearch = successfulResults.join("\n\n---\n\n");
  const summaryMsgId = getStore().addMessage(roomId, {
    role: "host",
    content: "",
    isLoading: false,
    isStreaming: true,
    isSummary: true,
    isError: false,
  });

  const hostModel = getStore().selectedHostModel;

  let summaryText = "";
  try {
    summaryText = await new Promise<string>((resolve, reject) => {
      streamChatCompletion(
        getStore().apiKey,
        hostModel,
        [
          { role: "system", content: hostSummarizerPrompt(rawResearch) },
          { role: "user", content: "Summarize the research findings above." },
        ],
        (chunk) => {
          getStore().appendToMessage(roomId, summaryMsgId, chunk);
        },
        (fullText) => {
          getStore().updateMessage(roomId, summaryMsgId, { isStreaming: false });
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
        getStore().preferredProviders[hostModel]
      );
    });
  } catch {
    return rawResearch;
  }

  return summaryText;
}

// ─── Background memory updates ───────────────────────────────────────

function updateGuestMemoryBackground(
  roomId: string,
  guestId: string,
  guestName: string,
  event: { hostMessage: string; ownResponse: string }
) {
  const store = getStore();
  const room = store.rooms.find((r) => r.id === roomId);
  const guest = room?.guests.find((g) => g.id === guestId);
  if (!guest) return;

  const prompt = guestMemoryUpdatePrompt({
    guestName,
    currentMemory: guest.memory,
    newEvent: `Host said: "${event.hostMessage}". My response: ${event.ownResponse}`,
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
        // skip
      }
    })
    .catch(() => {});
}

function updateHostMemoryBackground(
  roomId: string,
  event: {
    context: HostContext;
    directorDecision: DirectorDecision;
  }
) {
  const store = getStore();
  const room = store.rooms.find((r) => r.id === roomId);
  if (!room) return;

  const parts: string[] = [];
  if (event.context.userMessage) parts.push(`User said: "${event.context.userMessage}".`);
  if (event.context.guestSummary) parts.push(`Guest summary: ${event.context.guestSummary}.`);
  if (event.context.researchSummary) parts.push(`Research: ${event.context.researchSummary}.`);
  parts.push(`Decision: ${event.directorDecision.action} — ${event.directorDecision.message}`);

  const prompt = guestMemoryUpdatePrompt({
    guestName: "Host",
    currentMemory: room.hostMemory,
    newEvent: parts.join(" "),
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
        // skip
      }
    })
    .catch(() => {});
}

// ─── Export ──────────────────────────────────────────────────────────

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
