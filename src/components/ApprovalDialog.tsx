import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutomationPicker } from "@/components/AutomationPicker";
import { ManualSelect } from "@/components/ManualSelect";
import { actions, isReadOnly, useAppData } from "@/data";
import { useAuth } from "@/hooks/useAuth";
import { APPROVAL_STAGES, APPROVAL_TYPES, type Approval, type ApprovalStatus } from "@/domain/models";

export type ApprovalDraft = {
  /** Existing approval being edited, if any. */
  approval?: Approval;
  /** Automation the approval belongs to; null means centrally tracked. */
  automationId?: string | null;
  subject?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * One approval form for the whole application.
 *
 * The Approvals menu and the Approvals section inside a record both use this
 * dialog and write to the same approval data, so the two views can never
 * disagree.
 */
export function ApprovalDialog({
  open,
  onOpenChange,
  draft,
  lockAutomation = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ApprovalDraft;
  /** Opened from inside a record: the linked automation cannot be changed. */
  lockAutomation?: boolean;
}) {
  const data = useAppData();
  const { user } = useAuth();
  const readOnly = isReadOnly();
  const options = data.settings.options as Record<string, string[]>;
  const existing = draft.approval;

  const [automationId, setAutomationId] = useState<string | null>(draft.automationId ?? null);
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [type, setType] = useState(existing?.type ?? "");
  const [stage, setStage] = useState(existing?.stage ?? "");
  const [status, setStatus] = useState<ApprovalStatus>(existing?.status ?? "Pending");
  const [approver, setApprover] = useState(existing?.approver ?? "");
  const [requestedBy, setRequestedBy] = useState(existing?.requestedBy ?? user);
  const [requestedDate, setRequestedDate] = useState(existing?.requestedDate ?? today());
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");
  const [decisionDate, setDecisionDate] = useState(existing?.decisionDate ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [comments, setComments] = useState(existing?.decisionComments ?? "");
  const [evidence, setEvidence] = useState(existing?.evidenceLink ?? "");

  // Re-seed the form whenever a different approval is opened.
  useEffect(() => {
    if (!open) return;
    setAutomationId(draft.automationId ?? null);
    setSubject(draft.subject ?? "");
    setType(existing?.type ?? "");
    setStage(existing?.stage ?? "");
    setStatus(existing?.status ?? "Pending");
    setApprover(existing?.approver ?? "");
    setRequestedBy(existing?.requestedBy ?? user);
    setRequestedDate(existing?.requestedDate ?? today());
    setDueDate(existing?.dueDate ?? "");
    setDecisionDate(existing?.decisionDate ?? "");
    setDescription(existing?.description ?? "");
    setComments(existing?.decisionComments ?? "");
    setEvidence(existing?.evidenceLink ?? "");
  }, [open, draft, existing, user]);

  const people = options['users'] ?? [];

  const save = () => {
    if (readOnly) return;
    if (!type.trim()) {
      toast.error("Approval Type is required.");
      return;
    }
    if (!approver.trim()) {
      toast.error("Approver is required.");
      return;
    }
    if (!automationId && !subject.trim()) {
      toast.error("Enter what this approval is for.");
      return;
    }

    const decided = status !== "Pending";
    const payload = {
      type: type.trim(),
      stage: stage.trim(),
      status,
      approver: approver.trim(),
      requestedBy: requestedBy.trim() || user,
      requestedDate: requestedDate || today(),
      dueDate,
      decisionDate: decided ? decisionDate || today() : "",
      description: description.trim(),
      decisionComments: comments.trim(),
      evidenceLink: evidence.trim(),
    };

    if (existing) {
      if (automationId) actions.updateApproval(automationId, existing.id, payload, user);
      else actions.updateUnlinkedApproval(existing.id, payload, user);
      toast.success("Approval updated.");
    } else if (automationId) {
      actions.addApproval(automationId, payload, user);
      toast.success("Approval tracked against the automation.");
    } else {
      actions.addUnlinkedApproval({ ...payload, subject: subject.trim() }, user);
      toast.success("Approval tracked.");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Approval" : "Track Approval"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!lockAutomation ? (
            <div className="space-y-1.5">
              <Label>Linked automation</Label>
              <AutomationPicker value={automationId} onChange={setAutomationId} allowNone />
              {!automationId ? (
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="ap-subject">What is this approval for?</Label>
                  <Input
                    id="ap-subject"
                    className="bg-card"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Finance bot funding request"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ap-type">Approval Type</Label>
              <ManualSelect
                id="ap-type"
                value={type}
                options={options['approvalTypes'] ?? [...APPROVAL_TYPES]}
                onChange={setType}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-stage">Approval Stage</Label>
              <ManualSelect
                id="ap-stage"
                value={stage}
                options={options['approvalStages'] ?? [...APPROVAL_STAGES]}
                onChange={setStage}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-approver">Approver</Label>
              <ManualSelect id="ap-approver" value={approver} options={people} onChange={setApprover} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-requestedby">Requested by</Label>
              <ManualSelect id="ap-requestedby" value={requestedBy} options={people} onChange={setRequestedBy} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-requested">Requested date</Label>
              <Input id="ap-requested" type="date" className="bg-card" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-due">Due date</Label>
              <Input id="ap-due" type="date" className="bg-card" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ApprovalStatus)}>
                <SelectTrigger id="ap-status" className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Pending", "Approved", "Rejected"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-decision">Decision date</Label>
              <Input
                id="ap-decision"
                type="date"
                className="bg-card"
                value={decisionDate}
                disabled={status === "Pending"}
                onChange={(e) => setDecisionDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-desc">Description</Label>
            <Textarea id="ap-desc" className="bg-card" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-comments">Decision comments</Label>
            <Textarea id="ap-comments" className="bg-card" rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-evidence">Approval evidence (link)</Label>
            <Input id="ap-evidence" className="bg-card" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={readOnly}>
            {existing ? "Save Approval" : "Track Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
