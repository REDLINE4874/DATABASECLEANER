import { createColumns, createRows, uniqueHeaders } from '../core/dataModel.js';

const WORKER_FILE_SIZE = 5 * 1024 * 1024;
const excelCache = new WeakMap();

/** Lee el archivo con Papa Parse (global). Todo se mantiene como texto: sin dynamicTyping. */
export function parseFile(file, { delimiter = '', encoding = 'UTF-8' } = {}, preview = 0) {
  if (/\.(xlsx|xls)$/i.test(file.name)) return parseExcelFile(file, preview);
  return new Promise((resolve, reject) => Papa.parse(file, {
    delimiter, encoding, preview, skipEmptyLines: true, dynamicTyping: false,
    worker: preview === 0 && file.size >= WORKER_FILE_SIZE && Papa.WORKERS_SUPPORTED,
    complete: resolve, error: reject,
  }));
}

/** Lee las hojas del libro Excel y conserva los valores mostrados como texto. */
function parseExcelFile(file, preview = 0) {
  let parsed = excelCache.get(file);
  if (!parsed) {
    parsed = file.arrayBuffer().then(buffer => {
      if (typeof Worker !== 'undefined') return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./excelImportWorker.js', import.meta.url));
        worker.onmessage = e => { worker.terminate(); e.data.error ? reject(new Error(e.data.error)) : resolve(e.data); };
        worker.onerror = e => { worker.terminate(); reject(new Error(e.message || 'No se pudo procesar el libro de Excel.')); };
        worker.postMessage(buffer, [buffer]);
      });
      const workbook = XLSX.read(buffer, { type: 'array', cellText: true, cellDates: false });
      return { sheets: workbook.SheetNames.map(name => ({ name, data: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', raw: false, blankrows: false }) })) };
    }).then(result => {
      const first = result.sheets[0];
      if (!first) throw new Error('El libro no contiene hojas.');
      return { ...result, meta: { delimiter: 'Excel', fields: first.data[0] || [], sheetName: first.name } };
    }).catch(error => { excelCache.delete(file); throw error; });
    excelCache.set(file, parsed);
  }
  return parsed.then(result => {
    const data = result.sheets[0].data;
    return { ...result, data: preview ? data.slice(0, preview) : data, errors: [] };
  });
}

export function releaseParsedFile(file) { excelCache.delete(file); }

/** Convierte las filas parseadas en columnas + filas e informa cada ajuste realizado. */
export function buildDataset(data, { hasHeader = true } = {}, parseErrors = []) {
  const head = hasHeader ? (data[0] || []) : [];
  const sourceBody = hasHeader ? data.slice(1) : data;
  let width = head.length;
  for (const r of sourceBody) if (r.length > width) width = r.length;

  const isBlank = value => value == null || String(value).trim() === '';
  const populated = Array.from({ length: width }, (_, i) => !isBlank(head[i]));
  const body = [];
  let removedEmptyRows = 0;
  for (const row of sourceBody) {
    let nonEmpty = false;
    for (let i = 0; i < row.length; i++) if (!isBlank(row[i])) { populated[i] = true; nonEmpty = true; }
    if (nonEmpty) body.push(row); else removedEmptyRows++;
  }
  const keepIndexes = populated.flatMap((keep, i) => keep ? [i] : []);
  const removedEmptyColumns = width - keepIndexes.length;

  const rawNames = keepIndexes.map(i => (i < head.length ? head[i] : ''));
  const { names, renamed } = uniqueHeaders(rawNames);
  let inconsistent = 0, emptyCells = 0;
  const arrays = body.map(r => {
    if (r.length !== width) inconsistent++;
    const values = keepIndexes.map(i => r[i] ?? '');
    for (const value of values) if (value === '') emptyCells++;
    return values;
  });
  const renamedHeaders = renamed.filter(h => hasHeader).map(h => ({ ...h, index: keepIndexes[h.index] }));
  return {
    columns: createColumns(names),
    rows: createRows(arrays),
    report: {
      totalRows: arrays.length,
      columns: names.length,
      removedEmptyRows,
      removedEmptyColumns,
      emptyCells,
      inconsistentRows: inconsistent,
      extraColumns: hasHeader ? keepIndexes.filter(i => i >= head.length).length : 0,
      renamedHeaders: renamedHeaders,
      parseErrors: parseErrors.filter(e => e.type !== 'Delimiter')
        .slice(0, 5).map(e => ({ row: e.row, message: e.message })),
    },
  };
}

/** Normaliza conjuntos grandes fuera del hilo de la interfaz. */
export async function buildDatasetAsync(data, opts = {}, parseErrors = []) {
  if (data.length < 2000 || typeof Worker === 'undefined') return buildDataset(data, opts, parseErrors);
  try {
    const result = await new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./datasetWorker.js', import.meta.url));
      worker.onmessage = e => { worker.terminate(); e.data.error ? reject(new Error(e.data.error)) : resolve(e.data); };
      worker.onerror = e => { worker.terminate(); reject(new Error(e.message || 'No se pudo normalizar la tabla.')); };
      worker.postMessage({ data, hasHeader: opts.hasHeader !== false, parseErrors });
    });
    return { columns: createColumns(result.names), rows: createRows(result.arrays), report: result.report };
  } catch {
    return buildDataset(data, opts, parseErrors);
  }
}
