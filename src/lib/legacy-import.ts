/**
 * Legacy Excel import engine for the two historical RPA trackers:
 *  - "RPA Opportunity Initial Assessment" (54 columns)
 *  - "RPA Project Tracking" (63 columns)
 *
 * Pure logic only — no React, no storage access — so it is unit testable
 * and reusable by any future storage provider.
 */
import { FIELDS } from "./fields";
import type { FieldDef } from "./fields";
import type { Automation, FieldValue, Stage } from "./types";

/* ------------------------------------------------------------------ */
/* Legacy template column lists (exact historical header strings)      */
/* ------------------------------------------------------------------ */

export const OPPORTUNITY_LEGACY_COLUMNS: string[] = [
  "Submitted By",
  "Date",
  "Opportunity Name",
  "WRK Division",
  "Functional Area",
  "Opportunity Description",
  "What are the impacts to the business? Benefits?",
  "Why is this a good candidate for RPA?",
  "Process SME Name",
  "Process/Business Owner Name",
  "Current State of Process",
  "Is there a SOP available including a process flow?",
  "Who performs this process?",
  "Does the process include hand-offs between differe",
  "Is there a Service Level Agreement SLA in place",
  "What is the primary application used in this proce",
  "What is the role/user type required in the applica",
  "What other applications are used?",
  "Process Trigger",
  "How often is this process is performed?",
  "What is the transaction volume per month?",
  "When should the process start and finish?",
  "How consistent is the transaction volume?",
  "How long does it take to perform one transaction?",
  "Are there any known risks associated to the proces",
  "Are there any known business exceptions or to the",
  "What % of the process",
  "Net benefits in 12 months from deployment date.",
  "Net benefits in 24 months from deployment date.",
  "Automation Cost",
  "Hours Saved",
  "Gross Benefits 1YR",
  "FTE equivalent that currently works on the process",
  "Hourly Rate $/hr",
  "Business Analyst ",
  "Business Case sharepoint link ",
  "Validation Check",
  "Business Case Approval Business Sponsor",
  "Expense Type",
  "PAS#",
  "PAS Status",
  "BU to be Charged",
  "Demand #",
  "SOW Request",
  "Estimated Development hours",
  "Estimated PMO Deployment, testing ",
  "Opportunity Status",
  "Opportunity comments",
  "Category",
  "Year",
  "Request Type",
  "Technology",
  "Modified By",
  "Modified",
];

export const PROJECT_LEGACY_COLUMNS: string[] = [
  "Submitted By",
  "Date",
  "Opportunity Name",
  "WRK Division",
  "Functional Area",
  "Opportunity Description",
  "What are the impacts to the business? Benefits?",
  "Why is this a good candidate for RPA?",
  "Process SME Name",
  "Process/Business Owner Name",
  "Current State of Process",
  "Is there a SOP available including a process flow?",
  "Who performs this process?",
  "Does the process include hand-offs between differe",
  "Is there a Service Level Agreement SLA in place",
  "What is the primary application used in this proce",
  "What is the role/user type required in the applica",
  "What other applications are used?",
  "Process Trigger",
  "How often is this process is performed?",
  "What is the transaction volume per month?",
  "When should the process start and finish?",
  "How consistent is the transaction volume?",
  "How long does it take to perform one transaction?",
  "Are there any known risks associated to the proces",
  "Are there any known business exceptions or to the",
  "What % of the process",
  "Net benefits in 12 months from deployment date.",
  "Net benefits in 24 months from deployment date.",
  "Automation Cost",
  "Hours Saved",
  "Dollars Saved",
  "FTE equivalent that currently works on the process",
  "Availability",
  "Attached Draft Business Case",
  "Validation Check",
  "Approval",
  "Expense Type",
  "PAS#",
  "PAS Status",
  "BU To be Charged",
  "Demand #",
  "SOW Request",
  "Move to Project",
  "Online Approval",
  "Gross Benefits 1YR",
  "Business Case Approval Business Sponsor",
  "Estimated Development hours",
  "Estimated PMO Deployment, testing ",
  "Opportunity Status",
  "Project Status",
  "Project status comments",
  "Latest Comment",
  "Modified By",
  "Modified",
  "Category",
  "Production Date",
  "Cost Charged back to Business",
  "Year",
  "Opportunity comments",
  "Hourly Rate $/hr",
  "Request Type",
  "Technology",
];

