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
};

export type ApprovalStatus = "Draft" | "Pending" | "Approved" | "Rejected" | "Cancelled" | "Not Required";

export const APPROVAL_TYPES = [
  "Business Case Approval",
  "Move to Project Approval",
  "UAT Approval",
  "Deployment Approval",
  "Benefits Validation",
  "Other",
] as const;

export type Approval = {
  id: string;
  type: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedDate: string;
  approver: string;
  dueDate?: string;
  decisionDate?: string;
  decisionComments?: string;
  evidenceLink?: string;
};

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
  history: HistoryEntry[];
  documents: DocRecord[];
  comments: CommentRecord[];
  updates: WeeklyUpdate[];
  approvals: Approval[];
};

export type OptionLists = Record<string, string[]>;

export type StorageMode = "local" | "shared";

export type BackupMeta = {
  id: string;
  createdAt: string;
  createdBy: string;
  records: number;
  sizeKb: number;
  reason: string;
  payload: string;
};

export type AdminLogEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  detail?: string;
};

export type Settings = {
  currentUser: string;
  users: string[];
  dataFolderPath: string;
  options: OptionLists;
  storageMode: StorageMode;
  autoBackup: boolean;
  backupFrequency: "Daily" | "Weekly";
  backupRetention: number;
  lastWriteAt?: string;
  workspaceLock?: { user: string; acquiredAt: string } | null;
};

export type AppData = {
  version: number;
  settings: Settings;
  automations: Automation[];
  backups: BackupMeta[];
  adminLog: AdminLogEntry[];
};
