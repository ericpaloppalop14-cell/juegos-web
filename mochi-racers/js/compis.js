// v42: cada piloto lleva un "compi" o accesorio animado propio de su personalidad (animación secundaria)
import * as THREE from 'three';
import { toon, mesh, outline } from './gfx.js';
const G = new Map(), geo = (k, f) => G.get(k) || (G.set(k, f()), G.get(k));
const sph = () => geo('s', () => new THREE.SphereGeometry(1, 12, 9)), box = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1));
const cyl = () => geo('c', () => new THREE.CylinderGeometry(1, 1, 1, 12)), cone = () => geo('k', () => new THREE.ConeGeometry(1, 1, 10));
const tor = () => geo('t', () => new THREE.TorusGeometry(1, 0.28, 8, 20));
const star = () => geo('st', () => { const s = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.45 : 1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 }); });
const heart = () => geo('h', () => { const h = new THREE.Shape(); h.moveTo(0, -1); h.bezierCurveTo(1.4, 0.2, 1, 1.3, 0, 0.6); h.bezierCurveTo(-1, 1.3, -1.4, 0.2, 0, -1); return new THREE.ExtrudeGeometry(h, { depth: 0.4, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15, bevelSegments: 2 }); });
const glow = (c, e = 0.6) => toon(c, { emissive: c, ei: e, rim: 0.3 });
const eyes = (g, y, z, s = 1) => { for (const k of [-1, 1]) mesh(sph(), toon('#2a1838', { rim: 0 }), g, [k * 0.07 * s, y, z], null, 0.035 * s); };
const note = (g, c, p) => { const n = new THREE.Group(); n.position.set(...p); g.add(n); mesh(sph(), glow(c, 0.5), n, [0, 0, 0], null, [0.09, 0.07, 0.06]); mesh(box(), glow(c, 0.5), n, [0.07, 0.15, 0], null, [0.025, 0.3, 0.025]); mesh(box(), glow(c, 0.5), n, [0.12, 0.28, 0], [0, 0, -0.6], [0.11, 0.03, 0.025]); return n; };

