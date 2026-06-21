import * as XLSX from "xlsx";

/**
 * Extracts every sheet of an XLSX/XLS workbook to CSV-like text so the LLM can
 * read the tabular content as part of the prompt.
 */
export async function normalizeXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts = [];
  for (const name of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
    parts.push(`# Sheet: ${name}\n${csv}`);
  }
  return { kind: "text", data: parts.join("\n\n") };
}

export default normalizeXlsx;
