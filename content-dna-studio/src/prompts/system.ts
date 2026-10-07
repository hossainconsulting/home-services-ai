import type { Brand, SourceForPrompt } from "../types.ts";
import { formatTimestamp } from "../transcripts.ts";

/**
 * Stable system prompt. Byte-identical across every module so the corpus
 * block that follows it caches; anything volatile goes in the user turn.
 */
export const ANALYST_SYSTEM = `You are a senior content strategist and audience researcher. You work from transcripts the way a good analyst works from interview notes: you quote them, you compare them, and you say plainly when the evidence runs out.

Ground rules for every deliverable:
- Evidence first. Every claim about the creator or the audience cites a transcript by title and, where the transcript has timestamps, by timestamp.
- Separate observation from recommendation. Anything the transcripts do not directly support is labelled "Strategic recommendation" or "Strategically inspired" in the text.
- Never invent metrics, quotes, video titles or events. If performance data is absent, say so in one sentence and proceed without it.
- Write in clear, direct prose. Headings, short paragraphs, and tables where they help scanning. Markdown only.
- Match the creator's energy and conviction when drafting copy, but never copy sentences from the transcripts verbatim into new content.
- No manufactured urgency, no exaggerated claims, no fabricated social proof.`;

export function brandBlock(brand: Brand): string {
  const lines: string[] = ["<brand>"];
  const add = (k: string, v: string | undefined) => {
    if (v && v.trim()) lines.push(`${k}: ${v.trim()}`);
  };
  add("Niche", brand.niche);
  add("Audience", brand.audience);
  add("Offer", brand.offer);
  add("Tone of voice", brand.tone);
  add("Primary call to action", brand.cta);
  add("Website", brand.website);
  add("Location", brand.location);
  add("Platforms in play", brand.platforms?.join(", "));
  lines.push("</brand>");
  return lines.length > 2 ? lines.join("\n") : "<brand>No brand profile set. Use [YOUR NICHE] as a placeholder where a niche is needed.</brand>";
}

export function nicheOrPlaceholder(brand: Brand): string {
  return brand.niche?.trim() ? brand.niche.trim() : "[YOUR NICHE]";
}

function metricLine(s: SourceForPrompt): string {
  const m = s.metrics ?? {};
  const parts: string[] = [];
  if (m.views != null) parts.push(`views=${m.views}`);
  if (m.likes != null) parts.push(`likes=${m.likes}`);
  if (m.comments != null) parts.push(`comments=${m.comments}`);
  if (m.avg_view_duration_s != null) parts.push(`avg_view_duration=${formatTimestamp(m.avg_view_duration_s)}`);
  if (m.ctr_pct != null) parts.push(`ctr=${m.ctr_pct}%`);
  if (m.subscribers_gained != null) parts.push(`subscribers_gained=${m.subscribers_gained}`);
  return parts.join(" ");
}

export function hasMetrics(s: SourceForPrompt): boolean {
  const m = s.metrics ?? {};
  return [m.views, m.likes, m.comments, m.avg_view_duration_s, m.ctr_pct, m.subscribers_gained].some((v) => v != null);
}

/** One transcript wrapped in a tag the prompts can address by id. */
export function transcriptBlock(s: SourceForPrompt, index: number): string {
  const attrs = [
    `id="T${index + 1}"`,
    `title=${JSON.stringify(s.title)}`,
    s.channel_label ? `channel=${JSON.stringify(s.channel_label)}` : "",
    s.url ? `url=${JSON.stringify(s.url)}` : "",
    s.published_at ? `published="${s.published_at}"` : "",
    s.duration_s ? `duration="${formatTimestamp(s.duration_s)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const metrics = metricLine(s);
  return `<transcript ${attrs}>${metrics ? `\n<metrics>${metrics}</metrics>` : ""}\n${s.transcript.trim()}\n</transcript>`;
}

export function corpusBlock(sources: SourceForPrompt[]): string {
  const withMetrics = sources.filter(hasMetrics).length;
  const header = `<corpus transcripts="${sources.length}" with_performance_metrics="${withMetrics}">`;
  return [header, ...sources.map(transcriptBlock), "</corpus>"].join("\n\n");
}
