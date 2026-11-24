import { CONFIG } from '../core/config.js';
import { SLOTS, validateSave, summarize } from './saveData.js';

// ÚNICO ponto de leitura e gravação dos saves. O jogo só conhece esta interface (todas as funções são assíncronas):
//   list()            -> [{ slot, empty } | { slot, summary }]  (slots 1..3)
//   load(slot)        -> { ok, data } | { ok:false, error }
//   save(slot, data)  -> { ok } | { ok:false, error }
//   remove(slot)      -> { ok }
// Hoje: navegador (localStorage). Depois: Supabase (js/save/supabaseStore.js), sem mudar o jogo.
const KEY = (slot) => `perdido.save.${slot}`;

export class LocalSaveStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage; this.kind = 'local'; }
  async list() {
    const out = [];
    for (let s = 1; s <= SLOTS; s++) {
      const r = await this.load(s);
      out.push(r.ok ? { slot: s, summary: summarize(r.data) } : r.missing ? { slot: s, empty: true } : { slot: s, broken: true, error: r.error });
    }
    return out;
  }
  async load(slot) {
    let raw; try { raw = this.storage.getItem(KEY(slot)); } catch (e) { return { ok: false, error: 'Armazenamento do navegador indisponível.' }; }
    if (raw == null) return { ok: false, missing: true, error: 'Espaço vazio.' };
    let data; try { data = JSON.parse(raw); } catch { return { ok: false, error: 'Save corrompido (não é JSON válido).' }; }
    return validateSave(data);
  }
  async save(slot, data) {
    try { this.storage.setItem(KEY(slot), JSON.stringify(data)); return { ok: true }; }
    catch (e) { return { ok: false, error: 'Não foi possível salvar no navegador: ' + (e && e.message || e) }; }
  }
  async remove(slot) { try { this.storage.removeItem(KEY(slot)); } catch { /* ignora */ } return { ok: true }; }
}

let current = null;
// escolhe o armazenamento conforme CONFIG.SAVE.BACKEND ('local' | 'supabase'); com 'supabase' sem configuração, cai no local
export async function getSaveStore() {
  if (current) return current;
  if (CONFIG.SAVE.BACKEND === 'supabase' && CONFIG.SAVE.SUPABASE_URL && CONFIG.SAVE.SUPABASE_ANON_KEY) {
    try { const { createSupabaseStore } = await import('./supabaseStore.js'); current = await createSupabaseStore(CONFIG.SAVE); return current; }
    catch (e) { console.warn('Supabase indisponível; usando o navegador.', e); }
  }
  current = new LocalSaveStore(); return current;
}
export function setSaveStore(s) { current = s; }       // (testes)
