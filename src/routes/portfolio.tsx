import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RecordTable, type Column } from "@/components/RecordTable";
import { useAppData, actions } from "@/lib/store";
import {
  autoId,
  cancelled,
  daysSince,
  legacyCode,
  lifecycleCategory,
  nameOf,
  num,
  onHold,
  ragOf,
  stageLabel,
  str,
} from "@/lib/derive";
import { completeness, priorityFromScoring } from "@/lib/fields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Search = { view?: string };

export const Route = createFileRoute("/portfolio")({
  validateSearch: (s: Record<string, unknown>): Search => ({ view: typeof s['view'] === "string" ? s['view'] : undefined }),
  head: () => ({
    meta: [
      { title: "Portfolio | Automation CoE Portfolio Tracker" },
      {
        name: "description",
        content: "Master inventory of every automation across the CoE — ideas, projects, production, on hold, cancelled and archived records in one grid.",
      },
      { property: "og:title", content: "Portfolio | Automation CoE" },
      { property: "og:description", content: "The complete automation inventory across discovery, pipeline and production." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Portfolio,
});

const VIEWS = [
  { key: "all", label: "All Portfolio" },
  { key: "active", label: "Active Portfolio" },
  { key: "discovery", label: "Discovery" },
  { key: "pipeline", label: "Pipeline" },
  { key: "production", label: "Production" },
  { key: "hold", label: "On Hold" },
  { key: "cancelled", label: "Cancelled" },
  { key: "archived", label: "Archived" },
  { key: "priority", label: "High Priority" },
  { key: "incomplete", label: "Incomplete Records" },
  { key: "recent", label: "Recently Modified" },
] as const;

function Portfolio() {
  const data = useAppData();
  const navigate = useNavigate();
  const { view = "all" } = Route.useSearch();
  const user = data.settings.currentUser;

  const records = useMemo(() => {
    const all = data.automations;
    switch (view) {
      case "active":
        return all.filter((a) => a.stage !== "archived" && !cancelled(a));
      case "discovery":
        return all.filter((a) => a.stage === "idea");
      case "pipeline":
        return all.filter((a) => a.stage === "project");
      case "production":
        return all.filter((a) => a.stage === "production");
      case "hold":
        return all.filter(onHold);
      case "cancelled":
        return all.filter(cancelled);
      case "archived":
        return all.filter((a) => a.stage === "archived");
      case "priority":
        return all.filter((a) => priorityFromScoring(a.scoring) === "High");
      case "incomplete":
        return all.filter((a) => completeness(a).percent < 70);
      case "recent":
        return all.filter((a) => daysSince(a.modifiedDate) <= 30);
      default:
        return all;
    }
  }, [data.automations, view]);

  const columns: Column[] = [
    { key: "name", label: "Opportunity / Automation", value: nameOf },
    { key: "autoId", label: "Automation ID", mono: true, value: autoId },
    { key: "legacy", label: "Legacy Code", mono: true, value: legacyCode },
    { key: "stage", label: "Stage", badge: true, value: stageLabel },
    { key: "category", label: "Lifecycle Category", value: lifecycleCategory },
    { key: "oppStatus", label: "Opportunity Status", badge: true, value: (a) => str(a, "opportunityStatus") },
    { key: "projStatus", label: "Project Status", badge: true, value: (a) => str(a, "projectStatus") },
    { key: "division", label: "Division", value: (a) => str(a, "division") },
    { key: "region", label: "Region", value: (a) => str(a, "region") },
    { key: "area", label: "Functional Area", value: (a) => str(a, "functionalArea") },
    { key: "owner", label: "Business Owner", value: (a) => str(a, "businessOwner") },
    { key: "sme", label: "Process SME", value: (a) => str(a, "processSme") },
    { key: "ba", label: "Business Analyst", value: (a) => str(a, "businessAnalyst") },
    { key: "tech", label: "Technology", value: (a) => str(a, "technology") },
    { key: "priority", label: "Priority", badge: true, value: (a) => priorityFromScoring(a.scoring) },
    { key: "health", label: "Health / RAG", badge: true, value: ragOf },
    { key: "savings", label: "Expected Annual Savings", value: (a) => num(a.data['grossBenefits1yr']) },
    { key: "net12", label: "Net Benefit 12M", value: (a) => num(a.data['netBenefits12']) },
    { key: "hours", label: "Expected Hours Saved", value: (a) => num(a.data['hoursSaved']) },
    { key: "fte", label: "Expected FTE Savings", value: (a) => num(a.data['fteEquivalent']) },
    { key: "modified", label: "Last Updated", value: (a) => new Date(a.modifiedDate).toLocaleDateString() },
    { key: "modifiedBy", label: "Modified By", value: (a) => a.modifiedBy },
  ];

  return (
    <AppShell
      title="Portfolio"
      subtitle="Master inventory of every automation across the Center of Excellence"
      actions={
        <Button
          onClick={() => {
            const rec = actions.createRecord("idea", user);
            navigate({ to: "/record/$id", params: { id: rec.id } });
          }}
        >
          <Plus className="h-4 w-4" /> New Idea
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => navigate({ to: "/portfolio", search: { view: v.key } })}
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
      </div>

      <RecordTable
        records={records}
        columns={columns}
        columnPicker
        exportName="portfolio"
        defaultHidden={["region", "sme", "oppStatus", "fte", "modifiedBy", "savings"]}
        filterKeys={[
          { key: "category", label: "Lifecycle", value: lifecycleCategory },
          { key: "oppStatus", label: "Opportunity Statuses", value: (a) => str(a, "opportunityStatus") },
          { key: "projStatus", label: "Project Statuses", value: (a) => str(a, "projectStatus") },
          { key: "division", label: "Divisions", value: (a) => str(a, "division") },
          { key: "region", label: "Regions", value: (a) => str(a, "region") },
          { key: "area", label: "Functional Areas", value: (a) => str(a, "functionalArea") },
          { key: "owner", label: "Business Owners", value: (a) => str(a, "businessOwner") },
          { key: "ba", label: "Business Analysts", value: (a) => str(a, "businessAnalyst") },
          { key: "tech", label: "Technologies", value: (a) => str(a, "technology") },
          { key: "priority", label: "Priorities", value: (a) => priorityFromScoring(a.scoring) },
          { key: "health", label: "Health", value: ragOf },
          { key: "year", label: "Fiscal Years", value: (a) => str(a, "year") },
          { key: "requestType", label: "Request Types", value: (a) => str(a, "requestType") },
        ]}
      />
    </AppShell>
  );
}
