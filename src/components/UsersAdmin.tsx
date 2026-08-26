import { useState } from "react";
import { KeyRound, Plus, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/data";
import { authService } from "@/services/auth-service";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, ROLE_PERMISSIONS, isValidPin, suggestUsername } from "@/lib/auth";
import type { Role, UserAccount } from "@/domain/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES: Role[] = ["Administrator", "Editor", "Viewer"];

export function UsersAdmin({ actor }: { actor: string }) {
  const data = useAppData();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [pinFor, setPinFor] = useState<UserAccount | null>(null);

  return (
    <section className="card-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UserCog className="h-4 w-4 text-primary" /> Users &amp; permissions
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Local accounts sign in with a <span className="font-mono">firstname.lastname</span> username and a 4-digit PIN.
            PINs are stored as salted hashes — never in plain text.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add user
        </Button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/70 text-left text-muted-foreground">
            <tr>
              {["Name", "Username", "Role", "Permissions", "Last login", "Active", ""].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((a) => (
              <tr key={a.id} className="border-t border-border/70">
                <td className="px-3 py-2 font-medium">{a.displayName}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.username}</td>
                <td className="px-3 py-2"><StatusBadge value={a.role} /></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {a.role === "Administrator" ? "All permissions" : `${a.permissions.length} of ${ALL_PERMISSIONS.length}`}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{a.lastLogin ? new Date(a.lastLogin).toLocaleString() : "Never"}</td>
                <td className="px-3 py-2">
                  <Switch
                    checked={a.active}
                    onCheckedChange={(v) =>
                      authService.setActive(a.id, v, actor, a.username)
                    }
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(a)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPinFor(a)}>
                    <KeyRound className="h-3.5 w-3.5" /> Reset PIN
                  </Button>
                </td>
              </tr>
            ))}
            {data.accounts.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No accounts yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} actor={actor} />
      <EditUserDialog account={editing} onClose={() => setEditing(null)} actor={actor} />
      <ResetPinDialog account={pinFor} onClose={() => setPinFor(null)} actor={actor} />
    </section>
  );
}

function AddUserDialog({ open, onClose, actor }: { open: boolean; onClose: () => void; actor: string }) {
  const data = useAppData();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [role, setRole] = useState<Role>("Editor");
  const [pin, setPin] = useState("");
  const username = suggestUsername(first, last);

  const submit = async () => {
    if (!first.trim() || !last.trim()) { toast.error("First and last name are required"); return; }
    if (!isValidPin(pin)) { toast.error("PIN must be exactly 4 digits"); return; }
    if (data.accounts.some((a) => a.username === username)) { toast.error("That username already exists"); return; }
    try {
      await authService.createAccount({ firstName: first.trim(), lastName: last.trim(), username, pin, role }, actor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the user");
      return;
    }
    toast.success(`${first} ${last} can now sign in as ${username}`);
    setFirst(""); setLast(""); setPin(""); setRole("Editor");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fn">First name</Label>
              <Input id="fn" className="mt-1" value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ln">Last name</Label>
              <Input id="ln" className="mt-1" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Username</Label>
            <p className="mt-1 rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-sm">{username || "firstname.lastname"}</p>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {role === "Administrator" ? "Full access including user management." : `${ROLE_PERMISSIONS[role].length} default permissions — tune them after creating the user.`}
            </p>
          </div>
          <div>
            <Label htmlFor="pin">Temporary 4-digit PIN</Label>
            <Input id="pin" className="mt-1 font-mono tracking-[0.5em]" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          </div>
          <Button onClick={submit}>Create user</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ account, onClose, actor }: { account: UserAccount | null; onClose: () => void; actor: string }) {
  const [role, setRole] = useState<Role>(account?.role ?? "Editor");
  const [perms, setPerms] = useState<string[]>(account?.permissions ?? []);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  if (account && loadedId !== account.id) {
    setLoadedId(account.id);
    setRole(account.role);
    setPerms(account.permissions);
  }

  const toggle = (key: string) =>
    setPerms((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {account ? (
          <>
            <DialogHeader><DialogTitle>{account.displayName} — role &amp; permissions</DialogTitle></DialogHeader>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-52">
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => { setRole(v as Role); setPerms([...ROLE_PERMISSIONS[v as Role]]); }}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPerms([...ROLE_PERMISSIONS[role]])}>
                <ShieldCheck className="h-4 w-4" /> Reset to role defaults
              </Button>
            </div>

            {role === "Administrator" ? (
              <p className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                Administrators always hold every permission.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {PERMISSION_GROUPS.map((g) => (
                  <div key={g.group}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</p>
                    <div className="space-y-1.5">
                      {g.items.map((i) => (
                        <label key={i.key} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={perms.includes(i.key)} onCheckedChange={() => toggle(i.key)} />
                          {i.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  authService.updateAccount(
                    account.id,
                    { role, permissions: role === "Administrator" ? [...ALL_PERMISSIONS] : perms },
                    actor,
                    "Permissions updated",
                    `${account.username} · ${role}`,
                  );
                  toast.success("Permissions saved");
                  onClose();
                }}
              >
                Save changes
              </Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ResetPinDialog({ account, onClose, actor }: { account: UserAccount | null; onClose: () => void; actor: string }) {
  const [pin, setPin] = useState("");

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        {account ? (
          <>
            <DialogHeader><DialogTitle>Reset PIN — {account.displayName}</DialogTitle></DialogHeader>
            <Label htmlFor="npin">New 4-digit PIN</Label>
            <Input
              id="npin"
              className="font-mono tracking-[0.5em]"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
            <Button
              onClick={async () => {
                if (!isValidPin(pin)) { toast.error("PIN must be exactly 4 digits"); return; }
                await authService.resetPin(account.id, pin, actor);
                toast.success("PIN reset");
                setPin("");
                onClose();
              }}
            >
              Reset PIN
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
