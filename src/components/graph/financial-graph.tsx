"use client";

import ReactFlow, {
  Background,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
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
}: FinancialGraphProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
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
