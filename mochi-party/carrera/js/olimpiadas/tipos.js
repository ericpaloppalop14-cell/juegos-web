// ======================================================================
//  MOCHI PARTY · OLIMPIADAS — los 8 tipos de prueba, configurables por cada olimpiada
//  salto · esquiva · machaca · vuelo · punteria · recoge · ritmo · superv · empuje
// ======================================================================
import { THREE, camera, toon, outline, mesh, glowSprite, makeRunner, rnd, clamp, lerp, pick, Audio, OUCH } from '../core3d.js?v=m16';
import { buildWorld, prop, arch, MUNDOS, SPH, SPHL, CYL, BOX, TOR } from './mundos.js?v=o22';

const LW = 2.3;
const lx = (l, n = 6) => (l - (n - 1) / 2) * LW;
const T = (c, o) => toon(c, o || { rim: .45 });
const GL = (c, k = .5) => toon(c, { emissive: c, ei: k, rim: .4 });
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = id => document.getElementById(id);
// AUTO (pruebas): el jugador juega solo y bastante bien
const sk = (E, r) => r.me ? (E.AUTO ? 1.3 : 1) : r.skill;

// ---------- utilidades comunes ----------
function info(html) { let d = $('perf'); if (!d) { d = document.createElement('div'); d.id = 'perf'; d.style.cssText = 'position:absolute;right:10px;top:calc(88px + env(safe-area-inset-top));background:rgba(110,60,150,.6);color:#fff;font:700 14px Fredoka;border-radius:14px;padding:5px 11px;text-align:right;line-height:1.3;border:1.5px solid rgba(255,255,255,.6)'; $('hud').appendChild(d); } if (d._h !== html) { d.innerHTML = html; d._h = html; } }
function setButtons(mode, lab = {}) { // 'lr' | 'lmr' | 'm' | null; lab: {L,M,R} textos
  const c = $('ctl'); c.classList.toggle('on', !!mode); if (!mode) return;
  $('bL').textContent = lab.L || '⬅'; $('bR').textContent = lab.R || '➡'; $('bM').textContent = lab.M || '🫧';
  $('bL').style.visibility = mode.includes('l') ? 'visible' : 'hidden'; $('bR').style.visibility = mode.includes('r') ? 'visible' : 'hidden'; $('bM').style.visibility = mode.includes('m') ? 'visible' : 'hidden';
}
function racers(E, scale = .55) { E.racers.forEach((r, k) => { r.obj = makeRunner(r.ch, k, scale); E.scene.add(r.obj); r.expr = ''; r.sc = scale; r.land = 0; }); }
function squash(r, dt) { const s = r.sc, q = r.land > 0 ? (r.land -= dt) * 1.2 : 0, a = r.y > .05 ? -.1 : 0; r.obj.userData.pivot.scale.set(s * (1 + q - a * .5), s * (1 - q + a), s * (1 + q - a * .5)); }
function trackBase(E, M, n, L, half) {
  const sc = E.scene;
  mesh(new THREE.PlaneGeometry(half * 2 + 1, L + 60), T(M.alt, { rim: 0 }), sc, [0, .01, -L / 2 + 10], [-Math.PI / 2, 0, 0]);
  for (let l = 0; l <= n; l++) mesh(new THREE.PlaneGeometry(.08, L + 60), T(M.line, { rim: 0 }), sc, [(l - n / 2) * LW, .02, -L / 2 + 10], [-Math.PI / 2, 0, 0]);
  for (let z = 0; z <= L; z += 25) mesh(new THREE.PlaneGeometry(half * 2, .2), T(M.line, { rim: 0 }), sc, [0, .021, -z], [-Math.PI / 2, 0, 0]);
  arch(sc, 0, half, 'SALIDA', '#9b82f0'); arch(sc, -L, half, '¡META!', '#ff6fae');
  // franja de meta a cuadros
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32; const x = cv.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#fff' : '#3a2a5a'; x.fillRect(i * 16, j * 16, 16, 16); }
  const tx = new THREE.CanvasTexture(cv); mesh(new THREE.PlaneGeometry(half * 2, 1.2), new THREE.MeshBasicMaterial({ map: tx }), sc, [0, .03, -L], [-Math.PI / 2, 0, 0]);
}
function chaseCam(E, me, dt, x, y, z, fovAdd = 0, look = 7) {
  E._cz = E._cz == null ? z : lerp(E._cz, z, Math.min(1, dt * 8)); E._cx = E._cx == null ? x : lerp(E._cx, x, Math.min(1, dt * 5));
  const port = innerHeight > innerWidth; camera.fov = lerp(camera.fov, (port ? 74 : 62) + fovAdd, Math.min(1, dt * 4)); camera.updateProjectionMatrix();
  camera.position.set(E._cx * .6, y + (port ? 1.2 : 0), E._cz + (port ? 8.6 : 7.2)); camera.lookAt(E._cx * .5, y * .25, E._cz - look);
}
// joystick común: flotante (la base sigue al dedo si te pasas), zona muerta radial, curva de respuesta suave,
// suavizado temporal y dirección relativa a la cámara (arriba en pantalla = hacia donde mira la cámara)
const _cf = new THREE.Vector3();
function stickDir(E) {
  const K = window.__keys || {}; let x = (K.ArrowRight || K.KeyD ? 1 : 0) - (K.ArrowLeft || K.KeyA ? 1 : 0), y = (K.ArrowDown || K.KeyS ? 1 : 0) - (K.ArrowUp || K.KeyW ? 1 : 0);
  const I = E.input, RAD = 55, DZ = .16;
  if (I.down && I.px != null) { let dx = I.px - I.sx, dy = I.py - I.sy, d = Math.hypot(dx, dy);
    if (d > RAD) { const k = (d - RAD) / d; I.sx += dx * k; I.sy += dy * k; dx = I.px - I.sx; dy = I.py - I.sy; d = RAD; }
    const m = d / RAD; if (m > DZ) { const mm = Math.pow((m - DZ) / (1 - DZ), 1.25); x = dx / d * mm; y = dy / d * mm; } else { x = 0; y = 0; } }
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  // a ejes del mundo según la cámara
  camera.getWorldDirection(_cf); _cf.y = 0; if (_cf.lengthSq() < 1e-4) _cf.set(0, 0, -1); _cf.normalize();
  const rx = -_cf.z, rz = _cf.x; let wx = x * rx - y * _cf.x, wz = x * rz - y * _cf.z;
  // suavizado (sube rápido, frena algo más rápido aún)
  const now = performance.now(), dt = Math.min(.1, (now - (E._stT || now)) / 1000); E._stT = now; const S = E._st || (E._st = { x: 0, z: 0 });
  const k = Math.min(1, dt * (Math.hypot(wx, wz) > .05 ? 14 : 20)); S.x += (wx - S.x) * k; S.z += (wz - S.z) * k;
  return { x: S.x, z: S.z };
}
function sideTaps(E) { const out = [...E.side]; for (const x of E.taps) out.push(x < innerWidth / 2 ? 'L' : 'R'); return out; }
const say = (E, r, s) => { if (!r.me && Math.random() < .5) E.say(r, s); };
function hitFx(E, r, color = '#ff9cc8') { r.expr = 'squash'; E.burst(r.obj.position.clone().add(v3(0, .8, 0)), color, 14, 5, .6, .6); if (r.me) { Audio.sfxPlay('boing'); E.shake = .3; } else say(E, r, pick(OUCH)); }
function scoreFinish(E, key = 'score') { const ord = [...E.racers].sort((a, b) => (b[key] - a[key]) || (b.skill - a.skill)); ord.forEach((r, i) => { r.prog = 1; E.finish(r); r.time = E.t + i * .01; }); }
function base(cfg, extra) { return { id: cfg.id, name: cfg.name, icon: cfg.icon, maxT: cfg.maxT || 80, music: MUNDOS[cfg.mundo].music, seed: cfg.seed || 7, tagY: 1.35, tagS: .45, how: cfg.how, mode: extra.mode || 'tiempo', ownButtons: true, dispose() { const d = $('perf'); if (d) d.remove(); }, ...extra }; }

