const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/** Construye una <table> con textContent (nunca innerHTML): el contenido de las celdas no se interpreta como HTML. */
export function buildTableEl(columns, valueRows, firstNumber = 1, onSort = null, sort = null, flags = null) {
  const table = el('table', 'data-table');
  const tr = el('tr'); tr.append(el('th', 'row-num', '#'));
  for (const c of columns) {
    const th = el('th'); th.scope = 'col';
    if (onSort) {
      const btn = el('button', 'th-btn', c.name); btn.type = 'button';
      const dir = sort && sort.col === c.index ? sort.dir : null;
      if (dir) { btn.append(el('span', 'sort-mark', dir === 'asc' ? ' ▲' : ' ▼')); th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending'); }
      btn.onclick = () => onSort(c.index);
      th.append(btn);
    } else th.textContent = c.name;
    tr.append(th);
  }
  table.createTHead().append(tr);
  const tb = table.createTBody();
  valueRows.forEach((vals, i) => {
    const r = el('tr'), mark = flags && flags[i];
    if (mark) r.className = 'dup-row';
    r.append(el('td', 'row-num', (mark ? '● ' : '') + (firstNumber + i)));
    if (mark) r.firstChild.title = 'Registro duplicado';
    for (const c of columns) r.append(el('td', null, vals[c.index] ?? ''));
    tb.append(r);
  });
  return table;
}

/** Tabla principal con paginación y ordenamiento. Ordenar solo cambia el orden de la vista, no los datos. */
export class TableView {
  constructor(root) {
    this.root = root; this.pageSize = 50; this.page = 0; this.sort = null; this.table = null; this.order = []; this.highlight = null;
    this.scroll = el('div', 'table-scroll'); this.scroll.tabIndex = 0;
    this.scroll.setAttribute('role', 'region'); this.scroll.setAttribute('aria-label', 'Tabla de datos');
    this.pager = el('div', 'pager');
    this.info = el('span', 'pager-info');
    const mk = (label, fn) => { const b = el('button', 'btn btn-sm', label); b.type = 'button'; b.onclick = fn; return b; };
    this.btns = [mk('« Primera', () => this.go(0)), mk('‹ Anterior', () => this.go(this.page - 1)),
                 mk('Siguiente ›', () => this.go(this.page + 1)), mk('Última »', () => this.go(this.pages() - 1))];
    const sel = el('select'); sel.setAttribute('aria-label', 'Filas por página');
    [25, 50, 100, 250].forEach(n => sel.append(new Option(`${n} por página`, n, n === 50, n === 50)));
    sel.onchange = () => { this.pageSize = +sel.value; this.page = 0; this.render(); };
    this.pager.append(this.info, ...this.btns, sel);
    root.replaceChildren(this.scroll, this.pager);
  }
  pages() { return Math.max(1, Math.ceil(this.order.length / this.pageSize)); }
  go(p) { this.page = Math.min(Math.max(0, p), this.pages() - 1); this.render(); }
  setTable(table) { this.table = table; this.page = 0; this.sort = null; this.order = table ? table.rows : []; this.render(); }
  sortBy(col) {
    const cur = this.sort && this.sort.col === col ? this.sort.dir : null;
    this.sort = cur === null ? { col, dir: 'asc' } : cur === 'asc' ? { col, dir: 'desc' } : null;
    if (!this.sort) this.order = this.table.rows;
    else { const k = this.sort.dir === 'asc' ? 1 : -1;
      this.order = this.table.rows.slice().sort((a, b) => k * collator.compare(a.v[col], b.v[col])); }
    this.page = 0; this.render();
  }
  render() {
    const total = this.order.length;
    if (!this.table) { this.scroll.replaceChildren(el('p', 'empty-state', 'Importa un archivo CSV para ver sus registros aquí.')); this.pager.hidden = true; return; }
    this.pager.hidden = false;
    const start = this.page * this.pageSize, slice = this.order.slice(start, start + this.pageSize);
    this.scroll.replaceChildren(total === 0
      ? el('p', 'empty-state', 'El archivo no contiene registros de datos.')
      : buildTableEl(this.table.view || this.table.columns, slice.map(r => r.v), start + 1, c => this.sortBy(c), this.sort, this.highlight && slice.map(r => this.highlight.has(r.id))));
    this.info.textContent = total ? `Registros ${start + 1}–${start + slice.length} de ${total.toLocaleString()} · Página ${this.page + 1} de ${this.pages()}` : 'Sin registros';
    this.btns[0].disabled = this.btns[1].disabled = this.page === 0;
    this.btns[2].disabled = this.btns[3].disabled = this.page >= this.pages() - 1;
  }
}
