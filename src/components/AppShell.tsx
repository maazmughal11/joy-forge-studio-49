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
  Table2,
  Stamp,
  CalendarClock,
  Database,
  Lock,
  LogOut,
  UserRound,
  ShieldAlert,
  MessageSquare,
  Send,
} from "lucide-react";
import logoUrl from "@/assets/smurfit-westrock-logo-light2.png";
import { useAppData, actions, initializeData } from "@/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthGate } from "@/components/LoginScreen";
import { PERMISSION_LABELS } from "@/lib/auth";
import { authService } from "@/services/auth-service";
import { useAuth } from "@/hooks/useAuth";
import { MessageComposer } from "@/components/MessageComposer";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, permission: null },
  { to: "/portfolio", label: "Portfolio", icon: Table2, permission: "portfolio.view" },
  { to: "/ideas", label: "Idea Tracking", icon: Lightbulb, permission: "ideas.view" },
  { to: "/projects", label: "Project Tracking", icon: FolderKanban, permission: "projects.view" },
  { to: "/production", label: "Production Library", icon: Boxes, permission: "production.view" },
  { to: "/approvals", label: "Approvals", icon: Stamp, permission: "approvals.view" },
  { to: "/weekly-updates", label: "Weekly Updates", icon: CalendarClock, permission: "updates.view" },
  { to: "/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
  { to: "/my-work", label: "My Work", icon: UserCheck, permission: null },
  { to: "/messages", label: "Messages", icon: MessageSquare, permission: null },
  { to: "/settings", label: "Settings", icon: SettingsIcon, permission: "settings.manage" },
] as const;

const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

export function AppShell(props: { title: string; subtitle?: string; actions?: ReactNode; requires?: string; children: ReactNode }) {
  useEffect(() => {
    initializeData();
    void authService.ensureBuiltinAdmin();
    authService.restoreSession();
  }, []);
  return (
    <AuthGate>
      <Shell {...props} />
    </AuthGate>
  );
}

function Shell({ title, subtitle, actions: pageActions, requires, children }: { title: string; subtitle?: string; actions?: ReactNode; requires?: string; children: ReactNode }) {
  const data = useAppData();
  const { account, can } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDialog, setProfileDialog] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const currentUserName = account?.displayName ?? data.settings.currentUser;
  const unreadMessages = (data.messages ?? []).filter((m) => m.to === currentUserName && !m.readAt).length;


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

  // Global search obeys the same authorization rules as normal navigation.
  const searchableRecords = data.automations.filter((a) =>
    a.stage === "idea"
      ? can("ideas.view")
      : a.stage === "production"
        ? can("production.view")
        : can("projects.view"),
  );

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
          {NAV.filter((item) => !item.permission || can(item.permission)).map((item) => {
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
          <div className="flex items-center justify-center py-1">
            <img src={logoUrl} alt="Smurfit Westrock" className="h-7 w-auto object-contain" />
          </div>
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
              <Button variant="outline" size="sm" onClick={() => setComposeOpen(true)} title="Send a message">
                <Send className="h-4 w-4" /> Message
              </Button>
              <Link
                to="/messages"
                title="Messages"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              >
                <MessageSquare className="h-4 w-4" />
                {unreadMessages > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {unreadMessages}
                  </span>
                ) : null}
              </Link>
              {can("settings.manage") ? (
                <Link
                  to="/settings"
                  title="Portfolio data connection"
                  className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-ring lg:inline-flex"
                >
                  <Database className="h-3.5 w-3.5 text-primary" />
                  {data.settings.storageMode === "shared" ? "Connected — Shared Workspace" : "Local Workspace"}
                </Link>
              ) : null}
              <Popover open={profileOpen} onOpenChange={setProfileOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:border-ring">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {initialsOf(account?.displayName ?? "?")}
                    </span>
                    <span className="leading-tight">
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Signed in as</span>
                      <span className="block text-sm font-medium">{account?.displayName}</span>
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-60 p-2">
                  <div className="px-2 py-2">
                    <p className="text-sm font-medium">{account?.displayName}</p>
                    <p className="text-xs text-muted-foreground">{account?.role}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{account?.username}</p>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => { setProfileOpen(false); setProfileDialog(true); }}
                  >
                    <UserRound className="h-4 w-4" /> My Profile
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => { setProfileOpen(false); authService.lock(); }}
                  >
                    <Lock className="h-4 w-4" /> Lock
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                    onClick={() => {
                      setProfileOpen(false);
                      if (account) actions.logAudit(account.displayName, "Sign out", account.username);
                      authService.signOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </PopoverContent>
              </Popover>
            </div>

          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 px-6 pb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">{requires && !can(requires) ? null : pageActions}</div>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">
          {requires && !can(requires) ? (
            <div className="card-surface mx-auto max-w-md p-8 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-3 text-base font-semibold">You don't have access to this area</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask an administrator to grant the “{PERMISSION_LABELS[requires] ?? requires}” permission to your account.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <MessageComposer open={composeOpen} onOpenChange={setComposeOpen} />

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search ID, legacy code, name, owner, SME, analyst, division, technology, PAS #…" />
        <CommandList>
          <CommandEmpty>No matching records.</CommandEmpty>
          <CommandGroup heading="Automations">
            {searchableRecords.map((a) => (
              <CommandItem
                key={a.id}
                value={[
                  a.data['automationId'],
                  a.data['legacyAutomationCode'],
                  a.data['opportunityName'],
                  a.data['businessOwner'],
                  a.data['processSme'],
                  a.data['businessAnalyst'],
                  a.data['division'],
                  a.data['functionalArea'],
                  a.data['technology'],
                  a.data['pasNumber'],
                  a.data['demandNumber'],
                ]
                  .filter(Boolean)
                  .join(" ")}
                onSelect={() => {
                  setSearchOpen(false);
                  navigate({ to: "/record/$id", params: { id: a.id } });
                }}
              >
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="truncate text-xs font-mono text-muted-foreground">
                    {String(a.data['automationId'] ?? a.id)}
                    {a.data['legacyAutomationCode'] ? ` · Legacy ${String(a.data['legacyAutomationCode'])}` : ""}
                  </p>
                  <p className="truncate font-medium">{String(a.data['opportunityName'] ?? "Untitled")}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.category} · {String(a.data['projectStatus'] ?? a.data['opportunityStatus'] ?? "")} —{" "}
                    {String(a.data['division'] ?? "")} · {String(a.data['technology'] ?? "")} · Owner:{" "}
                    {String(a.data['businessOwner'] ?? "Unassigned")}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
          </DialogHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{account?.displayName}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Username</dt><dd className="font-mono">{account?.username}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Role</dt><dd>{account?.role}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd>{account?.active ? "Active" : "Inactive"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Last login</dt><dd>{account?.lastLogin ? new Date(account.lastLogin).toLocaleString() : "—"}</dd></div>
          </dl>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Effective permissions</p>
            <div className="flex flex-wrap gap-1.5">
              {(account?.role === "Administrator" ? ["All application permissions"] : account?.permissions ?? []).map((p) => (
                <span key={p} className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px]">{p}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setProfileDialog(false); authService.lock(); }}>
              <Lock className="h-4 w-4" /> Lock
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setProfileDialog(false);
                if (account) actions.logAudit(account.displayName, "Sign out", account.username);
                authService.signOut();
              }}
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-4 right-4 md:hidden">
        <Button size="sm" variant="secondary" onClick={() => setSearchOpen(true)}>
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>
    </div>
  );
}
