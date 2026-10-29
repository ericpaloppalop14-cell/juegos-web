// ======================================================================
//  MOCHI PARTY · OLIMPIADAS — mecánicas nuevas (revisión 3, fase B): ninguna se parece a otra
//  bumerán · topos de lava · cuenta peces · ¡que no te vea! · bola caliente · salto de esquí ·
//  moldes de lava · ¿cuál es distinto? · lianas · para el reloj
// ======================================================================
import { THREE, camera, toon, outline, mesh, glowSprite, rnd, clamp, lerp, pick, Audio } from '../core3d.js?v=o43';
import { buildWorld, prop, MUNDOS, SPH, SPHL, CYL, BOX, TOR } from './mundos.js?v=o43';
import { mergedGeo } from './decor.js?v=o43';
import { jungle } from './selva-lianas.js?v=o43';
import { T, GL, v3, $, sk, info, setButtons, racers, squash, say, scoreFinish, base } from './tipos.js?v=o43';

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
  return base(cfg, { mode: 'puntos', doneSt: 'done', maxT: cfg.maxT || 45,
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
    targets(E, r) { for (const t of r.tg) { if (!t.hit) E.scene.remove(t.m); E.scene.remove(t.post); } r.tg = []; const n = 3;
      for (let i = 0; i < n; i++) { const a = (i - 1) * .42 + rnd(-.1, .1); const m = fitP(cfg.target || 'coco', 1.3); const y = 1.3 + rnd(0, 1.3), x = r.bx + Math.sin(a) * D, z = -.6 - Math.cos(a) * D; m.position.set(x, y, z); E.scene.add(m);
        const post = new THREE.Group(); mesh(CYL(), T('#a0703a'), post, [0, (y - .55) / 2, 0], null, [.09, y - .55, .09]); mesh(new THREE.CylinderGeometry(.42, .3, .14, 14), T('#c8925a'), post, [0, y - .55, 0]); post.position.set(x, 0, z); E.scene.add(post);
        r.tg.push({ a, m, y, post, hit: false, ph: rnd(0, 6) }); } },
    update(E, dt) {
      const t = E.t;
      for (const r of E.racers) {
        if (r.st === 'aim') { r.aim = Math.sin(t * 1.9 + r.ph) * .72;
          let go; if (r.me && !E.AUTO) go = tapped(E); else { const s0 = sk(E, r); const free = r.tg.filter(x => !x.hit); if (r.err == null) r.err = rnd(-1, 1) * (1.25 - Math.min(1.1, s0)) * .6; const tgt = free.length ? free[(r.thr + r.k) % free.length].a : 0; go = Math.abs(r.aim - tgt - r.err) < .05 || r.wt > 4; r.wt = (r.wt || 0) + dt; if (go) { r.err = null; r.wt = 0; } }
          if (go) { r.throwT = .35; r.st = 'fly'; r.ft = 0; r.fa = r.aim; r.got = 0; r.bm.visible = true; if (r.me) Audio.sfxPlay('throw'); } }
        else if (r.st === 'fly') { const u0 = r.ft / FT; r.ft += dt; const u = r.ft / FT;
          const P = this.bpos(r, Math.min(1, u)), V = P.clone().sub(this.bpos(r, Math.max(0, u0)));
          for (const g of r.tg) if (!g.hit && Math.hypot(g.m.position.x - P.x, g.m.position.z - P.z) < .85 && Math.abs(g.m.position.y - P.y) < 1.5) { // colisión real: impacto, salto del coco y rebotes
            g.hit = true; r.got++; r.score++; const k = 1 / Math.max(dt, 1e-3) * .35; this.fall.push({ m: g.m, vx: V.x * k + rnd(-1, 1), vy: 4.5 + rnd(0, 2), vz: V.z * k + rnd(-1, 1), sp: rnd(8, 14), b: 0, t: 0 });
            E.burst(g.m.position.clone(), '#8a5a2a', 10, 5, .55, .35, -9); E.burst(g.m.position.clone(), '#ffffff', 8, 3.5, .5, .3, -6); E.burst(g.m.position.clone(), '#ffe27a', 6, 2.5, .35, .5, 0);
            if (r.me) { Audio.sfxPlay('kick'); setTimeout(() => Audio.sfxPlay('pop'), 70); E.shake = .22; E.ui.toast(r.got > 1 ? `¡Doble! 🥥🥥 +${r.got + 1}` : '¡Coco! 🥥', '#ffe27a'); } else if (Math.random() < .4) say(E, r, '¡Toma coco!');
            if (r.got === 2) r.score++; }
          if (u >= 1 && !r.got && r.me) E.ui.toast('¡Casi! Apunta a un coco', '#ffd0ec');
          if (u >= 1) { r.catchT = .5; if (r.me) Audio.sfxPlay('got'); r.st = 'aim'; r.bm.visible = false; r.thr++; if (r.got) cheer(r); if (r.tg.every(g => g.hit) || r.thr % 3 === 0) this.targets(E, r); if (r.thr >= NT) { r.st = 'done'; r.ag.visible = false; } } }
        r.prog = clamp(r.thr / NT, 0, .99);
      }
      for (let i = this.fall.length - 1; i >= 0; i--) { const f = this.fall[i], m = f.m; f.t += dt; f.vy -= 16 * dt; m.position.x += f.vx * dt; m.position.y += f.vy * dt; m.position.z += f.vz * dt; m.rotation.z += f.sp * dt; m.rotation.x += f.sp * .6 * dt;
        if (m.position.y < .45) { m.position.y = .45; if (f.vy < -2.5) { f.vy = -f.vy * .45; f.vx *= .7; f.vz *= .7; f.sp *= .7; f.b++; E.burst(m.position.clone().setY(.1), '#f0dca0', 6, 2.2, .4, .3, -6); if (f.b === 1 && E.me.tg && E.me.tg.some(g => g.m === m)) Audio.sfxPlay('land'); } else { f.vy = 0; f.vx *= .9; f.vz *= .9; f.sp *= .9; } }
        if (f.t > 3.5) { m.scale.multiplyScalar(.9); if (f.t > 4.2) { E.scene.remove(m); this.fall.splice(i, 1); } } }
      if (!this.done && (E.racers.every(r => r.st === 'done') || E.t > this.maxT - .5)) { this.done = true; scoreEnd(E, r => r.score + ' cocos'); }
      board(E, r => r.score + ' 🥥'); if (E.me.st !== 'done') info(`🪃 ${E.me.thr + 1}/${NT}<br>${E.me.score} 🥥`);
    },
    bpos(r, u) { const s = Math.sin(u * Math.PI) * (D + .6), l = Math.sin(u * Math.PI * 2) * 1.8, a = r.fa; return v3(r.bx + Math.sin(a) * s + Math.cos(a) * l, 1.4 + Math.sin(u * Math.PI) * .6 + .4, -.6 - Math.cos(a) * s + Math.sin(a) * l); },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { r.ag.rotation.y = -r.aim; r.obj.position.set(r.bx, hopY(r, dt), 0); r.obj.rotation.y = Math.PI - r.aim * .6; squash(r, dt);
        { const pv = r.obj.userData.pivot; r.throwT = Math.max(0, (r.throwT || 0) - dt); r.catchT = Math.max(0, (r.catchT || 0) - dt); pv.rotation.x = r.throwT > 0 ? -Math.sin(r.throwT / .35 * Math.PI) * .45 : r.st === 'aim' ? Math.sin(t * 3 + r.ph) * .05 : 0; pv.rotation.z = r.st === 'aim' ? Math.sin(t * 1.9 + r.ph) * .08 : 0; if (r.catchT > 0) pv.position.y = Math.sin(r.catchT / .5 * Math.PI) * .35; else pv.position.y = 0; r.expr = r.catchT > 0 && r.got ? 'happy' : r.expr; }
        for (const g of r.tg) if (!g.hit) { g.m.position.y = g.y + Math.sin(t * 2 + g.ph) * .15; g.m.rotation.y = Math.sin(t + g.ph) * .4; }
        if (r.st === 'fly') { r.bm.position.copy(this.bpos(r, Math.min(1, r.ft / FT))); r.bm.rotation.set(Math.PI / 2, 0, t * 18);
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
export const NUEVOS2 = { bumeran, topos, cuenta, acecho, caliente, esqui, moldes, distinto, lianas, parareloj };

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

// =====================================================================
//  BOLA CALIENTE — una bola de fuego pasa de mano en mano alrededor del cráter. ¡Pásala (⬅ o ➡)
//  antes de que explote! A quien le explote sale del corro (y se va a animar desde fuera).
// =====================================================================
export function caliente(cfg) {
  const R = 4.6;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 75,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: 9 } }); setButtons('lr', { L: '⬅ 🔥', R: '🔥 ➡' });
      const rim = mesh(new THREE.CylinderGeometry(R + 1.6, R + 2.2, .5, 40), T(cfg.floor || '#6a4a5a'), sc, [0, -.05, 0]); outline(rim, '#2a1820', 1.01);
      mesh(new THREE.CircleGeometry(R - 1.2, 36), GL(cfg.lavaC || '#ff7a2a', 1), sc, [0, .22, 0], [-Math.PI / 2, 0, 0]); this.glow = glowSprite('#ff6a2a', 9, .5); this.glow.position.y = 1; sc.add(this.glow);
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; pm(i % 3 ? 'roca' : 'volcancito', sc, [Math.cos(a) * (R + 6), 0, Math.sin(a) * (R + 6)], i % 3 ? 1.1 : 2, a); }
      racers(E, .5); const n = E.racers.length; E.racers.forEach((r, k) => { r.a = k / n * 6.28 + Math.PI / 2; r.out = false; r.score = 0; r.hold = 0; });
      this.ball = fitP('bolafuego', 1.5); sc.add(this.ball); this.outN = 0; this.newBall(E);
    },
    alive(E) { return E.racers.filter(r => !r.out); },
    newBall(E) { const al = this.alive(E); this.holder = pick(al.filter(r => !r.me).concat(al.length < 3 ? al : [])) || al[0]; this.fuse = E.me.out ? rnd(1.6, 3) : rnd(5, 8.5) * (al.length > 3 ? 1 : .8); this.fly = 0; this.from = null; this.holder.hold = 0; },
    pos(r) { return v3(Math.cos(r.a) * (r.out ? R + 3.2 : R), 0, Math.sin(r.a) * (r.out ? R + 3.2 : R)); },
    pass(E, r, dir) { const al = E.racers.filter(x => !x.out); const i = al.indexOf(r); const to = al[(i + (dir > 0 ? 1 : al.length - 1)) % al.length]; this.from = r; this.holder = to; this.fly = .38; to.hold = 0; if (r.me) Audio.sfxPlay('throw'); },
    update(E, dt) {
      if (this.done) return;
      this.fuse -= dt; const h = this.holder; this.fly = Math.max(0, this.fly - dt);
      if (this.fly <= 0) { h.hold += dt;
        if (h.me && !E.AUTO) { const s = E.side.concat(E.taps.map(x => x < innerWidth / 2 ? 'L' : 'R')); if (s.length && h.hold > .12) this.pass(E, h, s[0] === 'R' ? -1 : 1); /* el siguiente del corro queda a tu izquierda */ }
        else { const s0 = sk(E, h); if (h.wait == null) h.wait = rnd(.35, 1.1) * (1.3 - Math.min(1.2, s0)) + .15; if (h.hold > h.wait) { h.wait = null; this.pass(E, h, Math.random() < .5 ? 1 : -1); } } }
      if (this.fuse <= 0) { const v = this.holder; v.out = true; v.score = this.outN++; v.expr = 'squash'; E.burst(this.pos(v).add(v3(0, 1, 0)), '#ffb030', 30, 8, .8, .8); E.shake = .4; Audio.sfxPlay('hit');
        if (v.me) E.ui.toast('¡PUM! 💥 Te toca animar desde fuera', '#ffd0ec'); else say(E, v, '¡Uy, quema!');
        const al = this.alive(E); if (al.length <= 1) { let s = 100; for (const r of al) r.score = s--; for (const r of al) cheer(r, .8); this.done = true; scoreEnd(E, r => r.out ? `fuera (${r.score + 1}º en salir)` : '¡Campeón!'); return; }
        this.newBall(E); if (al.includes(E.me)) E.ui.toast('¡Nueva bola! 🔥', '#ffe27a'); }
      for (const r of E.racers) r.prog = clamp(this.outN / (E.racers.length - 1), 0, .99);
      info(`🔥 Quedan ${this.alive(E).length}<br>${this.holder.me ? '<b>¡PÁSALA!</b>' : ''}`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera); this.glow.material.opacity = .4 + Math.sin(t * 3) * .1;
      for (const r of E.racers) { const p = this.pos(r); r.obj.position.set(p.x, r.out ? Math.abs(Math.sin(t * 6 + r.k)) * .4 : hopY(r, dt) + (r === this.holder && this.fly <= 0 ? Math.abs(Math.sin(t * 14)) * .12 : 0), p.z); r.obj.rotation.y = Math.atan2(-p.x, -p.z); squash(r, dt); }
      const hp = this.pos(this.holder).add(v3(0, 1.5, 0)); let bp = hp; if (this.fly > 0 && this.from) { const k = 1 - this.fly / .38, fp = this.pos(this.from).add(v3(0, 1.5, 0)); bp = fp.lerp(hp, k); bp.y += Math.sin(k * Math.PI) * 1.6; }
      this.ball.position.copy(bp); const hot = clamp(1 - this.fuse / 6, 0, 1); this.ball.scale.setScalar(this.ball.userData.s0 || (this.ball.userData.s0 = this.ball.scale.x)); this.ball.scale.multiplyScalar(1 + Math.sin(t * (6 + hot * 20)) * .08 * (1 + hot * 2)); this.ball.rotation.y = t * 4;
      if (Math.random() < .3 + hot * .5) E.burst(bp.clone(), '#ffb030', 1, 1.5, .4, .4, 2);
      const pr = port(); camTo(E, dt, v3(0, pr ? 15 : 9.5, pr ? 13 : 9.5), v3(0, 0, 0), pr ? 62 : 55, 3); },
  });
}

