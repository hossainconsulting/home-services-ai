# Typed decision pilot for Quote Triage

**Status:** Proposed design, 26 September 2026. No Jev integration, API account, benchmark or production workflow has been verified. The scenarios use fictional home-service enquiries.

## Decision

Evaluate a typed decision model such as TypeSafe AI's Jev for the narrow, repeated classification step in [Quote Triage](../01-quote-triage/). Keep extraction of free-text job details and customer-facing writing in a separate validated workflow. Reuse the existing [Eval Harness](../05-evals/) rather than creating a duplicate project.

The supplied Jev infographic depicts typed answers, multiple questions in one pass and probability-aware routing. Its “200x faster / 400x cheaper” figures are vendor claims for specific comparisons, not measured outcomes for this portfolio.

## Pilot contract

Given a synthetic enquiry and any known booking context, ask bounded questions in one request where supported:

| Field | Allowed values | Handling |
| --- | --- | --- |
| trade | plumbing, electrical, HVAC, cleaning, landscaping, other | Ask for clarification on other or missing detail |
| urgency | emergency, soon, routine, unclear | Do not promise a response time from a model label |
| safety_flag | yes, no, uncertain | Escalate yes or uncertain according to a written safety policy |
| quote_ready | yes, no | Validate required fields in code before proceeding |
| owner | intake, human_review | Code selects the next action |

Record selected values, option probabilities if supplied, model/version, timestamp, policy version and final disposition. Treat a confidence number as a routing signal only after calibration against labelled cases. In particular, a model's reported confidence need not equal the chance that its chosen label is correct.

## Guardrails

- Check explicit rules first: emergency keywords and safety concerns trigger human review; do not let a classifier suppress them.
- Code owns thresholds, required-field checks, tool permissions and approval gates. The CEO approves outbound quotes, customer messages, bookings and production changes.
- Route missing, conflicting, out-of-scope or low-confidence cases to clarification or human review.
- Use synthetic examples; never put real customer details into a third-party model without a data-flow review and approval.
- Keep billing, refunds, electrical hazards and medical-like safety advice out of autonomous action.

## Evaluation before implementation claim

1. Label a synthetic set including ambiguous trades, after-hours emergencies, incomplete addresses, prompt injection and contradictory details.
2. Compare a deterministic baseline, an existing LLM structured-output baseline and Jev on the same cases.
3. Measure per-field precision/recall, missed safety escalations, clarification rate, calibration, p50/p95 latency and actual cost at a stated date and workload.
4. Tune thresholds on a separate validation set and report failures. A missed safety escalation blocks automatic routing.
5. Only then decide whether an API dependency offers enough benefit for this project. Document any provider version, privacy review and spending approval.

**Sources:** [TypeSafe AI introduction](https://typesafe.ai/blog/introducing-system-one-models-and-jev), [TypeSafe workflow evaluations](https://evals.typesafe.ai/). Vendor material explains the proposed capability; portfolio measurements remain to be collected.

## Agent-loop assessment from the second infographic

The nine examples in the second image are possible decision points, not a requirement to add nine model calls to every turn. Apply them selectively:

| Image decision | Home Services AI application | Status or boundary |
| --- | --- | --- |
| Input screening | Treat suspicious text as untrusted; test injection examples in Eval Harness | Classifier may flag cases, but cannot be the sole injection or safety barrier |
| Retrieval decision | Retrieve approved job/rate/policy context only when the task needs it | Candidate for later evaluation; authorization and source scoping remain in code |
| Composite scoring | Rank non-safety operational priority from separately defined signals | Defer until weights, labels and benefit are specified; safety escalation is a hard rule |
| Tool call gating | Check permission, schema, user confirmation and business policy before Jobs MCP writes | Deterministic enforcement; model advice cannot authorize a write |
| Stop check | Detect likely completion of a bounded task | Optional hint; code also enforces maximum turns, timeout and final state |
| Model routing | Select an appropriate model for extraction or drafting after measuring quality and total cost | Later optimization; no automatic provider switching now |
| Grounding check | Check whether quote claims have supporting source records | Use source references and deterministic field validation; classifier can flag review cases |
| Memory write filter | Propose whether task context is useful to retain | Existing Codex memory governance controls persistence; no model can write it unaudited |
| Confidence handoff | Route ambiguous classifications to clarification or human review | Measure calibration on labelled cases; CEO approval still applies to external actions |

The image's examples of blocking an injection at probability 0.94, approving a tool call, or acting on a refund at a fixed confidence threshold are illustrations only. They do not establish safe thresholds or authorization for this portfolio. Dates, counting and invoice arithmetic belong in code; open-ended customer writing belongs in a reviewed generation step.

**Next implementation slice:** Write the Quote Triage synthetic evaluation set and deterministic routing baseline first. Add Jev as a candidate only after data-flow, access and spending review. In the fictional Meridian Field Services Agentforce scenario, cite this pilot as an architectural option; use Salesforce-native permissions, Flow validation and human escalation as the actual controls. The Salesforce Integration Lab can later test a narrow API adapter if the pilot wins its comparison.
