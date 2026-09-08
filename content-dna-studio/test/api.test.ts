import { test, before } from "node:test";
import assert from "node:assert/strict";
import { useTestEnv, readSse, SAMPLE_TRANSCRIPT_A, SAMPLE_TRANSCRIPT_B, SAMPLE_TRANSCRIPT_C } from "./helpers.ts";

useTestEnv();

type App = { request: (path: string, init?: RequestInit) => Response | Promise<Response> };
let app: App;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response): Promise<any> => res.json();
let cookie = "";
let wsId = "";
const sourceIds: string[] = [];

async function call(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  const res = await Promise.resolve(app.request(path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.cookie ?? cookie ? { cookie: init.cookie ?? cookie } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  }));
  return res;
}

before(async () => {
  const { createApp } = await import("../src/app.ts");
  app = createApp();
});

test("health reports mock mode", async () => {
  const res = await call("/api/health");
  const data = await json(res);
  assert.equal(res.status, 200);
  assert.equal(data.mock, true);
});

test("signup validates, creates, and sets a session cookie", async () => {
  let res = await call("/api/auth/signup", { body: { email: "bad", password: "longenough1" } });
  assert.equal(res.status, 400);
  res = await call("/api/auth/signup", { body: { email: "me@example.com", password: "short" } });
  assert.equal(res.status, 400);
  res = await call("/api/auth/signup", { body: { email: "Me@Example.com ", password: "longenough1" } });
  assert.equal(res.status, 201);
  const setCookie = res.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /cds_session=/);
  assert.match(setCookie, /HttpOnly/);
  cookie = setCookie.split(";")[0]!;
  const me = await json(await call("/api/auth/me"));
  assert.equal(me.user.email, "me@example.com");
  assert.equal(me.user.plan, "free");
  res = await call("/api/auth/signup", { body: { email: "me@example.com", password: "longenough1" } });
  assert.equal(res.status, 409);
});

test("login rejects wrong password and accepts right one", async () => {
  let res = await call("/api/auth/login", { body: { email: "me@example.com", password: "wrongwrong1" }, cookie: "" });
  assert.equal(res.status, 401);
  res = await call("/api/auth/login", { body: { email: "me@example.com", password: "longenough1" }, cookie: "" });
  assert.equal(res.status, 200);
});

test("protected routes need a session", async () => {
  const res = await call("/api/workspaces", { cookie: "" });
  assert.equal(res.status, 401);
});

test("workspace create, brand update, and free-plan cap", async () => {
  let res = await call("/api/workspaces", { body: { name: "  " } });
  assert.equal(res.status, 400);
  res = await call("/api/workspaces", { body: { name: "Ali Abdaal study", brand: { niche: "Consulting", platforms: ["linkedin", "bogus"] } } });
  assert.equal(res.status, 201);
  const { workspace } = await json(res);
  wsId = workspace.id;
  assert.deepEqual(workspace.brand.platforms, ["linkedin"]);

  res = await call(`/api/workspaces/${wsId}`, { method: "PATCH", body: { brand: { niche: "Salesforce for trades", cta: "Book a call" } } });
  assert.equal((await json(res)).workspace.brand.cta, "Book a call");

  res = await call("/api/workspaces", { body: { name: "Second" } });
  assert.equal(res.status, 402);
});

test("sources: paste, validate, list, and a URL that is not YouTube", async () => {
  let res = await call(`/api/workspaces/${wsId}/sources`, { body: { title: "x", transcript: "too short" } });
  assert.equal(res.status, 400);
  res = await call(`/api/workspaces/${wsId}/sources`, { body: { transcript: SAMPLE_TRANSCRIPT_A } });
  assert.equal(res.status, 400); // needs a title
  res = await call(`/api/workspaces/${wsId}/sources`, { body: { url: "https://vimeo.com/1" } });
  assert.equal(res.status, 400);

  for (const [title, transcript, label, metrics] of [
    ["Three doors", SAMPLE_TRANSCRIPT_A, "Creator A", { views: "12,400", likes: 300 }],
    ["CRM warning", SAMPLE_TRANSCRIPT_B, "Creator A", {}],
    ["Boring photo", SAMPLE_TRANSCRIPT_C, "Creator B", { views: 900 }],
  ] as const) {
    res = await call(`/api/workspaces/${wsId}/sources`, { body: { title, transcript, channel_label: label, metrics } });
    const created = await json(res);
    assert.equal(res.status, 201, JSON.stringify(created));
    const { source } = created;
    sourceIds.push(source.id);
    if (title === "Three doors") {
      assert.match(source.transcript, /^\[00:00\] Nobody tells you/);
      assert.equal(source.metrics.views, 12400);
    }
  }
  const list = await json(await call(`/api/workspaces/${wsId}/sources`));
  assert.equal(list.sources.length, 3);
  assert.ok(list.sources[0].transcript_preview.length > 0);
  assert.equal(list.sources[0].transcript, undefined);
});

test("modules and channels are published", async () => {
  const m = await json(await call("/api/modules"));
  assert.equal(m.modules.length, 8);
  const c = await json(await call("/api/channels"));
  assert.equal(c.channels.length, 10);
});

test("analysis validation: unknown module, too few sources, plan gate", async () => {
  let res = await call(`/api/workspaces/${wsId}/analyses`, { body: { module: "nope" } });
  assert.equal(res.status, 400);
  res = await call(`/api/workspaces/${wsId}/analyses`, { body: { module: "content_pillar_map", source_ids: [sourceIds[0]] } });
  assert.equal(res.status, 400);
  assert.match((await json(res)).error, /at least 3/);
  res = await call(`/api/workspaces/${wsId}/analyses`, { body: { module: "competitor_gap" } });
  assert.equal(res.status, 402);
});

