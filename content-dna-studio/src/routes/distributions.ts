import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getDb, parseJson } from "../db.ts";
import { requireUser, type AuthEnv } from "../auth.ts";
import { loadWorkspace } from "./workspaces.ts";
import { CHANNELS, CHANNEL_BY_ID, splitByChannel, type Channel } from "../prompts/channels.ts";
import { prepareDistribution, runDistribution, RunRequestError } from "../runs.ts";
import { ClaudeRunError } from "../claude.ts";

export const distributionRoutes = new Hono<AuthEnv>();

distributionRoutes.get("/channels", (c) =>
  c.json({ channels: CHANNELS.map((ch) => ({ id: ch.id, name: ch.name, group: ch.group, spec: ch.spec })) }),
);

distributionRoutes.use("/workspaces/*", requireUser);
distributionRoutes.use("/distributions/*", requireUser);

interface DistributionRow {
  id: string;
  workspace_id: string;
  source_id: string | null;
  analysis_id: string | null;
  channels: string;
  status: string;
  output: string;
  error: string | null;
  usage: string;
  model: string | null;
  created_at: string;
  completed_at: string | null;
}

function present(r: DistributionRow, full: boolean) {
  const ids = parseJson<string[]>(r.channels, []);
  const channels = ids.map((id) => CHANNEL_BY_ID[id]).filter((c): c is Channel => Boolean(c));
  return {
    id: r.id,
    workspace_id: r.workspace_id,
    source_id: r.source_id,
    analysis_id: r.analysis_id,
    channels: ids,
    status: r.status,
    error: r.error,
    usage: parseJson(r.usage, {}),
    model: r.model,
    created_at: r.created_at,
    completed_at: r.completed_at,
    ...(full ? { output: r.output, by_channel: splitByChannel(r.output, channels) } : { output_chars: r.output.length }),
  };
}

function owned(id: string, userId: string): DistributionRow | null {
  const row = getDb()
    .prepare("SELECT d.* FROM distributions d JOIN workspaces w ON w.id = d.workspace_id WHERE d.id = ? AND w.user_id = ?")
    .get(id, userId) as DistributionRow | undefined;
  return row ?? null;
}

distributionRoutes.get("/workspaces/:id/distributions", (c) => {
  const w = loadWorkspace(c.req.param("id"), c.var.user.id);
  if (!w) return c.json({ error: "Workspace not found." }, 404);
  const rows = getDb().prepare("SELECT * FROM distributions WHERE workspace_id = ? ORDER BY created_at DESC").all(w.id) as unknown as DistributionRow[];
  return c.json({ distributions: rows.map((r) => present(r, false)) });
});

distributionRoutes.post("/workspaces/:id/distributions", async (c) => {
  const user = c.var.user;
  const w = loadWorkspace(c.req.param("id"), user.id);
  if (!w) return c.json({ error: "Workspace not found." }, 404);
  const body = await c.req.json().catch(() => ({}));
  const input = {
    user,
    workspace: w,
    sourceId: typeof body.source_id === "string" ? body.source_id : undefined,
    analysisId: typeof body.analysis_id === "string" ? body.analysis_id : undefined,
    channelIds: Array.isArray(body.channels) ? body.channels.filter((s: unknown): s is string => typeof s === "string") : [],
  };
  try {
    prepareDistribution(input);
  } catch (err) {
    if (err instanceof RunRequestError) return c.json({ error: err.message }, err.status as 400);
    throw err;
  }

  return streamSSE(c, async (stream) => {
    const controller = new AbortController();
    stream.onAbort(() => controller.abort());
    const send = (event: string, data: unknown) => stream.writeSSE({ event, data: JSON.stringify(data) });
    try {
      const done = await runDistribution(input, {
        signal: controller.signal,
        onText: (delta) => void send("delta", { text: delta }),
      });
      await send("done", done);
    } catch (err) {
      const message = err instanceof RunRequestError || err instanceof ClaudeRunError ? err.message : "Distribution failed.";
      if (!(err instanceof RunRequestError) && !(err instanceof ClaudeRunError)) console.error(err);
      await send("error", { message });
    }
  });
});

distributionRoutes.get("/distributions/:id", (c) => {
  const d = owned(c.req.param("id"), c.var.user.id);
  if (!d) return c.json({ error: "Distribution not found." }, 404);
  return c.json({ distribution: present(d, true) });
});

distributionRoutes.get("/distributions/:id/markdown", (c) => {
  const d = owned(c.req.param("id"), c.var.user.id);
  if (!d) return c.json({ error: "Distribution not found." }, 404);
  c.header("Content-Type", "text/markdown; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="distribution-${d.id.slice(0, 8)}.md"`);
  return c.body(d.output);
});

distributionRoutes.delete("/distributions/:id", (c) => {
  const d = owned(c.req.param("id"), c.var.user.id);
  if (!d) return c.json({ error: "Distribution not found." }, 404);
  getDb().prepare("DELETE FROM distributions WHERE id = ?").run(d.id);
  return c.json({ ok: true });
});
