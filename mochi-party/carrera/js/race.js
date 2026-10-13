import * as THREE from 'three';
import { CONFIG, ITEMS, ITEM_KEYS, ITEM_W } from './data.js';
import { makeKart, animKart, makeProjectile, makeBomba, makeSeta, toon, mesh } from './gfx.js';
import { buildTrack } from './track.js';
import { addSurreal } from './surreal.js';
import { addPeds } from './peds.js';
import { addVida } from './vida.js';
const DL = [0, 0.5, 1.0, 1.6]; const dlvl = t => t > DL[3] ? 3 : t > DL[2] ? 2 : t > DL[1] ? 1 : 0;
import { Audio } from './audio.js';

const V3 = THREE.Vector3;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const TURBO = { charge: 9, dur: 1.8, coinMax: 10, coinGain: 0.008, eventEvery: 20 };
const R = Math.random;

// =====================================================================
//  AJUSTES DE CONDUCCIÓN Y CÁMARA (v2) — todo en un sitio
//  Inspirado en el comportamiento típico de la cámara de persecución de los
//  karts modernos de consola: detrás y por encima, con retardo amortiguado,
//  mirando un poco por delante del kart, FOV que se abre con la velocidad.
// =====================================================================
export const STEER = {
  rampIn: 0.12,      // s para llegar de 0 a giro completo
  rampOut: 0.07,     // s para volver al centro (o cambiar de lado)
  expo: 0.35,        // curva de respuesta analógica (0 = lineal)
  lowSpeedFull: 12,  // m/s a partir de los cuales el giro ya es completo
  highSpeedCut: 0.25,// a velocidad máxima el giro baja un 25 % (nunca nervioso)
  assist: 1.9,       // ayuda que alinea el kart con la calle sin tocar nada
  assistMax: 0.7,    // solo si el desvío es menor que esto (rad)
  wallKeep: 0.94,    // velocidad que se conserva al rozar un muro (desliza, no frena en seco)
  wallAlign: 0.22,   // cuánto endereza el muro el morro hacia la calle
  autoDriftSteer: 1.0, // en derrape automático, cuánto manda tu dedo
};
export const CAM = {
  portrait: { dist: 8.8, height: 5.4, lookAhead: 15, lookHeight: 2.6, fov: 72 },  // vertical: kart en el tercio inferior y mucha calle por delante
  landscape: { dist: 6.0, height: 2.6, lookAhead: 5.0, lookHeight: 1.35, fov: 60 },
  fovSpeed: 6,       // grados extra a velocidad punta
  fovBoost: 6,       // grados extra con turbo
  pullBack: 1.1,     // metros extra hacia atrás a velocidad punta
  yawLag: 5.5,       // 1/s: retardo de giro de la cámara (más alto = más pegada)
  posSpring: 11,     // 1/s: muelle críticamente amortiguado de la posición
  lookSpring: 16,    // 1/s: suavizado del punto de mira
  driftSwing: 0.2,   // rad: en derrape la cámara se abre hacia fuera
  driftSide: 0.9,    // m de desplazamiento lateral en derrape
  wallMargin: 3.6,   // m fuera del muro que puede salir la cámara antes de chocar con fachadas
  shake: 0.6,        // multiplicador del temblor (turbos)
};

