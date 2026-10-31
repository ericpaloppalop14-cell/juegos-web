// v8: escenario propio para la pantalla de elegir limpiadora — fondo con rayos giratorios, pedestal con luces,
// focos que barren, globos/estrellas flotando y confeti. Sustituye al mundo del juego mientras se elige personaje
// (así ningún objeto del decorado puede taparla).
import * as THREE from 'three';

const PI = Math.PI, rnd = Math.random;
const mk = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
function skyGrad(h) {
  const top = new THREE.Color().setHSL(h, 0.8, 0.42), mid = new THREE.Color().setHSL(h, 0.85, 0.58), bot = new THREE.Color().setHSL((h + 0.05) % 1, 0.9, 0.76);
  return mk(8, 256, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#' + top.getHexString()); gr.addColorStop(0.5, '#' + mid.getHexString()); gr.addColorStop(1, '#' + bot.getHexString()); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
}
const rayTex = mk(512, 512, (g, w, h) => {
  g.translate(w / 2, h / 2); const n = 20;
  for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, w, (i / n) * PI * 2, ((i + 0.5) / n) * PI * 2); g.closePath(); g.fillStyle = 'rgba(255,255,255,.34)'; g.fill(); }
  const m = g.createRadialGradient(0, 0, 20, 0, 0, w / 2); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'destination-in'; g.fillStyle = m; g.fillRect(-w / 2, -h / 2, w, h);
});
const floorTex = mk(512, 512, (g, w, h) => {
  g.translate(w / 2, h / 2);
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(0, 0, w / 2 - i * 28, 0, 7); g.fillStyle = i % 2 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)'; g.fill(); }
  for (let i = 0; i < 16; i++) { g.save(); g.rotate((i / 16) * PI * 2); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(40, -3, w / 2 - 50, 6); g.restore(); }
  const m = g.createRadialGradient(0, 0, 10, 0, 0, w / 2); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.7, 'rgba(0,0,0,.8)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'destination-in'; g.fillStyle = m; g.fillRect(-w / 2, -h / 2, w, h);
});
function shapeTex(kind) {
  return mk(128, 128, (g) => {
    g.translate(64, 64); g.fillStyle = '#fff'; g.beginPath();
    if (kind === 0) { for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 58, a = -PI / 2 + (i * PI) / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
    else if (kind === 1) { g.moveTo(0, 40); g.bezierCurveTo(-70, -6, -34, -62, 0, -24); g.bezierCurveTo(34, -62, 70, -6, 0, 40); }
    else { g.ellipse(0, -8, 38, 46, 0, 0, 7); g.moveTo(-8, 52); g.lineTo(8, 52); g.lineTo(0, 36); g.closePath(); }
    g.fill();
    if (kind === 2) { g.globalCompositeOperation = 'source-atop'; const q = g.createLinearGradient(-40, -50, 40, 50); q.addColorStop(0, 'rgba(255,255,255,.55)'); q.addColorStop(0.45, 'rgba(255,255,255,0)'); q.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = q; g.fillRect(-64, -64, 128, 128); }
  });
}
const SHAPES = [shapeTex(0), shapeTex(1), shapeTex(2)];
// v10: ciudad loca de fondo — edificios torcidos con ventanas y cosas voladoras
const EMO = ['🛋️', '🪑', '🦆', '🫖', '🧦', '🍪', '💡', '📺', '🧸', '🎈', '🧹', '🍞', '🧺', '🪴', '⏰', '🛁', '🍩', '🪁'];
const emoTex = (e) => mk(128, 128, (g) => { g.font = '92px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(60,20,100,.35)'; g.shadowBlur = 8; g.fillText(e, 64, 70); });
const EMO_TEX = new Map(); const getEmo = (i) => EMO_TEX.get(i) || (EMO_TEX.set(i, emoTex(EMO[i % EMO.length])), EMO_TEX.get(i));
function buildingTex(i) {
  return mk(128, 256, (g, w, h) => {
    const hue = (i * 47) % 360, bw = 100 - (i % 3) * 14, x0 = (w - bw) / 2, top = 40 + (i % 4) * 22;
    g.fillStyle = `hsl(${hue},70%,62%)`; g.beginPath(); g.roundRect ? g.roundRect(x0, top, bw, h - top, 10) : g.rect(x0, top, bw, h - top); g.fill();
    g.fillStyle = `hsl(${hue},75%,45%)`; g.fillRect(x0, top, bw, 12);
    // tejado loco
    g.fillStyle = `hsl(${(hue + 40) % 360},85%,58%)`; if (i % 3 === 0) { g.beginPath(); g.moveTo(x0 - 4, top); g.lineTo(w / 2, top - 34); g.lineTo(x0 + bw + 4, top); g.fill(); } else if (i % 3 === 1) { g.beginPath(); g.arc(w / 2, top, bw / 2 - 4, PI, 0); g.fill(); } else { g.fillRect(w / 2 - 3, top - 36, 6, 36); g.beginPath(); g.arc(w / 2, top - 38, 9, 0, 7); g.fill(); }
    const cols = 3, rows = Math.floor((h - top - 40) / 30);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const lit = ((r * 7 + c * 3 + i) % 5) > 1; g.fillStyle = lit ? '#fff3b0' : `hsl(${hue},40%,32%)`; g.fillRect(x0 + 12 + c * ((bw - 24) / cols), top + 22 + r * 30, (bw - 24) / cols - 8, 20); }
    g.fillStyle = `hsl(${hue},60%,30%)`; g.fillRect(w / 2 - 9, h - 26, 18, 26);
    g.globalCompositeOperation = 'source-atop'; const q = g.createLinearGradient(0, 0, w, 0); q.addColorStop(0, 'rgba(255,255,255,.32)'); q.addColorStop(0.5, 'rgba(255,255,255,0)'); q.addColorStop(1, 'rgba(40,0,80,.22)'); g.fillStyle = q; g.fillRect(0, 0, w, h);
  });
}
const BTEX = Array.from({ length: 6 }, (_, i) => buildingTex(i));
const BEAM_VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }';
const BEAM_FS = 'uniform vec3 uCol; uniform float uA; varying vec2 vUv; void main(){ float a=uA*(0.25+0.75*vUv.y)*(0.55+0.45*vUv.y); gl_FragColor=vec4(uCol,a); }';

