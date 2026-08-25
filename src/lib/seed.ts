import type { AppData, Automation, Stage, Category } from "./types";

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
  documentTypes: ["SOP", "Business Case", "PDD", "SDD", "UAT Evidence", "Approval", "Deployment Plan"],
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
    updates: isProject
      ? [
          { id: uid("u"), date: day(28), submittedBy: spec.ba, text: "Requirements signed off by the business.", percentComplete: 20, rag: "Green" },
          { id: uid("u"), date: day(21), submittedBy: spec.ba, text: "Design walkthrough completed.", percentComplete: 35, rag: "Green" },
          { id: uid("u"), date: day(14), submittedBy: spec.sme, text: "Environment access delays with IT.", percentComplete: 50, rag: i % 4 === 0 ? "Red" : "Amber" },
          ...(i % 3 === 0
            ? []
            : [{ id: uid("u"), date: day(4), submittedBy: spec.ba, text: "Back on track after credentials were issued.", percentComplete: spec.stage === "production" ? 100 : 70, rag: "Green" as const }]),
        ]
      : [],
    data: {
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
    },
    automations: specs.map(build),
  };
}
