// ======================================================================
//  MOCHI PARTY · OLIMPIADAS — mecánicas nuevas (revisión 3, fase B): ninguna se parece a otra
//  bumerán · topos de lava · cuenta peces · ¡que no te vea! · bola caliente · salto de esquí ·
//  moldes de lava · ¿cuál es distinto? · lianas · para el reloj
// ======================================================================
import { THREE, camera, toon, outline, mesh, glowSprite, rnd, clamp, lerp, pick, Audio } from '../core3d.js?v=m10';
import { buildWorld, prop, MUNDOS, SPH, SPHL, CYL, BOX, TOR } from './mundos.js?v=o6';
import { mergedGeo } from './decor.js?v=o6';
import { T, GL, v3, $, sk, info, setButtons, racers, squash, say, scoreFinish, base } from './tipos.js?v=o6';

const VCM = () => toon('#ffffff', { vc: true, rim: .35 });
// objeto del decorado fundido (apoyado en el suelo) y escalado a una altura h
const pm = (kind, parent, pos, h = 1, ry = 0) => { const g = mergedGeo(kind); g.computeBoundingBox(); const sy = g.boundingBox.max.y - g.boundingBox.min.y || 1; const m = new THREE.Mesh(g, VCM()); m.scale.setScalar(h / sy); if (pos) m.position.set(...pos); m.rotation.y = ry; if (parent) parent.add(m); return m; };
const fitP = (kind, h) => { const g = prop(kind); const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()); g.scale.multiplyScalar(h / Math.max(.01, s.y)); return g; };
const held = (E, k) => !!(E.input.held && E.input.held[k]);
const tapped = E => E.taps.length > 0 || E.side.length > 0 || E.swipe;
const holding = E => held(E, 'M') || E.input.down || !!(window.__keys || {}).Space;
const port = () => innerHeight > innerWidth;
const lineX = (k, SP) => (k - 2.5) * SP;
function board(E, fmt) { info(E.racers.slice().sort((a, b) => b.score - a.score).slice(0, 3).map(r => `${r.me ? '<u>Tú</u>' : r.ch.name}: ${fmt ? fmt(r) : r.score}`).join('<br>')); }
function scoreEnd(E, fmtLabel) { for (const r of E.racers) r.label = fmtLabel(r); scoreFinish(E, 'score'); }
function camTo(E, dt, pos, look, fov, k = 3) { E._cp = E._cp || pos.clone(); E._cl = E._cl || look.clone(); E._cp.lerp(pos, Math.min(1, dt * k)); E._cl.lerp(look, Math.min(1, dt * k)); camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(E._cp); camera.lookAt(E._cl); }
// toques en tres zonas (botones ⬅ ● ➡ o tercios de la pantalla) → 0, 1, 2
function zones(E) { const o = []; for (const s of E.side) o.push(s === 'L' ? 0 : 2); if (E.swipe) o.push(1); for (const x of E.taps) o.push(x < innerWidth / 3 ? 0 : x > innerWidth * 2 / 3 ? 2 : 1); return o; }
const cheer = (r, t = .5) => { r.expr = 'happy'; r.hop = t; };
function hopY(r, dt) { r.hop = Math.max(0, (r.hop || 0) - dt); return r.hop > 0 ? Math.sin(r.hop / .5 * Math.PI) * .45 : 0; }

