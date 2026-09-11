import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const MANUAL_ENTRY = "__manual__";

/**
 * A dropdown that also accepts a one-off typed value.
 *
 * Choosing "Other / Enter manually" reveals a text box. The typed value is
 * stored on the record only — the shared option list is never modified.
 */
export function ManualSelect({
  value,
  options,
  onChange,
  placeholder = "Select…",
  id,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  /* A standalone "Other" is redundant next to the manual-entry choice below. */
  const list = options.filter((o) => o.trim().toLowerCase() !== "other");
  const known = value === "" || list.includes(value);
  const [manual, setManual] = useState(!known);

  return (
    <div className="space-y-2">
      <Select
        value={manual ? MANUAL_ENTRY : value}
        onValueChange={(v) => {
          if (v === MANUAL_ENTRY) {
            setManual(true);
            onChange("");
          } else {
            setManual(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger id={id} className="bg-card">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {list.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
          <SelectItem value={MANUAL_ENTRY}>Other / Enter manually…</SelectItem>
        </SelectContent>
      </Select>
      {manual ? (
        <Input
          autoFocus
          className="bg-card"
          value={value}
          placeholder="Type a value"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}
