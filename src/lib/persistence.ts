import { supabase } from "@/lib/supabase";
import type { FinancialNodeData, FinancialFlowData, FinancialNodeType } from "@/types/graph";

// ---------------------------------------------------------------------------
// Supabase <-> Domain mapping
//
// DB schema (financial_nodes):
//   id, user_id, label, type, current_value, monthly_weight, metadata_json
//
// DB schema (financial_edges):
//   id, user_id, source_node_id, target_node_id, amount, frequency, annual_total
//
// Domain (FinancialNodeData):
//   id, label, type, currentValue, monthlyFlow, metadata
//
// Domain (FinancialFlowData):
//   id, source, target, amount, frequency
// ---------------------------------------------------------------------------

interface DbNode {
  id: string;
  user_id: string;
  label: string;
  type: string;
  current_value: number;
  monthly_weight: number;
  metadata_json: Record<string, unknown>;
}

interface DbEdge {
  id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  amount: number;
  frequency: string;
  annual_total: number;
}

function dbNodeToDomain(row: DbNode): FinancialNodeData {
  return {
    id: row.id,
    label: row.label,
    type: row.type as FinancialNodeType,
    currentValue: Number(row.current_value),
    monthlyFlow: Number(row.monthly_weight),
    metadata: row.metadata_json ?? {},
  };
}

function domainNodeToDb(userId: string, node: FinancialNodeData): Omit<DbNode, "id"> & { id?: string } {
  return {
    id: node.id.startsWith("node-") ? undefined : node.id,
    user_id: userId,
    label: node.label,
    type: node.type,
    current_value: node.currentValue,
    monthly_weight: node.monthlyFlow,
    metadata_json: node.metadata,
  };
}

function annualTotal(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly": return amount * 52;
    case "biweekly": return amount * 26;
    case "monthly": return amount * 12;
    case "annual": return amount;
    case "one-time": return amount;
    default: return amount * 12;
  }
}

function dbEdgeToDomain(row: DbEdge): FinancialFlowData {
  return {
    id: row.id,
    source: row.source_node_id,
    target: row.target_node_id,
    amount: Number(row.amount),
    frequency: row.frequency as FinancialFlowData["frequency"],
  };
}

function domainEdgeToDb(userId: string, flow: FinancialFlowData): Omit<DbEdge, "id"> & { id?: string } {
  return {
    id: flow.id.startsWith("flow-") ? undefined : flow.id,
    user_id: userId,
    source_node_id: flow.source,
    target_node_id: flow.target,
    amount: flow.amount,
    frequency: flow.frequency,
    annual_total: annualTotal(flow.amount, flow.frequency),
  };
}

// ---------------------------------------------------------------------------
// Public API — gracefully returns null when Supabase isn't configured
// ---------------------------------------------------------------------------

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function loadGraph(
  userId: string
): Promise<{ nodes: FinancialNodeData[]; flows: FinancialFlowData[] } | null> {
  if (!isConfigured()) return null;

  const [nodesRes, edgesRes] = await Promise.all([
    supabase
      .from("financial_nodes")
      .select("*")
      .eq("user_id", userId)
      .order("label"),
    supabase
      .from("financial_edges")
      .select("*")
      .eq("user_id", userId),
  ]);

  if (nodesRes.error || edgesRes.error) {
    console.error("Failed to load graph:", nodesRes.error, edgesRes.error);
    return null;
  }

  return {
    nodes: (nodesRes.data as DbNode[]).map(dbNodeToDomain),
    flows: (edgesRes.data as DbEdge[]).map(dbEdgeToDomain),
  };
}

export async function saveNode(
  userId: string,
  node: FinancialNodeData
): Promise<string | null> {
  if (!isConfigured()) return node.id;

  const row = domainNodeToDb(userId, node);
  const { data, error } = await supabase
    .from("financial_nodes")
    .upsert({ ...row, id: node.id }, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save node:", error);
    return null;
  }
  return data.id;
}

export async function deleteNodePersisted(
  userId: string,
  nodeId: string
): Promise<boolean> {
  if (!isConfigured()) return true;

  const { error } = await supabase
    .from("financial_nodes")
    .delete()
    .eq("id", nodeId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete node:", error);
    return false;
  }
  return true;
}

export async function saveFlow(
  userId: string,
  flow: FinancialFlowData
): Promise<string | null> {
  if (!isConfigured()) return flow.id;

  const row = domainEdgeToDb(userId, flow);
  const { data, error } = await supabase
    .from("financial_edges")
    .upsert({ ...row, id: flow.id }, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save flow:", error);
    return null;
  }
  return data.id;
}

export async function deleteFlowPersisted(
  userId: string,
  flowId: string
): Promise<boolean> {
  if (!isConfigured()) return true;

  const { error } = await supabase
    .from("financial_edges")
    .delete()
    .eq("id", flowId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete flow:", error);
    return false;
  }
  return true;
}

export async function saveFullGraph(
  userId: string,
  nodes: FinancialNodeData[],
  flows: FinancialFlowData[]
): Promise<boolean> {
  if (!isConfigured()) return true;

  const nodeRows = nodes.map((n) => ({ ...domainNodeToDb(userId, n), id: n.id }));
  const edgeRows = flows.map((f) => ({ ...domainEdgeToDb(userId, f), id: f.id }));

  const [nRes, eRes] = await Promise.all([
    supabase.from("financial_nodes").upsert(nodeRows, { onConflict: "id" }),
    supabase.from("financial_edges").upsert(edgeRows, { onConflict: "id" }),
  ]);

  if (nRes.error || eRes.error) {
    console.error("Failed to save full graph:", nRes.error, eRes.error);
    return false;
  }
  return true;
}
