export type Role = "user" | "assistant" | "system";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  toolCalls?: ToolCall[];
  timestamp: number;
  streaming?: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage?: string;
  updatedAt: number;
  messageCount: number;
}

export interface SkillFile {
  name: string;
  path: string;
  description?: string;
  size?: number;
}

export interface MemoryEntry {
  id: string;
  content: string;
  createdAt?: string;
  tags?: string[];
}

export interface CronJob {
  id: string;
  schedule: string;
  task: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface GatewayStatus {
  connected: boolean;
  latency?: number;
  model?: string;
  error?: string;
}

export interface AppSettings {
  gatewayUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  streamingEnabled: boolean;
}
