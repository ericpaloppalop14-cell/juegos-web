/* Generador de patrones justos: siempre hay camino libre */
import { clamp, rand, randi, pick } from './util.js?v=3';
import { lowForDistrict, highForDistrict, bigForDistrict, carForDistrict } from './props.js?v=3';
import { distIdxAt } from './world.js?v=3';
import { S, upValue } from './store.js?v=3';

export const LW = 2.4;
const LANES = [-1, 0, 1];
const others = l => LANES.filter(x => x !== l);

export function initGen(g) { g.gd = 55; g.pathLane = 0; g.lastPat = ''; g.nextPill = 260 + Math.random() * 120; g.patCount = 0; }

export function genAhead(g, dist) {
  let guard = 0;
  while (g.gd < dist + 175 && guard++ < 12) {
    const di = distIdxAt(g.gd), dif = clamp(g.gd / 4200, 0, 1);
    const spd = Math.max(g.speed, 16) * 1.12;
    const pat = choose(g, di, dif);
    g.lastPat = pat.name;
    const r = pat.fn(g, g.gd, di, dif, spd);
    const gap = clamp(spd * (0.82 - dif * 0.18), 13, 30) + (r.need === 'jump' || r.need === 'slide' ? 4 : 0);
    g.gd += r.len + gap; g.patCount++;
  }
}
function choose(g, di, dif) {
  const gd = g.gd; const W = [];
  const add = (name, fn, w) => { if (w > 0 && name !== g.lastPat) W.push({ name, fn, w }); };
  if (gd < 60) return { name: 'intro', fn: P.coinsLine };
  add('coinsLine', P.coinsLine, 2.6 - dif * 1.6); add('snake', P.snake, 2.0);
  add('cars', P.cars, 3.0 + dif); add('lowRow', P.lowRow, 2.4); add('highRow', P.highRow, 2.2);
  add('big', P.big, 1.4 + dif); if (gd > 250) add('ramp', P.ramp, 1.8); if (gd > 200) add('lowSeries', P.lowSeries, 1.3);
  if (gd > 350) add('crossers', P.crossers, 1.0); if (gd > 450) add('pigeons', P.pigeons, 1.2);
  if (gd > 600) add('zigzag', P.zigzag, 1.2 + dif * 1.5); if (gd > 1400 && dif > 0.3) add('combo', P.combo, 1.4 + dif * 2);
  let t = W.reduce((a, b) => a + b.w, 0), r = Math.random() * t; for (const w of W) { r -= w.w; if (r <= 0) return w; } return W[0];
}

/* ---- helpers ---- */
function coinsAt(g, lane, d0, n, step, y = 0.9) { for (let i = 0; i < n; i++) g.addCoin(lane * LW, y, d0 + i * step, goldChance(g)); }
function goldChance(g) { return 0.035 + (g.char.id === 'pirata' ? 0.08 : 0) + upValue('oro') * 0.004; }
function maybePill(g, lane, d) { if (g.gd >= g.nextPill) { g.nextPill = g.gd + (g.char.id === 'ole' ? 190 : 380) + Math.random() * (g.char.id === 'ole' ? 150 : 320); const types = ['turbo', 'iman', 'faja', 'baston', 'cafe']; g.addPill(pick(types), lane * LW, d); return true; } return false; }
function freeLane(g, spd, gapOK = true) { // elige un carril libre cercano al camino actual
  const cand = LANES.filter(l => Math.abs(l - g.pathLane) <= 1); return pick(cand); }
const clearAdv = (spd, dif, mx) => mx / 2 + 3 + spd * (0.6 - dif * 0.08);
function carVar(di) { return pick(carForDistrict(di)); }
function bigVar(di) { return pick(bigForDistrict(di)); }

