// v42: adornos animados para TODOS los objetos de las cajas: órbita temática (estrellas, notas, burbujas,
// corazones, chispas…), destello y latido suave. Geometrías/materiales compartidos; menos piezas en calidad baja.
import * as THREE from 'three';
const G = {}, M = new Map(), live = new Set(), _b = new THREE.Box3(), _s = new THREE.Sphere();
export const DECO = { hi: true, t: 0 };
const shapeGeo = k => G[k] || (G[k] = (() => {
  const S = new THREE.Shape(), ex = s => new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 1 });
  if (k === 'star') { for (let i = 0; i <= 10; i++) { const a = i / 10 * 6.283 + 1.57, r = i % 2 ? 0.45 : 1; i ? S.lineTo(Math.cos(a) * r, Math.sin(a) * r) : S.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return ex(S); }
  if (k === 'heart') { S.moveTo(0, -1); S.bezierCurveTo(1.4, 0.2, 1, 1.3, 0, 0.6); S.bezierCurveTo(-1, 1.3, -1.4, 0.2, 0, -1); return ex(S); }
  if (k === 'note') { const g = new THREE.SphereGeometry(0.5, 8, 6); g.scale(1, 0.75, 0.6); const st = new THREE.BoxGeometry(0.14, 1.5, 0.14); st.translate(0.42, 0.72, 0); return mergeTwo(g, st); }
  if (k === 'drop') { const g = new THREE.SphereGeometry(0.7, 10, 8); const c = new THREE.ConeGeometry(0.62, 1, 10); c.translate(0, 0.62, 0); return mergeTwo(g, c); }
  if (k === 'bolt') { S.moveTo(0.2, 1); S.lineTo(-0.5, 0); S.lineTo(0, 0); S.lineTo(-0.3, -1); S.lineTo(0.5, 0.15); S.lineTo(0, 0.15); S.lineTo(0.2, 1); return ex(S); }
  if (k === 'gem') return new THREE.OctahedronGeometry(1, 0);
  return new THREE.SphereGeometry(1, 10, 8); // bubble / dot
})());
function mergeTwo(a, b) { a = a.toNonIndexed(); b = b.toNonIndexed(); const g = new THREE.BufferGeometry(); for (const n of ['position', 'normal']) { const x = a.attributes[n].array, y = b.attributes[n].array, z = new Float32Array(x.length + y.length); z.set(x); z.set(y, x.length); g.setAttribute(n, new THREE.BufferAttribute(z, 3)); } return g; }
const mat = (c, o = 1) => { const k = c + o; if (!M.has(k)) M.set(k, new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, transparent: o < 1, opacity: o, depthWrite: o >= 1 })); return M.get(k); };
let glintTex; function glint() { if (glintTex) return glintTex; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff'; x.fillRect(30, 2, 4, 60); x.fillRect(2, 30, 60, 4); return glintTex = new THREE.CanvasTexture(c); }
// tema por objeto: [forma, colores, modo]  modo: orbit | rise | swirl | blink
const T = {
  osito: ['heart', ['#ff6fa0', '#ffd0e2'], 'orbit'], misil: ['star', ['#ffe066', '#7fd8ff', '#ff6f9a'], 'swirl'], charco: ['bubble', ['#d8fbef', '#7ee3c4'], 'rise'],
  shark: ['bubble', ['#bff4ff', '#7fd8ff'], 'rise'], star: ['star', ['#ffe066', '#ff8fd8', '#7ff5ff', '#b6ff9f'], 'orbit'], glider: ['star', ['#ffffff', '#ffe066'], 'swirl'],
  time: ['gem', ['#b98cff', '#7ff5ff'], 'orbit'], piano: ['note', ['#ffffff', '#ffe066', '#b98cff'], 'rise'], fish: ['bubble', ['#e8fbff', '#9fe6ff'], 'rise'],
  tea: ['heart', ['#fff6ec', '#ffd0e2'], 'rise'], rocket: ['star', ['#ffcf3a', '#ff6f3d'], 'swirl'], carpet: ['gem', ['#ffe066', '#ff6f9a', '#7fd8ff'], 'orbit'],
  portal: ['star', ['#b98cff', '#7ff5ff', '#ff8fd8'], 'swirl'], bubble: ['bubble', ['#e8fbff', '#ffd0f2'], 'orbit'], mound: ['dot', ['#a0703a', '#c9905a'], 'rise'],
  circus: ['star', ['#ff4f6a', '#ffe066', '#7fd8ff'], 'orbit'], dolphin: ['drop', ['#9fe6ff', '#ffffff'], 'rise'],
  hand: ['star', ['#ffe066', '#ffffff'], 'blink'], nose: ['bubble', ['#ff8fb8', '#ffd0e2'], 'blink'], bunny: ['heart', ['#ffb0d8', '#ffffff'], 'orbit'],
  hat: ['star', ['#ffe066', '#b98cff'], 'swirl'], disco: ['gem', ['#ff8fd8', '#7ff5ff', '#ffe066', '#b98cff'], 'orbit'], duck: ['bubble', ['#e8fbff', '#bff4ff'], 'rise'],
  corn: ['star', ['#ffe066', '#ffffff'], 'blink'], cannon: ['star', ['#ffcf3a', '#ff6f3d', '#ffffff'], 'swirl'], hen: ['heart', ['#ff6f6a', '#ffe066'], 'orbit'],
  ears: ['note', ['#ff8fd8', '#ffffff'], 'rise'], egg: ['gem', ['#ffe066', '#7ff5a0'], 'blink'], chick: ['heart', ['#ffe066', '#ffcf6a'], 'orbit'], octo: ['bubble', ['#d8b8ff', '#ffd0f2'], 'rise'],
  driller: ['dot', ['#c9905a', '#ffcf3a'], 'swirl'], clump: ['dot', ['#a0703a', '#ffe066'], 'rise'], ring: ['star', ['#ffe066', '#ffffff'], 'orbit'],
  dragon: ['star', ['#ff6f3d', '#ffcf3a', '#ff4f8a'], 'swirl'], rainbow: ['star', ['#ff6f6a', '#ffcf3a', '#7ff5a0', '#7fd8ff', '#b98cff'], 'orbit'],
};
export function deco(obj, kind) {
  const th = T[kind]; if (!th || !obj || obj.userData.deco) return obj;
  try {
    _b.setFromObject(obj); _b.getBoundingSphere(_s); const r = Math.max(0.5, Math.min(6, isFinite(_s.radius) ? _s.radius : 1.5));
    const c = _s.center.clone(); if (!isFinite(c.x)) c.set(0, r * 0.6, 0); obj.worldToLocal ? 0 : 0;
    const local = c.sub(obj.position);
    const g = new THREE.Group(); g.name = 'deco'; g.position.copy(local); obj.add(g);
    const n = DECO.hi ? 5 : 2, geo = shapeGeo(th[0]), parts = [];
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, mat(th[1][i % th[1].length], th[0] === 'bubble' ? 0.6 : 1)); m.scale.setScalar(r * 0.09); m.castShadow = false; g.add(m); parts.push(m); }
    let gl = null; if (DECO.hi) { gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glint(), color: th[1][0], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(r * 0.5); g.add(gl); }
    obj.userData.deco = { g, parts, gl, r, mode: th[2], ph: Math.random() * 6 }; live.add(obj);
  } catch (e) { console.warn('deco', kind, e); }
  return obj;
}
export function tickDeco(dt) {
  const t = (DECO.t += dt);
  for (const o of live) {
    if (!o.parent) { if (o.userData.decoGone > 30) live.delete(o); else o.userData.decoGone = (o.userData.decoGone || 0) + dt; continue; }
    o.userData.decoGone = 0; if (!o.visible) continue;
    const d = o.userData.deco, n = d.parts.length, r = d.r, tt = t + d.ph;
    for (let i = 0; i < n; i++) { const m = d.parts[i], f = i / n;
      if (d.mode === 'orbit') { const a = tt * 1.6 + f * 6.283; m.position.set(Math.cos(a) * r * 1.05, Math.sin(tt * 3 + i) * r * 0.2, Math.sin(a) * r * 1.05); m.rotation.y = -a; m.scale.setScalar(r * 0.09); }
      else if (d.mode === 'swirl') { const a = tt * 3 + f * 6.283; m.position.set(Math.cos(a) * r * 0.9, Math.sin(a * 0.5) * r * 0.5, Math.sin(a) * r * 0.9); m.rotation.z = tt * 4; m.scale.setScalar(r * 0.08 * (0.7 + 0.3 * Math.sin(tt * 6 + i))); }
      else if (d.mode === 'rise') { const u = (tt * 0.6 + f) % 1; m.position.set(Math.sin(i * 2.4 + tt) * r * 0.7, -r * 0.2 + u * r * 1.4, Math.cos(i * 1.9) * r * 0.6); m.rotation.z = Math.sin(tt * 3 + i) * 0.5; m.scale.setScalar(r * 0.09 * Math.sin(u * Math.PI)); }
      else { const a = f * 6.283; m.position.set(Math.cos(a) * r * 0.95, Math.sin(a * 2) * r * 0.3, Math.sin(a) * r * 0.95); m.rotation.y = tt * 2; m.scale.setScalar(r * 0.1 * Math.max(0, Math.sin(tt * 4 + i * 1.7))); }
    }
    if (d.gl) { const s = Math.max(0, Math.sin(tt * 2.3)); d.gl.material.opacity = s * s * 0.9; d.gl.position.set(r * 0.4, r * 0.4, r * 0.3); }
  }
}
