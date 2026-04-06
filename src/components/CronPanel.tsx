"use client";
import { useState } from "react";
import { Clock, Plus, Loader2, RefreshCw, Play, Trash2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { queryCronJobs, createCronJob, deleteCronJob, runCronJobNow, type CronJob } from "@/lib/hermes";
import { notify } from "./Toast";
import { formatDistanceToNow } from "date-fns";

const EXAMPLES = [
  { schedule: "every weekday at 8am", task: "Check my emails, summarize anything urgent, send summary to Telegram" },
  { schedule: "every Friday at 5pm", task: "Write a summary of what I accomplished this week" },
  { schedule: "every day at 9am", task: "Check the weather and tell me what to wear" },
  { schedule: "every Monday at 7am", task: "Pull this week's calendar events and remind me of any conflicts" },
];

export default function CronPanel() {
  const { settings, status } = useStore();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [task, setTask] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadJobs() {
    if (!status.connected) { notify.error("Connect to Hermes gateway first"); return; }
    setLoading(true);
    try {
      const results = await queryCronJobs(settings);
      setJobs(results);
      setLoaded(true);
      if (results.length === 0) notify.info("No scheduled jobs yet — create one below");
    } catch {
      notify.error("Failed to load scheduled jobs");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!schedule.trim() || !task.trim()) return;
    if (!status.connected) { notify.error("Connect to Hermes gateway first"); return; }
    setCreating(true);
    try {
      const ok = await createCronJob(settings, schedule.trim(), task.trim());
      if (ok) {
        notify.success("Scheduled job created!");
        const newJob: CronJob = {
          id: Math.random().toString(36).slice(2, 8),
          name: task.slice(0, 50),
          schedule: schedule.trim(),
          task: task.trim(),
          active: true,
          nextRun: "Calculating...",
        };
        setJobs(prev => [newJob, ...prev]);
        setSchedule("");
        setTask("");
        setShowNew(false);
        setLoaded(true);
      } else {
        notify.error("Failed to create job — check gateway connection");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(job: CronJob) {
    setDeletingId(job.id);
    try {
      await deleteCronJob(settings, job.id);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      notify.success(`"${job.name}" deleted`);
    } catch {
      notify.error("Failed to delete job");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRunNow(job: CronJob) {
    if (!status.connected) { notify.error("Connect to Hermes gateway first"); return; }
    setRunningId(job.id);
    try {
      const ok = await runCronJobNow(settings, job.id);
      if (ok) {
        notify.success(`Running "${job.name}" now…`);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, lastRun: new Date().toISOString() } : j));
      } else {
        notify.error("Failed to trigger job — try from terminal: hermes run-job " + job.id);
      }
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="flex flex-col h-full panel-fade" style={{ background: "var(--surface-0)" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
        <div className="flex items-center gap-2">
          <Clock size={16} style={{ color: "var(--amber)" }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
              Cron Jobs
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Scheduled automations — set it and forget it
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadJobs} disabled={loading || !status.connected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: status.connected ? "pointer" : "not-allowed", opacity: status.connected ? 1 : 0.5 }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loaded ? "Refresh" : "Load Jobs"}
          </button>
          <button onClick={() => setShowNew(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: showNew ? "rgba(240,165,0,0.15)" : "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.25)", cursor: "pointer" }}>
            <Plus size={12} /> New Job
          </button>
        </div>
      </div>

      {/* New job form */}
      {showNew && (
        <div className="px-4 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                When should it run?
              </label>
              <input
                value={schedule}
                onChange={e => setSchedule(e.target.value)}
                placeholder="every weekday at 8am  /  every Friday at 5pm  /  every day at noon"
                className="hermes-input w-full px-3 py-2 rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                What should it do?
              </label>
              <textarea
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder="Check my emails, find anything urgent, summarize and send to Telegram"
                rows={2}
                className="hermes-input w-full px-3 py-2 rounded text-sm resize-none"
              />
            </div>

            {/* Quick examples */}
            <div>
              <div className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>Quick examples:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {EXAMPLES.map((ex, i) => (
                  <button key={i} onClick={() => { setSchedule(ex.schedule); setTask(ex.task); }}
                    className="text-left px-2.5 py-2 rounded text-xs transition-all"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>
                    <div className="font-medium" style={{ color: "var(--text-primary)" }}>{ex.schedule}</div>
                    <div className="truncate mt-0.5" style={{ color: "var(--text-dim)" }}>{ex.task.slice(0, 45)}…</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowNew(false); setSchedule(""); setTask(""); }}
                className="px-3 py-2 rounded text-xs"
                style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleCreate}
                disabled={!schedule.trim() || !task.trim() || creating || !status.connected}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold"
                style={{
                  background: schedule.trim() && task.trim() && status.connected ? "var(--amber)" : "var(--surface-3)",
                  color: schedule.trim() && task.trim() && status.connected ? "var(--surface-0)" : "var(--text-dim)",
                  border: "none", cursor: schedule.trim() && task.trim() && status.connected ? "pointer" : "not-allowed"
                }}>
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                {creating ? "Creating…" : "Schedule It"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jobs list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {!status.connected && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center" style={{ color: "var(--text-dim)" }}>
            <Clock size={32} style={{ opacity: 0.3 }} />
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Connect to Hermes gateway to manage scheduled jobs</div>
            <div className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Run: hermes gateway</div>
          </div>
        )}

        {status.connected && !loaded && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center" style={{ color: "var(--text-dim)" }}>
            <Clock size={32} style={{ opacity: 0.3 }} />
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Click "Load Jobs" to see your scheduled tasks</div>
            <div className="text-xs">Or click "New Job" to create your first automation</div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-32 gap-2" style={{ color: "var(--text-dim)" }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading scheduled jobs…</span>
          </div>
        )}

        {loaded && !loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center" style={{ color: "var(--text-dim)" }}>
            <Clock size={28} style={{ opacity: 0.3 }} />
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>No scheduled jobs yet</div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs"
              style={{ background: "rgba(240,165,0,0.1)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.2)", cursor: "pointer" }}>
              <Plus size={11} /> Create your first automation
            </button>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="space-y-2">
            {jobs.map(job => (
              <div key={job.id}
                className="rounded-lg overflow-hidden"
                style={{ background: "var(--surface-2)", border: `1px solid ${job.active ? "var(--border)" : "rgba(255,77,109,0.2)"}` }}>
                {/* Job header */}
                <div className="flex items-start gap-3 px-3 py-2.5">
                  <div className="mt-0.5">
                    {job.active
                      ? <CheckCircle size={14} style={{ color: "var(--jade)" }} />
                      : <XCircle size={14} style={{ color: "var(--rose)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {job.name || job.task.slice(0, 50)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "rgba(240,165,0,0.08)", color: "var(--amber)", border: "1px solid rgba(240,165,0,0.15)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {job.schedule}
                      </span>
                    </div>
                    <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {job.task}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      {job.lastRun && (
                        <span className="text-xs" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
                          Last: {formatDistanceToNow(new Date(job.lastRun), { addSuffix: true })}
                        </span>
                      )}
                      {job.nextRun && (
                        <span className="text-xs" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
                          Next: {job.nextRun === "Calculating..." ? job.nextRun : formatDistanceToNow(new Date(job.nextRun), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleRunNow(job)}
                      disabled={runningId === job.id || !status.connected}
                      title="Run now"
                      className="p-1.5 rounded transition-all"
                      style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--jade)", cursor: "pointer" }}>
                      {runningId === job.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    </button>
                    <button onClick={() => handleDelete(job)}
                      disabled={deletingId === job.id}
                      title="Delete job"
                      className="p-1.5 rounded transition-all"
                      style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--rose)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
                      {deletingId === job.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
        <div className="flex items-center justify-between">
          <div className="text-xs" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
            {jobs.length > 0 ? `${jobs.filter(j => j.active).length} active · ${jobs.length} total` : "No jobs scheduled"}
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle size={10} style={{ color: "var(--text-dim)" }} />
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>Hermes must be running for jobs to execute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
