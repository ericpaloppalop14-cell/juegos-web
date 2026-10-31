// v7: personajes esculpidos (SDF + surface-nets) horneados a .bin y montados como grupos animables
import * as THREE from 'three';
import { GB, addOutline } from './geo.js?v=11.1';
import { MeshoptDecoder } from './meshopt.js?v=11.1';

const LUT = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; LUT[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

// material de personaje: standard + luz de contorno cálida y rebote hemisférico (aspecto "juguete" de alta gama)
export const charMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.0 });
charMat.onBeforeCompile = (sh) => {
  // v10: aspecto "figura de vinilo": luz en bandas nítidas (cel), brillo duro tipo barniz, luz de contorno y rebote
  sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
    { vec3 vN = normalize(normal), vV = normalize(vViewPosition);
      float L0 = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)) + 1e-3, f = dot(outgoingLight, vec3(0.3, 0.59, 0.11)) / L0;
      float q = 0.50 + 0.26 * smoothstep(0.40, 0.46, f) + 0.26 * smoothstep(0.80, 0.86, f) + 0.20 * smoothstep(1.18, 1.24, f);
      outgoingLight *= mix(f, q, 0.78) / max(f, 1e-3);
      float fr = pow(1.0 - clamp(dot(vN, vV), 0.0, 1.0), 2.6);
      float up = vN.y * 0.5 + 0.5; outgoingLight += diffuseColor.rgb * fr * vec3(1.0, 0.82, 0.78) * 0.34 + diffuseColor.rgb * vec3(0.05, 0.03, 0.07) * (1.0 - up);
      #if NUM_DIR_LIGHTS > 0
      vec3 hv = normalize(directionalLights[0].direction + vV); float nh = dot(vN, hv);
      float glint = smoothstep(0.972, 0.982, nh) * 0.34 + smoothstep(0.90, 0.915, nh) * 0.07;
      outgoingLight += mix(vec3(1.0), diffuseColor.rgb, 0.25) * glint;
      #endif
    }
    #include <opaque_fragment>`);
};
export const eyeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.0 });

const packs = {};
async function gunzip(buf) {
  const h = new Uint8Array(buf, 0, 2); if (!(h[0] === 0x1f && h[1] === 0x8b)) return new Uint8Array(buf); // el servidor ya lo descomprimió
  if (typeof DecompressionStream === 'undefined') throw new Error('DecompressionStream no disponible');
  const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')); return new Uint8Array(await new Response(s).arrayBuffer());
}
export async function loadPacks(ids, base, ver, onProg) {
  let n = 0; await MeshoptDecoder.ready;
  await Promise.all(ids.map(async (id) => {
    const r = await fetch(`${base}models/${id}.bin?v=${ver}`); if (!r.ok) throw new Error('pack ' + id); packs[id] = parsePack(await gunzip(await r.arrayBuffer())); n++; onProg && onProg(n / ids.length);
  }));
}
export const hasPack = (id) => !!packs[id];

function parsePack(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); const hl = dv.getUint32(0, true); const head = JSON.parse(new TextDecoder().decode(u8.subarray(4, 4 + hl))); let o = 4 + hl;
  const parts = {};
  for (const p of head.parts) {
    const nv = p.nv, ni = p.ni; const vb = new Uint8Array(nv * 16); MeshoptDecoder.decodeVertexBuffer(vb, nv, 16, u8.subarray(o, o + p.lv)); o += p.lv;
    const ib = new Uint8Array(ni * p.isz); MeshoptDecoder.decodeIndexBuffer(ib, ni, p.isz, u8.subarray(o, o + p.li)); o += p.li;
    const vd = new DataView(vb.buffer); const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3);
    for (let v = 0; v < nv; v++) {
      const q = v * 16;
      for (let a = 0; a < 3; a++) { P[v * 3 + a] = p.min[a] + (vd.getInt16(q + a * 2, true) + 32768) * p.scale[a]; N[v * 3 + a] = vd.getInt8(q + 8 + a); C[v * 3 + a] = LUT[vb[q + 12 + a]]; }
      const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1; N[v * 3] /= l; N[v * 3 + 1] /= l; N[v * 3 + 2] /= l;
    }
    const I = p.isz === 2 ? new Uint16Array(ib.buffer, 0, ni) : new Uint32Array(ib.buffer, 0, ni);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setIndex(new THREE.BufferAttribute(I, 1));
    g.computeBoundingBox(); g.computeBoundingSphere(); parts[p.name] = { geo: g, info: p };
  }
  return { meta: head.meta, parts };
}

function mesh(part, shadow = true, rel = 0.0065) {
  const m = new THREE.Mesh(part.geo, charMat); m.castShadow = shadow; const bb = part.geo.boundingBox; const size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
  if (rel > 0) addOutline(m, Math.max(0.007, size * rel)); return m;
}
const PI = Math.PI;
// ojos: esclera brillante + iris con anillo + pupila + destellos
function eyeGeo(e) {
  const g = new GB(); const w = e.white == null ? 0xffffff : e.white, iris = e.iris == null ? 0x6b3b2a : e.iris, r = e.r, s = e.s;
  const S = (rad, col, x, y, z, sx, sy, sz) => g.add(new THREE.SphereGeometry(rad, 22, 16), col, x, y, z, 0, 0, 0, sx, sy, sz);
  S(r, w, 0, 0, 0, 1, e.sy || 1.08, 0.78);
  const ir = r * (e.ir || 0.74), pz = r * 0.6;
  S(ir, new THREE.Color(iris).multiplyScalar(0.62).getHex(), s * (e.lx || 0), -r * 0.02, pz, 1, e.sy || 1.08, 0.5);
  S(ir * 0.82, iris, s * (e.lx || 0), -r * 0.04, pz + r * 0.04, 1, e.sy || 1.08, 0.5);
  S(ir * 0.5, 0x2a1840, s * (e.lx || 0), -r * 0.04, pz + r * 0.1, e.slit ? 0.32 : 1, e.slit ? 1.5 : 1.08, 0.5);
  S(ir * 0.26, 0xffffff, s * (e.lx || 0) + r * 0.26, r * 0.3, pz + r * 0.22, 1, 1, 0.8);
  S(ir * 0.12, 0xffffff, s * (e.lx || 0) - r * 0.2, -r * 0.28, pz + r * 0.2, 1, 1, 0.8);
  return g.build(false, 0.05);
}
const geoCache = new Map();

