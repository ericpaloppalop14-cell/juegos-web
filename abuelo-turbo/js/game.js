import { TELE } from './tele.js?v=5';
import { THREE, BEND, bendMat, clamp, lerp, damp, rand, randi, pick, TAU } from './util.js?v=5';
import { World, distIdxAt } from './world.js?v=5';
import { FX } from './fx.js?v=5';
import { M, getRig, applySkin, poseRig } from './rig.js?v=5';
import { makeModel, makePigeon, makeGranny, dentureGeo, pillMesh, lowForDistrict } from './props.js?v=5';
import A from './audio.js?v=5';
import * as ST from './store.js?v=5';
import { CHARS, SKINS, DIST, DIST_LEN, PILLS, SHOUTS, UPGR } from './data.js?v=5';
import { initGen, genAhead, LW } from './gen.js?v=5';

const { S } = ST;
const SOLID = new Set(['car', 'taxi', 'van', 'bus', 'truck', 'container', 'carroza', 'limo']);
const HIGH = new Set(['tendedero', 'toldo', 'sombrilla', 'viga', 'pancarta', 'neon']);
const GRAV = 30, RS = 1.16;
const PH = 1.5, PH_SLIDE = 0.75;

export class Game {
  constructor() {
    this.state = 'loading'; this.mode = 'menu'; this.cb = {}; this.time = 0; this.ts = 1; this.camMode = 'home';
    this.obs = []; this.coins = []; this.pills = []; this.opool = {}; this.debris = []; this.pillGeo = {};
    this.p = { x: 0, y: 0, vy: 0, z: 0, tl: 0, lane: 0, lastLane: 0 }; this.ps = {}; this.hudT = 0; this.fpsAcc = 0; this.fpsN = 0; this.q = 'alta'; this.perf = { upd: 0, ren: 0, n: 0 };
    this.char = CHARS[0]; this.dist = 0; this.speed = 0; this.queue = [];
  }
  async init(canvas, progress) {
    this.canvas = canvas;
    const r = this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(70, 1, 0.3, 420);
    this.world = new World(this.scene, r); await this.world.init(progress);
    this.fx = new FX(this.scene);
    this.obsRoot = new THREE.Group(); this.scene.add(this.obsRoot);
    const cmat = bendMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.25, emissive: 0x6a4a00, emissiveIntensity: 0.35 }));
    this.cmN = new THREE.InstancedMesh(dentureGeo(false), cmat, 460); this.cmG = new THREE.InstancedMesh(dentureGeo(true), cmat, 120);
    for (const m of [this.cmN, this.cmG]) { m.frustumCulled = false; m.count = 0; this.scene.add(m); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.rigRoot = new THREE.Group(); this.scene.add(this.rigRoot);
    this.setChar(S.char, S.skin);
    this.applyQuality(S.set.q);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ctxLost = true; });
    canvas.addEventListener('webglcontextrestored', () => { this.ctxLost = false; this.resize(); });
    this.prewarm();
    window.addEventListener('resize', () => this.resize()); this.resize();
    this.resetWorld(); this.state = 'menu';
    this.last = performance.now(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  /* ---------- quality / size ---------- */
  applyQuality(q) {
    const forced = new URLSearchParams(location.search).get('q'); if (forced) q = forced; this.q = q === 'auto' ? 'alta' : q; this.auto = q === 'auto';
    const dpr = window.devicePixelRatio || 1; const map = { alta: Math.min(dpr, 2), media: Math.min(dpr, 1.35), baja: 1 };
    this.dpr = map[this.q] || 1; this.shadows = this.q !== 'baja'; this.world.setShadows(this.shadows, this.q === 'alta' ? 1024 : 768); this.r.shadowMap.enabled = this.shadows; this.resize();
  }
  resize() {
    const w = innerWidth, h = innerHeight; this.w = w; this.h = h; this.r.setPixelRatio(this.dpr || 1); this.r.setSize(w, h, false); this.camera.aspect = w / h; this.aspect = w / h;
    const tanH = Math.tan(20 * Math.PI / 180); const tv = Math.max(Math.tan(24 * Math.PI / 180), tanH / this.aspect); this.baseFov = Math.min(80, 2 * Math.atan(tv) * 180 / Math.PI); this.camera.fov = this.baseFov; this.camera.updateProjectionMatrix();
  }
  /* ---------- character ---------- */
  setChar(id, skin, locked = false) {
    this.char = CHARS.find(c => c.id === id) || CHARS[0];
    if (this.rig) this.rigRoot.remove(this.rig.root);
    this.rig = getRig(this.char.id); this.rig.root.scale.setScalar(RS); applySkin(this.rig, skin || 'def'); this.rigRoot.add(this.rig.root); this.setLocked(locked);
  }
  setLocked(l) { const k = l ? 0.42 : 1; M.rv.color.setScalar(k); M.rs.color.setScalar(k); if (this.rig) { this.rig.frameMat.color.multiplyScalar(1); this.rig.locked = l; if (l) { this.rig.frameMat.color.multiplyScalar(0.3); } else applySkin(this.rig, this.rig.skinId); } }
  previewSkin(skin) { if (this.rig) applySkin(this.rig, skin); }
  /* ---------- world lifecycle ---------- */
  resetWorld() {
    for (const o of this.obs) this.release(o); this.obs.length = 0; this.coins.length = 0; for (const p of this.pills) this.scene.remove(p.obj); this.pills.length = 0;
    for (const d of this.debris) this.scene.remove(d.obj); this.debris.length = 0; this.fx.clear();
    const p = this.p; Object.assign(p, { x: 0, y: 0, vy: 0, z: 0, zPrev: 0, lane: 0, lastLane: 0, vx: 0, wob: 0, wobV: 0, tl: 0, slideT: 0, air: false, onRamp: false, shieldT: 0, turboT: 0, magT: 0, caneT: 0, cafeT: 0, invul: 0, stumbleT: 0, flip: 0, flipping: false, crashed: false, fall: false, coyote: 0, laneT: 99 });
    this.dist = 0; this.speed = 0; this.score = 0; this.coinsRun = 0; this.banked = 0; this.streak = 0; this.streakT = 0; this.cnt = { jump: 0, slide: 0, pills: 0, flip: 0, turbo: 0, shield: 0, coins: 0 }; this.continues = 0; this.usedFree = false; this.maxDi = 0; this.lastDi = 0;
    initGen(this); this.rig.root.position.set(0, 0, 0); this.rig.root.rotation.set(0, 0, 0); this.rig.tilt.rotation.set(0, 0, 0); this.rig.root.visible = true; this.rig.root.scale.setScalar(RS);
    this.timeScale(1);
  }
  timeScale(v) { this.ts = v; }
  startRun() {
    A.resume(); this.resetWorld(); this.mode = 'play'; this.state = 'play'; this.runT = 0; this.speed = 8; this.startGrace = 1.0;
    this.rig.shield.visible = false; this.camMode = 'run'; this.camBlend = 0;
    A.engineStart(); A.musicStart(0, false); A.sfx = null; A.whoosh(); this.hintT = 0;
    
    this.say(pick(this.char.lines.slice(0, 2)), 2.2); this.fx.lineSeed(0, 0);
    if (this.char.id === 'paco' && S.seen.tuto && !this.forceTut) this.startPill('turbo', 3, true);
    this.tut = (!S.seen.tuto || this.forceTut) ? 0 : -1; this.tutO = null; this.tutAct = false; this.tutCd = 0; this.tutOk = 0; this.tsT = 1; this.cb.tut && this.cb.tut(-1);
    ST.mission('runs', 1); this.runStart = performance.now();
    this.cb.state && this.cb.state('play');
  }
  pause() { if (this.state !== 'play') return; this.state = 'paused'; A.engineSet(0, false, 0); this.cb.state && this.cb.state('paused'); }
  resume() { if (this.state !== 'paused') return; this.state = 'play'; this.cb.state && this.cb.state('play'); }
  toMenu() { A.engineStop(); this.mode = 'menu'; this.state = 'menu'; this.resetWorld(); this.camMode = 'home'; A.musicStart(0, true); this.cb.state && this.cb.state('menu'); }
  /* ---------- entities ---------- */
  getModel(kind) {
    let variant = 0; if (kind === 'car') variant = randi(0, 8); else if (kind === 'van' || kind === 'bus' || kind === 'truck' || kind === 'container') variant = randi(0, 3);
    const key = kind + ':' + variant; const pool = this.opool[key]; if (pool && pool.length) { const o = pool.pop(); o.obj.visible = true; return o; }
    let m; if (kind === 'abuela') m = makeGranny(); else if (kind === 'paloma') m = makePigeon(); else m = makeModel(kind === 'taxi' ? 'taxi' : kind, variant); m.key = key; this.obsRoot.add(m.obj); return m;
  }
  release(o) { o.obj.visible = false; o.obj.rotation.set(0, 0, 0); o.obj.scale.setScalar(o.kind === 'abuela' ? 1.05 : (o.kind === 'paloma' ? 1.15 : 1)); (this.opool[o.key] || (this.opool[o.key] = [])).push(o); }
  addObs(kind, lane, d, opt = {}) {
    const m = this.getModel(kind); const cls = SOLID.has(kind) ? 'solid' : HIGH.has(kind) ? 'high' : kind === 'rampa' ? 'ramp' : kind === 'abuela' ? 'cross' : kind === 'paloma' ? 'bird' : 'low';
    const e = m; e.cls = cls; e.x = lane * LW; e.z = -d; e.lane = lane; e.vx = 0; e.walk = 0; e.dead = false; e.ph = Math.random() * 6; e.side = opt.side || 1; e.dy = opt.dy || 0;
    if (cls === 'cross') { e.x = e.side * 6.3; e.tx = lane * LW; e.waiting = true; }
    if (cls === 'bird') { e.base = 0.95 + e.dy; }
    if (e.outl) { const di = distIdxAt(d), night = di >= 4; e.outl.material.color.setHex(night ? (cls === 'low' || cls === 'high' ? (di === 5 ? 0xfff03c : 0xffffff) : (di === 5 ? 0x6af4ff : 0xffe0a0)) : (cls === 'low' || cls === 'high' ? 0x1a1030 : 0x141a3c)); }
    TELE.attach(e);     e.obj.position.set(e.x, cls === 'bird' ? e.base : 0, e.z); e.obj.rotation.set(0, cls === 'cross' ? -e.side * 1.4 : 0, 0); this.obs.push(e); return e;
  }
  addCoin(x, y, d, gold) { this.coins.push({ x, y, z: -d, gold: Math.random() < gold, mag: false, ph: Math.random() * 6 }); }
  pillGeom(type) { return this.pillGeo[type] || (this.pillGeo[type] = (() => { const g = pillMesh(type); const h = new THREE.BufferGeometry(); h.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)); const c = new THREE.Color(PILLS[type].col); h.setAttribute('color', new THREE.Float32BufferAttribute([c.r, c.g, c.b], 3)); h.setAttribute('size', new THREE.Float32BufferAttribute([3.4], 1)); return { g, h }; })()); }
  addPill(type, x, d) {
    const pg = this.pillGeom(type); const grp = new THREE.Group(); const m = new THREE.Mesh(pg.g, M.rs); m.scale.setScalar(1.25); m.castShadow = true; grp.add(m);
    const halo = new THREE.Points(pg.h, this.world.haloMat); halo.renderOrder = 8; halo.frustumCulled = false; grp.add(halo); grp.position.set(x, 1.15, -d); this.scene.add(grp); this.pills.push({ type, x, z: -d, obj: grp, m, ph: Math.random() * 6 });
  }
  /* ---------- input ---------- */
  action(a) {
    if (this.state !== 'play') return; const p = this.p; if (p.crashed) return;
    if (a === 'left' || a === 'right') { const d = a === 'left' ? -1 : 1; const nl = clamp(p.lane + d, -1, 1); if (nl !== p.lane) { p.lastLane = p.lane; p.lane = nl; p.laneT = 0; p.wobV -= 1.6; A.lane(d); this.fx.dust(p.x, 0, p.z + 0.4, 3); } else { this.fx.camShake(0.05); this.bump = d; } this.cb.hint && S.seen.tuto === false && this.hintDone('lane'); }
    else if (a === 'jump') { if (p.y <= this.groundAt(p.x, p.z) + 0.12 || p.coyote > 0) { this.jump(); } else this.queue.push({ a: 'jump', t: 0.22 }); this.hintDone('jump'); }
    else if (a === 'slide') { if (p.air) { p.vy = -26; p.slideT = 0.6; } else { p.slideT = 0.7; p.slideStart = true; A.slide(); this.cnt.slide++; this.fx.dust(p.x, 0, p.z, 6, 0xd8d0c0, 5); } this.hintDone('slide'); }
  }
  hintDone(k) { }
  jump() {
    const p = this.p; let v = 10.2; if (this.char.id === 'cosmica') v *= 1.2; if (p.caneT > 0) v = 15.8; p.vy = v; p.air = true; p.slideT = 0; p.coyote = 0; p.wobV -= 7; this.cnt.jump++; A.jump(); if (p.caneT > 0) A.cane(); this.fx.dust(p.x, 0, p.z, 4);
    if (Math.random() < 0.18) this.say(pick(SHOUTS.jump), 1.0);
  }
  /* ---------- helpers ---------- */
  groundAt(x, z) { let g = 0; for (const o of this.obs) { if (o.cls !== 'ramp' || o.dead) continue; if (Math.abs(x - o.x) < o.hw - 0.08 && Math.abs(z - o.z) < o.len / 2) { const t = (o.z + o.len / 2 - z) / o.len; g = Math.max(g, o.H * t); } } return g; }
  say(text, dur = 2.4) { this.cb.say && this.cb.say(text, dur, this.char.voice); }
  upDur(id) { let v = ST.upValue(id); if (this.char.id === 'disco') v *= 1.4; return v; }
  startPill(type, dur, silent) {
    const p = this.p;
    if (type === 'turbo') { p.turboT = dur || this.upDur('turbo'); p.turboMax = p.turboT; this.cnt.turbo++; this.fx.camShake(0.4); if (!silent) { A.turbo(); this.say(pick(SHOUTS.turbo), 1.8); } this.fx.burst(p.x, 1, p.z, 22, [0xffc040, 0xff5a1a, 0xffffff], 9, 0.6, 0.35, 0); this.sky = 0; }
    if (type === 'iman') { p.magT = this.upDur('iman') + (this.char.id === 'rayo' ? 0 : 0); p.magMax = p.magT; A.magnet(); this.say(pick(SHOUTS.iman), 1.6); }
    if (type === 'faja') { p.shieldT = this.upDur('faja'); p.shieldMax = p.shieldT; this.rig.shield.visible = true; A.shield(); this.say(pick(SHOUTS.faja), 1.8); this.fx.ring(p.x, 1, p.z, 0x4dff9a); }
    if (type === 'baston') { p.caneT = this.upDur('baston'); p.caneMax = p.caneT; A.cane(); this.say(pick(SHOUTS.baston), 1.5); }
    if (type === 'cafe') { p.cafeT = this.upDur('cafe'); p.cafeMax = p.cafeT; A.coffee(); this.say(pick(SHOUTS.cafe), 1.8); }
  }
  /* ---------- main loop ---------- */
  loop(now) {
    requestAnimationFrame(this.loop);
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; if (!(dt > 0)) dt = 0.016;
    const t0 = performance.now();
    this.frame(dt);
    const t1 = performance.now(); this.render(); const t2 = performance.now();
    this.perf.upd += t1 - t0; this.perf.ren += t2 - t1; this.perf.n++;
    // adaptive quality
    this.fpsAcc += dt; this.fpsN++; if (this.fpsAcc > 1.5) { const avg = this.fpsAcc / this.fpsN * 1000; this.fps = 1000 / avg; if (this.auto && this.state === 'play' && avg > 24 && this.dpr > 0.85) { this.dpr = Math.max(0.8, this.dpr * 0.82); this.resize(); if (this.dpr < 1.1 && this.shadows && avg > 30) { this.shadows = false; this.r.shadowMap.enabled = false; this.world.setShadows(false); } } this.fpsAcc = 0; this.fpsN = 0; }
  }
  frame(dt) {
    this.last_dt = dt;
    if (this.state === 'play' || this.state === 'crash') {
      if (this.state === 'play') { const tt = this.tsT == null ? 1 : this.tsT; this.ts = damp(this.ts, tt, tt < this.ts ? 16 : 6, dt); if (Math.abs(this.ts - tt) < 0.01) this.ts = tt; }
      this.sim(dt * this.ts);
    } else if (this.state === 'paused') { /* freeze */ }
    else this.updateMenu(dt);
    this.fx.update(this.state === 'paused' ? 0 : dt, this.h, this.camera.fov);
  }
  /* ---------- simulation ---------- */
  sim(sdt) { const n = Math.max(1, Math.ceil(sdt * 120 - 1e-6)), h = sdt / n; for (let i = 0; i < n; i++) { this.update(h, i === n - 1, sdt); if (this.state !== 'play' && this.state !== 'crash') break; } }
  update(dt, last = true, fdt = dt) {
    const p = this.p, rig = this.rig; this.time += dt;
    if (this.state === 'crash') return this.updateCrash(dt, last, fdt);
    this.runT += dt; this.startGrace = Math.max(0, this.startGrace - dt);
    // timers
    for (const k of ['shieldT', 'turboT', 'magT', 'caneT', 'cafeT']) if (p[k] > 0) { p[k] -= dt; if (p[k] <= 0) { p[k] = 0; this.onPillEnd(k); } }
    p.invul = Math.max(0, p.invul - dt); p.stumbleT = Math.max(0, p.stumbleT - dt); p.coyote = Math.max(0, p.coyote - dt); p.laneT += dt;
    // speed
    /* velocidad progresiva y suave con la distancia: 14 → ~37 m/s */ const base = 14 + 23 * (1 - Math.exp(-this.dist / 1700)); const tur = p.turboT > 0 ? 1.4 : 1;
    let tgt = base * tur; if (this.startGrace > 0 || this.runT < 1.2) tgt = Math.min(tgt, 8 + this.runT * 8); if (this.tut >= 0) tgt = Math.min(tgt, 14);
    if (p.stumbleT > 0.9) tgt *= 0.85;
    this.speed = damp(this.speed, tgt, p.turboT > 0 ? 2.5 : 1.8, dt);
    p.zPrev = p.z; const dz = this.speed * dt; p.z -= dz; this.dist += dz;
    // lateral
    const tx = p.lane * LW; const lk = this.char.id === 'rayo' ? 520 : 250, lc = 2 * Math.sqrt(lk) * 0.96; p.vxl = (tx - p.x); p.vx += ((tx - p.x) * lk - p.vx * lc) * dt; p.x += p.vx * dt; if (Math.abs(tx - p.x) < 0.004 && Math.abs(p.vx) < 0.05) { p.x = tx; p.vx = 0; }
    p.wobV += (-p.wob * 300 - p.wobV * 10) * dt; p.wob += p.wobV * dt; p.wob = clamp(p.wob, -0.9, 0.9);
    // buffered jump
    for (let i = this.queue.length - 1; i >= 0; i--) { const q = this.queue[i]; q.t -= dt; if (q.t <= 0) this.queue.splice(i, 1); else if (q.a === 'jump' && !p.air) { this.jump(); this.queue.splice(i, 1); } }
    // vertical
    const g = this.groundAt(p.x, p.z);
    if (p.turboT > 0) { const ty = 4.3 + Math.sin(this.time * 3) * 0.2; p.y = damp(p.y, ty, 4, dt); p.vy = 0; p.air = true; p.onRamp = false; }
    else {
      if (p.onRamp && g < p.y - 0.08 && p.vy <= 0.01) { p.vy = 12.8 + Math.min(4, (this.speed - 15) * 0.12); p.air = true; p.flipping = true; p.flip = 0; p.onRamp = false; A.boing(); this.fx.camShake(0.15); }
      if (p.y > g + 0.001 || p.vy > 0) { p.vy -= GRAV * (Math.abs(p.vy) < 3 ? 0.8 : 1) * dt; p.y += p.vy * dt; p.air = true; }
      if (p.y <= g && p.vy <= 0) { // landing / on ground
        const wasAir = p.air && p.vy < -2; const hv = -p.vy; p.y = g; p.vy = 0; p.air = false; p.onRamp = g > 0.05; p.coyote = 0.05;
        if (wasAir) {
          A.land(clamp(hv / 14, 0.3, 1)); p.wobV += clamp(hv * 0.7, 2, 10); this.fx.dust(p.x, 0, p.z, 6); this.fx.camShake(Math.min(0.2, hv * 0.012));
          if (p.flipping) { this.cnt.flip++; this.score += 600 * ST.S.mult; A.flip(); this.say(pick(SHOUTS.flip), 1.8); this.fx.confetti(p.x, 1, p.z, 36); this.coinsRun += 15; this.cb.pop && this.cb.pop('¡PIRUETA! +15', '#ffd23c'); p.flipping = false; }
          if (p.caneT > 0 && p.slideT <= 0) { p.vy = 15.8; p.air = true; A.boing(); this.fx.burst(p.x, 0.2, p.z, 10, [0xffe0a8, 0xffffff], 4, 0.4, 0.2, 4); }
        }
      }
      if (!p.air && g <= 0.001) p.onRamp = false;
    }
    if (p.flipping) { p.flip = Math.min(1, p.flip + dt / 0.85); }
    if (p.slideT > 0 && !p.air) { p.slideT -= dt; } else if (p.air && p.slideT > 0) { p.slideT -= dt * 0.5; }
    // content
    if (this.tut >= 0) this.updateTut(dt); else genAhead(this, this.dist);
    this.updateObstacles(dt);
    if (!p.crashed) { this.collide(dt); this.pickups(dt); }
    this.updatePills(dt); this.updateCoins(dt);
    // sky coins during turbo
    if (p.turboT > 0) { this.skyAcc = (this.skyAcc || 0) + dz; const ahead = this.dist + 60; while ((this.skyNext || 0) < ahead) { this.skyNext = Math.max(this.skyNext || 0, this.dist + 40); const lane = Math.round(Math.sin(this.skyNext * 0.05) * 1.4); this.addCoin(lane * LW, 3.6 + Math.sin(this.skyNext * 0.12) * 0.5, this.skyNext, 0.05); this.skyNext += 2.4; } } else this.skyNext = 0;
    // score & districts
    const mult = ST.S.mult * (p.cafeT > 0 ? 2 : 1); this.score += dz * mult; const di = distIdxAt(this.dist);
    if (di !== this.lastDi || (this.dist > DIST_LEN - 60 && false)) { this.lastDi = di; this.maxDi = Math.max(this.maxDi, Math.floor(this.dist / DIST_LEN)); this.onDistrict(di); }
    this.streakT -= dt; if (this.streakT <= 0) this.streak = 0;
    // audio
    if (this.dist < 99999) { A.engineSet(this.speed, p.turboT > 0, 1); A.intensity = p.turboT > 0 ? 1 : 0.2; }
    if (!last) return;
    TELE.tick(this.time);
    this.updateRig(fdt); this.updateCam(fdt, false);
    this.hudT -= fdt; if (this.hudT <= 0) { this.hudT = 0.08; this.pushHud(); }
    this.world.update(this.dist, p.z, this.camera.position, fdt, this.h, this.camera.fov, this.time);
    // fireworks in Fiestas
    if (di === 4 && Math.random() < fdt * 0.9) this.fireworkShow();
    if (di === 4 && Math.random() < fdt * 0.5) this.fx.confetti(p.x + rand(-4, 4), 5, p.z - rand(8, 25), 8);
    this.fx.updateLines(p.x, p.z, this.speed, (this.speed - 14) / 24 + (p.turboT > 0 ? 0.7 : 0), fdt);
  }
  /* ---------- tutorial interactivo (primera partida) ---------- */
  updateTut(dt) {
    const p = this.p, T = this.tut;
    if (!this.tutO) {
      this.tutCd -= dt; if (this.tutCd > 0 || this.runT < 1.4) return;
      const d = this.dist + 52, kind = T === 0 ? 'car' : T === 1 ? 'valla' : 'tendedero'; this.tutAct = false;
      if (T === 0) { const L = p.lane; this.tutO = [this.addObs(pick(['car', 'taxi']), L, d)]; const side = L === 1 ? -1 : 1; for (let i = 0; i < 7; i++) this.addCoin((L + side) * LW, 0.9, d - 8 + i * 2.2, 0); }
      else if (T === 1) { this.tutO = [-1, 0, 1].map(l => this.addObs('valla', l, d)); for (let l = -1; l <= 1; l++) for (let i = 0; i < 7; i++) { const t = (i + 0.5) / 7; this.addCoin(l * LW, 0.9 + Math.sin(t * Math.PI) * 1.5, d - 5 + i * 1.0, 0); } }
      else { this.tutO = [-1, 0, 1].map(l => this.addObs('tendedero', l, d)); for (let l = -1; l <= 1; l++) for (let i = 0; i < 7; i++) this.addCoin(l * LW, 0.55, d - 5 + i * 1.0, 0); }
      this.tutO.forEach(o => { o.tut = true; }); return;
    }
    const o = this.tutO[0], d = p.z - (o.z + o.len / 2);
    if (!this.tutAct) {
      const lim = T === 0 ? 26 : T === 1 ? 8 : 9.5;
      if (d < 34 && d > 0) this.cb.tut && this.cb.tut(T);
      if (d < lim && d > 0) this.tsT = 0.3;
      const did = T === 0 ? p.lane !== o.lane : T === 1 ? p.y > 0.35 : p.slideT > 0.05;
      if (did && d < lim) { this.tutAct = true; this.tsT = 1; this.cb.tut && this.cb.tut(-1); }
    }
    if (d <= 0.4) {
      let ok;
      if (T === 0) ok = Math.abs(p.x - o.x) > o.hw + 0.05; else if (T === 1) ok = p.y > o.y1 - 0.45; else ok = p.slideT > 0 && p.y < 0.5;
      this.tsT = 1; this.cb.tut && this.cb.tut(-1); this.tutAct = true;
      if (ok) { this.tutOk++; this.cb.pop && this.cb.pop(pick(['¡MUY BIEN!', '¡ASÍ SE HACE!', '¡PERFECTO!']), '#7dff4a'); A.mission(); this.fx.confetti(p.x, 1.5, p.z - 2, 24); this.say(pick(['¡Eso es, Paco!', '¡Qué agilidad!', '¡Ni a los veinte!']), 1.4); this.tut++; this.tutCd = 0.5; this.tutO = null; if (this.tut > 2) this.endTut(true); }
      else { this.tutO.forEach(q => this.smash(q)); this.cb.pop && this.cb.pop('¡CASI! OTRA VEZ', '#ffb02a'); this.tutCd = 0.9; this.tutO = null; }
    }
  }
  endTut(done) {
    this.tut = -1; this.tutO = null; this.tsT = 1; S.seen.tuto = true; ST.save(); this.gd = Math.max(this.gd, this.dist + 70); this.cb.tut && this.cb.tut(-1);
    if (done) { this.cb.pop && this.cb.pop('¡YA SABES CORRER!', '#ffd23c'); this.say('¡Ahora sí! ¡A toda mecha!', 2); A.fanfare(); this.fx.confetti(this.p.x, 3, this.p.z - 5, 40); }
  }
  skipTut() { if (this.tut < 0) return; if (this.tutO) this.tutO.forEach(q => this.smash(q)); this.endTut(false); }
  onDistrict(di) {
    const first = this.dist < 1; this.cb.district && this.cb.district(DIST[di], first); if (first) return;
    A.district(); const names = { 0: 'barrio', 1: 'mercado', 2: 'playa', 3: 'poligono', 4: 'fiestas', 5: 'noche' }; setTimeout(() => this.say(pick(SHOUTS[names[di]]), 2.4), 600);
    A.musicStart(di, false); this.fx.confetti(this.p.x, 3, this.p.z - 6, 24);
  }
  fireworkShow() { const p = this.p; const cols = [0xff4f8a, 0xffd23c, 0x4fe8ff, 0x7bff4f, 0xb78cff, 0xffffff]; this.fx.firework(rand(-30, 30), rand(18, 36), p.z - rand(60, 110), pick(cols)); if (Math.random() < 0.5) A.boom(); }
  onPillEnd(k) { const p = this.p; if (k === 'shieldT') this.rig.shield.visible = false; if (k === 'turboT') { p.invul = Math.max(p.invul, 1.6); p.vy = 0; this.fx.camShake(0.15); } }
  updateObstacles(dt) {
    const p = this.p;
    for (let i = this.obs.length - 1; i >= 0; i--) {
      const o = this.obs[i]; const ahead = p.z - o.z;
      if (ahead < -22 || o.dead) { if (o.dead && o.dieT > 0) { o.dieT -= dt; o.obj.position.x += o.dvx * dt; o.obj.position.y += o.dvy * dt; o.dvy -= 22 * dt; o.obj.rotation.x += o.drx * dt; o.obj.rotation.z += o.drz * dt; o.obj.position.z -= this.speed * 0.2 * dt; if (o.dieT > 0) continue; } this.release(o); this.obs.splice(i, 1); continue; }
      if (ahead > 190) { o.obj.visible = false; continue; } o.obj.visible = true; if (o.tele) TELE.update(o, ahead, this.time);
      if (o.cls === 'cross') {
        if (o.waiting && ahead < 52) { o.waiting = false; const tArr = Math.max(0.5, ahead / Math.max(this.speed, 12)); o.vx = clamp((o.tx - o.x) / tArr, -5, 5); }
        if (!o.waiting) { o.x += o.vx * dt; o.walk += dt; } o.obj.position.x = o.x; o.obj.position.y = Math.abs(Math.sin(o.ph + this.time * 9)) * (o.waiting ? 0.0 : 0.08); o.obj.rotation.z = Math.sin(this.time * 9 + o.ph) * (o.waiting ? 0.02 : 0.07); o.obj.rotation.y = o.waiting ? -o.side * 1.4 : (o.vx > 0 ? 1.4 : -1.4) * 1.0;
      } else if (o.cls === 'bird') {
        const fl = Math.sin(this.time * 22 + o.ph) * 0.8; o.wl.rotation.z = fl; o.wr.rotation.z = -fl; o.obj.position.y = o.base + Math.sin(this.time * 4 + o.ph) * 0.05; o.obj.position.x = o.x + Math.sin(this.time * 2 + o.ph) * 0.1;
      }
      // coches con bocina cuando pasas cerca
      if (o.cls === 'solid' && !o.honked && ahead < 6 && ahead > 0 && Math.abs(o.x - p.x) < LW * 1.1 && Math.random() < 0.012) { o.honked = true; A.honk(); }
    }
  }
  collide(dt) {
    const p = this.p; if (this.tut >= 0) return; if (p.invul > 0 || p.turboT > 0 || this.startGrace > 0.5) return;
    const ph = p.slideT > 0 ? PH_SLIDE : PH; const px0 = p.x - 0.34, px1 = p.x + 0.34;
    for (const o of this.obs) {
      if (o.dead || o.cls === 'ramp') continue; const dzz = Math.abs(p.z - o.z); if (dzz > o.len / 2 + 2.2) continue;
      const ox = o.x; if (px1 < ox - o.hw + 0.22 || px0 > ox + o.hw - 0.22) continue;
      if (dzz > o.len / 2 + 0.3) continue;
      if (p.y >= o.y1 - 0.26 || p.y + ph <= o.y0 + 0.24) continue;
      const depth = (o.z + o.len / 2) - (p.z - 0.7); const lanechg = p.laneT < 0.32 && Math.abs(p.x - p.lane * LW) > 0.08;
      if (p.caneT > 0 && p.y > 1.0 && o.cls !== 'high') continue;
      if (p.shieldT > 0) { this.breakShield(o); return; }
      if (depth > 1.0 && lanechg && p.stumbleT <= 0 && o.cls !== 'bird') { this.sideBump(o); return; }
      this.crash(o); return;
    }
  }
  sideBump(o) {
    const p = this.p; p.lane = p.lastLane; p.laneT = 0; p.stumbleT = 1.8; this.speed *= 0.82; A.stumble(); this.fx.camShake(0.45); this.fx.stars(p.x, 1, p.z, 8); this.say(pick(SHOUTS.stumble), 1.4); this.cb.flash && this.cb.flash('#ffb02a', 0.25);
  }
  breakShield(o) {
    const p = this.p; p.shieldT = 0; this.rig.shield.visible = false; p.invul = 1.3; this.cnt.shield++; A.shieldBreak(); this.fx.camShake(0.5); this.fx.ring(p.x, 1, p.z, 0x4dff9a); this.say(pick(SHOUTS.fajaBreak), 1.6);
    this.smash(o); if (this.char.id === 'rockero') { A.boom(); this.fx.camShake(0.9); this.coinsRun += 20; this.cb.pop && this.cb.pop('¡GUITARRAZO!', '#ff4f8a'); for (const q of this.obs) if (!q.dead && q.cls !== 'ramp' && Math.abs(q.z - p.z) < 30 && p.z - q.z > -4) this.smash(q); this.fx.ring(p.x, 1, p.z - 2, 0xff4f8a); }
  }
  smash(o) { if (o.dead) return; o.dead = true; o.dieT = 1.1; o.dvx = rand(-8, 8); o.dvy = rand(8, 14); o.drx = rand(-8, 8); o.drz = rand(-8, 8); this.fx.burst(o.x, 1, o.z, 20, [0xffffff, 0xffd23c, 0xff5a1a], 8, 0.6, 0.3, 14); }
  crash(o) {
    const p = this.p;
    if (this.char.id === 'super' && !this.usedFree) { this.usedFree = true; p.invul = 3.2; for (const q of this.obs) if (!q.dead && q.cls !== 'ramp' && Math.abs(q.z - p.z) < 40) this.smash(q); this.say('¡Segundo aliento! ¡Soy imparable!', 2.4); A.fanfare(); this.fx.camShake(0.8); this.fx.ring(p.x, 1, p.z, 0xffd23c); this.cb.flash && this.cb.flash('#ffd23c', 0.35); return; }
    p.crashed = true; this.state = 'crash'; this.crashT = 0; this.ts = 0.4; this.crashObs = o;
    A.crash(); A.engineStop(); A.honk(); this.fx.camShake(1.0); this.fx.stars(p.x, 1.2, p.z, 20); this.fx.burst(p.x, 1, p.z, 24, [0xffffff, 0xffd23c, 0xff5a1a, 0xe8453c], 8, 0.8, 0.3, 14); this.cb.flash && this.cb.flash('#ff3b30', 0.5);
    this.say(pick(SHOUTS.hit), 1.6); p.fvx = rand(-3, 3); p.fvy = 9; p.fvz = -this.speed * 0.45; this.rig.shield.visible = false;
  }
  updateCrash(dt, last = true, fdt = dt) {
    const p = this.p, R = this.rig; this.crashT += dt / Math.max(0.01, this.ts); // real-time-ish
    p.fvy -= 24 * dt; R.root.position.x += p.fvx * dt; R.root.position.y = Math.max(0, R.root.position.y + p.fvy * dt); R.root.position.z += p.fvz * dt; p.fvz *= (1 - 1.2 * dt); R.root.rotation.z += 5 * dt; R.root.rotation.x -= 4 * dt;
    if (R.root.position.y <= 0 && p.fvy < 0) { p.fvy = Math.abs(p.fvy) * 0.35; p.fvx *= 0.7; if (Math.abs(p.fvy) < 1) p.fvy = 0; }
    this.ps.crash = true; this.ps.speed = 0; this.ps.scream = true; poseRig(R, this.ps, dt, this.time); this.speed = damp(this.speed, 0, 3, dt);
    if (last) { this.updateCam(fdt, true); this.world.update(this.dist, p.z, this.camera.position, fdt, this.h, this.camera.fov, this.time); this.fx.updateLines(p.x, p.z, this.speed, 0, fdt); }
    this.updateObstacles(dt); this.updateCoins(dt); this.updatePills(dt);
    if (this.crashT > 0.55 && this.ts < 1) this.ts = 0.7; if (this.crashT > 1.5 && this.state === 'crash') this.endRun();
  }
  endRun() {
    this.state = 'over'; this.ts = 1; this.camMode = 'over'; A.engineStop(); const run = this.summary(); this.run = run; this.bank();
    this.cb.over && this.cb.over(run); A.musicStart(0, true); this.cb.state && this.cb.state('over');
  }
  summary() {
    const score = Math.floor(this.score), dist = Math.floor(this.dist), newBest = score > S.best; const done = [];
    const add = a => a && a.forEach(m => done.push(m));
    add(ST.mission('coins', this.cnt.coins)); add(ST.mission('dist', dist, 'max')); add(ST.mission('score', score, 'max')); add(ST.mission('jump', this.cnt.jump)); add(ST.mission('slide', this.cnt.slide)); add(ST.mission('pills', this.cnt.pills)); add(ST.mission('flip', this.cnt.flip)); add(ST.mission('turbo', this.cnt.turbo)); add(ST.mission('shield', this.cnt.shield)); add(ST.mission('district', Math.min(5, this.maxDi), 'max'));
    for (const k in this.cnt) this.cnt[k] = 0; /* ya contadas: así seguir tras revivir no las cuenta dos veces */
    return { score, dist, coins: Math.floor(this.coinsRun), newBest, best: Math.max(S.best, score), done, canFree: false, cost: this.continueCost() };
  }
  bank() { const run = this.run; const add = Math.floor(this.coinsRun) - this.banked; this.banked = Math.floor(this.coinsRun); S.coins += add; S.totalCoins += add; if (run.score > S.best) S.best = run.score; if (run.dist > S.bestDist) S.bestDist = run.dist; S.runs++; ST.save(); }
  continueCost() { return Math.min(2000, 100 * Math.pow(2, this.continues)); }
  canContinue() { return S.coins >= this.continueCost(); }
  doContinue() {
    const cost = this.continueCost(); if (S.coins < cost || this.state !== 'over' || this.reviving) return false; this.reviving = true; S.coins -= cost; this.continues++; ST.save();
    const p = this.p, R = this.rig;
    /* CAUSA del cuelgue: en la pantalla de fin updateMenu() deja p.z = 0 y la cámara en modo 'over' (con desplazamiento de vista); al seguir, el abuelo quedaba en z=0 lejos del mundo (z = -distancia) y la cámara fija en el menú. Restauramos todo. */
    p.z = -this.dist; p.zPrev = p.z; p.crashed = false; p.fall = false; p.invul = 3.0; p.y = 0; p.vy = 0; p.slideT = 0; p.air = false; p.onRamp = false; p.flipping = false; p.flip = 0; p.stumbleT = 0; p.vx = 0; p.wob = 0; p.wobV = 0; p.fvx = 0; p.fvy = 0; p.fvz = 0;
    p.shieldT = 0; p.turboT = 0; R.shield.visible = false; this.ts = 1; this.tsT = 1; this.crashT = 0;
    R.tilt.scale.set(1, 1, 1); R.tilt.rotation.set(0, 0, 0); R.root.rotation.set(0, 0, 0); R.root.visible = true; R.root.scale.setScalar(RS);
    p.lane = 0; p.x = 0; p.lastLane = 0; p.laneT = 99; R.root.position.set(p.x, 0, p.z);
    for (const q of this.obs) if (!q.dead && q.cls !== 'ramp' && q.z < p.z + 8 && q.z > p.z - 70) this.smash(q); // despeja el camino (detrás, encima y 70 m por delante)
    for (const q of this.obs) if (q.cls === 'ramp' && !q.dead && Math.abs(q.z - p.z) < 10) this.smash(q);
    this.ps.crash = false; this.ps.scream = false; this.ps.idle = false; this.ps.air = false; this.ps.slide = false;
    /* cámara de carrera de nuevo, sin desplazamiento de menú ni mezcla con la cámara del menú */
    this.camMode = 'run'; this.camBlend = 1; this.cx = null; this.cy = null; this.cz = null; this.vOff = 0; this.vOffOn = false; try { this.camera.clearViewOffset(); } catch (_) { }
    this.speed = 10; this.startGrace = 0; this.runT = 2; this.state = 'play'; this.last = performance.now();
    A.engineStop(); A.engineStart(); A.resume(); A.musicStart(distIdxAt(this.dist), false);
    this.updateCam(0.016, false); this.fx.ring(p.x, 1, p.z, 0xffd23c); this.say('¡Otra vez! ¡Esto no hay quien lo pare!', 2.2); this.cb.state && this.cb.state('play'); this.cb.flash && this.cb.flash('#ffffff', 0.3);
    this.reviving = false; return true;
  }
  /* ---------- pickups ---------- */
  pickups(dt) {
    const p = this.p, ph = p.slideT > 0 ? PH_SLIDE : PH; const z0 = Math.min(p.z, p.zPrev) - 0.9, z1 = Math.max(p.z, p.zPrev) + 0.9;
    const mag = p.magT > 0 || this.char.id === 'rayo'; const mr = p.magT > 0 ? 9 : 3.5;
    const val = (this.char.id === 'pirata' ? 1.25 : 1) * (p.cafeT > 0 ? 2 : 1);
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.z > p.z + 6) { this.coins.splice(i, 1); continue; }
      if (mag && !c.mag && c.z > p.z - mr && c.z < p.z + 1 && Math.abs(c.x - p.x) < mr * 0.8 && Math.abs(c.y - p.y) < mr) c.mag = true;
      if (c.mag) { const k = Math.min(1, 16 * dt); c.x += (p.x - c.x) * k; c.y += (p.y + 0.7 - c.y) * k; c.z += (p.z - c.z) * Math.min(1, 9 * dt) - 0; }
      if (c.z >= z0 && c.z <= z1 || c.mag && Math.hypot(c.x - p.x, c.z - p.z) < 1.1) {
        if (Math.abs(c.x - p.x) < 0.95 && c.y > p.y - 0.4 && c.y < p.y + ph + 0.5 || c.mag && Math.hypot(c.x - p.x, c.z - p.z) < 1.1) {
          const v = (c.gold ? 5 : 1) * val; this.coinsRun += v; this.cnt.coins += c.gold ? 5 : 1; this.score += 10 * ST.S.mult; this.streak++; this.streakT = 0.5; if (c.gold) { A.gold(); this.say(pick(SHOUTS.gold), 1.4); this.fx.burst(c.x, c.y, c.z, 12, [0xffd23c, 0xffffff], 5, 0.5, 0.25, 6); } else { A.coin(this.streak); if (Math.random() < 0.025) this.say(pick(SHOUTS.coin), 1.3); }
          this.fx.sparkle(c.x, c.y, c.z, 5, c.gold ? 0xffe36a : 0xfff0a0); this.coins.splice(i, 1);
        }
      }
    }
    for (let i = this.pills.length - 1; i >= 0; i--) {
      const q = this.pills[i]; if (Math.abs(q.z - p.z) < 1.3 && Math.abs(q.x - p.x) < 1.3 && p.y < 3.2 + (p.turboT > 0 ? 3 : 0)) {
        this.cnt.pills++; this.score += 100 * ST.S.mult; this.startPill(q.type); this.fx.burst(q.x, 1.2, q.z, 18, [PILLS[q.type].col, 0xffffff, PILLS[q.type].col2], 7, 0.6, 0.28, 5); this.scene.remove(q.obj); this.pills.splice(i, 1); this.cb.pill && this.cb.pill(q.type);
      }
    }
  }
  updateCoins(dt) {
    const p = this.p, t = this.time; let n = 0, g = 0; const m4 = this._m4 || (this._m4 = new THREE.Matrix4()), q = this._q || (this._q = new THREE.Quaternion()), s = this._s || (this._s = new THREE.Vector3()), v = this._v || (this._v = new THREE.Vector3()), up = this._up || (this._up = new THREE.Vector3(0, 1, 0));
    for (const c of this.coins) {
      const ahead = p.z - c.z; if (ahead > 180 || ahead < -8) continue;
      q.setFromAxisAngle(up, t * 3.2 + c.ph); s.setScalar(c.gold ? 1.3 : 1.1); v.set(c.x, c.y - 0.1 + Math.sin(t * 4 + c.ph) * 0.05, c.z); m4.compose(v, q, s);
      if (c.gold) { if (g < 120) this.cmG.setMatrixAt(g++, m4); } else if (n < 460) this.cmN.setMatrixAt(n++, m4);
    }
    this.cmN.count = n; this.cmG.count = g; this.cmN.instanceMatrix.needsUpdate = true; this.cmG.instanceMatrix.needsUpdate = true;
  }
  updatePills(dt) { const t = this.time; for (const q of this.pills) { q.m.rotation.y = t * 2.2 + q.ph; q.m.position.y = Math.sin(t * 3 + q.ph) * 0.12; q.m.rotation.z = Math.sin(t * 1.7 + q.ph) * 0.2; } }
  /* ---------- rig, camera ---------- */
  updateRig(dt) {
    const p = this.p, R = this.rig, s = this.ps; const rootPos = R.root.position; rootPos.x = p.x; rootPos.y = p.y; rootPos.z = p.z;
    const dx = p.lane * LW - p.x; s.speed = this.speed; s.roll = clamp(-p.vx * 0.075 - dx * 0.12, -0.45, 0.45); s.yaw = clamp(-p.vx * 0.026, -0.28, 0.28);
    { const w = p.wob; R.tilt.scale.set(1 + w * 0.12, 1 - w * 0.24, 1 + w * 0.12); } s.air = p.air && p.turboT <= 0; s.vy = p.vy; s.slide = p.slideT > 0 && !p.air; s.turbo = p.turboT > 0; s.crash = false; s.idle = false; s.scream = p.turboT > 0 || (p.air && p.vy > 4 && p.caneT > 0); s.shieldWarn = p.shieldT > 0 && p.shieldT < 2.5; s.cheer = p.flipping;
    s.wheelie = this.startGrace > 0 ? 0.12 : 0;
    this.glT = (this.glT == null ? 2.2 : this.glT) - dt; if (this.glT <= 0) { this.glW = 1.15; this.glT = 3.6 + Math.random() * 3; }
    this.glW = Math.max(0, (this.glW || 0) - dt); s.glance = this.glW > 0 && !p.crashed && this.tut < 0 ? 1 : 0;
    if (p.flipping) { R.tilt.rotation.x = -p.flip * TAU; } else if (Math.abs(R.tilt.rotation.x) > TAU - 0.5) R.tilt.rotation.x = 0;
    // pose first (it damps tilt); keep flip override after
    const fl = p.flip; poseRig(R, s, dt, this.time); if (p.flipping) { R.tilt.rotation.x = -fl * TAU; }
    if (p.invul > 0 && p.turboT <= 0 && p.shieldT <= 0) R.root.visible = Math.floor(this.time * 18) % 2 === 0; else R.root.visible = true;
    if (p.invul > 0 && !(p.shieldT > 0) && p.invul < 3.3 && this.state === 'play') { /* blink handled */ }
    // particles
    const nz = p.z + 1.5, fy = p.y + 0.66, big = p.turboT > 0 ? 1.7 : 1;
    for (const sx of [-0.34, 0.34]) { this.fx.flame(p.x + sx, fy, nz, -this.speed * 0.72, big); if (p.turboT > 0 || Math.random() < 0.3) this.fx.flame(p.x + sx, fy, nz + 0.4, -this.speed * 0.65, big); this.fx.core(p.x + sx, fy, nz - 0.05, -this.speed * 0.7); if (Math.random() < dt * 55) this.fx.spark(p.x + sx, fy, nz + 0.2, -this.speed * 0.7); if (Math.random() < dt * 9) this.fx.smoke(p.x + sx, fy + 0.05, nz + 0.8, -this.speed * 0.5); }
    if (!p.air && this.speed > 8 && Math.random() < dt * 22) this.fx.dust(p.x + (Math.random() < 0.5 ? -0.6 : 0.6), 0, p.z + 0.2, 1, 0xd8d0c0, -this.speed * 0.6);
    if (p.turboT > 0 && Math.random() < dt * 40) this.fx.smoke(p.x, fy, nz + 1, -this.speed * 0.55);
    if (p.shieldT > 0) { R.shield.visible = true; R.shield.position.y = 0.95; }
    if (p.slideT > 0 && !p.air && Math.random() < dt * 40) this.fx.dust(p.x, 0, p.z + 0.5, 1, 0xe8e0d0, 4);
  }
  setVOff(t, dt) { this.vOff = damp(this.vOff || 0, t, 5, dt); if (Math.abs(this.vOff) < 0.002 && t === 0) { if (this.vOffOn) { this.camera.clearViewOffset(); this.vOffOn = false; } } else { this.camera.setViewOffset(this.w, this.h, 0, this.vOff * this.h, this.w, this.h); this.vOffOn = true; } }
  updateCam(dt, crash) {
    if (this.vOff) this.setVOff(0, dt);
    const p = this.p, c = this.camera, s = this.speed; const back = 7.9, hgt = 5.5; const turbo = p.turboT > 0;
    const tx = p.x * 0.6, ty = hgt + p.y * 0.4 + (turbo ? 0.8 : 0), tz = p.z + back + (turbo ? 1.4 : 0) + clamp(s * 0.03, 0, 1.0);
    this.cx = damp(this.cx != null ? this.cx : tx, tx, 7, dt); this.cy = damp(this.cy != null ? this.cy : ty, ty, 5, dt); this.cz = damp(this.cz != null ? this.cz : tz, tz, 8, dt);
    if (this.camBlend < 1) { this.camBlend = Math.min(1, this.camBlend + dt * 1.2); }
    const sh = this.fx.shake; let ox = 0, oy = 0; if (sh > 0.001) { ox = (Math.random() - 0.5) * sh * 0.7; oy = (Math.random() - 0.5) * sh * 0.7; this.fx.shake = Math.max(0, sh - dt * 2.6); }
    const k = smoothK(this.camBlend);
    c.position.set(lerp(this.menuCam.x, this.cx, k) + ox, lerp(this.menuCam.y, this.cy, k) + oy, lerp(this.menuCam.z, this.cz, k));
    const lx = lerp(this.menuLook.x, p.x * 0.5, k), ly = lerp(this.menuLook.y, 1.2 + p.y * 0.55, k), lz = lerp(this.menuLook.z, p.z - 12, k); c.lookAt(lx, ly, lz);
    let fov = this.baseFov + clamp((s - 15) * 0.22, 0, 4) + (turbo ? 6 : 0); this.fovCur = damp(this.fovCur || fov, fov, 4, dt); if (Math.abs(this.camera.fov - this.fovCur) > 0.02) { this.camera.fov = this.fovCur; this.camera.updateProjectionMatrix(); }
    if (this.bump) { this.bump = 0; }
  }
  /* ---------- menu ---------- */
  updateMenu(dt) {
    this.time += dt; const R = this.rig, p = this.p;
    const presets = { home: { c: [2.6, 1.9, -4.6], l: [0, 1.15, 0.2] }, over: { c: [1.5, 1.5, -5.6], l: [0, 1.0, 0] }, taller: { c: [-5.4, 2.0, 6.2], l: [0, 0.9, 0.2] }, abuelos: { c: [1.4, 1.6, -5.3], l: [0, 1.0, 0] }, misiones: { c: [2.6, 1.9, -4.6], l: [0, 1.15, 0.2] } };
    const pr = presets[this.camMode] || presets.home; const mc = this.menuCam, ml = this.menuLook;
    const orbit = this.camMode === 'abuelos' || this.camMode === 'home' ? Math.sin(this.time * 0.35) * 0.35 : 0;
    const sc = this.aspect > 1 ? 1 + Math.min(0.55, (this.aspect - 1) * 0.7) : 1; const cx = pr.l[0] + (pr.c[0] - pr.l[0]) * sc + orbit, cz = pr.l[2] + (pr.c[2] - pr.l[2]) * sc; mc.x = damp(mc.x, cx, 3.5, dt); mc.y = damp(mc.y, pr.c[1] + (sc - 1) * 0.6, 3.5, dt); mc.z = damp(mc.z, cz, 3.5, dt); ml.x = damp(ml.x, pr.l[0], 3.5, dt); ml.y = damp(ml.y, pr.l[1], 3.5, dt); ml.z = damp(ml.z, pr.l[2], 3.5, dt);
    const zo = this.state === 'over' ? -this.dist : 0; /* en la pantalla de fin, abuelo y cámara se quedan donde acabó la carrera, con la calle detrás */
    if (this.state !== 'over') { Object.assign(p, { x: 0, y: 0, z: 0 }); this.speed = 0; }
    const ps = this.ps; ps.speed = this.state === 'over' ? 0 : 0; ps.idle = true; ps.roll = 0; ps.yaw = 0; ps.air = false; ps.slide = false; ps.turbo = false; ps.crash = false; ps.scream = false; ps.shieldWarn = false; ps.cheer = false; ps.wheelie = 0; ps.hideFlag = this.camMode === 'taller';
    if (this.state === 'over') { R.root.position.set(0, 0, zo); R.root.rotation.set(0, 0, 0); R.tilt.rotation.set(0, 0, 0); R.root.visible = true; p.x = 0; p.z = zo; p.zPrev = zo; }
    R.root.rotation.y = damp(R.root.rotation.y, this.camMode === 'taller' ? 0 : 0, 6, dt); poseRig(R, ps, dt, this.time);
    if (Math.random() < dt * 14) this.fx.flame(0.34, 0.66, 1.5 + zo, 3, 0.7), this.fx.flame(-0.34, 0.66, 1.5 + zo, 3, 0.7), this.fx.spark(0.34, 0.66, 1.6 + zo, 3), this.fx.spark(-0.34, 0.66, 1.6 + zo, 3);
    this.setVOff(({ taller: 0.34, abuelos: 0.25, over: 0.27 }[this.camMode] || 0) * (this.aspect > 1 ? 0.4 : 1), dt);
    this.camBlend = 0; const c = this.camera; c.position.set(mc.x, mc.y, mc.z + zo); c.lookAt(ml.x, ml.y, ml.z + zo);
    if (Math.abs(c.fov - this.baseFov) > 0.05) { c.fov = this.baseFov; c.updateProjectionMatrix(); } this.fovCur = this.baseFov; this.cx = null; this.cy = null; this.cz = null;
    this.world.update(this.state === 'over' ? this.dist : 0, p.z, c.position, dt, this.h, c.fov, this.time);
    this.updateCoins(dt); this.fx.updateLines(0, 0, 0, 0, dt);
  }
  pushHud() {
    const p = this.p; this.cb.hud && this.cb.hud({ score: Math.floor(this.score), coins: Math.floor(this.coinsRun), dist: Math.floor(this.dist), mult: ST.S.mult * (p.cafeT > 0 ? 2 : 1), tur: p.turboT > 0 ? p.turboT / p.turboMax : 0, mag: p.magT > 0 ? p.magT / p.magMax : 0, shd: p.shieldT > 0 ? p.shieldT / p.shieldMax : 0, can: p.caneT > 0 ? p.caneT / p.caneMax : 0, caf: p.cafeT > 0 ? p.cafeT / p.cafeMax : 0, tut: this.tut, di: distIdxAt(this.dist), kmh: Math.round(this.speed * 3.6) });
  }
  render() {
    try { this.r.render(this.scene, this.camera); this.renderErr = 0; }
    catch (e) { this.renderErr = (this.renderErr || 0) + 1; if (this.renderErr < 4) console.error('render error', e); }
  }
  /* compila de antemano los materiales de TODOS los barrios (así el cambio a Neones no se atasca ni falla al estrenar shaders) */
  prewarm() {
    try {
      const w = this.world, mats = [...w.roadMat, ...w.facadeMat, w.glowMat], tmp = [];
      for (const m of mats) { const me = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), m); me.frustumCulled = false; this.scene.add(me); tmp.push(me); }
      this.r.compile(this.scene, this.camera); tmp.forEach(me => { this.scene.remove(me); me.geometry.dispose(); });
    } catch (e) { console.warn('prewarm', e); }
  }
  /* headless helper for tests: advance simulation without drawing */
  stepSim(dt) { if (this.state === 'play' || this.state === 'crash') this.sim(dt * this.ts); }
}
function smoothK(t) { return t * t * (3 - 2 * t); }
Game.prototype.menuCam = null;
const _init = Game.prototype.init;
Game.prototype.init = function (...a) { this.menuCam = new THREE.Vector3(2.6, 1.9, -4.6); this.menuLook = new THREE.Vector3(0, 1.15, 0.2); return _init.apply(this, a); };
