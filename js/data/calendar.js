// Calendário do jogo (Fase 3): relógio, dia/noite, 4 estações e o ciclo das frutíferas.
// PURO (sem DOM, sem Math.random): tudo deriva do dia e da hora, e de um "hash" fixo de cada árvore (posição no mundo).
// Mesmo dia => mesmas frutas, para qualquer jogador com o mesmo mundo.
//
// Ano = 4 estações x 28 dias = 112 dias. Semântica do litoral nordestino:
//   0 Chuvas      chuvas fortes; a siriguela frutifica; pitanga dá a 1a safra; sapos cantam; há girinos nas lagoas
//   1 Estiagem    as chuvas acabam; a siriguela ainda tem folhas, sem fruto; ainda há girinos
//   2 Seca        a siriguela perde as folhas (dormente); sem girinos; sapos quietos
//   3 Trovoadas   as primeiras chuvas de trovoada: a siriguela floresce nos galhos nus; pitanga dá a 2a safra; sapos voltam a cantar
export const SEASONS = [
  { key: 'chuvas',    label: 'Chuvas',    start: 'Começam as Chuvas' },
  { key: 'estiagem',  label: 'Estiagem',  start: 'Começa a Estiagem' },
  { key: 'seca',      label: 'Seca',      start: 'Começa a Seca' },
  { key: 'trovoadas', label: 'Trovoadas', start: 'Começam as Trovoadas' },
];
export const DAYS_PER_SEASON = 28;
export const DAYS_PER_YEAR = SEASONS.length * DAYS_PER_SEASON;

// ---- relógio: tempo do jogo em minutos desde o início (dia 1, 00:00) ----
export function clockInfo(totalMinutes) {
  const m = Math.max(0, totalMinutes), dayIndex = Math.floor(m / 1440), minuteOfDay = m - dayIndex * 1440;
  const dayOfYear = dayIndex % DAYS_PER_YEAR, season = Math.floor(dayOfYear / DAYS_PER_SEASON);
  return {
    day: dayIndex + 1,                                  // dia corrido (1, 2, 3...)
    year: Math.floor(dayIndex / DAYS_PER_YEAR) + 1,
    dayOfYear,                                          // 0..111
    season, seasonLabel: SEASONS[season].label,
    dayOfSeason: dayOfYear % DAYS_PER_SEASON,           // 0..27
    hour: minuteOfDay / 60,                             // 0..24 (fracionário)
    minuteOfDay,
  };
}
export const formatTime = (hour) => { const h = Math.floor(hour), mi = Math.floor((hour - h) * 60); return `${String(h).padStart(2, '0')}:${String(mi - mi % 10).padStart(2, '0')}`; };

// ---- dia, noite e crepúsculo ----
export const DAWN = [5, 7], DUSK = [17, 19.5];          // horas
export function phaseOf(hour) {
  if (hour >= DAWN[0] && hour < DAWN[1]) return 'dawn';
  if (hour >= DAWN[1] && hour < DUSK[0]) return 'day';
  if (hour >= DUSK[0] && hour < DUSK[1]) return 'dusk';
  return 'night';
}
export const isNightHour = (hour) => hour >= 18.5 || hour < 5.5;     // para os animais: noite começa no fim do crepúsculo

// Luz do mundo: uma cor sobreposta ao cenário (r, g, b, a), interpolada entre horários-chave. a = 0 em pleno dia.
const LIGHT_KEYS = [
  [0,    [10, 18, 52, 0.58]],
  [4.5,  [10, 18, 52, 0.58]],
  [5.5,  [70, 50, 90, 0.38]],
  [6.3,  [255, 150, 90, 0.16]],
  [7.2,  [255, 200, 150, 0]],
  [16.5, [255, 200, 150, 0]],
  [17.6, [255, 140, 70, 0.18]],
  [18.6, [110, 60, 100, 0.34]],
  [19.6, [10, 18, 52, 0.58]],
  [24,   [10, 18, 52, 0.58]],
];
export function lightAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 1; i < LIGHT_KEYS.length; i++) {
    const [h1, c1] = LIGHT_KEYS[i]; if (h > h1) continue;
    const [h0, c0] = LIGHT_KEYS[i - 1], u = (h - h0) / (h1 - h0 || 1);
    return c0.map((v, k) => k < 3 ? Math.round(v + (c1[k] - v) * u) : +(v + (c1[k] - v) * u).toFixed(3));
  }
  return LIGHT_KEYS[0][1];
}

