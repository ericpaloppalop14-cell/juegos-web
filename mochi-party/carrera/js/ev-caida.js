// 🌋 CAÍDA AL NÚCLEO (3D): caída libre por 5 mundos coherentes y vivos hasta el núcleo
//  1 Corteza: raíces, topos, tuberías y tesoros · 2 Fósiles: dinos que se mueven, conchas y ámbar
//  3 Cristales: geodas, murciélagos y setas luminosas · 4 Magma: ríos de lava, salamandras y rocas flotantes
//  5 Núcleo: esfera dorada y meta épica. Reglas justas: misma velocidad base; turbo por habilidad.
import { THREE, camera, toon, outline, mesh, glowSprite, makeRunner, lights, rnd, clamp, lerp, pick, Audio, OUCH } from './core3d.js?v=m19';
const D = 460, R = 7.5, XM = 5.4, H = D / 5, V0 = 11.5, BSTEP = .8, BMAX = 4.5; // tanda 4: caída más lenta y agujeros enormes
// medidas ÚNICAS para dibujar y para chocar: lo que ves es lo que choca
const RR = .45, ZS = 2.6; // radio del mochi (para chocar solo cuenta el 40%: hitbox generosa)
const LAY = [
  { n: '🌱 Corteza: raíces y topos', w: '#a8744c', w2: '#7a5034', fog: '#f0c49a', sky: '#fff1dc', gr: '#c58a5c', bump: .9, seg: 28 },
  { n: '🦴 Capa de fósiles', w: '#e6cc9c', w2: '#c9a878', fog: '#dcbd8c', sky: '#fff4e0', gr: '#b08a5a', bump: .5, seg: 32 },
  { n: '💎 Cueva de cristales', w: '#3d2f78', w2: '#6a52c0', fog: '#2e2462', sky: '#c9b2ff', gr: '#2a1f5a', bump: 1.3, seg: 9 },
  { n: '🔥 Río de magma', w: '#4a1a26', w2: '#7a2a2a', fog: '#6a2418', sky: '#ffb36b', gr: '#4a1212', bump: 1.1, seg: 20 },
  { n: '✨ ¡Núcleo de gominola!', w: '#ffcf5a', w2: '#ffe9a0', fog: '#ffd98a', sky: '#ffffff', gr: '#ffb030', bump: .25, seg: 40 },
];
const SAY = [['¡Hola, topito!', '¡Huele a galleta!'], ['¡Un dino me ha guiñado!', '¡Qué huesos más monos!'], ['¡Qué brillo!', '¡Murciélagos majos!'], ['¡Quema, quema!', '¡Salamandra a la vista!'], ['¡El núcleo!', '¡Ya casi!']];
const C = new THREE.Color(), C2 = new THREE.Color();
const eyes = (g, y, z, s = 1, sep = .18) => { for (const k of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(.09 * s, 8, 6), toon('#2a1838', { rim: 0 }), g, [k * sep * s, y, z]); mesh(new THREE.SphereGeometry(.03 * s, 6, 4), toon('#ffffff', { rim: 0 }), e, [.03 * s, .03 * s, .07 * s]); } };
const blush = (g, y, z, s = 1, sep = .3) => { for (const k of [-1, 1]) mesh(new THREE.CircleGeometry(.07 * s, 10), toon('#ff8fb8', { rim: 0 }), g, [k * sep * s, y, z]); };
// ---------------- criaturas y piezas kawaii ----------------
function mole(g) { const m = new THREE.Group(); g.add(m); const b = mesh(new THREE.SphereGeometry(.55, 16, 12), toon('#8a6a8a'), m, [0, 0, 0], null, [1, 1.1, .9]); outline(b, '#4a2a4a', 1.05);
  mesh(new THREE.SphereGeometry(.13, 10, 8), toon('#ff8fb8'), m, [0, .05, .52]); eyes(m, .25, .45, 1.2); blush(m, .02, .47, 1, .32);
  for (const k of [-1, 1]) mesh(new THREE.SphereGeometry(.16, 8, 6), toon('#ffd0e0'), m, [k * .4, -.35, .35], null, [1, .6, 1]);
  const hat = mesh(new THREE.ConeGeometry(.3, .4, 10), toon('#ffd36b', { emissive: '#ffb030', ei: .2 }), m, [0, .65, 0]); mesh(new THREE.SphereGeometry(.1, 8, 6), toon('#fff6c0', { emissive: '#fff', ei: .8 }), hat, [0, -.05, .25]);
  return m; }
