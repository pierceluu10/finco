"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import * as THREE from "three";
import type {
  FinancialNodeData,
  FinancialFlowData,
  FinancialNodeType,
} from "@/types/graph";
import { getNodeColor, NODE_COLORS } from "@/lib/graph-theme";
import { formatCurrency } from "@/lib/utils";

// ── Constants ──

const POS_SCALE = 100;
const RAD_MULT = 1.4;
const CANVAS_W = 1800;
const CANVAS_H = 1200;
const AUTO_ROTATE_SPEED = 0.0008;
const BURST_EASE = 0.06;

const HEALTH_POS: Record<string, string> = {
  income: "#00ff88",
  savings: "#00ff88",
  investment: "#00ff88",
};
const HEALTH_NEG: Record<string, string> = {
  expense: "#ff4d6d",
  debt: "#ff4d6d",
};

type LabelMode = "none" | "important" | "all";

// ── Types ──

interface NodeMesh {
  id: string;
  type: FinancialNodeType;
  label: string;
  amount: number;
  radius3d: number;
  target: THREE.Vector3;
  current: THREE.Vector3;
  sphere: THREE.Mesh;
  glow: THREE.Sprite;
  ring: THREE.Mesh;
  origColor: THREE.Color;
  healthColor: THREE.Color;
  burstDelay: number;
  burstStarted: boolean;
}

interface EdgeMesh {
  id: string;
  sourceId: string;
  targetId: string;
  amount: number;
  outerTube: THREE.Mesh;
  innerTube: THREE.Mesh;
}

interface Particle {
  mesh: THREE.Mesh;
  t: number;
  speed: number;
  edgeIdx: number;
}

// ── Props ──

export interface ThreeGraphProps {
  rfNodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: {
      radius: number;
      color: string;
      label: string;
      type: FinancialNodeType;
      currentValue: number;
      monthlyFlow: number;
    };
  }>;
  financialNodes: FinancialNodeData[];
  financialFlows: FinancialFlowData[];
  nodeMap: Map<string, FinancialNodeData>;
  selectedNodeId: string | null;
  connectedNodeIds: Set<string>;
  onSelectNode: (id: string) => void;
  onDeselectNode: () => void;
  burstActive: boolean;
  interactionEnabled: boolean;
}

// ── Helpers ──

function to3D(
  px: number,
  py: number,
  seedZ: number
): THREE.Vector3 {
  return new THREE.Vector3(
    (px - CANVAS_W / 2) / POS_SCALE,
    -(py - CANVAS_H / 2) / POS_SCALE,
    seedZ
  );
}

function getHealthColor(type: FinancialNodeType, hasOutbound: boolean): string {
  if (HEALTH_POS[type]) return HEALTH_POS[type];
  if (HEALTH_NEG[type]) return HEALTH_NEG[type];
  // account (buffer)
  return hasOutbound ? "#00ff88" : "#ffe040";
}

function makeGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.5)");
  g.addColorStop(0.3, "rgba(255,255,255,0.15)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function curveBetween(
  a: THREE.Vector3,
  b: THREE.Vector3
): THREE.QuadraticBezierCurve3 {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  dir.normalize();
  const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
  const ctrl = mid.clone().add(perp.multiplyScalar(len * 0.15)).add(new THREE.Vector3(0, 0, len * 0.08));
  return new THREE.QuadraticBezierCurve3(a.clone(), ctrl, b.clone());
}

function rebuildTube(
  curve: THREE.QuadraticBezierCurve3,
  radius: number,
  segments: number,
  radialSeg: number
): THREE.TubeGeometry {
  return new THREE.TubeGeometry(curve, segments, radius, radialSeg, false);
}

// ── Component ──

