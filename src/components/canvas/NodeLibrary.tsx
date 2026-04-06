"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { LIBRARY_BY_CATEGORY, CATEGORY_LABELS, CATEGORY_COLORS, type NodeTypeDef, type NodeCategory } from "./nodeTypes";

interface Props {
  onDragStart: (def: NodeTypeDef, e: React.DragEvent) => void;
}

const CATEGORY_ORDER: NodeCategory[] = ["trigger", "agent", "memory", "knowledge", "tool", "permissions", "output"];

export default function NodeLibrary({ onDragStart }: Props) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  const filtered = query.trim()
    ? CATEGORY_ORDER.flatMap((cat) => (LIBRARY_BY_CATEGORY[cat] ?? []).filter((n) =>
        n.label.toLowerCase().includes(query.toLowerCase()) ||
        n.description.toLowerCase().includes(query.toLowerCase())
      ))
    : null;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--surface-1)", borderRight: "1px solid var(--border)", width: 220, flexShrink: 0 }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Node Library
        </div>
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dim)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="hermes-input w-full pl-7 pr-2 py-1.5 rounded text-xs"
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered ? (
          // Search results
          <div className="px-2 space-y-1 py-1">
            {filtered.length === 0 ? (
              <div className="text-xs px-2 py-4 text-center" style={{ color: "var(--text-dim)" }}>No nodes found</div>
            ) : (
              filtered.map((node) => <NodeCard key={node.type} node={node} onDragStart={onDragStart} />)
            )}
          </div>
        ) : (
          // Categorized
          CATEGORY_ORDER.map((cat) => {
            const nodes = LIBRARY_BY_CATEGORY[cat] ?? [];
            if (!nodes.length) return null;
            const colors = CATEGORY_COLORS[cat];
            const isCollapsed = collapsed.has(cat);
            return (
              <div key={cat}>
                <button
                  onClick={() => toggle(cat)}
                  className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ color: colors.text }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: colors.dot }}
                  />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="ml-auto" style={{ color: "var(--text-dim)", fontSize: "0.6rem" }}>{nodes.length}</span>
                  {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                </button>
                {!isCollapsed && (
                  <div className="px-2 pb-1 space-y-1">
                    {nodes.map((node) => <NodeCard key={node.type} node={node} onDragStart={onDragStart} />)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Hint */}
      <div className="px-3 py-2 text-center" style={{ borderTop: "1px solid var(--border)", color: "var(--text-dim)", fontSize: "0.6rem", fontFamily: "'JetBrains Mono', monospace" }}>
        Drag nodes onto canvas
      </div>
    </div>
  );
}

function NodeCard({ node, onDragStart }: { node: NodeTypeDef; onDragStart: (def: NodeTypeDef, e: React.DragEvent) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(node, e)}
      className="flex items-start gap-2 px-2 py-2 rounded cursor-grab active:cursor-grabbing transition-all select-none"
      style={{
        background: "var(--surface-2)",
        border: `1px solid var(--border)`,
        borderLeft: `2px solid ${node.color}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-3)"; e.currentTarget.style.borderColor = node.borderColor; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--border)"; (e.currentTarget.style as CSSStyleDeclaration).borderLeftColor = node.color; }}
    >
      <span className="text-sm flex-shrink-0 mt-0.5">{node.icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
          {node.label}
        </div>
        <div className="text-xs truncate mt-0.5" style={{ color: "var(--text-dim)", fontSize: "0.62rem" }}>
          {node.description}
        </div>
      </div>
    </div>
  );
}
