import type {
  AdminLogEntry,
  AppData,
  Approval,
  Automation,
  FieldValue,
  HistoryEntry,
  Role,
  Stage,
  TaskRecord,
  Tombstone,
  UserAccount,
} from "./types";
import { seedData, DEFAULT_OPTIONS, SHARED_WORKSPACE_PATH } from "./seed";
import { FIELDS } from "./fields";
import { ROLE_PERMISSIONS } from "./auth";
import { storageConfig } from "@/data/config";

/**
 * Workspace store engine.
 *
 * INTERNAL to the data layer: this file is the persistence implementation
 * behind `src/data/providers/local`. UI code must never import it directly —
 * use `@/data` instead.
 *
 * Persistence targets, resolved at runtime:
 *  - Electron desktop → the ONE shared RPAHUB database on the company network
 *    share, through the secure `window.rpaDesktop` IPC bridge. Writes are
 *    immediate; a 60-second background sync pulls in other users' changes.
 *  - Browser (Lovable preview) → localStorage, so the app stays fully usable.
 */
const STORAGE_KEY = storageConfig.localStorageKey;

let state: AppData = seedData();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/* ------------------------------------------------------------------ */
/* Desktop bridge                                                      */
/* ------------------------------------------------------------------ */

type Bridge = { workspaceReady?: boolean; invoke: (channel: string, payload?: unknown) => Promise<any> };

const bridge = (): Bridge | null => {
  if (typeof window === "undefined") return null;
  const desktop = (window as unknown as { rpaDesktop?: Bridge }).rpaDesktop;
  return desktop?.workspaceReady ? desktop : null;
};

export type ConnectionStatus = "connecting" | "connected" | "offline" | "syncing";

export type WorkspaceConnection = {
  shared: boolean;
  status: ConnectionStatus;
  path: string;
  error: string | null;
  lastSyncedAt: string | null;
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
  rev: number;
  pendingWrite: boolean;
};

let connection: WorkspaceConnection = {
  shared: false,
  status: "connecting",
  path: SHARED_WORKSPACE_PATH,
  error: null,
  lastSyncedAt: null,
  lastUpdatedAt: null,
  lastUpdatedBy: null,
  rev: 0,
  pendingWrite: false,
};

export const getConnection = () => connection;

function setConnection(patch: Partial<WorkspaceConnection>) {
  connection = { ...connection, ...patch };
  emit();
}

/** True while the authoritative shared database cannot be reached. */
export const isReadOnly = () => connection.shared && connection.status === "offline";

/* ------------------------------------------------------------------ */
/* Document normalisation & merging                                    */
/* ------------------------------------------------------------------ */

function normalize(parsed: AppData): AppData {
  const base = seedData();
  return {
    ...base,
    ...parsed,
    tasks: parsed.tasks ?? [],
    tombstones: parsed.tombstones ?? [],
    adminLog: parsed.adminLog ?? [],
    accounts: parsed.accounts ?? [],
    settings: {
      ...base.settings,
      ...parsed.settings,
      storageMode: "shared",
      dataFolderPath: SHARED_WORKSPACE_PATH,
      options: { ...DEFAULT_OPTIONS, ...(parsed.settings?.options ?? {}) },
      users: parsed.settings?.users ?? [],
    },
    automations: (parsed.automations ?? []).map((a) => ({
      ...a,
      rev: a.rev ?? 1,
      approvals: a.approvals ?? [],
      documents: a.documents ?? [],
      comments: a.comments ?? [],
      updates: (a.updates ?? []).map((u) => ({ ...u, readBy: u.readBy ?? [] })),
      history: a.history ?? [],
    })),
  };
}

const newer = (a?: string, b?: string) => new Date(a ?? 0).getTime() >= new Date(b ?? 0).getTime();

function mergeById<T extends { id: string }>(remote: T[], local: T[], pick: (r: T, l: T) => T): T[] {
  const out = new Map<string, T>();
  remote.forEach((r) => out.set(r.id, r));
  local.forEach((l) => {
    const r = out.get(l.id);
    out.set(l.id, r ? pick(r, l) : l);
  });
  return [...out.values()];
}

/**
 * Merge the authoritative remote document with local state.
 *
 * Per entity the most recently modified version wins, so two users editing
 * different records never overwrite each other. Deletions are represented by
 * tombstones so they are not resurrected by a peer's stale copy.
 */
