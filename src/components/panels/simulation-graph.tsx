"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { getNodeColor } from "@/lib/graph-theme";
import type { FinancialFlowData } from "@/types/graph";
import type { GraphSnapshotNode } from "@/components/graph/three-graph";

const LAYOUT_RADIUS_X = 320;
const LAYOUT_RADIUS_Y = 180;

export interface SimulationGraphProps {
  width: number;
  height: number;
  nodes: GraphSnapshotNode[];
  flows: FinancialFlowData[];
  /** "before" = original values/colors; "after" = simulated values/colors */
  viewMode: "before" | "after";
  /** For "after" view: node id -> display color override (#ff4d6d | #00ff88 | undefined) */
  nodeColorOverrides?: Map<string, string>;
  /** Node id that should show pulse/attention (phase 1) */
  pulseNodeId?: string | null;
  /** Edge ids that should show bright pulse (phase 3) */
  brightEdgeIds?: Set<string>;
}

export function SimulationGraph({
  width,
  height,
  nodes,
  flows,
  viewMode,
  nodeColorOverrides = new Map(),
  pulseNodeId = null,
  brightEdgeIds = new Set(),
}: SimulationGraphProps) {
  const { scale, tx, ty } = useMemo(() => {
    const sx = width / (2 * LAYOUT_RADIUS_X);
    const sy = height / (2 * LAYOUT_RADIUS_Y);
    const s = Math.min(sx, sy, 1) * 0.95;
    return { scale: s, tx: width / 2, ty: height / 2 };
  }, [width, height]);

  const posMap = useMemo(() => {
    const m = new Map<string, GraphSnapshotNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: "transparent" }}
    >
      <div
        className="absolute"
        style={{
          width: width,
          height: height,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Edges */}
        <svg
          className="absolute"
          width={width}
          height={height}
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
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const curveOffset = Math.min(len * 0.08, 20);
            const nx = (-dy / len) * curveOffset;
            const ny = (dx / len) * curveOffset;
            const mx = (src.x + tgt.x) / 2 + nx;
            const my = (src.y + tgt.y) / 2 + ny;
            const isBright = brightEdgeIds.has(flow.id);
            return (
              <path
                key={flow.id}
                d={`M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`}
                fill="none"
                stroke={isBright ? "#7F7FFA" : "rgba(127,127,250,0.35)"}
                strokeWidth={isBright ? 2.8 : 1.4}
                style={{
                  opacity: isBright ? 1 : 0.9,
                  transition: "stroke 300ms ease, stroke-width 300ms ease, opacity 300ms ease",
                }}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const overrideColor = viewMode === "after" ? nodeColorOverrides.get(node.id) : undefined;
          const color = overrideColor ?? getNodeColor(node.type) ?? "#7F7FFA";
          const displayValue = (node.currentValue !== 0 ? node.currentValue : node.monthlyFlow) ?? 0;
          const isPulse = pulseNodeId === node.id;
          const diameter = node.radius * 2;
          return (
            <div
              key={node.id}
              className="absolute select-none pointer-events-none"
              style={{
                left: node.x,
                top: node.y,
                transform: `translate(-50%, -50%) scale(${isPulse ? 1.08 : 1})`,
                transition: "transform 400ms ease, background-color 400ms ease, box-shadow 400ms ease",
                zIndex: isPulse ? 10 : 2,
              }}
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
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
                style={{
                  top: diameter + 4,
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 9,
                  color,
                  lineHeight: 1.25,
                  fontWeight: 500,
                }}
              >
                {formatCurrency(displayValue)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
