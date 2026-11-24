// Semente e código do mundo.
//
// Código completo:  V2-E-K7QM-3XZP   (versão do gerador - tamanho - semente)
//   V2  = versão do gerador (mundos antigos continuam reproduzíveis quando o gerador mudar)
//   E   = tamanho, que depende da versão:   v1: P=100  M=150  G=200      v2: G=200  E=400
//   semente = qualquer texto; letras são normalizadas para maiúsculas
// Texto que NÃO esteja no formato acima vira a semente, na versão atual e no tamanho escolhido no menu.

export const GENERATOR_VERSION = 2;                 // versão usada em mundos novos
export const SUPPORTED_VERSIONS = [1, 2];
export const SIZES_BY_VERSION = { 1: { P: 100, M: 150, G: 200 }, 2: { G: 200, E: 400 } };
export const SIZES = SIZES_BY_VERSION[1];           // tamanhos do gerador v1 (congelado)
export const SIZE_LABELS = { G: 'Grande (200×200)', E: 'Enorme (400×400)' };
export const DEFAULT_SIZE = 'G';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sem I, L, O, 0, 1 (evita confusão ao copiar)

export function randomSeedText() {
  const bytes = new Uint8Array(8);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  let s = '';
  for (let i = 0; i < 8; i++) { s += ALPHABET[bytes[i] % ALPHABET.length]; if (i === 3) s += '-'; }
  return s;
}

export function normalizeSeedText(t) { return String(t ?? '').trim().replace(/\s+/g, ' ').toUpperCase(); }

export function formatCode({ version, size, seed }) { return `V${version}-${size}-${seed}`; }
export const FULL_CODE_RE = /^V\d+-[A-Z]-./;

// Interpreta o que o jogador digitou. Retorna { ok, code } ou { ok:false, error }.
export function parseCode(input, fallbackSize = DEFAULT_SIZE) {
  const text = normalizeSeedText(input);
  if (!text) return { ok: false, error: 'Digite uma semente ou use o botão de semente aleatória.' };
  const m = /^V(\d+)-([A-Z])-(.+)$/.exec(text);
  const version = m ? Number(m[1]) : GENERATOR_VERSION;
  if (!SUPPORTED_VERSIONS.includes(version))
    return { ok: false, error: `Este código usa o gerador v${version}, que esta versão do jogo não tem (disponíveis: ${SUPPORTED_VERSIONS.map(v => 'v' + v).join(', ')}).` };
  const sizes = SIZES_BY_VERSION[version];
  const size = m ? m[2] : (sizes[fallbackSize] ? fallbackSize : DEFAULT_SIZE);
  if (!sizes[size]) return { ok: false, error: `O tamanho "${size}" não existe no gerador v${version} (use ${Object.keys(sizes).join(' ou ')}).` };
  const seed = m ? m[3] : text;
  if (seed.length > 64) return { ok: false, error: 'Semente longa demais (máximo 64 caracteres).' };
  return { ok: true, code: { version, size, seed } };
}

// Hash de texto -> inteiro de 32 bits (xmur3). Só usa operações inteiras: idêntico em todos os navegadores.
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
// Uma semente numérica independente para cada "fluxo" do gerador (relevo, lagos, árvores...).
// Assim mudar uma regra de vegetação não embaralha o relevo.
export function streamSeed(key, label) { return xmur3(`${key}|${label}`); }
