// Cosas locas y surrealistas por circuito (decorativas, no chocan)
import * as THREE from 'three';
import { toon, mesh, outline, makeVehicle } from './gfx.js';
const V3 = THREE.Vector3;
const nofog = m => { m.fog = false; return m; };

function face(parent, z, s = 1, opts = {}) {
  const eyes = [];
  for (const sd of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(1, 12, 10), toon('#2a1838', { rim: 0, nocache: opts.nofog }), parent, [sd * 0.38 * s, 0.15 * s, z], null, [0.12 * s, 0.17 * s, 0.06 * s]); if (opts.nofog) nofog(e.material); eyes.push(e);
    mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: !opts.nofog }), e, [0.3, 0.35, 0.8], null, 0.35);
    const ck = mesh(new THREE.SphereGeometry(1, 8, 6), toon('#ff7fae', { opacity: 0.8, rim: 0, nocache: opts.nofog }), parent, [sd * 0.6 * s, -0.08 * s, z - 0.02 * s], null, [0.14 * s, 0.07 * s, 0.03 * s]); if (opts.nofog) nofog(ck.material); }
  const mo = mesh(new THREE.TorusGeometry(0.14 * s, 0.035 * s, 6, 12, Math.PI), toon('#2a1838', { rim: 0, nocache: opts.nofog }), parent, [0, -0.12 * s, z + 0.01], [0, 0, Math.PI]); if (opts.nofog) nofog(mo.material);
  return eyes;
}
function whale(color = '#b9a2f7') {
  const g = new THREE.Group(), m = toon(color, { opacity: 0.85, rim: 0.7 });
  const body = mesh(new THREE.SphereGeometry(1, 20, 14), m, g, [0, 0, 0], null, [6, 4.2, 10]); outline(body, '#6a4b9a', 1.03);
  mesh(new THREE.SphereGeometry(1, 16, 10), toon('#ffffff', { opacity: 0.7, rim: 0 }), g, [0, -1.6, 1], null, [4.6, 2.6, 8]);
  const tail = new THREE.Group(); tail.position.z = -9.5; g.add(tail);
  for (const sd of [-1, 1]) { mesh(new THREE.SphereGeometry(1, 12, 8), m, tail, [sd * 2.4, 0.5, -1.8], [0, sd * 0.5, 0], [3, 0.5, 1.6]); const fin = mesh(new THREE.SphereGeometry(1, 12, 8), m, g, [sd * 5.6, -1.5, 2], [0, 0, sd * 0.6], [2.6, 0.4, 1.4]); (g.userData.fins ||= []).push([fin, sd]); }
  g.userData.eyes = face(g, 9.6, 6); g.userData.tail = tail;
  for (let i = 0; i < 8; i++) mesh(new THREE.SphereGeometry(0.4, 6, 5), toon('#fff6a0', { emissive: '#ffe066', ei: 0.8 }), g, [Math.sin(i * 2) * 3, Math.cos(i * 3) * 2, Math.sin(i * 1.3) * 6], null, 1);
  return g;
}
const teacup = () => makeVehicle({ color: ['#ff9cc8', '#7ee3c4', '#b9a2f7', '#ffd36b'][Math.floor(Math.random() * 4)], vehicle: 'teacup' });

