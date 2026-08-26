/**
 * Domain models.
 *
 * These are the business entities of the portfolio tracker. They are storage
 * agnostic and UI agnostic: no React, no persistence concerns. Both the data
 * layer (`src/data`) and the presentation layer depend on this module.
 */
export type {
  AdminLogEntry,
  Approval,
  ApprovalStatus,
  AppData,
  Automation,
  BackupMeta,
  Category,
  CommentRecord,
  DocRecord,
  FieldValue,
  HistoryEntry,
  OptionLists,
  Role,
  Scoring,
  Settings,
  Stage,
  StorageMode,
  UserAccount,
  WeeklyUpdate,
} from "@/lib/types";

export { APPROVAL_TYPES } from "@/lib/types";
