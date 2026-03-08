"use client";

import { X, Pencil, Trash2, ArrowRight } from "lucide-react";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";
import { getNodeColor } from "@/lib/graph-theme";
import { formatCurrency } from "@/lib/utils";

interface NodeDetailPanelProps {
  node: FinancialNodeData;
  connectedFlows: FinancialFlowData[];
  nodeMap: Map<string, FinancialNodeData>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NodeDetailPanel({
  node,
  connectedFlows,
  nodeMap,
  onClose,
  onEdit,
  onDelete,
}: NodeDetailPanelProps) {
  const color = getNodeColor(node.type);
  const inbound = connectedFlows.filter((f) => f.target === node.id);
  const outbound = connectedFlows.filter((f) => f.source === node.id);

  return (
    <div className="w-72 h-full border-l border-white/5 bg-zinc-950/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100 truncate">
              {node.label}
            </h3>
            <p className="text-xs text-zinc-500 capitalize">{node.type}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3 border-b border-white/5">
        {node.monthlyFlow > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Monthly flow</span>
            <span className="text-zinc-200">
              {formatCurrency(node.monthlyFlow)}
            </span>
          </div>
        )}
        {node.currentValue > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Current value</span>
            <span className="text-zinc-200">
              {formatCurrency(node.currentValue)}
            </span>
          </div>
        )}
        {node.metadata &&
          Object.entries(node.metadata).map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-zinc-500 capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <span className="text-zinc-300 max-w-[120px] truncate text-right">
                {Array.isArray(val) ? val.join(", ") : String(val)}
              </span>
            </div>
          ))}
      </div>

      {/* Flows */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {inbound.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
              Receiving from
            </p>
            {inbound.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 text-xs py-1.5"
              >
                <span className="text-zinc-400 truncate flex-1">
                  {nodeMap.get(f.source)?.label ?? f.source}
                </span>
                <ArrowRight className="h-3 w-3 text-zinc-600 shrink-0" />
                <span className="text-zinc-300 shrink-0 tabular-nums">
                  {formatCurrency(f.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {outbound.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
              Paying to
            </p>
            {outbound.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 text-xs py-1.5"
              >
                <span className="text-zinc-400 truncate flex-1">
                  {nodeMap.get(f.target)?.label ?? f.target}
                </span>
                <ArrowRight className="h-3 w-3 text-zinc-600 shrink-0" />
                <span className="text-zinc-300 shrink-0 tabular-nums">
                  {formatCurrency(f.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {connectedFlows.length === 0 && (
          <p className="text-xs text-zinc-600">
            No connections. This node is isolated.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-4 border-t border-white/5">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 transition"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </div>
  );
}
