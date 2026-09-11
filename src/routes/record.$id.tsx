import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ExternalLink, Plus, Trash2, AlertTriangle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { StageProgress } from "@/components/StageProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { FieldInput } from "@/components/FieldInput";
import { useAppData, useAutomation, actions } from "@/data";
import { SECTIONS, applyFormConfig, completeness, fieldsForStage, priorityFromScoring } from "@/lib/fields";
import { approvalDaysWaiting, moveBlockers, nameOf } from "@/lib/derive";
import { ApprovalDialog, type ApprovalDraft } from "@/components/ApprovalDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssignTaskDialog } from "@/components/AssignTaskDialog";
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

const RAG_STROKE: Record<string, string> = {
  Green: "var(--rag-green)",
  Amber: "var(--rag-amber)",
  Red: "var(--rag-red)",
};

function RagDot(props: any) {
  const rag = props.payload?.rag as string | undefined;
  const fill = RAG_STROKE[rag ?? ""] ?? "var(--muted-foreground)";
  return <circle cx={props.cx} cy={props.cy} r={4} fill={fill} stroke="var(--card)" strokeWidth={1.5} />;
}

function RecordPage() {
  const { id } = Route.useParams();
  const data = useAppData();
  const record = useAutomation(id);
  const navigate = useNavigate();
  const { user, can, account } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

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
  // Administrators can relabel, reorder and hide fields without touching data.
  const fields = applyFormConfig(
    fieldsForStage(record.stage),
    data.settings.formConfig,
    record.stage === "idea" ? "idea" : "project",
  );
  const blockers = moveBlockers(record);

  return (
    <AppShell
      title={nameOf(record)}
      subtitle={`${record.category} · ${record.stage} · last modified by ${record.modifiedBy} on ${new Date(record.modifiedDate).toLocaleString()}`}
      actions={
        <>
          {record.stage === "idea" ? (
            <Button onClick={() => setMoveOpen(true)}>
              Move to Project Tracking <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4" /> Assign Task
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </>
      }
    >
      <AssignTaskDialog open={assignOpen} onOpenChange={setAssignOpen} assignedBy={user} defaultRecordId={record.id} />

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Project Tracking?</DialogTitle>
          </DialogHeader>
          {blockers.length ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>The following recommended requirements are currently incomplete:</p>
              <ul className="list-inside list-disc">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p>You may still move this idea to Project Tracking if you want to continue.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <b>{nameOf(record)}</b> will move from Idea Tracking to Project Tracking.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                actions.moveToProject(record.id, user);
                setMoveOpen(false);
                toast.success("Moved to Project Tracking");
                navigate({ to: "/projects" });
              }}
            >
              {blockers.length ? "Confirm Move Anyway" : "Confirm"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this record?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <b>{nameOf(record)}</b> and its weekly updates, approvals, comments, documents and history will be removed
            from the shared database for everyone. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                actions.deleteRecord(record.id, user);
                setDeleteOpen(false);
                toast.success("Record deleted");
                navigate({ to: "/ideas" });
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete record
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="card-surface mb-4 p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Created by {record.createdBy} on {new Date(record.createdDate).toLocaleString()} · Last modified by{" "}
          {record.modifiedBy} on {new Date(record.modifiedDate).toLocaleString()}
        </p>
        <StageProgress record={record} />
        {record.stage === "idea" && blockers.length ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/50 bg-warning/15 p-3 text-xs text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Recommended before moving to Project Tracking:</p>
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
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
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

          <TabsContent value="approvals">
            <RecordApprovals record={record} user={user} />
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

/**
 * Weekly updates inside a record use exactly the same fields and the same
 * stored data as the Weekly Updates menu — an update logged here appears
 * there immediately, and the other way round.
 */
function WeeklyUpdates({ record, user }: { record: Automation; user: string }) {
  const [text, setText] = useState("");
  const [percent, setPercent] = useState(50);
  const [rag, setRag] = useState<"Red" | "Amber" | "Green">("Green");
  const [accomplishments, setAccomplishments] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [blockers, setBlockers] = useState("");
  const [decisions, setDecisions] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const submit = () => {
    if (!text.trim()) {
      toast.error("Add a status comment first");
      return;
    }
    actions.addUpdate(
      record.id,
      {
        text: text.trim(),
        percentComplete: percent,
        rag,
        accomplishments: accomplishments.trim(),
        nextSteps: nextSteps.trim(),
        blockers: blockers.trim(),
        decisions: decisions.trim(),
      },
      user,
    );
    setText("");
    setAccomplishments("");
    setNextSteps("");
    setBlockers("");
    setDecisions("");
    toast.success("Weekly update logged");
  };

  return (
    <div className="space-y-4">
      <section className="card-surface p-4">
        <h2 className="text-sm font-semibold">Submit weekly update</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Weekly updates are optional and shared with the Weekly Updates menu.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
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
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Accomplishments this week</Label>
            <Textarea rows={2} value={accomplishments} onChange={(e) => setAccomplishments(e.target.value)} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Next steps</Label>
            <Textarea rows={2} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Blockers / risks</Label>
            <Textarea rows={2} value={blockers} onChange={(e) => setBlockers(e.target.value)} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Decisions needed</Label>
            <Textarea rows={2} value={decisions} onChange={(e) => setDecisions(e.target.value)} className="bg-card" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={submit}>
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
                <Line yAxisId="h" type="stepAfter" dataKey="health" name="health" stroke="var(--muted-foreground)" strokeWidth={2} dot={<RagDot />} />
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
                {editing === u.id ? (
                  <div className="space-y-2">
                    <Textarea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} className="bg-card" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          actions.editUpdate(record.id, u.id, { text: editText.trim() }, user);
                          setEditing(null);
                          toast.success("Weekly update edited");
                        }}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{u.text}</p>
                    {u.accomplishments ? <p className="mt-1 text-xs"><span className="text-muted-foreground">Accomplishments: </span>{u.accomplishments}</p> : null}
                    {u.nextSteps ? <p className="text-xs"><span className="text-muted-foreground">Next steps: </span>{u.nextSteps}</p> : null}
                    {u.blockers ? <p className="text-xs"><span className="text-muted-foreground">Blockers: </span>{u.blockers}</p> : null}
                    {u.decisions ? <p className="text-xs"><span className="text-muted-foreground">Decisions needed: </span>{u.decisions}</p> : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {u.submittedBy} · {new Date(u.date).toLocaleDateString()} · {u.percentComplete}% complete
                    </p>
                  </>
                )}
              </div>
              {editing === u.id ? null : (
                <Button size="sm" variant="ghost" onClick={() => { setEditing(u.id); setEditText(u.text); }}>
                  Edit
                </Button>
              )}
            </li>
          ))}
          {record.updates.length === 0 ? <li className="px-4 py-8 text-center text-sm text-muted-foreground">No updates logged yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}

/**
 * Approvals inside a record. Linked to this automation and written to the
 * same approval data the Approvals menu reads.
 */
function RecordApprovals({ record, user }: { record: Automation; user: string }) {
  const [draft, setDraft] = useState<ApprovalDraft | null>(null);
  const approvals = record.approvals ?? [];

  return (
    <div className="space-y-4">
      <section className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">Approvals for this automation</h2>
          <p className="text-xs text-muted-foreground">Everything added here also appears in the Approvals menu.</p>
        </div>
        <Button onClick={() => setDraft({ automationId: record.id, subject: nameOf(record) })}>
          <Plus className="h-4 w-4" /> Track Approval
        </Button>
      </section>

      <section className="card-surface">
        <ul className="divide-y divide-border">
          {approvals.map((ap) => (
            <li key={ap.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <StatusBadge value={ap.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {ap.type}
                  {ap.stage ? ` · ${ap.stage}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Approver: {ap.approver} · Requested {ap.requestedDate} by {ap.requestedBy} · {approvalDaysWaiting(ap)} days waiting
                  {ap.decisionDate ? ` · Decided ${ap.decisionDate}` : ""}
                </p>
                {ap.decisionComments ? <p className="mt-1 text-xs">{ap.decisionComments}</p> : null}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setDraft({ approval: ap, automationId: record.id, subject: nameOf(record) })}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (!window.confirm(`Remove the "${ap.type}" approval? This cannot be undone.`)) return;
                    actions.deleteApproval(record.id, ap.id, user);
                    toast.success("Approval removed");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
          {approvals.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">No approvals tracked for this record yet.</li>
          ) : null}
        </ul>
      </section>

      <ApprovalDialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)} draft={draft ?? {}} lockAutomation />
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
                <Line yAxisId="h" type="stepAfter" dataKey="health" name="health" stroke="var(--muted-foreground)" strokeWidth={2} dot={<RagDot />} />
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
                <Line yAxisId="h" type="stepAfter" dataKey="health" name="health" stroke="var(--muted-foreground)" strokeWidth={2} dot={<RagDot />} />
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
