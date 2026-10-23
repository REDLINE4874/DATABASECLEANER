const LABELS = { success: 'Listo', info: 'Aviso', warning: 'Advertencia', error: 'Error' };
/** El significado se comunica con texto y símbolo, no solo con color. */
export function notify(type, message, ms = 6000) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const b = document.createElement('strong'); b.textContent = `${LABELS[type]}: `;
  t.append(b, document.createTextNode(message));
  box.append(t);
  setTimeout(() => t.remove(), ms);
}
