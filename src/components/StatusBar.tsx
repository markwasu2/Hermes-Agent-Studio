"use client";
import { Plus, Trash2, Activity, Terminal } from "lucide-react";
import { useStore } from "@/lib/store";

function uid() { return Math.random().toString(36).slice(2, 10); }

const PANEL_LABELS: Record<string, string> = {
  chat: "Chat", sessions: "Sessions", memory: "Memory", skills: "Skills", cron: "Cron",
};

export default function StatusBar() {
  const {
    activePanel, status, settings,
    activeConversation, setActiveConversation,
    clearMessages, upsertConversation, setSettingsOpen,
  } = useStore();

  function newConversation() {
    const id = uid();
    upsertConversation({ id, name: `Session ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, updatedAt: Date.now(), messageCount: 0 });
    setActiveConversation(id);
  }

  return (
    <div className="flex items-center justify-between px-4 h-10 border-b flex-shrink-0"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}>

      {/* Left */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
          {PANEL_LABELS[activePanel] ?? activePanel}
        </span>
        {activeConversation && activePanel === "chat" && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(240,165,0,0.08)", color: "var(--amber)", fontFamily: "'JetBrains Mono', monospace", border: "1px solid rgba(240,165,0,0.15)" }}>
            {activeConversation}
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Latency */}
        {status.connected && status.latency && (
          <div className="flex items-center gap-1" style={{ color: "var(--text-dim)", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>
            <Activity size={10} /><span>{status.latency}ms</span>
          </div>
        )}

        {/* Cmd+K hint */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all"
          style={{ color: "var(--text-dim)", background: "var(--surface-2)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>
          <kbd style={{ fontSize: "0.6rem" }}>⌘K</kbd>
          <span style={{ fontSize: "0.68rem" }}>commands</span>
        </button>

        {/* Model */}
        <span className="badge badge-amber hidden sm:flex">{settings.model}</span>

        {/* Connection status — clickable if offline */}
        {status.connected ? (
          <span className="badge badge-connected">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--jade)" }} />
            Live
          </span>
        ) : (
          <button
            onClick={() => setSettingsOpen(true)}
            className="badge badge-disconnected"
            style={{ cursor: "pointer", background: "rgba(255,77,109,0.07)", border: "1px solid rgba(255,77,109,0.2)", display: "flex", alignItems: "center", gap: 4 }}
            title="Click to open Settings and connect Hermes"
          >
            <Terminal size={10} />
            <span>Start Hermes</span>
          </button>
        )}

        {/* Chat actions */}
        {activePanel === "chat" && (
          <>
            <button onClick={clearMessages} title="Clear messages"
              className="p-1.5 rounded transition-colors"
              style={{ color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--rose)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
              <Trash2 size={13} />
            </button>
            <button onClick={newConversation} title="New session"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all"
              style={{ background: "rgba(240,165,0,0.12)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>
              <Plus size={12} />New
            </button>
          </>
        )}
      </div>
    </div>
  );
}