// =====================================================================
//  BUMERÁN DE PLÁTANO — la flecha va y viene: toca para lanzar. El bumerán sale, tumba los cocos
//  que encuentre en su camino y vuelve a tu mano. 7 lanzamientos.
// =====================================================================
export function bumeran(cfg) {
  const SP = 11, NT = 7, D = 9, FT = 1.5;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 45,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 12, z1: -40, half: 36 } }); setButtons('m', { M: '🪃' });
      racers(E, .45); this.fall = [];
      E.racers.forEach((r, k) => { r.bx = lineX(k, SP); r.score = 0; r.thr = 0; r.ph = rnd(0, 6); r.st = 'aim'; r.aim = 0; r.ft = 0;
        for (const s of [-1, 0, 1]) pm('palmera', sc, [r.bx + s * 3.6, 0, -D - 2.2 - Math.abs(s)], 5.5 + rnd(-.5, .8), rnd(0, 6));
        pm('mono', sc, [r.bx + 2.5, 0, -D - 4], 1.3, .3);
        r.tg = []; this.targets(E, r);
        r.bm = fitP(cfg.proj || 'platano', 1.1); r.bm.visible = false; sc.add(r.bm);
        r.ag = new THREE.Group(); r.ag.position.set(r.bx, .12, -.6); sc.add(r.ag); const c = mesh(new THREE.ConeGeometry(.28, 1.3, 14), GL('#ffe27a', .7), r.ag, [0, 0, -2.8], [-Math.PI / 2, 0, 0]); outline(c, '#a06a00', 1.05);
        mesh(new THREE.BoxGeometry(.12, .04, 1.4), new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: .7 }), r.ag, [0, 0, -1.6], null, [1, 1, 1.4]);
        r.ag.visible = r.me; });
    },
    targets(E, r) { for (const t of r.tg) if (!t.hit) E.scene.remove(t.m); r.tg = []; const n = 3;
      for (let i = 0; i < n; i++) { const a = (i - 1) * .42 + rnd(-.1, .1); const m = fitP(cfg.target || 'coco', 1.3); const y = 1.2 + rnd(0, 1.4); m.position.set(r.bx + Math.sin(a) * D, y, -.6 - Math.cos(a) * D); E.scene.add(m); r.tg.push({ a, m, y, hit: false, ph: rnd(0, 6) }); } },
    update(E, dt) {
      const t = E.t;
      for (const r of E.racers) {
        if (r.st === 'aim') { r.aim = Math.sin(t * 1.9 + r.ph) * .72;
          let go; if (r.me && !E.AUTO) go = tapped(E); else { const s0 = sk(E, r); const free = r.tg.filter(x => !x.hit); if (r.err == null) r.err = rnd(-1, 1) * (1.2 - Math.min(1.1, s0)) * .45; const tgt = free.length ? free[(r.thr + r.k) % free.length].a : 0; go = Math.abs(r.aim - tgt - r.err) < .05 || r.wt > 4; r.wt = (r.wt || 0) + dt; if (go) { r.err = null; r.wt = 0; } }
          if (go) { r.st = 'fly'; r.ft = 0; r.fa = r.aim; r.got = 0; r.bm.visible = true; if (r.me) Audio.sfxPlay('throw'); } }
        else if (r.st === 'fly') { const u0 = r.ft / FT; r.ft += dt; const u = r.ft / FT;
          if (u0 < .5 && u >= .5) { for (const g of r.tg) if (!g.hit && Math.abs(g.a - r.fa) < .15) { g.hit = true; r.got++; r.score++; this.fall.push({ m: g.m, vy: 2, vx: Math.sin(r.fa) * 2 }); E.burst(g.m.position.clone(), '#ffe27a', 12, 4, .5, .5); }
            if (r.got) { if (r.got > 1) r.score++; if (r.me) { Audio.sfxPlay('stars'); E.ui.toast(r.got > 1 ? `¡Doble! 🥥🥥 +${r.got + 1}` : '¡Coco! 🥥', '#ffe27a'); } else say(E, r, '¡Toma coco!'); }
            else if (r.me) E.ui.toast('¡Casi! Apunta a un coco', '#ffd0ec'); }
          if (u >= 1) { r.st = 'aim'; r.bm.visible = false; r.thr++; if (r.got) cheer(r); if (r.tg.every(g => g.hit) || r.thr % 3 === 0) this.targets(E, r); if (r.thr >= NT) { r.st = 'done'; r.ag.visible = false; } } }
        r.prog = clamp(r.thr / NT, 0, .99);
      }
      for (let i = this.fall.length - 1; i >= 0; i--) { const f = this.fall[i]; f.vy -= 14 * dt; f.m.position.y += f.vy * dt; f.m.position.x += f.vx * dt; f.m.rotation.z += 6 * dt; if (f.m.position.y < .45) { f.m.position.y = .45; f.vy = 0; f.vx = 0; this.fall.splice(i, 1); } }
      if (!this.done && (E.racers.every(r => r.st === 'done') || E.t > this.maxT - .5)) { this.done = true; scoreEnd(E, r => r.score + ' cocos'); }
      board(E, r => r.score + ' 🥥'); if (E.me.st !== 'done') info(`🪃 ${E.me.thr + 1}/${NT}<br>${E.me.score} 🥥`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { r.ag.rotation.y = -r.aim; r.obj.position.set(r.bx, hopY(r, dt), 0); r.obj.rotation.y = Math.PI - r.aim * .6; squash(r, dt);
        for (const g of r.tg) if (!g.hit) { g.m.position.y = g.y + Math.sin(t * 2 + g.ph) * .15; g.m.rotation.y = Math.sin(t + g.ph) * .4; }
        if (r.st === 'fly') { const u = r.ft / FT, s = Math.sin(u * Math.PI) * (D + .6), l = Math.sin(u * Math.PI * 2) * 1.8, a = r.fa; r.bm.position.set(r.bx + Math.sin(a) * s + Math.cos(a) * l, 1.4 + Math.sin(u * Math.PI) * .6, -.6 - Math.cos(a) * s + Math.sin(a) * l); r.bm.rotation.set(Math.PI / 2, 0, t * 18);
          if (Math.random() < .5) E.burst(r.bm.position.clone(), '#fff6a0', 1, 1, .3, .3, 0); } }
      const me = E.me, pr = port(); camTo(E, dt, v3(me.bx, pr ? 5.5 : 4, pr ? 7.5 : 5.5), v3(me.bx, 1.4, -D * .8), pr ? 74 : 58, 3); },
  });
}


