"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import type { DeletionImpact, FinancialNodeData } from "@/types/graph";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impact: DeletionImpact | null;
  nodeMap: Map<string, FinancialNodeData>;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  impact,
  nodeMap,
  onConfirm,
}: DeleteConfirmDialogProps) {
  if (!impact) return null;

  const totalFlows = impact.inboundFlows.length + impact.outboundFlows.length;
  const hasDisconnected = impact.disconnectedNodeIds.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-full bg-red-500/10 p-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-sm font-semibold text-zinc-100">
                Delete &ldquo;{impact.node.label}&rdquo;?
              </Dialog.Title>
              <Dialog.Description className="text-xs text-zinc-500 mt-1">
                This action cannot be undone.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition">
              <X className="h-3.5 w-3.5" />
            </Dialog.Close>
          </div>

          <div className="space-y-2 mb-5">
            {totalFlows > 0 && (
              <div className="rounded-lg bg-zinc-900/50 border border-white/5 p-3">
                <p className="text-xs text-zinc-400">
                  <span className="text-zinc-200 font-medium">{totalFlows} flow{totalFlows !== 1 ? "s" : ""}</span>{" "}
                  will be removed ({impact.inboundFlows.length} inbound, {impact.outboundFlows.length} outbound).
                </p>
              </div>
            )}

            {hasDisconnected && (
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                <p className="text-xs text-amber-400 mb-1.5 font-medium">
                  Nodes that will become disconnected:
                </p>
                <ul className="space-y-0.5">
                  {impact.disconnectedNodeIds.map((id) => (
                    <li key={id} className="text-xs text-zinc-400">
                      {nodeMap.get(id)?.label ?? id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className="rounded-lg bg-red-500/20 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/30 transition"
            >
              Delete Node
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
