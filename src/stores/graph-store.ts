import { create } from "zustand";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";
import {
  calculateFinancialMetrics,
  checkSentinelRules,
  type CalculatedValues,
  type TriggeredRule,
} from "@/lib/rules/sentinel-rules";

export interface GraphState {
  nodes: FinancialNodeData[];
  edges: FinancialFlowData[];
  lastUpdated: number;
  version: number;

  metrics: CalculatedValues;
  triggeredRules: TriggeredRule[];
  alerts: AlertItem[];
  dismissedAlertRuleIds: Set<string>;

  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  nodeMap: Map<string, FinancialNodeData>;
}

export interface AlertItem {
  id: string;
  ruleId: string;
  text: string;
  timestamp: number;
}

function buildNodeMap(nodes: FinancialNodeData[]): Map<string, FinancialNodeData> {
  const m = new Map<string, FinancialNodeData>();
  for (const n of nodes) m.set(n.id, n);
  return m;
}

function deriveMetrics(nodes: FinancialNodeData[], edges: FinancialFlowData[]) {
  const metrics = calculateFinancialMetrics(nodes, edges);
  const triggeredRules = checkSentinelRules(nodes, edges, metrics);
  return { metrics, triggeredRules };
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

  setAlerts: (alerts: AlertItem[]) => void;
  dismissAlert: (alertId: string) => void;
  clearDismissals: () => void;
}

function commit(
  nodes: FinancialNodeData[],
  edges: FinancialFlowData[],
  prevVersion: number,
  _prevDismissed: Set<string>
): Partial<GraphState> {
  const { metrics, triggeredRules } = deriveMetrics(nodes, edges);
  return {
    nodes,
    edges,
    lastUpdated: Date.now(),
    version: prevVersion + 1,
    metrics,
    triggeredRules,
    nodeMap: buildNodeMap(nodes),
  };
}

const INITIAL_METRICS: CalculatedValues = {
  totalMonthlyIncome: 0,
  totalMonthlyObligations: 0,
  totalSavingsBalance: 0,
  emergencyRunwayMonths: 0,
  debtToIncomeRatio: 0,
};

export const useGraphStore = create<GraphState & GraphActions>((set, get) => ({
  nodes: [],
  edges: [],
  lastUpdated: Date.now(),
  version: 0,
  metrics: INITIAL_METRICS,
  triggeredRules: [],
  alerts: [],
  dismissedAlertRuleIds: new Set(),
  selectedNodeId: null,
  selectedEdgeId: null,
  nodeMap: new Map(),

  init: (nodes, edges) => {
    const { metrics, triggeredRules } = deriveMetrics(nodes, edges);
    set({
      nodes,
      edges,
      lastUpdated: Date.now(),
      version: 1,
      metrics,
      triggeredRules,
      nodeMap: buildNodeMap(nodes),
      alerts: [],
      dismissedAlertRuleIds: new Set(),
    });
  },

  addNode: (node) => {
    const s = get();
    const nodes = [...s.nodes, node];
    set(commit(nodes, s.edges, s.version, s.dismissedAlertRuleIds));
  },

  updateNode: (id, changes) => {
    const s = get();
    const nodes = s.nodes.map((n) => (n.id === id ? { ...n, ...changes } : n));
    set(commit(nodes, s.edges, s.version, s.dismissedAlertRuleIds));
  },

  deleteNode: (id) => {
    const s = get();
    const nodes = s.nodes.filter((n) => n.id !== id);
    const edges = s.edges.filter((e) => e.source !== id && e.target !== id);
    const updates = commit(nodes, edges, s.version, s.dismissedAlertRuleIds);
    if (s.selectedNodeId === id) (updates as Partial<GraphState>).selectedNodeId = null;
    set(updates);
  },

  addEdge: (edge) => {
    const s = get();
    const edges = [...s.edges, edge];
    set(commit(s.nodes, edges, s.version, s.dismissedAlertRuleIds));
  },

  updateEdge: (id, changes) => {
    const s = get();
    const edges = s.edges.map((e) => (e.id === id ? { ...e, ...changes } : e));
    set(commit(s.nodes, edges, s.version, s.dismissedAlertRuleIds));
  },

  deleteEdge: (id) => {
    const s = get();
    const edges = s.edges.filter((e) => e.id !== id);
    const updates = commit(s.nodes, edges, s.version, s.dismissedAlertRuleIds);
    if (s.selectedEdgeId === id) (updates as Partial<GraphState>).selectedEdgeId = null;
    set(updates);
  },

  bulkAdd: (newNodes, newEdges) => {
    const s = get();
    const nodes = [...s.nodes, ...newNodes];
    const edges = [...s.edges, ...newEdges];
    set(commit(nodes, edges, s.version, s.dismissedAlertRuleIds));
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),

  setAlerts: (alerts) => set({ alerts }),

  dismissAlert: (alertId) => {
    const s = get();
    const alert = s.alerts.find((a) => a.id === alertId);
    const newDismissed = new Set(s.dismissedAlertRuleIds);
    if (alert) newDismissed.add(alert.ruleId);
    set({
      alerts: s.alerts.filter((a) => a.id !== alertId),
      dismissedAlertRuleIds: newDismissed,
    });
  },

  clearDismissals: () => set({ dismissedAlertRuleIds: new Set() }),
}));

