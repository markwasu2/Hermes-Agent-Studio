"use client";
import { useState, useEffect, useRef } from "react";
import { Search, MessageSquare, GitBranch, Brain, Zap, Clock, Settings, Plus, Trash2, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { notify } from "./Toast";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setActivePanel, setSettingsOpen, clearMessages, createFlow } = useStore() as any;

  const commands: Command[] = [
    // Navigation
    { id: "nav-chat",     label: "Go to Chat",     icon: <MessageSquare size={14}/>, category: "Navigate", action: () => { setActivePanel("chat"); onClose(); } },
    { id: "nav-canvas",   label: "Go to Canvas",   icon: <GitBranch size={14}/>,     category: "Navigate", action: () => { setActivePanel("canvas"); onClose(); } },
    { id: "nav-memory",   label: "Go to Memory",   icon: <Brain size={14}/>,         category: "Navigate", action: () => { setActivePanel("memory"); onClose(); } },
    { id: "nav-skills",   label: "Go to Skills",   icon: <Zap size={14}/>,           category: "Navigate", action: () => { setActivePanel("skills"); onClose(); } },
    { id: "nav-cron",     label: "Go to Cron",     icon: <Clock size={14}/>,         category: "Navigate", action: () => { setActivePanel("cron"); onClose(); } },
    // Actions
    { id: "new-session",  label: "New Chat Session", description: "Start a fresh conversation", icon: <Plus size={14}/>, shortcut: "⌘N", category: "Actions",
      action: () => { const id = Math.random().toString(36).slice(2,8); (useStore as any).getState().upsertConversation({ id, name: `Session ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`, updatedAt: Date.now(), messageCount: 0 }); (useStore as any).getState().setActiveConversation(id); setActivePanel("chat"); onClose(); notify.success("New session created"); } },
    { id: "clear-chat",   label: "Clear Chat", description: "Remove all messages", icon: <Trash2 size={14}/>, category: "Actions",
      action: () => { clearMessages(); onClose(); notify.info("Chat cleared"); } },
    { id: "new-flow",     label: "New Canvas Flow", description: "Create a new agent flow", icon: <Plus size={14}/>, category: "Actions",
      action: () => { setActivePanel("canvas"); onClose(); notify.success("New flow created"); } },
    { id: "settings",     label: "Open Settings", description: "Configure connection and API keys", icon: <Settings size={14}/>, shortcut: "⌘,", category: "Actions",
      action: () => { setSettingsOpen(true); onClose(); } },
    { id: "reconnect",    label: "Test Connection", description: "Check Hermes gateway status", icon: <RefreshCw size={14}/>, category: "Actions",
      action: async () => {
        const { checkHealth } = await import("@/lib/hermes");
        const { settings, setStatus } = (useStore as any).getState();
        const s = await checkHealth(settings);
        setStatus(s);
        notify[s.connected ? "success" : "error"](s.connected ? `Connected · ${s.latency}ms` : "Gateway offline — run: hermes gateway");
        onClose();
      }
    },
  ];

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Group by category
  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const flat = Object.values(grouped).flat();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); flat[selected]?.action(); }
    if (e.key === "Escape")    { onClose(); }
  }

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 520, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <Search size={15} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a command or search…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "0.9rem", fontFamily: "'IBM Plex Sans', sans-serif" }}
          />
          <kbd style={{ flexShrink: 0, padding: "2px 6px", borderRadius: 4, background: "var(--surface-3)", color: "var(--text-dim)", fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border)" }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {Object.entries(grouped).map(([cat, cmds]) => (
            <div key={cat}>
              <div style={{ padding: "8px 14px 4px", color: "var(--text-dim)", fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {cat}
              </div>
              {cmds.map(cmd => {
                const idx = flat.indexOf(cmd);
                const isSelected = idx === selected;
                return (
                  <div key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelected(idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer",
                      background: isSelected ? "rgba(240,165,0,0.08)" : "transparent",
                      borderLeft: isSelected ? "2px solid var(--amber)" : "2px solid transparent",
                      transition: "all 0.1s",
                    }}
                  >
                    <span style={{ color: isSelected ? "var(--amber)" : "var(--text-dim)", flexShrink: 0 }}>{cmd.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 500 }}>{cmd.label}</div>
                      {cmd.description && <div style={{ color: "var(--text-dim)", fontSize: "0.72rem", marginTop: 1 }}>{cmd.description}</div>}
                    </div>
                    {cmd.shortcut && (
                      <kbd style={{ flexShrink: 0, padding: "2px 7px", borderRadius: 4, background: "var(--surface-3)", color: "var(--text-dim)", fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border)" }}>
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem" }}>
              No commands found for "{query}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "6px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 12 }}>
          {[["↑↓", "navigate"], ["↵", "run"], ["esc", "close"]].map(([key, label]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-dim)", fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace" }}>
              <kbd style={{ padding: "1px 5px", borderRadius: 3, background: "var(--surface-3)", border: "1px solid var(--border)" }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
