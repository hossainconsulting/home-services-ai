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

## Running anything here

Each project has its own README and setup. You will need an Anthropic API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Never commit it. `.env` and `*.key` are gitignored, and an API key that reaches
git history is a key that has to be rotated.

---

## Related work

The Salesforce side of the same problem — CRM implementations for the same kind of
business — is at
[portfolio.hossainconsulting.com](https://portfolio.hossainconsulting.com).