// Selectors
export const selectNodes = (s: GraphState) => s.nodes;
export const selectEdges = (s: GraphState) => s.edges;
export const selectVersion = (s: GraphState) => s.version;
export const selectMetrics = (s: GraphState) => s.metrics;
export const selectTriggeredRules = (s: GraphState) => s.triggeredRules;
export const selectAlerts = (s: GraphState) => s.alerts;
export const selectNodeMap = (s: GraphState) => s.nodeMap;
export const selectSelectedNodeId = (s: GraphState) => s.selectedNodeId;
export const selectSelectedEdgeId = (s: GraphState) => s.selectedEdgeId;

export function selectTotalIncome(s: GraphState): number {
  return s.nodes.filter((n) => n.type === "income").reduce((sum, n) => sum + n.monthlyFlow, 0);
}

export function selectTotalExpenses(s: GraphState): number {
  return s.nodes
    .filter((n) => n.type === "expense" || n.type === "debt")
    .reduce((sum, n) => sum + n.monthlyFlow, 0);
}

export function selectNetWorth(s: GraphState): number {
  let nw = 0;
  for (const n of s.nodes) {
    if (n.type === "savings" || n.type === "investment") nw += n.currentValue;
    if (n.type === "debt") nw -= n.currentValue;
  }
  return nw;
}

export function selectMonthlyCashflow(s: GraphState): number {
  return selectTotalIncome(s) - s.metrics.totalMonthlyObligations;
}

export function selectSavingsRate(s: GraphState): number {
  const income = selectTotalIncome(s);
  if (income <= 0) return 0;
  const savingsContrib = s.nodes.filter((n) => n.type === "savings").reduce((sum, n) => sum + n.monthlyFlow, 0);
  const investContrib = s.nodes.filter((n) => n.type === "investment").reduce((sum, n) => sum + n.monthlyFlow, 0);
  return ((savingsContrib + investContrib) / income) * 100;
}

export function selectConnectedFlows(s: GraphState): FinancialFlowData[] {
  if (!s.selectedNodeId) return [];
  return s.edges.filter(
    (f) => f.source === s.selectedNodeId || f.target === s.selectedNodeId
  );
}

export function selectConnectedNodeIds(s: GraphState): Set<string> {
  if (!s.selectedNodeId) return new Set();
  const ids = new Set<string>();
  ids.add(s.selectedNodeId);
  for (const f of s.edges) {
    if (f.source === s.selectedNodeId) ids.add(f.target);
    if (f.target === s.selectedNodeId) ids.add(f.source);
  }
  return ids;
}