// =====================================================================
//  SALTO — corre solo, toca para saltar obstáculos (con doble salto opcional)
// =====================================================================
export function salto(cfg) {
  const L = cfg.L || 230, V0 = cfg.v0 || 9, G = cfg.grav || 16, JV = cfg.jump || 7, HO = cfg.h || .9;
  return base(cfg, {
    init(E) {
      const M = MUNDOS[cfg.mundo]; this.W = buildWorld(E, cfg.mundo, { track: { z0: 20, z1: -L - 40, half: 3 * LW } }); trackBase(E, M, 6, L, 3 * LW); setButtons(null);
      this.S = []; for (let z = 24; z < L - 10; z += rnd(cfg.gap?.[0] || 15, cfg.gap?.[1] || 21)) this.S.push({ z0: z, z, ph: rnd(0, 6), objs: [] });
      for (const s of this.S) for (let l = 0; l < 6; l++) { const o = prop(cfg.obs); o.scale.multiplyScalar(cfg.os || .7); o.position.set(lx(l), 0, -s.z); o.rotation.y = cfg.roll ? 0 : rnd(-.3, .3); E.scene.add(o); s.objs.push(o); }
      this.PU = []; this.S.forEach((s, k) => { if (k % 4 === 2 && this.S[k + 1]) { const z = (s.z0 + this.S[k + 1].z0) / 2; for (let l = 0; l < 6; l++) { const g = prop('estrella'); g.scale.setScalar(.45); g.position.set(lx(l), 1, -z); E.scene.add(g); this.PU.push({ z, l, g }); } } });
      racers(E); E.racers.forEach((r, k) => { r.lane = r.me ? 2 : [0, 1, 3, 4, 5][k - 1] ?? k; r.z = 0; r.y = 0; r.vy = 0; r.v = 0; r.stun = 0; r.boost = 0; r.jumps = 0; r.perf = 0; r.buf = 0; r.obj.rotation.y = Math.PI; });
    },
    oz(s, t) { return cfg.roll ? s.z0 - Math.max(0, t) * cfg.roll : s.z0; },
    update(E, dt) {
      const t = E.t;
      for (const s of this.S) s.z = this.oz(s, t);
      for (const r of E.racers) {
        if (r.fin) { r.v = Math.max(0, r.v - 8 * dt); r.z += r.v * dt; r.y = Math.max(0, r.y + (r.vy -= G * dt) * dt); continue; }
        const vmax = V0 + (r.boost > 0 ? 3 : 0);
        if (r.stun > 0) { if ((r.stun -= dt) <= 0) r.expr = ''; } else r.v = Math.min(vmax, r.v + 8 * dt);
        if (r.boost > 0 && (r.boost -= dt) <= 0) r.expr = '';
        const ground = r.y <= 0 && r.vy <= 0; if (ground) r.jumps = 0;
        const nxt = this.S.find(s => s.z > r.z - .2), rel = nxt ? (nxt.z - r.z) / Math.max(1, r.v + (cfg.roll || 0)) : 9;
        let jump = false;
        if (r.me && !E.AUTO) { if (E.taps.length || E.swipe || E.side.length) r.buf = .2; r.buf -= dt; jump = r.buf > 0; }
        else if (nxt && r.stun <= 0) { if (r.plan !== nxt) { r.plan = nxt; const s = sk(E, r); r.pt = Math.random() < .45 + .5 * s ? rnd(.16, .3) : pick([.06, .5]); } if (ground && rel < r.pt) { jump = true; r.plan = null; } }
        if (jump && r.stun <= 0 && (ground || (cfg.double && r.jumps < 2))) { r.buf = 0; r.vy = JV * (r.jumps ? .85 : 1); r.jumps++; r.pk = rel > .1 && rel < .4; if (r.me) Audio.sfxPlay(r.jumps > 1 ? 'trick' : 'jump'); }
        r.vy -= G * dt; const wasAir = r.y > 0; r.y = Math.max(0, r.y + r.vy * dt); if (r.y === 0) r.vy = Math.max(0, r.vy); if (wasAir && r.y === 0) { r.land = .2; if (r.me) Audio.sfxPlay('land'); }
        const oz = r.z; r.z += r.v * dt;
        for (const s of this.S) { const zz = s.z, zp = cfg.roll ? zz + cfg.roll * dt : zz; if (oz <= zp && r.z >= zz - .01 || (oz < zz && r.z >= zz)) {
          if (s['hit' + r.k]) continue; s['hit' + r.k] = true;
          if (r.y < HO) { r.v = Math.max(3, r.v * .45); r.stun = .4; r.vy = 3; hitFx(E, r); if (r.me) E.ui.toast(pick(cfg.ouch || ['¡Plof! 💥', '¡Ay!']), '#ff9cc8'); }
          else if (r.pk) { r.boost = .9; r.perf++; r.expr = 'happy'; if (r.me) { Audio.sfxPlay('trick'); E.ui.toast(r.perf % 3 ? '¡Perfecto! ⚡' : '¡Racha perfecta! 🔥', '#ffe27a'); E.burst(r.obj.position.clone(), '#ffe27a', 14, 5, .5, .6); } }
        } }
        for (const u of this.PU) if (u.l === r.lane && !u['t' + r.k] && oz < u.z && r.z >= u.z) { u['t' + r.k] = true; if (r.me || Math.random() < .5 + r.skill * .4) { r.boost = 1.6; r.v += 2; if (r.me) { u.g.visible = false; Audio.sfxPlay('box'); E.ui.toast('⭐ ¡Turbo!', '#ffe27a'); } } }
        r.prog = clamp(r.z / L, 0, 1); if (r.z >= L) E.finish(r);
      }
    },
    render(E, dt) {
      const t = performance.now() / 1000;
      for (const s of this.S) { const near = s.z - E.me.z > -8 && s.z - E.me.z < 140; s.objs.forEach((o, l) => { o.visible = near; if (!near) return; o.position.z = -s.z; if (cfg.bob) o.position.y = Math.abs(Math.sin(t * 3 + s.ph + l * .4)) * cfg.bob; if (cfg.roll) o.rotation.x = -E.t * cfg.roll / (cfg.os || .7); else o.rotation.y = Math.sin(t * 2 + l + s.ph) * .3; }); }
      for (const u of this.PU) if (u.g.visible) { u.g.rotation.y = t * 2; u.g.position.y = 1 + Math.sin(t * 4 + u.l) * .2; }
      for (const r of E.racers) { const o = r.obj, run = r.y === 0 && r.v > .5 && r.stun <= 0, bob = run ? Math.abs(Math.sin(t * 15 + r.k)) * .14 : 0;
        o.position.set(lx(r.lane), r.y + bob, -r.z); o.userData.shadow.position.y = .03 - r.y - bob; squash(r, dt);
        o.userData.pivot.rotation.x = r.stun > 0 ? -.5 : r.jumps > 1 ? -E.t * 12 % 6.28 : -.12; o.userData.pivot.rotation.z = r.stun > 0 ? Math.sin(t * 20) * .3 : 0;
        if (r.boost > 0 && Math.random() < .5) E.burst(o.position.clone().add(v3(0, .5, .6)), '#ffe27a', 1, 2, .4, .5, 0); }
      const me = E.me; info(`⚡ Perfectos: ${me.perf}${cfg.double ? '<br>🦘 Doble salto: toca 2 veces' : ''}`);
      chaseCam(E, me, dt, lx(me.lane), 4.2 + me.y * .3, -me.z, me.boost > 0 ? 8 : 0); this.W.tick(dt, camera);
    }
  });
}

// =====================================================================
//  ESQUIVA — carretera de 5 carriles: izquierda/derecha para esquivar
// =====================================================================
export function esquiva(cfg) {
  const L = cfg.L || 260, V0 = cfg.v0 || 11, NL = 5;
  return base(cfg, {
    init(E) {
      const M = MUNDOS[cfg.mundo]; this.W = buildWorld(E, cfg.mundo, { track: { z0: 20, z1: -L - 40, half: 2.5 * LW } }); trackBase(E, M, 5, L, 2.5 * LW); setButtons('lr');
      $('bL').textContent = '⬅'; $('bR').textContent = '➡';
      this.R = []; let k = 0;
      for (let z = 30; z < L - 12; z += rnd(cfg.gap?.[0] || 13, cfg.gap?.[1] || 17), k++) {
        const d = clamp(z / L, 0, 1), nb = Math.random() < .3 + d * .5 ? 3 : 2, lanes = [0, 1, 2, 3, 4].sort(() => Math.random() - .5), blk = lanes.slice(0, nb);
        const row = { z, o: [] }; for (const l of blk) { const g = prop(pick(cfg.obs)); g.scale.multiplyScalar(cfg.os || .8); g.position.set(lx(l, NL), 0, -z); E.scene.add(g); row.o.push({ l, g, x0: lx(l, NL), ph: rnd(0, 6), x: lx(l, NL) }); if (cfg.sky) { const w = mesh(new THREE.RingGeometry(.8, 1.1, 24), new THREE.MeshBasicMaterial({ color: '#ff4f6a', transparent: true, opacity: .7 }), E.scene, [lx(l, NL), .05, -z], [-Math.PI / 2, 0, 0]); row.o[row.o.length - 1].w = w; } }
        const free = lanes.slice(nb); if (k % 2 === 0) { const l = pick(free), g = prop('estrella'); g.scale.setScalar(.45); g.position.set(lx(l, NL), 1, -z); E.scene.add(g); row.pu = { l, g }; }
        this.R.push(row);
      }
      racers(E); const st = [2, 1, 3, 0, 4, 2];
      E.racers.forEach((r, k) => { r.lane = st[k]; r.x = lx(r.lane, NL); r.z = k === 5 ? -1.5 : 0; r.v = 0; r.stun = 0; r.boost = 0; r.y = 0; r.dodges = 0; r.obj.rotation.y = Math.PI; });
    },
    ox(o, t) { return cfg.drift ? o.x0 + Math.sin(t * cfg.drift + o.ph) * LW * .55 : o.x0; },
    update(E, dt) {
      const t = E.t;
      for (const r of E.racers) {
        if (r.fin) { r.v = Math.max(0, r.v - 8 * dt); r.z += r.v * dt; continue; }
        if (r.stun > 0) { if ((r.stun -= dt) <= 0) r.expr = ''; } else r.v = Math.min(V0 + (r.boost > 0 ? 3.5 : 0), r.v + 7 * dt);
        if (r.boost > 0 && (r.boost -= dt) <= 0) r.expr = '';
        const nxt = this.R.find(w => w.z > r.z + .5);
        if (r.me && !E.AUTO) { for (const s of sideTaps(E)) { r.lane = clamp(r.lane + (s === 'L' ? -1 : 1), 0, NL - 1); Audio.sfxPlay('click'); } }
        else if (nxt) { const d = nxt.z - r.z, tc = t + d / Math.max(2, r.v); const S = sk(E, r);
          if (r.plan !== nxt && d < 8 + 8 * Math.min(1, S)) { r.plan = nxt; const blocked = l => nxt.o.some(o => Math.abs(this.ox(o, tc) - lx(l, NL)) < 1.35); 
            if (blocked(r.lane) && Math.random() < .5 + .48 * S) { let best = r.lane, bd = 9; for (let l = 0; l < NL; l++) if (!blocked(l) && Math.abs(l - r.lane) < bd) { bd = Math.abs(l - r.lane); best = l; } r.lane = best; }
            else if (nxt.pu && !blocked(nxt.pu.l) && Math.abs(nxt.pu.l - r.lane) === 1 && Math.random() < S * .6) r.lane = nxt.pu.l; } }
        r.x = lerp(r.x, lx(r.lane, NL), Math.min(1, dt * (cfg.slide || 13)));
        const oz = r.z; r.z += r.v * dt;
        for (const w of this.R) if (oz < w.z && r.z >= w.z) {
          const hit = w.o.find(o => Math.abs(this.ox(o, t) - r.x) < (cfg.hw || 1.15));
          if (hit) { r.v = Math.max(2, r.v * .35); r.stun = .55; hitFx(E, r); if (r.me) E.ui.toast(pick(cfg.ouch || ['¡Pumba! 💥']), '#ff9cc8'); }
          else { r.dodges++; if (w.pu && w.pu.l === r.lane) { r.boost = 1.8; r.v += 2; r.expr = 'happy'; if (r.me) { w.pu.g.visible = false; Audio.sfxPlay('box'); E.ui.toast('⭐ ¡Turbo!', '#ffe27a'); } } }
        }
        r.prog = clamp(r.z / L, 0, 1); if (r.z >= L) E.finish(r);
      }
    },
    render(E, dt) {
      const t = performance.now() / 1000, et = E.t, me = E.me;
      for (const w of this.R) { const dz = w.z - me.z, near = dz > -8 && dz < 140; for (const o of w.o) { o.g.visible = near; if (o.w) o.w.visible = near && dz > 0; if (!near) continue; o.g.position.x = this.ox(o, et); if (o.w) o.w.position.x = o.g.position.x;
        o.g.position.y = cfg.sky ? clamp((dz - 6) * 1.6, 0, 40) : cfg.bounce ? Math.abs(Math.sin(t * 4 + o.ph)) * cfg.bounce : 0; o.g.rotation.y = cfg.spin ? t * cfg.spin : Math.sin(t * 2 + o.ph) * .3; if (cfg.rollx) o.g.rotation.z = -t * 3; }
        if (w.pu && w.pu.g.visible) { w.pu.g.rotation.y = t * 2; w.pu.g.position.y = 1 + Math.sin(t * 4) * .2; } }
      for (const r of E.racers) { const o = r.obj, run = r.v > .5 && r.stun <= 0, bob = run ? Math.abs(Math.sin(t * 15 + r.k)) * .14 : 0;
        o.position.set(r.x + (r.k % 2 ? .25 : -.25) * (r.me ? 0 : 1), bob, -r.z); squash(r, dt);
        o.userData.pivot.rotation.z = (r.x - lx(r.lane, NL)) * .25 + (r.stun > 0 ? Math.sin(t * 20) * .3 : 0); o.userData.pivot.rotation.x = r.stun > 0 ? -.5 : -.12;
        if (r.boost > 0 && Math.random() < .5) E.burst(o.position.clone().add(v3(0, .5, .6)), '#ffe27a', 1, 2, .4, .5, 0); }
      info(`🛡️ Esquivados: ${me.dodges}${me.boost > 0 ? '<br>⭐ ¡Turbo!' : ''}`);
      chaseCam(E, me, dt, me.x, 4.4, -me.z, me.boost > 0 ? 8 : 0); this.W.tick(dt, camera);
    }
  });
}

