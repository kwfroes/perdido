// Mudanças sobre a semente ("delta"). O mundo continua saindo da semente; o jogo guarda só o que mudou:
//   removed: ids de objetos gerados que saíram (remo pego, canoa lançada, minério quebrado...)
//   changed: id -> novo tipo (ex.: minério inteiro -> rachado -> cascalho), no mesmo lugar
//   added:   objetos novos [{ type, x, y, flip }] (fruta caída, construções...)
//   harvest: id -> janela da safra colhida (a fruta volta na próxima safra)
// Id estável de objeto gerado = tipo + posição (o gerador é determinístico: mesmo mundo, mesmo id).
export const objectId = (o) => `${o.type}:${o.x}:${o.y}`;

export class WorldDelta {
  constructor(data) {
    data = data || {};                                   // jogo novo: sem mudanças
    this.removed = new Set(data.removed || []);
    this.changed = new Map(Object.entries(data.changed || {}));
    this.added = (data.added || []).map(a => ({ ...a }));
    this.harvest = new Map(Object.entries(data.harvest || {}));
    this.hits = new Map(Object.entries(data.hits || {}));        // id -> golpes já dados num minério grande
  }
  remove(id) { this.removed.add(id); this.changed.delete(id); this.harvest.delete(id); this.hits.delete(id); }
  change(id, type) { this.changed.set(id, type); }
  add(obj) { this.added.push(obj); }
  harvested(id, windowKey) { return this.harvest.get(id) === windowKey; }
  markHarvest(id, windowKey) { this.harvest.set(id, windowKey); }
  toJSON() {
    return { removed: [...this.removed].sort(), changed: Object.fromEntries([...this.changed].sort()), added: this.added, harvest: Object.fromEntries([...this.harvest].sort()), hits: Object.fromEntries([...this.hits].sort()) };
  }
  // descarta o que não existe mais no mundo (gerador mudou): devolve quantas mudanças caíram
  sanitize(ids) {
    let dropped = 0;
    for (const id of [...this.removed]) if (!ids.has(id) && !id.startsWith('pellet:')) { this.removed.delete(id); dropped++; }
    for (const id of [...this.changed.keys()]) if (!ids.has(id)) { this.changed.delete(id); dropped++; }
    for (const id of [...this.harvest.keys()]) if (!ids.has(id)) { this.harvest.delete(id); dropped++; }
    for (const id of [...this.hits.keys()]) if (!ids.has(id)) { this.hits.delete(id); dropped++; }
    return dropped;
  }
}

// "Marca" do mundo gerado: FNV-1a 32 bits sobre terreno, objetos e início. Se o gerador mudar, a marca muda.
export function worldFingerprint(world) {
  let h = 0x811c9dc5 >>> 0;
  const mix = (v) => { h ^= v & 0xff; h = Math.imul(h, 16777619) >>> 0; h ^= (v >>> 8) & 0xff; h = Math.imul(h, 16777619) >>> 0; h ^= (v >>> 16) & 0xff; h = Math.imul(h, 16777619) >>> 0; };
  const t = world.terrain; for (let i = 0; i < t.length; i += 1) { h ^= t[i]; h = Math.imul(h, 16777619) >>> 0; }
  mix(world.objects.length);
  for (const o of world.objects) { mix(o.x); mix(o.y); for (let k = 0; k < o.type.length; k++) { h ^= o.type.charCodeAt(k); h = Math.imul(h, 16777619) >>> 0; } }
  mix(world.start.x); mix(world.start.y);
  return h.toString(16).padStart(8, '0');
}
