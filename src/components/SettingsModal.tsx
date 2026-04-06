"use client";
import { useState, useEffect } from "react";
import { X, CheckCircle, XCircle, Eye, EyeOff, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { checkHealth, fetchModels } from "@/lib/hermes";

export default function SettingsModal() {
  const { settings, updateSettings, setSettingsOpen, setStatus } = useStore();

  const [url, setUrl] = useState(settings.gatewayUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [streaming, setStreaming] = useState(settings.streamingEnabled);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [models, setModels] = useState<string[]>(["hermes-agent"]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    const s = await checkHealth({ ...settings, gatewayUrl: url, apiKey });
    setTestResult(s.connected
      ? { ok: true, msg: `Connected${s.latency ? ` · ${s.latency}ms` : ""}` }
      : { ok: false, msg: s.error ?? "Could not connect" }
    );
    setStatus(s);
    if (s.connected) {
      const ms = await fetchModels({ ...settings, gatewayUrl: url, apiKey });
      setModels(ms.length > 0 ? ms : ["hermes-agent"]);
    }
    setTesting(false);
  }

  function save() {
    updateSettings({ gatewayUrl: url, apiKey, model, systemPrompt, streamingEnabled: streaming });
    setSettingsOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
              Settings
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Configure your Hermes Agent connection</p>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded transition-colors"
            style={{ color: "var(--text-dim)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Setup instructions */}
          <div className="p-3 rounded-lg text-xs" style={{ background: "var(--surface-0)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            <div style={{ color: "var(--amber)", marginBottom: 4, fontWeight: 600 }}># Hermes setup</div>
            <div>API_SERVER_ENABLED=true  # in ~/.hermes/.env</div>
            <div>API_SERVER_KEY=your-key   # set a key</div>
            <div>hermes gateway            # start gateway</div>
          </div>

          {/* Gateway URL */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              Gateway URL
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:8642"
              className="hermes-input w-full px-3 py-2.5 rounded text-sm"
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
              Default: http://localhost:8642 — change for remote/VPS setups
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              API Key <span style={{ color: "var(--text-dim)" }}>(API_SERVER_KEY in ~/.hermes/.env)</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="your-api-key"
                className="hermes-input w-full px-3 py-2.5 pr-10 rounded text-sm"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-dim)" }}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={testing || !url}
              className="flex items-center gap-2 px-4 py-2 rounded text-xs font-medium transition-all"
              style={{
                background: "rgba(240,165,0,0.1)",
                color: "var(--amber)",
                border: "1px solid rgba(240,165,0,0.2)",
              }}
            >
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

          {/* Model */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="hermes-input w-full px-3 py-2.5 rounded text-sm"
              style={{ appearance: "none" }}
            >
              {models.map((m) => (
                <option key={m} value={m} style={{ background: "var(--surface-2)" }}>{m}</option>
              ))}
            </select>
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs w-full py-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Advanced settings
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              {/* System prompt */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  System Prompt <span style={{ color: "var(--text-dim)" }}>(optional — layered on top of Hermes system prompt)</span>
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful Python expert…"
                  rows={3}
                  className="hermes-input w-full px-3 py-2.5 rounded text-sm resize-none"
                />
              </div>

              {/* Streaming toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Streaming</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>Token-by-token streaming via SSE</div>
                </div>
                <button
                  onClick={() => setStreaming(!streaming)}
                  className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                  style={{ background: streaming ? "var(--amber)" : "var(--surface-4)" }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{
                      background: "white",
                      left: streaming ? "22px" : "2px",
                    }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t flex items-center justify-end gap-2" style={{ borderColor: "var(--border)", background: "var(--surface-0)" }}>
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 rounded text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-5 py-2 rounded text-xs font-semibold transition-all"
            style={{ background: "var(--amber)", color: "var(--surface-0)" }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