// =====================================================================
//  MACHACA — alterna ⬅ ➡ (o toca izquierda/derecha de la pantalla) para avanzar montado en algo absurdo
// =====================================================================
export function machaca(cfg) {
  const L = cfg.L || 250, VM = cfg.vmax || 12, GAIN = cfg.gain || 1.25;
  return base(cfg, {
    init(E) {
      const M = MUNDOS[cfg.mundo]; this.W = buildWorld(E, cfg.mundo, { track: { z0: 20, z1: -L - 40, half: 3 * LW } }); trackBase(E, M, 6, L, 3 * LW); setButtons('lr');
      $('bL').textContent = cfg.bl || '🦶'; $('bR').textContent = cfg.br || '🦶';
      this.pads = []; for (let z = 30; z < L - 10; z += 32) for (let l = 0; l < 6; l++) { const g = mesh(new THREE.CircleGeometry(.9, 24), GL('#ffe27a', .7), E.scene, [lx(l), .04, -z], [-Math.PI / 2, 0, 0]); this.pads.push({ z, l, g }); }
      racers(E, .5); E.racers.forEach((r, k) => { r.lane = r.me ? 2 : [0, 1, 3, 4, 5][k - 1]; r.z = 0; r.v = 0; r.last = ''; r.tt = rnd(0, .3); r.boost = 0; r.tap = 0; r.rhythm = 0; r.lt = 0; r.y = 0;
        if (cfg.ride) { const m = prop(cfg.ride); m.scale.multiplyScalar(cfg.rs || .6); m.rotation.y = 0; r.obj.add(m); r.ride = m; r.obj.userData.pivot.position.y = cfg.ry || 1.1; }
        r.obj.rotation.y = Math.PI; });
    },
    update(E, dt) {
      for (const r of E.racers) {
        if (r.fin) { r.v = Math.max(0, r.v - 6 * dt); r.z += r.v * dt; continue; }
        let taps = [];
        if (r.me && !E.AUTO) taps = sideTaps(E);
        else { r.tt -= dt; if (r.tt <= 0) { const s = sk(E, r); r.tt = 1 / (3.6 + 3.4 * s) * rnd(.8, 1.3); taps = [Math.random() < .1 * (1.1 - Math.min(1, s)) ? r.last || 'L' : (r.last === 'L' ? 'R' : 'L')]; } }
        for (const s of taps) { const good = s !== r.last; const it = E.t - r.lt; r.lt = E.t; r.rhythm = good && it < .4 ? Math.min(1, r.rhythm + .12) : Math.max(0, r.rhythm - .3);
          r.v = Math.min(VM + (r.boost > 0 ? 4 : 0), r.v + (good ? GAIN : GAIN * .25)); r.last = s; r.tap = .15; if (r.me) Audio.sfxPlay(good ? 'tick' : 'bump'); if (!good && r.me) E.ui.toast('¡Alterna ⬅ ➡!', '#fff'); }
        r.v = Math.max(0, r.v - (1.6 + r.v * .22) * dt); if (r.boost > 0) r.boost -= dt;
        const oz = r.z; r.z += r.v * dt * (1 + r.rhythm * .25);
        for (const p of this.pads) if (p.l === r.lane && oz < p.z && r.z >= p.z) { r.boost = 1.5; r.v += 3; r.expr = 'happy'; setTimeout(() => r.expr = '', 900); if (r.me) { Audio.sfxPlay('boost'); E.ui.toast(cfg.padTxt || '⚡ ¡Acelerón!', '#ffe27a'); E.burst(r.obj.position.clone(), '#ffe27a', 16, 6, .5, .6); } }
        r.prog = clamp(r.z / L, 0, 1); if (r.z >= L) E.finish(r);
      }
    },
    render(E, dt) {
      const t = performance.now() / 1000, me = E.me;
      for (const r of E.racers) { const o = r.obj; r.tap = Math.max(0, r.tap - dt); const hop = cfg.hop ? Math.abs(Math.sin(r.z * .9)) * cfg.hop : 0;
        o.position.set(lx(r.lane), hop, -r.z); o.userData.pivot.rotation.x = -.15 - r.tap * 1.2; o.userData.pivot.rotation.z = (r.last === 'L' ? .12 : -.12) * (r.tap > 0 ? 1 : .3);
        if (r.ride) { r.ride.rotation.z = Math.sin(r.z * 1.2) * .08; r.ride.position.y = Math.abs(Math.sin(r.z * 1.5)) * .1; }
        if (r.boost > 0 && Math.random() < .6) E.burst(o.position.clone().add(v3(0, .6, .8)), cfg.trail || '#ffe27a', 1, 2, .4, .6, 0); }
      info(`🎵 Ritmo: ${'●'.repeat(Math.round(me.rhythm * 5))}${'○'.repeat(5 - Math.round(me.rhythm * 5))}<br>🚀 ${(me.v * 3.6).toFixed(0)} km/h`);
      chaseCam(E, me, dt, lx(me.lane), 4.6, -me.z, me.boost > 0 ? 8 : 0); this.W.tick(dt, camera);
    }
  });
}

