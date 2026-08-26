import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RecordTable, type Column } from "@/components/RecordTable";
import { useAppData } from "@/lib/store";
import { nameOf } from "@/lib/derive";

export const Route = createFileRoute("/production")({
  head: () => ({
    meta: [
      { title: "Production Library | Automation CoE Portfolio" },
      { name: "description", content: "Searchable inventory of deployed RPA automations with division, technology, production date and realized benefits." },
      { property: "og:title", content: "Production Library | Automation CoE Portfolio" },
      { property: "og:description", content: "Browse every automation running in production." },
    ],
  }),
  component: Production,
});

function Production() {
  const data = useAppData();
  const records = data.automations.filter((a) => a.stage === "production");

  const columns: Column[] = [
    { key: "name", label: "Automation", value: nameOf },
    { key: "division", label: "Division", value: (a) => String(a.data['division'] ?? "") },
    { key: "tech", label: "Technology", value: (a) => String(a.data['technology'] ?? "") },
    { key: "prod", label: "Production Date", value: (a) => String(a.data['productionDate'] ?? "") },
    { key: "saved", label: "Benefits Realized ($)", value: (a) => Number(a.data['dollarsSaved'] ?? 0) },
    { key: "hours", label: "Hours Saved", value: (a) => Number(a.data['hoursSaved'] ?? 0) },
    { key: "owner", label: "Business Owner", value: (a) => String(a.data['businessOwner'] ?? "") },
  ];

  return (
    <AppShell
      title="Production Library"
      subtitle="Deployed automations currently running in production"
      requires="production.view"
    >
      <RecordTable
        records={records}
        columns={columns}
        emptyMessage="No automations in production yet."
        filterKeys={[
          { key: "division", label: "Divisions", value: (a) => String(a.data['division'] ?? "") },
          { key: "tech", label: "Technologies", value: (a) => String(a.data['technology'] ?? "") },
        ]}
      />
    </AppShell>
  );
}
