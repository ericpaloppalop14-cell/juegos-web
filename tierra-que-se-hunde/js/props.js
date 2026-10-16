// ======================================================================
//  v9: piezas centrales detalladas de cada escenario (geometría procedural,
//  sin imágenes). Las partes estáticas se fusionan (mergeInto) y las repetidas
//  van instanciadas para no disparar los draw calls.
// ======================================================================
import * as THREE from 'three';
const V2 = (x, y) => new THREE.Vector2(x, y);
const lathe = (pts, seg = 32) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => V2(Math.max(0.001, r), y)), seg); g.computeVertexNormals(); return g; };
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), Pv = new THREE.Vector3();
const mat4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
export function inst(geo, mat, mats, cols) {
  const im = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m));
  if (cols) cols.forEach((c, i) => im.setColorAt(i, new THREE.Color(c)));
  im.userData.keep = true; return im; }
const add = (parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); parent.add(m); return m; };
// textura de rayas nítida (procedural) para carpas
function stripeTex(c1, c2, n = 16, trim = '#e8b84a') { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const x = cv.getContext('2d');
  for (let k = 0; k < n; k++) { const g = x.createLinearGradient(k * 1024 / n, 0, (k + 1) * 1024 / n, 0); const c = k % 2 ? c2 : c1; g.addColorStop(0, c); g.addColorStop(0.5, new THREE.Color(c).lerp(new THREE.Color('#ffffff'), 0.18).getStyle()); g.addColorStop(1, c); x.fillStyle = g; x.fillRect(k * 1024 / n, 0, 1024 / n + 1, 256); }
  x.fillStyle = trim; for (let k = 0; k <= n; k++) x.fillRect(k * 1024 / n - 2, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// bombillas cálidas instanciadas alrededor de un aro
function bulbRing(parent, r, y, n, mat, size = 0.26) { const g = new THREE.SphereGeometry(size, 10, 8), ms = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ms.push(mat4(Math.cos(a) * r, y, Math.sin(a) * r)); } const im = inst(g, mat, ms); parent.add(im); return im; }

// ---------------------------------------------------------------- TIOVIVO
export function buildCarousel({ P, glowM, NUMCOL, mergeInto }) {
  const car = new THREE.Group(), anims = [];
  const gold = P('#e9b949', { metalness: 0.55, roughness: 0.28 }), cream = P('#fff3f8', { roughness: 0.4 }), bulbM = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffd98a', emissiveIntensity: 0.9, roughness: 0.3 });
  // --- plataforma (estática)
  const plat = new THREE.Group(); car.add(plat);
  add(plat, lathe([[0, 0], [9, 0], [9, 0.25], [8.78, 0.42], [8.78, 1.32], [8.66, 1.5], [8.45, 1.6], [0, 1.6]], 64), cream);
  { const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const x = cv.getContext('2d'); x.translate(512, 512);
    for (let k = 0; k < 24; k++) { x.fillStyle = k % 2 ? '#fff6ea' : '#ffd9e8'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 512, k / 24 * Math.PI * 2, (k + 1) / 24 * Math.PI * 2); x.fill(); }
    x.strokeStyle = '#e9b949'; for (const [r, w] of [[500, 10], [470, 4], [250, 6], [160, 4]]) { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    add(plat, new THREE.CircleGeometry(8.45, 64), new THREE.MeshStandardMaterial({ map: t, roughness: 0.45 }), 0, 1.605, 0, -Math.PI / 2); }
  add(plat, new THREE.TorusGeometry(8.6, 0.12, 8, 96), gold, 0, 1.56, 0, Math.PI / 2);
  add(plat, new THREE.TorusGeometry(9.0, 0.1, 8, 96), gold, 0, 0.27, 0, Math.PI / 2);
  // paneles arqueados del zócalo (instanciados, colores alternos) + bombillas entre ellos
  { const sh = new THREE.Shape(); sh.moveTo(-0.75, -0.35); sh.lineTo(0.75, -0.35); sh.lineTo(0.75, 0.15); sh.absarc(0, 0.15, 0.75, 0, Math.PI, false); sh.lineTo(-0.75, -0.35);
    const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 10 }); pg.scale(0.95, 0.62, 1);
    const ms = [], cs = []; for (let i = 0; i < 24; i++) { const a = (i + 0.5) / 24 * Math.PI * 2; ms.push(mat4(Math.cos(a) * 8.8, 0.82, Math.sin(a) * 8.8, 0, Math.PI / 2 - a, 0)); cs.push(NUMCOL[[1, 7, 5, 3][i % 4]]); }
    plat.add(inst(pg, P('#ffffff', { roughness: 0.3 }), ms, cs));
    bulbRing(plat, 8.84, 0.9, 24, bulbM, 0.13); }
  // barandilla torneada: balaustres + pasamanos dobles
  { const bal = lathe([[0.09, 0], [0.13, 0.06], [0.07, 0.16], [0.06, 0.45], [0.12, 0.6], [0.06, 0.74], [0.06, 0.9], [0.1, 0.95], [0.001, 1.0]], 10);
    const ms = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; ms.push(mat4(Math.cos(a) * 8.35, 1.6, Math.sin(a) * 8.35)); } plat.add(inst(bal, gold, ms));
    add(plat, new THREE.TorusGeometry(8.35, 0.075, 8, 96), gold, 0, 2.58, 0, Math.PI / 2);
    add(plat, new THREE.TorusGeometry(8.35, 0.045, 6, 96), gold, 0, 2.05, 0, Math.PI / 2); }
  // --- parte giratoria
  const spin = new THREE.Group(); car.add(spin);
  const st = new THREE.Group(); spin.add(st);
  // tambor central con espejos y molduras
  add(st, lathe([[2.5, 1.6], [2.5, 1.9], [2.25, 2.05], [2.25, 5.6], [2.55, 5.8], [2.55, 6.15], [1.1, 6.4], [0.001, 6.4]], 40), cream);
  for (const y of [2.05, 5.6]) add(st, new THREE.TorusGeometry(2.27, 0.08, 6, 48), gold, 0, y, 0, Math.PI / 2);
  { const ms = [], fr = []; for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; ms.push(mat4(Math.cos(a) * 2.24, 3.8, Math.sin(a) * 2.24, 0, Math.PI / 2 - a, 0)); fr.push(mat4(Math.cos(a) * 2.22, 3.8, Math.sin(a) * 2.22, 0, Math.PI / 2 - a, 0)); }
    st.add(inst(new THREE.BoxGeometry(1.2, 2.6, 0.08), new THREE.MeshStandardMaterial({ color: '#e6eeff', metalness: 0.85, roughness: 0.12 }), ms));
    st.add(inst(new THREE.BoxGeometry(1.42, 2.82, 0.06), gold, fr)); }
  // mástil dorado con anillos
  add(st, new THREE.CylinderGeometry(0.75, 0.85, 8.4, 24), P('#ffe7a8', { metalness: 0.35, roughness: 0.3 }), 0, 10.4, 0);
  { const ms = []; for (let k = 0; k < 6; k++) ms.push(mat4(0, 7 + k * 1.3, 0, Math.PI / 2)); st.add(inst(new THREE.TorusGeometry(0.82, 0.09, 8, 28), gold, ms)); }
  // aro superior con radios
  add(st, new THREE.TorusGeometry(7.0, 0.18, 10, 72), gold, 0, 13.6, 0, Math.PI / 2);
  { const ms = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ms.push(mat4(Math.cos(a) * 3.9, 13.7, Math.sin(a) * 3.9, 0, -a, 0)); } st.add(inst(new THREE.BoxGeometry(6.4, 0.22, 0.22), gold, ms)); }
  // barras de los caballitos (fijas) con anillos tipo «barley»
  const R = 6.3;
  { const ms = [], rs = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ms.push(mat4(Math.cos(a) * R, 7.6, Math.sin(a) * R)); for (let j = 0; j < 7; j++) rs.push(mat4(Math.cos(a) * R, 2.4 + j * 1.6, Math.sin(a) * R, Math.PI / 2)); }
    st.add(inst(new THREE.CylinderGeometry(0.11, 0.11, 12, 10), gold, ms)); st.add(inst(new THREE.TorusGeometry(0.15, 0.05, 6, 14), gold, rs)); }
  // carpa con rayas, borde dorado, festón y bombillas
  const roofM = new THREE.MeshStandardMaterial({ map: stripeTex('#ff9cc0', '#fff6ee', 16), side: THREE.DoubleSide, roughness: 0.55 });
  add(st, new THREE.ConeGeometry(10.5, 5, 64, 1, true), roofM, 0, 16.5, 0);
  add(st, new THREE.TorusGeometry(10.5, 0.24, 10, 96), gold, 0, 14.0, 0, Math.PI / 2);
  { const sg = new THREE.CircleGeometry(0.66, 14, Math.PI, Math.PI), ms = [], cs = []; for (let i = 0; i < 48; i++) { const a = (i + 0.5) / 48 * Math.PI * 2; ms.push(mat4(Math.cos(a) * 10.56, 13.92, Math.sin(a) * 10.56, 0, Math.PI / 2 - a, 0)); cs.push(i % 2 ? '#ffffff' : NUMCOL[1]); }
    st.add(inst(sg, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.5 }), ms, cs)); }
  bulbRing(st, 10.62, 13.15, 48, bulbM, 0.15);
  { const ms = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; for (let j = 1; j <= 3; j++) { const f = j / 4; ms.push(mat4(Math.cos(a) * 10.5 * (1 - f) * 1.01, 14 + 5 * f + 0.05, Math.sin(a) * 10.5 * (1 - f) * 1.01)); } }
    st.add(inst(new THREE.SphereGeometry(0.16, 8, 6), bulbM, ms)); }
  // corona y remate
  add(st, lathe([[1.9, 18.6], [1.9, 19.0], [1.5, 19.2], [1.5, 19.9], [1.8, 20.1], [0.5, 20.4], [0.001, 20.4]], 32), gold);
  add(st, new THREE.SphereGeometry(0.55, 16, 12), gold, 0, 20.9, 0);
  add(st, new THREE.ConeGeometry(0.22, 1.6, 12), gold, 0, 22.1, 0);
  { const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1.3, -0.35, 0, 0, -0.7, 0], 3)); fg.computeVertexNormals(); add(st, fg, P(NUMCOL[1], { side: THREE.DoubleSide }), 0.1, 22.7, 0); }
  bulbRing(st, 1.95, 18.8, 16, bulbM, 0.12);
  mergeInto(plat); mergeInto(st);
  // --- caballitos con forma real (plantilla fusionada → instancias)
  const horses = horseInstances(P, gold, NUMCOL, mergeInto); spin.add(horses.group);
  anims.push(t => { spin.rotation.y = t * 0.35; horses.update(t, R); });
  return { group: car, anims };
}

