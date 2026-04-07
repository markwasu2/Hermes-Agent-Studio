"use client";
import { useState } from "react";
import { X, Download, Play, Star, Clock, Zap, Mail, Github, MessageSquare, Sun, FileText, Bell, Search, ChevronRight } from "lucide-react";
import { useCanvasStore } from "./canvasStore";
import { notify } from "../Toast";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  difficulty: "easy" | "medium" | "advanced";
  estimatedTime: string;
  tags: string[];
  popular?: boolean;
  nodes: any[];
  edges: any[];
}

const TEMPLATES: Template[] = [
  {
    id: "daily-briefing",
    name: "Daily News Briefing",
    description: "Every morning at 9am, searches for top news headlines and sends a bullet-point summary to Telegram.",
    icon: "📰",
    category: "Daily Automations",
    difficulty: "easy",
    estimatedTime: "5 min setup",
    tags: ["telegram", "web search", "daily"],
    popular: true,
    nodes: [
      { id: "t1", type: "trigger_cron", label: "Cron Schedule", category: "trigger", icon: "⏰", color: "#3b82f6", borderColor: "#1e4a8a", x: 60, y: 120, width: 220, inputs: [], outputs: ["tick"], config: { schedule: "every day at 9am" } },
      { id: "s1", type: "tool_web_search", label: "Web Search", category: "tool", icon: "🔍", color: "#f97316", borderColor: "#7c2d12", x: 340, y: 220, width: 220, inputs: [], outputs: ["tool"], config: { provider: "serper", max_results: 10 } },
      { id: "a1", type: "agent_hermes", label: "Hermes Agent", category: "agent", icon: "🤖", color: "#f0a500", borderColor: "#7a5200", x: 340, y: 80, width: 220, inputs: ["input", "memory", "tools", "knowledge"], outputs: ["response", "actions"], config: { model: "hermes-agent", system_prompt: "You are a daily briefing assistant. Search for the top 5 news headlines from the last 24 hours. Summarize each in 1-2 sentences using bullet points. End with a 'Today's highlight' sentence.", max_iterations: 10 } },
      { id: "o1", type: "output_telegram", label: "Telegram", category: "output", icon: "✈️", color: "#14b8a6", borderColor: "#134e4a", x: 620, y: 120, width: 220, inputs: ["response"], outputs: [], config: { bot_token: "YOUR_BOT_TOKEN", chat_id: "YOUR_CHAT_ID" } },
    ],
    edges: [
      { id: "e1", fromNode: "t1", fromHandle: "output:0", toNode: "a1", toHandle: "input:0" },
      { id: "e2", fromNode: "s1", fromHandle: "output:0", toNode: "a1", toHandle: "input:2" },
      { id: "e3", fromNode: "a1", fromHandle: "output:0", toNode: "o1", toHandle: "input:0" },
    ],
  },
  {
    id: "github-pr-reviewer",
    name: "GitHub PR Reviewer",
    description: "When triggered, reviews open pull requests in your repo, summarizes changes, flags issues, and posts a review.",
    icon: "🐙",
    category: "Developer",
    difficulty: "medium",
    estimatedTime: "10 min setup",
    tags: ["github", "code review", "webhook"],
    popular: true,
    nodes: [
      { id: "t1", type: "trigger_api", label: "API Endpoint", category: "trigger", icon: "🌐", color: "#3b82f6", borderColor: "#1e4a8a", x: 60, y: 120, width: 220, inputs: [], outputs: ["payload"], config: { path: "/api/review-prs", auth: true } },
      { id: "g1", type: "tool_github", label: "GitHub", category: "tool", icon: "🐙", color: "#f97316", borderColor: "#7c2d12", x: 340, y: 220, width: 220, inputs: [], outputs: ["tool"], config: { default_repo: "owner/repo" } },
      { id: "a1", type: "agent_hermes", label: "PR Reviewer Agent", category: "agent", icon: "🤖", color: "#f0a500", borderColor: "#7a5200", x: 340, y: 80, width: 220, inputs: ["input", "memory", "tools", "knowledge"], outputs: ["response", "actions"], config: { model: "hermes-agent", system_prompt: "You are an expert code reviewer. Fetch open PRs from the repository, review each one for: code quality, potential bugs, breaking changes, and missing tests. Write a concise review for each PR.", max_iterations: 20 } },
      { id: "o1", type: "output_telegram", label: "Telegram", category: "output", icon: "✈️", color: "#14b8a6", borderColor: "#134e4a", x: 620, y: 120, width: 220, inputs: ["response"], outputs: [], config: { bot_token: "YOUR_BOT_TOKEN", chat_id: "YOUR_CHAT_ID" } },
    ],
    edges: [
      { id: "e1", fromNode: "t1", fromHandle: "output:0", toNode: "a1", toHandle: "input:0" },
      { id: "e2", fromNode: "g1", fromHandle: "output:0", toNode: "a1", toHandle: "input:2" },
      { id: "e3", fromNode: "a1", fromHandle: "output:0", toNode: "o1", toHandle: "input:0" },
    ],
  },
  {
    id: "email-summarizer",
    name: "Email Digest",
    description: "Every evening at 6pm, summarizes your important emails from the day and sends the digest to Telegram.",
    icon: "📧",
    category: "Daily Automations",
    difficulty: "medium",
    estimatedTime: "10 min setup",
    tags: ["email", "daily", "telegram"],
    nodes: [
      { id: "t1", type: "trigger_cron", label: "Cron Schedule", category: "trigger", icon: "⏰", color: "#3b82f6", borderColor: "#1e4a8a", x: 60, y: 120, width: 220, inputs: [], outputs: ["tick"], config: { schedule: "every weekday at 6pm" } },
      { id: "a1", type: "agent_hermes", label: "Email Digest Agent", category: "agent", icon: "🤖", color: "#f0a500", borderColor: "#7a5200", x: 340, y: 80, width: 220, inputs: ["input", "memory", "tools", "knowledge"], outputs: ["response", "actions"], config: { model: "hermes-agent", system_prompt: "You are an email assistant. Check the user's emails from today. Identify the 5 most important ones (prioritize: urgent requests, action items, meetings, key decisions). Summarize each in one sentence. Group by category: Action Required, FYI, Meetings.", max_iterations: 15 } },
      { id: "o1", type: "output_telegram", label: "Telegram", category: "output", icon: "✈️", color: "#14b8a6", borderColor: "#134e4a", x: 620, y: 120, width: 220, inputs: ["response"], outputs: [], config: { bot_token: "YOUR_BOT_TOKEN", chat_id: "YOUR_CHAT_ID" } },
    ],
    edges: [
      { id: "e1", fromNode: "t1", fromHandle: "output:0", toNode: "a1", toHandle: "input:0" },
      { id: "e2", fromNode: "a1", fromHandle: "output:0", toNode: "o1", toHandle: "input:0" },
    ],
  },
  {
    id: "weather-outfit",
    name: "Morning Weather + Outfit",
    description: "Every morning at 7:30am, checks the weather and suggests what to wear today. Sent to Telegram.",
    icon: "🌤️",
    category: "Daily Automations",
    difficulty: "easy",
    estimatedTime: "3 min setup",
    tags: ["weather", "daily", "telegram"],
    nodes: [
      { id: "t1", type: "trigger_cron", label: "Cron Schedule", category: "trigger", icon: "⏰", color: "#3b82f6", borderColor: "#1e4a8a", x: 60, y: 120, width: 220, inputs: [], outputs: ["tick"], config: { schedule: "every day at 7:30am" } },
      { id: "s1", type: "tool_web_search", label: "Web Search", category: "tool", icon: "🔍", color: "#f97316", borderColor: "#7c2d12", x: 340, y: 220, width: 220, inputs: [], outputs: ["tool"], config: { provider: "serper", max_results: 3 } },
      { id: "a1", type: "agent_hermes", label: "Weather Agent", category: "agent", icon: "🤖", color: "#f0a500", borderColor: "#7a5200", x: 340, y: 80, width: 220, inputs: ["input", "memory", "tools", "knowledge"], outputs: ["response", "actions"], config: { model: "hermes-agent", system_prompt: "Check today's weather forecast. Give a brief weather summary (temp, conditions, precipitation chance). Then suggest a specific outfit: what to wear for the weather. Keep it practical and concise. Use emojis.", max_iterations: 5 } },
      { id: "o1", type: "output_telegram", label: "Telegram", category: "output", icon: "✈️", color: "#14b8a6", borderColor: "#134e4a", x: 620, y: 120, width: 220, inputs: ["response"], outputs: [], config: { bot_token: "YOUR_BOT_TOKEN", chat_id: "YOUR_CHAT_ID" } },
    ],
    edges: [
      { id: "e1", fromNode: "t1", fromHandle: "output:0", toNode: "a1", toHandle: "input:0" },
      { id: "e2", fromNode: "s1", fromHandle: "output:0", toNode: "a1", toHandle: "input:2" },
      { id: "e3", fromNode: "a1", fromHandle: "output:0", toNode: "o1", toHandle: "input:0" },
    ],
  },
  {
    id: "weekly-report",
    name: "Weekly Work Summary",
    description: "Every Friday at 5pm, reviews completed tasks, summarizes the week's accomplishments, and prepares a brief report.",
    icon: "📊",
    category: "Productivity",
    difficulty: "medium",
    estimatedTime: "8 min setup",
    tags: ["weekly", "productivity", "report"],
    popular: true,
    nodes: [
      { id: "t1", type: "trigger_cron", label: "Cron Schedule", category: "trigger", icon: "⏰", color: "#3b82f6", borderColor: "#1e4a8a", x: 60, y: 120, width: 220, inputs: [], outputs: ["tick"], config: { schedule: "every Friday at 5pm" } },
      { id: "m1", type: "memory_fts5", label: "Memory", category: "memory", icon: "🧠", color: "#8b5cf6", borderColor: "#4c1d95", x: 340, y: 220, width: 220, inputs: [], outputs: ["memory"], config: { max_results: 50 } },
      { id: "a1", type: "agent_hermes", label: "Report Agent", category: "agent", icon: "🤖", color: "#f0a500", borderColor: "#7a5200", x: 340, y: 80, width: 220, inputs: ["input", "memory", "tools", "knowledge"], outputs: ["response", "actions"], config: { model: "hermes-agent", system_prompt: "Review this week's activities from memory. Write a concise weekly report with: 1) Key accomplishments 2) Challenges encountered 3) Next week's priorities. Keep it to one paragraph each section.", max_iterations: 10 } },
      { id: "o1", type: "output_telegram", label: "Telegram", category: "output", icon: "✈️", color: "#14b8a6", borderColor: "#134e4a", x: 620, y: 120, width: 220, inputs: ["response"], outputs: [], config: { bot_token: "YOUR_BOT_TOKEN", chat_id: "YOUR_CHAT_ID" } },
    ],
    edges: [
      { id: "e1", fromNode: "t1", fromHandle: "output:0", toNode: "a1", toHandle: "input:0" },
      { id: "e2", fromNode: "m1", fromHandle: "output:0", toNode: "a1", toHandle: "input:1" },
      { id: "e3", fromNode: "a1", fromHandle: "output:0", toNode: "o1", toHandle: "input:0" },
    ],
  },
  {
    id: "hacker-news",
    name: "Hacker News Digest",
    description: "Every evening, fetches the top 10 Hacker News stories, summarizes the most relevant ones for developers.",
    icon: "🔶",
    category: "Developer",
    difficulty: "easy",
    estimatedTime: "3 min setup",
    tags: ["hacker news", "tech", "daily"],
    nodes: [
      { id: "t1", type: "trigger_cron", label: "Cron Schedule", category: "trigger", icon: "⏰", color: "#3b82f6", borderColor: "#1e4a8a", x: 60, y: 120, width: 220, inputs: [], outputs: ["tick"], config: { schedule: "every day at 7pm" } },
      { id: "s1", type: "tool_web_search", label: "Web Search", category: "tool", icon: "🔍", color: "#f97316", borderColor: "#7c2d12", x: 340, y: 220, width: 220, inputs: [], outputs: ["tool"], config: { provider: "serper", max_results: 10 } },
      { id: "a1", type: "agent_hermes", label: "HN Digest Agent", category: "agent", icon: "🤖", color: "#f0a500", borderColor: "#7a5200", x: 340, y: 80, width: 220, inputs: ["input", "memory", "tools", "knowledge"], outputs: ["response", "actions"], config: { model: "hermes-agent", system_prompt: "Search for today's top Hacker News stories. Pick the 5 most interesting ones for a software developer audience. For each: write a 2-sentence summary and explain why it matters. Format with emoji bullets.", max_iterations: 8 } },
      { id: "o1", type: "output_telegram", label: "Telegram", category: "output", icon: "✈️", color: "#14b8a6", borderColor: "#134e4a", x: 620, y: 120, width: 220, inputs: ["response"], outputs: [], config: { bot_token: "YOUR_BOT_TOKEN", chat_id: "YOUR_CHAT_ID" } },
    ],
    edges: [
      { id: "e1", fromNode: "t1", fromHandle: "output:0", toNode: "a1", toHandle: "input:0" },
      { id: "e2", fromNode: "s1", fromHandle: "output:0", toNode: "a1", toHandle: "input:2" },
      { id: "e3", fromNode: "a1", fromHandle: "output:0", toNode: "o1", toHandle: "input:0" },
    ],
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes Summarizer",
    description: "Paste meeting transcript into chat — agent extracts action items, decisions, and key points into a structured summary.",
    icon: "📝",
    category: "Productivity",
    difficulty: "easy",
    estimatedTime: "2 min setup",
    tags: ["meetings", "notes", "chat"],
    nodes: [
      { id: "t1", type: "trigger_chat", label: "Chat Input", category: "trigger", icon: "💬", color: "#3b82f6", borderColor: "#1e4a8a", x: 60, y: 120, width: 220, inputs: [], outputs: ["message"], config: { placeholder: "Paste your meeting transcript here..." } },
      { id: "a1", type: "agent_hermes", label: "Notes Agent", category: "agent", icon: "🤖", color: "#f0a500", borderColor: "#7a5200", x: 340, y: 80, width: 220, inputs: ["input", "memory", "tools", "knowledge"], outputs: ["response", "actions"], config: { model: "hermes-agent", system_prompt: "You are a meeting notes assistant. When given a transcript or rough notes, extract and format: 1) Key Decisions Made 2) Action Items (with owner if mentioned) 3) Key Discussion Points 4) Next Steps. Be concise and clear.", max_iterations: 5 } },
      { id: "o1", type: "output_chat", label: "Chat Response", category: "output", icon: "💬", color: "#14b8a6", borderColor: "#134e4a", x: 620, y: 120, width: 220, inputs: ["response"], outputs: [], config: { format: "markdown" } },
    ],
    edges: [
      { id: "e1", fromNode: "t1", fromHandle: "output:0", toNode: "a1", toHandle: "input:0" },
      { id: "e2", fromNode: "a1", fromHandle: "output:0", toNode: "o1", toHandle: "input:0" },
    ],
  },
  {
    id: "stock-alert",
    name: "Market Alert",
    description: "Every weekday morning, checks stock prices for your watchlist and sends alerts if any move more than 3%.",
    icon: "📈",
    category: "Finance",
    difficulty: "medium",
    estimatedTime: "8 min setup",
    tags: ["stocks", "finance", "daily"],
    nodes: [
      { id: "t1", type: "trigger_cron", label: "Cron Schedule", category: "trigger", icon: "⏰", color: "#3b82f6", borderColor: "#1e4a8a", x: 60, y: 120, width: 220, inputs: [], outputs: ["tick"], config: { schedule: "every weekday at 9am" } },
      { id: "s1", type: "tool_web_search", label: "Web Search", category: "tool", icon: "🔍", color: "#f97316", borderColor: "#7c2d12", x: 340, y: 220, width: 220, inputs: [], outputs: ["tool"], config: { provider: "serper", max_results: 5 } },
      { id: "a1", type: "agent_hermes", label: "Market Agent", category: "agent", icon: "🤖", color: "#f0a500", borderColor: "#7a5200", x: 340, y: 80, width: 220, inputs: ["input", "memory", "tools", "knowledge"], outputs: ["response", "actions"], config: { model: "hermes-agent", system_prompt: "Check current stock prices for: AAPL, GOOGL, MSFT, NVDA, TSLA. For any stock that moved more than 2% since yesterday, explain why briefly. Show current price and % change for all. Flag any major market news.", max_iterations: 8 } },
      { id: "o1", type: "output_telegram", label: "Telegram", category: "output", icon: "✈️", color: "#14b8a6", borderColor: "#134e4a", x: 620, y: 120, width: 220, inputs: ["response"], outputs: [], config: { bot_token: "YOUR_BOT_TOKEN", chat_id: "YOUR_CHAT_ID" } },
    ],
    edges: [
      { id: "e1", fromNode: "t1", fromHandle: "output:0", toNode: "a1", toHandle: "input:0" },
      { id: "e2", fromNode: "s1", fromHandle: "output:0", toNode: "a1", toHandle: "input:2" },
      { id: "e3", fromNode: "a1", fromHandle: "output:0", toNode: "o1", toHandle: "input:0" },
    ],
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(TEMPLATES.map(t => t.category)))];
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "var(--jade)",
  medium: "var(--amber)",
  advanced: "var(--rose)",
};

