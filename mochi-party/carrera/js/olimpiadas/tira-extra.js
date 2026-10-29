// ======================================================================
//  TIRACHINAS DE CACTUS (o29) — caras simpáticas de los bloques, partículas de montaje
//  y decorado extra del desierto. Nunca caras tristes: feliz, parpadeo, sorpresa y ojos en espiral.
// ======================================================================
import { THREE } from '../core3d.js?v=o41';
import { prop, SPH, CYL, DOD } from './mundos.js?v=o41';

const TEX = {};
function faceTex(kind) {
  if (TEX[kind]) return TEX[kind];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';
  const ink = '#3a2418';
  const eye = (x, y) => {
    if (kind === 'blink') { g.strokeStyle = ink; g.lineWidth = 7; g.beginPath(); g.arc(x, y + 2, 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); return; }
    if (kind === 'spiral') { g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); for (let a = 0; a < Math.PI * 5; a += .2) { const r = 1.2 + a * 1.05; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.stroke(); return; }
    const r = kind === 'wow' ? 16 : 13;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, r, r * 1.1, 0, 0, 7); g.fill(); g.strokeStyle = ink; g.lineWidth = 4; g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(x + 1, y + 2, kind === 'wow' ? 6 : 8, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 4, y - 2, 3, 0, 7); g.fill();
  };
  eye(40, 50); eye(88, 50);
  // mofletes
  g.fillStyle = 'rgba(255,110,150,.55)'; for (const x of [24, 104]) { g.beginPath(); g.ellipse(x, 76, 11, 7, 0, 0, 7); g.fill(); }
  // nariz
  g.fillStyle = '#c8704a'; g.beginPath(); g.ellipse(64, 70, 6, 5, 0, 0, 7); g.fill();
  // boca
  g.strokeStyle = ink; g.lineWidth = 5; g.fillStyle = '#b83a4a';
  if (kind === 'wow') { g.beginPath(); g.ellipse(64, 95, 10, 13, 0, 0, 7); g.fill(); g.stroke(); }
  else if (kind === 'spiral') { g.beginPath(); g.moveTo(46, 92); g.quadraticCurveTo(64, 112, 82, 92); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ff8fb0'; g.beginPath(); g.ellipse(70, 102, 6, 5, 0, 0, 7); g.fill(); }
  else { g.beginPath(); g.moveTo(48, 88); g.quadraticCurveTo(64, 106, 80, 88); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[kind] = t; return t;
}
const PG = new THREE.PlaneGeometry(.86, .86);
export function addFace(m) { const mat = new THREE.MeshBasicMaterial({ map: faceTex('happy'), transparent: true, depthWrite: false }); const f = new THREE.Mesh(PG, mat); f.position.z = .482; m.add(f); return f; }
export function setExpr(b, kind) { if (!b.face || b.expr === kind) return; b.expr = kind; b.face.material.map = faceTex(kind); b.face.material.needsUpdate = true; }
// estado de la cara: sorpresa al recibir, espiral mientras vuela/rueda, parpadeo aleatorio en reposo
export function faceTick(b, t, dt) {
  if (!b.face) return;
  if (b.hitT > 0) { b.hitT -= dt; setExpr(b, b.hitT > .45 ? 'wow' : 'spiral'); return; }
  if (b.dyn) { setExpr(b, 'spiral'); return; }
  b.bl = (b.bl ?? Math.random() * 3) - dt; if (b.bl < 0) { setExpr(b, 'blink'); if (b.bl < -.14) b.bl = 2 + Math.random() * 3; } else setExpr(b, 'happy');
}

// partículas sencillas (chispas de colores / polvo)
export function particles(sc) {
  const pool = [], g = new THREE.SphereGeometry(1, 6, 4);
  return {
    burst(x, y, z, n = 8, cols = ['#fff3b0', '#ffd36b', '#ff9ac8', '#9ef0ff']) {
      for (let i = 0; i < n; i++) { let p = pool.find(q => !q.m.visible); if (!p) { if (pool.length > 220) return; p = { m: new THREE.Mesh(g, new THREE.MeshBasicMaterial({ transparent: true })) }; sc.add(p.m); pool.push(p); }
        const a = Math.random() * 6.283; p.m.material.color.set(cols[i % cols.length]); p.m.visible = true; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * (1 + Math.random() * 2); p.vz = Math.sin(a) * (1 + Math.random() * 2); p.vy = 1.5 + Math.random() * 3; p.l = p.L = .6 + Math.random() * .5; p.s = .06 + Math.random() * .07; }
    },
    tick(dt) { for (const p of pool) { if (!p.m.visible) continue; p.l -= dt; if (p.l <= 0) { p.m.visible = false; continue; } p.vy -= 7 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < .05) { p.y = .05; p.vy *= -.4; } p.m.position.set(p.x, p.y, p.z); p.m.scale.setScalar(p.s * (p.l / p.L * .7 + .3)); p.m.material.opacity = Math.min(1, p.l / p.L * 1.6); } },
  };
}

// curva de montaje: cae desde arriba y rebota hasta su sitio (0..1 → desplazamiento vertical)
export function dropBounce(u) { if (u <= 0) return 1; if (u >= 1) return 0; const n = 7.5625, d = 2.75; let x = u, y;
  if (x < 1 / d) y = n * x * x; else if (x < 2 / d) y = n * (x -= 1.5 / d) * x + .75; else if (x < 2.5 / d) y = n * (x -= 2.25 / d) * x + .9375; else y = n * (x -= 2.625 / d) * x + .984375; return 1 - y; }

