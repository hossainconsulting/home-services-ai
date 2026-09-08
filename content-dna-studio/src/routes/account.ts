import { Hono } from "hono";
import { getDb, monthStartIso } from "../db.ts";
import { requireUser, isAdmin, getUserByEmail, normalizeEmail, type AuthEnv } from "../auth.ts";
import { PLANS, planFor, isPlanId } from "../plans.ts";
import { monthlyCount } from "../runs.ts";
import { config } from "../config.ts";

export const accountRoutes = new Hono<AuthEnv>();

accountRoutes.get("/plans", (c) => c.json({ plans: Object.values(PLANS) }));

accountRoutes.use("/usage", requireUser);
accountRoutes.get("/usage", (c) => {
  const user = c.var.user;
  const plan = planFor(user.plan);
  const totals = getDb()
    .prepare(
      `SELECT COUNT(*) AS runs, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens,
              COALESCE(SUM(cache_read_tokens),0) AS cache_read_tokens, COALESCE(SUM(cost_usd),0) AS cost_usd
       FROM usage_events WHERE user_id = ? AND created_at >= ?`,
    )
    .get(user.id, monthStartIso()) as Record<string, number>;
  const workspaces = (getDb().prepare("SELECT COUNT(*) AS n FROM workspaces WHERE user_id = ?").get(user.id) as { n: number }).n;
  return c.json({
    plan,
    month_start: monthStartIso(),
    model: config.model,
    mock: config.mock,
    used: {
      workspaces,
      analyses: monthlyCount(user.id, "analyses"),
      distributions: monthlyCount(user.id, "distributions"),
    },
    tokens: totals,
  });
});

accountRoutes.use("/admin/*", requireUser);
accountRoutes.post("/admin/users/plan", async (c) => {
  if (!isAdmin(c.var.user)) return c.json({ error: "Admin only." }, 403);
  const body = await c.req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!email) return c.json({ error: "Valid email required." }, 400);
  if (!isPlanId(body.plan)) return c.json({ error: `Plan must be one of: ${Object.keys(PLANS).join(", ")}.` }, 400);
  const target = getUserByEmail(email);
  if (!target) return c.json({ error: "No user with that email." }, 404);
  getDb().prepare("UPDATE users SET plan = ? WHERE id = ?").run(body.plan, target.id);
  return c.json({ ok: true, email, plan: body.plan });
});
