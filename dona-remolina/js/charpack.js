// v7: personajes esculpidos (SDF + surface-nets) horneados a .bin y montados como grupos animables
import * as THREE from 'three';
import { GB } from './geo.js?v=13';
import { RoomEnvironment } from '../lib/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from './meshopt.js?v=13';

const LUT = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; LUT[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

// v13: material PBR de personaje (MeshPhysicalMaterial con clearcoat + sheen + normales procedurales por clase de material).
// Clase por vértice (aMat): 0 tela, 1 piel/goma, 2 pelo/pelaje, 3 esmalte/plástico, 4 metal, 5 húmedo (labios), 6 corteza/rugoso
export const charMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.12, sheen: 1.0, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 0.38 });
const GLSL_NOISE = `
  float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float cl(float c, float k){ return 1.0 - step(0.5, abs(c - k)); }
  // altura de la micro-superficie en espacio objeto: tejido, poros, mechones, piel de naranja, cepillado, corteza
  float surfH(vec3 p, float c, float fw){
    float h = 0.0;
    if (c < 0.5) { float k = 360.0; float w = sin(k * p.x) * sin(k * p.y) + sin(k * p.y) * sin(k * p.z) + sin(k * p.x) * sin(k * p.z);
      h = w * 0.0006 * (1.0 - smoothstep(0.004, 0.009, fw)) + (vn(p * 120.0) - 0.5) * 0.0007; }
    else if (c < 1.5) { h = (vn(p * 130.0) - 0.5) * 0.00022 * (1.0 - smoothstep(0.006, 0.012, fw)) + (vn(p * 40.0) - 0.5) * 0.0005; }
    else if (c < 2.5) { h = (vn(vec3(p.x * 260.0, p.y * 20.0, p.z * 260.0)) - 0.5) * 0.0016 * (1.0 - smoothstep(0.004, 0.009, fw)) + (vn(vec3(p.x * 90.0, p.y * 9.0, p.z * 90.0)) - 0.5) * 0.0018; }
    else if (c < 3.5) { h = (vn(p * 70.0) - 0.5) * 0.00045; }
    else if (c < 4.5) { h = (vn(vec3(p.x * 520.0, p.y * 14.0, p.z * 520.0)) - 0.5) * 0.0011 * (1.0 - smoothstep(0.004, 0.009, fw)); }
    else if (c < 5.5) { h = 0.0; }
    else { h = (vn(p * 52.0) - 0.5) * 0.0065 + (vn(p * 150.0) - 0.5) * 0.0028 * (1.0 - smoothstep(0.006, 0.012, fw)); }
    return h; }
`;
function patchCharMat(mat, crust) {
  mat.customProgramCacheKey = () => 'char13' + (crust ? 'c' : '');
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aMat; varying vec4 vMat; varying vec3 vOP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = aMat; vOP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vMat; varying vec3 vOP;\n' + GLSL_NOISE)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      vec4 mw = clamp(vMat, 0.0, 1.0); float wc = clamp(1.0 - mw.x - mw.y - mw.z - mw.w, 0.0, 1.0);
      roughnessFactor = wc * ${crust ? '0.82' : '0.80'} + mw.x * 0.46 + mw.y * 0.50 + mw.z * 0.18 + mw.w * 0.24;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      metalnessFactor = mw.w;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 dpx = dFdx(vOP), dpy = dFdy(vOP); float fw = length(dpx) + length(dpy);
        float h0 = 0.0, hx = 0.0, hy = 0.0;
        if (wc > 0.02) { float c = ${crust ? '6.0' : '0.0'}; h0 += wc * surfH(vOP, c, fw); hx += wc * surfH(vOP + dpx, c, fw); hy += wc * surfH(vOP + dpy, c, fw); }
        if (mw.x > 0.02) { h0 += mw.x * surfH(vOP, 1.0, fw); hx += mw.x * surfH(vOP + dpx, 1.0, fw); hy += mw.x * surfH(vOP + dpy, 1.0, fw); }
        if (mw.y > 0.02) { h0 += mw.y * surfH(vOP, 2.0, fw); hx += mw.y * surfH(vOP + dpx, 2.0, fw); hy += mw.y * surfH(vOP + dpy, 2.0, fw); }
        if (mw.w > 0.02) { h0 += mw.w * surfH(vOP, 4.0, fw); hx += mw.w * surfH(vOP + dpx, 4.0, fw); hy += mw.w * surfH(vOP + dpy, 4.0, fw); }
        h0 += mw.z * 0.0; 
        vec3 sX = dFdx(-vViewPosition), sY = dFdy(-vViewPosition); vec3 R1 = cross(sY, normal), R2 = cross(normal, sX);
        float fDet = dot(sX, R1) * faceDirection; vec3 vG = sign(fDet) * ((hx - h0) * R1 + (hy - h0) * R2);
        normal = normalize(abs(fDet) * normal - vG * 3.0); }`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      { material.clearcoat = mw.x * 0.22 + mw.y * 0.12 + mw.z * 1.0; material.clearcoatRoughness = mix(0.28, 0.05, mw.z);
        float shv = wc * ${crust ? '0.0' : '0.55'} + mw.y * 0.3 + mw.x * 0.22;
        material.sheenColor = mix(vec3(1.0), diffuseColor.rgb, 0.35) * shv; material.sheenRoughness = 0.42; }`)
      .replace('#include <opaque_fragment>', `
      { vec3 vN = normalize(normal), vV = normalize(vViewPosition); float fr = pow(1.0 - clamp(dot(vN, vV), 0.0, 1.0), 3.0);
        outgoingLight += diffuseColor.rgb * vec3(1.0, 0.32, 0.2) * fr * 0.14 * mw.x + diffuseColor.rgb * vec3(1.0, 0.9, 0.85) * fr * 0.07; }
      #include <opaque_fragment>`);
  };
}
patchCharMat(charMat, false);
export const charMatCrust = charMat.clone(); patchCharMat(charMatCrust, true);
export function tagGeo(geo, cls) { const n = geo.attributes.position.count, a = new Float32Array(n * 4); if (cls >= 1 && cls <= 4) for (let i = 0; i < n; i++) a[i * 4 + cls - 1] = 1; geo.setAttribute('aMat', new THREE.BufferAttribute(a, 4)); return geo; }
// mapa de entorno de estudio (solo para los personajes, el resto del juego no cambia)
let envDone = false;
export function initCharEnv(renderer) {
  if (envDone) return; envDone = true;
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(new RoomEnvironment(), 0.035).texture; pm.dispose();
  charMat.envMap = env; charMat.needsUpdate = true; charMatCrust.envMap = env; charMatCrust.needsUpdate = true; eyeMats.forEach((m) => { m.envMap = env; m.needsUpdate = true; }); sclMat.envMap = env;
}
const eyeMats = new Set();
const sclMat = new THREE.MeshPhysicalMaterial({ color: 0xfffdf8, roughness: 0.35, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.3 }); eyeMats.add(sclMat);
const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
// textura de iris: fibras radiales, anillo límbico oscuro, collarete claro y pupila (redonda o rasgada)
const irisTex = new Map();
function irisTexture(col, slit) {
  const key = col + (slit ? 's' : 'r'); let t = irisTex.get(key); if (t) return t;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const C = new THREE.Color(col), hs = {}; C.getHSL(hs);
  const css = (l, sFac = 1) => '#' + new THREE.Color().setHSL(hs.h, Math.min(1, hs.s * sFac), Math.min(0.96, Math.max(0.04, l))).getHexString();
  g.translate(64, 64); const R = 62;
  let gr = g.createRadialGradient(0, 0, 4, 0, 0, R); gr.addColorStop(0, css(hs.l * 0.5)); gr.addColorStop(0.35, css(hs.l * 1.12)); gr.addColorStop(0.8, css(hs.l * 0.82)); gr.addColorStop(1, css(hs.l * 0.32)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
  for (let i = 0; i < 140; i++) { const a = i * 2.399, r0 = 14 + (i % 5) * 3, r1 = R * (0.78 + ((i * 7) % 10) / 60); g.strokeStyle = i % 3 ? css(hs.l * 1.35, 0.9) : css(hs.l * 0.55); g.globalAlpha = 0.28; g.lineWidth = 1.2; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke(); }
  g.globalAlpha = 1; g.strokeStyle = css(hs.l * 1.45, 0.8); g.globalAlpha = 0.5; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 25, 0, 7); g.stroke(); g.globalAlpha = 1;
  gr = g.createRadialGradient(0, 0, R * 0.78, 0, 0, R); gr.addColorStop(0, 'rgba(10,6,16,0)'); gr.addColorStop(1, 'rgba(10,6,16,0.85)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
  g.fillStyle = '#0b0610'; g.beginPath(); if (slit) g.ellipse(0, 0, 9, 44, 0, 0, 7); else g.arc(0, 0, 22, 0, 7); g.fill();
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; irisTex.set(key, t); return t;
}
const irisMats = new Map();
function irisMat(col, slit) { const k = col + (slit ? 's' : 'r'); let m = irisMats.get(k); if (!m) { m = new THREE.MeshPhysicalMaterial({ map: irisTexture(col, slit), roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2 }); irisMats.set(k, m); eyeMats.add(m); if (charMat.envMap) m.envMap = charMat.envMap; } return m; }
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
    const vd = new DataView(vb.buffer); const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3), MT = new Float32Array(nv * 4);
    for (let v = 0; v < nv; v++) {
      const q = v * 16; MT[v * 4] = vb[q + 6] / 255; MT[v * 4 + 1] = vb[q + 7] / 255; MT[v * 4 + 2] = vb[q + 11] / 255; MT[v * 4 + 3] = vb[q + 15] / 255;
      for (let a = 0; a < 3; a++) { P[v * 3 + a] = p.min[a] + (vd.getInt16(q + a * 2, true) + 32768) * p.scale[a]; N[v * 3 + a] = vd.getInt8(q + 8 + a); C[v * 3 + a] = LUT[vb[q + 12 + a]]; }
      const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1; N[v * 3] /= l; N[v * 3 + 1] /= l; N[v * 3 + 2] /= l;
    }
    const I = p.isz === 2 ? new Uint16Array(ib.buffer, 0, ni) : new Uint32Array(ib.buffer, 0, ni);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('aMat', new THREE.BufferAttribute(MT, 4)); g.setIndex(new THREE.BufferAttribute(I, 1));
    g.computeBoundingBox(); g.computeBoundingSphere(); parts[p.name] = { geo: g, info: p };
  }
  return { meta: head.meta, parts };
}

