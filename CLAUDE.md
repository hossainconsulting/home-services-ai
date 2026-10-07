@AGENTS.md

# Home Services AI project guidance

Read README.md and EVIDENCE.md before changes. Preserve dated evidence and distinguish planned scope, source implementation and verified behaviour. The README records a planning/scaffold baseline dated 16 September 2026; inspect current files before relying on it. Do not report the five tools as working without implementation and test evidence.

## Design constraints

- Quote Triage must represent unknown information explicitly rather than invent it.
- Jobs MCP has one planned booking write tool. Validate availability, dates and qualifications; document its threat model. Additional write tools require a design decision.
- After-Hours Agent must escalate safety-critical scenarios; include those cases in the evaluation set.
- Write scope, design decisions and limitations before implementation, and update status only with supporting evidence.

## Cost, credentials and demonstrations

Estimate and limit API spend before runs. Verify current provider controls, prices and model/API support rather than promising a fixed budget or guaranteed hard cap. Evaluate batching, stable-prompt caching and routing by measured difficulty where appropriate. Record actual cost and latency.

Never commit credentials, key files or environment secrets, or echo them into transcripts. Rotate any exposed key. Recorded demonstrations are the intended presentation format; a Git push does not authorise a hosted deployment.

.claude/settings.json combines the existing marketplace/plugin configuration with the branch permission lists. Parsing it does not prove plugin installation or runtime permission enforcement. docs/fde-roadmap.md is historical planning guidance, not proof that its skills gaps are closed.
