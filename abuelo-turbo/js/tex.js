import { THREE, rng, TAU } from './util.js?v=4';
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.roundRect ? x.roundRect(a, b, w, h, r) : x.rect(a, b, w, h); };

/* ---------- facade (12m x 12m per tile, 3x3 cells of 4m) ---------- */
export function facadeTex(kind) {
  const S = 512, cs = S / 3, R = rng(kind.length * 977 + kind.charCodeAt(0));
  const [c, x] = mkc(S, S), [ce, xe] = mkc(S, S);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S); xe.fillStyle = '#000'; xe.fillRect(0, 0, S, S);
  if (kind === 'poligono') {
    x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 8) { x.fillStyle = i % 16 ? '#d6d6d6' : '#f2f2f2'; x.fillRect(i, 0, 4, S); }
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
      const px = q * cs, py = r * cs;
      if (r === 0) { x.fillStyle = '#4d5560'; x.fillRect(px + 10, py + cs * 0.3, cs - 20, cs * 0.28); x.fillStyle = '#8fb0cc'; x.fillRect(px + 14, py + cs * 0.33, cs - 28, cs * 0.2); }
      else if (r === 2 && q === 1) { x.fillStyle = '#6a7380'; x.fillRect(px + 20, py + 10, cs - 40, cs - 10); for (let k = 0; k < 9; k++) { x.fillStyle = '#585f6b'; x.fillRect(px + 20, py + 14 + k * 14, cs - 40, 3); } x.fillStyle = '#e8c21a'; x.fillRect(px + 20, py + 4, cs - 40, 8); }
      else if (r === 1 && R() < 0.5) { x.fillStyle = '#3d4450'; x.fillRect(px + 40, py + 40, 50, 30); x.fillStyle = '#9fc2dc'; x.fillRect(px + 44, py + 44, 42, 22); }
    }
    for (let q = 0; q < 3; q++) if (R() < 0.7) { xe.fillStyle = '#ffd89a'; xe.fillRect(q * cs + 14, cs * 0.33, cs - 28, cs * 0.2); }
  } else {
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
      const px = q * cs, py = r * cs;
      if (kind === 'noche') {
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
          const wx = px + 12 + a * (cs - 20) / 3, wy = py + 12 + b * (cs - 20) / 3, ww = (cs - 20) / 3 - 8, wh = (cs - 20) / 3 - 10;
          x.fillStyle = '#6a7fa8'; x.fillRect(wx, wy, ww, wh);
          if (R() < 0.62) { const col = ['#ffcf6a', '#6af4ff', '#ff6ad8', '#fff2c0', '#9a8cff'][Math.floor(R() * 5)]; xe.fillStyle = col; xe.fillRect(wx, wy, ww, wh); x.fillStyle = '#ffffff'; x.fillRect(wx, wy, ww, wh); }
        }
      } else {
        const ww = kind === 'playa' ? 100 : 62, wh = kind === 'playa' ? 70 : 92; const wx = px + (cs - ww) / 2, wy = py + (cs - wh) / 2 - 6;
        if (kind === 'barrio' || kind === 'fiestas' || kind === 'mercado') {
          x.fillStyle = '#e8e2d8'; x.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
          const g = x.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#9bc6ee'); g.addColorStop(1, '#4f78a4'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
          x.fillStyle = '#e8e2d8'; x.fillRect(wx + ww / 2 - 2, wy, 4, wh); x.fillRect(wx, wy + wh * 0.4, ww, 4);
          if ((q + r) % 2 === 0 || kind === 'fiestas') { const sh = kind === 'fiestas' ? '#6a3f22' : (kind === 'mercado' ? '#c4572a' : '#3f8a4c'); x.fillStyle = sh; x.fillRect(wx - 26, wy - 4, 22, wh + 8); x.fillRect(wx + ww + 4, wy - 4, 22, wh + 8); x.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 8; k++) { x.fillRect(wx - 26, wy + k * 12, 22, 2); x.fillRect(wx + ww + 4, wy + k * 12, 22, 2); } }
          if (r < 2) { x.fillStyle = '#33383f'; x.fillRect(wx - 10, wy + wh + 4, ww + 20, 5); for (let k = 0; k < 9; k++) x.fillRect(wx - 8 + k * (ww + 16) / 8, wy + wh - 18, 2, 22); }
          if (r < 2 && R() < 0.8) { for (let k = 0; k < 5; k++) { x.fillStyle = ['#e8426a', '#ffd23c', '#ff7a3c', '#ff9ad0'][Math.floor(R() * 4)]; x.beginPath(); x.arc(wx - 4 + k * (ww + 8) / 4, wy + wh - 20 + R() * 4, 6, 0, TAU); x.fill(); } x.fillStyle = '#3d9a4a'; x.fillRect(wx - 8, wy + wh - 14, ww + 16, 8); }
          if (kind === 'fiestas' && R() < 0.5) { xe.fillStyle = '#ffd08a'; xe.fillRect(wx, wy, ww, wh); }
        } else if (kind === 'playa') {
          x.fillStyle = '#dfe9f2'; x.fillRect(px + 4, py + cs - 24, cs - 8, 14);
          const g = x.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#8fdcff'); g.addColorStop(1, '#3a9ad8'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh); x.fillStyle = '#f2f6fa'; x.fillRect(wx + ww / 2 - 2, wy, 4, wh);
          x.fillStyle = 'rgba(160,220,255,.7)'; x.fillRect(px + 4, py + cs - 66, cs - 8, 42); x.fillStyle = '#ffffff'; for (let k = 0; k < 8; k++) x.fillRect(px + 8 + k * 24, py + cs - 66, 2, 42);
        }
      }
    }
  }
  const t = tex(c), te = tex(ce); return { map: t, em: te };
}

