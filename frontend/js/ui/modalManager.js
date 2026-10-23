/** Modal reutilizable sobre <dialog>. Resuelve con el `value` del botón pulsado (false si se cierra con Esc). */
export function openModal({ title, body, actions }) {
  return new Promise(resolve => {
    const d = document.getElementById('modal');
    let result = false;
    d.querySelector('.modal-title').textContent = title;
    d.querySelector('.modal-body').replaceChildren(body);
    d.querySelector('.modal-actions').replaceChildren(...actions.map(a => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = a.label;
      btn.className = a.primary ? 'btn btn-primary' : 'btn';
      btn.onclick = () => { result = a.value; d.close(); };
      return btn;
    }));
    d.onclose = () => resolve(result);
    d.showModal();
  });
}
