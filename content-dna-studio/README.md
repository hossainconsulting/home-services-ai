# Content DNA Studio

Paste transcripts from any YouTube channel. Get back the channel's content DNA,
a hook swipe file, a content pillar map, the audience's own language, viral
structure patterns, a 90-day calendar, a repurposing package, and a competitor
gap analysis. Then turn any transcript or report into platform-native copy for
Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Google Business Profile,
Pinterest, an SEO article brief, and a Google Ads campaign.

It is a small multi-tenant SaaS: accounts, workspaces, plan limits, usage
metering, streaming output. One process, one SQLite file, no build step.

> **Status: working, not yet run against the live API.** Every code path is
> exercised by the test suite in mock mode. The Anthropic call itself follows
> the current SDK contract but has not been executed with a real key from this
> environment. First real run: watch the server log for a 400 from the API and,
> if the beta fallback header is rejected, set `CLAUDE_FALLBACKS=off`.

## What it does

**Eight analyses**, each a single Claude call over the whole selected corpus:

| # | Module | Needs | Output |
|---|---|---|---|
| 1 | Channel DNA Extraction | 2+ transcripts | Three core beliefs, vocabulary, metaphors, argument style, emotional after-effect, a 60-word DNA statement |
| 2 | Hook Swipe File | 2+ | Every opening hook classified by mechanism, then 25 reusable templates with an example for your niche; inspired templates are labelled |
| 3 | Content Pillar Map | 3+ | Five provable pillars with evidence, eight unexplored opportunities scored on frustration, urgency, fit, alignment |
| 4 | Audience Language Mining | 2+ | Frustrations, desires, fears, objections, questions, identity statements; quoted phrase kept separate from interpretation |
| 5 | Viral Pattern Recognition | 3+, metrics optional | Top performers deconstructed with timestamps, repeatable patterns, a timed ten-minute blueprint. Says so when metrics are missing |
| 6 | 90-Day Content Calendar | 3+ | 13 weekly ideas with title, two-sentence hook, argument, problem, belief challenged, format, CTA; recommendations labelled |
| 7 | Repurposing Engine | 1+ | Five transcripts turned into a LinkedIn post, a Facebook thread opener, three 60-second scripts, an email subject line |
| 8 | Competitor Gap Analysis | 4+, 2+ channel labels, Pro plan | Table stakes, single-owner differentiators, unsolved problems, ten ranked opportunities with angles and hooks |

**Ten distribution channels.** Pick a transcript or a finished analysis and any
mix of channels; one call returns a document with a section per channel that
the UI splits into tabs with copy buttons. The channel specs live in
`src/prompts/channels.ts` and are the place to tune formats.

**Transcripts** come in two ways: a YouTube URL (captions fetched through the
unofficial caption endpoint, which fails on videos without captions and
whenever YouTube changes its page) or pasted text. Paste accepts the YouTube
"Show transcript" panel, SRT/VTT, or plain prose, and is normalised to
timestamped lines so the analyses can cite moments.

**Plans.** Free, Pro and Agency are defined in `src/plans.ts` and enforced on
workspaces, transcripts per workspace, analyses per month, distribution
packages per month, and access to the competitor module. There is no payment
integration: an operator changes a user's plan through the admin endpoint.
Stripe is the obvious next step and the plan table is shaped for it.

## Run it

```bash
cd content-dna-studio
npm install
cp .env.example .env        # set ANTHROPIC_API_KEY, SESSION_SECRET
npm start                   # http://localhost:3000
```

Node 22.13 or newer (it uses the built-in `node:sqlite`). To work on the UI
without spending money:

```bash
CLAUDE_MOCK=1 npm start
```

Mock mode returns a placeholder document with the same headings the real
prompt asks for, so channel splitting, rendering and metering all run.

```bash
npm test          # 33 tests: prompts, transcript parsing, plans, full API flow in mock mode
npm run typecheck
```

