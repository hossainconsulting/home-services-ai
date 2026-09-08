/* Content DNA Studio: a small hash-routed client over the JSON API. */
(() => {
  "use strict";

  const $app = document.getElementById("app");
  const $nav = document.getElementById("topnav");
  const $toast = document.getElementById("toast");

  const state = {
    user: null,
    modules: [],
    channels: [],
    workspaces: [],
    ws: null,
    sources: [],
    analyses: [],
    distributions: [],
    usage: null,
    run: null, // { kind, text, status, error, id }
  };

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = (s) => (window.DOMPurify && window.marked ? DOMPurify.sanitize(marked.parse(s || "", { gfm: true, breaks: false })) : `<pre>${esc(s)}</pre>`);
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "");
  const fmtNum = (n) => (n == null ? "" : Number(n).toLocaleString());
  const fmtDur = (s) => {
    if (!s) return "";
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };
  let toastTimer;
  function toast(msg) {
    $toast.textContent = msg;
    $toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($toast.hidden = true), 3200);
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
    return data;
  }

  /** POST and read a text/event-stream response. */
  async function streamRun(path, body, handlers) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      signal: handlers.signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    const dispatch = (block) => {
      let event = "message", data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) return;
      let payload;
      try { payload = JSON.parse(data); } catch { return; }
      if (event === "delta") handlers.onDelta(payload.text || "");
      else if (event === "done") handlers.onDone(payload);
      else if (event === "error") handlers.onError(payload.message || "Run failed.");
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        dispatch(buf.slice(0, idx));
        buf = buf.slice(idx + 2);
      }
    }
    if (buf.trim()) dispatch(buf);
  }

  function route() {
    const h = location.hash.replace(/^#/, "") || "/";
    const parts = h.split("/").filter(Boolean);
    return { path: h, parts };
  }
  const go = (h) => { location.hash = h; };

  // ---------- data loading ----------
  async function loadSession() {
    const { user } = await api("/api/auth/me");
    state.user = user;
    if (user) {
      const [m, c] = await Promise.all([api("/api/modules"), api("/api/channels")]);
      state.modules = m.modules;
      state.channels = c.channels;
    }
  }
  async function loadWorkspaces() {
    state.workspaces = (await api("/api/workspaces")).workspaces;
  }
  async function loadUsage() {
    state.usage = await api("/api/usage");
  }
  async function loadWorkspace(id) {
    if (state.ws?.id !== id) state.run = null;
    const [w, s, a, d] = await Promise.all([
      api(`/api/workspaces/${id}`),
      api(`/api/workspaces/${id}/sources`),
      api(`/api/workspaces/${id}/analyses`),
      api(`/api/workspaces/${id}/distributions`),
    ]);
    state.ws = w.workspace;
    state.sources = s.sources;
    state.analyses = a.analyses;
    state.distributions = d.distributions;
  }

  // ---------- top nav ----------
  function renderNav() {
    if (!state.user) {
      $nav.innerHTML = `<a href="#/pricing">Pricing</a><a href="#/">Sign in</a>`;
      return;
    }
    const u = state.usage;
    const usagePill = u ? `<span class="pill" title="Analyses this month">${u.used.analyses}/${u.plan.analysesPerMonth} analyses · ${u.used.distributions}/${u.plan.distributionsPerMonth} packages</span>` : "";
    $nav.innerHTML = `
      <a href="#/">Workspaces</a>
      <a href="#/pricing">${esc(state.user.plan_name)} plan</a>
      ${usagePill}
      <span class="muted small">${esc(state.user.email)}</span>
      <button class="small" id="logout">Sign out</button>`;
    document.getElementById("logout").onclick = async () => {
      await api("/api/auth/logout", { method: "POST" });
      state.user = null;
      go("/");
      render();
    };
  }

  // ---------- views ----------
  function viewAuth(mode = "login") {
    $app.innerHTML = `
      <div class="hero">
        <h1>Decode any channel. Publish everywhere.</h1>
        <p class="muted">Paste transcripts from a YouTube channel. Get its content DNA, a hook swipe file, content pillars, audience language, viral patterns, a 90-day calendar, and ready-to-post packages for Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Google Business Profile, Pinterest, SEO and Google Ads.</p>
      </div>
      <form class="auth card" id="authform">
        <h2>${mode === "login" ? "Sign in" : "Create your account"}</h2>
        <div id="autherr"></div>
        <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
        <div class="field"><label>Password</label><input type="password" name="password" required minlength="10" autocomplete="${mode === "login" ? "current-password" : "new-password"}"><div class="hint">At least 10 characters.</div></div>
        <div class="row between">
          <button class="primary" type="submit">${mode === "login" ? "Sign in" : "Sign up free"}</button>
          <button class="link" type="button" id="switch">${mode === "login" ? "Need an account?" : "Already have one?"}</button>
        </div>
      </form>`;
    document.getElementById("switch").onclick = () => viewAuth(mode === "login" ? "signup" : "login");
    document.getElementById("authform").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api(`/api/auth/${mode}`, { method: "POST", body: { email: fd.get("email"), password: fd.get("password") } });
        await loadSession();
        go("/");
        render();
      } catch (err) {
        document.getElementById("autherr").innerHTML = `<div class="alert bad">${esc(err.message)}</div>`;
      }
    };
  }

  async function viewDashboard() {
    await Promise.all([loadWorkspaces(), loadUsage()]);
    renderNav();
    const u = state.usage;
    $app.innerHTML = `
      <div class="row between" style="margin-bottom:1rem">
        <div><h1>Workspaces</h1><p class="muted">One workspace per channel or client. ${u.used.workspaces}/${u.plan.workspaces} used on the ${esc(u.plan.name)} plan.</p></div>
        <form id="newws" class="row"><input type="text" name="name" placeholder="Workspace name" required style="width:220px"><button class="primary">Create</button></form>
      </div>
      <div id="wserr"></div>
      ${u.mock ? `<div class="alert warn">Mock mode is on: runs return placeholder documents. Set ANTHROPIC_API_KEY and CLAUDE_MOCK=0 on the server for real analysis.</div>` : ""}
      ${state.workspaces.length ? `<div class="grid">${state.workspaces.map((w) => `
        <a class="card" href="#/w/${w.id}/sources" style="display:block;color:inherit">
          <h2>${esc(w.name)}</h2>
          <p class="muted small">${esc(w.brand.niche || "No niche set yet")}</p>
          <div class="row small muted"><span>${w.counts.sources} transcripts</span><span>${w.counts.analyses} analyses</span><span>${w.counts.distributions} packages</span></div>
        </a>`).join("")}</div>` : `<div class="empty">No workspaces yet. Create one for the channel you want to decode.</div>`}
      <div class="card" style="margin-top:1.5rem">
        <h3>This month</h3>
        <div class="row small muted">
          <span>${fmtNum(u.tokens.runs)} runs</span>
          <span>${fmtNum(u.tokens.input_tokens)} input tokens</span>
          <span>${fmtNum(u.tokens.cache_read_tokens)} cached</span>
          <span>${fmtNum(u.tokens.output_tokens)} output tokens</span>
          <span>≈ $${Number(u.tokens.cost_usd || 0).toFixed(2)} API cost</span>
          <span>model ${esc(u.model)}</span>
        </div>
      </div>`;
    document.getElementById("newws").onsubmit = async (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name");
      try {
        const { workspace } = await api("/api/workspaces", { method: "POST", body: { name } });
        go(`/w/${workspace.id}/brand`);
      } catch (err) {
        document.getElementById("wserr").innerHTML = `<div class="alert bad">${esc(err.message)}</div>`;
      }
    };
  }

  async function viewPricing() {
    const { plans } = await api("/api/plans");
    const current = state.user?.plan;
    $app.innerHTML = `
      <h1>Plans</h1>
      <p class="muted">Every plan runs on the same model. Limits are per calendar month.</p>
      <div class="plans">${plans.map((p) => `
        <div class="card plan ${p.id === current ? "current" : ""}">
          <h2>${esc(p.name)}</h2>
          <div class="price">$${p.priceMonthlyUsd}<span class="muted small">/mo</span></div>
          <p class="muted small">${esc(p.blurb)}</p>
          <ul>
            <li>${p.workspaces} workspace${p.workspaces === 1 ? "" : "s"}</li>
            <li>${p.sourcesPerWorkspace} transcripts per workspace</li>
            <li>${p.analysesPerMonth} analyses per month</li>
            <li>${p.distributionsPerMonth} distribution packages per month</li>
            <li>${p.competitorAnalysis ? "Competitor gap analysis" : "No competitor gap analysis"}</li>
          </ul>
          ${p.id === current ? `<span class="tag">Current plan</span>` : `<span class="muted small">Contact the operator to change plans. Self-serve billing is on the roadmap.</span>`}
        </div>`).join("")}</div>`;
  }

  function wsTabs(active) {
    const id = state.ws.id;
    const tabs = [["sources", "Transcripts"], ["brand", "Brand"], ["analyses", "Analyses"], ["distribute", "Distribute"]];
    return `<div class="row between" style="margin-bottom:.5rem"><h1>${esc(state.ws.name)}</h1><span class="muted small">${state.sources.length} transcripts · ${state.analyses.filter((a) => a.status === "done").length} analyses</span></div>
      <div class="tabs">${tabs.map(([k, l]) => `<a href="#/w/${id}/${k}" class="${active === k ? "active" : ""}">${l}</a>`).join("")}</div>`;
  }

  // ----- Sources tab -----
  function viewSources() {
    const id = state.ws.id;
    const labels = [...new Set(state.sources.map((s) => s.channel_label).filter(Boolean))];
    $app.innerHTML = `${wsTabs("sources")}
      <div class="layout">
        <div class="card">
          <h2>Add a transcript</h2>
          <div id="srcerr"></div>
          <form id="srcform" class="stack">
            <div class="field"><label>YouTube URL</label><input type="url" name="url" placeholder="https://www.youtube.com/watch?v=…"><div class="hint">Captions are fetched automatically. If that fails, paste the transcript below.</div></div>
            <div class="field"><label>Title</label><input type="text" name="title" placeholder="Required when pasting"></div>
            <div class="field"><label>Channel label</label><input type="text" name="channel_label" list="labels" placeholder="e.g. Ali Abdaal"><datalist id="labels">${labels.map((l) => `<option value="${esc(l)}">`).join("")}</datalist><div class="hint">Needed for the competitor gap analysis. Use the same label for every video from one channel.</div></div>
            <div class="field"><label>Transcript (paste)</label><textarea name="transcript" placeholder="Paste from YouTube's 'Show transcript' panel, SRT, or plain text."></textarea></div>
            <details><summary>Performance metrics (optional, powers Viral Pattern Recognition)</summary>
              <div class="fields-3" style="margin-top:.6rem">
                <div class="field"><label>Views</label><input type="number" name="views" min="0"></div>
                <div class="field"><label>Likes</label><input type="number" name="likes" min="0"></div>
                <div class="field"><label>Comments</label><input type="number" name="comments" min="0"></div>
                <div class="field"><label>Avg view duration (s)</label><input type="number" name="avg_view_duration_s" min="0"></div>
                <div class="field"><label>CTR %</label><input type="number" name="ctr_pct" min="0" step="0.1"></div>
                <div class="field"><label>Published</label><input type="text" name="published_at" placeholder="2026-03-14"></div>
              </div>
            </details>
            <button class="primary" type="submit">Add transcript</button>
          </form>
        </div>
        <div>
          ${state.sources.length ? `<table class="list"><thead><tr><th>Title</th><th>Channel</th><th>Words</th><th>Metrics</th><th></th></tr></thead><tbody>
            ${state.sources.map((s) => `<tr>
              <td><strong>${esc(s.title)}</strong>${s.url ? ` <a class="small" href="${esc(s.url)}" target="_blank" rel="noopener">↗</a>` : ""}<div class="muted small">${fmtDate(s.created_at)}${s.duration_s ? ` · ${fmtDur(s.duration_s)}` : ""}</div></td>
              <td>${s.channel_label ? `<span class="tag">${esc(s.channel_label)}</span>` : `<span class="muted small">none</span>`}</td>
              <td>${fmtNum(s.word_count)}</td>
              <td class="small muted">${Object.keys(s.metrics).length ? Object.entries(s.metrics).map(([k, v]) => `${k.replace(/_/g, " ")} ${fmtNum(v)}`).join("<br>") : "none"}</td>
              <td><button class="small" data-edit="${s.id}">Edit</button> <button class="small danger" data-del="${s.id}">Delete</button></td>
            </tr>`).join("")}</tbody></table>`
          : `<div class="empty">No transcripts yet. Add five to ten videos from the channel you want to decode. More transcripts, sharper DNA.</div>`}
        </div>
      </div>`;

    document.getElementById("srcform").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        url: fd.get("url"), title: fd.get("title"), channel_label: fd.get("channel_label"), transcript: fd.get("transcript"),
        published_at: fd.get("published_at"),
        metrics: { views: fd.get("views"), likes: fd.get("likes"), comments: fd.get("comments"), avg_view_duration_s: fd.get("avg_view_duration_s"), ctr_pct: fd.get("ctr_pct") },
      };
      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = body.transcript ? "Saving…" : "Fetching captions…";
      try {
        await api(`/api/workspaces/${id}/sources`, { method: "POST", body });
        toast("Transcript added.");
        await loadWorkspace(id);
        viewSources();
      } catch (err) {
        btn.disabled = false; btn.textContent = "Add transcript";
        document.getElementById("srcerr").innerHTML = `<div class="alert bad">${esc(err.message)}</div>`;
      }
    };
    $app.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      if (!confirm("Delete this transcript?")) return;
      await api(`/api/sources/${b.dataset.del}`, { method: "DELETE" });
      await loadWorkspace(id); viewSources();
    }));
    $app.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = async () => {
      const s = state.sources.find((x) => x.id === b.dataset.edit);
      const title = prompt("Title", s.title); if (title === null) return;
      const label = prompt("Channel label", s.channel_label); if (label === null) return;
      const views = prompt("Views (blank to keep)", s.metrics.views ?? "");
      const metrics = { ...s.metrics }; if (views !== null && views !== "") metrics.views = views;
      await api(`/api/sources/${s.id}`, { method: "PATCH", body: { title, channel_label: label, metrics } });
      await loadWorkspace(id); viewSources();
    }));
  }

  // ----- Brand tab -----
  function viewBrand() {
    const b = state.ws.brand || {};
    const platforms = new Set(b.platforms || []);
    $app.innerHTML = `${wsTabs("brand")}
      <div class="card" style="max-width:760px">
        <h2>Your brand</h2>
        <p class="muted">Fills the [YOUR NICHE] slots in hook templates, positions the calendar, and shapes every distribution package. Leave blank to analyse the channel on its own terms.</p>
        <div id="branderr"></div>
        <form id="brandform">
          <div class="fields-2">
            <div class="field"><label>Niche</label><input type="text" name="niche" value="${esc(b.niche || "")}" placeholder="e.g. Salesforce consulting for Australian trades businesses"></div>
            <div class="field"><label>Primary CTA</label><input type="text" name="cta" value="${esc(b.cta || "")}" placeholder="e.g. Book a 20-minute CRM audit"></div>
          </div>
          <div class="field"><label>Audience</label><input type="text" name="audience" value="${esc(b.audience || "")}" placeholder="Who you are talking to and what they are stuck on"></div>
          <div class="field"><label>Offer</label><input type="text" name="offer" value="${esc(b.offer || "")}" placeholder="What you sell or want people to do"></div>
          <div class="fields-3">
            <div class="field"><label>Tone of voice</label><input type="text" name="tone" value="${esc(b.tone || "")}" placeholder="Direct, warm, no hype"></div>
            <div class="field"><label>Website</label><input type="text" name="website" value="${esc(b.website || "")}"></div>
            <div class="field"><label>Location</label><input type="text" name="location" value="${esc(b.location || "")}" placeholder="Sydney, Australia"></div>
          </div>
          <div class="field"><label>Platforms in play</label>
            <div class="chips">${state.channels.map((c) => `<span class="chip ${platforms.has(c.id) ? "on" : ""}" data-p="${c.id}">${esc(c.name)}</span>`).join("")}</div>
          </div>
          <button class="primary">Save brand</button>
        </form>
      </div>`;
    $app.querySelectorAll(".chip").forEach((ch) => (ch.onclick = () => ch.classList.toggle("on")));
    document.getElementById("brandform").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const brand = Object.fromEntries(["niche", "cta", "audience", "offer", "tone", "website", "location"].map((k) => [k, fd.get(k)]));
      brand.platforms = [...$app.querySelectorAll(".chip.on")].map((c) => c.dataset.p);
      try {
        const { workspace } = await api(`/api/workspaces/${state.ws.id}`, { method: "PATCH", body: { brand } });
        state.ws = workspace;
        toast("Brand saved.");
      } catch (err) {
        document.getElementById("branderr").innerHTML = `<div class="alert bad">${esc(err.message)}</div>`;
      }
    };
  }

  // ----- Analyses tab -----
  let selectedModule = null;
  function viewAnalyses() {
    const id = state.ws.id;
    const mod = state.modules.find((m) => m.id === selectedModule) || state.modules[0];
    selectedModule = mod?.id;
    const labels = new Set(state.sources.map((s) => s.channel_label).filter(Boolean));
    const ready = (m) => {
      if (state.sources.length < m.min_sources) return `Needs ${m.min_sources}+ transcripts`;
      if (m.min_channels && labels.size < m.min_channels) return `Needs ${m.min_channels}+ channel labels`;
      return null;
    };
    $app.innerHTML = `${wsTabs("analyses")}
      <div class="layout">
        <div class="stack">
          <div class="card">
            <h2>Run an analysis</h2>
            <div class="module-list">${state.modules.map((m) => `
              <div class="module ${m.id === mod.id ? "active" : ""}" data-m="${m.id}">
                <span class="n">${m.order}</span>
                <div><div class="name">${esc(m.name)}</div><div class="tagline">${esc(m.tagline)}</div>${ready(m) ? `<div class="req">${esc(ready(m))}</div>` : ""}</div>
              </div>`).join("")}</div>
          </div>
          <div class="card">
            <h3>Transcripts to include</h3>
            <p class="muted small">All selected by default. ${mod.uses_metrics ? "This module ranks by the metrics you entered." : ""}</p>
            <div class="checks">${state.sources.map((s) => `<label><input type="checkbox" name="src" value="${s.id}" checked> ${esc(s.title)}${s.channel_label ? ` <span class="tag">${esc(s.channel_label)}</span>` : ""}</label>`).join("") || `<span class="muted small">No transcripts yet.</span>`}</div>
            <div class="row" style="margin-top:.75rem"><button class="primary" id="run" ${ready(mod) || state.run?.status === "running" ? "disabled" : ""}>Run ${esc(mod.name)}</button><span class="muted small">Takes 1 to 5 minutes. Output streams in.</span></div>
            <div id="runerr"></div>
          </div>
          <div class="card">
            <h3>Past analyses</h3>
            ${state.analyses.length ? `<table class="list"><tbody>${state.analyses.map((a) => `<tr><td><a href="#/w/${id}/analyses/${a.id}">${esc(a.module_name)}</a><div class="muted small">${fmtDate(a.created_at)}</div></td><td><span class="status ${a.status}">${a.status}</span></td></tr>`).join("")}</tbody></table>` : `<p class="muted small">Nothing yet.</p>`}
          </div>
        </div>
        <div id="output">${renderRunPanel()}</div>
      </div>`;
    $app.querySelectorAll(".module").forEach((el) => (el.onclick = () => { selectedModule = el.dataset.m; viewAnalyses(); }));
    document.getElementById("run").onclick = () => startAnalysis(mod);
  }

  function renderRunPanel() {
    const r = state.run;
    if (!r) return `<div class="empty">Pick a module and run it. The document appears here as it is written.</div>`;
    return `
      <div class="doc-toolbar">
        <strong>${esc(r.title)}</strong>
        <span class="status ${r.status}">${r.status}</span>
        <span class="spacer"></span>
        ${r.status === "running" ? `<button class="small" id="cancel">Cancel</button>` : ""}
        ${r.id && r.status !== "running" ? `<button class="small" id="copy">Copy Markdown</button> <a class="btn small" href="/api/${r.kind === "analysis" ? "analyses" : "distributions"}/${r.id}/markdown">Download .md</a>` : ""}
      </div>
      ${r.error ? `<div class="alert ${r.status === "truncated" ? "warn" : "bad"}">${esc(r.error)}</div>` : ""}
      ${r.usage ? `<div class="usage-line">${fmtNum(r.usage.input_tokens)} in · ${fmtNum(r.usage.cache_read_tokens)} cached · ${fmtNum(r.usage.output_tokens)} out · ≈ $${Number(r.usage.cost_usd || 0).toFixed(3)} · ${esc(r.model || "")}</div>` : ""}
      ${r.byChannel ? renderChannelTabs(r) : `<div class="doc ${r.status === "running" ? "streaming" : ""}" id="doc">${md(r.text)}</div>`}`;
  }

  function renderChannelTabs(r) {
    const ids = Object.keys(r.byChannel);
    const active = r.activeChannel && r.byChannel[r.activeChannel] ? r.activeChannel : ids[0];
    r.activeChannel = active;
    const name = (cid) => (state.channels.find((c) => c.id === cid) || {}).name || cid;
    return `<div class="tabs" id="chtabs">${ids.map((cid) => `<a href="#" data-ch="${cid}" class="${cid === active ? "active" : ""}">${esc(name(cid))}</a>`).join("")}</div>
      <div class="row" style="margin-bottom:.5rem"><button class="small" id="copych">Copy ${esc(name(active))} section</button></div>
      <div class="doc" id="doc">${md(r.byChannel[active] || "")}</div>`;
  }

  function wireRunPanel(rerender) {
    const out = document.getElementById("output");
    if (!out) return;
    out.innerHTML = renderRunPanel();
    const r = state.run;
    const cancel = document.getElementById("cancel");
    if (cancel) cancel.onclick = () => r.abort?.abort();
    const copy = document.getElementById("copy");
    if (copy) copy.onclick = () => navigator.clipboard.writeText(r.text).then(() => toast("Copied."));
    const copych = document.getElementById("copych");
    if (copych) copych.onclick = () => navigator.clipboard.writeText(r.byChannel[r.activeChannel] || "").then(() => toast("Copied."));
    out.querySelectorAll("#chtabs a").forEach((a) => (a.onclick = (e) => { e.preventDefault(); r.activeChannel = a.dataset.ch; wireRunPanel(); }));
    if (rerender) rerender();
  }

  let renderTimer = null;
  function scheduleDocRender() {
    if (renderTimer) return;
    renderTimer = setTimeout(() => {
      renderTimer = null;
      const doc = document.getElementById("doc");
      if (doc && state.run && !state.run.byChannel) {
        doc.innerHTML = md(state.run.text);
        doc.scrollTop = doc.scrollHeight;
      }
    }, 250);
  }

  async function startAnalysis(mod) {
    const id = state.ws.id;
    const sourceIds = [...$app.querySelectorAll("input[name=src]:checked")].map((i) => i.value);
    const abort = new AbortController();
    state.run = { kind: "analysis", title: mod.name, text: "", status: "running", abort };
    wireRunPanel();
    document.getElementById("run").disabled = true;
    try {
      await streamRun(`/api/workspaces/${id}/analyses`, { module: mod.id, source_ids: sourceIds }, {
        signal: abort.signal,
        onDelta: (t) => { state.run.text += t; scheduleDocRender(); },
        onDone: async (d) => {
          state.run.id = d.id; state.run.status = d.status; state.run.error = d.error;
          const { analysis } = await api(`/api/analyses/${d.id}`);
          state.run.usage = analysis.usage; state.run.model = analysis.model; state.run.text = analysis.output;
          state.analyses = (await api(`/api/workspaces/${id}/analyses`)).analyses;
          await loadUsage(); renderNav();
          viewAnalyses();
        },
        onError: (m) => { state.run.status = "error"; state.run.error = m; wireRunPanel(); document.getElementById("run").disabled = false; },
      });
    } catch (err) {
      state.run.status = abort.signal.aborted ? "cancelled" : "error";
      state.run.error = abort.signal.aborted ? "Cancelled." : err.message;
      wireRunPanel();
      const btn = document.getElementById("run"); if (btn) btn.disabled = false;
    }
  }

  async function viewAnalysisDetail(aid) {
    const { analysis } = await api(`/api/analyses/${aid}`);
    state.run = { kind: "analysis", id: analysis.id, title: analysis.module_name, text: analysis.output, status: analysis.status, error: analysis.error, usage: analysis.usage, model: analysis.model };
    $app.innerHTML = `${wsTabs("analyses")}
      <div class="row between" style="margin-bottom:.75rem"><a href="#/w/${state.ws.id}/analyses">← All analyses</a><div class="row"><a class="btn small" href="#/w/${state.ws.id}/distribute?analysis=${analysis.id}">Distribute this</a><button class="small danger" id="del">Delete</button></div></div>
      <p class="muted small">${fmtDate(analysis.created_at)} · ${(analysis.input.source_titles || []).length} transcripts: ${esc((analysis.input.source_titles || []).join(", "))}</p>
      <div id="output"></div>`;
    wireRunPanel();
    document.getElementById("del").onclick = async () => {
      if (!confirm("Delete this analysis?")) return;
      await api(`/api/analyses/${aid}`, { method: "DELETE" });
      state.run = null; await loadWorkspace(state.ws.id); go(`/w/${state.ws.id}/analyses`);
    };
  }

  // ----- Distribute tab -----
  function viewDistribute(query) {
    const id = state.ws.id;
    const preAnalysis = query.get("analysis");
    const preSource = query.get("source");
    const brandPlatforms = new Set(state.ws.brand?.platforms || []);
    const groups = [["social", "Social"], ["video", "Video"], ["local", "Local"], ["search", "Search"]];
    const doneAnalyses = state.analyses.filter((a) => a.status === "done" || a.status === "truncated");
    $app.innerHTML = `${wsTabs("distribute")}
      <div class="layout">
        <div class="stack">
          <div class="card">
            <h2>Build a distribution package</h2>
            <p class="muted small">Pick one transcript or one finished analysis, then the channels. Each channel gets platform-native copy in one document.</p>
            <div class="field"><label>Material</label>
              <select id="material">
                <optgroup label="Transcripts">${state.sources.map((s) => `<option value="s:${s.id}" ${preSource === s.id ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</optgroup>
                <optgroup label="Analyses">${doneAnalyses.map((a) => `<option value="a:${a.id}" ${preAnalysis === a.id ? "selected" : ""}>${esc(a.module_name)} · ${fmtDate(a.created_at)}</option>`).join("")}</optgroup>
              </select></div>
            <div class="field"><label>Channels</label>
              ${groups.map(([g, gl]) => `<div class="chip-group">${gl}</div><div class="chips">${state.channels.filter((c) => c.group === g).map((c) => `<span class="chip ${brandPlatforms.size === 0 || brandPlatforms.has(c.id) ? "on" : ""}" data-c="${c.id}" title="${esc(c.spec)}">${esc(c.name)}</span>`).join("")}</div>`).join("")}
              <div class="hint">Platforms saved in Brand are pre-selected. Fewer channels per run means tighter copy.</div>
            </div>
            <div class="row"><button class="primary" id="run" ${!state.sources.length && !doneAnalyses.length ? "disabled" : ""}>Generate package</button></div>
            <div id="runerr"></div>
          </div>
          <div class="card">
            <h3>Past packages</h3>
            ${state.distributions.length ? `<table class="list"><tbody>${state.distributions.map((d) => `<tr><td><a href="#/w/${id}/distribute/${d.id}">${d.channels.map((c) => (state.channels.find((x) => x.id === c) || {}).name || c).join(", ")}</a><div class="muted small">${fmtDate(d.created_at)}</div></td><td><span class="status ${d.status}">${d.status}</span></td></tr>`).join("")}</tbody></table>` : `<p class="muted small">Nothing yet.</p>`}
          </div>
        </div>
        <div id="output">${state.run?.kind === "distribution" ? renderRunPanel() : `<div class="empty">Choose material and channels. Copy appears here per channel.</div>`}</div>
      </div>`;
    $app.querySelectorAll(".chip").forEach((ch) => (ch.onclick = () => ch.classList.toggle("on")));
    if (state.run?.kind === "distribution") wireRunPanel();
    document.getElementById("run").onclick = () => startDistribution();
  }

  async function startDistribution() {
    const id = state.ws.id;
    const material = document.getElementById("material").value;
    const channels = [...$app.querySelectorAll(".chip.on")].map((c) => c.dataset.c);
    const body = { channels };
    if (material.startsWith("s:")) body.source_id = material.slice(2); else body.analysis_id = material.slice(2);
    const abort = new AbortController();
    state.run = { kind: "distribution", title: "Distribution package", text: "", status: "running", abort };
    wireRunPanel();
    document.getElementById("run").disabled = true;
    try {
      await streamRun(`/api/workspaces/${id}/distributions`, body, {
        signal: abort.signal,
        onDelta: (t) => { state.run.text += t; scheduleDocRender(); },
        onDone: async (d) => {
          const { distribution } = await api(`/api/distributions/${d.id}`);
          Object.assign(state.run, { id: d.id, status: d.status, error: d.error, usage: distribution.usage, model: distribution.model, text: distribution.output, byChannel: distribution.by_channel });
          state.distributions = (await api(`/api/workspaces/${id}/distributions`)).distributions;
          await loadUsage(); renderNav();
          viewDistribute(new URLSearchParams());
        },
        onError: (m) => { state.run.status = "error"; state.run.error = m; wireRunPanel(); document.getElementById("run").disabled = false; },
      });
    } catch (err) {
      state.run.status = abort.signal.aborted ? "cancelled" : "error";
      state.run.error = abort.signal.aborted ? "Cancelled." : err.message;
      wireRunPanel();
      const btn = document.getElementById("run"); if (btn) btn.disabled = false;
    }
  }

  async function viewDistributionDetail(did) {
    const { distribution } = await api(`/api/distributions/${did}`);
    state.run = { kind: "distribution", id: distribution.id, title: "Distribution package", text: distribution.output, status: distribution.status, error: distribution.error, usage: distribution.usage, model: distribution.model, byChannel: distribution.by_channel };
    $app.innerHTML = `${wsTabs("distribute")}
      <div class="row between" style="margin-bottom:.75rem"><a href="#/w/${state.ws.id}/distribute">← All packages</a><button class="small danger" id="del">Delete</button></div>
      <div id="output"></div>`;
    wireRunPanel();
    document.getElementById("del").onclick = async () => {
      if (!confirm("Delete this package?")) return;
      await api(`/api/distributions/${did}`, { method: "DELETE" });
      state.run = null; await loadWorkspace(state.ws.id); go(`/w/${state.ws.id}/distribute`);
    };
  }

  // ---------- router ----------
  async function render() {
    try {
      const { parts } = route();
      const [head, query] = (parts.join("/") || "").split("?");
      const q = new URLSearchParams(query || "");
      const p = head.split("/").filter(Boolean);
      renderNav();
      if (p[0] === "pricing") return viewPricing();
      if (!state.user) return viewAuth("login");
      if (p[0] === "w" && p[1]) {
        await loadWorkspace(p[1]);
        if (!state.usage) await loadUsage();
        renderNav();
        const tab = p[2] || "sources";
        if (tab === "sources") return viewSources();
        if (tab === "brand") return viewBrand();
        if (tab === "analyses") return p[3] ? viewAnalysisDetail(p[3]) : viewAnalyses();
        if (tab === "distribute") return p[3] ? viewDistributionDetail(p[3]) : viewDistribute(q);
      }
      return viewDashboard();
    } catch (err) {
      if (err.status === 401) { state.user = null; return viewAuth("login"); }
      if (err.status === 404) { go("/"); return; }
      $app.innerHTML = `<div class="alert bad">${esc(err.message)}</div>`;
    }
  }

  window.addEventListener("hashchange", render);
  loadSession().then(render).catch((err) => { $app.innerHTML = `<div class="alert bad">${esc(err.message)}</div>`; });
})();
