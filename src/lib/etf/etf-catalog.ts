/**
 * Curated ETF catalog helpers.
 * All ETF data comes from the static internal dataset — no live market data.
 */

import type { CuratedEtf } from "@/types/etf";
import type { UserProfile } from "@/types/profile";
import type { ReadinessResult } from "@/lib/planner/readiness";
import etfData from "@/data/etfs/canadian-etfs.json";

const catalog: CuratedEtf[] = etfData as CuratedEtf[];

export function getAllEtfs(): CuratedEtf[] {
  return catalog;
}

export function getEtfByTicker(ticker: string): CuratedEtf | undefined {
  return catalog.find((e) => e.ticker.toUpperCase() === ticker.toUpperCase());
}

export function filterEtfsByRisk(riskLevel: string): CuratedEtf[] {
  return catalog.filter((e) => e.risk_level === riskLevel);
}

export function filterEtfsByAccountType(accountType: string): CuratedEtf[] {
  return catalog.filter((e) => e.account_suitability.includes(accountType));
}

export function rankEtfsForProfile(
  profile: UserProfile | null,
  readiness: ReadinessResult
): CuratedEtf[] {
  const riskLevel = profile?.risk_comfort ?? (readiness.isReady ? "moderate" : "low");
  const preferredAccounts = profile?.preferred_account_types ?? [];

  const scored = catalog.map((etf) => {
    let score = 0;

    // Risk match
    if (etf.risk_level === riskLevel) score += 3;
    if (riskLevel === "moderate" && etf.risk_level === "low") score += 1;
    if (riskLevel === "high" && etf.risk_level === "moderate") score += 1;

    // Account match
    if (preferredAccounts.length > 0) {
      const overlap = preferredAccounts.filter((a) => etf.account_suitability.includes(a));
      score += overlap.length;
    }

    // Prefer lower fees
    if (etf.fee_mer <= 0.15) score += 2;
    else if (etf.fee_mer <= 0.25) score += 1;

    // If not ready to invest, prefer cash equivalents
    if (!readiness.isReady && etf.category === "Cash equivalent") score += 3;

    return { etf, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.etf);
}
