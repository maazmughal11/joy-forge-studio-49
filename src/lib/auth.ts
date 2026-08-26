import { useSyncExternalStore } from "react";
import type { Role, UserAccount } from "./types";

/* ---------------- Permissions ---------------- */

export const PERMISSION_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "Portfolio",
    items: [
      { key: "portfolio.view", label: "View Portfolio" },
      { key: "production.view", label: "View Production Library" },
    ],
  },
  {
    group: "Ideas",
    items: [
      { key: "ideas.view", label: "View Ideas" },
      { key: "ideas.create", label: "Create Idea" },
      { key: "ideas.edit", label: "Edit Idea" },
      { key: "ideas.archive", label: "Archive Idea" },
      { key: "ideas.move", label: "Move Idea to Project" },
    ],
  },
  {
    group: "Projects",
    items: [
      { key: "projects.view", label: "View Projects" },
      { key: "projects.create", label: "Create Project" },
      { key: "projects.edit", label: "Edit Project" },
    ],
  },
  {
    group: "Weekly Updates",
    items: [
      { key: "updates.view", label: "View Weekly Updates" },
      { key: "updates.submit", label: "Submit Weekly Update" },
      { key: "updates.edit", label: "Edit Weekly Update" },
    ],
  },
  {
    group: "Approvals & Comments",
    items: [
      { key: "approvals.view", label: "View Approvals" },
      { key: "approvals.manage", label: "Manage Approval" },
      { key: "comments.add", label: "Add Comments" },
    ],
  },
  {
    group: "Reports & Data",
    items: [
      { key: "reports.view", label: "View Reports" },
      { key: "reports.export", label: "Export Reports" },
      { key: "export.view", label: "Export Current View" },
      { key: "export.full", label: "Export Full Portfolio" },
      { key: "import.portfolio", label: "Import Portfolio" },
    ],
  },
  {
    group: "Administration",
    items: [
      { key: "users.manage", label: "Manage Users" },
      { key: "permissions.manage", label: "Manage Permissions" },
      { key: "reference.manage", label: "Manage Reference Data" },
      { key: "settings.manage", label: "Manage Settings" },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);

const VIEWER: string[] = [
  "portfolio.view",
  "production.view",
  "ideas.view",
  "projects.view",
  "updates.view",
  "approvals.view",
  "reports.view",
];

const EDITOR: string[] = [
  ...VIEWER,
  "ideas.create",
  "ideas.edit",
  "ideas.move",
  "projects.create",
  "projects.edit",
  "updates.submit",
  "updates.edit",
  "comments.add",
  "reports.export",
  "export.view",
];

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  Administrator: [...ALL_PERMISSIONS],
  Editor: EDITOR,
  Viewer: VIEWER,
};

export function can(account: UserAccount | null | undefined, permission: string): boolean {
  if (!account || !account.active) return false;
  if (account.role === "Administrator") return true;
  return (account.permissions ?? ROLE_PERMISSIONS[account.role] ?? []).includes(permission);
}

/** Centralized guard: throws when the caller lacks the permission. */
export function assertPermission(account: UserAccount | null | undefined, permission: string) {
  if (!can(account, permission)) {
    throw new Error(`Not authorized: ${PERMISSION_LABELS[permission] ?? permission}`);
  }
}

/* ---------------- Username / PIN ---------------- */

export const suggestUsername = (first: string, last: string) =>
  `${first}.${last}`
    .toLowerCase()
    .replace(/[^a-z.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

/** PBKDF2-SHA256 derivation — the raw PIN is never stored. */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 120_000, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function verifyPin(pin: string, account: UserAccount): Promise<boolean> {
  const hash = await hashPin(pin, account.pinSalt);
  return hash === account.pinHash;
}

/* ---------------- Failed attempt throttling ---------------- */

const attempts = new Map<string, { count: number; last: number }>();

export function throttleDelay(username: string) {
  const rec = attempts.get(username.toLowerCase());
  if (!rec || rec.count < 3) return 0;
  return Math.min(8000, (rec.count - 2) * 1500);
}

export function registerFailure(username: string) {
  const key = username.toLowerCase();
  const rec = attempts.get(key) ?? { count: 0, last: 0 };
  rec.count += 1;
  rec.last = Date.now();
  attempts.set(key, rec);
  return rec.count;
}

export function clearFailures(username: string) {
  attempts.delete(username.toLowerCase());
}

/* ---------------- Session ---------------- */

export type Session = { userId: string; locked: boolean; startedAt: string } | null;

const SESSION_KEY = "rpa-auth-session-v1";
let session: Session = null;
let sessionHydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function persistSession() {
  if (typeof window === "undefined") return;
  try {
    if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function hydrateSession() {
  if (sessionHydrated || typeof window === "undefined") return;
  sessionHydrated = true;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw) session = JSON.parse(raw) as Session;
  } catch {
    /* ignore */
  }
  emit();
}

export const authSession = {
  signIn(userId: string) {
    session = { userId, locked: false, startedAt: new Date().toISOString() };
    persistSession();
    emit();
  },
  lock() {
    if (session) session = { ...session, locked: true };
    persistSession();
    emit();
  },
  unlock() {
    if (session) session = { ...session, locked: false };
    persistSession();
    emit();
  },
  signOut() {
    session = null;
    persistSession();
    emit();
  },
  get() {
    return session;
  },
};

export function useSession(): Session {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
    () => null,
  );
}
