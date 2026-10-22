// La clave es JSON.stringify de los valores: inequívoca aunque los datos contengan cualquier carácter.
export function findDuplicates(table, { cols = [], ignoreCase = false, ignoreEmpty = true } = {}) {
  const idx = cols.length ? cols : table.columns.map(c => c.index);
  const map = new Map();
  for (const r of table.rows) {
    const vals = idx.map(i => (ignoreCase ? r.v[i].toLowerCase() : r.v[i]));
    if (ignoreEmpty && vals.every(v => v === '')) continue;
    const k = JSON.stringify(vals);
    const g = map.get(k); g ? g.push(r) : map.set(k, [r]);
  }
  const groups = [...map.values()].filter(g => g.length > 1);
  const involved = groups.reduce((n, g) => n + g.length, 0);
  return { groups, stats: { groups: groups.length, involved, excess: involved - groups.length } };
}

/** Filas a eliminar conservando la primera o la última de cada grupo (orden original del archivo). */
export const rowsToRemove = (groups, keep) =>
  groups.flatMap(g => (keep === 'last' ? g.slice(0, -1) : g.slice(1)));
