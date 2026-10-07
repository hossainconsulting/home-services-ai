import { test } from "node:test";
import assert from "node:assert/strict";
import { MODULES, MODULE_BY_ID, moduleReadiness } from "../src/prompts/modules.ts";
import { corpusBlock, transcriptBlock, brandBlock, ANALYST_SYSTEM } from "../src/prompts/system.ts";
import { CHANNELS, distributionPrompt, splitByChannel } from "../src/prompts/channels.ts";
import type { SourceForPrompt } from "../src/types.ts";

const src = (n: number, label = "", metrics?: SourceForPrompt["metrics"]): SourceForPrompt => ({
  id: `s${n}`,
  title: `Video ${n}`,
  channel_label: label,
  url: `https://www.youtube.com/watch?v=vid${n}`,
  transcript: `[00:00] words for video ${n}\n[00:30] more words`,
  metrics,
  duration_s: 600,
});

test("eight modules exist in order with instructions", () => {
  assert.equal(MODULES.length, 8);
  assert.deepEqual(MODULES.map((m) => m.order), [1, 2, 3, 4, 5, 6, 7, 8]);
  const sources = [src(1, "A"), src(2, "A"), src(3, "B"), src(4, "B")];
  for (const m of MODULES) {
    const text = m.instructions({ brand: {}, sources });
    assert.ok(text.length > 200, m.id);
    for (const heading of m.sections) assert.ok(text.includes(heading), `${m.id} names heading ${heading}`);
  }
});

test("hook module fills the niche placeholder from the brand", () => {
  const m = MODULE_BY_ID.hook_swipe_file!;
  assert.ok(m.instructions({ brand: {}, sources: [] }).includes("[YOUR NICHE]"));
  const filled = m.instructions({ brand: { niche: "Salesforce for trades" }, sources: [] });
  assert.ok(filled.includes("Salesforce for trades"));
  assert.ok(!filled.includes("[YOUR NICHE]"));
});

test("competitor module names the channel labels and needs two of them", () => {
  const m = MODULE_BY_ID.competitor_gap!;
  const sources = [src(1, "Ali"), src(2, "Ali"), src(3, "Vanessa"), src(4, "Vanessa")];
  const text = m.instructions({ brand: {}, sources });
  assert.ok(text.includes('"Ali"') && text.includes('"Vanessa"'));
  assert.equal(moduleReadiness(m, sources), null);
  assert.match(moduleReadiness(m, [src(1, "Ali"), src(2, "Ali"), src(3, "Ali"), src(4, "Ali")])!, /channel labels/);
  assert.match(moduleReadiness(m, [src(1, "Ali")])!, /at least 4/);
});

test("viral module states when metrics are missing", () => {
  const m = MODULE_BY_ID.viral_patterns!;
  const none = m.instructions({ brand: {}, sources: [src(1), src(2), src(3)] });
  assert.match(none, /No performance metrics were supplied/);
  const some = m.instructions({ brand: {}, sources: [src(1, "", { views: 100 }), src(2), src(3)] });
  assert.match(some, /1 of 3 transcripts carry performance metrics/);
  const all = m.instructions({ brand: {}, sources: [src(1, "", { views: 1 }), src(2, "", { views: 2 }), src(3, "", { likes: 3 })] });
  assert.match(all, /Every transcript carries performance metrics/);
});

test("corpus block wraps each transcript with metadata and metrics", () => {
  const block = transcriptBlock(src(7, "Chan", { views: 12000, likes: 300 }), 0);
  assert.ok(block.startsWith('<transcript id="T1" title="Video 7" channel="Chan"'));
  assert.ok(block.includes('duration="10:00"'));
  assert.ok(block.includes("<metrics>views=12000 likes=300</metrics>"));
  const corpus = corpusBlock([src(1), src(2, "", { views: 5 })]);
  assert.ok(corpus.startsWith('<corpus transcripts="2" with_performance_metrics="1">'));
  assert.ok(corpus.trim().endsWith("</corpus>"));
});

test("system prompt is stable and brand block degrades to a placeholder", () => {
  assert.ok(ANALYST_SYSTEM.includes("Evidence first"));
  assert.match(brandBlock({}), /No brand profile set/);
  assert.match(brandBlock({ niche: "x", platforms: ["youtube", "seo"] }), /Platforms in play: youtube, seo/);
});

test("distribution prompt lists exactly the requested channels and splits back out", () => {
  const picked = CHANNELS.filter((c) => ["linkedin", "seo", "sem"].includes(c.id));
  const prompt = distributionPrompt({ brand: {}, channels: picked, material: "the transcript", sourceLabel: "Vid", materialKind: "transcript" });
  assert.ok(prompt.includes("## LinkedIn") && prompt.includes("## SEO") && prompt.includes("## SEM (Google Ads)"));
  assert.ok(!prompt.includes("## TikTok"));

  const doc = "## LinkedIn\n\nPost body\n\n## SEO\n\nKeyword cluster\n\n### FAQ\n\nq/a\n\n## SEM (Google Ads)\n\nHeadlines";
  const parts = splitByChannel(doc, picked);
  assert.deepEqual(Object.keys(parts), ["linkedin", "seo", "sem"]);
  assert.equal(parts.linkedin, "Post body");
  assert.ok(parts.seo!.includes("### FAQ"));
  assert.equal(parts.sem, "Headlines");
});

test("ten channels cover the requested platforms", () => {
  assert.deepEqual(
    CHANNELS.map((c) => c.id),
    ["facebook", "instagram", "x", "linkedin", "tiktok", "youtube", "gbp", "pinterest", "seo", "sem"],
  );
});
