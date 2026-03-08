"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import type { FinancialNodeData, FinancialNodeType, FinancialFlowData } from "@/types/graph";

const NODE_TYPE_PILLS: { value: FinancialNodeType; label: string }[] = [
  { value: "income", label: "INCOME" },
  { value: "expense", label: "EXPENSE" },
  { value: "debt", label: "DEBT" },
  { value: "savings", label: "SAVINGS" },
  { value: "investment", label: "INVESTMENT" },
  { value: "buffer", label: "BUFFER" },
];

interface StemNodeModalProps {
  open: boolean;
  onClose: () => void;
  parentNode: FinancialNodeData;
  parentPosition: { x: number; y: number };
  onSubmit: (
    data: Omit<FinancialNodeData, "id">,
    connections: { targetId: string; direction: "to" | "from"; amount: number; frequency: FinancialFlowData["frequency"] }[],
    initialPosition: { x: number; y: number }
  ) => string;
  onOpenNewNodePopup: (nodeId: string) => void;
}

export function StemNodeModal({
  open,
  onClose,
  parentNode,
  parentPosition,
  onSubmit,
  onOpenNewNodePopup,
}: StemNodeModalProps) {
  const [name, setName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    nodeType: string;
    suggestedAmount: number;
    amountLabel: string;
    reasoning: string;
  } | null>(null);
  const [nodeType, setNodeType] = useState<FinancialNodeType>("expense");
  const [amount, setAmount] = useState("");
  const [amountLabel, setAmountLabel] = useState("Monthly amount");
  const [showMore, setShowMore] = useState(false);
  const [notes, setNotes] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAnalyze = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setSuggestions(null);
      return;
    }
    setAnalyzing(true);
    const parentVal = parentNode.currentValue > 0 ? parentNode.currentValue : parentNode.monthlyFlow;
    fetch("/api/ai/sentinel-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userMessage: `You are analyzing a new financial node being created by the user. The node is named '${trimmed}'. It is being stemmed from a parent node named '${parentNode.label}' which is of type ${parentNode.type} with a value of ${parentVal}.

Based solely on the node name and its relationship to the parent node, determine:
1. nodeType: one of INCOME, EXPENSE, DEBT, SAVINGS, INVESTMENT, BUFFER
2. suggestedAmount: a realistic monthly amount in CAD for a Canadian user
3. amountLabel: what this amount represents (e.g. 'Monthly payment', 'Monthly contribution', 'Balance')
4. confidence: high, medium, or low
5. reasoning: one short sentence explaining your determination

Return only a JSON object with these five fields. No explanation. No markdown.`,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const d = data.data as Record<string, unknown> | null;
        if (d && typeof d.nodeType === "string" && typeof d.suggestedAmount === "number") {
          const typeStr = String(d.nodeType).toLowerCase();
          const typeMap: Record<string, FinancialNodeType> = {
            income: "income",
            expense: "expense",
            debt: "debt",
            savings: "savings",
            investment: "investment",
            buffer: "buffer",
          };
          setNodeType(typeMap[typeStr] ?? "expense");
          setAmount(String(Math.round(d.suggestedAmount * 100) / 100));
          setAmountLabel(typeof d.amountLabel === "string" ? d.amountLabel : "Monthly amount");
          setSuggestions({
            nodeType: String(d.nodeType),
            suggestedAmount: d.suggestedAmount,
            amountLabel: typeof d.amountLabel === "string" ? d.amountLabel : "Monthly amount",
            reasoning: typeof d.reasoning === "string" ? d.reasoning : "",
          });
        }
      })
      .catch(() => setSuggestions(null))
      .finally(() => setAnalyzing(false));
  }, [name, parentNode.label, parentNode.type, parentNode.currentValue, parentNode.monthlyFlow]);

  useEffect(() => {
    if (!open) return;
    setAnalyzing(false);
    setSuggestions(null);
    setName("");
    setNodeType("expense");
    setAmount("");
    setAmountLabel("Monthly amount");
    setShowMore(false);
    setNotes("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(triggerAnalyze, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, open, triggerAnalyze]);

  const handleBlur = useCallback(() => {
    if (name.trim()) triggerAnalyze();
  }, [name, triggerAnalyze]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const label = name.trim();
    if (!label) return;
    const numAmount = parseFloat(amount) || 0;
    const angle = Math.random() * Math.PI * 2;
    const dist = 120;
    const initialPosition = {
      x: parentPosition.x + Math.cos(angle) * dist,
      y: parentPosition.y + Math.sin(angle) * dist,
    };
    const newNodeId = onSubmit(
      {
        label,
        type: nodeType,
        currentValue: nodeType === "savings" || nodeType === "investment" ? numAmount : 0,
        monthlyFlow: numAmount,
        metadata: notes ? { notes } : {},
      },
      [{ targetId: parentNode.id, direction: "from", amount: numAmount, frequency: "monthly" }],
      initialPosition
    );
    onClose();
    onOpenNewNodePopup(newNodeId);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[101] w-full max-w-[420px] rounded-2xl p-7 font-sans"
        style={{
          background: "#08080f",
          border: "1px solid rgba(127,127,250,0.2)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-extrabold text-[20px] text-[#e8e8ff]">New Node</h2>
            <p className="font-medium text-[13px] text-[#6b6b9a] mt-0.5">
              Stemming from {parentNode.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#6b6b9a] hover:text-[#e8e8ff] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-[13px] text-[#6b6b9a] mb-1.5">What is this?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#1a1a2e";
                handleBlur();
              }}
              placeholder="e.g. Netflix, Car Insurance, RRSP..."
              className="w-full font-medium text-[14px] text-[#e8e8ff] rounded-[10px] px-3.5 py-3 outline-none transition-colors"
              style={{
                background: "#050508",
                border: "1px solid #1a1a2e",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(127,127,250,0.5)")}
            />
            {analyzing && (
              <p
                className="font-medium text-[12px] text-[#6b6b9a] mt-2"
                style={{ animation: "pulse 1.2s ease-in-out infinite" }}
              >
                Analyzing...
              </p>
            )}
          </div>

          {(suggestions || !analyzing) && (suggestions || name.trim()) && (
            <>
              <div>
                <label className="block font-bold text-[13px] text-[#6b6b9a] mb-2">Type</label>
                <div className="flex flex-wrap gap-2">
                  {NODE_TYPE_PILLS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setNodeType(p.value)}
                      className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition"
                      style={{
                        background: nodeType === p.value ? "#7F7FFA" : "transparent",
                        color: nodeType === p.value ? "#000" : "#6b6b9a",
                        border: `1px solid ${nodeType === p.value ? "#7F7FFA" : "rgba(127,127,250,0.2)"}`,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-bold text-[13px] text-[#6b6b9a] mb-1.5">{amountLabel}</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={0}
                  step={0.01}
                  className="w-full font-medium text-[14px] text-[#e8e8ff] rounded-[10px] px-3.5 py-3 outline-none"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    background: "#050508",
                    border: "1px solid #1a1a2e",
                  }}
                />
              </div>
              {suggestions?.reasoning && (
                <p className="font-medium text-[12px] text-[#6b6b9a] italic">
                  Based on the name, this looks like {suggestions.reasoning}
                </p>
              )}
            </>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="text-[13px] font-medium text-[#6b6b9a] hover:text-[#e8e8ff] transition"
            >
              {showMore ? "Hide" : "Show"} more options
            </button>
            {showMore && (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes"
                  className="w-full text-[14px] text-[#e8e8ff] rounded-lg px-3 py-2 outline-none"
                  style={{ background: "#050508", border: "1px solid #1a1a2e" }}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full font-bold text-[14px] text-black rounded-[10px] py-3.5 transition bg-[#7F7FFA] hover:opacity-90"
          >
            Add to Ecosystem
          </button>
        </form>
      </div>
    </div>
  );
}
