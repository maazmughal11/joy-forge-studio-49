/**
 * Shared RPAHUB workspace worker (Node worker thread).
 *
 * ALL filesystem access to the company network share happens here, on its own
 * thread. Windows can block an SMB call for many seconds when the VPN drops;
 * doing that work on the Electron main thread is what makes the window show
 * "Not Responding". Running it here keeps the UI thread completely free.
 *
 * The database file holds a versioned JSON envelope:
 *   { schemaVersion, rev, updatedAt, updatedBy, doc }
 */
const fs = require("node:fs");
const path = require("node:path");
const { parentPort } = require("node:worker_threads");

const SHARED_ROOT = "\\\\westrock.com\\shareddata\\1101\\RPAHUB";
const DATA_DIR = path.join(SHARED_ROOT, "Data");
const SCHEMA_VERSION = 7;
const LOCK_STALE_MS = 15000;

const OFFLINE_MESSAGE =
  "The RPAHUB shared database cannot currently be reached. If you are working remotely, connect to the company VPN and try again.";

function resolveDataDir() {
  return process.env.RPAHUB_DATA_DIR || DATA_DIR;
}

const paths = () => {
  const dir = resolveDataDir();
  return { dir, db: path.join(dir, "portfolio.db"), lock: path.join(dir, "portfolio.lock") };
};

/** Is the share reachable? Probed before anything is created. */
function reachable() {
  const dir = resolveDataDir();
  if (process.env.RPAHUB_DATA_DIR) return { ok: true };
  const root = dir.startsWith("\\\\") ? SHARED_ROOT : path.dirname(dir);
  try {
    fs.accessSync(root, fs.constants.R_OK);
    return { ok: true };
  } catch {
    try {
      fs.accessSync(dir, fs.constants.R_OK);
      return { ok: true };
    } catch {
      return { ok: false, offline: true, error: OFFLINE_MESSAGE };
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

/** Short-lived exclusive write lock. Stale locks (>15s) are reclaimed. */
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
      await sleep(40 + Math.random() * 90);
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

const emptyEnvelope = () => ({ schemaVersion: SCHEMA_VERSION, rev: 0, updatedAt: null, updatedBy: null, doc: null });

function readEnvelope() {
  const { db } = paths();
  if (!fs.existsSync(db)) return emptyEnvelope();
  const raw = fs.readFileSync(db, "utf8");
  if (!raw.trim()) return emptyEnvelope();
  return { ...emptyEnvelope(), ...JSON.parse(raw) };
}

/** Cheap revision probe: the header of the file is enough to compare. */
function currentRev() {
  const { db } = paths();
  if (!fs.existsSync(db)) return 0;
  const fd = fs.openSync(db, "r");
  try {
    const buf = Buffer.alloc(256);
    const read = fs.readSync(fd, buf, 0, 256, 0);
    const match = /"rev"\s*:\s*(\d+)/.exec(buf.toString("utf8", 0, read));
    if (match) return Number(match[1]);
  } finally {
    fs.closeSync(fd);
  }
  return readEnvelope().rev || 0;
}

/** Migrate an existing shared database forward. Never destroys data. */
function migrate(envelope) {
  if (!envelope.doc) return envelope;
  let { doc } = envelope;
  if (!Array.isArray(doc.tasks)) doc = { ...doc, tasks: [] };
  if (!Array.isArray(doc.tombstones)) doc = { ...doc, tombstones: [] };
  if (!Array.isArray(doc.standaloneApprovals)) doc = { ...doc, standaloneApprovals: [] };
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

/**
 * Incremental read: when the caller already has the current revision only a
 * tiny "unchanged" acknowledgement crosses the wire — the full portfolio
 * document is never re-sent or re-parsed on the 60-second refresh.
 */
function read(payload) {
  try {
    ensureDir();
    const since = payload && typeof payload.sinceRev === "number" ? payload.sinceRev : null;
    if (since !== null && since > 0 && currentRev() === since) {
      return { ok: true, connected: true, unchanged: true, rev: since, path: paths().dir };
    }
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
  if (!locked) return { ok: false, connected: true, busy: true, error: "The shared database is busy. Please retry." };
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

const OPS = { status, read, write, probe: () => reachable() };

parentPort.on("message", async (message) => {
  const { id, op, payload } = message ?? {};
  let result;
  try {
    const fn = OPS[op];
    result = fn ? await fn(payload ?? {}) : { ok: false, error: `Unknown workspace op: ${op}` };
  } catch (error) {
    result = { ok: false, connected: false, offline: true, error: error.message };
  }
  parentPort.postMessage({ id, result });
});
