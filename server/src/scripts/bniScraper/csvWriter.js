import fs from "fs";
import path from "path";

function escapeCsvField(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export class CsvWriter {
  constructor(filePath, columns) {
    this.filePath = filePath;
    this.columns = columns;
  }

  init() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, this.columns.map(escapeCsvField).join(",") + "\n");
    }
  }

  appendRow(rowObj) {
    const line = this.columns.map((col) => escapeCsvField(rowObj[col])).join(",");
    fs.appendFileSync(this.filePath, line + "\n");
  }
}
