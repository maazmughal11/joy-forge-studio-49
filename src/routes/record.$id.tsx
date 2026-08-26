import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ExternalLink, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { StageProgress } from "@/components/StageProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { FieldInput } from "@/components/FieldInput";
import { useAppData, useAutomation, actions } from "@/data";
import { SECTIONS, completeness, fieldsForStage, priorityFromScoring } from "@/lib/fields";
import { moveBlockers, nameOf } from "@/lib/derive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Automation, Scoring } from "@/domain/models";

export const Route = createFileRoute("/record/$id")({
  head: () => ({
    meta: [
      { title: "Automation Record | Automation CoE Portfolio" },
      { name: "description", content: "Full automation record: assessment fields, lifecycle stage gate, weekly updates, documents, comments and audit history." },
      { property: "og:title", content: "Automation Record | Automation CoE Portfolio" },
      { property: "og:description", content: "Detailed view of a single RPA automation opportunity." },
    ],
  }),
  component: RecordPage,
});

const SCORE_LABELS: { key: keyof Scoring; label: string }[] = [
  { key: "businessValue", label: "Business Value" },
  { key: "complexity", label: "Complexity" },
  { key: "risk", label: "Risk" },
  { key: "strategicPriority", label: "Strategic Priority" },
];

function RecordPage() {
  const { id } = Route.useParams();
  const data = useAppData();
  const record = useAutomation(id);
  const navigate = useNavigate();
  const { user, can, account } = useAuth();

  if (!record) {
    return (
      <AppShell title="Record not found">
        <p className="text-sm text-muted-foreground">
          This record no longer exists.{" "}
          <Link to="/ideas" className="text-primary hover:underline">
            Back to Idea Tracking
          </Link>
        </p>
      </AppShell>
    );
  }

  const comp = completeness(record);
  const fields = fieldsForStage(record.stage);
  const blockers = moveBlockers(record);

  return (
    <AppShell
      title={nameOf(record)}
      subtitle={`${record.category} · ${record.stage} · last modified by ${record.modifiedBy} on ${new Date(record.modifiedDate).toLocaleString()}`}
      actions={
        <>
          {record.stage === "idea" ? (
            <Button
              onClick={() => {
                if (blockers.length) {
                  toast.error(`Cannot move yet: ${blockers.join(", ")}`);
                  return;
                }
                actions.moveToProject(record.id, user);
                toast.success("Moved to Project Tracking");
                navigate({ to: "/projects" });
              }}
            >
              Move to Project Tracking <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => {
              actions.deleteRecord(record.id);
              toast.success("Record deleted");
              navigate({ to: "/ideas" });
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </>
      }
    >
      <div className="card-surface mb-4 p-4">
        <StageProgress record={record} />
        {record.stage === "idea" && blockers.length ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/50 bg-warning/15 p-3 text-xs text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Before this idea can advance to Project Tracking:</p>
              <ul className="mt-1 list-inside list-disc">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="updates">Weekly Updates</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {SECTIONS.map((section) => {
              const sectionFields = fields.filter((f) => f.section === section);
              if (!sectionFields.length) return null;
              return (
                <section key={section} className="card-surface p-4">
                  <h2 className="mb-3 text-sm font-semibold">{section}</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {sectionFields.map((f) => (
                      <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : undefined}>
                        <FieldInput
                          field={f}
                          value={record.data[f.key]}
                          options={f.optionKey ? (data.settings.options[f.optionKey] ?? []) : (f.options ?? [])}
                          onCommit={(v) => actions.setField(record.id, f.key, v, user)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </TabsContent>

          <TabsContent value="updates">
            <WeeklyUpdates record={record} user={user} />
          </TabsContent>

          <TabsContent value="documents">
            <Documents record={record} user={user} docTypes={data.settings.options['documentTypes'] ?? []} />
          </TabsContent>

          <TabsContent value="comments">
            <Comments record={record} user={user} />
          </TabsContent>

          <TabsContent value="history">
            <section className="card-surface">
              <ul className="divide-y divide-border">
                {[...record.history].reverse().map((h) => (
                  <li key={h.id} className="px-4 py-3 text-sm">
                    <p className="font-medium">{h.action}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {h.user} · {new Date(h.timestamp).toLocaleString()}
                      {h.field ? ` · ${h.field}: ${h.oldValue} → ${h.newValue}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </TabsContent>
        </Tabs>

        <aside className="space-y-4">
          <section className="card-surface p-4">
            <h2 className="text-sm font-semibold">Data completeness</h2>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={comp.percent} className="h-2" />
              <span className="text-sm font-medium tabular-nums">{comp.percent}%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {comp.filled} of {comp.total} fields completed
            </p>
            {comp.missing.length ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-primary">View {comp.missing.length} missing fields</summary>
                <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                  {comp.missing.map((m) => (
                    <li key={m.key}>{m.label}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>

          <section className="card-surface p-4">
            <h2 className="text-sm font-semibold">Prioritization</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Overall priority</span>
              <StatusBadge value={priorityFromScoring(record.scoring)} />
            </div>
            <div className="mt-3 space-y-3">
              {SCORE_LABELS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {label}: {record.scoring[key]}
                  </Label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={record.scoring[key]}
                    onChange={(e) => actions.setScoring(record.id, key, Number(e.target.value), user)}
                    className="w-full accent-[var(--primary)]"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="card-surface p-4 text-xs text-muted-foreground">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Audit</h2>
            <p>Created by {record.createdBy}</p>
            <p>{new Date(record.createdDate).toLocaleString()}</p>
            <p className="mt-2">Modified by {record.modifiedBy}</p>
            <p>{new Date(record.modifiedDate).toLocaleString()}</p>
            <div className="mt-3">
              <Label className="text-xs">Stage</Label>
              <Select value={record.stage} onValueChange={(v) => actions.setStage(record.id, v as Automation["stage"], user)}>
                <SelectTrigger className="mt-1 h-8 bg-card text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["idea", "project", "production", "archived"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function WeeklyUpdates({ record, user }: { record: Automation; user: string }) {
  const [text, setText] = useState("");
  const [percent, setPercent] = useState(50);
  const [rag, setRag] = useState<"Red" | "Amber" | "Green">("Green");

  return (
    <div className="space-y-4">
      <section className="card-surface p-4">
        <h2 className="text-sm font-semibold">Submit weekly update</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_140px_140px_auto] md:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status comment</Label>
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">% complete</Label>
            <Input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Health (RAG)</Label>
            <Select value={rag} onValueChange={(v) => setRag(v as typeof rag)}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Green", "Amber", "Red"].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              if (!text.trim()) {
                toast.error("Add a status comment first");
                return;
              }
              actions.addUpdate(record.id, { text: text.trim(), percentComplete: percent, rag }, user);
              setText("");
              toast.success("Weekly update logged");
            }}
          >
            <Plus className="h-4 w-4" /> Log update
          </Button>
        </div>
      </section>

      {record.updates.length > 1 ? (
        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Health history</h2>
          <p className="mb-3 text-xs text-muted-foreground">Reported completion and RAG health over time</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={record.updates.map((u) => ({
                date: new Date(u.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                percent: u.percentComplete,
                rag: u.rag,
                health: u.rag === "Green" ? 3 : u.rag === "Amber" ? 2 : 1,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="p" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="h" orientation="right" domain={[0, 3]} ticks={[1, 2, 3]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v === 3 ? "Green" : v === 2 ? "Amber" : "Red")} width={56} />
                <Tooltip formatter={(v: number, n: string) => (n === "health" ? [v === 3 ? "Green" : v === 2 ? "Amber" : "Red", "Health"] : [`${v}%`, "% complete"])} />
                <Area yAxisId="p" type="monotone" dataKey="percent" name="% complete" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} />
                <Line yAxisId="h" type="stepAfter" dataKey="health" name="health" stroke="var(--chart-4)" strokeWidth={2} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <section className="card-surface">
        <ul className="divide-y divide-border">
          {[...record.updates].reverse().map((u) => (
            <li key={u.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <StatusBadge value={u.rag} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{u.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {u.submittedBy} · {new Date(u.date).toLocaleDateString()} · {u.percentComplete}% complete
                </p>
              </div>
            </li>
          ))}
          {record.updates.length === 0 ? <li className="px-4 py-8 text-center text-sm text-muted-foreground">No updates logged yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}

const REQUIRED_DOCS = ["SOP", "Business Case"];

function Documents({ record, user, docTypes }: { record: Automation; user: string; docTypes: string[] }) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState(docTypes[0] ?? "SOP");
  const [status, setStatus] = useState<"Draft" | "Under Review" | "Approved" | "Final">("Draft");
  const missing = REQUIRED_DOCS.filter((d) => !record.documents.some((doc) => doc.type === d));

  return (
    <div className="space-y-4">
      {missing.length ? (
        <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/15 px-3 py-2 text-xs text-warning-foreground">
          <AlertTriangle className="h-4 w-4" /> Missing required documents: {missing.join(", ")}
        </div>
      ) : null}

      <section className="card-surface p-4">
        <h2 className="text-sm font-semibold">Link a document</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_150px_150px_auto] md:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">File path or SharePoint URL</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Draft", "Under Review", "Approved", "Final"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              if (!name.trim() || !link.trim()) {
                toast.error("Name and link are required");
                return;
              }
              actions.addDocument(record.id, { name: name.trim(), link: link.trim(), type, status }, user);
              setName("");
              setLink("");
              toast.success("Document linked");
            }}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </section>

      {record.updates.length > 1 ? (
        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Health history</h2>
          <p className="mb-3 text-xs text-muted-foreground">Reported completion and RAG health over time</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={record.updates.map((u) => ({
                date: new Date(u.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                percent: u.percentComplete,
                rag: u.rag,
                health: u.rag === "Green" ? 3 : u.rag === "Amber" ? 2 : 1,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="p" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="h" orientation="right" domain={[0, 3]} ticks={[1, 2, 3]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v === 3 ? "Green" : v === 2 ? "Amber" : "Red")} width={56} />
                <Tooltip formatter={(v: number, n: string) => (n === "health" ? [v === 3 ? "Green" : v === 2 ? "Amber" : "Red", "Health"] : [`${v}%`, "% complete"])} />
                <Area yAxisId="p" type="monotone" dataKey="percent" name="% complete" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} />
                <Line yAxisId="h" type="stepAfter" dataKey="health" name="health" stroke="var(--chart-4)" strokeWidth={2} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <section className="card-surface">
        <ul className="divide-y divide-border">
          {record.documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <a href={d.link} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  {d.name} <ExternalLink className="h-3 w-3" />
                </a>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {d.type} · added by {d.uploadedBy} on {new Date(d.uploadedDate).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge value={d.status} />
              <button
                aria-label="Remove document"
                onClick={() => actions.removeDocument(record.id, d.id, user)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {record.documents.length === 0 ? <li className="px-4 py-8 text-center text-sm text-muted-foreground">No documents linked yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}

function Comments({ record, user }: { record: Automation; user: string }) {
  const [text, setText] = useState("");
  const timeline = [
    ...record.comments.map((c) => ({ id: c.id, timestamp: c.timestamp, user: c.user, label: c.text, kind: "Comment" })),
    ...record.history.map((h) => ({
      id: h.id,
      timestamp: h.timestamp,
      user: h.user,
      label: h.field ? `${h.action} (${h.oldValue} → ${h.newValue})` : h.action,
      kind: "Activity",
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-4">
      <section className="card-surface p-4">
        <Label className="text-xs text-muted-foreground">Add a comment</Label>
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className="mt-1.5 bg-card" />
        <Button
          className="mt-3"
          onClick={() => {
            if (!text.trim()) return;
            actions.addComment(record.id, text.trim(), user);
            setText("");
          }}
        >
          Post comment
        </Button>
      </section>
      {record.updates.length > 1 ? (
        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Health history</h2>
          <p className="mb-3 text-xs text-muted-foreground">Reported completion and RAG health over time</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={record.updates.map((u) => ({
                date: new Date(u.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                percent: u.percentComplete,
                rag: u.rag,
                health: u.rag === "Green" ? 3 : u.rag === "Amber" ? 2 : 1,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="p" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="h" orientation="right" domain={[0, 3]} ticks={[1, 2, 3]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v === 3 ? "Green" : v === 2 ? "Amber" : "Red")} width={56} />
                <Tooltip formatter={(v: number, n: string) => (n === "health" ? [v === 3 ? "Green" : v === 2 ? "Amber" : "Red", "Health"] : [`${v}%`, "% complete"])} />
                <Area yAxisId="p" type="monotone" dataKey="percent" name="% complete" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} />
                <Line yAxisId="h" type="stepAfter" dataKey="health" name="health" stroke="var(--chart-4)" strokeWidth={2} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <section className="card-surface">
        <ul className="divide-y divide-border">
          {timeline.map((t) => (
            <li key={t.id} className="flex gap-3 px-4 py-3">
              <StatusBadge value={t.kind} className={t.kind === "Comment" ? "bg-primary/10 text-primary border-primary/25" : ""} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{t.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.user} · {new Date(t.timestamp).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