function horseTemplate(P, gold) {
  const h = new THREE.Group();
  const bodyM = P('#ffffff', { roughness: 0.32 }), maneM = P('#fefefe', { roughness: 0.4 }), darkM = P('#2e1a36', { roughness: 0.2 }), pinkM = P('#ffb3c8', { roughness: 0.5 });
  const sph = new THREE.SphereGeometry(1, 12, 9), cyl = (a, b, l, s = 10) => new THREE.CylinderGeometry(a, b, l, s);
  // cuerpo: tronco + pecho + grupa
  add(h, new THREE.CapsuleGeometry(0.74, 1.7, 6, 14), bodyM, 0, 0, 0, Math.PI / 2, 0, 0, 1, 1, 1.02);
  add(h, sph, bodyM, 0, 0.12, 0.88, 0, 0, 0, 0.78, 0.84, 0.86);
  add(h, sph, bodyM, 0, 0.12, -0.92, 0, 0, 0, 0.8, 0.82, 0.82);
  // cuello y cabeza
  add(h, cyl(0.38, 0.58, 1.55, 16), bodyM, 0, 0.98, 1.32, 0.55);
  add(h, new THREE.CapsuleGeometry(0.34, 0.78, 5, 12), bodyM, 0, 1.72, 1.98, 1.95);
  add(h, sph, bodyM, 0, 1.47, 2.42, 0, 0, 0, 0.3, 0.28, 0.34);
  add(h, sph, pinkM, 0, 1.42, 2.66, 0, 0, 0, 0.2, 0.14, 0.1);
  for (const s of [-1, 1]) {
    add(h, new THREE.ConeGeometry(0.1, 0.36, 10), bodyM, s * 0.16, 2.16, 1.76, -0.25, 0, s * -0.2);
    add(h, sph, darkM, s * 0.27, 1.84, 2.08, 0, 0, 0, 0.075, 0.09, 0.07);
    add(h, sph, new THREE.MeshBasicMaterial({ color: '#ffffff' }), s * 0.3, 1.87, 2.13, 0, 0, 0, 0.025);
    add(h, sph, darkM, s * 0.11, 1.4, 2.73, 0, 0, 0, 0.035);
  }
  add(h, new THREE.TorusGeometry(0.33, 0.045, 8, 24), gold, 0, 1.5, 2.36, 0.35);
  add(h, new THREE.TorusGeometry(0.42, 0.035, 6, 24), gold, 0, 1.86, 1.86, 1.2);
  // crines (ondas) y flequillo
  for (let i = 0; i < 8; i++) { const f = i / 7; add(h, sph, maneM, 0, 2.05 - f * 1.05, 1.78 - f * 0.9, 0.5, 0, 0, 0.17, 0.3 - f * 0.04, 0.26); }
  add(h, sph, maneM, 0, 2.08, 2.02, 0.6, 0, 0, 0.16, 0.24, 0.18);
  // cola en mechones
  for (const [rx, rz, l] of [[-2.3, 0, 1.0], [-2.55, 0.25, 0.85], [-2.55, -0.25, 0.85]]) { const c = add(h, new THREE.CapsuleGeometry(0.15, l, 4, 8), maneM, 0, 0.05, -1.95, rx, 0, rz); c.position.y -= Math.cos(rx) * l * 0.4; c.position.z += Math.sin(rx) * l * 0.4; }
  // patas: delanteras al galope (dobladas), traseras estiradas, cascos dorados
  for (const s of [-1, 1]) {
    add(h, cyl(0.17, 0.2, 0.9), bodyM, s * 0.38, -0.55, 1.05, -0.7); add(h, cyl(0.13, 0.16, 0.8), bodyM, s * 0.38, -0.98, 1.6, 0.95);
    add(h, cyl(0.15, 0.15, 0.14), gold, s * 0.38, -1.22, 1.92, 0.95);
    add(h, cyl(0.19, 0.24, 1.0), bodyM, s * 0.4, -0.78, -1.05, 0.28); add(h, cyl(0.13, 0.17, 0.85), bodyM, s * 0.4, -1.55, -1.3, -0.12);
    add(h, cyl(0.15, 0.16, 0.15), gold, s * 0.4, -2.0, -1.25, -0.12);
  }
  // silla de montar, manta con ribete y estribos
  add(h, new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), maneM, 0, 0.62, -0.1, 0, 0, 0, 0.62, 0.22, 0.7);
  add(h, cyl(0.12, 0.08, 0.32), maneM, 0, 0.86, 0.48, -0.25);
  add(h, new THREE.CylinderGeometry(0.79, 0.79, 1.25, 24, 1, true, -1.25, 2.5), maneM, 0, 0.02, -0.1, Math.PI / 2, 0, 0, 1.02, 1, 1.02).material = maneM;
  add(h, new THREE.TorusGeometry(0.8, 0.04, 6, 32, 2.5), gold, 0, 0.02, 0.53, 0, 0, Math.PI / 2 - 1.25);
  add(h, new THREE.TorusGeometry(0.8, 0.04, 6, 32, 2.5), gold, 0, 0.02, -0.73, 0, 0, Math.PI / 2 - 1.25);
  for (const s of [-1, 1]) { add(h, cyl(0.02, 0.02, 0.7, 6), gold, s * 0.78, -0.3, -0.1); add(h, new THREE.TorusGeometry(0.1, 0.03, 6, 14), gold, s * 0.78, -0.7, -0.1, 0, Math.PI / 2); }
  // collarín de la barra
  for (const y of [0.85, -0.7]) add(h, new THREE.TorusGeometry(0.17, 0.06, 6, 14), gold, 0, y, 0, Math.PI / 2);
  return { h, bodyM, maneM };
}
function horseInstances(P, gold, NUMCOL, mergeInto) {
  const { h, bodyM, maneM } = horseTemplate(P, gold); mergeInto(h);
  const group = new THREE.Group(), ims = [], n = 8;
  const bodyCols = ['#fffaf4', '#fff0f6', '#f3f0ff', '#fffaf4', '#eefbf6', '#fff0f6', '#fffaf4', '#f3f0ff'];
  const maneCols = [NUMCOL[1], NUMCOL[8], NUMCOL[6], NUMCOL[2], NUMCOL[5], NUMCOL[7], NUMCOL[9], NUMCOL[3]];
  for (const m of h.children) { if (!m.isMesh) continue; const im = new THREE.InstancedMesh(m.geometry, m.material, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false;
    if (m.material === bodyM) for (let k = 0; k < n; k++) im.setColorAt(k, new THREE.Color(bodyCols[k]));
    if (m.material === maneM) for (let k = 0; k < n; k++) im.setColorAt(k, new THREE.Color(maneCols[k]));
    group.add(im); ims.push(im); }
  const e = new THREE.Euler(0, 0, 0, 'YXZ');
  return { group, update(t, R) { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, ph = t * 2 + k;
    e.set(Math.sin(ph) * 0.12, Math.PI - a, 0); Q.setFromEuler(e); Pv.set(Math.cos(a) * R, 4.7 + Math.sin(ph) * 0.9, Math.sin(a) * R); S.set(1, 1, 1); M4.compose(Pv, Q, S);
    for (const im of ims) im.setMatrixAt(k, M4); }
    for (const im of ims) im.instanceMatrix.needsUpdate = true; } };
}

