/**
 * Repository contracts for every persistent entity in the application.
 *
 * UI/business code MUST depend only on these interfaces — never on
 * localStorage, IndexedDB, SQLite, the filesystem, or any network client.
 *
 * Return types use `MaybePromise` so that a synchronous provider (the current
 * local provider) and asynchronous providers (Electron SQLite over IPC, REST /
 * SQL Server, SharePoint Lists, PostgreSQL) can both satisfy the same contract.
 */

import type {
  AdminLogEntry,
  Approval,
  Automation,
  BackupMeta,
  CommentRecord,
  DocRecord,
  FieldValue,
  OptionLists,
  Role,
  Settings,
  Stage,
  UserAccount,
  WeeklyUpdate,
} from "@/domain/models";

export type MaybePromise<T> = T | Promise<T>;

export type AutomationQuery = {
  stage?: Stage | Stage[];
  assignedTo?: string;
  search?: string;
};

export type NewWeeklyUpdate = {
  text: string;
  percentComplete: number;
  rag: WeeklyUpdate["rag"];
  accomplishments?: string;
  nextSteps?: string;
  blockers?: string;
  decisions?: string;
};

export type NewUserAccount = {
  firstName: string;
  lastName: string;
  username: string;
  pinHash: string;
  pinSalt: string;
  role: Role;
  permissions?: string[];
};

/* ------------------------------------------------------------------ */

export interface AutomationRepository {
  getAutomations(query?: AutomationQuery): MaybePromise<Automation[]>;
  getAutomation(id: string): MaybePromise<Automation | undefined>;
  createAutomation(stage: Stage, actor: string): MaybePromise<Automation>;
  updateAutomation(id: string, key: string, value: FieldValue, actor: string): MaybePromise<void>;
  updateScoring(id: string, key: keyof Automation["scoring"], value: number, actor: string): MaybePromise<void>;
  setStage(id: string, stage: Stage, actor: string): MaybePromise<void>;
  moveToProject(id: string, actor: string): MaybePromise<void>;
  deleteAutomation(id: string): MaybePromise<void>;
  importAutomations(rows: Partial<Automation>[], actor: string, source: string): MaybePromise<number>;
  updateImportedAutomation(id: string, data: Record<string, FieldValue>, actor: string, source: string): MaybePromise<void>;
}

export interface WeeklyUpdateRepository {
  getWeeklyUpdates(automationId?: string): MaybePromise<(WeeklyUpdate & { automationId: string })[]>;
  createWeeklyUpdate(automationId: string, update: NewWeeklyUpdate, actor: string): MaybePromise<void>;
}

export interface ApprovalRepository {
  getApprovals(automationId?: string): MaybePromise<(Approval & { automationId: string })[]>;
  createApproval(automationId: string, approval: Omit<Approval, "id">, actor: string): MaybePromise<void>;
  updateApproval(automationId: string, approvalId: string, patch: Partial<Approval>, actor: string): MaybePromise<void>;
}

export interface CommentRepository {
  getComments(automationId: string): MaybePromise<CommentRecord[]>;
  addComment(automationId: string, text: string, actor: string): MaybePromise<void>;
}

export interface DocumentRepository {
  getDocuments(automationId: string): MaybePromise<DocRecord[]>;
  addDocument(
    automationId: string,
    doc: Omit<DocRecord, "id" | "uploadedBy" | "uploadedDate">,
    actor: string,
  ): MaybePromise<void>;
  removeDocument(automationId: string, documentId: string, actor: string): MaybePromise<void>;
}

export interface AuditRepository {
  /** Per-record change history. */
  getHistory(automationId: string): MaybePromise<Automation["history"]>;
  /** Application-wide administrative log. */
  getAdminLog(): MaybePromise<AdminLogEntry[]>;
  logAudit(actor: string, action: string, detail?: string): MaybePromise<void>;
}

export interface UserRepository {
  getUsers(): MaybePromise<UserAccount[]>;
  getUserByUsername(username: string): MaybePromise<UserAccount | undefined>;
  createUser(input: NewUserAccount, actor: string): MaybePromise<UserAccount>;
  updateUser(
    id: string,
    patch: Partial<UserAccount>,
    actor: string,
    auditAction?: string,
    detail?: string,
  ): MaybePromise<void>;
  recordLogin(id: string): MaybePromise<void>;
}

export interface ReferenceDataRepository {
  getOptionLists(): MaybePromise<OptionLists>;
  setOptionList(key: string, values: string[]): MaybePromise<void>;
  getSettings(): MaybePromise<Settings>;
  updateSettings(patch: Partial<Settings>): MaybePromise<void>;
}

export interface BackupRepository {
  getBackups(): MaybePromise<BackupMeta[]>;
  createBackup(actor: string, reason?: string): MaybePromise<BackupMeta>;
  restoreBackup(backupId: string, actor: string): MaybePromise<void>;
  deleteBackup(backupId: string): MaybePromise<void>;
  exportJson(): MaybePromise<string>;
  importJson(raw: string): MaybePromise<void>;
  resetToSeed(): MaybePromise<void>;
}

/**
 * A storage provider bundles one implementation of every repository plus the
 * lifecycle hooks the application needs (hydration, schema migrations and a
 * reactive read model).
 */
export interface StorageProvider {
  readonly id: string;
  readonly label: string;
  /** Schema/data version this provider currently serves. */
  readonly schemaVersion: number;

  automations: AutomationRepository;
  weeklyUpdates: WeeklyUpdateRepository;
  approvals: ApprovalRepository;
  comments: CommentRepository;
  documents: DocumentRepository;
  audit: AuditRepository;
  users: UserRepository;
  referenceData: ReferenceDataRepository;
  backups: BackupRepository;

  /** Open/prepare the underlying store and run pending migrations. */
  initialize(): MaybePromise<void>;
}
