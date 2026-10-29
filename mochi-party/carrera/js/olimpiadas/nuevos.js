// ======================================================================
//  MOCHI PARTY · OLIMPIADAS — mecánicas nuevas (revisión 2): cada una distinta
//  circuito (karts / trineo) · golf · laberinto · tirachinas · bolos · hockey · pesca · memoria ·
//  rebanar · torre · pintar · fútbol · globo · cazamariposas · equilibrio
// ======================================================================
import { THREE, camera, toon, outline, mesh, glowSprite, makeRunner, rnd, clamp, lerp, pick, Audio, OUCH } from '../core3d.js?v=o40';
import { buildWorld, prop, arch, MUNDOS, SPH, SPHL, CYL, BOX, TOR, textTex } from './mundos.js?v=o40';
import { espacioReal, asfaltoTex } from './espacio-real.js?v=o40';
import { mergedGeo, instSet } from './decor.js?v=o40';
import { chiles } from './chiles.js?v=o40';
import { globo } from './globo.js?v=o40';
import { futbolExtra } from './futbol-extra.js?v=o40';
import { addFace, setExpr, faceTick, particles, dropBounce, desertoExtra } from './tira-extra.js?v=o40';
import { T, GL, v3, $, sk, info, setButtons, racers, squash, stickDir, say, hitFx, scoreFinish, base, arena, arenaCam, moveRacer, separate, poseArena, initArenaRacers } from './tipos.js?v=o40';

const VCM = () => toon('#ffffff', { vc: true, rim: .35 });
const pm = (kind, parent, pos, s = 1) => { const m = new THREE.Mesh(mergedGeo(kind), VCM()); if (pos) m.position.set(...pos); m.scale.setScalar(s); if (parent) parent.add(m); return m; };
const held = (E, k) => !!(E.input.held && E.input.held[k]);
// dirección izquierda/derecha mantenida: botones ⬅ ➡, teclado o arrastre horizontal
function steer(E) { const K = window.__keys || {}; let x = (held(E, 'R') || K.ArrowRight || K.KeyD ? 1 : 0) - (held(E, 'L') || K.ArrowLeft || K.KeyA ? 1 : 0); const I = E.input; if (!x && I.down && I.px != null) { const dx = I.px - I.sx; if (Math.abs(dx) > 12) x = clamp(dx / 60, -1, 1); } return x; }
const tapped = E => E.taps.length > 0 || E.side.length > 0 || E.swipe;
function board(E, fmt) { info(E.racers.slice().sort((a, b) => b.score - a.score).slice(0, 3).map(r => `${r.me ? '<u>Tú</u>' : r.ch.name}: ${fmt ? fmt(r) : r.score}`).join('<br>')); }
const port = () => innerHeight > innerWidth;
function scoreEnd(E, fmtLabel) { for (const r of E.racers) r.label = fmtLabel(r); scoreFinish(E, 'score'); }
function camTo(E, dt, pos, look, fov, k = 3) { E._cp = E._cp || pos.clone(); E._cl = E._cl || look.clone(); E._cp.lerp(pos, Math.min(1, dt * k)); E._cl.lerp(look, Math.min(1, dt * k)); camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(E._cp); camera.lookAt(E._cl); }

// =====================================================================
//  CIRCUITO — karts por el anillo de Saturno / trineos en la nieve. Dirección con ⬅ ➡ mantenidos.
// =====================================================================
const PW = { cohete: ['🚀', '¡Cohete propulsor! 🚀', 'boost'], tele: ['🌀', '¡Teletransporte! 🌀', 'magnet'], agujero: ['🕳️', '¡Agujero negro! 🕳️', 'thunder'], gigante: ['🦖', '¡Modo gigante! Aplasta 🦖', 'grow'],
  encoger: ['🤏', '¡Encoge-rivales! 🤏', 'shrink'], meteoros: ['☄️', '¡Lluvia de meteoritos de goma! ☄️', 'throw'], gravedad: ['🙃', '¡Gravedad invertida! 🙃', 'boing'], slime: ['🟢', '¡Pegote de slime! 🟢', 'squash'] };
