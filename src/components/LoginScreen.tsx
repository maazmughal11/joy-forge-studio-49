import { useEffect, useMemo, useState } from "react";
import { Lock, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import logoAsset from "@/assets/smurfit-westrock-logo-light2.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, useAppData } from "@/data";
import { authService } from "@/services/auth-service";
import { isValidPin, suggestUsername, useSession } from "@/lib/auth";
import type { UserAccount } from "@/domain/models";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar px-4 text-sidebar-foreground">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 -right-32 h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
    </div>
  );
}

function Branding({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-8 text-center">
      <img src={logoAsset.url} alt="Smurfit Westrock" className="mx-auto h-8 w-auto object-contain" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Automation CoE</h1>
      <p className="text-sm text-sidebar-foreground/60">{subtitle}</p>
    </div>
  );
}

/* ---------------- First run: create administrator ---------------- */

function SetupScreen() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const suggested = suggestUsername(first, last);
  const effectiveUsername = touched ? username : suggested;

  const submit = async () => {
    setError("");
    if (!first.trim() || !last.trim()) return setError("Enter a first and last name.");
    if (!effectiveUsername) return setError("A username is required.");
    if (!isValidPin(pin)) return setError("The PIN must be exactly 4 digits.");
    if (pin !== confirm) return setError("The PINs do not match.");
    setBusy(true);
    try {
      const account = await authService.createAccount(
        {
          firstName: first.trim(),
          lastName: last.trim(),
          username: effectiveUsername,
          pin,
          role: "Administrator",
        },
        `${first.trim()} ${last.trim()}`,
      );
      actions.logAudit(account.displayName, "Administrator account created (first run)", account.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    }
    setBusy(false);
  };

  return (
    <Backdrop>
      <Branding subtitle="First-time setup" />
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-6 shadow-2xl backdrop-blur">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Create administrator account
        </h2>
        <p className="mt-1 text-xs text-sidebar-foreground/60">
          This one-time setup creates the first administrator. Additional users are added later in Settings.
        </p>
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fn" className="text-xs">First name</Label>
              <Input id="fn" value={first} onChange={(e) => setFirst(e.target.value)} className="mt-1 bg-card text-foreground" />
            </div>
            <div>
              <Label htmlFor="ln" className="text-xs">Last name</Label>
              <Input id="ln" value={last} onChange={(e) => setLast(e.target.value)} className="mt-1 bg-card text-foreground" />
            </div>
          </div>
          <div>
            <Label htmlFor="un" className="text-xs">Username</Label>
            <Input
              id="un"
              value={effectiveUsername}
              placeholder="firstname.lastname"
              onChange={(e) => {
                setTouched(true);
                setUsername(e.target.value.toLowerCase());
              }}
              className="mt-1 bg-card font-mono text-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p1" className="text-xs">4-digit PIN</Label>
              <Input
                id="p1"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 bg-card text-center tracking-[0.5em] text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="p2" className="text-xs">Confirm PIN</Label>
              <Input
                id="p2"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 bg-card text-center tracking-[0.5em] text-foreground"
              />
            </div>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={busy} onClick={submit}>
            <UserPlus className="h-4 w-4" /> Create administrator
          </Button>
        </div>
      </div>
    </Backdrop>
  );
}

/* ---------------- Sign in / unlock ---------------- */

function SignInScreen({ lockedAccount }: { lockedAccount?: UserAccount | null }) {
  const data = useAppData();
  const [username, setUsername] = useState(lockedAccount?.username ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (lockedAccount) setUsername(lockedAccount.username);
  }, [lockedAccount]);

  const display = useMemo(
    () => data.accounts.find((a) => a.username === username.trim().toLowerCase()) ?? null,
    [data.accounts, username],
  );

  const submit = async () => {
    setError("");
    const uname = username.trim().toLowerCase();
    if (!uname || !pin) return setError("Enter your username and PIN.");
    setBusy(true);
    const result = lockedAccount
      ? uname === lockedAccount.username
        ? await authService.unlock(lockedAccount.id, pin)
        : ({ ok: false, error: "Incorrect username or PIN." } as const)
      : await authService.signIn(uname, pin);
    if (!result.ok) {
      actions.logAudit(display?.displayName ?? uname, "Failed login", `username: ${uname}`);
      setPin("");
      setError(result.error);
    }
    setBusy(false);
  };

  const avatarName = lockedAccount?.displayName ?? display?.displayName ?? "";

  return (
    <Backdrop>
      <Branding subtitle="Portfolio Tracker" />
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground shadow-lg">
            {avatarName ? initials(avatarName) : <Lock className="h-6 w-6" />}
          </div>
          <p className="mt-3 text-sm font-medium">{avatarName || "Sign in to continue"}</p>
          {lockedAccount ? <p className="text-xs text-sidebar-foreground/60">Session locked — enter your PIN</p> : null}
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <Label htmlFor="login-user" className="text-xs">Username</Label>
            <Input
              id="login-user"
              autoFocus={!lockedAccount}
              readOnly={!!lockedAccount}
              value={username}
              placeholder="firstname.lastname"
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="mt-1 bg-card font-mono text-foreground"
            />
          </div>
          <div>
            <Label htmlFor="login-pin" className="text-xs">PIN or password</Label>
            <Input
              id="login-pin"
              autoFocus={!!lockedAccount}
              type="password"
              maxLength={32}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="mt-1 bg-card text-center text-lg tracking-[0.6em] text-foreground"
            />
          </div>
          {error ? <p className="text-xs text-destructive animate-in fade-in">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            <LogIn className="h-4 w-4" /> {busy ? "Verifying…" : "Sign In"}
          </Button>
          {lockedAccount ? (
            <button
              type="button"
              onClick={() => authService.signOut()}
              className="w-full text-center text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              Sign in as a different user
            </button>
          ) : null}
        </form>
      </div>
      <p className="mt-6 text-center text-[11px] text-sidebar-foreground/40">
        Automation Center of Excellence · Portfolio Tracker
      </p>
    </Backdrop>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const data = useAppData();
  const [mounted, setMounted] = useState(false);
  const session = useSession();

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen bg-sidebar" />;
  if (data.accounts.length === 0) return <SetupScreen />;

  const account = session ? data.accounts.find((a) => a.id === session.userId) ?? null : null;
  if (!session || !account || !account.active) return <SignInScreen />;
  if (session.locked) return <SignInScreen lockedAccount={account} />;

  return <div className="animate-in fade-in duration-300">{children}</div>;
}
