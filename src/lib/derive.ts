import type { Approval, Automation } from "./types";
import { completeness, EXPECTED_DOCS, GOVERNANCE_FIELDS, isFilled } from "./fields";

export const nameOf = (a: Automation) => String(a.data['opportunityName'] ?? "Untitled opportunity");
export const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);
export const str = (a: Automation, key: string) => String(a.data[key] ?? "");
export const autoId = (a: Automation) => String(a.data['automationId'] ?? a.id.toUpperCase());
export const legacyCode = (a: Automation) => String(a.data['legacyAutomationCode'] ?? "");
export const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export const daysSince = (iso?: string) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 9999;

export const lastUpdate = (a: Automation) => a.updates[a.updates.length - 1];

export const missingWeeklyUpdate = (a: Automation) =>
  (a.stage === "project" || a.stage === "production") && daysSince(lastUpdate(a)?.date) > 7;

export const awaitingAssessment = (a: Automation) =>
  a.stage === "idea" && ["Ideation", "Initial Assessment"].includes(String(a.data['opportunityStatus'] ?? ""));

export const awaitingApproval = (a: Automation) =>
  a.stage === "idea" && String(a.data['opportunityStatus']) === "Deep Dive" && a.data['sponsorApproval'] !== "Yes";

export const readyToMove = (a: Automation) =>
  a.stage === "idea" &&
  String(a.data['opportunityStatus']) === "Business Case Approved" &&
  a.data['sponsorApproval'] === "Yes";

export const onHold = (a: Automation) =>
  String(a.data['opportunityStatus']) === "On Hold" || String(a.data['projectStatus']) === "On Hold";

export const approachingProduction = (a: Automation) =>
  a.stage === "project" && ["UAT", "Hypercare"].includes(String(a.data['projectStatus'] ?? ""));

export function moveBlockers(a: Automation) {
  const blockers: string[] = [];
  if (a.data['sponsorApproval'] !== "Yes") blockers.push("Business Case Approval by Business Sponsor");
  if (!a.data['pasNumber'] && !a.data['buCharged']) blockers.push("PAS # or BU to be Charged");
  if (String(a.data['opportunityStatus']) !== "Business Case Approved") blockers.push("Opportunity Status = Business Case Approved");
  return blockers;
}

export function attentionItems(records: Automation[], user: string) {
  return records
    .filter((a) => a.stage !== "archived")
    .map((a) => {
      const ownerName = a.data['businessAnalyst'] === user
        ? a.data['businessAnalyst']
        : a.data['submittedBy'];
      const mine = [a.data['businessAnalyst'], a.data['submittedBy']].includes(user);
      const reasons: string[] = [];
      if (awaitingApproval(a)) reasons.push("Awaiting sponsor approval");
      if (missingWeeklyUpdate(a)) reasons.push("Weekly update overdue");
      if (readyToMove(a)) reasons.push("Ready to move to Project Tracking");
      if (onHold(a)) reasons.push("On hold");
      if (completeness(a).percent < 60) reasons.push("Record incomplete");
      return { record: a, reasons, ownerName, mine };
    })
    .filter((x) => x.reasons.length > 0)
    .sort((x, y) => Number(y.mine) - Number(x.mine) || y.reasons.length - x.reasons.length);
}

// ---------- Lifecycle / stage helpers ----------

export const stageLabel = (a: Automation) =>
  str(a, "projectStatus") || str(a, "opportunityStatus") || "Ideation";

export const lifecycleCategory = (a: Automation) =>
  a.stage === "archived" ? "Archived" : a.category;

export function daysInCurrentStage(a: Automation) {
  const marker = [...a.history]
    .reverse()
    .find((h) => ["Opportunity Status", "Project Status", "stage"].includes(String(h.field ?? "")));
  return daysSince(marker?.timestamp ?? a.createdDate);
}

export const cancelled = (a: Automation) =>
  str(a, "opportunityStatus") === "Cancelled" || str(a, "projectStatus") === "Cancelled";

export const activeProject = (a: Automation) => a.stage === "project" && !onHold(a) && !cancelled(a);

// ---------- Weekly updates ----------

export const ragOf = (a: Automation) => lastUpdate(a)?.rag ?? "";
export const percentCompleteOf = (a: Automation) => lastUpdate(a)?.percentComplete ?? 0;
export const daysSinceUpdate = (a: Automation) => daysSince(lastUpdate(a)?.date);

export const updateCompliance = (a: Automation) => (missingWeeklyUpdate(a) ? "Missing Update" : "Current");

export function weeklyUpdateRows(records: Automation[]) {
  return records
    .filter((a) => a.stage === "project" || a.stage === "production")
    .map((a) => ({ record: a, update: lastUpdate(a), missing: missingWeeklyUpdate(a) }));
}

// ---------- Approvals ----------

export type ApprovalRow = { record: Automation; approval: Approval; daysWaiting: number };

export function approvalRows(records: Automation[]): ApprovalRow[] {
  return records.flatMap((r) =>
    (r.approvals ?? []).map((ap) => ({
      record: r,
      approval: ap,
      daysWaiting: ap.status === "Pending" ? daysSince(ap.requestedDate) : 0,
    })),
  );
}

export const approvalTone = (days: number) => (days > 7 ? "overdue" : days >= 4 ? "attention" : "normal");

// ---------- Production forecast ----------

export function daysUntilProduction(a: Automation) {
  const d = str(a, "productionDate");
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000);
}

export function forecastBucket(a: Automation) {
  const d = daysUntilProduction(a);
  if (d === null) return "Production Date Missing";
  if (d <= 30) return "Next 30 Days";
  if (d <= 60) return "31-60 Days";
  if (d <= 90) return "61-90 Days";
  return "Beyond 90 Days";
}

// ---------- Governance ----------

export function governanceGaps(a: Automation) {
  return GOVERNANCE_FIELDS.filter((k) => !isFilled(a.data[k]));
}

export function documentCoverage(a: Automation) {
  const expected = EXPECTED_DOCS[a.stage] ?? [];
  const have = new Set(a.documents.map((d) => d.type));
  const missing = expected.filter((t) => !have.has(t));
  return {
    expected,
    missing,
    percent: expected.length ? Math.round(((expected.length - missing.length) / expected.length) * 100) : 100,
  };
}
