"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useCanvasStore, type CanvasNode, type CanvasEdge } from "./canvasStore";
import type { NodeTypeDef } from "./nodeTypes";

const NODE_HEIGHT_BASE = 40; // header
const HANDLE_RADIUS = 6;
const HANDLE_SPACING = 20;

// ── Handle position helpers ──────────────────────────────────────────────────
function inputHandlePos(node: CanvasNode, idx: number) {
  const totalH = NODE_HEIGHT_BASE + Math.max(node.inputs.length, 1) * HANDLE_SPACING;
  const y = node.y + NODE_HEIGHT_BASE / 2 + (idx + 1) * (totalH - NODE_HEIGHT_BASE) / (node.inputs.length + 1);
  return { x: node.x, y };
}

function outputHandlePos(node: CanvasNode, idx: number) {
  const totalH = NODE_HEIGHT_BASE + Math.max(node.outputs.length, 1) * HANDLE_SPACING;
  const y = node.y + NODE_HEIGHT_BASE / 2 + (idx + 1) * (totalH - NODE_HEIGHT_BASE) / (node.outputs.length + 1);
  return { x: node.x + node.width, y };
}

// ── Bezier curve ──────────────────────────────────────────────────────────────
function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

// ── Canvas component ──────────────────────────────────────────────────────────
interface PendingEdge {
  fromNode: string;
  fromHandle: string;
  fromX: number;
  fromY: number;
  mouseX: number;
  mouseY: number;
}