/* ------------------------------------------------------------------ */
/* Header normalization + alias table                                  */
/* ------------------------------------------------------------------ */

export const normHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Legacy header (normalized) -> application field key. */
const RAW_ALIASES: [string, string][] = [
  ["Submitted By", "submittedBy"],
  ["Date", "submissionDate"],
  ["Submission Date", "submissionDate"],
  ["Opportunity Name", "opportunityName"],
  ["WRK Division", "division"],
  ["Division", "division"],
  ["Region", "region"],
  ["Functional Area", "functionalArea"],
  ["Opportunity Description", "opportunityDescription"],
  ["What are the impacts to the business? Benefits?", "businessImpact"],
  ["Business Impact / Benefits", "businessImpact"],
  ["Why is this a good candidate for RPA?", "rpaCandidateReason"],
  ["Automation Candidate Reason", "rpaCandidateReason"],
  ["Process SME Name", "processSme"],
  ["Process SME", "processSme"],
  ["Process/Business Owner Name", "businessOwner"],
  ["Process / Business Owner", "businessOwner"],
  ["Current State of Process", "currentState"],
  ["Current Process State", "currentState"],
  ["Is there a SOP available including a process flow?", "sopAvailable"],
  ["SOP / Process Flow Available", "sopAvailable"],
  ["Who performs this process?", "whoPerforms"],
  ["Process Performed By / Role", "whoPerforms"],
  ["Does the process include hand-offs between differe", "handoffs"],
  ["Does the process include hand-offs between different teams?", "handoffs"],
  ["Team Handoffs", "handoffs"],
  ["Is there a Service Level Agreement SLA in place", "slaInPlace"],
  ["SLA In Place", "slaInPlace"],
  ["What is the primary application used in this proce", "primaryApplication"],
  ["What is the primary application used in this process?", "primaryApplication"],
  ["Primary Application", "primaryApplication"],
  ["What is the role/user type required in the applica", "appRole"],
  ["Application Role Required", "appRole"],
  ["What other applications are used?", "otherApplications"],
  ["Other Applications", "otherApplications"],
  ["Process Trigger", "processTrigger"],
  ["How often is this process is performed?", "frequency"],
  ["Process Frequency", "frequency"],
  ["What is the transaction volume per month?", "monthlyVolume"],
  ["Monthly Transaction Volume", "monthlyVolume"],
  ["When should the process start and finish?", "startFinishWindow"],
  ["Process Timing Requirements", "startFinishWindow"],
  ["How consistent is the transaction volume?", "volumeConsistency"],
  ["Transaction Volume Consistency", "volumeConsistency"],
  ["How long does it take to perform one transaction?", "transactionDuration"],
  ["Average Transaction Time", "transactionDuration"],
  ["Are there any known risks associated to the proces", "knownRisks"],
  ["Known Process Risks", "knownRisks"],
  ["Are there any known business exceptions or to the", "knownExceptions"],
  ["Known Business Exceptions", "knownExceptions"],
  ["What % of the process", "percentAutomatable"],
  ["Automatable Percentage", "percentAutomatable"],
  ["Net benefits in 12 months from deployment date.", "netBenefits12"],
  ["Net Benefit 12 Months", "netBenefits12"],
  ["Net benefits in 24 months from deployment date.", "netBenefits24"],
  ["Net Benefit 24 Months", "netBenefits24"],
  ["Automation Cost", "automationCost"],
  ["Hours Saved", "hoursSaved"],
  ["Dollars Saved", "dollarsSaved"],
  ["Gross Benefits 1YR", "grossBenefits1yr"],
  ["Gross Annual Benefit", "grossBenefits1yr"],
  ["FTE equivalent that currently works on the process", "fteEquivalent"],
  ["Current FTE Equivalent", "fteEquivalent"],
  ["Hourly Rate $/hr", "hourlyRate"],
  ["Hourly Rate", "hourlyRate"],
  ["Business Analyst", "businessAnalyst"],
  ["Business Case sharepoint link", "businessCaseLink"],
  ["Business Case SharePoint Reference", "businessCaseLink"],
  ["Draft Business Case", "draftBusinessCase"],
  ["Attached Draft Business Case", "draftBusinessCase"],
  ["Validation Check", "validationCheck"],
  ["Business Case Approval Business Sponsor", "sponsorApproval"],
  ["Business Sponsor Approval", "sponsorApproval"],
  ["Approval", "approval"],
  ["Online Approval", "onlineApproval"],
  ["Move to Project", "moveToProject"],
  ["Expense Type", "expenseType"],
  ["PAS#", "pasNumber"],
  ["PAS Number", "pasNumber"],
  ["PAS Status", "pasStatus"],
  ["BU to be Charged", "buCharged"],
  ["BU To be Charged", "buCharged"],
  ["Business Unit to Charge", "buCharged"],
  ["Demand #", "demandNumber"],
  ["Demand Number", "demandNumber"],
  ["SOW Request", "sowRequest"],
  ["Availability", "availability"],
  ["Resource Availability", "availability"],
  ["Estimated Development hours", "estDevHours"],
  ["Estimated Development Hours", "estDevHours"],
  ["Estimated PMO Deployment, testing", "estPmoHours"],
  ["Estimated PMO / Deployment / Testing Hours", "estPmoHours"],
  ["Opportunity Status", "opportunityStatus"],
  ["Project Status", "projectStatus"],
  ["Project status comments", "projectStatusComments"],
  ["Project Status Comments", "projectStatusComments"],
  ["Latest Comment", "latestComment"],
  ["Latest Project Comment", "latestComment"],
  ["Production Date", "productionDate"],
  ["Cost Charged back to Business", "costChargedBack"],
  ["Cost Charged Back to Business", "costChargedBack"],
  ["Opportunity comments", "opportunityComments"],
  ["Opportunity Comments", "opportunityComments"],
  ["Category", "lifecycleCategory"],
  ["Lifecycle Category", "lifecycleCategory"],
  ["Year", "year"],
  ["Fiscal Year", "year"],
  ["FY", "year"],
  ["Request Type", "requestType"],
  ["Technology", "technology"],
  ["Modified By", "legacyModifiedBy"],
  ["Modified", "legacyModifiedDate"],
  ["Modified Date", "legacyModifiedDate"],
  ["Legacy Automation Code", "legacyAutomationCode"],
  ["Automation ID", "__automationId__"],
];