// ---------------------------------------------------------------- MERIENDA (tetera + tazas)
const tube = (pts, r, seg = 40) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, 14, false);
function dotsOn(profile, rows, perRow, off = 0.02, sz = 0.18) { // puntitos repartidos sobre una superficie de revolución
  const ms = []; const rAt = y => { for (let i = 1; i < profile.length; i++) { const [r0, y0] = profile[i - 1], [r1, y1] = profile[i]; if ((y - y0) * (y - y1) <= 0 && y1 !== y0) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return profile[0][0]; };
  rows.forEach((y, j) => { const r = rAt(y) + off; for (let i = 0; i < perRow; i++) { const a = (i + (j % 2) * 0.5) / perRow * Math.PI * 2; ms.push(mat4(Math.cos(a) * r, y, Math.sin(a) * r, 0, Math.PI / 2 - a, 0, sz, sz, sz * 0.35)); } }); return ms; }
export function buildTeapot({ P }) {
  const g = new THREE.Group(), anims = [], gold = P('#e9b949', { metalness: 0.55, roughness: 0.28 });
  const prof = [[0.001, 0], [1.6, 0], [1.75, 0.15], [1.7, 0.32], [2.3, 0.9], [2.6, 1.8], [2.5, 2.6], [2.1, 3.2], [1.5, 3.5], [1.45, 3.6], [0.001, 3.6]];
  const body = P('#ffd98a', { roughness: 0.22 });
  add(g, lathe(prof, 48), body);
  add(g, lathe([[1.55, 3.55], [1.62, 3.66], [1.3, 3.95], [0.7, 4.2], [0.3, 4.3], [0.001, 4.32]], 40), P('#ff9cc0', { roughness: 0.25 }));
  add(g, new THREE.SphereGeometry(0.45, 18, 14), P('#ff9cc0', { roughness: 0.25 }), 0, 4.7, 0);
  for (const [r, y, tb] of [[1.72, 0.3, 0.07], [1.5, 3.55, 0.07], [0.32, 4.33, 0.06]]) add(g, new THREE.TorusGeometry(r, tb, 8, 48), gold, 0, y, 0, Math.PI / 2);
  add(g, tube([[2.2, 1.3, 0], [3.2, 1.9, 0], [3.7, 3.0, 0], [4.15, 3.75, 0]], 0.34), body);
  add(g, new THREE.TorusGeometry(0.34, 0.07, 8, 20), gold, 4.15, 3.75, 0, Math.PI / 2, 0.55, 0);
  add(g, tube([[-2.35, 3.0, 0], [-3.35, 2.95, 0], [-3.65, 1.9, 0], [-2.55, 1.05, 0]], 0.26), body);
  g.add(inst(new THREE.SphereGeometry(1, 12, 8), P('#ffffff', { roughness: 0.3 }), dotsOn(prof, [1.15, 1.85, 2.55], 11, 0.0, 0.22)));
  // vapor suave
  const steamM = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, roughness: 1, depthWrite: false }), puffs = [];
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), steamM.clone()); p.userData.keep = true; g.add(p); puffs.push(p); }
  anims.push(t => puffs.forEach((p, i) => { const f = (t * 0.35 + i / 4) % 1; p.position.set(4.3 + f * 0.6, 4.0 + f * 2.4, Math.sin(f * 6 + i) * 0.3); p.scale.setScalar(0.6 + f * 1.4); p.material.opacity = 0.5 * Math.sin(f * Math.PI); }));
  return { group: g, anims };
}
export function buildCup(c, { P }) {
  const g = new THREE.Group(), gold = P('#e9b949', { metalness: 0.55, roughness: 0.28 }), cm = P(c, { roughness: 0.22 });
  const outer = [[2.4, 0.3], [2.7, 0.6], [3.3, 1.6], [3.55, 2.9], [3.6, 3.3]];
  add(g, lathe([[0.001, 0.3], ...outer, [3.5, 3.38], [3.32, 3.0], [3.08, 1.8], [2.5, 0.95], [0.001, 0.9]], 48), cm);
  add(g, new THREE.CircleGeometry(3.3, 48), P('#c98a5a', { roughness: 0.08 }), 0, 2.8, 0, -Math.PI / 2);
  add(g, lathe([[0.001, 0], [3.8, 0], [4.6, 0.3], [4.72, 0.46], [4.55, 0.44], [3.9, 0.27], [2.6, 0.33], [0.001, 0.33]], 48), P('#ffffff', { roughness: 0.25 }));
  add(g, new THREE.TorusGeometry(3.56, 0.07, 8, 64), gold, 0, 3.33, 0, Math.PI / 2);
  add(g, new THREE.TorusGeometry(4.66, 0.05, 6, 64), gold, 0, 0.44, 0, Math.PI / 2);
  add(g, tube([[3.35, 2.6, 0], [4.55, 2.65, 0], [4.7, 1.5, 0], [3.0, 1.05, 0]], 0.3), cm);
  g.add(inst(new THREE.SphereGeometry(1, 12, 8), P('#ffffff', { roughness: 0.3 }), dotsOn(outer, [1.5, 2.25], 12, 0.0, 0.2)));
  return g;
}

