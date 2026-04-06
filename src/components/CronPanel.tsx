"use client";
import { useState } from "react";
import { Clock, Plus, RefreshCw, Play, Pause, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";

interface CronJob {
  id: string;
  schedule: string;
  task: string;
  enabled: boolean;
  nextRun?: string;
  lastRun?: string;
}

async function fetchCronJobs(settings: { gatewayUrl: string; apiKey: string; model: string }): Promise<CronJob[]> {
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
        messages: [{
          role: "user",
          content: `List all your configured cron jobs. Return as JSON array: [{"id":"...","schedule":"...","task":"...","enabled":true,"nextRun":"...","lastRun":"..."}]. ONLY JSON, no markdown.`
        }],
        stream: false,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function createCronJob(settings: { gatewayUrl: string; apiKey: string; model: string }, schedule: string, task: string): Promise<boolean> {
  try {
    await fetch(`/api/proxy?path=/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-url": settings.gatewayUrl,
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify({
        model: settings.model || "hermes-agent",
        messages: [{
          role: "user",
          content: `Create a cron job with schedule "${schedule}" to do the following: ${task}. Confirm when done.`
        }],
        stream: false,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export default function CronPanel() {
  const { settings, status } = useStore();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newSchedule, setNewSchedule] = useState("");
  const [newTask, setNewTask] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const result = await fetchCronJobs(settings);
    setJobs(result);
    setLoaded(true);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newSchedule.trim() || !newTask.trim()) return;
    setCreating(true);
    await createCronJob(settings, newSchedule, newTask);
    setNewSchedule("");
    setNewTask("");
    setShowNew(false);
    setCreating(false);
    load();
  }

  const EXAMPLE_SCHEDULES = [
    "every day at 9am",
    "every Monday at 8am",
    "every hour",
    "every 30 minutes",
  ];

  return (
    <div className="flex flex-col h-full min-h-0 panel-fade">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Cron Jobs
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Scheduled automations — uses natural language scheduling
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            <Plus size={12} />
            New Job
          </button>
          <button
            onClick={load}
            disabled={loading || !status.connected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{ background: "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)" }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Load
          </button>
        </div>
      </div>

      {/* New job form */}
      {showNew && (
        <div className="mx-5 mt-3 p-4 rounded-lg flex-shrink-0" style={{ background: "var(--surface-2)", border: "1px solid rgba(240,165,0,0.15)" }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                Schedule (natural language)
              </label>
              <input
                autoFocus
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                placeholder="every day at 9am"
                className="hermes-input w-full px-3 py-2 rounded text-sm"
              />
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {EXAMPLE_SCHEDULES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setNewSchedule(s)}
                    className="text-xs px-2 py-0.5 rounded transition-colors"
                    style={{ background: "var(--surface-3)", color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                Task description
              </label>
              <textarea
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Check the prod server logs and send me a summary via Telegram"
                rows={2}
                className="hermes-input w-full px-3 py-2 rounded text-sm resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button onClick={() => setShowNew(false)} className="text-xs px-3 py-1.5 rounded" style={{ color: "var(--text-secondary)" }}>
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newSchedule.trim() || !newTask.trim()}
              className="text-xs px-3 py-1.5 rounded font-medium"
              style={{ background: "var(--amber)", color: "var(--surface-0)" }}
            >
              {creating ? "Creating…" : "Create Job"}
            </button>
          </div>
        </div>
      )}

      {/* Jobs list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 min-h-0">
        {!loaded ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Clock size={28} style={{ color: "var(--text-dim)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {status.connected ? 'Click "Load" to query scheduled jobs' : "Connect gateway first"}
            </p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Clock size={24} style={{ color: "var(--text-dim)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No cron jobs configured</p>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>Create one above or say "schedule…" in chat</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="px-4 py-3 rounded-lg"
              style={{
                background: "var(--surface-2)",
                border: `1px solid ${job.enabled ? "rgba(0,217,126,0.12)" : "var(--border)"}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        background: "rgba(240,165,0,0.1)",
                        color: "var(--amber)",
                        border: "1px solid rgba(240,165,0,0.2)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {job.schedule}
                    </span>
                    <span
                      className={`badge ${job.enabled ? "badge-connected" : "badge-disconnected"}`}
                    >
                      {job.enabled ? "active" : "paused"}
                    </span>
                  </div>
                  <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {job.task}
                  </p>
                  <div className="flex gap-3 mt-1.5" style={{ color: "var(--text-dim)", fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace" }}>
                    {job.lastRun && <span>last: {job.lastRun}</span>}
                    {job.nextRun && <span>next: {job.nextRun}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    className="p-1.5 rounded transition-colors"
                    style={{ color: job.enabled ? "var(--jade)" : "var(--text-dim)" }}
                    title={job.enabled ? "Pause" : "Resume"}
                  >
                    {job.enabled ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button
                    className="p-1.5 rounded"
                    style={{ color: "var(--text-dim)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--rose)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
