// Roda o jogo REAL (js/main.js) sem navegador, com skia-canvas como Canvas 2D.
// Uso:  npm install --no-save skia-canvas   (uma vez, na pasta do projeto)   e depois   node tests/browserless/game.test.mjs
// Variáveis: W, H (tamanho da janela simulada), CODE (código do mundo), NOAUTO=1 (começa no menu).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const req = createRequire(import.meta.url);
let skia;
for (const base of [ROOT + 'node_modules/', '/opt/oai-docgen/node_modules/']) { try { skia = createRequire(base)('skia-canvas'); break; } catch { /* tenta o próximo */ } }
if (!skia) { try { skia = req('skia-canvas'); } catch { /* sem skia */ } }
if (!skia) { console.error('skia-canvas não encontrado. Rode: npm install --no-save skia-canvas'); process.exit(2); }
process.chdir(ROOT);

const listeners = {}, rafQueue = [], store = {};
globalThis.window = globalThis;
globalThis.innerWidth = +(process.env.W || 1920); globalThis.innerHeight = +(process.env.H || 1080);
globalThis.addEventListener = (t, f) => (listeners[t] ||= []).push(f);
globalThis.requestAnimationFrame = (f) => rafQueue.push(f);
globalThis.Image = skia.Image;
globalThis.Path2D = skia.Path2D;
globalThis.__noLayerReuse = true;
if (process.env.WEATHER !== 'auto') globalThis.__forceWeather = process.env.WEATHER || 'clear';   // testes antigos: tempo aberto (previsível); WEATHER=auto usa o clima real     // skia-canvas guarda todo o histórico de desenho de um canvas reaproveitado: os testes recriam as camadas da água a cada quadro
globalThis.location = { hash: '' };
globalThis.history = { replaceState(_a, _b, url) { globalThis.__lastHash = url; } };
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.__store = store; globalThis.__copied = null;
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async (t) => { globalThis.__copied = t; } } }, configurable: true });
if (process.env.NOAUTO !== '1') globalThis.__autostart = { code: process.env.CODE || 'V2-G-TESTE-0001' };
const canvasListeners = {};
const mainCanvas = new skia.Canvas(640, 360); mainCanvas.style = {};
mainCanvas.addEventListener = (t, f) => (canvasListeners[t] ||= []).push(f);
globalThis.document = {
  getElementById: (id) => (globalThis.__dom && globalThis.__dom[id]) || (id === 'slots' || id === 'mismatch' ? null : mainCanvas),
  querySelectorAll: () => globalThis.__radios || [],
  createElement: () => { const c = new skia.Canvas(1, 1); c.style = {}; return c; },
  addEventListener: () => {}, activeElement: null,
};
export const fire = (type, code, tag = null) => (listeners[type] || []).forEach(f => f({ code, preventDefault() {}, target: tag ? { tagName: tag } : null }));
export const wheel = (deltaY) => (canvasListeners.wheel || []).forEach(f => f({ deltaY, preventDefault() {} }));
let now = 0;
// skia-canvas é "retained mode": o canvas principal guarda referência a tudo que foi desenhado nele (inclusive cada camada recriada da água)
// até ser reiniciado. No navegador o canvas é apresentado e esvaziado a cada quadro. Aqui reiniciamos o canvas principal a cada 60 quadros
// (o jogo redesenha tudo a cada quadro, então nada se perde) para a memória não crescer sem limite.
let frameCount = 0;
const flushMain = () => { if (++frameCount % 60 === 0) { mainCanvas.width = mainCanvas.width; mainCanvas.getContext('2d').imageSmoothingEnabled = false; } };
export const step = (n = 1, dtMs = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dtMs; flushMain(); const f = rafQueue.shift(); f(now); } };
export const hold = (code, frames, dtMs) => { fire('keydown', code); step(frames, dtMs); fire('keyup', code); };
export const holdKeys = (codes, frames, dtMs) => { codes.forEach(c => fire('keydown', c)); step(frames, dtMs); codes.forEach(c => fire('keyup', c)); };
export const tap = (code) => { fire('keydown', code); step(1); fire('keyup', code); };
export const shot = async (name, dir = '/tmp') => { const f = path.join(process.env.SHOTS || dir, name + '.png'); fs.writeFileSync(f, await mainCanvas.toBuffer('png')); return f; };
export const ctx2d = () => mainCanvas.getContext('2d');
export const stopPump = () => clearInterval(pump);
// durante o carregamento o navegador roda os quadros sozinho; aqui um "pump" faz o mesmo
const pump = setInterval(() => { for (let k = 0; k < 4 && rafQueue.length; k++) { now += 16.7; flushMain(); rafQueue.shift()(now); } }, 1);
await import(ROOT + 'js/main.js');
if (process.env.NOAUTO !== '1') {
  for (let i = 0; i < 4000 && !globalThis.__game; i++) await new Promise(r => setTimeout(r, 10));
  clearInterval(pump);
  if (!globalThis.__game) throw new Error('o jogo não iniciou');
}
export const G = globalThis.__game;
export const mainCanvasRef = mainCanvas;
