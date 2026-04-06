"use client";
import { useState } from "react";
import { Plus, MessageSquare, Trash2, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function SessionsPanel() {
  const {
    conversations, upsertConversation, removeConversation,
    setActiveConversation, setActivePanel, activeConversation
  } = useStore();

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  function create() {
    const name = newName.trim() || `Session ${new Date().toLocaleDateString()}`;
    const id = uid();
    upsertConversation({ id, name, updatedAt: Date.now(), messageCount: 0 });
    setNewName("");
    setCreating(false);
  }

  function openSession(id: string) {
    setActiveConversation(id);
    setActivePanel("chat");
  }

  return (
    <div className="flex flex-col h-full min-h-0 panel-fade">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Sessions
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Named conversations — each maintains its own context in the Hermes Responses API
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
          style={{ background: "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)" }}
        >
          <Plus size={12} />
          New
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div
          className="mx-5 mt-3 p-3 rounded-lg"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") setCreating(false); }}
            placeholder="Session name (Enter to create)"
            className="hermes-input w-full px-3 py-2 rounded text-sm"
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => setCreating(false)} className="text-xs px-3 py-1 rounded" style={{ color: "var(--text-secondary)" }}>
              Cancel
            </button>
            <button
              onClick={create}
              className="text-xs px-3 py-1 rounded"
              style={{ background: "var(--amber)", color: "var(--surface-0)", fontWeight: 600 }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-0">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <MessageSquare size={28} style={{ color: "var(--text-dim)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No sessions yet — create one to track conversations</p>
          </div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-3 px-3 py-3 rounded-lg transition-all cursor-pointer"
              style={{
                background: activeConversation === c.id ? "rgba(240,165,0,0.06)" : "var(--surface-2)",
                border: `1px solid ${activeConversation === c.id ? "rgba(240,165,0,0.2)" : "var(--border)"}`,
              }}
              onClick={() => openSession(c.id)}
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--surface-3)", color: activeConversation === c.id ? "var(--amber)" : "var(--text-secondary)" }}
              >
                <MessageSquare size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {c.name}
                </div>
                <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>{formatDistanceToNow(c.updatedAt, { addSuffix: true })}</span>
                  {c.messageCount > 0 && <span>· {c.messageCount} msgs</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openSession(c.id); }}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: "var(--amber)" }}
                >
                  <ArrowRight size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeConversation(c.id); }}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: "var(--text-dim)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--rose)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
