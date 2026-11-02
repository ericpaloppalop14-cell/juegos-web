import { THREE, GB, BEND, bendMat, clamp, lerp, smooth, softTexture, rng } from './util.js?v=2';
import { DIST, DIST_LEN } from './data.js?v=2';
import { facadeTex, roadTex, signAtlas, skyTex, bannerTex } from './tex.js?v=2';
import { buildTile, TL } from './scenery.js?v=2';
import { M } from './rig.js?v=2';

export const NV = 4; // tile variants per side
export const distIdxAt = d => d < 0 ? 0 : Math.floor(d / DIST_LEN) % DIST.length;

const HALO_VS = `uniform float uBend; uniform float uBendX; uniform float uScale; attribute float size; varying vec3 vC; varying float vF;
void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); mv.y-=uBend*mv.z*mv.z; mv.x+=uBendX*mv.z*mv.z; gl_Position=projectionMatrix*mv; gl_PointSize=size*uScale/max(0.5,-mv.z); vF=clamp(1.-(-mv.z-50.)/100.,0.,1.); }`;
const HALO_FS = `uniform sampler2D uMap; uniform float uInt; varying vec3 vC; varying float vF; void main(){ float a=texture2D(uMap,gl_PointCoord).a; gl_FragColor=vec4(vC,a*uInt*vF); }`;