export function circuito(cfg) {
  const LAPS = cfg.laps || 2, W = cfg.width || 10, A = cfg.A || 42, Bz = cfg.B || 26;
  return base(cfg, { mode: 'tiempo', maxT: cfg.maxT || 120,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: A + 14 } }); setButtons('lr', { L: '⬅', R: '➡' });
      const raw = []; for (let i = 0; i <= 2000; i++) { const a = i / 2000 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); raw.push([A * Math.sign(c) * Math.pow(Math.abs(c), .62), -Bz * Math.sign(s) * Math.pow(Math.abs(s), .62) + Math.sin(a * 3) * 3]); }
      let L = 0; const cum = [0]; for (let i = 1; i < raw.length; i++) cum.push(L += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
      const N = 700, ds = L / N, P = []; let j = 0; for (let i = 0; i < N; i++) { const s = i * ds; while (cum[j + 1] < s) j++; const k = (s - cum[j]) / (cum[j + 1] - cum[j]); P.push([lerp(raw[j][0], raw[j + 1][0], k), lerp(raw[j][1], raw[j + 1][1], k)]); }
      this.L = L; this.P = P; this.ds = ds; this.N = N;
      const pos = [], idx = []; for (let i = 0; i <= N; i++) { const q = this.at(i * ds); pos.push(q.x + q.nx * W / 2, .03, q.z + q.nz * W / 2, q.x - q.nx * W / 2, .03, q.z - q.nz * W / 2); if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      if (cfg.mundo === 'espacio') { const uv = []; for (let i = 0; i <= N; i++) { const v = i * ds / 5; uv.push(0, v, W / 5, v); } g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); const at = asfaltoTex();
        const road = mesh(g, new THREE.MeshStandardMaterial({ map: at, roughnessMap: at, roughness: .75, metalness: .35, color: '#d8d0ff', side: THREE.DoubleSide }), sc); road.receiveShadow = true; }
      else mesh(g, T(cfg.road || '#5a4a8a', { rim: 0, side: THREE.DoubleSide }), sc);
      { const nd = Math.floor(N / 6), dm = new THREE.InstancedMesh(new THREE.BoxGeometry(.25, .02, 1.6), GL(cfg.dash || '#ffffff', .4), nd); const o2 = new THREE.Object3D(); for (let i = 0; i < nd; i++) { const q = this.at(i * 6 * ds); o2.position.set(q.x, .06, q.z); o2.rotation.set(0, Math.atan2(q.tx, q.tz), 0); o2.updateMatrix(); dm.setMatrixAt(i, o2.matrix); } sc.add(dm); }
      const nc = Math.floor(N / 3), cm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, .32, .7), T('#ffffff', { rim: .2 }), nc * 2); const o = new THREE.Object3D(); let c = 0;
      for (let i = 0; i < nc; i++) { const q = this.at(i * 3 * ds); for (const sd of [1, -1]) { o.position.set(q.x + q.nx * (W / 2 + .4) * sd, .16, q.z + q.nz * (W / 2 + .4) * sd); o.rotation.set(0, Math.atan2(q.tx, q.tz), 0); o.updateMatrix(); cm.setMatrixAt(c, o.matrix); cm.setColorAt(c++, new THREE.Color(i % 2 ? (cfg.curb || '#ff6fae') : '#ffffff')); } }
      sc.add(cm);
      const q0 = this.at(0); const gate = arch(sc, 0, W / 2 + .5, '¡META!', '#ff6fae'); gate.position.set(q0.x, 0, q0.z); gate.rotation.y = Math.atan2(q0.tx, q0.tz);
      const inner = []; for (let i = 0; i < 90; i++) { const a = rnd(0, 6.28), k = rnd(0, .6); inner.push({ x: Math.cos(a) * A * k, z: Math.sin(a) * Bz * k, s: rnd(.8, 1.8), ry: rnd(0, 6.28), anim: Math.random() < .4 ? 'sway' : null, ph: rnd(0, 6) }); }
      this.inner = instSet(sc, cfg.innerDeco || MUNDOS[cfg.mundo].deco[0], inner);
      const tribu = []; for (let i = 0; i < 40; i++) { const q = this.at(i / 40 * L); const sd = i % 2 ? 1 : -1; tribu.push({ x: q.x + q.nx * (W / 2 + (cfg.fan === 'ovni' ? 8 : 3)) * sd, z: q.z + q.nz * (W / 2 + (cfg.fan === 'ovni' ? 8 : 3)) * sd, s: .9, ry: Math.atan2(-q.nx * sd, -q.nz * sd), anim: 'hop', sp: 4, amp: .4, ph: rnd(0, 6) }); }
      this.fans = instSet(sc, cfg.fan || 'pinguino', tribu);
      // ---- bordes iluminados (cinta brillante a cada lado de la pista)
      for (const sd of [1, -1]) { const ep = [], ei = []; for (let i = 0; i <= N; i++) { const q = this.at(i * ds), o1 = W / 2 - .05, o2 = W / 2 - .35; ep.push(q.x + q.nx * o1 * sd, .045, q.z + q.nz * o1 * sd, q.x + q.nx * o2 * sd, .045, q.z + q.nz * o2 * sd); if (i < N) ei.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
        const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3)); eg.setIndex(ei); const em = new THREE.MeshBasicMaterial({ color: sd > 0 ? '#ff5ad8' : '#5ae8ff', side: THREE.DoubleSide }); mesh(eg, em, sc); (this.edges = this.edges || []).push(em); }
      // ---- arcos de neón sobre la pista
      this.arcs = []; for (let k = 1; k < 7; k++) { const q = this.at(k / 7 * L + 6), g = new THREE.Group(), c = ['#ff5ad8', '#5ae8ff', '#ffe27a', '#8a7aff'][k % 4];
        const am = new THREE.MeshBasicMaterial({ color: c }); mesh(new THREE.TorusGeometry(W / 2 + 2, .16, 8, 32, Math.PI), am, g); mesh(new THREE.TorusGeometry(W / 2 + 2, .45, 8, 32, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .18, depthWrite: false }), g);
        g.position.set(q.x, 0, q.z); g.rotation.y = Math.atan2(q.tx, q.tz); sc.add(g); this.arcs.push(am); }
      // ---- gradas con público alienígena que salta
      const al = [], seatM = T('#3a2a70', { rim: .2 }); this.stands = [];
      for (let k = 0; k < 6; k++) { const q = this.at((k + .5) / 6 * L), sd = k % 2 ? 1 : -1, off = W / 2 + 4.5, gx = q.x + q.nx * off * sd, gz = q.z + q.nz * off * sd, ry = Math.atan2(q.tx, q.tz), g = new THREE.Group(); g.position.set(gx, 0, gz); g.rotation.y = ry; sc.add(g);
        for (let row = 0; row < 3; row++) { mesh(new THREE.BoxGeometry(9, .5 + row * .7, 1.1), seatM, g, [0, (.5 + row * .7) / 2, sd * row * 1.1]); for (let i = 0; i < 6; i++) { const lx = -3.8 + i * 1.5 + rnd(-.2, .2); const v = new THREE.Vector3(lx, .5 + row * .7, sd * row * 1.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); al.push({ x: gx + v.x, y: v.y, z: gz + v.z, ph: rnd(0, 6), c: pick(['#7ee36a', '#5ae8ff', '#c9a2ff', '#ff9cf0', '#ffe27a']) }); } }
        mesh(new THREE.BoxGeometry(9.4, .12, .2), new THREE.MeshBasicMaterial({ color: sd > 0 ? '#ff5ad8' : '#5ae8ff' }), g, [0, .55, -sd * .6]); }
      { const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.32, 12, 10), toon('#ffffff', { rim: .5 }), al.length), em = new THREE.InstancedMesh(new THREE.SphereGeometry(.11, 8, 6), new THREE.MeshBasicMaterial({ color: '#1a1030' }), al.length * 2), am2 = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffe27a' }), al.length);
        al.forEach((a, i) => bm.setColorAt(i, new THREE.Color(a.c))); [bm, em, am2].forEach(m => { m.frustumCulled = false; sc.add(m); }); this.aliens = { al, bm, em, am2, o: new THREE.Object3D() }; }
      // ---- banderines entre postes y pantallas gigantes
      const fl = []; for (let i = 0; i < 70; i++) { const q = this.at(i / 70 * L), sd = i % 2 ? 1 : -1, off = W / 2 + 1.5; fl.push({ x: q.x + q.nx * off * sd, z: q.z + q.nz * off * sd, ry: Math.atan2(q.tx, q.tz), c: ['#ff5ad8', '#ffe27a', '#5ae8ff', '#7ee36a'][i % 4], ph: i }); }
      { const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(.05, .05, 2.4, 5), T('#e8e4ff'), fl.length), fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -.5, 0, 0, -.25, .7], 3)); fgeo.computeVertexNormals();
        const fm = new THREE.InstancedMesh(fgeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), fl.length), o = new THREE.Object3D();
        fl.forEach((f, i) => { o.position.set(f.x, 1.2, f.z); o.rotation.set(0, f.ry, 0); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); fm.setColorAt(i, new THREE.Color(f.c)); }); [pm, fm].forEach(m => { m.frustumCulled = false; sc.add(m); }); this.flags = { fl, fm, o }; }
      this.screens = []; for (const k of [.18, .68]) { const q = this.at(k * L), sd = -1, off = W / 2 + 12, g = new THREE.Group(); g.position.set(q.x + q.nx * off * sd, 0, q.z + q.nz * off * sd); g.rotation.y = Math.atan2(-q.nx * sd, -q.nz * sd); sc.add(g);
        for (const x of [-4.5, 4.5]) mesh(new THREE.CylinderGeometry(.3, .3, 9, 8), T('#3a2a70'), g, [x, 4.5, 0]);
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; mesh(new THREE.BoxGeometry(11, 5.6, .4), new THREE.MeshBasicMaterial({ color: '#1a1030' }), g, [0, 9.5, -.25]); mesh(new THREE.PlaneGeometry(10.4, 5), new THREE.MeshBasicMaterial({ map: tx, fog: false }), g, [0, 9.5, -.04]); this.screens.push({ cv, tx }); }
      // ---- rampas (todo el ancho) y filas de cajas de potenciadores
      this.ramps = []; for (const k of [.3, .62, .9]) { const s0 = k * L, q = this.at(s0), g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(-1.6, 0); sh.lineTo(1.6, 0); sh.lineTo(1.6, .55); sh.closePath();
        const rg = new THREE.ExtrudeGeometry(sh, { depth: W - .6, bevelEnabled: false }); rg.translate(0, 0, -(W - .6) / 2); const rm = mesh(rg, GL('#ff9a3a', .35), g); rm.rotation.y = -Math.PI / 2; outline(rm, '#7a3a10', 1.02);
        for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(.3, .02, W - 1), new THREE.MeshBasicMaterial({ color: '#ffe27a' }), g, [0, .05 + i * .13, -1.3 + i * .8]);
        g.position.set(q.x, .02, q.z); g.rotation.y = Math.atan2(q.tx, q.tz); /* subida mirando al kart que llega */ sc.add(g); this.ramps.push({ s: s0 }); }
      this.boxes = []; for (const k of [.12, .46, .78]) { const s0 = k * L; for (const d of [-3, 0, 3]) { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: textTex('?', '#8a5ae8', '#ffe27a', 128, 128, 100), transparent: true, opacity: .9 }), g); g.add(glowSprite('#c9a2ff', 2.6, .5)); sc.add(g); this.boxes.push({ s: s0, d, g, off: 0 }); } }
      // láseres que barren un carril (obstáculo dinámico)
      this.lasers = []; for (const k of [.38, .84]) { const s0 = k * L, g = new THREE.Group(); mesh(new THREE.BoxGeometry(.18, .18, 3), new THREE.MeshBasicMaterial({ color: '#ff3a5a' }), g, [0, .5, 0]); mesh(new THREE.BoxGeometry(.5, .5, 3.2), new THREE.MeshBasicMaterial({ color: '#ff3a5a', transparent: true, opacity: .25, depthWrite: false }), g, [0, .5, 0]); for (const z of [-1.6, 1.6]) mesh(new THREE.CylinderGeometry(.2, .25, 1, 8), T('#e8e4ff'), g, [0, .5, z]); sc.add(g); this.lasers.push({ s: s0, d: 0, g, ph: rnd(0, 6) }); }
      this.fwT = 1.5;
      this.obs = []; this.pads = [];
      for (let s = 40; s < L - 15; s += rnd(16, 24)) { const d = pick([-3, 0, 3]) + rnd(-.6, .6); const m = prop(pick(cfg.obs)); m.scale.multiplyScalar(cfg.os || .8); sc.add(m); this.obs.push({ s, d, d0: d, m, mv: Math.random() < .35 ? rnd(.8, 1.6) : 0, ph: rnd(0, 6) }); }
      for (let s = 30; s < L - 10; s += rnd(30, 45)) { const d = pick([-3, 3]); const q = this.at(s); const m = mesh(new THREE.PlaneGeometry(2.4, 3.2), GL(cfg.pad || '#7ee3c4', .8), sc, [q.x + q.nx * d, .07, q.z + q.nz * d]); m.rotation.set(-Math.PI / 2, 0, Math.atan2(q.tx, q.tz) + Math.PI); this.pads.push({ s, d, m }); }
      racers(E, .5); E.racers.forEach((r, k) => {
        r.s = -2 - Math.floor(k / 3) * 2.6; r.d = ((k % 3) - 1) * 3; r.dv = 0; r.v = 0; r.stun = 0; r.boost = 0; r.lap = 1;
        const veh = new THREE.Group(); r.obj.add(veh); r.obj.userData.pivot.position.y = cfg.sled ? .42 : .5;
        if (cfg.sled) { mesh(new THREE.BoxGeometry(1.1, .2, 1.7), T(r.ch.color), veh, [0, .32, 0]); for (const sx of [-.45, .45]) mesh(new THREE.BoxGeometry(.1, .1, 2.1), T('#a8784a'), veh, [sx, .1, .1]); }
        else { outline(mesh(new THREE.BoxGeometry(1.2, .35, 1.8), T(r.ch.color), veh, [0, .35, 0]), '#3a2050', 1.04); mesh(new THREE.BoxGeometry(1, .25, .5), T('#ffffff'), veh, [0, .45, .85]); for (const [x, z] of [[-.62, .6], [.62, .6], [-.62, -.6], [.62, -.6]]) mesh(new THREE.CylinderGeometry(.26, .26, .2, 12), T('#2a1838'), veh, [x, .26, z], [0, 0, Math.PI / 2]); }
        r.veh = veh; veh.traverse(o => { if (o.isMesh) o.castShadow = true; });
        const ps = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false })); ps.scale.setScalar(1.4); ps.position.y = 3.1; ps.visible = false; r.obj.add(ps); r.pwS = ps; });
      this.fx = []; this.pwTex = {}; for (const k in PW) this.pwTex[k] = textTex(PW[k][0], 'rgba(0,0,0,0)', '#ffffff', 128, 128, 96);
      { const old = document.getElementById('pwIco'); if (old) old.remove(); const d = document.createElement('div'); d.id = 'pwIco'; d.style.cssText = 'position:fixed;left:50%;top:92px;transform:translateX(-50%) scale(0);width:84px;height:84px;border-radius:50%;background:radial-gradient(circle,#fff8 0,#8a5ae8cc 60%,#3a1a7acc 100%);border:4px solid #ffe27a;box-shadow:0 0 24px #c9a2ff;display:flex;align-items:center;justify-content:center;font-size:48px;z-index:40;pointer-events:none;transition:transform .25s cubic-bezier(.3,1.8,.5,1),opacity .4s'; document.body.appendChild(d); this.ico = d; }
      if (cfg.mundo === 'espacio') this.real = espacioReal(E, { oldSky: this.W.sky, W: this.W });
    },
    dispose() { const d = document.getElementById('pwIco'); if (d) d.remove(); const p = document.getElementById('perf'); if (p) p.remove(); },
    dS(a, b) { const L = this.L; return ((a - b) % L + L * 1.5) % L - L * .5; },
    rank(E, r) { return E.racers.filter(o => o.s > r.s).length; },
    pickPw(E, r) { const k = this.rank(E, r), n = E.racers.length; const pool = k <= 1 ? ['slime', 'slime', 'gigante', 'encoger', 'cohete', 'meteoros'] : k >= n - 2 ? ['tele', 'agujero', 'meteoros', 'cohete', 'gravedad', 'encoger', 'gigante'] : Object.keys(PW); return pick(pool); },
    /* golpe a un rival por un potenciador: escudo/estrella/gigante protegen */
    hitR(E, r, how, by) { if (r.shield > 0 || r.star > 0 || (r.giant > 0 && how !== 'hole')) { r.shield = 0; return false; }
      if (how === 'squash') { r.squashT = .9; r.stun = Math.max(r.stun, .8); r.v *= .4; hitFx(E, r, '#ffe27a'); if (r.me || by.me) Audio.sfxPlay('squash'); if (r.me) E.ui.toast('¡Te han aplastado! 🫓', '#ff9cb0'); }
      else { r.stun = Math.max(r.stun, how === 'slime' ? .9 : .7); r.v *= how === 'meteor' ? .5 : .45; if (how === 'meteor') r.vy = 5, r.y = Math.max(r.y || 0, .05); if (how === 'slime') r.spin = .9; hitFx(E, r, how === 'slime' ? '#7ee36a' : how === 'meteor' ? '#ff9cf0' : '#8a5ae8');
        if (r.me) { Audio.sfxPlay(how === 'slime' ? 'squash' : 'bump'); E.ui.toast(how === 'slime' ? '¡Pegote de slime! 🟢' : how === 'meteor' ? '¡Meteorito de goma! ☄️' : '¡Absorbido! 🕳️', '#ff9cb0'); } else if (by && by.me) Audio.sfxPlay('pop'); }
      return true; },
    usePw(E, r, k) { const sc = E.scene, rv = E.racers.filter(o => o !== r), pos = r.obj.position.clone();
      r.pwS.material.map = this.pwTex[k]; r.pwS.material.needsUpdate = true; r.pwS.visible = !r.me; r.pwT = 1.4; r.expr = 'happy';
      if (r.me) { this.ico.textContent = PW[k][0]; this.ico.style.transform = 'translateX(-50%) scale(1)'; this.ico.style.opacity = 1; clearTimeout(this.icoT); this.icoT = setTimeout(() => { this.ico.style.transform = 'translateX(-50%) scale(0)'; this.ico.style.opacity = 0; }, 1700); E.ui.toast(PW[k][1], '#ffe27a'); Audio.sfxPlay(PW[k][2]); }
      const near = (a, b) => rv.filter(o => { const d = this.dS(o.s, r.s); return d > a && d < b; });
      if (k === 'cohete') { r.boost = 2.2; r.rocket = 2.2; }
      else if (k === 'tele') { E.burst(pos.clone().add(v3(0, 1, 0)), '#5ae8ff', 24, 5, .6, .5); r.s += 17; r.d = 0; r.lastLs = ((r.s % this.L) + this.L) % this.L; r.teleT = .5; const q = this.at(r.s); E.burst(v3(q.x, 1, q.z), '#5ae8ff', 24, 5, .6, .5); }
      else if (k === 'agujero') { const q = this.at(r.s + 7), m = new THREE.Group(); mesh(new THREE.SphereGeometry(.9, 20, 14), new THREE.MeshBasicMaterial({ color: '#000000' }), m); const ring = mesh(new THREE.TorusGeometry(1.8, .35, 8, 32), new THREE.MeshBasicMaterial({ color: '#b07aff', transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }), m, [0, 0, 0], [Math.PI / 2 - .3, 0, 0]); m.add(glowSprite('#8a5ae8', 6, .7)); m.position.set(q.x + q.nx * r.d, 1.2, q.z + q.nz * r.d); sc.add(m); this.fx.push({ k: 'hole', s: r.s + 7, d: r.d, t: 3, m, ring, by: r, hit: new Set() }); }
      else if (k === 'gigante') { r.giant = 5; }
      else if (k === 'encoger') { for (const o of near(-6, 45)) if (!(o.shield > 0 || o.star > 0)) { o.mini = 4.5; E.burst(o.obj.position.clone().add(v3(0, 1, 0)), '#7ee3ff', 10, 3, .4, .4); if (o.me) { Audio.sfxPlay('shrink'); E.ui.toast('¡Te han encogido! 🤏', '#ff9cb0'); } } }
      else if (k === 'meteoros') { const tg = near(0, 70).sort((a, b) => this.dS(a.s, r.s) - this.dS(b.s, r.s)).slice(0, 3); for (const [i, o] of tg.entries()) { const m = mesh(new THREE.IcosahedronGeometry(.75, 1), T(pick(['#ff9cf0', '#ffb36b', '#c9a2ff']), { rim: .4 }), sc); m.add(glowSprite('#ffb36b', 3, .5)); this.fx.push({ k: 'met', o, t: 1.1 + i * .35, t0: 1.1 + i * .35, m, by: r }); } }
      else if (k === 'gravedad') { for (const o of near(-5, 40)) if (!(o.shield > 0 || o.star > 0 || o.giant > 0)) { o.grav = 2.4; if (o.me) { Audio.sfxPlay('boing'); E.ui.toast('¡Gravedad invertida! 🙃', '#ff9cb0'); } } }
      else if (k === 'slime') { const q = this.at(r.s - 3.5), m = new THREE.Group(); mesh(new THREE.CircleGeometry(1.2, 20), new THREE.MeshStandardMaterial({ color: '#5ae84a', roughness: .15, metalness: .1, emissive: '#1a6a10', transparent: true, opacity: .92 }), m, [0, 0, 0], [-Math.PI / 2, 0, 0]); for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(.3, 10, 8), new THREE.MeshStandardMaterial({ color: '#7ef36a', roughness: .1, emissive: '#1a6a10' }), m, [rnd(-.7, .7), .05, rnd(-.7, .7)], null, [1, .5, 1]); m.position.set(q.x + q.nx * r.d, .07, q.z + q.nz * r.d); sc.add(m); this.fx.push({ k: 'slime', s: r.s - 3.5, d: r.d, t: 14, m, by: r }); }
    },
    updFx(E, dt) { for (const f of this.fx) { f.t -= dt;
        if (f.k === 'hole') { f.ring.rotation.z += dt * 6; const sc2 = Math.min(1, (3 - f.t) * 3, f.t * 3); f.m.scale.setScalar(Math.max(.01, sc2));
          for (const o of E.racers) { if (o === f.by) continue; const ds2 = this.dS(f.s, o.s); if (Math.abs(ds2) < 11) { const pull = (1 - Math.abs(ds2) / 11) * 5 * dt; o.d += Math.sign(f.d - o.d) * Math.min(Math.abs(f.d - o.d), pull); if (Math.abs(ds2) < 1.6 && Math.abs(f.d - o.d) < 1.6 && !f.hit.has(o)) { f.hit.add(o); this.hitR(E, o, 'hole', f.by); } } } }
        else if (f.k === 'met') { const o = f.o, k = 1 - Math.max(0, f.t) / f.t0, p = o.obj.position; f.m.position.set(p.x + (1 - k) * 4, .8 + (1 - k * k) * 16, p.z); f.m.rotation.x += dt * 8; if (f.t <= 0) { E.burst(p.clone().add(v3(0, .5, 0)), '#ff9cf0', 14, 5, .5, .4); if (Math.abs(this.dS(o.s, o.s)) < 1) this.hitR(E, o, 'meteor', f.by); } }
        else if (f.k === 'slime') { for (const o of E.racers) { if (o === f.by && f.t > 12.5) continue; if (Math.abs(this.dS(f.s, o.s)) < 1.2 && Math.abs(f.d - o.d) < 1.4 && !(o.y > .4)) { if (this.hitR(E, o, 'slime', f.by) || true) { f.t = 0; E.burst(f.m.position.clone().add(v3(0, .4, 0)), '#7ee36a', 16, 4, .5, .4); } break; } } } }
      for (const f of this.fx) if (f.t <= 0 && f.m) { E.scene.remove(f.m); f.m.traverse(o => { if (o.geometry) o.geometry.dispose(); }); f.m = null; }
      this.fx = this.fx.filter(f => f.m); },
    at(s) { const N = this.N, f = ((s / this.ds) % N + N) % N, i = Math.floor(f), k = f - i, a = this.P[i], b = this.P[(i + 1) % N]; const x = lerp(a[0], b[0], k), z = lerp(a[1], b[1], k); let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; return { x, z, tx, tz, nx: tz, nz: -tx }; },
    update(E, dt) {
      const VM = cfg.v || 15, LT = LAPS * this.L, t = E.t;
      for (const o of this.obs) if (o.mv) o.d = o.d0 + Math.sin(t * o.mv + o.ph) * 2.8;
      for (const l of this.lasers) l.d = Math.sin(t * .9 + l.ph) * (W / 2 - 1.8);
      for (const b of this.boxes) if (b.off > 0) b.off -= dt;
      for (const r of E.racers) {
        if (r.fin) { r.v = Math.max(4, r.v - 6 * dt); r.s += r.v * dt; continue; }
        let st = 0;
        if (r.me && !E.AUTO) st = -steer(E); /* d>0 = izquierda del piloto */
        else { const sk0 = sk(E, r), ls0 = ((r.s % this.L) + this.L) % this.L;
          if (!r.tgt && r.tgt !== 0 || (r.rt -= dt) <= 0) { r.rt = .35 - sk0 * .15; const ahead = this.obs.concat(this.fx.filter(f => f.k === 'slime').map(f => ({ s: ((f.s % this.L) + this.L) % this.L, d: f.d }))).filter(o => { const ds = o.s - ls0; return ds > 0 && ds < 9 + sk0 * 8; });
            const lanes = [-3.2, 0, 3.2].filter(l => !ahead.some(o => Math.abs(o.d - l) < 1.8)); const pad = this.pads.find(p => { const ds = p.s - ls0; return ds > 2 && ds < 16; }) || this.boxes.find(b => { const ds = b.s - ls0; return b.off <= 0 && ds > 2 && ds < 14; });
            r.tgt = pad && Math.random() < sk0 * .7 ? pad.d : (lanes.length ? lanes.reduce((a, b) => Math.abs(b - r.d) < Math.abs(a - r.d) ? b : a) : r.d); if (Math.random() > .6 + sk0 * .45) r.tgt += rnd(-2.5, 2.5); }
          st = clamp((r.tgt - r.d) * 1.2, -1, 1); }
        r.dv = lerp(r.dv, st * (cfg.sled ? 6.5 : 7.5), Math.min(1, dt * (cfg.sled ? 3.5 : 8))); r.d = clamp(r.d + r.dv * dt, -W / 2 + .7, W / 2 - .7);
        const edge = Math.abs(r.d) > W / 2 - 1.1; const vmax = (VM * (r.me ? 1 : .86 + .13 * r.skill)) * (edge ? .7 : 1) + (r.boost > 0 ? 7 : 0) + (r.star > 0 ? 2 : 0) + (r.giant > 0 ? 1 : 0); const vm2 = vmax * (r.mini > 0 ? .8 : 1) * (r.grav > 0 ? .7 : 1);
        if (r.stun > 0) { r.stun -= dt; r.v = Math.max(2, r.v - 20 * dt); if (r.stun <= 0) r.expr = ''; } else r.v = lerp(r.v, vm2, Math.min(1, dt * (r.v < vm2 ? .9 : 3)));
        if (r.boost > 0 && (r.boost -= dt) <= 0) r.expr = '';
        r.s += r.v * dt;
        const ls = ((r.s % this.L) + this.L) % this.L;
        for (const o of this.obs) if (Math.abs(o.s - ls) < 1.1 && Math.abs(o.d - r.d) < 1.3) { if (r.shield > 0 || r.star > 0 || r.giant > 0) { if (!o.hitT || t - o.hitT > 1) { o.hitT = t; E.burst(r.obj.position.clone().add(v3(0, 1, 0)), '#ffe27a', 12, 4, .5, .4); if (r.me) Audio.sfxPlay('bump'); } r.shield = 0; } else if (r.stun <= 0 && !(r.y > .6)) { r.stun = .9; hitFx(E, r, cfg.boom || '#bfe8ff'); r.v *= .35; } r.d += Math.sign(r.d - o.d || 1) * 3 * dt; } /* empuje: nadie atraviesa los obstáculos */
        for (const l of this.lasers) if (Math.abs(l.s - ls) < .6 && Math.abs(l.d - r.d) < 1.7 && r.stun <= 0 && !(r.y > .6) && !(r.star > 0)) { r.stun = .7; hitFx(E, r, '#ff3a5a'); r.v *= .5; if (r.me) E.ui.toast('¡Láser! ⚡', '#ff9cb0'); }
        if (r.grav > 0) { r.grav -= dt; r.y = lerp(r.y || 0, 2.1, Math.min(1, dt * 4)); r.vy = 0; if (r.grav <= 0) r.vy = .1; } else
        for (const rp of this.ramps) { const u = (ls - (rp.s - 1.6)) / 3.2; if (u > 0 && u < 1 && !(r.vy > 0)) { r.y = Math.max(r.y || 0, .57 * u); r.vy = 0; } }
        for (const rp of this.ramps) if (r.lastLs != null && r.lastLs < rp.s + 1.6 && ls >= rp.s + 1.6 && !(r.vy > 0) && !(r.grav > 0) && Math.abs(this.dS(ls, rp.s)) < 4) { r.vy = 4.2 + r.v * .12; r.y = .55; if (r.me) { Audio.sfxPlay('jump'); E.ui.toast('¡Saltooo! 🛸', '#ffe27a'); } }
        if (!(r.grav > 0) && (r.y > 0 || r.vy > 0) && !this.ramps.some(rp => { const u = (ls - (rp.s - 1.6)) / 3.2; return u > 0 && u < 1 && !(r.vy > 0); })) { r.vy = r.vy || 0; r.vy -= 18 * dt; r.y = Math.max(0, (r.y || 0) + r.vy * dt); if (r.y === 0) { r.vy = 0; r.land = .25; E.burst(r.obj.position.clone().add(v3(0, .2, 0)), '#c9b2ff', r.me ? 10 : 4, 3, .4, .3); if (r.me) { Audio.sfxPlay('land'); E.shake = .15; } } }
        for (const b of this.boxes) if (b.off <= 0 && Math.abs(b.s - ls) < 1 && Math.abs(b.d - r.d) < 1.2) { b.off = 4; E.burst(b.g.position.clone(), '#c9a2ff', 14, 4, .5, .4); this.usePw(E, r, this.pickPw(E, r)); }
        if (r.shield > 0) r.shield -= dt; if (r.star > 0) r.star -= dt; if (r.giant > 0) r.giant -= dt; if (r.mini > 0) r.mini -= dt; if (r.pwT > 0 && (r.pwT -= dt) <= 0) r.pwS.visible = false;
        r.lastLs = ls;
        for (const p of this.pads) if (Math.abs(p.s - ls) < 1.5 && Math.abs(p.d - r.d) < 1.3 && r.boost <= 0) { r.boost = 1.4; r.expr = 'happy'; if (r.me) { Audio.sfxPlay('boost'); E.ui.toast('¡Turbo! 🚀'); } }
        r.prog = clamp(r.s / LT, 0, 1); r.lap = Math.min(LAPS, Math.floor(Math.max(0, r.s) / this.L) + 1);
        if (r.s >= LT) E.finish(r);
      }
      const rs = E.racers; for (let i = 0; i < rs.length; i++) for (let k = i + 1; k < rs.length; k++) { const a = rs[i], b = rs[k]; if (Math.abs(a.s - b.s) < 2 && Math.abs(a.d - b.d) < 1.35 && Math.abs((a.y || 0) - (b.y || 0)) < .8) { const p = (1.35 - Math.abs(a.d - b.d)) / 2 * Math.sign(a.d - b.d || 1); a.d = clamp(a.d + p, -W / 2 + .7, W / 2 - .7); b.d = clamp(b.d - p, -W / 2 + .7, W / 2 - .7); const back = a.s < b.s ? a : b; back.s -= (2 - Math.abs(a.s - b.s)) * .25; if (back.v > 4) back.v *= .97; } }
      this.updFx(E, dt);
      for (const a of rs) if (a.giant > 0) for (const b of rs) if (b !== a && !(b.giant > 0) && !(b.squashT > 0) && Math.abs(this.dS(a.s, b.s)) < 2.2 && Math.abs(a.d - b.d) < 2) this.hitR(E, b, 'squash', a);
      info(`🏁 Vuelta ${E.me.lap}/${LAPS}`);
    },
    render(E, dt) {
      const t = E.t; this.W.tick(dt, camera); this.inner.tick(t + 1); this.fans.tick(t);
      for (const o of this.obs) { const q = this.at(o.s); o.m.position.set(q.x + q.nx * o.d, Math.abs(Math.sin(t * 3 + o.ph)) * .25, q.z + q.nz * o.d); o.m.rotation.y = t * .8 + o.ph; }
      for (const p of this.pads) p.m.material.emissiveIntensity = .6 + Math.sin(t * 8) * .3;
      this.edges.forEach((m, i) => m.color.setHSL(((t * .15 + i * .5) % 1), .9, .62)); this.arcs.forEach((m, i) => m.color.setHSL(((t * .2 + i * .17) % 1), .9, .62));
      for (const l of this.lasers) { const q = this.at(l.s); l.g.position.set(q.x + q.nx * l.d, 0, q.z + q.nz * l.d); l.g.rotation.y = Math.atan2(q.tx, q.tz) + Math.PI / 2; l.g.children[1].material.opacity = .2 + .15 * Math.sin(t * 20); }
      for (const b of this.boxes) { const q = this.at(b.s); b.g.visible = b.off <= 0; b.g.position.set(q.x + q.nx * b.d, .9 + Math.sin(t * 3 + b.d) * .15, q.z + q.nz * b.d); b.g.rotation.set(t * .7, t * 1.3, 0); }
      { const A2 = this.aliens, o = A2.o; A2.al.forEach((a, i) => { const h = Math.abs(Math.sin(t * 5 + a.ph)) * .35; o.position.set(a.x, a.y + .32 + h, a.z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); A2.bm.setMatrixAt(i, o.matrix);
          for (const e of [-1, 1]) { o.position.set(a.x + e * .12, a.y + .42 + h, a.z); o.updateMatrix(); A2.em.setMatrixAt(i * 2 + (e > 0 ? 1 : 0), o.matrix); } o.position.set(a.x, a.y + .78 + h, a.z); o.updateMatrix(); A2.am2.setMatrixAt(i, o.matrix); });
        A2.bm.instanceMatrix.needsUpdate = A2.em.instanceMatrix.needsUpdate = A2.am2.instanceMatrix.needsUpdate = true; }
      { const F = this.flags, o = F.o; F.fl.forEach((f, i) => { o.position.set(f.x, 2.4, f.z); o.rotation.set(0, f.ry + Math.PI / 2 + Math.sin(t * 6 + f.ph) * .35, 0); o.updateMatrix(); F.fm.setMatrixAt(i, o.matrix); }); F.fm.instanceMatrix.needsUpdate = true; }
      if ((this.scT = (this.scT || 0) - dt) <= 0) { this.scT = .25; const ord = [...E.racers].sort((a, b) => b.s - a.s); for (const S of this.screens) { const x = S.cv.getContext('2d'); const gr = x.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, '#3a1a7a'); gr.addColorStop(1, '#1a0a3a'); x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
          x.font = '700 40px Fredoka, sans-serif'; x.fillStyle = `hsl(${(t * 60) % 360},90%,70%)`; x.textAlign = 'center'; x.fillText('🏁 MOCHI GP GALÁCTICO', 256, 52); x.font = '700 30px Fredoka, sans-serif'; x.textAlign = 'left';
          ord.slice(0, 4).forEach((r, i) => { x.fillStyle = r.me ? '#ff9cc8' : '#ffffff'; x.fillText(`${i + 1}º ${r.me ? 'TÚ' : (r.name || r.ch.name)}`, 60, 100 + i * 38); }); S.tx.needsUpdate = true; } }
      if ((this.fwT -= dt) <= 0) { this.fwT = rnd(.8, 1.8); const q = this.at(E.me.s + rnd(15, 40)), sd = pick([-1, 1]); E.burst(v3(q.x + q.nx * (W / 2 + rnd(8, 16)) * sd, rnd(12, 18), q.z + q.nz * (W / 2 + rnd(8, 16)) * sd), pick(['#ff5ad8', '#5ae8ff', '#ffe27a', '#7ee36a']), 26, 7, 1.1, .7, -3); }
      for (const r of E.racers) { const q = this.at(r.s); r.obj.position.set(q.x + q.nx * r.d, r.y || 0, q.z + q.nz * r.d);
        // derrape coherente: el morro apunta hacia dentro de la curva, la cola sale hacia fuera y la carrocería se inclina hacia fuera
        const dv = r.dv || 0; r.obj.rotation.y = Math.atan2(q.tx, q.tz) + dv * .07; r.veh.rotation.z = dv * .035; r.veh.rotation.x = r.y > .05 ? -.15 : 0;
        r.obj.userData.pivot.rotation.z = r.stun > 0 ? Math.sin(t * 20) * .3 : dv * .02;
        { const tgt = r.giant > 0 ? 1.8 : r.mini > 0 ? .55 : 1; r.sc = lerp(r.sc || 1, tgt, Math.min(1, dt * 6)); const tp = r.teleT > 0 ? (r.teleT -= dt, 1 - Math.sin(r.teleT / .5 * Math.PI) * .6) : 1; const sq = r.squashT > 0 ? (r.squashT -= dt, .35) : 1;
          r.obj.scale.set(r.sc * tp, r.sc * sq * tp, r.sc * tp); r.flip = lerp(r.flip || 0, r.grav > 0 ? Math.PI : 0, Math.min(1, dt * 6)); r.obj.rotation.z = r.flip;
          if (r.spin > 0) { r.spin -= dt; r.obj.rotation.y += (1 - r.spin / .9) * Math.PI * 2; }
          if (r.rocket > 0) { r.rocket -= dt; E.burst(r.obj.position.clone().add(v3(-q.tx * 1.3, .5, -q.tz * 1.3)), pick(['#ffb36b', '#ff5a3a', '#ffe27a']), 2, 2, .5, .4, 0); }
          if (r.mini > 0 && Math.random() < .1) E.burst(r.obj.position.clone().add(v3(0, .8, 0)), '#7ee3ff', 1, 1, .3, .3, 0);
          if (r.grav > 0 && Math.random() < .3) E.burst(r.obj.position.clone(), '#c9a2ff', 1, 1, .4, .4, 0); }
        if (Math.abs(dv) > 3.5 && !(r.y > .05) && Math.random() < (r.me ? .9 : .4)) { const out = -Math.sign(dv), w = new THREE.Vector3(out * .62, .15, -.65).applyEuler(r.obj.rotation).add(r.obj.position); E.burst(w, Math.abs(dv) > 6 ? '#ffd27a' : '#e8e4ff', r.me ? 2 : 1, 1.2, .45, .35, -1); }
        if (r.boost > 0 && Math.random() < .7) E.burst(r.obj.position.clone().add(v3(-q.tx * 1.2, .5, -q.tz * 1.2)), cfg.pad || '#7ee3c4', 2, 1, .35, .35, 0);
        if (r.star > 0 && Math.random() < .6) E.burst(r.obj.position.clone().add(v3(rnd(-.5, .5), 1, rnd(-.5, .5))), pick(['#ffe27a', '#ff9cf0', '#7ee3ff']), 1, 1.5, .4, .4, 0);
        if (r.shield > 0) { if (!r.shM) { r.shM = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: '#7ee3ff', transparent: true, opacity: .22, depthWrite: false })); r.shM.position.y = .9; r.obj.add(r.shM); } r.shM.visible = true; r.shM.scale.setScalar(1 + Math.sin(t * 6) * .04); } else if (r.shM) r.shM.visible = false; }
      if (this.real) this.real.tick(camera, E.me.obj.position, t);
      const me = E.me, q = this.at(me.s), p = port(), back = p ? 8.5 : 7, up = p ? 4.6 : 3.4, la = this.at(me.s + 7);
      this.fk = lerp(this.fk || 0, me.boost > 0 || me.star > 0 ? 1 : 0, Math.min(1, dt * 4)); camTo(E, dt, v3(q.x + q.nx * me.d * .6 - q.tx * (back - this.fk + ((me.sc || 1) - 1) * 4), up + (me.y || 0) * .5 + ((me.sc || 1) - 1) * 1.5, q.z + q.nz * me.d * .6 - q.tz * (back - this.fk + ((me.sc || 1) - 1) * 4)), v3(la.x + la.nx * me.d * .5, .8 + (me.y || 0) * .4, la.z + la.nz * me.d * .5), (p ? 72 : 60) + this.fk * 12, 6);
    },
  });
}