// =====================================================================
//  VUELO — toca para aletear/subir, cruza los aros (acelerón) y esquiva lo que flota
// =====================================================================
export function vuelo(cfg) {
  const L = cfg.L || 260, V0 = cfg.v0 || 10, G = cfg.grav || 11, FL = cfg.flap || 5.2;
  return base(cfg, {
    init(E) {
      const M = MUNDOS[cfg.mundo]; this.W = buildWorld(E, cfg.mundo, { track: { z0: 20, z1: -L - 40, half: 3 * LW } }); setButtons(null);
      arch(E.scene, 0, 3 * LW, 'SALIDA', '#9b82f0'); arch(E.scene, -L, 3 * LW, '¡META!', '#ff6fae'); arch(E.scene, -L, 3 * LW, '¡META!', '#ff6fae').position.y = 7.5;
      this.rings = []; let h = 4; for (let z = 22; z < L - 8; z += rnd(12, 16)) { h = clamp(h + rnd(-2.6, 2.6), 2, 9.5); const row = { z, h, g: [] }; for (let l = 0; l < 6; l++) { const g = mesh(TOR(), l === 2 ? GL(cfg.ring || '#ffd84a', .5) : (this.rm || (this.rm = toon(cfg.ring || '#ffd84a', { opacity: .35, rim: .3, emissive: cfg.ring || '#ffd84a', ei: .3 }))), E.scene, [lx(l), h, -z], null, l === 2 ? [1.05, 1.05, 1.3] : [.8, .8, 1]); row.g.push(g); } this.rings.push(row); }
      this.haz = []; if (cfg.haz) for (let i = 1; i < this.rings.length; i += 2) { const a = this.rings[i - 1], b = this.rings[i]; const z = (a.z + b.z) / 2, hh = (a.h + b.h) / 2 + pick([-2.4, 2.4]); const row = { z, h: clamp(hh, 1, 11), g: [] }; for (let l = 0; l < 6; l++) { const g = prop(cfg.haz); g.scale.multiplyScalar(.6); g.position.set(lx(l), row.h, -z); E.scene.add(g); row.g.push(g); } this.haz.push(row); }
      racers(E, .5); E.racers.forEach((r, k) => { r.lane = r.me ? 2 : [0, 1, 3, 4, 5][k - 1]; r.z = 0; r.y = 3; r.vy = 0; r.v = 0; r.boost = 0; r.stun = 0; r.rings = 0; r.ft = 0; r.flap = 0;
        if (cfg.ride) { const m = prop(cfg.ride); m.scale.multiplyScalar(cfg.rs || .9); m.position.y = cfg.ry || 1.6; r.obj.add(m); r.ride = m; } r.obj.rotation.y = Math.PI; });
    },
    update(E, dt) {
      for (const r of E.racers) {
        if (r.fin) { r.v = Math.max(0, r.v - 6 * dt); r.z += r.v * dt; r.y = lerp(r.y, 1, dt); continue; }
        if (r.stun > 0) r.stun -= dt; else r.v = Math.min(V0 + (r.boost > 0 ? 4 : 0), r.v + 6 * dt); if (r.boost > 0) r.boost -= dt;
        let fl = false; const nx = this.rings.find(w => w.z > r.z + .3);
        if (r.me && !E.AUTO) fl = E.taps.length > 0 || E.swipe;
        else { const S = sk(E, r); r.ft -= dt; if (nx && r.plan !== nx) { r.plan = nx; r.err = (Math.random() < .5 + .48 * Math.min(1, S)) ? rnd(-.3, .3) : rnd(-2.2, 2.2); }
          const ty = (nx ? nx.h : 4) + (r.err || 0) - .5 - FL * FL / (4 * G); if (r.y + r.vy * .25 < ty && r.ft <= 0) { fl = true; r.ft = .16; } }
        if (fl) { r.vy = FL; r.flap = .25; if (r.me) Audio.sfxPlay('jump'); }
        r.vy -= G * dt; r.vy = Math.max(r.vy, -9); r.y += r.vy * dt; if (r.y < .6) { r.y = .6; r.vy = 2.5; r.v *= .97; } if (r.y > 12.5) { r.y = 12.5; r.vy = Math.min(0, r.vy); }
        const oz = r.z; r.z += r.v * dt;
        for (const w of this.rings) if (oz < w.z && r.z >= w.z) { if (Math.abs(r.y + .5 - w.h) < 1.1) { r.boost = 1.6; r.v += 3.5; r.rings++; r.expr = 'happy'; if (r.me) { Audio.sfxPlay('level', 1 + r.rings * .03); E.ui.toast(r.rings % 5 ? '¡Aro! ✨' : `¡${r.rings} aros! 🔥`, '#ffe27a'); E.burst(v3(lx(r.lane), w.h, -w.z), cfg.ring || '#ffd84a', 16, 5, .5, .6, 0); } } else r.expr = ''; }
        for (const w of this.haz) if (oz < w.z && r.z >= w.z && Math.abs(r.y + .5 - w.h) < 1.15) { r.v *= .4; r.stun = .5; r.vy = -2; hitFx(E, r); if (r.me) E.ui.toast(cfg.ouch || '¡Choque! 💫', '#ff9cc8'); }
        r.prog = clamp(r.z / L, 0, 1); if (r.z >= L) E.finish(r);
      }
    },
    render(E, dt) {
      const t = performance.now() / 1000, me = E.me;
      for (const w of this.rings) { const dz = w.z - me.z, near = dz > -6 && dz < 140; w.g.forEach((g, l) => { g.visible = near; g.rotation.z = t; }); }
      for (const w of this.haz) { const dz = w.z - me.z, near = dz > -6 && dz < 140; w.g.forEach((g, l) => { g.visible = near; g.position.y = w.h + Math.sin(t * 2 + l) * .25; g.rotation.y = t; }); }
      for (const r of E.racers) { const o = r.obj; r.flap = Math.max(0, r.flap - dt); o.position.set(lx(r.lane), r.y, -r.z); o.userData.pivot.rotation.x = clamp(-r.vy * .06, -.6, .5); o.userData.pivot.rotation.z = r.stun > 0 ? Math.sin(t * 20) * .4 : 0; o.userData.shadow.position.y = .03 - r.y; o.userData.shadow.scale.setScalar(.5);
        const s = r.sc * (1 + r.flap * .6); o.userData.pivot.scale.set(s, r.sc * (1 - r.flap * .4), s);
        if (r.ride) { r.ride.rotation.z = Math.sin(t * 14) * (r.flap > 0 ? .5 : .1); r.ride.scale.y = (cfg.rs || .9) * (1 - r.flap); }
        if (r.boost > 0 && Math.random() < .6) E.burst(o.position.clone().add(v3(0, .4, .6)), cfg.ring || '#ffd84a', 1, 2, .4, .6, 0); }
      info(`💫 Aros: ${me.rings}`);
      const port = innerHeight > innerWidth; E._cy = lerp(E._cy || 4, me.y, Math.min(1, dt * 4));
      chaseCam(E, me, dt, lx(me.lane), E._cy + 1.6, -me.z, me.boost > 0 ? 8 : 0, 9); camera.lookAt(lx(me.lane) * .5, E._cy * .8, -me.z - 9); this.W.tick(dt, camera);
    }
  });
}

// =====================================================================
//  PUNTERÍA — barra que oscila: toca cuando la aguja esté en la zona verde. 6 tiros.
// =====================================================================
export function punteria(cfg) {
  const RND = cfg.rounds || 6;
  return base(cfg, { mode: 'puntos', maxT: 90,
    init(E) {
      this.W = buildWorld(E, cfg.mundo, { arena: { r: 22 } }); setButtons(null);
      const sp = LW * 1.5; this.sp = sp; const M = MUNDOS[cfg.mundo];
      mesh(new THREE.PlaneGeometry(sp * 6 + 2, 26), T(M.alt, { rim: 0 }), E.scene, [0, .01, -8], [-Math.PI / 2, 0, 0]);
      this.tg = []; for (let l = 0; l < 6; l++) { const g = prop(cfg.target); g.scale.multiplyScalar(cfg.ts || 1); g.position.set((l - 2.5) * sp, cfg.ty || 0, -(cfg.dist || 15)); E.scene.add(g); const d = prop('diana'); d.scale.setScalar(.5); d.position.set(0, (cfg.dy || 1.4) / (cfg.ts || 1), .9); g.add(d); this.tg.push(g); }
      racers(E, .6); E.racers.forEach((r, k) => { r.lane = r.me ? 2 : [0, 1, 3, 4, 5][k - 1]; r.x = (r.lane - 2.5) * sp; r.score = 0; r.rd = 0; r.wait = rnd(.5, 1.2); r.proj = null; r.hits = 0; r.y = 0; r.obj.position.set(r.x, 0, 0); r.obj.rotation.y = Math.PI; });
      // la barra de puntería
      let m = $('meter'); if (!m) { m = document.createElement('div'); m.id = 'meter'; m.innerHTML = '<div class="mz"></div><div class="mz2"></div><i></i><b></b><span></span>'; $('hud').appendChild(m); } this.m = m; m.style.display = 'block';
      this.mk = 0; this.newRound(E.me);
    },
    newRound(r) { r.zone = cfg.wind ? rnd(-.3, .3) : 0; r.zw = clamp((cfg.zw || .2) - r.rd * .012, .1, .3); r.ph = rnd(0, 6); if (r.me) { const z = this.m.querySelector('.mz'), z2 = this.m.querySelector('.mz2'); z.style.left = (50 + (r.zone - r.zw) * 50) + '%'; z.style.width = (r.zw * 100) + '%'; z2.style.left = (50 + (r.zone - r.zw * .35) * 50) + '%'; z2.style.width = (r.zw * 35) + '%'; this.m.querySelector('span').textContent = cfg.wind ? (r.zone > .05 ? 'Viento ➡' : r.zone < -.05 ? '⬅ Viento' : 'Sin viento') : `Tiro ${Math.min(RND, r.rd + 1)}/${RND}`; } },
    needle(r, t) { const sp = (cfg.speed || 1.1) + r.rd * .12; return Math.sin(t * sp * Math.PI + r.ph); },
    open(t) { return !cfg.mouth || Math.sin(t * 2.6) > 0; },
    tx(l, t) { const b = (l - 2.5) * this.sp; return b + (cfg.move === 'lateral' ? Math.sin(t * 1.3 + l) * 1.6 : 0); },
    update(E, dt) {
      const t = E.t;
      for (const r of E.racers) {
        if (r.proj) { const p = r.proj; p.t += dt / .75; const k = Math.min(1, p.t); p.g.position.set(lerp(p.a.x, p.b.x, k), lerp(p.a.y, p.b.y, k) + Math.sin(k * Math.PI) * 3.5, lerp(p.a.z, p.b.z, k)); p.g.rotation.x += dt * 10;
          if (k >= 1) { E.scene.remove(p.g); r.proj = null; const pts = p.pts * (cfg.mouth && p.open && p.pts ? 2 : 1); r.score += pts; r.hits += pts > 0; this.tg[r.lane].userData.wob = pts ? .6 : 0;
            if (pts) { E.burst(p.b.clone(), pts >= 3 ? '#ffe27a' : '#7ee3c4', 6 + pts * 5, 6, .6, .7); r.expr = 'happy'; } else r.expr = 'squash';
            if (r.me) { Audio.sfxPlay(pts >= 3 ? 'trick' : pts ? 'got' : 'bump'); E.ui.toast(pts >= 6 ? '¡SÚPER DIANA x2! 🔥 +' + pts : pts >= 3 ? '¡DIANA! 🎯 +' + pts : pts ? '¡Bien! +' + pts : '¡Fallo! 😅', pts >= 3 ? '#ffe27a' : '#fff'); if (pts >= 3) E.shake = .2; }
            else if (pts === 0) say(E, r, pick(['¡El viento!', '¡Se me ha resbalado!', 'Eso no contaba.']));
            r.rd++; r.wait = .7; setTimeout(() => { if (r.expr !== '') r.expr = ''; }, 800); } }
        if (r.rd >= RND || r.proj) continue;
        if (r.wait > 0) { r.wait -= dt; if (r.wait <= 0) this.newRound(r); continue; }
        let throwNow = false; const n = this.needle(r, t), err = Math.abs(n - r.zone);
        if (r.me && !E.AUTO) throwNow = E.taps.length > 0 || E.swipe;
        else { const S = sk(E, r); if (r.aim == null) { r.aim = Math.random() < .35 + .55 * Math.min(1, S) ? rnd(0, r.zw * .4) : rnd(r.zw * .5, r.zw * 1.6); r.tw = rnd(.6, 2.2); } r.tw -= dt; if (r.tw <= 0 && err < r.aim + .02 && (!cfg.mouth || this.open(t + .75) || Math.random() < .02)) throwNow = true; if (r.tw < -4) throwNow = true; }
        if (throwNow) { r.aim = null; const pts = err < r.zw * .35 ? 3 : err < r.zw ? 2 : err < r.zw * 1.8 ? 1 : 0; const g = prop(cfg.proj); g.scale.multiplyScalar(cfg.ps || .9); E.scene.add(g);
          const tb = this.tg[r.lane], off = pts >= 3 ? 0 : pts ? (n > r.zone ? 1 : -1) * rnd(.4, .9) : (n > r.zone ? 1 : -1) * rnd(1.8, 2.6);
          r.proj = { g, t: 0, pts, open: this.open(t + .75), a: v3(r.x, 1.4, -.5), b: v3(this.tx(r.lane, t + .75) + off, (cfg.ty || 0) + (cfg.dy || 1.4) + (pts ? 0 : 1), tb.position.z + 1) }; r.throwA = .3; if (r.me) Audio.sfxPlay('throw'); }
      }
      E.racers.forEach(r => r.prog = clamp(r.score / (RND * (cfg.mouth ? 6 : 3)), 0, 1));
      if (E.racers.every(r => r.rd >= RND && !r.proj) && !this.done) { this.done = true; setTimeout(() => scoreFinish(E), 600); }
    },
    render(E, dt) {
      const t = performance.now() / 1000, et = E.t, me = E.me;
      this.tg.forEach((g, l) => { g.position.x = this.tx(l, et); if (cfg.move === 'updown') g.position.y = (cfg.ty || 0) + Math.abs(Math.sin(et * 1.6 + l)) * .8; const w = g.userData.wob || 0; g.rotation.z = Math.sin(t * 20) * w; g.userData.wob = Math.max(0, w - dt); if (cfg.mouth) g.scale.y = (cfg.ts || 1) * (this.open(et) ? 1.12 : .95); });
      for (const r of E.racers) { r.throwA = Math.max(0, (r.throwA || 0) - dt); r.obj.userData.pivot.rotation.x = r.throwA > 0 ? r.throwA * 2.4 : 0; r.obj.position.y = r.expr === 'happy' ? Math.abs(Math.sin(t * 10)) * .4 : 0; squash(r, dt); }
      const n = this.needle(me, et); this.m.querySelector('i').style.left = (50 + n * 50) + '%'; this.m.querySelector('b').textContent = cfg.mouth ? (this.open(et) ? '😮 ¡BOCA ABIERTA x2!' : '😶 boca cerrada') : '';
      this.m.style.opacity = me.rd >= RND ? .3 : 1;
      info(`🎯 Puntos: ${me.score}<br>Tiro ${Math.min(RND, me.rd + 1)}/${RND}`);
      const port = innerHeight > innerWidth; camera.fov = port ? 70 : 55; camera.updateProjectionMatrix(); camera.position.set(me.x * .9, port ? 4.6 : 3.8, port ? 7.5 : 6); camera.lookAt(me.x * .9, 1.8, -12); this.W.tick(dt, camera);
    },
    dispose() { const d = $('perf'); if (d) d.remove(); const m = $('meter'); if (m) m.style.display = 'none'; }
  });
}

