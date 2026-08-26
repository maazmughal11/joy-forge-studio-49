import type { AppData, Approval, Automation, Stage, Category } from "./types";

export const DEFAULT_OPTIONS: Record<string, string[]> = {
  divisions: ["Corporate", "Finance", "Human Resources", "Supply Chain", "Manufacturing", "Commercial", "IT", "Legal"],
  regions: ["North America", "Europe", "Middle East", "Africa", "Asia", "Latin America"],
  functionalAreas: ["Accounts Payable", "Accounts Receivable", "Payroll", "Procurement", "Order Management", "Reporting", "Customer Service", "Quality"],
  technologies: ["UiPath", "Power Automate", "Automation Anywhere", "Blue Prism", "Python Script", "Not Determined"],
  requestTypes: ["New Automation", "Enhancement", "Bug Fix", "Re-platform"],
  expenseTypes: ["CAPEX", "OPEX"],
  opportunityStatuses: ["Ideation", "Initial Assessment", "Deep Dive", "Business Case Approved", "On Hold", "Cancelled"],
  projectStatuses: ["Requirements", "Development", "UAT", "Hypercare", "On Hold", "Production"],
  pasStatuses: ["Not Started", "Submitted", "In Review", "Approved", "Rejected"],
  rpaReasons: ["High volume, rule-based", "Repetitive manual data entry", "Multiple system touchpoints", "Error-prone process", "Compliance / audit driven", "Seasonal peak workload"],
  documentTypes: ["SOP", "Process Flow", "Business Case", "PDD", "SDD", "UAT Evidence", "Approval", "Deployment Plan"],
  approvalTypes: ["Business Case Approval", "Move to Project Approval", "UAT Approval", "Deployment Approval", "Benefits Validation", "Other"],
};

export const DEFAULT_USERS = [
  "Maaz Mughal",
  "Ana D Prado",
  "Clay Hartzog",
  "Lisa Lagasse",
  "Jay Jefferson",
  "Wai Wan",
];

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();
const day = (daysAgo: number) => iso(daysAgo).slice(0, 10);

let n = 0;
const uid = (p = "id") => `${p}-${(n++).toString(36)}`;

type SeedSpec = {
  name: string;
  stage: Stage;
  category: Category;
  oppStatus: string;
  projStatus?: string;
  division: string;
  area: string;
  tech: string;
  owner: string;
  sme: string;
  ba: string;
  benefits: number;
  hours: number;
  scoring: [number, number, number, number];
  region: string;
  age: number;
  requestType?: string;
};

