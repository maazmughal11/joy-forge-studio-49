import type { AdminLogEntry, AppData, Approval, Automation, FieldValue, HistoryEntry, Message, Role, Stage, UserAccount } from "./types";
import { seedData, DEFAULT_OPTIONS, DEFAULT_USERS } from "./seed";
import { FIELDS } from "./fields";
import { ROLE_PERMISSIONS } from "./auth";
import { storageConfig } from "@/data/config";

/**
 * Local storage engine.
 *
 * INTERNAL to the data layer: this file is the persistence implementation
 * behind `src/data/providers/local`. UI code must never import it directly —
 * use `@/data` instead.
 */
const STORAGE_KEY = storageConfig.localStorageKey;

let state: AppData = seedData();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/**
 * Writes are batched: UI mutations stay instant even with tens of thousands of
 * records, and the (potentially large) JSON document is serialized at most once
 * per animation frame instead of once per keystroke. Any pending write is
 * flushed synchronously before the window/desktop app closes.
 */
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

/** Last known storage failure, surfaced through `getStorageHealth()`. */
let storageError: string | null = null;

function writeNow() {
  if (typeof window === "undefined") return;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageError = null;
  } catch {
    // Almost always a quota overflow. Backups are the largest, most
    // reproducible payload, so shed the oldest ones and retry before giving up.
    try {
      let backups = state.backups ?? [];
      while (backups.length > 0) {
        backups = backups.slice(0, backups.length - 1);
        state = { ...state, backups };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          storageError = "Storage was nearly full — the oldest backups were removed to save your latest changes.";
          emit();
          return;
        } catch {
          /* keep shedding */
        }
      }
      storageError = "Storage is full. Export a JSON backup and remove old records to continue saving changes.";
      emit();
    } catch {
      storageError = "Storage is unavailable in this environment.";
    }
  }
}

function bindFlushListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  const flush = () => writeNow();
  window.addEventListener("beforeunload", flush);
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

function persist() {
  if (typeof window === "undefined") return;
  bindFlushListeners();
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(writeNow, 250);
}

/** Approximate browser/desktop localStorage budget (5 MB). */
const STORAGE_BUDGET_BYTES = 5 * 1024 * 1024;

/** Storage diagnostics for the settings screen / troubleshooting. */
export function getStorageHealth() {
  let usedBytes = 0;
  if (typeof window !== "undefined") {
    try {
      usedBytes = (window.localStorage.getItem(STORAGE_KEY) ?? "").length * 2;
    } catch {
      /* ignore */
    }
  }
  const percent = Math.min(100, Math.round((usedBytes / STORAGE_BUDGET_BYTES) * 100));
  return {
    error: storageError,
    usedKb: Math.round(usedBytes / 1024),
    budgetKb: Math.round(STORAGE_BUDGET_BYTES / 1024),
    percent,
    records: state.automations.length,
    backups: (state.backups ?? []).length,
  };
}


/** Force any batched write to disk immediately (used before export/backup). */
export function flushPersist() {
  writeNow();
}


function normalize(parsed: AppData): AppData {
  const base = seedData();
  return {
    ...base,
    ...parsed,
    backups: parsed.backups ?? [],
    adminLog: parsed.adminLog ?? [],
    accounts: parsed.accounts ?? [],
    messages: parsed.messages ?? [],
    settings: {
      ...base.settings,
      ...parsed.settings,
      options: { ...DEFAULT_OPTIONS, ...(parsed.settings?.options ?? {}) },
      users: parsed.settings?.users ?? DEFAULT_USERS,
    },
    automations: (parsed.automations ?? []).map((a) => ({
      ...a,
      approvals: a.approvals ?? [],
      documents: a.documents ?? [],
      comments: a.comments ?? [],
      updates: a.updates ?? [],
      history: a.history ?? [],
    })),
  };
}


export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.automations) state = normalize(parsed);
    } else {
      persist();
    }
  } catch {
    /* ignore corrupt data */
  }
  emit();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = () => state;

