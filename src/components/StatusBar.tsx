"use client";
import { Plus, Trash2, Activity } from "lucide-react";
import { useStore } from "@/lib/store";

// inline nanoid-lite since we don't want to add dep
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const PANEL_LABELS: Record<string, string> = {
  chat: "Chat",
  sessions: "Sessions",
  memory: "Memory",
  skills: "Skills",
  cron: "Cron",
};

export default function StatusBar() {
  const {
    activePanel,
    status,
    settings,
    activeConversation,
    setActiveConversation,
    clearMessages,
    upsertConversation,
  } = useStore();

  function newConversation() {
    const id = uid();
    upsertConversation({
      id,
      name: `Session ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      updatedAt: Date.now(),
      messageCount: 0,
    });
    setActiveConversation(id);
  }

  function clearChat() {
    clearMessages();
  }

  return (
    <div
      className="flex items-center justify-between px-4 h-10 border-b flex-shrink-0"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      {/* Left: panel label */}
      <div className="flex items-center gap-3">
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {PANEL_LABELS[activePanel] ?? activePanel}
        </span>
        {activeConversation && activePanel === "chat" && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: "rgba(240,165,0,0.08)",
              color: "var(--amber)",
              fontFamily: "'JetBrains Mono', monospace",
              border: "1px solid rgba(240,165,0,0.15)",
            }}
          >
            {activeConversation}
          </span>
        )}
      </div>

      {/* Right: controls + status */}
      <div className="flex items-center gap-2">
        {/* Latency */}
        {status.connected && status.latency && (
          <div className="flex items-center gap-1" style={{ color: "var(--text-dim)", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>
            <Activity size={10} />
            <span>{status.latency}ms</span>
          </div>
        )}

        {/* Model pill */}
        <span
          className="badge badge-amber hidden sm:flex"
        >
          {settings.model}
        </span>

        {/* Connection dot */}
        <span className={`badge ${status.connected ? "badge-connected" : "badge-disconnected"}`}>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: status.connected ? "var(--jade)" : "var(--rose)" }}
          />
          {status.connected ? "Connected" : "Offline"}
        </span>

        {/* Chat actions */}
        {activePanel === "chat" && (
          <>
            <button
              onClick={clearChat}
              title="Clear messages"
              className="p-1.5 rounded transition-colors"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--rose)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={newConversation}
              title="New session"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: "rgba(240,165,0,0.12)",
                color: "var(--amber)",
                border: "1px solid rgba(240,165,0,0.2)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <Plus size={12} />
              New
            </button>
          </>
        )}
      </div>
    </div>
  );
}
