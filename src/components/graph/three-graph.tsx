"use client";

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
  type Simulation,
} from "d3-force";
import type { FinancialNodeType, FinancialNodeData, FinancialFlowData } from "@/types/graph";
import { getNodeColor, HEALTH_POS, HEALTH_NEG } from "@/lib/graph-theme";
import { formatCurrency } from "@/lib/utils";
import { NodePopup } from "@/components/panels/node-popup";
import Image from "next/image";
import { Workflow } from "lucide-react";

/* ── Types ── */

interface SimNode extends SimulationNodeDatum {
  id: string;
  radius: number;
}

interface NodeView {
  id: string;
  label: string;
  type: FinancialNodeType;
  amount: number;
  radius: number;
  color: string;
  x: number;
  y: number;
}

export interface ThreeGraphProps {
  rfNodes: unknown[];
  financialNodes: Array<{
    id: string;
    label: string;
    type: FinancialNodeType;
    currentValue: number;
    monthlyFlow: number;
    metadata: Record<string, unknown>;
  }>;
  financialFlows: Array<{
    id: string;
    source: string;
    target: string;
    amount: number;
    frequency: string;
  }>;
  nodeMap: Map<string, FinancialNodeData>;
  selectedNodeId: string | null;
  connectedNodeIds: Set<string>;
  onSelectNode: (id: string) => void;
  onDeselectNode: () => void;
  burstActive: boolean;
  interactionEnabled: boolean;
}

/* ── Helpers ── */

function quadBezierPoint(
  sx: number, sy: number,
  cx: number, cy: number,
  ex: number, ey: number,
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * sx + 2 * mt * t * cx + t * t * ex,
    y: mt * mt * sy + 2 * mt * t * cy + t * t * ey,
  };
}

/* ── Particle state ── */

interface Particle {
  flowId: string;
  t: number;
  speed: number;
  isIncome: boolean; // green if true, red if false
}

/* ── Constants ── */

const NODE_PAD = 48; // spacing between nodes to minimize overlap
const LAYOUT_RADIUS_X = 440; // wider horizontal spread (left–right)
const LAYOUT_RADIUS_Y = 240; // slightly tighter vertically to use horizontal space

/** Deterministic "random" from string seed — same layout every time */
function seededPosition(id: string, index: number): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i) | 0;
  const angle = (Math.abs(h) % 1000) / 1000 * Math.PI * 2 + (index * 0.618);
  const r = 0.3 + (Math.abs((h >> 8) % 1000) / 1000) * 0.7; // 0.3–1.0 of radius
  return {
    x: Math.cos(angle) * LAYOUT_RADIUS_X * r,
    y: Math.sin(angle) * LAYOUT_RADIUS_Y * r,
  };
}

/* ── Component ── */

