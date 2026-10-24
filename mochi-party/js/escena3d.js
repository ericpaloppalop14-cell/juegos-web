// ======================================================================
//  MOCHI PARTY · escenario 3D del menú (tanda 4)
//  Un único canvas WebGL detrás de las pantallas. Cada pantalla tiene un hueco <div class="stage3d">
//  y aquí se pinta, solo dentro de ese hueco, la escena que toca:
//   menu  → tu mochi bailando en un escenario con sus amigos, focos y confeti (tócalo: ¡voltereta!)
//   chars → el mochi elegido girando en su pedestal
//   intro → tú delante y los 5 rivales detrás, chinchando
//   podio → podio 1-2-3 con caída de los mochis, el ganador salta de alegría y los demás aplauden
// ======================================================================
import * as THREE from 'three';
import { CHARS } from '../carrera/js/data.js?v=m10';
import { makeCharacter, animCharacter, toon, outline, mesh, glowTex, makeTrophy } from '../carrera/js/gfx.js?v=m10';

const CH = id => CHARS.find(c => c.id === id) || CHARS[0];
const rnd = (a, b) => a + Math.random() * (b - a), lerp = (a, b, t) => a + (b - a) * t;
let renderer;
try {
  const cv = document.createElement('canvas'); cv.id = 'st3d'; document.body.appendChild(cv);
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) { document.body.classList.add('no3d'); throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
const DPR = Math.min(devicePixelRatio || 1, innerWidth * innerHeight > 600000 ? 1.75 : 2.25); renderer.setPixelRatio(DPR);
const size = () => renderer.setSize(innerWidth, innerHeight); addEventListener('resize', size); size();
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 200);
scene.add(new THREE.HemisphereLight('#ffffff', '#ffc6e2', 1.15)); const sun = new THREE.DirectionalLight('#fff4e8', 1.9); sun.position.set(4, 9, 7); scene.add(sun);
const back = new THREE.DirectionalLight('#ffd0f0', .9); back.position.set(-5, 6, -8); scene.add(back); const fillL = new THREE.PointLight('#fff0c8', 6, 14, 1.6); fillL.position.set(0, 3, 5); scene.add(fillL);

