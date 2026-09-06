# Analysis prompts, adapted

A working set of analysis prompts for trades and home-services work, and for the
Salesforce consulting side of the same problem.

Adapted from a circulated *20 Claude Prompts for Analysis* graphic. Six of the original
twenty are cut, one is repurposed, thirteen are rewritten, and five are added that the
domain needs and the source list has no equivalent for. The reasoning for each cut is
below — a prompt library nobody has pruned is a list, not a library.

---

## The one change applied to every prompt

The source list has a single flaw running through it, and it is worth naming before the
prompts themselves, because it is the flaw most prompt collections share.

**Not one of the twenty gives the model permission to find nothing.**

"Identify the top 3 to 5 root causes." "List every implicit assumption." "Identify any
patterns, outliers, or anomalies." Asked that way, a model returns three to five root
causes whether or not the evidence supports one. It finds patterns in eleven data
points. It manufactures findings, because that is what it was asked for, and the output
is fluent, well-organised and confidently wrong.

Every prompt below therefore carries two additions:

1. **An explicit out.** "If the input does not support a conclusion, say so and stop" —
   or a stated evidence bar. A fixed count is requested only where a fixed count is
   genuinely appropriate.
2. **A falsification line.** "State what would change this answer." An analysis that
   cannot say what would overturn it has not been done; it has been asserted.

This is the same principle Quote Triage is built on — *the model is allowed to say it
doesn't know* — applied to your own analysis rather than the customer's enquiry.

---

## What was cut, and why

| # | Original | Why it's gone |
|---|---|---|
| 2 | SWOT Analysis | SWOT is a filing cabinet, not an analysis. The prompt itself has to plead "avoid generic, one size fits all statements", which is a tell: the four boxes are what produce the generic output. Whatever you wanted from it, #6 and #9 below do better. |
| 6 | Pros and Cons Weighted | Strictly dominated by comparative analysis and cost-benefit. Three prompts for one job. |
| 9 | Competitive Positioning | Real work, wrong tool. Positioning needs market evidence a model does not have; without it you get plausible-sounding invention about competitors. |
| 14 | Trend Extrapolation | The most dangerous one on the list. Projecting a trend from a trades business's job volumes — seasonal, small-n, weather-driven — draws a confident line through noise. If you need a forecast, use a forecast method and state the interval. |
| 19 | Content or Copy Critique | Out of domain for this repository. |
| 20 | Decision Framework Application | A meta-prompt with no content of its own. Pick the actual framework instead. |

**#8 Sentiment and Tone Analysis** is repurposed rather than cut. As written it is a
literary exercise. As *enquiry triage* it does real work, and appears below as prompt 5.

---

## Group 1 — Discovery and diagnosis

### 1. Root cause breakdown

> Analyse the problem below and identify its root causes — as many as the evidence
> supports, and no more. If the input only supports one, give one. If it supports none,
> say so and tell me what you would need.
>
> For each cause: explain the mechanism by which it produces the symptom, state whether
> the input shows the cause is *present* or only that it *could* be, and note whether it
> interacts with any other cause listed. Rank by expected impact if fixed, and say which
> single fix you would do first.
>
> Finish with: what evidence would show this analysis is wrong?
>
> Problem: [insert problem]

*The change: no fixed count, cause-present versus cause-possible made explicit, and a
falsification line. The original's "top 3 to 5" is the failure mode described above.*

### 2. Current-state to future-state gap

> Compare the current state to the desired state described below. Identify the concrete
> gaps between them — not restatements of the difference, but the things that would
> actually have to change.
>
> For each gap, say what closing it takes: what gets built, what gets configured, what a
> person has to decide, and what has to be *removed* rather than added. Removal is
> usually the part that gets missed.
>
> Then prioritise by effort against impact, and be explicit about which gaps are cheap
> and cosmetic versus expensive and load-bearing.
>
> Current state: [insert]
> Desired state: [insert]

