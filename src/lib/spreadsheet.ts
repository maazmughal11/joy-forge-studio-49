import * as XLSX from "xlsx";

export type SheetData = {
  fileName: string;
  sheetName: string;
  sheetNames: string[];
  headers: string[];
  rows: unknown[][];
};

/** Read an .xlsx/.xls/.csv file into headers + raw cell rows (dates kept as Date objects). */
export async function readSpreadsheet(file: File, sheetName?: string): Promise<SheetData> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true, raw: true });
  const name = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0]!;
  const sheet = wb.Sheets[name]!;
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "", raw: true });
  const headerRow = (matrix[0] ?? []).map((h) => String(h ?? "").replace(/\s+$/g, "").trim());
  const rows = matrix.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  return { fileName: file.name, sheetName: name, sheetNames: wb.SheetNames, headers: headerRow, rows };
}

/** Download a workbook whose header row is exactly `columns`. */
export function downloadTemplateWorkbook(fileName: string, sheetName: string, columns: string[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([columns]);
  ws["!cols"] = columns.map((c) => ({ wch: Math.min(40, Math.max(14, c.length + 2)) }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}
