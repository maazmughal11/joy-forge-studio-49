import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Table2, Columns3 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { RecordTable, type Column } from "@/components/RecordTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppData, actions } from "@/data";
import { approachingProduction, lastUpdate, staleWeeklyUpdate, nameOf, onHold } from "@/lib/derive";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects")({
  validateSearch: (s: Record<string, unknown>): { view?: string } => (typeof s['view'] === "string" ? { view: s['view'] } : {}),
  head: () => ({
    meta: [
      { title: "Project Tracking | Automation CoE Portfolio" },
      { name: "description", content: "Pipeline execution tracker for RPA projects across requirements, development, UAT, hypercare and production." },
      { property: "og:title", content: "Project Tracking | Automation CoE Portfolio" },
      { property: "og:description", content: "Manage active RPA projects with grid and kanban swimlane views." },
    ],
  }),
  component: Projects,
});

const LANES = ["Requirements", "Development", "UAT", "Hypercare", "Production"];

const VIEWS = [
  { key: "active", label: "Active Projects" },
  { key: "mine", label: "My Projects" },
  { key: "hold", label: "On Hold" },
  { key: "missing", label: "Missing Weekly Update" },
  { key: "approaching", label: "Approaching Production" },
  { key: "recent", label: "Recently Updated" },
] as const;

function Projects() {
  const data = useAppData();
  const navigate = useNavigate();
  const { user, can, account } = useAuth();
  const search = Route.useSearch();
  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>(
    (VIEWS.find((v) => v.key === search.view)?.key ?? "active") as (typeof VIEWS)[number]["key"],
  );
  const [mode, setMode] = useState<"grid" | "kanban">("grid");

  let records = data.automations.filter((a) => a.stage === "project" || a.stage === "production");
  if (view === "active") records = records.filter((a) => a.stage === "project");
  if (view === "mine") records = records.filter((a) => [a.data['submittedBy'], a.data['businessAnalyst']].includes(user));
  if (view === "hold") records = records.filter(onHold);
  if (view === "missing") records = records.filter(staleWeeklyUpdate);
  if (view === "approaching") records = records.filter(approachingProduction);
  if (view === "recent")
    records = records.filter((a) => Date.now() - new Date(a.modifiedDate).getTime() < 30 * 86400000);

  const columns: Column[] = [
    { key: "name", label: "Opportunity Name", value: nameOf },
    { key: "division", label: "Division", value: (a) => String(a.data['division'] ?? "") },
    { key: "status", label: "Project Status", badge: true, value: (a) => String(a.data['projectStatus'] ?? "") },
    { key: "pas", label: "PAS #", value: (a) => String(a.data['pasNumber'] ?? "") },
    { key: "ba", label: "Business Analyst", value: (a) => String(a.data['businessAnalyst'] ?? "") },
    { key: "tech", label: "Technology", value: (a) => String(a.data['technology'] ?? "") },
    { key: "rag", label: "Health", badge: true, value: (a) => lastUpdate(a)?.rag ?? "" },
    { key: "saved", label: "Dollars Saved", value: (a) => Number(a.data['dollarsSaved'] ?? 0) },
    {
      key: "prodDate",
      label: "Production Date",
      value: (a) => {
        const d = String(a.data['productionDate'] ?? "");
        return d ? new Date(d).toLocaleDateString() : "";
      },
    },
    { key: "modified", label: "Modified", value: (a) => new Date(a.modifiedDate).toLocaleDateString() },
  ];

  return (
    <AppShell
      requires={"projects.view"}
      title="Project Tracking"
      subtitle="Pipeline and deployed automations"
      actions={
        <>
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              onClick={() => setMode("grid")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs", mode === "grid" ? "bg-primary text-primary-foreground" : "bg-card")}
            >
              <Table2 className="h-3.5 w-3.5" /> Grid
            </button>
            <button
              onClick={() => setMode("kanban")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs", mode === "kanban" ? "bg-primary text-primary-foreground" : "bg-card")}
            >
              <Columns3 className="h-3.5 w-3.5" /> Swimlanes
            </button>
          </div>
          {can("projects.create") ? (
            <Button
              onClick={() => {
                const rec = actions.createRecord("project", user);
                navigate({ to: "/record/$id", params: { id: rec.id } });
              }}
            >
              <Plus className="h-4 w-4" /> New Project
            </Button>
          ) : null}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              view === v.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {mode === "grid" ? (
        <RecordTable
          records={records}
          columns={columns}
          filterKeys={[
            { key: "division", label: "Divisions", value: (a) => String(a.data['division'] ?? "") },
            { key: "status", label: "Statuses", value: (a) => String(a.data['projectStatus'] ?? "") },
            { key: "ba", label: "Owners", value: (a) => String(a.data['businessAnalyst'] ?? "") },
            { key: "year", label: "Years", value: (a) => String(a.data['year'] ?? "") },
          ]}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {LANES.map((lane) => {
            const laneRecords = records.filter((a) => String(a.data['projectStatus']) === lane);
            return (
              <section key={lane} className="rounded-lg border border-border bg-muted/40 p-2">
                <header className="flex items-center justify-between px-1 py-1.5">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lane}</h2>
                  <span className="text-xs text-muted-foreground">{laneRecords.length}</span>
                </header>
                <div className="space-y-2">
                  {laneRecords.map((a) => (
                    <Link
                      key={a.id}
                      to="/record/$id"
                      params={{ id: a.id }}
                      className="block rounded-md border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <p className="text-sm font-medium">{nameOf(a)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{String(a.data['division'] ?? "")}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <StatusBadge value={lastUpdate(a)?.rag ?? "Green"} />
                        <StatusBadge value={String(a.data['technology'] ?? "")} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
