# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this project.

## What this is

Five AI tools for trades and home-services businesses, built while working toward the
**Claude Certified Developer — Foundations** credential. These are working tools built
against realistic scenarios, not client work, and no real customer data appears here.

**As of this file, every project is `Not started` — there is no code in this repository
yet.** All five directories contain a README template and a `.gitkeep`. That is the
honest state and `README.md` says so in its status table. Keep it accurate: when a
project ships, update its status in the root table and in its own README, and do not
mark anything shipped that a reviewer cannot run.

## The five projects

| # | Directory | What it does | Exam domains |
|---|---|---|---|
| 1 | `01-quote-triage/` | Messy enquiry → structured job spec, explicit about what it still needs to ask | API mechanics, prompt engineering, structured output |
| 2 | `02-notes-to-invoice/` | End-of-day notes → line-itemed draft invoice, priced from a rates table | Tool use, model selection, cost management |
| 3 | `03-jobs-mcp/` | Jobs/customer database over MCP — read tools plus exactly one guarded write | MCP servers, security, auth |
| 4 | `04-after-hours-agent/` | Triage an 11pm message, book via MCP or escalate to a human | Agent SDK, multi-turn, context engineering |
| 5 | `05-evals/` | Grades 1–4 against a fixed case set — accuracy, cost, regressions | Evals, security review, cost reporting |

Project 5 is what makes the other four credible. Build it as the case set grows, not at
the end.

## The three design decisions that carry this repo

These are stated in `README.md` and are the ones a reviewer will actually read. Do not
quietly design around them:

- **Project 1 — the model is allowed to say it doesn't know.** A triage tool that invents
  a suburb is worse than one that returns "I need to ask the customer where they are."
  Missing information is a first-class output, not a failure mode.
- **Project 3 — one write tool, and it validates everything.** Read tools are easy. The
  work is designing a booking path an agent cannot abuse: no double-booking, nothing in
  the past, no unqualified technician. The threat model gets documented, not implied.
- **Project 4 — knowing when to stop.** Gas leak, live wiring, water through a ceiling:
  the correct response is a human, immediately. The escalation cases belong in committed
  transcripts, not in prose describing them.

## README discipline

Each project README ships with placeholder sections in italics. They are a contract,
not decoration:

- **The problem this solves** — written *before* any code.
- **Design decisions** — only the ones with more than one defensible answer.
- **What it does not do** — scope boundaries stated deliberately.
- **Demo** — a ~60-second screen recording committed alongside the README. Recorded, not
  hosted: it costs nothing to serve, cannot be abused, and survives a rotated key or a
  renamed model.
- **Results** — real numbers only. **No numbers until there are numbers.** Do not fill
  this section with estimates, and do not leave an estimate in a place a reader will
  take for a measurement.

## Cost discipline

Running this code bills the Anthropic API — a Claude Pro or Max subscription does not
cover it. Budget for the whole track is **$10–40**. Four habits keep it there:

1. A spend limit set in the Anthropic Console **before** writing code. A runaway loop is
   the only way this gets expensive.
2. The **Batch API for evals** — 50% cheaper, and eval runs are not latency-sensitive.
3. **Prompt caching** for stable system prompts. Project 1's is byte-identical per call.
4. **Route by difficulty.** Project 2 exists partly to measure where Haiku 4.5 is
   genuinely sufficient and Opus 5 is waste.

Current rates for reference: Haiku 4.5 $1/$5 per million input/output tokens, Opus 5
$5/$25. Before quoting pricing or model IDs in code or docs, check them — do not write
them from memory.

`optimization-playbook.md` holds the worked version of this: the nine-strategy LLM
optimization checklist sorted by what earns its complexity at this size, with the API
mechanics (caching prefix rules, batch `custom_id` ordering, `output_config.effort`,
`task_budget` vs `max_tokens`) verified on 07/09/2026. Two things it corrects: the free
levers come before model choice, not after — and Sonnet 5 at $2/$10 is the middle rung
missing from the Haiku-or-Opus framing above.

## Never commit

`ANTHROPIC_API_KEY` or any other credential. `.env` and `*.key` are gitignored. A key
that reaches git history has to be **rotated**, not deleted — the commit survives in
every clone and in the reflog.

## Agent workflow

Superpowers is expected to be installed as a **user-level plugin**
(`/plugin install superpowers@claude-plugins-official`), not vendored into this repo.
This is the repo in the program where it earns the most: there is no code yet, so
brainstorming → plan → red/green TDD applies from the first line. There is currently no
`package.json` and no test runner — the first project to ship should add one, because
the eval harness in project 5 and the TDD workflow both need something to run.
