"use client";

import { memo, useState } from "react";
import type { EdgeProps } from "reactflow";
import type { EdgeRfData } from "@/types/graph";
import { EDGE_COLOR_DEFAULT, EDGE_COLOR_ACTIVE } from "@/lib/graph-theme";
import { formatCurrency } from "@/lib/utils";

function FinancialEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}: EdgeProps<EdgeRfData>) {
  const [hovered, setHovered] = useState(false);
  const isActive = selected || hovered;

  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Wider invisible hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
      />

      <path
        id={id}
        d={edgePath}
        fill="none"
        markerEnd={markerEnd as string}
        style={{
          stroke: isActive ? EDGE_COLOR_ACTIVE : EDGE_COLOR_DEFAULT,
          strokeWidth: isActive ? 2 : 1.5,
          transition: "stroke 0.15s, stroke-width 0.15s",
        }}
      />

      {isActive && data && (
        <foreignObject
          x={labelX - 52}
          y={labelY - 14}
          width={104}
          height={28}
          className="pointer-events-none overflow-visible"
        >
          <div className="flex items-center justify-center">
            <span className="rounded bg-zinc-900/95 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-300 whitespace-nowrap shadow-lg">
              {formatCurrency(data.amount)}/mo
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

export const FinancialEdge = memo(FinancialEdgeComponent);
