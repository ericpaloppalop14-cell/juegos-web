// ======================================================================
//  CHILES AL DRAGÓN (revisión o28) — objetivo claro: mete el chile en la BOCA ABIERTA de tu dragón.
//  Ciclo visible: 😴 cerrada → 👀 se prepara (aviso) → 🔥 ¡ABIERTA, TOCA YA! → ñam. 8 chiles.
//  Acierto: +2 (+3 si tocas en el centro de la ventana) · Fallo: rebota en el morro, 0.
// ======================================================================
import { THREE, camera, glowSprite, rnd, clamp, lerp, pick, Audio } from '../core3d.js?v=m19';
import { buildWorld, MUNDOS } from './mundos.js?v=o35';
import { T, v3, $, sk, info, setButtons, racers, squash, say, scoreFinish, base } from './tipos.js?v=o35';

const N = 8, SP = 3.45, DZ = -9, OPEN = 1.15, PREP = .7;
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .05, ...o });
const add = (geo, mat, parent, pos, rot, sc) => { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (sc != null) Array.isArray(sc) ? m.scale.set(...sc) : m.scale.setScalar(sc); m.castShadow = true; parent.add(m); return m; };

// ---------- dragón 3D detallado: cuerpo, panza con placas, cuello, cabeza con mandíbula articulada, cuernos, ojos, alas, cola con púas
function makeDragon(hue) {
  const g = new THREE.Group(), body = std(hue, { roughness: .45 }), belly = std('#ffe1a0', { roughness: .6 }), horn = std('#fff4dc', { roughness: .3 }), wingM = std(new THREE.Color(hue).offsetHSL(0, -.1, .12), { side: THREE.DoubleSide, roughness: .7 }), dark = std('#3a1530'), spike = std('#ffb347', { roughness: .35 });
  const torso = add(new THREE.SphereGeometry(1, 32, 24), body, g, [0, 1.25, 0], null, [1.05, 1.15, .95]);
  for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(.42, 20, 12), belly, g, [0, .7 + i * .3, .78 - Math.abs(i - 2) * .05], [.3, 0, 0], [1.25 - Math.abs(i - 2) * .12, .42, .4]);
  for (const s of [-1, 1]) { add(new THREE.SphereGeometry(.38, 20, 16), body, g, [s * .7, .38, .2], null, [1, .75, 1.25]); for (let c = -1; c <= 1; c++) add(new THREE.ConeGeometry(.07, .18, 8), horn, g, [s * .7 + c * .14, .2, .65], [Math.PI / 2, 0, 0]);
    const arm = add(new THREE.CapsuleGeometry(.14, .45, 6, 12), body, g, [s * .9, 1.35, .45], [.9, 0, s * .5]); }
  const neck = add(new THREE.CylinderGeometry(.45, .62, .8, 20), body, g, [0, 2.3, .15], [-.25, 0, 0]);
  const head = new THREE.Group(); head.position.set(0, 2.85, .35); g.add(head);
  add(new THREE.SphereGeometry(.72, 32, 24), body, head, [0, .15, 0], null, [1, .9, .95]);
  const snout = add(new THREE.SphereGeometry(.5, 28, 20), body, head, [0, .12, .62], null, [.95, .55, .85]);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(.07, 10, 8), dark, head, [s * .18, .3, 1.02]);
  for (const s of [-1, 1]) { const e = add(new THREE.SphereGeometry(.2, 20, 16), std('#ffffff', { roughness: .2 }), head, [s * .32, .45, .42]); add(new THREE.SphereGeometry(.11, 16, 12), std('#2a1030', { roughness: .1 }), e, [0, 0, .13]); add(new THREE.SphereGeometry(.04, 8, 6), std('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1 }), e, [.04, .05, .2]);
    add(new THREE.ConeGeometry(.13, .6, 14), horn, head, [s * .38, .85, -.2], [-.5, 0, s * -.35]); add(new THREE.ConeGeometry(.12, .3, 10), body, head, [s * .62, .55, -.15], [0, 0, s * -1.2]); }
  // mandíbula articulada con lengua y dientes
  const jaw = new THREE.Group(); jaw.position.set(0, -.08, .25); head.add(jaw);
  add(new THREE.SphereGeometry(.45, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), body, jaw, [0, .04, .38], null, [.9, .5, .85]);
  add(new THREE.SphereGeometry(.3, 16, 12), std('#ff6f8a', { roughness: .4 }), jaw, [0, .02, .4], null, [.75, .2, .9]);
  for (let i = -2; i <= 2; i++) add(new THREE.ConeGeometry(.045, .12, 6), horn, jaw, [i * .13, .1, .62 - Math.abs(i) * .05]);
  const mouth = add(new THREE.SphereGeometry(.32, 16, 12), std('#5a0f2a', { roughness: .9 }), head, [0, -.02, .72], null, [.8, .3, .5]); mouth.castShadow = false;
  // alas membranosas con huesos
  const wings = []; for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * .7, 1.9, -.45); g.add(w);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.9, .9, 1.9, 1.15); sh.quadraticCurveTo(1.6, .6, 1.75, .15); sh.quadraticCurveTo(1.25, .2, 1.2, -.3); sh.quadraticCurveTo(.8, -.05, .55, -.55); sh.quadraticCurveTo(.3, -.2, 0, 0);
    const m = add(new THREE.ShapeGeometry(sh, 16), wingM, w, null, [0, s > 0 ? 0 : Math.PI, 0]); add(new THREE.CylinderGeometry(.05, .03, 2.1, 6), spike, w, [s * .95, .55, 0], [0, 0, s * -1.05]); wings.push(w); }
  // cola segmentada con púas
  const tail = []; let par = g, pos = [0, .6, -.8]; for (let i = 0; i < 6; i++) { const seg = new THREE.Group(); seg.position.set(...pos); par.add(seg); add(new THREE.SphereGeometry(.34 - i * .045, 16, 12), body, seg, null, null, [1, .85, 1.25]); add(new THREE.ConeGeometry(.09 - i * .008, .25, 8), spike, seg, [0, .3 - i * .03, 0]); tail.push(seg); par = seg; pos = [0, .05, -.42 + i * .02]; }
  add(new THREE.ConeGeometry(.22, .45, 4), spike, par, [0, 0, -.35], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(.1, .3, 8), spike, g, [0, 1.6 + i * .22 - (i > 2 ? (i - 2) * .05 : 0), -.85 + i * .12], [-.6, 0, 0]);
  // aro de aviso alrededor de la boca (verde = toca ya, amarillo = prepárate)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .07, 10, 40), new THREE.MeshBasicMaterial({ color: '#4dff9a', transparent: true, opacity: 0, depthWrite: false })); ring.position.set(0, 0, 1.05); head.add(ring);
  const glow = glowSprite('#4dff9a', 2.6, 0); glow.position.set(0, 0, 1); head.add(glow);
  g.userData = { head, jaw, wings, tail, ring, glow, torso };
  return g;
}
// ---------- chile 3D: cuerpo curvado (tubo sobre curva), brillo, tallo y cáliz
function makeChile() {
  const g = new THREE.Group(); const curve = new THREE.CatmullRomCurve3([v3(0, .55, 0), v3(.08, .25, 0), v3(.02, -.1, 0), v3(-.15, -.4, 0), v3(-.3, -.55, 0)]);
  const tube = new THREE.TubeGeometry(curve, 24, .16, 14, false); const pos = tube.attributes.position, tmp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { tmp.fromBufferAttribute(pos, i); const u = Math.floor(i / 15) / 24, r = 1 - Math.pow(u, 1.6) * .85; const c = curve.getPointAt(Math.min(1, u)); tmp.sub(c).multiplyScalar(r).add(c); pos.setXYZ(i, tmp.x, tmp.y, tmp.z); }
  tube.computeVertexNormals(); add(tube, std('#e8121f', { roughness: .18, metalness: .1, emissive: '#5a0005', emissiveIntensity: .35 }), g);
  add(new THREE.SphereGeometry(.17, 14, 10), std('#e8121f', { roughness: .18 }), g, [0, .55, 0]);
  add(new THREE.CylinderGeometry(.18, .12, .1, 10), std('#2f8a3a', { roughness: .5 }), g, [0, .66, 0]);
  add(new THREE.CylinderGeometry(.035, .05, .28, 8), std('#3fa84a'), g, [.04, .82, 0], [0, 0, -.4]);
  return g;
}

