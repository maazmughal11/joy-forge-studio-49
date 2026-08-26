import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, Columns3, Download, FileSpreadsheet } from "lucide-react";
import type { Automation } from "@/domain/models";
import { completeness } from "@/lib/fields";
import { nameOf } from "@/lib/derive";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { downloadCsv, downloadExcel } from "@/lib/export";

export type Column = {
  key: string;
  label: string;
  width?: string;
  badge?: boolean;
  mono?: boolean;
  value: (a: Automation) => string | number;
};

export function RecordTable({
  records,
  columns,
  filterKeys = [],
  emptyMessage = "No records match the current filters.",
  exportName,
  columnPicker = false,
  defaultHidden = [],
  initialFilters,
  canExport = true,
  onRowsChange,
}: {
  records: Automation[];
  columns: Column[];
  filterKeys?: { key: string; label: string; value: (a: Automation) => string }[];
  emptyMessage?: string;
  exportName?: string;
  columnPicker?: boolean;
  defaultHidden?: string[];
  initialFilters?: Record<string, string>;
  canExport?: boolean;
  onRowsChange?: (rows: Automation[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "modified", dir: -1 });
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters ?? {});
  const [hidden, setHidden] = useState<string[]>(defaultHidden);

  useEffect(() => {
    if (initialFilters) setFilters(initialFilters);
  }, [initialFilters]);

  const visibleColumns = useMemo(() => columns.filter((c) => !hidden.includes(c.key)), [columns, hidden]);

  const filterOptions = useMemo(
    () =>
      filterKeys.map((f) => ({
        ...f,
        options: Array.from(new Set(records.map(f.value).filter(Boolean))).sort(),
      })),
    [filterKeys, records],
  );

  const rows = useMemo(() => {
    let out = records;
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((a) => Object.values(a.data).some((v) => String(v ?? "").toLowerCase().includes(q)));
    }
    for (const f of filterKeys) {
      const val = filters[f.key];
      if (val && val !== "__all") out = out.filter((a) => f.value(a) === val);
    }
    const col = columns.find((c) => c.key === sort.key);
    return [...out].sort((a, b) => {
      if (!col) return (new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime()) * (sort.dir === -1 ? 1 : -1);
      const av = col.value(a);
      const bv = col.value(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv)) * sort.dir;
    });
  }, [records, query, filters, sort, columns, filterKeys]);

  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  const exportRows = () => ({
    headers: [...visibleColumns.map((c) => c.label), "Data Completeness %"],
    body: rows.map((a) => [...visibleColumns.map((c) => c.value(a)), completeness(a).percent]),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter records…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-64 bg-card"
        />
        {filterOptions.map((f) => (
          <Select
            key={f.key}
            value={filters[f.key] ?? "__all"}
            onValueChange={(v) => setFilters((prev) => ({ ...prev, [f.key]: v }))}
          >
            <SelectTrigger className="h-9 w-44 bg-card">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All {f.label}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{rows.length} records</span>
          {columnPicker ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="h-4 w-4" /> Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="max-h-80 w-60 overflow-y-auto">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Visible columns</p>
                <div className="space-y-2">
                  {columns.map((c, i) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!hidden.includes(c.key)}
                        disabled={i === 0}
                        onCheckedChange={(v) =>
                          setHidden((prev) => (v ? prev.filter((k) => k !== c.key) : [...prev, c.key]))
                        }
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
          {exportName && canExport ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const { headers, body } = exportRows();
                  downloadCsv(`${exportName}-${new Date().toISOString().slice(0, 10)}`, headers, body);
                }}
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const { headers, body } = exportRows();
                  downloadExcel(`${exportName}-${new Date().toISOString().slice(0, 10)}`, headers, body);
                }}
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-left">
              {visibleColumns.map((c) => (
                <th key={c.key} className="px-3 py-2.5 font-medium text-muted-foreground" style={{ width: c.width }}>
                  <button
                    className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
                    onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === 1 ? -1 : 1 }))}
                  >
                    {c.label}
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
              ))}
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Complete</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const c = completeness(a);
              return (
                <tr key={a.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                  {visibleColumns.map((col, i) => (
                    <td key={col.key} className="px-3 py-2.5 align-middle">
                      {i === 0 ? (
                        <Link to="/record/$id" params={{ id: a.id }} className="font-medium text-primary hover:underline">
                          {col.key === "name" ? nameOf(a) : String(col.value(a) || nameOf(a))}
                        </Link>
                      ) : col.badge ? (
                        <StatusBadge value={String(col.value(a) || "")} />
                      ) : (
                        <span className={col.mono ? "font-mono text-xs text-foreground/85" : "text-foreground/85"}>
                          {String(col.value(a) || "—")}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <div className="flex w-28 items-center gap-2">
                      <Progress value={c.percent} className="h-1.5" />
                      <span className="text-xs tabular-nums text-muted-foreground">{c.percent}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-3 py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