// =====================================================================
//  TOPOS DE LAVA — dragoncitos asoman por 3 agujeros de lava: aplástalos con el martillo
//  (⬅ ● ➡ o tocando ese tercio de la pantalla). Los dorados valen 3. Tocar un agujero vacío no resta.
// =====================================================================
export function topos(cfg) {
  const SP = 7, HX = [-1.9, 0, 1.9], DUR = cfg.dur || 30;
  return base(cfg, { mode: 'puntos', maxT: DUR + 3,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 12, z1: -40, half: 24 } }); setButtons('lmr', { L: '🔨', M: '🔨', R: '🔨' });
      racers(E, .42); const rock = T(cfg.rock || '#5a3a48'), lava = GL(cfg.lavaC || '#ff7a2a', .9);
      E.racers.forEach((r, k) => { r.bx = lineX(k, SP); r.score = 0; r.nt = rnd(.6, 1.2); r.mole = null; r.ham = 0; r.hx = 0;
        const slab = mesh(new THREE.CylinderGeometry(3.2, 3.5, .5, 28), rock, sc, [r.bx, .0, -2.6]); outline(slab, '#2a1820', 1.02);
        r.holes = HX.map(x => { const g = new THREE.Group(); g.position.set(r.bx + x, .26, -2.6); sc.add(g); mesh(new THREE.TorusGeometry(.62, .16, 10, 24), T('#3a2430'), g, null, [Math.PI / 2, 0, 0]); mesh(new THREE.CircleGeometry(.55, 24), lava, g, [0, .01, 0], [-Math.PI / 2, 0, 0]);
          const m = fitP(cfg.mole || 'dragon', 1.1); m.position.y = -1.4; g.add(m); const gold = glowSprite('#ffe27a', 2.4, .9); gold.position.y = .6; gold.visible = false; m.add(gold); return { g, m, gold, up: 0, life: 0, st: 'down' }; });
        pm('volcancito', sc, [r.bx + rnd(-2, 2), 0, -7.5], 3.2, rnd(0, 6));
        r.hammer = new THREE.Group(); sc.add(r.hammer); mesh(CYL(), T('#c8904a'), r.hammer, [0, .6, 0], null, [.08, 1.2, .08]); const hd = mesh(CYL(), T('#ff6fae'), r.hammer, [0, 1.25, 0], [0, 0, Math.PI / 2], [.32, .8, .32]); outline(hd, '#7a2a50', 1.05); });
    },
    whack(E, r, i) { const h = r.holes[i]; r.ham = .25; r.hx = i;
      if (h.st === 'up' || h.st === 'rise') { const pts = h.goldOn ? 3 : 1; r.score += pts; h.st = 'hit'; h.life = .35; E.burst(h.g.position.clone().add(v3(0, .9, 0)), h.goldOn ? '#ffe27a' : '#ff9a4a', 14, 5, .5, .55); cheer(r, .35);
        if (r.me) { Audio.sfxPlay(h.goldOn ? 'stars' : 'squash'); E.shake = .15; if (h.goldOn) E.ui.toast('¡Dorado! +3 ✨', '#ffe27a'); } }
      else if (r.me) Audio.sfxPlay('click'); },
    update(E, dt) {
      const t = E.t, tl = Math.max(0, DUR - t), sp = 1 + t / DUR * .7;
      for (const r of E.racers) {
        if (t < DUR) { if ((r.nt -= dt * sp) <= 0) { r.nt = rnd(.55, 1.05); const free = r.holes.filter(h => h.st === 'down'); if (free.length) { const h = pick(free); h.st = 'rise'; h.up = 0; h.life = 1.25 / Math.sqrt(sp); h.goldOn = Math.random() < .14; h.gold.visible = h.goldOn; h.seen = 0; } } }
        for (const h of r.holes) { if (h.st === 'rise') { h.up = Math.min(1, h.up + dt * 6); if (h.up >= 1) h.st = 'up'; } else if (h.st === 'up') { if ((h.life -= dt) <= 0) h.st = 'fall'; } else if (h.st === 'fall' || h.st === 'hit') { h.up = Math.max(0, h.up - dt * (h.st === 'hit' ? 5 : 4)); if (h.up <= 0) { h.st = 'down'; h.gold.visible = false; } } }
        if (t >= DUR) continue;
        if (r.me && !E.AUTO) { for (const z of zones(E)) this.whack(E, r, z); }
        else { const s0 = sk(E, r); r.holes.forEach((h, i) => { if (h.st === 'up' || h.st === 'rise') { h.seen += dt; if (h.react == null) h.react = (.22 + (1.25 - Math.min(1.2, s0)) * .5) * rnd(.8, 1.3); if (h.seen > h.react) { h.react = null; if (Math.random() < .55 + .4 * Math.min(1, s0)) this.whack(E, r, i); else h.seen = -9; } } else h.react = null; }); }
        r.prog = clamp(t / DUR, 0, .99);
      }
      if (!this.done && t > DUR + .6) { this.done = true; scoreEnd(E, r => r.score + ' dragoncitos'); }
      board(E, r => r.score + ' 🐉'); if (t < DUR) info(`⏱️ ${tl.toFixed(0)} s<br>${E.me.score} 🐉`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { r.obj.position.set(r.bx + HX[r.hx] * .4, hopY(r, dt), .9); r.obj.rotation.y = Math.PI; squash(r, dt);
        for (const h of r.holes) { h.m.position.y = -1.4 + h.up * 1.35; h.m.rotation.y = Math.sin(t * 6 + h.g.position.x) * .4; h.m.scale.y = h.st === 'hit' ? h.m.scale.x * .5 : h.m.scale.x; if (Math.random() < .02) E.burst(h.g.position.clone().add(v3(0, .2, 0)), '#ff9a4a', 2, 1.5, .5, .25, 2); }
        r.ham = Math.max(0, r.ham - dt); const hp = r.holes[r.hx].g.position; r.hammer.position.set(hp.x + .4, .3, hp.z + .7); r.hammer.rotation.set(-(r.ham > 0 ? Math.sin(r.ham / .25 * Math.PI) * 1.3 : .2), 0, .2); }
      const me = E.me, pr = port(); camTo(E, dt, v3(me.bx, pr ? 7.5 : 5.2, pr ? 7 : 5.2), v3(me.bx, 0, -2.8), pr ? 66 : 56, 3); },
  });
}
export const NUEVOS2 = { bumeran, topos, cuenta, acecho };