export function chiles(cfg) {
  return base(cfg, { mode: 'puntos', maxT: 95,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: 22 } }); setButtons('m', { M: '🌶️' });
      const M = MUNDOS[cfg.mundo]; const fl = new THREE.Mesh(new THREE.PlaneGeometry(SP * 6 + 4, 22), std(M.alt, { roughness: .9 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, .01, -4); fl.receiveShadow = true; sc.add(fl);
      const hues = ['#4fbf6a', '#e85a5a', '#8a6ae8', '#3fb8d8', '#f0a030', '#e06ab8'];
      racers(E, .6); this.dr = [];
      E.racers.forEach((r, k) => { r.lane = r.me ? 2 : [0, 1, 3, 4, 5][k - 1]; r.x = (r.lane - 2.5) * SP; r.score = 0; r.left = N; r.hits = 0; r.proj = null; r.cool = 0; r.obj.position.set(r.x, 0, 0); r.obj.rotation.y = Math.PI;
        const d = makeDragon(r.me ? '#4fbf6a' : hues[r.lane]); d.scale.setScalar(r.me ? 1.05 : .8); d.position.set(r.x, 0, DZ); sc.add(d); const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, .25, 28), std(r.me ? '#ffd36b' : '#b89a7a')); pad.position.set(r.x, .12, DZ); sc.add(pad);
        r.dg = d; r.cyc = { st: 'closed', t: k === 0 ? 3.2 : rnd(1, 2.5), chew: 0, open: 0 }; r.bubble = 0; });
      // HUD: objetivo, señal, marcador, tutorial
      const h = $('hud'); let o = $('chObj'); if (!o) { o = document.createElement('div'); o.id = 'chObj'; h.appendChild(o); }
      o.style.cssText = 'position:absolute;left:50%;bottom:calc(132px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;font-family:Fredoka,system-ui;z-index:20;width:min(92vw,520px)';
      o.innerHTML = '<div id="chGoal" style="background:rgba(110,40,120,.72);color:#fff;font:700 15px Fredoka;padding:6px 14px;border-radius:16px;border:2px solid #fff;text-align:center">🎯 Mete el chile en la <b style="color:#7dffb0">BOCA ABIERTA</b> de TU dragón</div><div id="chSig" style="font:800 24px Fredoka;color:#fff;padding:8px 22px;border-radius:22px;border:3px solid #fff;text-shadow:0 2px 0 rgba(0,0,0,.25);transition:background .15s,transform .15s">😴 Espera…</div><div id="chScore" style="font:800 19px Fredoka;color:#fff;background:rgba(0,0,0,.35);padding:4px 14px;border-radius:14px">🌶️ 8 · ⭐ 0 pts</div>';
      o.style.display = 'flex';
      let tu = $('chTut'); if (!tu) { tu = document.createElement('div'); tu.id = 'chTut'; h.appendChild(tu); }
      tu.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(40,10,50,.55);z-index:40;pointer-events:none;font-family:Fredoka,system-ui';
      tu.innerHTML = '<div style="background:#fff8ef;color:#6a2b6a;border-radius:24px;padding:18px 20px;max-width:330px;text-align:center;border:4px solid #ff8a3a;box-shadow:0 10px 30px rgba(0,0,0,.35)"><div style="font:800 22px Fredoka;margin-bottom:8px">🐉 ¿Cómo se juega?</div><div style="font:600 16px Fredoka;line-height:1.45;text-align:left">1️⃣ Tu dragón (el del cojín <b style="color:#d8a000">dorado</b>) abre y cierra la boca.<br>2️⃣ Cuando el aro se ponga <b style="color:#18a85a">VERDE</b> y ponga <b>«¡TOCA YA!»</b>, toca la pantalla o el botón 🌶️.<br>3️⃣ Dentro: <b>+2</b> · justo en el centro: <b>+3</b>. Boca cerrada: <b>0</b>.<br>🏆 ¡Gana quien sume más con 8 chiles!</div><div id="chDemo" style="margin-top:10px;font:800 18px Fredoka;color:#18a85a">👆 ¡Demo! Mira tu dragón…</div></div>';
      tu.style.display = 'flex'; this.tu = tu; this.sig = $('chSig'); this.scoreEl = $('chScore'); this.tutT = 0;
    },
    // demo durante la cuenta atrás: tu dragón abre la boca y un chile fantasma entra, ¡así se hace!
    idle(E, dt) { const me = E.me, d = this.dm = (this.dm || 0) + dt, c = me.cyc, ph = d % 3.4, el = $('chDemo');
      c.st = ph < 1 ? 'closed' : ph < 1.6 ? 'prep' : ph < 2.8 ? 'open' : 'closed'; c.chew = 0; c.t = c.st === 'open' ? OPEN - (ph - 1.6) : 1;
      if (el) el.textContent = c.st === 'open' ? '🔥 Aro VERDE → ¡TOCA AHORA!' : c.st === 'prep' ? '👀 Aro amarillo → prepárate…' : '😴 Boca cerrada → espera…';
      if (c.st === 'open' && !this._dThrown && ph > 1.9) { this._dThrown = true; const g = makeChile(); g.scale.setScalar(.75); E.scene.add(g); const hp = new THREE.Vector3(); me.dg.userData.head.getWorldPosition(hp); this._dp = { g, t: 0, a: v3(me.x, 1.5, -.3), b: hp.add(v3(0, 0, .7)) }; }
      if (c.st === 'closed') this._dThrown = false;
      const p = this._dp; if (p) { p.t += dt / .45; const k = Math.min(1, p.t); p.g.position.set(lerp(p.a.x, p.b.x, k), lerp(p.a.y, p.b.y, k) + Math.sin(k * Math.PI) * 1.6, lerp(p.a.z, p.b.z, k)); if (k >= 1) { E.scene.remove(p.g); this._dp = null; me.fire = .8; E.burst(p.b.clone(), '#ff9a3a', 16, 6, .7, .8); } } },
    place() { const o = $('chObj'), pr = innerHeight > innerWidth; if (!o || o._pr === pr) return; o._pr = pr;
      Object.assign(o.style, pr ? { left: '50%', bottom: 'calc(132px + env(safe-area-inset-bottom))', transform: 'translateX(-50%)', alignItems: 'center', width: 'min(92vw,520px)' } : { left: 'calc(12px + env(safe-area-inset-left))', bottom: 'calc(12px + env(safe-area-inset-bottom))', transform: 'none', alignItems: 'flex-start', width: '300px' }); const sg = $('chSig'); if (sg) sg.style.font = pr ? '800 24px Fredoka' : '800 18px Fredoka'; const gl = $('chGoal'); if (gl) gl.style.fontSize = pr ? '15px' : '13px'; },
    sigSet(txt, bg, big) { if (this.sig._t !== txt) { this.sig.textContent = txt; this.sig._t = txt; } this.sig.style.background = bg; this.sig.style.transform = big ? 'scale(1.12)' : 'scale(1)'; },
    cycle(r, dt) { const c = r.cyc; c.t -= dt; if (c.chew > 0) c.chew -= dt;
      if (c.t <= 0) { if (c.st === 'closed') { c.st = 'prep'; c.t = PREP; } else if (c.st === 'prep') { c.st = 'open'; c.t = OPEN; } else { c.st = 'closed'; c.t = rnd(1.1, 2.1); } } },
    throwAt(E, r) { const c = r.cyc, ok = c.st === 'open' && c.chew <= 0, mid = ok && Math.abs(c.t - OPEN / 2) < OPEN * .2; const pts = ok ? (mid ? 3 : 2) : 0;
      const g = makeChile(); g.scale.setScalar(.75); E.scene.add(g); const hp = new THREE.Vector3(); r.dg.userData.head.getWorldPosition(hp);
      r.proj = { g, t: 0, pts, a: v3(r.x, 1.5, -.3), b: hp.add(v3(0, 0, .7)) }; r.left--; r.throwA = .3; r.cool = .35; if (r.me) Audio.sfxPlay('throw'); },
    update(E, dt) {
      if (!this.started) { this.started = true; const c = E.me.cyc; c.st = 'closed'; c.t = 2.2; c.chew = 0; if (this._dp) { E.scene.remove(this._dp.g); this._dp = null; } }
      const me = E.me; if (this.tu.style.display !== 'none' && (E.t > 3 || (E.t > .6 && (E.taps.length || E.swipe)))) this.tu.style.display = 'none';
      for (const r of E.racers) { this.cycle(r, dt); r.cool -= dt;
        if (r.proj) { const p = r.proj; p.t += dt / .45; const k = Math.min(1, p.t); p.g.position.set(lerp(p.a.x, p.b.x, k), lerp(p.a.y, p.b.y, k) + Math.sin(k * Math.PI) * 1.6, lerp(p.a.z, p.b.z, k)); p.g.rotation.z += dt * 12;
          if (k >= 1) { const pts = p.pts; r.proj = null;
            if (pts) { E.scene.remove(p.g); r.score += pts; r.hits++; r.cyc.chew = .7; r.cyc.st = 'closed'; r.cyc.t = rnd(1.2, 2); r.fire = .8; E.burst(p.b.clone(), '#ff9a3a', 14 + pts * 4, 6, .7, .8); E.burst(p.b.clone(), '#ffe27a', 10, 4, .5, .6); r.expr = 'happy';
              if (r.me) { Audio.sfxPlay(pts >= 3 ? 'trick' : 'got'); E.ui.toast(pts >= 3 ? '¡PERFECTO! 🔥 ¡ÑAM! +3' : '¡ACIERTO! 😋 ¡Ñam! +2', '#7dffb0'); E.shake = .15; this.flash('#4dff9a'); } }
            else { r.bounce = { g: p.g, vx: rnd(-2, 2), vy: 4, vz: 3, x: p.b.x, y: p.b.y, z: p.b.z, t: 0 }; r.expr = 'squash';
              if (r.me) { Audio.sfxPlay('bump'); E.ui.toast('¡FALLO! 😅 La boca estaba cerrada · 0', '#ff8a8a'); E.shake = .25; this.flash('#ff4d4d'); } else if (Math.random() < .5) say(E, r, pick(['¡Uy, cerrada!', '¡Rebotó!', '¡Casi!'])); }
            setTimeout(() => { r.expr = ''; }, 700); } }
        if (r.bounce) { const b = r.bounce; b.t += dt; b.vy -= 14 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.y < .2) { b.y = .2; b.vy = Math.abs(b.vy) * .35; b.vx *= .7; b.vz *= .5; } b.g.position.set(b.x, b.y, b.z); b.g.rotation.x += dt * 8; if (b.t > 1.4) { E.scene.remove(b.g); r.bounce = null; } }
        if (r.left <= 0 || r.proj || r.cool > 0) continue;
        if (r.me && !E.AUTO) { if (E.t > .4 && (E.taps.length || E.swipe)) this.throwAt(E, r); }
        else { const S = sk(E, r); if (r.cyc.st === 'open' && r.cyc.chew <= 0) { if (r.pl == null) r.pl = Math.random() < .3 + .5 * Math.min(1, S) ? rnd(.25, .75) * OPEN : -1; if (r.pl >= 0 && r.cyc.t < OPEN - r.pl + .001 && r.cyc.t > 0) { r.pl = null; this.throwAt(E, r); } }
          else if (r.cyc.st === 'closed' && r.pl === -1) { r.pl = null; if (Math.random() < .6) this.throwAt(E, r); } else if (r.cyc.st !== 'open') r.pl = r.pl === -1 ? -1 : null; }
      }
      // señal clara de cuándo tocar
      const c = me.cyc; if (me.left <= 0 && !me.proj) this.sigSet('✅ ¡Sin chiles! Espera a los demás', 'rgba(110,60,150,.8)');
      else if (c.st === 'open' && c.chew <= 0) this.sigSet(Math.abs(c.t - OPEN / 2) < OPEN * .2 ? '🔥 ¡TOCA YA! ¡PERFECTO!' : '🔥 ¡TOCA YA!', '#18b85a', true);
      else if (c.st === 'prep') this.sigSet('👀 ¡Prepárate…!', '#f0a020');
      else this.sigSet('😴 Boca cerrada · espera', 'rgba(90,60,110,.75)');
      const t2 = `🌶️ Chiles: ${me.left} · ⭐ ${me.score} pts`; if (this.scoreEl._t !== t2) { this.scoreEl.textContent = t2; this.scoreEl._t = t2; }
      info(E.racers.slice().sort((a, b) => b.score - a.score).slice(0, 3).map(r => `${r.me ? '<u>Tú</u>' : r.ch.name}: ${r.score}`).join('<br>'));
      E.racers.forEach(r => r.prog = clamp(r.score / (N * 3), 0, .99));
      if (!this.done && E.racers.every(r => r.left <= 0 && !r.proj)) { this.done = true; setTimeout(() => scoreFinish(E), 900); }
    },
    flash(col) { let f = $('chFlash'); if (!f) { f = document.createElement('div'); f.id = 'chFlash'; f.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:15;transition:opacity .45s'; $('hud').appendChild(f); } f.style.boxShadow = `inset 0 0 80px 24px ${col}`; f.style.opacity = 1; clearTimeout(this._ft); this._ft = setTimeout(() => f.style.opacity = 0, 250); },
    anim(E, dt) { const t = performance.now() / 1000;
      for (const r of E.racers) { const u = r.dg.userData, c = r.cyc; const want = c.st === 'open' && c.chew <= 0 ? .75 : c.st === 'prep' ? .18 : c.chew > 0 ? Math.abs(Math.sin(t * 14)) * .25 : 0;
        u.jaw.rotation.x = lerp(u.jaw.rotation.x, want, Math.min(1, dt * 14)); u.head.rotation.x = lerp(u.head.rotation.x, -want * .35, Math.min(1, dt * 10)); u.head.rotation.z = Math.sin(t * 1.3 + r.lane) * .06;
        u.wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * (.35 + Math.sin(t * (c.st === 'open' ? 9 : 3.5) + r.lane) * .3); });
        u.tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 2.2 - i * .6 + r.lane) * .22; });
        u.torso.scale.y = 1.15 + Math.sin(t * 2.5 + r.lane) * .03;
        const showRing = r.me ? 1 : .5, op = c.st === 'open' && c.chew <= 0 ? .9 : c.st === 'prep' ? .55 : 0; u.ring.material.opacity = lerp(u.ring.material.opacity, op * showRing, Math.min(1, dt * 12)); u.ring.material.color.set(c.st === 'prep' ? '#ffd02a' : '#4dff9a'); u.ring.scale.setScalar(1 + Math.sin(t * 10) * .08);
        u.glow.material.opacity = r.fire > 0 ? r.fire : u.ring.material.opacity * .5; u.glow.material.color.set(r.fire > 0 ? '#ff8a2a' : '#4dff9a'); if (r.fire > 0) { r.fire -= dt; u.glow.scale.setScalar(2.6 + (.8 - r.fire) * 4); } else u.glow.scale.setScalar(2.6);
        r.throwA = Math.max(0, (r.throwA || 0) - dt); r.obj.userData.pivot.rotation.x = r.throwA > 0 ? r.throwA * 2.4 : 0; r.obj.position.y = r.expr === 'happy' ? Math.abs(Math.sin(t * 10)) * .4 : 0; squash(r, dt); }
      const me = E.me, port = innerHeight > innerWidth; camera0(me.x, port, this.W, dt); },
    render(E, dt) { this.place(); this.anim(E, dt); },
    dispose() { for (const id of ['perf', 'chObj', 'chTut', 'chFlash']) { const d = $(id); if (d) d.remove(); } },
  });
}
function camera0(x, port, W, dt) { const c = camera; c.fov = port ? 62 : 40; c.updateProjectionMatrix(); c.position.set(x * .85, port ? 3.6 : 2.9, port ? 6.4 : 5.4); c.lookAt(x * .85, 2, DZ); W.tick(dt, c); }
