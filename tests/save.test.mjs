// Saves (Node puro):   node tests/save.test.mjs
//   formato e validação, armazenamento local (3 espaços), delta sobre a semente, marca do mundo, e o armazenamento Supabase com um cliente falso
import { SAVE_VERSION, SLOTS, validateSave, summarize } from '../js/save/saveData.js';
import { LocalSaveStore } from '../js/save/saveStore.js';
import { SupabaseSaveStore } from '../js/save/supabaseStore.js';
import { WorldDelta, objectId, worldFingerprint } from '../js/save/worldState.js';
import { generateWorld } from '../js/world/index.js';
import { fruitWindow } from '../js/data/calendar.js';
const R = []; let fails = 0; const check = (n, c, e = '') => { R.push(c); if (!c) { fails++; console.log(`  FALHA | ${n} | ${e}`); } };
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m }; };
const sample = (o = {}) => ({ version: SAVE_VERSION, code: 'V2-G-TESTE', fingerprint: 'abcd1234', savedAt: 1, playTime: 125, clock: { minutes: 1440 * 3 + 600, day: 4, seasonLabel: 'Chuvas' },
  player: { x: 100, y: 200, facing: 'down', character: 'female' }, boat: { state: 'beached', x: 0, y: 0, dir: 2, hasPaddle: false }, items: { pitanga: 3 }, delta: { removed: [], changed: {}, added: [], harvest: {} }, ...o });

console.log('1. formato');
check('3 espaços', SLOTS === 3);
check('save válido passa', validateSave(sample()).ok);
check('versão mais nova é recusada com mensagem', !validateSave(sample({ version: 99 })).ok && /mais nova/.test(validateSave(sample({ version: 99 })).error));
check('sem campos obrigatórios é recusado', !validateSave({ version: 1 }).ok && !validateSave(null).ok && !validateSave('x').ok);
check('código inválido é recusado', !validateSave(sample({ code: 'abc' })).ok);
check('números inválidos são recusados', !validateSave(sample({ player: { x: NaN, y: 1 } })).ok);
const sm = summarize(sample()); check('resumo para o menu: código, dia, estação, tempo de jogo', sm.code === 'V2-G-TESTE' && sm.day === 4 && sm.season === 'Chuvas' && sm.playTime === 125);

console.log('2. armazenamento local');
const st = new LocalSaveStore(mem());
let L = await st.list(); check('começa com 3 espaços vazios', L.length === 3 && L.every(s => s.empty));
check('gravar no espaço 2', (await st.save(2, sample())).ok);
L = await st.list(); check('a lista mostra o espaço 2 ocupado com o resumo', L[1].summary && L[1].summary.day === 4 && L[0].empty && L[2].empty);
const ld = await st.load(2); check('ler devolve o mesmo save', ld.ok && JSON.stringify(ld.data) === JSON.stringify(sample()));
st.storage.setItem('perdido.save.3', '{quebrado'); L = await st.list(); check('save corrompido aparece como "com problema" (não trava a lista)', L[2].broken && /JSON/.test(L[2].error));
check('ler save corrompido devolve erro claro', !(await st.load(3)).ok);
await st.remove(2); check('apagar esvazia o espaço', (await st.list())[1].empty);
const full = new LocalSaveStore({ getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); }, removeItem() {} });
const r = await full.save(1, sample()); check('sem espaço no navegador: erro claro, sem exceção', !r.ok && /QuotaExceeded/.test(r.error));

