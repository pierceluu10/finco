"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "reactflow";
import type {
  FinancialNodeData,
  FinancialFlowData,
  NodeRfData,
  EdgeRfData,
  DeletionImpact,
} from "@/types/graph";
import { computeForceLayout } from "@/lib/graph-layout";
import {
  toReactFlowNodes,
  toReactFlowEdges,
  computeNodeRadius,
} from "@/lib/graph-transforms";

const CANVAS_W = 1800;
const CANVAS_H = 1200;

export function useFinancialGraph(
  initialNodes: FinancialNodeData[],
  initialFlows: FinancialFlowData[]
) {
  // ---- Domain state (source of truth) ----
  const [financialNodes, setFinancialNodes] =
    useState<FinancialNodeData[]>(initialNodes);
  const [financialFlows, setFinancialFlows] =
    useState<FinancialFlowData[]>(initialFlows);

  // ---- Layout persistence ----
  const pinnedRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const layoutRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const prevStructureRef = useRef<string>("");

  // ---- React Flow state ----
  const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState<NodeRfData>([]);
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState<EdgeRfData>([]);

  // ---- Selection state ----
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // ---- Node map for quick lookup ----
  const nodeMap = useMemo(() => {
    const m = new Map<string, FinancialNodeData>();
    for (const n of financialNodes) m.set(n.id, n);
    return m;
  }, [financialNodes]);

  // ---- Sync domain → RF, relayout ONLY on structural changes ----
  useEffect(() => {
    const nodeIds = financialNodes
      .map((n) => n.id)
      .sort()
      .join(",");
    const flowIds = financialFlows
      .map((f) => f.id)
      .sort()
      .join(",");
    const structureKey = `${nodeIds}|${flowIds}`;
    const structureChanged = structureKey !== prevStructureRef.current;

    if (structureChanged) {
      const layoutInput = financialNodes.map((n) => ({
        id: n.id,
        type: n.type,
        radius: computeNodeRadius(n.monthlyFlow),
      }));
      const layoutLinks = financialFlows.map((f) => ({
        source: f.source,
        target: f.target,
      }));

      layoutRef.current = computeForceLayout(
        layoutInput,
        layoutLinks,
        CANVAS_W,
        CANVAS_H,
        pinnedRef.current.size > 0 ? pinnedRef.current : undefined
      );
      prevStructureRef.current = structureKey;
    }

    setRfNodes(toReactFlowNodes(financialNodes, layoutRef.current));
    setRfEdges(toReactFlowEdges(financialFlows, nodeMap));
  }, [financialNodes, financialFlows, nodeMap, setRfNodes, setRfEdges]);

  // ---- Track user drags (derive radius from domain data, not RF state) ----
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position && change.id) {
          const domainNode = nodeMap.get(change.id);
          if (domainNode) {
            const r = computeNodeRadius(domainNode.monthlyFlow);
            pinnedRef.current.set(change.id, {
              x: change.position.x + r,
              y: change.position.y + r,
            });
          }
        }
      }
      onRfNodesChange(changes);
    },
    [onRfNodesChange, nodeMap]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onRfEdgesChange(changes);
    },
    [onRfEdgesChange]
  );

  // ---- Selection handlers ----
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeRfData>) => {
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge<EdgeRfData>) => {
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  // ---- CRUD: Add node ----
  const addNode = useCallback(
    (
      data: Omit<FinancialNodeData, "id">,
      connections: {
        targetId: string;
        direction: "to" | "from";
        amount: number;
        frequency: FinancialFlowData["frequency"];
      }[]
    ) => {
      const id = `node-${Date.now()}`;
      const newNode: FinancialNodeData = { id, ...data };

      const newFlows: FinancialFlowData[] = connections.map((c, i) => ({
        id: `flow-${id}-${i}-${Date.now()}`,
        source: c.direction === "to" ? id : c.targetId,
        target: c.direction === "to" ? c.targetId : id,
        amount: c.amount,
        frequency: c.frequency,
      }));

      setFinancialNodes((prev) => [...prev, newNode]);
      setFinancialFlows((prev) => [...prev, ...newFlows]);
      return id;
    },
    []
  );

  // ---- CRUD: Update node ----
  const updateNode = useCallback(
    (id: string, updates: Partial<Omit<FinancialNodeData, "id">>) => {
      setFinancialNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
      );
    },
    []
  );

  // ---- CRUD: Delete node (with impact analysis) ----
  const getDeletionImpact = useCallback(
    (nodeId: string): DeletionImpact | null => {
      const node = nodeMap.get(nodeId);
      if (!node) return null;

      const inbound = financialFlows.filter((f) => f.target === nodeId);
      const outbound = financialFlows.filter((f) => f.source === nodeId);

      const neighborIds = new Set<string>();
      for (const f of inbound) neighborIds.add(f.source);
      for (const f of outbound) neighborIds.add(f.target);

      const remainingFlows = financialFlows.filter(
        (f) => f.source !== nodeId && f.target !== nodeId
      );
      const stillConnected = new Set<string>();
      for (const f of remainingFlows) {
        stillConnected.add(f.source);
        stillConnected.add(f.target);
      }

      const disconnected = Array.from(neighborIds).filter(
        (id) => !stillConnected.has(id)
      );

      return {
        node,
        inboundFlows: inbound,
        outboundFlows: outbound,
        disconnectedNodeIds: disconnected,
      };
    },
    [nodeMap, financialFlows]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      pinnedRef.current.delete(nodeId);
      setFinancialNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setFinancialFlows((prev) =>
        prev.filter((f) => f.source !== nodeId && f.target !== nodeId)
      );
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [selectedNodeId]
  );

  // ---- CRUD: Bulk add (CSV import) ----
  const bulkAdd = useCallback(
    (newNodes: FinancialNodeData[], newFlows: FinancialFlowData[]) => {
      setFinancialNodes((prev) => [...prev, ...newNodes]);
      setFinancialFlows((prev) => [...prev, ...newFlows]);
    },
    []
  );

  // ---- CRUD: Flows ----
  const addFlow = useCallback((flow: Omit<FinancialFlowData, "id">) => {
    const id = `flow-${Date.now()}`;
    setFinancialFlows((prev) => [...prev, { id, ...flow }]);
    return id;
  }, []);

  const deleteFlow = useCallback(
    (flowId: string) => {
      setFinancialFlows((prev) => prev.filter((f) => f.id !== flowId));
      if (selectedEdgeId === flowId) setSelectedEdgeId(null);
    },
    [selectedEdgeId]
  );

  // ---- Derived data ----
  const selectedNode =
    selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;
  const selectedFlow = selectedEdgeId
    ? financialFlows.find((f) => f.id === selectedEdgeId) ?? null
    : null;

  const connectedFlows = useMemo(() => {
    if (!selectedNodeId) return [];
    return financialFlows.filter(
      (f) => f.source === selectedNodeId || f.target === selectedNodeId
    );
  }, [selectedNodeId, financialFlows]);

  const totalIncome = useMemo(
    () =>
      financialNodes
        .filter((n) => n.type === "income")
        .reduce((s, n) => s + n.monthlyFlow, 0),
    [financialNodes]
  );

  const totalExpenses = useMemo(
    () =>
      financialNodes
        .filter((n) => n.type === "expense" || n.type === "debt")
        .reduce((s, n) => s + n.monthlyFlow, 0),
    [financialNodes]
  );

  return {
    rfNodes,
    rfEdges,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onNodeClick: handleNodeClick,
    onEdgeClick: handleEdgeClick,
    onPaneClick: handlePaneClick,

    financialNodes,
    financialFlows,
    nodeMap,

    selectedNodeId,
    selectedEdgeId,
    selectedNode,
    selectedFlow,
    connectedFlows,
    setSelectedNodeId,
    setSelectedEdgeId,

    addNode,
    updateNode,
    deleteNode,
    bulkAdd,
    addFlow,
    deleteFlow,
    getDeletionImpact,

    totalIncome,
    totalExpenses,
  };
}
