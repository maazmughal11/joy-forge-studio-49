import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Lightbulb,
  FolderKanban,
  Boxes,
  BarChart3,
  UserCheck,
  Settings as SettingsIcon,
  Search,
} from "lucide-react";
import logoAsset from "@/assets/smurfit-westrock-logo.png.asset.json";
import { hydrate, useAppData, actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/ideas", label: "Idea Tracking", icon: Lightbulb },
  { to: "/projects", label: "Project Tracking", icon: FolderKanban },
  { to: "/production", label: "Production Library", icon: Boxes },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/my-work", label: "My Work", icon: UserCheck },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ title, subtitle, actions: pageActions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const data = useAppData();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            AC
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Automation CoE</p>
            <p className="text-[11px] text-sidebar-foreground/60">Portfolio Tracker</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="mb-3 flex items-center justify-center rounded-md bg-white px-3 py-2 shadow-sm">
            <img src={logoAsset.url} alt="Smurfit Westrock" className="h-6 w-auto object-contain" />
          </div>
          <p className="text-[11px] text-sidebar-foreground/60">Offline mode · data stored locally</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-surface-strong/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-6 py-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 flex-1 min-w-52 max-w-md items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-ring"
            >
              <Search className="h-4 w-4" />
              Search opportunities, owners, SMEs…
              <kbd className="ml-auto rounded border border-border px-1.5 text-[10px]">⌘K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Signed in as</span>
              <Select value={data.settings.currentUser} onValueChange={(v) => actions.setCurrentUser(v)}>
                <SelectTrigger className="h-9 w-48 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.settings.users.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 px-6 pb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">{pageActions}</div>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search by name, owner, SME, analyst, division, technology…" />
        <CommandList>
          <CommandEmpty>No matching records.</CommandEmpty>
          <CommandGroup heading="Automations">
            {data.automations.map((a) => (
              <CommandItem
                key={a.id}
                value={[
                  a.data['opportunityName'],
                  a.data['businessOwner'],
                  a.data['processSme'],
                  a.data['businessAnalyst'],
                  a.data['division'],
                  a.data['technology'],
                ]
                  .filter(Boolean)
                  .join(" ")}
                onSelect={() => {
                  setSearchOpen(false);
                  navigate({ to: "/record/$id", params: { id: a.id } });
                }}
              >
                <span className="font-medium">{String(a.data['opportunityName'] ?? "Untitled")}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {String(a.data['division'] ?? "")} · {a.stage}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <div className="fixed bottom-4 right-4 md:hidden">
        <Button size="sm" variant="secondary" onClick={() => setSearchOpen(true)}>
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>
    </div>
  );
}