// =====================================================================
//  GOLF LUNAR — la flecha oscila: toca para fijar la dirección y toca otra vez para la fuerza. 3 hoyos.
// =====================================================================
export function golf(cfg) {
  const R = 15, K = .9, VMAX = 27;
  const HOLES = [{ tee: [0, 11], hole: [0, -10], bump: [[0, 0, 1.6], [-4, -5, 1], [4, -5, 1]] }, { tee: [-10, 8], hole: [9, -6], bump: [[0, 1, 1.4], [4, 4, 1], [-3, -5, 1.2]] }, { tee: [9, 10], hole: [-8, -9], bump: [[0, 0, 1], [3, -3, 1], [-3, 3, 1], [-5, -3, 1]] }];
  return base(cfg, { mode: 'puntos', timeUp(E) { if (!this.done) { this.done = true; scoreEnd(E, r => r.strokes + ' golpes'); } }, maxT: cfg.maxT || 150,
    init(E) {
      const sc = E.scene; this.A = arena(E, cfg, R, cfg.green || '#8a7ad8'); setButtons('m', { M: '⛳' });
      this.flag = new THREE.Group(); sc.add(this.flag); mesh(new THREE.CircleGeometry(.55, 24), new THREE.MeshBasicMaterial({ color: '#1a0a2a' }), this.flag, [0, .04, 0], [-Math.PI / 2, 0, 0]); mesh(CYL(), T('#ffffff'), this.flag, [0, 1.6, 0], null, [.05, 3.2, .05]); mesh(new THREE.PlaneGeometry(1.2, .8), T('#ff6fae', { side: THREE.DoubleSide }), this.flag, [.6, 2.8, 0]); const gs = glowSprite('#ffe27a', 3, .5); gs.position.set(0, 3.2, 0); this.flag.add(gs);
      this.bumps = []; this.hole = 0;
      this.arrow = new THREE.Group(); sc.add(this.arrow); mesh(new THREE.BoxGeometry(.18, .06, 1), GL('#7ee3a4', .6), this.arrow, [0, .1, .5]); mesh(new THREE.ConeGeometry(.3, .6, 12), GL('#7ee3a4', .6), this.arrow, [0, .1, 1.2], [Math.PI / 2, 0, 0]);
      racers(E, .5); E.racers.forEach(r => { r.ball = mesh(SPH(), T(r.ch.color, { rim: .6 }), sc, null, null, .28); outline(r.ball, '#3a2050', 1.12); r.strokes = 0; r.score = 0; });
      this.setHole(E, 0);
    },
    setHole(E, h) { this.inT = null;
      this.hole = h; const H = HOLES[h]; this.flag.position.set(H.hole[0], 0, H.hole[1]);
      for (const b of this.bumps) E.scene.remove(b.m); this.bumps = H.bump.map(([x, z, s]) => { const m = prop('meteoro'); m.position.set(x, s * .8, z); m.scale.setScalar(s); E.scene.add(m); return { x, z, r: s * .95, m }; });
      E.racers.forEach((r, k) => { r.bx = H.tee[0] + (k - 2.5) * .7; r.bz = H.tee[1]; r.bvx = r.bvz = 0; r.st = 'aim'; r.hs = 0; r.ph = rnd(0, 6); r.wait = rnd(.4, 1.2); r.cx = r.bx; r.cz = r.bz + .8; r.sink = 0; r.ang = null; });
      this.next = 0; if (h) E.ui.toast(`⛳ Hoyo ${h + 1}/3`);
    },
    update(E, dt) {
      const H = HOLES[this.hole], hx = H.hole[0], hz = H.hole[1], t = E.t;
      for (const r of E.racers) {
        const d = Math.hypot(hx - r.bx, hz - r.bz), th0 = Math.atan2(hx - r.bx, hz - r.bz);
        const me = r.me && !E.AUTO, s0 = sk(E, r);
        if (r.st === 'aim') { r.ang = th0 + Math.sin((t + r.ph) * 1.7) * 1.1;
          if (me) { if (tapped(E)) { r.st = 'pow'; r.pt = 0; Audio.sfxPlay('click'); } }
          else { if (r.err == null) r.err = rnd(-1, 1) * (1.15 - s0) * .22; if ((r.wait -= dt) < 0 && Math.abs(r.ang - th0 - r.err) < .06) { r.st = 'pow'; r.pt = 0; r.err = null; r.wait = rnd(.2, .6); } } }
        else if (r.st === 'pow') { r.pt += dt; r.pow = (1 - Math.cos(r.pt * 2.6)) / 2;
          const ideal = clamp(K * (d + .9) / VMAX, .05, 1);
          let shoot = false; if (me) shoot = tapped(E); else { if (r.perr == null) r.perr = rnd(-1, 1) * (1.15 - s0) * .14; shoot = (r.wait -= dt) < 0 && Math.abs(r.pow - ideal - r.perr) < .03 && r.pt > .3; }
          if (shoot) { const v = r.pow * VMAX; r.bvx = Math.sin(r.ang) * v; r.bvz = Math.cos(r.ang) * v; r.st = 'roll'; r.strokes++; r.hs++; r.perr = null; if (r.me) Audio.sfxPlay('kick'); } }
        else if (r.st === 'roll') {
          const sp0 = Math.hypot(r.bvx, r.bvz), f = Math.exp(-K * dt * (sp0 < 3 ? 2.2 : 1)); r.bvx *= f; r.bvz *= f; r.bx += r.bvx * dt; r.bz += r.bvz * dt;
          for (const b of this.bumps) { const dx = r.bx - b.x, dz = r.bz - b.z, dd = Math.hypot(dx, dz); if (dd < b.r + .28) { const nx = dx / dd, nz = dz / dd, vn = r.bvx * nx + r.bvz * nz; if (vn < 0) { r.bvx -= 2 * vn * nx * .9; r.bvz -= 2 * vn * nz * .9; if (r.me) Audio.sfxPlay('boing'); } r.bx = b.x + nx * (b.r + .29); r.bz = b.z + nz * (b.r + .29); } }
          const rr = Math.hypot(r.bx, r.bz); if (rr > R - .5) { const nx = r.bx / rr, nz = r.bz / rr, vn = r.bvx * nx + r.bvz * nz; if (vn > 0) { r.bvx -= 2 * vn * nx * .8; r.bvz -= 2 * vn * nz * .8; } r.bx = nx * (R - .5); r.bz = nz * (R - .5); }
          const dh = Math.hypot(hx - r.bx, hz - r.bz), sp = Math.hypot(r.bvx, r.bvz);
          if (dh < .5 && sp < 8) { r.st = 'in'; r.sink = 0; r.expr = 'happy'; E.burst(v3(hx, .5, hz), r.ch.color, 20, 4, .7, .5); if (r.me) { Audio.sfxPlay('got'); E.ui.toast(r.hs === 1 ? '¡HOYO EN UNO! 🌟' : `¡Dentro! (${r.hs} golpes)`); } else say(E, r, '¡Dentro!'); }
          else if (sp < .25) { if (r.hs >= 6) { r.st = 'in'; r.strokes++; r.bx = hx; r.bz = hz; if (r.me) E.ui.toast('Máximo de golpes: +1'); } else { r.st = 'aim'; r.wait = rnd(.3, .9); } }
        } else if (r.st === 'in') r.sink += dt;
        r.score = -r.strokes; r.prog = clamp((this.hole + (r.st === 'in' ? 1 : .5 * (1 - Math.min(1, d / 20)))) / 3, 0, .99);
      }
      if (this.inT == null && E.racers.some(r => r.st === 'in')) this.inT = E.t; if (this.inT != null && E.t - this.inT > 15) for (const r of E.racers) if (r.st !== 'in') { r.st = 'in'; r.sink = 0; r.strokes += 2; if (r.me) E.ui.toast('⏱️ ¡Tiempo! +2 golpes'); }
      if (E.racers.every(r => r.st === 'in') && (this.next += dt) > 1.4) { if (this.hole < 2) this.setHole(E, this.hole + 1); else if (!this.done) { this.done = true; scoreEnd(E, r => r.strokes + ' golpes'); } }
      info(`⛳ Hoyo ${this.hole + 1}/3 · ${E.me.strokes} golpes<br><small>${E.me.st === 'aim' ? 'Toca: dirección' : E.me.st === 'pow' ? 'Toca: ¡fuerza!' : ''}</small>`);
    },
    render(E, dt) {
      const t = E.t; this.A.W.tick(dt, camera); const H = HOLES[this.hole];
      for (const r of E.racers) { const sp = Math.hypot(r.bvx, r.bvz); r.ball.position.set(r.bx, r.st === 'in' ? Math.max(-.6, .28 - r.sink * 2) : .28 + (r.st === 'roll' ? Math.abs(Math.sin(t * 9 + r.k)) * Math.min(1, sp / 12) * .9 : 0), r.bz); r.ball.visible = !(r.st === 'in' && r.sink > .5);
        const a0 = r.ang ?? Math.atan2(H.hole[0] - r.bx, H.hole[1] - r.bz);
        if (r.st !== 'in') { const k = r.st === 'roll' ? dt * 1.2 : dt * 6; r.cx = lerp(r.cx, r.bx - Math.sin(a0) * .8, Math.min(1, k)); r.cz = lerp(r.cz, r.bz - Math.cos(a0) * .8, Math.min(1, k)); }
        if (r.st === 'in') { const a = r.k / 6 * 6.28; r.cx = lerp(r.cx, H.hole[0] + Math.cos(a) * 1.8, Math.min(1, dt * 3)); r.cz = lerp(r.cz, H.hole[1] + Math.sin(a) * 1.8, Math.min(1, dt * 3)); }
        r.obj.position.set(r.cx, r.st === 'in' ? Math.abs(Math.sin(t * 5 + r.k)) * .4 : 0, r.cz); r.obj.rotation.y = r.st === 'in' ? Math.atan2(H.hole[0] - r.cx, H.hole[1] - r.cz) : a0; }
      const me = E.me; this.arrow.visible = me.st === 'aim' || me.st === 'pow'; this.arrow.position.set(me.bx, 0, me.bz); this.arrow.rotation.y = me.ang || 0; const p = me.st === 'pow' ? me.pow : .35; this.arrow.scale.set(1, 1, .6 + p * 3.2);
      const c = new THREE.Color('#7ee3a4').lerp(new THREE.Color('#ff4f6a'), me.st === 'pow' ? p : 0); this.arrow.children.forEach(m => { m.material.color.copy(c); m.material.emissive.copy(c); });
      const pr = port(), bk = v3(me.bx - H.hole[0], 0, me.bz - H.hole[1]); if (bk.lengthSq() < 1) bk.set(0, 0, 1); bk.normalize();
      camTo(E, dt, v3(me.bx + bk.x * (pr ? 9 : 7), pr ? 13 : 9, me.bz + bk.z * (pr ? 9 : 7)), v3(lerp(me.bx, H.hole[0], .35), 0, lerp(me.bz, H.hole[1], .35)), pr ? 70 : 55, 2.5);
    },
  });
}