*Adapted for discovery work. The instruction about removal is deliberate — most
implementation plans are additive, and most real change requires turning something off.*

### 3. Performance diagnosis

> Given the operational metrics below, diagnose what is working and what is not.
>
> For each finding, state the likely cause and your confidence in it — and separate "this
> metric is bad" from "I know why this metric is bad". Those are different claims and the
> second is much harder.
>
> Prioritise by which changes would move the needle most, not by which are easiest to
> observe. Flag any metric that looks bad but is probably measuring the wrong thing, and
> any that looks fine but is hiding a distribution problem behind an average.
>
> Metrics: [insert data]

*The two additions — "bad" versus "I know why", and averages hiding distributions — are
where contact-centre metrics usually mislead. An average handle time of 9:40 tells you
almost nothing about the calls that ran thirty minutes.*

### 4. Categorisation and clustering

> Group the items below into categories. Derive the categories from the items rather than
> fitting the items into categories you already have in mind.
>
> State the criterion for each category in one line. Flag every item that is borderline or
> could sit in more than one group, and say which way you resolved it. If a category ends
> up with one item in it, say whether that is a real category or a leftover.
>
> Tell me how many items you could not confidently place.
>
> Items: [insert list]

*Useful for building a case-reason picklist or an enquiry taxonomy from real inbound
messages. The "could not confidently place" count is the number that matters — it is your
future "Other" bucket, and an "Other" bucket much over 15% means the taxonomy is wrong.*

### 5. Enquiry triage read *(repurposed from #8)*

> Read the customer message below and assess it on three axes, separately:
>
> 1. **Urgency** — is there a stated or implied safety issue, property damage in progress,
>    or a vulnerable person involved? Quote the exact words that indicate it.
> 2. **Emotional state** — frustrated, distressed, resigned, neutral. Quote the words.
> 3. **Completeness** — what does a tradesperson need to know that this message does not
>    say?
>
> Do not infer urgency from emotional intensity. A calm message can describe a gas leak and
> an angry one can describe a dripping tap. If the two axes disagree, say so explicitly.
>
> Message: [insert text]

*Separating urgency from emotion is the whole point. Conflating them is the specific
failure that gets an after-hours system to escalate the shouting customer and book a
Tuesday slot for the quiet one.*

---

## Group 2 — Decisions

### 6. Comparative analysis

> Compare the options below against these criteria: [list criteria].
>
> Lead with a clear table. Then, underneath, write the part a table cannot hold: the
> tradeoffs, and specifically any place where an option wins on a criterion in a way that
> is technically true and practically misleading.
>
> End with one paragraph naming which option wins overall and — separately — the conditions
> under which a different option would win instead. If the options are close enough that
> the criteria cannot separate them, say that rather than inventing a margin.
>
> Options: [insert options]

### 7. Cost-benefit breakdown

> Analyse the costs and benefits of the decision below.
>
> Cover the quantifiable side, then the harder side — reputation, morale, opportunity cost,
> the cost of being wrong — and label clearly which is which. Do not convert soft factors
> into invented numbers to make them comparable.
>
> Include ongoing costs, not just setup: maintenance, the second vendor, the thing someone
> has to check every month. These are what turn a good decision into a bad one eighteen
> months later.
>
> Weigh them honestly and state whether the benefits justify the costs, including any
> conditions under which that answer flips.
>
> Decision: [insert decision]

*The ongoing-cost instruction is there because setup costs are visible and running costs
are not. A second API vendor is not a one-off — it is a key to rotate, a bill to reconcile,
and something that can be down at 11pm.*

### 8. Stakeholder impact

> Analyse how the decision below affects each of these groups: [list groups].
>
> For each: the direct effect, then the second-order effect that shows up a month later.
> Say which groups benefit, which bear a cost, and — importantly — which bear a cost that
> is invisible to whoever is making the decision.
>
> Name who is most likely to resist, and state their strongest legitimate objection as they
> would state it, rather than as a problem to be managed.
>
> Decision: [insert decision]