// =====================================================================
//  ARENA (común a recoge, superv y empuje): plataforma redonda, joystick táctil
// =====================================================================
function arena(E, cfg, R, color) {
  const M = MUNDOS[cfg.mundo]; const W = buildWorld(E, cfg.mundo, { arena: { r: R + 2 } });
  const p = mesh(new THREE.CylinderGeometry(R, R * .92, 1.2, 48), T(color || M.alt, { rim: .3 }), E.scene, [0, -.6, 0]); outline(p, '#5a3a6e', 1.01);
  mesh(new THREE.RingGeometry(R - .3, R, 48), T(M.line, { rim: 0 }), E.scene, [0, .02, 0], [-Math.PI / 2, 0, 0]);
  return { W, p };
}
function arenaCam(E, me, dt, R) { const port = innerHeight > innerWidth; const tx = (me.x || 0) * .45, tz = (me.z || 0) * .45; E._ax = lerp(E._ax ?? tx, tx, Math.min(1, dt * 3)); E._az = lerp(E._az ?? tz, tz, Math.min(1, dt * 3));
  camera.fov = port ? 72 : 52; camera.updateProjectionMatrix(); camera.position.set(E._ax, R * (port ? 1.45 : 1.0) + 2, E._az + R * (port ? 1.1 : 1.0) + 3); camera.lookAt(E._ax, 0, E._az + (port ? 1.2 : -1)); }
function moveRacer(r, dir, dt, sp, acc) { const want = Math.hypot(dir.x, dir.z) > .05, a = want ? acc : acc * 1.4; r.vx = lerp(r.vx, dir.x * sp, Math.min(1, dt * a)); r.vz = lerp(r.vz, dir.z * sp, Math.min(1, dt * a)); r.x += r.vx * dt; r.z += r.vz * dt; if (want && Math.hypot(dir.x, dir.z) > .15) r.face = Math.atan2(dir.x, dir.z); else if (Math.hypot(r.vx, r.vz) > .8) r.face = Math.atan2(r.vx, r.vz); }
function separate(rs, d0 = 1) { for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j]; if (a.out || b.out) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < d0 && d > 1e-4) { const k = (d0 - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; } } }
function poseArena(E, r, t, dt) { const o = r.obj, mv = Math.hypot(r.vx, r.vz) > .5 && !r.out, bob = mv ? Math.abs(Math.sin(t * 14 + r.k)) * .14 : 0; o.position.set(r.x, (r.y || 0) + bob, r.z); { let da = (r.face ?? 0) - o.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); o.rotation.y += da * Math.min(1, dt * 12); } o.userData.shadow.visible = !r.out; o.userData.shadow.position.y = .03 - (r.y || 0) - bob; squash(r, dt); o.userData.pivot.rotation.z = r.stun > 0 ? Math.sin(t * 20) * .3 : 0; }
function initArenaRacers(E, R, sc = .55) { racers(E, sc); E.racers.forEach((r, k) => { const a = k / E.racers.length * 6.28 + Math.PI / 2; r.x = Math.cos(a) * R * .55; r.z = Math.sin(a) * R * .55; r.vx = r.vz = 0; r.y = 0; r.vy = 0; r.stun = 0; r.out = false; r.score = 0; r.face = Math.atan2(-r.x, -r.z); r.obj.rotation.y = r.face; }); }

// =====================================================================
//  RECOGE — muévete con el dedo (joystick) y coge todo lo bueno antes que nadie
// =====================================================================
export function recoge(cfg) {
  const R = cfg.R || 12, TT = cfg.T || 40;
  return base(cfg, { mode: 'puntos', maxT: TT + 5,
    init(E) { this.A = arena(E, cfg, R, cfg.floor); setButtons(null); initArenaRacers(E, R); this.items = []; this.sp = 0; for (let i = 0; i < 9; i++) this.spawn(E, true); },
    spawn(E, now) { const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * (R - 1.4), gold = Math.random() < .12, bad = cfg.bad && !gold && Math.random() < .25;
      const g = prop(bad ? cfg.bad : cfg.item); g.scale.multiplyScalar(gold ? .75 : .55); if (gold) g.add(glowSprite('#ffd84a', 3, .8)); E.scene.add(g);
      const it = { x: Math.cos(a) * d, z: Math.sin(a) * d, y: cfg.fall && !now ? 14 : .9, g, v: gold ? 3 : 1, bad, ph: rnd(0, 6) }; g.position.set(it.x, it.y, it.z);
      if (cfg.fall) { it.sh = mesh(new THREE.CircleGeometry(.6, 16), new THREE.MeshBasicMaterial({ color: '#3a2050', transparent: true, opacity: .25 }), E.scene, [it.x, .03, it.z], [-Math.PI / 2, 0, 0]); }
      this.items.push(it); },
    update(E, dt) {
      const t = E.t, left = TT - t;
      if (left <= 0) { if (!this.done) { this.done = true; scoreFinish(E); } return; }
      for (const it of this.items) if (it.y > .9) it.y = Math.max(.9, it.y - (cfg.fall || 8) * dt);
      for (const r of E.racers) {
        if (r.stun > 0) { r.stun -= dt; if (r.stun <= 0) r.expr = ''; moveRacer(r, { x: 0, z: 0 }, dt, 0, 6); continue; }
        let dir;
        if (r.me && !E.AUTO) dir = stickDir(E);
        else { const S = sk(E, r); r.rt = (r.rt || 0) - dt; if (r.rt <= 0 || !this.items.includes(r.tg)) { r.rt = rnd(.25, .9) * (1.3 - Math.min(1, S)); let best = null, bv = -1; for (const it of this.items) { if (it.bad) continue; const d = Math.hypot(it.x - r.x, it.z - r.z) + rnd(0, 4 * (1.2 - Math.min(1, S))); const v = it.v / (d + 1.5); if (v > bv) { bv = v; best = it; } } r.tg = best; }
          dir = { x: 0, z: 0 }; if (r.tg) { const dx = r.tg.x - r.x, dz = r.tg.z - r.z, d = Math.hypot(dx, dz) || 1; dir = { x: dx / d, z: dz / d }; }
          for (const it of this.items) if (it.bad && it.y < 2) { const dx = r.x - it.x, dz = r.z - it.z, d = Math.hypot(dx, dz); if (d < 2.2 && Math.random() < .3 + .7 * Math.min(1, S)) { dir.x += dx / d * 1.5; dir.z += dz / d * 1.5; } }
          const m = Math.hypot(dir.x, dir.z) || 1; const f = r.me ? 1 : .8 + .18 * Math.min(1, S); dir.x = dir.x / m * f; dir.z = dir.z / m * f; }
        moveRacer(r, dir, dt, cfg.speed || 7, cfg.ice ? 2.6 : 12);
        const d = Math.hypot(r.x, r.z); if (d > R - .6) { r.x *= (R - .6) / d; r.z *= (R - .6) / d; }
        for (let i = this.items.length - 1; i >= 0; i--) { const it = this.items[i]; if (it.y > 1.6) continue; if (Math.hypot(it.x - r.x, it.z - r.z) < 1.15) { this.items.splice(i, 1); E.scene.remove(it.g); if (it.sh) E.scene.remove(it.sh);
          if (it.bad) { r.score = Math.max(0, r.score - 1); r.stun = 1; hitFx(E, r, '#7fd86a'); if (r.me) E.ui.toast(cfg.badTxt || '¡Puaj! −1', '#7fd86a'); }
          else { r.score += it.v; r.expr = 'happy'; setTimeout(() => { if (r.expr === 'happy') r.expr = ''; }, 500); E.burst(v3(it.x, 1, it.z), it.v > 1 ? '#ffd84a' : '#ffffff', it.v > 1 ? 20 : 8, 4, .5, .5); if (r.me) { Audio.sfxPlay(it.v > 1 ? 'trick' : 'got'); if (it.v > 1) E.ui.toast('¡DORADO! +3 ✨', '#ffe27a'); } } } }
      }
      separate(E.racers, 1);
      this.sp -= dt; const want = 9 + Math.floor(t / 10); if (this.items.length < want && this.sp <= 0) { this.spawn(E); this.sp = .25; }
      const best = Math.max(1, ...E.racers.map(r => r.score)); E.racers.forEach(r => r.prog = clamp(r.score / (best * 1.15), 0, 1) * .99);
    },
    render(E, dt) { const t = performance.now() / 1000, me = E.me;
      for (const it of this.items) { it.g.position.set(it.x, it.y + (it.y <= .9 ? Math.sin(t * 3 + it.ph) * .15 : 0), it.z); it.g.rotation.y = t * 2 + it.ph; if (it.sh) it.sh.scale.setScalar(it.y > 1 ? .5 + (14 - it.y) / 14 : 1); }
      for (const r of E.racers) poseArena(E, r, t, dt);
      info(`${cfg.icon} Puntos: ${me.score}<br>⏱️ ${Math.max(0, TT - E.t).toFixed(0)} s`); arenaCam(E, me, dt, R); this.A.W.tick(dt, camera); }
  });
}

