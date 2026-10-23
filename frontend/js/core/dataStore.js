// Estado central con varias bases cargadas a la vez. `state` apunta a la base activa; cada base
// conserva sus propios datos originales, de trabajo y pestañas de resultados.
import { createTable, computeStats } from './dataModel.js';

const bases = [], listeners = new Set();
let state = null, seq = 0;
const emit = () => listeners.forEach(fn => fn());
const touch = b => { b.stats = null; b.activeId = b.work.id; emit(); };

export const dataStore = {
  /** Agrega una base nueva (no reemplaza las existentes) y la activa. Las filas se comparten por referencia. */
  load(meta, columns, rows) {
    const work = createTable({ name: 'Datos de trabajo', columns, rows: rows.slice() });
    state = { id: `b${++seq}`, meta: Object.freeze({ ...meta }), original: Object.freeze({ columns, rows: Object.freeze(rows.slice()) }),
      work, stats: null, tables: [], activeId: work.id };
    bases.push(state); emit();
  },
  get hasData() { return !!state; },
  getBases: () => bases.map(b => ({ id: b.id, name: b.meta.fileName, rows: b.work.rows.length, columns: b.work.columns.length, current: b === state })),
  getBaseFile(id) { const b = bases.find(x => x.id === id); return { name: b.meta.fileName, columns: b.work.columns, rows: b.work.rows.map(r => r.v) }; },
  getCurrentBaseId: () => state?.id,
  switchBase(id) { const b = bases.find(x => x.id === id); if (b) { state = b; emit(); } },
  closeBase(id) {
    const i = bases.findIndex(b => b.id === id); if (i < 0) return;
    bases.splice(i, 1); if (state.id === id) state = bases[bases.length - 1] || null; emit();
  },
  getMeta: () => state?.meta,
  getOriginal: () => state?.original,
  getWorkTable: () => state?.work,
  getStats() { return state ? (state.stats ||= computeStats(state.work)) : null; },
  getTables: () => [state.work, ...state.tables],
  getActive() { return this.getTables().find(t => t.id === state.activeId) || state.work; },
  setActive(id) { state.activeId = id; emit(); },
  addTable(t) { state.tables.push(t); state.activeId = t.id; emit(); },
  closeTable(id) { state.tables = state.tables.filter(t => t.id !== id); if (state.activeId === id) state.activeId = state.work.id; emit(); },
  /** Elimina de los datos de trabajo las filas con esos ids y devuelve las eliminadas (para poder deshacer). */
  removeRows(ids) {
    const removed = [], kept = [];
    for (const r of state.work.rows) (ids.has(r.id) ? removed : kept).push(r);
    state.work = { ...state.work, rows: kept }; touch(state); return removed;
  },
  /** Mezcla aleatoriamente las filas de trabajo y devuelve el orden anterior para poder deshacerlo. */
  shuffleWorkRows() {
    const previous = state.work.rows.slice();
    const rows = previous.slice();
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    state.work = { ...state.work, rows };
    touch(state);
    return previous;
  },
  /** Restaura un orden de filas guardado por una operación reversible. */
  setWorkRows(rows) {
    state.work = { ...state.work, rows: rows.slice() };
    touch(state);
  },
  /** Devuelve filas eliminadas a su posición original en la base indicada (por defecto la activa). */
  reinsertRows(rows, baseId) {
    const b = baseId ? bases.find(x => x.id === baseId) : state; if (!b) return;
    const pos = new Map(b.original.rows.map((r, i) => [r.id, i]));
    b.work = { ...b.work, rows: [...b.work.rows, ...rows].sort((x, y) => pos.get(x.id) - pos.get(y.id)) }; touch(b);
  },
  setView(id, view) {
    if (state.work.id === id) state.work = { ...state.work, view };
    else state.tables = state.tables.map(t => (t.id === id ? { ...t, view } : t));
    emit();
  },
  /** Elimina columnas de los datos de trabajo creando filas nuevas (los datos originales no se tocan). */
  deleteColumns(idxs) {
    const keep = state.work.columns.filter(c => !idxs.has(c.index));
    const map = new Map(keep.map((c, i) => [c.index, { index: i, name: c.name }]));
    const rows = state.work.rows.map(r => ({ id: r.id, v: keep.map(c => r.v[c.index]) }));
    state.work = { ...state.work, columns: [...map.values()], rows,
      view: state.work.view ? state.work.view.filter(c => !idxs.has(c.index)).map(c => map.get(c.index)) : null };
    touch(state);
  },
  restoreOriginal() {
    state.work = { ...state.work, columns: state.original.columns, rows: state.original.rows.slice(), view: null }; touch(state);
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
