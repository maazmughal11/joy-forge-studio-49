export type Stage = "idea" | "project" | "production" | "archived";
export type Category = "Discovery" | "Pipeline" | "Deployed";

export type HistoryEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
};

export type DocRecord = {
  id: string;
  name: string;
  type: string;
  link: string;
  status: "Draft" | "Under Review" | "Approved" | "Final";
  uploadedBy: string;
  uploadedDate: string;
};

export type CommentRecord = {
  id: string;
  timestamp: string;
  user: string;
  text: string;
};

export type WeeklyUpdate = {
  id: string;
  date: string;
  submittedBy: string;
  text: string;
  percentComplete: number;
  rag: "Red" | "Amber" | "Green";
  accomplishments?: string;
  nextSteps?: string;
  blockers?: string;
  decisions?: string;
  /** Display names of users who have already read this update. */
  readBy?: string[];
};

export type ApprovalStatus = "Draft" | "Pending" | "Approved" | "Rejected" | "Cancelled" | "Not Required";

export const APPROVAL_TYPES = [
  "Business Case Approval",
  "Business Sponsor Approval",
  "Process Owner Approval",
  "Technical Approval",
  "Security Approval",
  "Architecture Approval",
  "UAT Approval",
  "Deployment Approval",
  "Financial Approval",
  "Other",
] as const;

export const APPROVAL_STAGES = [
  "Idea Assessment",
  "Discovery",
  "Business Case",
  "Development",
  "Testing / UAT",
  "Deployment",
  "Production",
  "Other",
] as const;

export type Approval = {
  id: string;
  type: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedDate: string;
  approver: string;
  /** Lifecycle stage the approval belongs to. */
  stage?: string;
  description?: string;
  dueDate?: string;
  decisionDate?: string;
  decisionComments?: string;
  evidenceLink?: string;
  modifiedDate?: string;
};

/**
 * An approval tracked centrally that is not linked to a portfolio automation
 * (for example an approval for work that has not been submitted yet).
 */
export type UnlinkedApproval = Approval & { subject: string };

export type Scoring = {
  businessValue: number;
  complexity: number;
  risk: number;
  strategicPriority: number;
};

export type FieldValue = string | number | boolean | null;

export type Automation = {
  id: string;
  stage: Stage;
  category: Category;
  data: Record<string, FieldValue>;
  scoring: Scoring;
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
  /** Monotonic record revision, used for stale-write conflict detection. */
  rev?: number;
  history: HistoryEntry[];
  documents: DocRecord[];
  comments: CommentRecord[];
  updates: WeeklyUpdate[];
  approvals: Approval[];
};

export type OptionLists = Record<string, string[]>;

export type StorageMode = "local" | "shared";

export type TaskStatus = "Not Started" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export type TaskRecord = {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  recordId?: string;
  recordLabel?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  createdDate: string;
  completedDate?: string;
  modifiedDate: string;
};

/** Deletion marker so a delete on one workstation is not resurrected by a peer. */
export type Tombstone = {
  id: string;
  entity: "automation" | "task" | "approval";
  deletedAt: string;
  deletedBy: string;
};

export type AdminLogEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  detail?: string;
};

export type Role = "Administrator" | "Editor" | "Viewer";

export type UserAccount = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  pinHash: string;
  pinSalt: string;
  role: Role;
  permissions: string[];
  active: boolean;
  /** Soft-deleted accounts are preserved so historical references stay valid. */
  deleted?: boolean;
  deletedAt?: string;
  lastLogin?: string;
  createdDate: string;
  modifiedDate: string;
};

/**
 * Admin-configurable form layout. Only presentation is configurable —
 * internal field ids and stored data are never renamed or lost.
 */
export type FormFieldConfig = {
  id: string;
  label?: string;
  visible?: boolean;
  required?: boolean;
  section?: string;
  order?: number;
};

export type FormConfig = {
  /** Keyed by form: "idea" | "project" | "automation". */
  [form: string]: { fields: FormFieldConfig[]; sectionOrder?: string[] };
};

export type Settings = {
  currentUser: string;
  users: string[];
  dataFolderPath: string;
  options: OptionLists;
  storageMode: StorageMode;
  lastWriteAt?: string;
  workspaceLock?: { user: string; acquiredAt: string } | null;
  formConfig?: FormConfig;
};

export type AppData = {
  version: number;
  settings: Settings;
  automations: Automation[];
  /** Approvals tracked centrally without a linked automation. */
  standaloneApprovals: UnlinkedApproval[];
  tasks: TaskRecord[];
  tombstones: Tombstone[];
  adminLog: AdminLogEntry[];
  accounts: UserAccount[];
};
