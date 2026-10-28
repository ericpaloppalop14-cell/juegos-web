// v48: karts con mucho más detalle y resolución (neumáticos con dibujo, llantas con radios y tuercas, guardabarros pintados con brillo,
// tubos de escape cromados, faros con aro, alerón bajo, matrículas y pegatinas). Se añade a TODOS los vehículos sin cambiar su forma.
// Geometrías fusionadas y compartidas (2 mallas por rueda) y materiales compartidos: pensado para móvil.
import * as THREE from 'three';
const V3 = THREE.Vector3, M4 = THREE.Matrix4, Q = THREE.Quaternion, E = THREE.Euler;
const GS = {}, geo = (k, f) => GS[k] || (GS[k] = Object.assign(f(), { _shared: true }));
const MS = {}, mat = (k, f) => MS[k] || (MS[k] = f());

// fusiona partes {g, m(matriz), c(color)} en una sola geometría con color por vértice
function merge(parts) {
  const P = [], N = [], C = [];
  for (const { g, m, c } of parts) { const x = (g.index ? g.toNonIndexed() : g.clone()); x.applyMatrix4(m); const p = x.attributes.position.array, n = x.attributes.normal.array, col = new THREE.Color(c);
    for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); } for (let i = 0; i < p.length / 3; i++) C.push(col.r, col.g, col.b); x.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeBoundingSphere(); return g;
}
const mx = (p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => new M4().compose(new V3(...p), new Q().setFromEuler(new E(...r)), new V3(...s));

// neumático: perfil redondeado + franja blanca en el flanco + 22 tacos en zigzag (radio 1, ancho 1, eje Y)
const tireGeo = () => geo('v48tire', () => {
  const prof = [[0.6, -0.42], [0.74, -0.5], [0.9, -0.48], [0.99, -0.38], [1.02, -0.2], [1.02, 0.2], [0.99, 0.38], [0.9, 0.48], [0.74, 0.5], [0.6, 0.42], [0.6, 0.0], [0.6, -0.42]].map(([r, y]) => new THREE.Vector2(r, y));
  const lg = new THREE.LatheGeometry(prof, 28); const g = lg.toNonIndexed(); lg.dispose(); const p = g.attributes.position, c = [], rub = new THREE.Color('#2b2433'), wht = new THREE.Color('#ffffff'), inn = new THREE.Color('#1a141f');
  for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)), y = Math.abs(p.getY(i)); const col = (y > 0.44 && r > 0.72 && r < 0.8) ? wht : r < 0.62 ? inn : rub; c.push(col.r, col.g, col.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const lugs = []; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, s = i % 2 ? 1 : -1; lugs.push({ g: new THREE.BoxGeometry(0.13, 0.34, 0.2), m: mx([Math.cos(a) * 1.03, s * 0.2, Math.sin(a) * 1.03], [0, -a, 0]).multiply(mx([0, 0, 0], [s * 0.5, 0, 0])), c: '#4b4057' }); }
  const base = { position: g.attributes.position, normal: g.attributes.normal, color: g.attributes.color }; const t = merge(lugs);
  const out = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'color']) { const a = base[k].array, b = t.attributes[k].array, z = new Float32Array(a.length + b.length); z.set(a); z.set(b, a.length); out.setAttribute(k, new THREE.BufferAttribute(z, 3)); }
  out.computeBoundingSphere(); return out;
});
// llanta: labio, 6 radios cónicos, tapacubos dorado y 5 tuercas, por las dos caras (radio 1, eje Y)
const rimGeo = () => geo('v48rim', () => {
  const parts = [], lip = new THREE.TorusGeometry(0.62, 0.05, 6, 24), hub = new THREE.SphereGeometry(1, 10, 6), spoke = new THREE.BoxGeometry(0.5, 0.07, 0.1), nut = new THREE.SphereGeometry(1, 5, 4);
  for (const s of [-1, 1]) { const y = s * 0.45;
    parts.push({ g: lip, m: mx([0, y, 0], [Math.PI / 2, 0, 0]), c: '#f4f6ff' });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + (s > 0 ? 0 : 0.5); parts.push({ g: spoke, m: mx([Math.cos(a) * 0.36, y, Math.sin(a) * 0.36], [0, -a, 0], [1, 1, 1 - (i % 2) * 0.2]), c: i % 2 ? '#e4e9ff' : '#ffffff' }); }
    parts.push({ g: hub, m: mx([0, y + s * 0.02, 0], [0, 0, 0], [0.19, 0.1, 0.19]), c: '#ffd36a' });
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; parts.push({ g: nut, m: mx([Math.cos(a) * 0.13, y + s * 0.045, Math.sin(a) * 0.13], [0, 0, 0], [0.032, 0.03, 0.032]), c: '#9aa6c8' }); } }
  return merge(parts);
});
const tireMat = () => mat('v48tireM', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.0 }));
const rimMat = () => mat('v48rimM', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.45, emissive: '#303a60', emissiveIntensity: 0.25 }));
// matcap cromado (parece metal pulido sin necesitar luces ni mapa de entorno)
const CHR_MAT = () => mat('v48chrome', () => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, '#f4f8ff'); g.addColorStop(0.45, '#9fb4dc'); g.addColorStop(0.7, '#56638a'); g.addColorStop(0.86, '#cfdcff'); g.addColorStop(1, '#8a98c0'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(44, 38, 18, 9, -0.6, 0, 6.3); x.fill(); x.fillStyle = 'rgba(40,50,90,.35)'; x.fillRect(0, 70, 128, 8);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshMatcapMaterial({ matcap: t }); });
const paint = (c, rough = 0.28) => mat('v48paint' + c + rough, () => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.12, emissive: c, emissiveIntensity: 0.12 }));
const darkM = () => mat('v48dark', () => new THREE.MeshStandardMaterial({ color: '#2b2433', roughness: 0.6 }));

