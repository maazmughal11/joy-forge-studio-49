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
};

export type OptionLists = Record<string, string[]>;

export type Settings = {
  currentUser: string;
  users: string[];
  dataFolderPath: string;
  options: OptionLists;
};

export type AppData = {
  version: number;
  settings: Settings;
  automations: Automation[];
};
