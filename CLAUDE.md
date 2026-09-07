# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this project.

## What this is

Five AI tools for trades and home-services businesses — plumbing, electrical,
HVAC, solar, appliance repair — built toward the **Claude Certified Developer —
Foundations** credential.

> These are working tools built against realistic scenarios, **not client work**.
> No real customer data appears anywhere in this repository.

| # | Project | Weeks | Exam domains |
|---|---|---|---|
| 1 | `01-quote-triage/` | 1–2 | Claude API mechanics, prompt engineering, structured output |
| 2 | `02-notes-to-invoice/` | 3–4 | Tool use, model selection, cost management |
| 3 | `03-jobs-mcp/` | 5–6 | MCP servers, security, auth |
| 4 | `04-after-hours-agent/` | 7–8 | Agent SDK, multi-turn, context engineering |
| 5 | `05-evals/` | 9–10 | Evals, security review, cost reporting |

Each project takes one place a trades business loses money: enquiries never
quoted, work never invoiced, jobs booked badly, calls missed after hours. The
fifth proves the other four work.

## Current state: nothing is built

**All five projects are `Not started`.** Every directory holds a README and a
`.gitkeep`. The root README's status table says so and must keep saying so —
update a row only when there is code behind it. Do not write documentation,
demo links or status claims for work that does not exist.

Each project README is a template with three sections deliberately left empty:
*The problem this solves*, *Design decisions*, *What it does not do*. They are
meant to be filled in **before the code**, not reverse-engineered from it.

## The three design decisions that define this repo

These are already committed to in the README. Hold to them in review:

**Project 1 — the model is allowed to say it doesn't know.** A triage tool that
invents a suburb is worse than one that returns "I need to ask the customer where
they are." **Missing information is a first-class output, not a failure.** Any
schema or prompt that forces a value for an unknown field is wrong.

**Project 3 — one write tool, and it validates everything.** Read tools are easy.
The work is designing a booking path an agent cannot abuse: no double-booking,
nothing in the past, no unqualified technician. The threat model gets **written
down**, not implied. Adding a second write tool is a design change, not a
convenience.

**Project 4 — knowing when to stop.** Gas leak, live wiring, water through a
ceiling: the correct response is a human, immediately. An agent that helpfully
books a Tuesday slot for a gas leak is a liability. The escalation cases live in
committed transcripts and are part of the test set, not illustrations.

## Cost discipline is part of the assessment

API calls here are **metered pay-as-you-go and are not covered by a Claude Pro or
Max subscription**. The README carries current per-call and per-eval-run figures;
read them there rather than restating them, since rates drift.

Four habits keep the whole ten-week track in the $10–40 range:

1. **A spend limit is set in the Anthropic Console before any code is written.** A
   runaway loop is the only way this gets expensive; a hard cap makes it impossible.
2. **Evals go through the Batch API** — half price, and eval runs are not
   latency-sensitive.
3. **Stable prompts are cached.** Project 1's system prompt is byte-identical on
   every call.
4. **Route by difficulty.** Project 2 exists partly to measure where the cheaper
   tier is genuinely sufficient and the expensive one is waste. Do not default to
   the largest model; make the routing decision measurable and record it.

Cost per run is a reported metric in Project 5, not an afterthought.

## Keys and secrets

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

`.env` and `*.key` are gitignored. **Never commit a key.** A key that reaches git
history has to be *rotated*, not merely deleted — the commit survives in every
clone and in the reflog. Never read or echo `.env` contents into the transcript.

## Demos are recorded, not hosted

Every project is demonstrated with a **short screen recording embedded in its
README**, not a live endpoint. Deliberate: a recording shows the tool working in
about sixty seconds, costs nothing to serve, cannot be abused, and keeps working
after a key is rotated or a dependency drifts. Do not propose deploying a hosted
demo. If one is ever added it asks the visitor for their own API key, held in the
browser and never stored.

## Working here

- No language or framework is committed to yet — the first project chooses, and
  the rest should follow it rather than diverge.
- When writing against the Claude API or building the MCP server, check current
  API surface and model options rather than working from memory; both move.
- The `mcp-builder` skill is the right reference for Project 3, and `skill-creator`
  for anything that becomes a repeated workflow.
- Related work: the Salesforce side of the same problem is in the sibling
  engagement repositories and at portfolio.hossainconsulting.com.
