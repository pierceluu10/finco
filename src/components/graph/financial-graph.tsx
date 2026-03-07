"use client";

import { useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type NodeDragHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import type { NodeRfData, EdgeRfData } from "@/types/graph";
import { FinancialNode } from "./financial-node";
import { FinancialEdge } from "./financial-edge";

interface FinancialGraphProps {
  nodes: Node<NodeRfData>[];
  edges: Edge<EdgeRfData>[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeClick: (event: React.MouseEvent, node: Node<NodeRfData>) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge<EdgeRfData>) => void;
  onPaneClick: () => void;
  onNodeDragStart?: NodeDragHandler;
  onNodeDrag?: NodeDragHandler;
  onNodeDragStop?: NodeDragHandler;
  selectedNodeId: string | null;
  fitViewTrigger?: number;
}

const nodeTypes: NodeTypes = { financial: FinancialNode };
const edgeTypes: EdgeTypes = { financial: FinancialEdge };

export function FinancialGraph({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  selectedNodeId,
  fitViewTrigger,
}: FinancialGraphProps) {
  const { setCenter, fitView } = useReactFlow();
  const prevSelectedRef = useRef<string | null>(null);
  const prevFitTriggerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== prevSelectedRef.current) {
      const node = nodes.find((n) => n.id === selectedNodeId);
      if (node) {
        const cx = node.position.x + node.data.radius;
        const cy = node.position.y + node.data.radius;
        setCenter(cx, cy, { zoom: 1.6, duration: 400 });
      }
    } else if (!selectedNodeId && prevSelectedRef.current) {
      fitView({ padding: 0.35, maxZoom: 1.1, duration: 300 });
    }
    prevSelectedRef.current = selectedNodeId;
  }, [selectedNodeId, nodes, setCenter, fitView]);

  useEffect(() => {
    if (
      fitViewTrigger !== undefined &&
      fitViewTrigger !== prevFitTriggerRef.current
    ) {
      fitView({ padding: 0.35, maxZoom: 1.1, duration: 300 });
    }
    prevFitTriggerRef.current = fitViewTrigger;
  }, [fitViewTrigger, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      onNodeDragStart={onNodeDragStart}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.35, maxZoom: 1.1 }}
      minZoom={0.25}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      selectionOnDrag={false}
      panOnScroll
      zoomOnScroll
      className="finco-graph"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={32}
        size={1}
        color="rgba(255, 255, 255, 0.03)"
      />
    </ReactFlow>
  );
}
