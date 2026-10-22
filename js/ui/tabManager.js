/** Cada pestaña es una tabla independiente; cambiar de pestaña no modifica datos. */
export function renderTabs(box, tables, activeId, { onSelect, onClose }) {
  box.setAttribute('role', 'tablist');
  box.replaceChildren(...tables.map(t => {
    const w = document.createElement('div'); w.className = 'tab'; w.setAttribute('role', 'tab');
    w.setAttribute('aria-selected', String(t.id === activeId));
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t.name; b.onclick = () => onSelect(t.id);
    w.append(b);
    if (t.kind !== 'work') { const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', `Cerrar ${t.name}`); x.onclick = () => onClose(t.id); w.append(x); }
    return w;
  }));
}
