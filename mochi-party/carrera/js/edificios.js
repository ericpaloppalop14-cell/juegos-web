// Edificios vivos (v3): las fachadas gelatina se balancean y botan al ritmo de la música (en el vertex shader,
// sin coste de CPU), ventanas que se encienden, carteles giratorios en las azoteas, chimeneas que echan burbujas
// y edificios con cara que parpadean y te siguen con la mirada.
import * as THREE from 'three';
const V3 = THREE.Vector3;
export const WOB = { uT: { value: 0 }, uBeat: { value: 2.2 } };
// Deformación en espacio de mundo: es la misma función para todas las piezas del edificio, así nada se despega.
export function wobbleMat(mat, flap = 0) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); sh.uniforms.uT = WOB.uT; sh.uniforms.uBeat = WOB.uBeat;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uBeat;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        vec4 wpW = modelMatrix * mvPosition;
        float hW = max(0.0, wpW.y + 0.6);
        float phW = wpW.x * 0.021 + wpW.z * 0.017;
        float swW = sin(uT * 3.14159 * uBeat * 0.5 + phW * 6.0);
        float puW = pow(abs(cos(uT * 3.14159 * uBeat + phW)), 10.0);
        wpW.x += swW * 0.016 * hW; wpW.z += cos(uT * 3.14159 * uBeat * 0.5 + phW * 5.0) * 0.012 * hW;
        wpW.y *= 1.0 - 0.03 * puW;
        ${flap ? 'wpW.y += sin(uT * 7.0 + wpW.x * 0.9 + wpW.z * 0.7) * 0.16 * ' + flap.toFixed(2) + ';' : ''}
        mvPosition = viewMatrix * wpW;
        gl_Position = projectionMatrix * mvPosition;`); };
  const k = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => k() + '|wob' + flap; mat.needsUpdate = true; return mat;
}
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3();
export function addEdificios(T, Q, scene) {
  seed = 11 + T.cup.id.length * 3; const night = !!T.cup.night, upd = [];
  WOB.uBeat.value = (T.cup.music && T.cup.music.bpm || 128) / 60;
  const B = (T.buildings || []).filter(b => b.i >= 0 && !b.back);
  const at = (b, lx, ly, lz) => { const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw); return new V3(b.p.x + lx * cy + lz * sy, b.p.y + ly, b.p.z - lx * sy + lz * cy); };
  // ---- caras que parpadean y te miran ----
  const faces = B.filter(b => b.h >= 12 && rnd() < 0.3).slice(0, Q.hi ? 60 : 30);
  const scl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), wobbleMat(new THREE.MeshToonMaterial({ color: '#ffffff' })), Math.max(1, faces.length * 2));
  const pup = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), wobbleMat(new THREE.MeshBasicMaterial({ color: '#2a1838' })), Math.max(1, faces.length * 2));
  const mouth = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.22, 6, 14, Math.PI), wobbleMat(new THREE.MeshBasicMaterial({ color: '#7a2a5a' })), Math.max(1, faces.length));
  const F = faces.map(b => { const e = Math.min(1.5, b.wdt * 0.11); return { b, e, ph: rnd() * 6, eyes: [-1, 1].map(sd => at(b, sd * b.wdt * 0.2, b.h - 3.2, b.dep / 2 + 0.2)), m: at(b, 0, b.h - 5.4, b.dep / 2 + 0.15) }; });
  F.forEach((f, j) => { _m.compose(f.m, _q.setFromEuler(_e.set(0, f.b.yaw, Math.PI)), _s.set(f.e * 1.3, f.e * 1.0, f.e)); mouth.setMatrixAt(j, _m); });
  scl.count = pup.count = F.length * 2; mouth.count = F.length; for (const im of [scl, pup, mouth]) { im.frustumCulled = false; scene.add(im); }
  upd.push((t, dt, R) => { const P = R.player; if (!P) return;
    F.forEach((f, j) => { const blink = ((t + f.ph) % 4.2) > 4.05 ? 0.12 : 1; const cy = Math.cos(f.b.yaw), sy = Math.sin(f.b.yaw);
      f.eyes.forEach((p, k) => { _q.setFromEuler(_e.set(0, f.b.yaw, 0)); _m.compose(p, _q, _s.set(f.e, f.e * 1.25 * blink, f.e * 0.35)); scl.setMatrixAt(j * 2 + k, _m);
        // pupila desplazada hacia el jugador, dentro del plano de la fachada
        const dx = P.pos.x - p.x, dz = P.pos.z - p.z, dy = P.pos.y - p.y, lx = dx * cy - dz * sy, d = Math.hypot(dx, dz) || 1; const ox = Math.max(-0.45, Math.min(0.45, lx / d)) * f.e, oy = Math.max(-0.4, Math.min(0.2, dy / d)) * f.e;
        _p.set(p.x + ox * cy + 0.32 * f.e * sy, p.y + oy, p.z - ox * sy + 0.32 * f.e * cy); _m.compose(_p, _q, _s.set(f.e * 0.45, f.e * 0.55 * blink, f.e * 0.2)); pup.setMatrixAt(j * 2 + k, _m); }); });
    scl.instanceMatrix.needsUpdate = pup.instanceMatrix.needsUpdate = true; });
  // ---- ventanas que se encienden (todas las horas) ----
  const nWl = Math.min(B.length * 3, Q.hi ? 600 : 300), wl = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 1.8), wobbleMat(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: night ? 0.9 : 0.75 })), Math.max(1, nWl));
  const WL = []; for (const b of B) for (let r = 0; r < 3 && WL.length < nWl; r++) { if (b.h < 10) break; const p = at(b, (rnd() - 0.5) * b.wdt * 0.7, 9.5 + rnd() * (b.h - 12), b.dep / 2 + 0.04); WL.push({ p, yaw: b.yaw, on: rnd() < 0.5 }); }
  const cOn = [new THREE.Color('#ffe58a'), new THREE.Color('#ff9fe0'), new THREE.Color('#9ff5ff')], cOff = new THREE.Color(night ? '#3a2a6a' : '#6a7ac0');
  WL.forEach((w, j) => { _m.compose(w.p, _q.setFromEuler(_e.set(0, w.yaw, 0)), _s.set(1, 1, 1)); wl.setMatrixAt(j, _m); wl.setColorAt(j, w.on ? cOn[j % 3] : cOff); }); wl.count = WL.length; if (wl.instanceColor) wl.instanceColor.needsUpdate = true; scene.add(wl);
  let wlT = 0; upd.push((t, dt) => { wlT -= dt; if (wlT > 0 || !WL.length) return; wlT = 0.25; for (let k = 0; k < 8; k++) { const j = Math.floor(rnd() * WL.length), w = WL[j]; w.on = !w.on; wl.setColorAt(j, w.on ? cOn[j % 3] : cOff); } wl.instanceColor.needsUpdate = true; });
  // ---- carteles giratorios en azoteas ----
  const star = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, r = k % 2 ? 0.45 : 1; k ? star.lineTo(Math.sin(a) * r, Math.cos(a) * r) : star.moveTo(0, r); }
  const sg = new THREE.ExtrudeGeometry(star, { depth: 0.35, bevelEnabled: false }); sg.translate(0, 0, -0.17);
  const signs = B.filter(b => rnd() < 0.18).slice(0, 40).map(b => ({ p: at(b, 0, b.h + 7, 0), ph: rnd() * 6, s: 2 + rnd() * 1.5 }));
  const sm = new THREE.InstancedMesh(sg, wobbleMat(new THREE.MeshToonMaterial({ color: '#ffffff', emissive: '#ffcf4a', emissiveIntensity: night ? 0.7 : 0.25 })), Math.max(1, signs.length));
  const scol = ['#ffd84a', '#ff8fd0', '#7ff5ff', '#b98aff']; signs.forEach((s, j) => sm.setColorAt(j, new THREE.Color(scol[j % 4]))); sm.count = signs.length; if (sm.instanceColor) sm.instanceColor.needsUpdate = true; sm.frustumCulled = false; scene.add(sm);
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 5), wobbleMat(new THREE.MeshToonMaterial({ color: '#ffffff' })), Math.max(1, signs.length)); signs.forEach((s, j) => { _m.makeTranslation(s.p.x, s.p.y - 3.5, s.p.z); pole.setMatrixAt(j, _m); }); pole.count = signs.length; scene.add(pole);
  upd.push(t => { signs.forEach((s, j) => { _m.compose(_p.set(s.p.x, s.p.y + Math.sin(t * 2 + s.ph) * 0.4, s.p.z), _q.setFromEuler(_e.set(0, t * 1.6 + s.ph, 0)), _s.set(s.s, s.s, s.s)); sm.setMatrixAt(j, _m); }); sm.instanceMatrix.needsUpdate = true; });
  // ---- chimeneas con burbujas ----
  const chim = B.filter(b => rnd() < 0.3).slice(0, 70).map(b => ({ p: at(b, b.wdt * 0.28, b.h + 1.2, -b.dep * 0.15) }));
  const cm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 0.8, 2.6, 8), wobbleMat(new THREE.MeshToonMaterial({ color: night ? '#8a7ad0' : '#ff9f8f' })), Math.max(1, chim.length)); chim.forEach((c, j) => { _m.makeTranslation(c.p.x, c.p.y, c.p.z); cm.setMatrixAt(j, _m); }); cm.count = chim.length; scene.add(cm);
  const nb = Q.hi ? 260 : 140, bp = new Float32Array(nb * 3), bv = []; const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
  const bubTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); x.strokeStyle = '#ffffff'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 26, 0, 6.28); x.stroke(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(22, 22, 6, 0, 6.28); x.fill(); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const bubs = new THREE.Points(bg, new THREE.PointsMaterial({ map: bubTex, size: 1.3, transparent: true, depthWrite: false, color: night ? '#c8b8ff' : '#ffffff' })); bubs.frustumCulled = false; if (chim.length) scene.add(bubs);
  for (let k = 0; k < nb; k++) bv.push({ c: null, life: 0 });
  upd.push((t, dt, R) => { if (!chim.length || !R.player) return; const P = R.player.pos;
    for (let k = 0; k < nb; k++) { const b = bv[k]; b.life -= dt;
      if (b.life <= 0) { // renace en una chimenea cercana al jugador
        let c = chim[Math.floor(rnd() * chim.length)]; for (let tries = 0; tries < 4 && c.p.distanceToSquared(P) > 180 * 180; tries++) c = chim[Math.floor(rnd() * chim.length)];
        b.life = 2 + rnd() * 2.5; bp[k * 3] = c.p.x; bp[k * 3 + 1] = c.p.y + 1.3; bp[k * 3 + 2] = c.p.z; b.vx = (rnd() - 0.5) * 0.8; b.vz = (rnd() - 0.5) * 0.8; }
      bp[k * 3] += (b.vx + Math.sin(t * 2 + k) * 0.4) * dt; bp[k * 3 + 1] += 2.2 * dt; bp[k * 3 + 2] += b.vz * dt; }
    bg.attributes.position.needsUpdate = true; });
  return { faces: F.length, lights: WL.length, signs: signs.length, chimneys: chim.length, update(t, dt, R) { WOB.uT.value = t; for (const u of upd) u(t, dt, R); } };
}
