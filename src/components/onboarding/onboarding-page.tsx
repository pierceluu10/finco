"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Target,
  BarChart3,
} from "lucide-react";
import { FincoLogo } from "@/components/shared/logo";
import { FinancialsContent } from "@/components/shared/app-sidebar";
import type {
  FinancialNodeData,
  FinancialFlowData,
  FinancialNodeType,
} from "@/types/graph";
import type { ParsedCsvNode, ParsedCsvEdge } from "@/components/shared/app-sidebar";

const ONBOARDING_STORAGE_KEY = "finco-onboarding-data";

const TYPE_MAP: Record<string, FinancialNodeType> = {
  INCOME: "income",
  EXPENSE: "expense",
  DEBT: "debt",
  SAVINGS: "savings",
};

const GOALS = [
  { id: "spending", label: "Track spending", icon: DollarSign },
  { id: "invest", label: "Grow investments", icon: TrendingUp },
  { id: "save", label: "Build savings", icon: PiggyBank },
  { id: "debt", label: "Pay off debt", icon: CreditCard },
  { id: "budget", label: "Budget better", icon: Target },
  { id: "networth", label: "Track net worth", icon: BarChart3 },
] as const;

const CURRENCIES = ["CAD", "USD", "EUR", "GBP"] as const;

function parseName(fullName: string | undefined): { firstName: string; lastName: string } {
  if (!fullName?.trim()) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function OnboardingPage({
  user,
}: {
  user: { name?: string; email?: string };
}) {
  const router = useRouter();
  const { firstName: initialFirst, lastName: initialLast } = parseName(user.name);

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [goals, setGoals] = useState<Set<string>>(new Set());
  const [currency, setCurrency] = useState<string>("CAD");
  const [onboardingNodes, setOnboardingNodes] = useState<FinancialNodeData[]>([]);
  const [onboardingFlows, setOnboardingFlows] = useState<FinancialFlowData[]>([]);

  const toggleGoal = (id: string) =>
    setGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const onAddNodeDirect = useCallback(
    (
      data: Omit<FinancialNodeData, "id">,
      connections: {
        targetId: string;
        direction: "to" | "from";
        amount: number;
        frequency: FinancialFlowData["frequency"];
      }[]
    ) => {
      const id = `onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const node: FinancialNodeData = { ...data, id };
      setOnboardingNodes((prev) => [...prev, node]);
      const newFlows: FinancialFlowData[] = connections.map((c, i) => ({
        id: `flow-${id}-${c.targetId}-${i}`,
        source: c.direction === "from" ? c.targetId : id,
        target: c.direction === "to" ? c.targetId : id,
        amount: c.amount,
        frequency: c.frequency,
      }));
      if (newFlows.length) setOnboardingFlows((prev) => [...prev, ...newFlows]);
    },
    []
  );

  const onParsedCsvMerge = useCallback(
    (apiNodes: ParsedCsvNode[], apiEdges: ParsedCsvEdge[]): number => {
      const newNodes: FinancialNodeData[] = apiNodes.map((an) => ({
        id: an.id,
        label: an.label,
        type: TYPE_MAP[an.type] ?? "expense",
        currentValue: 0,
        monthlyFlow: an.amount,
        metadata: (an.metadata as Record<string, unknown>) ?? {},
      }));
      const newFlows: FinancialFlowData[] = apiEdges.map((ae) => ({
        id: ae.id,
        source: ae.source,
        target: ae.target,
        amount: ae.amount,
        frequency: ae.frequency ?? "monthly",
      }));
      setOnboardingNodes((prev) => [...prev, ...newNodes]);
      setOnboardingFlows((prev) => [...prev, ...newFlows]);
      return newNodes.length + newFlows.length;
    },
    []
  );

  const handleContinue = useCallback(() => {
    try {
      sessionStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          nodes: onboardingNodes,
          flows: onboardingFlows,
          profile: { firstName, lastName, goals: Array.from(goals), currency },
        })
      );
    } catch {
      /* noop */
    }
    router.push("/ecosystem");
  }, [onboardingNodes, onboardingFlows, firstName, lastName, goals, currency, router]);

  const addedCount = onboardingNodes.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-6">
        <Link href="/">
          <FincoLogo size="sm" />
        </Link>
        <button
          type="button"
          onClick={handleContinue}
          className="font-sans inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#7F7FFA] px-6 font-bold text-black transition-all hover:bg-[#7F7FFA]/90"
          style={{ fontSize: 13 }}
        >
          Continue to Ecosystem
          {addedCount > 0 && (
            <span
              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black/20 px-1.5 tabular-nums"
              style={{ fontSize: 11, fontWeight: 700 }}
            >
              {addedCount}
            </span>
          )}
        </button>
      </header>

      {/* Two-column body */}
      <div className="flex flex-1 min-h-0">
        {/* ── LEFT COLUMN: About You ── */}
        <div className="flex w-1/2 flex-col border-r border-white/5 overflow-y-auto">
          <div className="flex-1 px-8 py-6">
            <h1
              className="font-sans font-extrabold"
              style={{ fontSize: 22, color: "#e8e8ff" }}
            >
              About You
            </h1>
            <p
              className="font-sans mt-1"
              style={{ fontWeight: 500, fontSize: 13, color: "#6b6b9a" }}
            >
              Help us personalize your financial ecosystem.
            </p>

            {/* Name */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <InputField
                id="firstName"
                label="First name"
                value={firstName}
                onChange={setFirstName}
                placeholder="First name"
              />
              <InputField
                id="lastName"
                label="Last name"
                value={lastName}
                onChange={setLastName}
                placeholder="Last name"
              />
            </div>

            {/* Email */}
            <div className="mt-4">
              <InputField
                id="email"
                label="Email"
                value={user.email ?? ""}
                readOnly
                hint="From your account — not editable here."
              />
            </div>

            {/* Currency */}
            <div className="mt-6">
              <p
                className="font-sans mb-2"
                style={{ fontWeight: 700, fontSize: 11, color: "#6b6b9a", textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                Primary Currency
              </p>
              <div className="flex gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className="font-sans rounded-lg px-4 py-2 transition-all"
                    style={{
                      background: currency === c ? "rgba(127,127,250,0.10)" : "#0a0a14",
                      border: currency === c ? "1px solid #7F7FFA" : "1px solid #1a1a2e",
                      fontWeight: 600,
                      fontSize: 13,
                      color: currency === c ? "#7F7FFA" : "#6b6b9a",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Financial Goals */}
            <div className="mt-6">
              <p
                className="font-sans mb-2"
                style={{ fontWeight: 700, fontSize: 11, color: "#6b6b9a", textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                Financial Goals
              </p>
              <p
                className="font-sans mb-3"
                style={{ fontWeight: 500, fontSize: 12, color: "#3a3a5a" }}
              >
                Select all that apply — this helps our AI agents assist you better.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map(({ id, label, icon: Icon }) => {
                  const active = goals.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleGoal(id)}
                      className="font-sans flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left transition-all"
                      style={{
                        background: active ? "rgba(127,127,250,0.08)" : "#0a0a14",
                        border: active ? "1px solid #7F7FFA" : "1px solid #1a1a2e",
                        fontWeight: 600,
                        fontSize: 13,
                        color: active ? "#e8e8ff" : "#6b6b9a",
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: active ? "#7F7FFA" : "#3a3a5a", flexShrink: 0 }}
                      />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick context */}
            <div className="mt-6">
              <p
                className="font-sans mb-2"
                style={{ fontWeight: 700, fontSize: 11, color: "#6b6b9a", textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                How Finco Works
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { num: "1", text: "Add your financial accounts, income and expenses" },
                  { num: "2", text: "See your money as a living, interactive graph" },
                  { num: "3", text: "Get AI insights and run what-if simulations" },
                ].map((step) => (
                  <div
                    key={step.num}
                    className="rounded-lg p-3"
                    style={{ background: "#0a0a14", border: "1px solid #1a1a2e" }}
                  >
                    <span
                      className="font-sans inline-flex h-5 w-5 items-center justify-center rounded-full tabular-nums"
                      style={{
                        background: "rgba(127,127,250,0.12)",
                        color: "#7F7FFA",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {step.num}
                    </span>
                    <p
                      className="font-sans mt-2"
                      style={{ fontWeight: 500, fontSize: 12, color: "#6b6b9a", lineHeight: 1.5 }}
                    >
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Your Financials ── */}
        <div className="flex w-1/2 flex-col overflow-y-auto">
          <div className="flex-1 px-8 py-6">
            <FinancialsContent
              financialNodes={onboardingNodes}
              onAddNodeDirect={onAddNodeDirect}
              onParsedCsvMerge={onParsedCsvMerge}
            />

            {addedCount > 0 && (
              <div
                className="mt-4 rounded-lg p-3 text-center"
                style={{ background: "rgba(127,127,250,0.06)", border: "1px solid rgba(127,127,250,0.15)" }}
              >
                <p className="font-sans" style={{ fontWeight: 600, fontSize: 13, color: "#7F7FFA" }}>
                  {addedCount} {addedCount === 1 ? "node" : "nodes"} added
                </p>
                <p className="font-sans mt-0.5" style={{ fontWeight: 500, fontSize: 11, color: "#6b6b9a" }}>
                  These will appear in your ecosystem graph.
                </p>
              </div>
            )}

            {addedCount === 0 && (
              <div
                className="mt-4 rounded-lg p-3 text-center"
                style={{ background: "#0a0a14", border: "1px solid #1a1a2e" }}
              >
                <p className="font-sans" style={{ fontWeight: 500, fontSize: 12, color: "#3a3a5a" }}>
                  No data added yet — you can always do this later from the sidebar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-sans mb-1.5 block"
        style={{ fontWeight: 600, fontSize: 12, color: "#6b6b9a" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={id === "email" ? "email" : "text"}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`font-sans w-full rounded-lg border bg-[#0a0a14] px-3 py-2.5 outline-none transition placeholder:text-[#3a3a5a] focus:border-[#7F7FFA]/40 ${readOnly ? "cursor-not-allowed opacity-70" : ""}`}
        style={{ borderColor: "#1a1a2e", color: readOnly ? "#6b6b9a" : "#e8e8ff", fontSize: 14 }}
      />
      {hint && (
        <p className="font-sans mt-1" style={{ fontWeight: 500, fontSize: 11, color: "#3a3a5a" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
