// 🫧 NADO EN GELATINA (3D): piscina translúcida de gelatina con medusas, montañas de flan y arcoíris
import { THREE, camera, toon, outline, mesh, glowSprite, makeRunner, skyDome, lights, rnd, clamp, lerp, pick, Audio, OUCH } from './core3d.js?v=o44';
const L = 240, LW = 2, VM = 13, V0 = 9.5, BSTEP = .35, BMAX = 2.2, ACT = .8, Z0 = 26; // tanda 4: más rápido y trepidante
// posiciones FIJAS: medusa ARRIBA flota en el aire (bucea), medusa ABAJO está en el fondo (salta). Nunca a medias.
const YUP = 1.25, YDN = -1.35, WARN = 2.2;
function signTex(dive) { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); const c = dive ? '#5b8cff' : '#ff5fa8';
  x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(128, 136, 108, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(128, 128, 110, 0, 7); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(128, 128, 94, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); if (dive) { x.moveTo(128, 205); x.lineTo(62, 125); x.lineTo(102, 125); x.lineTo(102, 55); x.lineTo(154, 55); x.lineTo(154, 125); x.lineTo(194, 125); } else { x.moveTo(128, 51); x.lineTo(62, 131); x.lineTo(102, 131); x.lineTo(102, 201); x.lineTo(154, 201); x.lineTo(154, 131); x.lineTo(194, 131); } x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const laneX = l => (l - 2.5) * LW;
function checker() { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#fff' : '#5a3a6e'; x.fillRect(i * 16, j * 16, 16, 16); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
function tiles() { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#ffe6f2'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#ffb3d6'; x.lineWidth = 4; for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 90); t.colorSpace = THREE.SRGBColorSpace; return t; }
export default {
  id: 'nado', name: 'Nado en Gelatina', icon: '🫧', maxT: 70, music: { bpm: 124, root: 65, scale: 'pentatonic' }, netKeys: ['z', 'v', 'act', 'ak', 'stun', 'lane', 'perf', 'streak', 'bonus'], seed: 47, tagY: 1.7, tagS: .55, buttons: true,
  how: '¡Más rápido que nunca! Pasa por los AROS ARCOÍRIS 🌈 y las corrientes para ir a toda pastilla y coge burbujas ⭐. Medusa ROSA en el aire 🔽 = 🫧 BUCEA. Medusa AZUL en el fondo 🔼 = ⬆ SALTA. Si pulsas antes, tu mochi lo hace solo en el momento justo. ¡Pulsar justo a tiempo = Perfecto y turbo!',
  dispose() { const d = document.getElementById('perf'); if (d) d.remove(); const L0 = document.getElementById('bL'), R0 = document.getElementById('bR'), M0 = document.getElementById('bM'); L0.innerHTML = '⬅'; R0.innerHTML = '➡'; M0.style.display = ''; L0.style.cssText = R0.style.cssText = ''; },
  init(E) {
    E.REACT = new URLSearchParams(location.search).has('react');
    const sc = E.scene; sc.fog = new THREE.Fog('#ffd0e8', 50, 190); this.sky = skyDome(sc, '#8fd0ff', '#ffd6ec', '#fff2dc', 'dream'); this.sky.renderOrder = -1; lights(sc, '#ffffff', '#ffc6e2', 1.0, 2.0);
    // fondo de azulejos y paredes
    const W = LW * 6 + 1;
    mesh(new THREE.PlaneGeometry(W, L + 30), new THREE.MeshToonMaterial({ map: tiles() }), sc, [0, -2.2, -L / 2], [-Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(1.2, 3.2, L + 30), toon('#ffffff', { rim: .3 }), sc, [s * (W / 2 + .6), -.7, -L / 2]); outline(w, '#c98ab0', 1.01); mesh(new THREE.BoxGeometry(8, .4, L + 60), toon('#bff0dc'), sc, [s * (W / 2 + 5), .7, -L / 2]); }
    // superficie de gelatina ondulante (translúcida)
    const sg = new THREE.PlaneGeometry(W, L + 30, 16, 160); sg.rotateX(-Math.PI / 2); this.sg = sg; this.base = sg.attributes.position.array.slice();
    const jm = new THREE.MeshPhongMaterial({ color: '#ff7fbf', transparent: true, opacity: .6, shininess: 70, specular: '#ffb8dc', depthWrite: false, side: THREE.DoubleSide });
    const surf = mesh(sg, jm, sc, [0, 0, -L / 2]); surf.renderOrder = 2;
    mesh(new THREE.BoxGeometry(W, 2.1, L + 30), new THREE.MeshPhongMaterial({ color: '#ff6fb2', transparent: true, opacity: .22, depthWrite: false }), sc, [0, -1.15, -L / 2]).renderOrder = 1;
    // corcheras
    const bg = new THREE.SphereGeometry(.14, 6, 4); const nB = Math.floor((L + 20) / .5);
    for (let l = 1; l < 6; l++) { const im = new THREE.InstancedMesh(bg, toon('#ffffff'), nB), tmp = new THREE.Object3D(), col = new THREE.Color();
      for (let i = 0; i < nB; i++) { tmp.position.set(laneX(l) - LW / 2, .05, 10 - i * .5); tmp.updateMatrix(); im.setMatrixAt(i, tmp.matrix); im.setColorAt(i, col.set(Math.floor(i / 6) % 2 ? ['#ff7fbf', '#7ee3c4', '#ffd36b', '#8fd0ff', '#c9b2ff'][l - 1] : '#ffffff')); } sc.add(im); }
    // salida y meta
    for (const [z, c] of [[0, '#9b82f0'], [-L, '#ff6fae']]) { mesh(new THREE.BoxGeometry(W + 2.4, .5, 1.2), toon(c), sc, [0, .4, z + (z ? -.6 : .6)]); if (z) { for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(.3, .3, 6, 12), toon('#fff'), sc, [s * (W / 2 + 1), 3, z]); mesh(new THREE.PlaneGeometry(W + 2, 1), new THREE.MeshBasicMaterial({ map: checker(), side: THREE.DoubleSide }), sc, [0, 5.5, z]); } }
    // montañas de flan y arcoíris
    for (let i = 0; i < 16; i++) { const s = i % 2 ? 1 : -1, g = new THREE.Group(); g.position.set(s * rnd(22, 60), 0, -i * 13 + rnd(-6, 6) - 10); const hh = rnd(8, 18), r = rnd(6, 11); sc.add(g);
      const f = mesh(new THREE.CylinderGeometry(r * .7, r, hh, 24), toon('#ffd27a', { rim: .5 }), g, [0, hh / 2, 0]); outline(f, '#b8742a', 1.02);
      mesh(new THREE.CylinderGeometry(r * .72, r * .72, hh * .18, 24), toon('#a8521e', { rim: .3 }), g, [0, hh * .93, 0]);
      if (i % 3 === 0) { mesh(new THREE.SphereGeometry(r * .25, 14, 10), toon('#ff4f6a'), g, [0, hh + r * .2, 0]); } }
    const rb = new THREE.Group(); rb.position.set(0, -6, -L - 40); sc.add(rb);
    ['#ff7f9f', '#ffb36b', '#ffe27a', '#7ee3c4', '#8fd0ff', '#c9b2ff'].forEach((c, i) => { const m = toon(c, { emissive: c, ei: .35, rim: 0 }); m.fog = false; mesh(new THREE.TorusGeometry(60 - i * 2.4, 1.2, 8, 60, Math.PI), m, rb); });
    for (let i = 0; i < 10; i++) { const c = new THREE.Group(); c.position.set(rnd(-90, 90), rnd(25, 45), -rnd(20, L + 80)); for (let k = 0; k < 5; k++) mesh(new THREE.SphereGeometry(rnd(3, 5), 12, 9), toon('#ffffff', { rim: .7 }), c, [k * 3.2 - 6, rnd(-1, 1.5), rnd(-1, 1)]); sc.add(c); }
    // medusas
    // medusas: color + posición + cartel dicen lo mismo. ARRIBA (rosa, en el aire) = 🫧 bucea · ABAJO (azul, en el fondo) = ⬆ salta
    this.J = []; const mk = up => ({ dm: new THREE.MeshPhongMaterial({ color: up ? '#ff9cd0' : '#5fd0ff', transparent: true, opacity: .92, emissive: up ? '#ff4fa0' : '#1fa0ff', emissiveIntensity: up ? .4 : .85, shininess: 110 }), tm: new THREE.MeshToonMaterial({ color: up ? '#ffd6ec' : '#d4ecff', transparent: true, opacity: .85 }), ol: up ? '#c0306f' : '#2f5fc0', sign: new THREE.SpriteMaterial({ map: signTex(up), depthTest: false, transparent: true, fog: false }), mark: new THREE.MeshBasicMaterial({ color: up ? '#ff5fa8' : '#5b8cff', transparent: true, opacity: .5, depthWrite: false }) });
    const MAT = { true: mk(true), false: mk(false) }; const domeG = new THREE.SphereGeometry(.55, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), tenG = new THREE.CylinderGeometry(.045, .02, .9, 6), eyeG = new THREE.SphereGeometry(.075, 10, 8), hiG = new THREE.SphereGeometry(.028, 6, 4), markG = new THREE.RingGeometry(.55, .82, 28);
    // curva de dificultad: filas separadas y con huecos al principio, más juntas y llenas al final (siempre > 1 s de reacción)
    for (let z = Z0; z < L - 8;) { const d = clamp((z - Z0) / (L - Z0 - 8), 0, 1), empty = lerp(.5, .25, d);
      for (let l = 0; l < 6; l++) { if (Math.random() < empty) continue; const up = Math.random() < .5, M = MAT[up], g = new THREE.Group(); sc.add(g); g.position.set(laneX(l), up ? YUP : YDN, -z);
        const body = new THREE.Group(); g.add(body); const dd = mesh(domeG, M.dm, body); outline(dd, M.ol, 1.06);
        for (const s2 of [-1, 1]) { const e = mesh(eyeG, toon('#2a1838', { rim: 0 }), body, [s2 * .19, .24, .46]); mesh(hiG, toon('#ffffff', { rim: 0 }), e, [.025, .03, .06]); mesh(new THREE.CircleGeometry(.07, 10), toon('#ff8fb8', { rim: 0 }), body, [s2 * .3, .13, .5]); }
        const tn = []; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, t2 = mesh(tenG, M.tm, body, [Math.cos(a) * .32, -.45, Math.sin(a) * .32]); tn.push(t2); }
        body.add(glowSprite(up ? '#ffb8e0' : '#b8dcff', 2.2, .4));
        const sg2 = new THREE.Sprite(M.sign); sg2.scale.setScalar(.95); sg2.position.y = up ? 1.05 : 2.75; sg2.renderOrder = 8; g.add(sg2);
        const mkr = mesh(markG, M.mark, sc, [laneX(l), .09, -z], [-Math.PI / 2, 0, 0]); mkr.renderOrder = 3;
        this.J.push({ z, lane: l, ph: rnd(0, 6), g, body, tn, up, sign: sg2, mkr }); }
      z += lerp(19, 14, d) + rnd(-.8, .8); }
    // tanda 4: AROS ARCOÍRIS (turbo), CORRIENTES (cintas que empujan) y BURBUJAS ⭐ en todas las calles (justo para todos)
    const jz = this.J.map(j => j.z).sort((a, b) => a - b), freeZ = z => jz.every(q => Math.abs(q - z) > 3.2);
    this.RG = []; const rgM = ['#ff7f9f', '#ffb36b', '#ffe27a', '#7ee3c4', '#8fd0ff', '#c9b2ff'].map(c => toon(c, { emissive: c, ei: .6, rim: 0 }));
    for (let z = Z0 + 6; z < L - 10; z += 13) { if (!freeZ(z)) { z -= 9; continue; } for (let l = 0; l < 6; l++) { if ((l + Math.round(z)) % 3 === 0) continue; const g = new THREE.Group(); g.position.set(laneX(l), .25, -z); sc.add(g);
        for (let k = 0; k < 3; k++) mesh(new THREE.TorusGeometry(.78 - k * .13, .07, 6, 26), rgM[(k + l) % 6], g); g.add(glowSprite('#fff3b0', 2.2, .5)); this.RG.push({ z, lane: l, g, got: new Set() }); } }
    this.CU = []; const cuTex = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const x = cv.getContext('2d'); x.fillStyle = 'rgba(255,255,255,0)'; x.fillRect(0, 0, 64, 256); x.fillStyle = 'rgba(255,255,255,.85)'; for (let y = 0; y < 256; y += 64) { x.beginPath(); x.moveTo(8, y + 40); x.lineTo(32, y + 10); x.lineTo(56, y + 40); x.lineTo(46, y + 40); x.lineTo(32, y + 24); x.lineTo(18, y + 40); x.fill(); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 4); return t; })(); this.cuTex = cuTex;
    for (let z = Z0 + 30; z < L - 20; z += 46) { const len = 9; for (let l = 0; l < 6; l++) { const m = mesh(new THREE.PlaneGeometry(LW * .8, len), new THREE.MeshBasicMaterial({ map: cuTex, color: '#7ee3ff', transparent: true, opacity: .8, depthWrite: false }), sc, [laneX(l), .07, -z - len / 2], [-Math.PI / 2, 0, 0]); m.renderOrder = 3; } this.CU.push({ z0: z, z1: z + len }); }
    this.BB = []; for (let z = Z0 + 3; z < L - 6; z += 7) { if (!freeZ(z)) continue; for (let l = 0; l < 6; l++) { if (Math.random() < .55) continue; const g = new THREE.Group(); g.position.set(laneX(l), .55, -z); sc.add(g); const b = mesh(new THREE.SphereGeometry(.22, 14, 10), new THREE.MeshPhongMaterial({ color: '#bff4ff', transparent: true, opacity: .6, shininess: 120, specular: '#fff' }), g); mesh(new THREE.OctahedronGeometry(.1, 0), toon('#ffe27a', { emissive: '#ffd36b', ei: .9 }), b); this.BB.push({ z, lane: l, g, taken: false }); } }
    // fondo: patitos de goma gigantes y delfines de gominola que saltan
    this.FX = []; for (let i = 0; i < 8; i++) { const s = i % 2 ? 1 : -1, d = new THREE.Group(); d.position.set(s * rnd(12, 20), 0, -i * 30 - rnd(10, 25)); sc.add(d); const duck = mesh(new THREE.SphereGeometry(1.6, 18, 12), toon('#ffe27a', { rim: .5 }), d, [0, .8, 0], null, [1.2, .9, 1]); outline(duck, '#c99a10', 1.04); const hd = mesh(new THREE.SphereGeometry(1, 16, 12), toon('#ffe27a', { rim: .5 }), d, [0, 2.4, .9]); outline(hd, '#c99a10', 1.05); mesh(new THREE.ConeGeometry(.45, .9, 10), toon('#ff9a3a'), hd, [0, -.1, 1.1], [Math.PI / 2, 0, 0]); for (const k of [-1, 1]) mesh(new THREE.SphereGeometry(.14, 8, 6), toon('#2a1838', { rim: 0 }), hd, [k * .4, .3, .82]); d.rotation.y = s > 0 ? -.6 : .6; const ph = rnd(0, 6); this.FX.push(t => { d.position.y = Math.sin(t * 1.5 + ph) * .3; d.rotation.z = Math.sin(t * 1.2 + ph) * .1; }); }
    for (let i = 0; i < 6; i++) { const s = i % 2 ? -1 : 1, x = s * rnd(9, 14), z0 = -i * 38 - 20, dl = new THREE.Group(); sc.add(dl); const bd = mesh(new THREE.CapsuleGeometry(.5, 1.6, 6, 12), toon(pick(['#8fd0ff', '#c9b2ff', '#ff9cc8']), { rim: .5 }), dl, [0, 0, 0], [Math.PI / 2, 0, 0]); outline(bd, '#5a3a8e', 1.05); mesh(new THREE.ConeGeometry(.3, .6, 6), bd.material, dl, [0, .55, .1]); for (const k of [-1, 1]) mesh(new THREE.SphereGeometry(.08, 8, 6), toon('#2a1838', { rim: 0 }), dl, [k * .25, .2, .95]); const ph = rnd(0, 3);
      this.FX.push(t => { const c = ((t * .45 + ph) % 3) / 3, k = Math.min(1, c * 2.2); dl.visible = c < .46; dl.position.set(x, -1 + Math.sin(k * Math.PI) * 4.5, z0 + (k - .5) * 9); dl.rotation.x = -Math.cos(k * Math.PI) * 1.1; }); }
    // nadadores
    E.racers.forEach((r, k) => { r.lane = E.online ? [2, 3, 1, 4, 0, 5][k] : r.me ? 2 : [0, 1, 3, 4, 5][k - 1]; r.obj = makeRunner(r.ch, k, .6); r.obj.userData.shadow.visible = false; r.obj.rotation.y = Math.PI; sc.add(r.obj); r.z = 0; r.v = 0; r.act = null; r.ak = 0; r.actT = 9; r.stun = 0; r.boost = 0; r.roll = 0; r.perf = 0; r.streak = 0; r.bonus = 0; });
    { const L0 = document.getElementById('bL'), R0 = document.getElementById('bR'); document.getElementById('bM').style.display = 'none'; const st = 'width:120px;height:120px;font-size:20px;line-height:1.1;background:rgba(155,130,240,.6)'; L0.innerHTML = '🫧<br><small style="font-size:15px">Bucear</small>'; R0.innerHTML = '⬆<br><small style="font-size:15px">Saltar</small>'; L0.style.cssText = st; R0.style.cssText = st.replace('155,130,240', '255,134,189'); }
    let pd = document.getElementById('perf'); if (!pd) { pd = document.createElement('div'); pd.id = 'perf'; pd.style.cssText = 'position:absolute;right:10px;top:calc(88px + env(safe-area-inset-top));background:rgba(110,60,150,.55);color:#fff;font:700 14px Fredoka;border-radius:12px;padding:4px 10px;text-align:right;line-height:1.25'; document.getElementById('hud').appendChild(pd); } this.pd = pd;
    this.camZ = 7; camera.far = 900; camera.updateProjectionMatrix();
  },
  jUp(j) { return j.up; },
  // reglas iguales para todos: nadas solo hacia delante a la misma velocidad base.
  // Ante cada medusa: si está ARRIBA, bucea; si está ABAJO, sáltala. Acción a tiempo = ¡Perfecto! (turbo + velocidad acumulada)
  act(E, r, type, j, q) { if ((r.act && r.ak < ACT * .55) || r.stun > 0) return;
    if (j && !q && (j.z - r.z) / Math.max(1, r.v) > .62) { r.queued = { type, j }; if (r.me) { Audio.sfxPlay('beep'); E.ui.toast(type === 'd' ? '🫧 ¡Listo para bucear!' : '⬆ ¡Listo para saltar!', '#ffffff'); } return; }
    r.queued = null; r.act = type; r.ak = 0; r.actT = j ? (j.z - r.z) / Math.max(1, r.v) : 9; if (r.me) Audio.sfxPlay(type === 'd' ? 'pop' : 'jump'); E.burst(new THREE.Vector3(laneX(r.lane), .2, -r.z), '#ffffff', type === 'd' ? 10 : 6, 3, .5, .35, -3); },
  update(E, dt) {
    window.__nado = { hits: E.me.hits || 0, perf: E.me.perf, jellies: this.J.length, t: E.t };
    for (const r of E.racers) {
      if (r.remote) continue;
      if (r.fin) { r.v *= Math.pow(.3, dt); r.z = Math.min(L - .8, r.z + r.v * dt); continue; }
      if (r.stun > 0 && (r.stun -= dt) <= 0) r.expr = '';
      if (r.boost > 0 && (r.boost -= dt) <= 0) r.expr = '';
      if (r.act && (r.ak += dt) > ACT) r.act = null;
      const vmax = V0 + r.bonus + (r.boost > 0 ? 1.2 : 0);
      if (r.stun <= 0) r.v = r.v < vmax ? Math.min(vmax, r.v + 5 * dt) : Math.max(vmax, r.v - 3 * dt);
      const next = this.J.find(j => j.lane === r.lane && j.z > r.z), tt = next ? (next.z - r.z) / Math.max(1, r.v) : 9;
      if (r.queued && (r.queued.j !== next)) r.queued = null;
      if (r.queued && tt <= .42) this.act(E, r, r.queued.type, next, true);
      if (r.me && !E.AUTO) {
        if (E.swipe || E.side.includes('L')) this.act(E, r, 'd', next);
        else if (E.swipeUp || E.side.includes('R') || E.ups.length) this.act(E, r, 'j', next);
      } else if (next && r.stun <= 0) {
        if (!r.plan || r.plan.j !== next) { const u = Math.random(), pP = r.me ? 1 : .2 + .6 * r.skill, pF = r.me ? 0 : .03 + .15 * (1 - r.skill), good = next.up ? 'd' : 'j';
          r.plan = u < pP ? { j: next, f: r.me ? (E.REACT ? WARN - rnd(.3, 1.9) : .22) : rnd(.15, .3), a: good } : u < pP + pF ? { j: next, f: .22, a: good === 'd' ? 'j' : 'd' } : { j: next, f: rnd(.4, .6), a: good }; }
        if (tt < r.plan.f && !r.plan.done) { r.plan.done = true; this.act(E, r, r.plan.a, next); }
      }
      const oz = r.z; r.z += r.v * dt;
      for (const c of this.CU) if (r.z > c.z0 && r.z < c.z1 && r.stun <= 0) { r.v = Math.min(VM + 2, r.v + 10 * dt); if (r.me && !r.inCu) { r.inCu = true; Audio.sfxPlay('boost'); E.ui.toast('🌊 ¡Corriente! ¡Wiii!', '#7ee3ff'); } } else if (r.me && c.z1 < r.z && r.z < c.z1 + 2) r.inCu = false;
      for (const g of this.RG) if (g.lane === r.lane && oz < g.z && r.z >= g.z && !g.got.has(r.id) && (r.me || Math.random() < .55 + .4 * r.skill)) { g.got.add(r.id); r.boost = Math.max(r.boost, 1.1); r.v = Math.min(VM + 1.5, r.v + 2.5); r.bonus = Math.min(BMAX, r.bonus + BSTEP * .5); r.expr = 'happy'; if (r.me) { Audio.sfxPlay('trick'); E.ui.toast(pick(['🌈 ¡Aro turbo!', '🌈 ¡Zas! ¡Turbo!', '🌈 ¡Arcoíris a tope!']), '#ffe27a'); E.ui.flash(); E.burst(new THREE.Vector3(laneX(r.lane), .5, -g.z), '#ffe27a', 16, 5, .5, .5, 0); } }
      for (const b of this.BB) if (!b.taken && b.lane === r.lane && oz < b.z && r.z >= b.z && (r.me || Math.random() < .5)) { b.taken = true; b.g.visible = false; r.bonus = Math.min(BMAX, r.bonus + BSTEP * .4); if (r.me) { r.bub = (r.bub || 0) + 1; Audio.sfxPlay('got'); E.burst(new THREE.Vector3(laneX(r.lane), .6, -b.z), '#bff4ff', 10, 4, .4, .4, 0); } }
      for (const j of this.J) if (j.lane === r.lane && oz < j.z && r.z >= j.z) {
        const ok = r.act === (j.up ? 'd' : 'j');
        if (!ok) { r.hits = (r.hits || 0) + 1; r.v *= .55; r.stun = .35; r.expr = 'squash'; r.bonus *= .5; r.streak = 0; r.act = null; E.burst(new THREE.Vector3(laneX(r.lane), .6, -j.z), '#c9b2ff', 14, 4, .6, .5); if (r.me) { Audio.sfxPlay('hit'); E.shake = .3; E.ui.toast(j.up ? '¡Bzzz! ¡Tenías que bucear! 🫧' : '¡Bzzz! ¡Tenías que saltar! ⬆', '#c9b2ff'); } else E.say(r, pick(['¡Me ha picado!', '¡Cosquillas eléctricas!', ...OUCH])); }
        else if (r.actT > .08 && r.actT < .42) { r.perf++; r.streak++; r.boost = .8; r.bonus = Math.min(BMAX, r.bonus + BSTEP); r.expr = 'happy'; if (r.me) { Audio.sfxPlay('trick'); E.ui.toast(r.streak > 1 ? `¡Perfecto! ⚡ x${r.streak}` : '¡Perfecto! ⚡', '#ffe27a'); } }
        else r.streak = 0;
        r.actT = 9;
      }
      r.prog = clamp(r.z / L, 0, 1); if (r.z >= L - .8) { r.z = L - .8; r.prog = 1; E.finish(r); E.burst(new THREE.Vector3(laneX(r.lane), .5, -L), '#ffffff', 20, 5, .6, .5); }
    }
  },
  render(E, dt) {
    const t = performance.now() / 1000, et = E.t, me = E.me;
    // olas en la gelatina
    const p = this.sg.attributes.position.array, b = this.base, cz = -me.z + L / 2;
    for (let i = 0; i < p.length; i += 3) { const x = b[i], z = b[i + 2]; let y = Math.sin(x * 1.3 + t * 2.2) * .06 + Math.sin(z * .8 - t * 2.8) * .07; for (const r of E.racers) { const dx = x - laneX(r.lane), dz = z - (-r.z + L / 2); const d2 = dx * dx + dz * dz; if (d2 < 9) y += Math.sin(Math.sqrt(d2) * 4 - t * 12) * .08 * (1 - d2 / 9) * (r.v / VM); } p[i + 1] = y; }
    this.sg.attributes.position.needsUpdate = true; this.sg.computeVertexNormals();
    for (const j of this.J) { const dz = j.z - me.z, vis = dz > -8 && dz < 70; j.g.visible = j.mkr.visible = vis; if (!vis) continue; const tt = dz / Math.max(2, me.v || V0), warn = tt < WARN && dz > 0;
      j.body.position.y = Math.sin(t * 2.4 + j.ph) * .07; j.body.scale.set(1 + Math.sin(t * 5 + j.ph) * .07, 1 - Math.sin(t * 5 + j.ph) * .07, 1); j.tn.forEach((q, k) => { q.rotation.x = Math.sin(t * 6 + k + j.ph) * .35; q.rotation.z = Math.cos(t * 5 + k) * .25; });
      const ps = warn ? 1.45 + Math.sin(t * 12) * .15 : 1.1; j.sign.scale.setScalar(ps * (j.lane === me.lane ? 1.15 : .9)); j.mkr.scale.setScalar(warn && j.lane === me.lane ? 1.15 + Math.sin(t * 12) * .1 : 1); }
    for (const r of E.racers) { const o = r.obj; r.roll = lerp(r.roll, 0, Math.min(1, dt * 5)); const k = r.act ? clamp(r.ak / ACT, 0, 1) : 0, y = r.act === 'd' ? -.28 - Math.sin(k * Math.PI) * 1.1 : r.act === 'j' ? -.28 + Math.sin(k * Math.PI) * 1.6 : -.28 + Math.sin(t * 6 + r.k) * .05; r.roll = Math.sin(t * 7 + r.k) * .3;
      o.position.set(laneX(r.lane), lerp(o.position.y, y, Math.min(1, dt * 14)), -r.z); o.userData.pivot.rotation.set(r.act === 'j' ? -.55 - k * 6.283 : -.55, 0, r.roll * .35 + (r.stun > 0 ? Math.sin(t * 30) * .3 : 0));
      if (r.act === 'd' && Math.random() < .5) E.burst(new THREE.Vector3(laneX(r.lane) + rnd(-.3, .3), .1, -r.z), '#ffffff', 1, 1.5, .35, .25, -3); }
    for (const f of this.FX) f(t); this.cuTex.offset.y = t * 2.5;
    for (const g of this.RG) { const dz = g.z - me.z; g.g.visible = dz > -4 && dz < 70 && !g.got.has(me.id); if (g.g.visible) { g.g.rotation.z = t * 2 + g.lane; g.g.scale.setScalar(1 + Math.sin(t * 6 + g.lane) * .06); } }
    for (const b of this.BB) if (!b.taken) { const dz = b.z - me.z; b.g.visible = dz > -4 && dz < 60; b.g.position.y = .55 + Math.sin(t * 3 + b.z) * .12; }
    if (me.boost > 0 && Math.random() < .7) E.burst(new THREE.Vector3(laneX(me.lane) + rnd(-.5, .5), .3, -me.z + .8), pick(['#ffe27a', '#ff9cc8', '#7ee3c4']), 1, 2, .4, .4, 0);
    this.pd.innerHTML = `⚡ Perfectos: ${me.perf}<br>🔥 Racha: x${me.streak}<br>⭐ Burbujas: ${me.bub || 0}<br>🚀 +${Math.round(me.bonus / V0 * 100)}% vel.`;
    camera.fov = lerp(camera.fov, 70 + clamp(me.v - V0, 0, 4) * 2 + (me.boost > 0 ? 7 : 0), Math.min(1, dt * 4)); camera.updateProjectionMatrix();
    this.camZ = lerp(this.camZ, -me.z + 8.5, Math.min(1, dt * 8));
    camera.position.set(laneX(me.lane) * .4, 4.6, this.camZ); camera.lookAt(laneX(me.lane) * .3, -.3, -me.z - 5); this.sky.position.copy(camera.position);
  }
};
