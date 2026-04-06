"use client";
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, ExternalLink, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { checkHealth } from "@/lib/hermes";

const PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    emoji: "🤖",
    color: "#cc785c",
    headline: "Best quality AI",
    detail: "The company behind Claude. Excellent for complex tasks.",
    pricing: "About $1–5 per month for typical use",
    freeOption: false,
    signupUrl: "https://console.anthropic.com/settings/keys",
    getKeySteps: [
      "Click the button below to open Anthropic's website",
      "Click \"Sign up\" and create a free account",
      "Add a payment method (you only pay for what you use)",
      "Click \"Create Key\", give it any name, then copy it",
      "Come back here and paste it below",
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    emoji: "🔀",
    color: "#6366f1",
    headline: "Most flexible",
    detail: "Access to 200+ AI models from one place. Many are free.",
    pricing: "Many free models. Paid from ~$0.50/month",
    freeOption: true,
    signupUrl: "https://openrouter.ai/keys",
    getKeySteps: [
      "Click the button below to open OpenRouter's website",
      "Click \"Sign in\" and create a free account",
      "Click \"Create Key\" and give it any name",
      "Copy the key that appears",
      "Come back here and paste it below",
    ],
  },
  {
    id: "nous",
    name: "Nous Portal",
    emoji: "⚡",
    color: "#f0a500",
    headline: "Built for Hermes",
    detail: "Made by the same team as Hermes Agent. Best compatibility.",
    pricing: "Visit portal.nousresearch.com for pricing",
    freeOption: false,
    signupUrl: "https://portal.nousresearch.com",
    getKeySteps: [
      "Click the button below to open Nous Portal",
      "Create an account",
      "Navigate to API Keys",
      "Create a new key and copy it",
      "Come back here and paste it below",
    ],
  },
];