// =====================================================================
//  SALTO DE ESQUÍ (rediseño o43) — control de UN solo toque:
//   1) Bajas SOLO por la rampa. Toca cuando el marcador llegue a la zona VERDE (borde de la rampa):
//      cuanto más cerca del punto dorado, más lejos vuelas (PERFECTO / ¡BIEN! / PRONTO / TARDE).
//   2) En el aire, MANTÉN pulsado para planear (opcional); suelta para aterrizar. El aterrizaje siempre perdona.
//  3 saltos, se suman los metros. Línea dorada = récord de la pista; una línea de color por rival.
// =====================================================================
export function esqui(cfg) {
  const SP = 3.2, NR = 3, SL = 2.8, RZ = 16, RH = 7.5, EY = 1.4, WR = 2.3, LEN = 175, HALF = 15;
  const ANG = Math.atan2(RH - EY, RZ), G = 11, GG = 3.2, STAM = 1.7, REC0 = 85, CEN = SL - .2, LATE = SL + .15;
  const surf = d => RH - (RH - EY) * Math.min(1, Math.max(0, d) / RZ);
  const dAt = ts => RZ * Math.pow(Math.min(1, Math.max(0, ts) / SL), 1.5);
  const qOf = off => { const a = Math.abs(off); return a <= .2 ? 1 : a <= .55 ? 1 - (a - .2) / .35 * .35 : Math.max(.12, .65 - (a - .55) * .45); };
  const sig = s => clamp(1 - .6 * s, .04, 1);          // desvío (s) del toque de la IA según su habilidad
  const glideOf = s => clamp(.08 + s * .9 + rnd(-.2, .2), 0, 1) * STAM; // segundos de planeo que usa la IA
  const lab = (q, off, forced) => forced ? ['TARDE', '#ffb0b0'] : q >= .99 ? ['¡PERFECTO!', '#ffe27a'] : Math.abs(off) <= .55 ? ['¡BIEN!', '#9bffd6'] : off < 0 ? ['PRONTO', '#ffd0ec'] : ['TARDE', '#ffb0b0'];
  const sprite = (txt, col, w, h, big) => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * h / w); const x = cv.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.92)'; x.strokeStyle = col; x.lineWidth = 10; const rr = 26; x.beginPath(); x.roundRect(6, 6, cv.width - 12, cv.height - 12, rr); x.fill(); x.stroke();
    x.fillStyle = col; x.font = `700 ${big || 64}px Fredoka, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, cv.width / 2, cv.height / 2 + 4);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(w, h, 1); return s; };
  const setSprite = (s, txt, col, big) => { const cv = s.material.map.image, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.fillStyle = 'rgba(255,255,255,.92)'; x.strokeStyle = col; x.lineWidth = 10; x.beginPath(); x.roundRect(6, 6, cv.width - 12, cv.height - 12, 26); x.fill(); x.stroke();
    x.fillStyle = col; x.font = `700 ${big || 54}px Fredoka, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, cv.width / 2, cv.height / 2 + 4); s.material.map.needsUpdate = true; };
  const slopeRot = -Math.PI / 2 - ANG;
  const css = `#esqD{position:absolute;left:50%;transform:translateX(-50%);top:calc(92px + env(safe-area-inset-top));text-align:center;font-family:Fredoka,sans-serif;font-weight:700;color:#fff;line-height:1;text-shadow:0 3px 0 #6a3f9a,0 0 12px rgba(255,255,255,.6);-webkit-text-stroke:1.2px #6a3f9a;pointer-events:none}
#esqD b{display:block;font-size:44px}#esqD small{display:block;font-size:13px;margin-top:3px;-webkit-text-stroke:0;color:#fff7c0;text-shadow:0 2px 0 #6a3f9a}
#esqB{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(122px + env(safe-area-inset-bottom));width:min(88vw,430px);text-align:center;font-family:Fredoka,sans-serif;pointer-events:none;opacity:0;transition:opacity .2s}
#esqB.on{opacity:1}#esqBig{font-size:32px;font-weight:700;color:#fff;-webkit-text-stroke:1.5px #3a8f6a;text-shadow:0 4px 0 #3a8f6a;height:42px;line-height:42px;white-space:nowrap}
#esqBig.now{color:#fff7a0;-webkit-text-stroke:1.5px #c0508a;text-shadow:0 4px 0 #c0508a;animation:esqP .28s ease-in-out infinite alternate}
@keyframes esqP{to{transform:scale(1.18)}}
#esqT{position:relative;height:34px;border-radius:18px;background:linear-gradient(#cfe6ff,#9fc9f2);border:4px solid #fff;box-shadow:0 4px 0 rgba(90,70,150,.35),0 8px 18px rgba(90,70,150,.25);overflow:hidden}
#esqG{position:absolute;top:0;bottom:0;background:linear-gradient(#7ef2b0,#2fcf7a)}#esqGold{position:absolute;top:0;bottom:0;background:linear-gradient(#fff3a0,#ffc93a);box-shadow:0 0 12px #ffe27a}
#esqZ{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#0f5a38;letter-spacing:.2px;white-space:nowrap}
#esqM{position:absolute;top:50%;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#ff8fc4);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)}
#esqW{height:34px;border-radius:18px;background:linear-gradient(#cfe6ff,#9fc9f2);border:4px solid #fff;box-shadow:0 4px 0 rgba(90,70,150,.35);overflow:hidden;position:relative;display:none}
#esqWf{position:absolute;left:0;top:0;bottom:0;width:100%;background:linear-gradient(#9fe8ff,#4fb8f0)}#esqWt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#14507a}
#esqJ{position:absolute;left:50%;top:36%;transform:translate(-50%,-50%) scale(.3);font-family:Fredoka,sans-serif;font-size:58px;font-weight:700;color:#fff;-webkit-text-stroke:3px #c0508a;text-shadow:0 6px 0 #c0508a,0 0 18px rgba(255,255,255,.7);opacity:0;white-space:nowrap;text-align:center;pointer-events:none;line-height:1}
#esqJ small{display:block;font-size:26px;margin-top:6px;-webkit-text-stroke:2px #c0508a}
#esqJ.pop{animation:esqJ 1.5s ease-out forwards}@keyframes esqJ{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}26%{transform:translate(-50%,-50%) scale(1)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%) scale(1)}}
#esqTut{position:absolute;left:50%;top:41%;transform:translate(-50%,-50%);width:min(88vw,400px);background:linear-gradient(#fff,#ffeef8);border:4px solid #fff;border-radius:24px;box-shadow:0 8px 24px rgba(150,60,140,.3);padding:10px 14px 12px;text-align:center;font-family:Fredoka,sans-serif;color:#6a3f9a;pointer-events:none;transition:opacity .4s}
#esqTut .h{font-size:20px;font-weight:700;color:#e0609f;line-height:1.1}#esqTut .r{font-size:15px;font-weight:600;line-height:1.2;margin-top:7px;text-align:left;display:flex;gap:8px;align-items:center}
#esqTut .n{flex:none;width:26px;height:26px;border-radius:50%;background:#ff7eb6;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center}#esqTut .g{color:#16a060}
#esqTut .mini{display:flex;align-items:center;gap:8px;margin:6px 0 0 34px}#esqTut .bar{position:relative;flex:1;height:24px;border-radius:14px;background:linear-gradient(#cfe6ff,#9fc9f2);border:3px solid #fff;box-shadow:0 2px 0 rgba(90,70,150,.3)}
#esqTut .bar i{position:absolute;right:0;top:0;bottom:0;width:34%;border-radius:0 11px 11px 0;background:linear-gradient(#7ef2b0,#2fcf7a)}
#esqTut .bar b{position:absolute;top:50%;left:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#ff8fc4);border:2px solid #fff;animation:esqDot 1.6s linear infinite}
@keyframes esqDot{0%{left:2%}85%,100%{left:92%}}
#esqTut .hand{flex:none;font-size:32px;line-height:1;animation:esqHand 1.6s ease-in-out infinite;transform-origin:50% 0}
@keyframes esqHand{0%,60%{transform:translateY(8px) scale(1);opacity:.35}78%{transform:translateY(0) scale(.82);opacity:1}88%{transform:translateY(0) scale(1.06);opacity:1}100%{transform:translateY(8px) scale(1);opacity:.35}}
#esqTut .hold{display:inline-block;animation:esqHold 1.2s ease-in-out infinite}@keyframes esqHold{50%{transform:translateY(-4px) scale(1.12)}}
@media (orientation:landscape) and (max-height:500px){#esqD b{font-size:32px}#esqD{top:calc(72px + env(safe-area-inset-top))}#esqD small{font-size:12px;margin-top:1px}#esqD small+small{display:none}#esqB{left:auto;transform:none;right:calc(50% + 62px);bottom:calc(20px + env(safe-area-inset-bottom));width:min(40vw,350px)}#esqBig{font-size:24px;height:30px;line-height:30px}#esqT,#esqW{height:28px}#esqJ{font-size:44px;top:41%}#esqTut{top:46%;width:min(66vw,420px);padding:7px 12px 9px}#esqTut .h{font-size:17px}#esqTut .r{font-size:14px;margin-top:4px}#esqTut .bar{height:18px}#esqTut .mini{margin-top:3px}#esqTut .hand{font-size:26px}}`;
  return Object.assign(base(cfg, { mode: 'puntos', maxT: cfg.maxT || 75,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 14, z1: -LEN - 20, half: 17 } }); setButtons('m', { M: cfg.btn || '⛷️' });
      // ---------- HUD propio ----------
      const hud = $('hud'); const st = document.createElement('style'); st.id = 'esqCss'; st.textContent = css; document.head.appendChild(st);
      const zs = (SL - .9) / LATE * 100, zg = (SL - .4) / LATE * 100, zw = (SL / LATE) * 100;
      const h = document.createElement('div'); h.id = 'esqHud'; h.innerHTML = `<div id="esqD"><b>0 m</b><small></small><small></small></div><div id="esqJ"></div>
        <div id="esqB"><div id="esqBig"></div><div id="esqT"><div id="esqG" style="left:${zs}%;right:0"></div><div id="esqGold" style="left:${zg}%;width:${zw - zg}%"></div><div id="esqZ" style="left:${zs}%;right:0">SALTA AQUÍ</div><div id="esqM" style="left:0"></div></div><div id="esqW"><div id="esqWf"></div><div id="esqWt">🪂 MANTÉN PULSADO PARA PLANEAR</div></div></div>
        <div id="esqTut"><div class="h">⛷️ ¡Llega lo más lejos!</div><div class="r"><span class="n">1</span><span>Toca cuando la bolita llegue a la zona <b class="g">VERDE</b></span></div><div class="mini"><div class="bar"><i></i><b></b></div><span class="hand">👆</span></div><div class="r"><span class="n">2</span><span>En el aire, <b>mantén pulsado</b> <span class="hold">🪂</span> para planear</span></div></div>`;
      hud.appendChild(h); this.h = h; this.q = s => h.querySelector(s); this.eD = this.q('#esqD b'); this.eDs = this.q('#esqD small'); this.eDs2 = this.q('#esqD small+small'); this.eB = this.q('#esqB'); this.eBig = this.q('#esqBig'); this.eM = this.q('#esqM'); this.eT = this.q('#esqT'); this.eW = this.q('#esqW'); this.eWf = this.q('#esqWf'); this.eJ = this.q('#esqJ'); this.eTut = this.q('#esqTut');
      // ---------- escenario ----------
      const snow = T(cfg.ramp || '#f6fbff'), blue = T('#8fc8ff'), tex = new THREE.Shape(); tex.moveTo(0, 0); tex.lineTo(0, RH); tex.lineTo(RZ, EY); tex.lineTo(RZ, 0); tex.closePath();
      const wedge = new THREE.ExtrudeGeometry(tex, { depth: WR, bevelEnabled: false }); wedge.translate(0, 0, -WR / 2); wedge.rotateY(Math.PI / 2);
      const len = Math.hypot(RZ, RH - EY), gtex = (a, b, txt, c1, c2, tc) => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
        x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 3; i++) { const y = 28 + i * 74; x.beginPath(); x.moveTo(30, y); x.lineTo(128, y + 40); x.lineTo(226, y); x.lineTo(226, y + 16); x.lineTo(128, y + 56); x.lineTo(30, y + 16); x.closePath(); x.fill(); }
        if (txt) { x.fillStyle = tc; x.font = '700 40px Fredoka,sans-serif'; x.textAlign = 'center'; x.fillText(txt, 128, 130); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t }); };
      const dG0 = dAt(SL - .9), dG1 = RZ, dP0 = dAt(SL - .4);
      const mG = gtex(0, 0, '', '#9bf5be', '#2fcf7a', '#176b44'), mP = gtex(0, 0, '¡YA!', '#fff6a8', '#ffc93a', '#b3640a');
      racers(E, .5); E.racers.forEach((r, k) => { r.x = (k - 2.5) * SP; r.score = 0; r.best = 0;
        const rp = new THREE.Mesh(wedge, snow); rp.position.set(r.x, 0, 0); sc.add(rp);
        for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(.16, .45, len), blue, sc, [r.x + s * WR / 2, surf(RZ / 2) + .12, -RZ / 2], [-ANG, 0, 0]);
        const pl = (d0, d1, mat, dy) => { const L = (d1 - d0) / Math.cos(ANG), dc = (d0 + d1) / 2; mesh(new THREE.PlaneGeometry(WR - .1, L), mat, sc, [r.x, surf(dc) + dy, -dc], [slopeRot, 0, 0]); };
        pl(dG0, dG1 - .02, mG, .03); pl(dP0, dG1 - .02, mP, .05);
        r.ski = new THREE.Group(); r.obj.add(r.ski); for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(.12, .05, 1.7), T('#ff6fae'), r.ski, [s * .22, .02, 0]);
        r.wing = new THREE.Group(); r.obj.add(r.wing); for (const s of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(.9, .05, .5), T('#ffffff'), r.wing, [s * .75, .55, 0]); w.userData.s = s; } r.wing.visible = false; });
      // pista de aterrizaje con marcas cada 10 m y carteles cada 20 m
      mesh(new THREE.PlaneGeometry(HALF * 2, LEN), T('#ffffff', { rim: 0 }), sc, [0, .02, -RZ - LEN / 2], [-Math.PI / 2, 0, 0]);
      for (let m = 10; m <= LEN - 10; m += 10) { mesh(new THREE.PlaneGeometry(HALF * 2, m % 50 ? .22 : .5), T(m % 50 ? '#8fc8ff' : '#ff6fae', { rim: 0 }), sc, [0, .03, -RZ - m], [-Math.PI / 2, 0, 0]);
        if (m % 20 === 0) for (const s of [-1, 1]) { const b = sprite(m + ' m', '#4a8fd8', 3.2, 1.6, 78); b.position.set(s * (HALF + .6), 1.3, -RZ - m); sc.add(b); }
        if (m % 20 === 0) for (const s of [-1, 1]) pm(m % 40 ? 'pino' : 'pinguino', sc, [s * (HALF + 3), 0, -RZ - m], m % 40 ? 3.2 : 1.3, s > 0 ? -1.5 : 1.5); }
      // marcas: récord (dorada) + una por rival
      this.rec = REC0; this.recLine = mesh(new THREE.PlaneGeometry(HALF * 2, .7), new THREE.MeshBasicMaterial({ color: '#ffd23a' }), sc, [0, .06, -RZ - REC0], [-Math.PI / 2, 0, 0]);
      this.recS = sprite('🏆 RÉCORD ' + REC0 + ' m', '#e0a000', 6.4, 1.5, 44); this.recS.position.set(0, 2.3, -RZ - REC0); sc.add(this.recS);
      this.marks = E.racers.map(r => { const l = mesh(new THREE.PlaneGeometry(SP - .3, .35), new THREE.MeshBasicMaterial({ color: r.ch.color }), sc, [r.x, .07, 0], [-Math.PI / 2, 0, 0]); l.visible = false;
        const s = sprite(r.ch.name, r.ch.color, 3.4, 1.15, 50); s.visible = false; s.userData.col = r.ch.color; sc.add(s); return { l, s }; });
      this.round = 0; this.start(E);
    },
    start(E) { this.rt = 0; this.ended = false; for (const r of E.racers) { r.st = 'wait'; r.ts = 0; r.d = 0; r.y = RH; r.q = 0; r.delay = rnd(0, .5); r.tgt = null; r.tl = 0; r.wing.visible = false; }
      if (this.marks) this.marks.forEach(m => { m.l.visible = false; m.s.visible = false; }); },
    judge(txt, col, sub) { const e = this.eJ; e.innerHTML = txt + (sub ? `<small>${sub}</small>` : ''); e.style.color = col || '#fff'; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); },
    update(E, dt) {
      this.rt += dt; const t = this.rt;
      for (const r of E.racers) { const auto = !(r.me && !E.AUTO), s0 = sk(E, r), tap = auto ? false : tapped(E);
        if (r.st === 'wait') { if (t > (this.round ? .9 : 1.5) + r.delay) { r.st = 'slide'; r.ts = 0; if (r.me) Audio.sfxPlay('beep'); } }
        else if (r.st === 'slide') { r.ts += dt;
          let go = false, forced = false;
          if (auto) { if (r.tgt == null) r.tgt = CEN + (rnd(-1, 1) + rnd(-1, 1)) * .5 * sig(Math.min(1.1, s0)); go = r.ts >= r.tgt; } else go = tap && r.ts > .25;
          if (!go && r.ts >= LATE) { go = true; forced = true; }
          if (go) { const off = r.ts - CEN; r.q = forced ? .3 : qOf(off); const [lt, lc] = lab(r.q, off, forced); r.d = dAt(Math.min(r.ts, SL)); r.y = surf(r.d); r.vz = 16 + 14 * r.q; r.vy = 5.5 + 3.5 * r.q; r.tf = 0; r.stam = STAM; r.gl = auto ? glideOf(Math.min(1.1, s0)) : STAM; r.glide = false; r.st = 'fly'; r.hop = 0;
            E.burst(v3(r.x, r.y + .4, -r.d), '#ffffff', 10, 4, .5, .4);
            if (r.me) { Audio.sfxPlay('jump'); this.judge(lt, lc, r.q >= .99 ? '¡salto máximo!' : r.q >= .6 ? '' : 'más cerca del borde'); } } }
        else if (r.st === 'fly') { r.tf += dt;
          const want = auto ? (r.vy <= 0 && r.tf > .25 && r.gl > 0) : holding(E);
          const gl = r.vy <= 0 && want && r.stam > 0 && (auto ? r.gl > 0 : true); r.glide = gl; if (gl) { r.stam -= dt; r.gl -= dt; }
          const g = r.vy > 0 ? G : gl ? GG : G * 1.1; r.vy -= g * dt; r.y += r.vy * dt; r.d += r.vz * dt;
          const gy = r.d >= RZ ? 0 : surf(r.d);
          if (r.y <= gy && r.vy < 0 && r.tf > .1) { const D = Math.max(0, r.d - RZ); r.y = gy; r.D = D; r.score += D; r.best = Math.max(r.best, D); r.last = D; r.st = 'land'; r.tl = 0; r.land = .3; r.rv = r.vz * .5; r.glide = false; r.wing.visible = false;
            E.burst(v3(r.x, .3, -r.d), '#ffffff', 18, 5, .7, .5);
            const m = this.marks[r.k != null ? r.k : E.racers.indexOf(r)]; m.l.position.z = -r.d; m.l.visible = true; m.s.position.set(r.x, 2.4, -r.d - .6); setSprite(m.s, `${r.ch.name} ${D.toFixed(0)} m`, m.s.userData.col, 44); m.s.visible = !r.me;
            if (r.me) { Audio.sfxPlay('land'); const nr = D > this.rec; if (nr) { this.rec = D; this.recLine.position.z = -RZ - D; this.recS.position.z = -RZ - D; setSprite(this.recS, '🏆 RÉCORD ' + D.toFixed(0) + ' m', '#e0a000', 44); this.judge(D.toFixed(1) + ' m', '#ffe27a', '¡NUEVO RÉCORD! 🏆'); } else this.judge(D.toFixed(1) + ' m', '#ffffff', D > 60 ? '¡qué salto!' : D > 35 ? '¡bien!' : 'la próxima, más lejos'); }
            if (D > 60) cheer(r, .7); } }
        else if (r.st === 'land') { r.tl += dt; r.rv = Math.max(0, r.rv - 16 * dt); r.d += r.rv * dt; }
        r.prog = clamp(r.score / (NR * 90), 0, .99); }
      if (E.racers.every(r => r.st === 'land' && r.tl > 1.9)) { this.round++; if (this.round >= NR) { if (!this.done) { this.done = true; scoreEnd(E, r => r.score.toFixed(1) + ' m'); } } else { this.start(E); } }
      const me = E.me;
      // ---------- HUD propio ----------
      if (this.eTut) this.eTut.style.opacity = (this.round === 0 && E.t < 1.6) ? 1 : 0;
      const sl = me.st === 'slide', fl = me.st === 'fly'; this.eB.classList.toggle('on', sl || fl);
      this.eT.style.display = sl ? 'block' : 'none'; this.eW.style.display = fl ? 'block' : 'none';
      if (sl) { this.eM.style.left = Math.min(100, me.ts / LATE * 100) + '%'; const near = me.ts > SL - .55; this.eBig.textContent = near ? '¡TOCA AHORA!' : me.ts > SL - 1.4 ? 'Prepárate…' : 'Espera la zona verde…'; this.eBig.classList.toggle('now', near); }
      if (fl) { this.eWf.style.width = Math.max(0, me.stam / STAM * 100) + '%'; this.eBig.classList.remove('now'); this.eBig.textContent = me.glide ? '🪂 ¡PLANEANDO!' : me.vy > 0 ? '¡Subiendo!' : me.stam > .05 ? '¡Mantén pulsado!' : '¡A aterrizar!'; }
      const dist = fl ? Math.max(0, me.d - RZ) : me.st === 'land' ? me.D : 0; this.eD.textContent = dist.toFixed(0) + ' m'; this.eDs.textContent = `🏆 Récord ${this.rec.toFixed(0)} m`; this.eDs2.textContent = `Salto ${Math.min(NR, this.round + 1)}/${NR} · Total ${me.score.toFixed(0)} m`;
    },
    rpos(r) { if (r.st === 'wait') return [RH, 0];
      if (r.st === 'slide') { const d = dAt(r.ts); return [surf(d), d]; }
      return [Math.max(0, r.y), r.d]; },
    render(E, dt) { this.W.tick(dt, camera);
      if (E.celeb || E.phase === 'celebra' || E.phase === 'done') { if (this.h) this.h.style.display = 'none'; if (this.marks) this.marks.forEach(m => { m.s.visible = false; }); }
      for (const r of E.racers) { const [y, d] = this.rpos(r); r.obj.position.set(r.x, y + (r.st === 'land' ? hopY(r, dt) : 0), -d); r.obj.rotation.y = Math.PI; squash(r, dt);
        const pv = r.obj.userData.pivot, fl = r.st === 'fly';
        pv.rotation.x = r.st === 'slide' ? -.5 : fl ? clamp(-r.vy * .045 - (r.glide ? .12 : .25), -.8, .45) : r.st === 'wait' ? -.2 : 0;
        r.ski.rotation.x = r.st === 'slide' || r.st === 'wait' ? -ANG : fl ? clamp(-r.vy * .03, -.5, .3) : 0;
        r.wing.visible = fl && r.glide; if (r.wing.visible) r.wing.children.forEach(w => { w.rotation.z = w.userData.s * (.1 + .12 * Math.sin(E.t * 14)); });
        if (r.st === 'slide' && Math.random() < .5) E.burst(r.obj.position.clone(), '#ffffff', 1, 1.5, .3, .3, 0);
        if (r.glide && Math.random() < .5) E.burst(r.obj.position.clone().add(v3(0, .5, 0)), '#bff4ff', 1, 1.2, .5, .35, 0); }
      const me = E.me, [y, d] = this.rpos(me), z = -d, pr = port(), k = me.st === 'fly' ? 6 : 4.5;
      // cámara: detrás y encima del pingüino; en el aire sube con él y mira hacia la pista de nieve
      const ground = Math.max(0, y);
      const cp = v3(me.x + (pr ? 0 : 1.2), (me.st === 'wait' || me.st === 'slide' ? y + (pr ? 3.8 : 3.2) : ground * .75 + (pr ? 4.4 : 3.6)), z + (pr ? 7 : 6));
      const cl = v3(me.x, me.st === 'wait' || me.st === 'slide' ? y - 2.4 : ground * .45 + .4, z - (pr ? 13 : 14));
      camTo(E, dt, cp, cl, pr ? 74 : 60, k); },
    dispose() { const d = $('perf'); if (d) d.remove(); if (this.h) this.h.remove(); const s = document.getElementById('esqCss'); if (s) s.remove(); },
  }), { how: '' });
}

