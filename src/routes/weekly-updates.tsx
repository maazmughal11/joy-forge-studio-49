import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppData, actions } from "@/data";
import {
  autoId,
  cancelled,
  daysSince,
  daysSinceUpdate,
  healthTrend,
  lastUpdate,
  missingWeeklyUpdate,
  nameOf,
  onHold,
  stageLabel,
  str,
} from "@/lib/derive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv } from "@/lib/export";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Automation } from "@/domain/models";

type Search = { view?: string };

export const Route = createFileRoute("/weekly-updates")({
  validateSearch: (s: Record<string, unknown>): Search => (typeof s['view'] === "string" ? { view: s['view'] } : {}),
  head: () => ({
    meta: [
      { title: "Weekly Updates | Automation CoE Portfolio Tracker" },
      {
        name: "description",
        content: "Portfolio-wide weekly status reporting: RAG health, percent complete, blockers, next steps and update compliance for every active automation project.",
      },
      { property: "og:title", content: "Weekly Updates | Automation CoE" },
      { property: "og:description", content: "Weekly project status log with missing-update tracking and health trends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WeeklyUpdates,
});

const VIEWS = [
  { key: "week", label: "This Week" },
  { key: "missing", label: "Missing Updates" },
  { key: "risk", label: "Red / Amber" },
  { key: "mine", label: "My Projects" },
  { key: "all", label: "All Updates" },
  { key: "history", label: "Update History" },
  { key: "recent", label: "Recently Submitted" },
] as const;

function WeeklyUpdates() {
  const data = useAppData();
  const navigate = useNavigate();
  const { view = "week" } = Route.useSearch();
  const { user, can, account } = useAuth();
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Automation | null>(null);
  const [formFor, setFormFor] = useState<Automation | null>(null);

  const tracked = useMemo(
    () => data.automations.filter((a) => (a.stage === "project" || a.stage === "production") && !cancelled(a)),
    [data.automations],
  );

  const rows = useMemo(() => {
    let out = tracked;
    switch (view) {
      case "week":
        out = tracked.filter((a) => daysSinceUpdate(a) <= 7);
        break;
      case "missing":
        out = tracked.filter(missingWeeklyUpdate);
        break;
      case "risk":
        out = tracked.filter((a) => ["Red", "Amber"].includes(lastUpdate(a)?.rag ?? ""));
        break;
      case "mine":
        out = tracked.filter((a) => [str(a, "businessAnalyst"), str(a, "businessOwner")].includes(user));
        break;
      case "recent":
        out = tracked.filter((a) => daysSinceUpdate(a) <= 14);
        break;
      default:
        out = tracked;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((a) => `${nameOf(a)} ${autoId(a)} ${str(a, "businessAnalyst")}`.toLowerCase().includes(q));
    }
    return [...out].sort((a, b) => daysSinceUpdate(b) - daysSinceUpdate(a));
  }, [tracked, view, query, user]);

  const activeProjects = tracked.filter((a) => a.stage === "project" && !onHold(a));
  const updatedThisWeek = activeProjects.filter((a) => daysSinceUpdate(a) <= 7).length;
  const compliance = activeProjects.length ? Math.round((updatedThisWeek / activeProjects.length) * 100) : 100;

  const redAmber = tracked.filter((a) => ["Red", "Amber"].includes(lastUpdate(a)?.rag ?? "")).length;
  const trend = useMemo(() => healthTrend(tracked, 12), [tracked]);

  const kpis = [
    { label: "Active projects", value: String(activeProjects.length), view: "all" },
    { label: "Updated this week", value: String(updatedThisWeek), view: "week" },
    { label: "Missing update", value: String(activeProjects.length - updatedThisWeek), view: "missing" },
    { label: "Red / Amber", value: String(redAmber), view: "risk" },
    { label: "Update compliance", value: `${compliance}%`, view: "all" },
  ] as const;

  const exportView = () =>
    downloadCsv(
      `weekly-updates-${view}-${new Date().toISOString().slice(0, 10)}`,
      ["Automation ID", "Project Name", "Project Status", "Health", "% Complete", "Update Date", "Submitted By", "Progress Summary", "Key Accomplishments", "Next Steps", "Blockers / Risks", "Decisions Needed", "Last Update Age (days)", "Update Compliance"],
      rows.map((a) => {
        const u = lastUpdate(a);
        return [
          autoId(a),
          nameOf(a),
          stageLabel(a),
          u?.rag ?? "",
          u?.percentComplete ?? 0,
          u?.date ?? "",
          u?.submittedBy ?? "",
          u?.text ?? "",
          u?.accomplishments ?? "",
          u?.nextSteps ?? "",
          u?.blockers ?? "",
          u?.decisions ?? "",
          daysSinceUpdate(a) === 9999 ? "Never" : daysSinceUpdate(a),
          missingWeeklyUpdate(a) ? "Missing Update" : "Current",
        ];
      }),
    );

  return (
    <AppShell
      requires={"updates.view"}
      title="Weekly Updates"
      subtitle="Portfolio-wide status reporting — a permanent historical log of every project update"
      actions={
        <>
          {can("updates.submit") ? (
            <Button
              onClick={() => setFormFor(rows[0] ?? tracked[0] ?? null)}
              disabled={tracked.length === 0}
            >
              Submit Weekly Update
            </Button>
          ) : null}
          <Button variant="outline" onClick={exportView} disabled={!can("export.view")}>
            <Download className="h-4 w-4" /> Export Current View
          </Button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={() => navigate({ to: "/weekly-updates", search: { view: k.view } })}
            className="card-surface p-4 text-left transition-colors hover:border-ring"
          >
            <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <div className="card-surface p-4">
          <p className="text-sm font-medium">Project health trend</p>
          <p className="mb-3 text-xs text-muted-foreground">Weekly RAG distribution across tracked projects</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Green" stackId="r" fill="var(--rag-green)" />
                <Bar dataKey="Amber" stackId="r" fill="var(--rag-amber)" />
                <Bar dataKey="Red" stackId="r" fill="var(--rag-red)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface p-4">
          <p className="text-sm font-medium">Average % complete</p>
          <p className="mb-3 text-xs text-muted-foreground">Reported completion trend across tracked projects</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="avgComplete" name="Avg % complete" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => navigate({ to: "/weekly-updates", search: { view: v.key } })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              view === v.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter projects…" className="ml-auto h-9 w-60 bg-card" />
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-left text-muted-foreground">
              {["Automation ID", "Project", "Status", "Health", "% Complete", "Update Date", "Submitted By", "Progress Summary", "Blockers / Risks", "Update Age", "Compliance", ""].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const u = lastUpdate(a);
              const age = daysSinceUpdate(a);
              return (
                <tr key={a.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2.5 font-mono text-xs">{autoId(a)}</td>
                  <td className="px-3 py-2.5">
                    <button className="font-medium text-primary hover:underline" onClick={() => setDetail(a)}>
                      {nameOf(a)}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge value={stageLabel(a)} />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge value={u?.rag ?? ""} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{u ? `${u.percentComplete}%` : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{u?.date ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{u?.submittedBy ?? "—"}</td>
                  <td className="max-w-72 truncate px-3 py-2.5 text-muted-foreground">{u?.text ?? "—"}</td>
                  <td className="max-w-64 truncate px-3 py-2.5 text-muted-foreground">{u?.blockers ?? "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums">{age === 9999 ? "Never" : `${age}d`}</td>
                  <td className="px-3 py-2.5">
                    {missingWeeklyUpdate(a) ? (
                      <StatusBadge value="Missing Update" className="border-destructive/30 bg-destructive/15 text-destructive" />
                    ) : (
                      <StatusBadge value="Current" className="border-success/30 bg-success/15 text-success" />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {can("updates.submit") ? (
                      <Button size="sm" variant="secondary" onClick={() => setFormFor(a)}>
                        Update
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-muted-foreground">
                  No projects in this view.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Project-level update history */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{nameOf(detail)} — update history</DialogTitle>
              </DialogHeader>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { setFormFor(detail); setDetail(null); }}>
                  Submit Weekly Update
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/record/$id" params={{ id: detail.id }}>Open Automation</Link>
                </Button>
              </div>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {detail.updates.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px]">
                    {u.date} <StatusBadge value={u.rag} className="px-1.5 py-0" /> {u.percentComplete}%
                  </span>
                ))}
                {detail.updates.length === 0 ? <span className="text-sm text-muted-foreground">No updates submitted yet.</span> : null}
              </div>
              <ol className="space-y-3">
                {[...detail.updates].reverse().map((u) => (
                  <li key={u.id} className="card-surface p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={u.rag} />
                      <span className="font-medium">{u.date}</span>
                      <span className="text-xs text-muted-foreground">by {u.submittedBy} · {u.percentComplete}% complete</span>
                    </div>
                    <p className="mt-2">{u.text}</p>
                    {u.accomplishments ? <p className="mt-1 text-xs text-muted-foreground"><b>Accomplishments:</b> {u.accomplishments}</p> : null}
                    {u.nextSteps ? <p className="mt-1 text-xs text-muted-foreground"><b>Next steps:</b> {u.nextSteps}</p> : null}
                    {u.blockers ? <p className="mt-1 text-xs text-muted-foreground"><b>Blockers:</b> {u.blockers}</p> : null}
                    {u.decisions ? <p className="mt-1 text-xs text-muted-foreground"><b>Decisions needed:</b> {u.decisions}</p> : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <UpdateForm record={formFor} user={user} onClose={() => setFormFor(null)} />
    </AppShell>
  );
}

function UpdateForm({ record, user, onClose }: { record: Automation | null; user: string; onClose: () => void }) {
  const [rag, setRag] = useState("Green");
  const [pct, setPct] = useState("50");
  const [text, setText] = useState("");
  const [accomplishments, setAcc] = useState("");
  const [nextSteps, setNext] = useState("");
  const [blockers, setBlockers] = useState("");
  const [decisions, setDecisions] = useState("");

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        {record ? (
          <>
            <DialogHeader>
              <DialogTitle>Weekly update — {nameOf(record)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Health / RAG</Label>
                  <Select value={rag} onValueChange={setRag}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Green", "Amber", "Red"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pct">% Complete</Label>
                  <Input id="pct" className="mt-1" value={pct} onChange={(e) => setPct(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="sum">Progress summary</Label>
                <Textarea id="sum" className="mt-1" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="acc">Key accomplishments</Label>
                <Textarea id="acc" className="mt-1" value={accomplishments} onChange={(e) => setAcc(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="nxt">Next steps</Label>
                <Textarea id="nxt" className="mt-1" value={nextSteps} onChange={(e) => setNext(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="blk">Blockers / risks</Label>
                <Textarea id="blk" className="mt-1" value={blockers} onChange={(e) => setBlockers(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dec">Decisions needed</Label>
                <Textarea id="dec" className="mt-1" value={decisions} onChange={(e) => setDecisions(e.target.value)} />
              </div>
              <Button
                onClick={() => {
                  if (!text.trim()) {
                    toast.error("Add a progress summary before submitting");
                    return;
                  }
                  actions.addUpdate(
                    record.id,
                    {
                      text,
                      percentComplete: Math.max(0, Math.min(100, Number(pct) || 0)),
                      rag: rag as "Red" | "Amber" | "Green",
                      accomplishments,
                      nextSteps,
                      blockers,
                      decisions,
                    },
                    user,
                  );
                  toast.success("Weekly update submitted");
                  setText("");
                  setAcc("");
                  setNext("");
                  setBlockers("");
                  setDecisions("");
                  onClose();
                }}
              >
                Submit update
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
