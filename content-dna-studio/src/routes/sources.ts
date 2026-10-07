import { Hono } from "hono";
import { getDb, parseJson } from "../db.ts";
import { requireUser, type AuthEnv } from "../auth.ts";
import { planFor } from "../plans.ts";
import { loadWorkspace } from "./workspaces.ts";
import { fetchYouTubeTranscript, normalizePastedTranscript, parseYouTubeId, wordCount } from "../transcripts.ts";
import type { SourceMetrics } from "../types.ts";
import type { SourceRow } from "../runs.ts";

export const sourceRoutes = new Hono<AuthEnv>();
sourceRoutes.use("*", requireUser);

const MAX_TRANSCRIPT_CHARS = 2_000_000;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function sanitizeMetrics(input: unknown): SourceMetrics {
  const m = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: SourceMetrics = {};
  const keys: (keyof SourceMetrics)[] = ["views", "likes", "comments", "avg_view_duration_s", "ctr_pct", "subscribers_gained"];
  for (const k of keys) {
    const v = num(m[k]);
    if (v !== null) out[k] = v;
  }
  return out;
}

function present(r: SourceRow, includeTranscript = false) {
  return {
    id: r.id,
    workspace_id: r.workspace_id,
    channel_label: r.channel_label,
    title: r.title,
    url: r.url,
    video_id: r.video_id,
    metrics: parseJson<SourceMetrics>(r.metrics, {}),
    published_at: r.published_at,
    duration_s: r.duration_s,
    word_count: r.word_count,
    created_at: r.created_at,
    ...(includeTranscript ? { transcript: r.transcript } : { transcript_preview: r.transcript.slice(0, 280) }),
  };
}

function ownedSource(id: string, userId: string): SourceRow | null {
  const row = getDb()
    .prepare("SELECT s.* FROM sources s JOIN workspaces w ON w.id = s.workspace_id WHERE s.id = ? AND w.user_id = ?")
    .get(id, userId) as SourceRow | undefined;
  return row ?? null;
}

sourceRoutes.get("/workspaces/:id/sources", (c) => {
  const w = loadWorkspace(c.req.param("id"), c.var.user.id);
  if (!w) return c.json({ error: "Workspace not found." }, 404);
  const rows = getDb().prepare("SELECT * FROM sources WHERE workspace_id = ? ORDER BY created_at DESC").all(w.id) as unknown as SourceRow[];
  return c.json({ sources: rows.map((r) => present(r)) });
});

sourceRoutes.post("/workspaces/:id/sources", async (c) => {
  const user = c.var.user;
  const w = loadWorkspace(c.req.param("id"), user.id);
  if (!w) return c.json({ error: "Workspace not found." }, 404);
  const plan = planFor(user.plan);
  const n = (getDb().prepare("SELECT COUNT(*) AS n FROM sources WHERE workspace_id = ?").get(w.id) as { n: number }).n;
  if (n >= plan.sourcesPerWorkspace) {
    return c.json({ error: `${plan.name} plan allows ${plan.sourcesPerWorkspace} transcripts per workspace. Upgrade to add more.` }, 402);
  }

  const body = await c.req.json().catch(() => ({}));
  const channelLabel = typeof body.channel_label === "string" ? body.channel_label.trim().slice(0, 80) : "";
  let title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  let url: string | null = typeof body.url === "string" ? body.url.trim().slice(0, 500) : null;
  let videoId: string | null = null;
  let transcript = "";
  let durationS: number | null = num(body.duration_s);
  const publishedAt = typeof body.published_at === "string" && body.published_at.trim() ? body.published_at.trim().slice(0, 40) : null;

  if (typeof body.transcript === "string" && body.transcript.trim()) {
    if (body.transcript.length > MAX_TRANSCRIPT_CHARS) return c.json({ error: "Transcript is too large." }, 413);
    transcript = normalizePastedTranscript(body.transcript).text;
    if (url) videoId = parseYouTubeId(url);
    if (!title) return c.json({ error: "Give the transcript a title." }, 400);
  } else if (url) {
    videoId = parseYouTubeId(url);
    if (!videoId) return c.json({ error: "That does not look like a YouTube video URL. Paste the transcript instead." }, 400);
    try {
      const fetched = await fetchYouTubeTranscript(videoId);
      transcript = fetched.text;
      durationS = durationS ?? fetched.durationS;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `Could not fetch captions for that video (${msg}). Open the video, use "Show transcript", copy it, and paste it here instead.` }, 422);
    }
    if (!title) title = `YouTube ${videoId}`;
    url = `https://www.youtube.com/watch?v=${videoId}`;
  } else {
    return c.json({ error: "Provide a YouTube URL or paste a transcript." }, 400);
  }

  if (wordCount(transcript) < 30) return c.json({ error: "That transcript is too short to analyse (under 30 words)." }, 400);

  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO sources (id, workspace_id, channel_label, title, url, video_id, transcript, metrics, published_at, duration_s, word_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, w.id, channelLabel, title, url, videoId, transcript, JSON.stringify(sanitizeMetrics(body.metrics)), publishedAt, durationS, wordCount(transcript));
  return c.json({ source: present(ownedSource(id, user.id)!, true) }, 201);
});

sourceRoutes.get("/sources/:id", (c) => {
  const s = ownedSource(c.req.param("id"), c.var.user.id);
  if (!s) return c.json({ error: "Source not found." }, 404);
  return c.json({ source: present(s, true) });
});

sourceRoutes.patch("/sources/:id", async (c) => {
  const s = ownedSource(c.req.param("id"), c.var.user.id);
  if (!s) return c.json({ error: "Source not found." }, 404);
  const body = await c.req.json().catch(() => ({}));
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 200) : s.title;
  const label = typeof body.channel_label === "string" ? body.channel_label.trim().slice(0, 80) : s.channel_label;
  const metrics = body.metrics !== undefined ? JSON.stringify(sanitizeMetrics(body.metrics)) : s.metrics;
  const publishedAt = typeof body.published_at === "string" ? body.published_at.trim().slice(0, 40) || null : s.published_at;
  getDb().prepare("UPDATE sources SET title = ?, channel_label = ?, metrics = ?, published_at = ? WHERE id = ?").run(title, label, metrics, publishedAt, s.id);
  return c.json({ source: present(ownedSource(s.id, c.var.user.id)!) });
});

sourceRoutes.delete("/sources/:id", (c) => {
  const s = ownedSource(c.req.param("id"), c.var.user.id);
  if (!s) return c.json({ error: "Source not found." }, 404);
  getDb().prepare("DELETE FROM sources WHERE id = ?").run(s.id);
  return c.json({ ok: true });
});
