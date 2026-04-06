"use client";
import { useState, useCallback } from "react";
import { Plus, Trash2, Play, Save, ZoomIn, ZoomOut, Maximize2, MoreHorizontal } from "lucide-react";
import { useCanvasStore } from "./canvas/canvasStore";
import NodeLibrary from "./canvas/NodeLibrary";
import CanvasEngine from "./canvas/CanvasEngine";
import NodeConfigPanel from "./canvas/NodeConfigPanel";
import type { NodeTypeDef } from "./canvas/nodeTypes";
import { formatDistanceToNow } from "date-fns";

function uid() { return Math.random().toString(36).slice(2, 8); }

export default function CanvasPanel() {
  const {
    flows, activeFlowId, setActiveFlow, createFlow, deleteFlow, renameFlow,
    selectedNodeId, viewport, setViewport, getActiveFlow,
  } = useCanvasStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showFlowMenu, setShowFlowMenu] = useState<string | null>(null);

  const activeFlow = getActiveFlow();

  function handleDragStart(def: NodeTypeDef, e: React.DragEvent) {
    e.dataTransfer.setData("nodeType", JSON.stringify(def));
    e.dataTransfer.effectAllowed = "copy";
  }

  function newFlow() {
    createFlow(`Flow ${flows.length + 1}`);
  }

  function handleRename(id: string) {
    if (renameValue.trim()) renameFlow(id, renameValue.trim());
    setRenamingId(null);
  }

  function zoomIn() {
    setViewport({ ...viewport, zoom: Math.min(viewport.zoom * 1.2, 3) });
  }
  function zoomOut() {
    setViewport({ ...viewport, zoom: Math.max(viewport.zoom / 1.2, 0.2) });
  }
  function resetView() {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }

  // No flows at all → show welcome
  if (flows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 panel-fade" style={{ background: "var(--surface-0)" }}>
        <div className="text-6xl opacity-20">⬡</div>
        <div>
          <h2 className="text-lg font-semibold text-center mb-1" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Hermes Canvas
          </h2>
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
            Visually build agent flows — drag nodes, connect them, configure everything
          </p>
        </div>
        <button
          onClick={newFlow}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{ background: "var(--amber)", color: "var(--surface-0)" }}
        >
          <Plus size={15} />
          Create your first flow
        </button>
        <div className="text-xs text-center space-y-1 mt-2" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
          <div>Inspired by Flowise · built for Hermes Agent</div>
          <div>20+ node types · memory · tools · permissions</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: "var(--surface-0)" }}>
      {/* ── Top toolbar ────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0 border-b"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        {/* Flow tabs */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="flex items-center gap-1 flex-shrink-0"
              style={{ position: "relative" }}
            >
              {renamingId === flow.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(flow.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(flow.id); if (e.key === "Escape") setRenamingId(null); }}
                  className="hermes-input px-2 py-1 text-xs rounded"
                  style={{ width: 120 }}
                />
              ) : (
                <button
                  onClick={() => setActiveFlow(flow.id)}
                  onDoubleClick={() => { setRenamingId(flow.id); setRenameValue(flow.name); }}
                  className="px-3 py-1 rounded text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: activeFlowId === flow.id ? "rgba(240,165,0,0.1)" : "var(--surface-2)",
                    color: activeFlowId === flow.id ? "var(--amber)" : "var(--text-secondary)",
                    border: `1px solid ${activeFlowId === flow.id ? "rgba(240,165,0,0.25)" : "var(--border)"}`,
                  }}
                >
                  {flow.name}
                </button>
              )}
              {flows.length > 1 && (
                <button
                  onClick={() => deleteFlow(flow.id)}
                  className="p-0.5 rounded opacity-0 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-dim)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--rose)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={newFlow}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all flex-shrink-0"
            style={{ color: "var(--text-dim)", border: "1px dashed var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amber)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
          >
            <Plus size={11} />
            New
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={zoomOut} className="p-1.5 rounded transition-colors" style={{ color: "var(--text-dim)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <ZoomOut size={12} />
          </button>
          <button
            onClick={resetView}
            className="px-2 py-1 rounded text-xs transition-all"
            style={{ color: "var(--text-secondary)", background: "var(--surface-2)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace", minWidth: 48, textAlign: "center" }}
          >
            {Math.round(viewport.zoom * 100)}%
          </button>
          <button onClick={zoomIn} className="p-1.5 rounded transition-colors" style={{ color: "var(--text-dim)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <ZoomIn size={12} />
          </button>
          <button onClick={resetView} className="p-1.5 rounded transition-colors" style={{ color: "var(--text-dim)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <Maximize2 size={12} />
          </button>
        </div>

        {/* Run button */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all flex-shrink-0"
          style={{ background: "var(--jade)", color: "var(--surface-0)" }}
        >
          <Play size={11} />
          Run
        </button>
      </div>

      {/* ── Main area ──────────────────────────────────────────────────── */}
      {activeFlow ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <NodeLibrary onDragStart={handleDragStart} />
          <CanvasEngine />
          {selectedNodeId && <NodeConfigPanel />}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center" style={{ color: "var(--text-dim)" }}>
          <div className="text-sm">Select or create a flow above</div>
        </div>
      )}

      {/* ── Status bar ─────────────────────────────────────────────────── */}
      {activeFlow && (
        <div
          className="flex items-center justify-between px-4 py-1 flex-shrink-0 border-t"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div style={{ color: "var(--text-dim)", fontSize: "0.62rem", fontFamily: "'JetBrains Mono', monospace" }}>
            {activeFlow.nodes.length} nodes · {activeFlow.edges.length} edges
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: "0.62rem", fontFamily: "'JetBrains Mono', monospace" }}>
            saved {formatDistanceToNow(activeFlow.updatedAt, { addSuffix: true })}
          </div>
        </div>
      )}
    </div>
  );
}
