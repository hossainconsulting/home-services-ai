import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.ts";

export type Row = Record<string, unknown>;

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  if (config.dbPath !== ":memory:") mkdirSync(dirname(config.dbPath), { recursive: true });
  db = new DatabaseSync(config.dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(d: DatabaseSync) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS workspaces_user ON workspaces(user_id);
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      channel_label TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      url TEXT,
      video_id TEXT,
      transcript TEXT NOT NULL,
      metrics TEXT NOT NULL DEFAULT '{}',
      published_at TEXT,
      duration_s INTEGER,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS sources_workspace ON sources(workspace_id);
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      module TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      input TEXT NOT NULL DEFAULT '{}',
      output TEXT NOT NULL DEFAULT '',
      error TEXT,
      usage TEXT NOT NULL DEFAULT '{}',
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS analyses_workspace ON analyses(workspace_id);
    CREATE TABLE IF NOT EXISTS distributions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
      analysis_id TEXT REFERENCES analyses(id) ON DELETE SET NULL,
      channels TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'running',
      output TEXT NOT NULL DEFAULT '',
      error TEXT,
      usage TEXT NOT NULL DEFAULT '{}',
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS distributions_workspace ON distributions(workspace_id);
    CREATE TABLE IF NOT EXISTS usage_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT,
      kind TEXT NOT NULL,
      ref_id TEXT,
      model TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS usage_user_month ON usage_events(user_id, created_at);
  `);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function monthStartIso(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export function parseJson<T>(s: unknown, dflt: T): T {
  if (typeof s !== "string" || s === "") return dflt;
  try {
    return JSON.parse(s) as T;
  } catch {
    return dflt;
  }
}

/** Test helper: drop the singleton so the next getDb() opens a fresh file. */
export function resetDbForTests() {
  db?.close();
  db = null;
}
