import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, RotateCcw, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAppData, actions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Automation CoE Portfolio" },
      { name: "description", content: "Configure the shared data file location, team member list and dropdown option lists for the automation portfolio tracker." },
      { property: "og:title", content: "Settings | Automation CoE Portfolio" },
      { property: "og:description", content: "Manage local data storage and dropdown option lists." },
    ],
  }),
  component: SettingsPage;
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

function SettingsPage() {
  const data = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(data.settings.dataFolderPath);

  const exportFile = () => {
    const blob = new Blob([actions.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "automation-portfolio.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Portfolio data exported");
  };

  return (
    <AppShell title="Settings" subtitle="Local storage, team members and dropdown option lists">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Shared data file</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Data lives on this machine. Export the portfolio file into your SharePoint/OneDrive-synced folder to share it with the
            team, and import it back to pick up their changes.
          </p>
          <div className="mt-3 space-y-2">
            <Label htmlFor="folder">Shared folder path</Label>
            <div className="flex gap-2">
              <Input id="folder" value={path} onChange={(e) => setPath(e.target.value)} />
              <Button
                variant="secondary"
                onClick={() => {
                  actions.setDataFolderPath(path);
                  toast.success("Folder path saved");
                }}
              >
                Save
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
          <h2 className="text-sm font-semibold">Current profile</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            No login required — pick who you are so edits are attributed correctly.
          </p>
          <p className="mt-4 text-lg font-medium">{data.settings.currentUser}</p>
          <p className="text-xs text-muted-foreground">
            {data.automations.length} records stored · {LIST_LABELS['users']}: {data.settings.users.length}
          </p>
        </section>
      </div>

      <h2 className="mt-6 mb-3 text-sm font-semibold">Dropdown option lists</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.keys(LIST_LABELS).map((key) => (
          <OptionEditor key={key} listKey={key} values={data.settings.options[key] ?? []} />
        ))}
      </div>
    </AppShell>
  );
}
