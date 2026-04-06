"use client";
import { X, Trash2, ChevronDown } from "lucide-react";
import { useCanvasStore } from "./canvasStore";
import { NODE_LIBRARY } from "./nodeTypes";

export default function NodeConfigPanel() {
  const { selectedNodeId, setSelectedNode, getActiveFlow, updateNodeConfig, deleteNode } = useCanvasStore();

  const flow = getActiveFlow();
  const node = flow?.nodes.find((n) => n.id === selectedNodeId);

  if (!node) return null;

  const typeDef = NODE_LIBRARY.find((t) => t.type === node.type);
  if (!typeDef) return null;

  function handleDelete() {
    if (node) { deleteNode(node.id); setSelectedNode(null); }
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 260,
        flexShrink: 0,
        background: "var(--surface-1)",
        borderLeft: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-b"
        style={{ borderColor: "var(--border)", borderBottom: `2px solid ${node.color}` }}
      >
        <span className="text-lg">{node.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
            {node.label}
          </div>
          <div className="text-xs" style={{ color: node.color, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem" }}>
            {node.category}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 rounded transition-colors flex-shrink-0"
          style={{ color: "var(--text-dim)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--rose)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
          title="Delete node"
        >
          <Trash2 size={13} />
        </button>
        <button
          onClick={() => setSelectedNode(null)}
          className="p-1 rounded transition-colors flex-shrink-0"
          style={{ color: "var(--text-dim)" }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {typeDef.fields.length === 0 && (
          <div className="text-xs py-4 text-center" style={{ color: "var(--text-dim)" }}>No configuration needed</div>
        )}

        {typeDef.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {field.label}
            </label>

            {field.type === "text" && (
              <input
                value={String(node.config[field.key] ?? field.default ?? "")}
                onChange={(e) => updateNodeConfig(node.id, field.key, e.target.value)}
                placeholder={field.placeholder}
                className="hermes-input w-full px-2.5 py-1.5 rounded text-xs"
              />
            )}

            {field.type === "textarea" && (
              <textarea
                value={String(node.config[field.key] ?? field.default ?? "")}
                onChange={(e) => updateNodeConfig(node.id, field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="hermes-input w-full px-2.5 py-1.5 rounded text-xs resize-none"
              />
            )}

            {field.type === "number" && (
              <input
                type="number"
                value={String(node.config[field.key] ?? field.default ?? "")}
                onChange={(e) => updateNodeConfig(node.id, field.key, e.target.value)}
                className="hermes-input w-full px-2.5 py-1.5 rounded text-xs"
              />
            )}

            {field.type === "select" && (
              <div className="relative">
                <select
                  value={String(node.config[field.key] ?? field.default ?? "")}
                  onChange={(e) => updateNodeConfig(node.id, field.key, e.target.value)}
                  className="hermes-input w-full px-2.5 py-1.5 pr-7 rounded text-xs appearance-none"
                >
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt} style={{ background: "var(--surface-2)" }}>{opt}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-dim)" }} />
              </div>
            )}

            {field.type === "toggle" && (
              <button
                onClick={() => updateNodeConfig(node.id, field.key, !node.config[field.key])}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{ background: node.config[field.key] ? node.color : "var(--surface-4)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{ background: "white", left: node.config[field.key] ? "19px" : "2px" }}
                />
              </button>
            )}

            {field.type === "tags" && (
              <input
                value={String(node.config[field.key] ?? "")}
                onChange={(e) => updateNodeConfig(node.id, field.key, e.target.value)}
                placeholder="comma, separated, values"
                className="hermes-input w-full px-2.5 py-1.5 rounded text-xs"
              />
            )}
          </div>
        ))}
      </div>

      {/* Handles info */}
      {(node.inputs.length > 0 || node.outputs.length > 0) && (
        <div className="px-3 py-2 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
          {node.inputs.length > 0 && (
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase" }}>Inputs</div>
              <div className="flex flex-wrap gap-1">
                {node.inputs.map((inp) => (
                  <span key={inp} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--surface-3)", color: "var(--sky)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", border: "1px solid rgba(56,189,248,0.15)" }}>
                    ← {inp}
                  </span>
                ))}
              </div>
            </div>
          )}
          {node.outputs.length > 0 && (
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase" }}>Outputs</div>
              <div className="flex flex-wrap gap-1">
                {node.outputs.map((out) => (
                  <span key={out} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--surface-3)", color: "var(--jade)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", border: "1px solid rgba(0,217,126,0.15)" }}>
                    {out} →
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Node ID */}
      <div className="px-3 py-1.5 border-t" style={{ borderColor: "var(--border)" }}>
        <div style={{ color: "var(--text-dim)", fontSize: "0.6rem", fontFamily: "'JetBrains Mono', monospace" }}>
          id: {node.id}
        </div>
      </div>
    </div>
  );
}
