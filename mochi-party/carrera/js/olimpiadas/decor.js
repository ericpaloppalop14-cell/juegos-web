// ======================================================================
//  MOCHI PARTY · OLIMPIADAS — decorado rico e instanciado (una llamada de dibujo por tipo de objeto)
//  Cada objeto del decorado se funde en una sola geometría con colores por vértice y se pinta con
//  InstancedMesh: cientos de piezas animadas con muy poco coste en el móvil.
// ======================================================================
import { THREE, toon, mesh, glowSprite, rnd, pick } from '../core3d.js?v=o39';
import { prop } from './mundos.js?v=o39';

const merged = {};
// funde un objeto (grupo de mallas) en una geometría con color por vértice; sin contornos ni sprites
export function mergedGeo(kind) {
  if (merged[kind]) return merged[kind];
  const g = prop(kind); g.updateMatrixWorld(true);
  const pos = [], nor = [], col = []; const c = new THREE.Color();
  g.traverse(o => {
    if (!o.isMesh || !o.geometry || (o.material && o.material.side === THREE.BackSide)) return;
    let ge = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); ge.applyMatrix4(o.matrixWorld);
    if (!ge.attributes.normal) ge.computeVertexNormals();
    const P = ge.attributes.position, N = ge.attributes.normal; c.copy(o.material.color || new THREE.Color('#fff'));
    if (o.material.emissive && o.material.emissiveIntensity) c.add(o.material.emissive.clone().multiplyScalar(Math.min(.6, o.material.emissiveIntensity * .5)));
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); col.push(c.r, c.g, c.b); }
  });
  const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); ge.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // todo apoyado en el suelo: nada se hunde (los objetos centrados en el origen se suben)
  ge.computeBoundingBox(); if (ge.boundingBox.min.y < 0) ge.translate(0, -ge.boundingBox.min.y, 0);
  ge.computeBoundingSphere(); return merged[kind] = ge;
}
const VC = () => toon('#ffffff', { vc: true, rim: .35 });

