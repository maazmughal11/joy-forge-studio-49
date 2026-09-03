/**
 * Data layer entry point.
 *
 * Everything the UI needs to read or write persistent data goes through this
 * module. Pages and components must never import `@/lib/store`, localStorage,
 * the network share or any backend client directly.
 *
 *   UI  →  @/data (repositories + reactive read model)  →  StorageProvider
 */

import { useSyncExternalStore } from "react";
import { localStorageProvider } from "./providers/local";
import type { StorageProvider } from "./repositories";
import type { AppData, Automation } from "@/domain/models";

export const provider: StorageProvider = localStorageProvider;

/** Repository handles — the only supported way to reach persistent data. */
export const repositories = {
  automations: provider.automations,
  weeklyUpdates: provider.weeklyUpdates,
  approvals: provider.approvals,
  comments: provider.comments,
  documents: provider.documents,
  audit: provider.audit,
  users: provider.users,
  tasks: provider.tasks,
  referenceData: provider.referenceData,
  workspace: provider.workspace,
};

/** Opens the store, connects to the shared workspace and starts syncing. */
export function initializeData() {
  return provider.initialize();
}

/* ------------------------------------------------------------------ */
/* Reactive read model                                                 */
/* ------------------------------------------------------------------ */

const readModel = localStorageProvider;

export function useAppData(): AppData {
  return useSyncExternalStore(readModel.subscribe, readModel.getSnapshot, readModel.getSnapshot);
}

export function useAutomation(id: string): Automation | undefined {
  return useAppData().automations.find((a) => a.id === id);
}

/** Live shared-database connection state (status, last sync, last update). */
export function useConnection(): WorkspaceConnection {
  return useSyncExternalStore(readModel.subscribe, getConnection, getConnection);
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
  markUpdateRead: r.weeklyUpdates.markRead,

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
  deleteAccount: r.users.deleteUser,
  recordLogin: r.users.recordLogin,

  // Tasks
  getTasks: r.tasks.getTasks,
  createTask: r.tasks.createTask,
  updateTask: r.tasks.updateTask,
  deleteTask: r.tasks.deleteTask,

  // Reference data & settings
  setOptionList: r.referenceData.setOptionList,
  setSettings: r.referenceData.updateSettings,
  setCurrentUser: (name: string) => r.referenceData.updateSettings({ currentUser: name }),

  // Shared workspace
  sync: () => r.workspace.sync(),
  exportJson: () => r.workspace.exportJson() as string,
  importJson: r.workspace.importJson,
  eraseAllData: r.workspace.eraseAllData,
};

/** Back-compat alias used by the app shell during bootstrap. */
export const hydrate = initializeData;

/** Storage diagnostics and connection state for the admin UI. */
export { getStorageHealth, flushPersist, getConnection, isReadOnly, retryConnection, OFFLINE_MESSAGE } from "@/lib/store";
export type { WorkspaceConnection, ConnectionStatus } from "@/lib/store";

import { getConnection, type WorkspaceConnection } from "@/lib/store";

export type { StorageProvider } from "./repositories";
