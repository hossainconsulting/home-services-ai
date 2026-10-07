import type { Brand, Effort, SourceForPrompt } from "../types.ts";
import { hasMetrics, nicheOrPlaceholder } from "./system.ts";

export interface ModuleContext {
  brand: Brand;
  sources: SourceForPrompt[];
}

export interface AnalysisModule {
  id: string;
  order: number;
  name: string;
  tagline: string;
  /** What the run needs before it makes sense. */
  minSources: number;
  /** Competitor gap needs transcripts from at least this many channel labels. */
  minChannels?: number;
  usesMetrics?: boolean;
  effort: Effort;
  /** Headings the mock generator emits; also used by the UI as an outline. */
  sections: string[];
  instructions: (ctx: ModuleContext) => string;
}

function channelLabels(sources: SourceForPrompt[]): string[] {
  return [...new Set(sources.map((s) => s.channel_label.trim()).filter(Boolean))];
}

function metricsNote(sources: SourceForPrompt[]): string {
  const n = sources.filter(hasMetrics).length;
  if (n === 0) {
    return "No performance metrics were supplied with these transcripts. State that clearly at the top of the relevant sections and do not infer which videos performed best.";
  }
  if (n < sources.length) {
    return `${n} of ${sources.length} transcripts carry performance metrics. Rank only among those; list the rest as "unranked, no metrics".`;
  }
  return "Every transcript carries performance metrics in its <metrics> tag. Use them.";
}