// =====================================================================
//  LABERINTO — arrastra el dedo para guiar a tu mochi por las pirámides hasta la salida
// =====================================================================
export function laberinto(cfg) {
  const N = cfg.n || 11, CS = 3.2, half = (N - 1) / 2;
  return base(cfg, { mode: 'tiempo', maxT: cfg.maxT || 110, stick: true,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: N * CS * .75 } }); setButtons(null);
      mesh(new THREE.BoxGeometry(N * CS + 1, .4, N * CS + 1), T(cfg.floor || '#e8c088', { rim: 0 }), sc, [0, -.2, 0]);
      const vis = Array.from({ length: N }, () => Array(N).fill(false)), wE = Array.from({ length: N }, () => Array(N).fill(true)), wS = Array.from({ length: N }, () => Array(N).fill(true));
      const st = [[0, N - 1]]; vis[0][N - 1] = true;
      while (st.length) { const [i, j] = st[st.length - 1]; const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b, a, b]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N && !vis[x][y]);
        if (!nb.length) { st.pop(); continue; } const [x, y, a, b] = pick(nb); if (a === 1) wE[i][j] = false; if (a === -1) wE[x][y] = false; if (b === 1) wS[i][j] = false; if (b === -1) wS[x][y] = false; vis[x][y] = true; st.push([x, y]); }
      for (let k = 0; k < N * 1.4; k++) { const i = Math.floor(rnd(0, N - 1)), j = Math.floor(rnd(0, N - 1)); if (Math.random() < .5) wE[i][j] = false; else wS[i][j] = false; }
      this.wE = wE; this.wS = wS; this.exit = [N - 1, 0];
      const cx = i => (i - half) * CS; this.cx = cx;
      const boxes = []; const addW = (x, z, w, d) => boxes.push({ x, z, w, d });
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (wE[i][j] && i < N - 1) addW(cx(i) + CS / 2, cx(j), .5, CS + .5); if (wS[i][j] && j < N - 1) addW(cx(i), cx(j) + CS / 2, CS + .5, .5); }
      for (let k = 0; k < N; k++) { addW(cx(k), cx(0) - CS / 2, CS + .5, .5); addW(cx(k), cx(N - 1) + CS / 2, CS + .5, .5); addW(cx(0) - CS / 2, cx(k), .5, CS + .5); addW(cx(N - 1) + CS / 2, cx(k), .5, CS + .5); }
      const ex = cx(this.exit[0]), ez = cx(0) - CS / 2; this.boxes = boxes.filter(b => !(Math.abs(b.x - ex) < .1 && Math.abs(b.z - ez) < .1));
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), T('#ffffff', { rim: .3 }), this.boxes.length), o = new THREE.Object3D(), cols = cfg.wall || ['#f2c27a', '#e8b064', '#ffcf8a', '#d9a65a'];
      this.boxes.forEach((b, i) => { const h = 1.7 + (i % 3) * .15; o.position.set(b.x, h / 2, b.z); o.scale.set(b.w, h, b.d); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, new THREE.Color(cols[i % cols.length])); }); sc.add(im);
      const caps = []; for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) caps.push({ x: (i - half - .5) * CS, y: 1.85, z: (j - half - .5) * CS, s: .32 }); this.caps = instSet(sc, cfg.cap || 'piramide', caps);
      const g = arch(sc, ez - .4, CS / 2 - .2, 'SALIDA', '#ff6fae'); g.position.x = ex; g.scale.setScalar(.7); this.beacon = glowSprite('#ffe27a', 7, .8); this.beacon.position.set(ex, 4, ez - 1); sc.add(this.beacon);
      const D = Array.from({ length: N }, () => Array(N).fill(1e9)); const q = [this.exit]; D[this.exit[0]][this.exit[1]] = 0;
      while (q.length) { const [i, j] = q.shift(); for (const [x, y] of this.nb(i, j)) if (D[x][y] > D[i][j] + 1) { D[x][y] = D[i][j] + 1; q.push([x, y]); } } this.D = D; this.D0 = D[0][N - 1];
      racers(E, .45); E.racers.forEach((r, k) => { r.x = cx(0) + ((k % 3) - 1) * .7; r.z = cx(N - 1) + (k < 3 ? -.5 : .6); r.vx = r.vz = 0; r.face = Math.PI; r.y = 0; r.tc = null; r.prev = null; });
    },
    nb(i, j) { const o = []; if (i < N - 1 && !this.wE[i][j]) o.push([i + 1, j]); if (i > 0 && !this.wE[i - 1][j]) o.push([i - 1, j]); if (j < N - 1 && !this.wS[i][j]) o.push([i, j + 1]); if (j > 0 && !this.wS[i][j - 1]) o.push([i, j - 1]); return o; },
    cell(r) { return [clamp(Math.round(r.x / CS + half), 0, N - 1), clamp(Math.round(r.z / CS + half), 0, N - 1)]; },
    collide(r) { const rad = .38; for (const b of this.boxes) { if (Math.abs(b.x - r.x) > 2.5 || Math.abs(b.z - r.z) > 2.5) continue; const dx = r.x - clamp(r.x, b.x - b.w / 2, b.x + b.w / 2), dz = r.z - clamp(r.z, b.z - b.d / 2, b.z + b.d / 2), d = Math.hypot(dx, dz); if (d < rad) { if (d > 1e-5) { r.x += dx / d * (rad - d); r.z += dz / d * (rad - d); } else r.z += rad; } } },
    update(E, dt) {
      for (const r of E.racers) {
        if (r.fin) { r.z -= 3 * dt; r.vx = 0; r.vz = -3; r.face = Math.PI; continue; }
        const [i, j] = this.cell(r);
        let dir;
        if (r.me && !E.AUTO) dir = stickDir(E);
        else { const s0 = sk(E, r);
          if (!r.tc || Math.hypot(this.cx(r.tc[0]) - r.x, (r.tc[1] < 0 ? this.cx(0) - CS : this.cx(r.tc[1])) - r.z) < .3) { const opts = this.nb(i, j); let best = opts.reduce((a, b) => this.D[b[0]][b[1]] < this.D[a[0]][a[1]] ? b : a, opts[0]);
            if (i === this.exit[0] && j === this.exit[1]) best = [i, -1];
            else if (opts.length > 2 && Math.random() < (1.1 - s0) * .3) { const o2 = opts.filter(c => !(r.prev && c[0] === r.prev[0] && c[1] === r.prev[1])); best = pick(o2.length ? o2 : opts); }
            r.prev = [i, j]; r.tc = best; }
          const tx = this.cx(r.tc[0]) - r.x, tz = (r.tc[1] < 0 ? this.cx(0) - CS : this.cx(r.tc[1])) - r.z, d = Math.hypot(tx, tz) || 1; dir = { x: tx / d, z: tz / d }; }
        const sp = r.me ? 4.6 : 2.9 + 1.5 * r.skill; moveRacer(r, dir, dt, sp, 12); this.collide(r);
        const [ci, cj] = this.cell(r); r.prog = clamp(1 - this.D[ci][cj] / this.D0, 0, .99);
        if (ci === this.exit[0] && r.z < this.cx(0) - CS / 2) { r.prog = 1; E.finish(r); }
      }
      const [mi, mj] = this.cell(E.me); info(`🗺️ Faltan ${this.D[mi][mj]} casillas`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera); this.caps.tick(t); this.beacon.material.opacity = .6 + Math.sin(t * 4) * .25;
      for (const r of E.racers) poseArena(E, r, t, dt);
      const me = E.me, pr = port(); camTo(E, dt, v3(me.x * .85, pr ? 21 : 15, me.z + 9), v3(me.x * .85, 0, me.z - (pr ? 1 : 2)), pr ? 62 : 55, 3); },
  });
}

// =====================================================================
//  TIRACHINAS — arrastra para apuntar/tensar y pulsa el botón 🎯: derriba la torre de bloques (física sencilla). 5 tiros.
// =====================================================================
export function tirachinas(cfg) {
  const SP = 7, TZ = -16, G = 12, SHOTS = 5;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 75,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 10, z1: -40, half: 22 } }); setButtons(null); window.__fireReq = false; this.fb = this.fireBtn();
      mesh(new THREE.BoxGeometry(46, .3, 34), T(cfg.floor || '#e8b064', { rim: 0 }), sc, [0, -.15, -9]);
      this.blocks = []; this.projs = []; this.dots = []; this.fx = particles(sc); this.deco = cfg.king === 'cactus' || cfg.mundo === 'desierto' ? desertoExtra(sc, T) : null;
      const bg = new THREE.BoxGeometry(.95, .95, .95), cols = cfg.cols || ['#ffcf8a', '#f2a65a', '#e88a5a', '#ffd36b'];
      racers(E, .5); E.racers.forEach((r, k) => {
        const lx = (k - 2.5) * SP; r.lx = lx; r.shots = SHOTS; r.score = 0; r.cd = 1 + k * .25; r.x = lx; r.z = 1.6;
        const sl = new THREE.Group(); sl.position.set(lx, 0, 0); sc.add(sl); for (const s of [-1, 1]) mesh(CYL(), T('#a8784a'), sl, [s * .45, 1, 0], [0, 0, -s * .25], [.12, 1.4, .12]); mesh(CYL(), T('#a8784a'), sl, [0, .35, 0], null, [.14, .7, .14]); r.band = mesh(new THREE.BoxGeometry(1, .06, .06), T('#ff6fae'), sl, [0, 1.6, 0]);
        const pyr = [[-1.5, 0], [-.5, 0], [.5, 0], [1.5, 0], [-1, 1], [0, 1], [1, 1], [-.5, 2], [.5, 2], [0, 3]];
        for (const [x, y] of pyr) { const m = new THREE.Mesh(bg, T(pick(cols), { rim: .3 })); outline(m, '#5a3a2a', 1.04); m.position.set(lx + x, .48 + y, TZ); sc.add(m); const bk = { face: addFace(m), m, own: r, x: lx + x, x0: lx + x, y: .48 + y, z: TZ, y0: .48 + y, vx: 0, vy: 0, vz: 0, dyn: false, cnt: false, v: 1, rest: true }; this.blocks.push(bk); }
        const king = prop(cfg.king || 'cactus'); king.scale.setScalar(.45); sc.add(king); this.blocks.push({ m: king, own: r, x: lx, x0: lx, y: 4.41, z: TZ, y0: 4.41, vx: 0, vy: 0, vz: 0, dyn: false, cnt: false, v: 3, king: true, rest: true }); this.rebuild(E, r, 0);
        r.obj.position.set(lx, 0, 1.6); r.obj.rotation.y = Math.PI;
      });
      const dg = new THREE.SphereGeometry(.09, 6, 4), dm = GL('#ffffff', .6); for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(dg, dm); d.visible = false; sc.add(d); this.dots.push(d); }
    },
    // vuelve a montar la pirámide entera: cada bloque cae desde arriba y rebota hasta su sitio, con chispas
    rebuild(E, r, delay = 0) { for (let k = this.projs.length - 1; k >= 0; k--) if (this.projs[k].r === r) { this.fx.burst(this.projs[k].x, this.projs[k].y, this.projs[k].z, 5); E.scene.remove(this.projs[k].m); this.projs.splice(k, 1); } let i = 0; for (const b of this.blocks) { if (b.own !== r) continue; b.dyn = false; b.cnt = false; b.rest = true; b.vx = b.vy = b.vz = 0; b.x = b.x0; b.z = TZ; b.y = b.y0; b.m.rotation.set(0, 0, 0); b.hitT = 0; setExpr(b, 'happy');
        const ord = b.king ? 11 : i; b.anim = { t0: E.t + delay + ord * .07, d: .75, h: 5 + ord * .25, land: false }; i++; } r.building = true; },
    fire(E, r, ang, v) { const m = mesh(SPH(), GL(cfg.ammoC || '#ff6fae', .3), E.scene, null, null, .35); outline(m, '#3a2050', 1.1); const el = .62; this.projs.push({ m, r, x: r.lx, y: 1.6, z: 0, vx: Math.sin(ang) * v * Math.cos(el), vy: Math.sin(el) * v, vz: -Math.cos(ang) * v * Math.cos(el), t: 0 }); r.shots--; r.cd = 3.4; r.reb = r.shots > 0 ? 1.7 : 0; if (r.me) Audio.sfxPlay('throw'); },
    // puntería: arrastrar en la pantalla gira (izq/der) y tensa (abajo = más fuerza). Se queda fijada; dispara el botón 🎯.
    aimFrom(E) { const I = E.input, a = this.aimS; if (I.down && I.px != null) { if (!this._drag) this._drag = { ang: a.ang, pw: a.pw }; const dx = I.px - I.sx, dy = I.py - I.sy, M = Math.min(innerWidth, innerHeight);
        a.ang = clamp(this._drag.ang - dx / innerWidth * 1.6, -.6, .6); a.pw = clamp(this._drag.pw + dy / (M * .5), 0, 1); } else this._drag = null;
      return { ang: a.ang, v: this.vT * (.78 + a.pw * .44), pw: a.pw, ok: true }; },
    fireBtn() { let b = document.getElementById('bFire'); if (!b) { b = document.createElement('button'); b.id = 'bFire'; b.innerHTML = '🎯<small>¡DISPARA!</small>';
        b.style.cssText = 'position:absolute;z-index:30;left:calc(18px + env(safe-area-inset-left));top:58%;transform:translateY(-50%);width:92px;height:92px;border-radius:50%;border:5px solid #fff;background:radial-gradient(circle at 35% 30%,#ffb3d6,#ff4f9a);color:#fff;font:700 34px Fredoka,system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;text-shadow:0 2px 0 #b03070;box-shadow:0 7px 0 #b8306f,0 12px 24px rgba(160,40,110,.4);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;padding:0;cursor:pointer';
        b.querySelector('small').style.cssText = 'font-size:12px;margin-top:2px;letter-spacing:.5px';
        const press = e => { e.preventDefault(); e.stopPropagation(); b.style.transform = (port() ? 'translateY(-50%)' : 'none') + ' scale(.9)'; window.__fireReq = true; };
        const rel = () => { b.style.transform = port() ? 'translateY(-50%)' : 'none'; };
        b.addEventListener('pointerdown', press); b.addEventListener('touchstart', e => { e.preventDefault(); }, { passive: false }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, rel);
        document.body.appendChild(b); } b.style.display = 'flex'; return b; },
    update(E, dt) {
      const el = .62;
      if (!this.aimS) { const dz = -TZ, dy = -.1; this.vT = Math.sqrt(G * dz * dz / (2 * Math.cos(el) ** 2 * (dz * Math.tan(el) - dy))); this.aimS = { ang: 0, pw: .5 }; }
      if (E.me.cd > 0 || E.me.shots <= 0) window.__fireReq = false;
      if (this.fb) { const pr = port(); if (this.fb._pr !== pr) { this.fb._pr = pr; Object.assign(this.fb.style, pr ? { top: '58%', bottom: 'auto', transform: 'translateY(-50%)' } : { top: 'auto', bottom: 'calc(14px + env(safe-area-inset-bottom))', transform: 'none' }); } const rdy = E.me.cd <= 0 && E.me.shots > 0 && !this.done; this.fb.style.opacity = rdy ? '1' : '.45'; if (this.done || E.me.shots <= 0) this.fb.style.display = 'none'; }
      for (const r of E.racers) { r.cd -= dt; if (r.shots <= 0 || r.cd > 0) continue;
        if (r.me && !E.AUTO) { this.aim = this.aimFrom(E); const K = window.__keys || {}; if (window.__fireReq || K.Space) { window.__fireReq = false; this.fire(E, r, this.aim.ang, this.aim.v); } }
        else { const s0 = sk(E, r), dz = -TZ, dy = 1.5 - 1.6; const v = Math.sqrt(G * dz * dz / (2 * Math.cos(el) ** 2 * (dz * Math.tan(el) - dy))); this.fire(E, r, rnd(-1, 1) * (1.25 - s0) * .12, v * (1 + rnd(-1, 1) * (1.25 - s0) * .16)); r.cd = Math.max(r.cd, rnd(3.3, 4)); } }
      for (const r of E.racers) if (r.reb > 0 && (r.reb -= dt) <= 0) { this.rebuild(E, r); if (r.me) { E.ui.toast('¡Torre nueva! 🧱'); Audio.sfxPlay('boing'); } }
      for (let i = this.projs.length - 1; i >= 0; i--) { const p = this.projs[i]; p.t += dt; p.vy -= G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        for (const b of this.blocks) { if (b.anim) continue; const d = Math.hypot(b.x - p.x, b.y - p.y, b.z - p.z); if (d < .85) { b.hitT = .9; b.dyn = true; b.rest = false; b.vx += p.vx * .55 + rnd(-1, 1); b.vy += Math.abs(p.vy) * .3 + 2; b.vz += p.vz * .55; p.vx *= .6; p.vz *= .6; if (p.r.me) Audio.sfxPlay('box'); } }
        if (p.y < .35) { p.y = .35; p.vy = -p.vy * .3; p.vx *= .6; p.vz *= .6; }
        p.m.position.set(p.x, p.y, p.z); if (p.t > 3.5) { E.scene.remove(p.m); this.projs.splice(i, 1); } }
      for (const b of this.blocks) { faceTick(b, E.t, dt);
        if (b.anim) { const a = b.anim, u = (E.t - a.t0) / a.d; b.y = b.y0 + a.h * dropBounce(Math.max(0, u)); b.m.visible = u > -0.02; if (!a.land && u >= .36) { a.land = true; this.fx.burst(b.x, b.y0 - .4, b.z + .3, b.king ? 14 : 6); } if (u >= 1) { b.anim = null; b.y = b.y0; if (!this.blocks.some(o => o.own === b.own && o.anim)) b.own.building = false; } continue; }
        if (!b.dyn && b.y > .6 && !b.own.building) { const sup = this.blocks.some(o => o !== b && !o.dyn && Math.abs(o.y - (b.y - 1)) < .3 && Math.abs(o.x - b.x) < .85 && Math.abs(o.z - b.z) < .85); if (!sup) { b.dyn = true; b.rest = false; } }
        if (!b.dyn) continue; b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        for (const o of this.blocks) { if (o === b || o.own !== b.own) continue; if (o.anim) continue; const dx = o.x - b.x, dy = o.y - b.y, dz = o.z - b.z, d = Math.hypot(dx, dy, dz); if (d < .9 && d > 1e-4) { const sp = Math.hypot(b.vx, b.vy, b.vz); if (!o.dyn && sp > 2.5) { o.hitT = .9; o.dyn = true; o.rest = false; o.vx += b.vx * .5; o.vz += b.vz * .5; o.vy += 1; } const k = (.9 - d) / 2 / d; b.x -= dx * k; b.y -= dy * k; b.z -= dz * k; if (o.dyn) { o.x += dx * k; o.y += dy * k; o.z += dz * k; } } }
        if (b.y < .48) { b.y = .48; b.vy = Math.abs(b.vy) > 1.5 ? -b.vy * .3 : 0; b.vx *= .8; b.vz *= .8; if (Math.hypot(b.vx, b.vz) < .2) { b.vx = b.vz = 0; } }
        b.m.rotation.x += b.vz * dt * .8; b.m.rotation.z -= b.vx * dt * .8;
        if (!b.cnt && (b.y < b.y0 - .6 || Math.hypot(b.x - b.x0, b.z - TZ) > 1.2)) { b.cnt = true; b.own.score += b.v; if (b.own.me) { Audio.sfxPlay(b.king ? 'got' : 'pop'); if (b.king) E.ui.toast('¡El rey ha caído! +3 👑'); } } }
      for (const r of E.racers) r.prog = clamp(r.score / 13, 0, .99);
      const allDone = E.racers.every(r => r.shots <= 0 && r.cd < -1.2) && !this.projs.length;
      if (!this.done && (allDone || E.t > this.maxT - 1)) { this.done = true; scoreEnd(E, r => r.score + ' pts'); }
      info(`🎯 Tiros: ${E.me.shots}/${SHOTS} · ${E.me.score} pts`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera); this.fx.tick(dt); if (this.deco) this.deco.tick(t, dt);
      
      for (const b of this.blocks) b.m.position.set(b.x, b.king && !b.dyn ? b.y - .45 : b.y, b.z);
      for (const r of E.racers) { r.obj.position.y = Math.abs(Math.sin(t * 3 + r.k)) * (r.cd > 1.8 ? .3 : 0); r.band.scale.x = 1; }
      const a = this.aim, me = E.me; this.dots.forEach(d => d.visible = false);
      if (a && a.ok && me.shots > 0 && me.cd <= 0) { let x = me.lx, y = 1.6, z = 0, vx = Math.sin(a.ang) * a.v * Math.cos(.62), vy = Math.sin(.62) * a.v, vz = -Math.cos(a.ang) * a.v * Math.cos(.62); for (let i = 0; i < this.dots.length; i++) { for (let k = 0; k < 4; k++) { const h = .025; vy -= G * h; x += vx * h; y += vy * h; z += vz * h; } if (y < 0) break; this.dots[i].position.set(x, y, z); this.dots[i].visible = true; } me.band.position.z = a.pw * .9; } else me.band.position.z = 0;
      const pr = port(); camTo(E, dt, v3(me.lx, pr ? 6 : 4.2, pr ? 9 : 6.5), v3(me.lx, 1.5, TZ * .7), pr ? 70 : 55, 4);
    },
  });
}

