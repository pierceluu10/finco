import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Types ──

interface NormalizedTx {
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
}

interface GeminiResult {
  originalDescription: string;
  nodeType: "INCOME" | "EXPENSE" | "DEBT" | "SAVINGS";
  category: string;
  merchantName: string;
  confidence: "high" | "medium" | "low";
}

interface GeneratedNode {
  id: string;
  type: "INCOME" | "EXPENSE" | "DEBT" | "SAVINGS";
  label: string;
  amount: number;
  currency: "CAD";
  metadata: {
    category: string;
    transactionCount: number;
    dateRange: { from: string; to: string };
    topMerchants: string[];
    rawTransactions: NormalizedTx[];
  };
}

interface GeneratedEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  frequency: "monthly";
  label: string;
  type: "AUTOMATIC";
}

// ── CSV parsing helpers ──

const SKIP_PATTERNS = [
  /TRANSFER/i,
  /PAYMENT THANK YOU/i,
  /CLOSING BALANCE/i,
  /OPENING BALANCE/i,
];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseNumber(s: string): number {
  const cleaned = s.replace(/[$,\s]/g, "").replace(/[()]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function isDateLike(s: string): boolean {
  return /\d{1,4}[\-\/]\d{1,2}[\-\/]\d{1,4}/.test(s);
}

function normalizeCsv(text: string): NormalizedTx[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9$ ]/g, ""));

  const rows: NormalizedTx[] = [];

  // TD: Date, Description, Debit, Credit, Balance
  if (matchHeaders(headers, ["date", "description", "debit", "credit"])) {
    const iDate = findIdx(headers, ["date"]);
    const iDesc = findIdx(headers, ["description"]);
    const iDebit = findIdx(headers, ["debit"]);
    const iCredit = findIdx(headers, ["credit"]);
    return parseWithIndices(lines, iDate, iDesc, iDebit, iCredit);
  }

  // CIBC: Date, Description, Debit, Credit
  if (matchHeaders(headers, ["date", "description", "debit", "credit"]) && headers.length <= 5) {
    const iDate = findIdx(headers, ["date"]);
    const iDesc = findIdx(headers, ["description"]);
    const iDebit = findIdx(headers, ["debit"]);
    const iCredit = findIdx(headers, ["credit"]);
    return parseWithIndices(lines, iDate, iDesc, iDebit, iCredit);
  }

  // Scotiabank: Date, Description, Withdrawals, Deposits, Balance
  if (matchHeaders(headers, ["date", "description", "withdrawals", "deposits"])) {
    const iDate = findIdx(headers, ["date"]);
    const iDesc = findIdx(headers, ["description"]);
    const iDebit = findIdx(headers, ["withdrawals"]);
    const iCredit = findIdx(headers, ["deposits"]);
    return parseWithIndices(lines, iDate, iDesc, iDebit, iCredit);
  }

  // BMO: Item #, Date, Description, Withdrawal Amount, Deposit Amount, Balance
  if (matchHeaders(headers, ["date", "description", "withdrawal amount", "deposit amount"])) {
    const iDate = findIdx(headers, ["date"]);
    const iDesc = findIdx(headers, ["description"]);
    const iDebit = findIdx(headers, ["withdrawal amount", "withdrawal"]);
    const iCredit = findIdx(headers, ["deposit amount", "deposit"]);
    return parseWithIndices(lines, iDate, iDesc, iDebit, iCredit);
  }

  // RBC: Account Type, Account Number, Transaction Date, Cheque Number, Description 1, Description 2, CAD$, USD$
  if (matchHeaders(headers, ["transaction date", "description 1", "cad$"])) {
    const iDate = findIdx(headers, ["transaction date"]);
    const iDesc = findIdx(headers, ["description 1"]);
    const iAmt = findIdx(headers, ["cad$"]);
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length <= Math.max(iDate, iDesc, iAmt)) continue;
      const desc = cols[iDesc];
      if (shouldSkip(desc)) continue;
      const amount = parseNumber(cols[iAmt]);
      if (amount === 0) continue;
      rows.push({
        date: cols[iDate],
        description: desc,
        amount: Math.abs(amount),
        type: amount < 0 ? "debit" : "credit",
      });
    }
    return rows;
  }

  // Generic fallback: detect date, description, amount columns
  let iDate = headers.findIndex((h) => /date/.test(h));
  let iDesc = headers.findIndex((h) => /desc|name|merchant|memo|payee|detail/.test(h));
  let iAmt = headers.findIndex((h) => /amount|amt|value|total|debit/.test(h));

  if (iDate === -1) {
    const sampleRow = parseCsvLine(lines[1]);
    iDate = sampleRow.findIndex((v) => isDateLike(v));
  }
  if (iDesc === -1) {
    const sampleRow = parseCsvLine(lines[1]);
    iDesc = sampleRow.findIndex((v, idx) => idx !== iDate && v.length > 3 && isNaN(parseFloat(v.replace(/[$,]/g, ""))));
  }
  if (iAmt === -1) {
    const sampleRow = parseCsvLine(lines[1]);
    iAmt = sampleRow.findIndex((v, idx) => idx !== iDate && idx !== iDesc && parseFloat(v.replace(/[$,]/g, "")) !== 0);
  }

  if (iDesc === -1 || iAmt === -1) return [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length <= Math.max(iDesc, iAmt)) continue;
    const desc = cols[iDesc];
    if (shouldSkip(desc)) continue;
    const amount = parseNumber(cols[iAmt]);
    if (amount === 0) continue;
    rows.push({
      date: iDate >= 0 ? cols[iDate] : "",
      description: desc,
      amount: Math.abs(amount),
      type: amount < 0 ? "debit" : "credit",
    });
  }

  return rows;
}

