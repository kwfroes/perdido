import { SLOTS, validateSave, summarize } from './saveData.js';

// Saves no Supabase. Mesma interface do LocalSaveStore (list, load, save, remove).
// Tabela e regras de acesso: docs/supabase/saves.sql. Cada usuário só enxerga os próprios saves (RLS).
// Ativar: em js/core/config.js, SAVE.BACKEND = 'supabase', SUPABASE_URL e SUPABASE_ANON_KEY (a chave anônima pode ficar no front;
// a segurança é a RLS). O jogador precisa estar logado (veja signIn/signOut abaixo).
//
// Conflito entre aparelhos: cada save tem "updated_at". Ao gravar, se o save no banco for MAIS NOVO que o que este aparelho
// carregou, a gravação é recusada com { ok:false, conflict:true } e o jogo pergunta o que fazer (ainda não há essa tela).
export class SupabaseSaveStore {
  constructor(client) { this.db = client; this.kind = 'supabase'; this.loadedAt = new Map(); }
  async user() { const { data } = await this.db.auth.getUser(); return data && data.user ? data.user : null; }
  async list() {
    const u = await this.user(); if (!u) return Array.from({ length: SLOTS }, (_, i) => ({ slot: i + 1, empty: true, needLogin: true }));
    const { data, error } = await this.db.from('saves').select('slot, data, updated_at').eq('user_id', u.id);
    if (error) throw new Error(error.message);
    const out = [];
    for (let s = 1; s <= SLOTS; s++) {
      const row = (data || []).find(r => r.slot === s);
      if (!row) { out.push({ slot: s, empty: true }); continue; }
      const v = validateSave(row.data); out.push(v.ok ? { slot: s, summary: summarize(v.data) } : { slot: s, broken: true, error: v.error });
    }
    return out;
  }
  async load(slot) {
    const u = await this.user(); if (!u) return { ok: false, error: 'Entre na sua conta para carregar.' };
    const { data, error } = await this.db.from('saves').select('data, updated_at').eq('user_id', u.id).eq('slot', slot).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, missing: true, error: 'Espaço vazio.' };
    this.loadedAt.set(slot, data.updated_at);
    return validateSave(data.data);
  }
  async save(slot, saveData) {
    const u = await this.user(); if (!u) return { ok: false, error: 'Entre na sua conta para salvar.' };
    const known = this.loadedAt.get(slot);
    if (known) {
      const { data: cur } = await this.db.from('saves').select('updated_at').eq('user_id', u.id).eq('slot', slot).maybeSingle();
      if (cur && cur.updated_at > known) return { ok: false, conflict: true, error: 'Este espaço foi salvo em outro aparelho.' };
    }
    const now = new Date().toISOString();
    const { error } = await this.db.from('saves').upsert({ user_id: u.id, slot, data: saveData, updated_at: now }, { onConflict: 'user_id,slot' });
    if (error) return { ok: false, error: error.message };
    this.loadedAt.set(slot, now); return { ok: true };
  }
  async remove(slot) {
    const u = await this.user(); if (!u) return { ok: false, error: 'Entre na sua conta.' };
    const { error } = await this.db.from('saves').delete().eq('user_id', u.id).eq('slot', slot);
    this.loadedAt.delete(slot); return error ? { ok: false, error: error.message } : { ok: true };
  }
  // login por link mágico no e-mail (sem senha)
  async signIn(email) { const { error } = await this.db.auth.signInWithOtp({ email, options: { emailRedirectTo: globalThis.location ? location.origin + location.pathname : undefined } }); return error ? { ok: false, error: error.message } : { ok: true }; }
  async signOut() { await this.db.auth.signOut(); return { ok: true }; }
}

// cria o cliente (supabase-js carregado sob demanda, só quando o backend é 'supabase')
export async function createSupabaseStore(cfg) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  return new SupabaseSaveStore(createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY));
}