// =====================================================================
//  BOLOS — una marca recorre la pista: toca para lanzar. 5 tiradas con bolos nuevos cada vez.
// =====================================================================
export function bolos(cfg) {
  const SP = 4.2, LEN = 18, ROUNDS = 5;
  return base(cfg, { mode: 'puntos', doneSt: 'done', maxT: cfg.maxT || 80,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 10, z1: -30, half: 14 } }); setButtons('m', { M: cfg.btn || '🎳' });
      const lanes = new THREE.Group(); sc.add(lanes);
      for (let k = 0; k < 6; k++) { const x = (k - 2.5) * SP; mesh(new THREE.BoxGeometry(2.6, .3, LEN + 4), T(k % 2 ? (cfg.lane || '#dceeff') : (cfg.lane2 || '#cfe4ff'), { rim: .1 }), lanes, [x, -.15, -LEN / 2 + 1]); for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(.6, .1, LEN + 4), cfg.gutter ? GL(cfg.gutter, .8) : T('#8fb8e8'), lanes, [x + s * 1.6, -.2, -LEN / 2 + 1]); mesh(new THREE.BoxGeometry(.25, .7, LEN + 4), T('#ffffff'), lanes, [x + SP / 2, .2, -LEN / 2 + 1]); }
      mesh(new THREE.BoxGeometry(6 * SP + 2, 3, .6), T(cfg.back || '#8a5ad0'), sc, [0, 1.5, -LEN - 1.8]);
      this.pinG = mergedGeo(cfg.pin || 'muneco'); this.pinM = VCM();
      racers(E, .5); E.racers.forEach((r, k) => { r.lx = (k - 2.5) * SP; r.score = 0; r.round = 0; r.st = 'aim'; r.wait = rnd(.8, 1.6); r.ph = rnd(0, 6); r.pins = []; r.ball = cfg.ballProp ? prop(cfg.ballProp) : mesh(SPH(), T(cfg.ballC || '#ffffff', { rim: .7 }), sc, null, null, .38); if (cfg.ballProp) { r.ball.scale.setScalar(.55); sc.add(r.ball); } this.rack(E, r); });
    },
    rack(E, r) { for (const p of r.pins) E.scene.remove(p.m); r.pins = []; let n = 0; for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) { const m = new THREE.Mesh(this.pinG, this.pinM); m.scale.setScalar(cfg.ps || .26); E.scene.add(m); r.pins.push({ m, x: r.lx + (i - row / 2) * .52, z: -LEN + 1 - row * .46, vx: 0, vz: 0, down: false, tilt: 0, ta: rnd(0, 6.28) }); n++; } r.bx = r.lx; r.bz = 0; r.bv = 0; r.curve = 0; },
    update(E, dt) {
      const t = E.t;
      for (const r of E.racers) {
        if (r.st === 'aim') { r.mx = r.lx + Math.sin((t + r.ph) * 2.2) * 1.05; r.bx = r.mx; r.bz = .5;
          let go = false; if (r.me && !E.AUTO) go = tapped(E); else { const s0 = sk(E, r); if (r.err == null) r.err = rnd(-1, 1) * (1.3 - s0) * 1.5; go = (r.wait -= dt) < 0 && Math.abs(r.mx - r.lx - r.err) < .06; }
          if (go) { r.st = 'roll'; r.bv = cfg.speed || 12; r.err = null; r.curve = 0; if (r.me) Audio.sfxPlay('throw'); } }
        else if (r.st === 'roll') { r.bz -= r.bv * dt;
          if (r.me && !E.AUTO) r.curve = steer(E); r.bx = clamp(r.bx + r.curve * 1.2 * dt, r.lx - 1.25, r.lx + 1.25);
          for (const p of r.pins) { const dx = p.x - r.bx, dz = p.z - r.bz, d = Math.hypot(dx, dz); if (d < .55) { p.down = true; const k = 1 / (d || 1); p.vx += dx * k * 4 + rnd(-.5, .5); p.vz += -r.bv * .55 + dz * k * 2; r.bv *= .93; if (r.me) Audio.sfxPlay('box'); } }
          if (r.bz < -LEN - 1.5) { r.st = 'settle'; r.wait = 1.3; } }
        else if (r.st === 'settle') { if ((r.wait -= dt) < 0) { const n = r.pins.filter(p => p.down).length; r.score += n + (n === 10 ? 5 : 0); r.round++; if (r.me) E.ui.toast(n === 10 ? '¡PLENO! 🎳 +15' : `${n} bolos`); else if (n === 10) say(E, r, '¡Pleno!'); r.expr = n >= 8 ? 'happy' : ''; if (r.round >= ROUNDS) { r.st = 'done'; } else { this.rack(E, r); r.st = 'aim'; r.wait = rnd(.6, 1.4); } } }
        for (const p of r.pins) { if (!p.down && !(Math.abs(p.vx) + Math.abs(p.vz) > .1)) continue; p.x += p.vx * dt; p.z += p.vz * dt; p.vx *= Math.exp(-2.5 * dt); p.vz *= Math.exp(-2.5 * dt); p.tilt = Math.min(1.5, p.tilt + dt * 6);
          for (const o of r.pins) if (o !== p && !o.down) { const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < .42 && Math.hypot(p.vx, p.vz) > 1) { o.down = true; o.vx += p.vx * .6 + (o.x - p.x) * 2; o.vz += p.vz * .6; } } }
        r.prog = clamp(r.score / 50, 0, .99);
      }
      if (!this.done && E.racers.every(r => r.st === 'done')) { this.done = true; scoreEnd(E, r => r.score + ' pts'); }
      info(`🎳 Tirada ${Math.min(ROUNDS, E.me.round + 1)}/${ROUNDS} · ${E.me.score} pts`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { r.ball.position.set(r.bx, .38, r.bz); r.ball.visible = r.st === 'aim' || r.st === 'roll'; if (r.st === 'roll') r.ball.rotation.x -= r.bv * dt / .38;
        for (const p of r.pins) { p.m.position.set(p.x, 0, p.z); p.m.rotation.set(Math.sin(p.ta) * p.tilt, 0, Math.cos(p.ta) * p.tilt); }
        r.obj.position.set(r.st === 'aim' ? r.mx : r.lx, 0, 1.4); r.obj.rotation.y = Math.PI; r.obj.userData.pivot.position.y = r.expr === 'happy' ? Math.abs(Math.sin(t * 6)) * .3 : 0; }
      const me = E.me, pr = port(), fz = me.st === 'roll' ? Math.max(-LEN + 6, me.bz + 2) : 0; camTo(E, dt, v3(me.lx, pr ? 4.6 : 3.2, fz + (pr ? 7.5 : 5.5)), v3(me.lx, .3, fz - 8), pr ? 66 : 52, 3);
    },
  });
}

// =====================================================================
//  HOCKEY HEXAGONAL — defiende tu portería (abajo) con ⬅ ➡. 3 vidas; el último en pie gana.
// =====================================================================
export function hockey(cfg) {
  const R = 11, AP = R * Math.cos(Math.PI / 6), GW = 2.6, SIDE = R;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 75,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: R + 8 } }); setButtons('lr', { L: '⬅', R: '➡' });
      const fl = mesh(new THREE.CylinderGeometry(R, R, .4, 6), T(cfg.ice || '#d8f0ff', { rim: .4 }), sc, [0, -.2, 0], [0, Math.PI / 6, 0]); outline(fl, '#6a8ab0', 1.01);
      mesh(new THREE.RingGeometry(2, 2.2, 32), T('#ff6fae', { rim: 0 }), sc, [0, .02, 0], [-Math.PI / 2, 0, 0]);
      this.sides = []; racers(E, .5);
      E.racers.forEach((r, k) => { const a = Math.PI / 2 + k * Math.PI / 3, nx = Math.cos(a), nz = Math.sin(a), tx = -nz, tz = nx; const sd = { k, nx, nz, tx, tz, alive: true, r }; this.sides.push(sd);
        r.side = sd; r.u = 0; r.uv = 0; r.lives = 3; r.score = 0; r.out = false;
        const wg = new THREE.Group(); wg.position.set(nx * (AP + .3), 0, nz * (AP + .3)); wg.rotation.y = Math.atan2(nx, nz); sc.add(wg); sd.wg = wg;
        for (const s of [-1, 1]) mesh(new THREE.BoxGeometry((SIDE - 2 * GW) / 2 + .2, .8, .4), T('#ffffff', { rim: .4 }), wg, [s * (GW + (SIDE - 2 * GW) / 4), .4, 0]);
        sd.goal = new THREE.Group(); wg.add(sd.goal); for (const s of [-1, 1]) mesh(CYL(), T(r.ch.color), sd.goal, [s * GW, .7, .3], null, [.12, 1.4, .12]); mesh(CYL(), T(r.ch.color), sd.goal, [0, 1.4, .3], [0, 0, Math.PI / 2], [.12, GW * 2, .12]); mesh(new THREE.PlaneGeometry(GW * 2, 1.4), T(r.ch.color, { opacity: .35, side: THREE.DoubleSide }), sd.goal, [0, .7, .5]);
        sd.wall = mesh(new THREE.BoxGeometry(GW * 2, .8, .4), T('#bfc8e8'), wg, [0, -.6, 0]);
        r.obj.rotation.y = Math.atan2(-nx, -nz); });
      this.pucks = []; this.addPuck(E);
    },
    addPuck(E) { const m = mesh(new THREE.CylinderGeometry(.45, .45, .25, 20), GL(cfg.puckC || '#3a2a5a', .2), E.scene); outline(m, '#ffffff', 1.1); const a = rnd(0, 6.28); this.pucks.push({ m, x: 0, z: 0, vx: Math.cos(a) * 7, vz: Math.sin(a) * 7, wait: 1 }); },
    update(E, dt) {
      if (E.t > 18 && this.pucks.length < 2) { this.addPuck(E); E.ui.toast('¡Segundo disco! 🏒'); }
      for (const r of E.racers) { if (r.out) continue; const sd = r.side; let st = 0;
        if (r.me && !E.AUTO) st = -steer(E); // tu portería está abajo: la tangente va hacia la izquierda
        else { const s0 = sk(E, r); let best = null, bt = 9; for (const p of this.pucks) { const vn = p.vx * sd.nx + p.vz * sd.nz; if (vn <= .5) continue; const dn = AP - .9 - (p.x * sd.nx + p.z * sd.nz), tt = dn / vn; if (tt < bt) { bt = tt; best = p; } }
          let tu = 0; if (best) { tu = (best.x + best.vx * bt) * sd.tx + (best.z + best.vz * bt) * sd.tz; } if (r.rt == null || (r.rt -= dt) <= 0) { r.rt = .3 - s0 * .2; r.tu = tu + rnd(-1, 1) * (1.15 - s0) * 1.4; } st = clamp((r.tu - r.u) * 2, -1, 1); }
        r.uv = lerp(r.uv, st * (r.me ? 9 : 6 + 3 * r.skill), Math.min(1, dt * 10)); r.u = clamp(r.u + r.uv * dt, -GW - .6, GW + .6);
        r.x = sd.nx * (AP - .9) + sd.tx * r.u; r.z = sd.nz * (AP - .9) + sd.tz * r.u; }
      for (const p of this.pucks) { if (p.wait > 0) { p.wait -= dt; continue; } p.x += p.vx * dt; p.z += p.vz * dt;
        for (const r of E.racers) { if (r.out) continue; const dx = p.x - r.x, dz = p.z - r.z, d = Math.hypot(dx, dz); if (d < 1.15) { const nx = dx / d, nz = dz / d, vn = p.vx * nx + p.vz * nz; if (vn < 0) { p.vx -= 2 * vn * nx; p.vz -= 2 * vn * nz; } const sd = r.side, out = p.vx * sd.nx + p.vz * sd.nz; if (out > 0) { p.vx -= 2 * out * sd.nx; p.vz -= 2 * out * sd.nz; } const sp = Math.min(15, Math.hypot(p.vx, p.vz) * 1.05); const k = sp / Math.hypot(p.vx, p.vz); p.vx *= k; p.vz *= k; p.x = r.x + nx * 1.16; p.z = r.z + nz * 1.16; if (r.me) Audio.sfxPlay('hit'); } }
        for (const sd of this.sides) { const dn = p.x * sd.nx + p.z * sd.nz, vn = p.vx * sd.nx + p.vz * sd.nz; if (dn > AP - .45 && vn > 0) { const u = p.x * sd.tx + p.z * sd.tz;
            if (sd.alive && Math.abs(u) < GW) { if (dn > AP + .3) { const r = sd.r; r.lives--; E.burst(v3(p.x, .5, p.z), r.ch.color, 24, 5, .7, .6); if (r.me) { Audio.sfxPlay('boing'); E.shake = .3; E.ui.toast(r.lives ? `¡Gol en tu portería! ❤️×${r.lives}` : '¡Eliminado!'); } else say(E, r, pick(OUCH));
                if (r.lives <= 0) { sd.alive = false; r.out = true; r.outT = E.t; r.score = E.t; } p.x = p.z = 0; const a = rnd(0, 6.28); p.vx = Math.cos(a) * 7; p.vz = Math.sin(a) * 7; p.wait = .8; } }
            else { p.vx -= 2 * vn * sd.nx; p.vz -= 2 * vn * sd.nz; } } }
        const rr = Math.hypot(p.x, p.z); if (rr > R + 1) { p.x = p.z = 0; } }
      const alive = E.racers.filter(r => !r.out); for (const r of alive) r.score = 100 + r.lives * 10 + E.t * .01;
      for (const r of E.racers) r.prog = r.out ? clamp(r.outT / 75, 0, .9) : clamp(.3 + r.lives * .2, 0, .99);
      if (!this.done && (alive.length <= 1 || E.t > this.maxT - 1 || (E.me.out && E.t - E.me.outT > 2.5))) { this.done = true; scoreEnd(E, r => r.out ? `fuera a los ${Math.round(r.outT)} s` : `❤️×${r.lives}`); }
      info(`🏒 Vidas: ${'❤️'.repeat(Math.max(0, E.me.lives)) || '—'}<br><small>${alive.length} en pie</small>`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const p of this.pucks) { p.m.position.set(p.x, .15, p.z); p.m.visible = p.wait <= 0 || Math.floor(t * 10) % 2 === 0; }
      for (const r of E.racers) { const sd = r.side; sd.wall.position.y = sd.alive ? -.6 : lerp(sd.wall.position.y, .4, Math.min(1, dt * 4)); sd.goal.visible = sd.alive;
        if (r.out) { r.obj.position.set(sd.nx * (AP + 1.6), Math.abs(Math.sin(t * 5 + r.k)) * .2, sd.nz * (AP + 1.6)); } else r.obj.position.set(r.x, 0, r.z);
        r.obj.rotation.y = Math.atan2(-sd.nx, -sd.nz); r.obj.userData.pivot.rotation.z = -r.uv * .03; }
      const pr = port(); camTo(E, dt, v3(0, pr ? 26 : 19, pr ? 15 : 16.5), v3(0, 0, pr ? 2.2 : 2.6), pr ? 62 : 56, 3);
    },
  });
}

// =====================================================================
//  PESCA LOCA — mantén pulsado para recoger hilo: la tensión debe quedarse en la zona verde
// =====================================================================
export function pesca(cfg) {
  const SP = 3.4;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 55,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 12, z1: -60, half: 14 } }); this.W.ground.position.y = -3; setButtons('m', { M: '🎣' });
      const wg = new THREE.PlaneGeometry(220, 160, 44, 32); wg.rotateX(-Math.PI / 2); this.water = mesh(wg, T(cfg.water || '#3aa8d8', { rim: .4, opacity: .92 }), sc, [0, -.55, -70]); this.wy = Float32Array.from(wg.attributes.position.array);
      mesh(new THREE.BoxGeometry(6 * SP + 3, .5, 3.4), T('#c8904a', { rim: .2 }), sc, [0, -.25, 1]); for (let i = -9; i <= 9; i += 1.2) mesh(new THREE.BoxGeometry(.06, .52, 3.42), T('#8a5a3a'), sc, [i, -.24, 1]);
      for (let i = -8; i <= 8; i += 4) mesh(CYL(), T('#8a5a3a'), sc, [i, -1, -.5], null, [.25, 2, .25]);
      this.fishes = []; let mtr = $('meter'); if (!mtr) { mtr = document.createElement('div'); mtr.id = 'meter'; $('hud').appendChild(mtr); } mtr.innerHTML = '<div class="mz"></div><i></i><b>🎣 Tensión</b><span></span>'; mtr.style.display = 'none'; this.mtr = mtr;
      racers(E, .5); E.racers.forEach((r, k) => { r.lx = (k - 2.5) * SP; r.obj.position.set(r.lx, 0, 1.2); r.obj.rotation.y = Math.PI; r.score = 0; r.st = 'wait'; r.wait = rnd(1, 3); r.ten = .4; r.fp = 0; r.slack = 0; r.n = 0;
        const rod = new THREE.Group(); rod.position.set(.35, .7, -.2); r.obj.add(rod); mesh(CYL(), T('#a8784a'), rod, [0, .9, -.6], [-.6, 0, 0], [.05, 2.2, .05]); r.rod = rod;
        r.bob = mesh(SPH(), T('#ff4f6a', { rim: .5 }), sc, [r.lx, -.45, -6], null, .18); mesh(SPH(), T('#ffffff'), r.bob, [0, .6, 0], null, .7);
        const lg = new THREE.BufferGeometry().setFromPoints([v3(0, 0, 0), v3(0, 1, 0)]); r.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#ffffff' })); r.line.frustumCulled = false; sc.add(r.line); });
    },
    hold(E) { const K = window.__keys || {}; return E.input.down || held(E, 'M') || K.Space; },
    update(E, dt) {
      const t = E.t;
      for (const r of E.racers) {
        if (r.st === 'wait') { if ((r.wait -= dt) < 0) { r.st = 'fight'; r.ten = .45; r.fp = 0; r.slack = 0; r.str = rnd(.8, 1.4); r.gold = Math.random() < .15; r.ph = rnd(0, 6); r.jerk = rnd(.5, 1); if (r.me) { Audio.sfxPlay('beep'); E.ui.toast(r.gold ? '¡Pica uno DORADO! ✨' : '¡Pica! 🐟 Mantén pulsado'); } } continue; }
        const zc = .55 + Math.sin(t * .9 + r.ph) * .18, zw = .17;
        let hold; if (r.me && !E.AUTO) hold = this.hold(E); else { const s0 = sk(E, r); if ((r.rt = (r.rt || 0) - dt) <= 0) { r.rt = .12 + (1.1 - s0) * .25; r.h = r.ten < zc + rnd(-1, 1) * (1.15 - s0) * .2; } hold = r.h; }
        r.ten += (hold ? 1.1 : -.9) * dt * (r.gold ? 1.25 : 1); if ((r.jerk -= dt) < 0) { r.jerk = rnd(.5, 1.2); r.ten += rnd(.06, .2) * r.str * (Math.random() < .5 ? 1 : -.6); }
        const inZ = Math.abs(r.ten - zc) < zw; r.fp = clamp(r.fp + (inZ ? .3 : -.07) * dt, 0, 1); r.zc = zc; r.zw = zw;
        if (r.ten >= 1) { r.st = 'wait'; r.wait = rnd(1.2, 2.5); if (r.me) { Audio.sfxPlay('boing'); E.ui.toast('¡Se rompió el hilo! 💥'); } else say(E, r, '¡Mi hilo!'); continue; }
        if (r.ten <= 0) { r.ten = 0; if ((r.slack += dt) > 1.4) { r.st = 'wait'; r.wait = rnd(1, 2); if (r.me) E.ui.toast('Se escapó… ¡tensa más! 🐟'); continue; } } else r.slack = 0;
        if (r.fp >= 1) { const w = r.gold ? 3 : r.str > 1.15 ? 2 : 1; r.score += w; r.n++; r.st = 'wait'; r.wait = rnd(.8, 2.2); r.expr = 'happy'; setTimeout(() => r.expr = '', 900);
          const f = prop(r.gold ? 'estrella' : 'pez'); f.scale.setScalar(r.gold ? .5 : .45 + w * .1); E.scene.add(f); this.fishes.push({ f, x: r.lx, y: 0, z: -6, vx: rnd(-.5, .5), vy: 8, vz: 4, t: 0 }); if (r.me) { Audio.sfxPlay('got'); E.ui.toast(`¡${r.gold ? 'Pez dorado' : w > 1 ? 'Pez gordo' : 'Pez'}! +${w}`); } }
        r.prog = clamp(r.score / 14, 0, .99);
      }
      for (let i = this.fishes.length - 1; i >= 0; i--) { const q = this.fishes[i]; q.t += dt; q.vy -= 14 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.f.position.set(q.x, q.y, q.z); q.f.rotation.x += dt * 8; if (q.t > 1.3) { E.burst(q.f.position.clone(), '#bff4ff', 10, 3, .5, .4); E.scene.remove(q.f); this.fishes.splice(i, 1); } }
      if (!this.done && E.t > this.maxT - .5) { this.done = true; scoreEnd(E, r => r.score + ' kg'); }
      const me = E.me, m = this.mtr; m.style.display = me.st === 'fight' && !this.done ? 'block' : 'none'; if (me.st === 'fight') { const z = m.firstChild; z.style.left = ((me.zc - me.zw) * 100) + '%'; z.style.width = (me.zw * 200) + '%'; m.children[1].style.left = (clamp(me.ten, 0, 1) * 100) + '%'; m.children[3].textContent = `Captura ${Math.round(me.fp * 100)} %`; }
      board(E, r => r.score + ' kg');
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      const P = this.water.geometry.attributes.position, a = this.wy; for (let i = 0; i < P.count; i++) P.setY(i, a[i * 3 + 1] + Math.sin(a[i * 3] * .25 + t * 1.6) * .12 + Math.cos(a[i * 3 + 2] * .3 + t * 1.2) * .1); P.needsUpdate = true;
      for (const r of E.racers) { const f = r.st === 'fight'; const bx = r.lx + (f ? Math.sin(t * 7 + r.k) * .4 * r.str : 0), by = f ? -.75 - Math.abs(Math.sin(t * 9)) * .15 : -.45 + Math.sin(t * 2 + r.k) * .05; r.bob.position.set(bx, by, -6);
        r.rod.rotation.x = f ? -.25 - r.ten * .5 : 0; r.obj.userData.pivot.rotation.x = f ? -.15 : 0;
        const tip = v3(0, 0, 0); r.rod.children[0].localToWorld(tip.set(0, .5, 0)); const ps = r.line.geometry.attributes.position; ps.setXYZ(0, tip.x, tip.y, tip.z); ps.setXYZ(1, bx, by + .15, -6); ps.needsUpdate = true; }
      const me = E.me, pr = port(); camTo(E, dt, v3(me.lx * .7, pr ? 4.6 : 3.4, pr ? 7.5 : 5.6), v3(me.lx * .7, -.2, -6), pr ? 68 : 55, 3);
    },
    dispose() { const d = $('perf'); if (d) d.remove(); const m = $('meter'); if (m) m.style.display = 'none'; },
  });
}

