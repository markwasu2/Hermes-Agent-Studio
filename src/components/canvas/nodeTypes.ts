// Node categories, types, and their configs for Hermes Canvas

export type NodeCategory = "trigger" | "agent" | "memory" | "knowledge" | "tool" | "permissions" | "output";

export interface NodeField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "toggle" | "number" | "tags";
  placeholder?: string;
  options?: string[];
  default?: string | boolean | number;
}

export interface NodeTypeDef {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  color: string;      // header color
  borderColor: string;
  inputs: string[];   // handle labels
  outputs: string[];
  fields: NodeField[];
}

export const CATEGORY_COLORS: Record<NodeCategory, { bg: string; border: string; text: string; dot: string }> = {
  trigger:     { bg: "#0f1e35", border: "#1e4a8a", text: "#60a5fa", dot: "#3b82f6" },
  agent:       { bg: "#1a1200", border: "#7a5200", text: "#f0a500", dot: "#f0a500" },
  memory:      { bg: "#17103a", border: "#4c1d95", text: "#a78bfa", dot: "#8b5cf6" },
  knowledge:   { bg: "#0a1f12", border: "#14532d", text: "#4ade80", dot: "#22c55e" },
  tool:        { bg: "#1c0f00", border: "#7c2d12", text: "#fb923c", dot: "#f97316" },
  permissions: { bg: "#1a0a0a", border: "#7f1d1d", text: "#f87171", dot: "#ef4444" },
  output:      { bg: "#001a1a", border: "#134e4a", text: "#2dd4bf", dot: "#14b8a6" },
};

