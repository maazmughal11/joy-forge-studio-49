import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useAppData } from "@/lib/store";
import { num } from "@/lib/derive";
import { LIFECYCLE, currentLifecycleStep } from "@/lib/fields";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Automation CoE Portfolio" },
      { name: "description", content: "Local portfolio analytics: pipeline by stage, ideas by division, benefits by year and project status breakdown." },
      { property: "og:title", content: "Reports | Automation CoE Portfolio" },
      { property: "og:description", content: "Charts computed locally from your automation portfolio data." },
    ],
  }),
  component: Reports,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-surface p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function group<T extends string>(items: T[]) {
  const map = new Map<string, number>();
  items.forEach((i) => map.set(i || "Unassigned", (map.get(i || "Unassigned") ?? 0) + 1));
  return Array.from(map, ([name, value]) => ({ name, value }));
}

function Reports() {
  const records = useAppData().automations.filter((a) => a.stage !== "archived");

  const byStage = LIFECYCLE.map((label, i) => ({
    name: label,
    value: records.filter((r) => currentLifecycleStep(r) === i).length,
  }));
  const byDivision = group(records.filter((r) => r.stage === "idea").map((r) => String(r.data['division'] ?? "")));
  const byProjectStatus = group(
    records.filter((r) => r.stage !== "idea").map((r) => String(r.data['projectStatus'] ?? "")),
  );
  const benefitsByYear = Array.from(
    records.reduce((m, r) => {
      const y = String(r.data['year'] ?? "Unset");
      m.set(y, (m.get(y) ?? 0) + num(r.data['netBenefits12']));
      return m;
    }, new Map<string, number>()),
    ([name, value]) => ({ name, value }),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const totalBenefit = records.reduce((s, r) => s + num(r.data['netBenefits12']), 0);
  const totalHours = records.reduce((s, r) => s + num(r.data['hoursSaved']), 0);

  return (
    <AppShell title="Reports" subtitle="Computed locally from your portfolio data — no external BI tool">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card-surface p-4">
          <p className="text-xs text-muted-foreground">Portfolio net benefits (12M)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">${totalBenefit.toLocaleString()}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs text-muted-foreground">Hours saved (annualized)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{totalHours.toLocaleString()}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs text-muted-foreground">Automations tracked</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{records.length}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pipeline by lifecycle stage">
          <BarChart data={byStage} margin={{ left: -20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Panel>

        <Panel title="Ideas by division">
          <BarChart data={byDivision} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </Panel>

        <Panel title="Net benefits by fiscal year ($)">
          <BarChart data={benefitsByYear} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Bar dataKey="value" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Panel>

        <Panel title="Project status breakdown">
          <PieChart>
            <Pie data={byProjectStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
              {byProjectStatus.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </Panel>
      </div>
    </AppShell>
  );
}