function chest(g) { const c = new THREE.Group(); g.add(c); const b = mesh(new THREE.BoxGeometry(1, .6, .7), toon('#c0703a'), c); outline(b, '#5a2a10', 1.05); const lid = mesh(new THREE.CylinderGeometry(.35, .35, 1, 12, 1, false, 0, Math.PI), toon('#d8843f'), c, [0, .3, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.BoxGeometry(1.02, .1, .72), toon('#ffd36b', { emissive: '#ffb030', ei: .4 }), c, [0, .05, 0]); const gl = glowSprite('#ffe27a', 2.4, .7); gl.position.y = .5; c.add(gl); c.userData.lid = lid; return c; }
function dino(g) { const d = new THREE.Group(); g.add(d); const bm = toon('#fff6e2', { rim: .5 }); const parts = [];
  for (let i = 0; i < 9; i++) { const s = mesh(new THREE.SphereGeometry(.22 - i * .012, 8, 6), bm, d, [i * .42 - 1.6, Math.sin(i * .5) * .2, 0]); parts.push(s); if (i > 1 && i < 6) { const rib = mesh(new THREE.TorusGeometry(.42, .06, 6, 12, Math.PI), bm, s, [0, -.05, 0], [0, Math.PI / 2, Math.PI]); } }
  const sk = new THREE.Group(); sk.position.set(-2.1, .3, 0); d.add(sk); const head = mesh(new THREE.BoxGeometry(.8, .5, .45), bm, sk); outline(head, '#a08060', 1.06);
  const jaw = mesh(new THREE.BoxGeometry(.7, .14, .4), bm, sk, [-.05, -.3, 0]); eyes(sk, .08, .24, 1.3); for (let k = 0; k < 4; k++) mesh(new THREE.ConeGeometry(.04, .12, 4), toon('#ffffff'), sk, [-.35 + k * .14, -.2, .18], [Math.PI, 0, 0]);
  d.userData = { parts, sk, jaw }; return d; }
function shell(g, c = '#ffc9a8') { const s = new THREE.Group(); g.add(s); const m = toon(c, { rim: .5 }); for (let i = 0; i < 5; i++) mesh(new THREE.TorusGeometry(.5 * Math.pow(.72, i), .16 * Math.pow(.75, i), 8, 18), m, s, [.12 * i, 0, 0]); return s; }
function amber(g) { const a = mesh(new THREE.IcosahedronGeometry(.6, 0), new THREE.MeshPhongMaterial({ color: '#ffa63a', emissive: '#c05a00', emissiveIntensity: .4, transparent: true, opacity: .8, shininess: 100 }), g); mesh(new THREE.SphereGeometry(.16, 8, 6), toon('#5a3a2a'), a, [0, 0, 0], null, [1.5, .7, .7]); return a; }
function bat(g) { const b = new THREE.Group(); g.add(b); const body = mesh(new THREE.SphereGeometry(.35, 12, 10), toon('#7a5ab8'), b); outline(body, '#3a2a6a', 1.06); eyes(b, .08, .3, 1.1, .15); blush(b, -.05, .32, .8);
  const wm = toon('#9b7ae0'); wm.side = THREE.DoubleSide; const wings = [-1, 1].map(k => { const w = new THREE.Group(); w.position.x = k * .3; b.add(w); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(k * .9, .35); sh.lineTo(k * .75, -.05); sh.lineTo(k * .5, .08); sh.lineTo(k * .3, -.15); sh.lineTo(0, 0); mesh(new THREE.ShapeGeometry(sh), wm, w); return w; });
  for (const k of [-1, 1]) mesh(new THREE.ConeGeometry(.08, .2, 4), toon('#7a5ab8'), b, [k * .16, .38, 0]); b.userData.wings = wings; return b; }
function mush(g, c) { const m = new THREE.Group(); g.add(m); mesh(new THREE.CylinderGeometry(.12, .16, .6, 8), toon('#f4ecff'), m, [0, .3, 0]); const cap = mesh(new THREE.SphereGeometry(.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(c, { emissive: c, ei: .9 }), m, [0, .55, 0]); for (let k = 0; k < 4; k++) mesh(new THREE.SphereGeometry(.06, 6, 4), toon('#ffffff', { emissive: '#fff', ei: .8 }), cap, [Math.cos(k * 1.6) * .25, .25, Math.sin(k * 1.6) * .25]);
  eyes(m, .38, .16, .9, .12); const gs = glowSprite(c, 2.2, .55); gs.position.y = .7; m.add(gs); m.userData.cap = cap; return m; }
function geode(g) { const ge = new THREE.Group(); g.add(ge); const shellM = toon('#8a7aa8'); mesh(new THREE.TorusGeometry(1.1, .35, 8, 16), shellM, ge); const cols = ['#c9b2ff', '#7ee3ff', '#ff9cf0'];
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, c = pick(cols); const cr = mesh(new THREE.OctahedronGeometry(.28, 0), toon(c, { emissive: c, ei: .8 }), ge, [Math.cos(a) * .75, Math.sin(a) * .75, .1], null, [1, 1.8, 1]); cr.rotation.z = a + Math.PI / 2; }
  const gs = glowSprite('#c8a8ff', 3.5, .7); ge.add(gs); return ge; }
function sala(g) { const s = new THREE.Group(); g.add(s); const parts = []; for (let i = 0; i < 7; i++) { const p = mesh(new THREE.SphereGeometry(.26 - i * .025, 10, 8), toon(i % 2 ? '#ff7a2a' : '#ffb030', { emissive: '#ff5a1a', ei: .35 }), s, [-i * .36, 0, 0]); parts.push(p); }
  outline(parts[0], '#7a1a0a', 1.08); eyes(s, .12, .2, 1.1, .12); blush(s, -.02, .22, .8, .2); const fl = glowSprite('#ff9a3a', 1.6, .8); fl.position.set(.1, .3, 0); s.add(fl); for (const k of [-1, 1]) for (const x of [-.3, -1.3]) mesh(new THREE.SphereGeometry(.09, 6, 4), toon('#ffb030'), s, [x, -.2, k * .22]); s.userData.parts = parts; return s; }
function lavaTex() { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128; const x = cv.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#ff3a10'); gr.addColorStop(.3, '#ffd040'); gr.addColorStop(.6, '#ff6a10'); gr.addColorStop(1, '#ff3a10'); x.fillStyle = gr; x.fillRect(0, 0, 32, 128); for (let i = 0; i < 20; i++) { x.fillStyle = 'rgba(255,255,200,.6)'; x.beginPath(); x.arc(rnd(0, 32), rnd(0, 128), rnd(1, 3), 0, 7); x.fill(); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }
// estratos geológicos pintados (bandas, piedrecitas, vetas) para cada capa
const STR = [['#b98256', '#8f5e3a', '#c99a6a', '#6f4a2c', '#a8744c'], ['#efd8aa', '#d6b886', '#f6e6c4', '#c49e6c', '#e6cc9c'], ['#4a3a90', '#2e2462', '#6a52c0', '#3d2f78', '#8a72e0'], ['#5a1e26', '#3a1218', '#7a2a2a', '#ff5a1a', '#4a1a26'], ['#ffd76a', '#ffe9a0', '#ffc040', '#fff3c8', '#ffcf5a']];
function strataTex(i) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 1024; const x = cv.getContext('2d'); const P = STR[i]; let y = 0;
  while (y < 1024) { const h = rnd(18, 70); x.fillStyle = pick(P); x.beginPath(); x.moveTo(0, y); for (let k = 0; k <= 256; k += 16) x.lineTo(k, y + Math.sin(k * .05 + y) * 6); x.lineTo(256, y + h + 8); x.lineTo(0, y + h + 8); x.fill(); y += h; }
  for (let k = 0; k < 420; k++) { x.fillStyle = `rgba(${i === 3 ? '255,180,80' : i === 2 ? '200,220,255' : '255,255,255'},${rnd(.05, i >= 2 ? .45 : .2)})`; x.beginPath(); x.ellipse(rnd(0, 256), rnd(0, 1024), rnd(1, 5), rnd(1, 3), 0, 0, 7); x.fill(); }
  for (let k = 0; k < 140; k++) { x.fillStyle = `rgba(0,0,0,${rnd(.05, .18)})`; x.beginPath(); x.ellipse(rnd(0, 256), rnd(0, 1024), rnd(3, 10), rnd(2, 6), rnd(0, 3), 0, 7); x.fill(); }
  if (i === 3) { x.strokeStyle = 'rgba(255,170,40,.75)'; x.lineWidth = 3; for (let k = 0; k < 14; k++) { x.beginPath(); let px = rnd(0, 256), py = rnd(0, 1024); x.moveTo(px, py); for (let j = 0; j < 8; j++) { px += rnd(-14, 14); py += rnd(8, 24); x.lineTo(px, py); } x.stroke(); } }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t; }
// obstáculo kawaii que flota en el pozo (lo que ves es lo que choca: radio rr)
function rock(g, li, rr) { const o = new THREE.Group(); g.add(o); const col = ['#8a5a3a', '#f2e2c0', '#8a72e0', '#3a2028', '#ffb030'][li];
  const b = mesh(new THREE.DodecahedronGeometry(rr, 1), toon(col, { rim: .5, emissive: li === 3 ? '#ff4010' : li === 2 ? '#5a3ab0' : '#000', ei: li >= 2 ? .35 : 0 }), o); outline(b, li === 4 ? '#b06a10' : '#2a1020', 1.06);
  if (li === 2) for (let k = 0; k < 5; k++) { const c = pick(['#b9a2ff', '#7ee3ff', '#ff9cf0']); const cr = mesh(new THREE.OctahedronGeometry(rr * .38, 0), toon(c, { emissive: c, ei: .9 }), o, [Math.cos(k * 1.26) * rr * .8, rr * .55, Math.sin(k * 1.26) * rr * .8], null, [1, 1.8, 1]); cr.lookAt(0, -rr * 2, 0); }
  else if (li === 3) { o.add(glowSprite('#ff7a2a', rr * 3.4, .55)); }
  else if (li === 1) { const bn = mesh(new THREE.CapsuleGeometry(rr * .16, rr * 1.4, 4, 8), toon('#fffaf0'), o, [0, rr * .9, 0], [0, 0, Math.PI / 2]); for (const k of [-1, 1]) mesh(new THREE.SphereGeometry(rr * .24, 10, 8), toon('#fffaf0'), bn, [0, k * rr * .8, 0]); }
  else if (li === 0) { for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(.05, .14, rr * 1.4, 6), toon('#6a4a2a'), o, [rnd(-.3, .3) * rr, rr * .7, rnd(-.3, .3) * rr], [rnd(-.6, .6), 0, rnd(-.6, .6)]); }
  const face = new THREE.Group(); face.position.y = rr * .93; face.rotation.x = -Math.PI / 2; o.add(face); eyes(face, .05 * rr, .02, rr * 1.4, .2); blush(face, -.12 * rr, .03, rr * 1.1, .34);
  const warn = mesh(new THREE.RingGeometry(rr + .1, rr + .28, 28), new THREE.MeshBasicMaterial({ color: '#ff4f6a', transparent: true, opacity: .8, depthWrite: false, fog: false }), o, [0, rr * .2, 0], [-Math.PI / 2, 0, 0]);
  o.userData.warn = warn; return o; }
