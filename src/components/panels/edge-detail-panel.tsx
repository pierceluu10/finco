"use client";

import { X, ArrowRight, Trash2 } from "lucide-react";
import type { FinancialFlowData, FinancialNodeData } from "@/types/graph";
import { formatCurrency } from "@/lib/utils";

interface EdgeDetailPanelProps {
  flow: FinancialFlowData;
  nodeMap: Map<string, FinancialNodeData>;
  onClose: () => void;
  onDelete: () => void;
}

export function EdgeDetailPanel({
  flow,
  nodeMap,
  onClose,
  onDelete,
}: EdgeDetailPanelProps) {
  const sourceNode = nodeMap.get(flow.source);
  const targetNode = nodeMap.get(flow.target);

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-72 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <span className="text-xs font-medium text-zinc-300">Flow Detail</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Direction */}
        <div className="flex items-center gap-2 justify-center py-1">
          <span className="text-xs text-zinc-300 font-medium truncate max-w-[90px]">
            {sourceNode?.label ?? flow.source}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <span className="text-xs text-zinc-300 font-medium truncate max-w-[90px]">
            {targetNode?.label ?? flow.target}
          </span>
        </div>

        {/* Amount */}
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Amount</span>
          <span className="text-zinc-200">
            {formatCurrency(flow.amount)}
          </span>
        </div>

        {/* Frequency */}
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Frequency</span>
          <span className="text-zinc-300 capitalize">{flow.frequency}</span>
        </div>
      </div>

      {/* Delete */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
        >
          <Trash2 className="h-3 w-3" />
          Remove Flow
        </button>
      </div>
    </div>
  );
}
