import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { FinancialNodeType } from "@/types/graph";

// ---------------------------------------------------------------------------
// Layout node / link types for the simulation
// ---------------------------------------------------------------------------

interface LayoutNode extends SimulationNodeDatum {
  id: string;
  type: FinancialNodeType;
  radius: number;
}

interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
  source: string;
  target: string;
}

// ---------------------------------------------------------------------------
// Force layout computation
//
// Purely topology-driven: highly-connected nodes gravitate to the center
// naturally because link forces pull them toward all their neighbors.
// Leaf nodes fan out organically. No type-based zones.
//
// Tuned for ~30 nodes: wider initial scatter, stronger repulsion,
// shorter link distances so clusters stay tighter.
// ---------------------------------------------------------------------------

export function computeForceLayout(
  nodes: { id: string; type: FinancialNodeType; radius: number }[],
  links: { source: string; target: string }[],
  width: number,
  height: number,
  pinnedPositions?: Map<string, { x: number; y: number }>
): Map<string, { x: number; y: number }> {
  const cx = width / 2;
  const cy = height / 2;

  const simNodes: LayoutNode[] = nodes.map((n) => {
    const pinned = pinnedPositions?.get(n.id);
    return {
      id: n.id,
      type: n.type,
      radius: n.radius,
      x: pinned?.x ?? cx + (Math.random() - 0.5) * 600,
      y: pinned?.y ?? cy + (Math.random() - 0.5) * 500,
      fx: pinned ? pinned.x : undefined,
      fy: pinned ? pinned.y : undefined,
    };
  });

  const simLinks: LayoutLink[] = links.map((l) => ({
    source: l.source,
    target: l.target,
  }));

  const sim = forceSimulation<LayoutNode>(simNodes)
    .force(
      "link",
      forceLink<LayoutNode, LayoutLink>(simLinks)
        .id((d) => d.id)
        .distance(120)
        .strength(0.4)
    )
    .force("charge", forceManyBody<LayoutNode>().strength(-400))
    .force("center", forceCenter(cx, cy).strength(0.03))
    .force(
      "collide",
      forceCollide<LayoutNode>()
        .radius((d) => d.radius + 24)
        .strength(0.9)
        .iterations(3)
    )
    .alphaDecay(0.018)
    .stop();

  for (let i = 0; i < 350; i++) sim.tick();

  const positions = new Map<string, { x: number; y: number }>();
  for (const n of simNodes) {
    positions.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
  }
  return positions;
}
