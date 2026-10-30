// 💫 VUELO DE ANILLOS v2 (3D): los 6 mochis vuelan por un cielo de golosinas atravesando anillos.
//  Novedades v2: control relativo (arrastrar como un joystick, preciso en móvil vertical), centro perfecto ✨,
//  combos con multiplicador, anillos que se mueven en la segunda mitad, nubes de tormenta que frenan,
//  túnel turbo de anillos dorados, retícula de puntería, estela, líneas de velocidad, resolución adaptativa.
//  Reglas justas: misma velocidad base y mismas reglas para todos; la ventaja se gana atravesando anillos.
import { THREE, camera, toon, outline, mesh, glowSprite, makeRunner, skyDome, lights, rnd, clamp, lerp, pick, Audio, OUCH } from './core3d.js?v=o48';
const L = 440, V0 = 13, XM = 6, YMIN = 1.2, YMAX = 8.5, BSTEP = .55, BMAX = 7;
const RCOL = ['#ff9cc8', '#ffc38a', '#ffe27a', '#8fe8cf', '#9fd0ff', '#c9b2ff'];
const SENS = 0.034; // unidades de mundo por píxel CSS de arrastre
const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
function softTex(draw, w = 128, h = 128) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
export default {
  id: 'anillos', name: 'Vuelo de Anillos', icon: '💫', maxT: 75, music: { bpm: 136, root: 62, scale: 'major' }, netKeys: ['x', 'y', 'z', 'v', 'boost', 'perf', 'streak', 'bonus', 'stun'], seed: 41, tagY: 1.6, tagS: .55,
  how: 'Desliza el dedo en cualquier parte para guiar a tu mochi. Atraviesa los anillos (en el centro ✨ vale más), encadena combos y esquiva las nubes de tormenta ⛈️.',
  dispose() { const tt = document.getElementById('toast'); if (tt) tt.style.cssText = this._tcss || ''; for (const id of ['perf', 'anRet', 'anCombo', 'anVig']) { const d = document.getElementById(id); if (d) d.remove(); } },
  init(E) {
    const sc = E.scene; this.E = E; sc.fog = new THREE.Fog('#ffe3f1', 55, 170);
    this.sky = skyDome(sc, '#7fbcff', '#ffcfe6', '#fff2dc', 'dream'); this.sky.renderOrder = -1;
    const lt = lights(sc, '#ffffff', '#ffd6ea', 1.0, 2.0); lt.d.position.set(-60, 120, -200);
    // sol con halo (luz de contra) y destellos
    this.sun = new THREE.Group(); this.sun.add(glowSprite('#fff3c4', 28, .7)); this.sun.add(glowSprite('#ffd27a', 70, .22)); sc.add(this.sun);
    // suelo de gelatina con brillo y colinas, piruletas, cristales de azúcar
    mesh(new THREE.PlaneGeometry(260, L + 260), toon('#ffc4e0', { rim: 0 }), sc, [0, -6, -L / 2], [-Math.PI / 2, 0, 0]);
    const hillG = new THREE.SphereGeometry(1, 20, 14), stickG = new THREE.CylinderGeometry(.2, .2, 9, 8), popG = new THREE.CylinderGeometry(2, 2, .5, 28), crystG = new THREE.OctahedronGeometry(1, 0);
    for (let z = 0; z > -L - 100; z -= 18) for (const s of [-1, 1]) {
      const c = pick(['#8fe8cf', '#ffd98a', '#c9b2ff', '#ff9cc8', '#9fd0ff']); mesh(hillG, toon(c, { rim: .45 }), sc, [s * rnd(20, 36), -6, z + rnd(-6, 6)], null, [rnd(5, 9), rnd(3.5, 8), rnd(5, 9)]);
      if (Math.random() < .5) { const lp = new THREE.Group(); lp.position.set(s * rnd(13, 18), -6, z); lp.rotation.z = rnd(-.15, .15); sc.add(lp); mesh(stickG, toon('#ffffff'), lp, [0, 4.5, 0]); const pop = mesh(popG, toon(pick(['#ff7fbf', '#7ee3c4', '#ffd36b', '#b9a2f7']), { rim: .5 }), lp, [0, 9.5, 0], [Math.PI / 2, 0, 0]); outline(pop, '#5a3a6e', 1.04); }
      else if (Math.random() < .35) { const cr = mesh(crystG, toon(pick(['#bfefff', '#ffd1f0', '#fff3b0']), { emissive: '#ffffff', ei: .25, rim: .8 }), sc, [s * rnd(11, 16), -5, z], [0, rnd(0, 3), 0], [1, 2.2, 1]); outline(cr, '#5a3a6e', 1.05); }
    }
    // nubes en capas (parallax) con instancias
    const cloudG = new THREE.SphereGeometry(1, 12, 10), cloudM = toon('#ffffff', { rim: .7 }); this.clouds = [];
    for (let i = 0; i < 22; i++) { const c = new THREE.Group(); c.position.set(rnd(-46, 46), rnd(-3, 22), rnd(-L - 80, 10)); if (Math.abs(c.position.x) < 11 && c.position.y > -1 && c.position.y < 11) c.position.x += c.position.x < 0 ? -13 : 13; for (let k = 0; k < 4; k++) mesh(cloudG, cloudM, c, [k * 1.7 - 3.4, rnd(-.5, .9), rnd(-.6, .6)], null, Array(3).fill(rnd(1.5, 2.9))); c.userData.sp = rnd(.3, 1); sc.add(c); this.clouds.push(c); }
    // polvo de azúcar flotando (Points baratos, se recicla alrededor de la cámara)
    const N = 240, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = rnd(-20, 20); pos[i * 3 + 1] = rnd(-4, 16); pos[i * 3 + 2] = rnd(-90, 10); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dotT = softTex((x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,240,250,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }, 64, 64);
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: .22, map: dotT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#fff6d8' })); sc.add(this.dust);
    // líneas de velocidad
    const SL = 36, sp = new Float32Array(SL * 6); this.speedL = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false })); this.speedD = Array.from({ length: SL }, () => ({ a: rnd(0, 6.283), r: rnd(2.5, 7), z: rnd(-30, 0) })); sc.add(this.speedL);
    // arcoíris de meta y cartel
    RCOL.forEach((c, k) => mesh(new THREE.TorusGeometry(15 - k * .75, .38, 10, 64, Math.PI), toon(c, { emissive: c, ei: .35 }), sc, [0, -6, -L], null));
    { const tx = softTex((x) => { x.fillStyle = '#ff6fae'; x.beginPath(); x.roundRect(6, 6, 1012, 244, 80); x.fill(); x.lineWidth = 14; x.strokeStyle = '#fff'; x.stroke(); x.font = '700 160px Fredoka'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText('¡META!', 512, 136); }, 1024, 256); mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: tx, transparent: true }), sc, [0, 10, -L]); }
    // ---------- ruta: anillos (normales, dorados, móviles), túnel turbo y nubes de tormenta ----------
    this.R = []; this.S = []; let z = -22, cx = 0, cy = 4, k = 0; const tunnelAt = [.42, .78];
    const ringGeo = {}, rg = (r, t) => ringGeo[r.toFixed(2) + t] || (ringGeo[r.toFixed(2) + t] = new THREE.TorusGeometry(r, t, 12, 48));
    const addRing = (x, y, zz, rr, kind, mv) => {
      const gold = kind === 'gold', col = gold ? '#ffd23a' : kind === 'turbo' ? '#ffe9a0' : RCOL[k % RCOL.length];
      const g = new THREE.Group(); g.position.set(x, y, zz); sc.add(g);
      const ring = mesh(rg(rr, gold ? .18 : .22), toon(col, { emissive: col, ei: .5, rim: .6 }), g); 
      const inner = mesh(rg(rr * .42, .05), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, depthWrite: false }), g); // zona ✨ perfecta
      const disc = mesh(new THREE.CircleGeometry(rr * .96, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide }), g);
      g.add(glowSprite(col, rr * 3.4, gold ? .65 : .32));
      if (gold) { g.userData.st = mesh(new THREE.OctahedronGeometry(.28, 0), toon('#fff6c0', { emissive: '#ffe27a', ei: .9 }), g); }
      this.R.push({ x, y, z: -zz, x0: x, y0: y, rr, gold, kind, mv, g, ring, inner, disc, got: new Set(), pop: 0 }); k++;
    };
    while (z > -L + 14) { const d = clamp(-z / L, 0, 1);
      if (tunnelAt.length && d > tunnelAt[0]) { tunnelAt.shift(); // túnel turbo: 6 anillos dorados seguidos en espiral suave
        for (let i = 0; i < 6; i++) { addRing(clamp(cx + Math.sin(i * .7) * 1.6, -XM + 1.2, XM - 1.2), clamp(cy + Math.cos(i * .7) * 1, YMIN + 1.2, YMAX - 1.2), z, 1.5, 'turbo', null); z -= 5.5; } z -= 6; continue; }
      const amp = lerp(1.6, 4.4, d);
      cx = clamp(cx + rnd(-amp, amp), -XM + 1, XM - 1); cy = clamp(cy + rnd(-amp * .7, amp * .7), YMIN + 1, YMAX - 1);
      const gold = k % 7 === 6, rr = gold ? lerp(1.15, .95, d) : lerp(1.95, 1.35, d);
      const mv = d > .5 && !gold && Math.random() < .45 ? { ax: rnd(.8, 1.8) * (Math.random() < .5 ? 1 : 0), ay: rnd(.6, 1.2), w: rnd(1.2, 2), ph: rnd(0, 6.28) } : null;
      if (mv) { cx = clamp(cx, -XM + 1 + mv.ax, XM - 1 - mv.ax); cy = clamp(cy, YMIN + 1 + mv.ay, YMAX - 1 - mv.ay); }
      addRing(cx, cy, z, rr, gold ? 'gold' : 'n', mv);
      // nube de tormenta entre anillos (a partir del 25 %), nunca tapando el camino recto entre dos anillos
      if (d > .25 && Math.random() < lerp(.25, .6, d)) { const sx = clamp(cx + (Math.random() < .5 ? -1 : 1) * rnd(2.2, 3.6), -XM, XM), sy = clamp(cy + rnd(-1.5, 1.5), YMIN, YMAX), szz = z - rnd(4, 6);
        const g = new THREE.Group(); g.position.set(sx, sy, szz); sc.add(g); const m = toon('#7a6a9a', { rim: .5 });
        for (let q = 0; q < 4; q++) mesh(cloudG, m, g, [q * .7 - 1, rnd(-.2, .3), rnd(-.3, .3)], null, Array(3).fill(rnd(.7, 1)));
        const bolt = mesh(new THREE.ConeGeometry(.18, 1.1, 4), toon('#ffe27a', { emissive: '#ffe27a', ei: 1 }), g, [0, -1, 0], [Math.PI, 0, 0]); g.add(glowSprite('#c9b2ff', 4, .25));
        this.S.push({ x: sx, y: sy, z: -szz, g, bolt, hit: new Set() }); }
      z -= lerp(13, 9.5, d) + rnd(-1, 1.5); }
    // corredores
    const off = [[0, 0], [-1.6, .9], [1.6, .9], [-2.8, -.6], [2.8, -.6], [0, 1.8]];
    E.racers.forEach((r, i) => { r.obj = makeRunner(r.ch, i, .55); r.obj.userData.shadow.visible = false; sc.add(r.obj); const o = off[i] || [0, 0]; r.x = o[0]; r.y = 4 + o[1]; r.z = 0; r.tx = r.x; r.ty = r.y; r.vx = 0; r.vy = 0; r.v = 0; r.boost = 0; r.perf = 0; r.streak = 0; r.bonus = 0; r.next = 0; r.stun = 0; r.best = 0; r.obj.rotation.y = Math.PI;
      if (r.me) { const tm = new THREE.MeshBasicMaterial({ color: r.ch.color || '#ff9cc8', transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }); this.trail = []; for (let q = 0; q < 12; q++) { const s = mesh(new THREE.SphereGeometry(.16, 8, 6), tm.clone(), sc); this.trail.push(s); } this.trailP = Array.from({ length: 12 }, () => new THREE.Vector3(r.x, r.y, 0)); } });
    // guía al siguiente anillo (puntitos)
    this.guide = []; for (let q = 0; q < 4; q++) this.guide.push(mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7, depthWrite: false }), sc));
    // HUD propio
    const hud = document.getElementById('hud');
    let pd = document.getElementById('perf'); if (!pd) { pd = document.createElement('div'); pd.id = 'perf'; pd.style.cssText = 'position:absolute;right:10px;top:calc(88px + env(safe-area-inset-top));background:rgba(110,60,150,.55);color:#fff;font:700 14px Fredoka;border-radius:12px;padding:4px 10px;text-align:right;line-height:1.3'; hud.appendChild(pd); } this.pd = pd;
    const cb = document.createElement('div'); cb.id = 'anCombo'; cb.style.cssText = 'position:absolute;left:50%;top:auto;bottom:calc(254px + env(safe-area-inset-bottom));transform:translateX(-50%) scale(1);font:700 30px Fredoka;color:#fff;-webkit-text-stroke:1.5px #e0609f;text-shadow:0 3px 0 #e0609f;opacity:0;transition:opacity .25s;white-space:nowrap'; hud.appendChild(cb); this.cb = cb;
    const vg = document.createElement('div'); vg.id = 'anVig'; vg.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(255,255,255,0) 55%,rgba(255,226,122,.55) 100%);transition:opacity .2s'; hud.prepend(vg); this.vg = vg;
    const rt = document.createElement('div'); rt.id = 'anRet'; rt.style.cssText = 'position:absolute;left:0;top:0;width:54px;height:54px;margin:-27px 0 0 -27px;border:3px dashed rgba(255,255,255,.9);border-radius:50%;box-shadow:0 0 10px rgba(255,120,200,.6);opacity:0;transition:opacity .2s'; hud.appendChild(rt); this.rt = rt;
    const to = document.getElementById('toast'); this._tcss = to.style.cssText; Object.assign(to.style, { top: 'auto', bottom: 'calc(200px + env(safe-area-inset-bottom))', width: 'max-content', maxWidth: '86vw', padding: '4px 16px 6px', borderRadius: '18px', background: 'rgba(110,60,150,.55)', zIndex: 6, fontSize: '24px' });
    this.camZ = 7; camera.far = 600; camera.updateProjectionMatrix();
    this.drag = null; this.fps = { n: 0, t: 0, v: 60, low: 0 }; this.pr = 0; this.v3 = new THREE.Vector3();
  },
  // resolución nítida a devicePixelRatio (hasta 3) con bajada automática si el móvil no llega a 60 fps
  _res(dt) { const p3 = window.__p3; if (!p3) return; const f = this.fps; f.n++; f.t += dt;
    if (!this.pr) { this.pr = Math.min(devicePixelRatio || 1, new URLSearchParams(location.search).get('q') === 'low' ? 1 : 3); p3.renderer.setPixelRatio(this.pr); p3.renderer.setSize(innerWidth, innerHeight, false); }
    if (f.t >= 1) { f.v = f.n / f.t; f.n = 0; f.t = 0; window.__anFps = f.v; if (f.v < 52 && this.pr > 1.25) { if (++f.low >= 2) { this.pr = Math.max(1.25, this.pr - .5); p3.renderer.setPixelRatio(this.pr); p3.renderer.setSize(innerWidth, innerHeight, false); f.low = 0; } } else f.low = 0; } },
  idle(E, dt) { this.render(E, dt); },
  _ringPos(g, t) { if (g.mv) { g.x = g.x0 + Math.sin(t * g.mv.w + g.mv.ph) * g.mv.ax; g.y = g.y0 + Math.cos(t * g.mv.w * .8 + g.mv.ph) * g.mv.ay; } },
  update(E, dt) {
    const t = E.t; for (let i = 0; i < this.R.length; i++) this._ringPos(this.R[i], t);
    // control relativo: el punto de apoyo se fija al tocar y el dedo mueve el objetivo (no hace falta tapar al mochi)
    const me = E.me, inp = E.input;
    if (!E.AUTO) { if (inp.down && inp.px != null) { if (!this.drag) this.drag = { px: inp.px, py: inp.py, tx: me.tx, ty: me.ty }; const sx = innerWidth < 500 ? 1 : 390 / Math.min(innerWidth, 900);
        me.tx = clamp(this.drag.tx + (inp.px - this.drag.px) * SENS * sx * 1.15, -XM, XM); me.ty = clamp(this.drag.ty - (inp.py - this.drag.py) * SENS * sx, YMIN, YMAX);
        // si se sale del rango, se re-ancla para que no haya zona muerta al volver
        this.drag.tx = me.tx - (inp.px - this.drag.px) * SENS * sx * 1.15; this.drag.ty = me.ty + (inp.py - this.drag.py) * SENS * sx; } else this.drag = null; }
    for (const r of E.racers) {
      if (r.remote) continue;
      if (r.fin) { r.v = Math.max(4, r.v - 6 * dt); r.z += r.v * dt; continue; }
      const vmax = (V0 + r.bonus + (r.boost > 0 ? 3.5 : 0)) * (r.stun > 0 ? .55 : 1); r.v = r.v < vmax ? Math.min(vmax, r.v + 8 * dt) : Math.max(vmax, r.v - (r.stun > 0 ? 14 : 3) * dt); if (r.boost > 0) r.boost -= dt; if (r.stun > 0) r.stun -= dt;
      r.bonus = Math.max(0, r.bonus - .12 * dt);
      while (r.next < this.R.length && this.R[r.next].z < r.z - .5) r.next++;
      const nr = this.R[r.next];
      if (r.me && !E.AUTO) {} else if (nr) { if (!r.plan || r.plan.k !== r.next) { const ok = r.me || Math.random() < .55 + .4 * r.skill, e = ok ? nr.rr * rnd(0, r.me ? .3 : .5) : nr.rr * rnd(1.1, 2), a = rnd(0, 6.283); r.plan = { k: r.next, e, a }; } const lead = nr.mv ? Math.min(1, (nr.z - r.z) / Math.max(1, r.v) ) : 0; r.tx = nr.x + Math.cos(r.plan.a) * r.plan.e; r.ty = nr.y + Math.sin(r.plan.a) * r.plan.e; }
      r.vx += ((r.tx - r.x) * 38 - r.vx * 10.5) * dt; r.vy += ((r.ty - r.y) * 38 - r.vy * 10.5) * dt; r.x = clamp(r.x + r.vx * dt, -XM - .5, XM + .5); r.y = clamp(r.y + r.vy * dt, YMIN - .3, YMAX + .3);
      const oz = r.z; r.z += r.v * dt;
      for (let i = Math.max(0, r.next - 1); i < Math.min(this.R.length, r.next + 2); i++) { const g = this.R[i]; if (oz < g.z && r.z >= g.z && !g.got.has(r.id)) { g.got.add(r.id); const d = Math.hypot(r.x - g.x, r.y - g.y);
        if (d < g.rr - .2) { const perfect = d < g.rr * .42, gold = g.gold || g.kind === 'turbo'; r.perf++; r.streak++; r.best = Math.max(r.best, r.streak); r.boost = gold ? 1.3 : perfect ? 1.1 : .8;
          const mult = 1 + Math.min(5, r.streak - 1) * .12; r.bonus = Math.min(BMAX, r.bonus + BSTEP * (g.gold ? 2.2 : g.kind === 'turbo' ? 1.1 : 1) * (perfect ? 1.5 : 1) * mult); r.expr = 'happy';
          if (r.me) { g.pop = 1; Audio.sfxPlay(g.gold ? 'fanfare' : perfect ? 'stars' : 'got'); if (r.streak % 5 === 0) Audio.sfxPlay('level'); vib(perfect ? 25 : 12);
            const msg = g.gold ? '⭐ ¡Anillo dorado!' : g.kind === 'turbo' ? '🚀 ¡Túnel turbo!' : perfect ? '✨ ¡PERFECTO!' : r.streak >= 5 ? `¡Imparable! 🔥` : r.streak >= 3 ? '¡Racha!' : '¡Anillo! 💫';
            E.ui.toast(msg, g.gold || perfect ? '#ffe27a' : '#ffffff'); this._combo(r.streak, mult);
            E.burst(new THREE.Vector3(g.x, g.y, -g.z), gold ? '#ffe27a' : perfect ? '#ffffff' : RCOL[i % 6], perfect ? 26 : 16, 6, .6, .55, 0); if (g.gold || (perfect && r.streak >= 5)) { E.ui.flash(); E.shake = .12; } } }
        else { r.streak = 0; if (r.me) { this._combo(0); if (d < g.rr + 1.2) { E.ui.toast(pick(['¡Uy, por fuera!', '¡Casi!', '¡Rozando el anillo!']), '#ffd0e8'); Audio.sfxPlay('tick'); } } else if (Math.random() < .2) E.say(r, pick(['¡Se me ha escapado!', '¡Ese anillo se movió!', ...OUCH])); } } }
      for (const s of this.S) if (!s.hit.has(r.id) && oz < s.z && r.z >= s.z - .2 && Math.hypot(r.x - s.x, r.y - s.y) < 1.35) { s.hit.add(r.id); r.stun = .9; r.streak = 0; r.boost = 0; r.bonus *= .7; r.expr = 'squash';
        if (r.me) { E.shake = .35; Audio.sfxPlay('thunder'); vib([30, 40, 30]); E.ui.toast('⛈️ ¡Bzzt! Nube de tormenta', '#c9b2ff'); this._combo(0); E.burst(new THREE.Vector3(r.x, r.y, -r.z), '#c9b2ff', 18, 5, .5, .5, 0); } else if (Math.random() < .5) E.say(r, pick(['¡Me ha dado un rayo!', ...OUCH])); }
      r.prog = clamp(r.z / L, 0, 1); if (r.z >= L) E.finish(r);
    }
  },
  _combo(n, mult) { if (n >= 2) { this.cb.textContent = `COMBO x${n} · ⚡${mult.toFixed(2)}`; this.cb.style.opacity = 1; this.cb.animate([{ transform: 'translateX(-50%) scale(1.35)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 220, easing: 'cubic-bezier(.3,1.6,.5,1)' }); } else this.cb.style.opacity = 0; },
  render(E, dt) {
    this._res(dt);
    const t = performance.now() / 1000, me = E.me, et = E.t;
    if (E.phase !== 'run') for (const g of this.R) this._ringPos(g, et);
    for (const g of this.R) { const near = g.z > me.z - 4 && g.z < me.z + 125; g.g.visible = near; if (!near) continue; g.g.position.set(g.x, g.y, -g.z);
      const mine = g.got.has('me'); g.ring.rotation.z = t * (g.gold ? 1.6 : .4) + g.z; g.g.rotation.z = Math.sin(t * 1.5 + g.z) * .15;
      if (mine) { g.pop = Math.max(0, g.pop - dt * 2.5); g.g.scale.setScalar(1 + (1 - g.pop) * .9); g.ring.material.opacity = g.pop; g.ring.material.transparent = true; g.disc.material.opacity = 0; g.inner.material.opacity = g.pop * .6; if (g.pop <= 0) g.g.visible = false; }
      else { const isNext = g === this.R[me.next]; g.g.scale.setScalar((1 + Math.sin(t * 4 + g.z) * .04) * (isNext ? 1.05 : 1)); g.disc.material.opacity = isNext ? .16 + Math.sin(t * 6) * .05 : .07; g.inner.material.opacity = isNext ? .7 : .35; }
      if (g.g.userData.st) g.g.userData.st.rotation.y = t * 3; }
    for (const s of this.S) { const near = s.z > me.z - 3 && s.z < me.z + 110; s.g.visible = near; if (near) { s.g.position.y = s.y + Math.sin(t * 2 + s.z) * .15; s.bolt.visible = Math.sin(t * 9 + s.z) > -.2; } }
    for (const c of this.clouds) c.position.x += Math.sin(t * .2 + c.position.z) * dt * c.userData.sp * .3;
    for (const r of E.racers) { const o = r.obj; o.position.set(r.x, r.y + Math.sin(t * 3 + r.k) * .12, -r.z); o.rotation.z = clamp(-r.vx * .08, -.55, .55) + (r.stun > 0 ? Math.sin(t * 40) * .25 : 0); o.userData.pivot.rotation.x = clamp(-.25 - r.vy * .05, -.7, .3);
      const s = .55 * (1 + Math.sin(t * 9 + r.k) * .04); o.userData.pivot.scale.set(s * (r.boost > 0 ? .92 : 1), s * (r.boost > 0 ? .92 : 1), s * (r.boost > 0 ? 1.3 : 1));
      if (!r.me && E.phase === 'run' && !r.fin && Math.random() < (r.boost > 0 ? .5 : .1)) E.burst(new THREE.Vector3(r.x, r.y + .3, -r.z + .6), r.boost > 0 ? '#ffe27a' : '#ffffff', 1, 1.2, .35, .3, 0); }
    // estela del jugador
    if (this.trail) { this.trailP.unshift(this.trailP.pop().set(me.x, me.y + .25, -me.z + .5)); const b = me.boost > 0 ? 1.6 : 1; this.trail.forEach((s, q) => { const p = this.trailP[q]; s.position.set(p.x, p.y, p.z + q * .08 * me.v * .1); const k = 1 - q / this.trail.length; s.scale.setScalar(k * b * 1.3); s.material.opacity = k * (me.boost > 0 ? .8 : .45); s.material.color.set(me.boost > 0 ? '#ffe27a' : (me.ch.color || '#ff9cc8')); }); }
    // guía hacia el siguiente anillo
    const nr = this.R[me.next]; this.guide.forEach((s, q) => { if (!nr || me.fin) { s.visible = false; return; } const k = (q + 1) / 5; s.visible = true; s.position.set(lerp(me.x, nr.x, k), lerp(me.y, nr.y, k), -lerp(me.z, nr.z, k)); s.material.opacity = .65 * (1 - k * .5) * (.6 + .4 * Math.sin(t * 8 - q)); });
    // polvo alrededor de la cámara
    const dp = this.dust.geometry.attributes.position, a = dp.array; for (let i = 0; i < a.length; i += 3) { if (a[i + 2] > -me.z + 10) { a[i + 2] -= 100; a[i] = me.x + rnd(-20, 20); a[i + 1] = rnd(-4, 16); } } dp.needsUpdate = true;
    // líneas de velocidad
    const sv = clamp((me.v - V0 + (me.boost > 0 ? 3 : 0)) / 6, 0, 1), la = this.speedL.geometry.attributes.position.array; this.speedD.forEach((d, q) => { d.z += me.v * dt * 1.5; if (d.z > 4) { d.z = rnd(-30, -10); d.a = rnd(0, 6.283); d.r = rnd(2.5, 7); } const x = me.x + Math.cos(d.a) * d.r, y = me.y + 1 + Math.sin(d.a) * d.r * .8, zz = -me.z + d.z; la.set([x, y, zz, x, y, zz - 1.5 - sv * 3], q * 6); });
    this.speedL.geometry.attributes.position.needsUpdate = true; this.speedL.material.opacity = sv * .55;
    this.vg.style.opacity = me.boost > 0 ? .9 : 0;
    this.pd.innerHTML = `💫 Anillos: ${me.perf}<br>🔥 Racha: x${me.streak} <small>(mejor ${me.best})</small><br>🚀 +${Math.round(me.bonus / V0 * 100)}% vel.`;
    this.camZ = lerp(this.camZ, -me.z + 7.5, Math.min(1, dt * 8));
    camera.fov = lerp(camera.fov, 68 + clamp(me.v - V0, 0, 7) * 1.4 + (me.boost > 0 ? 5 : 0), Math.min(1, dt * 4)); camera.updateProjectionMatrix();
    camera.position.set(me.x * .55, me.y + 2.2, this.camZ); camera.lookAt(me.x * .7, me.y + .3, -me.z - 10); camera.rotateZ(clamp(-me.vx * .012, -.12, .12));
    this.sky.position.copy(camera.position); this.sun.position.set(camera.position.x - 40, camera.position.y + 45, camera.position.z - 300); this.dust.position.set(0, 0, 0);
    // retícula: proyección del objetivo del jugador en pantalla
    if (this.drag && !me.fin) { this.v3.set(me.tx, me.ty, -me.z).project(camera); this.rt.style.transform = `translate(${(this.v3.x + 1) / 2 * innerWidth}px,${(1 - this.v3.y) / 2 * innerHeight}px)`; this.rt.style.opacity = .85; } else this.rt.style.opacity = 0;
  }
};