// =====================================================================
//  SUPERVIVENCIA — lluvia de cosas (sombras rojas), baldosas que caen o barrido giratorio
// =====================================================================
export function superv(cfg) {
  const R = cfg.R || 11, TT = cfg.T || 45, MODE = cfg.modo;
  return base(cfg, { mode: 'puntos', maxT: TT + 6,
    init(E) {
      setButtons(MODE === 'barrido' ? 'm' : null); if (MODE === 'barrido') $('bM').textContent = '⤴';
      if (MODE === 'baldosas') { const M = MUNDOS[cfg.mundo]; this.W = buildWorld(E, cfg.mundo, { arena: { r: R + 3 } }); this.tiles = []; const s = 2.2;
        this.W.ground.position.y = -6; this.W.spots.visible = false; this.W.deco.forEach(d => d.position.y = -2.5); this.W.rich.sets.forEach(q => q.im.position.y = -2.5); if (cfg.under) mesh(new THREE.CircleGeometry(R + 60, 40), GL(cfg.under, .55), E.scene, [0, -2.5, 0], [-Math.PI / 2, 0, 0]);
        for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) { const x = i * s, z = j * s; if (Math.hypot(x, z) > R) continue; const m = mesh(BOX(), T((i + j) % 2 ? M.alt : (cfg.tile || M.ground), { rim: .3 }), E.scene, [x, -.3, z], null, [s - .12, .6, s - .12]); this.tiles.push({ x, z, m, st: 0, sh: 0, y: -.3 }); } this.ts = s; }
      else this.A = arena(E, cfg, R, cfg.floor);
      initArenaRacers(E, R); E.racers.forEach(r => { r.hp = 3; r.inv = 0; });
      if (MODE === 'barrido') { E.racers.forEach((r, k) => { const a = k / 6 * 6.28; r.x = Math.cos(a) * R * .6; r.z = Math.sin(a) * R * .6; r.face = Math.atan2(-r.x, -r.z); });
        this.arm = new THREE.Group(); E.scene.add(this.arm); const c = prop(cfg.obj || 'reloj'); c.scale.setScalar(1.6); c.rotation.x = -Math.PI / 2; c.position.set(0, .25, 1.6); this.arm.add(c); const bar = mesh(BOX(), T(cfg.armc || '#ff6fae'), this.arm, [R / 2, .45, 0], null, [R, .5, .5]); outline(bar); for (let i = 1; i < 5; i++) mesh(SPHL(), GL('#ffe27a', .5), this.arm, [i * R / 5, .8, 0], null, .2); this.ang = 0; this.av = cfg.av || 1.4;
        this.arm2 = null; }
      this.drops = []; this.next = 1.5; this.cnt = 0;
    },
    kill(E, r, why) { if (r.out) return; r.out = true; r.score = E.t; r.label = `Aguantó ${E.t.toFixed(1)} s`; r.vy = 7; r.expr = 'squash'; E.burst(v3(r.x, 1, r.z), '#ff9cc8', 20, 6, .6, .7); if (r.me) { Audio.sfxPlay('squash'); E.ui.banner('¡Eliminado! 😵'); this.meOut = E.t; } else say(E, r, pick(['¡Nooo!', '¡Adiós, mundo cruel!', '¡Volveré!'])); },
    hurt(E, r, fromx, fromz) { if (r.inv > 0 || r.out) return; r.hp--; r.inv = 1.4; r.stun = .5; const dx = r.x - fromx, dz = r.z - fromz, d = Math.hypot(dx, dz) || 1; r.vx = dx / d * 7; r.vz = dz / d * 7; hitFx(E, r); if (r.me) E.ui.toast(r.hp > 0 ? `¡Ay! ❤️ x${r.hp}` : '', '#ff9cc8'); if (r.hp <= 0) this.kill(E, r); },
    update(E, dt) {
      const t = E.t, alive = E.racers.filter(r => !r.out);
      if (!this.done && (t >= TT || alive.length <= 1 || (this.meOut != null && t - this.meOut > 1.6))) { this.done = true; alive.forEach(r => r.label = '¡Superviviente! 🛡️'); alive.forEach(r => r.score = TT + 10 + r.hp + (MODE === 'baldosas' ? -Math.hypot(r.x, r.z) * .01 : 0)); E.racers.forEach(r => { if (!r.out && r.score < TT) r.score = TT; }); scoreFinish(E); return; }
      if (this.done) return;
      const k = clamp(t / TT, 0, 1);
      // amenazas
      if (MODE === 'lluvia') { this.next -= dt; if (this.next <= 0) { this.next = lerp(.9, .3, k) ; const tg = Math.random() < .6 ? pick(alive) : null; const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * (R - 1); const x = tg ? tg.x + rnd(-1.2, 1.2) : Math.cos(a) * d, z = tg ? tg.z + rnd(-1.2, 1.2) : Math.sin(a) * d;
          const w = mesh(new THREE.RingGeometry(.2, 1.5, 28), new THREE.MeshBasicMaterial({ color: '#ff3a5a', transparent: true, opacity: .55, depthWrite: false }), E.scene, [x, .04, z], [-Math.PI / 2, 0, 0]); const g = prop(cfg.obj); g.scale.multiplyScalar(cfg.os || .9); g.position.set(x, 30, z); E.scene.add(g); this.drops.push({ x, z, t: 0, w, g, T: lerp(1.5, 1.0, k), n: {} }); if (tg && k > .3 && Math.random() < .35) this.next = .05; } }
      if (MODE === 'baldosas') { this.next -= dt; if (this.next <= 0) { this.next = lerp(1.4, .6, k); const st = this.tiles.filter(q => q.st === 0); const n = Math.min(st.length - 4, 1 + Math.floor(k * 2.5)); for (let i = 0; i < n; i++) { let q; if (Math.random() < .4) { const r = pick(alive); q = st.reduce((b, c) => Math.hypot(c.x - r.x, c.z - r.z) < Math.hypot(b.x - r.x, b.z - r.z) ? c : b, st[0]); } else q = pick(st); if (q && q.st === 0) { q.st = 1; q.sh = cfg.warn || 1.9; } } } 
        for (const q of this.tiles) if (q.st === 1 && (q.sh -= dt) <= 0) { q.st = 2; if (Math.hypot(q.x - E.me.x, q.z - E.me.z) < 6) Audio.sfxPlay('pop'); } }
      if (MODE === 'barrido') { this.av = (cfg.av || 1.3) + k * 2.2; this.ang += this.av * dt; if (k > .35 && !this.arm2) { this.arm2 = new THREE.Group(); E.scene.add(this.arm2); const b = mesh(BOX(), T('#8fd0ff'), this.arm2, [R / 2, .45, 0], null, [R, .45, .45]); outline(b); this.ang2 = this.ang + Math.PI; if (E.me && !E.me.out) E.ui.toast('¡Segunda aguja! ⏰', '#8fd0ff'); } if (this.arm2) this.ang2 -= this.av * .7 * dt; }
      for (const r of E.racers) {
        if (r.out) { r.vy -= 20 * dt; r.y += r.vy * dt; r.x += (r.vx || 0) * dt; r.z += (r.vz || 0) * dt; continue; }
        if (r.inv > 0) r.inv -= dt;
        let dir = { x: 0, z: 0 }, jump = false; const S = sk(E, r);
        if (MODE === 'barrido') {
          if (r.me && !E.AUTO) jump = E.taps.length > 0 || E.swipe;
          else { const ra = Math.atan2(r.z, r.x); for (const [ang, av] of [[this.ang, this.av], ...(this.arm2 ? [[this.ang2, -this.av * .7]] : [])]) { let da = ((ra - ang) % 6.283 + 6.283) % 6.283; if (av < 0) da = 6.283 - da; const tt = da / Math.abs(av), pid = (av > 0 ? 'a' : 'b') + Math.floor(av > 0 ? (ang - ra) / 6.283 : (ra - ang) / 6.283); if (r.jp !== pid) { if (tt < .5) { r.jp = pid; r.jt = Math.random() < .42 + .5 * Math.min(1, S) ? rnd(.12, .22) : rnd(.0, .05); } } if (r.jt != null && tt < r.jt && r.y <= 0) { jump = true; r.jt = null; } } }
          if (jump && r.y <= 0) { r.vy = 7.5; if (r.me) Audio.sfxPlay('jump'); }
          r.vy -= 20 * dt; r.y = Math.max(0, r.y + r.vy * dt); if (r.y === 0) r.vy = Math.max(0, r.vy);
          const ra = Math.atan2(r.z, r.x); for (const [ang, prev] of [[this.ang, this.ang - this.av * dt], ...(this.arm2 ? [[this.ang2, this.ang2 + this.av * .7 * dt]] : [])]) { const a0 = Math.min(ang, prev), a1 = Math.max(ang, prev); let x = ra; while (x < a0) x += 6.283; while (x > a1 + 6.283) x -= 6.283; if (x >= a0 && x <= a1 && r.y < .7) this.hurt(E, r, 0, 0); }
          r.vx = lerp(r.vx, 0, dt * 5); r.vz = lerp(r.vz, 0, dt * 5); r.x += r.vx * dt; r.z += r.vz * dt; const dd = Math.hypot(r.x, r.z); if (dd > R - .6) { r.x *= (R - .6) / dd; r.z *= (R - .6) / dd; } if (dd < 1.6) { r.x *= 1.6 / dd; r.z *= 1.6 / dd; }
          continue;
        }
        if (r.stun > 0) { r.stun -= dt; r.x += r.vx * dt; r.z += r.vz * dt; r.vx *= .9; r.vz *= .9; }
        else {
          if (r.me && !E.AUTO) dir = stickDir(E);
          else { r.rt = (r.rt || 0) - dt; if (r.rt <= 0 || !r.goal) { r.rt = rnd(.3, 1.2); r.guard = Math.random() < .8 + .2 * Math.min(1, S); if (MODE === 'baldosas') { const ok = this.tiles.filter(q => q.st === 0 && Math.hypot(q.x - r.x, q.z - r.z) < 4.6); const q = ok.length ? pick(ok) : null; r.goal = q ? { x: q.x, z: q.z } : { x: r.x, z: r.z }; } else { const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * R * .6; r.goal = { x: Math.cos(a) * d, z: Math.sin(a) * d }; } }
            if (MODE === 'baldosas') { const cur = this.tileAt(r.x, r.z); if (!cur || cur.st > 0 || (r.goal && (this.tileAt(r.goal.x, r.goal.z)?.st ?? 2) > 0)) { const ok = this.tiles.filter(q => q.st === 0); if (ok.length && Math.random() < .2 + .8 * Math.min(1, S)) { const q = ok.reduce((b, c) => Math.hypot(c.x - r.x, c.z - r.z) + Math.hypot(c.x, c.z) * .15 < Math.hypot(b.x - r.x, b.z - r.z) + Math.hypot(b.x, b.z) * .15 ? c : b, ok[0]); r.goal = { x: q.x, z: q.z }; } } }
            dir = { x: r.goal.x - r.x, z: r.goal.z - r.z }; const dg = Math.hypot(dir.x, dir.z); if (dg < .4) dir = { x: 0, z: 0 }; else { dir.x /= dg; dir.z /= dg; if (dg < 1.5) { dir.x *= dg / 1.5; dir.z *= dg / 1.5; } }
            if (MODE === 'lluvia') for (const d of this.drops) { if (d.n[r.k] == null) d.n[r.k] = Math.random() < .3 + .55 * Math.min(1, S); if (!d.n[r.k]) continue; const dx = r.x - d.x, dz = r.z - d.z, dd = Math.hypot(dx, dz) || .01; if (dd < 2.4 && d.t > (1.15 - Math.min(1, S)) * .9) { dir.x += dx / dd * 2; dir.z += dz / dd * 2; } }
            const m = Math.hypot(dir.x, dir.z); if (m > 1) { dir.x /= m; dir.z /= m; }
            if (MODE === 'baldosas' && r.guard && (dir.x || dir.z)) { const q = this.tileAt(r.x + dir.x * .9, r.z + dir.z * .9); if (!q || q.st === 2) { dir = { x: 0, z: 0 }; r.rt = 0; } } }
          moveRacer(r, dir, dt, cfg.speed || 6.5, cfg.ice ? 3 : 12);
        }
        const d = Math.hypot(r.x, r.z); if (MODE !== 'baldosas' && d > R - .6) { r.x *= (R - .6) / d; r.z *= (R - .6) / d; }
        if (MODE === 'baldosas') { const q = this.tileAt(r.x, r.z); if (!q || q.st === 2) { r.vx *= .3; r.vz *= .3; this.kill(E, r); } }
      }
      separate(E.racers, .95);
      for (let i = this.drops.length - 1; i >= 0; i--) { const d = this.drops[i]; d.t += dt; if (d.t >= d.T) { E.burst(v3(d.x, .5, d.z), cfg.boom || '#ffb030', 16, 7, .5, .7); if (Math.hypot(d.x - E.me.x, d.z - E.me.z) < 9) { Audio.sfxPlay('kick'); E.shake = Math.max(E.shake, .12); } for (const r of E.racers) if (!r.out && Math.hypot(r.x - d.x, r.z - d.z) < 1.5) this.hurt(E, r, d.x, d.z); E.scene.remove(d.w); E.scene.remove(d.g); this.drops.splice(i, 1); } }
      E.racers.forEach(r => r.prog = r.out ? clamp(r.score / TT, 0, 1) * .99 : clamp(t / TT, 0, 1) * .99);
    },
    tileAt(x, z) { const s = this.ts; const i = Math.round(x / s), j = Math.round(z / s); return this.tiles.find(q => Math.abs(q.x - i * s) < .01 && Math.abs(q.z - j * s) < .01); },
    render(E, dt) { const t = performance.now() / 1000, me = E.me;
      for (const d of this.drops) { const k = d.t / d.T; d.w.scale.setScalar(1.25 - k * .4); d.w.material.opacity = .3 + k * .5; d.g.position.y = Math.max(.5, 30 * (1 - k * k)); d.g.rotation.x += dt * 4; }
      if (this.tiles) for (const q of this.tiles) { if (q.st === 1) { q.m.position.x = q.x + Math.sin(t * 40) * .06; q.m.material = q._wm || (q._wm = T('#ff8a8a', { rim: .3 })); } if (q.st === 2) { q.y -= 9 * dt; q.m.position.y = q.y; q.m.visible = q.y > -25; } }
      if (this.arm) { this.arm.rotation.y = -this.ang; } if (this.arm2) this.arm2.rotation.y = -this.ang2;
      for (const r of E.racers) { poseArena(E, r, t, dt); r.obj.visible = !(r.out && r.y < -30) && !(r.inv > 0 && Math.sin(t * 30) > .5); if (MODE === 'barrido') r.obj.rotation.y = Math.atan2(-r.x, -r.z) + Math.PI / 2; if (r.out) r.obj.rotation.z += dt * 8; }
      info(`${MODE === 'baldosas' ? '' : '❤️'.repeat(Math.max(0, me.hp)) + '<br>'}⏱️ Aguanta ${Math.max(0, TT - E.t).toFixed(0)} s<br>👥 Quedan ${E.racers.filter(r => !r.out).length}`);
      arenaCam(E, me.out ? { x: 0, z: 0 } : me, dt, R); (this.A ? this.A.W : this.W).tick(dt, camera); }
  });
}

