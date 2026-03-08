"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { getNodeColor } from "@/lib/graph-theme";
import type { FinancialFlowData } from "@/types/graph";
import type { GraphSnapshotNode } from "@/components/graph/three-graph";

const PAD = 48;

const COLOR_LOWERED = "#ff4d6d";
const COLOR_RAISED = "#00ff88";

export interface SimulationGraphProps {
  width: number;
  height: number;
  nodes: GraphSnapshotNode[];
  flows: FinancialFlowData[];
  /** "before" = original values/colors; "after" = same graph with what-if applied in place */
  viewMode: "before" | "after";
  /** The node whose value was changed by the simulation (e.g. salary lowered) */
  changedNodeId?: string | null;
  /** In "after" view: show this node red (lowered) or green (raised) with updated $ */
  changedNodeDirection?: "lowered" | "raised" | null;
  /** In "after" view: other node ids in the impact chain — show with ring only */
  impactedNodeIds?: Set<string>;
  /** Node id that should show pulse/attention (phase 1) */
  pulseNodeId?: string | null;
  /** Edge ids that should show bright pulse (phase 3) */
  brightEdgeIds?: Set<string>;
}

function computeBounds(
  nodes: GraphSnapshotNode[],
  flows: FinancialFlowData[],
  posMap: Map<string, GraphSnapshotNode>
): { minX: number; minY: number; maxX: number; maxY: number; layoutW: number; layoutH: number } {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 400, maxY: 300, layoutW: 800, layoutH: 600 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const r = n.radius ?? 24;
    minX = Math.min(minX, n.x - r);
    minY = Math.min(minY, n.y - r);
    maxX = Math.max(maxX, n.x + r);
    maxY = Math.max(maxY, n.y + r);
  }
  for (const f of flows) {
    const src = posMap.get(f.source);
    const tgt = posMap.get(f.target);
    if (src) {
      minX = Math.min(minX, src.x);
      maxX = Math.max(maxX, src.x);
      minY = Math.min(minY, src.y);
      maxY = Math.max(maxY, src.y);
    }
    if (tgt) {
      minX = Math.min(minX, tgt.x);
      maxX = Math.max(maxX, tgt.x);
      minY = Math.min(minY, tgt.y);
      maxY = Math.max(maxY, tgt.y);
    }
  }
  if (!Number.isFinite(minX)) minX = 0;
  if (!Number.isFinite(minY)) minY = 0;
  if (!Number.isFinite(maxX)) maxX = 400;
  if (!Number.isFinite(maxY)) maxY = 300;
  const layoutW = maxX - minX + 2 * PAD;
  const layoutH = maxY - minY + 2 * PAD;
  return { minX, minY, maxX, maxY, layoutW, layoutH };
}

export function SimulationGraph({
  width,
  height,
  nodes,
  flows,
  viewMode,
  changedNodeId = null,
  changedNodeDirection = null,
  impactedNodeIds,
  pulseNodeId = null,
  brightEdgeIds = new Set(),
}: SimulationGraphProps) {
  const posMap = useMemo(() => {
    const m = new Map<string, GraphSnapshotNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const { scale, tx, ty, minX, minY, layoutW, layoutH } = useMemo(() => {
    const bounds = computeBounds(nodes, flows, posMap);
    const { minX: mx, minY: my, layoutW: lw, layoutH: lh } = bounds;
    const sx = width / lw;
    const sy = height / lh;
    const s = Math.min(sx, sy, 2) * 0.92;
    const tx = width / 2 - (lw / 2) * s;
    const ty = height / 2 - (lh / 2) * s;
    return { scale: s, tx, ty, minX: mx, minY: my, layoutW: lw, layoutH: lh };
  }, [width, height, nodes, flows, posMap]);

  const toLocal = useMemo(
    () => (x: number, y: number) => ({ x: x - minX + PAD, y: y - minY + PAD }),
    [minX, minY]
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: "transparent" }}
    >
      <div
        className="absolute sim-graph-layer"
        style={{
          width: layoutW,
          height: layoutH,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Edges */}
        <svg
          className="absolute sim-edges"
          width={layoutW}
          height={layoutH}
          style={{
            left: 0,
            top: 0,
            zIndex: 1,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {flows.map((flow) => {
            const src = posMap.get(flow.source);
            const tgt = posMap.get(flow.target);
            if (!src || !tgt) return null;
            const p1 = toLocal(src.x, src.y);
            const p2 = toLocal(tgt.x, tgt.y);
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const curveOffset = Math.min(len * 0.08, 20);
            const nx = (-dy / len) * curveOffset;
            const ny = (dx / len) * curveOffset;
            const mx = (p1.x + p2.x) / 2 + nx;
            const my = (p1.y + p2.y) / 2 + ny;
            const isBright = brightEdgeIds.has(flow.id);
            return (
              <path
                key={flow.id}
                className={isBright ? "sim-edge sim-edge-bright" : "sim-edge"}
                d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                fill="none"
                stroke={isBright ? "#7F7FFA" : "rgba(127,127,250,0.35)"}
                strokeWidth={isBright ? 2.8 : 1.4}
                strokeDasharray={isBright ? "none" : "6 8"}
                style={{
                  opacity: isBright ? 1 : 0.9,
                  transition: "stroke 300ms ease, stroke-width 300ms ease, opacity 300ms ease",
                  animationDelay: `${(flows.indexOf(flow) % 12) * 0.12}s`,
                }}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const isChangedNode = changedNodeId === node.id;
          const showAsLowered = viewMode === "after" && isChangedNode && changedNodeDirection === "lowered";
          const showAsRaised = viewMode === "after" && isChangedNode && changedNodeDirection === "raised";
          const color =
            showAsLowered ? COLOR_LOWERED
            : showAsRaised ? COLOR_RAISED
            : getNodeColor(node.type) ?? "#7F7FFA";
          const displayValue = (node.currentValue !== 0 ? node.currentValue : node.monthlyFlow) ?? 0;
          const isPulse = pulseNodeId === node.id;
          const diameter = node.radius * 2;
          const pos = toLocal(node.x, node.y);
          return (
            <div
              key={node.id}
              className="absolute select-none pointer-events-none sim-node"
              style={{
                left: pos.x,
                top: pos.y,
                transform: `translate(-50%, -50%) scale(${isPulse ? 1.08 : 1})`,
                transition: "transform 400ms ease, background-color 400ms ease, box-shadow 400ms ease",
                zIndex: isPulse ? 10 : 2,
              }}
            >
              <div
                className="sim-node-float"
                style={{ animationDelay: `${(nodes.indexOf(node) % 10) * 0.18}s` }}
              >
                <div
                  className="rounded-full w-full h-full"
                  style={{
                    width: diameter,
                    height: diameter,
                    backgroundColor: color,
                    boxShadow: isPulse ? `0 0 24px ${color}88` : "none",
                  }}
                />
                <div
                  className="absolute left-1/2 -translate-x-1/2 text-center"
                  style={{
                    top: diameter + 4,
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: 9,
                    lineHeight: 1.35,
                    fontWeight: 500,
                    maxWidth: 90,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <div className="truncate" title={node.label} style={{ color: "#fff" }}>
                    {node.label}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 2, color }}>
                    {formatCurrency(displayValue)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
