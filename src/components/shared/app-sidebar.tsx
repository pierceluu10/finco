"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import { User, LogOut, ArrowUp } from "lucide-react";
=======
import { User, LogOut, Upload as UploadIcon, ArrowUp, PanelLeftClose, PanelRightOpen } from "lucide-react";
>>>>>>> Stashed changes
=======
import { User, LogOut, Upload as UploadIcon, ArrowUp, PanelLeftClose, PanelRightOpen } from "lucide-react";
>>>>>>> Stashed changes
=======
import { User, LogOut, Upload as UploadIcon, ArrowUp, PanelLeftClose, PanelRightOpen } from "lucide-react";
>>>>>>> Stashed changes
import { FincoLogo } from "./logo";
import { formatCurrency } from "@/lib/utils";
import type {
  FinancialNodeData,
  FinancialFlowData,
  FinancialNodeType,
} from "@/types/graph";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type AgentType = "sentinel" | "simulator" | "planner";
type SidebarTab = "dashboard" | "agents" | "financials";

type FormNodeType = "income" | "debt" | "investment" | "savings" | "expense" | "buffer";
const FORM_TYPE_MAP: Record<FormNodeType, FinancialNodeType> = {
  income: "income",
  debt: "debt",
  investment: "investment",
  savings: "savings",
  expense: "expense",
  buffer: "account",
};

interface SidebarProps {
  totalIncome?: number;
  totalExpenses?: number;
  nodeCount?: number;
  flowCount?: number;
  financialNodes?: FinancialNodeData[];
  financialFlows?: FinancialFlowData[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenAgentChat?: (agent: AgentType) => void;
  onAddNodeDirect?: (
    data: Omit<FinancialNodeData, "id">,
    connections: {
      targetId: string;
      direction: "to" | "from";
      amount: number;
      frequency: FinancialFlowData["frequency"];
    }[]
  ) => void;
  onCsvImportDirect?: (
    nodes: FinancialNodeData[],
    flows: FinancialFlowData[]
  ) => void;
  onParsedCsvMerge?: (
    nodes: ParsedCsvNode[],
    edges: ParsedCsvEdge[]
  ) => number;
  introStyle?: React.CSSProperties;
  introContentOpacity?: number;
}

// Types for the CSV parser API response
export interface ParsedCsvNode {
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
    rawTransactions: unknown[];
  };
}

export interface ParsedCsvEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  frequency: "monthly";
  label: string;
  type: "AUTOMATIC";
}

