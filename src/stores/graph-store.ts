import { create } from "zustand";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

export interface GraphState {
  nodes: FinancialNodeData[];
  edges: FinancialFlowData[];
  version: number;
  lastUpdated: number;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  alerts: AlertItem[];
  /** Serializable: array of dismissed rule ids */
  dismissedAlertRuleIds: string[];
}

export interface AlertItem {
  id: string;
  ruleId: string;
  text: string;
  timestamp: number;
}

export interface GraphActions {
  init: (nodes: FinancialNodeData[], edges: FinancialFlowData[]) => void;
  addNode: (node: FinancialNodeData) => void;
  updateNode: (id: string, changes: Partial<Omit<FinancialNodeData, "id">>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: FinancialFlowData) => void;
  updateEdge: (id: string, changes: Partial<Omit<FinancialFlowData, "id">>) => void;
  deleteEdge: (id: string) => void;
  bulkAdd: (nodes: FinancialNodeData[], edges: FinancialFlowData[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setAlerts: (alerts: AlertItem[] | ((prev: AlertItem[]) => AlertItem[])) => void;
  dismissAlert: (alertId: string) => void;
  clearDismissals: () => void;
}

/** Plain state update: no derived state (metrics, triggeredRules, nodeMap). */
function nextState(
  nodes: FinancialNodeData[],
  edges: FinancialFlowData[],
  prevVersion: number,
  _prevDismissed: string[]
): Partial<GraphState> {
  return {
    nodes,
    edges,
    lastUpdated: Date.now(),
    version: prevVersion + 1,
  };
}

export const useGraphStore = create<GraphState & GraphActions>((set, get) => ({
  nodes: [],
  edges: [],
  version: 0,
  lastUpdated: Date.now(),
  selectedNodeId: null,
  selectedEdgeId: null,
  alerts: [],
  dismissedAlertRuleIds: [],

  init: (nodes, edges) => {
    set({
      nodes,
      edges,
      version: 1,
      lastUpdated: Date.now(),
      alerts: [],
      dismissedAlertRuleIds: [],
    });
  },

  addNode: (node) => {
    const s = get();
    const nodes = [...s.nodes, node];
    set(nextState(nodes, s.edges, s.version, s.dismissedAlertRuleIds));
  },

  updateNode: (id, changes) => {
    const s = get();
    const nodes = s.nodes.map((n) => (n.id === id ? { ...n, ...changes } : n));
    set(nextState(nodes, s.edges, s.version, s.dismissedAlertRuleIds));
  },

  deleteNode: (id) => {
    const s = get();
    const nodes = s.nodes.filter((n) => n.id !== id);
    const edges = s.edges.filter((e) => e.source !== id && e.target !== id);
    const updates: Partial<GraphState> = {
      ...nextState(nodes, edges, s.version, s.dismissedAlertRuleIds),
    };
    if (s.selectedNodeId === id) updates.selectedNodeId = null;
    set(updates);
  },

  addEdge: (edge) => {
    const s = get();
    const edges = [...s.edges, edge];
    set(nextState(s.nodes, edges, s.version, s.dismissedAlertRuleIds));
  },

  updateEdge: (id, changes) => {
    const s = get();
    const edges = s.edges.map((e) => (e.id === id ? { ...e, ...changes } : e));
    set(nextState(s.nodes, edges, s.version, s.dismissedAlertRuleIds));
  },

  deleteEdge: (id) => {
    const s = get();
    const edges = s.edges.filter((e) => e.id !== id);
    const updates: Partial<GraphState> = {
      ...nextState(s.nodes, edges, s.version, s.dismissedAlertRuleIds),
    };
    if (s.selectedEdgeId === id) updates.selectedEdgeId = null;
    set(updates);
  },

  bulkAdd: (newNodes, newEdges) => {
    const s = get();
    const nodes = [...s.nodes, ...newNodes];
    const edges = [...s.edges, ...newEdges];
    set(nextState(nodes, edges, s.version, s.dismissedAlertRuleIds));
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),

  setAlerts: (alertsOrUpdater) => {
    if (typeof alertsOrUpdater === "function") {
      set((s) => ({ alerts: alertsOrUpdater(s.alerts) }));
    } else {
      set({ alerts: alertsOrUpdater });
    }
  },

  dismissAlert: (alertId) => {
    const s = get();
    const alert = s.alerts.find((a) => a.id === alertId);
    const newDismissed = alert
      ? [...s.dismissedAlertRuleIds, alert.ruleId]
      : s.dismissedAlertRuleIds;
    set({
      alerts: s.alerts.filter((a) => a.id !== alertId),
      dismissedAlertRuleIds: newDismissed,
    });
  },

  clearDismissals: () => set({ dismissedAlertRuleIds: [] }),
}));

// ── Selectors (use with useShallow for arrays/objects) ──
export const selectNodes = (s: GraphState) => s.nodes;
export const selectEdges = (s: GraphState) => s.edges;
export const selectVersion = (s: GraphState) => s.version;
export const selectLastUpdated = (s: GraphState) => s.lastUpdated;
export const selectSelectedNodeId = (s: GraphState) => s.selectedNodeId;
export const selectSelectedEdgeId = (s: GraphState) => s.selectedEdgeId;
export const selectAlerts = (s: GraphState) => s.alerts;
export const selectDismissedAlertRuleIds = (s: GraphState) => s.dismissedAlertRuleIds;