function matchHeaders(headers: string[], required: string[]): boolean {
  return required.every((r) => headers.some((h) => h.includes(r)));
}

function findIdx(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

function shouldSkip(desc: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(desc));
}

function parseWithIndices(
  lines: string[],
  iDate: number,
  iDesc: number,
  iDebit: number,
  iCredit: number
): NormalizedTx[] {
  const rows: NormalizedTx[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length <= Math.max(iDate, iDesc, iDebit, iCredit)) continue;
    const desc = cols[iDesc];
    if (shouldSkip(desc)) continue;
    const debit = parseNumber(cols[iDebit] ?? "0");
    const credit = parseNumber(cols[iCredit] ?? "0");
    const amount = debit > 0 ? debit : credit;
    if (amount === 0) continue;
    rows.push({
      date: iDate >= 0 ? cols[iDate] : "",
      description: desc,
      amount,
      type: debit > 0 ? "debit" : "credit",
    });
  }
  return rows;
}

// ── Gemini categorization ──

const SYSTEM_PROMPT = `You are a financial transaction categorizer for a Canadian personal finance app. You will receive a list of bank transactions. For each transaction categorize it into exactly one of these node types and categories:

Node types and their categories:
- INCOME: Salary, Freelance, Government Benefit, Investment Return, Other Income
- EXPENSE: Groceries, Dining, Transport, Utilities, Subscriptions, Shopping, Healthcare, Entertainment, Insurance, Education, Other Expense
- DEBT: Mortgage Payment, Loan Payment, Credit Card Payment, Car Payment
- SAVINGS: Savings Transfer, Investment Contribution, TFSA Contribution, RRSP Contribution

For each transaction return:
- originalDescription: the original description string
- nodeType: one of INCOME EXPENSE DEBT SAVINGS
- category: the specific category from the list above
- merchantName: a clean readable merchant name extracted from the description
- confidence: high medium or low

Return a JSON array only. No explanation. No markdown. No preamble. Just the raw JSON array.`;

