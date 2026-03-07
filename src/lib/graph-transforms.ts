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
// Node radius (sqrt-scaled from monthly flow) — smaller for denser graphs
// ---------------------------------------------------------------------------

const MIN_RADIUS = 12;
const MAX_RADIUS = 30;
const REFERENCE_FLOW = 8500;

export function computeNodeRadius(monthlyFlow: number): number {
  if (monthlyFlow <= 0) return MIN_RADIUS;
  const t = Math.sqrt(monthlyFlow) / Math.sqrt(REFERENCE_FLOW);
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.min(t, 1);
}

// Re-export for consumers that used this from graph-transforms before
export { getNodeColor } from "@/lib/graph-theme";

// ---------------------------------------------------------------------------
// Determine which nodes get visible labels (largest per type group)
// ---------------------------------------------------------------------------

function computeLabeledNodes(nodes: FinancialNodeData[]): Set<string> {
  const largestByType = new Map<FinancialNodeType, { id: string; flow: number }>();

  for (const n of nodes) {
    const current = largestByType.get(n.type);
    if (!current || n.monthlyFlow > current.flow) {
      largestByType.set(n.type, { id: n.id, flow: n.monthlyFlow });
    }
  }

  return new Set(Array.from(largestByType.values()).map((v) => v.id));
}

// ---------------------------------------------------------------------------
// Domain -> React Flow transforms
// ---------------------------------------------------------------------------

export function toReactFlowNodes(
  nodes: FinancialNodeData[],
  positions: Map<string, { x: number; y: number }>
): Node<NodeRfData>[] {
  const labeled = computeLabeledNodes(nodes);

  return nodes.map((n) => {
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
    const radius = computeNodeRadius(n.monthlyFlow);

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