const specs: SeedSpec[] = [
  // ---------- Discovery / Ideas ----------
  { name: "Invoice Exception Triage", stage: "idea", category: "Discovery", oppStatus: "Initial Assessment", division: "Finance", area: "Accounts Payable", tech: "UiPath", owner: "Clay Hartzog", sme: "Wai Wan", ba: "Ana D Prado", benefits: 180000, hours: 3100, scoring: [5, 3, 2, 4], region: "North America", age: 22 },
  { name: "Vendor Master Data Cleanse", stage: "idea", category: "Discovery", oppStatus: "Ideation", division: "Supply Chain", area: "Procurement", tech: "Power Automate", owner: "Lisa Lagasse", sme: "Jay Jefferson", ba: "Maaz Mughal", benefits: 64000, hours: 950, scoring: [3, 2, 2, 3], region: "Europe", age: 9 },
  { name: "New Hire Onboarding Packet", stage: "idea", category: "Discovery", oppStatus: "Deep Dive", division: "Human Resources", area: "Payroll", tech: "Power Automate", owner: "Jay Jefferson", sme: "Lisa Lagasse", ba: "Wai Wan", benefits: 92000, hours: 1400, scoring: [4, 2, 1, 4], region: "North America", age: 40 },
  { name: "Customer Credit Hold Release", stage: "idea", category: "Discovery", oppStatus: "Business Case Approved", division: "Commercial", area: "Order Management", tech: "UiPath", owner: "Maaz Mughal", sme: "Clay Hartzog", ba: "Ana D Prado", benefits: 240000, hours: 4200, scoring: [5, 4, 3, 5], region: "North America", age: 55 },
  { name: "Quality Deviation Log Sync", stage: "idea", category: "Discovery", oppStatus: "On Hold", division: "Manufacturing", area: "Quality", tech: "Not Determined", owner: "Wai Wan", sme: "Ana D Prado", ba: "Jay Jefferson", benefits: 45000, hours: 700, scoring: [2, 4, 4, 2], region: "Latin America", age: 70 },
  { name: "Sales Tax Certificate Validation", stage: "idea", category: "Discovery", oppStatus: "Deep Dive", division: "Finance", area: "Accounts Receivable", tech: "Python Script", owner: "Ana D Prado", sme: "Maaz Mughal", ba: "Clay Hartzog", benefits: 118000, hours: 1850, scoring: [4, 3, 3, 3], region: "North America", age: 31, requestType: "New Automation" },
  { name: "Supplier Onboarding Checklist", stage: "idea", category: "Discovery", oppStatus: "Initial Assessment", division: "Supply Chain", area: "Procurement", tech: "Power Automate", owner: "Clay Hartzog", sme: "Lisa Lagasse", ba: "Wai Wan", benefits: 76000, hours: 1150, scoring: [3, 2, 2, 4], region: "Asia", age: 13 },
  { name: "Mill Downtime Report Assembly", stage: "idea", category: "Discovery", oppStatus: "Ideation", division: "Manufacturing", area: "Reporting", tech: "Not Determined", owner: "Jay Jefferson", sme: "Wai Wan", ba: "Maaz Mughal", benefits: 52000, hours: 820, scoring: [2, 3, 2, 2], region: "Europe", age: 5 },
  { name: "Contract Renewal Reminders", stage: "idea", category: "Discovery", oppStatus: "Cancelled", division: "Legal", area: "Reporting", tech: "Power Automate", owner: "Lisa Lagasse", sme: "Ana D Prado", ba: "Jay Jefferson", benefits: 38000, hours: 540, scoring: [2, 2, 3, 1], region: "Europe", age: 95 },
  { name: "Customer Complaint Routing", stage: "idea", category: "Discovery", oppStatus: "Business Case Approved", division: "Commercial", area: "Customer Service", tech: "UiPath", owner: "Wai Wan", sme: "Clay Hartzog", ba: "Lisa Lagasse", benefits: 205000, hours: 3400, scoring: [5, 3, 2, 5], region: "Middle East", age: 62 },
  { name: "Employee Expense Audit", stage: "idea", category: "Discovery", oppStatus: "Deep Dive", division: "Finance", area: "Accounts Payable", tech: "Automation Anywhere", owner: "Maaz Mughal", sme: "Jay Jefferson", ba: "Ana D Prado", benefits: 134000, hours: 2100, scoring: [4, 4, 3, 3], region: "Africa", age: 47 },
  { name: "IT Access Recertification", stage: "idea", category: "Discovery", oppStatus: "Initial Assessment", division: "IT", area: "Reporting", tech: "Python Script", owner: "Ana D Prado", sme: "Maaz Mughal", ba: "Clay Hartzog", benefits: 88000, hours: 1300, scoring: [3, 3, 4, 4], region: "North America", age: 18 },

  // ---------- Pipeline / Projects ----------
  { name: "Bank Statement Reconciliation", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Development", division: "Finance", area: "Accounts Receivable", tech: "UiPath", owner: "Clay Hartzog", sme: "Wai Wan", ba: "Maaz Mughal", benefits: 310000, hours: 5200, scoring: [5, 3, 2, 5], region: "Europe", age: 120 },
  { name: "Purchase Order Creation Bot", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Requirements", division: "Supply Chain", area: "Procurement", tech: "Automation Anywhere", owner: "Lisa Lagasse", sme: "Jay Jefferson", ba: "Wai Wan", benefits: 155000, hours: 2400, scoring: [4, 3, 2, 4], region: "Asia", age: 45 },
  { name: "Payroll Variance Report", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "UAT", division: "Human Resources", area: "Payroll", tech: "Power Automate", owner: "Jay Jefferson", sme: "Lisa Lagasse", ba: "Ana D Prado", benefits: 88000, hours: 1300, scoring: [3, 2, 2, 3], region: "North America", age: 200 },
  { name: "Freight Invoice Audit", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Hypercare", division: "Supply Chain", area: "Accounts Payable", tech: "UiPath", owner: "Wai Wan", sme: "Clay Hartzog", ba: "Jay Jefferson", benefits: 275000, hours: 4800, scoring: [5, 3, 3, 4], region: "Middle East", age: 260 },
  { name: "Sales Order Entry Automation", stage: "project", category: "Pipeline", oppStatus: "On Hold", projStatus: "On Hold", division: "Commercial", area: "Order Management", tech: "UiPath", owner: "Maaz Mughal", sme: "Ana D Prado", ba: "Clay Hartzog", benefits: 130000, hours: 2000, scoring: [3, 4, 4, 3], region: "Africa", age: 150 },
  { name: "Intercompany Netting Run", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Development", division: "Finance", area: "Reporting", tech: "Blue Prism", owner: "Ana D Prado", sme: "Maaz Mughal", ba: "Lisa Lagasse", benefits: 225000, hours: 3600, scoring: [4, 4, 3, 4], region: "Europe", age: 105, requestType: "Re-platform" },
  { name: "Customer Master Updates", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Requirements", division: "Commercial", area: "Customer Service", tech: "Power Automate", owner: "Clay Hartzog", sme: "Wai Wan", ba: "Maaz Mughal", benefits: 97000, hours: 1500, scoring: [3, 2, 2, 3], region: "Latin America", age: 60 },
  { name: "Goods Receipt Matching", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "UAT", division: "Manufacturing", area: "Procurement", tech: "UiPath", owner: "Lisa Lagasse", sme: "Jay Jefferson", ba: "Wai Wan", benefits: 340000, hours: 5600, scoring: [5, 4, 2, 5], region: "North America", age: 175 },
  { name: "Benefits Enrollment Sync", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Hypercare", division: "Human Resources", area: "Payroll", tech: "Power Automate", owner: "Jay Jefferson", sme: "Lisa Lagasse", ba: "Ana D Prado", benefits: 112000, hours: 1750, scoring: [3, 3, 3, 3], region: "Europe", age: 230, requestType: "Enhancement" },
  { name: "Service Desk Ticket Triage", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Development", division: "IT", area: "Customer Service", tech: "Python Script", owner: "Maaz Mughal", sme: "Clay Hartzog", ba: "Jay Jefferson", benefits: 168000, hours: 2700, scoring: [4, 3, 2, 4], region: "Asia", age: 88 },

  // ---------- Production ----------
  { name: "Month-End Journal Posting", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "Finance", area: "Reporting", tech: "UiPath", owner: "Ana D Prado", sme: "Maaz Mughal", ba: "Clay Hartzog", benefits: 420000, hours: 6900, scoring: [5, 3, 1, 5], region: "North America", age: 400 },
  { name: "Customer Refund Processing", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "Commercial", area: "Customer Service", tech: "Power Automate", owner: "Wai Wan", sme: "Lisa Lagasse", ba: "Ana D Prado", benefits: 195000, hours: 3300, scoring: [4, 2, 2, 4], region: "Europe", age: 330 },
  { name: "Three-Way Match Bot", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "Finance", area: "Accounts Payable", tech: "UiPath", owner: "Clay Hartzog", sme: "Wai Wan", ba: "Maaz Mughal", benefits: 510000, hours: 8200, scoring: [5, 4, 2, 5], region: "North America", age: 520 },
  { name: "Shipment Status Notifications", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "Supply Chain", area: "Order Management", tech: "Power Automate", owner: "Lisa Lagasse", sme: "Jay Jefferson", ba: "Wai Wan", benefits: 148000, hours: 2450, scoring: [4, 2, 1, 3], region: "Asia", age: 290 },
  { name: "Timesheet Compliance Check", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "Human Resources", area: "Payroll", tech: "Automation Anywhere", owner: "Jay Jefferson", sme: "Ana D Prado", ba: "Lisa Lagasse", benefits: 96000, hours: 1600, scoring: [3, 2, 2, 3], region: "Latin America", age: 365 },
  { name: "Daily Production Yield Report", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "Manufacturing", area: "Reporting", tech: "Python Script", owner: "Maaz Mughal", sme: "Clay Hartzog", ba: "Jay Jefferson", benefits: 262000, hours: 4300, scoring: [5, 3, 2, 4], region: "Europe", age: 445 },
  { name: "Dunning Letter Generation", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "Finance", area: "Accounts Receivable", tech: "Blue Prism", owner: "Ana D Prado", sme: "Maaz Mughal", ba: "Clay Hartzog", benefits: 174000, hours: 2900, scoring: [4, 3, 2, 4], region: "Middle East", age: 275 },
  { name: "License Renewal Tracking", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "IT", area: "Reporting", tech: "Power Automate", owner: "Wai Wan", sme: "Lisa Lagasse", ba: "Ana D Prado", benefits: 71000, hours: 1150, scoring: [3, 1, 1, 2], region: "Africa", age: 210, requestType: "Enhancement" },

  // ---------- Archived ----------
  { name: "Legacy Fax Order Capture", stage: "archived", category: "Deployed", oppStatus: "Cancelled", projStatus: "On Hold", division: "Commercial", area: "Order Management", tech: "Blue Prism", owner: "Clay Hartzog", sme: "Jay Jefferson", ba: "Maaz Mughal", benefits: 42000, hours: 620, scoring: [2, 3, 4, 1], region: "North America", age: 610 },
  { name: "Manual Price List Upload", stage: "archived", category: "Discovery", oppStatus: "Cancelled", division: "Commercial", area: "Reporting", tech: "Not Determined", owner: "Lisa Lagasse", sme: "Wai Wan", ba: "Ana D Prado", benefits: 29000, hours: 430, scoring: [1, 2, 3, 1], region: "Europe", age: 480 },
];

const SUMMARIES = [
  "Requirements signed off by the business.",
  "Design walkthrough completed with the CoE architect.",
  "Build progressing; happy path complete.",
  "Exception handling in progress, SIT started.",
  "UAT scripts drafted with the business SMEs.",
  "UAT cycle 1 executed; defects being triaged.",
  "Hypercare monitoring in place, volumes stable.",
  "Benefits tracking baselined with Finance.",
];
const ACCOMPLISHMENTS = [
  "Process walkthrough recorded and PDD updated.",
  "Core workflow build completed for the happy path.",
  "Regression pack executed with no critical defects.",
  "Service accounts provisioned and environment validated.",
  "UAT sign-off received from the business owner.",
];
const NEXT_STEPS = [
  "Complete exception handling and start SIT.",
  "Schedule UAT kickoff with the business.",
  "Finalise SDD and peer review the code.",
  "Prepare go-live checklist and hypercare plan.",
  "Confirm benefits baseline with Finance.",
];
const BLOCKERS = [
  "None",
  "Awaiting service account provisioning from IT.",
  "Business SME availability limited during month-end close.",
  "Source system upgrade freeze delays UAT window.",
  "Pending security review of the credential store.",
];
const DECISIONS = [
  "None",
  "Confirm whether exceptions route to the shared mailbox.",
  "Agree scope of phase 2 volumes before UAT.",
  "Decide on attended vs unattended run mode.",
];

function buildUpdates(spec: SeedSpec, i: number) {
  const weeks = 3 + (i % 4); // 3-6 weekly updates per project
  const target = spec.stage === "production" ? 100 : 45 + ((i * 7) % 50);
  const out: Automation["updates"][number][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const idx = weeks - 1 - w;
    const pct = Math.min(target, Math.round(((idx + 1) / weeks) * target));
    const seed = i + idx;
    const rag: "Red" | "Amber" | "Green" =
      seed % 9 === 0 ? "Red" : seed % 4 === 0 ? "Amber" : "Green";
    out.push({
      id: uid("u"),
      date: day(w * 7 + (i % 3)),
      submittedBy: idx % 2 === 0 ? spec.ba : spec.sme,
      text: SUMMARIES[(i + idx) % SUMMARIES.length]!,
      percentComplete: pct,
      rag,
      accomplishments: ACCOMPLISHMENTS[(i + idx) % ACCOMPLISHMENTS.length]!,
      nextSteps: NEXT_STEPS[(i + idx + 1) % NEXT_STEPS.length]!,
      blockers: rag === "Green" ? "None" : BLOCKERS[(i + idx) % BLOCKERS.length]!,
      decisions: DECISIONS[(i + idx) % DECISIONS.length]!,
    });
  }
  // some projects deliberately have a stale last update
  return i % 5 === 0 ? out.slice(0, Math.max(1, out.length - 1)) : out;
}

function buildApprovals(spec: SeedSpec, i: number): Approval[] {
  const out: Approval[] = [];
  const approved = spec.oppStatus === "Business Case Approved";
  const cancelled = spec.oppStatus === "Cancelled";
  const push = (type: string, status: Approval["status"], requestedAgo: number, decidedAgo?: number) =>
    out.push({
      id: uid("ap"),
      type,
      status,
      requestedBy: spec.ba,
      requestedDate: day(requestedAgo),
      approver: spec.owner,
      dueDate: day(requestedAgo - 7),
      ...(decidedAgo !== undefined ? { decisionDate: day(decidedAgo) } : {}),
      decisionComments:
        status === "Approved"
          ? "Approved in the monthly Automation CoE portfolio review."
          : status === "Rejected"
            ? "Benefit case not strong enough for the current fiscal year."
            : status === "Pending"
              ? "Awaiting business sponsor sign-off."
              : "",
      evidenceLink: status === "Approved" ? "https://sharepoint.local/sites/coe/approvals" : "",
    });

  if (cancelled) push("Business Case Approval", "Rejected", Math.round(spec.age / 2), Math.round(spec.age / 3));
  else if (approved) push("Business Case Approval", "Approved", Math.round(spec.age / 2) + 10, Math.round(spec.age / 2));
  else if (spec.oppStatus === "Deep Dive") push("Business Case Approval", "Pending", 3 + (i % 4) * 5);
  else if (spec.oppStatus === "On Hold") push("Business Case Approval", "Draft", 20 + i);
  else push("Business Case Approval", "Not Required", 5 + i);

  if (spec.stage !== "idea") {
    push("Move to Project Approval", "Approved", Math.round(spec.age / 2) - 4, Math.round(spec.age / 2) - 8);
  }
  if (["UAT", "Hypercare", "Production"].includes(spec.projStatus ?? "")) {
    push("UAT Approval", spec.projStatus === "UAT" ? "Pending" : "Approved", spec.projStatus === "UAT" ? 2 + (i % 9) : 40, spec.projStatus === "UAT" ? undefined : 35);
  }
  if (spec.stage === "production") {
    push("Deployment Approval", "Approved", 30, 26);
    push("Benefits Validation", i % 2 === 0 ? "Pending" : "Approved", 4 + (i % 10), i % 2 === 0 ? undefined : 3);
  }
  if (spec.projStatus === "On Hold") push("Move to Project Approval", "Cancelled", 60, 55);
  return out;
}

function build(spec: SeedSpec, i: number): Automation {
  const created = iso(spec.age);
  const modified = iso(Math.max(1, Math.round(spec.age / (i % 3 === 0 ? 12 : 3))));
  const rate = 45;
  const approved = spec.oppStatus === "Business Case Approved";
  const isProject = spec.stage !== "idea";
  const record: Automation = {
    id: uid("aut"),
    stage: spec.stage,
    category: spec.category,
    scoring: {
      businessValue: spec.scoring[0]!,
      complexity: spec.scoring[1]!,
      risk: spec.scoring[2]!,
      strategicPriority: spec.scoring[3]!,
    },
    createdBy: spec.ba,
    createdDate: created,
    modifiedBy: spec.ba,
    modifiedDate: modified,
    history: [
      { id: uid("h"), timestamp: created, user: spec.ba, action: "Record created" },
      { id: uid("h"), timestamp: modified, user: spec.ba, action: "Status updated", field: "opportunityStatus", oldValue: "Ideation", newValue: spec.oppStatus },
    ],
    documents: [
      { id: uid("d"), name: `${spec.name} - SOP`, type: "SOP", link: "https://sharepoint.local/sites/coe/sop", status: "Approved", uploadedBy: spec.ba, uploadedDate: created },
      ...(approved
        ? [{ id: uid("d"), name: `${spec.name} - Business Case`, type: "Business Case" as const, link: "https://sharepoint.local/sites/coe/bc", status: "Final" as const, uploadedBy: spec.ba, uploadedDate: modified }]
        : []),
      ...(isProject
        ? [{ id: uid("d"), name: `${spec.name} - PDD`, type: "PDD" as const, link: "https://sharepoint.local/sites/coe/pdd", status: "Under Review" as const, uploadedBy: spec.sme, uploadedDate: modified }]
        : []),
      ...(spec.stage === "production"
        ? [{ id: uid("d"), name: `${spec.name} - UAT Evidence`, type: "UAT Evidence" as const, link: "https://sharepoint.local/sites/coe/uat", status: "Approved" as const, uploadedBy: spec.owner, uploadedDate: modified }]
        : []),
    ],
    comments: [
      { id: uid("c"), timestamp: created, user: spec.owner, text: isProject ? "Kickoff completed with the business owner and CoE." : "Idea logged after process discovery session." },
      { id: uid("c"), timestamp: modified, user: spec.ba, text: isProject ? "Weekly checkpoint held with the business; no blockers raised." : "Discovery workshop scheduled with the process SME." },
    ],
    updates: isProject ? buildUpdates(spec, i) : [],
    approvals: buildApprovals(spec, i),
    data: {
      automationId: `AUT-${new Date().getFullYear() - (spec.age > 300 ? 1 : 0)}-${String(i + 1).padStart(4, "0")}`,
      legacyAutomationCode: i % 4 === 3 ? "" : `${(61 + i).toString().padStart(3, "0")}${i % 5 === 0 ? "A" : ""}`,
      submittedBy: spec.ba,
      submissionDate: created.slice(0, 10),
      opportunityName: spec.name,
      division: spec.division,
      region: spec.region,
      functionalArea: spec.area,
      opportunityDescription: `Automate the end-to-end ${spec.name.toLowerCase()} process currently performed manually by the ${spec.division} team.`,
      businessImpact: `Reduces manual effort by ~${spec.hours} hours annually and improves cycle time and accuracy.`,
      rpaCandidateReason: DEFAULT_OPTIONS['rpaReasons']![i % DEFAULT_OPTIONS['rpaReasons']!.length]!,
      processSme: spec.sme,
      businessOwner: spec.owner,
      currentState: "Process is executed manually across multiple systems with spreadsheet-based tracking.",
      sopAvailable: i % 5 === 0 ? "No" : "Yes",
      whoPerforms: `${spec.area} shared services team`,
      handoffs: i % 2 === 0 ? "Yes" : "No",
      slaInPlace: i % 3 === 0 ? "No" : "Yes",
      primaryApplication: ["SAP", "Oracle EBS", "ServiceNow", "Salesforce"][i % 4]!,
      appRole: "Standard processor",
      otherApplications: "Outlook, Excel, ServiceNow",
      processTrigger: i % 2 === 0 ? "Scheduled daily run" : "Email received",
      frequency: ["Daily", "Weekly", "Monthly", "Ad hoc"][i % 4]!,
      monthlyVolume: 320 + i * 145,
      startFinishWindow: "06:00 - 18:00 local",
      volumeConsistency: "Consistent with month-end peak",
      transactionDuration: `${4 + (i % 9)} minutes`,
      knownRisks: "Source system downtime during month-end close.",
      knownExceptions: "Non-standard vendor formats require manual review.",
      percentAutomatable: 60 + (i % 8) * 5,
      netBenefits12: spec.benefits,
      netBenefits24: spec.benefits * 2,
      automationCost: Math.round(spec.benefits * (0.18 + (i % 5) * 0.04)),
      hoursSaved: spec.hours,
      grossBenefits1yr: spec.hours * rate,
      fteEquivalent: Math.round((spec.hours / 1800) * 10) / 10,
      hourlyRate: rate,
      businessAnalyst: spec.ba,
      businessCaseLink: approved ? "https://sharepoint.local/sites/coe/business-case" : "",
      validationCheck: approved ? "Yes" : "",
      sponsorApproval: approved ? "Yes" : "",
      approvalDate: approved ? day(Math.round(spec.age / 2)) : "",
      approvalComments: approved ? "Approved by sponsor in portfolio review." : "",
      expenseType: approved ? (i % 2 === 0 ? "CAPEX" : "OPEX") : "",
      pasNumber: approved ? `PAS-${2400 + i}` : "",
      pasStatus: approved ? "Approved" : i % 3 === 0 ? "Submitted" : "Not Started",
      buCharged: approved ? `${spec.division} - ${spec.region}` : "",
      demandNumber: approved ? `DMD-${8100 + i}` : "",
      sowRequest: approved ? `SOW-${500 + i}` : "",
      estDevHours: 120 + i * 20,
      estPmoHours: 60 + i * 8,
      opportunityStatus: spec.oppStatus,
      opportunityComments: "",
      year: `FY${new Date().getFullYear() - (spec.age > 300 ? 1 : 0)}`,
      requestType: spec.requestType ?? "New Automation",
      technology: spec.tech,
    },
  };

  if (isProject) {
    Object.assign(record.data, {
      availability: "24/5",
      draftBusinessCase: "https://sharepoint.local/sites/coe/draft-bc",
      onlineApproval: "Yes",
      projectStatus: spec.projStatus ?? "Requirements",
      projectStatusComments: "Tracking to plan.",
      latestComment: "Weekly update submitted.",
      dollarsSaved: spec.stage === "production" ? spec.benefits : 0,
      productionDate: spec.stage === "production" ? day(Math.round(spec.age / 4)) : day(-30 - (i % 6) * 15),
      costChargedBack: Math.round(spec.benefits * 0.18),
    });
  }

  return record;
}

export function seedData(): AppData {
  return {
    version: 1,
    settings: {
      currentUser: DEFAULT_USERS[0]!,
      users: DEFAULT_USERS,
      dataFolderPath: "C:\\Users\\<you>\\OneDrive - Company\\Automation CoE\\portfolio-data",
      options: { ...DEFAULT_OPTIONS, users: DEFAULT_USERS },
      storageMode: "local",
      autoBackup: true,
      backupFrequency: "Daily",
      backupRetention: 7,
      workspaceLock: null,
    },
    automations: specs.map(build),
    backups: [],
    adminLog: [],
  };
}