// LOD de karts: todo el kart "horneado" en una sola malla con colores por vértice (1 llamada de dibujo)
function bakeProxy(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), mm = new THREE.Matrix4(); const pos = [], nor = [], col = [];
  root.traverseVisible(o => { if (!o.isMesh || o.isInstancedMesh || o.renderOrder === -1) return; const m = o.material; if (Array.isArray(m) || !m.color || (m.transparent && m.opacity < 0.5)) return;
    let g = o.geometry; if (!g.attributes.position) return; g = g.index ? g.toNonIndexed() : g.clone(); if (!g.attributes.normal) g.computeVertexNormals(); g.applyMatrix4(mm.multiplyMatrices(inv, o.matrixWorld));
    const P = g.attributes.position.array, Nn = g.attributes.normal.array, c = m.color; for (let i = 0; i < P.length; i++) { pos.push(P[i]); nor.push(Nn[i]); } for (let i = 0; i < P.length / 3; i++) col.push(c.r, c.g, c.b); g.dispose(); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const px = new THREE.Mesh(g, toon('#ffffff', { vc: true, rim: 0.45 })); px.visible = false; px.userData.proxy = true; root.add(px); return px;
}
export class Race {
  constructor(app, { cup, reverse, playerChar, rivals, grid, cupIndex = 0, quality, net = null }) {
    this.net = net; this.netHost = !net || net.isHost;
    grid = grid.map(g => g.ch ? g : { ch: g, kind: g === playerChar ? 'me' : 'bot', name: g.name, id: g.id });
    this.app = app; this.cup = cup; this.reverse = reverse; this.quality = quality;
    this.scene = new THREE.Scene();
    this.track = buildTrack(cup, reverse, quality);
    this.scene.add(this.track.group);
    this.setupSky();
    this.surreal = addSurreal(this.track, quality, this.scene);
    this.peds = addPeds(this.track, quality, this.scene);
    this.vida = addVida(this.track, quality, this.scene, this);
    this.buildCoins(); this.cullList = this.buildCull();
    this.kick = 0; this.shake = 0; this.fwT = 0;
    this.time = 0; this.raceT = 0; this.state = 'intro'; this.introT = 0; this.cdT = 0; this.finishT = 0;
    this.karts = []; this.projs = []; this.hazards = []; this.msgs = [];
    this.difficulty = 0.94 + cupIndex * 0.015;
    const T = this.track;
    const order = grid; // array of char objects, index0 = pole
    order.forEach((g, gi) => {
      const k = this.makeKartState(g.ch, g.kind === 'me', gi);
      k.kind = g.kind; k.netId = g.id || ('k' + gi); k.pname = g.name || g.ch.name;
      k.sim = g.kind === 'me' || (g.kind === 'bot' && this.netHost);
      if (!k.sim && k.ai) k.ai = null;
      // grid position
      const row = gi >> 1, sd = gi % 2 ? 1 : -1;
      const back = 8 + row * 6.5 + (gi % 2) * 2.5;
      const i = ((-Math.round(back / T.STEP)) % T.N + T.N) % T.N; const s = T.S[i];
      k.pos.set(s.p.x + s.right.x * sd * s.w * 0.42, s.p.y, s.p.z + s.right.z * sd * s.w * 0.42);
      k.yaw = Math.atan2(s.fl.x, s.fl.z); k.idx = i; k.prevIdx = i; k.dist = -back; k.y = s.p.y;
      this.karts.push(k); this.scene.add(k.mesh);
    });
    this.player = this.karts.find(k => k.isPlayer);
    this.byId = new Map(this.karts.map(k => [k.netId, k])); this.netT = 0; this.goNow = !net; this.pendingBox = null;
    this.camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.7, 1600);
    this.camPos = new V3(); this.camLook = new V3(); this.camVel = new V3(); this._cw = new V3(); this._cl = new V3();
    this.camP0 = new V3(); this.camQ0 = new THREE.Quaternion(); this.camP1 = new V3(); this.camQ1 = new THREE.Quaternion();
    this.setupParticles();
    this.lightningFlash = 0;
    this.items = { roll: 0 };
    this.input = { steer: 0, throttle: 1, brake: false, drift: false, driftEdge: false, itemEdge: false };
    this.firstPress = null;
    this.placeCamera(true);
    this.snapInterp();
  }
  setupSky() {
    const c = this.cup, sc = this.scene;
    const top = new THREE.Color(c.sky[0]), bot = new THREE.Color(c.sky[1]);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1300, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: top }, bot: { value: bot }, mid: { value: new THREE.Color(c.sky[2] || c.sky[1]) }, flash: { value: 0 }, tm: { value: 0 } },
      vertexShader: 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 mid; uniform float flash; uniform float tm; varying vec3 vp; void main(){ vec3 n = normalize(vp); float h = n.y; vec3 c = h < 0.0 ? bot : h < 0.12 ? mix(bot, mid, h/0.12) : mix(mid, top, clamp((h-0.12)/0.55,0.0,1.0)); float sun = pow(max(0.0, dot(n, normalize(vec3(0.6,0.12,-0.8)))), 18.0); c += sun*vec3(1.0,0.75,0.5)*0.55; c += 0.05*sin(n.x*7.0+n.z*5.0+tm*0.2)*vec3(1.0,0.6,0.9)*smoothstep(0.1,0.6,h); gl_FragColor = vec4(c + flash*vec3(0.6,0.6,0.8), 1.0);} ' }));
    sky.renderOrder = -10; sc.add(sky); this.sky = sky;
    sc.fog = new THREE.Fog(c.fog, this.quality.hi ? 150 : 110, this.quality.hi ? 420 : 320); // el decorado se recorta justo antes del final de la niebla
    sc.add(new THREE.HemisphereLight(c.night ? '#b8a8ff' : c.theme === 'sunflower' ? '#ffe2c0' : c.theme === 'ice' ? '#d8e0ff' : '#ffffff', c.night ? '#5a3090' : c.theme === 'sunflower' ? '#ff9f8f' : '#ffd6ea', c.night ? 1.35 : 0.95));
    const d = new THREE.DirectionalLight('#fff4e8', c.theme === 'storm' || c.theme === 'space' ? 1.35 : 2.0); d.position.set(80, 160, 60); sc.add(d);
    if (c.theme === 'space' || c.theme === 'storm' || c.theme === 'ice') {
      const n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = R() * 6.28, b = Math.acos(R() * 2 - 1) * (c.theme === 'storm' ? 0.45 : 1); p[i * 3] = Math.sin(b) * Math.cos(a) * 1100; p[i * 3 + 1] = Math.cos(b) * 1100 * (c.theme === 'storm' ? 1 : 1); p[i * 3 + 2] = Math.sin(b) * Math.sin(a) * 1100; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      sc.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false })));
    }
    if (c.theme !== 'space' && c.theme !== 'storm') { // soft clouds
      const cl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), toon('#ffffff', { rim: 0.3, opacity: 0.92 }), 60); const m = new THREE.Matrix4();
      for (let i = 0; i < 20; i++) { const a = R() * 6.28, r = 500 + R() * 300, y = 120 + R() * 120; for (let j = 0; j < 3; j++) { m.compose(new V3(Math.cos(a) * r + j * 25, y + (j === 1 ? 12 : 0), Math.sin(a) * r), new THREE.Quaternion(), new V3(30, 18, 24)); cl.setMatrixAt(i * 3 + j, m); } }
      cl.material.fog = false; sc.add(cl);
    }
  }
  makeKartState(ch, isPlayer, gi) {
    const m = makeKart(ch, gi);
    m.userData.flame.visible = false; const proxy = bakeProxy(m.userData.tilt);
    const s = ch.stats;
    const shield = mesh(new THREE.SphereGeometry(2.4, 20, 14), toon('#bff4ff', { opacity: 0.35, rim: 1, emissive: '#7ff5ff', ei: 0.3 }), m, [0, 1.3, 0]); shield.visible = false; shield.renderOrder = 4;
    const pers = [{ name: 'prudente', laneAmp: 0.15, aggr: 0.3, skill: 0.95 }, { name: 'agresivo', laneAmp: 0.45, aggr: 0.9, skill: 0.98 }, { name: 'travieso', laneAmp: 0.35, aggr: 0.7, skill: 0.93 }, { name: 'veloz', laneAmp: 0.2, aggr: 0.5, skill: 1.0 }][gi % 4];
    return {
      ch, isPlayer, mesh: m, shield, proxy, pos: new V3(), _p0: new V3(), _p1: new V3(), _y0: 0, _y1: 0, steerS: 0, yaw: 0, vx: 0, vz: 0, fs: 0, y: 0, vy: 0, air: false, airT: 0,
      vmax: 48.6 + (s.vel - 2) * 2.4, acc: 0.82 + (s.acel - 3) * 0.14, turn: 2.15 + (s.man - 3) * 0.2, // v6: la velocidad mínima = Lava antigua (48.6)
      weight: 0.7 + s.peso * 0.15,
      idx: 0, prevIdx: 0, dist: 0, lap: 0, finished: false, finishTime: 0, place: gi + 1,
      item: null, rollT: 0, tc: R() * 0.35, turboT: 0, tinyT: 0, creamT: 0, coins: 0, boostT: 0, megaT: 0, megaS: 1, shieldT: 0, magT: 0, spinT: 0, squashT: 0, blindT: 0, invT: 0,
      driftDir: 0, driftT: 0, dLvl: 0, expr: '', exprT: 0, lastBoost: 0, trick: false, trickT: 0, steerVis: 0, wrongT: 0, stuckT: 0, bumpCD: 0, lastHitBy: null,
      ai: isPlayer ? null : { ...pers, laneT: 0, lane: (R() - 0.5) * pers.laneAmp * 2, itemDelay: 1, drift: false, takeSC: null, noise: 0 },
    };
  }
  setupParticles() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(cv);
    this.parts = []; const n = this.quality.hi ? 160 : 90;
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.visible = false; this.scene.add(s); this.parts.push({ s, life: 0, v: new V3() }); }
    this.pi = 0;
  }
  emit(p, color, size = 0.6, life = 0.4, vel = null) {
    const P = this.parts[this.pi = (this.pi + 1) % this.parts.length];
    P.s.position.copy(p); P.s.material.color.set(color); P.s.scale.setScalar(size); P.s.visible = true; P.life = P.max = life; P.size = size;
    if (vel) P.v.copy(vel); else P.v.set((R() - 0.5) * 3, R() * 3, (R() - 0.5) * 3);
  }
  msg(text, k, color) { if (k && !k.isPlayer) return; this.app.ui.toast(text, color); }

  // =================================================================
  update(dt) {
    this.saveInterp();
    this.time += dt;
    const T = this.track;
    if (this.state === 'intro') { this.introT += dt; if (this.net && !this.goNow) { this.app.skipIntro = false; if (this.introT > 3.2) this.introT = 3.2; } else if (this.net || this.introT > 3.2 || this.app.skipIntro) { this.state = 'countdown'; this.cdT = 0; this.app.skipIntro = false; this.lastCd = 4; } }
    else if (this.state === 'countdown') {
      this.cdT += dt; const n = 3 - Math.floor(this.cdT);
      if (n !== this.lastCd && n > 0) { this.lastCd = n; Audio.sfxPlay('beep'); this.app.ui.countdown(String(n)); }
      if (this.cdT >= 3) { this.state = 'race'; Audio.sfxPlay('go'); this.app.ui.countdown('¡YA!'); this.startBoosts(); }
    } else if (this.state === 'race' || this.state === 'finish') this.raceT += dt;
    const running = this.state === 'race' || this.state === 'finish';
    if (this.net) this.netRecvTick(dt);
    for (const o of T.obstacles) o.update(this.time, dt);
    if (this.player) { this.surreal.update(this.time, dt, this); this.vida.update(this.time, dt, this); this.cullTick(dt); }
    this.sky.material.uniforms.tm.value = this.time;
    this.peds.update(running ? this.raceT : 0, dt, this);
    for (const b of T.boxes) { if (b.t > 0) b.t -= dt; const vis = b.t <= 0; b.mesh.visible = vis; if (vis) { b.mesh.rotation.y = this.time * 1.4 + b.ph; b.mesh.rotation.x = Math.sin(this.time + b.ph) * 0.3; b.mesh.position.y = b.pos.y + Math.sin(this.time * 2.5 + b.ph) * 0.3; b.mesh.userData.cube.material.emissive.setHSL((this.time * 0.25 + b.ph * 0.2) % 1, 0.9, 0.55); } }
    for (const p of T.pads) p.mesh.material.map.offset.y = -this.time * 1.2 % 1;
    if (running) {
      for (const k of this.karts) {
        if (!k.sim) { this.netKart(k, dt); continue; }
        const inp = k.isPlayer && !k.finished && !this.app.autopilot ? this.input : this.aiInput(k, dt);
        this.stepKart(k, inp, dt);
      }
      for (const k of this.karts) this.peds.collide(k, this, k.sim);
      if (this.net) this.netSendTick(dt);
      this.collideKarts();
      this.updateProjectiles(dt);
      this.updCoins(dt); this.raceEvents(dt);
      this.rank(); this.announce();
    } else for (const k of this.karts) this.placeKartMesh(k, dt);
    // finish handling
    if (this.state === 'race' && this.player.finished) { this.state = 'finish'; this.finishT = 0; }
    if (this.state === 'finish') { this.finishT += dt;
      if (!this.net) { if (this.karts.every(k => k.finished) || this.finishT > 9) this.endRace(); }
      else if (this.netHost) { if (this.karts.every(k => k.finished) || this.finishT > 14) this.endRace(); }
      else if (this.netResults) this.endRace(); else if (this.finishT > 25) { this.netLostHost(); this.endRace(); } }
    // particles
    for (const P of this.parts) if (P.life > 0) { P.life -= dt; P.s.position.addScaledVector(P.v, dt); P.s.material.opacity = Math.max(0, P.life / P.max); P.s.scale.setScalar(P.size * (0.6 + 0.4 * P.life / P.max)); if (P.life <= 0) P.s.visible = false; }
    // lightning flash
    if (this.cup.theme === 'storm') { for (const o of T.obstacles) if (o.strikeNow && !o.flashed) { o.flashed = true; this.lightningFlash = 1; const d = o.g.position.distanceTo(this.player.pos); if (d < 120) Audio.sfxPlay('thunder'); } else if (!o.strikeNow) o.flashed = false;
      if (R() < dt * 0.15) this.lightningFlash = Math.max(this.lightningFlash, 0.5); }
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3); this.sky.material.uniforms.flash.value = this.lightningFlash * 0.6;
    this.kick = Math.max(0, this.kick - dt * 2.2);
    if (this.fireworks && this.state === 'finish') { this.fwT -= dt; if (this.fwT <= 0) { this.fwT = 0.3 + R() * 0.3; const p = this.player.pos, a = R() * 6.28, c = new V3(p.x + Math.cos(a) * (10 + R() * 14), this.player.y + 14 + R() * 10, p.z + Math.sin(a) * (10 + R() * 14)); const col = ['#ff5fd2', '#ffe066', '#7ff5ff', '#9dff7a', '#ff8f5f'][Math.floor(R() * 5)]; for (let i = 0; i < 28; i++) { const v = new V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(9 + R() * 3); this.emit(c, col, 1.1, 1.1, v); } Audio.sfxPlay('firework'); } }
    this.placeCamera(false, dt);
    this.camP1.copy(this.camera.position); this.camQ1.copy(this.camera.quaternion);
    for (const k of this.karts) { k._p1.copy(k.mesh.position); k._y1 = k.mesh.rotation.y; }
    if (this.player) Audio.engineSet(Math.abs(this.player.fs), this.player.boostT > 0 || this.player.megaT > 0);
  }
  startBoosts() {
    const GO = 3; // relative cdT
    for (const k of this.karts) {
      let good = false, stall = false;
      if (k.isPlayer) { const t = this.firstPress; if (t != null) { if (t >= GO - 0.65 && t <= GO + 0.12) good = true; else if (t < GO - 2.0) stall = true; } }
      else good = R() < 0.45;
      if (good) { k.boostT = 1.3; k.fs = 10; if (k.isPlayer) { this.msg('¡Salida turbo!', k, '#ffd84a'); Audio.sfxPlay('boost'); } }
      if (stall) { k.spinT = 0.7; if (k.isPlayer) { this.msg('¡Te has pasado!', k, '#ff8fb0'); Audio.sfxPlay('stall'); } }
    }
  }
  pressAction() { if (this.state === 'countdown' && this.firstPress == null) this.firstPress = this.cdT; if (this.state === 'intro') this.app.skipIntro = true; }

  // ---------------- AI ----------------
  aiInput(k, dt) {
    const T = this.track, a = k.ai || (k.ai = { name: 'piloto', lane: 0, laneT: 0, aggr: 0.5, skill: 1, itemDelay: 1, drift: false, takeSC: null, noise: 0 });
    const inp = { steer: 0, throttle: 1, brake: false, drift: false, driftEdge: false, itemEdge: false };
    a.laneT -= dt; if (a.laneT <= 0) { a.laneT = 2 + R() * 3; a.lane = (R() - 0.5) * 2 * (a.laneAmp || 0.3); }
    const look = 7 + Math.max(0, k.fs) * 0.42;
    let ti = (k.idx + Math.round(look / T.STEP)) % T.N; const s = T.S[ti];
    let lane = a.lane * s.w;
    // seek item boxes when empty-handed
    if (!k.item && k.rollT <= 0) { let bestB = null, bd = 1e9; for (const b of T.boxes) { if (b.t > 0) continue; let di = (b.idx - k.idx + T.N) % T.N; if (di > 4 && di < 30 && di < bd) { bd = di; bestB = b; } } if (bestB) lane = bestB.lat; }
    let tx = s.p.x + s.right.x * lane, tz = s.p.z + s.right.z * lane;
    // shortcuts
    a.scSlow = false;
    for (const sc of T.shortcuts) {
      const di = (sc.i0 - k.idx + T.N) % T.N;
      if (di < 25 && a.takeSC !== sc && a.scDec !== sc.i0 + '/' + k.lap) { a.scDec = sc.i0 + '/' + k.lap; a.takeSC = (k.boostT > 0 || (k.tc >= 1 && R() < 0.55) || k.megaT > 0 || k.item === 'turbo' || k.item === 'seta' || R() < 0.35 * a.skill) ? sc : false; if (a.takeSC === false) a.scSkipIdx = sc.i0; else { k.scCount = (k.scCount || 0) + 1; if (k.tc >= 1 && !k.air) inp.driftEdge = true; } }
      if (a.takeSC === sc) {
        if (di < 12 || T.inShortcut(k.pos.x, k.pos.z) != null) {
          // aim at a point further along the path
          let best = 0, bd = 1e9; sc.pts.forEach((q, j) => { const d = (q.x - k.pos.x) ** 2 + (q.z - k.pos.z) ** 2; if (d < bd) { bd = d; best = j; } });
          const inSc = T.inShortcut(k.pos.x, k.pos.z) != null;
          if (!inSc && di > 3 && di < T.N / 2) { const e = sc.pts[0], si = T.S[sc.i0]; const latE = (e.x - si.p.x) * si.right.x + (e.z - si.p.z) * si.right.z; const st = T.S[((ti - k.idx + T.N) % T.N) > di ? sc.i0 : ti]; tx = st.p.x + st.right.x * latE; tz = st.p.z + st.right.z * latE; a.scSlow = true; }
          else { const tgt = sc.pts[Math.min(sc.pts.length - 1, inSc ? best + 3 : Math.min(best + 1, 2))]; tx = tgt.x; tz = tgt.z; a.scSlow = !inSc; }
          if (k.stuckT > 0.8 && !inSc) { a.takeSC = false; a.scSkipIdx = sc.i0; }
          if (best >= sc.pts.length - 2) a.takeSC = null;
          if ((k.item === 'turbo' || k.item === 'seta') && best > 1) inp.itemEdge = true;
        }
        if ((k.idx - sc.i1 + T.N) % T.N < 40 && (k.idx - sc.i1 + T.N) % T.N >= 0 && T.inShortcut(k.pos.x, k.pos.z) == null && di > 25) a.takeSC = null;
      }
    }
    // peatones: cambia de carril o frena
    const av = this.peds.avoid(k, this);
    if (av === 'brake') { const di = 1; if (k.fs > 14) { inp.throttle = 0; inp.brake = k.fs > 22; } }
    else if (av != null) { const sA = T.S[(k.idx + 6) % T.N]; tx = sA.p.x + sA.right.x * av; tz = sA.p.z + sA.right.z * av; k.ai.lane = av / Math.max(1, sA.w); k.ai.laneT = 1.5; }
    // magnet target
    if (k.magT > 0 && k.magTarget) { tx = lerp(tx, k.magTarget.pos.x, 0.7); tz = lerp(tz, k.magTarget.pos.z, 0.7); }
    const want = Math.atan2(tx - k.pos.x, tz - k.pos.z);
    let d = angDiff(k.yaw, want);
    if (k.blindT > 0) { a.noise += (R() - 0.5) * dt * 8; a.noise *= 0.97; d += a.noise; }
    inp.steer = clamp(d * 2.4, -1, 1);
    if (a.scSlow && Math.abs(d) > 0.45 && k.fs > 16) { inp.throttle = 0; if (Math.abs(d) > 0.8) inp.brake = true; }
    // drift on bends
    const curv = Math.abs(T.S[(k.idx + 10) % T.N].curv);
    if (av === 'brake') { a.drift = false; return Object.assign(inp, { drift: false }); }
    a.drift = false;
    if (k.tc >= 1 && !k.air && k.spinT <= 0 && (curv < 0.12 || k.place > 4) && R() < dt * (1.2 + a.skill)) inp.driftEdge = true;
    // items
    if (k.item) {
      a.itemDelay -= dt;
      if (a.itemDelay <= 0) {
        const ahead = this.karts.find(o => o.place === k.place - 1), behind = this.karts.find(o => o.place === k.place + 1);
        const dA = ahead ? ahead.dist - k.dist : 999, dB = behind ? k.dist - behind.dist : 999;
        let use = false;
        switch (k.item) {
          case 'turbo': case 'seta': use = Math.abs(T.S[(k.idx + 15) % T.N].curv) < 0.15 || k.place > 5; break;
          case 'osito': use = dA < 40 || R() < dt * 0.2; break;
          case 'misil': use = !!ahead; break;
          case 'charco': use = dB < 25 || R() < dt * 0.1; break;
          case 'escudo': use = true; break;
          case 'iman': use = dA < 70 && dA > 5; break;
          case 'nube': use = k.place > 1; break;
          case 'triple': use = dA < 60 || R() < dt * 0.3; break;
          case 'bomba': use = dA < 35 || dB < 15 || R() < dt * 0.15; break;
          case 'rayo': use = k.place > 2 || R() < dt * 0.2; break;
          case 'nata': use = dA < 120 && dA > 3; break;
          case 'chupa': use = (dA < 40 || dB < 40); break;
        }
        if (use) inp.itemEdge = true;
      }
    }
    return inp;
  }

  // ---------------- physics ----------------
  stepKart(k, inp, dt) {
    const T = this.track;
    k.bumpCD -= dt; k.invT -= dt;
    // timers
    for (const t of ['boostT', 'turboT', 'tinyT', 'creamT', 'shieldT', 'magT', 'spinT', 'squashT', 'blindT']) if (k[t] > 0) k[t] = Math.max(0, k[t] - dt);
    if (k.megaT > 0) { k.megaT -= dt; if (k.megaT <= 0) { k.megaT = 0; if (k.isPlayer) Audio.sfxPlay('shrink'); } }
    k.megaS = lerp(k.megaS, k.megaT > 0 ? 2.1 : k.tinyT > 0 ? 0.55 : 1, 1 - Math.exp(-dt * 6));
    // item roulette
    if (k.rollT > 0) { k.rollT -= dt; if (k.isPlayer && Math.floor(k.rollT * 14) !== Math.floor((k.rollT + dt) * 14)) Audio.sfxPlay('roll'); if (k.rollT <= 0) { if (this.net && !this.netHost && k.isPlayer) { if (!this.pendingBox) { this.pendingBox = this.time; this.net.send({ t: 'box', id: k.netId, place: k.place }); } k.rollT = 0.05; if (this.time - this.pendingBox > 1.5) { this.pendingBox = null; k.rollT = 0; k.item = this.rollItem(k); Audio.sfxPlay('got'); } } else { k.item = this.rollItem(k); if (k.isPlayer) { Audio.sfxPlay('got'); } if (k.ai) k.ai.itemDelay = 0.4 + R() * 2.5; } } }
    if (inp.itemEdge && k.item && k.rollT <= 0) { if (this.net) this.net.send({ t: 'use', id: k.netId, it: k.item, yaw: k.yaw, x: k.pos.x, z: k.pos.z, fs: k.fs, idx: k.idx, tgt: (this.karts.find(o => o.place === k.place - 1) || {}).netId }); this.useItem(k); }
    const fr = T.frame(k.pos.x, k.pos.z, k.idx);
    const scY = T.inShortcut(k.pos.x, k.pos.z);
    const onRoad = Math.abs(fr.lat) <= fr.w + 1.6 || scY != null;
    const fwdX = Math.sin(k.yaw), fwdZ = Math.cos(k.yaw), rX = -fwdZ, rZ = fwdX;
    let fs = k.vx * fwdX + k.vz * fwdZ, ls = k.vx * rX + k.vz * rZ;
    // rubber band for AI
    let rb = 1;
    if (!k.isPlayer && !(this.net && this.net.count > 1)) { const rel = k.dist - this.player.dist; rb = this.difficulty * (rel < 0 ? 1 + Math.min(0.2, -rel / 300 * 0.2) : 1 - Math.min(0.14, rel / 260 * 0.14)); if (k.place === 1 && !this.player.finished) rb *= 0.985; }
    if (k.finished && !k.isPlayer) rb *= 0.9;
    let vmax = k.vmax * rb;
    if (!onRoad && k.boostT <= 0 && k.megaT <= 0) vmax *= 0.55;
    if (scY != null && k.turboT <= 0 && k.boostT <= 0 && k.megaT <= 0) vmax *= 0.72; // atajo: callejón de adoquines, sin turbo se va lento
    if (k.turboT > 0) vmax *= 1.55; else if (k.boostT > 0) vmax *= 1.38;
    vmax *= 1 + Math.min(TURBO.coinMax, k.coins) * TURBO.coinGain; if (k.tinyT > 0) vmax *= 0.8; if (k.creamT > 0 && !k.isPlayer) vmax *= 0.9;
    if (k.megaT > 0) vmax *= 1.2;
    if (k.magT > 0) vmax *= 1.25;
    if (k.squashT > 0) vmax *= 0.5;
    if (k.blindT > 0 && !k.isPlayer) vmax *= 0.85;
    const ctrl = k.spinT <= 0 && k.squashT <= 0.0;
    // throttle
    if (k.spinT > 0) fs *= Math.exp(-dt * 2.5);
    else if (inp.brake) { fs -= 34 * dt; if (fs < -9) fs = -9; }
    else if (inp.throttle > 0) { if (fs < vmax) fs += (vmax - fs) * k.acc * dt * (k.boostT > 0 ? 3 : 1) + (fs < 5 ? 6 * dt : 0); else fs += (vmax - fs) * 1.6 * dt; }
    else fs *= Math.exp(-dt * 0.8);
    // steering
    let tgt = ctrl ? clamp(inp.steer, -1, 1) : 0;
    if (k.isPlayer) { tgt = Math.sign(tgt) * Math.pow(Math.abs(tgt), 1 + STEER.expo); // curva analógica
      const grow = Math.abs(tgt) > Math.abs(k.steerS) && tgt * k.steerS >= 0; const rate = 1 / (grow ? STEER.rampIn : STEER.rampOut);
      k.steerS += clamp(tgt - k.steerS, -rate * dt, rate * dt); } else k.steerS = tgt;
    const steer = k.steerS;
    k.steerVis = lerp(k.steerVis, steer, 1 - Math.exp(-dt * 10));
    const spdK = clamp(Math.abs(fs) / STEER.lowSpeedFull, 0, 1) * Math.sign(fs || 1);
    const hiCut = 1 - STEER.highSpeedCut * clamp((Math.abs(fs) - 20) / 28, 0, 1);
    let yawRate;
    // TURBO recargable (sustituye al derrape): se carga solo para todos
    k.tc = Math.min(1, k.tc + dt / TURBO.charge);
    if (inp.driftEdge && !k.air && k.tc >= 1 && ctrl && !k.finished) this.fireTurbo(k);
    // (derrape eliminado en v4)
    const auto = false;
    let wantDir = Math.abs(steer) > (auto ? 0.15 : 0.3) ? Math.sign(steer) : 0;
    if (auto && !wantDir) { const a = T.S[(k.idx + 2) % T.N].fl; let best = 0; for (let j = 6; j <= 36; j += 3) { const b = T.S[(k.idx + j) % T.N].fl, cr = a.x * b.z - a.z * b.x; if (Math.abs(cr) > Math.abs(best)) best = cr; } wantDir = Math.abs(best) > 0.04 ? -Math.sign(best) : (k.lastDD || 1); }
    if (false && inp.drift && !k.air && k.driftDir === 0 && wantDir && fs > 12 && ctrl) { k.driftDir = wantDir; k.lastDD = wantDir; k.driftT = 0; k.vy = 3.2; k.air = true; k.hop = true; if (k.isPlayer) Audio.sfxPlay('drift'); }
    if (k.driftDir !== 0 && (!inp.drift || fs < 6 || !ctrl)) {
      const lvl = dlvl(k.driftT);
      if (lvl && ctrl) { k.boostT = Math.max(k.boostT, [0, 0.7, 1.1, 1.6][lvl]); if (k.isPlayer) { Audio.sfxPlay('mini', 1 + lvl * 0.25); this.msg(['', '¡Mini-turbo!', '¡Súper turbo!', '¡Turbo arcoíris!'][lvl], k, ['', '#7fd8ff', '#ffb36b', '#ff8fd8'][lvl]); } }
      k.dEnd = (!inp.drift ? 'suelto' : fs < 6 ? 'lento' : 'golpe') + '@' + this.raceT.toFixed(1);
      k.driftDir = 0; k.driftT = 0; k.dLvl = 0;
    }
    if (k.driftDir !== 0) {
      k.driftT += dt * (0.85 + 0.4 * Math.max(0, steer * k.driftDir));
      if (auto) { // forgiving drift: follow the road line, steer only nudges it
        const f = T.frame(k.pos.x, k.pos.z, k.idx), sAh = T.S[(k.idx + 6) % T.N], ty = Math.atan2(sAh.fl.x, sAh.fl.z);
        const back = clamp(f.lat / Math.max(4, f.w) * 0.35, -0.35, 0.35); // pull toward centre (+yaw reduces lat)
        yawRate = angDiff(k.yaw, ty + back + steer * STEER.autoDriftSteer) * 3.2 * Math.min(1, spdK + 0.3);
      } else yawRate = k.turn * (k.driftDir * 0.72 + steer * 0.45) * spdK;
      const lvl = dlvl(k.driftT);
      if (lvl > k.dLvl) { k.dLvl = lvl; if (k.isPlayer) { Audio.sfxPlay('level', 1 + lvl * 0.26); for (let i = 0; i < 10; i++) this.emit(k.pos.clone().add(new V3(0, 0.6, 0)), ['', '#7fd8ff', '#ffb36b', '#ff7fe0'][lvl], 0.8, 0.45); } }
      if (lvl && R() < (this.quality.hi ? 0.9 : 0.5)) for (const sd of [-1, 1]) { const p = k.pos.clone().add(new V3(-fwdX * 1.3 + rX * sd * 1.0, 0.35, -fwdZ * 1.3 + rZ * sd * 1.0)); this.emit(p, ['', '#7fd8ff', '#ffb36b', '#ff7fe0'][lvl], 0.55, 0.3); }
    } else { yawRate = k.turn * steer * spdK * (k.air ? 0.6 : 1) * (k.isPlayer ? hiCut : (1 - Math.min(0.3, Math.abs(fs) / 200)));
      if (k.isPlayer && ctrl && Math.abs(steer) < 0.3 && !k.air && fs > 4) { const sa = T.S[(k.idx + 5) % T.N], f0 = T.frame(k.pos.x, k.pos.z, k.idx); const ty = Math.atan2(sa.fl.x, sa.fl.z) + clamp(f0.lat / Math.max(4, f0.w), -1, 1) * 0.12, d = angDiff(k.yaw, ty);
        if (Math.abs(d) < STEER.assistMax) yawRate += d * STEER.assist * (1 - Math.abs(steer) / 0.3); } }
    if (k.spinT > 0) yawRate = 0;
    k.yaw += yawRate * dt;
    // grip
    const grip = (k.driftDir ? 2.6 : 8.5) * (k.megaT > 0 ? 1.2 : 1) * (T.grip < 1 && onRoad ? T.grip * (k.ch.stats.man >= 5 ? 1.35 : 1) : 1) * (k.air ? 0.15 : 1);
    ls *= Math.exp(-grip * dt);
    const nfX = Math.sin(k.yaw), nfZ = Math.cos(k.yaw);
    // re-project velocity onto new heading (keeps arcade feel)
    k.vx = nfX * fs + (-nfZ) * ls; k.vz = nfZ * fs + nfX * ls;
    // magnet pull
    if (k.magT > 0 && k.magTarget && !k.magTarget.finished) { const dx = k.magTarget.pos.x - k.pos.x, dz = k.magTarget.pos.z - k.pos.z, dd = Math.hypot(dx, dz); if (dd > 3 && dd < 90) { k.vx += dx / dd * 12 * dt; k.vz += dz / dd * 12 * dt; } if (R() < 0.5) this.emit(k.pos.clone().add(new V3(0, 1.5, 0)), '#ff6f8f', 0.5, 0.3); }
    k.pos.x += k.vx * dt; k.pos.z += k.vz * dt;
    // progress
    k.prevIdx = k.idx; k.idx = T.nearest(k.pos.x, k.pos.z, k.idx);
    let di = k.idx - k.prevIdx; if (di < -T.N / 2) di += T.N; if (di > T.N / 2) di -= T.N;
    k.dist += di * T.STEP;
    // walls
    const f2 = T.frame(k.pos.x, k.pos.z, k.idx), inSC = T.inShortcut(k.pos.x, k.pos.z);
    const wall = f2.wall - 0.6 * k.megaS;
    if (inSC == null && Math.abs(f2.lat) > wall) {
      const s = T.S[k.idx], sg = Math.sign(f2.lat), over = Math.abs(f2.lat) - wall;
      k.pos.x -= s.right.x * sg * over; k.pos.z -= s.right.z * sg * over;
      const vr = k.vx * s.right.x + k.vz * s.right.z;
      if (vr * sg > 0) { const rf = k.isPlayer ? 1.0 : 1.15; k.vx -= s.right.x * vr * rf; k.vz -= s.right.z * vr * rf; const kk = k.isPlayer ? Math.max(STEER.wallKeep, 1 - Math.abs(vr) / 160) : 1 - Math.min(0.3, Math.abs(vr) / 80); k.vx *= kk; k.vz *= kk;
        if (k.bumpCD <= 0 && Math.abs(vr) > 4) { k.bumpCD = 0.4; if (k.isPlayer) Audio.sfxPlay('bump'); for (let i = 0; i < 4; i++) this.emit(k.pos.clone().add(new V3(s.right.x * sg * 1.2, 0.8, s.right.z * sg * 1.2)), '#ffffff', 0.5, 0.3); }
        // steer heading back along the road a bit
        const ty = Math.atan2(s.fl.x, s.fl.z); if (Math.abs(angDiff(k.yaw, ty)) < 1.5) k.yaw += angDiff(k.yaw, ty) * (k.isPlayer ? STEER.wallAlign : 0.15); }
    }
    // height
    const gy = inSC != null ? Math.max(inSC, f2.y) : f2.y;
    for (const r of T.ramps) { if (!k.air && this.crossed(k, r.idx) && k.fs > 8) { k.vy = 6.5 + k.fs * 0.16; k.air = true; k.hop = false; k.airT = 0; k.trick = false; if (k.isPlayer) Audio.sfxPlay('jump'); } }
    if (k.air) {
      k.airT += dt; k.vy -= 30 * T.grav * dt; k.y += k.vy * dt;
      if (inp.driftEdge && !k.trick && !k.hop && k.airT > 0.08 && ctrl) { k.trick = true; k.trickT = 0; if (k.isPlayer) Audio.sfxPlay('trick'); }
      if (!k.isPlayer && !k.trick && !k.hop && k.airT > 0.15 && R() < 0.6 * dt * 10 && k.ai) k.trick = true, k.trickT = 0;
      if (k.y <= gy) { k.y = gy; k.vy = 0; k.air = false;
        if (k.trick) { k.boostT = Math.max(k.boostT, 0.85); k.trick = false; if (k.isPlayer) { Audio.sfxPlay('boost'); this.msg('¡Acrobacia!', k, '#7ff5ff'); } }
        else if (!k.hop && k.isPlayer) Audio.sfxPlay('land');
        k.hop = false; }
    } else { if (gy < k.y - 1.2 && k.fs > 15) { k.air = true; k.vy = 0; k.airT = 0; k.hop = false; } else k.y = gy; }
    k.pos.y = k.y;
    if (k.trick) k.trickT += dt;
    k.fs = nfX * k.vx + nfZ * k.vz;
    // pads
    for (const p of T.pads) { const dx = p.pos.x - k.pos.x, dz = p.pos.z - k.pos.z; if (!k.air && dx * dx + dz * dz < (p.r + 0.5) ** 2) { if (k.boostT < 0.9 && k.isPlayer) Audio.sfxPlay('boost'); k.boostT = Math.max(k.boostT, 1.0); } }
    // boxes
    for (const b of T.boxes) { if (b.t > 0) continue; const dx = b.pos.x - k.pos.x, dz = b.pos.z - k.pos.z; const r = 2.2 * k.megaS; if (dx * dx + dz * dz < r * r && Math.abs(b.pos.y - k.y - 1) < 3.5) { b.t = 2.2; if (k.isPlayer) Audio.sfxPlay('box'); for (let i = 0; i < 8; i++) this.emit(b.pos.clone(), ['#ff8fc0', '#ffe066', '#7ff5ff'][i % 3], 0.7, 0.5); if (!k.item && k.rollT <= 0) k.rollT = k.isPlayer ? 1.2 : 0.6; } }
    // obstacles
    for (const o of T.obstacles) { if (!o.active) continue; const p = o.g.position; const dx = p.x - k.pos.x, dz = p.z - k.pos.z; const yy = o.kind === 'bee' ? Math.abs(p.y - k.y - 1.5) < 2.5 : o.kind === 'lightning' ? true : Math.abs(p.y - k.y) < 3;
      if (yy && dx * dx + dz * dz < (o.r + 1.1 * k.megaS) ** 2) { if (k.megaT > 0 && o.kind !== 'lightning') continue; if (o.kind === 'lightning') { this.hitKart(k, 'rayo'); } else { this.hitKart(k, 'obst'); const d = Math.hypot(dx, dz) || 1; k.vx -= dx / d * 10; k.vz -= dz / d * 10; } } }
    // hazards (puddles)
    for (const h of this.hazards) { if (h.dead) continue; const dx = h.pos.x - k.pos.x, dz = h.pos.z - k.pos.z; if (k.sim && !k.air && dx * dx + dz * dz < (2.2 * k.megaS) ** 2 && !(h.owner === k && h.age < 0.8)) { h.dead = true; this.scene.remove(h.mesh); if (k.megaT <= 0) this.hitKart(k, 'charco', h.owner); } }
    // boost flame particles
    if ((k.boostT > 0 || k.megaT > 0) && R() < 0.8) this.emit(k.pos.clone().add(new V3(-nfX * 1.6 * k.megaS, 0.7, -nfZ * 1.6 * k.megaS)), k.megaT > 0 ? '#ff8fc0' : ['#ffffff', '#f0e6ff', '#e8f6ff'][Math.floor(R() * 3)], 1.3, 0.55, new V3(-nfX * 5 + (R() - 0.5) * 2, 1.2, -nfZ * 5 + (R() - 0.5) * 2));
    if (k.isPlayer) {
      if (k.boostT > k.lastBoost + 0.3) { this.kick = 1; Audio.sfxPlay('kick'); for (let i = 0; i < 14; i++) this.emit(k.pos.clone().add(new V3(0, 0.8, 0)), ['#ffd84a', '#ffffff', '#ff8fd8'][i % 3], 1.0, 0.4, new V3(-nfX * 14 + (R() - 0.5) * 8, R() * 5, -nfZ * 14 + (R() - 0.5) * 8)); }
      k.lastBoost = k.boostT;
      const sp = Math.abs(k.fs);
      if (sp > 30 && R() < (sp - 25) / 25) for (const sd of [-1, 1]) this.emit(k.pos.clone().add(new V3(-nfX * 1.2 + -nfZ * sd * 1.3, 0.5 + R() * 0.8, -nfZ * 1.2 + nfX * sd * 1.3)), '#ffffff', 0.25, 0.35, new V3(-nfX * sp * 0.25, 0, -nfZ * sp * 0.25));
      if (sp > 28) { const c = this.camera.position; for (let i = 0; i < (this.quality.hi ? 2 : 1); i++) { const fw = 10 + R() * 18, side = (R() < 0.5 ? -1 : 1) * (3 + R() * 6); this.emit(new V3(c.x + nfX * fw - nfZ * side, c.y - 1.5 + R() * 4, c.z + nfZ * fw + nfX * side), k.boostT > 0 ? '#ffe9a0' : '#ffffff', 0.18, 0.3, new V3(-nfX * 30, 0, -nfZ * 30)); } }
    }
    // laps
    const lapNow = Math.floor(k.dist / T.L);
    if (lapNow > k.lap && !k.finished) {
      k.lap = lapNow;
      if (k.lap >= this.laps) { k.finished = true; k.finishTime = this.raceT; if (this.net) this.net.send({ t: 'fin', id: k.netId, t2: k.finishTime }); if (k.isPlayer) { Audio.sfxPlay('finish'); this.app.ui.finishBanner(k.place); if (k.place === 1) { this.fireworks = true; T.cheer = 3; } } }
      else if (k.isPlayer) { Audio.sfxPlay('lap'); this.msg(k.lap === this.laps - 1 ? '🏁 ¡ÚLTIMA VUELTA! 🏁' : `Vuelta ${k.lap + 1}`, k, '#ffffff'); if (k.lap === this.laps - 1) { this.lastLap = true; if (Audio.song) Audio.song.spb *= 0.86; this.app.ui.bigBanner && this.app.ui.bigBanner('¡ÚLTIMA VUELTA!'); } }
    }
    // wrong way / stuck
    const s = T.S[k.idx]; const dirDot = nfX * s.fl.x + nfZ * s.fl.z;
    k.wrongT = dirDot < -0.4 && Math.abs(k.fs) > 3 ? k.wrongT + dt : 0;
    if (Math.abs(k.fs) < 3 && k.spinT <= 0 && k.squashT <= 0 && this.state !== 'countdown') k.stuckT += dt; else k.stuckT = Math.max(0, k.stuckT - dt);
    if ((!k.isPlayer || this.app.autopilot) ? (k.stuckT > 2.5 || k.wrongT > 2.5) : (k.stuckT > 3.5 || k.wrongT > 3.5)) { this.respawn(k); if (k.isPlayer) this.msg('¡De vuelta a la pista!', k, '#7ff5ff'); }
    this.placeKartMesh(k, dt);
  }
  crossed(k, idx) { const N = this.track.N; const a = k.prevIdx, b = k.idx; const da = (idx - a + N) % N, db = (b - a + N) % N; return db < N / 2 && da > 0 && da <= db; }
  respawn(k) {
    this.respawns = (this.respawns || 0) + 1; (this.respawnLog ||= []).push(k.ch.id + "@" + k.idx);
    const T = this.track, i = (k.idx + 2) % T.N, s = T.S[i];
    k.pos.set(s.p.x, s.p.y + 1, s.p.z); k.y = s.p.y; k.yaw = Math.atan2(s.fl.x, s.fl.z); k.vx = k.vz = 0; k.fs = 0; k.stuckT = 0; k.wrongT = 0; k.invT = 1.5; k.air = false; k.driftDir = 0; k.spinT = 0;
  }
  placeKartMesh(k, dt) {
    const m = k.mesh, u = m.userData;
    m.position.copy(k.pos); m.rotation.y = k.yaw;
    m.scale.setScalar(k.megaS * (k.isPlayer ? 1.15 : 1));
    const tilt = u.tilt;
    let ry = k.driftDir * 0.42 + k.steerVis * 0.12, rz = -k.steerVis * 0.08 - k.driftDir * 0.06, rx = 0;
    if (k.spinT > 0) ry += (1.1 - k.spinT) * 14;
    if (k.trick) { const p = Math.min(1, k.trickT / 0.45); rz += p * Math.PI * 2 * (k.ch.id.length % 2 ? 1 : -1); }
    if (k.air && !k.trick) rx = -clamp(k.vy * 0.02, -0.3, 0.3);
    tilt.rotation.set(rx, ry, rz);
    const sq = k.squashT > 0 ? 0.28 : 1;
    tilt.scale.set(1 / Math.sqrt(sq) * (k.squashT > 0 ? 0.9 : 1), lerp(tilt.scale.y, sq, 1 - Math.exp(-dt * 18)), 1 / Math.sqrt(sq) * (k.squashT > 0 ? 0.9 : 1));
    u.shadow.position.y = -(k.y - (this.track.frame(k.pos.x, k.pos.z, k.idx).y)) / k.megaS + 0.06;
    k.shield.visible = k.shieldT > 0;
    m.visible = !(k.invT > 0 && Math.floor(k.invT * 12) % 2);
    if (k.exprT > 0) k.exprT -= dt;
    const expr = k.squashT > 0 || k.spinT > 0 ? 'squash' : k.exprT > 0 ? k.expr : '';
    const fl = u.flame; fl.visible = k.boostT > 0 || k.megaT > 0;
    if (fl.visible) { const f = 1 + (k.isPlayer ? this.kick * 0.3 : 0); fl.scale.set(f, f, f * (1 + Math.min(0.5, k.boostT * 0.3))); for (const p of fl.userData.puffs || []) { const w = 1 + Math.sin(this.time * 11 + p.userData.ph) * 0.18; p.scale.setScalar(p.userData.base * w); } }
    animKart(m, this.time, Math.abs(k.fs), expr);
    // squash stars
    if (k.squashT > 0 && R() < 0.3) this.emit(k.pos.clone().add(new V3((R() - 0.5) * 2, 1.2, (R() - 0.5) * 2)), '#ffe066', 0.5, 0.5);
    if (k.blindT > 0 && R() < 0.3) this.emit(k.pos.clone().add(new V3((R() - 0.5) * 2, 2.6, (R() - 0.5) * 2)), '#fff6a0', 0.6, 0.5);
  }
  collideKarts() {
    const K = this.karts;
    for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) {
      const a = K[i], b = K[j]; const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, dy = Math.abs(b.y - a.y);
      const r = 1.45 * (a.megaS + b.megaS); const d2 = dx * dx + dz * dz;
      if (d2 > r * r || dy > 2.5 * Math.max(a.megaS, b.megaS)) continue;
      const d = Math.sqrt(d2) || 0.01, nx = dx / d, nz = dz / d, over = r - d;
      if (!a.sim && !b.sim) continue;
      if (a.megaT > 0 && b.megaT <= 0) { if (b.sim) this.squash(b, a); continue; }
      if (b.megaT > 0 && a.megaT <= 0) { if (a.sim) this.squash(a, b); continue; }
      const wa = a.weight * a.megaS, wb = b.weight * b.megaS; let ta = wb / (wa + wb), tb = wa / (wa + wb);
      if (!a.sim) { ta = 0; tb = 1; } if (!b.sim) { tb = 0; ta = 1; }
      a.pos.x -= nx * over * ta; a.pos.z -= nz * over * ta; b.pos.x += nx * over * tb; b.pos.z += nz * over * tb;
      const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      if (rv < 0) { const imp = -rv * 1.3; a.vx -= nx * imp * ta; a.vz -= nz * imp * ta; b.vx += nx * imp * tb; b.vz += nz * imp * tb; if ((a.isPlayer || b.isPlayer) && imp > 3 && a.bumpCD <= 0) { a.bumpCD = 0.3; Audio.sfxPlay('bump'); } }
    }
  }
  squash(v, by) {
    if (v.squashT > 0 || v.invT > 0) return;
    if (v.shieldT > 0) { v.shieldT = 0; Audio.sfxPlay('pop'); v.invT = 0.6; return; }
    v.squashT = 2.0; v.vx *= 0.3; v.vz *= 0.3; v.driftDir = 0; v.lastHitBy = by;
    Audio.sfxPlay('squash');
    for (let i = 0; i < 14; i++) this.emit(v.pos.clone().add(new V3(0, 0.6, 0)), ['#ffe066', '#ffffff', '#ff8fc0'][i % 3], 0.8, 0.6, new V3((R() - 0.5) * 14, R() * 6, (R() - 0.5) * 14));
    if (v.isPlayer) this.msg('¡Te han chafado!', v, '#ff8fb0');
    if (by.isPlayer) { this.msg('¡CHAF! ¡Chafado ' + v.pname + '!', by, '#ffd84a'); this.stats.squashes = (this.stats.squashes || 0) + 1; }
  }
  hitKart(k, why, by) {
    if (k.invT > 0 || k.spinT > 0) return false;
    if (k.megaT > 0) return false;
    if (k.shieldT > 0) { k.shieldT = 0; k.invT = 0.6; Audio.sfxPlay('pop'); if (k.isPlayer) this.msg('¡El escudo te ha salvado!', k, '#7ff5ff'); return false; }
    k.spinT = why === 'charco' ? 1.0 : 1.15; k.driftDir = 0; k.boostT = 0; k.lastHitBy = by;
    if (why === 'misil' || why === 'rayo' || why === 'bomba') { k.vy = 7; k.air = true; k.hop = true; }
    if (k.isPlayer || (by && by.isPlayer)) Audio.sfxPlay('hit');
    if (k.isPlayer) this.msg({ charco: '¡Resbalón!', rayo: '¡Zas! ¡Un rayo!', obst: '¡Ay!', misil: '¡Caramelazo!', osito: '¡Osito al canto!', bomba: '¡Bomba de gelatina!' }[why] || '¡Ay!', k, '#ff8fb0');
    if (k.isPlayer && by && by !== k) setTimeout(() => this.msg('¡' + by.pname + ' te ha dado!', k, '#ff8fb0'), 700);
    if (by && by.isPlayer && !k.isPlayer) { this.stats.hits = (this.stats.hits || 0) + 1; const now = this.raceT; this.combo = now - (this.lastHitT || -9) < 5 ? (this.combo || 1) + 1 : 1; this.lastHitT = now; this.msg(this.combo > 1 ? `¡COMBO x${this.combo}! ¡Le das a ${k.pname}!` : '¡Le has dado a ' + k.pname + '!', by, '#ffd84a'); }
    (this.stats.hitLog ||= []).push([by ? by.pname : '-', k.pname, why]);
    for (let i = 0; i < 10; i++) this.emit(k.pos.clone().add(new V3(0, 1, 0)), ['#ffe066', '#ffffff'][i % 2], 0.6, 0.5, new V3((R() - 0.5) * 10, R() * 7, (R() - 0.5) * 10));
    return true;
  }
  announce() {
    const P = this.player; if (!P || this.state !== 'race') return; if (this.lastPlace == null) { this.lastPlace = P.place; return; }
    if (P.place < this.lastPlace && this.raceT > 3 && this.raceT - (this.annT || 0) > 1.6) { this.annT = this.raceT; const o = this.karts.find(x => x.place === P.place + 1); this.msg(P.place === 1 ? '👑 ¡Te pones primero!' : '¡Adelantas a ' + (o ? o.pname : '') + '!', P, '#9fff8a'); this.stats.overtakes = (this.stats.overtakes || 0) + 1; }
    this.lastPlace = P.place;
  }
  fireTurbo(k) {
    k.tc = 0; k.turboT = TURBO.dur; k.boostT = Math.max(k.boostT, TURBO.dur); (this.stats.turbos ||= {})[k.pname] = (this.stats.turbos[k.pname] || 0) + 1;
    if (k.isPlayer) { Audio.sfxPlay('boost'); Audio.sfxPlay('kick'); this.kick = 1.4; this.msg('¡TURBO!', k, '#ff9f4a'); }
    for (let i = 0; i < 18; i++) this.emit(k.pos.clone().add(new V3(0, 0.8, 0)), ['#ffffff', '#f0e6ff', '#fff6d0'][i % 3], 1.5, 0.6, new V3(-Math.sin(k.yaw) * 16 + (R() - 0.5) * 8, R() * 5, -Math.cos(k.yaw) * 16 + (R() - 0.5) * 8));
  }
  buildCoins() {
    const T = this.track; this.coins = []; const n = Math.round(T.L / 70); const g = new THREE.CylinderGeometry(0.75, 0.75, 0.22, 16); g.rotateZ(Math.PI / 2);
    const m = new THREE.MeshToonMaterial({ color: '#ffd23a', emissive: '#ffb000', emissiveIntensity: 0.45 });
    this.coinMesh = new THREE.InstancedMesh(g, m, n * 3); this.coinMesh.frustumCulled = false; this.scene.add(this.coinMesh);
    for (let j = 0; j < n; j++) { const i = (Math.floor((j + 0.5) / n * T.N) + 7) % T.N, s = T.S[i], lat = (((j * 7) % 5) - 2) / 2 * s.w * 0.32;
      for (let c = 0; c < 3; c++) { const ii = (i + c * 2) % T.N, q = T.S[ii]; this.coins.push({ idx: ii, x: q.p.x + q.right.x * lat, y: q.p.y + 1.1, z: q.p.z + q.right.z * lat, off: 0 }); } }
  }
  updCoins(dt) {
    if (!this.coins) return; const M = this.coinMesh, mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), N = this.track.N;
    this.coins.forEach((c, i) => { if (c.off > 0) c.off -= dt;
      for (const k of this.karts) { if (c.off > 0 || !k.sim || k.air && k.y > c.y + 2) continue; const di = Math.abs(((k.idx - c.idx) % N + N + N / 2) % N - N / 2); if (di > 2) continue;
        if ((k.pos.x - c.x) ** 2 + (k.pos.z - c.z) ** 2 < 4.4 * k.megaS) { c.off = 9; if (k.coins < TURBO.coinMax) k.coins++; k.tc = Math.min(1, k.tc + 0.06); if (k.isPlayer) { Audio.sfxPlay('mini', 1.6); this.stats.coins = (this.stats.coins || 0) + 1; if (k.coins % 3 === 0) this.msg(`¡${k.coins} monedas! +velocidad`, k, '#ffd23a'); } } }
      const sc = c.off > 0 ? 0.001 : 1; mt.compose(new V3(c.x, c.y + Math.sin(this.time * 3 + i) * 0.2, c.z), q.setFromEuler(e.set(0, this.time * 3 + i, 0)), new V3(sc, sc, sc)); M.setMatrixAt(i, mt); });
    M.instanceMatrix.needsUpdate = true;
  }
  raceEvents(dt) {
    if (this.state !== 'race' || (this.net && !this.netHost)) return; this.evT = (this.evT ?? TURBO.eventEvery) - dt; if (this.evT > 0) return; this.evT = TURBO.eventEvery; this.evN = (this.evN || 0) + 1;
    this.applyEvent(this.evN % 2 ? 'turbo' : 'cajas'); if (this.net) this.net.send({ t: 'ev', e: this.evN % 2 ? 'turbo' : 'cajas' });
  }
  applyEvent(e) {
    (this.stats.events ||= []).push(e + '@' + this.raceT.toFixed(0));
    if (e === 'turbo') { for (const k of this.karts) if (k.sim) k.tc = 1; this.msg('⚡ ¡TURBO PARA TODOS! ⚡', this.player, '#ff9f4a'); Audio.sfxPlay('stars'); }
    else { for (const k of this.karts) if (k.sim && !k.item && k.rollT <= 0 && !k.finished) k.rollT = 1.0; this.msg('🎁 ¡Lluvia de regalos! 🎁', this.player, '#ffd84a'); }
  }
  get laps() { return this.lapsN || CONFIG.laps; }
  // ---------------- peatones ----------------
  onPedHit(k, p, m, local) {
    const near = this.player && k.pos.distanceTo(this.player.pos) < 70;
    if (near) { Audio.sfxPlay('boing', k.megaT > 0 ? 0.8 : 1 + Math.random() * 0.2); for (let i = 0; i < 12; i++) this.emit(m.g.position.clone().add(new V3(0, 2, 0)), ['#ffe066', '#ff8fc0', '#7ff5ff'][i % 3], 0.8, 0.6, new V3((R() - 0.5) * 10, 4 + R() * 6, (R() - 0.5) * 10)); }
    if (k.isPlayer) { this.stats.peds = (this.stats.peds || 0) + 1; this.msg(k.megaT > 0 ? '¡BOING! ' + p.name + ' sale volando (¡tranqui, rebota!)' : '¡Boing! Cuidado con ' + p.name, k, '#ffb3e0'); }
  }
  // ---------------- red ----------------
  netSendTick(dt) {
    this.netT -= dt; if (this.netT > 0) return; this.netT = 0.05;
    const a = []; const r2 = v => Math.round(v * 100) / 100;
    for (const k of this.karts) if (k.sim || (this.netHost && k.netState)) {
      if (!k.sim && this.netHost) { a.push(k.netState.raw); continue; }
      a.push([k.netId, r2(k.pos.x), r2(k.y), r2(k.pos.z), r2(k.yaw), r2(k.vx), r2(k.vz), k.driftDir, r2(k.dist), k.lap, (k.boostT > 0 ? 1 : 0) | (k.megaT > 0 ? 2 : 0) | (k.shieldT > 0 ? 4 : 0) | (k.spinT > 0 ? 8 : 0) | (k.squashT > 0 ? 16 : 0) | (k.blindT > 0 ? 32 : 0) | (k.finished ? 64 : 0) | (k.air ? 128 : 0) | (k.tinyT > 0 ? 256 : 0) | (k.turboT > 0 ? 512 : 0) | (k.creamT > 0 ? 1024 : 0), r2(k.finishTime), k.item ? 1 : 0]);
    }
    this.net.send({ t: 'st', a, rt: this.raceT });
  }
  netRecvTick() {
    const q = this.netQ || []; this.netQ = [];
    for (const d of q) this.netMsg(d);
  }
  netMsg(d) {
    const net = this.net;
    if (d.t === 'st') { for (const raw of d.a) { const k = this.byId.get(raw[0]); if (!k || k.sim) continue; k.netState = { raw, at: this.time }; } }
    else if (d.t === 'go') { this.goNow = true; }
    else if (d.t === 'box' && this.netHost) { const k = this.byId.get(d.id); if (k) { const it = this.rollItem(k); net.send({ t: 'item', id: d.id, it }); } }
    else if (d.t === 'ev') this.applyEvent(d.e);
    else if (d.t === 'item') { const k = this.byId.get(d.id); if (k && k.sim) { this.pendingBox = null; k.rollT = 0; k.item = d.it; if (k.isPlayer) Audio.sfxPlay('got'); } }
    else if (d.t === 'use') { const k = this.byId.get(d.id); if (k && !k.sim) { k.pos.x = d.x; k.pos.z = d.z; k.yaw = d.yaw; k.fs = d.fs; k.idx = d.idx; k.item = d.it; const tg = d.tgt ? this.byId.get(d.tgt) : null; this.useItem(k, tg); } }
    else if (d.t === 'fin') { const k = this.byId.get(d.id); if (k && !k.sim && !k.finished) { k.finished = true; k.finishTime = d.t2; } }
    else if (d.t === 'results') { this.netResults = d.order; for (const r of d.order) { const k = this.byId.get(r.id); if (k && !k.sim) { k.finished = r.fin; k.finishTime = r.t; } } if (this.state === 'race' && !this.player.finished) { /* el anfitrión cerró la carrera */ this.player.finished = true; this.state = 'finish'; this.finishT = 0; } }
    else if (d.t === 'left') this.netDrop(d.id);
  }
  netDrop(id) { const k = this.byId.get(id); if (!k || k.sim || k.finished) return; if (this.netHost) { this.toBot(k); this.msg(k.pname + ' se ha desconectado: le sustituye un bot', this.player, '#ffd84a'); } }
  toBot(k) { k.sim = true; k.kind = 'bot'; k.ai = { name: 'piloto', laneAmp: 0.25, lane: 0, laneT: 0, aggr: 0.5, skill: 0.97, itemDelay: 1, drift: false, takeSC: null, noise: 0 }; }
  netLostHost() { if (this.netHost) return; this.netHost = true; for (const k of this.karts) if (!k.sim && !k.isPlayer) this.toBot(k); this.goNow = true; }
  netKart(k, dt) {
    const st = k.netState; if (st) {
      const [, x, y, z, yaw, vx, vz, dd, dist, lap, fl, ft, hasItem] = st.raw; const age = Math.min(0.3, this.time - st.at);
      const px = x + vx * age, pz = z + vz * age, kk = 1 - Math.exp(-dt * 12);
      if (Math.hypot(px - k.pos.x, pz - k.pos.z) > 25) { k.pos.x = px; k.pos.z = pz; } else { k.pos.x += (px - k.pos.x) * kk; k.pos.z += (pz - k.pos.z) * kk; }
      k.y += (y - k.y) * kk; k.pos.y = k.y; k.yaw += angDiff(k.yaw, yaw) * kk; k.vx = vx; k.vz = vz; k.fs = Math.hypot(vx, vz);
      k.driftDir = dd; k.dist = dist; k.lap = lap; k.air = !!(fl & 128); k.tinyT = fl & 256 ? 0.2 : 0; k.turboT = fl & 512 ? 0.2 : 0; k.creamT = fl & 1024 ? 0.2 : 0;
      k.boostT = fl & 1 ? 0.2 : 0; k.megaT = fl & 2 ? Math.max(k.megaT, 0.2) : 0; k.shieldT = fl & 4 ? 0.2 : 0; k.spinT = fl & 8 ? Math.max(k.spinT, 0.3) : 0; k.squashT = fl & 16 ? 0.3 : 0; k.blindT = fl & 32 ? 0.2 : 0;
      if (fl & 64 && !k.finished) { k.finished = true; k.finishTime = ft; }
      k.megaS = lerp(k.megaS, k.megaT > 0 ? 2.1 : 1, 1 - Math.exp(-dt * 6)); k.spinT = Math.max(0, k.spinT - dt);
      k.prevIdx = k.idx; k.idx = this.track.nearest(k.pos.x, k.pos.z, k.idx);
    }
    this.placeKartMesh(k, dt);
  }
  get stats() { return this._stats || (this._stats = {}); }

  // ---------------- items ----------------
  rollItem(k) {
    if (this.forceItem && k.isPlayer) { const f = this.forceItem; this.forceItem = null; return f; }
    const f = (k.place - 1) / (this.karts.length - 1);
    const w = ITEM_KEYS.map(key => { const [a, b, c] = ITEM_W[key]; return f < 0.5 ? lerp(a, b, f * 2) : lerp(b, c, (f - 0.5) * 2); });
    let tot = w.reduce((a, b) => a + b, 0), r = R() * tot;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return ITEM_KEYS[i]; }
    return 'turbo';
  }
  useItem(k, forceTarget) {
    const it = k.item; k.item = null; const T = this.track;
    const fX = Math.sin(k.yaw), fZ = Math.cos(k.yaw);
    (this.stats.used ||= {}); if (k.isPlayer) this.stats.used[it] = (this.stats.used[it] || 0) + 1;
    const ahead = forceTarget !== undefined ? forceTarget : this.karts.find(o => o.place === k.place - 1);
    switch (it) {
      case 'turbo': k.boostT = Math.max(k.boostT, 1.7); if (k.isPlayer) { Audio.sfxPlay('boost'); this.msg('¡Turbo arcoíris!', k, '#ff8fd8'); } break;
      case 'seta': k.megaT = 6.5; k.spinT = 0; k.squashT = 0; if (k.isPlayer) { Audio.sfxPlay('grow'); this.msg('¡SETA GIGANTE!', k, '#ff8fc0'); } else if (k.pos.distanceTo(this.player.pos) < 80) Audio.sfxPlay('grow'); break;
      case 'escudo': k.shieldT = 14; if (k.isPlayer) Audio.sfxPlay('shield'); break;
      case 'iman': k.magT = 3.2; k.magTarget = ahead || null; if (k.isPlayer) { Audio.sfxPlay('magnet'); this.msg(ahead ? '¡Imán hacia ' + ahead.pname + '!' : '¡Imán!', k, '#ff6f8f'); } break;
      case 'nube': { let n = 0; for (const o of this.karts) if (o.place < k.place && !o.finished && o.sim) { if (o.shieldT > 0) { o.shieldT = 0; continue; } o.blindT = 3.2; n++; }
        if (k.isPlayer || this.player.blindT > 0) Audio.sfxPlay('stars'); if (k.isPlayer) this.msg(n ? `¡Deslumbras a ${n}!` : '¡Nube estrellada!', k, '#fff6a0');
        else if (this.player.place < k.place) this.msg('¡' + k.pname + ' te ha deslumbrado!', this.player, '#fff6a0'); break; }
      case 'triple': { for (const da of [-0.13, 0, 0.13]) { const m = makeProjectile('osito'); m.scale.setScalar(0.8); this.scene.add(m); const fx = Math.sin(k.yaw + da), fz = Math.cos(k.yaw + da);
          this.projs.push({ type: 'osito', mesh: m, owner: k, pos: k.pos.clone().add(new V3(fx * 3.2 * k.megaS, 0, fz * 3.2 * k.megaS)), dir: new V3(fx, 0, fz), speed: Math.max(0, k.fs) + 28, life: 5, idx: k.idx, age: 0, target: null, lat: 0 }); }
        if (k.isPlayer || k.pos.distanceTo(this.player.pos) < 60) Audio.sfxPlay('throw'); if (k.isPlayer) this.msg('¡Triple gominola!', k, '#ff6fa0'); break; }
      case 'bomba': { const back = k.isPlayer ? false : (this.karts.find(o => o.place === k.place + 1) && !ahead); const sg = back ? -1 : 1; const m = makeBomba(); this.scene.add(m);
        this.projs.push({ type: 'bomba', mesh: m, owner: k, pos: k.pos.clone().add(new V3(fX * 2.5 * sg, 1.5, fZ * 2.5 * sg)), dir: new V3(fX * sg, 0, fZ * sg), speed: back ? 10 : Math.max(0, k.fs) + 16, vy: back ? 5 : 9, life: 3, idx: k.idx, age: 0 });
        if (k.isPlayer || k.pos.distanceTo(this.player.pos) < 60) Audio.sfxPlay('throw'); break; }
      case 'rayo': { let n = 0; for (const o of this.karts) if (o.place < k.place && !o.finished && o.sim) { if (this.hitKart(o, 'rayo', k)) { o.tinyT = 4.5; n++; } }
        if (k.isPlayer) this.msg(n ? `¡Rayo chiquitín! Encoges a ${n}` : '¡Rayo chiquitín!', k, '#a8e0ff'); else if (this.player.place < k.place && this.player.tinyT > 0) this.msg('¡' + k.pname + ' te ha encogido!', this.player, '#a8e0ff');
        if (k.isPlayer || this.player.tinyT > 0) Audio.sfxPlay('stars'); this.flashSky = 0.6; break; }
      case 'nata': { const tg = this.karts.filter(o => o !== k && (o === ahead || (o.place < k.place && o.place >= k.place - 2)) && !o.finished); for (const o of tg) { if (o.shieldT > 0) { if (o.sim) o.shieldT = 0; continue; } if (o.sim) o.creamT = 3.2; if (o.isPlayer) this.msg('¡' + k.pname + ' te ha llenado de nata!', o, '#fff'); for (let i = 0; i < 12; i++) this.emit(o.pos.clone().add(new V3(0, 1.4, 0)), '#ffffff', 0.9, 0.7, new V3((R() - 0.5) * 8, R() * 6, (R() - 0.5) * 8)); }
        if (k.isPlayer) { Audio.sfxPlay('squash'); this.msg(tg.length ? '¡Nata para ' + tg.map(o => o.pname).join(' y ') + '!' : '¡Nata!', k, '#ffffff'); } break; }
      case 'chupa': { let best = null, bd = 60; for (const o of this.karts) { if (o === k || o.finished) continue; const d = o.pos.distanceTo(k.pos); if (d < bd) { bd = d; best = o; } }
        k.tc = 1; if (best) { if (best.sim) { best.tc = 0; best.turboT = 0; best.boostT = 0; } if (best.isPlayer) this.msg('¡' + k.pname + ' te ha chupado el turbo!', best, '#ff9f4a'); }
        if (k.isPlayer) { Audio.sfxPlay('magnet'); this.msg(best ? '¡Le robas el turbo a ' + best.pname + '!' : '¡Turbo lleno!', k, '#ff9f4a'); } break; }
      case 'osito': case 'misil': {
        const m = makeProjectile(it); this.scene.add(m);
        const p = { type: it, mesh: m, owner: k, pos: k.pos.clone().add(new V3(fX * 3.2 * k.megaS, 0, fZ * 3.2 * k.megaS)), dir: new V3(fX, 0, fZ), speed: Math.max(0, k.fs) + (it === 'osito' ? 26 : 20), life: it === 'osito' ? 6 : 9, idx: k.idx, age: 0, target: it === 'misil' ? ahead : null, lat: T.frame(k.pos.x, k.pos.z, k.idx).lat };
        this.projs.push(p); if (k.isPlayer || k.pos.distanceTo(this.player.pos) < 60) Audio.sfxPlay(it === 'osito' ? 'throw' : 'missile');
        if (it === 'misil' && p.target && p.target.isPlayer) this.msg('¡Cuidado! ¡Misil de caramelo!', p.target, '#ff6f9a');
        break; }
      case 'charco': { const m = makeProjectile('charco'); const pos = k.pos.clone().add(new V3(-fX * 3.5 * k.megaS, 0, -fZ * 3.5 * k.megaS)); const i = T.nearest(pos.x, pos.z, k.idx, 20, 5); pos.y = T.frame(pos.x, pos.z, i).y; m.position.copy(pos); this.scene.add(m); this.hazards.push({ mesh: m, pos, owner: k, age: 0, life: 28 }); if (k.isPlayer) Audio.sfxPlay('throw'); break; }
    }
  }
  updateProjectiles(dt) {
    const T = this.track;
    for (const h of this.hazards) { h.age += dt; if (h.age > h.life && !h.dead) { h.dead = true; this.scene.remove(h.mesh); } }
    this.hazards = this.hazards.filter(h => !h.dead);
    for (const p of this.projs) {
      p.age += dt; p.life -= dt;
      if (p.type === 'osito') {
        p.pos.addScaledVector(p.dir, p.speed * dt);
        p.idx = T.nearest(p.pos.x, p.pos.z, p.idx, 30, 40); const f = T.frame(p.pos.x, p.pos.z, p.idx); const s = T.S[p.idx];
        if (T.inShortcut(p.pos.x, p.pos.z) == null && Math.abs(f.lat) > f.wall - 1) { const sg = Math.sign(f.lat); p.pos.x -= s.right.x * sg * (Math.abs(f.lat) - f.wall + 1); p.pos.z -= s.right.z * sg * (Math.abs(f.lat) - f.wall + 1); const vr = p.dir.x * s.right.x + p.dir.z * s.right.z; p.dir.x -= 2 * vr * s.right.x; p.dir.z -= 2 * vr * s.right.z; }
        p.pos.y = f.y + Math.abs(Math.sin(p.age * 7)) * 1.6; p.mesh.position.copy(p.pos); p.mesh.rotation.y = Math.atan2(p.dir.x, p.dir.z) + p.age * 6;
      } else if (p.type === 'bomba') {
        p.pos.addScaledVector(p.dir, p.speed * dt); p.vy -= 22 * dt; p.pos.y += p.vy * dt; p.idx = T.nearest(p.pos.x, p.pos.z, p.idx, 30, 40); const gy = T.frame(p.pos.x, p.pos.z, p.idx).y + 0.6;
        if (p.pos.y < gy) { p.pos.y = gy; p.vy = Math.abs(p.vy) * 0.45; p.speed *= 0.6; }
        p.mesh.position.copy(p.pos); p.mesh.rotation.x += dt * 8; const near = this.karts.some(o => o !== p.owner && o.pos.distanceTo(p.pos) < 4.5);
        if (p.age > 1.4 || near) { p.life = 0; let n = 0; for (const o of this.karts) { if (o.pos.distanceTo(p.pos) < 9 && !(o === p.owner && p.age < 0.8)) { if (o.sim && this.hitKart(o, 'bomba', p.owner)) n++; } }
          for (let i = 0; i < 30; i++) this.emit(p.pos.clone().add(new V3(0, 1, 0)), ['#7fe08a', '#ffffff', '#c0ff9a'][i % 3], 1.2, 0.8, new V3((R() - 0.5) * 22, R() * 12, (R() - 0.5) * 22));
          if (p.pos.distanceTo(this.player.pos) < 80) { Audio.sfxPlay('squash'); this.kick = Math.max(this.kick, 0.5); } if (p.owner.isPlayer && n) this.msg(`¡BUM! Pillas a ${n}`, p.owner, '#7fe08a'); }
        if (p.life <= 0) { this.scene.remove(p.mesh); p.dead = true; } continue;
      } else if (p.type === 'misil') {
        let tgt = p.target && !p.target.finished ? p.target : null;
        if (tgt && tgt.pos.distanceTo(p.pos) < 22) { const d = new V3().subVectors(tgt.pos, p.pos); d.y = 0; d.normalize(); p.dir.lerp(d, 1 - Math.exp(-dt * 8)).normalize(); p.pos.addScaledVector(p.dir, 58 * dt); p.idx = T.nearest(p.pos.x, p.pos.z, p.idx, 20, 40); }
        else { // follow the track
          const steps = Math.max(1, Math.round(56 * dt / T.STEP)); p.idx = (p.idx + steps) % T.N; const s = T.S[p.idx];
          const wantLat = tgt ? clamp(T.frame(tgt.pos.x, tgt.pos.z, tgt.idx).lat, -s.w, s.w) : 0; p.lat = lerp(p.lat, wantLat, 1 - Math.exp(-dt * 2));
          const np = new V3(s.p.x + s.right.x * p.lat, s.p.y, s.p.z + s.right.z * p.lat); p.dir.subVectors(np, p.pos).setY(0).normalize(); p.pos.copy(np); }
        p.pos.y = T.frame(p.pos.x, p.pos.z, p.idx).y + 0.4; p.mesh.position.copy(p.pos); p.mesh.rotation.y = Math.atan2(p.dir.x, p.dir.z); p.mesh.userData.spin.rotation.z = p.age * 10;
        if (R() < 0.7) this.emit(p.pos.clone().add(new V3(-p.dir.x * 1.5, 1, -p.dir.z * 1.5)), ['#ff8fc0', '#ffffff'][Math.floor(R() * 2)], 0.6, 0.35);
      }
      // collisions
      for (const k of this.karts) { if (k === p.owner && p.age < 0.6) continue; if (k.finished && !k.isPlayer) continue; const dx = k.pos.x - p.pos.x, dz = k.pos.z - p.pos.z; const r = 1.9 * k.megaS;
        if (dx * dx + dz * dz < r * r && Math.abs(k.y - (p.pos.y - (p.type === 'misil' ? 0.4 : 0))) < 3 * k.megaS) { if (k.sim) this.hitKart(k, p.type, p.owner); p.life = 0; for (let i = 0; i < 10; i++) this.emit(p.pos.clone().add(new V3(0, 1, 0)), p.type === 'osito' ? '#ff6fa0' : '#ffe066', 0.7, 0.5); break; } }
      // projectile vs projectile / hazards
      for (const h of this.hazards) { if (h.dead) continue; if (h.pos.distanceTo(p.pos) < 2.5) { h.dead = true; this.scene.remove(h.mesh); p.life = 0; } }
      if (p.life <= 0) { this.scene.remove(p.mesh); p.dead = true; }
    }
    this.projs = this.projs.filter(p => !p.dead);
  }
  rank() {
    const K = this.karts.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1; if (b.finished) return 1;
      return b.dist - a.dist;
    });
    K.forEach((k, i) => k.place = i + 1);
    const p = this.player; if (p && this.state === 'race') { if (p._pp && p.place < p._pp && this.raceT > 3) { p.expr = 'happy'; p.exprT = 1.4; this.track.cheer = Math.max(this.track.cheer || 0, 1.5); if ((this._cheerCD || 0) < this.raceT) { this._cheerCD = this.raceT + 2.5; Audio.sfxPlay('cheer'); } this.msg('¡Adelantas! ' + p.place + 'º', p, '#ffd84a'); } p._pp = p.place; }
  }
  endRace() {
    if (this.ended) return; this.ended = true;
    this.rank();
    let order = this.karts.slice().sort((a, b) => a.place - b.place);
    if (this.net && !this.netHost && this.netResults) { order = this.netResults.map(r => { const k = this.byId.get(r.id); if (k) { k.finishTime = r.t; k.finished = r.fin; } return k; }).filter(Boolean); order.forEach((k, i) => k.place = i + 1); }
    // estimate times for unfinished
    let prevT = 0; for (const k of order) { if (!k.finished) { const rem = this.laps * this.track.L - k.dist; k.finishTime = Math.max(prevT + 0.35, this.raceT + rem / Math.max(20, k.vmax * 0.85)); } prevT = k.finishTime; }
    if (this.net && this.netHost) this.net.send({ t: 'results', order: order.map(k => ({ id: k.netId, t: k.finishTime, fin: k.finished })) });
    Audio.engineStop();
    this.app.onRaceEnd(order.map(k => ({ ch: k.ch, name: k.pname, kind: k.kind, id: k.netId, time: k.finishTime, fin: k.finished, isPlayer: k.isPlayer, place: k.place, peds: k.pedHits || 0 })), this.stats);
  }

  // ---------------- camera ----------------
  placeCamera(snap, dt = 0.016) {
    const k = this.player, cam = this.camera;
    if (this.state === 'intro') {
      const a = this.introT * 0.45 + 2.2, r = 26 - this.introT * 3;
      cam.position.set(k.pos.x + Math.sin(k.yaw + a) * r, k.y + 9 - this.introT * 1.6, k.pos.z + Math.cos(k.yaw + a) * r);
      cam.lookAt(k.pos.x, k.y + 1.5, k.pos.z); cam.fov = cam.aspect < 1 ? 78 : 60; cam.updateProjectionMatrix(); return;
    }
    if (this.state === 'finish') {
      const a = this.finishT * 0.35; const r = 13;
      cam.position.lerp(new V3(k.pos.x + Math.sin(k.yaw + Math.PI * 0.75 + a) * r, k.y + 5, k.pos.z + Math.cos(k.yaw + Math.PI * 0.75 + a) * r), 1 - Math.exp(-dt * 3));
      cam.lookAt(k.pos.x, k.y + 1.6, k.pos.z); return;
    }
    const por = cam.aspect < 1, C = por ? CAM.portrait : CAM.landscape, s = k.megaS, sf = clamp(k.fs / 45, 0, 1.3), T = this.track;
    const sc = 1 + (s - 1) * 0.9;
    const back = C.dist * sc + sf * CAM.pullBack + (k.boostT > 0 ? 0.6 : 0) + this.kick * 0.6, up = C.height * (1 + (s - 1) * 0.85);
    // yaw objetivo: el del kart, abierto hacia fuera en derrape
    const yaw = k.yaw + k.driftDir * CAM.driftSwing;
    if (snap || this._cy == null) this._cy = yaw;
    this._cy += angDiff(this._cy, yaw) * (1 - Math.exp(-dt * CAM.yawLag));
    const fx = Math.sin(this._cy), fz = Math.cos(this._cy), side = k.driftDir * CAM.driftSide;
    const want = this._cw.set(k.pos.x - fx * back - fz * side, k.y + up, k.pos.z - fz * back + fx * side);
    // anti-fachadas: si la cámara saldría por detrás de las aceras, se acerca al kart y sube
    { const ci = T.nearest(want.x, want.z, k.idx, 12, 12), f = T.frame(want.x, want.z, ci), lim = f.wall + CAM.wallMargin;
      if (Math.abs(f.lat) > lim) { const ex = Math.abs(f.lat) - lim, rs = T.S[ci].right, sg = Math.sign(f.lat); want.x -= rs.x * sg * ex; want.z -= rs.z * sg * ex; want.y += Math.min(3, ex * 0.6); }
      want.y = Math.max(want.y, f.y + 1.6); }
    const la = C.lookAhead; const look = this._cl.set(k.pos.x + Math.sin(this._cy) * la, k.y + C.lookHeight * s, k.pos.z + Math.cos(this._cy) * la);
    if (snap) { this.camPos.copy(want); this.camLook.copy(look); this.camVel.set(0, 0, 0); }
    // muelle críticamente amortiguado (sin rebote ni tirones)
    const w = CAM.posSpring; const ax = w * w * (want.x - this.camPos.x) - 2 * w * this.camVel.x, ay = w * w * (want.y - this.camPos.y) - 2 * w * this.camVel.y, az = w * w * (want.z - this.camPos.z) - 2 * w * this.camVel.z;
    this.camVel.x += ax * dt; this.camVel.y += ay * dt; this.camVel.z += az * dt; this.camPos.addScaledVector(this.camVel, dt);
    // nunca dejar que se quede demasiado lejos (p. ej. tras un turbo o un respawn)
    const dd = this.camPos.distanceTo(want); if (dd > back * 0.9) this.camPos.lerp(want, 1 - (back * 0.9) / dd);
    this.camPos.y = Math.max(this.camPos.y, want.y - 1.2);
    this.camLook.lerp(look, 1 - Math.exp(-dt * CAM.lookSpring));
    cam.position.copy(this.camPos);
    const sh = (Math.max(0, sf - 0.85) * 0.05 + (k.boostT > 0 ? 0.04 : 0) + this.kick * 0.2) * (k.air ? 0.4 : 1) * CAM.shake; this.shake = sh;
    if (sh > 0) { const tt = this.time * 40; cam.position.x += Math.sin(tt) * sh * 0.5; cam.position.y += Math.sin(tt * 1.37) * sh * 0.5; }
    cam.lookAt(this.camLook);
    const fov = C.fov + clamp((k.fs - 15) / 30, 0, 1) * CAM.fovSpeed + (k.boostT > 0 || k.megaT > 0 ? CAM.fovBoost : 0) + (k.turboT > 0 ? 9 : 0) + this.kick * 4;
    cam.fov = lerp(cam.fov, fov, 1 - Math.exp(-dt * 4)); cam.updateProjectionMatrix();
  }
  // ---------- interpolación de render (física a paso fijo, pantalla a cualquier Hz) ----------
  saveInterp() { if (this._interped) { this.camera.position.copy(this.camP1); this.camera.quaternion.copy(this.camQ1); for (const k of this.karts) { k.mesh.position.copy(k._p1); k.mesh.rotation.y = k._y1; } this._interped = false; } this.camP0.copy(this.camP1); this.camQ0.copy(this.camQ1); for (const k of this.karts) { k._p0.copy(k._p1); k._y0 = k._y1; } }
  snapInterp() { this.camP1.copy(this.camera.position); this.camQ1.copy(this.camera.quaternion); for (const k of this.karts) { k._p1.copy(k.mesh.position); k._y1 = k.mesh.rotation.y; } this.saveInterp(); }
  interp(a) {
    a = clamp(a, 0, 1); if (this.state === 'intro') return; this._interped = true;
    for (const k of this.karts) { if (k._p0.distanceToSquared(k._p1) > 100) continue; k.mesh.position.lerpVectors(k._p0, k._p1, a); k.mesh.rotation.y = k._y0 + angDiff(k._y0, k._y1) * a; }
    if (this.camP0.distanceToSquared(this.camP1) < 100) { this.camera.position.lerpVectors(this.camP0, this.camP1, a); this.camera.quaternion.slerpQuaternions(this.camQ0, this.camQ1, a); }
  }
  // ---------- recorte por distancia de decorado (barato, cada 0,2 s) ----------
  buildCull() {
    const L = []; const add = o => { if (o.isInstancedMesh || o.isPoints) return; const b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return; const sp = b.getBoundingSphere(new THREE.Sphere()); if (sp.radius > 60) return; L.push({ o, c: sp.center, r: sp.radius }); };
    for (const o of this.track.group.children) add(o);
    return L;
  }
  cullTick(dt) {
    this._cullT = (this._cullT || 0) - dt; if (this._cullT > 0) return; this._cullT = 0.2;
    const p = this.camera.position, D = this.quality.hi ? 400 : 300; let hid = 0;
    for (const e of this.cullList) { const d = Math.hypot(e.c.x - p.x, e.c.z - p.z) - e.r; const v = d < D; if (e.o.visible !== v) e.o.visible = v; if (!v) hid++; }
    this.culled = hid;
    // karts lejanos: sin contornos (ahorra muchas llamadas de dibujo)
    for (const k of this.karts) { const far = !k.isPlayer && k.mesh.position.distanceToSquared(p) > 24 * 24; if (k._far !== far) { k._far = far; for (const c of k.mesh.userData.tilt.children) c.visible = c === k.proxy ? far : !far; } }
  }
  dispose() {
    Audio.engineStop();
    this.scene.traverse(o => { if (o.geometry && !o.geometry._shared) o.geometry.dispose?.(); });
  }
}
