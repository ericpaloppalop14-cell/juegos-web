// Mueblópolis: suelo de parquet, alfombras-manzana, paredes de papel pintado y generación de objetos
import * as THREE from 'three';
import { GB, lighten, darken } from './geo.js?v=9';
import { KINDS, getGeo, PAL } from './models.js?v=9';
import { PLACES } from './places.js?v=9';

export const HALF = 130;          // el torbellino se mueve en [-128, 128]
export const SPAWN = { x: 0, z: 98 };
export const PITCH = 43;
const BLOCKS = [-107.5, -64.5, -21.5, 21.5, 64.5, 107.5];
// 3x3 distritos de 86x86
export const DISTRICTS = {
  biblioteca: { name: 'Biblioteca Polvorienta', cx: -86, cz: -86, c: 0xb06a3b },
  armaropolis: { name: 'Armarópolis', cx: 0, cz: -86, c: 0x7b3fe4 },
  dormitorio: { name: 'Dormitorio Soñoliento', cx: 86, cz: -86, c: 0x6aa8ff },
  cocina: { name: 'Cocina Caótica', cx: -86, cz: 0, c: 0xff6b5e },
  plaza: { name: 'Plaza Mayor', cx: 0, cz: 0, c: 0xffc933 },
  bano: { name: 'Baño Burbujeante', cx: 86, cz: 0, c: 0x2fd0d8 },
  lavanderia: { name: 'Lavandería Loca', cx: -86, cz: 86, c: 0xffd23f },
  salon: { name: 'Salón Acogedor', cx: 0, cz: 86, c: 0xff8fb8 },
  jardin: { name: 'Jardín de la Terraza', cx: 86, cz: 86, c: 0x57c84d },
};
const BASE_D = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(DISTRICTS).map(([k, v]) => [k, { name: v.name, c: v.c }]))));
export function setDistrictStyle(place) { for (const k in DISTRICTS) { const src = place && place.districts ? place.districts[k] : BASE_D[k]; DISTRICTS[k].name = src.name; DISTRICTS[k].c = src.c; } }
export function districtAt(x, z) {
  const ix = x < -43 ? 0 : x < 43 ? 1 : 2, iz = z < -43 ? 0 : z < 43 ? 1 : 2;
  return [['biblioteca', 'armaropolis', 'dormitorio'], ['cocina', 'plaza', 'bano'], ['lavanderia', 'salon', 'jardin']][iz][ix];
}

