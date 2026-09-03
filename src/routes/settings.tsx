import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Download, Upload, X, Plus, Database, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { UsersAdmin } from "@/components/UsersAdmin";
import { ImportCenter } from "@/components/ImportCenter";
import { useAuth } from "@/hooks/useAuth";
import { useAppData, useConnection, actions, getStorageHealth } from "@/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Automation CoE Portfolio" },
      {
        name: "description",
        content: "Shared database status and sync, Excel migration imports, team members and permissions, and dropdown option lists.",
      },
      { property: "og:title", content: "Settings | Automation CoE Portfolio" },
      { property: "og:description", content: "Shared workspace status, Excel import center, users and permissions, and option list administration." },
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

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

function SettingsPage() {
  const data = useAppData();
  const connection = useConnection();
  const fileRef = useRef<HTMLInputElement>(null);
  const { user, account } = useAuth();
  const s = data.settings;
  const isAdmin = account?.role === "Administrator";
  const [eraseOpen, setEraseOpen] = useState(false);
  const [eraseConfirm, setEraseConfirm] = useState("");
  // Recomputed on every store change so the gauge tracks live usage.
  const health = useMemo(() => getStorageHealth(), [data]);

  const statusTone =
    connection.status === "connected"
      ? "border-success/30 bg-success/10 text-success"
      : connection.status === "offline"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border bg-muted text-muted-foreground";

  const statusLabel =
    connection.status === "connected"
      ? "Connected"
      : connection.status === "offline"
        ? "Disconnected"
        : connection.status === "syncing"
          ? "Syncing…"
          : "Connecting…";

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
      subtitle="Users and permissions, shared database status, migration and option lists"
      requires="settings.manage"
    >
      <div className="mb-4">
        <UsersAdmin actor={user} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4 text-primary" /> Shared database
            </h2>
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", statusTone)}>{statusLabel}</span>
            <Button
              size="sm"
              variant="secondary"
              className="ml-auto"
              onClick={async () => {
                const next = await actions.sync();
                toast[next && (next as { status?: string }).status === "offline" ? "error" : "success"](
                  next && (next as { status?: string }).status === "offline"
                    ? "The shared workspace could not be reached."
                    : "Synced with the shared workspace",
                );
              }}
            >
              <RefreshCw className="h-4 w-4" /> Sync now
            </Button>
          </div>
          <p className="mt-2 font-mono text-[11px] break-all text-muted-foreground">{connection.path}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Last updated</dt>
              <dd>{when(connection.lastUpdatedAt)}{connection.lastUpdatedBy ? ` · ${connection.lastUpdatedBy}` : ""}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Last synced</dt>
              <dd>{when(connection.lastSyncedAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Records</dt>
              <dd className="tabular-nums">{data.automations.length.toLocaleString()}</dd>
            </div>
          </dl>
          {connection.error ? (
            <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              {connection.error} Your changes are held on this machine and will be written as soon as the share is
              reachable again — nothing has been lost.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={exportFile}>
              <Download className="h-4 w-4" /> Export data file
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import data file
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
            <Database className="h-4 w-4 text-primary" /> Workspace health
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cached workspace size</span>
              <span className="tabular-nums">
                {health.usedKb.toLocaleString()} KB of {health.budgetKb.toLocaleString()} KB ({health.percent}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", health.percent > 85 ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.max(2, health.percent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{health.records.toLocaleString()} records</span>
              <span>{data.accounts.filter((a) => !a.deleted).length} active user account(s)</span>
            </div>
            {health.error ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {health.error}
              </p>
            ) : null}
          </div>

          {isAdmin ? (
            <div className="mt-4 rounded-md border border-destructive/30 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <ShieldAlert className="h-4 w-4" /> Danger zone
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Permanently removes every automation record and task from the shared database. User accounts,
                permissions, option lists and the administration log are kept.
              </p>
              <Button variant="outline" size="sm" className="mt-3 border-destructive/40 text-destructive" onClick={() => setEraseOpen(true)}>
                <Trash2 className="h-4 w-4" /> Erase all data
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      <Dialog open={eraseOpen} onOpenChange={(o) => { setEraseOpen(o); if (!o) setEraseConfirm(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Erase all portfolio data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This deletes all {data.automations.length} automation record(s) and {data.tasks.length} task(s) from the
            shared database for everyone. This cannot be undone. Type <b>ADMIN</b> to confirm.
          </p>
          <div>
            <Label htmlFor="erase">Confirmation</Label>
            <Input id="erase" className="mt-1" value={eraseConfirm} onChange={(e) => setEraseConfirm(e.target.value)} placeholder="ADMIN" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEraseOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={eraseConfirm !== "ADMIN"}
              onClick={() => {
                actions.eraseAllData(user);
                setEraseOpen(false);
                setEraseConfirm("");
                toast.success("All portfolio data erased");
              }}
            >
              Erase everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
