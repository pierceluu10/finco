"use client";

import { useState, useCallback, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { X, Plus, Trash2, ChevronDown } from "lucide-react";
import type {
  FinancialNodeData,
  FinancialFlowData,
  FinancialNodeType,
  DialogMode,
} from "@/types/graph";

const NODE_TYPES: { value: FinancialNodeType; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "account", label: "Account" },
  { value: "expense", label: "Expense" },
  { value: "debt", label: "Debt" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
];

const FREQUENCIES: { value: FinancialFlowData["frequency"]; label: string }[] =
  [
    { value: "monthly", label: "Monthly" },
    { value: "biweekly", label: "Biweekly" },
    { value: "weekly", label: "Weekly" },
    { value: "annual", label: "Annual" },
    { value: "one-time", label: "One-time" },
  ];

interface Connection {
  targetId: string;
  direction: "to" | "from";
  amount: number;
  frequency: FinancialFlowData["frequency"];
}

interface AddNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DialogMode;
  existingNodes: FinancialNodeData[];
  editNode?: FinancialNodeData | null;
  editConnections?: Connection[];
  onSubmit: (
    data: Omit<FinancialNodeData, "id">,
    connections: Connection[]
  ) => void;
}

export function AddNodeDialog({
  open,
  onOpenChange,
  mode,
  existingNodes,
  editNode,
  editConnections,
  onSubmit,
}: AddNodeDialogProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FinancialNodeType>("expense");
  const [amount, setAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);

  // Sync form state when the dialog opens or switches between add/edit
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editNode) {
      setLabel(editNode.label);
      setType(editNode.type);
      setAmount(editNode.monthlyFlow.toString());
      setCurrentValue(editNode.currentValue.toString());
      setConnections(editConnections ?? []);
    } else {
      setLabel("");
      setType("expense");
      setAmount("");
      setCurrentValue("");
      setConnections([]);
    }
  }, [open, mode, editNode, editConnections]);

  const addConnection = useCallback(() => {
    const used = new Set(connections.map((c) => c.targetId));
    const available = existingNodes.filter((n) => !used.has(n.id));
    if (available.length === 0) return;
    setConnections((prev) => [
      ...prev,
      {
        targetId: available[0].id,
        direction: "from" as const,
        amount: 0,
        frequency: "monthly" as const,
      },
    ]);
  }, [connections, existingNodes]);

  const removeConnection = (index: number) => {
    setConnections((prev) => prev.filter((_, i) => i !== index));
  };

  const updateConnection = (index: number, updates: Partial<Connection>) => {
    setConnections((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    onSubmit(
      {
        label: label.trim(),
        type,
        monthlyFlow: parseFloat(amount) || 0,
        currentValue: parseFloat(currentValue) || 0,
        metadata: {},
      },
      connections
    );
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-zinc-100">
              {mode === "add" ? "Add Financial Node" : "Edit Node"}
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Name</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Groceries, Salary, TFSA"
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none focus:ring-0"
                autoFocus
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Type</label>
              <Select.Root
                value={type}
                onValueChange={(v) => setType(v as FinancialNodeType)}
              >
                <Select.Trigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="z-[60] rounded-lg border border-white/10 bg-zinc-900 p-1 shadow-xl"
                    position="popper"
                    sideOffset={4}
                  >
                    <Select.Viewport>
                      {NODE_TYPES.map((t) => (
                        <Select.Item
                          key={t.value}
                          value={t.value}
                          className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-zinc-300 outline-none hover:bg-white/5 data-[highlighted]:bg-white/5"
                        >
                          <Select.ItemText>{t.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Amount fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Monthly flow
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none focus:ring-0 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Current value
                </label>
                <input
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none focus:ring-0 font-sans"
                />
              </div>
            </div>

            {/* Connections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">
                  Connections
                </label>
                <button
                  type="button"
                  onClick={addConnection}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>

              {connections.length === 0 && (
                <p className="text-xs text-zinc-600 py-2">
                  No connections yet. Add one to define money flow.
                </p>
              )}

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {connections.map((conn, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-900/50 p-2"
                  >
                    <select
                      value={conn.direction}
                      onChange={(e) =>
                        updateConnection(i, {
                          direction: e.target.value as "to" | "from",
                        })
                      }
                      className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
                    >
                      <option value="from">From</option>
                      <option value="to">To</option>
                    </select>

                    <select
                      value={conn.targetId}
                      onChange={(e) =>
                        updateConnection(i, { targetId: e.target.value })
                      }
                      className="flex-1 min-w-0 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 truncate focus:outline-none"
                    >
                      {existingNodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={conn.amount || ""}
                      onChange={(e) =>
                        updateConnection(i, {
                          amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="$"
                      className="w-20 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 font-sans tabular-nums focus:outline-none"
                    />

                    <select
                      value={conn.frequency}
                      onChange={(e) =>
                        updateConnection(i, {
                          frequency: e.target
                            .value as FinancialFlowData["frequency"],
                        })
                      }
                      className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => removeConnection(i)}
                      className="rounded p-1 text-zinc-600 hover:text-red-400 hover:bg-white/5 transition shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-finco-blue px-4 py-2 text-sm font-medium text-black hover:bg-finco-blue/90 transition"
              >
                {mode === "add" ? "Add Node" : "Save Changes"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
