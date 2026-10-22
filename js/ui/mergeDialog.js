import { mergeDatasets, compareHeaders } from '../services/mergeService.js';
import { createColumns } from '../core/dataModel.js';
import { buildTableEl } from './tableView.js';
import { openModal } from './modalManager.js';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/** Pregunta qué bases unir y muestra si sus encabezados encajan. Devuelve { title, names, rows, report } o null. */
export async function mergeDialog(bases, getFile) {
  const opts = { ignoreCase: true, addSource: true }, picks = new Map(bases.map(b => [b.id, true]));
  const cache = new Map(), file = id => cache.get(id) || cache.set(id, getFile(id)).get(id);
  const selected = () => bases.filter(b => picks.get(b.id)).map(b => file(b.id));
  const body = el('div'), list = el('div', 'cond-list'), opt = el('div', 'form-row'), verdict = el('p', 'verdict'), matrix = el('div', 'preview-box'), info = el('p', 'hint'), prev = el('div', 'preview-box');
  verdict.setAttribute('role', 'status');
  const chk = (label, checked, on) => { const l = el('label'), c = el('input'); c.type = 'checkbox'; c.checked = checked; c.onchange = () => { on(c.checked); render(); }; l.append(c, ' ' + label); return l; };
  bases.forEach(b => list.append(chk(`${b.name} · ${b.rows.toLocaleString()} registros · ${b.columns} columnas`, true, v => picks.set(b.id, v))));
  opt.append(chk('Emparejar columnas ignorando mayúsculas y espacios en los extremos', true, v => { opts.ignoreCase = v; }),
    chk('Agregar columna "Archivo de origen"', true, v => { opts.addSource = v; }));
  function render() {
    const files = selected();
    if (files.length < 2) { verdict.textContent = '⚠ Selecciona al menos 2 bases para combinar.'; matrix.replaceChildren(); prev.replaceChildren(); info.textContent = ''; return; }
    const cmp = compareHeaders(files, opts), bad = cmp.presence.filter(p => !p.every(Boolean)).length;
    verdict.textContent = cmp.allMatch ? '✓ Los encabezados coinciden en todas las bases seleccionadas.'
      : `⚠ Los encabezados no coinciden del todo: ${bad} de ${cmp.names.length} columnas no están en todas las bases. Las que falten quedarán vacías.`;
    const head = [{ index: 0, name: 'Encabezado' }, ...files.map((f, i) => ({ index: i + 1, name: f.name }))];
    matrix.replaceChildren(buildTableEl(head, cmp.names.map((n, i) => [n, ...cmp.presence[i].map(p => (p ? '✓ está' : '— falta'))])));
    const sample = mergeDatasets(files.map(f => ({ ...f, rows: f.rows.slice(0, 3) })), opts);
    info.textContent = `Resultado: ${files.reduce((n, f) => n + f.rows.length, 0).toLocaleString()} registros · ${sample.names.length} columnas. Vista previa:`;
    prev.replaceChildren(buildTableEl(createColumns(sample.names), sample.rows));
  }
  body.append(el('p', 'hint', 'Elige las bases a unir. Los registros se apilan y las columnas se emparejan por nombre. Las bases originales no se modifican: el resultado se abre como una base nueva.'), list, opt, verdict, matrix, info, prev);
  render();
  for (;;) {
    if (!(await openModal({ title: 'Combinar bases', body, actions: [{ label: 'Cancelar', value: false }, { label: 'Combinar', value: true, primary: true }] }))) return null;
    if (selected().length >= 2) break;
    verdict.textContent = '⚠ Selecciona al menos 2 bases para combinar.';
  }
  const files = selected(), merged = mergeDatasets(files, opts);
  return { title: `Combinación: ${files.map(f => f.name).join(' + ')}`.slice(0, 80), names: merged.names, rows: merged.rows,
    report: { inconsistentRows: 0, extraColumns: 0, renamedHeaders: [], parseErrors: [],
      notes: merged.report.perFile.map(f => `${f.name}: ${f.rows.toLocaleString()} registros, ${f.newColumns} columna(s) nueva(s), ${f.missing} columna(s) vacías para esta base.`) } };
}
