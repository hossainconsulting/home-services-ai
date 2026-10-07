import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Point the app at a throwaway SQLite file and mock Claude before any module
 * that reads config is imported. Call at the top of a test file, then
 * dynamically import the app.
 */
export function useTestEnv() {
  const dir = mkdtempSync(join(tmpdir(), "cds-test-"));
  process.env.DATABASE_PATH = join(dir, "test.sqlite");
  process.env.CLAUDE_MOCK = "1";
  process.env.NODE_ENV = "test";
  process.env.ADMIN_EMAILS = "admin@example.com";
  return dir;
}

export const SAMPLE_TRANSCRIPT_A = `0:00
Nobody tells you this about starting a consulting business, and I wish someone had told me.
0:07
Everyone says find your niche. But the niche is not the point. The point is the problem you refuse to leave unsolved.
0:18
When I started, I took every job. Plumbers, dentists, a guy who sold hot tubs. I was exhausted and broke.
0:30
So here is the framework I use now. I call it the three doors. Door one is the problem. Door two is the proof. Door three is the pitch.
0:45
Most people open door three first. That is why nobody answers the phone.
0:55
If you want the checklist, it is linked below. Tell me in the comments which door you keep skipping.`;

export const SAMPLE_TRANSCRIPT_B = `Here is a warning for anyone about to buy a CRM for their trades business.
You are about to pay for seats you will never fill. I have watched this happen twelve times this year.
The pattern is always the same. The owner buys the software, the office manager sets it up, and the technicians never log in.
So before you sign anything, ask one question: who is going to type the job notes at 6pm on a Friday?
If the answer is nobody, the CRM is a very expensive spreadsheet.
Comment below with the tool you regret buying. I read every one.`;

export const SAMPLE_TRANSCRIPT_C = `What if I told you the best marketing for a plumber is a boring photo?
Not a drone shot. Not a logo reveal. A photo of a clean van parked straight, with the number readable.
I ran the numbers on forty local service pages. The ones with plain photos of real people and real vans got more calls.
People are not buying creativity. They are buying the feeling that you will actually turn up.
So this week, take one boring photo. Post it. Then tell me if the phone rang.`;

export async function readSse(res: Response): Promise<{ deltas: string[]; done?: Record<string, unknown>; error?: string }> {
  const text = await res.text();
  const out: { deltas: string[]; done?: Record<string, unknown>; error?: string } = { deltas: [] };
  for (const block of text.split("\n\n")) {
    let event = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!data) continue;
    const payload = JSON.parse(data);
    if (event === "delta") out.deltas.push(payload.text);
    else if (event === "done") out.done = payload;
    else if (event === "error") out.error = payload.message;
  }
  return out;
}
