import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.ts";
import type { Effort } from "./types.ts";
import type { TokenUsage } from "./pricing.ts";

export interface RunRequest {
  /** Stable text; cached across runs. */
  system: string;
  /** Large stable block placed after the system text and cached (the corpus). */
  cachedContext?: string;
  user: string;
  effort: Effort;
  maxTokens?: number;
  signal?: AbortSignal;
  onText?: (delta: string) => void;
  /** Mock mode only: headings the placeholder document should contain. */
  mockSections?: string[];
  mockTitle?: string;
}

export interface RunResult {
  text: string;
  model: string;
  stopReason: string;
  usage: TokenUsage;
  refusal?: { category: string | null; explanation: string | null };
}

export class ClaudeRunError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind: "auth" | "rate_limit" | "bad_request" | "api" | "network" | "aborted",
  ) {
    super(message);
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function runClaude(req: RunRequest): Promise<RunResult> {
  if (config.mock) return runMock(req);

  const anthropic = getClient();
  const system: Anthropic.TextBlockParam[] = [{ type: "text", text: req.system }];
  if (req.cachedContext) {
    system.push({ type: "text", text: req.cachedContext, cache_control: { type: "ephemeral" } });
  } else {
    system[0]!.cache_control = { type: "ephemeral" };
  }

  const base = {
    model: config.model,
    max_tokens: req.maxTokens ?? 64_000,
    system,
    messages: [{ role: "user" as const, content: req.user }],
    thinking: { type: "adaptive" as const },
    output_config: { effort: req.effort },
  };

  try {
    let final: FinalShape;
    if (config.fallbacks) {
      const stream = anthropic.beta.messages.stream(
        { ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" },
        { signal: req.signal },
      );
      stream.on("text", (delta) => req.onText?.(delta));
      final = await stream.finalMessage();
    } else {
      const stream = anthropic.messages.stream(base, { signal: req.signal });
      stream.on("text", (delta) => req.onText?.(delta));
      final = await stream.finalMessage();
    }
    return summarize(final);
  } catch (err) {
    throw toRunError(err);
  }
}

/** The fields we read, common to Message and BetaMessage. */
interface FinalShape {
  model: string;
  stop_reason: string | null;
  stop_details?: { category?: string | null; explanation?: string | null } | null;
  content: Array<{ type: string; text?: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
}

function summarize(final: FinalShape): RunResult {
  const text = final.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  const usage: TokenUsage = {
    input_tokens: final.usage.input_tokens,
    output_tokens: final.usage.output_tokens,
    cache_read_tokens: final.usage.cache_read_input_tokens ?? 0,
    cache_write_tokens: final.usage.cache_creation_input_tokens ?? 0,
  };
  const result: RunResult = { text, model: final.model, stopReason: final.stop_reason ?? "end_turn", usage };
  if (final.stop_reason === "refusal") {
    result.refusal = {
      category: final.stop_details?.category ?? null,
      explanation: final.stop_details?.explanation ?? null,
    };
  }
  return result;
}

function toRunError(err: unknown): ClaudeRunError {
  if (err instanceof ClaudeRunError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new ClaudeRunError("The server's Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", 502, "auth");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new ClaudeRunError("Rate limited by the Anthropic API. Try again in a minute.", 503, "rate_limit");
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new ClaudeRunError(`The API rejected the request: ${err.message}`, 502, "bad_request");
  }
  if (err instanceof Anthropic.APIUserAbortError) {
    return new ClaudeRunError("Run cancelled.", 499, "aborted");
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new ClaudeRunError("Could not reach the Anthropic API.", 502, "network");
  }
  if (err instanceof Anthropic.APIError) {
    return new ClaudeRunError(`Anthropic API error ${err.status ?? ""}: ${err.message}`, 502, "api");
  }
  if (err instanceof Error && err.name === "AbortError") {
    return new ClaudeRunError("Run cancelled.", 499, "aborted");
  }
  return new ClaudeRunError(err instanceof Error ? err.message : String(err), 500, "api");
}

/**
 * Deterministic stand-in used by tests and by UI work without a key. Emits
 * the same section headings the real prompt asks for, so downstream
 * parsing (channel splitting, outline rendering) is exercised.
 */
async function runMock(req: RunRequest): Promise<RunResult> {
  const title = req.mockTitle ?? "Mock analysis";
  const sections = req.mockSections?.length ? req.mockSections : ["Findings", "Recommendations"];
  const chunks: string[] = [`# ${title}\n\n_Mock output. Set ANTHROPIC_API_KEY and CLAUDE_MOCK=0 for real analysis._\n\n`];
  for (const s of sections) {
    chunks.push(`## ${s}\n\nPlaceholder content for "${s}". The real run cites transcript titles and timestamps here.\n\n- Point one\n- Point two\n\n`);
  }
  let text = "";
  for (const chunk of chunks) {
    if (req.signal?.aborted) throw new ClaudeRunError("Run cancelled.", 499, "aborted");
    text += chunk;
    req.onText?.(chunk);
    await new Promise((r) => setTimeout(r, 2));
  }
  const inputTokens = Math.ceil((req.system.length + (req.cachedContext?.length ?? 0) + req.user.length) / 4);
  return {
    text,
    model: `${config.model} (mock)`,
    stopReason: "end_turn",
    usage: { input_tokens: inputTokens, output_tokens: Math.ceil(text.length / 4), cache_read_tokens: 0, cache_write_tokens: 0 },
  };
}
