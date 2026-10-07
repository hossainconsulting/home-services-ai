# RAG maturity: the ladder, and where these five tools actually sit

Two parts. The first explains the seven-level RAG maturity model on its own terms.
The second uses it as a yardstick against the five projects in this repository and
reaches an uncomfortable conclusion: **four of the five are not RAG systems at all,
and the fifth should stop climbing at about level two.**

That conclusion is the point of writing this down. A maturity ladder invites you to
climb it. Most of the time the correct move is to work out which rung your problem
actually needs and stop there.

> **Status honesty.** Every project in this repository is currently marked *Not
> started* and has no code behind it. Part 2 therefore grades **designs**, not
> running systems. When code exists, the assessments here need re-checking against
> what was actually built — designs and builds diverge, and the whole value of this
> document is that it is not flattering.

---

## Part 1 — The seven levels

### The shape of it

> Search → Retrieve → Rank → Reason → Act

Each level adds a capability the level below it lacks. It also adds a component that
can fail, a latency budget, a cost line, and something new to evaluate. The ladder is
usually presented as pure gain. It is not.

### Level 1 — Keyword search

Exact matching, metadata filters, access control. BM25, `LIKE`, a `WHERE` clause, a
full-text index.

**What it is good at:** identifiers, codes, product names, part numbers, anything a
human typed exactly. Precise, debuggable, cheap, and it never surprises you.

**Where it fails:** synonyms and paraphrase. "Hot water not working" will not match a
document titled "Cylinder fault diagnosis."

**Do not skip past it.** If your users search by job number, rate code, or customer
surname, level 1 *is* the finished system. Vector search over exact identifiers is
strictly worse — it will confidently return the nearly-right record.

### Level 2 — Vector search

Text becomes embeddings; retrieval becomes nearest-neighbour search in that space.
Retrieves on meaning rather than shared words.

**What it buys:** the paraphrase problem, solved. The customer's words no longer have
to match the document's words.

**What it costs:** an embedding model, a vector store, a chunking strategy, and a
re-embedding job every time either the model or the corpus changes. Chunking is the
part everyone underestimates — chunk too small and you retrieve fragments without the
context that made them meaningful; too large and the signal drowns.

**The failure mode is the dangerous one:** vector search always returns something. It
has no concept of "nothing here is relevant." Every result comes back with a
similarity score that looks like confidence and is not.

