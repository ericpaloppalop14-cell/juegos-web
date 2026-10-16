import * as THREE from './three.js?v=1';
import { createSim, TIERV, TSIZE, NCOL } from './sim.js?v=1';
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const SAVE = 'pompotropa_v1';
const S = Object.assign({ lead: 'pompi', mode: 0, diff: 0, snd: true, coins: 0, best: 0, owned: [], nick: '' }, JSON.parse(localStorage.getItem(SAVE) || '{}'));
const save = () => localStorage.setItem(SAVE, JSON.stringify(S));
window.ads = window.ads || { showRewarded(ok) { $('adfake').classList.remove('hide'); setTimeout(() => { $('adfake').classList.add('hide'); ok && ok(); }, 1500); } };
// ---------- sonido ----------
let AC = null, master;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .45; master.connect(AC.destination); } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); }
function tone(f, d = .12, type = 'sine', v = .2, f2 = null, delay = 0) { if (!AC || !S.snd) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02); }
let sndBudget = 0;
const sfx = { pop(t) { if (sndBudget > 6) return; sndBudget++; tone(700 - t * 120 + rnd(-60, 60), .09, 'sine', .14, 220); }, rec() { if (sndBudget > 6) return; sndBudget++; tone(880 + rnd(0, 200), .06, 'triangle', .1, 1400); },
  merge(t) { [0, 1, 2].forEach(i => tone(440 * (1 + t * .25) * [1, 1.26, 1.5][i], .14, 'triangle', .16, null, i * .05)); }, cd(n) { tone(n ? 520 : 880, n ? .15 : .35, 'square', .12); },
  clash() { tone(160, .2, 'sawtooth', .08, 90); }, win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .2, 'triangle', .18, null, i * .12)); }, lose() { tone(400, .5, 'sawtooth', .1, 120); } };