*"Strongest legitimate objection, in their words" is the rewrite that makes this useful.
The original's framing — how conflicts "might be handled" — quietly assumes the decision is
right and resistance is friction.*

### 9. Risk assessment

> Identify the key risks in the situation below, going past the obvious ones.
>
> For each: likelihood, severity if it happens, and whether you can detect it early or only
> after the fact. That third one matters more than it looks — an undetectable moderate risk
> often beats a detectable severe one.
>
> Suggest a concrete mitigation, and be honest about which risks you can only accept. Rank
> so it is clear which few deserve attention first, and say which you would not spend
> anything on.
>
> Situation: [insert situation]

### 10. Scenario planning

> Outline three plausible futures for the situation below: best case, worst case, most
> likely.
>
> For each: the key drivers that would produce it, roughly how likely it is, and the early
> warning signs that it is starting to unfold — signs observable now or soon, not in
> hindsight.
>
> If the best and worst cases are far apart, name the single biggest source of that spread.
>
> Situation: [insert situation]

---

## Group 3 — Building AI tools

These five have no equivalent in the source list. They are the ones this repository
actually needs.

### 11. Eval case-set generation

> I am building [describe the tool]. Generate a set of test cases for it.
>
> Cover: the straightforward path, the realistic-messy path, the ambiguous cases where two
> answers are defensible, and the cases where the correct behaviour is to refuse or escalate
> rather than answer.
>
> For each case give the input, the expected output, and — most importantly — a one-line
> statement of *what failing this case would mean*. A case whose failure has no consequence
> is not worth running.
>
> Then tell me which failure modes you could not construct a case for.
>
> Tool: [insert description]

*The last line is the valuable one. The failure modes you cannot write a test for are the
ones that will find you in production.*

### 12. Escalation boundary review

> Review the escalation rules below for an automated system that handles customer contact.
>
> For each rule: what does it catch, and what does it miss that a reasonable person would
> expect it to catch? Then work the other direction — what does it catch that it shouldn't,
> and what does that false positive cost?
>
> Identify any situation where the system would proceed on its own and a person would not.
> Treat every one of those as a defect until argued otherwise.
>
> State explicitly what happens when the rules cannot be evaluated at all — a lookup fails,
> a document is missing, the input is unparseable. If the answer is anything other than
> "escalate", explain why.
>
> Rules: [insert rules]

*Fail-closed is the entire content of this prompt. A safety path that degrades to the
model's own judgement when retrieval fails has no safety path.*

### 13. Data model critique

> Review the data model below against the process it is meant to support.
>
> Look specifically for: two different concepts sharing one name, one concept split across
> two objects, a field whose meaning depends on the value of another field, and anywhere a
> required relationship is enforced only by convention.
>
> For each finding, describe concretely the wrong answer a user or an automation would
> eventually get. "This is denormalised" is not a finding; "the agent will confirm coverage
> on an expired warranty because both objects are called entitlement" is.
>
> Model: [insert model or ERD]

*The example is not hypothetical. A commercial warranty entitlement and a service-level
Entitlement are different things that share a name, and conflating them is the classic
error on exactly this kind of build.*

### 14. Tool surface review

> Review the tool definitions below, which will be exposed to a model.
>
> For each tool: is the description precise enough that a model picks it for the right job
> and not a neighbouring one? Ambiguity between two tool descriptions is a retrieval bug,
> not a documentation nit.
>
> Then, separately, for every tool that writes: what is the worst outcome a caller could
> produce using only valid arguments? Validation that checks types only is not validation.
>
> Tools: [insert definitions]

*Discovery is part of retrieval quality. A vague tool description makes the model choose
badly, and no amount of sophistication downstream recovers from picking the wrong tool.*

### 15. Cost-shape check

