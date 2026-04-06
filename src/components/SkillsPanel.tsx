"use client";
import { useState, useEffect } from "react";
import { Zap, RefreshCw, Search, ExternalLink } from "lucide-react";
import { useStore } from "@/lib/store";

interface SkillEntry {
  name: string;
  description?: string;
  source?: string;
}

// Query hermes for installed skills via chat
async function fetchSkillsViaChat(settings: { gatewayUrl: string; apiKey: string; model: string }): Promise<SkillEntry[]> {
  try {
    const res = await fetch(`/api/proxy?path=/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-url": settings.gatewayUrl,
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify({
        model: settings.model || "hermes-agent",
        messages: [
          {
            role: "user",
            content:
              "List all installed skills with their names and one-line descriptions. Format as JSON array: [{\"name\": \"...\", \"description\": \"...\"}]. Return ONLY valid JSON, no other text.",
          },
        ],
        stream: false,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "[]";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

const BUNDLED_SKILLS: SkillEntry[] = [
  { name: "web_search", description: "Search the web and extract information", source: "bundled" },
  { name: "terminal", description: "Execute shell commands in the configured backend", source: "bundled" },
  { name: "file_ops", description: "Read, write, and manage files", source: "bundled" },
  { name: "memory", description: "Store and retrieve persistent memories", source: "bundled" },
  { name: "github", description: "Interact with GitHub repositories, issues, and PRs", source: "bundled" },
  { name: "python_run", description: "Execute Python code in an isolated environment", source: "bundled" },
  { name: "image_gen", description: "Generate images via configured providers", source: "bundled" },
  { name: "browser", description: "Browse websites, take screenshots, extract content", source: "bundled" },
  { name: "cron_manage", description: "Create and manage scheduled automation jobs", source: "bundled" },
  { name: "subagent", description: "Spawn isolated sub-agents for parallel workstreams", source: "bundled" },
  { name: "voice", description: "Text-to-speech and speech-to-text capabilities", source: "bundled" },
  { name: "mlops", description: "MLOps workflows: training, evaluation, deployment", source: "bundled" },
];

export default function SkillsPanel() {
  const { settings, status } = useStore();
  const [skills, setSkills] = useState<SkillEntry[]>(BUNDLED_SKILLS);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState(false);

  async function loadSkills() {
    setLoading(true);
    const live = await fetchSkillsViaChat(settings);
    setSkills(live.length > 0 ? live : BUNDLED_SKILLS);
    setFetched(true);
    setLoading(false);
  }

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full min-h-0 panel-fade">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Skills
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {fetched ? `${skills.length} skills loaded from agent` : "Bundled skills shown — refresh to query agent"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://agentskills.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded transition-all"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            <ExternalLink size={11} />
            Hub
          </a>
          <button
            onClick={loadSkills}
            disabled={loading || !status.connected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{ background: "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)" }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dim)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills…"
            className="hermes-input w-full pl-8 pr-3 py-2 rounded text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {filtered.map((skill) => (
            <div
              key={skill.name}
              className="px-3 py-3 rounded-lg transition-colors"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(240,165,0,0.1)", color: "var(--amber)" }}
                >
                  <Zap size={12} />
                </div>
                <div className="min-w-0">
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {skill.name}
                  </div>
                  {skill.description && (
                    <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {skill.description}
                    </div>
                  )}
                  {skill.source && (
                    <span
                      className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded"
                      style={{ background: "var(--surface-3)", color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem" }}
                    >
                      {skill.source}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Zap size={24} style={{ color: "var(--text-dim)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No skills match "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