// cada builder devuelve una función de animación (t, ph)
const B = {
  mochi(g) { // mariposa que revolotea
    const b = new THREE.Group(); g.add(b); const w = [];
    mesh(sph(), toon('#5a3a6e'), b, null, null, [0.03, 0.03, 0.1]);
    for (const k of [-1, 1]) { const p = new THREE.Group(); b.add(p); w.push([p, k]); mesh(heart(), glow(k > 0 ? '#ff8fc8' : '#ffb0d8', 0.4), p, [k * 0.11, 0, 0], [0, 0, k * 1.2], 0.1); }
    return (t, ph) => { const a = t * 1.3 + ph; b.position.set(Math.cos(a) * 0.95, 1.55 + Math.sin(t * 3) * 0.12, Math.sin(a) * 0.6 + 0.2); b.rotation.y = -a; w.forEach(([p, k]) => p.rotation.y = k * (0.3 + Math.sin(t * 24) * 0.7)); };
  },
  tiovivo(g) { // molinillo de feria que gira con el viento
    const p = new THREE.Group(); p.position.set(0.62, 1.45, 0.1); g.add(p); mesh(cyl(), toon('#ffffff'), p, [0, -0.25, 0], null, [0.02, 0.5, 0.02]);
    const h = new THREE.Group(); h.position.y = 0.02; p.add(h); ['#ff6f9a', '#ffe066', '#7fd8ff', '#7ff5a0'].forEach((c, i) => mesh(cone(), toon(c, { rim: 0.4 }), h, [Math.cos(i * 1.57) * 0.1, Math.sin(i * 1.57) * 0.1, 0.02], [0, 0, i * 1.57 - 0.6], [0.08, 0.2, 0.02]));
    mesh(sph(), toon('#ffe066'), h, null, null, 0.035);
    return (t, ph, sp) => { h.rotation.z = -t * (3 + sp * 14); };
  },
  atomo(g) { // electrones que orbitan la cabeza
    const es = [0, 1, 2].map(i => { const o = new THREE.Group(); o.position.y = 1.25; o.rotation.set(i * 1.05 + 0.4, i * 0.9, 0); g.add(o); mesh(sph(), glow(['#7ff5ff', '#ff8fc0', '#b6ff9f'][i], 0.9), o, [0.95, 0, 0], null, 0.06); return o; });
    return t => es.forEach((o, i) => o.rotation.z = t * (2.2 + i * 0.6));
  },
  cosmo(g) { // estrellita compañera con carita
    const s = new THREE.Group(); g.add(s); const m = mesh(star(), glow('#ffe066', 0.6), s, [0, 0, -0.04], null, 0.16); outline(m, '#a07a20', 1.1); eyes(s, 0.02, 0.06);
    return (t, ph) => { s.position.set(-0.85, 1.6 + Math.sin(t * 2.4 + ph) * 0.12, 0.25); s.rotation.z = Math.sin(t * 1.8) * 0.4; s.scale.setScalar(1 + Math.sin(t * 6) * 0.08); };
  },
  copito(g) { // copo de nieve flotante que gira
    const f = new THREE.Group(); g.add(f); const ice = glow('#d8f4ff', 0.6);
    for (let i = 0; i < 3; i++) { mesh(box(), ice, f, null, [0, 0, i * 1.047], [0.32, 0.035, 0.02]); for (const k of [-1, 1]) mesh(box(), ice, f, [Math.cos(i * 1.047) * k * 0.11, Math.sin(i * 1.047) * k * 0.11, 0], [0, 0, i * 1.047 + k * 0.8], [0.09, 0.025, 0.02]); }
    return (t, ph) => { f.position.set(0.8, 1.65 + Math.sin(t * 1.6 + ph) * 0.1, 0.1); f.rotation.z = t * 1.2; f.rotation.y = Math.sin(t) * 0.6; };
  },
  burbuja(g) { // pececito que nada en círculos
    const f = new THREE.Group(); g.add(f); const b = mesh(sph(), toon('#ff9f4a', { rim: 0.6 }), f, null, null, [0.06, 0.08, 0.13]);
    const tail = mesh(cone(), toon('#ffcf6a'), f, [0, 0, -0.15], [-Math.PI / 2, 0, 0], [0.07, 0.1, 0.03]); eyes(f, 0.02, 0.1, 0.6);
    return (t, ph) => { const a = t * 1.6 + ph; f.position.set(Math.cos(a) * 0.9, 1.1 + Math.sin(t * 3) * 0.15, Math.sin(a) * 0.7 + 0.1); f.rotation.y = -a; tail.rotation.y = Math.sin(t * 18) * 0.5; };
  },
  lava(g) { // ascuas que suben
    const em = [0, 1, 2, 3].map(i => mesh(sph(), glow(['#ffb13d', '#ff6f3d'][i % 2], 1), g, null, null, 0.05));
    return t => em.forEach((e, i) => { const u = (t * 0.7 + i * 0.25) % 1; e.position.set(Math.sin(i * 2.3 + t * 2) * 0.4, 1.6 + u * 0.9, Math.cos(i * 1.7) * 0.3); e.scale.setScalar(0.06 * (1 - u)); });
  },
  tictac(g) { // engranaje que gira junto a la chistera
    const gr = new THREE.Group(); gr.position.set(-0.45, 1.8, 0.15); g.add(gr); const gd = toon('#e8bc52', { rim: 0.8, emissive: '#c08a20', ei: 0.2 });
    mesh(cyl(), gd, gr, null, [Math.PI / 2, 0, 0], [0.13, 0.05, 0.13]); for (let k = 0; k < 8; k++) mesh(box(), gd, gr, [Math.cos(k * 0.785) * 0.15, Math.sin(k * 0.785) * 0.15, 0], [0, 0, k * 0.785], [0.05, 0.05, 0.05]);
    return t => { gr.rotation.z = Math.floor(t * 4) * 0.2 + Math.min(1, (t * 4 % 1) * 3) * 0.2; }; // tic-tac a saltitos
  },
  trueno(g) { // nubecita de tormenta con rayo
    const c = new THREE.Group(); g.add(c); for (let i = 0; i < 3; i++) mesh(sph(), toon('#9aa4c8', { rim: 0.5 }), c, [(i - 1) * 0.13, i === 1 ? 0.06 : 0, 0], null, i === 1 ? 0.13 : 0.1);
    const b = mesh(cone(), glow('#fff27a', 1), c, [0, -0.2, 0], [Math.PI, 0, 0.3], [0.05, 0.22, 0.02]); eyes(c, 0.02, 0.12, 0.7);
    return (t, ph) => { c.position.set(0.85, 1.7 + Math.sin(t * 2 + ph) * 0.08, -0.1); b.visible = (t * 1.3 + ph) % 2 < 0.25; };
  },
  disco(g) { // destellos que titilan alrededor del afro
    const s = [0, 1, 2, 3].map(i => mesh(star(), glow(['#ff8fd8', '#7ff5ff', '#ffe066', '#b98cff'][i], 0.9), g, [Math.cos(i * 1.6) * 0.8, 1.6 + (i % 2) * 0.3, Math.sin(i * 1.6) * 0.5], null, 0.07));
    return t => s.forEach((m, i) => { m.scale.setScalar(0.07 * Math.max(0, Math.sin(t * 4 + i * 1.6))); m.rotation.z = t * 2; });
  },
  capitan(g) { // salvavidas que gira a su lado
    const r = new THREE.Group(); r.position.set(0.7, 0.75, 0.2); g.add(r); mesh(tor(), toon('#ffffff', { rim: 0.4 }), r, null, null, 0.16);
    for (let k = 0; k < 4; k++) mesh(box(), toon('#ff4f6a'), r, [Math.cos(k * 1.57) * 0.16, Math.sin(k * 1.57) * 0.16, 0], [0, 0, k * 1.57], [0.07, 0.1, 0.1]);
    return (t, ph) => { r.rotation.z = Math.sin(t * 2 + ph) * 0.6; r.position.y = 0.75 + Math.sin(t * 3) * 0.05; };
  },
  tostadin(g) { // vapor de tostado en espiral
    const p = [0, 1, 2].map(() => mesh(sph(), toon('#fff6ec', { opacity: 0.7, rim: 0 }).clone(), g, null, null, 0.1));
    return t => p.forEach((m, i) => { const u = (t * 0.5 + i / 3) % 1; m.position.set(Math.sin(u * 9) * 0.2 + 0.3, 1.9 + u * 0.8, -0.1); m.scale.setScalar(0.06 + u * 0.12); m.material.opacity = 0.7 * (1 - u); });
  },
  madame(g) { // corazón que late flotando
    const h = mesh(heart(), glow('#ff6f9a', 0.6), g, null, null, 0.13); outline(h, '#a03060', 1.1);
    return (t, ph) => { h.position.set(-0.8, 1.55 + Math.sin(t * 1.5 + ph) * 0.1, 0.2); const b = 1 + Math.max(0, Math.sin(t * 7)) * 0.25; h.scale.setScalar(0.13 * b); h.rotation.y = Math.sin(t) * 0.5; };
  },
  tecla(g) { // notas musicales que suben bailando
    const n = [0, 1, 2].map(i => note(g, ['#ffffff', '#ffe066', '#b98cff'][i], [0, 0, 0]));
    return t => n.forEach((m, i) => { const u = (t * 0.45 + i / 3) % 1; m.position.set(0.5 + Math.sin(u * 7 + i) * 0.3, 1.4 + u * 1.0, 0.1); m.rotation.z = Math.sin(t * 5 + i) * 0.4; m.scale.setScalar(Math.sin(u * Math.PI) * 1.1); });
  },
  duquesa(g) { // patito de goma en el hombro
    const d = new THREE.Group(); d.position.set(0.62, 1.0, 0.1); g.add(d); const y = toon('#ffe066', { rim: 0.6 });
    mesh(sph(), y, d, null, null, [0.13, 0.1, 0.15]); mesh(sph(), y, d, [0, 0.13, 0.06], null, 0.08); mesh(cone(), toon('#ff9f4a'), d, [0, 0.12, 0.15], [Math.PI / 2, 0, 0], [0.035, 0.07, 0.025]); eyes(d, 0.16, 0.12, 0.6);
    return (t, ph) => { d.rotation.z = Math.sin(t * 3 + ph) * 0.2; d.rotation.x = Math.sin(t * 2.2) * 0.15; d.position.y = 1.0 + Math.abs(Math.sin(t * 3)) * 0.05; };
  },
  farito(g) { // gaviota que vuela en círculos
    const b = new THREE.Group(); g.add(b); mesh(sph(), toon('#ffffff', { rim: 0.6 }), b, null, null, [0.06, 0.06, 0.12]); mesh(cone(), toon('#ffb13d'), b, [0, 0, 0.13], [Math.PI / 2, 0, 0], [0.02, 0.05, 0.02]);
    const w = [-1, 1].map(k => { const p = new THREE.Group(); b.add(p); mesh(box(), toon('#e8eef8'), p, [k * 0.13, 0, 0], null, [0.22, 0.015, 0.07]); return [p, k]; });
    return (t, ph) => { const a = t * 0.9 + ph; b.position.set(Math.cos(a) * 1.1, 2.0 + Math.sin(t * 2) * 0.1, Math.sin(a) * 0.8); b.rotation.y = -a; b.rotation.z = 0.3; w.forEach(([p, k]) => p.rotation.z = k * Math.sin(t * 10) * 0.6); };
  },
  tarta(g) { // vela de cumpleaños con llama que tiembla y confeti
    const v = new THREE.Group(); v.position.set(-0.45, 1.6, 0.2); v.rotation.z = 0.35; g.add(v);
    mesh(cyl(), toon('#7fd8ff', { rim: 0.4 }), v, [0, 0.12, 0], null, [0.04, 0.24, 0.04]); const fl = mesh(sph(), glow('#ffcf3a', 1), v, [0, 0.3, 0], null, [0.04, 0.08, 0.04]);
    const cf = [0, 1, 2].map(i => mesh(box(), glow(['#ff6f9a', '#7ff5a0', '#ffe066'][i], 0.5), g, null, null, 0.05));
    return t => { fl.scale.set(0.04 + Math.sin(t * 23) * 0.008, 0.08 + Math.sin(t * 17) * 0.02, 0.04); cf.forEach((c, i) => { const u = (t * 0.4 + i / 3) % 1; c.position.set(Math.cos(i * 2.1) * 0.6, 2.3 - u * 1.0, Math.sin(i * 2.1) * 0.4); c.rotation.set(t * 4, t * 3 + i, 0); }); };
  },
  grullita(g) { // avioncito de papel en órbita
    const a = new THREE.Group(); g.add(a); const pm = toon('#ffffff', { rim: 0.3 }).clone();
    for (const k of [-1, 1]) mesh(geo('paperw', () => { const s = new THREE.Shape(); s.moveTo(0, 0.2); s.lineTo(0.12, -0.15); s.lineTo(0, -0.08); s.lineTo(0, 0.2); const g2 = new THREE.ShapeGeometry(s); g2.rotateX(-Math.PI / 2); return g2; }), pm, a, null, [0, 0, k * 0.3], [k, 1, 1]);
    pm.side = THREE.DoubleSide;
    return (t, ph) => { const r = t * 1.1 + ph; a.position.set(Math.cos(r) * 1.0, 1.7 + Math.sin(r * 2) * 0.2, Math.sin(r) * 0.8); a.rotation.y = -r + Math.PI; a.rotation.z = Math.sin(r * 2) * 0.3; };
  },
};
export function addCompi(X, rig, root) {
  const f = B[X]; if (!f) return; const g = new THREE.Group(); g.name = 'compi'; rig.add(g);
  try { root.userData.compi = f(g); } catch (e) { console.warn('compi', X, e); }
}
