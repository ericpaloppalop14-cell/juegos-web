// ======================================================================
//  ESPACIO REALISTA para Karts: cielo con estrellas + Vía Láctea + nebulosas procedurales,
//  planetas con textura y atmósfera (gigante gaseoso, Tierra, Luna), asfalto metálico, sombras.
//  Todo se genera una vez en canvas (sin descargas) y los planetas no llevan niebla.
// ======================================================================
import { THREE, renderer } from '../core3d.js?v=o47';

let SEED = 7; const rr = () => (SEED = (SEED * 16807) % 2147483647) / 2147483647;
function noiseGrid(n) { const g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = rr(); return g; }
/* ruido de valor suave, periódico en x (para texturas equirectangulares sin costura) */
function fbmMaker(n = 64) { const G = noiseGrid(n); const at = (x, y) => G[((y % n + n) % n) * n + ((x % n + n) % n)];
  const sm = t => t * t * (3 - 2 * t);
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi); const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  return (x, y, oct = 5, per = 8) => { let s = 0, a = .5, f = 1; for (let o = 0; o < oct; o++) { s += a * vn(x * per * f, y * per * f); a *= .5; f *= 2; } return s; }; }
const tex = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function skyTexture() {
  const W = 2048, H = 1024, cv = canvas(W, H), x = cv.getContext('2d'); x.fillStyle = '#03030a'; x.fillRect(0, 0, W, H);
  const fbm = fbmMaker(64);
  /* capa de nubes a baja resolución (suave) → Vía Láctea en banda inclinada + nebulosas de color */
  const w = 512, h = 256, lo = canvas(w, h), lx = lo.getContext('2d'), im = lx.createImageData(w, h), D = im.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const u = i / w, v = j / h;
    const band = v - (.42 + .16 * Math.sin(u * Math.PI * 2 + .6)); const n = fbm(u, v, 5, 6), n2 = fbm(u + .37, v + .11, 4, 10);
    const mw = Math.exp(-band * band / .006) * (.35 + .9 * n) * (.6 + .6 * n2); const dust = Math.exp(-band * band / .0012) * Math.max(0, n2 - .45) * 2.2; /* franja de polvo oscuro */
    const neb1 = Math.max(0, fbm(u * 1.3 + .2, v, 5, 4) - .52) * 3.2, neb2 = Math.max(0, fbm(u * 1.1 + .6, v + .3, 5, 4) - .55) * 3.2;
    const k = (j * w + i) * 4; const m = Math.max(0, mw - dust);
    D[k] = Math.min(255, 18 + m * 210 + neb1 * 170 + neb2 * 40); D[k + 1] = Math.min(255, 14 + m * 190 + neb1 * 50 + neb2 * 90); D[k + 2] = Math.min(255, 32 + m * 220 + neb1 * 150 + neb2 * 200); D[k + 3] = 255; }
  lx.putImageData(im, 0, 0); x.imageSmoothingEnabled = true; x.filter = 'blur(2px)'; x.drawImage(lo, 0, 0, W, H); x.filter = 'none';
  /* estrellas: muchas pequeñas (más densas en la Vía Láctea) y algunas brillantes con halo */
  for (let i = 0; i < 9000; i++) { const u = rr(), v = rr(); const band = v - (.42 + .16 * Math.sin(u * Math.PI * 2 + .6)); if (Math.abs(band) > .12 && rr() < .55) continue;
    const b = Math.pow(rr(), 3); const c = rr(); x.fillStyle = `rgba(${200 + c * 55 | 0},${210 + rr() * 45 | 0},${c < .3 ? 255 : 230},${.35 + b * .65})`; const s = .6 + b * 1.6; x.fillRect(u * W, v * H, s, s); }
  for (let i = 0; i < 120; i++) { const px = rr() * W, py = rr() * H, r = 3 + rr() * 7; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.25, 'rgba(200,220,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
  return tex(cv);
}