export interface ParsedCsvSummary {
  totalTransactions: number;
  dateRange: { from: string; to: string };
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  nodesGenerated: number;
  edgesGenerated: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const AGENTS: {
  id: AgentType;
  label: string;
  color: string;
  active: boolean;
  description: string;
  lastActivity: string;
  lastTimestamp: string;
  alertCount?: number;
}[] = [
  {
    id: "sentinel",
    label: "Sentinel",
    color: "#5B9CF5",
    active: true,
    description:
      "Your financial supervisor. Explains your graph, writes alerts, detects suspicious activity, and guides you through pressure points.",
    lastActivity: "Monitoring your ecosystem. 1 alert active.",
    lastTimestamp: "Just now",
    alertCount: 1,
  },
  {
    id: "simulator",
    label: "Simulator",
    color: "#7AAFDA",
    active: true,
    description:
      "Models the impact of financial changes and explains what happened in clear before/after terms.",
    lastActivity: "Last simulation ran 4 minutes ago.",
    lastTimestamp: "4 min ago",
  },
  {
    id: "planner",
    label: "Planner",
    color: "#5B7FC5",
    active: true,
    description:
      "Plans your financial future: emergency funds, savings, debt payoff, TFSA/RRSP/FHSA, and curated stock market suggestions.",
    lastActivity: "Ready to help with your financial goals.",
    lastTimestamp: "Active",
  },
];

const MOCK_MONTHLY = [
  { month: "Oct", income: 9200, expenses: 7800 },
  { month: "Nov", income: 9500, expenses: 8100 },
  { month: "Dec", income: 10200, expenses: 9400 },
  { month: "Jan", income: 9600, expenses: 8000 },
  { month: "Feb", income: 9800, expenses: 7600 },
  { month: "Mar", income: 9880, expenses: 7900 },
];

const SUPPORTED_BANKS = [
  "TD",
  "RBC",
  "Scotiabank",
  "BMO",
  "CIBC",
  "Tangerine",
  "Simplii",
];

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export function AppSidebar({
  totalIncome = 0,
  totalExpenses = 0,
  nodeCount = 0,
  flowCount = 0,
  financialNodes = [],
  financialFlows = [],
  collapsed = false,
  onToggleCollapse,
  onOpenAgentChat,
  onAddNodeDirect,
  onCsvImportDirect,
  onParsedCsvMerge,
  introStyle,
  introContentOpacity,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("dashboard");

  const TRANSITION = "350ms cubic-bezier(0.4, 0, 0.2, 1)";

  const outerStyle: React.CSSProperties = {
    width: collapsed ? 0 : "25vw",
    transition: `width ${TRANSITION}`,
    overflow: collapsed ? "visible" : "hidden",
    ...introStyle,
  };

  const hasIntroOverride = introContentOpacity !== undefined;
  const innerOpacity = hasIntroOverride
    ? introContentOpacity
    : collapsed
      ? 0
      : 1;
  const innerTransition = hasIntroOverride
    ? "opacity 300ms ease"
    : collapsed
      ? "opacity 150ms ease"
      : "opacity 150ms ease 200ms";

  return (
    <div
      className="fixed left-0 top-0 z-40 h-screen"
      style={outerStyle}
    >
      {/* Inner panel — overflow hidden so when sidebar width is 0, panel doesn't paint over graph */}
      <div
        className="h-full flex flex-col border-r border-white/5 bg-zinc-950"
        style={{
          overflow: "hidden",
          width: "100%",
          minWidth: 0,
          opacity: innerOpacity,
          transition: innerTransition,
        }}
      >
        {/* Logo + Minimize (always visible when expanded so user can collapse; expand tab when collapsed never disappears) */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4 border-b border-white/5">
          <Link href="/">
            <FincoLogo size="sm" />
          </Link>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-sans text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: "#6b6b9a" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#e8e8ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#6b6b9a";
              }}
              aria-label="Minimize dashboard"
            >
              <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Minimize</span>
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div
          className="flex shrink-0"
          style={{ borderBottom: "1px solid #1a1a2e" }}
        >
          {(["dashboard", "agents", "financials"] as SidebarTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 font-sans capitalize transition-all duration-200"
                style={{
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? "#e8e8ff" : "#6b6b9a",
                  borderBottom:
                    activeTab === tab
                      ? "2px solid #7F7FFA"
                      : "2px solid transparent",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab)
                    e.currentTarget.style.color = "#e8e8ff";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab)
                    e.currentTarget.style.color = "#6b6b9a";
                }}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === "dashboard" && (
            <div key="dashboard" className="sidebar-fade-in px-4 pb-4">
              <DashboardContent
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                nodeCount={nodeCount}
                flowCount={flowCount}
                financialNodes={financialNodes}
                financialFlows={financialFlows}
              />
            </div>
          )}
          {activeTab === "agents" && (
            <div key="agents" className="sidebar-fade-in px-4 pb-4">
              <AgentsContent onOpenAgentChat={onOpenAgentChat} />
            </div>
          )}
          {activeTab === "financials" && (
            <div key="financials" className="sidebar-fade-in px-4 pb-4">
              <FinancialsContent
                financialNodes={financialNodes}
                onAddNodeDirect={onAddNodeDirect}
                onCsvImportDirect={onCsvImportDirect}
                onParsedCsvMerge={onParsedCsvMerge}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/5 p-2 space-y-0.5">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition font-sans"
          >
            <User className="h-3 w-3" />
            My Profile
          </Link>
          <a
            href="/auth/logout"
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition font-sans"
          >
            <LogOut className="h-3 w-3" />
            Sign Out
          </a>
        </div>
      </div>

      {/* Expand/collapse toggle — when collapsed: always visible tab with "Expand"; when expanded: tab on right edge */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute transition-all duration-200 flex items-center gap-1.5"
          style={{
            ...(collapsed
              ? {
                  left: 0,
                  right: "auto",
                  borderRadius: "0 8px 8px 0",
                  borderLeft: "1px solid #1a1a2e",
                  paddingLeft: 6,
                  paddingRight: 8,
                }
              : {
                  right: -24,
                  left: "auto",
                  borderRadius: "0 8px 8px 0",
                  borderLeft: "none",
                  paddingLeft: 0,
                  paddingRight: 0,
                }),
            top: "50%",
            transform: "translateY(-50%)",
            minWidth: collapsed ? 80 : 24,
            width: collapsed ? "auto" : 24,
            height: 48,
            background: "#0a0a14",
            border: "1px solid #1a1a2e",
            color: "#6b6b9a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: collapsed ? 12 : 16,
            lineHeight: 1,
            cursor: "pointer",
            zIndex: 50,
            pointerEvents: "auto",
            fontFamily: "var(--font-sans), sans-serif",
            fontWeight: 500,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e8e8ff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6b9a")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <>
              <PanelRightOpen className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Expand</span>
            </>
          ) : (
            "‹"
          )}
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ────────────────────────────────────────────────────────────────────────────

function DashboardContent({
  totalIncome,
  totalExpenses,
  nodeCount,
  flowCount,
  financialNodes,
  financialFlows: _financialFlows,
}: {
  totalIncome: number;
  totalExpenses: number;
  nodeCount: number;
  flowCount: number;
  financialNodes: FinancialNodeData[];
  financialFlows: FinancialFlowData[];
}) {
  const netFlow = totalIncome - totalExpenses;
  const total = totalIncome + totalExpenses;
  const incomePct = total > 0 ? (totalIncome / total) * 100 : 50;

  const expenseNodes = useMemo(
    () =>
      financialNodes
        .filter((n) => n.type === "expense" && n.monthlyFlow > 0)
        .sort((a, b) => b.monthlyFlow - a.monthlyFlow),
    [financialNodes]
  );
  const maxExpense = expenseNodes.length > 0 ? expenseNodes[0].monthlyFlow : 1;

  const upcomingPayments = useMemo(() => {
    const payments = financialNodes
      .filter(
        (n) =>
          (n.type === "debt" || n.type === "expense") && n.monthlyFlow > 0
      )
      .sort((a, b) => b.monthlyFlow - a.monthlyFlow)
      .slice(0, 3);
    const today = new Date();
    return payments.map((n, i) => {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 3 + i * 8);
      return {
        id: n.id,
        label: n.label,
        amount: n.monthlyFlow,
        dueDate,
        dueWithin7: dueDate.getTime() - today.getTime() < 7 * 86400000,
      };
    });
  }, [financialNodes]);

  return (
    <>
      {/* Existing overview stats */}
      <div className="py-3 space-y-3">
        <StatRow
          label="Monthly income"
          value={formatCurrency(totalIncome)}
          accent="text-emerald-400"
        />
        <StatRow
          label="Monthly expenses"
          value={formatCurrency(totalExpenses)}
          accent="text-rose-400"
        />
        <Divider />
        <StatRow
          label="Net flow"
          value={`${netFlow >= 0 ? "+" : ""}${formatCurrency(netFlow)}`}
          accent={netFlow >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
      </div>

      <Divider />

      {/* NET FLOW BAR */}
      <div className="py-3">
        <SectionLabel>Net Flow</SectionLabel>
        <div
          className="w-full flex overflow-hidden mt-2"
          style={{ height: 8, borderRadius: 6 }}
        >
          <div
            style={{
              width: `${incomePct}%`,
              background: "rgba(0,255,136,0.7)",
              transition: "width 0.3s ease",
            }}
          />
          <div style={{ flex: 1, background: "rgba(255,77,109,0.5)" }} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <FlowStat
            label="Income"
            value={formatCurrency(totalIncome)}
            color="#4ade80"
          />
          <FlowStat
            label="Expenses"
            value={formatCurrency(totalExpenses)}
            color="#ff4d6d"
          />
          <FlowStat
            label="Net"
            value={`${netFlow >= 0 ? "+" : ""}${formatCurrency(netFlow)}`}
            color={netFlow >= 0 ? "#4ade80" : "#ff4d6d"}
          />
        </div>
      </div>

      <Divider />

      {/* SPENDING BREAKDOWN */}
      <div className="py-3">
        <SectionLabel>Spending Breakdown</SectionLabel>
        <div className="mt-2 space-y-2">
          {expenseNodes.map((n) => (
            <div key={n.id} className="flex items-center gap-2">
              <span
                className="font-sans truncate shrink-0"
                style={{
                  width: 90,
                  fontWeight: 500,
                  fontSize: 12,
                  color: "#6b6b9a",
                }}
              >
                {n.label}
              </span>
              <div className="flex-1 h-1.5" style={{ borderRadius: 3 }}>
                <div
                  className="h-full bar-grow"
                  style={{
                    width: `${(n.monthlyFlow / maxExpense) * 100}%`,
                    background: "rgba(127,127,250,0.6)",
                    borderRadius: 3,
                  }}
                />
              </div>
              <span
                className="font-sans shrink-0 tabular-nums"
                style={{ fontSize: 12, color: "#e8e8ff" }}
              >
                {formatCurrency(n.monthlyFlow)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* MONTHLY TREND */}
      <div className="py-3">
        <SectionLabel>Monthly Trend</SectionLabel>
        <MonthlyTrendChart />
      </div>

      <Divider />

      {/* UPCOMING */}
      <div className="py-3">
        <SectionLabel>Upcoming</SectionLabel>
        <div className="mt-2">
          {upcomingPayments.map((p, i) => (
            <div key={p.id}>
              {i > 0 && <Divider />}
              <div className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {p.dueWithin7 && (
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#ffe040",
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span
                      className="font-sans truncate"
                      style={{ fontWeight: 600, fontSize: 13, color: "#e8e8ff" }}
                    >
                      {p.label}
                    </span>
                  </div>
                  <span
                    className="font-sans"
                    style={{ fontWeight: 500, fontSize: 12, color: "#6b6b9a" }}
                  >
                    {p.dueDate.toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <span
                  className="font-sans shrink-0 tabular-nums"
                  style={{ fontSize: 13, color: "#e8e8ff" }}
                >
                  {formatCurrency(p.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ecosystem summary */}
      <Divider />
      <div className="py-3">
        <SectionLabel>Ecosystem</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <StatBox label="Nodes" value={nodeCount} />
          <StatBox label="Flows" value={flowCount} />
        </div>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// AGENTS TAB
// ────────────────────────────────────────────────────────────────────────────

function AgentsContent({
  onOpenAgentChat,
}: {
  onOpenAgentChat?: (agent: AgentType) => void;
}) {
  return (
    <>
      <div className="pt-4 pb-3">
        <p
          className="font-sans"
          style={{ fontWeight: 800, fontSize: 18, color: "#e8e8ff" }}
        >
          Your Agents
        </p>
        <p
          className="font-sans mt-0.5"
          style={{ fontWeight: 500, fontSize: 13, color: "#6b6b9a" }}
        >
          Specialized intelligence monitoring your financial ecosystem.
        </p>
      </div>

      <div className="space-y-3">
        {AGENTS.map((a) => (
          <AgentCard
            key={a.id}
            agent={a}
            onChat={() => onOpenAgentChat?.(a.id)}
          />
        ))}
      </div>
    </>
  );
}

function AgentCard({
  agent,
  onChat,
}: {
  agent: (typeof AGENTS)[number];
  onChat: () => void;
}) {
  return (
    <div
      className="transition-all"
      style={{
        transitionDuration: "250ms",
        background: "#0a0a14",
        border: "1px solid #1a1a2e",
        borderLeft: `3px solid ${agent.active ? agent.color : "#1a1a2e"}`,
        borderRadius: 12,
        padding: 18,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${agent.color}4D`;
        e.currentTarget.style.background = `${agent.color}08`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#1a1a2e";
        e.currentTarget.style.borderLeftColor = agent.active
          ? agent.color
          : "#1a1a2e";
        e.currentTarget.style.background = "#0a0a14";
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={agent.active ? "agent-pulse" : ""}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: agent.active ? agent.color : "#2a2a4a",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            className="font-sans"
            style={{ fontWeight: 700, fontSize: 15, color: "#e8e8ff" }}
          >
            {agent.label}
          </span>
        </div>
        {agent.active ? (
          <span
            className="font-sans rounded-full px-2 py-0.5"
            style={{
              fontWeight: 700,
              fontSize: 11,
              color: agent.color,
              background: `${agent.color}26`,
            }}
          >
            Active
          </span>
        ) : (
          <span
            className="font-sans rounded-full px-2 py-0.5"
            style={{
              fontWeight: 700,
              fontSize: 11,
              color: "#3a3a5a",
              background: "#1a1a2e",
            }}
          >
            Idle
          </span>
        )}
      </div>

      {/* Description */}
      <p
        className="font-sans mt-2"
        style={{ fontWeight: 500, fontSize: 13, color: "#6b6b9a" }}
      >
        {agent.description}
      </p>

      {/* Activity log */}
      <div className="mt-3">
        <p
          className="font-sans"
          style={{
            fontWeight: 700,
            fontSize: 10,
            color: "#3a3a5a",
            textTransform: "uppercase",
          }}
        >
          Last Activity
        </p>
        <p
          className="font-sans mt-0.5"
          style={{ fontWeight: 500, fontSize: 12, color: "#6b6b9a" }}
        >
          {agent.lastActivity}
        </p>
        <p
          className="font-sans mt-0.5"
          style={{ fontWeight: 500, fontSize: 10, color: "#3a3a5a" }}
        >
          {agent.lastTimestamp}
        </p>
      </div>

      {/* Sentinel alert count */}
      {agent.id === "sentinel" && agent.alertCount != null && agent.alertCount > 0 && (
        <div className="flex items-center justify-between mt-2">
          <span
            className="font-sans"
            style={{ fontWeight: 600, fontSize: 12, color: "#6b6b9a" }}
          >
            Active Alerts
          </span>
          <span
            className="font-sans rounded-full px-2 py-0.5 tabular-nums"
            style={{
              fontWeight: 700,
              fontSize: 11,
              color: "#000",
              background: "#ffe040",
            }}
          >
            {agent.alertCount}
          </span>
        </div>
      )}

      {/* Chat button */}
      <button
        onClick={onChat}
        className="w-full mt-3 font-sans transition-all duration-200"
        style={{
          background: "transparent",
          border: `1px solid ${agent.color}40`,
          color: agent.color,
          fontWeight: 700,
          fontSize: 13,
          borderRadius: 8,
          padding: "10px 0",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `${agent.color}14`;
          e.currentTarget.style.borderColor = `${agent.color}80`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = `${agent.color}40`;
        }}
      >
        Chat with {agent.label}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FINANCIALS TAB (exported for onboarding page)
// ────────────────────────────────────────────────────────────────────────────

export function FinancialsContent({
  financialNodes: _financialNodes,
  onAddNodeDirect,
  onCsvImportDirect: _onCsvImportDirect,
  onParsedCsvMerge,
}: {
  financialNodes: FinancialNodeData[];
  onAddNodeDirect?: SidebarProps["onAddNodeDirect"];
  onCsvImportDirect?: SidebarProps["onCsvImportDirect"];
  onParsedCsvMerge?: SidebarProps["onParsedCsvMerge"];
}) {
  return (
    <>
      <div className="pt-4 pb-3">
        <p
          className="font-sans"
          style={{ fontWeight: 800, fontSize: 18, color: "#e8e8ff" }}
        >
          Your Financials
        </p>
        <p
          className="font-sans mt-0.5"
          style={{ fontWeight: 500, fontSize: 13, color: "#6b6b9a" }}
        >
          Connect your financial data to populate your ecosystem.
        </p>
      </div>

      <Divider />

      {/* CSV IMPORT */}
      <div className="py-3">
        <SectionLabel>Import CSV</SectionLabel>
        <CsvImportZone
          financialNodes={_financialNodes}
          onCsvImportDirect={_onCsvImportDirect}
          onParsedCsvMerge={onParsedCsvMerge}
        />
        <div className="mt-3">
          <p
            className="font-sans"
            style={{ fontWeight: 500, fontSize: 11, color: "#3a3a5a" }}
          >
            Supported exports from
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {SUPPORTED_BANKS.map((b) => (
              <span
                key={b}
                className="font-sans"
                style={{
                  background: "#0a0a14",
                  border: "1px solid #1a1a2e",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontWeight: 500,
                  fontSize: 11,
                  color: "#6b6b9a",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Divider />

      {/* ADD MANUALLY */}
      <div className="py-3">
        <SectionLabel>Add Manually</SectionLabel>
        <AddNodeForm onAddNodeDirect={onAddNodeDirect} />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CSV Import Zone (API-backed)
// ────────────────────────────────────────────────────────────────────────────

type CsvStage = "idle" | "selected" | "loading" | "success" | "error";

function CsvImportZone({
  financialNodes: _financialNodes,
  onCsvImportDirect: _onCsvImportDirect,
  onParsedCsvMerge,
}: {
  financialNodes: FinancialNodeData[];
  onCsvImportDirect?: SidebarProps["onCsvImportDirect"];
  onParsedCsvMerge?: SidebarProps["onParsedCsvMerge"];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<CsvStage>("idle");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ParsedCsvSummary | null>(null);
  const [parsedNodes, setParsedNodes] = useState<ParsedCsvNode[]>([]);
  const [parsedEdges, setParsedEdges] = useState<ParsedCsvEdge[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleFile = useCallback((f: File) => {
    setError(null);
    setSummary(null);
    setParsedNodes([]);
    setParsedEdges([]);
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      setStage("error");
      return;
    }
    setFile(f);
    setStage("selected");
  }, []);

  const processFile = useCallback(async () => {
    if (!file) return;
    setStage("loading");
    setError(null);

    setLoadingMsg("Reading transactions...");
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [
      setTimeout(() => setLoadingMsg("Categorizing with AI..."), 800),
      setTimeout(() => setLoadingMsg("Building your ecosystem..."), 1600),
    ];

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-csv", { method: "POST", body: form });
      const data = await res.json();
      timersRef.current.forEach(clearTimeout);

      if (!data.success) {
        setError(data.error || "Failed to process CSV");
        setStage("error");
        return;
      }

      setSummary(data.summary);
      setParsedNodes(data.nodes);
      setParsedEdges(data.edges);
      setStage("success");
    } catch (e) {
      timersRef.current.forEach(clearTimeout);
      setError(e instanceof Error ? e.message : "Network error");
      setStage("error");
    }
  }, [file]);

  const addToEcosystem = useCallback(() => {
    onParsedCsvMerge?.(parsedNodes, parsedEdges);
    setStage("idle");
    setFile(null);
    setSummary(null);
    setParsedNodes([]);
    setParsedEdges([]);
  }, [parsedNodes, parsedEdges, onParsedCsvMerge]);

  const reset = useCallback(() => {
    setStage("idle");
    setFile(null);
    setError(null);
    setSummary(null);
    setParsedNodes([]);
    setParsedEdges([]);
  }, []);

  const fmtSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

  const fmtCurrency = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="mt-2">
      {/* ── Drop zone ── */}
      {(stage === "idle" || stage === "selected") && (
        <>
          <div
            className="flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
            style={{
              height: 120,
              background: dragOver ? "rgba(127,127,250,0.06)" : "#0a0a14",
              border: dragOver ? "1.5px dashed #7F7FFA" : "1.5px dashed #1a1a2e",
              borderRadius: 12,
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onMouseEnter={(e) => {
              if (!dragOver) {
                e.currentTarget.style.borderColor = "rgba(127,127,250,0.4)";
                e.currentTarget.style.background = "rgba(127,127,250,0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (!dragOver) {
                e.currentTarget.style.borderColor = "#1a1a2e";
                e.currentTarget.style.background = "#0a0a14";
              }
            }}
          >
            <ArrowUp style={{ width: 20, height: 20, color: "#3a3a5a" }} />
            <span className="font-sans" style={{ fontWeight: 600, fontSize: 13, color: "#6b6b9a" }}>
              Drag your bank CSV here
            </span>
            <span className="font-sans" style={{ fontWeight: 500, fontSize: 12, color: "#3a3a5a" }}>
              or click to browse
            </span>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </>
      )}

      {/* ── File selected ── */}
      {stage === "selected" && file && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-sans truncate" style={{ fontWeight: 500, fontSize: 13, color: "#e8e8ff" }}>
              {file.name}
            </p>
            <p className="font-sans" style={{ fontWeight: 500, fontSize: 11, color: "#3a3a5a" }}>
              {fmtSize(file.size)}
            </p>
          </div>
          <button
            onClick={processFile}
            className="font-sans shrink-0 rounded-lg px-3 py-1.5 transition"
            style={{ fontWeight: 700, fontSize: 12, background: "#7F7FFA", color: "#000", borderRadius: 8 }}
          >
            Process File
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {stage === "loading" && (
        <div
          className="flex flex-col items-center justify-center gap-3"
          style={{ height: 120, background: "#0a0a14", borderRadius: 12, border: "1px solid #1a1a2e" }}
        >
          <div
            className="rounded-full"
            style={{
              width: 24,
              height: 24,
              border: "2.5px solid #1a1a2e",
              borderTopColor: "#7F7FFA",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span className="font-sans" style={{ fontWeight: 600, fontSize: 13, color: "#6b6b9a" }}>
            {loadingMsg}
          </span>
        </div>
      )}

      {/* ── Success summary ── */}
      {stage === "success" && summary && (
        <div className="mt-2">
          <div
            style={{
              background: "#0a0a14",
              border: "1px solid rgba(0,255,136,0.2)",
              borderLeft: "3px solid #00ff88",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <p className="font-sans" style={{ fontWeight: 700, fontSize: 14, color: "#e8e8ff" }}>
              {summary.totalTransactions} transactions analyzed
            </p>
            <p className="font-sans mt-0.5" style={{ fontWeight: 600, fontSize: 13, color: "#e8e8ff" }}>
              {summary.nodesGenerated} nodes generated
            </p>
            <p className="font-sans mt-1" style={{ fontWeight: 500, fontSize: 12, color: "#6b6b9a" }}>
              {summary.dateRange.from} — {summary.dateRange.to}
            </p>
            <div className="flex gap-4 mt-2">
              <div>
                <span className="font-sans" style={{ fontWeight: 500, fontSize: 11, color: "#6b6b9a" }}>
                  Income
                </span>
                <p className="font-sans tabular-nums" style={{ fontWeight: 700, fontSize: 14, color: "#4ade80" }}>
                  {fmtCurrency(summary.totalIncome)}
                </p>
              </div>
              <div>
                <span className="font-sans" style={{ fontWeight: 500, fontSize: 11, color: "#6b6b9a" }}>
                  Expenses
                </span>
                <p className="font-sans tabular-nums" style={{ fontWeight: 700, fontSize: 14, color: "#ff4d6d" }}>
                  {fmtCurrency(summary.totalExpenses)}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={addToEcosystem}
            className="font-sans w-full mt-3 rounded-lg py-2.5 transition"
            style={{ fontWeight: 700, fontSize: 13, background: "#7F7FFA", color: "#000", borderRadius: 10 }}
          >
            Add to Ecosystem
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {stage === "error" && (
        <div className="mt-2">
          <p className="font-sans" style={{ fontWeight: 500, fontSize: 13, color: "#ff4d6d" }}>
            {error}
          </p>
          <button
            onClick={reset}
            className="font-sans mt-2 rounded-lg px-4 py-1.5 transition"
            style={{
              fontWeight: 600,
              fontSize: 12,
              background: "transparent",
              border: "1px solid #ff4d6d",
              color: "#ff4d6d",
              borderRadius: 8,
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Add Node Form
// ────────────────────────────────────────────────────────────────────────────

const FORM_TYPES: { value: FormNodeType; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "debt", label: "Debt" },
  { value: "investment", label: "Investment" },
  { value: "savings", label: "Savings" },
  { value: "expense", label: "Expense" },
  { value: "buffer", label: "Buffer" },
];

function AddNodeForm({
  onAddNodeDirect,
}: {
  onAddNodeDirect?: SidebarProps["onAddNodeDirect"];
}) {
  const [selectedType, setSelectedType] = useState<FormNodeType | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFields({});
    setSuccess(false);
  }, []);

  const updateField = (key: string, val: string) =>
    setFields((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = useCallback(() => {
    if (!selectedType || !fields.name?.trim()) return;
    const type = FORM_TYPE_MAP[selectedType];
    const metadata: Record<string, unknown> = {};

    let monthlyFlow = 0;
    let currentValue = 0;

    switch (selectedType) {
      case "income":
        monthlyFlow = parseFloat(fields.monthlyAmount) || 0;
        if (fields.employer) metadata.employer = fields.employer;
        if (fields.payFrequency) metadata.frequency = fields.payFrequency;
        break;
      case "debt":
        monthlyFlow = parseFloat(fields.monthlyPayment) || 0;
        currentValue = parseFloat(fields.totalRemaining) || 0;
        if (fields.interestRate) metadata.rate = parseFloat(fields.interestRate);
        if (fields.lender) metadata.lender = fields.lender;
        break;
      case "investment":
        currentValue = parseFloat(fields.currentValue) || 0;
        monthlyFlow = parseFloat(fields.monthlyContribution) || 0;
        if (fields.platform) metadata.institution = fields.platform;
        if (fields.accountType) metadata.account_type = fields.accountType;
        break;
      case "savings":
        currentValue = parseFloat(fields.currentBalance) || 0;
        monthlyFlow = parseFloat(fields.monthlyContribution) || 0;
        if (fields.institution) metadata.institution = fields.institution;
        if (fields.goalAmount) metadata.target = parseFloat(fields.goalAmount);
        break;
      case "expense":
        monthlyFlow = parseFloat(fields.monthlyAmount) || 0;
        if (fields.category) metadata.category = fields.category;
        break;
      case "buffer":
        currentValue = parseFloat(fields.currentBalance) || 0;
        break;
    }

    onAddNodeDirect?.(
      { label: fields.name.trim(), type, monthlyFlow, currentValue, metadata },
      []
    );
    reset();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }, [selectedType, fields, onAddNodeDirect, reset]);

  return (
    <div className="mt-2">
      {/* Type selector grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {FORM_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setSelectedType(t.value === selectedType ? null : t.value);
              reset();
            }}
            className="font-sans py-2 transition-all"
            style={{
              background:
                selectedType === t.value
                  ? "rgba(127,127,250,0.08)"
                  : "#0a0a14",
              border:
                selectedType === t.value
                  ? "1px solid #7F7FFA"
                  : "1px solid #1a1a2e",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              color: selectedType === t.value ? "#7F7FFA" : "#6b6b9a",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Dynamic form */}
      {selectedType && (
        <div className="mt-3 space-y-2.5">
          <FormField
            label="Name"
            value={fields.name ?? ""}
            onChange={(v) => updateField("name", v)}
            placeholder={`e.g. ${selectedType === "income" ? "Salary" : selectedType === "expense" ? "Groceries" : selectedType === "debt" ? "Mortgage" : selectedType === "savings" ? "Emergency Fund" : selectedType === "investment" ? "TFSA" : "Cash Buffer"}`}
          />

          {selectedType === "income" && (
            <>
              <FormField
                label="Monthly Amount"
                value={fields.monthlyAmount ?? ""}
                onChange={(v) => updateField("monthlyAmount", v)}
                type="number"
                placeholder="0"
              />
              <FormField
                label="Employer"
                value={fields.employer ?? ""}
                onChange={(v) => updateField("employer", v)}
                placeholder="Company name"
              />
              <FormSelect
                label="Pay Frequency"
                value={fields.payFrequency ?? "monthly"}
                onChange={(v) => updateField("payFrequency", v)}
                options={["biweekly", "monthly", "weekly"]}
              />
            </>
          )}

          {selectedType === "debt" && (
            <>
              <FormField
                label="Monthly Payment"
                value={fields.monthlyPayment ?? ""}
                onChange={(v) => updateField("monthlyPayment", v)}
                type="number"
                placeholder="0"
              />
              <FormField
                label="Total Remaining"
                value={fields.totalRemaining ?? ""}
                onChange={(v) => updateField("totalRemaining", v)}
                type="number"
                placeholder="0"
              />
              <FormField
                label="Interest Rate (%)"
                value={fields.interestRate ?? ""}
                onChange={(v) => updateField("interestRate", v)}
                type="number"
                placeholder="0"
              />
              <FormField
                label="Lender"
                value={fields.lender ?? ""}
                onChange={(v) => updateField("lender", v)}
                placeholder="Bank or institution"
              />
            </>
          )}

          {selectedType === "investment" && (
            <>
              <FormField
                label="Current Value"
                value={fields.currentValue ?? ""}
                onChange={(v) => updateField("currentValue", v)}
                type="number"
                placeholder="0"
              />
              <FormField
                label="Monthly Contribution"
                value={fields.monthlyContribution ?? ""}
                onChange={(v) => updateField("monthlyContribution", v)}
                type="number"
                placeholder="0"
              />
              <FormField
                label="Platform"
                value={fields.platform ?? ""}
                onChange={(v) => updateField("platform", v)}
                placeholder="Wealthsimple, Questrade, etc."
              />
              <FormSelect
                label="Account Type"
                value={fields.accountType ?? "TFSA"}
                onChange={(v) => updateField("accountType", v)}
                options={["TFSA", "RRSP", "Non-registered"]}
              />
            </>
          )}

          {selectedType === "savings" && (
            <>
              <FormField
                label="Current Balance"
                value={fields.currentBalance ?? ""}
                onChange={(v) => updateField("currentBalance", v)}
                type="number"
                placeholder="0"
              />
              <FormField
                label="Monthly Contribution"
                value={fields.monthlyContribution ?? ""}
                onChange={(v) => updateField("monthlyContribution", v)}
                type="number"
                placeholder="0"
              />
              <FormField
                label="Institution"
                value={fields.institution ?? ""}
                onChange={(v) => updateField("institution", v)}
                placeholder="Bank name"
              />
              <FormField
                label="Goal Amount"
                value={fields.goalAmount ?? ""}
                onChange={(v) => updateField("goalAmount", v)}
                type="number"
                placeholder="0"
              />
            </>
          )}

          {selectedType === "expense" && (
            <>
              <FormField
                label="Monthly Amount"
                value={fields.monthlyAmount ?? ""}
                onChange={(v) => updateField("monthlyAmount", v)}
                type="number"
                placeholder="0"
              />
              <FormSelect
                label="Category"
                value={fields.category ?? "food"}
                onChange={(v) => updateField("category", v)}
                options={[
                  "food",
                  "housing",
                  "transport",
                  "utilities",
                  "entertainment",
                  "personal",
                  "health",
                  "other",
                ]}
              />
            </>
          )}

          {selectedType === "buffer" && (
            <FormField
              label="Current Balance"
              value={fields.currentBalance ?? ""}
              onChange={(v) => updateField("currentBalance", v)}
              type="number"
              placeholder="0"
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={!fields.name?.trim()}
            className="font-sans w-full transition disabled:opacity-30"
            style={{
              background: "#7F7FFA",
              color: "#000",
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 10,
              padding: "12px 0",
            }}
          >
            Add to Ecosystem
          </button>

          {success && (
            <p
              className="font-sans text-center"
              style={{ fontWeight: 500, fontSize: 13, color: "#4ade80" }}
            >
              Node added successfully.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Chart components
// ────────────────────────────────────────────────────────────────────────────

function MonthlyTrendChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const data = MOCK_MONTHLY;
  const allVals = data.flatMap((d) => [d.income, d.expenses]);
  const minV = Math.min(...allVals) * 0.9;
  const maxV = Math.max(...allVals) * 1.05;
  const range = maxV - minV || 1;

  const W = 100;
  const H = 100;
  const pad = 4;

  const pts = (key: "income" | "expenses") =>
    data
      .map((d, i) => {
        const x = pad + (i / (data.length - 1)) * (W - pad * 2);
        const y = H - pad - ((d[key] - minV) / range) * (H - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");

  const gridLines = [0.25, 0.5, 0.75].map((f) => H - pad - f * (H - pad * 2));

  return (
    <div className="relative mt-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 100 }}
        preserveAspectRatio="none"
      >
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={pad}
            y1={y}
            x2={W - pad}
            y2={y}
            stroke="#1a1a2e"
            strokeWidth={0.5}
          />
        ))}

        <polyline
          points={pts("income")}
          fill="none"
          stroke="rgba(0,255,136,0.8)"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <polyline
          points={pts("expenses")}
          fill="none"
          stroke="rgba(255,77,109,0.7)"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const x = pad + (i / (data.length - 1)) * (W - pad * 2);
          const yI = H - pad - ((d.income - minV) / range) * (H - pad * 2);
          const yE = H - pad - ((d.expenses - minV) / range) * (H - pad * 2);
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={x - 6}
                y={0}
                width={12}
                height={H}
                fill="transparent"
              />
              <circle cx={x} cy={yI} r={1.5} fill="rgba(0,255,136,0.8)" />
              <circle cx={x} cy={yE} r={1.5} fill="rgba(255,77,109,0.7)" />
            </g>
          );
        })}
      </svg>

      {hovered !== null && (
        <div
          className="absolute font-sans pointer-events-none"
          style={{
            left: `${((hovered / (data.length - 1)) * 100).toFixed(0)}%`,
            top: 0,
            transform: "translateX(-50%)",
            background: "#0a0a14",
            border: "1px solid #1a1a2e",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            color: "#e8e8ff",
            whiteSpace: "nowrap",
            zIndex: 5,
          }}
        >
          <p className="font-sans" style={{ fontWeight: 700, color: "#6b6b9a" }}>
            {data[hovered].month}
          </p>
          <p>
            <span style={{ color: "rgba(0,255,136,0.8)" }}>Income:</span>{" "}
            <span className="font-sans tabular-nums">
              {formatCurrency(data[hovered].income)}
            </span>
          </p>
          <p>
            <span style={{ color: "rgba(255,77,109,0.7)" }}>Expenses:</span>{" "}
            <span className="font-sans tabular-nums">
              {formatCurrency(data[hovered].expenses)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Form helpers
// ────────────────────────────────────────────────────────────────────────────

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        className="font-sans block mb-1"
        style={{ fontWeight: 600, fontSize: 12, color: "#6b6b9a" }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`font-sans w-full outline-none ${type === "number" ? "tabular-nums" : ""}`}
        style={{
          background: "#050508",
          border: "1px solid #1a1a2e",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 13,
          fontWeight: 500,
          color: "#e8e8ff",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = "rgba(127,127,250,0.5)")
        }
        onBlur={(e) => (e.currentTarget.style.borderColor = "#1a1a2e")}
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label
        className="font-sans block mb-1"
        style={{ fontWeight: 600, fontSize: 12, color: "#6b6b9a" }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-sans w-full outline-none capitalize appearance-none"
        style={{
          background: "#050508",
          border: "1px solid #1a1a2e",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 13,
          fontWeight: 500,
          color: "#e8e8ff",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = "rgba(127,127,250,0.5)")
        }
        onBlur={(e) => (e.currentTarget.style.borderColor = "#1a1a2e")}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-sans"
      style={{
        fontWeight: 700,
        fontSize: 11,
        color: "#6b6b9a",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#1a1a2e" }} />;
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="font-sans text-[11px] text-zinc-500">{label}</span>
      <span className={`text-xs font-sans tabular-nums ${accent ?? "text-zinc-200"}`}>
        {value}
      </span>
    </div>
  );
}

function FlowStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <p
        className="font-sans"
        style={{ fontWeight: 500, fontSize: 11, color: "#6b6b9a" }}
      >
        {label}
      </p>
      <p className="font-sans tabular-nums" style={{ fontSize: 13, color }}>
        {value}
      </p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-3"
      style={{
        background: "#0a0a14",
        border: "1px solid #1a1a2e",
        borderRadius: 10,
      }}
    >
      <p
        className="font-sans tabular-nums"
        style={{ fontWeight: 700, fontSize: 24, color: "#e8e8ff" }}
      >
        {value}
      </p>
      <p
        className="font-sans"
        style={{ fontWeight: 500, fontSize: 12, color: "#6b6b9a" }}
      >
        {label}
      </p>
    </div>
  );
}
