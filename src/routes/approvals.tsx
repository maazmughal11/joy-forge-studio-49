import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppData } from "@/lib/store";
import { approvalRows, approvalTone, autoId, daysSince, nameOf, stageLabel, type ApprovalRow } from "@/lib/derive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadCsv } from "@/lib/export";
import { cn } from "@/lib/utils";

type Search = { view?: string };

export const Route = createFileRoute("/approvals")({
  validateSearch: (s: Record<string, unknown>): Search => (typeof s['view'] === "string" ? { view: s['view'] } : {}),
  head: () => ({
    meta: [
      { title: "Approvals | Automation CoE Portfolio Tracker" },
      {
        name: "description",
        content: "Centralized approval workspace: pending business case, UAT and deployment approvals with aging, approvers and decision history.",
      },
      { property: "og:title", content: "Approvals | Automation CoE" },
      { property: "og:description", content: "Track pending, approved and rejected automation approvals with waiting-time aging." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Approvals,
});

const VIEWS = [
  { key: "pending", label: "Pending" },
  { key: "mine", label: "My Approvals" },
  { key: "sponsor", label: "Awaiting Sponsor Approval" },
  { key: "overdue", label: "Overdue" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "recent", label: "Recently Decided" },
  { key: "all", label: "All Approvals" },
] as const;

const TONE_CLASS: Record<string, string> = {
  normal: "text-muted-foreground",
  attention: "font-medium text-warning-foreground",
  overdue: "font-semibold text-destructive",
};

function Approvals() {
  const data = useAppData();
  const navigate = useNavigate();
  const { view = "pending" } = Route.useSearch();
  const user = data.settings.currentUser;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ApprovalRow | null>(null);

  const all = useMemo(() => approvalRows(data.automations), [data.automations]);

  const rows = useMemo(() => {
    let out = all;
    switch (view) {
      case "pending":
        out = all.filter((r) => r.approval.status === "Pending");
        break;
      case "mine":
        out = all.filter((r) => r.approval.approver === user || r.approval.requestedBy === user);
        break;
      case "sponsor":
        out = all.filter((r) => r.approval.status === "Pending" && r.approval.type === "Business Case Approval");
        break;
      case "overdue":
        out = all.filter((r) => r.approval.status === "Pending" && r.daysWaiting > 7);
        break;
      case "approved":
        out = all.filter((r) => r.approval.status === "Approved");
        break;
      case "rejected":
        out = all.filter((r) => r.approval.status === "Rejected");
        break;
      case "recent":
        out = all.filter((r) => r.approval.decisionDate && daysSince(r.approval.decisionDate) <= 45);
        break;
      default:
        out = all;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) =>
        [nameOf(r.record), autoId(r.record), r.approval.type, r.approval.approver, r.approval.requestedBy]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return [...out].sort((a, b) => b.daysWaiting - a.daysWaiting || nameOf(a.record).localeCompare(nameOf(b.record)));
  }, [all, view, query, user]);

  const kpis = [
    { label: "Pending", value: all.filter((r) => r.approval.status === "Pending").length },
    { label: "Overdue (7+ days)", value: all.filter((r) => r.approval.status === "Pending" && r.daysWaiting > 7).length },
    { label: "Approved", value: all.filter((r) => r.approval.status === "Approved").length },
    { label: "Rejected", value: all.filter((r) => r.approval.status === "Rejected").length },
  ];

  const exportView = () =>
    downloadCsv(
      `approvals-${view}-${new Date().toISOString().slice(0, 10)}`,
      ["Automation ID", "Name", "Approval Type", "Status", "Requested By", "Requested Date", "Approver", "Due Date", "Days Waiting", "Decision Date", "Decision Comments", "Evidence", "Current Stage"],
      rows.map((r) => [
        autoId(r.record),
        nameOf(r.record),
        r.approval.type,
        r.approval.status,
        r.approval.requestedBy,
        r.approval.requestedDate,
        r.approval.approver,
        r.approval.dueDate ?? "",
        r.approval.status === "Pending" ? r.daysWaiting : "",
        r.approval.decisionDate ?? "",
        r.approval.decisionComments ?? "",
        r.approval.evidenceLink ?? "",
        stageLabel(r.record),
      ]),
    );

  return (
    <AppShell
      title="Approvals"
      subtitle="Centralized view of every approval captured against the automation portfolio"
      actions={
        <Button variant="outline" onClick={exportView}>
          <Download className="h-4 w-4" /> Export Current View
        </Button>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card-surface p-4">
            <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => navigate({ to: "/approvals", search: { view: v.key } })}
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
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter approvals…"
          className="ml-auto h-9 w-60 bg-card"
        />
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-left text-muted-foreground">
              {["Automation ID", "Opportunity / Project", "Approval Type", "Status", "Requested By", "Requested", "Approver", "Due", "Days Waiting", "Decision", "Stage"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.approval.id}
                onClick={() => setSelected(r)}
                className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2.5 font-mono text-xs">{autoId(r.record)}</td>
                <td className="px-3 py-2.5 font-medium text-primary">{nameOf(r.record)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{r.approval.type}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge value={r.approval.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{r.approval.requestedBy}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{r.approval.requestedDate}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{r.approval.approver}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{r.approval.dueDate ?? "—"}</td>
                <td className={cn("px-3 py-2.5 tabular-nums", TONE_CLASS[approvalTone(r.daysWaiting)])}>
                  {r.approval.status === "Pending" ? `${r.daysWaiting}d` : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{r.approval.decisionDate ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge value={stageLabel(r.record)} />
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">
                  No approvals in this view. Approvals are captured manually on each automation record.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Aging: 0–3 days normal · 4–7 days needs attention · more than 7 days overdue. Approvals are captured manually — this
        workspace does not send emails or run an external workflow.
      </p>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.approval.type}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{autoId(selected.record)}</p>
                  <p className="text-base font-medium">{nameOf(selected.record)}</p>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    ["Status", selected.approval.status],
                    ["Requested by", selected.approval.requestedBy],
                    ["Requested date", selected.approval.requestedDate],
                    ["Approver", selected.approval.approver],
                    ["Due date", selected.approval.dueDate ?? "—"],
                    ["Days waiting", selected.approval.status === "Pending" ? `${selected.daysWaiting} days` : "—"],
                    ["Decision date", selected.approval.decisionDate ?? "—"],
                    ["Automation stage", stageLabel(selected.record)],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="text-xs text-muted-foreground">{k}</dt>
                      <dd className="font-medium">{v as string}</dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <p className="text-xs text-muted-foreground">Decision comments</p>
                  <p>{selected.approval.decisionComments || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approval evidence</p>
                  {selected.approval.evidenceLink ? (
                    <a href={selected.approval.evidenceLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {selected.approval.evidenceLink}
                    </a>
                  ) : (
                    <p>—</p>
                  )}
                </div>
                <Button asChild>
                  <Link to="/record/$id" params={{ id: selected.record.id }}>
                    <ExternalLink className="h-4 w-4" /> Open Automation
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