export default function CanvasEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    getActiveFlow, addNode, updateNode, deleteNode,
    addEdge, deleteEdge,
    selectedNodeId, setSelectedNode,
    viewport, setViewport,
  } = useCanvasStore();

  const flow = getActiveFlow();

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ mx: number; my: number; vx: number; vy: number } | null>(null);

  // Drag node state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Pending edge drawing
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null);

  const vp = viewport;

  // ── Screen ↔ canvas coordinate conversion ─────────────────────────────────
  function screenToCanvas(sx: number, sy: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (sx - rect.left - vp.x) / vp.zoom,
      y: (sy - rect.top - vp.y) / vp.zoom,
    };
  }

  // ── Mouse wheel → zoom ────────────────────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(vp.zoom * delta, 0.2), 3);
    const newX = mouseX - (mouseX - vp.x) * (newZoom / vp.zoom);
    const newY = mouseY - (mouseY - vp.y) * (newZoom / vp.zoom);
    setViewport({ x: newX, y: newY, zoom: newZoom });
  }, [vp, setViewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // ── Pan: middle mouse / space+drag ────────────────────────────────────────
  function onMouseDownCanvas(e: React.MouseEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, vx: vp.x, vy: vp.y };
    } else if (e.button === 0 && e.target === e.currentTarget) {
      setSelectedNode(null);
      setPendingEdge(null);
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (isPanning && panStart.current) {
      setViewport({
        x: panStart.current.vx + (e.clientX - panStart.current.mx),
        y: panStart.current.vy + (e.clientY - panStart.current.my),
        zoom: vp.zoom,
      });
    }
    if (draggingId) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      updateNode(draggingId, {
        x: pos.x - dragOffset.current.dx,
        y: pos.y - dragOffset.current.dy,
      });
    }
    if (pendingEdge) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setPendingEdge((p) => p ? { ...p, mouseX: pos.x, mouseY: pos.y } : null);
    }
  }

  function onMouseUp() {
    setIsPanning(false);
    panStart.current = null;
    setDraggingId(null);
    if (pendingEdge) setPendingEdge(null);
  }

  // ── Node drag ─────────────────────────────────────────────────────────────
  function startDragNode(node: CanvasNode, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedNode(node.id);
    const pos = screenToCanvas(e.clientX, e.clientY);
    dragOffset.current = { dx: pos.x - node.x, dy: pos.y - node.y };
    setDraggingId(node.id);
  }

  // ── Edge drawing ──────────────────────────────────────────────────────────
  function startEdge(node: CanvasNode, outputIdx: number, e: React.MouseEvent) {
    e.stopPropagation();
    const pos = outputHandlePos(node, outputIdx);
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setPendingEdge({
      fromNode: node.id,
      fromHandle: `output:${outputIdx}`,
      fromX: pos.x,
      fromY: pos.y,
      mouseX: canvasPos.x,
      mouseY: canvasPos.y,
    });
  }

  function completeEdge(node: CanvasNode, inputIdx: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!pendingEdge || pendingEdge.fromNode === node.id) { setPendingEdge(null); return; }
    addEdge({
      fromNode: pendingEdge.fromNode,
      fromHandle: pendingEdge.fromHandle,
      toNode: node.id,
      toHandle: `input:${inputIdx}`,
    });
    setPendingEdge(null);
  }

  // ── Drop from library ──────────────────────────────────────────────────────
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const defJson = e.dataTransfer.getData("nodeType");
    if (!defJson) return;
    const def: NodeTypeDef = JSON.parse(defJson);
    const pos = screenToCanvas(e.clientX, e.clientY);
    addNode(def, pos.x - 110, pos.y - 20);
  }

  if (!flow) return null;

  const nodes = flow.nodes;
  const edges = flow.edges;

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ background: "var(--surface-0)", cursor: isPanning ? "grabbing" : "default" }}
      onMouseDown={onMouseDownCanvas}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Grid dots */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <defs>
          <pattern
            id="grid"
            x={vp.x % (20 * vp.zoom)}
            y={vp.y % (20 * vp.zoom)}
            width={20 * vp.zoom}
            height={20 * vp.zoom}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={1} cy={1} r={0.8} fill="#1f2a3a" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Canvas transform layer */}
      <div
        style={{
          position: "absolute",
          transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
          transformOrigin: "0 0",
          width: 0,
          height: 0,
        }}
      >
        {/* ── Edges ──────────────────────────────────────────────────────── */}
        <svg style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(240,165,0,0.5)" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.fromNode);
            const toNode = nodes.find((n) => n.id === edge.toNode);
            if (!fromNode || !toNode) return null;
            const outIdx = parseInt(edge.fromHandle.split(":")[1] ?? "0");
            const inIdx = parseInt(edge.toHandle.split(":")[1] ?? "0");
            const from = outputHandlePos(fromNode, outIdx);
            const to = inputHandlePos(toNode, inIdx);
            return (
              <g key={edge.id}>
                <path
                  d={bezierPath(from.x, from.y, to.x, to.y)}
                  fill="none"
                  stroke="rgba(240,165,0,0.08)"
                  strokeWidth={8}
                  strokeLinecap="round"
                  style={{ cursor: "pointer", pointerEvents: "visibleStroke" }}
                  onClick={() => deleteEdge(edge.id)}
                />
                <path
                  d={bezierPath(from.x, from.y, to.x, to.y)}
                  fill="none"
                  stroke="rgba(240,165,0,0.5)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  markerEnd="url(#arrow)"
                  style={{ pointerEvents: "none" }}
                />
              </g>
            );
          })}

          {/* Pending edge */}
          {pendingEdge && (
            <path
              d={bezierPath(pendingEdge.fromX, pendingEdge.fromY, pendingEdge.mouseX, pendingEdge.mouseY)}
              fill="none"
              stroke="rgba(240,165,0,0.7)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              style={{ pointerEvents: "none" }}
            />
          )}
        </svg>

        {/* ── Nodes ──────────────────────────────────────────────────────── */}
        {nodes.map((node) => (
          <CanvasNodeCard
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id}
            onDragStart={startDragNode}
            onOutputHandleMouseDown={startEdge}
            onInputHandleMouseUp={completeEdge}
            hasPendingEdge={!!pendingEdge}
            onDelete={() => deleteNode(node.id)}
          />
        ))}
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
          style={{ color: "var(--text-dim)" }}
        >
          <div className="text-5xl opacity-20">⬡</div>
          <div className="text-sm font-medium" style={{ color: "var(--text-secondary)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Drag nodes from the library to start building
          </div>
          <div style={{ fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>
            alt+drag or middle-click to pan · scroll to zoom
          </div>
        </div>
      )}
    </div>
  );
}

