"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeRfData } from "@/types/graph";
import { formatCurrency } from "@/lib/utils";

function FinancialNodeComponent({ data, selected }: NodeProps<NodeRfData>) {
  const { radius, color, label, showLabel, monthlyFlow } = data;
  const diameter = radius * 2;

  return (
    <div
      className="group relative"
      style={{ width: diameter, height: diameter }}
    >
      {/* Selection ring */}
      {selected && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -4,
            border: `2px solid ${color}`,
            opacity: 0.6,
          }}
        />
      )}

      {/* Node circle */}
      <div
        className="rounded-full w-full h-full transition-opacity duration-150 group-hover:!opacity-95"
        style={{
          backgroundColor: color,
          opacity: selected ? 1 : 0.85,
        }}
      />

      {/* Single invisible centered handle for targets */}
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-px !h-px !min-w-0 !min-h-0 !border-0 !bg-transparent"
        style={{ top: "50%", left: "50%" }}
      />
      {/* Single invisible centered handle for sources */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-px !h-px !min-w-0 !min-h-0 !border-0 !bg-transparent"
        style={{ top: "50%", left: "50%" }}
      />

      {/* Label beneath the node (only largest per type) */}
      {showLabel && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none select-none"
          style={{ top: diameter + 6 }}
        >
          <span className="text-[11px] text-zinc-400 font-medium">
            {label}
          </span>
        </div>
      )}

      {/* Hover tooltip (above node) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ bottom: diameter + 8 }}
      >
        <div className="rounded-md bg-zinc-900 border border-white/10 px-2.5 py-1.5 shadow-lg whitespace-nowrap">
          <p className="text-xs font-medium text-zinc-200">{label}</p>
          {monthlyFlow > 0 && (
            <p className="text-[10px] text-zinc-500 font-mono">
              {formatCurrency(monthlyFlow)}/mo
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const FinancialNode = memo(FinancialNodeComponent);