export const ALIAS_MAP: Record<string, string> = Object.fromEntries(
  RAW_ALIASES.map(([header, key]) => [normHeader(header), key]),
);

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

export type ProfileId = "opportunity" | "project" | "unified";

export const UNIFIED_COLUMNS: string[] = [
  "Automation ID",
  "Legacy Automation Code",
  ...FIELDS.map((f) => f.label),
];

export const PROFILES: Record<ProfileId, { id: ProfileId; name: string; columns: string[]; help: string }> = {
  opportunity: {
    id: "opportunity",
    name: "Legacy Opportunity Initial Assessment",
    columns: OPPORTUNITY_LEGACY_COLUMNS,
    help: "Use when importing historical rows from the existing RPA Opportunity Initial Assessment tracker.",
  },
  project: {
    id: "project",
    name: "Legacy Project Tracking",
    columns: PROJECT_LEGACY_COLUMNS,
    help: "Use when importing historical rows from the existing RPA Project Tracking tracker.",
  },
  unified: {
    id: "unified",
    name: "Unified Portfolio Import Template",
    columns: UNIFIED_COLUMNS,
    help: "Use for new bulk uploads created specifically for the Automation CoE Portfolio Tracker.",
  },
};

export type Detection = {
  profile: ProfileId | null;
  matched: number;
  expected: number;
  confident: boolean;
  candidates: { id: ProfileId; matched: number; expected: number }[];
};

