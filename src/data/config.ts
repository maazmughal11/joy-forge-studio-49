/**
 * Centralized storage/environment configuration.
 *
 * Switching the application to a different persistence backend should only
 * ever require changing the resolved provider id here (or the
 * `VITE_STORAGE_PROVIDER` environment variable) — never UI or business logic.
 */

export type StorageProviderId =
  | "local" // browser localStorage (current default)
  | "electron-sqlite" // Electron main process SQLite over contextBridge IPC
  | "rest" // REST API / SQL Server
  | "graph" // Microsoft Graph / SharePoint Lists
  | "postgres"; // PostgreSQL or another enterprise database

export type StorageConfig = {
  provider: StorageProviderId;
  /** Bumped whenever the persisted shape changes; drives migrations. */
  schemaVersion: number;
  /** localStorage namespace used by the local provider. */
  localStorageKey: string;
  /** Base URL for future remote providers. Unused by the local provider. */
  apiBaseUrl?: string;
};

const DEFAULT_PROVIDER: StorageProviderId = "local";

function resolveProvider(): StorageProviderId {
  const fromEnv = (import.meta.env?.['VITE_STORAGE_PROVIDER'] as string | undefined)?.trim();
  const allowed: StorageProviderId[] = ["local", "electron-sqlite", "rest", "graph", "postgres"];
  if (fromEnv && (allowed as string[]).includes(fromEnv)) return fromEnv as StorageProviderId;
  // Auto-detect the Electron desktop bridge when it is present.
  if (typeof window !== "undefined" && (window as { rpaDesktop?: { sqliteReady?: boolean } }).rpaDesktop?.sqliteReady) {
    return "electron-sqlite";
  }
  return DEFAULT_PROVIDER;
}

export const CURRENT_SCHEMA_VERSION = 6;

export const storageConfig: StorageConfig = {
  provider: resolveProvider(),
  schemaVersion: CURRENT_SCHEMA_VERSION,
  localStorageKey: "rpa-portfolio-data-v6",
  ...(import.meta.env?.['VITE_API_BASE_URL'] ? { apiBaseUrl: String(import.meta.env['VITE_API_BASE_URL']) } : {}),
};

export const isDesktopRuntime = () =>
  typeof window !== "undefined" && Boolean((window as { rpaDesktop?: unknown }).rpaDesktop);
