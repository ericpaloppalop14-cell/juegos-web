// v4: mejoras propias de cada personaje (4 por personaje, 6 niveles, cada vez más caras)
export const UPMAX = 6;
export const upCost = (l) => Math.round(150 * Math.pow(2, l) / 10) * 10; // 150, 300, 600, 1200, 2400, 4800
const ic = (p, f = 'none') => `<svg viewBox="0 0 24 24" fill="${f}" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const pc = (v, d = 0) => (v * 100).toFixed(d).replace('.', ',') + '%';
const num = (v, d = 1) => v.toFixed(d).replace('.', ',');
// stat: nombre, color, icono y cómo se describe un valor total
export const STATS = {
  size: { n: 'Tamaño', col: '#ff4fa3', icon: ic('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'), d: (v) => `Empiezas un ${pc(v)} más grande` },
  time: { n: 'Duración', col: '#2a8cf0', icon: ic('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>'), d: (v) => `+${num(v, 0)} s en cada intento` },
  speed: { n: 'Velocidad', col: '#ff9a1f', icon: ic('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', '#fff'), d: (v) => `Te mueves un ${pc(v)} más rápido` },
  loot: { n: 'Botín', col: '#3fbf5a', icon: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1.2 1.3-1.8 3-1.8s3 .8 3 2-1.3 1.6-3 2-3 .8-3 2 1.3 2 3 2 3-.6 3-1.8"/>'), d: (v) => `+${pc(v)} monedas por objeto` },
  gate: { n: 'Boca grande', col: '#e8453c', icon: ic('<path d="M4 9c4-5 12-5 16 0M4 15c4 5 12 5 16 0"/><path d="M8 12h8"/>'), d: (v) => `Tragas cosas un ${pc(v / 0.72)} más grandes` },
  combo: { n: 'Combo', col: '#b06bff', icon: ic('<path d="M5 19 12 4l7 15M8 14h8"/>'), d: (v) => `El combo dura ${num(v)} s más` },
  gain: { n: 'Crecimiento', col: '#7bd65a', icon: ic('<path d="M12 21V8M12 8c0-3-2-5-6-5 0 4 2 6 6 5zM12 11c0-3 2-5 6-5 0 4-2 6-6 5z"/>'), d: (v) => `Creces un ${pc(v)} más por objeto` },
  magnet: { n: 'Imán', col: '#2fb8d8', icon: ic('<path d="M6 3v8a6 6 0 0 0 12 0V3M6 7h4M14 7h4"/>'), d: (v) => `Monedas y relojes de más lejos (+${pc(v)})` },
  inv: { n: 'Escudo', col: '#5a7aff', icon: ic('<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>'), d: (v) => `+${num(v)} s de protección tras un golpe` },
  hit: { n: 'Armadura', col: '#8a8aa0', icon: ic('<path d="M4 8l4-4h8l4 4-2 10-6 3-6-3z"/>'), d: (v) => `Los golpes duelen un ${pc(v)} menos` },
  score: { n: 'Puntos', col: '#ffb02a', icon: ic('<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.4 6.5 20.4l1-6.3L3 9.7l6.2-.9z"/>'), d: (v) => `+${pc(v)} de puntos por objeto` },
  clock: { n: 'Relojes', col: '#1fa8d6', icon: ic('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 1M12 2v2"/>'), d: (v) => `Cada reloj da +${num(v)} s extra` },
  pulse: { n: 'Superaspiración', col: '#ff5a8a', icon: ic('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/>'), d: (v, l) => (l ? `Aspira todo lo cercano cada ${num(pulsePeriod(l), 0)} s` : 'Aspiración automática cada cierto tiempo') },
};
export const pulsePeriod = (l) => Math.max(8, 26 - 3 * l);
export const pulseRadius = (l) => 2.2 + 0.28 * l;
// [stat, valor por nivel]
export const CHAR_UPS = {
  dona: [['size', 0.08], ['time', 5], ['speed', 0.05], ['loot', 0.16]],
  gato: [['gate', 0.035], ['pulse', 1], ['magnet', 0.3], ['size', 0.06]],
  fregona: [['speed', 0.065], ['combo', 0.35], ['clock', 1.5], ['inv', 0.3]],
  bruja: [['loot', 0.22], ['score', 0.09], ['magnet', 0.3], ['gain', 0.07]],
  robo: [['time', 6], ['clock', 1.6], ['size', 0.07], ['gain', 0.06]],
  calcetin: [['hit', 0.1], ['inv', 0.35], ['size', 0.07], ['gate', 0.028]],
  pulpo: [['score', 0.11], ['combo', 0.3], ['pulse', 1], ['speed', 0.04]],
  jamon: [['gain', 0.09], ['size', 0.09], ['loot', 0.13], ['time', 4]],
  croqueta: [['combo', 0.4], ['score', 0.1], ['speed', 0.05], ['loot', 0.13]],
  genio: [['inv', 0.35], ['loot', 0.15], ['clock', 2], ['pulse', 1]],
  fantasma: [['hit', 0.1], ['speed', 0.05], ['magnet', 0.3], ['gate', 0.028]],
  disco: [['magnet', 0.4], ['loot', 0.18], ['score', 0.09], ['clock', 1.5]],
};
export const upList = (charId) => (CHAR_UPS[charId] || CHAR_UPS.dona).map(([stat, per], i) => ({ i, stat, per, ...STATS[stat] }));
// total de un stat para un personaje con sus niveles guardados (save.cu[char] = [l0,l1,l2,l3])
export function statTotals(charId, levels) {
  const out = {}; const L = levels || [];
  (CHAR_UPS[charId] || CHAR_UPS.dona).forEach(([stat, per], i) => { out[stat] = (out[stat] || 0) + per * (L[i] || 0); out[stat + '_l'] = (out[stat + '_l'] || 0) + (L[i] || 0); });
  return out;
}