// =====================================================================
//  MEMORIA DE CONCHAS — mira la secuencia de conchas y repítela tocándolas. Cada ronda, una más.
// =====================================================================
export function memoria(cfg) {
  const COLS = ['#ff6fae', '#ffd84a', '#5fd8e8', '#b98aff'], SND = ['beep', 'pop', 'got', 'click'], MAXR = 14;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 150,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: 9 } }); setButtons(null);
      mesh(new THREE.CylinderGeometry(8, 8.4, .4, 40), T(cfg.floor || '#f0dca0', { rim: .2 }), sc, [0, -.2, -2]);
      const half = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      this.shells = COLS.map((c, i) => { const g = new THREE.Group(); g.position.set((i - 1.5) * 2.7, 0, -3.6); sc.add(g); const m = T(c, { emissive: c, ei: .05, rim: .5 }); const sh = mesh(half, m, g, [0, 0, 0], null, [1.15, .55, 1]); outline(sh, '#5a3a6e', 1.05); for (let k = -2; k <= 2; k++) mesh(new THREE.TorusGeometry(1, .05, 6, 20, Math.PI), m, g, [0, 0, 0], [0, k * .32, 0], [1.16, .56, 1]); const gl = glowSprite(c, 4, 0); gl.position.y = .8; g.add(gl); return { g, m, gl, lit: 0, hop: 0 }; });
      racers(E, .5); const xs = [0, -5.6, 5.6, -7.6, 7.6, -3.4]; E.racers.forEach((r, k) => { r.obj.position.set(xs[k], 0, k === 0 ? 0 : -1.2 + (k > 2 ? 1.6 : 0)); r.obj.rotation.y = Math.PI + (k ? -Math.sign(xs[k]) * .4 : 0); r.score = 0; r.out = false; });
      if (E.me) E.me.obj.position.set(0, 0, -.6);
      this.seq = []; this.round = 0; this.ph = 'pause'; this.tt = 1.2; this.ray = new THREE.Raycaster();
    },
    light(i, s = .45) { const sh = this.shells[i]; sh.lit = s; sh.hop = .25; },
    pickShell(E) { const I = E.input; const v = new THREE.Vector2(I.sx / innerWidth * 2 - 1, -(I.sy / innerHeight) * 2 + 1); this.ray.setFromCamera(v, camera); let best = -1, bd = 1e9; this.shells.forEach((s, i) => { const p = s.g.position.clone(); p.y = .3; const d = this.ray.ray.distanceToPoint(p); if (d < 1.7 && d < bd) { bd = d; best = i; } }); return best; },
    update(E, dt) {
      const me = E.me; this.tt -= dt;
      for (const s of this.shells) { s.lit = Math.max(0, s.lit - dt); s.hop = Math.max(0, s.hop - dt); }
      if (this.ph === 'pause' && this.tt <= 0) { this.round++; this.seq.push(Math.floor(rnd(0, 4))); this.ph = 'show'; this.si = 0; this.tt = .5; this.step = me.out ? .03 : Math.max(.36, .62 - this.round * .02); if (!me.out) E.ui.toast(`Ronda ${this.round}: ¡mira bien! 👀`); }
      else if (this.ph === 'show' && this.tt <= 0) { if (this.si < this.seq.length) { const i = this.seq[this.si++]; this.light(i, this.step * .8); Audio.sfxPlay(SND[i]); this.tt = this.step; } else { this.ph = 'input'; this.ii = 0; this.tt = 4.5; if (!me.out) E.ui.toast('¡Tu turno! Toca las conchas 🐚'); } }
      else if (this.ph === 'input') {
        let fail = false, done = false;
        if (me.out) done = true;
        else if (E.AUTO) { if (this.tt < 4.1) { const want = this.seq[this.ii]; const ok = this.round < 8 || Math.random() < .5; const i = ok ? want : (want + 1) % 4; this.light(i, .3); Audio.sfxPlay(SND[i]); if (i !== want) fail = true; else if (++this.ii >= this.seq.length) done = true; this.tt = 4.5; } }
        else { const K = window.__keys || {}; let i = -1; if (E.taps.length) i = this.pickShell(E); for (let k = 0; k < 4; k++) if (K['Digit' + (k + 1)]) { i = k; window.__keys['Digit' + (k + 1)] = false; }
          if (i >= 0) { this.light(i, .3); Audio.sfxPlay(SND[i]); if (i !== this.seq[this.ii]) fail = true; else { this.tt = 4.5; if (++this.ii >= this.seq.length) done = true; } } else if (this.tt <= 0) fail = true; }
        if (fail) { me.out = true; me.score = this.round - 1 + .5; Audio.sfxPlay('boing'); E.ui.toast(`¡Fallo! Has llegado a la ronda ${this.round}`); done = true; }
        if (done) { if (!me.out) me.score = this.round;
          for (const r of E.racers) if (!r.me && !r.out) { const s0 = r.skill, p = clamp(1.05 - this.round * (.035 + (1 - s0) * .06), .05, .99); if (Math.random() < p) { r.score = this.round; r.expr = 'happy'; } else { r.out = true; r.score = this.round - 1 + Math.random() * .4; r.expr = ''; say(E, r, '¡Ups!'); } }
          this.ph = 'pause'; this.tt = me.out ? .6 : 1.3; }
      }
      for (const r of E.racers) r.prog = clamp(r.score / MAXR, 0, .99);
      const alive = E.racers.filter(r => !r.out);
      if (!this.done && this.ph === 'pause' && (alive.length === 0 || (me.out && alive.length <= 1) || this.round >= MAXR)) { this.done = true; scoreEnd(E, r => `ronda ${Math.max(1, Math.ceil(r.score))}`); }
      info(`🐚 Ronda ${this.round}${this.ph === 'input' && !me.out ? ` · ${this.ii}/${this.seq.length}` : ''}<br><small>${alive.length} siguen</small>`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const s of this.shells) { s.m.emissiveIntensity = .05 + (s.lit > 0 ? 1.1 : 0); s.gl.material.opacity = s.lit > 0 ? .9 : 0; s.g.position.y = s.hop > 0 ? Math.sin(s.hop / .25 * Math.PI) * .25 : 0; s.g.scale.setScalar(s.lit > 0 ? 1.08 : 1); }
      for (const r of E.racers) r.obj.userData.pivot.position.y = r.expr === 'happy' ? Math.abs(Math.sin(t * 6 + r.k)) * .25 : 0;
      const pr = port(); camTo(E, dt, v3(0, pr ? 9 : 5.5, pr ? 9 : 6.5), v3(0, 0, -3.2), pr ? 66 : 55, 4);
    },
  });
}

// =====================================================================
//  REBANAR — desliza el dedo para cortar la fruta que salta. ¡No cortes a las ranas!
// =====================================================================
export function rebanar(cfg) {
  const G = 12, FR = cfg.fruits || ['pina', 'platano', 'coco'], BAD = cfg.bad || 'rana';
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 40,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: 10 } }); setButtons(null);
      this.items = []; this.bits = []; this.sp = 0;
      racers(E, .5); const xs = [0, -6.5, 6.5, -9, 9, -4]; E.racers.forEach((r, k) => { r.obj.position.set(xs[k], 0, k ? -4 - (k > 2 ? 1.5 : 0) : 0); r.obj.rotation.y = k ? Math.PI : Math.PI; r.score = 0; r.next = rnd(.6, 1.6); r.sw = 0;
        if (k) { const st = prop('roca'); st.scale.setScalar(.6); st.position.set(xs[k], -1, r.obj.position.z); sc.add(st); } const kat = mesh(new THREE.BoxGeometry(.08, .08, 1.2), T('#e8f4ff', { rim: 1 }), r.obj, [.45, .8, .5]); r.kat = kat; });
      const cv = document.createElement('canvas'); cv.id = 'trail'; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5'; document.body.appendChild(cv); this.cv = cv; this.cx = cv.getContext('2d'); this.pts = [];
    },
    spawn(E) { const bad = Math.random() < .16, kind = bad ? BAD : pick(FR); const m = prop(kind); m.scale.setScalar(kind === 'platano' ? .9 : .75); E.scene.add(m); const x = rnd(-3.5, 3.5); this.items.push({ m, bad, x, y: -1.2, z: -5, vx: -x * rnd(.15, .35), vy: rnd(10.5, 12.5), vz: rnd(-.3, .3), sp: rnd(-3, 3), cut: false }); },
    scr(p) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
    cut(E, it) { it.cut = true; E.scene.remove(it.m); const me = E.me;
      if (it.bad) { me.score = Math.max(0, me.score - 3); E.shake = .4; Audio.sfxPlay('boing'); E.ui.toast('¡Pobre rana! −3 🐸'); E.burst(it.m.position.clone(), '#7fd86a', 16, 5, .6, .5); return; }
      me.score++; this.combo++; Audio.sfxPlay('pop'); E.burst(it.m.position.clone(), pick(['#ffe24a', '#ff9a5a', '#fff4c0']), 18, 6, .6, .5); me.sw = .3;
      for (const s of [-1, 1]) { const h = it.m.clone(); h.scale.multiplyScalar(.75); E.scene.add(h); this.bits.push({ m: h, x: it.x + s * .3, y: it.y, z: it.z, vx: it.vx + s * 3, vy: 2, t: 0, s }); } },
    update(E, dt) {
      if ((this.sp -= dt) < 0) { this.sp = Math.max(.35, .9 - E.t * .012); this.spawn(E); if (Math.random() < .3) this.spawn(E); }
      const I = E.input, me = E.me; this.combo = 0;
      let seg = null; if (!E.AUTO && I.down && I.px != null) { const cur = [I.px, I.py]; if (this.pp && Math.hypot(cur[0] - this.pp[0], cur[1] - this.pp[1]) > 6) seg = [this.pp, cur]; this.pp = cur; this.pts.push({ x: cur[0], y: cur[1], t: 0 }); } else this.pp = null;
      for (let i = this.items.length - 1; i >= 0; i--) { const it = this.items[i]; it.vy -= G * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; it.m.position.set(it.x, it.y, it.z); it.m.rotation.x += it.sp * dt; it.m.rotation.z += it.sp * .7 * dt;
        if (!it.cut) { const d = camera.position.distanceTo(it.m.position), rp = .8 / d * (innerHeight / 2) / Math.tan(camera.fov * Math.PI / 360);
          if (seg) { const [a, b] = seg, [px, py] = this.scr(it.m.position), dx = b[0] - a[0], dy = b[1] - a[1], k = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy), 0, 1); if (Math.hypot(a[0] + dx * k - px, a[1] + dy * k - py) < Math.max(34, rp)) this.cut(E, it); }
          else if (E.AUTO && !it.bad && it.vy < 1 && Math.random() < .2) this.cut(E, it); }
        if (it.cut || it.y < -3) { if (!it.cut) E.scene.remove(it.m); this.items.splice(i, 1); } }
      if (this.combo >= 3) { me.score += this.combo - 2; E.ui.toast(`¡Combo x${this.combo}! +${this.combo - 2}`); Audio.sfxPlay('stars'); }
      for (let i = this.bits.length - 1; i >= 0; i--) { const b = this.bits[i]; b.t += dt; b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.m.position.set(b.x, b.y, b.z); b.m.rotation.z += b.s * dt * 6; if (b.t > 1.2) { E.scene.remove(b.m); this.bits.splice(i, 1); } }
      for (const r of E.racers) { r.sw = Math.max(0, r.sw - dt); if (r.me) continue; if ((r.next -= dt) < 0) { r.next = rnd(.5, 1.3) / (.55 + r.skill * .7); r.score++; r.sw = .3; E.burst(r.obj.position.clone().add(v3(0, 2.2, 0)), pick(['#ffe24a', '#ff9a5a', '#7fd86a']), 10, 4, .5, .4); } }
      for (const r of E.racers) r.prog = clamp(r.score / 50, 0, .99);
      if (!this.done && E.t > this.maxT - .5) { this.done = true; scoreEnd(E, r => r.score + ' frutas'); }
      board(E, r => r.score);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { r.kat.rotation.y = r.sw > 0 ? Math.sin(r.sw / .3 * Math.PI) * 2 : 0; r.obj.userData.pivot.rotation.y = r.sw > 0 ? (1 - r.sw / .3) * 6.28 : 0; }
      const c = this.cv, x = this.cx; if (c.width !== innerWidth) { c.width = innerWidth; c.height = innerHeight; } x.clearRect(0, 0, c.width, c.height); this.pts = this.pts.filter(p => (p.t += dt) < .18);
      if (this.pts.length > 1) { x.lineCap = 'round'; for (let i = 1; i < this.pts.length; i++) { const a = this.pts[i - 1], b = this.pts[i]; x.strokeStyle = `rgba(255,255,255,${1 - b.t / .18})`; x.lineWidth = 10 * (1 - b.t / .18) + 2; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); } }
      const pr = port(); camTo(E, dt, v3(0, pr ? 4.5 : 3.2, pr ? 9.5 : 6.5), v3(0, pr ? 3.6 : 3, -5), pr ? 72 : 60, 5);
    },
    dispose() { const d = $('perf'); if (d) d.remove(); if (this.cv) this.cv.remove(); },
  });
}

// =====================================================================
//  TORRE DE TÓTEMS — el bloque va y viene: toca para soltarlo encima. Lo que sobresale se cae.
// =====================================================================
export function torre(cfg) {
  const SP = 6.5, H = .55, AMP = 3.4;
  return base(cfg, { mode: 'puntos', doneSt: 'done', maxT: cfg.maxT || 60,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 12, z1: -40, half: 20 } }); setButtons('m', { M: '🗿' });
      this.bg = new THREE.BoxGeometry(1, 1, 1); this.falling = [];
      racers(E, .45); E.racers.forEach((r, k) => { r.tx = (k - 2.5) * SP; const ped = mesh(new THREE.CylinderGeometry(2.2, 2.5, .5, 24), T('#a8784a'), sc, [r.tx, -.25, -2]); outline(ped, '#5a3a2a', 1.03);
        r.stack = [{ x: r.tx, z: -2, sx: 2.4, sz: 2.4, y: 0 }]; r.score = 0; r.st = 'move'; r.tt = 0; r.cur = this.newBlock(E, r); r.combo = 0; r.hop = 0; r.dy = 0; });
    },
    // gana el tótem MÁS ALTO (altura máxima alcanzada), no el último que queda en pie
    timeUp(E) { if (this.done) return; this.done = true; for (const r of E.racers) if (r.cur) { E.scene.remove(r.cur.m); r.cur = null; } scoreEnd(E, r => r.score + (r.score === 1 ? ' piso' : ' pisos')); },
    col(n) { return new THREE.Color().setHSL((n * .09 + .02) % 1, .75, .62); },
    newBlock(E, r) { const top = r.stack[r.stack.length - 1], n = r.stack.length, ax = n % 2 ? 'x' : 'z'; const m = new THREE.Mesh(this.bg, T('#' + this.col(n).getHexString(), { rim: .35 })); outline(m, '#3a2050', 1.03); E.scene.add(m);
      const eyes = new THREE.Group(); m.add(eyes); for (const s of [-1, 1]) mesh(SPHL(), new THREE.MeshBasicMaterial({ color: '#2a1838' }), eyes, [s * .18, .05, .51], null, [.06, .1, .03]); mesh(new THREE.TorusGeometry(.07, .02, 6, 10, Math.PI), new THREE.MeshBasicMaterial({ color: '#2a1838' }), eyes, [0, -.12, .51], [0, 0, Math.PI]);
      r.tt = rnd(0, 3); return { m, ax, sx: top.sx, sz: top.sz, y: top.y + H, x: top.x, z: top.z, w: 1.7 + n * .07 }; },
    drop(E, r) {
      const c = r.cur, top = r.stack[r.stack.length - 1], ax = c.ax, off = ax === 'x' ? c.x - top.x : c.z - top.z, size = ax === 'x' ? top.sx : top.sz;
      if (Math.abs(off) < .1) { if (ax === 'x') c.x = top.x; else c.z = top.z; r.combo++; if (r.me) { Audio.sfxPlay('stars'); E.ui.toast(r.combo > 1 ? `¡Perfecto x${r.combo}! ✨` : '¡Perfecto! ✨'); } }
      else { r.combo = 0; const ov = size - Math.abs(off);
        if (ov <= 0) { this.falling.push({ m: c.m, vy: 0, x: c.x, y: c.y, z: c.z, rx: rnd(-2, 2) }); r.st = 'done'; r.cur = null; r.expr = ''; if (r.me) { Audio.sfxPlay('boing'); E.ui.toast(`¡Se cayó! Torre de ${r.score}`); } return; }
        const cut = Math.abs(off), sg = Math.sign(off), nc = (ax === 'x' ? top.x : top.z) + off / 2, pc = nc + sg * (ov / 2 + cut / 2);
        const pm2 = new THREE.Mesh(this.bg, c.m.material); E.scene.add(pm2); const piece = { m: pm2, vy: 0, x: ax === 'x' ? pc : c.x, y: c.y, z: ax === 'z' ? pc : c.z, rx: sg * 2 }; pm2.scale.set(ax === 'x' ? cut : c.sx, H, ax === 'z' ? cut : c.sz); this.falling.push(piece);
        if (ax === 'x') { c.sx = ov; c.x = nc; } else { c.sz = ov; c.z = nc; } if (r.me) Audio.sfxPlay('land'); }
      r.stack.push({ x: c.x, z: c.z, sx: c.sx, sz: c.sz, y: c.y, m: c.m }); r.score++; r.hop = .3; r.cur = this.newBlock(E, r);
    },
    update(E, dt) {
      for (const r of E.racers) { if (r.st !== 'move') continue; const c = r.cur; r.tt += dt; const top = r.stack[r.stack.length - 1]; const o = Math.sin(r.tt * c.w) * AMP; if (c.ax === 'x') { c.x = top.x + o; c.z = top.z; } else { c.z = top.z + o; c.x = top.x; }
        let go; if (r.me && !E.AUTO) go = tapped(E); else { const s0 = sk(E, r); if (r.err == null) r.err = rnd(-1, 1) * (1.15 - s0) * (.25 + r.score * .02); go = r.tt > .6 && Math.abs(o - r.err) < .09; if (go) r.err = null; }
        if (go) this.drop(E, r); r.prog = clamp(r.score / 30, 0, .99); }
      for (let i = this.falling.length - 1; i >= 0; i--) { const f = this.falling[i]; f.vy -= 14 * dt; f.y += f.vy * dt; f.m.position.set(f.x, f.y, f.z); f.m.rotation.x += f.rx * dt; if (f.y < -6) { E.scene.remove(f.m); this.falling.splice(i, 1); } }
      if (!this.done && (E.racers.every(r => r.st === 'done') || E.t > this.maxT - .5)) this.timeUp(E);
      info('🗿 <b>Gana el más alto</b><br>' + E.racers.slice().sort((a, b) => b.score - a.score).map(r => `${r.me ? '<u>Tú</u>' : r.ch.name}: ${r.score} ${r.score === 1 ? 'piso' : 'pisos'}${r.st === 'done' ? ' 💥' : ''}`).join('<br>'));
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { if (r.cur) { const c = r.cur; c.m.position.set(c.x, c.y - H / 2, c.z); c.m.scale.set(c.sx, H, c.sz); }
        for (const b of r.stack) if (b.m) { b.m.position.set(b.x, b.y + H / 2 - H, b.z); b.m.scale.set(b.sx, H, b.sz); }
        const top = r.stack[r.stack.length - 1]; r.hop = Math.max(0, r.hop - dt); r.obj.position.set(r.tx - 1.6, Math.sin(r.hop / .3 * Math.PI) * .4, .6); r.obj.rotation.y = .5; }
      const me = E.me, top = me.stack[me.stack.length - 1], y = Math.max(0, top.y), pr = port(); camTo(E, dt, v3(me.tx + 2, y + (pr ? 6 : 4), pr ? 12 : 9), v3(me.tx, y + 1, -2), pr ? 66 : 55, 3);
    },
  });
}

