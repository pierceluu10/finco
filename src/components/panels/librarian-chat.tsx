"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, BookOpen, Loader2 } from "lucide-react";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface LibrarianChatProps {
  open: boolean;
  onClose: () => void;
  financialNodes: FinancialNodeData[];
  financialFlows: FinancialFlowData[];
  nodeMap: Map<string, FinancialNodeData>;
}

function serializeGraphState(
  nodes: FinancialNodeData[],
  flows: FinancialFlowData[],
  nodeMap: Map<string, FinancialNodeData>
): string {
  const lines: string[] = [];

  lines.push("NODES:");
  for (const node of nodes) {
    const meta = Object.entries(node.metadata)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    lines.push(
      `- id: ${node.id} | type: ${node.type} | label: ${node.label} | amount: ${node.currentValue} | monthly_flow: ${node.monthlyFlow} | currency: CAD` +
        (meta ? ` | metadata: { ${meta} }` : "")
    );
  }

  lines.push("");
  lines.push("EDGES:");
  for (const flow of flows) {
    const sourceLabel = nodeMap.get(flow.source)?.label ?? flow.source;
    const targetLabel = nodeMap.get(flow.target)?.label ?? flow.target;
    lines.push(
      `- source: ${flow.source} (${sourceLabel}) -> target: ${flow.target} (${targetLabel}) | amount: ${flow.amount} | frequency: ${flow.frequency}`
    );
  }

  return lines.join("\n");
}

export function LibrarianChat({
  open,
  onClose,
  financialNodes,
  financialFlows,
  nodeMap,
}: LibrarianChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const graphState = serializeGraphState(
        financialNodes,
        financialFlows,
        nodeMap
      );

      const res = await fetch("/api/ai/librarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graphState, message: trimmed }),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I was unable to process your request. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, financialNodes, financialFlows, nodeMap]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[380px] flex-col rounded-xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-finco-blue/15">
            <BookOpen className="h-3.5 w-3.5 text-finco-blue" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              Finco Librarian
            </p>
            <p className="text-[10px] text-zinc-500">
              {financialNodes.length} nodes &middot;{" "}
              {financialFlows.length} flows loaded
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[400px] min-h-[200px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen className="h-8 w-8 text-zinc-700 mb-3" />
            <p className="text-xs text-zinc-400 leading-relaxed max-w-[260px]">
              Ask me anything about your financial graph. I can see all your
              nodes, flows, and connections.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-finco-blue/15 text-zinc-200"
                  : "bg-zinc-900 border border-white/5 text-zinc-300"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-white/5 px-3 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-finco-blue" />
              <span className="text-[11px] text-zinc-500">Analyzing graph...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none focus:ring-0"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-finco-blue/20 text-finco-blue transition hover:bg-finco-blue/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[9px] text-zinc-600">
          Powered by Gemini &middot; Graph-aware responses
        </p>
      </div>
    </div>
  );
}