console.log('3. delta e marca do mundo');
const w = await generateWorld({ version: 2, size: 'G', seed: 'SAVE-T' }), w2 = await generateWorld({ version: 2, size: 'G', seed: 'SAVE-T' }), w3 = await generateWorld({ version: 2, size: 'G', seed: 'SAVE-U' });
check('marca do mundo: igual para o mesmo mundo, diferente para outro', worldFingerprint(w) === worldFingerprint(w2) && worldFingerprint(w) !== worldFingerprint(w3));
const ids = w.objects.map(objectId); check(`ids estáveis e únicos (${ids.length} objetos)`, new Set(ids).size === ids.length && ids.every((id, i) => id === objectId(w2.objects[i])));
const d = new WorldDelta(); d.remove(ids[0]); d.change(ids[1], 'ore_ferro_cracked'); d.add({ type: 'paddle', x: 10, y: 20, flip: false }); d.markHarvest(ids[2], 'y0s0');
const d2 = new WorldDelta(JSON.parse(JSON.stringify(d.toJSON())));
check('delta: ida e volta pelo JSON', JSON.stringify(d2.toJSON()) === JSON.stringify(d.toJSON()) && d2.removed.has(ids[0]) && d2.changed.get(ids[1]) === 'ore_ferro_cracked' && d2.harvested(ids[2], 'y0s0'));
d2.remove('tipo:9:9'); d2.markHarvest('outro:1:1', 'x'); const dropped = d2.sanitize(new Set(ids));
check('sanitize: descarta só as mudanças de objetos que não existem', dropped === 2 && d2.removed.has(ids[0]) && d2.changed.has(ids[1]));
check('janela de safra muda de uma safra para outra', fruitWindow('pitanga', 5, 7) === fruitWindow('pitanga', 20, 7) && fruitWindow('pitanga', 5, 7) !== fruitWindow('pitanga', 90, 7) && fruitWindow('coco', 1, 0) !== fruitWindow('coco', 30, 0));

console.log('4. Supabase (cliente falso)');
const fake = () => { const rows = []; let user = { id: 'u1' }; let clock = 0;
  const q = (filter = {}) => ({ _f: filter,
    select() { return this; }, eq(k, v) { return q({ ...this._f, [k]: v }); },
    async maybeSingle() { const r = rows.find(x => Object.entries(this._f).every(([k, v]) => x[k] === v)); return { data: r ? { ...r } : null, error: null }; },
    then(res) { res({ data: rows.filter(x => Object.entries(this._f).every(([k, v]) => x[k] === v)).map(x => ({ ...x })), error: null }); },
    async delete() { return this; } });
  return { rows, setUser: u => { user = u; },
    auth: { getUser: async () => ({ data: { user } }), signInWithOtp: async () => ({ error: null }), signOut: async () => ({}) },
    from: () => ({ select: () => q(), upsert: async (row) => { const i = rows.findIndex(x => x.user_id === row.user_id && x.slot === row.slot); row.updated_at = new Date(Date.UTC(2026, 0, 1, 0, 0, ++clock)).toISOString(); if (i >= 0) rows[i] = row; else rows.push(row); return { error: null }; },
      delete: () => ({ eq: (k, v) => ({ eq: async (k2, v2) => { for (let i = rows.length - 1; i >= 0; i--) if (rows[i][k] === v && rows[i][k2] === v2) rows.splice(i, 1); return { error: null }; } }) }) }) }; };
const fc = fake(), sb = new SupabaseSaveStore(fc);
check('Supabase: lista vazia', (await sb.list()).every(s => s.empty));
check('Supabase: grava e lê o mesmo save', (await sb.save(1, sample())).ok && JSON.stringify((await sb.load(1)).data) === JSON.stringify(sample()));
check('Supabase: lista mostra o espaço 1', (await sb.list())[0].summary.day === 4);
const sbB = new SupabaseSaveStore(fc); await sbB.load(1); await sbB.save(1, sample({ playTime: 999 }));   // "outro aparelho" grava depois
const conf = await sb.save(1, sample({ playTime: 1 }));
check('Supabase: conflito entre aparelhos é detectado (não sobrescreve um save mais novo)', !conf.ok && conf.conflict, JSON.stringify(conf));
fc.setUser(null); check('Supabase: sem login, pede para entrar', !(await sb.load(1)).ok && (await sb.list())[0].needLogin);

console.log(`\n${R.filter(Boolean).length} de ${R.length} verificações passaram${fails ? ` | ${fails} FALHAS` : ''}.`); process.exit(fails ? 1 : 0);