export function buildChar(id) {
  const pk = packs[id]; const M = pk.meta; const root = new THREE.Group(); const ud = { h: M.h, headY: M.headY, arms0: M.arms0 || 2.4 }; if (M.hover) ud.hover = M.hover; if (M.robot) ud.robot = true;
  const P = pk.parts, node = {};
  const mk = (name, parent) => { const info = P[name].info; const gp = new THREE.Group(); gp.position.set(...info.pivot); gp.add(mesh(P[name], name !== 'mouth', name === 'mouth' ? 0.0 : 0.0065)); node[name] = gp; (parent || root).add(gp); return gp; };
  const body = new THREE.Group(); const bm = mesh(P.body); root.add(bm); ud.bodyM = bm;
  if (M.legs) ud.legs = ['legL', 'legR'].map((n) => mk(n));
  const head = mk('head'); ud.head = head;
  // ojos y párpados
  for (const e of M.eyes) { const key = id + ':' + JSON.stringify(e); let ge = geoCache.get(key); if (!ge) { ge = eyeGeo(e); geoCache.set(key, ge); } const em = new THREE.Mesh(ge, eyeMat); em.position.set(...e.p); em.rotation.set(e.rx || 0, (e.s || 0) * (e.ry == null ? 0.04 : e.ry), 0); head.add(em); }
  if (M.lids) { ud.lids = []; for (const [x, y, z, r, col] of M.lids) { const gb = new GB(); gb.add(new THREE.SphereGeometry(r * 1.1, 18, 12), col, 0, 0, 0, 0, 0, 0, 1.08, 1.14, 0.92); const lm = new THREE.Mesh(gb.build(false, 0.05), charMat); lm.position.set(x, y, z); lm.visible = false; head.add(lm); ud.lids.push(lm); } }
  const mouth = mk('mouth', head); ud.mouth = mouth;
  ud.arms = ['armL', 'armR'].map((n, i) => { const a = mk(n); a.rotation.z = -(i ? 1 : -1) * ud.arms0; return a; });
  for (const x of M.extras || []) { const g = mk(x.name, x.parent === 'head' ? head : null); ud[x.name] = g; }
  const X = EXTRA[id]; if (X) ud.extra = X(ud, root);
  // v10: centrar el personaje: el pivote (raíz) queda en el centro de los pies/cuerpo (sin contar brazos ni accesorios)
  { const bb = new THREE.Box3(), t = new THREE.Box3(); const add = (geo, ox, oy, oz) => { t.copy(geo.boundingBox); t.min.x += ox; t.max.x += ox; t.min.z += oz; t.max.z += oz; bb.union(t); };
    add(P.body.geo, 0, 0, 0); if (M.legs) for (const n of ['legL', 'legR']) { const pv = P[n].info.pivot; add(P[n].geo, pv[0], pv[1], pv[2]); }
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2; ud.cx = cx; ud.cz = cz; if (Math.abs(cx) + Math.abs(cz) > 1e-4) for (const c of root.children) { c.position.x -= cx; c.position.z -= cz; } }
  root.userData = ud; return root;
}
// comportamientos propios de cada personaje (cola, capa, tentáculos...)
const EXTRA = {
  gato: (ud) => (t) => { if (ud.tail) { ud.tail.rotation.z = Math.sin(t * 5) * 0.45; ud.tail.rotation.y = Math.sin(t * 2.2) * 0.25; } },
  calcetin: (ud) => (t, st) => { if (ud.cape) ud.cape.rotation.x = 0.28 + Math.sin(t * 7) * 0.12 + Math.min(0.5, (st && st.speed || 0) * 0.03); },
  pulpo: (ud) => (t) => { if (ud.tent) { ud.tent.rotation.y = Math.sin(t * 2.4) * 0.16; ud.tent.scale.y = 1 + Math.sin(t * 5) * 0.04; } ud.head.rotation.x = Math.sin(t * 2.2) * 0.05; },
  jamon: (ud) => (t) => { ud.head.rotation.y = Math.sin(t * 1.7) * 0.12; },
  croqueta: (ud) => (t) => { ud.head.rotation.z = Math.sin(t * 3.1) * 0.07; },
  genio: (ud) => (t) => { ud.bodyM.rotation.y = Math.sin(t * 2.0) * 0.25; },
  fantasma: (ud) => (t) => { const b = ud.bodyM; b.scale.set(1 + Math.sin(t * 3) * 0.03, 1 - Math.sin(t * 3) * 0.02, 1 + Math.sin(t * 3) * 0.03); ud.head.rotation.z = Math.sin(t * 2.1) * 0.09; },
};
