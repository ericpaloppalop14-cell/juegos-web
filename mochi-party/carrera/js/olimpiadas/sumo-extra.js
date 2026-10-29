// ======================================================================
//  SUMO EN LA DUNA (o32) — suelo del ring con dos mochis luchando (textura canvas)
//  y grada llena de público animado: saltos, brazos, ola, banderas y confeti.
// ======================================================================
import { THREE, toon, outline } from '../core3d.js?v=o45';

function floorTex(base) {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), C = S / 2;
  const col = new THREE.Color(base), hex = k => { const q = col.clone(); q.offsetHSL(0, 0, k); return '#' + q.getHexString(); };
  // arena con anillos suaves
  const rg = g.createRadialGradient(C, C, 40, C, C, C); rg.addColorStop(0, hex(.12)); rg.addColorStop(1, hex(-.02)); g.fillStyle = rg; g.fillRect(0, 0, S, S);
  g.strokeStyle = hex(.16); g.lineWidth = 10; for (const r of [470, 430]) { g.beginPath(); g.arc(C, C, r, 0, 7); g.stroke(); }
  g.setLineDash([22, 18]); g.strokeStyle = hex(-.08); g.lineWidth = 6; g.beginPath(); g.arc(C, C, 450, 0, 7); g.stroke(); g.setLineDash([]);
  for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; g.fillStyle = i % 2 ? hex(.2) : '#ffb3cf'; g.beginPath(); g.arc(C + Math.cos(a) * 450, C + Math.sin(a) * 450, 9, 0, 7); g.fill(); }
  // círculo central y estrella de choque
  g.fillStyle = hex(.08); g.beginPath(); g.arc(C, C, 330, 0, 7); g.fill();
  g.fillStyle = '#fff4d0'; g.beginPath(); for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283, r = i % 2 ? 70 : 150; g.lineTo(C + Math.cos(a) * r, C - 40 + Math.sin(a) * r); } g.closePath(); g.fill();
  g.fillStyle = '#ffe27a'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + .2, r = i % 2 ? 40 : 95; g.lineTo(C + Math.cos(a) * r, C - 40 + Math.sin(a) * r); } g.closePath(); g.fill();
  const ink = '#5a3a2e';
  const mochi = (x, y, body, dir) => {
    g.save(); g.translate(x, y); g.rotate(dir * .18);
    g.fillStyle = 'rgba(90,50,30,.18)'; g.beginPath(); g.ellipse(0, 120, 120, 26, 0, 0, 7); g.fill();
    // brazo que empuja
    g.fillStyle = body; g.strokeStyle = ink; g.lineWidth = 8;
    g.beginPath(); g.ellipse(dir * 120, -10, 46, 30, dir * -.3, 0, 7); g.fill(); g.stroke();
    // cuerpo
    g.beginPath(); g.ellipse(0, 10, 130, 115, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(-dir * 45, -50, 40, 24, -.4 * dir, 0, 7); g.fill();
    // cinturón de sumo
    g.fillStyle = '#c8607a'; g.beginPath(); g.ellipse(0, 70, 118, 26, 0, 0, Math.PI); g.fill();
    // cejas decididas, ojos y boca grande feliz
    g.strokeStyle = ink; g.lineWidth = 10; g.lineCap = 'round';
    for (const k of [-1, 1]) { const ex = dir * 40 + k * 34; g.beginPath(); g.moveTo(ex - 18, -42 + (k === dir ? 8 : 0)); g.lineTo(ex + 18, -42 + (k === dir ? 0 : 8)); g.stroke();
      g.fillStyle = ink; g.beginPath(); g.ellipse(ex, -10, 11, 15, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + 4, -15, 4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,120,150,.6)'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(dir * 40 + k * 66, 18, 16, 10, 0, 0, 7); g.fill(); }
    g.fillStyle = '#b83a4a'; g.beginPath(); g.ellipse(dir * 40, 28, 22, 14, 0, 0, Math.PI); g.fill(); g.stroke();
    g.restore();
  };
  mochi(C - 165, C + 20, '#ffc2d6', 1); mochi(C + 165, C + 20, '#cfe0ff', -1);
  // líneas de fuerza y gotitas
  g.strokeStyle = hex(-.18); g.lineWidth = 7; g.lineCap = 'round';
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(C + s * (330 + i * 8), C - 60 + i * 50); g.lineTo(C + s * (390 + i * 8), C - 60 + i * 50); g.stroke(); }
  g.fillStyle = '#8fd0ff'; for (const [x, y] of [[C - 290, C - 130], [C + 300, C - 120]]) { g.beginPath(); g.moveTo(x, y - 22); g.quadraticCurveTo(x + 15, y, x, y + 10); g.quadraticCurveTo(x - 15, y, x, y - 22); g.fill(); }
  g.font = '700 70px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillStyle = hex(-.14); g.fillText('¡SUMO!', C, C + 250);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

const PAL = ['#ffb3cf', '#a8e6cf', '#ffe27a', '#c9b2ff', '#8fd0ff', '#ffc89a', '#ff9a9a', '#b6f0ff'];
export function sumoExtra(E, A, R0) {
  const base = A.p.material.color ? '#' + A.p.material.color.getHexString() : '#e8b064';
  // 1) suelo dibujado (hijo del ring: se encoge con él)
  const fl = new THREE.Mesh(new THREE.CircleGeometry(R0 - .05, 64), new THREE.MeshLambertMaterial({ map: floorTex(base), polygonOffset: true, polygonOffsetFactor: -2 }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = .601; A.p.add(fl);
  // 2) grada escalonada + público
  const scn = E.scene, crowd = [], flags = [], sph = new THREE.SphereGeometry(1, 14, 10), small = new THREE.SphereGeometry(1, 8, 6);
  const mats = PAL.map(c => toon(c, { rim: .35 })), ink = new THREE.MeshBasicMaterial({ color: '#3a2418' }), white = new THREE.MeshBasicMaterial({ color: '#fff' }), blush = new THREE.MeshBasicMaterial({ color: '#ff8fb8' });
  const rows = [R0 + 3.2, R0 + 4.6, R0 + 6.0];
  rows.forEach((rr, ri) => { const step = new THREE.Mesh(new THREE.CylinderGeometry(rr + .7, rr + .7, .5 + ri * .7, 64, 1, true, 0, Math.PI * 2), toon(ri % 2 ? '#ffd9a8' : '#ffc890', { rim: .2 })); step.material.side = THREE.DoubleSide; step.position.y = (.5 + ri * .7) / 2 - .1; scn.add(step);
    const top = new THREE.Mesh(new THREE.RingGeometry(rr - .7, rr + .7, 64), toon(ri % 2 ? '#ffe6c2' : '#ffd3a0', { rim: 0 })); top.rotation.x = -Math.PI / 2; top.position.y = .4 + ri * .7; scn.add(top);
    const n = 22 + ri * 6;
    for (let i = 0; i < n; i++) { const a = (i + (ri % 2) * .5) / n * Math.PI * 2; if (Math.sin(a) > .55) continue; // hueco delante para no tapar
      const gq = new THREE.Group(), m = mats[(i * 3 + ri) % mats.length], s = .42 + Math.random() * .12;
      const body = new THREE.Mesh(sph, m); body.scale.set(s, s * .9, s); body.position.y = s * .9; gq.add(body); outline(body, '#5a3a6e', 1.06);
      for (const k of [-1, 1]) { const e = new THREE.Mesh(small, ink); e.scale.set(.06, .08, .04); e.position.set(k * s * .32, s * 1.05, s * .92); gq.add(e); const b = new THREE.Mesh(small, blush); b.scale.set(.07, .04, .02); b.position.set(k * s * .55, s * .85, s * .82); gq.add(b); }
      const mo = new THREE.Mesh(small, ink); mo.scale.set(.08, .05, .03); mo.position.set(0, s * .72, s * .95); gq.add(mo);
      const arms = []; for (const k of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(k * s * .9, s * .9, 0); const ar = new THREE.Mesh(small, m); ar.scale.set(.13, .32, .13); ar.position.y = .28; piv.add(ar); gq.add(piv); arms.push(piv); }
      const y0 = .4 + ri * .7; gq.position.set(Math.cos(a) * rr, y0, Math.sin(a) * rr); gq.lookAt(0, y0, 0); scn.add(gq);
      const kind = Math.random(); let flag = null;
      if (kind < .22) { flag = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.3, 5), white); pole.position.y = .65; flag.add(pole); const cl = new THREE.Mesh(new THREE.PlaneGeometry(.7, .45, 6, 1), new THREE.MeshBasicMaterial({ color: PAL[(i + 2) % PAL.length], side: THREE.DoubleSide })); cl.position.set(.36, 1.1, 0); flag.add(cl); flag.userData.cl = cl; arms[1].add(flag); flag.position.y = .5; flags.push(flag); }
      crowd.push({ g: gq, arms, a, y0, ph: Math.random() * 6.28, mode: kind < .22 ? 'flag' : kind < .55 ? 'jump' : kind < .8 ? 'wave' : 'clap', fl: flag });
    } });
  // farolillos/banderines sobre la grada
  const bunt = []; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, rr = R0 + 7.2; const tri = new THREE.Mesh(new THREE.ConeGeometry(.25, .5, 3), toon(PAL[i % PAL.length], { rim: .2 })); tri.rotation.x = Math.PI; tri.position.set(Math.cos(a) * rr, 3.4, Math.sin(a) * rr); scn.add(tri); bunt.push(tri); }
  let conf = 0;
  return function tick(dt) { const t = performance.now() / 1000;
    for (const c of crowd) { const wave = Math.max(0, Math.sin(c.a - t * 1.6)) ** 6; // la ola recorre la grada
      let y = c.y0 + wave * .6, la = 0, ra = 0;
      if (c.mode === 'jump') { y += Math.abs(Math.sin(t * 5 + c.ph)) * .35; la = ra = -2.4; }
      else if (c.mode === 'wave') { la = -2.6 + Math.sin(t * 7 + c.ph) * .6; ra = -.3 - Math.max(0, Math.sin(t * 3 + c.ph)) * 2.2; }
      else if (c.mode === 'clap') { la = ra = -1.4; c.arms[0].rotation.z = -.6 - Math.abs(Math.sin(t * 9 + c.ph)) * .5; c.arms[1].rotation.z = .6 + Math.abs(Math.sin(t * 9 + c.ph)) * .5; }
      else { ra = -2.5 + Math.sin(t * 4 + c.ph) * .4; la = -.4; if (c.fl) c.fl.userData.cl.rotation.y = Math.sin(t * 8 + c.ph) * .5; }
      if (wave > .3) { la = ra = -2.9; }
      c.g.position.y = y; if (c.mode !== 'clap' || wave > .3) { c.arms[0].rotation.x = la; c.arms[1].rotation.x = ra; }
      c.g.children[0].scale.y = c.g.children[0].scale.x * (.9 + Math.sin(t * 6 + c.ph) * .04); }
    bunt.forEach((b, i) => b.rotation.z = Math.sin(t * 3 + i) * .25);
    conf -= dt; if (conf <= 0 && E.burst) { conf = .5 + Math.random() * .7; const a = Math.random() * 6.28, rr = R0 + 4 + Math.random() * 2;
      E.burst(new THREE.Vector3(Math.cos(a) * rr, 3, Math.sin(a) * rr), PAL[(Math.random() * PAL.length) | 0], 10, 3, .9, .25, 1); }
  };
}