// =====================================================================
//  MOLDES DE LAVA — mantén pulsado para verter lava en el molde y suelta justo en la raya
//  dorada. Ojo: la lava sigue goteando un poquito al soltar. Si rebosa, 0 puntos. 5 moldes.
// =====================================================================
export function moldes(cfg) {
  const SP = 3.6, NR = 5, H = 2.6, DRIP = .05;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 60,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 12, z1: -40, half: 14 } }); setButtons('m', { M: cfg.btn || '🌋' });
      const glass = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }), lava = GL(cfg.lavaC || '#ff7a2a', .9);
      mesh(new THREE.BoxGeometry(SP * 6 + 2, .8, 2.2), T('#9a6a7a'), sc, [0, .4, -2]);
      racers(E, .42); E.racers.forEach((r, k) => { r.x = lineX(k, SP); r.score = 0;
        const g = new THREE.Group(); g.position.set(r.x, .8, -2); sc.add(g); r.cup = g;
        mesh(new THREE.CylinderGeometry(.85, .7, H, 24, 1, true), glass, g, [0, H / 2, 0]); const bot = mesh(new THREE.CylinderGeometry(.72, .72, .1, 24), T('#c8b0a0'), g, [0, .05, 0]);
        r.fill = mesh(new THREE.CylinderGeometry(.78, .68, 1, 24), lava, g, [0, 0, 0]); r.fill.scale.y = .001;
        r.line = mesh(new THREE.TorusGeometry(.86, .06, 8, 28), GL('#ffe27a', .9), g, [0, 1, 0], [Math.PI / 2, 0, 0]);
        r.spout = pm('volcancito', g, [0, H + .9, -.2], 1.1); r.stream = mesh(CYL(), lava, g, [0, H / 2 + .5, 0], null, [.1, H, .1]); r.stream.visible = false; });
      pm('dragon', sc, [SP * 3 + 2.5, 0, -6], 3.5, -.6); pm('huevo', sc, [-SP * 3 - 2, 0, -4], 1.4); pm('huevo', sc, [-SP * 3 - 3, 0, -5.5], 1.1);
      this.round = 0; this.start(E);
    },
    start(E) { this.rt = 0; for (const r of E.racers) { r.lv = 0; r.st = 'ready'; r.tgt = rnd(.45, .85); r.drip = 0; r.err = null; r.line.position.y = r.tgt * H; } },
    update(E, dt) {
      this.rt += dt; const sp = .3 + this.round * .05;
      for (const r of E.racers) { const auto = !(r.me && !E.AUTO), s0 = sk(E, r);
        if (r.st === 'ready' && this.rt > .8) r.st = 'wait';
        if (r.st === 'wait' || r.st === 'pour') { let on;
          if (auto) { if (r.err == null) r.err = rnd(-1, 1) * (1.2 - Math.min(1.1, s0)) * .09; on = r.lv < r.tgt - DRIP + r.err; if (r.st === 'wait' && this.rt < 1 + r.k * .15) on = false; }
          else on = holding(E);
          if (on) { r.st = 'pour'; r.lv += sp * dt; } else if (r.st === 'pour') { r.st = 'drip'; r.drip = DRIP; }
          if (r.st === 'wait' && this.rt > 7) { r.st = 'drip'; r.drip = 0; } }
        else if (r.st === 'drip') { const d = Math.min(r.drip, dt * .2); r.lv += d; r.drip -= d; if (r.drip <= 1e-4) { r.st = 'done'; const diff = Math.abs(r.lv - r.tgt), over = r.lv > 1;
            const pts = over ? 0 : r.lv === 0 ? 0 : diff < .025 ? 10 : diff < .06 ? 6 : diff < .12 ? 3 : 1; r.score += pts; r.lastP = pts;
            if (pts >= 6) cheer(r); if (r.me) { Audio.sfxPlay(pts >= 10 ? 'stars' : pts ? 'land' : 'boing'); E.ui.toast(over ? '¡Rebosa! 0 pts' : pts >= 10 ? '¡CLAVADO! +10 ✨' : `+${pts} pts`, pts >= 10 ? '#ffe27a' : '#ffd0ec'); } } }
        if (r.lv > 1.12) r.lv = 1.12;
        r.prog = clamp((this.round + (r.st === 'done' ? 1 : 0)) / NR, 0, .99); }
      if (E.racers.every(r => r.st === 'done') && (this.dt2 = (this.dt2 || 0) + dt) > 1.4) { this.dt2 = 0; this.round++; if (this.round >= NR) { if (!this.done) { this.done = true; scoreEnd(E, r => r.score + ' pts'); } } else this.start(E); }
      board(E, r => r.score + ' pts'); info(`🌋 Molde ${Math.min(NR, this.round + 1)}/${NR}<br>${E.me.score} pts`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { const lv = Math.min(1.05, r.lv); r.fill.scale.y = Math.max(.001, lv * H); r.fill.position.y = lv * H / 2; r.stream.visible = r.st === 'pour' || r.st === 'drip';
        if (r.lv > 1 && Math.random() < .3) E.burst(r.cup.position.clone().add(v3(0, H, 0)), '#ff7a2a', 2, 2, .4, .3, -6);
        r.line.material.emissiveIntensity = .6 + Math.sin(t * 6) * .3;
        r.obj.position.set(r.x - 1.2, .8 + hopY(r, dt), -1); r.obj.rotation.y = Math.PI * .8; squash(r, dt); }
      const me = E.me, pr = port(); camTo(E, dt, v3(me.x, pr ? 5.2 : 3.6, pr ? 8 : 5.5), v3(me.x, pr ? 1.2 : 1.6, -2), pr ? 64 : 52, 3); },
  });
}

