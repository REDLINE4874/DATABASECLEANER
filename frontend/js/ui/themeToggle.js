class ThemeToggle extends HTMLElement {
  static observedAttributes = ['size'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.button = this.shadowRoot.querySelector('.switch');
    this.button.addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme !== 'dark';
      this.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: dark ? 'dark' : 'light' }, bubbles: true }));
    });
    this.sync();
    this.themeObserver = new MutationObserver(() => this.sync());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  disconnectedCallback() { this.themeObserver?.disconnect(); }

  attributeChangedCallback() { if (this.isConnected) this.render(); }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; --w: 52px; --h: 28px; --pad: 3px; --knob: 22px; --tx: 24px; }
        :host([size="sm"]) { --w: 42px; --h: 23px; --pad: 2px; --knob: 19px; --tx: 19px; }
        :host([size="lg"]) { --w: 64px; --h: 34px; --pad: 4px; --knob: 26px; --tx: 30px; }
        .switch { position: relative; width: var(--w); height: var(--h); padding: 0; border: 0; border-radius: 10px; overflow: hidden; cursor: pointer; background: linear-gradient(135deg,#8ec9f0,#f7d9a0); box-shadow: inset 0 2px 6px rgba(0,0,0,.15),0 3px 8px rgba(0,0,0,.12); transition: background .35s,box-shadow .35s,transform .15s; }
        .switch:hover { box-shadow: inset 0 2px 6px rgba(0,0,0,.18),0 5px 12px rgba(0,0,0,.2); }
        .switch:active { transform: scale(.95); }
        .switch:focus-visible { outline: 3px solid #6ea8fe; outline-offset: 3px; }
        .switch.dark { background: linear-gradient(135deg,#07171d,#123a47); box-shadow: inset 0 2px 6px rgba(0,0,0,.35),0 3px 9px rgba(0,0,0,.3); }
        .clouds,.stars { position: absolute; inset: 0; transition: opacity .35s,transform .35s; }
        .clouds span { position: absolute; border-radius: 10px; background: rgba(255,255,255,.9); }
        .clouds span:first-child { width: 18%; height: 20%; top: 18%; left: 17%; }
        .clouds span:last-child { width: 13%; height: 15%; top: 61%; left: 24%; }
        .switch.dark .clouds { opacity: 0; transform: translateX(-5px); }
        .stars { opacity: 0; transform: translateX(5px); }
        .switch.dark .stars { opacity: 1; transform: translateX(0); }
        .stars span { position: absolute; width: 2px; height: 2px; border-radius: 10px; background: #fff; box-shadow: 0 0 3px #fff; }
        .stars span:nth-child(1) { top: 21%; left: 15%; } .stars span:nth-child(2) { top: 43%; left: 27%; width: 1px; height: 1px; }
        .stars span:nth-child(3) { top: 64%; left: 17%; } .stars span:nth-child(4) { top: 29%; left: 35%; width: 1px; height: 1px; }
        .knob { position: absolute; top: var(--pad); left: var(--pad); width: var(--knob); height: var(--knob); border-radius: 10px; background: #ffb648; box-shadow: 0 3px 8px rgba(0,0,0,.25); transition: transform .35s cubic-bezier(.68,-.4,.27,1.4),background .3s; }
        .switch.dark .knob { transform: translateX(var(--tx)); background: #eaf2f4; box-shadow: 0 3px 8px rgba(0,0,0,.35),inset 0 0 0 1px rgba(0,0,0,.08); }
        .crater { position: absolute; border-radius: 10px; background: #b9c5d8; opacity: 0; }
        .switch.dark .crater { opacity: 1; } .c1 { width: 23%; height: 23%; top: 18%; left: 23%; } .c2 { width: 14%; height: 14%; top: 50%; left: 50%; } .c3 { width: 11%; height: 11%; top: 27%; left: 64%; }
      </style>
      <button class="switch" type="button" role="switch" aria-label="Cambiar entre modo claro y oscuro" aria-checked="false">
        <span class="clouds"><span></span><span></span></span><span class="stars"><span></span><span></span><span></span><span></span></span>
        <span class="knob"><span class="crater c1"></span><span class="crater c2"></span><span class="crater c3"></span></span>
      </button>`;
    if (this.button) this.button = this.shadowRoot.querySelector('.switch');
  }

  sync() {
    if (!this.button) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    this.button.classList.toggle('dark', dark);
    this.button.setAttribute('aria-checked', String(dark));
    this.button.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
}

customElements.define('theme-toggle', ThemeToggle);
