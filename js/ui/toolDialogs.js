import { openModal } from './modalManager.js';
import { dialogOrder, visibleColumns } from '../services/columnService.js';
import { distinctValues } from '../services/filterService.js';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const sel = pairs => { const s = el('select'); pairs.forEach(([v, t]) => s.append(new Option(t, v))); return s; };
const check = (label, on) => { const l = el('label'); const c = el('input'); c.type = 'checkbox'; c.checked = on; l.append(c, ' ' + label); return [l, c]; };
const ACTIONS = [{ label: 'Cancelar', value: false }, { label: 'Continuar', value: true, primary: true }];
const OPS = [['eq', 'es igual a'], ['neq', 'es distinto de'], ['contains', 'contiene'], ['starts', 'empieza con'], ['ends', 'termina con'],
  ['empty', 'está vacío'], ['notempty', 'no está vacío'], ['gt', 'mayor que (número)'], ['lt', 'menor que (número)'],
  ['between', 'entre (números)'], ['in', 'es uno de (separados por |)']];

export async function valueFilterDialog(table) {
  const body = el('div'), colSel = sel(table.columns.map(c => [c.index, c.name]));
  const search = el('input'); search.type = 'search'; search.placeholder = 'Buscar valor…';
  const list = el('div', 'col-checks'), info = el('p', 'hint'), selected = new Set(), LIMIT = 300;
  let values = [], shown = [];
  const label = v => (v === '' ? '(vacío)' : v);
  const status = () => { info.textContent = `${values.length.toLocaleString()} valores distintos · ${selected.size.toLocaleString()} seleccionados` + (shown.length > LIMIT ? ` · se muestran ${LIMIT} de ${shown.length.toLocaleString()}; usa la búsqueda` : ''); };
  function draw() {
    const q = search.value.toLowerCase();
    shown = values.filter(([v]) => label(v).toLowerCase().includes(q));
    list.replaceChildren(...shown.slice(0, LIMIT).map(([v, n]) => {
      const [l, c] = check(`${label(v)} (${n.toLocaleString()})`, selected.has(v));
      c.onchange = () => { c.checked ? selected.add(v) : selected.delete(v); status(); };
      return l;
    }));
    status();
  }
  function load() { values = distinctValues(table, +colSel.value); selected.clear(); search.value = ''; draw(); }
  const all = el('button', 'btn btn-sm', 'Marcar los valores encontrados'), none = el('button', 'btn btn-sm', 'Quitar selección');
  all.type = none.type = 'button';
  all.onclick = () => { shown.forEach(([v]) => selected.add(v)); draw(); };
  none.onclick = () => { selected.clear(); draw(); };
  colSel.onchange = load; search.oninput = draw;
  const top = el('div', 'form-row'); const l = el('label'); l.append('Columna a filtrar ', colSel); top.append(l, search, all, none);
  body.append(top, info, list); load();
  const ok = await openModal({ title: 'Filtrar por valores de una columna', body,
    actions: [{ label: 'Cancelar', value: false }, { label: 'Mostrar registros', value: true, primary: true }] });
  return ok ? { col: +colSel.value, values: new Set(selected) } : null;
}

export async function duplicateDialog(columns) {
  const body = el('div'), grid = el('div', 'col-checks');
  const boxes = columns.map(c => { const [l, i] = check(c.name, false); grid.append(l); return i; });
  const [l1, ci] = check('Ignorar mayúsculas y minúsculas', false);
  const [l2, ie] = check('Ignorar registros cuyas columnas comparadas están todas vacías', true);
  body.append(el('p', 'hint', 'Marca las columnas a comparar. Sin ninguna marcada se compara la fila completa.'), grid, l1, el('br'), l2);
  if (!(await openModal({ title: 'Buscar duplicados', body, actions: ACTIONS }))) return null;
  return { cols: columns.filter((_, i) => boxes[i].checked).map(c => c.index), ignoreCase: ci.checked, ignoreEmpty: ie.checked };
}