interface Props {
  onClose: () => void;
}

export default function FlowTemplates({ onClose }: Props) {
  const [selectedCat, setSelectedCat] = useState("All");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState<string | null>(null);
  const { createFlow } = useCanvasStore();

  const filtered = TEMPLATES.filter(t => {
    const matchCat = selectedCat === "All" || t.category === selectedCat;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.tags.some(tag => tag.includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  function importTemplate(template: Template) {
    setImporting(template.id);

    setTimeout(() => {
      // Create a new flow
      createFlow(template.name);

      // Inject nodes after store updates
      setTimeout(() => {
        const raw = localStorage.getItem("hermes-canvas");
        if (!raw) { setImporting(null); return; }
        const data = JSON.parse(raw);
        const flows = data?.state?.flows;
        const flow = flows?.find((f: any) => f.name === template.name);
        if (flow) {
          flow.nodes = template.nodes.map(n => ({ ...n }));
          flow.edges = template.edges.map(e => ({ ...e }));
          flow.updatedAt = Date.now();
          localStorage.setItem("hermes-canvas", JSON.stringify(data));
          notify.success(`"${template.name}" added to Canvas! Configure the nodes and hit Deploy.`);
        }
        setImporting(null);
        onClose();
      }, 400);
    }, 300);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 860, maxHeight: "88vh", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16, background: "var(--surface-1)" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: 3 }}>
              Flow Templates
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
              Pre-built workflows — pick one, fill your credentials, run
            </p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="hermes-input"
            style={{ width: 200, padding: "7px 12px", borderRadius: 7, fontSize: "0.82rem" }}
          />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 6, padding: "10px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface-1)", overflowX: "auto" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCat(cat)}
              style={{
                padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.15s",
                background: selectedCat === cat ? "var(--amber)" : "var(--surface-2)",
                color: selectedCat === cat ? "var(--surface-0)" : "var(--text-secondary)",
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {filtered.map(template => (
              <div key={template.id}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(240,165,0,0.4)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>

                {/* Card header */}
                <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>{template.icon}</span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {template.popular && (
                        <span style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 3, background: "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                          ★ POPULAR
                        </span>
                      )}
                      <span style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 3, background: "rgba(0,0,0,0.2)", color: DIFFICULTY_COLOR[template.difficulty], fontFamily: "'JetBrains Mono',monospace" }}>
                        {template.difficulty}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)", fontFamily: "'Space Grotesk',sans-serif", marginBottom: 5 }}>
                    {template.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {template.description}
                  </div>
                </div>

                {/* Card footer */}
                <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {template.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{ fontSize: "0.62rem", padding: "1px 6px", borderRadius: 3, background: "var(--surface-3)", color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => importTemplate(template)}
                    disabled={importing === template.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: "none",
                      background: importing === template.id ? "var(--surface-3)" : "var(--amber)",
                      color: importing === template.id ? "var(--text-dim)" : "var(--surface-0)",
                      cursor: importing === template.id ? "wait" : "pointer", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                    }}>
                    {importing === template.id ? "Adding…" : <><Download size={11} /> Use</>}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-dim)" }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.4 }}>🔍</div>
              <div style={{ fontSize: "0.88rem" }}>No templates match "{search}"</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 24px", borderTop: "1px solid var(--border)", background: "var(--surface-0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-dim)", fontSize: "0.72rem", fontFamily: "'JetBrains Mono',monospace" }}>
            {filtered.length} templates · More coming soon
          </span>
          <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
            After importing: configure node credentials → click Deploy → Run Now
          </span>
        </div>
      </div>
    </div>
  );
}
