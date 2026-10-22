import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicates, rowsToRemove } from '../js/services/duplicateService.js';
import { createColumns, createRows, createTable } from '../js/core/dataModel.js';

const mk = rows => createTable({ name: 't', columns: createColumns(['a', 'b']), rows: createRows(rows) });

test('sin colisiones por separadores en los datos', () => {
  const r = findDuplicates(mk([['a|b', 'c'], ['a', 'b|c']]));
  assert.equal(r.groups.length, 0);
});
test('estadísticas, conservar primero/último y conservar ids', () => {
  const t = mk([['1', 'x'], ['2', 'y'], ['1', 'z'], ['1', 'w'], ['2', 'q']]);
  const { groups, stats } = findDuplicates(t, { cols: [0] });
  assert.deepEqual(stats, { groups: 2, involved: 5, excess: 3 });
  assert.deepEqual(rowsToRemove(groups, 'first').map(r => r.v[1]), ['z', 'w', 'q']);
  assert.deepEqual(rowsToRemove(groups, 'last').map(r => r.v[1]), ['x', 'z', 'y']);
});
test('vacíos e ignorar mayúsculas configurables', () => {
  const t = mk([['', ''], ['', ''], ['A', '1'], ['a', '1']]);
  assert.equal(findDuplicates(t, { ignoreEmpty: true }).groups.length, 0);
  assert.equal(findDuplicates(t, { ignoreEmpty: false }).groups.length, 1);
  assert.equal(findDuplicates(t, { ignoreCase: true }).groups.length, 1);
});
