import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppData } from "@/data";
import {
  awaitingApproval,
  approachingProduction,
  autoId,
  myTasks,
  nameOf,
} from "@/lib/derive";
import { actions } from "@/data";
import { AssignTaskDialog } from "@/components/AssignTaskDialog";
import { Button } from "@/components/ui/button";
import { StatusBadge as Badge } from "@/components/StatusBadge";
import { Check, UserPlus } from "lucide-react";
import { useState } from "react";
import type { Automation } from "@/domain/models";

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
  const [assignOpen, setAssignOpen] = useState(false);

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
  const tasks = myTasks(data.tasks, user);
  const delegated = data.tasks.filter((t) => t.assignedBy === user && t.status !== "Completed");

  return (
    <AppShell
      title="My Work"
      subtitle={`Tasks and records assigned to ${user}`}
      requires="portfolio.view"
      actions={
        <Button variant="secondary" onClick={() => setAssignOpen(true)}>
          <UserPlus className="h-4 w-4" /> Assign Task
        </Button>
      }
    >
      <section className="card-surface mb-4">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">My tasks</h2>
          <span className="text-xs text-muted-foreground">{tasks.length} open</span>
        </header>
        <ul className="divide-y divide-border">
          {tasks.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                {t.description ? <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p> : null}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Assigned by {t.assignedBy} · {t.dueDate ? `due ${t.dueDate}` : "no due date"}
                  {t.recordId ? " · " : ""}
                  {t.recordId ? (
                    <Link to="/record/$id" params={{ id: t.recordId }} className="font-medium text-primary hover:underline">
                      {t.recordLabel ?? "View automation"}
                    </Link>
                  ) : null}
                </p>
              </div>
              <Badge value={t.priority} />
              <Badge value={t.status} />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => actions.updateTask(t.id, { status: t.status === "Not Started" ? "In Progress" : "Completed" })}
              >
                <Check className="h-3.5 w-3.5" /> {t.status === "Not Started" ? "Start" : "Complete"}
              </Button>
            </li>
          ))}
          {tasks.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">No open tasks assigned to you.</li>
          ) : null}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <List title="Assigned to me" records={mine} />
        <List
          title="Pending approvals"
          records={scope.filter(awaitingApproval).filter((a) => can("approvals.view") || isMine(a))}
          note={(a) => `Sponsor approval outstanding · ${String(a.data['businessAnalyst'] ?? "unassigned")}`}
        />
        <section className="card-surface">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Tasks I assigned to others</h2>
            <span className="text-xs text-muted-foreground">{delegated.length}</span>
          </header>
          <ul className="divide-y divide-border">
            {delegated.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.assignedTo} · {t.dueDate ? `due ${t.dueDate}` : "no due date"}
                  </p>
                </div>
                <Badge value={t.status} />
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => actions.deleteTask(t.id, user)}>
                  Remove
                </Button>
              </li>
            ))}
            {delegated.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">You have not assigned any tasks.</li>
            ) : null}
          </ul>
        </section>
        <List
          title="Approaching production"
          records={scope.filter(approachingProduction)}
          note={(a) => `${String(a.data['projectStatus'])} · target ${String(a.data['productionDate'] ?? "TBD")}`}
        />
      </div>

      <AssignTaskDialog open={assignOpen} onOpenChange={setAssignOpen} assignedBy={user} />
    </AppShell>
  );
}
