"use client";

import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

export interface SimulationBottomPanelProps {
  open: boolean;
  streamedText: string;
  streaming: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

export function SimulationBottomPanel({
  open,
  streamedText,
  streaming,
  onApply,
  onDiscard,
}: SimulationBottomPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [open, streamedText]);

  if (!open) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[300]"
      style={{
        fontFamily: "'Manrope', sans-serif",
        bottom: 0,
        background: "rgba(8,8,15,0.97)",
        borderTop: "1px solid rgba(127,127,250,0.25)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="flex flex-col" style={{ maxHeight: "min(40vh, 320px)" }}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7F7FFA" }}>
            Simulator
          </span>
          {streaming && (
            <span className="text-[11px]" style={{ color: "#6b6b9a" }}>
              Generating...
            </span>
          )}
        </div>
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap"
          style={{ color: "#c8c8e8", minHeight: 80 }}
        >
          {streamedText || (streaming ? "" : "No response yet.")}
        </div>
        <div className="flex gap-3 px-4 py-3 border-t border-white/5">
          <button
            type="button"
            onClick={onApply}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-semibold text-[13px] transition"
            style={{
              background: "#00ff88",
              color: "#050508",
            }}
          >
            <Check className="h-4 w-4" />
            End simulation
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-semibold text-[13px] transition"
            style={{
              background: "transparent",
              border: "1px solid rgba(127,127,250,0.4)",
              color: "#7F7FFA",
            }}
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
