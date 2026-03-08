"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { X } from "lucide-react";
import type { FinancialFlowData } from "@/types/graph";
import type { GraphSnapshotNode } from "@/components/graph/three-graph";
import { SimulationGraph } from "./simulation-graph";

const DURATION_MS = 4000;
const PHASE1_END = 1200;
const PHASE2_END = 1600;
const PHASE3_END = 3200;
const RIPPLE_STAGGER_MS = 200;

const HEALTH_WORSE = "#ff4d6d";
const HEALTH_BETTER = "#00ff88";

export interface SimulationOverlayProps {
  open: boolean;
  onClose: () => void;
  responseText: string;
  nodes: GraphSnapshotNode[];
  flows: FinancialFlowData[];
  onApply?: (updates: Map<string, { currentValue?: number; monthlyFlow?: number }>) => void;
}

function parseResponseForChange(
  responseText: string,
  nodes: GraphSnapshotNode[]
): { changedNodeId: string | null; newValue: number | null } {
  const text = responseText.trim().toLowerCase();
  let changedNodeId: string | null = null;
  for (const node of nodes) {
    const label = node.label.toLowerCase();
    if (label.length >= 2 && text.includes(label)) {
      changedNodeId = node.id;
      break;
    }
  }
  if (!changedNodeId) return { changedNodeId: null, newValue: null };
  const moneyMatch = responseText.match(/\$[\d,]+(?:\.\d+)?/);
  const numMatch = responseText.match(/\b(\d{1,10}(?:,\d{3})*(?:\.\d+)?)\s*(?:cad|dollars?|%|\/mo)?/i);
  const raw = moneyMatch?.[0]?.replace(/[$,]/g, "") ?? numMatch?.[1]?.replace(/,/g, "");
  const newValue = raw ? parseFloat(raw) : null;
  return { changedNodeId, newValue: Number.isFinite(newValue) ? newValue : null };
}

function getAffectedNodeIds(
  changedNodeId: string,
  flows: FinancialFlowData[]
): string[] {
  const seen = new Set<string>([changedNodeId]);
  const queue = [changedNodeId];
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const f of flows) {
      if (f.source === id && !seen.has(f.target)) {
        seen.add(f.target);
        queue.push(f.target);
      }
      if (f.target === id && !seen.has(f.source)) {
        seen.add(f.source);
        queue.push(f.source);
      }
    }
  }
  return order.slice(1);
}

function getRadiusFromValue(value: number): number {
  const v = Math.max(0, Math.abs(value)) || 1;
  const t = (Math.sqrt(v) - 1) / (1 + Math.sqrt(v));
  return 20 + t * 28;
}