export function detectProfile(headers: string[]): Detection {
  const set = new Set(headers.map(normHeader));
  const candidates = (Object.keys(PROFILES) as ProfileId[]).map((id) => {
    const cols = PROFILES[id].columns;
    const matched = cols.filter((c) => set.has(normHeader(c))).length;
    return { id, matched, expected: cols.length };
  });
  // Project profile is a superset of opportunity; prefer the highest ratio, then the larger template.
  const ranked = [...candidates].sort(
    (a, b) => b.matched / b.expected - a.matched / a.expected || b.matched - a.matched,
  );
  const best = ranked[0]!;
  const confident = best.matched / best.expected >= 0.7 && best.matched >= 10;
  return {
    profile: confident ? best.id : null,
    matched: best.matched,
    expected: best.expected,
    confident,
    candidates,
  };
}

/* ------------------------------------------------------------------ */
/* Value coercion                                                      */
/* ------------------------------------------------------------------ */

export const fieldByKey = (key: string): FieldDef | undefined => FIELDS.find((f) => f.key === key);

/** Excel serial (1900 date system) -> ISO date string. */
export function excelSerialToIso(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString();
}

export function parseDateValue(raw: unknown): { iso?: string; warning?: string } {
  if (raw === null || raw === undefined || String(raw).trim() === "") return {};
  if (raw instanceof Date && !isNaN(raw.getTime())) return { iso: raw.toISOString() };
  const s = String(raw).trim();
  const num = Number(s.replace(/,/g, ""));
  if (Number.isFinite(num) && num > 20000 && num < 80000) return { iso: excelSerialToIso(num) };
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return { iso: new Date(parsed).toISOString() };
  return { warning: `Could not read "${s}" as a date — value kept as text` };
}

export function parseNumberValue(raw: unknown): { value?: number; warning?: string } {
  if (raw === null || raw === undefined || String(raw).trim() === "") return {}; // blank ≠ zero
  if (typeof raw === "number") return Number.isFinite(raw) ? { value: raw } : {};
  const cleaned = String(raw).replace(/[$,\s]/g, "").replace(/[()]/g, (m) => (m === "(" ? "-" : ""));
  const n = Number(cleaned);
  if (Number.isFinite(n)) return { value: n };
  return { warning: `Could not read "${String(raw)}" as a number — value skipped` };
}

