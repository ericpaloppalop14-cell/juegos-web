// v19: 8 pilotos premium surrealistas (mismo cuerpo y tamaño que los demás; vehículo dentro del mismo volumen que los karts normales)
import * as THREE from 'three';
const G = (p, pos, rot) => { const g = new THREE.Group(); if (pos) g.position.set(...pos); if (rot) g.rotation.set(...rot); p.add(g); return g; };

// ---------- accesorios del piloto (sobre el cuerpo de gominola) ----------
export function premiumChar(X, rig, root, H) {
  const { mesh, toon, outline, sph, cyl, cone, tor, box, basic } = H;
  const A = [], add = (g, m, p, r, s, par = rig) => mesh(g, m, par, p, r, s);
  const blk = toon('#2a1838', { rim: 0.6 }), gold = toon('#ffd36a', { rim: 0.8, emissive: '#c08a20', ei: 0.25 }), white = toon('#ffffff', { rim: 0.5 });
  if (X === 'capitan') { // pez con chistera y monóculo
    const hat = G(rig, [0.05, 1.5, 0], [0, 0, -0.12]); add(cyl(18), blk, [0, 0.36, 0], null, [0.36, 0.62, 0.36], hat); add(cyl(18), blk, [0, 0.04, 0], null, [0.62, 0.05, 0.62], hat);
    add(cyl(18), toon('#ff6f9a', { rim: 0 }), [0, 0.13, 0], null, [0.37, 0.09, 0.37], hat); A.push(t => { hat.rotation.z = -0.12 + Math.sin(t * 2.2) * 0.06; });
    add(tor(0.12, 20), gold, [0.35, 0.89, 0.96], [0, 0.38, 0], 0.24); const ln = add(sph(12), basic('#e8fbff', { opacity: 0.4 }), [0.35, 0.89, 0.95], [0, 0.38, 0], [0.22, 0.22, 0.03]); ln.renderOrder = 5;
    add(cyl(6), gold, [0.5, 0.6, 0.86], [0, 0, 0.35], [0.012, 0.55, 0.012]);
    const tail = G(rig, [0, 0.55, -0.95]); const tf = add(cone(4), toon('#ff9f4a', { rim: 0.5 }), [0, 0, -0.2], [-Math.PI / 2, 0, 0], [0.42, 0.4, 0.08], tail); outline(tf, '#a0502a', 1.1); A.push(t => { tail.rotation.y = Math.sin(t * 6) * 0.4; });
    for (let i = 0; i < 4; i++) add(sph(8), toon('#ffd36b', { rim: 0.6, opacity: 0.8 }), [-0.5 + i * 0.32, 0.35 + (i % 2) * 0.1, 0.8], null, [0.12, 0.09, 0.03]); }
  if (X === 'tostadin') { // corona de mantequilla
    const cr = G(rig, [0, 1.48, 0]); add(box(), toon('#fff1a0', { rim: 0.6, emissive: '#ffe066', ei: 0.2 }), [0, 0.08, 0], [0, 0.4, 0], [0.5, 0.18, 0.5], cr);
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; add(cone(4), gold, [Math.cos(a) * 0.38, 0.28, Math.sin(a) * 0.38], null, [0.1, 0.2, 0.1], cr); } A.push(t => { cr.rotation.y = t * 0.8; });
    for (const s of [-1, 1]) add(sph(10), toon('#c87a3a', { rim: 0 }), [s * 0.2, 1.05, 0.88], null, [0.09, 0.04, 0.03]); }
  if (X === 'madame') { // boina y collar de perlas
    add(sph(16), toon('#7a4ab8', { rim: 0.5 }), [0.12, 1.5, 0], [0, 0, -0.3], [0.62, 0.18, 0.62]); add(sph(8), toon('#7a4ab8'), [0.2, 1.66, 0], null, 0.07);
    for (let i = 0; i < 12; i++) { const a = -1.2 + i * 0.22; add(sph(8), toon('#fffaf0', { rim: 0.9 }), [Math.sin(a) * 0.82, 0.42, Math.cos(a) * 0.72], null, 0.07); } }
  if (X === 'tecla') { // director de orquesta: pajarita y batuta
    for (const s of [-1, 1]) { const w = add(cone(4), blk, [s * 0.13, 0.42, 0.88], [0, 0, s * Math.PI / 2], [0.13, 0.22, 0.06]); outline(w, '#000', 1.1); } add(sph(8), blk, [0, 0.42, 0.9], null, 0.06);
    const bat = G(rig, [0.85, 0.7, 0.3]); add(cyl(6), white, [0, 0.35, 0], null, [0.02, 0.7, 0.02], bat); add(sph(8), toon('#8a5a3a'), [0, 0, 0], null, 0.06, bat); A.push(t => { bat.rotation.z = Math.sin(t * 7) * 0.6 - 0.3; bat.rotation.x = Math.cos(t * 7) * 0.3; });
    for (const s of [-1, 1]) add(sph(10), toon('#f0f0f0', { rim: 0.7 }), [s * 0.55, 1.4, -0.1], null, [0.25, 0.2, 0.25]); }
  if (X === 'duquesa') { // gorro de ducha con burbujas
    add(sph(18), toon('#ffb3d1', { rim: 0.6, opacity: 0.9 }), [0, 1.42, 0], null, [0.8, 0.38, 0.8]); add(tor(0.2, 24), toon('#ff8fb8'), [0, 1.3, 0], [Math.PI / 2, 0, 0], [0.8, 0.8, 0.5]);
    const bb = []; for (let i = 0; i < 5; i++) bb.push(add(sph(10), toon('#e8fbff', { opacity: 0.55, rim: 1 }), [0, 0, 0], null, 0.08 + (i % 3) * 0.04));
    A.push(t => bb.forEach((b, i) => { const k = (t * 0.35 + i * 0.2) % 1; b.position.set(Math.sin(i * 2.3 + t) * 0.6, 1.6 + k * 0.9, Math.cos(i * 1.7) * 0.4); b.scale.setScalar((0.08 + (i % 3) * 0.04) * (1 - k * 0.4)); })); }
  if (X === 'farito') { // gorra de marinero
    add(cyl(18), white, [0, 1.52, 0], null, [0.55, 0.16, 0.55]); add(cyl(18), toon('#3a5aa8'), [0, 1.44, 0], null, [0.57, 0.06, 0.57]); add(cyl(10), toon('#3a5aa8'), [0, 1.46, 0.5], [0.4, 0, 0], [0.3, 0.03, 0.18]);
    add(H.starGeoS(), gold, [0, 1.52, 0.56], null, 0.06); }
  if (X === 'tarta') { // gorro de fiesta y confeti
    const h = add(cone(16), toon('#7ee3c4', { rim: 0.5 }), [0.1, 1.82, 0], [0, 0, -0.18], [0.3, 0.6, 0.3]); outline(h, '#3a8a6a', 1.06);
    for (let i = 0; i < 3; i++) add(sph(6), toon(['#ff6fa8', '#ffe066', '#b9a2f7'][i]), [0.1 - i * 0.06, 1.62 + i * 0.18, 0.2 - i * 0.04], null, 0.05);
    const pom = add(sph(10), toon('#ffe066', { emissive: '#ffcc33', ei: 0.4 }), [0.21, 2.4, 0], null, 0.1); A.push(t => { pom.position.x = 0.21 + Math.sin(t * 5) * 0.05; }); }
  if (X === 'grullita') { // gafas de aviador y bufanda
    const lm = toon('#8a5a3a', { rim: 0.4 }); add(tor(0.06, 28), lm, [0, 1.3, 0], [Math.PI / 2 - 0.2, 0, 0], [0.84, 0.84, 0.84]);
    for (const s of [-1, 1]) { add(cyl(16), lm, [s * 0.26, 1.33, 0.72], [Math.PI / 2 - 0.55, 0, 0], [0.19, 0.12, 0.19]); add(cyl(16), toon('#9fe8ff', { emissive: '#5fc8ff', ei: 0.4, rim: 0.9 }), [s * 0.26, 1.37, 0.78], [Math.PI / 2 - 0.55, 0, 0], [0.15, 0.04, 0.15]); }
    const sc = G(rig, [-0.45, 0.4, -0.6]); add(box(), toon('#ff6f6f'), [0, 0, -0.3], null, [0.18, 0.06, 0.6], sc); add(tor(0.3, 24), toon('#ff6f6f'), [0.45, 0, 0.62], [Math.PI / 2, 0, 0], [0.86, 0.86, 0.5]); A.push(t => { sc.rotation.y = Math.sin(t * 8) * 0.25; sc.rotation.x = Math.sin(t * 5) * 0.15; }); }
  if (A.length) root.userData.extra = (root.userData.extra || []).concat(A);
}

