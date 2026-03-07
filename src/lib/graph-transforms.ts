import type { Node, Edge } from "reactflow";
import { MarkerType } from "reactflow";
import type {
  FinancialNodeData,
  FinancialFlowData,
  FinancialNodeType,
  NodeRfData,
  EdgeRfData,
} from "@/types/graph";
import { getNodeColor, EDGE_ARROW_COLOR, EDGE_COLOR_DEFAULT } from "@/lib/graph-theme";

// ---------------------------------------------------------------------------
// Financial weight — the single "amount" used for sizing each node
// ---------------------------------------------------------------------------

const MIN_RADIUS = 20;
const MAX_RADIUS = 70;

export function getNodeFinancialWeight(node: FinancialNodeData): number {
  return Math.max(node.currentValue, node.monthlyFlow) || 1;
}

export function computeNodeRadius(
  amount: number,
  minAmount: number,
  maxAmount: number
): number {
  const sqrtAmt = Math.sqrt(amount);
  const sqrtMin = Math.sqrt(minAmount);
  const sqrtMax = Math.sqrt(maxAmount);
  const range = sqrtMax - sqrtMin;
  if (range <= 0) return (MIN_RADIUS + MAX_RADIUS) / 2;
  const t = (sqrtAmt - sqrtMin) / range;
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

export function computeAllRadii(
  nodes: FinancialNodeData[]
): Map<string, number> {
  const weights = nodes.map((n) => getNodeFinancialWeight(n));
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const m = new Map<string, number>();
  for (let i = 0; i < nodes.length; i++) {
    m.set(nodes[i].id, computeNodeRadius(weights[i], minW, maxW));
  }
  return m;
}

// Re-export for consumers
export { getNodeColor } from "@/lib/graph-theme";

// ---------------------------------------------------------------------------
// Determine which nodes get visible labels (largest per type group)
// ---------------------------------------------------------------------------

function computeLabeledNodes(nodes: FinancialNodeData[]): Set<string> {
  const largestByType = new Map<FinancialNodeType, { id: string; flow: number }>();

  for (const n of nodes) {
    const w = getNodeFinancialWeight(n);
    const current = largestByType.get(n.type);
    if (!current || w > current.flow) {
      largestByType.set(n.type, { id: n.id, flow: w });
    }
  }

  return new Set(Array.from(largestByType.values()).map((v) => v.id));
}

// ---------------------------------------------------------------------------
// Domain -> React Flow transforms
// ---------------------------------------------------------------------------

export function toReactFlowNodes(
  nodes: FinancialNodeData[],
  positions: Map<string, { x: number; y: number }>,
  radiiMap?: Map<string, number>
): Node<NodeRfData>[] {
  const labeled = computeLabeledNodes(nodes);
  const radii = radiiMap ?? computeAllRadii(nodes);

  return nodes.map((n, i) => {
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
    const radius = radii.get(n.id) ?? 30;

    return {
      id: n.id,
      type: "financial",
      position: { x: pos.x - radius, y: pos.y - radius },
      data: {
        label: n.label,
        type: n.type,
        currentValue: n.currentValue,
        monthlyFlow: n.monthlyFlow,
        radius,
        color: getNodeColor(n.type),
        showLabel: labeled.has(n.id),
        metadata: n.metadata,
        dimmed: false,
        floatDelay: -(((i * 1.7 + 0.3) % 8) * 1000),
        floatDuration: 4000 + ((i * 1337) % 4000),
      },
    };
  });
}

export function toReactFlowEdges(
  flows: FinancialFlowData[],
  nodeMap: Map<string, FinancialNodeData>
): Edge<EdgeRfData>[] {
  return flows.map((f) => ({
    id: f.id,
    source: f.source,
    target: f.target,
    type: "financial",
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: EDGE_ARROW_COLOR,
    },
    style: { stroke: EDGE_COLOR_DEFAULT, strokeWidth: 1.5 },
    data: {
      amount: f.amount,
      frequency: f.frequency,
      sourceLabel: nodeMap.get(f.source)?.label ?? f.source,
      targetLabel: nodeMap.get(f.target)?.label ?? f.target,
      dimmed: false,
    },
  }));
}

// ---------------------------------------------------------------------------
// Convert existing demo data format to domain types
// ---------------------------------------------------------------------------

export function fromDemoData(
  demoNodes: {
    _id: string;
    label: string;
    type: FinancialNodeType;
    current_value: number;
    monthly_weight: number;
    metadata_json: Record<string, unknown>;
  }[],
  demoEdges: {
    source: string;
    target: string;
    amount: number;
    frequency: string;
  }[]
): { nodes: FinancialNodeData[]; flows: FinancialFlowData[] } {
  const nodes: FinancialNodeData[] = demoNodes.map((n) => ({
    id: n._id,
    label: n.label,
    type: n.type,
    currentValue: n.current_value,
    monthlyFlow: n.monthly_weight,
    metadata: n.metadata_json,
  }));

  const flows: FinancialFlowData[] = demoEdges.map((e, i) => ({
    id: `flow-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    amount: e.amount,
    frequency: e.frequency as FinancialFlowData["frequency"],
  }));

  return { nodes, flows };
}
