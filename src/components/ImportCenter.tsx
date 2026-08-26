import { useMemo, useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, HelpCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData, actions } from "@/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELDS } from "@/lib/fields";
import { downloadCsv } from "@/lib/export";
import { readSpreadsheet, downloadTemplateWorkbook, type SheetData } from "@/lib/spreadsheet";
import {
  PROFILES,
  detectProfile,
  autoMapColumns,
  columnSummary,
  rowSummary,
  prepareRows,
  matchReferenceValue,
  splitMultiValue,
  DO_NOT_IMPORT,
  LEGACY_EXTRA_PREFIX,
  fieldByKey,
  type ColumnMapping,
  type Detection,
  type ProfileId,
  type PreparedRow,
} from "@/lib/legacy-import";
import { cn } from "@/lib/utils";
import type { Stage } from "@/domain/models";

type Step = "columns" | "values" | "preview" | "results";

const STATUS_LABEL: Record<string, string> = {
  exact: "Exact Match",
  alias: "Known Legacy Alias",
  suggested: "Suggested Match",
  manual: "Manual Mapping",
  ignored: "Do Not Import",
  unmapped: "Unmapped",
};

type ResultRow = {
  sourceRow: number;
  name: string;
  result: string;
  automationId: string;
  warnings: string;
  errors: string;
  duplicate: string;
};