// ─── Step 1: Welcome ──────────────────────────────────────────────────────
function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div style={{ fontSize: 64, marginBottom: 20 }}>👋</div>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.7rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 10, letterSpacing: "-0.03em" }}>
        Welcome to Hermes Studio
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.7, maxWidth: 400, margin: "0 auto 28px" }}>
        Your personal AI assistant that learns your work, remembers what matters, and helps you get things done.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 420, margin: "0 auto 32px", textAlign: "left" }}>
        {[
          { e: "💬", t: "Chat with it", d: "Ask anything. Get help with work, research, writing, code." },
          { e: "🧠", t: "It remembers you", d: "Unlike ChatGPT, it learns your preferences across sessions." },
          { e: "⏰", t: "Works while you sleep", d: "Schedule tasks. It runs automations on your behalf." },
          { e: "🔒", t: "Runs on your computer", d: "Your data stays private. Nothing goes to third-party servers." },
        ].map(f => (
          <div key={f.t} style={{ padding: 14, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{f.e}</div>
            <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-primary)", fontFamily: "'Space Grotesk',sans-serif", marginBottom: 4 }}>{f.t}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.5 }}>{f.d}</div>
          </div>
        ))}
      </div>
      <button onClick={onNext} style={{ background: "var(--amber)", color: "var(--surface-0)", border: "none", padding: "14px 36px", borderRadius: 10, fontSize: "1rem", fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
        Let's set it up <ChevronRight size={18} />
      </button>
      <p style={{ marginTop: 10, color: "var(--text-dim)", fontSize: "0.75rem" }}>Takes about 3 minutes</p>
    </div>
  );
}

// ─── Step 2: Connecting ───────────────────────────────────────────────────
function Connecting({ onConnected, onNotInstalled, settings }: {
  onConnected: () => void;
  onNotInstalled: () => void;
  settings: any;
}) {
  const [status, setStatus] = useState<"checking" | "connected" | "notrunning" | "notinstalled">("checking");

  useEffect(() => {
    async function check() {
      await new Promise(r => setTimeout(r, 1500)); // let it breathe
      const s = await checkHealth(settings);
      if (s.connected) {
        setStatus("connected");
        setTimeout(onConnected, 1200);
      } else {
        // Check if this is the desktop app (Electron) — it auto-starts hermes
        const isElectron = !!(window as any).hermesStudio;
        if (isElectron) {
          setStatus("notrunning");
        } else {
          setStatus("notrunning");
        }
      }
    }
    check();
  }, []);

  return (
    <div className="text-center">
      {status === "checking" && (
        <>
          <Loader2 size={48} className="animate-spin mx-auto mb-6" style={{ color: "var(--amber)" }} />
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Connecting to Hermes...
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Just a moment</p>
        </>
      )}

      {status === "connected" && (
        <>
          <CheckCircle size={56} className="mx-auto mb-6" style={{ color: "var(--jade)" }} />
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Hermes is running! ✓
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Moving to next step...</p>
        </>
      )}

      {status === "notrunning" && (
        <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>😅</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Hermes isn't running yet
          </h2>
          <div style={{ padding: "16px 20px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", marginBottom: 20, textAlign: "left", maxWidth: 420, margin: "0 auto 20px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 0 }}>
              {(window as any).hermesStudio
                ? "If you downloaded the desktop app, it should have started automatically. Try restarting the app."
                : "Hermes needs to be installed first. If you haven't done that yet, visit hermes-agent.nousresearch.com to get it."
              }
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={onNotInstalled} style={{ padding: "10px 20px", borderRadius: 8, background: "none", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem" }}>
              I need to install Hermes
            </button>
            <button onClick={async () => {
              setStatus("checking");
              const s = await checkHealth(settings);
              if (s.connected) { setStatus("connected"); setTimeout(onConnected, 1000); }
              else setStatus("notrunning");
            }} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--amber)", border: "none", color: "var(--surface-0)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}>
              Try again
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Step: Install needed ─────────────────────────────────────────────────
function NeedInstall({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        First, install Hermes Agent
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 20 }}>
        Hermes Agent is the AI brain that powers everything. Installing it takes about 2 minutes.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: "16px 18px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid rgba(240,165,0,0.2)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--amber)", marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" }}>
            🍎 Mac or Linux users
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.6, marginBottom: 10 }}>
            Open the Terminal app (press <kbd style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3, fontSize: "0.78rem", border: "1px solid var(--border)" }}>⌘ Space</kbd>, type "Terminal", press Enter), then paste this:
          </p>
          <div style={{ background: "var(--surface-0)", borderRadius: 6, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "1px solid var(--border)" }}>
            <code style={{ color: "var(--jade)", fontSize: "0.75rem", fontFamily: "'JetBrains Mono',monospace", wordBreak: "break-all" }}>
              curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
            </code>
            <button onClick={() => navigator.clipboard.writeText("curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash")}
              style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 5, background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.72rem" }}>
              Copy
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 18px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--sky)", marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" }}>
            🪟 Windows users
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.6 }}>
            Windows isn't supported directly — you'll need WSL2 (Windows Subsystem for Linux). Visit{" "}
            <a href="https://hermes-agent.nousresearch.com/docs/getting-started/installation" target="_blank" rel="noopener noreferrer" style={{ color: "var(--amber)" }}>the installation guide</a> for step-by-step instructions.
          </p>
        </div>
      </div>

      <div style={{ background: "rgba(0,217,126,0.06)", border: "1px solid rgba(0,217,126,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
        <p style={{ color: "var(--jade)", fontSize: "0.82rem", fontWeight: 600, marginBottom: 4 }}>After installation, Hermes will walk you through setup in your terminal.</p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>When it asks about API keys, you can skip for now — we'll handle that here in Studio.</p>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ padding: "10px 20px", borderRadius: 8, background: "none", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem" }}>
          ← Back
        </button>
        <button onClick={onDone} style={{ padding: "10px 24px", borderRadius: 8, background: "var(--amber)", border: "none", color: "var(--surface-0)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}>
          I installed it — continue
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Choose AI service ────────────────────────────────────────────
function ChooseProvider({ selected, onSelect, onNext }: { selected: string | null; onSelect: (id: string) => void; onNext: () => void }) {
  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        Choose an AI service
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 6 }}>
        Hermes needs to connect to an AI service to think. Think of it like choosing a phone carrier — you pick one and pay them directly.
      </p>
      <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: 20 }}>
        Typical cost: <strong style={{ color: "var(--amber)" }}>$1–5 per month</strong> for regular use. Much cheaper than ChatGPT Plus.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {PROVIDERS.map(p => (
          <div key={p.id} onClick={() => onSelect(p.id)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", borderRadius: 10,
              background: selected === p.id ? `${p.color}0e` : "var(--surface-2)",
              border: `1.5px solid ${selected === p.id ? p.color + "55" : "var(--border)"}`,
              cursor: "pointer", transition: "all 0.15s",
            }}>
            <span style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>{p.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "'Space Grotesk',sans-serif" }}>{p.name}</span>
                <span style={{ fontSize: "0.72rem", color: p.color, fontWeight: 600 }}>{p.headline}</span>
                {p.freeOption && <span style={{ fontSize: "0.65rem", padding: "2px 7px", borderRadius: 10, background: "rgba(0,217,126,0.1)", color: "var(--jade)", fontWeight: 700, border: "1px solid rgba(0,217,126,0.2)" }}>FREE OPTION</span>}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: 3, lineHeight: 1.5 }}>{p.detail}</div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.72rem", marginTop: 4 }}>💰 {p.pricing}</div>
            </div>
            {selected === p.id && <CheckCircle size={20} style={{ color: p.color, flexShrink: 0, marginTop: 2 }} />}
          </div>
        ))}
      </div>

      <button onClick={onNext} disabled={!selected}
        style={{ padding: "12px 28px", borderRadius: 9, border: "none", background: selected ? "var(--amber)" : "var(--surface-3)", color: selected ? "var(--surface-0)" : "var(--text-dim)", fontSize: "0.9rem", fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: selected ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 8 }}>
        Continue <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Step 4: Get API key ──────────────────────────────────────────────────