/* ---------- road tile (9m wide x 30m long) ---------- */
export function roadTex(kind) {
  const W = 256, H = 1024, mx = W / 9, my = H / 30, R = rng(41 + kind.length);
  const [c, x] = mkc(W, H), [ce, xe] = mkc(W, H);
  const base = { barrio: '#4b4e57', mercado: '#7a6a58', playa: '#8b8079', poligono: '#43454b', fiestas: '#4e4655', noche: '#1b1a30' }[kind];
  x.fillStyle = base; x.fillRect(0, 0, W, H); xe.fillStyle = '#000'; xe.fillRect(0, 0, W, H);
  const dots = kind === 'mercado' ? 0 : 3000; for (let i = 0; i < dots; i++) { const v = R() * 40 - 20; x.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 260})`; x.fillRect(R() * W, R() * H, 2, 2); }
  if (kind === 'mercado') { for (let r = 0; r < H / 16; r++) for (let q = 0; q < W / 16; q++) { const v = 0.82 + R() * 0.3; x.fillStyle = `rgba(${(122 * v) | 0},${(106 * v) | 0},${(88 * v) | 0},1)`; rr(x, q * 16 + (r % 2 ? 8 : 0) - 8, r * 16, 15, 15, 5); x.fill(); } }
  if (kind === 'playa') { x.fillStyle = 'rgba(160,140,110,.35)'; for (let r = 0; r < H / 32; r++) { x.fillRect(0, r * 32, W, 2); } for (let q = 0; q < 9; q++) x.fillRect(q * mx, 0, 2, H); }
  const line = (x0, w, col, dash, em) => { const g = em ? xe : x; g.fillStyle = col; if (!dash) g.fillRect((x0 + 4.5) * mx - w / 2, 0, w, H); else for (let z = 0; z < 30; z += 6) g.fillRect((x0 + 4.5) * mx - w / 2, z * my, w, 3 * my); };
  const lc = kind === 'noche' ? '#6af4ff' : '#f2f2f2';
  line(-1.2, 5, lc, true); line(1.2, 5, lc, true);
  line(-4.15, 6, kind === 'poligono' ? '#e8c21a' : (kind === 'noche' ? '#ff6ad8' : '#f2f2f2'), false); line(4.15, 6, kind === 'poligono' ? '#e8c21a' : (kind === 'noche' ? '#ff6ad8' : '#f2f2f2'), false);
  if (kind === 'noche') { line(-1.2, 5, '#6af4ff', true, true); line(1.2, 5, '#6af4ff', true, true); line(-4.15, 6, '#ff6ad8', false, true); line(4.15, 6, '#ff6ad8', false, true); x.fillStyle = 'rgba(120,100,220,.18)'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(R() * W, R() * H, 20 + R() * 30, 10 + R() * 25, 0, 0, TAU); x.fill(); } }
  if (kind === 'fiestas') for (let i = 0; i < 260; i++) { x.fillStyle = ['#ff4f8a', '#ffd23c', '#4fe8ff', '#7bff4f', '#ffffff'][i % 5]; x.fillRect(R() * W, R() * H, 4, 3); }
  if (kind === 'poligono') for (let z = 4; z < 30; z += 15) { x.fillStyle = 'rgba(230,194,26,.8)'; for (let k = 0; k < 6; k++) { x.save(); x.translate((-4.15 + 4.5) * mx + 6, z * my + k * 18); x.rotate(0.6); x.fillRect(0, 0, 30, 8); x.restore(); } }
  /* detalles de asfalto: rodadas, parches, grietas y alcantarillas */
  if (kind !== 'mercado') {
    for (const lx of [-2.4, 0, 2.4]) for (const off of [-0.72, 0.72]) { const px = (lx + off + 4.5) * mx; const gr = x.createLinearGradient(px - 9, 0, px + 9, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, kind === 'noche' ? 'rgba(0,0,0,.22)' : 'rgba(0,0,0,.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(px - 9, 0, 18, H); }
    for (let i = 0; i < 3; i++) { const pw = 30 + R() * 50, ph = 40 + R() * 90; x.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},.045)`; x.fillRect(R() * (W - pw), R() * (H - ph), pw, ph); }
    x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 1.2; for (let i = 0; i < 7; i++) { let cx2 = R() * W, cy2 = R() * H; x.beginPath(); x.moveTo(cx2, cy2); for (let k = 0; k < 5; k++) { cx2 += (R() - 0.5) * 30; cy2 += R() * 26; x.lineTo(cx2, cy2); } x.stroke(); }
    const mh = (px, py) => { x.fillStyle = 'rgba(30,32,38,.9)'; x.beginPath(); x.arc(px, py, 15, 0, TAU); x.fill(); x.strokeStyle = 'rgba(150,155,165,.7)'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, 15, 0, TAU); x.stroke(); x.beginPath(); x.arc(px, py, 9, 0, TAU); x.stroke(); x.beginPath(); x.moveTo(px - 15, py); x.lineTo(px + 15, py); x.moveTo(px, py - 15); x.lineTo(px, py + 15); x.stroke(); };
    mh((-2.4 + 0.9 + 4.5) * mx, 180 + R() * 200); mh((2.4 - 0.9 + 4.5) * mx, 620 + R() * 260);
    x.fillStyle = 'rgba(25,26,30,.8)'; for (let k = 0; k < 4; k++) x.fillRect((4.15 + 4.5 - 0.7) * mx, 760 + k * 6, 20, 3); // sumidero junto al bordillo
  }
  const t = tex(c), te = tex(ce); t.repeat.set(1, 1); return { map: t, em: te };
}

