import { useEffect, useState } from "react";
import type { FieldDef } from "@/lib/fields";
import type { FieldValue } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink } from "lucide-react";

export function FieldInput({
  field,
  value,
  options,
  onCommit,
}: {
  field: FieldDef;
  value: FieldValue | undefined;
  options: string[];
  onCommit: (v: FieldValue) => void;
}) {
  const [draft, setDraft] = useState(value === null || value === undefined ? "" : String(value));

  useEffect(() => {
    setDraft(value === null || value === undefined ? "" : String(value));
  }, [value]);

  const commitText = () => {
    const next = field.type === "number" ? (draft === "" ? "" : Number(draft)) : draft;
    onCommit(next as FieldValue);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commitText} className="bg-card" />
      ) : field.type === "select" || field.type === "yesno" ? (
        <Select
          value={draft || "__empty"}
          onValueChange={(v) => {
            const next = v === "__empty" ? "" : v;
            setDraft(next);
            onCommit(next);
          }}
        >
          <SelectTrigger className="bg-card">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__empty">— Not set —</SelectItem>
            {(field.type === "yesno" ? ["Yes", "No"] : options).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-2">
          <Input
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitText}
            className="bg-card"
          />
          {field.type === "url" && draft ? (
            <a
              href={draft}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-9 items-center rounded-md border border-input px-2.5 text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
