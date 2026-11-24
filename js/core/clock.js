import { CONFIG } from './config.js';
import { clockInfo, isNightHour, phaseOf } from '../data/calendar.js';

// Relógio do jogo. Guarda os MINUTOS de jogo desde o dia 1, 00:00. Um dia de jogo dura CONFIG.CLOCK.DAY_SECONDS segundos reais.
// pause() / resume() param o tempo (diálogo e mapa abertos). onDay(info) e onSeason(info) avisam quando o dia/estação muda.
export class GameClock {
  constructor(startMinutes = CONFIG.CLOCK.START_DAY_MINUTES) {
    this.minutes = startMinutes; this.paused = false;
    this.onDay = null; this.onSeason = null;
    this._info = clockInfo(this.minutes);
  }
  get info() { return this._info; }
  get hour() { return this._info.hour; }
  get isNight() { return isNightHour(this._info.hour); }
  get phase() { return phaseOf(this._info.hour); }
  advance(dt) { if (!this.paused) this.setMinutes(this.minutes + dt * 1440 / CONFIG.CLOCK.DAY_SECONDS); }
  setMinutes(m) {
    const prev = this._info; this.minutes = Math.max(0, m); this._info = clockInfo(this.minutes);
    if (this._info.day !== prev.day && this.onDay) this.onDay(this._info, prev);
    if (this._info.season !== prev.season && this.onSeason) this.onSeason(this._info, prev);
  }
  // atalhos de depuração
  toHour(h) { const i = this._info, next = (i.day - 1) * 1440 + h * 60; this.setMinutes(next > this.minutes ? next : next + 1440); }
  addDays(n) { this.setMinutes(this.minutes + n * 1440); }
  nextSeason() { const i = this._info; this.addDays(28 - i.dayOfSeason); }
}
