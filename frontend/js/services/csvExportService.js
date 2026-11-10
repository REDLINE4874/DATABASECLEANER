const needsQuotes = (v, d) => /["\r\n]/.test(v) || v.includes(d) || /^\s|\s$/.test(v);
const field = (v, d) => (needsQuotes(v, d) ? `"${v.replace(/"/g, '""')}"` : v);

/** Serializa tal cual: no convierte tipos ni escapa fórmulas, así que `0012` se exporta como `0012`. */
export function toCsv(columns, rows, { delimiter = ',', header = true, bom = false } = {}) {
  const lines = [];
  if (header) lines.push(columns.map(c => field(c.name, delimiter)).join(delimiter));
  for (const r of rows) lines.push(columns.map(c => field(r.v[c.index] ?? '', delimiter)).join(delimiter));
  return (bom ? '\ufeff' : '') + lines.join('\r\n') + (lines.length ? '\r\n' : '');
}

/** Genera un libro Excel real y mantiene los valores de las celdas como texto. */
export function toXlsx(columns, rows, { header = true, sheetName = 'Datos' } = {}) {
  const matrix = [];
  if (header) matrix.push(columns.map(c => c.name));
  for (const row of rows) matrix.push(columns.map(c => row.v[c.index] ?? ''));
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(matrix, { cellText: true });
  const safeName = String(sheetName).replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31) || 'Datos';
  XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  return new Blob([XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Descarga un archivo nuevo; el archivo original nunca se sobrescribe. */
export function downloadCsv(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Guarda con selector de ruta cuando el navegador lo permite; usa descargas como alternativa. */
export async function saveFile(blob, suggestedName, fileHandle = null) {
  if (fileHandle) {
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = suggestedName;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
