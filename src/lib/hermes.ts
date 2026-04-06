import type { AppSettings, GatewayStatus } from "./types";

// ── Headers helper — passes gateway URL and API key to proxy ───────────────
function h(settings: AppSettings, extra: Record<string, string> = {}) {
  return {
    "Authorization": `Bearer ${settings.apiKey}`,
    "x-gateway-url": settings.gatewayUrl,
    ...extra,
  };
}


// ── Health check ────────────────────────────────────────────────────────────
export async function checkHealth(settings: AppSettings): Promise<GatewayStatus> {
  try {
    const start = Date.now();
    const res = await fetch(`/api/proxy?path=/health`, {
      headers: h(settings),
      signal: AbortSignal.timeout(4000),
    });
    const latency = Date.now() - start;
    if (res.ok) return { connected: true, latency };
    return { connected: false, error: `HTTP ${res.status}` };
  } catch (e: unknown) {
    return { connected: false, error: (e as Error).message };
  }
}

// ── Fetch available models ──────────────────────────────────────────────────
export async function fetchModels(settings: AppSettings): Promise<string[]> {
  try {
    const res = await fetch(`/api/proxy?path=/models`, {
      headers: h(settings),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data.map((m: { id?: string; name?: string }) => m.id ?? m.name ?? "").filter(Boolean);
    if (data.models && Array.isArray(data.models)) return data.models;
    if (data.data && Array.isArray(data.data)) return data.data.map((m: { id?: string }) => m.id ?? "").filter(Boolean);
    return [];
  } catch {
    return [];
  }
}

// ── Send chat message (streaming + non-streaming) ───────────────────────────
export async function sendMessage(
  settings: AppSettings,
  messages: Array<{ role: string; content: string }>,
  sessionId: string | null,
  onChunk: (text: string) => void,
  onToolCall: (tool: string) => void,
  signal?: AbortSignal
) {
  const body: Record<string, unknown> = {
    messages,
    model: settings.model,
    stream: settings.streamingEnabled,
  };
  if (settings.systemPrompt) body.system = settings.systemPrompt;
  if (sessionId) body.session_id = sessionId;

  const res = await fetch(`/api/proxy?path=/chat`, {
    method: "POST",
    headers: h(settings, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(err);
  }

  if (!settings.streamingEnabled) {
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? data.response ?? data.content ?? "";
    onChunk(content);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
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
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content ?? json.content ?? "";
        if (delta) onChunk(delta);
        if (json.tool_calls || json.tool_use) {
          const toolName = json.tool_calls?.[0]?.function?.name ?? json.tool_use?.[0]?.name ?? "tool";
          onToolCall(toolName);
        }
      } catch { /* skip malformed SSE lines */ }
    }
  }
}

// ── Memory ───────────────────────────────────────────────────────────────────
export async function queryMemory(settings: AppSettings, query = ""): Promise<string[]> {
  try {
    const prompt = query
      ? `Search your memory for anything related to: "${query}". Return results as a JSON array of strings.`
      : "List your 20 most recent memories. Return as a JSON array of strings only, no other text.";

    const res = await fetch(`/api/proxy?path=/chat`, {
      method: "POST",
      headers: h(settings, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: settings.model,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? data.response ?? "";
    const match = content.match(/\[[\s\S]*?\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    // Fallback: split by newlines
    return content.split("\n").map((l: string) => l.replace(/^[-•*\d.]+\s*/, "").trim()).filter((l: string) => l.length > 5).slice(0, 20);
  } catch {
    return [];
  }
}

export async function addMemory(settings: AppSettings, memory: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proxy?path=/chat`, {
      method: "POST",
      headers: h(settings, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        messages: [{ role: "user", content: `Please save this to your memory: ${memory}` }],
        model: settings.model,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Skills ────────────────────────────────────────────────────────────────────
export interface Skill {
  name: string;
  description: string;
  enabled?: boolean;
  version?: string;
}

export async function querySkills(settings: AppSettings): Promise<Skill[]> {
  // Default built-in skills — shown while offline or as fallback
  const defaults: Skill[] = [
    { name: "web_search", description: "Search the internet for current information", enabled: true },
    { name: "terminal", description: "Run shell commands on your computer", enabled: true },
    { name: "file_ops", description: "Read and write files", enabled: true },
    { name: "browser", description: "Browse and interact with websites", enabled: true },
    { name: "memory", description: "Remember information across sessions", enabled: true },
    { name: "github", description: "Work with GitHub repos, issues, and PRs", enabled: true },
    { name: "code_runner", description: "Execute Python and JavaScript code", enabled: true },
    { name: "telegram", description: "Send messages via Telegram", enabled: false },
    { name: "discord", description: "Post to Discord channels", enabled: false },
    { name: "email", description: "Read and send emails", enabled: false },
    { name: "calendar", description: "Access calendar events", enabled: false },
    { name: "slack", description: "Read and post Slack messages", enabled: false },
  ];

  try {
    const res = await fetch(`/api/proxy?path=/chat`, {
      method: "POST",
      headers: h(settings, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        messages: [{ role: "user", content: "List all your available tools as a JSON array with objects {name: string, description: string, enabled: boolean}. Return ONLY the JSON array." }],
        model: settings.model,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return defaults;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? data.response ?? "";
    const match = content.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* fall through */ }
    }
    return defaults;
  } catch {
    return defaults;
  }
}

// ── Cron ──────────────────────────────────────────────────────────────────────
export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  task: string;
  active: boolean;
  lastRun?: string;
  nextRun?: string;
}

export async function queryCronJobs(settings: AppSettings): Promise<CronJob[]> {
  try {
    // Try dedicated endpoint first
    const res = await fetch(`/api/proxy?path=/cron/jobs`, {
      headers: h(settings),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : (data.jobs ?? []);
    }
  } catch { /* fall through to agent query */ }

  try {
    const chatRes = await fetch(`/api/proxy?path=/chat`, {
      method: "POST",
      headers: h(settings, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        messages: [{ role: "user", content: "List all my scheduled cron jobs as a JSON array with objects {id, name, schedule, task, active, lastRun, nextRun}. Return ONLY the JSON array." }],
        model: settings.model,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!chatRes.ok) return [];
    const chatData = await chatRes.json();
    const content = chatData.choices?.[0]?.message?.content ?? chatData.response ?? "";
    const match = content.match(/\[[\s\S]*?\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return [];
  } catch {
    return [];
  }
}

export async function createCronJob(settings: AppSettings, schedule: string, task: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proxy?path=/cron/jobs`, {
      method: "POST",
      headers: h(settings, { "Content-Type": "application/json" }),
      body: JSON.stringify({ schedule, task, name: task.slice(0, 40) }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return true;
  } catch { /* fall through */ }

  try {
    const chatRes = await fetch(`/api/proxy?path=/chat`, {
      method: "POST",
      headers: h(settings, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        messages: [{ role: "user", content: `Create a scheduled job: schedule="${schedule}", task="${task}". Confirm it has been saved.` }],
        model: settings.model,
      }),
      signal: AbortSignal.timeout(15000),
    });
    return chatRes.ok;
  } catch {
    return false;
  }
}

export async function deleteCronJob(settings: AppSettings, id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proxy?path=/cron/jobs/${id}`, {
      method: "DELETE",
      headers: h(settings),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runCronJobNow(settings: AppSettings, id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proxy?path=/cron/jobs/${id}/run`, {
      method: "POST",
      headers: h(settings),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
