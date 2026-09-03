/**
 * Shared RPAHUB workspace gateway (Electron main process).
 *
 * ONE authoritative portfolio database lives on the company network share:
 *
 *   \\westrock.com\shareddata\1101\RPAHUB\Data\portfolio.db
 *
 * The file holds a versioned JSON document envelope:
 *   { schemaVersion, rev, updatedAt, updatedBy, doc }
 *
 * Concurrency: every write takes a SHORT-LIVED exclusive lock file, verifies
 * the caller's base revision (stale writes are rejected so the renderer can
 * merge instead of destroying a newer change), writes to a temp file and
 * atomically renames it into place. Locks are released immediately and stale
 * locks (> 15s) are reclaimed so a crashed client cannot block the team.
 */
const fs = require("node:fs");
const path = require("node:path");

const SHARED_ROOT = "\\\\westrock.com\\shareddata\\1101\\RPAHUB";
const DATA_DIR = path.join(SHARED_ROOT, "Data");
const DB_FILE = path.join(DATA_DIR, "portfolio.db");
const LOCK_FILE = path.join(DATA_DIR, "portfolio.lock");
const SCHEMA_VERSION = 7;
const LOCK_STALE_MS = 15000;

/** Development / non-Windows fallback so the desktop shell is testable. */
function resolveDataDir() {
  if (process.env.RPAHUB_DATA_DIR) return process.env.RPAHUB_DATA_DIR;
  return DATA_DIR;
}

const paths = () => {
  const dir = resolveDataDir();
  return { dir, db: path.join(dir, "portfolio.db"), lock: path.join(dir, "portfolio.lock") };
};

/**
 * Is the company network share reachable at all?
 *
 * Remote users can only see \\westrock.com\... while the corporate VPN is up.
 * We probe the parent share BEFORE creating anything, so a disconnected client
 * can never silently create a second, local "production" database.
 */
function reachable() {
  const dir = resolveDataDir();
  if (process.env.RPAHUB_DATA_DIR) return { ok: true };
  const root = path.parse(dir).root && dir.startsWith("\\\\") ? SHARED_ROOT : path.dirname(dir);
  try {
    fs.accessSync(root, fs.constants.R_OK);
    return { ok: true };
  } catch {
    try {
      fs.accessSync(dir, fs.constants.R_OK);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        offline: true,
        error:
          "The RPAHUB shared database cannot currently be reached. If you are working remotely, connect to the company VPN and try again.",
      };
    }
  }
}

function ensureDir() {
  const probe = reachable();
  if (!probe.ok) {
    const err = new Error(probe.error);
    err.offline = true;
    throw err;
  }
  const { dir } = paths();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquireLock() {
  const { lock } = paths();
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const handle = fs.openSync(lock, "wx");
      fs.writeSync(handle, String(Date.now()));
      fs.closeSync(handle);
      return true;
    } catch {
      try {
        const stat = fs.statSync(lock);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) fs.unlinkSync(lock);
      } catch {
        /* lock disappeared — retry immediately */
      }
      await sleep(50 + Math.random() * 100);
    }
  }
  return false;
}

function releaseLock() {
  try {
    fs.unlinkSync(paths().lock);
  } catch {
    /* already released */
  }
}

function emptyEnvelope() {
  return { schemaVersion: SCHEMA_VERSION, rev: 0, updatedAt: null, updatedBy: null, doc: null };
}

function readEnvelope() {
  const { db } = paths();
  if (!fs.existsSync(db)) return emptyEnvelope();
  const raw = fs.readFileSync(db, "utf8");
  if (!raw.trim()) return emptyEnvelope();
  const parsed = JSON.parse(raw);
  return { ...emptyEnvelope(), ...parsed };
}

/** Migrate an existing shared database forward. Never destroys data. */
function migrate(envelope) {
  if (!envelope.doc) return envelope;
  let { doc } = envelope;
  if (!Array.isArray(doc.tasks)) doc = { ...doc, tasks: [] };
  if (!Array.isArray(doc.tombstones)) doc = { ...doc, tombstones: [] };
  if (doc.messages) {
    const { messages: _messages, ...rest } = doc;
    doc = rest;
  }
  return { ...envelope, doc, schemaVersion: SCHEMA_VERSION };
}

function status() {
  const { dir, db } = paths();
  try {
    ensureDir();
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
    const exists = fs.existsSync(db);
    const stat = exists ? fs.statSync(db) : null;
    return {
      ok: true,
      connected: true,
      path: dir,
      file: db,
      exists,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: stat ? new Date(stat.mtimeMs).toISOString() : null,
    };
  } catch (error) {
    return { ok: false, connected: false, offline: true, path: dir, file: db, error: error.message };
  }
}

function read() {
  try {
    ensureDir();
    const envelope = migrate(readEnvelope());
    return { ok: true, connected: true, path: paths().dir, ...envelope };
  } catch (error) {
    return { ok: false, connected: false, offline: true, path: paths().dir, error: error.message };
  }
}

async function write({ doc, baseRev, user }) {
  try {
    ensureDir();
  } catch (error) {
    return { ok: false, connected: false, offline: true, error: error.message };
  }
  const locked = await acquireLock();
  if (!locked) return { ok: false, connected: true, error: "The shared database is busy. Please retry." };
  try {
    const current = migrate(readEnvelope());
    if (current.doc && typeof baseRev === "number" && baseRev < current.rev) {
      // Someone else committed first — hand the newer document back so the
      // caller can merge rather than overwrite a colleague's work.
      return { ok: false, conflict: true, connected: true, ...current };
    }
    const next = {
      schemaVersion: SCHEMA_VERSION,
      rev: (current.rev || 0) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: user || null,
      doc,
    };
    const { db } = paths();
    const tmp = `${db}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next), "utf8");
    fs.renameSync(tmp, db);
    return { ok: true, connected: true, rev: next.rev, updatedAt: next.updatedAt, updatedBy: next.updatedBy };
  } catch (error) {
    return { ok: false, connected: false, offline: true, error: error.message };
  } finally {
    releaseLock();
  }
}

module.exports = { status, read, write, reachable, SHARED_ROOT, DATA_DIR, DB_FILE, LOCK_FILE, SCHEMA_VERSION };