// pared del túnel con forma propia de cada capa (bultos, estratos, facetas, grumos)
function wall(ly, i) { const geo = new THREE.CylinderGeometry(R + .4, R + .4, H + .6, ly.seg, 24, true); const p = geo.attributes.position; const v = new THREE.Vector3();
  for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const a = Math.atan2(v.z, v.x), y = v.y; let d = 0;
    if (i === 0) d = Math.sin(a * 5 + y * .4) * .35 + Math.sin(a * 11 - y * .9) * .2; else if (i === 1) d = Math.round(Math.sin(y * .7) * 2) * .18 + Math.sin(a * 3) * .1; else if (i === 2) d = (Math.sin(a * 9) > 0 ? .4 : -.2) * Math.sin(y * .5); else if (i === 3) d = Math.sin(a * 4 + y * .3) * .45 + Math.sin(y * 1.3) * .2; else d = Math.sin(y * 1.6) * .15;
    const yy = (y + H / 2) / H; const edge = Math.min(yy, 1 - yy) < .06 ? 0 : 1; const s = (R + .4 + d * ly.bump * edge) / (R + .4); p.setXYZ(k, v.x * s, y, v.z * s); }
  geo.computeVertexNormals(); const m = toon('#ffffff', { nocache: true, rim: .3, emissive: i === 2 ? '#3a2a80' : i === 3 ? '#5a1a10' : i === 4 ? '#ffb030' : '#000', ei: i >= 2 ? .25 : 0 }); m.side = THREE.BackSide; m.map = strataTex(i); if (i === 2) m.flatShading = true; return new THREE.Mesh(geo, m); }
