/**
 * Electron main process (scaffold — the app is not packaged yet).
 *
 * Security model:
 *  - renderer: contextIsolation on, nodeIntegration off, no remote module
 *  - all persistence happens here, behind the single `rpa:data` IPC channel
 *  - the SQLite file lives in app.getPath('userData')
 *
 * Schema upgrades run on startup via electron/migrations.cjs so an existing
 * database is upgraded in place and user data is never deleted.
 */
const path = require("path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { openDatabase } = require("./db.cjs");

let db = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  db = openDatabase(path.join(app.getPath("userData"), "rpa-portfolio.db"));

  ipcMain.handle("rpa:data", async (_event, message) => {
    const { channel, payload } = message ?? {};
    const handler = db.handlers[channel];
    if (!handler) throw new Error(`Unknown data channel: ${channel}`);
    return handler(payload ?? {});
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
