// Ocultar/reordenar solo cambia la vista (table.view); los datos exportables no se pierden.
export const visibleColumns = table => table.view || table.columns;
export const hiddenColumns = table => table.columns.filter(c => !visibleColumns(table).includes(c));

/** Orden mostrado en el diálogo: visibles (en su orden) y luego ocultas. */
export const dialogOrder = table => [...visibleColumns(table), ...hiddenColumns(table)];
