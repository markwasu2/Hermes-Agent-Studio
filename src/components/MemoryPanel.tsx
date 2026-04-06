"use client";
import { useState } from "react";
import { Brain, Search, RefreshCw, Plus } from "lucide-react";
import { useStore } from "@/lib/store";

interface MemoryEntry {
  id: string;
  content: string;
  tags?: string[];
  timestamp?: string;
}

async function queryMemory(settings: { gatewayUrl: string; apiKey: string; model: string }, query: string): Promise<MemoryEntry[]> {
  const prompt = query
    ? `Search your memory for anything related to: "${query}". Return as JSON array: [{"id":"...","content":"...","tags":["..."]}]. ONLY JSON.`
    : `List your 20 most recent or important memory entries. Return as JSON array: [{"id":"...","content":"...","tags":["..."]}]. ONLY JSON.`;

  try {
    const res = await fetch(`/api/proxy?path=/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-url": settings.gatewayUrl,
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify({
        model: settings.model || "hermes-agent",
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map((e, i) => ({ id: e.id ?? String(i), ...e }));
    return [];
  } catch {
    return [];
  }
}

async function addMemory(settings: { gatewayUrl: string; apiKey: string; model: string }, content: string): Promise<boolean> {
  try {
    await fetch(`/api/proxy?path=/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-url": settings.gatewayUrl,
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify({
        model: settings.model || "hermes-agent",
        messages: [{ role: "user", content: `Please save this to your memory: ${content}` }],
        stream: false,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export default function MemoryPanel() {
  const { settings, status } = useStore();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    const results = await queryMemory(settings, query);
    setEntries(results);
    setLoaded(true);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newContent.trim()) return;
    setAdding(true);
    await addMemory(settings, newContent);
    setNewContent("");
    setShowAdd(false);
    setAdding(false);
    load();
  }

  return (
    <div className="flex flex-col h-full min-h-0 panel-fade">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Memory
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Browse and search agent memory — queries the agent directly
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            <Plus size={12} />
            Add
          </button>
          <button
            onClick={load}
            disabled={loading || !status.connected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{ background: "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)" }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Load
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mx-5 mt-3 p-3 rounded-lg flex-shrink-0" style={{ background: "var(--surface-2)", border: "1px solid rgba(240,165,0,0.15)" }}>
          <textarea
            autoFocus
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Memory content to save…"
            rows={3}
            className="hermes-input w-full px-3 py-2 rounded text-sm resize-none"
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="text-xs px-3 py-1 rounded" style={{ color: "var(--text-secondary)" }}>Cancel</button>
            <button
              onClick={handleAdd}
              disabled={adding || !newContent.trim()}
              className="text-xs px-3 py-1 rounded"
              style={{ background: "var(--amber)", color: "var(--surface-0)", fontWeight: 600 }}
            >
              {adding ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dim)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search memory… (Enter to search)"
              className="hermes-input w-full pl-8 pr-3 py-2 rounded text-sm"
            />
          </div>
          <button
            onClick={load}
            disabled={loading || !status.connected}
            className="px-3 py-2 rounded text-sm transition-all"
            style={{ background: "var(--surface-3)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2 min-h-0">
        {!loaded ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Brain size={28} style={{ color: "var(--text-dim)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {status.connected ? 'Click "Load" to query agent memory' : "Connect gateway first"}
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Brain size={24} style={{ color: "var(--text-dim)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No memory entries found</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="px-4 py-3 rounded-lg"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{entry.content}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {(entry.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "var(--surface-3)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem" }}
                  >
                    #{tag}
                  </span>
                ))}
                {entry.timestamp && (
                  <span className="text-xs ml-auto" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {entry.timestamp}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
