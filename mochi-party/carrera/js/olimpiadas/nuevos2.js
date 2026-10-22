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
export const NUEVOS2 = { bumeran };
