import type { Automation } from "./types";
import { completeness } from "./fields";

export const nameOf = (a: Automation) => String(a.data['opportunityName'] ?? "Untitled opportunity");
export const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);

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
      const mine = [a.data['businessAnalyst'], a.data['submittedBy']].includes(user);
      const reasons: string[] = [];
      if (awaitingApproval(a)) reasons.push("Awaiting sponsor approval");
      if (missingWeeklyUpdate(a)) reasons.push("Weekly update overdue");
      if (readyToMove(a)) reasons.push("Ready to move to Project Tracking");
      if (onHold(a)) reasons.push("On hold");
      if (completeness(a).percent < 60) reasons.push("Record incomplete");
      return { record: a, reasons, mine };
    })
    .filter((x) => x.reasons.length > 0)
    .sort((x, y) => Number(y.mine) - Number(x.mine) || y.reasons.length - x.reasons.length);
}
