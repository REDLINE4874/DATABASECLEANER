import { mergeDatasets, compareHeaders } from '../services/mergeService.js';
import { createColumns } from '../core/dataModel.js';
import { buildTableEl } from './tableView.js';
import { openModal } from './modalManager.js';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/** Pregunta qué bases unir y muestra si sus encabezados encajan. Devuelve { title, names, rows, report } o null. */
export async function mergeDialog(bases, getFile) {
  const opts = { ignoreCase: true, addSource: true, manualMappings: [] }, picks = new Map(bases.map(b => [b.id, true]));
  const cache = new Map(), file = id => cache.get(id) || cache.set(id, getFile(id)).get(id);
  const selected = () => bases.filter(b => picks.get(b.id)).map(b => ({ ...file(b.id), id: b.id }));
  const body = el('div'), list = el('div', 'cond-list'), opt = el('div', 'form-row'), verdict = el('p', 'verdict'), matrix = el('div', 'preview-box'), info = el('p', 'hint'), prev = el('div', 'preview-box'), mappingBox = el('div', 'mapping-box');
  verdict.setAttribute('role', 'status');
  const chk = (label, checked, on) => { const l = el('label'), c = el('input'); c.type = 'checkbox'; c.checked = checked; c.onchange = () => { on(c.checked); render(); }; l.append(c, ' ' + label); return l; };
  bases.forEach(b => list.append(chk(`${b.name} · ${b.rows.toLocaleString()} registros · ${b.columns} columnas`, true, v => picks.set(b.id, v))));
  opt.append(chk('Emparejar columnas ignorando mayúsculas y espacios en los extremos', true, v => { opts.ignoreCase = v; }),
    chk('Agregar columna "Archivo de origen"', true, v => { opts.addSource = v; }));
  function render() {
    const files = selected();
    if (files.length < 2) { verdict.textContent = '⚠ Selecciona al menos 2 bases para combinar.'; matrix.replaceChildren(); prev.replaceChildren(); mappingBox.replaceChildren(); info.textContent = ''; return; }
    const cmp = compareHeaders(files, opts), bad = cmp.presence.filter(p => !p.every(Boolean)).length;
    verdict.textContent = cmp.allMatch ? '✓ Los encabezados coinciden en todas las bases seleccionadas.'
      : `⚠ Los encabezados no coinciden del todo: ${bad} de ${cmp.names.length} columnas no están en todas las bases. Las que falten quedarán vacías.`;
    const head = [{ index: 0, name: 'Encabezado' }, ...files.map((f, i) => ({ index: i + 1, name: f.name }))];
    matrix.replaceChildren(buildTableEl(head, cmp.names.map((n, i) => [n, ...cmp.presence[i].map(p => (p ? '✓ está' : '— falta'))])));
    const sample = mergeDatasets(files.map(f => ({ ...f, rows: f.rows.slice(0, 3) })), opts);
    info.textContent = `Resultado: ${files.reduce((n, f) => n + f.rows.length, 0).toLocaleString()} registros · ${sample.names.length} columnas. Vista previa:`;
    prev.replaceChildren(buildTableEl(createColumns(sample.names), sample.rows));
    renderMappings(files, cmp.names);
  }
  function renderMappings(files, targets) {
    mappingBox.replaceChildren();
    mappingBox.append(el('h3', null, 'Acomodar columnas que significan lo mismo'),
      el('p', 'hint', 'Ejemplo: selecciona NOMBRE en una base y asígnala a NAME. La equivalencia se usa en la vista previa y al combinar.'));
    const rows = el('div', 'mapping-list');
    opts.manualMappings.forEach((mapping, index) => {
      const f = files.find(x => x.id === mapping.fileId);
      const c = f?.columns.find(x => x.index === mapping.columnIndex);
      if (!f || !c) return;
      const row = el('div', 'mapping-row');
      row.append(el('span', null, `${f.name}: ${c.name} → ${mapping.target}`));
      const remove = el('button', 'btn btn-sm', 'Quitar');
      remove.type = 'button'; remove.onclick = () => { opts.manualMappings.splice(index, 1); render(); };
      row.append(remove); rows.append(row);
    });
    const form = el('div', 'form-row');
    const fileSel = el('select'), colSel = el('select'), targetSel = el('select');
    const refreshColumns = () => { colSel.replaceChildren(...(files.find(f => f.id === fileSel.value)?.columns || []).map(c => new Option(c.name, c.index))); };
    files.forEach(f => fileSel.append(new Option(f.name, f.id)));
    targets.forEach(name => targetSel.append(new Option(name, name)));
    fileSel.onchange = refreshColumns; refreshColumns();
    const add = el('button', 'btn btn-sm', 'Agregar equivalencia'); add.type = 'button';
    add.onclick = () => {
      const fileId = fileSel.value, columnIndex = Number(colSel.value), target = targetSel.value;
      if (!fileId || !target || Number.isNaN(columnIndex)) return;
      opts.manualMappings = opts.manualMappings.filter(m => !(m.fileId === fileId && m.columnIndex === columnIndex));
      opts.manualMappings.push({ fileId, columnIndex, target }); render();
    };
    form.append(el('label', null, 'En esta base: '), fileSel, el('label', null, 'columna: '), colSel, el('label', null, 'equivale a: '), targetSel, add);
    rows.append(form); mappingBox.append(rows);
  }
  body.append(el('p', 'hint', 'Elige las bases a unir. Los registros se apilan y las columnas se emparejan por nombre. Las bases originales no se modifican: el resultado se abre como una base nueva.'), list, opt, mappingBox, verdict, matrix, info, prev);
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
