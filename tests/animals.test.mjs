// Testes dos animais (Node puro, sem dependências):   node tests/animals.test.mjs [--quick]
//   1. sprites: tira = célula x quadros, nenhum quadro vazio, base alinhada, sem halo branco; dados x quadros existentes
//   2. onde nascem: determinismo, cada animal no seu habitat, fora de troncos/pedras, quantidades, poleiros, mundo v1
//   3. comportamento (simulação de milhares de quadros, com a colisão real): ninguém entra na água (exceto girinos, que não saem dela),
//      ninguém atravessa tronco, ninguém sai do habitat; fugir, esconder, voar e pousar, descansar fora do horário; desempenho
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readPng } from './lib/png.mjs';
import { ANIMALS, FAUNA_PROPS } from '../js/data/animals.js';
import { ANIMAL_SPRITES, PROP_SPRITES } from '../js/data/animalSprites.js';
import { OBJECT_DEFS } from '../js/data/objects.js';
import { generateWorld } from '../js/world/index.js';
import { placeFauna, habitatOk, faunaFields, PERCH_POINTS } from '../js/world/fauna.js';
import { Fauna } from '../js/systems/fauna.js';
import { CollisionWorld } from '../js/engine/collision.js';
import { buildWaterRects } from '../js/world/worldCollision.js';
import { TERRAIN as TR, WATER_KIND as WK, TILE as T } from '../js/world/constants.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const QUICK = process.argv.includes('--quick');
const R = []; let fails = 0;
const check = (n, c, e = '') => { R.push(c); if (!c) { fails++; console.log(`  FALHA | ${n} | ${e}`); } else if (process.env.VERBOSE) console.log('  ok | ' + n); };

// ---------------- 1. sprites ----------------
console.log('1. sprites');
for (const [name, m] of Object.entries(ANIMAL_SPRITES)) {
  const p = readPng(path.join(ROOT, 'assets/animals', `${name}.png`)), [cw, ch] = m.cell, n = m.frames.length;
  check(`${name}: tira ${p.width}x${p.height} = célula ${cw}x${ch} x ${n} quadros`, p.width === cw * n && p.height === ch);
  let empty = [], noBase = [], halo = 0;
  for (let i = 0; i < n; i++) {
    let px = 0, bottom = false;
    for (let y = 0; y < ch; y++) for (let x = i * cw; x < (i + 1) * cw; x++) { const a = p.at(x, y); if (a[3]) { px++; if (y === ch - 1) bottom = true; if (a[0] > 215 && a[1] > 215 && a[2] > 215 && !/garca|coruja|girino|jabuti_f/.test(name)) halo++; } }
    if (!px) empty.push(m.frames[i]); if (!bottom) noBase.push(m.frames[i]);
  }
  check(`${name}: nenhum quadro vazio`, empty.length === 0, empty.join(','));
  check(`${name}: todos os quadros pisam a última linha da célula (base alinhada, o animal não "pula" ao trocar de quadro)`, noBase.length === 0, noBase.join(','));
  check(`${name}: sem pixels brancos de halo do fundo`, halo === 0, String(halo));
}
for (const [name, def] of Object.entries(ANIMALS)) {
  const sheets = [def.sheet, ...(def.young ? [def.young.sheet] : [])];
  for (const sh of sheets) {
    const frames = new Set(ANIMAL_SPRITES[sh].frames), missing = [];
    for (const [an, a] of Object.entries(def.anims)) for (const f of a.frames) if (!frames.has(f) && !(sh !== def.sheet && an !== 'walk' && an !== 'idle')) missing.push(`${an}:${f}`);
    check(`${name} (${sh}): toda animação usa quadros que existem na folha`, sh === def.sheet ? missing.length === 0 : ['walk0', 'idle'].every(f => frames.has(f)), missing.join(' '));
  }
  check(`${name}: tem animação de descanso (rest) e as poses de parado existem`, !!def.anims.rest && def.idles.every(k => def.anims[k]));
}
for (const [k, p] of Object.entries(FAUNA_PROPS)) check(`sinal ${k}: quadro ${p.frame} existe na folha ${p.sheet}`, ANIMAL_SPRITES[p.sheet].frames.includes(p.frame));
for (const [k, [w, h]] of Object.entries(PROP_SPRITES)) {
  const f = k.startsWith('item_') ? `assets/items/${k}.png` : `assets/environment/${k}.png`, p = readPng(path.join(ROOT, f));
  check(`objeto ${k}: arquivo ${p.width}x${p.height} = dados ${w}x${h}${OBJECT_DEFS[k] ? ' = OBJECT_DEFS' : ''}`, p.width === w && p.height === h && (!OBJECT_DEFS[k] || (OBJECT_DEFS[k].sprite[0] === w && OBJECT_DEFS[k].sprite[1] === h)));
}
{ // proporção entre os animais e o personagem (64 px): nenhum animal maior que a pessoa, nenhum ilegível
  const h = (n) => ANIMAL_SPRITES[n].cell[1];
  check(`escala: garça (${h('garca')} px) e gato (${h('gato')}) menores que o personagem (64 px); jabuti adulto (${h('jabuti')}) maior que o filhote (${h('jabuti_f')})`, h('garca') < 64 && h('gato') < 64 && h('jabuti') > h('jabuti_f'));
}

