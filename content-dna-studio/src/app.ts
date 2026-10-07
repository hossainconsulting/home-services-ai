import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { authRoutes } from "./routes/auth.ts";
import { workspaceRoutes } from "./routes/workspaces.ts";
import { sourceRoutes } from "./routes/sources.ts";
import { analysisRoutes } from "./routes/analyses.ts";
import { distributionRoutes } from "./routes/distributions.ts";
import { accountRoutes } from "./routes/account.ts";
import { config } from "./config.ts";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://i.ytimg.com"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    }),
  );

  // Same-origin check for state-changing requests. Cookies are SameSite=Lax,
  // which already blocks cross-site POSTs in modern browsers; this is belt and braces.
  app.use("/api/*", async (c, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const origin = c.req.header("origin");
      const host = c.req.header("host");
      if (origin && host && !origin.endsWith(`//${host}`)) {
        return c.json({ error: "Cross-origin request blocked." }, 403);
      }
    }
    await next();
  });

  app.get("/api/health", (c) => c.json({ ok: true, model: config.model, mock: config.mock }));
  app.route("/api/auth", authRoutes);
  app.route("/api/workspaces", workspaceRoutes);
  app.route("/api", sourceRoutes);
  app.route("/api", analysisRoutes);
  app.route("/api", distributionRoutes);
  app.route("/api", accountRoutes);

  app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ error: "Not found." }, 404) : c.text("Not found", 404)));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "Something went wrong on the server." }, 500);
  });

  return app;
}
