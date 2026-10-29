// 🪐 SALTOS PLANETARIOS (3D): planetas kawaii que giran, órbitas con lunas y fondo espacial
import { THREE, camera, toon, outline, mesh, glowSprite, glowTex, starShape, makeRunner, lights, rnd, clamp, lerp, pick, Audio, OUCH } from './core3d.js?v=o40';
const PAL = [['#ffb3d9', '#ff7fbf'], ['#a6f0d2', '#4fcfa4'], ['#c8b6ff', '#8f72e6'], ['#ffd59e', '#ffa64d'], ['#9fdcff', '#4fa8e8'], ['#fff09a', '#f2c73a'], ['#ffc2a8', '#ff8a6a']];
const N = 12, JV = 34;
export default {
  celeb: { keepRot: true, dir: [0, 0, 1] },
  id: 'planetas', name: 'Saltos Planetarios', icon: '🪐', maxT: 75, music: { bpm: 118, root: 62, scale: 'dorian' }, netKeys: ['idx', 'ang', 'fly', 'stun', 'hop'], seed: 11, tagY: 2.3,
  how: 'Toca para saltar hacia donde mira la flecha. ¡Los planetas giran!',
  init(E) {
    const sc = E.scene; sc.background = new THREE.Color('#1b0f3d'); sc.fog = new THREE.Fog('#2a1650', 70, 220);
    lights(sc, '#e8d8ff', '#6a3a9a', 1.25, 1.6);
    // estrellas
    const sg = new THREE.BufferGeometry(), sp = [], scol = []; for (let i = 0; i < 2500; i++) { const r = rnd(120, 400), a = rnd(0, 6.28), b = rnd(-1.2, 1.4); sp.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r + 80, -Math.abs(Math.sin(a) * Math.cos(b) * r) - 40); const c = new THREE.Color(pick(['#ffffff', '#ffe7a8', '#c8d8ff', '#ffc8ec'])); scol.push(c.r, c.g, c.b); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(scol, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.6, vertexColors: true, fog: false, transparent: true, opacity: .95, map: glowTex('#ffffff'), depthWrite: false, blending: THREE.AdditiveBlending })); sc.add(this.stars);
    // nebulosas
    for (let i = 0; i < 9; i++) { const n = glowSprite(pick(['#ff6fc8', '#6fd8ff', '#b06fff', '#ffcf6f', '#6fffc8']), rnd(90, 170), .32); n.position.set(rnd(-120, 120), rnd(-20, 240), rnd(-260, -160)); sc.add(n); }
    // planeta gigante de fondo con anillos y luna
    const big = new THREE.Group(); big.position.set(-70, 120, -190); sc.add(big); const nf = m => { m.material = m.material.clone(); m.material.fog = false; return m; };
    nf(mesh(new THREE.SphereGeometry(38, 40, 28), toon('#ff9ec7', { rim: .6 }), big));
    nf(mesh(new THREE.TorusGeometry(60, 2.2, 8, 80), toon('#ffe7a8', { emissive: '#ffd36b', ei: .3, rim: 0 }), big, null, [1.3, .2, 0])).scale.z = .25;
    nf(mesh(new THREE.TorusGeometry(68, 1.2, 8, 80), toon('#c9b2ff', { emissive: '#a080ff', ei: .3, rim: 0 }), big, null, [1.3, .2, 0])).scale.z = .25;
    this.bigMoon = nf(mesh(new THREE.SphereGeometry(7, 20, 14), toon('#d8fbef'), sc, [0, 0, 0])); this.big = big;
    // estrellas fugaces
    this.shoot = []; for (let i = 0; i < 3; i++) { const s = glowSprite('#ffffff', 4); s.scale.set(14, 1.2, 1); sc.add(s); this.shoot.push({ s, t: rnd(0, 6) }); }
    // planetas del recorrido
    const P = []; let y = 0;
    for (let i = 0; i < N; i++) {
      const last = i === N - 1, r = last ? 5.5 : rnd(2.6, 3.6), x = i === 0 || last ? 0 : (i % 2 ? 1 : -1) * rnd(4.5, 7.5);
      if (i) y += rnd(13, 15.5);
      const g = new THREE.Group(); g.position.set(x, y, 0); sc.add(g); const spin = new THREE.Group(); g.add(spin);
      const pal = PAL[i % PAL.length];
      if (last) { // Estrella Meta
        const st = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(r * 1.25, r * .62), { depth: 2.4, bevelEnabled: true, bevelThickness: .6, bevelSize: .5, bevelSegments: 3 }), toon('#ffe066', { emissive: '#ffcc33', ei: .45, rim: .7 })); st.geometry.center(); spin.add(st); outline(st, '#c08a20', 1.04);
        const hit = mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false }), spin); 
        g.add(glowSprite('#ffe27a', r * 6, .55)); const pl = new THREE.PointLight('#ffe27a', 60, 40); g.add(pl);
      } else {
        const body = mesh(new THREE.SphereGeometry(r, 36, 26), toon(pal[0], { rim: .55 }), spin); outline(body, '#5a3a6e', 1.035);
        // cráteres y manchas
        for (let k = 0; k < 7; k++) { const a = rnd(0, 6.28), b = rnd(-1.2, 1.2), d = new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)); const c = mesh(new THREE.SphereGeometry(1, 14, 10), toon(pal[1], { rim: 0 }), spin); c.position.copy(d.multiplyScalar(r * .93)); c.scale.setScalar(r * rnd(.13, .26)); c.lookAt(0, 0, 0); c.scale.z *= .35; }
        // carita mirando a cámara (en la capa que gira para que "ruede")
        const face = new THREE.Group(); spin.add(face);
        for (const s of [-1, 1]) { mesh(new THREE.SphereGeometry(1, 12, 8), toon('#3a2050', { rim: 0 }), face, [s * r * .32, r * .12, r * .95], null, [r * .09, r * .12, r * .05]); mesh(new THREE.SphereGeometry(1, 10, 8), toon('#ff7fae', { opacity: .7, rim: 0 }), face, [s * r * .55, -r * .1, r * .84], null, [r * .13, r * .07, r * .04]); }
        mesh(new THREE.TorusGeometry(r * .13, r * .03, 6, 12, Math.PI), toon('#3a2050', { rim: 0 }), face, [0, -r * .05, r * .98], [0, 0, Math.PI]);
        if (Math.random() < .5 || i % 3 === 1) { const ring = mesh(new THREE.TorusGeometry(r * 1.55, r * .07, 8, 64), toon('#fff0b8', { emissive: '#ffd36b', ei: .25, rim: 0 }), g, null, [1.25, rnd(-.3, .3), 0]); ring.scale.z = .4; }
        g.add(glowSprite(pal[0], r * 4.4, .45));
      }
      // órbita con luna (anillo punteado) — no estorba al salto: está inclinada hacia el fondo
      const orb = new THREE.Group(); orb.rotation.x = 1.2; g.add(orb);
      const ol = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, k) => new THREE.Vector3(Math.cos(k / 64 * 6.28) * r * 2.2, Math.sin(k / 64 * 6.28) * r * 2.2, 0))), new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: .5, gapSize: .5, transparent: true, opacity: .45 })); ol.computeLineDistances(); orb.add(ol);
      const moon = mesh(new THREE.SphereGeometry(r * .22, 14, 10), toon(pick(['#ffffff', '#ffe7a8', '#d8fbef'])), orb, [r * 2.2, 0, 0]);
      P.push({ g, spin, x, y, r, rot: rnd(0, 6.28), w: (i % 2 ? 1 : -1) * rnd(1.5, 1.9) * (1 + i * .04), orb, oW: rnd(.5, 1), last, pal });
    }
    // camino de polvo de estrellas entre planetas
    const pts = []; for (let i = 0; i < N - 1; i++) for (let k = 0; k < 10; k++) { const a = P[i], b = P[i + 1], t = k / 10; pts.push(new THREE.Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), -2)); }
    const dust = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: '#ffe7ff', size: .7, transparent: true, opacity: .7, map: glowTex('#ffffff'), depthWrite: false, blending: THREE.AdditiveBlending })); sc.add(dust);
    this.P = P;
    // corredores: el jugador delante (z=0), rivales repartidos por la superficie, un poco hacia atrás
    E.racers.forEach((r, k) => { r.obj = makeRunner(r.ch, k, .62); r.obj.userData.shadow.visible = false; sc.add(r.obj); r.idx = 0; r.ang = Math.PI / 2 + (k - 2.5) * .35; r.zo = E.online ? [0, .9, -.5, 1.5, .3, -.9][k] : r.me ? 0 : [.9, -.5, 1.5, .3, -.9][k - 1]; r.fly = null; r.stun = 0; r.timer = rnd(.8, 1.6); r.hop = null; });
    // flecha de puntería
    const arrow = new THREE.Group(); sc.add(arrow); this.arrow = arrow;
    for (let k = 0; k < 6; k++) mesh(new THREE.SphereGeometry(.14, 8, 6), toon('#ffffff', { emissive: '#ffffff', ei: .6, rim: 0 }), arrow, [0, 1.3 + k * .75, 0]);
    const tip = mesh(new THREE.ConeGeometry(.42, .9, 4), toon('#ffe27a', { emissive: '#ffd36b', ei: .6 }), arrow, [0, 6.2, 0]);
    this.trail = [];
    this.camX = 0; this.camY = 0; this.E = E;
    camera.position.set(0, -2, 26); camera.lookAt(0, 4, 0);
  },
  surf(p, ang, z = 0) { const a = p.rot + ang, rr = Math.sqrt(Math.max(.1, p.r * p.r - z * z)) * .98; return { x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr, a }; },
  idle(E, dt) { this.spinAll(dt * .3); },
  spinAll(dt) { for (const p of this.P) { p.rot += p.w * dt; p.orb.rotation.z += p.oW * dt; } },
  update(E, dt) {
    this.spinAll(dt);
    for (const r of E.racers) {
      if (r.remote) continue;
      if (r.fin) continue; const P = this.P;
      if (r.me) {
        if (r.stun > 0) { r.stun -= dt; if (r.stun <= 0) r.expr = ''; }
        else if (r.fly) {
          const f = r.fly; f.x += f.vx * dt; f.y += f.vy * dt; f.t += dt;
          if (Math.random() < .7) E.burst(new THREE.Vector3(f.x, f.y, 0), pick(['#ffe27a', '#ff9cc8', '#8fd0ff']), 1, 1, .5, .6, 0);
          for (let j = r.idx + 1; j < Math.min(N, r.idx + 3); j++) { const p = P[j], dx = f.x - p.x, dy = f.y - p.y; if (Math.hypot(dx, dy) < p.r + .9) {
            r.idx = j; r.ang = Math.atan2(dy, dx) - p.rot; r.fly = null; r.land = .25; Audio.sfxPlay('land'); E.burst(new THREE.Vector3(f.x, f.y, .5), p.pal[0], 16, 7, .7, .7);
            if (j - 1 > f.from) { E.ui.toast('¡Doble salto! ✨', '#ffe27a'); Audio.sfxPlay('trick'); } else if (Math.random() < .3) E.ui.toast(pick(['¡Aterrizaje de gelatina!', '¡Toma ya!', '¡Boing!']));
            if (p.last) E.finish(r); break; } }
          if (r.fly && f.t > 1.0) { r.fly = null; r.stun = .55; r.expr = 'squash'; E.ui.toast('¡Uy! Al espacio…', '#c9b2ff'); Audio.sfxPlay('boing'); r.ang = Math.PI / 2 - P[r.idx].rot; E.shake = .25; }
        } else {
          let tap = E.taps.length > 0; const q = P[r.idx + 1];
          if (E.AUTO && q) { const s = this.surf(P[r.idx], r.ang); const want = Math.atan2(q.y - s.y, q.x - s.x); const d = ((s.a - want) % 6.283 + 9.425) % 6.283 - 3.1416; const tol = Math.asin(Math.min(1, (q.r + .3) / Math.hypot(q.x - s.x, q.y - s.y))) * .8; tap = Math.abs(d) < tol; }
          if (tap) { const s = this.surf(P[r.idx], r.ang); r.fly = { x: s.x, y: s.y, vx: Math.cos(s.a) * JV, vy: Math.sin(s.a) * JV, t: 0, from: r.idx }; Audio.sfxPlay('jump'); E.burst(new THREE.Vector3(s.x, s.y, .3), '#ffffff', 8, 4, .4, .5); }
        }
      } else {
        r.timer -= dt; if (r.hop) { r.hop.t += dt * 2.2; if (r.hop.t >= 1) { r.hop = null; E.burst(new THREE.Vector3(...this.surfXYZ(r)), P[r.idx].pal[0], 8, 4, .5, .5); } }
        if (r.timer <= 0 && !r.hop) { r.timer = rnd(1.7, 2.9) * (1.25 - r.skill * .35);
          if (Math.random() < .58 + r.skill * .35) { r.hop = { from: r.idx, fang: r.ang, t: 0 }; r.idx++; r.ang = Math.PI / 2 - P[r.idx].rot + rnd(-.9, .9); if (P[r.idx].last) E.finish(r); }
          else if (Math.random() < .35) E.say(r, pick(['¡Me he pasado de largo!', '¡Planeta traicionero!', ...OUCH])); }
      }
      r.prog = r.idx / (N - 1);
    }
  },
  surfXYZ(r) { const p = this.P[r.idx], s = this.surf(p, r.ang, r.zo); return [s.x, s.y, r.zo]; },
  render(E, dt) {
    const P = this.P, t = performance.now() / 1000;
    for (const p of P) p.spin.rotation.z = p.rot;
    for (const r of E.racers) {
      const o = r.obj; let x, y, a;
      if (r.fly) { x = r.fly.x; y = r.fly.y; a = Math.atan2(r.fly.vy, r.fly.vx); o.userData.pivot.scale.set(.56, .7, .56); }
      else if (r.hop) { const q = P[r.hop.from], p = P[r.idx], s0 = this.surf(q, r.hop.fang, r.zo), s1 = this.surf(p, r.ang, r.zo), k = r.hop.t; x = lerp(s0.x, s1.x, k); y = lerp(s0.y, s1.y, k) + Math.sin(k * Math.PI) * 3; a = Math.atan2(s1.y - s0.y, s1.x - s0.x); }
      else { const s = this.surf(P[r.idx], r.ang, r.zo); x = s.x; y = s.y; a = s.a; const sq = r.land > 0 ? (r.land -= dt) * 1.2 : 0; o.userData.pivot.scale.set(.62 * (1 + sq), .62 * (1 - sq * .8), .62 * (1 + sq)); }
      o.position.set(x, y, r.fly ? 0 : r.zo); o.rotation.set(0, 0, a - Math.PI / 2);
      r.tag.position.set(0, 2.4, 0);
    }
    // flecha
    const me = E.me; this.arrow.visible = !me.fly && !me.fin && E.phase === 'run' && me.stun <= 0;
    if (this.arrow.visible) { this.arrow.position.copy(me.obj.position); this.arrow.rotation.z = me.obj.rotation.z; this.arrow.children.forEach((c, k) => c.scale.setScalar(1 + .25 * Math.sin(t * 8 - k))); }
    // cámara: sigue al jugador y mira hacia el siguiente planeta
    const nx = P[Math.min(N - 1, me.idx + 1)];
    const tx = lerp(me.obj.position.x, nx.x, .35) * .55, ty = lerp(me.obj.position.y, nx.y, .45);
    this.camX = lerp(this.camX, tx, Math.min(1, dt * 2.5)); this.camY = lerp(this.camY, ty, Math.min(1, dt * 2.5));
    camera.position.set(this.camX + Math.sin(t * .3) * 1.2, this.camY - 5.5, 20); camera.lookAt(this.camX, this.camY + 1, 0);
    this.stars.position.y = this.camY * .85; this.big.position.y = 120 + this.camY * .7; this.big.rotation.y = t * .05;
    this.bigMoon.position.set(this.big.position.x + Math.cos(t * .2) * 75, this.big.position.y + Math.sin(t * .2) * 18, this.big.position.z + Math.sin(t * .2) * 30);
    for (const s of this.shoot) { s.t -= dt; if (s.t < 0) { s.t = rnd(3, 7); s.x0 = rnd(-60, 60); s.y0 = this.camY + rnd(20, 60); } const k = 1 - s.t / 1.2; s.s.visible = k > 0 && k < 1; if (s.s.visible) s.s.position.set(s.x0 + k * 60, s.y0 - k * 25, -80); }
  }
};
