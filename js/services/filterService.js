// Los filtros devuelven referencias a las filas coincidentes; no eliminan ni copian datos.
const num = s => { const t = String(s).trim(); return t === '' ? NaN : Number(t); };

function test(c, cell) {
  const low = s => (c.ci ? String(s).toLowerCase() : String(s));
  const a = low(cell), b = low(c.value);
  switch (c.op) {
    case 'eq': return a === b;
    case 'neq': return a !== b;
    case 'contains': return a.includes(b);
    case 'starts': return a.startsWith(b);
    case 'ends': return a.endsWith(b);
    case 'empty': return cell === '';
    case 'notempty': return cell !== '';
    case 'in': return String(c.value).split('|').map(low).includes(a);
    case 'gt': { const n = num(cell); return !isNaN(n) && n > num(c.value); }
    case 'lt': { const n = num(cell); return !isNaN(n) && n < num(c.value); }
    case 'between': { const n = num(cell); return !isNaN(n) && n >= num(c.value) && n <= num(c.value2); }
    default: throw new Error(`Operador desconocido: ${c.op}`);
  }
}

/** @param {{conditions:{col:number,op:string,value?:string,value2?:string,ci?:boolean}[], logic:'AND'|'OR'}} p */
export function filterRows(table, { conditions, logic = 'AND' }) {
  if (!conditions.length) return table.rows.slice();
  const m = logic === 'OR' ? 'some' : 'every';
  return table.rows.filter(r => conditions[m](c => test(c, r.v[c.col] ?? '')));
}

/** Valores distintos de una columna con su cantidad de registros, ordenados de forma natural. */
export function distinctValues(table, col) {
  const m = new Map();
  for (const r of table.rows) { const v = r.v[col] ?? ''; m.set(v, (m.get(v) || 0) + 1); }
  const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return [...m.entries()].sort((a, b) => coll.compare(a[0], b[0]));
}

/** Todas las filas (tuplas completas) cuyo valor en `col` es uno de los elegidos. Coincidencia exacta. */
export const filterByValues = (table, col, values) => table.rows.filter(r => values.has(r.v[col] ?? ''));