export function mergeDocuments(remote: AppData, local: AppData): AppData {
  const r = normalize(remote);
  const l = normalize(local);
  const tombstones = mergeById<Tombstone>(r.tombstones, l.tombstones, (a) => a);
  const dead = new Set(tombstones.map((t) => `${t.entity}:${t.id}`));

  const automations = mergeById<Automation>(r.automations, l.automations, (rr, ll) =>
    (ll.rev ?? 0) > (rr.rev ?? 0) || (((ll.rev ?? 0) === (rr.rev ?? 0)) && newer(ll.modifiedDate, rr.modifiedDate)) ? ll : rr,
  ).filter((a) => !dead.has(`automation:${a.id}`));

  const tasks = mergeById<TaskRecord>(r.tasks, l.tasks, (rr, ll) => (newer(ll.modifiedDate, rr.modifiedDate) ? ll : rr))
    .filter((t) => !dead.has(`task:${t.id}`));

  const accounts = mergeById<UserAccount>(r.accounts, l.accounts, (rr, ll) =>
    newer(ll.modifiedDate, rr.modifiedDate) ? ll : rr,
  );

  const adminLog = mergeById<AdminLogEntry>(r.adminLog, l.adminLog, (rr) => rr)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, ADMIN_LOG_LIMIT);

  return withUserOptions({
    ...r,
    automations: automations.sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime()),
    tasks,
    accounts,
    adminLog,
    tombstones,
    settings: {
      ...r.settings,
      ...l.settings,
      options: { ...r.settings.options, ...l.settings.options },
    },
  });
}

/** Assignment dropdowns always mirror the active (non-deleted) accounts. */
function withUserOptions(doc: AppData): AppData {
  const users = doc.accounts.filter((a) => a.active && !a.deleted).map((a) => a.displayName).sort();
  return {
    ...doc,
    settings: { ...doc.settings, users, options: { ...doc.settings.options, users } },
  };
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let writing = false;
let writeQueued = false;
let listenersBound = false;
let storageError: string | null = null;

function writeLocal() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageError = null;
  } catch {
    storageError = "Storage is full. Export a JSON backup and remove old records to continue saving changes.";
  }
}

async function writeShared(desktop: Bridge): Promise<void> {
  if (writing) {
    writeQueued = true;
    return;
  }
  writing = true;
  setConnection({ pendingWrite: true, status: "syncing" });
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await desktop.invoke("workspace.write", {
        doc: state,
        baseRev: connection.rev,
        user: state.settings.currentUser,
      });
      if (res?.ok) {
        setConnection({
          rev: res.rev,
          status: "connected",
          error: null,
          lastUpdatedAt: res.updatedAt,
          lastUpdatedBy: res.updatedBy,
          lastSyncedAt: new Date().toISOString(),
        });
        break;
      }
      if (res?.conflict && res.doc) {
        // A colleague committed first: merge their document into ours and retry.
        state = mergeDocuments(res.doc as AppData, state);
        connection = { ...connection, rev: res.rev };
        emit();
        continue;
      }
      setConnection({ status: "offline", error: res?.error ?? "The shared workspace is unavailable." });
      break;
    }
  } catch (error) {
    setConnection({ status: "offline", error: (error as Error).message });
  } finally {
    writing = false;
    setConnection({ pendingWrite: false });
    if (writeQueued) {
      writeQueued = false;
      void writeShared(desktop);
    }
  }
}

function writeNow() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  const desktop = bridge();
  if (desktop) void writeShared(desktop);
  else writeLocal();
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

/** Saves are immediate (a very short debounce only coalesces keystrokes). */
function persist() {
  if (typeof window === "undefined") return;
  bindFlushListeners();
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(writeNow, 120);
}

/** Force any batched write out immediately (used before export/close). */
export function flushPersist() {
  writeNow();
}

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
  return {
    error: storageError,
    usedKb: Math.round(usedBytes / 1024),
    budgetKb: Math.round(STORAGE_BUDGET_BYTES / 1024),
    percent: Math.min(100, Math.round((usedBytes / STORAGE_BUDGET_BYTES) * 100)),
    records: state.automations.length,
  };
}

/* ------------------------------------------------------------------ */
/* Hydration & synchronisation                                         */
/* ------------------------------------------------------------------ */

