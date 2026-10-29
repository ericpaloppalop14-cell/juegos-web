// ======================================================================
//  PEATONES SURREALISTAS: cruzan en pasos de cebra (con semáforo) y a
//  mitad de calle (con señal). Son obstáculos esquivables: si los tocas
//  te frenan y ellos rebotan como gelatina (nunca se hacen daño).
//  Todo es determinista respecto al reloj de carrera -> igual en todos
//  los jugadores online sin enviar nada por la red.
// ======================================================================
import * as THREE from 'three';
import { toon, mesh, outline, makeCharacter, animCharacter } from './gfx.js?v=o39';
import { PED_KINDS } from './data.js';
const V3 = THREE.Vector3;
const PS = 1.25; // escala de los peatones (más visibles en vertical)

function eyes(parent, y, z, s = 1, sep = 0.3) {
  for (const sd of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.12 * s, 8, 6), toon('#2a1838', { rim: 0 }), parent, [sd * sep * s, y, z], null, [1, 1.3, 0.7]); mesh(new THREE.SphereGeometry(0.04 * s, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff' }), e, [0.3, 0.4, 0.8]); }
  mesh(new THREE.TorusGeometry(0.08 * s, 0.025 * s, 5, 10, Math.PI), toon('#2a1838', { rim: 0 }), parent, [0, y - 0.2 * s, z + 0.02], [0, 0, Math.PI]);
}
const legs = (g, xs, zs, col, h = 0.7, r = 0.16) => { const L = []; for (const x of xs) for (const z of zs) { const l = mesh(new THREE.CapsuleGeometry(r, h, 4, 8), toon(col), g, [x, h / 2 + r, z]); L.push(l); } return L; };

// cada tipo devuelve { members:[{g, r, off:[x along crossing, z along street]}], speed factor }
function build(kind) {
  const members = [];
  const M = (g, r, ox = 0, oz = 0, anim) => { members.push({ g, r, ox, oz, anim, boing: 0, by: 0 }); return g; };
  if (kind === 'familia') {
    const cols = ['#7ee3c4', '#ffb36b', '#ff9cc8'], sz = [1.9, 1.5, 1.05], ears = ['bear', 'cat', 'bunny'];
    sz.forEach((s, k) => { const g = new THREE.Group(); const c = makeCharacter({ color: cols[k], ears: ears[k], inner: 'bubbles' }); c.userData.seed = k * 3; c.scale.setScalar(s); g.add(c); g.userData.char = c;
      const lg = legs(g, [-0.35 * s, 0.35 * s], [0], cols[k], 0.25 * s, 0.13 * s); c.position.y = 0.5 * s; M(g, 1.0 * s, -k * 2.2, (k % 2) * 0.8, (t, m) => { lg.forEach((l, i) => l.rotation.x = Math.sin(t * 9 + i * 3.1) * 0.6); animCharacter(c, t); }); });
  } else if (kind === 'caracol') {
    const g = new THREE.Group();
    const body = mesh(new THREE.CapsuleGeometry(1.1, 5, 6, 14), toon('#b9f0a0', { opacity: 0.9, rim: 0.6 }), g, [0, 1.0, 0], [0, 0, Math.PI / 2]); outline(body, '#5a8a4a', 1.04);
    const head = mesh(new THREE.SphereGeometry(1.2, 14, 10), toon('#b9f0a0', { rim: 0.6 }), g, [3.4, 1.6, 0]); eyes(head, 0.3, 1.05, 1.6, 0.25);
    for (const sd of [-1, 1]) { mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.6, 6), toon('#b9f0a0'), head, [sd * 0.4, 1.4, 0], [0, 0, -sd * 0.3]); mesh(new THREE.SphereGeometry(0.28, 8, 6), toon('#ffffff'), head, [sd * 0.65, 2.2, 0]); }
    // la casa que lleva encima
    const house = new THREE.Group(); house.position.set(-0.3, 2.2, 0); g.add(house);
    const hb = mesh(new THREE.BoxGeometry(3.2, 2.6, 2.6), toon('#ffd0e6'), house, [0, 1.3, 0]); outline(hb, '#8a4a6a', 1.03);
    mesh(new THREE.ConeGeometry(2.6, 2, 4), toon('#ff7fb6'), house, [0, 3.6, 0], [0, Math.PI / 4, 0]);
    mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), toon('#fff6a0', { emissive: '#fff2a0', ei: 0.5 }), house, [0.7, 1.6, 1.32]); mesh(new THREE.BoxGeometry(0.7, 1.3, 0.1), toon('#a0602a'), house, [-0.7, 0.65, 1.32]);
    mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8), toon('#c08aa0'), house, [1, 4, 0.5]);
    const smoke = []; for (let k = 0; k < 3; k++) smoke.push(mesh(new THREE.SphereGeometry(0.35, 8, 6), toon('#ffffff', { opacity: 0.7 }), house, [1, 4.8, 0.5]));
    g.rotation.y = -Math.PI / 2; const w = new THREE.Group(); w.add(g);
    M(w, 3.2, 0, 0, (t) => { body.scale.y = 1 + Math.sin(t * 4) * 0.05; house.rotation.z = Math.sin(t * 2) * 0.05; smoke.forEach((m, k) => { const ph = (t * 0.6 + k / 3) % 1; m.position.set(1 + ph * 0.5, 4.8 + ph * 3, 0.5); m.scale.setScalar(0.6 + ph * 1.2); }); });
  } else if (kind === 'helado') {
    const g = new THREE.Group();
    const cone = mesh(new THREE.ConeGeometry(0.9, 2.6, 14), toon('#e8b47a'), g, [0, 2.3, 0], [Math.PI, 0, 0]); outline(cone, '#8a5a3a', 1.04);
    const sc = mesh(new THREE.SphereGeometry(1.15, 16, 12), toon('#ffc4e1', { rim: 0.5 }), g, [0, 3.9, 0]); mesh(new THREE.SphereGeometry(0.9, 14, 10), toon('#c4f0ff', { rim: 0.5 }), g, [0.1, 5.0, 0]); mesh(new THREE.SphereGeometry(0.25, 8, 6), toon('#ff4f6f'), g, [0.1, 5.95, 0]);
    eyes(sc, 0.1, 1.05, 1.6, 0.24); const lg = legs(g, [-0.3, 0.3], [0], '#e8b47a', 0.7, 0.13);
    // perro-donut con correa
    const dog = new THREE.Group(); dog.position.set(0, 0, 3.2); g.add(dog);
    const dn = mesh(new THREE.TorusGeometry(0.8, 0.42, 10, 20), toon('#ffcf9a'), dog, [0, 1.1, 0]); mesh(new THREE.TorusGeometry(0.8, 0.44, 10, 20, Math.PI * 2), toon('#ff8fd0', { rim: 0.5 }), dn, [0, 0, 0.1], null, [1, 1, 0.7]);
    const dh = mesh(new THREE.SphereGeometry(0.55, 12, 9), toon('#ffcf9a'), dog, [0, 1.6, 0.9]); eyes(dh, 0.1, 0.5, 1, 0.3);
    for (const sd of [-1, 1]) mesh(new THREE.SphereGeometry(0.3, 8, 6), toon('#a0602a'), dh, [sd * 0.45, 0.3, 0], null, [0.5, 1.2, 0.4]);
    const dl = legs(dog, [-0.4, 0.4], [-0.4, 0.4], '#ffcf9a', 0.35, 0.12);
    const leash = mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.3, 4), toon('#ff5f8f'), g, [0.6, 2.0, 1.6], [Math.PI / 2 - 0.25, 0, 0]);
    M(g, 1.3, 0, 0, (t) => { lg.forEach((l, i) => l.rotation.x = Math.sin(t * 8 + i * 3.1) * 0.6); dl.forEach((l, i) => l.rotation.x = Math.sin(t * 14 + i * 1.6) * 0.8); dog.position.y = Math.abs(Math.sin(t * 7)) * 0.4; dn.rotation.z = t * 3; });
    members[0].extra = [{ dz: 3.2, r: 1.1 }];
  } else if (kind === 'ositos') {
    const cols = ['#ff5f6f', '#ffd24a', '#5fe08f', '#ff9f3a', '#6fb8ff'];
    cols.forEach((col, k) => { const g = new THREE.Group(); const m = toon(col, { opacity: 0.82, rim: 0.8 });
      const b = mesh(new THREE.SphereGeometry(0.75, 12, 10), m, g, [0, 1.25, 0], null, [1, 1.15, 0.9]); const h = mesh(new THREE.SphereGeometry(0.6, 12, 10), m, g, [0, 2.3, 0]);
      for (const sd of [-1, 1]) { mesh(new THREE.SphereGeometry(0.22, 8, 6), m, h, [sd * 0.45, 0.45, 0]); mesh(new THREE.SphereGeometry(0.22, 8, 6), m, g, [sd * 0.75, 1.5, 0.1]); }
      eyes(h, 0.05, 0.55, 1, 0.3); const lg = legs(g, [-0.3, 0.3], [0], col, 0.35, 0.2);
      if (k === 0) { mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), toon('#ffffff'), g, [0.9, 2.4, 0]); mesh(new THREE.PlaneGeometry(1.1, 0.7), toon('#ff7fb6', { side: THREE.DoubleSide, rim: 0 }), g, [1.45, 3.2, 0]); }
      M(g, 0.95, -k * 1.9, 0, (t) => { lg.forEach((l, i) => l.rotation.x = Math.sin(t * 10 + i * 3.1 + k) * 0.7); g.rotation.z = Math.sin(t * 5 + k) * 0.08; }); });
  } else if (kind === 'jirafa') {
    const g = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(1.2, 14, 10), toon('#ffd36b', { rim: 0.4 }), g, [0, 3.2, 0], null, [1.5, 1, 1]); outline(body, '#a07020', 1.04);
    for (let k = 0; k < 6; k++) mesh(new THREE.SphereGeometry(0.3, 8, 6), toon('#ff9f3a'), body, [Math.cos(k) * 0.9, Math.sin(k * 2) * 0.6, 0.7], null, [1, 1, 0.3]);
    const neck = mesh(new THREE.CylinderGeometry(0.25, 0.35, 6, 10), toon('#ffffff'), g, [0.9, 6.6, 0], [0, 0, -0.15]);
    const lol = new THREE.Group(); lol.position.set(1.4, 10, 0); g.add(lol);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); for (let a = 0; a < 40; a++) { x.strokeStyle = a % 2 ? '#ff5f8f' : '#ffffff'; x.lineWidth = 9; x.beginPath(); x.arc(64, 64, a * 1.6, a * 0.6, a * 0.6 + 1.5); x.stroke(); }
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const disc = mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 24), new THREE.MeshBasicMaterial({ map: tx }), lol, [0, 0, 0], [Math.PI / 2, 0, 0]);
    eyes(lol, 0.2, 0.25, 1.6, 0.3); for (const sd of [-1, 1]) mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 5), toon('#ffd36b'), lol, [sd * 0.6, 1.9, 0]);
    const lg = legs(g, [-0.9, 0.9], [-0.4, 0.4], '#ffd36b', 2.2, 0.18);
    M(g, 1.8, 0, 0, (t) => { lg.forEach((l, i) => l.rotation.x = Math.sin(t * 6 + i * 1.6) * 0.45); lol.rotation.z = Math.sin(t * 2) * 0.2; disc.rotation.y = t * 2; });
  } else if (kind === 'camarero') {
    const g = new THREE.Group(); const c = makeCharacter({ color: '#ffffff', ears: 'cat', inner: 'bubbles' }); c.scale.setScalar(1.7); c.position.y = 0.4; g.add(c);
    mesh(new THREE.ConeGeometry(0.25, 0.4, 4), toon('#2a1838'), g, [-0.25, 1.6, 1.4], [0, 0, Math.PI / 2]); mesh(new THREE.ConeGeometry(0.25, 0.4, 4), toon('#2a1838'), g, [0.25, 1.6, 1.4], [0, 0, -Math.PI / 2]);
    const tray = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 20), toon('#d0d8e8', { rim: 0.8 }), g, [1.6, 3.6, 0]);
    const cakes = []; for (let k = 0; k < 3; k++) { const ck = new THREE.Group(); g.add(ck); mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.6, 16), toon(['#ffc4e1', '#fff3c4', '#c4f0ff'][k]), ck, [0, 0, 0]); mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.15, 16), toon('#ffffff'), ck, [0, 0.3, 0]); mesh(new THREE.SphereGeometry(0.15, 8, 6), toon('#ff3f5f'), ck, [0, 0.5, 0]); cakes.push(ck); }
    const lg = legs(g, [-0.4, 0.4], [0], '#ffffff', 0.4, 0.15);
    M(g, 1.6, 0, 0, (t) => { animCharacter(c, t); lg.forEach((l, i) => l.rotation.x = Math.sin(t * 9 + i * 3.1) * 0.6); tray.rotation.z = Math.sin(t * 3) * 0.1; cakes.forEach((ck, k) => { const a = t * 2 + k * 2.1; ck.position.set(1.6 + Math.cos(a) * 1.2, 4.6 + Math.sin(t * 3 + k) * 0.5 + k * 0.3, Math.sin(a) * 1.2); ck.rotation.y = t * 3; }); });
  }
  return members;
}
const SPEED = { familia: 1, caracol: 0.55, helado: 0.9, ositos: 1.1, jirafa: 0.8, camarero: 1.05 };

