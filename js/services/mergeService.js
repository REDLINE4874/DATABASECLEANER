import { uniqueHeaders } from '../core/dataModel.js';

/** Empareja columnas por nombre entre varias bases. Devuelve nombres unificados y, por base, a qué columna destino va cada una. */
export function mapColumns(files, ignoreCase = true) {
  const norm = n => { const t = n.trim(); return ignoreCase ? t.toLowerCase() : t; };
  const names = [], keyIndex = new Map(), maps = [], added = [];
  for (const f of files) {
    const here = new Set(), add = [];
    maps.push(f.columns.map(c => {
      let k = norm(c.name);
      if (here.has(k)) k += `\u0000${c.index}`;      // dos columnas del mismo archivo que coinciden: se mantienen separadas
      here.add(k);
      if (!keyIndex.has(k)) { keyIndex.set(k, names.length); names.push(c.name); add.push(c.name); }
      return keyIndex.get(k);
    }));
    added.push(add);
  }
  return { names, maps, added };
}

/** ¿Encajan los encabezados? presence[i][j] indica si la columna i existe en la base j. */
export function compareHeaders(files, { ignoreCase = true } = {}) {
  const { names, maps } = mapColumns(files, ignoreCase);
  const presence = names.map((_, i) => maps.map(m => m.includes(i)));
  return { names, presence, allMatch: presence.every(p => p.every(Boolean)) };
}

/** Apila las bases; las columnas que una base no tiene quedan vacías en sus registros. */
export function mergeDatasets(files, { ignoreCase = true, addSource = true } = {}) {
  const { names, maps, added } = mapColumns(files, ignoreCase);
  const width = names.length, rows = [];
  files.forEach((f, fi) => {
    const map = maps[fi];
    for (const v of f.rows) {
      const row = new Array(width + (addSource ? 1 : 0)).fill('');
      for (let j = 0; j < map.length; j++) row[map[j]] = v[j] ?? '';
      if (addSource) row[width] = f.name;
      rows.push(row);
    }
  });
  const finalNames = uniqueHeaders(addSource ? [...names, 'Archivo de origen'] : names).names;
  const perFile = files.map((f, i) => ({ name: f.name, rows: f.rows.length, columns: f.columns.length,
    newColumns: added[i].length, missing: width - new Set(maps[i]).size }));
  return { names: finalNames, rows, report: { perFile, totalRows: rows.length } };
}