export function addSurreal(T, Q, scene) {
  const th = T.cup.theme, items = [], spots = [], S = T.S, N = T.N;
  const c = new V3(); S.forEach(s => c.add(s.p)); c.multiplyScalar(1 / N); c.y = 0;
  let R = 0; S.forEach(s => R = Math.max(R, Math.hypot(s.p.x - c.x, s.p.z - c.z)));
  const off = (i, d, y = 0) => { const s = S[((i % N) + N) % N]; return new V3(s.p.x + s.right.x * d, s.p.y + y, s.p.z + s.right.z * d); };
  const add = o => { scene.add(o); return o; };
  { // moon (night) / sun (day) with a face that winks
    const night = th === 'space' || th === 'storm';
    const g = new THREE.Group(); const col = night ? '#fff3c4' : '#ffe48a';
    mesh(new THREE.SphereGeometry(1, 24, 16), nofog(toon(col, { emissive: col, ei: night ? 0.55 : 0.7, rim: 0.4, nocache: true })), g, [0, 0, 0], null, 40);
    if (night) for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(1, 10, 8), nofog(toon('#e8d9a0', { rim: 0, nocache: true })), g, [Math.sin(i * 2.4) * 22, Math.cos(i * 1.7) * 22, 33], null, 4 + i % 3 * 2);
    const eyes = face(g, 39, 40, { nofog: true });
    g.position.set(c.x - 380, night ? 260 : 300, c.z - 420); g.lookAt(c.x, 0, c.z); add(g); spots.push(['luna', g, 120]);
    items.push(t => { eyes[1].scale.y = (t % 6) > 5.5 ? 0.6 : 6.8; eyes[0].scale.y = (t % 9) > 8.85 ? 0.4 : 6.8; g.rotation.z = Math.sin(t * 0.4) * 0.06; });
  }
  if (th === 'candy') {
    const w = add(whale('#b9a2f7')); spots.push(['ballena', w, 18]);
    items.push(t => { const a = t * 0.06; const r = R * 0.7; w.position.set(c.x + Math.cos(a) * r, 55 + Math.sin(t * 0.5) * 6, c.z + Math.sin(a) * r); w.rotation.y = -a; w.userData.tail.rotation.x = Math.sin(t * 1.5) * 0.35; w.userData.fins.forEach(([f, sd]) => f.rotation.z = sd * (0.6 + Math.sin(t * 2) * 0.3)); });
    const cups = []; for (let i = 0; i < (Q.hi ? 7 : 4); i++) { const cp = add(teacup()); cp.scale.setScalar(2.2); cups.push(cp); } spots.push(['tazas', cups[0], 22]);
    const cc = off(Math.round(N * 0.42), 0, 0);
    items.push(t => cups.forEach((cp, i) => { const a = t * 0.5 + i / cups.length * 6.28; cp.position.set(cc.x + Math.cos(a) * 40, cc.y + 22 + Math.sin(t * 1.3 + i) * 5, cc.z + Math.sin(a) * 40); cp.rotation.y = t * 2 + i; cp.rotation.z = Math.sin(t + i) * 0.3; }));
    for (let k = 0; k < 4; k++) { const i = Math.round(N * (0.15 + k * 0.22)), sd = k % 2 ? 1 : -1; const p = off(i, sd * (S[i].wall + 12));
      const bean = add(new THREE.Group()); bean.position.copy(p); if (!k) spots.push(['gominola', bean, 18]);
      const b = mesh(new THREE.CapsuleGeometry(2.2, 3, 6, 14), toon(['#ff7fb6', '#7ee3c4', '#ffd36b', '#b9a2f7'][k], { opacity: 0.9, rim: 0.7 }), bean, [0, 3.5, 0], [0, 0, Math.PI / 2 * 0.8]); outline(b, '#7a3a6e', 1.04);
      face(b, 2.1, 2.2);
      items.push(t => { const hgt = Math.abs(Math.sin(t * 2.2 + k)) * 9; bean.position.y = p.y + hgt; const sq = hgt < 1 ? 0.75 : 1.05; b.scale.set(1 / sq, sq, 1); bean.rotation.y = t * 0.8 + k; }); }
  }
  if (th === 'sunflower') {
    for (const [ti, sd] of [[0.22, 1], [0.62, -1], [0.92, 1]]) {
      const i = Math.round(N * ti), p = off(i, sd * (S[i].wall + 22), 0); p.y = -0.6;
      const g = add(new THREE.Group()); g.position.copy(p); spots.push(['girasol', g, 26, i, 30]);
      mesh(new THREE.CylinderGeometry(0.9, 1.3, 30, 10), toon('#5fb04a'), g, [0, 15, 0]);
      for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(1, 10, 8), toon('#6fc85a'), g, [s * 3, 12 + s, 0], [0, 0, s * 0.5], [4, 0.6, 2]);
      const head = new THREE.Group(); head.position.y = 31; g.add(head);
      const petals = new THREE.Group(); head.add(petals);
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; mesh(new THREE.SphereGeometry(1, 10, 8), toon('#ffc928', { rim: 0.5 }), petals, [Math.cos(a) * 7.5, Math.sin(a) * 7.5, -0.3], [0, 0, a], [3.4, 1.4, 0.5]); }
      const disc = mesh(new THREE.CylinderGeometry(5.6, 5.6, 1.4, 24), toon('#9a6a3a'), head, [0, 0, 0.3], [Math.PI / 2, 0, 0]); outline(disc, '#5a3a1a', 1.03);
      const eyes = face(head, 1.1, 6); const tmp = new THREE.Object3D(); head.add(tmp);
      items.push((t, dt, race) => { const P = race.player.pos; const wp = new V3(); head.getWorldPosition(wp); const yaw = Math.atan2(P.x - wp.x, P.z - wp.z), pitch = -Math.atan2(wp.y - P.y, Math.hypot(P.x - wp.x, P.z - wp.z)) * 0.6;
        let d = yaw - head.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; head.rotation.y += Math.max(-dt * 1.6, Math.min(dt * 1.6, d));
        head.rotation.x = pitch; petals.rotation.z = t * 0.3; eyes.forEach(e => e.scale.y = (t % 4) > 3.85 ? 0.1 : 1.02); });
    }
    const bugs = []; for (let k = 0; k < 5; k++) { const g = add(new THREE.Group()); mesh(new THREE.SphereGeometry(2, 14, 10, 0, 6.28, 0, Math.PI / 2), toon('#ff5f6f'), g); for (let j = 0; j < 4; j++) mesh(new THREE.SphereGeometry(0.4, 6, 5), toon('#2a1838', { rim: 0 }), g, [Math.cos(j * 1.6) * 1.2, 1.3, Math.sin(j * 1.6) * 1.2]); mesh(new THREE.SphereGeometry(0.9, 10, 8), toon('#2a1838'), g, [0, 0.4, 1.8]); bugs.push(g); }
    items.push(t => bugs.forEach((b, k) => { const a = t * 0.15 + k * 1.25; b.position.set(c.x + Math.cos(a) * R * (0.5 + k * 0.08), 25 + Math.sin(t + k) * 4, c.z + Math.sin(a) * R * (0.5 + k * 0.08)); b.rotation.y = -a; }));
  }
  if (th === 'ice') {
    const i = Math.round(N * 0.48), p = off(i, -(S[i].wall + 26), 0); p.y = -0.6;
    const g = add(new THREE.Group()); g.position.copy(p); spots.push(['helado', g, 34, i, 28]);
    const cone = mesh(new THREE.ConeGeometry(9, 28, 16), toon('#e8b47a'), g, [0, 14, 0], [Math.PI, 0, 0]); outline(cone, '#8a5a3a', 1.02);
    const sc1 = mesh(new THREE.SphereGeometry(10, 20, 14), toon('#ffc4e1', { rim: 0.5 }), g, [0, 31, 0]); mesh(new THREE.SphereGeometry(8, 18, 12), toon('#c4f0ff', { rim: 0.5 }), g, [1, 43, 0]);
    mesh(new THREE.SphereGeometry(2, 10, 8), toon('#ff4f6f'), g, [1, 52, 0]); face(g, 9.8, 10).forEach(e => e.position.y += 31);
    const drips = []; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; const d = mesh(new THREE.CapsuleGeometry(1.1, 1, 4, 8), toon('#ffc4e1'), g, [Math.cos(a) * 8.6, 26, Math.sin(a) * 8.6]); const drop = mesh(new THREE.SphereGeometry(1.1, 8, 6), toon('#ffc4e1'), g, [Math.cos(a) * 9.4, 22, Math.sin(a) * 9.4]); drips.push([d, drop, k]); }
    const puddle = mesh(new THREE.CircleGeometry(16, 24), toon('#ffc4e1', { rim: 0, opacity: 0.85 }), g, [0, 0.1, 0], [-Math.PI / 2, 0, 0]);
    items.push(t => { drips.forEach(([d, drop, k]) => { const ph = (t * 0.25 + k * 0.13) % 1; d.scale.y = 1 + ph * 5; d.position.y = 26 - ph * 3; drop.position.y = 22 - ph * 22; drop.visible = ph > 0.3; }); sc1.scale.y = 1 - Math.sin(t * 0.6) * 0.03; puddle.scale.setScalar(1 + Math.sin(t * 0.5) * 0.05); });
    const pens = []; for (let k = 0; k < 6; k++) { const ii = Math.round(N * (k / 6 + 0.07)), sd = k % 2 ? 1 : -1; const pp = off(ii, sd * (S[ii].wall + 5)); const pg = add(new THREE.Group()); pg.position.copy(pp); pg.lookAt(off(ii, 0));
      mesh(new THREE.SphereGeometry(1.6, 14, 10), toon('#3a4a7a'), pg, [0, 1.8, 0], null, [1, 1.3, 1]); mesh(new THREE.SphereGeometry(1.3, 12, 9), toon('#ffffff'), pg, [0, 1.6, 0.4], null, [1, 1.3, 1]); face(pg, 1.5, 1.4).forEach(e => e.position.y += 2.4);
      const fl = mesh(new THREE.SphereGeometry(1, 8, 6), toon('#3a4a7a'), pg, [1.6, 2.2, 0], null, [0.3, 1, 0.5]); mesh(new THREE.ConeGeometry(0.4, 0.8, 8), toon('#ffb36b'), pg, [0, 2.6, 1.7], [Math.PI / 2, 0, 0]); pens.push([pg, fl, k, pp.y]); }
    items.push(t => pens.forEach(([pg, fl, k, y0]) => { fl.rotation.z = 0.6 + Math.sin(t * 8 + k) * 0.6; pg.position.y = y0 + Math.abs(Math.sin(t * 3 + k)) * 0.6; }));
  }
  if (th === 'space') {
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(5, 14, 10), nofog(new THREE.MeshBasicMaterial({ color: '#fffbe0' }))));
    const tail = []; for (let k = 0; k < 24; k++) tail.push(add(new THREE.Mesh(new THREE.SphereGeometry(4.5 * (1 - k / 26), 8, 6), nofog(new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.5 + k * 0.02, 1, 0.75), transparent: true, opacity: 1 - k / 24, depthWrite: false })))));
    const hist = []; spots.push(['cometa', head, 60]);
    items.push(t => { const ph = (t % 11) / 11; const a = new V3(c.x - 700, 260, c.z - 300), b = new V3(c.x + 700, 120, c.z + 200); const p = a.lerp(b, ph); head.position.copy(p); hist.unshift(p.clone()); if (hist.length > 60) hist.pop(); tail.forEach((s, k) => s.position.copy(hist[Math.min(hist.length - 1, k * 2)])); });
    const w = add(whale('#ff9cc8')); spots.push(['ballena', w, 18]);
    items.push(t => { const a = -t * 0.05 + 1; w.position.set(c.x + Math.cos(a) * R * 0.9, 75 + Math.sin(t * 0.4) * 8, c.z + Math.sin(a) * R * 0.9); w.rotation.y = -a + Math.PI; w.userData.tail.rotation.x = Math.sin(t * 1.3) * 0.35; });
    const dn = add(new THREE.Group()); dn.position.set(c.x + 260, 90, c.z + 320);
    mesh(new THREE.TorusGeometry(40, 18, 16, 40), toon('#ffcf9a'), dn); mesh(new THREE.TorusGeometry(40, 18.5, 16, 40), toon('#ff8fd0', { rim: 0.5 }), dn, [0, 0, 3], null, [1, 1, 0.7]);
    items.push(t => { dn.rotation.x = 1 + Math.sin(t * 0.2) * 0.2; dn.rotation.z = t * 0.1; });
  }
  if (th === 'storm') {
    for (const ti of [0.08, 0.5, 0.78]) {
      const i = Math.round(N * ti), p = off(i, 0, 26);
      const g = add(new THREE.Group()); g.position.copy(p); spots.push(['bola disco', g, 20, i, -10]);
      mesh(new THREE.CylinderGeometry(0.15, 0.15, 30, 4), toon('#aaaaaa'), g, [0, 15, 0]);
      const ball = mesh(new THREE.IcosahedronGeometry(6, 2), new THREE.MeshPhongMaterial({ color: '#dfe6ff', emissive: '#8060ff', specular: '#ffffff', shininess: 120, flatShading: true }), g);
      const beams = []; for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.ConeGeometry(6, 28, 16, 1, true), new THREE.MeshBasicMaterial({ color: ['#ff5fd2', '#5ff5ff', '#ffe066', '#b98aff'][k], transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); b.geometry.translate(0, -14, 0); g.add(b); beams.push(b); }
      items.push(t => { ball.rotation.y = t * 1.2; ball.material.emissive.setHSL((t * 0.2) % 1, 0.9, 0.35); beams.forEach((b, k) => b.rotation.set(Math.sin(t * 1.3 + k * 1.7) * 0.7, 0, Math.cos(t * 1.1 + k * 1.3) * 0.7)); });
    }
    const n = Q.hi ? 16 : 8, danc = []; for (let k = 0; k < n; k++) { const ii = Math.round(N * k / n), sd = k % 2 ? 1 : -1; const pp = off(ii, sd * (S[ii].wall + 4.5)); const d = mesh(new THREE.SphereGeometry(1.2, 12, 9), toon('#ffffff', { emissive: ['#ff5fd2', '#5ff5ff', '#ffe066'][k % 3], ei: 0.6, nocache: true }), scene, [pp.x, pp.y + 1.3, pp.z]); danc.push([d, k, pp.y + 1.3]); }
    items.push(t => danc.forEach(([d, k, y0]) => { d.position.y = y0 + Math.abs(Math.sin(t * 6 + k)) * 1.4; d.scale.set(1, 1 + Math.sin(t * 12 + k) * 0.15, 1); }));
  }
  return { spots, update(t, dt, race) { for (const u of items) u(t, dt, race); for (const a of T.anims) a(t, dt, race); } };
}