// ---------- piezas comunes ----------
const root = new THREE.Group(); scene.add(root);
const glow = (c, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(s); return sp; };
function textSprite(text, color, me) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const x = cv.getContext('2d'); x.scale(2, 2); x.font = '700 64px Fredoka, sans-serif';
  const w = Math.min(500, x.measureText(text).width + 70), l = (512 - w) / 2; x.fillStyle = me ? '#f0609f' : 'rgba(90,50,130,.85)'; x.beginPath(); x.roundRect(l, 16, w, 92, 46); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 6; x.stroke(); x.fillStyle = color; x.beginPath(); x.arc(l + 40, 62, 16, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256 + 16, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(2.4, .6, 1); s.renderOrder = 20; return s;
}
function numTex(n, c) { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.font = '700 104px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 14; x.strokeStyle = c; x.strokeText(n, 64, 70); x.fillStyle = '#fff'; x.fillText(n, 64, 70); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }

// escenario redondo tipo plató de concurso: tarta con bombillas
function stage(r = 3.2) {
  const g = new THREE.Group();
  const top = mesh(new THREE.CylinderGeometry(r, r, .35, 48), toon('#fff4fa', { rim: .3 }), g, [0, -.18, 0]); outline(top, '#d58ab8', 1.02);
  mesh(new THREE.CylinderGeometry(r + .25, r + .45, .55, 48), toon('#ff8fc4', { rim: .4 }), g, [0, -.6, 0]);
  mesh(new THREE.TorusGeometry(r * .62, .05, 6, 48), toon('#ffd6ea', { rim: 0 }), g, [0, .0, 0], [Math.PI / 2, 0, 0]);
  const bulbs = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; const b = mesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff3b0' }), g, [Math.cos(a) * (r + .36), -.48, Math.sin(a) * (r + .36)]); bulbs.push(b); }
  g.userData.bulbs = bulbs; return g;
}
// focos que barren
function spots() { const g = new THREE.Group(); const L = [];
  for (const [x, c] of [[-3.4, '#ff9cc8'], [3.4, '#8fd0ff'], [0, '#ffe27a']]) { const cone = mesh(new THREE.ConeGeometry(1.5, 9, 24, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), g, [x, 4.5, -2]); cone.geometry.translate(0, -4.5, 0); cone.position.y = 9; L.push(cone); }
  g.userData.L = L; return g; }
// confeti instanciado
const CONF = 160, confM = new THREE.InstancedMesh(new THREE.PlaneGeometry(.12, .2), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF); confM.frustumCulled = false; scene.add(confM);
const confP = Array.from({ length: CONF }, (_, i) => ({ x: rnd(-6, 6), y: rnd(-1, 9), z: rnd(-4, 3), vy: rnd(.8, 1.8), r: rnd(0, 6), s: rnd(2, 6) }));
{ const c = new THREE.Color(); confP.forEach((p, i) => confM.setColorAt(i, c.set(['#ff9cc8', '#7ee3c4', '#ffe27a', '#b9a2f7', '#8fd0ff', '#ffb36b'][i % 6]))); }
let confAmt = 0; const tmp = new THREE.Object3D();
function updConf(dt, t) { let n = Math.floor(CONF * confAmt); for (let i = 0; i < n; i++) { const p = confP[i]; p.y -= p.vy * dt; if (p.y < -1.2) { p.y = rnd(6, 9); p.x = rnd(-6, 6); } tmp.position.set(p.x + Math.sin(t * 2 + p.r) * .3, p.y, p.z); tmp.rotation.set(t * p.s * .5 + p.r, t * p.s * .3, p.r); tmp.updateMatrix(); confM.setMatrixAt(i, tmp.matrix); } confM.count = n; confM.instanceMatrix.needsUpdate = true; }
// globos que suben (instanciados: cuerpo + nudo + cuerda)
const NB = 14, bal = new THREE.InstancedMesh(new THREE.SphereGeometry(.42, 14, 10).scale(1, 1.18, 1), toon('#ffffff', { rim: .7 }), NB), str = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .012, 1.1, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NB);
bal.frustumCulled = str.frustumCulled = false; scene.add(bal, str);
const balP = Array.from({ length: NB }, (_, i) => ({ x: 0, y: 0, z: 0, v: 0, ph: rnd(0, 6) })); const resetBal = (p, init) => { const side = Math.random() < .5 ? -1 : 1; p.x = side * rnd(3.4, 6.5); p.z = rnd(-6, -1.5); if (Math.random() < .35) { p.x = rnd(-3, 3); p.z = rnd(-6.5, -4.2); } p.y = init ? rnd(-3, 9) : rnd(-3.5, -2.2); p.v = rnd(.7, 1.3); };
{ const c = new THREE.Color(); balP.forEach((p, i) => { resetBal(p, true); bal.setColorAt(i, c.set(['#ff6fae', '#ffd84a', '#7ee3c4', '#8fd0ff', '#b9a2f7', '#ff9a5a', '#ff4f6f'][i % 7])); }); }
let balOn = false;
function updBal(dt, t) { bal.visible = str.visible = balOn; if (!balOn) return; balP.forEach((p, i) => { p.y += p.v * dt; if (p.y > 10) resetBal(p); const sw = Math.sin(t * 1.2 + p.ph) * .25; tmp.position.set(p.x + sw, p.y, p.z); tmp.rotation.set(0, 0, sw * .3); tmp.scale.setScalar(1); tmp.updateMatrix(); bal.setMatrixAt(i, tmp.matrix); tmp.position.set(p.x + sw * .8, p.y - 1.05, p.z); tmp.updateMatrix(); str.setMatrixAt(i, tmp.matrix); }); bal.instanceMatrix.needsUpdate = str.instanceMatrix.needsUpdate = true; }
// chispas (estallidos)
const sparks = [];
function burst(p, c, n = 16, sp = 3) { for (let i = 0; i < n; i++) { const s = glow(c, rnd(.25, .5)); s.position.copy(p); const a = rnd(0, 6.28), b = rnd(-.3, 1.3); s.userData = { v: new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).multiplyScalar(sp * rnd(.5, 1)), t: 0, l: rnd(.6, 1.1) }; root.add(s); sparks.push(s); } }
function updSparks(dt) { for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i], u = s.userData; u.t += dt; if (u.t > u.l) { s.removeFromParent(); s.material.dispose(); sparks.splice(i, 1); continue; } u.v.y -= 4 * dt; s.position.addScaledVector(u.v, dt); s.material.opacity = 1 - u.t / u.l; } }

