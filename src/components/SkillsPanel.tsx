"use client";
import { useState } from "react";
import { Zap, ExternalLink, RefreshCw, Loader2, CheckCircle, XCircle, Copy, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { querySkills, type Skill } from "@/lib/hermes";
import { notify } from "./Toast";

const DEFAULT_SKILLS: Skill[] = [
  { name: "web_search",  description: "Search the internet for current information", enabled: true },
  { name: "terminal",    description: "Run shell commands on your computer", enabled: true },
  { name: "file_ops",    description: "Read and write files on your computer", enabled: true },
  { name: "browser",     description: "Browse and interact with websites", enabled: true },
  { name: "memory",      description: "Remember information across sessions", enabled: true },
  { name: "github",      description: "Work with GitHub repos, issues, and PRs", enabled: true },
  { name: "code_runner", description: "Execute Python and JavaScript code", enabled: true },
  { name: "telegram",    description: "Send messages via Telegram bot", enabled: false },
  { name: "discord",     description: "Post to Discord channels via webhook", enabled: false },
  { name: "email",       description: "Read and send emails via Gmail/IMAP", enabled: false },
  { name: "calendar",    description: "Access and create calendar events", enabled: false },
  { name: "slack",       description: "Read and post Slack messages", enabled: false },
];

export default function SkillsPanel() {
  const { settings, status } = useStore();
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [installQuery, setInstallQuery] = useState("");

  async function refresh() {
    if (!status.connected) { notify.error("Connect to Hermes gateway first"); return; }
    setLoading(true);
    try {
      const results = await querySkills(settings);
      if (results.length > 0) {
        setSkills(results);
        notify.success(`${results.length} skills loaded from agent`);
      } else {
        notify.info("Using default skill list");
      }
    } catch {
      notify.error("Failed to refresh skills");
    } finally {
      setLoading(false);
    }
  }

  function copyInstall(skillName: string) {
    const cmd = `hermes skill install ${skillName}`;
    navigator.clipboard.writeText(cmd);
    setCopied(skillName);
    notify.success(`Copied: ${cmd}`);
    setTimeout(() => setCopied(null), 2500);
  }

  const enabled = skills.filter(s => s.enabled !== false);
  const disabled = skills.filter(s => s.enabled === false);

  return (
    <div className="flex flex-col h-full panel-fade" style={{ background: "var(--surface-0)" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
        <div className="flex items-center gap-2">
          <Zap size={16} style={{ color: "var(--amber)" }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Skills</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Tools your agent can use</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://agentskills.io" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", textDecoration: "none" }}>
            <ExternalLink size={11} /> Hub
          </a>
          <button onClick={refresh} disabled={loading || !status.connected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)", cursor: status.connected ? "pointer" : "not-allowed", opacity: status.connected ? 1 : 0.5 }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Active skills */}
        <div className="px-4 pt-4 pb-2">
          <div className="text-xs font-medium mb-3 flex items-center gap-2"
            style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <CheckCircle size={11} style={{ color: "var(--jade)" }} />
            Active ({enabled.length})
          </div>
          <div className="space-y-1.5">
            {enabled.map(skill => (
              <div key={skill.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderLeft: "2px solid var(--jade)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {skill.name}
                    {skill.version && <span className="ml-2 text-xs" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>v{skill.version}</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{skill.description}</div>
                </div>
                <CheckCircle size={14} style={{ color: "var(--jade)", flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Available to install */}
        {disabled.length > 0 && (
          <div className="px-4 pt-3 pb-4">
            <div className="text-xs font-medium mb-3 flex items-center gap-2"
              style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <XCircle size={11} style={{ color: "var(--text-dim)" }} />
              Not installed ({disabled.length})
            </div>
            <div className="space-y-1.5">
              {disabled.map(skill => (
                <div key={skill.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", opacity: 0.7 }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{skill.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{skill.description}</div>
                  </div>
                  <button
                    onClick={() => copyInstall(skill.name)}
                    title={`Copy install command for ${skill.name}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs flex-shrink-0"
                    style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: copied === skill.name ? "var(--jade)" : "var(--text-secondary)", cursor: "pointer" }}>
                    {copied === skill.name ? <Check size={11} /> : <Copy size={11} />}
                    {copied === skill.name ? "Copied!" : "Install"}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded" style={{ background: "rgba(240,165,0,0.05)", border: "1px solid rgba(240,165,0,0.15)" }}>
              <div className="text-xs font-medium mb-1.5" style={{ color: "var(--amber)" }}>To install a skill:</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Click "Install" to copy the command, then paste it in your terminal.
                <br />Example: <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--jade)", background: "var(--surface-0)", padding: "1px 5px", borderRadius: 3 }}>hermes skill install telegram</code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status footer */}
      <div className="px-4 py-2 border-t flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
        <div className="text-xs" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
          {status.connected
            ? `Connected · ${enabled.length} active skills · click Refresh to sync`
            : "Offline · showing default skills · connect gateway to sync"}
        </div>
      </div>
    </div>
  );
}
