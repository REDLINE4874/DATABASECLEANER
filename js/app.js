import { dataStore } from './core/dataStore.js';
import { operationManager } from './core/operationManager.js';
import { parseFile, buildDataset } from './services/csvImportService.js';
import { TableView, buildTableEl } from './ui/tableView.js';
import { openModal } from './ui/modalManager.js';
import { createTable, createColumns, createRows } from './core/dataModel.js';
import { filterByValues } from './services/filterService.js';
import { findDuplicates, rowsToRemove } from './services/duplicateService.js';
import { columnsDialog } from './ui/toolDialogs.js';
import { mergeDialog } from './ui/mergeDialog.js';
import { renderTabs } from './ui/tabManager.js';
import { toCsv, downloadCsv } from './services/csvExportService.js';
import { valueFilterDialog, duplicateDialog, exportDialog } from './ui/toolDialogs.js';
import { notify } from './ui/notificationManager.js';

const $ = id => document.getElementById(id);
const rec = op => operationManager.record({ baseId: dataStore.getCurrentBaseId(), base: dataStore.getMeta()?.fileName, ...op });
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const DELIMS = [['', 'Detectar automáticamente'], [',', 'Coma ( , )'], [';', 'Punto y coma ( ; )'], ['\t', 'Tabulador'], ['|', 'Barra vertical ( | )']];
const delimName = d => (DELIMS.find(x => x[0] === d) || [d, d === 'varios' ? 'varios archivos' : `"${d}"`])[1].replace('Detectar automáticamente', 'automático');
const fmtSize = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const tableView = new TableView($('table-root'));
tableView.render();
let duplicateCount = 0, duplicateBaseId = null;
const updateDuplicateStat = () => {
  const stat = $('stats').querySelector('[data-stat="Duplicados"] .stat-value');
  if (stat) stat.textContent = duplicateCount.toLocaleString();
};

