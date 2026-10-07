import { randomBytes } from "node:crypto";

const env = process.env;

function bool(v: string | undefined, dflt: boolean): boolean {
  if (v === undefined || v === "") return dflt;
  return !["0", "false", "off", "no"].includes(v.toLowerCase());
}

const isProd = env.NODE_ENV === "production";
const sessionSecret = env.SESSION_SECRET && env.SESSION_SECRET !== "change-me" ? env.SESSION_SECRET : null;
if (!sessionSecret && isProd) {
  throw new Error("SESSION_SECRET must be set in production");
}

export const config = {
  port: Number(env.PORT ?? 3000),
  isProd,
  dbPath: env.DATABASE_PATH ?? "./data/content-dna.sqlite",
  sessionSecret: sessionSecret ?? randomBytes(32).toString("hex"),
  model: env.CLAUDE_MODEL ?? "claude-opus-5",
  mock: bool(env.CLAUDE_MOCK, false),
  fallbacks: bool(env.CLAUDE_FALLBACKS, true),
  adminEmails: (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  /** Rough context guard. Opus 5 has a 1M window; leave headroom for output. */
  maxCorpusTokens: Number(env.MAX_CORPUS_TOKENS ?? 800_000),
  /** Concurrent Claude runs per user. Protects the bill from a runaway client. */
  maxConcurrentRunsPerUser: Number(env.MAX_CONCURRENT_RUNS ?? 2),
};
