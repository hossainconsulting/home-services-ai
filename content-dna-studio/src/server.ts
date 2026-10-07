import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { getDb } from "./db.ts";

const app = createApp();

// Vendored browser libraries, served straight from node_modules.
app.get("/vendor/marked.js", serveStatic({ path: "./node_modules/marked/lib/marked.umd.js" }));
app.get("/vendor/purify.js", serveStatic({ path: "./node_modules/dompurify/dist/purify.min.js" }));
app.use("/*", serveStatic({ root: "./public" }));
app.get("*", serveStatic({ path: "./public/index.html" }));

getDb();

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Content DNA Studio listening on http://localhost:${info.port}`);
  console.log(`model=${config.model} mock=${config.mock} fallbacks=${config.fallbacks} db=${config.dbPath}`);
  if (!config.mock && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.warn("No ANTHROPIC_API_KEY in the environment. Runs will fail unless an `ant auth login` profile exists. Set CLAUDE_MOCK=1 to work without a key.");
  }
});
