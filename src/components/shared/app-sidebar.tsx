"use client";

import { useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { BarChart3, Bot, Compass, Settings, LogOut, BookOpen } from "lucide-react";
import { FincoLogo } from "./logo";
import { formatCurrency } from "@/lib/utils";

interface SidebarProps {
  totalIncome?: number;
  totalExpenses?: number;
  nodeCount?: number;
  flowCount?: number;
  onOpenLibrarian?: () => void;
}

export function AppSidebar({
  totalIncome = 0,
  totalExpenses = 0,
  nodeCount = 0,
  flowCount = 0,
  onOpenLibrarian,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const netFlow = totalIncome - totalExpenses;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-white/5 bg-zinc-950">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-white/5">
        <Link href="/">
          <FincoLogo size="sm" />
        </Link>
      </div>

      {/* Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <Tabs.List className="flex border-b border-white/5 px-2 pt-2 gap-0.5">
          <Tabs.Trigger
            value="overview"
            className="flex items-center gap-1.5 rounded-t-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition data-[state=active]:text-zinc-200 data-[state=active]:bg-white/5"
          >
            <BarChart3 className="h-3 w-3" />
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger
            value="agents"
            className="flex items-center gap-1.5 rounded-t-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition data-[state=active]:text-zinc-200 data-[state=active]:bg-white/5"
          >
            <Bot className="h-3 w-3" />
            Agents
          </Tabs.Trigger>
          <Tabs.Trigger
            value="explore"
            className="flex items-center gap-1.5 rounded-t-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition data-[state=active]:text-zinc-200 data-[state=active]:bg-white/5"
          >
            <Compass className="h-3 w-3" />
            Explore
          </Tabs.Trigger>
        </Tabs.List>

        {/* Overview tab */}
        <Tabs.Content
          value="overview"
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          <div className="space-y-3">
            <StatRow label="Monthly income" value={formatCurrency(totalIncome)} accent="text-emerald-400" />
            <StatRow label="Monthly expenses" value={formatCurrency(totalExpenses)} accent="text-rose-400" />
            <div className="h-px bg-white/5" />
            <StatRow
              label="Net flow"
              value={`${netFlow >= 0 ? "+" : ""}${formatCurrency(netFlow)}`}
              accent={netFlow >= 0 ? "text-emerald-400" : "text-rose-400"}
            />
          </div>

          <div className="h-px bg-white/5" />

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">
              Graph
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Nodes" value={nodeCount} />
              <MiniStat label="Flows" value={flowCount} />
            </div>
          </div>
        </Tabs.Content>

        {/* Agents tab */}
        <Tabs.Content
          value="agents"
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
            Available Agents
          </p>

          {/* Librarian agent card */}
          <button
            onClick={onOpenLibrarian}
            className="w-full rounded-lg border border-white/5 bg-zinc-900/50 p-3 text-left transition hover:border-finco-blue/20 hover:bg-zinc-900 group"
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-finco-blue/15 group-hover:bg-finco-blue/25 transition">
                <BookOpen className="h-3.5 w-3.5 text-finco-blue" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-200">Librarian</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
                  Ask questions about your financial graph. References your
                  actual nodes, flows, and numbers.
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 pl-[38px]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
              <span className="text-[9px] text-zinc-600">Graph-aware</span>
            </div>
          </button>

          {/* Strategist placeholder */}
          <div className="w-full rounded-lg border border-white/5 bg-zinc-900/30 p-3 opacity-50">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <Bot className="h-3.5 w-3.5 text-zinc-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-400">Strategist</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-600">
                  Scenario planning, forecasts, and what-if simulations.
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 pl-[38px]">
              <span className="text-[9px] text-zinc-700">Coming soon</span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-600 text-center pt-1">
            Powered by Gemini
          </p>
        </Tabs.Content>

        {/* Explore tab */}
        <Tabs.Content
          value="explore"
          className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center"
        >
          <Compass className="h-6 w-6 text-zinc-700 mb-2" />
          <p className="text-xs text-zinc-500">Coming soon</p>
          <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
            Insights, anomaly detection, and goal tracking will appear here.
          </p>
        </Tabs.Content>
      </Tabs.Root>

      {/* Footer */}
      <div className="border-t border-white/5 p-2 space-y-0.5">
        <Link
          href="#"
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition"
        >
          <Settings className="h-3 w-3" />
          Settings
        </Link>
        <a
          href="/auth/logout"
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition"
        >
          <LogOut className="h-3 w-3" />
          Sign Out
        </a>
      </div>
    </aside>
  );
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
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className={`text-xs font-mono ${accent ?? "text-zinc-200"}`}>
        {value}
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-2 text-center">
      <p className="text-sm font-semibold text-zinc-200">{value}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
