import { TouchState, actLabel } from './touchState.js';

// Camada DOM dos controles de toque (só no navegador). Monta-se apenas se houver matchMedia + document.body:
// o harness sem navegador não tem nenhum dos dois, então os testes antigos não mudam.
// Ativa em aparelhos com toque, ou forçado com #touch / ?touch=1 na URL (para testar no PC).
const SVG = {
  bag: '<svg viewBox="0 0 24 24"><path d="M8 7V5a4 4 0 0 1 8 0v2"/><rect x="4" y="7" width="16" height="14" rx="3"/><path d="M9 13h6"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  tab: '<svg viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M11 8v6M8 11h6M16 16l4 4"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M8 11h6M16 16l4 4"/></svg>',
};

export function touchWanted() {
  const g = globalThis;
  if (!g.matchMedia || !g.document || !g.document.body) return false;
  const loc = g.location || {}, forced = /(^|[#&?])touch(=1)?($|&)/.test((loc.hash || '') + (loc.search || ''));
  return forced || 'ontouchstart' in g || (g.navigator && g.navigator.maxTouchPoints > 0);
}

export class TouchControls {
  constructor(input, renderer, app) {
    this.input = input; this.renderer = renderer; this.app = app; this.state = new TouchState(input);
    this.enabled = touchWanted(); this.root = null; this.label = null; this.visible = null;
    if (!this.enabled) return;
    document.documentElement.classList.add('touch');
    this.build(); this.watchOrientation(); this.hookPlay();
  }
  btn(cls, html, title) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tc-btn ' + cls; b.innerHTML = html; b.title = title; b.setAttribute('aria-label', title); return b; }
  // toque com captura: o dedo pode escorregar para fora do botão sem soltar a ação
  bindHold(el, down, up) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch { /* ok */ } el.classList.add('on'); down(e); });
    const end = (e) => { el.classList.remove('on'); up(e); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  }
  bindTap(el, code) { el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.classList.add('on'); this.state.tap(typeof code === 'function' ? code() : code); });
    const off = () => el.classList.remove('on'); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); }
  build() {
    const root = this.root = document.createElement('div'); root.id = 'touch-controls'; root.hidden = true;
    root.addEventListener('contextmenu', (e) => e.preventDefault());
    // analógico (esquerda)
    const base = document.createElement('div'); base.className = 'tc-stick'; const knob = document.createElement('div'); knob.className = 'tc-knob'; base.appendChild(knob);
    let cx = 0, cy = 0, R = 1, pid = null;
    const move = (e) => { let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy);
      if (m > R) { dx = dx / m * R; dy = dy / m * R; } knob.style.transform = `translate(${dx}px, ${dy}px)`; this.state.setStick(dx, dy, R); };
    base.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; try { base.setPointerCapture(pid); } catch { /* ok */ }
      const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width / 2; base.classList.add('on'); move(e); });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === pid) move(e); });
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; knob.style.transform = ''; base.classList.remove('on'); this.state.releaseStick(); };
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end); base.addEventListener('lostpointercapture', end);
    // AGIR (direita)
    const act = this.btn('tc-act', '<b>AGIR</b><span></span>', 'Agir (E)'); this.label = act.querySelector('span');
    this.bindHold(act, () => { const s = this.app.session; if (s && s.secretAct && s.secretAct()) return; this.state.actDown(); }, () => this.state.actUp());   // com o código quase completo, o AGIR é do código (não age no jogo)
    // atalhos (canto superior direito, abaixo do relógio)
    const bar = this.bar = document.createElement('div'); bar.className = 'tc-bar';
    const bag = this.btn('', SVG.bag, 'Mochila (I)'), map = this.btn('', SVG.map, 'Mapa (F4)'), menu = this.btn('', SVG.menu, 'Salvar e menu (F2)');
    const tab = this.tabBtn = this.btn('tc-tab', SVG.tab, 'Trocar aba (Tab)'), zin = this.zin = this.btn('', SVG.plus, 'Aproximar'), zout = this.zout = this.btn('', SVG.minus, 'Afastar');
    this.bindTap(bag, 'KeyI'); this.bindTap(map, 'F4'); this.bindTap(menu, 'F2'); this.bindTap(tab, 'Tab'); this.bindTap(zin, 'Equal'); this.bindTap(zout, 'Minus');
    [bag, tab, map, zin, zout, menu].forEach(b => bar.appendChild(b));
    root.append(base, act, bar); document.body.appendChild(root);
    // toque direto no canvas: inventário (abas, slots, receitas, Fabricar, X), diálogo (avança) e mapa (fecha)
    const cv = document.getElementById('game');
    if (cv) cv.addEventListener('pointerdown', (e) => {
      const s = this.app.session; if (this.app.mode !== 'playing' || !s || this.app.blocked) return;
      const r = cv.getBoundingClientRect(), k = this.renderer.scale;
      if (s.tapAt((e.clientX - r.left) / k, (e.clientY - r.top) / k)) e.preventDefault();
    });
  }
  portrait() { return !!(globalThis.matchMedia && globalThis.matchMedia('(orientation: portrait)').matches); }
  watchOrientation() {
    const g = globalThis, refit = () => { this.app.blocked = this.portrait(); if (this.app.blocked) this.state.releaseAll(); this.renderer.fit(); };
    try { g.matchMedia('(orientation: portrait)').addEventListener('change', refit); } catch { /* navegador antigo */ }
    if (g.visualViewport) g.visualViewport.addEventListener('resize', () => this.renderer.fit());
    g.addEventListener('orientationchange', () => setTimeout(refit, 150));
    g.addEventListener('blur', () => this.state.releaseAll());
    refit();
  }
  // Jogar: tela cheia + trava em paisagem (Android/Chrome; no iOS o aviso de girar cuida disso)
  hookPlay() {
    const b = document.getElementById('btn-play'); if (!b || b === document.getElementById('game')) return;
    b.addEventListener('click', async () => {
      try { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }); } catch { /* ok */ }
      try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch { /* ok */ }
    }, true);
  }
  // chamado a cada quadro pelo main.js
  sync() {
    if (!this.enabled) return;
    const app = this.app, s = app.session, show = app.mode === 'playing' && !!s && !app.blocked;
    if (show !== this.visible) { this.visible = show; this.root.hidden = !show; if (!show) this.state.releaseAll(); }
    if (!show) return;
    const cb = s.hudHits && s.hudHits.clockBottom, top = cb ? Math.round(cb * (this.renderer.scale || 1)) + 6 : 48; if (top !== this._barTop) { this._barTop = top; this.bar.style.top = top + 'px'; }   // abaixo do relógio (que fica maior no toque)
    const l = actLabel(s); if (l !== this._l) { this._l = l; this.label.textContent = l; }
    const inv = !!(s.inventory && s.inventory.open); if (inv !== this._inv) { this._inv = inv; this.tabBtn.hidden = !inv; }
    const zi = this.renderer.canZoomIn(), zo = this.renderer.canZoomOut();
    if (zi !== this._zi) { this._zi = zi; this.zin.hidden = !zi; } if (zo !== this._zo) { this._zo = zo; this.zout.hidden = !zo; }
  }
}