function planetTexture(kind) {
  const W = 512, H = 256, cv = canvas(W, H), x = cv.getContext('2d'), im = x.createImageData(W, H), D = im.data; const fbm = fbmMaker(64);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const u = i / W, v = j / H, k = (j * W + i) * 4; let r, g, b;
    if (kind === 'gas') { const t = v * 14 + fbm(u, v, 4, 6) * 2.4 + Math.sin(v * 40) * .15; const s = .5 + .5 * Math.sin(t); r = 190 + 50 * s; g = 140 + 50 * s - 30 * Math.sin(t * .5); b = 90 + 40 * Math.sin(t * .7);
      const sp = Math.hypot((u - .3) * 2, (v - .62) * 4); if (sp < .12) { r = 200; g = 110; b = 80; } }
    else if (kind === 'tierra') { const n = fbm(u, v, 6, 5), lat = Math.abs(v - .5) * 2; if (lat > .86) { r = g = b = 240; } else if (n > .52) { const d = fbm(u + .5, v, 4, 12); r = 70 + d * 90; g = 110 + d * 50; b = 50 + d * 30; if (lat < .3 && d > .55) { r = 190; g = 160; b = 110; } } else { const dp = (.52 - n) * 3; r = 20; g = 70 - dp * 40; b = 150 - dp * 50; } }
    else { const n = fbm(u, v, 6, 6), m = fbm(u + .3, v + .7, 3, 3); const c = 120 + n * 90 - (m > .6 ? 45 : 0); r = g = b = c; }
    D[k] = r; D[k + 1] = g; D[k + 2] = b; D[k + 3] = 255; }
  x.putImageData(im, 0, 0);
  if (kind === 'luna') for (let i = 0; i < 70; i++) { const px = rr() * W, py = 20 + rr() * (H - 40), r = 2 + Math.pow(rr(), 2) * 16; x.strokeStyle = 'rgba(255,255,255,.25)'; x.fillStyle = 'rgba(40,40,40,.25)'; x.beginPath(); x.ellipse(px, py, r, r * .8, 0, 0, 7); x.fill(); x.stroke(); }
  return tex(cv);
}
function cloudTexture() { const W = 512, H = 256, cv = canvas(W, H), x = cv.getContext('2d'), im = x.createImageData(W, H), D = im.data, fbm = fbmMaker(64);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = (j * W + i) * 4, n = fbm(i / W + .2, j / H, 6, 7); D[k] = D[k + 1] = D[k + 2] = 255; D[k + 3] = Math.max(0, (n - .5) * 3) * 255; } x.putImageData(im, 0, 0); return tex(cv); }

/* halo de atmósfera: fresnel aditivo sobre una esfera algo mayor */
function atmosphere(R, color, power = 3, strength = 1.2) {
  return new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 48, 32), new THREE.ShaderMaterial({ uniforms: { c: { value: new THREE.Color(color) }, p: { value: power }, s: { value: strength } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; uniform float p; uniform float s; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), p) * s; float rim = smoothstep(0.0, 0.35, abs(dot(vN, vV))); gl_FragColor = vec4(c, f * rim); }' }));
}

export function asfaltoTex() { const W = 256, cv = canvas(W, W), x = cv.getContext('2d'), im = x.createImageData(W, W), D = im.data, fbm = fbmMaker(32);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const k = (j * W + i) * 4, n = fbm(i / W, j / W, 4, 8), g = rr(); const c = 34 + n * 22 + (g > .985 ? 60 : g * 14); D[k] = c * .92; D[k + 1] = c * .9; D[k + 2] = c * 1.1; D[k + 3] = 255; }
  x.putImageData(im, 0, 0); const t = tex(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }

/* cielo + planetas + sombras. Devuelve tick(camera, foco) */
export function espacioReal(E, opts = {}) {
  const sc = E.scene, low = Math.min(innerWidth, innerHeight) < 500 && devicePixelRatio > 2.5;
  /* esconder el cielo/planetas de dibujo animado para que no se mezclen estilos */
  if (opts.oldSky) opts.oldSky.visible = false;
  const Wd = opts.W; if (Wd) { if (Wd.rich) { for (const st of Wd.rich.sets || []) if (st.kind === 'planeta' && st.im) st.im.visible = false; if (Wd.rich.astro) Wd.rich.astro.visible = false; if (Wd.rich.stars) Wd.rich.stars.visible = false; }
    if (Wd.amb) Wd.amb.visible = false;
    /* suelo de regolito: gris azulado con grano, en vez del morado plano */
    if (Wd.ground) { const rt = regolitoTex(); rt.repeat.set(60, 60); Wd.ground.material = new THREE.MeshStandardMaterial({ map: rt, color: '#8a86a0', roughness: 1, metalness: 0 }); Wd.ground.receiveShadow = true; } }
  sc.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && o.geometry.parameters.radius >= 14 && o.geometry.parameters.radius < 500) (o.parent && o.parent !== sc ? o.parent : o).visible = false; });
  sc.fog = new THREE.Fog('#0a0818', 70, 260);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })); sky.renderOrder = -2; sc.add(sky);
  const sunDir = new THREE.Vector3(.55, .5, -.65).normalize();
  /* luz del "sol": una direccional propia para planetas (capa 0 normal) */
  const sun = new THREE.DirectionalLight('#fff6e8', 2.4); sun.position.copy(sunDir).multiplyScalar(100); sc.add(sun); sc.add(sun.target);
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('#fff2d0'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); sunSpr.scale.setScalar(90); sc.add(sunSpr);
  const P = new THREE.Group(); sc.add(P);
  const mk = (R, map, pos, ex = {}) => { const m = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), new THREE.MeshStandardMaterial({ map, roughness: ex.rough ?? .9, metalness: 0, fog: false })); m.position.copy(pos); P.add(m); return m; };
  const gas = mk(70, planetTexture('gas'), new THREE.Vector3(-260, 150, -380)); gas.rotation.z = .3; gas.add(atmosphere(70, '#ffc890', 4, .9));
  { const rg = new THREE.RingGeometry(95, 150, 128, 1); const uv = rg.attributes.uv, pp = rg.attributes.position; for (let i = 0; i < uv.count; i++) { const d = Math.hypot(pp.getX(i), pp.getY(i)); uv.setXY(i, (d - 95) / 55, .5); }
    const c = canvas(256, 4), x = c.getContext('2d'); for (let i = 0; i < 256; i++) { const a = .25 + .6 * Math.abs(Math.sin(i * .21) * Math.sin(i * .053)) * (i > 150 && i < 165 ? .1 : 1); x.fillStyle = `rgba(${215 + (i % 20)},${190 + (i % 13)},${150},${a})`; x.fillRect(i, 0, 1, 4); }
    const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: tex(c), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1, fog: false })); ring.rotation.x = Math.PI / 2 - .32; gas.add(ring); }
  const earth = mk(34, planetTexture('tierra'), new THREE.Vector3(250, 95, -300), { rough: .7 });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(34.6, 48, 32), new THREE.MeshStandardMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, fog: false, roughness: 1 })); earth.add(clouds); earth.add(atmosphere(34, '#6ab8ff', 2.6, 1.6));
  const moon = mk(9, planetTexture('luna'), new THREE.Vector3(195, 120, -250)); moon.add(atmosphere(9, '#ffffff', 6, .25));
  /* sombras reales sólo de los karts sobre la pista: luz direccional con cámara pequeña que sigue al jugador */
  let sh = null; if (!low) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sh = new THREE.DirectionalLight('#ffffff', .0001); sh.castShadow = true; sh.shadow.mapSize.set(1024, 1024); const c = sh.shadow.camera; c.left = c.bottom = -16; c.right = c.top = 16; c.near = 1; c.far = 80; sh.shadow.bias = -.0015; sh.shadow.radius = 3; sc.add(sh); sc.add(sh.target);
    /* intensidad mínima: sólo la usamos para proyectar; el oscurecimiento lo da shadowIntensity si existe */
    sh.intensity = 1.1; if ('intensity' in sh.shadow) sh.shadow.intensity = .75; }
  return { sky, sh, tick(cam, focus, t) { sky.position.copy(cam.position); P.position.set(cam.position.x * .9, 0, cam.position.z * .9); sunSpr.position.copy(cam.position).addScaledVector(sunDir, 600);
      gas.rotation.y = t * .01; earth.rotation.y = t * .03; clouds.rotation.y = t * .012;
      if (sh && focus) { sh.target.position.copy(focus); sh.position.copy(focus).addScaledVector(sunDir, 40).setY(focus.y + 40); } } };
}
function glow(c) { const cv = canvas(128, 128), x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, c); g.addColorStop(.15, c + 'cc'); g.addColorStop(.4, c + '33'); g.addColorStop(1, c + '00'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return tex(cv); }
function regolitoTex() { const W = 256, cv = canvas(W, W), x = cv.getContext('2d'), im = x.createImageData(W, W), D = im.data, fbm = fbmMaker(32);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const k = (j * W + i) * 4, n = fbm(i / W, j / W, 5, 4), g = rr(); const c = 60 + n * 70 + g * 18; D[k] = c * .95; D[k + 1] = c * .93; D[k + 2] = c * 1.05; D[k + 3] = 255; }
  x.putImageData(im, 0, 0); const t = tex(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