export const NODE_LIBRARY: NodeTypeDef[] = [
  // ── TRIGGERS ────────────────────────────────────────────────────────────
  {
    type: "trigger_chat",
    category: "trigger",
    label: "Chat Input",
    description: "User sends a message",
    icon: "💬",
    color: "#3b82f6",
    borderColor: "#1e4a8a",
    inputs: [],
    outputs: ["message"],
    fields: [
      { key: "placeholder", label: "Input placeholder", type: "text", placeholder: "Ask Hermes anything…" },
      { key: "session", label: "Session name", type: "text", placeholder: "my-chat" },
    ],
  },
  {
    type: "trigger_cron",
    category: "trigger",
    label: "Cron Schedule",
    description: "Run on a schedule",
    icon: "⏰",
    color: "#3b82f6",
    borderColor: "#1e4a8a",
    inputs: [],
    outputs: ["tick"],
    fields: [
      { key: "schedule", label: "Schedule", type: "text", placeholder: "every day at 9am" },
      { key: "task", label: "Task prompt", type: "textarea", placeholder: "Check prod logs and send summary…" },
    ],
  },
  {
    type: "trigger_api",
    category: "trigger",
    label: "API Endpoint",
    description: "HTTP POST webhook trigger",
    icon: "🌐",
    color: "#3b82f6",
    borderColor: "#1e4a8a",
    inputs: [],
    outputs: ["payload"],
    fields: [
      { key: "path", label: "Endpoint path", type: "text", placeholder: "/api/trigger" },
      { key: "auth", label: "Require auth", type: "toggle", default: true },
    ],
  },

  // ── AGENT ────────────────────────────────────────────────────────────────
  {
    type: "agent_hermes",
    category: "agent",
    label: "Hermes Agent",
    description: "Core autonomous AI agent",
    icon: "🤖",
    color: "#f0a500",
    borderColor: "#7a5200",
    inputs: ["input", "memory", "tools", "knowledge"],
    outputs: ["response", "actions"],
    fields: [
      { key: "model", label: "Model", type: "select", options: ["hermes-agent", "gpt-4o", "claude-opus-4-5-20251001", "claude-sonnet-4-6"], default: "hermes-agent" },
      { key: "system_prompt", label: "System prompt", type: "textarea", placeholder: "You are a helpful agent…" },
      { key: "max_iterations", label: "Max iterations", type: "number", default: "10" },
      { key: "streaming", label: "Stream response", type: "toggle", default: true },
      { key: "temperature", label: "Temperature (0–1)", type: "number", default: "0.7" },
    ],
  },
  {
    type: "agent_subagent",
    category: "agent",
    label: "Sub-Agent",
    description: "Spawned child agent for parallel work",
    icon: "🔀",
    color: "#f0a500",
    borderColor: "#7a5200",
    inputs: ["task"],
    outputs: ["result"],
    fields: [
      { key: "role", label: "Agent role", type: "text", placeholder: "Research specialist" },
      { key: "model", label: "Model", type: "select", options: ["hermes-agent", "gpt-4o-mini", "claude-haiku-4-5-20251001"], default: "hermes-agent" },
      { key: "timeout", label: "Timeout (seconds)", type: "number", default: "60" },
    ],
  },

  // ── MEMORY ───────────────────────────────────────────────────────────────
  {
    type: "memory_fts5",
    category: "memory",
    label: "FTS5 Memory",
    description: "Local SQLite full-text memory",
    icon: "🧠",
    color: "#8b5cf6",
    borderColor: "#4c1d95",
    inputs: [],
    outputs: ["memory"],
    fields: [
      { key: "path", label: "DB path", type: "text", placeholder: "~/.hermes/memory.db" },
      { key: "max_results", label: "Max recalled", type: "number", default: "20" },
      { key: "auto_save", label: "Auto-save sessions", type: "toggle", default: true },
    ],
  },
  {
    type: "memory_honcho",
    category: "memory",
    label: "Honcho Memory",
    description: "Dialectic user modeling memory",
    icon: "🪬",
    color: "#8b5cf6",
    borderColor: "#4c1d95",
    inputs: [],
    outputs: ["memory"],
    fields: [
      { key: "app_name", label: "App name", type: "text", placeholder: "hermes-studio" },
      { key: "user_id", label: "User ID", type: "text", placeholder: "default" },
    ],
  },
  {
    type: "memory_custom",
    category: "memory",
    label: "Custom Memory",
    description: "Any OpenAI-compatible memory",
    icon: "💾",
    color: "#8b5cf6",
    borderColor: "#4c1d95",
    inputs: [],
    outputs: ["memory"],
    fields: [
      { key: "endpoint", label: "Memory endpoint", type: "text", placeholder: "http://localhost:9000" },
      { key: "api_key", label: "API key", type: "text", placeholder: "sk-…" },
    ],
  },

  // ── KNOWLEDGE ────────────────────────────────────────────────────────────
  {
    type: "knowledge_files",
    category: "knowledge",
    label: "File Upload",
    description: "PDF, DOCX, TXT documents",
    icon: "📁",
    color: "#22c55e",
    borderColor: "#14532d",
    inputs: [],
    outputs: ["knowledge"],
    fields: [
      { key: "path", label: "Folder path", type: "text", placeholder: "~/docs/project" },
      { key: "chunk_size", label: "Chunk size", type: "number", default: "1000" },
      { key: "overlap", label: "Overlap", type: "number", default: "100" },
    ],
  },
  {
    type: "knowledge_web",
    category: "knowledge",
    label: "Web Scraper",
    description: "Scrape and index URLs",
    icon: "🕷️",
    color: "#22c55e",
    borderColor: "#14532d",
    inputs: [],
    outputs: ["knowledge"],
    fields: [
      { key: "urls", label: "URLs (one per line)", type: "textarea", placeholder: "https://docs.example.com" },
      { key: "depth", label: "Crawl depth", type: "number", default: "2" },
      { key: "follow_links", label: "Follow links", type: "toggle", default: false },
    ],
  },
  {
    type: "knowledge_text",
    category: "knowledge",
    label: "Text Knowledge",
    description: "Paste raw text or notes",
    icon: "📝",
    color: "#22c55e",
    borderColor: "#14532d",
    inputs: [],
    outputs: ["knowledge"],
    fields: [
      { key: "content", label: "Content", type: "textarea", placeholder: "Paste your knowledge here…" },
      { key: "title", label: "Title", type: "text", placeholder: "My knowledge base" },
    ],
  },

  // ── TOOLS ────────────────────────────────────────────────────────────────
  {
    type: "tool_terminal",
    category: "tool",
    label: "Terminal",
    description: "Execute shell commands",
    icon: "💻",
    color: "#f97316",
    borderColor: "#7c2d12",
    inputs: [],
    outputs: ["tool"],
    fields: [
      { key: "backend", label: "Backend", type: "select", options: ["local", "docker", "ssh", "modal", "daytona"], default: "local" },
      { key: "allowed_commands", label: "Allowed commands", type: "tags" },
      { key: "working_dir", label: "Working directory", type: "text", placeholder: "~/projects" },
    ],
  },
  {
    type: "tool_web_search",
    category: "tool",
    label: "Web Search",
    description: "Search the internet",
    icon: "🔍",
    color: "#f97316",
    borderColor: "#7c2d12",
    inputs: [],
    outputs: ["tool"],
    fields: [
      { key: "provider", label: "Provider", type: "select", options: ["serper", "brave", "duckduckgo"], default: "serper" },
      { key: "max_results", label: "Max results", type: "number", default: "5" },
    ],
  },
  {
    type: "tool_browser",
    category: "tool",
    label: "Browser",
    description: "Browse & interact with websites",
    icon: "🌐",
    color: "#f97316",
    borderColor: "#7c2d12",
    inputs: [],
    outputs: ["tool"],
    fields: [
      { key: "headless", label: "Headless mode", type: "toggle", default: true },
      { key: "screenshot", label: "Auto screenshot", type: "toggle", default: false },
    ],
  },
  {
    type: "tool_github",
    category: "tool",
    label: "GitHub",
    description: "Repos, issues, PRs",
    icon: "🐙",
    color: "#f97316",
    borderColor: "#7c2d12",
    inputs: [],
    outputs: ["tool"],
    fields: [
      { key: "token", label: "GitHub token", type: "text", placeholder: "ghp_…" },
      { key: "default_repo", label: "Default repo", type: "text", placeholder: "owner/repo" },
    ],
  },
  {
    type: "tool_code",
    category: "tool",
    label: "Code Runner",
    description: "Execute Python / JS code",
    icon: "⚡",
    color: "#f97316",
    borderColor: "#7c2d12",
    inputs: [],
    outputs: ["tool"],
    fields: [
      { key: "language", label: "Language", type: "select", options: ["python", "javascript", "bash"], default: "python" },
      { key: "timeout", label: "Timeout (s)", type: "number", default: "30" },
    ],
  },

  // ── PERMISSIONS ──────────────────────────────────────────────────────────
  {
    type: "permissions_sandbox",
    category: "permissions",
    label: "Sandbox Config",
    description: "Container & filesystem isolation",
    icon: "🔒",
    color: "#ef4444",
    borderColor: "#7f1d1d",
    inputs: [],
    outputs: ["permissions"],
    fields: [
      { key: "sandbox_type", label: "Sandbox", type: "select", options: ["none", "docker", "modal"], default: "docker" },
      { key: "read_only_fs", label: "Read-only filesystem", type: "toggle", default: false },
      { key: "network_access", label: "Network access", type: "toggle", default: true },
      { key: "allowed_paths", label: "Allowed paths", type: "tags" },
    ],
  },
  {
    type: "permissions_tools",
    category: "permissions",
    label: "Tool Policy",
    description: "Which tools require approval",
    icon: "🛡️",
    color: "#ef4444",
    borderColor: "#7f1d1d",
    inputs: [],
    outputs: ["permissions"],
    fields: [
      { key: "exec_approval", label: "Require exec approval", type: "toggle", default: true },
      { key: "file_write_approval", label: "File write approval", type: "toggle", default: false },
      { key: "auto_approve_safe", label: "Auto-approve safe cmds", type: "toggle", default: true },
    ],
  },

  // ── OUTPUTS ──────────────────────────────────────────────────────────────
  {
    type: "output_chat",
    category: "output",
    label: "Chat Response",
    description: "Stream response to chat UI",
    icon: "💬",
    color: "#14b8a6",
    borderColor: "#134e4a",
    inputs: ["response"],
    outputs: [],
    fields: [
      { key: "format", label: "Format", type: "select", options: ["markdown", "plain", "json"], default: "markdown" },
    ],
  },
  {
    type: "output_telegram",
    category: "output",
    label: "Telegram",
    description: "Send to Telegram chat",
    icon: "✈️",
    color: "#14b8a6",
    borderColor: "#134e4a",
    inputs: ["response"],
    outputs: [],
    fields: [
      { key: "bot_token", label: "Bot token", type: "text", placeholder: "1234:ABC…" },
      { key: "chat_id", label: "Chat ID", type: "text", placeholder: "-100…" },
    ],
  },
  {
    type: "output_discord",
    category: "output",
    label: "Discord",
    description: "Post to Discord channel",
    icon: "🎮",
    color: "#14b8a6",
    borderColor: "#134e4a",
    inputs: ["response"],
    outputs: [],
    fields: [
      { key: "webhook", label: "Webhook URL", type: "text", placeholder: "https://discord.com/api/webhooks/…" },
    ],
  },
];

// Group by category for the sidebar
export const LIBRARY_BY_CATEGORY = NODE_LIBRARY.reduce((acc, node) => {
  if (!acc[node.category]) acc[node.category] = [];
  acc[node.category].push(node);
  return acc;
}, {} as Record<NodeCategory, NodeTypeDef[]>);

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  trigger: "Triggers",
  agent: "Agents",
  memory: "Memory",
  knowledge: "Knowledge",
  tool: "Tools",
  permissions: "Permissions",
  output: "Outputs",
};
