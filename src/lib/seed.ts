import type { AppData } from "./types";

/**
 * Production defaults.
 *
 * The production workspace ships with NO demo/sample portfolio data — only
 * reference data (option lists). Records are created by users or imported.
 */
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

/** Assignable people are derived from active user accounts, never hard-coded. */
export const DEFAULT_USERS: string[] = [];

/** Shared RPAHUB production workspace location (informational in the UI). */
export const SHARED_WORKSPACE_PATH = "\\\\westrock.com\\shareddata\\1101\\RPAHUB\\Data";

/** An empty, production-ready workspace document. */
export function seedData(): AppData {
  return {
    version: 1,
    settings: {
      currentUser: "",
      users: [],
      dataFolderPath: SHARED_WORKSPACE_PATH,
      options: { ...DEFAULT_OPTIONS, users: [] },
      storageMode: "shared",
      workspaceLock: null,
    },
    automations: [],
    tasks: [],
    tombstones: [],
    adminLog: [],
    accounts: [],
  };
}