// ---- ciclo das frutíferas ----
// hash fixo de cada árvore: a posição no mundo. Dá a cada árvore a sua "fase" (árvores vizinhas não amadurecem juntas).
export function treeHash(x, y) { let h = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; }

// Janela de fruta [início, fim) em dias, dentro de um ciclo; devolve null | 'green' | 'ripe' | 'rotten'
function windowState(t, green, ripe, rotten, end) { return t < green ? null : t < ripe ? 'green' : t < rotten ? 'ripe' : t < end ? 'rotten' : null; }

// Regras por espécie (dias do jogo). Coqueiro e bananeira produzem o ano todo, cada árvore no seu ritmo; siriguela e pitanga seguem as estações.
export const FRUIT_CYCLES = {
  coco:    { kind: 'cycle', period: 24, green: 4, ripe: 14, rotten: 21, end: 24 },                // o coqueiro emite cachos o ano inteiro
  banana:  { kind: 'cycle', period: 40, green: 10, ripe: 26, rotten: 34, end: 40 },               // um cacho por "touceira", depois rebrota
  siri:    { kind: 'season', seasons: [0], green: 0, ripe: 7, rotten: 17, end: 21, jitter: 7 },  // frutifica nas Chuvas (cada árvore atrasa 0..7 dias)
  pitanga: { kind: 'season', seasons: [0, 3], green: 0, ripe: 3, rotten: 9, end: 12, jitter: 10 },   // 2 safras: Chuvas e Trovoadas (A1: madura já do 3º dia)
};

// estado da fruta de uma árvore (espécie sp) no dia corrido `day` (1, 2, ...)
export function fruitStateOn(sp, day, hash) {
  const c = FRUIT_CYCLES[sp]; if (!c) return null;
  const d = Math.max(0, day - 1);
  if (c.kind === 'cycle') return windowState((d + hash % c.period) % c.period, c.green, c.ripe, c.rotten, c.end);
  const doy = d % DAYS_PER_YEAR, season = Math.floor(doy / DAYS_PER_SEASON); if (!c.seasons.includes(season)) return null;
  const t = doy % DAYS_PER_SEASON - (hash % (c.jitter + 1));                                     // cada árvore atrasa 0..jitter dias
  return t < 0 ? null : windowState(t, c.green, c.ripe, c.rotten, c.end);
}

// Identifica a safra em que a árvore está no dia `day` (muda quando começa outra safra). Colher marca esta chave.
export function fruitWindow(sp, day, hash) {
  const c = FRUIT_CYCLES[sp]; if (!c) return null; const d = Math.max(0, day - 1);
  if (c.kind === 'cycle') return 'c' + Math.floor((d + hash % c.period) / c.period);
  return 'y' + Math.floor(d / DAYS_PER_YEAR) + 's' + Math.floor((d % DAYS_PER_YEAR) / DAYS_PER_SEASON);
}

// A siriguela adulta muda de "roupa" com as estações: com folhas (Chuvas, Estiagem), sem folhas (Seca), florida nos galhos nus (Trovoadas)
export function siriguelaView(season, dayOfSeason, hash) {
  if (season === 0 || season === 1) return { leaves: true, flowers: 0 };
  if (season === 2) return { leaves: false, flowers: 0 };
  const open = dayOfSeason - (hash % 6);                                                         // as flores abrem aos poucos
  return { leaves: false, flowers: open < 0 ? 0 : Math.min(6, 2 + Math.floor(open / 4)) };
}

// Estações em que os animais de lagoa aparecem / cantam (por índice de SEASONS)
export const TADPOLE_SEASONS = [0, 1];
export const FROG_CALL_SEASONS = [0, 3];
