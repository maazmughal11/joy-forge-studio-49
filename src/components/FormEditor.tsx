import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useAppData, actions } from "@/data";
import { FIELDS, SECTIONS, fieldsForStage } from "@/lib/fields";
import type { FormConfig, FormFieldConfig } from "@/domain/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FORMS = [
  { key: "idea", label: "Idea form" },
  { key: "project", label: "Project form" },
] as const;

/**
 * Administrator-only editor for how record forms are presented.
 * Labels, order, section and visibility are configurable; the underlying
 * field identity and every stored value stay exactly as they are.
 */
export function FormEditor({ readOnly }: { readOnly?: boolean }) {
  const data = useAppData();
  const [form, setForm] = useState<string>("idea");
  const config = data.settings.formConfig;

  const rows = useMemo<FormFieldConfig[]>(() => {
    const base = fieldsForStage(form);
    const saved = config?.[form]?.fields ?? [];
    const byId = new Map(saved.map((e) => [e.id, e]));
    return base
      .map((f, i) => {
        const c = byId.get(f.key);
        return {
          id: f.key,
          label: c?.label ?? f.label,
          section: c?.section ?? f.section,
          visible: c?.visible !== false,
          required: c?.required ?? !f.optional,
          order: c?.order ?? i,
        };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [form, config]);

  const save = (next: FormFieldConfig[]) => {
    const withOrder = next.map((r, i) => ({ ...r, order: i }));
    const nextConfig: FormConfig = { ...(config ?? {}), [form]: { fields: withOrder } };
    actions.setSettings({ formConfig: nextConfig });
  };

  const patch = (id: string, change: Partial<FormFieldConfig>) =>
    save(rows.map((r) => (r.id === id ? { ...r, ...change } : r)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    save(next);
  };

  const reset = () => {
    const nextConfig: FormConfig = { ...(config ?? {}) };
    delete nextConfig[form];
    actions.setSettings({ formConfig: nextConfig });
    toast.success("Form restored to its standard layout");
  };

  const sections = Array.from(new Set([...SECTIONS, ...FIELDS.map((f) => f.section)]));

  return (
    <section className="card-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Form Editor</h2>
          <p className="text-xs text-muted-foreground">
            Rename, reorder, group or hide questions. Existing information is never changed or lost.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={form} onValueChange={setForm}>
            <SelectTrigger className="w-40 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={reset} disabled={readOnly}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-md border border-border p-2">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={r.label ?? ""}
                disabled={readOnly}
                onChange={(e) => patch(r.id, { label: e.target.value })}
                className="h-8 min-w-48 flex-1 bg-card"
              />
              <Select value={r.section ?? ""} onValueChange={(v) => patch(r.id, { section: v })} disabled={!!readOnly}>
                <SelectTrigger className="h-8 w-52 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" disabled={readOnly} onClick={() => patch(r.id, { visible: !r.visible })}>
                {r.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="sm" disabled={readOnly} onClick={() => move(i, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled={readOnly} onClick={() => move(i, 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-1 flex items-center gap-3 pl-1">
              <Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={!!r.required}
                  disabled={readOnly}
                  onChange={(e) => patch(r.id, { required: e.target.checked })}
                />
                Required for completeness
              </Label>
              <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