export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// suaviza la textura (desenfoque que respeta el mosaico), la aclara a pastel y le da un volumen mullido
function softTex(c) {
  const w = c.width, h = c.height, o = document.createElement('canvas'); o.width = w; o.height = h; const g = o.getContext('2d');
  if ('filter' in g) g.filter = 'blur(' + (w / 256 * 1.3).toFixed(2) + 'px)';
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) g.drawImage(c, dx * w, dy * h);
  g.filter = 'none';
  g.fillStyle = 'rgba(255,248,250,0.11)'; g.fillRect(0, 0, w, h);
  const rg = g.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.78); rg.addColorStop(0, 'rgba(255,255,255,0.07)'); rg.addColorStop(1, 'rgba(120,70,150,0.07)');
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
  return o;
}
function canvasTex(w, h, draw, repeat, aniso = 8) {
  let c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  if (aniso >= 8 && w >= 256) c = softTex(c);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function parquetTex(rep) {
  return canvasTex(512, 512, (g, w, h) => {
    const base = ['#f6c987', '#f3bf78', '#f9d49a', '#efb56c', '#f7cc90'];
    const pw = h / 4;
    for (let r = 0; r < 4; r++) {
      let x = -((r * 97) % 200);
      while (x < w) {
        const L = 180 + ((r * 53 + x * 7) % 90);
        g.fillStyle = base[Math.abs((r * 3 + (x / 50 | 0))) % base.length]; g.fillRect(x, r * pw, L, pw);
        g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, r * pw, L, 5);
        g.fillStyle = 'rgba(150,80,30,.35)'; g.fillRect(x, r * pw + pw - 3, L, 3); g.fillRect(x + L - 3, r * pw, 3, pw);
        g.strokeStyle = 'rgba(190,110,50,.18)'; g.lineWidth = 2;
        for (let k = 0; k < 3; k++) { g.beginPath(); const yy = r * pw + 14 + k * 22; g.moveTo(x + 8, yy); g.bezierCurveTo(x + L * .3, yy - 6, x + L * .6, yy + 6, x + L - 8, yy); g.stroke(); }
        x += L;
      }
    }
  }, rep);
}
const RUGS = [
  { bg: 0xff8fb8, fg: 0xffe27a, ac: 0x7b3fe4, pat: 'diamond' }, { bg: 0x62d6c4, fg: 0xfff0d2, ac: 0xff6b5e, pat: 'stripes' },
  { bg: 0xffd23f, fg: 0xff7a59, ac: 0x1fa8d6, pat: 'dots' }, { bg: 0x8fb4ff, fg: 0xffffff, ac: 0xff74c4, pat: 'check' },
  { bg: 0xb9e86a, fg: 0xfff0d2, ac: 0xe8348a, pat: 'diamond' }, { bg: 0xc4a8ff, fg: 0xffe27a, ac: 0x1fc4d6, pat: 'dots' },
];
function rugTex(R) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = hex(R.bg); g.fillRect(0, 0, w, h);
    const m = 40;
    g.fillStyle = hex(R.fg); g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22); g.fillRect(0, 0, 22, h); g.fillRect(w - 22, 0, 22, h);
    g.strokeStyle = hex(R.ac); g.lineWidth = 8; g.strokeRect(34, 34, w - 68, h - 68);
    g.save(); g.beginPath(); g.rect(m + 10, m + 10, w - 2 * m - 20, h - 2 * m - 20); g.clip();
    if (R.pat === 'diamond') { for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { const cx = 50 + x * 54 + (y % 2) * 27, cy = 50 + y * 54; g.fillStyle = (x + y) % 2 ? hex(R.fg) : hex(R.ac); g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 22, cy); g.fill(); } }
    else if (R.pat === 'stripes') { for (let i = -10; i < 20; i++) { g.fillStyle = i % 2 ? hex(R.fg) : hex(R.ac); g.save(); g.translate(i * 44, 0); g.rotate(0.5); g.fillRect(0, -200, 22, 900); g.restore(); } }
    else if (R.pat === 'dots') { for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { g.fillStyle = (x + y) % 2 ? hex(R.fg) : hex(R.ac); g.beginPath(); g.arc(60 + x * 48, 60 + y * 48, 15, 0, 7); g.fill(); } }
    else { for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) { if ((x + y) % 2) { g.fillStyle = hex(R.fg); g.fillRect(m + x * 43, m + y * 43, 43, 43); } } g.fillStyle = hex(R.ac); g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 7); g.fill(); g.fillStyle = hex(R.fg); g.beginPath(); g.arc(w / 2, h / 2, 34, 0, 7); g.fill(); }
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
  }, null);
}
function wallTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fff2c9'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#ffd9ec' : '#c9f0ff'; g.fillRect(i * 64 + 8, 0, 48, h); }
    for (let y = 0; y < 4; y++) for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#ff74c4' : '#1fc4d6'; g.beginPath(); g.arc(i * 64 + 32, y * 64 + 32 + (i % 2) * 32, 7, 0, 7); g.fill(); }
  }, [14, 3]);
}
export function skyTex(place) {
  const sk = (place && place.sky) || ['#6bc2ff', '#b4e6ff', '#ffeedd', '#ffd6ea'], night = place && place.night;
  return canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, sk[0]); gr.addColorStop(0.45, sk[1]); gr.addColorStop(0.78, sk[2]); gr.addColorStop(1, sk[3]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(w * 0.72, h * 0.34, 4, w * 0.72, h * 0.34, h * 0.5); sun.addColorStop(0, 'rgba(255,250,220,.95)'); sun.addColorStop(0.18, 'rgba(255,244,200,.45)'); sun.addColorStop(1, 'rgba(255,244,200,0)'); g.fillStyle = sun; g.fillRect(0, 0, w, h);
    if (night) { g.fillStyle = 'rgba(255,255,230,.9)'; for (let i = 0; i < 60; i++) { const x = (i * 211) % w, y = ((i * 97) % 140); g.beginPath(); g.arc(x, y, 0.8 + (i % 3) * 0.5, 0, 7); g.fill(); } }
    g.fillStyle = night ? 'rgba(140,100,200,.3)' : 'rgba(255,255,255,.35)'; for (let i = 0; i < 9; i++) { const x = (i * 131) % w, y = h * (0.42 + ((i * 37) % 30) / 100); g.beginPath(); g.ellipse(x, y, 60 + (i % 3) * 26, 9 + (i % 2) * 5, 0, 0, 7); g.fill(); }
  }, null, 1);
}

