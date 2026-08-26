import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Download, Upload, RotateCcw, X, Plus, Database, Save, HardDriveDownload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { UsersAdmin } from "@/components/UsersAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useAppData, actions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELDS } from "@/lib/fields";
import { downloadCsv } from "@/lib/export";
import { cn } from "@/lib/utils";
import type { Automation, FieldValue, Stage } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Automation CoE Portfolio" },
      {
        name: "description",
        content: "Manage workspace storage mode, Excel migration imports, backups and restore points, team members and dropdown option lists.",
      },
      { property: "og:title", content: "Settings | Automation CoE Portfolio" },
      { property: "og:description", content: "Workspace storage, Excel import center, backup and restore, and option list administration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const LIST_LABELS: Record<string, string> = {
  users: "Team Members",
  divisions: "Divisions",
  regions: "Regions",
  functionalAreas: "Functional Areas",
  technologies: "Technologies",
  requestTypes: "Request Types",
  expenseTypes: "Expense Types",
  opportunityStatuses: "Opportunity Statuses",
  projectStatuses: "Project Statuses",
  pasStatuses: "PAS Statuses",
  rpaReasons: "RPA Candidate Reasons",
  documentTypes: "Document Types",
};

/* ---------------- CSV parsing ---------------- */

function parseDelimited(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const delim = text.split("\n")[0]!.includes("\t") ? "\t" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function autoMap(headers: string[]) {
  const map: Record<number, string> = {};
  headers.forEach((h, i) => {
    const field = FIELDS.find((f) => norm(f.label) === norm(h) || norm(f.key) === norm(h));
    if (field) map[i] = field.key;
  });
  return map;
}

/* ---------------- Components ---------------- */

function OptionEditor({ listKey, values }: { listKey: string; values: string[] }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="card-surface p-4">
      <h3 className="text-sm font-semibold">{LIST_LABELS[listKey] ?? listKey}</h3>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs">
            {v}
            <button
              aria-label={`Remove ${v}`}
              onClick={() => actions.setOptionList(listKey, values.filter((x) => x !== v))}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = draft.trim();
          if (!v || values.includes(v)) return;
          actions.setOptionList(listKey, [...values, v]);
          setDraft("");
        }}
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add value…" className="h-8" />
        <Button type="submit" size="sm" variant="secondary">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}

