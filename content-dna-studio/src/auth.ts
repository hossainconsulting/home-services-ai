import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { getDb, nowIso } from "./db.ts";
import { config } from "./config.ts";

export const COOKIE = "cds_session";
const SESSION_DAYS = 30;

export interface User {
  id: string;
  email: string;
  plan: string;
  created_at: string;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required.";
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (password.length > 200) return "Password is too long.";
  return null;
}

export function createUser(email: string, password: string): User {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(
    id,
    email,
    hashPassword(password),
  );
  return getUserById(id)!;
}

export function getUserById(id: string): User | null {
  const row = getDb()
    .prepare("SELECT id, email, plan, created_at FROM users WHERE id = ?")
    .get(id) as User | undefined;
  return row ?? null;
}

export function getUserByEmail(email: string): (User & { password_hash: string }) | null {
  const row = getDb()
    .prepare("SELECT id, email, plan, created_at, password_hash FROM users WHERE email = ?")
    .get(email) as (User & { password_hash: string }) | undefined;
  return row ?? null;
}

export function createSession(c: Context, userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expires.toISOString());
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: config.isProd,
    path: "/",
    expires,
  });
}

export function destroySession(c: Context) {
  const token = getCookie(c, COOKIE);
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  deleteCookie(c, COOKIE, { path: "/" });
}

export function userFromRequest(c: Context): User | null {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.plan, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token) as (User & { expires_at: string }) | undefined;
  if (!row) return null;
  if (row.expires_at < nowIso()) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  const { expires_at: _drop, ...user } = row;
  return user;
}

export type AuthEnv = { Variables: { user: User } };

export const requireUser: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const user = userFromRequest(c);
  if (!user) return c.json({ error: "Sign in required." }, 401);
  c.set("user", user);
  await next();
};

export function isAdmin(user: User): boolean {
  return config.adminEmails.includes(user.email);
}

// Small in-memory throttle for login attempts. Per process; good enough for
// a single-node deployment, and it resets on restart by design.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;

export function loginThrottled(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export function clearThrottle(key: string) {
  attempts.delete(key);
}
