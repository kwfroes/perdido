import { CHARACTERS } from '../data/characters.js';
import { CONFIG } from '../core/config.js';
import { hasCharSelect, runCharSelect } from './charsel.js';
import { parseCode, randomSeedText, formatCode, DEFAULT_SIZE, GENERATOR_VERSION, SIZES_BY_VERSION, FULL_CODE_RE } from '../world/seed.js';

const $ = (id) => document.getElementById(id);
const STORE = 'perdido.ultimo';
const CURRENT_SIZES = SIZES_BY_VERSION[GENERATOR_VERSION];

export function readHashCode() {
  try { const m = /[#&]seed=([^&]+)/.exec(location.hash || ''); return m ? decodeURIComponent(m[1]) : null; } catch { return null; }
}
export function writeHashCode(code) {
  try { history.replaceState(null, '', '#seed=' + encodeURIComponent(code)); } catch { /* ignora (ex.: file://) */ }
}
// P1: último personagem escolhido
const CHAR_STORE = 'perdido.ultimo.character';
function loadChar() { try { const v = localStorage.getItem(CHAR_STORE); return v && CHARACTERS[v] ? v : null; } catch { return null; } }
function saveChar(v) { try { localStorage.setItem(CHAR_STORE, v); } catch { /* ignora */ } }
function loadLast() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; } }
function saveLast(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* ignora */ } }