export const MODULES: AnalysisModule[] = [
  {
    id: "channel_dna",
    order: 1,
    name: "Channel DNA Extraction",
    tagline: "The three beliefs, the vocabulary, and the feeling the channel leaves behind.",
    minSources: 2,
    effort: "high",
    sections: [
      "Three core principles",
      "Recurring vocabulary and phrases",
      "Metaphors and storytelling patterns",
      "Argument styles",
      "Emotional after-effect on viewers",
      "What makes this creator distinctive",
      "Channel DNA Statement",
    ],
    instructions: () => `Analyse all transcripts in the corpus and uncover the creator's unique content DNA.

Identify:
1. The three core principles or beliefs that consistently shape the channel. For each, cite at least two different transcripts where the belief shows up.
2. The recurring vocabulary, signature phrases, metaphors, storytelling patterns and argument styles the creator relies on. Quote short fragments (under 12 words each) with the transcript title and timestamp.
3. The emotional impact a viewer is left with after watching, and the mechanism that produces it.

Do not summarise videos individually. Compare them collectively to discover what makes this creator's viewpoint, messaging and communication approach distinctive. Support every insight with examples.

End with a concise Channel DNA Statement of no more than 60 words, written so the creator could pin it above their desk.

Use exactly these top-level headings, in this order: "Three core principles", "Recurring vocabulary and phrases", "Metaphors and storytelling patterns", "Argument styles", "Emotional after-effect on viewers", "What makes this creator distinctive", "Channel DNA Statement".`,
  },
  {
    id: "hook_swipe_file",
    order: 2,
    name: "Hook Swipe File",
    tagline: "Every opening hook, classified and turned into 25 reusable templates.",
    minSources: 2,
    effort: "high",
    sections: ["Extracted hooks", "Hook frameworks", "25 adaptable hook templates"],
    instructions: ({ brand }) => `Extract the opening hook from every transcript in the corpus. The hook is the first 15 to 45 seconds, or the first two to four sentences where no timestamps exist.

For each hook:
- Quote it (trimmed to the essential lines) with the transcript title and timestamp.
- Classify its primary mechanism: curiosity gap, controversial opinion, personal experience, surprising insight, warning, challenge, or another mechanism you name explicitly.
- Explain in one or two sentences why it captures attention.
- Strip the topic-specific details and rewrite it as a reusable hook framework with bracketed slots.

Then create 25 adaptable hook templates. For each template give the framework, the mechanism, and one example showing how it could be used for ${nicheOrPlaceholder(brand)}. Mark every template that is strategically inspired rather than directly extracted from a transcript with the label "(strategically inspired)". Templates extracted from the corpus name the transcript they came from.

Use exactly these top-level headings, in this order: "Extracted hooks", "Hook frameworks", "25 adaptable hook templates". Present the 25 templates as a numbered list.`,
  },
  {
    id: "content_pillar_map",
    order: 3,
    name: "Content Pillar Map",
    tagline: "Five pillars the channel owns, and eight gaps it has not explored.",
    minSources: 3,
    effort: "high",
    sections: ["Content pillars", "Unexplored opportunities", "Ranking rationale"],
    instructions: () => `Analyse the transcripts and identify the five strongest content pillars this channel consistently dominates. Do not create a pillar the corpus cannot prove; if fewer than five are supportable, say so and list only the supportable ones.

For each pillar:
- A memorable name.
- The audience pain point, desire or emotional need it addresses, with quoted evidence.
- Up to five existing transcripts that represent the pillar (title and, where useful, timestamp). Never list a transcript that is not in the corpus.

Then identify eight valuable content opportunities the creator has not explored deeply. Each must be traceable to something in the corpus: a question raised and not answered, a topic mentioned in passing, an objection the creator brushed past, a pillar with an obvious missing angle. Cite that trace.

Rank the eight opportunities on audience frustration, urgency, strategic fit and channel alignment, not on curiosity alone. Show the ranking as a table with a 1 to 5 score on each criterion and a total.

Use exactly these top-level headings, in this order: "Content pillars", "Unexplored opportunities", "Ranking rationale".`,
  },
  {
    id: "audience_language",
    order: 4,
    name: "Audience Language Mining",
    tagline: "The exact words the audience uses when stuck, scared, or motivated.",
    minSources: 2,
    effort: "high",
    sections: ["Frustrations", "Desires", "Fears", "Objections", "Questions", "Identity statements", "How to use this"],
    instructions: () => `Treat these transcripts as customer research. Extract the exact language patterns that reveal how the audience thinks: frustrations, goals, fears, objections, questions and identity beliefs.

Audience language comes from three places in a transcript: the creator quoting or paraphrasing viewers, comments the creator reads out, and the creator's own description of what the audience says or feels. Prefer emotionally specific phrases a person would naturally say when stuck, confused or motivated over polished marketing terminology.

Organise findings under: Frustrations, Desires, Fears, Objections, Questions, Identity statements. Under each heading use a table with these columns: "Phrase (verbatim or near-verbatim)", "Source (title, timestamp)", "Deeper emotional need (your interpretation)". Keep the quoted language and your interpretation in separate columns so they are never confused.

Close with a short "How to use this" section: which phrases belong in hooks, which in offers, which in objection handling. That section is interpretation and should say so.`,
  },
  {
    id: "viral_patterns",
    order: 5,
    name: "Viral Pattern Recognition",
    tagline: "What the top ten videos do, minute by minute, that the rest do not.",
    minSources: 3,
    usesMetrics: true,
    effort: "high",
    sections: ["Performance data available", "Top performers, deconstructed", "Repeatable patterns", "How weaker videos differ", "Ten-minute production blueprint"],
    instructions: ({ sources }) => `${metricsNote(sources)}

Using the available performance metrics, identify the ten highest-performing transcripts (or all of them if fewer than ten carry metrics). For each, break down the structure with timestamps whenever the transcript has them:
- Hook length and mechanism
- Opening tension
- Core promise
- Where and how a framework is introduced
- Storytelling placement
- Pattern interruptions
- CTA strategy (placement and wording)
- Final emotional takeaway

Identify the repeatable patterns shared by the top performers and explain how they differ from weaker-performing transcripts in the corpus. Where metrics are missing, this comparison is not possible; say so and instead describe the structural patterns across the whole corpus without claiming they drive performance.

Finish with a practical production blueprint for a ten-minute video, presented as a table of timed sections (for example 0:00 to 0:20) with the job of each section and one line of guidance drawn from the corpus.

Use exactly these top-level headings, in this order: "Performance data available", "Top performers, deconstructed", "Repeatable patterns", "How weaker videos differ", "Ten-minute production blueprint".`,
  },
  {
    id: "content_calendar_90",
    order: 6,
    name: "90-Day Content Calendar",
    tagline: "Thirteen weeks of ideas built on the pillars, hooks and gaps.",
    minSources: 3,
    effort: "high",
    sections: ["Growth path", "Weekly plan", "Short-form series", "Reaction and commentary slots"],
    instructions: ({ brand }) => `Build a 90-day content calendar for this channel${brand.niche ? `, positioned for ${brand.niche.trim()}` : ""}. Base it on the channel's strongest pillars, proven hook patterns, the audience pain points in the transcripts, and the opportunities the creator has not explored. Derive all of those from the corpus yourself within this analysis; do not assume earlier reports exist.

Create one main video idea per week for 13 weeks. Balance long-form videos, short-form series and reaction or commentary formats across the quarter. For each week include:
- Working title
- Opening two-sentence hook
- Main argument
- Audience problem it solves (with the transcript evidence for that problem)
- Belief being challenged
- Content format (long-form, short-form series, reaction/commentary, live, or a combination)
- CTA${brand.cta ? ` (the brand's primary CTA is: ${brand.cta.trim()})` : ""}

Arrange the weeks so they follow a logical growth path: establish authority, then deepen trust, then convert. Explain the path in a short opening section.

Label every idea that is a strategic recommendation rather than directly supported by the source with "(strategic recommendation)" next to the title.

Use exactly these top-level headings, in this order: "Growth path", "Weekly plan", "Short-form series", "Reaction and commentary slots". Present the weekly plan as 13 numbered subsections, "Week 1" through "Week 13".`,
  },
  {
    id: "repurposing_engine",
    order: 7,
    name: "Repurposing Engine",
    tagline: "Five transcripts, each turned into LinkedIn, Facebook, three shorts and an email.",
    minSources: 1,
    effort: "high",
    sections: ["Selection", "Repurposing packages"],
    instructions: () => `Take the five strongest transcripts in the corpus (or all of them if there are fewer than five). Choose them for clarity of argument, quotable insight and audience relevance; state the reason for each pick in one line.

For each chosen transcript build a complete repurposing package:
1. One LinkedIn post under 150 words.
2. One bold Facebook thread opening using a news-style hook (a headline line, then the first paragraph of the thread).
3. Three different 60-second video scripts. Each must contain, labelled inline: Hook, Key insight, Pattern interrupt, Example, CTA. Each script takes a different angle on the transcript.
4. One email subject line under eight words.

Maintain the original creator's energy, clarity and conviction. Do not copy sentences from the transcript. No exaggerated claims, no artificial urgency, no statements the transcript does not support.

Use exactly these top-level headings, in this order: "Selection", "Repurposing packages". Under "Repurposing packages", one subsection per transcript, titled with the transcript title.`,
  },
  {
    id: "competitor_gap",
    order: 8,
    name: "Multi-Source Competitor Gap Analysis",
    tagline: "Table stakes, differentiators, and the problems nobody solves.",
    minSources: 4,
    minChannels: 2,
    effort: "xhigh",
    sections: ["Channels compared", "Table stakes", "Differentiation opportunities", "Unsolved audience problems", "Top ten untapped opportunities"],
    instructions: ({ sources }) => {
      const labels = channelLabels(sources);
      return `The corpus contains transcripts from ${labels.length} channels, identified by the channel attribute: ${labels.map((l) => `"${l}"`).join(", ")}. Treat each channel as a competitor.

Compare them and identify:
1. Table stakes: topics every channel covers, which the audience now treats as basic expectations.
2. Differentiation opportunities: topics where only one channel has strong ownership, and what that ownership looks like.
3. Unsolved audience problems: important problems the transcripts show the audience has that none of the channels properly solves.

Then rank the ten strongest untapped opportunities on urgency, audience demand, relevance, competition level and potential for multiple pieces of content. Show scores in a table.

For each of the ten opportunities provide:
- The audience problem
- Supporting evidence (transcript titles, channel, timestamps)
- Recommended positioning
- Three possible video angles
- A suggested hook

Clearly separate insights supported by source material from strategic recommendations; label the latter "(strategic recommendation)".

Use exactly these top-level headings, in this order: "Channels compared", "Table stakes", "Differentiation opportunities", "Unsolved audience problems", "Top ten untapped opportunities".`;
    },
  },
];

export const MODULE_BY_ID: Record<string, AnalysisModule> = Object.fromEntries(MODULES.map((m) => [m.id, m]));

export interface ReadinessProblem {
  problem: string;
}

/** Explains why a module cannot run on the given sources, or null when it can. */
export function moduleReadiness(mod: AnalysisModule, sources: SourceForPrompt[]): string | null {
  if (sources.length < mod.minSources) {
    return `${mod.name} needs at least ${mod.minSources} transcript${mod.minSources === 1 ? "" : "s"}; ${sources.length} selected.`;
  }
  if (mod.minChannels) {
    const labels = channelLabels(sources);
    if (labels.length < mod.minChannels) {
      return `${mod.name} needs transcripts from at least ${mod.minChannels} different channel labels; found ${labels.length}. Set a channel label on each source.`;
    }
  }
  return null;
}
