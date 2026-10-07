/**
 * Runs analyses and distributions: quota checks, prompt assembly, streaming
 * to the client, persistence and usage metering. Routes stay thin.
 */
import { getDb, monthStartIso, nowIso, parseJson } from "./db.ts";
import { config } from "./config.ts";
import { planFor, type Plan } from "./plans.ts";
import type { User } from "./auth.ts";
import type { Brand, SourceForPrompt } from "./types.ts";
import { MODULE_BY_ID, moduleReadiness, type AnalysisModule } from "./prompts/modules.ts";
import { ANALYST_SYSTEM, brandBlock, corpusBlock } from "./prompts/system.ts";
import { CHANNEL_BY_ID, DISTRIBUTION_SYSTEM, distributionPrompt, type Channel } from "./prompts/channels.ts";
import { ClaudeRunError, runClaude, type RunResult } from "./claude.ts";
import { estimateCostUsd } from "./pricing.ts";
import { estimateTokens } from "./transcripts.ts";

export class RunRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export interface WorkspaceRow {
  id: string;
  user_id: string;
  name: string;
  brand: string;
  created_at: string;
}

export interface SourceRow {
  id: string;
  workspace_id: string;
  channel_label: string;
  title: string;
  url: string | null;
  video_id: string | null;
  transcript: string;
  metrics: string;
  published_at: string | null;
  duration_s: number | null;
  word_count: number;
  created_at: string;
}

export function loadSources(workspaceId: string, ids?: string[]): SourceForPrompt[] {
  const db = getDb();
  let rows: SourceRow[];
  if (ids && ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    rows = db
      .prepare(`SELECT * FROM sources WHERE workspace_id = ? AND id IN (${placeholders}) ORDER BY created_at`)
      .all(workspaceId, ...ids) as unknown as SourceRow[];
  } else {
    rows = db.prepare("SELECT * FROM sources WHERE workspace_id = ? ORDER BY created_at").all(workspaceId) as unknown as SourceRow[];
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    channel_label: r.channel_label,
    url: r.url,
    transcript: r.transcript,
    metrics: parseJson(r.metrics, {}),
    published_at: r.published_at,
    duration_s: r.duration_s,
  }));
}

export function monthlyCount(userId: string, table: "analyses" | "distributions"): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM ${table} a JOIN workspaces w ON w.id = a.workspace_id
       WHERE w.user_id = ? AND a.created_at >= ? AND a.status != 'error'`,
    )
    .get(userId, monthStartIso()) as { n: number };
  return row.n;
}

const running = new Map<string, number>();
function acquireSlot(userId: string) {
  const n = running.get(userId) ?? 0;
  if (n >= config.maxConcurrentRunsPerUser) {
    throw new RunRequestError(`You already have ${n} runs in progress. Wait for one to finish.`, 429);
  }
  running.set(userId, n + 1);
}
function releaseSlot(userId: string) {
  const n = (running.get(userId) ?? 1) - 1;
  if (n <= 0) running.delete(userId);
  else running.set(userId, n);
}

function guardCorpusSize(text: string) {
  const est = estimateTokens(text);
  if (est > config.maxCorpusTokens) {
    throw new RunRequestError(
      `Selected transcripts are about ${Math.round(est / 1000)}k tokens, above the ${Math.round(config.maxCorpusTokens / 1000)}k limit for one run. Select fewer transcripts.`,
      413,
    );
  }
}

function recordUsage(user: User, workspaceId: string, kind: string, refId: string, result: RunResult) {
  const model = result.model.replace(" (mock)", "");
  const cost = config.mock ? 0 : estimateCostUsd(model, result.usage);
  getDb()
    .prepare(
      `INSERT INTO usage_events (id, user_id, workspace_id, kind, ref_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      user.id,
      workspaceId,
      kind,
      refId,
      result.model,
      result.usage.input_tokens,
      result.usage.output_tokens,
      result.usage.cache_read_tokens,
      result.usage.cache_write_tokens,
      cost,
    );
  return cost;
}

export interface StreamSink {
  onText: (delta: string) => void;
  signal?: AbortSignal;
}

export interface AnalysisRunInput {
  user: User;
  workspace: WorkspaceRow;
  moduleId: string;
  sourceIds?: string[];
}

export function prepareAnalysis(input: AnalysisRunInput): { module: AnalysisModule; sources: SourceForPrompt[]; plan: Plan } {
  const mod = MODULE_BY_ID[input.moduleId];
  if (!mod) throw new RunRequestError(`Unknown module "${input.moduleId}".`, 400);
  const plan = planFor(input.user.plan);
  if (mod.minChannels && !plan.competitorAnalysis) {
    throw new RunRequestError(`${mod.name} is available on Pro and Agency plans.`, 402);
  }
  const used = monthlyCount(input.user.id, "analyses");
  if (used >= plan.analysesPerMonth) {
    throw new RunRequestError(`${plan.name} plan allows ${plan.analysesPerMonth} analyses per month. Upgrade to continue.`, 402);
  }
  const sources = loadSources(input.workspace.id, input.sourceIds);
  const problem = moduleReadiness(mod, sources);
  if (problem) throw new RunRequestError(problem, 400);
  return { module: mod, sources, plan };
}