// ---------- vehículos (huella ~2.8 x 2.8, como la taza) ----------
export function premiumVehicle(V, g, wheel, anims, C, OL, H) {
  const { mesh, toon, outline, sph, cyl, cone, tor, box, basic } = H;
  const m = (gg, mat, p, r, s, par = g) => mesh(gg, mat, par, p, r, s);
  if (V === 'whale') { // pequeña ballena que el pez monta como un caballo
    const w = G(g, [0, 0, 0]); const bm = toon('#5fa8e8', { rim: 0.6 }), belly = toon('#e8f4ff', { rim: 0.3 });
    const body = m(sph(20), bm, [0, 0.85, 0.1], null, [1.05, 0.72, 1.45], w); outline(body, '#2a5a8a', 1.04); m(sph(16), belly, [0, 0.55, 0.35], null, [0.85, 0.42, 1.1], w);
    for (const s of [-1, 1]) { m(sph(10), toon('#1a2a4a'), [s * 0.62, 0.95, 1.12], null, [0.1, 0.12, 0.08], w); m(sph(6), basic('#ffffff'), [s * 0.64, 0.99, 1.18], null, 0.035, w);
      m(sph(8), toon('#ff9cc8', { rim: 0 }), [s * 0.78, 0.72, 1.0], null, [0.13, 0.07, 0.05], w); }
    m(tor(0.25, 16, Math.PI), toon('#1a2a4a'), [0, 0.68, 1.43], [0, 0, Math.PI], [0.18, 0.12, 0.1], w);
    const tail = G(w, [0, 0.95, -1.35]); for (const s of [-1, 1]) { const f = m(sph(12), bm, [s * 0.35, 0.15, -0.15], [0, 0, s * 0.4], [0.45, 0.1, 0.25], tail); outline(f, '#2a5a8a', 1.06); }
    const fins = []; for (const s of [-1, 1]) { const f = G(w, [s * 0.95, 0.45, 0.45]); const ff = m(sph(10), bm, [s * 0.2, -0.1, 0], [0, 0, s * 0.6], [0.35, 0.09, 0.22], f); outline(ff, '#2a5a8a', 1.08); fins.push([f, s]); }
    const saddle = m(cyl(18), toon('#c0504a'), [0, 1.48, -0.05], null, [0.62, 0.08, 0.55], w); m(tor(0.1, 18), gold(H), [0, 1.5, -0.05], [Math.PI / 2, 0, 0], [0.62, 0.55, 0.6], w);
    m(cyl(6), toon('#8a5a3a'), [0, 1.5, 0.8], [0.9, 0, 0], [0.02, 0.9, 0.02], w); // riendas
    const spout = []; for (let i = 0; i < 5; i++) spout.push(m(sph(8), toon('#bfeaff', { opacity: 0.75, rim: 1, emissive: '#8fd8ff', ei: 0.3 }), [0, 0, 0], null, 0.12, w));
    anims.push(t => { w.position.y = Math.abs(Math.sin(t * 4)) * 0.12; w.rotation.x = Math.sin(t * 4) * 0.05; tail.rotation.x = Math.sin(t * 4) * 0.4; fins.forEach(([f, s]) => f.rotation.x = Math.sin(t * 8 + s) * 0.6);
      spout.forEach((b, i) => { const k = (t * 0.9 + i * 0.2) % 1; b.position.set(Math.sin(i * 2) * k * 0.4, 1.9 + k * 1.1, 0.75 + Math.cos(i * 2) * k * 0.3); b.scale.setScalar(0.13 * (1 - k * 0.6)); }); });
    return 1.25; }
  if (V === 'toaster') { // tostadora voladora que escupe tostadas
    const tm = toon('#d8dce8', { rim: 0.9, emissive: '#606880', ei: 0.1 }); const b = m(box(), tm, [0, 0.85, 0], null, [1.9, 1.0, 2.4]); outline(b, '#4a5068', 1.03);
    m(box(), toon('#ff6f6f'), [0, 0.85, 1.21], null, [1.6, 0.25, 0.02]); m(box(), toon('#2a2a3a'), [1.0, 0.95, 0.6], null, [0.06, 0.12, 0.6]);
    const toasts = []; for (const z of [-0.6, 0.6]) { m(box(), toon('#2a2a3a'), [0, 1.36, z], null, [1.2, 0.04, 0.18]); const tt = m(box(), toon('#e8a050', { rim: 0.4 }), [0.55, 1.4, z], null, [0.7, 0.6, 0.12]); outline(tt, '#8a5020', 1.06); toasts.push(tt); }
    const wings = []; for (const s of [-1, 1]) { const w = G(g, [s * 0.95, 1.0, -0.2]); const ww = m(sph(12), white(H), [s * 0.5, 0, 0], null, [0.6, 0.06, 0.35], w); outline(ww, '#a0a0c0', 1.08); wings.push([w, s]); }
    for (const [x, z] of [[-0.75, 0.95], [0.75, 0.95], [-0.75, -0.95], [0.75, -0.95]]) wheel(x, z, 0.3, '#ffe066');
    anims.push(t => { toasts.forEach((tt, i) => tt.position.y = 1.4 + Math.max(0, Math.sin(t * 3 + i * 1.5)) * 0.7); wings.forEach(([w, s]) => w.rotation.z = s * Math.sin(t * 12) * 0.5); });
    return 1.05; }
  if (V === 'umbrella') { // paraguas del revés que navega sobre su propia nubecita de lluvia
    const cm = toon('#ffffff', { rim: 0.7 }); [[0, 0.35, 0, 0.85], [0.8, 0.3, 0.3, 0.6], [-0.8, 0.3, 0.3, 0.6], [0.5, 0.3, -0.8, 0.6], [-0.5, 0.3, -0.8, 0.6]].forEach(([x, y, z, r]) => { const c = m(sph(14), cm, [x, y, z], null, [r, r * 0.6, r]); outline(c, '#a0a8d0', 1.05); });
    const um = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#7a4ab8', { side: THREE.DoubleSide, rim: 0.5 })); um.position.y = 1.65; g.add(um); outline(um, '#3a1a6a', 1.03);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; m(sph(6), toon(i % 2 ? '#ffe066' : '#ff9cc8'), [Math.cos(a) * 1.35, 1.65, Math.sin(a) * 1.35], null, 0.09); }
    const hook = m(tor(0.08, 16, Math.PI), toon('#c08a50'), [0, 2.0, -1.2], [0, Math.PI / 2, 0], 0.25);
    const drops = []; for (let i = 0; i < 8; i++) drops.push(m(sph(6), toon('#8fd8ff', { emissive: '#5fc8ff', ei: 0.4 }), [0, 0, 0], null, [0.04, 0.09, 0.04]));
    wheel(0, 0, 0.01); // rueda invisible (gira con la velocidad)
    anims.push(t => { um.rotation.y = t * 0.6; drops.forEach((d, i) => { const k = (t * 1.5 + i * 0.125) % 1; d.position.set(Math.sin(i * 2.4) * 0.8, 0.1 - k * 0.3, Math.cos(i * 1.9) * 0.7); d.visible = k < 0.9; }); });
    return 0.95; }
  if (V === 'piano') { // piano de cola con patitas que corren
    const pm = toon('#2a2438', { rim: 0.9, emissive: '#4a3a6a', ei: 0.15 });
    const sh = new THREE.Shape(); sh.moveTo(-1, -1.3); sh.lineTo(1, -1.3); sh.lineTo(1, 0.3); sh.quadraticCurveTo(1, 1.4, 0, 1.4); sh.quadraticCurveTo(-1, 1.4, -1, 0.6); sh.lineTo(-1, -1.3);
    const top = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 }), pm); top.rotation.x = -Math.PI / 2; top.position.set(0, 0.55, -0.1); g.add(top); outline(top, '#000', 1.02);
    const lid = new THREE.Mesh(new THREE.ShapeGeometry(sh), pm); lid.position.set(0, 1.1, -0.1); lid.rotation.x = -Math.PI / 2 - 0.0; g.add(lid);
    const keys = G(g, [0, 0.85, 1.45]); for (let i = 0; i < 11; i++) { m(box(), toon('#ffffff', { rim: 0 }), [-0.9 + i * 0.18, 0, 0], null, [0.16, 0.08, 0.35], keys); if (i % 7 !== 2 && i % 7 !== 6 && i < 10) m(box(), toon('#111'), [-0.81 + i * 0.18, 0.06, -0.06], null, [0.09, 0.06, 0.22], keys); }
    const legs = []; for (const [x, z] of [[-0.8, 1.1], [0.8, 1.1], [0, -1.0]]) { const l = G(g, [x, 0.55, z]); m(cyl(8), toon('#c8a060'), [0, -0.25, 0], null, [0.1, 0.5, 0.1], l); m(sph(8), toon('#ff9cc8'), [0, -0.52, 0.08], null, [0.14, 0.08, 0.2], l); legs.push(l); }
    const notes = []; for (let i = 0; i < 3; i++) { const n = G(g); m(sph(8), toon('#ffe066', { emissive: '#ffcc33', ei: 0.6 }), [0, 0, 0], null, [0.1, 0.08, 0.06], n); m(box(), toon('#ffe066', { emissive: '#ffcc33', ei: 0.6 }), [0.08, 0.18, 0], null, [0.02, 0.35, 0.02], n); notes.push(n); }
    wheel(0, 0, 0.01);
    anims.push(t => { legs.forEach((l, i) => l.rotation.x = Math.sin(t * 14 + i * 2) * 0.6); keys.children.forEach((k, i) => k.position.y = (Math.sin(t * 9 + i) > 0.8 ? -0.04 : 0)); notes.forEach((n, i) => { const k = (t * 0.6 + i / 3) % 1; n.position.set(Math.sin(i * 2 + t) * 0.9, 1.4 + k * 1.4, -0.5); n.scale.setScalar(1 - k * 0.5); }); });
    return 1.05; }
  if (V === 'bathtub') { // bañera con patas de león y patito de goma
    const tub = m(sph(20), toon('#ffffff', { rim: 0.7 }), [0, 0.85, 0], null, [1.05, 0.55, 1.4]); outline(tub, '#a0a8c0', 1.03);
    const water = m(cyl(20), toon('#9fe8ff', { opacity: 0.85, emissive: '#5fc8ff', ei: 0.25 }), [0, 1.18, 0], null, [0.92, 0.05, 1.25]);
    for (let i = 0; i < 9; i++) m(sph(10), toon('#ffffff', { opacity: 0.9, rim: 0.8 }), [Math.sin(i * 2.1) * 0.75, 1.25, Math.cos(i * 1.3) * 1.05], null, 0.18 + (i % 3) * 0.06);
    for (const [x, z] of [[-0.75, 0.95], [0.75, 0.95], [-0.75, -0.95], [0.75, -0.95]]) { m(cyl(8), gold(H), [x, 0.32, z], null, [0.1, 0.4, 0.1]); m(sph(8), gold(H), [x, 0.1, z + 0.08], null, [0.16, 0.1, 0.2]); }
    const duck = G(g, [0.65, 1.3, 0.9]); m(sph(12), toon('#ffe066'), [0, 0.1, 0], null, [0.2, 0.16, 0.24], duck); m(sph(10), toon('#ffe066'), [0, 0.3, 0.12], null, 0.13, duck); m(cone(6), toon('#ff9f4a'), [0, 0.28, 0.27], [Math.PI / 2, 0, 0], [0.05, 0.1, 0.04], duck);
    m(cyl(8), gold(H), [0, 1.35, -1.35], null, [0.07, 0.6, 0.07]); m(cyl(8), gold(H), [0, 1.65, -1.2], [Math.PI / 2, 0, 0], [0.06, 0.3, 0.06]);
    wheel(-0.85, 0.5, 0.01); anims.push(t => { duck.position.y = 1.3 + Math.sin(t * 3) * 0.06; duck.rotation.y = Math.sin(t * 1.5) * 0.6; water.rotation.y = t; });
    return 1.0; }
  if (V === 'snailhouse') { // caracol cuya concha es un faro
    const sb = m(sph(16), toon('#9fe8a8', { rim: 0.6, opacity: 0.9 }), [0, 0.35, 0.2], null, [0.75, 0.3, 1.45]); outline(sb, '#3a8a5a', 1.05);
    for (const s of [-1, 1]) { m(cyl(6), toon('#9fe8a8'), [s * 0.2, 0.75, 1.3], [0.4, 0, s * 0.3], [0.04, 0.6, 0.04]); m(sph(8), toon('#2a1838'), [s * 0.33, 1.05, 1.42], null, 0.08); }
    const tw = G(g, [0, 0.5, -0.5]); for (let i = 0; i < 4; i++) m(cyl(16), toon(i % 2 ? '#ff6f6f' : '#ffffff', { rim: 0.4 }), [0, 0.2 + i * 0.32, 0], null, [0.7 - i * 0.08, 0.32, 0.7 - i * 0.08], tw);
    m(cyl(12), toon('#fff6a0', { emissive: '#ffe066', ei: 0.9, opacity: 0.9 }), [0, 1.55, 0], null, [0.36, 0.3, 0.36], tw); m(cone(12), toon('#ff6f6f'), [0, 1.9, 0], null, [0.42, 0.35, 0.42], tw);
    const beam = G(tw, [0, 1.55, 0]); const bm = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6a0', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); bm.rotation.z = Math.PI / 2; bm.position.x = 1.5; beam.add(bm);
    for (const [x, z] of [[-0.7, 0.9], [0.7, 0.9], [-0.7, -0.9], [0.7, -0.9]]) wheel(x, z, 0.28, '#9fe8a8');
    anims.push(t => { beam.rotation.y = t * 2; });
    return 0.95; }
  if (V === 'cake') { // tarta de cumpleaños sobre patines con velas
    const lay = [['#ffd6ec', 1.35, 0.55], ['#fff6c8', 1.05, 0.95]]; for (const [c, r, y] of lay) { const l = m(cyl(24), toon(c, { rim: 0.4 }), [0, y, 0], null, [r, 0.42, r]); outline(l, '#c07090', 1.03); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; m(sph(8), toon('#ffffff', { rim: 0.6 }), [Math.cos(a) * 1.35, 0.78, Math.sin(a) * 1.35], null, [0.16, 0.1, 0.16]); m(sph(6), toon('#ff4f6f'), [Math.cos(a) * 1.05, 1.2, Math.sin(a) * 1.05], null, 0.08); }
    const flames = []; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + 0.3; m(cyl(6), toon(['#7ee3c4', '#b9a2f7', '#ffd36b'][i % 3]), [Math.cos(a) * 0.95, 1.45, Math.sin(a) * 0.95], null, [0.05, 0.35, 0.05]); flames.push(m(sph(8), toon('#ffb84a', { emissive: '#ff9f2a', ei: 1 }), [Math.cos(a) * 0.95, 1.7, Math.sin(a) * 0.95], null, [0.06, 0.1, 0.06])); }
    for (const [x, z] of [[-0.9, 0.9], [0.9, 0.9], [-0.9, -0.9], [0.9, -0.9]]) wheel(x, z, 0.25, '#ff9cc8');
    anims.push(t => flames.forEach((f, i) => f.scale.y = 0.1 * (1 + Math.sin(t * 15 + i) * 0.25)));
    return 1.15; }
  if (V === 'paperplane') { // avión de papel gigante
    const pm = toon('#fffdf5', { side: THREE.DoubleSide, rim: 0.4, flat: true });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.6, 1.6, -1.4, 0.9, -1.3, 0, 0.3, -1.3, 0, 0.6, 1.6, 0, 0.3, -1.3, 1.4, 0.9, -1.3, 0, 0.6, 1.6, 0, 0.3, -1.3, 0, 0.0, -1.1]), 3); geo.computeVertexNormals();
    const pl = new THREE.Mesh(geo, pm); g.add(pl); outline(pl, '#a0a0c0', 1.02);
    m(box(), toon('#ff9cc8', { rim: 0 }), [0.7, 0.85, -0.5], [0, 0.48, 0.2], [0.5, 0.01, 0.12]); m(box(), toon('#7ee3c4', { rim: 0 }), [-0.7, 0.85, -0.5], [0, -0.48, -0.2], [0.5, 0.01, 0.12]);
    const trail = []; for (let i = 0; i < 6; i++) trail.push(m(sph(6), toon('#ffffff', { opacity: 0.7, rim: 0 }), [0, 0, 0], null, 0.08));
    wheel(0, 0, 0.01); const P = G(g); P.add(pl);
    anims.push(t => { P.position.y = 0.25 + Math.sin(t * 2.5) * 0.15; P.rotation.z = Math.sin(t * 1.7) * 0.12; trail.forEach((d, i) => { const k = (t * 1.2 + i / 6) % 1; d.position.set(Math.sin(i * 3) * 0.6, 0.6 + Math.cos(i) * 0.2, -1.3 - k * 1.6); d.scale.setScalar(0.1 * (1 - k)); }); });
    return 0.85; }
  return null;
}
const gold = H => H.toon('#ffd36a', { rim: 0.8, emissive: '#c08a20', ei: 0.25 });
const white = H => H.toon('#ffffff', { rim: 0.5 });
