/**
 * Preload / contextBridge.
 *
 * The renderer (React) runs with `contextIsolation: true`,
 * `nodeIntegration: false` and `sandbox: true`. The only thing it can reach is
 * the narrow, allow-listed surface below — no `fs`, no `require`, no raw SQL.
 *
 *   renderer → window.rpaDesktop.invoke(channel, payload) → IPC → main → SQLite
 */
const { contextBridge, ipcRenderer } = require("electron");

/** Channels the renderer is permitted to call. Anything else is rejected. */
const ALLOWED = new Set([
  "app.paths",
  "app.initialize",
  "automations.list", "automations.get", "automations.create", "automations.update",
  "automations.updateScoring", "automations.setStage", "automations.moveToProject",
  "automations.delete", "automations.import", "automations.updateImported",
  "weeklyUpdates.list", "weeklyUpdates.create",
  "approvals.list", "approvals.create", "approvals.update",
  "comments.list", "comments.add",
  "documents.list", "documents.add", "documents.remove",
  "audit.history", "audit.adminLog", "audit.log",
  "users.list", "users.getByUsername", "users.create", "users.update", "users.recordLogin",
  "messages.list", "messages.send", "messages.markRead", "messages.resolve", "messages.delete",
  "reference.options", "reference.setOption", "reference.settings", "reference.updateSettings",
  "backups.list", "backups.create", "backups.restore", "backups.delete",
  "backups.exportJson", "backups.importJson", "backups.resetToSeed",
]);

contextBridge.exposeInMainWorld("rpaDesktop", {
  version: "1",
  platform: process.platform,
  /**
   * False until better-sqlite3 ships with the desktop build. While false the
   * app keeps using its current local storage provider.
   */
  sqliteReady: false,
  invoke: (channel, payload) => {
    if (!ALLOWED.has(channel)) return Promise.reject(new Error(`Blocked channel: ${channel}`));
    return ipcRenderer.invoke("rpa:data", { channel, payload });
  },
});
