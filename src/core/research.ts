import type { DebateStore } from "./store";
import { RESEARCHER_PROFILES } from "./types";
import { streamChatCompletion } from "./api";
import { researcherPrompt } from "./prompts/research";

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
