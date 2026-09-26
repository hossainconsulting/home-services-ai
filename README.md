# Home Services AI

A self-directed AI engineering project exploring five tools for trades
and home-services businesses: plumbing, electrical, HVAC, solar and
appliance repair.

> **Planning and scaffold stage — implementation has not started on main.**
> These are proposed tools for fictional scenarios, not client work.
> No real customer data is included.

**Built by:** [Hemayet Hossain](https://github.com/hossainconsulting) · Sydney, Australia
**Portfolio:** [portfolio.hossainconsulting.com](https://portfolio.hossainconsulting.com)

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

There is currently no runnable application on main.

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

## Related work

The Salesforce side of this portfolio is available at
[portfolio.hossainconsulting.com](https://portfolio.hossainconsulting.com).