export function SimulationOverlay({
  open,
  onClose,
  responseText,
  nodes,
  flows,
  onApply,
}: SimulationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [elapsed, setElapsed] = useState(0);
  const [viewMode, setViewMode] = useState<"before" | "after">("before");
  const [toggleActive, setToggleActive] = useState(false);
  const [sequenceDone, setSequenceDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ w: 800, h: 400 });
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const { changedNodeId, newValue } = useMemo(
    () => parseResponseForChange(responseText, nodes),
    [responseText, nodes]
  );

  const afterNodes = useMemo(() => {
    const list = nodes.map((n) => ({ ...n, metadata: { ...n.metadata } }));
    if (!changedNodeId || nodes.length === 0) return list;
    const idx = list.findIndex((n) => n.id === changedNodeId);
    if (idx === -1) return list;
    const oldVal = list[idx].currentValue !== 0 ? list[idx].currentValue : list[idx].monthlyFlow;
    const val = newValue ?? oldVal * 1.1;
    list[idx] = {
      ...list[idx],
      currentValue: list[idx].type === "income" || list[idx].type === "account" ? val : list[idx].currentValue,
      monthlyFlow: list[idx].type !== "income" && list[idx].type !== "account" ? val : list[idx].monthlyFlow,
      radius: getRadiusFromValue(val),
    };
    return list;
  }, [nodes, changedNodeId, newValue]);

  const affectedOrder = useMemo(() => {
    if (!changedNodeId) return [];
    return getAffectedNodeIds(changedNodeId, flows);
  }, [changedNodeId, flows]);

  const nodeColorOverrides = useMemo(() => {
    const m = new Map<string, string>();
    if (!changedNodeId) return m;
    const changedNode = afterNodes.find((n) => n.id === changedNodeId);
    const beforeNode = nodes.find((n) => n.id === changedNodeId);
    if (!beforeNode || !changedNode) return m;
    const oldV = beforeNode.currentValue !== 0 ? beforeNode.currentValue : beforeNode.monthlyFlow;
    const newV = changedNode.currentValue !== 0 ? changedNode.currentValue : changedNode.monthlyFlow;
    m.set(changedNodeId, newV >= oldV ? HEALTH_BETTER : HEALTH_WORSE);
    affectedOrder.forEach((id, i) => {
      m.set(id, i % 2 === 0 ? HEALTH_BETTER : HEALTH_WORSE);
    });
    return m;
  }, [changedNodeId, afterNodes, nodes, affectedOrder]);

  const displayNodes = viewMode === "before" ? nodes : afterNodes;
  const brightEdgeIds = useMemo(() => {
    const s = new Set<string>();
    if (phase < 3) return s;
    const affectedSet = new Set(affectedOrder);
    flows.forEach((f) => {
      const srcAffected = f.source === changedNodeId || affectedSet.has(f.source);
      const tgtAffected = f.target === changedNodeId || affectedSet.has(f.target);
      if (srcAffected && tgtAffected) s.add(f.id);
    });
    return s;
  }, [phase, affectedOrder, flows, changedNodeId]);

  useEffect(() => {
    if (!open) return;
    setVisible(true);
    setPhase(1);
    setElapsed(0);
    setViewMode("before");
    setToggleActive(false);
    setSequenceDone(false);
    startRef.current = performance.now();
  }, [open]);

  useEffect(() => {
    if (!open || !visible) return;
    const tick = (now: number) => {
      const t = now - startRef.current;
      setElapsed(t);
      if (t >= PHASE1_END && phase === 1) setPhase(2);
      if (t >= PHASE2_END && phase === 2) setPhase(3);
      if (t >= PHASE3_END && phase === 3) setPhase(4);
      if (t >= DURATION_MS) setToggleActive(true);
      if (t >= DURATION_MS) setSequenceDone(true);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, visible, phase]);

  useEffect(() => {
    if (!open) setVisible(false);
  }, [open]);

  useEffect(() => {
    if (!open) setVisible(false);
  }, [open]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    },
    [handleClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setGraphSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const progress = Math.min(100, (elapsed / DURATION_MS) * 100);
  const labelText =
    phase === 1 ? "BEFORE" : phase === 2 || phase === 3 ? "RIPPLING..." : "AFTER";
  const labelColor =
    phase === 1 ? "#6b6b9a" : phase === 2 || phase === 3 ? "#ffe040" : "#e8e8ff";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0"
      style={{
        zIndex: 1000,
        background: "rgba(5, 5, 8, 0.96)",
        backdropFilter: "blur(12px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease-out",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{
          height: 64,
          borderBottom: "1px solid #1a1a2e",
        }}
      >
        <span
          className="uppercase"
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: 14,
            color: "#7F7FFA",
            letterSpacing: "0.15em",
          }}
        >
          SIMULATION
        </span>

        <div className="flex items-center gap-4" style={{ flex: 1, maxWidth: "calc(100% - 400px)", margin: "0 24px" }}>
          <div
            className="flex-1 rounded-sm"
            style={{
              height: 3,
              background: "#1a1a2e",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              className="h-full rounded-sm"
              style={{
                width: `${progress}%`,
                background: "#7F7FFA",
                borderRadius: 2,
                transition: "width 80ms linear",
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-full overflow-hidden" style={{ border: "1px solid #1a1a2e" }}>
            <button
              type="button"
              onClick={() => toggleActive && setViewMode("before")}
              className="px-4 py-2 transition"
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                color: viewMode === "before" ? "#e8e8ff" : "#6b6b9a",
                background: viewMode === "before" ? "rgba(127,127,250,0.2)" : "transparent",
              }}
              disabled={!toggleActive}
            >
              BEFORE
            </button>
            <button
              type="button"
              onClick={() => toggleActive && setViewMode("after")}
              className="px-4 py-2 transition"
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                color: viewMode === "after" ? "#e8e8ff" : "#6b6b9a",
                background: viewMode === "after" ? "rgba(127,127,250,0.2)" : "transparent",
              }}
              disabled={!toggleActive}
            >
              AFTER
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-md transition hover:opacity-90"
            style={{ color: "#6b6b9a" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e8e8ff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6b9a")}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative min-h-0"
        style={{ paddingLeft: "25vw" }}
      >
        <SimulationGraph
          width={graphSize.w}
          height={graphSize.h}
          nodes={displayNodes}
          flows={flows}
          viewMode={viewMode}
          nodeColorOverrides={viewMode === "after" ? nodeColorOverrides : undefined}
          pulseNodeId={phase === 1 ? changedNodeId : null}
          brightEdgeIds={phase === 3 ? brightEdgeIds : new Set()}
        />

        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            top: 24,
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: labelColor,
            textTransform: "uppercase",
            opacity: phase === 2 && elapsed < PHASE1_END + 200 ? 0 : 1,
            transition: "opacity 200ms ease",
          }}
        >
          {labelText}
        </div>
      </div>

      <div
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          height: 120,
          background: "#08080f",
          borderTop: "1px solid #1a1a2e",
        }}
      >
        <div
          className="flex-1 overflow-y-auto px-6 py-3"
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 500,
            fontSize: 13,
            color: "#c8c8e8",
            lineHeight: 1.7,
          }}
        >
          {responseText}
        </div>
        {sequenceDone && (
          <div className="flex items-center gap-3 px-6 pb-3">
            <button
              type="button"
              onClick={() => {
                if (onApply) {
                  const updates = new Map<string, { currentValue?: number; monthlyFlow?: number }>();
                  afterNodes.forEach((n) => {
                    const before = nodes.find((b) => b.id === n.id);
                    if (!before) return;
                    if (before.currentValue !== n.currentValue || before.monthlyFlow !== n.monthlyFlow) {
                      updates.set(n.id, {
                        currentValue: n.currentValue,
                        monthlyFlow: n.monthlyFlow,
                      });
                    }
                  });
                  onApply(updates);
                }
                handleClose();
              }}
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                background: "#7F7FFA",
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
              }}
            >
              Apply to Ecosystem
            </button>
            <button
              type="button"
              onClick={handleClose}
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                background: "transparent",
                color: "#6b6b9a",
                border: "1px solid #1a1a2e",
                borderRadius: 8,
                padding: "10px 24px",
              }}
            >
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
