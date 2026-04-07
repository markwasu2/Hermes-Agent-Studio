"use client";
import { useState } from "react";
import { GitBranch, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCanvasStore } from "./canvas/canvasStore";
import { buildFlowFromNLP } from "@/lib/runFlow";
import { notify } from "./Toast";

// Detect if the user's message is asking to build a workflow
export function isWorkflowRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const triggers = [
    "build me a workflow", "create a workflow", "make a workflow",
    "build a flow", "create a flow", "set up a workflow",
    "automate", "schedule a task", "run every", "every morning",
    "every day", "every week", "every night", "send me a",
    "notify me", "remind me", "check my", "monitor my",
  ];
  return triggers.some(t => lower.includes(t));
}

interface Props {
  description: string;
  onDismiss: () => void;
  onBuilt: (flowName: string) => void;
}

export function WorkflowBuilder({ description, onDismiss, onBuilt }: Props) {
  const { settings } = useStore();
  const { createFlow, getActiveFlow } = useCanvasStore();
  const [building, setBuilding] = useState(false);
  const [done, setDone] = useState(false);

  async function build() {
    setBuilding(true);
    try {
      notify.info("Asking Hermes to design this workflow…");
      const yaml = await buildFlowFromNLP(settings, description);
      if (!yaml || yaml.length < 20) {
        notify.error("Couldn't generate workflow — try being more specific");
        return;
      }

      // Extract flow name from YAML comment or description
      const nameMatch = yaml.match(/# Flow: (.+)/) ?? yaml.match(/# .+: "(.+)"/);
      const flowName = nameMatch?.[1]?.trim() ?? description.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, "").trim() ?? "New Flow";

      // Parse YAML to extract key settings and build canvas nodes
      const hasWebSearch = yaml.includes("web_search");
      const hasTelegram = yaml.includes("telegram");
      const hasDiscord = yaml.includes("discord");
      const hasCron = yaml.includes("cron:");
      const hasTerminal = yaml.includes("terminal");
      const hasGithub = yaml.includes("github");
      const modelMatch = yaml.match(/model:\s*["']?([^\n"']+)["']?/);
      const model = modelMatch?.[1]?.trim() ?? "hermes-agent";
      const systemMatch = yaml.match(/system_prompt:\s*\|?\n([\s\S]+?)(?:\n\n|\ntools:|\nmemory:|$)/);
      const systemPrompt = systemMatch?.[1]?.replace(/^ {2}/gm, "").trim() ?? "";
      const scheduleMatch = yaml.match(/schedule:\s*["']?([^\n"']+)["']?/);
      const schedule = scheduleMatch?.[1]?.trim() ?? "every day at 9am";
      const botMatch = yaml.match(/bot_token:\s*["']?([^\n"']+)["']?/);
      const chatMatch = yaml.match(/chat_id:\s*["']?([^\n"']+)["']?/);
      const webhookMatch = yaml.match(/webhook:\s*["']?([^\n"']+)["']?/);

      // Build nodes
      const nodes: any[] = [];
      const edges: any[] = [];
      let x = 60;

      // Trigger node
      const triggerId = "trigger_1";
      if (hasCron) {
        nodes.push({
          id: triggerId, type: "trigger_cron", label: "Cron Schedule",
          category: "trigger", icon: "⏰", color: "#3b82f6", borderColor: "#1e4a8a",
          x, y: 120, width: 220, inputs: [], outputs: ["tick"],
          config: { schedule, task: description.slice(0, 80) }
        });
      } else {
        nodes.push({
          id: triggerId, type: "trigger_chat", label: "Chat Input",
          category: "trigger", icon: "💬", color: "#3b82f6", borderColor: "#1e4a8a",
          x, y: 120, width: 220, inputs: [], outputs: ["message"],
          config: { placeholder: "Ask anything…" }
        });
      }
      x += 280;

      // Tool nodes (above agent)
      const toolIds: string[] = [];
      let toolY = 0;
      if (hasWebSearch) {
        const tid = "tool_search";
        nodes.push({
          id: tid, type: "tool_web_search", label: "Web Search",
          category: "tool", icon: "🔍", color: "#f97316", borderColor: "#7c2d12",
          x, y: toolY + 20, width: 220, inputs: [], outputs: ["tool"],
          config: { provider: "serper", max_results: 10 }
        });
        toolIds.push(tid); toolY += 100;
      }
      if (hasTerminal) {
        const tid = "tool_terminal";
        nodes.push({
          id: tid, type: "tool_terminal", label: "Terminal",
          category: "tool", icon: "💻", color: "#f97316", borderColor: "#7c2d12",
          x, y: toolY + 20, width: 220, inputs: [], outputs: ["tool"],
          config: { backend: "local" }
        });
        toolIds.push(tid); toolY += 100;
      }
      if (hasGithub) {
        const tid = "tool_github";
        nodes.push({
          id: tid, type: "tool_github", label: "GitHub",
          category: "tool", icon: "🐙", color: "#f97316", borderColor: "#7c2d12",
          x, y: toolY + 20, width: 220, inputs: [], outputs: ["tool"],
          config: {}
        });
        toolIds.push(tid); toolY += 100;
      }
      x += 280;

      // Agent node
      const agentId = "agent_1";
      nodes.push({
        id: agentId, type: "agent_hermes", label: "Hermes Agent",
        category: "agent", icon: "🤖", color: "#f0a500", borderColor: "#7a5200",
        x, y: 80, width: 220,
        inputs: ["input", "memory", "tools", "knowledge"],
        outputs: ["response", "actions"],
        config: { model, system_prompt: systemPrompt, max_iterations: 15, streaming: false }
      });
      x += 280;

      // Output node
      if (hasTelegram) {
        nodes.push({
          id: "output_1", type: "output_telegram", label: "Telegram",
          category: "output", icon: "✈️", color: "#14b8a6", borderColor: "#134e4a",
          x, y: 120, width: 220, inputs: ["response"], outputs: [],
          config: {
            bot_token: botMatch?.[1] ?? "YOUR_BOT_TOKEN",
            chat_id: chatMatch?.[1] ?? "YOUR_CHAT_ID"
          }
        });
        edges.push({ id: "e_out", fromNode: agentId, fromHandle: "output:0", toNode: "output_1", toHandle: "input:0" });
      } else if (hasDiscord) {
        nodes.push({
          id: "output_1", type: "output_discord", label: "Discord",
          category: "output", icon: "🎮", color: "#14b8a6", borderColor: "#134e4a",
          x, y: 120, width: 220, inputs: ["response"], outputs: [],
          config: { webhook: webhookMatch?.[1] ?? "YOUR_WEBHOOK" }
        });
        edges.push({ id: "e_out", fromNode: agentId, fromHandle: "output:0", toNode: "output_1", toHandle: "input:0" });
      } else {
        nodes.push({
          id: "output_1", type: "output_chat", label: "Chat Response",
          category: "output", icon: "💬", color: "#14b8a6", borderColor: "#134e4a",
          x, y: 120, width: 220, inputs: ["response"], outputs: [],
          config: { format: "markdown" }
        });
        edges.push({ id: "e_out", fromNode: agentId, fromHandle: "output:0", toNode: "output_1", toHandle: "input:0" });
      }

      // Trigger → agent edge
      edges.push({ id: "e_trigger", fromNode: triggerId, fromHandle: "output:0", toNode: agentId, toHandle: "input:0" });
      // Tool → agent edges
      toolIds.forEach((tid, i) => {
        edges.push({ id: `e_tool_${i}`, fromNode: tid, fromHandle: "output:0", toNode: agentId, toHandle: `input:${i + 2}` });
      });

      // Create the flow
      createFlow(flowName);

      // Wait for store to update then inject nodes
      setTimeout(() => {
        const rawData = localStorage.getItem("hermes-canvas");
        if (!rawData) return;
        const data = JSON.parse(rawData);
        const flows = data?.state?.flows;
        const flow = flows?.find((f: any) => f.name === flowName);
        if (flow) {
          flow.nodes = nodes;
          flow.edges = edges;
          flow.updatedAt = Date.now();
          localStorage.setItem("hermes-canvas", JSON.stringify(data));
          setDone(true);
          notify.success(`"${flowName}" flow created in Canvas!`);
          onBuilt(flowName);
        }
      }, 300);

    } catch (e: unknown) {
      notify.error("Failed to build workflow: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBuilding(false);
    }
  }

  if (done) return null;

  return (
    <div className="msg-enter" style={{
      margin: "8px 0", padding: "12px 14px", borderRadius: 10,
      background: "rgba(240,165,0,0.06)", border: "1px solid rgba(240,165,0,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Sparkles size={14} style={{ color: "var(--amber)" }} />
        <span style={{ color: "var(--amber)", fontWeight: 600, fontSize: "0.82rem", fontFamily: "'Space Grotesk',sans-serif" }}>
          Build this as a Canvas workflow?
        </span>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginBottom: 10, lineHeight: 1.5 }}>
        I can create this as a visual flow in Canvas — configure the nodes, connect them, and let you run it with one click.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={build} disabled={building}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 16px",
            borderRadius: 6, border: "none", cursor: building ? "wait" : "pointer",
            background: "var(--amber)", color: "var(--surface-0)",
            fontSize: "0.8rem", fontWeight: 700,
          }}>
          {building
            ? <><Loader2 size={12} className="animate-spin" /> Building…</>
            : <><GitBranch size={12} /> Build in Canvas <ChevronRight size={12} /></>}
        </button>
        <button onClick={onDismiss}
          style={{ padding: "7px 14px", borderRadius: 6, background: "none", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem" }}>
          Just chat
        </button>
      </div>
    </div>
  );
}