// ---- Tema (única preferencia en localStorage) ----
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $('theme-btn').textContent = t === 'dark' ? 'Tema claro' : 'Tema oscuro';
  try { localStorage.setItem('dc-theme', t); } catch { /* almacenamiento no disponible */ }
}
let saved = null; try { saved = localStorage.getItem('dc-theme'); } catch { /* ignorar */ }
setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('theme-btn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

// ---- Render reactivo al store ----
dataStore.subscribe(() => {
  renderBases(); renderHistory();
  if (!dataStore.hasData) {
    $('file-label').textContent = 'Ningún archivo cargado';
    ['stats', 'import-report', 'toolbar', 'tabs'].forEach(id => { $(id).hidden = true; });
    tableView.setTable(null); return;
  }
  const baseId = dataStore.getCurrentBaseId();
  if (duplicateBaseId !== null && duplicateBaseId !== baseId) duplicateCount = 0;
  duplicateBaseId = baseId;
  const meta = dataStore.getMeta(), s = dataStore.getStats();
  $('file-label').textContent = meta.size ? `${meta.fileName} · ${fmtSize(meta.size)}` : meta.fileName;
  const items = [['Registros', s.rows.toLocaleString()], ['Columnas', s.columns], ['Celdas vacías', s.empty.toLocaleString()],
    ['Completitud', `${s.completeness.toFixed(1)} %`], ['Duplicados', duplicateCount.toLocaleString()], ['Codificación', meta.encoding]];
  $('stats').replaceChildren(...items.map(([k, v]) => { const d = el('div', 'stat'); d.dataset.stat = k; d.append(el('span', 'stat-value', String(v)), el('span', 'stat-label', k)); return d; }));
  $('stats').hidden = false;
  renderReport(meta.report);
  const tabs = dataStore.getTables(), active = dataStore.getActive();
  $('tabs').hidden = tabs.length < 2; $('toolbar').hidden = false;
  renderTabs($('tabs'), tabs, active.id, { onSelect: id => dataStore.setActive(id), onClose: id => dataStore.closeTable(id) });
  tableView.highlight = null;
  tableView.setTable(active);
});

function renderReport(r) {
  const lines = [...(r.notes || [])];
  if (r.inconsistentRows) lines.push(`${r.inconsistentRows} fila(s) con distinto número de columnas: se completaron con celdas vacías.`);
  if (r.extraColumns) lines.push(`${r.extraColumns} columna(s) adicional(es) sin encabezado: se nombraron "Columna N".`);
  r.renamedHeaders.forEach(h => lines.push(`Encabezado ${h.index + 1}: "${h.from}" → "${h.to}".`));
  r.parseErrors.forEach(e => lines.push(`Fila ${e.row ?? '?'}: ${e.message}`));
  const box = $('import-report');
  box.hidden = !lines.length;
  if (!lines.length) return;
  const ul = el('ul'); lines.forEach(l => ul.append(el('li', null, l)));
  box.replaceChildren(el('summary', null, `Informe de importación: ${lines.length} observación(es). Los valores de las celdas no se modificaron.`), ul);
}

// ---- Importación ----
function renderBases() {
  const list = dataStore.getBases();
  $('bases-wrap').hidden = list.length < 1;
  renderTabs($('bases'), list.map(b => ({ id: b.id, name: `${b.name} (${b.rows.toLocaleString()})`, kind: 'base' })), dataStore.getCurrentBaseId(), {
    onSelect: id => dataStore.switchBase(id),
    onClose: async id => {
      const b = list.find(x => x.id === id);
      const ok = await openModal({ title: 'Cerrar base', actions: [{ label: 'Cancelar', value: false }, { label: 'Cerrar base', value: true, primary: true }],
        body: el('p', null, `Se cerrará "${b.name}" con sus cambios y pestañas de resultados. Las demás bases no se afectan. El archivo original no se modifica.`) });
      if (ok) dataStore.closeBase(id);
    } });
}

async function startMerge() {
  const bases = dataStore.getBases();
  if (bases.length < 2) return notify('warning', 'Carga al menos 2 bases (archivos CSV) para poder combinarlas.');
  const r = await mergeDialog(bases, id => dataStore.getBaseFile(id));
  if (!r) return notify('info', 'Combinación cancelada. No se modificó ninguna base.');
  dataStore.load({ fileName: r.title, size: 0, delimiter: 'varios', encoding: '—', hasHeader: true, importedAt: new Date().toISOString(), report: r.report }, createColumns(r.names), createRows(r.rows));
  rec({ type: 'merge', params: { bases: bases.map(b => b.name) }, dataset: 'work', affected: r.rows.length });
  notify('success', `Se creó una base nueva con ${r.rows.length.toLocaleString()} registros y ${r.names.length} columnas. Las bases originales siguen cargadas.`);
}

async function startImport(file) {
  const opts = { delimiter: '', hasHeader: true, encoding: 'UTF-8' };
  const body = el('div'), controls = el('div', 'form-row'), info = el('p', 'hint'), box = el('div', 'preview-box');
  const field = (label, input) => { const l = el('label'); l.append(label + ' ', input); return l; };
  const dSel = el('select'); DELIMS.forEach(([v, t]) => dSel.append(new Option(t, v)));
  const eSel = el('select'); [['UTF-8', 'UTF-8'], ['ISO-8859-1', 'Latin-1 (ISO-8859-1)'], ['windows-1252', 'Windows-1252']].forEach(([v, t]) => eSel.append(new Option(t, v)));
  const hChk = el('input'); hChk.type = 'checkbox'; hChk.checked = true;
  controls.append(field('Delimitador', dSel), field('Codificación', eSel), field('La primera fila contiene encabezados', hChk));
  body.append(controls, info, box);
  let token = 0, detected = ',';
  async function refresh() {
    const t = ++token; box.textContent = 'Cargando vista previa…';
    try {
      const r = await parseFile(file, opts, opts.hasHeader ? 11 : 10);
      if (t !== token) return;
      detected = r.meta.delimiter;
      const ds = buildDataset(r.data, opts);
      info.textContent = `Delimitador: ${delimName(opts.delimiter || detected)}. Vista previa de ${ds.rows.length} registro(s).`;
      box.replaceChildren(buildTableEl(ds.columns, ds.rows.map(x => x.v)));
    } catch (e) { box.textContent = `No se pudo leer el archivo: ${e.message || e}`; }
  }
  dSel.onchange = () => { opts.delimiter = dSel.value; refresh(); };
  eSel.onchange = () => { opts.encoding = eSel.value; refresh(); };
  hChk.onchange = () => { opts.hasHeader = hChk.checked; refresh(); };
  refresh();
  const ok = await openModal({ title: `Vista previa: ${file.name}`, body,
    actions: [{ label: 'Cancelar', value: false }, { label: 'Importar', value: true, primary: true }] });
  token++;
  if (!ok) return notify('info', 'Importación cancelada. No se modificó ningún dato.');

  notify('info', 'Importando archivo…', 2000);
  try {
    const r = await parseFile(file, opts, 0);
    const ds = buildDataset(r.data, opts, r.errors);
    dataStore.load({ fileName: file.name, size: file.size, delimiter: r.meta.delimiter, encoding: opts.encoding,
      hasHeader: opts.hasHeader, importedAt: new Date().toISOString(), report: ds.report }, ds.columns, ds.rows);
    rec({ type: 'import', params: { file: file.name, ...opts }, dataset: 'work', affected: ds.rows.length });
    const warn = ds.report.inconsistentRows || ds.report.renamedHeaders.length || ds.report.parseErrors.length;
    notify(warn ? 'warning' : 'success', `${ds.rows.length.toLocaleString()} registros importados${warn ? '. Revisa el informe de importación.' : '.'}`);
  } catch (e) { notify('error', `La importación falló: ${e.message || e}`); }
}

const input = $('file-input'), zone = $('import-area');
$('pick-btn').onclick = () => input.click();
const importAll = async fs => { for (const f of fs) await startImport(f); };
input.onchange = () => { const fs = [...input.files]; input.value = ''; importAll(fs); };
['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('drag'); }));
zone.addEventListener('drop', e => importAll([...e.dataTransfer.files]));
$('merge-btn').onclick = startMerge;

// ---- Herramientas (Fase 3): cada resultado crea una pestaña; la tabla de trabajo no cambia ----
const counters = { dup: 0 };
$('filter-btn').onclick = async () => {
  const t = dataStore.getActive(), p = await valueFilterDialog(t);
  if (!p) return;
  if (!p.values.size) return notify('warning', 'No seleccionaste ningún valor. No se creó ningún filtro.');
  const rows = filterByValues(t, p.col, p.values);
  const first = [...p.values][0], what = p.values.size > 1 ? `${p.values.size} valores` : (first === '' ? '(vacío)' : first);
  const name = `${t.columns[p.col].name} = ${what}`.slice(0, 40);
  dataStore.addTable(createTable({ name: `${name} (${rows.length.toLocaleString()})`, kind: 'filter', columns: t.columns, rows }));
  rec({ type: 'filter', params: { column: t.columns[p.col].name, values: [...p.values] }, dataset: t.id, affected: rows.length });
  notify('success', `${rows.length.toLocaleString()} registros cumplen la condición. Se abrió una pestaña nueva; los datos de trabajo no cambiaron.`);
};
$('dup-btn').onclick = async () => {
  const t = dataStore.getActive(), p = await duplicateDialog(t.columns);
  if (!p) return;
  const { groups, stats } = findDuplicates(t, p);
  duplicateCount = stats.involved;
  duplicateBaseId = dataStore.getCurrentBaseId();
  updateDuplicateStat();
  if (!groups.length) return notify('info', 'No se encontraron duplicados con esos criterios.');
  const canDelete = t.kind === 'work';
  const actions = [{ label: 'Cerrar', value: false }, { label: 'Resaltar en la tabla', value: 'highlight' }, { label: 'Crear tabla de duplicados', value: 'table', primary: !canDelete }];
  if (canDelete) actions.push({ label: 'Eliminar excedentes (conservar el primero)', value: 'first' }, { label: 'Eliminar excedentes (conservar el último)', value: 'last' });
  const choice = await openModal({ title: 'Resultado de duplicados', actions,
    body: el('p', null, `${stats.groups.toLocaleString()} grupos duplicados · ${stats.involved.toLocaleString()} registros involucrados · ${stats.excess.toLocaleString()} registros excedentes.`) });
  if (choice === 'highlight') {
    tableView.highlight = new Set(groups.flat().map(r => r.id)); tableView.render();
    notify('info', `${stats.involved.toLocaleString()} registros duplicados marcados con ● en la tabla (se quitan al cambiar de pestaña o de datos).`);
  } else if (choice === 'table') {
    dataStore.addTable(createTable({ name: `Duplicados ${++counters.dup} (${stats.involved.toLocaleString()})`, kind: 'duplicates', columns: t.columns, rows: groups.flat() }));
    rec({ type: 'duplicates-table', params: p, dataset: t.id, affected: stats.involved });
  } else if (choice === 'first' || choice === 'last') {
    const rm = rowsToRemove(groups, choice);
    const ok = await openModal({ title: 'Confirmar eliminación', actions: [{ label: 'Cancelar', value: false }, { label: 'Eliminar registros', value: true, primary: true }],
      body: el('p', null, `Se eliminarán ${rm.length.toLocaleString()} de ${t.rows.length.toLocaleString()} registros de los datos de trabajo. El archivo original no se modifica.`) });
    if (!ok) return notify('info', 'Eliminación cancelada. No se modificó ningún dato.');
    const ids = new Set(rm.map(r => r.id));
    const baseId = dataStore.getCurrentBaseId(), removed = dataStore.removeRows(ids);
    rec({ type: 'delete-duplicates', params: { ...p, keep: choice }, dataset: t.id, affected: removed.length, destructive: true, undoable: true, undo: () => dataStore.reinsertRows(removed, baseId) });
    notify('success', `${rm.length.toLocaleString()} registros duplicados eliminados de los datos de trabajo.`);
  }
};

// ---- Exportación, deshacer, restaurar e historial (Fase 4) ----
const slug = n => n.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '_');
$('export-btn').onclick = async () => {
  const p = await exportDialog(dataStore.getTables(), dataStore.getActive().id, dataStore.getOriginal());
  if (!p) return;
  if (!p.columns.length) return notify('warning', 'Selecciona al menos una columna para exportar.');
  const t = p.source === 'original' ? { name: 'original', ...dataStore.getOriginal() } : dataStore.getTables().find(x => x.id === p.source);
  downloadCsv(toCsv(p.columns, t.rows, p), `${slug(dataStore.getMeta().fileName)}_${slug(t.name)}.csv`);
  rec({ type: 'export', params: { table: t.name, delimiter: p.delimiter }, dataset: t.id ?? 'original', affected: t.rows.length });
  notify('success', `Exportados ${t.rows.length.toLocaleString()} registros y ${p.columns.length} columna(s) de "${t.name}".`);
};
$('undo-btn').onclick = () => {
  const e = operationManager.undoLast(dataStore.getCurrentBaseId());
  if (e) notify('success', `Se deshizo la eliminación de ${e.affected.toLocaleString()} registros.`);
};
$('restore-btn').onclick = async () => {
  const cur = dataStore.getWorkTable().rows.length, orig = dataStore.getOriginal().rows.length;
  const ok = await openModal({ title: 'Restaurar datos originales', actions: [{ label: 'Cancelar', value: false }, { label: 'Restaurar', value: true, primary: true }],
    body: el('p', null, `Los datos de trabajo (${cur.toLocaleString()} registros) volverán a los datos importados (${orig.toLocaleString()} registros). Las pestañas de resultados no cambian.`) });
  if (!ok) return;
  operationManager.markAllUndone(dataStore.getCurrentBaseId());
  dataStore.restoreOriginal();
  rec({ type: 'restore', params: {}, dataset: 'work', affected: orig, destructive: true });
  notify('success', 'Datos de trabajo restaurados al estado original.');
};
const OP_NAMES = { import: 'Importación', filter: 'Filtro', 'duplicates-table': 'Tabla de duplicados', 'delete-duplicates': 'Eliminación de duplicados', export: 'Exportación', restore: 'Restauración', merge: 'Combinación de archivos', 'delete-columns': 'Eliminación de columnas', 'columns-view': 'Vista de columnas' };
function renderHistory() {
  const ops = operationManager.list();
  $('undo-btn').disabled = !operationManager.canUndo(dataStore.getCurrentBaseId());
  $('history').hidden = !ops.length;
  $('history-list').replaceChildren(...ops.map(o => el('li', null,
    `${o.at.toLocaleTimeString()} · ${o.base ? o.base + ' · ' : ''}${OP_NAMES[o.type] || o.type} · ${o.affected.toLocaleString()} ${o.type === 'delete-columns' || o.type === 'columns-view' ? ' columna(s)' : ' registros'}${o.destructive ? ' · destructiva' : ''}${o.undone ? ' · deshecha' : ''}`)));
}
operationManager.subscribe(renderHistory);

// ---- Columnas: las no marcadas se eliminan de los datos de trabajo ----
$('cols-btn').onclick = async () => {
  const t = dataStore.getWorkTable(), p = await columnsDialog(t);
  if (!p) return;
  if (p.remove.length === t.columns.length) return notify('warning', 'Debe quedar al menos una columna marcada.');
  if (!p.remove.length) return notify('info', 'Todas las columnas están marcadas: no se eliminó ninguna.');
  const names = p.remove.map(c => c.name).join(', ');
  const ok = await openModal({ title: 'Eliminar columnas no marcadas', actions: [{ label: 'Cancelar', value: false }, { label: 'Eliminar columnas', value: true, primary: true }],
    body: el('p', null, `Se eliminarán ${p.remove.length} columna(s) (${names}) de ${t.rows.length.toLocaleString()} registros de los datos de trabajo. Se puede revertir con "Restaurar datos originales", pero las eliminaciones de registros anteriores dejarán de poder deshacerse.`) });
  if (!ok) return notify('info', 'Eliminación cancelada. No se modificó ningún dato.');
  operationManager.lockUndo(dataStore.getCurrentBaseId());
  dataStore.deleteColumns(new Set(p.remove.map(c => c.index)));
  rec({ type: 'delete-columns', params: { columns: names }, dataset: t.id, affected: p.remove.length, destructive: true });
  notify('success', `${p.remove.length} columna(s) eliminada(s). Quedan ${t.columns.length - p.remove.length}.`);
};