export function ThreeGraph({
  rfNodes,
  financialNodes,
  financialFlows,
  nodeMap,
  selectedNodeId,
  connectedNodeIds,
  onSelectNode,
  onDeselectNode,
  burstActive,
  interactionEnabled,
}: ThreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [labelMode, setLabelMode] = useState<LabelMode>("none");
  const [healthView, setHealthView] = useState(false);

  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const nodesRef = useRef<NodeMesh[]>([]);
  const edgesRef = useRef<EdgeMesh[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const clockRef = useRef(new THREE.Clock());
  const glowTexRef = useRef<THREE.Texture | null>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);
  const markersContainerRef = useRef<HTMLDivElement>(null);

  // Burst state
  const burstStartRef = useRef(0);
  const burstDoneRef = useRef(false);
  const burstFrozenRef = useRef(false);

  // Health transition
  const healthTransRef = useRef({
    transitioning: false,
    startTime: 0,
    toHealth: false,
    duration: 400,
  });

  // Camera burst offset
  const camTargetZ = useRef(20);
  const camCurrentZ = useRef(22);

  // Track props with refs for animation loop
  const selectedRef = useRef(selectedNodeId);
  const connectedRef = useRef(connectedNodeIds);
  const healthRef = useRef(healthView);
  const labelModeRef = useRef(labelMode);
  const interactRef = useRef(interactionEnabled);
  selectedRef.current = selectedNodeId;
  connectedRef.current = connectedNodeIds;
  healthRef.current = healthView;
  labelModeRef.current = labelMode;
  interactRef.current = interactionEnabled;

  // Outbound set for health view (account nodes)
  const outboundSet = useMemo(() => {
    const s = new Set<string>();
    for (const f of financialFlows) s.add(f.source);
    return s;
  }, [financialFlows]);

  const maxEdgeAmount = useMemo(
    () => Math.max(1, ...financialFlows.map((f) => f.amount)),
    [financialFlows]
  );

  // ── Init scene ──
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    camera.position.set(0, 0, 22);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    camCurrentZ.current = 22;
    camTargetZ.current = 20;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pLight = new THREE.PointLight(0x7f7ffa, 1.2, 60);
    pLight.position.set(5, 8, 15);
    scene.add(pLight);

    // Group for auto-rotation
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // Glow texture
    glowTexRef.current = makeGlowTexture();

    // Resize handler
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // ── Build nodes and edges when rfNodes change ──
  useEffect(() => {
    const group = groupRef.current;
    const glowTex = glowTexRef.current;
    if (!group || !glowTex) return;

    // Clear previous
    while (group.children.length > 0) group.remove(group.children[0]);
    nodesRef.current = [];
    edgesRef.current = [];
    particlesRef.current = [];
    burstDoneRef.current = false;
    burstFrozenRef.current = false;
    burstStartRef.current = performance.now();

    // Seed z-offsets deterministically
    const seedZ = (id: string) => {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
      return ((h % 200) - 100) / 100; // -1 to 1
    };

    // Create node meshes
    for (let i = 0; i < rfNodes.length; i++) {
      const rn = rfNodes[i];
      const r = rn.data.radius;
      const r3d = (r * RAD_MULT) / POS_SCALE;
      const centerX = rn.position.x + r;
      const centerY = rn.position.y + r;
      const target = to3D(centerX, centerY, seedZ(rn.id));
      const color = new THREE.Color(rn.data.color);
      const hc = getHealthColor(rn.data.type, outboundSet.has(rn.id));
      const healthColor = new THREE.Color(hc);

      // Sphere
      const geo = new THREE.SphereGeometry(r3d, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 1,
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.userData = { nodeId: rn.id };

      // Glow sprite
      const spriteMat = new THREE.SpriteMaterial({
        map: glowTex,
        color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.35,
      });
      const glow = new THREE.Sprite(spriteMat);
      glow.scale.setScalar(r3d * 3.5);

      // Selection ring
      const ringGeo = new THREE.RingGeometry(r3d * 1.15, r3d * 1.25, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.lookAt(0, 0, 1);

      // Position at origin for burst
      const startPos = new THREE.Vector3(0, 0, 0);
      sphere.position.copy(startPos);
      glow.position.copy(startPos);
      ring.position.copy(startPos);

      group.add(sphere);
      group.add(glow);
      group.add(ring);

      nodesRef.current.push({
        id: rn.id,
        type: rn.data.type,
        label: rn.data.label,
        amount:
          rn.data.currentValue > 0
            ? rn.data.currentValue
            : rn.data.monthlyFlow,
        radius3d: r3d,
        target,
        current: startPos.clone(),
        sphere,
        glow,
        ring,
        origColor: color.clone(),
        healthColor,
        burstDelay: i * 40,
        burstStarted: false,
      });
    }

    // Create edge meshes
    const nodeById = new Map<string, NodeMesh>();
    for (const n of nodesRef.current) nodeById.set(n.id, n);

    for (const flow of financialFlows) {
      const src = nodeById.get(flow.source);
      const tgt = nodeById.get(flow.target);
      if (!src || !tgt) continue;

      const curve = curveBetween(src.current, tgt.current);

      // Outer tube
      const outerGeo = rebuildTube(curve, 0.04, 60, 8);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0x7f7ffa,
        transparent: true,
        opacity: 0.55,
      });
      const outerTube = new THREE.Mesh(outerGeo, outerMat);

      // Inner tube
      const innerGeo = rebuildTube(curve, 0.018, 60, 8);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xa78bfa,
        transparent: true,
        opacity: 0.8,
      });
      const innerTube = new THREE.Mesh(innerGeo, innerMat);

      group.add(outerTube);
      group.add(innerTube);

      edgesRef.current.push({
        id: flow.id,
        sourceId: flow.source,
        targetId: flow.target,
        amount: flow.amount,
        outerTube,
        innerTube,
      });

      // Particles
      const norm = flow.amount / maxEdgeAmount;
      const speed = 0.004 + norm * 0.012;
      const count = Math.round(2 + norm * 6);
      for (let p = 0; p < count; p++) {
        const pGeo = new THREE.SphereGeometry(0.09, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0,
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        group.add(pMesh);
        particlesRef.current.push({
          mesh: pMesh,
          t: p / count,
          speed,
          edgeIdx: edgesRef.current.length - 1,
        });
      }
    }

    // Start animation loop
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const gp = groupRef.current;
      if (!renderer || !scene || !camera || !gp) return;

      const now = performance.now();
      const burst = burstStartRef.current;

      // Auto-rotate
      gp.rotation.y += AUTO_ROTATE_SPEED;

      // Camera ease
      camCurrentZ.current += (camTargetZ.current - camCurrentZ.current) * 0.02;
      camera.position.z = camCurrentZ.current;

      // ── Burst animation ──
      if (!burstFrozenRef.current) {
        let allSettled = true;
        for (const n of nodesRef.current) {
          const elapsed = now - burst;
          if (elapsed < n.burstDelay) {
            allSettled = false;
            continue;
          }
          n.burstStarted = true;
          n.current.x += (n.target.x - n.current.x) * BURST_EASE;
          n.current.y += (n.target.y - n.current.y) * BURST_EASE;
          n.current.z += (n.target.z - n.current.z) * BURST_EASE;

          n.sphere.position.copy(n.current);
          n.glow.position.copy(n.current);
          n.ring.position.copy(n.current);

          const dist = n.current.distanceTo(n.target);
          if (dist > 0.01) allSettled = false;
        }

        // Rebuild edge geometry during burst
        const nodeById2 = new Map<string, NodeMesh>();
        for (const n of nodesRef.current) nodeById2.set(n.id, n);

        for (const e of edgesRef.current) {
          const src = nodeById2.get(e.sourceId);
          const tgt = nodeById2.get(e.targetId);
          if (!src || !tgt) continue;
          const curve = curveBetween(src.current, tgt.current);
          e.outerTube.geometry.dispose();
          e.outerTube.geometry = rebuildTube(curve, 0.04, 60, 8);
          e.innerTube.geometry.dispose();
          e.innerTube.geometry = rebuildTube(curve, 0.018, 60, 8);
        }

        if (allSettled && !burstDoneRef.current) {
          burstDoneRef.current = true;
          // Freeze geometry after a few more frames
          setTimeout(() => {
            burstFrozenRef.current = true;
          }, 500);
        }
      }

      // ── Selection dimming ──
      const sel = selectedRef.current;
      const conn = connectedRef.current;
      for (const n of nodesRef.current) {
        const mat = n.sphere.material as THREE.MeshStandardMaterial;
        const glowMat = n.glow.material as THREE.SpriteMaterial;
        const ringMat = n.ring.material as THREE.MeshBasicMaterial;

        let targetOpacity = 1;
        let ringOpacity = 0;
        if (sel) {
          if (n.id === sel) {
            ringOpacity = 0.8;
          } else if (conn.has(n.id)) {
            targetOpacity = 0.85;
          } else {
            targetOpacity = 0.25;
          }
        }

        mat.opacity += (targetOpacity - mat.opacity) * 0.1;
        glowMat.opacity += ((targetOpacity * 0.35) - glowMat.opacity) * 0.1;
        ringMat.opacity += (ringOpacity - ringMat.opacity) * 0.1;
      }

      // ── Edge dimming ──
      for (const e of edgesRef.current) {
        const outerMat = e.outerTube.material as THREE.MeshBasicMaterial;
        const innerMat = e.innerTube.material as THREE.MeshBasicMaterial;
        let tgtOpacity = 0.55;
        let tgtInner = 0.8;
        if (sel) {
          if (e.sourceId === sel || e.targetId === sel) {
            tgtOpacity = 0.7;
            tgtInner = 0.9;
          } else {
            tgtOpacity = 0.1;
            tgtInner = 0.15;
          }
        }
        outerMat.opacity += (tgtOpacity - outerMat.opacity) * 0.1;
        innerMat.opacity += (tgtInner - innerMat.opacity) * 0.1;
      }

      // ── Health view color transition ──
      const ht = healthTransRef.current;
      if (ht.transitioning) {
        const elapsed = now - ht.startTime;
        const tFrac = Math.min(1, elapsed / ht.duration);
        for (const n of nodesRef.current) {
          const from = ht.toHealth ? n.origColor : n.healthColor;
          const to = ht.toHealth ? n.healthColor : n.origColor;
          const c = new THREE.Color().lerpColors(from, to, tFrac);
          (n.sphere.material as THREE.MeshStandardMaterial).color.copy(c);
          (n.sphere.material as THREE.MeshStandardMaterial).emissive.copy(c);
          (n.glow.material as THREE.SpriteMaterial).color.copy(c);
          (n.ring.material as THREE.MeshBasicMaterial).color.copy(c);
        }
        if (tFrac >= 1) ht.transitioning = false;
      }

      // ── Particles ──
      const nodeById3 = new Map<string, NodeMesh>();
      for (const nm of nodesRef.current) nodeById3.set(nm.id, nm);

      for (const p of particlesRef.current) {
        const edge = edgesRef.current[p.edgeIdx];
        if (!edge) continue;
        const src = nodeById3.get(edge.sourceId);
        const tgt = nodeById3.get(edge.targetId);
        if (!src || !tgt) continue;

        p.t += p.speed;
        if (p.t > 1) p.t -= 1;

        const curve = curveBetween(src.current, tgt.current);
        const pt = curve.getPoint(p.t);
        p.mesh.position.copy(pt);

        // Opacity ramp
        let op = 0.85;
        if (p.t < 0.15) op = (p.t / 0.15) * 0.85;
        else if (p.t > 0.85) op = ((1 - p.t) / 0.15) * 0.85;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = op;

        // Health view particle color
        if (healthRef.current) {
          const isNeg = tgt.type === "expense" || tgt.type === "debt";
          (p.mesh.material as THREE.MeshBasicMaterial).color.set(
            isNeg ? "#ff4d6d" : "#00d4ff"
          );
        } else {
          (p.mesh.material as THREE.MeshBasicMaterial).color.set("#00d4ff");
        }
      }

      // ── Update label + marker positions ──
      updateLabels(camera, gp, renderer.domElement);

      renderer.render(scene, camera);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfNodes, financialFlows, maxEdgeAmount, outboundSet]);

  // ── Update labels (called from animation loop) ──
  const updateLabels = useCallback(
    (
      camera: THREE.PerspectiveCamera,
      group: THREE.Group,
      domCanvas: HTMLCanvasElement
    ) => {
      const lc = labelsContainerRef.current;
      const mc = markersContainerRef.current;
      if (!lc || !mc) return;

      const w = domCanvas.clientWidth;
      const h = domCanvas.clientHeight;
      const mode = labelModeRef.current;
      const sel = selectedRef.current;
      const conn = connectedRef.current;

      for (const n of nodesRef.current) {
        // Project to screen
        const worldPos = n.current.clone();
        group.localToWorld(worldPos);
        const projected = worldPos.project(camera);
        const sx = ((projected.x + 1) / 2) * w;
        const sy = ((-projected.y + 1) / 2) * h;

        // Update marker div
        let marker = mc.querySelector<HTMLElement>(`[data-id="${n.id}"]`);
        if (!marker) {
          marker = document.createElement("div");
          marker.setAttribute("data-id", n.id);
          marker.style.position = "absolute";
          marker.style.width = "10px";
          marker.style.height = "10px";
          marker.style.pointerEvents = "none";
          mc.appendChild(marker);
        }
        marker.style.left = `${sx - 5}px`;
        marker.style.top = `${sy - 5}px`;

        // Update label div
        const shouldShow =
          mode === "all" ||
          (mode === "important" && (n.type === "income" || n.type === "debt"));

        let label = lc.querySelector<HTMLElement>(`[data-label-id="${n.id}"]`);
        if (!label) {
          label = document.createElement("div");
          label.setAttribute("data-label-id", n.id);
          label.style.position = "absolute";
          label.style.transform = "translate(-50%, calc(-100% - 14px))";
          label.style.background = "rgba(8, 8, 15, 0.88)";
          label.style.border = "1px solid rgba(127,127,250,0.2)";
          label.style.borderRadius = "9px";
          label.style.padding = "8px 14px";
          label.style.pointerEvents = "none";
          label.style.zIndex = "8";
          label.style.backdropFilter = "blur(4px)";
          label.style.transition = "opacity 0.2s ease";
          label.style.textAlign = "center";
          label.style.whiteSpace = "nowrap";

          const nameEl = document.createElement("div");
          nameEl.className = "font-sans";
          nameEl.style.fontWeight = "700";
          nameEl.style.fontSize = "14px";
          nameEl.style.color = "#e8e8ff";
          nameEl.style.lineHeight = "1.2";
          nameEl.setAttribute("data-name", "true");
          label.appendChild(nameEl);

          const amtEl = document.createElement("div");
          amtEl.className = "font-mono";
          amtEl.style.fontSize = "13px";
          amtEl.style.lineHeight = "1.2";
          amtEl.style.marginTop = "2px";
          amtEl.setAttribute("data-amt", "true");
          label.appendChild(amtEl);

          lc.appendChild(label);
        }

        // Update text content
        const nameEl = label.querySelector<HTMLElement>("[data-name]");
        const amtEl = label.querySelector<HTMLElement>("[data-amt]");
        if (nameEl) nameEl.textContent = n.label;
        if (amtEl) {
          amtEl.textContent = formatCurrency(n.amount);
          const currentColor = healthRef.current
            ? n.healthColor.getStyle()
            : n.origColor.getStyle();
          amtEl.style.color = currentColor;
        }

        label.style.left = `${sx}px`;
        label.style.top = `${sy}px`;

        if (!shouldShow) {
          label.style.display = "none";
        } else {
          label.style.display = "block";
          let opacity = 1;
          if (sel) {
            if (n.id === sel) opacity = 1;
            else if (conn.has(n.id)) opacity = 0.7;
            else opacity = 0.2;
          }
          label.style.opacity = String(opacity);
        }
      }
    },
    []
  );

  // ── Health view toggle handler ──
  const toggleHealth = useCallback(() => {
    setHealthView((prev) => {
      const next = !prev;
      healthTransRef.current = {
        transitioning: true,
        startTime: performance.now(),
        toHealth: next,
        duration: 400,
      };
      return next;
    });
  }, []);

  // ── Label mode cycle ──
  const cycleLabelMode = useCallback(() => {
    setLabelMode((prev) => {
      if (prev === "none") return "important";
      if (prev === "important") return "all";
      return "none";
    });
  }, []);

  const labelButtonText = labelMode === "none" ? "Show Labels" : labelMode === "important" ? "All Labels" : "Hide Labels";
  const healthButtonText = healthView ? "Disable Health View" : "Enable Health View";

  // ── Click handler ──
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactRef.current) return;
      const canvas = canvasRef.current;
      const camera = cameraRef.current;
      const group = groupRef.current;
      if (!canvas || !camera || !group) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const spheres = nodesRef.current.map((n) => n.sphere);
      const intersects = raycaster.intersectObjects(spheres, false);

      if (intersects.length > 0) {
        const nodeId = intersects[0].object.userData.nodeId;
        if (nodeId) {
          if (selectedRef.current === nodeId) {
            onDeselectNode();
          } else {
            onSelectNode(nodeId);
          }
        }
      } else {
        onDeselectNode();
      }
    },
    [onSelectNode, onDeselectNode]
  );

  // Toggle button style
  const btnStyle: React.CSSProperties = {
    background: "rgba(10, 10, 20, 0.85)",
    border: "1px solid #1a1a2e",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: 13,
    color: "#e8e8ff",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease",
    cursor: "pointer",
    zIndex: 20,
    fontFamily: "var(--font-manrope), sans-serif",
  };

  return (
    <div ref={containerRef} className="react-flow relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onClick={handleCanvasClick}
        style={{ cursor: interactionEnabled ? "pointer" : "default" }}
      />

      {/* Labels overlay */}
      <div
        ref={labelsContainerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 8 }}
      />

      {/* Invisible markers for popup positioning */}
      <div
        ref={markersContainerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ opacity: 0 }}
      />

      {/* Toggle buttons */}
      <div className="absolute flex flex-col gap-2.5" style={{ top: 20, right: 20, zIndex: 20 }}>
        <button
          onClick={cycleLabelMode}
          className="font-sans"
          style={btnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(127,127,250,0.4)";
            e.currentTarget.style.background = "rgba(127,127,250,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#1a1a2e";
            e.currentTarget.style.background = "rgba(10, 10, 20, 0.85)";
          }}
        >
          {labelButtonText}
        </button>
        <button
          onClick={toggleHealth}
          className="font-sans"
          style={btnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(127,127,250,0.4)";
            e.currentTarget.style.background = "rgba(127,127,250,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#1a1a2e";
            e.currentTarget.style.background = "rgba(10, 10, 20, 0.85)";
          }}
        >
          {healthButtonText}
        </button>
      </div>
    </div>
  );
}