// decorado extra del desierto: todo lejos del carril de tiro (z de -20 a -46 y laterales |x| > 23)
export function desertoExtra(sc, T) {
  const G = new THREE.Group(); sc.add(G); const anim = []; const R = (a, b) => a + Math.random() * (b - a);
  const mk = (geo, mat, pos, s, rot) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (Array.isArray(s)) m.scale.set(...s); else m.scale.setScalar(s); if (rot) m.rotation.set(...rot); G.add(m); return m; };
  const spots = []; for (let i = 0; i < 26; i++) { const back = i < 16; spots.push(back ? [R(-40, 40), R(-46, -22)] : [(i % 2 ? 1 : -1) * R(24, 36), R(-30, 6)]); }
  // dunas suaves al fondo
  for (let i = 0; i < 7; i++) mk(SPH(), T(i % 2 ? '#f0bc70' : '#e6a85a', { rim: .1 }), [-45 + i * 15, -2.2, R(-58, -50)], [R(9, 14), R(3.5, 5.5), R(5, 8)]);
  // cactus variados (saguaro, redondo, de brazos)
  const cg = ['#5cbf62', '#4aa95a', '#7fd06e'];
  spots.slice(0, 14).forEach(([x, z], i) => { const k = i % 3, c = T(cg[i % 3], { rim: .3 });
    if (k === 0) { const p = prop('cactus'); p.position.set(x, 0, z); p.scale.setScalar(R(.6, 1.1)); p.rotation.y = R(0, 6); G.add(p); }
    else if (k === 1) { const m = mk(SPH(), c, [x, .7, z], [.9, .75, .9]); const fl = mk(SPH(), T('#ff7fb8'), [x, 1.4, z], .22); anim.push(t => fl.scale.setScalar(.22 + Math.sin(t * 2 + i) * .03)); }
    else { mk(CYL(), c, [x, 1.6, z], [.45, 3.2, .45]); for (const s of [-1, 1]) { mk(CYL(), c, [x + s * .75, 1.9, z], [.3, .25, .3], [0, 0, Math.PI / 2]); mk(CYL(), c, [x + s * .95, 2.4, z], [.28, 1, .28]); } mk(SPH(), T('#ffd36b'), [x, 3.25, z], .25); }
  });
  // rocas
  spots.slice(14, 22).forEach(([x, z], i) => { mk(DOD(), T(i % 2 ? '#c99a6a' : '#b8865a', { rim: .2 }), [x, .3, z], [R(.8, 1.8), R(.5, 1), R(.8, 1.5)], [R(0, 3), R(0, 3), 0]); mk(DOD(), T('#d8aa78'), [x + 1.2, .2, z + .5], R(.3, .6)); });
  // flores del desierto
  for (let i = 0; i < 22; i++) { const x = (i % 2 ? 1 : -1) * R(23, 34), z = R(-36, 4); const col = ['#ff7fb8', '#ffd36b', '#b08aff', '#ff9a5a'][i % 4]; mk(CYL(), T('#5aa850'), [x, .2, z], [.04, .4, .04]); const f = mk(SPH(), T(col), [x, .45, z], [.18, .1, .18]); anim.push(t => f.rotation.y = t + i); }
  // sol grande con halo y nubes que flotan
  const sun = mk(SPH(), new THREE.MeshBasicMaterial({ color: '#fff2a8', fog: false }), [26, 30, -90], 7); const halo = mk(SPH(), new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: .25, fog: false }), [26, 30, -91], 10);
  anim.push(t => halo.scale.setScalar(10 + Math.sin(t * 1.2) * .8));
  for (let i = 0; i < 5; i++) { const cl = new THREE.Group(); const mat = T('#fffaf0', { rim: 0 }); for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(SPH(), mat); s.position.set(k * 1.6 - 2.4, Math.sin(k * 2) * .5, 0); s.scale.setScalar(1.3 + (k % 2) * .5); cl.add(s); } cl.position.set(R(-60, 60), R(18, 26), R(-80, -60)); G.add(cl); const sp = R(.6, 1.4); anim.push((t, dt) => { cl.position.x += sp * dt; if (cl.position.x > 70) cl.position.x = -70; }); }
  // buitres simpáticos dando vueltas (lejos)
  for (let i = 0; i < 2; i++) { const b = new THREE.Group(); const body = T('#7a5a4a'); const s1 = new THREE.Mesh(SPH(), body); s1.scale.set(.5, .35, .7); b.add(s1); const wl = [-1, 1].map(s => { const w = new THREE.Mesh(SPH(), body); w.scale.set(1.2, .08, .4); w.position.x = s * 1; b.add(w); return w; }); G.add(b);
    anim.push(t => { const a = t * .35 + i * 3; b.position.set(Math.cos(a) * 22 + (i ? 10 : -10), 16 + i * 3, -40 + Math.sin(a) * 10); b.rotation.y = -a; wl.forEach((w, k) => w.rotation.z = (k ? -1 : 1) * Math.sin(t * 5) * .4); }); }
  // plantas rodadoras que cruzan el fondo
  for (let i = 0; i < 2; i++) { const tw = new THREE.Mesh(new THREE.IcosahedronGeometry(.7, 1), new THREE.MeshBasicMaterial({ color: '#b48a5a', wireframe: true })); G.add(tw); let x = -40 + i * 40; const z = -26 - i * 8;
    anim.push((t, dt) => { x += (3 + i) * dt; if (x > 45) x = -45; tw.position.set(x, .7 + Math.abs(Math.sin(t * 4 + i)) * .6, z); tw.rotation.z -= dt * 4; }); }
  return { tick(t, dt) { for (const f of anim) f(t, dt); } };
}
