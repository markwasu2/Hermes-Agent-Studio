"use client";
import { MessageSquare, BookOpen, Brain, Clock, Settings, ChevronRight, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import clsx from "clsx";

const NAV = [
  { id: "chat",     icon: MessageSquare, label: "Chat" },
  { id: "sessions", icon: BookOpen,       label: "Sessions" },
  { id: "memory",   icon: Brain,          label: "Memory" },
  { id: "skills",   icon: Zap,            label: "Skills" },
  { id: "cron",     icon: Clock,          label: "Cron" },
];

export default function Sidebar() {
  const { activePanel, setActivePanel, setSettingsOpen, status, conversations, activeConversation, setActiveConversation } = useStore();

  return (
    <aside
      className="flex flex-col w-56 flex-shrink-0 border-r overflow-hidden"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
          style={{ background: "var(--amber)", color: "var(--surface-0)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          H
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
            Hermes Studio
          </div>
          <div
            className="text-xs"
            style={{ color: status.connected ? "var(--jade)" : "var(--rose)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem" }}
          >
            {status.connected ? `● LIVE ${status.latency ? `${status.latency}ms` : ""}` : "○ OFFLINE"}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-3 space-y-0.5">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActivePanel(id)}
            className={clsx("nav-item w-full text-left", activePanel === id && "active")}
          >
            <Icon size={15} />
            <span>{label}</span>
            {activePanel === id && <ChevronRight size={12} className="ml-auto opacity-60" />}
          </button>
        ))}
      </nav>

      {/* Recent conversations (only shown when chat is active) */}
      {activePanel === "chat" && conversations.length > 0 && (
        <div className="flex-1 overflow-y-auto px-2 pt-1 pb-2 min-h-0">
          <div className="px-2 mb-2" style={{ color: "var(--text-dim)", fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Recent
          </div>
          {conversations.slice(0, 20).map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConversation(c.id)}
              className={clsx(
                "w-full text-left px-2 py-1.5 rounded text-xs truncate transition-all",
                activeConversation === c.id
                  ? "text-amber-DEFAULT"
                  : "hover:text-primary"
              )}
              style={{
                color: activeConversation === c.id ? "var(--amber)" : "var(--text-secondary)",
                background: activeConversation === c.id ? "rgba(240,165,0,0.06)" : "transparent",
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto" />

      {/* Settings */}
      <div className="px-2 pb-3 border-t pt-2" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setSettingsOpen(true)}
          className="nav-item w-full text-left"
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
