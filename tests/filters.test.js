import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterRows } from '../frontend/js/services/filterService.js';
import { createColumns, createRows, createTable } from '../frontend/js/core/dataModel.js';

const t = createTable({ name: 't', columns: createColumns(['n', 'v']),
  rows: createRows([['Ana', '10'], ['ana', ''], ['Beto', '5'], ['Cris', 'x']]) });
const f = (conditions, logic) => filterRows(t, { conditions, logic }).map(r => r.v[0]);

test('texto, mayúsculas y vacíos', () => {
  assert.deepEqual(f([{ col: 0, op: 'eq', value: 'ANA', ci: true }]), ['Ana', 'ana']);
  assert.deepEqual(f([{ col: 0, op: 'eq', value: 'ANA', ci: false }]), []);
  assert.deepEqual(f([{ col: 1, op: 'empty' }]), ['ana']);
  assert.deepEqual(f([{ col: 0, op: 'starts', value: 'c', ci: true }]), ['Cris']);
});
test('numéricos ignoran texto no numérico; AND/OR', () => {
  assert.deepEqual(f([{ col: 1, op: 'gt', value: '4' }]), ['Ana', 'Beto']);
  assert.deepEqual(f([{ col: 1, op: 'between', value: '6', value2: '20' }]), ['Ana']);
  assert.deepEqual(f([{ col: 0, op: 'contains', value: 'a', ci: true }, { col: 1, op: 'gt', value: '7' }], 'AND'), ['Ana']);
  assert.deepEqual(f([{ col: 0, op: 'eq', value: 'Beto' }, { col: 0, op: 'eq', value: 'Cris' }], 'OR'), ['Beto', 'Cris']);
});
test('filtrar no modifica la tabla', () => { f([{ col: 0, op: 'eq', value: 'Ana' }]); assert.equal(t.rows.length, 4); });

import { distinctValues, filterByValues } from '../frontend/js/services/filterService.js';
test('filtro por valores: tuplas completas, coincidencia exacta y valores vacíos', () => {
  assert.deepEqual(distinctValues(t, 0).map(([v, n]) => [v, n]), [['Ana', 1], ['ana', 1], ['Beto', 1], ['Cris', 1]]);
  const rows = filterByValues(t, 1, new Set(['', '5']));
  assert.deepEqual(rows.map(r => r.v), [['ana', ''], ['Beto', '5']]);
});
