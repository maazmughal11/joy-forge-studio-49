import type { Automation, FieldValue } from "./types";

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "yesno" | "url";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  section: string;
  optionKey?: string;
  options?: string[];
  stages?: ("idea" | "project")[];
  auto?: boolean;
  /** Optional business fields are excluded from the completeness calculation. */
  optional?: boolean;
};

export const SECTIONS = [
  "Submission Info",
  "Process Assessment",
  "Business Value",
  "Business Case / Assignment",
  "Project Execution",
  "Portfolio Info",
] as const;

export const FIELDS: FieldDef[] = [
  // Submission Info
  { key: "submittedBy", label: "Submitted By", type: "select", optionKey: "users", section: "Submission Info" },
  { key: "submissionDate", label: "Date", type: "date", section: "Submission Info" },
  { key: "opportunityName", label: "Opportunity Name", type: "text", section: "Submission Info" },
  { key: "division", label: "WRK Division", type: "select", optionKey: "divisions", section: "Submission Info" },
  { key: "region", label: "Region", type: "select", optionKey: "regions", section: "Submission Info" },
  { key: "functionalArea", label: "Functional Area", type: "select", optionKey: "functionalAreas", section: "Submission Info" },
  { key: "opportunityDescription", label: "Opportunity Description", type: "textarea", section: "Submission Info" },
  { key: "businessImpact", label: "What are the impacts to the business? / Benefits?", type: "textarea", section: "Submission Info" },
  { key: "rpaCandidateReason", label: "Why is this a good candidate for RPA?", type: "select", optionKey: "rpaReasons", section: "Submission Info" },
  { key: "processSme", label: "Process SME Name", type: "text", section: "Submission Info" },
  { key: "businessOwner", label: "Process / Business Owner Name", type: "text", section: "Submission Info" },

  // Process Assessment
  { key: "currentState", label: "Current State of Process", type: "textarea", section: "Process Assessment" },
  { key: "sopAvailable", label: "Is there an SOP available (incl. process flow)?", type: "yesno", section: "Process Assessment" },
  { key: "whoPerforms", label: "Who performs this process?", type: "text", section: "Process Assessment" },
  { key: "handoffs", label: "Does the process include hand-offs between teams?", type: "yesno", section: "Process Assessment" },
  { key: "slaInPlace", label: "Is there an SLA in place?", type: "yesno", section: "Process Assessment" },
  { key: "primaryApplication", label: "Primary application used", type: "text", section: "Process Assessment" },
  { key: "appRole", label: "Role / user type required in the application", type: "text", section: "Process Assessment" },
  { key: "otherApplications", label: "What other applications are used?", type: "text", section: "Process Assessment" },
  { key: "processTrigger", label: "Process Trigger", type: "text", section: "Process Assessment" },
  { key: "frequency", label: "How often is the process performed?", type: "text", section: "Process Assessment" },
  { key: "monthlyVolume", label: "Transaction volume per month", type: "number", section: "Process Assessment" },
  { key: "startFinishWindow", label: "When should the process start and finish?", type: "text", section: "Process Assessment" },
  { key: "volumeConsistency", label: "How consistent is the transaction volume?", type: "text", section: "Process Assessment" },
  { key: "transactionDuration", label: "How long does one transaction take?", type: "text", section: "Process Assessment" },
  { key: "knownRisks", label: "Known risks", type: "textarea", section: "Process Assessment" },
  { key: "knownExceptions", label: "Known business / process exceptions", type: "textarea", section: "Process Assessment" },
  { key: "percentAutomatable", label: "What % of the process can be automated", type: "number", section: "Process Assessment" },

  // Business Value
  { key: "netBenefits12", label: "Net benefits in 12 months ($)", type: "number", section: "Business Value" },
  { key: "netBenefits24", label: "Net benefits in 24 months ($)", type: "number", section: "Business Value" },
  { key: "automationCost", label: "Automation Cost ($)", type: "number", section: "Business Value" },
  { key: "hoursSaved", label: "Hours Saved", type: "number", section: "Business Value" },
  { key: "grossBenefits1yr", label: "Gross Benefits 1YR ($)", type: "number", section: "Business Value" },
  { key: "fteEquivalent", label: "FTE equivalent currently on process", type: "number", section: "Business Value" },
  { key: "hourlyRate", label: "Hourly Rate ($/hr)", type: "number", section: "Business Value" },

  // Business Case / Assignment
  { key: "businessAnalyst", label: "Business Analyst", type: "select", optionKey: "users", section: "Business Case / Assignment" },
  { key: "businessCaseLink", label: "Business Case SharePoint Link", type: "url", section: "Business Case / Assignment" },
  { key: "validationCheck", label: "Validation Check", type: "yesno", section: "Business Case / Assignment" },
  { key: "sponsorApproval", label: "Business Case Approval by Business Sponsor", type: "yesno", section: "Business Case / Assignment" },
  { key: "approvalDate", label: "Approval Date", type: "date", section: "Business Case / Assignment" },
  { key: "approvalComments", label: "Approval Comments", type: "textarea", section: "Business Case / Assignment" },
  { key: "expenseType", label: "Expense Type", type: "select", optionKey: "expenseTypes", section: "Business Case / Assignment" },
  { key: "pasNumber", label: "PAS #", type: "text", section: "Business Case / Assignment" },
  { key: "pasStatus", label: "PAS Status", type: "select", optionKey: "pasStatuses", section: "Business Case / Assignment" },
  { key: "buCharged", label: "BU to be Charged", type: "text", section: "Business Case / Assignment" },
  { key: "demandNumber", label: "Demand #", type: "text", section: "Business Case / Assignment" },
  { key: "sowRequest", label: "SOW Request", type: "text", section: "Business Case / Assignment" },
  { key: "estDevHours", label: "Estimated Development Hours", type: "number", section: "Business Case / Assignment" },
  { key: "estPmoHours", label: "Estimated PMO / Deployment / Testing Hours", type: "number", section: "Business Case / Assignment" },

  // Project Execution (project stage only)
  { key: "availability", label: "Availability", type: "text", section: "Project Execution", stages: ["project"] },
  { key: "draftBusinessCase", label: "Attached Draft Business Case", type: "url", section: "Project Execution", stages: ["project"] },
  { key: "onlineApproval", label: "Online Approval", type: "yesno", section: "Project Execution", stages: ["project"] },
  { key: "projectStatus", label: "Project Status", type: "select", optionKey: "projectStatuses", section: "Project Execution", stages: ["project"] },
  { key: "projectStatusComments", label: "Project Status Comments", type: "textarea", section: "Project Execution", stages: ["project"] },
  { key: "latestComment", label: "Latest Comment", type: "textarea", section: "Project Execution", stages: ["project"] },
  { key: "dollarsSaved", label: "Dollars Saved ($)", type: "number", section: "Project Execution", stages: ["project"] },
  { key: "productionDate", label: "Production Date", type: "date", section: "Project Execution", stages: ["project"] },
  { key: "costChargedBack", label: "Cost Charged Back to Business ($)", type: "number", section: "Project Execution", stages: ["project"] },
  { key: "approval", label: "Approval", type: "text", section: "Project Execution", stages: ["project"], optional: true },
  { key: "moveToProject", label: "Move to Project", type: "text", section: "Project Execution", stages: ["project"], optional: true },
  { key: "businessCaseStatus", label: "Business Case Status (legacy)", type: "text", section: "Project Execution", stages: ["project"], optional: true },


  // Portfolio Info
  { key: "opportunityStatus", label: "Opportunity Status", type: "select", optionKey: "opportunityStatuses", section: "Portfolio Info" },
  { key: "opportunityComments", label: "Opportunity Comments", type: "textarea", section: "Portfolio Info" },
  { key: "year", label: "Year (FY)", type: "text", section: "Portfolio Info" },
  { key: "requestType", label: "Request Type", type: "select", optionKey: "requestTypes", section: "Portfolio Info" },
  { key: "technology", label: "Technology", type: "select", optionKey: "technologies", section: "Portfolio Info" },
  { key: "legacyAutomationCode", label: "Legacy Automation Code", type: "text", section: "Portfolio Info", optional: true },
  { key: "migrationSource", label: "Migration Source", type: "text", section: "Portfolio Info", optional: true },
];

