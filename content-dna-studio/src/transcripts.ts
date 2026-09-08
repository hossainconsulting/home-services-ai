/**
 * Transcript ingestion: YouTube URL parsing, caption fetch, pasted-text
 * normalisation, and the timestamped format every prompt receives.
 */

export interface TranscriptSegment {
  /** seconds from start */
  offset: number;
  text: string;
}

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"]);

/** Returns the 11-character video id, or null when the string is not a YouTube video URL. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s.includes("://") ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (!YT_HOSTS.has(url.hostname)) return null;
  let id: string | null = null;
  if (url.hostname.endsWith("youtu.be")) {
    id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else {
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    id = m?.[1] ?? null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Collapse caption segments into paragraphs of roughly `windowSeconds`, each
 * prefixed with a timestamp. Keeps the transcript readable and gives the
 * viral-pattern module real timestamps to cite.
 */
export function segmentsToTimestampedText(segments: TranscriptSegment[], windowSeconds = 30): string {
  const lines: string[] = [];
  let bucketStart = -1;
  let bucket: string[] = [];
  for (const seg of segments) {
    const text = decodeEntities(seg.text).replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (bucketStart < 0) bucketStart = seg.offset;
    if (seg.offset - bucketStart >= windowSeconds && bucket.length) {
      lines.push(`[${formatTimestamp(bucketStart)}] ${bucket.join(" ")}`);
      bucket = [];
      bucketStart = seg.offset;
    }
    bucket.push(text);
  }
  if (bucket.length) lines.push(`[${formatTimestamp(bucketStart)}] ${bucket.join(" ")}`);
  return lines.join("\n");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;#39;|&#39;/g, "'")
    .replace(/&amp;quot;|&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/**
 * Accepts what people actually paste: the YouTube transcript panel (a
 * timestamp on its own line followed by the caption), SRT/VTT-ish blocks, or
 * plain prose. Returns timestamped lines when timestamps exist, otherwise
 * tidy paragraphs.
 */
export function normalizePastedTranscript(raw: string): { text: string; hadTimestamps: boolean } {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());
  const tsLine = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,]\d+)?$/;
  const tsPrefix = /^\[?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,]\d+)?\]?\s+(.+)$/;
  const segments: TranscriptSegment[] = [];
  let pending: number | null = null;
  let sawTimestamp = false;

  const toSeconds = (h: string | undefined, m: string, s: string) =>
    (h ? Number(h) * 3600 : 0) + Number(m) * 60 + Number(s);

  for (const line of lines) {
    if (!line) continue;
    if (/^\d+$/.test(line)) continue; // SRT cue numbers
    if (/-->/.test(line)) {
      const m = line.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
      if (m) {
        pending = toSeconds(m[1], m[2]!, m[3]!);
        sawTimestamp = true;
      }
      continue;
    }
    const alone = line.match(tsLine);
    if (alone) {
      pending = toSeconds(alone[1], alone[2]!, alone[3]!);
      sawTimestamp = true;
      continue;
    }
    const prefixed = line.match(tsPrefix);
    if (prefixed) {
      segments.push({ offset: toSeconds(prefixed[1], prefixed[2]!, prefixed[3]!), text: prefixed[4]! });
      sawTimestamp = true;
      pending = null;
      continue;
    }
    if (pending !== null) {
      segments.push({ offset: pending, text: line });
      pending = null;
    } else {
      const last = segments[segments.length - 1];
      if (sawTimestamp && last) last.text += " " + line;
      else segments.push({ offset: -1, text: line });
    }
  }

  if (sawTimestamp) {
    const timed = segments.map((s) => ({ ...s, offset: s.offset < 0 ? 0 : s.offset }));
    return { text: segmentsToTimestampedText(timed), hadTimestamps: true };
  }
  const paragraphs = segments.map((s) => s.text.replace(/\s+/g, " ").trim()).filter(Boolean);
  return { text: paragraphs.join("\n\n"), hadTimestamps: false };
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Cheap token estimate: good enough for a context-window guard. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.6);
}

export interface FetchedTranscript {
  videoId: string;
  text: string;
  durationS: number | null;
  language?: string;
}

/**
 * Fetches captions from YouTube. Uses the unofficial caption endpoint via the
 * youtube-transcript package, so it fails when a video has no captions, is
 * private, or YouTube changes the page. Callers should offer paste as the
 * fallback.
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<FetchedTranscript> {
  const { YoutubeTranscript } = await import("youtube-transcript");
  const raw = await YoutubeTranscript.fetchTranscript(videoId);
  if (!raw.length) throw new Error("YouTube returned an empty transcript.");
  // youtube-transcript 1.x returns milliseconds for srv3 captions and seconds
  // for the classic XML format. No video runs longer than ten hours, so a
  // final offset above 36,000 can only be milliseconds.
  const lastRaw = raw[raw.length - 1]!;
  const scale = Number(lastRaw.offset) > 36_000 ? 1 / 1000 : 1;
  const segments: TranscriptSegment[] = raw.map((r) => ({ offset: (Number(r.offset) || 0) * scale, text: r.text }));
  const durationS = Math.round(((Number(lastRaw.offset) || 0) + (Number(lastRaw.duration) || 0)) * scale);
  return {
    videoId,
    text: segmentsToTimestampedText(segments),
    durationS: durationS > 0 ? durationS : null,
    language: raw[0]?.lang,
  };
}
