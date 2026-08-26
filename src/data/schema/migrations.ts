/**
 * Relational schema definition and versioned migrations.
 *
 * Used by the forthcoming Electron SQLite provider (and reusable by any SQL
 * backend). Migrations are additive and ordered: an existing database is
 * upgraded step-by-step from its stored `user_version` to
 * `CURRENT_SCHEMA_VERSION` WITHOUT deleting user data.
 *
 * Rules:
 *  - Never edit a released migration; add a new one.
 *  - Never DROP a column that holds user data; deprecate it instead.
 */

import { CURRENT_SCHEMA_VERSION } from "@/data/config";

export type Migration = {
  version: number;
  name: string;
  /** Statements executed in order inside a single transaction. */
  up: string[];
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: [
      `CREATE TABLE IF NOT EXISTS automations (
        id TEXT PRIMARY KEY,
        stage TEXT NOT NULL,
        category TEXT NOT NULL,
        data TEXT NOT NULL,
        scoring TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_date TEXT NOT NULL,
        modified_by TEXT NOT NULL,
        modified_date TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_automations_stage ON automations(stage)`,
      `CREATE TABLE IF NOT EXISTS weekly_updates (
        id TEXT PRIMARY KEY,
        automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        submitted_by TEXT NOT NULL,
        text TEXT,
        percent_complete INTEGER NOT NULL DEFAULT 0,
        rag TEXT NOT NULL,
        accomplishments TEXT,
        next_steps TEXT,
        blockers TEXT,
        decisions TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_updates_automation ON weekly_updates(automation_id)`,
      `CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_by TEXT,
        requested_date TEXT,
        approver TEXT,
        due_date TEXT,
        decision_date TEXT,
        decision_comments TEXT,
        evidence_link TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_approvals_automation ON approvals(automation_id)`,
      `CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
        timestamp TEXT NOT NULL,
        user TEXT NOT NULL,
        text TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT,
        link TEXT,
        status TEXT,
        uploaded_by TEXT,
        uploaded_date TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
        timestamp TEXT NOT NULL,
        user TEXT NOT NULL,
        action TEXT NOT NULL,
        field TEXT,
        old_value TEXT,
        new_value TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS admin_log (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        user TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        pin_hash TEXT NOT NULL,
        pin_salt TEXT NOT NULL,
        role TEXT NOT NULL,
        permissions TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        last_login TEXT,
        created_date TEXT NOT NULL,
        modified_date TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS reference_data (
        key TEXT PRIMARY KEY,
        values_json TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        records INTEGER NOT NULL,
        size_kb REAL NOT NULL,
        reason TEXT,
        payload TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 2,
    name: "automation_lookup_columns",
    up: [
      `ALTER TABLE automations ADD COLUMN automation_code TEXT`,
      `ALTER TABLE automations ADD COLUMN fiscal_year TEXT`,
      `ALTER TABLE automations ADD COLUMN region TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_automations_fy ON automations(fiscal_year)`,
    ],
  },
];

/** Migrations still pending for a database currently at `fromVersion`. */
export function pendingMigrations(fromVersion: number): Migration[] {
  return MIGRATIONS.filter((m) => m.version > fromVersion).sort((a, b) => a.version - b.version);
}

export const LATEST_DB_VERSION = MIGRATIONS.reduce((max, m) => Math.max(max, m.version), 0);

/** Data-document version served by the current app build. */
export const APP_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;
