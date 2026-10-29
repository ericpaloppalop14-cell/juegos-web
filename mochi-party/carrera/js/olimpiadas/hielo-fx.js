// ======================================================================
//  HIELO QUE SE ROMPE — capa VISUAL (o44). La jugabilidad NO cambia: las baldosas siguen siendo las de tipos.js
//  (EV.tiles con st 0/1/2). Aquí se dibuja todo de nuevo: hielo translúcido con grietas y reflejos, agua animada,
//  fragmentos y salpicaduras, glaciar y icebergs con profundidad, auroras, gradas de pingüinos, farolillos, globos,
//  personajes con bufanda y cuchillas, luces y un HUD de cristal.
// ======================================================================
import { THREE, camera, toon, glowTex, rnd, clamp, lerp, pick } from '../core3d.js?v=o44';
import { mergedGeo } from './decor.js?v=o44';
import { textTex } from './mundos.js?v=o44';

const cvs = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const VCM = () => toon('#ffffff', { vc: true, rim: .35 });
const rr = (a, b) => a + Math.random() * (b - a);

// ---------- texturas ----------
function iceTexture(level, seed) {
  const [c, x] = cvs(256); let s = seed * 9301 + 49297; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 190); g.addColorStop(0, 'rgba(255,255,255,.96)'); g.addColorStop(.55, 'rgba(226,244,255,.9)'); g.addColorStop(1, 'rgba(170,215,250,.85)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  // franjas de luz y burbujitas atrapadas
  x.globalAlpha = .22; for (let i = 0; i < 5; i++) { x.fillStyle = '#ffffff'; x.save(); x.translate(R() * 256, R() * 256); x.rotate(-.7); x.fillRect(-90, 0, 180, 4 + R() * 12); x.restore(); }
  x.globalAlpha = .5; x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 1.5; for (let i = 0; i < 16; i++) { x.beginPath(); x.arc(R() * 256, R() * 256, 1 + R() * 4, 0, 6.28); x.stroke(); }
  x.globalAlpha = .08; x.fillStyle = '#4a90d8'; for (let i = 0; i < 300; i++) x.fillRect(R() * 256, R() * 256, 1 + R() * 2, 1 + R() * 2);
  x.globalAlpha = 1;
  // grietas finas siempre presentes
  const crack = (x0, y0, ang, len, w, col, glow) => { let px = x0, py = y0; x.lineCap = 'round'; for (let i = 0; i < len; i++) { const a = ang + (R() - .5) * .9, l = 8 + R() * 12, nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l;
      x.strokeStyle = col; x.lineWidth = w; x.shadowColor = glow; x.shadowBlur = glow ? 10 : 0; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
      if (R() < .35 && w > 1) crack(nx, ny, a + (R() < .5 ? -1 : 1) * (.6 + R() * .6), Math.max(2, len - i - 3), w * .6, col, glow); px = nx; py = ny; if (px < -5 || px > 261 || py < -5 || py > 261) break; } x.shadowBlur = 0; };
  if (level === 0) { for (let i = 0; i < 2; i++) crack(R() * 256, R() * 256, R() * 6.28, 5, 1.2, 'rgba(110,170,230,.55)', ''); }
  else { const n = [0, 5, 9, 15][level]; for (let i = 0; i < n; i++) { const a = i / n * 6.28 + R() * .4; crack(128 + R() * 20 - 10, 128 + R() * 20 - 10, a, 8 + level * 3, 2.2 + level * .5, 'rgba(255,60,60,.95)', 'rgba(255,40,40,1)'); crack(128, 128, a + .02, 6 + level * 2, 1, 'rgba(255,255,255,.9)', ''); }
    x.fillStyle = `rgba(255,70,70,${.1 + level * .1})`; x.fillRect(0, 0, 256, 256); }
  // borde escarchado
  x.lineWidth = 14; x.strokeStyle = 'rgba(255,255,255,.75)'; x.strokeRect(2, 2, 252, 252); x.lineWidth = 3; x.strokeStyle = 'rgba(120,190,250,.9)'; x.strokeRect(10, 10, 236, 236);
  return tex(c);
}
function envCube() { // cielo helado para los reflejos del hielo
  const faces = []; for (let i = 0; i < 6; i++) { const [c, x] = cvs(64); const g = x.createLinearGradient(0, 0, 0, 64);
    if (i === 2) { g.addColorStop(0, '#9ad0ff'); g.addColorStop(1, '#e8f6ff'); } else if (i === 3) { g.addColorStop(0, '#1a5aa0'); g.addColorStop(1, '#2a8fd8'); } else { g.addColorStop(0, '#a8d8ff'); g.addColorStop(.55, '#f4fbff'); g.addColorStop(1, '#5ab4f0'); }
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); if (i === 4) { x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.arc(40, 18, 10, 0, 6.28); x.fill(); } if (i === 0) { x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(0, 20, 64, 8); } faces.push(c); }
  const t = new THREE.CubeTexture(faces); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}
