# LLM optimization playbook

**Date:** 07/09/2026 · **Scope:** the five projects in this repo · **Status:** decisions
recorded, none measured yet — there is no code here to measure.

## The honest framing first

The nine-strategy model that circulates for LLM optimization is written for teams running
inference at a scale where a percentage point of token spend is a salary. This repo has a
**$10–40 total budget** and, as of today, **no code**. Most of those nine strategies are
premature here, and adopting all nine would be cargo cult.

What follows keeps the nine as a checklist, but sorts them by whether they earn their
complexity *at this size*, and corrects the two places the popular framing is wrong even
at scale. The useful output is not "do all nine" — it is knowing which three matter before
the first call and which six are notes for later.

---

## Verified API facts (07/09/2026)

Checked before writing, not recalled. Re-check before quoting these anywhere else.

| Model | ID | Context | Input $/1M | Output $/1M |
|---|---|---|---|---|
| Claude Opus 5 | `claude-opus-5` | 1M | $5.00 | $25.00 |
| Claude Sonnet 5 | `claude-sonnet-5` | 1M | $2.00 | $10.00 |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K | $1.00 | $5.00 |

**The rates in `README.md` and `CLAUDE.md` are correct** — Haiku 4.5 at $1/$5 and Opus 5 at
$5/$25 both check out. Two corrections follow anyway:

1. **There is a middle rung the repo doesn't mention.** Sonnet 5 sits at $2/$10, between the
   two models the cost section names. A Haiku-or-Opus framing skips it, and it is the more
   likely answer for project 2's routing question than either end.
2. **One arithmetic figure is light.** At the README's own stated per-call shape (~650 in,
   250 out), a full sweep of 50 cases × 3 projects = 150 calls costs **~$1.43 on Opus 5**,
   not ~$1.30. Haiku's ~$0.30 is right ($0.285). Small, but this repo's rule is real numbers
   only, so it should be corrected when the README next changes.

Per-call cost at that shape: Haiku 4.5 **$0.0019**, Sonnet 5 **$0.0038**, Opus 5 **$0.0095**.

---

## The nine, sorted by whether they earn their place here

### Do these before the first project ships

**1 · Prompt and context optimization → prompt caching.** Caching is the only lever that
cuts cost with no quality tradeoff at all, which is why it goes first — before model
choice, not after it. The mechanics that matter: caching is a **prefix match**, the render
order is `tools` → `system` → `messages`, and any byte change anywhere in the prefix
invalidates everything after it. Keep the frozen system prompt first and the varying
question last. Max 4 breakpoints per request; the minimum cacheable prefix is
model-dependent (roughly 512–4096 tokens), so short prompts silently will not cache at all.

Project 1's system prompt is byte-identical per call, which makes it the ideal case — but
only if nothing volatile leaks into the prefix. A timestamp or an unsorted JSON dump in the
system prompt is the classic silent killer. **Verify with `usage.cache_read_input_tokens`:
if it is zero across repeated calls, caching is not happening, whatever the code looks
like.**

**2 · Inference cost optimization → the Batch API for evals.** Already the repo's stated
habit and still right: 50% off, and eval runs are not latency-sensitive. It brings the full
sweep to about **$0.14 on Haiku or $0.71 on Opus 5**. One gotcha to design for now rather
than debug later: **batch results come back in any order — key them by `custom_id`, never
by position.**

**3 · Evaluation and feedback loops → project 5, built as the case set grows.** This is
already the repo's position and it is the one that makes the other eight measurable. Nothing
below should be adopted on the strength of this document; it should be adopted because an
eval showed it held quality.

### Do these when there is code to apply them to

**4 · Model selection optimization — but not the way the diagram says.** The popular
advice is "use the smallest model that meets the task threshold," placed as step one. Two
reasons that is the wrong first move here:

- **Measure the capable model at lower effort before building a cascade.** `output_config:
  {effort: "low"|"medium"|"high"|"xhigh"|"max"}` (default `high`) trades thoroughness against
  spend *within one model*. Lower effort on a current model often beats a previous-generation
  model at high effort. This lever does not appear anywhere in the nine-strategy diagram, and
  for a project this size it is more useful than multi-model routing.
