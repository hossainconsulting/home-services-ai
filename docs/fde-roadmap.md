# Forward Deployed Engineering, translated to Salesforce and agency work

Working notes. Written to answer a specific question: the FDE roadmaps that
circulate on LinkedIn are written for one kind of company, and this program is
aimed at a different one. What actually transfers, what does not, and what is
missing.

---

## 1. There are two species of FDE, and they have opposite incentives

Almost every published FDE roadmap describes the **product-company FDE** —
Palantir, and the scale-ups that copied the pattern. That engineer is deployed
into a customer to make *their employer's product* work against a messy real
environment. The custom code they write at the customer site is a **staging area
for the core product**. The engagement succeeds when the bespoke layer *shrinks*,
because the useful parts got absorbed upstream.

The **agency FDE** — which is what a Salesforce implementation consultant
actually is — is deployed to make *someone else's platform* work for a client.
Nobody is going to absorb your customisation. You are the last mile, permanently.

That inversion changes the economics:

| | Product-company FDE | Agency FDE |
|---|---|---|
| Customisation is | a cost, to be productised away | the billable deliverable |
| Success looks like | less custom code next quarter | a client whose business runs |
| Biggest technical risk | forking the product per customer | building something only you can maintain |
| Biggest commercial risk | engagement doesn't convert to product | scope creep eating the margin |
| Feedback loop | field → product roadmap | field → your own reusable assets |

**Practical consequence.** The product-company FDE is rewarded for saying "this
should be a platform feature." The agency FDE has to supply that discipline
themselves, because no one is paying for it. The counterweight is an internal
asset library — the accelerators, the SOPs, the seed patterns — which is exactly
what the `deliverables/` folders in the sibling engagement repositories are for.
That is not documentation overhead. That is the productisation loop, run at
agency scale.

Read every roadmap item below through that lens.

---

## 2. What the Salesforce program already covers

The engagement repositories in this program map onto the roadmap more closely
than they look, once the vocabulary is translated.

| Roadmap node | Salesforce equivalent | Where it is being practised |
|---|---|---|
| **Data & databases** | Object model, relationships, SOQL, selective queries, skinny tables, Data Cloud DMOs | Every engagement — the data model *is* the deliverable |
| ETL / ELT pipelines | Data Loader, Bulk API, Data Cloud data streams, identity resolution | `coastline-retail-group` (whole engagement) |
| Indexing & optimisation | Selective SOQL, custom indexes, governor limits, large data volumes | `ironbark`, `tradelink` at pipeline scale |
| **APIs & integrations** | REST/SOAP/Bulk/Composite/Streaming, Platform Events, External Services, Named Credentials | `tradelink` (acquisition migration), `kurrajong` (CTI, channels) |
| Webhooks & events | Platform Events, Change Data Capture, Outbound Messages | `kurrajong` (multi-channel intake) |
| **Customer discovery** | Discovery interviews, requirements, current-state mapping, technical scoping | `ironbark` — its brief is *explicitly* discovery-before-build |
| Stakeholder interviews | The stakeholder-in-character exercises | `sunrise` (Marcus), `agentforce-meridian-care` (Priya) |
| **Core FDE concepts** | Rapid prototyping in a scratch/dev org, production debugging, data transformation | All seven engagement repos |
| Logging & observability | Debug logs, Event Monitoring, custom logging objects, milestone reporting | `kurrajong` — "a milestone that cannot be reported cannot be proven" |
| **Testing** | Apex test classes, UAT scripts, regression packs | Thin so far — see gaps |
| **System design** | Multi-tenant is given; sharing model, LDV, async patterns, integration architecture | `tradelink` (security model reset), `ironbark` (territory model) |
| **AI / LLM integrations** | Agentforce, retrieved actions, prompt templates, Data Cloud grounding | `agentforce-meridian-care`, `home-services-ai` |

Three things in this program are **stronger** than the roadmap asks for, and are
worth naming because they are the rare part:

1. **Discovery discipline as a hard rule.** The `ironbark` brief states that a
   design proposed without evidence of current-state discovery is incomplete
   *however good the design is*. Most engineers never internalise this.
2. **Decision records that cannot be retro-edited.** The `sunrise` convention —
   a dated note is superseded with a dated block, never rewritten, because
   editing it falsifies the log. This is the single most professional habit in
   the whole program and it maps directly onto FDE "technical storytelling."
