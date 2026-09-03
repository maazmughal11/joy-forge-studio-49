/**
 * Electron main process.
 *
 * Security model:
 *  - renderer: contextIsolation on, nodeIntegration off, sandboxed, no remote
 *  - the renderer only reaches the main process through the allow-listed
 *    `rpa:data` IPC channel exposed by electron/preload.cjs
 *  - all filesystem/database work happens here, never in the renderer
 *
 * Storage: ONE shared portfolio database on the company network share
 * (see electron/workspace.cjs). Local AppData is only used for Chromium cache
 * and window preferences — never for authoritative portfolio data.
 */
const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, ipcMain, shell, protocol, net, dialog } = require("electron");
const workspace = require("./workspace.cjs");

// ES modules cannot be loaded over file:// in Chromium, so the packaged app is
// served from an internal, read-only app:// protocol backed by local files.
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

const RENDERER_DIR = path.join(__dirname, "..", "renderer");

function registerAppProtocol() {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const decoded = decodeURIComponent(pathname);
    const relative = decoded === "/" ? "/index.electron.html" : decoded;
    const target = path.join(RENDERER_DIR, path.normalize(relative));
    if (!target.startsWith(RENDERER_DIR)) return new Response("Forbidden", { status: 403 });
    const file = fs.existsSync(target) && fs.statSync(target).isFile()
      ? target
      : path.join(RENDERER_DIR, "index.electron.html");
    return net.fetch("file://" + file);
  });
}

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL || "http://localhost:5199/index.electron.html";

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
    win.loadURL("app://local/index.electron.html");
  }

  return win;
}

/** Render report HTML off-screen and print it or save it as a PDF. */
async function renderForPrint(html, handler) {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: false, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    await printWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    // Let webfonts/layout settle before rasterising.
    await new Promise((r) => setTimeout(r, 400));
    return await handler(printWindow);
  } finally {
    if (!printWindow.isDestroyed()) printWindow.destroy();
  }
}

async function savePdf({ html, suggestedName }) {
  const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const result = await dialog.showSaveDialog(parent, {
    title: "Save report as PDF",
    defaultPath: path.join(app.getPath("documents"), suggestedName || "report.pdf"),
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  const buffer = await renderForPrint(html, (win) =>
    win.webContents.printToPDF({ landscape: true, printBackground: true, margins: { marginType: "default" } }),
  );
  fs.writeFileSync(result.filePath, buffer);
  return { ok: true, filePath: result.filePath };
}

async function printPaper({ html }) {
  return renderForPrint(
    html,
    (win) =>
      new Promise((resolve) => {
        win.webContents.print({ silent: false, printBackground: true, landscape: true }, (success, reason) =>
          resolve({ ok: success, reason }),
        );
      }),
  );
}

app.whenReady().then(() => {
  registerAppProtocol();

  ipcMain.handle("rpa:data", async (_event, message) => {
    const { channel, payload } = message ?? {};
    switch (channel) {
      case "app.paths":
        return { userData: app.getPath("userData"), workspace: workspace.status() };
      case "workspace.status":
        return workspace.status();
      case "workspace.read":
        return workspace.read();
      case "workspace.write":
        return workspace.write(payload ?? {});
      case "print.pdf":
        return savePdf(payload ?? {});
      case "print.paper":
        return printPaper(payload ?? {});
      default:
        throw new Error(`Unknown data channel: ${channel}`);
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
