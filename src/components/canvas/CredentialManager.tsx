"use client";
import { useState, useEffect } from "react";
import { X, Plus, Eye, EyeOff, Trash2, Copy, Check, ShieldCheck } from "lucide-react";
import { notify } from "../Toast";

export interface Credential {
  id: string;
  name: string;        // e.g. "My Telegram Bot"
  key: string;         // the actual key/token
  type: string;        // "telegram_bot", "github_token", "serper", "openai", etc.
  createdAt: number;
}

const CRED_TYPES = [
  { id: "telegram_bot", label: "Telegram Bot Token", placeholder: "1234567890:ABC...", icon: "✈️", description: "Get from @BotFather on Telegram" },
  { id: "telegram_chat", label: "Telegram Chat ID", placeholder: "123456789", icon: "💬", description: "Get from @userinfobot on Telegram" },
  { id: "github_token", label: "GitHub Token", placeholder: "ghp_...", icon: "🐙", description: "Settings → Developer settings → Personal access tokens" },
  { id: "serper_key", label: "Serper API Key (Web Search)", placeholder: "your-key", icon: "🔍", description: "serper.dev → Dashboard → API Key" },
  { id: "openai_key", label: "OpenAI API Key", placeholder: "sk-...", icon: "🤖", description: "platform.openai.com → API Keys" },
  { id: "anthropic_key", label: "Anthropic API Key", placeholder: "sk-ant-...", icon: "🧠", description: "console.anthropic.com → API Keys" },
  { id: "openrouter_key", label: "OpenRouter Key", placeholder: "sk-or-...", icon: "🔀", description: "openrouter.ai/keys" },
  { id: "discord_webhook", label: "Discord Webhook URL", placeholder: "https://discord.com/api/webhooks/...", icon: "🎮", description: "Server Settings → Integrations → Webhooks" },
  { id: "custom", label: "Custom / Other", placeholder: "your-value", icon: "🔑", description: "Any other API key or secret" },
];

const STORAGE_KEY = "hermes-credentials";

function loadCreds(): Credential[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCreds(creds: Credential[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
}

interface Props {
  onClose: () => void;
}

export default function CredentialManager({ onClose }: Props) {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState("telegram_bot");
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setCreds(loadCreds());
  }, []);

  function addCred() {
    if (!newName.trim() || !newKey.trim()) return;
    const cred: Credential = {
      id: Math.random().toString(36).slice(2, 10),
      name: newName.trim(),
      key: newKey.trim(),
      type: newType,
      createdAt: Date.now(),
    };
    const updated = [...creds, cred];
    setCreds(updated);
    saveCreds(updated);
    setNewName("");
    setNewKey("");
    setShowAdd(false);
    notify.success(`"${cred.name}" saved`);
  }

  function deleteCred(id: string) {
    const updated = creds.filter(c => c.id !== id);
    setCreds(updated);
    saveCreds(updated);
    notify.info("Credential removed");
  }

  function copyKey(cred: Credential) {
    try { navigator.clipboard.writeText(cred.key); } catch {
      const ta = document.createElement("textarea"); ta.value = cred.key;
      document.body.appendChild(ta); ta.select(); document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(cred.id);
    notify.success(`"${cred.name}" copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  }

  function toggleVisible(id: string) {
    setVisible(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  const typeLabel = (type: string) => CRED_TYPES.find(t => t.id === type)?.label ?? type;
  const typeIcon = (type: string) => CRED_TYPES.find(t => t.id === type)?.icon ?? "🔑";

  const selectedType = CRED_TYPES.find(t => t.id === newType);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 560, maxHeight: "85vh", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <ShieldCheck size={18} style={{ color: "var(--jade)" }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "0.95rem", marginBottom: 2 }}>
              Credential Manager
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
              API keys stored locally on your computer · never sent anywhere
            </p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 7, background: "var(--amber)", border: "none", color: "var(--surface-0)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>
            <Plus size={13} /> Add Key
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-0)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: 5 }}>Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)}
                  className="hermes-input"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: "0.8rem", appearance: "none" }}>
                  {CRED_TYPES.map(t => (
                    <option key={t.id} value={t.id} style={{ background: "var(--surface-2)" }}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: 5 }}>Name (for your reference)</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder={`e.g. "My ${selectedType?.label ?? "Key"}"`}
                  className="hermes-input"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: "0.8rem" }} />
              </div>
            </div>
            {selectedType && (
              <div style={{ fontSize: "0.72rem", color: "var(--sky)", background: "rgba(56,189,248,0.06)", padding: "6px 10px", borderRadius: 5, border: "1px solid rgba(56,189,248,0.15)" }}>
                📋 {selectedType.description}
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: 5 }}>
                {selectedType?.label ?? "Value"}
              </label>
              <input value={newKey} onChange={e => setNewKey(e.target.value)}
                type="password"
                onKeyDown={e => e.key === "Enter" && addCred()}
                placeholder={selectedType?.placeholder ?? "Paste your key..."}
                className="hermes-input"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'JetBrains Mono',monospace" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowAdd(false); setNewName(""); setNewKey(""); }}
                style={{ padding: "7px 14px", borderRadius: 6, background: "none", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.8rem" }}>
                Cancel
              </button>
              <button onClick={addCred} disabled={!newName.trim() || !newKey.trim()}
                style={{ padding: "7px 18px", borderRadius: 6, border: "none", background: newName.trim() && newKey.trim() ? "var(--jade)" : "var(--surface-3)", color: newName.trim() && newKey.trim() ? "var(--surface-0)" : "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>
                Save Key
              </button>
            </div>
          </div>
        )}

        {/* Creds list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {creds.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, gap: 10, color: "var(--text-dim)", textAlign: "center" }}>
              <ShieldCheck size={32} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No credentials saved yet</div>
              <div style={{ fontSize: "0.75rem" }}>Add API keys here — reference them by name in your flows</div>
            </div>
          ) : (
            creds.map(cred => (
              <div key={cred.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{typeIcon(cred.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "'Space Grotesk',sans-serif" }}>{cred.name}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                    {typeLabel(cred.type)} · {visible.has(cred.id) ? cred.key : cred.key.slice(0, 8) + "••••••••••"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => toggleVisible(cred.id)} title={visible.has(cred.id) ? "Hide" : "Show"}
                    style={{ width: 28, height: 28, borderRadius: 5, background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {visible.has(cred.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button onClick={() => copyKey(cred)} title="Copy"
                    style={{ width: 28, height: 28, borderRadius: 5, background: copied === cred.id ? "rgba(0,217,126,0.1)" : "var(--surface-3)", border: `1px solid ${copied === cred.id ? "rgba(0,217,126,0.3)" : "var(--border)"}`, color: copied === cred.id ? "var(--jade)" : "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {copied === cred.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  <button onClick={() => deleteCred(cred.id)} title="Delete"
                    style={{ width: 28, height: 28, borderRadius: 5, background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--rose)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", background: "var(--surface-0)" }}>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace" }}>
            🔒 Keys stored in browser localStorage · not synced to any server
          </div>
        </div>
      </div>
    </div>
  );
}
