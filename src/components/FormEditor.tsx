import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useAppData, actions } from "@/data";
import { SECTIONS, fieldsForStage, formSections } from "@/lib/fields";
import type { FormConfig, FormFieldConfig } from "@/domain/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FORMS = [
  { key: "idea", label: "Idea form" },
  { key: "project", label: "Project form" },
] as const;

const NEW_FIELD_TYPES = [
  { key: "text", label: "Short text" },
  { key: "textarea", label: "Long text" },
  { key: "number", label: "Number" },
  { key: "date", label: "Date" },
  { key: "yesno", label: "Yes / No" },
  { key: "select", label: "Dropdown" },
  { key: "url", label: "Link" },
] as const;

/**
 * Administrator-only editor for how record forms are presented.
 * Labels, order, section and visibility are configurable; the underlying
 * field identity and every stored value stay exactly as they are.
 */
export function FormEditor({ readOnly }: { readOnly?: boolean }) {
  const data = useAppData();
  const [form, setForm] = useState<string>("idea");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<string>("text");
  const [newSection, setNewSection] = useState<string>(SECTIONS[0]);
  const config = data.settings.formConfig;

  const sections = useMemo(() => formSections(config, form), [config, form]);
  const rows = useMemo<FormFieldConfig[]>(() => {
    const base = fieldsForStage(form);
    const saved = config?.[form]?.fields ?? [];
    const byId = new Map(saved.map((e) => [e.id, e]));
    const standard = new Set(base.map((f) => f.key));
    const fromBase = base.map((f, i) => {
      const c = byId.get(f.key);
      return {
        id: f.key,
        label: c?.label ?? f.label,
        section: c?.section ?? f.section,
        visible: c?.visible !== false,
        required: c?.required ?? !f.optional,
        order: c?.order ?? i,
        type: f.type,
        optionKey: c?.optionKey ?? f.optionKey,
      } as FormFieldConfig;
    });
    const custom = saved.filter((e) => e.custom && !standard.has(e.id));
    return [...fromBase, ...custom].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [form, config]);

  const save = (next: FormFieldConfig[]) => {
    const withOrder = next.map((r, i) => ({ ...r, order: i }));
    const nextConfig: FormConfig = { ...(config ?? {}), [form]: { fields: withOrder, sectionOrder: sections } };
    actions.setSettings({ formConfig: nextConfig });
  };

  const saveAll = (nextRows: FormFieldConfig[], nextSections: string[]) => {
    const withOrder = nextRows.map((r, i) => ({ ...r, order: i }));
    actions.setSettings({ formConfig: { ...(config ?? {}), [form]: { fields: withOrder, sectionOrder: nextSections } } });
  };

  const [newSectionName, setNewSectionName] = useState("");
  const addSection = () => {
    const name = newSectionName.trim();
    if (!name || sections.includes(name)) return;
    saveAll(rows, [...sections, name]);
    setNewSectionName("");
    toast.success(`Section "${name}" added`);
  };
  const renameSection = (oldName: string) => {
    const name = window.prompt("Rename section", oldName)?.trim();
    if (!name || name === oldName) return;
    if (sections.includes(name)) return void toast.error("A section with that name already exists");
    saveAll(
      rows.map((r) => (r.section === oldName ? { ...r, section: name } : r)),
      sections.map((x) => (x === oldName ? name : x)),
    );
  };
  const moveSection = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= sections.length) return;
    const next = [...sections];
    [next[i], next[t]] = [next[t]!, next[i]!];
    saveAll(rows, next);
  };
  const removeSection = (name: string) => {
    if (!window.confirm(`Remove section "${name}"? Its questions are hidden; existing information is kept.`)) return;
    saveAll(
      rows.filter((r) => !(r.custom && r.section === name)).map((r) => (r.section === name ? { ...r, visible: false } : r)),
      sections.filter((x) => x !== name),
    );
  };
  const setDropdown = (r: FormFieldConfig, text: string) => {
    const key = r.optionKey ?? `custom_${r.id}`;
    const values = Array.from(new Set(text.split(/\n|,/).map((v) => v.trim()).filter(Boolean)));
    actions.setOptionList(key, values);
    if (!r.optionKey) patch(r.id, { optionKey: key });
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

  const remove = (row: FormFieldConfig) => {
    if (row.custom) {
      save(rows.filter((r) => r.id !== row.id));
      toast.success(`"${row.label}" removed from this form`);
      return;
    }
    save(rows.map((r) => (r.id === row.id ? { ...r, visible: false } : r)));
    toast.success(`"${row.label}" removed from this form — existing information is kept`);
  };

  const addField = () => {
    const label = newLabel.trim();
    if (!label) return;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const id = `custom_${slug || Date.now()}`;
    if (rows.some((r) => r.id === id)) {
      toast.error("A field with that name already exists on this form");
      return;
    }
    const entry: FormFieldConfig = {
      id,
      label,
      section: newSection,
      type: newType,
      ...(newType === "select" ? { optionKey: `custom_${id}` } : {}),
      visible: true,
      required: false,
      custom: true,
    };
    const index = rows.map((r) => r.section).lastIndexOf(newSection);
    const next = [...rows];
    next.splice(index >= 0 ? index + 1 : next.length, 0, entry);
    save(next);
    setNewLabel("");
    toast.success(`"${label}" added to ${newSection}`);
  };

  const reset = () => {
    const nextConfig: FormConfig = { ...(config ?? {}) };
    delete nextConfig[form];
    actions.setSettings({ formConfig: nextConfig });
    toast.success("Form restored to its standard layout");
  };


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

      <div className="mt-4 rounded-md border border-border p-3">
        <p className="text-xs font-medium">Sections</p>
        <ul className="mt-2 space-y-1">
          {sections.map((sec, i) => (
            <li key={sec} className="flex items-center gap-1 text-sm">
              <span className="flex-1">{sec}</span>
              <Button variant="ghost" size="sm" disabled={readOnly} onClick={() => renameSection(sec)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" disabled={readOnly} onClick={() => moveSection(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" disabled={readOnly} onClick={() => moveSection(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="text-destructive" disabled={readOnly} onClick={() => removeSection(sec)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <Input value={newSectionName} disabled={readOnly} placeholder="New section name…" onChange={(e) => setNewSectionName(e.target.value)} className="h-8 bg-card" />
          <Button size="sm" disabled={readOnly || !newSectionName.trim()} onClick={addSection}><Plus className="h-3.5 w-3.5" /> Add section</Button>
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
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={readOnly}
                onClick={() => remove(r)}
              >
                <Trash2 className="h-4 w-4" />
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
              {r.custom ? (
                <Select value={r.type ?? "text"} onValueChange={(v) => patch(r.id, { type: v, ...(v === "select" && !r.optionKey ? { optionKey: `custom_${r.id}` } : {}) })} disabled={!!readOnly}>
                  <SelectTrigger className="h-7 w-32 bg-card text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NEW_FIELD_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}
              <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
            </div>
            {r.type === "select" && r.optionKey !== "users" ? (
              <div className="mt-2 pl-1">
                <Label className="text-[11px] text-muted-foreground">Dropdown choices (comma separated)</Label>
                <Input
                  key={`${r.id}-${(data.settings.options[r.optionKey ?? `custom_${r.id}`] ?? []).join("|")}`}
                  defaultValue={(data.settings.options[r.optionKey ?? `custom_${r.id}`] ?? []).join(", ")}
                  disabled={readOnly}
                  onBlur={(e) => setDropdown(r, e.target.value)}
                  className="mt-1 h-8 bg-card"
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-md border border-dashed border-border p-3">
        <p className="text-xs font-medium">Add a new question</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            value={newLabel}
            disabled={readOnly}
            placeholder="Question label…"
            onChange={(e) => setNewLabel(e.target.value)}
            className="h-8 min-w-48 flex-1 bg-card"
          />
          <Select value={newSection} onValueChange={setNewSection} disabled={!!readOnly}>
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
          <Select value={newType} onValueChange={setNewType} disabled={!!readOnly}>
            <SelectTrigger className="h-8 w-36 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NEW_FIELD_TYPES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={readOnly || !newLabel.trim()} onClick={addField}>
            <Plus className="h-3.5 w-3.5" /> Add field
          </Button>
        </div>
      </div>
    </section>
  );
}
