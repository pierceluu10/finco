"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ReactFlowProvider } from "reactflow";
import Image from "next/image";

import { demoNodes, demoEdges } from "@/lib/demo-data";
import { fromDemoData } from "@/lib/graph-transforms";
import { useFinancialGraph } from "@/hooks/use-financial-graph";

import { AppSidebar } from "@/components/shared/app-sidebar";
import { ThreeGraph } from "@/components/graph/three-graph";
import { GraphLegend } from "@/components/graph/graph-legend";
import { EdgeDetailPanel } from "@/components/panels/edge-detail-panel";
import { AddNodeDialog } from "@/components/panels/add-node-dialog";
import { DeleteConfirmDialog } from "@/components/panels/delete-confirm-dialog";
import { CsvUploadDialog } from "@/components/panels/csv-upload-dialog";
import { AgentChatModal } from "@/components/panels/agent-chat-modal";
import { NodePopup } from "@/components/panels/node-popup";
import type {
  DialogMode,
  FinancialNodeData,
  FinancialFlowData,
  FinancialNodeType,
} from "@/types/graph";
import type {
  ParsedCsvNode,
  ParsedCsvEdge,
} from "@/components/shared/app-sidebar";

type AgentType = "librarian" | "simulator" | "sentinel";

const STORAGE_KEY = "finco-sidebar-collapsed";
const TRANSITION_MS = 350;
const INTRO_SESSION_KEY = "ecosystem-loaded";

const seedData = fromDemoData(demoNodes, demoEdges);