// ── Node card ─────────────────────────────────────────────────────────────────
interface NodeCardProps {
  node: CanvasNode;
  selected: boolean;
  onDragStart: (node: CanvasNode, e: React.MouseEvent) => void;
  onOutputHandleMouseDown: (node: CanvasNode, idx: number, e: React.MouseEvent) => void;
  onInputHandleMouseUp: (node: CanvasNode, idx: number, e: React.MouseEvent) => void;
  hasPendingEdge: boolean;
  onDelete: () => void;
}

function CanvasNodeCard({
  node, selected,
  onDragStart, onOutputHandleMouseDown, onInputHandleMouseUp,
  hasPendingEdge,
}: NodeCardProps) {
  const nodeH = Math.max(
    NODE_HEIGHT_BASE + Math.max(node.inputs.length, node.outputs.length) * HANDLE_SPACING + 8,
    NODE_HEIGHT_BASE + 16
  );

  return (
    <div
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        userSelect: "none",
        filter: selected ? `drop-shadow(0 0 8px ${node.color}55)` : "none",
        zIndex: selected ? 10 : 1,
      }}
    >
      {/* Card */}
      <div
        onMouseDown={(e) => onDragStart(node, e)}
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${selected ? node.color : node.borderColor}`,
          borderRadius: 8,
          overflow: "hidden",
          cursor: "grab",
          minHeight: nodeH,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${node.color}22, ${node.color}08)`,
            borderBottom: `1px solid ${node.borderColor}`,
            padding: "7px 10px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>{node.icon}</span>
          <span style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            fontFamily: "'Space Grotesk', sans-serif",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {node.label}
          </span>
          <span style={{
            fontSize: "0.55rem",
            color: node.color,
            fontFamily: "'JetBrains Mono', monospace",
            background: `${node.color}18`,
            padding: "1px 5px",
            borderRadius: 3,
            flexShrink: 0,
          }}>
            {node.category}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: "6px 10px 8px", minHeight: 8 }}>
          {node.inputs.length === 0 && node.outputs.length === 0 && (
            <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
              no handles
            </div>
          )}
          {/* Input labels */}
          {node.inputs.map((inp, i) => (
            <div key={i} style={{ fontSize: "0.65rem", color: "var(--sky)", fontFamily: "'JetBrains Mono', monospace", padding: "2px 0" }}>
              ← {inp}
            </div>
          ))}
          {/* Output labels */}
          {node.outputs.map((out, i) => (
            <div key={i} style={{ fontSize: "0.65rem", color: "var(--jade)", fontFamily: "'JetBrains Mono', monospace", padding: "2px 0", textAlign: "right" }}>
              {out} →
            </div>
          ))}
        </div>
      </div>

      {/* Input handles (left side) */}
      {node.inputs.map((inp, i) => {
        const { x: hx, y: hy } = inputHandlePos(node, i);
        return (
          <div
            key={`in-${i}`}
            onMouseUp={(e) => onInputHandleMouseUp(node, i, e)}
            style={{
              position: "absolute",
              left: hx - node.x - HANDLE_RADIUS,
              top: hy - node.y - HANDLE_RADIUS,
              width: HANDLE_RADIUS * 2,
              height: HANDLE_RADIUS * 2,
              borderRadius: "50%",
              background: "var(--surface-2)",
              border: `2px solid ${hasPendingEdge ? "#38bdf8" : node.borderColor}`,
              cursor: hasPendingEdge ? "crosshair" : "default",
              zIndex: 2,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#38bdf8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
            title={`Input: ${inp}`}
          />
        );
      })}

      {/* Output handles (right side) */}
      {node.outputs.map((out, i) => {
        const { x: hx, y: hy } = outputHandlePos(node, i);
        return (
          <div
            key={`out-${i}`}
            onMouseDown={(e) => { e.stopPropagation(); onOutputHandleMouseDown(node, i, e); }}
            style={{
              position: "absolute",
              left: hx - node.x - HANDLE_RADIUS,
              top: hy - node.y - HANDLE_RADIUS,
              width: HANDLE_RADIUS * 2,
              height: HANDLE_RADIUS * 2,
              borderRadius: "50%",
              background: "var(--surface-2)",
              border: `2px solid ${node.color}`,
              cursor: "crosshair",
              zIndex: 2,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = node.color; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
            title={`Output: ${out}`}
          />
        );
      })}
    </div>
  );
}
