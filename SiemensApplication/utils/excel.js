// utils/excel.js
import path from 'path';
import XLSX from 'xlsx';

function pickSheet(wb, wanted) {
  return wb.SheetNames.find(n => n.toLowerCase() === wanted.toLowerCase()) ?? wb.SheetNames[0];
}

// Existing key/value reader
export function getSheetMap(xlsxPath, sheetName) {
  const abs = path.isAbsolute(xlsxPath) ? xlsxPath : path.resolve(xlsxPath);
  const wb = XLSX.readFile(abs, { cellDates: true });
  const ws = wb.Sheets[pickSheet(wb, sheetName)];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found in "${abs}"`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let start = 0;
  if (rows.length && String(rows[0][0]).toLowerCase() === 'field') start = 1;

  const map = {};
  for (let i = start; i < rows.length; i++) {
    const key = String(rows[i][0] ?? '').trim();
    const val = rows[i][1];
    if (key) map[key] = val;
  }
  return map;
}

// NEW: row-based reader (uses header row to build objects)
export function getSheetRows(xlsxPath, sheetName) {
  const abs = path.isAbsolute(xlsxPath) ? xlsxPath : path.resolve(xlsxPath);
  const wb = XLSX.readFile(abs, { cellDates: true });
  const ws = wb.Sheets[pickSheet(wb, sheetName)];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found in "${abs}"`);
  // Header row -> array of objects: [{searchText:'...', displayText:'...', emailIfAny:'...'}, ...]
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}
