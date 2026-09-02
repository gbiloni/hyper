import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportColumn = {
  header: string;
  key: string;
};

export function exportToExcel(
  columns: ExportColumn[],
  rows: Record<string, any>[],
  fileName: string,
  sheetName: string = "Datos"
) {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((col) => [col.header, row[col.key] ?? ""]))
  );
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = columns.map((col) => ({
    wch: Math.max(col.header.length + 2, 12),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function exportToPdf(
  columns: ExportColumn[],
  rows: Record<string, any>[],
  fileName: string,
  title: string
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(12);
  doc.text(title, 14, 12);
  doc.setFontSize(8);
  doc.text(new Date().toLocaleString("es-AR"), 14, 18);

  autoTable(doc, {
    startY: 22,
    head: [columns.map((col) => col.header)],
    body: rows.map((row) => columns.map((col) => String(row[col.key] ?? ""))),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [88, 28, 135] },
    theme: "grid",
  });

  doc.save(`${fileName}.pdf`);
}