let syncTimer: ReturnType<typeof setInterval> | null = null;

/** Pull the authoritative shared document and merge it into local state. */
export async function syncNow(): Promise<WorkspaceConnection> {
  const desktop = bridge();
  if (!desktop) {
    writeLocal();
    setConnection({ status: "connected", lastSyncedAt: new Date().toISOString() });
    return connection;
  }
  setConnection({ status: "syncing" });
  try {
    const res = await desktop.invoke("workspace.read");
    if (!res?.ok) {
      setConnection({ status: "offline", error: res?.error ?? "Shared workspace unavailable." });
      return connection;
    }
    if (res.doc) {
      state = mergeDocuments(res.doc as AppData, state);
    }
    connection = {
      ...connection,
      shared: true,
      rev: res.rev ?? 0,
      status: "connected",
      error: null,
      path: res.path ?? SHARED_WORKSPACE_PATH,
      lastUpdatedAt: res.updatedAt ?? null,
      lastUpdatedBy: res.updatedBy ?? null,
      lastSyncedAt: new Date().toISOString(),
    };
    emit();
    return connection;
  } catch (error) {
    setConnection({ status: "offline", error: (error as Error).message });
    return connection;
  }
}

export async function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const desktop = bridge();
  if (desktop) {
    connection = { ...connection, shared: true };
    await syncNow();
    if (!syncTimer) syncTimer = setInterval(() => void syncNow(), 60000);
    emit();
    return;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.automations) state = withUserOptions(normalize(parsed));
    } else {
      persist();
    }
  } catch {
    /* ignore corrupt data */
  }
  setConnection({ shared: false, status: "connected", path: SHARED_WORKSPACE_PATH, lastSyncedAt: new Date().toISOString() });
  emit();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Raw document snapshot. Internal to the data layer — UI must use `@/data`. */
export function getState(): AppData {
  return state;
}

const ADMIN_LOG_LIMIT = 2000;

