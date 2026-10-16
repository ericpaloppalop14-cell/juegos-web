// Pompotropa v2 — ejército de pompas: carrera por carril con puertas, bola de nieve de aliados, grupos rivales y choque final
import * as THREE from './three.js?v=1';
const $ = id => document.getElementById(id);
const W = 10, HW = W / 2, SP = .36, MAXC = 9999;
const S = Object.assign({ lvl: 1, snd: 1 }, JSON.parse(localStorage.pompoV2 || '{}'));
const save = () => localStorage.pompoV2 = JSON.stringify(S);
let rs = 1; const rnd = (a = 0, b = 1) => { rs = (rs * 16807) % 2147483647; return a + (rs / 2147483647) * (b - a); };
const ri = (a, b) => Math.floor(rnd(a, b + 1));
// ---------- render ----------
const cv = $('c'), R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
let PR = Math.min(devicePixelRatio || 1, 2); R.setPixelRatio(PR); R.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#ffc9e3'); scene.fog = new THREE.Fog('#ffc9e3', 40, 95);
const cam = new THREE.PerspectiveCamera(55, 1, .5, 200);
scene.add(new THREE.HemisphereLight('#fff6fb', '#b98ad8', 1.5)); const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(6, 14, 8); scene.add(sun);
function resize() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w > h ? 42 : 58; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
// ---------- audio ----------
let AC = null; const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
function tone(f, d = .12, type = 'sine', v = .15, f2 = 0, delay = 0) { if (!S.snd) return; try { const a = ac(), t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02); } catch (e) { } }
let lastPop = 0;
const sfx = { pop() { const n = performance.now(); if (n - lastPop < 45) return; lastPop = n; tone(500 + Math.random() * 500, .08, 'sine', .08, 180); },
  good() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .14, 'triangle', .12, 0, i * .06)); }, bad() { [392, 311, 233].forEach((f, i) => tone(f, .18, 'sawtooth', .07, 0, i * .08)); },
  gulp() { tone(220, .3, 'sine', .2, 880); }, hit() { tone(140, .15, 'square', .08, 60); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .25, 'triangle', .14, 0, i * .1)); }, lose() { [440, 370, 311, 262].forEach((f, i) => tone(f, .3, 'triangle', .12, 0, i * .14)); } };
// ---------- materials / geometry ----------
const bodyG = new THREE.SphereGeometry(.3, 16, 12), eyeG = new THREE.SphereGeometry(.055, 8, 6), shineG = new THREE.SphereGeometry(.07, 8, 6);
const bodyM = new THREE.MeshStandardMaterial({ roughness: .3, metalness: .05 }), eyeM = new THREE.MeshBasicMaterial({ color: '#2a1540' }), shineM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .85 });
function pompMesh(n) { const b = new THREE.InstancedMesh(bodyG, bodyM, n), e = new THREE.InstancedMesh(eyeG, eyeM, n * 2), s = new THREE.InstancedMesh(shineG, shineM, n); for (const m of [b, e, s]) { m.count = 0; m.frustumCulled = false; scene.add(m); } b.setColorAt(0, new THREE.Color()); return { b, e, s, n }; }
const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), COL = new THREE.Color();
function putPomp(P, i, x, y, z, s, col) { M4.compose(V.set(x, y + .3 * s, z), Q0, SC.set(s, s * (1 + Math.sin(T * 9 + i) * .04), s)); P.b.setMatrixAt(i, M4); P.b.setColorAt(i, col);
  for (let k = 0; k < 2; k++) { M4.compose(V.set(x + (k ? .1 : -.1) * s, y + .36 * s, z + .27 * s), Q0, SC.set(s, s * 1.3, s)); P.e.setMatrixAt(i * 2 + k, M4); }
  M4.compose(V.set(x - .12 * s, y + .48 * s, z + .16 * s), Q0, SC.set(s, s * .7, s)); P.s.setMatrixAt(i, M4); }
