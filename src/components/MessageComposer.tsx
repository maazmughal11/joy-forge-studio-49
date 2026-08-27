import { useMemo, useState } from "react";
import { Link2, Search, Send, X } from "lucide-react";
import { toast } from "sonner";
import { actions, useAppData } from "@/data";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Automation } from "@/domain/models";

const labelOf = (a: Automation) =>
  `${String(a.data['automationId'] ?? a.id)} · ${String(a.data['opportunityName'] ?? "Untitled opportunity")}`;

export function MessageComposer({
  open,
  onOpenChange,
  defaultRecipient,
  defaultRecordId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipient?: string;
  defaultRecordId?: string;
}) {
  const data = useAppData();
  const { user } = useAuth();
  const [to, setTo] = useState(defaultRecipient ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [recordId, setRecordId] = useState(defaultRecordId ?? "");

  const recipients = data.accounts
    .filter((a) => a.active && a.displayName !== user)
    .map((a) => a.displayName);

  const selected = data.automations.find((a) => a.id === recordId);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return data.automations
      .filter((a) => a.stage !== "archived")
      .filter((a) =>
        [a.data['automationId'], a.data['legacyAutomationCode'], a.data['opportunityName'], a.data['businessOwner'], a.data['businessAnalyst']]
          .map((v) => String(v ?? "").toLowerCase())
          .some((v) => v.includes(q)),
      )
      .slice(0, 6);
  }, [query, data.automations]);

  const reset = () => {
    setTo(defaultRecipient ?? "");
    setSubject("");
    setBody("");
    setQuery("");
    setRecordId(defaultRecordId ?? "");
  };

  const send = () => {
    if (!to) return toast.error("Choose a recipient");
    if (!subject.trim()) return toast.error("Add a subject");
    if (!body.trim()) return toast.error("Add a message");
    actions.sendMessage({
      from: user,
      to,
      subject: subject.trim(),
      body: body.trim(),
      ...(selected ? { recordId: selected.id, recordLabel: labelOf(selected) } : {}),
    });
    toast.success(`Message sent to ${to}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send a message</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>To</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {recipients.length === 0 ? (
              <p className="text-xs text-muted-foreground">No other active users yet — add them in Settings → Users &amp; Permissions.</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Please review the business case" />
          </div>

          <div className="space-y-1.5">
            <Label>Reference an automation (optional)</Label>
            {selected ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm">
                <Link2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{labelOf(selected)}</span>
                <button type="button" onClick={() => setRecordId("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by automation ID, name or owner…"
                  />
                </div>
                {results.length > 0 ? (
                  <ul className="max-h-44 overflow-auto rounded-md border border-border">
                    {results.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setRecordId(a.id);
                            setQuery("");
                            if (!subject) setSubject(String(a.data['opportunityName'] ?? ""));
                          }}
                        >
                          <span className="block font-mono text-[11px] text-muted-foreground">{String(a.data['automationId'] ?? a.id)}</span>
                          <span className="block truncate font-medium">{String(a.data['opportunityName'] ?? "Untitled")}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={send}>
              <Send className="h-4 w-4" /> Send message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
