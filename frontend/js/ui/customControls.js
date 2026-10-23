const SELECT_CLASS = 'dc-select';

function enhanceSelect(select) {
  if (select.dataset.enhanced === 'true') return;
  select.dataset.enhanced = 'true';

  const wrapper = document.createElement('div');
  wrapper.className = SELECT_CLASS;
  select.parentNode.insertBefore(wrapper, select);
  wrapper.append(select);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'dc-select__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const menu = document.createElement('div');
  menu.className = 'dc-select__menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;

  const close = () => {
    menu.hidden = true;
    wrapper.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  };

  const renderOptions = () => {
    menu.replaceChildren(...Array.from(select.options).map(option => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dc-select__option';
      item.textContent = option.textContent;
      item.dataset.value = option.value;
      item.setAttribute('role', 'option');
      item.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      });
      return item;
    }));
    sync();
  };

  const sync = () => {
    trigger.textContent = select.options[select.selectedIndex]?.text || 'Selecciona una opción';
    menu.querySelectorAll('[role="option"]').forEach(item => {
      item.setAttribute('aria-selected', String(item.dataset.value === select.value));
    });
  };

  trigger.addEventListener('click', () => {
    const open = menu.hidden;
    document.querySelectorAll(`.${SELECT_CLASS}.is-open`).forEach(item => {
      if (item !== wrapper) item.querySelector('.dc-select__trigger')?.click();
    });
    menu.hidden = !open;
    wrapper.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
  });
  select.addEventListener('change', sync);
  select.addEventListener('input', sync);
  trigger.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.addEventListener('click', event => { if (!wrapper.contains(event.target)) close(); });

  const observer = new MutationObserver(renderOptions);
  observer.observe(select, { childList: true });
  wrapper.append(trigger, menu);
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  renderOptions();
}

function scan(root = document) {
  root.querySelectorAll?.('select:not([data-enhanced="true"])').forEach(enhanceSelect);
}

scan();
new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
  if (node.nodeType === Node.ELEMENT_NODE) scan(node);
}))).observe(document.body, { childList: true, subtree: true });
