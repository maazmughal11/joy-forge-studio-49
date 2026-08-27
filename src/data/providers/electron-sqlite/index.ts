/**
 * Electron SQLite provider (scaffold — not enabled yet).
 *
 * Secure desktop architecture:
 *   React renderer → preload/contextBridge (`window.rpaDesktop`)
 *                  → IPC → Electron main process → better-sqlite3 / filesystem
 *
 * The renderer never receives Node.js, `fs`, or raw SQL execution privileges:
 * it can only invoke the narrow, allow-listed channels exposed by the preload
 * bridge. Schema creation and upgrades are handled in the main process using
 * `src/data/schema/migrations.ts`.
 */

import type { StorageProvider } from "@/data/repositories";
import { LATEST_DB_VERSION } from "@/data/schema/migrations";

export type DesktopBridge = {
  /** Allow-listed data channel: `entity.method` with a serializable payload. */
  invoke: (channel: string, payload?: unknown) => Promise<unknown>;
  version: string;
};

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { rpaDesktop?: DesktopBridge }).rpaDesktop) ?? null;
}

const notReady = (): never => {
  throw new Error(
    "Electron SQLite provider is not available in this runtime. Launch the desktop build or set VITE_STORAGE_PROVIDER=local.",
  );
};

/** Helper that turns a repository call into a typed IPC round-trip. */
function channel<T>(name: string) {
  return async (payload?: unknown): Promise<T> => {
    const bridge = getDesktopBridge();
    if (!bridge) return notReady();
    return (await bridge.invoke(name, payload)) as T;
  };
}

export const electronSqliteProvider: StorageProvider = {
  id: "electron-sqlite",
  label: "Electron desktop (SQLite)",
  schemaVersion: LATEST_DB_VERSION,
  automations: {
    getAutomations: (query) => channel<never>("automations.list")(query),
    getAutomation: (id) => channel<never>("automations.get")({ id }),
    createAutomation: (stage, actor) => channel<never>("automations.create")({ stage, actor }),
    updateAutomation: (id, key, value, actor) => channel<never>("automations.update")({ id, key, value, actor }),
    updateScoring: (id, key, value, actor) => channel<never>("automations.updateScoring")({ id, key, value, actor }),
    setStage: (id, stage, actor) => channel<never>("automations.setStage")({ id, stage, actor }),
    moveToProject: (id, actor) => channel<never>("automations.moveToProject")({ id, actor }),
    deleteAutomation: (id) => channel<never>("automations.delete")({ id }),
    importAutomations: (rows, actor, source) => channel<never>("automations.import")({ rows, actor, source }),
    updateImportedAutomation: (id, data, actor, source) =>
      channel<never>("automations.updateImported")({ id, data, actor, source }),
  },
  weeklyUpdates: {
    getWeeklyUpdates: (automationId) => channel<never>("weeklyUpdates.list")({ automationId }),
    createWeeklyUpdate: (automationId, update, actor) =>
      channel<never>("weeklyUpdates.create")({ automationId, update, actor }),
  },
  approvals: {
    getApprovals: (automationId) => channel<never>("approvals.list")({ automationId }),
    createApproval: (automationId, approval, actor) => channel<never>("approvals.create")({ automationId, approval, actor }),
    updateApproval: (automationId, approvalId, patch, actor) =>
      channel<never>("approvals.update")({ automationId, approvalId, patch, actor }),
  },
  comments: {
    getComments: (automationId) => channel<never>("comments.list")({ automationId }),
    addComment: (automationId, text, actor) => channel<never>("comments.add")({ automationId, text, actor }),
  },
  documents: {
    getDocuments: (automationId) => channel<never>("documents.list")({ automationId }),
    addDocument: (automationId, doc, actor) => channel<never>("documents.add")({ automationId, doc, actor }),
    removeDocument: (automationId, documentId, actor) =>
      channel<never>("documents.remove")({ automationId, documentId, actor }),
  },
  audit: {
    getHistory: (automationId) => channel<never>("audit.history")({ automationId }),
    getAdminLog: () => channel<never>("audit.adminLog")(),
    logAudit: (actor, action, detail) => channel<never>("audit.log")({ actor, action, detail }),
  },
  users: {
    getUsers: () => channel<never>("users.list")(),
    getUserByUsername: (username) => channel<never>("users.getByUsername")({ username }),
    createUser: (input, actor) => channel<never>("users.create")({ input, actor }),
    updateUser: (id, patch, actor, auditAction, detail) =>
      channel<never>("users.update")({ id, patch, actor, auditAction, detail }),
    recordLogin: (id) => channel<never>("users.recordLogin")({ id }),
  },
  messages: {
    getMessages: () => channel<never>("messages.list")(),
    sendMessage: (input) => channel<never>("messages.send")(input),
    markMessageRead: (id, read) => channel<never>("messages.markRead")({ id, read }),
    resolveMessage: (id, resolved) => channel<never>("messages.resolve")({ id, resolved }),
    deleteMessage: (id) => channel<never>("messages.delete")({ id }),
  },
  referenceData: {
    getOptionLists: () => channel<never>("reference.options")(),
    setOptionList: (key, values) => channel<never>("reference.setOption")({ key, values }),
    getSettings: () => channel<never>("reference.settings")(),
    updateSettings: (patch) => channel<never>("reference.updateSettings")({ patch }),
  },
  backups: {
    getBackups: () => channel<never>("backups.list")(),
    createBackup: (actor, reason) => channel<never>("backups.create")({ actor, reason }),
    restoreBackup: (backupId, actor) => channel<never>("backups.restore")({ backupId, actor }),
    deleteBackup: (backupId) => channel<never>("backups.delete")({ backupId }),
    exportJson: () => channel<never>("backups.exportJson")(),
    importJson: (raw) => channel<never>("backups.importJson")({ raw }),
    resetToSeed: () => channel<never>("backups.resetToSeed")(),
  },
  initialize: () => channel<void>("app.initialize")(),
};
