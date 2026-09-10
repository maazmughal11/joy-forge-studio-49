import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppData } from "@/data";
import { autoId, legacyCode, nameOf, stageLabel } from "@/lib/derive";
import { cn } from "@/lib/utils";
import type { Automation } from "@/domain/models";

/**
 * Searchable automation selector.
 *
 * Shared by Weekly Updates and Approvals so both always pick from exactly the
 * same portfolio list, whether the form is opened from the main menu or from
 * inside a record.
 */
export function AutomationPicker({
  value,
  onChange,
  allowNone = false,
  noneLabel = "Not linked to an automation",
  filter,
  placeholder = "Search by ID, name, owner or analyst…",
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  filter?: (a: Automation) => boolean;
  placeholder?: string;
}) {
  const data = useAppData();
  const [open, setOpen] = useState(false);

  const records = useMemo(
    () => data.automations.filter((a) => a.stage !== "archived" && (!filter || filter(a))),
    [data.automations, filter],
  );
  const selected = records.find((a) => a.id === value) ?? data.automations.find((a) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between bg-card font-normal">
          <span className="flex min-w-0 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selected ? `${autoId(selected)} — ${nameOf(selected)}` : value === null && allowNone ? noneLabel : "Select an automation"}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(38rem,90vw)] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No matching automation.</CommandEmpty>
            <CommandGroup>
              {allowNone ? (
                <CommandItem
                  value="not linked unlinked none"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === null ? "opacity-100" : "opacity-0")} />
                  {noneLabel}
                </CommandItem>
              ) : null}
              {records.map((a) => (
                <CommandItem
                  key={a.id}
                  value={[autoId(a), legacyCode(a), nameOf(a), String(a.data['businessOwner'] ?? ""), String(a.data['businessAnalyst'] ?? "")]
                    .filter(Boolean)
                    .join(" ")}
                  onSelect={() => {
                    onChange(a.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mt-1 h-4 w-4 self-start", value === a.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-muted-foreground">{autoId(a)}</p>
                    <p className="truncate font-medium">{nameOf(a)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.category} · {stageLabel(a)} · Analyst: {String(a.data['businessAnalyst'] ?? "Unassigned")}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