export function makeStage(scene, getParts) {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const hsl = { h: 0.9 }; let ring = new THREE.Color(0xff74c4), glow = new THREE.Color(0xffa0e0), bits = [0xff6b5e, 0xffd23f, 0x3fe0b0, 0x4aa8ff, 0xff74c4];
  // rayos del fondo
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.8, depthWrite: false, fog: false, color: 0xffffff }));
  rays.position.set(0, 4, -18); rays.renderOrder = -3; group.add(rays);
  // suelo con aros
  const floor = new THREE.Mesh(new THREE.CircleGeometry(15, 64).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false, fog: false, color: 0xffffff }));
  floor.position.y = -0.04; floor.renderOrder = -2; group.add(floor);
  // v13: iluminación de estudio (principal cálida, relleno frío y dos contraluces); solo existe mientras el escenario está activo
  const key = new THREE.DirectionalLight(0xfff0e0, 0.9), fillS = new THREE.DirectionalLight(0xbfd6ff, 0.25), kick1 = new THREE.DirectionalLight(0xff9ee0, 1.1), kick2 = new THREE.DirectionalLight(0x9fe8ff, 0.9);
  key.position.set(-3.5, 5, 6); fillS.position.set(5, 2, 5); kick1.position.set(3.5, 4.5, -5); kick2.position.set(-4, 3, -5);
  for (const l of [key, fillS, kick1, kick2]) { group.add(l); group.add(l.target); }
  // pedestal de dos escalones + aro luminoso
  const pedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.1 }), ped2Mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, 0.3, 56), pedMat); ped.position.y = -0.1; ped.receiveShadow = true; group.add(ped);
  const ped2 = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.2, 0.22, 56), ped2Mat); ped2.position.y = -0.36; ped2.receiveShadow = true; group.add(ped2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), ringM = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 8, 64).rotateX(PI / 2), ringMat); ringM.position.y = 0.06; group.add(ringM);
  const bulbs = []; const bulbGeo = new THREE.SphereGeometry(0.09, 10, 8);
  for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); const a = (i / 18) * PI * 2; m.position.set(Math.cos(a) * 2.14, -0.2, Math.sin(a) * 2.14); m.userData.a = a; group.add(m); bulbs.push(m); }
  // focos que barren por detrás
  const beams = []; const beamGeo = new THREE.CylinderGeometry(0.06, 1.9, 1, 28, 1, true).translate(0, -0.5, 0);
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.ShaderMaterial({ vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uCol: { value: new THREE.Color(0xffffff) }, uA: { value: 0.3 } } });
    const holder = new THREE.Object3D(), mesh = new THREE.Mesh(beamGeo, mat); mesh.rotation.x = -PI / 2; mesh.renderOrder = -1; holder.add(mesh); group.add(holder); beams.push({ holder, mesh, mat, ph: i * 2.1 });
  }
  // globos / estrellas / corazones flotantes (siempre detrás del personaje)
  const floaters = [];
  for (let i = 0; i < 14; i++) {
    const kind = i % 3, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: SHAPES[kind], transparent: true, depthWrite: false, fog: false, opacity: 0.92 }));
    const s = 0.8 + rnd() * 0.8; sp.scale.set(s, s * (kind === 2 ? 1.25 : 1), 1); sp.renderOrder = -1;
    const side = i % 2 ? 1 : -1; const f = { sp, x0: side * (0.35 + rnd() * 0.6), z: -2 - rnd() * 9, u: rnd(), sp_: 0.05 + rnd() * 0.07, ph: rnd() * 6, s, kind }; floaters.push(f); group.add(sp);
  }
  // edificios locos bailarines
  const blds = [];
  for (let i = 0; i < 11; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: BTEX[i % 6], transparent: true, depthWrite: false, fog: false })); sp.center.set(0.5, 0); sp.renderOrder = -2;
    const row = i % 2; blds.push({ sp, row, x: (i / 10) * 2 - 1, ph: rnd() * 6, hh: 0.9 + rnd() * 0.6 }); group.add(sp);
  }
  // cosas voladoras (muebles, patitos, calcetines…)
  const flyers = [];
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: getEmo(i), transparent: true, depthWrite: false, fog: false })); sp.renderOrder = -1;
    const dir = i % 2 ? 1 : -1; flyers.push({ sp, u: rnd(), dir, v: 0.035 + rnd() * 0.05, y: 0.12 + rnd() * 0.8, z: -2.5 - rnd() * 8, s: 0.9 + rnd() * 0.9, ph: rnd() * 6, spin: (rnd() - 0.5) * 2 }); group.add(sp);
  }
  let on = false, T = 0, confT = 0, bubT = 0, spkT = 0; const bgTex = new Map();
  function setTheme(th) {
    ring.set(th.ring); const cb = (th.bits || bits).filter((c) => c !== 0xffffff).concat([0xffd23f, 0xff74c4]); glow.set(th.glow || th.ring); bits = th.bits || bits;
    const h = {}; ring.getHSL(h); hsl.h = h.h; if (h.s < 0.2) hsl.h = 0.75;
    group.userData.bg = bgTex.get(hsl.h.toFixed(2)) || (bgTex.set(hsl.h.toFixed(2), skyGrad(hsl.h)), bgTex.get(hsl.h.toFixed(2)));
    const light = new THREE.Color(0xfff4e6), mid = new THREE.Color().setHSL((hsl.h + 0.5) % 1, 0.7, 0.55);
    pedMat.color.copy(light); ped2Mat.color.copy(mid); ringMat.color.copy(ring).lerp(new THREE.Color(0xffffff), 0.3).multiplyScalar(1.5);
    rays.material.color.copy(new THREE.Color().setHSL(hsl.h, 0.9, 0.85)); floor.material.color.copy(new THREE.Color().setHSL(hsl.h, 0.9, 0.9));
    beams.forEach((b, i) => { b.mat.uniforms.uCol.value.set(cb[(i * 2) % cb.length]).lerp(new THREE.Color(0xffffff), 0.35); });
    floaters.forEach((f, i) => f.sp.material.color.set(cb[i % cb.length]).lerp(new THREE.Color(0xffffff), 0.12));
    blds.forEach((b, i) => b.sp.material.color.set(cb[(i + 1) % cb.length]).lerp(new THREE.Color(0xffffff), 0.55 + (b.row ? 0.1 : 0)));
  }
  function active(v) { on = v; group.visible = v; }
  const V = new THREE.Vector3();
  function update(dt, px, pz, ds, parts, cam) {
    if (!on) return; T += dt; group.position.set(px, 0, pz); group.scale.setScalar(ds);
    rays.rotation.z = T * 0.18; floor.rotation.y = -T * 0.25;
    ringM.scale.setScalar(1 + Math.sin(T * 3) * 0.015);
    for (const b of bulbs) { const a = b.userData.a, k = 0.5 + 0.5 * Math.sin(a * 3 - T * 5); b.material.color.set(bits[((a * 18 / (PI * 2)) | 0) % bits.length]).multiplyScalar(0.5 + k); b.scale.setScalar(0.7 + k * 0.6); }
    // tamaño visible a una profundidad (en unidades locales del escenario)
    const th = Math.tan(cam.fov * PI / 360), dist = cam.position.distanceTo(group.position), cy = cam.position.y / ds;
    const hhAt = (z) => th * (dist / ds - z), hwAt = (z) => hhAt(z) * cam.aspect; // z local (negativo = detrás)
    rays.position.set(0, cy, -18);
    for (const [bi, b] of beams.entries()) {
      const zb = -7, hw = hwAt(zb), top = cy + hhAt(zb) + 1.2, ax = (bi - 1) * hw * 0.85 + Math.sin(T * 0.8 + b.ph) * hw * 0.25, tx = ax * -0.5 + Math.sin(T * 0.9 + b.ph * 1.7) * hw * 0.7;
      b.holder.position.set(ax, top, zb); b.holder.lookAt(tx, 0, zb + 3); const L = b.holder.position.distanceTo(V.set(tx, 0, zb + 3)); b.mesh.scale.set(hw * 0.5, L, hw * 0.5); b.mat.uniforms.uA.value = 0.3 + Math.sin(T * 2 + b.ph) * 0.07;
    }
    for (const f of floaters) {
      f.u += dt * f.sp_; if (f.u > 1) f.u -= 1; const hh = hhAt(f.z), y = -0.5 + f.u * (cy + hh + 1), hw = hwAt(f.z); f.sp.position.set(f.x0 * hw + Math.sin(T * 0.8 + f.ph) * 0.35, y, f.z); f.sp.material.rotation = Math.sin(T + f.ph) * 0.25;
      f.sp.material.opacity = 0.92 * Math.min(1, f.u * 8, (1 - f.u) * 5);
    }
    for (const b of blds) { const zb = b.row ? -22 : -15, hw = hwAt(zb), w = hw * 0.34, h = w * 2 * b.hh * (1 + Math.sin(T * 3.2 + b.ph) * 0.035); b.sp.position.set(b.x * hw * 1.05, -0.5, zb); b.sp.scale.set(w, h, 1); b.sp.material.rotation = Math.sin(T * 1.4 + b.ph) * 0.05; }
    for (const f of flyers) { f.u += dt * f.v; if (f.u > 1) f.u -= 1; const z = f.z, hw = hwAt(z), hh = hhAt(z); f.sp.position.set(f.dir * (f.u * 2 - 1) * hw * 1.15, cy - hh + (f.y + Math.sin(T * 1.3 + f.ph) * 0.05) * hh * 2, z); const s = f.s * hw * 0.15; f.sp.scale.set(s, s, 1); f.sp.material.rotation = T * f.spin * 0.6; }
    if (!parts) return;
    confT -= dt; if (confT <= 0) { confT = 0.05; const hwc = hwAt(-4) * ds, x = px + (rnd() - 0.5) * 2 * hwc, c = bits[(rnd() * bits.length) | 0]; parts.emit({ x, y: (cy + hhAt(-4)) * ds + 0.5, z: pz - 0.5 * ds - rnd() * 8, vx: (rnd() - 0.5) * 1.5, vy: -1.5 - rnd() * 1.5, vz: 0, life: 5, size: 0.3 * ds + 0.1, color: c, shape: 1, g: 0.2, drag: 0.6 }); }
    bubT -= dt; if (bubT <= 0) { bubT = 0.12; const hwb = hwAt(-3) * ds; parts.emit({ x: px + (rnd() - 0.5) * 2 * hwb, y: 0.2, z: pz - 1 - rnd() * 4, vx: (rnd() - 0.5) * 0.6, vy: 1.4 + rnd() * 1.4, vz: 0, life: 4, size: (0.4 + rnd() * 0.5) * ds, size1: (0.5 + rnd() * 0.5) * ds, color: [0xffffff, 0xbfe8ff, 0xffd9f4][(rnd() * 3) | 0], alpha: 0.7, shape: 2, g: -0.1, drag: 0.4 }); }
    spkT -= dt; if (spkT <= 0) { spkT = 0.09; const a = rnd() * PI, r = (1.7 + rnd() * 0.6) * ds; parts.emit({ x: px + Math.cos(a) * r, y: 0.2 * ds, z: pz - 0.3 - Math.sin(a) * r * 0.8, vx: 0, vy: 1.2 + rnd(), vz: 0, life: 1.1, size: (0.36 + rnd() * 0.3) * ds, size1: 0.02, color: [0xffffff, 0xfff0a0][(rnd() * 2) | 0], shape: 3, g: 0, drag: 0.5 }); }
  }
  function pulse(parts, px, pz, ds) {
    if (!parts) return; parts.burst(px, 0.4 * ds, pz - 1.6 * ds, 46, { color: bits.concat([0xffffff]), speed: 8 * ds, size: 0.34 * ds + 0.1, life: 1.5, shape: 1, g: 5, up: 5 * ds, drag: 0.7 });
    parts.burst(px, 1.5 * ds, pz - 1.6 * ds, 14, { color: [0xffffff, 0xfff0a0], speed: 5 * ds, size: 0.6 * ds, life: 0.9, shape: 3, g: 0, up: 1, drag: 2 });
  }
  return { group, setTheme, active, update, pulse, get bg() { return group.userData.bg; } };
}

// v10: skyline de ciudad loca (edificios torcidos y bailarines) para otros fondos (portada)
export function makeSkyline(scene, { z = -50, n = 14, spread = 70, w = 11, fog = true } = {}) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: BTEX[i % 6], transparent: true, depthWrite: false, fog })); sp.center.set(0.5, 0);
    const row = i % 2, ww = w * (0.8 + rnd() * 0.5); items.push({ sp, x: (i / (n - 1) * 2 - 1) * spread + (rnd() - 0.5) * 3, z: z - row * 14 - rnd() * 4, ww, hh: 1.8 + rnd() * 1.2, ph: rnd() * 6 }); scene.add(sp);
    sp.material.color.setHSL(rnd(), 0.5, 0.8);
  }
  return { items, update(T) { for (const b of items) { const h = b.ww * 2 * b.hh * (1 + Math.sin(T * 3 + b.ph) * 0.03); b.sp.position.set(b.x, -0.3, b.z); b.sp.scale.set(b.ww, h, 1); b.sp.material.rotation = Math.sin(T * 1.3 + b.ph) * 0.05; } } };
}
