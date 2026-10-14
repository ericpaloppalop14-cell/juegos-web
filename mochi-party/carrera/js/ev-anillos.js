// 💫 VUELO DE ANILLOS (3D): los 6 mochis vuelan hacia delante por un cielo de golosinas atravesando anillos.
//  Cada anillo atravesado da velocidad (y el dorado, más); la ruta se va complicando: anillos más pequeños y más separados.
//  Reglas justas: misma velocidad base para todos; la ventaja se gana atravesando anillos.
import { THREE, camera, toon, outline, mesh, glowSprite, makeRunner, skyDome, lights, rnd, clamp, lerp, pick, Audio, OUCH } from './core3d.js';
const L = 420, V0 = 13, XM = 6, YMIN = 1.2, YMAX = 8.5, BSTEP = .55, BMAX = 6;
const RCOL = ['#ff9cc8', '#ffc38a', '#ffe27a', '#8fe8cf', '#9fd0ff', '#c9b2ff'];
export default {
  id: 'anillos', name: 'Vuelo de Anillos', icon: '💫', maxT: 70, music: { bpm: 132, root: 62, scale: 'major' }, netKeys: ['x', 'y', 'z', 'v', 'boost', 'perf', 'streak', 'bonus'], seed: 41, tagY: 1.6, tagS: .55,
  how: 'Arrastra el dedo para volar (arriba, abajo y a los lados). Atraviesa los anillos: cada uno te acelera; el dorado ⭐ vale más. ¡Encadénalos!',
  dispose() { const d = document.getElementById('perf'); if (d) d.remove(); },
  init(E) {
    const sc = E.scene; sc.fog = new THREE.Fog('#ffe3f1', 50, 150); this.sky = skyDome(sc, '#9fd0ff', '#ffd6ea', '#fff0dd'); this.sky.renderOrder = -1; lights(sc, '#ffffff', '#ffd6ea', 1.05, 1.8);
    // suelo lejano de gelatina y colinas de golosina para dar sensación de avance
    mesh(new THREE.PlaneGeometry(220, L + 200), toon('#ffc4e0', { rim: 0 }), sc, [0, -6, -L / 2], [-Math.PI / 2, 0, 0]);
    for (let z = 0; z > -L - 80; z -= 16) for (const s of [-1, 1]) { const c = pick(['#8fe8cf', '#ffd98a', '#c9b2ff', '#ff9cc8']); const h = mesh(new THREE.SphereGeometry(rnd(5, 9), 18, 12), toon(c, { rim: .4 }), sc, [s * rnd(20, 34), -6, z + rnd(-6, 6)], null, [1, rnd(.6, 1.1), 1]); if (Math.random() < .5) { const lp = new THREE.Group(); lp.position.set(s * rnd(13, 18), -6, z); sc.add(lp); mesh(new THREE.CylinderGeometry(.2, .2, 9, 8), toon('#ffffff'), lp, [0, 4.5, 0]); const pop = mesh(new THREE.CylinderGeometry(2, 2, .5, 24), toon(pick(['#ff7fbf', '#7ee3c4', '#ffd36b'])), lp, [0, 9.5, 0], [Math.PI / 2, 0, 0]); outline(pop, '#5a3a6e', 1.04); } }
    this.clouds = []; for (let i = 0; i < 26; i++) { const c = new THREE.Group(); c.position.set(rnd(-40, 40), rnd(-2, 20), rnd(-L - 60, 10)); if (Math.abs(c.position.x) < 10 && c.position.y > 0 && c.position.y < 10) c.position.x += c.position.x < 0 ? -12 : 12; for (let k = 0; k < 4; k++) mesh(new THREE.SphereGeometry(rnd(1.6, 2.8), 12, 10), toon('#ffffff', { rim: .7 }), c, [k * 1.8 - 2.7, rnd(-.5, .8), rnd(-.6, .6)]); sc.add(c); this.clouds.push(c); }
    // arcoíris de salida y arco de meta
    RCOL.forEach((c, k) => mesh(new THREE.TorusGeometry(14 - k * .7, .35, 8, 48, Math.PI), toon(c, { emissive: c, ei: .3 }), sc, [0, -6, -L], null));
    { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#ff6fae'; x.beginPath(); x.roundRect(4, 4, 504, 120, 40); x.fill(); x.font = '700 80px Fredoka'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText('¡META!', 256, 68); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: tx, transparent: true }), sc, [0, 9.5, -L]); }
    // anillos: un camino suave (curva) que se va complicando; la misma ruta para todos
    this.R = []; let z = -22, cx = 0, cy = 4, k = 0;
    while (z > -L + 12) { const d = clamp(-z / L, 0, 1); const amp = lerp(1.6, 4.2, d);
      cx = clamp(cx + rnd(-amp, amp), -XM + 1, XM - 1); cy = clamp(cy + rnd(-amp * .7, amp * .7), YMIN + 1, YMAX - 1);
      const gold = k % 7 === 6, rr = gold ? lerp(1.15, .9, d) : lerp(1.9, 1.3, d), col = gold ? '#ffd23a' : RCOL[k % RCOL.length];
      const g = new THREE.Group(); g.position.set(cx, cy, z); sc.add(g);
      const ring = mesh(new THREE.TorusGeometry(rr, gold ? .16 : .2, 10, 36), toon(col, { emissive: col, ei: .45 }), g); outline(ring, '#ffffff', 1.06);
      g.add(glowSprite(col, rr * 3.2, gold ? .6 : .35)); if (gold) { const st = mesh(new THREE.OctahedronGeometry(.25, 0), toon('#fff6c0', { emissive: '#ffe27a', ei: .9 }), g); g.userData.st = st; }
      this.R.push({ x: cx, y: cy, z: -z, rr, gold, g, got: new Set() }); z -= lerp(13, 9, d) + rnd(-1, 1.5); k++; }
    // corredores
    const off = [[0, 0], [-1.6, .9], [1.6, .9], [-2.8, -.6], [2.8, -.6], [0, 1.8]];
    E.racers.forEach((r, i) => { r.obj = makeRunner(r.ch, i, .55); r.obj.userData.shadow.visible = false; sc.add(r.obj); const o = off[i] || [0, 0]; r.x = o[0]; r.y = 4 + o[1]; r.z = 0; r.tx = r.x; r.ty = r.y; r.vx = 0; r.vy = 0; r.v = 0; r.boost = 0; r.perf = 0; r.streak = 0; r.bonus = 0; r.next = 0; r.obj.rotation.y = Math.PI; });
    let pd = document.getElementById('perf'); if (!pd) { pd = document.createElement('div'); pd.id = 'perf'; pd.style.cssText = 'position:absolute;right:10px;top:calc(88px + env(safe-area-inset-top));background:rgba(110,60,150,.55);color:#fff;font:700 14px Fredoka;border-radius:12px;padding:4px 10px;text-align:right;line-height:1.25'; document.getElementById('hud').appendChild(pd); } this.pd = pd;
    this.camZ = 7; camera.far = 600; camera.updateProjectionMatrix();
  },
  idle(E, dt) { this.render(E, dt); },
  update(E, dt) {
    for (const r of E.racers) {
      if (r.remote) continue;
      if (r.fin) { r.v = Math.max(4, r.v - 6 * dt); r.z += r.v * dt; continue; }
      const vmax = V0 + r.bonus + (r.boost > 0 ? 3.5 : 0); r.v = r.v < vmax ? Math.min(vmax, r.v + 8 * dt) : Math.max(vmax, r.v - 3 * dt); if (r.boost > 0) r.boost -= dt;
      r.bonus = Math.max(0, r.bonus - .12 * dt); // si dejas de coger anillos, poco a poco vuelves a la base
      while (r.next < this.R.length && this.R[r.next].z < r.z - .5) r.next++;
      const nr = this.R[r.next];
      if (r.me && !E.AUTO) { if (E.input.down && E.input.px != null) { r.tx = clamp((E.input.px / innerWidth - .5) * 2.3 * XM, -XM, XM); r.ty = clamp(lerp(YMAX, YMIN, (E.input.py ?? innerHeight / 2) / innerHeight * 1.15 - .05), YMIN, YMAX); } }
      else if (nr) { if (!r.plan || r.plan.k !== r.next) { const ok = r.me || Math.random() < .55 + .4 * r.skill, e = ok ? nr.rr * rnd(0, .45) : nr.rr * rnd(1.1, 2), a = rnd(0, 6.283); r.plan = { k: r.next, x: nr.x + Math.cos(a) * e, y: nr.y + Math.sin(a) * e }; } r.tx = r.plan.x; r.ty = r.plan.y; }
      // movimiento suave tipo muelle (igual para todos)
      r.vx += ((r.tx - r.x) * 34 - r.vx * 10) * dt; r.vy += ((r.ty - r.y) * 34 - r.vy * 10) * dt; r.x = clamp(r.x + r.vx * dt, -XM - .5, XM + .5); r.y = clamp(r.y + r.vy * dt, YMIN - .3, YMAX + .3);
      const oz = r.z; r.z += r.v * dt;
      for (let i = Math.max(0, r.next - 1); i < Math.min(this.R.length, r.next + 2); i++) { const g = this.R[i]; if (oz < g.z && r.z >= g.z && !g.got.has(r.id)) { g.got.add(r.id); const d = Math.hypot(r.x - g.x, r.y - g.y);
        if (d < g.rr - .25) { r.perf++; r.streak++; r.boost = g.gold ? 1.4 : .8; r.bonus = Math.min(BMAX, r.bonus + BSTEP * (g.gold ? 2.2 : 1) * (1 + Math.min(4, r.streak - 1) * .12)); r.expr = 'happy';
          if (r.me) { Audio.sfxPlay(g.gold ? 'fanfare' : 'got'); E.ui.toast(g.gold ? '⭐ ¡Anillo dorado!' : r.streak >= 5 ? `¡Imparable! 🔥 x${r.streak}` : r.streak >= 3 ? `¡Racha! x${r.streak}` : '¡Anillo! 💫', g.gold ? '#ffe27a' : '#ffffff'); E.burst(new THREE.Vector3(g.x, g.y, -g.z), g.gold ? '#ffe27a' : '#ff9cc8', 22, 6, .6, .6, 0); if (g.gold) E.ui.flash && E.ui.flash(); } }
        else { r.streak = 0; if (r.me && d < g.rr + 1.2) E.ui.toast(pick(['¡Uy, por fuera!', '¡Casi!', '¡Rozando el anillo!']), '#ffd0e8'); else if (!r.me && Math.random() < .2) E.say(r, pick(['¡Se me ha escapado!', '¡Ese anillo se movió!', ...OUCH])); } } }
      r.prog = clamp(r.z / L, 0, 1); if (r.z >= L) E.finish(r);
    }
  },
  render(E, dt) {
    const t = performance.now() / 1000, me = E.me;
    for (const g of this.R) { const v = !g.got.has('me') || g.got.has('me') && Math.abs(g.z - me.z) < 3; g.g.visible = g.z > me.z - 4 && g.z < me.z + 120; g.g.rotation.z = Math.sin(t * 1.5 + g.z) * .2; g.g.scale.setScalar(g.got.has('me') ? Math.max(.01, 1 - (me.z - g.z) * .15) : 1 + Math.sin(t * 4 + g.z) * .04); if (g.g.userData.st) g.g.userData.st.rotation.y = t * 3; }
    for (const r of E.racers) { const o = r.obj; o.position.set(r.x, r.y + Math.sin(t * 3 + r.k) * .12, -r.z); o.rotation.z = clamp(-r.vx * .08, -.5, .5); o.userData.pivot.rotation.x = clamp(-.25 - r.vy * .05, -.7, .3);
      const s = .55 * (1 + Math.sin(t * 9 + r.k) * .04); o.userData.pivot.scale.set(s, s, s * (r.boost > 0 ? 1.2 : 1));
      if (E.phase === 'run' && !r.fin && Math.random() < (r.boost > 0 ? .8 : .2)) E.burst(new THREE.Vector3(r.x + rnd(-.2, .2), r.y + .3, -r.z + .6), r.boost > 0 ? '#ffe27a' : '#ffffff', 1, 1.2, .4, .3, 0); }
    this.pd.innerHTML = `💫 Anillos: ${me.perf}<br>🔥 Racha: x${me.streak}<br>🚀 +${Math.round(me.bonus / V0 * 100)}% vel.`;
    this.camZ = lerp(this.camZ, -me.z + 7.5, Math.min(1, dt * 8));
    camera.fov = lerp(camera.fov, 68 + clamp(me.v - V0, 0, 6) * 1.4 + (me.boost > 0 ? 5 : 0), Math.min(1, dt * 4)); camera.updateProjectionMatrix();
    camera.position.set(me.x * .55, me.y + 2.2, this.camZ); camera.lookAt(me.x * .7, me.y + .3, -me.z - 10); this.sky.position.copy(camera.position);
  }
};
