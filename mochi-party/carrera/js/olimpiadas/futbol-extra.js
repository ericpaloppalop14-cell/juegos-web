// ======================================================================
//  FÚTBOL DE GOMINOLA (o33) — ambiente de FINAL DEL MUNDIAL
//  Estadio con gradas llenas (público instanciado: 1 malla por pieza), la ola, banderas,
//  bufandas, confeti suave, focos, pancartas, marcador gigante, fuegos artificiales
//  y campo detallado (césped rayado, líneas reglamentarias, red en las porterías, banquillos).
//  Todo queda FUERA del rectángulo de juego y por debajo de la cámara.
// ======================================================================
import { THREE, toon, outline, glowSprite } from '../core3d.js?v=o43';

const PAL = ['#ff6fae', '#5fa8ff', '#ffe27a', '#7ee3c4', '#c9b2ff', '#ffb37a', '#ffffff', '#ff8a8a'];
const FLAGC = [['#ff6fae', '#ffffff'], ['#5fa8ff', '#ffffff'], ['#ffe27a', '#ff6fae'], ['#7ee3c4', '#5fa8ff']];

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g }; return t; }

// césped rayado + líneas (campo de juego 2FX × 2FZ, con margen)
function pitchTex(FX, FZ, GW, MX, MZ) {
  const W = 2048, H = Math.round(W * MZ / MX), sx = W / (2 * MX), sz = H / (2 * MZ);
  return canvasTex(W, H, (g) => {
    const X = x => (x + MX) * sx, Z = z => (z + MZ) * sz;
    g.fillStyle = '#62c45a'; g.fillRect(0, 0, W, H);
    const n = 14; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#7ad66c' : '#5cbf55'; g.fillRect(X(-FX + i * 2 * FX / n), Z(-FZ), 2 * FX / n * sx + 1, 2 * FZ * sz); }
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(X(-FX), Z(-FZ + i * 2 * FZ / 9), 2 * FX * sx, FZ / 9 * sz); } // damero suave
    // o37: briznas de césped, tréboles y brillo de corte (detalle fino sin coste por fotograma)
    for (let i = 0; i < 9000; i++) { const x = Math.random() * W, y = Math.random() * H, l = 5 + Math.random() * 9; g.strokeStyle = Math.random() < .5 ? 'rgba(30,110,30,.22)' : 'rgba(190,255,160,.18)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 4, y - l); g.stroke(); }
    for (let i = 0; i < 160; i++) { const x = Math.random() * W, y = Math.random() * H; g.fillStyle = Math.random() < .3 ? 'rgba(255,255,255,.5)' : 'rgba(255,230,120,.45)'; g.beginPath(); g.arc(x, y, 2 + Math.random() * 2, 0, 7); g.fill(); }
    { const rg = g.createRadialGradient(X(0), Z(0), 0, X(0), Z(0), W * .45); rg.addColorStop(0, 'rgba(255,255,220,.12)'); rg.addColorStop(1, 'rgba(0,40,0,.10)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
    g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.lineJoin = 'round';
    g.strokeRect(X(-FX), Z(-FZ), 2 * FX * sx, 2 * FZ * sz);
    g.beginPath(); g.moveTo(X(0), Z(-FZ)); g.lineTo(X(0), Z(FZ)); g.stroke();
    g.beginPath(); g.arc(X(0), Z(0), 2.3 * sx, 0, 7); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(X(0), Z(0), 10, 0, 7); g.fill();
    for (const s of [-1, 1]) { const gx = s * FX;
      g.strokeRect(Math.min(X(gx), X(gx - s * 4)), Z(-GW - 2.6), 4 * sx, (GW + 2.6) * 2 * sz); // área grande
      g.strokeRect(Math.min(X(gx), X(gx - s * 1.6)), Z(-GW - .7), 1.6 * sx, (GW + .7) * 2 * sz); // área pequeña
      g.beginPath(); g.arc(X(gx - s * 2.9), Z(0), 9, 0, 7); g.fill(); // punto de penalti
      g.beginPath(); g.arc(X(gx - s * 2.9), Z(0), 2.2 * sx, s > 0 ? Math.PI * .62 : -Math.PI * .38, s > 0 ? Math.PI * 1.38 : Math.PI * .38); g.stroke(); // medialuna
      for (const z of [-1, 1]) { g.beginPath(); g.arc(X(gx), Z(z * FZ), .6 * sx, 0, 7); g.stroke(); } } // córners
    // fuera del campo: anillo de césped oscuro y pista
    g.fillStyle = '#4fae4a'; g.fillRect(0, 0, W, Z(-FZ) - 6); g.fillRect(0, Z(FZ) + 6, W, H); g.fillRect(0, 0, X(-FX) - 6, H); g.fillRect(X(FX) + 6, 0, W, H);
    g.font = '700 80px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('⭐ GRAN FINAL ⭐', X(0), Z(FZ) + 70);
  });
}
function adTex(txt, bg, fg) { return canvasTex(1024, 96, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.font = '700 42px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg; for (let k = 0; k < 2; k++) g.fillText(txt, w * (k + .5) / 2, h / 2 + 3); }); }

export function futbolExtra(E, { FX, FZ, GW }) {
  const sc = E.scene, low = innerWidth * innerHeight < 500000, ticks = [];
  const MX = FX + 3, MZ = FZ + 3; // pradera alrededor del campo
  // 1) CAMPO: textura con césped rayado y líneas (justo encima de la caja de césped)
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(MX * 2, MZ * 2), new THREE.MeshLambertMaterial({ map: pitchTex(FX, FZ, GW, MX, MZ), polygonOffset: true, polygonOffsetFactor: -2 }));
  pitch.rotation.x = -Math.PI / 2; pitch.position.y = .012; sc.add(pitch);
  // 2) PORTERÍAS CON RED (rejilla de líneas: fondo, techo y laterales; detrás de la línea de gol)
  for (const s of [-1, 1]) { const D = .9, Hh = 1.8, pts = [], x0 = s * FX, x1 = s * (FX + D);
    for (let z = -GW; z <= GW + .01; z += .3) { pts.push(x1, 0, z, x1, Hh, z); pts.push(x0, Hh, z, x1, Hh, z); }
    for (let y = 0; y <= Hh + .01; y += .3) pts.push(x1, y, -GW, x1, y, GW);
    for (let x = 0; x <= D + .01; x += .3) pts.push(x0 + s * x, Hh, -GW, x0 + s * x, Hh, GW);
    for (const z of [-GW, GW]) { for (let y = 0; y <= Hh + .01; y += .3) pts.push(x0, y, z, x1, y, z); for (let x = 0; x <= D + .01; x += .3) pts.push(x0 + s * x, 0, z, x0 + s * x, Hh, z); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    sc.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .75 })));
    for (const z of [-GW, GW]) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, D, 6), toon('#e8e8f0')); bar.rotation.z = Math.PI / 2; bar.position.set(s * (FX + D / 2), Hh, z); sc.add(bar); } }
  // 3) VALLAS PUBLICITARIAS LED (sustituyen al blanco liso de las bandas largas, mismas medidas)
  const ads = [['¡GRAN FINAL MOCHI! 🏆', ['#ff6fae', '#ffb0d4'], '#fff'], ['MUNDIAL DE GOMINOLA ⚽', ['#3a6fff', '#7ab8ff'], '#fff'], ['¡VAMOS MOCHIS! 🎉', ['#ffb300', '#ffe27a'], '#5a2a00']];
  const adMats = ads.map(a => { const t = adTex(...a); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return new THREE.MeshBasicMaterial({ map: t }); });
  for (const z of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(FX * 2 + .8, .56), adMats[z > 0 ? 0 : 1]); m.position.set(0, .3, z * (FZ + .41)); m.rotation.y = z > 0 ? 0 : Math.PI; sc.add(m); } // cara exterior
  for (const z of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(FX * 2 + .8, .56), adMats[z > 0 ? 2 : 0]); m.position.set(0, .3, z * (FZ - .01)); m.rotation.y = z > 0 ? Math.PI : 0; sc.add(m); } // cara interior
  ticks.push(t => adMats.forEach((m, i) => m.map.offset.x = (t * .05 * (i % 2 ? -1 : 1)) % 1));
  // 4) BANQUILLOS (banda lejana, detrás de la valla, sin pisar el campo)
  for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * 5.5, 0, -(FZ + 1.9)); sc.add(g);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 4, 16, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshLambertMaterial({ color: '#bfe8ff', transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false })); roof.rotation.z = Math.PI / 2; roof.rotation.y = 0; roof.position.y = .2; roof.rotation.x = -Math.PI / 2; g.add(roof);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.6, .25, .5), toon(s > 0 ? '#ff6fae' : '#5fa8ff')); bench.position.set(0, .4, -.3); g.add(bench);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.28, 10, 8), toon(s > 0 ? '#ffc2d6' : '#cfe0ff', { rim: .3 })); m.position.set(-1.3 + i * .87, .8, -.3); m.scale.y = .9; g.add(m); outline(m, '#5a3a6e', 1.06); g.userData['m' + i] = m; }
    ticks.push(t => { for (let i = 0; i < 4; i++) g.userData['m' + i].position.y = .8 + Math.abs(Math.sin(t * 3 + i + s)) * .08; }); }
  // 5) GRADAS: anillo rectangular de escalones fuera del campo. Lado cercano (cámara) más bajo.
  const IX = FX + 4.2, IZ = FZ + 3.6, STEP = 1, RISE = .62, NF = low ? 9 : 11, NN = 4;
  const rowsOf = side => side === 'near' ? NN : NF;
  const stepMat = [toon('#e9e4ff', { rim: .15 }), toon('#d9d0ff', { rim: .15 })], seatsPlaced = [];
  const boxes = []; // geometría única de gradas (fusionada para pocas llamadas de dibujo)
  const addBox = (cx, cz, w, d, h, k) => boxes.push({ cx, cz, w, d, h, k });
  for (let i = 0; i < NF; i++) { const hx = IX + i * STEP, hz = IZ + i * STEP, h = .5 + i * RISE;
    addBox(0, -(hz + STEP / 2), 2 * (hx + STEP), STEP, h, i % 2); // fondo (lejos) a todo lo ancho
    const zFar = -(hz), zNear = i < NN ? hz : IZ + (NN - 1) * STEP + STEP; // los laterales acaban donde acaba la grada cercana
    for (const s of [-1, 1]) addBox(s * (hx + STEP / 2), (zFar + zNear) / 2, STEP, zNear - zFar, h, i % 2);
    if (i < NN) addBox(0, hz + STEP / 2, 2 * (hx + STEP), STEP, h, i % 2); }
  for (const k of [0, 1]) { const geos = boxes.filter(b => b.k === k).map(b => { const g = new THREE.BoxGeometry(b.w, b.h, b.d); g.translate(b.cx, b.h / 2 - .05, b.cz); return g; });
    const m = new THREE.Mesh(mergeGeos(geos), stepMat[k]); sc.add(m); }
  // pancartas en el frente de la grada lejana y de los fondos
  const banTxt = [['🏆 ¡CAMPEONES! 🏆', '#ff6fae'], ['MOCHI ❤ GOL', '#5fa8ff'], ['⭐ FINAL DEL MUNDIAL ⭐', '#ffb300'], ['¡A POR LA COPA!', '#7ec46a']];
  banTxt.forEach(([tx, c], i) => { const t = canvasTex(512, 96, (g, w, h) => { g.fillStyle = c; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 18); g.fill(); g.font = '700 52px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(tx, w / 2, h / 2 + 2); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1), new THREE.MeshBasicMaterial({ map: t }));
    if (i < 2) { m.position.set((i ? 1 : -1) * 8, .5 + 2 * RISE - .45, -(IZ + 2 * STEP) + .02); } // frente de la 3.ª fila lejana (por encima de la fila 2)
    else { const s = i === 2 ? -1 : 1; m.position.set(s * (IX + 2 * STEP - .02), .5 + 2 * RISE - .45, 0); m.rotation.y = -s * Math.PI / 2; }
    sc.add(m); });
  // 6) PÚBLICO INSTANCIADO: cuerpo + cara + brazos; algunos con bandera o bufanda
  const seats = [];
  for (let i = 0; i < NF; i++) { const hx = IX + i * STEP + STEP / 2, hz = IZ + i * STEP + STEP / 2, y = .5 + i * RISE - .05, sp = .82;
    for (let x = -hx + .4; x <= hx - .4; x += sp) seats.push({ x, z: -hz, y, ry: 0, i }); // fondo lejano mirando al campo (+z)
    const zN = i < NN ? hz : IZ + NN * STEP;
    for (const s of [-1, 1]) for (let z = -hz + sp; z <= zN - .5; z += sp) seats.push({ x: s * hx, z, y, ry: -s * Math.PI / 2, i });
    if (i < NN) for (let x = -hx + .4; x <= hx - .4; x += sp) seats.push({ x, z: hz, y, ry: Math.PI, i }); }
  const N = seats.length, dummy = new THREE.Object3D(), col = new THREE.Color();
  const bodyG = new THREE.SphereGeometry(.34, low ? 7 : 9, low ? 5 : 7);
  const faceG = mergeGeos([new THREE.SphereGeometry(.05, 5, 4).translate(-.11, .08, .3), new THREE.SphereGeometry(.05, 5, 4).translate(.11, .08, .3), new THREE.BoxGeometry(.12, .03, .03).translate(0, -.05, .31)]);
  const armG = mergeGeos([new THREE.CapsuleGeometry(.07, .3, 2, 5).translate(0, .2, 0).translate(-.34, .08, 0), new THREE.CapsuleGeometry(.07, .3, 2, 5).translate(0, .2, 0).translate(.34, .08, 0)]);
  const bodies = new THREE.InstancedMesh(bodyG, toon('#ffffff', { rim: .3 }), N), faces = new THREE.InstancedMesh(faceG, new THREE.MeshBasicMaterial({ color: '#3a2418' }), N), arms = new THREE.InstancedMesh(armG, toon('#ffffff', { rim: .2 }), N); arms.material.side = THREE.DoubleSide;
  const props = []; // banderas (plano en un palo) y bufandas (barra sobre la cabeza)
  seats.forEach((s, k) => { s.ph = Math.random() * 6.28; s.c = PAL[(Math.random() * PAL.length) | 0]; const r = Math.random(); s.mode = r < .12 ? 'flag' : r < .27 ? 'scarf' : r < .6 ? 'jump' : r < .8 ? 'clap' : 'sit';
    s.a = Math.atan2(s.z, s.x * .7); col.set(s.c); bodies.setColorAt(k, col); arms.setColorAt(k, col); if (s.mode === 'flag' || s.mode === 'scarf') props.push(k); });
  [bodies, faces, arms].forEach(m => { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); sc.add(m); });
  const flagG = mergeGeos([new THREE.CylinderGeometry(.025, .025, 1.2, 4).translate(0, .6, 0), new THREE.PlaneGeometry(.7, .42).translate(.36, 1.0, 0)]);
  const scarfG = new THREE.BoxGeometry(1.0, .16, .04);
  const flagIdx = props.filter(k => seats[k].mode === 'flag'), scarfIdx = props.filter(k => seats[k].mode === 'scarf');
  const flags = new THREE.InstancedMesh(flagG, new THREE.MeshBasicMaterial({ color: '#fff', side: THREE.DoubleSide }), flagIdx.length), scarves = new THREE.InstancedMesh(scarfG, new THREE.MeshBasicMaterial({ color: '#fff' }), scarfIdx.length);
  flagIdx.forEach((k, j) => flags.setColorAt(j, col.set(FLAGC[j % 4][0]))); scarfIdx.forEach((k, j) => scarves.setColorAt(j, col.set(FLAGC[(j + 1) % 4][j % 2])));
  [flags, scarves].forEach(m => { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); sc.add(m); });
  let goalHype = 0;
  ticks.push((t) => { const wa = t * 1.3;
    for (let k = 0; k < N; k++) { const s = seats[k]; let w = Math.sin(s.a - wa); w = w > .85 ? (w - .85) / .15 : 0; // la ola
      const hype = Math.max(w, goalHype);
      let jy = 0, armUp = 0;
      if (s.mode === 'jump') { jy = Math.abs(Math.sin(t * 5 + s.ph)) * .18; armUp = .6 + .4 * Math.sin(t * 5 + s.ph); }
      else if (s.mode === 'clap') { armUp = .35 + .15 * Math.abs(Math.sin(t * 10 + s.ph)); }
      else if (s.mode === 'sit') { armUp = .1; jy = Math.sin(t * 2 + s.ph) * .02; }
      else armUp = .9;
      jy += hype * .5; armUp = Math.max(armUp, hype);
      dummy.position.set(s.x, s.y + .3 + jy, s.z); dummy.rotation.set(0, s.ry, 0); dummy.scale.set(1, .92 + Math.sin(t * 6 + s.ph) * .03, 1); dummy.updateMatrix(); bodies.setMatrixAt(k, dummy.matrix); faces.setMatrixAt(k, dummy.matrix);
      // brazos: de colgando (0) a arriba (1); se escalan en vertical alrededor del hombro
      let ay = -.8 + armUp * 1.8; if (Math.abs(ay) < .25) ay = ay < 0 ? -.25 : .25; dummy.scale.set(1, ay, 1); dummy.updateMatrix(); arms.setMatrixAt(k, dummy.matrix); s.jy = jy; }
    flagIdx.forEach((k, j) => { const s = seats[k]; dummy.position.set(s.x, s.y + .4 + s.jy, s.z); dummy.rotation.set(0, s.ry + Math.sin(t * 6 + s.ph) * .5, Math.sin(t * 3 + s.ph) * .25); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); flags.setMatrixAt(j, dummy.matrix); });
    scarfIdx.forEach((k, j) => { const s = seats[k]; dummy.position.set(s.x, s.y + 1.05 + s.jy, s.z); dummy.rotation.set(0, s.ry, Math.sin(t * 4 + s.ph) * .2); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); scarves.setMatrixAt(j, dummy.matrix); });
    [bodies, faces, arms, flags, scarves].forEach(m => m.instanceMatrix.needsUpdate = true); });
  // 7) MARCADOR GIGANTE sobre la grada lejana (sobre postes, por encima de la última fila)
  const topY = .5 + (NF - 1) * RISE, sbZ = -(IZ + NF * STEP) - .6;
  const sbT = canvasTex(1024, 400, () => {}); const sbG = sbT.userData.g;
  const sb = new THREE.Group(); sb.position.set(0, topY + 4.2, sbZ); sc.add(sb);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.3), new THREE.MeshBasicMaterial({ map: sbT })); scr.position.z = .31; sb.add(scr);
  sb.add(new THREE.Mesh(new THREE.BoxGeometry(11.8, 5, .6), toon('#3a2a5a', { rim: .2 })));
  for (const x of [-4.5, 4.5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, topY + 1.8, 8), toon('#8a80b0')); p.position.set(x, -(topY + 1.8) / 2 - 2.4, -.1); sb.add(p); }
  let lastSB = '';
  function drawSB(g0, g1, sec, flash) { const k = `${g0}-${g1}-${sec}-${flash ? 1 : 0}`; if (k === lastSB) return; lastSB = k; const g = sbG;
    g.fillStyle = '#140c2a'; g.fillRect(0, 0, 1024, 400); g.fillStyle = flash ? '#ffe27a' : '#2a1a50'; g.fillRect(12, 12, 1000, 70);
    g.font = '700 54px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = flash ? '#3a2000' : '#ffe27a'; g.fillText(flash ? '¡¡¡ GOOOOL !!!' : '🏆 GRAN FINAL 🏆', 512, 50);
    g.font = '700 190px Fredoka, sans-serif'; g.fillStyle = '#ff6fae'; g.fillText(g0, 330, 230); g.fillStyle = '#5fa8ff'; g.fillText(g1, 694, 230); g.fillStyle = '#fff'; g.fillText('-', 512, 222);
    g.font = '700 46px Fredoka, sans-serif'; g.fillStyle = '#ffb0d4'; g.fillText('TÚ', 160, 230); g.fillStyle = '#b0d4ff'; g.fillText('ELLOS', 870, 230);
    g.fillStyle = '#7ee3c4'; g.fillText(`⏱ ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, 512, 355); sbT.needsUpdate = true; }
  // 8) FOCOS: 4 torres en las esquinas, fuera de las gradas
  const spots = [];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, .15], [1, .15]].map(([a, b]) => [a * (IX + NF * STEP + 1.2), b * (IZ + NF * STEP + 1.2)])) { const H = 16;
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(.3, .45, H, 8), toon('#9a90c0')); tw.position.set(x, H / 2, z); sc.add(tw);
    const pan = new THREE.Group(); pan.position.set(x, H + .6, z); pan.lookAt(0, 0, 0); sc.add(pan);
    pan.add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 2, .4), toon('#5a5080')));
    for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { const l = new THREE.Mesh(new THREE.CircleGeometry(.4, 12), new THREE.MeshBasicMaterial({ color: '#fffbe0' })); l.position.set(-1.1 + a * 1.1, -.5 + b * 1, .21); pan.add(l); }
    const gl = glowSprite('#fff6c8', 9, .7); gl.position.set(x, H + .8, z); gl.material.fog = false; sc.add(gl); spots.push(gl); }
  ticks.push(t => spots.forEach((g, i) => g.material.opacity = .55 + .15 * Math.sin(t * 2 + i)));
  // 9) CONFETI suave: solo sobre las gradas (nunca sobre el campo)
  const NC = low ? 220 : 400, cp = new Float32Array(NC * 3), cc = new Float32Array(NC * 3), cv = [];
  const spawnC = i => { const side = Math.random(); let x, z; if (side < .5) { x = (Math.random() * 2 - 1) * (IX + 6); z = -(IZ + 1 + Math.random() * 7); } else { const s = Math.random() < .5 ? -1 : 1; x = s * (IX + 1 + Math.random() * 7); z = (Math.random() * 2 - 1) * (IZ + 3); } cp[i * 3] = x; cp[i * 3 + 1] = 8 + Math.random() * 8; cp[i * 3 + 2] = z; cv[i] = { vy: .6 + Math.random() * .8, ph: Math.random() * 6 }; };
  for (let i = 0; i < NC; i++) { spawnC(i); cp[i * 3 + 1] = Math.random() * 14; col.set(PAL[i % PAL.length]); cc[i * 3] = col.r; cc[i * 3 + 1] = col.g; cc[i * 3 + 2] = col.b; }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  const conf = new THREE.Points(cg, new THREE.PointsMaterial({ size: .28, vertexColors: true, transparent: true, opacity: .9, depthWrite: false })); conf.frustumCulled = false; sc.add(conf);
  // 10) FUEGOS ARTIFICIALES suaves: estallidos altos detrás de las gradas (pool fijo)
  const FW = 5, FP = 60, fws = [];
  for (let f = 0; f < FW; f++) { const pos = new Float32Array(FP * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ size: .6, color: PAL[f], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.frustumCulled = false; sc.add(m);
    const dir = []; for (let i = 0; i < FP; i++) { const u = Math.random() * 2 - 1, th = Math.random() * 6.28, r = Math.sqrt(1 - u * u); dir.push([r * Math.cos(th), u, r * Math.sin(th)]); }
    fws.push({ m, pos, dir, t: 99, c: new THREE.Vector3() }); }
  let fwT = 1.5;
  const launch = (n = 1) => { for (const f of fws) { if (n <= 0) break; if (f.t < 2) continue; f.t = 0; f.c.set((Math.random() * 2 - 1) * 22, 22 + Math.random() * 8, -(IZ + NF + 6 + Math.random() * 8)); f.m.material.color.set(PAL[(Math.random() * 6) | 0]); n--; } };
  ticks.push((t, dt) => { if ((fwT -= dt) < 0) { fwT = 2.2 + Math.random() * 2; launch(1); }
    for (const f of fws) { if (f.t > 2) { f.m.material.opacity = 0; continue; } f.t += dt; const r = 5 * (1 - Math.exp(-f.t * 2.5)), drop = f.t * f.t * .8; for (let i = 0; i < FP; i++) { const d = f.dir[i]; f.pos[i * 3] = f.c.x + d[0] * r; f.pos[i * 3 + 1] = f.c.y + d[1] * r - drop; f.pos[i * 3 + 2] = f.c.z + d[2] * r; } f.m.geometry.attributes.position.needsUpdate = true; f.m.material.opacity = Math.max(0, 1 - f.t / 2); }
    for (let i = 0; i < NC; i++) { const v = cv[i]; cp[i * 3 + 1] -= v.vy * dt; cp[i * 3] += Math.sin(t * 2 + v.ph) * dt * .4; if (cp[i * 3 + 1] < 0) spawnC(i); } cg.attributes.position.needsUpdate = true; });
  // 11) o37 BANDERINES DE CÓRNER, COPA DEL MUNDO, FOTÓGRAFOS CON FLASH Y GLOBOS GIGANTES
  const flagsC = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * (FX + .25), 0, sz * (FZ + .25)); sc.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.4, 6), toon('#ffffff')); pole.position.y = .7; g.add(pole);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(.5, .34), new THREE.MeshBasicMaterial({ color: sx > 0 ? '#ff6fae' : '#5fa8ff', side: THREE.DoubleSide })); fl.position.set(.25, 1.22, 0); const piv = new THREE.Group(); piv.position.y = 0; piv.add(fl); g.add(piv); flagsC.push(piv); }
  ticks.push(t => flagsC.forEach((f, i) => f.rotation.y = Math.sin(t * 5 + i) * .5));
  { const cup = new THREE.Group(); cup.position.set(0, 0, -(FZ + 1.7)); sc.add(cup); const gold = toon('#ffd23a', { emissive: '#ffb300', ei: .25, rim: .7 });
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.55, .65, .8, 16), toon('#ffffff', { rim: .3 })); ped.position.y = .4; cup.add(ped);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.3, .38, .25, 16), toon('#2fae6a')); base.position.y = .93; cup.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.12, .22, .5, 12), gold); stem.position.y = 1.3; cup.add(stem);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(.38, 16, 12, 0, 6.29, 0, 1.8), gold); bowl.position.y = 1.75; bowl.rotation.x = Math.PI; cup.add(bowl);
    for (const s2 of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(.16, .045, 6, 12), gold); h.position.set(s2 * .42, 1.75, 0); cup.add(h); }
    const gl = glowSprite('#fff2a0', 3, .55); gl.position.y = 1.7; cup.add(gl);
    ticks.push(t => { cup.rotation.y = t * .8; gl.material.opacity = .4 + .2 * Math.sin(t * 3); }); }
  const flashes = []; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const z = (i - 1) * 3.6 + (i === 1 ? 0 : s * .4); if (Math.abs(z) < GW + .6) continue; const g = new THREE.Group(); g.position.set(s * (FX + 1.7), 0, z); g.rotation.y = -s * Math.PI / 2; sc.add(g);
    const bd = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), toon(PAL[(i + (s > 0 ? 3 : 0)) % PAL.length], { rim: .3 })); bd.position.y = .4; bd.scale.y = .9; g.add(bd); outline(bd, '#5a3a6e', 1.06);
    const cam = new THREE.Mesh(new THREE.BoxGeometry(.3, .2, .2), toon('#3a3550')); cam.position.set(0, .5, .3); g.add(cam);
    const fx = glowSprite('#ffffff', 1.6, 0); fx.position.set(0, .55, .45); g.add(fx); flashes.push({ fx, t: Math.random() * 3 }); }
  ticks.push((t, dt) => flashes.forEach(f => { f.t -= dt; if (f.t < 0) f.t = .6 + Math.random() * 2.5; f.fx.material.opacity = f.t < .08 ? 1 : 0; }));
  const balloons = []; for (let i = 0; i < (low ? 5 : 8); i++) { const g = new THREE.Group(); const a = i / 8 * Math.PI - Math.PI * .02; g.position.set(Math.cos(a) * (IX + 8) * (i % 2 ? 1 : -1) * .9, 15 + (i % 3) * 2.5, -(IZ + 5 + (i % 3) * 3)); sc.add(g);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 12), toon(PAL[i % PAL.length], { rim: .5 })); bl.scale.y = 1.2; g.add(bl);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 3, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); str.position.y = -2.6; g.add(str); balloons.push({ g, y: g.position.y, ph: i }); }
  ticks.push(t => balloons.forEach(b => { b.g.position.y = b.y + Math.sin(t * .8 + b.ph) * .6; b.g.rotation.z = Math.sin(t * .6 + b.ph) * .1; }));
  let lastGoals = '0-0', flashT = 0;
  return { tick(dt, goals, timeLeft) { const t = performance.now() / 1000; goalHype = Math.max(0, goalHype - dt * .5);
      const gk = goals.join('-'); if (gk !== lastGoals) { lastGoals = gk; goalHype = 1; flashT = 2.5; launch(5); flashes.forEach(f => f.t = Math.random() * .4); }
      flashT -= dt; drawSB(goals[0], goals[1], Math.max(0, Math.ceil(timeLeft)), flashT > 0 && Math.floor(flashT * 4) % 2 === 0);
      for (const f of ticks) f(t, dt); },
    counts: { publico: N, banderas: flagIdx.length, bufandas: scarfIdx.length } };
}

// fusiona geometrías no indexadas/indexadas simples (posición, normal, uv)
function mergeGeos(list) {
  const parts = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0; for (const g of parts) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
  for (const g of parts) { P.set(g.attributes.position.array, o * 3); if (g.attributes.normal) Nn.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); m.setAttribute('uv', new THREE.BufferAttribute(U, 2)); return m;
}
