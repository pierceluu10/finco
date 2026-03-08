"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

import { demoNodes, demoEdges } from "@/lib/demo-data";
import { fromDemoData } from "@/lib/graph-transforms";
import { useFinancialGraph } from "@/hooks/use-financial-graph";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

import { AppSidebar } from "@/components/shared/app-sidebar";
import { ThreeGraph } from "@/components/graph/three-graph";
import { GraphLegend } from "@/components/graph/graph-legend";
import { EdgeDetailPanel } from "@/components/panels/edge-detail-panel";
import { AddNodeDialog } from "@/components/panels/add-node-dialog";
import { DeleteConfirmDialog } from "@/components/panels/delete-confirm-dialog";
import { CsvUploadDialog } from "@/components/panels/csv-upload-dialog";
import { AgentChatModal } from "@/components/panels/agent-chat-modal";
import { SimulationOverlay } from "@/components/panels/simulation-overlay";
import { StemNodeModal } from "@/components/panels/stem-node-modal";
import type { GraphSnapshotNode } from "@/components/graph/three-graph";
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

type AgentType = "sentinel" | "simulator" | "planner";

const ONBOARDING_STORAGE_KEY = "finco-onboarding-data";
const TRANSITION = "350ms cubic-bezier(0.4, 0, 0.2, 1)";
const SIDEBAR_SLIDE = "500ms cubic-bezier(0.34, 1.56, 0.64, 1)";

const seedData = fromDemoData(demoNodes, demoEdges);