// ---------------------------------------------------------------- RELOJ
function clockFaceTex() { const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const x = cv.getContext('2d'); x.translate(512, 512);
  const g = x.createRadialGradient(-120, -160, 40, 0, 0, 512); g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#ffeccc'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 512, 0, 7); x.fill();
  x.strokeStyle = '#d9a640'; x.lineWidth = 14; x.beginPath(); x.arc(0, 0, 490, 0, 7); x.stroke(); x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 330, 0, 7); x.stroke();
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, big = i % 5 === 0; x.save(); x.rotate(a); x.fillStyle = big ? '#6b3fa0' : '#b494d6'; x.fillRect(-(big ? 7 : 3), -470, big ? 14 : 6, big ? 46 : 22); x.restore(); }
  x.fillStyle = '#6b3fa0'; x.font = '700 110px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let k = 1; k <= 12; k++) { const a = k / 12 * Math.PI * 2; x.fillText(String(k), Math.sin(a) * 365, -Math.cos(a) * 365 + 6); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
export function buildClockCenter({ P }) {
  const g = new THREE.Group(), gold = P('#e9b949', { metalness: 0.55, roughness: 0.28 });
  add(g, lathe([[2.65, 0], [2.65, 0.3], [2.35, 0.48], [2.3, 0.6], [2.3, 1.55], [2.45, 1.65], [2.62, 1.8], [2.62, 2.15], [0.001, 2.15]], 48), P('#ffcf7a', { metalness: 0.25, roughness: 0.3 }));
  add(g, new THREE.CircleGeometry(2.38, 64), new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.35 }), 0, 2.16, 0, -Math.PI / 2, 0, Math.PI);
  add(g, new THREE.TorusGeometry(2.45, 0.13, 10, 72), gold, 0, 2.17, 0, Math.PI / 2);
  add(g, new THREE.TorusGeometry(2.33, 0.06, 6, 72), gold, 0, 0.55, 0, Math.PI / 2);
  { const ms = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ms.push(mat4(Math.cos(a) * 2.32, 1.08, Math.sin(a) * 2.32, 0, Math.PI / 2 - a, 0)); } g.add(inst(new THREE.CapsuleGeometry(0.09, 0.6, 4, 10), gold, ms)); }
  add(g, new THREE.SphereGeometry(0.42, 18, 14), gold, 0, 2.35, 0);
  return g;
}
// aguja con forma de pica, ribete y remaches dorados (misma longitud que antes)
export function buildClockHand(L, w, color, { P }) {
  const g = new THREE.Group(), gold = P('#e9b949', { metalness: 0.55, roughness: 0.28 });
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w * 0.32, L - 1.2); sh.quadraticCurveTo(w * 1.1, L - 0.9, w * 0.9, L + 0.2); sh.quadraticCurveTo(w * 0.5, L + 1.2, 0, L + 2.2); sh.quadraticCurveTo(-w * 0.5, L + 1.2, -w * 0.9, L + 0.2); sh.quadraticCurveTo(-w * 1.1, L - 0.9, -w * 0.32, L - 1.2); sh.lineTo(-w / 2, 0);
  const hole = new THREE.Path(); hole.absarc(0, L * 0.6, w * 0.24, 0, Math.PI * 2, true); sh.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, curveSegments: 16 }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.3, 0);
  add(g, geo, P(color, { roughness: 0.25, metalness: 0.15 }));
  add(g, new THREE.TorusGeometry(w * 0.27, 0.08, 8, 28), gold, 0, 0.42, L * 0.6, Math.PI / 2);
  { const ms = []; for (let d = 1.5; d < L - 1.5; d += 2.2) ms.push(mat4(0, 0.46, d, 0, 0, 0, 0.14)); g.add(inst(new THREE.SphereGeometry(1, 10, 8), gold, ms)); }
  return g;
}
export function gearGeo(R, teeth, th = 1.2) { const sh = new THREE.Shape(), n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = (i % 4 < 2) ? R : R * 0.86; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const h = new THREE.Path(); h.absarc(0, 0, R * 0.22, 0, Math.PI * 2, true); sh.holes.push(h);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, p = new THREE.Path(); p.absarc(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.16, 0, Math.PI * 2, true); sh.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15, bevelSegments: 2, curveSegments: 12 }); g.translate(0, 0, -th / 2); return g; }