// =====================================================================
//  PINTA LA TARTA — arrastra para moverte: pintas el suelo de tu color. Gana quien más pinte.
// =====================================================================
export function pinta(cfg) {
  const NC = 26, S = 20, CS = S / NC;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 45, stick: true,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: 24 } }); setButtons(null);
      const p = mesh(new THREE.BoxGeometry(S + .8, 1, S + .8), T(cfg.cake || '#fff4fa', { rim: .2 }), sc, [0, -.5, 0]); outline(p, '#c05a8a', 1.01);
      for (let i = 0; i < 28; i++) { const a = i / 28 * 6.28, rr = S / 2 + .6; const c = prop('vela'); c.position.set(Math.max(-rr, Math.min(rr, Math.cos(a) * rr * 1.5)), 0, Math.max(-rr, Math.min(rr, Math.sin(a) * rr * 1.5))); c.scale.setScalar(.6); sc.add(c); }
      this.tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(CS * .96, .06, CS * .96), T('#ffffff', { rim: 0 }), NC * NC); const o = new THREE.Object3D(); this.base = new THREE.Color(cfg.cake2 || '#ffe0ef');
      for (let i = 0; i < NC; i++) for (let j = 0; j < NC; j++) { o.position.set((i - NC / 2 + .5) * CS, .03, (j - NC / 2 + .5) * CS); o.updateMatrix(); this.tiles.setMatrixAt(i * NC + j, o.matrix); this.tiles.setColorAt(i * NC + j, this.base); }
      sc.add(this.tiles); this.own = new Int8Array(NC * NC).fill(-1);
      this.bombs = []; this.bt = 3;
      initArenaRacers(E, S * .8, .5); E.racers.forEach(r => { r.col = new THREE.Color(r.ch.color); r.score = 0; });
    },
    paint(r, x, z, rad) { const ci = Math.floor(x / CS + NC / 2), cj = Math.floor(z / CS + NC / 2), k = Math.ceil(rad / CS); for (let i = ci - k; i <= ci + k; i++) for (let j = cj - k; j <= cj + k; j++) { if (i < 0 || j < 0 || i >= NC || j >= NC) continue; if (Math.hypot((i - NC / 2 + .5) * CS - x, (j - NC / 2 + .5) * CS - z) > rad + CS * .3) continue; const id = i * NC + j; if (this.own[id] !== r.k) { this.own[id] = r.k; this.tiles.setColorAt(id, r.col); this.dirty = true; } } },
    update(E, dt) {
      if ((this.bt -= dt) < 0 && this.bombs.length < 3) { this.bt = rnd(3, 5); const m = prop('cupcake'); m.scale.setScalar(.7); const x = rnd(-8, 8), z = rnd(-8, 8); m.position.set(x, 0, z); E.scene.add(m); this.bombs.push({ m, x, z }); }
      for (const r of E.racers) {
        let dir; if (r.me && !E.AUTO) dir = stickDir(E);
        else { if (!r.tg || (r.rt -= dt) <= 0 || Math.hypot(r.tg.x - r.x, r.tg.z - r.z) < .6) { r.rt = rnd(.8, 1.6); const b = this.bombs.find(b => Math.hypot(b.x - r.x, b.z - r.z) < 6); if (b && Math.random() < r.skill) r.tg = { x: b.x, z: b.z }; else { let best = null, bs = -1; for (let n = 0; n < 14; n++) { const x = rnd(-9, 9), z = rnd(-9, 9), i = Math.floor(x / CS + NC / 2), j = Math.floor(z / CS + NC / 2), ow = this.own[i * NC + j]; const sc0 = (ow === r.k ? 0 : ow < 0 ? 2 : 2.5) - Math.hypot(x - r.x, z - r.z) * .12 + Math.random(); if (sc0 > bs) { bs = sc0; best = { x, z }; } } r.tg = best; } }
          const dx = r.tg.x - r.x, dz = r.tg.z - r.z, d = Math.hypot(dx, dz) || 1; dir = { x: dx / d, z: dz / d }; }
        const sp = r.me ? 6.2 : 4.6 + 1.4 * sk(E, r); moveRacer(r, dir, dt, sp, 10); r.x = clamp(r.x, -S / 2 + .3, S / 2 - .3); r.z = clamp(r.z, -S / 2 + .3, S / 2 - .3);
        this.paint(r, r.x, r.z, .55);
        for (let i = this.bombs.length - 1; i >= 0; i--) { const b = this.bombs[i]; if (Math.hypot(b.x - r.x, b.z - r.z) < .9) { this.paint(r, b.x, b.z, 2.6); E.burst(v3(b.x, .5, b.z), r.ch.color, 30, 7, .7, .7); E.scene.remove(b.m); this.bombs.splice(i, 1); if (r.me) { Audio.sfxPlay('got'); E.ui.toast('¡Bomba de nata! 🎨'); } } }
      }
      separate(E.racers, .9);
      if (this.dirty) { this.tiles.instanceColor.needsUpdate = true; this.dirty = false; }
      const cnt = new Array(E.racers.length).fill(0); for (const o of this.own) if (o >= 0) cnt[o]++; E.racers.forEach(r => { r.score = Math.round(cnt[r.k] / (NC * NC) * 100); r.prog = clamp(r.score / 35, 0, .99); });
      if (!this.done && E.t > this.maxT - .5) { this.done = true; scoreEnd(E, r => r.score + ' %'); }
      board(E, r => r.score + ' %');
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera); for (const b of this.bombs) { b.m.position.y = Math.abs(Math.sin(t * 4)) * .3; b.m.rotation.y = t * 2; }
      for (const r of E.racers) poseArena(E, r, t, dt); const me = E.me, pr = port(); camTo(E, dt, v3(me.x * .5, pr ? 22 : 15, me.z * .5 + (pr ? 13 : 12)), v3(me.x * .5, 0, me.z * .5 + (pr ? 1 : -1)), pr ? 60 : 55, 3); },
  });
}

// =====================================================================
//  FÚTBOL DE GOMINOLA — 3 contra 3. Arrastra para moverte y pulsa ⚽ para chutar a la portería rosa.
// =====================================================================
export function futbol(cfg) {
  // o37: CHUTAR grande con ayuda de puntería, imán al conducir, sin atascos (el jugador tiene prioridad
  // al separarse, se vuelve a encerrar en el campo después y el balón nunca se queda clavado en esquinas)
  const FX = 13, FZ = 8, GW = 2.4, LIMX = FX - .35, LIMZ = FZ - .35;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 60, stick: true,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { arena: { r: 24 }, noAmb: true }); setButtons('m', { M: '⚽' });
      { const bm = $('bM'); bm.innerHTML = '<span style="font-size:40px;line-height:1">⚽</span><span style="font-size:19px;letter-spacing:1px">CHUTAR</span>';
        Object.assign(bm.style, { position: 'absolute', right: 'calc(14px + env(safe-area-inset-right))', bottom: '0', width: '128px', height: '128px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', background: 'radial-gradient(circle at 35% 30%,#ffc2dc,#ff5d9e 70%)', borderColor: '#fff', textShadow: '0 2px 0 #b03070', animation: 'chutP 1.6s ease-in-out infinite' });
        const s = document.createElement('style'); s.textContent = '@keyframes chutP{0%,100%{box-shadow:0 6px 0 rgba(150,40,100,.35),0 0 0 0 rgba(255,111,174,.6)}50%{box-shadow:0 6px 0 rgba(150,40,100,.35),0 0 0 16px rgba(255,111,174,0)}}#bM.cerca{background:radial-gradient(circle at 35% 30%,#fff3b0,#ffb300 70%)!important;transform:scale(1.08)}'; document.head.appendChild(s); }
      for (const st of this.W.rich.sets || []) if (st.im && st.kind !== 'nubeLejos') st.im.visible = false;
      mesh(new THREE.BoxGeometry(FX * 2 + 2, .4, FZ * 2 + 2), T(cfg.grass || '#7fd86a', { rim: 0 }), sc, [0, -.2, 0]);
      this.X = futbolExtra(E, { FX, FZ, GW });
      for (const s of [-1, 1]) { const c = s > 0 ? '#ff6fae' : '#5fa8ff'; for (const z of [-1, 1]) mesh(CYL(), T(z > 0 ? '#ffffff' : c), sc, [s * FX, .9, z * GW], null, [.18, 1.8, .18]); mesh(CYL(), T(c), sc, [s * FX, 1.8, 0], [Math.PI / 2, 0, 0], [.18, GW * 2, .18]); mesh(new THREE.PlaneGeometry(GW * 2, 1.8), T(c, { opacity: .3, side: THREE.DoubleSide }), sc, [s * (FX + .6), .9, 0], [0, Math.PI / 2, 0]);
        for (const z of [-1, 1]) mesh(new THREE.BoxGeometry(.4, .6, FZ - GW), T('#ffffff'), sc, [s * (FX + .2), .3, z * (GW + (FZ - GW) / 2)]); }
      for (const z of [-1, 1]) mesh(new THREE.BoxGeometry(FX * 2 + .8, .6, .4), T('#ffffff'), sc, [0, .3, z * (FZ + .2)]);
      // portería rival marcada: flecha brillante que late sobre la portería rosa
      this.aim = glowSprite('#ffe27a', 3.2, .5); this.aim.position.set(FX + .4, 1, 0); sc.add(this.aim);
      this.ball = mesh(SPH(), T('#ffffff', { rim: .6 }), sc, null, null, .45); outline(this.ball, '#3a2050', 1.08); for (let i = 0; i < 6; i++) mesh(SPHL(), T(pick(['#ff6fae', '#7ee3c4', '#ffd84a'])), this.ball, [Math.cos(i) * .9, Math.sin(i * 2) * .4, Math.sin(i) * .9], null, .25);
      this.bsh = mesh(new THREE.CircleGeometry(.5, 20), new THREE.MeshBasicMaterial({ color: '#1a3a10', transparent: true, opacity: .35, depthWrite: false }), sc, [0, .03, 0], [-Math.PI / 2, 0, 0]);
      this.ring = mesh(new THREE.RingGeometry(.75, .95, 28), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: .0, depthWrite: false }), sc, [0, .04, 0], [-Math.PI / 2, 0, 0]);
      // estela del balón (bolitas que se encogen)
      this.trail = []; for (let i = 0; i < 14; i++) { const m = mesh(SPHL(), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffe27a' : '#ff9cc8', transparent: true, opacity: 0, depthWrite: false }), sc, null, null, .3); this.trail.push({ m, life: 0 }); } this.tk = 0;
      this.b = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 }; this.goals = [0, 0]; this.corner = 0; this.celeb = 0; this.celebTeam = 0;
      racers(E, .5); E.racers.forEach((r, k) => { r.team = k < 3 ? 0 : 1; r.role = k % 3; r.score = 0; r.g = 0; r.touch = 0; r.vx = r.vz = 0; r.y = 0; r.stun = 0; r.kc = 0; r.kbuf = 0; r.dash = 0; r.lean = 0; });
      this.kickoff(E);
    },
    kickoff(E) { const pos = [[-2, 0], [-6, 3.5], [-9, -2]]; E.racers.forEach(r => { const p = pos[r.role], s = r.team === 0 ? 1 : -1; r.x = p[0] * s; r.z = p[1] * s; r.vx = r.vz = 0; r.kbuf = 0; r.dash = 0; r.face = r.team === 0 ? Math.PI / 2 : -Math.PI / 2; }); Object.assign(this.b, { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 }); this.pause = 1; this.corner = 0; },
    kick(E, r, power = 13) { const b = this.b, gx = r.team === 0 ? FX + 1 : -FX - 1;
      // ayuda para apuntar: el jugador apunta al hueco de la portería (más ayuda para ti)
      const help = r.me ? .75 : .65; let dx = gx - b.x, dz = (r.me ? clamp(b.z * .3, -1, 1) * GW * .35 + rnd(-.8, .8) : rnd(-1, 1) * GW * .6) - b.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      const fx = Math.sin(r.face), fz = Math.cos(r.face); let kx = dx * help + fx * (1 - help), kz = dz * help + fz * (1 - help); const k = Math.hypot(kx, kz) || 1;
      b.vx = kx / k * power; b.vz = kz / k * power; b.vy = r.me ? 2.2 : 3; r.touch++; r.kc = .45; r.kbuf = 0; r.dash = 0; b.last = r; b.hot = r.me ? .9 : .5;
      E.burst(v3(b.x, .5, b.z), '#ffffff', 10, 5, .35, .35); if (r.me) { Audio.sfxPlay('kick'); E.shake = Math.max(E.shake || 0, .18); r.expr = 'happy'; setTimeout(() => { if (r.expr === 'happy' && !this.celeb) r.expr = ''; }, 500); } },
    update(E, dt) {
      const b = this.b; this.celeb = Math.max(0, this.celeb - dt); if (this.pause > 0) { this.pause -= dt; return; }
      const me = E.me;
      for (const r of E.racers) { r.kc = Math.max(0, r.kc - dt); r.kbuf = Math.max(0, r.kbuf - dt); r.dash = Math.max(0, r.dash - dt);
        let dir, wantKick = false; const db = Math.hypot(b.x - r.x, b.z - r.z), own = r.team === 0 ? -FX : FX;
        if (r.me && !E.AUTO) { dir = stickDir(E); if (E.btnM || held(E, 'M') && r.kbuf <= 0 && db < 2.3) { r.kbuf = .7; if (db > 2.3) r.dash = .6; } wantKick = r.kbuf > 0;
          // al pulsar CHUTAR lejos del balón, el mochi acelera hacia él (si no estás moviendo el dedo)
          if (r.dash > 0 && Math.hypot(dir.x, dir.z) < .2) { const dx = b.x - r.x, dz = b.z - r.z, d = Math.hypot(dx, dz) || 1; dir = { x: dx / d, z: dz / d }; } }
        else { const mates = E.racers.filter(o => o.team === r.team), chaser = mates.reduce((a, o) => Math.hypot(b.x - o.x, b.z - o.z) < Math.hypot(b.x - a.x, b.z - a.z) ? o : a);
          let tx, tz; if (chaser === r || (r.me && E.AUTO)) { const gx = r.team === 0 ? FX : -FX; const bx = b.x - Math.sign(gx - b.x) * .6; tx = bx; tz = b.z; } else if (r.role === 2) { tx = own * .88 + (b.x - own) * .08; tz = clamp(b.z * .8 + b.vz * .12, -GW + .4, GW - .4); } else { tx = b.x * .5 + (r.team === 0 ? 2 : -2); tz = (r.role ? 3 : -3); }
          // los rivales no se pegan encima de ti: guardan un poco de distancia cuando llevas el balón
          if (r.team !== me.team && !E.AUTO && Math.hypot(me.x - r.x, me.z - r.z) < 1.4 && Math.hypot(b.x - me.x, b.z - me.z) < 1.3) { const ax = r.x - me.x, az = r.z - me.z, ad = Math.hypot(ax, az) || 1; tx = r.x + ax / ad * 2; tz = r.z + az / ad * 2; }
          const dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz); dir = d > .3 ? { x: dx / d, z: dz / d } : { x: 0, z: 0 }; wantKick = db < 1.2 && Math.random() < dt * (2 + 4 * sk(E, r)); }
        const sp = (r.me ? (r.dash > 0 ? 8.6 : 6.8) : 4.8 + 1.4 * r.skill); moveRacer(r, dir, dt, sp, r.me ? 12 : 9); r.x = clamp(r.x, -LIMX, LIMX); r.z = clamp(r.z, -LIMZ, LIMZ);
        const kr = r.me ? 1.9 : 1.3;
        if (wantKick && db < kr && r.kc <= 0) this.kick(E, r, r.me ? 17 : 11 + 3 * r.skill);
        else if (r.me && !E.AUTO && db < 1.5 && b.y < .6 && r.kc <= 0) { // IMÁN: el balón se queda delante de tus pies al conducir
          const fx = Math.sin(r.face), fz = Math.cos(r.face), tx = r.x + fx * .85, tz = r.z + fz * .85, k = Math.min(1, dt * 10);
          b.vx = lerp(b.vx, r.vx * 1.05 + (tx - b.x) * 6, k); b.vz = lerp(b.vz, r.vz * 1.05 + (tz - b.z) * 6, k); b.last = r; }
        else if (db < .95 && Math.hypot(b.vx, b.vz) < 5) { const nx = (b.x - r.x) / (db || 1), nz = (b.z - r.z) / (db || 1); b.vx = b.vx * .5 + nx * 3 + r.vx * .8; b.vz = b.vz * .5 + nz * 3 + r.vz * .8; b.x = r.x + nx * .96; b.z = r.z + nz * .96; b.last = r; } }
      // separación: tú tienes prioridad (los demás se apartan) y después todos vuelven dentro del campo
      const rs = E.racers; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], c = rs[j], dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz); if (d < 1.0 && d > 1e-4) { const o = (1.0 - d) / d, wa = a.me && !E.AUTO ? .3 : c.me && !E.AUTO ? .7 : .5; a.x -= dx * o * wa; a.z -= dz * o * wa; c.x += dx * o * (1 - wa); c.z += dz * o * (1 - wa); } }
      for (const r of rs) { r.x = clamp(r.x, -LIMX, LIMX); r.z = clamp(r.z, -LIMZ, LIMZ); r.lean = lerp(r.lean, Math.min(1, Math.hypot(r.vx, r.vz) / 7), Math.min(1, dt * 8)); }
      $('bM').classList.toggle('cerca', Math.hypot(b.x - me.x, b.z - me.z) < 1.9);
      // o38: el balón rebota SIEMPRE contra cualquier mochi (subpasos para que a gran velocidad no atraviese)
      { const RS = .95, n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vz) * dt / .15)), h = dt / n;
        for (let s = 0; s < n; s++) { b.x += b.vx * h; b.z += b.vz * h;
          for (const r of rs) { if (b.y > 1.4) continue; if (r === b.last && r.kc > .3) continue; // el que acaba de chutar no se lo come
            const dx = b.x - r.x, dz = b.z - r.z, d = Math.hypot(dx, dz); if (d >= RS || d < 1e-5) continue;
            const nx = dx / d, nz = dz / d, rvx = b.vx - r.vx, rvz = b.vz - r.vz, vn = rvx * nx + rvz * nz;
            b.x = r.x + nx * RS; b.z = r.z + nz * RS;
            if (vn < 0) { const e = .5; b.vx -= (1 + e) * vn * nx; b.vz -= (1 + e) * vn * nz; b.vx *= .85; b.vz *= .85; // reflexión con pérdida de energía
              if (-vn > 6) { b.vy = Math.max(b.vy, 2); b.hot = 0; E.burst(v3(b.x, .6, b.z), '#ffffff', 8, 4, .3, .3); if (r.me || (b.last && b.last.me)) Audio.sfxPlay('boing'); if (r.role === 2 && b.last && b.last.team !== r.team && r.me === false && !E.AUTO && b.last.me) say(E, r, '¡Parada!'); }
              b.last = r; } } } }
      const f = Math.exp(-1.1 * dt); b.vx *= f; b.vz *= f; b.vy -= 14 * dt; b.y = Math.max(0, b.y + b.vy * dt); if (b.y === 0) b.vy = Math.abs(b.vy) > 2 ? -b.vy * .45 : 0; b.hot = Math.max(0, (b.hot || 0) - dt);
      if (Math.abs(b.z) > FZ - .45) { b.z = Math.sign(b.z) * (FZ - .45); b.vz = -b.vz * .8; }
      if (Math.abs(b.x) > FX - .45) { if (Math.abs(b.z) < GW - .3) { if (Math.abs(b.x) > FX + .3) { const tm = b.x > 0 ? 0 : 1; this.goals[tm]++; const sc0 = b.last; if (sc0 && sc0.team === tm) sc0.g++; E.burst(v3(b.x, 1, b.z), tm === 0 ? '#ff6fae' : '#5fa8ff', 50, 9, 1, .7); E.burst(v3(b.x, 2.5, b.z), '#ffe27a', 30, 7, 1.2, .5); E.shake = .5; Audio.sfxPlay(tm === E.me.team ? 'cheer' : 'boing'); E.ui.toast(tm === E.me.team ? `¡GOOOL! ⚽ ${this.goals[0]}-${this.goals[1]}` : `Gol rival… ${this.goals[0]}-${this.goals[1]}`); E.racers.forEach(r => r.expr = r.team === tm ? 'happy' : ''); setTimeout(() => E.racers.forEach(r => r.expr = ''), 2000); this.celeb = 2; this.celebTeam = tm; this.goalX = b.x; this.kickoff(E); this.pause = 2; } }
        else { b.x = Math.sign(b.x) * (FX - .45); b.vx = -b.vx * .8; } }
      // balón quieto en una esquina o pegado a la banda: se suelta solo hacia el centro
      const nearWall = Math.abs(b.x) > FX - 1.3 || Math.abs(b.z) > FZ - 1.3, slow = Math.hypot(b.vx, b.vz) < 2.5;
      this.corner = nearWall && slow ? this.corner + dt : 0; if (this.corner > 1.2) { const d = Math.hypot(b.x, b.z) || 1; b.vx = -b.x / d * 6; b.vz = -b.z / d * 6; b.vy = 3; this.corner = 0; E.burst(v3(b.x, .4, b.z), '#ffffff', 8, 3, .3, .3); }
      for (const r of E.racers) { const my = this.goals[r.team], th = this.goals[1 - r.team]; r.score = my * 10 - th * 3 + r.g * 4 + r.touch * .2 + r.skill * .01; r.prog = clamp(.3 + (my - th) * .15 + r.g * .1, 0, .99); }
      if (!this.done && E.t > this.maxT - .5) { this.done = true; scoreEnd(E, r => `${this.goals[r.team]}-${this.goals[1 - r.team]}${r.g ? ` · ${r.g}⚽` : ''}`); }
      info(`⚽ <b style="color:#ff6fae">Tú ${this.goals[0]}</b> - <b style="color:#5fa8ff">${this.goals[1]} Ellos</b>`);
    },
    render(E, dt) { const t = E.t, b = this.b; this.W.tick(dt, camera); this.X && this.X.tick(dt, this.goals, this.maxT - E.t); this.ball.position.set(b.x, .45 + b.y, b.z); this.ball.rotation.z -= b.vx * dt / .45; this.ball.rotation.x += b.vz * dt / .45;
      this.bsh.position.set(b.x, .03, b.z); this.bsh.scale.setScalar(1 / (1 + b.y * .4)); const me = E.me, near = Math.hypot(b.x - me.x, b.z - me.z) < 1.9;
      this.ring.position.set(b.x, .04, b.z); this.ring.material.opacity = near ? .55 + .3 * Math.sin(t * 10) : 0; this.ring.scale.setScalar(1 + .08 * Math.sin(t * 10));
      this.aim.material.opacity = .35 + .25 * Math.sin(t * 4); this.aim.position.y = 1 + .2 * Math.sin(t * 3);
      // estela
      const spd = Math.hypot(b.vx, b.vz); this.tk -= dt; if (spd > 6 && this.tk <= 0) { this.tk = .025; const s = this.trail.reduce((a, c) => c.life < a.life ? c : a); s.life = 1; s.m.position.set(b.x, .45 + b.y, b.z); s.m.material.color.set(b.hot > 0 ? (Math.random() < .5 ? '#ffe27a' : '#ff6fae') : '#ffffff'); }
      for (const s of this.trail) { s.life = Math.max(0, s.life - dt * 3.2); s.m.material.opacity = s.life * .7; s.m.scale.setScalar(.05 + s.life * .32); s.m.visible = s.life > 0; }
      for (const r of E.racers) { poseArena(E, r, t, dt); const pv = r.obj.userData.pivot;
        // carrera: inclinación hacia delante + balanceo; golpeo: latigazo hacia atrás y adelante con estiramiento
        const kp = r.kc > 0 ? 1 - r.kc / .45 : 1, kick = r.kc > 0 ? Math.sin(kp * Math.PI) : 0;
        pv.rotation.x = r.lean * .28 + Math.sin(t * 16 + r.k) * .06 * r.lean - kick * .7; pv.rotation.z = Math.sin(t * 8 + r.k) * .08 * r.lean;
        { const ch = r.obj.userData.char; if (ch) { if (!ch.userData.fs) ch.userData.fs = ch.scale.clone(); const s0 = ch.userData.fs; ch.scale.set(s0.x * (1 - kick * .08), s0.y * (1 + kick * .18), s0.z * (1 - kick * .08)); } }
        if (this.celeb > 0 && r.team === this.celebTeam) { const c = this.celeb; r.obj.position.y += Math.abs(Math.sin(c * 9 + r.k)) * .7; r.obj.rotation.y += dt * 9; pv.rotation.x = 0; } }
      const pr = port(), cz = this.celeb > 0 ? .85 : 1; camTo(E, dt, v3(b.x * .55, (pr ? 21 : 13) * cz, (pr ? 15 : 12) * cz), v3(b.x * .6, 0, pr ? 0 : -.5), pr ? 62 : 55, 2.5); },
  });
}

