"use client";

import { useState, useMemo, useCallback } from "react";
import { demoNodes, demoEdges } from "@/lib/demo-data";
import { getNodeColor, formatCurrency } from "@/lib/utils";
import { GraphLegend } from "@/components/graph/graph-legend";

interface NodePosition {
  x: number;
  y: number;
}

function layoutNodes(nodes: typeof demoNodes): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const cx = 500;
  const cy = 400;

  const grouped: Record<string, typeof demoNodes> = {};
  nodes.forEach((n) => {
    if (!grouped[n.type]) grouped[n.type] = [];
    grouped[n.type].push(n);
  });

  const typeOrder = ["income", "account", "savings", "investment", "expense", "debt"];
  const rings: Record<string, number> = {
    income: 0,
    account: 0,
    savings: 180,
    investment: 210,
    expense: 140,
    debt: 250,
  };

  typeOrder.forEach((type) => {
    const group = grouped[type] || [];
    const ring = rings[type];

    if (type === "account") {
      group.forEach((n) => positions.set(n._id, { x: cx, y: cy }));
      return;
    }
    if (type === "income") {
      group.forEach((n) => positions.set(n._id, { x: cx, y: cy - 220 }));
      return;
    }

    const startAngle = type === "expense" ? -60 : type === "debt" ? 100 : type === "savings" ? 200 : 240;
    const spread = type === "expense" ? 180 : 70;

    group.forEach((n, i) => {
      const angle = startAngle + (group.length > 1 ? (spread / (group.length - 1)) * i : 0);
      const rad = (angle * Math.PI) / 180;
      positions.set(n._id, {
        x: cx + ring * Math.cos(rad),
        y: cy + ring * Math.sin(rad),
      });
    });
  });

  return positions;
}

function getRadius(weight: number): number {
  if (weight <= 0) return 24;
  const minR = 16;
  const maxR = 42;
  const maxWeight = 8500;
  return minR + ((maxR - minR) * Math.sqrt(weight)) / Math.sqrt(maxWeight);
}

export default function EcosystemPage() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const positions = useMemo(() => layoutNodes(demoNodes), []);

  const handleMouseEnter = useCallback(
    (id: string, event: React.MouseEvent) => {
      setHoveredNode(id);
      const rect = (event.currentTarget as SVGElement).closest("svg")!.getBoundingClientRect();
      setTooltipPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top - 10,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const hoveredNodeData = hoveredNode ? demoNodes.find((n) => n._id === hoveredNode) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ecosystem</h1>
          <p className="text-sm text-muted-foreground">
            Your complete financial network
          </p>
        </div>
        <GraphLegend />
      </div>

      <div className="relative rounded-xl border border-white/5 bg-card/50 backdrop-blur-sm">
        <svg
          viewBox="0 0 1000 800"
          className="h-[680px] w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {demoEdges.map((edge, i) => {
            const from = positions.get(edge.source);
            const to = positions.get(edge.target);
            if (!from || !to) return null;
            const isHighlighted =
              hoveredNode === edge.source || hoveredNode === edge.target;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isHighlighted ? "rgba(127,127,250,0.5)" : "rgba(255,255,255,0.06)"}
                strokeWidth={isHighlighted ? 2 : 1}
                style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
              />
            );
          })}

          {demoNodes.map((node) => {
            const pos = positions.get(node._id);
            if (!pos) return null;
            const r = getRadius(node.monthly_weight);
            const color = getNodeColor(node.type);
            const isHovered = hoveredNode === node._id;

            return (
              <g
                key={node._id}
                onMouseEnter={(e) => handleMouseEnter(node._id, e)}
                onMouseLeave={handleMouseLeave}
                className="cursor-pointer"
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 4}
                  fill="transparent"
                  stroke={isHovered ? color : "transparent"}
                  strokeWidth={2}
                  opacity={isHovered ? 0.5 : 0}
                  style={{ transition: "opacity 0.2s" }}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={color}
                  opacity={isHovered ? 1 : 0.7}
                  style={{ transition: "opacity 0.2s" }}
                />
                <text
                  x={pos.x}
                  y={pos.y + r + 16}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredNodeData && (
          <div
            className="pointer-events-none absolute z-50 w-56 rounded-lg border border-white/10 bg-card p-3 shadow-xl backdrop-blur-md"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: getNodeColor(hoveredNodeData.type) }}
              />
              <span className="text-sm font-semibold">{hoveredNodeData.label}</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Type</span>
                <span className="capitalize text-foreground">{hoveredNodeData.type}</span>
              </div>
              {hoveredNodeData.current_value > 0 && (
                <div className="flex justify-between">
                  <span>Value</span>
                  <span className="font-mono text-foreground">
                    {formatCurrency(hoveredNodeData.current_value)}
                  </span>
                </div>
              )}
              {hoveredNodeData.monthly_weight > 0 && (
                <div className="flex justify-between">
                  <span>Monthly</span>
                  <span className="font-mono text-foreground">
                    {formatCurrency(hoveredNodeData.monthly_weight)}
                  </span>
                </div>
              )}
              {hoveredNodeData.metadata_json &&
                Object.entries(hoveredNodeData.metadata_json).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="max-w-[120px] truncate text-foreground">
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