// =====================================================================
//  EMPUJE — sumo de gelatina: muévete y pulsa 💨 para embestir. ¡Que no te echen!
// =====================================================================
export function empuje(cfg) {
  const R0 = cfg.R || 9.5, TT = cfg.T || 50;
  return base(cfg, { mode: 'puntos', maxT: TT + 6,
    init(E) { this.A = arena(E, cfg, R0, cfg.floor); this.R = R0; setButtons('m'); $('bM').textContent = '💨';
      if (cfg.deco) for (let i = 0; i < 8; i++) { const g = prop(cfg.deco); g.scale.setScalar(.5); const a = i / 8 * 6.28; g.position.set(Math.cos(a) * (R0 - .4), 0, Math.sin(a) * (R0 - .4)); this.A.p.add(g); g.position.y = .6; }
      initArenaRacers(E, R0); E.racers.forEach(r => { r.cd = 0; r.dash = 0; });
      this.walk = []; if (cfg.walker) for (let i = 0; i < 2; i++) { const g = prop(cfg.walker); g.scale.setScalar(1.1); E.scene.add(g); this.walk.push({ g, a: i * Math.PI, x: 0, z: 0 }); } },
    update(E, dt) {
      const t = E.t, alive = E.racers.filter(r => !r.out), k = clamp(t / TT, 0, 1);
      if (!this.done && (t >= TT || alive.length <= 1 || (this.meOut != null && t - this.meOut > 1.6))) { this.done = true; alive.forEach(r => { r.score = TT + 20 - Math.hypot(r.x, r.z); r.label = '¡Superviviente! 🛡️'; }); scoreFinish(E); return; }
      if (this.done) return;
      if (cfg.shrink) this.R = lerp(R0, R0 * .5, k);
      const R = this.R, om = cfg.spin ? cfg.spin * (1 + k) : 0;
      for (const r of E.racers) {
        if (r.out) { r.vy -= 20 * dt; r.y += r.vy * dt; r.x += r.vx * dt; r.z += r.vz * dt; continue; }
        r.cd -= dt; if (r.dash > 0) r.dash -= dt; let dir = { x: 0, z: 0 }, dash = false; const S = sk(E, r);
        if (r.me && !E.AUTO) { dir = stickDir(E); dash = E.swipe || E.taps.length > 1; }
        else { r.rt = (r.rt || 0) - dt; if (r.rt <= 0) { r.rt = rnd(.4, 1.1); const others = alive.filter(o => o !== r); r.tgt = Math.random() < .55 ? pick(others) : null; }
          let gx = 0, gz = 0; if (r.tgt && !r.tgt.out) { gx = r.tgt.x; gz = r.tgt.z; }
          dir = { x: gx - r.x, z: gz - r.z }; const dg = Math.hypot(dir.x, dir.z) || 1; dir.x /= dg; dir.z /= dg;
          const dc = Math.hypot(r.x, r.z); if (dc > R - 2.5 && Math.random() < .3 + .7 * Math.min(1, S)) { dir.x -= r.x / dc * 1.6; dir.z -= r.z / dc * 1.6; }
          const m = Math.hypot(dir.x, dir.z) || 1; dir.x /= m; dir.z /= m;
          if (r.tgt && dg < 2.6 && r.cd <= 0 && Math.random() < .03 + .05 * S) dash = true; }
        if (dash && r.cd <= 0) { const m = Math.hypot(dir.x, dir.z); const fx = m > .1 ? dir.x / m : Math.sin(r.face), fz = m > .1 ? dir.z / m : Math.cos(r.face); r.vx += fx * 13; r.vz += fz * 13; r.cd = 1.3; r.dash = .35; r.face = Math.atan2(fx, fz); if (r.me) Audio.sfxPlay('boost'); E.burst(v3(r.x, .6, r.z), '#ffffff', 8, 3, .4, .5, 0); }
        if (r.dash > 0) { r.x += r.vx * dt; r.z += r.vz * dt; r.vx *= .96; r.vz *= .96; } else moveRacer(r, dir, dt, cfg.speed || 5.5, cfg.ice ? 2.5 : 6);
        if (om) { const x = r.x, z = r.z; r.x += -z * om * dt; r.z += x * om * dt; }
        if (Math.hypot(r.x, r.z) > R + .1) { r.out = true; r.score = t; r.label = `Aguantó ${t.toFixed(1)} s`; r.vy = 2; r.expr = 'squash'; if (r.me) { Audio.sfxPlay('squash'); E.ui.banner('¡Fuera! 😵'); this.meOut = t; } else { say(E, r, pick(['¡Me han echado!', '¡Aaaah!', '¡Tramposos!'])); if (Math.hypot(r.x - E.me.x, r.z - E.me.z) < 6) Audio.sfxPlay('pop'); } }
      }
      // choques entre mochis: quien embiste empuja mucho más
      for (let i = 0; i < E.racers.length; i++) for (let j = i + 1; j < E.racers.length; j++) { const a = E.racers[i], b = E.racers[j]; if (a.out || b.out) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 1.15 && d > 1e-3) { const nx = dx / d, nz = dz / d, ov = 1.15 - d; a.x -= nx * ov / 2; a.z -= nz * ov / 2; b.x += nx * ov / 2; b.z += nz * ov / 2;
        const pa = a.dash > 0 ? 9 : 2.2, pb = b.dash > 0 ? 9 : 2.2; b.vx += nx * pa; b.vz += nz * pa; a.vx -= nx * pb; a.vz -= nz * pb; if (pa > 5 || pb > 5) { b.dash = Math.max(b.dash, .25 * (pa > 5)); a.dash = Math.max(a.dash, .25 * (pb > 5)); if (a.me || b.me) { Audio.sfxPlay('bump'); E.shake = .2; } E.burst(v3(a.x + nx * .5, .8, a.z + nz * .5), '#ffe27a', 8, 4, .4, .5); } } }
      for (const w of this.walk) { w.a += dt * .5; w.x = Math.cos(w.a) * R * .7; w.z = Math.sin(w.a * 1.3) * R * .5; for (const r of E.racers) { if (r.out) continue; const dx = r.x - w.x, dz = r.z - w.z, d = Math.hypot(dx, dz); if (d < 1.6 && d > .01) { r.vx += dx / d * 8; r.vz += dz / d * 8; r.dash = .25; if (r.me) { Audio.sfxPlay('boing'); E.ui.toast('¡Pinzazo! 🦀', '#ff9cc8'); } } } }
      E.racers.forEach(r => r.prog = r.out ? clamp(r.score / TT, 0, 1) * .99 : clamp(t / TT, 0, 1) * .99);
    },
    render(E, dt) { const t = performance.now() / 1000, me = E.me;
      const sc = this.R / R0; this.A.p.scale.set(sc, 1, sc); if (cfg.spin) this.A.p.rotation.y -= cfg.spin * dt * (1 + E.t / TT);
      for (const w of this.walk) { w.g.position.set(w.x, Math.abs(Math.sin(t * 8)) * .2, w.z); w.g.rotation.y = t; }
      for (const r of E.racers) { poseArena(E, r, t, dt); if (r.dash > 0) r.obj.userData.pivot.rotation.x = .5; else r.obj.userData.pivot.rotation.x = 0; if (r.out) r.obj.rotation.z += dt * 6; }
      info(`💨 Embestida: ${me.cd > 0 ? '…' : '¡lista!'}<br>⏱️ ${Math.max(0, TT - E.t).toFixed(0)} s · 👥 ${E.racers.filter(r => !r.out).length}`);
      arenaCam(E, me.out ? { x: 0, z: 0 } : me, dt, R0); this.A.W.tick(dt, camera); }
  });
}