function EcosystemDashboard() {
  const graph = useFinancialGraph(seedData.nodes, seedData.flows);
  const stats = useDashboardStats();

  // ── Merge onboarding data from sessionStorage (after signup → onboarding → continue) ──
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        nodes?: FinancialNodeData[];
        flows?: FinancialFlowData[];
      };
      sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
      const nodes = data.nodes ?? [];
      const flows = data.flows ?? [];
      if (nodes.length > 0 || flows.length > 0) graph.bulkAdd(nodes, flows);
    } catch {
      /* noop */
    }
  }, [graph]);

  // ── Sidebar collapse (session only; always expanded on refresh) ──
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // ── Entry sequence — always plays on mount, no sessionStorage ──
  const [sidebarIn, setSidebarIn] = useState(false);
  const [contentIn, setContentIn] = useState(false);
  const [graphIn, setGraphIn] = useState(false);
  const [_uiIn, setUiIn] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [burstActive, setBurstActive] = useState(false);
  const [interactionEnabled, setInteractionEnabled] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setSidebarIn(true), 1200),
      setTimeout(() => setContentIn(true), 1400),
      setTimeout(() => { setGraphIn(true); setBurstActive(true); }, 1700),
      setTimeout(() => setUiIn(true), 1900),
      setTimeout(() => setInteractionEnabled(true), 2200),
      setTimeout(() => setIntroDone(true), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Dialogs ──
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- setters reserved for edit flow
  const [dialogMode, setDialogMode] = useState<DialogMode>("add");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- setters reserved for edit flow
  const [editTarget, setEditTarget] = useState<FinancialNodeData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [agentChatAgent, setAgentChatAgent] = useState<AgentType | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simulationPayload, setSimulationPayload] = useState<{
    responseText: string;
    nodes: GraphSnapshotNode[];
    flows: FinancialFlowData[];
  } | null>(null);
  const graphSnapshotRef = useRef<{ nodes: GraphSnapshotNode[]; flows: FinancialFlowData[] } | null>(null);

  const [stemModalOpen, setStemModalOpen] = useState(false);
  const [stemParentNode, setStemParentNode] = useState<FinancialNodeData | null>(null);
  const [stemParentPosition, setStemParentPosition] = useState<{ x: number; y: number } | null>(null);
  const [linkModeSourceId, setLinkModeSourceId] = useState<string | null>(null);
  const [linkToast, setLinkToast] = useState<string | null>(null);
  const linkToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashNodeId, setFlashNodeId] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      .filter((f) => f.source === editTarget.id || f.target === editTarget.id)
      .map((f) => ({
        targetId: f.source === editTarget.id ? f.target : f.source,
        direction: (f.source === editTarget.id ? "to" : "from") as "to" | "from",
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
          (n) => n.type === fType && n.label.toLowerCase() === an.label.toLowerCase()
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

  const handleSelectNode = useCallback(
    (id: string) => {
      graph.setSelectedNodeId(id);
      graph.setSelectedEdgeId(null);
    },
    [graph]
  );

  const handleGraphSnapshot = useCallback((nodes: GraphSnapshotNode[], flows: FinancialFlowData[]) => {
    graphSnapshotRef.current = { nodes, flows };
  }, []);

  const handleSimulatorResponseComplete = useCallback((responseText: string) => {
    const snap = graphSnapshotRef.current;
    if (!snap || snap.nodes.length === 0) return;
    setSimulationPayload({
      responseText,
      nodes: snap.nodes.map((n) => ({ ...n, metadata: { ...n.metadata } })),
      flows: snap.flows.map((f) => ({ ...f })),
    });
    setSimulationOpen(true);
  }, []);

  const handleSimulationApply = useCallback(
    (updates: Map<string, { currentValue?: number; monthlyFlow?: number }>) => {
      updates.forEach((val, id) => {
        graph.updateNode(id, val);
      });
      setSimulationOpen(false);
      setSimulationPayload(null);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast("Simulation applied to your ecosystem");
      toastTimerRef.current = setTimeout(() => setToast(null), 3500);
    },
    [graph]
  );

  const handleUpdateNodeValue = useCallback(
    (nodeId: string, value: number, field: "currentValue" | "monthlyFlow") => {
      const node = graph.nodeMap.get(nodeId);
      if (!node) return;
      const before = field === "currentValue" ? node.currentValue : node.monthlyFlow;
      graph.updateNode(nodeId, { [field]: value });
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashNodeId(nodeId);
      flashTimerRef.current = setTimeout(() => setFlashNodeId(null), 300);
      const graphState = `Node "${node.label}" ${field} changed from ${before} to ${value}.`;
      fetch("/api/ai/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graphState,
          message: "Briefly note any impact on the user's finances.",
        }),
      }).catch(() => {});
    },
    [graph]
  );

  const handleRequestStemNode = useCallback(
    (parentNode: FinancialNodeData, parentPosition: { x: number; y: number }) => {
      setStemParentNode(parentNode);
      setStemParentPosition(parentPosition);
      setStemModalOpen(true);
    },
    []
  );

  const handleStemSubmit = useCallback(
    (
      data: Omit<FinancialNodeData, "id">,
      connections: { targetId: string; direction: "to" | "from"; amount: number; frequency: FinancialFlowData["frequency"] }[],
      initialPosition: { x: number; y: number }
    ) => {
      const newNodeId = graph.addNode(data, connections, initialPosition);
      const parentId = stemParentNode?.id;
      if (parentId) {
        const flow = graph.financialFlows.find(
          (f) => (f.source === newNodeId && f.target === parentId) || (f.source === parentId && f.target === newNodeId)
        );
        if (flow) {
          const newNode = graph.nodeMap.get(newNodeId);
          const parentNode = graph.nodeMap.get(parentId);
          if (newNode && parentNode) {
            fetch("/api/ai/sentinel-json", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userMessage: `Two financial nodes are being linked. Analyze both and determine the direction of money flow between them.

Node A: name '${parentNode.label}', type ${parentNode.type}, amount ${parentNode.currentValue > 0 ? parentNode.currentValue : parentNode.monthlyFlow}
Node B: name '${newNode.label}', type ${newNode.type}, amount ${newNode.currentValue > 0 ? newNode.currentValue : newNode.monthlyFlow}

Determine:
1. direction: either 'AtoB' or 'BtoA' indicating which node sends money to the other
2. flowAmount: a realistic monthly flow amount in CAD based on both node amounts
3. frequency: monthly, weekly, or annual
4. reasoning: one sentence explaining the money relationship

Return only a JSON object with these four fields. No explanation. No markdown.`,
              }),
            })
              .then((r) => r.json())
              .then((res) => {
                const d = res.data as Record<string, unknown> | null;
                if (d && typeof d.direction === "string" && typeof d.flowAmount === "number") {
                  const dir = String(d.direction).toUpperCase();
                  const freq = (typeof d.frequency === "string" ? d.frequency : "monthly") as FinancialFlowData["frequency"];
                  if (dir === "BTOA") {
                    graph.updateFlow(flow.id, { source: newNodeId, target: parentId, amount: d.flowAmount, frequency: freq });
                  } else {
                    graph.updateFlow(flow.id, { source: parentId, target: newNodeId, amount: d.flowAmount, frequency: freq });
                  }
                }
              })
              .catch(() => {});
          }
        }
      }
      return newNodeId;
    },
    [graph, stemParentNode]
  );

  const handleRequestLinkMode = useCallback(() => {
    if (graph.selectedNodeId) setLinkModeSourceId(graph.selectedNodeId);
  }, [graph.selectedNodeId]);

  const handleLinkTargetSelected = useCallback(
    async (targetNodeId: string) => {
      const sourceId = linkModeSourceId;
      if (!sourceId || sourceId === targetNodeId) return;
      const nodeA = graph.nodeMap.get(sourceId);
      const nodeB = graph.nodeMap.get(targetNodeId);
      if (!nodeA || !nodeB) return;
      try {
        const res = await fetch("/api/ai/sentinel-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: `Two financial nodes are being linked. Analyze both and determine the direction of money flow between them.

Node A: name '${nodeA.label}', type ${nodeA.type}, amount ${nodeA.currentValue > 0 ? nodeA.currentValue : nodeA.monthlyFlow}
Node B: name '${nodeB.label}', type ${nodeB.type}, amount ${nodeB.currentValue > 0 ? nodeB.currentValue : nodeB.monthlyFlow}

Determine:
1. direction: either 'AtoB' or 'BtoA' indicating which node sends money to the other
2. flowAmount: a realistic monthly flow amount in CAD based on both node amounts
3. frequency: monthly, weekly, or annual
4. reasoning: one sentence explaining the money relationship

Return only a JSON object with these four fields. No explanation. No markdown.`,
          }),
        });
        const data = await res.json();
        const d = data.data as Record<string, unknown> | null;
        const _confidence = typeof d?.confidence === "string" ? d.confidence : "";
        let source = sourceId;
        let target = targetNodeId;
        let flowAmount = 0;
        let frequency: FinancialFlowData["frequency"] = "monthly";
        if (d && typeof d.direction === "string" && typeof d.flowAmount === "number") {
          flowAmount = d.flowAmount;
          frequency = (typeof d.frequency === "string" ? d.frequency : "monthly") as FinancialFlowData["frequency"];
          if (String(d.direction).toUpperCase() === "BTOA") {
            source = targetNodeId;
            target = sourceId;
          }
        }
        graph.addFlow({ source, target, amount: flowAmount, frequency });
        const fromLabel = graph.nodeMap.get(source)?.label ?? source;
        const toLabel = graph.nodeMap.get(target)?.label ?? target;
        if (linkToastTimerRef.current) clearTimeout(linkToastTimerRef.current);
        setLinkToast(`${fromLabel} → ${toLabel} linked · $${flowAmount}/${frequency}`);
        linkToastTimerRef.current = setTimeout(() => setLinkToast(null), 3000);
      } finally {
        setLinkModeSourceId(null);
        graph.setSelectedNodeId(sourceId);
      }
    },
    [linkModeSourceId, graph]
  );

  const handleCancelLinkMode = useCallback(() => {
    setLinkModeSourceId(null);
  }, []);

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
      {/* ── PHASE 1 — Intro overlay: "Your Financial Ecosystem." ── */}
      {!sidebarIn && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{ background: "#050508" }}
        >
          <div
            className="text-center"
            style={{ animation: "introLogoSeq 1200ms cubic-bezier(0.4,0,0.2,1) forwards" }}
          >
            <div className="flex items-center justify-center gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 448 512">
                <path fill="#7F7FFA" d="M248 106.6c18.9-9 32-28.3 32-50.6c0-30.9-25.1-56-56-56s-56 25.1-56 56c0 22.3 13.1 41.6 32 50.6v98.8c-2.8 1.3-5.5 2.9-8 4.7l-80.1-45.8c1.6-20.8-8.6-41.6-27.9-52.8C57.2 96 23 105.2 7.5 132S1.2 193 28 208.5c1.3.8 2.6 1.5 4 2.1v90.8c-1.3.6-2.7 1.3-4 2.1C1.2 319-8 353.2 7.5 380s49.7 36 76.5 20.5c19.3-11.1 29.4-32 27.8-52.8l50.5-28.9c-11.5-11.2-19.9-25.6-23.8-41.7l-50.5 29c-2.6-1.8-5.2-3.3-8-4.7v-90.8c2.8-1.3 5.5-2.9 8-4.7l80.1 45.8c-.1 1.4-.2 2.8-.2 4.3c0 22.3 13.1 41.6 32 50.6v98.8c-18.9 9-32 28.3-32 50.6c0 30.9 25.1 56 56 56s56-25.1 56-56c0-22.3-13.1-41.6-32-50.6v-98.8c2.8-1.3 5.5-2.9 8-4.7l80.1 45.8c-1.6 20.8 8.6 41.6 27.8 52.8c26.8 15.5 61 6.3 76.5-20.5s6.3-61-20.5-76.5c-1.3-.8-2.7-1.5-4-2.1v-90.8c1.4-.6 2.7-1.3 4-2.1c26.8-15.5 36-49.7 20.5-76.5s-49.5-36-76.3-20.5c-19.3 11.1-29.4 32-27.8 52.8l-50.6 28.9c11.5 11.2 19.9 25.6 23.8 41.7l50.6-29c2.6 1.8 5.2 3.3 8 4.7v90.8c-2.8 1.3-5.5 2.9-8 4.6l-80.1-45.8c.1-1.4.2-2.8.2-4.3c0-22.3-13.1-41.6-32-50.6v-98.8z" />
              </svg>
              <span className="font-bold tracking-[-0.018em] text-finco-blue text-[30px]">
                Finco
              </span>
            </div>
            <p
              className="font-sans mt-3 font-semibold tracking-[-0.01em]"
              style={{ fontSize: 20, color: "#e8e8ff" }}
            >
              Your Financial Ecosystem.
            </p>
          </div>
        </div>
      )}

      {/* ── Main layout: background and UI static; only node graph animates (inside ThreeGraph) ── */}
      <div
        className="h-full w-full"
        style={{
          paddingLeft: sidebarCollapsed ? 24 : "25vw",
          transition: `padding-left ${TRANSITION}`,
          opacity: sidebarIn ? 1 : 0,
          pointerEvents: sidebarIn ? "auto" : "none",
        }}
      >
        <AppSidebar
          totalIncome={stats.totalIncome}
          totalExpenses={stats.totalExpenses}
          nodeCount={stats.nodeCount}
          flowCount={stats.flowCount}
          financialNodes={graph.financialNodes}
          financialFlows={graph.financialFlows}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onOpenAgentChat={(agent) => setAgentChatAgent(agent)}
          onAddNodeDirect={(data, connections) => graph.addNode(data, connections)}
          onCsvImportDirect={handleCsvImport}
          onParsedCsvMerge={handleParsedCsvMerge}
          introStyle={sidebarOuter}
          introContentOpacity={sidebarContentOverride}
        />

        <div className="relative h-full min-h-0 overflow-hidden">
          {/* Background and vector: no animation, always visible when content is shown */}
          <Image
            src="/images/Vector.png"
            alt=""
            fill
            className="object-cover pointer-events-none select-none"
            style={{ opacity: 0.105, zIndex: 0 }}
            priority
          />

          {/* Only the node graph (ThreeGraph) has intro animation; background/vector/Flow stay still */}
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
            graphIntroDone={graphIn}
            onGraphSnapshot={handleGraphSnapshot}
            onUpdateNodeValue={handleUpdateNodeValue}
            onRequestStemNode={handleRequestStemNode}
            onRequestLinkMode={handleRequestLinkMode}
            linkModeSourceId={linkModeSourceId}
            onLinkTargetSelected={handleLinkTargetSelected}
            onCancelLinkMode={handleCancelLinkMode}
            flashNodeId={flashNodeId}
            onRequestDeleteNode={(nodeId) => {
              setDeleteTarget(nodeId);
              setDeleteDialogOpen(true);
            }}
          />

          <div
            className="absolute bottom-4 left-4"
            style={{ zIndex: 10 }}
          >
            <GraphLegend />
          </div>

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
          agent={agentChatAgent ?? "sentinel"}
          open={agentChatAgent !== null}
          onClose={() => setAgentChatAgent(null)}
          financialNodes={graph.financialNodes}
          financialFlows={graph.financialFlows}
          nodeMap={graph.nodeMap}
          selectedNodeId={graph.selectedNodeId ?? undefined}
          onSimulatorResponseComplete={handleSimulatorResponseComplete}
        />

        {simulationPayload && (
          <SimulationOverlay
            open={simulationOpen}
            onClose={() => {
              setSimulationOpen(false);
              setSimulationPayload(null);
            }}
            responseText={simulationPayload.responseText}
            nodes={simulationPayload.nodes}
            flows={simulationPayload.flows}
            onApply={handleSimulationApply}
          />
        )}

        {stemModalOpen && stemParentNode && stemParentPosition && (
          <StemNodeModal
            open={stemModalOpen}
            onClose={() => {
              setStemModalOpen(false);
              setStemParentNode(null);
              setStemParentPosition(null);
            }}
            parentNode={stemParentNode}
            parentPosition={stemParentPosition}
            onSubmit={handleStemSubmit}
            onOpenNewNodePopup={(nodeId) => {
              graph.setSelectedNodeId(nodeId);
            }}
          />
        )}

        {linkToast && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] font-sans font-semibold text-[13px] text-[#e8e8ff] rounded-lg px-4 py-3"
            style={{
              background: "#0a0a14",
              border: "1px solid rgba(0,255,136,0.2)",
              borderLeft: "3px solid #00ff88",
              animation: "toastIn 300ms ease",
            }}
          >
            {linkToast}
          </div>
        )}

        {toast && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]"
            style={{
              fontFamily: "'Manrope', sans-serif",
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
  return <EcosystemDashboard />;
}