export async function exportDialog(tables, activeId, original) {
  const body = el('div', 'cond-list');
  const src = sel([...tables.map(t => [t.id, `${t.name} · ${t.rows.length.toLocaleString()} registros`]), ['original', 'Datos originales (sin cambios)']]);
  src.value = activeId;
  const dl = sel([[',', 'Coma ( , )'], [';', 'Punto y coma ( ; )'], ['\t', 'Tabulador'], ['|', 'Barra vertical ( | )']]);
  const [l1, hd] = check('Incluir fila de encabezados', true), [l2, bom] = check('Compatibilidad con Excel (UTF-8 con BOM)', true);
  const a = el('label'), b = el('label'); a.append('Tabla a exportar ', src); b.append('Delimitador ', dl);
  const grid = el('div', 'col-checks'), tools = el('div', 'form-row'); let cols = [], boxes = [];
  const draw = () => {
    const t = src.value === 'original' ? original : tables.find(x => x.id === src.value);
    cols = dialogOrder(t); const vis = new Set(visibleColumns(t).map(c => c.index));
    grid.replaceChildren();
    boxes = cols.map(c => { const [l, i] = check(c.name, vis.has(c.index)); grid.append(l); return i; });
  };
  const setAll = on => () => boxes.forEach(b => { b.checked = on; });
  const all = el('button', 'btn btn-sm', 'Marcar todas'), none = el('button', 'btn btn-sm', 'Quitar todas');
  all.type = none.type = 'button'; all.onclick = setAll(true); none.onclick = setAll(false); src.onchange = draw; draw();
  tools.append(el('strong', null, 'Columnas a exportar:'), all, none);
  body.append(a, b, l1, l2, tools, grid, el('p', 'hint', 'Solo se exportan las columnas marcadas; las demás no se incluyen en el archivo. Se descarga un archivo nuevo y el original no se modifica. Excel puede quitar ceros iniciales al abrir el CSV: impórtalo como texto si lo necesitas.'));
  if (!(await openModal({ title: 'Exportar a CSV', body, actions: [{ label: 'Cancelar', value: false }, { label: 'Exportar', value: true, primary: true }] }))) return null;
  return { source: src.value, delimiter: dl.value, header: hd.checked, bom: bom.checked, columns: cols.filter((_, i) => boxes[i].checked) };
}

/** Una casilla por columna: las marcadas se conservan y las demás se eliminarán. */
export async function columnsDialog(table) {
  const body = el('div'), list = el('div', 'col-checks'), info = el('p', 'hint'), top = el('div', 'form-row');
  const search = el('input'); search.type = 'search'; search.placeholder = 'Buscar columna…'; search.setAttribute('aria-label', 'Buscar columna');
  const keep = new Set(table.columns.map(c => c.index));
  const shown = () => table.columns.filter(c => c.name.toLowerCase().includes(search.value.toLowerCase()));
  const status = () => { info.textContent = `${keep.size} de ${table.columns.length} columnas se conservarán · ${table.columns.length - keep.size} se eliminarán.`; };
  function draw() {
    list.replaceChildren(...shown().map(c => {
      const [l, cb] = check(c.name, keep.has(c.index));
      cb.onchange = () => { cb.checked ? keep.add(c.index) : keep.delete(c.index); status(); };
      return l;
    }));
    status();
  }
  const btn = (t, on) => { const b = el('button', 'btn btn-sm', t); b.type = 'button'; b.onclick = () => { shown().forEach(c => (on ? keep.add(c.index) : keep.delete(c.index))); draw(); }; return b; };
  search.oninput = draw; top.append(search, btn('Marcar las mostradas', true), btn('Quitar las mostradas', false));
  body.append(el('p', 'hint', 'Deja marcadas las columnas que quieres conservar. Las columnas sin marcar se eliminarán de los datos de trabajo.'), top, info, list); draw();
  if (!(await openModal({ title: 'Conservar columnas', body, actions: [{ label: 'Cancelar', value: false }, { label: 'Aplicar', value: true, primary: true }] }))) return null;
  return { remove: table.columns.filter(c => !keep.has(c.index)) };
}
