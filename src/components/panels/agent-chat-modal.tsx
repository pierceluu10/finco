"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { X, Send, Loader2 } from "lucide-react";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

type AgentType = "sentinel" | "simulator" | "planner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentChatModalProps {
  agent: AgentType;
  open: boolean;
  onClose: () => void;
  financialNodes: FinancialNodeData[];
  financialFlows: FinancialFlowData[];
  nodeMap: Map<string, FinancialNodeData>;
  selectedNodeId?: string;
  /** Called when Simulator agent finishes a response (streaming or JSON). Use to open simulation overlay. */
  onSimulatorResponseComplete?: (responseText: string) => void;
}

const AGENT_META: Record<
  AgentType,
  { label: string; color: string; statusLabel: string; active: boolean; thinkingText: string }
> = {
  sentinel: {
    label: "Sentinel",
    color: "#5B9CF5",
    statusLabel: "Active",
    active: true,
    thinkingText: "Analyzing your graph...",
  },
  simulator: {
    label: "Simulator",
    color: "#7AAFDA",
    statusLabel: "Active",
    active: true,
    thinkingText: "Comparing changes...",
  },
  planner: {
    label: "Planner",
    color: "#5B7FC5",
    statusLabel: "Active",
    active: true,
    thinkingText: "Reviewing your planning context...",
  },
};

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

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AgentChatModal({
  agent,
  open,
  onClose,
  financialNodes,
  financialFlows,
  nodeMap,
  selectedNodeId,
  onSimulatorResponseComplete,
}: AgentChatModalProps) {
  const meta = AGENT_META[agent] ?? AGENT_META.sentinel;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    setMessages([]);
    setInput("");
    setLoading(false);
    setStreamingText("");
  }, [agent]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      const graphState = serializeGraphState(financialNodes, financialFlows, nodeMap);

      const requestBody: Record<string, unknown> = {
        agent,
        graphState,
        message: trimmed,
        nodes: financialNodes,
        flows: financialFlows,
      };

      if (selectedNodeId) {
        requestBody.selectedNodeId = selectedNodeId;
      }

      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) throw new Error("API request failed");

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setStreamingText(accumulated);
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulated, timestamp: new Date() },
        ]);
        setStreamingText("");
        if (agent === "simulator" && accumulated.trim()) {
          onSimulatorResponseComplete?.(accumulated);
        }
      } else {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, timestamp: new Date() },
        ]);
        if (agent === "simulator" && data.reply?.trim()) {
          onSimulatorResponseComplete?.(data.reply);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I was unable to process your request. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  }, [input, loading, financialNodes, financialFlows, nodeMap, agent, selectedNodeId, onSimulatorResponseComplete]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />

      <div
        className="relative font-sans"
        style={{
          width: 480,
          maxHeight: 600,
          background: "#08080f",
          border: "1px solid rgba(127,127,250,0.2)",
          borderTop: `3px solid ${meta.color}`,
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(127,127,250,0.1)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-sans"
              style={{ fontWeight: 800, fontSize: 18, color: "#e8e8ff" }}
            >
              {meta.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={meta.active ? "agent-pulse" : ""}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: meta.active ? meta.color : "#2a2a4a",
                  display: "inline-block",
                }}
              />
              <span
                className="font-sans"
                style={{
                  fontWeight: 600,
                  fontSize: 11,
                  color: meta.active ? meta.color : "#3a3a5a",
                }}
              >
                {meta.statusLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition"
            style={{ color: "#6b6b9a" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e8e8ff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6b9a")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat messages */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          style={{ maxHeight: 380, minHeight: 160 }}
        >
          {messages.length === 0 && !streamingText && (
            <div className="flex items-center justify-center py-10">
              <p
                className="font-sans text-center"
                style={{ fontSize: 13, color: "#3a3a5a", maxWidth: 280 }}
              >
                Start a conversation with {meta.label}.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className="font-sans whitespace-pre-wrap"
                style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.55,
                  ...(msg.role === "user"
                    ? {
                        background: "#0f0f1a",
                        border: "1px solid #1a1a2e",
                        color: "#e8e8ff",
                      }
                    : {
                        background: `${meta.color}0F`,
                        border: `1px solid ${meta.color}26`,
                        color: "#c8c8e8",
                      }),
                }}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                      li: ({ children }) => <li>{children}</li>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
              <span
                className="font-sans mt-1 px-1"
                style={{ fontSize: 10, fontWeight: 500, color: "#3a3a5a" }}
              >
                {formatTime(msg.timestamp)}
              </span>
            </div>
          ))}

          {/* Streaming text */}
          {streamingText && (
            <div className="flex flex-col items-start">
              <div
                className="font-sans whitespace-pre-wrap"
                style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.55,
                  background: `${meta.color}0F`,
                  border: `1px solid ${meta.color}26`,
                  color: "#c8c8e8",
                }}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                    li: ({ children }) => <li>{children}</li>,
                  }}
                >
                  {streamingText}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {loading && !streamingText && (
            <div className="flex items-start">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: `${meta.color}0F`,
                  border: `1px solid ${meta.color}26`,
                }}
              >
                <Loader2
                  className="h-3 w-3 animate-spin"
                  style={{ color: meta.color }}
                />
                <span
                  className="font-sans"
                  style={{ fontSize: 11, color: "#6b6b9a" }}
                >
                  {meta.thinkingText}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ borderTop: "1px solid rgba(127,127,250,0.1)" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${meta.label} something...`}
            className="font-sans flex-1 outline-none"
            style={{
              background: "#050508",
              border: "1px solid #1a1a2e",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: "#e8e8ff",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "rgba(127,127,250,0.4)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "#1a1a2e")
            }
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="font-sans shrink-0 transition disabled:opacity-30"
            style={{
              background: "#7F7FFA",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 8,
              padding: "10px 18px",
            }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