const fmtTime = (s) => { const m = Math.floor(s / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Lista dos 3 espaços de jogo salvo (dentro do menu). Cliques por delegação: data-action + data-slot.
function renderSlots(el, slots, selected, pendingDelete) {
  if (!el) return;
  el.innerHTML = '<label>Jogos salvos</label>' + slots.map(s => {
    const sel = s.slot === selected ? ' selected' : '';
    if (s.summary) {
      const m = s.summary, del = pendingDelete === s.slot
        ? `<button type="button" data-action="delete-confirm" data-slot="${s.slot}" class="danger">Apagar mesmo</button><button type="button" data-action="delete-cancel" data-slot="${s.slot}">Não</button>`
        : `<button type="button" data-action="delete" data-slot="${s.slot}" title="Apagar">✕</button>`;
      return `<div class="slot${sel}" data-action="select" data-slot="${s.slot}"><span class="n">${s.slot}</span><span class="info"><b>${esc(m.code)}</b><span class="d">${CHARACTERS[m.character] ? esc(CHARACTERS[m.character].short) + ' · ' : ''}Dia ${m.day} · ${esc(m.season)} · ${fmtTime(m.playTime)}</span></span>`
        + `<button type="button" data-action="continue" data-slot="${s.slot}" class="primary small">Continuar</button>${del}</div>`;
    }
    if (s.broken) return `<div class="slot broken${sel}" data-action="select" data-slot="${s.slot}"><span class="n">${s.slot}</span><span class="info">Save com problema: ${esc(s.error)}</span><button type="button" data-action="delete" data-slot="${s.slot}">✕</button></div>`;
    return `<div class="slot empty${sel}" data-action="select" data-slot="${s.slot}"><span class="n">${s.slot}</span><span class="info">Vazio</span></div>`;
  }).join('') + `<p class="hint small">O novo jogo vai para o espaço ${selected}${slots.find(s => s.slot === selected && s.summary) ? ' (substitui o que está lá)' : ''}.</p>`;
}

// Mostra o menu. Devolve (Promise):
//   { action: 'new', code, slot }   jogo novo com o código escolhido, salvo no espaço `slot`
//   { action: 'load', slot }        continuar o jogo salvo no espaço `slot`
// opts.error: mensagem a mostrar já na abertura. opts.slots: resultado de saveStore.list(). opts.onDelete(slot): apaga e devolve a lista nova.
export function runMenu(opts = {}) {
  if (typeof opts === 'string') opts = { error: opts };
  const initialError = opts.error || '';
  return new Promise((resolve) => {
    const slotsEl = $('slots'); let slots = opts.slots || [], pendingDelete = 0;
    let selected = (slots.find(s => s.empty) || slots[0] || { slot: 1 }).slot;
    const redraw = () => renderSlots(slotsEl, slots, selected, pendingDelete);
    const onSlots = async (e) => {
      let t = e.target; while (t && t !== slotsEl && !(t.dataset && t.dataset.action)) t = t.parentNode;
      if (!t || !t.dataset) return; const a = t.dataset.action, n = +t.dataset.slot; if (!n) return;
      if (e.stopPropagation) e.stopPropagation();
      if (a === 'continue') { cleanup(); menu.hidden = true; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); resolve({ action: 'load', slot: n }); return; }
      if (a === 'delete') pendingDelete = n;
      else if (a === 'delete-cancel') pendingDelete = 0;
      else if (a === 'delete-confirm') { pendingDelete = 0; if (opts.onDelete) slots = await opts.onDelete(n); }
      else if (a === 'select') selected = n;
      redraw();
    };
    const menu = $('menu'), input = $('seed-input'), err = $('seed-error'), note = $('seed-note');
    const radios = [...document.querySelectorAll('input[name=size]')];
    let character = loadChar() || CONFIG.PLAYER.DEFAULT;                 // último escolhido (a escolha é na tela seguinte)
    const getSize = () => (radios.find(r => r.checked) || {}).value || DEFAULT_SIZE;
    const setSize = (v) => radios.forEach(r => { r.checked = r.value === v; });   // v inexistente = nenhum marcado
    const showError = (t) => { err.textContent = t; err.hidden = !t; };
    const showNote = (t) => { if (note) { note.textContent = t; note.hidden = !t; } };

    // Mostra um código no formulário. Versão atual: semente + tamanho nos controles.
    // Versão antiga (ou tamanho que a versão atual não tem): o código completo fica no campo e vale ele (recria o mundo exato).
    const showCode = (code) => {
      if (code.version === GENERATOR_VERSION && CURRENT_SIZES[code.size]) { input.value = code.seed; setSize(code.size); showNote(''); }
      else { input.value = formatCode(code); setSize(null); showNote(`Código do gerador v${code.version}: o mundo exato será recriado. Para usar o gerador atual, escolha um tamanho abaixo.`); }
    };

    // valor inicial: link (#seed=...) > último usado > aleatório
    const fromHash = readHashCode(), last = loadLast();
    const hashParsed = fromHash ? parseCode(fromHash) : null;
    if (hashParsed && hashParsed.ok) showCode(hashParsed.code);
    else if (last && last.seed && last.size && CURRENT_SIZES[last.size]) { input.value = last.seed; setSize(last.size); showNote(''); }
    else { input.value = randomSeedText(); setSize(DEFAULT_SIZE); showNote(''); }

    const play = () => {
      const r = parseCode(input.value, getSize());
      if (!r.ok) { showError(r.error); input.focus(); return; }
      showError('');
      if (r.code.version === GENERATOR_VERSION) saveLast({ seed: r.code.seed, size: r.code.size });
      const go = (ch) => {
        character = ch; saveChar(character); cleanup(); menu.hidden = true;
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // o foco não pode ficar num botão escondido
        resolve({ action: 'new', code: r.code, slot: selected, character });
      };
      if (!hasCharSelect()) { go(character); return; }                    // sem a tela (testes): segue com o último escolhido
      // 2º passo: escolher o personagem numa tela própria; "Voltar" devolve ao formulário
      menu.hidden = true; if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const sizeLabel = r.code.version === GENERATOR_VERSION ? ({ G: 'Grande 200×200', E: 'Enorme 400×400' })[r.code.size] || r.code.size : `código ${formatCode(r.code)}`;
      runCharSelect(character, { seed: r.code.version === GENERATOR_VERSION ? r.code.seed : formatCode(r.code), sizeLabel, slot: selected }).then((ch) => {
        if (ch) go(ch); else { menu.hidden = false; input.focus(); }
      });
    };
    const random = () => { input.value = randomSeedText(); setSize(getSize() in CURRENT_SIZES ? getSize() : DEFAULT_SIZE); showNote(''); showError(''); };
    const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); play(); } };
    // Ao colar (ou sair do campo) com um código completo: ajusta os controles. Não mexe enquanto o jogador digita.
    const normalize = () => {
      if (!FULL_CODE_RE.test(String(input.value).trim().toUpperCase())) return;
      const r = parseCode(input.value, getSize());
      if (r.ok) { showCode(r.code); showError(''); } else showError(r.error);
    };
    const onPaste = () => setTimeout(normalize, 0);
    const onSize = () => {                                           // escolher um tamanho a mão = usar o gerador atual
      const m = FULL_CODE_RE.test(String(input.value).trim().toUpperCase()) ? parseCode(input.value) : null;
      if (m && m.ok) input.value = m.code.seed;
      showNote(''); showError('');
    };
    const cleanup = () => {
      $('btn-play').removeEventListener('click', play); $('btn-random').removeEventListener('click', random);
      input.removeEventListener('keydown', onKey); input.removeEventListener('paste', onPaste); input.removeEventListener('blur', normalize);
      radios.forEach(r => r.removeEventListener('change', onSize));
      if (slotsEl) slotsEl.removeEventListener('click', onSlots);
    };
    $('btn-play').addEventListener('click', play); $('btn-random').addEventListener('click', random);
    input.addEventListener('keydown', onKey); input.addEventListener('paste', onPaste); input.addEventListener('blur', normalize);
    radios.forEach(r => r.addEventListener('change', onSize));
    if (slotsEl) { slotsEl.addEventListener('click', onSlots); redraw(); }
    showError(initialError);
    menu.hidden = false; input.focus(); input.select();
  });
}
// O gerador mudou desde o save: pergunta o que fazer. Devolve (Promise) 'load' | 'new'.
export function askMismatch(code) {
  return new Promise((resolve) => {
    const box = $('mismatch'), menu = $('menu');
    if (!box) { resolve('load'); return; }
    box.innerHTML = `<p><b>O mundo deste save mudou.</b> O jogo foi atualizado depois que você salvou <code>${esc(code)}</code>. `
      + 'Dá para carregar mesmo assim (o que não fizer mais sentido é descartado e você volta para um lugar seguro) ou começar de novo com a mesma semente.</p>'
      + '<button type="button" data-action="mismatch-load" class="primary">Carregar mesmo assim</button> <button type="button" data-action="mismatch-new">Começar de novo</button>';
    box.hidden = false; menu.hidden = false; menu.classList && menu.classList.add('asking');
    const on = (e) => { const a = e.target && e.target.dataset && e.target.dataset.action; if (a !== 'mismatch-load' && a !== 'mismatch-new') return;
      box.removeEventListener('click', on); box.hidden = true; menu.hidden = true; menu.classList && menu.classList.remove('asking'); resolve(a === 'mismatch-load' ? 'load' : 'new'); };
    box.addEventListener('click', on);
  });
}
export { formatCode };
