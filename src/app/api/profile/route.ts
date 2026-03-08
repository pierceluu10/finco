import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { resolveUserId } from "@/lib/backboard/threads";
import type { UserProfile } from "@/types/profile";

export async function GET() {
  try {
    const userId = await resolveUserId();
    const supa = getServiceClient();

    const { data, error } = await supa
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    return NextResponse.json({ profile: data as UserProfile | null });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await resolveUserId();
    const body = await req.json();
    const supa = getServiceClient();

    const profileData = {
      user_id: userId,
      first_name:
        body.first_name && typeof body.first_name === "string" && !body.first_name.includes("@")
          ? body.first_name
          : null,
      age_range: body.age_range ?? null,
      province: body.province ?? null,
      currency: body.currency ?? "CAD",
      net_monthly_income: body.net_monthly_income ?? null,
      pay_frequency: body.pay_frequency ?? null,
      income_stability: body.income_stability ?? null,
      housing_status: body.housing_status ?? null,
      monthly_housing_cost: body.monthly_housing_cost ?? null,
      monthly_debt_payments: body.monthly_debt_payments ?? null,
      monthly_recurring_bills: body.monthly_recurring_bills ?? null,
      monthly_subscriptions: body.monthly_subscriptions ?? null,
      emergency_fund_target_months: body.emergency_fund_target_months ?? 6,
      investing_goal: body.investing_goal ?? null,
      risk_comfort: body.risk_comfort ?? null,
      preferred_account_types: body.preferred_account_types ?? [],
      contribution_priority_order: body.contribution_priority_order ?? [],
      employment_type: body.employment_type ?? null,
      household_setup: body.household_setup ?? null,
      known_upcoming_large_expenses: body.known_upcoming_large_expenses ?? null,
      current_investment_experience: body.current_investment_experience ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supa
      .from("user_profiles")
      .upsert(profileData, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      console.error("Profile upsert failed:", error);
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }

    return NextResponse.json({ profile: data as UserProfile });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