/** Raw document snapshot. Internal to the data layer — UI must use `@/data`. */
export function getState(): AppData {
  return state;
}

/** Hard cap on the admin log so long-running installs cannot grow unbounded. */
const ADMIN_LOG_LIMIT = 2000;

function setState(next: AppData) {
  const adminLog = next.adminLog && next.adminLog.length > ADMIN_LOG_LIMIT
    ? next.adminLog.slice(0, ADMIN_LOG_LIMIT)
    : next.adminLog;
  state = { ...next, adminLog, settings: { ...next.settings, lastWriteAt: new Date().toISOString() } };
  persist();
  emit();
}


const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

function histEntry(user: string, action: string, extra: Partial<HistoryEntry> = {}): HistoryEntry {
  return { id: uid("h"), timestamp: new Date().toISOString(), user, action, ...extra };
}

function adminEntry(user: string, action: string, detail?: string): AdminLogEntry {
  return { id: uid("log"), timestamp: new Date().toISOString(), user, action, ...(detail ? { detail } : {}) };
}

function touch(record: Automation, user: string, entries: HistoryEntry[]): Automation {
  return {
    ...record,
    modifiedBy: user,
    modifiedDate: new Date().toISOString(),
    history: [...record.history, ...entries],
  };
}

function update(id: string, fn: (r: Automation) => Automation) {
  setState({ ...state, automations: state.automations.map((a) => (a.id === id ? fn(a) : a)) });
}

function nextAutomationId(): string {
  const fy = new Date().getFullYear();
  const nums = state.automations
    .map((a) => /AUT-\d{4}-(\d+)/.exec(String(a.data['automationId'] ?? "")))
    .map((m) => (m ? Number(m[1]) : 0));
  const next = Math.max(0, ...nums) + 1;
  return `AUT-${fy}-${String(next).padStart(4, "0")}`;
}

