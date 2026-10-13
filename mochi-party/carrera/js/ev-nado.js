// 🫧 NADO EN GELATINA (3D): piscina translúcida de gelatina con medusas, montañas de flan y arcoíris
import { THREE, camera, toon, outline, mesh, glowSprite, makeRunner, skyDome, lights, rnd, clamp, lerp, pick, Audio, OUCH } from './core3d.js';
const L = 160, LW = 2, VM = 8.6, V0 = 6.5, BSTEP = .3, BMAX = 1.8, ACT = .75;
const laneX = l => (l - 2.5) * LW;
function checker() { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#fff' : '#5a3a6e'; x.fillRect(i * 16, j * 16, 16, 16); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
function tiles() { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#ffe6f2'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#ffb3d6'; x.lineWidth = 4; for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 90); t.colorSpace = THREE.SRGBColorSpace; return t; }
export default {
  id: 'nado', name: 'Nado en Gelatina', icon: '🫧', maxT: 70, music: { bpm: 124, root: 65, scale: 'pentatonic' }, netKeys: ['z', 'v', 'act', 'ak', 'stun', 'lane', 'perf', 'streak', 'bonus'], seed: 47, tagY: 1.7, tagS: .55, buttons: true,
  how: 'Nadas solo. Medusa ARRIBA: 🫧 bucea (desliza abajo). Medusa ABAJO: ⬆ salta (toca o desliza arriba). ¡Justo a tiempo = Perfecto y turbo!',
  dispose() { const d = document.getElementById('perf'); if (d) d.remove(); const L0 = document.getElementById('bL'), R0 = document.getElementById('bR'), M0 = document.getElementById('bM'); L0.innerHTML = '⬅'; R0.innerHTML = '➡'; M0.style.display = ''; L0.style.cssText = R0.style.cssText = ''; },
  init(E) {
    const sc = E.scene; sc.fog = new THREE.Fog('#ffe0f0', 50, 190); this.sky = skyDome(sc, '#8fd0ff', '#ffd6ec', '#fff2dc'); this.sky.renderOrder = -1; lights(sc, '#ffffff', '#ffc6e2', 1.0, 2.0);
    // fondo de azulejos y paredes
    const W = LW * 6 + 1;
    mesh(new THREE.PlaneGeometry(W, L + 30), new THREE.MeshToonMaterial({ map: tiles() }), sc, [0, -2.2, -L / 2], [-Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(1.2, 3.2, L + 30), toon('#ffffff', { rim: .3 }), sc, [s * (W / 2 + .6), -.7, -L / 2]); outline(w, '#c98ab0', 1.01); mesh(new THREE.BoxGeometry(8, .4, L + 60), toon('#bff0dc'), sc, [s * (W / 2 + 5), .7, -L / 2]); }
    // superficie de gelatina ondulante (translúcida)
    const sg = new THREE.PlaneGeometry(W, L + 30, 16, 160); sg.rotateX(-Math.PI / 2); this.sg = sg; this.base = sg.attributes.position.array.slice();
    const jm = new THREE.MeshPhongMaterial({ color: '#ff8fc8', transparent: true, opacity: .55, shininess: 120, specular: '#ffffff', depthWrite: false, side: THREE.DoubleSide });
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
    this.J = []; const dm = new THREE.MeshPhongMaterial({ color: '#c9b2ff', transparent: true, opacity: .75, emissive: '#8f6bff', emissiveIntensity: .35, shininess: 90 }), tm = new THREE.MeshToonMaterial({ color: '#e8d8ff', transparent: true, opacity: .8 });
    for (let z = 14; z < L - 6; z += rnd(10, 15)) for (let l = 0; l < 6; l++) { if (Math.random() < .25) continue; const g = new THREE.Group(); sc.add(g);
      const d = mesh(new THREE.SphereGeometry(.55, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), dm, g); outline(d, '#7a4ad0', 1.06);
      for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(.07, 8, 6), toon('#2a1838'), g, [s * .18, .25, .45]);
      const tn = []; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, t = mesh(new THREE.CylinderGeometry(.04, .02, .9, 5), tm, g, [Math.cos(a) * .32, -.45, Math.sin(a) * .32]); tn.push(t); }
      g.add(glowSprite('#d8b8ff', 2.2, .35)); this.J.push({ z, lane: l, ph: rnd(0, 6), g, tn, up: Math.random() < .5 }); }
    // nadadores
    E.racers.forEach((r, k) => { r.lane = E.online ? [2, 3, 1, 4, 0, 5][k] : r.me ? 2 : [0, 1, 3, 4, 5][k - 1]; r.obj = makeRunner(r.ch, k, .6); r.obj.userData.shadow.visible = false; r.obj.rotation.y = Math.PI; sc.add(r.obj); r.z = 0; r.v = 0; r.act = null; r.ak = 0; r.actT = 9; r.stun = 0; r.boost = 0; r.roll = 0; r.perf = 0; r.streak = 0; r.bonus = 0; });
    { const L0 = document.getElementById('bL'), R0 = document.getElementById('bR'); document.getElementById('bM').style.display = 'none'; const st = 'width:120px;height:120px;font-size:20px;line-height:1.1;background:rgba(155,130,240,.6)'; L0.innerHTML = '🫧<br><small style="font-size:15px">Bucear</small>'; R0.innerHTML = '⬆<br><small style="font-size:15px">Saltar</small>'; L0.style.cssText = st; R0.style.cssText = st.replace('155,130,240', '255,134,189'); }
    let pd = document.getElementById('perf'); if (!pd) { pd = document.createElement('div'); pd.id = 'perf'; pd.style.cssText = 'position:absolute;right:10px;top:calc(88px + env(safe-area-inset-top));background:rgba(110,60,150,.55);color:#fff;font:700 14px Fredoka;border-radius:12px;padding:4px 10px;text-align:right;line-height:1.25'; document.getElementById('hud').appendChild(pd); } this.pd = pd;
    this.camZ = 7; camera.far = 900; camera.updateProjectionMatrix();
  },
  jUp(j) { return j.up; },
  // reglas iguales para todos: nadas solo hacia delante a la misma velocidad base.
  // Ante cada medusa: si está ARRIBA, bucea; si está ABAJO, sáltala. Acción a tiempo = ¡Perfecto! (turbo + velocidad acumulada)
  act(E, r, type, j) { if (r.act || r.stun > 0) return; r.act = type; r.ak = 0; r.actT = j ? (j.z - r.z) / Math.max(1, r.v) : 9; if (r.me) Audio.sfxPlay(type === 'd' ? 'pop' : 'jump'); E.burst(new THREE.Vector3(laneX(r.lane), .2, -r.z), '#ffffff', type === 'd' ? 10 : 6, 3, .5, .35, -3); },
  update(E, dt) {
    for (const r of E.racers) {
      if (r.remote) continue;
      if (r.fin) { r.v *= Math.pow(.3, dt); r.z = Math.min(L - .8, r.z + r.v * dt); continue; }
      if (r.stun > 0 && (r.stun -= dt) <= 0) r.expr = '';
      if (r.boost > 0 && (r.boost -= dt) <= 0) r.expr = '';
      if (r.act && (r.ak += dt) > ACT) r.act = null;
      const vmax = V0 + r.bonus + (r.boost > 0 ? 1.2 : 0);
      if (r.stun <= 0) r.v = r.v < vmax ? Math.min(vmax, r.v + 5 * dt) : Math.max(vmax, r.v - 3 * dt);
      const next = this.J.find(j => j.lane === r.lane && j.z > r.z), tt = next ? (next.z - r.z) / Math.max(1, r.v) : 9;
      if (r.me && !E.AUTO) {
        if (E.swipe || E.side.includes('L')) this.act(E, r, 'd', next);
        else if (E.swipeUp || E.side.includes('R') || E.ups.length) this.act(E, r, 'j', next);
      } else if (next && r.stun <= 0) {
        if (!r.plan || r.plan.j !== next) { const u = Math.random(), pP = r.me ? 1 : .2 + .6 * r.skill, pF = r.me ? 0 : .03 + .15 * (1 - r.skill), good = next.up ? 'd' : 'j';
          r.plan = u < pP ? { j: next, f: r.me ? .22 : rnd(.15, .3), a: good } : u < pP + pF ? { j: next, f: .22, a: good === 'd' ? 'j' : 'd' } : { j: next, f: rnd(.4, .6), a: good }; }
        if (tt < r.plan.f && !r.plan.done) { r.plan.done = true; this.act(E, r, r.plan.a, next); }
      }
      const oz = r.z; r.z += r.v * dt;
      for (const j of this.J) if (j.lane === r.lane && oz < j.z && r.z >= j.z) {
        const ok = r.act === (j.up ? 'd' : 'j');
        if (!ok) { r.v *= .3; r.stun = .5; r.expr = 'squash'; r.bonus *= .5; r.streak = 0; r.act = null; E.burst(new THREE.Vector3(laneX(r.lane), .6, -j.z), '#c9b2ff', 14, 4, .6, .5); if (r.me) { Audio.sfxPlay('hit'); E.shake = .3; E.ui.toast(j.up ? '¡Bzzz! ¡Tenías que bucear! 🫧' : '¡Bzzz! ¡Tenías que saltar! ⬆', '#c9b2ff'); } else E.say(r, pick(['¡Me ha picado!', '¡Cosquillas eléctricas!', ...OUCH])); }
        else if (r.actT > .12 && r.actT < .34) { r.perf++; r.streak++; r.boost = .8; r.bonus = Math.min(BMAX, r.bonus + BSTEP); r.expr = 'happy'; if (r.me) { Audio.sfxPlay('trick'); E.ui.toast(r.streak > 1 ? `¡Perfecto! ⚡ x${r.streak}` : '¡Perfecto! ⚡', '#ffe27a'); } }
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
    for (const j of this.J) { j.g.visible = j.z > me.z - 8 && j.z < me.z + 60; if (!j.g.visible) continue; const up = j.up, ty = up ? .35 : -.8; j.g.position.set(laneX(j.lane), lerp(j.g.position.y || ty, ty, Math.min(1, dt * 6)) + Math.sin(t * 3 + j.ph) * .05, -j.z); j.g.scale.set(1 + Math.sin(t * 5 + j.ph) * .08, 1 - Math.sin(t * 5 + j.ph) * .08, 1); j.tn.forEach((tt, k) => { tt.rotation.x = Math.sin(t * 6 + k + j.ph) * .4; tt.rotation.z = Math.cos(t * 5 + k) * .3; }); }
    for (const r of E.racers) { const o = r.obj; r.roll = lerp(r.roll, 0, Math.min(1, dt * 5)); const k = r.act ? clamp(r.ak / ACT, 0, 1) : 0, y = r.act === 'd' ? -.28 - Math.sin(k * Math.PI) * 1.1 : r.act === 'j' ? -.28 + Math.sin(k * Math.PI) * 1.6 : -.28 + Math.sin(t * 6 + r.k) * .05; r.roll = Math.sin(t * 7 + r.k) * .3;
      o.position.set(laneX(r.lane), lerp(o.position.y, y, Math.min(1, dt * 14)), -r.z); o.userData.pivot.rotation.set(r.act === 'j' ? -.55 - k * 6.283 : -.55, 0, r.roll * .35 + (r.stun > 0 ? Math.sin(t * 30) * .3 : 0));
      if (r.act === 'd' && Math.random() < .5) E.burst(new THREE.Vector3(laneX(r.lane) + rnd(-.3, .3), .1, -r.z), '#ffffff', 1, 1.5, .35, .25, -3); }
    this.pd.innerHTML = `⚡ Perfectos: ${me.perf}<br>🔥 Racha: x${me.streak}<br>🚀 +${Math.round(me.bonus / V0 * 100)}% vel.`;
    this.camZ = lerp(this.camZ, -me.z + 8.5, Math.min(1, dt * 8));
    camera.position.set(laneX(me.lane) * .4, 4.6, this.camZ); camera.lookAt(laneX(me.lane) * .3, -.3, -me.z - 5); this.sky.position.copy(camera.position);
  }
};