// =====================================================================
//  CUENTA PECES — pasa un banco de peces (y alguna medusa que NO cuenta). Cuenta los peces y
//  elige el número correcto entre tres. Acertar el primero vale más. 6 rondas.
// =====================================================================
export function cuenta(cfg) {
  const NR = 6, SHOW = 4.6, ASK = 5;
  return base(cfg, { mode: 'puntos', maxT: NR * (SHOW + ASK + 1.6) + 4,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: 14 } }); setButtons(null);
      racers(E, .42); E.racers.forEach((r, k) => { r.bx = (k - 2.5) * 1.5; r.score = 0; });
      pm(cfg.big || 'ballena', sc, [-9, 0, -16], 5, .6); pm('coral', sc, [7, 0, -9], 2.4); pm('coral', sc, [-6, 0, -7], 1.8); pm('altavoz', sc, [9, 0, -15], 3, -.5);
      this.pool = []; for (let i = 0; i < 14; i++) { const m = fitP(i < 11 ? (cfg.item || 'pez') : (cfg.decoy || 'medusa'), 1.5); const gw = glowSprite(i < 11 ? '#ffe27a' : '#ff9cf0', 3.2, .55); m.add(gw); m.visible = false; sc.add(m); this.pool.push({ m, fish: i < 11 }); }
      this.round = 0; this.newRound(E);
    },
    newRound(E) { this.ph = 'show'; this.pt = 0; const n = 3 + Math.min(6, this.round + Math.floor(rnd(0, 3))), d = this.round >= 2 ? Math.floor(rnd(1, 3)) : 0; this.n = n;
      this.act = []; let fi = 0, di = 0; const list = []; for (let i = 0; i < n; i++) list.push(this.pool[fi++]); for (let i = 0; i < d; i++) list.push(this.pool[11 + di++]);
      list.sort(() => Math.random() - .5).forEach((p, i) => { p.x0 = -16 - i * rnd(1.6, 2.6); p.y = rnd(2, 4.6); p.z = rnd(-3.5, -1.5); p.m.visible = true; this.act.push(p); });
      for (const r of E.racers) { r.ans = null; r.at = 0; r.ok = false; r.react = null; }
      const opts = new Set([n]); while (opts.size < 3) opts.add(Math.max(1, n + pick([-2, -1, 1, 2]))); this.opts = [...opts].sort((a, b) => a - b); this.first = null; },
    answer(E, r, i) { if (r.ans != null || this.ph !== 'ask') return; r.ans = this.opts[i]; r.at = this.pt; r.ok = r.ans === this.n;
      if (r.ok) { const pts = this.first ? 2 : 3; if (!this.first) this.first = r; r.score += pts; cheer(r); if (r.me) { Audio.sfxPlay('stars'); E.ui.toast(`¡Bien! Eran ${this.n} 🐟 +${pts}`, '#7ee3c4'); } else say(E, r, '¡Lo sabía!'); }
      else if (r.me) { Audio.sfxPlay('boing'); E.ui.toast(`¡Uy! Eran ${this.n} 🐟`, '#ffd0ec'); } },
    update(E, dt) {
      this.pt += dt;
      if (this.ph === 'show') { const spd = 5.2 + this.round * .3; for (const p of this.act) p.cx = p.x0 + this.pt * spd;
        if (this.pt > SHOW + .2 && this.act.every(p => p.cx > 14)) { this.ph = 'ask'; this.pt = 0; for (const p of this.act) p.m.visible = false; setButtons('lmr', { L: String(this.opts[0]), M: String(this.opts[1]), R: String(this.opts[2]) }); if (E.me) E.ui.toast('¿Cuántos PECES has visto? 🐟', '#bff4ff'); } }
      else if (this.ph === 'ask') {
        for (const r of E.racers) { if (r.ans != null) continue; if (r.me && !E.AUTO) { const z = zones(E); if (z.length) this.answer(E, r, z[0]); }
          else { const s0 = sk(E, r); if (r.react == null) r.react = rnd(.7, 2.2) * (1.35 - Math.min(1.2, s0)); if (this.pt > r.react) { const ok = Math.random() < .55 + .4 * Math.min(1, s0); this.answer(E, r, ok ? this.opts.indexOf(this.n) : pick([0, 1, 2].filter(i => this.opts[i] !== this.n))); } } }
        if (this.pt > ASK || E.racers.every(r => r.ans != null)) { this.ph = 'rev'; this.pt = 0; setButtons(null); if (E.me.ans == null) E.ui.toast(`¡Eran ${this.n} peces! 🐟`, '#bff4ff'); } }
      else if (this.ph === 'rev' && this.pt > 1.6) { this.round++; if (this.round >= NR) { this.ph = 'end'; } else this.newRound(E); }
      for (const r of E.racers) r.prog = clamp(this.round / NR, 0, .99);
      if (!this.done && this.ph === 'end') { this.done = true; scoreEnd(E, r => r.score + ' pts'); }
      board(E, r => r.score + ' pts'); info(`🐟 Ronda ${Math.min(NR, this.round + 1)}/${NR}<br>${E.me.score} pts`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      if (this.ph === 'show') for (const p of this.act) { p.m.position.set(p.cx, p.y + Math.sin(t * 3 + p.x0) * .3, p.z); p.m.rotation.set(0, Math.PI / 2, Math.sin(t * 8 + p.x0) * .15); }
      E.racers.forEach(r => { r.obj.position.set(r.bx, hopY(r, dt), 2); r.obj.rotation.y = Math.PI; squash(r, dt); });
      const pr = port(); camTo(E, dt, v3(0, pr ? 2.2 : 2.2, pr ? 13 : 8.5), v3(0, pr ? 4.4 : 3, -5), pr ? 70 : 60, 3); },
  });
}

