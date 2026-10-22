import { createColumns, createRows, uniqueHeaders } from '../core/dataModel.js';

/** Lee el archivo con Papa Parse (global). Todo se mantiene como texto: sin dynamicTyping. */
export function parseFile(file, { delimiter = '', encoding = 'UTF-8' } = {}, preview = 0) {
  return new Promise((resolve, reject) => Papa.parse(file, {
    delimiter, encoding, preview, skipEmptyLines: true, dynamicTyping: false,
    complete: resolve, error: reject,
  }));
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
