import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getDb, parseJson } from "../db.ts";
import { requireUser, type AuthEnv } from "../auth.ts";
import { loadWorkspace } from "./workspaces.ts";
import { MODULES, MODULE_BY_ID } from "../prompts/modules.ts";
import { runAnalysis, RunRequestError, prepareAnalysis } from "../runs.ts";
import { ClaudeRunError } from "../claude.ts";

export const analysisRoutes = new Hono<AuthEnv>();

analysisRoutes.get("/modules", (c) =>
  c.json({
    modules: MODULES.map((m) => ({
      id: m.id,
      order: m.order,
      name: m.name,
      tagline: m.tagline,
      min_sources: m.minSources,
      min_channels: m.minChannels ?? null,
      uses_metrics: Boolean(m.usesMetrics),
      sections: m.sections,
    })),
  }),
);

analysisRoutes.use("/workspaces/*", requireUser);
analysisRoutes.use("/analyses/*", requireUser);

interface AnalysisRow {
  id: string;
  workspace_id: string;
  module: string;
  status: string;
  input: string;
  output: string;
  error: string | null;
  usage: string;
  model: string | null;
  created_at: string;
  completed_at: string | null;
}

function present(r: AnalysisRow, full: boolean) {
  const mod = MODULE_BY_ID[r.module];
  return {
    id: r.id,
    workspace_id: r.workspace_id,
    module: r.module,
    module_name: mod?.name ?? r.module,
    status: r.status,
    input: parseJson(r.input, {}),
    error: r.error,
    usage: parseJson(r.usage, {}),
    model: r.model,
    created_at: r.created_at,
    completed_at: r.completed_at,
    ...(full ? { output: r.output } : { output_chars: r.output.length }),
  };
}

function ownedAnalysis(id: string, userId: string): AnalysisRow | null {
  const row = getDb()
    .prepare("SELECT a.* FROM analyses a JOIN workspaces w ON w.id = a.workspace_id WHERE a.id = ? AND w.user_id = ?")
    .get(id, userId) as AnalysisRow | undefined;
  return row ?? null;
}

analysisRoutes.get("/workspaces/:id/analyses", (c) => {
  const w = loadWorkspace(c.req.param("id"), c.var.user.id);
  if (!w) return c.json({ error: "Workspace not found." }, 404);
  const rows = getDb().prepare("SELECT * FROM analyses WHERE workspace_id = ? ORDER BY created_at DESC").all(w.id) as unknown as AnalysisRow[];
  return c.json({ analyses: rows.map((r) => present(r, false)) });
});

/**
 * Streams the analysis as server-sent events:
 *   event: start  data: {"id": ...}
 *   event: delta  data: {"text": "..."}
 *   event: done   data: {"id", "status", "error"?}
 *   event: error  data: {"message": "..."}
 */
analysisRoutes.post("/workspaces/:id/analyses", async (c) => {
  const user = c.var.user;
  const w = loadWorkspace(c.req.param("id"), user.id);
  if (!w) return c.json({ error: "Workspace not found." }, 404);
  const body = await c.req.json().catch(() => ({}));
  const moduleId = typeof body.module === "string" ? body.module : "";
  const sourceIds = Array.isArray(body.source_ids) ? body.source_ids.filter((s: unknown): s is string => typeof s === "string") : undefined;
  const input = { user, workspace: w, moduleId, sourceIds };

  // Validate before opening the stream so the client gets a proper status code.
  try {
    prepareAnalysis(input);
  } catch (err) {
    if (err instanceof RunRequestError) return c.json({ error: err.message }, err.status as 400);
    throw err;
  }

  return streamSSE(c, async (stream) => {
    const controller = new AbortController();
    stream.onAbort(() => controller.abort());
    const send = (event: string, data: unknown) => stream.writeSSE({ event, data: JSON.stringify(data) });
    try {
      const done = await runAnalysis(input, {
        signal: controller.signal,
        onText: (delta) => void send("delta", { text: delta }),
      });
      await send("done", done);
    } catch (err) {
      const message = err instanceof RunRequestError || err instanceof ClaudeRunError ? err.message : "Analysis failed.";
      if (!(err instanceof RunRequestError) && !(err instanceof ClaudeRunError)) console.error(err);
      await send("error", { message });
    }
  });
});

analysisRoutes.get("/analyses/:id", (c) => {
  const a = ownedAnalysis(c.req.param("id"), c.var.user.id);
  if (!a) return c.json({ error: "Analysis not found." }, 404);
  return c.json({ analysis: present(a, true) });
});

analysisRoutes.get("/analyses/:id/markdown", (c) => {
  const a = ownedAnalysis(c.req.param("id"), c.var.user.id);
  if (!a) return c.json({ error: "Analysis not found." }, 404);
  const name = (MODULE_BY_ID[a.module]?.name ?? a.module).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  c.header("Content-Type", "text/markdown; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${name}-${a.id.slice(0, 8)}.md"`);
  return c.body(a.output);
});

analysisRoutes.delete("/analyses/:id", (c) => {
  const a = ownedAnalysis(c.req.param("id"), c.var.user.id);
  if (!a) return c.json({ error: "Analysis not found." }, 404);
  getDb().prepare("DELETE FROM analyses WHERE id = ?").run(a.id);
  return c.json({ ok: true });
});
