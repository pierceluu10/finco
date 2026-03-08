/**
 * Deterministic ripple calculation for simulation mode.
 * Uses topological order from the modified node to propagate changes
 * proportionally along flow edges. Pure JavaScript, no AI.
 */

import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

/** Which field we treat as the "value" for a node (for sizing and propagation). */
function getNodeValue(node: FinancialNodeData): number {
  const isFlowType = node.type === "income" || node.type === "expense";
  return isFlowType ? node.monthlyFlow : node.currentValue;
}

function setNodeValue(
  node: FinancialNodeData,
  value: number
): Partial<Pick<FinancialNodeData, "currentValue" | "monthlyFlow">> {
  const isFlowType = node.type === "income" || node.type === "expense";
  if (isFlowType) return { monthlyFlow: Math.max(0, value) };
  return { currentValue: Math.max(0, value) };
}

/**
 * Build directed adjacency: for each node, list of { neighborId, amount } for outbound edges.
 */
function getOutboundFlowAmounts(
  flows: FinancialFlowData[],
  nodeId: string
): { targetId: string; amount: number }[] {
  return flows
    .filter((f) => f.source === nodeId)
    .map((f) => ({ targetId: f.target, amount: f.amount }));
}

/**
 * Topological order from `startNodeId` following directed edges (source → target).
 * Uses BFS so we process nodes in propagation order.
 */
function topologicalOrderFrom(
  nodes: FinancialNodeData[],
  flows: FinancialFlowData[],
  startNodeId: string
): string[] {
  const order: string[] = [startNodeId];
  const seen = new Set<string>([startNodeId]);
  const queue: string[] = [startNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const outbound = getOutboundFlowAmounts(flows, id);
    for (const { targetId } of outbound) {
      if (!seen.has(targetId)) {
        seen.add(targetId);
        order.push(targetId);
        queue.push(targetId);
      }
    }
  }
  return order;
}

/**
 * Compute new node values after changing one node's value.
 * - Modified node gets the new value.
 * - Downstream nodes (reachable via source→target) get a proportional delta:
 *   targetDelta = sum over inbound edges of (edgeAmount / sourceOldValue) * sourceDelta
 *   targetNewValue = targetOldValue + targetDelta
 * All values are kept >= 0.
 */
export function computeRipple(
  nodes: FinancialNodeData[],
  flows: FinancialFlowData[],
  modifiedNodeId: string,
  newValue: number
): FinancialNodeData[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const order = topologicalOrderFrom(nodes, flows, modifiedNodeId);
  const result = new Map<string, FinancialNodeData>();
  const values = new Map<string, number>();

  for (const id of order) {
    const node = nodeMap.get(id);
    if (!node) continue;
    const oldVal = getNodeValue(node);
    let newVal: number;
    if (id === modifiedNodeId) {
      newVal = Math.max(0, newValue);
    } else {
      const inbound = flows.filter((f) => f.target === id);
      let delta = 0;
      for (const f of inbound) {
        const sourceNode = nodeMap.get(f.source);
        if (!sourceNode) continue;
        const sourceOld = getNodeValue(sourceNode);
        const sourceNew = values.get(f.source) ?? sourceOld;
        if (sourceOld !== 0) {
          const sourceDelta = sourceNew - sourceOld;
          delta += (f.amount / sourceOld) * sourceDelta;
        }
      }
      newVal = Math.max(0, oldVal + delta);
    }
    values.set(id, newVal);
    const updates = setNodeValue(node, newVal);
    result.set(id, { ...node, ...updates });
  }

  // Any node not in the order keeps its original value
  for (const node of nodes) {
    if (!result.has(node.id)) {
      result.set(node.id, { ...node });
    }
  }

  return Array.from(result.values());
}
