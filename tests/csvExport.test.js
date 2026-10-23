import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toCsv } from '../frontend/js/services/csvExportService.js';
import { createColumns, createRows } from '../frontend/js/core/dataModel.js';

const mod = { exports: {} };
new Function('module', 'exports', readFileSync(new URL('../frontend/lib/papaparse.min.js', import.meta.url), 'utf8')).call(mod.exports, mod, mod.exports);
const Papa = mod.exports;

test('exportar y volver a importar devuelve exactamente los mismos valores', () => {
  const cols = createColumns(['id', 'nota, "x"']);
  const data = [['007', 'a,b'], ['0012', 'dice "hola"\nlínea 2'], [' espacio ', ''], ['ñ;|\t', '=SUMA(1)']];
  for (const delimiter of [',', ';', '\t', '|']) {
    const csv = toCsv(cols, createRows(data), { delimiter, bom: true });
    const back = Papa.parse(csv, { delimiter, skipEmptyLines: false }).data.filter(r => r.length > 1 || r[0] !== '');
    assert.deepEqual(back.slice(1), data); assert.deepEqual(back[0], ['id', 'nota, "x"']);
    assert.ok(csv.startsWith('\ufeff'));
  }
});