export const actions = {
  setCurrentUser(name: string) {
    setState({ ...state, settings: { ...state.settings, currentUser: name } });
  },
  setDataFolderPath(path: string) {
    setState({ ...state, settings: { ...state.settings, dataFolderPath: path } });
  },
  setSettings(patch: Partial<AppData["settings"]>) {
    setState({ ...state, settings: { ...state.settings, ...patch } });
  },
  setStorageMode(mode: AppData["settings"]["storageMode"], user: string) {
    setState({
      ...state,
      settings: {
        ...state.settings,
        storageMode: mode,
        workspaceLock: mode === "shared" ? { user, acquiredAt: new Date().toISOString() } : null,
      },
      adminLog: [adminEntry(user, `Storage mode set to ${mode === "shared" ? "Shared Workspace" : "Local Workspace"}`), ...state.adminLog],
    });
  },
  setOptionList(key: string, values: string[]) {
    const settings = { ...state.settings, options: { ...state.settings.options, [key]: values } };
    if (key === "users") settings.users = values;
    setState({ ...state, settings });
  },
  createRecord(stage: Stage, user: string): Automation {
    const now = new Date().toISOString();
    const record: Automation = {
      id: uid("aut"),
      stage,
      category: stage === "idea" ? "Discovery" : stage === "production" ? "Deployed" : "Pipeline",
      data: {
        automationId: nextAutomationId(),
        submittedBy: user,
        submissionDate: now.slice(0, 10),
        opportunityName: "Untitled opportunity",
        opportunityStatus: stage === "idea" ? "Ideation" : "Business Case Approved",
        ...(stage === "idea" ? {} : { projectStatus: "Requirements" }),
        year: `FY${new Date().getFullYear()}`,
      },
      scoring: { businessValue: 3, complexity: 3, risk: 3, strategicPriority: 3 },
      createdBy: user,
      createdDate: now,
      modifiedBy: user,
      modifiedDate: now,
      history: [histEntry(user, "Record created")],
      documents: [],
      comments: [],
      updates: [],
      approvals: [],
    };
    setState({ ...state, automations: [record, ...state.automations] });
    return record;
  },
  setField(id: string, key: string, value: FieldValue, user: string) {
    update(id, (r) => {
      const old = r.data[key];
      if (String(old ?? "") === String(value ?? "")) return r;
      const label = FIELDS.find((f) => f.key === key)?.label ?? key;
      const next = touch({ ...r, data: { ...r.data, [key]: value } }, user, [
        histEntry(user, `Updated ${label}`, { field: label, oldValue: String(old ?? "—"), newValue: String(value ?? "—") }),
      ]);
      if (key === "projectStatus" && value === "Production") {
        next.stage = "production";
        next.category = "Deployed";
        next.history.push(histEntry(user, "Moved to Production"));
      } else if (key === "projectStatus" && r.stage === "production") {
        next.stage = "project";
        next.category = "Pipeline";
      }
      return next;
    });
  },
  setScoring(id: string, key: keyof Automation["scoring"], value: number, user: string) {
    update(id, (r) =>
      touch({ ...r, scoring: { ...r.scoring, [key]: value } }, user, [
        histEntry(user, `Updated score: ${key}`, { field: key, oldValue: String(r.scoring[key]), newValue: String(value) }),
      ]),
    );
  },
  moveToProject(id: string, user: string) {
    update(id, (r) =>
      touch(
        {
          ...r,
          stage: "project",
          category: "Pipeline",
          data: { ...r.data, projectStatus: (r.data['projectStatus'] as string) || "Requirements" },
        },
        user,
        [histEntry(user, "Moved to Project Tracking", { field: "stage", oldValue: "idea", newValue: "project" })],
      ),
    );
  },
  setStage(id: string, stage: Stage, user: string) {
    update(id, (r) =>
      touch({ ...r, stage, category: stage === "idea" ? "Discovery" : stage === "production" ? "Deployed" : "Pipeline" }, user, [
        histEntry(user, `Stage changed to ${stage}`, { field: "stage", oldValue: r.stage, newValue: stage }),
      ]),
    );
  },
  addComment(id: string, text: string, user: string) {
    update(id, (r) =>
      touch({ ...r, comments: [...r.comments, { id: uid("c"), timestamp: new Date().toISOString(), user, text }] }, user, [
        histEntry(user, "Added a comment"),
      ]),
    );
  },
  addUpdate(
    id: string,
    payload: {
      text: string;
      percentComplete: number;
      rag: "Red" | "Amber" | "Green";
      accomplishments?: string;
      nextSteps?: string;
      blockers?: string;
      decisions?: string;
    },
    user: string,
  ) {
    update(id, (r) =>
      touch(
        {
          ...r,
          data: { ...r.data, latestComment: payload.text },
          updates: [...r.updates, { id: uid("u"), date: new Date().toISOString().slice(0, 10), submittedBy: user, ...payload }],
        },
        user,
        [histEntry(user, `Weekly update submitted (${payload.rag}, ${payload.percentComplete}%)`)],
      ),
    );
  },
  addApproval(id: string, approval: Omit<Approval, "id">, user: string) {
    update(id, (r) =>
      touch({ ...r, approvals: [...(r.approvals ?? []), { ...approval, id: uid("ap") }] }, user, [
        histEntry(user, `Approval requested: ${approval.type}`),
      ]),
    );
  },
  updateApproval(id: string, approvalId: string, patch: Partial<Approval>, user: string) {
    update(id, (r) =>
      touch(
        {
          ...r,
          approvals: (r.approvals ?? []).map((ap) => (ap.id === approvalId ? { ...ap, ...patch } : ap)),
        },
        user,
        [histEntry(user, `Approval updated${patch.status ? `: ${patch.status}` : ""}`)],
      ),
    );
  },
  addDocument(id: string, doc: Omit<Automation["documents"][number], "id" | "uploadedBy" | "uploadedDate">, user: string) {
    update(id, (r) =>
      touch(
        { ...r, documents: [...r.documents, { ...doc, id: uid("d"), uploadedBy: user, uploadedDate: new Date().toISOString() }] },
        user,
        [histEntry(user, `Linked document: ${doc.name}`)],
      ),
    );
  },
  removeDocument(id: string, docId: string, user: string) {
    update(id, (r) => touch({ ...r, documents: r.documents.filter((d) => d.id !== docId), }, user, [histEntry(user, "Removed a document link")]));
  },
  deleteRecord(id: string) {
    setState({ ...state, automations: state.automations.filter((a) => a.id !== id) });
  },

  // ---------- Migration / import ----------
  importRecords(rows: Partial<Automation>[], user: string, source: string) {
    const now = new Date().toISOString();
    let seq = 0;
    const created: Automation[] = rows.map((row) => {
      const fy = new Date().getFullYear();
      const existingMax = Math.max(
        0,
        ...state.automations.map((a) => Number(/AUT-\d{4}-(\d+)/.exec(String(a.data['automationId'] ?? ""))?.[1] ?? 0)),
      );
      seq += 1;
      const stage = (row.stage ?? "idea") as Stage;
      return {
        id: uid("aut"),
        stage,
        category: stage === "idea" ? "Discovery" : stage === "production" ? "Deployed" : "Pipeline",
        data: {
          automationId: `AUT-${fy}-${String(existingMax + seq).padStart(4, "0")}`,
          migrationSource: source,
          ...(row.data ?? {}),
        },
        scoring: row.scoring ?? { businessValue: 3, complexity: 3, risk: 3, strategicPriority: 3 },
        createdBy: user,
        createdDate: now,
        modifiedBy: user,
        modifiedDate: now,
        history: [histEntry(user, `Imported from ${source}`)],
        documents: [],
        comments: [],
        updates: [],
        approvals: [],
      } satisfies Automation;
    });
    setState({
      ...state,
      automations: [...created, ...state.automations],
      adminLog: [adminEntry(user, `Imported ${created.length} record(s)`, source), ...state.adminLog],
    });
    return created.length;
  },
  updateImportedRecord(id: string, data: Record<string, FieldValue>, user: string, source: string) {
    update(id, (r) => touch({ ...r, data: { ...r.data, ...data, migrationSource: source } }, user, [histEntry(user, `Updated by import (${source})`)]));
  },

  // ---------- Backup & restore ----------
  createBackup(user: string, reason = "Manual backup") {
    const payload = JSON.stringify({ ...state, backups: [] });
    const backup = {
      id: uid("bk"),
      createdAt: new Date().toISOString(),
      createdBy: user,
      records: state.automations.length,
      sizeKb: Math.round((payload.length / 1024) * 10) / 10,
      reason,
      payload,
    };
    const retention = state.settings.backupRetention || 7;
    setState({
      ...state,
      backups: [backup, ...state.backups].slice(0, retention),
      adminLog: [adminEntry(user, "Backup created", reason), ...state.adminLog],
    });
    return backup;
  },
  restoreBackup(backupId: string, user: string) {
    const backup = state.backups.find((b) => b.id === backupId);
    if (!backup) throw new Error("Backup not found");
    const safety = actions.createBackup(user, "Safety backup before restore");
    const parsed = normalize(JSON.parse(backup.payload) as AppData);
    setState({
      ...parsed,
      backups: [safety, ...state.backups].slice(0, state.settings.backupRetention || 7),
      adminLog: [adminEntry(user, "Portfolio restored from backup", new Date(backup.createdAt).toLocaleString()), ...state.adminLog],
    });
  },
  deleteBackup(id: string) {
    setState({ ...state, backups: state.backups.filter((b) => b.id !== id) });
  },
  exportJson() {
    return JSON.stringify(state, null, 2);
  },
  importJson(raw: string) {
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed?.automations) throw new Error("Invalid data file");
    setState(normalize(parsed));
  },
  resetToSeed() {
    const accounts = state.accounts;
    const seeded = seedData();
    setState({ ...seeded, accounts });
  },

  // ---------- Accounts, authentication & audit ----------
  logAudit(user: string, action: string, detail?: string) {
    setState({ ...state, adminLog: [adminEntry(user, action, detail), ...state.adminLog] });
  },
  createAccount(
    input: {
      firstName: string;
      lastName: string;
      username: string;
      pinHash: string;
      pinSalt: string;
      role: Role;
      permissions?: string[];
    },
    actor: string,
  ): UserAccount {
    const now = new Date().toISOString();
    const displayName = `${input.firstName} ${input.lastName}`.trim();
    const account: UserAccount = {
      id: uid("usr"),
      firstName: input.firstName,
      lastName: input.lastName,
      displayName,
      username: input.username.toLowerCase(),
      pinHash: input.pinHash,
      pinSalt: input.pinSalt,
      role: input.role,
      permissions: input.permissions ?? [...ROLE_PERMISSIONS[input.role]],
      active: true,
      createdDate: now,
      modifiedDate: now,
    };
    const users = state.settings.users.includes(displayName) ? state.settings.users : [...state.settings.users, displayName];
    setState({
      ...state,
      accounts: [...state.accounts, account],
      settings: { ...state.settings, users, options: { ...state.settings.options, users } },
      adminLog: [adminEntry(actor, "User created", `${displayName} (${account.username}) · ${account.role}`), ...state.adminLog],
    });
    return account;
  },
  updateAccount(id: string, patch: Partial<UserAccount>, actor: string, auditAction?: string, detail?: string) {
    const accounts = state.accounts.map((a) =>
      a.id === id ? { ...a, ...patch, modifiedDate: new Date().toISOString() } : a,
    );
    setState({
      ...state,
      accounts,
      adminLog: auditAction ? [adminEntry(actor, auditAction, detail), ...state.adminLog] : state.adminLog,
    });
  },
  // ---------- Direct messages ----------
  sendMessage(input: { from: string; to: string; subject: string; body: string; recordId?: string; recordLabel?: string }): Message {
    const message: Message = {
      id: uid("msg"),
      from: input.from,
      to: input.to,
      subject: input.subject,
      body: input.body,
      ...(input.recordId ? { recordId: input.recordId } : {}),
      ...(input.recordLabel ? { recordLabel: input.recordLabel } : {}),
      sentAt: new Date().toISOString(),
    };
    setState({
      ...state,
      messages: [message, ...(state.messages ?? [])],
      adminLog: [adminEntry(input.from, "Message sent", `To ${input.to}: ${input.subject}`), ...state.adminLog],
    });
    return message;
  },
  markMessageRead(id: string, read = true) {
    setState({
      ...state,
      messages: (state.messages ?? []).map((m) => {
        if (m.id !== id) return m;
        if (read) return { ...m, readAt: m.readAt ?? new Date().toISOString() };
        const { readAt: _readAt, ...rest } = m;
        return rest;
      }),
    });
  },
  resolveMessage(id: string, resolved = true) {
    setState({
      ...state,
      messages: (state.messages ?? []).map((m) => {
        if (m.id !== id) return m;
        const seen = { ...m, readAt: m.readAt ?? new Date().toISOString() };
        if (resolved) return { ...seen, resolvedAt: new Date().toISOString() };
        const { resolvedAt: _resolvedAt, ...rest } = seen;
        return rest;
      }),
    });
  },
  deleteMessage(id: string) {
    setState({ ...state, messages: (state.messages ?? []).filter((m) => m.id !== id) });
  },

  recordLogin(id: string) {
    const acct = state.accounts.find((a) => a.id === id);
    setState({
      ...state,
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, lastLogin: new Date().toISOString() } : a)),
      settings: { ...state.settings, currentUser: acct?.displayName ?? state.settings.currentUser },
      adminLog: [adminEntry(acct?.displayName ?? "Unknown", "Successful login", acct?.username), ...state.adminLog],
    });
  },
};