const onWall = (g, a, y, inset = .5) => { const o = new THREE.Group(); o.position.set(Math.cos(a) * (R - inset), y, Math.sin(a) * (R - inset)); o.lookAt(0, y, 0); o.scale.setScalar(1.7); g.add(o); return o; };
export default {
  id: 'caida', name: 'Caída al Centro de la Tierra', icon: '🌋', maxT: 70, music: { bpm: 128, root: 57, scale: 'minor' }, netKeys: ['x', 'y', 'z', 'tx', 'tz', 'v', 'stun', 'boost', 'perf', 'streak', 'bonus'], seed: 31, tagY: 2.0, tagS: .7,
  how: 'Miras hacia abajo por el pozo. Arrastra el dedo para mover a tu mochi, esquiva las ROCAS con aro rojo y cuélate por los AGUJEROS. Punto verde = pasas. ¡Por el centro = Perfecto! Las gotas 💧 dan turbo.',
  dispose() { const d = document.getElementById('perf'); if (d) d.remove(); camera.up.set(0, 1, 0); },
  init(E) {
    const sc = E.scene; sc.background = new THREE.Color(LAY[0].fog); sc.fog = new THREE.Fog(LAY[0].fog, 22, 95); this.L = lights(sc, LAY[0].sky, LAY[0].gr, 1.1, 1.6); this.L.d.position.set(10, 60, 20);
    this.pl = new THREE.PointLight('#ffffff', 0, 30, 1.5); sc.add(this.pl); this.anim = []; this.LG = []; const A = this.anim;
    // superficie: césped con flores y un cartel
    const top = new THREE.Group(); sc.add(top); mesh(new THREE.RingGeometry(R, 50, 48), toon('#8fdcae', { rim: 0 }), top, [0, 0, 0], [-Math.PI / 2, 0, 0]);
    for (let k = 0; k < 40; k++) { const a = rnd(0, 6.283), d = rnd(R + 1, 30), f = new THREE.Group(); f.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); top.add(f); mesh(new THREE.CylinderGeometry(.05, .05, .7, 5), toon('#5fb86a'), f, [0, .35, 0]); const c = pick(['#ff9cc8', '#ffe27a', '#c9b2ff', '#ffffff']); for (let p = 0; p < 5; p++) mesh(new THREE.SphereGeometry(.18, 8, 6), toon(c), f, [Math.cos(p * 1.26) * .2, .75, Math.sin(p * 1.26) * .2]); mesh(new THREE.SphereGeometry(.13, 8, 6), toon('#ffb030'), f, [0, .78, 0]); A.push(t => { f.rotation.z = Math.sin(t * 2 + a) * .15; }); }
    // los 5 mundos
    LAY.forEach((ly, i) => {
      const g = new THREE.Group(); g.position.y = -i * H; sc.add(g); this.LG.push(g); const w = wall(ly, i); w.position.y = -H / 2; g.add(w);
      // franja de transición suave hacia la capa siguiente
      if (i < 4) { const tm = toon(LAY[i + 1].w, { rim: 0 }); tm.side = THREE.BackSide; tm.transparent = true; tm.opacity = .55; mesh(new THREE.CylinderGeometry(R + .2, R + .2, 6, 28, 1, true), tm, g, [0, -H + 2.5, 0]); }
      const yy = () => -rnd(3, H - 3), aa = () => rnd(0, 6.283);
      if (i === 0) {
        for (let k = 0; k < 16; k++) { const o = onWall(g, aa(), yy(), .2); const r = mesh(new THREE.CylinderGeometry(.06, .22, rnd(1.2, 2), 6), toon(pick(['#7a4a2a', '#9a6a3a'])), o, [0, 0, .5], [Math.PI / 2 + rnd(-.3, .3), 0, rnd(-.4, .4)]); A.push(t => { r.rotation.y = Math.sin(t * 1.5 + k) * .12; }); }
        for (let k = 0; k < 8; k++) { const o = onWall(g, aa(), yy(), .1); mesh(new THREE.CircleGeometry(.75, 16), toon('#3a2010', { rim: 0 }), o, [0, 0, .05]); const m = mole(o); m.position.z = .2; const ph = rnd(0, 6); A.push(t => { m.position.y = Math.max(-.4, Math.sin(t * 2 + ph)) * .5; m.rotation.z = Math.sin(t * 3 + ph) * .15; }); }
        for (let k = 0; k < 6; k++) { const o = onWall(g, aa(), yy(), .3); o.scale.setScalar(.6); const pm = toon(pick(['#5fc78a', '#8fd0ff'])); mesh(new THREE.TorusGeometry(1, .28, 8, 16, Math.PI), pm, o, [0, 0, .2]); for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(.34, .34, .3, 12), pm, o, [s, 0, .2]); const drip = mesh(new THREE.SphereGeometry(.12, 8, 6), toon('#8fd0ff', { emissive: '#3fa0ff', ei: .5 }), o, [0, 1, .4]); A.push(t => { const k2 = (t * .8 + k) % 1; drip.position.y = 1.2 - k2 * 2.5; drip.scale.setScalar(1 - k2 * .5); }); }
        for (let k = 0; k < 5; k++) { const o = onWall(g, aa(), yy(), .6); const c = chest(o); c.rotation.x = -.3; A.push(t => { c.userData.lid.rotation.x = Math.max(0, Math.sin(t * 1.5 + k)) * .6; }); }
      } else if (i === 1) {
        for (let k = 0; k < 4; k++) { const o = onWall(g, aa(), yy(), .4); const d = dino(o); d.scale.setScalar(1.3); d.rotation.z = rnd(-.4, .4); A.push(t => { d.userData.parts.forEach((p, j) => p.position.y = Math.sin(t * 2.5 + j * .6 + k) * .18); d.userData.sk.rotation.z = Math.sin(t * 2 + k) * .2; d.userData.jaw.position.y = -.3 - Math.max(0, Math.sin(t * 5 + k)) * .12; }); }
        for (let k = 0; k < 12; k++) { const o = onWall(g, aa(), yy(), .25); const s = shell(o, pick(['#ffc9a8', '#ffe0c0', '#f6b8d0'])); A.push(t => { s.rotation.z = t * .5 + k; }); }
        for (let k = 0; k < 8; k++) { const o = onWall(g, aa(), yy(), .3); const a = amber(o); const gs = glowSprite('#ffb040', 2, .5); o.add(gs); A.push(t => { a.rotation.y = t + k; }); }
      } else if (i === 2) {
        for (let k = 0; k < 7; k++) { const o = onWall(g, aa(), yy(), .2); const ge = geode(o); A.push(t => { ge.rotation.z = t * .3 + k; ge.children[ge.children.length - 1].material.opacity = .5 + Math.sin(t * 3 + k) * .25; }); }
        for (let k = 0; k < 14; k++) { const o = onWall(g, aa(), yy(), .1); const m = mush(o, pick(['#7ee3ff', '#ff9cf0', '#b9a2ff', '#9fffc8'])); m.rotation.x = Math.PI / 2; A.push(t => { m.userData.cap.scale.set(1 + Math.sin(t * 3 + k) * .08, 1 - Math.sin(t * 3 + k) * .08, 1); }); }
        for (let k = 0; k < 18; k++) { const o = onWall(g, aa(), yy(), .2); const c = pick(['#b9a2ff', '#7ee3ff', '#ff9cf0']); mesh(new THREE.OctahedronGeometry(rnd(.3, .55), 0), toon(c, { emissive: c, ei: .7 }), o, [0, 0, .15], [0, 0, rnd(-.5, .5)], [1, rnd(1.4, 2), .6]); }
        for (let k = 0; k < 8; k++) { const b = bat(g); const y0 = yy(), r0 = rnd(6.3, 6.9), ph = rnd(0, 6), sp = rnd(.5, .9) * (k % 2 ? 1 : -1); A.push(t => { const a = t * sp + ph; b.position.set(Math.cos(a) * r0, y0 + Math.sin(t * 2 + ph) * 1.5, Math.sin(a) * r0); b.rotation.y = -a + (sp > 0 ? 0 : Math.PI); b.userData.wings.forEach((w, j) => w.rotation.y = Math.sin(t * 16 + ph) * .8 * (j ? -1 : 1)); }); }
      } else if (i === 3) {
        const lt = lavaTex(); this.lavaT = lt;
        for (let k = 0; k < 9; k++) { const a = aa(), o = onWall(g, a, -H / 2, .25); const lm = new THREE.MeshBasicMaterial({ map: lt }); mesh(new THREE.PlaneGeometry(rnd(.8, 1.6), H), lm, o, [0, 0, .1]); }
        for (let k = 0; k < 7; k++) { const o = onWall(g, aa(), yy(), .2); const s = sala(o); s.rotation.z = Math.PI / 2; const y0 = s.position.y, ph = rnd(0, 6); A.push(t => { s.position.x = Math.sin(t * .8 + ph) * 1.5; s.userData.parts.forEach((p, j) => p.position.y = Math.sin(t * 8 - j * .8 + ph) * .1); }); }
        for (let k = 0; k < 10; k++) { const ra = aa(), rk = mesh(new THREE.DodecahedronGeometry(rnd(.4, .9), 0), toon('#3a2028', { emissive: '#ff4a10', ei: .25 }), g, [Math.cos(ra) * (R - 1), yy(), Math.sin(ra) * (R - 1)]); const y0 = rk.position.y, ph = rnd(0, 6); A.push(t => { rk.position.y = y0 + Math.sin(t * 1.2 + ph) * .6; rk.rotation.x = t * .5 + ph; rk.rotation.y = t * .3; }); if (k % 3 === 0) { const gs = glowSprite('#ff7a2a', 3, .5); rk.add(gs); } }
        for (let k = 0; k < 3; k++) { const p = new THREE.PointLight('#ff6a2a', 30, 40, 1.4); p.position.set(rnd(-4, 4), -H * (k + .5) / 3, rnd(-4, 4)); g.add(p); }
        this.embers = []; for (let k = 0; k < 40; k++) { const s = glowSprite(pick(['#ffb040', '#ff6a20', '#ffe27a']), rnd(.3, .7), .9); const ea = aa(), er = rnd(5.5, 7); s.position.set(Math.cos(ea) * er, yy(), Math.sin(ea) * er); g.add(s); this.embers.push(s); }
      } else {
        for (let k = 0; k < 30; k++) { const s = glowSprite(pick(['#ffe27a', '#ffffff', '#ffb3d9']), rnd(1.5, 4), .65); const o = onWall(g, aa(), yy(), .6); o.add(s); A.push(t => { s.material.opacity = .4 + Math.sin(t * 4 + k) * .3; }); }
        for (let k = 0; k < 6; k++) { const ring = mesh(new THREE.TorusGeometry(R - .3, .18, 6, 40), toon('#fff3b0', { emissive: '#ffd36b', ei: .7 }), g, [0, -H * (k + 1) / 7, 0], [Math.PI / 2, 0, 0]); A.push(t => { ring.scale.setScalar(1 + Math.sin(t * 3 + k) * .03); }); }
      }
      // tanda 4: escenario más vivo en cada mundo (luciérnagas de colores y un gigante simpático)
      { const mc = [['#ffe9a0', '#ffffff'], ['#ffd08a', '#fff4e0'], ['#7ee3ff', '#ff9cf0'], ['#ffb040', '#ff6a20'], ['#ffffff', '#ffe27a']][i];
        const motes = []; for (let k = 0; k < 26; k++) { const sp = glowSprite(pick(mc), rnd(.35, .8), .85); const a0 = aa(), r0 = rnd(3.5, 6.6), y0 = yy(); sp.position.set(Math.cos(a0) * r0, y0, Math.sin(a0) * r0); g.add(sp); motes.push([sp, a0, r0, y0, rnd(.2, .6) * (k % 2 ? 1 : -1)]); }
        A.push(t => { for (const [sp, a0, r0, y0, w] of motes) { const a = a0 + t * w; sp.position.set(Math.cos(a) * r0, y0 + Math.sin(t * 1.3 + a0) * 1.2, Math.sin(a) * r0); } });
        if (i === 0) for (let k = 0; k < 3; k++) { const o = onWall(g, aa(), -H * (k + .6) / 3.4, .1); o.scale.setScalar(1.4); const wm = new THREE.Group(); o.add(wm); const segs = []; for (let j = 0; j < 6; j++) segs.push(mesh(new THREE.SphereGeometry(.42 - j * .03, 14, 10), toon(j % 2 ? '#ff9cc8' : '#ffb3d6', { rim: .5 }), wm, [0, 0, j * -.4]));
          outline(segs[0], '#b0507a', 1.06); eyes(segs[0], .12, .34, 1.4, .16); blush(segs[0], -.05, .36, 1, .26); const ph = rnd(0, 6); A.push(t => { const e = Math.max(0, Math.sin(t * 1.1 + ph)); wm.position.z = -2.2 + e * 2.6; segs.forEach((sg, j) => sg.position.x = Math.sin(t * 4 - j * .7 + ph) * .14); }); }
        else if (i === 1) for (let k = 0; k < 3; k++) { const sh2 = shell(g, pick(['#ffc9a8', '#f6b8d0'])); sh2.scale.setScalar(2.6); const a0 = aa(), y0 = -H * (k + .5) / 3; sh2.position.set(Math.cos(a0) * 4.6, y0, Math.sin(a0) * 4.6); A.push(t => { sh2.rotation.y = t * .4 + k; sh2.rotation.z = t * .7; }); }
        else if (i === 2) for (let k = 0; k < 3; k++) { const ch = new THREE.Group(); ch.position.set(0, -H * (k + .5) / 3, 0); g.add(ch); for (let j = 0; j < 10; j++) { const a = j / 10 * 6.283, c = pick(['#b9a2ff', '#7ee3ff', '#ff9cf0']); mesh(new THREE.OctahedronGeometry(.32, 0), toon(c, { emissive: c, ei: .9 }), ch, [Math.cos(a) * 6.3, Math.sin(j * 2) * .4, Math.sin(a) * 6.3], null, [1, 2, 1]); } A.push(t => { ch.rotation.y = t * .25 * (k % 2 ? 1 : -1); }); }
        else if (i === 3) { const bub = []; for (let k = 0; k < 14; k++) { const b = mesh(new THREE.SphereGeometry(rnd(.2, .45), 12, 8), toon('#ffb030', { emissive: '#ff5a10', ei: .7 }), g); const a0 = aa(); b.position.set(Math.cos(a0) * rnd(5.6, 6.8), yy(), Math.sin(a0) * rnd(5.6, 6.8)); bub.push(b); } A.push((t, dt) => { for (const b of bub) { b.position.y += .05; if (b.position.y > -2) b.position.y = -H + 3; } }); }
        else for (let k = 0; k < 12; k++) { const st = mesh(new THREE.OctahedronGeometry(.4, 0), toon('#fff3b0', { emissive: '#ffd36b', ei: 1 }), g); const a0 = aa(), y0 = yy(); st.position.set(Math.cos(a0) * 6, y0, Math.sin(a0) * 6); A.push(t => { st.rotation.y = t * 2 + k; st.scale.setScalar(1 + Math.sin(t * 5 + k) * .25); }); } }
    });
    // núcleo final: gran esfera dorada sonriente con anillos y meta épica
    const core = new THREE.Group(); core.position.y = -D - 10; sc.add(core); const cs = mesh(new THREE.SphereGeometry(9, 40, 28), toon('#ffcf5a', { emissive: '#ffb030', ei: .55 }), core); core.add(glowSprite('#fff3b0', 44, .9));
    for (const k of [-1, 1]) { mesh(new THREE.SphereGeometry(1.1, 16, 12), toon('#5a3a2a'), cs, [k * 3, 3, 7.9]); mesh(new THREE.CircleGeometry(1.2, 16), toon('#ff8fb8', { rim: 0 }), cs, [k * 5, 1, 7.4]); }
    mesh(new THREE.TorusGeometry(2.2, .35, 8, 20, Math.PI), toon('#5a3a2a'), cs, [0, 1.3, 8.6], [0, 0, Math.PI]);
    const rings = [0, 1, 2].map(k => { const r = mesh(new THREE.TorusGeometry(12 + k * 2.5, .3, 6, 60), toon(['#ff9cc8', '#7ee3ff', '#c9b2ff'][k], { emissive: ['#ff6fae', '#3fc6ff', '#9b82f0'][k], ei: .6 }), core); return r; });
    A.push(t => { rings.forEach((r, k) => { r.rotation.x = t * (.4 + k * .2); r.rotation.y = t * (.3 - k * .15); }); cs.rotation.y = Math.sin(t) * .2; });
    const meta = mesh(new THREE.TorusGeometry(R - .2, .5, 10, 48), toon('#ffffff', { emissive: '#ffe27a', ei: .9 }), sc, [0, -D, 0], [Math.PI / 2, 0, 0]); A.push(t => meta.scale.setScalar(1 + Math.sin(t * 6) * .04));
    { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#ff6fae'; x.beginPath(); x.roundRect(4, 4, 504, 120, 40); x.fill(); x.font = '700 80px Fredoka'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText('💛 META 💛', 256, 68); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      const sg = mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: tx, transparent: true, fog: false }), sc, [0, -D + .3, -R + 1.6], [-Math.PI / 3, 0, 0]); }
    // PLATAFORMAS CON AGUJERO REDONDO: cada capa es un disco que tapa el pozo y tiene UN agujero circular.
    // Te mueves en 2D (x,z) para colarte. Agujeros grandes al principio y más pequeños al final, separación justa
    // (el siguiente agujero nunca está más lejos de lo que da tiempo a llegar) y en magma/núcleo algunos discos giran.
    this.O = []; let y = -18, px = 0, pz = 0, n = 0;
    const SL = ['#9a6a44', '#e6cc9c', '#6a52c0', '#3a2028', '#ff9cc8'], EM = ['#000', '#000', '#5a3ab0', '#ff4010', '#ff6fae'], RIM = ['#ffe27a', '#ff9cc8', '#7ee3ff', '#ffd23a', '#ffffff'];
    while (y > -D + 14) {
      const li = Math.min(4, Math.floor(-y / H)), inLay = -y - li * H;
      if (inLay < 4 || inLay > H - 4) { y -= 4; continue; }
      const dif = clamp((-y / D), 0, 1), hr = lerp(3.3, 2.7, dif), gap = lerp(17, 14, dif) + rnd(-.5, 1);
      // nuevo centro: a una distancia alcanzable desde el anterior y siempre dentro del pozo
      const lim = XM - hr * .55, maxS = lerp(1.6, 2.8, dif), mnS = n < 2 ? 0 : .8; let hx, hz, tries = 0;
      do { const a = rnd(0, 6.283), d = rnd(mnS, maxS); hx = px + Math.cos(a) * d; hz = pz + Math.sin(a) * d; tries++; } while (Math.hypot(hx, hz) > lim && tries < 40);
      if (Math.hypot(hx, hz) > lim) { const s = lim / Math.hypot(hx, hz); hx *= s; hz *= s; }
      const spin = 0; // sin discos giratorios: siempre da tiempo
      const g = new THREE.Group(); g.position.y = y; sc.add(g);
      const sh = new THREE.Shape(); sh.absarc(0, 0, R + .5, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(hx, -hz, hr, 0, Math.PI * 2, true); sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: .7, bevelEnabled: false, curveSegments: 48 }); geo.rotateX(-Math.PI / 2); geo.translate(0, -.35, 0);
      const sm = toon(SL[li], { rim: .4, emissive: EM[li], ei: li >= 2 ? .25 : 0 }); if (li === 2) sm.flatShading = true; const disc = mesh(geo, sm, g); disc.material.transparent = false;
      // decoración temática en el disco (lejos del agujero)
      for (let k = 0; k < 7; k++) { const a = rnd(0, 6.283), d = rnd(1, R - .8), dx = Math.cos(a) * d, dz = Math.sin(a) * d; if (Math.hypot(dx - hx, dz - hz) < hr + .9) continue; const p = new THREE.Group(); p.position.set(dx, .35, dz); g.add(p);
        if (li === 0) mesh(new THREE.SphereGeometry(.26, 8, 6), toon(pick(['#ff9cc8', '#ffd36b', '#9fffc8'])), p, [0, .15, 0]);
        else if (li === 1) { const s2 = shell(p); s2.scale.setScalar(.55); s2.rotation.x = -Math.PI / 2; }
        else if (li === 2) { const c = pick(['#b9a2ff', '#7ee3ff', '#ff9cf0']); mesh(new THREE.OctahedronGeometry(.32, 0), toon(c, { emissive: c, ei: .8 }), p, [0, .3, 0], null, [1, 1.8, 1]); }
        else if (li === 3) { const lp = mesh(new THREE.CircleGeometry(.45, 14), new THREE.MeshBasicMaterial({ color: '#ffb030' }), p, [0, .02, 0], [-Math.PI / 2, 0, 0]); this.anim.push(t => lp.scale.setScalar(1 + Math.sin(t * 5 + k) * .15)); }
        else mesh(new THREE.SphereGeometry(.26, 8, 6), toon('#ffffff', { emissive: '#fff3b0', ei: .8 }), p, [0, .15, 0]); }
      // borde del agujero: aro luminoso = borde real de paso; diana interior = zona Perfecto
      const rimM = toon(RIM[li], { emissive: RIM[li], ei: .9 }); const rim = mesh(new THREE.TorusGeometry(hr, .16, 8, 40), rimM, g, [hx, .36, hz], [Math.PI / 2, 0, 0]);
      const pz2 = mesh(new THREE.TorusGeometry(hr * .4, .06, 6, 28), toon('#ffffff', { emissive: '#fff3b0', ei: 1 }), g, [hx, .3, hz], [Math.PI / 2, 0, 0]);
      const gs = glowSprite(RIM[li], hr * 2.6, .45); gs.position.set(hx, .5, hz); g.add(gs);
      // flechas que apuntan al agujero desde los lados para que se lea a la primera
      const arrows = []; for (let k = 0; k < 4; k++) { const pv = new THREE.Group(); pv.position.set(hx, .5, hz); pv.rotation.y = -k * Math.PI / 2; g.add(pv); const ar = mesh(new THREE.ConeGeometry(.28, .6, 4), toon(RIM[li], { emissive: RIM[li], ei: .8 }), pv, [hr + .8, 0, 0], [0, 0, Math.PI / 2]); arrows.push(ar); }
      this.anim.push(t => { const s = 1 + Math.sin(t * 5) * .06; rim.scale.set(s, s, 1); arrows.forEach(ar => { ar.position.x = hr + .8 + Math.sin(t * 6) * .2; }); });
      const o = { y, ring: true, hx, hz, hr, spin, g, li, rim, gs };
      this.O.push(o);
      // gota turbo a mitad de camino hacia el siguiente agujero (premia la ruta directa)
      if (n > 0 && Math.random() < .5) this.O.push({ y: y + gap * .5, boost: true, x: (hx + px) / 2, z: (hz + pz) / 2, g: null, spin: 0 });
      px = hx; pz = hz; n++; y -= gap; }
    this.O.sort((a, b) => b.y - a.y);
    // obstáculos flotantes entre plataformas, siempre fuera de la ruta directa entre un agujero y el siguiente
    { const rings = this.O.filter(o => o.ring), add = [];
      for (let i = 1; i < rings.length - 1; i++) { const a = rings[i], b = rings[i + 1], li = a.li, n2 = li === 0 || i % 2 ? 0 : 1;
        for (let k = 0; k < n2; k++) { const rr = rnd(.8, 1.25); let x, z, ok = false; for (let tr = 0; tr < 30 && !ok; tr++) { const an = rnd(0, 6.283), d = rnd(0, XM - .3); x = Math.cos(an) * d; z = Math.sin(an) * d;
            const vx = b.hx - a.hx, vz = b.hz - a.hz, l2 = vx * vx + vz * vz || 1, tt = clamp(((x - a.hx) * vx + (z - a.hz) * vz) / l2, 0, 1), dd = Math.hypot(x - a.hx - vx * tt, z - a.hz - vz * tt); ok = dd > rr + 1.9 && add.every(o => Math.abs(o.y - (a.y + b.y) / 2) > 2 || Math.hypot(o.x - x, o.z - z) > o.rr + rr + .6); }
          if (!ok) continue; const y = lerp(a.y, b.y, rnd(.4, .6)), g = new THREE.Group(); g.position.set(x, y, z); sc.add(g); const ro = rock(g, li, rr); const ph = rnd(0, 6); this.anim.push(t => { ro.rotation.y = t * .6 + ph; ro.position.y = Math.sin(t * 2 + ph) * .12; ro.userData.warn.material.opacity = .45 + Math.sin(t * 8 + ph) * .3; });
          add.push({ y, x, z, rr, rock: true, g, spin: 0 }); } }
      this.O.push(...add); this.O.sort((a, b) => b.y - a.y); }
    for (const o of this.O) if (o.boost) { const g = new THREE.Group(); g.position.set(o.x, o.y, o.z); const d = mesh(new THREE.SphereGeometry(.45, 14, 10), toon('#7ee3ff', { emissive: '#3fc6ff', ei: .8 }), g, [0, 0, 0], null, [1, 1.3, 1]); eyes(d, .05, .4, .9, .15); g.add(glowSprite('#9ff0ff', 2.6, .8)); sc.add(g); o.g = g; }
    // marcador de aterrizaje: dónde caerás en la próxima plataforma (verde = pasas, rojo = chocas)
    this.mk = new THREE.Group(); sc.add(this.mk); this.mkM = new THREE.MeshBasicMaterial({ color: '#5dff9a', transparent: true, opacity: .9, depthTest: false, fog: false });
    mesh(new THREE.RingGeometry(.32, .5, 24), this.mkM, this.mk, [0, 0, 0], [-Math.PI / 2, 0, 0]); mesh(new THREE.CircleGeometry(.12, 12), this.mkM, this.mk, [0, 0, 0], [-Math.PI / 2, 0, 0]); this.mk.renderOrder = 9; this.mk.children.forEach(c => c.renderOrder = 9);
    this.beam = mesh(new THREE.CylinderGeometry(.05, .05, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .35, depthWrite: false, fog: false }), sc);
    // líneas de velocidad alrededor de la cámara
    this.lines = new THREE.InstancedMesh(new THREE.BoxGeometry(.025, 1, .025), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .3, fog: false, depthWrite: false }), 70); this.lines.frustumCulled = false; sc.add(this.lines);
    this.LP = Array.from({ length: 70 }, () => ({ a: rnd(0, 6.283), r: rnd(2.5, 6.8), y: rnd(-30, 5) })); this.tmp = new THREE.Object3D();
    E.racers.forEach((r, k) => { r.obj = makeRunner(r.ch, k, .6); r.obj.userData.shadow.visible = false; r.obj.userData.pivot.rotation.x = -Math.PI / 2; sc.add(r.obj); const a = k / 6 * 6.283; r.x = r.me ? 0 : Math.cos(a) * 2.2; r.z = r.me ? 0 : Math.sin(a) * 2.2; r.vx = r.vz = 0; r.y = 1.5; r.v = 0; r.stun = 0; r.inv = 0; r.boost = 0; r.tx = r.x; r.tz = r.z; r.perf = 0; r.streak = 0; r.bonus = 0; r.got = new Set(); });
    let pd = document.getElementById('perf'); if (!pd) { pd = document.createElement('div'); pd.id = 'perf'; pd.style.cssText = 'position:absolute;right:10px;top:calc(88px + env(safe-area-inset-top));background:rgba(110,60,150,.55);color:#fff;font:700 14px Fredoka;border-radius:12px;padding:4px 10px;text-align:right;line-height:1.25'; document.getElementById('hud').appendChild(pd); } this.pd = pd;
    this.camY = 10; this.lay = -1; this.T = 0;
  },
  // centro actual del agujero (los discos que giran lo llevan dando vueltas alrededor del pozo)
  hole(o) { if (!o.spin) return [o.hx, o.hz]; const a = this.T * o.spin, c = Math.cos(a), s = Math.sin(a); return [o.hx * c + o.hz * s, -o.hx * s + o.hz * c]; },
  idle(E, dt) { this.render(E, dt); },
  update(E, dt) {
    const me = E.me; this.T += dt; window.__caida = { hits: me.hits || 0, perf: me.perf, rocks: this.O.filter(o => o.rock).length, t: E.t };
    for (const o of this.O) if (o.spin) o.g.rotation.y = this.T * o.spin;
    for (const r of E.racers) {
      if (r.remote || r.fin) continue;
      const vmax = V0 + r.bonus + (r.boost > 0 ? 5 : 0);
      if (r.stun > 0) { r.stun -= dt; if (r.stun <= 0) r.expr = ''; } else r.v = r.v < vmax ? Math.min(vmax, r.v + 14 * dt) : Math.max(vmax, r.v - 6 * dt);
      if (r.inv > 0) r.inv -= dt;
      if (r.boost > 0 && (r.boost -= dt) <= 0) r.expr = '';
      const next = this.O.find(o => o.ring && o.y < r.y - .3);
      if (r.me && !E.AUTO) { if (E.input.down && E.input.px != null) { r.tx = (E.input.px / innerWidth - .5) * 2.4 * XM; r.tz = ((E.input.py ?? innerHeight / 2) / innerHeight - .5) * 2.0 * XM; } }
      else if (next) {
        if (!r.plan || r.plan.o !== next) { const u = Math.random(), good = r.me ? 1 : .55 + .4 * r.skill, a = rnd(0, 6.283);
          const off = u < good ? rnd(0, next.hr * .45) : rnd(next.hr * .7, next.hr + 1.2); r.plan = { o: next, ox: Math.cos(a) * off, oz: Math.sin(a) * off }; }
        const [hx, hz] = this.hole(next); if (r.y - next.y < 16) { r.tx = hx + r.plan.ox; r.tz = hz + r.plan.oz; }
        for (const o of this.O) if (o.rock && o.y < r.y && o.y > r.y - 7) { const dx = r.tx - o.x, dz = r.tz - o.z, l = Math.hypot(dx, dz) || .01, need = o.rr + 1.1; if (l < need && (r.me || Math.random() < .5 + .5 * r.skill)) { r.tx = o.x + dx / l * need; r.tz = o.z + dz / l * need; } } }
      { const l = Math.hypot(r.tx, r.tz); if (l > XM) { r.tx *= XM / l; r.tz *= XM / l; } }
      // imán suave: al acercarte a un agujero tu mochi se va colando solo hacia el centro
      if (r.me && next && r.y - next.y < 7) { const [hx, hz] = this.hole(next), dd = Math.hypot(r.x - hx, r.z - hz); if (dd < next.hr + 3) { const k = Math.min(1, dt * 3.2); r.x += (hx - r.x) * k; r.z += (hz - r.z) * k; } }
      r.vx += ((r.tx - r.x) * 60 - r.vx * 13) * dt; r.vz += ((r.tz - r.z) * 60 - r.vz * 13) * dt; r.x += r.vx * dt; r.z += r.vz * dt;
      { const l = Math.hypot(r.x, r.z); if (l > XM + .3) { r.x *= (XM + .3) / l; r.z *= (XM + .3) / l; } }
      const oy = r.y; r.y -= r.v * dt;
      for (const o of this.O) if (oy > o.y && r.y <= o.y) {
        if (o.rock) { if (r.inv <= 0 && Math.hypot(r.x - o.x, r.z - o.z) < o.rr * .8 + RR * .4) { r.v = 9; r.stun = .3; r.inv = .7; const dx = r.x - o.x, dz = r.z - o.z, l = Math.hypot(dx, dz) || 1; r.vx = dx / l * 9; r.vz = dz / l * 9; r.expr = 'squash'; r.boost = 0; r.bonus *= .7; r.streak = 0; r.hits = (r.hits || 0) + 1; E.burst(new THREE.Vector3(r.x, o.y, r.z), '#ffd0a0', 12, 5, .5, .5, 2); if (r.me) { Audio.sfxPlay('hit'); E.shake = .3; E.ui.toast(pick(['¡Pum! ¡Una roca!', '¡Ay, qué dura!', '¡Esquiva las rocas!']), '#ff9cc8'); } else E.say(r, pick(OUCH)); } continue; }
        if (o.boost) { if (Math.hypot(r.x - o.x, r.z - o.z) < 1.3 && !r.got.has(o)) { r.got.add(o); r.boost = 1; r.bonus = Math.min(BMAX, r.bonus + BSTEP * .5); r.expr = 'happy'; if (r.me) { Audio.sfxPlay('boost'); E.ui.toast('¡Gota turbo! 💧', '#7ee3ff'); E.ui.flash(); } } continue; }
        const [hx, hz] = this.hole(o), d = Math.hypot(r.x - hx, r.z - hz);
        if (d > o.hr + .2 && r.inv <= 0) { // choque: frena, rebota hacia el agujero y te deja un momento de gracia
          r.v = 8; r.stun = .35; r.inv = .7; r.hits = (r.hits || 0) + 1; const k = 1 / Math.max(.01, d); r.vx = (hx - r.x) * k * 7; r.vz = (hz - r.z) * k * 7; r.expr = 'squash'; r.boost = 0; r.bonus *= .6; r.streak = 0;
          E.burst(new THREE.Vector3(r.x, o.y + .5, r.z), '#ffffff', 14, 6, .6, .5, 4); if (r.me) { Audio.sfxPlay('hit'); E.shake = .35; E.ui.toast(pick(['¡Pum! Fuera del agujero', '¡Ay, mi flan!', '¡Choque blandito!']), '#ff9cc8'); } else E.say(r, pick(OUCH)); }
        else if (d < o.hr * .45) { r.perf++; r.streak++; r.boost = .7; r.bonus = Math.min(BMAX, r.bonus + BSTEP); r.expr = 'happy'; if (r.me) { Audio.sfxPlay('trick'); E.ui.toast(r.streak > 1 ? `¡Perfecto! ⚡ x${r.streak}` : '¡Perfecto! ⚡', '#ffe27a'); E.burst(new THREE.Vector3(r.x, o.y, r.z), '#ffe27a', 16, 6, .6, .6, 0); } }
        else { if (r.me) Audio.sfxPlay('pop'); }
      }
      r.prog = clamp(-r.y / D, 0, 1); if (-r.y >= D) { E.finish(r); r.y = -D - .5; }
    }
    const li = Math.min(4, Math.floor(-me.y / H));
    if (li !== this.lay) { this.lay = li; if (li > 0) { E.ui.banner(LAY[li].n, 2200); Audio.sfxPlay('pop'); const rv = E.racers.filter(r => !r.me); if (rv.length) E.say(pick(rv), pick(SAY[li])); } }
  },
  render(E, dt) {
    const t = performance.now() / 1000, me = E.me, f = clamp(-me.y / H - .5, 0, 4), i0 = Math.floor(f), i1 = Math.min(4, i0 + 1), k = clamp((f - i0) * 1.4 - .2, 0, 1);
    C.set(LAY[i0].fog).lerp(C2.set(LAY[i1].fog), k); E.scene.fog.color.copy(C); E.scene.background.copy(C);
    this.L.h.color.set(LAY[i0].sky).lerp(C2.set(LAY[i1].sky), k); this.L.h.groundColor.set(LAY[i0].gr).lerp(C2.set(LAY[i1].gr), k);
    this.L.d.intensity = lerp(1.6, .5, clamp(-me.y / D * 1.6, 0, 1)) + (f > 3.6 ? 1.5 : 0);
    this.pl.position.set(me.x, me.y + 4, me.z + 3); this.pl.intensity = f > 1.5 ? 25 : 0; this.pl.color.set(f > 2.6 ? '#ffb070' : '#d8c8ff');
    this.LG.forEach(g => { const top = g.position.y, bot = top - H; g.visible = me.y - 100 < top && me.y + 14 > bot; });
    for (const a of this.anim) a(t);
    if (this.lavaT) this.lavaT.offset.y = -t * .6;
    if (this.embers) for (const s of this.embers) { s.position.y += dt * 2; if (s.position.y > -1) s.position.y -= H - 2; }
    const next = this.O.find(o => o.ring && o.y < me.y - .3);
    for (const o of this.O) { if (!o.g) continue; if (o.boost) o.g.rotation.y = t * 3; o.g.visible = !(o.boost && me.got.has(o)) && o.y < me.y + .8 && o.y > me.y - 90; if (o.ring) { const on = o === next; o.rim.material.emissiveIntensity = on ? 1.3 + Math.sin(t * 10) * .3 : .5; o.gs.material.opacity = on ? .7 : .25; } }
    // marcador de aterrizaje en la próxima plataforma
    if (next && !me.fin) { const [hx, hz] = this.hole(next), d = Math.hypot(me.x - hx, me.z - hz), ok = d <= next.hr + .2; this.mk.visible = this.beam.visible = true; this.mk.position.set(me.x, next.y + .4, me.z); this.mkM.color.set(d < next.hr * .45 ? '#ffe27a' : ok ? '#5dff9a' : '#ff4f6a'); this.mk.scale.setScalar(1 + Math.sin(t * 8) * .08);
      const h = Math.max(.1, me.y - next.y - .6); this.beam.scale.set(1, h, 1); this.beam.position.set(me.x, next.y + .4 + h / 2, me.z); this.beam.material.color.copy(this.mkM.color); } else this.mk.visible = this.beam.visible = false;
    const sp = clamp((me.v - 8) / 16, 0, 1.3); this.lines.material.opacity = .08 + sp * .28;
    this.LP.forEach((p, i) => { p.y += (me.v + 10) * dt; if (p.y > 6) { p.y = rnd(-30, -10); p.a = rnd(0, 6.283); } this.tmp.position.set(Math.cos(p.a) * p.r, me.y + p.y, Math.sin(p.a) * p.r); this.tmp.scale.set(1, .5 + sp * 2.5, 1); this.tmp.updateMatrix(); this.lines.setMatrixAt(i, this.tmp.matrix); }); this.lines.instanceMatrix.needsUpdate = true;
    for (const r of E.racers) { const o = r.obj; o.position.set(r.x, r.y, r.z); o.visible = r.me || r.y < me.y + 1; o.rotation.z = Math.sin(t * 2 + r.k) * .25 + (r.stun > 0 ? t * 12 : 0); o.rotation.y = (r.x - (r.tx ?? r.x)) * -.15;
      const s = .6 * (1 + Math.sin(t * 9 + r.k) * .04); o.userData.pivot.scale.set(s, s, s * (r.boost > 0 ? 1.15 : 1)); if (r.me && r.inv > 0 && Math.sin(t * 30) < 0) o.visible = false;
      if (E.phase === 'run' && !r.fin && Math.random() < (r.boost > 0 ? .9 : .25)) E.burst(new THREE.Vector3(r.x + rnd(-.4, .4), r.y + 1.4, r.z), r.boost > 0 ? '#9ff0ff' : '#ffffff', 1, 1, .4, .35, 0); }
    this.pd.innerHTML = `⚡ Perfectos: ${me.perf}<br>🔥 Racha: x${me.streak}<br>🚀 +${Math.round(me.bonus / V0 * 100)}% vel.`;
    // VISTA CENITAL: miras hacia abajo por el pozo; los mochis caen alejándose de ti y los agujeros y rocas suben hacia la cámara
    this.camY = lerp(this.camY, me.y + 8.5, Math.min(1, dt * 10)); camera.fov = lerp(camera.fov, 74 + sp * 8 + (me.boost > 0 ? 5 : 0), Math.min(1, dt * 4)); camera.updateProjectionMatrix();
    camera.up.set(0, 0, -1); camera.position.set(me.x * .28, this.camY, me.z * .28); camera.lookAt(me.x * .28, me.y - 40, me.z * .28);
  }
};
