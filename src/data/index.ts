/**
 * Data layer entry point.
 *
 * Everything the UI needs to read or write persistent data goes through this
 * module. Pages and components must never import `@/lib/store`, localStorage,
 * IndexedDB, SQLite or any backend client directly.
 *
 *   UI  →  @/data (repositories + reactive read model)  →  StorageProvider
 *
 * The active provider is selected in `@/data/config`.
 */

import { useSyncExternalStore } from "react";
import { localStorageProvider } from "./providers/local";
import { storageConfig } from "./config";
import type { StorageProvider } from "./repositories";
import type { AppData, Automation } from "@/domain/models";

/**
 * Resolve the active provider. Only the local provider is wired today; other
 * providers are loaded lazily by the desktop/enterprise builds so that no
 * backend client is bundled into the browser app.
 */
function resolveProvider(): StorageProvider {
  switch (storageConfig.provider) {
    case "local":
    default:
      return localStorageProvider;
  }
}

export const provider = resolveProvider();

/** Repository handles — the only supported way to reach persistent data. */
export const repositories = {
  automations: provider.automations,
  weeklyUpdates: provider.weeklyUpdates,
  approvals: provider.approvals,
  comments: provider.comments,
  documents: provider.documents,
  audit: provider.audit,
  users: provider.users,
  messages: provider.messages,
  referenceData: provider.referenceData,
  backups: provider.backups,
};

/** Opens the store and applies pending migrations. Safe to call repeatedly. */
export function initializeData() {
  return provider.initialize();
}

/* ------------------------------------------------------------------ */
/* Reactive read model                                                 */
/* ------------------------------------------------------------------ */

/**
 * Providers expose a snapshot of the workspace document plus a change
 * subscription so React can render synchronously. Asynchronous providers
 * (SQLite/REST) implement this by keeping a local cache warm.
 */
const readModel = localStorageProvider;

export function useAppData(): AppData {
  return useSyncExternalStore(readModel.subscribe, readModel.getSnapshot, readModel.getSnapshot);
}

export function useAutomation(id: string): Automation | undefined {
  return useAppData().automations.find((a) => a.id === id);
}

/* ------------------------------------------------------------------ */
/* Application service facade                                          */
/* ------------------------------------------------------------------ */

const r = repositories;

/**
 * Use-case level API consumed by the UI. Each method delegates to a
 * repository; no storage details leak past this boundary.
 */
export const actions = {
  // Automations
  getAutomations: r.automations.getAutomations,
  getAutomation: r.automations.getAutomation,
  createRecord: (stage: Parameters<typeof r.automations.createAutomation>[0], user: string) =>
    r.automations.createAutomation(stage, user) as Automation,
  setField: r.automations.updateAutomation,
  setScoring: r.automations.updateScoring,
  setStage: r.automations.setStage,
  moveToProject: r.automations.moveToProject,
  deleteRecord: r.automations.deleteAutomation,
  importRecords: (...args: Parameters<typeof r.automations.importAutomations>) =>
    r.automations.importAutomations(...args) as number,
  updateImportedRecord: r.automations.updateImportedAutomation,

  // Weekly updates
  getWeeklyUpdates: r.weeklyUpdates.getWeeklyUpdates,
  addUpdate: r.weeklyUpdates.createWeeklyUpdate,

  // Approvals
  getApprovals: r.approvals.getApprovals,
  addApproval: r.approvals.createApproval,
  updateApproval: r.approvals.updateApproval,

  // Comments & documents
  addComment: r.comments.addComment,
  addDocument: r.documents.addDocument,
  removeDocument: r.documents.removeDocument,

  // Audit
  logAudit: r.audit.logAudit,

  // Users
  getUsers: r.users.getUsers,
  createAccount: (...args: Parameters<typeof r.users.createUser>) => r.users.createUser(...args),
  updateAccount: r.users.updateUser,
  recordLogin: r.users.recordLogin,

  // Direct messages
  getMessages: r.messages.getMessages,
  sendMessage: r.messages.sendMessage,
  markMessageRead: r.messages.markMessageRead,
  resolveMessage: r.messages.resolveMessage,
  deleteMessage: r.messages.deleteMessage,

  // Reference data & settings
  setOptionList: r.referenceData.setOptionList,
  setSettings: r.referenceData.updateSettings,
  setCurrentUser: (name: string) => r.referenceData.updateSettings({ currentUser: name }),
  setDataFolderPath: (path: string) => r.referenceData.updateSettings({ dataFolderPath: path }),
  setStorageMode: (mode: AppData["settings"]["storageMode"], user: string) => {
    r.referenceData.updateSettings({
      storageMode: mode,
      workspaceLock: mode === "shared" ? { user, acquiredAt: new Date().toISOString() } : null,
    });
    r.audit.logAudit(user, `Storage mode set to ${mode === "shared" ? "Shared Workspace" : "Local Workspace"}`);
  },

  // Backup / restore / portability
  createBackup: (...args: Parameters<typeof r.backups.createBackup>) => r.backups.createBackup(...args),
  restoreBackup: r.backups.restoreBackup,
  deleteBackup: r.backups.deleteBackup,
  exportJson: () => r.backups.exportJson() as string,
  importJson: r.backups.importJson,
  resetToSeed: r.backups.resetToSeed,
};

/** Back-compat alias used by the app shell during bootstrap. */
export const hydrate = initializeData;

/** Storage diagnostics (capacity, pending write failures) for the admin UI. */
export { getStorageHealth, flushPersist } from "@/lib/store";

export type { StorageProvider } from "./repositories";