function flush(P, n) { P.b.count = P.s.count = n; P.e.count = n * 2; P.b.instanceMatrix.needsUpdate = P.e.instanceMatrix.needsUpdate = P.s.instanceMatrix.needsUpdate = true; if (P.b.instanceColor) P.b.instanceColor.needsUpdate = true; }
let QUAL = 2; const CAPS = [90, 160, 260];
const ARMY = pompMesh(260), WORLD = pompMesh(700);
const MYC = ['#ff7eb6', '#ff9ccb', '#ffb3d6', '#ff6fae'].map(c => new THREE.Color(c)), RIVC = ['#8a5cf6', '#7048e8', '#9d6bff'].map(c => new THREE.Color(c)), ALLC = ['#fff4c2', '#c9f7ff', '#d8ffcf', '#ffe3f1'].map(c => new THREE.Color(c));
// particles
const PN = 260, partM = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 6, 4), new THREE.MeshBasicMaterial({ transparent: true, opacity: .9 }), PN); partM.frustumCulled = false; partM.setColorAt(0, COL); scene.add(partM);
const parts = []; for (let i = 0; i < PN; i++) parts.push({ l: 0 });
let pi = 0; function burst(x, y, z, col, n = 8, sp = 4) { for (let k = 0; k < n; k++) { const p = parts[pi = (pi + 1) % PN]; p.x = x; p.y = y; p.z = z; const a = Math.random() * 6.28, u = Math.random(); p.vx = Math.cos(a) * sp * u; p.vz = Math.sin(a) * sp * u; p.vy = 2 + Math.random() * sp; p.l = .6 + Math.random() * .4; p.c = col; } }
function stepParts(dt) { let n = 0; for (const p of parts) { if (p.l <= 0) continue; p.l -= dt; p.vy -= 12 * dt; p.x += p.vx * dt; p.y = Math.max(.05, p.y + p.vy * dt); p.z += p.vz * dt; const s = Math.max(.01, p.l * 1.4); M4.compose(V.set(p.x, p.y, p.z), Q0, SC.set(s, s, s)); partM.setMatrixAt(n, M4); partM.setColorAt(n, p.c); n++; } partM.count = n; partM.instanceMatrix.needsUpdate = true; if (partM.instanceColor) partM.instanceColor.needsUpdate = true; }
// floating numbers
function popTxt(x, y, z, txt, cls) { V.set(x, y, z).project(cam); if (V.z > 1) return; const d = document.createElement('div'); d.className = 'pop ' + cls; d.textContent = txt; d.style.left = ((V.x + 1) / 2 * innerWidth) + 'px'; d.style.top = ((1 - V.y) / 2 * innerHeight) + 'px'; $('pops').appendChild(d); setTimeout(() => d.remove(), 1000); }
// canvas labels (texto procedural, sin imágenes)
function labelTex(txt, bg, fg = '#fff', w = 256, h = 128, fs = 76) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 34); g.fill(); } g.font = `700 ${fs}px F, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = '#0005'; g.strokeText(txt, w / 2, h / 2 + 4); g.fillStyle = fg; g.fillText(txt, w / 2, h / 2 + 4); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function sprite(txt, bg, sx = 2.2) { const m = new THREE.SpriteMaterial({ map: labelTex(txt, bg), depthTest: false, transparent: true }), s = new THREE.Sprite(m); s.scale.set(sx, sx / 2, 1); s.renderOrder = 10; return s; }
function setSprite(s, txt, bg) { s.material.map.dispose(); s.material.map = labelTex(txt, bg); s.material.needsUpdate = true; }
// ---------- track ----------
let level = null; const LV = new THREE.Group(); scene.add(LV);
function trackTex() { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#fff0f7'; g.fillRect(0, 0, 128, 256); g.fillStyle = '#ffd9ec'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#ffffff88'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(20 + i * 18, 64 + (i % 2) * 128, 6, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }
const TT = trackTex();
function clearLevel() { while (LV.children.length) { const o = LV.children.pop(); o.traverse(m => { if (m.material?.map && m.material.map !== TT) m.material.map.dispose(); }); } }
const OPS = { '+': (c, v) => c + v, '-': (c, v) => c - v, 'x': (c, v) => c * v, '/': (c, v) => Math.floor(c / v) };
function gateTxt(g) { return (g.op === 'x' ? '×' : g.op === '/' ? '÷' : g.op) + g.v; }
function goodOf(g, e) { return OPS[g.op](e, g.v) >= e; }
function buildLevel(L) { clearLevel(); rs = 1234 + L * 7919; const len = Math.min(420, 150 + L * 22), items = []; let E = 5, z = -22;
  while (z > -len) { const t = rnd(); if (t < .36) { const good = rnd() < .5 ? { op: '+', v: ri(4, 10 + L * 2) } : rnd() < .75 ? { op: 'x', v: 2 } : { op: 'x', v: 3 };
      const bad = rnd() < .55 ? { op: '-', v: ri(3, 8 + L * 2) } : { op: '/', v: 2 }; const both = rnd() < .25 ? { op: '+', v: ri(2, 6) } : bad; const left = rnd() < .5;
      items.push({ k: 'gate', z, L: left ? good : both, R: left ? both : good }); E = Math.min(MAXC, Math.max(OPS[good.op](E, good.v), OPS[both.op](E, both.v))); z -= 20; }
    else if (t < .6) { const n = ri(3, 5 + L); items.push({ k: 'ally', z, x: rnd(-3, 3), n }); E += n; z -= 13; }
    else if (t < .82 && z < -40) { const n = Math.max(2, Math.round(E * rnd(.15, .45))); items.push({ k: 'rival', z, x: rnd(-2.5, 2.5), n }); E += n; z -= 16; }
    else { items.push({ k: 'trap', z, w: rnd(3, 4.5), sp: rnd(1.2, 2 + L * .1), ph: rnd(0, 6) }); E = Math.round(E * .9); z -= 16; } }
  const endZ = z - 8, B = Math.max(6, Math.round(E * Math.min(.65, .38 + .025 * L)));
  // suelo y bordes
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, -endZ + 60), new THREE.MeshStandardMaterial({ map: TT, roughness: .8 })); TT.repeat.set(1, (-endZ + 60) / 6); fl.rotation.x = -Math.PI / 2; fl.position.z = endZ / 2 - 10; LV.add(fl);
  const railM = new THREE.MeshStandardMaterial({ color: '#ff8cc0', roughness: .35 }), railG = new THREE.CylinderGeometry(.28, .28, -endZ + 60, 12);
  for (const s of [-1, 1]) { const r = new THREE.Mesh(railG, railM); r.rotation.x = Math.PI / 2; r.position.set(s * (HW + .3), .28, endZ / 2 - 10); LV.add(r); }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, -endZ + 200), new THREE.MeshStandardMaterial({ color: '#c9a0f0', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.6, endZ / 2); LV.add(ground);
  // decoración lateral: pompas grandes flotando
  const decoG = new THREE.SphereGeometry(1, 18, 14); for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(decoG, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rnd(.75, 1.05) % 1, .7, .78), roughness: .25, transparent: true, opacity: .85 })); const s = rnd(.8, 2.4); m.scale.setScalar(s); m.position.set((rnd() < .5 ? -1 : 1) * rnd(HW + 3, HW + 16), rnd(0, 4), rnd(endZ - 20, 10)); m.userData.bob = rnd(0, 6); LV.add(m); }
  for (const it of items) {
    if (it.k === 'gate') { it.done = 0; it.g = new THREE.Group(); it.g.position.z = it.z; for (const [side, g] of [[-1, it.L], [1, it.R]]) { const good = goodOf(g, 10); const pan = new THREE.Mesh(new THREE.BoxGeometry(HW - .25, 2.4, .12), new THREE.MeshBasicMaterial({ map: labelTex(gateTxt(g), good ? '#3fb5ffcc' : '#ff4f6dcc', '#fff', 256, 128, 84), transparent: true, opacity: .9 })); pan.position.set(side * HW / 2, 1.3, 0); it.g.add(pan); }
      const postM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .3 }); for (const x of [-HW, 0, HW]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 2.8, 10), postM); p.position.set(x, 1.4, 0); it.g.add(p); const b = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 10), new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: .3 })); b.position.set(x, 2.9, 0); it.g.add(b); } LV.add(it.g); }
    else if (it.k === 'ally' || it.k === 'rival') { it.done = 0; it.pts = []; const vis = Math.min(it.n, 40); for (let i = 0; i < vis; i++) { const r = SP * Math.sqrt(i) * 1.05, a = i * 2.39996; it.pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, c: (it.k === 'ally' ? ALLC : RIVC)[i % 3], ph: rnd(0, 6) }); }
      it.r = SP * Math.sqrt(vis) * 1.05 + .3; it.lab = sprite(String(it.n), it.k === 'ally' ? '#ffffffaa' : '#7048e8dd'); it.lab.position.set(it.x, 1.6 + it.r * .4, it.z); LV.add(it.lab);
      if (it.k === 'rival') { const ring = new THREE.Mesh(new THREE.RingGeometry(it.r, it.r + .15, 40), new THREE.MeshBasicMaterial({ color: '#7048e8', transparent: true, opacity: .55 })); ring.rotation.x = -Math.PI / 2; ring.position.set(it.x, .03, it.z); LV.add(ring); it.ring = ring; } }
    else if (it.k === 'trap') { it.done = 0; it.g = new THREE.Group(); it.g.position.z = it.z; const bar = new THREE.Mesh(new THREE.BoxGeometry(it.w, .3, .5), new THREE.MeshStandardMaterial({ color: '#ff4f6d', roughness: .4 })); bar.position.y = .15; it.g.add(bar);
      const cG = new THREE.ConeGeometry(.22, .7, 10), cM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .3 }); for (let x = -it.w / 2 + .3; x <= it.w / 2 - .2; x += .5) { const c = new THREE.Mesh(cG, cM); c.position.set(x, .6, 0); it.g.add(c); } it.bar = it.g; LV.add(it.g); } }
  // base rival
  const base = new THREE.Group(); base.position.z = endZ - 7; const bm = new THREE.MeshStandardMaterial({ color: '#9d6bff', roughness: .35 }), bm2 = new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: .3 });
  const keep = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 3.4, 20), bm); keep.position.y = 1.7; base.add(keep); const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 2.4, 20), new THREE.MeshStandardMaterial({ color: '#ff6fae', roughness: .3 })); roof.position.y = 4.6; base.add(roof);
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1, 4.4, 14), bm); t.position.set(s * 3.6, 2.2, .3); base.add(t); const c = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 14), bm2); c.position.set(s * 3.6, 5.2, .3); base.add(c); }
  const door = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4b2a86' })); door.scale.set(1, 1.4, .3); door.position.set(0, 0, 2.5); base.add(door); LV.add(base);
  const bl = sprite(String(B), '#7048e8ee', 3); bl.position.set(0, 7.4, endZ - 7); LV.add(bl);
  const bpts = []; for (let i = 0; i < Math.min(B, 120); i++) { const r = SP * Math.sqrt(i) * 1.05, a = i * 2.39996; bpts.push({ x: Math.cos(a) * r * 1.3, z: Math.sin(a) * r * .6, c: RIVC[i % 3], ph: rnd(0, 6) }); }
  return { L, items, endZ, B, bl, bpts, base, len: -endZ, bz: endZ + 3 }; }
// ---------- army ----------
const army = { x: 0, z: 0, n: 5, units: [] };
function syncUnits(spawn) { const cap = CAPS[QUAL], want = Math.min(army.n, cap); while (army.units.length < want) { const sp = spawn && spawn.length ? spawn.pop() : null; army.units.push({ x: sp ? sp.x : army.x + (Math.random() - .5), z: sp ? sp.z : army.z + (Math.random() - .5), c: MYC[army.units.length % 4], s: .2 }); }
  while (army.units.length > want) { const u = army.units.pop(); burst(u.x, .4, u.z, u.c, 3, 3); } }
function radius() { return SP * Math.sqrt(Math.min(army.n, CAPS[QUAL])) * 1.05 + .3; }
function setN(n, spawn, txt, cls, at) { const old = army.n; army.n = Math.max(0, Math.min(MAXC, Math.round(n))); const d = army.n - old; if (txt !== false && d) popTxt(at ? at.x : army.x, 1.6, at ? at.z : army.z, txt || ((d > 0 ? '+' : '') + d), cls || (d > 0 ? 'g' : 'b'));
  if (d < 0) for (let k = 0; k < Math.min(-d, 25); k++) { const u = army.units[(Math.random() * army.units.length) | 0]; if (u) burst(u.x, .4, u.z, u.c, 3, 3.5); }
  syncUnits(spawn); const b = $('cntN'); b.textContent = army.n; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
// ---------- game state ----------
let T = 0, state = 'menu', clash = null, drag = null;
function start() { level = buildLevel(S.lvl); army.x = 0; army.z = 0; army.n = 5; army.units.length = 0; syncUnits(); $('cntN').textContent = 5; $('lvl').textContent = 'Nivel ' + S.lvl; state = 'run'; clash = null; $('menu').classList.add('hide'); $('end').classList.add('hide'); $('hud').classList.remove('hide'); $('hint').classList.remove('hide'); setTimeout(() => $('hint').classList.add('hide'), 2600); }
function endGame(win) { state = 'end'; const ratio = army.n / Math.max(1, level.B); $('endT').innerHTML = win ? '¡Victoria!' : '¡Oh, no!'; $('endS').textContent = win ? (ratio > 1.6 ? '★★★' : ratio > 1.2 ? '★★☆' : '★☆☆') : '☆☆☆';
  $('endD').textContent = win ? `Nivel ${level.L} superado con ${army.n} pompas` : `El ejército rival era más grande. ¡Prueba otro camino!`; $('bNext').textContent = win ? 'Siguiente ▶' : 'Reintentar ↺'; if (win) { S.lvl = level.L + 1; save(); sfx.win(); } else sfx.lose(); setTimeout(() => $('end').classList.remove('hide'), 700); $('playLvl').textContent = 'Nivel ' + S.lvl; }
// input: deslizar un dedo
cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, ax: army.x }; ac(); });
addEventListener('pointermove', e => { if (!drag || state !== 'run') return; const k = (W * 1.15) / Math.min(innerWidth, 700); army.x = Math.max(-HW + .5, Math.min(HW - .5, drag.ax + (e.clientX - drag.x) * k)); });
addEventListener('pointerup', () => drag = null); addEventListener('pointercancel', () => drag = null);
addEventListener('keydown', e => { if (e.key === 'ArrowLeft') army.x = Math.max(-HW + .5, army.x - .8); if (e.key === 'ArrowRight') army.x = Math.min(HW - .5, army.x + .8); });
// ---------- update ----------
function stepRun(dt) { const L = level.L, speed = 8 + Math.min(4, L * .25); const R0 = radius();
  if (state === 'run') army.z -= speed * dt; const ax = army.x;
  for (const it of level.items) { if (it.done) continue; const dz = it.z - army.z;
    if (it.pts && dz > R0 + it.r + 1) { it.done = 1; continue; }
    if (it.k === 'gate' && dz > 0) { it.done = 1; const g = ax < 0 ? it.L : it.R, n0 = army.n, n1 = OPS[g.op](n0, g.v); const good = n1 >= n0; setN(n1, null, gateTxt(g), good ? 'g' : 'b'); good ? sfx.good() : sfx.bad(); const side = ax < 0 ? -1 : 1; burst(side * HW / 2, 1.3, it.z, good ? new THREE.Color('#3fb5ff') : new THREE.Color('#ff4f6d'), 22, 6); it.g.children.forEach((c, i) => { if (c.geometry.type === 'BoxGeometry' && Math.sign(c.position.x) === side) c.material.opacity = .25; }); }
    else if ((it.k === 'ally' || it.k === 'rival') && Math.abs(dz) < R0 + it.r * .6 && Math.abs(it.x - ax) < (R0 + it.r) * .55) { it.done = 1; it.lab.visible = false; if (it.ring) it.ring.visible = false; const sp = it.pts.map(p => ({ x: it.x + p.x, z: it.z + p.z }));
      if (it.k === 'ally') { setN(army.n + it.n, sp, '+' + it.n, 'g', it); sfx.gulp(); it.pts.forEach(p => burst(it.x + p.x, .5, it.z + p.z, p.c, 2, 3)); }
      else if (army.n > it.n) { setN(army.n + it.n, sp, '¡ÑAM! +' + it.n, 'y', it); sfx.gulp(); it.pts.forEach(p => burst(it.x + p.x, .5, it.z + p.z, p.c, 3, 4)); G.shake = .3; }
      else { setN(army.n - it.n, null, '−' + it.n, 'b', it); sfx.hit(); it.pts.forEach(p => burst(it.x + p.x, .5, it.z + p.z, p.c, 3, 4)); G.shake = .5; } }
    else if (it.k === 'trap' && dz > -.3 && dz < R0 + .3) { const bx = Math.sin(T * it.sp + it.ph) * (HW - it.w / 2); let hit = 0; for (const u of army.units) if (!u.hit && (it.lost || 0) < Math.ceil(army.n * .22) && Math.abs(u.z - it.z) < .3 && Math.abs(u.x - bx) < it.w / 2 + .2) { u.hit = 1; hit++; }
      if (hit) { const loss = Math.max(1, Math.min(Math.ceil(army.n * .22) - (it.lost || 0), Math.round(hit * army.n / Math.max(1, army.units.length)))); it.lost = (it.lost || 0) + loss; army.units = army.units.filter(u => { if (u.hit) { burst(u.x, .4, u.z, u.c, 4, 4); return false; } return true; }); setN(army.n - loss, null, '−' + loss, 'b', { x: bx, z: it.z }); sfx.hit(); }
      if (dz > R0) it.done = 1; }
    else if (it.k === 'trap' && dz >= R0 + .3) it.done = 1; }
  if (army.n <= 0 && state === 'run') { endGame(false); return; }
  if (state === 'run' && army.z <= level.endZ) { state = 'clash'; clash = { t: 0, B: level.B }; }
  if (state === 'clash') { clash.t += dt; if (army.z > level.bz) army.z -= 5 * dt; if (clash.t > .6) { clash.acc = (clash.acc || 0) + dt; while (clash.acc > .05 && army.n > 0 && clash.B > 0) { clash.acc -= .05; const k = Math.max(1, Math.ceil(Math.min(army.n, clash.B) * .06)); const kk = Math.min(k, army.n, clash.B); clash.B -= kk; setN(army.n - kk, null, false); sfx.pop(); burst(rnd(-2, 2), .5, level.bz - 1.5, RIVC[0], 4, 5); setSprite(level.bl, String(clash.B), '#7048e8ee'); }
      if (clash.B <= 0 || army.n <= 0) { const win = army.n > 0; if (win) { popTxt(0, 3, level.bz - 4, '¡BASE CONQUISTADA!', 'y'); for (let i = 0; i < 6; i++) burst(rnd(-4, 4), 3, level.endZ - 7, MYC[i % 4], 14, 7); level.base.scale.y = .6; } endGame(win); } } }
  // formación del ejército (girasol) con seguimiento suave
  const n = army.units.length; for (let i = 0; i < n; i++) { const u = army.units[i], r = SP * Math.sqrt(i) * 1.05, a = i * 2.39996; let tx = army.x + Math.cos(a) * r, tz = army.z + Math.sin(a) * r * .8; tx = Math.max(-HW + .3, Math.min(HW - .3, tx)); const k = 1 - Math.exp(-dt * (6 + 4 / (1 + i * .02))); u.x += (tx - u.x) * k; u.z += (tz - u.z) * k; u.s += (1 - u.s) * Math.min(1, dt * 8); }
  $('progI').style.width = Math.min(100, -army.z / level.len * 100) + '%'; }
const G = { shake: 0 };
function draw(dt) { const n = army.units.length; for (let i = 0; i < n; i++) { const u = army.units[i]; putPomp(ARMY, i, u.x, Math.abs(Math.sin(T * 10 + i)) * .12, u.z, u.s, u.c); } flush(ARMY, n);
  let w = 0; if (level) { const z0 = army.z - 70, z1 = army.z + 12; for (const it of level.items) { if (!it.pts || it.done || it.z < z0 || it.z > z1) continue; for (const p of it.pts) { if (w >= WORLD.n) break; putPomp(WORLD, w++, it.x + p.x, Math.abs(Math.sin(T * 4 + p.ph)) * .15, it.z + p.z, it.k === 'ally' ? .9 : 1, p.c); } if (it.ring) it.ring.material.color.set(army.n > it.n ? '#38d97a' : '#ff4f6d'); if (it.lab) setLabCol(it); }
    if (army.z - level.endZ < 70) { const B = clash ? clash.B : level.B, vis = Math.min(level.bpts.length, Math.ceil(level.bpts.length * B / level.B)); for (let i = 0; i < vis && w < WORLD.n; i++) { const p = level.bpts[i]; putPomp(WORLD, w++, p.x, Math.abs(Math.sin(T * 6 + p.ph)) * .15, level.endZ - 1.2 + p.z, 1, p.c); } }
    for (const it of level.items) if (it.k === 'trap') it.bar.position.x = Math.sin(T * it.sp + it.ph) * (HW - it.w / 2);
    for (const o of LV.children) if (o.userData.bob !== undefined) o.position.y = 1 + Math.sin(T + o.userData.bob) * .6; }
  flush(WORLD, w);
  // cámara: vertical = más alta y atrás; horizontal = más cerca; se aleja con el tamaño del ejército
  const land = cam.aspect > 1, R0 = radius(), h = (land ? 7 : 10) + R0 * .9, d = (land ? 8.5 : 9.5) + R0 * .8; G.shake = Math.max(0, G.shake - dt);
  const sx = (Math.random() - .5) * G.shake * .5; cam.position.set(army.x * .45 + sx, h, army.z + d); cam.lookAt(army.x * .35, 0, army.z - (land ? 7 : 6)); }
function setLabCol(it) { if (it.k !== 'rival') return; const big = army.n > it.n; if (it.lb !== big) { it.lb = big; setSprite(it.lab, String(it.n), big ? '#28b864dd' : '#e8384fdd'); } }
// calidad adaptativa
let fa = 60, qT = 0; function adapt(dt) { fa += (1 / Math.max(dt, .001) - fa) * .05; qT += dt; if (qT < 1.5) return; qT = 0;
  if (fa < 42 && (PR > 1 || QUAL > 0)) { if (PR > 1) PR = Math.max(1, PR - .25); else QUAL--; R.setPixelRatio(PR); resize(); syncUnits(); }
  else if (fa > 57 && (PR < Math.min(devicePixelRatio || 1, 2) || QUAL < 2)) { if (QUAL < 2) QUAL++; else PR = Math.min(devicePixelRatio || 1, 2, PR + .25); R.setPixelRatio(PR); resize(); syncUnits(); } }
let last = performance.now(); function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
  if (level && (state === 'run' || state === 'clash')) stepRun(dt); else if (!level || state === 'menu') { army.z -= dt * 3; if (!level) level = buildLevel(S.lvl); for (const u of army.units) { } }
  stepParts(dt); draw(dt); adapt(dt); R.render(scene, cam); }
// ---------- UI ----------
$('playLvl').textContent = 'Nivel ' + S.lvl; const sndTxt = () => { $('bSnd').textContent = S.snd ? '🔊 Sonido' : '🔇 Sonido'; $('bSnd2').textContent = S.snd ? '🔊' : '🔇'; }; sndTxt();
$('bPlay').onclick = () => { ac(); start(); }; $('bNext').onclick = () => start(); $('bMenu').onclick = () => { state = 'menu'; $('end').classList.add('hide'); $('hud').classList.add('hide'); $('menu').classList.remove('hide'); level = buildLevel(S.lvl); army.z = 0; army.n = 5; army.units.length = 0; syncUnits(); };
$('bSnd').onclick = $('bSnd2').onclick = () => { S.snd ^= 1; save(); sndTxt(); }; $('bReset').onclick = () => { S.lvl = 1; save(); $('playLvl').textContent = 'Nivel 1'; level = buildLevel(1); };
syncUnits(); requestAnimationFrame(loop);
window.__pt = { army, get level() { return level; }, get state() { return state; }, start, setN, S, get QUAL() { return QUAL; }, get fps() { return fa; } };
