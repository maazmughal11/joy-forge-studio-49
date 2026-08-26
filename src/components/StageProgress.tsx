import { LIFECYCLE, currentLifecycleStep } from "@/lib/fields";
import type { Automation } from "@/domain/models";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function StageProgress({ record }: { record: Automation }) {
  const step = currentLifecycleStep(record);
  return (
    <div className="flex w-full items-center overflow-x-auto pb-1">
      {LIFECYCLE.map((label, i) => (
        <div key={label} className="flex shrink-0 items-center">
          <div className="flex w-28 shrink-0 flex-col items-center gap-1.5 px-2">
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
            <span className={cn("w-full text-center text-[11px] leading-tight break-words", i === step ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
          </div>
          {i < LIFECYCLE.length - 1 ? (
            <div className={cn("-mx-1 h-0.5 w-6 shrink-0 self-start mt-3.5", i < step ? "bg-success" : "bg-border")} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
