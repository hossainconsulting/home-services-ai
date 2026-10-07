# PR 1 guidance conflict resolution

Date: 2026-10-07, Australia/Sydney.
Target: home-services-ai PR #1, claude/environment-layers-ykadkb.
Local Windows clone. Original head 6bc117a; merged main a8225e9.

Resolved CLAUDE.md and .claude/settings.json add/add conflicts. Retained main's
AGENTS import and marketplace/plugin fields; combined branch permission lists.
Reconciled design constraints, evidence discipline, secret handling, intended
recorded demos and cost measurement. Kept the September scaffold state dated
instead of presenting it as a new audit. Avoided fixed-budget/hard-cap claims.
FDE roadmap remains unchanged historical planning material.

Validation:
- Node JSON parse and assertion of preserved typesafe plugin configuration:
  passed, exit 0.
- Manual content review against current root README and both conflict sides.
- git diff --cached --check: passed, exit 0.
- git diff --name-only --diff-filter=U: empty, exit 0.
- Reviewed edits/evidence for secrets/private data; none introduced.

Limitations: documentation/settings reconciliation only. No application tests,
API calls, plugin installation or runtime permission-enforcement test. Roadmap
claims and sibling project status not independently audited. No deployment,
GitHub merge or draft-status change by the agent. Existing evidence preserved.
