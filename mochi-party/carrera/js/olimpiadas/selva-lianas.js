// ======================================================================
//  LIANAS DE LA SELVA — escenario inmersivo: selva en capas, río, cascada, flores,
//  mariposas, pájaros, rayos de luz y hojas que caen. Todo instanciado (barato en móvil).
// ======================================================================
import { THREE, toon, mesh, rnd, pick } from '../core3d.js?v=m18';
import { CYL, SPH, SPHL } from './mundos.js?v=o35';
import { instSet } from './decor.js?v=o35';

function stripeTex(c1, c2, n = 8) { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const x = cv.getContext('2d'); x.fillStyle = c1; x.fillRect(0, 0, 64, 256);
  for (let i = 0; i < n * 3; i++) { x.fillStyle = c2; x.globalAlpha = rnd(.25, .7); x.fillRect(rnd(0, 60), rnd(0, 256), rnd(2, 6), rnd(10, 40)); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }
function inst(scene, geo, mat, items, colors) { const im = new THREE.InstancedMesh(geo, mat, items.length), o = new THREE.Object3D(), c = new THREE.Color();
  items.forEach((it, i) => { o.position.set(it.x, it.y, it.z); o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0); o.scale.set(it.sx ?? it.s, it.sy ?? it.s, it.sz ?? it.s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (colors) im.setColorAt(i, c.set(colors[i % colors.length])); });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false; scene.add(im); return im; }

export function jungle(E, { NV, GAP, SP, PY }) {
  const sc = E.scene, Z0 = 14, Z1 = -NV * GAP - 34, LEN = Z0 - Z1, zc = (Z0 + Z1) / 2, lo = innerWidth * innerHeight < 500000;
  sc.fog = new THREE.Fog('#9fd89a', 16, 78); sc.background = new THREE.Color('#9fd89a');
  // suelo: hierba a los lados, barro bajo las lianas, orillas
  mesh(new THREE.PlaneGeometry(120, LEN + 40), toon('#5fbf4f', { rim: 0 }), sc, [0, .005, zc], [-Math.PI / 2, 0, 0]);
  // río a la izquierda (con corriente animada) y orilla de piedras
  const wt = stripeTex('#4ab8e0', '#e8fbff'); wt.repeat.set(1, LEN / 12);
  const river = mesh(new THREE.PlaneGeometry(5, LEN + 20), new THREE.MeshBasicMaterial({ map: wt, transparent: true, opacity: .92 }), sc, [-15.5, .04, zc], [-Math.PI / 2, 0, 0]);
  const rocks = []; for (let z = Z0; z > Z1; z -= 2.2) for (const x of [-12.7, -18.3]) rocks.push({ x: x + rnd(-.3, .3), y: .15, z: z + rnd(-.6, .6), s: rnd(.35, .7), sy: rnd(.25, .45), ry: rnd(0, 6) });
  inst(sc, SPHL(), toon('#9a9aa8', { rim: .3 }), rocks);
  // cascada al fondo, detrás de la meta: acantilado + agua que cae + espuma
  const cz = Z1 - 6, ft = stripeTex('#7ad4f4', '#ffffff', 14); ft.repeat.set(2, 1.5);
  mesh(new THREE.BoxGeometry(70, 26, 6), toon('#6a7a5a', { rim: .2 }), sc, [0, 13, cz - 3]);
  for (let i = 0; i < 14; i++) mesh(SPH(), toon(pick(['#3f9a3a', '#4fb046', '#358a33']), { rim: .3 }), sc, [rnd(-34, 34), 26 + rnd(-1, 2), cz - 3 + rnd(-2, 2)], null, [rnd(3, 6), rnd(2, 3.5), rnd(3, 5)]);
  const fall = mesh(new THREE.PlaneGeometry(9, 26), new THREE.MeshBasicMaterial({ map: ft, transparent: true, opacity: .95, fog: false }), sc, [-15.5, 13, cz + .05]);
  const foam = []; for (let i = 0; i < 16; i++) foam.push({ x: -15.5 + rnd(-4.5, 4.5), y: .3, z: cz + 1 + rnd(0, 2.5), s: rnd(.5, 1.1), sy: rnd(.3, .6) });
  inst(sc, SPHL(), toon('#ffffff', { rim: .6 }), foam);
  mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshBasicMaterial({ map: wt, transparent: true, opacity: .9 }), sc, [-15.5, .045, cz + 2], [-Math.PI / 2, 0, 0]);
  // árboles en capas (cerca → lejos, cada vez más grandes), helechos, setas y flores
  const near = [], far = [], palms = [];
  for (let z = Z0; z > Z1 - 4; z -= 5.5) {
    for (const s of [-1, 1]) {
      const xs = s < 0 ? [-21, -28, -38] : [13.5, 20, 28, 38];
      xs.forEach((x, l) => { const it = { x: x + rnd(-1.5, 1.5) * s, y: 0, z: z + rnd(-2, 2), s: 1.4 + l * .55 + rnd(0, .4), ry: rnd(0, 6), anim: 'sway', ph: rnd(0, 6) }; (l === 0 ? near : (l % 2 ? palms : far)).push(it); });
    }
  }
  const sets = [instSet(sc, 'arbol', near), instSet(sc, 'arbol', far), instSet(sc, 'palmera', palms)];
  const ferns = [], fl = [], shrooms = [];
  for (let i = 0; i < (lo ? 90 : 150); i++) { const x = pick([-1, 1]) * rnd(10.8, 24), z = rnd(Z1, Z0); if (x < -12 && x > -19) continue; const h = rnd(.8, 1.8); ferns.push({ x, y: h / 2, z, s: 1, sx: rnd(.6, 1.2), sy: h, sz: rnd(.6, 1.2), ry: rnd(0, 6) }); }
  inst(sc, new THREE.ConeGeometry(1, 1, 6), toon('#3fae4a', { rim: .4 }), ferns, ['#3fae4a', '#4fc25a', '#2f9a3f']);
  for (let i = 0; i < (lo ? 110 : 180); i++) { const x = pick([-1, 1]) * rnd(10.6, 22), z = rnd(Z1, Z0); if (x < -12.4 && x > -18.6) continue; fl.push({ x, y: .28, z, s: rnd(.13, .22) }); }
  inst(sc, SPHL(), toon('#ffffff', { rim: .5 }), fl, ['#ff6fae', '#ffe27a', '#ff9a5a', '#c9a2ff', '#ffffff', '#ff4f6f']);
  for (let i = 0; i < 26; i++) shrooms.push({ x: pick([-1, 1]) * rnd(12.5, 22), y: 0, z: rnd(Z1, Z0), s: rnd(.22, .4), ry: rnd(0, 6) });
  instSet(sc, 'hongo', shrooms.filter(s => !(s.x < -12.4 && s.x > -18.6)));
  // copa de la selva por encima (techo verde) y lianas decorativas colgando
  const canopy = []; for (let z = Z0; z > Z1; z -= 4) for (const x of [-26, -16, 16, 26]) canopy.push({ x: x + rnd(-3, 3), y: rnd(15, 19), z: z + rnd(-2, 2), s: 1, sx: rnd(5, 8), sy: rnd(2, 3.2), sz: rnd(4, 6) });
  inst(sc, SPHL(), toon('#3a9a3a', { rim: .25 }), canopy, ['#3a9a3a', '#47ad42', '#2f8a34']);
  const hv = []; for (let i = 0; i < (lo ? 40 : 70); i++) { const x = pick([-1, 1]) * rnd(11.5, 22), h = rnd(5, 11); hv.push({ x, y: 17 - h / 2, z: rnd(Z1, Z0), s: 1, sx: .06, sy: h, sz: .06 }); }
  inst(sc, CYL(), toon('#3d8a2f', { rim: .3 }), hv);
  // rayos de luz filtrada (aditivos, sin niebla)
  const rayM = new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rays = []; for (let i = 0; i < 9; i++) { const r = mesh(new THREE.CylinderGeometry(.6, 2.4, 22, 10, 1, true), rayM.clone(), sc, [rnd(-14, 14), 11, rnd(Z1 + 10, Z0 - 6)], [.25, 0, rnd(-.3, .3)]); r.userData.ph = rnd(0, 6); rays.push(r); }
  // mariposas y pájaros
  const wingG = new THREE.PlaneGeometry(.32, .24); wingG.translate(.16, 0, 0);
  const flies = []; for (let i = 0; i < (lo ? 10 : 18); i++) { const g = new THREE.Group(), m = toon(pick(['#ff9cc8', '#ffe27a', '#8fd0ff', '#c9a2ff']), { rim: .5 }); m.side = THREE.DoubleSide;
    const a = new THREE.Mesh(wingG, m), b = new THREE.Mesh(wingG, m); b.scale.x = -1; g.add(a, b); g.userData = { a, b, cx: pick([-1, 1]) * rnd(4, 13), cy: rnd(1.5, 6), cz: rnd(Z1 + 6, Z0), r: rnd(1, 2.5), sp: rnd(.5, 1.1), ph: rnd(0, 6) }; sc.add(g); flies.push(g); }
  const birdG = new THREE.PlaneGeometry(.9, .3); birdG.translate(.45, 0, 0);
  const birds = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(), m = toon(pick(['#ff5a5a', '#3ab0ff', '#ffd030']), { rim: .4 }); m.side = THREE.DoubleSide;
    const body = mesh(SPHL(), m, g, [0, 0, 0], null, [.22, .2, .45]); const a = new THREE.Mesh(birdG, m), b = new THREE.Mesh(birdG, m); b.scale.x = -1; g.add(a, b);
    g.userData = { a, b, cx: rnd(-10, 10), cz: rnd(Z1 + 10, Z0 - 10), r: rnd(6, 12), y: rnd(12, 15), sp: rnd(.25, .45) * pick([-1, 1]), ph: rnd(0, 6) }; sc.add(g); birds.push(g); }
  // hojas que caen (ambiente) — un solo Points
  const NL = lo ? 70 : 120, lp = new Float32Array(NL * 3); for (let i = 0; i < NL; i++) { lp[i * 3] = rnd(-16, 16); lp[i * 3 + 1] = rnd(0, 16); lp[i * 3 + 2] = rnd(Z1, Z0); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const leafPts = new THREE.Points(lg, new THREE.PointsMaterial({ color: '#7ad85a', size: .22, transparent: true, opacity: .9 })); sc.add(leafPts);
  return {
    tick(t, dt) {
      wt.offset.y -= dt * .35; ft.offset.y += dt * 1.4;
      for (const s of sets) s.tick(t);
      for (const r of rays) r.material.opacity = .07 + .05 * Math.sin(t * .6 + r.userData.ph);
      for (const g of flies) { const u = g.userData, k = t * u.sp + u.ph; g.position.set(u.cx + Math.cos(k) * u.r, u.cy + Math.sin(k * 2.3) * .6, u.cz + Math.sin(k) * u.r); g.rotation.y = -k; const f = Math.sin(t * 18 + u.ph) * 1.1; u.a.rotation.y = f; u.b.rotation.y = -f; }
      for (const g of birds) { const u = g.userData, k = t * u.sp + u.ph; g.position.set(u.cx + Math.cos(k) * u.r, u.y + Math.sin(t * 1.5 + u.ph) * .4, u.cz + Math.sin(k) * u.r); g.rotation.y = -k + (u.sp > 0 ? 0 : Math.PI); const f = Math.sin(t * 7 + u.ph) * .7; u.a.rotation.z = f; u.b.rotation.z = -f; }
      for (let i = 0; i < NL; i++) { let y = lp[i * 3 + 1] - dt * (.6 + (i % 5) * .15); if (y < .05) y = 16; lp[i * 3 + 1] = y; lp[i * 3] += Math.sin(t * 1.3 + i) * dt * .5; }
      lg.attributes.position.needsUpdate = true;
    },
  };
}
