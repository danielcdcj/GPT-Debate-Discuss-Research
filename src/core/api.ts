import type { LLMModel } from "./types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

// ─── Validate API Key ────────────────────────────────────────────────

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${OPENROUTER_BASE}/auth/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Fetch Available Models ──────────────────────────────────────────

export async function fetchModels(apiKey: string): Promise<LLMModel[]> {
  const res = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);

  const data = await res.json();
  const models: LLMModel[] = (data.data || [])
    .filter((m: LLMModel) => {
      const arch = m.architecture;
      if (!arch) return true;
      const outModes = arch.output_modalities || [];
      return outModes.length === 0 || outModes.includes("text");
    })
    .map((m: LLMModel) => ({
      id: m.id,
      name: m.name,
      pricing: m.pricing,
      context_length: m.context_length,
      architecture: m.architecture,
    }))
    .sort((a: LLMModel, b: LLMModel) => a.name.localeCompare(b.name));

  return models;
}

// ─── Chat Completion (non-streaming) ─────────────────────────────────

export async function chatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  jsonMode = false,
  providerOrder?: string[],
  timeoutMs = 60_000
): Promise<string> {
  const body: Record<string, unknown> = { model, messages };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  if (providerOrder?.length) {
    body.provider = { order: providerOrder, allow_fallbacks: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. The API may be unreachable.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Stream Chat Completion ──────────────────────────────────────────

const STREAM_CONNECT_TIMEOUT = 60_000; // 60s to establish connection
const STREAM_IDLE_TIMEOUT = 30_000;    // 30s max silence between chunks

export function streamChatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: Error) => void,
  providerOrder?: string[]
): AbortController {
  const body: Record<string, unknown> = { model, messages, stream: true };

  if (providerOrder?.length) {
    body.provider = { order: providerOrder, allow_fallbacks: true };
  }

  const controller = new AbortController();
  const connectTimer = setTimeout(() => controller.abort(), STREAM_CONNECT_TIMEOUT);

  fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      clearTimeout(connectTimer); // connection established, cancel connect timeout

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(`API error ${res.status}: ${errText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      // Idle timer: resets on every chunk, aborts if stream stalls
      let idleTimer = setTimeout(() => controller.abort(), STREAM_IDLE_TIMEOUT);
      const resetIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => controller.abort(), STREAM_IDLE_TIMEOUT);
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          resetIdle(); // got data, reset the idle clock

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const payload = trimmed.slice(6);
            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                onChunk(delta);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } finally {
        clearTimeout(idleTimer);
      }

      onDone(fullText);
    })
    .catch((err) => {
      clearTimeout(connectTimer);
      if (err instanceof DOMException && err.name === "AbortError") {
        onError(new Error("Stream timed out — no data received. The API may be stalled or unreachable."));
      } else {
        onError(err);
      }
    });

  return controller;
}