- **A cascade forfeits cache reuse.** Prompt caches are **model-scoped**. Routing half your
  traffic to a cheaper model splits your cache namespace and can cost more than it saves on
  a workload with a big stable prefix — which is exactly project 1's shape.

Project 2 exists partly to measure where Haiku is genuinely sufficient. Keep that, and add
the two comparisons the current framing misses: Sonnet 5 as the middle rung, and Opus 5 at
`low`/`medium` effort as the single-model alternative to routing at all.

**5 · Output quality optimization → structured outputs.** Use `output_config: {format: ...}`
on `messages.create()` (the older `output_format` parameter is deprecated), and `strict:
true` on tool definitions where the schema must validate exactly. This is the mechanism
behind project 1's "the model is allowed to say it doesn't know" — a schema with an explicit
`missing_information` field makes that a first-class output rather than a prose hedge.

**6 · Retrieval optimization → not yet applicable.** No RAG in any of the five projects.
Project 3 is a database over MCP, which is retrieval by query, not by embedding. Revisit only
if a knowledge-base project appears.

### Note for later; do not build now

**7 · Latency optimization.** Real levers exist — fast mode runs Opus 5 at up to 2.5× output
speed via `speed: "fast"` — but it is **priced at $10/$50 per MTok**, roughly double standard
Opus. On a $10–40 budget that is a straight trade of budget for speed, and none of these five
projects has a latency SLA. Project 4 is the only one where a human is waiting, and it is an
after-hours agent where a few seconds do not matter.

**8 · Architecture-level optimization.** Multi-model routing, feature-flagged model changes,
kill switches for runaway costs. The kill switch is the only part that applies, and the repo
already has the right version of it: **a spend limit set in the Anthropic Console before
writing code.** A hard cap at the account boundary beats application-level cost logic that
has to be correct to work.

**9 · Organizational optimization.** Model ownership, shared eval standards, FinOps in the
architecture. One person. Not applicable, and saying so is more honest than inventing a
governance process for a solo repo.

---

## Where the popular framing is wrong

**Order.** The diagram leads with model selection and puts prompt/context second. The correct
order runs free wins before tradeoffs: **caching, input-token hygiene, output-token hygiene,
and batch — all of which cost no quality — before effort, budgets, and model choice, which
all trade something.** Choosing a smaller model first means you take a quality hit to save
money you could have saved for free.

**Unit of measurement.** "Cost per request" is the wrong denominator. **Judge cost per
completed task.** A cheaper model that needs two retries and a follow-up turn to get the job
done is not cheaper. This matters most for project 4, where a multi-turn agent's real cost is
the whole conversation, not the first call.

---

## Token budgets — what the phrase actually maps to

"Apply token budgets per request" maps to two different mechanisms, and conflating them
produces broken code:

- **`max_tokens`** is an enforced per-response ceiling the model is unaware of. Hit it and the
  output truncates mid-thought and needs a retry — which costs more than the cap saved. Do not
  lowball it.
- **`task_budget`** (beta, agentic loops, minimum total 20,000 tokens) gives the model a ceiling
  it can *see*, so it paces itself and finishes gracefully. Only project 4 is shaped for this,
  and only once it is a real loop.

For counting tokens, use the API's `messages.count_tokens` — not `tiktoken`, which is a
different tokenizer and will give wrong numbers.

---

## What changes in this repo

Nothing to build yet. Three decisions recorded:

1. **Caching design is a project-1 requirement, not an optimization pass.** The system prompt
   must be structured for a stable prefix from the first commit; retrofitting it means
   rewriting the prompt.
2. **Project 2's routing question widens** to three comparisons — Haiku 4.5, Sonnet 5, and
   Opus 5 at reduced effort — rather than two.
3. **The README's Opus sweep figure gets corrected to ~$1.43** next time that file is touched.

## Open decision

**Language is still unset.** There is no `package.json` and no `.py` file, so the SDK choice
(`anthropic` for Python vs `@anthropic-ai/sdk` for TypeScript) is genuinely open. It should be
settled with the first project rather than drifting, because the eval harness in project 5 and
the MCP server in project 3 both inherit it.

## Accepted risk

Model IDs, prices and API shapes above were checked on 07/09/2026 and this area moves faster
than any other part of the platform. Anything quoted from this document more than a few weeks
from that date should be re-verified before it reaches code or a README.
