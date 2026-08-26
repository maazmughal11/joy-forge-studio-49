import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { RecordTable, type Column } from "@/components/RecordTable";
import { useAppData, actions } from "@/lib/store";
import { awaitingApproval, awaitingAssessment, nameOf, onHold, readyToMove } from "@/lib/derive";
import { priorityFromScoring } from "@/lib/fields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ideas")({
  validateSearch: (s: Record<string, unknown>): { view?: string } => (typeof s['view'] === "string" ? { view: s['view'] } : {}),
  head: () => ({
    meta: [
      { title: "Idea Tracking | Automation CoE Portfolio" },
      { name: "description", content: "Discovery-stage RPA opportunity intake and initial assessment tracker with completeness scoring and saved views." },
      { property: "og:title", content: "Idea Tracking | Automation CoE Portfolio" },
      { property: "og:description", content: "Track RPA ideas from ideation through business case approval." },
    ],
  }),
  component: Ideas,
});

const VIEWS = [
  { key: "all", label: "All Active Ideas" },
  { key: "mine", label: "My Ideas" },
  { key: "assessment", label: "Awaiting Assessment" },
  { key: "approval", label: "Awaiting Approval" },
  { key: "ready", label: "Ready to Move to Project" },
  { key: "hold", label: "On Hold" },
] as const;

function Ideas() {
  const data = useAppData();
  const navigate = useNavigate();
  const { user, can, account } = useAuth();
  const search = Route.useSearch();
  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>(
    (VIEWS.find((v) => v.key === search.view)?.key ?? "all") as (typeof VIEWS)[number]["key"],
  );

  let records = data.automations.filter((a) => a.stage === "idea");
  if (view === "mine") records = records.filter((a) => [a.data['submittedBy'], a.data['businessAnalyst']].includes(user));
  if (view === "assessment") records = records.filter(awaitingAssessment);
  if (view === "approval") records = records.filter(awaitingApproval);
  if (view === "ready") records = records.filter(readyToMove);
  if (view === "hold") records = records.filter(onHold);

  const columns: Column[] = [
    { key: "name", label: "Opportunity Name", value: nameOf },
    { key: "division", label: "Division", value: (a) => String(a.data['division'] ?? "") },
    { key: "area", label: "Functional Area", value: (a) => String(a.data['functionalArea'] ?? "") },
    { key: "status", label: "Opportunity Status", badge: true, value: (a) => String(a.data['opportunityStatus'] ?? "") },
    { key: "owner", label: "Business Owner", value: (a) => String(a.data['businessOwner'] ?? "") },
    { key: "ba", label: "Business Analyst", value: (a) => String(a.data['businessAnalyst'] ?? "") },
    { key: "benefit", label: "Net Benefits 12M", value: (a) => Number(a.data['netBenefits12'] ?? 0) },
    { key: "priority", label: "Priority", badge: true, value: (a) => priorityFromScoring(a.scoring) },
    { key: "modified", label: "Modified", value: (a) => new Date(a.modifiedDate).toLocaleDateString() },
  ];

  return (
    <AppShell
      title="Idea Tracking"
      subtitle="Opportunity initial assessment — discovery pipeline"
      actions={
        can("ideas.create") ? (
        <Button
          onClick={() => {
            const rec = actions.createRecord("idea", user);
            navigate({ to: "/record/$id", params: { id: rec.id } });
          }}
        >
          <Plus className="h-4 w-4" /> New Idea
        </Button>
        ) : null
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
      <RecordTable
        records={records}
        columns={columns}
        filterKeys={[
          { key: "division", label: "Divisions", value: (a) => String(a.data['division'] ?? "") },
          { key: "status", label: "Statuses", value: (a) => String(a.data['opportunityStatus'] ?? "") },
          { key: "year", label: "Years", value: (a) => String(a.data['year'] ?? "") },
          { key: "tech", label: "Technologies", value: (a) => String(a.data['technology'] ?? "") },
        ]}
      />
    </AppShell>
  );
}
