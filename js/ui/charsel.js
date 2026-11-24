// Tela de escolha de personagem (2º passo do Novo jogo): ficha grande com o personagem de corpo inteiro andando,
// história curta e o que cada qualidade faz de verdade no jogo. A parte "pura" (textos dos efeitos) é testável sem navegador.
import { CHARACTERS, CHARACTER_ORDER } from '../data/characters.js';

// o que cada qualidade faz, com os números das regras (js/systems/vitals.js)
export const TRAIT_INFO = {
  vigor:      { label: 'Vigor',       effect: (v) => { const d = Math.round((v - 50) * 0.5); return d ? `${d > 0 ? '−' : '+'}${Math.abs(d)}% de energia ao correr, remar e golpear` : 'Gasto de energia normal'; } },
  metabolism: { label: 'Metabolismo', effect: (v) => { const d = Math.round(v - 50); return d ? `Fome ${Math.abs(d)}% mais ${d > 0 ? 'lenta' : 'rápida'}; a comida rende ${d > 0 ? 'mais' : 'menos'}` : 'Fome e comida normais'; } },
  lung:       { label: 'Fôlego',      effect: (v) => `${v >= 58 ? 'Acima da média' : v <= 46 ? 'Abaixo da média' : 'Na média'} na água (vale quando der para nadar)` },
  hardiness:  { label: 'Resistência', effect: (v) => { const hp = Math.round(100 + (v - 50) * 0.5), d = Math.round(v - 50); return `Vida máx. ${hp}; ${d >= 0 ? 'chuva, noite e frio cansam ' + d + '% menos' : 'chuva, noite e frio cansam ' + Math.abs(d) + '% mais'}`; } },
};
export function sheetFor(id) {
  const c = CHARACTERS[id], t = c.traits || {};
  return { id, name: c.short, group: c.group, age: c.age, origin: c.origin, story: c.story || c.bio, pros: c.pros || '', cons: c.cons || '',
    traits: Object.keys(TRAIT_INFO).map(k => ({ key: k, label: TRAIT_INFO[k].label, value: t[k] ?? 50, effect: TRAIT_INFO[k].effect(t[k] ?? 50) })) };
}
const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Abre a tela. Devolve (Promise) o id escolhido, ou null se o jogador voltou. info = { seed, sizeLabel, slot }.
// Só no navegador: precisa de #charsel de verdade (no harness de testes o menu pula esta tela).
export function hasCharSelect() { const el = document.getElementById('charsel'); return !!(el && el.tagName === 'DIV'); }
export function runCharSelect(initial, info = {}) {
  return new Promise((resolve) => {
    const $ = (id) => document.getElementById(id), root = $('charsel'), list = $('cs-list'), fig = $('cs-fig'), sheet = $('cs-sheet');
    const ids = CHARACTER_ORDER.filter(id => CHARACTERS[id]); let cur = ids.includes(initial) ? initial : ids[0];
    $('cs-world').textContent = info.seed ? `Semente ${info.seed} · ${info.sizeLabel || ''} · espaço ${info.slot || 1}` : '';
    // ---- personagem andando: frente parado, anda para a direita, costas, anda para a esquerda (frames da própria folha) ----
    const SEQ = [['down', false, 1.6], ['right', true, 2.2], ['up', false, 1.2], ['left', true, 2.2]];
    let t0 = performance.now(), raf = 0;
    const scale = () => (window.innerHeight < 520 ? 3 : 4);
    const draw = (now) => {
      const c = CHARACTERS[cur], S = scale(), [cw, ch] = c.cell, total = SEQ.reduce((a, s) => a + s[2], 0);
      let t = ((now - t0) / 1000) % total, k = 0; while (t > SEQ[k][2]) { t -= SEQ[k][2]; k++; }
      const [dir, walking] = SEQ[k], row = c.rows[dir]; let col = c.idle, flip = false, dy = 0;
      if (walking) { const w = c.walk[dir], it = w[Math.floor(t * 8) % w.length]; if (typeof it === 'number') col = it; else { col = it.f; flip = !!it.flip; dy = it.dy || 0; } }
      fig.style.width = `${cw * S}px`; fig.style.height = `${ch * S}px`;
      fig.style.backgroundImage = `url('${c.file}')`; fig.style.backgroundSize = `${cw * 5 * S}px ${ch * 4 * S}px`;
      fig.style.backgroundPosition = `-${col * cw * S}px -${row * ch * S}px`; fig.style.transform = `translateY(${dy * S}px)${flip ? ' scaleX(-1)' : ''}`;
      raf = requestAnimationFrame(draw);
    };
    const render = () => {
      list.innerHTML = ids.map(id => { const c = CHARACTERS[id], on = id === cur;
        return `<button type="button" class="cs-item${on ? ' selected' : ''}" role="radio" aria-checked="${on}" data-char="${id}">`
          + `<span class="cs-face" style="background-image:url('${c.file}')"></span><span><b>${esc(c.short)}</b><small>${esc(c.group)}</small></span></button>`; }).join('');
      const s = sheetFor(cur);
      sheet.innerHTML = `<h2>${esc(s.name)}</h2><p class="cs-meta">${esc(s.group)}${s.age ? ` · ${s.age} anos` : ''}${s.origin ? ` · ${esc(s.origin)}` : ''}</p>`
        + `<p class="cs-story">${esc(s.story)}</p><h3>Qualidades</h3><div class="cs-traits">`
        + s.traits.map(t => `<div class="cs-tr"><span class="cs-tl">${esc(t.label)}</span><span class="cs-bar"><b style="width:${Math.max(4, Math.min(100, t.value))}%"></b><i></i></span><span class="cs-tv">${t.value}</span><span class="cs-te">${esc(t.effect)}</span></div>`).join('')
        + `</div><p class="cs-tags">${s.pros ? `<span class="pro">${esc(s.pros)}</span>` : ''}${s.cons ? `<span class="con">${esc(s.cons)}</span>` : ''}</p>`;
      t0 = performance.now();
    };
    const pick = (id) => { if (id && id !== cur) { cur = id; render(); } };
    const step = (d) => pick(ids[(ids.indexOf(cur) + d + ids.length) % ids.length]);
    const onList = (e) => { let t = e.target; while (t && t !== list && !(t.dataset && t.dataset.char)) t = t.parentNode; if (t && t.dataset && t.dataset.char) pick(t.dataset.char); };
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); done(cur); }
      else if (e.key === 'Escape') { e.preventDefault(); done(null); }
    };
    const onStart = () => done(cur), onBack = () => done(null);
    const done = (v) => {
      cancelAnimationFrame(raf); list.removeEventListener('click', onList); window.removeEventListener('keydown', onKey);
      $('cs-start').removeEventListener('click', onStart); $('cs-back').removeEventListener('click', onBack);
      root.hidden = true; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); resolve(v);
    };
    list.addEventListener('click', onList); window.addEventListener('keydown', onKey);
    $('cs-start').addEventListener('click', onStart); $('cs-back').addEventListener('click', onBack);
    render(); root.hidden = false; raf = requestAnimationFrame(draw); $('cs-start').focus();
  });
}
