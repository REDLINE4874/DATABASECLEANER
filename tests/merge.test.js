import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeDatasets } from '../js/services/mergeService.js';
import { toCsv } from '../js/services/csvExportService.js';
import { createColumns, createRows } from '../js/core/dataModel.js';

const f = (name, cols, rows) => ({ name, columns: createColumns(cols), rows });

test('apila por nombre de columna, rellena faltantes y agrega origen', () => {
  const r = mergeDatasets([f('a.csv', ['Id', 'Nombre'], [['001', 'Ana']]), f('b.csv', [' nombre ', 'Ciudad', 'ID'], [['Beto', 'Lima', '002']])]);
  assert.deepEqual(r.names, ['Id', 'Nombre', 'Ciudad', 'Archivo de origen']);
  assert.deepEqual(r.rows, [['001', 'Ana', '', 'a.csv'], ['002', 'Beto', 'Lima', 'b.csv']]);
  assert.deepEqual(r.report.perFile.map(x => [x.newColumns, x.missing]), [[2, 1], [1, 0]]);
});
test('sin ignorar mayúsculas las columnas son distintas; duplicadas en un archivo no se pisan', () => {
  const r = mergeDatasets([f('a', ['x', 'X'], [['1', '2']]), f('b', ['x'], [['3']])], { ignoreCase: false, addSource: false });
  assert.deepEqual(r.names, ['x', 'X']); assert.deepEqual(r.rows, [['1', '2'], ['3', '']]);
  const d = mergeDatasets([f('a', ['x', 'X'], [['1', '2']])], { addSource: false });
  assert.deepEqual(d.rows, [['1', '2']]); assert.equal(new Set(d.names).size, 2);
});
test('exportar solo columnas elegidas, en el orden indicado', () => {
  const cols = createColumns(['a', 'b', 'c']);
  assert.equal(toCsv([cols[2], cols[0]], createRows([['1', '2', '3']])), 'c,a\r\n3,1\r\n');
});

import { compareHeaders } from '../js/services/mergeService.js';
test('compara encabezados: indica coincidencia total o columnas faltantes', () => {
  const a = f('a', ['Id', 'Nombre'], []), b = f('b', ['id', 'NOMBRE'], []), c = f('c', ['id', 'Edad'], []);
  assert.equal(compareHeaders([a, b]).allMatch, true);
  const r = compareHeaders([a, b, c]);
  assert.equal(r.allMatch, false); assert.deepEqual(r.names, ['Id', 'Nombre', 'Edad']);
  assert.deepEqual(r.presence, [[true, true, true], [true, true, false], [false, false, true]]);
});
test('permite orientar manualmente encabezados con nombres diferentes', () => {
  const a = f('a', ['NOMBRE', 'CEL'], [['Ana', '555']]);
  const b = f('b', ['NAME', 'PHONE'], [['Bob', '666']]);
  const opts = { manualMappings: [
    { fileId: undefined, fileIndex: 1, columnIndex: 0, target: 'NOMBRE' },
    { fileId: undefined, fileIndex: 1, columnIndex: 1, target: 'CEL' }
  ] };
  assert.equal(compareHeaders([a, b], opts).allMatch, true);
  const r = mergeDatasets([a, b], { ...opts, addSource: false });
  assert.deepEqual(r.names, ['NOMBRE', 'CEL']);
  assert.deepEqual(r.rows, [['Ana', '555'], ['Bob', '666']]);
});
