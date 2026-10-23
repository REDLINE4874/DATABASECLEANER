const needsQuotes = (v, d) => /["\r\n]/.test(v) || v.includes(d) || /^\s|\s$/.test(v);
const field = (v, d) => (needsQuotes(v, d) ? `"${v.replace(/"/g, '""')}"` : v);

/** Serializa tal cual: no convierte tipos ni escapa fórmulas, así que `0012` se exporta como `0012`. */
export function toCsv(columns, rows, { delimiter = ',', header = true, bom = false } = {}) {
  const lines = [];
  if (header) lines.push(columns.map(c => field(c.name, delimiter)).join(delimiter));
  for (const r of rows) lines.push(columns.map(c => field(r.v[c.index] ?? '', delimiter)).join(delimiter));
  return (bom ? '\ufeff' : '') + lines.join('\r\n') + (lines.length ? '\r\n' : '');
}

/** Descarga un archivo nuevo; el archivo original nunca se sobrescribe. */
export function downloadCsv(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
