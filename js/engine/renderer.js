import { CONFIG } from '../core/config.js';

// O canvas preenche a janela inteira. A escala é sempre INTEIRA (pixel art nítida); a resolução lógica se adapta
// à janela. ZOOM: o jogador pode afastar a câmera (mostra mais mundo) em passos inteiros, a partir da escala automática:
//   automática = round(altura da janela / REF_HEIGHT);  afastar = escala - 1, - 2...  (mínimo ZOOM_MIN_SCALE, no máx. ZOOM_MAX_STEPS passos)
// Em telas pequenas (escala automática 2) não há zoom afastado: o salto 2x -> 1x deixaria tudo minúsculo.
const STORE = 'perdido.zoom';
function loadStep() { try { const v = parseInt(localStorage.getItem(STORE), 10); return Number.isFinite(v) && v >= 0 ? v : 0; } catch { return 0; } }
function saveStep(v) { try { localStorage.setItem(STORE, String(v)); } catch { /* ignora */ } }

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0; this.height = 0; this.scale = 1; this.autoScale = 1; this.minScale = 1;
    this.zoomStep = loadStep();                 // 0 = automático; 1 = um nível mais longe; ...
    this.onZoom = null; this.onResize = null;   // onResize: a câmera se reposiciona quando a janela muda (girar o celular)                         // callback(scale) quando o zoom muda
    window.addEventListener('resize', () => this.fit());
    this.fit();
  }
  fit() {
    const w = window.innerWidth, h = window.innerHeight;
    const auto = Math.max(1, Math.round(h / CONFIG.REF_HEIGHT));
    const minS = Math.max(Math.min(auto, CONFIG.ZOOM_MIN_SCALE), auto - CONFIG.ZOOM_MAX_STEPS);
    const s = Math.max(minS, auto - this.zoomStep);
    this.autoScale = auto; this.minScale = minS; this.scale = s;
    this.width = Math.ceil(w / s);
    this.height = Math.ceil(h / s);
    this.canvas.width = this.width;    // redimensionar reseta o contexto
    this.canvas.height = this.height;
    this.canvas.style.width = `${this.width * s}px`;
    this.canvas.style.height = `${this.height * s}px`;
    this.ctx.imageSmoothingEnabled = false;
    if (this.onResize) this.onResize();
  }
  canZoomOut() { return this.scale > this.minScale; }
  canZoomIn() { return this.scale < this.autoScale; }
  // dir > 0 afasta (vê mais mundo); dir < 0 aproxima. Devolve true se mudou.
  zoom(dir) {
    const next = Math.max(0, this.zoomStep + (dir > 0 ? 1 : -1));
    const prev = this.scale;
    if (dir > 0 && !this.canZoomOut()) return false;
    if (dir < 0 && !this.canZoomIn()) return false;
    this.zoomStep = next; this.fit(); saveStep(next);
    if (this.scale !== prev && this.onZoom) this.onZoom(this.scale);
    return this.scale !== prev;
  }
  clear(color = '#000') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
