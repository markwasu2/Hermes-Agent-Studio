"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NodeTypeDef } from "./nodeTypes";

export interface CanvasNode {
  id: string;
  type: string;
  label: string;
  category: string;
  icon: string;
  color: string;
  borderColor: string;
  x: number;
  y: number;
  width: number;
  inputs: string[];
  outputs: string[];
  config: Record<string, string | boolean | number>;
  collapsed?: boolean;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromHandle: string;  // "output:0" etc
  toNode: string;
  toHandle: string;    // "input:0" etc
}

export interface CanvasFlow {
  id: string;
  name: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  updatedAt: number;
}

interface CanvasState {
  // Flows
  flows: CanvasFlow[];
  activeFlowId: string | null;
  setActiveFlow: (id: string | null) => void;
  createFlow: (name: string) => string;
  deleteFlow: (id: string) => void;
  renameFlow: (id: string, name: string) => void;

  // Nodes
  addNode: (def: NodeTypeDef, x: number, y: number) => string;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  deleteNode: (id: string) => void;
  updateNodeConfig: (id: string, key: string, value: string | boolean | number) => void;

  // Edges
  addEdge: (edge: Omit<CanvasEdge, "id">) => void;
  deleteEdge: (id: string) => void;

  // Selection
  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  // Viewport
  viewport: { x: number; y: number; zoom: number };
  setViewport: (v: { x: number; y: number; zoom: number }) => void;

  // Helpers
  getActiveFlow: () => CanvasFlow | null;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      flows: [],
      activeFlowId: null,

      setActiveFlow: (id) => set({ activeFlowId: id, selectedNodeId: null }),

      createFlow: (name) => {
        const id = uid();
        const flow: CanvasFlow = { id, name, nodes: [], edges: [], updatedAt: Date.now() };
        set((s) => ({ flows: [...s.flows, flow], activeFlowId: id }));
        return id;
      },

      deleteFlow: (id) =>
        set((s) => ({
          flows: s.flows.filter((f) => f.id !== id),
          activeFlowId: s.activeFlowId === id ? null : s.activeFlowId,
        })),

      renameFlow: (id, name) =>
        set((s) => ({
          flows: s.flows.map((f) => (f.id === id ? { ...f, name } : f)),
        })),

      addNode: (def, x, y) => {
        const id = uid();
        const defaults: Record<string, string | boolean | number> = {};
        def.fields.forEach((f) => { if (f.default !== undefined) defaults[f.key] = f.default; });

        const node: CanvasNode = {
          id,
          type: def.type,
          label: def.label,
          category: def.category,
          icon: def.icon,
          color: def.color,
          borderColor: def.borderColor,
          x, y,
          width: 220,
          inputs: def.inputs,
          outputs: def.outputs,
          config: defaults,
        };

        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === s.activeFlowId
              ? { ...f, nodes: [...f.nodes, node], updatedAt: Date.now() }
              : f
          ),
          selectedNodeId: id,
        }));
        return id;
      },

      updateNode: (id, patch) =>
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === s.activeFlowId
              ? { ...f, nodes: f.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)), updatedAt: Date.now() }
              : f
          ),
        })),

      deleteNode: (id) =>
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === s.activeFlowId
              ? {
                  ...f,
                  nodes: f.nodes.filter((n) => n.id !== id),
                  edges: f.edges.filter((e) => e.fromNode !== id && e.toNode !== id),
                  updatedAt: Date.now(),
                }
              : f
          ),
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        })),

      updateNodeConfig: (id, key, value) =>
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === s.activeFlowId
              ? {
                  ...f,
                  nodes: f.nodes.map((n) =>
                    n.id === id ? { ...n, config: { ...n.config, [key]: value } } : n
                  ),
                  updatedAt: Date.now(),
                }
              : f
          ),
        })),

      addEdge: (edge) => {
        const id = uid();
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === s.activeFlowId
              ? { ...f, edges: [...f.edges, { ...edge, id }], updatedAt: Date.now() }
              : f
          ),
        }));
      },

      deleteEdge: (id) =>
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === s.activeFlowId
              ? { ...f, edges: f.edges.filter((e) => e.id !== id), updatedAt: Date.now() }
              : f
          ),
        })),

      selectedNodeId: null,
      setSelectedNode: (id) => set({ selectedNodeId: id }),

      viewport: { x: 0, y: 0, zoom: 1 },
      setViewport: (viewport) => set({ viewport }),

      getActiveFlow: () => {
        const { flows, activeFlowId } = get();
        return flows.find((f) => f.id === activeFlowId) ?? null;
      },
    }),
    {
      name: "hermes-canvas",
      partialize: (s) => ({ flows: s.flows, activeFlowId: s.activeFlowId }),
    }
  )
);
