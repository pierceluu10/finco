"use client";

import { useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { BarChart3, Bot, Compass, Settings, LogOut } from "lucide-react";
import { FincoLogo } from "./logo";
import { formatCurrency } from "@/lib/utils";

interface SidebarProps {
  totalIncome?: number;
  totalExpenses?: number;
  nodeCount?: number;
  flowCount?: number;
}

export function AppSidebar({
  totalIncome = 0,
  totalExpenses = 0,
  nodeCount = 0,
  flowCount = 0,
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
            value="ai"
            className="flex items-center gap-1.5 rounded-t-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition data-[state=active]:text-zinc-200 data-[state=active]:bg-white/5"
          >
            <Bot className="h-3 w-3" />
            AI
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

        {/* AI tab */}
        <Tabs.Content
          value="ai"
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ask the Finco Strategist about your financial map. Get insights,
            warnings, and recommendations.
          </p>
          <textarea
            placeholder="e.g. Can I afford a $500/mo car payment?"
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 resize-none h-20 focus:border-white/20 focus:outline-none focus:ring-0"
          />
          <button className="w-full rounded-lg bg-finco-blue/20 py-2 text-xs font-medium text-finco-blue hover:bg-finco-blue/30 transition">
            Ask Strategist
          </button>
          <p className="text-[10px] text-zinc-600 text-center">
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
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition"
        >
          <LogOut className="h-3 w-3" />
          Sign Out
        </Link>
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
