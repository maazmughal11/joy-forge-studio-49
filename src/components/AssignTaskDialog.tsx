import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppData, actions } from "@/data";
import { autoId, nameOf } from "@/lib/derive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaskPriority } from "@/domain/models";

/**
 * Assign a task to a colleague, optionally referencing an automation.
 * The task appears immediately in that person's My Work and Home screen.
 */
export function AssignTaskDialog({
  open,
  onOpenChange,
  assignedBy,
  defaultRecordId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignedBy: string;
  defaultRecordId?: string;
}) {
  const data = useAppData();
  const [assignee, setAssignee] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [recordId, setRecordId] = useState(defaultRecordId ?? "none");
  const [search, setSearch] = useState("");

  const people = data.accounts
    .filter((a) => a.active && !a.deleted && a.displayName !== assignedBy)
    .map((a) => a.displayName);

  const records = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.automations.filter((a) => a.stage !== "archived");
    const matched = q
      ? list.filter((a) => `${nameOf(a)} ${autoId(a)}`.toLowerCase().includes(q))
      : list;
    return matched.slice(0, 40);
  }, [data.automations, search]);

  const reset = () => {
    setAssignee("");
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setDueDate("");
    setRecordId(defaultRecordId ?? "none");
    setSearch("");
  };

  const submit = () => {
    if (!assignee) return toast.error("Choose who the task is for");
    if (!title.trim()) return toast.error("Give the task a title");
    const record = data.automations.find((a) => a.id === recordId);
    actions.createTask({
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      assignedTo: assignee,
      assignedBy,
      ...(record ? { recordId: record.id, recordLabel: `${autoId(record)} — ${nameOf(record)}` } : {}),
      priority,
      ...(dueDate ? { dueDate } : {}),
    });
    toast.success(`Task assigned to ${assignee}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign a task</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Assign to</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a team member" /></SelectTrigger>
              <SelectContent>
                {people.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="task-title">Task</Label>
            <Input id="task-title" className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Complete the business case for AP invoice matching" />
          </div>

          <div>
            <Label htmlFor="task-desc">Details (optional)</Label>
            <Textarea id="task-desc" className="mt-1" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["High", "Medium", "Low"] as TaskPriority[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" className="mt-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="task-search">Related automation (optional)</Label>
            <Input
              id="task-search"
              className="mt-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by automation ID or name…"
            />
            <Select value={recordId} onValueChange={setRecordId}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="No automation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No automation</SelectItem>
                {records.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{autoId(a)} — {nameOf(a)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Assign task</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
