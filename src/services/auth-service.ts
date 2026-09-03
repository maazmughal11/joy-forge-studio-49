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
  ALL_PERMISSIONS,
  BUILTIN_ADMIN_PASSWORD,
  BUILTIN_ADMIN_USERNAME,
  authSession,
  can,
  clearFailures,
  hashPin,
  hydrateSession,
  isBuiltinAdmin,
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

const PROTECTED_ACCOUNT_ERROR = "The built-in administrator account cannot be modified.";

export const authService = {
  /* ---------- session lifecycle ---------- */
  restoreSession: () => hydrateSession(),
  getSession: (): Session => authSession.get(),
  lock: () => authSession.lock(),
  signOut: () => authSession.signOut(),

  /* ---------- accounts ---------- */
  listAccounts: async () => (await repositories.users.getUsers()).filter((a) => !a.deleted),
  hasAdministrator: async () => {
    const accounts = await repositories.users.getUsers();
    return accounts.some((a) => a.role === "Administrator" && a.active);
  },

  /**
   * Guarantees the permanent built-in administrator exists with full
   * permissions. Runs on every launch so the account can never be lost.
   */
  async ensureBuiltinAdmin(): Promise<UserAccount> {
    const existing = await repositories.users.getUserByUsername(BUILTIN_ADMIN_USERNAME);
    if (existing) {
      const needsFix =
        !existing.active ||
        existing.role !== "Administrator" ||
        existing.permissions.length !== ALL_PERMISSIONS.length;
      if (needsFix) {
        await repositories.users.updateUser(
          existing.id,
          { active: true, role: "Administrator", permissions: [...ALL_PERMISSIONS] },
          "System",
        );
      }
      return existing;
    }
    const pinSalt = newSalt();
    const pinHash = await hashPin(BUILTIN_ADMIN_PASSWORD, pinSalt);
    return repositories.users.createUser(
      {
        firstName: "System",
        lastName: "Administrator",
        username: BUILTIN_ADMIN_USERNAME,
        pinHash,
        pinSalt,
        role: "Administrator",
        permissions: [...ALL_PERMISSIONS],
      },
      "System",
    );
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

  /** True when the account is the permanent built-in administrator. */
  async isProtected(accountId: string) {
    const accounts = await repositories.users.getUsers();
    return isBuiltinAdmin(accounts.find((a) => a.id === accountId));
  },

  async resetPin(accountId: string, pin: string, actor: string) {
    if (await this.isProtected(accountId)) throw new Error(PROTECTED_ACCOUNT_ERROR);
    if (!isValidPin(pin)) throw new Error("PIN must be exactly 4 digits.");
    const pinSalt = newSalt();
    const pinHash = await hashPin(pin, pinSalt);
    await repositories.users.updateUser(accountId, { pinHash, pinSalt }, actor, "PIN reset");
  },

  async setActive(accountId: string, active: boolean, actor: string, detail?: string) {
    if (await this.isProtected(accountId)) throw new Error(PROTECTED_ACCOUNT_ERROR);
    return repositories.users.updateUser(
      accountId,
      { active },
      actor,
      active ? "User activated" : "User deactivated",
      detail,
    );
  },

  /**
   * Deletes a user account. Historical data the person created — records,
   * approvals, weekly updates, tasks, comments and the audit trail — is always
   * preserved; only their ability to sign in is removed.
   */
  async deleteAccount(accountId: string, actor: string) {
    if (await this.isProtected(accountId)) throw new Error(PROTECTED_ACCOUNT_ERROR);
    return repositories.users.deleteUser(accountId, actor);
  },

  async updateAccount(accountId: string, patch: Partial<UserAccount>, actor: string, auditAction?: string, detail?: string) {
    if (await this.isProtected(accountId)) throw new Error(PROTECTED_ACCOUNT_ERROR);
    return repositories.users.updateUser(accountId, patch, actor, auditAction, detail);
  },

  /* ---------- sign in / unlock ---------- */
  async signIn(username: string, pin: string): Promise<SignInResult> {
    const delay = throttleDelay(username);
    if (delay > 0) await sleep(delay);

    const account = await repositories.users.getUserByUsername(username.trim());
    if (!account) {
      registerFailure(username);
      return { ok: false, error: "Incorrect username or PIN." };
    }
    if (account.deleted) return { ok: false, error: "This account no longer exists." };
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