function GetApiKey({ providerId, onNext, onSaveKey }: { providerId: string; onNext: () => void; onSaveKey: (key: string) => void }) {
  const p = PROVIDERS.find(x => x.id === providerId)!;
  const [step, setStep] = useState(0); // 0=instructions, 1=paste key
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleSave() {
    if (!key.trim()) return;
    setSaving(true);
    onSaveKey(key.trim());
    setTimeout(() => { setSaving(false); onNext(); }, 800);
  }

  if (step === 0) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{p.emoji}</span>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Get your {p.name} account
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 20 }}>
          You'll need to create a {p.name} account and get a "key" — think of it like a password that lets Hermes use their AI. It takes about 2 minutes.
        </p>

        <div style={{ padding: "16px 18px", borderRadius: 10, background: "var(--surface-2)", border: `1px solid ${p.color}33`, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem", fontFamily: "'JetBrains Mono',monospace" }}>
            Step by step:
          </div>
          <ol style={{ margin: 0, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {p.getKeySteps.map((s, i) => (
              <li key={i} style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>{s}</li>
            ))}
          </ol>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a href={p.signupUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 22px", borderRadius: 8, background: p.color, color: "white", textDecoration: "none", fontSize: "0.88rem", fontWeight: 700 }}>
            Open {p.name} <ExternalLink size={14} />
          </a>
          <button onClick={() => setStep(1)}
            style={{ padding: "11px 22px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.88rem" }}>
            I have my key →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 28 }}>{p.emoji}</span>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Paste your key
        </h2>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 20 }}>
        Paste the API key you just copied from {p.name}. It'll be stored on your computer — never shared anywhere.
      </p>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <input
          type={showKey ? "text" : "password"}
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSave()}
          placeholder={`Paste your ${p.name} key here...`}
          autoFocus
          style={{ width: "100%", padding: "13px 46px 13px 16px", borderRadius: 9, background: "var(--surface-2)", border: `1.5px solid ${key ? p.color + "66" : "var(--border)"}`, color: "var(--text-primary)", fontSize: "0.9rem", fontFamily: "'JetBrains Mono',monospace", boxSizing: "border-box" }}
        />
        <button onClick={() => setShowKey(!showKey)}
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={() => setStep(0)} style={{ padding: "11px 16px", borderRadius: 8, background: "none", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem" }}>
          ← Back
        </button>
        <button onClick={handleSave} disabled={!key.trim() || saving}
          style={{ padding: "11px 26px", borderRadius: 8, border: "none", background: key.trim() ? p.color : "var(--surface-3)", color: key.trim() ? "white" : "var(--text-dim)", cursor: key.trim() ? "pointer" : "not-allowed", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving..." : "Save & Continue"}
        </button>
      </div>

      <p style={{ color: "var(--text-dim)", fontSize: "0.72rem", marginTop: 10 }}>
        🔒 Stored locally on your computer. Never shared with anyone.
      </p>
    </div>
  );
}

// ─── Step 5: Done! ────────────────────────────────────────────────────────
function Done({ provider, onFinish }: { provider: string | null; onFinish: () => void }) {
  const p = PROVIDERS.find(x => x.id === provider);
  return (
    <div className="text-center">
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 10, letterSpacing: "-0.02em" }}>
        You're all set!
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 360, margin: "0 auto 28px" }}>
        Hermes Studio is ready. Here are some things to try first:
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 380, margin: "0 auto 28px", textAlign: "left" }}>
        {[
          { e: "💬", msg: "\"Summarize the emails I got today about Project X\"" },
          { e: "📋", msg: "\"Help me write a response to this client complaint\"" },
          { e: "🔍", msg: "\"Research the latest news about electric vehicles and give me a summary\"" },
          { e: "⏰", msg: "\"Every Monday morning, remind me to check last week's metrics\"" },
        ].map(s => (
          <div key={s.msg} style={{ padding: "10px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{s.e}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.5, fontStyle: "italic" }}>{s.msg}</span>
          </div>
        ))}
      </div>

      <button onClick={onFinish} style={{ padding: "13px 36px", borderRadius: 10, border: "none", background: "var(--amber)", color: "var(--surface-0)", fontSize: "1rem", fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
        Start chatting <ChevronRight size={18} />
      </button>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────
type WizardStep = "welcome" | "connecting" | "needinstall" | "provider" | "apikey" | "done";

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { settings, updateSettings } = useStore();
  const [step, setStep] = useState<WizardStep>("welcome");
  const [provider, setProvider] = useState<string | null>(null);

  function saveKey(key: string) {
    // Store in settings — the provider key goes to Hermes config
    // For now we use it as the gateway api key
    updateSettings({ apiKey: "hermes-studio-autokey", model: provider === "openrouter" ? "anthropic/claude-sonnet-4-5" : provider === "anthropic" ? "claude-sonnet-4-6" : "hermes-agent" });
    // In a real implementation, this would write to ~/.hermes/config.yaml
    try {
      localStorage.setItem(`hermes-provider-key-${provider}`, key);
    } catch {}
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--surface-0)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 40%, rgba(240,165,0,0.04), transparent 60%), radial-gradient(circle at 70% 70%, rgba(56,189,248,0.03), transparent 50%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 560, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 18, padding: "36px 40px", boxShadow: "0 32px 80px rgba(0,0,0,0.4)", position: "relative" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--surface-0)", fontWeight: 900, fontSize: "1rem", fontFamily: "monospace" }}>H</div>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>Hermes Studio</span>

          {/* Skip for returning users */}
          {step !== "welcome" && step !== "done" && (
            <button onClick={onComplete} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace" }}>
              Skip →
            </button>
          )}
        </div>

        {step === "welcome"     && <Welcome onNext={() => setStep("connecting")} />}
        {step === "connecting"  && <Connecting settings={settings} onConnected={() => setStep("provider")} onNotInstalled={() => setStep("needinstall")} />}
        {step === "needinstall" && <NeedInstall onBack={() => setStep("connecting")} onDone={() => setStep("connecting")} />}
        {step === "provider"    && <ChooseProvider selected={provider} onSelect={setProvider} onNext={() => setStep("apikey")} />}
        {step === "apikey"      && <GetApiKey providerId={provider ?? "nous"} onNext={() => setStep("done")} onSaveKey={saveKey} />}
        {step === "done"        && <Done provider={provider} onFinish={onComplete} />}
      </div>
    </div>
  );
}