export class World {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer; this.root = new THREE.Group(); scene.add(this.root);
    this.tiles = []; // [di][side(0/1)][variant]
    this.chunks = []; this.curDist = 0;
    this.env = { fog: new THREE.Color(), hemiS: new THREE.Color(), hemiG: new THREE.Color(), sun: new THREE.Color() };
  }
  async init(progress) {
    const R = this.renderer;
    this.signs = signAtlas(); this.softT = softTexture(64);
    this.glowMat = bendMat(new THREE.MeshBasicMaterial({ vertexColors: true, map: this.signs }));
    this.haloMat = new THREE.ShaderMaterial({ uniforms: { uBend: BEND.uBend, uBendX: BEND.uBendX, uScale: { value: 700 }, uMap: { value: this.softT }, uInt: { value: 0.9 } }, vertexShader: HALO_VS, fragmentShader: HALO_FS, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.facadeMat = []; this.roadMat = []; this.skyTex = []; this.banner = [];
    const emi = [0, 0, 0, 0.35, 0.55, 1.25];
    for (let i = 0; i < DIST.length; i++) {
      const d = DIST[i], ft = facadeTex(d.id), rt = roadTex(d.id);
      this.facadeMat.push(bendMat(new THREE.MeshStandardMaterial({ map: ft.map, emissiveMap: ft.em, emissive: 0xffffff, emissiveIntensity: emi[i], vertexColors: true, roughness: 0.85, metalness: 0.0 })));
      const rm = new THREE.MeshStandardMaterial({ map: rt.map, roughness: d.id === 'noche' ? 0.4 : 0.92, metalness: d.id === 'noche' ? 0.15 : 0 });
      if (d.id === 'noche') { rm.emissiveMap = rt.em; rm.emissive = new THREE.Color(0xffffff); rm.emissiveIntensity = 1.4; }
      rt.map.anisotropy = 8; this.roadMat.push(bendMat(rm));
      this.skyTex.push(skyTex(d.id, d));
      const c1 = '#' + new THREE.Color(d.sky[1]).getHexString(), c2 = '#' + new THREE.Color(d.sky[0]).getHexString();
      const cols = [['#2f9a52', '#1b6a38'], ['#e8721a', '#b8420a'], ['#18a8e8', '#0a6ab0'], ['#e8a01a', '#9a5a0a'], ['#c8307a', '#6a1a6a'], ['#8a2ae8', '#3a0a8a']][i];
      this.banner.push(bannerTex(d.name, d.sub, cols[0], cols[1]));
    }
    // tiles
    this.tiles = DIST.map(() => [[], []]);
    for (let di = 0; di < DIST.length; di++) {
      for (let v = 0; v < NV; v++) for (let si = 0; si < 2; si++) this.tiles[di][si].push(buildTile(di, si ? 1 : -1, v + 1));
      if (progress) progress((di + 1) / DIST.length); await new Promise(r => setTimeout(r, 0));
    }
    // sky cylinder
    this.skyMat = new THREE.ShaderMaterial({ uniforms: { tA: { value: this.skyTex[0] }, tB: { value: this.skyTex[0] }, k: { value: 0 } }, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z=gl_Position.w*0.9999; }',
      fragmentShader: 'uniform sampler2D tA; uniform sampler2D tB; uniform float k; varying vec2 vUv; void main(){ vec4 a=texture2D(tA,vUv), b=texture2D(tB,vUv); gl_FragColor=vec4(mix(a.rgb,b.rgb,k),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
    this.sky = new THREE.Mesh(new THREE.CylinderGeometry(300, 300, 380, 40, 1, true), this.skyMat); this.sky.renderOrder = -10; this.sky.frustumCulled = false; this.scene.add(this.sky);
    // arch
    const ag = new GB(); ag.rb(0.9, 9.2, 0.9, 0.2, -5.6, 4.6, 0, 0xffffff); ag.rb(0.9, 9.2, 0.9, 0.2, 5.6, 4.6, 0, 0xffffff); ag.rb(12.3, 1.9, 0.9, 0.3, 0, 9.0, 0, 0xffffff);
    for (let i = 0; i < 9; i++) ag.sp(0.17, -5.2 + i * 1.3, 10.1, 0.5, 0xffffff, { seg: 6 });
    this.archGeo = ag.build(); this.archMat = M.v; this.bannerGeo = new THREE.PlaneGeometry(11.4, 2.85);
    // chunk pool
    for (let i = 0; i < 11; i++) this.chunks.push(this.makeChunk());
    this.lightsInit();
    this.scene.fog = new THREE.Fog(0xffffff, 40, 170);
  }
  makeChunk() {
    const g = new THREE.Group(); const ch = { g, idx: null, di: 0 };
    ch.road = new THREE.Mesh(new THREE.PlaneGeometry(9, TL), this.roadMat[0]); ch.road.rotation.x = -Math.PI / 2; ch.road.receiveShadow = true; g.add(ch.road);
    ch.side = [0, 1].map(() => {
      const o = { F: new THREE.Mesh(undefined, this.facadeMat[0]), P: new THREE.Mesh(undefined, M.v), G: new THREE.Mesh(undefined, this.glowMat), H: new THREE.Points(undefined, this.haloMat) };
      o.P.receiveShadow = true; o.F.receiveShadow = false; for (const k in o) { o[k].frustumCulled = true; g.add(o[k]); } o.H.renderOrder = 4; return o;
    });
    ch.arch = new THREE.Group(); const am = new THREE.Mesh(this.archGeo, this.archMat); am.castShadow = false; ch.arch.add(am); ch.bannerMesh = new THREE.Mesh(this.bannerGeo, new THREE.MeshBasicMaterial({ map: this.banner[0], fog: false })); bendMat(ch.bannerMesh.material); ch.bannerMesh.position.set(0, 9.0, 0.5); ch.arch.add(ch.bannerMesh);
    const bb = ch.bannerMesh.clone(); bb.rotation.y = Math.PI; bb.position.z = -0.5; bb.material = ch.bannerMesh.material; ch.arch.add(bb);
    ch.arch.position.z = TL / 2 - 1; g.add(ch.arch); ch.arch.visible = false;
    g.visible = false; this.root.add(g); return ch;
  }
  setupChunk(ch, idx) {
    ch.idx = idx; const di = idx < 0 ? 0 : distIdxAt(idx * TL); ch.di = di; ch.g.position.set(0, 0, -(idx + 0.5) * TL); ch.g.visible = true;
    ch.road.material = this.roadMat[di];
    const R = rng(idx * 7919 + 13);
    for (let si = 0; si < 2; si++) {
      const t = this.tiles[di][si][Math.floor(R() * NV)], o = ch.side[si];
      o.F.geometry = t.F || new THREE.BufferGeometry(); o.F.visible = !!t.F; o.F.material = this.facadeMat[di];
      o.P.geometry = t.P; o.G.geometry = t.G || new THREE.BufferGeometry(); o.G.visible = !!t.G; o.H.geometry = t.H || new THREE.BufferGeometry(); o.H.visible = !!t.H;
    }
    const first = idx > 0 && (idx * TL) % DIST_LEN === 0;
    ch.arch.visible = first; if (first) { ch.bannerMesh.material.map = this.banner[di]; ch.bannerMesh.material.needsUpdate = true; }
  }
  lightsInit() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xcccccc, 1); this.scene.add(this.hemi);
    this.sunL = new THREE.DirectionalLight(0xffffff, 2); this.sunL.castShadow = true; const sc = this.sunL.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 24; sc.bottom = -20; sc.near = 1; sc.far = 80; this.sunL.shadow.mapSize.set(1024, 1024); this.sunL.shadow.bias = -0.0006; this.sunL.shadow.normalBias = 0.03;
    this.scene.add(this.sunL); this.scene.add(this.sunL.target);
  }
  setShadows(on, size) { this.sunL.castShadow = on; if (size && this.sunL.shadow.mapSize.x !== size) { this.sunL.shadow.mapSize.set(size, size); if (this.sunL.shadow.map) { this.sunL.shadow.map.dispose(); this.sunL.shadow.map = null; } } }
  /** distance in metres (positive forward), center z of player */
  update(dist, pz, camPos, dt, viewH, fov, time) {
    // chunks
    const pi = Math.floor(dist / TL); const lo = pi - 2, hi = pi + 8;
    const have = new Map(); this.chunks.forEach(c => { if (c.idx != null && (c.idx < lo || c.idx > hi)) { c.idx = null; c.g.visible = false; c.arch.visible = false; } else if (c.idx != null) have.set(c.idx, c); });
    for (let i = lo; i <= hi; i++) if (!have.has(i)) { const c = this.chunks.find(c => c.idx == null); if (c) this.setupChunk(c, i); }
    // environment blend
    const di0 = distIdxAt(dist), di1 = (di0 + 1) % DIST.length; const into = dist % DIST_LEN;
    const k = dist < 0 ? 0 : smooth(clamp((into - (DIST_LEN - 90)) / 130, 0, 1));
    const A = DIST[di0], B = DIST[di1]; const e = this.env;
    e.fog.set(A.fog).lerp(new THREE.Color(B.fog), k); this.scene.fog.color.copy(e.fog); this.scene.fog.near = lerp(A.near, B.near, k); this.scene.fog.far = lerp(A.far, B.far, k);
    this.scene.background = e.fog;
    e.hemiS.set(A.hemi[0]).lerp(new THREE.Color(B.hemi[0]), k); e.hemiG.set(A.hemi[1]).lerp(new THREE.Color(B.hemi[1]), k); this.hemi.color.copy(e.hemiS); this.hemi.groundColor.copy(e.hemiG); this.hemi.intensity = lerp(A.hemi[2], B.hemi[2], k);
    e.sun.set(A.sun[0]).lerp(new THREE.Color(B.sun[0]), k); this.sunL.color.copy(e.sun); this.sunL.intensity = lerp(A.sun[1], B.sun[1], k);
    const ld = A.light.map((v, i) => lerp(v, B.light[i], k)); const sn = 1 / Math.hypot(ld[0], ld[1], ld[2]) * 40;
    // snap shadow target to texel grid
    const tx = Math.round(0 / 0.05) * 0.05, tz = Math.round((pz - 6) / 0.05) * 0.05;
    this.sunL.target.position.set(0, 0, tz); this.sunL.position.set(ld[0] * sn, ld[1] * sn, tz + ld[2] * sn);
    this.skyMat.uniforms.tA.value = this.skyTex[di0]; this.skyMat.uniforms.tB.value = this.skyTex[di1]; this.skyMat.uniforms.k.value = k;
    this.sky.position.set(camPos.x, camPos.y + 6, camPos.z);
    this.haloMat.uniforms.uScale.value = viewH / (2 * Math.tan(fov * Math.PI / 360));
    this.haloMat.uniforms.uInt.value = lerp(DIST[di0].id === 'noche' || DIST[di0].id === 'fiestas' ? 1 : 0.25, DIST[di1].id === 'noche' || DIST[di1].id === 'fiestas' ? 1 : 0.25, k);
    BEND.uBendX.value = Math.sin(dist * 0.0013) * 0.00045;
    this.curDist = di0; this.k = k; this.nextDist = di1;
  }
}
