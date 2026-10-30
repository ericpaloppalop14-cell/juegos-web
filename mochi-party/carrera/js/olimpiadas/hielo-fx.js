// ======================================================================
//  HIELO QUE SE ROMPE — capa VISUAL (o45): legibilidad primero. La jugabilidad NO cambia (EV.tiles st 0/1/2 de tipos.js).
//   · baldosa sana = azul hielo brillante · aviso = amarillo/naranja parpadeando · a punto de caer = rojo intenso parpadeando
//   · contorno oscuro nítido, agua oscura detrás (máximo contraste), personajes con sombra y aro de color
//   · NADA encima del tablero: sin nubes, niebla, nieve, aurora ni viñetas. Decorado solo en los bordes.
// ======================================================================
import { THREE, toon, glowTex, rnd, clamp, pick } from '../core3d.js?v=o47';
import { mergedGeo } from './decor.js?v=o47';

const cvs = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const rr = (a, b) => a + Math.random() * (b - a);
const VCM = () => toon('#ffffff', { vc: true, rim: .3 });
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// detalle gris claro (se multiplica por el color del estado): marco biselado, brillo diagonal y grietas
function tileTexture(level, seed) {
  const [c, x] = cvs(256); let s = seed * 9301 + 49297; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
  const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(.58, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.10)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  // marco interior más oscuro y borde claro (da volumen)
  x.lineWidth = 16; x.strokeStyle = 'rgba(255,255,255,1)'; x.strokeRect(8, 8, 240, 240); x.lineWidth = 5; x.strokeStyle = 'rgba(0,40,110,.38)'; x.strokeRect(22, 22, 212, 212);
  x.fillStyle = 'rgba(0,50,130,.07)'; x.fillRect(28, 28, 200, 200);
  const crack = (x0, y0, ang, len, w, col) => { let px = x0, py = y0; x.lineCap = 'round'; x.strokeStyle = col; for (let i = 0; i < len; i++) { const a = ang + (R() - .5) * 1.0, l = 9 + R() * 13, nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l; x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
      if (R() < .4 && w > 1.4) crack(nx, ny, a + (R() < .5 ? -1 : 1) * (.5 + R() * .7), Math.max(2, len - i - 3), w * .65, col); px = nx; py = ny; if (px < 6 || px > 250 || py < 6 || py > 250) break; } };
  if (level === 0) { x.globalAlpha = .55; for (let i = 0; i < 2; i++) crack(30 + R() * 190, 30 + R() * 190, R() * 6.28, 4, 1.4, 'rgba(255,255,255,1)'); x.globalAlpha = 1; for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(30 + R() * 196, 30 + R() * 196, 1 + R() * 2.5, 0, 6.28); x.fill(); } }
  else { const n = level === 1 ? 6 : 11; for (let i = 0; i < n; i++) { const a = i / n * 6.28 + R() * .4; crack(128 + R() * 16 - 8, 128 + R() * 16 - 8, a, 7 + level * 3, 4 + level, 'rgba(40,0,0,.92)'); crack(128, 128, a + .03, 6 + level * 2, 1.4, 'rgba(255,255,255,.85)'); } }
  return tex(c);
}
function envCube() { // cielo limpio para el reflejo del hielo
  const faces = []; for (let i = 0; i < 6; i++) { const [c, x] = cvs(64); const g = x.createLinearGradient(0, 0, 0, 64);
    if (i === 2) { g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#ffffff'); } else if (i === 3) { g.addColorStop(0, '#0a3a7a'); g.addColorStop(1, '#0a3a7a'); } else { g.addColorStop(0, '#9fd4ff'); g.addColorStop(.5, '#ffffff'); g.addColorStop(1, '#4aa8f0'); }
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); if (i === 4) { x.fillStyle = '#fff'; x.beginPath(); x.arc(40, 18, 12, 0, 6.28); x.fill(); } faces.push(c); }
  const t = new THREE.CubeTexture(faces); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}