// ---------- render ----------
const canvas = $('c'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const DPR = Math.min(devicePixelRatio || 1, 2); let PR = Math.min(DPR, 1.75); renderer.setPixelRatio(PR); renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#cdb8ff'); scene.fog = new THREE.Fog('#cdb8ff', 90, 210);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .5, 400);
scene.add(new THREE.HemisphereLight('#ffffff', '#c9a8ff', 1.35)); const sun = new THREE.DirectionalLight('#fff4ea', 1.9); sun.position.set(25, 50, 30); scene.add(sun);
const fill = new THREE.DirectionalLight('#b8d8ff', .45); fill.position.set(-30, 20, -20); scene.add(fill);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
// material de goma: brillo suave + borde de luz + cara pintada en el shader (sin imágenes)
function gum(opt = {}) { const m = new THREE.MeshStandardMaterial(Object.assign({ color: '#ffffff', roughness: .48, metalness: 0, vertexColors: true }, opt));
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFace; varying float vFace; varying vec3 vON;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFace = aFace; vON = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFace; varying vec3 vON;')
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vFace > .5) { vec3 n = normalize(vON);
  if (n.z > 0.) { float sg = n.x < 0. ? -1. : 1.; vec2 e = vec2(n.x - sg * .3, n.y - .3);
    float eye = smoothstep(.125, .105, length(e * vec2(1., .82)));
    float h1 = smoothstep(.042, .028, length(e - vec2(-.035, .045))), h2 = smoothstep(.022, .012, length(e - vec2(.035, -.035)));
    float bl = smoothstep(.12, .02, length(vec2(abs(n.x) - .5, (n.y - .1) * 1.3)));
    vec2 mo = vec2(n.x, n.y - .14); float d = length(mo - vec2(0., .07));
    float mouth = smoothstep(.022, .01, abs(d - .085)) * step(mo.y, .0) * step(abs(n.x), .085);
    vec3 c = diffuseColor.rgb; c = mix(c, vec3(1., .42, .58), bl * .6); c = mix(c, vec3(.17, .07, .2), max(eye, mouth));
    c = mix(c, vec3(1.), (h1 + h2 * .8) * eye); diffuseColor.rgb = c; } }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ float fr = pow(1. - clamp(dot(normal, normalize(vViewPosition)), 0., 1.), 2.6); totalEmissiveRadiance += diffuseColor.rgb * .32 * fr + vec3(.05) * fr; }`); };
  return m; }
// ---------- geometría por piezas (vertex color = tono, aFace = lleva cara) ----------
const SPH = (w = 18, h = 12) => new THREE.SphereGeometry(1, w, h);
function part(g, p = 0, s = 1, r = 0, col = 1, face = 0) { if (!Array.isArray(p)) p = [0, 0, 0]; if (!Array.isArray(s)) s = [s, s, s]; if (!Array.isArray(r)) r = [0, 0, 0]; g = g.index ? g.toNonIndexed() : g.clone(); const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)); g.applyMatrix4(m);
  const n = g.attributes.position.count, c = new THREE.Color(), cols = new Float32Array(n * 3), fa = new Float32Array(n).fill(face);
  if (typeof col === 'number' && col <= 2) c.setRGB(col, col, col, THREE.SRGBColorSpace); else c.set(col); for (let i = 0; i < n; i++) c.toArray(cols, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.setAttribute('aFace', new THREE.BufferAttribute(fa, 1)); g.deleteAttribute('uv'); return g; }
function merge(list) { const out = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'color', 'aFace']) { const sz = list[0].attributes[k].itemSize, tot = list.reduce((a, g) => a + g.attributes[k].count, 0), arr = new Float32Array(tot * sz); let o = 0; for (const g of list) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; } out.setAttribute(k, new THREE.BufferAttribute(arr, sz)); } out.computeBoundingSphere(); return out; }
function bodyGeo(w = 22, h = 16) { const g = SPH(w, h), p = g.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i); y *= .9; if (y < -.55) y = -.55 + (y + .55) * .35; const k = 1 + Math.max(0, -y) * .08; p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k); } g.computeVertexNormals(); return g; }
const BODY = bodyGeo(), BODYL = bodyGeo(14, 10), CONE = new THREE.ConeGeometry(1, 1, 12), CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const feet = c => [part(SPH(8, 6), [-.36, -.52, .3], [.24, .14, .28], 0, c), part(SPH(8, 6), [.36, -.52, .3], [.24, .14, .28], 0, c)];
const UGEO = [ // niveles de pompón
  merge([part(BODYL, 0, 1, 0, 1, 1), part(SPH(8, 6), [-.55, .62, -.05], [.27, .27, .22], 0, .9), part(SPH(8, 6), [.55, .62, -.05], [.27, .27, .22], 0, .9), ...feet(.82)]),
  merge([part(BODY, 0, 1, 0, 1, 1), part(SPH(10, 8), [-.6, .6, -.05], [.28, .3, .22], 0, .9), part(SPH(10, 8), [.6, .6, -.05], [.28, .3, .22], 0, .9), part(CYL, [0, 1.0, 0], [.05, .3, .05], 0, .8), part(SPH(10, 8), [0, 1.2, 0], [.22, .22, .22], 0, .95), ...feet(.82)]),
  merge([part(BODY, 0, 1, 0, 1, 1), part(SPH(12, 8), [-.36, 1.05, -.05], [.2, .55, .17], [0, 0, .25], .92), part(SPH(12, 8), [.36, 1.05, -.05], [.2, .55, .17], [0, 0, -.25], .92),
    part(SPH(10, 8), [-.36, 1.05, .06], [.1, .38, .08], [0, 0, .25], '#ffd0e4'), part(SPH(10, 8), [.36, 1.05, .06], [.1, .38, .08], [0, 0, -.25], '#ffd0e4'), part(SPH(8, 6), [-.86, -.12, .2], [.2, .16, .16], 0, .9), part(SPH(8, 6), [.86, -.12, .2], [.2, .16, .16], 0, .9), ...feet(.82)]),
  merge([part(BODY, 0, 1, 0, 1, 1), part(SPH(12, 8), [-.62, .62, -.05], [.3, .32, .24], 0, .9), part(SPH(12, 8), [.62, .62, -.05], [.3, .32, .24], 0, .9), part(SPH(8, 6), [-.88, -.1, .2], [.2, .16, .16], 0, .9), part(SPH(8, 6), [.88, -.1, .2], [.2, .16, .16], 0, .9),
    part(SPH(16, 8, 0), [0, -.18, -.78], [.95, .6, .2], [-.3, 0, 0], '#ff3b6b'), ...feet(.82)])];
const CROWN = (() => { const L = [part(new THREE.CylinderGeometry(1, 1.05, .35, 16, 1, true), [0, 0, 0], [.42, 1, .42], 0, '#ffc21a')]; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; L.push(part(CONE, [Math.cos(a) * .4, .32, Math.sin(a) * .4], [.12, .32, .12], 0, '#ffc21a')); L.push(part(SPH(8, 6), [Math.cos(a) * .4, .52, Math.sin(a) * .4], [.07, .07, .07], 0, i % 2 ? '#ff4697' : '#3fd4ff')); }
  L.push(part(SPH(8, 6), [0, .02, .43], [.09, .09, .05], 0, '#ff4697')); return merge(L); })();
const UCOL = ['#ff5aa6', '#ffc72c', '#2fd69a', '#3fa9ff', '#a77bff'].map(c => new THREE.Color(c)), UCNAME = ['rosa', 'amarillo', 'menta', 'azul', 'lila'];
const PCOL = ['#ff3d8b', '#2f8fff', '#ff9d00', '#1fbf62', '#8f4dff', '#ff6a2b', '#00b3b8', '#e042cf'];
// ---------- líderes ----------
const LEADS = [
  { id: 'pompi', n: 'Pompi', c: '#fff6ee', b: g => [part(SPH(12, 8), [-.6, .6, -.05], [.3, .3, .22], 0, '#ffd6e6'), part(SPH(12, 8), [.6, .6, -.05], [.3, .3, .22], 0, '#ffd6e6'), part(SPH(12, 8), [0, 1.05, 0], [.24, .24, .24], 0, '#ff5aa6')] },
  { id: 'osito', n: 'Osito', c: '#ffb46e', b: g => [part(SPH(12, 8), [-.62, .66, -.1], [.32, .32, .2], 0, '#e88a45'), part(SPH(12, 8), [.62, .66, -.1], [.32, .32, .2], 0, '#e88a45'), part(SPH(10, 8), [-.62, .66, .02], [.18, .18, .12], 0, '#ffd9b0'), part(SPH(10, 8), [.62, .66, .02], [.18, .18, .12], 0, '#ffd9b0')] },
  { id: 'conejo', n: 'Conejita', c: '#ffc7df', b: g => [part(SPH(12, 8), [-.33, 1.15, -.05], [.2, .6, .16], [0, 0, .2], '#ffc7df'), part(SPH(12, 8), [.33, 1.15, -.05], [.2, .6, .16], [0, 0, -.2], '#ffc7df'), part(SPH(10, 8), [-.33, 1.15, .07], [.1, .42, .08], [0, 0, .2], '#ff7fb6'), part(SPH(10, 8), [.33, 1.15, .07], [.1, .42, .08], [0, 0, -.2], '#ff7fb6')] },
  { id: 'gato', n: 'Gato Nube', c: '#e6f5ff', prem: 1, d: 'Gatito de nube con orejas puntiagudas y algodón alrededor. Aura de reclutar +10 %.',
    b: g => { const L = [part(CONE, [-.48, .82, 0], [.26, .45, .2], [0, 0, .35], '#bfe3ff'), part(CONE, [.48, .82, 0], [.26, .45, .2], [0, 0, -.35], '#bfe3ff')]; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; L.push(part(SPH(10, 8), [Math.cos(a) * 1.0, -.35 + Math.sin(i * 2) * .1, Math.sin(a) * 1.0], [.38, .3, .38], 0, '#ffffff')); }
      L.push(part(SPH(10, 8), [0, -.2, -1.05], [.18, .18, .5], [.6, 0, 0], '#bfe3ff')); return L; } },
  { id: 'dragon', n: 'Dragón Gominola', c: '#63e08c', prem: 1, d: 'Dragoncito de gominola con crestas, alas y cola. Aura de reclutar +10 %.',
    b: g => { const L = []; for (let i = 0; i < 4; i++) L.push(part(CONE, [0, .85 - i * .32, -.25 - i * .25], [.16, .34, .16], [-.4 - i * .35, 0, 0], '#ffcf3a'));
      L.push(part(SPH(10, 8), [-.95, .25, -.25], [.45, .3, .08], [0, .5, .5], '#b3ffcf'), part(SPH(10, 8), [.95, .25, -.25], [.45, .3, .08], [0, -.5, -.5], '#b3ffcf'), part(CONE, [0, -.35, -1.2], [.25, .9, .25], [-1.9, 0, 0], '#4fcf79'), part(CONE, [-.3, .85, .05], [.09, .25, .09], [0, 0, .3], '#fff2b0'), part(CONE, [.3, .85, .05], [.09, .25, .09], [0, 0, -.3], '#fff2b0')); return L; } },
  { id: 'uni', n: 'Unicornio Fresa', c: '#ffa9cc', prem: 1, d: 'Unicornio de fresa con cuerno dorado y crin de colores. Aura de reclutar +10 %.',
    b: g => { const L = [part(CONE, [0, 1.15, .25], [.13, .6, .13], [.3, 0, 0], '#ffd23f')], M = ['#ff5aa6', '#ffc72c', '#3fa9ff', '#a77bff', '#2fd69a']; for (let i = 0; i < 5; i++) L.push(part(SPH(10, 8), [0, .8 - i * .25, -.55 - i * .12], [.26, .26, .26], 0, M[i]));
      L.push(part(SPH(10, 8), [-.5, .72, 0], [.14, .26, .12], [0, 0, .4], '#ffa9cc'), part(SPH(10, 8), [.5, .72, 0], [.14, .26, .12], [0, 0, -.4], '#ffa9cc')); return L; } },
  { id: 'pulpo', n: 'Pulpo Menta', c: '#7af0cf', prem: 1, d: 'Pulpo de menta con 8 tentáculos rizados y gorrito. Aura de reclutar +10 %.',
    b: g => { const L = []; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + .2; L.push(part(SPH(10, 8), [Math.cos(a) * .82, -.55, Math.sin(a) * .82], [.22, .2, .42], [0, -a, 0], '#4fd9b3')); }
      L.push(part(new THREE.CylinderGeometry(.5, .6, .3, 14), [0, .85, 0], [1, 1, 1], [.1, 0, 0], '#ff5aa6'), part(SPH(10, 8), [0, 1.05, 0], [.16, .16, .16], 0, '#ffffff')); return L; } },
  { id: 'pingu', n: 'Pingüino Helado', c: '#4f7cff', prem: 1, d: 'Pingüino de helado de arándano con barriga de nata y bufanda. Aura de reclutar +10 %.',
    b: g => [part(SPH(14, 10), [0, -.25, .55], [.62, .5, .45], 0, '#ffffff'), part(CONE, [0, .02, 1.0], [.12, .2, .12], [1.57, 0, 0], '#ffb000'), part(new THREE.TorusGeometry(.78, .16, 8, 24), [0, .28, 0], [1, 1, 1], [1.57, 0, 0], '#ff4a5a'), part(SPH(10, 8), [-.95, -.1, 0], [.15, .45, .25], [0, 0, .4], '#3a62e0'), part(SPH(10, 8), [.95, -.1, 0], [.15, .45, .25], [0, 0, -.4], '#3a62e0')] }];
const LGEO = {}; const leadGeo = L => LGEO[L.id] || (LGEO[L.id] = merge([part(BODY, 0, 1, 0, L.c, 1), ...feet(new THREE.Color(L.c).multiplyScalar(.82).getStyle()).map(g => g), ...L.b()]));
const leadById = id => LEADS.find(l => l.id === id) || LEADS[0];
const isOwned = L => !L.prem || S.owned.includes(L.id);
// ---------- arena ----------
const ARENA = 62;
function floorTex() { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#f3dfff'; x.fillRect(0, 0, 256, 256);
  const T = ['#fff3f8', '#ffe9f2', '#f6ecff', '#fff7e9']; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = T[(i + j * 3) % 4]; const r = 12; x.beginPath(); x.roundRect(i * 64 + 3, j * 64 + 3, 58, 58, r); x.fill(); x.fillStyle = '#ffffff70'; x.beginPath(); x.roundRect(i * 64 + 8, j * 64 + 6, 40, 10, 5); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(15, 15); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }
const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA + .5, 96), new THREE.MeshStandardMaterial({ map: floorTex(), roughness: .85 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
const outer = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: '#b9a2ff', roughness: 1 })); outer.rotation.x = -Math.PI / 2; outer.position.y = -.6; scene.add(outer);
{ const g = new THREE.TorusGeometry(ARENA + 1.3, 1.2, 14, 200).toNonIndexed(), p = g.attributes.position, cols = new Float32Array(p.count * 3), A = new THREE.Color('#ff5aa6'), B = new THREE.Color('#ffffff');
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)); ((Math.floor(a / 6.283 * 72 + 72)) % 2 ? A : B).toArray(cols, i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); const rim = new THREE.Mesh(g, gum()); rim.rotation.x = -Math.PI / 2; rim.position.y = .3; scene.add(rim);
  // piruletas y montículos de mochi alrededor
  const N = 40, st = new THREE.InstancedMesh(part(CYL, 0, 1, 0, '#ffffff'), gum(), N), hd = new THREE.InstancedMesh(merge([part(new THREE.CylinderGeometry(1, 1, .35, 24), 0, 1, [1.57, 0, 0], 1), part(new THREE.TorusGeometry(.62, .1, 6, 24), [0, 0, .19], 1, 0, '#ffffff'), part(new THREE.TorusGeometry(.3, .09, 6, 18), [0, 0, .19], 1, 0, '#ffffff')]), gum(), N);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(); for (let i = 0; i < N; i++) { const a = i / N * 6.283 + rnd(-.05, .05), r = ARENA + rnd(6, 14), h = rnd(3, 6), x = Math.cos(a) * r, z = Math.sin(a) * r, s = rnd(1.6, 2.6);
    M.compose(V.set(x, h / 2 - .6, z), Q.identity(), new THREE.Vector3(.2, h, .2)); st.setMatrixAt(i, M); M.compose(V.set(x, h - .6 + s * .6, z), Q.setFromEuler(new THREE.Euler(0, -a + Math.PI / 2 + rnd(-.3, .3), rnd(-.2, .2))), new THREE.Vector3(s, s, s)); hd.setMatrixAt(i, M); hd.setColorAt(i, UCOL[i % 5]); }
  scene.add(st, hd); }
// ---------- instancias ----------
const CAP = [1500, 700, 260, 90];
const UIM = UGEO.map((g, i) => { const m = new THREE.InstancedMesh(g, gum(), CAP[i]); m.frustumCulled = false; m.count = 0; m.setColorAt(0, UCOL[0]); scene.add(m); return m; });
const CRIM = new THREE.InstancedMesh(CROWN, gum({ roughness: .3, metalness: .25 }), CAP[3] + 16); CRIM.frustumCulled = false; CRIM.count = 0; scene.add(CRIM);
const SHIM = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: .42, depthWrite: false }), 2700); SHIM.frustumCulled = false; SHIM.count = 0; SHIM.setColorAt(0, UCOL[0]); scene.add(SHIM); SHIM.renderOrder = -1;
const PUFF = new THREE.InstancedMesh(SPH(10, 8), gum({ vertexColors: false }), 400); PUFF.frustumCulled = false; PUFF.count = 0; PUFF.setColorAt(0, UCOL[0]); scene.add(PUFF);
const puffs = []; for (let i = 0; i < 400; i++) puffs.push({ l: 0 }); let pfi = 0;
function puff(x, z, col, n, s) { for (let i = 0; i < n; i++) { const q = puffs[pfi = (pfi + 1) % puffs.length], a = Math.random() * 6.283, v = rnd(3, 8) * s; Object.assign(q, { x, y: .5 * s + .3, z, vx: Math.cos(a) * v, vy: rnd(3, 8) * s, vz: Math.sin(a) * v, l: rnd(.35, .6), l0: .6, s: rnd(.18, .32) * s, c: col }); } }
const WAVES = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.85, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })); m.visible = false; scene.add(m); WAVES.push({ m, l: 0 }); } let wvi = 0;
function wave(x, z, r, col) { const w = WAVES[wvi = (wvi + 1) % WAVES.length]; w.m.position.set(x, .06, z); w.r = r; w.l = 1; w.m.visible = true; w.m.material.color.set(col); }
// ---------- estado ----------
let W = null, me = null, G = { st: 'menu', cd: 0, mode: 0, net: null, coins: 0, dbl: 0, trial: null, ended: 0 }, LM = [];
const BOTN = ['Mochi', 'Nubecita', 'Gomi', 'Bolón', 'Pelusa', 'Tofu', 'Chispi', 'Coco', 'Bombón', 'Fresi', 'Kiwi', 'Lulú', 'Panqui', 'Toffee'];
const V = new THREE.Vector3(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), SC = new THREE.Vector3(), YA = new THREE.Vector3(0, 1, 0), COL = new THREE.Color();
function makeLeaderMesh(p) { const L = leadById(p.lead), g = new THREE.Group(), body = new THREE.Mesh(leadGeo(L), gum()); body.scale.setScalar(1.7); g.add(body);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: p.pc, transparent: true, opacity: .95, depthWrite: false })); ring.position.y = -1.3; g.add(ring);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: p.pc, transparent: true, opacity: .4, depthWrite: false })); sh.position.y = -1.32; g.add(sh);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshStandardMaterial({ color: '#9fe8ff', transparent: true, opacity: .28, roughness: .1, depthWrite: false })); bub.visible = false; scene.add(bub);
  let arrow = null; if (p === me) { arrow = new THREE.Mesh(part(CONE, 0, [.5, .7, .5], [Math.PI, 0, 0], '#ffd23f'), gum()); arrow.position.y = 3.3; g.add(arrow); }
  scene.add(g); return { g, body, ring, bub, arrow }; }
function clearWorld() { for (const m of LM) { scene.remove(m.g, m.bub); m.bub.geometry.dispose(); } LM = []; $('labels').innerHTML = ''; $('pops').innerHTML = ''; for (const q of puffs) q.l = 0; }
function setupWorld(roster, opts) { clearWorld(); W = createSim({ dur: opts.dur, diff: opts.diff, auth: !G.net || G.net.isHost, arena: ARENA });
  for (const r of roster) { const p = W.addPlayer({ name: r.name, bot: r.bot ? 1 : 0, human: r.human ? 1 : 0, pers: r.pers | 0, peer: r.peer }); p.lead = r.lead; p.pc = PCOL[p.id % 8]; p.aura = leadById(r.lead).prem ? 1.1 : 1; if (r.mine) { me = p; p.local = 1; } }
  if (W.auth) { W.initLoose(); for (const p of W.players) W.spawnPlayer(p, 3, 2); }
  for (const p of W.players) { LM[p.id] = makeLeaderMesh(p); const d = document.createElement('div'); d.style.background = p.pc; $('labels').appendChild(d); p.lab = d; } }
// ---------- input: joystick invisible flotante + teclado ----------
const joy = { on: 0, id: null, x0: 0, y0: 0, dx: 0, dz: 0 }, keys = {}; const JR = 55;
addEventListener('pointerdown', e => { if (G.st !== 'play' && G.st !== 'cd') return; if (e.target.closest('button')) return; audio(); joy.on = 1; joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; const j = $('joy'); j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; j.classList.add('on'); $('joyK').style.transform = ''; });
addEventListener('pointermove', e => { if (!joy.on || e.pointerId !== joy.id) return; let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const d = Math.hypot(dx, dy); if (d > JR) { joy.x0 += dx * (1 - JR / d) * .5; joy.y0 += dy * (1 - JR / d) * .5; const j = $('joy'); j.style.left = joy.x0 + 'px'; j.style.top = joy.y0 + 'px'; dx = e.clientX - joy.x0; dy = e.clientY - joy.y0; }
  const dd = Math.hypot(dx, dy), k = dd < 6 ? 0 : Math.min(1, dd / JR) / (dd || 1); joy.dx = dx * k; joy.dz = dy * k; const c = Math.min(dd, JR) / (dd || 1); $('joyK').style.transform = `translate(${dx * c}px,${dy * c}px)`; });
const joyUp = e => { if (e.pointerId !== joy.id) return; joy.on = 0; joy.id = null; joy.dx = joy.dz = 0; $('joy').classList.remove('on'); }; addEventListener('pointerup', joyUp); addEventListener('pointercancel', joyUp);
addEventListener('keydown', e => keys[e.key.toLowerCase()] = 1); addEventListener('keyup', e => keys[e.key.toLowerCase()] = 0);
function inputDir() { let x = joy.dx, z = joy.dz; const kx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), kz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0); if (kx || kz) { const l = Math.hypot(kx, kz); x = kx / l; z = kz / l; } return [x, z]; }
// ---------- UI ----------
function toast(t, ms = 2200) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove('on'), ms); }
function msg(t, ms = 1400) { const e = $('msg'); e.textContent = t; e.classList.add('on'); clearTimeout(msg.h); msg.h = setTimeout(() => e.classList.remove('on'), ms); }
let popBudget = 0; function popNum(x, z, txt, col, big) { if (popBudget > 14 && !big) return; popBudget++; V.set(x, 1.5, z).project(camera); if (V.z > 1 || Math.abs(V.x) > 1.1 || Math.abs(V.y) > 1.1) return;
  const e = document.createElement('div'); e.className = 'pop'; e.textContent = txt; e.style.color = col; if (big) e.style.fontSize = '34px'; e.style.left = (V.x * .5 + .5) * innerWidth + 'px'; e.style.top = (-V.y * .5 + .5) * innerHeight + 'px'; $('pops').appendChild(e); setTimeout(() => e.remove(), 900); }
const show = (id, v) => $(id).classList.toggle('hide', !v);
function screens(id) { for (const s of ['menu', 'help', 'mp', 'dead', 'pause', 'over', 'prem']) show(s, s === id); }
// miniaturas de líderes con un renderer aparte
const prevR = new THREE.WebGLRenderer({ canvas: $('premC'), antialias: true, alpha: true, preserveDrawingBuffer: true }); prevR.setPixelRatio(1); prevR.setSize(220, 220, false);
const pScene = new THREE.Scene(); pScene.add(new THREE.HemisphereLight('#fff', '#c9a8ff', 1.4)); { const d = new THREE.DirectionalLight('#fff', 1.8); d.position.set(3, 5, 6); pScene.add(d); }
const pCam = new THREE.PerspectiveCamera(32, 1, .1, 50); pCam.position.set(0, 1.2, 7.2); pCam.lookAt(0, .15, 0); let pMesh = null;
function preview(L, yaw = -.35) { if (pMesh) pScene.remove(pMesh); pMesh = new THREE.Mesh(leadGeo(L), gum()); pMesh.rotation.y = yaw; pScene.add(pMesh); prevR.render(pScene, pCam); return $('premC'); }
function buildMenu() { const lp = $('leadPick'); lp.innerHTML = '';
  for (const L of LEADS) { const b = document.createElement('div'); b.className = 'lead' + (S.lead === L.id ? ' on' : ''); const c = document.createElement('canvas'); c.width = c.height = 110; c.getContext('2d').drawImage(preview(L), 0, 0, 220, 220, 0, 0, 110, 110);
    b.appendChild(c); const n = document.createElement('div'); n.textContent = L.n; if (L.prem) n.className = 'pr'; b.appendChild(n); if (!isOwned(L)) { const k = document.createElement('div'); k.className = 'lk'; k.textContent = G.trial === L.id ? '▶' : '🔒'; b.appendChild(k); }
    b.onclick = () => { audio(); if (!isOwned(L) && G.trial !== L.id) return openPrem(L); S.lead = L.id; save(); buildMenu(); }; lp.appendChild(b); }
  seg('modePick', ['⏱ 3 minutos', '♾️ Infinito'], S.mode, i => { S.mode = i; save(); }); seg('diffPick', ['Fácil', 'Normal', 'Difícil'], S.diff, i => { S.diff = i; save(); });
  $('coinTxt').textContent = S.coins; $('bestTxt').textContent = S.best; $('bSnd').textContent = S.snd ? '🔊' : '🔇'; }
function seg(id, L, cur, f) { const e = $(id); e.innerHTML = ''; L.forEach((t, i) => { const b = document.createElement('button'); b.textContent = t; if (i === cur) b.className = 'on'; b.onclick = () => { audio(); f(i); buildMenu(); }; e.appendChild(b); }); }
let premL = null, premSpin = 0; function openPrem(L) { premL = L; $('premN').textContent = '👑 ' + L.n; $('premD').textContent = L.d; screens('prem'); premSpin = 1; }
$('premX').onclick = () => { premSpin = 0; screens('menu'); buildMenu(); };
$('premTry').onclick = () => ads.showRewarded(() => { G.trial = premL.id; S.lead = premL.id; save(); premSpin = 0; screens('menu'); buildMenu(); toast('▶ ' + premL.n + ' desbloqueado para 1 partida'); });
$('premBuy').onclick = () => { if (!S.owned.includes(premL.id)) S.owned.push(premL.id); S.lead = premL.id; save(); premSpin = 0; screens('menu'); buildMenu(); toast('✅ ' + premL.n + ' es tuyo (compra de prueba)'); };
$('bHelp').onclick = () => screens('help'); $('bHelpX').onclick = () => screens('menu');
$('bSnd').onclick = () => { S.snd = !S.snd; save(); buildMenu(); };
$('bPlay').onclick = () => { audio(); startSolo(); };
$('bPause').onclick = () => { if (G.st !== 'play') return; if (!G.net) G.paused = 1; show('pause', 1); };
$('bResume').onclick = () => { G.paused = 0; show('pause', 0); };
$('bPauseMenu').onclick = () => { G.paused = 0; toMenu(); };
$('bMenu').onclick = () => toMenu(); $('bAgain').onclick = () => { if (G.net) toMenu(); else startSolo(); };
$('bDbl').onclick = () => ads.showRewarded(() => { S.coins += G.coins; save(); G.dbl = 1; $('bDbl').classList.add('hide'); $('ovInfo').innerHTML += '<br>🪙 ¡Monedas duplicadas! +' + G.coins; });
$('bRevAd').onclick = () => ads.showRewarded(() => doRevive(Math.max(3, Math.round(G.lostPower / 2))));
$('bRev').onclick = () => doRevive(3); $('bQuit').onclick = () => endMatch();
function doRevive(v) { show('dead', 0); if (G.net && !G.net.isHost) G.net.send({ t: 'rev', v }); else { W.revive(me, v); } msg('🫧 ¡De vuelta!'); }
function toMenu() { if (G.net) { G.net.close(); G.net = null; } G.st = 'menu'; show('hud', 0); screens('menu'); buildMenu(); clearWorld(); W = null; me = null; demo(); }
function roster(nHum = [{ name: S.nick || 'Tú', lead: S.lead, mine: 1, human: 1 }]) { const R = nHum.slice(), used = new Set(); while (R.length < 8) { let n; do n = BOTN[(Math.random() * BOTN.length) | 0]; while (used.has(n)); used.add(n); R.push({ name: n, bot: 1, pers: R.length % 3, lead: LEADS[(Math.random() * LEADS.length) | 0].id }); } return R; }
function startSolo() { G.net = null; begin(roster(), { dur: S.mode ? 0 : 180, diff: S.diff }); }
function begin(R, o) { setupWorld(R, o); G.trialUsed = G.trial; G.trial = null; G.opts = o; G.st = 'cd'; G.cd = 3.999; G.ended = 0; G.paused = 0; G.acc = 0; G.lastCd = 4; screens(null); show('hud', 1); $('cd').classList.remove('hide'); camSnap = 1; }
function endMatch() { if (G.ended) return; G.ended = 1; G.st = 'over'; show('dead', 0); show('pause', 0);
  if (G.net && G.net.isHost) G.net.send({ t: 'over' });
  const R = W.rank(), pos = R.indexOf(me) + 1; G.coins = 10 + Math.round(me.best / 4) + me.kills * 8 + (pos === 1 ? 30 : pos <= 3 ? 15 : 0); S.coins += G.coins; S.best = Math.max(S.best, me.best); save();
  $('ovT').textContent = pos === 1 ? '🏆 ¡Has ganado!' : pos <= 3 ? '🥈 ¡Al podio! Puesto ' + pos : 'Puesto ' + pos + ' de ' + R.length;
  $('podium').innerHTML = R.map((p, i) => `<div class="${p === me ? 'me' : ''}"><span>${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${esc(p.name)}</span><b>${p.power}</b></div>`).join('');
  $('ovInfo').innerHTML = `Ejército máximo: <b>${me.best}</b> · Tropas vencidas: <b>${me.kills}</b><br>🪙 +${G.coins} monedas`; $('bDbl').classList.toggle('hide', false); screens('over'); pos <= 3 ? sfx.win() : sfx.lose(); }
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
// ---------- eventos de la simulación → efectos ----------
function onEvents(EV) { for (const e of EV) { const k = e[0];
  if (k === 'pop') { const [, x, z, col, tier, owner] = e; puff(x, z, UCOL[col], 3 + tier, TSIZE[tier] * 1.4); sfx.pop(tier); popNum(x, z, '-' + TIERV[tier], owner === (me && me.id) ? '#ff6b6b' : '#ffffff'); }
  else if (k === 'merge') { const [, pid, x, z, col, tier] = e; wave(x, z, TSIZE[tier] * 3.2, UCOL[col]); puff(x, z, UCOL[col], 6, TSIZE[tier]); if (me && pid === me.id) { sfx.merge(tier); if (tier === 3) msg('👑 ¡REY GIGANTE!'); } }
  else if (k === 'rec') { if (me && e[1] === me.id) { sfx.rec(); bump(); popNum(me.x, me.z - 2, '+' + e[2], '#ffe14d'); } }
  else if (k === 'defect') { const L = W.players[e[1]], Wn = W.players[e[2]]; if (Wn === me && e[3] > 0) { popNum(me.x, me.z, '+' + e[3] + ' se unen 🏳️', '#7dffb0', 1); msg('⚔️ ¡Has vencido a ' + L.name + '!'); } }
  else if (k === 'elim') { const p = W.players[e[1]]; if (LM[p.id]) puff(p.x, p.z, new THREE.Color(p.pc), 12, 2.2); if (p === me) { G.lostPower = me.lastPower || 0; sfx.lose(); if (G.st === 'play') { $('deadInfo').innerHTML = 'Tenías un ejército de <b>' + (G.lostPower | 0) + '</b>.' + (e[2] >= 0 ? '<br>Te ha vencido <b>' + esc(W.players[e[2]].name) + '</b>.' : ''); $('bRevAd').textContent = '▶ Anuncio · volver con ' + Math.max(3, Math.round(G.lostPower / 2)); show('dead', 1); } } }
  else if (k === 'clash') { if (me && (e[1] === me.id || e[2] === me.id)) sfx.clash(); }
  else if (k === 'over') endMatch(); } }
function bump() { const n = $('armyN'); n.classList.add('bump'); clearTimeout(bump.h); bump.h = setTimeout(() => n.classList.remove('bump'), 110); }
// ---------- dibujo ----------
let camSnap = 1; const camT = new THREE.Vector3(), camL = new THREE.Vector3();
function draw(t, dt) { if (!W) return; const cx = camL.x, cz = camL.z, H = camera.position.y, vx = H * 1.25 * Math.max(1, camera.aspect) + 6, vzN = H * 1.3 + 6, vzS = H * .5 + 6;
  const cnt = [0, 0, 0, 0]; let sc = 0, cc = 0;
  const put = (u, owner) => { const T = u.tier; if (Math.abs(u.x - cx) > vx || u.z - cz > vzS || cz - u.z > vzN) return; const im = UIM[T]; if (cnt[T] >= CAP[T]) return; const s = TSIZE[T];
    const sp = Math.hypot(u.vx, u.vz), mv = Math.min(1, sp / 6), ph = t * (owner ? 11 : 3) + u.ph, hop = owner ? Math.abs(Math.sin(ph)) * mv * .45 * s + Math.abs(Math.sin(t * 3 + u.ph)) * .05 : Math.max(0, Math.sin(ph)) ** 6 * .35 * s;
    let ty = sp > 1.5 ? Math.atan2(u.vx, u.vz) : 0; ty = clamp(ty, -1.25, 1.25); u.yaw = (u.yaw || 0) + (ty - (u.yaw || 0)) * Math.min(1, dt * 8);
    const sq = 1 + Math.sin(ph * 2) * .06 * (owner ? mv : .4); Q.setFromAxisAngle(YA, u.yaw + Math.sin(t * 2 + u.ph) * .12);
    M4.compose(SC.set(u.x, s * .55 + .3 + hop, u.z), Q, V.set(s / sq ** .5, s * sq, s / sq ** .5)); im.setMatrixAt(cnt[T], M4); im.setColorAt(cnt[T], UCOL[u.col]); cnt[T]++;
    if (T === 3) { M4.compose(SC.set(u.x, s * 1.35 + .3 + hop, u.z), Q, V.set(s, s, s)); CRIM.setMatrixAt(cc++, M4); }
    if (sc < 2700) { Q.identity(); M4.compose(SC.set(u.x, .03, u.z), Q, V.set(s * 1.05, 1, s * 1.05)); SHIM.setMatrixAt(sc, M4); SHIM.setColorAt(sc, owner ? owner.pcC : SHC); sc++; } };
  for (const u of W.loose) put(u, null);
  for (const p of W.players) { if (!p.pcC) p.pcC = new THREE.Color(p.pc); for (const u of p.units) put(u, p); }
  UIM.forEach((im, i) => { im.count = cnt[i]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }); CRIM.count = cc; CRIM.instanceMatrix.needsUpdate = true; SHIM.count = sc; SHIM.instanceMatrix.needsUpdate = true; if (SHIM.instanceColor) SHIM.instanceColor.needsUpdate = true;
  // líderes
  for (const p of W.players) { const m = LM[p.id]; if (!m) continue; m.g.visible = !!p.alive; m.bub.visible = p.alive && p.prot > 0; if (!p.alive) { p.lab.style.display = 'none'; continue; }
    const sp = Math.hypot(p.vx, p.vz), mv = Math.min(1, sp / 8), hop = Math.abs(Math.sin(t * 9 + p.id)) * .35 * mv; m.g.position.set(p.x, 1.35 + hop, p.z);
    let ty = sp > 1 ? Math.atan2(p.vx, p.vz) : 0; ty = clamp(ty, -1.3, 1.3); p.yaw = (p.yaw || 0) + (ty - (p.yaw || 0)) * Math.min(1, dt * 7); m.body.rotation.set(-p.vz / 60 * 0 + mv * .12 * Math.cos(p.yaw) , p.yaw, -p.vx / 60);
    const sq = 1 + Math.sin(t * 18 + p.id) * .05 * mv; m.body.scale.set(1.7 / Math.sqrt(sq), 1.7 * sq, 1.7 / Math.sqrt(sq)); m.ring.scale.setScalar(1 + Math.sin(t * 4) * .04);
    if (m.arrow) { m.arrow.position.y = 3.6 + Math.sin(t * 4) * .25; m.arrow.rotation.y = t * 2; }
    if (m.bub.visible) { const r = p.armyR + 1.2; m.bub.position.set(p.x, .4, p.z); m.bub.scale.set(r, r * .65, r); m.bub.material.opacity = .2 + Math.sin(t * 8) * .07; }
    V.set(p.x, 4.6 + hop, p.z).project(camera); const onS = V.z < 1 && Math.abs(V.x) < 1.05 && Math.abs(V.y) < 1.05; p.lab.style.display = onS ? '' : 'none';
    if (onS) { p.lab.style.left = (V.x * .5 + .5) * innerWidth + 'px'; p.lab.style.top = (-V.y * .5 + .5) * innerHeight + 'px'; const txt = `<small>${esc(p === me ? 'TÚ' : p.name)}</small>${p.power}${p.prot > 0 ? ' 🫧' : ''}`; if (p._lt !== txt) { p.lab.innerHTML = txt; p._lt = txt; } } }
  // nubecillas y ondas
  let pn = 0; for (const q of puffs) { if (q.l <= 0) continue; q.l -= dt; q.vy -= 22 * dt; q.x += q.vx * dt; q.y = Math.max(.15, q.y + q.vy * dt); q.z += q.vz * dt; const k = Math.max(0, q.l / q.l0), s = q.s * (k < .5 ? k * 2 : 1);
    M4.compose(SC.set(q.x, q.y, q.z), Q.identity(), V.setScalar(s)); PUFF.setMatrixAt(pn, M4); PUFF.setColorAt(pn, q.c); pn++; } PUFF.count = pn; PUFF.instanceMatrix.needsUpdate = true; if (PUFF.instanceColor) PUFF.instanceColor.needsUpdate = true;
  for (const w of WAVES) if (w.l > 0) { w.l -= dt * 2.4; const r = w.r * (1.3 - w.l * .9); w.m.scale.setScalar(r); w.m.material.opacity = Math.max(0, w.l) * .8; if (w.l <= 0) w.m.visible = false; } }
const SHC = new THREE.Color('#9b7fd6');
function updCam(dt) { const p = me; if (!p) return; const R = p.alive ? p.armyR : 3, H = clamp(25 + R * 2.2, 25, 80); camL.set(p.x, 0, p.z); camT.set(p.x, H, p.z + H * .78);
  if (camSnap) { camera.position.copy(camT); camSnap = 0; } else camera.position.lerp(camT, damp(4, dt)); camera.lookAt(camera.position.x, 0, camera.position.z - camera.position.y * .78 - 1); }
let hudT = 0; function hud(dt) { hudT -= dt; if (hudT > 0 || !W) return; hudT = .12; const s = W.dur ? Math.max(0, Math.ceil(W.dur - W.t)) : Math.floor(W.t);
  $('timer').innerHTML = (W.dur ? '⏱ ' : '♾️ ') + '<b>' + ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0') + '</b>'; $('timer').style.color = W.dur && s <= 10 ? '#ff5a7a' : '';
  if (me) { $('armyN').textContent = me.alive ? me.power : 0; const c = [0, 0, 0, 0]; for (const u of me.units) c[u.tier]++; $('armyU').textContent = me.alive ? `${me.units.length} pompones` + (c[3] ? ` · 👑×${c[3]}` : '') : ''; }
  const R = W.rank(); let h = R.slice(0, 5).map((p, i) => `<div class="${p === me ? 'me' : ''}"><span>${i + 1}. ${esc(p === me ? 'Tú' : p.name)}</span><b>${p.alive ? p.power : '💥'}</b></div>`).join('');
  const mi = R.indexOf(me); if (mi > 4) h += `<div class="me"><span>${mi + 1}. Tú</span><b>${me.power}</b></div>`; $('lb').innerHTML = h; }
// ---------- calidad adaptativa ----------
let qT = 0, qN = 0, qS = 0; function quality(dt) { if (G.st !== 'play') return; qS += dt; qN++; qT += dt; if (qT < 2.5) return; const avg = qS / qN; qT = qS = qN = 0;
  if (avg > 1 / 42 && PR > .75) { PR = Math.max(.75, PR - .25); renderer.setPixelRatio(PR); } else if (avg < 1 / 57 && PR < Math.min(DPR, 1.75)) { PR = Math.min(Math.min(DPR, 1.75), PR + .125); renderer.setPixelRatio(PR); } }
// ---------- bucle ----------
const STEP = 1 / 60; let last = performance.now(), T = 0;
function loop(now) { requestAnimationFrame(loop); let dt = Math.min(.1, (now - last) / 1000); last = now; T += dt; sndBudget = Math.max(0, sndBudget - dt * 40); popBudget = Math.max(0, popBudget - dt * 14);
  if (premSpin) { preview(premL, T * .8); }
  if (W && !G.paused) {
    if (G.st === 'cd') { G.cd -= dt; const n = Math.ceil(G.cd); if (n !== G.lastCd) { G.lastCd = n; const e = $('cd'); e.textContent = n > 0 ? n : '¡YA!'; e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); sfx.cd(n); } if (G.cd <= -0.6) { $('cd').classList.add('hide'); } if (G.cd <= 0 && G.st === 'cd') G.st = 'play'; }
    if (G.st === 'play' || G.st === 'over') { if (G.cd > -0.6) { G.cd -= dt; if (G.cd <= -0.6) $('cd').classList.add('hide'); }
      if (me) { const [x, z] = G.st === 'play' ? inputDir() : [0, 0]; me.dx = x; me.dz = z; if (me.alive) me.lastPower = me.power; }
      G.acc += dt; let n = 0; const EV = []; while (G.acc >= STEP && n < 5) { W.step(STEP); EV.push(...W.ev); G.acc -= STEP; n++; } if (n === 5) G.acc = 0;
      if (G.net) netTick(dt, EV); onEvents(EV); } }
  updCam(dt); draw(T, dt); hud(dt); quality(dt); renderer.render(scene, camera); }
// ---------- multijugador (anfitrión manda) ----------
const NABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', NPRE = 'pompotropa-v1-', NMAX = 8, nCode = () => Array.from({ length: 4 }, () => NABC[(Math.random() * NABC.length) | 0]).join('');
class Net { constructor() { this.peer = null; this.conns = new Map(); this.players = []; this.isHost = false; this.myId = null; this.h = {}; this.alive = true; this.nextId = 1; }
  on(ev, f) { this.h[ev] = f; return this; } emit(ev, ...a) { const f = this.h[ev]; if (f) try { f(...a); } catch (e) { console.error(e); } }
  _peer(id) { return new Promise((res, rej) => { if (typeof window.Peer !== 'function') return rej(new Error('broker')); let done = false; const opts = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
    const p = id ? new window.Peer(id, opts) : new window.Peer(opts); const to = setTimeout(() => { if (!done) { done = true; try { p.destroy(); } catch (e) { } rej(new Error('broker')); } }, 10000);
    p.on('open', () => { if (done) return; done = true; clearTimeout(to); res(p); });
    p.on('error', e => { if (!done) { done = true; clearTimeout(to); try { p.destroy(); } catch (x) { } rej(new Error(e.type === 'unavailable-id' ? 'taken' : 'broker')); } else if (e.type === 'peer-unavailable' && this._jr) { this._jr(new Error('nosala')); this._jr = null; } }); }); }
  async create(info) { for (let k = 0; k < 4 && !this.peer; k++) { const code = nCode(); try { this.peer = await this._peer(NPRE + code); this.code = code; } catch (e) { if (e.message !== 'taken') throw e; } } if (!this.peer) throw new Error('broker');
    this.isHost = true; this.myId = 'h'; this.players = [{ id: 'h', ...info }]; this.peer.on('connection', c => this._hc(c)); this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) { } }); return this.code; }
  _hc(c) { c.on('data', d => { if (d.t === 'hello') { if (this.players.length >= NMAX || this.started) { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); return; } const id = 'p' + (this.nextId++); c.pid = id; this.conns.set(id, c);
      this.players.push({ id, name: String(d.name || 'Invitado').slice(0, 12), lead: String(d.lead || 'pompi') }); c.send({ t: 'welcome', id }); this.lobby(); return; } if (!c.pid) return; d.from = c.pid; this.emit('msg', d); });
    c.on('close', () => this._lost(c.pid)); c.on('error', () => this._lost(c.pid)); }
  _lost(id) { if (!id || !this.conns.has(id)) return; this.conns.delete(id); const p = this.players.find(p => p.id === id); this.players = this.players.filter(p => p.id !== id); this.lobby(); this.emit('left', id, p && p.name); }
  lobby() { this.send({ t: 'lobby', players: this.players }); this.emit('lobby', this.players); }
  async join(code, info) { code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); if (code.length !== 4) throw new Error('codigo'); this.peer = await this._peer(null); this.code = code;
    return new Promise((res, rej) => { this._jr = rej; const c = this.peer.connect(NPRE + code, { reliable: true, serialization: 'json' }); this.host = c; const to = setTimeout(() => { if (this._jr) { this._jr = null; rej(new Error('nosala')); } }, 12000);
      c.on('open', () => c.send({ t: 'hello', ...info })); c.on('data', d => { if (d.t === 'welcome') { clearTimeout(to); this._jr = null; this.myId = d.id; res(d.id); return; } if (d.t === 'full') { clearTimeout(to); this._jr = null; rej(new Error('llena')); return; }
        if (d.t === 'lobby') { this.players = d.players; this.emit('lobby', d.players); return; } this.emit('msg', d); }); c.on('close', () => { if (this.alive) this.emit('hostgone'); }); c.on('error', () => { }); }); }
  send(d) { if (this.isHost) { for (const c of this.conns.values()) if (c.open) try { c.send(d); } catch (e) { } } else if (this.host && this.host.open) try { this.host.send(d); } catch (e) { } }
  close() { this.alive = false; try { this.send({ t: 'bye' }); } catch (e) { } setTimeout(() => { try { this.peer && this.peer.destroy(); } catch (e) { } }, 150); } }
const NERR = { broker: 'No se pudo conectar al servidor de salas. Revisa internet.', nosala: 'No existe esa sala.', llena: 'La sala está llena o ya empezó.', codigo: 'El código tiene 4 letras.' };
$('bMP').onclick = () => { audio(); $('mpNick').value = S.nick || ''; show('mpHome', 1); show('mpLobby', 0); $('mpMsg').textContent = ''; screens('mp'); };
$('mpBack').onclick = () => screens('menu');
const nickInfo = () => { S.nick = ($('mpNick').value || 'Jugador').slice(0, 12); save(); const L = leadById(S.lead); return { name: S.nick, lead: isOwned(L) || G.trial === L.id ? L.id : 'pompi' }; };
$('mpCreate').onclick = async () => { $('mpMsg').textContent = '⏳ Creando sala…'; const n = new Net(); try { const code = await n.create(nickInfo()); G.net = n; netWire(n); $('mpCodeBig').textContent = code; show('mpHome', 0); show('mpLobby', 1); show('mpStart', 1); show('mpWait', 0); n.lobby(); } catch (e) { $('mpMsg').textContent = NERR[e.message] || NERR.broker; } };
$('mpJoin').onclick = async () => { $('mpMsg').textContent = '⏳ Entrando…'; const n = new Net(); try { await n.join($('mpCode').value, nickInfo()); G.net = n; netWire(n); $('mpCodeBig').textContent = n.code; show('mpHome', 0); show('mpLobby', 1); show('mpStart', 0); show('mpWait', 1); } catch (e) { $('mpMsg').textContent = NERR[e.message] || NERR.broker; try { n.close(); } catch (x) { } } };
$('mpLeave').onclick = () => { if (G.net) G.net.close(); G.net = null; show('mpHome', 1); show('mpLobby', 0); };
$('mpShare').onclick = () => { const url = location.origin + location.pathname + '?sala=' + G.net.code, t = '¡Juega conmigo a Pompotropa! Sala ' + G.net.code; if (navigator.share) navigator.share({ title: 'Pompotropa', text: t, url }).catch(() => { }); else { navigator.clipboard && navigator.clipboard.writeText(url); toast('Enlace copiado'); } };
$('mpStart').onclick = () => { const n = G.net; if (!n || !n.isHost) return; n.started = 1; const hum = n.players.map(p => ({ name: p.name, lead: p.lead, human: 1, peer: p.id, mine: p.id === 'h' ? 1 : 0 })); const R = roster(hum);
  const o = { dur: S.mode ? 0 : 180, diff: S.diff }; n.send({ t: 'start', R: R.map(r => ({ ...r, mine: 0 })), o }); begin(R, o); };
function netWire(n) { n.on('lobby', L => { $('mpList').innerHTML = L.map(p => `<div>${p.id === 'h' ? '👑 ' : ''}${esc(p.name)}</div>`).join(''); })
  .on('left', (id, name) => { toast('👋 ' + (name || 'Alguien') + ' ha salido'); if (W) { const p = W.players.find(p => p.peer === id); if (p) { p.bot = 1; p.human = 0; } } })
  .on('hostgone', () => { toast('El anfitrión ha cerrado la sala'); toMenu(); })
  .on('msg', d => { if (n.isHost) { if (!W) return; const p = W.players.find(p => p.peer === d.from); if (!p) return; if (d.t === 'in') { p.dx = clamp(+d.x || 0, -1, 1); p.dz = clamp(+d.z || 0, -1, 1); } else if (d.t === 'rev' && !p.alive) W.revive(p, clamp(d.v | 0, 3, 2000)); return; }
    if (d.t === 'start') { begin(d.R.map(r => ({ ...r, mine: r.peer === n.myId ? 1 : 0 })), d.o); } else if (d.t === 's') applySnap(d); else if (d.t === 'over') { if (W) endMatch(); } else if (d.t === 'bye') { toast('El anfitrión ha cerrado la sala'); toMenu(); } }); }
let snapT = 0, snapN = 0, inT = 0; const evBuf = [];
const comp = p => p.units.map(u => String.fromCharCode(97 + u.tier * 5 + u.col)).join('');
function netTick(dt, EV) { const n = G.net; if (n.isHost) { for (const e of EV) if (e[0] !== 'rec' || true) evBuf.push(e.map(v => typeof v === 'number' ? Math.round(v * 10) / 10 : v)); snapT -= dt; if (snapT > 0) return; snapT = .1; snapN++;
    const d = { t: 's', T: Math.round(W.t * 10) / 10, P: W.players.map(p => [Math.round(p.x * 10), Math.round(p.z * 10), Math.round(p.vx * 10), Math.round(p.vz * 10), p.alive, p.prot > 0 ? 1 : 0, comp(p), p.kills, p.best]), E: evBuf.splice(0, 200) };
    if (snapN % 3 === 1) d.L = W.loose.flatMap(u => [u.id, u.tier * 5 + u.col, Math.round(u.x * 10), Math.round(u.z * 10)]); n.send(d); }
  else { inT -= dt; if (inT <= 0) { inT = 1 / 15; n.send({ t: 'in', x: Math.round(me.dx * 100) / 100, z: Math.round(me.dz * 100) / 100 }); }
    for (const p of W.players) if (p !== me && p.alive) { p.nx += p.vx * dt; p.nz += p.vz * dt; p.x += (p.nx - p.x) * damp(10, dt); p.z += (p.nz - p.z) * damp(10, dt); } } }
function applySnap(d) { if (!W) return; W.t = d.T; d.P.forEach((a, i) => { const p = W.players[i]; if (!p) return; const [x, z, vx, vz, al, pr, c, k, b] = a; const was = p.alive;
    p.alive = al; p.prot = pr ? 1 : 0; p.kills = k; p.best = b; if (p === me) { if (!was && al) { p.x = x / 10; p.z = z / 10; } else { p.x += (x / 10 - p.x) * .15; p.z += (z / 10 - p.z) * .15; } } else { p.nx = x / 10; p.nz = z / 10; p.vx = vx / 10; p.vz = vz / 10; if (!was && al) { p.x = p.nx; p.z = p.nz; } }
    if (c !== p.comp) { const old = p.units, pool = {}; for (const u of old) (pool[u.tier * 5 + u.col] || (pool[u.tier * 5 + u.col] = [])).push(u); p.units = [];
      for (let j = 0; j < c.length; j++) { const code = c.charCodeAt(j) - 97, L = pool[code]; let u = L && L.pop(); if (!u) { u = W.unit((code / 5) | 0, code % 5, p.x + rnd(-1, 1), p.z + rnd(-1, 1)); } u.owner = p; p.units.push(u); } p.comp = c; W.layout(p); } });
  if (d.L) { const old = new Map(W.loose.map(u => [u.id, u])); W.loose = []; for (let i = 0; i < d.L.length; i += 4) { let u = old.get(d.L[i]); if (!u) { u = W.unit((d.L[i + 1] / 5) | 0, d.L[i + 1] % 5, d.L[i + 2] / 10, d.L[i + 3] / 10); u.id = d.L[i]; } W.loose.push(u); } }
  if (d.E) onEvents(d.E.map(e => e[0] === 'pop' || e[0] === 'merge' ? e : e)); }
// ---------- arranque ----------
buildMenu(); screens('menu'); requestAnimationFrame(loop);
// fondo del menú: una horda de demostración
function demo() { const R = roster([]); R.forEach(r => r.human = 0); setupWorld(R, { dur: 0, diff: 1 }); me = W.players[0]; G.st = 'demo'; G.acc = 0; for (let i = 0; i < 60 * 25; i++) W.step(STEP); camSnap = 1;
  const tick = () => { if (G.st !== 'demo' || !W) return; W.step(STEP); W.step(STEP); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
demo();
const _toMenu = toMenu; window.__P = { get W() { return W; }, get G() { return G; }, get me() { return me; }, startSolo, endMatch, toMenu, get PR() { return PR; } };
const sala = new URLSearchParams(location.search).get('sala'); if (sala) { $('bMP').onclick(); $('mpCode').value = sala; }
