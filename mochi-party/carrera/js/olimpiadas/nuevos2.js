// ======================================================================
//  MOCHI PARTY · OLIMPIADAS — mecánicas nuevas (revisión 3, fase B): ninguna se parece a otra
//  bumerán · topos de lava · cuenta peces · ¡que no te vea! · bola caliente · salto de esquí ·
//  moldes de lava · ¿cuál es distinto? · lianas · para el reloj
// ======================================================================
import { THREE, camera, toon, outline, mesh, glowSprite, rnd, clamp, lerp, pick, Audio } from '../core3d.js?v=m16';
import { buildWorld, prop, MUNDOS, SPH, SPHL, CYL, BOX, TOR } from './mundos.js?v=o17';
import { mergedGeo } from './decor.js?v=o17';
import { jungle } from './selva-lianas.js?v=o17';
import { T, GL, v3, $, sk, info, setButtons, racers, squash, say, scoreFinish, base } from './tipos.js?v=o17';

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
//  SALTO DE ESQUÍ — bajas por el trampolín: toca justo en el borde para saltar lejísimos y
//  vuelve a tocar antes de aterrizar para un «telemark» (+5 m). 3 saltos, se suman los metros.
// =====================================================================
export function esqui(cfg) {
  const SP = 4, NR = 3, SL = 2.3, RZ = 16, RH = 7.5, EY = 1.4;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 60,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 14, z1: -110, half: 16 } }); setButtons('m', { M: cfg.btn || '⛷️' });
      const snow = T(cfg.ramp || '#f4fbff'), blue = T('#8fc8ff');
      const len = Math.hypot(RZ, RH - EY), ang = Math.atan2(RH - EY, RZ);
      racers(E, .42); E.racers.forEach((r, k) => { r.x = lineX(k, SP); r.score = 0; r.best = 0;
        const rp = mesh(new THREE.BoxGeometry(2.2, .4, len), snow, sc, [r.x, (RH + EY) / 2 - .2, -RZ / 2], [ang, 0, 0]); outline(rp, '#6a9ac8', 1.01);
        for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(.15, .5, len), blue, sc, [r.x + s * 1.1, (RH + EY) / 2 + .05, -RZ / 2], [ang, 0, 0]);
        mesh(new THREE.BoxGeometry(2.4, RH, 1.2), T('#c8e4ff'), sc, [r.x, RH / 2 - .2, .4]);
        r.ski = new THREE.Group(); r.obj.add(r.ski); for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(.12, .05, 1.6), T('#ff6fae'), r.ski, [s * .22, .02, 0]); });
      // pista de aterrizaje con marcas cada 10 m
      mesh(new THREE.PlaneGeometry(SP * 6 + 6, 110), T('#ffffff', { rim: 0 }), sc, [0, .02, -RZ - 55], [-Math.PI / 2, 0, 0]);
      for (let m = 20; m <= 90; m += 10) { mesh(new THREE.PlaneGeometry(SP * 6 + 4, .25), T(m % 30 ? '#8fc8ff' : '#ff6fae', { rim: 0 }), sc, [0, .03, -RZ - m], [-Math.PI / 2, 0, 0]); for (const s of [-1, 1]) pm(m % 20 ? 'pino' : 'pinguino', sc, [s * (SP * 3 + 2.5), 0, -RZ - m], m % 20 ? 3 : 1.2, s > 0 ? -1.5 : 1.5); }
      this.round = 0; this.start(E);
    },
    start(E) { this.rt = 0; for (const r of E.racers) { r.st = 'wait'; r.u = 0; r.d = 0; r.tel = false; r.q = 0; r.delay = rnd(0, .6); r.err = null; } },
    update(E, dt) {
      this.rt += dt; const t = this.rt;
      for (const r of E.racers) { const auto = !(r.me && !E.AUTO), s0 = sk(E, r), tap = auto ? false : tapped(E);
        if (r.st === 'wait') { if (t > .8 + r.delay) { r.st = 'slide'; r.ts = 0; } }
        else if (r.st === 'slide') { r.ts += dt; r.u = Math.min(1.25, r.ts / SL);
          if (r.err == null) r.err = rnd(-1, 1) * (1.15 - Math.min(1.1, s0)) * .32;
          const go = auto ? r.ts >= SL + r.err : tap;
          if (go || r.u >= 1.18) { const off = r.ts - SL; r.q = go ? clamp(1 - Math.abs(off) / .42, 0, 1) : .05; r.st = 'fly'; r.tf = 0; r.D = 16 + 52 * r.q; r.FT = 1.3 + 1.1 * r.q; if (r.me) { Audio.sfxPlay('jump'); E.ui.toast(r.q > .85 ? '¡SALTO PERFECTO! 🚀' : r.q > .5 ? '¡Buen salto!' : r.q > .1 ? 'Saltito…' : '¡Toca en el borde!', r.q > .85 ? '#ffe27a' : '#bff4ff'); } } }
        else if (r.st === 'fly') { r.tf += dt; const k = r.tf / r.FT;
          const tl = auto ? (Math.random() < (.25 + .65 * Math.min(1, s0)) * dt * 4 && k > .72) : tap; if (tl && !r.tel && k > .45) { r.tel = k > .7; if (r.me) E.ui.toast(r.tel ? '¡Telemark! +5 m ✨' : '¡Demasiado pronto!', r.tel ? '#ffe27a' : '#ffd0ec'); if (!r.tel) r.telFail = true; }
          if (k >= 1) { const m = r.D + (r.tel ? 5 : 0); r.score += m; r.best = Math.max(r.best, m); r.last = m; r.st = 'land'; r.tl = 0; r.land = .3; E.burst(v3(r.x, .3, -RZ - r.D), '#ffffff', 16, 5, .6, .5); if (r.me) { Audio.sfxPlay('land'); E.ui.toast(`${m.toFixed(1)} m`, '#ffffff'); } if (m > 55) cheer(r, .6); } }
        else if (r.st === 'land') { r.tl += dt; }
        r.prog = clamp((this.round + (r.st === 'land' ? 1 : 0)) / NR, 0, .99); }
      if (E.racers.every(r => r.st === 'land' && r.tl > 1.1)) { this.round++; if (this.round >= NR) { if (!this.done) { this.done = true; scoreEnd(E, r => r.score.toFixed(1) + ' m'); } } else this.start(E); }
      board(E, r => r.score.toFixed(0) + ' m'); info(`⛷️ Salto ${Math.min(NR, this.round + 1)}/${NR}<br>${E.me.score.toFixed(0)} m`);
    },
    rpos(r) { if (r.st === 'wait') return [RH + .1, .6];
      if (r.st === 'slide') { const u = Math.min(1, r.u); return [RH - (RH - EY) * u + .15, -RZ * u - Math.max(0, r.u - 1) * 6]; }
      if (r.st === 'fly') { const k = r.tf / r.FT; return [EY + .15 + (1 - EY) * 0 + Math.sin(k * Math.PI) * (2 + 4 * r.q) * (1 - k * .2) - k * (EY + .15), -RZ - r.D * k]; }
      return [0, -RZ - r.D - Math.min(1, r.tl) * 4]; },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { const [y, z] = this.rpos(r); r.obj.position.set(r.x, Math.max(0, y) + hopY(r, dt), z); r.obj.rotation.y = Math.PI; squash(r, dt);
        r.obj.userData.pivot.rotation.x = r.st === 'slide' ? .45 : r.st === 'fly' ? -.25 + (r.tf / r.FT) * .2 : 0; if (r.st === 'slide' && Math.random() < .4) E.burst(r.obj.position.clone(), '#ffffff', 1, 1.5, .3, .3, 0); }
      const me = E.me, [y, z] = this.rpos(me), pr = port(); camTo(E, dt, v3(me.x + .8, Math.max(2, y) + (pr ? 3.6 : 2.8), z + (pr ? 8.5 : 6.5)), v3(me.x, Math.max(0, y) * .6, z - 10), pr ? 72 : 58, 7); },
  });
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
export function distinto(cfg) {
  const NR = 8, CS = 1.55, PAIRS = cfg.pairs || [['caramelo', 'piruleta'], ['cupcake', 'donut'], ['osito', 'caramelo'], ['piruleta', 'bastón'], ['donut', 'tarta'], ['caramelo', 'cupcake'], ['osito', 'piruleta'], ['donut', 'cupcake']];
  return base(cfg, { mode: 'puntos', maxT: NR * 8 + 5,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: 10 } }); setButtons(null);
      const tray = mesh(new THREE.CylinderGeometry(4.6, 4.8, .4, 40), T('#ffd0e6'), sc, [0, .2, 0]); outline(tray, '#c0508a', 1.01);
      mesh(new THREE.TorusGeometry(4.7, .18, 10, 48), T('#ff8fc8'), sc, [0, .42, 0], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + .3; pm(pick(['piruleta', 'cupcake', 'bastón', 'tarta']), sc, [Math.cos(a) * 9.5, 0, Math.sin(a) * 9.5 - 2], rnd(2, 3.4), a); }
      racers(E, .42); E.racers.forEach((r, k) => { r.a = Math.PI + (k - 2.5) * .32; r.score = 0; r.dz = 0; });
      this.items = []; this.round = 0; this.start(E);
    },
    start(E) { for (const it of this.items) E.scene.remove(it.m); this.items = []; const [a, b] = PAIRS[this.round % PAIRS.length], nx = this.round < 3 ? 3 : 4, nz = this.round < 3 ? 3 : 4, odd = Math.floor(rnd(0, nx * nz));
      for (let i = 0; i < nx * nz; i++) { const x = (i % nx - (nx - 1) / 2) * CS, z = (Math.floor(i / nx) - (nz - 1) / 2) * CS; const k2 = i === odd ? b : a; const m = pm(k2, E.scene, [x, .4, z], k2 === 'caramelo' ? .6 : k2 === 'bastón' ? 1.2 : 1.05, rnd(-.3, .3)); this.items.push({ m, odd: i === odd, x, z, ph: rnd(0, 6) }); }
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
          else { const s0 = sk(E, r); if (r.react == null) r.react = rnd(1.1, 3) * (1.45 - Math.min(1.25, s0)) + this.round * .12; if (this.rt > r.react) { if (Math.random() < .72 + .25 * Math.min(1, s0)) this.got(E, r); else { r.dz = .9; r.react = this.rt + rnd(.8, 1.6); } } } }
        if ((this.win && (E.racers.every(r => r.ans) || this.rt > (this.winT = this.winT || this.rt) + 1.6)) || this.rt > 7) { this.ph = 'rev'; this.rt = 0; this.winT = 0; if (!E.me.ans && !(E.me.dz > 0 && false)) E.ui.toast('¡Era esta! 👀', '#ffd0ec'); } }
      else if (this.ph === 'rev' && this.rt > 1.2) { this.round++; if (this.round >= NR) { if (!this.done) { this.done = true; scoreEnd(E, r => r.score + ' pts'); } } else this.start(E); }
      for (const r of E.racers) r.prog = clamp(this.round / NR, 0, .99);
      board(E, r => r.score + ' pts'); info(`🍬 Ronda ${Math.min(NR, this.round + 1)}/${NR}<br>${E.me.score} pts`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const it of this.items) { const s = it.odd && this.ph === 'rev' ? 1 + Math.abs(Math.sin(t * 8)) * .35 : 1; it.m.position.y = .4 + (it.odd && this.ph === 'rev' ? .3 : Math.sin(t * 2 + it.ph) * .04); it.m.scale.setScalar(it.m.userData.s0 || (it.m.userData.s0 = it.m.scale.x)); it.m.scale.multiplyScalar(s); it.m.rotation.z *= .9; }
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
      for (const r of E.racers) { const run = this.ph === 'run', el = run ? (r.stop != null ? r.stop : this.rt) : this.ph === 'rev' ? r.stop : 0, melt = run && r.stop == null ? clamp((this.rt - SEE) / .8, 0, 1) : this.ph === 'rev' ? 0 : 0;
        r.hand.rotation.z = -el / 6 * Math.PI * 2; r.hand.visible = melt < .6;
        r.face.scale.set(1, 1, 1 - melt * .45); r.face.position.y = 2.2 - melt * .35; r.drop.visible = melt > .2; r.drop.position.y = 1.2 - melt * .9 + Math.sin(t * 3) * .05; r.drop.scale.set(.3, .45 + melt * .4, .3);
        r.obj.position.set(r.x - 1.5, hopY(r, dt), -1.2); r.obj.rotation.y = Math.PI * .85; squash(r, dt); }
      const me = E.me, pr = port(); camTo(E, dt, v3(me.x - .6, pr ? 3.8 : 3, pr ? 8.5 : 6), v3(me.x - .6, 1.8, -2), pr ? 66 : 54, 3); },
  });
}
