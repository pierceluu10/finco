"use client";

import { useCallback, useMemo, useRef, useEffect } from "react";
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "reactflow";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { useShallow } from "zustand/react/shallow";
import {
  useGraphStore,
  selectNodes,
  selectEdges,
  selectSelectedNodeId,
  selectSelectedEdgeId,
} from "@/stores/graph-store";
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
  computeAllRadii,
} from "@/lib/graph-transforms";

const CANVAS_W = 1800;
const CANVAS_H = 1200;

interface SimNode extends SimulationNodeDatum {
  id: string;
  radius: number;
}

export function useFinancialGraph(
  initialNodes: FinancialNodeData[],
  initialFlows: FinancialFlowData[]
) {
  const initedRef = useRef(false);
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    const store = useGraphStore.getState();
    if (store.version === 0 && (initialNodes.length > 0 || initialFlows.length > 0)) {
      store.init(initialNodes, initialFlows);
    }
    // Intentionally run once on mount; initialNodes/initialFlows are not in deps to avoid
    // re-running when parent re-renders with new array references (single source of truth init).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const financialNodes = useGraphStore(useShallow(selectNodes));
  const financialFlows = useGraphStore(useShallow(selectEdges));
  const selectedNodeId = useGraphStore(selectSelectedNodeId);
  const selectedEdgeId = useGraphStore(selectSelectedEdgeId);

  const pinnedRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const layoutRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const prevStructureRef = useRef<string>("");

  const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState<NodeRfData>([]);
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState<EdgeRfData>([]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, FinancialNodeData>();
    for (const n of financialNodes) m.set(n.id, n);
    return m;
  }, [financialNodes]);

  const radiiMap = useMemo(() => computeAllRadii(financialNodes), [financialNodes]);

  // IDs of nodes directly connected to the selected node
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>();
    ids.add(selectedNodeId);
    for (const f of financialFlows) {
      if (f.source === selectedNodeId) ids.add(f.target);
      if (f.target === selectedNodeId) ids.add(f.source);
    }
    return ids;
  }, [selectedNodeId, financialFlows]);

  // ---- Physics simulation refs ----
  const simulationRef = useRef<Simulation<SimNode, SimulationLinkDatum<SimNode>> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const draggingIdRef = useRef<string | null>(null);

  // ---- Sync domain → RF + init physics sim on structure change ----
  useEffect(() => {
    const nodeIds = financialNodes.map((n) => n.id).sort().join(",");
    const flowIds = financialFlows.map((f) => f.id).sort().join(",");
    const structureKey = `${nodeIds}|${flowIds}`;
    const structureChanged = structureKey !== prevStructureRef.current;

    if (structureChanged) {
      const layoutInput = financialNodes.map((n) => ({
        id: n.id,
        type: n.type,
        radius: radiiMap.get(n.id) ?? 30,
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

    const simNodes: SimNode[] = financialNodes.map((n) => {
      const pos = layoutRef.current.get(n.id) ?? { x: CANVAS_W / 2, y: CANVAS_H / 2 };
      return {
        id: n.id,
        radius: radiiMap.get(n.id) ?? 30,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
      };
    });

    const simLinks: SimulationLinkDatum<SimNode>[] = financialFlows.map((f) => ({
      source: f.source,
      target: f.target,
    }));

    simulationRef.current?.stop();

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance(140)
          .strength(0.3)
      )
      .force("charge", forceManyBody<SimNode>().strength(-300))
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius((d) => d.radius + 24)
          .strength(0.8)
      )
      .velocityDecay(0.35)
      .alphaDecay(0.025)
      .on("tick", () => {
        const dragId = draggingIdRef.current;
        setRfNodes((prev) =>
          prev.map((rfNode) => {
            if (rfNode.id === dragId) return rfNode;
            const simNode = simNodesRef.current.find((s) => s.id === rfNode.id);
            if (!simNode || simNode.x == null || simNode.y == null) return rfNode;
            return {
              ...rfNode,
              position: {
                x: simNode.x - rfNode.data.radius,
                y: simNode.y - rfNode.data.radius,
              },
            };
          })
        );
      })
      .alpha(0)
      .stop();

    simulationRef.current = sim;
    simNodesRef.current = simNodes;

    setRfNodes(toReactFlowNodes(financialNodes, layoutRef.current, radiiMap));
    setRfEdges(toReactFlowEdges(financialFlows, nodeMap));

    return () => { sim.stop(); };
  }, [financialNodes, financialFlows, nodeMap, radiiMap, setRfNodes, setRfEdges]);

  // ---- Apply dimming when selection changes ----
  useEffect(() => {
    setRfNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...n.data,
          dimmed: selectedNodeId ? !connectedNodeIds.has(n.id) : false,
        },
      }))
    );
    setRfEdges((prev) =>
      prev.map((e) => {
        const d = (e.data ?? {}) as Partial<EdgeRfData>;
        return {
          ...e,
          data: {
            amount: d.amount ?? 0,
            frequency: d.frequency ?? "monthly",
            sourceLabel: d.sourceLabel ?? "",
            targetLabel: d.targetLabel ?? "",
            dimmed: selectedNodeId
              ? e.source !== selectedNodeId && e.target !== selectedNodeId
              : false,
          },
        };
      })
    );
  }, [selectedNodeId, connectedNodeIds, setRfNodes, setRfEdges]);

  // ---- React Flow change handlers ----
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => { onRfNodesChange(changes); },
    [onRfNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => { onRfEdgesChange(changes); },
    [onRfEdgesChange]
  );

  // ---- Physics drag handlers ----
  const handleNodeDragStart = useCallback(
    (_: React.MouseEvent, node: Node<NodeRfData>) => {
      draggingIdRef.current = node.id;
      const simNode = simNodesRef.current.find((s) => s.id === node.id);
      if (simNode) {
        simNode.fx = node.position.x + node.data.radius;
        simNode.fy = node.position.y + node.data.radius;
      }
      simulationRef.current?.alpha(0.3).restart();
    },
    []
  );

  const handleNodeDrag = useCallback(
    (_: React.MouseEvent, node: Node<NodeRfData>) => {
      const simNode = simNodesRef.current.find((s) => s.id === node.id);
      if (simNode) {
        simNode.fx = node.position.x + node.data.radius;
        simNode.fy = node.position.y + node.data.radius;
      }
      const sim = simulationRef.current;
      if (sim && sim.alpha() < 0.1) sim.alpha(0.1);
    },
    []
  );

  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node<NodeRfData>) => {
      const simNode = simNodesRef.current.find((s) => s.id === node.id);
      if (simNode) {
        simNode.fx = undefined;
        simNode.fy = undefined;
      }
      draggingIdRef.current = null;
      for (const sn of simNodesRef.current) {
        if (sn.x != null && sn.y != null) {
          pinnedRef.current.set(sn.id, { x: sn.x, y: sn.y });
          layoutRef.current.set(sn.id, { x: sn.x, y: sn.y });
        }
      }
    },
    []
  );

  // ---- Selection handlers ----
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeRfData>) => {
      const store = useGraphStore.getState();
      store.setSelectedNodeId(store.selectedNodeId === node.id ? null : node.id);
      store.setSelectedEdgeId(null);
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge<EdgeRfData>) => {
      useGraphStore.getState().setSelectedEdgeId(edge.id);
      useGraphStore.getState().setSelectedNodeId(null);
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    useGraphStore.getState().setSelectedNodeId(null);
    useGraphStore.getState().setSelectedEdgeId(null);
  }, []);

  const deselectNode = useCallback(() => {
    useGraphStore.getState().setSelectedNodeId(null);
  }, []);

  const setSelectedNodeId = useCallback((id: string | null) => {
    useGraphStore.getState().setSelectedNodeId(id);
  }, []);

  const setSelectedEdgeId = useCallback((id: string | null) => {
    useGraphStore.getState().setSelectedEdgeId(id);
  }, []);

  // ---- CRUD ----
  const addNode = useCallback(
    (
      data: Omit<FinancialNodeData, "id">,
      connections: {
        targetId: string;
        direction: "to" | "from";
        amount: number;
        frequency: FinancialFlowData["frequency"];
      }[],
      initialPosition?: { x: number; y: number }
    ) => {
      const id = `node-${Date.now()}`;
      const newNode: FinancialNodeData = { id, ...data };
      if (initialPosition) {
        pinnedRef.current.set(id, initialPosition);
        layoutRef.current.set(id, initialPosition);
      }
      useGraphStore.getState().addNode(newNode);
      connections.forEach((c, i) => {
        useGraphStore.getState().addEdge({
          id: `flow-${id}-${i}-${Date.now()}`,
          source: c.direction === "to" ? id : c.targetId,
          target: c.direction === "to" ? c.targetId : id,
          amount: c.amount,
          frequency: c.frequency,
        });
      });
      return id;
    },
    []
  );

  const updateNode = useCallback(
    (id: string, updates: Partial<Omit<FinancialNodeData, "id">>) => {
      useGraphStore.getState().updateNode(id, updates);
    },
    []
  );

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
      return { node, inboundFlows: inbound, outboundFlows: outbound, disconnectedNodeIds: disconnected };
    },
    [nodeMap, financialFlows]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      pinnedRef.current.delete(nodeId);
      useGraphStore.getState().deleteNode(nodeId);
    },
    []
  );

  const bulkAdd = useCallback(
    (newNodes: FinancialNodeData[], newFlows: FinancialFlowData[]) => {
      useGraphStore.getState().bulkAdd(newNodes, newFlows);
    },
    []
  );

  const addFlow = useCallback((flow: Omit<FinancialFlowData, "id">) => {
    const id = `flow-${Date.now()}`;
    useGraphStore.getState().addEdge({ id, ...flow });
    return id;
  }, []);

  const updateFlow = useCallback(
    (flowId: string, updates: Partial<Omit<FinancialFlowData, "id">>) => {
      useGraphStore.getState().updateEdge(flowId, updates);
    },
    []
  );

  const deleteFlow = useCallback(
    (flowId: string) => {
      useGraphStore.getState().deleteEdge(flowId);
    },
    []
  );

  // ---- Derived data ----
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;
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
    () => financialNodes.filter((n) => n.type === "income").reduce((s, n) => s + n.monthlyFlow, 0),
    [financialNodes]
  );

  const totalExpenses = useMemo(
    () => financialNodes.filter((n) => n.type === "expense" || n.type === "debt").reduce((s, n) => s + n.monthlyFlow, 0),
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
    onNodeDragStart: handleNodeDragStart,
    onNodeDrag: handleNodeDrag,
    onNodeDragStop: handleNodeDragStop,

    financialNodes,
    financialFlows,
    nodeMap,
    connectedNodeIds,

    selectedNodeId,
    selectedEdgeId,
    selectedNode,
    selectedFlow,
    connectedFlows,
    setSelectedNodeId,
    setSelectedEdgeId,
    deselectNode,

    addNode,
    updateNode,
    deleteNode,
    bulkAdd,
    addFlow,
    updateFlow,
    deleteFlow,
    getDeletionImpact,

    totalIncome,
    totalExpenses,
  };
}
