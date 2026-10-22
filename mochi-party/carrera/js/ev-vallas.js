// 🐍 VALLAS SERPIENTE (3D): pista de atletismo con serpientes que ondulan, público de gelatina y meta
import { THREE, camera, toon, outline, mesh, glowSprite, makeRunner, skyDome, lights, rnd, clamp, lerp, pick, Audio, OUCH } from './core3d.js?v=m15';
const L = 300, LW = 1.7, SEG = 14, V0 = 9.5, BSTEP = .35, BMAX = 2.1;
const laneX = l => (l - 2.5) * LW;
function checker() { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#ffffff' : '#5a3a6e'; x.fillRect(i * 16, j * 16, 16, 16); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
function textTex(txt, bg, fg = '#fff', w = 512, h = 128, fs = 70) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 30); x.fill(); x.font = `700 ${fs}px Fredoka`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = 'rgba(120,40,100,.6)'; x.strokeText(txt, w / 2, h / 2 + 4); x.fillStyle = fg; x.fillText(txt, w / 2, h / 2 + 4); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
export default {
  id: 'vallas', name: 'Vallas Serpiente', icon: '🐍', maxT: 70, music: { bpm: 140, root: 60, scale: 'major' }, netKeys: ['z', 'y', 'vy', 'v', 'stun', 'boost', 'lane', 'land', 'perf', 'streak', 'bonus'], seed: 23, tagY: 1.35, tagS: .45,
  how: 'Toca para saltar (puedes tocar un poco antes, el salto se guarda). Las serpientes empiezan bajitas y van creciendo. Coge 🛡️ escudo, 🦘 supersalto y ⚡ turbo. ¡Encadena Perfectos!',
  dispose() { const d = document.getElementById('perf'); if (d) d.remove(); },
  init(E) {
    const sc = E.scene; sc.fog = new THREE.Fog('#ffe3f1', 60, 170); this.sky = skyDome(sc, '#ff9ec7', '#ffd0e6', '#fff0dd'); this.sky.renderOrder = -1; lights(sc, '#ffffff', '#ffd6ea', 1.0, 2.0);
    // sol con cara
    const sun = new THREE.Group(); sun.position.set(30, 55, -150); sc.add(sun); const sm = toon('#ffd36b', { emissive: '#ffb030', ei: .5 }); sm.fog = false;
    mesh(new THREE.SphereGeometry(12, 32, 20), sm, sun); sun.add(glowSprite('#ffe27a', 70, .7));
    // pista
    const tr = mesh(new THREE.PlaneGeometry(LW * 6 + 1.2, L + 80), toon('#ff8a6a', { rim: 0 }), sc, [0, 0, -L / 2 + 20], [-Math.PI / 2, 0, 0]);
    for (let l = 0; l <= 6; l++) mesh(new THREE.PlaneGeometry(.08, L + 80), toon('#ffffff', { rim: 0, po: 1 }), sc, [laneX(l) - LW / 2, .01, -L / 2 + 20], [-Math.PI / 2, 0, 0]);
    for (let z = 0; z <= L; z += 50) mesh(new THREE.PlaneGeometry(LW * 6, .25), toon(z === 0 ? '#ffffff' : '#ffe6d8', { rim: 0, po: 1 }), sc, [0, .012, -z], [-Math.PI / 2, 0, 0]);
    // césped de gominola
    for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(14, L + 120), toon('#9fe3c9', { rim: 0 }), sc, [s * (LW * 3 + 7.6), -.02, -L / 2 + 20], [-Math.PI / 2, 0, 0]);
    // gradas y público gelatina (instanciado)
    const crowdG = new THREE.SphereGeometry(.42, 8, 6); const cols = ['#ff9cc8', '#7ee3c4', '#ffd98a', '#9fc3ff', '#ff8fd8', '#c9b2ff', '#ffb36b'];
    this.crowd = []; const tmp = new THREE.Object3D();
    for (const s of [-1, 1]) {
      for (let row = 0; row < 4; row++) { mesh(new THREE.BoxGeometry(2.2, .6 + row * .9, L + 60), toon(row % 2 ? '#c9b2ff' : '#b9a2f7', { rim: .2 }), sc, [s * (LW * 3 + 4 + row * 2.2), (.6 + row * .9) / 2, -L / 2 + 20]); }
      for (const c of cols) { const im = new THREE.InstancedMesh(crowdG, toon(c, { rim: .5 }), 120); im.userData = { s, items: [] }; sc.add(im); this.crowd.push(im); }
    }
    let ci = 0; for (const im of this.crowd) { for (let i = 0; i < 120; i++) { const row = i % 4, z = 20 - (Math.floor(i / 4) * 10.5 + (ci % 7) * 1.5 + row * .3); im.userData.items.push({ x: im.userData.s * (LW * 3 + 4 + row * 2.2), y: .6 + row * .9 + .35, z, ph: rnd(0, 6) }); } ci++; }
    // decorado surrealista: piruletas gigantes, donuts flotantes, nubes y banderines
    for (let z = 10; z > -L - 40; z -= 28) for (const s of [-1, 1]) {
      const lx = s * (LW * 3 + 14 + rnd(0, 8)); const g = new THREE.Group(); g.position.set(lx, 0, z + rnd(-6, 6)); sc.add(g);
      if (Math.random() < .5) { mesh(new THREE.CylinderGeometry(.18, .18, 7, 8), toon('#ffffff'), g, [0, 3.5, 0]); const pop = mesh(new THREE.CylinderGeometry(2.2, 2.2, .5, 28), toon(pick(['#ff7fbf', '#7ee3c4', '#ffd36b', '#8fd0ff'])), g, [0, 8, 0], [Math.PI / 2, 0, 0]); outline(pop, '#5a3a6e', 1.04); mesh(new THREE.TorusGeometry(1.3, .18, 8, 30), toon('#ffffff'), g, [0, 8, .3]); }
      else { const d = mesh(new THREE.TorusGeometry(2.4, 1.1, 14, 28), toon('#ffcf8a'), g, [0, 9 + rnd(0, 6), 0], [rnd(-.4, .4), rnd(-1, 1), 0]); mesh(new THREE.TorusGeometry(2.4, .9, 14, 28, Math.PI * 2), toon(pick(['#ff9cc8', '#c9b2ff', '#7ee3c4'])), d, [0, 0, .35], null, [1, 1, .9]); g.userData.float = d; }
    }
    for (let i = 0; i < 16; i++) { const c = new THREE.Group(); c.position.set(rnd(-90, 90), rnd(28, 50), rnd(-L - 60, 0) - 40); for (let k = 0; k < 5; k++) mesh(new THREE.SphereGeometry(rnd(3, 5), 14, 10), toon('#ffffff', { rim: .7 }), c, [k * 3.2 - 6, rnd(-1, 1.5), rnd(-1, 1)]); sc.add(c); }
    // meta y salida
    for (const [z, txt] of [[-L, '¡META!'], [0, 'SALIDA']]) { const g = new THREE.Group(); g.position.z = z; sc.add(g);
      for (const s of [-1, 1]) { const p = mesh(new THREE.CylinderGeometry(.35, .35, 6.5, 14), toon('#ffffff'), g, [s * (LW * 3 + .7), 3.25, 0]); outline(p, '#5a3a6e', 1.06); mesh(new THREE.SphereGeometry(.7, 16, 12), toon('#ff7fbf', { emissive: '#ff4f9a', ei: .2 }), g, [s * (LW * 3 + .7), 6.8, 0]); }
      mesh(new THREE.PlaneGeometry(LW * 6 + 1.4, 1.6), new THREE.MeshBasicMaterial({ map: textTex(txt, z ? '#ff6fae' : '#9b82f0', '#fff', 1024, 160, 100), side: THREE.DoubleSide }), g, [0, 5.8, 0]);
      if (z) mesh(new THREE.PlaneGeometry(LW * 6 + 1.4, .5), new THREE.MeshBasicMaterial({ map: checker(), side: THREE.DoubleSide }), g, [0, 4.75, 0]); }
    // serpientes-valla
    this.S = []; for (let z = 22; z < L - 12; z += rnd(19, 25)) this.S.push(z);
    // power-ups entre serpientes (en todas las calles, justo y para todos)
    this.PU = []; const PT = { shield: ['🛡️', '#8fd0ff'], super: ['🦘', '#ffb36b'], turbo: ['⚡', '#ffe27a'], star: ['⭐', '#ff9cf0'] };
    for (let k = 1; k < this.S.length - 1; k++) { if (k % 3 !== 1) continue; const type = pick(['shield', 'super', 'turbo', 'turbo', 'star']); const z = (this.S[k] + this.S[k + 1]) / 2;
      for (let l = 0; l < 6; l++) { const g = new THREE.Group(); g.position.set(laneX(l), .9, -z); sc.add(g); g.add(glowSprite(PT[type][1], 1.6, .9)); mesh(new THREE.IcosahedronGeometry(.28, 1), toon(PT[type][1], { emissive: PT[type][1], ei: .4 }), g); this.PU.push({ z, l, type, g, taken: false }); } }
    this.PTX = PT;
    const nS = this.S.length * 6;
    this.snkA = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), toon('#7ee3c4', { rim: .5 }), nS * SEG); this.snkB = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), toon('#ffe27a', { rim: .5 }), nS * SEG);
    sc.add(this.snkA, this.snkB);
    this.heads = []; const hm = toon('#5fd0a8', { rim: .5 }), em = toon('#ffffff', { rim: 0 }), pm = toon('#2a1838', { rim: 0 }), tm = toon('#ff4f6a', { rim: 0 });
    for (let k = 0; k < this.S.length; k++) for (let l = 0; l < 6; l++) { const h = new THREE.Group(); sc.add(h); const hd = mesh(new THREE.SphereGeometry(.26, 16, 12), hm, h, null, null, [1, .8, 1.25]); outline(hd, '#2b7c5c', 1.08);
      for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(.09, 10, 8), em, h, [s * .12, .14, .18]); mesh(new THREE.SphereGeometry(.05, 8, 6), pm, e, [0, 0, .06]); }
      const tg = mesh(new THREE.BoxGeometry(.04, .02, .3), tm, h, [0, -.04, .4]); h.userData = { tg, k, l }; this.heads.push(h); }
    this.tmp = tmp;
    // corredores (el jugador en la calle 2, en el centro)
    let l = 0; if (E.online) E.racers.forEach((r, k) => r.lane = [2, 3, 1, 4, 0, 5][k]); else E.racers.forEach(r => { r.lane = r.me ? 2 : (l === 2 ? ++l : l) ; if (!r.me) l++; });
    E.racers.forEach((r, k) => { r.obj = makeRunner(r.ch, k, .55); sc.add(r.obj); r.z = 0; r.y = 0; r.vy = 0; r.v = 0; r.stun = 0; r.boost = 0; r.plan = null; r.perf = 0; r.streak = 0; r.bonus = 0; r.buf = 0; r.shield = 0; r.sup = 0; r.obj.rotation.y = Math.PI; });
    let pd = document.getElementById('perf'); if (!pd) { pd = document.createElement('div'); pd.id = 'perf'; pd.style.cssText = 'position:absolute;right:10px;top:calc(88px + env(safe-area-inset-top));background:rgba(110,60,150,.55);color:#fff;font:700 14px Fredoka;border-radius:12px;padding:4px 10px;text-align:right;line-height:1.25'; document.getElementById('hud').appendChild(pd); } this.pd = pd;
    this.camZ = 6; camera.far = 900; camera.updateProjectionMatrix(); for (const m of [this.snkA, this.snkB, ...this.crowd]) m.frustumCulled = false;
  },
  // curva progresiva: las primeras serpientes son bajitas y lentas; al final ondulan más altas
  df(k) { return clamp(k / Math.max(1, this.S.length - 1), 0, 1); },
  sh(k, lane, t) { const d = this.df(k); return (.22 + .1 * d) + (.25 + .3 * d) * (.5 + .5 * Math.sin((1.4 + .9 * d) * t + k * 1.9 + lane * 1.1)); },
  update(E, dt) {
    const t = E.t;
    for (const r of E.racers) {
      if (r.remote) continue;
      if (r.fin) { r.v = Math.max(0, r.v - 8 * dt); r.z += r.v * dt; continue; }
      const vmax = V0 + r.bonus + (r.boost > 0 ? 1.2 : 0); // misma base para todos: solo cuenta la habilidad
      if (r.stun > 0) { r.stun -= dt; if (r.stun <= 0) r.expr = ''; } else r.v = Math.min(vmax, r.v + 7 * dt);
      if (r.boost > 0 && (r.boost -= dt) <= 0) r.expr = '';
      const ground = r.y <= 0 && r.vy <= 0, nk = this.S.findIndex(s => s > r.z - .3), ns = this.S[nk];
      let jump = false;
      if (r.me) { if (E.taps.length > 0) r.buf = .22; r.buf -= dt; jump = r.buf > 0; if (E.AUTO && ns != null) { const d = ns - r.z; jump = d / Math.max(1, r.v) > .21 && d / Math.max(1, r.v) < .28; } }
      else if (ns != null && ground && r.stun <= 0) { if (!r.plan || r.plan.k !== nk) { const u = Math.random(), pP = .2 + .6 * r.skill, pF = .03 + .15 * (1 - r.skill); r.plan = { k: nk, f: u < pP ? rnd(.16, .34) : u < pP + pF ? pick([.04, 1.05]) : rnd(.38, .44) }; } if (ns - r.z < r.plan.f * Math.max(1, r.v) && !r.plan.done) { jump = true; r.plan.done = true; } }
      if (jump && ground && r.stun <= 0) { r.buf = 0; r.vy = r.sup > 0 ? 8.2 : 6.4; if (r.me) Audio.sfxPlay('jump'); { const tt = ns != null ? (ns - r.z) / Math.max(1, r.v) : 9; r.pk = (tt > .12 && tt < .38) || r.sup > 0 ? nk : -1; } }
      if (r.shield > 0) r.shield -= dt; if (r.sup > 0) r.sup -= dt;
      r.vy -= (r.vy > 0 ? 13 : 16) * dt; const wasAir = r.y > 0; r.y = Math.max(0, r.y + r.vy * dt); if (wasAir && r.y === 0) { r.land = .2; if (r.me) Audio.sfxPlay('land'); }
      const oz = r.z; r.z += r.v * dt;
      for (let k = 0; k < this.S.length; k++) { const s = this.S[k]; if (oz < s && r.z >= s) {
        const hh = this.sh(k, r.lane, t), P = new THREE.Vector3(laneX(r.lane), .5, -s);
        if (r.y < hh * .7 && r.shield > 0) { r.shield = 0; r.expr = 'happy'; E.burst(P.setY(1), '#8fd0ff', 20, 6, .6, .7); if (r.me) { Audio.sfxPlay('got'); E.ui.toast('¡Escudo! 🛡️ Ni te ha tocado', '#8fd0ff'); } }
        else if (r.y < hh * .7) { r.v = Math.max(4.5, r.v * .5); r.stun = .32; r.y = 0; r.vy = 0; r.expr = 'squash'; E.burst(P, '#7ee3c4', 14, 5, .6, .6); r.bonus *= .75; r.streak = 0; r.bites = (r.bites || 0) + 1; if (r.me) { Audio.sfxPlay('boing'); E.ui.toast('¡Ñam! ¡Mordisco! 🐍', '#ff9cc8'); E.shake = .35; } else E.say(r, pick(['¡Ay, mi culete!', '¡Serpiente maleducada!', ...OUCH])); }
        else if (r.y < hh && r.pk !== k) { if (r.me) E.ui.toast(pick(['¡Por los pelos! 😅', '¡Uf, casi!', '¡Rozando!']), '#fff'); }
        else if (r.pk === k) { r.boost = .8; r.perf++; r.streak++; r.bonus = Math.min(BMAX, r.bonus + BSTEP); r.expr = 'happy'; if (r.me) { Audio.sfxPlay('trick'); E.ui.toast(r.streak >= 5 ? `¡IMPARABLE! 🔥 x${r.streak}` : r.streak >= 3 ? `¡Ritmazo! 🎵 x${r.streak}` : r.streak > 1 ? `¡Perfecto! ⚡ x${r.streak}` : '¡Perfecto! ⚡', r.streak >= 3 ? '#ff9cf0' : '#ffe27a'); if (r.streak % 3 === 0) { Audio.sfxPlay('boost'); r.boost = 1.4; E.shake = .15; } E.burst(P.setY(1), '#ffe27a', 18, 6, .6, .7); } }
      } }
      for (const u of this.PU) if (!u.taken && u.l === r.lane && oz < u.z && r.z >= u.z && (r.me || Math.random() < .5 + r.skill * .4)) { u.taken = true; u.g.visible = false;
        if (u.type === 'shield') r.shield = 8; else if (u.type === 'super') r.sup = 5; else if (u.type === 'turbo') { r.boost = 1.8; r.v += 2; } else { r.bonus = Math.min(BMAX, r.bonus + BSTEP * 2); r.boost = 1; }
        if (r.me) { u.g.visible = false; Audio.sfxPlay('box'); E.ui.toast({ shield: '🛡️ ¡Escudo! Aguanta un mordisco', super: '🦘 ¡Supersalto 5 s! Todo es Perfecto', turbo: '⚡ ¡Turbo!', star: '⭐ ¡Estrella! +velocidad' }[u.type], this.PTX[u.type][1]); E.burst(new THREE.Vector3(laneX(r.lane), 1, -u.z), this.PTX[u.type][1], 22, 6, .7, .7); } }
      r.prog = clamp(r.z / L, 0, 1); if (r.z >= L) E.finish(r);
    }
  },
  render(E, dt) {
    const t = performance.now() / 1000, et = E.t, tmp = this.tmp;
    // serpientes ondulando
    let ia = 0, ib = 0;
    this.S.forEach((s, k) => { for (let l = 0; l < 6; l++) { const h = this.sh(k, l, et), x0 = laneX(l), near = s - E.me.z > -8 && s - E.me.z < 70; if (!near) continue;
      for (let i = 0; i < SEG; i++) { const u = i / (SEG - 1), x = x0 - .75 + u * 1.5, y = .1 + (h - .02) * Math.pow(Math.sin(Math.PI * u), .8), z = -s + Math.sin(u * 9 + t * 7 + k + l) * .1;
        tmp.position.set(x, y, z); tmp.scale.setScalar(.16 - Math.abs(u - .5) * .06); tmp.updateMatrix(); if (i % 2) this.snkB.setMatrixAt(ib++, tmp.matrix); else this.snkA.setMatrixAt(ia++, tmp.matrix); } } });
    this.snkA.count = ia; this.snkB.count = ib; this.snkA.instanceMatrix.needsUpdate = this.snkB.instanceMatrix.needsUpdate = true;
    for (const hd of this.heads) { const { k, l, tg } = hd.userData, s = this.S[k]; hd.visible = s - E.me.z > -8 && s - E.me.z < 70; if (!hd.visible) continue; hd.position.set(laneX(l) + .78, .28 + Math.sin(t * 3 + k + l) * .05, -s + .05); hd.rotation.y = Math.sin(t * 2 + l) * .5 - .3; tg.visible = Math.sin(t * 9 + k * 2 + l) > .3; tg.scale.z = .6 + Math.abs(Math.sin(t * 20)); }
    // público saltando (más cuando pasas cerca)
    for (const im of this.crowd) { let n = 0; im.userData.items.forEach((c) => { if (c.z > -E.me.z + 12 || c.z < -E.me.z - 110) return; const i = n++; const ex = Math.abs(c.z + E.me.z) < 14 ? 2.2 : 1; tmp.position.set(c.x, c.y + Math.abs(Math.sin(t * 5 * ex + c.ph)) * .35 * ex, c.z); tmp.scale.set(1, 1 - Math.abs(Math.sin(t * 5 * ex + c.ph)) * .15, 1); tmp.updateMatrix(); im.setMatrixAt(i, tmp.matrix); }); im.count = n; im.instanceMatrix.needsUpdate = true; }
    for (const u of this.PU) if (u.g.visible) { u.g.rotation.y = t * 2; u.g.position.y = .9 + Math.sin(t * 4 + u.l) * .15; }
    // corredores
    for (const r of E.racers) { const o = r.obj, run = r.y === 0 && r.v > .5 && r.stun <= 0; const bob = run ? Math.abs(Math.sin(t * 15 + r.k)) * .14 : 0;
      o.position.set(laneX(r.lane), r.y + bob, -r.z); o.userData.shadow.position.y = .03 - r.y - bob; o.userData.shadow.scale.setScalar(.6 * (1 - r.y * .3));
      const sq = r.land > 0 ? (r.land -= dt) * .9 : 0, sp = r.y > 0 ? -.12 : 0; o.userData.pivot.scale.set(.55 * (1 + sq - sp * .5), .55 * (1 - sq + sp), .55 * (1 + sq - sp * .5));
      o.userData.pivot.rotation.x = r.stun > 0 ? -.5 : -clamp(r.v / 40, 0, .25); o.userData.pivot.rotation.z = r.stun > 0 ? Math.sin(t * 20) * .3 : 0;
      if (r.shield > 0 && Math.random() < .35) E.burst(o.position.clone().add(new THREE.Vector3(0, .6, 0)), '#8fd0ff', 1, 1.5, .4, .4, 0);
      if (r.sup > 0 && Math.random() < .3) E.burst(o.position.clone(), '#ffb36b', 1, 1.5, .4, .4, 0);
      if (r.boost > 0 && Math.random() < .5) E.burst(o.position.clone().add(new THREE.Vector3(0, .5, .6)), '#ffe27a', 1, 2, .4, .5, 0); }
    // cámara de persecución
    const me = E.me; this.pd.innerHTML = `⚡ Perfectos: ${me.perf}<br>🔥 Racha: x${me.streak}<br>🚀 +${Math.round(me.bonus / V0 * 100)}% vel.${me.shield > 0 ? '<br>🛡️ Escudo' : ''}${me.sup > 0 ? '<br>🦘 Supersalto ' + me.sup.toFixed(0) + ' s' : ''}`; this.camZ = lerp(this.camZ, -me.z + 7.6, Math.min(1, dt * 8));
    camera.fov = lerp(camera.fov, 68 + clamp(me.v - V0, 0, 4) * 1.5 + (me.boost > 0 ? 8 : 0), Math.min(1, dt * 4)); camera.updateProjectionMatrix();
    camera.position.set(laneX(me.lane) * .6, 4.2 + me.y * .3, this.camZ); camera.lookAt(laneX(me.lane) * .5, .5, -me.z - 7); this.sky.position.copy(camera.position);
  }
};
