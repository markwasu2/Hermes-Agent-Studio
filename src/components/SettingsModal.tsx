"use client";
import { useState } from "react";
import { X, CheckCircle, XCircle, Eye, EyeOff, Loader2, ExternalLink, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { checkHealth, fetchModels } from "@/lib/hermes";

const PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    logo: "🤖",
    color: "#cc785c",
    pricing: "~$3–15 / 1M tokens",
    keyUrl: "https://console.anthropic.com/settings/keys",
    models: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    logo: "🔀",
    color: "#6366f1",
    pricing: "Many free models available",
    keyUrl: "https://openrouter.ai/keys",
    models: ["anthropic/claude-sonnet-4-5", "openai/gpt-4o", "meta-llama/llama-3.1-8b-instruct"],
  },
  {
    id: "nous",
    name: "Nous Portal",
    logo: "⚡",
    color: "#f0a500",
    pricing: "Optimized for Hermes",
    keyUrl: "https://portal.nousresearch.com",
    models: ["hermes-agent"],
  },
];

export default function SettingsModal() {
  const { settings, updateSettings, setSettingsOpen, setStatus } = useStore();

  const [gatewayUrl, setGatewayUrl] = useState(settings.gatewayUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [streaming, setStreaming] = useState(settings.streamingEnabled);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [models, setModels] = useState<string[]>([settings.model]);

  const detectedProvider = PROVIDERS.find(p =>
    model.includes(p.id) || p.models.some(m => m === model)
  ) ?? PROVIDERS[2];

  async function test() {
    setTesting(true);
    setTestResult(null);
    const s = await checkHealth({ ...settings, gatewayUrl, apiKey });
    setTestResult(s.connected
      ? { ok: true, msg: `Connected${s.latency ? ` · ${s.latency}ms` : ""}` }
      : { ok: false, msg: s.error ?? "Could not connect — is hermes gateway running?" });
    setStatus(s);
    if (s.connected) {
      const ms = await fetchModels({ ...settings, gatewayUrl, apiKey });
      if (ms.length > 0) setModels(ms);
    }
    setTesting(false);
  }

  function save() {
    updateSettings({ gatewayUrl, apiKey, model, systemPrompt, streamingEnabled: streaming });
    setSettingsOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
    >
      <div className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Settings</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Configure your Hermes Agent connection</p>
          </div>
          <button onClick={() => setSettingsOpen(false)} style={{ color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1" style={{ padding: "20px 20px 0" }}>

          {/* Connection status */}
          <div className="rounded-lg p-3 mb-4 flex items-start gap-3"
            style={{ background: "var(--surface-0)", border: "1px solid var(--border)" }}>
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Hermes Gateway</div>
              <div className="text-xs" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7 }}>
                Start with: <span style={{ color: "var(--amber)" }}>hermes gateway</span><br />
                Then click Test Connection below.
              </div>
            </div>
          </div>

          {/* Gateway URL */}
          <div className="mb-4">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Gateway URL</label>
            <input
              value={gatewayUrl}
              onChange={e => setGatewayUrl(e.target.value)}
              placeholder="http://localhost:8642"
              className="hermes-input w-full px-3 py-2.5 rounded text-sm"
            />
          </div>

          {/* API key with show/hide */}
          <div className="mb-4">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Studio API Key
              <span className="ml-2 font-normal" style={{ color: "var(--text-dim)" }}>
                (API_SERVER_KEY in ~/.hermes/.env)
              </span>
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="my-studio-key"
                className="hermes-input w-full px-3 py-2.5 pr-10 rounded text-sm"
              />
              <button onClick={() => setShowKey(!showKey)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)" }}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={test} disabled={testing || !gatewayUrl}
              className="flex items-center gap-2 px-4 py-2 rounded text-xs font-medium"
              style={{ background: "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)", cursor: "pointer" }}>
              {testing ? <Loader2 size={12} className="animate-spin" /> : null}
              Test Connection
            </button>
            {testResult && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: testResult.ok ? "var(--jade)" : "var(--rose)" }}>
                {testResult.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                {testResult.msg}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="divider mb-4" />

          {/* Provider selection */}
          <div className="mb-4">
            <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
              AI Provider
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PROVIDERS.map(p => (
                <div key={p.id}
                  onClick={() => setModel(p.models[0])}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                    background: detectedProvider.id === p.id ? `${p.color}0c` : "var(--surface-2)",
                    border: `1px solid ${detectedProvider.id === p.id ? p.color + "44" : "var(--border)"}`,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  <span style={{ fontSize: 18 }}>{p.logo}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.8rem", fontFamily: "'Space Grotesk', sans-serif" }}>{p.name}</div>
                    <div style={{ color: "var(--text-dim)", fontSize: "0.68rem", fontFamily: "'JetBrains Mono', monospace" }}>{p.pricing}</div>
                  </div>
                  <a href={p.keyUrl} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: "flex", alignItems: "center", gap: 4, color: p.color, fontSize: "0.68rem", textDecoration: "none", flexShrink: 0 }}>
                    Get key <ExternalLink size={10} />
                  </a>
                  {detectedProvider.id === p.id && <Check size={14} style={{ color: p.color, flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="mb-4">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Model</label>
            <div className="relative">
              <select value={model} onChange={e => setModel(e.target.value)}
                className="hermes-input w-full px-3 py-2.5 rounded text-sm" style={{ appearance: "none" }}>
                {[...new Set([...models, ...PROVIDERS.flatMap(p => p.models)])].map(m => (
                  <option key={m} value={m} style={{ background: "var(--surface-2)" }}>{m}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Advanced */}
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs w-full py-1 mb-1"
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Advanced settings
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t mb-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  System Prompt <span style={{ color: "var(--text-dim)" }}>(optional)</span>
                </label>
                <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful expert…" rows={3}
                  className="hermes-input w-full px-3 py-2.5 rounded text-sm resize-none" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Streaming</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>Token-by-token response</div>
                </div>
                <button onClick={() => setStreaming(!streaming)}
                  className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                  style={{ background: streaming ? "var(--amber)" : "var(--surface-4)", border: "none", cursor: "pointer" }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{ background: "white", left: streaming ? "22px" : "2px" }} />
                </button>
              </div>
            </div>
          )}

          <div style={{ height: 20 }} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface-0)" }}>
          <div className="text-xs" style={{ color: "var(--text-dim)" }}>
            Settings saved locally
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 rounded text-xs" style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={save} className="px-5 py-2 rounded text-xs font-semibold"
              style={{ background: "var(--amber)", color: "var(--surface-0)", border: "none", cursor: "pointer" }}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
