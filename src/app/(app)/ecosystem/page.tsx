"use client";

import { useState, useMemo, useCallback } from "react";
import { ReactFlowProvider } from "reactflow";
import { Plus, Upload } from "lucide-react";

import { demoNodes, demoEdges } from "@/lib/demo-data";
import { fromDemoData } from "@/lib/graph-transforms";
import { useFinancialGraph } from "@/hooks/use-financial-graph";

import { AppSidebar } from "@/components/shared/app-sidebar";
import { FinancialGraph } from "@/components/graph/financial-graph";
import { GraphLegend } from "@/components/graph/graph-legend";
import { NodeDetailPanel } from "@/components/panels/node-detail-panel";
import { EdgeDetailPanel } from "@/components/panels/edge-detail-panel";
import { AddNodeDialog } from "@/components/panels/add-node-dialog";
import { DeleteConfirmDialog } from "@/components/panels/delete-confirm-dialog";
import { CsvUploadDialog } from "@/components/panels/csv-upload-dialog";
import type { DialogMode, FinancialNodeData, FinancialFlowData } from "@/types/graph";

const seedData = fromDemoData(demoNodes, demoEdges);

function EcosystemDashboard() {
  const graph = useFinancialGraph(seedData.nodes, seedData.flows);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("add");
  const [editTarget, setEditTarget] = useState<FinancialNodeData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);

  const deletionImpact = useMemo(
    () => (deleteTarget ? graph.getDeletionImpact(deleteTarget) : null),
    [deleteTarget, graph]
  );

  const existingNodeIds = useMemo(
    () => new Set(graph.financialNodes.map((n) => n.id)),
    [graph.financialNodes]
  );

  // Connections for edit mode
  const editConnections = useMemo(() => {
    if (!editTarget) return [];
    return graph.financialFlows
      .filter(
        (f) => f.source === editTarget.id || f.target === editTarget.id
      )
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

  const openEditDialog = useCallback(() => {
    if (!graph.selectedNode) return;
    setDialogMode("edit");
    setEditTarget(graph.selectedNode);
    setAddDialogOpen(true);
  }, [graph.selectedNode]);

  const openDeleteDialog = useCallback(() => {
    if (!graph.selectedNodeId) return;
    setDeleteTarget(graph.selectedNodeId);
    setDeleteDialogOpen(true);
  }, [graph.selectedNodeId]);

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
      {/* Left sidebar */}
      <AppSidebar
        totalIncome={graph.totalIncome}
        totalExpenses={graph.totalExpenses}
        nodeCount={graph.financialNodes.length}
        flowCount={graph.financialFlows.length}
      />

      {/* Central canvas */}
      <div className="relative flex-1 h-full">
        <FinancialGraph
          nodes={graph.rfNodes}
          edges={graph.rfEdges}
          onNodesChange={graph.onNodesChange}
          onEdgesChange={graph.onEdgesChange}
          onNodeClick={graph.onNodeClick}
          onEdgeClick={graph.onEdgeClick}
          onPaneClick={graph.onPaneClick}
        />

        {/* Legend overlay — bottom left */}
        <div className="absolute bottom-4 left-4 z-10">
          <GraphLegend />
        </div>

        {/* Bottom-right action buttons */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
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

        {/* Edge detail — floating */}
        {graph.selectedFlow && (
          <EdgeDetailPanel
            flow={graph.selectedFlow}
            nodeMap={graph.nodeMap}
            onClose={() => graph.setSelectedEdgeId(null)}
            onDelete={() => graph.deleteFlow(graph.selectedFlow!.id)}
          />
        )}
      </div>

      {/* Right detail panel (node selected) */}
      {graph.selectedNode && (
        <NodeDetailPanel
          node={graph.selectedNode}
          connectedFlows={graph.connectedFlows}
          nodeMap={graph.nodeMap}
          onClose={() => graph.setSelectedNodeId(null)}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
        />
      )}

      {/* Add / Edit dialog */}
      <AddNodeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        mode={dialogMode}
        existingNodes={graph.financialNodes}
        editNode={editTarget}
        editConnections={dialogMode === "edit" ? editConnections : undefined}
        onSubmit={handleSubmitNode}
      />

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        impact={deletionImpact}
        nodeMap={graph.nodeMap}
        onConfirm={handleConfirmDelete}
      />

      {/* CSV upload dialog */}
      <CsvUploadDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
        existingNodeIds={existingNodeIds}
        onImport={handleCsvImport}
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