// ---------------- 2. onde nascem ----------------
console.log('2. onde nascem');
const plan = QUICK ? [['G', 'FA1'], ['E', 'FE1']] : [['G', 'FA1'], ['G', 'FA2'], ['G', 'FA3'], ['G', 'FA4'], ['E', 'FE1'], ['E', 'FE2']];
const worlds = [];
for (const [size, seed] of plan) worlds.push(await generateWorld({ version: 2, size, seed }));
const digest = (f) => createHash('sha1').update(JSON.stringify([f.animals, f.props])).digest('hex').slice(0, 12);
check('mesmo mundo => mesmos animais nos mesmos lugares', digest(placeFauna(worlds[0])) === digest(placeFauna(worlds[0])));
check('mundos diferentes => animais diferentes', digest(placeFauna(worlds[0])) !== digest(placeFauna(worlds[1])));
const totals = {};
for (const w of worlds) {
  const F = faunaFields(w), f = placeFauna(w), cnt = {};
  let bad = 0, why = '';
  const fail = (a, s) => { bad++; if (!why) why = `${a.species}@${Math.round(a.x)},${Math.round(a.y)}: ${s}`; };
  const cw = new CollisionWorld(w.W * T, w.H * T); w.objects.forEach(o => { const c = OBJECT_DEFS[o.type].collider; if (c) cw.add({ x: o.x - c.w / 2, y: o.y - c.h, w: c.w, h: c.h }); });
  for (const a of f.animals) {
    cnt[a.species] = (cnt[a.species] || 0) + 1; totals[a.species] = (totals[a.species] || 0) + 1;
    const def = ANIMALS[a.species];
    if (def.habitat.on === 'perch') {
      const o = w.objects.find(o2 => def.habitat.perch.includes(o2.type) && Math.abs(o2.y + 1 - a.y) < 1 && Math.abs(o2.x - a.x) < OBJECT_DEFS[o2.type].sprite[0]);
      if (!o) fail(a, 'poleiro inexistente'); else if (a.lift <= 0 || a.lift > OBJECT_DEFS[o.type].sprite[1]) fail(a, `altura no poleiro ${a.lift}`);
      continue;
    }
    if (!habitatOk(w, F, def, Math.floor(a.x / T), Math.floor((a.y - 1) / T))) fail(a, 'fora do habitat');
    if (def.habitat.on !== 'water') { const [fw, fh] = def.foot; for (const r of cw.query(a.x - fw / 2, a.y - fh, a.x + fw / 2, a.y)) if (a.x - fw / 2 < r.x + r.w && a.x + fw / 2 > r.x && a.y - fh < r.y + r.h && a.y > r.y) fail(a, 'dentro de um colisor'); }
    if (Math.hypot(a.x - w.start.x, a.y - w.start.y) < 100) fail(a, 'colado no início');
  }
  for (const p of f.props) { const t = w.at(Math.floor(p.x / T), Math.floor((p.y - 1) / T)); if (p.water ? t !== TR.WATER : t === TR.WATER) { bad++; if (!why) why = `sinal ${p.kind} no lugar errado`; } }
  check(`${w.code}: ${f.animals.length} animais e ${f.props.length} sinais, cada um no seu habitat, fora de colisores e longe do início`, bad === 0, `${bad}; ${why}`);
  check(`${w.code}: todas as 9 espécies aparecem (${Object.entries(cnt).map(([k, v]) => `${k} ${v}`).join(', ')})`, Object.keys(ANIMALS).every(k => cnt[k] > 0), Object.keys(ANIMALS).filter(k => !cnt[k]).join(','));
  check(`${w.code}: gato-do-mato é raro (${cnt.gato} no mapa; mínimo ${ANIMALS.gato.min[w.W]})`, cnt.gato >= ANIMALS.gato.min[w.W] && cnt.gato <= (w.W >= 400 ? 6 : 3));
}
check(`ninhos de jabuti, ovos de sapo e bolotas de coruja aparecem nos mundos testados`, worlds.some(w => placeFauna(w).props.some(p => p.kind === 'jabuti_nest')) && worlds.some(w => placeFauna(w).props.some(p => p.kind === 'cururu_eggs')) && worlds.some(w => placeFauna(w).props.some(p => p.kind === 'owl_pellet')));
{ const v1 = await generateWorld({ version: 1, size: 'G', seed: 'FAUNA-V1' }), f = placeFauna(v1);
  check('mundo v1 (sem tipos de água): só espécies que não dependem de água doce/margem, sem erro', f.animals.length > 0 && f.animals.every(a => !['cururu', 'girino', 'garca'].includes(a.species))); }

