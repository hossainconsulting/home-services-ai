# Home Services AI

A self-directed AI engineering project exploring five tools for trades
and home-services businesses: plumbing, electrical, HVAC, solar and
appliance repair.

> **The five trades tools remain at the planning/scaffold baseline.**
> These are proposed tools for fictional scenarios, not client work.
> No real customer data is included.

**Built by:** [Hemayet Hossain](https://github.com/hossainconsulting) · Sydney, Australia
**Portfolio:** [portfolio.hossainconsulting.com](https://portfolio.hossainconsulting.com)
**Lab:** working copy maintained on `paperclip-dev` (Fedora Server 44, VirtualBox VM on my own hardware). `paperclip-dev` is my lab name for the Fedora Server VM.

## Current status

As reviewed on 16 September 2026, the main branch contains the root
README, five project README templates, placeholder files and `.gitignore`.

It does not yet contain implementation code, automated tests, recorded
demos, evaluation datasets or measured results. Other branches and open
pull requests have not been assessed in this review.

The five projects below form a planned ten-week learning track, not completed delivery.

## Planned tools

| Project | Intended purpose | Status |
| --- | --- | --- |
| [Quote Triage](01-quote-triage/) | Turn an enquiry into a validated job specification and identify missing information | Not started |
| [Notes to Invoice](02-notes-to-invoice/) | Turn job notes into a draft invoice using a rates table and deterministic calculations | Not started |
| [Jobs MCP Server](03-jobs-mcp/) | Provide database read tools and a validated booking write path | Not started |
| [After-Hours Agent](04-after-hours-agent/) | Triage enquiries, support booking and escalate safety-critical scenarios | Not started |
| [Eval Harness](05-evals/) | Evaluate the other tools against fixed cases and report quality, cost and regressions | Not started |

## Beyond the five: Content DNA Studio

[Content DNA Studio](content-dna-studio/README.md) adds a separate application
for YouTube transcript analysis and drafting copy for ten distribution channels.
Its source includes eight analysis prompts, accounts, workspaces, plan limits,
usage metering and streamed output using SQLite storage.

The prompts request title/timestamp citations and label unsupported suggestions
as recommendations. The integration configures prompt caching; actual cache hits
and savings require measurement. The project's README records prior mock-mode
validation and the absence of live API verification. Those historical test results
were not rerun during this README conflict resolution. Follow its setup and
reverify provider model/API support before a live run.

## Design goals to validate

- **Explicit uncertainty:** request missing details rather than invent them.
- **Reliable calculations:** calculate invoice amounts in code using
  defined rates rather than relying on model arithmetic.
- **Controlled writes:** validate booking requests, including availability,
  dates and technician qualifications.
- **Human escalation:** define and test escalation behaviour for
  safety-critical scenarios.
- **Evidence before claims:** publish test cases and measured results
  before describing a tool as working or reliable.

These are intended requirements, not implemented controls.

## Evidence planned for each tool

Each project README will document:

1. The business problem and scope.
2. Design decisions and limitations.
3. Reproducible setup and execution steps.
4. Tests, failure cases and evaluation results.
5. Measured cost and latency, with the model and test date.
6. A short recorded demonstration once the tool works.

Recorded demos are the intended presentation format. None are currently
committed on main.

## Running the projects

The five trades tools retain their placeholder setup instructions. Content DNA Studio
has separate source and setup instructions in its own directory.

Setup instructions, dependencies and required environment variables
will be added with each implementation. Do not treat the placeholder
commands in the project READMEs as complete setup instructions.

## API usage and credentials

Future implementations may require a separately billed API account.
Check the provider's current pricing and account controls before running
API-backed code.

No per-call cost, evaluation budget or total project cost has been
measured yet. Costs will depend on the chosen model, token usage,
tool calls, retries and evaluation volume.

Use spending controls where available, monitor usage, and bound loops
and retries in code. These measures reduce risk; they do not justify a
guarantee that unexpected charges are impossible.

Keep API credentials out of source control, screenshots, recordings and
logs. If a credential is committed, revoke or rotate it promptly.

## Working notes

**[Analysis prompts](docs/analysis-prompts.md)** — a pruned and rewritten set of analysis
prompts for trades work and Salesforce consulting, adapted from a circulated list of
twenty. Six cut, one repurposed, five added. The change that matters: every prompt now
gives the model permission to find nothing, because a prompt that asks for "the top 3 to 5
root causes" gets three to five whether the evidence supports one or none.

## For recruiters and agencies

**What this repository evidences:** This repository documents designs for five proposed trades tools and includes Content DNA Studio application source and tests. The proposed MCP booking path, after-hours agent and evaluation harness are not implemented. Content DNA Studio’s live API behavior remains unverified.

**Current evidence:** The status table records the dated planning/scaffold baseline.
Inspect the project directories and dated evidence before treating any tool as implemented
or tested. The related portfolio assistant's source is in the
[`portfolio`](https://github.com/hossainconsulting/portfolio) repository; this section
does not establish its deployment or live behaviour.

**Read these first:**

1. [`docs/rag-maturity.md`](docs/rag-maturity.md) — the seven-level ladder and the conclusion that four of these five tools should not be RAG systems
2. [`docs/analysis-prompts.md`](docs/analysis-prompts.md) — a pruned prompt library where every prompt is allowed to find nothing
3. [`03-jobs-mcp/README.md`](03-jobs-mcp/README.md) — the one-write-tool threat model, stated before code

**How to verify:** every claim in the status table is one a reviewer can check by opening
the directory. The [skill-to-evidence map](https://portfolio.hossainconsulting.com/#evidence) on the portfolio shows where each
credential is applied, and the [hiring page](https://portfolio.hossainconsulting.com/#hire) says what I am open to.

## Council of advisors (`/council`)

A Claude Code skill in `.claude/skills/council/` for the decisions *around* the
tools rather than the tools themselves: is this idea worth building, which of
two options, what price, what to post. Ten templates, each convening five named
advisors who assess independently, argue, and close with one verdict.

```
/council validate-idea   an after-hours triage agent for one-van plumbers in western Sydney
/council choose          A: ship project 3 first   B: ship project 4 first
```

The skill's rules are the point: advisors may not invent numbers, at least one
must find the assumption the user has taken for granted, and every plan has to
be cheap enough to start this week. Copy the folder to `~/.claude/skills/` to
use it outside this repo.

---

## Related work

The Salesforce side of this portfolio is available at
[portfolio.hossainconsulting.com](https://portfolio.hossainconsulting.com).


## AI contributor credit

**OpenAI Codex** is credited as an AI-assisted contributor (Chief of Engineer) for authorised
repository work under Hemayet Hossain's direction. This includes assistance
with documentation and repository maintenance; implementation or validation
contributions are recorded in the relevant commits and task evidence.

**Anthropic Claude Code** is also credited as an AI-assisted contributor (Chief of Staff) for
authorised repository work under Hemayet Hossain's direction, including coding,
writing and documentation. Commits it co-authored carry a
`Co-Authored-By: Claude` trailer.

Hemayet Hossain remains the project owner and decision-maker. These credits do
not represent separate GitHub accounts or collaborator invitations, and do
not change existing authorship, licensing or project completion claims.

## Design notes

[RAG maturity assessment](docs/rag-maturity.md) records the original design analysis of retrieval choices for the five proposed tools. It grades designs, not running implementations. Its API and pricing references are historical and require rechecking before implementation.

## Optimization planning

[optimization-playbook.md](optimization-playbook.md) preserves the original optimization analysis and its dated API/pricing references. Reverify those references before implementation; no savings or performance results have been measured by this conflict resolution. Measure cost per completed task, including retries, against evaluation quality.

---

## Connect

Built by **Hemayet Hossain**, Sydney, Australia. The portfolio links self-directed projects, dated evidence and credential records. Project status is documented separately from planned scope.

[Portfolio](https://portfolio.hossainconsulting.com/?utm_source=github&utm_medium=readme&utm_campaign=home-services-ai) ·
[All links](https://portfolio.hossainconsulting.com/links) ·
[GitHub](https://github.com/hossainconsulting) ·
[LinkedIn](https://www.linkedin.com/company/hossain-consulting) ·
[Instagram](https://www.instagram.com/hossainconsulting/)
