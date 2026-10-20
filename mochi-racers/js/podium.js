// v11: pantalla de podio premium (escena, celebración, fuegos artificiales y cámara que se encuadra sola)
import * as THREE from 'three';
import { makeCharacter, animCharacter, makeTrophy, glowTex, toon, mesh, outline } from './gfx.js';

const METAL = ['#ffcc33', '#dfe7f2', '#e0915a'], METAL_D = ['#c98a00', '#8d9bb0', '#9a5528'];
const H = [3.0, 2.15, 1.45], X = [0, -3.05, 3.05], BW = 2.85, BD = 2.9, CS = 1.55; // alturas, posiciones, ancho, fondo, escala piloto

function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function rr(x, X0, Y0, w, h, r) { x.beginPath(); x.moveTo(X0 + r, Y0); x.arcTo(X0 + w, Y0, X0 + w, Y0 + h, r); x.arcTo(X0 + w, Y0 + h, X0, Y0 + h, r); x.arcTo(X0, Y0 + h, X0, Y0, r); x.arcTo(X0, Y0, X0 + w, Y0, r); x.closePath(); }

// cara frontal del escalón: degradado, rombos sutiles, brillo y número metálico grande
function frontTex(i, base) {
  return canvasTex(256, Math.round(256 * H[i] / BW), (x, w, h) => {
    const c = new THREE.Color(base), top = '#' + c.clone().lerp(new THREE.Color('#ffffff'), 0.35).getHexString(), bot = '#' + c.clone().multiplyScalar(0.72).getHexString();
    let g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalAlpha = 0.09; x.fillStyle = '#ffffff'; for (let yy = -1; yy < h / 22 + 1; yy++) for (let xx = -1; xx < w / 22 + 1; xx++) if ((xx + yy) % 2 === 0) { x.save(); x.translate(xx * 22 + 11, yy * 22 + 11); x.rotate(Math.PI / 4); x.fillRect(-6, -6, 12, 12); x.restore(); }
    x.globalAlpha = 1; g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.28)'); g.addColorStop(0.58, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = METAL[i]; x.fillRect(0, 0, w, 14); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(0, 2, w, 4);
    // medallón con número
    const cx = w / 2, cy = Math.min(h * 0.5, 120), R = 64;
    x.shadowColor = 'rgba(60,20,80,.45)'; x.shadowBlur = 14; x.shadowOffsetY = 6;
    g = x.createRadialGradient(cx - 18, cy - 22, 6, cx, cy, R); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, METAL[i]); g.addColorStop(1, METAL_D[i]);
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill(); x.shadowColor = 'transparent';
    x.lineWidth = 7; x.strokeStyle = '#ffffff'; x.stroke(); x.lineWidth = 3; x.strokeStyle = METAL_D[i]; x.beginPath(); x.arc(cx, cy, R - 9, 0, 7); x.stroke();
    x.font = '700 84px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 10; x.strokeStyle = METAL_D[i]; x.strokeText(String(i + 1), cx, cy + 6); x.fillStyle = '#ffffff'; x.fillText(String(i + 1), cx, cy + 6);
  });
}
function sideTex(base) { return canvasTex(64, 128, (x, w, h) => { const c = new THREE.Color(base); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#' + c.clone().multiplyScalar(0.92).getHexString()); g.addColorStop(1, '#' + c.clone().multiplyScalar(0.6).getHexString()); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,.12)'; for (let yy = 0; yy < h; yy += 16) x.fillRect(0, yy, w, 3); }); }
function topTex(base, i) { return canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 90); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, base); g.addColorStop(1, METAL_D[i]); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 6; rr(x, 8, 8, 112, 112, 16); x.stroke(); }); }
function textSprite(text, bg, fg) {
  const t = canvasTex(256, 112, (x) => { x.font = '700 58px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = bg; rr(x, 30, 6, 196, 76, 38); x.fill(); x.lineWidth = 6; x.strokeStyle = '#ffffff'; x.stroke(); x.beginPath(); x.moveTo(108, 80); x.lineTo(128, 106); x.lineTo(148, 80); x.fill(); x.fillStyle = fg; x.fillText(text, 128, 48); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.9, 0.83, 1); s.renderOrder = 20; return s;
}

export function buildPodium(cup, ranking, myPlace, tier) {
  const scene = new THREE.Scene();
  const win = tier >= 0;
  // --- cielo: degradado de 3 tonos, rayos de sol que giran y estrellitas ---
  const skyU = { top: { value: new THREE.Color(cup.sky[0]).lerp(new THREE.Color(win ? '#6a3cff' : '#5a64c8'), 0.45) }, mid: { value: new THREE.Color(cup.sky[1]) }, bot: { value: new THREE.Color(cup.color).lerp(new THREE.Color('#ffffff'), 0.35) }, t: { value: 0 }, ray: { value: win ? 1 : 0.55 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: 'varying vec3 vp; void main(){vp=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float t; uniform float ray; varying vec3 vp;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){ vec3 d=normalize(vp); float h=d.y;
        vec3 c = h>0.12 ? mix(mid, top, smoothstep(0.12,0.75,h)) : mix(bot, mid, smoothstep(-0.1,0.12,h));
        vec2 q = vec2(d.x, d.y-0.18); float a = atan(q.y, q.x); float r = length(q);
        float rays = smoothstep(0.55, 1.0, sin(a*14.0 + t*0.25)) * smoothstep(1.1, 0.05, r) * ray;
        c += vec3(1.0,0.95,0.8) * rays * 0.22 * step(-0.05, d.z*-1.0+0.6);
        c += vec3(1.0,0.97,0.9) * pow(max(0.0, 1.0 - r*1.6), 3.0) * 0.45 * ray;
        vec2 g = floor(vec2(atan(d.z,d.x)*60.0, h*60.0)); float s = h21(g); float tw = 0.5+0.5*sin(t*2.0 + s*40.0);
        c += vec3(1.0) * step(0.985, s) * smoothstep(0.25, 0.6, h) * tw * 0.7;
        gl_FragColor=vec4(c,1.0);}` }));
  scene.add(sky);
  scene.add(new THREE.HemisphereLight('#ffffff', '#ffd0ea', 1.25));
  const sun = new THREE.DirectionalLight('#fff6e8', 1.5); sun.position.set(6, 22, 16); scene.add(sun);
  const rim = new THREE.DirectionalLight(win ? '#ffd27a' : '#b9c8ff', 0.8); rim.position.set(-10, 8, -12); scene.add(rim);

  // --- suelo: escenario circular con anillos dorados y foco de luz ---
  const floorT = canvasTex(512, 512, (x, w) => { const g = x.createRadialGradient(256, 256, 20, 256, 256, 256); const gc = new THREE.Color(cup.ground || '#bff2d6'); g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, '#' + gc.clone().lerp(new THREE.Color('#ffffff'), 0.4).getHexString()); g.addColorStop(0.7, '#' + gc.getHexString()); g.addColorStop(1, '#' + gc.clone().multiplyScalar(0.7).getHexString()); x.fillStyle = g; x.fillRect(0, 0, w, w);
    x.globalAlpha = 0.18; x.strokeStyle = '#ffffff'; x.lineWidth = 3; for (let r = 40; r < 256; r += 26) { x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); } x.globalAlpha = 0.1; for (let a = 0; a < 24; a++) { x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(a / 24 * 6.283) * 256, 256 + Math.sin(a / 24 * 6.283) * 256); x.stroke(); } });
  mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshLambertMaterial({ map: floorT }), scene, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  const stageM = new THREE.MeshPhongMaterial({ color: '#fff3fb', shininess: 60, specular: '#ffffff' });
  mesh(new THREE.CylinderGeometry(7.6, 8, 0.35, 64), stageM, scene, [0, 0.17, 0.6]);
  const ringM = new THREE.MeshPhongMaterial({ color: METAL[0], emissive: '#7a5200', emissiveIntensity: 0.3, shininess: 120, specular: '#ffffff' });
  mesh(new THREE.TorusGeometry(7.7, 0.12, 8, 96), ringM, scene, [0, 0.35, 0.6], [Math.PI / 2, 0, 0]);
  mesh(new THREE.TorusGeometry(6.2, 0.06, 6, 96), ringM, scene, [0, 0.36, 0.6], [Math.PI / 2, 0, 0]);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), new THREE.MeshBasicMaterial({ map: glowTex('#fff3b0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 })); spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.37, 1.6); scene.add(spot);

  // --- fondo: islas flotantes, arcos de luz y globos ---
  const deco = [];
  const isl = (x, y, z, s, c) => { const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g);
    mesh(new THREE.ConeGeometry(1.4, 2.4, 10), toon('#c8a2e8', { rim: 0.4 }), g, [0, -1.25, 0], [Math.PI, 0, 0]);
    mesh(new THREE.CylinderGeometry(1.5, 1.45, 0.45, 14), toon(c, { rim: 0.5 }), g, [0, 0, 0]);
    for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.42, 10, 8), toon(['#ff9fd0', '#ffe27a', '#9fe9ff'][i]), g, [Math.cos(i * 2.1) * 0.8, 0.45, Math.sin(i * 2.1) * 0.6]);
    deco.push({ g, y, ph: Math.random() * 6 }); };
  isl(-16, 9, -26, 2.2, '#9ff0c4'); isl(17, 12, -30, 2.6, '#ffd0ea'); isl(-26, 16, -44, 3.2, '#ffe8a0'); isl(28, 6, -40, 2.4, '#b9e6ff'); isl(3, 20, -55, 3.4, '#c9ffd8');
  const archCols = ['#ff7fb6', '#ffb36b', '#ffe36b', '#7ee3a0', '#7fd0ff', '#b38cff'];
  archCols.forEach((c, i) => mesh(new THREE.TorusGeometry(30 - i * 1.3, 0.55, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5 }), scene, [0, -2, -60]));
  const balloons = [];
  for (let i = 0; i < 14; i++) { const c = ['#ff7fb6', '#ffd84a', '#7fd0ff', '#b38cff', '#7ee3a0'][i % 5]; const b = new THREE.Group(); const s = i % 2 ? 1 : -1;
    b.position.set(s * (6.5 + Math.random() * 7), 2 + Math.random() * 10, -6 - Math.random() * 14); scene.add(b);
    const bm = mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshPhongMaterial({ color: c, shininess: 90, specular: '#ffffff' }), b, [0, 0, 0], null, [1, 1.18, 1]);
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 3), new THREE.MeshBasicMaterial({ color: '#ffffff' }), b, [0, -1.4, 0]); balloons.push({ b, v: 0.5 + Math.random() * 0.6, ph: Math.random() * 6 }); }
  // focos que barren el cielo
  const beams = [];
  for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * 9, 0, -6); scene.add(g);
    const cone = mesh(new THREE.ConeGeometry(2.2, 26, 24, 1, true), new THREE.MeshBasicMaterial({ color: win ? '#fff1b8' : '#d8e4ff', transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), g, [0, 13, 0], [Math.PI, 0, 0]);
    beams.push({ g, s }); }

  // --- escalones del podio ---
  const blocks = [], chars = [];
  for (let i = 0; i < 3; i++) {
    const base = i === 0 ? cup.color : ['#ffffff', '#f6eefc', '#fbeee6'][i];
    const front = frontTex(i, base), side = sideTex(base), top = topTex(METAL[i], i);
    const mk = map => new THREE.MeshPhongMaterial({ map, shininess: 50, specular: '#ffffff' });
    const sm = mk(side);
    const b = new THREE.Mesh(new THREE.BoxGeometry(BW, H[i], BD), [sm, sm, mk(top), sm, mk(front), sm]);
    b.position.set(X[i], H[i] / 2 + 0.35, 0); scene.add(b); outline(b, '#6a3a7a', 1.015); blocks.push(b);
    // borde dorado arriba
    mesh(new THREE.BoxGeometry(BW + 0.12, 0.16, BD + 0.12), new THREE.MeshPhongMaterial({ color: METAL[i], emissive: METAL_D[i], emissiveIntensity: 0.25, shininess: 140, specular: '#ffffff' }), scene, [X[i], H[i] + 0.35, 0]);
    const r = ranking[i]; const c = makeCharacter(r.ch); c.userData.seed = i; c.scale.setScalar(CS); c.position.set(X[i], H[i] + 0.43, 0.15); scene.add(c);
    const sh = mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: '#40205a', transparent: true, opacity: 0.28, depthWrite: false }), scene, [X[i], H[i] + 0.44, 0.15], [-Math.PI / 2, 0, 0]);
    chars.push({ c, i, base: H[i] + 0.43, sh });
  }
  // altura real del piloto (para colocar trofeo y etiquetas)
  const charH = 1.62 * CS; // alto del cuerpo (sin orejas)
  // el ganador sostiene una copa dorada en alto
  const held = makeTrophy(METAL[0], 0); held.scale.setScalar(0.5); scene.add(held);
  // etiqueta «TÚ» encima del jugador si está en el podio
  let tag = null; if (myPlace >= 1 && myPlace <= 2) { tag = textSprite('TÚ', '#ff5fa8', '#ffffff'); scene.add(tag); }

  // --- trofeo grande, centrado y flotando, del metal de tu puesto ---
  const tc = tier >= 0 ? METAL[tier] : (cup.trophy || cup.color);
  const trophy = makeTrophy(tc, Math.max(0, tier)); trophy.scale.setScalar(1.2); scene.add(trophy);
  const TY = H[0] + 0.43 + charH + 1.7;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(tc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 })); halo.scale.setScalar(6.5); scene.add(halo);
  const sparks = []; for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(s); sparks.push(s); }

  // --- confeti ---
  const NC = 240; const conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.36), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), NC); const cd = [];
  const cc = ['#ff8fc0', '#ffe066', '#7ff5ff', '#b9a2f7', '#7ee3c4', '#ffffff', '#ffb36b'];
  for (let i = 0; i < NC; i++) { cd.push({ p: new THREE.Vector3((Math.random() - 0.5) * 22, Math.random() * 22, (Math.random() - 0.5) * 10 + 1), v: 1.2 + Math.random() * 1.8, r: Math.random() * 6, w: Math.random() * 6 }); conf.setColorAt(i, new THREE.Color(cc[i % cc.length])); }
  conf.frustumCulled = false; scene.add(conf);

  // --- fuegos artificiales (pool de explosiones con puntos aditivos) ---
  const NF = 5, NP = 70, fw = [];
  for (let k = 0; k < NF; k++) { const g = new THREE.BufferGeometry(); const pos = new Float32Array(NP * 3); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ size: 0.7, map: glowTex('#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffffff' });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.visible = false; scene.add(p); fw.push({ p, pos, vel: new Float32Array(NP * 3), life: 0, c: new THREE.Vector3() }); }
  let fwT = 0.4, fwI = 0;
  function boom(sfx) { const f = fw[fwI++ % NF]; f.life = 1.8; f.p.visible = true; f.c.set((Math.random() - 0.5) * 22, 12 + Math.random() * 7, -10 - Math.random() * 8);
    f.p.material.color.setHSL(Math.random(), 0.9, 0.62); const sp = 5 + Math.random() * 3;
    for (let j = 0; j < NP; j++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u); f.vel[j * 3] = s * Math.cos(a) * sp; f.vel[j * 3 + 1] = u * sp; f.vel[j * 3 + 2] = s * Math.sin(a) * sp; f.pos[j * 3] = f.c.x; f.pos[j * 3 + 1] = f.c.y; f.pos[j * 3 + 2] = f.c.z; }
    sfx && sfx(); }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  let T = 0;
  // vista: región que debe caber (x, y) y franja libre de la pantalla entre el título y los botones
  const BOX = { x0: -4.75, x1: 4.75, y0: 0.2, y1: TY + 1.2 * 2.6 };
  return {
    scene, win,
    update(dt, opts = {}) {
      T += dt; const t = T; skyU.t.value = t;
      // celebración
      for (const ch of chars) { const { c, i } = ch; let y = ch.base, expr = '', ry = 0, rx = 0;
        if (i === 0) { // salta, levanta la copa y baila; cada 4 s un salto mortal
          const cyc = t % 4, j = cyc > 3 ? Math.sin((cyc - 3) * Math.PI) : Math.abs(Math.sin(t * 4.2)) * 0.35;
          y += j * (cyc > 3 ? 1.6 : 1); rx = cyc > 3 ? -(cyc - 3) * Math.PI * 2 : 0; ry = Math.sin(t * 2.1) * 0.55; expr = 'happy';
          c.position.x = X[0] + Math.sin(t * 2.1) * 0.18;
        } else if (i === 1) { // aplaude contento
          y += Math.abs(Math.sin(t * 5)) * 0.18; ry = 0.35 + Math.sin(t * 1.3) * 0.15; expr = (t % 3) < 2 ? 'happy' : '';
        } else { // se lamenta con gracia: suspira, suda y mira al ganador
          const cyc = t % 5; expr = cyc < 2.2 ? 'strain' : cyc < 3.4 ? 'look' : ''; ry = -0.45 + Math.sin(t * 0.9) * 0.1; y += cyc > 3.4 ? Math.abs(Math.sin(t * 3)) * 0.08 : 0;
        }
        c.position.y = y; c.rotation.set(rx, ry, 0); animCharacter(c, t, 1, expr, 0);
        if (i === 1 && expr === 'happy') for (const a of c.userData.arms) a.p.rotation.z = a.s * (1.15 + Math.sin(t * 18) * 0.45); // palmas
        ch.sh.scale.setScalar(Math.max(0.4, 1 - (y - ch.base) * 0.35));
      }
      const w = chars[0].c; const lift = 0.55 + Math.abs(Math.sin(t * 4.2)) * 0.25; held.position.set(w.position.x, w.position.y + charH * lift * Math.cos(w.rotation.x), w.position.z + 1.35 * Math.cos(w.rotation.x)); held.rotation.set(w.rotation.x, t * 2.5, Math.sin(t * 4.2) * 0.12);
      if (tag) { const p = chars[myPlace].c.position; tag.position.set(p.x, p.y + charH + 1.25, p.z); }
      // trofeo grande
      trophy.position.set(0, TY + Math.sin(t * 1.6) * 0.18, -1.6); trophy.rotation.y = t * 0.9;
      halo.position.set(0, TY + 1.6, -2.2); halo.material.opacity = 0.65 + Math.sin(t * 3) * 0.2;
      sparks.forEach((s, i) => { const a = t * 1.2 + i * 0.628, r = 2.3 + Math.sin(t * 2 + i) * 0.3; s.position.set(Math.cos(a) * r, TY + 1.6 + Math.sin(a * 1.7) * 1.1, -1.6 + Math.sin(a) * r); const k = 0.5 + 0.5 * Math.sin(t * 6 + i * 2); s.scale.setScalar(0.25 + k * 0.45); s.material.opacity = k; });
      // fondo
      deco.forEach(d => { d.g.position.y = d.y + Math.sin(t * 0.7 + d.ph) * 0.6; d.g.rotation.y = t * 0.1 + d.ph; });
      balloons.forEach(b => { b.b.position.y += b.v * dt; b.b.rotation.z = Math.sin(t * 1.4 + b.ph) * 0.15; if (b.b.position.y > 18) b.b.position.y = -1; });
      beams.forEach(b => { b.g.rotation.z = b.s * (0.35 + Math.sin(t * 0.7 + b.s) * 0.3); });
      spot.material.opacity = 0.65 + Math.sin(t * 2.4) * 0.15;
      // confeti
      for (let i = 0; i < NC; i++) { const c = cd[i]; c.p.y -= c.v * dt; if (c.p.y < 0.3) c.p.y = 20 + Math.random() * 3; c.r += dt * 4; e.set(c.r, c.r * 0.7, c.w); q.setFromEuler(e); v3.set(c.p.x + Math.sin(t * 1.3 + i) * 0.5, c.p.y, c.p.z); m4.compose(v3, q, one); conf.setMatrixAt(i, m4); }
      conf.instanceMatrix.needsUpdate = true;
      // fuegos artificiales
      fwT -= dt; if (fwT <= 0) { fwT = (win ? 0.75 : 1.6) + Math.random() * 0.6; boom(opts.boomSfx); }
      for (const f of fw) { if (f.life <= 0) continue; f.life -= dt; const k = Math.max(0, f.life / 1.8); f.p.material.opacity = Math.min(1, k * 1.6); f.p.material.size = 0.45 + (1 - k) * 0.5;
        for (let j = 0; j < NP; j++) { f.vel[j * 3 + 1] -= 3.2 * dt; for (let a = 0; a < 3; a++) { f.vel[j * 3 + a] *= 0.985; f.pos[j * 3 + a] += f.vel[j * 3 + a] * dt; } }
        f.p.geometry.attributes.position.needsUpdate = true; if (f.life <= 0) f.p.visible = false; }
    },
    // coloca la cámara para que el podio llene la franja libre (top/bot en fracción de alto de pantalla)
    fit(cam, top, bot, t) {
      const a = cam.aspect, fov = cam.fov * Math.PI / 180, tv = Math.tan(fov / 2);
      if (cam.zoom !== 1) { cam.zoom = 1; cam.updateProjectionMatrix(); }
      const band = Math.max(0.3, bot - top), W = BOX.x1 - BOX.x0 + (a < 1 ? 1.9 : 3), Hh = BOX.y1 - BOX.y0 + 0.4;
      const visH = Math.max(Hh / band, W / a); const D = visH / 2 / tv;
      const yc = (BOX.y0 + BOX.y1) / 2, m = (top + bot) / 2, cy = yc + (m - 0.5) * visH;
      const sway = Math.sin(t * 0.25) * Math.min(1.5, D * 0.04);
      cam.position.set(sway, cy + D * 0.08, D + 1.2); cam.lookAt(sway * 0.3, cy, 1.2);
    },
  };
}
