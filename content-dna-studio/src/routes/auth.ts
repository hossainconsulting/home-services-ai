import { Hono } from "hono";
import {
  clearThrottle,
  createSession,
  createUser,
  destroySession,
  getUserByEmail,
  loginThrottled,
  normalizeEmail,
  passwordProblem,
  userFromRequest,
  verifyPassword,
  isAdmin,
} from "../auth.ts";
import { planFor } from "../plans.ts";

export const authRoutes = new Hono();

function publicUser(u: { id: string; email: string; plan: string; created_at: string }) {
  return { id: u.id, email: u.email, plan: u.plan, plan_name: planFor(u.plan).name, created_at: u.created_at, admin: isAdmin(u) };
}

authRoutes.post("/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!email) return c.json({ error: "Enter a valid email address." }, 400);
  const pw = passwordProblem(body.password);
  if (pw) return c.json({ error: pw }, 400);
  if (getUserByEmail(email)) return c.json({ error: "An account with that email already exists. Sign in instead." }, 409);
  const user = createUser(email, body.password);
  createSession(c, user.id);
  return c.json({ user: publicUser(user) }, 201);
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!email || typeof body.password !== "string") return c.json({ error: "Email and password are required." }, 400);
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}|${email}`;
  if (loginThrottled(key)) return c.json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  const user = getUserByEmail(email);
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    return c.json({ error: "Email or password is incorrect." }, 401);
  }
  clearThrottle(key);
  createSession(c, user.id);
  return c.json({ user: publicUser(user) });
});

authRoutes.post("/logout", (c) => {
  destroySession(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", (c) => {
  const user = userFromRequest(c);
  if (!user) return c.json({ user: null });
  return c.json({ user: publicUser(user) });
});
