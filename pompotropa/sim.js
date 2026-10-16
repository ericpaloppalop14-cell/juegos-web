// POMPOTROPA · simulación pura (sin THREE) — la usan el juego y los tests
export const TIERV = [1, 3, 9, 27];          // valor / vida de cada nivel
export const TSIZE = [.5, .72, 1.0, 1.45];   // radio visual = radio de juego
export const NCOL = 5;
export const DIFFS = [ // Fácil, Normal, Difícil
  { sp: .8, think: .65, flee: 9, prey: .5, look: 14, err: .9 },
  { sp: .9, think: .4, flee: 14, prey: .7, look: 20, err: .45 },
  { sp: 1, think: .25, flee: 18, prey: .82, look: 26, err: .15 }];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const damp = (k, dt) => 1 - Math.exp(-k * dt);

export function createSim(o = {}) {
  const rng = o.rng || Math.random, rnd = (a, b) => a + rng() * (b - a);
  const W = { arena: o.arena || 62, dur: o.dur ?? 180, t: 0, over: false, auth: o.auth !== false, diff: o.diff ?? 0,
    players: [], loose: [], uid: 1, ev: [], battles: new Map(), mergeT: 0, spawnT: 0, looseTarget: o.loose ?? 320, cap: o.cap ?? 1700 };
  const E = (...a) => W.ev.push(a);
  W.unit = (tier, col, x, z) => ({ id: W.uid++, tier, col, hp: TIERV[tier], x, z, vx: 0, vz: 0, ph: rng() * 6.28, owner: null, slot: 0 });
  W.total = () => W.loose.length + W.players.reduce((a, p) => a + p.units.length, 0);
  W.addPlayer = (info = {}) => { const p = Object.assign({ id: W.players.length, name: 'Jugador', bot: 0, human: 0, x: 0, z: 0, vx: 0, vz: 0, dx: 0, dz: 0, fx: 0, fz: 1,
      alive: 1, prot: 0, resp: 0, units: [], power: 0, best: 0, kills: 0, deaths: 0, aura: 1, think: 0, tx: 0, tz: 0, slotR: [], dirty: 1, armyR: 1, pers: 0 }, info);
    W.players.push(p); return p; };
  W.spawnPlayer = (p, n = 2, prot = 2) => { let best = null, bd = -1;
    for (let k = 0; k < 14; k++) { const a = rng() * 6.283, r = Math.sqrt(rng()) * (W.arena - 10), x = Math.cos(a) * r, z = Math.sin(a) * r;
      let d = 1e9; for (const q of W.players) if (q !== p && q.alive) d = Math.min(d, Math.hypot(q.x - x, q.z - z) - q.armyR); if (d > bd) { bd = d; best = [x, z]; } }
    p.x = best[0]; p.z = best[1]; p.vx = p.vz = 0; p.alive = 1; p.prot = prot; p.resp = 0;
    for (let i = 0; i < n; i++) W.give(p, W.unit(0, (rng() * NCOL) | 0, p.x + rnd(-1, 1), p.z + rnd(-1, 1))); E('spawn', p.id); };
  W.give = (p, u) => { u.owner = p; p.units.push(u); p.dirty = 1; };
  W.giveValue = (p, v) => { for (let t = 3; t >= 0; t--) while (v >= TIERV[t]) { v -= TIERV[t]; W.give(p, W.unit(t, (rng() * NCOL) | 0, p.x + rnd(-2, 2), p.z + rnd(-2, 2))); } };
  W.spawnLoose = (tier, col, x, z) => { if (x === undefined) { const a = rng() * 6.283, r = Math.sqrt(rng()) * (W.arena - 3); x = Math.cos(a) * r; z = Math.sin(a) * r; }
    const u = W.unit(tier, col, x, z); W.loose.push(u); return u; };
  W.initLoose = () => { W.loose.length = 0; for (let i = 0; i < W.looseTarget; i++) W.spawnLoose(rng() < .9 ? 0 : 1, (rng() * NCOL) | 0); };
  // formación: más grandes en el centro, área acumulada → radio (girasol)
  W.layout = p => { p.units.sort((a, b) => b.tier - a.tier); let acc = Math.PI * 2.1 * 2.1; p.power = 0;
    for (let i = 0; i < p.units.length; i++) { const u = p.units[i], s = TSIZE[u.tier]; u.slot = i; const r = Math.sqrt(acc / Math.PI) + s * .55; acc += (s * 2.05) ** 2;
      p.slotR[i] = r; p.power += u.hp; }
    p.armyR = Math.sqrt(acc / Math.PI); p.best = Math.max(p.best, p.power); p.dirty = 0; };
  W.recruitR = p => (1.7 + p.armyR * .55) * p.aura;
  W.eliminate = (p, by) => { p.alive = 0; p.resp = 3; p.deaths++; if (by) by.kills++; for (const u of p.units) u.owner = null; p.units.length = 0; p.dirty = 1; p.power = 0; E('elim', p.id, by ? by.id : -1); };
  W.revive = (p, value) => { W.spawnPlayer(p, 0, 2.5); W.giveValue(p, Math.max(2, value | 0)); W.layout(p); };

  function botThink(p, D) { const me = p.power; let fx = 0, fz = 0, danger = 0;
    for (const q of W.players) { if (q === p || !q.alive) continue; const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) - q.armyR - p.armyR;
      if (q.power > me * 1.12 && d < D.flee * (p.pers === 1 ? .7 : p.pers === 2 ? 1.3 : 1)) { const w = 1 / Math.max(1, d); fx -= dx * w; fz -= dz * w; danger = 1; } }
    if (danger) { p.tx = p.x + fx * 40; p.tz = p.z + fz * 40; }
    else { let tgt = null, bd = 1e9;
      if (!(p.pers === 2)) for (const q of W.players) { if (q === p || !q.alive || q.prot > 0) continue; const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (q.power < me * D.prey * (p.pers === 1 ? 1.15 : 1) && me >= 6 && d < D.look && d < bd) { bd = d; tgt = q; } }
      if (tgt) { p.tx = tgt.x + tgt.vx * .4; p.tz = tgt.z + tgt.vz * .4; }
      else { let b = null, bs = -1e9; for (let k = 0; k < 40 && W.loose.length; k++) { const u = W.loose[(rng() * W.loose.length) | 0], d = Math.hypot(u.x - p.x, u.z - p.z); const s = TIERV[u.tier] * 6 - d; if (s > bs) { bs = s; b = u; } }
        if (b) { p.tx = b.x; p.tz = b.z; } } }
    p.tx += rnd(-1, 1) * D.err * 8; p.tz += rnd(-1, 1) * D.err * 8;
    const r = Math.hypot(p.tx, p.tz), lim = W.arena - 4; if (r > lim) { p.tx *= lim / r; p.tz *= lim / r; }
    const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz) || 1; p.dx = dx / d; p.dz = dz / d; if (d < 1.2) { p.dx *= .3; p.dz *= .3; } }

  function fight(A, B, dt) { const key = A.id < B.id ? A.id + ':' + B.id : B.id + ':' + A.id; let b = W.battles.get(key);
    if (!b) { b = { a: A.id < B.id ? A : B, b: A.id < B.id ? B : A, a0: 0, b0: 0, tk: 0, seen: 0 }; b.a0 = b.a.power; b.b0 = b.b.power; W.battles.set(key, b); E('clash', A.id, B.id); }
    b.seen = W.t; b.tk -= dt; if (b.tk > 0) return; b.tk = .07;
    const X = b.a, Y = b.b; for (let k = 0; k < 1 + ((X.units.length + Y.units.length) / 60 | 0); k++) {
      if (!X.units.length || !Y.units.length) break; const ua = X.units[X.units.length - 1], ub = Y.units[Y.units.length - 1], d = Math.min(ua.hp, ub.hp);
      ua.hp -= d; ub.hp -= d; X.power -= d; Y.power -= d;
      if (ua.hp <= 0) { X.units.pop(); E('pop', ua.x, ua.z, ua.col, ua.tier, X.id); X.dirty = 1; }
      if (ub.hp <= 0) { Y.units.pop(); E('pop', ub.x, ub.z, ub.col, ub.tier, Y.id); Y.dirty = 1; } }
    const lose = (L, Wn, l0) => { const left = L.units.slice(); for (const u of left) { u.hp = TIERV[u.tier]; W.give(Wn, u); } L.units.length = 0; E('defect', L.id, Wn.id, left.length); W.eliminate(L, Wn); W.battles.delete(key); };
    if (!X.units.length && !Y.units.length) { W.eliminate(X, Y); W.eliminate(Y, X); W.battles.delete(key); }
    else if (!X.units.length || (X.power <= b.a0 * .4 && X.power < Y.power)) lose(X, Y);
    else if (!Y.units.length || (Y.power <= b.b0 * .4 && Y.power < X.power)) lose(Y, X); }

  W.step = dt => { W.t += dt; W.ev.length = 0;
    if (W.auth && W.dur && W.t >= W.dur && !W.over) { W.over = true; E('over'); }
    const A = W.arena;
    for (const p of W.players) {
      if (!p.alive) { if (W.auth && p.bot) { p.resp -= dt; if (p.resp <= 0) W.spawnPlayer(p, 3); } continue; }
      if (p.prot > 0) p.prot -= dt;
      if (W.auth && p.bot) { p.think -= dt; const D = DIFFS[W.diff]; if (p.think <= 0) { p.think = D.think * rnd(.7, 1.3); botThink(p, D); } }
      if (W.auth || p.local) { const sp = 10.5 * (p.bot ? DIFFS[W.diff].sp : 1) * (1 - Math.min(.3, p.armyR / 70)), dl = Math.hypot(p.dx, p.dz), k = damp(dl > .05 ? 5.5 : 4, dt);
        p.vx += (p.dx * sp - p.vx) * k; p.vz += (p.dz * sp - p.vz) * k; p.x += p.vx * dt; p.z += p.vz * dt;
        const r = Math.hypot(p.x, p.z), lim = A - 1.5; if (r > lim) { p.x *= lim / r; p.z *= lim / r; const nx = p.x / r, nz = p.z / r, vn = p.vx * nx + p.vz * nz; if (vn > 0) { p.vx -= vn * nx; p.vz -= vn * nz; } } }
      const sv = Math.hypot(p.vx, p.vz); if (sv > .5) { p.fx += (p.vx / sv - p.fx) * damp(6, dt); p.fz += (p.vz / sv - p.fz) * damp(6, dt); }
    }
    // reclutar
    if (W.auth) for (const p of W.players) { if (!p.alive) continue; const R = W.recruitR(p); let n = 0;
      for (let i = W.loose.length - 1; i >= 0; i--) { const u = W.loose[i], dx = u.x - p.x, dz = u.z - p.z, rr = R + TSIZE[u.tier];
        if (dx * dx + dz * dz < rr * rr) { W.loose[i] = W.loose[W.loose.length - 1]; W.loose.pop(); W.give(p, u); n++; } }
      if (n) E('rec', p.id, n); }
    // fusionar (3 iguales → 1 mayor), uno por jugador cada 0,22 s para que se vea la cadena
    W.mergeT -= dt; if (W.auth && W.mergeT <= 0) { W.mergeT = .22;
      for (const p of W.players) { if (!p.alive) continue; const g = {};
        for (const u of p.units) if (u.tier < 3 && u.hp === TIERV[u.tier]) { const k = u.tier * 10 + u.col; (g[k] || (g[k] = [])).push(u); }
        for (const k in g) if (g[k].length >= 3) { const tr = g[k].slice(0, 3), t = tr[0].tier; let x = 0, z = 0; for (const u of tr) { x += u.x / 3; z += u.z / 3; }
          p.units = p.units.filter(u => !tr.includes(u)); const nu = W.unit(t + 1, tr[0].col, x, z); W.give(p, nu); E('merge', p.id, x, z, tr[0].col, t + 1); break; } } }
    for (const p of W.players) if (p.dirty) W.layout(p);
    // batallas entre hordas
    if (W.auth) { const L = W.players.filter(p => p.alive);
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (!a.alive || !b.alive || a.prot > 0 || b.prot > 0) continue;
        const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < (a.armyR + b.armyR) * .82) fight(a, b, dt); }
      for (const [k, b] of W.battles) if (W.t - b.seen > .8) W.battles.delete(k); }
    // seguir al líder: muelle hacia su hueco + bamboleo vivo
    for (const p of W.players) { const n = p.units.length, cx = p.x - p.fx * p.armyR * .25, cz = p.z - p.fz * p.armyR * .25, ka = damp(9, dt);
      for (let i = 0; i < n; i++) { const u = p.units[i], a = i * 2.39996 + W.t * .25, r = p.slotR[i] || 1;
        const tx = cx + Math.cos(a) * r + Math.sin(W.t * 2.1 + u.ph) * .18, tz = cz + Math.sin(a) * r + Math.cos(W.t * 1.7 + u.ph) * .18;
        u.vx += ((tx - u.x) * 14 - u.vx) * ka; u.vz += ((tz - u.z) * 14 - u.vz) * ka; const s = Math.hypot(u.vx, u.vz), mx = 26; if (s > mx) { u.vx *= mx / s; u.vz *= mx / s; }
        u.x += u.vx * dt; u.z += u.vz * dt; } }
    // rellenar sueltos
    if (W.auth) { W.spawnT -= dt; if (W.spawnT <= 0) { W.spawnT = .15; const tot = W.total(); for (let k = 0; k < 4 && W.loose.length < W.looseTarget && tot + k < W.cap; k++) { const r = rng(); W.spawnLoose(r < .86 ? 0 : r < .985 ? 1 : 2, (rng() * NCOL) | 0); } } }
  };
  W.rank = () => W.players.slice().sort((a, b) => b.power - a.power);
  return W;
}