function ringTexture() { const [c, x] = cvs(128); const g = x.createRadialGradient(64, 64, 34, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.7, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return tex(c); }
function shadowTexture() { const [c, x] = cvs(64); const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,12,40,.75)'); g.addColorStop(.6, 'rgba(0,12,40,.45)'); g.addColorStop(1, 'rgba(0,12,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return tex(c); }

// ---------- agua oscura animada (contraste máximo con el hielo) ----------
function makeWater(sc) {
  const g = new THREE.PlaneGeometry(420, 420, 70, 70); g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } },
    vertexShader: `uniform float uT; varying vec3 vW; void main(){ vec3 p=position; float d=length(p.xz); float k=smoothstep(120.,30.,d);
      p.y += (sin(p.x*.33+uT*1.1)*.09+sin(p.z*.27-uT*.9)*.09+sin((p.x+p.z)*.62+uT*1.7)*.04)*k; vW=(modelMatrix*vec4(p,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: `uniform float uT; varying vec3 vW;
      float caus(vec2 p){ vec2 q=p; float a=0.; for(int i=0;i<3;i++){ q+=vec2(sin(q.y*1.25+uT*.8),cos(q.x*1.1-uT*.7))*.55; a+=abs(sin(q.x*1.9)+sin(q.y*2.1)); } return pow(clamp(1.-a/4.2,0.,1.),3.5); }
      void main(){ float d=length(vW.xz); vec3 deep=vec3(.01,.07,.22), mid=vec3(.02,.17,.42), sh=vec3(.05,.36,.62);
        vec3 col=mix(sh,mid,smoothstep(11.,24.,d)); col=mix(col,deep,smoothstep(22.,60.,d));
        float c=caus(vW.xz*.5)*(1.-smoothstep(10.,30.,d)); col+=vec3(.25,.6,.85)*c*.30;
        vec3 n=normalize(cross(dFdx(vW),dFdy(vW))); n.y=abs(n.y); vec3 V=normalize(cameraPosition-vW);
        float fr=pow(1.-max(dot(n,V),0.),3.); col=mix(col,vec3(.35,.6,.9),fr*.22);
        vec3 R=reflect(-V,n); float sp=pow(max(dot(R,normalize(vec3(.4,.5,-.7))),0.),90.); col+=vec3(.9,.95,1.)*sp*.7;
        col=mix(col,vec3(.07,.2,.42),smoothstep(100.,240.,distance(cameraPosition,vW)));
        gl_FragColor=vec4(col,1.); }` });
  const w = new THREE.Mesh(g, m); w.position.y = -2.3; w.frustumCulled = false; sc.add(w); return w;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function setM(im, i, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) { _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s); im.setMatrixAt(i, _m); }
function normGeo(kind, h) { const g = mergedGeo(kind).clone(); g.computeBoundingBox(); const hh = g.boundingBox.max.y - g.boundingBox.min.y || 1; g.scale(h / hh, h / hh, h / hh); return g; }

export function hieloFx(E, EV, cfg, R) {
  const sc = E.scene, TS = EV.ts || 2.2, W = EV.W;
  // ----- fuera todo lo que pueda tapar el tablero (nubes, copos, nevada, astro) -----
  (W.rich && W.rich.sets || []).forEach(s => { if (/^(nube|nubeLejos|copo)$/.test(s.kind)) s.im.visible = false; });
  if (W.amb) W.amb.visible = false; if (W.rich && W.rich.astro) W.rich.astro.visible = false;
  sc.fog = new THREE.Fog('#0a2a5a', 110, 320); // sin niebla clara delante: solo difumina muy lejos
  const warm = new THREE.DirectionalLight('#fff4e0', .85); warm.position.set(14, 24, 12); sc.add(warm);
  const water = makeWater(sc);

  // ----- baldosas: opacas, brillantes, con contorno -----
  const env = envCube(), w0 = TS - .16;
  const sh = new THREE.Shape(); { const w = w0 / 2, r = .3; sh.moveTo(-w + r, -w); sh.lineTo(w - r, -w); sh.quadraticCurveTo(w, -w, w, -w + r); sh.lineTo(w, w - r); sh.quadraticCurveTo(w, w, w - r, w); sh.lineTo(-w + r, w); sh.quadraticCurveTo(-w, w, -w, w - r); sh.lineTo(-w, -w + r); sh.quadraticCurveTo(-w, -w, -w + r, -w); }
  const tg = new THREE.ExtrudeGeometry(sh, { depth: .5, bevelEnabled: true, bevelThickness: .07, bevelSize: .07, bevelSegments: 2, curveSegments: 5 }); tg.translate(0, 0, -.25); tg.rotateX(-Math.PI / 2);
  { const uv = tg.attributes.uv, P = tg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, P.getX(i) / w0 + .5, P.getZ(i) / w0 + .5); }
  const mk = (map, color, em, ei) => new THREE.MeshPhongMaterial({ map, color, emissive: em, emissiveIntensity: ei, shininess: 90, specular: '#ffffff', envMap: env, combine: THREE.MixOperation, reflectivity: .22 });
  const t0 = tileTexture(0, 3), t1 = tileTexture(1, 21), t2 = tileTexture(2, 33);
  const okA = mk(t0, '#35b9ff', '#0a5fb0', .35), okB = mk(tileTexture(0, 9), '#1f9bf0', '#0a4fa0', .35);
  const w1 = mk(t1, '#ffc01a', '#ff9a00', .55), w2 = mk(t2, '#ff2030', '#e00010', .75);
  const hullGeo = tg, hullMat = new THREE.MeshBasicMaterial({ color: '#04163a', side: THREE.BackSide });
  for (const q of EV.tiles) { q.m.visible = false; const g = new THREE.Group(); const base = ((Math.round(q.x / TS) + Math.round(q.z / TS)) & 1) ? okA : okB;
    const top = new THREE.Mesh(tg, base); const hull = new THREE.Mesh(hullGeo, hullMat); hull.scale.set(1.075, 1.2, 1.075); g.add(hull); g.add(top);
    g.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2; g.position.set(q.x, q.y, q.z); sc.add(g);
    q.v = { g, top, base, st: 0, spin: [rr(-2, 2), rr(-2, 2)], splashed: false }; }

  // ----- fragmentos, gotas, anillos (solo al romperse / caer) -----
  const NS = 220, shardMat = new THREE.MeshPhongMaterial({ color: '#9fe0ff', shininess: 100, specular: '#ffffff', flatShading: true, emissive: '#2a8ae0', emissiveIntensity: .35 });
  const shards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.22, 0), shardMat, NS); shards.frustumCulled = false; sc.add(shards);
  const SH = Array.from({ length: NS }, () => ({ l: 0, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, s: 1, wx: 0, wy: 0 })); let shI = 0; for (let i = 0; i < NS; i++) setM(shards, i, 0, -99, 0, 0, 0, 0);
  const ND = 300, dPos = new Float32Array(ND * 3).fill(-99), dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const drops = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: '#d8f4ff', size: .3, transparent: true, opacity: .95, depthWrite: false, map: glowTex('#ffffff') })); drops.frustumCulled = false; sc.add(drops);
  const DR = Array.from({ length: ND }, () => ({ l: 0, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0 })); let drI = 0;
  const rt = ringTexture(), ringGeo = new THREE.PlaneGeometry(1, 1); ringGeo.rotateX(-Math.PI / 2);
  const RINGS = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: rt, color: '#e8fbff', transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.position.y = -2.26; sc.add(m); return { m, l: 0, L: 1, S: 4 }; }); let rgI = 0;
  const ring = (x, z, S, L = 1) => { const r = RINGS[rgI++ % RINGS.length]; r.l = L; r.L = L; r.S = S; r.m.position.x = x; r.m.position.z = z; r.m.visible = true; };
  const spawnShards = (x, y, z, n, sp) => { for (let i = 0; i < n; i++) { const s = SH[shI++ % NS]; s.l = rr(1.0, 1.7); s.x = x + rr(-.9, .9); s.y = y + rr(0, .5); s.z = z + rr(-.9, .9); const a = Math.random() * 6.28, v = rr(.3, 1) * sp; s.vx = Math.cos(a) * v; s.vz = Math.sin(a) * v; s.vy = rr(2, 7); s.s = rr(.6, 1.6); s.wx = rr(-8, 8); s.wy = rr(-8, 8); s.rx = rr(0, 6); s.ry = rr(0, 6); } };
  const spawnDrops = (x, z, n, sp, h = 5) => { for (let i = 0; i < n; i++) { const d = DR[drI++ % ND]; d.l = rr(.6, 1.2); d.x = x + rr(-.5, .5); d.y = -2.25; d.z = z + rr(-.5, .5); const a = Math.random() * 6.28, v = rr(.2, 1) * sp; d.vx = Math.cos(a) * v; d.vz = Math.sin(a) * v; d.vy = rr(3, h + 3); } };

  // ----- bordes: gradas de pingüinos (2 filas), glaciar y icebergs lejanos. Todo FUERA del tablero -----
  const a0 = 20 * Math.PI / 180, a1 = 160 * Math.PI / 180, crowd = [];
  const pGeo = (() => { const g = normGeo('pinguino', 1.9), C = g.attributes.color; for (let i = 0; i < C.count; i++) { const l = C.getX(i) * .3 + C.getY(i) * .59 + C.getZ(i) * .11; if (l < .45) C.setXYZ(i, .66, .72, .95); } return g; })();
  [[17, 3, .9], [20.4, 3, 1.8]].forEach(([r0, wd, h], ti) => { const s = new THREE.Shape(); s.absarc(0, 0, r0 + wd, a0, a1, false); s.absarc(0, 0, r0, a1, a0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: h + 1.4, bevelEnabled: false, curveSegments: 36 }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: ti ? '#dff0ff' : '#cfe6fb', shininess: 40, specular: '#ffffff' })); m.position.y = -2.4; sc.add(m);
    const n = Math.floor((a1 - a0) * (r0 + wd / 2) / 1.7); for (let i = 0; i < n; i++) { const a = a0 + (i + .5) / n * (a1 - a0), rad = r0 + wd * (.35 + (i % 2) * .3); crowd.push({ x: Math.cos(a) * rad, z: -Math.sin(a) * rad, y: -2.4 + h + 1.4, ph: rr(0, 6.28), sp: rr(3, 6) }); } });
  const peng = new THREE.InstancedMesh(pGeo, VCM(), crowd.length); peng.frustumCulled = false; sc.add(peng); { const c = new THREE.Color(), pal = ['#ff9ccb', '#ffd84a', '#8ee8cc', '#9cc2ff', '#ffb27a', '#cdb4ff', '#ffffff']; crowd.forEach((p, i) => peng.setColorAt(i, c.set(pick(pal)))); }
  const spire = new THREE.CylinderGeometry(.25, 1, 1, 5, 1); spire.translate(0, .5, 0);
  const iceMat2 = new THREE.MeshPhongMaterial({ color: '#cfe8ff', flatShading: true, shininess: 60, specular: '#ffffff' });
  const NSP = 56, spires = new THREE.InstancedMesh(spire, iceMat2, NSP); spires.frustumCulled = false; sc.add(spires); { const c = new THREE.Color(); for (let i = 0; i < NSP; i++) { const row = i < 32 ? 0 : 1, a = a0 - .4 + (i % 32) / 32 * (a1 - a0 + .8) + rr(-.04, .04), rad = row ? rr(60, 70) : rr(42, 50), h = row ? rr(14, 28) : rr(8, 18), wd = rr(3, 7);
      setM(spires, i, Math.cos(a) * rad, -2.4, -Math.sin(a) * rad, wd, h, wd, rr(0, 6), rr(-.06, .06), rr(-.06, .06)); spires.setColorAt(i, c.set(pick(['#ffffff', '#cfeaff', '#b4dcff']))); } }
  const NF = 10, floes = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, .82, .6, 7), new THREE.MeshPhongMaterial({ color: '#eaf6ff', flatShading: true }), NF); floes.frustumCulled = false; sc.add(floes); const FL = [];
  for (let i = 0; i < NF; i++) { const side = i % 2 ? 1 : -1; FL.push({ x: side * rr(19, 34), z: rr(-26, 6), s: rr(1.2, 2.2), ph: rr(0, 6) }); }
  const fMu = new THREE.InstancedMesh(normGeo('muneco', 1.4), VCM(), 5); fMu.frustumCulled = false; sc.add(fMu);

  // ----- personajes: sombra suave, aro de su color y patines -----
  const st = shadowTexture(), shMat = new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false }), skateMat = new THREE.MeshPhongMaterial({ color: '#e8f6ff', shininess: 140, specular: '#ffffff' });
  for (const r of E.racers) { const c = r.obj.userData.char, pv = r.obj.userData.pivot; if (!c) continue;
    const sg = new THREE.Mesh(ringGeo, shMat); sg.scale.setScalar(2.1); sg.position.y = .06; sg.renderOrder = 2; sc.add(sg); r._hzSh = sg;
    const rg = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: rt, color: r.me ? '#ffffff' : r.ch.color, transparent: true, opacity: r.me ? 1 : .8, depthWrite: false })); rg.scale.setScalar(r.me ? 2.0 : 1.6); rg.position.y = .07; rg.renderOrder = 3; r.obj.add(rg); r._hzRing = rg;
    c.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(c), sz = bb.getSize(new THREE.Vector3()), ps = pv.scale.x || 1, Rr = Math.min(sz.x, sz.z) * .5 / ps;
    for (const s of [-1, 1]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(Rr * .05, Rr * .04, Rr * .6), skateMat); bl.position.set(s * Rr * .2, .0, 0); c.add(bl); } }

  // ----- HUD de cristal (solo arriba, fuera del tablero) -----
  const css = document.createElement('style'); css.id = 'hzCss'; css.textContent = `#perf{display:none!important}