// ---------------------------------------------------------------- GELATINA
export function buildJellyCake(c, { P }) {
  const g = new THREE.Group();
  add(g, lathe([[0.001, 0], [5.3, 0], [5.35, 0.1], [5.35, 1.3], [5.3, 1.4], [0.001, 1.4]], 48), P('#ffe3b8', { roughness: 0.6 }));
  add(g, lathe([[0.001, 1.38], [5.32, 1.38], [5.42, 1.6], [5.3, 3.4], [5.12, 4.2], [4.8, 4.5], [0.001, 4.58]], 48), P(c, { roughness: 0.12, transparent: true, opacity: 0.88 }));
  const swirl = lathe([[0.75, 0], [0.8, 0.18], [0.62, 0.42], [0.62, 0.48], [0.4, 0.68], [0.4, 0.74], [0.18, 0.92], [0.001, 1.05]], 20);
  { const ms = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ms.push(mat4(Math.cos(a) * 4.3, 4.35, Math.sin(a) * 4.3, 0, a * 2, 0)); } g.add(inst(swirl, P('#ffffff', { roughness: 0.45 }), ms)); }
  add(g, new THREE.SphereGeometry(1.0, 24, 18), P('#ff4f7a', { roughness: 0.12 }), 0, 5.45, 0);
  add(g, tube([[0, 6.3, 0], [0.25, 6.9, 0.1], [0.7, 7.3, 0.2]], 0.07, 16), P('#6aa84f', { roughness: 0.5 }));
  add(g, new THREE.SphereGeometry(1, 12, 8), P('#7fc96a', { roughness: 0.5 }), 0.95, 7.3, 0.25, 0, 0, 0.6, 0.42, 0.08, 0.22);
  { const ms = [], cs = [], cols = ['#ff8fb8', '#ffffff', '#9789f2', '#4fcabb', '#f2c64e']; for (let i = 0; i < 40; i++) { const a = i * 2.39996, r = 1.4 + (i % 9) * 0.3; ms.push(mat4(Math.cos(a) * r, 4.6, Math.sin(a) * r, Math.PI / 2, 0, a)); cs.push(cols[i % 5]); }
    g.add(inst(new THREE.CapsuleGeometry(0.06, 0.3, 3, 6), P('#ffffff', { roughness: 0.4 }), ms, cs)); }
  for (const [x, z, r] of [[1.6, -0.8, 0.3], [-1.4, 1.2, -0.25]]) add(g, new THREE.BoxGeometry(0.5, 2.0, 0.16), P('#f2d29b', { roughness: 0.7 }), x, 5.4, z, 0, 0, r);
  return g;
}
export function buildFlan({ P }) {
  const g = new THREE.Group();
  add(g, lathe([[0.001, 0], [3.2, 0], [3.3, 0.12], [3.0, 0.2], [0.001, 0.2]], 48), P('#ffffff', { roughness: 0.25 }));
  add(g, lathe([[0.001, 0.2], [2.4, 0.2], [2.46, 0.3], [2.12, 2.0], [1.78, 2.38], [0.001, 2.45]], 48), P('#ffd27a', { roughness: 0.18 }));
  add(g, lathe([[0.001, 2.47], [1.7, 2.44], [1.86, 2.3], [2.0, 2.0], [1.95, 1.98], [1.7, 2.25], [0.001, 2.38]], 48), P('#b5652e', { roughness: 0.08 }));
  { const ms = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, l = 0.3 + (i * 7 % 5) * 0.12; ms.push(mat4(Math.cos(a) * 2.03, 1.95 - l / 2, Math.sin(a) * 2.03, 0, 0, 0, 1, l / 0.5, 1)); } g.add(inst(new THREE.CapsuleGeometry(0.1, 0.3, 4, 8), P('#b5652e', { roughness: 0.08 }), ms)); }
  return g;
}
