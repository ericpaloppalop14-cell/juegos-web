// v5: pantalla de inicio viva — un tornado gigante chupando muebles, personajes bailando y persiguiéndose,
// el Alcalde Paraguas volando con su sombrero, globos de texto, confeti y todo tocable.
import { makeSkyline } from './stage.js?v=13';
import * as THREE from 'three';
import * as AU from './audio.js?v=13';
import { KINDS, getGeo, propMaterial, makeAlcalde } from './models.js?v=13';
import { Particles, makeTornado } from './fx.js?v=13';
import { PLAYERS } from './players.js?v=13';

const rnd = Math.random, PI = Math.PI;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (a) => a[(rnd() * a.length) | 0];
const CONF = [0xff6b5e, 0xffd23f, 0x3fe0b0, 0x4aa8ff, 0xff74c4, 0xffffff, 0xb8a0ff];
const TC = { x: 0, z: -12 };           // centro del tornado
const TR = 5.4;                        // radio del tornado gigante

const GENERIC = ['¡Mi calcetín!', '¡Quack!', '¡Cuidado con el sofá!', '¡Esto vuela!', '¡Bailemos!', '¡Soy un pato!', '¡Hay un armario volando!', '¡Te pillo!', '¡Corre, corre!', '¡Qué desorden!', '¡Aspira, aspira!', '¡Yo limpié primero!', '¡Wiiiii!', '¡Ay, mi moño!', '¡Un sofá me persigue!'];
const FLY_SAY = { sofa: ['¡SOCORROOO!', '¡Aaaaaah!', '¡Que me traga!'], fridge: ['¡Qué mareo!', '¡Uuuuuh!'], duck: ['¡Quack!', '¡Quack quack!'], sock: ['¡Mi pareja!', '¡Soy un calcetín!'], armchair: ['¡Mi cojín!', '¡Wooo!'], tv: ['¡Ya no hay tele!', '¡Cambio de canal!'], lamp: ['¡Me apago!', '¡Qué luz!'], bed: ['¡Sueño volando!', '¡Zzz… ¿qué?!'], toaster: ['¡Tostada al aire!'], cup: ['¡Té para todos!'], chair: ['¡Ay, mi pata!'], slipper: ['¡Mi zapatilla!'] };
const POPS = ['¡POP!', '¡BOING!', '¡PLOF!', '¡ZAS!', '¡WIII!', '¡PUM!'];

