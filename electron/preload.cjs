/**
 * Preload / contextBridge.
 *
 * The renderer (React) runs with `contextIsolation: true`,
 * `nodeIntegration: false` and `sandbox: true`. The only thing it can reach is
 * the narrow, allow-listed surface below — no `fs`, no `require`, no raw paths.
 *
 *   renderer → window.rpaDesktop.invoke(channel, payload) → IPC → main → shared DB
 */
const { contextBridge, ipcRenderer } = require("electron");

/** Channels the renderer is permitted to call. Anything else is rejected. */
const ALLOWED = new Set([
  "app.paths",
  // Shared RPAHUB workspace
  "workspace.status",
  "workspace.read",
  "workspace.write",
  // Printing / PDF
  "print.pdf",
  "print.paper",
]);

contextBridge.exposeInMainWorld("rpaDesktop", {
  version: "2",
  platform: process.platform,
  /** The shared RPAHUB workspace gateway is always available in the desktop build. */
  workspaceReady: true,
  invoke: (channel, payload) => {
    if (!ALLOWED.has(channel)) return Promise.reject(new Error(`Blocked channel: ${channel}`));
    return ipcRenderer.invoke("rpa:data", { channel, payload });
  },
});
