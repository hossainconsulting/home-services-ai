import { Hono } from "hono";
import { getDb, parseJson } from "../db.ts";
import { requireUser, type AuthEnv } from "../auth.ts";
import { planFor } from "../plans.ts";
import type { Brand } from "../types.ts";
import type { WorkspaceRow } from "../runs.ts";

export const workspaceRoutes = new Hono<AuthEnv>();
workspaceRoutes.use("*", requireUser);

const PLATFORM_IDS = new Set(["facebook", "instagram", "x", "linkedin", "tiktok", "youtube", "gbp", "pinterest", "seo", "sem"]);

export function sanitizeBrand(input: unknown): Brand {
  const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
  const platforms = Array.isArray(b.platforms) ? b.platforms.filter((p): p is string => typeof p === "string" && PLATFORM_IDS.has(p)) : undefined;
  const out: Brand = {};
  const set = (k: keyof Brand, v: string | undefined) => {
    if (v) (out as Record<string, unknown>)[k] = v;
  };
  set("niche", str(b.niche, 200));
  set("audience", str(b.audience));
  set("offer", str(b.offer));
  set("tone", str(b.tone));
  set("cta", str(b.cta, 200));
  set("website", str(b.website, 200));
  set("location", str(b.location, 200));
  if (platforms?.length) out.platforms = platforms;
  return out;
}

export function loadWorkspace(id: string, userId: string): WorkspaceRow | null {
  const row = getDb().prepare("SELECT * FROM workspaces WHERE id = ? AND user_id = ?").get(id, userId) as WorkspaceRow | undefined;
  return row ?? null;
}

function present(w: WorkspaceRow) {
  const counts = getDb()
    .prepare(
      `SELECT (SELECT COUNT(*) FROM sources WHERE workspace_id = ?) AS sources,
              (SELECT COUNT(*) FROM analyses WHERE workspace_id = ? AND status IN ('done','truncated')) AS analyses,
              (SELECT COUNT(*) FROM distributions WHERE workspace_id = ? AND status IN ('done','truncated')) AS distributions`,
    )
    .get(w.id, w.id, w.id) as { sources: number; analyses: number; distributions: number };
  return { id: w.id, name: w.name, brand: parseJson<Brand>(w.brand, {}), created_at: w.created_at, counts };
}

workspaceRoutes.get("/", (c) => {
  const rows = getDb().prepare("SELECT * FROM workspaces WHERE user_id = ? ORDER BY created_at").all(c.var.user.id) as unknown as WorkspaceRow[];
  return c.json({ workspaces: rows.map(present) });
});

workspaceRoutes.post("/", async (c) => {
  const user = c.var.user;
  const plan = planFor(user.plan);
  const body = await c.req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return c.json({ error: "Give the workspace a name." }, 400);
  const n = (getDb().prepare("SELECT COUNT(*) AS n FROM workspaces WHERE user_id = ?").get(user.id) as { n: number }).n;
  if (n >= plan.workspaces) return c.json({ error: `${plan.name} plan allows ${plan.workspaces} workspace${plan.workspaces === 1 ? "" : "s"}. Upgrade to add more.` }, 402);
  const id = crypto.randomUUID();
  getDb().prepare("INSERT INTO workspaces (id, user_id, name, brand) VALUES (?, ?, ?, ?)").run(id, user.id, name, JSON.stringify(sanitizeBrand(body.brand)));
  return c.json({ workspace: present(loadWorkspace(id, user.id)!) }, 201);
});

workspaceRoutes.get("/:id", (c) => {
  const w = loadWorkspace(c.req.param("id"), c.var.user.id);
  if (!w) return c.json({ error: "Workspace not found." }, 404);
  return c.json({ workspace: present(w) });
});

workspaceRoutes.patch("/:id", async (c) => {
  const w = loadWorkspace(c.req.param("id"), c.var.user.id);
  if (!w) return c.json({ error: "Workspace not found." }, 404);
  const body = await c.req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : w.name;
  const brand = body.brand !== undefined ? sanitizeBrand(body.brand) : parseJson<Brand>(w.brand, {});
  getDb().prepare("UPDATE workspaces SET name = ?, brand = ? WHERE id = ?").run(name, JSON.stringify(brand), w.id);
  return c.json({ workspace: present(loadWorkspace(w.id, c.var.user.id)!) });
});

workspaceRoutes.delete("/:id", (c) => {
  const w = loadWorkspace(c.req.param("id"), c.var.user.id);
  if (!w) return c.json({ error: "Workspace not found." }, 404);
  getDb().prepare("DELETE FROM workspaces WHERE id = ?").run(w.id);
  return c.json({ ok: true });
});
