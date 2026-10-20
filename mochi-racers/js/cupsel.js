// ======================================================================
//  MOCHI RACERS v8 · carrusel 3D premium de copas («Elige copa»)
//  Escena propia y ligera: sin sombras reales (sombras de mancha), env-map
//  PMREM pequeño para brillos metálicos, partículas aditivas.
// ======================================================================
import * as THREE from 'three';

const TAU = Math.PI * 2;
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

export function createCupCarousel(renderer, cups) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.3, 200);
  const N = cups.length;

  // --- entorno para reflejos (una vez) ---
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vP;void main(){float y=vP.y;vec3 c=mix(vec3(.35,.22,.5),vec3(1.,.93,.98),smoothstep(-.3,.7,y));c+=vec3(1.,.8,.9)*pow(max(0.,1.-abs(y-.15)*4.),3.)*.8;gl_FragColor=vec4(c,1.);}' })));
  for (const [x, y, z, s] of [[6, 5, 4, 3], [-7, 3, 2, 2.4], [0, 8, -5, 4], [3, -2, 7, 2]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); envScene.add(p); }
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(envScene, 0.02).texture; pm.dispose();
  scene.environment = env;

  // --- fondo: degradado teñido con el color de la copa + halo ---
  const bgU = { tint: { value: new THREE.Color(cups[0].color) }, time: { value: 0 } };
  const bg = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: bgU,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform vec3 tint;uniform float time;varying vec3 vP;
      void main(){float y=vP.y;vec3 top=mix(vec3(.16,.09,.3),tint*.55,.35);vec3 hor=mix(vec3(1.,.82,.92),tint,.45);
      vec3 c=mix(hor,top,smoothstep(0.,.55,y));c=mix(c,vec3(.23,.13,.36),smoothstep(0.,-.4,y));
      float g=pow(max(0.,dot(vP,normalize(vec3(0.,.12,-1.)))),18.);c+=tint*g*.55+vec3(1.)*g*.25;
      float st=step(.997,fract(sin(dot(floor(vP.xy*140.),vec2(12.9,78.2)))*43758.5));c+=st*smoothstep(.15,.6,y)*(.5+.5*sin(time*2.+vP.x*40.));
      gl_FragColor=vec4(c,1.);}` }));
  scene.add(bg);

  // rayos de luz giratorios detrás de la copa central
  const rayTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.translate(128, 128); for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(0, 0); g.lineTo(128, -14); g.lineTo(128, 14); g.closePath(); g.fill(); } });
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(cups[0].color) }));
  rays.position.set(0, 2.8, -4); rays.material.fog = false; scene.add(rays);

  const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  // --- paisaje espectacular: montañas de caramelo, islas flotantes, planeta, arcoíris, nubes ---
  const land = (() => { const g = new THREE.Group(); scene.add(g);
    const mtnTex = canvasTex(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, '#ffd6f0'); gr.addColorStop(0.6, '#b88ae0'); gr.addColorStop(1, '#4a2f78'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let y = 30; y < h; y += 22) { c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, y, w, 6); } });
    const mtnM = new THREE.MeshStandardMaterial({ map: mtnTex, roughness: 0.6, flatShading: true, fog: true });
    for (let i = 0; i < 14; i++) { const a = -1.35 + i / 13 * 2.7, r = 34 + (i % 3) * 7, hgt = 9 + ((i * 7) % 5) * 3.2;
      const m = new THREE.Mesh(new THREE.ConeGeometry(5 + (i % 4), hgt, 7), mtnM); m.position.set(Math.sin(a) * r, hgt / 2 - 0.5, -Math.cos(a) * r); m.rotation.y = i; g.add(m); }
    // planeta anillado
    const pl = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16), new THREE.MeshStandardMaterial({ color: '#ffb3d9', emissive: '#ff7fb6', emissiveIntensity: 0.35, roughness: 0.5 })); pl.position.set(-19, 21, -48); g.add(pl);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8, 0.5, 6, 64), new THREE.MeshBasicMaterial({ color: '#fff0a8', transparent: true, opacity: 0.8 })); ring.rotation.set(1.25, 0.3, 0.2); pl.add(ring);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(2, 20, 12), new THREE.MeshStandardMaterial({ color: '#b9f0ff', emissive: '#7fd8ff', emissiveIntensity: 0.4 })); moon.position.set(22, 25, -50); g.add(moon);
    // arcoíris
    ['#ff8fb8', '#ffc56b', '#fff07a', '#8ff0b0', '#7fd0ff', '#b48cff'].forEach((c, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(26 - i * 1.1, 0.55, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, fog: false })); r.position.set(8, -2, -58); g.add(r); });
    // islas flotantes con cascadas
    const isl = [], rockM = new THREE.MeshStandardMaterial({ color: '#9a76c8', roughness: 0.7, flatShading: true }), grassM = new THREE.MeshStandardMaterial({ color: '#9ff0c8', roughness: 0.6 }), fallM = new THREE.MeshBasicMaterial({ color: '#c9f4ff', transparent: true, opacity: 0.7 });
    for (const [x, y, z, s] of [[-11, 9, -18, 1.6], [12, 11, -22, 2], [-6, 15, -32, 1.2], [17, 6, -14, 1], [-17, 5, -12, 0.9]]) { const o = new THREE.Group(); o.position.set(x, y, z); o.scale.setScalar(s);
      const rk = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.6, 7), rockM); rk.rotation.x = Math.PI; rk.position.y = -1.3; o.add(rk);
      const gr = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.8, 0.35, 14), grassM); o.add(gr);
      const tr = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshStandardMaterial({ color: '#ff9ec7', roughness: 0.5 })); tr.position.set(0.5, 1, 0); o.add(tr);
      const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6), new THREE.MeshStandardMaterial({ color: '#fff4fa' })); tk.position.set(0.5, 0.4, 0); o.add(tk);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), fallM); fl.position.set(-1.2, -2.6, 1); o.add(fl);
      g.add(o); isl.push([o, y, Math.random() * 6]); }
    // nubes
    const cloudM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, emissive: '#ffe6f3', emissiveIntensity: 0.3 }), clouds = [];
    for (let i = 0; i < 9; i++) { const c = new THREE.Group(); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1.2 + (k % 2) * 0.6, 12, 8), cloudM); b.position.set(k * 1.3 - 2, (k % 2) * 0.5, 0); c.add(b); }
      c.position.set(-40 + i * 10, 13 + (i % 3) * 5, -30 - (i % 4) * 6); g.add(c); clouds.push(c); }
    // globos de luz
    const orbM = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), orbs = [];
    for (let i = 0; i < 18; i++) { const o = new THREE.Sprite(orbM.clone()); o.material.color.setHSL(i / 18, 0.8, 0.75); o.scale.setScalar(1 + (i % 3)); o.position.set((Math.random() - 0.5) * 40, 2 + Math.random() * 14, -8 - Math.random() * 25); g.add(o); orbs.push([o, o.position.y, Math.random() * 6]); }
    scene.fog = new THREE.Fog('#f4d6ff', 45, 150);
    return { update(t, tint) { isl.forEach(([o, y, p]) => { o.position.y = y + Math.sin(t * 0.6 + p) * 0.5; o.rotation.y = t * 0.05 + p; });
      clouds.forEach((c, i) => { c.position.x += 0.01 * (1 + (i % 3)); if (c.position.x > 45) c.position.x = -45; });
      orbs.forEach(([o, y, p]) => { o.position.y = y + Math.sin(t * 0.8 + p) * 1.2; o.material.opacity = 0.5 + Math.sin(t * 2 + p) * 0.3; });
      pl.rotation.y = t * 0.1; scene.fog.color.copy(tint).lerp(new THREE.Color('#ffe6f6'), 0.65); } };
  })();

  // --- luces ---
  scene.add(new THREE.HemisphereLight('#fff4fb', '#5a3a7a', 1.1));
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(4, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#ffd0f0', 1.4); rim.position.set(-6, 4, -6); scene.add(rim);
  const spot = new THREE.PointLight('#ffffff', 10, 12, 1.6); spot.position.set(0, 5.5, 2.5); scene.add(spot);

  // --- suelo brillante con degradado radial ---
  const floorTex = canvasTex(512, 512, (g) => { const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256); gr.addColorStop(0, '#f6e4ff'); gr.addColorStop(0.3, '#c9a2e6'); gr.addColorStop(0.7, '#7a58b0'); gr.addColorStop(1, '#3d2858'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; for (let r = 40; r < 256; r += 34) { g.beginPath(); g.arc(256, 256, r, 0, TAU); g.stroke(); } });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.18, metalness: 0.35, envMapIntensity: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -4; scene.add(floor);
  const blobTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(40,10,60,.75)'); gr.addColorStop(0.6, 'rgba(40,10,60,.3)'); gr.addColorStop(1, 'rgba(40,10,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const marbleTex = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#fbf3fb'; g.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(${170 + i * 4},${140 + i * 3},200,.35)`; g.lineWidth = 1 + (i % 3); g.beginPath(); let y = Math.random() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 16) { y += (Math.random() - 0.5) * 10; g.lineTo(x, y); } g.stroke(); } });
  marbleTex.wrapS = THREE.RepeatWrapping;

  // --- geometrías compartidas ---
  const cupGeo = new THREE.LatheGeometry([[0, 0.72], [0.36, 0.74], [0.5, 0.82], [0.92, 1.25], [1.08, 1.85], [1.12, 2.2], [1.02, 2.24], [0.96, 2.2], [0.9, 1.9], [0, 1.9]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const stemGeo = new THREE.LatheGeometry([[0, 0.1], [0.62, 0.1], [0.6, 0.24], [0.3, 0.3], [0.16, 0.45], [0.14, 0.62], [0.3, 0.72], [0, 0.74]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
  const handleGeo = new THREE.TorusGeometry(0.36, 0.08, 10, 24, Math.PI * 1.3);
  const starShape = (() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.15 : 0.34, a = i / 10 * TAU + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return s; })();
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }); starGeo.center();
  const pedGeo1 = new THREE.CylinderGeometry(1.35, 1.5, 0.45, 40), pedGeo2 = new THREE.CylinderGeometry(1.1, 1.2, 0.35, 40), ringGeo = new THREE.TorusGeometry(1.42, 0.05, 8, 48);
  const gold = new THREE.MeshStandardMaterial({ color: '#ffd36a', metalness: 1, roughness: 0.25 });
  const marble = new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.3, metalness: 0.05 });
  const lockedMat = new THREE.MeshStandardMaterial({ color: '#4a3a66', metalness: 0.7, roughness: 0.32, emissive: '#2a1840', transparent: true, opacity: 0.88 });
  const TIERC = ['#ffd84a', '#e3ebf5', '#e8a46a'];

  function makeLock() { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.22), gold); g.add(body);
    const sh = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: '#e8e2f2', metalness: 1, roughness: 0.2 })); sh.position.y = 0.25; g.add(sh);
    const kh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 10), new THREE.MeshBasicMaterial({ color: '#3a2050' })); kh.rotation.x = Math.PI / 2; kh.position.set(0, -0.02, 0.06); g.add(kh); return g; }

  const items = cups.map((c, i) => {
    const root = new THREE.Group(); scene.add(root);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; root.add(shadow);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(c.color), opacity: 0 })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; root.add(glow);
    const ped = new THREE.Group(); root.add(ped);
    const p1 = new THREE.Mesh(pedGeo1, marble); p1.position.y = 0.225; ped.add(p1);
    const p2 = new THREE.Mesh(pedGeo2, marble); p2.position.y = 0.62; ped.add(p2);
    const ringM = new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 0.25, metalness: 0.6, roughness: 0.3 });
    const r1 = new THREE.Mesh(ringGeo, ringM); r1.rotation.x = Math.PI / 2; r1.position.y = 0.45; ped.add(r1);
    const trophy = new THREE.Group(); trophy.position.y = 0.8; root.add(trophy);
    const spin = new THREE.Group(); trophy.add(spin);
    const metal = new THREE.MeshStandardMaterial({ color: c.trophy, metalness: 0.9, roughness: 0.18, emissive: c.trophy, emissiveIntensity: 0.08 });
    const parts = [];
    const add = (geo, mat, pos, rot, sc) => { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (sc) m.scale.setScalar(sc); spin.add(m); parts.push(m); return m; };
    add(stemGeo, gold); add(cupGeo, metal);
    add(new THREE.CylinderGeometry(0.9, 0.9, 0.02, 32), new THREE.MeshStandardMaterial({ color: '#fff4fa', metalness: 0.3, roughness: 0.2 }), [0, 2.08, 0]);
    for (const s of [-1, 1]) add(handleGeo, gold, [s * 1.05, 1.62, 0], [0, 0, s > 0 ? -0.65 * Math.PI : 0.35 * Math.PI]);
    const star = add(starGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.15, emissive: '#ffffff', emissiveIntensity: 0.35 }), [0, 1.55, 1.0]);
    const starB = add(starGeo, star.material, [0, 1.55, -1.0], [0, Math.PI, 0]);
    // banda dorada
    add(new THREE.TorusGeometry(1.0, 0.05, 8, 40), gold, [0, 1.3, 0], [Math.PI / 2, 0, 0]);
    const lock = makeLock(); lock.position.set(0, 1.5, 1.4); trophy.add(lock);
    // medalla del resultado
    const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 24), new THREE.MeshStandardMaterial({ color: TIERC[0], metalness: 1, roughness: 0.2 })); medal.rotation.x = Math.PI / 2; medal.position.set(0, 0.62, 1.22); root.add(medal);
    return { c, root, trophy, spin, parts, metal, star, starB, lock, medal, glow, shadow, ringM, locked: false, pop: 0, x: 0 };
  });

  // --- chispas alrededor de la copa elegida ---
  const SP = 60, spPos = new Float32Array(SP * 3), spSeed = [];
  for (let i = 0; i < SP; i++) spSeed.push([Math.random() * TAU, 0.9 + Math.random() * 1.4, Math.random() * 3, 0.3 + Math.random()]);
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const starTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.2, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(30, 4, 4, 56); g.fillRect(4, 30, 56, 4); });
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ map: starTex, size: 0.32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(cups[0].color).lerp(new THREE.Color('#fff'), 0.5) }));
  scene.add(sparks);
  // estallido al elegir
  const BP = 80, bPos = new Float32Array(BP * 3), bVel = [];
  const bGeo = new THREE.BufferGeometry(); bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
  const burst = new THREE.Points(bGeo, new THREE.PointsMaterial({ map: starTex, size: 0.45, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#fff3b0' })); burst.visible = false; scene.add(burst);

  const st = { pos: 0, target: 0, drag: false, sel: 0, chooseT: -1, onChoose: null, aspect: 1, gap: 3, view: 0, w: 0, h: 0 };

  function setState(sel, getInfo) {
    items.forEach((it, i) => { const inf = getInfo(it.c, i); it.locked = !inf.unlocked;
      for (const p of it.parts) p.visible = true;
      it.spin.children.forEach(m => { if (m.material === it.metal || m.material === lockedMat) m.material = it.locked ? lockedMat : it.metal; });
      it.star.visible = it.starB.visible = !it.locked; it.lock.visible = it.locked;
      it.medal.visible = !it.locked && inf.tier != null; if (inf.tier != null) it.medal.material.color.set(TIERC[inf.tier] || TIERC[0]);
      it.ringM.color.set(it.locked ? '#6a5a86' : it.c.color); it.ringM.emissive.set(it.locked ? '#000' : it.c.color);
    });
    st.sel = st.target = sel; if (!st.drag) st.pos = sel; st.chooseT = -1; burst.visible = false;
  }
  function select(i) { i = Math.max(0, Math.min(N - 1, i)); if (i !== st.sel) { items[st.sel].out = 1; items[i].pop = 1; } st.sel = st.target = i; }

  function layout() {
    const W = innerWidth, H = innerHeight; if (W === st.w && H === st.h) return; st.w = W; st.h = H;
    const a = W / H; cam.aspect = a; cam.fov = a < 1 ? 46 : 36;
    // vertical: el carrusel sube (panel abajo); horizontal: se va a la izquierda (panel a la derecha)
    if (a < 1) cam.setViewOffset(W, H, 0, H * 0.26, W, H); else cam.setViewOffset(W, H, W * 0.27, H * 0.04, W, H);
    cam.updateProjectionMatrix();
    const dist = 11, halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist, halfW = halfH * a * (a < 1 ? 1 : 0.62);
    st.gap = Math.max(2.5, Math.min(4.6, halfW * (a < 1 ? 1.05 : 0.95)));
    st.view = a;
  }

  function update(dt, t) {
    layout();
    if (!st.drag) st.pos += (st.target - st.pos) * Math.min(1, dt * 9);
    const a = st.view, choosing = st.chooseT >= 0;
    if (choosing) st.chooseT += dt;
    const ct = choosing ? Math.min(1, st.chooseT / 0.7) : 0;
    const camZ = (a < 1 ? 13 / Math.max(0.45, a) * 0.55 + 3 : 14) - ct * 3;
    cam.position.set(Math.sin(t * 0.2) * 1.5, 4.2 - ct * 0.8, camZ); cam.lookAt(0, 2.2, 0);
    const near = items[st.sel];
    bgU.time.value = t; bgU.tint.value.lerp(new THREE.Color(near.locked ? '#8a7aa6' : near.c.color), Math.min(1, dt * 4));
    rays.material.color.copy(bgU.tint.value); rays.rotation.z = t * 0.12; rays.material.opacity = 0.2 + Math.sin(t * 1.5) * 0.05 + ct * 0.4;
    items.forEach((it, i) => {
      const sel = i === st.sel; it.root.visible = sel || it.out > 0;
      if (sel) it.out = 0; else it.out = Math.max(0, (it.out || 0) - dt * 4);
      const sc = sel ? 1.25 * (1 - it.pop * 0.35 + Math.sin(it.pop * Math.PI) * 0.25) : 1.25 * it.out;
      it.root.position.set(0, 0, 0); it.root.scale.setScalar(Math.max(0.001, sc)); it.root.rotation.y = 0;
      it.spin.rotation.y = t * (it.locked ? 0.35 : 0.8) + it.pop * 4 + (sel && choosing ? st.chooseT * st.chooseT * 18 : 0);
      it.trophy.position.y = 0.8 + Math.sin(t * 2) * 0.08 + 0.12 + (sel && choosing ? Math.sin(ct * Math.PI) * 0.9 : 0);
      it.lock.rotation.y = Math.sin(t * 1.4 + i) * 0.4; it.lock.position.y = 1.5 + Math.sin(t * 2.2 + i) * 0.08;
      it.glow.material.opacity = it.locked ? 0.25 : 0.8 + Math.sin(t * 3) * 0.15 + (sel ? ct : 0);
      it.ringM.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
      it.pop = Math.max(0, it.pop - dt * 2.5);
    });
    land.update(t, bgU.tint.value);
    const ci = items[st.sel];
    ci.root.updateMatrixWorld();
    const base = ci.root.position, scl = ci.root.scale.x;
    for (let i = 0; i < SP; i++) { const [ph, r, h, sp] = spSeed[i]; const a2 = ph + t * sp * 0.7, y = ((h + t * sp * 0.5) % 3);
      spPos[i * 3] = base.x + Math.cos(a2) * r * 1.15 * scl; spPos[i * 3 + 1] = 0.8 + y * scl; spPos[i * 3 + 2] = base.z + Math.sin(a2) * r * 0.8 * scl; }
    spGeo.attributes.position.needsUpdate = true; sparks.visible = !ci.locked; sparks.material.color.copy(bgU.tint.value).lerp(new THREE.Color('#fff'), 0.55);
    if (burst.visible) { for (let i = 0; i < BP; i++) { const v = bVel[i]; v[1] -= dt * 6; bPos[i * 3] += v[0] * dt; bPos[i * 3 + 1] += v[1] * dt; bPos[i * 3 + 2] += v[2] * dt; } bGeo.attributes.position.needsUpdate = true; burst.material.opacity = Math.max(0, 1 - st.chooseT / 1.1); }
    if (choosing && st.chooseT > 0.75 && st.onChoose) { const f = st.onChoose; st.onChoose = null; f(); }
  }

  function choose(cb) {
    const it = items[st.sel]; st.chooseT = 0; st.onChoose = cb; burst.visible = true; bVel.length = 0;
    for (let i = 0; i < BP; i++) { bPos[i * 3] = it.root.position.x; bPos[i * 3 + 1] = 2.2; bPos[i * 3 + 2] = it.root.position.z; const a = Math.random() * TAU, u = Math.random() * 2 - 1, sp = 3 + Math.random() * 5; bVel.push([Math.cos(a) * Math.sqrt(1 - u * u) * sp, Math.abs(u) * sp + 2, Math.sin(a) * Math.sqrt(1 - u * u) * sp]); }
    burst.material.color.set(new THREE.Color(it.c.color).lerp(new THREE.Color('#fff'), 0.5));
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) { cam.updateMatrixWorld(); ndc.set(clientX / innerWidth * 2 - 1, -clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, cam);
    let best = -1, bd = 1e9; items.forEach((it, i) => { if (!it.root.visible) return; const hits = ray.intersectObject(it.root, true); if (hits.length && hits[0].distance < bd) { bd = hits[0].distance; best = i; } }); return best; }

  return { scene, cam, update, setState, select, choose, pick, st, items, get gap() { return st.gap; } };
}
