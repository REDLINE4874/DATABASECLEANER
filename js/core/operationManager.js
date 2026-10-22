// Historial de operaciones. Las destructivas guardan solo los registros afectados (no copias completas).
const log = [], listeners = new Set();
const emit = () => listeners.forEach(f => f());
export const operationManager = {
  record(op) {
    const entry = { id: log.length + 1, at: new Date(), destructive: false, undoable: false, undone: false, ...op };
    log.push(entry); emit(); return entry;
  },
  list: () => log.slice(),
  canUndo: baseId => log.some(e => e.undoable && !e.undone && e.baseId === baseId),
  /** Deshace la última operación deshacible (orden inverso, para mantener la consistencia). */
  undoLast(baseId) {
    const e = [...log].reverse().find(x => x.undoable && !x.undone && x.baseId === baseId);
    if (!e) return null;
    e.undo(); e.undone = true; emit(); return e;
  },
  /** Tras un cambio de estructura (columnas) las operaciones previas ya no son reversibles. */
  lockUndo(baseId) { log.forEach(e => { if (e.baseId === baseId) e.undoable = false; }); emit(); },
  markAllUndone(baseId) { log.forEach(e => { if (e.destructive && e.baseId === baseId) e.undone = true; }); emit(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
