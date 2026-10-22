// Representación de datos. Los valores de celda son SIEMPRE texto tal como vienen del archivo.
let nextRowId = 1, nextTableId = 1;

export const createColumns = names => names.map((name, index) => ({ index, name }));

/** Convierte arrays de valores en filas con id interno estable. No altera los valores. */
export const createRows = arrays => arrays.map(v => ({ id: nextRowId++, v }));

export const createTable = ({ name, columns, rows, kind = 'work' }) =>
  ({ id: `t${nextTableId++}`, name, kind, columns, rows });

/** Garantiza nombres de columna únicos y no vacíos. Devuelve también los cambios realizados. */
export function uniqueHeaders(names) {
  const used = new Set(), out = [], renamed = [];
  names.forEach((raw, i) => {
    const original = String(raw ?? '');
    let name = original.trim() === '' ? `Columna ${i + 1}` : original;
    const base = name; let k = 1;
    while (used.has(name)) name = `${base} (${++k})`;
    used.add(name); out.push(name);
    if (name !== original) renamed.push({ index: i, from: original, to: name });
  });
  return { names: out, renamed };
}

export function computeStats(table) {
  let empty = 0;
  for (const r of table.rows) for (const c of r.v) if (c === '') empty++;
  const cells = table.rows.length * table.columns.length;
  return { rows: table.rows.length, columns: table.columns.length, cells, empty,
           completeness: cells ? (1 - empty / cells) * 100 : 100 };
}
