import { LIFECYCLE, currentLifecycleStep } from "@/lib/fields";
import type { Automation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function StageProgress({ record }: { record: Automation }) {
  const step = currentLifecycleStep(record);
  return (
    <div className="flex w-full items-center overflow-x-auto pb-1">
      {LIFECYCLE.map((label, i) => (
        <div key={label} className="flex min-w-0 flex-1 items-center">
          <div className="flex min-w-24 flex-col items-center gap-1.5 px-1">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                i < step && "border-success bg-success text-success-foreground",
                i === step && "border-primary bg-primary text-primary-foreground",
                i > step && "border-border bg-card text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn("text-center text-[11px] leading-tight", i === step ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
          </div>
          {i < LIFECYCLE.length - 1 ? (
            <div className={cn("h-0.5 flex-1", i < step ? "bg-success" : "bg-border")} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
