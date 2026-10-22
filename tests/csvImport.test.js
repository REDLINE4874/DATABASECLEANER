import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDataset } from '../js/services/csvImportService.js';
import { dataStore } from '../js/core/dataStore.js';

// El bundle UMD de lib/ se carga igual que en el navegador (como script clásico).
const mod = { exports: {} };
new Function('module', 'exports', readFileSync(new URL('../lib/papaparse.min.js', import.meta.url), 'utf8')).call(mod.exports, mod, mod.exports);
const Papa = mod.exports;
const parse = (text, o = {}) => Papa.parse(text, { skipEmptyLines: true, dynamicTyping: false, ...o });

test('conserva ceros iniciales, espacios, comillas y saltos de línea tal cual', () => {
  const csv = 'id,tel,nota\n007,0012345678," hola, ""mundo""\nlínea2 "\n';
  const r = parse(csv); const ds = buildDataset(r.data, { hasHeader: true }, r.errors);
  assert.deepEqual(ds.rows[0].v, ['007', '0012345678', ' hola, "mundo"\nlínea2 ']);
  assert.equal(ds.rows[0].v[1], '0012345678');
});

test('informa filas inconsistentes y encabezados repetidos/vacíos sin perder datos', () => {
  const r = parse('a,a,\n1,2,3,4\n5\n'); const ds = buildDataset(r.data, { hasHeader: true }, r.errors);
  assert.deepEqual(ds.columns.map(c => c.name), ['a', 'a (2)', 'Columna 3', 'Columna 4']);
  assert.equal(ds.report.inconsistentRows, 1); assert.equal(ds.report.extraColumns, 1);
  assert.deepEqual(ds.rows[0].v, ['1', '2', '3', '4']);
  assert.deepEqual(ds.rows[1].v, ['5', '', '', '']);
});

test('sin encabezado: todas las filas son datos', () => {
  const ds = buildDataset(parse('1;2\n3;4').data, { hasHeader: false });
  assert.equal(ds.rows.length, 2); assert.equal(ds.columns[0].name, 'Columna 1');
});

test('dataStore: original y trabajo comparten valores y ids estables', () => {
  const ds = buildDataset(parse('x,y\n01,\n02,b').data);
  dataStore.load({ fileName: 't.csv' }, ds.columns, ds.rows);
  assert.equal(dataStore.getStats().empty, 1);
  assert.equal(dataStore.getOriginal().rows[0].id, dataStore.getWorkTable().rows[0].id);
  assert.throws(() => { 'use strict'; dataStore.getOriginal().rows.push({}); });
});

test('rendimiento: 100 000 registros', () => {
  const lines = ['id,nombre,cp']; for (let i = 0; i < 100000; i++) lines.push(`${i},Nombre ${i},0${i % 1000}`);
  const t = Date.now(); const ds = buildDataset(parse(lines.join('\n')).data);
  dataStore.load({ fileName: 'big.csv' }, ds.columns, ds.rows);
  assert.equal(dataStore.getStats().rows, 100000); assert.ok(Date.now() - t < 5000);
});
