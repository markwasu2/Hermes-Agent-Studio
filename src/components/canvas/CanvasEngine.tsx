"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { Trash2, X, ChevronDown, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "./canvasStore";
import { NODE_LIBRARY } from "./nodeTypes";
import type { NodeTypeDef } from "./nodeTypes";

const HANDLE_VISUAL = 8;
const HANDLE_HIT = 20;
const ROW_HEIGHT = 24;
const HEADER_H = 38;
const BODY_PAD = 12;

function nodeHeight(node: CanvasNode) {
  return HEADER_H + Math.max(node.inputs.length, node.outputs.length, 1) * ROW_HEIGHT + BODY_PAD;
}

function inputPos(node: CanvasNode, idx: number) {
  const rows = Math.max(node.inputs.length, node.outputs.length, 1);
  const h = nodeHeight(node);
  const rowH = (h - HEADER_H - BODY_PAD) / rows;
  return { x: node.x, y: node.y + HEADER_H + BODY_PAD / 2 + idx * rowH + rowH / 2 };
}

function outputPos(node: CanvasNode, idx: number) {
  const rows = Math.max(node.inputs.length, node.outputs.length, 1);
  const h = nodeHeight(node);
  const rowH = (h - HEADER_H - BODY_PAD) / rows;
  return { x: node.x + node.width, y: node.y + HEADER_H + BODY_PAD / 2 + idx * rowH + rowH / 2 };
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = Math.abs(x2 - x1) * 0.55;
  return `M${x1},${y1} C${x1 + cx},${y1} ${x2 - cx},${y2} ${x2},${y2}`;
}