export async function runAnalysis(input: AnalysisRunInput, sink: StreamSink): Promise<{ id: string; status: string; error?: string }> {
  const { module: mod, sources } = prepareAnalysis(input);
  const brand = parseJson<Brand>(input.workspace.brand, {});
  const corpus = corpusBlock(sources);
  guardCorpusSize(corpus);

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO analyses (id, workspace_id, module, status, input, model) VALUES (?, ?, ?, 'running', ?, ?)").run(
    id,
    input.workspace.id,
    mod.id,
    JSON.stringify({ source_ids: sources.map((s) => s.id), source_titles: sources.map((s) => s.title) }),
    config.model,
  );

  acquireSlot(input.user.id);
  let text = "";
  try {
    const result = await runClaude({
      system: ANALYST_SYSTEM,
      cachedContext: corpus,
      user: `${brandBlock(brand)}\n\n<task module="${mod.id}">\n${mod.instructions({ brand, sources })}\n</task>`,
      effort: mod.effort,
      signal: sink.signal,
      onText: (d) => {
        text += d;
        sink.onText(d);
      },
      mockSections: mod.sections,
      mockTitle: mod.name,
    });
    return finishRun(db, "analyses", id, input, "analysis", result);
  } catch (err) {
    failRun(db, "analyses", id, text, err);
    throw err;
  } finally {
    releaseSlot(input.user.id);
  }
}

export interface DistributionRunInput {
  user: User;
  workspace: WorkspaceRow;
  sourceId?: string;
  analysisId?: string;
  channelIds: string[];
}

export function prepareDistribution(input: DistributionRunInput): { channels: Channel[]; material: string; label: string; kind: "transcript" | "analysis" } {
  const plan = planFor(input.user.plan);
  const used = monthlyCount(input.user.id, "distributions");
  if (used >= plan.distributionsPerMonth) {
    throw new RunRequestError(`${plan.name} plan allows ${plan.distributionsPerMonth} distribution packages per month. Upgrade to continue.`, 402);
  }
  const channels = input.channelIds.map((c) => CHANNEL_BY_ID[c]).filter((c): c is Channel => Boolean(c));
  if (!channels.length) throw new RunRequestError("Pick at least one channel.", 400);
  if (channels.length !== input.channelIds.length) throw new RunRequestError("One or more channel ids are unknown.", 400);

  const db = getDb();
  if (input.sourceId) {
    const src = db.prepare("SELECT * FROM sources WHERE id = ? AND workspace_id = ?").get(input.sourceId, input.workspace.id) as SourceRow | undefined;
    if (!src) throw new RunRequestError("Source not found.", 404);
    return { channels, material: src.transcript, label: src.title, kind: "transcript" };
  }
  if (input.analysisId) {
    const an = db
      .prepare("SELECT id, module, output, status FROM analyses WHERE id = ? AND workspace_id = ?")
      .get(input.analysisId, input.workspace.id) as { id: string; module: string; output: string; status: string } | undefined;
    if (!an) throw new RunRequestError("Analysis not found.", 404);
    if (an.status !== "done" || !an.output.trim()) throw new RunRequestError("That analysis has no finished output to repurpose.", 400);
    const modName = MODULE_BY_ID[an.module]?.name ?? an.module;
    return { channels, material: an.output, label: modName, kind: "analysis" };
  }
  throw new RunRequestError("Provide a source_id or an analysis_id.", 400);
}

export async function runDistribution(input: DistributionRunInput, sink: StreamSink): Promise<{ id: string; status: string; error?: string }> {
  const { channels, material, label, kind } = prepareDistribution(input);
  const brand = parseJson<Brand>(input.workspace.brand, {});
  guardCorpusSize(material);

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO distributions (id, workspace_id, source_id, analysis_id, channels, status, model) VALUES (?, ?, ?, ?, ?, 'running', ?)",
  ).run(id, input.workspace.id, input.sourceId ?? null, input.analysisId ?? null, JSON.stringify(channels.map((c) => c.id)), config.model);

  acquireSlot(input.user.id);
  let text = "";
  try {
    const result = await runClaude({
      system: DISTRIBUTION_SYSTEM,
      user: distributionPrompt({ brand, channels, material, sourceLabel: label, materialKind: kind }),
      effort: "medium",
      maxTokens: 32_000,
      signal: sink.signal,
      onText: (d) => {
        text += d;
        sink.onText(d);
      },
      mockSections: channels.map((c) => c.heading),
      mockTitle: `Distribution: ${label}`,
    });
    return finishRun(db, "distributions", id, input, "distribution", result);
  } catch (err) {
    failRun(db, "distributions", id, text, err);
    throw err;
  } finally {
    releaseSlot(input.user.id);
  }
}

function finishRun(
  db: ReturnType<typeof getDb>,
  table: "analyses" | "distributions",
  id: string,
  input: { user: User; workspace: WorkspaceRow },
  kind: string,
  result: RunResult,
) {
  const cost = recordUsage(input.user, input.workspace.id, kind, id, result);
  const usage = { ...result.usage, cost_usd: cost, stop_reason: result.stopReason };
  let status = "done";
  let error: string | null = null;
  if (result.refusal) {
    status = "refused";
    error = `The model declined this request${result.refusal.category ? ` (${result.refusal.category})` : ""}. ${result.refusal.explanation ?? ""}`.trim();
  } else if (result.stopReason === "max_tokens") {
    status = "truncated";
    error = "Output hit the length limit. The document below may end early.";
  }
  db.prepare(`UPDATE ${table} SET status = ?, output = ?, error = ?, usage = ?, model = ?, completed_at = ? WHERE id = ?`).run(
    status,
    result.text,
    error,
    JSON.stringify(usage),
    result.model,
    nowIso(),
    id,
  );
  return { id, status, error: error ?? undefined };
}

function failRun(db: ReturnType<typeof getDb>, table: "analyses" | "distributions", id: string, partial: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const status = err instanceof ClaudeRunError && err.kind === "aborted" ? "cancelled" : "error";
  db.prepare(`UPDATE ${table} SET status = ?, output = ?, error = ?, completed_at = ? WHERE id = ?`).run(status, partial, message, nowIso(), id);
}