// ---------- personajes ----------
// cada mochi: grupo (posición) → pivot (animación) → personaje de la carrera (mismo modelo 3D que en las pruebas)
function actor(id, scale = 1, role = 'dance', seed = 0, opaque = false) {
  const g = new THREE.Group(), pivot = new THREE.Group(); g.add(pivot); const c = makeCharacter(CH(id)); c.userData.seed = seed; pivot.add(c);
  if (opaque) c.traverse(o => { if (o.material && !Array.isArray(o.material) && o.material.transparent && o.material.opacity >= .7 && o.material.opacity < 1) { o.material = o.material.clone(); o.material.opacity = 1; o.material.transparent = false; o.material.depthWrite = true; } }); // vitrina: copia opaca (en las pruebas sigue igual)
  const sh = mesh(new THREE.CircleGeometry(.85, 24), new THREE.MeshBasicMaterial({ color: '#7a3a8a', transparent: true, opacity: .18, depthWrite: false }), g, [0, .01, 0], [-Math.PI / 2, 0, 0]);
  g.userData = { pivot, c, sh, scale, role, seed, enter: 0, flip: -9, expr: '' }; pivot.scale.setScalar(scale); return g;
}
function pose(a, t, dt) {
  const u = a.userData, p = u.pivot, s = u.scale, T = t + u.seed * .37; let y = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, expr = '';
  if (u.roles) { const k = Math.floor((t + u.seed * 2.3) / (u.per || 5.5)) % u.roles.length; if (k !== u.rk) { if (u.rk != null && t - u.enter > 1) burst(a.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2 * s, 0)), ['#ffe27a', '#ff9cc8', '#7ee3c4', '#8fd0ff'][u.seed % 4], 8, 2.2); u.rk = k; u.role = u.roles[k]; } }
  switch (u.role) {
    case 'dance': { const b = Math.abs(Math.sin(T * 4.2)); y = b * .28; rz = Math.sin(T * 4.2) * .14; ry = Math.sin(T * 1.3) * .5; sy = 1 + b * .06 - (1 - b) * .05; sx = 2 - sy; if ((T % 5) < 1) { ry += (T % 5) * Math.PI * 2; y += Math.sin((T % 5) * Math.PI) * .7; expr = 'happy'; } break; }
    case 'wave': { y = Math.abs(Math.sin(T * 3)) * .12; rz = Math.sin(T * 2.4) * .22; ry = Math.sin(T * .8) * .3 - .2; if ((T % 4) < .8) expr = 'happy'; break; }
    case 'hop': { const ph = (T * 1.4) % 1; y = Math.sin(ph * Math.PI) * .7; sy = ph > .9 || ph < .08 ? .85 : 1.05; sx = 2 - sy; ry = Math.sin(T) * .4; break; }
    case 'spin': { ry = T * 1.1; y = Math.abs(Math.sin(T * 2.2)) * .15; break; }
    case 'taunt': { y = Math.abs(Math.sin(T * 5)) * .1; rz = Math.sin(T * 2.5) * .18; rx = -.08; ry = Math.sin(T * 1.7) * .35; if ((T % 3.5) < .6) expr = 'happy'; break; }
    case 'cheer': { const ph = (T * 1.6) % 1, h = Math.sin(ph * Math.PI); y = h * 1.1; ry = Math.floor(T * 1.6) % 2 ? ph * Math.PI * 2 : 0; sy = ph > .93 || ph < .05 ? .8 : 1 + h * .12; sx = 2 - sy; rz = Math.sin(T * 8) * .1; expr = 'happy'; break; }
    case 'twirl': { const ph = (T * .9) % 1, h = Math.sin(ph * Math.PI); y = h * .9; ry = ph * Math.PI * 2; sy = 1 + h * .1; sx = 2 - sy; expr = 'happy'; break; }
    case 'wiggle': { y = Math.abs(Math.sin(T * 6)) * .12; rz = Math.sin(T * 6) * .28; sx = 1 + Math.sin(T * 12) * .06; sy = 2 - sx; ry = Math.sin(T * 1.5) * .6; break; }
    case 'boing': { const ph = (T * 2.2) % 1, h = Math.sin(ph * Math.PI); y = h * .45; sy = ph < .12 || ph > .9 ? .72 : 1 + h * .18; sx = 2 - sy; break; }
    case 'clap': { const ph = (T * 2.4) % 1; y = Math.sin(ph * Math.PI) * .3; rz = Math.sin(T * 6) * .1; expr = (T % 3) < 2 ? 'happy' : ''; break; }
  }
  // voltereta al tocar
  const fl = t - u.flip; if (fl >= 0 && fl < .9) { const k = fl / .9; y += Math.sin(k * Math.PI) * 1.4; rx -= k * Math.PI * 2; expr = 'happy'; }
  // entrada: cae desde arriba y aplasta al tocar el suelo
  const e = t - u.enter; if (e < 0) { a.visible = false; return; } a.visible = true;
  if (e < .55) { const k = e / .55; y += (1 - k * k) * 7; sy *= 1.15; sx *= .9; } else if (e < .8) { const k = (e - .55) / .25; sy *= 1 - Math.sin(k * Math.PI) * .3; sx *= 1 + Math.sin(k * Math.PI) * .25; }
  if (!u.landed && e >= .55) { u.landed = true; burst(a.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .2, 0)), '#ffffff', 10, 2.5); }
  p.position.y = y * s; p.rotation.set(rx, ry, rz); p.scale.set(s * sx, s * sy, s * sx);
  u.sh.scale.setScalar(s * (1 - Math.min(.5, y * .25)));
  animCharacter(u.c, T, 1, u.expr || expr);
}

