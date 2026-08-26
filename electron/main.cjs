/**
 * Electron main process.
 *
 * Security model:
 *  - renderer: contextIsolation on, nodeIntegration off, sandboxed, no remote
 *  - the renderer only reaches the main process through the allow-listed
 *    `rpa:data` IPC channel exposed by electron/preload.cjs
 *  - all writable data lives in app.getPath('userData'), never inside the
 *    installed application directory
 *
 * Storage: the application currently persists through its local storage
 * provider inside the renderer. The SQLite gateway (electron/db.cjs) is wired
 * up and ready, but only activated once better-sqlite3 ships with the build.
 */
const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, ipcMain, shell } = require("electron");

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL || "http://localhost:5199/index.electron.html";

let db = null;
let sqliteReady = false;

/** Absolute path to a writable file inside the user data directory. */
function userDataFile(name) {
  const dir = app.getPath("userData");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

function tryOpenDatabase() {
  try {
    const { openDatabase } = require("./db.cjs");
    db = openDatabase(userDataFile("automation-coe-portfolio.db"));
    sqliteReady = true;
  } catch (error) {
    // Expected until better-sqlite3 is bundled: the app keeps running on the
    // local storage provider inside the renderer.
    console.info("[storage] SQLite unavailable, using local storage provider:", error.message);
    db = null;
    sqliteReady = false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    title: "Automation CoE Portfolio Tracker",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  // External links open in the system browser, never in the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "index.electron.html"));
  }

  return win;
}

app.whenReady().then(() => {
  tryOpenDatabase();

  ipcMain.handle("rpa:data", async (_event, message) => {
    const { channel, payload } = message ?? {};
    if (channel === "app.paths") {
      return { userData: app.getPath("userData"), sqliteReady };
    }
    if (!db) throw new Error("SQLite storage is not enabled in this build.");
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
