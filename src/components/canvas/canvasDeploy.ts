import type { CanvasFlow, CanvasNode, CanvasEdge } from "./canvasStore";

// ── Generate a real Hermes agent config from a canvas flow ──────────────────
export function flowToHermesConfig(flow: CanvasFlow): string {
  const nodes = flow.nodes;
  const edges = flow.edges;

  const agentNode = nodes.find(n => n.type === "agent_hermes" || n.type === "agent_subagent");
  const triggerNode = nodes.find(n => n.category === "trigger");
  const memoryNodes = nodes.filter(n => n.category === "memory");
  const toolNodes = nodes.filter(n => n.category === "tool");
  const permNodes = nodes.filter(n => n.category === "permissions");
  const outputNodes = nodes.filter(n => n.category === "output");
  const knowledgeNodes = nodes.filter(n => n.category === "knowledge");

  const lines: string[] = [];

  lines.push(`# Hermes Agent Configuration`);
  lines.push(`# Generated from Canvas flow: "${flow.name}"`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Paste this into ~/.hermes/config.yaml`);
  lines.push(``);

  // Model
  const model = agentNode?.config?.model ?? "hermes-agent";
  lines.push(`model: "${model}"`);
  lines.push(``);

  // System prompt
  if (agentNode?.config?.system_prompt) {
    lines.push(`system_prompt: |`);
    String(agentNode.config.system_prompt).split("\n").forEach(l => lines.push(`  ${l}`));
    lines.push(``);
  }

  // Memory
  if (memoryNodes.length > 0) {
    lines.push(`memory:`);
    memoryNodes.forEach(mn => {
      if (mn.type === "memory_honcho") {
        lines.push(`  provider: honcho`);
        if (mn.config?.app_name) lines.push(`  app_name: "${mn.config.app_name}"`);
        if (mn.config?.user_id) lines.push(`  user_id: "${mn.config.user_id}"`);
      } else if (mn.type === "memory_fts5") {
        lines.push(`  provider: fts5`);
        if (mn.config?.path) lines.push(`  db_path: "${mn.config.path}"`);
        if (mn.config?.max_results) lines.push(`  max_results: ${mn.config.max_results}`);
      } else if (mn.type === "memory_custom") {
        lines.push(`  provider: custom`);
        if (mn.config?.endpoint) lines.push(`  endpoint: "${mn.config.endpoint}"`);
      }
    });
    lines.push(``);
  }

  // Tools
  if (toolNodes.length > 0) {
    lines.push(`tools:`);
    toolNodes.forEach(tn => {
      switch (tn.type) {
        case "tool_terminal":
          lines.push(`  - name: terminal`);
          if (tn.config?.backend) lines.push(`    backend: ${tn.config.backend}`);
          if (tn.config?.working_dir) lines.push(`    working_dir: "${tn.config.working_dir}"`);
          break;
        case "tool_web_search":
          lines.push(`  - name: web_search`);
          if (tn.config?.provider) lines.push(`    provider: ${tn.config.provider}`);
          if (tn.config?.max_results) lines.push(`    max_results: ${tn.config.max_results}`);
          break;
        case "tool_browser":
          lines.push(`  - name: browser`);
          lines.push(`    headless: ${tn.config?.headless ?? true}`);
          break;
        case "tool_github":
          lines.push(`  - name: github`);
          if (tn.config?.default_repo) lines.push(`    default_repo: "${tn.config.default_repo}"`);
          break;
        case "tool_code":
          lines.push(`  - name: code_runner`);
          if (tn.config?.language) lines.push(`    language: ${tn.config.language}`);
          break;
      }
    });
    lines.push(``);
  }

  // Permissions
  const permNode = permNodes.find(n => n.type === "permissions_sandbox");
  const toolPolicyNode = permNodes.find(n => n.type === "permissions_tools");
  if (permNode || toolPolicyNode) {
    lines.push(`permissions:`);
    if (permNode?.config?.sandbox_type && permNode.config.sandbox_type !== "none") {
      lines.push(`  sandbox:`);
      lines.push(`    type: ${permNode.config.sandbox_type}`);
      lines.push(`    read_only: ${permNode.config.read_only_fs ?? false}`);
      lines.push(`    network: ${permNode.config.network_access ?? true}`);
    }
    if (toolPolicyNode) {
      lines.push(`  exec_approval: ${toolPolicyNode.config?.exec_approval ?? true}`);
      lines.push(`  auto_approve_safe: ${toolPolicyNode.config?.auto_approve_safe ?? true}`);
    }
    lines.push(``);
  }

  // Gateway / trigger
  if (triggerNode) {
    lines.push(`gateway:`);
    switch (triggerNode.type) {
      case "trigger_cron":
        lines.push(`  cron:`);
        lines.push(`    - schedule: "${triggerNode.config?.schedule ?? "every day at 9am"}"`);
        if (triggerNode.config?.task) lines.push(`      task: "${triggerNode.config.task}"`);
        break;
      case "trigger_api":
        lines.push(`  api_server:`);
        lines.push(`    enabled: true`);
        if (triggerNode.config?.path) lines.push(`    path: "${triggerNode.config.path}"`);
        break;
      default:
        lines.push(`  # Chat input — use: hermes chat`);
    }
    lines.push(``);
  }

  // Knowledge
  if (knowledgeNodes.length > 0) {
    lines.push(`knowledge:`);
    knowledgeNodes.forEach(kn => {
      switch (kn.type) {
        case "knowledge_files":
          lines.push(`  - type: files`);
          if (kn.config?.path) lines.push(`    path: "${kn.config.path}"`);
          if (kn.config?.chunk_size) lines.push(`    chunk_size: ${kn.config.chunk_size}`);
          break;
        case "knowledge_web":
          lines.push(`  - type: web`);
          if (kn.config?.urls) {
            lines.push(`    urls:`);
            String(kn.config.urls).split("\n").filter(Boolean).forEach(u => lines.push(`      - "${u.trim()}"`));
          }
          break;
        case "knowledge_text":
          lines.push(`  - type: text`);
          if (kn.config?.title) lines.push(`    title: "${kn.config.title}"`);
          break;
      }
    });
    lines.push(``);
  }

  // Output delivery
  const telegramNode = outputNodes.find(n => n.type === "output_telegram");
  const discordNode = outputNodes.find(n => n.type === "output_discord");
  if (telegramNode || discordNode) {
    lines.push(`delivery:`);
    if (telegramNode) {
      lines.push(`  telegram:`);
      if (telegramNode.config?.bot_token) lines.push(`    bot_token: "${telegramNode.config.bot_token}"`);
      if (telegramNode.config?.chat_id) lines.push(`    chat_id: "${telegramNode.config.chat_id}"`);
    }
    if (discordNode) {
      lines.push(`  discord:`);
      if (discordNode.config?.webhook) lines.push(`    webhook: "${discordNode.config.webhook}"`);
    }
    lines.push(``);
  }

  // Max iterations
  if (agentNode?.config?.max_iterations) {
    lines.push(`max_iterations: ${agentNode.config.max_iterations}`);
  }

  lines.push(`# Run with: hermes run --config <this-file.yaml>`);

  return lines.join("\n");
}

// ── Validate a flow before deploying ────────────────────────────────────────
export function validateFlow(flow: CanvasFlow): string[] {
  const errors: string[] = [];
  if (flow.nodes.length === 0) errors.push("Add at least one node to your flow");
  if (!flow.nodes.some(n => n.category === "agent")) errors.push("Add a Hermes Agent node");
  if (!flow.nodes.some(n => n.category === "trigger")) errors.push("Add a trigger node (Chat Input, Cron, or API)");
  if (flow.edges.length === 0 && flow.nodes.length > 1) errors.push("Connect your nodes with edges");
  return errors;
}