const tex = (k, w, h, draw) => mat('v48tx' + k, () => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; });
const plateMat = (name, num, col) => mat('v48plate' + name, () => new THREE.MeshStandardMaterial({ roughness: 0.4, map: tex('pl' + name, 128, 64, (x, w, h) => { x.fillStyle = '#fffdf6'; x.fillRect(0, 0, w, h); x.strokeStyle = col; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = col; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.fillText(name.slice(0, 9).toUpperCase(), w / 2, 30); x.fillStyle = '#2a1838'; x.font = 'bold 20px sans-serif'; x.fillText('★ ' + num + ' ★', w / 2, 54); }) }));
const roundelMat = (num, col) => mat('v48rd' + num + col, () => new THREE.MeshStandardMaterial({ roughness: 0.4, map: tex('rd' + num + col, 64, 64, (x, w) => { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(32, 32, 31, 0, 6.3); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(32, 32, 25, 0, 6.3); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 32px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(num), 32, 35); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(24, 18, 12, 6, -0.5, 0, 6.3); x.fill(); }) }));

const exhaustGeo = () => geo('v48exh', () => new THREE.LatheGeometry([[0.05, 0], [0.075, 0.02], [0.075, 0.3], [0.09, 0.38], [0.125, 0.5], [0.12, 0.52], [0.085, 0.5]].map(([r, y]) => new THREE.Vector2(r, y)), 14));
const fenderGeo = () => geo('v48fend', () => { const g = new THREE.TorusGeometry(1, 0.1, 6, 20, Math.PI * 0.82); g.rotateZ(Math.PI / 2 - Math.PI * 0.41); g.rotateY(Math.PI / 2); return g; });
const sphG = () => geo('v48sph', () => new THREE.SphereGeometry(1, 10, 7)), boxG = () => geo('v48box', () => new THREE.BoxGeometry(1, 1, 1)), cylG = () => geo('v48cyl', () => new THREE.CylinderGeometry(1, 1, 1, 12)), torG = () => geo('v48tor', () => new THREE.TorusGeometry(1, 0.22, 6, 16));
const starG = () => geo('v48star', () => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? 0.42 : 1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: false }); });

const hex = c => '#' + new THREE.Color(c).getHexString();
const lighten = (c, k) => '#' + new THREE.Color(c).lerp(new THREE.Color('#ffffff'), k).getHexString();