// clona un modelo de personaje compartiendo geometrías (barato) y reconstruye las referencias de userData
function cloneModel(src) {
  const nodes = []; src.traverse((o) => nodes.push(o)); const saved = nodes.map((o) => o.userData); nodes.forEach((o) => { o.userData = {}; });
  const c = src.clone(true); nodes.forEach((o, i) => { o.userData = saved[i]; });
  const cn = []; c.traverse((o) => cn.push(o)); const map = new Map(); nodes.forEach((o, i) => map.set(o, cn[i]));
  const sud = src.userData, ud = {};
  for (const k in sud) { const v = sud[k]; if (v && v.isObject3D) ud[k] = map.get(v); else if (Array.isArray(v) && v.length && v.every((x) => x && x.isObject3D)) ud[k] = v.map((x) => map.get(x)); else if (typeof v !== 'function') ud[k] = v; }
  c.userData = ud; return c;
}
function skyTexture() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#58b4ff'); gr.addColorStop(0.45, '#9fdcff'); gr.addColorStop(0.75, '#ffd9f0'); gr.addColorStop(1, '#fff0d8'); g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function groundTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) & 1 ? '#ffe3f1' : '#c9f1ff'; g.fillRect(x * 32, y * 32, 32, 32); }
  g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(16 + (i % 4) * 64 + (i >> 2) * 32, 16 + (i >> 1) * 64, 7, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); t.anisotropy = 4; return t;
}
function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff';
  for (const [x, y, r] of [[34, 40, 20], [58, 30, 26], [86, 40, 20], [64, 44, 22], [46, 44, 18]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function makeTitle({ getModel, popHost, bubHost, onNote = () => {} }) {
  const scene = new THREE.Scene(); scene.background = skyTexture(); scene.fog = new THREE.Fog(0xffe6f2, 45, 120);
  const camera = new THREE.PerspectiveCamera(56, 0.5, 0.5, 300);
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0xffd9c8, 2.0));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.2); sun.position.set(14, 26, 18); scene.add(sun);
  const rimL = new THREE.DirectionalLight(0xbfe4ff, 0.9); rimL.position.set(-18, 10, -10); scene.add(rimL);
  // v13: luz de estudio: relleno frío de frente y contraluz rosa
  const fillL = new THREE.DirectionalLight(0xcfe0ff, 0.7); fillL.position.set(-16, 8, 22); scene.add(fillL); const kickL = new THREE.DirectionalLight(0xffb0e8, 1.3); kickL.position.set(10, 14, -22); scene.add(kickL);
  const parts = new Particles(scene, 700);
  // suelo
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 })); ground.position.y = -0.02; scene.add(ground);
  // nubes
  const ctex = cloudTexture(), clouds = [];
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: ctex, transparent: true, opacity: 0.9, fog: false, depthWrite: false })); const s = 14 + rnd() * 14; m.scale.set(s, s, 1); m.position.set(-60 + i * 15 + rnd() * 6, 14 + rnd() * 16, -50 - rnd() * 20); m.userData.sp = 0.3 + rnd() * 0.5; scene.add(m); clouds.push(m); }
  // v10: ciudad loca al fondo
  const skyline = makeSkyline(scene, { z: -42, n: 15, spread: 62, w: 12 });
  // arcoíris
  const rb = new THREE.Group(); [0xff6b5e, 0xffd23f, 0x8fdc4a, 0x4aa8ff, 0xb08cff].forEach((c, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(26 - i * 1.5, 0.75, 6, 40, PI), new THREE.MeshBasicMaterial({ color: c, fog: false, transparent: true, opacity: 0.8 })); rb.add(t); });
  rb.position.set(20, -2, -55); scene.add(rb);
  // tornado gigante
  const tornado = makeTornado(scene);
  const RK = TR * 1.12, HMAX = 3.7 * RK * 0.9, NR = 18, ringM = [];
  const GRAD = [0x5a6cff, 0x8a5cff, 0xb06bff, 0xe070e8, 0xff74c4, 0xffa0dc];
  const tc = new THREE.Color(), tc2 = new THREE.Color();
  for (let i = 0; i < NR; i++) {
    const k = i / (NR - 1) * (GRAD.length - 1), a = Math.floor(k), b = Math.min(GRAD.length - 1, a + 1); tc.set(GRAD[a]).lerp(tc2.set(GRAD[b]), k - a);
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.15, 8, 30), new THREE.MeshStandardMaterial({ color: tc.clone(), roughness: 0.55, emissive: tc.clone().multiplyScalar(0.28), transparent: true, opacity: 0.93 })); m.userData.i = i; scene.add(m); ringM.push(m);
  }
  const radAt = (y) => RK * (0.42 + 1.08 * clamp(y / (3.7 * RK), 0, 1));
  // carita del tornado
  const face = new THREE.Group(); scene.add(face); const wm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), km = new THREE.MeshBasicMaterial({ color: 0x3a2a55, fog: false }), pm = new THREE.MeshBasicMaterial({ color: 0xff8fb8, fog: false, transparent: true, opacity: 0.8 });
  const eyes = [];
  for (const s of [-1, 1]) { const eg = new THREE.Group(); eg.position.set(s * 1.9, 0.6, 0); const w = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), wm); w.scale.z = 0.5; const p = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), km); p.position.set(0, -0.05, 0.45); const sh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), wm); sh.position.set(0.18, 0.2, 0.9); eg.add(w, p, sh); face.add(eg); eyes.push(eg); const ch = new THREE.Mesh(new THREE.CircleGeometry(0.7, 14), pm); ch.position.set(s * 2.9, -1.0, 0.3); ch.scale.y = 0.6; face.add(ch); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.15, 6, 16, PI), km); mouth.rotation.z = PI; mouth.position.set(0, -0.6, 0.4); face.add(mouth);
  // objetos que vuelan
  const SPEC = [['duck', 7, 1.2], ['sock', 7, 1.1], ['cup', 3, 1.2], ['slipper', 2, 1.2], ['cookie', 2, 1.1], ['book', 2, 1.3], ['cushion', 2, 1.8], ['lamp', 2, 3.0], ['tv', 1, 2.0], ['toycar', 2, 1.6], ['toaster', 2, 1.7], ['plant', 1, 1.8], ['chair', 2, 2.4], ['armchair', 2, 2.8], ['sofa', 3, 3.8], ['fridge', 1, 3.2], ['table', 1, 3.2], ['bed', 1, 4.0]];
  const flyers = [];
  const buildFlyers = () => {
    for (const f of flyers) scene.remove(f.m); flyers.length = 0;
    for (const [kind, n, size] of SPEC) { if (!KINDS[kind]) continue; for (let i = 0; i < n; i++) {
      const v = (rnd() * KINDS[kind].nv) | 0, geo = getGeo(kind, v), m = new THREE.Mesh(geo.geo, propMaterial); m.rotation.order = 'YXZ'; scene.add(m);
      flyers.push({ kind, m, geo, size: size * 1.35 * (0.85 + rnd() * 0.3), sc: size * 1.35 / (2 * geo.r), u: rnd(), dur: 10 + rnd() * 9, a: rnd() * 6.28, w: (0.55 + rnd() * 0.5) * (rnd() < 0.5 ? 1 : 1), off: 1.2 + rnd() * 2.6, tx: (rnd() - 0.5) * 4, tz: (rnd() - 0.5) * 4, ty: (rnd() - 0.5) * 3, popT: 0, pos: new THREE.Vector3() });
    } }
  };
  // personajes
  const actors = []; let starId = 'dona';
  // v8: personajes repartidos por la escena en tres filas (fondo: estrella; medio: bailarinas a los lados; frente: dos parejas que se persiguen, cada una en su mitad)
  const ZL = { x0: -0.9, x1: 0.9, z0: 2.4, z1: 4.4 }, ZR = { x0: -0.9, x1: 0.9, z0: 8.2, z1: 10.2 };
  const SLOTS = [{ role: 'star', home: [0, -1.4], sc: 2.7 }, { role: 'dance', home: [-1, -2.4], sc: 2.05 }, { role: 'dance', home: [1, -2.4], sc: 2.05 }, { role: 'run', zone: ZL, sc: 1.85 }, { role: 'run', zone: ZL, sc: 1.85 }, { role: 'run', zone: ZR, sc: 1.85 }, { role: 'run', zone: ZR, sc: 1.85 }];
  const pairs = [[3, 4], [5, 6]];
  const assign = (a, id) => {
    if (a.model) scene.remove(a.model); a.id = id; a.model = cloneModel(getModel(id)); a.model.userData.lids && 0; scene.add(a.model); a.def = PLAYERS.find((p) => p.id === id);
    a.ud = a.model.userData; a.hh = (a.ud.h || 1.7);
  };
  const buildActors = () => {
    for (const a of actors) a.model && scene.remove(a.model); actors.length = 0;
    const others = PLAYERS.map((p) => p.id).filter((id) => id !== starId).sort(() => rnd() - 0.5);
    SLOTS.forEach((s, i) => {
      const a = { cool: 0, slot: s, role: s.role, x: s.home ? s.home[0] : bounds(3.6) * (i % 2 ? 0.5 : -0.5), z: s.home ? s.home[1] : (s.zone.z0 + s.zone.z1) / 2 + (i % 2 ? 0.8 : -0.8), vx: 0, vz: 0, ph: rnd() * 6.28, react: 0, stun: 0, sc: s.sc, face: 0, spin: 0, hop: 0, blinkT: 1 + rnd() * 3, blinkP: 0 };
      assign(a, i === 0 ? starId : others[i - 1]); actors.push(a);
    });
    pairs.forEach(([c, f]) => { actors[c].chase = actors[f]; actors[f].chase = null; actors[c].chaser = true; actors[f].chaser = false; });
  };
  // Alcalde
  const alc = makeAlcalde(); alc.visible = false; scene.add(alc); const AL = { ph: 0, t: 0, x: 0, y: 0, z: 0, wait: 3, sx: 1, hat: 0, said: 0, fling: 0 };
  // ---------- globos de texto ----------
  const bubs = []; for (let i = 0; i < 3; i++) { const e = document.createElement('div'); e.className = 'tbub'; bubHost.appendChild(e); bubs.push({ e, get: null, t: 0, off: 2.4 }); }
  const V = new THREE.Vector3();
  function say(get, txt, ms = 1800, off = 2.2, cls = '') {
    let b = bubs.find((q) => q.t <= 0) || bubs.reduce((m, q) => (q.t < m.t ? q : m), bubs[0]); b.get = get; b.t = ms / 1000; b.off = off; b.e.textContent = txt; b.e.className = 'tbub on ' + cls;
  }
  function popText(x, y, txt, cls = '') { const d = document.createElement('div'); d.className = 'pop big ' + cls; d.textContent = txt; d.style.left = x + 'px'; d.style.top = y + 'px'; popHost.appendChild(d); setTimeout(() => d.remove(), 950); }
  let W = 400, H = 800, speakT = 0, T = 0, boost = 1, kick = 0, nextSay = 1.5, nextConf = 4, nextShuffle = 14, active = false;
  // cámara: se encuadra la escena en el hueco libre entre el logo y la barra de botones (la imagen sigue llenando toda la pantalla)
  let ins = { l: 0, r: 0, t: 0, b: 0 }; const VF = { fov: 50, asp: 0.8 };
  function placeCamera() {
    const Wf = Math.max(160, W - ins.l - ins.r), Hf = Math.max(200, H - ins.t - ins.b), aspF = Wf / Hf; VF.asp = aspF;
    if (aspF < 1.0) { VF.fov = 54; camera.position.set(0, 15.5, 24); camera.lookAt(0, 4.6, -1); }
    else { VF.fov = 46; camera.position.set(0, 12.5, 25); camera.lookAt(0, 4.2, -1); }
    if (window.TCAM) { camera.position.set(...window.TCAM.p); camera.lookAt(...window.TCAM.t); }
    camera.fov = 2 * Math.atan(Math.tan(VF.fov * PI / 360) * H / Hf) * 180 / PI; camera.aspect = W / H;
    camera.setViewOffset(W, H, W / 2 - (ins.l + Wf / 2), H / 2 - (ins.t + Hf / 2), W, H); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  let PR = 1;
  function resize(w, h, pr) { W = w; H = h; PR = pr; placeCamera(); parts.mat.uniforms.uScale.value = (h * pr * 0.5) / Math.tan(camera.fov * PI / 360); }
  function setInsets(n) { if (n.l === ins.l && n.r === ins.r && n.t === ins.t && n.b === ins.b) return; ins = n; resize(W, H, PR); }
  function bounds(z) { const d = camera.position.z - z, hw = Math.tan(VF.fov * PI / 360) * d * VF.asp; return Math.max(1.6, hw * 0.92); }
  // ---------- reacciones ----------
  function confetti(x, y, z, n = 26, speed = 5) { parts.burst(x, y, z, n, { color: CONF, speed, size: 0.32, life: 1.3, shape: 1, g: 6, up: 4, drag: 0.8 }); parts.burst(x, y, z, Math.ceil(n / 3), { color: [0xffffff, 0xfff0a0], speed: speed * 0.6, size: 0.45, life: 0.9, shape: 3, g: 0, up: 1, drag: 2.5 }); }
  const sfxFor = { duck: () => AU.quack(), sofa: () => AU.sofaScream(), armchair: () => AU.sofaScream(), chair: () => AU.sofaScream(), fridge: () => AU.stomp(), bed: () => AU.stomp(), tv: () => AU.toastShot(), toaster: () => AU.toastShot(), lamp: () => AU.coin(), cup: () => AU.puff(), plant: () => AU.puff() };
  function tapFlyer(f, sx, sy) {
    if (f.popT > 0) return; f.popT = 0.45; (sfxFor[f.kind] || (() => AU.pop((rnd() * 5) | 0, 0)))();
    confetti(f.pos.x, f.pos.y, f.pos.z, 30, 6); popText(sx, sy, pick(POPS)); if (rnd() < 0.55 && FLY_SAY[f.kind]) say(() => f.pos, pick(FLY_SAY[f.kind]), 1400, 1.2 * f.size / 1.5 + 0.8, 'fly');
  }
  function tapActor(a, sx, sy) {
    a.react = 0.9; a.spin = 0; confetti(a.x, 1.4 * a.sc, a.z, 26, 5); AU.select();
    const line = a.def && rnd() < 0.7 ? pick(a.def.say) : pick(GENERIC); say(() => V.set(a.x, 0, a.z), line, 1900, 1.8 * a.sc + 0.2);
    if (T - speakT > 1.6 && a.def && a.def.voice) { speakT = T; AU.speak(line, a.def.voice.pitch, a.def.voice.rate); }
    popText(sx, sy - 30, pick(['¡Hola!', '¡Eeeh!', '¡Yuju!', '¡Bailo!', '¡Wiii!']));
  }
  function tapAlc(sx, sy) {
    AU.sofaScream(); AU.hit(); confetti(AL.x, AL.y + 1.5, AL.z, 24, 5); popText(sx, sy, '¡MULTA!'); say(() => V.set(AL.x, AL.y, AL.z), pick(['¡Eso es ilegal!', '¡MULTAAA!', '¡Mi sombrero!', '¡Exijo un permiso!']), 1600, 2.4, 'alc');
    if (AL.ph === 0) { AL.t = 0; AL.ph = 1; } AL.fling = 1;
  }
  function tapTornado(sx, sy) { kick = 1; boost = 2.6; AU.swish(); popText(sx, sy, '¡WHOOOSH!'); parts.burst(TC.x, 5, TC.z + 2, 40, { color: CONF, speed: 8, size: 0.4, life: 1.6, shape: 1, g: 3, up: 3 }); }
  const ray = new THREE.Raycaster(), sph = new THREE.Sphere(), hitP = new THREE.Vector3(), nd = new THREE.Vector2();
  function tap(cx, cy) {
    AU.init(); nd.set((cx / W) * 2 - 1, -(cy / H) * 2 + 1); ray.setFromCamera(nd, camera);
    let best = null, bd = 1e9;
    const test = (c, r, fn) => { sph.center.copy(c); sph.radius = r; if (ray.ray.intersectSphere(sph, hitP)) { const d = hitP.distanceTo(ray.ray.origin); if (d < bd) { bd = d; best = fn; } } };
    for (const a of actors) test(V.set(a.x, a.sc * 0.95, a.z), a.sc * 1.15, () => tapActor(a, cx, cy));
    if (alc.visible) test(V.set(AL.x, AL.y + 1.4, AL.z), 1.9, () => tapAlc(cx, cy));
    for (const f of flyers) if (f.popT <= 0) test(f.pos, Math.max(0.9, f.size * 0.75), () => tapFlyer(f, cx, cy));
    if (best) { best(); return true; }
    // ¿al tornado?
    const o = ray.ray.origin, d = ray.ray.direction; if (d.z < -0.01) { const k = (TC.z - o.z) / d.z, px = o.x + d.x * k, py = o.y + d.y * k; if (py > 0 && py < 16 && Math.abs(px - TC.x) < 2 + py * 0.3) { tapTornado(cx, cy); return true; } }
    // al aire: chispas
    air(cx, cy); return false;
  }
  function air(cx, cy) { nd.set((cx / W) * 2 - 1, -(cy / H) * 2 + 1); ray.setFromCamera(nd, camera); const o = ray.ray.origin, d = ray.ray.direction, k = 14; confetti(o.x + d.x * k, o.y + d.y * k, o.z + d.z * k, 16, 3); if (T - speakT > 0.25) { speakT = T - 1.2; AU.select(); } }
  // ---------- animación ----------
  function updateFlyers(dt) {
    const Rk = RK;
    for (const f of flyers) {
      if (f.popT > 0) { f.popT -= dt; const k = f.popT / 0.45; f.m.scale.setScalar(f.sc * (1 + (1 - k) * 0.9) * k); if (f.popT <= 0) { f.u = 0; f.a = rnd() * 6.28; f.m.scale.setScalar(f.sc * 0.01); } continue; }
      f.u += dt / f.dur * boost; if (f.u >= 1) { f.u = 0; f.a = rnd() * 6.28; }
      const e = f.u, h = 0.5 + Math.pow(e, 1.25) * HMAX * 0.85, fr = 0.42 * Rk + (1.5 - 0.42) * Rk * clamp(h / (3.7 * Rk), 0, 1);
      f.a += dt * f.w * (0.9 + 1.5 * e) * (0.5 + boost * 0.5); const far = 12.5 - 9 * ss(0, 0.5, e), rad = Math.max(fr * 1.16 + f.off, far) + ss(0.86, 1, e) * 14;
      f.pos.set(TC.x + Math.cos(f.a) * rad, h + f.size * 0.3, TC.z + Math.sin(f.a) * rad * 0.7);
      f.m.position.copy(f.pos); f.m.position.y -= f.geo.halfH * f.sc * 0.0;
      f.m.rotation.x += dt * f.tx * (0.4 + e); f.m.rotation.z += dt * f.tz * (0.4 + e); f.m.rotation.y += dt * f.ty * (0.6 + e);
      const s = f.sc * ss(0, 0.06, e) * (1 - ss(0.95, 1, e) * 0.9); f.m.scale.setScalar(Math.max(0.001, s)); f.m.position.y = f.pos.y;
    }
  }
  function updateActors(dt) {
    for (const a of actors) {
      a.ph += dt; const t = T, m = a.model, ud = a.ud; let sp = 0, hopF = 6, sw = 0, armsUp = 0;
      if (a.react > 0) { a.react -= dt; a.spin += dt * 14; }
      if (a.role === 'star' || a.role === 'dance') {
        const hx = Math.sign(a.slot.home[0]) * bounds(a.slot.home[1]) * 0.66, hz = a.slot.home[1]; a.x += (hx - a.x) * Math.min(1, dt * 3); a.z += (hz - a.z) * Math.min(1, dt * 3);
        hopF = a.role === 'star' ? 5.2 : 6.4; sw = Math.sin(t * hopF + a.ph * 2); a.face = Math.sin(t * 2.2 + a.ph) * (a.role === 'star' ? 0.7 : 0.9); a.hop = Math.abs(Math.sin(t * hopF * 0.5 + a.ph)) * (a.role === 'star' ? 0.55 : 0.42); armsUp = 0.5;
      } else {
        const o = a.chase ? a.chase : actors.find((q) => q.chase === a); let dx = o.x - a.x, dz = o.z - a.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
        if (a.stun > 0) { a.stun -= dt; sp = 0; } else if (a.chase) { sp = 3.6; a.vx = dx * sp; a.vz = dz * sp; } else { // el que huye: zigzag y hacia el centro
          sp = 3.45; const zz = Math.sin(t * 3.1 + a.ph * 3) * 0.7, zc = a.slot.zone, zx = Math.sin(T * 0.32 + (a.slot.zone === ZL ? 0 : PI)) * 0.85 * bounds(a.z), zzc = (zc.z0 + zc.z1) / 2, fx = -dx + zz * -dz - (a.x - zx) * 0.22, fz = -dz + zz * dx - (a.z - zzc) * 0.4, fl = Math.hypot(fx, fz) || 1; a.vx = fx / fl * sp; a.vz = fz / fl * sp;
        }
        if (a.stun > 0) { a.vx = a.vz = 0; }
        if (d < 0.9 && !(a.chase && a.stun <= 0 && a.cool <= 0)) { a.x -= dx * (0.9 - d) * 0.5; a.z -= dz * (0.9 - d) * 0.5; } a.x += a.vx * dt; a.z += a.vz * dt; const bx = bounds(a.z), zn = a.slot.zone; a.x = clamp(a.x, bx * zn.x0, bx * zn.x1); a.z = clamp(a.z, zn.z0, zn.z1);
        for (const q of actors) { if (q === a || q === o) continue; const ex = q.x - a.x, ez = q.z - a.z, ed = Math.hypot(ex, ez) || 1, RS = q.role === 'run' ? 2.5 : 3.8; if (ed < RS) { a.x -= ex / ed * (RS - ed) * Math.min(1, dt * 3); a.z -= ez / ed * (RS - ed) * Math.min(1, dt * 3); } }
        if (a.chase && a.stun <= 0 && a.cool <= 0 && d < 1.25) { // ¡pillado!
          const q = a.chase; a.chase = null; q.chase = a; a.stun = 0; q.stun = 0.9; a.cool = q.cool = 2.6; a.react = 0.7; q.react = 0.5; confetti((a.x + q.x) / 2, 1.4, (a.z + q.z) / 2, 24, 5); AU.pop(3, 1);
          say(() => V.set(q.x, 0, q.z), pick(['¡Pillada!', '¡Te pillé!', '¡Ahora tú!', '¡Tú la llevas!']), 1300, 1.8 * q.sc + 0.2); a.chaser = false; q.chaser = true;
        }
        if (a.cool > 0) a.cool -= dt;
        const spd = Math.hypot(a.vx, a.vz); sw = Math.sin(t * 11 + a.ph); hopF = 11; a.hop = spd > 0.5 ? Math.abs(Math.sin(t * 5.6 + a.ph)) * 0.36 : Math.abs(Math.sin(t * 8)) * 0.1; if (spd > 0.3) { const tf = Math.atan2(a.vx, a.vz); let df = tf - a.face; df = Math.atan2(Math.sin(df), Math.cos(df)); a.face += df * Math.min(1, dt * 10); }
      }
      let hop = a.hop, spin = 0; if (a.react > 0) { const k = a.react; hop += Math.sin(clamp(1 - k, 0, 1) * PI) * 1.4; spin = a.spin; }
      const ph = Math.sin(t * hopF * 0.5 + a.ph) , stretch = 1 + (a.hop > 0.1 ? Math.cos(t * hopF + a.ph) * 0.07 : Math.sin(t * 2 + a.ph) * 0.025);
      m.position.set(a.x, hop * a.sc * 0.8, a.z); m.rotation.set(Math.sin(t * hopF * 0.5 + a.ph) * 0.06, a.face + spin, Math.sin(t * hopF * 0.5 + a.ph + 1) * 0.08);
      const s = a.sc * (a.id === starId && a.role === 'star' ? 1 : 1); m.scale.set(s / Math.sqrt(stretch), s * stretch, s / Math.sqrt(stretch));
      // brazos, cabeza, boca, parpadeo (igual que en la partida)
      const a0 = ud.arms0 || 2.35;
      if (ud.arms) { ud.arms[1].rotation.z = -(a0 + sw * 0.55 + armsUp * 0.3); ud.arms[0].rotation.z = a0 - sw * 0.5 + 0.2 + armsUp * 0.1; ud.arms[1].rotation.x = Math.cos(t * 9) * 0.3; ud.arms[0].rotation.x = -Math.cos(t * 9) * 0.25; }
      if (a.react > 0 && ud.arms) { const cw = Math.sin(t * 16 + a.ph); ud.arms[1].rotation.z = -(0.5 + cw * 0.28); ud.arms[0].rotation.z = 0.5 - cw * 0.28; ud.arms[1].rotation.x = ud.arms[0].rotation.x = 0; }
      if (ud.legs) { const k = Math.min(1, Math.hypot(a.vx || 0, a.vz || 0) / 2.5) || 0, lk = a.react > 0 ? 0.5 : k; ud.legs[0].rotation.x = Math.sin(t * hopF + a.ph) * 0.85 * lk; ud.legs[1].rotation.x = -Math.sin(t * hopF + a.ph) * 0.85 * lk; }
      if (ud.head) { ud.head.rotation.z = Math.sin(t * 4.5 + a.ph) * 0.09; ud.head.position.y = (ud.headY || 1.36) + Math.abs(sw) * 0.03; }
      if (ud.mouth) ud.mouth.scale.set(1, 1.1 + Math.sin(t * 9 + a.ph) * 0.35 + (a.react > 0 ? 0.4 : 0), 1);
      if (ud.lids) { a.blinkT -= dt; if (a.blinkT < 0) { a.blinkP = 0.17; a.blinkT = 1.5 + rnd() * 3; } a.blinkP = Math.max(0, a.blinkP - dt); const bl = a.blinkP > 0 ? Math.sin((1 - a.blinkP / 0.17) * PI) : 0; for (const l of ud.lids) { l.visible = bl > 0.05; l.scale.set(1, Math.max(0.01, bl), 1); } }
    }
  }
  function updateAlcalde(dt) {
    AL.t += dt; const ud = alc.userData;
    if (AL.ph === 0) { // esperando fuera
      alc.visible = false; AL.wait -= dt; if (AL.wait <= 0) { AL.ph = 1; AL.t = 0; AL.sx = rnd() < 0.5 ? -1 : 1; AL.said = 0; AL.fling = 0; }
    } else if (AL.ph === 1) { // llega sujetándose el sombrero contra el viento
      alc.visible = true; const k = AL.t / 3.4; AL.x = lerp(AL.sx * 5.6, AL.sx * 2.5, ss(0, 1, k)) + Math.sin(AL.t * 9) * 0.06; AL.z = 7.4; AL.y = Math.abs(Math.sin(AL.t * 7)) * 0.25;
      alc.rotation.set(0, -AL.sx * 0.6 + Math.sin(AL.t * 12) * 0.1, -AL.sx * 0.25 * (0.6 + 0.4 * Math.sin(AL.t * 14))); if (!AL.said && AL.t > 0.8) { AL.said = 1; say(() => V.set(AL.x, AL.y, AL.z), '¡Mi sombrero!', 1800, 2.6, 'alc'); AU.swish(); }
      if (AL.t > 3.4) { AL.ph = 2; AL.t = 0; }
    } else if (AL.ph === 2) { alc.visible = true; // ¡el tornado se lo lleva!
      const k = AL.t / 6.5, ang = AL.sx > 0 ? 0.9 - AL.t * 1.5 : PI - 0.9 + AL.t * 1.5, rad = radAt(ss(0, 0.9, k) * 9) * 1.2 + 2.6 + ss(0.85, 1, k) * 16;
      const ax = TC.x + Math.cos(ang) * rad, az = TC.z + Math.sin(ang) * rad * 0.9;
      const bl = ss(0, 0.25, k); AL.x = lerp(AL.sx * 2.5, ax, bl); AL.z = lerp(7.4, az, bl); AL.y = ss(0, 0.9, k) * 9 + Math.sin(k * 20) * 0.2;
      alc.rotation.set(Math.sin(AL.t * 3) * 0.6, AL.t * (3 + k * 5), Math.sin(AL.t * 4.3) * 1.0 * bl);
      if (!AL.said || (AL.said === 1 && AL.t > 1.2)) { AL.said = AL.said === 1 ? 2 : 1; say(() => V.set(AL.x, AL.y, AL.z), AL.said === 2 ? pick(['¡Socorroooo!', '¡Esto es ilegal!', '¡Mi paraguas!']) : '', 1500, 2.6, 'alc'); }
      if (AL.t > 6.5 || AL.fling > 0.5 && AL.t > 3) { AL.ph = 3; AL.t = 0; AL.fling = 0; AL.x0 = AL.x; AL.y0 = AL.y; AL.z0 = AL.z; }
    } else { alc.visible = true; // lanzado lejos
      const k = AL.t / 1.6; AL.x = AL.x0 + AL.sx * 22 * k; AL.y = AL.y0 + 6 * k - 8 * k * k; AL.z = AL.z0 - 6 * k; alc.rotation.set(AL.t * 6, AL.t * 8, AL.t * 5); if (AL.t > 1.6) { AL.ph = 0; AL.wait = 7 + rnd() * 5; alc.visible = false; confetti(AL.x, 1, AL.z, 10, 3); }
    }
    alc.position.set(AL.x, AL.y, AL.z); alc.scale.setScalar(AL.ph === 1 ? 0.95 : AL.ph === 2 ? lerp(0.95, 1.5, ss(0, 0.5, AL.t / 6.5)) : 1.5);
    if (ud.arms) { for (const [i, a] of ud.arms.entries()) { const s = i === 0 ? -1 : 1; a.rotation.z = -s * (PI - 0.62 + Math.sin(T * 14 + i) * 0.1); a.rotation.x = 0; a.position.y = 1.5; } }
    if (ud.cano) { ud.cano.rotation.z = Math.sin(T * 17) * 0.2; ud.cano.rotation.x = Math.sin(T * 13) * 0.15; ud.cano.position.y = 2.55 + Math.abs(Math.sin(T * 9)) * 0.12; }
  }
  function updateBubbles(dt) {
    for (const b of bubs) {
      if (b.t <= 0) continue; b.t -= dt; if (b.t <= 0) { b.e.classList.remove('on'); b.get = null; continue; }
      if (!b.e.textContent) { b.t = 0; b.e.classList.remove('on'); continue; }
      const p = b.get ? b.get() : null; if (!p) continue; V.copy(p); V.y += b.off; V.project(camera); if (V.z > 1) continue;
      const hwb = (b.e.offsetWidth || 140) / 2 + 8; b.x = clamp((V.x * 0.5 + 0.5) * W, hwb, W - hwb); b.y = clamp((-V.y * 0.5 + 0.5) * H, ins.t + 30, H - ins.b - 10);
      b.e.style.left = b.x + 'px'; b.e.style.top = b.y + 'px';
    }
    // v8: los globos no se pisan — se apilan hacia arriba; si no caben, el más nuevo se esconde
    const on = bubs.filter((q) => q.t > 0 && q.x != null && q.e.textContent).sort((p, q) => q.y - p.y);
    for (let i = 0; i < on.length; i++) for (let j = 0; j < i; j++) {
      const A = on[j], B = on[i], wA = (A.e.offsetWidth || 120) / 2 + (B.e.offsetWidth || 120) / 2 + 6, hh = Math.max(A.e.offsetHeight || 34, B.e.offsetHeight || 34) + 6;
      if (Math.abs(A.x - B.x) < wA && Math.abs(A.y - B.y) < hh) { B.y = A.y - hh; B.e.style.top = B.y + 'px'; if (B.y < ins.t + 10 || B.y > H) { B.t = 0; B.e.classList.remove('on'); B.get = null; } }
    }
  }
  const sparkle = () => {
    const a = rnd() * 6.28, r = 1 + rnd() * 6, y = rnd() * 9; parts.emit({ x: TC.x + Math.cos(a) * r, y, z: TC.z + Math.sin(a) * r * 0.8, vx: Math.cos(a + 1.57) * 2, vy: 1 + rnd(), vz: Math.sin(a + 1.57) * 2, life: 1.3, size: 0.22 + rnd() * 0.2, size1: 0, color: pick([0xffffff, 0xfff0a0, 0xffc4ec, 0xbfe8ff]), shape: 3, g: 0, drag: 0.4 });
  };
  function update(dt) {
    if (!active) return; T += dt; boost += (1 - boost) * Math.min(1, dt * 0.9); kick = Math.max(0, kick - dt * 1.2);
    tornado.setAlpha(1); tornado.update(T, TR * (1 + kick * 0.18), TC.x, 0, TC.z, { x: Math.sin(T * 0.7) * 0.02, z: Math.cos(T * 0.5) * 0.025 }, 1 + Math.sin(T * 2.2) * 0.03);
    for (const m of ringM) { const i = m.userData.i, y = 0.5 + i * (HMAX / (NR - 1)), r = radAt(y) * (1 + kick * 0.12), ph = y * 0.42 - T * 1.7, amp = 0.35 + 0.9 * (y / HMAX);
      m.position.set(TC.x + Math.sin(ph) * amp, y, TC.z + Math.cos(ph) * amp); m.scale.set(r, r, r); m.rotation.set(PI / 2 + Math.sin(T * 2 + i) * 0.09, 0, Math.cos(T * 1.7 + i * 0.7) * 0.09); }
    { const fy = HMAX * 0.3, r = radAt(fy) * (1 + kick * 0.12); face.position.set(TC.x + Math.sin(fy * 0.42 - T * 1.7) * 0.9, fy, TC.z + r * 0.92 + 1.1); face.scale.setScalar(RK / 3.9 * (1 + kick * 0.1)); const bl = (T % 3.4) < 0.12 ? 0.1 : 1; for (const e of eyes) e.scale.y = bl; mouth.scale.set(1 + kick * 0.3, 1 + kick * 1.2 * 0 + (kick > 0.1 ? -0.5 : 0), 1); }
    skyline.update(T); rb.position.y = -2 + Math.sin(T * 0.4) * 0.4; for (const c of clouds) { c.position.x += c.userData.sp * dt; if (c.position.x > 70) c.position.x = -70; }
    updateFlyers(dt); updateActors(dt); updateAlcalde(dt); updateBubbles(dt);
    if (rnd() < dt * 18) sparkle();
    nextSay -= dt; if (nextSay <= 0) { nextSay = 1.4 + rnd() * 1.8; if (rnd() < 0.7) { const a = pick(actors); say(() => V.set(a.x, 0, a.z), a.def && rnd() < 0.45 ? pick(a.def.say) : pick(GENERIC), 1900, 1.8 * a.sc + 0.2); } else { const f = pick(flyers); if (f.popT <= 0 && f.pos.y < 8 && FLY_SAY[f.kind]) say(() => f.pos, pick(FLY_SAY[f.kind]), 1500, f.size * 0.8 + 0.6, 'fly'); } }
    nextConf -= dt; if (nextConf <= 0) { nextConf = 7 + rnd() * 5; for (let i = 0; i < 40; i++) parts.emit({ x: (rnd() - 0.5) * 12, y: 9 + rnd() * 3, z: rnd() * 8, vx: (rnd() - 0.5) * 2, vy: -1 - rnd() * 2, vz: 0, life: 4, size: 0.34, color: pick(CONF), shape: 1, g: 0.4, drag: 1.2 }); }
    nextShuffle -= dt; if (nextShuffle <= 0) { nextShuffle = 11 + rnd() * 6; for (const [c, f] of pairs) { const A = actors[c], B = actors[f]; if (rnd() < 0.5) { const t = A.chase; A.chase = null; B.chase = A; } } }
    parts.update(dt);
  }
  function render(renderer) { renderer.render(scene, camera); }
  function setActive(on, id) { if (on && !flyers.length) buildFlyers(); if (on && !actors.length) buildActors(); if (on && id) setStar(id); if (!on) { for (const b of bubs) { b.t = 0; b.get = null; b.e.classList.remove('on'); } popHost.textContent = ''; } active = on; }
  function setStar(id) { starId = id; if (!actors.length) return; const cur = actors.findIndex((a) => a.id === id); if (cur === 0) return; const a0 = actors[0]; if (cur > 0) { const old = a0.id; assign(a0, id); assign(actors[cur], old); } else assign(a0, id); }
  function theme(th) { tornado.theme(th); }
  function reshuffle() { buildActors(); }
  return { scene, camera, resize, setInsets, update, render, tap, air, setActive, setStar, theme, reshuffle, say, get active() { return active; }, flyers, actors, alc, AL, buildFlyers, parts };
}
