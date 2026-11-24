// Formato do jogo salvo (JSON simples; o MESMO formato vai para o navegador e para o Supabase).
export const SAVE_VERSION = 1;
export const SLOTS = 3;

// confere um save lido do armazenamento; devolve { ok, data } ou { ok:false, error }
export function validateSave(data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Save vazio ou ilegível.' };
  if (typeof data.version !== 'number') return { ok: false, error: 'Save sem versão.' };
  if (data.version > SAVE_VERSION) return { ok: false, error: `Este save é de uma versão mais nova do jogo (v${data.version}).` };
  const d = migrate(data);
  const need = ['code', 'fingerprint', 'clock', 'player', 'delta'];
  for (const k of need) if (d[k] === undefined || d[k] === null) return { ok: false, error: `Save incompleto (falta "${k}").` };
  if (typeof d.code !== 'string' || !/^V\d+-[A-Z]-./.test(d.code)) return { ok: false, error: 'Código do mundo inválido no save.' };
  if (!Number.isFinite(d.clock.minutes) || !Number.isFinite(d.player.x) || !Number.isFinite(d.player.y)) return { ok: false, error: 'Save com números inválidos.' };
  return { ok: true, data: d };
}
// conversão de saves antigos (hoje só existe a v1)
export function migrate(d) { return { ...d }; }

// resumo para o menu
export function summarize(d) {
  return { code: d.code, day: d.clock.day || 1, season: d.clock.seasonLabel || '', savedAt: d.savedAt || 0, character: d.player.character, playTime: d.playTime || 0 };
}
