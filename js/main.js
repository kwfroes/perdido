import { CONFIG } from './core/config.js';
import { GameLoop } from './core/gameLoop.js';
import { Input } from './core/input.js';
import { Renderer } from './engine/renderer.js';
import { loadAssets } from './engine/assets.js';
import { generateWorld } from './world/index.js';
import { parseCode, formatCode } from './world/seed.js';
import { Session } from './game/session.js';
import { runMenu, writeHashCode, askMismatch } from './ui/menu.js';
import { getSaveStore } from './save/saveStore.js';
import { worldFingerprint } from './save/worldState.js';
import { TouchControls } from './ui/touchControls.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input();

// ---- estado de alto nível: boot | menu | generating | playing ----
const app = globalThis.__app = { mode: 'boot', session: null, status: 'Carregando...', progress: 0, code: '', error: '', wantMenu: null,
  store: null, slot: null, saveTimer: 0, lastSave: null, blocked: false };   // blocked = celular em retrato (pausa tudo)
const touch = app.touch = new TouchControls(input, renderer, app);

// salva a partida no espaço atual (sem espaço = não salva; ex.: testes automáticos)
async function saveNow(reason = 'auto') {
  if (!app.session || !app.slot || !app.store) return null;
  const data = app.session.serialize(); const r = await app.store.save(app.slot, data);
  app.lastSave = { at: Date.now(), reason, ok: r.ok, error: r.error };
  if (!r.ok && app.session) app.session.toast('Não foi possível salvar: ' + r.error, 4);
  return r;
}
globalThis.__saveNow = saveNow;
// ao fechar a aba ou trocar de janela: salva (o localStorage é síncrono, então isso dá tempo)
if (globalThis.addEventListener) {
  globalThis.addEventListener('beforeunload', () => { saveNow('unload'); });
  globalThis.addEventListener('visibilitychange', () => { if (globalThis.document && document.visibilityState === 'hidden') saveNow('hidden'); });
}