#hzHud{position:absolute;left:50%;transform:translateX(-50%);top:calc(92px + env(safe-area-inset-top));display:flex;gap:7px;font-family:Fredoka,sans-serif;pointer-events:none}
#hzHud .c{display:flex;align-items:center;gap:6px;padding:5px 12px 5px 8px;border-radius:20px;background:linear-gradient(rgba(255,255,255,.9),rgba(205,232,255,.82));border:2px solid #fff;box-shadow:0 4px 12px rgba(0,30,90,.4);color:#0d4a8a;font-weight:700;font-size:19px;line-height:1}
#hzHud .c i{font-style:normal;font-size:20px}#hzHud .c small{font-size:11px;font-weight:600;opacity:.8;display:block;margin-top:1px}
#hzHud .c.lo b{color:#e0204a;animation:hzP .5s ease-in-out infinite alternate}@keyframes hzP{to{transform:scale(1.18)}}
#hzW{position:absolute;left:50%;transform:translateX(-50%);top:calc(146px + env(safe-area-inset-top));font-family:Fredoka,sans-serif;font-weight:700;font-size:24px;color:#fff;-webkit-text-stroke:1.5px #c01030;text-shadow:0 3px 0 #c01030;opacity:0;pointer-events:none;white-space:nowrap}
#hzW.on{opacity:1;animation:hzP .25s ease-in-out infinite alternate}
@media (orientation:landscape) and (max-height:500px){#hzHud{top:calc(70px + env(safe-area-inset-top))}#hzHud .c{font-size:16px;padding:3px 10px 3px 6px}#hzW{top:calc(112px + env(safe-area-inset-top));font-size:20px}}`;
  document.head.appendChild(css); const hud = document.getElementById('hud'), hz = document.createElement('div'); hz.id = 'hzBox';
  hz.innerHTML = `<div id="hzHud"><div class="c" id="hzT"><i>⏱️</i><div><b>45</b><small>segundos</small></div></div><div class="c" id="hzA"><i>👥</i><div><b>6</b><small>en pie</small></div></div></div><div id="hzW">¡MUÉVETE! 🥶</div>`;
  hud.insertBefore(hz, hud.firstChild); const eT = hz.querySelector('#hzT b'), eA = hz.querySelector('#hzA b'), eW = hz.querySelector('#hzW'), cT = hz.querySelector('#hzT');
  const TT = cfg.T || 45, WARN = cfg.warn || 1.9;
  let T = 0; const fell = new Set();
  return {
    tick(E, dt) { dt = Math.min(dt, .1); T += dt; const t = T, me = E.me;
      water.material.uniforms.uT.value = t;
      // parpadeo de los avisos (sincronizado para todos)
      const bl1 = Math.sin(t * 16) > 0, bl2 = Math.sin(t * 28) > 0;
      w1.color.set(bl1 ? '#ffd21a' : '#ff8a00'); w1.emissiveIntensity = bl1 ? .75 : .35; w2.color.set(bl2 ? '#ff1a2a' : '#ff7a6a'); w2.emissiveIntensity = bl2 ? 1 : .45;
      for (const q of EV.tiles) { q.m.visible = false; const v = q.v, g = v.g;
        if (q.st === 0) { g.position.set(q.x, q.y, q.z); }
        else if (q.st === 1) { const k = clamp(1 - q.sh / WARN, 0, 1), red = k > .55; if (v.st !== 1) { v.st = 1; E.burst(new THREE.Vector3(q.x, .3, q.z), '#ffffff', 5, 3, .45, .3); }
          const mat = red ? w2 : w1; if (v.top.material !== mat) v.top.material = mat;
          const amp = .02 + k * .07; g.position.set(q.x + Math.sin(t * 46 + q.x) * amp, q.y, q.z + Math.cos(t * 43 + q.z) * amp); }
        else { if (v.st !== 2) { v.st = 2; v.top.material = w2; spawnShards(q.x, .2, q.z, 12, 5); E.burst(new THREE.Vector3(q.x, .3, q.z), '#bff0ff', 10, 4, .6, .45); }
          g.position.set(q.x, q.y, q.z); g.rotation.x += v.spin[0] * dt; g.rotation.z += v.spin[1] * dt; g.visible = q.y > -9;
          if (!v.splashed && q.y < -2.0) { v.splashed = true; ring(q.x, q.z, 6, 1.1); ring(q.x, q.z, 3, .7); spawnDrops(q.x, q.z, 22, 4, 5); spawnShards(q.x, -1.9, q.z, 3, 2); } } }
      for (let i = 0; i < NS; i++) { const s = SH[i]; if (s.l > 0) { s.l -= dt; s.vy -= 16 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.rx += s.wx * dt; s.ry += s.wy * dt; if (s.y < -2.2) { s.l = 0; spawnDrops(s.x, s.z, 2, 1.5, 2); }
          const k = clamp(s.l / .5, 0, 1); setM(shards, i, s.x, s.y, s.z, s.s * k, s.s * k, s.s * k, s.ry, s.rx, 0); } else if (s.y > -90) { s.y = -99; setM(shards, i, 0, -99, 0, 0, 0, 0); } }
      shards.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < ND; i++) { const d = DR[i]; if (d.l > 0) { d.l -= dt; d.vy -= 14 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; if (d.y < -2.3) d.l = 0; dPos[i * 3] = d.x; dPos[i * 3 + 1] = d.y; dPos[i * 3 + 2] = d.z; } else dPos[i * 3 + 1] = -99; }
      dGeo.attributes.position.needsUpdate = true;
      for (const r of RINGS) if (r.l > 0) { r.l -= dt; const k = 1 - r.l / r.L; r.m.scale.setScalar(.5 + r.S * k); r.m.material.opacity = (1 - k) * .8; if (r.l <= 0) r.m.visible = false; }
      for (let i = 0; i < crowd.length; i++) { const p = crowd[i], hop = Math.max(0, Math.sin(t * p.sp + p.ph)) * .26; setM(peng, i, p.x, p.y + hop, p.z, 1, 1, 1, Math.atan2(-p.x, -p.z) + Math.PI + Math.sin(t * 2 + p.ph) * .1, 0, Math.sin(t * p.sp * .5 + p.ph) * .1); }
      peng.instanceMatrix.needsUpdate = true;
      FL.forEach((f, i) => { const y = -2.3 + Math.sin(t * .9 + f.ph) * .08; setM(floes, i, f.x, y, f.z, f.s, 1, f.s, f.ph); if (i < 5) setM(fMu, i, f.x, y + .3, f.z, 1, 1, 1, f.ph + 3); }); floes.instanceMatrix.needsUpdate = true; fMu.instanceMatrix.needsUpdate = true;
      for (const r of E.racers) { const mv = Math.hypot(r.vx || 0, r.vz || 0), sg = r._hzSh;
        if (sg) { sg.visible = !r.out; sg.position.set(r.x, .06, r.z); sg.scale.setScalar(2.1 - Math.min(.6, (r.y || 0) * .3)); }
        if (r._hzRing) r._hzRing.visible = !r.out;
        if (!r.out && mv > 2.5 && Math.random() < dt * 10) E.burst(new THREE.Vector3(r.x, .12, r.z), '#ffffff', 1, 1.2, .4, .24, 0);
        if (r.out && r.y < -2.0 && !fell.has(r.k)) { fell.add(r.k); ring(r.x, r.z, 9, 1.3); ring(r.x, r.z, 5, .8); spawnDrops(r.x, r.z, 50, 5.5, 8); spawnShards(r.x, -1.9, r.z, 5, 3); } }
      const left = Math.max(0, TT - E.t), alive = E.racers.filter(r => !r.out).length; eT.textContent = left.toFixed(0); eA.textContent = alive; cT.classList.toggle('lo', left < 10);
      const cur = !me.out ? EV.tileAt(me.x, me.z) : null; eW.classList.toggle('on', !!(cur && cur.st === 1));
    },
    dispose() { const s = document.getElementById('hzCss'); if (s) s.remove(); hz.remove(); } };
}