function mesh(part, shadow = true, mat = charMat) {
  const m = new THREE.Mesh(part.geo, mat); m.castShadow = shadow; return m;
}
const PI = Math.PI;
// ojos v13: esclera de porcelana con clearcoat + iris con textura de fibras/pupila + destellos (reflejan el entorno de estudio)
const sclGeoC = new Map(), irisGeoC = new Map(), glintGeoC = new Map();
function irisGeo(e) {
  const key = JSON.stringify([e.r, e.sy, e.ir, e.lx, e.s]); let g = irisGeoC.get(key); if (g) return g;
  const r = e.r, sy = e.sy || 1.08, f = e.ir || 0.74, a = r, b = r * sy, c = r * 0.78, cx = (e.s || 0) * (e.lx || 0) / r, NR = 8, NS = 36; const P = [], N = [], UV = [], I = [];
  for (let i = 0; i <= NR; i++) for (let k = 0; k < NS; k++) {
    const rho = (i / NR) * f, ph = (k / NS) * Math.PI * 2; let x = (cx + rho * Math.cos(ph)), y = rho * Math.sin(ph) * (sy > 1.2 ? 1 : 1);
    const q = Math.min(0.98, x * x + y * y); const X = x * a, Y = y * b, Z = c * Math.sqrt(1 - q) + r * 0.012;
    P.push(X, Y - r * 0.02, Z); const nx = X / (a * a), ny = Y / (b * b), nz = Z / (c * c), l = Math.hypot(nx, ny, nz); N.push(nx / l, ny / l, nz / l); UV.push(0.5 + 0.5 * (rho / f) * Math.cos(ph), 0.5 + 0.5 * (rho / f) * Math.sin(ph));
  }
  for (let i = 0; i < NR; i++) for (let k = 0; k < NS; k++) { const a0 = i * NS + k, a1 = i * NS + (k + 1) % NS, b0 = (i + 1) * NS + k, b1 = (i + 1) * NS + (k + 1) % NS; I.push(a0, b0, a1, a1, b0, b1); }
  g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); irisGeoC.set(key, g); return g;
}
function glintGeo(e) {
  const key = JSON.stringify([e.r, e.lx, e.s, e.ir]); let g = glintGeoC.get(key); if (g) return g;
  const r = e.r, sy = e.sy || 1.08, ir = r * (e.ir || 0.74), cx = (e.s || 0) * (e.lx || 0), zAt = (x, y) => r * 0.78 * Math.sqrt(Math.max(0.05, 1 - (x / r) ** 2 - (y / (r * sy)) ** 2)) + r * 0.012; const gb = new GB();
  const g1 = [cx + ir * 0.34, ir * 0.38], g2 = [cx - ir * 0.28, -ir * 0.34];
  gb.add(new THREE.SphereGeometry(ir * 0.19, 14, 10), 0xffffff, g1[0], g1[1], zAt(...g1), 0, 0, 0, 1, 1.1, 0.35); gb.add(new THREE.SphereGeometry(ir * 0.085, 10, 8), 0xffffff, g2[0], g2[1], zAt(...g2), 0, 0, 0, 1, 1, 0.35);
  g = gb.build(false, 0.05); glintGeoC.set(key, g); return g;
}
const lashMat = new THREE.MeshStandardMaterial({ color: 0x1b1020, roughness: 0.45, metalness: 0 });
const lashGeoC = new Map();
function lashGeo(e) {
  const key = JSON.stringify([e.r, e.sy, e.top, e.tilt, e.s]); let g = lashGeoC.get(key); if (g) return g;
  const r = e.r, sy = e.sy || 1.08, top = e.top == null ? 0.2 : e.top, tilt = (e.tilt || 0) * (e.s || 1), yl = r * (1.2 - top), ct = Math.cos(tilt), st = Math.sin(tilt), out = e.s || 1;
  const pts = []; for (let i = 0; i <= 14; i++) { const t = -0.98 + (i / 14) * 1.96; const x0 = 1.12 * r * t, y0 = yl - 0.55 * r * Math.sqrt(Math.max(0, 1 - t * t)) - r * 0.02; const x = x0 * ct - y0 * st + 0 , y = x0 * st + y0 * ct; const z = r * 0.78 * Math.sqrt(Math.max(0.08, 1 - (x / r) ** 2 - (y / (r * sy)) ** 2)) + r * 0.2; pts.push(new THREE.Vector3(x, y, z)); }
  const gb = new GB(); const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, r * 0.07, 6, false); gb.add(tg, 0x1b1020);
  if (e.lash !== 0) for (let k = 0; k < 3; k++) { const p0 = pts[10 + k], a = 0.35 + k * 0.28; const tip = new THREE.Vector3(p0.x + out * r * (0.22 + k * 0.06), p0.y + r * (0.08 + a * 0.3), p0.z + r * 0.02); gb.add(new THREE.TubeGeometry(new THREE.LineCurve3(p0, tip), 2, r * 0.035, 4, false), 0x1b1020); }
  g = gb.build(false, 0.05); lashGeoC.set(key, g); return g;
}
function buildEye(e) {
  const g = new THREE.Group(); const r = e.r, sy = e.sy || 1.08; const key = r + '_' + sy; let sg = sclGeoC.get(key);
  if (!sg) { sg = new THREE.SphereGeometry(r, 32, 24); sclGeoC.set(key, sg); }
  const sc = new THREE.Mesh(sg, sclMat); sc.scale.set(1, sy, 0.78); g.add(sc);
  g.add(new THREE.Mesh(irisGeo(e), irisMat(e.iris == null ? 0x6b3b2a : e.iris, !!e.slit)));
  g.add(new THREE.Mesh(glintGeo(e), glintMat)); if (e.top != null) g.add(new THREE.Mesh(lashGeo(e), lashMat)); return g;
}
const shadowGeo = new THREE.PlaneGeometry(1, 1);
const shadowMat = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(30,10,50,0.62)'); gr.addColorStop(0.5, 'rgba(30,10,50,0.34)'); gr.addColorStop(1, 'rgba(30,10,50,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); })();
const geoCache = new Map();