const P = {
  coinsLine(g, d, di, dif) {
    const lane = g.gd < 60 ? 0 : freeLane(g, 0, false); const n = randi(9, 14); coinsAt(g, lane, d, n, 2.2);
    if (!maybePill(g, lane, d + n * 1.1) && Math.random() < 0.25) { for (const l of others(lane)) if (Math.random() < 0.5) coinsAt(g, l, d + 4, 6, 2.2); }
    g.pathLane = lane; return { len: n * 2.2, need: 'lane' };
  },
  snake(g, d) {
    let lane = g.pathLane, z = d; const segs = randi(3, 4);
    for (let s = 0; s < segs; s++) { coinsAt(g, lane, z, 4, 2.2); z += 4 * 2.2; const nl = clamp(lane + pick([-1, 1]), -1, 1); if (nl !== lane) { for (let k = 1; k <= 2; k++) g.addCoin((lane + (nl - lane) * k / 3) * LW, 0.9, z - 1.1 + k * 0.75, 0); lane = nl; z += 2; } }
    g.pathLane = lane; return { len: z - d, need: 'lane' };
  },
  cars(g, d, di, dif, spd) {
    const rows = randi(1, dif < 0.2 ? 2 : 3); let z = d;
    for (let r = 0; r < rows; r++) {
      const f = freeLane(g, spd, r === 0 && z - d > spd * 0.5);
      const f2 = Math.abs(f - g.pathLane) > 1 && r > 0 ? clamp(g.pathLane + Math.sign(f - g.pathLane), -1, 1) : f;
      const free = f2, blocked = others(free);
      const nBlock = dif < 0.2 ? 1 : (Math.random() < 0.35 + dif * 0.4 ? 2 : 1);
      const bl = nBlock === 2 ? blocked : [pick(blocked)];
      const useBig = Math.random() < 0.28;
      let mx = 4; bl.forEach((l, i) => { const k = (useBig && i === 0) ? bigVar(di) : carVar(di); const e = g.addObs(k, l, z + rand(-1, 1)); mx = Math.max(mx, e.len); });
      coinsAt(g, free, z - 2, 6, 2.0); g.pathLane = free; z += clearAdv(spd, dif, mx);
      if (r === 0) maybePill(g, free, z - 6);
    }
    return { len: z - d + 6, need: 'lane' };
  },
  zigzag(g, d, di, dif, spd) {
    let free = g.pathLane, z = d; const rows = 4, step = Math.max(14, spd * 0.6);
    for (let r = 0; r < rows; r++) {
      const nxt = r === 0 ? free : clamp(free + (free === 0 ? pick([-1, 1]) : -free), -1, 1); free = nxt;
      others(free).forEach(l => g.addObs(carVar(di), l, z + rand(-0.5, 0.5)));
      coinsAt(g, free, z - 3, 5, 1.9); z += clearAdv(spd, dif, 4.2);
    }
    g.pathLane = free; return { len: z - d, need: 'lane' };
  },
  lowRow(g, d, di, dif, spd) {
    const rows = randi(1, dif < 0.2 ? 1 : 2); let z = d; const kind = pick(lowForDistrict(di));
    for (let r = 0; r < rows; r++) {
      const k = Math.random() < 0.5 ? 3 : randi(1, 2); const lanes = k === 3 ? LANES : shuffle(LANES.slice()).slice(0, k);
      lanes.forEach(l => g.addObs(kind, l, z));
      LANES.forEach(l => { if (lanes.includes(l)) arc(g, l, z - 5, 7, 1.0, 2.3); else coinsAt(g, l, z - 4, 5, 2.0); });
      z += Math.max(20, spd * 0.95);
    }
    return { len: z - d - 10, need: 'jump' };
  },
  lowSeries(g, d, di, dif, spd) {
    const lane = g.pathLane, kind = pick(lowForDistrict(di)); let z = d; const n = randi(3, 4), step = Math.max(17, spd * 0.72);
    for (let i = 0; i < n; i++) { g.addObs(kind, lane, z); if (Math.random() < 0.6) g.addObs(kind, others(lane)[0], z); arc(g, lane, z - 5, 7, 0.95, 2.3); z += step; }
    return { len: z - d - 6, need: 'jump' };
  },
  highRow(g, d, di, dif, spd) {
    const rows = randi(1, dif < 0.2 ? 1 : 2); let z = d; const kind = highForDistrict(di);
    for (let r = 0; r < rows; r++) {
      const k = Math.random() < 0.55 ? 3 : 2; const lanes = k === 3 ? LANES : shuffle(LANES.slice()).slice(0, 2);
      lanes.forEach(l => g.addObs(kind, l, z));
      LANES.forEach(l => coinsAt(g, l, z - 3, lanes.includes(l) ? 7 : 5, lanes.includes(l) ? 1.0 : 2.0, lanes.includes(l) ? 0.55 : 0.9));
      z += Math.max(20, spd * 0.95);
    }
    return { len: z - d - 10, need: 'slide' };
  },
  big(g, d, di, dif, spd) {
    const f = freeLane(g, spd, true), b = others(f); const l0 = pick(b); const kind = bigVar(di);
    g.addObs(kind, l0, d + 5); if (Math.random() < 0.75) g.addObs(carVar(di), b.find(x => x !== l0), d + rand(0, 9));
    coinsAt(g, f, d - 3, 12, 2.2); if (Math.random() < 0.5) coinsAt(g, l0, d - 2, 3, 1.8);
    maybePill(g, f, d + 3); g.pathLane = f; return { len: 24, need: 'lane' };
  },
  ramp(g, d, di, dif, spd) {
    const r = pick(LANES), vE = Math.max(spd, 20);
    g.addObs('rampa', r, d + 3);
    const nCars = randi(1, 2); for (let i = 0; i < nCars; i++) g.addObs(i ? carVar(di) : pick(['car', 'van']), r, d + 13 + i * 6.5);
    for (let k = 1; k <= 11; k++) { const t = 0.08 + k * 0.085; const y = 1.6 + 12.8 * t - 14 * t * t + 0.55; g.addCoin(r * LW, Math.max(0.9, y), d + 6 + vE * 0.96 * t, k === 6 ? 1 : 0); }
    others(r).forEach(l => coinsAt(g, l, d, 8, 2.2)); maybePill(g, r, d + 12);
    g.pathLane = r; return { len: 52, need: 'ramp' };
  },
  crossers(g, d, di, dif, spd) {
    const n = randi(1, 2); for (let i = 0; i < n; i++) { const lane = pick(LANES); g.addObs('abuela', lane, d + i * 26, { side: Math.random() < 0.5 ? -1 : 1 }); }
    const l = pick(LANES); coinsAt(g, l, d - 4, 10, 2.4); g.pathLane = l; return { len: 28 * n + 10, need: 'lane' };
  },
  pigeons(g, d, di, dif, spd) {
    const k = randi(1, 2); const lanes = shuffle(LANES.slice()).slice(0, k); let z = d;
    for (let r = 0; r < 2; r++) { lanes.forEach(l => { g.addObs('paloma', l, z); if (Math.random() < 0.6) g.addObs('paloma', l, z + 1.6, { dy: 0.1 }); coinsAt(g, l, z - 3, 6, 1.0, 0.55); }); LANES.filter(l => !lanes.includes(l)).forEach(l => coinsAt(g, l, z - 3, 5, 2.0)); z += Math.max(21, spd * 0.95); }
    return { len: z - d - 8, need: 'slide' };
  },
  combo(g, d, di, dif, spd) {
    const f = freeLane(g, spd, true); others(f).forEach(l => g.addObs(carVar(di), l, d)); coinsAt(g, f, d - 3, 6, 2.0);
    const z = d + Math.max(22, spd * 0.95);
    if (Math.random() < 0.5) { LANES.forEach(l => g.addObs(highForDistrict(di), l, z)); LANES.forEach(l => coinsAt(g, l, z - 3, 6, 1.0, 0.55)); }
    else { const k = pick(lowForDistrict(di)); LANES.forEach(l => g.addObs(k, l, z)); arc(g, 0, z - 5, 7, 1.0, 2.3); }
    g.pathLane = f; return { len: z - d + 6, need: 'jump' };
  },
};
function arc(g, lane, d0, n, step, h) { for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; g.addCoin(lane * LW, 0.9 + Math.sin(t * Math.PI) * (h - 0.9), d0 + i * step, 0); } }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
