// fx-post.js — posproceso común (noche 25-10-2026): bloom suave + gradación de color (saturación, contraste,
// tono cálido, viñeta) con calidad automática. Si el móvil va lento se apaga solo y se dibuja como antes.
import * as THREE from 'three';
import { EffectComposer } from './addons/postprocessing/EffectComposer.js';
import { RenderPass } from './addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from './addons/postprocessing/ShaderPass.js';
import { OutputPass } from './addons/postprocessing/OutputPass.js';
const Grade = { uniforms: { tDiffuse: { value: null }, sat: { value: 1.14 }, con: { value: 1.06 }, vig: { value: .28 }, warm: { value: .03 }, lift: { value: .015 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform sampler2D tDiffuse;uniform float sat,con,vig,warm,lift;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.299,.587,.114));c.rgb=mix(vec3(l),c.rgb,sat);c.rgb=(c.rgb-.5)*con+.5+lift;c.r+=warm;c.b-=warm*.6;vec2 d=vUv-.5;c.rgb*=1.-vig*smoothstep(.25,.85,dot(d,d)*2.2);gl_FragColor=vec4(clamp(c.rgb,0.,1.),c.a);}' };
export function makePost(renderer, scene, camera, o = {}) {
  const off = /nopost/.test(location.search), force = /forcepost/.test(location.search); let on = !off, comp = null, bloom, rp, grade;
  const st = { on, lv: on ? 1 : 0, fps: 60 };
  function build() { if (comp) return; const s = renderer.getSize(new THREE.Vector2());
    comp = new EffectComposer(renderer); rp = new RenderPass(scene, camera); comp.addPass(rp);
    bloom = new UnrealBloomPass(new THREE.Vector2(s.x / 2, s.y / 2), o.bloom ?? .32, o.radius ?? .5, o.threshold ?? .82); comp.addPass(bloom);
    comp.addPass(new OutputPass()); grade = new ShaderPass(Grade); for (const k of ['sat', 'con', 'vig', 'warm', 'lift']) if (o[k] != null) grade.uniforms[k].value = o[k]; comp.addPass(grade);
    comp.setPixelRatio(renderer.getPixelRatio()); comp.setSize(s.x, s.y); }
  let fr = 0, t0 = performance.now(), bad = 0;
  function render(sc, cam) { sc = sc || scene; cam = cam || camera; fr++; const now = performance.now();
    if (now - t0 > 2000) { st.fps = fr * 1000 / (now - t0); fr = 0; t0 = now; if (!force && st.on && st.fps < (o.minFps || 42)) { if (++bad >= 2) { st.on = false; st.lv = 0; } } else bad = 0; }
    if (!st.on) { renderer.render(sc, cam); return; }
    try { build(); rp.scene = sc; rp.camera = cam; const s = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
      if (comp._w !== s.x || comp._h !== s.y || comp._pr !== pr) { comp._w = s.x; comp._h = s.y; comp._pr = pr; comp.setPixelRatio(pr); comp.setSize(s.x, s.y); }
      comp.render(); } catch (e) { console.warn('fx-post', e); st.on = false; renderer.render(sc, cam); } }
  return { render, st, get bloom() { return bloom; } };
}
