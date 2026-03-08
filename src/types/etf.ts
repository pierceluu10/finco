export interface CuratedEtf {
  ticker: string;
  name: string;
  provider: string;
  category: string;
  asset_mix: string;
  geographic_exposure: string;
  risk_level: "low" | "moderate" | "high";
  fee_mer: number;
  account_suitability: string[];
  distribution_style: string;
  diversification_style: string;
  description: string;
  suitable_for: string[];
  avoid_if: string[];
  notes: string;
}
