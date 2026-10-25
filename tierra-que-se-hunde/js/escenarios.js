// ======================================================================
//  v19 · ESCENARIOS PROPIOS POR MODO
//  Cada modo de juego tiene su sitio: sendero entre acantilados, cima de
//  montaña sobre un mar de nubes, isla-huerto de fresas, paleta del pintor
//  y cielo al revés. La forma del suelo (agujeros) va en MAPS de main.js;
//  aquí se construye el decorado 3D que la rodea.
// ======================================================================
import * as THREE from 'three';

const rnd = s => { let x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function cvTex(w, h, f, rep) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; f(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 4; return t; }
// roca con estratos (vetas horizontales) para paredes de acantilado
const strata = (cols, seed = 1) => cvTex(256, 512, (x, w, h) => { let y = 0, k = 0; while (y < h) { const bh = 10 + rnd(seed + k) * 34; x.fillStyle = cols[k % cols.length]; x.fillRect(0, y, w, bh + 1);
  x.globalAlpha = 0.18; x.fillStyle = '#000'; x.fillRect(0, y + bh - 2, w, 2); x.globalAlpha = 1; y += bh; k++; }
  for (let i = 0; i < 260; i++) { x.globalAlpha = 0.08 + rnd(i + seed) * 0.12; x.fillStyle = rnd(i * 3) > 0.5 ? '#fff' : '#3a2440'; x.fillRect(rnd(i * 7) * w, rnd(i * 11) * h, 2 + rnd(i) * 10, 1 + rnd(i * 5) * 3); } x.globalAlpha = 1; });
const cloudTex = () => cvTex(512, 512, (x, w, h) => { for (let i = 0; i < 90; i++) { const cx = rnd(i) * w, cy = rnd(i + 50) * h, r = 30 + rnd(i + 9) * 90, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); } }, [6, 6]);
const keep = o => o.traverse(m => { m.userData.keep = true; });
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });

// bordes del suelo: losas de roca en cada lado de casilla que da al vacío + base profunda
function cliffEdges(g, ctx, { depth = 40, mat, capMat, base = true, lip = 0.9 }) {
  const { N, TS, FY, tx, tz, hole } = ctx, inside = i => i >= 0 && !hole(tx(i), tz(i)), idx = (cx, cz) => cx < 0 || cz < 0 || cx >= N || cz >= N ? -1 : cz * N + cx;
  const edges = [], cells = [];
  for (let i = 0; i < N * N; i++) { if (!inside(i)) continue; cells.push(i); const cx = i % N, cz = i / N | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inside(idx(cx + dx, cz + dz))) edges.push([i, dx, dz]); }
  const sg = new THREE.BoxGeometry(1, 1, 1), im = new THREE.InstancedMesh(sg, mat, edges.length * 3), o = new THREE.Object3D(); let n = 0;
  edges.forEach(([i, dx, dz], k) => { for (let s = 0; s < 3; s++) { // 3 bloques irregulares por borde: el acantilado se ve tallado
      const d = depth * (0.55 + rnd(i * 3 + s + k) * 0.6) * (s === 0 ? 1 : 0.8), w = TS * (s === 0 ? 1.08 : 0.7), off = s === 0 ? 0 : (s === 1 ? -0.35 : 0.35) * TS;
      o.position.set(tx(i) + dx * (TS / 2 + 0.2 + s * 0.35) + (dz ? off : 0), FY - 0.25 - d / 2 - s * 1.2, tz(i) + dz * (TS / 2 + 0.2 + s * 0.35) + (dx ? off : 0));
      o.rotation.set((rnd(k + s) - 0.5) * 0.12, dx ? Math.PI / 2 : 0, (rnd(k * 2 + s) - 0.5) * 0.12); o.scale.set(w, d, lip + s * 0.8); o.updateMatrix(); im.setMatrixAt(n++, o.matrix); } });
  im.count = n; im.receiveShadow = true; g.add(im);
  if (capMat) { const cap = new THREE.InstancedMesh(sg, capMat, edges.length), o2 = new THREE.Object3D(); edges.forEach(([i, dx, dz], k) => { o2.position.set(tx(i) + dx * (TS / 2 + 0.25), FY - 0.2, tz(i) + dz * (TS / 2 + 0.25)); o2.rotation.set(0, dx ? Math.PI / 2 : 0, 0); o2.scale.set(TS * 1.1, 0.5, 1.1); o2.updateMatrix(); cap.setMatrixAt(k, o2.matrix); }); cap.receiveShadow = true; g.add(cap); }
  // foso oscuro con la forma del suelo (se ve al hundirse una casilla)
  const pit = new THREE.InstancedMesh(new THREE.PlaneGeometry(TS + 0.05, TS + 0.05).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1d1430', emissive: '#2b1a52', emissiveIntensity: 0.35, roughness: 0.9 }), cells.length);
  cells.forEach((i, k) => { o.position.set(tx(i), FY - 1.45, tz(i)); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); pit.setMatrixAt(k, o.matrix); }); g.add(pit);
  if (base) { const bm = new THREE.InstancedMesh(sg, mat, cells.length); cells.forEach((i, k) => { const d = depth * (0.6 + rnd(i) * 0.5); o.position.set(tx(i), FY - 1.6 - d / 2, tz(i)); o.scale.set(TS + 0.02, d, TS + 0.02); o.updateMatrix(); bm.setMatrixAt(k, o.matrix); }); g.add(bm); }
  return cells;
}
function birds(g, n, R, y, col = '#5a4060') { const ms = [], geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1.4, 0.35, -0.5, -0.2, 0, -0.4, 0, 0, 0, 1.4, 0.35, -0.5, 0.2, 0, -0.4], 3)); geo.computeVertexNormals();
  const m = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, fog: true });
  for (let i = 0; i < n; i++) { const b = new THREE.Mesh(geo, m); b.scale.setScalar(1.4 + rnd(i) * 1.2); b.userData.keep = true; g.add(b); ms.push([b, rnd(i + 3) * 6.28, R * (0.7 + rnd(i + 7) * 0.5), y + rnd(i + 9) * 12, 0.08 + rnd(i) * 0.08]); }
  return t => { for (const [b, a0, r, yy, sp] of ms) { const a = a0 + t * sp; b.position.set(Math.cos(a) * r, yy + Math.sin(t + a0) * 2, Math.sin(a) * r); b.rotation.set(Math.sin(t * 6 + a0) * 0.3, -a, 0); b.scale.y = 1 + Math.sin(t * 9 + a0) * 0.5; } }; }