function ImportCenter({ user }: { user: string }) {
  const data = useAppData();
  const importRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [stage, setStage] = useState<Stage>("idea");
  const [source, setSource] = useState("Legacy Excel Tracker");
  const [step, setStep] = useState<"columns" | "values">("columns");
  // "<fieldKey>::<sourceValue>" -> app value
  const [valueMap, setValueMap] = useState<Record<string, string>>({});

  const headers = rows?.[0] ?? [];
  const body = useMemo(() => rows?.slice(1) ?? [], [rows]);
  const mappedCount = Object.keys(mapping).length;

  /** Source values in list-driven columns that don't match an existing app option. */
  const valueGaps = useMemo(() => {
    const out: { fieldKey: string; label: string; options: string[]; sourceValue: string; count: number }[] = [];
    Object.entries(mapping).forEach(([idx, key]) => {
      const field = FIELDS.find((f) => f.key === key);
      if (!field || field.type !== "select") return;
      const options = field.optionKey ? data.settings.options[field.optionKey] ?? [] : field.options ?? [];
      if (!options.length) return;
      const counts = new Map<string, number>();
      body.forEach((r) => {
        const raw = (r[Number(idx)] ?? "").trim();
        if (!raw || options.some((o) => norm(o) === norm(raw))) return;
        counts.set(raw, (counts.get(raw) ?? 0) + 1);
      });
      counts.forEach((count, sourceValue) => out.push({ fieldKey: key, label: field.label, options, sourceValue, count }));
    });
    return out;
  }, [mapping, body, data.settings.options]);

  const nameIdx = Object.entries(mapping).find(([, k]) => k === "opportunityName")?.[0];
  const issues = body
    .map((r, i) => (nameIdx !== undefined && r[Number(nameIdx)]?.trim() ? null : `Row ${i + 2}: missing Opportunity Name`))
    .filter(Boolean) as string[];

  const runImport = () => {
    if (nameIdx === undefined) {
      toast.error("Map a column to Opportunity Name before importing");
      return;
    }
    const payload: Partial<Automation>[] = body
      .filter((r) => r[Number(nameIdx)]?.trim())
      .map((r) => {
        const record: Record<string, FieldValue> = {};
        Object.entries(mapping).forEach(([idx, key]) => {
          const raw = (r[Number(idx)] ?? "").trim();
          if (!raw) return;
          const field = FIELDS.find((f) => f.key === key);
          const mapped = valueMap[`${key}::${raw}`];
          const value = mapped && mapped !== "__keep__" ? mapped : raw;
          record[key] = field?.type === "number" ? Number(value.replace(/[$,]/g, "")) || 0 : value;
        });
        return { stage, data: record };
      });
    if (!payload.length) {
      toast.error("Nothing to import");
      return;
    }
    actions.createBackup(user, "Safety backup before import");
    const count = actions.importRecords(payload, user, source);
    toast.success(`${count} record(s) imported from ${source}`);
    setRows(null);
    setMapping({});
    setValueMap({});
    setStep("columns");
  };

  return (
    <section className="card-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <FileSpreadsheet className="h-4 w-4 text-primary" /> Excel / CSV migration center
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Import your legacy trackers. Save the Excel sheet as CSV, upload it, confirm the column mapping, then import. A safety
        backup is taken automatically before any import.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="src">Migration source</Label>
          <Input id="src" value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 h-9 w-60" />
        </div>
        <div>
          <Label>Import as</Label>
          <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
            <SelectTrigger className="mt-1 h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">Idea (Discovery)</SelectItem>
              <SelectItem value="project">Project (Pipeline)</SelectItem>
              <SelectItem value="production">Production (Deployed)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" onClick={() => importRef.current?.click()}>
          <Upload className="h-4 w-4" /> Choose CSV file
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(
              "automation-import-template",
              FIELDS.filter((f) => f.section === "Submission Info" || f.key === "projectStatus").map((f) => f.label),
              [],
            )
          }
        >
          <Download className="h-4 w-4" /> Download template
        </Button>
        <input
          ref={importRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const parsed = parseDelimited(await file.text());
            if (parsed.length < 2) {
              toast.error("That file has no data rows");
            } else {
              setRows(parsed);
              setMapping(autoMap(parsed[0]!));
              setValueMap({});
              setStep("columns");
              toast.success(`${parsed.length - 1} row(s) loaded — review the mapping`);
            }
            e.target.value = "";
          }}
        />
      </div>

      {rows ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {body.length} row(s) · {mappedCount} of {headers.length} columns mapped
            {issues.length ? ` · ${issues.length} row(s) will be skipped` : ""}
          </p>
          <div className="max-h-72 overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80">
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Source column</th>
                  <th className="px-3 py-2 font-medium">Sample value</th>
                  <th className="px-3 py-2 font-medium">Maps to field</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={`${h}-${i}`} className="border-t border-border/70">
                    <td className="px-3 py-2 font-medium">{h || `Column ${i + 1}`}</td>
                    <td className="max-w-56 truncate px-3 py-2 text-muted-foreground">{body[0]?.[i] ?? ""}</td>
                    <td className="px-3 py-2">
                      <Select
                        value={mapping[i] ?? "__skip__"}
                        onValueChange={(v) =>
                          setMapping((m) => {
                            const next = { ...m };
                            if (v === "__skip__") delete next[i];
                            else next[i] = v;
                            return next;
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="__skip__">— Skip this column —</SelectItem>
                          {FIELDS.map((f) => (
                            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {issues.length ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {issues.slice(0, 5).join(" · ")}
              {issues.length > 5 ? ` · +${issues.length - 5} more` : ""}
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button onClick={runImport}>Import {body.length - issues.length} record(s)</Button>
            <Button variant="ghost" onClick={() => { setRows(null); setMapping({}); }}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SettingsPage() {
  const data = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(data.settings.dataFolderPath);
  const { user, account } = useAuth();
  const s = data.settings;

  const exportFile = () => {
    const blob = new Blob([actions.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `automation-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Portfolio data exported");
  };

  return (
    <AppShell
      title="Settings"
      subtitle="Users and permissions, workspace storage, migration, backups and option lists"
      requires="settings.manage"
    >
      <div className="mb-4">
        <UsersAdmin actor={user} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-primary" /> Workspace &amp; storage mode
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Local Workspace keeps everything on this machine. Shared Workspace is for a team folder synced through
            SharePoint/OneDrive — one person edits at a time and a soft lock records who has it open.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["local", "shared"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  actions.setStorageMode(mode, user);
                  toast.success(mode === "shared" ? "Shared Workspace enabled" : "Local Workspace enabled");
                }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  s.storageMode === mode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {mode === "local" ? "Local Workspace" : "Shared Workspace"}
              </button>
            ))}
          </div>
          {s.workspaceLock ? (
            <p className="mt-2 text-xs text-warning-foreground">
              Workspace lock held by {s.workspaceLock.user} since {new Date(s.workspaceLock.acquiredAt).toLocaleString()}.
            </p>
          ) : null}

          <div className="mt-4 space-y-2">
            <Label htmlFor="folder">Shared folder path</Label>
            <div className="flex gap-2">
              <Input id="folder" value={path} onChange={(e) => setPath(e.target.value)} />
              <Button variant="secondary" onClick={() => { actions.setDataFolderPath(path); toast.success("Folder path saved"); }}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={exportFile}>
              <Download className="h-4 w-4" /> Export data file
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import data file
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                actions.createBackup(user, "Safety backup before reset");
                actions.resetToSeed();
                toast.success("Sample data restored");
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset to sample data
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  actions.createBackup(user, "Safety backup before import");
                  actions.importJson(await file.text());
                  toast.success("Portfolio data imported");
                } catch {
                  toast.error("That file could not be read as portfolio data");
                }
                e.target.value = "";
              }}
            />
          </div>
        </section>

        <section className="card-surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <HardDriveDownload className="h-4 w-4 text-primary" /> Backup &amp; restore
          </h2>
          <div className="mt-3 flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Automatic backups</p>
              <p className="text-xs text-muted-foreground">Take a restore point whenever data is imported or reset.</p>
            </div>
            <Switch checked={s.autoBackup} onCheckedChange={(v) => actions.setSettings({ autoBackup: v })} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select value={s.backupFrequency} onValueChange={(v) => actions.setSettings({ backupFrequency: v as "Daily" | "Weekly" })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ret">Restore points kept</Label>
              <Input
                id="ret"
                className="mt-1 h-9"
                value={String(s.backupRetention)}
                onChange={(e) => actions.setSettings({ backupRetention: Math.max(1, Number(e.target.value) || 7) })}
              />
            </div>
          </div>
          <Button
            className="mt-3"
            onClick={() => { actions.createBackup(user); toast.success("Restore point created"); }}
          >
            Create restore point now
          </Button>

          <div className="mt-4 max-h-60 overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-left text-muted-foreground">
                <tr>
                  {["Created", "By", "Records", "Size", ""].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.backups.map((b) => (
                  <tr key={b.id} className="border-t border-border/70">
                    <td className="px-3 py-2">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{b.createdBy}</td>
                    <td className="px-3 py-2 tabular-nums">{b.records}</td>
                    <td className="px-3 py-2 tabular-nums">{b.sizeKb} KB</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { actions.restoreBackup(b.id, user); toast.success("Portfolio restored"); }}
                      >
                        Restore
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => actions.deleteBackup(b.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {data.backups.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No restore points yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4">
        <ImportCenter user={user} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Signed-in account</h2>
          <p className="mt-1 text-xs text-muted-foreground">All edits are attributed automatically to the signed-in user.</p>
          <p className="mt-4 text-lg font-medium">{user}</p>
          <p className="font-mono text-xs text-muted-foreground">{account?.username} · {account?.role}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {data.automations.length} records stored · {data.accounts.length} user account(s) · Mode:{" "}
            {s.storageMode === "shared" ? "Shared Workspace" : "Local Workspace"}
          </p>
        </section>

        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Administration log</h2>
          <ul className="mt-3 max-h-52 space-y-2 overflow-auto text-sm">
            {data.adminLog.slice(0, 30).map((l) => (
              <li key={l.id} className="border-b border-border/60 pb-2 last:border-0">
                <p className="font-medium">{l.action}</p>
                <p className="text-xs text-muted-foreground">
                  {l.user} · {new Date(l.timestamp).toLocaleString()}
                  {l.detail ? ` · ${l.detail}` : ""}
                </p>
              </li>
            ))}
            {data.adminLog.length === 0 ? <li className="text-muted-foreground">No administrative activity yet.</li> : null}
          </ul>
        </section>
      </div>

      <h2 className="mt-6 mb-3 text-sm font-semibold">Dropdown option lists</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.keys(LIST_LABELS).map((key) => (
          <OptionEditor key={key} listKey={key} values={s.options[key] ?? []} />
        ))}
      </div>
    </AppShell>
  );
}
