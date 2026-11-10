self.onmessage = event => {
  try {
    const { data, hasHeader, parseErrors } = event.data;
    const head = hasHeader ? (data[0] || []) : [];
    const sourceBody = hasHeader ? data.slice(1) : data;
    let width = head.length;
    for (const row of sourceBody) if (row.length > width) width = row.length;

    const isBlank = value => value == null || String(value).trim() === '';
    const populated = Array.from({ length: width }, (_, i) => !isBlank(head[i]));
    const body = [];
    let removedEmptyRows = 0;
    for (const row of sourceBody) {
      let nonEmpty = false;
      for (let i = 0; i < row.length; i++) if (!isBlank(row[i])) { populated[i] = true; nonEmpty = true; }
      if (nonEmpty) body.push(row); else removedEmptyRows++;
    }
    const keepIndexes = populated.flatMap((keep, i) => keep ? [i] : []);

    const names = [], renamedHeaders = [], used = new Set();
    for (const sourceIndex of keepIndexes) {
      const original = String(sourceIndex < head.length ? head[sourceIndex] ?? '' : '');
      let name = original.trim() === '' ? `Columna ${i + 1}` : original;
      const base = name; let suffix = 1;
      while (used.has(name)) name = `${base} (${++suffix})`;
      used.add(name); names.push(name);
      if (name !== original) renamedHeaders.push({ index: sourceIndex, from: original, to: name });
    }

    let inconsistentRows = 0, emptyCells = 0;
    const arrays = body.map(row => {
      let values = row;
      if (row.length !== width) { inconsistentRows++; values = row.concat(Array(width - row.length).fill('')); }
      values = keepIndexes.map(i => values[i] ?? '');
      for (const value of values) if (value === '') emptyCells++;
      return values;
    });
    self.postMessage({ names, arrays, report: {
      totalRows: arrays.length, columns: names.length, inconsistentRows, emptyCells,
      removedEmptyRows, removedEmptyColumns: width - keepIndexes.length,
      extraColumns: hasHeader ? keepIndexes.filter(i => i >= head.length).length : 0,
      renamedHeaders: hasHeader ? renamedHeaders : [],
      parseErrors: parseErrors.filter(e => e.type !== 'Delimiter').slice(0, 5).map(e => ({ row: e.row, message: e.message })),
    } });
  } catch (error) {
    self.postMessage({ error: error.message || 'No se pudo normalizar la tabla.' });
  }
};