export function buildChar(id) {
  const pk = packs[id]; const M = pk.meta; const root = new THREE.Group(); const ud = { h: M.h, headY: M.headY, arms0: M.arms0 || 2.4 }; if (M.hover) ud.hover = M.hover; if (M.robot) ud.robot = true;
  const P = pk.parts, node = {};
  const CM = id === 'croqueta' ? charMatCrust : charMat; const mk = (name, parent) => { const info = P[name].info; const gp = new THREE.Group(); gp.position.set(...info.pivot); gp.add(mesh(P[name], name !== 'mouth', CM)); node[name] = gp; (parent || root).add(gp); return gp; };
  const body = new THREE.Group(); const bm = mesh(P.body, true, CM); root.add(bm); ud.bodyM = bm;
  if (M.legs) ud.legs = ['legL', 'legR'].map((n) => mk(n));
  const head = mk('head'); ud.head = head;
  // ojos y párpados
  for (const e of M.eyes) { const key = id + ':' + JSON.stringify(e); const em = buildEye(e); em.position.set(...e.p); em.rotation.set(e.rx || 0, (e.s || 0) * (e.ry == null ? 0.04 : e.ry), 0); head.add(em); }
  if (M.lids) { ud.lids = []; for (const [x, y, z, r, col] of M.lids) { const gb = new GB(); gb.add(new THREE.SphereGeometry(r * 1.1, 18, 12), col, 0, 0, 0, 0, 0, 0, 1.08, 1.14, 0.92); const lm = new THREE.Mesh(tagGeo(gb.build(false, 0.05), 1), CM); lm.position.set(x, y, z); lm.visible = false; head.add(lm); ud.lids.push(lm); } }
  const mouth = mk('mouth', head); ud.mouth = mouth;
  ud.arms = ['armL', 'armR'].map((n, i) => { const a = mk(n); a.rotation.z = -(i ? 1 : -1) * ud.arms0; return a; });
  for (const x of M.extras || []) { const g = mk(x.name, x.parent === 'head' ? head : null); ud[x.name] = g; }
  const X = EXTRA[id]; if (X) ud.extra = X(ud, root);
  // v10: centrar el personaje: el pivote (raíz) queda en el centro de los pies/cuerpo (sin contar brazos ni accesorios)
  { const bb = new THREE.Box3(), t = new THREE.Box3(); const add = (geo, ox, oy, oz) => { t.copy(geo.boundingBox); t.min.x += ox; t.max.x += ox; t.min.z += oz; t.max.z += oz; bb.union(t); };
    add(P.body.geo, 0, 0, 0); if (M.legs) for (const n of ['legL', 'legR']) { const pv = P[n].info.pivot; add(P[n].geo, pv[0], pv[1], pv[2]); }
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2; ud.cx = cx; ud.cz = cz; if (Math.abs(cx) + Math.abs(cz) > 1e-4) for (const c of root.children) { c.position.x -= cx; c.position.z -= cz; } }
  // v13: sombra de contacto suave bajo el personaje (decal compartido)
  { const bb = new THREE.Box3().setFromObject(root); const w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.9 + 0.5; const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.scale.set(w, w * 0.85, 1); sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.02 - (M.hover || 0), 0); sh.renderOrder = -1; sh.userData.contact = true; root.add(sh); ud.contact = sh; }
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
