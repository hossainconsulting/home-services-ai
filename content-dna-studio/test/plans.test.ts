import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, planFor, isPlanId, checkLimit } from "../src/plans.ts";
import { estimateCostUsd } from "../src/pricing.ts";

test("planFor falls back to free", () => {
  assert.equal(planFor(undefined).id, "free");
  assert.equal(planFor("nonsense").id, "free");
  assert.equal(planFor("agency").id, "agency");
  assert.ok(isPlanId("pro") && !isPlanId("gold"));
});

test("plans escalate on every limit", () => {
  const [f, p, a] = [PLANS.free, PLANS.pro, PLANS.agency];
  for (const k of ["workspaces", "sourcesPerWorkspace", "analysesPerMonth", "distributionsPerMonth"] as const) {
    assert.ok(f[k] < p[k] && p[k] < a[k], k);
  }
  assert.equal(f.competitorAnalysis, false);
  assert.equal(p.competitorAnalysis, true);
});

test("checkLimit", () => {
  assert.equal(checkLimit(2, 3, "analyses", PLANS.free).ok, true);
  const r = checkLimit(3, 3, "analyses", PLANS.free);
  assert.equal(r.ok, false);
  assert.match(r.reason!, /Free plan allows 3 analyses/);
});

test("cost estimate applies cache multipliers", () => {
  const cost = estimateCostUsd("claude-opus-5", { input_tokens: 1_000_000, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 });
  assert.equal(cost, 5);
  const cached = estimateCostUsd("claude-opus-5", { input_tokens: 0, output_tokens: 0, cache_read_tokens: 1_000_000, cache_write_tokens: 0 });
  assert.equal(Number(cached.toFixed(4)), 0.5);
  const out = estimateCostUsd("claude-sonnet-5", { input_tokens: 0, output_tokens: 100_000, cache_read_tokens: 0, cache_write_tokens: 0 });
  assert.equal(out, 1);
});