export function ThreeGraph({
  financialNodes,
  financialFlows,
  nodeMap,
  onSelectNode,
  onDeselectNode,
}: ThreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation<SimNode, SimulationLinkDatum<SimNode>> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);

  const [nodes, setNodes] = useState<NodeView[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flowView, setFlowView] = useState(false);
  const [size, setSize] = useState({ w: 1000, h: 700 });
  const [isDragging, setIsDragging] = useState(false);

  // Drag state refs (not React state to avoid re-renders per frame)
  const draggingRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const zoomParamsRef = useRef<{ tx: number; ty: number; scale: number } | null>(null);

  // Particles ref (managed imperatively for performance)
  const particlesRef = useRef<Particle[]>([]);

  // Connected node set for hover/selection highlighting
  const connectedSet = useMemo(() => {
    const activeId = selectedId ?? hoveredId;
    if (!activeId) return new Set<string>();
    const s = new Set<string>();
    s.add(activeId);
    for (const f of financialFlows) {
      if (f.source === activeId) s.add(f.target);
      if (f.target === activeId) s.add(f.source);
    }
    return s;
  }, [hoveredId, selectedId, financialFlows]);

  // Flows connected to selected/hovered node
  const connectedFlows = useMemo(() => {
    if (!selectedId) return [];
    return financialFlows.filter(
      (f) => f.source === selectedId || f.target === selectedId
    ) as FinancialFlowData[];
  }, [selectedId, financialFlows]);

  // Zoom state for click-to-zoom
  const [zoomTarget, setZoomTarget] = useState<{ x: number; y: number } | null>(null);

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute radii
  const radiiMap = useMemo(() => {
    const weights = financialNodes.map(
      (n) => Math.max(n.currentValue, n.monthlyFlow) || 1
    );
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const sqMin = Math.sqrt(minW);
    const sqMax = Math.sqrt(maxW);
    const range = sqMax - sqMin;

    const m = new Map<string, number>();
    financialNodes.forEach((n, i) => {
      const sqA = Math.sqrt(weights[i]);
      const t = range <= 0 ? 0.5 : (sqA - sqMin) / range;
      m.set(n.id, 20 + t * 28);
    });
    return m;
  }, [financialNodes]);

  // One-time layout: run force simulation to convergence, then stop (no ongoing animation)
  useEffect(() => {
    if (financialNodes.length === 0) return;

    const pad = NODE_PAD;
    const cx = size.w / 2;
    const cy = size.h / 2;

    const simNodes: SimNode[] = financialNodes.map((n, i) => {
      const radius = radiiMap.get(n.id) ?? 28;
      const pos = seededPosition(n.id, i);
      return {
        id: n.id,
        radius,
        x: cx + pos.x,
        y: cy + pos.y,
      };
    });

    // Build links from financial flows so every edge connects real nodes
    const flowLinks: SimulationLinkDatum<SimNode>[] = financialFlows.map(
      (f) => ({ source: f.source, target: f.target })
    );
    // Ensure all nodes are in the link graph for layout (connect isolated nodes to first node)
    const linkedIds = new Set<string>();
    flowLinks.forEach((l) => {
      const src = typeof l.source === "object" ? (l.source as SimNode).id : String(l.source);
      const tgt = typeof l.target === "object" ? (l.target as SimNode).id : String(l.target);
      linkedIds.add(src);
      linkedIds.add(tgt);
    });
    const allIds = new Set(financialNodes.map((n) => n.id));
    const firstId = financialNodes[0]?.id;
    const simLinks: SimulationLinkDatum<SimNode>[] = [...flowLinks];
    allIds.forEach((id) => {
      if (!linkedIds.has(id) && firstId) {
        simLinks.push({ source: id, target: firstId });
      }
    });

    simRef.current?.stop();
    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance(200)
          .strength(0.14)
      )
      .force("charge", forceManyBody<SimNode>().strength(-580))
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius((d) => d.radius + pad)
          .strength(1)
          .iterations(6)
      )
      .force("center", forceCenter(cx, cy).strength(0.1))
      .force("x", forceX<SimNode>(cx).strength(0.04))
      .force("y", forceY<SimNode>(cy).strength(0.08))
      .velocityDecay(0.4)
      .alphaDecay(0.022)
      .alpha(0.5);

    simRef.current = sim;
    simNodesRef.current = simNodes;

    // Run until stable for consistent, low-overlap layout
    for (let i = 0; i < 550; i++) {
      sim.tick();
      if (sim.alpha() < 0.001) break;
    }
    sim.stop();

    const updated: NodeView[] = financialNodes.map((fn, i) => {
      const sn = simNodes[i];
      return {
        id: fn.id,
        label: fn.label,
        type: fn.type as FinancialNodeType,
        amount: Math.max(fn.currentValue, fn.monthlyFlow) || 1,
        radius: sn.radius,
        color: getNodeColor(fn.type as FinancialNodeType),
        x: sn.x ?? cx,
        y: sn.y ?? cy,
      };
    });
    setNodes(updated);

    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialNodes, financialFlows, radiiMap, size.w, size.h]);

  // Position lookup for edges (same as node positions — nodes move with lines)
  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; radius: number }>();
    for (const n of nodes) m.set(n.id, { x: n.x, y: n.y, radius: n.radius });
    return m;
  }, [nodes]);

  // Convert screen coordinates (relative to container) to simulation coordinates
  const screenToSim = useCallback((screenX: number, screenY: number) => {
    const z = zoomParamsRef.current;
    if (z) return { x: (screenX - z.tx) / z.scale, y: (screenY - z.ty) / z.scale };
    return { x: screenX, y: screenY };
  }, []);

  // ── Drag handlers (no simulation restart — only move the dragged node)
  const handleMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      didDragRef.current = false;
      const sn = simNodesRef.current.find((s) => s.id === nodeId);
      if (!sn) return;
      draggingRef.current = nodeId;
      setIsDragging(true);
      const rect = containerRef.current!.getBoundingClientRect();
      const sim = screenToSim(e.clientX - rect.left, e.clientY - rect.top);
      dragOffsetRef.current = {
        x: (sn.x ?? 0) - sim.x,
        y: (sn.y ?? 0) - sim.y,
      };
      sn.fx = sn.x;
      sn.fy = sn.y;
    },
    [screenToSim]
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      didDragRef.current = true;
      const sn = simNodesRef.current.find((s) => s.id === draggingRef.current);
      if (!sn) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const sim = screenToSim(e.clientX - rect.left, e.clientY - rect.top);
      const x = sim.x + dragOffsetRef.current.x;
      const y = sim.y + dragOffsetRef.current.y;
      sn.fx = x;
      sn.fy = y;
      sn.x = x;
      sn.y = y;
      // Sync positions to state so the node and its edges move (no simulation tick)
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== sn.id) return node;
          return { ...node, x, y };
        })
      );
    };

    const handleUp = () => {
      if (!draggingRef.current) return;
      const sn = simNodesRef.current.find((s) => s.id === draggingRef.current);
      if (sn) {
        sn.fx = undefined;
        sn.fy = undefined;
      }
      draggingRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [screenToSim]);

  // ── Click to zoom ──
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (didDragRef.current) return; // was a drag, not a click
      if (selectedId === nodeId) {
        setSelectedId(null);
        setZoomTarget(null);
        onDeselectNode();
        return;
      }
      const pos = posMap.get(nodeId);
      if (pos) {
        setSelectedId(nodeId);
        setZoomTarget({ x: pos.x, y: pos.y });
        onSelectNode(nodeId);
      }
    },
    [selectedId, posMap, onSelectNode, onDeselectNode]
  );

  const handleCanvasClick = useCallback(() => {
    if (selectedId) {
      setSelectedId(null);
      setZoomTarget(null);
      onDeselectNode();
    }
  }, [selectedId, onDeselectNode]);

  // ── Flow view particles (along the connecting lines) ──
  useEffect(() => {
    if (!flowView) {
      particlesRef.current = [];
      return;
    }
    const amounts = financialFlows.map((f) => Math.max(0, f.amount));
    const maxAmount = Math.max(...amounts, 1);
    const minSpeed = 0.0008;
    const maxSpeed = 0.005;

    const particles: Particle[] = [];
    for (const flow of financialFlows) {
      const srcNode = financialNodes.find((n) => n.id === flow.source);
      const isIncome = srcNode?.type === "income";
      const amount = Math.max(0, flow.amount);
      const t = amount <= 0 ? 0.5 : Math.min(1, amount / maxAmount);
      const speed = minSpeed + t * (maxSpeed - minSpeed);
      for (let i = 0; i < 3; i++) {
        particles.push({
          flowId: flow.id,
          t: i / 3,
          speed: speed * (0.95 + Math.random() * 0.1),
          isIncome,
        });
      }
    }
    particlesRef.current = particles;
  }, [flowView, financialFlows, financialNodes]);

  // Canvas particle rendering: only on focused node's links when Flow is on
  useEffect(() => {
    if (!flowView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const activeId = selectedId ?? hoveredId;

    let particleRaf: number;
    const drawParticles = () => {
      canvas.width = size.w;
      canvas.height = size.h;
      ctx.clearRect(0, 0, size.w, size.h);

      for (const p of particlesRef.current) {
        const flow = financialFlows.find((f) => f.id === p.flowId);
        if (!flow) continue;
        // When a node is focused, only show particles on its connected links; otherwise show all
        if (activeId && flow.source !== activeId && flow.target !== activeId) continue;

        const src = posMap.get(flow.source);
        const tgt = posMap.get(flow.target);
        if (!src || !tgt) continue;

        // Advance particle
        p.t += p.speed;
        if (p.t >= 1) p.t = 0;

        // Calculate control point for quadratic bezier (matching edge rendering)
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const curveOffset = Math.min(len * 0.08, 20);
        const nx = (-dy / len) * curveOffset;
        const ny = (dx / len) * curveOffset;
        const mx = (src.x + tgt.x) / 2 + nx;
        const my = (src.y + tgt.y) / 2 + ny;

        const pt = quadBezierPoint(src.x, src.y, mx, my, tgt.x, tgt.y, p.t);

        // Check distance to target node - fade as particle approaches
        const distToTarget = Math.sqrt(
          (pt.x - tgt.x) ** 2 + (pt.y - tgt.y) ** 2
        );
        const targetRadius = tgt.radius ?? 28;
        if (distToTarget < targetRadius) continue; // absorbed by node

        // Also skip if too close to source
        const distToSource = Math.sqrt(
          (pt.x - src.x) ** 2 + (pt.y - src.y) ** 2
        );
        const sourceRadius = src.radius ?? 28;
        if (distToSource < sourceRadius) continue;

        // Fade as approaching target node
        const fadeZone = 30;
        let alpha = 0.7;
        if (distToTarget < targetRadius + fadeZone) {
          alpha *= (distToTarget - targetRadius) / fadeZone;
        }

        const color = p.isIncome ? HEALTH_POS : HEALTH_NEG;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      particleRaf = requestAnimationFrame(drawParticles);
    };

    particleRaf = requestAnimationFrame(drawParticles);
    return () => cancelAnimationFrame(particleRaf);
  }, [flowView, financialFlows, posMap, size.w, size.h, selectedId, hoveredId]);

  // Compute zoom transform
  const zoomTransform = useMemo(() => {
    if (!zoomTarget || !selectedId) return undefined;
    const scale = 1.5;
    const tx = size.w / 2 - zoomTarget.x * scale;
    const ty = size.h / 2 - zoomTarget.y * scale;
    return `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, [zoomTarget, selectedId, size.w, size.h]);

  // Keep zoom params ref in sync for drag coordinate conversion
  useEffect(() => {
    if (zoomTarget && selectedId) {
      const scale = 1.5;
      zoomParamsRef.current = {
        tx: size.w / 2 - zoomTarget.x * scale,
        ty: size.h / 2 - zoomTarget.y * scale,
        scale,
      };
    } else {
      zoomParamsRef.current = null;
    }
  }, [zoomTarget, selectedId, size.w, size.h]);

  // Selected node data for popup
  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return nodeMap.get(selectedId) ?? null;
  }, [selectedId, nodeMap]);

  // Popup anchor position (in container coordinates, accounting for zoom)
  const popupAnchor = useMemo(() => {
    if (!selectedId || !zoomTarget) return null;
    const nodePos = posMap.get(selectedId);
    if (!nodePos) return null;
    const scale = 1.5;
    const tx = size.w / 2 - zoomTarget.x * scale;
    const ty = size.h / 2 - zoomTarget.y * scale;
    return {
      x: nodePos.x * scale + tx + (nodePos.radius ?? 28) * scale,
      y: nodePos.y * scale + ty,
    };
  }, [selectedId, zoomTarget, posMap, size.w, size.h]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onClick={handleCanvasClick}
      style={{ cursor: draggingRef.current ? "grabbing" : "default" }}
    >
      {/* Zoom wrapper */}
      <div
        className="relative"
        style={{
          width: "100%",
          height: "100%",
          transform: zoomTransform ?? "none",
          transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: "0 0",
        }}
      >
        {/* Glow behind nodes: Vector texture + radial gradient (Figma-style) */}
        <Image
          src="/images/Vector.png"
          alt=""
          fill
          className="object-cover pointer-events-none select-none"
          style={{ opacity: 0.22, zIndex: 0 }}
          priority
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(127, 127, 250, 0.14) 0%, rgba(127, 127, 250, 0.04) 50%, transparent 75%)",
          }}
        />
        {/* SVG edges — same coordinate space as nodes so lines move with nodes */}
        <svg
          className="absolute inset-0 w-full h-full"
          width={size.w}
          height={size.h}
          style={{ zIndex: 1, pointerEvents: "none" }}
        >
          {financialFlows.map((flow) => {
            const src = posMap.get(flow.source);
            const tgt = posMap.get(flow.target);
            if (!src || !tgt) return null;

            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const curveOffset = Math.min(len * 0.08, 20);
            const nx = (-dy / len) * curveOffset;
            const ny = (dx / len) * curveOffset;
            const mx = (src.x + tgt.x) / 2 + nx;
            const my = (src.y + tgt.y) / 2 + ny;

            const isConnectedToSelected = selectedId && (flow.source === selectedId || flow.target === selectedId);
            const isConnectedToHovered = !selectedId && hoveredId && (flow.source === hoveredId || flow.target === hoveredId);
            const isActive = isConnectedToSelected || isConnectedToHovered;
            const dimmed = (selectedId ?? hoveredId) && !isActive;

            return (
              <path
                key={flow.id}
                d={`M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`}
                fill="none"
                stroke={
                  isConnectedToSelected
                    ? "rgba(127,127,250,0.95)"
                    : isActive
                      ? "rgba(127,127,250,0.6)"
                      : "rgba(127,127,250,0.35)"
                }
                strokeWidth={isConnectedToSelected ? 2.8 : isActive ? 2.2 : 1.4}
                style={{
                  transition: isDragging ? "none" : "all 200ms ease",
                  opacity: dimmed ? 0.12 : 1,
                }}
              />
            );
          })}
        </svg>

        {/* Canvas for flow particles */}
        {flowView && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ zIndex: 2, pointerEvents: "none" }}
            width={size.w}
            height={size.h}
          />
        )}

        {/* HTML nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredId === node.id;
          const isSelected = selectedId === node.id;
          const activeId = selectedId ?? hoveredId;
          const isConnected = connectedSet.has(node.id);
          const dimmed = activeId !== null && !isHovered && !isSelected && !isConnected;

          return (
            <div
              key={node.id}
              data-node-id={node.id}
              className="absolute select-none"
              style={{
                left: node.x,
                top: node.y,
                transform: `translate(-50%, -50%) scale(${isHovered || isSelected ? 1.12 : 1})`,
                transition: draggingRef.current === node.id ? "none" : "transform 200ms ease, opacity 200ms ease",
                opacity: dimmed ? 0.3 : 1,
                zIndex: isHovered || isSelected ? 10 : 2,
                cursor: draggingRef.current === node.id ? "grabbing" : "grab",
              }}
              onMouseEnter={() => { if (!draggingRef.current) setHoveredId(node.id); }}
              onMouseLeave={() => { if (!draggingRef.current) setHoveredId(null); }}
              onMouseDown={(e) => handleMouseDown(node.id, e)}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node.id);
              }}
            >
              {/* Circle — flat matte, fully opaque */}
              <div
                style={{
                  width: node.radius * 2,
                  height: node.radius * 2,
                  borderRadius: "50%",
                  background: darken(node.color, 0.15),
                  boxShadow: isHovered || isSelected
                    ? `0 0 20px ${node.color}40`
                    : "none",
                  transition: "box-shadow 200ms ease",
                  border: `1.5px solid ${node.color}30`,
                  position: "relative",
                  zIndex: 2,
                }}
              />
              {/* Label */}
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: 5,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontWeight: 600,
                    fontSize: 10,
                    color: "#e8e8ff",
                    lineHeight: 1.25,
                  }}
                >
                  {node.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: 9,
                    color: node.color,
                    lineHeight: 1.25,
                    fontWeight: 500,
                  }}
                >
                  {formatCurrency(node.amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle buttons — top right, outside zoom wrapper */}
      <div
        className="absolute top-4 right-4 flex flex-col gap-2"
        style={{ zIndex: 20 }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFlowView((v) => !v);
          }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
          style={{
            fontFamily: "'Manrope', sans-serif",
            background: flowView ? "rgba(127,127,250,0.2)" : "rgba(10,10,20,0.7)",
            border: flowView
              ? "1px solid rgba(127,127,250,0.5)"
              : "1px solid rgba(127,127,250,0.15)",
            color: flowView ? "#c8c8ff" : "#6b6b9a",
            backdropFilter: "blur(8px)",
          }}
        >
          <Workflow className="w-3 h-3" />
          Flow
        </button>
      </div>

      {/* Node popup — rendered outside the zoom wrapper so it doesn't scale */}
      {selectedNode && popupAnchor && (
        <NodePopup
          node={selectedNode}
          connectedFlows={connectedFlows}
          nodeMap={nodeMap}
          onClose={() => {
            setSelectedId(null);
            setZoomTarget(null);
            onDeselectNode();
          }}
          anchorX={popupAnchor.x}
          anchorY={popupAnchor.y}
          containerWidth={size.w}
          containerHeight={size.h}
        />
      )}
    </div>
  );
}

/* Darken a hex color by a fraction (0-1) */
function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.round(parseInt(h.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(h.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(h.substring(4, 6), 16) * (1 - amount)));
  return `rgb(${r},${g},${b})`;
}
