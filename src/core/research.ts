import type { DebateStore } from "./store";
import { RESEARCHER_PROFILES, FACT_CHECKER_PROFILE } from "./types";
import { streamChatCompletion } from "./api";
import { researcherPrompt, factCheckPrompt } from "./prompts/research";

export async function runResearchPhase(
  store: DebateStore,
  roomId: string,
  queries: string[]
): Promise<string | null> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) return null;

  const researchModel = state.selectedResearchModel || state.selectedHostModel;

  store.setPhase(roomId, "RESEARCH_PHASE");
  store.setRightPanelTab("research");
  store.emit("research:started", { roomId, queries });

  const researchPromises = queries.map(async (query, index) => {
    const profile = RESEARCHER_PROFILES[index % RESEARCHER_PROFILES.length];

    const fileId = store.addResearchFile(roomId, {
      title: query,
      researcher: profile,
      content: "",
      isStreaming: true,
    });

    const prompt = researcherPrompt({
      focus: profile.focus,
      topic: room.topic,
      query,
    });

    return new Promise<string>((resolve, reject) => {
      streamChatCompletion(
        state.apiKey,
        researchModel,
        [
          { role: "system", content: prompt },
          { role: "user", content: query },
        ],
        (chunk) => {
          store.appendToResearchFile(roomId, fileId, chunk);
        },
        (fullText) => {
          store.updateResearchFile(roomId, fileId, { isStreaming: false });
          resolve(fullText);
        },
        (error) => {
          store.updateResearchFile(roomId, fileId, {
            isStreaming: false,
            content: `Error: ${error.message}`,
          });
          reject(error);
        },
        state.preferredProviders[researchModel]
      );
    });
  });

  const results = await Promise.allSettled(researchPromises);
  const successful = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);

  store.emit("research:completed", { roomId });

  if (successful.length === 0) return null;
  return successful.join("\n\n---\n\n");
}

// ─── Fact Check ─────────────────────────────────────────────────────

export async function runFactCheck(
  store: DebateStore,
  roomId: string,
  claim: string
): Promise<string | null> {
  const state = store.getState();
  const room = store.getRoom(roomId);
  if (!room) return null;

  const researchModel = state.selectedResearchModel || state.selectedHostModel;

  store.setPhase(roomId, "FACT_CHECK");
  store.setRightPanelTab("research");

  const fileId = store.addResearchFile(roomId, {
    title: `Fact Check: ${claim.slice(0, 80)}${claim.length > 80 ? "..." : ""}`,
    researcher: FACT_CHECKER_PROFILE,
    content: "",
    isStreaming: true,
  });

  // Also add a visible message in chat for the fact check
  store.addMessage(roomId, {
    role: "system",
    content: `🔍 **Fact-checking:** "${claim.slice(0, 120)}${claim.length > 120 ? "..." : ""}"`,
    isStreaming: false,
    isSummary: false,
    isError: false,
    intent: "fact_check_result",
  });

  const prompt = factCheckPrompt({
    topic: room.topic,
    claim,
  });

  return new Promise<string | null>((resolve) => {
    streamChatCompletion(
      state.apiKey,
      researchModel,
      [
        { role: "system", content: prompt },
        { role: "user", content: `Fact-check this claim: "${claim}"` },
      ],
      (chunk) => {
        store.appendToResearchFile(roomId, fileId, chunk);
      },
      (fullText) => {
        store.updateResearchFile(roomId, fileId, { isStreaming: false });
        resolve(fullText);
      },
      (error) => {
        store.updateResearchFile(roomId, fileId, {
          isStreaming: false,
          content: `Error: ${error.message}`,
        });
        resolve(null);
      },
      state.preferredProviders[researchModel]
    );
  });
}