// ---------- escenas ----------
let mode = null, actors = [], deco = null, t0 = 0, camT = { p: new THREE.Vector3(0, 2.4, 9), l: new THREE.Vector3(0, 1, 0) }, extra = {};
function clear() { root.clear(); actors = []; deco = null; extra = {}; sparks.length = 0; }
const now = () => performance.now() / 1000;
function build(m, d) {
  clear(); balOn = false; mode = m; t0 = now(); const T = 0;
  if (m === 'menu') {
    deco = stage(3.3); root.add(deco); root.add(spots()); confAmt = .8; balOn = true;
    const hero = actor(d.pj, 1.1, 'dance', 0); hero.position.set(0, 0, 1.25); hero.userData.roles = ['dance', 'twirl', 'wiggle', 'cheer']; root.add(hero); extra.hero = hero;
    const pool = (window.MR && MR.CHARS ? MR.CHARS : CHARS).map(c => c.id), others = pool.filter(id => id !== d.pj).sort(() => Math.random() - .5).slice(0, 4);
    const R = [['hop', 'spin', 'boing', 'wave'], ['wiggle', 'cheer', 'dance', 'hop'], ['spin', 'boing', 'twirl', 'taunt'], ['boing', 'dance', 'wave', 'wiggle']];
    [[-1.55, .35], [1.55, .35], [-2.6, -.85], [2.6, -.85]].forEach(([x, z], i) => { const a = actor(others[i], 1, R[i][0], i + 1); a.userData.roles = R[i]; a.position.set(x, 0, z); a.rotation.y = -x * .14; a.userData.enter = .15 + i * .12; root.add(a); actors.push(a); });
    actors.push(hero); camT = { p: new THREE.Vector3(0, 3.1, 8), l: new THREE.Vector3(0, 1.2, 0), w: 7.4 };
  } else if (m === 'chars') {
    // plató de presentación: pedestal con bombillas, focos, telón, estrellas, banderines, confeti y globos
    deco = stage(1.9); root.add(deco); root.add(spots()); confAmt = .55; balOn = true;
    const col = CH(d.pj).color;
    const ped = mesh(new THREE.CylinderGeometry(1.25, 1.4, .35, 40), toon('#ffffff', { rim: .5, emissive: col, ei: .18 }), root, [0, .17, 0]); outline(ped, '#d58ab8', 1.03);
    mesh(new THREE.TorusGeometry(1.3, .06, 8, 48), toon(col, { emissive: col, ei: .5, rim: 0 }), root, [0, .35, 0], [Math.PI / 2, 0, 0]);
    const ring = glow(col, 4.2, .55); ring.position.set(0, .5, -.2); root.add(ring); extra.ring = ring;
        const flags = []; for (let i = 0; i < 13; i++) { const x = (i - 6) * .75, y = 5.2 - Math.cos((i - 6) / 6 * 1.4) * .9; const f = mesh(new THREE.ConeGeometry(.2, .42, 3), toon(['#ff6fae', '#ffd84a', '#7ee3c4', '#8fd0ff', '#b9a2f7'][i % 5], { rim: .3 }), root, [x, y, -3.6], [Math.PI, 0, 0]); flags.push(f); } extra.flags = flags;
    const stars = []; for (let i = 0; i < 18; i++) { const s0 = glow(['#ffe27a', '#ffffff', '#ff9cc8', '#8fd0ff'][i % 4], rnd(.3, .7), .9); s0.position.set(rnd(-5, 5), rnd(1, 6.5), rnd(-4.5, -3.2)); s0.userData.ph = rnd(0, 6); root.add(s0); stars.push(s0); } extra.stars = stars;
    const a = actor(d.pj, 1.15, 'dance', 0, true); a.position.y = .35; a.userData.roles = ['dance', 'hop', 'spin', 'wave', 'cheer', 'wiggle']; a.userData.per = 2.6; a.userData.enter = .05; a.userData.sh.visible = false; root.add(a); actors.push(a); extra.hero = a;
    if (d.prev) { burst(new THREE.Vector3(0, 1.4, 0), col, 26, 4); burst(new THREE.Vector3(0, 1.4, 0), '#ffffff', 14, 3); }
    const tg = textSprite(CH(d.pj).name, col, true); tg.position.set(0, 3.55, 0); tg.scale.multiplyScalar(.85); root.add(tg); a.userData.tag = tg; extra.tagC = tg;
    camT = { p: new THREE.Vector3(0, 2.6, 8.4), l: new THREE.Vector3(0, 1.5, 0), w: 7.4 };
  } else if (m === 'intro') {
    deco = stage(3.4); root.add(deco); root.add(spots()); confAmt = .2;
    const me = actor(d.pj, .95, 'hop', 0); me.position.set(0, 0, 1.7); root.add(me); actors.push(me);
    const tg = textSprite('Tú', CH(d.pj).color, true); tg.position.set(0, 2.45, 1.7); root.add(tg);
    (d.rv || []).forEach((id, i) => { const n = d.rv.length, x = (i - (n - 1) / 2) * 1.45, a = actor(id, .74, 'taunt', i + 1); a.position.set(x, 0, -.8 - (2.9 - Math.abs(x)) * .25); a.rotation.y = -x * .1; a.userData.enter = .25 + i * .14; root.add(a); actors.push(a); });
    // «VS» brillante
    const vs = textSprite('⚡ VS ⚡', '#ffe27a', false); vs.scale.set(2, .5, 1); vs.position.set(0, 3.3, -.6); root.add(vs); extra.vs = vs;
    camT = { p: new THREE.Vector3(0, 2.5, 9.4), l: new THREE.Vector3(0, 1.0, 0), w: 8.2 };
  } else if (m === 'podio') {
    confAmt = 0; const ids = d.ids || [], meIdx = d.meIdx ?? -1;
    const blocks = [{ i: 1, x: -1.75, h: .95, c: '#dfe6f0', e: '#9fabc8' }, { i: 0, x: 0, h: 1.45, c: '#ffd84a', e: '#e6a810' }, { i: 2, x: 1.75, h: .62, c: '#ffb38a', e: '#e08a5a' }];
    const base = new THREE.Group(); root.add(base); deco = base;
    mesh(new THREE.CylinderGeometry(4.3, 4.5, .3, 48), toon('#fff4fa', { rim: .3 }), base, [0, -.15, 0]);
    for (const b of blocks) { if (!ids[b.i]) continue; const bl = mesh(new THREE.BoxGeometry(1.6, b.h, 1.4), toon(b.c, { rim: .6, emissive: b.c, ei: .12 }), base, [b.x, b.h / 2, 0]); outline(bl, b.e, 1.03);
      const nm = mesh(new THREE.PlaneGeometry(.8, .8), new THREE.MeshBasicMaterial({ map: numTex(b.i + 1, b.e), transparent: true }), base, [b.x, b.h * .5, .71]);
      const a = actor(ids[b.i], .8, b.i === 0 ? 'cheer' : 'clap', b.i); a.position.set(b.x, b.h, 0); a.userData.enter = [1.25, .7, .25][b.i]; root.add(a); actors.push(a);
      const tg = textSprite(b.i === meIdx ? 'Tú' : CH(ids[b.i]).name, CH(ids[b.i]).color, b.i === meIdx); tg.position.set(b.x, b.h + 2.15 + (b.i === 0 ? .5 : 0), 0); tg.visible = false; root.add(tg); a.userData.tag = tg;
      if (b.i === 0) { // corona y trofeo
        const cr = new THREE.Group(); const cm = toon('#ffd84a', { emissive: '#ffb030', ei: .35, rim: .6 }); mesh(new THREE.CylinderGeometry(.34, .3, .22, 20, 1, true), cm, cr); for (let k = 0; k < 5; k++) { const an = k / 5 * 6.283; mesh(new THREE.ConeGeometry(.08, .22, 6), cm, cr, [Math.cos(an) * .31, .2, Math.sin(an) * .31]); mesh(new THREE.SphereGeometry(.05, 8, 6), toon(['#ff6fae', '#7ee3ff', '#9fffc8'][k % 3], { emissive: '#fff', ei: .3 }), cr, [Math.cos(an) * .31, .32, Math.sin(an) * .31]); }
        cr.position.y = 1.62; cr.rotation.z = .15; a.userData.c.add(cr);
        const tr = makeTrophy('#ffd84a', 0); tr.scale.setScalar(.28); tr.position.set(.55, 1.45, .55); base.add(tr); extra.trophy = tr; } }
    // los demás, abajo, aplaudiendo
    ids.slice(3).forEach((id, k) => { const n = ids.length - 3, x = (k - (n - 1) / 2) * 1.25, a = actor(id, .46, 'clap', k + 3); a.position.set(x, 0, 2.55); a.userData.enter = 1.9 + k * .12; root.add(a); actors.push(a);
      const tg = textSprite((k + 3) === meIdx ? 'Tú' : CH(id).name, CH(id).color, (k + 3) === meIdx); tg.scale.multiplyScalar(.55); tg.position.set(x, -.05, 3.25); tg.visible = false; root.add(tg); a.userData.tag = tg; });
    extra.podio = true; camT = { p: new THREE.Vector3(0, 4.6, 10.5), l: new THREE.Vector3(0, 1.3, .4), w: 7.6 };
  }
  extra.cam = camT.p.clone().multiplyScalar(1.5); // la cámara entra desde lejos
}
// ---------- miniaturas 3D de la selección (cada mochi en su recuadro, con su propia animación) ----------
const mScene = new THREE.Scene(), mCam = new THREE.PerspectiveCamera(30, 1, .1, 50); mCam.position.set(0, 1.35, 6.6); mCam.lookAt(0, 1.0, 0);
mScene.add(new THREE.HemisphereLight('#ffffff', '#ffc6e2', 1.25)); { const l = new THREE.DirectionalLight('#fff4e8', 1.9); l.position.set(3, 6, 6); mScene.add(l); const b2 = new THREE.DirectionalLight('#ffd0f0', 1); b2.position.set(-4, 4, -6); mScene.add(b2); }
const mAct = {}, MROLES = ['boing', 'wiggle', 'hop', 'wave', 'spin', 'taunt', 'dance', 'clap'];
let mLast = 0;
function thumbs(t) {
  const sc = document.getElementById('sChars'); if (!sc || !sc.classList.contains('on')) return;
  const tt = now(); if (tt - mLast < 1 / 30) return; mLast = tt;
  const cs = sc.querySelectorAll('#charGrid canvas'); if (!cs.length) return;
  const gl = renderer.domElement, S = Math.round(Math.min(160, 64 * DPR)), H = gl.height;
  renderer.setScissorTest(true);
  cs.forEach((c, i) => { const id = c.dataset.id; if (c.width !== S) { c.width = c.height = S; }
    let a = mAct[id]; if (!a) { a = mAct[id] = actor(id, 1, MROLES[i % MROLES.length], i * 3 + 1, true); a.userData.landed = true; a.userData.enter = -5; mScene.add(a); }
    const on = c.parentElement.classList.contains('on'); a.userData.role = on ? 'dance' : MROLES[i % MROLES.length];
    for (const k in mAct) mAct[k].visible = false; pose(a, tt, 0); a.visible = true; a.userData.sh.visible = true;
    renderer.setViewport(0, 0, S / DPR, S / DPR); renderer.setScissor(0, 0, S / DPR, S / DPR); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(mScene, mCam);
    const x = c.getContext('2d'); x.clearRect(0, 0, S, S); x.drawImage(gl, 0, H - S, S, S, 0, 0, S, S); });
  for (const k in mAct) mAct[k].visible = false;
  renderer.setScissorTest(false);
}
// ---------- bucle ----------
let last = now(), shown = true;
function frame() {
  requestAnimationFrame(frame);
  const t1 = now(), dt = Math.min(.05, t1 - last); last = t1;
  const el = document.querySelector('.scr.on .stage3d'); let r = el && el.getBoundingClientRect();
  if (!r || r.width < 20 || r.height < 20 || r.bottom < 0 || r.top > innerHeight) { if (shown) { renderer.setScissorTest(false); renderer.clear(); shown = false; } return; }
  const want = el.dataset.mode; if (want !== mode || el.dataset.key !== extra.key) { build(want, JSON.parse(el.dataset.d || '{}')); extra.key = el.dataset.key; }
  shown = true; const t = t1 - t0;
  for (const a of actors) pose(a, t, dt);
  for (const a of actors) if (a.userData.tag) a.userData.tag.visible = t - a.userData.enter > .6;
  if (deco && deco.userData.bulbs) deco.userData.bulbs.forEach((b, i) => b.material.color.set(((i + Math.floor(t * 6)) % 3) ? '#fff3b0' : '#ff7fbf'));
  root.children.forEach(o => { if (o.userData.L) o.userData.L.forEach((c, i) => { c.rotation.z = Math.sin(t * .9 + i * 2) * .35; c.rotation.x = Math.cos(t * .7 + i) * .15; }); });
  if (extra.vs) extra.vs.scale.set(2 * (1 + Math.sin(t * 6) * .06), .5 * (1 + Math.sin(t * 6) * .06), 1);
  if (extra.trophy) extra.trophy.rotation.y = t * 1.2;
  if (mode === 'chars') { if (extra.ring) extra.ring.material.opacity = .4 + Math.sin(t * 3) * .15; if (extra.stars) extra.stars.forEach(s0 => { s0.material.opacity = .45 + .45 * Math.sin(t * 3 + s0.userData.ph); }); if (extra.flags) extra.flags.forEach((f, i) => { f.rotation.z = Math.sin(t * 3 + i) * .15; });
    if (t > 1 && Math.random() < dt * .8) burst(new THREE.Vector3(rnd(-3, 3), rnd(3, 4.5), rnd(-2.5, -1)), ['#ffe27a', '#ff9cc8', '#7ee3c4', '#8fd0ff'][Math.random() * 4 | 0], 12, 2.4);
    if (extra.sel != null) { const k = t - extra.sel; if (k < 1.1) { const h = extra.hero.userData; h.flip = extra.sel; confAmt = 1; } } }
  if (mode === 'menu' && t > 1 && Math.random() < dt * 1.2) burst(new THREE.Vector3(rnd(-4, 4), rnd(3.2, 4.6), rnd(-3, -1)), ['#ffe27a', '#ff9cc8', '#7ee3c4', '#8fd0ff', '#b9a2f7'][Math.random() * 5 | 0], 16, 2.6);
  if (extra.podio) { confAmt = t > 1.6 ? 1 : 0; if (t > 1.8 && !extra.boom) { extra.boom = true; burst(new THREE.Vector3(0, 3.2, 0), '#ffe27a', 30, 4.5); burst(new THREE.Vector3(0, 3.2, 0), '#ff9cc8', 20, 3.5); } if (Math.random() < dt * 1.6 && t > 2) burst(new THREE.Vector3(rnd(-4, 4), rnd(3, 5), rnd(-2, 0)), ['#ffe27a', '#ff9cc8', '#7ee3c4', '#8fd0ff'][Math.random() * 4 | 0], 14, 3); }
  updConf(dt, t); updSparks(dt); updBal(dt, t);
  // cámara: encuadra el ancho de la escena en el hueco (vertical u horizontal) y se mece un poco
  const asp = r.width / r.height; camera.aspect = asp;
  const fit = camT.w / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1.25, asp), dir = camT.p.clone().sub(camT.l).normalize();
  const want3 = camT.l.clone().add(dir.multiplyScalar(Math.max(fit, 6))); want3.x += Math.sin(t * .35) * .6; want3.y += Math.sin(t * .5) * .15;
  extra.cam.lerp(want3, Math.min(1, dt * 2.6)); camera.position.copy(extra.cam); camera.lookAt(camT.l); camera.updateProjectionMatrix();
  thumbs(t);
  const free = mode === 'menu' || mode === 'chars', cv = renderer.domElement;
  renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight); renderer.clear();
  if (free) { // sin marco: la escena se sale del hueco y se funde con el fondo
    camera.setViewOffset(r.width, r.height, -r.left, -r.top, innerWidth, innerHeight); camera.updateProjectionMatrix();
    const m = `radial-gradient(ellipse ${Math.round(r.width * .78)}px ${Math.round(r.height * .82)}px at ${Math.round(r.left + r.width / 2)}px ${Math.round(r.top + r.height * .46)}px, #000 62%, transparent 100%)`;
    if (cv._m !== m) { cv._m = m; cv.style.webkitMaskImage = cv.style.maskImage = m; }
    const cx = r.left + r.width / 2, cy = r.top + r.height * .46, ex = r.width * .78, ey = r.height * .82, x0 = Math.max(0, cx - ex), x1 = Math.min(innerWidth, cx + ex), y0 = Math.max(0, cy - ey), y1 = Math.min(innerHeight, cy + ey);
    renderer.setScissorTest(true); renderer.setScissor(x0, innerHeight - y1, x1 - x0, y1 - y0); // solo se pinta la zona visible de la máscara
  } else { camera.clearViewOffset(); camera.updateProjectionMatrix(); if (cv._m) { cv._m = ''; cv.style.webkitMaskImage = cv.style.maskImage = ''; }
    const y = innerHeight - r.bottom; renderer.setScissorTest(true); renderer.setScissor(r.left, y, r.width, r.height); renderer.setViewport(r.left, y, r.width, r.height); }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
// tocar el escenario: voltereta del protagonista
addEventListener('pointerdown', e => { const el = document.querySelector('.scr.on .stage3d'); if (!el || !extra.hero) return; const r = el.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return; const u = extra.hero.userData; if (now() - t0 - u.flip > .9) { u.flip = now() - t0; burst(extra.hero.position.clone().add(new THREE.Vector3(0, 1.5, 0)), '#ff9cc8', 14, 3); } });
window.MP3D = { ok: true, thumbs3d: true, get mode() { return mode; },
  // «¡Este!»: voltereta, explosión de confeti y chispas del color del mochi
  select() { if (mode !== 'chars' || !extra.hero) return false; const t = now() - t0; extra.sel = t; const p = extra.hero.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    burst(p, '#ffe27a', 34, 5); burst(p, '#ff9cc8', 24, 4.2); burst(p, '#7ee3c4', 20, 3.6); for (const q of confP) { q.y = rnd(3, 9); } return true; } };
document.body.classList.add('has3d');
