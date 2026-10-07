# Project evidence

Configured on 2026-09-24 at Hemayet's request.

## Where to save it

Keep existing evidence layouts. Otherwise use
`evidence/YYYY-MM-DD/task-name/README.md` with supporting files alongside it.
For the five VMs, use `vm-lab/evidence/<vm-name>/` within the vm-lab repository
(repository-relative path: `evidence/<vm-name>/`). Use the actual hostname;
preserve the documented Ubuntu baseline label correction.

## Record for each substantive task

- Date, task or requirement, and actual environment/target.
- What changed and why; before/after evidence when it demonstrates the result.
- Exact validation command or procedure, observed result and exit status when
  available. Label checks not run, failures, simulations and unknowns explicitly.
- Relevant screenshots, sanitized output or exported configuration. Capture
  only material needed to substantiate the task, not entire sessions by default.
- Remaining issues and limitations, with related issue/PR links when available.

Do not fabricate evidence or describe a template as an executed test. For
documentation-only work, content/link review and diff checks may be sufficient.
Preserve historical records; add dated corrections instead of rewriting history.
Never publish credentials, tokens, private keys, .env files, Salesforce auth
caches, raw shell history, or personal/customer information. Review and redact
screenshots and command output before staging, including in private repositories.

## Publish and verify

1. Read repository instructions and inspect Git status and the existing remote.
2. Save and review task evidence; stage only the intended files.
3. Commit and push through the repository's established branch/PR workflow.
   Do not force-push, discard other work, or bypass branch protection.
4. Verify the commit and evidence paths on GitHub. Report a commit or PR link
   and summarize validation and any remaining limitations.
5. If uploading is blocked, preserve local files and explicitly report that
   they are not uploaded, with the exact blocker.

These are agent workflow instructions, not an unattended background uploader.
Existing clones need to fetch/pull these files safely before using them. New
projects should adopt this policy when their repository is established.

## Evidence note template

```markdown
# Task title
Date/time and timezone:
Requirement or issue:
Environment/target:
Starting state:
Changes made:
Validation procedure/command:
Observed result and exit status:
Supporting files:
Limitations / checks not run:
Related issue/PR:
```