// =====================================================================
//  ¡QUE NO TE VEA! — mantén pulsado para que tu caracol avance mientras el mono gigante mira
//  hacia otro lado. Cuando se gira (¡ojos rojos!), suelta. Si te pilla moviéndote, retrocedes.
// =====================================================================
export function acecho(cfg) {
  const L = cfg.L || 46, SP = 2.6, V = 5.2;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 60,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 14, z1: -L - 20, half: 9 } }); setButtons('m', { M: cfg.btn || '🐌' });
      const road = mesh(new THREE.PlaneGeometry(SP * 6 + 1, L + 8), T(cfg.road || '#a8d870', { rim: 0 }), sc, [0, .01, -L / 2], [-Math.PI / 2, 0, 0]);
      for (let z = 0; z <= L; z += 6) for (const s of [-1, 1]) pm(pick(cfg.side || ['seta', 'hongo', 'arbol']), sc, [s * (SP * 3 + 1.8 + rnd(0, 2)), 0, -z], rnd(1.4, 2.6), rnd(0, 6));
      const meta = mesh(new THREE.PlaneGeometry(SP * 6, 1.2), GL('#ffe27a', .5), sc, [0, .02, -L], [-Math.PI / 2, 0, 0]);
      this.boss = new THREE.Group(); this.boss.position.set(0, 0, -L - 6); sc.add(this.boss); const b = fitP(cfg.boss || 'mono', 6); this.boss.add(b);
      this.eyes = [-1, 1].map(s => { const e = glowSprite('#ff3a3a', 2.4, .95); e.position.set(s * 1.1, 4, 3.4); this.boss.add(e); return e; });
      racers(E, .45); E.racers.forEach((r, k) => { r.x = lineX(k, SP); r.z = 0; r.mv = false; r.stun = 0; r.score = 0; r.done = false;
        r.shell = fitP(cfg.ride || 'caracol', .9); r.shell.position.set(r.x, 0, 0); sc.add(r.shell); });
      this.st = 'green'; this.tt = rnd(2.2, 3.4); this.rot = Math.PI; this.order = 0;
    },
    update(E, dt) {
      this.tt -= dt; const look = this.st === 'red' && this.tt < this.redT - .2;
      if (this.tt <= 0) { if (this.st === 'green') { this.st = 'warn'; this.tt = .7; } else if (this.st === 'warn') { this.st = 'red'; this.tt = this.redT = rnd(1.3, 2.1); if (!E.me.done) Audio.sfxPlay('tick'); } else { this.st = 'green'; this.tt = rnd(1.4, 3.4); } }
      for (const r of E.racers) { if (r.done) continue;
        if (r.stun > 0) { r.stun -= dt; r.mv = false; continue; }
        if (r.me && !E.AUTO) r.mv = holding(E);
        else { const s0 = sk(E, r); if (this.st === 'green') { r.rd = null; r.mv = true; } else { if (r.rd == null) r.rd = .15 + (1.25 - Math.min(1.2, s0)) * rnd(.2, .75); const since = this.st === 'warn' ? .7 - this.tt : .7 + (this.redT - this.tt); r.mv = since < r.rd; } }
        if (r.mv) { r.z += V * dt; if (look) { r.z = Math.max(0, r.z - 6); r.stun = 1.1; E.burst(v3(r.x, 1, -r.z), '#ff9cc8', 12, 4, .5, .5); if (r.me) { Audio.sfxPlay('boing'); E.ui.toast('¡Te ha visto! 🙈 Atrás…', '#ffd0ec'); E.shake = .2; } else say(E, r, '¡Ups!'); } }
        if (r.z >= L) { r.z = L; r.done = true; r.score = 1000 - this.order++; cheer(r, .8); if (r.me) { Audio.sfxPlay('fanfare'); E.ui.toast('¡Llegaste! 🏁', '#ffe27a'); } }
        if (!r.done) r.score = r.z; r.prog = clamp(r.z / L, 0, .99); }
      if (!this.done && (this.order >= 3 || E.me.done && this.order >= 1 && E.racers.filter(r => r.done).length >= 2 || E.t > this.maxT - .5)) { this.done = true; scoreEnd(E, r => r.done ? '¡Meta!' : `${r.z.toFixed(0)} m`); }
      info(`${this.st === 'green' ? '🟢 ¡Avanza!' : this.st === 'warn' ? '🟡 ¡Se gira!' : '🔴 ¡Quieto!'}<br>${Math.max(0, L - E.me.z).toFixed(0)} m`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      const tgt = this.st === 'green' ? Math.PI : 0; this.rot = lerp(this.rot, tgt, Math.min(1, dt * (this.st === 'warn' ? 3 : 8))); this.boss.rotation.y = this.rot + (this.st === 'warn' ? Math.sin(t * 30) * .05 : 0);
      for (const e of this.eyes) e.visible = this.st === 'red';
      for (const r of E.racers) { const w = r.mv ? Math.sin(t * 10 + r.k) * .06 : 0; r.shell.position.set(r.x, 0, -r.z); r.shell.rotation.y = Math.PI + w; r.shell.scale.y = r.shell.scale.x * (1 + (r.mv ? Math.sin(t * 12) * .06 : 0));
        r.obj.position.set(r.x, .62 + hopY(r, dt) + (r.mv ? Math.abs(Math.sin(t * 10)) * .05 : 0), -r.z - .1); r.obj.rotation.y = Math.PI; squash(r, dt); r.obj.userData.pivot.rotation.z = r.stun > 0 ? Math.sin(t * 20) * .3 : 0; }
      const me = E.me, pr = port(); camTo(E, dt, v3(me.x * .8, pr ? 6.5 : 4.5, -me.z + (pr ? 11 : 8)), v3(me.x * .6, 1.5, -me.z - 10), pr ? 70 : 58, 3); },
  });
}
