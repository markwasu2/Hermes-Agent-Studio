"use client";
import { useState } from "react";
import { Plus, Trash2, Play, Download, AlertTriangle } from "lucide-react";
import { useCanvasStore } from "./canvas/canvasStore";
import NodeLibrary from "./canvas/NodeLibrary";
import CanvasEngine from "./canvas/CanvasEngine";
import type { NodeTypeDef } from "./canvas/nodeTypes";
import { formatDistanceToNow } from "date-fns";
import { flowToHermesConfig, validateFlow } from "./canvas/canvasDeploy";
import { notify } from "./Toast";

export default function CanvasPanel() {
  const {
    flows, activeFlowId, setActiveFlow, createFlow, deleteFlow, renameFlow, getActiveFlow,
  } = useCanvasStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deployErrors, setDeployErrors] = useState<string[]>([]);
  const [showDeploy, setShowDeploy] = useState(false);
  const [yamlOutput, setYamlOutput] = useState("");

  const activeFlow = getActiveFlow();

  function handleDragStart(def: NodeTypeDef, e: React.DragEvent) {
    e.dataTransfer.setData("nodeType", JSON.stringify(def));
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleRename(id: string) {
    if (renameValue.trim()) renameFlow(id, renameValue.trim());
    setRenamingId(null);
  }

  function handleDeploy() {
    if (!activeFlow) return;
    const errors = validateFlow(activeFlow);
    if (errors.length > 0) {
      setDeployErrors(errors);
      setShowDeploy(true);
      return;
    }
    const yaml = flowToHermesConfig(activeFlow);
    setYamlOutput(yaml);
    setDeployErrors([]);
    setShowDeploy(true);
  }

  function downloadYaml() {
    if (!yamlOutput || !activeFlow) return;
    const blob = new Blob([yamlOutput], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeFlow.name.toLowerCase().replace(/\s+/g, "-")}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success("Config downloaded! Run with: hermes run --config <file.yaml>");
  }

  function copyYaml() {
    navigator.clipboard.writeText(yamlOutput);
    notify.success("Copied to clipboard");
  }

  if (flows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 panel-fade" style={{ background: "var(--surface-0)" }}>
        <div style={{ fontSize: 56, opacity: 0.15 }}>⬡</div>
        <div>
          <h2 className="text-lg font-semibold text-center mb-1" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Hermes Canvas
          </h2>
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
            Visually build agent flows — export as real Hermes config
          </p>
        </div>
        <button onClick={() => createFlow("My First Flow")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: "var(--amber)", color: "var(--surface-0)", border: "none", cursor: "pointer" }}>
          <Plus size={15} /> Create your first flow
        </button>
        <div style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", textAlign: "center", lineHeight: 1.8 }}>
          Build → Configure → Export YAML → Run with Hermes
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: "var(--surface-0)" }}>
      {/* Tabs + toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0 border-b"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          {flows.map(flow => (
            <div key={flow.id} className="flex items-center gap-0.5 flex-shrink-0">
              {renamingId === flow.id ? (
                <input autoFocus value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(flow.id)}
                  onKeyDown={e => { if (e.key === "Enter") handleRename(flow.id); if (e.key === "Escape") setRenamingId(null); }}
                  className="hermes-input px-2 py-1 text-xs rounded" style={{ width: 110 }} />
              ) : (
                <button onClick={() => setActiveFlow(flow.id)}
                  onDoubleClick={() => { setRenamingId(flow.id); setRenameValue(flow.name); }}
                  className="px-3 py-1 rounded text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: activeFlowId === flow.id ? "rgba(240,165,0,0.1)" : "var(--surface-2)",
                    color: activeFlowId === flow.id ? "var(--amber)" : "var(--text-secondary)",
                    border: `1px solid ${activeFlowId === flow.id ? "rgba(240,165,0,0.25)" : "var(--border)"}`,
                    cursor: "pointer",
                  }}>
                  {flow.name}
                </button>
              )}
              {flows.length > 1 && (
                <button onClick={() => deleteFlow(flow.id)}
                  style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "2px 3px", borderRadius: 3, opacity: 0 }}
                  className="hover:opacity-100"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.color = "var(--rose)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0"; (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => createFlow(`Flow ${flows.length + 1}`)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, border: "1px dashed var(--border)", background: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.75rem", flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--amber)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
            <Plus size={11} /> New
          </button>
        </div>

        {/* Deploy button */}
        <button onClick={handleDeploy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold flex-shrink-0"
          style={{ background: "var(--jade)", color: "var(--surface-0)", border: "none", cursor: "pointer" }}>
          <Play size={11} /> Deploy
        </button>
      </div>

      {/* Main canvas area */}
      {activeFlow ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <NodeLibrary onDragStart={handleDragStart} />
          <CanvasEngine />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center" style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
          Select a flow above
        </div>
      )}

      {/* Status bar */}
      {activeFlow && (
        <div className="flex items-center justify-between px-4 py-1 flex-shrink-0 border-t"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}>
          <div style={{ color: "var(--text-dim)", fontSize: "0.62rem", fontFamily: "'JetBrains Mono',monospace" }}>
            {activeFlow.nodes.length} nodes · {activeFlow.edges.length} edges · double-click tab to rename
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: "0.62rem", fontFamily: "'JetBrains Mono',monospace" }}>
            {formatDistanceToNow(activeFlow.updatedAt, { addSuffix: true })}
          </div>
        </div>
      )}

      {/* Deploy modal */}
      {showDeploy && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeploy(false); }}
        >
          <div style={{ width: "100%", maxWidth: 560, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>
                  {deployErrors.length > 0 ? "⚠ Flow needs attention" : "✓ Deploy Config"}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: 2 }}>
                  {deployErrors.length > 0 ? "Fix these issues before deploying" : "Download and run with: hermes run --config <file>"}
                </p>
              </div>
              <button onClick={() => setShowDeploy(false)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {deployErrors.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {deployErrors.map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(255,77,109,0.07)", border: "1px solid rgba(255,77,109,0.2)" }}>
                      <AlertTriangle size={14} style={{ color: "var(--rose)", flexShrink: 0 }} />
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{e}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <pre style={{ background: "var(--surface-0)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", fontSize: "0.72rem", fontFamily: "'JetBrains Mono',monospace", color: "var(--jade)", overflow: "auto", maxHeight: 340, lineHeight: 1.7, margin: 0 }}>
                    {yamlOutput}
                  </pre>
                  <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 600, marginBottom: 6 }}>How to use this config:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {[
                        { n: "1", text: "Download the YAML file", cmd: null },
                        { n: "2", text: "Save it anywhere, e.g.", cmd: "~/my-flow.yaml" },
                        { n: "3", text: "Run it with Hermes:", cmd: "hermes run --config ~/my-flow.yaml" },
                      ].map(step => (
                        <div key={step.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--amber)", color: "var(--surface-0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0 }}>{step.n}</span>
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{step.text}</span>
                          {step.cmd && <code style={{ color: "var(--amber)", fontSize: "0.72rem", fontFamily: "'JetBrains Mono',monospace", background: "var(--surface-0)", padding: "2px 8px", borderRadius: 4 }}>{step.cmd}</code>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {!deployErrors.length && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, background: "var(--surface-0)" }}>
                <button onClick={copyYaml} style={{ flex: 1, padding: "9px", borderRadius: 7, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                  Copy YAML
                </button>
                <button onClick={downloadYaml} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 7, background: "var(--amber)", border: "none", color: "var(--surface-0)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700 }}>
                  <Download size={13} /> Download Config
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