function starTex() { const [c, x] = cvs(64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.2, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(32, 0); x.lineTo(36, 28); x.lineTo(64, 32); x.lineTo(36, 36); x.lineTo(32, 64); x.lineTo(28, 36); x.lineTo(0, 32); x.lineTo(28, 28); x.closePath(); x.fill(); return tex(c); }
function ringTexture() { const [c, x] = cvs(128); const g = x.createRadialGradient(64, 64, 34, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.7, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return tex(c); }
function scarfTex(col) { const [c, x] = cvs(64, 16); x.fillStyle = col; x.fillRect(0, 0, 64, 16); x.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) x.fillRect(i * 16 + 4, 0, 8, 16); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; }

// ---------- agua animada ----------
function makeWater(sc) {
  const g = new THREE.PlaneGeometry(420, 420, 110, 110); g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } }, transparent: false, depthWrite: true,
    vertexShader: `uniform float uT; varying vec3 vW; void main(){ vec3 p=position; float d=length(p.xz); float k=smoothstep(150.,40.,d);
      p.y += (sin(p.x*.33+uT*1.1)*.11+sin(p.z*.27-uT*.9)*.11+sin((p.x+p.z)*.62+uT*1.7)*.05)*k; vW=(modelMatrix*vec4(p,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: `uniform float uT; varying vec3 vW;
      float caus(vec2 p){ vec2 q=p; float a=0.; for(int i=0;i<3;i++){ q+=vec2(sin(q.y*1.25+uT*.9),cos(q.x*1.1-uT*.8))*.55; a+=abs(sin(q.x*1.9)+sin(q.y*2.1)); } return pow(clamp(1.-a/4.2,0.,1.),3.5); }
      void main(){ float d=length(vW.xz); vec3 deep=vec3(.015,.16,.40), mid=vec3(.06,.42,.74), sh=vec3(.28,.84,.98);
        vec3 col=mix(sh,mid,smoothstep(7.,22.,d)); col=mix(col,deep,smoothstep(22.,70.,d));
        vec3 dx=dFdx(vW), dy=dFdy(vW); vec3 n=normalize(cross(dx,dy)); n.y=abs(n.y); n=normalize(n+vec3(sin(vW.x*.9+uT*1.3),0.,cos(vW.z*.8-uT*1.1))*.12);
        vec3 V=normalize(cameraPosition-vW); float fr=pow(1.-max(dot(n,V),0.),3.);
        float c=caus(vW.xz*.55)*(1.-smoothstep(12.,34.,d)); col+=vec3(.55,.95,1.)*c*.65;
        col=mix(col,vec3(.72,.9,1.),fr*.5);
        vec3 L=normalize(vec3(.45,.5,-.75)); vec3 Rr=reflect(-V,n); float sp=pow(max(dot(Rr,L),0.),60.); col+=vec3(1.,.98,.9)*sp*1.4;
        float sh2=smoothstep(10.,0.,d)*.18; col*=1.-sh2*.5; // sombra bajo el hielo
        col=mix(col,vec3(.80,.91,1.),smoothstep(90.,230.,distance(cameraPosition,vW)));
        gl_FragColor=vec4(col,1.); }` });
  const w = new THREE.Mesh(g, m); w.position.y = -2.3; w.frustumCulled = false; sc.add(w); return w;
}

// ---------- aurora ----------
function makeAurora(sc) {
  const out = []; const cols = [[.2, 1., .6], [.3, .8, 1.], [1., .5, .9]];
  cols.forEach((cl, i) => { const g = new THREE.PlaneGeometry(260, 46, 60, 1); const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector3(...cl) }, uP: { value: i * 2.1 } },
      vertexShader: `uniform float uT,uP; varying vec2 vUv; void main(){ vUv=uv; vec3 p=position; p.y+=sin(p.x*.05+uT*.4+uP)*5.; p.z+=sin(p.x*.03+uT*.3+uP)*10.; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform float uT,uP; uniform vec3 uC; varying vec2 vUv; void main(){ float a=smoothstep(0.,.35,vUv.y)*smoothstep(1.,.45,vUv.y); a*=.55+.45*sin(vUv.x*14.+uT*.8+uP)*sin(vUv.x*5.-uT*.5); gl_FragColor=vec4(uC*a,a*.5); }` });
    const p = new THREE.Mesh(g, m); p.position.set(-30 + i * 38, 54 + i * 6, -150 - i * 14); p.rotation.y = .12 * (i - 1); p.renderOrder = -.5; p.frustumCulled = false; sc.add(p); out.push(m); });
  return out;
}

// ---------- utilidades de instancias ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function setM(im, i, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) { _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s); im.setMatrixAt(i, _m); }
function normGeo(kind, h) { const g = mergedGeo(kind).clone(); g.computeBoundingBox(); const hh = g.boundingBox.max.y - g.boundingBox.min.y || 1; g.scale(h / hh, h / hh, h / hh); g.computeBoundingBox(); return g; }

export function hieloFx(E, EV, cfg, R, M) {
  const sc = E.scene, TS = EV.ts || 2.2, T0 = performance.now();
  const dispo = [];
  // ----- luces extra (todas desde el principio: sin recompilar shaders luego) -----
  const rim = new THREE.DirectionalLight('#9fd8ff', 1.1); rim.position.set(-14, 16, -30); sc.add(rim);
  const under = new THREE.PointLight('#38c8ff', 2.2, 30, 1.6); under.position.set(0, -1.6, 0); sc.add(under);
  const warm = new THREE.DirectionalLight('#fff0d0', .9); warm.position.set(18, 22, 14); sc.add(warm);

  // ----- agua y aurora -----
  const water = makeWater(sc), aur = makeAurora(sc);

  // ----- baldosas de hielo -----
  const env = envCube(), w0 = TS - .16;
  const sh = new THREE.Shape(); { const w = w0 / 2, r = .28; sh.moveTo(-w + r, -w); sh.lineTo(w - r, -w); sh.quadraticCurveTo(w, -w, w, -w + r); sh.lineTo(w, w - r); sh.quadraticCurveTo(w, w, w - r, w); sh.lineTo(-w + r, w); sh.quadraticCurveTo(-w, w, -w, w - r); sh.lineTo(-w, -w + r); sh.quadraticCurveTo(-w, -w, -w + r, -w); }
  const tg = new THREE.ExtrudeGeometry(sh, { depth: .5, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 2, curveSegments: 5 }); tg.translate(0, 0, -.25); tg.rotateX(-Math.PI / 2);
  { const uv = tg.attributes.uv, P = tg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, P.getX(i) / w0 + .5, P.getZ(i) / w0 + .5); }
  const mkIce = (map, col, em, ei) => new THREE.MeshPhongMaterial({ map, color: col, transparent: true, opacity: .84, shininess: 120, specular: '#ffffff', envMap: env, combine: THREE.MixOperation, reflectivity: .32, emissive: em, emissiveIntensity: ei });
  const iceMats = [0, 1, 2, 3].map(i => mkIce(iceTexture(0, i + 1), i % 2 ? '#c9ecff' : '#e6f6ff', '#2a78c8', .12));
  const warnMats = [1, 2, 3].map(l => mkIce(iceTexture(l, 40 + l), '#ffd0d0', '#ff2a2a', .35));
  const coreGeo = new THREE.BoxGeometry(w0 - .22, .5, w0 - .22), coreMat = new THREE.MeshPhongMaterial({ color: '#2b9be0', emissive: '#0a4a9a', emissiveIntensity: .5, shininess: 40 });
  const coreWarn = new THREE.MeshPhongMaterial({ color: '#ff6a6a', emissive: '#c01010', emissiveIntensity: .6, shininess: 40 });
  for (const q of EV.tiles) { q.m.visible = false; const g = new THREE.Group(); const shell = new THREE.Mesh(tg, iceMats[Math.floor(Math.random() * 4)]); const core = new THREE.Mesh(coreGeo, coreMat); core.position.y = -.02; g.add(core); g.add(shell); g.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2; g.position.set(q.x, q.y, q.z); sc.add(g);
    q.v = { g, shell, core, base: shell.material, st: 0, spin: [rr(-2, 2), rr(-2, 2)], splashed: false, lvl: 0 }; }

  // ----- fragmentos de hielo, gotas, anillos, destellos -----
  const NS = 280, shardGeo = new THREE.TetrahedronGeometry(.2, 0), shardMat = new THREE.MeshPhongMaterial({ color: '#d8f2ff', transparent: true, opacity: .88, shininess: 100, specular: '#ffffff', flatShading: true, emissive: '#3a8ad8', emissiveIntensity: .25 });
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, NS); shards.frustumCulled = false; sc.add(shards); const SH = Array.from({ length: NS }, () => ({ l: 0, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, s: 1, wx: 0, wy: 0 })); let shI = 0;
  for (let i = 0; i < NS; i++) setM(shards, i, 0, -99, 0, 0, 0, 0);
  const ND = 420, dPos = new Float32Array(ND * 3).fill(-99), dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const drops = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: '#e8fbff', size: .34, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex('#ffffff') })); drops.frustumCulled = false; sc.add(drops);
  const DR = Array.from({ length: ND }, () => ({ l: 0, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0 })); let drI = 0;
  const rt = ringTexture(), ringGeo = new THREE.PlaneGeometry(1, 1); ringGeo.rotateX(-Math.PI / 2);
  const RINGS = Array.from({ length: 18 }, () => { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: rt, color: '#e8fbff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.visible = false; m.position.y = -2.26; sc.add(m); return { m, l: 0, L: 1, S: 4 }; }); let rgI = 0;
  const ring = (x, z, S, L = 1) => { const r = RINGS[rgI++ % RINGS.length]; r.l = L; r.L = L; r.S = S; r.m.position.x = x; r.m.position.z = z; r.m.visible = true; };
  const spawnShards = (x, y, z, n, sp) => { for (let i = 0; i < n; i++) { const s = SH[shI++ % NS]; s.l = rr(1.0, 1.8); s.x = x + rr(-.9, .9); s.y = y + rr(0, .5); s.z = z + rr(-.9, .9); const a = Math.random() * 6.28, v = rr(.3, 1) * sp; s.vx = Math.cos(a) * v; s.vz = Math.sin(a) * v; s.vy = rr(2, 7); s.s = rr(.5, 1.5); s.wx = rr(-8, 8); s.wy = rr(-8, 8); s.rx = rr(0, 6); s.ry = rr(0, 6); } };
  const spawnDrops = (x, z, n, sp, h = 5) => { for (let i = 0; i < n; i++) { const d = DR[drI++ % ND]; d.l = rr(.6, 1.2); d.x = x + rr(-.5, .5); d.y = -2.25; d.z = z + rr(-.5, .5); const a = Math.random() * 6.28, v = rr(.2, 1) * sp; d.vx = Math.cos(a) * v; d.vz = Math.sin(a) * v; d.vy = rr(3, h + 3); } };
  const stT = starTex(), GL = Array.from({ length: 34 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: stT, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.scale.setScalar(.01); sc.add(s); return { s, t: rr(0, 3), per: rr(1.4, 3), q: null, off: [0, 0] }; });

  // ----- gradas de pingüinos, floes, glaciar, icebergs -----
  const pGeo = (() => { const g = normGeo('pinguino', 2.1), C = g.attributes.color; for (let i = 0; i < C.count; i++) { const l = C.getX(i) * .3 + C.getY(i) * .59 + C.getZ(i) * .11; if (l < .45) C.setXYZ(i, .66, .72, .95); } return g; })(), pMat = VCM(), tiers = [[16.5, 3, .9], [19.8, 3, 1.8], [23.1, 3, 2.7]], crowd = [];
  const a0 = 18 * Math.PI / 180, a1 = 162 * Math.PI / 180;
  tiers.forEach(([r0, wd, h], ti) => { const s = new THREE.Shape(); s.absarc(0, 0, r0 + wd, a0, a1, false); s.absarc(0, 0, r0, a1, a0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: h + 1.4, bevelEnabled: false, curveSegments: 40 }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: ti % 2 ? '#e4f4ff' : '#cfe9ff', shininess: 60, specular: '#ffffff', envMap: env, combine: THREE.MixOperation, reflectivity: .2, emissive: '#2a6ab8', emissiveIntensity: .1 })); m.position.y = -2.4; sc.add(m);
    const n = Math.floor((a1 - a0) * (r0 + wd / 2) / 1.5); for (let i = 0; i < n; i++) { const a = a0 + (i + .5) / n * (a1 - a0), rad = r0 + wd * (.35 + (i % 2) * .3); crowd.push({ x: Math.cos(a) * rad, z: -Math.sin(a) * rad, y: -2.4 + h + 1.4, a, ph: rr(0, 6.28), sp: rr(3, 7), k: i }); } });
  const peng = new THREE.InstancedMesh(pGeo, pMat, crowd.length); peng.frustumCulled = false; sc.add(peng); { const c = new THREE.Color(); const pal = ['#ff8fc4', '#ffd23a', '#7ee3c4', '#8fb8ff', '#ffa86a', '#c4a4ff', '#ffffff']; crowd.forEach((p, i) => { peng.setColorAt(i, c.set(pick(pal))); }); }
  // glaciar (dos filas) y montañas lejanas
  const spire = new THREE.CylinderGeometry(.25, 1, 1, 5, 1); spire.translate(0, .5, 0);
  const iceMat2 = new THREE.MeshPhongMaterial({ color: '#d4eeff', flatShading: true, shininess: 80, specular: '#ffffff', emissive: '#3a8ae0', emissiveIntensity: .28, transparent: true, opacity: .96, envMap: env, combine: THREE.MixOperation, reflectivity: .3 });
  const NSP = 70, spires = new THREE.InstancedMesh(spire, iceMat2, NSP); spires.frustumCulled = false; sc.add(spires); { const c = new THREE.Color(); for (let i = 0; i < NSP; i++) { const row = i < 40 ? 0 : 1, a = a0 - .45 + (i % 40) / 40 * (a1 - a0 + .9) * (row ? 1 : 1) + rr(-.04, .04), rad = row ? rr(60, 70) : rr(44, 52), h = row ? rr(14, 30) : rr(8, 20), wd = rr(3, 7);
      setM(spires, i, Math.cos(a) * rad, -2.4, -Math.sin(a) * rad, wd, h, wd, rr(0, 6), rr(-.08, .08), rr(-.08, .08)); spires.setColorAt(i, c.set(pick(['#ffffff', '#cfeaff', '#b4dcff', '#e6f6ff']))); } }
  const NB = 16, bergG = new THREE.IcosahedronGeometry(1, 1), bergs = new THREE.InstancedMesh(bergG, iceMat2, NB); bergs.frustumCulled = false; sc.add(bergs); const BG = [];
  for (let i = 0; i < NB; i++) { const a = rr(0, 6.28), rad = rr(40, 62); if ((a > 4.0 && a < 5.4 && rad < 50) || Math.sin(a) * rad > -4) { i--; continue; } const s = rr(2, 4.6); BG.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, s, ph: rr(0, 6.28), ry: rr(0, 6) }); }
  { const c = new THREE.Color(); BG.forEach((b, i) => bergs.setColorAt(i, c.set(pick(['#ffffff', '#d8f0ff', '#b8e0ff'])))); }
  const mtn = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), new THREE.MeshPhongMaterial({ color: '#c8d8f8', flatShading: true, emissive: '#6a8ad8', emissiveIntensity: .25 }), 14); mtn.frustumCulled = false; sc.add(mtn);
  for (let i = 0; i < 14; i++) { const a = a0 - .5 + i / 13 * (a1 - a0 + 1), rad = rr(125, 150), h = rr(34, 62); setM(mtn, i, Math.cos(a) * rad, -2.4 + h / 2, -Math.sin(a) * rad, h * .75, h, h * .75, rr(0, 6)); }
  // floes con muñecos de nieve y pinos
  const NF = 22, floeG = new THREE.CylinderGeometry(1, .82, .7, 7), floes = new THREE.InstancedMesh(floeG, new THREE.MeshPhongMaterial({ color: '#f0faff', flatShading: true, shininess: 40, emissive: '#3a8ae0', emissiveIntensity: .1 }), NF); floes.frustumCulled = false; sc.add(floes); const FL = [];
  for (let i = 0; i < NF; i++) { const a = rr(0, 6.28), rad = rr(15, 34); if (Math.hypot(Math.cos(a) * rad, Math.sin(a) * rad) < 14) { i--; continue; } if (Math.sin(a) < -.1 && rad < 27) { i--; continue; } if (Math.sin(a) * rad > 2) { i--; continue; } FL.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, s: rr(1.4, 3), ph: rr(0, 6.28) }); }
  const fMu = new THREE.InstancedMesh(normGeo('muneco', 1.5), VCM(), 8), fPi = new THREE.InstancedMesh(normGeo('pino', 3.2), VCM(), 8); fMu.frustumCulled = fPi.frustumCulled = false; sc.add(fMu); sc.add(fPi);
  // globos y farolillos
  const NBL = 10, ballG = new THREE.SphereGeometry(.34, 14, 10), balls = new THREE.InstancedMesh(ballG, new THREE.MeshPhongMaterial({ color: '#ffffff', shininess: 90, specular: '#ffffff', emissive: '#ffffff', emissiveIntensity: .12 }), NBL); balls.frustumCulled = false; sc.add(balls); const BL = [];
  { const c = new THREE.Color(); for (let i = 0; i < NBL; i++) { const t = tiers[i % 3], a = rr(a0 + .1, a1 - .1); BL.push({ x: Math.cos(a) * (t[0] + 1.5), z: -Math.sin(a) * (t[0] + 1.5), y: rr(2.2, 4.4), ph: rr(0, 6.28) }); balls.setColorAt(i, c.set(pick(['#ff6fae', '#ffd23a', '#7ee3c4', '#9b82f0', '#ff9a4a', '#6ec6ff']))); } }
  const lanterns = []; for (let i = 0; i < 9; i++) { const a = a0 + .08 + i / 8 * (a1 - a0 - .16), rad = tiers[2][0] + 3.4, x = Math.cos(a) * rad, z = -Math.sin(a) * rad; const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 3.4, 6), new THREE.MeshPhongMaterial({ color: '#8ab4e0' })); post.position.set(x, -2.4 + 2.7 + 1.7, z); sc.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.34, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff3b0' })); lamp.position.set(x, -2.4 + 2.7 + 3.5, z); sc.add(lamp); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffe9a0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 })); gl.scale.setScalar(3.4); gl.position.copy(lamp.position); sc.add(gl); lanterns.push(gl); }
  { const bn = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.8), new THREE.MeshBasicMaterial({ map: textTex('❄ HIELO QUE SE ROMPE ❄', '#4aa8f0', '#ffffff', 1024, 160, 92), side: THREE.DoubleSide, transparent: true })); bn.position.set(0, 9.2, -29); sc.add(bn);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 8, 6), new THREE.MeshPhongMaterial({ color: '#ffffff' })); p.position.set(s * 8.6, 5.3, -29); sc.add(p); } }
  // sol brillante lejano
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#fff6d0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: .9 })); sun.scale.setScalar(90); sun.position.set(70, 60, -150); sc.add(sun);

  // ----- personajes con más detalle: bufanda a rayas, cuchillas de patín y aro de luz -----
  const skateMat = new THREE.MeshPhongMaterial({ color: '#e8f6ff', shininess: 140, specular: '#ffffff' });
  for (const r of E.racers) { const c = r.obj.userData.char, pv = r.obj.userData.pivot; if (!c) continue; c.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(c), sz = bb.getSize(new THREE.Vector3()), ce = bb.getCenter(new THREE.Vector3()), ps = pv.scale.x || 1; c.worldToLocal(ce);
    const Rr = Math.min(sz.x, sz.z) * .5 / ps, top = sz.y / ps, g = new THREE.Group(); g.position.copy(ce); g.position.y = ce.y - sz.y / ps * .5 + top * .5; c.add(g);
    for (const s of [-1, 1]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(Rr * .05, Rr * .04, Rr * .6), skateMat); bl.position.set(s * Rr * .2, -top * .5 + .02 / ps, 0); g.add(bl); }
    const rg = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: rt, color: r.ch.color, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending })); rg.scale.setScalar(1.5); rg.position.y = .05; r.obj.add(rg); r._glow = rg; }

  // reflejo frío en todos los personajes
  for (const r of E.racers) r.obj.userData.char && r.obj.userData.char.traverse(o => { const ms = [].concat(o.material || []); for (const m of ms) if (m.emissive && !m.emissiveIntensity && !m.userData._hz) { m.userData._hz = 1; m.emissive.set('#3a78c8'); m.emissiveIntensity = .1; } });
  // ----- HUD de cristal + viñetas -----
  const st = document.createElement('style'); st.id = 'hzCss'; st.textContent = `#perf{display:none!important}
#hzHud{position:absolute;left:50%;transform:translateX(-50%);top:calc(92px + env(safe-area-inset-top));display:flex;gap:7px;font-family:Fredoka,sans-serif;pointer-events:none}
#hzHud .c{display:flex;align-items:center;gap:6px;padding:5px 12px 5px 8px;border-radius:20px;background:linear-gradient(rgba(255,255,255,.62),rgba(190,230,255,.45));border:2px solid rgba(255,255,255,.9);box-shadow:0 4px 14px rgba(40,100,180,.35),inset 0 2px 0 rgba(255,255,255,.8);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#17508a;font-weight:700;font-size:19px;line-height:1;text-shadow:0 1px 0 rgba(255,255,255,.8)}
#hzHud .c i{font-style:normal;font-size:20px}#hzHud .c small{font-size:11px;font-weight:600;opacity:.75;display:block;margin-top:1px}
#hzHud .c.lo b{color:#e0306a;animation:hzP .5s ease-in-out infinite alternate}@keyframes hzP{to{transform:scale(1.18)}}
#hzV{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,rgba(255,255,255,0) 52%,rgba(150,215,255,.38) 100%),radial-gradient(circle at 92% 6%,rgba(255,246,200,.35),rgba(255,246,200,0) 38%);mix-blend-mode:normal}
#hzV::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.0) 30%,rgba(255,255,255,.12) 38%,rgba(255,255,255,0) 46%,rgba(255,255,255,.08) 58%,rgba(255,255,255,0) 66%);}
#hzR{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .15s;background:radial-gradient(ellipse at 50% 50%,rgba(255,40,70,0) 45%,rgba(255,40,70,.55) 100%)}
#hzR.on{opacity:1;animation:hzB .32s ease-in-out infinite alternate}@keyframes hzB{to{opacity:.55}}
#hzW{position:absolute;left:50%;transform:translateX(-50%);top:calc(150px + env(safe-area-inset-top));font-family:Fredoka,sans-serif;font-weight:700;font-size:26px;color:#fff;-webkit-text-stroke:1.5px #d0204a;text-shadow:0 4px 0 #d0204a;opacity:0;pointer-events:none;white-space:nowrap;transition:opacity .15s}
#hzW.on{opacity:1;animation:hzP .3s ease-in-out infinite alternate}
@media (orientation:landscape) and (max-height:500px){#hzHud{top:calc(70px + env(safe-area-inset-top))}#hzHud .c{font-size:16px;padding:3px 10px 3px 6px}#hzW{top:calc(116px + env(safe-area-inset-top));font-size:21px}}`;
  document.head.appendChild(st); const hud = document.getElementById('hud'); const hz = document.createElement('div'); hz.id = 'hzBox';
  hz.innerHTML = `<div id="hzV"></div><div id="hzR"></div><div id="hzHud"><div class="c" id="hzT"><i>⏱️</i><div><b>45</b><small>segundos</small></div></div><div class="c" id="hzA"><i>👥</i><div><b>6</b><small>en pie</small></div></div></div><div id="hzW">¡MUÉVETE! 🥶</div>`;
  hud.insertBefore(hz, hud.firstChild); const eT = hz.querySelector('#hzT b'), eA = hz.querySelector('#hzA b'), eR = hz.querySelector('#hzR'), eW = hz.querySelector('#hzW'), cT = hz.querySelector('#hzT');
  const TT = cfg.T || 45;

  let T = 0, trail = 0, ripT = 0; const fell = new Set();
  return {
    tick(E, dt) { dt = Math.min(dt, .1); T += dt; const t = T, me = E.me;
      water.material.uniforms.uT.value = t; for (const m of aur) m.uniforms.uT.value = t; under.intensity = 2 + Math.sin(t * 2) * .4;
      // baldosas
      for (const q of EV.tiles) { q.m.visible = false; const v = q.v, g = v.g;
        if (q.st === 0) { g.position.set(q.x, q.y, q.z); }
        else if (q.st === 1) { const k = clamp(1 - q.sh / (cfg.warn || 1.9), 0, 1), lvl = k < .33 ? 0 : k < .66 ? 1 : 2; if (v.st !== 1) { v.st = 1; E.burst(new THREE.Vector3(q.x, .3, q.z), '#e8fbff', 6, 3, .5, .35); }
          if (v.lvl !== lvl || !v.hot) { v.lvl = lvl; v.hot = 1; v.shell.material = warnMats[lvl]; v.core.material = coreWarn; }
          const amp = .03 + k * .08; g.position.set(q.x + Math.sin(t * 46 + q.x) * amp, q.y + Math.sin(t * 38) * .03, q.z + Math.cos(t * 43 + q.z) * amp); warnMats.forEach(m => m.emissiveIntensity = .3 + .3 * Math.sin(t * 14));
          if (Math.random() < dt * 5) E.burst(new THREE.Vector3(q.x + rr(-.8, .8), .35, q.z + rr(-.8, .8)), '#ffffff', 1, 1.5, .35, .22, 2); }
        else { if (v.st !== 2) { v.st = 2; v.g.rotation.y += 0; spawnShards(q.x, .2, q.z, 14, 5); E.burst(new THREE.Vector3(q.x, .3, q.z), '#bff0ff', 12, 4, .6, .45); v.shell.material = warnMats[2]; }
          g.position.set(q.x, q.y, q.z); g.rotation.x += v.spin[0] * dt; g.rotation.z += v.spin[1] * dt; g.visible = q.y > -9;
          if (!v.splashed && q.y < -2.0) { v.splashed = true; ring(q.x, q.z, 6.5, 1.1); ring(q.x, q.z, 3.2, .7); spawnDrops(q.x, q.z, 26, 4, 5); spawnShards(q.x, -1.9, q.z, 4, 2); } } }
      // fragmentos
      for (let i = 0; i < NS; i++) { const s = SH[i]; if (s.l > 0) { s.l -= dt; s.vy -= 16 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.rx += s.wx * dt; s.ry += s.wy * dt; if (s.y < -2.2) { s.l = 0; spawnDrops(s.x, s.z, 2, 1.5, 2); }
          const k = clamp(s.l / .5, 0, 1); setM(shards, i, s.x, s.y, s.z, s.s * k, s.s * k, s.s * k, s.ry, s.rx, 0); } else if (s.y > -90) { s.y = -99; setM(shards, i, 0, -99, 0, 0, 0, 0); } }
      shards.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < ND; i++) { const d = DR[i]; if (d.l > 0) { d.l -= dt; d.vy -= 14 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; if (d.y < -2.3) d.l = 0; dPos[i * 3] = d.x; dPos[i * 3 + 1] = d.y; dPos[i * 3 + 2] = d.z; } else dPos[i * 3 + 1] = -99; }
      dGeo.attributes.position.needsUpdate = true;
      for (const r of RINGS) if (r.l > 0) { r.l -= dt; const k = 1 - r.l / r.L; r.m.scale.setScalar(.5 + r.S * k); r.m.material.opacity = (1 - k) * .85; if (r.l <= 0) r.m.visible = false; }
      // destellos sobre el hielo
      for (const g of GL) { g.t += dt; if (g.t > g.per) { g.t = 0; g.per = rr(1.2, 3); const live = EV.tiles.filter(q => q.st !== 2); g.q = live.length ? pick(live) : null; g.off = [rr(-.8, .8), rr(-.8, .8)]; }
        const k = g.t / g.per, a = g.q ? Math.sin(Math.min(1, k * 1.6) * Math.PI) : 0; g.s.material.opacity = a * .95; g.s.scale.setScalar(.2 + a * .9); if (g.q) g.s.position.set(g.q.x + g.off[0], .45, g.q.z + g.off[1]); g.s.material.rotation = t + g.per; }
      // público
      for (let i = 0; i < crowd.length; i++) { const p = crowd[i], hop = Math.max(0, Math.sin(t * p.sp + p.ph)) * .28 * (1 + (E.t > 20 ? .5 : 0)); setM(peng, i, p.x, p.y + hop, p.z, 1, 1, 1, Math.atan2(-p.x, -p.z) + Math.PI + Math.sin(t * 2 + p.ph) * .12, 0, Math.sin(t * p.sp * .5 + p.ph) * .12); }
      peng.instanceMatrix.needsUpdate = true;
      BG.forEach((b, i) => setM(bergs, i, b.x, -2.45 + b.s * .35 + Math.sin(t * .6 + b.ph) * .12, b.z, b.s, b.s * 1.1, b.s * .9, b.ry + t * .02, 0, Math.sin(t * .5 + b.ph) * .03)); bergs.instanceMatrix.needsUpdate = true;
      FL.forEach((f, i) => { const y = -2.3 + Math.sin(t * .9 + f.ph) * .1; setM(floes, i, f.x, y, f.z, f.s, 1, f.s, f.ph); if (i < 8) { setM(fMu, i, f.x, y + .35, f.z, 1, 1, 1, f.ph + 3); } if (i >= 8 && i < 16) setM(fPi, i - 8, f.x, y + .35, f.z, 1, 1, 1, f.ph); }); floes.instanceMatrix.needsUpdate = true; fMu.instanceMatrix.needsUpdate = fPi.instanceMatrix.needsUpdate = true;
      BL.forEach((b, i) => setM(balls, i, b.x + Math.sin(t * .7 + b.ph) * .5, b.y + Math.sin(t * 1.1 + b.ph) * .4, b.z, 1, 1.18, 1)); balls.instanceMatrix.needsUpdate = true;
      lanterns.forEach((l, i) => { l.material.opacity = .75 + Math.sin(t * 3 + i) * .2; });
      sun.material.opacity = .8 + Math.sin(t * .8) * .1;
      // personajes
      for (const r of E.racers) { const mv = Math.hypot(r.vx || 0, r.vz || 0); if (r._glow) { r._glow.visible = !r.out; r._glow.material.opacity = .45 + Math.sin(t * 3 + r.k) * .15 + (r.me ? .25 : 0); }
        if (!r.out && mv > 2.5 && Math.random() < dt * 14) E.burst(new THREE.Vector3(r.x, .12, r.z), '#e8fbff', 1, 1.2, .45, .26, 0);
        if (r.out && r.y < -2.0 && !fell.has(r.k)) { fell.add(r.k); ring(r.x, r.z, 9, 1.3); ring(r.x, r.z, 5, .8); spawnDrops(r.x, r.z, 60, 5.5, 8); spawnShards(r.x, -1.9, r.z, 6, 3); } }
      // HUD
      const left = Math.max(0, TT - E.t), alive = E.racers.filter(r => !r.out).length; eT.textContent = left.toFixed(0); eA.textContent = alive; cT.classList.toggle('lo', left < 10);
      const cur = !me.out ? EV.tileAt(me.x, me.z) : null, danger = !!(cur && cur.st === 1); eR.classList.toggle('on', danger); eW.classList.toggle('on', danger);
    },
    dispose() { const s = document.getElementById('hzCss'); if (s) s.remove(); hz.remove(); } };
}
