import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTimestamp, normalizePastedTranscript, parseYouTubeId, segmentsToTimestampedText, wordCount } from "../src/transcripts.ts";

test("parseYouTubeId handles the common URL shapes", () => {
  const id = "dQw4w9WgXcQ";
  for (const u of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `m.youtube.com/watch?v=${id}`,
    id,
  ]) {
    assert.equal(parseYouTubeId(u), id, u);
  }
  assert.equal(parseYouTubeId("https://vimeo.com/12345"), null);
  assert.equal(parseYouTubeId("https://www.youtube.com/@somechannel"), null);
  assert.equal(parseYouTubeId("not a url"), null);
});

test("formatTimestamp renders mm:ss and h:mm:ss", () => {
  assert.equal(formatTimestamp(0), "00:00");
  assert.equal(formatTimestamp(65), "01:05");
  assert.equal(formatTimestamp(3725), "1:02:05");
});

test("segmentsToTimestampedText buckets captions into windows", () => {
  const segs = [
    { offset: 0, text: "one" },
    { offset: 10, text: "two" },
    { offset: 31, text: "three" },
    { offset: 70, text: "four &amp;#39;quoted&amp;#39;" },
  ];
  const text = segmentsToTimestampedText(segs, 30);
  assert.deepEqual(text.split("\n"), ["[00:00] one two", "[00:31] three", "[01:10] four 'quoted'"]);
});

test("normalizePastedTranscript merges YouTube panel format", () => {
  const raw = "0:00\nHello there\n0:05\nsecond line\n1:02\nlater\n";
  const { text, hadTimestamps } = normalizePastedTranscript(raw);
  assert.equal(hadTimestamps, true);
  assert.match(text, /^\[00:00\] Hello there second line/);
  assert.match(text, /\[01:02\] later/);
});

test("normalizePastedTranscript handles SRT and plain prose", () => {
  const srt = "1\n00:00:01,000 --> 00:00:03,000\nFirst cue\n\n2\n00:00:40,000 --> 00:00:42,000\nSecond cue\n";
  const a = normalizePastedTranscript(srt);
  assert.equal(a.hadTimestamps, true);
  assert.equal(a.text, "[00:01] First cue\n[00:40] Second cue");

  const prose = "Just some words.\n\nAnother   paragraph  here.";
  const b = normalizePastedTranscript(prose);
  assert.equal(b.hadTimestamps, false);
  assert.equal(b.text, "Just some words.\n\nAnother paragraph here.");
});

test("wordCount", () => {
  assert.equal(wordCount("  a b\nc  "), 3);
});
