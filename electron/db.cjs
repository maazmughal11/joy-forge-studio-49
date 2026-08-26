/**
 * SQLite gateway for the Electron main process (scaffold).
 *
 * Opens (or creates) the database, applies pending schema migrations, and
 * exposes one handler per allow-listed IPC channel. Handlers are the SQLite
 * implementation of the repository contracts declared in
 * `src/data/repositories.ts`.
 *
 * NOTE: `better-sqlite3` is intentionally not a dependency yet — packaging is
 * a later step. Until then this module throws a clear error if loaded.
 */
const fs = require("fs");
const path = require("path");

/**
 * Ordered migrations. Never edit a shipped migration: add a new one so an
 * existing database upgrades in place without losing user data.
 * Mirrors src/data/schema/migrations.ts.
 */
function loadMigrations() {
  const file = path.join(__dirname, "migrations.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function applyMigrations(sqlite) {
  sqlite.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
  const row = sqlite.prepare("SELECT version FROM schema_version LIMIT 1").get();
  let current = row ? row.version : 0;
  if (!row) sqlite.prepare("INSERT INTO schema_version (version) VALUES (0)").run();

  for (const migration of loadMigrations()) {
    if (migration.version <= current) continue;
    sqlite.transaction(() => {
      for (const statement of migration.up) sqlite.exec(statement);
      sqlite.prepare("UPDATE schema_version SET version = ?").run(migration.version);
    })();
    current = migration.version;
  }
  return current;
}

function openDatabase(filePath) {
  let Database;
  try {
    Database = require("better-sqlite3");
  } catch {
    throw new Error(
      "better-sqlite3 is not installed yet. Install it in the desktop packaging step before launching the Electron build.",
    );
  }

  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const version = applyMigrations(sqlite);

  /** Channel handlers are added alongside the packaging work. */
  const handlers = {
    "app.initialize": () => ({ schemaVersion: version, file: filePath }),
  };

  return { sqlite, version, handlers };
}

module.exports = { openDatabase, applyMigrations };
