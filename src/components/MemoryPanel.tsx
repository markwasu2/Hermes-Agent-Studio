"use client";
import { useState } from "react";
import { Search, Plus, Loader2, Brain, Trash2, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { queryMemory, addMemory } from "@/lib/hermes";
import { notify } from "./Toast";

export default function MemoryPanel() {
  const { settings, status } = useStore();
  const [memories, setMemories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [newMemory, setNewMemory] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load(q = "") {
    if (!status.connected) { notify.error("Connect to Hermes gateway first"); return; }
    setLoading(true);
    try {
      const results = await queryMemory(settings, q);
      setMemories(results);
      setLoaded(true);
      if (results.length === 0) notify.info("No memories found");
    } catch {
      notify.error("Failed to load memories");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newMemory.trim()) return;
    if (!status.connected) { notify.error("Connect to Hermes gateway first"); return; }
    setAdding(true);
    try {
      const ok = await addMemory(settings, newMemory.trim());
      if (ok) {
        notify.success("Memory saved!");
        setMemories(prev => [newMemory.trim(), ...prev]);
        setNewMemory("");
      } else {
        notify.error("Failed to save memory");
      }
    } finally {
      setAdding(false);
    }
  }

  function deleteMemory(idx: number) {
    setMemories(prev => prev.filter((_, i) => i !== idx));
    notify.info("Removed from view (memory persists in agent until next session)");
  }

  return (
    <div className="flex flex-col h-full panel-fade" style={{ background: "var(--surface-0)" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
        <div className="flex items-center gap-2">
          <Brain size={16} style={{ color: "var(--amber)" }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
              Memory
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              What your agent remembers about you
            </p>
          </div>
        </div>
        <button onClick={() => load(query)}
          disabled={loading || !status.connected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
          style={{ background: "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)", cursor: status.connected ? "pointer" : "not-allowed", opacity: status.connected ? 1 : 0.5 }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {loaded ? "Refresh" : "Load Memories"}
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dim)" }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load(query)}
              placeholder="Search memories…"
              className="hermes-input w-full pl-8 pr-3 py-2 rounded text-sm"
            />
          </div>
          <button onClick={() => load(query)} disabled={loading || !status.connected}
            className="px-3 py-2 rounded text-xs font-medium"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>
            Search
          </button>
        </div>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {!status.connected && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center" style={{ color: "var(--text-dim)" }}>
            <Brain size={32} style={{ opacity: 0.3 }} />
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Connect to Hermes gateway to view memories</div>
            <div className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Run: hermes gateway</div>
          </div>
        )}

        {status.connected && !loaded && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center" style={{ color: "var(--text-dim)" }}>
            <Brain size={32} style={{ opacity: 0.3 }} />
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Click "Load Memories" to see what your agent remembers</div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-32 gap-2" style={{ color: "var(--text-dim)" }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Asking your agent for memories…</span>
          </div>
        )}

        {loaded && !loading && memories.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center" style={{ color: "var(--text-dim)" }}>
            <div className="text-sm">No memories found{query ? ` for "${query}"` : ""}</div>
            <div className="text-xs">Chat more and your agent will start remembering things</div>
          </div>
        )}

        {memories.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs mb-3" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
              {memories.length} {memories.length === 1 ? "memory" : "memories"}{query ? ` matching "${query}"` : ""}
            </div>
            {memories.map((mem, i) => (
              <div key={i}
                className="group flex items-start gap-3 px-3 py-2.5 rounded"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--amber)" }} />
                <span className="flex-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{mem}</span>
                <button
                  onClick={() => deleteMemory(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  style={{ color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--rose)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add memory */}
      <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
        <div className="flex gap-2">
          <input
            value={newMemory}
            onChange={e => setNewMemory(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAdd()}
            placeholder="Add something to remember… (e.g. I prefer Python, My boss is Sarah)"
            className="hermes-input flex-1 px-3 py-2 rounded text-sm"
            disabled={!status.connected}
          />
          <button onClick={handleAdd}
            disabled={!newMemory.trim() || adding || !status.connected}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium"
            style={{ background: newMemory.trim() && status.connected ? "var(--amber)" : "var(--surface-3)", color: newMemory.trim() && status.connected ? "var(--surface-0)" : "var(--text-dim)", border: "none", cursor: newMemory.trim() && status.connected ? "pointer" : "not-allowed" }}>
            {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
