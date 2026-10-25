import { DriftFX } from './driftfx.js';
import * as THREE from 'three';
const DAYLOOK = ['sky', 'ocean', 'book']; // v14: mapas flotantes con luz de día
import { CONFIG, ITEMS, ITEM_KEYS, ITEM_W } from './data.js';
import { makeKart, animKart, makeProjectile, makeSeta, toon, mesh } from './gfx.js';
import { buildTrack, BOX_COL } from './track.js';
const segD2 = (p, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; let t = L > 0 ? ((p.x - ax) * dx + (p.z - az) * dz) / L : 0; t = Math.max(0, Math.min(1, t)); const qx = ax + dx * t - p.x, qz = az + dz * t - p.z; return qx * qx + qz * qz; };
import { drawFromBag } from './itembag.js';
import { addSurreal } from './surreal.js';
const DL = [0, 0.5, 1.0, 1.6]; const dlvl = t => t > DL[3] ? 3 : t > DL[2] ? 2 : t > DL[1] ? 1 : 0;
import { Audio } from './audio.js';
import { PowerFX, POWER, POWER_W } from './powerups.js';

const V3 = THREE.Vector3;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const R = Math.random;

export class Race {
  constructor(app, { cup, reverse, playerChar, rivals, grid, cupIndex = 0, quality }) {
    this.app = app; this.cup = cup; this.reverse = reverse; this.quality = quality;
    this.scene = new THREE.Scene();
    this.track = buildTrack(cup, reverse, quality);
    this.scene.add(this.track.group);
    this.setupSky();
    this.surreal = addSurreal(this.track, quality, this.scene);
    this.kick = 0; this.shake = 0; this.fwT = 0;
    this.time = 0; this.raceT = 0; this.state = 'intro'; this.introT = 0; this.cdT = 0; this.finishT = 0;
    this.karts = []; this.projs = []; this.hazards = []; this.msgs = [];
    this.difficulty = 0.94 + cupIndex * 0.015;
    const T = this.track;
    const order = grid; // array of char objects, index0 = pole
    order.forEach((ch, gi) => {
      const k = this.makeKartState(ch, ch === playerChar, gi);
      // grid position
      const row = gi >> 1, sd = gi % 2 ? 1 : -1;
      const back = 8 + row * 6.5 + (gi % 2) * 2.5;
      const i = ((-Math.round(back / T.STEP)) % T.N + T.N) % T.N; const s = T.S[i];
      k.pos.set(s.p.x + s.right.x * sd * s.w * 0.42, s.p.y, s.p.z + s.right.z * sd * s.w * 0.42);
      k.yaw = Math.atan2(s.fl.x, s.fl.z); k.idx = i; k.prevIdx = i; k.dist = -back; k.y = s.p.y;
      this.karts.push(k); this.scene.add(k.mesh);
    });
    this.player = this.karts.find(k => k.isPlayer);
    this.camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.5, 1600);
    this.camPos = new V3(); this.camLook = new V3();
    this.setupParticles();
    this.fx = new PowerFX(this); // v10: potenciadores surrealistas
    this.lightningFlash = 0;
    this.items = { roll: 0 };
    this.input = { steer: 0, throttle: 1, brake: false, drift: false, driftEdge: false, itemEdge: false };
    this.firstPress = null;
    this.placeCamera(true);
  }
  setupSky() {
    const c = this.cup, sc = this.scene;
    const top = new THREE.Color(c.sky[0]), bot = new THREE.Color(c.sky[1]);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1300, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: top }, bot: { value: bot }, flash: { value: 0 } },
      vertexShader: 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform float flash; varying vec3 vp; float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); } float nn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); } void main(){ vec3 d = normalize(vp); float h = clamp(d.y*1.6+0.25,0.0,1.0); vec3 c = mix(bot, top, pow(h, 0.85)); c = mix(c, top * vec3(0.78, 0.84, 1.0), smoothstep(0.55, 1.0, h) * 0.45); c += vec3(1.0, 0.75, 0.6) * pow(1.0 - abs(d.y), 9.0) * 0.12 * __DAY; vec3 sd = normalize(vec3(0.45, 0.55, 0.33)); float s = max(0.0, dot(d, sd)); c += vec3(1.0, 0.92, 0.8) * (pow(s, 12.0) * 0.28 + pow(s, 400.0) * 0.6) * __DAY; c = mix(c, mix(bot, vec3(1.0), 0.35), (1.0 - smoothstep(0.0, 0.16, d.y)) * 0.35 * __DAY); vec2 uv = d.xz / max(0.12, d.y + 0.25); float w = nn(uv * 1.6) * 0.6 + nn(uv * 4.1) * 0.4; c = mix(c, vec3(1.0), smoothstep(0.62, 0.9, w) * smoothstep(0.05, 0.35, d.y) * 0.22 * __DAY); gl_FragColor = vec4(c + flash*vec3(0.6,0.6,0.8), 1.0);} '.replace(/__DAY/g, (c.theme === 'storm' || (c.theme === 'space' && !DAYLOOK.includes(c.look))) ? '0.25' : '1.0') }));
    sky.renderOrder = -10; sc.add(sky); this.sky = sky;
    sc.fog = new THREE.Fog(c.fog, this.quality.hi ? 180 : 130, this.quality.hi ? 750 : 520);
    sc.add(new THREE.HemisphereLight((c.theme === 'space' && !DAYLOOK.includes(c.look)) || c.theme === 'storm' ? '#c9b8ff' : '#ffffff', (c.theme === 'space' && !DAYLOOK.includes(c.look)) || c.theme === 'storm' ? '#4a3080' : '#ffd6ea', c.theme === 'storm' ? 1.25 : 0.95));
    const d = new THREE.DirectionalLight('#fff4e8', c.theme === 'storm' || (c.theme === 'space' && !DAYLOOK.includes(c.look)) ? 1.35 : 2.0); d.position.set(80, 160, 60); sc.add(d);
    // v2: sombras reales finas que siguen al jugador (solo si el render va en calidad alta)
    d.castShadow = true; d.shadow.mapSize.set(1024, 1024); d.shadow.bias = -0.0006; d.shadow.normalBias = 0.04; d.shadow.radius = 2.5; { const sc2 = d.shadow.camera; sc2.left = sc2.bottom = -34; sc2.right = sc2.top = 34; sc2.near = 10; sc2.far = 260; } sc.add(d.target); this.sun = d;
    { const fill = new THREE.DirectionalLight(c.theme === 'storm' || c.theme === 'space' ? '#b8a8ff' : '#cfe4ff', 0.45); fill.position.set(-90, 50, -70); sc.add(fill); } // v12: luz de relleno fría a contraluz
    this.track.group.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.material && o.material.vertexColors) o.receiveShadow = true; });
    if ((c.theme === 'space' && !DAYLOOK.includes(c.look)) || c.theme === 'storm') {
      const n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = R() * 6.28, b = Math.acos(R() * 2 - 1) * (c.theme === 'storm' ? 0.45 : 1); p[i * 3] = Math.sin(b) * Math.cos(a) * 1100; p[i * 3 + 1] = Math.cos(b) * 1100 * (c.theme === 'storm' ? 1 : 1); p[i * 3 + 2] = Math.sin(b) * Math.sin(a) * 1100; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      sc.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false })));
    }
    if (!(c.theme === 'space' && !DAYLOOK.includes(c.look)) && c.theme !== 'storm') { // soft clouds
      const NCL = this.quality.hi ? 26 : 16, PER = 7, cl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), toon('#ffffff', { rim: 0.45, nocache: true }), NCL * PER); const m = new THREE.Matrix4(), qq = new THREE.Quaternion(); let ci = 0; // v25: nubes con volumen (racimos de bolas, base plana y sombreado)
      for (let i = 0; i < NCL; i++) { const a = R() * 6.28, r = 480 + R() * 340, y = 110 + R() * 130, sz = 0.8 + R() * 0.7, yaw = R() * 6.28; for (let j = 0; j < PER; j++) { const u = (j / (PER - 1) - 0.5) * 2, lx = u * 48 * sz, lz = (R() - 0.5) * 22 * sz, big = (1 - Math.abs(u) * 0.55) * (0.8 + R() * 0.4); const px = Math.cos(a) * r + Math.cos(yaw) * lx - Math.sin(yaw) * lz, pz = Math.sin(a) * r + Math.sin(yaw) * lx + Math.cos(yaw) * lz;
        m.compose(new V3(px, y + big * 10 * sz, pz), qq, new V3(26 * sz * big, 17 * sz * big, 22 * sz * big)); cl.setMatrixAt(ci, m); cl.setColorAt(ci, new THREE.Color(j % 3 ? '#ffffff' : '#f4ecff')); ci++; } }
      cl.count = ci; cl.material.emissive = new THREE.Color('#ffffff'); cl.material.emissiveIntensity = 0.12;
      cl.material.fog = false; sc.add(cl);
    }
  }
  makeKartState(ch, isPlayer, gi) {
    const m = makeKart(ch, gi);
    m.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const s = ch.stats;
    const shield = mesh(new THREE.SphereGeometry(2.4, 20, 14), toon('#bff4ff', { opacity: 0.35, rim: 1, emissive: '#7ff5ff', ei: 0.3 }), m, [0, 1.3, 0]); shield.visible = false; shield.renderOrder = 4; shield.castShadow = false;
    const pers = [{ name: 'prudente', laneAmp: 0.15, aggr: 0.3, skill: 0.95 }, { name: 'agresivo', laneAmp: 0.45, aggr: 0.9, skill: 0.98 }, { name: 'travieso', laneAmp: 0.35, aggr: 0.7, skill: 0.93 }, { name: 'veloz', laneAmp: 0.2, aggr: 0.5, skill: 1.0 }][gi % 4];
    return {
      ch, isPlayer, mesh: m, shield, pos: new V3(), yaw: 0, vx: 0, vz: 0, fs: 0, y: 0, vy: 0, air: false, airT: 0,
      vmax: 43 + (s.vel - 3) * 2.8, acc: 0.74 + (s.acel - 3) * 0.14, turn: 2.0 + (s.man - 3) * 0.2, weight: 0.7 + s.peso * 0.15,
      idx: 0, prevIdx: 0, dist: 0, lap: 0, finished: false, finishTime: 0, place: gi + 1,
      item: null, rollT: 0, boostT: 0, megaT: 0, megaS: 1, shieldT: 0, magT: 0, spinT: 0, squashT: 0, blindT: 0, invT: 0,
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
  // v13: menos draw calls. Los obstáculos lejanos (que la niebla ya casi tapa) no se dibujan y los karts lejanos
  // dibujan sin contorno ni detalles finos. Solo se toca .visible cuando cambia el estado (sin trabajo por fotograma).
  lodCull() {
    const c = this.camera && this.camera.position; if (!c) return; const hi = this.quality.hi, D2 = (hi ? 210 : 160) ** 2, K2 = (hi ? 110 : 80) ** 2;
    for (const o of this.track.obstacles) { if (o.kind === 'lightning') continue; const p = o.g.position, v = (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < D2; if (o.g.visible !== v) o.g.visible = v; }
    for (const k of this.karts) { if (k.isPlayer) continue; if (!k._ol) { k._ol = []; k.mesh.traverse(x => { if (x.isMesh && x.renderOrder === -1 && x.material && x.material.side === THREE.BackSide) k._ol.push(x); }); }
      const near = (k.pos.x - c.x) ** 2 + (k.pos.z - c.z) ** 2 < K2; if (k._near !== near) { k._near = near; for (const x of k._ol) x.visible = near; } }
  }
  msg(text, k, color) { if (k && !k.isPlayer) return; this.app.ui.toast(text, color); }

  // =================================================================
  update(dt) {
    this.time += dt;
    const T = this.track;
    if (this.state === 'intro') { this.introT += dt; if (this.introT > 3.2 || this.app.skipIntro) { this.state = 'countdown'; this.cdT = 0; this.app.skipIntro = false; this.lastCd = 4; } }
    else if (this.state === 'countdown') {
      this.cdT += dt; const n = 3 - Math.floor(this.cdT);
      if (n !== this.lastCd && n > 0) { this.lastCd = n; Audio.sfxPlay('beep'); this.app.ui.countdown(String(n)); }
      if (this.cdT >= 3) { this.state = 'race'; Audio.sfxPlay('go'); this.app.ui.countdown('¡YA!'); this.startBoosts(); }
    } else if (this.state === 'race' || this.state === 'finish') this.raceT += dt;
    const running = this.state === 'race' || this.state === 'finish';
    for (const o of T.obstacles) o.update(this.time, dt);
    this.lodCull();
    if (this.player) this.surreal.update(this.time, dt, this);
    for (const b of T.boxes) { if (b.t > 0) b.t -= dt; const vis = b.t <= 0; b.mesh.visible = vis; if (vis) { b.mesh.rotation.y = this.time * 1.4 + b.ph; b.mesh.rotation.x = Math.sin(this.time + b.ph) * 0.3; b.mesh.position.y = b.pos.y + Math.sin(this.time * 2.5 + b.ph) * 0.3; b.mesh.userData.cube.material.emissive.setHSL((this.time * 0.25 + b.ph * 0.2) % 1, 0.9, 0.55); const st = b.mesh.userData.star; if (st) { st.rotation.set(-b.mesh.rotation.x, this.time * 3, 0); } } }
    for (const p of T.pads) p.mesh.material.map.offset.y = -this.time * 1.2 % 1;
    if (running) {
      for (const k of this.karts) {
        const inp = this.fx.input(k, k.isPlayer && !k.finished && !this.app.autopilot ? this.input : this.aiInput(k, dt), dt);
        this.stepKart(k, inp, dt);
      }
      this.collideKarts();
      this.updateProjectiles(dt);
      this.fx.update(dt);
      this.rank();
    } else for (const k of this.karts) this.placeKartMesh(k, dt);
    if (this.dfx) this.dfx.step(dt);
    // finish handling
    if (this.state === 'race' && this.player.finished) { this.state = 'finish'; this.finishT = 0; }
    if (this.state === 'finish') { this.finishT += dt; if (this.karts.every(k => k.finished) || this.finishT > 9) this.endRace(); }
    // particles
    for (const P of this.parts) if (P.life > 0) { P.life -= dt; P.s.position.addScaledVector(P.v, dt); P.s.material.opacity = Math.max(0, P.life / P.max); P.s.scale.setScalar(P.size * (0.6 + 0.4 * P.life / P.max)); if (P.life <= 0) P.s.visible = false; }
    // lightning flash
    if (this.cup.theme === 'storm') { for (const o of T.obstacles) if (o.strikeNow && !o.flashed) { o.flashed = true; this.lightningFlash = 1; const d = o.g.position.distanceTo(this.player.pos); if (d < 120) Audio.sfxPlay('thunder'); } else if (!o.strikeNow) o.flashed = false;
      if (R() < dt * 0.15) this.lightningFlash = Math.max(this.lightningFlash, 0.5); }
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3); this.sky.material.uniforms.flash.value = this.lightningFlash * 0.6;
    this.kick = Math.max(0, this.kick - dt * 2.2);
    if (this.fireworks && this.state === 'finish') { this.fwT -= dt; if (this.fwT <= 0) { this.fwT = 0.3 + R() * 0.3; const p = this.player.pos, a = R() * 6.28, c = new V3(p.x + Math.cos(a) * (10 + R() * 14), this.player.y + 14 + R() * 10, p.z + Math.sin(a) * (10 + R() * 14)); const col = ['#ff5fd2', '#ffe066', '#7ff5ff', '#9dff7a', '#ff8f5f'][Math.floor(R() * 5)]; for (let i = 0; i < 28; i++) { const v = new V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(9 + R() * 3); this.emit(c, col, 1.1, 1.1, v); } Audio.sfxPlay('firework'); } }
    { const pl = this.player, fh = pl ? (pl.flyH || 0) : 0; if (fh) pl.y += fh; this.placeCamera(false, dt); if (fh) pl.y -= fh; }
    if (this.sun && this.player) { const p = this.player.pos; this.sun.target.position.set(p.x, this.player.y, p.z); this.sun.position.set(p.x + 60, this.player.y + 120, p.z + 45); }
    if (this.player) Audio.engineSet(Math.abs(this.player.fs), this.player.boostT > 0 || this.player.megaT > 0);
    if (this.player) { const pl = this.player; Audio.setIntensity(this.state !== 'race' ? 0.15 : 0.3 + Math.min(pl.lap, 2) * 0.22 + (pl.lap >= CONFIG.laps - 1 ? 0.15 : 0) + (pl.boostT > 0 || pl.megaT > 0 ? 0.25 : 0)); }
    // v27: sonidos de ambiente (adelantar, pasar junto a objetos y público, chispas del derrape)
    if (this.player && this.state === 'race') { const pl = this.player; Audio.finalLap = pl.lap >= CONFIG.laps - 1; const dl = pl.driftDir ? dlvl(pl.driftT) : 0; if (pl.driftDir) Audio.driftTick(dl); if (dl > (this._dl || 0)) Audio.sfxPlay('sparklvl', dl); this._dl = dl;
      this.sndT = (this.sndT || 0) - dt; if (this.sndT <= 0) { this.sndT = 0.2;
        if (this.lastPlace && pl.place !== this.lastPlace) Audio.sfxPlay(pl.place < this.lastPlace ? 'passup' : 'passdown'); this.lastPlace = pl.place;
        const obs = this.track.obstacles || []; this.nearCD = (this.nearCD || 0) - 0.2; if (this.nearCD <= 0) for (const o of obs) { const g = o.g; if (!g) continue; const dx = g.position.x - pl.pos.x, dz = g.position.z - pl.pos.z; if (dx * dx + dz * dz < 90) { Audio.sfxPlay(o.kind === 'critter' ? 'boing' : 'whoosh', 1); this.nearCD = 1.2; break; } }
        this.crowdT = (this.crowdT || 4) - 0.2; if (this.crowdT <= 0) { this.crowdT = 5 + Math.random() * 5; if (Math.abs(pl.fs) > 10) Audio.sfxPlay('crowd'); } } }
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
      if (di < 25 && a.takeSC !== sc) { a.takeSC = (k.boostT > 0 || k.megaT > 0 || k.item === 'turbo' || k.item === 'seta' || R() < 0.35 * a.skill) ? sc : false; if (a.takeSC === false) a.scSkipIdx = sc.i0; }
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
    // magnet target
    if (k.magT > 0 && k.magTarget) { tx = lerp(tx, k.magTarget.pos.x, 0.7); tz = lerp(tz, k.magTarget.pos.z, 0.7); }
    const want = Math.atan2(tx - k.pos.x, tz - k.pos.z);
    let d = angDiff(k.yaw, want);
    if (k.blindT > 0) { a.noise += (R() - 0.5) * dt * 8; a.noise *= 0.97; d += a.noise; }
    inp.steer = clamp(d * 2.4, -1, 1);
    if (a.scSlow && Math.abs(d) > 0.45 && k.fs > 16) { inp.throttle = 0; if (Math.abs(d) > 0.8) inp.brake = true; }
    // drift on bends
    const curv = Math.abs(T.S[(k.idx + 10) % T.N].curv);
    if (!a.drift && curv > 0.3 && k.fs > 22 && !k.air && Math.abs(inp.steer) > 0.35 && R() < a.skill) a.drift = true;
    if (a.drift && (curv < 0.1 || k.fs < 14)) a.drift = false;
    inp.drift = a.drift;
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
          default: use = this.fx.aiWants(k, k.item, dA, dB);
        }
        if (use) inp.itemEdge = true;
      }
    }
    if (k.isPlayer) inp.drift = false; // autopilot: keep simple
    return inp;
  }

  // ---------------- physics ----------------
  stepKart(k, inp, dt) {
    const T = this.track;
    k.bumpCD -= dt; k.invT -= dt;
    // timers
    for (const t of ['boostT', 'shieldT', 'magT', 'spinT', 'squashT', 'blindT']) if (k[t] > 0) k[t] = Math.max(0, k[t] - dt);
    if (k.megaT > 0) { k.megaT -= dt; if (k.megaT <= 0) { k.megaT = 0; if (k.isPlayer) Audio.sfxPlay('shrink'); } }
    k.megaS = lerp(k.megaS, k.megaT > 0 ? 2.1 : 1, 1 - Math.exp(-dt * 6));
    // item roulette
    if (k.rollT > 0) { k.rollT -= dt; if (k.isPlayer && Math.floor(k.rollT * 14) !== Math.floor((k.rollT + dt) * 14)) Audio.sfxPlay('roll'); if (k.rollT <= 0) { k.item = this.rollItem(k); if (k.isPlayer) { Audio.sfxPlay('got'); } if (k.ai) k.ai.itemDelay = 0.4 + R() * 2.5; } }
    if (inp.itemEdge && k.item && k.rollT <= 0) this.useItem(k);
    const fr = T.frame(k.pos.x, k.pos.z, k.idx);
    const scY = T.inShortcut(k.pos.x, k.pos.z);
    const onRoad = Math.abs(fr.lat) <= fr.w + 1.6 || scY != null;
    const fwdX = Math.sin(k.yaw), fwdZ = Math.cos(k.yaw), rX = -fwdZ, rZ = fwdX;
    let fs = k.vx * fwdX + k.vz * fwdZ, ls = k.vx * rX + k.vz * rZ;
    // rubber band for AI
    let rb = 1;
    if (!k.isPlayer) { const rel = k.dist - this.player.dist; rb = this.difficulty * (rel < 0 ? 1 + Math.min(0.13, -rel / 500 * 0.13) : 1 - Math.min(0.09, rel / 450 * 0.09)); if (k.place === 1 && !this.player.finished) rb *= 0.985; }
    if (k.finished && !k.isPlayer) rb *= 0.9;
    let vmax = k.vmax * rb;
    if (!onRoad && k.boostT <= 0 && k.megaT <= 0) vmax *= 0.55;
    if (k.boostT > 0) vmax *= 1.38;
    if (k.megaT > 0) vmax *= 1.2;
    if (k.magT > 0) vmax *= 1.25;
    if (k.fxV && k.fxV !== 1) vmax *= k.fxV; // v10: efecto temporal de potenciador
    if (k.squashT > 0) vmax *= 0.5;
    if (k.blindT > 0 && !k.isPlayer) vmax *= 0.85;
    const ctrl = k.spinT <= 0 && k.squashT <= 0.0;
    // throttle
    if (k.spinT > 0) fs *= Math.exp(-dt * 2.5);
    else if (inp.brake) { fs -= 34 * dt; if (fs < -9) fs = -9; }
    else if (inp.throttle > 0) { if (fs < vmax) fs += (vmax - fs) * k.acc * dt * (k.boostT > 0 ? 3 : 1) + (fs < 5 ? 6 * dt : 0); else fs += (vmax - fs) * 1.6 * dt; }
    else fs *= Math.exp(-dt * 0.8);
    // steering
    const steer = ctrl ? inp.steer : 0;
    k.steerVis = lerp(k.steerVis, steer, 1 - Math.exp(-dt * 10));
    const spdK = clamp(Math.abs(fs) / 10, 0, 1) * Math.sign(fs || 1);
    let yawRate;
    // drift start/stop
    const auto = k.isPlayer && this.app.autoDrift !== false;
    let wantDir = Math.abs(steer) > (auto ? 0.15 : 0.3) ? Math.sign(steer) : 0;
    if (auto && !wantDir) { const a = T.S[(k.idx + 2) % T.N].fl; let best = 0; for (let j = 6; j <= 36; j += 3) { const b = T.S[(k.idx + j) % T.N].fl, cr = a.x * b.z - a.z * b.x; if (Math.abs(cr) > Math.abs(best)) best = cr; } wantDir = Math.abs(best) > 0.04 ? -Math.sign(best) : (k.lastDD || 1); }
    if (inp.drift && !k.air && k.driftDir === 0 && wantDir && fs > 12 && ctrl) { k.driftDir = wantDir; k.lastDD = wantDir; k.driftT = 0; k.vy = 3.2; k.air = true; k.hop = true; if (k.isPlayer) Audio.sfxPlay('drift'); }
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
        yawRate = angDiff(k.yaw, ty + back + steer * 0.35) * 3.2 * Math.min(1, spdK + 0.3);
      } else yawRate = k.turn * (k.driftDir * 0.72 + steer * 0.45) * spdK;
      const lvl = dlvl(k.driftT);
      if (lvl > k.dLvl) { k.dLvl = lvl; if (k.isPlayer) { Audio.sfxPlay('level', 1 + lvl * 0.26); for (let i = 0; i < 10; i++) this.emit(k.pos.clone().add(new V3(0, 0.6, 0)), ['', '#7fd8ff', '#ffb36b', '#ff7fe0'][lvl], 0.8, 0.45); } }
      if (lvl && R() < (this.quality.hi ? 0.9 : 0.5)) for (const sd of [-1, 1]) { const p = k.pos.clone().add(new V3(-fwdX * 1.3 + rX * sd * 1.0, 0.35, -fwdZ * 1.3 + rZ * sd * 1.0)); this.emit(p, ['', '#7fd8ff', '#ffb36b', '#ff7fe0'][lvl], 0.55, 0.3); }
    } else { yawRate = k.turn * steer * spdK * (k.air ? 0.6 : 1) * (1 - Math.min(0.3, Math.abs(fs) / 200));
      if (k.isPlayer && ctrl && Math.abs(steer) < 0.25 && !k.air) { const ty = Math.atan2(T.S[(k.idx + 4) % T.N].fl.x, T.S[(k.idx + 4) % T.N].fl.z), d = angDiff(k.yaw, ty); if (Math.abs(d) < 0.6) yawRate += d * 1.6; } }
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
      if (vr * sg > 0) { const rf = k.isPlayer ? 1.1 : 1.3; k.vx -= s.right.x * vr * rf; k.vz -= s.right.z * vr * rf; const kk = 1 - Math.min(k.isPlayer ? 0.18 : 0.3, Math.abs(vr) / 80); k.vx *= kk; k.vz *= kk;
        if (k.bumpCD <= 0 && Math.abs(vr) > 4) { k.bumpCD = 0.4; if (k.isPlayer) Audio.sfxPlay('bump'); for (let i = 0; i < 4; i++) this.emit(k.pos.clone().add(new V3(s.right.x * sg * 1.2, 0.8, s.right.z * sg * 1.2)), '#ffffff', 0.5, 0.3); }
        // steer heading back along the road a bit
        const ty = Math.atan2(s.fl.x, s.fl.z); if (Math.abs(angDiff(k.yaw, ty)) < 1.5) k.yaw += angDiff(k.yaw, ty) * (k.isPlayer ? 0.3 : 0.15); }
    }
    // height
    let gy = inSC != null ? Math.max(inSC, f2.y) : f2.y;
    // v13: rampas robustas. Antes solo saltaba si el kart NO estaba en el aire (el saltito del derrape lo dejaba "en el aire"
    // y atravesaba la rampa), con fs > 8 y solo al cruzar el índice exacto de la cima. Ahora la rampa es una superficie:
    // cualquier kart dentro de su tramo (también derrapando, de lado o rápido) queda por encima y salta al pasar la cima.
    let onRamp = false; for (const r of T.ramps) { const ry = this.rampCheck(k, r, f2.lat); if (ry > gy) { gy = ry; onRamp = true; } }
    if (onRamp && k.air && k.y < gy) { k.y = gy; if (k.vy < 0) k.vy = 0; }
    if (k.rampCD > 0) k.rampCD -= dt;
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
    if (k._bpx == null || (k._bpx - k.pos.x) ** 2 + (k._bpz - k.pos.z) ** 2 > 400) { k._bpx = k.pos.x; k._bpz = k.pos.z; } // teletransportes: sin barrido
    for (const b of T.boxes) { if (b.t > 0) continue; const r = 2.4 * k.megaS; if (segD2(b.pos, k._bpx, k._bpz, k.pos.x, k.pos.z) < r * r && k.y > b.pos.y - BOX_COL.below && k.y < b.pos.y + BOX_COL.above) { b.t = 2.2; if (k.isPlayer) { Audio.sfxPlay('box'); Audio.sfxPlay('buf'); } for (let i = 0; i < 8; i++) this.emit(b.pos.clone(), ['#ff8fc0', '#ffe066', '#7ff5ff'][i % 3], 0.7, 0.5); if (!k.item && k.rollT <= 0) k.rollT = k.isPlayer ? 1.2 : 0.6; } }
    k._bpx = k.pos.x; k._bpz = k.pos.z; // v33: test barrido (a mucha velocidad no se salta la caja entre fotogramas)
    // obstacles
    for (const o of T.obstacles) { if (!o.active) continue; const p = o.g.position; const dx = p.x - k.pos.x, dz = p.z - k.pos.z; const yy = o.kind === 'bee' ? Math.abs(p.y - k.y - 1.5) < 2.5 : o.kind === 'lightning' ? true : Math.abs(p.y - k.y) < 3;
      if (yy && dx * dx + dz * dz < (o.r + 1.1 * k.megaS) ** 2) { if ((k.megaT > 0 && o.kind !== 'lightning') || this.fx.immune(k)) continue; if (o.kind === 'lightning') { this.hitKart(k, 'rayo'); } else { this.hitKart(k, 'obst'); const d = Math.hypot(dx, dz) || 1; k.vx -= dx / d * 10; k.vz -= dz / d * 10; } } }
    // hazards (puddles)
    for (const h of this.hazards) { if (h.dead) continue; const dx = h.pos.x - k.pos.x, dz = h.pos.z - k.pos.z; if (!k.air && !this.fx.immune(k) && dx * dx + dz * dz < (2.2 * k.megaS) ** 2 && !(h.owner === k && h.age < 0.8)) { h.dead = true; this.scene.remove(h.mesh); if (k.megaT <= 0) this.hitKart(k, 'charco', h.owner); } }
    // boost flame particles
    if ((k.boostT > 0 || k.megaT > 0) && R() < 0.8) this.emit(k.pos.clone().add(new V3(-nfX * 1.6 * k.megaS, 0.7, -nfZ * 1.6 * k.megaS)), k.megaT > 0 ? '#ff8fc0' : ['#ffd84a', '#ff8fc0', '#7ff5ff'][Math.floor(R() * 3)], 0.8, 0.3, new V3(-nfX * 8, 1, -nfZ * 8));
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
      if (k.lap >= CONFIG.laps) { k.finished = true; k.finishTime = this.raceT; if (k.isPlayer) { Audio.sfxPlay('finish'); this.app.ui.finishBanner(k.place); if (k.place === 1) { this.fireworks = true; T.cheer = 3; } } }
      else if (k.isPlayer) { Audio.sfxPlay('lap'); this.msg(k.lap === CONFIG.laps - 1 ? '¡Última vuelta!' : `Vuelta ${k.lap + 1}`, k, '#ffffff'); }
    }
    // wrong way / stuck
    const s = T.S[k.idx]; const dirDot = nfX * s.fl.x + nfZ * s.fl.z;
    k.wrongT = dirDot < -0.4 && Math.abs(k.fs) > 3 ? k.wrongT + dt : 0;
    if (Math.abs(k.fs) < 3 && k.spinT <= 0 && k.squashT <= 0 && this.state !== 'countdown') k.stuckT += dt; else k.stuckT = Math.max(0, k.stuckT - dt);
    if ((!k.isPlayer || this.app.autopilot) ? (k.stuckT > 2.5 || k.wrongT > 2.5) : (k.stuckT > 3.5 || k.wrongT > 3.5)) { this.respawn(k); if (k.isPlayer) this.msg('¡De vuelta a la pista!', k, '#7ff5ff'); }
    this.placeKartMesh(k, dt);
  }
  rampU(k, r) { const dx = r.highP.x - r.lowP.x, dz = r.highP.z - r.lowP.z; return ((k.pos.x - r.lowP.x) * dx + (k.pos.z - r.lowP.z) * dz) / (dx * dx + dz * dz); }
  // devuelve la altura de la superficie de la rampa bajo el kart (o -Infinity) y lanza el salto al pasar la cima
  rampCheck(k, r, lat) {
    const T = this.track, N = T.N; if (k.rampCD > 0 && k.lastRamp === r) return -Infinity;
    if (Math.abs(lat) > r.halfW + 1.2) return -Infinity; // fuera de la rampa por el lateral
    if (k.morphT > 0 && k.morph === 'topo') return -Infinity; // bajo tierra: pasa por debajo
    const dNow = (k.idx - r.i0 + N) % N, dPrev = (k.prevIdx - r.i0 + N) % N, near = i => i <= r.len + 3 || i > N - 3;
    if (!near(dNow) && !near(dPrev)) return -Infinity;
    const u = this.rampU(k, r), uPrev = k._rampU0 != null && k._rampR === r ? k._rampU0 : u; k._rampU0 = u; k._rampR = r;
    const surf = r.lowY + (r.highY - r.lowY) * Math.min(1, Math.max(0, u));
    const crossedTop = (u >= 1 && uPrev < 1) || this.crossed(k, r.idx);
    if (k.air && !k.hop && k.vy > 0 && k.y > surf + 0.4) return -Infinity; // ya vuela por encima
    if (k.y > surf + 2.5) return -Infinity;
    if (!crossedTop) return u > -0.05 && u < 1 ? surf : -Infinity; // subiendo: se apoya en la rampa, nunca la atraviesa
    const v = Math.max(Math.abs(k.fs), 14);
    k.y = Math.max(k.y, r.highY); k.vy = Math.min(5.8 + v * 0.12, 11) * (T.cup.look ? 1.5 : 1); k.air = true; k.hop = false; k.airT = 0; k.trick = false; // v15: salto moderado (antes 6,5 + v·0,16 y ×1,9 en las copas del cielo)
    k.flip = T.cup.look ? (r.idx % 2 ? 1 : 2) : 0; k.flipDur = 2 * k.vy / (30 * T.grav); k.lastRamp = r; k.rampCD = 0.6; k.rampJumps = (k.rampJumps || 0) + 1;
    if (k.isPlayer) Audio.sfxPlay('jump');
    return -Infinity;
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
    if (!k.air) k.flip = 0; // v7: piruetas solo visuales en los mapas surrealistas
    if (k.flip && k.air) { const p = clamp((k.airT - 0.1) / Math.max(0.3, k.flipDur - 0.25), 0, 1), e = p * p * (3 - 2 * p); if (k.flip === 1) rx = -e * Math.PI * 2; else rz += e * Math.PI * 2 * (k.ch.id.length % 2 ? 1 : -1); }
    tilt.rotation.set(rx, ry, rz);
    const sq = k.squashT > 0 ? 0.28 : 1;
    tilt.scale.set(1 / Math.sqrt(sq) * (k.squashT > 0 ? 0.9 : 1), lerp(tilt.scale.y, sq, 1 - Math.exp(-dt * 18)), 1 / Math.sqrt(sq) * (k.squashT > 0 ? 0.9 : 1));
    u.shadow.position.y = -(k.y - (this.track.frame(k.pos.x, k.pos.z, k.idx).y)) / k.megaS + 0.06;
    k.shield.visible = k.shieldT > 0;
    m.visible = !(k.invT > 0 && Math.floor(k.invT * 12) % 2);
    if (k.exprT > 0) k.exprT -= dt;
    const expr = k.squashT > 0 || k.spinT > 0 ? 'squash' : k.exprT > 0 ? k.expr : '';
    const fl = u.flame; fl.visible = k.boostT > 0 || k.megaT > 0;
    if (fl.visible) { const f = 0.8 + R() * 0.4 + (k.isPlayer ? this.kick * 0.5 : 0); fl.scale.set(f, f, f * (1 + Math.min(0.6, k.boostT * 0.4))); }
    this.fx.place(k);
    (this.dfx ||= new DriftFX(this.scene)).update(k, dt, k.driftDir ? dlvl(k.driftT) : 0, k.isPlayer || k.pos.distanceToSquared(this.player.pos) < 3600);
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
      if (this.fx.collide(a, b)) continue;
      const d = Math.sqrt(d2) || 0.01, nx = dx / d, nz = dz / d, over = r - d;
      if (a.megaT > 0 && b.megaT <= 0) { this.squash(b, a); continue; }
      if (b.megaT > 0 && a.megaT <= 0) { this.squash(a, b); continue; }
      const wa = a.weight * a.megaS, wb = b.weight * b.megaS, ta = wb / (wa + wb), tb = wa / (wa + wb);
      a.pos.x -= nx * over * ta; a.pos.z -= nz * over * ta; b.pos.x += nx * over * tb; b.pos.z += nz * over * tb;
      const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      if (rv < 0) { const imp = -rv * 1.3; a.vx -= nx * imp * ta; a.vz -= nz * imp * ta; b.vx += nx * imp * tb; b.vz += nz * imp * tb; if ((a.isPlayer || b.isPlayer) && imp > 3 && a.bumpCD <= 0) { a.bumpCD = 0.3; Audio.sfxPlay('bump'); } }
    }
  }
  squash(v, by) {
    if (v.squashT > 0 || v.invT > 0 || this.fx.immune(v)) return;
    if (v.shieldT > 0) { v.shieldT = 0; Audio.sfxPlay('pop'); v.invT = 0.6; return; }
    v.squashT = 2.0; v.vx *= 0.3; v.vz *= 0.3; v.driftDir = 0; v.lastHitBy = by;
    Audio.sfxPlay('squash');
    for (let i = 0; i < 14; i++) this.emit(v.pos.clone().add(new V3(0, 0.6, 0)), ['#ffe066', '#ffffff', '#ff8fc0'][i % 3], 0.8, 0.6, new V3((R() - 0.5) * 14, R() * 6, (R() - 0.5) * 14));
    if (v.isPlayer) this.msg('¡Te han chafado!', v, '#ff8fb0');
    if (by.isPlayer) { this.msg('¡CHAF! ¡Chafado ' + v.ch.name + '!', by, '#ffd84a'); this.stats.squashes = (this.stats.squashes || 0) + 1; }
  }
  hitKart(k, why, by) {
    if (k.invT > 0 || k.spinT > 0 || this.fx.immune(k)) return false;
    if (k.megaT > 0) return false;
    if (k.shieldT > 0) { k.shieldT = 0; k.invT = 0.6; Audio.sfxPlay('pop'); if (k.isPlayer) this.msg('¡El escudo te ha salvado!', k, '#7ff5ff'); return false; }
    k.spinT = why === 'charco' ? 1.0 : 1.15; k.driftDir = 0; k.boostT = 0; k.lastHitBy = by;
    if (why === 'misil' || why === 'rayo') { k.vy = 7; k.air = true; k.hop = true; }
    if (k.isPlayer || (by && by.isPlayer)) Audio.sfxPlay('hit');
    if (k.isPlayer) this.msg({ charco: '¡Resbalón!', rayo: '¡Zas! ¡Un rayo!', obst: '¡Ay!', misil: '¡Caramelazo!', osito: '¡Osito al canto!' }[why] || '¡Ay!', k, '#ff8fb0');
    if (by && by.isPlayer && !k.isPlayer) { this.msg('¡Le has dado a ' + k.ch.name + '!', by, '#ffd84a'); this.stats.hits = (this.stats.hits || 0) + 1; }
    for (let i = 0; i < 10; i++) this.emit(k.pos.clone().add(new V3(0, 1, 0)), ['#ffe066', '#ffffff'][i % 2], 0.6, 0.5, new V3((R() - 0.5) * 10, R() * 7, (R() - 0.5) * 10));
    return true;
  }
  get stats() { return this._stats || (this._stats = {}); }

  // ---------------- items ----------------
  rollItem(k) {
    if (this.forceItem && k.isPlayer) { const f = this.forceItem; this.forceItem = null; return f; }
    // v33: misma probabilidad para todos los objetos, sin importar la posición (bolsa barajada por kart)
    const KEYS = ITEM_KEYS.concat(Object.keys(POWER));
    return drawFromBag(k.bagSt || (k.bagSt = {}), KEYS);
  }
  useItem(k) {
    const it = k.item; k.item = null; const T = this.track;
    const fX = Math.sin(k.yaw), fZ = Math.cos(k.yaw);
    (this.stats.used ||= {}); if (k.isPlayer) this.stats.used[it] = (this.stats.used[it] || 0) + 1;
    const ahead = this.karts.find(o => o.place === k.place - 1);
    switch (it) {
      case 'turbo': k.boostT = Math.max(k.boostT, 1.7); if (k.isPlayer) { Audio.sfxPlay('boost'); this.msg('¡Turbo arcoíris!', k, '#ff8fd8'); } break;
      case 'seta': k.megaT = 6.5; k.spinT = 0; k.squashT = 0; if (k.isPlayer) { Audio.sfxPlay('grow'); this.msg('¡SETA GIGANTE!', k, '#ff8fc0'); } else if (k.pos.distanceTo(this.player.pos) < 80) Audio.sfxPlay('grow'); break;
      case 'escudo': k.shieldT = 14; if (k.isPlayer) Audio.sfxPlay('shield'); break;
      case 'iman': k.magT = 3.2; k.magTarget = ahead || null; if (k.isPlayer) { Audio.sfxPlay('magnet'); this.msg(ahead ? '¡Imán hacia ' + ahead.ch.name + '!' : '¡Imán!', k, '#ff6f8f'); } break;
      case 'nube': { let n = 0; for (const o of this.karts) if (o.place < k.place && !o.finished) { if (o.shieldT > 0) { o.shieldT = 0; continue; } o.blindT = 3.2; n++; }
        if (k.isPlayer || this.player.blindT > 0) Audio.sfxPlay('stars'); if (k.isPlayer) this.msg(n ? `¡Deslumbras a ${n}!` : '¡Nube estrellada!', k, '#fff6a0');
        else if (this.player.place < k.place) this.msg('¡' + k.ch.name + ' te ha deslumbrado!', this.player, '#fff6a0'); break; }
      case 'osito': case 'misil': {
        const m = makeProjectile(it); this.scene.add(m);
        const p = { type: it, mesh: m, owner: k, pos: k.pos.clone().add(new V3(fX * 3.2 * k.megaS, 0, fZ * 3.2 * k.megaS)), dir: new V3(fX, 0, fZ), speed: Math.max(0, k.fs) + (it === 'osito' ? 26 : 20), life: it === 'osito' ? 6 : 9, idx: k.idx, age: 0, target: it === 'misil' ? ahead : null, lat: T.frame(k.pos.x, k.pos.z, k.idx).lat };
        this.projs.push(p); if (k.isPlayer || k.pos.distanceTo(this.player.pos) < 60) Audio.sfxPlay(it === 'osito' ? 'throw' : 'missile');
        if (it === 'misil' && p.target && p.target.isPlayer) this.msg('¡Cuidado! ¡Misil de caramelo!', p.target, '#ff6f9a');
        break; }
      default: this.fx.use(k, it); break;
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
        if (dx * dx + dz * dz < r * r && Math.abs(k.y - (p.pos.y - (p.type === 'misil' ? 0.4 : 0))) < 3 * k.megaS) { this.hitKart(k, p.type, p.owner); p.life = 0; for (let i = 0; i < 10; i++) this.emit(p.pos.clone().add(new V3(0, 1, 0)), p.type === 'osito' ? '#ff6fa0' : '#ffe066', 0.7, 0.5); break; } }
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
    const order = this.karts.slice().sort((a, b) => a.place - b.place);
    // estimate times for unfinished
    let prevT = 0; for (const k of order) { if (!k.finished) { const rem = CONFIG.laps * this.track.L - k.dist; k.finishTime = Math.max(prevT + 0.35, this.raceT + rem / Math.max(20, k.vmax * 0.85)); } prevT = k.finishTime; }
    Audio.engineStop();
    this.app.onRaceEnd(order.map(k => ({ ch: k.ch, time: k.finishTime, isPlayer: k.isPlayer, place: k.place })), this.stats);
  }

  // ---------------- camera ----------------
  placeCamera(snap, dt = 0.016) {
    const k = this.player, cam = this.camera;
    if (this.state === 'intro') {
      const a = this.introT * 0.45 + 2.2, r = 26 - this.introT * 3;
      cam.position.set(k.pos.x + Math.sin(k.yaw + a) * r, k.y + 9 - this.introT * 1.6, k.pos.z + Math.cos(k.yaw + a) * r);
      cam.lookAt(k.pos.x, k.y + 1.5, k.pos.z); cam.fov = 60; cam.updateProjectionMatrix(); return;
    }
    if (this.state === 'finish') {
      const a = this.finishT * 0.35; const r = 13;
      cam.position.lerp((this._wantV ||= new V3()).set(k.pos.x + Math.sin(k.yaw + Math.PI * 0.75 + a) * r, k.y + 5, k.pos.z + Math.cos(k.yaw + Math.PI * 0.75 + a) * r), 1 - Math.exp(-dt * 3));
      cam.lookAt(k.pos.x, k.y + 1.6, k.pos.z); return;
    }
    const s = k.megaS, sf = clamp(k.fs / 45, 0, 1.4), back = 6.5 * (1 + (s - 1) * 0.9) + (k.boostT > 0 ? 0.9 : 0) + sf * 0.6 + this.kick * 0.8 + (k.flip && k.air ? 3.5 : 0), up = 2.85 * (1 + (s - 1) * 0.85) + (k.flip && k.air ? 2.2 : 0);
    const pv = cam.aspect < 1, pB = pv ? 1.0 : 0.92, pU = pv ? 3.0 : 1.85, pA = pv ? 1.35 : 1.25; // v28: cámara más alta, mirando más desde arriba, aún cerca // v5: cámara vertical más alta y mirando más lejos (horizontal intacta)
    const yaw = k.yaw + k.driftDir * 0.12;
    if (snap || this._cy == null) this._cy = yaw;
    this._cy += angDiff(this._cy, yaw) * (1 - Math.exp(-dt * 7));
    const want = (this._wantV ||= new V3()).set(k.pos.x - Math.sin(this._cy) * back * pB, k.y + up * pU, k.pos.z - Math.cos(this._cy) * back * pB);
    const look = (this._lookV ||= new V3()).set(k.pos.x + Math.sin(this._cy) * 5 * pA, k.y + 1.35 * s, k.pos.z + Math.cos(this._cy) * 6 * pA);
    if (snap) { this.camPos.copy(want); this.camLook.copy(look); }
    this.camPos.lerp(want, 1 - Math.exp(-dt * 10)); this.camPos.y = Math.max(this.camPos.y, want.y - 1.5);
    this.camLook.lerp(look, 1 - Math.exp(-dt * 14));
    cam.position.copy(this.camPos);
    const sh = (Math.max(0, sf - 0.75) * 0.06 + (k.boostT > 0 ? 0.06 : 0) + this.kick * 0.28) * (k.air ? 0.4 : 1); this.shake = sh;
    if (sh > 0) cam.position.add(new V3((R() - 0.5) * sh, (R() - 0.5) * sh, (R() - 0.5) * sh));
    cam.lookAt(this.camLook);
    const fov = 64 + Math.min(14, Math.max(0, k.fs - 18) * 0.45) + (k.boostT > 0 ? 8 : 0) + this.kick * 8;
    cam.fov = lerp(cam.fov, fov, 1 - Math.exp(-dt * 5)); cam.updateProjectionMatrix();
  }
  dispose() {
    Audio.engineStop();
    this.scene.traverse(o => { if (o.geometry && !o.geometry._shared) o.geometry.dispose?.(); });
  }
}