const P = c => ({ b: 'p', c }), GL = c => ({ b: 'g', c }), CHR = { b: 'c', c: '#ffffff' }, DK = { b: 'p', c: '#2b2433' };
export function detalleKart(ch, g, wheels, anims) {
  if (!ch || !ch.id) return; // decorados (tazas de escenario...): sin extras
  const buckets = { p: [], c: [], g: [] }; // v48: todo lo estático se funde en 3 mallas por kart (pintura / cromo / luces) para no disparar las llamadas de dibujo
  const add = (geom, material, p, r, s, par = g) => {
    if (material && material.isMaterial) { const m = new THREE.Mesh(geom, material); if (p) m.position.set(...p); if (r) m.rotation.set(...r); if (s) typeof s === 'number' ? m.scale.setScalar(s) : m.scale.set(...s); par.add(m); return m; }
    const ss = s == null ? [1, 1, 1] : typeof s === 'number' ? [s, s, s] : s; let M = mx(p || [0, 0, 0], r || [0, 0, 0], ss); if (par !== g) { par.updateMatrix(); M = par.matrix.clone().multiply(M); }
    buckets[material.b].push({ g: geom, m: M, c: material.c }); return null; };
  const C = ch.color || '#ff9cc8', body = hex(C), accent = lighten(C, 0.25), num = (ch.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 90) + 10;
  // medidas del vehículo ANTES de añadir nada
  g.updateMatrixWorld(true); const bb = new THREE.Box3(), tb = new THREE.Box3(), sz = new V3();
  g.traverse(o => { if (!o.isMesh || !o.geometry) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); tb.getSize(sz); if (Math.max(sz.x, sz.y, sz.z) >= 0.5) bb.union(tb); }); if (bb.isEmpty()) bb.set(new V3(-1, 0, -1.2), new V3(1, 1, 1.2));
  const maxX = Math.min(1.6, Math.max(0.8, bb.max.x)), maxZ = Math.max(1.0, bb.max.z), minZ = Math.min(-1.0, bb.min.z);
  const ws = wheels.filter(w => w.userData && w.userData.isWheel && w.parent === g); const car = ws.length >= 3;
  // ---------- ruedas: neumático con dibujo + llanta con radios + guardabarros ----------
  for (const w of ws) {
    const R = (w.scale.x + w.scale.z) / 2, tw = Math.max(0.32, w.scale.y * 1.2); w.scale.x = w.scale.z = R * 0.78; const sx = w.scale.x, sy = w.scale.y, sz = w.scale.z;
    const d = new THREE.Group(); d.scale.set(1 / sx, 1 / sy, 1 / sz); w.add(d);
    add(tireGeo(), tireMat(), null, null, [R, tw, R], d); add(rimGeo(), rimMat(), null, null, [R, tw, R], d);
    if (car) { add(fenderGeo(), P(body), [w.position.x, w.position.y + R * 0.02, w.position.z], null, [R * 3.4, R * 1.2, R * 1.2]); }
  }
  // ---------- parte trasera: tubos de escape cromados (con boca oscura) y matrícula ----------
  const ex = Math.min(0.5, maxX * 0.4), ey = car ? 0.46 : 0.7;
  for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * ex, ey, minZ + (car ? 0.06 : 0.3)); e.rotation.x = -Math.PI / 2 - 0.12;
    add(exhaustGeo(), CHR, null, null, null, e); add(cylG(), DK, [0, 0.5, 0], null, [0.082, 0.04, 0.082], e);
    add(torG(), GL('#ff9a4a'), [0, 0.52, 0], [Math.PI / 2, 0, 0], 0.09, e);
    add(cylG(), CHR, [0, 0.04, 0], [0, 0, Math.PI / 2], [0.05, 0.14, 0.05], e); }
  if (car) {
    // alerón bajo con paneles laterales, soportes cromados y pegatina
    const wz = minZ - 0.12, wy = 0.7; const wi = Math.min(0.85, maxX * 0.7);
    add(boxG(), P(accent), [0, wy, wz], [0.08, 0, 0], [wi * 2, 0.045, 0.3]); add(boxG(), P('#ffffff'), [0, wy + 0.025, wz - 0.1], [0.08, 0, 0], [wi * 2, 0.025, 0.1]);
    for (const s of [-1, 1]) { add(boxG(), P(body), [s * wi, wy + 0.04, wz], null, [0.045, 0.24, 0.34]); add(cylG(), CHR, [s * wi * 0.5, wy - 0.12, wz + 0.1], null, [0.025, 0.24, 0.025]); }
    add(starG(), P('#ffe066', 0.3), [0, wy + 0.06, wz + 0.02], [-Math.PI / 2 + 0.1, 0, 0], [0.1, 0.1, 0.04]);
    const pl = add(boxG(), plateMat(ch.name || ch.id, num, body), [0, 0.5, minZ - 0.04], null, [0.5, 0.25, 0.04]);
  }
  // ---------- parte delantera: faros con aro cromado y lente luminosa, placa/pegatina ----------
  const hx = Math.min(0.55, maxX * 0.42), hy = car ? 0.55 : 0.75;
  for (const s of [-1, 1]) { const h = new THREE.Group(); h.position.set(s * hx, hy, maxZ + 0.04);
    add(torG(), CHR, [0, 0, 0], null, 0.15, h); add(sphG(), GL('#fff6c8'), [0, 0, -0.02], null, [0.13, 0.13, 0.07], h);
    add(sphG(), GL('#ffffff'), [-0.04, 0.045, 0.045], null, [0.035, 0.02, 0.01], h); add(cylG(), CHR, [0, 0, -0.09], [Math.PI / 2, 0, 0], [0.035, 0.16, 0.035], h); }
  add(cylG(), roundelMat(num, body), [0, car ? 0.34 : 0.55, maxZ + 0.05], [Math.PI / 2, 0, 0], [0.17, 0.035, 0.17]);
  // fusión final
  const bm = { p: mat('v48Pm', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.12 })), c: CHR_MAT(), g: mat('v48Gm', () => new THREE.MeshBasicMaterial({ vertexColors: true })) };
  for (const k of ['p', 'c', 'g']) if (buckets[k].length) { const m = new THREE.Mesh(merge(buckets[k]), bm[k]); m.userData.v48 = true; g.add(m); }
}
export function markWheel(w) { w.userData.isWheel = true; return w; }