// ---------- v4: suelos por patrón (lugares nuevos) ----------
function patTex(sp) {
  const A = sp.a, B = sp.b, Cc = sp.c || sp.b;
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = A; g.fillRect(0, 0, w, h);
    switch (sp.t) {
      case 'checker': for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? B : A; g.fillRect(x * 64, y * 64, 64, 64); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x * 64 + 3, y * 64 + 3, 58, 6); } break;
      case 'tiles': for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = [A, B, Cc, B][(x * 3 + y * 5) % 4]; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x * 64 + 4, y * 64 + 4, 56, 5); } break;
      case 'dots': for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) { g.fillStyle = (x + y) % 2 ? B : 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x * 56 + 28 + (y % 2) * 28, y * 56 + 28, 15, 0, 7); g.fill(); } break;
      case 'stripes': for (let i = -4; i < 10; i++) { g.fillStyle = i % 2 ? B : A; g.save(); g.translate(i * 48, 0); g.rotate(0.6); g.fillRect(0, -200, 24, 700); g.restore(); } break;
      case 'bricks': for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { g.fillStyle = [A, 'rgba(255,255,255,.12)', A][(r + c) % 3]; g.fillRect(c * 64 + (r % 2) * 32 - 32, r * 32 + 1, 62, 30); g.fillStyle = B; g.globalAlpha = 0.25; g.fillRect(c * 64 + (r % 2) * 32 - 32, r * 32 + 28, 62, 3); g.globalAlpha = 1; } break;
      case 'waves': g.lineWidth = 7; g.strokeStyle = B; for (let y = 0; y < 8; y++) { g.beginPath(); for (let x = 0; x <= 256; x += 8) g.lineTo(x, y * 32 + 16 + Math.sin((x / 256) * Math.PI * 4 + y) * 8); g.stroke(); } break;
      case 'clouds': for (let i = 0; i < 14; i++) { g.fillStyle = B; g.globalAlpha = 0.7; const x = (i * 83) % 256, y = (i * 61) % 256; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + k * 14 - 20, y + (k % 2) * 6, 14 + (k % 2) * 6, 0, 7); g.fill(); g.beginPath(); g.arc(x + k * 14 - 20 - 256, y + (k % 2) * 6, 14 + (k % 2) * 6, 0, 7); g.fill(); } g.globalAlpha = 1; } if (sp.stars) { g.fillStyle = '#ffe27a'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc((i * 71) % 256, (i * 113) % 256, 4, 0, 7); g.fill(); } } break;
      case 'grass': for (let i = 0; i < 90; i++) { g.fillStyle = [A, B, Cc][i % 3]; const x = (i * 97) % 256, y = (i * 53) % 256; g.fillRect(x, y, 3, 10); g.fillRect(x - 256, y, 3, 10); } g.fillStyle = B; for (let i = 0; i < 40; i++) g.fillRect((i * 131) % 256, (i * 71) % 256, 4, 9); break;
      case 'stars': for (let i = 0; i < 22; i++) { g.fillStyle = B; g.globalAlpha = 0.8; const x = (i * 61) % 256, y = (i * 97) % 256; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, rr = k % 2 ? 5 : 11; g.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); } g.fill(); g.globalAlpha = 1; } break;
    }
  }, [86 / 14, 86 / 14]);
}
const _hx = (n) => '#' + n.toString(16).padStart(6, '0');
function wallTexP(wl) {
  return canvasTex(256, 256, (g, w, h) => {
    if (wl.sky) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8ab8ff'); gr.addColorStop(1, wl.bg); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 6; i++) { const x = i * 46, y = 40 + (i * 53) % 170; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + k * 16, y + (k % 2) * 6, 14, 0, 7); g.fill(); } } g.fillStyle = wl.d1; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc((i * 37) % 256, (i * 91) % 256, 3, 0, 7); g.fill(); } return; }
    g.fillStyle = wl.bg; g.fillRect(0, 0, w, h);
    if (wl.stone) { for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { g.fillStyle = (r + c) % 2 ? wl.s1 : wl.s2; g.fillRect(c * 64 + (r % 2) * 32 - 32, r * 32 + 1, 62, 30); } g.fillStyle = wl.d1; g.fillRect(0, 124, w, 8); return; }
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? wl.s1 : wl.s2; g.fillRect(i * 64 + 8, 0, 48, h); }
    for (let y = 0; y < 4; y++) for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? wl.d1 : wl.d2; g.beginPath(); if (wl.night) { g.arc(i * 64 + 32, y * 64 + 32 + (i % 2) * 32, 5 + (i % 2) * 3, 0, 7); } else g.arc(i * 64 + 32, y * 64 + 32 + (i % 2) * 32, 7, 0, 7); g.fill(); }
  }, [14, 3]);
}

