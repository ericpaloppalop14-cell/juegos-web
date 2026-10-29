// MOCHI PARTY · accesorios locos de cada personaje (o39). Solo se montan en los personajes con id (los peatones van sin ellos).
// Cada accesorio es de verdad 3D (con volumen, brillos y animación) y se mueve con animCharacter().
export function crazyAccessories(ch, root, ud, H) {
  const { toon, mesh, outline, sph, cyl, cone, box, tor, geo, col, hex, glowTex, THREE, onBody, bodyR } = H;
  const yAt = r => { let y = 1.62; while (y > .3 && bodyR(y) < r) y -= .01; return y; };
  const fx = f => ud.fx.push(f);
  const OLC = '#4a2a5e';
  const glow = (c, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.scale.setScalar(s); return sp; };
  const symTex = {}; const sym = (ch2, color, px = 64) => { const k = ch2 + color; if (symTex[k]) return symTex[k]; const cv = document.createElement('canvas'); cv.width = cv.height = px; const x = cv.getContext('2d'); x.font = `700 ${px * .78}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = color; x.shadowBlur = 8; x.fillStyle = color; x.fillText(ch2, px / 2, px / 2 + 3); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return symTex[k] = t; };
  const symSprite = (c, color, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sym(c, color), transparent: true, depthWrite: false })); sp.scale.setScalar(s); return sp; };
  const starG = (r1, r2, n, depth) => geo('st' + r1 + r2 + n + depth, () => { const s = new THREE.Shape(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = i / (n * 2) * Math.PI * 2 + Math.PI / 2; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: r2 * .12, bevelThickness: depth * .5, bevelSegments: 1 }); g.translate(0, 0, -depth / 2); return g; });
  const flowerG = () => geo('flower', () => { const s = new THREE.Shape(), n = 5; for (let i = 0; i <= n * 8; i++) { const a = i / (n * 8) * Math.PI * 2, r = .5 + .5 * Math.abs(Math.cos(a * n / 2)) ** .8 * .9; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const g = new THREE.ExtrudeGeometry(s, { depth: .08, bevelEnabled: true, bevelSize: .05, bevelThickness: .04, bevelSegments: 1 }); g.translate(0, 0, -.04); return g; });
  const boltG = () => geo('bolt', () => { const s = new THREE.Shape(); [[.15, .5], [-.12, .04], [.03, .04], [-.15, -.5], [.14, -.06], [-.02, -.06]].forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: .06, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 1 }); g.translate(0, 0, -.03); return g; });
  const gl = (c, e = .6) => toon(c, { emissive: c, ei: e, rim: 0 });
  const casters = ud.casters;
  const id = ch.id;
  if (id === 'mochi') {
    // corona de flores, lazo de lunares, mariposa y estrellitas
    const cr = new THREE.Group(); cr.position.set(0, yAt(.5) + .03, 0); cr.rotation.x = -.12; root.add(cr);
    const cols = ['#ffffff', '#ffe27a', '#bff0ff', '#ff7fb6', '#ffffff', '#ffe27a', '#ffb7e0'];
    for (let i = 0; i < 7; i++) { const a = -Math.PI * .85 + i / 6 * Math.PI * 1.7, f = new THREE.Group(); f.position.set(Math.sin(a) * .56, .04 * Math.cos(i * 2), Math.cos(a) * .56); f.lookAt(f.position.x * 3, f.position.y + .6, f.position.z * 3); cr.add(f);
      mesh(flowerG(), toon(cols[i], { rim: .4 }), f, null, null, .2); mesh(sph(8), toon(i % 2 ? '#ff9a3c' : '#ffd23a', { rim: 0 }), f, [0, 0, .07], null, .065); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; mesh(sph(6), toon('#5fd08a', { rim: 0 }), cr, [Math.sin(a) * .54, -.02, Math.cos(a) * .54], null, [.07, .04, .1]); }
    const bow = new THREE.Group(); bow.position.set(-.5, 1.62, .1); bow.rotation.z = .5; root.add(bow); const bm = toon('#ff5fa0', { rim: .6 });
    for (const s of [-1, 1]) { const w = mesh(sph(14), bm, bow, [s * .2, 0, 0], [0, 0, s * .3], [.22, .15, .08]); outline(w, '#a02a60', 1.07); for (let k = 0; k < 3; k++) mesh(sph(5), toon('#ffffff', { rim: 0 }), w, [(k - 1) * .35, ((k * 7) % 3 - 1) * .2, .9], null, .17); }
    mesh(sph(10), bm, bow, null, null, [.09, .09, .1]);
    const bf = new THREE.Group(); root.add(bf); const wm = toon('#ffb7e0', { side: THREE.DoubleSide, rim: .2, emissive: '#ff8fc0', ei: .35 }), wings = [];
    for (const s of [-1, 1]) { const w = mesh(starG(.5, .34, 4, .02), wm, bf, [s * .12, 0, 0], null, .22); w.rotation.set(0, 0, s * .6); wings.push(w); } mesh(cyl(6), toon('#5a3a6e', { rim: 0 }), bf, null, [Math.PI / 2, 0, 0], [.025, .24, .025]);
    fx(t => { const a = t * .9, r = 1.35; bf.position.set(Math.sin(a) * r, 1.3 + Math.sin(t * 2.4) * .22, Math.cos(a) * r * .9); bf.rotation.y = a + Math.PI / 2; wings.forEach((w, i) => w.rotation.y = (i ? 1 : -1) * (.2 + Math.abs(Math.sin(t * 16)) * 1.0)); });
    for (let i = 0; i < 3; i++) { const s = glow('#fff6c8', .3); root.add(s); fx(t => { const a = t * .7 + i * 2.1; s.position.set(Math.sin(a) * 1.25, .6 + i * .45 + Math.sin(t * 2 + i) * .1, Math.cos(a) * 1.1); s.material.opacity = .4 + .6 * Math.abs(Math.sin(t * 3 + i)); }); }
  }
  if (id === 'tiovivo') {
    // luces de feria alrededor, pajarita y manojo de globos
    const bulbs = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, p = onBody(.33, a, 1.0), b = mesh(sph(8), toon('#fff3b0', { emissive: '#ffe27a', ei: .8, rim: 0 }), root, [p[0] * 1.02, p[1], p[2] * 1.02], null, .075); bulbs.push(b); }
    fx(t => bulbs.forEach((b, i) => { const on = (i + Math.floor(t * 5)) % 3; b.material = on ? bulbFx.a : bulbFx.b; }));
    const bulbFx = { a: toon('#fff3b0', { emissive: '#ffe27a', ei: .9, rim: 0 }), b: toon('#ff7fbf', { emissive: '#ff4fa0', ei: .9, rim: 0 }) };
    const bt = new THREE.Group(); bt.position.set(0, .42, 1.0); root.add(bt); const bm = toon('#ff4f8f', { rim: .6 });
    for (const s of [-1, 1]) { const w = mesh(cone(3), bm, bt, [s * .17, 0, 0], [0, 0, -s * Math.PI / 2], [.15, .3, .08]); outline(w, '#9a2050', 1.07); } mesh(sph(10), bm, bt, null, null, .09);
    const bal = new THREE.Group(); bal.position.set(.95, .62, .05); root.add(bal);
    [['#ff6fae', -.3, 1.7], ['#ffd84a', .1, 2.0], ['#7ee3c4', .4, 1.55]].forEach(([c, x, h], i) => { const g = new THREE.Group(); g.position.set(0, 0, 0); bal.add(g);
      mesh(cyl(4), toon('#ffffff', { rim: 0 }), g, [x * .5, h * .5 * .85, 0], [0, 0, -x * .25], [.008, h * .85, .008]); const b = mesh(sph(16), toon(c, { opacity: .92, rim: .8, emissive: c, ei: .12 }), g, [x, h * .88 + .38, 0], null, [.33, .4, .33]); b.renderOrder = 3; outline(b, '#802a5a', 1.04); mesh(cone(6), toon(c, { rim: 0 }), g, [x, h * .88 - .05, 0], [Math.PI, 0, 0], [.07, .1, .07]);
      g.userData.ph = i; });
    fx(t => bal.children.forEach((g, i) => { g.rotation.z = Math.sin(t * 1.6 + i * 1.7) * .1; g.rotation.x = Math.sin(t * 1.3 + i) * .06; }));
  }
  if (id === 'atomo') {
    // gafas de laboratorio, órbita de electrones, rayos y chispas
    const gg = new THREE.Group(); const gp = onBody(1.12, 0, 1.0); gg.position.set(gp[0], gp[1], gp[2] - .02); gg.rotation.x = -.5; root.add(gg);
    const fm = toon('#3a4a7a', { rim: .6 }), lm = toon('#bfe8ff', { opacity: .55, rim: .9, emissive: '#7fd0ff', ei: .25 });
    for (const s of [-1, 1]) { mesh(tor(.16, 22), fm, gg, [s * .25, 0, 0], null, [.2, .2, .2]); const l = mesh(cyl(20), lm, gg, [s * .25, 0, -.01], [Math.PI / 2, 0, 0], [.2, .05, .2]); l.renderOrder = 3; mesh(sph(8), toon('#ffffff', { rim: 0 }), gg, [s * .25 + .06, .06, .06], null, [.04, .02, .01]); }
    mesh(box(), fm, gg, [0, 0, 0], null, [.14, .05, .05]); mesh(tor(.05, 30), toon('#ff7fb0', { rim: .4 }), root, [0, 1.12, 0], [Math.PI / 2 - .5, 0, 0], [.75, .75, .55]);
    const orb = new THREE.Group(); orb.position.y = 1.0; root.add(orb); const rm = toon('#ffffff', { emissive: '#bff', ei: .4, rim: 0 }), els = [];
    for (let i = 0; i < 2; i++) { const o = new THREE.Group(); o.rotation.set(1.2, i * 1.5, 0); orb.add(o); mesh(tor(.012, 60), rm, o, null, null, 1.55); const e = mesh(sph(10), gl('#7ff5ff', .9), o, [1.55, 0, 0], null, .09); e.add(glow('#7ff5ff', 7)); els.push(o); }
    fx(t => { els.forEach((o, i) => o.rotation.z = t * (2 + i * .8)); });
    for (const s of [-1, 1]) { const b = mesh(boltG(), gl('#ffe84a', .9), root, [s * 1.35, 1.3, 0], [0, 0, s * .25], .75); casters; fx(t => { b.visible = (t * 3 + s) % 1.3 < .95; b.scale.setScalar(.7 + Math.sin(t * 9 + s) * .08); }); }
    for (let i = 0; i < 4; i++) { const s = glow('#9ff', .22); root.add(s); fx(t => { const a = t * 2 + i * 1.57, r = 1.1 + Math.sin(t * 5 + i) * .1; s.position.set(Math.sin(a) * r, 1.9 + Math.sin(t * 4 + i) * .1, Math.cos(a) * r * .5); s.material.opacity = (Math.sin(t * 17 + i * 3) > 0) ? 1 : .15; }); }
  }
  if (id === 'cosmo') {
    // tiara de estrellas, capa estelar, luna y planetas en órbita
    const ti = new THREE.Group(); ti.position.set(0, yAt(.55) + .04, .02); ti.rotation.x = -.3; root.add(ti);
    for (let i = 0; i < 5; i++) { const a = (i - 2) / 2 * 1.1, h = 1 - Math.abs(i - 2) * .22; mesh(starG(.16 * h + .05, .07 * h + .03, 5, .06), toon(i === 2 ? '#fff27a' : '#ffd84a', { emissive: '#ffb830', ei: .6, rim: .6 }), ti, [Math.sin(a) * .6, Math.abs(i - 2) * -.05 + .08, Math.cos(a) * .6], [0, a, 0]); }
    mesh(tor(.03, 40), toon('#ffd84a', { emissive: '#ffb830', ei: .4, rim: .6 }), ti, [0, 0, 0], [Math.PI / 2, 0, 0], [.6, .6, .9]);
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.55, 14, 10), toon('#4a2f9a', { side: THREE.DoubleSide, rim: .5, emissive: '#2a1070', ei: .5 })); cp.position.set(0, .95, -.75); cp.rotation.x = -.12; root.add(cp);
    { const pa = cp.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.array[i * 3] *= .55 + .45 * (.775 - pa.array[i * 3 + 1]) / 1.55; pa.needsUpdate = true; }
    const base = cp.geometry.attributes.position.array.slice();
    for (let i = 0; i < 14; i++) { const s = mesh(starG(.5, .22, 4, .1), toon('#ffffff', { emissive: '#fff', ei: .9, rim: 0, side: THREE.DoubleSide }), cp, [((i * .37) % 1 - .5) * 1.4, ((i * .61) % 1 - .5) * 1.2, .01], null, .055 + (i % 3) * .015); }
    fx(t => { const a = cp.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], dn = (.775 - y) / 1.55; a.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(x * 4 + t * 3 + dn * 5) * .09 * dn - dn * .3 * dn; } a.needsUpdate = true; cp.geometry.computeVertexNormals(); });
    const orb = new THREE.Group(); orb.position.y = 1.0; root.add(orb);
    [['#e8e8ff', .13, 1.5, 0, 1.6], ['#ff9f7f', .1, 1.75, 2.1, -1.2], ['#7fd0ff', .08, 1.35, 4.2, 2.2]].forEach(([c, r, d, ph, sp], i) => { const p = mesh(sph(14), toon(c, { rim: .7, emissive: c, ei: .25 }), orb, null, null, r); if (i === 1) mesh(tor(.05, 24), toon('#ffe9a0', { rim: 0 }), p, null, [1.2, 0, .3], [1.9, 1.9, 1.9]); p.add(glow(c, r * 12, .5)); fx(t => { const a = t * sp * .6 + ph; p.position.set(Math.cos(a) * d, Math.sin(a * 1.3) * .35, Math.sin(a) * d * .6); }); });
  }
  if (id === 'copito') {
    // bufanda de rayas, nariz de zanahoria, copos y manoplas
    const sc = toon('#ff5a7a', { rim: .6 }), sc2 = toon('#ffffff', { rim: .5 });
    const t0 = mesh(tor(.13, 40), sc, root, [0, .56, 0], [Math.PI / 2, 0, 0], [1.0, 1.0, 1.1]); outline(t0, '#7a2040', 1.04);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; mesh(box(), sc2, root, [Math.sin(a) * 1.02, .56, Math.cos(a) * 1.02], [0, a, 0], [.14, .2, .08]); }
    const tail = new THREE.Group(); tail.position.set(.55, .5, .93); root.add(tail); for (let i = 0; i < 4; i++) mesh(box(), i % 2 ? sc2 : sc, tail, [0, -.08 - i * .1, 0], null, [.2, .11, .06]); fx(t => { tail.rotation.z = Math.sin(t * 2.2) * .12; tail.rotation.x = Math.sin(t * 1.7) * .1; });
    const nose = mesh(cone(12), toon('#ff8a2a', { rim: .6 }), root, [0, .76, .97], [Math.PI / 2, 0, 0], [.07, .3, .07]); outline(nose, '#7a3a10', 1.1); for (let i = 0; i < 3; i++) mesh(tor(.08, 12), toon('#e86a10', { rim: 0 }), nose, [0, .1 - i * .22, 0], [Math.PI / 2, 0, 0], [1.05 - i * .2, 1.05 - i * .2, .6]);
    if (ud.arms.length) for (const a of ud.arms) mesh(sph(10), toon('#ff5a7a', { rim: .6 }), a, [a.userData.s * .21, -.3, .02], null, .17);
    for (let i = 0; i < 7; i++) { const s = symSprite('❄', '#d8f0ff', .3 + (i % 3) * .08); root.add(s); fx(t => { const a = t * .5 + i * .9, y = 2.3 - ((t * .25 + i * .15) % 1) * 2.2; s.position.set(Math.sin(a) * (1.15 + i % 3 * .15), y, Math.cos(a) * 1.0); s.material.rotation = t + i; }); }
  }
  if (id === 'burbuja') {
    // gafas de buceo con tubo, flotador de patito, patito en la cabeza y burbujas
    const gg = new THREE.Group(); const gp = onBody(1.18, 0, 1.0); gg.position.set(gp[0], gp[1], gp[2] - .04); gg.rotation.x = -.5; root.add(gg);
    mesh(tor(.2, 28), toon('#ff7a3a', { rim: .7 }), gg, null, null, [.55, .22, .3]); const gm = mesh(sph(16), toon('#bfeaff', { opacity: .5, rim: .9, emissive: '#6fd0ff', ei: .2 }), gg, [0, 0, -.01], null, [.52, .2, .08]); gm.renderOrder = 3;
    mesh(tor(.04, 30), toon('#2a4a7a', { rim: .3 }), root, [0, 1.15, 0], [Math.PI / 2 - .5, 0, 0], [.78, .78, .6]);
    const sn = new THREE.Group(); sn.position.set(.5, 1.25, .3); sn.rotation.set(-.2, 0, -.35); root.add(sn); mesh(cyl(10), toon('#ff7a3a', { rim: .6 }), sn, [0, .45, 0], null, [.05, .9, .05]); mesh(cyl(10), toon('#2a4a7a', { rim: .3 }), sn, [0, .95, 0], null, [.07, .12, .07]); mesh(cone(10), toon('#ffd23a', { rim: .5 }), sn, [0, 1.05, 0], null, [.08, .12, .08]);
    const fl = mesh(tor(.2, 40), toon('#ffd23a', { rim: .7 }), root, [0, .38, 0], [Math.PI / 2, 0, 0], [1.04, 1.04, 1]); outline(fl, '#a07010', 1.05); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; mesh(sph(8), toon('#ff7fb6', { rim: .5 }), root, [Math.sin(a) * 1.05, .38, Math.cos(a) * 1.05], null, [.09, .08, .1]); }
    const dk = new THREE.Group(); dk.position.set(0, 1.72, 0); root.add(dk); const ym = toon('#ffe14a', { rim: .8 });
    const db = mesh(sph(16), ym, dk, null, null, [.2, .15, .17]); outline(db, '#a08010', 1.07); mesh(sph(14), ym, dk, [.0, .17, .1], null, .12); mesh(cone(8), toon('#ff8a2a', { rim: .5 }), dk, [0, .16, .22], [Math.PI / 2, 0, 0], [.05, .1, .035]); for (const s of [-1, 1]) mesh(sph(6), toon('#2a1838', { rim: 0 }), dk, [s * .05, .21, .2], null, .02); fx(t => { dk.position.y = 1.72 + Math.sin(t * 3) * .03; dk.rotation.z = Math.sin(t * 2) * .12; });
    for (let i = 0; i < 7; i++) { const b = mesh(sph(10), toon('#ffffff', { opacity: .45, rim: .9 }), root, null, null, .06 + (i % 3) * .035); b.renderOrder = 3; fx(t => { const k = (t * .35 + i * .14) % 1; b.position.set(Math.sin(t * 2 + i * 2) * (.9 + k * .3), .3 + k * 2.2, Math.cos(i * 3 + t) * .6 + .3); b.scale.setScalar((.06 + (i % 3) * .035) * (1 - k * .3)); }); }
    for (let i = 0; i < 2; i++) { const f = new THREE.Group(); root.add(f); mesh(sph(12), toon(['#ff8a2a', '#ffb02a'][i], { rim: .6 }), f, null, null, [.16, .1, .06]); mesh(cone(4), toon(['#ff8a2a', '#ffb02a'][i], { rim: .5 }), f, [-.2, 0, 0], [0, 0, Math.PI / 2], [.08, .12, .02]); mesh(sph(6), toon('#2a1838', { rim: 0 }), f, [.08, .03, .05], null, .02); fx(t => { const a = t * 1.3 + i * 3.1; f.position.set(Math.cos(a) * 1.5, .7 + Math.sin(t * 2 + i) * .25 + i * .5, Math.sin(a) * 1.2); f.rotation.y = -a; }); }
  }
  if (id === 'lava') {
    // llamas en la cabeza, goteo de lava, cadena de oro y brasas
    const flm = [['#ff4a1a', .5], ['#ff8a2a', .42], ['#ffd23a', .3]].map(([c, s]) => [toon(c, { emissive: c, ei: .9, rim: 0 }), s]), fls = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, m = flm[i % 3]; const f = mesh(cone(10), m[0], root, [Math.sin(a) * .15, 1.98, Math.cos(a) * .15], null, [.13, m[1] + .1, .13]); f.geometry = f.geometry; fls.push([f, a]); }
    const ctr = mesh(cone(10), flm[2][0], root, [0, 2.0, 0], null, [.14, .65, .14]); fls.push([ctr, 0]);
    const hs = glow('#ff9a3a', 1.6, .6); hs.position.set(0, 2.05, 0); root.add(hs);
    fx(t => { fls.forEach(([f, a], i) => { const k = 1 + Math.sin(t * 11 + i * 1.7) * .22 + Math.sin(t * 7 + i) * .12; f.scale.y = (i === 7 ? .65 : .45 + (i % 3) * .08) * k + .1; f.position.y = 1.92 + f.scale.y * .5; f.rotation.z = Math.sin(t * 6 + i) * .18; f.rotation.x = Math.cos(t * 5 + i) * .18; }); hs.material.opacity = .45 + Math.sin(t * 9) * .15; });
    for (let i = 0; i < 4; i++) { const d = mesh(sph(10), toon('#ff7a2a', { emissive: '#ff5a1a', ei: .9, rim: 0 }), root, null, null, [.07, .11, .05]); const ph = i * 1.9; fx(t => { const k = (t * .3 + i * .27) % 1, y = 1.35 - k * 1.0, p = onBody(Math.max(.35, y), ph * .5 - .4, 1.01); d.position.set(...p); d.scale.set(.07 * (1 + k * .5), .11 * (1 + k * .3), .05); d.visible = Math.cos(ph * .5 - .4) > 0; }); }
    const ch2 = mesh(tor(.025, 40), toon('#ffd23a', { rim: .9, emissive: '#ffb020', ei: .3 }), root, [0, .55, 0], [Math.PI / 2 + .5, 0, 0], [.7, .7, 1]); mesh(cyl(18), toon('#ffd23a', { rim: .9 }), root, [0, .22, .8], [Math.PI / 2 - .4, 0, 0], [.14, .03, .14]); mesh(sph(8), gl('#ff5a1a', .9), root, [0, .22, .83], null, .06);
    for (let i = 0; i < 6; i++) { const s = glow('#ffb04a', .2); root.add(s); fx(t => { const k = (t * .5 + i * .17) % 1; s.position.set(Math.sin(i * 2.1 + t) * .5, 2.2 + k * 1.2, Math.cos(i * 1.3) * .3); s.material.opacity = 1 - k; s.scale.setScalar(.2 * (1 - k * .5)); }); }
  }
  if (id === 'tictac') {
    // chistera con reloj, monóculo con cadena, bigote, pajarita y reloj de bolsillo
    const hat = new THREE.Group(); hat.position.set(0, 1.62, 0); hat.rotation.z = -.14; root.add(hat); const hm = toon('#3a2a5e', { rim: .7 });
    const hb = mesh(cyl(28), hm, hat, [0, .3, 0], null, [.36, .6, .36]); outline(hb, '#150a2a', 1.04); mesh(cyl(28), hm, hat, [0, .02, 0], null, [.62, .05, .62]); mesh(cyl(28), toon('#d4382a', { rim: .6 }), hat, [0, .12, 0], null, [.375, .12, .375]);
    mesh(cyl(24), toon('#fff8e6', { rim: .4 }), hat, [0, .3, .33], [Math.PI / 2, 0, 0], [.13, .03, .13]); mesh(tor(.15, 20), toon('#e8bc52', { rim: .8 }), hat, [0, .3, .345], null, [.13, .13, .13]);
    const hands = new THREE.Group(); hands.position.set(0, .3, .36); hat.add(hands); mesh(box(), toon('#5a3a2a', { rim: 0 }), hands, [0, .04, 0], null, [.012, .08, .01]); const hh = mesh(box(), toon('#5a3a2a', { rim: 0 }), hands, [.03, 0, 0], null, [.06, .012, .01]); fx(t => { hands.rotation.z = -t * 1.2; });
    for (const [x, y, z] of [[.36, .86, .97]]) { const mo = new THREE.Group(); mo.position.set(x, y, z + .02); root.add(mo); mesh(tor(.07, 28), toon('#e8bc52', { rim: .9, emissive: '#b08a2a', ei: .25 }), mo, null, null, [.22, .22, .2]); const lens = mesh(cyl(20), toon('#e8f6ff', { opacity: .25, rim: .9 }), mo, [0, 0, -.01], [Math.PI / 2, 0, 0], [.21, .02, .21]); lens.renderOrder = 3; const chn = mesh(cyl(4), toon('#e8bc52', { rim: .5 }), mo, [.05, -.6, 0], [0, 0, .08], [.012, 1.0, .012]); }
    for (const s of [-1, 1]) { const m = mesh(sph(14), toon('#3a2a2a', { rim: .5 }), root, [s * .17, .71, .985], [0, s * .3, s * -.35], [.2, .06, .07]); outline(m, '#150a0a', 1.08); mesh(cone(6), toon('#3a2a2a', { rim: .4 }), root, [s * .32, .77, .93], [0, 0, -s * 1.9], [.04, .09, .04]); }
    const bt = new THREE.Group(); bt.position.set(0, .34, 1.01); root.add(bt); const bm = toon('#2a9a6a', { rim: .6 }); for (const s of [-1, 1]) { const w = mesh(cone(3), bm, bt, [s * .16, 0, 0], [0, 0, -s * Math.PI / 2], [.15, .3, .08]); outline(w, '#0a4a2a', 1.07); } mesh(sph(10), bm, bt, null, null, .08);
    const pw = new THREE.Group(); pw.position.set(.5, .62, .84); root.add(pw); mesh(cyl(4), toon('#e8bc52', { rim: .7 }), pw, [0, .1, 0], null, [.01, .2, .01]); const wb = new THREE.Group(); wb.position.y = -.01; pw.add(wb); mesh(cyl(20), toon('#e8bc52', { rim: .9 }), wb, [0, -.1, 0], [Math.PI / 2, 0, 0], [.1, .03, .1]); mesh(cyl(20), toon('#fff8e6', { rim: .2 }), wb, [0, -.1, .02], [Math.PI / 2, 0, 0], [.08, .02, .08]); fx(t => { pw.rotation.z = Math.sin(t * 2.2) * .22; });
  }
  if (id === 'trueno') {
    // nubarrón con lluvia y rayo, cejas dramáticas y collar de rayo
    const cl = new THREE.Group(); cl.position.set(0, 2.45, 0); root.add(cl); const cm = toon('#7a84a8', { rim: .7, emissive: '#2a3060', ei: .25 });
    [[0, 0, 0, .42], [.42, -.06, .08, .3], [-.42, -.04, -.05, .3], [.18, .16, -.1, .28], [-.2, .14, .1, .26], [0, -.08, .3, .24]].forEach(([x, y, z, r]) => { const m = mesh(sph(16), cm, cl, [x, y, z], null, [r, r * .78, r]); outline(m, '#2a2a5a', 1.06); });
    const bolt = mesh(boltG(), gl('#fff27a', 1), cl, [0, -.62, .1], null, 1.2); bolt.add(glow('#fff27a', 2.4, .8));
    const drops = []; for (let i = 0; i < 9; i++) { const d = mesh(cyl(4), toon('#8fd0ff', { emissive: '#4fa0ff', ei: .5, rim: 0 }), cl, null, null, [.012, .13, .012]); drops.push(d); }
    fx(t => { cl.position.y = 2.45 + Math.sin(t * 2) * .05; const f = (t * 1.6 + .2) % 3 < .3; bolt.visible = f; bolt.children[0].visible = f; drops.forEach((d, i) => { const k = (t * 1.4 + i * .23) % 1; d.position.set(((i * .37) % 1 - .5) * .9, -.3 - k * 1.2, ((i * .53) % 1 - .5) * .5); d.visible = k < .95; }); });
    for (const s of [-1, 1]) { const b = mesh(box(), toon('#2a1838', { rim: .3 }), root, [s * .36, 1.2, .93], [0, 0, -s * .45], [.3, .075, .06]); outline(b, '#000', 1.2); }
    const nk = mesh(tor(.02, 40), toon('#ffd84a', { rim: .8 }), root, [0, .55, 0], [Math.PI / 2 + .5, 0, 0], [.7, .7, 1]); mesh(boltG(), gl('#ffe84a', .8), root, [0, .22, .86], [.3, 0, 0], .5);
    for (let i = 0; i < 3; i++) { const s = glow('#cfe0ff', .45); root.add(s); fx(t => { const a = t * 1.7 + i * 2.1; s.position.set(Math.sin(a) * 1.3, .9 + Math.sin(t * 9 + i) * .45, Math.cos(a) * .9); s.material.opacity = Math.sin(t * 13 + i * 5) > .3 ? 1 : .1; }); }
  }
  // disco: peluca, gafas y lacito viven en disco.js (rehecho en o40 a partir de la imagen de referencia)
}
