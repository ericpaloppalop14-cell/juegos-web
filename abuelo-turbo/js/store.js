import { CHARS, SKINS, UPGR } from './data.js?v=4';
import { rng } from './util.js?v=4';

const PRUEBAS = /[?&]pruebas=1/.test(location.search);
const KEY = PRUEBAS ? 'abuelo-turbo-pruebas-v1' : 'abuelo-turbo-v1';
export const isPruebas = PRUEBAS;
const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

const MISS = [
  { t: 'coins', txt: n => `Recoge ${n} dentaduras`, lo: 120, hi: 400, step: 20, acc: 'sum' },
  { t: 'dist', txt: n => `Corre ${n} metros en una partida`, lo: 800, hi: 2500, step: 100, acc: 'max' },
  { t: 'jump', txt: n => `Salta ${n} veces`, lo: 20, hi: 60, step: 5, acc: 'sum' },
  { t: 'slide', txt: n => `Reclínate ${n} veces bajo los obstáculos`, lo: 12, hi: 35, step: 1, acc: 'sum' },
  { t: 'pills', txt: n => `Coge ${n} pastillas`, lo: 3, hi: 8, step: 1, acc: 'sum' },
  { t: 'flip', txt: n => `Haz ${n} piruetas en las rampas`, lo: 2, hi: 6, step: 1, acc: 'sum' },
  { t: 'score', txt: n => `Consigue ${n} puntos en una partida`, lo: 6000, hi: 30000, step: 500, acc: 'max' },
  { t: 'turbo', txt: n => `Usa el turbo ${n} veces`, lo: 1, hi: 3, step: 1, acc: 'sum' },
  { t: 'district', txt: n => `Llega a ${['El Barrio', 'El Mercado', 'Paseo Marítimo', 'El Polígono', 'las Fiestas del Pueblo', 'la Noche de Neones'][n]}`, lo: 2, hi: 5, step: 1, acc: 'max', dist: true },
  { t: 'shield', txt: n => `Rompe la faja ortopédica ${n} ${n > 1 ? 'veces' : 'vez'}`, lo: 1, hi: 2, step: 1, acc: 'sum' },
  { t: 'runs', txt: n => `Juega ${n} partidas`, lo: 3, hi: 6, step: 1, acc: 'sum' },
];
function genMissions(day) {
  const R = rng(day * 7 + 3), pool = MISS.slice(), out = [];
  for (let i = 0; i < 3; i++) {
    const m = pool.splice(Math.floor(R() * pool.length), 1)[0]; let n = m.lo + Math.floor(R() * ((m.hi - m.lo) / m.step + 1)) * m.step; if (n > m.hi) n = m.hi;
    out.push({ t: m.t, n, p: 0, claimed: false, reward: Math.round((120 + R() * 180) / 10) * 10 });
  }
  return out;
}
export const missionText = m => { const d = MISS.find(x => x.t === m.t); return d.txt(m.n); };

const blank = () => ({ v: 1, coins: 0, best: 0, bestDist: 0, runs: 0, totalCoins: 0, char: 'paco', skin: 'def', chars: ['paco'], skins: ['def'], up: { turbo: 0, iman: 0, faja: 0, baston: 0, cafe: 0, oro: 0 }, mult: 1, day: 0, missions: [], allDone: false, set: { music: true, sfx: true, q: 'auto' }, seen: { tuto: false }, firstShown: {} });
export const S = blank();
export function load() {
  let d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  if (d && d.v === 1) Object.assign(S, blank(), d); 
  S.up = Object.assign(blank().up, S.up || {}); S.set = Object.assign(blank().set, S.set || {}); S.seen = Object.assign({}, S.seen);
  if (PRUEBAS) { S.chars = CHARS.map(c => c.id); S.skins = SKINS.map(s => s.id); S.coins = Math.max(S.coins, 9999999); S.mult = Math.max(S.mult, 10); }
  rollDay(); return S;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
export function rollDay() { const t = today(); if (S.day !== t) { S.day = t; S.missions = genMissions(t); S.allDone = false; save(); } }
export function upLevel(id) { return S.up[id] || 0; }
export function upValue(id) { const u = UPGR.find(x => x.id === id); return u.base + u.per * upLevel(id); }
export function upCost(id) { const u = UPGR.find(x => x.id === id), l = upLevel(id); return l >= u.costs.length ? null : u.costs[l]; }
export function buyUp(id) { const c = upCost(id); if (c == null || S.coins < c) return false; S.coins -= c; S.up[id]++; save(); return true; }
export function buyChar(id) { const ch = CHARS.find(c => c.id === id); if (S.chars.includes(id) || S.coins < ch.price) return false; S.coins -= ch.price; S.chars.push(id); save(); return true; }
export function buySkin(id) { const sk = SKINS.find(c => c.id === id); if (S.skins.includes(id) || S.coins < sk.price) return false; S.coins -= sk.price; S.skins.push(id); save(); return true; }
/** progress a mission type. returns list of newly completed missions */
export function mission(t, v, mode) {
  rollDay(); const done = [];
  for (const m of S.missions) if (m.t === t && m.p < m.n) {
    const d = MISS.find(x => x.t === t); const before = m.p;
    if (mode === 'max' || d.acc === 'max') m.p = Math.max(m.p, v); else m.p += v;
    if (m.p >= m.n) { m.p = m.n; done.push(m); }
  }
  return done;
}
export function claim(i) {
  const m = S.missions[i]; if (!m || m.claimed || m.p < m.n) return 0; m.claimed = true; S.coins += m.reward; let bonus = 0;
  if (S.missions.every(x => x.claimed) && !S.allDone) { S.allDone = true; S.mult = Math.min(15, S.mult + 1); bonus = 300; S.coins += bonus; }
  save(); return m.reward + bonus;
}
export const MISSIONS = MISS;