function EcosystemDashboard() {
  const graph = useFinancialGraph(seedData.nodes, seedData.flows);

  // ── Sidebar collapse ──
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setSidebarCollapsed(true);
    } catch {
      /* noop */
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  // ── Entry sequence ──
  const [introSkip] = useState(() => {
    if (typeof window !== "undefined")
      return !!sessionStorage.getItem(INTRO_SESSION_KEY);
    return true;
  });

  const [sidebarIn, setSidebarIn] = useState(introSkip);
  const [contentIn, setContentIn] = useState(introSkip);
  const [graphIn, setGraphIn] = useState(introSkip);
  const [uiIn, setUiIn] = useState(introSkip);
  const [introDone, setIntroDone] = useState(introSkip);
  const [burstActive, setBurstActive] = useState(introSkip);
  const [interactionEnabled, setInteractionEnabled] = useState(introSkip);

  useEffect(() => {
    if (introSkip) return;
    const timers = [
      setTimeout(() => setSidebarIn(true), 1200),
      setTimeout(() => setContentIn(true), 1400),
      setTimeout(() => {
        setGraphIn(true);
        setBurstActive(true);
      }, 1700),
      setTimeout(() => setUiIn(true), 1900),
      setTimeout(() => setInteractionEnabled(true), 2200),
      setTimeout(() => {
        setIntroDone(true);
        try {
          sessionStorage.setItem(INTRO_SESSION_KEY, "true");
        } catch {
          /* noop */
        }
      }, 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [introSkip]);

  // ── Dialogs ──
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("add");
  const [editTarget, setEditTarget] = useState<FinancialNodeData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [agentChatAgent, setAgentChatAgent] = useState<AgentType | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deletionImpact = useMemo(
    () => (deleteTarget ? graph.getDeletionImpact(deleteTarget) : null),
    [deleteTarget, graph]
  );

  const existingNodeIds = useMemo(
    () => new Set(graph.financialNodes.map((n) => n.id)),
    [graph.financialNodes]
  );

  const editConnections = useMemo(() => {
    if (!editTarget) return [];
    return graph.financialFlows
      .filter(
        (f) => f.source === editTarget.id || f.target === editTarget.id
      )
      .map((f) => ({
        targetId: f.source === editTarget.id ? f.target : f.source,
        direction: (f.source === editTarget.id ? "to" : "from") as
          | "to"
          | "from",
        amount: f.amount,
        frequency: f.frequency,
      }));
  }, [editTarget, graph.financialFlows]);

  const handleSubmitNode = useCallback(
    (
      data: Omit<FinancialNodeData, "id">,
      connections: {
        targetId: string;
        direction: "to" | "from";
        amount: number;
        frequency: FinancialFlowData["frequency"];
      }[]
    ) => {
      if (dialogMode === "edit" && editTarget) {
        graph.updateNode(editTarget.id, data);
      } else {
        graph.addNode(data, connections);
      }
    },
    [dialogMode, editTarget, graph]
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) {
      graph.deleteNode(deleteTarget);
      setDeleteTarget(null);
    }
  }, [deleteTarget, graph]);

  const handleCsvImport = useCallback(
    (nodes: FinancialNodeData[], flows: FinancialFlowData[]) => {
      graph.bulkAdd(nodes, flows);
    },
    [graph]
  );

  const handleParsedCsvMerge = useCallback(
    (apiNodes: ParsedCsvNode[], apiEdges: ParsedCsvEdge[]): number => {
      const TYPE_MAP: Record<string, FinancialNodeType> = {
        INCOME: "income",
        EXPENSE: "expense",
        DEBT: "debt",
        SAVINGS: "savings",
      };

      const idRemap = new Map<string, string>();
      const newNodes: FinancialNodeData[] = [];
      let updatedCount = 0;

      for (const an of apiNodes) {
        const fType = TYPE_MAP[an.type] ?? "expense";
        const existing = graph.financialNodes.find(
          (n) =>
            n.type === fType &&
            n.label.toLowerCase() === an.label.toLowerCase()
        );

        if (existing) {
          graph.updateNode(existing.id, { monthlyFlow: an.amount });
          idRemap.set(an.id, existing.id);
          updatedCount++;
        } else {
          newNodes.push({
            id: an.id,
            label: an.label,
            type: fType,
            currentValue: 0,
            monthlyFlow: an.amount,
            metadata: an.metadata as Record<string, unknown>,
          });
          idRemap.set(an.id, an.id);
        }
      }

      const newFlows: FinancialFlowData[] = [];
      for (const ae of apiEdges) {
        const src = idRemap.get(ae.source) ?? ae.source;
        const tgt = idRemap.get(ae.target) ?? ae.target;
        const srcIsNew = newNodes.some((n) => n.id === src);
        const tgtIsNew = newNodes.some((n) => n.id === tgt);
        if (srcIsNew || tgtIsNew) {
          newFlows.push({
            id: ae.id,
            source: src,
            target: tgt,
            amount: ae.amount,
            frequency: "monthly",
          });
        }
      }

      if (newNodes.length > 0 || newFlows.length > 0) {
        graph.bulkAdd(newNodes, newFlows);
      }

      const totalAffected = newNodes.length + updatedCount;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast(`Ecosystem updated with ${totalAffected} new nodes`);
      toastTimerRef.current = setTimeout(() => setToast(null), 3500);
      return totalAffected;
    },
    [graph]
  );

  // ── Selection helpers for ThreeGraph ──
  const handleSelectNode = useCallback(
    (id: string) => {
      graph.setSelectedNodeId(id);
      graph.setSelectedEdgeId(null);
    },
    [graph]
  );

  const TRANSITION = "350ms cubic-bezier(0.4, 0, 0.2, 1)";
  const SIDEBAR_SLIDE = "500ms cubic-bezier(0.34, 1.56, 0.64, 1)";

  // Sidebar intro styles
  const sidebarOuter: React.CSSProperties | undefined =
    !introDone
      ? {
          transform: sidebarIn ? "translateX(0)" : "translateX(-100%)",
          transition: `transform ${SIDEBAR_SLIDE}, width ${TRANSITION}`,
        }
      : undefined;

  const sidebarContentOverride: number | undefined =
    !introDone ? (contentIn ? 1 : 0) : undefined;

  return (
    <>
      {/* ── PHASE 1 — Intro overlay ── */}
      {!introSkip && !sidebarIn && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "#050508" }}
        >
          <div
            className="text-center"
            style={{ animation: "introLogoSeq 1200ms ease forwards" }}
          >
            <div className="flex items-center justify-center gap-0">
              <span
                className="font-mono"
                style={{
                  fontWeight: 800,
                  fontSize: 48,
                  color: "#e8e8ff",
                  letterSpacing: "-0.02em",
                }}
              >
                FINCO
              </span>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#7F7FFA",
                  boxShadow: "0 0 16px #7F7FFA",
                  marginLeft: 2,
                  marginTop: 8,
                }}
              />
            </div>
            <p
              className="font-sans mt-2"
              style={{ fontWeight: 500, fontSize: 16, color: "#6b6b9a" }}
            >
              Your financial ecosystem
            </p>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div
        className="h-full w-full"
        style={{
          paddingLeft: sidebarCollapsed ? 24 : "33.333vw",
          transition: `padding-left ${TRANSITION}`,
        }}
      >
        <AppSidebar
          totalIncome={graph.totalIncome}
          totalExpenses={graph.totalExpenses}
          nodeCount={graph.financialNodes.length}
          flowCount={graph.financialFlows.length}
          financialNodes={graph.financialNodes}
          financialFlows={graph.financialFlows}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onOpenAgentChat={(agent) => setAgentChatAgent(agent)}
          onAddNodeDirect={(data, connections) =>
            graph.addNode(data, connections)
          }
          onCsvImportDirect={handleCsvImport}
          onParsedCsvMerge={handleParsedCsvMerge}
          introStyle={sidebarOuter}
          introContentOpacity={sidebarContentOverride}
        />

        <div className="relative h-full overflow-hidden">
          {/* Background image */}
          <Image
            src="/images/Vector.png"
            alt=""
            fill
            className="object-cover pointer-events-none select-none"
            style={{ opacity: 0.105, zIndex: 0 }}
            priority
          />

          {/* 3D Graph canvas */}
          <div
            className="absolute inset-0"
            style={{
              zIndex: 1,
              opacity: graphIn ? 1 : 0,
              transition: "opacity 200ms ease",
            }}
          >
            <ThreeGraph
              rfNodes={graph.rfNodes}
              financialNodes={graph.financialNodes}
              financialFlows={graph.financialFlows}
              nodeMap={graph.nodeMap}
              selectedNodeId={graph.selectedNodeId}
              connectedNodeIds={graph.connectedNodeIds}
              onSelectNode={handleSelectNode}
              onDeselectNode={graph.deselectNode}
              burstActive={burstActive}
              interactionEnabled={interactionEnabled}
            />
          </div>

          {/* Node popup */}
          {graph.selectedNode && (
            <NodePopup
              node={graph.selectedNode}
              connectedFlows={graph.connectedFlows}
              nodeMap={graph.nodeMap}
              onClose={graph.deselectNode}
            />
          )}

          {/* Legend */}
          <div
            className="absolute bottom-4 left-4"
            style={{
              zIndex: 10,
              opacity: uiIn ? 1 : 0,
              transition: "opacity 300ms ease-out",
              transitionDelay: introSkip ? "0ms" : "100ms",
            }}
          >
            <GraphLegend />
          </div>

          {/* Edge detail */}
          {graph.selectedFlow && (
            <EdgeDetailPanel
              flow={graph.selectedFlow}
              nodeMap={graph.nodeMap}
              onClose={() => graph.setSelectedEdgeId(null)}
              onDelete={() => graph.deleteFlow(graph.selectedFlow!.id)}
            />
          )}
        </div>

        <AddNodeDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          mode={dialogMode}
          existingNodes={graph.financialNodes}
          editNode={editTarget}
          editConnections={dialogMode === "edit" ? editConnections : undefined}
          onSubmit={handleSubmitNode}
        />

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          impact={deletionImpact}
          nodeMap={graph.nodeMap}
          onConfirm={handleConfirmDelete}
        />

        <CsvUploadDialog
          open={csvDialogOpen}
          onOpenChange={setCsvDialogOpen}
          existingNodeIds={existingNodeIds}
          onImport={handleCsvImport}
        />

        <AgentChatModal
          agent={agentChatAgent ?? "librarian"}
          open={agentChatAgent !== null}
          onClose={() => setAgentChatAgent(null)}
          financialNodes={graph.financialNodes}
          financialFlows={graph.financialFlows}
          nodeMap={graph.nodeMap}
        />

        {/* Toast */}
        {toast && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] font-sans"
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: "#e8e8ff",
              background: "rgba(10,10,20,0.92)",
              border: "1px solid rgba(0,255,136,0.25)",
              backdropFilter: "blur(12px)",
              borderRadius: 10,
              padding: "10px 20px",
              animation: "toastIn 300ms ease",
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

export default function EcosystemPage() {
  return (
    <ReactFlowProvider>
      <EcosystemDashboard />
    </ReactFlowProvider>
  );
}