/** Fields governance cares about for the Data Completeness report. */
export const GOVERNANCE_FIELDS = [
  "businessOwner",
  "processSme",
  "division",
  "functionalArea",
  "pasNumber",
  "businessCaseLink",
  "sponsorApproval",
  "automationCost",
  "netBenefits12",
  "productionDate",
  "technology",
] as const;

/** Expected document types per lifecycle stage. */
export const EXPECTED_DOCS: Record<string, string[]> = {
  idea: ["SOP", "Process Flow", "Business Case"],
  project: ["SOP", "Business Case", "PDD", "SDD", "Approval"],
  production: ["SOP", "Business Case", "PDD", "SDD", "UAT Evidence", "Approval", "Deployment Plan"],
  archived: ["SOP"],
};

export const fieldsForStage = (stage: string) =>
  FIELDS.filter((f) => !f.stages || f.stages.includes(stage === "production" ? "project" : (stage as "idea" | "project")));

export const isFilled = (v: FieldValue | undefined) =>
  v !== undefined && v !== null && String(v).trim() !== "";

export function completeness(record: Automation) {
  const fields = fieldsForStage(record.stage).filter((f) => !f.optional);
  const missing = fields.filter((f) => !isFilled(record.data[f.key]));
  return {
    total: fields.length,
    filled: fields.length - missing.length,
    percent: Math.round(((fields.length - missing.length) / fields.length) * 100),
    missing,
  };
}

export const LIFECYCLE = [
  "Ideation",
  "Initial Assessment",
  "Deep Dive",
  "Business Case Approved",
  "Requirements",
  "Development",
  "UAT",
  "Hypercare",
  "Production",
];

export function currentLifecycleStep(record: Automation) {
  const ps = record.data['projectStatus'] as string | undefined;
  if (ps && LIFECYCLE.includes(ps)) return LIFECYCLE.indexOf(ps);
  const os = record.data['opportunityStatus'] as string | undefined;
  if (os && LIFECYCLE.includes(os)) return LIFECYCLE.indexOf(os);
  return 0;
}

export function priorityFromScoring(s: Automation["scoring"]) {
  const score = s.businessValue * 2 + s.strategicPriority * 1.5 - s.complexity - s.risk * 0.5;
  if (score >= 8) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}
