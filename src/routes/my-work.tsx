import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppData } from "@/lib/store";
import {
  awaitingApproval,
  approachingProduction,
  daysSince,
  lastUpdate,
  missingWeeklyUpdate,
  nameOf,
} from "@/lib/derive";
import type { Automation } from "@/lib/types";

export const Route = createFileRoute("/my-work")({
  head: () => ({
    meta: [
      { title: "My Work | Automation CoE Portfolio" },
      { name: "description", content: "Your assigned RPA records, pending approvals, overdue weekly updates and items approaching production." },
      { property: "og:title", content: "My Work | Automation CoE Portfolio" },
      { property: "og:description", content: "Everything assigned to you across the automation portfolio." },
    ],
  }),
  component: MyWork,
});

function List({ title, records, note }: { title: string; records: Automation[]; note?: (a: Automation) => string }) {
  return (
    <section className="card-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{records.length}</span>
      </header>
      <ul className="divide-y divide-border">
        {records.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Link to="/record/$id" params={{ id: a.id }} className="font-medium text-primary hover:underline">
                {nameOf(a)}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {note ? note(a) : `${String(a.data['division'] ?? "")} · modified ${new Date(a.modifiedDate).toLocaleDateString()}`}
              </p>
            </div>
            <StatusBadge value={String(a.data['projectStatus'] ?? a.data['opportunityStatus'] ?? "")} />
          </li>
        ))}
        {records.length === 0 ? <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing here right now.</li> : null}
      </ul>
    </section>
  );
}

function MyWork() {
  const data = useAppData();
  const { user, can, account } = useAuth();

  /** All identity strings that can appear on a record for the signed-in account. */
  const identities = [user, account?.username, account ? `${account.firstName} ${account.lastName}` : null]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  const isMine = (a: Automation) =>
    [a.data['submittedBy'], a.data['businessAnalyst'], a.data['businessOwner'], a.data['processSme'], a.createdBy]
      .filter(Boolean)
      .some((v) => identities.includes(String(v).toLowerCase()));

  const all = data.automations.filter((a) => a.stage !== "archived");
  const mine = all.filter(isMine);
  /** Viewers without portfolio-wide rights only ever see their own records. */
  const scope = can("portfolio.view") ? all : mine;

  return (
    <AppShell title="My Work" subtitle={`Records assigned to or submitted by ${user}`} requires="portfolio.view">
      <div className="grid gap-4 lg:grid-cols-2">
        <List title="Assigned to me" records={mine} />
        <List
          title="Pending approvals"
          records={scope.filter(awaitingApproval).filter((a) => can("approvals.view") || isMine(a))}
          note={(a) => `Sponsor approval outstanding · ${String(a.data['businessAnalyst'] ?? "unassigned")}`}
        />
        <List
          title="Overdue weekly updates"
          records={scope.filter(missingWeeklyUpdate)}
          note={(a) => `Last update ${lastUpdate(a) ? `${daysSince(lastUpdate(a)!.date)} days ago` : "never"}`}
        />
        <List
          title="Approaching production"
          records={scope.filter(approachingProduction)}
          note={(a) => `${String(a.data['projectStatus'])} · target ${String(a.data['productionDate'] ?? "TBD")}`}
        />
      </div>
    </AppShell>
  );
}