async function categorizeWithGemini(
  transactions: NormalizedTx[]
): Promise<GeminiResult[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenerativeAI(key);
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
  const userMessage = `Categorize these transactions: ${JSON.stringify(transactions)}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: userMessage },
      ]);
      const raw = result.response.text();
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      return JSON.parse(cleaned) as GeminiResult[];
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }

  throw new Error("Failed to parse Gemini response after 2 attempts");
}

// ── Node / edge grouping ──

function buildGraph(
  transactions: NormalizedTx[],
  categorized: GeminiResult[]
) {
  const txMap = new Map<number, GeminiResult>();
  for (let i = 0; i < categorized.length; i++) {
    txMap.set(i, categorized[i]);
  }

  const dates = transactions
    .map((t) => t.date)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .filter((t) => !isNaN(t));
  const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
  const monthSpan = Math.max(
    1,
    (maxDate.getTime() - minDate.getTime()) / (30.44 * 86400000)
  );

  interface GroupEntry {
    type: GeminiResult["nodeType"];
    category: string;
    groupKey: string;
    merchants: Map<string, number>;
    totalAmount: number;
    count: number;
    txs: NormalizedTx[];
    dates: number[];
  }

  const groups = new Map<string, GroupEntry>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const cat = txMap.get(i);
    if (!cat) continue;

    const groupKey =
      cat.nodeType === "DEBT"
        ? `${cat.nodeType}::${cat.merchantName}`
        : `${cat.nodeType}::${cat.category}`;

    let g = groups.get(groupKey);
    if (!g) {
      g = {
        type: cat.nodeType,
        category: cat.category,
        groupKey,
        merchants: new Map(),
        totalAmount: 0,
        count: 0,
        txs: [],
        dates: [],
      };
      groups.set(groupKey, g);
    }

    g.totalAmount += tx.amount;
    g.count += 1;
    g.txs.push(tx);
    g.merchants.set(
      cat.merchantName,
      (g.merchants.get(cat.merchantName) ?? 0) + tx.amount
    );
    const ts = new Date(tx.date).getTime();
    if (!isNaN(ts)) g.dates.push(ts);
  }

  const nodes: GeneratedNode[] = [];
  const edges: GeneratedEdge[] = [];

  for (const g of Array.from(groups.values())) {
    const nodeId = `csv-${g.groupKey.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${Date.now().toString(36)}`;
    const monthlyAmount = Math.round(g.totalAmount / monthSpan);
    const gMinDate = g.dates.length > 0 ? new Date(Math.min(...g.dates)) : minDate;
    const gMaxDate = g.dates.length > 0 ? new Date(Math.max(...g.dates)) : maxDate;
    const topMerchants = Array.from(g.merchants.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const label =
      g.type === "DEBT" ? topMerchants[0] ?? g.category : g.category;

    nodes.push({
      id: nodeId,
      type: g.type,
      label,
      amount: monthlyAmount,
      currency: "CAD",
      metadata: {
        category: g.category,
        transactionCount: g.count,
        dateRange: {
          from: gMinDate.toISOString().slice(0, 10),
          to: gMaxDate.toISOString().slice(0, 10),
        },
        topMerchants,
        rawTransactions: g.txs,
      },
    });
  }

  const incomeNodes = nodes.filter((n) => n.type === "INCOME");
  const primaryIncome =
    incomeNodes.length > 0
      ? incomeNodes.reduce((max, n) => (n.amount > max.amount ? n : max), incomeNodes[0])
      : null;

  if (primaryIncome) {
    for (const n of nodes) {
      if (n.type === "INCOME") continue;
      edges.push({
        id: `csv-edge-${primaryIncome.id}-${n.id}`,
        source: primaryIncome.id,
        target: n.id,
        amount: n.amount,
        frequency: "monthly",
        label: `${primaryIncome.label} → ${n.label}`,
        type: "AUTOMATIC",
      });
    }
  }

  const totalIncome = incomeNodes.reduce((s, n) => s + n.amount, 0);
  const totalExpenses = nodes
    .filter((n) => n.type === "EXPENSE" || n.type === "DEBT")
    .reduce((s, n) => s + n.amount, 0);

  return {
    summary: {
      totalTransactions: transactions.length,
      dateRange: {
        from: minDate.toISOString().slice(0, 10),
        to: maxDate.toISOString().slice(0, 10),
      },
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
      nodesGenerated: nodes.length,
      edgesGenerated: edges.length,
    },
    nodes,
    edges,
  };
}

// ── Route handler ──

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const transactions = normalizeCsv(text);

    if (transactions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not parse any transactions from this file. Ensure it has a header row with Date, Description, and Amount columns.",
        },
        { status: 400 }
      );
    }

    const categorized = await categorizeWithGemini(transactions);

    const { summary, nodes, edges } = buildGraph(transactions, categorized);

    return NextResponse.json({ success: true, summary, nodes, edges });
  } catch (error) {
    console.error("parse-csv error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
