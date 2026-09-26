# Claude Code contributor credit
Date/time and timezone: 2026-09-26 (Australia/Sydney)
Requirement or issue: Owner asked to credit Claude Code as a contributor in all repositories.
Environment/target: home-services-ai (GitHub, branch main)
Starting state: README.md present, including the Codex "AI contributor credit" section
Changes made:
- README.md: added Claude Code to the existing "AI contributor credit" section (added by Codex in the preceding commit); owner paragraph now covers both credits.
- CLAUDE.md: added; loads AGENTS.md so Claude Code follows the same repository rules as other agents.
Validation procedure/command: Reviewed the diff (`git diff --check`, content read-through); confirmed repository collaborators are unchanged (owner only) via the GitHub API.
Observed result and exit status: Diff check passed (exit 0); no collaborator or permission changes.
Supporting files: none (documentation-only change).
Limitations / checks not run: Documentation-only; no build or tests needed. The credit describes an AI tool used through the owner's account and does not grant it any GitHub access.
Related issue/PR: none