// GLOBO DE LOS SUEÑOS: rehecho en o32 → globo.js (lados + subir/bajar, corrientes visibles, tutorial)
// =====================================================================
//  CAZA DE MARIPOSAS — toca una mariposa: tu mochi salta con la red a por ella. Las doradas valen 3.
// =====================================================================
export function mariposas(cfg) {
  const R = 11;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 40,
    init(E) {
      const sc = E.scene; this.A = arena(E, cfg, R, cfg.floor || '#bfa8f0'); setButtons(null);
      const fl = []; for (let i = 0; i < 160; i++) { const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * (R - .8); fl.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: rnd(.25, .45), ry: rnd(0, 6), anim: 'sway', ph: rnd(0, 6) }); } this.flores = instSet(sc, cfg.flower || 'seta', fl);
      this.bf = []; for (let i = 0; i < 12; i++) this.spawnB(E);
      initArenaRacers(E, R, .5); E.racers.forEach(r => { r.score = 0; r.tg = null; r.dash = 0; r.rt = rnd(.5, 1.5); const net = new THREE.Group(); net.position.set(.5, .9, .1); r.obj.add(net); mesh(CYL(), T('#a8784a'), net, [0, .5, 0], null, [.04, 1.2, .04]); mesh(new THREE.TorusGeometry(.35, .04, 6, 16), T('#ffffff'), net, [0, 1.2, 0], [Math.PI / 2, 0, 0]); mesh(new THREE.ConeGeometry(.33, .5, 10, 1, true), T('#ffffff', { opacity: .6, side: THREE.DoubleSide }), net, [0, .95, 0], [Math.PI, 0, 0]); r.net = net; r.sw = 0; });
    },
    spawnB(E) { const gold = Math.random() < .15, m = prop(gold ? 'estrella' : 'mariposa'); m.scale.setScalar(gold ? .4 : .55); E.scene.add(m); const a = rnd(0, 6.28), d = rnd(1, R - 1.5); this.bf.push({ m, gold, cx: Math.cos(a) * d, cz: Math.sin(a) * d, ph: rnd(0, 6), sp: rnd(.6, 1.2), r: rnd(1, 2.5), x: 0, y: 1, z: 0, taken: null }); },
    scr(p) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, v.z]; },
    update(E, dt) {
      const t = E.t;
      for (const b of this.bf) { const a = t * b.sp + b.ph; b.x = clamp(b.cx + Math.cos(a) * b.r, -R + 1, R - 1); b.z = b.cz + Math.sin(a * 1.3) * b.r; b.y = 1 + Math.abs(Math.sin(a * 3)) * .9; if (Math.hypot(b.x, b.z) > R - 1) { const k = (R - 1) / Math.hypot(b.x, b.z); b.x *= k; b.z *= k; } }
      const me = E.me;
      if (!E.AUTO && E.taps.length) { const I = E.input; let best = null, bd = 90; for (const b of this.bf) { const [x, y, z] = this.scr(v3(b.x, b.y, b.z)); if (z > 1) continue; const d = Math.hypot(x - I.sx, y - I.sy); if (d < bd) { bd = d; best = b; } } if (best) { me.tg = best; me.dash = 1; Audio.sfxPlay('jump'); } else { /* toca el suelo: camina hasta allí */ } }
      for (const r of E.racers) {
        if (!r.me || E.AUTO) { if (!r.tg || !this.bf.includes(r.tg) || (r.rt -= dt) < -2) { if ((r.rt -= dt) <= 0) { const s0 = sk(E, r); r.rt = (1.1 - s0) * .9 + rnd(.1, .4); r.tg = this.bf.reduce((a, b) => { const sa = Math.hypot(a.x - r.x, a.z - r.z) - (a.gold ? 3 : 0), sb = Math.hypot(b.x - r.x, b.z - r.z) - (b.gold ? 3 : 0); return sb < sa ? b : a; }, this.bf[0]); r.dash = 1; } } }
        if (r.tg && !this.bf.includes(r.tg)) { r.tg = null; r.dash = 0; }
        let dir = { x: 0, z: 0 }; if (r.tg) { const dx = r.tg.x - r.x, dz = r.tg.z - r.z, d = Math.hypot(dx, dz); dir = d > .2 ? { x: dx / d, z: dz / d } : dir;
          if (d < 1.1) { const b = r.tg; r.score += b.gold ? 3 : 1; r.sw = .35; E.burst(v3(b.x, b.y, b.z), b.gold ? '#ffe27a' : '#ff9cf0', 16, 4, .6, .5); E.scene.remove(b.m); this.bf.splice(this.bf.indexOf(b), 1); this.spawnB(E); r.tg = null; r.dash = 0; if (r.me) { Audio.sfxPlay('got'); if (b.gold) E.ui.toast('¡Dorada! +3 ✨'); } } }
        const sp = r.me ? 9 : 6 + 2.5 * r.skill; moveRacer(r, dir, dt, r.dash ? sp : 0, 10); r.y = r.dash && r.tg ? Math.abs(Math.sin(t * 8 + r.k)) * .25 : 0; const rr = Math.hypot(r.x, r.z); if (rr > R - .6) { r.x *= (R - .6) / rr; r.z *= (R - .6) / rr; }
        r.sw = Math.max(0, r.sw - dt); r.prog = clamp(r.score / 25, 0, .99); }
      separate(E.racers, .8);
      if (!this.done && E.t > this.maxT - .5) { this.done = true; scoreEnd(E, r => r.score + ' 🦋'); }
      board(E, r => r.score + ' 🦋');
    },
    render(E, dt) { const t = E.t; this.A.W.tick(dt, camera); this.flores.tick(t);
      for (const b of this.bf) { b.m.position.set(b.x, b.y, b.z); b.m.rotation.y = t * 2 + b.ph; b.m.children.forEach((c, i) => { if (i < 2) c.rotation.y = Math.sin(t * 18 + b.ph) * .8 * (i ? 1 : -1); }); }
      for (const r of E.racers) { poseArena(E, r, t, dt); r.net.rotation.x = r.sw > 0 ? -Math.sin(r.sw / .35 * Math.PI) * 1.8 : -.3; }
      const me = E.me, pr = port(); camTo(E, dt, v3(me.x * .3, pr ? 19 : 12, me.z * .3 + (pr ? 13 : 12)), v3(me.x * .3, 0, me.z * .3 + (pr ? .5 : -1)), pr ? 62 : 55, 2.5); },
  });
}

// =====================================================================
//  EQUILIBRIO SOBRE LA LUNA — ¡te inclinas! Mantén pulsado ⬅ o ➡ para no caerte de la luna.
// =====================================================================
export function equilibrio(cfg) {
  const SP = 4.4, BR = 1.5, LIM = 1.05;
  return base(cfg, { mode: 'puntos', maxT: cfg.maxT || 50,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 12, z1: -40, half: 16 } }); setButtons('lr', { L: '⬅', R: '➡' });
      this.gust = 0; this.gt = 2; this.gdir = 1; this.leaves = [];
      for (let i = 0; i < 40; i++) { const m = prop(cfg.leaf || 'estrella'); m.scale.setScalar(.18); m.visible = false; sc.add(m); this.leaves.push({ m, x: 0, y: 0, z: 0 }); }
      racers(E, .45); E.racers.forEach((r, k) => { r.bx = (k - 2.5) * SP; r.th = rnd(-.05, .05); r.om = 0; r.out = false; r.score = 0; r.roll = 0; r.u = 0;
        const ball = mesh(SPH(), toon(cfg.ballC || '#ffe9a8', { emissive: '#ffe9a8', ei: .15, rim: .6 }), sc, [r.bx, BR, 0], null, BR); outline(ball, '#c0a050', 1.03); for (let i = 0; i < 6; i++) mesh(SPHL(), T('#e8c878'), ball, [Math.cos(i * 1.7) * .75, Math.sin(i * 2.3) * .75, Math.sin(i * 1.1) * .4 + .5], null, .18); r.ball = ball; r.fy = 0; r.fvy = 0; r.fx = 0; });
    },
    update(E, dt) {
      const t = E.t; if ((this.gt -= dt) < 0) { this.gt = rnd(2, 3.5); this.gdir = Math.random() < .5 ? -1 : 1; this.gust = 0; } const gmax = .9 + t * .07; this.gust = lerp(this.gust, this.gdir * gmax * (this.gt > 1 ? 1 : this.gt), Math.min(1, dt * 1.5));
      for (const r of E.racers) { if (r.out) { r.fvy -= 12 * dt; r.fy = Math.max(0, r.fy + r.fvy * dt); r.fx += Math.sign(r.th) * 2 * dt * (r.fy > 0 ? 1 : 0); continue; }
        let u; if (r.me && !E.AUTO) u = steer(E); else { const s0 = sk(E, r); if ((r.rt = (r.rt || 0) - dt) <= 0) { r.rt = .05 + (1.15 - s0) * .2; r.u = clamp(-(r.th * 3.2 + r.om * 1.3) * (.6 + .5 * s0) - this.gust * .3 + rnd(-1, 1) * (1.2 - s0) * 1.1, -1, 1); } u = r.u; }
        const acc = 2.6 * Math.sin(r.th) + this.gust * .9 + u * 4.4 + Math.sin(t * 3.1 + r.k * 1.7) * .25; r.om += acc * dt; r.om *= Math.exp(-.8 * dt); r.th += r.om * dt; r.roll -= r.om * dt * .8; r.uu = u;
        if (Math.abs(r.th) > LIM) { r.out = true; r.outT = t; r.score = t; r.fy = BR * 2; r.fvy = 3; r.fx = 0; E.burst(v3(r.bx, BR * 2, 0), r.ch.color, 16, 4, .6, .5); if (r.me) { Audio.sfxPlay('boing'); E.ui.toast(`¡Te caíste a los ${t.toFixed(1)} s!`); } else say(E, r, '¡Uaaah!'); } }
      const alive = E.racers.filter(r => !r.out); for (const r of alive) r.score = t + 100 - Math.abs(r.th) * 10; for (const r of E.racers) r.prog = clamp((r.out ? r.outT : t) / 50, 0, .99);
      if (!this.done && (alive.length <= 1 || E.t > this.maxT - .5 || (E.me.out && E.t - E.me.outT > 2))) { this.done = true; scoreEnd(E, r => r.out ? `${r.outT.toFixed(1)} s` : '¡en pie!'); }
      info(`🌙 Viento ${this.gust > .15 ? '➡️' : this.gust < -.15 ? '⬅️' : '·'}<br><small>${alive.length} en pie</small>`);
    },
    render(E, dt) { const t = E.t; this.W.tick(dt, camera);
      for (const r of E.racers) { r.ball.rotation.z = r.roll; if (r.out) { r.obj.position.set(r.bx + Math.sign(r.th) * (BR + .8) + r.fx * .2, r.fy, 0); r.obj.rotation.set(0, 0, 0); r.obj.userData.pivot.rotation.z = 0; continue; }
        r.obj.position.set(r.bx + Math.sin(r.th) * BR * 2 * .5, BR + Math.cos(r.th) * BR - .02, 0); r.obj.rotation.set(0, 0, -r.th); r.obj.userData.pivot.rotation.z = -(r.uu || 0) * .25; }
      this.leaves.forEach((l, i) => { l.m.visible = Math.abs(this.gust) > .3; l.x = ((i * 3.7 + t * this.gust * 9) % 30 + 30) % 30 - 15; l.m.position.set(l.x, 1 + (i % 7) * .6, -2 + (i % 5) * .8); l.m.rotation.z = t * 4 + i; });
      const me = E.me, pr = port(); camTo(E, dt, v3(me.bx * .6, pr ? 5 : 3.8, pr ? 13 : 9), v3(me.bx * .6, 2, 0), pr ? 70 : 55, 3); },
  });
}
export const NUEVOS = { chiles, circuito, golf, laberinto, tirachinas, bolos, hockey, pesca, memoria, rebanar, torre, pinta, futbol, globo, mariposas, equilibrio };