/* ---------- sign atlas 4x4 cells (cell 15 = solid white) ---------- */
export const SIGNS = [
  ['BAR PACO', '#ff4f6a', '#2a0f18'], ['CHURROS', '#ffcf3a', '#3a2008'], ['FARMACIA', '#3aff9a', '#0b2a1c'], ['ESTANCO', '#ff9a3a', '#2a1608'],
  ['PELUQUERÍA', '#ff6ad8', '#2a0b26'], ['TAPAS', '#ffd23c', '#2a1e08'], ['KARAOKE', '#6af4ff', '#0a2430'], ['24 H', '#ff5a5a', '#2a0b0b'],
  ['CHIRINGUITO', '#ffe23c', '#0a3a5a'], ['HELADOS', '#ff8fd1', '#3a1a4a'], ['VERBENA', '#ffe23c', '#4a1250'], ['DISCO', '#b78cff', '#16093a'],
  ['TALLERES', '#ffb02a', '#1c1c20'], ['RAMEN', '#ff6a3a', '#1a0f20'], ['HOTEL', '#6af4ff', '#12183a'], ['', '#ffffff', '#ffffff'],
];
export function signAtlas() {
  const [c, x] = mkc(1024, 512);
  SIGNS.forEach((s, i) => {
    const cx = (i % 4) * 256, cy = Math.floor(i / 4) * 128;
    if (i === 15) { x.fillStyle = '#fff'; x.fillRect(cx, cy, 256, 128); return; }
    x.fillStyle = s[2]; rr(x, cx + 3, cy + 3, 250, 122, 18); x.fill(); x.lineWidth = 6; x.strokeStyle = s[1]; x.shadowColor = s[1]; x.shadowBlur = 12; rr(x, cx + 8, cy + 8, 240, 112, 14); x.stroke();
    x.font = '700 ' + (s[0].length > 8 ? 40 : 52) + 'px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.shadowBlur = 16; x.fillText(s[0], cx + 128, cy + 66); x.shadowBlur = 0; x.lineWidth = 2; x.strokeStyle = s[1]; x.strokeText(s[0], cx + 128, cy + 66);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function signUV(i) { const u0 = (i % 4) / 4, v1 = 1 - Math.floor(i / 4) / 4; return [u0 + 0.004, v1 - 0.25 + 0.006, u0 + 0.25 - 0.004, v1 - 0.006]; }

/* ---------- district banner (text on arch) ---------- */
export function bannerTex(text, sub, c1, c2) {
  const [c, x] = mkc(1024, 256);
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; rr(x, 8, 8, 1008, 240, 40); x.fill();
  x.lineWidth = 12; x.strokeStyle = '#fff'; rr(x, 14, 14, 996, 228, 36); x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 8; x.shadowOffsetY = 5;
  x.font = '700 40px Fredoka, sans-serif'; x.fillText('¡BIENVENIDOS A!', 512, 70);
  let fs = 108; x.font = `700 ${fs}px Fredoka, sans-serif`; while (x.measureText(text.toUpperCase()).width > 900) { fs -= 6; x.font = `700 ${fs}px Fredoka, sans-serif`; }
  x.fillText(text.toUpperCase(), 512, 150); x.font = '500 34px Fredoka, sans-serif'; x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,.9)'; x.fillText(sub, 512, 218);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* ---------- sky cylinder texture (2048x256, horizon at y=128) ---------- */
export function skyTex(kind, d) {
  const W = 2048, H = 256, hz = 128, R = rng(7 + kind.length * 31);
  const [c, x] = mkc(W, H); const s = d.sky;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, s[0]); g.addColorStop(0.28, s[1]); g.addColorStop(0.5, s[2]); g.addColorStop(0.505, s[3]); g.addColorStop(1, s[3]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const fog = '#' + d.fog.toString(16).padStart(6, '0');
  const blob = (cx, cy, rx, ry, col, a) => { x.fillStyle = col; x.globalAlpha = a; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); x.fill(); x.globalAlpha = 1; };
  const wrap = fn => { fn(0); fn(-W); fn(W); };
  const sunAt = 1024 + 80;
  if (kind === 'noche' || kind === 'fiestas') {
    for (let i = 0; i < (kind === 'noche' ? 260 : 190); i++) { const a = 0.4 + R() * 0.6; x.fillStyle = `rgba(255,255,255,${a})`; const sz = R() < 0.1 ? 3 : 2; x.fillRect(R() * W, R() * (hz - 14), sz, sz); }
    const mx = sunAt - 300; const gm = x.createRadialGradient(mx, 50, 0, mx, 50, 90); gm.addColorStop(0, 'rgba(255,255,230,.9)'); gm.addColorStop(0.2, 'rgba(255,250,210,.5)'); gm.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = gm; x.fillRect(mx - 90, 0, 180, 140);
    x.fillStyle = '#fffbe0'; x.beginPath(); x.arc(mx, 50, 20, 0, TAU); x.fill(); x.fillStyle = '#e8e0b8'; x.beginPath(); x.arc(mx - 6, 44, 4, 0, TAU); x.fill(); x.beginPath(); x.arc(mx + 7, 55, 3, 0, TAU); x.fill();
  } else {
    const gm = x.createRadialGradient(sunAt, 62, 0, sunAt, 62, 130); gm.addColorStop(0, 'rgba(255,255,235,1)'); gm.addColorStop(0.12, 'rgba(255,248,200,.9)'); gm.addColorStop(0.4, 'rgba(255,240,190,.25)'); gm.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = gm; x.fillRect(sunAt - 130, 0, 260, hz + 20);
    wrap(o => { const pol = kind === 'poligono'; for (let i = 0; i < 16; i++) { const cx = o + R() * W, cy = 20 + R() * 66, k = 0.6 + R() * 0.8;
      for (let j = 0; j < 5; j++) blob(cx + (j - 2) * 22 * k, cy + 7 * k + (j % 2) * 4, 30 * k, 9 * k, pol ? '#a9a4a8' : '#cfdcf0', pol ? 0.4 : 0.55);                       // base sombreada
      for (let j = 0; j < 5; j++) blob(cx + (j - 2) * 22 * k, cy + (j % 2) * 4, 30 * k, 10 * k, pol ? '#c9c4c8' : '#ffffff', pol ? 0.5 : 0.8);
      for (let j = 0; j < 3; j++) blob(cx + (j - 1) * 24 * k, cy - 8 * k - (j % 2) * 4, 20 * k, 11 * k, pol ? '#d8d4d8' : '#ffffff', pol ? 0.5 : 0.9); } // torreones
    for (let i = 0; i < 10; i++) { x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 2 + R() * 2; const sx = o + R() * W, sy = 8 + R() * 40; x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(sx + 60, sy - 6, sx + 130 + R() * 80, sy + 2); x.stroke(); } // cirros
    if (!pol) for (let i = 0; i < 6; i++) { const bx = o + R() * W, by = 22 + R() * 40; x.strokeStyle = 'rgba(40,50,70,.55)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(bx - 6, by - 3); x.quadraticCurveTo(bx - 3, by - 6, bx, by); x.quadraticCurveTo(bx + 3, by - 6, bx + 6, by - 3); x.stroke(); } }); // pajaritos
  }
  // distant silhouettes
  const sil = '#' + new THREE.Color(d.fog).multiplyScalar(kind === 'noche' ? 0.55 : (kind === 'fiestas' ? 0.55 : 0.82)).getHexString();
  const sil2 = '#' + new THREE.Color(d.fog).multiplyScalar(kind === 'noche' ? 0.4 : (kind === 'fiestas' ? 0.42 : 0.7)).getHexString();
  x.fillStyle = sil;
  if (kind !== 'playa') { x.beginPath(); x.moveTo(0, hz); for (let i = 0; i <= W; i += 16) x.lineTo(i, hz - 8 - (Math.sin(i * 0.011) * 8 + Math.sin(i * 0.031 + 2) * 5 + Math.sin(i * 0.0053) * 10 + 10)); x.lineTo(W, hz); x.fill(); }
  x.fillStyle = sil2;
  if (kind === 'barrio' || kind === 'mercado') { for (let i = 0; i < 70; i++) { const bx = R() * W, bw = 12 + R() * 22, bh = 12 + R() * 34; x.fillRect(bx, hz - bh, bw, bh); if (R() < 0.15) { x.beginPath(); x.moveTo(bx, hz - bh); x.lineTo(bx + bw / 2, hz - bh - 14); x.lineTo(bx + bw, hz - bh); x.fill(); } } }
  if (kind === 'playa') { x.fillStyle = sil; x.beginPath(); x.moveTo(0, hz); for (let i = 0; i <= W; i += 16) x.lineTo(i, hz - 3 - Math.max(0, Math.sin(i * 0.004 + 1) * 26 + Math.sin(i * 0.012) * 6)); x.lineTo(W, hz); x.fill(); const sea = x.createLinearGradient(0, hz - 6, 0, hz + 14); sea.addColorStop(0, '#5ac8e8'); sea.addColorStop(1, '#cdf2ff'); x.fillStyle = sea; x.fillRect(0, hz - 4, W, 10); for (let i = 0; i < 12; i++) { const bx = R() * W; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(bx, hz - 3); x.lineTo(bx + 8, hz - 3); x.lineTo(bx + 4, hz - 16); x.fill(); } }
  if (kind === 'poligono') { for (let i = 0; i < 40; i++) { const bx = R() * W, bw = 20 + R() * 50, bh = 10 + R() * 22; x.fillRect(bx, hz - bh, bw, bh); } for (let i = 0; i < 14; i++) { const bx = R() * W, bh = 36 + R() * 40; x.fillRect(bx, hz - bh, 9, bh); x.globalAlpha = 0.5; for (let j = 0; j < 5; j++) { x.fillStyle = '#9a9296'; x.beginPath(); x.arc(bx + 5 + j * 8, hz - bh - 8 - j * 7, 8 + j * 3, 0, TAU); x.fill(); } x.globalAlpha = 1; x.fillStyle = sil2; } }
  if (kind === 'fiestas') { for (let i = 0; i < 60; i++) { const bx = R() * W, bw = 10 + R() * 22, bh = 8 + R() * 22; x.fillRect(bx, hz - bh, bw, bh); x.beginPath(); x.moveTo(bx - 2, hz - bh); x.lineTo(bx + bw / 2, hz - bh - 8); x.lineTo(bx + bw + 2, hz - bh); x.fill(); if (R() < 0.5) { x.fillStyle = '#ffd08a'; x.fillRect(bx + 3 + R() * (bw - 8), hz - bh + 3, 3, 4); x.fillStyle = sil2; } } for (const cx of [300, 1500]) { x.fillRect(cx, hz - 70, 14, 70); x.beginPath(); x.moveTo(cx - 2, hz - 70); x.lineTo(cx + 7, hz - 90); x.lineTo(cx + 16, hz - 70); x.fill(); } }
  if (kind === 'noche') { for (let i = 0; i < 90; i++) { const bx = R() * W, bw = 14 + R() * 26, bh = 20 + R() * 80; x.fillStyle = sil2; x.fillRect(bx, hz - bh, bw, bh); for (let k = 0; k < bh / 8; k++) if (R() < 0.35) { x.fillStyle = ['#ffcf6a', '#6af4ff', '#ff6ad8'][Math.floor(R() * 3)]; x.fillRect(bx + 2 + R() * (bw - 6), hz - bh + 2 + k * 8, 3, 3); } } const gl = x.createLinearGradient(0, hz - 40, 0, hz); gl.addColorStop(0, 'rgba(255,100,220,0)'); gl.addColorStop(1, 'rgba(255,100,220,.35)'); x.fillStyle = gl; x.fillRect(0, hz - 40, W, 40); }
  x.fillStyle = fog; x.fillRect(0, hz, W, H - hz);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 2; return t;
}
