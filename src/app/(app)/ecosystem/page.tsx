"use client";

import { useState, useMemo, useCallback } from "react";
import { ReactFlowProvider } from "reactflow";
import { Plus, Upload } from "lucide-react";
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
import { LibrarianChat } from "@/components/panels/librarian-chat";
import { NodePopup } from "@/components/panels/node-popup";
import type { DialogMode, FinancialNodeData, FinancialFlowData } from "@/types/graph";

const seedData = fromDemoData(demoNodes, demoEdges);

function EcosystemDashboard() {
  const graph = useFinancialGraph(seedData.nodes, seedData.flows);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("add");
  const [editTarget, setEditTarget] = useState<FinancialNodeData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [librarianOpen, setLibrarianOpen] = useState(false);

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

  const openAddDialog = useCallback(() => {
    setDialogMode("add");
    setEditTarget(null);
    setAddDialogOpen(true);
  }, []);

  const handleSubmitNode = useCallback(
    (
      data: Omit<FinancialNodeData, "id">,
      connections: { targetId: string; direction: "to" | "from"; amount: number; frequency: FinancialFlowData["frequency"] }[]
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

  return (
    <div className="flex h-full w-full">
      <AppSidebar
        totalIncome={graph.totalIncome}
        totalExpenses={graph.totalExpenses}
        nodeCount={graph.financialNodes.length}
        flowCount={graph.financialFlows.length}
        onOpenLibrarian={() => setLibrarianOpen(true)}
      />

      <div className="relative flex-1 h-full overflow-hidden">
        {/* Background image — z-0 */}
        <Image
          src="/images/Vector.png"
          alt=""
          fill
          className="object-cover pointer-events-none select-none"
          style={{ opacity: 0.07, zIndex: 0 }}
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

        {/* Action buttons */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2" style={{ zIndex: 10 }}>
          <button
            onClick={() => setCsvDialogOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-white/15 transition shadow-lg"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={openAddDialog}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-white/15 transition shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Add Node
          </button>
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

      <LibrarianChat
        open={librarianOpen}
        onClose={() => setLibrarianOpen(false)}
        financialNodes={graph.financialNodes}
        financialFlows={graph.financialFlows}
        nodeMap={graph.nodeMap}
      />
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
