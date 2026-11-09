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

/** Filas a eliminar conservando la primera, la última o una elección manual por grupo. */
export const rowsToRemove = (groups, keep, manualSelections = null) => {
  if (keep === 'manual') {
    const manual = manualSelections instanceof Map
      ? manualSelections
      : new Map(Object.entries(manualSelections ?? {}).map(([key, value]) => [Number(key), value]));

    return groups.flatMap((group, index) => {
      const chosen = manual.get(index) ?? manual.get(String(index)) ?? group[0]?.id;
      const keepRow = group.find(r => String(r.id) === String(chosen)) || group[0];
      return group.filter(r => String(r.id) !== String(keepRow.id));
    });
  }
  return groups.flatMap(g => (keep === 'last' ? g.slice(0, -1) : g.slice(1)));
};