**Anthropic-specific:** there is no first-party embedding model. The documentation
[says so directly](https://platform.claude.com/docs/en/build-with-claude/embeddings)
and points at Voyage AI (`voyage-4` family; `voyage-context-4` for chunk-level
embeddings that carry document context). So level 2 is not one more API call on an
existing key — it is a second vendor, a second key, a second bill, and a second thing
that can be down at 11pm. That cost is invisible on the ladder and real in the budget.

### Level 3 — Hybrid search

Run keyword and vector retrieval together, merge the result sets, filter by metadata,
optionally expand the query first.

**Why it is usually right:** the two methods fail differently. Keyword misses
paraphrase; vector misses exact identifiers. Together they cover each other. For most
document corpora this is the level with the best ratio of quality gained to
complexity added.

**What it costs:** fusion is a real decision, not a detail. Reciprocal rank fusion,
weighted scores, or a filter-then-rank pipeline all behave differently, and you now
have a knob you cannot tune without a measurement set.

### Level 4 — Reranking

Retrieve generously — say the top 50 — then have a cross-encoder score each candidate
against the query and keep the best handful. The retriever optimises for recall; the
reranker for precision.

**Why it earns its place:** it is the cheapest large quality win above level 3,
because it attacks the specific failure that hurts most — right document present in
the candidate set, buried at rank 19, never reaching the model.

**What it costs:** one more network call in the hot path, per query, with its own
vendor and latency. Voyage's `rerank-2.5` is the obvious pairing if you are already
using them for embeddings.

### Level 5 — Advanced RAG

A grab bag of production concerns rather than a single technique: query
decomposition, multi-hop retrieval, dynamic chunking, citations, observability,
continuous evaluation.

Two of those matter more than the rest, and both are available as API primitives
rather than pipeline you have to build:

**Citations.** [Search result content
blocks](https://platform.claude.com/docs/en/build-with-claude/search-results) let
Claude cite your own content the way it cites web search results. Standard Messages
API — **no beta header** — supported on all active models except Claude Haiku 3.
Return them from a custom tool for dynamic retrieval, or put them straight into a user
message for pre-fetched content:

```json
{
  "type": "search_result",
  "source": "policy/emergency-criteria",
  "title": "Emergency criteria — gas",
  "content": [{ "type": "text", "text": "Any reported gas smell is an emergency..." }],
  "citations": { "enabled": true }
}
```

`source`, `title` and `content` are required; `content` is text only. Citations are
**off by default**, and every search result in a single request must use the same
setting. Blocks accept `cache_control`, so a stable corpus can be cached across
requests.

**Chunking.** The API chunks plain text and PDF documents into sentences for you.
Custom content documents skip that and cite your blocks as supplied — which is how you
control granularity for bullet points, transcripts, or pre-chunked RAG output.

**One constraint worth knowing before you design around it:** citations and structured
outputs are mutually exclusive. Enabling citations on any `document` or
`search_result` block *and* passing `output_config.format` returns a **400**, because
citations interleave citation blocks with text and that cannot satisfy a strict JSON
schema. If a tool must both cite its sources and return schema-valid JSON, that is two
calls, not one. (The documented conflict is with `output_config.format` specifically.
Whether tool-level `strict: true` is affected is not stated — test it before relying
on either answer.)

**And the unglamorous half of level 5 is the half that matters.** Observability and
continuous evaluation are what tell you whether levels 2 through 4 helped. Teams that
add reranking without an eval set have added cost and latency and *believe* they added
quality.

### Level 6 — GraphRAG

Extract entities and relationships into a graph, then traverse it. Local search
answers questions about one entity's neighbourhood; global search summarises across
communities in the graph.

**When it genuinely wins:** questions whose answer is not in any single document —
"which suppliers are exposed to this component," "how does this policy interact with
that contract." Connected knowledge, not retrievable knowledge.

**When it is a trap:** when your relationships already live in a relational database.
A jobs table with a customer foreign key *is* a graph, queryable with a join. Building
an extracted knowledge graph on top of clean structured data is expensive
re-implementation of a `JOIN`.

Graph construction is also the most brittle step on the ladder: entity extraction and
resolution are themselves error-prone model tasks, and errors compound through
traversal.

### Level 7 — Agentic RAG

The model plans its own retrieval: decides what to look for, picks the tool, queries
several systems, keeps memory across turns, notices when a result is wrong and tries
again, and escalates to a human when it should.

**What changes:** retrieval stops being a fixed pipeline that runs before generation
and becomes a decision the model makes during it. That is a genuine step change, and
it is the level where the safety questions get serious — an agent that retrieves can
also act, and every write path is now reachable by a planner you do not fully control.

**What it does not require:** levels 2 through 6. An agent choosing between three
exact-match SQL tools is a level 7 system doing level 1 retrieval, and for structured
data that is exactly right.

---

## Where MCP fits

MCP is the plumbing under level 7, and it is worth being precise about what it does
and does not provide.

The protocol gives you a **host** owning conversation state and user consent, a
**client** that routes and formats calls, and **servers** that expose tools and
resources with schemas. The client discovers what a server offers, the model chooses
among the discovered tools, calls arrive as structured JSON arguments, and results
return as grounded context.

Two things follow:

**MCP is a transport and discovery protocol, not a retrieval strategy.** It
standardises how a model finds out what it can call and how results come back. What
sits behind the tool — a keyword index, a vector store, a graph, a plain SQL query —
is entirely your choice, and MCP is indifferent to it.

**So exposing an MCP server does not put you at level 7.** Level 7 is the model
*planning* retrieval — choosing, chaining, self-correcting. A single MCP tool called
in a fixed sequence is a workflow with good plumbing. That is often the better system;
it is just not the top of the ladder, and calling it that would be flattering
ourselves.

---

## Part 2 — Where these five tools sit

| # | Project | Retrieval shape | Level | Verdict |
|---|---------|-----------------|-------|---------|
| 1 | Quote Triage | Extraction from supplied text | — | Not retrieval |
| 2 | Notes to Invoice | Exact lookup, rates table | 1 | Correct at 1; do not climb |
| 3 | Jobs MCP Server | Structured queries, one write path | 1 over 7 plumbing | Correct pairing |
| 4 | After-Hours Agent | Safety policy corpus + job data | 1–2, needs citations | The only real RAG surface |
| 5 | Eval Harness | — | — | The thing that licenses climbing |

### 1. Quote Triage — not a RAG system

A messy enquiry goes in, a structured job spec comes out. Everything the model needs
is in the input. There is no corpus, so there is no retrieval, so the ladder does not
apply.

The design decision the README already commits to — *the model is allowed to say it
doesn't know* — is the same instinct that makes RAG work, applied without retrieval.
Missing information is a first-class output rather than something to invent. A system
that says "I need to ask the customer which suburb" is doing the honest thing that a
vector search, which always returns its nearest neighbour, structurally cannot.

**The only retrieval that would help:** checking the enquiry against a service-area and
capability list — is this suburb covered, do we do commercial gas fitting. That is a
short list with exact-match semantics. **Level 1, permanently.**

### 2. Notes to Invoice — level 1, and climbing would be a regression

The rates table is structured data with exact-match semantics. "Standard call-out fee"
is a row, not a passage. Level 1 is not a stepping stone here; it is the ceiling and
the floor.

Embedding a rates table would actively make this worse. The nearest neighbour to "hot
water cylinder replacement" might be "hot water cylinder service" — plausible, similar,
and a different price on an invoice a customer receives. The synonym problem ("call
out" / "callout" / "attendance fee") is real, and the fix is an alias column, not a
vector index.

Worth noting that this project's stated rule — **don't let the model do arithmetic** —
is the same rule as *don't let the model generate the rate*. Both say: the number comes
from the system of record, and the model's job is to select and assemble, never to
produce. That is the grounding principle the entire RAG ladder exists to serve, and
here it is satisfied at level 1 with a lookup table.

### 3. Jobs MCP Server — level 1 retrieval on level 7 plumbing

This is the pairing the ladder makes look wrong, so state it plainly: **the transport
is state of the art and the retrieval is deliberately primitive, and that is correct.**

Jobs, customers and schedules are relational. Retrieval means "jobs for customer X in
date range Y" — a `WHERE` clause. Semantic similarity over a jobs table would return
records that are *like* the one asked for, which for scheduling is not a soft failure
but a wrong answer.

The real work here is the part the ladder does not measure at all. The README already
names it: read tools are easy, and designing a booking path an agent cannot abuse — no
double-booking, nothing in the past, no unqualified technician — is where the effort
goes. Level 7 hands a planner the ability to act, so the tool surface becomes the
security boundary. A documented threat model is worth more than any amount of
retrieval sophistication.

**One thing the MCP layer does add over a bare database:** schemas and descriptions.
The model chooses tools from what discovery returns, so tool descriptions are part of
retrieval quality. A vague description is a retrieval bug.

### 4. After-Hours Agent — the only genuine RAG surface here

This project has an actual corpus. Deciding whether an 11pm message is an emergency
means applying criteria that live in prose: gas smell, water through a ceiling, live
wiring, no heat with an infant in the house. That is a document, the decision must be
grounded in it, and the cost of a wrong answer is not a bad customer experience but a
safety incident.

**The escalation decision must never be generated.** It should be the result of
retrieving the criterion that matched — the same rule as Notes to Invoice's arithmetic,
with worse consequences for breaking it.

Concretely:

- **Use `search_result` blocks with citations enabled.** The transcript then records
  *which policy line* triggered the escalation. That makes the decision auditable after
  the fact, which for a safety path is not a nice-to-have.
- **Consider caching the corpus instead of retrieving it.** An emergency-criteria
  document is a few pages. A few pages fits in the prompt. Prompt caching over a stable
  policy is cheaper, simpler and more reliable than any vector index, and it removes an
  entire failure mode — retrieval that silently returns the wrong chunk. Reach for
  retrieval when the corpus outgrows the context window, not before. **This is the most
  useful thing on this page: for small corpora, the right answer is often level 0.**
- **Budget for the structured-output conflict.** If the agent must return a
  schema-valid decision object *and* cite the policy, that is two calls — a cited
  reasoning call and a structured decision call — or a tool-argument approach.
  `output_config.format` alongside citations is a 400.
- **Fail closed.** Retrieval failure on a safety path escalates to a human. It does not
  degrade to the model's own judgement.

**Ceiling: level 2, arguably level 1 plus caching.** Job data stays exact-match through
the MCP server; only the policy corpus is a retrieval problem, and it is small.

### 5. Eval Harness — not retrieval, and the reason any climb is legitimate

Level 5 lists continuous evaluation among its bullets, which undersells it. Evaluation
is not a rung — it is what tells you whether a rung was worth adding. Without it,
"we added reranking and it feels better" is the whole analysis.

This is the project that turns every claim above into something testable. Right now
"vector search would make Notes to Invoice worse" is a reasoned assertion. With an eval
set it becomes a measured result, and if the measurement contradicts the assertion,
the assertion loses.

Its scope should include an **escalation-correctness** metric for project 4, separate
from general accuracy. Missing a gas leak and over-escalating a dripping tap are both
failures, they trade off against each other, and one of them is much worse. A single
accuracy number hides that.

---

## What would justify climbing

Concrete triggers, in this repository's terms. Absent these, the current level is the
right level.

| Climb to | Only when |
|---|---|
| **2 — vector** | A corpus exists where users' words genuinely differ from the document's words *and* it is too large to fit in a cached prompt. Today: nothing qualifies. |
| **3 — hybrid** | Vector search is live and measurably missing exact identifiers — job numbers, rate codes, part numbers. Level 3 is a *fix* for a level 2 regression, not an upgrade. |
| **4 — rerank** | The eval harness shows the right document is in the candidate set but not in the top few. That is a specific, measurable symptom; do not add reranking without it. |
| **5 — citations, evals** | Immediately for citations on the After-Hours safety path. Immediately for evals, full stop. These are the two rungs worth taking early. |
| **6 — GraphRAG** | Questions arrive that span relationships no single record holds. A jobs database answers those with a `JOIN`. Building a knowledge graph over clean relational data here would be résumé-driven development. |
| **7 — agentic** | Already the design for project 4, over project 3's tools. Correct — and it is a level 7 *composition* over level 1 retrieval, which is the honest description. |

## The summary, stated plainly

These five tools target **level 1 retrieval composed agentically**, with citations and
evaluation from level 5 where safety demands them. Nothing here needs level 6, and only
one project has any business at level 2.

That is not a modest target. It is the target the problem has, and the maturity being
demonstrated is knowing where to stop — which is the harder half of the skill, and the
half a ladder diagram cannot teach.

The genuinely difficult work in this repository is not retrieval sophistication. It is
the guarded write path in project 3, the escalation boundary in project 4, and the
measurement in project 5. None of those appear on the ladder at all.

---

## Sources

- [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings) — no
  first-party Anthropic embedding model; Voyage AI models and rerankers
- [Search results](https://platform.claude.com/docs/en/build-with-claude/search-results)
  — `search_result` block schema, model support, `cache_control`
- [Citations](https://platform.claude.com/docs/en/build-with-claude/citations) —
  chunking behaviour, citation locations, the structured-outputs incompatibility
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
  — the cheap alternative to retrieval at small corpus sizes

The seven-level framing is a widely circulated industry model, not an Anthropic one.
It is a useful vocabulary for talking about retrieval, not a roadmap to follow to the
end.
