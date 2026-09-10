/**
 * Shared RPAHUB workspace gateway (Electron main process side).
 *
 * ONE authoritative portfolio database lives on the company network share:
 *   \\westrock.com\shareddata\1101\RPAHUB\Data\portfolio.db
 *
 * This module NEVER touches the filesystem itself. Every operation is handed
 * to a background worker thread (electron/workspace-worker.cjs) and awaited
 * with a bounded timeout, so a dropped VPN can never freeze the main process
 * or the application window.
 *
 * Resilience rules:
 *  - bounded timeouts: a hung SMB call is abandoned, the worker is replaced
 *  - circuit breaker: once offline we stop hammering the share; background
 *    probes and the user's Retry/Sync button re-open the circuit
 *  - never create a local production database as a fallback
 */
const path = require("node:path");
const { Worker } = require("node:worker_threads");

const SHARED_ROOT = "\\\\westrock.com\\shareddata\\1101\\RPAHUB";
const DATA_DIR = path.join(SHARED_ROOT, "Data");
const DB_FILE = path.join(DATA_DIR, "portfolio.db");
const LOCK_FILE = path.join(DATA_DIR, "portfolio.lock");
const SCHEMA_VERSION = 7;

const OFFLINE_MESSAGE =
  "The RPAHUB shared database cannot currently be reached. If you are working remotely, connect to the company VPN and try again.";

const TIMEOUTS = { status: 6000, probe: 4000, read: 8000, write: 15000 };
/** While the circuit is open we fail fast instead of blocking on the share. */
const CIRCUIT_MS = 15000;

const dataDir = () => process.env.RPAHUB_DATA_DIR || DATA_DIR;

let worker = null;
let seq = 0;
const pending = new Map();
let offlineUntil = 0;

function settleAll(error) {
  pending.forEach((entry) => {
    clearTimeout(entry.timer);
    entry.resolve({ ok: false, connected: false, offline: true, path: dataDir(), error });
  });
  pending.clear();
}

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(path.join(__dirname, "workspace-worker.cjs"));
  worker.unref();
  worker.on("message", ({ id, result }) => {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    entry.resolve(result);
  });
  worker.on("error", (error) => {
    worker = null;
    settleAll(error.message || OFFLINE_MESSAGE);
  });
  worker.on("exit", () => {
    worker = null;
    settleAll(OFFLINE_MESSAGE);
  });
  return worker;
}

/** Abandon a worker that is stuck inside a blocking network call. */
function replaceWorker() {
  const stuck = worker;
  worker = null;
  settleAll(OFFLINE_MESSAGE);
  if (stuck) stuck.terminate().catch(() => {});
}

function call(op, payload = {}) {
  const id = ++seq;
  const target = ensureWorker();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      offlineUntil = Date.now() + CIRCUIT_MS;
      replaceWorker();
      resolve({ ok: false, connected: false, offline: true, timedOut: true, path: dataDir(), error: OFFLINE_MESSAGE });
    }, TIMEOUTS[op] ?? 8000);
    pending.set(id, { resolve, timer });
    try {
      target.postMessage({ id, op, payload });
    } catch (error) {
      pending.delete(id);
      clearTimeout(timer);
      resolve({ ok: false, connected: false, offline: true, path: dataDir(), error: error.message });
    }
  });
}

const circuitOpen = () => Date.now() < offlineUntil;

const offlineResult = () => ({
  ok: false,
  connected: false,
  offline: true,
  circuitOpen: true,
  path: dataDir(),
  error: OFFLINE_MESSAGE,
});

function record(result) {
  if (result && result.ok) offlineUntil = 0;
  else if (result && result.offline) offlineUntil = Date.now() + CIRCUIT_MS;
  return result;
}

/**
 * `force` (the user pressing Retry Connection / Sync) always closes the
 * circuit breaker and re-probes the share immediately.
 */
async function guarded(op, payload = {}) {
  const force = Boolean(payload.force);
  if (force) offlineUntil = 0;
  if (!force && circuitOpen()) return offlineResult();
  return record(await call(op, payload));
}

module.exports = {
  status: (payload = {}) => guarded("status", payload),
  read: (payload = {}) => guarded("read", payload),
  write: (payload = {}) => guarded("write", payload),
  probe: (payload = {}) => guarded("probe", payload),
  SHARED_ROOT,
  DATA_DIR,
  DB_FILE,
  LOCK_FILE,
  SCHEMA_VERSION,
  OFFLINE_MESSAGE,
};
