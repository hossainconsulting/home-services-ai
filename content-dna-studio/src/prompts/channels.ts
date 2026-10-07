import type { Brand } from "../types.ts";
import { brandBlock } from "./system.ts";

export interface Channel {
  id: string;
  name: string;
  /** Exact heading the model must emit; the UI splits output on it. */
  heading: string;
  group: "social" | "video" | "local" | "search";
  spec: string;
}

export const CHANNELS: Channel[] = [
  {
    id: "facebook",
    name: "Facebook",
    heading: "Facebook",
    group: "social",
    spec: `- One feed post (120 to 200 words) that opens with a news-style hook and ends with a question to drive comments.
- One thread opener for a Facebook group or a long post: a bold headline line, then three short paragraphs, then "Full breakdown in the comments" style continuation.
- Three comment-bait replies the page can post under its own thread to extend it.
- Suggested image or video direction in one line.`,
  },
  {
    id: "instagram",
    name: "Instagram",
    heading: "Instagram",
    group: "social",
    spec: `- A carousel: 7 to 10 slides, each slide as "Slide N: headline / supporting line". Slide 1 is the hook, last slide is the CTA.
- A caption under 150 words with a first line that works when truncated.
- A 30 to 45 second Reel script with Hook, Key insight, Pattern interrupt, Example, CTA labelled inline, plus on-screen text suggestions.
- 15 hashtags in three tiers: 5 broad, 5 niche, 5 branded or long-tail.`,
  },
  {
    id: "x",
    name: "X (Twitter)",
    heading: "X (Twitter)",
    group: "social",
    spec: `- One thread of 8 to 12 posts, numbered, each under 280 characters. Post 1 is the hook; the final post is the CTA and a request to repost.
- Three standalone posts under 280 characters each, each a different angle.
- One quote-post angle: what the account would say when sharing the original video.`,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    heading: "LinkedIn",
    group: "social",
    spec: `- One post under 150 words. First line under 12 words so it survives the "see more" fold. No hashtags in the body; up to 3 at the end.
- One long-form article outline (H1, five to seven H2s, one line under each) for LinkedIn Articles or a newsletter.
- Two comment prompts the author can drop on other people's posts to seed the topic.`,
  },
  {
    id: "tiktok",
    name: "TikTok",
    heading: "TikTok",
    group: "video",
    spec: `- Three 60-second scripts, each a different angle, each with Hook (first 3 seconds, written as spoken), Key insight, Pattern interrupt, Example, CTA labelled inline. Include on-screen text for the first frame.
- One green-screen or duet/stitch angle that reacts to a common claim in the niche.
- Five caption options under 100 characters and 5 hashtags.`,
  },
  {
    id: "youtube",
    name: "YouTube",
    heading: "YouTube",
    group: "video",
    spec: `- Five title options under 60 characters, each using a different hook mechanism, mechanism named in brackets.
- A description: first two lines as the pitch, then a chapter list with timestamps derived from the transcript where available, then a links block placeholder.
- 15 tags.
- One Community post (poll or question) to run the day before publishing.
- One Shorts script (under 45 seconds) cut from the strongest moment, citing the timestamp it comes from.`,
  },
  {
    id: "gbp",
    name: "Google Business Profile",
    heading: "Google Business Profile",
    group: "local",
    spec: `- One "Update" post under 1,500 characters, plain language, one CTA button suggestion (Learn more, Call now, Book, Sign up).
- One "Offer" or "Event" post idea if the content supports one; otherwise say "no offer is supported by this content".
- Three Q&A entries (question and answer) the business can pre-seed on its profile.
- Two review-response templates that reference the topic naturally.`,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    heading: "Pinterest",
    group: "social",
    spec: `- Five pin titles under 100 characters, keyword-first.
- Five pin descriptions under 500 characters with natural keyword use and one CTA.
- Suggested board names (3) and the one board this pin belongs on.
- One Idea Pin storyboard: 5 pages, each with headline and one line of body text.`,
  },
  {
    id: "seo",
    name: "SEO",
    heading: "SEO",
    group: "search",
    spec: `- Primary keyword and a cluster of 8 to 12 secondary and long-tail keywords, with the search intent of each (informational, commercial, transactional, navigational).
- Blog article brief: H1, meta title under 60 characters, meta description under 155 characters, URL slug, and an H2/H3 outline with the point each section makes and which transcript moment supports it.
- Five FAQ pairs suitable for FAQ schema, written to answer the question directly in the first sentence.
- Internal linking suggestions: three related topics from the corpus that this article should link to.`,
  },
  {
    id: "sem",
    name: "SEM (Google Ads)",
    heading: "SEM (Google Ads)",
    group: "search",
    spec: `- Responsive Search Ad: 15 headlines, each 30 characters or fewer; 4 descriptions, each 90 characters or fewer. Show the character count next to each.
- Keyword list: 10 keywords with a suggested match type each (exact, phrase, broad) and 8 negative keywords.
- Landing page brief: the one promise the page makes, the proof it needs, the form or CTA, and three objections the page must answer (drawn from audience language in the transcript).
- Two ad extension ideas (sitelinks, callouts, structured snippets).
- Do not invent prices, discounts or guarantees.`,
  },
];

export const CHANNEL_BY_ID: Record<string, Channel> = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));

export interface DistributionInput {
  brand: Brand;
  channels: Channel[];
  /** Human label for what is being repurposed. */
  sourceLabel: string;
  /** The transcript or analysis text being repurposed. */
  material: string;
  materialKind: "transcript" | "analysis";
}

export const DISTRIBUTION_SYSTEM = `You are a multi-platform content producer working for a personal brand. You turn one strong piece of source material into platform-native content, each piece written the way a top creator on that platform would actually post it.

Ground rules:
- Preserve the creator's energy, clarity and conviction. Do not copy sentences verbatim from the source material.
- Every claim traces to the source material. No invented statistics, prices, testimonials or guarantees. No artificial urgency.
- Respect every length and count limit in the channel specification exactly. Where a limit is in characters, count carefully and stay under it.
- Write for the platform. A LinkedIn post is not a TikTok script with line breaks.
- Output Markdown. Use the channel headings exactly as given, as level-2 headings, in the order given, and nothing before the first heading.`;

export function distributionPrompt(input: DistributionInput): string {
  const channelSpecs = input.channels
    .map((c) => `## ${c.heading}\n${c.spec}`)
    .join("\n\n");
  return `${brandBlock(input.brand)}

<source kind="${input.materialKind}" label=${JSON.stringify(input.sourceLabel)}>
${input.material.trim()}
</source>

Produce a distribution package for the channels below. For each channel, emit a level-2 heading with the exact channel name, then the deliverables listed. Do not add channels that are not listed. Do not add an introduction or a closing note.

<channel_specifications>
${channelSpecs}
</channel_specifications>`;
}

/** Splits a distribution document into per-channel Markdown by its level-2 headings. */
export function splitByChannel(markdown: string, channels: Channel[]): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = markdown.split("\n");
  let current: Channel | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (current) out[current.id] = buf.join("\n").trim();
    buf = [];
  };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      const heading = m[1]!.trim().toLowerCase();
      const match = channels.find((c) => c.heading.toLowerCase() === heading || c.name.toLowerCase() === heading);
      if (match) {
        flush();
        current = match;
        continue;
      }
    }
    buf.push(line);
  }
  flush();
  return out;
}