// ---------- suelos de cada distrito ----------
function floorTex(id, spec) {
  if (spec) return patTex(spec);
  const rep = [86 / 14, 86 / 14];
  switch (id) {
    case 'cocina': return canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#fff6e6' : '#ff8d7a'; g.fillRect(x * 64, y * 64, 64, 64); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x * 64 + 4, y * 64 + 4, 56, 6); g.strokeStyle = 'rgba(120,40,30,.2)'; g.strokeRect(x * 64 + .5, y * 64 + .5, 63, 63); } }, [86 / 16, 86 / 16]);
    case 'bano': return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7fe3e6'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = ['#a6f0f0', '#8ae9ee', '#c6f8f6', '#6fdce2'][(x * 3 + y * 5) % 4]; g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x * 32 + 4, y * 32 + 4, 12, 4); } }, [86 / 12, 86 / 12]);
    case 'jardin': return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7bd65a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = ['#6bc94d', '#8fe06b', '#5fbf45'][i % 3]; const x = (i * 97) % 256, y = (i * 53) % 256; g.fillRect(x, y, 3, 10); g.fillRect(x + 4, y + 3, 3, 8); } for (let i = 0; i < 12; i++) { const x = (i * 71 + 20) % 256, y = (i * 113 + 40) % 256; g.fillStyle = ['#fff', '#ffe27a', '#ff9fc4'][i % 3]; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.fillStyle = '#ffb300'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); } }, [86 / 18, 86 / 18]);
    case 'lavanderia': return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff1a8'; g.fillRect(0, 0, w, h); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#ffe376' : '#fff6c4'; g.fillRect(x * 64, y * 64, 64, 64); } for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(80,170,255,.55)'; g.lineWidth = 3; g.beginPath(); g.arc((i * 83) % 256, (i * 47 + 30) % 256, 8 + (i % 3) * 5, 0, 7); g.stroke(); } }, [86 / 16, 86 / 16]);
    case 'dormitorio': return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9ec8ff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(255,255,255,.55)'; const x = (i * 61) % 256, y = (i * 97) % 256; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 5 : 11, a = k * Math.PI / 5 - Math.PI / 2; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); } for (let y = 0; y < 256; y += 8) { g.fillStyle = 'rgba(120,150,230,.12)'; g.fillRect(0, y, 256, 2); } }, [86 / 18, 86 / 18]);
    case 'biblioteca': return canvasTex(256, 256, (g, w, h) => { for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { g.fillStyle = ['#c98a55', '#bb7a47', '#d79a63'][(r * 2 + c) % 3]; g.save(); g.translate(c * 64 + (r % 2) * 32, r * 32); g.fillRect(0, 0, 62, 30); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 0, 62, 3); g.restore(); g.fillStyle = 'rgba(80,40,20,.25)'; g.fillRect(0, r * 32 + 30, 256, 2); } }, [86 / 16, 86 / 16]);
    case 'plaza': return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffe6b5'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = ['#ffd9a0', '#ffeec9', '#ffcf94', '#fff3d8'][(x + y * 3) % 4]; const ox = (y % 2) * 16; g.beginPath(); g.roundRect ? g.roundRect(x * 32 + ox + 2, y * 32 + 2, 28, 28, 8) : g.rect(x * 32 + ox + 2, y * 32 + 2, 28, 28); g.fill(); } }, [86 / 14, 86 / 14]);
    case 'armaropolis': return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b79bff'; g.fillRect(0, 0, w, h); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#c8b0ff' : '#a98cf7'; g.fillRect(x * 64, y * 64, 64, 64); g.fillStyle = 'rgba(255,225,120,.6)'; g.fillRect(x * 64, y * 64, 64, 3); g.fillRect(x * 64, y * 64, 3, 64); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x * 64 + 8, y * 64 + 8, 22, 4); } }, [86 / 18, 86 / 18]);
    default: return parquetTex(rep);
  }
}
function signTex(txt, col) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = hex(col); g.beginPath(); g.roundRect ? g.roundRect(6, 6, w - 12, h - 12, 36) : g.rect(6, 6, w - 12, h - 12); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#fff'; g.stroke();
    g.font = '800 64px Fredoka, "Arial Rounded MT Bold", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 12; g.strokeStyle = 'rgba(40,20,70,.55)'; g.strokeText(txt, w / 2, h / 2 + 3); g.fillStyle = '#fff'; g.fillText(txt, w / 2, h / 2 + 3);
  }, null, 4);
}
function cloudGeo(seed) {
  const r = mulberry(seed), g = new GB();
  const n = 6 + (r() * 4 | 0);
  for (let i = 0; i < n; i++) g.sph(5 + r() * 6, 0xffffff, (i - n / 2) * 6 + r() * 3, r() * 3, r() * 5 - 2.5, 1.3, 0.8, 1, 10);
  return g.build(false, 0.1);
}