// conjunto instanciado de un tipo: items [{x,y,z,s,ry,anim,ph}]
export function instSet(scene, kind, items) {
  const im = new THREE.InstancedMesh(mergedGeo(kind), VC(), items.length); im.frustumCulled = false;
  const o = new THREE.Object3D(); const animd = [];
  items.forEach((it, i) => { o.position.set(it.x, it.y || 0, it.z); o.rotation.set(it.rx || 0, it.ry || 0, 0); o.scale.setScalar(it.s || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (it.anim) animd.push(i); });
  im.instanceMatrix.needsUpdate = true; scene.add(im);
  return { im, items, animd, o, kind,
    tick(t) { if (!animd.length) return; for (const i of animd) { const it = items[i]; const k = it.anim;
        if (k === 'float') o.position.set(it.x, (it.y || 0) + Math.sin(t * (it.sp || 1) + it.ph) * (it.amp || .5), it.z), o.rotation.set(0, (it.ry || 0) + t * .3, 0);
        else if (k === 'sway') o.position.set(it.x, it.y || 0, it.z), o.rotation.set(Math.sin(t * 1.3 + it.ph) * .06, it.ry || 0, Math.sin(t * 1.1 + it.ph) * .08);
        else if (k === 'hop') o.position.set(it.x, (it.y || 0) + Math.abs(Math.sin(t * (it.sp || 3) + it.ph)) * (it.amp || .6), it.z), o.rotation.set(0, it.ry || 0, 0);
        else if (k === 'spin') o.position.set(it.x, it.y || 0, it.z), o.rotation.set(0, t * (it.sp || 1) + it.ph, 0);
        else if (k === 'drift') { let x = it.x + t * (it.sp || 2); x = ((x + 260) % 520 + 520) % 520 - 260; o.position.set(x, it.y, it.z); o.rotation.set(0, it.ry || 0, 0); }
        else if (k === 'orbit') { const a = t * (it.sp || .2) + it.ph; o.position.set(it.x + Math.cos(a) * it.r, it.y + Math.sin(a * 1.3) * 2, it.z + Math.sin(a) * it.r); o.rotation.set(0, -a, 0); }
        o.scale.setScalar(it.s || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
      im.instanceMatrix.needsUpdate = true; } };
}

// ---------------- recetas de decorado por mundo ----------------
// near: objetos junto a la pista/arena; far: grandes al fondo; sky: lo que flota o vuela; fill: detallitos del suelo
const RECIPES = {
  espacio: { near: ['cristal', 'cohete', 'ovni', 'planeta'], far: ['planeta', 'volcancito'], fill: ['cristal', 'meteoro'], sky: ['ovni', 'planeta', 'estrella', 'meteoro'], cloud: null, skyAnim: 'orbit' },
  desierto: { near: ['cactus', 'palmera', 'piramide', 'camello'], far: ['piramide', 'piramide', 'palmera'], fill: ['cactus', 'rodadora'], sky: ['nube'], cloud: 'nube', walk: 'camello' },
  nieve: { near: ['pino', 'muneco', 'iglu', 'pinguino'], far: ['pino', 'iglu', 'hielo'], fill: ['hielo', 'copo'], sky: ['nube', 'copo'], cloud: 'nube', walk: 'pinguino' },
  mar: { near: ['coral', 'medusa', 'pez', 'cangrejo', 'erizo'], far: ['ballena', 'coral'], fill: ['coral', 'erizo', 'burbuja'], sky: ['pez', 'medusa', 'burbuja', 'ballena'], cloud: null, swim: true },
  selva: { near: ['arbol', 'palmera', 'totem', 'hongo', 'rana'], far: ['arbol', 'arbol', 'palmera'], fill: ['seta', 'pina', 'rana'], sky: ['mariposa', 'nube', 'mono'], cloud: 'nube', walk: 'rana' },
  dulces: { near: ['piruleta', 'cupcake', 'bastón', 'donut', 'osito'], far: ['piruleta', 'tarta', 'cupcake'], fill: ['caramelo', 'osito', 'vela'], sky: ['donut', 'caramelo', 'nube'], cloud: 'nube', walk: 'osito' },
  suenos: { near: ['luna', 'reloj', 'almohada', 'oveja', 'nube'], far: ['nube', 'luna'], fill: ['estrella', 'almohada'], sky: ['oveja', 'reloj', 'estrella', 'nube', 'mariposa'], cloud: 'nube', walk: 'oveja' },
  volcan: { near: ['volcancito', 'roca', 'cristal', 'huevo'], far: ['volcancito', 'volcancito', 'roca'], fill: ['roca', 'cristal', 'chile'], sky: ['bolafuego', 'dragon'], cloud: null, walk: 'huevo' },
};

// decora el mundo. area: {track:{z0,z1,half}} o {arena:{r}}. Devuelve {tick(t)}
export function richDecor(scene, mk, area, M) {
  const R = RECIPES[mk]; const sets = []; const by = {};
  const add = (kind, it) => (by[kind] = by[kind] || []).push(it);
  const rnd0 = () => Math.random();
  const ring = (x, z) => true;
  if (area.track) { const { z0, z1, half } = area.track;
    for (let z = z0; z > z1; z -= rnd(3.2, 5)) for (const s of [-1, 1]) {
      add(pick(R.near), { x: s * (half + rnd(2.5, 7)), z: z + rnd(-1.5, 1.5), s: rnd(.8, 1.5), ry: rnd(0, 6.28), anim: rnd0() < .5 ? 'sway' : null, ph: rnd(0, 6) });
      add(pick(R.fill), { x: s * (half + rnd(1, 18)), z: z + rnd(-2, 2), s: rnd(.35, .7), ry: rnd(0, 6.28) });
      if (rnd0() < .45) add(pick(R.far), { x: s * (half + rnd(16, 45)), z: z + rnd(-4, 4), s: rnd(2.2, 4.5), ry: rnd(0, 6.28) });
      if (R.walk && rnd0() < .12) add(R.walk, { x: s * (half + rnd(4, 12)), z, s: rnd(.7, 1.1), ry: s > 0 ? -1.57 : 1.57, anim: 'hop', sp: rnd(3, 5), amp: .35, ph: rnd(0, 6) });
    }
    for (let i = 0; i < 70; i++) add(pick(R.sky), { x: rnd(-90, 90), y: rnd(12, 40), z: rnd(z1 - 40, z0 + 20), s: rnd(1.2, 3), ry: rnd(0, 6.28), anim: 'float', sp: rnd(.5, 1.2), amp: rnd(.6, 1.6), ph: rnd(0, 6) });
  }
  if (area.arena) { const r = area.arena.r;
    for (let i = 0; i < 70; i++) { const a = rnd(0, 6.28), d = r + rnd(3, 14); add(pick(R.near), { x: Math.cos(a) * d, z: Math.sin(a) * d, s: rnd(.9, 1.7), ry: rnd(0, 6.28), anim: rnd0() < .5 ? 'sway' : null, ph: rnd(0, 6) }); }
    for (let i = 0; i < 120; i++) { const a = rnd(0, 6.28), d = r + rnd(1.5, 24); add(pick(R.fill), { x: Math.cos(a) * d, z: Math.sin(a) * d, s: rnd(.35, .8), ry: rnd(0, 6.28) }); }
    for (let i = 0; i < 30; i++) { const a = rnd(0, 6.28), d = r + rnd(22, 60); add(pick(R.far), { x: Math.cos(a) * d, z: Math.sin(a) * d, s: rnd(2.5, 5), ry: rnd(0, 6.28) }); }
    if (R.walk) for (let i = 0; i < 10; i++) { const a = rnd(0, 6.28), d = r + rnd(4, 10); add(R.walk, { x: Math.cos(a) * d, z: Math.sin(a) * d, s: rnd(.7, 1.1), ry: rnd(0, 6.28), anim: 'hop', sp: rnd(3, 5), amp: .35, ph: rnd(0, 6) }); }
    for (let i = 0; i < 40; i++) { const a = rnd(0, 6.28), d = r + rnd(10, 55); add(pick(R.sky), { x: Math.cos(a) * d, y: rnd(12, 34), z: Math.sin(a) * d - 15, s: rnd(1.2, 3), ry: rnd(0, 6.28), anim: 'float', sp: rnd(.5, 1.2), amp: rnd(.6, 1.6), ph: rnd(0, 6) }); }
  }
  // nubes opacas instanciadas que derivan despacio (antes eran transparentes y parpadeaban)
  if (R.cloud) for (let i = 0; i < 26; i++) add('nubeLejos', { x: rnd(-240, 240), y: rnd(45, 85), z: rnd(-260, -60), s: rnd(5, 11), anim: 'drift', sp: rnd(1, 3) });
  // en el espacio y en el mar los objetos del cielo orbitan / nadan
  for (const k in by) sets.push(instSet(scene, k, by[k].map(it => (R.skyAnim === 'orbit' && it.anim === 'float' && it.y > 10 && !area.arena) ? { ...it, anim: 'orbit', r: rnd(6, 20), sp: rnd(.05, .15) } : it)));
  // estrellas o motas brillantes
  const n = 500, P = new Float32Array(n * 3); for (let i = 0; i < n; i++) { P[i * 3] = rnd(-200, 200); P[i * 3 + 1] = rnd(30, 160); P[i * 3 + 2] = rnd(-320, 60); }
  let stars = null; if (mk === 'espacio' || mk === 'suenos' || mk === 'volcan') { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(P, 3)); stars = new THREE.Points(gg, new THREE.PointsMaterial({ color: mk === 'volcan' ? '#ffb070' : '#ffffff', size: 1.4, sizeAttenuation: true, fog: false, transparent: true, opacity: .9, depthWrite: false })); stars.frustumCulled = false; scene.add(stars); }
  // astro (sol/luna/planeta gigante) con halo
  const astro = new THREE.Group(); astro.position.set(60, 70, -230); scene.add(astro);
  const ac = { espacio: '#ff9cf0', desierto: '#ffd36b', nieve: '#fff4c0', mar: '#bff4ff', selva: '#ffe27a', dulces: '#ffd36b', suenos: '#fff0b0', volcan: '#ff6a2a' }[mk];
  const am = toon(ac, { emissive: ac, ei: .8, rim: .2 }); am.fog = false; mesh(new THREE.SphereGeometry(16, 32, 20), am, astro); const halo = glowSprite(ac, 90, .55); astro.add(halo);
  const clouds = sets.find(s => s.kind === 'nubeLejos');
  return { sets, stars, astro, tick(t, camZ = 0) { for (const s of sets) s.tick(t); if (clouds) clouds.im.position.z = camZ * .9; // las nubes lejanas acompañan a la cámara (parallax): nunca saltan ni se cruzan de golpe
    astro.rotation.y = t * .05; halo.material.opacity = .45 + Math.sin(t * .8) * .1; if (stars) stars.rotation.y = t * .004; } };
}