3. **Rollback positions recorded before destructive change** (`tradelink`), and
   accepted risks written down inline rather than left implicit (`sunrise`).

Those are the things that separate a consultant from an admin taking orders, and
they are already in place.

---

## 3. The real gaps

Honest assessment against the roadmap, based on what is actually in the repos.

### 3.1 Systems and infrastructure — the thinnest transfer

Salesforce deliberately abstracts away Linux, processes, memory and file systems.
Nothing in the seven engagement repos touches them. The roadmap's
"Systems & Infrastructure" column is close to **zero coverage**, and it is the
column that separates an FDE from a platform consultant.

*Where to close it:* the MCP server project (`03-jobs-mcp/`) is the natural home
— it runs as a real process, on a real OS, with real auth and a real network
surface. Treat it as the systems module, not just the MCP module.

### 3.2 Deployment automation — currently zero

**Nine repositories, no GitHub Actions workflow in any of them.** Roadmap node 9
(Git, CI/CD, Docker, cloud, IaC) is unevidenced. Git is used well; nothing beyond
it is.

*Where to close it, cheapest first:*
- A CI job running `sf project deploy start --dry-run` against a scratch org on
  every PR to the repos that have an `sfdx-project.json`.
- Apex test execution in CI once there is Apex worth testing.
- For `portfolio`, a workflow is deliberately absent — deploys are manual by
  decision. Leave it. But *say* that it is a decision, because "no CI" and
  "CI deliberately declined" read very differently to a reviewer.

### 3.3 Code volume

13 `.apex` files and one `.js` across the whole program. The Salesforce tracks
are declarative by design and that is correct for the certifications, but the
roadmap's programming column needs actual output. The five projects in this
repository are the answer, and none has started.

### 3.4 Distributed systems and async

Message queues, background jobs, real-time systems, distributed systems — none
covered. Salesforce has doors into all of it: Platform Events, Queueable and
Batch Apex, Change Data Capture, Pub/Sub API. Walking through those doors while
explicitly naming the general pattern behind each one converts platform trivia
into transferable knowledge.

### 3.5 The commercial layer, which no roadmap includes

This is the biggest omission for agency work, and no published FDE roadmap
covers it because product-company FDEs are salaried and don't sell.

- **Scoping and estimating.** Converting discovery findings into a bounded
  statement of work.
- **Change control.** The mechanism by which "can you just also…" becomes either
  a variation or a documented decline. Without it, agency FDE work is unprofitable
  by default.
- **Assumptions and dependencies as contract terms**, not politeness.
- **Handover and enablement** as a priced deliverable rather than a favour.
- **Reusable asset strategy** — what gets extracted from each engagement into
  something reusable, and who owns the IP.

The `tradelink` engagement is the right sandbox for this: an inherited org with
six years of accumulated decisions is precisely where scope control decides
whether the work is profitable.

---

## 4. Node-by-node translation

For each roadmap node: what it means on Salesforce, and what the agency-specific
twist is.

**1. FDE fundamentals.** The role difference that matters here is not FDE vs
software engineer. It is *implementation consultant* vs *staff augmentation*. The
first is accountable for the outcome; the second for the hours. Everything in the
engagement repos assumes the first.

**2. Programming languages.** Apex and SOQL are the platform pair. Python and SQL
remain the general-purpose pair, and this repository's projects are where they
get used. JavaScript arrives via Lightning Web Components. Bash matters the moment
CI exists. Do not let Apex be the only language with real volume behind it —
Apex-only engineers age badly.

**3. Data & databases.** On Salesforce the data model is the product of the
engagement, not an implementation detail. The transferable skills are modelling,
normalisation trade-offs, identity resolution and query selectivity — all of which
survive a platform change. Governor limits are Salesforce trivia; *why* a
multi-tenant platform needs them is systems knowledge.

**4. APIs & integrations.** Salesforce gives you an unusually rich integration
surface. The agency twist: integrations are where estimates die. Every external
system has an undocumented behaviour that surfaces in week three. Budget for
discovery *against the actual endpoint*, not against its documentation.

**5. Customer discovery & solution design.** Already the strongest area. The one
addition worth making: **write the success metric before the build**, and make it
countable from a report. The `agentforce-meridian-care` rule — deflection must be
countable *before* go-live, not after — is the general principle in a specific
costume.