function setState(next: AppData) {
  const adminLog = next.adminLog && next.adminLog.length > ADMIN_LOG_LIMIT
    ? next.adminLog.slice(0, ADMIN_LOG_LIMIT)
    : next.adminLog;
  state = withUserOptions({ ...next, adminLog, settings: { ...next.settings, lastWriteAt: new Date().toISOString() } });
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
    rev: (record.rev ?? 0) + 1,
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

function tombstone(entity: Tombstone["entity"], id: string, user: string): Tombstone {
  return { id, entity, deletedAt: new Date().toISOString(), deletedBy: user };
}

export const actions = {
  setCurrentUser(name: string) {
    setState({ ...state, settings: { ...state.settings, currentUser: name } });
  },
  setSettings(patch: Partial<AppData["settings"]>) {
    setState({ ...state, settings: { ...state.settings, ...patch } });
  },
  setOptionList(key: string, values: string[]) {
    setState({ ...state, settings: { ...state.settings, options: { ...state.settings.options, [key]: values } } });
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
      rev: 1,
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
  /** Comments are collaboration only — they never affect completion metrics. */
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
          updates: [
            ...r.updates,
            { id: uid("u"), date: new Date().toISOString().slice(0, 10), submittedBy: user, readBy: [user], ...payload },
          ],
        },
        user,
        [histEntry(user, `Weekly update submitted (${payload.rag}, ${payload.percentComplete}%)`)],
      ),
    );
  },
  /** Per-user read state — one person reading does not clear it for the team. */
  markUpdateRead(automationId: string, updateId: string, user: string) {
    const record = state.automations.find((a) => a.id === automationId);
    if (!record) return;
    const target = record.updates.find((u) => u.id === updateId);
    if (!target || (target.readBy ?? []).includes(user)) return;
    setState({
      ...state,
      automations: state.automations.map((a) =>
        a.id !== automationId
          ? a
          : {
              ...a,
              updates: a.updates.map((u) => (u.id === updateId ? { ...u, readBy: [...(u.readBy ?? []), user] } : u)),
            },
      ),
    });
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
        { ...r, approvals: (r.approvals ?? []).map((ap) => (ap.id === approvalId ? { ...ap, ...patch } : ap)) },
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
    update(id, (r) => touch({ ...r, documents: r.documents.filter((d) => d.id !== docId) }, user, [histEntry(user, "Removed a document link")]));
  },
  deleteRecord(id: string, user = "System") {
    const record = state.automations.find((a) => a.id === id);
    setState({
      ...state,
      automations: state.automations.filter((a) => a.id !== id),
      // Tasks linked to the deleted record lose only the link, not their history.
      tasks: state.tasks.map((t) => (t.recordId === id ? { ...t, recordId: undefined, modifiedDate: new Date().toISOString() } : t)),
      tombstones: [...state.tombstones, tombstone("automation", id, user)],
      adminLog: [
        adminEntry(user, "Record deleted", String(record?.data['opportunityName'] ?? id)),
        ...state.adminLog,
      ],
    });
  },

  // ---------- Tasks ----------
  createTask(
    input: {
      title: string;
      description?: string;
      assignedTo: string;
      assignedBy: string;
      recordId?: string;
      recordLabel?: string;
      priority?: TaskRecord["priority"];
      dueDate?: string;
    },
  ): TaskRecord {
    const now = new Date().toISOString();
    const task: TaskRecord = {
      id: uid("task"),
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      assignedTo: input.assignedTo,
      assignedBy: input.assignedBy,
      ...(input.recordId ? { recordId: input.recordId } : {}),
      ...(input.recordLabel ? { recordLabel: input.recordLabel } : {}),
      priority: input.priority ?? "Medium",
      status: "Not Started",
      ...(input.dueDate ? { dueDate: input.dueDate } : {}),
      createdDate: now,
      modifiedDate: now,
    };
    setState({
      ...state,
      tasks: [task, ...state.tasks],
      adminLog: [adminEntry(input.assignedBy, "Task assigned", `${input.title} → ${input.assignedTo}`), ...state.adminLog],
    });
    return task;
  },
  updateTask(id: string, patch: Partial<TaskRecord>) {
    setState({
      ...state,
      tasks: state.tasks.map((t) =>
        t.id !== id
          ? t
          : {
              ...t,
              ...patch,
              ...(patch.status === "Completed" ? { completedDate: new Date().toISOString() } : {}),
              modifiedDate: new Date().toISOString(),
            },
      ),
    });
  },
  deleteTask(id: string, user = "System") {
    setState({
      ...state,
      tasks: state.tasks.filter((t) => t.id !== id),
      tombstones: [...state.tombstones, tombstone("task", id, user)],
    });
  },

  // ---------- Migration / import ----------
  importRecords(rows: Partial<Automation>[], user: string, source: string) {
    const now = new Date().toISOString();
    let seq = 0;
    const fy = new Date().getFullYear();
    const existingMax = Math.max(
      0,
      ...state.automations.map((a) => Number(/AUT-\d{4}-(\d+)/.exec(String(a.data['automationId'] ?? ""))?.[1] ?? 0)),
    );
    const created: Automation[] = rows.map((row) => {
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
        rev: 1,
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

  // ---------- Portability ----------
  exportJson() {
    return JSON.stringify(state, null, 2);
  },
  importJson(raw: string) {
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed?.automations) throw new Error("Invalid data file");
    setState(normalize(parsed));
  },
  /** Administrator-only destructive reset: clears operational data, keeps accounts, schema and reference data. */
  eraseAllData(user: string) {
    const now = new Date().toISOString();
    setState({
      ...state,
      automations: [],
      tasks: [],
      tombstones: [
        ...state.tombstones,
        ...state.automations.map((a) => tombstone("automation", a.id, user)),
        ...state.tasks.map((t) => tombstone("task", t.id, user)),
      ],
      adminLog: [
        { id: uid("log"), timestamp: now, user, action: "ERASE ALL DATA", detail: "Shared portfolio data erased" },
        ...state.adminLog,
      ],
    });
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
    setState({
      ...state,
      accounts: [...state.accounts, account],
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
  /**
   * Soft-deletes an account. Portfolio records, approvals, updates, tasks,
   * comments and audit history created by the person are always preserved.
   */
  deleteAccount(id: string, actor: string) {
    const account = state.accounts.find((a) => a.id === id);
    if (!account) return;
    const now = new Date().toISOString();
    setState({
      ...state,
      accounts: state.accounts.map((a) =>
        a.id === id ? { ...a, active: false, deleted: true, deletedAt: now, modifiedDate: now } : a,
      ),
      adminLog: [adminEntry(actor, "User deleted", `${account.displayName} (${account.username})`), ...state.adminLog],
    });
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
