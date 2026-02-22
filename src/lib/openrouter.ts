import { OpenRouterModel, ModelEndpoint } from "@/store/types";

const BASE_URL = "https://openrouter.ai/api/v1";
const REFERER = "https://github.com/danielcdcj/GPT-Debate-Discuss-Research";
const TITLE = "Debate Room";

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": REFERER,
    "X-Title": TITLE,
  };
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  const res = await fetch(`${BASE_URL}/models`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status}`);
  }
  const data = await res.json();
  const models: OpenRouterModel[] = (data.data || []).filter(
    (m: OpenRouterModel) => {
      const arch = m.architecture;
      if (!arch) return true;
      const outputModalities = arch.output_modalities || [];
      const modality = arch.modality || "";
      return (
        outputModalities.includes("text") ||
        modality.includes("text") ||
        outputModalities.length === 0
      );
    }
  );
  return models.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchModelEndpoints(
  apiKey: string,
  modelId: string
): Promise<ModelEndpoint[]> {
  const res = await fetch(`${BASE_URL}/models/${modelId}/endpoints`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.data || [];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function streamChatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: Error) => void,
  providerOrder?: string[]
): Promise<void> {
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    max_tokens: 2048,
  };
  if (providerOrder?.length) {
    body.provider = { order: providerOrder, allow_fallbacks: true };
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify(body),
    });
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    onError(
      new Error(
        (err as { error?: { message?: string } }).error?.message ||
          `API error ${response.status}`
      )
    );
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;
        if (trimmed === "data: [DONE]") {
          onDone(fullText);
          return;
        }
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onChunk(delta);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    }
    onDone(fullText);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function chatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  jsonMode: boolean = false,
  providerOrder?: string[]
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: 2048,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }
  if (providerOrder?.length) {
    body.provider = { order: providerOrder, allow_fallbacks: true };
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
        `API error ${response.status}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