function pine(g, x, y, z, s, c1 = '#3f8f6a', c2 = '#2f7458') { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 1.6 * s, 6), M('#7a5040')); t.position.set(x, y + 0.8 * s, z); g.add(t);
  for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.5 - k * 0.35) * s, 2.2 * s, 7), M(k % 2 ? c1 : c2, { flatShading: true })); c.position.set(x, y + (2 + k * 1.2) * s, z); g.add(c); } }
function cloudPuff(g, x, y, z, s, m) { const sg = new THREE.SphereGeometry(1, 10, 7); for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(sg, m); b.position.set(x + (k - 2.5) * s * 0.9, y + Math.sin(k * 1.7) * s * 0.3, z + Math.cos(k * 2.3) * s * 0.5); b.scale.set(s * (0.9 + rnd(k + x) * 0.6), s * (0.6 + rnd(k + z) * 0.4), s * (0.9 + rnd(k) * 0.4)); g.add(b); } }

// ---------------------------------------------------------------- 1) SENDERO DEL ACANTILADO (Patata caliente)
function acantilado(g, ctx) { const { FY, HALF, pathX } = ctx, anim = [];
  const rock = M('#c9a0a8', { map: strata(['#d8aeb4', '#c49aa6', '#e4c0b0', '#b48ea6', '#d6b0bc'], 2) });
  cliffEdges(g, ctx, { depth: 70, mat: rock, capMat: M('#8fcf8a') });
  // el sendero sigue a lo lejos por delante y por detrás (columnas de roca sin casillas)
  for (const sg of [-1, 1]) for (let k = 0; k < 16; k++) { const z = sg * (HALF + 3 + k * 5.5), x = pathX(z), w = 20 - k * 0.3; const b = new THREE.Mesh(new THREE.BoxGeometry(w, 80, 6), rock); b.position.set(x, FY - 40.6, z); b.rotation.y = (rnd(k) - 0.5) * 0.2; g.add(b);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w - 1, 0.6, 6), M('#e9cfa8', { roughness: 0.95 })); top.position.set(x, FY - 0.3, z); g.add(top); if (k % 3 === 1) pine(g, x + (rnd(k + sg) > 0.5 ? 1 : -1) * (w / 2 - 1.5), FY - 0.1, z, 1.2); }
  // paredes del cañón a ambos lados, con pinos arriba y cascadas
  const wallM = M('#b88ea0', { map: strata(['#c79aa8', '#b08498', '#d9b4b0', '#a07a94'], 7) }), grass = M('#9ad48e', { flatShading: true });
  for (const sg of [-1, 1]) for (let k = 0; k < 26; k++) { const z = -260 + k * 21, h = 135 + rnd(k * sg) * 50, x = sg * (62 + rnd(k + 9) * 14) + pathX(z) * 0.4;
    const b = new THREE.Mesh(new THREE.BoxGeometry(26 + rnd(k) * 10, h, 24), wallM); b.position.set(x + sg * 10, FY + 18 - h / 2, z); b.rotation.y = (rnd(k * 3) - 0.5) * 0.4; g.add(b);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(27 + rnd(k) * 10, 1.4, 25), grass); cap.position.set(b.position.x, FY + 18.6, z); cap.rotation.y = b.rotation.y; g.add(cap);
    if (k % 2 === 0) pine(g, x + sg * 4, FY + 19, z + 4, 2.2 + rnd(k) * 1.2); if (k % 3 === 0) pine(g, x + sg * 12, FY + 19, z - 5, 1.8); }
  const wfT = cvTex(64, 256, (x, w, h) => { for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${0.25 + rnd(i) * 0.5})`; x.fillRect(rnd(i + 2) * w, 0, 2 + rnd(i + 5) * 6, h); } }, [1, 3]);
  for (const [sx, z] of [[-1, -40], [1, 30], [-1, 95], [1, -120]]) { const m = new THREE.MeshBasicMaterial({ map: wfT.clone(), color: '#dff4ff', transparent: true, opacity: 0.85, depthWrite: false, fog: true }); m.map.needsUpdate = true;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(7, 130), m); w.position.set(sx * 50 + ctx.pathX(z) * 0.4, FY - 47, z); w.rotation.y = -sx * Math.PI / 2; g.add(w); anim.push(t => { m.map.offset.y = t * 0.9; }); }
  // río al fondo del cañón y bruma entre medias
  const river = new THREE.Mesh(new THREE.PlaneGeometry(130, 700).rotateX(-Math.PI / 2), M('#7fc8e8', { roughness: 0.15, metalness: 0.1, emissive: '#2a6aa0', emissiveIntensity: 0.2 })); river.position.y = FY - 110; g.add(river);
  const ct = cloudTex(); for (const [y, op] of [[-30, 0.45], [-60, 0.6]]) { const mist = new THREE.Mesh(new THREE.PlaneGeometry(200, 700).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ct, transparent: true, opacity: op, depthWrite: false, color: '#fff4fa' })); mist.position.y = FY + y; g.add(mist); anim.push(t => { ct.offset.y = t * 0.006; }); }
  anim.push(birds(g, 9, 55, FY - 10, '#6a4a6a'));
  return { anim, hide: ['sea', 'isl'], fog: [90, 420] }; }

// ---------------------------------------------------------------- 2) CIMA DE LA MONTAÑA (Rey de la cima)
function cima(g, ctx) { const { FY } = ctx, anim = [];
  const rockM = M('#a99aae', { map: strata(['#b4a4b8', '#9e90a8', '#c2b4c0', '#8f8298'], 4), flatShading: true });
  cliffEdges(g, ctx, { depth: 18, mat: rockM, capMat: M('#ffffff', { roughness: 0.5 }) });
  // la montaña: un cono rocoso irregular con nieve en la parte de arriba
  const prof = []; for (let k = 0; k <= 24; k++) { const y = -k * 7.5; prof.push(new THREE.Vector2(27 + Math.pow(k, 1.3) * 4.6, y)); }
  const lg = new THREE.LatheGeometry(prof, 48), pos = lg.attributes.position, col = [];
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x), j = 1 + Math.sin(a * 7 + y * 0.08) * 0.09 + Math.sin(a * 17 - y * 0.2) * 0.05 + (rnd(i) - 0.5) * 0.06;
    pos.setXYZ(i, x * j, y + (rnd(i * 3) - 0.5) * 3, z * j); const snow = y > -40 + Math.sin(a * 5) * 10 ? 1 : 0; const c = snow ? new THREE.Color('#fbf6ff') : new THREE.Color('#9d8ea8').lerp(new THREE.Color('#6f6584'), Math.min(1, -y / 150)); col.push(c.r, c.g, c.b); }
  lg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); lg.computeVertexNormals();
  const mtn = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true })); mtn.position.y = FY - 3; mtn.receiveShadow = true; mtn.userData.keep = true; g.add(mtn);
  // banderitas de oración colgando alrededor de la cumbre (por fuera, sobre la roca)
  const fl = ['#ff8fb8', '#ffcf7a', '#7fd08a', '#6eaef2', '#c487e6'];
  for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, R = ctx.edgeR(a) + 3.5, x = Math.cos(a) * R, z = Math.sin(a) * R;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 22, 6), M('#8a6048')); pole.position.set(x, FY - 6, z); g.add(pole);
    const a2 = (k + 1) / 10 * 6.283, R2 = ctx.edgeR(a2) + 3.5, x2 = Math.cos(a2) * R2, z2 = Math.sin(a2) * R2;
    for (let f = 1; f < 9; f++) { const u = f / 9, fx = x + (x2 - x) * u, fz = z + (z2 - z) * u, fy = FY + 4.8 - Math.sin(u * Math.PI) * 1.6;
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), M(fl[(f + k) % 5], { side: THREE.DoubleSide, roughness: 0.7 })); fm.position.set(fx, fy - 0.55, fz); fm.lookAt(0, fy - 0.55, 0); fm.rotateY(Math.PI / 2); fm.userData.keep = true; g.add(fm); anim.push(t => { fm.rotation.z = Math.sin(t * 4 + f + k) * 0.25; }); } }
  // mar de nubes debajo y otros picos asomando
  const ct = cloudTex(); const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#fff6fb', emissive: '#ffe8f4', emissiveIntensity: 0.35, roughness: 1 })); sea.position.y = FY - 62; g.add(sea);
  const sea2 = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ct, transparent: true, opacity: 0.9, depthWrite: false, color: '#ffe0f0' })); sea2.position.y = FY - 58; g.add(sea2); anim.push(t => { ct.offset.x = t * 0.004; });
  const cm = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff0f8', emissiveIntensity: 0.3, roughness: 1, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 70 + rnd(i) * 230; cloudPuff(g, Math.cos(a) * r, FY - 58 + rnd(i + 4) * 6, Math.sin(a) * r, 6 + rnd(i + 2) * 10, cm); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + rnd(i) * 0.3, r = 170 + rnd(i + 1) * 170, h = 45 + rnd(i + 2) * 45, w = h * 0.8;
    const p = new THREE.Mesh(new THREE.ConeGeometry(w, h, 7, 3), M(['#b8a6c8', '#a9b8d8', '#c6a6c0'][i % 3], { flatShading: true })); p.position.set(Math.cos(a) * r, FY - 62 + h / 2, Math.sin(a) * r); p.rotation.y = i; g.add(p);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.4, h * 0.4, 7, 1), M('#ffffff', { flatShading: true })); cap.position.y = h * 0.3 + 0.2; p.add(cap); }
  anim.push(birds(g, 5, 60, FY + 6, '#4a3a58'));
  return { anim, hide: ['sea', 'isl', 'mount'], fog: [140, 620] }; }

// ---------------------------------------------------------------- 3) ISLA-HUERTO DE FRESAS (Lluvia de fresas)
function huerto(g, ctx) { const { FY } = ctx, anim = [];
  const soil = M('#b07a5a', { map: strata(['#b5805e', '#a06e52', '#c08e68', '#94664c'], 9) });
  cliffEdges(g, ctx, { depth: 9, mat: soil, capMat: M('#8fd47e'), base: false });
  // panza de la isla (cono de tierra) con raíces colgando
  const ig = new THREE.ConeGeometry(48, 46, 14, 5, true); ig.rotateX(Math.PI); const ip = ig.attributes.position; for (let i = 0; i < ip.count; i++) { const j = 1 + (rnd(i) - 0.5) * 0.18; ip.setX(i, ip.getX(i) * j); ip.setZ(i, ip.getZ(i) * j); } ig.computeVertexNormals();
  const belly = new THREE.Mesh(ig, M('#9a6a50', { flatShading: true, side: THREE.DoubleSide })); belly.position.y = FY - 3.4 - 23; g.add(belly);
  const terr = new THREE.Mesh(new THREE.CircleGeometry(48, 28).rotateX(-Math.PI / 2), M('#8fd47e')); terr.position.y = FY - 3.4; g.add(terr); // terraza baja: se ve el desnivel
  for (let i = 0; i < 26; i++) { const a = rnd(i) * 6.283, r = 10 + rnd(i + 1) * 30, L = 6 + rnd(i + 2) * 12; const root = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.45, L, 5), M('#6e4a38')); root.position.set(Math.cos(a) * r, FY - 3.4 - (48 - r) * 0.9 - L / 2, Math.sin(a) * r); root.rotation.z = (rnd(i + 5) - 0.5) * 0.5; g.add(root); }
  // matas de fresas por todo el borde
  const leafM = M('#4fae5a', { flatShading: true }), berryM = new THREE.MeshStandardMaterial({ color: '#ff3d5e', roughness: 0.3, emissive: '#5a0010', emissiveIntensity: 0.15 }), seedM = M('#ffe680');
  const bush = (x, y, z, s) => { const b = new THREE.Group(); b.position.set(x, y, z); b.scale.setScalar(s); g.add(b);
    for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.9, 7, 5), leafM); l.scale.set(1, 0.45, 0.7); l.position.set(Math.cos(k) * 0.7, 0.4, Math.sin(k) * 0.7); l.rotation.y = k; b.add(l); }
    for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 9), berryM); f.rotation.x = Math.PI; f.position.set(Math.cos(k * 2.1) * 0.9, 0.35, Math.sin(k * 2.1) * 0.9); b.add(f); const sd = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 3), seedM); sd.position.set(0.25, 0.1, 0.25); f.add(sd); } };
  for (let i = 0; i < 46; i++) { const a = i / 46 * 6.283, R = Math.min(46, ctx.edgeR(a) + 3 + rnd(i) * 4); bush(Math.cos(a) * R, FY - 3.4, Math.sin(a) * R, 1 + rnd(i + 3) * 0.5); }
  // molino, valla y fresas-globo gigantes flotando
  const mill = new THREE.Group(); mill.position.set(-42, FY - 3.4, -16); g.add(mill); keep(mill); { const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 9, 10), M('#fff1e0')); tw.position.y = 4.5; mill.add(tw); const rf = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.8, 10), M('#ff6f8e')); rf.position.y = 10.4; mill.add(rf);
    const blades = new THREE.Group(); blades.position.set(2.2, 8.5, 0); blades.rotation.y = Math.PI / 2; mill.add(blades); for (let k = 0; k < 4; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 6, 0.15), M('#ffe6ef')); bl.position.y = 3; const h = new THREE.Group(); h.rotation.z = k * Math.PI / 2; h.add(bl); blades.add(h); } anim.push(t => { blades.rotation.z = t * 0.8; }); }
  for (let i = 0; i < 6; i++) { const fb = new THREE.Group(), a = i / 6 * 6.283 + 0.4, r = 62 + (i % 2) * 18; fb.position.set(Math.cos(a) * r, FY + 10 + (i % 3) * 6, Math.sin(a) * r); g.add(fb); keep(fb);
    const body = new THREE.Mesh(new THREE.SphereGeometry(3.4, 18, 14), berryM); body.scale.set(1, 1.2, 1); fb.add(body); const top = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 8), leafM); top.position.y = 4; fb.add(top);
    const bask = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 1, 8), M('#c8945a')); bask.position.y = -6; fb.add(bask); anim.push(t => { fb.position.y = FY + 10 + (i % 3) * 6 + Math.sin(t * 0.7 + i) * 1.5; }); }
  // islitas satélite con huerto
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.9, r = 75; const s = new THREE.Group(); s.position.set(Math.cos(a) * r, FY - 6 + i * 2, Math.sin(a) * r); g.add(s);
    const cg = new THREE.ConeGeometry(7, 10, 9); cg.rotateX(Math.PI); const c = new THREE.Mesh(cg, M('#9a6a50', { flatShading: true })); c.position.y = -5; s.add(c); const top = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 1, 9), M('#9ad884')); s.add(top);
    bush(s.position.x, s.position.y + 0.5, s.position.z, 1.6); bush(s.position.x + 3, s.position.y + 0.5, s.position.z + 2, 1.3); }
  return { anim, hide: ['isl'] }; }

// ---------------------------------------------------------------- 4) PALETA DEL PINTOR (Pinta el suelo)
function paleta(g, ctx) { const { FY } = ctx, anim = [];
  const wood = M('#d9a46a', { map: cvTex(256, 256, (x, w, h) => { x.fillStyle = '#d9a46a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(140,80,40,${0.15 + rnd(i) * 0.2})`; x.lineWidth = 1 + rnd(i + 1) * 3; x.beginPath(); x.moveTo(0, rnd(i) * h); x.bezierCurveTo(w * 0.3, rnd(i + 2) * h, w * 0.6, rnd(i + 3) * h, w, rnd(i + 4) * h); x.stroke(); } }) });
  cliffEdges(g, ctx, { depth: 4, mat: wood, base: true });
  // manchas de pintura chorreando por el canto de la paleta
  const PC = ['#ff5f8f', '#ffb13d', '#ffe14d', '#5fd68a', '#4fb8ff', '#9a6bff'];
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, R = ctx.edgeR(a) + 0.9, x = Math.cos(a) * R, z = Math.sin(a) * R, c = PC[i % 6];
    const blob = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.15 })); blob.scale.set(1.3, 0.35, 1); blob.position.set(x, FY - 0.1, z); g.add(blob);
    const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 2 + rnd(i) * 3, 4, 8), blob.material); drip.position.set(x * 1.02, FY - 2.5, z * 1.02); g.add(drip); }
  // pinceles y tubos gigantes flotando, caballete con lienzo y arcoíris
  for (let i = 0; i < 5; i++) { const b = new THREE.Group(), a = i / 5 * 6.283 + 0.3, r = 60 + (i % 2) * 14; b.position.set(Math.cos(a) * r, FY + 8 + (i % 3) * 4, Math.sin(a) * r); g.add(b); keep(b);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 16, 10), M(PC[(i + 2) % 6], { roughness: 0.3 })); b.add(h); const fe = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.4, 10), M('#d8dce8', { metalness: 0.8, roughness: 0.25 })); fe.position.y = 9.2; b.add(fe);
    const br = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.6, 10), M(PC[i % 6], { roughness: 0.4 })); br.position.y = 12.2; b.add(br); b.rotation.z = 0.5 + i * 0.3; anim.push(t => { b.rotation.x = Math.sin(t * 0.5 + i) * 0.3; b.position.y = FY + 8 + (i % 3) * 4 + Math.sin(t * 0.8 + i) * 1.2; }); }
  for (let i = 0; i < 6; i++) { const tb = new THREE.Group(), a = i / 6 * 6.283 + 0.8, r = 52 + (i % 3) * 10; tb.position.set(Math.cos(a) * r, FY - 4 + (i % 2) * 5, Math.sin(a) * r); g.add(tb); keep(tb);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6, 14), M('#f4f4fa', { metalness: 0.5, roughness: 0.3 })); tb.add(body); const lab = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 3, 14), M(PC[i], { roughness: 0.4 })); tb.add(lab);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 10), M('#3a3a4a')); cap.position.y = 3.6; tb.add(cap); const pz = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), new THREE.MeshStandardMaterial({ color: PC[i], roughness: 0.1 })); pz.position.y = 4.8; pz.scale.y = 0.7; tb.add(pz);
    tb.rotation.set(rnd(i) * 1.2, i, 0.7); anim.push(t => { tb.rotation.y = i + t * 0.25; }); }
  { const e = new THREE.Group(); e.position.set(0, FY - 30, -95); g.add(e); const lm = M('#a0683e'); for (const [x, r] of [[-9, 0.12], [9, -0.12]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 60, 1.2), lm); l.position.set(x, 30, 0); l.rotation.z = r; e.add(l); }
    const art = cvTex(512, 384, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd0ff'); gr.addColorStop(1, '#ffd6ea'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#ffe14d'; x.beginPath(); x.arc(400, 90, 46, 0, 7); x.fill();
      x.fillStyle = '#7fd08a'; x.beginPath(); x.moveTo(0, 300); x.quadraticCurveTo(160, 200, 300, 290); x.quadraticCurveTo(420, 230, 512, 280); x.lineTo(512, 384); x.lineTo(0, 384); x.fill(); x.fillStyle = '#ff9cc8'; x.beginPath(); x.arc(200, 290, 40, Math.PI, 0); x.fill(); x.fillStyle = '#5a3d6a'; x.fillRect(184, 276, 6, 6); x.fillRect(210, 276, 6, 6); });
    const cnv = new THREE.Mesh(new THREE.BoxGeometry(34, 26, 1.2), [M('#fff'), M('#fff'), M('#fff'), M('#fff'), new THREE.MeshStandardMaterial({ map: art, roughness: 0.9 }), M('#fff')]); cnv.position.set(0, 48, 1.5); e.add(cnv); const sh = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 3), lm); sh.position.set(0, 34.5, 1.5); e.add(sh); }
  for (let k = 0; k < 6; k++) { const arc = new THREE.Mesh(new THREE.TorusGeometry(120 - k * 3, 1.6, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: ['#ff5f8f', '#ffb13d', '#ffe14d', '#5fd68a', '#4fb8ff', '#9a6bff'][k], transparent: true, opacity: 0.55, fog: false })); arc.position.set(0, FY - 40, -230); g.add(arc); }
  // salpicaduras de color en el mar
  for (let i = 0; i < 12; i++) { const a = rnd(i) * 6.283, r = 50 + rnd(i + 1) * 90; const s = new THREE.Mesh(new THREE.CircleGeometry(4 + rnd(i + 2) * 6, 18).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: PC[i % 6], roughness: 0.2, transparent: true, opacity: 0.7 })); s.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r); g.add(s); }
  return { anim, hide: ['isl'] }; }