// =====================================================================
//  ¿CUÁL ES DISTINTO? — en la bandeja hay muchas golosinas iguales y UNA diferente.
//  Tócala antes que nadie. Si fallas, te quedas un momento mareado. 8 rondas.
// =====================================================================
const KINDS = ['caramelo', 'piruleta', 'cupcake', 'donut', 'osito', 'bastón', 'tarta'];
export function distinto(cfg) {
  const NR = 8, CS = 1.55, PAIRS = cfg.pairs || [['caramelo', 'piruleta'], ['cupcake', 'donut'], ['osito', 'caramelo'], ['piruleta', 'bastón'], ['donut', 'tarta'], ['caramelo', 'cupcake'], ['osito', 'piruleta'], ['donut', 'cupcake']];
  return base(cfg, { mode: 'puntos', maxT: NR * 11 + 5,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: 10 } }); setButtons(null);
      const tray = mesh(new THREE.CylinderGeometry(4.6, 4.8, .4, 40), T('#ffd0e6'), sc, [0, .2, 0]); outline(tray, '#c0508a', 1.01);
      mesh(new THREE.TorusGeometry(4.7, .18, 10, 48), T('#ff8fc8'), sc, [0, .42, 0], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + .3; pm(pick(['piruleta', 'cupcake', 'bastón', 'tarta']), sc, [Math.cos(a) * 9.5, 0, Math.sin(a) * 9.5 - 2], rnd(2, 3.4), a); }
      racers(E, .42); E.racers.forEach((r, k) => { r.a = Math.PI + (k - 2.5) * .32; r.score = 0; r.dz = 0; });
      this.items = []; this.round = 0; this.start(E);
    },
    /* la distinta es la MISMA golosina con un cambio sutil (matiz de color, tamaño, giro o inclinación) que se hace más fino ronda a ronda */
    start(E) { for (const it of this.items) E.scene.remove(it.m); this.items = []; const R = this.round, k = R / (NR - 1), a = KINDS[(R * 3 + 1) % KINDS.length], n = R < 2 ? 3 : 4, odd = Math.floor(rnd(0, n * n));
      const vars = ['tono', 'giro', 'tamaño', 'inclina']; const v = this.kind = R < 4 ? vars[R] : vars[Math.floor(rnd(0, 4))]; const ry0 = rnd(-.4, .4), sc0 = a === 'caramelo' ? .6 : a === 'bastón' ? 1.2 : 1.05, cs = n === 3 ? CS : CS * .95;
      const tint = new THREE.Color().setHSL(rnd(0, 1), 1, .5);
      for (let i = 0; i < n * n; i++) { const x = (i % n - (n - 1) / 2) * cs, z = (Math.floor(i / n) - (n - 1) / 2) * cs, o = i === odd; const m = pm(a, E.scene, [x, .4, z], sc0 * (n === 4 ? 1.2 : 1.35), ry0);
        if (o) { if (v === 'tono') m.material.color.lerp(tint, lerp(.42, .16, k)); else if (v === 'giro') m.rotation.y += lerp(1, .4, k) * (Math.random() < .5 ? -1 : 1); else if (v === 'tamaño') m.scale.multiplyScalar(lerp(1.22, 1.09, k)); else m.rotation.x = lerp(.5, .2, k) * (Math.random() < .5 ? -1 : 1); }
        this.items.push({ m, odd: o, x, z, ph: rnd(0, 6) }); }
      this.rt = 0; this.ph = 'go'; this.win = null; for (const r of E.racers) { r.ans = false; r.react = null; r.dz = 0; } },
    scr(p) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
    hint() { const it = this.items.find(i => i.odd); return it ? this.scr(it.m.position.clone().add(v3(0, .5, 0))) : null; },
    pickAt(x, y) { let best = null, bd = 80; for (const it of this.items) { const [sx, sy] = this.scr(it.m.position.clone().add(v3(0, .5, 0))); const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = it; } } return best; },
    got(E, r) { r.ans = true; const pts = this.win ? 1 : 3; if (!this.win) this.win = r; r.score += pts; cheer(r);
      if (r.me) { Audio.sfxPlay('stars'); E.ui.toast(pts === 3 ? '¡El primero! +3 🍬' : '¡Bien! +1', '#ffe27a'); } else say(E, r, pick(['¡Ahí!', '¡Lo vi!'])); },
    update(E, dt) {
      this.rt += dt;
      if (this.ph === 'go') { for (const r of E.racers) { if (r.ans) continue; if (r.dz > 0) { r.dz -= dt; continue; }
          if (r.me && !E.AUTO) { if (E.taps.length) { const I = E.input; const it = this.pickAt(I.sx, I.sy); if (it) { if (it.odd) this.got(E, r); else { r.dz = .9; Audio.sfxPlay('boing'); E.ui.toast('¡Esa no! 😵‍💫', '#ffd0ec'); it.m.rotation.z = .5; } } } }
          else { const s0 = sk(E, r); if (r.react == null) r.react = rnd(1.8, 4.2) * (1.45 - Math.min(1.25, s0)) + this.round * .35; if (this.rt > r.react) { if (Math.random() < .72 + .25 * Math.min(1, s0)) this.got(E, r); else { r.dz = .9; r.react = this.rt + rnd(.8, 1.6); } } } }
        if ((this.win && (E.racers.every(r => r.ans) || this.rt > (this.winT = this.winT || this.rt) + 1.6)) || this.rt > 7 + this.round * .4) { this.ph = 'rev'; this.rt = 0; this.winT = 0; if (!E.me.ans && !(E.me.dz > 0 && false)) E.ui.toast('¡Era esta! 👀', '#ffd0ec'); } }
      else if (this.ph === 'rev' && this.rt > 1.2) { this.round++; if (this.round >= NR) { if (!this.done) { this.done = true; scoreEnd(E, r => r.score + ' pts'); } } else this.start(E); }
      for (const r of E.racers) r.prog = clamp(this.round / NR, 0, .99);
      board(E, r => r.score + ' pts'); info(`🍬 Ronda ${Math.min(NR, this.round + 1)}/${NR}<br>${E.me.score} pts`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const it of this.items) { const s = it.odd && this.ph === 'rev' ? 1 + Math.abs(Math.sin(t * 8)) * .35 : 1; it.m.position.y = .4 + (it.odd && this.ph === 'rev' ? .3 : Math.sin(t * 2 + it.ph) * .04); it.m.scale.setScalar(it.m.userData.s0 || (it.m.userData.s0 = it.m.scale.x)); it.m.scale.multiplyScalar(s); it.m.rotation.z *= .9; }
      if (this.ph === 'rev') for (const it of this.items) if (it.odd && it.m.material.emissive) { it.m.material.emissive.setHSL(.14, 1, .25 + Math.abs(Math.sin(t * 8)) * .2); }
      for (const r of E.racers) { r.obj.position.set(Math.sin(r.a) * 6.2, hopY(r, dt), Math.cos(r.a) * 6.2 + .3); r.obj.rotation.y = r.a + Math.PI; r.obj.userData.pivot.rotation.z = r.dz > 0 ? Math.sin(t * 18) * .25 : 0; squash(r, dt); }
      const pr = port(); camTo(E, dt, v3(0, pr ? 13 : 9, pr ? 6.5 : 6), v3(0, 0, pr ? -.4 : -.8), pr ? 60 : 52, 3); },
  });
}