test("analysis streams, persists, and meters usage", async () => {
  const res = await call(`/api/workspaces/${wsId}/analyses`, { body: { module: "channel_dna" } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/event-stream/);
  const sse = await readSse(res);
  assert.ok(sse.deltas.length >= 2);
  assert.ok(sse.done, sse.error);
  assert.equal(sse.done!.status, "done");
  const id = sse.done!.id as string;

  const detail = await json(await call(`/api/analyses/${id}`));
  assert.equal(detail.analysis.module_name, "Channel DNA Extraction");
  assert.ok(detail.analysis.output.includes("## Channel DNA Statement"));
  assert.equal(detail.analysis.output, sse.deltas.join(""));
  assert.deepEqual(detail.analysis.input.source_ids.length, 3);

  const md = await call(`/api/analyses/${id}/markdown`);
  assert.match(md.headers.get("content-type") ?? "", /markdown/);

  const usage = await json(await call("/api/usage"));
  assert.equal(usage.used.analyses, 1);
  assert.ok(usage.tokens.input_tokens > 0);
});

test("free plan stops at three analyses per month", async () => {
  for (let i = 0; i < 2; i++) {
    const res = await call(`/api/workspaces/${wsId}/analyses`, { body: { module: "hook_swipe_file" } });
    assert.equal(res.status, 200);
    await readSse(res);
  }
  const res = await call(`/api/workspaces/${wsId}/analyses`, { body: { module: "audience_language" } });
  assert.equal(res.status, 402);
  assert.match((await json(res)).error, /Free plan allows 3 analyses/);
});

test("distribution from a source splits into the requested channels", async () => {
  let res = await call(`/api/workspaces/${wsId}/distributions`, { body: { source_id: sourceIds[0], channels: [] } });
  assert.equal(res.status, 400);
  res = await call(`/api/workspaces/${wsId}/distributions`, { body: { source_id: sourceIds[0], channels: ["linkedin", "nope"] } });
  assert.equal(res.status, 400);

  res = await call(`/api/workspaces/${wsId}/distributions`, { body: { source_id: sourceIds[0], channels: ["linkedin", "gbp", "seo", "sem"] } });
  assert.equal(res.status, 200);
  const sse = await readSse(res);
  assert.equal(sse.done!.status, "done");
  const detail = await json(await call(`/api/distributions/${sse.done!.id}`));
  assert.deepEqual(Object.keys(detail.distribution.by_channel), ["linkedin", "gbp", "seo", "sem"]);
  assert.ok(detail.distribution.by_channel.seo.length > 0);
});

test("distribution from an analysis, and analysis ownership", async () => {
  const analyses = (await json(await call(`/api/workspaces/${wsId}/analyses`))).analyses;
  const res = await call(`/api/workspaces/${wsId}/distributions`, { body: { analysis_id: analyses[0].id, channels: ["x"] } });
  assert.equal(res.status, 200);
  const sse = await readSse(res);
  assert.equal(sse.done!.status, "done");

  // Another user cannot see this workspace or its analyses.
  const other = await call("/api/auth/signup", { body: { email: "other@example.com", password: "longenough1" }, cookie: "" });
  const otherCookie = (other.headers.get("set-cookie") ?? "").split(";")[0]!;
  assert.equal((await call(`/api/workspaces/${wsId}`, { cookie: otherCookie })).status, 404);
  assert.equal((await call(`/api/analyses/${analyses[0].id}`, { cookie: otherCookie })).status, 404);
  assert.equal((await call(`/api/sources/${sourceIds[0]}`, { cookie: otherCookie })).status, 404);
});

test("admin can change a plan; non-admin cannot", async () => {
  let res = await call("/api/admin/users/plan", { body: { email: "me@example.com", plan: "pro" } });
  assert.equal(res.status, 403);
  const admin = await call("/api/auth/signup", { body: { email: "admin@example.com", password: "longenough1" }, cookie: "" });
  const adminCookie = (admin.headers.get("set-cookie") ?? "").split(";")[0]!;
  res = await call("/api/admin/users/plan", { body: { email: "me@example.com", plan: "gold" }, cookie: adminCookie });
  assert.equal(res.status, 400);
  res = await call("/api/admin/users/plan", { body: { email: "me@example.com", plan: "pro" }, cookie: adminCookie });
  assert.equal(res.status, 200);
  const me = await json(await call("/api/auth/me"));
  assert.equal(me.user.plan, "pro");
  // Pro unlocks the competitor module; the workspace has two channel labels but only three transcripts.
  res = await call(`/api/workspaces/${wsId}/analyses`, { body: { module: "competitor_gap" } });
  assert.equal(res.status, 400);
  assert.match((await json(res)).error, /at least 4/);
});

test("cross-origin POST is blocked", async () => {
  const res = await app.request("/api/workspaces", {
    method: "POST",
    headers: { "content-type": "application/json", cookie, origin: "https://evil.example", host: "localhost:3000" },
    body: JSON.stringify({ name: "x" }),
  });
  assert.equal(res.status, 403);
});

test("logout clears the session", async () => {
  await call("/api/auth/logout", { method: "POST" });
  const res = await call("/api/workspaces");
  assert.equal(res.status, 401);
});
