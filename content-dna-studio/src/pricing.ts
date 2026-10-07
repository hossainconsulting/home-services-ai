/** USD per million tokens. Cache write is 1.25x input, cache read is 0.1x. */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

export function estimateCostUsd(model: string, u: TokenUsage): number {
  const p = PRICES[model] ?? PRICES["claude-opus-5"]!;
  const perTok = 1 / 1_000_000;
  return (
    u.input_tokens * p.input * perTok +
    u.cache_write_tokens * p.input * 1.25 * perTok +
    u.cache_read_tokens * p.input * 0.1 * perTok +
    u.output_tokens * p.output * perTok
  );
}