// =====================================================================
//  RITMO — caen notas sobre 3 platillos: pulsa ⬅ ● ➡ justo cuando lleguen
// =====================================================================
export function ritmo(cfg) {
  const BPM = cfg.bpm || 108, BT = 60 / BPM, FALL = 1.7, N = cfg.n || 40;
  return base(cfg, { mode: 'puntos', maxT: 4 + N * BT * 1.6 + 6, music: { ...MUNDOS[cfg.mundo].music, bpm: BPM },
    init(E) {
      const M = MUNDOS[cfg.mundo]; this.W = buildWorld(E, cfg.mundo, { arena: { r: 16 } }); setButtons('lmr'); $('bL').textContent = '🔴'; $('bM').textContent = '🟡'; $('bR').textContent = '🔵';
      // escenario
      const st = mesh(new THREE.BoxGeometry(20, .6, 7), T(cfg.floor || '#6a3f9a', { rim: .3 }), E.scene, [0, -.3, -1]); outline(st);
      this.tiles = []; for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) this.tiles.push(mesh(new THREE.PlaneGeometry(1.9, 1.9), T(pick(['#ff9cf0', '#8fd0ff', '#ffe27a', '#7ee3c4']), { emissive: '#ffffff', ei: .1, rim: 0 }), E.scene, [-9 + i * 2, .01, -3 + j * 2], [-Math.PI / 2, 0, 0]));
      for (const s of [-1, 1]) { const a = prop(cfg.side || 'altavoz'); a.position.set(s * 11.5, 0, -2); a.scale.setScalar(1.3); E.scene.add(a); }
      racers(E, .6); const xs = [0, -2.6, 2.6, -5.2, 5.2, -7.8]; E.racers.forEach((r, k) => { r.x = xs[k]; r.obj.position.set(r.x, 0, -1); r.obj.rotation.y = 0; r.score = 0; r.combo = 0; r.y = 0; r.vy = 0; r.best = 0; });
      // notas: secuencia común para todos (justo)
      this.notes = []; let tb = 4.2, last = 1; for (let i = 0; i < N; i++) { const k = i / N; const step = k < .3 ? 2 : pick(k < .6 ? [1, 2, 2] : [1, 1, 2]); tb += step * BT; let ln = (Math.random() * 3) | 0; if (ln === last && Math.random() < .5) ln = (ln + 1) % 3; last = ln; this.notes.push({ t: tb, l: ln, j: {} }); }
      this.end = tb + 1.5; this.pads = []; const cols = ['#ff5a7a', '#ffd84a', '#5ab0ff']; const mx = E.me.x;
      for (let l = 0; l < 3; l++) { const p = mesh(new THREE.CylinderGeometry(.7, .7, .15, 28), GL(cols[l], .35), E.scene, [mx + (l - 1) * 1.6, .1, 1.6]); outline(p); this.pads.push(p); mesh(new THREE.PlaneGeometry(.12, 12), new THREE.MeshBasicMaterial({ color: cols[l], transparent: true, opacity: .35 }), E.scene, [mx + (l - 1) * 1.6, 6, 1.6]); }
      this.nm = this.notes.map(n => { const g = prop(cfg.note || 'caramelo'); g.scale.setScalar(.55); g.add(glowSprite(cols[n.l], 1.8, .6)); g.visible = false; E.scene.add(g); return g; });
    },
    judge(E, r, n, dtm) { const a = Math.abs(dtm); const p = a < .07 ? 3 : a < .14 ? 2 : 1; n.j[r.k] = p; r.combo++; r.best = Math.max(r.best, r.combo); r.score += p + (r.combo >= 10 ? 1 : 0); r.vy = 4; r.expr = 'happy';
      if (r.me) { Audio.sfxPlay(p === 3 ? 'level' : 'click', 1 + n.l * .25); E.ui.toast(p === 3 ? (r.combo >= 10 ? `¡PERFECTO! 🔥 x${r.combo}` : '¡PERFECTO!') : p === 2 ? '¡Bien!' : 'Vale', p === 3 ? '#ffe27a' : '#fff'); this.pads[n.l].userData.hit = .25; E.burst(v3(this.pads[n.l].position.x, .8, 1.6), ['#ff5a7a', '#ffd84a', '#5ab0ff'][n.l], 6 + p * 3, 4, .4, .5); } },
    update(E, dt) {
      const t = E.t;
      if (t > this.end && !this.done) { this.done = true; scoreFinish(E); return; }
      for (const r of E.racers) {
        r.vy -= 14 * dt; r.y = Math.max(0, r.y + r.vy * dt); if (r.y === 0) r.vy = 0;
        if (r.me && !E.AUTO) { const press = [...E.side.map(s => s === 'L' ? 0 : 2), ...(E.swipe ? [1] : []), ...E.taps.map(x => x < innerWidth / 3 ? 0 : x < innerWidth * 2 / 3 ? 1 : 2)];
          for (const l of press) { this.pads[l].userData.hit = .12; const n = this.notes.find(n => n.l === l && n.j[r.k] == null && Math.abs(n.t - t) < .22); if (n) this.judge(E, r, n, n.t - t); else { r.combo = 0; Audio.sfxPlay('bump'); } } }
        else { const S = sk(E, r); for (const n of this.notes) { if (n.j[r.k] != null || n.t > t + .02) continue; if (n.ai == null) n.ai = {}; if (n.ai[r.k] == null) n.ai[r.k] = Math.random() < .5 + .42 * Math.min(1, S) ? rnd(-.17, .17) * (1.25 - Math.min(1, S)) : 9; if (n.ai[r.k] < 9 && Math.abs(n.t - t) <= .02) this.judge(E, r, n, n.ai[r.k]); } }
        for (const n of this.notes) if (n.j[r.k] == null && t - n.t > .22) { n.j[r.k] = 0; r.combo = 0; if (r.me) { E.ui.toast('¡Se te escapó!', '#c9b2ff'); r.expr = 'squash'; } }
      }
      const tot = this.notes.length * 4; E.racers.forEach(r => r.prog = clamp(r.score / tot, 0, 1) * .99);
    },
    render(E, dt) { const t = performance.now() / 1000, et = E.t, me = E.me;
      this.notes.forEach((n, i) => { const g = this.nm[i], dtn = n.t - et; const vis = dtn < FALL && dtn > -.25 && n.j[me.k] == null; g.visible = vis; if (vis) { g.position.set(this.pads[n.l].position.x, .45 + Math.max(0, dtn) / FALL * 10, 1.6); g.rotation.y = t * 3; } });
      this.pads.forEach(p => { const h = p.userData.hit || 0; p.scale.set(1 + h, 1, 1 + h); p.userData.hit = Math.max(0, h - dt); });
      this.tiles.forEach((m, i) => { m.position.y = .01 + ((i + Math.floor(et / BT)) % 4 === 0 ? .06 : 0); });
      for (const r of E.racers) { const o = r.obj; o.position.set(r.x, r.y + Math.abs(Math.sin(et / BT * Math.PI)) * .08, -1); o.rotation.y = Math.sin(et / BT * Math.PI) * .25; squash(r, dt); if (r.expr === 'happy' && r.y === 0) r.expr = ''; }
      info(`🎵 Puntos: ${me.score}<br>🔥 Combo x${me.combo}`);
      const port = innerHeight > innerWidth; camera.fov = port ? 72 : 50; camera.updateProjectionMatrix(); camera.position.set(me.x * .5, port ? 6.5 : 4.6, port ? 11.5 : 9); camera.lookAt(me.x * .5, port ? 2.4 : 2, 0); this.W.tick(dt, camera); }
  });
}

export const TIPOS = { salto, esquiva, machaca, vuelo, punteria, recoge, superv, empuje, ritmo };

export { LW, lx, T, GL, v3, $, sk, info, setButtons, racers, squash, trackBase, chaseCam, stickDir, sideTaps, say, hitFx, scoreFinish, base, arena, arenaCam, moveRacer, separate, poseArena, initArenaRacers };
