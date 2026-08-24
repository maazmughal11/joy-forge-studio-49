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
  "Priya Raman",
  "Daniel Ortiz",
  "Sofia Lindqvist",
  "James Okafor",
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
};

const specs: SeedSpec[] = [
  { name: "Invoice Exception Triage", stage: "idea", category: "Discovery", oppStatus: "Initial Assessment", division: "Finance", area: "Accounts Payable", tech: "UiPath", owner: "Karen Hughes", sme: "Luis Barrera", ba: "Priya Raman", benefits: 180000, hours: 3100, scoring: [5, 3, 2, 4], region: "North America", age: 22 },
  { name: "Vendor Master Data Cleanse", stage: "idea", category: "Discovery", oppStatus: "Ideation", division: "Supply Chain", area: "Procurement", tech: "Power Automate", owner: "Tom Reilly", sme: "Anna Weber", ba: "Daniel Ortiz", benefits: 64000, hours: 950, scoring: [3, 2, 2, 3], region: "Europe", age: 9 },
  { name: "New Hire Onboarding Packet", stage: "idea", category: "Discovery", oppStatus: "Deep Dive", division: "Human Resources", area: "Payroll", tech: "Power Automate", owner: "Grace Kim", sme: "Ravi Menon", ba: "Sofia Lindqvist", benefits: 92000, hours: 1400, scoring: [4, 2, 1, 4], region: "North America", age: 40 },
  { name: "Customer Credit Hold Release", stage: "idea", category: "Discovery", oppStatus: "Business Case Approved", division: "Commercial", area: "Order Management", tech: "UiPath", owner: "Mark Feldman", sme: "Iris Chen", ba: "Priya Raman", benefits: 240000, hours: 4200, scoring: [5, 4, 3, 5], region: "North America", age: 55 },
  { name: "Quality Deviation Log Sync", stage: "idea", category: "Discovery", oppStatus: "On Hold", division: "Manufacturing", area: "Quality", tech: "Not Determined", owner: "Hugo Silva", sme: "Nina Patel", ba: "James Okafor", benefits: 45000, hours: 700, scoring: [2, 4, 4, 2], region: "Latin America", age: 70 },
  { name: "Bank Statement Reconciliation", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Development", division: "Finance", area: "Accounts Receivable", tech: "UiPath", owner: "Elaine Torres", sme: "Peter Novak", ba: "Daniel Ortiz", benefits: 310000, hours: 5200, scoring: [5, 3, 2, 5], region: "Europe", age: 120 },
  { name: "Purchase Order Creation Bot", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Requirements", division: "Supply Chain", area: "Procurement", tech: "Automation Anywhere", owner: "Tom Reilly", sme: "Anna Weber", ba: "Sofia Lindqvist", benefits: 155000, hours: 2400, scoring: [4, 3, 2, 4], region: "Asia", age: 45 },
  { name: "Payroll Variance Report", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "UAT", division: "Human Resources", area: "Payroll", tech: "Power Automate", owner: "Grace Kim", sme: "Ravi Menon", ba: "Priya Raman", benefits: 88000, hours: 1300, scoring: [3, 2, 2, 3], region: "North America", age: 200 },
  { name: "Freight Invoice Audit", stage: "project", category: "Pipeline", oppStatus: "Business Case Approved", projStatus: "Hypercare", division: "Supply Chain", area: "Accounts Payable", tech: "UiPath", owner: "Marta Cruz", sme: "Owen Blake", ba: "James Okafor", benefits: 275000, hours: 4800, scoring: [5, 3, 3, 4], region: "Middle East", age: 260 },
  { name: "Sales Order Entry Automation", stage: "project", category: "Pipeline", oppStatus: "On Hold", projStatus: "On Hold", division: "Commercial", area: "Order Management", tech: "UiPath", owner: "Mark Feldman", sme: "Iris Chen", ba: "Daniel Ortiz", benefits: 130000, hours: 2000, scoring: [3, 4, 4, 3], region: "Africa", age: 150 },
  { name: "Month-End Journal Posting", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "Finance", area: "Reporting", tech: "UiPath", owner: "Elaine Torres", sme: "Peter Novak", ba: "Priya Raman", benefits: 420000, hours: 6900, scoring: [5, 3, 1, 5], region: "North America", age: 400 },
  { name: "Customer Refund Processing", stage: "production", category: "Deployed", oppStatus: "Business Case Approved", projStatus: "Production", division: "Commercial", area: "Customer Service", tech: "Power Automate", owner: "Amir Haddad", sme: "Lena Fischer", ba: "Sofia Lindqvist", benefits: 195000, hours: 3300, scoring: [4, 2, 2, 4], region: "Europe", age: 330 },
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
      businessValue: spec.scoring[0],
      complexity: spec.scoring[1],
      risk: spec.scoring[2],
      strategicPriority: spec.scoring[3],
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
    ],
    comments: [
      { id: uid("c"), timestamp: modified, user: spec.ba, text: isProject ? "Weekly checkpoint held with the business; no blockers raised." : "Discovery workshop scheduled with the process SME." },
    ],
    updates: isProject
      ? [
          { id: uid("u"), date: day(21), submittedBy: spec.ba, text: "Design walkthrough completed.", percentComplete: 35, rag: "Green" },
          { id: uid("u"), date: day(14), submittedBy: spec.ba, text: "Environment access delays with IT.", percentComplete: 50, rag: "Amber" },
          ...(i % 3 === 0 ? [] : [{ id: uid("u"), date: day(4), submittedBy: spec.ba, text: "Back on track after credentials were issued.", percentComplete: 70, rag: "Green" as const }]),
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
      rpaCandidateReason: "High volume, rule-based",
      processSme: spec.sme,
      businessOwner: spec.owner,
      currentState: "Process is executed manually across multiple systems with spreadsheet-based tracking.",
      sopAvailable: "Yes",
      whoPerforms: `${spec.area} shared services team`,
      handoffs: i % 2 === 0 ? "Yes" : "No",
      slaInPlace: "Yes",
      primaryApplication: "SAP",
      appRole: "Standard processor",
      otherApplications: "Outlook, Excel, ServiceNow",
      processTrigger: "Scheduled daily run",
      frequency: "Daily",
      monthlyVolume: 400 + i * 130,
      startFinishWindow: "06:00 - 18:00 local",
      volumeConsistency: "Consistent with month-end peak",
      transactionDuration: "6 minutes",
      knownRisks: "Source system downtime during month-end close.",
      knownExceptions: "Non-standard vendor formats require manual review.",
      percentAutomatable: 70 + (i % 4) * 5,
      netBenefits12: spec.benefits,
      netBenefits24: spec.benefits * 2,
      automationCost: Math.round(spec.benefits * 0.28),
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
      pasStatus: approved ? "Approved" : "Not Started",
      buCharged: approved ? `${spec.division} - ${spec.region}` : "",
      demandNumber: approved ? `DMD-${8100 + i}` : "",
      sowRequest: approved ? `SOW-${500 + i}` : "",
      estDevHours: 120 + i * 20,
      estPmoHours: 60 + i * 8,
      opportunityStatus: spec.oppStatus,
      opportunityComments: "",
      year: `FY${new Date().getFullYear() - (spec.age > 300 ? 1 : 0)}`,
      requestType: "New Automation",
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
      productionDate: spec.stage === "production" ? day(Math.round(spec.age / 4)) : day(-30),
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