export function addPeds(T, Q, scene) {
  const list = [];
  for (const cr of T.crossings) {
    const s = T.S[cr.idx]; const members = build(cr.kind);
    const root = new THREE.Group(); scene.add(root);
    for (const m of members) root.add(m.g);
    const half = s.wall + 1.5, D = (half * 2) / (6.5 * SPEED[cr.kind]); // tiempo en cruzar
    const P = cr.jay ? D + 7 + (cr.idx % 4) : Math.max(cr.period, D + 5);
    list.push({ cr, s, members, root, half, D, P, ph: cr.phase, name: PED_KINDS[cr.kind], hitCD: new Map() });
  }
  const bubble = new Map();
  const api = {
    list,
    // estado del ciclo para un cruce en el instante t: 'go' coches / 'amb' aviso / 'red' peatones cruzando
    phase(p, t) { const tc = ((t + p.ph) % p.P + p.P) % p.P, cyc = Math.floor((t + p.ph) / p.P); const g = p.P - p.D - 1.6;
      if (t <= 0) return { st: 'go', u: 0, dir: 1, tc };
      if (tc < g) return { st: 'go', u: 0, dir: cyc % 2 ? -1 : 1, tc }; if (tc < g + 1.6) return { st: 'amb', u: 0, dir: cyc % 2 ? -1 : 1, tc };
      return { st: 'red', u: (tc - g - 1.6) / p.D, dir: cyc % 2 ? -1 : 1, tc }; },
    update(t, dt, race) {
      const anim = race.time;
      for (const p of list) {
        const ph = api.phase(p, t), s = p.s;
        const yawCross = Math.atan2(s.right.x, s.right.z) * 1; // mirando hacia +right
        p.state = ph.st;
        // semáforos / señal
        for (const L of p.cr.lights) { if (L.red) { const on = c => c ? 1 : 0.18; L.red.material.color.set('#ff3f6f').multiplyScalar(on(ph.st === 'red')); L.amb.material.color.set('#ffc23d').multiplyScalar(on(ph.st === 'amb' && Math.floor(anim * 6) % 2 === 0)); L.grn.material.color.set('#5fff9a').multiplyScalar(on(ph.st === 'go')); }
          if (L.sign) { const warn = ph.st !== 'go'; L.sign.scale.setScalar(warn ? 1 + Math.abs(Math.sin(anim * 8)) * 0.18 : 1); } }
        // posición: en rojo cruzan de un lado a otro; si no, esperan en la acera de salida
        const u = ph.st === 'red' ? ph.u : 0, dir = ph.dir;
        const lat0 = -dir * p.half, lat = lat0 + dir * 2 * p.half * u;
        const walking = ph.st === 'red';
        for (const m of p.members) {
          const l = lat - dir * m.ox * PS * (walking ? 1 : 0.6) - (walking ? 0 : dir * 1.5);
          const along = m.oz * PS;
          m.lat = l; m.along = along;
          const x = s.p.x + s.right.x * l + s.fl.x * along, z = s.p.z + s.right.z * l + s.fl.z * along;
          m.boing = Math.max(0, m.boing - dt * 1.3); m.by += (m.boing > 0 ? 9 : -12) * dt; m.by = Math.max(0, Math.min(m.by, 2.5 * m.boing + 0.01));
          const hop = walking ? Math.abs(Math.sin(anim * 8 + m.ox)) * 0.25 : Math.abs(Math.sin(anim * 3 + m.ox)) * 0.1;
          m.g.position.set(x, s.p.y + 0.3 + hop + m.by, z);
          m.g.rotation.y = walking ? yawCross + (dir < 0 ? Math.PI : 0) : Math.atan2(-s.fl.x, -s.fl.z);
          if (m.boing > 0) { const w = Math.sin(m.boing * 30) * m.boing * 0.45; m.g.scale.set(PS * (1 + w), PS * (1 - w), PS * (1 + w)); m.g.rotation.z = Math.sin(m.boing * 20) * 0.3 * m.boing; } else { m.g.scale.setScalar(PS); m.g.rotation.z = 0; }
          if (m.anim) m.anim(walking ? anim : anim * 0.3, m);
        }
      }
    },
    // colisión kart-peatón. local=true aplica física al kart (solo karts simulados aquí)
    collide(k, race, local) {
      for (const p of list) {
        const di = ((p.cr.idx - k.idx) % race.track.N + race.track.N) % race.track.N; if (di > 12 && di < race.track.N - 12) continue;
        for (const m of p.members) {
          const tests = [[m.g.position, m.r * PS]];
          if (m.extra) for (const e of m.extra) { const ang = m.g.rotation.y; tests.push([new V3(m.g.position.x + Math.sin(ang) * e.dz * PS, 0, m.g.position.z + Math.cos(ang) * e.dz * PS), e.r * PS]); }
          for (const [pos, r] of tests) {
            const dx = pos.x - k.pos.x, dz = pos.z - k.pos.z, R = r + 1.2 * k.megaS;
            if (dx * dx + dz * dz > R * R) continue;
            const key = k.netId || k.ch.id; if ((p.hitCD.get(key) || 0) > race.time) continue; p.hitCD.set(key, race.time + 1.4);
            m.boing = k.megaT > 0 ? 1.6 : 1; m.by = 0;
            race.onPedHit && race.onPedHit(k, p, m, local);
            if (local && k.megaT <= 0 && k.invT <= 0) { const d = Math.hypot(dx, dz) || 1; k.vx = k.vx * 0.35 - dx / d * 4; k.vz = k.vz * 0.35 - dz / d * 4; if (!k.air) { k.vy = 4.2; k.air = true; k.hop = true; } k.driftDir = 0; k.boostT = 0; k.pedHits = (k.pedHits || 0) + 1; }
            return true;
          }
        }
      }
      return false;
    },
    // IA: devuelve desplazamiento lateral seguro si hay peatones delante
    avoid(k, race) {
      let best = null;
      for (const p of list) {
        const N = race.track.N, di = ((p.cr.idx - k.idx) % N + N) % N; if (di > 22 || di < 1) continue;
        if (p.state === 'go') continue;
        const lats = p.members.map(m => m.lat);
        const lo = Math.min(...lats) - 3.2, hi = Math.max(...lats) + 3.2, w = p.s.w - 1;
        const cur = (k.ai && k.ai.lane || 0) * p.s.w;
        if (cur < lo || cur > hi) continue;
        const left = lo > -w + 1 ? (lo - w) / 2 : null, right = hi < w - 1 ? (hi + w) / 2 : null;
        const cands = [left, right].filter(v => v != null && Math.abs(v) <= w);
        if (cands.length) best = cands.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur))[0]; else best = 'brake';
        break;
      }
      return best;
    },
  };
  return api;
}
