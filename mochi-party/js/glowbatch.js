// MOCHI PARTY · glowbatch (o46): TODOS los destellos aditivos (chispas, estrellas, halos de guirnalda, nubes, sol, aro) se dibujan en UNA sola llamada de dibujo.
// Cada destello es un Object3D ligero (posición/escala/opacidad/color como un Sprite) y un shader «billboard» instanciado reproduce el degradado de glowTex() de forma analítica.
import * as THREE from 'three';

const CACHE = new Map(), tmpC = new THREE.Color();
const rawRGB = s => { let v = CACHE.get(s); if (!v) { tmpC.setStyle(s, THREE.NoColorSpace); CACHE.set(s, v = [tmpC.r, tmpC.g, tmpC.b]); } return v; };

export const HOOK = { glow: null, cloud: null }; // lotes activos (los usa mundo3d.js para sus destellos y nubes)

export class GlowSpr extends THREE.Object3D {
  constructor(color, size, op, mode = 0) {
    super(); this.isGlow = true; this.scale.setScalar(size); const c = rawRGB(color);
    this.material = { mode, opacity: op, r: c[0], g: c[1], b: c[2], setCol(s) { const v = rawRGB(s); this.r = v[0]; this.g = v[1]; this.b = v[2]; } };
  }
}

export function makeGlowBatch(scene, max = 520, { tex = null, order = 5, additive = true, raw = false, core = .25 } = {}) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0]), 3)); geo.setIndex([0, 1, 2, 0, 2, 3]);
  const aP = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage), aC = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const aA = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2).setUsage(THREE.DynamicDrawUsage); geo.setAttribute('iP', aP); geo.setAttribute('iC', aC); geo.setAttribute('iA', aA); // iA = proporción alto/ancho + modo de degradado // iP = xyz + tamaño · iC = rgb + opacidad
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false, uniforms: { map: { value: tex } }, defines: Object.assign(tex ? { USE_TEX: 1 } : {}, raw ? { SRGB_IN: 1 } : {}, { CORE: core.toFixed(3) }),
    vertexShader: 'attribute vec4 iP;\nattribute vec4 iC;\nattribute vec2 iA;\nvarying vec4 vC;\nvarying vec2 vU;\nvarying float vM;\nvoid main(){ vU = position.xy * 2.0; vC = iC; vM = iA.y; vec4 mv = viewMatrix * vec4(iP.xyz, 1.0); mv.xy += position.xy * vec2(iP.w, iP.w * iA.x); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map;\nvarying vec4 vC;\nvarying vec2 vU;\nvarying float vM;\nvoid main(){\n#ifdef USE_TEX\n vec4 t = texture2D(map, vU * .5 + .5); gl_FragColor = vec4(t.rgb * vC.rgb, t.a * vC.a);\n#else\n float d = length(vU); if (d >= 1.0) discard; vec3 c; float a;\n if (vM < .5) { c = mix(vec3(1.0), vC.rgb, min(d / CORE, 1.0)); a = d < CORE ? 1.0 : 1.0 - (d - CORE) / (1.0 - CORE);\n#ifdef SRGB_IN\n c = mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c));\n#endif\n } else { c = vC.rgb; a = d < .4 ? mix(.9, .35, d / .4) : mix(.35, 0.0, (d - .4) / .6); }\n gl_FragColor = vec4(c, a * vC.a);\n#endif\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = order; mesh.matrixAutoUpdate = false; geo.instanceCount = 0; mesh.name = 'glowBatch'; scene.add(mesh);
  const perm = [], dyn = []; let n = 0;
  const ep = aP.array, ec = aC.array, ea = aA.array;
  const live = o => { for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q === scene) return true; } return false; };
  mesh.onBeforeRender = () => { // las matrices del mundo ya están al día (se llama justo antes de dibujar)
    n = 0; const run = L => { for (let i = 0; i < L.length && n < max; i++) { const o = L[i]; if (!live(o)) continue; const m = o.matrixWorld.elements, k = n * 4;
      ep[k] = m[12]; ep[k + 1] = m[13]; ep[k + 2] = m[14]; ep[k + 3] = Math.hypot(m[0], m[1], m[2]); const mt = o.material; ec[k] = mt.r; ec[k + 1] = mt.g; ec[k + 2] = mt.b; ec[k + 3] = mt.opacity; ea[n * 2] = Math.hypot(m[4], m[5], m[6]) / ep[k + 3]; ea[n * 2 + 1] = mt.mode; n++; } };
    run(perm); run(dyn); geo.instanceCount = n; aP.needsUpdate = aC.needsUpdate = aA.needsUpdate = true; aP.clearUpdateRanges(); aC.clearUpdateRanges(); aA.clearUpdateRanges(); aP.addUpdateRange(0, n * 4); aC.addUpdateRange(0, n * 4); aA.addUpdateRange(0, n * 2);
  };
  return { mesh, make(color, size, op, permanent, mode = 0) { const g = new GlowSpr(color, size, op, mode); (permanent ? perm : dyn).push(g); return g; }, reset() { dyn.length = 0; }, get count() { return n; } };
}
