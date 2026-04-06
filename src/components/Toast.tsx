"use client";
import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Global event bus
const listeners: Set<(t: Toast) => void> = new Set();

export function toast(message: string, type: ToastType = "info", duration = 3000) {
  const id = Math.random().toString(36).slice(2, 8);
  const t: Toast = { id, type, message, duration };
  listeners.forEach(fn => fn(t));
}

export const notify = {
  success: (msg: string) => toast(msg, "success"),
  error: (msg: string) => toast(msg, "error", 5000),
  warning: (msg: string) => toast(msg, "warning", 4000),
  info: (msg: string) => toast(msg, "info"),
};

const ICONS = {
  success: <CheckCircle size={14} />,
  error: <XCircle size={14} />,
  warning: <AlertTriangle size={14} />,
  info: <Info size={14} />,
};

const COLORS = {
  success: { bg: "rgba(0,217,126,0.1)", border: "rgba(0,217,126,0.25)", text: "var(--jade)" },
  error:   { bg: "rgba(255,77,109,0.1)",  border: "rgba(255,77,109,0.25)",  text: "var(--rose)" },
  warning: { bg: "rgba(240,165,0,0.1)",   border: "rgba(240,165,0,0.25)",   text: "var(--amber)" },
  info:    { bg: "rgba(56,189,248,0.1)",  border: "rgba(56,189,248,0.25)",  text: "var(--sky)" },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((t: Toast) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id));
    }, t.duration ?? 3000);
  }, []);

  useEffect(() => {
    listeners.add(add);
    return () => { listeners.delete(add); };
  }, [add]);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type];
        return (
          <div key={t.id} className="msg-enter" style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 8,
            background: c.bg, border: `1px solid ${c.border}`,
            color: c.text, maxWidth: 320,
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            pointerEvents: "all",
          }}>
            {ICONS[t.type]}
            <span style={{ flex: 1, fontSize: "0.82rem", fontFamily: "'IBM Plex Sans', sans-serif", color: "var(--text-primary)" }}>
              {t.message}
            </span>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 2 }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