// =====================================================================
//  LIANAS DE LA SELVA — te balanceas colgado de una liana: toca para soltarte cuando vayas hacia
//  delante (¡arriba del todo vuelas más!) y agarrarte a la siguiente. Si fallas, al barro y a trepar.
// =====================================================================
export function lianas(cfg) {
  const SP = 3.4, NV = cfg.nv || 9, GAP = 6.5, PY = 9, LEN = 5.6, A = .72, W = 2.5;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 70,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 12, z1: -NV * GAP - 30, half: 40 }, noAmb: true }); this.J = jungle(E, { NV, GAP, SP, PY }); setButtons('m', { M: cfg.btn || '🐒' });
      const vineM = T('#4a9a3a'), barM = T('#8a5a3a'), leafM = T('#6ac85a'), flM = [T('#ff6fae'), T('#ffe27a'), T('#c9a2ff')];
      mesh(new THREE.PlaneGeometry(SP * 6 + 2, NV * GAP + 14), T('#8a6a3a', { rim: 0 }), sc, [0, .02, -NV * GAP / 2], [-Math.PI / 2, 0, 0]);
      for (let i = 0; i <= NV; i++) { const z = -i * GAP; const bar = mesh(CYL(), barM, sc, [0, PY + .1, z], [0, 0, Math.PI / 2], [.25, SP * 6 + 2, .25]); outline(bar, '#4a2a1a', 1.05);
        for (const s of [-1, 1]) pm(i % 2 ? 'arbol' : 'palmera', sc, [s * (SP * 3 + 1.6), 0, z], 10.5, rnd(0, 6)); if (i % 2) pm('pina', sc, [rnd(-SP * 3, SP * 3), PY + .3, z], .8); }
      const goal = pm('mono', sc, [0, 0, -NV * GAP - 5], 3.5, 0); pm('platano', sc, [2, 0, -NV * GAP - 5], 1.4);
      racers(E, .42); E.racers.forEach((r, k) => { r.x = lineX(k, SP); r.vi = 0; r.score = 0; r.st = 'swing'; r.ph = rnd(0, 6); r.fin = false;
        r.vines = []; for (let i = 0; i <= NV; i++) { const g = new THREE.Group(); g.position.set(r.x, PY, -i * GAP); sc.add(g); mesh(CYL(), vineM, g, [0, -LEN / 2, 0], null, [.07, LEN, .07]); for (let j = 1; j < 6; j++) mesh(SPHL(), leafM, g, [(j % 2 ? .09 : -.09), -j * LEN / 6, 0], [0, 0, j % 2 ? .5 : -.5], [.2, .07, .13]); mesh(SPHL(), flM[i % 3], g, [0, -LEN * .45, .06], null, [.11, .11, .08]); mesh(SPHL(), vineM, g, [0, -LEN, 0], null, [.16, .14, .16]); r.vines.push({ g, th: Math.sin(i * 1.3) * .2 }); } });
      this.order = 0;
    },
    th(E, r) { return A * Math.sin(E.t * W + r.ph); },
    om(E, r) { return A * W * Math.cos(E.t * W + r.ph); },
    update(E, dt) {
      for (const r of E.racers) { if (r.fin) continue; const auto = !(r.me && !E.AUTO), s0 = sk(E, r);
        if (r.st === 'swing') { const th = this.th(E, r), om = this.om(E, r), u = th / A; r.hang = th;
          let go; if (!auto) go = tapped(E); else { if (r.tu == null) r.tu = clamp(.62 + rnd(-1, 1) * (1.2 - Math.min(1.1, s0)) * .55, -.3, 1); go = om > 0 && u > r.tu && (r.wt = (r.wt || 0) + dt) > .4; }
          if (go) { r.wt = 0; r.tu = null; const ok = om > 0 && u > .22 && u < .98; r.jz0 = -r.vi * GAP - Math.sin(th) * LEN; r.jy0 = PY - Math.cos(th) * LEN; r.jt = 0;
            if (ok) { r.st = 'jump'; r.q = u; E.burst(r.obj.position.clone().add(v3(0, 1.2, 0)), '#7ad85a', r.me ? 14 : 6, 3.5, .9, .35, -3); if (r.me) { Audio.sfxPlay(u > .8 ? 'trick' : 'jump'); E.ui.toast(u > .8 ? '¡PERFECTO! 🌟' : u > .55 ? '¡Bien!' : '¡Justito!', u > .8 ? '#ffe27a' : '#ffffff'); this.kick = u > .8 ? 1 : .6; } } else { r.st = 'fall'; r.vy = 0; if (r.me) { Audio.sfxPlay('boing'); E.shake = .25; E.ui.toast(om <= 0 ? '¡Suéltate cuando vayas hacia delante!' : '¡Un poco más arriba!', '#ffd0ec'); } else say(E, r, '¡Al barro!'); } } }
        else if (r.st === 'jump') { r.jt += dt; if (r.jt >= .6) { r.vi++; r.score = r.vi; r.st = 'swing'; r.ph = Math.asin(-.45) - E.t * W; E.burst(r.obj.position.clone().add(v3(0, 1.4, 0)), '#a8f07a', r.me ? 10 : 4, 2.5, .6, .3, -2); if (r.me) Audio.sfxPlay('land');
            if (r.vi >= NV) { r.fin = true; r.time = E.t; r.score = 100 - this.order++; cheer(r, .8); if (r.me) { Audio.sfxPlay('fanfare'); E.ui.toast('¡Llegaste! 🍌', '#ffe27a'); } } } }
        else if (r.st === 'fall') { r.jt += dt; if (r.jt > .5 && !r.mud) { r.mud = 1; E.burst(v3(r.x, .3, r.jz0), '#8a6a3a', r.me ? 16 : 6, 4, .6, .4); if (r.me) Audio.sfxPlay('squash'); } if (r.jt > 1.5) { r.st = 'swing'; r.mud = 0; r.ph = Math.asin(-.6) - E.t * W; if (r.me) E.ui.toast('¡Arriba otra vez! 💪', '#ffffff'); } }
        if (!r.fin) r.score = r.vi; r.prog = clamp(r.vi / NV, 0, .99); }
      if (!this.done && (this.order >= 3 || (E.me.fin && this.order >= 2) || E.t > this.maxT - .5)) { this.done = true; scoreEnd(E, r => r.fin ? '¡Meta!' : `${r.vi}/${NV} lianas`); }
      { const me = E.me, u = this.th(E, me) / A, now = me.st === 'swing' && !me.fin && this.om(E, me) > 0 && u > .5; const bm = $('bM'); if (bm) { bm.style.transform = now ? 'scale(1.18)' : ''; bm.style.boxShadow = now ? '0 0 0 5px #ffe27a, 0 0 24px #ffe27a' : ''; }
        info(me.fin ? '🍌 ¡En la meta!' : `🐒 Liana ${Math.min(NV, me.vi + 1)}/${NV}${now ? '<br><b style="color:#ffe27a">¡AHORA!</b>' : ''}`); }
    },
    rpos(E, r) { if (r.st === 'swing' || r.fin) { const th = r.fin ? 0 : this.th(E, r); return [PY - Math.cos(th) * LEN - .9, -r.vi * GAP - Math.sin(th) * LEN]; }
      if (r.st === 'jump') { const k = r.jt / .6, tz = -(r.vi + 1) * GAP - Math.sin(-A * .45) * LEN, ty = PY - Math.cos(A * .45) * LEN; return [lerp(r.jy0, ty, k) + Math.sin(k * Math.PI) * 1.5 - .9, lerp(r.jz0, tz, k)]; }
      const k = Math.min(1, r.jt / .5); if (r.jt < 1.1) return [Math.max(0, lerp(r.jy0 - .9, 0, k * k)), r.jz0]; const c = (r.jt - 1.1) / .4; return [lerp(0, PY - LEN * Math.cos(A * .6) - .9, c), lerp(r.jz0, -r.vi * GAP + Math.sin(A * .6) * LEN, c)]; },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { r.vines.forEach((v, i) => { v.g.visible = !(r.fin && i === NV && E.celeb); v.g.rotation.x = (i === r.vi && r.st === 'swing' && !r.fin) ? this.th(E, r) : v.th + Math.sin(t * 1.2 + i) * .08; });
        const [y, z] = this.rpos(E, r); r.obj.position.set(r.x, y + (r.fin ? hopY(r, dt) : 0), z); r.obj.rotation.y = Math.PI; r.obj.userData.pivot.rotation.x = r.st === 'swing' ? -this.th(E, r) * .5 : r.st === 'jump' ? -.5 : 0; squash(r, dt); }
      this.J.tick(t, dt);
      { const me = E.me, [y, z] = this.rpos(E, me), pr = port(), vz = this._lz == null ? 0 : (z - this._lz) / Math.max(dt, 1e-3); this._lz = z; this.kick = Math.max(0, (this.kick || 0) - dt * 1.5);
        const sp = Math.min(1, Math.abs(vz) / 9), sw = me.st === 'swing' && !me.fin ? this.th(E, me) / A : 0;
        const pos = v3(me.x + 1.6, y + (pr ? 2.8 : 1.9) - sw * .25, z + (pr ? 6.6 : 4.8)), look = v3(me.x - .2, y + .7, z - 6);
        camTo(E, dt, pos, look, (pr ? 70 : 58) + sp * 8 + this.kick * 6, 5);
        camera.up.set(Math.sin(sw) * .045, 1, 0).normalize(); camera.lookAt(E._cl); } },
  });
}

