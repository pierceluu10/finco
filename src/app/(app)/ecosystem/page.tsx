"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ReactFlowProvider } from "reactflow";
import Image from "next/image";

import { demoNodes, demoEdges } from "@/lib/demo-data";
import { fromDemoData } from "@/lib/graph-transforms";
import { useFinancialGraph } from "@/hooks/use-financial-graph";

import { AppSidebar } from "@/components/shared/app-sidebar";
import { FinancialGraph } from "@/components/graph/financial-graph";
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
const FIT_VIEW_DELAY = 50;

const seedData = fromDemoData(demoNodes, demoEdges);

function EcosystemDashboard() {
  const graph = useFinancialGraph(seedData.nodes, seedData.flows);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setFitViewTrigger((c) => c + 1);
      }, TRANSITION_MS + FIT_VIEW_DELAY);

      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

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

  const openAddDialog = useCallback(() => {
    setDialogMode("add");
    setEditTarget(null);
    setAddDialogOpen(true);
  }, []);

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

      setTimeout(() => setFitViewTrigger((c) => c + 1), 400);

      return totalAffected;
    },
    [graph]
  );

  const TRANSITION = "350ms cubic-bezier(0.4, 0, 0.2, 1)";

  return (
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
      />

      <div className="relative h-full overflow-hidden">
        {/* Background image — z-0 */}
        <Image
          src="/images/Vector.png"
          alt=""
          fill
          className="object-cover pointer-events-none select-none"
          style={{ opacity: 0.105, zIndex: 0 }}
          priority
        />

        {/* Graph canvas — z-[1] */}
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          <FinancialGraph
            nodes={graph.rfNodes}
            edges={graph.rfEdges}
            onNodesChange={graph.onNodesChange}
            onEdgesChange={graph.onEdgesChange}
            onNodeClick={graph.onNodeClick}
            onEdgeClick={graph.onEdgeClick}
            onPaneClick={graph.onPaneClick}
            onNodeDragStart={graph.onNodeDragStart}
            onNodeDrag={graph.onNodeDrag}
            onNodeDragStop={graph.onNodeDragStop}
            selectedNodeId={graph.selectedNodeId}
            fitViewTrigger={fitViewTrigger}
          />
        </div>

        {/* Node popup — z-50 */}
        {graph.selectedNode && (
          <NodePopup
            node={graph.selectedNode}
            connectedFlows={graph.connectedFlows}
            nodeMap={graph.nodeMap}
            onClose={graph.deselectNode}
          />
        )}

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4" style={{ zIndex: 10 }}>
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
  );
}

export default function EcosystemPage() {
  return (
    <ReactFlowProvider>
      <EcosystemDashboard />
    </ReactFlowProvider>
  );
}