> For the workload described below, estimate the token profile: roughly how many input and
> output tokens per call, how many calls per unit of work, and where the volume actually is.
>
> Then tell me which parts of the prompt are byte-identical across calls and therefore
> cacheable, whether the work is latency-sensitive or could run as a batch, and which steps
> genuinely need the most capable model versus which are classification a small model does
> as well.
>
> Give the answer as a shape — where the money goes — before any total.
>
> Workload: [insert description]

---

## Group 4 — Checking your own work

The three strongest prompts on the original list, sharpened, plus one it lacks. Run these
on your own output, not only on other people's.

### 16. Assumption audit

> Read the plan or argument below and list every assumption it depends on, including the
> ones so obvious nobody wrote them down.
>
> For each: what happens if it is false, how much of the conclusion collapses, and how you
> would find out cheaply whether it holds.
>
> Rate each on two axes separately — how likely it is to be wrong, and how much damage it
> does if it is. The dangerous ones are high-damage regardless of likelihood, and they are
> usually the ones nobody thought to write down.
>
> Content: [insert content]

*The best prompt on the original list. The addition is the cheap-test question: an
assumption you can check for twenty dollars should be checked, not rated.*

### 17. Bias and blind spot check

> Review the analysis below critically. Identify potential biases, unexamined assumptions,
> and blind spots — including whose perspective is missing entirely.
>
> Pay particular attention to: conclusions that happen to be convenient for whoever wrote
> this, evidence that would have been sought if the conclusion were the opposite, and places
> where confident language is doing work that evidence should be doing.
>
> Suggest what additional information would meaningfully change the analysis — and say if
> the honest answer is that nothing would, because that is worth knowing too.
>
> Content: [insert content]

### 18. Claim audit *(from #11, Argument Deconstruction)*

> Break the document below into its core claims, the evidence offered for each, and the
> logic connecting them.
>
> Identify: claims presented as evidence, unsupported leaps, places where a counterargument
> would be easy, and any point where the whole thing rests on one shaky link. Note whether
> the conclusion survives if that link fails.
>
> Distinguish claims that are false from claims that are merely unsupported — those need
> different responses.
>
> Document: [insert]

*Renamed and pointed at what you will actually use it on: a vendor proposal, an
implementation estimate, a business case. The false-versus-unsupported distinction is what
makes it usable in a client conversation rather than merely satisfying.*

### 19. Falsification pass

> Here is a conclusion I have reached: [insert conclusion].
>
> Do not evaluate whether it is right. Instead, describe the world in which it is wrong.
> What would have to be true? What evidence would I see? Is any of that evidence something
> I could check today?
>
> Then tell me whether the case for it is strong, or merely unchallenged.

*No equivalent on the source list, and the one to reach for most often. "Strong versus
unchallenged" is the distinction that catches an argument nobody has pushed on — which is
most of them.*

---

## Using these well

**Put the content last.** Every prompt here ends with the `[insert ...]` slot on purpose.
Stable instructions first, variable content after, keeps the cacheable part of the prompt
at the front — a cache hit needs a byte-identical prefix, so a timestamp or a per-request
ID near the top silently invalidates everything after it.

**Match the model to the job.** The Group 4 prompts are judgement work and deserve the most
capable model, because judgement is the entire output. Prompt 4 at volume is
classification, where Haiku 4.5 is roughly a fifth the price of Opus 5 and very likely
sufficient. Measure rather than assume — that is what the eval harness is for.

**Never paste real customer data into any of these.** This repository is explicit that no
real customer data appears anywhere in it, and that rule does not stop at the code. Redact
names, addresses and contact details, or use synthetic cases. Prompt 5 in particular invites
exactly the wrong instinct.

**The output is a draft, not a finding.** Every prompt here asks for confidence levels and
falsification conditions because they make the output checkable. That only helps if you
read those parts, and they are the parts easiest to skip.
