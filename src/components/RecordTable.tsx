import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown } from "lucide-react";
import type { Automation } from "@/lib/types";
import { completeness } from "@/lib/fields";
import { nameOf } from "@/lib/derive";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export type Column = {
  key: string;
  label: string;
  width?: string;
  badge?: boolean;
  value: (a: Automation) => string | number;
};

export function RecordTable({
  records,
  columns,
  filterKeys = [],
  emptyMessage = "No records match the current filters.",
}: {
  records: Automation[];
  columns: Column[];
  filterKeys?: { key: string; label: string; value: (a: Automation) => string }[];
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "modified", dir: -1 });
  const [filters, setFilters] = useState<Record<string, string>>({});

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
      out = out.filter((a) =>
        Object.values(a.data).some((v) => String(v ?? "").toLowerCase().includes(q)),
      );
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
        <span className="ml-auto text-sm text-muted-foreground">{rows.length} records</span>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-left">
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2.5 font-medium text-muted-foreground" style={{ width: c.width }}>
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() =>
                      setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === 1 ? -1 : 1 }))
                    }
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
                  {columns.map((col, i) => (
                    <td key={col.key} className="px-3 py-2.5 align-middle">
                      {i === 0 ? (
                        <Link to="/record/$id" params={{ id: a.id }} className="font-medium text-primary hover:underline">
                          {nameOf(a)}
                        </Link>
                      ) : col.badge ? (
                        <StatusBadge value={String(col.value(a) || "")} />
                      ) : (
                        <span className="text-foreground/85">{String(col.value(a) || "—")}</span>
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
                <td colSpan={columns.length + 1} className="px-3 py-10 text-center text-muted-foreground">
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