export default function CanvasEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    getActiveFlow, addNode, updateNode, deleteNode,
    addEdge, deleteEdge, updateNodeConfig,
    selectedNodeId, setSelectedNode,
    viewport, setViewport,
  } = useCanvasStore();

  const flow = getActiveFlow();
  const nodes = flow?.nodes ?? [];
  const edges = flow?.edges ?? [];

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mx: 0, my: 0, vx: 0, vy: 0 });
  const draggingRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const [connecting, setConnecting] = useState<{
    fromNode: string; fromHandle: string; fromX: number; fromY: number;
    mouseX: number; mouseY: number;
  } | null>(null);

  const vp = viewport;

  function toCanvas(sx: number, sy: number) {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: (sx - r.left - vp.x) / vp.zoom, y: (sy - r.top - vp.y) / vp.zoom };
  }

  // Zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const r = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nz = Math.min(Math.max(vp.zoom * factor, 0.15), 4);
    setViewport({ x: mx - (mx - vp.x) * nz / vp.zoom, y: my - (my - vp.y) * nz / vp.zoom, zoom: nz });
  }, [vp, setViewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Auto-fit
  useEffect(() => {
    if (nodes.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 10) return;
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const xe = nodes.map(n => n.x + n.width), ye = nodes.map(n => n.y + nodeHeight(n));
    const minX = Math.min(...xs) - 80, minY = Math.min(...ys) - 80;
    const maxX = Math.max(...xe) + 80, maxY = Math.max(...ye) + 80;
    const z = Math.min(r.width / (maxX - minX), r.height / (maxY - minY), 1.2) * 0.85;
    setViewport({ x: r.width / 2 - (minX + maxX) / 2 * z, y: r.height / 2 - (minY + maxY) / 2 * z, zoom: z });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow?.id]);

  // ESC
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setConnecting(null); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // Global mousemove/mouseup
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const p = panStartRef.current;
        setViewport({ x: p.vx + e.clientX - p.mx, y: p.vy + e.clientY - p.my, zoom: vp.zoom });
      }
      if (draggingRef.current) {
        const pos = toCanvas(e.clientX, e.clientY);
        updateNode(draggingRef.current.id, { x: pos.x - draggingRef.current.dx, y: pos.y - draggingRef.current.dy });
      }
      if (connecting) {
        const pos = toCanvas(e.clientX, e.clientY);
        setConnecting(c => c ? { ...c, mouseX: pos.x, mouseY: pos.y } : null);
      }
    };
    const onUp = () => { isPanningRef.current = false; draggingRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [vp, connecting, updateNode, setViewport]);

  function onCanvasMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (connecting) { setConnecting(null); return; }
    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { mx: e.clientX, my: e.clientY, vx: vp.x, vy: vp.y };
    } else if (target === e.currentTarget || target.dataset.bg) {
      setSelectedNode(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const json = e.dataTransfer.getData("nodeType");
    if (!json) return;
    const def: NodeTypeDef = JSON.parse(json);
    const pos = toCanvas(e.clientX, e.clientY);
    addNode(def, pos.x - 110, pos.y - HEADER_H / 2);
  }

  function startConnect(node: CanvasNode, outIdx: number, e: React.MouseEvent) {
    e.stopPropagation();
    const pos = outputPos(node, outIdx);
    const cp = toCanvas(e.clientX, e.clientY);
    setConnecting({ fromNode: node.id, fromHandle: `output:${outIdx}`, fromX: pos.x, fromY: pos.y, mouseX: cp.x, mouseY: cp.y });
    setSelectedNode(null);
  }

  function completeConnect(node: CanvasNode, inIdx: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!connecting) return;
    if (connecting.fromNode === node.id) { setConnecting(null); return; }
    addEdge({ fromNode: connecting.fromNode, fromHandle: connecting.fromHandle, toNode: node.id, toHandle: `input:${inIdx}` });
    setConnecting(null);
  }

  function startDragNode(node: CanvasNode, e: React.MouseEvent) {
    if (connecting) return;
    e.stopPropagation();
    setSelectedNode(node.id);
    const pos = toCanvas(e.clientX, e.clientY);
    draggingRef.current = { id: node.id, dx: pos.x - node.x, dy: pos.y - node.y };
  }

  function fitAll() {
    if (!containerRef.current || nodes.length === 0) { setViewport({ x: 0, y: 0, zoom: 1 }); return; }
    const r = containerRef.current.getBoundingClientRect();
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const xe = nodes.map(n => n.x + n.width), ye = nodes.map(n => n.y + nodeHeight(n));
    const minX = Math.min(...xs) - 80, minY = Math.min(...ys) - 80;
    const maxX = Math.max(...xe) + 80, maxY = Math.max(...ye) + 80;
    const z = Math.min(r.width / (maxX - minX), r.height / (maxY - minY), 1.2) * 0.85;
    setViewport({ x: r.width / 2 - (minX + maxX) / 2 * z, y: r.height / 2 - (minY + maxY) / 2 * z, zoom: z });
  }

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedDef = selectedNode ? NODE_LIBRARY.find(t => t.type === selectedNode.type) : null;

  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: "var(--surface-0)" }}>
      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full select-none"
        style={{ cursor: isPanningRef.current ? "grabbing" : connecting ? "crosshair" : "default" }}
        onMouseDown={onCanvasMouseDown}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
      >
        {/* Dot grid */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <defs>
            <pattern id="cdots" x={vp.x % (24 * vp.zoom)} y={vp.y % (24 * vp.zoom)} width={24 * vp.zoom} height={24 * vp.zoom} patternUnits="userSpaceOnUse">
              <circle cx={1} cy={1} r={0.9} fill="#1e2a3a" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cdots)" data-bg="1" />
        </svg>

        {/* Transform layer */}
        <div style={{ position: "absolute", transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.zoom})`, transformOrigin: "0 0", width: 0, height: 0 }}>
          {/* Edges SVG */}
          <svg style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }}>
            <defs>
              <marker id="arr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill="rgba(240,165,0,0.65)" />
              </marker>
            </defs>
            {edges.map(e => {
              const fn = nodes.find(n => n.id === e.fromNode);
              const tn = nodes.find(n => n.id === e.toNode);
              if (!fn || !tn) return null;
              const oi = parseInt(e.fromHandle.split(":")[1] ?? "0");
              const ii = parseInt(e.toHandle.split(":")[1] ?? "0");
              const from = outputPos(fn, oi), to = inputPos(tn, ii);
              return (
                <g key={e.id} style={{ cursor: "pointer", pointerEvents: "visibleStroke" }} onClick={() => deleteEdge(e.id)}>
                  <path d={bezier(from.x, from.y, to.x, to.y)} fill="none" stroke="transparent" strokeWidth={14} />
                  <path d={bezier(from.x, from.y, to.x, to.y)} fill="none" stroke="rgba(240,165,0,0.14)" strokeWidth={6} strokeLinecap="round" />
                  <path d={bezier(from.x, from.y, to.x, to.y)} fill="none" stroke="rgba(240,165,0,0.7)" strokeWidth={1.8} strokeDasharray="6 4" markerEnd="url(#arr)" />
                </g>
              );
            })}
            {connecting && (
              <>
                <path d={bezier(connecting.fromX, connecting.fromY, connecting.mouseX, connecting.mouseY)}
                  fill="none" stroke="#00d97e" strokeWidth={1.8} strokeDasharray="5 3" />
                <circle cx={connecting.mouseX} cy={connecting.mouseY} r={5} fill="none" stroke="#00d97e" strokeWidth={1.5} />
              </>
            )}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const h = nodeHeight(node);
            const selected = selectedNodeId === node.id;
            const rows = Math.max(node.inputs.length, node.outputs.length, 1);
            const isTarget = !!(connecting && connecting.fromNode !== node.id && node.inputs.length > 0);
            return (
              <div key={node.id} style={{
                position: "absolute", left: node.x, top: node.y, width: node.width,
                filter: selected ? `drop-shadow(0 0 10px ${node.color}60)` : undefined,
                zIndex: selected ? 10 : 2,
              }}>
                <div
                  onMouseDown={e => startDragNode(node, e)}
                  onClick={() => !connecting && setSelectedNode(node.id)}
                  style={{
                    height: h, background: "var(--surface-2)",
                    border: `1px solid ${selected ? node.color : isTarget ? "#00d97e55" : node.borderColor}`,
                    borderRadius: 8, overflow: "hidden", cursor: "grab", position: "relative",
                    transition: "border-color 0.1s, box-shadow 0.1s",
                    boxShadow: isTarget ? "0 0 0 1px #00d97e33" : undefined,
                  }}
                >
                  <div style={{
                    height: HEADER_H, background: `linear-gradient(135deg, ${node.color}18, ${node.color}05)`,
                    borderBottom: `1px solid ${node.borderColor}`,
                    display: "flex", alignItems: "center", gap: 7, padding: "0 10px",
                  }}>
                    <span style={{ fontSize: 15 }}>{node.icon}</span>
                    <span style={{ fontSize: "0.76rem", fontWeight: 600, flex: 1, color: "var(--text-primary)", fontFamily: "'Space Grotesk',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</span>
                    <span style={{ fontSize: "0.55rem", color: node.color, background: `${node.color}18`, padding: "2px 6px", borderRadius: 3, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>{node.category}</span>
                  </div>
                  <div style={{ padding: `${BODY_PAD / 2}px 10px` }}>
                    {Array.from({ length: rows }).map((_, i) => (
                      <div key={i} style={{ height: ROW_HEIGHT, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.62rem", color: "var(--sky)", fontFamily: "'JetBrains Mono',monospace", opacity: i < node.inputs.length ? 1 : 0 }}>← {node.inputs[i] ?? ""}</span>
                        <span style={{ fontSize: "0.62rem", color: "var(--jade)", fontFamily: "'JetBrains Mono',monospace", opacity: i < node.outputs.length ? 1 : 0 }}>{node.outputs[i] ?? ""} →</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Input handles */}
                {node.inputs.map((lbl, i) => {
                  const pos = inputPos(node, i);
                  const targetable = !!(connecting && connecting.fromNode !== node.id);
                  return (
                    <div key={`in${i}`}
                      onClick={e => completeConnect(node, i, e)}
                      onMouseDown={e => e.stopPropagation()}
                      title={`Input: ${lbl} — click to connect`}
                      style={{
                        position: "absolute",
                        left: pos.x - node.x - HANDLE_HIT / 2,
                        top: pos.y - node.y - HANDLE_HIT / 2,
                        width: HANDLE_HIT, height: HANDLE_HIT,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: targetable ? "crosshair" : "default", zIndex: 5,
                      }}
                    >
                      <div style={{
                        width: HANDLE_VISUAL * 2, height: HANDLE_VISUAL * 2, borderRadius: "50%",
                        background: targetable ? "#00d97e" : "var(--surface-3)",
                        border: `2.5px solid ${targetable ? "#00d97e" : "#38bdf8"}`,
                        transition: "all 0.15s",
                        boxShadow: targetable ? "0 0 10px #00d97e80" : "none",
                      }} />
                    </div>
                  );
                })}

                {/* Output handles */}
                {node.outputs.map((lbl, i) => {
                  const pos = outputPos(node, i);
                  const active = connecting?.fromNode === node.id && connecting.fromHandle === `output:${i}`;
                  return (
                    <div key={`out${i}`}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => startConnect(node, i, e)}
                      title={`Output: ${lbl} — click to start connection`}
                      style={{
                        position: "absolute",
                        left: pos.x - node.x - HANDLE_HIT / 2,
                        top: pos.y - node.y - HANDLE_HIT / 2,
                        width: HANDLE_HIT, height: HANDLE_HIT,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "crosshair", zIndex: 5,
                      }}
                    >
                      <div style={{
                        width: HANDLE_VISUAL * 2, height: HANDLE_VISUAL * 2, borderRadius: "50%",
                        background: active ? node.color : "var(--surface-3)",
                        border: `2.5px solid ${node.color}`,
                        transition: "all 0.15s",
                        boxShadow: active ? `0 0 12px ${node.color}` : "none",
                      }} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div style={{ fontSize: 48, opacity: 0.15 }}>⬡</div>
            <div style={{ color: "var(--text-secondary)", fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.9rem", fontWeight: 600 }}>Drag nodes from the library to start</div>
            <div style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", textAlign: "center", lineHeight: 1.8 }}>
              Click a node to configure it · Alt+drag to pan · scroll to zoom<br />
              Click ○ (right side) to start a connection · click ● (left side) to finish
            </div>
          </div>
        )}

        {/* Connecting hint */}
        {connecting && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-medium pointer-events-none animate-pulse-slow"
            style={{ background: "rgba(0,217,126,0.1)", border: "1px solid rgba(0,217,126,0.3)", color: "#00d97e", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>
            🔗 Connecting — click any glowing ● input handle · ESC to cancel
          </div>
        )}
      </div>

      {/* Floating config panel */}
      {selectedNode && selectedDef && (
        <div className="absolute top-2 right-2 rounded-xl overflow-hidden flex flex-col"
          style={{
            width: 265, maxHeight: "calc(100% - 16px)",
            background: "var(--surface-1)", border: `1px solid ${selectedNode.color}44`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${selectedNode.color}18`,
            zIndex: 20,
          }}
        >
          <div style={{ borderBottom: `2px solid ${selectedNode.color}`, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${selectedNode.color}10, transparent)` }}>
            <span style={{ fontSize: 18 }}>{selectedNode.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedNode.label}</div>
              <div style={{ color: selectedNode.color, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem" }}>{selectedNode.category}</div>
            </div>
            <button onClick={() => deleteNode(selectedNode.id)} title="Delete"
              onMouseEnter={e => (e.currentTarget.style.color = "var(--rose)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
              style={{ color: "var(--text-dim)", padding: 4, borderRadius: 4, cursor: "pointer", background: "transparent", border: "none" }}>
              <Trash2 size={13} />
            </button>
            <button onClick={() => setSelectedNode(null)} style={{ color: "var(--text-dim)", padding: 4, borderRadius: 4, cursor: "pointer", background: "transparent", border: "none" }}>
              <X size={13} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {selectedDef.fields.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: "0.72rem", textAlign: "center", padding: 12 }}>No configuration needed</div>}
            {selectedDef.fields.map(field => (
              <div key={field.key}>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: 500, marginBottom: 5 }}>{field.label}</div>
                {field.type === "toggle" ? (
                  <button onClick={() => updateNodeConfig(selectedNode.id, field.key, !selectedNode.config[field.key])}
                    style={{ width: 38, height: 20, borderRadius: 10, position: "relative", cursor: "pointer", border: "none", background: selectedNode.config[field.key] ? selectedNode.color : "var(--surface-4)", transition: "background 0.2s" }}>
                    <span style={{ position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "white", left: selectedNode.config[field.key] ? 20 : 2, transition: "left 0.2s" }} />
                  </button>
                ) : field.type === "select" ? (
                  <div style={{ position: "relative" }}>
                    <select value={String(selectedNode.config[field.key] ?? field.default ?? "")}
                      onChange={e => updateNodeConfig(selectedNode.id, field.key, e.target.value)}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ width: "100%", padding: "6px 26px 6px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: "0.78rem", appearance: "none", cursor: "pointer" }}>
                      {(field.options ?? []).map(o => <option key={o} value={o} style={{ background: "var(--surface-2)" }}>{o}</option>)}
                    </select>
                    <ChevronDown size={11} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", pointerEvents: "none" }} />
                  </div>
                ) : field.type === "textarea" ? (
                  <textarea value={String(selectedNode.config[field.key] ?? field.default ?? "")}
                    onChange={e => updateNodeConfig(selectedNode.id, field.key, e.target.value)}
                    onMouseDown={e => e.stopPropagation()}
                    placeholder={field.placeholder} rows={3}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 6, resize: "none", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: "0.78rem", fontFamily: "inherit" }} />
                ) : (
                  <input type={field.type === "number" ? "number" : "text"}
                    value={String(selectedNode.config[field.key] ?? field.default ?? "")}
                    onChange={e => updateNodeConfig(selectedNode.id, field.key, e.target.value)}
                    onMouseDown={e => e.stopPropagation()}
                    placeholder={field.placeholder}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: "0.78rem", fontFamily: "inherit" }} />
                )}
              </div>
            ))}
          </div>

          {(selectedNode.inputs.length > 0 || selectedNode.outputs.length > 0) && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
              {selectedNode.inputs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selectedNode.inputs.map(inp => <span key={inp} style={{ fontSize: "0.62rem", padding: "2px 7px", borderRadius: 3, background: "rgba(56,189,248,0.08)", color: "var(--sky)", border: "1px solid rgba(56,189,248,0.15)", fontFamily: "'JetBrains Mono',monospace" }}>← {inp}</span>)}
                </div>
              )}
              {selectedNode.outputs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selectedNode.outputs.map(out => <span key={out} style={{ fontSize: "0.62rem", padding: "2px 7px", borderRadius: 3, background: "rgba(0,217,126,0.08)", color: "var(--jade)", border: "1px solid rgba(0,217,126,0.15)", fontFamily: "'JetBrains Mono',monospace" }}>{out} →</span>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-3 flex items-center gap-1">
        {[{ icon: <ZoomOut size={12} />, fn: () => setViewport({ ...vp, zoom: Math.max(vp.zoom / 1.2, 0.15) }) },
          { icon: <ZoomIn size={12} />, fn: () => setViewport({ ...vp, zoom: Math.min(vp.zoom * 1.2, 4) }) },
          { icon: <Maximize2 size={12} />, fn: fitAll }
        ].map((btn, i) => (
          <button key={i} onClick={btn.fn}
            style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {btn.icon}
          </button>
        ))}
        <div style={{ minWidth: 46, height: 28, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontFamily: "'JetBrains Mono',monospace", padding: "0 6px" }}>
          {Math.round(vp.zoom * 100)}%
        </div>
      </div>
    </div>
  );
}