### Give yourself the Pro plan

```bash
# .env
ADMIN_EMAILS=you@example.com
```

Sign up with that email, then:

```bash
curl -X POST http://localhost:3000/api/admin/users/plan \
  -H 'content-type: application/json' -b 'cds_session=<your cookie>' \
  -d '{"email":"you@example.com","plan":"pro"}'
```

Or from the browser console while signed in:
`fetch('/api/admin/users/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'you@example.com',plan:'pro'})})`.

## How the Claude call is built

`src/claude.ts` and `src/runs.ts`.

- Model `claude-opus-5` by default (`CLAUDE_MODEL` to change). Adaptive
  thinking, effort `high` for analyses, `xhigh` for the competitor module,
  `medium` for distribution packages.
- Streaming (`messages.stream` and `finalMessage()`), relayed to the browser as
  server-sent events. The client can cancel; the abort reaches the API call.
- **Prompt caching on the corpus.** The system prompt is byte-stable and the
  transcript corpus is a second system block with `cache_control`. Running all
  eight modules on the same transcripts within five minutes pays for the corpus
  once and reads it from cache seven times at a tenth of the price.
- **Server-side refusal fallback** on by default (`fallbacks: "default"` with
  the `server-side-fallback-2026-07-01` beta). `CLAUDE_FALLBACKS=off` disables it.
- `stop_reason` is checked: `refusal` marks the run refused with the category,
  `max_tokens` marks it truncated. Both keep whatever text arrived.
- Usage is metered per run into `usage_events` with an estimated USD cost from
  the price table in `src/pricing.ts`.

### What a run costs

A ten-transcript corpus is roughly 60k to 120k tokens. On Opus 5 that is about
$0.30 to $0.60 of input the first time and about $0.03 to $0.06 from cache after
that, plus $0.10 to $0.40 of output per analysis. Running all eight modules on
one channel lands around $2 to $4. Set a spend limit in the Anthropic Console
before pointing real users at this.

## Security notes

- Passwords are scrypt-hashed. Sessions are random tokens in HttpOnly,
  SameSite=Lax cookies; `Secure` is added when `NODE_ENV=production`.
- Every read and write checks the row belongs to the signed-in user.
- Rendered Markdown passes through DOMPurify in the browser and the CSP allows
  scripts from the origin only.
- Login attempts are throttled per IP and email, in memory.
- Rate limits and concurrency (`MAX_CONCURRENT_RUNS`, default 2 per user) are
  per process. Behind a load balancer, move both to a shared store.

## Layout

```
src/
  server.ts          Node entry: static files, vendored marked + DOMPurify
  app.ts             Hono app, security headers, route mounting
  config.ts          Environment
  db.ts              node:sqlite schema (users, sessions, workspaces, sources, analyses, distributions, usage_events)
  auth.ts            Hashing, sessions, requireUser, login throttle
  plans.ts           Plan table and limits
  pricing.ts         Cost estimate per model
  transcripts.ts     YouTube id parsing, caption fetch, paste normaliser
  claude.ts          The API call, streaming, error mapping, mock mode
  runs.ts            Quota checks, prompt assembly, persistence, metering
  prompts/system.ts  Stable system prompt, brand block, corpus block
  prompts/modules.ts The eight analyses
  prompts/channels.ts The ten channel specs and the section splitter
  routes/            auth, workspaces, sources, analyses, distributions, account
public/              index.html, styles.css, app.js (no framework, no build)
test/                node:test suites
```

## Roadmap, honestly

- Stripe Checkout and a webhook that writes `users.plan`.
- A channel importer that lists a channel's recent videos so you do not paste
  URLs one at a time. The YouTube Data API needs a key and a quota; the
  unofficial route is fragile.
- Scheduled re-runs and a diff view, so a creator can see how their DNA drifts
  quarter to quarter.
- Direct publishing. Every platform here has an API; none of them are wired.
  The copy buttons are the integration for now.
