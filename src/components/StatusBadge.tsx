import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  Production: "bg-success/15 text-success border-success/30",
  Deployed: "bg-success/15 text-success border-success/30",
  Green: "bg-success/15 text-success border-success/30",
  Development: "bg-info/15 text-info border-info/30",
  Requirements: "bg-primary/10 text-primary border-primary/25",
  UAT: "bg-accent text-accent-foreground border-accent-foreground/20",
  Hypercare: "bg-chart-3/20 text-warning-foreground border-chart-3/40",
  "On Hold": "bg-warning/25 text-warning-foreground border-warning/50",
  Amber: "bg-warning/25 text-warning-foreground border-warning/50",
  Cancelled: "bg-neutral/25 text-neutral-foreground border-neutral/40",
  Archived: "bg-neutral/25 text-neutral-foreground border-neutral/40",
  Red: "bg-destructive/15 text-destructive border-destructive/30",
  Ideation: "bg-secondary text-secondary-foreground border-border",
  "Initial Assessment": "bg-primary/10 text-primary border-primary/25",
  "Deep Dive": "bg-info/15 text-info border-info/30",
  "Business Case Approved": "bg-success/15 text-success border-success/30",
  High: "bg-destructive/15 text-destructive border-destructive/30",
  Medium: "bg-warning/25 text-warning-foreground border-warning/50",
  Low: "bg-secondary text-secondary-foreground border-border",
};

export function StatusBadge({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[value] ?? "bg-secondary text-secondary-foreground border-border",
        className,
      )}
    >
      {value}
    </span>
  );
}
