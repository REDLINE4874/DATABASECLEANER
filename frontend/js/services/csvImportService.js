import { createColumns, createRows, uniqueHeaders } from '../core/dataModel.js';

const WORKER_FILE_SIZE = 5 * 1024 * 1024;

/** Lee el archivo con Papa Parse (global). Todo se mantiene como texto: sin dynamicTyping. */
export function parseFile(file, { delimiter = '', encoding = 'UTF-8' } = {}, preview = 0) {
  if (/\.(xlsx|xls)$/i.test(file.name)) return parseExcelFile(file);
  return new Promise((resolve, reject) => Papa.parse(file, {
    delimiter, encoding, preview, skipEmptyLines: true, dynamicTyping: false,
    worker: preview === 0 && file.size >= WORKER_FILE_SIZE && Papa.WORKERS_SUPPORTED,
    complete: resolve, error: reject,
  }));
}

/** Lee la primera hoja de un libro Excel y conserva los valores mostrados como texto. */
function parseExcelFile(file) {
  return file.arrayBuffer().then(buffer => {
    const workbook = XLSX.read(buffer, { type: 'array', cellText: true, cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('El libro no contiene hojas.');
    const sheets = workbook.SheetNames.map(name => ({
      name,
      data: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1, defval: '', raw: false, blankrows: false,
      }),
    }));
    const data = sheets[0].data;
    return { data, sheets, errors: [], meta: { delimiter: 'Excel', fields: data[0] || [], sheetName } };
  });
}

/** Convierte las filas parseadas en columnas + filas e informa cada ajuste realizado. */
export function buildDataset(data, { hasHeader = true } = {}, parseErrors = []) {
  const head = hasHeader ? (data[0] || []) : [];
  const body = hasHeader ? data.slice(1) : data;
  let width = head.length;
  for (const r of body) if (r.length > width) width = r.length;

  const rawNames = Array.from({ length: width }, (_, i) => (i < head.length ? head[i] : ''));
  const { names, renamed } = uniqueHeaders(rawNames);
  let inconsistent = 0;
  const arrays = body.map(r => {
    if (r.length === width) return r;
    inconsistent++;
    return r.concat(Array(width - r.length).fill(''));
  });
  return {
    columns: createColumns(names),
    rows: createRows(arrays),
    report: {
      totalRows: arrays.length,
      columns: width,
      inconsistentRows: inconsistent,
      extraColumns: hasHeader ? width - head.length : 0,
      renamedHeaders: hasHeader ? renamed : [],
      parseErrors: parseErrors.filter(e => e.type !== 'Delimiter')
        .slice(0, 5).map(e => ({ row: e.row, message: e.message })),
    },
  };
}
