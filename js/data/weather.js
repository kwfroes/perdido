// Clima (Fase 3b). PURO e determinístico: depende só do código do mundo, do dia e da hora (minutos do GameClock).
// Mesmo mundo, mesmo momento => mesmo tempo. Nada vai para o save.
//
// O dia é dividido em 8 períodos de 3 h. Cada período tem um estado: clear (aberto), cloudy (nublado), rain (chuva) ou storm (trovoada).
// O estado do período depende da estação (probabilidades abaixo) e do período anterior (o tempo tende a persistir).
// Nos primeiros 30 minutos de cada período os valores (nuvem, chuva, vento) passam suavemente do estado anterior para o novo.
import { streamSeed } from '../world/seed.js';
import { DAYS_PER_SEASON, DAYS_PER_YEAR } from './calendar.js';

export const STATES = ['clear', 'cloudy', 'rain', 'storm'];
export const STATE_LABEL = { clear: 'Tempo aberto', cloudy: 'Nublado', rain: 'Chuva', storm: 'Trovoada' };
export const PERIOD_MIN = 180, BLEND_MIN = 30;

// probabilidades [clear, cloudy, rain, storm] por estação (Chuvas, Estiagem, Seca, Trovoadas)
export const SEASON_P = [
  [0.24, 0.26, 0.43, 0.07],
  [0.56, 0.29, 0.13, 0.02],
  [0.80, 0.18, 0.02, 0.00],
  [0.30, 0.24, 0.14, 0.32],
];
export const PERSIST = 0.5;                       // chance de repetir o estado do período anterior
// valores alvo por estado: nuvem (escurece), chuva (densidade 0..1), força do vento (0..1)
const TARGET = { clear: [0, 0, 0.25], cloudy: [0.75, 0, 0.4], rain: [0.85, 0.6, 0.62], storm: [1, 1, 0.95] };

const rnd = (key, label) => streamSeed(key, label) / 4294967296;     // 0..1 (inteiro de 32 bits, idêntico em qualquer navegador)
const pick = (p, r) => { let a = 0; for (let k = 0; k < p.length; k++) { a += p[k]; if (r < a) return k; } return p.length - 1; };

// estados dos 8 períodos de um dia (dia corrido, 1..). Cada dia é uma cadeia que começa no último período do dia anterior.
const cache = new Map();
export function dayStates(key, day) {
  const ck = key + '|' + day; let s = cache.get(ck); if (s) return s;
  const season = Math.floor(((day - 1) % DAYS_PER_YEAR) / DAYS_PER_SEASON), p = SEASON_P[season];
  let prev = pick(p, rnd(key, `w|${day - 1}|last`));              // "véspera": sorteio próprio, não recursivo
  s = []; s.prev = prev;
  for (let k = 0; k < 8; k++) {
    let st = rnd(key, `w|${day}|${k}|keep`) < PERSIST && p[prev] > 0 ? prev : pick(p, rnd(key, `w|${day}|${k}`));
    if (st === 3 && season === 3 && (k < 4 || k > 6) && rnd(key, `w|${day}|${k}|aft`) < 0.45) st = 2;   // trovoadas: de tarde e no começo da noite
    s.push(st); prev = st;
  }
  if (cache.size > 400) cache.clear(); cache.set(ck, s);
  return s;
}

// vento: direção do dia (girando um pouco a cada período) e força pelo estado
function windDir(key, day, k) { const a = rnd(key, `wind|${day}`) * Math.PI * 2 + (rnd(key, `wind|${day}|${k}`) - 0.5) * 1.2; return [Math.cos(a), Math.sin(a) * 0.5]; }

// tempo num instante (minutos de jogo desde o dia 1, 00:00)
export function weatherAt(key, minutes) {
  const m = Math.max(0, minutes), day = Math.floor(m / 1440) + 1, md = m - (day - 1) * 1440, k = Math.min(7, Math.floor(md / PERIOD_MIN));
  const st = dayStates(key, day), cur = STATES[st[k]], prv = STATES[k > 0 ? st[k - 1] : (day > 1 ? dayStates(key, day - 1)[7] : st.prev)];   // meia-noite: continua do último período de ontem
  const into = md - k * PERIOD_MIN, u = Math.min(1, into / BLEND_MIN), e = u * u * (3 - 2 * u);
  const A = TARGET[prv], B = TARGET[cur], mix = (i) => A[i] + (B[i] - A[i]) * e;
  const [wx, wy] = windDir(key, day, k), ws = mix(2), wl = Math.hypot(wx, wy) || 1;
  return {
    state: cur, label: STATE_LABEL[cur], day, period: k,
    cloud: mix(0), rain: mix(1), windStrength: ws,
    windX: wx / wl * ws, windY: wy / wl * ws,
    flash: cur === 'storm' ? flashAt(key, m) : 0,
  };
}

// relâmpagos: em cada janela de 6 minutos de jogo de trovoada pode haver 1 clarão (0,4 s reais ≈ 1 min de jogo) com repique
export function flashAt(key, minutes) {
  const slot = Math.floor(minutes / 6), r = rnd(key, `flash|${slot}`); if (r > 0.45) return 0;
  const t0 = slot * 6 + rnd(key, `flash|${slot}|t`) * 5, d = minutes - t0;
  if (d < 0 || d > 1) return 0;
  return d < 0.25 ? 1 - d / 0.25 * 0.6 : d < 0.4 ? 0.2 : d < 0.55 ? 0.7 : Math.max(0, 0.7 - (d - 0.55) / 0.45 * 0.7);
}

// umidade do chão (0..1): chuva das últimas horas, secando aos poucos (mais rápido na Seca e na Estiagem). Gera as poças.
export function wetnessAt(key, minutes) {
  let w = 0;
  for (let back = 360; back >= 0; back -= 15) {                    // integra as últimas 6 h, passo de 15 min
    const t = minutes - back; if (t < 0) continue;
    const r = weatherAt(key, t).rain, season = Math.floor(((Math.floor(t / 1440)) % DAYS_PER_YEAR) / DAYS_PER_SEASON);
    const dry = season === 2 ? 0.16 : season === 1 ? 0.1 : 0.06;
    w = Math.min(1, Math.max(0, w + r * 0.12 - dry * (1 - r)));
  }
  return w;
}
