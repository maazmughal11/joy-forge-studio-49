import { useCallback } from "react";
import { useAppData } from "@/lib/store";
import { can, useSession, type Session } from "@/lib/auth";
import type { UserAccount } from "@/lib/types";

export type AuthState = {
  session: Session;
  account: UserAccount | null;
  /** Display name used for record attribution. */
  user: string;
  can: (permission: string) => boolean;
  isAdmin: boolean;
};

export function useAuth(): AuthState {
  const data = useAppData();
  const session = useSession();
  const account = session ? data.accounts.find((a) => a.id === session.userId) ?? null : null;
  const check = useCallback((permission: string) => can(account, permission), [account]);
  return {
    session,
    account,
    user: account?.displayName ?? data.settings.currentUser,
    can: check,
    isAdmin: account?.role === "Administrator",
  };
}