// =====================================================================
//  PARA EL RELOJ — cada reloj empieza a contar y… ¡se derrite! Cuenta en tu cabeza y toca
//  justo cuando creas que han pasado los segundos que pide. Quien más se acerque, más puntos. 5 rondas.
// =====================================================================
export function parareloj(cfg) {
  const SP = 3.8, NR = 5, TG = [3, 4, 2.5, 5, 3.5], SEE = 1.2;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 70,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 12, z1: -40, half: 14 } }); setButtons('m', { M: '⏱️' });
      racers(E, .42); E.racers.forEach((r, k) => { r.x = lineX(k, SP); r.score = 0;
        const g = new THREE.Group(); g.position.set(r.x, 0, -2.2); sc.add(g); r.clk = g;
        const face = mesh(new THREE.CylinderGeometry(1.25, 1.25, .25, 32), T('#fff6e0'), g, [0, 2.2, 0], [Math.PI / 2, 0, 0]); outline(face, '#c08a2a', 1.06); r.face = face;
        mesh(new THREE.TorusGeometry(1.25, .12, 10, 32), T('#ffd84a'), g, [0, 2.2, .1]); mesh(CYL(), T('#c08a2a'), g, [0, 1, -.1], null, [.12, 2, .12]);
        for (let i = 0; i < 12; i++) mesh(SPHL(), T('#5a3a6e'), g, [Math.sin(i / 12 * 6.28) * 1, 2.2 + Math.cos(i / 12 * 6.28) * 1, .16], null, .07);
        r.hand = new THREE.Group(); r.hand.position.set(0, 2.2, .2); g.add(r.hand); mesh(BOX(), T('#ff6fae'), r.hand, [0, .45, 0], null, [.08, .9, .05]);
        r.drop = mesh(SPH(), T('#fff6e0'), g, [0, 1, .1], null, [.3, .45, .3]); r.drop.visible = false; });
      for (let i = 0; i < 7; i++) pm(pick(['luna', 'oveja', 'almohada', 'reloj']), sc, [rnd(-14, 14), 0, rnd(-12, -6)], rnd(1.4, 3), rnd(0, 6));
      this.round = 0; this.start(E);
    },
    start(E) { this.rt = 0; this.tg = TG[this.round]; this.ph = 'intro'; for (const r of E.racers) { r.stop = null; r.err = null; } E.ui.toast(`¡Para el reloj en ${this.tg} segundos! ⏱️`, '#ffe27a'); },
    update(E, dt) {
      this.rt += dt;
      if (this.ph === 'intro' && this.rt > 1.4) { this.ph = 'run'; this.rt = 0; if (E.me) Audio.sfxPlay('go'); }
      else if (this.ph === 'run') {
        for (const r of E.racers) { if (r.stop != null) continue; const auto = !(r.me && !E.AUTO), s0 = sk(E, r);
          if (r.err == null) r.err = (rnd(-1, 1) + rnd(-1, 1)) * .5 * (1.25 - Math.min(1.15, s0)) * (.25 + this.tg * .12);
          const go = auto ? this.rt >= this.tg + r.err : tapped(E); if (go || this.rt > this.tg + 3) { r.stop = this.rt; const d = Math.abs(r.stop - this.tg), pts = Math.max(0, Math.round(10 - d * 12)); r.score += pts; r.lastP = pts;
            if (pts >= 8) cheer(r); if (r.me) { Audio.sfxPlay(pts >= 9 ? 'stars' : pts ? 'land' : 'boing'); E.ui.toast(`${r.stop.toFixed(2)} s · ${pts >= 10 ? '¡PERFECTO! ' : ''}+${pts}`, pts >= 8 ? '#ffe27a' : '#ffd0ec'); } else if (Math.random() < .4) E.say(r, `${r.stop.toFixed(2)} s`); } }
        if (E.racers.every(r => r.stop != null)) { this.ph = 'rev'; this.rt = 0; } }
      else if (this.ph === 'rev' && this.rt > 2) { this.round++; if (this.round >= NR) { if (!this.done) { this.done = true; scoreEnd(E, r => r.score + ' pts'); } } else this.start(E); }
      for (const r of E.racers) r.prog = clamp(this.round / NR, 0, .99);
      board(E, r => r.score + ' pts'); info(`⏱️ Ronda ${Math.min(NR, this.round + 1)}/${NR}<br>Objetivo: <b>${this.tg} s</b>`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      // Progreso = tiempo transcurrido / objetivo (no incrementos por frame): la aguja da UNA vuelta
      // completa y el reloj se derrite del todo justo al llegar al objetivo. Si core3d cierra la prueba, todo al 100 %.
      const fin = this.done || E.phase === 'celebra' || E.phase === 'done';
      for (const r of E.racers) { const run = this.ph === 'run', el = fin ? this.tg : run ? (r.stop != null ? r.stop : this.rt) : this.ph === 'rev' ? (r.stop ?? this.tg) : 0,
          p = clamp(el / this.tg, 0, 1), melt = p * p * (3 - 2 * p); r.clkP = p;
        r.hand.rotation.z = -p * Math.PI * 2; r.hand.visible = true;
        r.face.scale.set(1 + melt * .12, 1, 1 - melt * .45); r.face.position.y = 2.2 - melt * .35; r.drop.visible = melt > .05; r.drop.position.y = 1.2 - melt * .9 + Math.sin(t * 3) * .05 * melt; r.drop.scale.set(.3, .2 + melt * .65, .3);
        r.obj.position.set(r.x - 1.5, hopY(r, dt), -1.2); r.obj.rotation.y = Math.PI * .85; squash(r, dt); }
      const me = E.me, pr = port(); window.__reloj = { ph: this.ph, rt: this.rt, tg: this.tg, round: this.round, p: me.clkP, el: me.clkP * this.tg }; camTo(E, dt, v3(me.x - .6, pr ? 3.8 : 3, pr ? 8.5 : 6), v3(me.x - .6, 1.8, -2), pr ? 66 : 54, 3); },
  });
}
