/**
 * Repository contracts for every persistent entity in the application.
 *
 * UI/business code MUST depend only on these interfaces — never on
 * localStorage, the filesystem, the network share, or any client library.
 *
 * Return types use `MaybePromise` so a synchronous read model and an
 * asynchronous shared-workspace writer can satisfy the same contract.
 */

import type {
  AdminLogEntry,
  Approval,
  Automation,
  CommentRecord,
  DocRecord,
  FieldValue,
  OptionLists,
  Role,
  Settings,
  Stage,
  TaskRecord,
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

export type NewTask = {
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  recordId?: string;
  recordLabel?: string;
  priority?: TaskRecord["priority"];
  dueDate?: string;
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
  deleteAutomation(id: string, actor: string): MaybePromise<void>;
  importAutomations(rows: Partial<Automation>[], actor: string, source: string): MaybePromise<number>;
  updateImportedAutomation(id: string, data: Record<string, FieldValue>, actor: string, source: string): MaybePromise<void>;
}

export interface WeeklyUpdateRepository {
  getWeeklyUpdates(automationId?: string): MaybePromise<(WeeklyUpdate & { automationId: string })[]>;
  createWeeklyUpdate(automationId: string, update: NewWeeklyUpdate, actor: string): MaybePromise<void>;
  /** Per-user read state, so one reader does not clear the flag for the team. */
  markRead(automationId: string, updateId: string, actor: string): MaybePromise<void>;
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
  /** Soft-delete: the person's historical records and audit trail are kept. */
  deleteUser(id: string, actor: string): MaybePromise<void>;
  recordLogin(id: string): MaybePromise<void>;
}

export interface TaskRepository {
  getTasks(assignedTo?: string): MaybePromise<TaskRecord[]>;
  createTask(input: NewTask): MaybePromise<TaskRecord>;
  updateTask(id: string, patch: Partial<TaskRecord>): MaybePromise<void>;
  deleteTask(id: string, actor: string): MaybePromise<void>;
}

export interface ReferenceDataRepository {
  getOptionLists(): MaybePromise<OptionLists>;
  setOptionList(key: string, values: string[]): MaybePromise<void>;
  getSettings(): MaybePromise<Settings>;
  updateSettings(patch: Partial<Settings>): MaybePromise<void>;
}

export interface WorkspaceRepository {
  /** Pull the authoritative shared document and merge remote changes in. */
  sync(): MaybePromise<unknown>;
  exportJson(): MaybePromise<string>;
  importJson(raw: string): MaybePromise<void>;
  /** Administrator-only destructive reset of operational data. */
  eraseAllData(actor: string): MaybePromise<void>;
}

/**
 * A storage provider bundles one implementation of every repository plus the
 * lifecycle hooks the application needs (hydration and a reactive read model).
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
  tasks: TaskRepository;
  referenceData: ReferenceDataRepository;
  workspace: WorkspaceRepository;

  /** Open/prepare the underlying store and run pending migrations. */
  initialize(): MaybePromise<void>;
}