// ---------------------------------------------------------------- 5) CIELO AL REVÉS (Mundo al revés)
function reves(g, ctx) { const { FY } = ctx, anim = [];
  const crystal = M('#8f7ad8', { map: strata(['#9a86e0', '#7e6cc8', '#b2a0ee', '#6f5fb8'], 13), emissive: '#3a2a7a', emissiveIntensity: 0.25 });
  cliffEdges(g, ctx, { depth: 30, mat: crystal, capMat: M('#c9b8ff', { emissive: '#8f7ad8', emissiveIntensity: 0.4 }) });
  // islas colgando boca abajo del cielo, con árboles hacia abajo y cascadas que suben
  const wfT = cvTex(64, 256, (x, w, h) => { for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(220,240,255,${0.25 + rnd(i) * 0.5})`; x.fillRect(rnd(i + 2) * w, 0, 2 + rnd(i + 5) * 6, h); } }, [1, 2]);
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + 0.2, r = 70 + (i % 3) * 22, s = new THREE.Group(); s.position.set(Math.cos(a) * r, FY + 34 + (i % 3) * 8, Math.sin(a) * r); g.add(s); keep(s); const R = 8 + (i % 3) * 3;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2, 12), M('#9ad884')); s.add(top); const cg = new THREE.ConeGeometry(R, R * 1.5, 12); const c = new THREE.Mesh(cg, M('#a0785a', { flatShading: true })); c.position.y = 2 + R * 0.75; s.add(c);
    for (let k = 0; k < 3; k++) { const tr = new THREE.Group(); s.add(tr); tr.rotation.x = Math.PI; tr.position.set((k - 1) * R * 0.45, -1, (k % 2 - 0.5) * R * 0.5); const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 6), M('#7a5040')); t1.position.y = 1.5; tr.add(t1);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), M(['#ff9cc8', '#7ee3c4', '#ffcf7a'][k], { flatShading: true })); crown.position.y = 4; tr.add(crown); }
    if (i % 2 === 0) { const m = new THREE.MeshBasicMaterial({ map: wfT.clone(), transparent: true, opacity: 0.75, depthWrite: false, color: '#cfe8ff' }); m.map.needsUpdate = true; const w = new THREE.Mesh(new THREE.PlaneGeometry(3, 40), m); w.position.set(R * 0.7, -21, 0); w.rotation.y = Math.PI / 2; s.add(w); anim.push(t => { m.map.offset.y = -t * 0.8; }); }
    anim.push(t => { s.rotation.y = t * 0.05 + i; s.position.y = FY + 34 + (i % 3) * 8 + Math.sin(t * 0.6 + i) * 1.4; }); }
  // rocas y cristales que flotan hacia arriba, estrellas y aurora
  const rocks = []; for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.8 + rnd(i) * 1.6, 0), M(['#b2a0ee', '#ff9cc8', '#7ee3c4'][i % 3], { flatShading: true, emissive: '#5a3aa0', emissiveIntensity: 0.25 })); const a = rnd(i + 1) * 6.283, r = 48 + rnd(i + 2) * 40; m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); m.userData.keep = true; g.add(m); rocks.push([m, rnd(i + 3) * 70, 2 + rnd(i) * 3]); }
  anim.push(t => { for (const [m, o, sp] of rocks) { m.position.y = FY - 40 + ((t * sp + o) % 90); m.rotation.set(t * 0.4 + o, t * 0.3, 0); } });
  const stG = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 400; i++) { const a = rnd(i) * 6.283, e = rnd(i + 7) * 1.2 + 0.15, r = 500; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); } stG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(stG, new THREE.PointsMaterial({ color: '#ffffff', size: 3, fog: false, transparent: true, opacity: 0.9 })); g.add(stars); anim.push(t => { stars.material.opacity = 0.7 + Math.sin(t * 2) * 0.2; });
  const aur = new THREE.Mesh(new THREE.CylinderGeometry(420, 420, 120, 64, 1, true), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uT; varying vec2 vU; void main(){ float w = sin(vU.x*40.0+uT*0.6)*0.5+0.5; float band = smoothstep(0.0,0.5,vU.y)*smoothstep(1.0,0.5,vU.y); vec3 c = mix(vec3(0.5,1.0,0.8), vec3(0.9,0.5,1.0), w); gl_FragColor = vec4(c, band*0.35*(0.6+0.4*sin(vU.x*13.0-uT))); }' }));
  aur.position.y = FY + 120; g.add(aur); anim.push(t => { aur.material.uniforms.uT.value = t; });
  return { anim, hide: ['isl'], sky: ['#3b2a7a', '#8a6ad0', '#f0b0e0'] }; }

const BUILD = { acantilado, cima, huerto, paleta, reves };
export function createEscenarios(scene, ctx) {
  const cache = {}; let cur = null, saved = null;
  return {
    show(id, world) { this.hide(world); if (!BUILD[id]) return; let E = cache[id];
      if (!E) { const g = new THREE.Group(); g.name = 'esc-' + id; const hole = ctx.holeOf(id), edgeR = a => { let r = 0; while (r < 70 && !hole(Math.cos(a) * r, Math.sin(a) * r)) r += 0.5; return r; }; const r = BUILD[id](g, { ...ctx, hole, edgeR }); if (ctx.mergeInto) try { ctx.mergeInto(g); } catch (e) { } E = cache[id] = { g, ...r }; scene.add(g); }
      E.g.visible = true; cur = E;
      saved = { fog: scene.fog ? [scene.fog.near, scene.fog.far] : null };
      for (const k of E.hide || []) { const o = k === 'sea' ? world.seaMesh : k === 'mount' ? world.mount : null; if (o) o.visible = false; if (k === 'isl') world.isl.forEach(i => i.visible = false); }
      if (E.fog && scene.fog) { scene.fog.near = E.fog[0]; scene.fog.far = E.fog[1]; } },
    hide(world) { if (!cur) return; cur.g.visible = false; if (world.seaMesh) world.seaMesh.visible = true; if (world.mount) world.mount.visible = true; world.isl.forEach(i => i.visible = true);
      if (saved && saved.fog && scene.fog) { scene.fog.near = saved.fog[0]; scene.fog.far = saved.fog[1]; } cur = null; },
    update(t) { if (cur && cur.anim) for (const f of cur.anim) f(t); },
    get current() { return cur; },
  };
}
