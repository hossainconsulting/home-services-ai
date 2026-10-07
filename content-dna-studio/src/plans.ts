export type PlanId = "free" | "pro" | "agency";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  workspaces: number;
  sourcesPerWorkspace: number;
  analysesPerMonth: number;
  distributionsPerMonth: number;
  competitorAnalysis: boolean;
  blurb: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
    workspaces: 1,
    sourcesPerWorkspace: 5,
    analysesPerMonth: 3,
    distributionsPerMonth: 3,
    competitorAnalysis: false,
    blurb: "Try the eight analyses on one channel.",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 49,
    workspaces: 5,
    sourcesPerWorkspace: 100,
    analysesPerMonth: 60,
    distributionsPerMonth: 120,
    competitorAnalysis: true,
    blurb: "One creator, every platform, every week.",
  },
  agency: {
    id: "agency",
    name: "Agency",
    priceMonthlyUsd: 149,
    workspaces: 25,
    sourcesPerWorkspace: 500,
    analysesPerMonth: 300,
    distributionsPerMonth: 600,
    competitorAnalysis: true,
    blurb: "Many clients, competitor mapping, bulk distribution.",
  },
};

export function planFor(id: string | null | undefined): Plan {
  return PLANS[(id ?? "free") as PlanId] ?? PLANS.free;
}

export function isPlanId(id: unknown): id is PlanId {
  return typeof id === "string" && id in PLANS;
}

export interface LimitCheck {
  ok: boolean;
  reason?: string;
}

export function checkLimit(used: number, limit: number, what: string, plan: Plan): LimitCheck {
  if (used < limit) return { ok: true };
  return {
    ok: false,
    reason: `${plan.name} plan allows ${limit} ${what}. Upgrade to continue.`,
  };
}
