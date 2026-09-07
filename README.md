# Home Services AI

Five AI tools for trades and home-services businesses — plumbing, electrical,
HVAC, solar, appliance repair. Built while working toward the **Claude Certified
Developer — Foundations** credential.

> **These are working tools built against realistic scenarios, not client work.**
> No real customer data appears anywhere in this repository.

**Built by:** [Hemayet Hossain](https://github.com/hossainconsulting) · Sydney, Australia
**Portfolio:** [portfolio.hossainconsulting.com](https://portfolio.hossainconsulting.com)

---

## Why these five

A trades business loses money in the same four places: enquiries that never get
quoted, work that never gets invoiced, jobs booked badly, and calls missed after
hours. Each project takes one of those. The fifth proves the other four actually
work.

| # | Project | What it does | Status |
|---|---|---|---|
| 1 | [Quote Triage](01-quote-triage/) | Turns a messy customer enquiry into a structured job spec — and says what it still needs to ask | Not started |
| 2 | [Notes to Invoice](02-notes-to-invoice/) | Turns end-of-day job notes into a line-itemed draft invoice | Not started |
| 3 | [Jobs MCP Server](03-jobs-mcp/) | Exposes a jobs and customer database to Claude over MCP, with one carefully guarded write path | Not started |
| 4 | [After-Hours Agent](04-after-hours-agent/) | Triages an 11pm message, books the job or escalates to a human | Not started |
| 5 | [Eval Harness](05-evals/) | Grades projects 1–4 across a fixed case set, tracks accuracy, cost and regressions | Not started |

Status is updated as each ships. Anything marked *Not started* has no code behind
it, and this table will say so until it does.

---

## The bits worth looking at

Rather than a feature list, the three decisions in here that were actually hard:

**Project 1 — the model is allowed to say it doesn't know.** A triage tool that
invents a suburb is worse than one that returns "I need to ask the customer where
they are." Missing information is a first-class output, not a failure.

**Project 3 — one write tool, and it validates everything.** Read tools are easy.
Designing a booking path an agent cannot abuse — no double-booking, nothing in the
past, no unqualified technician — is where the real work is. The threat model is
documented, not implied.

**Project 4 — knowing when to stop.** Gas leak, live wiring, water through a
ceiling: the correct response is a human, immediately. An agent that helpfully
books a Tuesday slot for a gas leak is a liability, and the escalation cases are
in the committed transcripts.

---

## Demos are recorded, not hosted

Every project here is demonstrated with a **short screen recording embedded in its
README**, not a live hosted endpoint. That is a deliberate decision, not a
shortcut:

- A recording shows the tool working in about sixty seconds, which is what a
  reviewer actually wants. Almost nobody wants to *use* a stranger's demo.
- It costs nothing to serve and cannot be abused.
- It keeps working after an API key is rotated, a model is renamed, or a
  dependency drifts — the three things that quietly kill hosted demos.

If a live demo is ever added, it will ask the visitor for their own API key,
held in the browser and never stored.

## Running it yourself

Each project has its own README and setup. You supply your own Anthropic API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

**You pay for your own calls.** Cloning this repository costs nothing; running it
bills your account, not mine. The tasks here are small — roughly 650 tokens in and
250 out per call, which is about **$0.002 on Haiku 4.5** or **$0.009 on Opus 5**.
A full eval sweep across 50 cases and three projects is about **30 cents** to
**$1.30** depending on model.

Set a spend limit in the [Anthropic Console](https://console.anthropic.com) before
you run anything. A runaway loop is the only way this gets expensive, and a hard
cap makes that impossible.

**Never commit your key.** `.env` and `*.key` are gitignored. A key that reaches
git history has to be *rotated*, not merely deleted — the commit survives in every
clone and in the reflog.

### This costs money — a little

A Claude Pro or Max subscription covers *using* Claude Code. It does **not** cover
API calls made by the code in this repository. Those are metered pay-as-you-go,
billed per token, no free tier.

At current rates — Haiku 4.5 at $1/$5 per million input/output tokens, Opus 5 at
$5/$25 — the tasks here are small. A typical call is roughly 650 tokens in and 250
out:

| Model | Per call | Full eval run (50 cases × 3 projects) |
|---|---|---|
| Haiku 4.5 | ~$0.002 | ~$0.30 |
| Opus 5 | ~$0.009 | ~$1.30 |

**Realistic total for the whole 10-week track: $10–40**, including iteration and
repeated eval runs.

Four habits keep it there:

1. **Set a spend limit in the Anthropic Console before writing any code.** A
   runaway loop is the only way this gets expensive; a hard cap makes that
   impossible.
2. **Use the Batch API for evals** — 50% cheaper, and eval runs are not
   latency-sensitive.
3. **Cache stable prompts.** Cached input costs roughly a tenth. Project 1's
   system prompt is byte-identical on every call.
4. **Route by difficulty.** Project 2 exists partly to measure where Haiku is
   genuinely sufficient and Opus is waste.

The reasoning behind these, and the levers that come *before* choosing a cheaper model,
are in [optimization-playbook.md](optimization-playbook.md).

---

## Related work

The Salesforce side of the same problem — CRM implementations for the same kind of
business — is at
[portfolio.hossainconsulting.com](https://portfolio.hossainconsulting.com).
