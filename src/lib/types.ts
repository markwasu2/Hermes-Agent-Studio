// ── Settings ────────────────────────────────────────────────────────────────
export interface AppSettings {
  gatewayUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  streamingEnabled: boolean;
}

// ── Gateway status ──────────────────────────────────────────────────────────
export interface GatewayStatus {
  connected: boolean;
  latency?: number;
  error?: string;
  version?: string;
}

// ── Chat ────────────────────────────────────────────────────────────────────
export type MessageRole = "user" | "assistant" | "system";

export interface ToolCall {
  name: string;
  status: "running" | "done" | "error";
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  createdAt: number;
  streaming?: boolean;
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  name: string;
  updatedAt: number;
  messageCount: number;
}
