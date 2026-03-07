import type { FinancialNodeData, FinancialFlowData, FinancialNodeType } from "@/types/graph";

// ---------------------------------------------------------------------------
// CSV parsing and automatic node/edge generation
//
// Expected CSV formats (flexible):
//   1. Bank transaction export: Date, Description, Amount, Category?
//   2. Custom: any CSV with at least Description and Amount columns
//
// The parser auto-detects columns by header name matching.
// ---------------------------------------------------------------------------

export interface CsvRow {
  date?: string;
  description: string;
  amount: number;
  category?: string;
}

export interface CsvImportResult {
  rows: CsvRow[];
  generatedNodes: FinancialNodeData[];
  generatedFlows: FinancialFlowData[];
  warnings: string[];
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "transaction date", "trans date", "posted date", "posting date"],
  description: ["description", "desc", "name", "merchant", "payee", "memo", "details", "transaction"],
  amount: ["amount", "amt", "value", "debit", "credit", "total"],
  category: ["category", "cat", "type", "group", "classification"],
};

function normalizeHeader(raw: string): string {
  const lower = raw.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(lower)) return canonical;
  }
  return lower;
}

export function parseCsv(text: string): { rows: CsvRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    warnings.push("CSV must have a header row and at least one data row.");
    return { rows: [], warnings };
  }

  const rawHeaders = lines[0].split(",").map((h) => h.trim());
  const headers = rawHeaders.map(normalizeHeader);

  const descIdx = headers.indexOf("description");
  const amtIdx = headers.indexOf("amount");
  const dateIdx = headers.indexOf("date");
  const catIdx = headers.indexOf("category");

  if (descIdx === -1 || amtIdx === -1) {
    warnings.push(
      `Could not find required columns. Found headers: [${rawHeaders.join(", ")}]. ` +
      `Need at least "Description" and "Amount".`
    );
    return { rows: [], warnings };
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length <= Math.max(descIdx, amtIdx)) {
      warnings.push(`Skipped row ${i + 1}: not enough columns.`);
      continue;
    }

    const amount = parseFloat(cols[amtIdx].replace(/[$,]/g, ""));
    if (isNaN(amount)) {
      warnings.push(`Skipped row ${i + 1}: invalid amount "${cols[amtIdx]}".`);
      continue;
    }

    rows.push({
      date: dateIdx >= 0 ? cols[dateIdx]?.trim() : undefined,
      description: cols[descIdx].trim(),
      amount,
      category: catIdx >= 0 ? cols[catIdx]?.trim() : undefined,
    });
  }

  return { rows, warnings };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// Automatic node + edge generation from parsed rows
// ---------------------------------------------------------------------------

const CATEGORY_TYPE_MAP: Record<string, FinancialNodeType> = {
  income: "income",
  salary: "income",
  paycheck: "income",
  deposit: "income",
  refund: "income",
  groceries: "expense",
  food: "expense",
  dining: "expense",
  restaurant: "expense",
  transport: "expense",
  transportation: "expense",
  gas: "expense",
  fuel: "expense",
  utilities: "expense",
  rent: "expense",
  housing: "expense",
  subscription: "expense",
  entertainment: "expense",
  shopping: "expense",
  personal: "expense",
  health: "expense",
  education: "expense",
  insurance: "expense",
  transfer: "account",
  savings: "savings",
  investment: "investment",
  debt: "debt",
  loan: "debt",
  mortgage: "debt",
  "credit card": "debt",
};

function inferCategory(row: CsvRow): string {
  if (row.category) return row.category.toLowerCase();
  const desc = row.description.toLowerCase();
  for (const keyword of Object.keys(CATEGORY_TYPE_MAP)) {
    if (desc.includes(keyword)) return keyword;
  }
  return row.amount > 0 ? "income" : "expense";
}

function inferNodeType(category: string): FinancialNodeType {
  return CATEGORY_TYPE_MAP[category] ?? (category === "income" ? "income" : "expense");
}

export function generateGraphFromCsv(
  rows: CsvRow[],
  existingNodeIds: Set<string>
): { nodes: FinancialNodeData[]; flows: FinancialFlowData[] } {
  const categoryTotals = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    const cat = inferCategory(row);
    const existing = categoryTotals.get(cat) ?? { total: 0, count: 0 };
    existing.total += Math.abs(row.amount);
    existing.count += 1;
    categoryTotals.set(cat, existing);
  }

  const nodes: FinancialNodeData[] = [];
  const nodeIdMap = new Map<string, string>();
  let counter = 0;

  for (const [category, stats] of Array.from(categoryTotals.entries())) {
    const nodeId = `csv-${category.replace(/\s+/g, "-")}-${counter++}`;
    if (existingNodeIds.has(nodeId)) continue;

    const monthlyFlow = Math.round((stats.total / Math.max(stats.count, 1)) * 100) / 100;
    const type = inferNodeType(category);

    nodes.push({
      id: nodeId,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      type,
      currentValue: 0,
      monthlyFlow,
      metadata: { importedFrom: "csv", transactionCount: stats.count },
    });

    nodeIdMap.set(category, nodeId);
  }

  // Create a central "Imported Account" node as a routing hub if there
  // are both income and expense nodes
  const hasIncome = nodes.some((n) => n.type === "income");
  const hasExpenses = nodes.some((n) => n.type !== "income");

  let hubId: string | null = null;
  if (hasIncome && hasExpenses) {
    hubId = `csv-hub-${Date.now()}`;
    nodes.push({
      id: hubId,
      label: "Imported Account",
      type: "account",
      currentValue: 0,
      monthlyFlow: 0,
      metadata: { importedFrom: "csv", role: "hub" },
    });
  }

  const flows: FinancialFlowData[] = [];
  let flowCounter = 0;

  for (const [category, stats] of Array.from(categoryTotals.entries())) {
    const nodeId = nodeIdMap.get(category);
    if (!nodeId) continue;

    const type = inferNodeType(category);
    const monthlyAmount = Math.round((stats.total / Math.max(stats.count, 1)) * 100) / 100;

    if (hubId) {
      if (type === "income") {
        flows.push({
          id: `csv-flow-${flowCounter++}`,
          source: nodeId,
          target: hubId,
          amount: monthlyAmount,
          frequency: "monthly",
        });
      } else {
        flows.push({
          id: `csv-flow-${flowCounter++}`,
          source: hubId,
          target: nodeId,
          amount: monthlyAmount,
          frequency: "monthly",
        });
      }
    }
  }

  return { nodes, flows };
}

export function importCsv(
  text: string,
  existingNodeIds: Set<string>
): CsvImportResult {
  const { rows, warnings } = parseCsv(text);
  if (rows.length === 0) {
    return { rows, generatedNodes: [], generatedFlows: [], warnings };
  }

  const { nodes, flows } = generateGraphFromCsv(rows, existingNodeIds);
  return { rows, generatedNodes: nodes, generatedFlows: flows, warnings };
}
