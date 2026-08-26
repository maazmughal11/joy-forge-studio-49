import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Printer, FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppData } from "@/data";
import {
  autoId,
  cancelled,
  daysInCurrentStage,
  daysSinceUpdate,
  documentCoverage,
  forecastBucket,
  governanceGaps,
  lastUpdate,
  missingWeeklyUpdate,
  money,
  nameOf,
  num,
  onHold,
  pipelineTrend,
  stageLabel,
  str,
} from "@/lib/derive";
import { LIFECYCLE, completeness, currentLifecycleStep } from "@/lib/fields";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv, downloadExcel, printReport } from "@/lib/export";
import { cn } from "@/lib/utils";
import type { Automation } from "@/domain/models";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Automation CoE Portfolio" },
      {
        name: "description",
        content: "Executive, pipeline, delivery, financial and governance reporting computed locally from your automation portfolio data.",
      },
      { property: "og:title", content: "Reports | Automation CoE Portfolio" },
      { property: "og:description", content: "Charts and executive summaries computed locally from your automation portfolio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reports,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const RAG_COLORS: Record<string, string> = {
  Green: "var(--rag-green)",
  Amber: "var(--rag-amber)",
  Red: "var(--rag-red)",
};
const RAG_ORDER = ["Green", "Amber", "Red"];
const TABS = ["Executive", "Pipeline", "Delivery", "Financial", "Governance"] as const;
type Tab = (typeof TABS)[number];
const ALL = "__all__";

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card-surface p-4", className)}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function group(items: string[]) {
  const map = new Map<string, number>();
  items.forEach((i) => map.set(i || "Unassigned", (map.get(i || "Unassigned") ?? 0) + 1));
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function sumBy(records: Automation[], key: string) {
  return records.reduce((s, r) => s + num(r.data[key]), 0);
}

function uniq(records: Automation[], key: string) {
  return Array.from(new Set(records.map((r) => str(r, key)).filter(Boolean))).sort();
}

