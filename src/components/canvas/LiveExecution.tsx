"use client";
import { useState, useEffect, useRef } from "react";
import { X, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Zap, Terminal, Clock } from "lucide-react";

export interface ExecutionEvent {
  type: "start" | "tool_call" | "tool_result" | "token" | "done" | "error";
  content: string;
  timestamp: number;
  toolName?: string;
}

interface Props {
  flowName: string;
  events: ExecutionEvent[];
  isRunning: boolean;
  onClose: () => void;
  onCancel?: () => void;
}

export default function LiveExecution({ flowName, events, isRunning, onClose, onCancel }: Props) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const finalOutput = events.filter(e => e.type === "token").map(e => e.content).join("");
  const toolCalls = events.filter(e => e.type === "tool_call");
  const isDone = events.some(e => e.type === "done");
  const hasError = events.some(e => e.type === "error");
  const elapsed = events.length > 0
    ? Math.round((Date.now() - events[0].timestamp) / 1000)
    : 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 16,
      pointerEvents: isRunning || events.length > 0 ? "all" : "none",
    }}
    onClick={e => { if (e.target === e.currentTarget && !isRunning) onClose(); }}
    >
      <div style={{
        width: 420, maxHeight: "70vh", background: "var(--surface-1)",
        border: `1px solid ${hasError ? "rgba(255,77,109,0.4)" : isDone ? "rgba(0,217,126,0.4)" : "rgba(240,165,0,0.4)"}`,
        borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        animation: "slideUp 0.2s ease-out",
      }}>

        {/* Header */}
        <div style={{
          padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: "1px solid var(--border)",
          background: hasError ? "rgba(255,77,109,0.06)" : isDone ? "rgba(0,217,126,0.06)" : "rgba(240,165,0,0.06)",
        }}>
          {isRunning && <Loader2 size={15} style={{ color: "var(--amber)", flexShrink: 0 }} className="animate-spin" />}
          {isDone && !hasError && <CheckCircle size={15} style={{ color: "var(--jade)", flexShrink: 0 }} />}
          {hasError && <XCircle size={15} style={{ color: "var(--rose)", flexShrink: 0 }} />}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.82rem", fontFamily: "'Space Grotesk',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isRunning ? `Running: ${flowName}` : isDone ? `✓ ${flowName} complete` : hasError ? `✗ ${flowName} failed` : flowName}
            </div>
            <div style={{ color: "var(--text-dim)", fontSize: "0.68rem", fontFamily: "'JetBrains Mono',monospace", marginTop: 1 }}>
              {toolCalls.length} tool calls · {elapsed}s
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {isRunning && onCancel && (
              <button onClick={onCancel}
                style={{ padding: "4px 10px", borderRadius: 5, background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.2)", color: "var(--rose)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>
                Cancel
              </button>
            )}
            {!isRunning && (
              <button onClick={onClose}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 2 }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Event stream */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>

          {events.map((event, idx) => {
            if (event.type === "start") {
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-dim)", fontSize: "0.72rem", fontFamily: "'JetBrains Mono',monospace" }}>
                  <Zap size={10} style={{ color: "var(--amber)" }} />
                  <span>Flow started</span>
                  <span style={{ marginLeft: "auto" }}>{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
              );
            }

            if (event.type === "tool_call") {
              const isCollapsed = collapsed.has(idx);
              const resultEvent = events[idx + 1];
              return (
                <div key={idx} style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 6, overflow: "hidden" }}>
                  <button
                    onClick={() => setCollapsed(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; })}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <Terminal size={11} style={{ color: "#f97316", flexShrink: 0 }} />
                    <span style={{ color: "#f97316", fontSize: "0.72rem", fontFamily: "'JetBrains Mono',monospace", flex: 1 }}>
                      {event.toolName ?? event.content.slice(0, 40)}
                    </span>
                    {isCollapsed ? <ChevronDown size={11} style={{ color: "var(--text-dim)" }} /> : <ChevronUp size={11} style={{ color: "var(--text-dim)" }} />}
                  </button>
                  {!isCollapsed && event.content && (
                    <div style={{ padding: "0 10px 8px", color: "var(--text-dim)", fontSize: "0.68rem", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
                      {event.content.slice(0, 200)}{event.content.length > 200 ? "…" : ""}
                    </div>
                  )}
                </div>
              );
            }

            if (event.type === "error") {
              return (
                <div key={idx} style={{ padding: "8px 10px", background: "rgba(255,77,109,0.07)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: 6 }}>
                  <div style={{ color: "var(--rose)", fontSize: "0.75rem", fontWeight: 600, marginBottom: 2 }}>Error</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontFamily: "'JetBrains Mono',monospace" }}>{event.content}</div>
                </div>
              );
            }

            return null;
          })}

          {/* Streaming output */}
          {finalOutput && (
            <div style={{ padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4 }}>
              <div style={{ color: "var(--text-dim)", fontSize: "0.65rem", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Output
              </div>
              <div style={{ color: "var(--text-primary)", fontSize: "0.8rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {finalOutput}
                {isRunning && <span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--amber)", marginLeft: 2, animation: "blink 1s infinite" }} />}
              </div>
            </div>
          )}

          {isDone && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--jade)", fontSize: "0.72rem", fontFamily: "'JetBrains Mono',monospace" }}>
              <CheckCircle size={10} />
              <span>Completed in {elapsed}s · Output sent to destination</span>
            </div>
          )}

          {isRunning && !finalOutput && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-dim)", fontSize: "0.75rem" }}>
              <Loader2 size={12} className="animate-spin" style={{ color: "var(--amber)" }} />
              Agent is thinking…
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

// Hook to use with runFlow
export function useExecution() {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  function startExecution(flowName: string) {
    setEvents([{ type: "start", content: `Starting ${flowName}`, timestamp: Date.now() }]);
    setIsRunning(true);
    setShowPanel(true);
  }

  function addEvent(event: Omit<ExecutionEvent, "timestamp">) {
    setEvents(prev => [...prev, { ...event, timestamp: Date.now() }]);
  }

  function finishExecution(success: boolean, output?: string) {
    if (output) addEvent({ type: "token", content: output });
    addEvent({ type: success ? "done" : "error", content: success ? "Completed" : "Failed" });
    setIsRunning(false);
  }

  function reset() {
    setEvents([]);
    setIsRunning(false);
    setShowPanel(false);
  }

  return { events, isRunning, showPanel, setShowPanel, startExecution, addEvent, finishExecution, reset };
}
