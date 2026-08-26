/**
 * AuthService — the single place that owns authentication, session lifecycle
 * and permission evaluation.
 *
 * React components must not implement authentication logic themselves: they
 * call these methods and read the session through `useAuth()`.
 * Credentials are persisted through the Users repository (`@/data`), so the
 * service works unchanged against any storage provider.
 */

import { repositories } from "@/data";
import {
  authSession,
  can,
  clearFailures,
  hashPin,
  hydrateSession,
  isValidPin,
  newSalt,
  registerFailure,
  throttleDelay,
  verifyPin,
  type Session,
} from "@/lib/auth";
import type { Role, UserAccount } from "@/domain/models";

export type SignInResult =
  | { ok: true; account: UserAccount }
  | { ok: false; error: string; retryAfterMs?: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const authService = {
  /* ---------- session lifecycle ---------- */
  restoreSession: () => hydrateSession(),
  getSession: (): Session => authSession.get(),
  lock: () => authSession.lock(),
  signOut: () => authSession.signOut(),

  /* ---------- accounts ---------- */
  listAccounts: () => repositories.users.getUsers(),
  hasAdministrator: async () => {
    const accounts = await repositories.users.getUsers();
    return accounts.some((a) => a.role === "Administrator" && a.active);
  },

  async createAccount(
    input: { firstName: string; lastName: string; username: string; pin: string; role: Role; permissions?: string[] },
    actor: string,
  ): Promise<UserAccount> {
    if (!isValidPin(input.pin)) throw new Error("PIN must be exactly 4 digits.");
    const existing = await repositories.users.getUserByUsername(input.username);
    if (existing) throw new Error("That username is already taken.");
    const pinSalt = newSalt();
    const pinHash = await hashPin(input.pin, pinSalt);
    return repositories.users.createUser(
      {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        pinHash,
        pinSalt,
        role: input.role,
        ...(input.permissions ? { permissions: input.permissions } : {}),
      },
      actor,
    );
  },

  async resetPin(accountId: string, pin: string, actor: string) {
    if (!isValidPin(pin)) throw new Error("PIN must be exactly 4 digits.");
    const pinSalt = newSalt();
    const pinHash = await hashPin(pin, pinSalt);
    await repositories.users.updateUser(accountId, { pinHash, pinSalt }, actor, "PIN reset");
  },

  setActive: (accountId: string, active: boolean, actor: string, detail?: string) =>
    repositories.users.updateUser(
      accountId,
      { active },
      actor,
      active ? "User activated" : "User deactivated",
      detail,
    ),

  updateAccount: (accountId: string, patch: Partial<UserAccount>, actor: string, auditAction?: string, detail?: string) =>
    repositories.users.updateUser(accountId, patch, actor, auditAction, detail),

  /* ---------- sign in / unlock ---------- */
  async signIn(username: string, pin: string): Promise<SignInResult> {
    const delay = throttleDelay(username);
    if (delay > 0) await sleep(delay);

    const account = await repositories.users.getUserByUsername(username.trim());
    if (!account) {
      registerFailure(username);
      return { ok: false, error: "Incorrect username or PIN." };
    }
    if (!account.active) return { ok: false, error: "This account has been deactivated." };

    const valid = await verifyPin(pin, account);
    if (!valid) {
      const attempts = registerFailure(username);
      return {
        ok: false,
        error: attempts >= 3 ? "Incorrect PIN. Further attempts are being slowed down." : "Incorrect username or PIN.",
      };
    }

    clearFailures(username);
    await repositories.users.recordLogin(account.id);
    authSession.signIn(account.id);
    return { ok: true, account };
  },

  async unlock(accountId: string, pin: string): Promise<SignInResult> {
    const accounts = await repositories.users.getUsers();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return { ok: false, error: "Session account no longer exists." };
    const valid = await verifyPin(pin, account);
    if (!valid) {
      registerFailure(account.username);
      return { ok: false, error: "Incorrect PIN." };
    }
    clearFailures(account.username);
    authSession.unlock();
    return { ok: true, account };
  },

  /* ---------- authorization ---------- */
  can: (account: UserAccount | null | undefined, permission: string) => can(account, permission),
};

export type { Session } from "@/lib/auth";