**6. Core FDE concepts.** Rapid prototyping in a scratch org, production debugging
without a debugger, data transformation, error handling, observability. The
Salesforce-specific hard-won lesson: you often cannot reproduce the customer's
state locally, so *evidence capture at the time of the incident* replaces
step-through debugging. Hence `evidence/` folders with before/after CSVs.

**7. Testing.** Apex tests are a deployment gate, not a testing strategy. The
roadmap's list — unit, integration, API, end-to-end, regression, automation — is
broader and mostly unaddressed here. Regression packs matter most in agency work:
you are changing an org you did not build, and the client's trust depends on
proving you broke nothing.

**8. Advanced topics.** Message queues → Platform Events and Pub/Sub API.
Background jobs → Queueable, Batch, Scheduled Apex. Real-time → Streaming API.
Distributed systems → the integration architecture across the client's estate.
AI/LLM → Agentforce, with the discipline already written down in
`agentforce-meridian-care`: coverage answers come from a retrieved action, never
from the model.

**9. DevOps & deployment.** SFDX, scratch orgs, unlocked packages, `sf` CLI in
CI. The agency twist: you rarely control the client's release process. Being able
to *propose* one, and to work inside a bad one without breaking it, is the skill.

**10. System design for FDEs.** Multi-tenancy is handed to you on Salesforce,
which hides the lesson. Learn *why* the platform imposes what it imposes, and the
knowledge transfers. Scalability, load balancing and fault tolerance are largely
Salesforce's problem — but they become yours the moment an integration or a
Heroku/AWS component enters the architecture.

---

## 5. Sequencing against the existing program

Not a new curriculum. An ordering of work that already exists, chosen so each
phase closes a named gap.

**Phase A — close the CI gap (small, immediate).**
Add a deploy-validation workflow to one engagement repo with an
`sfdx-project.json`. One repo, one workflow. Then copy it. This converts roadmap
node 9 from zero to evidenced faster than anything else available.

**Phase B — build code volume (`01-quote-triage`, `02-notes-to-invoice`).**
Fills the programming and structured-output gap. Note the design rule already
committed to: missing information is a first-class output. That rule is FDE
thinking — a tool that invents a suburb is worse than one that asks.

**Phase C — systems and security (`03-jobs-mcp`).**
The systems-fundamentals module in disguise: a real process, real auth, a real
threat model, exactly one guarded write path. Write the threat model down. That
document is more valuable to an FDE portfolio than the server.

**Phase D — async, distributed, and the commercial layer.**
Platform Events and async Apex inside `kurrajong` or `tradelink`, alongside the
scoping and change-control artefacts that no roadmap lists. Add a
`sop-scope-change.md` to `tradelink/deliverables/` — an inherited-org engagement
is where scope control is most obviously load-bearing.

Throughout: every phase gets a build-log row and an entry in the relevant
engagement's `deliverables/`. The record is the portfolio.

---

## 6. How this gets evidenced

An FDE claim is only as good as what a reviewer can inspect in ten minutes.
What already works in this program's favour:

- **Written decisions with reasoning, not just outcomes.** The `sunrise`
  correction — "never logged in" reworded to "no interactive human login" with the
  decision left standing — demonstrates more engineering judgement than a green
  test suite does.
- **Before/after evidence per intervention.** `cf-23` closing against 62 records
  rather than the 23 its name implies, *and the record saying so*, is exactly the
  honesty a customer-facing role is hired for.
- **Simulation disclosure held consistently.** Every repo says these are
  simulations, not client work. That is credibility, not a caveat.

What is missing from the evidence:
- No CI badge or check run anywhere.
- No artefact showing scope being controlled — only scope being delivered.
- No test strategy document, only per-ticket verification.

---

## 7. The short version

The Salesforce consultant tracks in this program cover the FDE roadmap's
**right-hand column** — discovery, solution design, stakeholder work,
requirements — better than most engineers ever will, and cover the
**data and integration** middle well.

They cover **systems, deployment automation, async and distributed patterns**
barely at all, and the projects in this repository are where that gets fixed.

And the roadmap omits the layer that decides whether agency FDE work is a
business rather than a hobby: **scoping, change control, handover and reusable
assets.** That layer is not taught by any certification and is the one worth
writing down as you learn it.
