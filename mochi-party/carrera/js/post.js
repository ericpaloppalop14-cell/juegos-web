// ======================================================================
//  MOCHI PARTY · posprocesado "noche 3" (25-10-2026): bloom suave, gradación de color,
//  viñeta y brillo de lente. Calidad automática por fps: 2 = completo, 1 = solo color, 0 = directo.
//  ?fx=0|1|2 fuerza un nivel. No toca la jugabilidad.
// ======================================================================
import * as THREE from 'three';
const Q = new URLSearchParams(location.search);
const FORCE = Q.has('fx') ? +Q.get('fx') : (Q.get('q') === 'low' ? 0 : null);
const VS = 'varying vec2 vUv; void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }';
const tri = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); return g; };
export function makePost(renderer, opts = {}) {
  const P = { lv: FORCE ?? (innerWidth * innerHeight * Math.min(devicePixelRatio || 1, 3) ** 2 > 4.5e6 ? 1 : 2), str: opts.bloom ?? .4, sat: opts.sat ?? 1.26, con: opts.con ?? 1.15, vig: opts.vig ?? .26 };
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(tri()); quad.frustumCulled = false; sc.add(quad);
  const mk = (s) => new THREE.WebGLRenderTarget(4, 4, { samples: s, depthBuffer: s >= 0, type: THREE.HalfFloatType });
  let rtS = null, rtA = null, rtB = null, W = 0, H = 0;
  const mBright = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, px: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
      vec3 s(vec2 o){ return texture2D(t, vUv + o * px).rgb; }
      void main(){ vec3 c = (s(vec2(-1.,-1.)) + s(vec2(1.,-1.)) + s(vec2(-1.,1.)) + s(vec2(1.,1.))) * .25;
        float l = max(c.r, max(c.g, c.b)); float k = smoothstep(.86, 1.45, l); gl_FragColor = vec4(c * k, 1.); }` });
  const mBlur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D t; uniform vec2 d; varying vec2 vUv;
      void main(){ vec3 c = texture2D(t, vUv).rgb * .227;
        c += (texture2D(t, vUv + d * 1.384).rgb + texture2D(t, vUv - d * 1.384).rgb) * .316;
        c += (texture2D(t, vUv + d * 3.230).rgb + texture2D(t, vUv - d * 3.230).rgb) * .070;
        gl_FragColor = vec4(c, 1.); }` });
  const mComp = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, b: { value: null }, str: { value: P.str }, sat: { value: P.sat }, con: { value: P.con }, vig: { value: P.vig }, asp: { value: 1 }, useB: { value: 1 } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D t, b; uniform float str, sat, con, vig, asp, useB; varying vec2 vUv;
      vec3 toS(vec3 c){ c = max(c, 0.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
      void main(){ vec3 c = texture2D(t, vUv).rgb;
        if (useB > .5) { vec3 bl = texture2D(b, vUv).rgb; c += bl * str; }
        c = toS(c);
        // gradación: contraste suave en S, saturación, sombras algo frías y luces cálidas
        float l = dot(c, vec3(.299, .587, .114));
        float sa = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
        c = mix(vec3(l), c, 1. + (sat - 1.) * clamp(1.4 - sa * 1.6, 0., 1.4)); // vibrance: aviva los pasteles, no satura más lo ya intenso
        c = (c - .5) * con + .5;
        c += vec3(.025, .006, -.02) * smoothstep(.45, 1., l) + vec3(-.012, -.004, .03) * (1. - smoothstep(0., .45, l));
        vec2 q = (vUv - .5) * vec2(asp, 1.); float v = smoothstep(.35, 1.05, length(q) * 1.05);
        c *= 1. - v * vig;
        gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }` });
  function ensure() { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); if (s.x === W && s.y === H && rtS) return; W = s.x; H = s.y;
    if (!rtS) { rtS = mk(innerWidth * innerHeight > 500000 ? 2 : 4); rtA = mk(-1); rtB = mk(-1); }
    rtS.setSize(W, H); const w4 = Math.max(4, W >> 2), h4 = Math.max(4, H >> 2); rtA.setSize(w4, h4); rtB.setSize(w4, h4);
    mBright.uniforms.px.value.set(1 / W, 1 / H); mComp.uniforms.asp.value = W / H; }
  const pass = (m, tgt) => { quad.material = m; renderer.setRenderTarget(tgt); renderer.render(sc, cam); };
  // calidad automática: baja si el móvil no llega a ~45 fps, sube si va sobrado
  let n = 0, t0 = 0, good = 0;
  function auto() { if (FORCE != null) return; const now = performance.now(); if (!t0) t0 = now; n++; if (now - t0 < 2000) return; const fps = n * 1000 / (now - t0); n = 0; t0 = now;
    if (fps < 45 && P.lv > 0) { P.lv--; good = 0; } else if (fps > 58) { if (++good > 3 && P.lv < 2) { P.lv++; good = 0; } } else good = 0; }
  P.render = (scene, camera) => {
    auto();
    if (P.lv <= 0) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    try {
      ensure(); renderer.setRenderTarget(rtS); renderer.render(scene, camera);
      const bl = P.lv >= 2; mComp.uniforms.useB.value = bl ? 1 : 0;
      if (bl) { mBright.uniforms.t.value = rtS.texture; pass(mBright, rtA);
        for (let i = 0; i < 2; i++) { mBlur.uniforms.t.value = rtA.texture; mBlur.uniforms.d.value.set((1 + i) / rtA.width, 0); pass(mBlur, rtB); mBlur.uniforms.t.value = rtB.texture; mBlur.uniforms.d.value.set(0, (1 + i) / rtA.height); pass(mBlur, rtA); } }
      mComp.uniforms.t.value = rtS.texture; mComp.uniforms.b.value = rtA.texture; pass(mComp, null);
    } catch (e) { console.warn('post', e); P.lv = 0; renderer.setRenderTarget(null); renderer.render(scene, camera); }
  };
  window.__post = P; return P;
}
