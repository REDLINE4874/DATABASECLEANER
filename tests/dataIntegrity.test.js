import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataStore } from '../js/core/dataStore.js';
import { operationManager } from '../js/core/operationManager.js';
import { createColumns, createRows } from '../js/core/dataModel.js';

const load = () => dataStore.load({ fileName: 'x.csv' }, createColumns(['a']), createRows([['1'], ['2'], ['3'], ['4']]));
const ids = () => dataStore.getWorkTable().rows.map(r => r.v[0]);

test('eliminar, deshacer y restaurar conservan orden y originales', () => {
  load(); const orig = dataStore.getOriginal().rows.map(r => r.id);
  const rows = dataStore.getWorkTable().rows;
  const removed = dataStore.removeRows(new Set([rows[1].id, rows[2].id]));
  operationManager.record({ type: 'x', affected: 2, destructive: true, undoable: true, undo: () => dataStore.reinsertRows(removed) });
  assert.deepEqual(ids(), ['1', '4']); assert.equal(dataStore.getOriginal().rows.length, 4);
  operationManager.undoLast(); assert.deepEqual(ids(), ['1', '2', '3', '4']);
  assert.deepEqual(dataStore.getWorkTable().rows.map(r => r.id), orig);
  dataStore.removeRows(new Set([orig[0]])); dataStore.restoreOriginal();
  assert.deepEqual(ids(), ['1', '2', '3', '4']); assert.equal(operationManager.canUndo(), false);
});

import { toCsv } from '../js/services/csvExportService.js';
test('columnas: ocultar no pierde datos; eliminar no toca el original; reinsertar tras eliminar columna', () => {
  dataStore.load({ fileName: 'y.csv' }, createColumns(['a', 'b', 'c']), createRows([['1', 'x', 'p'], ['2', 'y', 'q'], ['3', 'z', 'r']]));
  const w = dataStore.getWorkTable();
  dataStore.setView(w.id, [w.columns[2], w.columns[0]]);
  assert.equal(toCsv(dataStore.getWorkTable().columns, dataStore.getWorkTable().rows, { header: false }).split('\r\n')[0], '1,x,p');
  assert.equal(toCsv(dataStore.getWorkTable().view, dataStore.getWorkTable().rows, { header: false }).split('\r\n')[0], 'p,1');
  const t = dataStore.getWorkTable();
  dataStore.deleteColumns(new Set([1]), [t.columns[2], t.columns[0]]);
  const n = dataStore.getWorkTable();
  assert.deepEqual(n.columns.map(c => c.name), ['a', 'c']); assert.deepEqual(n.rows[1].v, ['2', 'q']);
  assert.deepEqual(n.view.map(c => c.index), [1, 0]);
  assert.deepEqual(dataStore.getOriginal().rows[1].v, ['2', 'y', 'q']);
  const removed = dataStore.removeRows(new Set([n.rows[0].id])); dataStore.reinsertRows(removed);
  assert.deepEqual(dataStore.getWorkTable().rows.map(r => r.v), [['1', 'p'], ['2', 'q'], ['3', 'r']]);
  dataStore.restoreOriginal(); assert.equal(dataStore.getWorkTable().columns.length, 3); assert.equal(dataStore.getWorkTable().view, null);
});

test('varias bases a la vez: cambiar de base y deshacer en la base correcta', () => {
  dataStore.load({ fileName: 'A' }, createColumns(['a']), createRows([['1'], ['2'], ['3']]));
  const idA = dataStore.getCurrentBaseId();
  const removed = dataStore.removeRows(new Set([dataStore.getWorkTable().rows[0].id]));
  dataStore.load({ fileName: 'B' }, createColumns(['b']), createRows([['x']]));
  assert.equal(dataStore.getWorkTable().rows.length, 1);
  dataStore.reinsertRows(removed, idA);
  assert.equal(dataStore.getWorkTable().rows.length, 1);
  dataStore.switchBase(idA); assert.deepEqual(dataStore.getWorkTable().rows.map(r => r.v[0]), ['1', '2', '3']);
  assert.equal(dataStore.getBases().length >= 2, true);
  dataStore.closeBase(idA); assert.notEqual(dataStore.getCurrentBaseId(), idA);
});