// clique do mouse na mochila e no mapa (no celular, quem trata é o touchControls); coordenadas lógicas = pixel da tela / escala
const logical = (e) => { const r = canvas.getBoundingClientRect(), k = renderer.scale; return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
if (canvas.addEventListener) {
  canvas.addEventListener('pointerdown', (e) => { if (!(app.mode === 'playing' && app.session) || e.pointerType === 'touch') return; const [x, y] = logical(e); if (app.session.mouseDown(x, y)) e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => { if (!(app.mode === 'playing' && app.session) || e.pointerType === 'touch') return; const [x, y] = logical(e); app.session.mouseMove(x, y); });
}
// roda do mouse: afasta/aproxima (só durante a partida)
if (canvas.addEventListener) canvas.addEventListener('wheel', (e) => {
  if (!(app.mode === 'playing' && app.session)) return;
  e.preventDefault(); const inv = app.session.inventory;
  if (inv && inv.open) { inv.scrollBy(e.deltaY > 0 ? 1 : -1); return; }         // mochila aberta: a roda rola a grade (não muda o zoom)
  app.session.zoom(e.deltaY > 0 ? +1 : -1);
}, { passive: false });

function update(dt) {
  touch.sync();
  if (app.mode === 'playing' && app.session && app.blocked) { input.endFrame(); return; }   // retrato: jogo parado até girar
  if (app.mode === 'playing' && app.session) {
    if (input.wasPressed('F2') && app.wantMenu) { const r = app.wantMenu; app.wantMenu = null; saveNow('menu').finally(r); input.endFrame(); return; }
    app.session.update(dt);
    app.saveTimer += dt; if (app.saveTimer >= CONFIG.SAVE.AUTOSAVE_SECONDS) { app.saveTimer = 0; saveNow('auto'); }
  }
}

function drawBoot() {
  const { ctx, width: vw, height: vh } = renderer;
  renderer.clear('#0e1410');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d9a066'; ctx.font = 'bold 22px monospace'; ctx.fillText('PERDIDO', vw / 2, vh / 2 - 34);
  ctx.fillStyle = '#f3e9d8'; ctx.font = '11px monospace'; ctx.fillText(app.status, vw / 2, vh / 2 - 6);
  if (app.mode === 'generating') {
    const w = 180, x = Math.round(vw / 2 - w / 2), y = Math.round(vh / 2 + 6);
    ctx.fillStyle = '#2a2018'; ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = '#d9a066'; ctx.fillRect(x, y, Math.round(w * app.progress), 8);
    ctx.fillStyle = '#c8bfae'; ctx.fillText(`Semente: ${app.code}`, vw / 2, y + 28);
  }
  if (app.error) { ctx.fillStyle = '#ffb4a8'; ctx.fillText(app.error, vw / 2, vh / 2 + 70); }
  ctx.textAlign = 'left';
}
function render() { if (app.mode === 'playing' && app.session) app.session.render(); else drawBoot(); }

// espera um quadro de verdade (para o navegador conseguir pintar a barra de progresso)
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const copyText = (t) => navigator.clipboard.writeText(t);

async function main() {
  new GameLoop(update, render, CONFIG.MAX_DELTA).start();
  let assets;
  try { assets = await loadAssets(); }
  catch (e) { app.error = e.message + ' (rode por um servidor: Live Server ou python -m http.server)'; throw e; }

  app.store = await getSaveStore();
  const auto = globalThis.__autostart;                      // usado pelos testes automatizados
  let choice = auto ? { action: 'new', code: parseCode(auto.code).code, slot: auto.slot || null } : null;
  for (;;) {
    if (!choice) {
      app.mode = 'menu'; app.status = 'Escolha uma semente...';
      let slots = []; try { slots = await app.store.list(); } catch (e) { app.error = 'Não consegui ler os jogos salvos: ' + e.message; }
      choice = await runMenu({ error: app.error, slots, onDelete: async (n) => { await app.store.remove(n); return app.store.list(); } }); app.error = '';
    }
    let code = choice.code, save = null; const slot = choice.slot, choiceChar = choice.character || (auto && auto.character) || null;
    if (choice.action === 'load') {
      const r = await app.store.load(slot);
      if (!r.ok) { app.error = `Espaço ${slot}: ${r.error}`; choice = null; continue; }
      const pc = parseCode(r.data.code); if (!pc.ok) { app.error = `Espaço ${slot}: ${pc.error}`; choice = null; continue; }
      code = pc.code; save = r.data;
    }
    choice = null;
    app.mode = 'generating'; app.code = formatCode(code); app.progress = 0; app.status = save ? 'Carregando o jogo salvo...' : 'Gerando mundo...'; app.error = '';
    await nextFrame();
    // Qualquer falha (gerar o mundo OU montar a partida) volta ao menu COM a mensagem: o menu HTML cobre o canvas,
    // então o erro precisa ser mostrado dentro dele.
    let world, session;
    try {
      world = await (globalThis.__generateOverride || generateWorld)(code, { onProgress: (t, f) => { app.status = t; app.progress = f; }, yieldFn: nextFrame });
      if (save && worldFingerprint(world) !== save.fingerprint && (await askMismatch(save.code)) === 'new') save = null;
      session = new Session({ world, assets, renderer, input, onCopy: copyText, save, character: choiceChar });
    } catch (e) { console.error(e); app.error = 'Não foi possível criar este mundo: ' + (e && e.message ? e.message : e); app.mode = 'menu'; continue; }
    app.session = session; app.slot = slot; app.saveTimer = 0; session.touchMode = touch.enabled;
    window.__game = Object.assign(app.session, { app });     // acesso para depuração/testes
    writeHashCode(world.code);
    app.mode = 'playing';
    if (!save) await saveNow('new');                         // jogo novo: já ocupa o espaço escolhido
    await new Promise((resolve) => { app.wantMenu = resolve; });   // espera F2 (que salva antes de voltar)
    if (app.session && app.session.terminal) app.session.terminal.dispose();
    app.session = null; app.slot = null;
  }
}
main();