/** Normalize 0.95 / 0.1 / "30%" / "30%%" into a 0-100 percentage. */
export function parsePercentValue(raw: unknown): { value?: number; warning?: string; original?: string } {
  if (raw === null || raw === undefined || String(raw).trim() === "") return {};
  const original = String(raw).trim();
  const hadPercent = original.includes("%");
  const doubled = /%\s*%/.test(original);
  const cleaned = original.replace(/%/g, "").replace(/[,\s]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { warning: `Percentage "${original}" could not be read`, original };
  if (!hadPercent && n > 0 && n <= 1) {
    return { value: Math.round(n * 1000) / 10, warning: `Source value "${original}" read as a fraction`, original };
  }
  if (doubled) return { value: n, warning: `Source value "${original}" normalized to ${n}%`, original };
  if (n > 100) return { value: n, warning: `Percentage "${original}" is greater than 100%`, original };
  return { value: n, original };
}

const YES = new Set(["yes", "y", "true", "1", "complete", "completed", "approved", "done"]);
const NO = new Set(["no", "n", "false", "0", "not required", "na", "n/a"]);

export function parseYesNo(raw: string): { value: string; warning?: string } {
  const k = raw.trim().toLowerCase();
  if (YES.has(k)) return { value: "Yes" };
  if (NO.has(k)) return { value: "No" };
  return { value: raw.trim(), warning: `"${raw.trim()}" is not a Yes/No value — kept as written` };
}

export const isUrl = (s: string) => /^(https?:\/\/|www\.|\\\\|[a-z]:\\)/i.test(s.trim());

/** Multi-line cell -> array of values. */
export const splitMultiValue = (s: string) =>
  s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Detect a leading legacy automation code, e.g. "061B-Machine and Board Speeds". */
export function detectLegacyCode(name: string): string | null {
  const m = /^\s*(\d{2,4}[A-Za-z]?)\s*[-–—:]?\s+?/.exec(name) ?? /^\s*(\d{2,4}[A-Za-z]?)\s*[-–—]/.exec(name);
  return m ? m[1]! : null;
}

export function stripLegacyCode(name: string): string {
  return name.replace(/^\s*\d{2,4}[A-Za-z]?\s*[-–—:]?\s*/, "").trim() || name.trim();
}

/** Match a source value against configured reference values (exact, case-insensitive, alias). */
export function matchReferenceValue(raw: string, options: string[]): { value: string; kind: "exact" | "insensitive" | "unresolved" } {
  const exact = options.find((o) => o === raw.trim());
  if (exact) return { value: exact, kind: "exact" };
  const ci = options.find((o) => normHeader(o) === normHeader(raw));
  if (ci) return { value: ci, kind: "insensitive" };
  return { value: raw.trim(), kind: "unresolved" };
}

/* ------------------------------------------------------------------ */
/* Row building                                                        */
/* ------------------------------------------------------------------ */

export type MappingStatus = "exact" | "alias" | "suggested" | "manual" | "ignored" | "unmapped";

export type ColumnMapping = {
  index: number;
  header: string;
  fieldKey: string | null;
  status: MappingStatus;
};

export const DO_NOT_IMPORT = "__ignore__";
export const LEGACY_EXTRA_PREFIX = "legacyExtra:";

export function autoMapColumns(headers: string[]): ColumnMapping[] {
  return headers.map((header, index) => {
    const n = normHeader(header);
    if (!n) return { index, header, fieldKey: null, status: "unmapped" as const };
    const exactField = FIELDS.find((f) => normHeader(f.label) === n || normHeader(f.key) === n);
    if (exactField) return { index, header, fieldKey: exactField.key, status: "exact" as const };
    const alias = ALIAS_MAP[n];
    if (alias) return { index, header, fieldKey: alias, status: "alias" as const };
    const fuzzy = FIELDS.find((f) => {
      const fl = normHeader(f.label);
      return fl.length > 6 && n.length > 6 && (fl.startsWith(n) || n.startsWith(fl));
    });
    if (fuzzy) return { index, header, fieldKey: fuzzy.key, status: "suggested" as const };
    return { index, header, fieldKey: null, status: "unmapped" as const };
  });
}

export type RowWarning = { field: string; message: string };

export type PreparedRow = {
  sourceRow: number;
  name: string;
  data: Record<string, FieldValue>;
  stage: Stage;
  warnings: RowWarning[];
  errors: string[];
  detectedLegacyCode: string | null;
  duplicate: { kind: "NEW" | "POSSIBLE DUPLICATE" | "EXACT DUPLICATE"; existingId?: string };
};

export type PrepareOptions = {
  mappings: ColumnMapping[];
  rows: unknown[][];
  /** value overrides keyed `${fieldKey}::${sourceValue}` */
  valueMap?: Record<string, string>;
  options: Record<string, string[]>;
  existing: Pick<Automation, "id" | "data">[];
  fileName: string;
  sheetName: string;
  importedBy: string;
  defaultStage: Stage;
  legacyCodeMode?: "preserve" | "extract" | "ignore";
  headerRowOffset?: number;
};

const STAGE_FROM_CATEGORY: Record<string, Stage> = {
  discovery: "idea",
  idea: "idea",
  "initial assessment": "idea",
  pipeline: "project",
  project: "project",
  "in progress": "project",
  deployed: "production",
  production: "production",
  live: "production",
  archived: "archived",
  cancelled: "archived",
};

export function detectStage(data: Record<string, FieldValue>, fallback: Stage): Stage {
  const cat = String(data['lifecycleCategory'] ?? "").trim().toLowerCase();
  if (cat && STAGE_FROM_CATEGORY[cat]) return STAGE_FROM_CATEGORY[cat]!;
  if (String(data['productionDate'] ?? "").trim()) return "production";
  const ps = String(data['projectStatus'] ?? "").trim().toLowerCase();
  if (ps === "production" || ps === "hypercare") return "production";
  if (ps) return "project";
  const move = String(data['moveToProject'] ?? "").trim().toLowerCase();
  if (YES.has(move)) return "project";
  const os = String(data['opportunityStatus'] ?? "").trim().toLowerCase();
  if (os === "on hold" || os === "hold") return fallback;
  return fallback;
}

export function prepareRows(opts: PrepareOptions): PreparedRow[] {
  const {
    mappings, rows, valueMap = {}, options, existing, fileName, sheetName,
    importedBy, defaultStage, legacyCodeMode = "preserve", headerRowOffset = 2,
  } = opts;
  const importDate = new Date().toISOString();

  return rows.map((raw, i) => {
    const sourceRow = i + headerRowOffset;
    const data: Record<string, FieldValue> = {};
    const warnings: RowWarning[] = [];
    const errors: string[] = [];

    mappings.forEach((m) => {
      const cell = raw[m.index];
      const text = cell instanceof Date ? cell.toISOString() : String(cell ?? "").trim();
      if (!m.fieldKey || m.fieldKey === DO_NOT_IMPORT) {
        if (text && !m.fieldKey) data[`${LEGACY_EXTRA_PREFIX}${m.header || `Column ${m.index + 1}`}`] = text;
        return;
      }
      if (!text) return;

      const key = m.fieldKey;
      const field = fieldByKey(key);
      const override = valueMap[`${key}::${text}`];
      const base = override && override !== "__keep__" ? override : text;

      if (key === "percentAutomatable") {
        const p = parsePercentValue(base);
        if (p.warning) warnings.push({ field: m.header, message: p.warning });
        if (p.value !== undefined) data[key] = p.value;
        if (p.original && p.original !== String(p.value)) data[`${LEGACY_EXTRA_PREFIX}${m.header} (source)`] = p.original;
        return;
      }

      if (field?.type === "number") {
        const n = parseNumberValue(base);
        if (n.warning) warnings.push({ field: m.header, message: n.warning });
        if (n.value !== undefined) data[key] = n.value;
        return;
      }

      if (field?.type === "date" || key === "legacyModifiedDate") {
        const d = parseDateValue(cell instanceof Date ? cell : base);
        if (d.iso) data[key] = d.iso.slice(0, 10);
        else {
          data[key] = base;
          if (d.warning) warnings.push({ field: m.header, message: d.warning });
        }
        return;
      }

      if (field?.type === "yesno") {
        const y = parseYesNo(base);
        if (y.warning) warnings.push({ field: m.header, message: y.warning });
        data[key] = y.value;
        return;
      }

      if (field?.type === "url") {
        if (isUrl(base)) data[key] = base;
        else {
          data['businessCaseStatus'] = base;
          warnings.push({ field: m.header, message: `Business case value "${base}" is not a link — kept as status` });
        }
        return;
      }

      if (field?.type === "select") {
        const list = field.optionKey ? options[field.optionKey] ?? [] : field.options ?? [];
        const lines = splitMultiValue(base);
        const primary = lines[0] ?? base;
        const match = list.length ? matchReferenceValue(primary, list) : { value: primary, kind: "exact" as const };
        if (list.length && match.kind === "unresolved") {
          warnings.push({ field: m.header, message: `"${primary}" is not a configured value for ${field.label}` });
        } else if (match.kind === "insensitive" && match.value !== primary) {
          warnings.push({ field: m.header, message: `Normalized from "${primary}" to "${match.value}"` });
        }
        data[key] = match.value;
        if (lines.length > 1) {
          data[`${LEGACY_EXTRA_PREFIX}${m.header} (additional)`] = lines.slice(1).join("; ");
          warnings.push({ field: m.header, message: `Additional values preserved: ${lines.slice(1).join("; ")}` });
        }
        return;
      }

      data[key] = base;
    });

    const name = String(data['opportunityName'] ?? "").trim();
    if (!name) errors.push("Missing Opportunity Name");

    const detectedLegacyCode = name ? detectLegacyCode(name) : null;
    if (detectedLegacyCode && legacyCodeMode !== "ignore" && !data['legacyAutomationCode']) {
      data['legacyAutomationCode'] = detectedLegacyCode;
      if (legacyCodeMode === "extract") data['opportunityName'] = stripLegacyCode(name);
    }

    const stage = detectStage(data, defaultStage);

    data['migrationSource'] = fileName;
    data[`${LEGACY_EXTRA_PREFIX}Source Sheet`] = sheetName;
    data[`${LEGACY_EXTRA_PREFIX}Source Row`] = sourceRow;
    data[`${LEGACY_EXTRA_PREFIX}Import Date`] = importDate;
    data[`${LEGACY_EXTRA_PREFIX}Imported By`] = importedBy;

    // Duplicate detection
    let duplicate: PreparedRow["duplicate"] = { kind: "NEW" };
    const code = String(data['legacyAutomationCode'] ?? "").trim().toLowerCase();
    const finalName = String(data['opportunityName'] ?? "").trim().toLowerCase();
    const division = String(data['division'] ?? "").trim().toLowerCase();
    const byCode = code
      ? existing.find((e) => String(e.data['legacyAutomationCode'] ?? "").trim().toLowerCase() === code)
      : undefined;
    const byName = existing.find((e) => String(e.data['opportunityName'] ?? "").trim().toLowerCase() === finalName);
    const byNameDiv = existing.find(
      (e) =>
        String(e.data['opportunityName'] ?? "").trim().toLowerCase() === finalName &&
        String(e.data['division'] ?? "").trim().toLowerCase() === division,
    );
    if (byCode) duplicate = { kind: "EXACT DUPLICATE", existingId: byCode.id };
    else if (byNameDiv) duplicate = { kind: "EXACT DUPLICATE", existingId: byNameDiv.id };
    else if (byName) duplicate = { kind: "POSSIBLE DUPLICATE", existingId: byName.id };

    return { sourceRow, name: finalName ? String(data['opportunityName']) : "", data, stage, warnings, errors, detectedLegacyCode, duplicate };
  });
}

/* ------------------------------------------------------------------ */
/* Summaries                                                           */
/* ------------------------------------------------------------------ */

export function columnSummary(mappings: ColumnMapping[]) {
  return {
    found: mappings.length,
    mapped: mappings.filter((m) => m.fieldKey && m.fieldKey !== DO_NOT_IMPORT).length,
    unmapped: mappings.filter((m) => !m.fieldKey).length,
    ignored: mappings.filter((m) => m.fieldKey === DO_NOT_IMPORT).length,
  };
}

export function rowSummary(rows: PreparedRow[]) {
  return {
    rows: rows.length,
    ready: rows.filter((r) => !r.errors.length).length,
    warnings: rows.filter((r) => r.errors.length === 0 && r.warnings.length > 0).length,
    duplicates: rows.filter((r) => r.duplicate.kind !== "NEW").length,
    errors: rows.filter((r) => r.errors.length > 0).length,
  };
}