export function ImportCenter({ user }: { user: string }) {
  const data = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [profile, setProfile] = useState<ProfileId | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [valueMap, setValueMap] = useState<Record<string, string>>({});
  const [dupeAction, setDupeAction] = useState<Record<number, "skip" | "update" | "new">>({});
  const [legacyCodeMode, setLegacyCodeMode] = useState<"preserve" | "extract" | "ignore">("preserve");
  const [stage, setStage] = useState<Stage>("idea");
  const [step, setStep] = useState<Step>("columns");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const cols = useMemo(() => (mappings.length ? columnSummary(mappings) : null), [mappings]);

  const prepared: PreparedRow[] = useMemo(() => {
    if (!sheet) return [];
    return prepareRows({
      mappings,
      rows: sheet.rows,
      valueMap,
      options: data.settings.options,
      existing: data.automations,
      fileName: sheet.fileName,
      sheetName: sheet.sheetName,
      importedBy: user,
      defaultStage: stage,
      legacyCodeMode,
    });
  }, [sheet, mappings, valueMap, data.settings.options, data.automations, user, stage, legacyCodeMode]);

  const summary = useMemo(() => rowSummary(prepared), [prepared]);

  /** Unresolved source values in list-driven columns. */
  const valueGaps = useMemo(() => {
    if (!sheet) return [];
    const out: { fieldKey: string; label: string; options: string[]; sourceValue: string; count: number; suggestion: string | null }[] = [];
    mappings.forEach((m) => {
      if (!m.fieldKey || m.fieldKey === DO_NOT_IMPORT) return;
      const field = fieldByKey(m.fieldKey);
      if (!field || field.type !== "select") return;
      const options = field.optionKey ? data.settings.options[field.optionKey] ?? [] : field.options ?? [];
      if (!options.length) return;
      const counts = new Map<string, number>();
      sheet.rows.forEach((r) => {
        const raw = String(r[m.index] ?? "").trim();
        if (!raw) return;
        const primary = splitMultiValue(raw)[0] ?? raw;
        const match = matchReferenceValue(primary, options);
        if (match.kind === "exact") return;
        counts.set(raw, (counts.get(raw) ?? 0) + 1);
      });
      counts.forEach((count, sourceValue) => {
        const primary = splitMultiValue(sourceValue)[0] ?? sourceValue;
        const match = matchReferenceValue(primary, options);
        out.push({
          fieldKey: m.fieldKey!,
          label: field.label,
          options,
          sourceValue,
          count,
          suggestion: match.kind === "insensitive" ? match.value : null,
        });
      });
    });
    return out;
  }, [mappings, sheet, data.settings.options]);

  const reset = () => {
    setSheet(null);
    setDetection(null);
    setProfile(null);
    setMappings([]);
    setValueMap({});
    setDupeAction({});
    setStep("columns");
    setExpanded(null);
  };

  const loadFile = async (file: File) => {
    const parsed = await readSpreadsheet(file);
    if (!parsed.headers.length || !parsed.rows.length) {
      toast.error("That file has no data rows");
      return;
    }
    const det = detectProfile(parsed.headers);
    setSheet(parsed);
    setDetection(det);
    setProfile(det.profile);
    setMappings(autoMapColumns(parsed.headers));
    setValueMap({});
    setDupeAction({});
    setResults(null);
    setStep("columns");
    toast.success(`${parsed.rows.length} row(s) loaded from ${parsed.sheetName}`);
  };

  const setColumn = (index: number, value: string) =>
    setMappings((prev) =>
      prev.map((m) =>
        m.index === index
          ? {
              ...m,
              fieldKey: value === "__unmapped__" ? null : value,
              status: value === "__unmapped__" ? "unmapped" : value === DO_NOT_IMPORT ? "ignored" : "manual",
            }
          : m,
      ),
    );

  const runImport = () => {
    if (!sheet) return;
    const unresolved = mappings.filter((m) => !m.fieldKey).length;
    if (unresolved) {
      toast.error(`${unresolved} source column(s) still unmapped — map them or mark them Do Not Import`);
      setStep("columns");
      return;
    }
    actions.createBackup(user, "Safety backup before import");

    const created: { stage: Stage; data: Record<string, unknown> }[] = [];
    const out: ResultRow[] = [];
    let updated = 0;
    let skipped = 0;

    prepared.forEach((row) => {
      const warn = row.warnings.map((w) => `${w.field}: ${w.message}`).join(" · ");
      if (row.errors.length) {
        out.push({ sourceRow: row.sourceRow, name: row.name, result: "Failed", automationId: "", warnings: warn, errors: row.errors.join(" · "), duplicate: row.duplicate.kind });
        return;
      }
      const decision = dupeAction[row.sourceRow] ?? (row.duplicate.kind === "NEW" ? "new" : "skip");
      if (row.duplicate.kind !== "NEW" && decision === "skip") {
        skipped++;
        out.push({ sourceRow: row.sourceRow, name: row.name, result: "Skipped (duplicate)", automationId: row.duplicate.existingId ?? "", warnings: warn, errors: "", duplicate: row.duplicate.kind });
        return;
      }
      if (row.duplicate.kind !== "NEW" && decision === "update" && row.duplicate.existingId) {
        actions.updateImportedRecord(row.duplicate.existingId, row.data, user, sheet.fileName);
        updated++;
        out.push({ sourceRow: row.sourceRow, name: row.name, result: "Existing updated", automationId: row.duplicate.existingId, warnings: warn, errors: "", duplicate: row.duplicate.kind });
        return;
      }
      created.push({ stage: row.stage, data: row.data });
      out.push({ sourceRow: row.sourceRow, name: row.name, result: "New automation", automationId: "", warnings: warn, errors: "", duplicate: row.duplicate.kind });
    });

    const count = created.length ? actions.importRecords(created, user, sheet.fileName) : 0;
    actions.logAudit(user, `Imported ${sheet.fileName}`, `${count} new · ${updated} updated · ${skipped} skipped`);
    setResults(out);
    setStep("results");
    toast.success(`${count} new, ${updated} updated, ${skipped} skipped`);
  };

  const detected = detection && profile ? PROFILES[profile] : null;

  return (
    <section className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileSpreadsheet className="h-4 w-4 text-primary" /> Import portfolio data
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload the existing RPA Opportunity Initial Assessment or RPA Project Tracking workbook directly — the columns are
            recognised automatically. A safety backup is taken before any import.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowHelp((v) => !v)}>
          <HelpCircle className="h-4 w-4" /> Which template should I use?
        </Button>
      </div>

      {showHelp ? (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
          {(Object.keys(PROFILES) as ProfileId[]).map((id) => (
            <p key={id}>
              <span className="font-medium">{PROFILES[id].name}</span> — {PROFILES[id].help} ({PROFILES[id].columns.length} columns)
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <Label>Default stage for rows without a category</Label>
          <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
            <SelectTrigger className="mt-1 h-9 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">Idea (Discovery)</SelectItem>
              <SelectItem value="project">Project (Pipeline)</SelectItem>
              <SelectItem value="production">Production (Deployed)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Choose Excel / CSV file
        </Button>
        <div>
          <Label>Download template</Label>
          <Select
            value=""
            onValueChange={(v) => {
              const p = PROFILES[v as ProfileId];
              downloadTemplateWorkbook(
                `${p.name.replace(/\s+/g, "-").toLowerCase()}-template.xlsx`,
                v === "project" ? "RPA Project Tracking" : v === "opportunity" ? "RPA Opportunity Initial Assessment" : "Unified Portfolio",
                p.columns,
              );
              toast.success(`${p.name} downloaded`);
            }}
          >
            <SelectTrigger className="mt-1 h-9 w-72">
              <span className="flex items-center gap-2 text-sm"><Download className="h-4 w-4" /> Choose a template…</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opportunity">Opportunity Initial Assessment Legacy Template</SelectItem>
              <SelectItem value="project">Project Tracking Legacy Template</SelectItem>
              <SelectItem value="unified">Unified Portfolio Template</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.txt"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              try {
                await loadFile(file);
              } catch {
                toast.error("That file could not be read as a spreadsheet");
              }
            }
            e.target.value = "";
          }}
        />
      </div>

      {sheet && detection ? (
        <div className="mt-4 space-y-3">
          {/* Detection banner */}
          <div className={cn("rounded-md border p-3 text-xs", detection.confident ? "border-primary/30 bg-primary/5" : "border-warning/40 bg-warning/10")}>
            <p className="font-medium">Detected format</p>
            {detection.confident && detected ? (
              <p className="mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                {detected.name} — {detection.matched} of {detection.expected} expected legacy columns recognised
              </p>
            ) : (
              <div className="mt-1 space-y-2">
                <p className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Format could not be identified confidently.</p>
                <div className="flex flex-wrap gap-2">
                  {(["opportunity", "project", "unified"] as ProfileId[]).map((id) => (
                    <Button key={id} size="sm" variant={profile === id ? "default" : "outline"} onClick={() => setProfile(id)}>
                      {id === "opportunity" ? "Opportunity Assessment" : id === "project" ? "Project Tracking" : "Custom Mapping"}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-2 text-muted-foreground">
              Workbook: {sheet.fileName} · Sheet: {sheet.sheetName} · Rows found: {sheet.rows.length}
            </p>
          </div>

          {/* Column tally */}
          {cols ? (
            <p className="text-xs text-muted-foreground">
              Source Columns Found: {cols.found} · Mapped: {cols.mapped} · Unmapped: {cols.unmapped} · Ignored by User: {cols.ignored}
            </p>
          ) : null}

          {/* Steps */}
          <div className="flex flex-wrap gap-2">
            {([["columns", "1. Column mapping"], ["values", "2. Value mapping"], ["preview", "3. Preview"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStep(key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  step === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                {key === "values" && valueGaps.length ? ` (${valueGaps.length})` : ""}
              </button>
            ))}
          </div>

          {step === "columns" ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setMappings(autoMapColumns(sheet.headers))}>
                  Reset to suggested mapping
                </Button>
                <span className="text-xs text-muted-foreground">Legacy automation code in Opportunity Name:</span>
                <Select value={legacyCodeMode} onValueChange={(v) => setLegacyCodeMode(v as typeof legacyCodeMode)}>
                  <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preserve">Keep code + preserve full name</SelectItem>
                    <SelectItem value="extract">Extract code from name</SelectItem>
                    <SelectItem value="ignore">Ignore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-96 overflow-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Source Excel column</th>
                      <th className="px-3 py-2 font-medium">Sample value</th>
                      <th className="px-3 py-2 font-medium">Application field</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.index} className={cn("border-t border-border/70", !m.fieldKey && "bg-warning/10")}>
                        <td className="max-w-64 px-3 py-2 font-medium">{m.header || `Column ${m.index + 1}`}</td>
                        <td className="max-w-48 truncate px-3 py-2 text-muted-foreground">{String(sheet.rows[0]?.[m.index] ?? "")}</td>
                        <td className="px-3 py-2">
                          <Select value={m.fieldKey ?? "__unmapped__"} onValueChange={(v) => setColumn(m.index, v)}>
                            <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-72">
                              <SelectItem value="__unmapped__">— Select field —</SelectItem>
                              <SelectItem value={DO_NOT_IMPORT}>Do Not Import</SelectItem>
                              {FIELDS.map((f) => (
                                <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{STATUS_LABEL[m.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Any column left unmapped is preserved as Additional Imported Data on the record until it is reviewed, but you must
                resolve or explicitly ignore it before importing.
              </p>
            </>
          ) : null}

          {step === "values" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Translate values used in your source file into the values this app uses (for example “NA” → “North America”).
                Anything left unmapped is imported exactly as written.
              </p>
              {valueGaps.length ? (
                <div className="max-h-80 overflow-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Field</th>
                        <th className="px-3 py-2 font-medium">Source value</th>
                        <th className="px-3 py-2 font-medium">Rows</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Application value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valueGaps.map((g) => {
                        const mapKey = `${g.fieldKey}::${g.sourceValue}`;
                        const chosen = valueMap[mapKey];
                        const status = chosen && chosen !== "__keep__" ? "Resolved" : g.suggestion ? "Suggested" : "Needs review";
                        return (
                          <tr key={mapKey} className="border-t border-border/70">
                            <td className="px-3 py-2">{g.label}</td>
                            <td className="px-3 py-2 font-medium">{g.sourceValue}</td>
                            <td className="px-3 py-2 tabular-nums text-muted-foreground">{g.count}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{status}</td>
                            <td className="px-3 py-2">
                              <Select value={chosen ?? (g.suggestion ?? "__keep__")} onValueChange={(v) => setValueMap((m) => ({ ...m, [mapKey]: v }))}>
                                <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-72">
                                  <SelectItem value="__keep__">— Keep “{g.sourceValue}” —</SelectItem>
                                  {g.options.map((o) => (
                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Every value in your mapped list columns already matches an app value — nothing to translate.
                </p>
              )}
            </div>
          ) : null}

          {step === "preview" ? (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-5">
                {[
                  ["Rows found", summary.rows],
                  ["Rows ready", summary.ready],
                  ["Rows with warnings", summary.warnings],
                  ["Possible duplicates", summary.duplicates],
                  ["Errors", summary.errors],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-md border border-border p-2">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              <div className="max-h-96 overflow-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Opportunity</th>
                      <th className="px-3 py-2 font-medium">Stage</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Duplicate handling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepared.map((row) => (
                      <>
                        <tr key={row.sourceRow} className="border-t border-border/70">
                          <td className="px-3 py-2 tabular-nums">{row.sourceRow}</td>
                          <td className="px-3 py-2">
                            <button className="text-left font-medium hover:underline" onClick={() => setExpanded(expanded === row.sourceRow ? null : row.sourceRow)}>
                              {row.name || <span className="text-destructive">(no name)</span>}
                            </button>
                          </td>
                          <td className="px-3 py-2 capitalize">{row.stage}</td>
                          <td className="px-3 py-2 text-xs">
                            {row.errors.length ? (
                              <span className="text-destructive">{row.errors.length} error(s)</span>
                            ) : row.warnings.length ? (
                              <span className="text-warning-foreground">{row.warnings.length} warning(s)</span>
                            ) : (
                              <span className="text-muted-foreground">Ready</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {row.duplicate.kind === "NEW" ? (
                              <span className="text-xs text-muted-foreground">NEW</span>
                            ) : (
                              <Select
                                value={dupeAction[row.sourceRow] ?? "skip"}
                                onValueChange={(v) => setDupeAction((m) => ({ ...m, [row.sourceRow]: v as "skip" | "update" | "new" }))}
                              >
                                <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip">Skip ({row.duplicate.kind})</SelectItem>
                                  <SelectItem value="update">Update existing</SelectItem>
                                  <SelectItem value="new">Import as new</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                        </tr>
                        {expanded === row.sourceRow ? (
                          <tr key={`${row.sourceRow}-detail`} className="border-t border-border/40 bg-muted/30">
                            <td colSpan={5} className="px-3 py-2 text-xs">
                              {row.detectedLegacyCode ? <p>Detected legacy code: <span className="font-medium">{row.detectedLegacyCode}</span> ({legacyCodeMode})</p> : null}
                              {row.errors.map((e) => (
                                <p key={e} className="text-destructive">• {e}</p>
                              ))}
                              {row.warnings.map((w, i) => (
                                <p key={`${w.field}-${i}`} className="text-muted-foreground">• {w.field}: {w.message}</p>
                              ))}
                              <p className="mt-1 text-muted-foreground">
                                Imported from {sheet.fileName} · sheet {sheet.sheetName} · row {row.sourceRow} · by {user}
                              </p>
                              {Object.keys(row.data).filter((k) => k.startsWith(LEGACY_EXTRA_PREFIX)).length ? (
                                <p className="mt-1 text-muted-foreground">
                                  Additional imported data:{" "}
                                  {Object.keys(row.data)
                                    .filter((k) => k.startsWith(LEGACY_EXTRA_PREFIX))
                                    .map((k) => k.replace(LEGACY_EXTRA_PREFIX, ""))
                                    .join(", ")}
                                </p>
                              ) : null}
                            </td>
                          </tr>
                        ) : null}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === "results" && results ? (
            <div className="space-y-2">
              <div className="rounded-md border border-border p-3 text-xs">
                <p className="text-sm font-semibold">Import complete</p>
                <p className="mt-1 text-muted-foreground">Source: {sheet.fileName} · Rows processed: {results.length}</p>
                <p className="mt-1">
                  New automations: {results.filter((r) => r.result === "New automation").length} · Existing updated:{" "}
                  {results.filter((r) => r.result === "Existing updated").length} · Skipped:{" "}
                  {results.filter((r) => r.result.startsWith("Skipped")).length} · Warnings:{" "}
                  {results.filter((r) => r.warnings).length} · Failed: {results.filter((r) => r.result === "Failed").length}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    "import-results",
                    ["Source Row", "Opportunity Name", "Result", "Automation ID", "Warnings", "Errors", "Duplicate decision"],
                    results.map((r) => [r.sourceRow, r.name, r.result, r.automationId, r.warnings, r.errors, r.duplicate]),
                  )
                }
              >
                <Download className="h-4 w-4" /> Export import results
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {step === "columns" ? <Button onClick={() => setStep("values")}>Next: value mapping</Button> : null}
            {step === "values" ? (
              <>
                <Button variant="secondary" onClick={() => setStep("columns")}>Back to columns</Button>
                <Button onClick={() => setStep("preview")}>Next: preview</Button>
              </>
            ) : null}
            {step === "preview" ? (
              <>
                <Button variant="secondary" onClick={() => setStep("values")}>Back to values</Button>
                <Button onClick={runImport} disabled={!summary.ready}>Import {summary.ready} record(s)</Button>
              </>
            ) : null}
            <Button variant="ghost" onClick={reset}>{step === "results" ? "Done" : "Cancel"}</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