function Reports() {
  const data = useAppData();
  const [tab, setTab] = useState<Tab>("Executive");
  const [division, setDivision] = useState(ALL);
  const [region, setRegion] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [analyst, setAnalyst] = useState(ALL);

  const base = data.automations.filter((a) => a.stage !== "archived");
  const records = useMemo(
    () =>
      base.filter(
        (a) =>
          (division === ALL || str(a, "division") === division) &&
          (region === ALL || str(a, "region") === region) &&
          (year === ALL || String(a.data['year'] ?? "") === year) &&
          (analyst === ALL || str(a, "businessAnalyst") === analyst),
      ),
    [base, division, region, year, analyst],
  );

  const ideas = records.filter((r) => r.stage === "idea");
  const projects = records.filter((r) => r.stage === "project");
  const production = records.filter((r) => r.stage === "production");

  const totalBenefit = sumBy(records, "netBenefits12");
  const deliveredBenefit = sumBy(production, "netBenefits12");
  const pipelineBenefit = sumBy(projects, "netBenefits12");
  const totalHours = sumBy(records, "hoursSaved");
  const totalCost = sumBy(records, "implementationCost");

  const kpis = [
    { label: "Automations tracked", value: String(records.length) },
    { label: "Ideas in discovery", value: String(ideas.length) },
    { label: "Active projects", value: String(projects.length) },
    { label: "Live in production", value: String(production.length) },
    { label: "Portfolio net benefits (12M)", value: money(totalBenefit) },
    { label: "Delivered benefits", value: money(deliveredBenefit) },
    { label: "Hours saved (annualised)", value: totalHours.toLocaleString() },
    { label: "Implementation cost", value: money(totalCost) },
  ];

  const byStage = LIFECYCLE.map((label, i) => ({
    name: label,
    value: records.filter((r) => currentLifecycleStep(r) === i).length,
  }));
  const byDivision = group(records.map((r) => str(r, "division")));
  const byRegion = group(records.map((r) => str(r, "region")));
  const byTechnology = group(records.map((r) => str(r, "technology")));
  const byProjectStatus = group(records.filter((r) => r.stage !== "idea").map((r) => str(r, "projectStatus")));
  const byOppStatus = group(ideas.map((r) => str(r, "opportunityStatus")));
  const byRag = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((a) => {
      const rag = lastUpdate(a)?.rag ?? "No update";
      map.set(rag, (map.get(rag) ?? 0) + 1);
    });
    return RAG_ORDER.map((name) => ({ name, value: map.get(name) ?? 0 })).filter((d) => d.value > 0);
  }, [projects]);
  const byForecast = ["Next 30 Days", "31-60 Days", "61-90 Days", "Beyond 90 Days", "Production Date Missing"].map((b) => ({
    name: b,
    value: projects.filter((p) => forecastBucket(p) === b).length,
  }));
  const byAnalyst = group(records.map((r) => str(r, "businessAnalyst")));

  const benefitsByYear = Array.from(
    records.reduce((m, r) => {
      const y = String(r.data['year'] ?? "Unset");
      m.set(y, (m.get(y) ?? 0) + num(r.data['netBenefits12']));
      return m;
    }, new Map<string, number>()),
    ([name, value]) => ({ name, value }),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const benefitByDivision = Array.from(
    records.reduce((m, r) => {
      const k = str(r, "division") || "Unassigned";
      m.set(k, (m.get(k) ?? 0) + num(r.data['netBenefits12']));
      return m;
    }, new Map<string, number>()),
    ([name, value]) => ({ name, value }),
  ).sort((a, b) => b.value - a.value);

  const pipeTrend = pipelineTrend(records, 12);

  // 8-week health trend across all projects
  const trend = Array.from({ length: 8 }, (_, idx) => {
    const weeksAgo = 7 - idx;
    const cutoff = Date.now() - weeksAgo * 7 * 86400000;
    let green = 0, amber = 0, red = 0;
    projects.forEach((p) => {
      const u = [...p.updates].filter((x) => new Date(x.date).getTime() <= cutoff).pop();
      if (!u) return;
      if (u.rag === "Green") green++;
      else if (u.rag === "Amber") amber++;
      else red++;
    });
    return { name: weeksAgo === 0 ? "This week" : `-${weeksAgo}w`, Green: green, Amber: amber, Red: red };
  });

  const avgStageAge = (stageKey: string) => {
    const set = records.filter((r) => stageLabel(r) === stageKey);
    if (!set.length) return 0;
    return Math.round(set.reduce((s, r) => s + daysInCurrentStage(r), 0) / set.length);
  };
  const cycleTime = Array.from(new Set(records.map(stageLabel))).map((s) => ({ name: s, value: avgStageAge(s) }));

  const governanceRows = records.map((r) => ({
    record: r,
    gaps: governanceGaps(r),
    docs: documentCoverage(r),
    completeness: completeness(r).percent,
  }));
  const avgCompleteness = governanceRows.length
    ? Math.round(governanceRows.reduce((s, g) => s + g.completeness, 0) / governanceRows.length)
    : 0;
  const avgDocCoverage = governanceRows.length
    ? Math.round(governanceRows.reduce((s, g) => s + g.docs.percent, 0) / governanceRows.length)
    : 0;

  const filterLabels = [
    division === ALL ? "All divisions" : division,
    region === ALL ? "All regions" : region,
    year === ALL ? "All years" : `FY ${year}`,
    analyst === ALL ? "All analysts" : analyst,
  ];

  const exportRows = () =>
    [
      ["Automation ID", "Name", "Stage", "Status", "Division", "Region", "Technology", "Business Analyst", "Health", "% Complete", "Net Benefits 12M", "Hours Saved", "Implementation Cost", "Days in Stage", "Data Completeness %", "Document Coverage %"],
      ...records.map((r) => [
        autoId(r),
        nameOf(r),
        r.stage,
        stageLabel(r),
        str(r, "division"),
        str(r, "region"),
        str(r, "technology"),
        str(r, "businessAnalyst"),
        lastUpdate(r)?.rag ?? "",
        lastUpdate(r)?.percentComplete ?? 0,
        num(r.data['netBenefits12']),
        num(r.data['hoursSaved']),
        num(r.data['implementationCost']),
        daysInCurrentStage(r),
        completeness(r).percent,
        documentCoverage(r).percent,
      ]),
    ] as [string[], ...(string | number)[][]];

  const fileName = `portfolio-report-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <AppShell
      requires={"reports.view"}
      title="Reports"
      subtitle="Computed locally from your portfolio data — no external BI tool required"
      actions={
        <>
          <Button variant="outline" onClick={() => { const [h, ...r] = exportRows(); downloadCsv(fileName, h, r); }}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => { const [h, ...r] = exportRows(); downloadExcel(fileName, h, r); }}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              printReport({
                title: `${tab} Report — Automation CoE Portfolio`,
                filters: filterLabels,
                kpis: kpis.slice(0, 6),
                elementId: "report-body",
              })
            }
          >
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
        </>
      }
    >
      {/* Global filter bar */}
      <div className="card-surface mb-4 flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-medium text-muted-foreground">Filters</span>
        {[
          { v: division, set: setDivision, label: "Division", opts: uniq(base, "division") },
          { v: region, set: setRegion, label: "Region", opts: uniq(base, "region") },
          { v: year, set: setYear, label: "Fiscal Year", opts: Array.from(new Set(base.map((a) => String(a.data['year'] ?? "")).filter(Boolean))).sort() },
          { v: analyst, set: setAnalyst, label: "Business Analyst", opts: uniq(base, "businessAnalyst") },
        ].map((f) => (
          <Select key={f.label} value={f.v} onValueChange={f.set}>
            <SelectTrigger className="h-9 w-52 bg-card">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All {f.label.toLowerCase()}s</SelectItem>
              {f.opts.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => { setDivision(ALL); setRegion(ALL); setYear(ALL); setAnalyst(ALL); }}
        >
          Reset
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div id="report-body">
        {tab === "Executive" ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.label} className="card-surface p-4">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Portfolio by lifecycle stage">
                <BarChart data={byStage} margin={{ left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </Panel>
              <Panel title="Automations by division">
                <BarChart data={byDivision} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </Panel>
              <Panel title="Benefits by fiscal year ($)">
                <BarChart data={benefitsByYear}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${Number(v).toLocaleString()}`} />
                  <Bar dataKey="value" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </Panel>
              <Panel title="Project health (RAG)">
                <PieChart>
                  <Pie data={byRag} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {byRag.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </Panel>
            </div>
          </>
        ) : null}

        {tab === "Pipeline" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Pipeline trend (monthly movement)" className="lg:col-span-2">
              <LineChart data={pipeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Discovery" stroke="var(--chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="Pipeline" stroke="var(--chart-3)" strokeWidth={2} />
                <Line type="monotone" dataKey="Production" stroke="var(--chart-2)" strokeWidth={2} />
                <Line type="monotone" dataKey="New" name="New ideas" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="4 3" />
              </LineChart>
            </Panel>
            <Panel title="Idea funnel by opportunity status">
              <BarChart data={byOppStatus} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </Panel>
            <Panel title="Project status breakdown">
              <PieChart>
                <Pie data={byProjectStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {byProjectStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </Panel>
            <Panel title="Production forecast">
              <BarChart data={byForecast} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </Panel>
            <Panel title="Automations by region">
              <PieChart>
                <Pie data={byRegion} dataKey="value" nameKey="name" outerRadius={100}>
                  {byRegion.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </Panel>
          </div>
        ) : null}

        {tab === "Delivery" ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "On hold", value: projects.filter(onHold).length },
                { label: "Cancelled", value: base.filter(cancelled).length },
                { label: "Missing weekly update", value: records.filter(missingWeeklyUpdate).length },
                { label: "Avg days in current stage", value: records.length ? Math.round(records.reduce((s, r) => s + daysInCurrentStage(r), 0) / records.length) : 0 },
              ].map((k) => (
                <div key={k.label} className="card-surface p-4">
                  <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Health trend (last 8 weeks)" className="lg:col-span-2">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Green" stroke="var(--rag-green)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Amber" stroke="var(--rag-amber)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Red" stroke="var(--rag-red)" strokeWidth={2} />
                </LineChart>
              </Panel>
              <Panel title="Average days in stage">
                <BarChart data={cycleTime} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v} days`} />
                  <Bar dataKey="value" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </Panel>
              <Panel title="Workload by business analyst">
                <BarChart data={byAnalyst} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </Panel>
            </div>
            <section className="card-surface mt-4 overflow-x-auto">
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Update compliance detail</h2>
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-left text-muted-foreground">
                    {["Automation ID", "Project", "Status", "Health", "% Complete", "Update age (days)"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-b border-border/70 last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{autoId(p)}</td>
                      <td className="px-3 py-2">{nameOf(p)}</td>
                      <td className="px-3 py-2">{stageLabel(p)}</td>
                      <td className="px-3 py-2">{lastUpdate(p)?.rag ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{lastUpdate(p)?.percentComplete ?? 0}%</td>
                      <td className={cn("px-3 py-2 tabular-nums", missingWeeklyUpdate(p) && "font-semibold text-destructive")}>
                        {daysSinceUpdate(p) === 9999 ? "Never" : daysSinceUpdate(p)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : null}

        {tab === "Financial" ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total net benefits (12M)", value: money(totalBenefit) },
                { label: "Delivered (production)", value: money(deliveredBenefit) },
                { label: "In-flight pipeline", value: money(pipelineBenefit) },
                { label: "Implementation cost", value: money(totalCost) },
              ].map((k) => (
                <div key={k.label} className="card-surface p-4">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Net benefits by division ($)">
                <BarChart data={benefitByDivision} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${Number(v).toLocaleString()}`} />
                  <Bar dataKey="value" fill="var(--chart-4)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </Panel>
              <Panel title="Benefits by fiscal year ($)">
                <BarChart data={benefitsByYear}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${Number(v).toLocaleString()}`} />
                  <Bar dataKey="value" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </Panel>
              <Panel title="Automations by technology" className="lg:col-span-2">
                <BarChart data={byTechnology} margin={{ bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </Panel>
            </div>
          </>
        ) : null}

        {tab === "Governance" ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="card-surface p-4">
                <p className="text-xs text-muted-foreground">Average data completeness</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{avgCompleteness}%</p>
              </div>
              <div className="card-surface p-4">
                <p className="text-xs text-muted-foreground">Average document coverage</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{avgDocCoverage}%</p>
              </div>
              <div className="card-surface p-4">
                <p className="text-xs text-muted-foreground">Records with governance gaps</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{governanceRows.filter((g) => g.gaps.length > 0).length}</p>
              </div>
            </div>
            <section className="card-surface overflow-x-auto">
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Data quality &amp; documentation gaps</h2>
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-left text-muted-foreground">
                    {["Automation ID", "Name", "Stage", "Completeness", "Doc coverage", "Missing documents", "Missing governance fields"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {governanceRows
                    .sort((a, b) => a.completeness - b.completeness)
                    .map((g) => (
                      <tr key={g.record.id} className="border-b border-border/70 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{autoId(g.record)}</td>
                        <td className="px-3 py-2">{nameOf(g.record)}</td>
                        <td className="px-3 py-2">{stageLabel(g.record)}</td>
                        <td className={cn("px-3 py-2 tabular-nums", g.completeness < 60 && "font-semibold text-destructive")}>{g.completeness}%</td>
                        <td className={cn("px-3 py-2 tabular-nums", g.docs.percent < 100 && "text-warning-foreground")}>{g.docs.percent}%</td>
                        <td className="px-3 py-2 text-muted-foreground">{g.docs.missing.join(", ") || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{g.gaps.join(", ") || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
