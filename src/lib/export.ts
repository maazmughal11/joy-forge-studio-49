function escapeCsv(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number)[][]) {
  return [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
}

export function download(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  download(filename.endsWith(".csv") ? filename : `${filename}.csv`, "\uFEFF" + toCsv(headers, rows));
}

/** Excel-compatible export using SpreadsheetML — opens natively in Excel. */
export function downloadExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) =>
    typeof v === "number"
      ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string)}</Data></Cell>`;
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Export"><Table>
<Row>${headers.map((h) => cell(h)).join("")}</Row>
${rows.map((r) => `<Row>${r.map(cell).join("")}</Row>`).join("\n")}
</Table></Worksheet></Workbook>`;
  download(filename.endsWith(".xls") ? filename : `${filename}.xls`, xml, "application/vnd.ms-excel");
}

type DesktopBridge = { invoke: (channel: string, payload?: unknown) => Promise<unknown> };
const desktop = (): DesktopBridge | null =>
  typeof window !== "undefined" ? ((window as unknown as { rpaDesktop?: DesktopBridge }).rpaDesktop ?? null) : null;

/** Executive-layout report document, shared by browser print and Electron PDF. */
function reportHtml(opts: { title: string; filters: string[]; kpis: { label: string; value: string }[]; body: string }) {
  // Inline the actual CSS text: the Electron print window renders from a
  // data: URL, where relative <link href="./assets/..."> would not resolve.
  const css = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
  const styles = `<style>${css}</style>`;
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${opts.title}</title>${styles}
  <style>@page{size:landscape;margin:14mm} body{background:#fff;padding:0} .pdf-head{margin-bottom:16px}</style>
  </head><body class="p-6">
  <div class="pdf-head">
    <h1 style="font-size:22px;font-weight:600;margin:0">${opts.title}</h1>
    <p style="font-size:12px;color:#64748b;margin:4px 0 0">Generated ${new Date().toLocaleString()}</p>
    <p style="font-size:12px;color:#64748b;margin:2px 0 0">Filters: ${opts.filters.length ? opts.filters.join(" · ") : "None"}</p>
    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:12px">
      ${opts.kpis
        .map(
          (k) =>
            `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px"><div style="font-size:10px;color:#64748b">${k.label}</div><div style="font-size:18px;font-weight:600">${k.value}</div></div>`,
        )
        .join("")}
    </div>
  </div>
  ${opts.body}
  </body></html>`;
}

/**
 * Executive-layout PDF.
 *
 * In the desktop app this goes through the secure contextBridge → IPC → main
 * process, which renders the report and opens a native "Save as PDF" dialog.
 * In the browser it falls back to the standard print dialog.
 */
export async function printReport(opts: {
  title: string;
  filters: string[];
  kpis: { label: string; value: string }[];
  elementId: string;
}) {
  const node = document.getElementById(opts.elementId);
  if (!node) {
    window.print();
    return;
  }
  const html = reportHtml({ ...opts, body: node.innerHTML });

  const bridge = desktop();
  if (bridge) {
    const safeName = opts.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    await bridge.invoke("print.pdf", { html, suggestedName: `${safeName}.pdf` });
    return;
  }

  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 600);
}