// ---------------- 3. comportamento ----------------
console.log('3. comportamento (simulação)');
function makeFauna(w) {
  const cw = new CollisionWorld(w.W * T, w.H * T);
  buildWaterRects(w).forEach(r => cw.add(r, 'water'));
  w.objects.forEach(o => { const c = OBJECT_DEFS[o.type].collider; if (c) cw.add({ x: o.x - c.w / 2, y: o.y - c.h, w: c.w, h: c.h }, o); });
  const fa = new Fauna(w, cw, { radius: 1e9 });                       // todos ativos para o teste
  return { fa, cw };
}
const inCollider = (cw, a) => { const [fw, fh] = a.def.foot; for (const r of cw.query(a.x - fw / 2, a.y - fh, a.x + fw / 2, a.y)) if (r.owner !== 'water' && a.x - fw / 2 < r.x + r.w - 0.01 && a.x + fw / 2 > r.x + 0.01 && a.y - fh < r.y + r.h - 0.01 && a.y > r.y + 0.01) return true; return false; };
for (const w of worlds.slice(0, QUICK ? 1 : 3)) {
  const { fa, cw } = makeFauna(w), F = fa.fields;
  const player = { x: -9999, y: -9999 }; let wet = 0, solid = 0, outHab = 0, why = '', moved = 0, maxMs = 0, sumMs = 0;
  const start = new Map(fa.animals.map(a => [a.id, [a.x, a.y]]));
  for (const night of [false, true]) {
    fa.night = night;
    for (let f = 0; f < 1800; f++) {
      const t0 = performance.now(); fa.update(1 / 60, player, 0, 0, w.W * T, w.H * T); const ms = performance.now() - t0; maxMs = Math.max(maxMs, ms); sumMs += ms;
      if (f % 6) continue;
      for (const a of fa.animals) {
        if (a.alt > 0.5 || a.state === 'fly' || a.state === 'circle' || a.def.habitat.on === 'perch') continue;
        const tile = w.at(Math.floor(a.x / T), Math.floor((a.y - 1) / T));
        if (a.def.behavior === 'swimmer') { if (tile !== TR.WATER) { wet++; if (!why) why = `girino fora da água em ${Math.round(a.x)},${Math.round(a.y)}`; } continue; }
        if (tile === TR.WATER) { wet++; if (!why) why = `${a.species} na água em ${Math.round(a.x)},${Math.round(a.y)} (${a.state})`; }
        if (inCollider(cw, a)) { solid++; if (!why) why = `${a.species} dentro de um colisor (${a.state})`; }
        if (!habitatOk(w, F, a.def, Math.floor(a.x / T), Math.floor((a.y - 1) / T))) { outHab++; if (!why) why = `${a.species} fora do habitat (${a.state})`; }
      }
    }
  }
  for (const a of fa.animals) { const [x0, y0] = start.get(a.id); if (Math.hypot(a.x - x0, a.y - y0) > 4) moved++; }
  { // controle negativo: um jabuti colocado à força na água e outro dentro de um tronco TÊM que ser acusados pelas mesmas verificações
    const j = fa.animals.find(a => a.species === 'jabuti'); let wt = null; for (let i = 0; i < w.W * w.H && !wt; i++) if (w.waterKind[i] === WK.SEA && i % w.W > 2) wt = i;
    const sx = j.x, sy = j.y; j.x = (wt % w.W) * T + 16; j.y = Math.floor(wt / w.W) * T + 20;
    const caughtWater = w.at(Math.floor(j.x / T), Math.floor((j.y - 1) / T)) === TR.WATER && !habitatOk(w, F, j.def, Math.floor(j.x / T), Math.floor((j.y - 1) / T));
    const o = w.objects.find(o2 => OBJECT_DEFS[o2.type].collider && OBJECT_DEFS[o2.type].collider.w > 20); j.x = o.x; j.y = o.y - 2; const caughtSolid = inCollider(cw, j);
    j.x = sx; j.y = sy;
    check('controle negativo: animal na água e animal dentro de tronco são acusados', caughtWater && caughtSolid, `água ${caughtWater}, tronco ${caughtSolid}`);
  }
  check(`${w.code}: 3600 quadros (dia e noite), ${fa.animals.length} animais: ninguém na água (exceto girinos), nenhum girino fora dela, ninguém dentro de tronco/pedra, ninguém fora do habitat`, wet === 0 && solid === 0 && outHab === 0, `água ${wet}, colisor ${solid}, habitat ${outHab}; ${why}`);
  check(`${w.code}: os animais se movem (${moved} de ${fa.animals.length} saíram do lugar)`, moved > fa.animals.length * 0.4);
  check(`${w.code}: desempenho: atualizar TODOS os ${fa.animals.length} animais leva ${(sumMs / 3600).toFixed(3)} ms em média por quadro (máx ${maxMs.toFixed(1)}); no jogo só os perto da câmera`, sumMs / 3600 < 2.5);
}
{ // reações ao jogador
  const w = worlds[worlds.length - 1], { fa } = makeFauna(w);
  const one = (sp, pred = () => true) => fa.animals.find(a => a.species === sp && pred(a));
  const run = (frames, player) => { for (let i = 0; i < frames; i++) fa.update(1 / 60, player, 0, 0, w.W * T, w.H * T); };
  fa.night = false;
  const tei = one('teiu'); const p1 = { x: tei.x + 30, y: tei.y }; run(60, p1); const d1 = Math.hypot(tei.x - p1.x, tei.y - p1.y);
  check(`teiú foge correndo quando o jogador chega a 30 px (distância depois de 1 s: ${d1.toFixed(0)} px)`, d1 > 60);
  const jab = one('jabuti'); run(2, { x: jab.x + 20, y: jab.y });
  check('jabuti se recolhe no casco quando o jogador chega perto (não foge)', jab.state === 'hide' && jab.anim === 'hide');
  run(240, { x: -9999, y: -9999 }); check('...e volta a se mexer quando o jogador se afasta', jab.state !== 'hide');
  const gar = one('garca'); run(2, { x: gar.x + 40, y: gar.y }); const flew = gar.state === 'fly';
  run(400, { x: -9999, y: -9999 }); const tile = w.at(Math.floor(gar.x / T), Math.floor((gar.y - 1) / T));
  check(`garça voa quando assustada e pousa de novo na areia da margem (${flew ? 'voou' : 'não voou'}, pousou em ${tile === TR.SAND ? 'areia' : 'terreno ' + tile})`, flew && gar.state !== 'fly' && tile === TR.SAND && gar.alt === 0);
  const san = one('sanhaco'); run(2, { x: san.x + 20, y: san.y }); const sflew = san.state === 'fly'; let maxAlt = 0;
  for (let i = 0; i < 300; i++) { run(1, { x: -9999, y: -9999 }); maxAlt = Math.max(maxAlt, san.alt); }
  check(`sanhaço sai voando (altura máxima ${maxAlt.toFixed(0)} px) e pousa em terra`, sflew && maxAlt > 10 && san.alt === 0 && w.at(Math.floor(san.x / T), Math.floor((san.y - 1) / T)) !== TR.WATER);
  const gir = one('girino'); run(2, { x: gir.x + 10, y: gir.y }); check('girino assustado afunda (fica quase transparente)', gir.alpha < 0.5);
  // fora do horário: descanso
  fa.night = false; run(30, { x: -9999, y: -9999 });
  const cor = one('coruja'), mor = one('morcego'), gat = one('gato');
  check('de dia: coruja dorme, morcego pendurado, gato enrolado (pose de descanso)', cor.anim === 'rest' && mor.anim === 'rest' && gat.anim === 'rest' && cor.resting && gat.resting);
  const mx = mor.x, my = mor.y; fa.night = true; run(120, { x: -9999, y: -9999 });
  check(`à noite: morcego sai voando em círculos (deslocou ${Math.hypot(mor.x - mx, mor.y - my).toFixed(0)} px, altura ${mor.alt.toFixed(0)})`, mor.state === 'circle' && mor.alt > 10);
  const cur = one('cururu'); let called = false; for (let i = 0; i < 1200 && !called; i++) { run(1, { x: -9999, y: -9999 }); if (cur.anim === 'call') called = true; }
  check('à noite: o sapo-cururu canta (papo inflado)', called);
  fa.night = false; run(60, { x: -9999, y: -9999 }); check('de volta ao dia: o morcego volta ao galho', mor.state === 'rest' && mor.alt === 0);
  // interação
  const t = fa.nearest(tei.x + 5, tei.y, 28); check('o animal mais perto vira alvo de interação, com nome e texto', !!t && !!t.target.label && !!t.target.text);
}

console.log(`\n${R.filter(Boolean).length} de ${R.length} verificações passaram${fails ? ` | ${fails} FALHAS` : ''}.`);
process.exit(fails ? 1 : 0);
