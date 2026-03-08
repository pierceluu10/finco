"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Save, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { UserProfile } from "@/types/profile";
import {
  AGE_RANGES,
  PROVINCES,
  PAY_FREQUENCIES,
  INCOME_STABILITIES,
  HOUSING_STATUSES,
  RISK_COMFORTS,
  EMPLOYMENT_TYPES,
  HOUSEHOLD_SETUPS,
  INVESTMENT_EXPERIENCES,
  ACCOUNT_TYPE_OPTIONS,
  CONTRIBUTION_PRIORITIES,
} from "@/types/profile";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    currency: "CAD",
    emergency_fund_target_months: 6,
    preferred_account_types: [],
    contribution_priority_order: [],
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data.profile);
      setSaveStatus("saved");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [profile]);

  const update = useCallback(
    (field: string, value: unknown) => {
      setProfile((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const toggleArrayItem = useCallback(
    (field: "preferred_account_types" | "contribution_priority_order", item: string) => {
      setProfile((prev) => {
        const arr = (prev[field] as string[]) ?? [];
        return {
          ...prev,
          [field]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item],
        };
      });
    },
    []
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ecosystem"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Financial Profile</h1>
            <p className="text-xs text-zinc-500">
              This data drives your graph, planning outputs, and agent recommendations.
            </p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saveStatus === "saving"}
          className="flex items-center gap-2 rounded-lg bg-finco-blue px-4 py-2 text-sm font-medium text-black hover:bg-finco-blue/90 transition disabled:opacity-50"
        >
          {saveStatus === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saveStatus === "saved" && <CheckCircle2 className="h-3.5 w-3.5" />}
          {saveStatus === "idle" && <Save className="h-3.5 w-3.5" />}
          {saveStatus === "error" && <Save className="h-3.5 w-3.5" />}
          {saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Retry" : "Save"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Personal Info */}
        <Section title="Personal Info">
          <Field label="First name">
            <TextInput
              value={
                profile.first_name && !profile.first_name.includes("@")
                  ? profile.first_name
                  : ""
              }
              onChange={(v) => update("first_name", v)}
              placeholder="Your first name"
            />
          </Field>
          <Field label="Age range">
            <SelectInput value={profile.age_range ?? ""} onChange={(v) => update("age_range", v || null)} options={AGE_RANGES} />
          </Field>
          <Field label="Province">
            <SelectInput value={profile.province ?? ""} onChange={(v) => update("province", v || null)} options={PROVINCES} />
          </Field>
          <Field label="Employment type">
            <SelectInput value={profile.employment_type ?? ""} onChange={(v) => update("employment_type", v || null)} options={EMPLOYMENT_TYPES} />
          </Field>
          <Field label="Household">
            <SelectInput value={profile.household_setup ?? ""} onChange={(v) => update("household_setup", v || null)} options={HOUSEHOLD_SETUPS} />
          </Field>
        </Section>

        {/* Income */}
        <Section title="Income">
          <Field label="Net monthly income (CAD)">
            <NumberInput value={profile.net_monthly_income ?? null} onChange={(v) => update("net_monthly_income", v)} placeholder="e.g. 5000" />
          </Field>
          <Field label="Pay frequency">
            <SelectInput value={profile.pay_frequency ?? ""} onChange={(v) => update("pay_frequency", v || null)} options={PAY_FREQUENCIES} />
          </Field>
          <Field label="Income stability">
            <SelectInput value={profile.income_stability ?? ""} onChange={(v) => update("income_stability", v || null)} options={INCOME_STABILITIES} />
          </Field>
        </Section>

        {/* Housing */}
        <Section title="Housing">
          <Field label="Housing status">
            <SelectInput value={profile.housing_status ?? ""} onChange={(v) => update("housing_status", v || null)} options={HOUSING_STATUSES} />
          </Field>
          <Field label="Monthly housing cost (CAD)">
            <NumberInput value={profile.monthly_housing_cost ?? null} onChange={(v) => update("monthly_housing_cost", v)} placeholder="Rent or mortgage payment" />
          </Field>
        </Section>

        {/* Debts & Bills */}
        <Section title="Debts & Bills">
          <Field label="Monthly debt payments (CAD)">
            <NumberInput value={profile.monthly_debt_payments ?? null} onChange={(v) => update("monthly_debt_payments", v)} placeholder="Total across all debts" />
          </Field>
          <Field label="Monthly recurring bills (CAD)">
            <NumberInput value={profile.monthly_recurring_bills ?? null} onChange={(v) => update("monthly_recurring_bills", v)} placeholder="Utilities, insurance, etc." />
          </Field>
          <Field label="Monthly subscriptions (CAD)">
            <NumberInput value={profile.monthly_subscriptions ?? null} onChange={(v) => update("monthly_subscriptions", v)} placeholder="Streaming, gym, etc." />
          </Field>
        </Section>

        {/* Savings & Goals */}
        <Section title="Savings & Goals">
          <Field label="Emergency fund target (months)">
            <NumberInput value={profile.emergency_fund_target_months ?? 6} onChange={(v) => update("emergency_fund_target_months", v ?? 6)} placeholder="6" />
          </Field>
          <Field label="Investing goal">
            <TextInput value={profile.investing_goal ?? ""} onChange={(v) => update("investing_goal", v || null)} placeholder="e.g. Retire at 55, save for first home" />
          </Field>
          <Field label="Upcoming large expenses">
            <TextInput value={profile.known_upcoming_large_expenses ?? ""} onChange={(v) => update("known_upcoming_large_expenses", v || null)} placeholder="e.g. Wedding in 2027, car purchase" />
          </Field>
        </Section>

        {/* Investing */}
        <Section title="Investing">
          <Field label="Risk comfort">
            <SelectInput value={profile.risk_comfort ?? ""} onChange={(v) => update("risk_comfort", v || null)} options={RISK_COMFORTS} />
          </Field>
          <Field label="Investment experience">
            <SelectInput value={profile.current_investment_experience ?? ""} onChange={(v) => update("current_investment_experience", v || null)} options={INVESTMENT_EXPERIENCES} />
          </Field>
          <Field label="Preferred account types">
            <ChipSelect
              options={ACCOUNT_TYPE_OPTIONS}
              selected={profile.preferred_account_types ?? []}
              onToggle={(item) => toggleArrayItem("preferred_account_types", item)}
            />
          </Field>
          <Field label="Contribution priority order">
            <ChipSelect
              options={CONTRIBUTION_PRIORITIES}
              selected={profile.contribution_priority_order ?? []}
              onToggle={(item) => toggleArrayItem("contribution_priority_order", item)}
            />
          </Field>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-950/80 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-200">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : parseFloat(v));
      }}
      placeholder={placeholder}
      className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-white/20 focus:outline-none"
    >
      <option value="">Select...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function ChipSelect({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? "border-finco-blue/50 bg-finco-blue/15 text-finco-blue"
                : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
