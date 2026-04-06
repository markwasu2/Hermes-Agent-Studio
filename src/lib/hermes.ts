import type { AppSettings, GatewayStatus } from "./types";

function headers(apiKey: string) {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

export async function checkHealth(settings: AppSettings): Promise<GatewayStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`/api/proxy?path=/health`, {
      headers: { "x-gateway-url": settings.gatewayUrl, "x-api-key": settings.apiKey },
    });
    if (!res.ok) return { connected: false, error: `HTTP ${res.status}` };
    const latency = Date.now() - start;
    return { connected: true, latency };
  } catch (e: unknown) {
    return { connected: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchModels(settings: AppSettings): Promise<string[]> {
  try {
    const res = await fetch(`/api/proxy?path=/v1/models`, {
      headers: { "x-gateway-url": settings.gatewayUrl, "x-api-key": settings.apiKey },
    });
    if (!res.ok) return ["hermes-agent"];
    const data = await res.json();
    return (data.data ?? []).map((m: { id: string }) => m.id);
  } catch {
    return ["hermes-agent"];
  }
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCall: (name: string, args: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: string) => void;
}

export async function streamChat(
  settings: AppSettings,
  messages: { role: string; content: string }[],
  conversation: string | null,
  callbacks: StreamCallbacks
) {
  const body: Record<string, unknown> = {
    model: settings.model || "hermes-agent",
    messages: [
      ...(settings.systemPrompt ? [{ role: "system", content: settings.systemPrompt }] : []),
      ...messages,
    ],
    stream: true,
  };

  if (conversation) {
    body.conversation = conversation;
  }

  let accumulated = "";

  try {
    const res = await fetch(`/api/proxy?path=/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-url": settings.gatewayUrl,
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      callbacks.onError(`HTTP ${res.status}: ${text}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          callbacks.onDone(accumulated);
          return;
        }
        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            accumulated += delta.content;
            callbacks.onToken(delta.content);
          }
          // detect tool progress indicator lines
          if (delta?.content && delta.content.match(/^`[🔧💻🔍🌐📁✍️⚙️].+`/)) {
            const match = delta.content.match(/`([🔧💻🔍🌐📁✍️⚙️][^`]+)`/);
            if (match) callbacks.onToolCall(match[1], "");
          }
        } catch {
          // non-JSON line, skip
        }
      }
    }
    callbacks.onDone(accumulated);
  } catch (e: unknown) {
    callbacks.onError(e instanceof Error ? e.message : String(e));
  }
}

export async function sendMessage(
  settings: AppSettings,
  messages: { role: string; content: string }[],
  conversation: string | null
): Promise<string> {
  const body: Record<string, unknown> = {
    model: settings.model || "hermes-agent",
    messages: [
      ...(settings.systemPrompt ? [{ role: "system", content: settings.systemPrompt }] : []),
      ...messages,
    ],
    stream: false,
  };

  if (conversation) body.conversation = conversation;

  const res = await fetch(`/api/proxy?path=/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gateway-url": settings.gatewayUrl,
      "x-api-key": settings.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