export function disposeScenery(scene, grp) {
  if (!grp) return; scene.remove(grp);
  const d = (o) => o.traverse((c) => { if (c.isMesh) { c.geometry && c.geometry.dispose(); const ms = Array.isArray(c.material) ? c.material : [c.material]; for (const m of ms) { if (m && m.map) m.map.dispose(); m && m.dispose && m.dispose(); } } });
  d(grp); for (const e of grp.userData.extras || []) { if (e.isMesh) { scene.remove(e); e.geometry.dispose(); } }
}
export function buildScenery(scene, place) {
  const P = place && !place.home ? place : null; const extras = [];
  const grp = new THREE.Group(); scene.add(grp); grp.userData.extras = extras;
  const floors = [];
  // suelos por distrito
  for (const id in DISTRICTS) {
    const D = DISTRICTS[id];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(86.3, 86.3), new THREE.MeshStandardMaterial({ map: floorTex(id, P && P.districts[id].floor), roughness: !P && id === 'armaropolis' ? 0.35 : 0.6, metalness: !P && id === 'armaropolis' ? 0.12 : 0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(D.cx, 0, D.cz); m.receiveShadow = true; grp.add(m);
  }
  // franjas de frontera entre distritos
  const bd = new GB();
  for (const t of [-43, 43]) { bd.box(260, 0.04, 1.4, 0xffffff, 0, 0.02, t); bd.box(1.4, 0.04, 260, 0xffffff, t, 0.02, 0); for (let k = -6; k <= 6; k++) { bd.box(6, 0.05, 0.7, P ? P.trim[2] : 0xffc933, k * 20, 0.03, t); bd.box(0.7, 0.05, 6, P ? P.trim[2] : 0xffc933, t, 0.03, k * 20); } }
  grp.add(new THREE.Mesh(bd.build(false, 0.1), new THREE.MeshBasicMaterial({ vertexColors: true })));
  // alfombras (manzanas)
  const RG = P ? P.rugs.map(([bg, fg, ac, pat]) => ({ bg, fg, ac, pat })) : RUGS; const rugTexs = RG.map(rugTex);
  let n = 0;
  for (const bz of BLOCKS) for (const bx of BLOCKS) {
    const ri = (n * 5 + (n >> 2) * 3) % RG.length, R = RG[ri];
    const top = new THREE.MeshStandardMaterial({ map: rugTexs[ri], roughness: 0.95 }); const sm = new THREE.MeshStandardMaterial({ color: R.fg, roughness: 0.95 });
    const rug = new THREE.Mesh(new THREE.BoxGeometry(34, 0.22, 34), [sm, sm, top, sm, sm, sm]);
    rug.position.set(bx, 0.11, bz); rug.receiveShadow = true; grp.add(rug); n++;
    const fr = new GB(); for (let i = -16; i <= 16; i += 1) { fr.box(0.14, 0.08, 0.7, R.fg, bx + i, 0.02, bz + 17.2); fr.box(0.14, 0.08, 0.7, R.fg, bx + i, 0.02, bz - 17.2); }
    grp.add(new THREE.Mesh(fr.build(false, 0.1), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
  }
  // carteles de distrito (poste + panel)
  for (const id in DISTRICTS) {
    const D = DISTRICTS[id]; const sx = D.cx + (D.cx > 0 ? -34 : 34), sz = D.cz + (D.cz > 0 ? -38 : 38);
    const post = new GB(); post.cyl(0.35, 0.45, 9, 0xfff7e0, 0, 0, 0, 8); post.sph(0.6, D.c, 0, 9.2, 0, 1, 1, 1, 8);
    const pm = new THREE.Mesh(post.build(false, 0.1), propMaterialLite.clone()); pm.material.transparent = true; pm.position.set(sx, 0, sz); pm.castShadow = true; grp.add(pm);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.125), new THREE.MeshBasicMaterial({ map: signTex(D.name.toUpperCase(), D.c), transparent: true, side: THREE.DoubleSide, fog: false }));
    sg.position.set(sx, 11.2, sz); sg.rotation.y = 0; grp.add(sg);
    (grp.userData.occl || (grp.userData.occl = [])).push({ x: sx, z: sz, top: 12.8, hw: 5.4, ms: [pm, sg], fade: 1 });
  }
  // manchas de luz de las ventanas
  const lg = new GB(); const lc = 0xfff3c8;
  for (let i = -3; i <= 3; i++) { const cx = i * 36 + 6; lg.add(new THREE.PlaneGeometry(10, 22).rotateX(-Math.PI / 2), lc, cx + 4, 0.06, -118, 0, 0, 0.1); }
  const lm = new THREE.Mesh(lg.build(false, 0.1), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending })); grp.add(lm);
  // paredes
  const wt = P ? wallTexP(P.wall) : wallTex(); wt.repeat.set(28, 3); const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 1 });
  const W = HALF + 5, WH = 70;
  for (const [x, z, ry] of [[0, -W, 0], [0, W, Math.PI], [-W, 0, Math.PI / 2], [W, 0, -Math.PI / 2]]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, WH), wm); w.position.set(x, WH / 2, z); w.rotation.y = ry; w.receiveShadow = true; grp.add(w);
  }
  for (const [x, z, ry] of [[0, -W, 0], [0, W, Math.PI], [-W, 0, Math.PI / 2], [W, 0, -Math.PI / 2]]) {
    const sub = new GB();
    const TR = P ? P.trim : [PAL.coral, PAL.turq, PAL.violet, PAL.sun, PAL.pink], WIN = P ? (P.wall.night ? 0xffc93a : 0xbfe8ff) : 0x9fdcff, FRM = P && P.wall.night ? 0x2a1840 : 0xffffff;
    sub.box(W * 2, 3.2, 1.2, FRM, 0, 0, 0.6); sub.box(W * 2, 0.5, 1.6, P ? TR[1] : 0xffd9ec, 0, 3.2, 0.7);
    for (let i = -4; i <= 4; i++) {
      const cx = i * 30 + 6;
      sub.box(14, 16, 0.5, FRM, cx, 22, 0.1); sub.box(11.6, 13.6, 0.6, WIN, cx, 23.2, 0.2); sub.box(0.6, 13.6, 0.7, FRM, cx, 23.2, 0.25); sub.box(11.6, 0.6, 0.7, FRM, cx, 29.5, 0.25);
      sub.box(3, 17, 0.9, TR[(i + 4) % 5], cx - 8, 21, 0.4); sub.box(3, 17, 0.9, TR[(i + 4) % 5], cx + 8, 21, 0.4);
      sub.box(16, 0.7, 1.2, PAL.gold, cx, 38.5, 0.5);
    }
    for (let i = -5; i <= 5; i++) { const cx = i * 24 + 12 + (i % 2) * 3; sub.box(7, 9, 0.5, P ? TR[i & 1 ? 0 : 3] : (i % 2 ? PAL.sun : PAL.violet), cx, 48 + (i % 2) * 4, 0.1); sub.box(5.6, 7.6, 0.6, P ? WIN : (i % 2 ? PAL.sky : PAL.mint), cx, 48.7 + (i % 2) * 4, 0.2); sub.cyl(1.6, 1.6, 0.6, P ? TR[2] : PAL.pink, cx, 49.5 + (i % 2) * 4, 0.3, 12, Math.PI / 2, 0, 0); }
    const geo = sub.build(false, 0.1); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    m.position.set(x, 0, z); m.rotation.y = ry; grp.add(m);
  }
  // nubes y sol allá fuera
  const clouds = [];
  const cmat = new THREE.MeshBasicMaterial({ color: P ? P.cloud : 0xffffff, fog: false, transparent: true, opacity: 0.92 }); extras.push(cmat);
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(cloudGeo(i + 7), cmat); const a = i / 18 * Math.PI * 2 + 0.3, rr = 260 + (i % 3) * 50;
    m.position.set(Math.cos(a) * rr, 120 + (i % 4) * 22, Math.sin(a) * rr); m.scale.setScalar(2 + (i % 3) * 0.6); m.rotation.y = -a; m.renderOrder = -1; scene.add(m); extras.push(m); clouds.push({ m, a, rr, sp: 0.004 + (i % 5) * 0.0015 });
  }
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: P ? P.sunDisc : 0xfff2a8, fog: false, transparent: true, opacity: 0.95 })); sunDisc.position.set(-220, 210, -300); sunDisc.lookAt(0, 20, 0); scene.add(sunDisc); extras.push(sunDisc);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(95, 32), new THREE.MeshBasicMaterial({ color: P ? P.sunDisc : 0xfff7cf, fog: false, transparent: true, opacity: 0.28, depthWrite: false })); halo.position.copy(sunDisc.position).multiplyScalar(1.001); halo.lookAt(0, 20, 0); scene.add(halo); extras.push(halo);
  grp.userData.update = (t) => { for (const c of clouds) { const a = c.a + t * c.sp; c.m.position.x = Math.cos(a) * c.rr; c.m.position.z = Math.sin(a) * c.rr; c.m.rotation.y = -a; } };
  return grp;
}
const propMaterialLite = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });

// ---------- generación de objetos ----------
export function generate(seed, place) {
  const P = place || PLACES[0], HOME = !!P.home, inP = (K) => !K.places || K.places.includes(P.id);
  const rnd = mulberry(seed >>> 0);
  const R = (a, b) => a + (b - a) * rnd();
  const placed = []; const cell = 6, grid = new Map();
  const ck = (cx, cz) => cx * 1000 + cz;
  const free = (x, z, r) => {
    const x0 = Math.floor((x - r - 12) / cell), x1 = Math.floor((x + r + 12) / cell), z0 = Math.floor((z - r - 12) / cell), z1 = Math.floor((z + r + 12) / cell);
    for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) { const l = grid.get(ck(a, b)); if (!l) continue; for (const o of l) { const dx = o.x - x, dz = o.z - z, rr = o.ov + r; if (dx * dx + dz * dz < rr * rr) return false; } }
    return true;
  };
  const add = (o) => { placed.push(o); const k = ck(Math.floor(o.x / cell), Math.floor(o.z / cell)); (grid.get(k) || grid.set(k, []).get(k)).push(o); };
  const spawnD = (x, z) => Math.hypot(x - SPAWN.x, z - SPAWN.z);
  const out = [];
  const kinds = Object.keys(KINDS);
  const pickKind = (tier, dist) => {
    const c = []; let tot = 0;
    for (const k of kinds) { const K = KINDS[k]; if (K.tier !== tier || K.lm || K.cb || !inP(K)) continue; const th = K.th || []; let w = th.includes(dist) ? 4 : th.length === 0 ? 1 : (tier >= 4 ? 0.05 : 0.14); if (K.places) w *= 2.6; c.push([k, w]); tot += w; }
    let r = rnd() * tot; for (const [k, w] of c) { r -= w; if (r <= 0) return k; } return c[c.length - 1][0];
  };
  // monumentos
  const landmarks = [];
  for (const k of P.lms) if (KINDS[k]) {
    const dn = KINDS[k].th[0], D = DISTRICTS[dn]; let x = D.cx, z = D.cz; if (dn === 'salon') { x = -26; z = 66; } if (dn === 'plaza') { x = 0; z = 0; }
    const geo = getGeo(k, 0); const o = { kind: k, v: 0, x, z, rot: 0, sc: 1, ov: geo.r * 0.95, lm: true }; add(o); out.push(o); landmarks.push(o);
  }
  // edificios locos gigantes: 2 de cada, repartidos por sus distritos
  const generic = kinds.filter((k) => KINDS[k].cb && !KINDS[k].places), pi = PLACES.indexOf(P);
  const cbList = HOME ? generic : [...P.cbs, ...[0, 1, 2].map((i) => generic[(pi * 2 + i * 3) % generic.length])];
  for (const k of cbList) for (let n = 0; n < 2; n++) {
    const dn = KINDS[k].th[n % KINDS[k].th.length], D = DISTRICTS[dn], geo = getGeo(k, 0);
    for (let t = 0; t < 80; t++) {
      const x = D.cx + R(-36, 36), z = D.cz + R(-36, 36), ov = geo.r * 0.95;
      if (Math.abs(x) > HALF - 10 || Math.abs(z) > HALF - 10 || spawnD(x, z) < 14 || !free(x, z, ov)) continue;
      const o = { kind: k, v: 0, x, z, rot: R(-0.5, 0.5), sc: 1, ov }; add(o); out.push(o); break;
    }
  }
  // [tier, cantidad, d_centro, d_ancho]
  // v9: la ciudad es ~3x más grande que en la v1, así que se multiplica la cantidad de cosas (sobre todo las pequeñas) para mantener la misma densidad
  const DENS = [2.6, 2.0, 1.5, 1.25, 1, 1];
  const plan = P.plan.map(([t, n, dc, dw]) => [t, Math.round(n * DENS[t]), t === 0 ? 18 : dc, t === 0 ? 70 : dw]);
  for (const [tier, count, dc, dw] of plan) {
    let tries = count * 50, made = 0;
    while (made < count && tries-- > 0) {
      let x, z;
      if (tier >= 2) { const bx = BLOCKS[(rnd() * 6) | 0], bz = BLOCKS[(rnd() * 6) | 0]; x = bx + R(-14, 14); z = bz + R(-14, 14); }
      else { x = R(-HALF + 4, HALF - 4); z = R(-HALF + 4, HALF - 4); }
      const d = spawnD(x, z);
      if (rnd() > Math.exp(-Math.pow((d - dc) / dw, 2))) continue;
      const kind = pickKind(tier, districtAt(x, z)), K = KINDS[kind], v = (rnd() * K.nv) | 0;
      const geo = getGeo(kind, v); const sc = tier >= 4 ? R(0.94, 1.08) : R(0.88, 1.18);
      const bw = geo.geo.userData.w * sc, bd = geo.geo.userData.d * sc, ov = 0.5 * Math.hypot(bw, bd) * (tier >= 4 ? 0.62 : 0.8);
      if (tier >= 1 && d < 4.5) continue;
      if (!free(x, z, ov)) continue;
      const rot = tier >= 4 ? 0 : (rnd() < 0.7 ? R(-0.35, 0.35) : R(0, Math.PI * 2));
      const o = { kind, v, x, z, rot, sc, ov }; add(o); out.push(o); made++;
    }
  }
  // farolas (lámparas de pie) en las calles entre manzanas
  for (const c of [-86, -43, 0, 43, 86]) for (let t = -HALF + 10; t < HALF - 4; t += 21) {
    for (const [x, z] of [[c + 3.2, t], [t, c + 3.2]]) {
      if (Math.abs(x) > HALF - 3 || Math.abs(z) > HALF - 3 || spawnD(x, z) < 3.5) continue;
      const v = (rnd() * 5) | 0, sc = R(1.0, 1.2); const o = { kind: 'lamp', v, x, z, rot: R(0, 6.28), sc, ov: 0.6 };
      if (!free(x, z, 0.7)) continue; add(o); out.push(o);
    }
  }
  // anillo de cositas junto al punto de salida
  const starters = ['sock', 'button', 'cookie', 'cup', 'duck', 'yarn', 'book', 'slipper', 'dice', 'pillow'];
  for (let i = 0; i < 110; i++) {
    const a = rnd() * Math.PI * 2, d = R(2.2, i < 50 ? 12 : 22);
    const x = SPAWN.x + Math.cos(a) * d, z = SPAWN.z + Math.sin(a) * d * 0.9; if (z > HALF - 3) continue;
    const kind = starters[(rnd() * starters.length) | 0], v = (rnd() * KINDS[kind].nv) | 0, sc = R(0.9, 1.15);
    getGeo(kind, v); if (!free(x, z, 0.5)) continue;
    const o = { kind, v, x, z, rot: R(0, 6.28), sc, ov: 0.4 }; add(o); out.push(o);
  }
  // personajes locos: sitios por distrito
  const npcs = [];
  const spot = (dist, r, dmin = 14) => {
    const D = DISTRICTS[dist || Object.keys(DISTRICTS)[(rnd() * 9) | 0]];
    for (let t = 0; t < 60; t++) {
      const x = D.cx + R(-38, 38), z = D.cz + R(-38, 38);
      if (Math.abs(x) > HALF - 4 || Math.abs(z) > HALF - 4 || spawnD(x, z) < dmin) continue;
      if (!free(x, z, r)) continue; add({ x, z, ov: r }); return { x, z };
    }
    return null;
  };
  const NPC_PLAN = P.npcs;
  for (const [type, dist, n, r, dmin] of NPC_PLAN) for (let i = 0; i < n; i++) { const p = spot(dist, r, dmin || 14); if (p) npcs.push({ type, x: p.x, z: p.z, v: i }); }
  // grupos de patitos
  for (const dist of [...P.ducks, ...(HOME ? ['cocina'] : [])]) { const p = spot(dist, 3, 12); if (p) npcs.push({ type: 'patitos', x: p.x, z: p.z, v: 0 }); }
  const pickups = [];
  for (let i = 0; i < 46; i++) { const x = R(-HALF + 5, HALF - 5), z = R(-HALF + 5, HALF - 5); if (!free(x, z, 0.8)) continue; pickups.push({ type: 'coin', x, z }); add({ x, z, ov: 0.8 }); }
  for (let i = 0; i < 12; i++) { const x = R(-110, 110), z = R(-110, 110); if (!free(x, z, 1.2) || spawnD(x, z) < 8) { i--; continue; } pickups.push({ type: 'clock', x, z }); add({ x, z, ov: 1.2 }); }
  out.forEach((o, i) => { o.gid = i; }); npcs.forEach((o, i) => { o.gid = i; });
  return { objs: out, npcs, pickups, landmarks };
}
