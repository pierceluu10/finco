"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2 } from "lucide-react";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";
import { getNodeColor } from "@/lib/graph-theme";
import { formatCurrency } from "@/lib/utils";

interface NodePopupProps {
  node: FinancialNodeData;
  connectedFlows: FinancialFlowData[];
  nodeMap: Map<string, FinancialNodeData>;
  onClose: () => void;
  anchorX: number;
  anchorY: number;
  containerWidth: number;
  containerHeight: number;
}

function serializeNodeContext(
  node: FinancialNodeData,
  flows: FinancialFlowData[],
  nodeMap: Map<string, FinancialNodeData>
): string {
  const lines: string[] = [];
  lines.push(`Node: ${node.label} (${node.type})`);
  lines.push(`Current Value: ${node.currentValue} CAD`);
  lines.push(`Monthly Flow: ${node.monthlyFlow} CAD`);
  const meta = Object.entries(node.metadata)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  if (meta) lines.push(`Metadata: ${meta}`);
  lines.push("");
  lines.push("Connected Flows:");
  for (const f of flows) {
    const srcLabel = nodeMap.get(f.source)?.label ?? f.source;
    const tgtLabel = nodeMap.get(f.target)?.label ?? f.target;
    lines.push(`  ${srcLabel} -> ${tgtLabel}: ${f.amount} CAD (${f.frequency})`);
  }
  return lines.join("\n");
}

export function NodePopup({
  node,
  connectedFlows,
  nodeMap,
  onClose,
  anchorX,
  anchorY,
  containerWidth,
  containerHeight,
}: NodePopupProps) {
  const [visible, setVisible] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const color = getNodeColor(node.type);
  const inbound = connectedFlows.filter((f) => f.target === node.id);
  const outbound = connectedFlows.filter((f) => f.source === node.id);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const popW = 300;
  const popH = 400;
  let x = anchorX + 20;
  let y = anchorY - popH / 2;
  if (x + popW > containerWidth - 12) x = anchorX - popW - 20;
  if (y < 12) y = 12;
  if (y + popH > containerHeight - 12) y = containerHeight - popH - 12;
  if (x < 12) x = 12;

  const sendChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatLoading(true);
    setChatResponse(null);
    try {
      const context = serializeNodeContext(node, connectedFlows, nodeMap);
      const graphState = `FOCUSED NODE CONTEXT\n${context}`;
      const res = await fetch("/api/ai/librarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graphState, message: msg }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setChatResponse(data.reply);
    } catch {
      setChatResponse("Unable to get a response right now. Please try again.");
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, node, connectedFlows, nodeMap]);

  return (
    <div
      ref={popupRef}
      className="absolute z-50 font-sans"
      style={{
        left: x,
        top: y,
        width: popW,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.95)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: "#0a0a14",
          border: "1px solid rgba(127, 127, 250, 0.25)",
          borderLeft: `3px solid ${color}`,
          borderRadius: 14,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-md transition hover:text-[#e8e8ff]"
            style={{ color: "#6b6b9a" }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-sans font-bold text-[18px]" style={{ color: "#e8e8ff" }}>
              {node.label}
            </span>
            <span
              className="font-sans rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
              style={{ backgroundColor: `${color}26`, color }}
            >
              {node.type}
            </span>
          </div>
          <span className="font-bold text-[22px]" style={{ color: "#e8e8ff", fontFamily: "'Manrope', sans-serif" }}>
            {formatCurrency(node.currentValue > 0 ? node.currentValue : node.monthlyFlow)}
            {node.currentValue <= 0 && node.monthlyFlow > 0 && (
              <span className="font-sans text-[13px] font-medium" style={{ color: "#6b6b9a" }}>/mo</span>
            )}
          </span>
        </div>

        <div style={{ height: 1, background: "#1a1a2e" }} />

        {/* Flows */}
        <div className="px-4 py-3">
          <p className="font-sans font-bold text-[11px] uppercase tracking-[0.1em] mb-2" style={{ color: "#6b6b9a" }}>
            Flows
          </p>
          {inbound.length === 0 && outbound.length === 0 && (
            <p className="font-sans text-[12px]" style={{ color: "#6b6b9a" }}>
              No connected flows
            </p>
          )}
          <div className="space-y-1.5">
            {inbound.map((f) => (
              <div key={f.id} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[12px]" style={{ color: "#4ade80" }}>↓</span>
                  <span className="font-sans truncate text-[12px]" style={{ color: "#9a9abe" }}>
                    {nodeMap.get(f.source)?.label ?? f.source}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[13px]" style={{ color: "#4ade80", fontFamily: "'Manrope', sans-serif" }}>
                    {formatCurrency(f.amount)}
                  </span>
                  <span className="font-sans text-[10px]" style={{ color: "#6b6b9a" }}>
                    /{f.frequency === "monthly" ? "mo" : f.frequency}
                  </span>
                </div>
              </div>
            ))}
            {outbound.map((f) => (
              <div key={f.id} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[12px]" style={{ color: "#f87171" }}>↑</span>
                  <span className="font-sans truncate text-[12px]" style={{ color: "#9a9abe" }}>
                    {nodeMap.get(f.target)?.label ?? f.target}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[13px]" style={{ color: "#f87171", fontFamily: "'Manrope', sans-serif" }}>
                    {formatCurrency(f.amount)}
                  </span>
                  <span className="font-sans text-[10px]" style={{ color: "#6b6b9a" }}>
                    /{f.frequency === "monthly" ? "mo" : f.frequency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "#1a1a2e" }} />

        {/* Metadata */}
        {Object.keys(node.metadata).length > 0 && (
          <>
            <div className="px-4 py-3 space-y-1.5">
              {Object.entries(node.metadata).map(([key, val]) => {
                const strVal = Array.isArray(val) ? val.join(", ") : String(val);
                const isNumeric = /^[\d.,]+%?$/.test(strVal);
                return (
                  <div key={key} className="flex justify-between items-baseline gap-2">
                    <span className="font-sans font-medium capitalize text-[12px]" style={{ color: "#6b6b9a" }}>
                      {key.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`${isNumeric ? "tabular-nums" : ""} text-right truncate max-w-[140px] text-[12px] font-sans`}
                      style={{ color: "#e8e8ff" }}
                    >
                      {strVal}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ height: 1, background: "#1a1a2e" }} />
          </>
        )}

        {/* Agent Chat */}
        <div className="px-4 py-3">
          <p className="font-sans font-bold text-[11px] uppercase tracking-[0.1em] mb-2" style={{ color: "#6b6b9a" }}>
            Ask Sentinel
          </p>

          {chatResponse && (
            <div
              className="font-sans rounded-lg px-3 py-2.5 mb-2 text-[13px] font-medium leading-relaxed"
              style={{ background: "#07070e", color: "#c8c8e8" }}
            >
              {chatResponse}
            </div>
          )}

          {chatLoading && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: "#7F7FFA" }} />
              <span className="font-sans text-[11px]" style={{ color: "#6b6b9a" }}>Thinking...</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
              placeholder="Ask something about this node..."
              className="font-sans flex-1 text-[13px] outline-none"
              style={{
                background: "#050508",
                border: "1px solid #1a1a2e",
                borderRadius: 8,
                padding: "7px 10px",
                color: "#e8e8ff",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(127,127,250,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#1a1a2e")}
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim() || chatLoading}
              className="shrink-0 flex items-center justify-center rounded-lg transition disabled:opacity-30"
              style={{ width: 32, height: 32, color: "#7F7FFA" }}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
