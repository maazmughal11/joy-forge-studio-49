import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Lightbulb,
  ClipboardCheck,
  BadgeCheck,
  FolderKanban,
  PauseCircle,
  AlarmClock,
  Rocket,
  Plus,
  FileBarChart,
  MessageSquare,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppData, actions } from "@/data";
import {
  attentionItems,
  awaitingApproval,
  awaitingAssessment,
  approachingProduction,
  missingWeeklyUpdate,
  nameOf,
  onHold,
} from "@/lib/derive";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Automation CoE Portfolio Tracker | Home" },
      { name: "description", content: "Offline CRM-style dashboard for tracking RPA ideas, projects and deployed automations across the Automation Center of Excellence." },
      { property: "og:title", content: "Automation CoE Portfolio Tracker" },
      { property: "og:description", content: "Track RPA ideas, pipeline projects and production automations in one offline portfolio tool." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const data = useAppData();
  const navigate = useNavigate();
  const { user, can, account } = useAuth();
  const records = data.automations.filter((a) => a.stage !== "archived");

  const cards = [
    { label: "Total Active Ideas", value: records.filter((a) => a.stage === "idea").length, icon: Lightbulb, to: "/ideas", search: { view: "all" } },
    { label: "Awaiting Assessment", value: records.filter(awaitingAssessment).length, icon: ClipboardCheck, to: "/ideas", search: { view: "assessment" } },
    { label: "Awaiting Approval", value: records.filter(awaitingApproval).length, icon: BadgeCheck, to: "/approvals", search: { view: "pending" } },
    { label: "Active Projects", value: records.filter((a) => a.stage === "project").length, icon: FolderKanban, to: "/projects", search: { view: "active" } },
    { label: "Projects On Hold", value: records.filter((a) => a.stage === "project" && onHold(a)).length, icon: PauseCircle, to: "/projects", search: { view: "hold" } },
    { label: "Missing Updates", value: records.filter(missingWeeklyUpdate).length, icon: AlarmClock, to: "/weekly-updates", search: { view: "missing" } },
    { label: "Approaching Production", value: records.filter(approachingProduction).length, icon: Rocket, to: "/projects", search: { view: "approaching" } },
  ] as const;

  const attention = attentionItems(records, user).slice(0, 6);
  const myMessages = (data.messages ?? []).filter((m) => m.to === user && !m.resolvedAt);
  const recent = [...records]
    .sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime())
    .slice(0, 6);

  const createIdea = () => {
    const rec = actions.createRecord("idea", user);
    navigate({ to: "/record/$id", params: { id: rec.id } });
  };

  return (
    <AppShell
      title={`Welcome back, ${user.split(" ")[0]}`}
      subtitle="Your automation portfolio at a glance — everything stored locally on this machine."
      actions={
        <>
          {can("ideas.create") ? (
            <Button onClick={createIdea}>
              <Plus className="h-4 w-4" /> Submit Idea
            </Button>
          ) : null}
          <Button variant="secondary" asChild>
            <Link to="/projects">Update Project</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/weekly-updates" search={{ view: "missing" }}>Submit Weekly Update</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/reports">
              <FileBarChart className="h-4 w-4" /> Open Reports
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            search={c.search}
            className="card-surface p-4 transition-shadow hover:border-primary/40 hover:shadow-md"
          >
            <c.icon className="h-4 w-4 text-primary" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card-surface lg:col-span-2">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Items requiring my attention</h2>
          </header>
          <ul className="divide-y divide-border">
            {myMessages.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 text-sm font-medium">
                    {m.subject}
                    {!m.readAt ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">New</span>
                    ) : null}
                  </p>
                  <StatusBadge value={`From ${m.from}`} className="bg-primary/10 text-primary border-primary/25" />
                  <Button size="sm" variant="ghost" onClick={() => actions.resolveMessage(m.id)}>
                    <Check className="h-3.5 w-3.5" /> Done
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{m.body}</p>
                {m.recordId ? (
                  <Link
                    to="/record/$id"
                    params={{ id: m.recordId }}
                    className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                    onClick={() => actions.markMessageRead(m.id)}
                  >
                    {m.recordLabel ?? "View automation"}
                  </Link>
                ) : null}
              </li>
            ))}
            {attention.map(({ record, reasons, ownerName }) => (
              <li key={record.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link to="/record/$id" params={{ id: record.id }} className="font-medium text-primary hover:underline">
                    {nameOf(record)}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{reasons.join(" · ")}</p>
                </div>
                {ownerName ? <StatusBadge value={String(ownerName)} className="bg-primary/10 text-primary border-primary/25" /> : null}
                <StatusBadge value={String(record.data['projectStatus'] ?? record.data['opportunityStatus'] ?? "")} />
              </li>
            ))}
            {attention.length === 0 && myMessages.length === 0 ? <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing needs your attention.</li> : null}
          </ul>
        </section>

        <section className="card-surface">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recently modified</h2>
          </header>
          <ul className="divide-y divide-border">
            {recent.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <Link to="/record/$id" params={{ id: r.id }} className="text-sm font-medium text-primary hover:underline">
                  {nameOf(r)}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.modifiedBy} · {new Date(r.modifiedDate).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
