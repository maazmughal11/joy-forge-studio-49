/**
 * Local storage provider.
 *
 * This is ONE implementation of the repository contracts, backed by the
 * browser localStorage document that the application has always used. All of
 * its persistence details live in `src/lib/store.ts` (the store engine) and
 * are never touched by UI code.
 */

import { actions as engine, getState, hydrate, subscribe } from "@/lib/store";
import type {
  ApprovalRepository,
  AuditRepository,
  AutomationQuery,
  AutomationRepository,
  BackupRepository,
  CommentRepository,
  DocumentRepository,
  ReferenceDataRepository,
  StorageProvider,
  UserRepository,
  WeeklyUpdateRepository,
} from "@/data/repositories";
import type { Automation, Stage } from "@/domain/models";
import { CURRENT_SCHEMA_VERSION } from "@/data/config";

const all = () => getState().automations;
const find = (id: string) => all().find((a) => a.id === id);

function matches(a: Automation, q: AutomationQuery): boolean {
  if (q.stage) {
    const stages = (Array.isArray(q.stage) ? q.stage : [q.stage]) as Stage[];
    if (!stages.includes(a.stage)) return false;
  }
  if (q.assignedTo) {
    const people = [a.data['businessAnalyst'], a.data['businessOwner'], a.data['submittedBy']].map(String);
    if (!people.includes(q.assignedTo)) return false;
  }
  if (q.search) {
    const needle = q.search.toLowerCase();
    const hay = Object.values(a.data).map((v) => String(v ?? "")).join(" ").toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

const automations: AutomationRepository = {
  getAutomations: (query) => (query ? all().filter((a) => matches(a, query)) : all()),
  getAutomation: (id) => find(id),
  createAutomation: (stage, actor) => engine.createRecord(stage, actor),
  updateAutomation: (id, key, value, actor) => engine.setField(id, key, value, actor),
  updateScoring: (id, key, value, actor) => engine.setScoring(id, key, value, actor),
  setStage: (id, stage, actor) => engine.setStage(id, stage, actor),
  moveToProject: (id, actor) => engine.moveToProject(id, actor),
  deleteAutomation: (id) => engine.deleteRecord(id),
  importAutomations: (rows, actor, source) => engine.importRecords(rows, actor, source),
  updateImportedAutomation: (id, data, actor, source) => engine.updateImportedRecord(id, data, actor, source),
};

const weeklyUpdates: WeeklyUpdateRepository = {
  getWeeklyUpdates: (automationId) =>
    all()
      .filter((a) => !automationId || a.id === automationId)
      .flatMap((a) => a.updates.map((u) => ({ ...u, automationId: a.id }))),
  createWeeklyUpdate: (automationId, update, actor) => engine.addUpdate(automationId, update, actor),
};

const approvals: ApprovalRepository = {
  getApprovals: (automationId) =>
    all()
      .filter((a) => !automationId || a.id === automationId)
      .flatMap((a) => (a.approvals ?? []).map((ap) => ({ ...ap, automationId: a.id }))),
  createApproval: (automationId, approval, actor) => engine.addApproval(automationId, approval, actor),
  updateApproval: (automationId, approvalId, patch, actor) =>
    engine.updateApproval(automationId, approvalId, patch, actor),
};

const comments: CommentRepository = {
  getComments: (automationId) => find(automationId)?.comments ?? [],
  addComment: (automationId, text, actor) => engine.addComment(automationId, text, actor),
};

const documents: DocumentRepository = {
  getDocuments: (automationId) => find(automationId)?.documents ?? [],
  addDocument: (automationId, doc, actor) => engine.addDocument(automationId, doc, actor),
  removeDocument: (automationId, documentId, actor) => engine.removeDocument(automationId, documentId, actor),
};

const audit: AuditRepository = {
  getHistory: (automationId) => find(automationId)?.history ?? [],
  getAdminLog: () => getState().adminLog,
  logAudit: (actor, action, detail) => engine.logAudit(actor, action, detail),
};

const users: UserRepository = {
  getUsers: () => getState().accounts,
  getUserByUsername: (username) =>
    getState().accounts.find((a) => a.username.toLowerCase() === username.toLowerCase()),
  createUser: (input, actor) => engine.createAccount(input, actor),
  updateUser: (id, patch, actor, auditAction, detail) => engine.updateAccount(id, patch, actor, auditAction, detail),
  recordLogin: (id) => engine.recordLogin(id),
};

const referenceData: ReferenceDataRepository = {
  getOptionLists: () => getState().settings.options,
  setOptionList: (key, values) => engine.setOptionList(key, values),
  getSettings: () => getState().settings,
  updateSettings: (patch) => engine.setSettings(patch),
};

const backups: BackupRepository = {
  getBackups: () => getState().backups,
  createBackup: (actor, reason) => engine.createBackup(actor, reason),
  restoreBackup: (id, actor) => engine.restoreBackup(id, actor),
  deleteBackup: (id) => engine.deleteBackup(id),
  exportJson: () => engine.exportJson(),
  importJson: (raw) => engine.importJson(raw),
  resetToSeed: () => engine.resetToSeed(),
};

export const localStorageProvider: StorageProvider & {
  subscribe: typeof subscribe;
  getSnapshot: typeof getState;
} = {
  id: "local",
  label: "Local workspace (browser storage)",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  automations,
  weeklyUpdates,
  approvals,
  comments,
  documents,
  audit,
  users,
  referenceData,
  backups,
  initialize: () => hydrate(),
  subscribe,
  getSnapshot: getState,
};
