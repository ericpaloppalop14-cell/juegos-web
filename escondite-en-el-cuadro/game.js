import * as THREE from 'three';
import { ONLINE_DISPONIBLE } from './net.js';
const VERSION = 4;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
// autoactualización
fetch('./version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).then(j => { if (j.v > VERSION && sessionStorage.getItem('ec_rl') !== String(j.v)) { sessionStorage.setItem('ec_rl', String(j.v)); toast('✨ ¡Versión nueva!', 'actualizando…', 1500); setTimeout(() => location.replace(location.pathname + '?v=' + j.v), 1200); } }).catch(() => { });
const SAVE_KEY = 'escondite-cuadro';
const save = { muted: false, best: 0, wins: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } };
// audio alegre sintetizado
let AC, master, musicG, noiseBuf, musicT = 0, musicStep = 0, musicMode = 'calm';
function audioInit() { if (AC) { if (AC.state === 'suspended') AC.resume(); return; } try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = save.muted ? 0 : .6; master.connect(AC.destination); musicG = AC.createGain(); musicG.gain.value = .13; musicG.connect(master); } catch (e) { } }
function env(g, t, a, d, v) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
function osc(type, f, a, d, v, f2, dest, t0) { if (!AC) return; const t = t0 || AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d); env(g, t, a, d, v); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + a + d + .05); }
function noise(d, v, fq, q) { if (!AC) return; if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * .5, AC.sampleRate); const c = noiseBuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q || 1; env(g, t, .002, d, v); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d + .05); }
const S = {
  pop: () => osc('sine', 500, .005, .12, .4, 1100),
  tap: () => osc('triangle', 880, .003, .07, .25, 1300),
  drop: () => { osc('sine', 1200, .005, .18, .35, 400); osc('sine', 1800, .01, .1, .15, 900); },
  paint: () => { noise(.25, .25, 2400, 2); osc('sine', 600, .01, .2, .2, 1200); },
  pose: () => { osc('square', 300, .005, .08, .12, 600); osc('sine', 700, .02, .1, .2, 300); },
  shoot: () => { osc('sawtooth', 1600, .002, .18, .18, 300); noise(.12, .2, 3000, 3); },
  splat: () => { noise(.3, .5, 600, .8); osc('sine', 200, .005, .25, .4, 60); },
  ay: () => { osc('triangle', 700, .01, .1, .4, 1400); if (AC) osc('triangle', 1400, .01, .35, .35, 500, null, AC.currentTime + .1); },
  sneeze: () => { osc('sine', 500, .05, .15, .2, 900); setTimeout(() => noise(.25, .35, 1800, .7), 260); },
  boing: () => osc('sine', 180, .005, .35, .45, 520),
  tick: () => osc('square', 1500, .001, .03, .08),
  fanfare: () => { if (!AC) return; const t = AC.currentTime;[523, 659, 784, 1047, 784, 1047].forEach((f, i) => { osc('triangle', f, .01, .22, .3, 0, null, t + i * .11); osc('sine', f * 2, .01, .18, .08, 0, null, t + i * .11); }); },
  fail: () => { if (!AC) return; const t = AC.currentTime;[523, 494, 466, 392].forEach((f, i) => osc('triangle', f, .01, .28, .25, f * .97, null, t + i * .2)); },
  hmm: () => osc('sine', 220, .05, .4, .25, 180),
  tension: () => osc('sine', 98, .02, .6, .25, 92),
};
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
function musicTick(dt) { if (!AC || save.muted) return; musicT -= dt; if (musicT > 0) return; const fast = musicMode === 'seek'; musicT = fast ? .19 : .26; const st = musicStep++; const base = fast ? 293.66 : 261.63; const t = AC.currentTime;
  if (st % 2 === 0 || Math.random() < .3) { const n = SCALE[(st * 3 + (st >> 3)) % SCALE.length]; osc('triangle', base * Math.pow(2, n / 12), .01, .22, .22, 0, musicG, t); }
  if (st % 4 === 0) osc('sine', base / 2 * Math.pow(2, [0, 5, 7, 3][(st >> 4) % 4] / 12), .01, .4, .35, 0, musicG, t);
  if (fast && st % 2 === 1) osc('square', 2400, .001, .02, .04, 0, musicG, t); }
// renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, 2.5);
let quality = Math.min(DPR, 2); renderer.setPixelRatio(quality);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, .1, 400);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 68 : 55; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const hemi = new THREE.HemisphereLight(0xffffff, 0xffd0f0, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 2.3); sun.position.set(14, 26, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 4; scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(0xc9b0ff, .7); rim.position.set(-12, 8, -14); scene.add(rim);
// texturas
const texCache = new Map();
function patTex(pat, c1, c2, rep = 1) {
  const k = pat + c1 + c2 + rep; if (texCache.has(k)) return texCache.get(k);
  const s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s; const x = cv.getContext('2d');
  x.fillStyle = c1; x.fillRect(0, 0, s, s); x.fillStyle = c2;
  if (pat === 'rayas') { for (let i = -s; i < s * 2; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 32, 0); x.lineTo(i + 32 - s * .5, s); x.lineTo(i - s * .5, s); x.fill(); } }
  else if (pat === 'lunares') { for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(i * 64 + (j % 2) * 32, j * 64 + 32, 15, 0, 7); x.fill(); } }
  else if (pat === 'cuadros') { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2) x.fillRect(i * 64, j * 64, 64, 64); }
  x.globalAlpha = .07; for (let i = 0; i < 60; i++) { x.fillStyle = Math.random() < .5 ? '#fff' : '#000'; x.fillRect(Math.random() * s, Math.random() * s, rnd(10, 40), 3); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; texCache.set(k, t); return t;
}
function gradTex(stops) { const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
function splatTex(col) { const k = 'sp' + col; if (texCache.has(k)) return texCache.get(k); const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = col; x.beginPath(); x.arc(64, 64, 34, 0, 7); x.fill(); for (let i = 0; i < 10; i++) { const a = Math.random() * 7, r = rnd(34, 58); x.beginPath(); x.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, rnd(4, 11), 0, 7); x.fill(); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; texCache.set(k, t); return t; }
const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .55, metalness: 0 }, o));
const PM = (pat, c1, c2, rep, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: patTex(pat, c1, c2, rep), roughness: .6 }, o));
const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function colSim(a, b) { tmpA.set(a); tmpB.set(b); const d = Math.hypot(tmpA.r - tmpB.r, tmpA.g - tmpB.g, tmpA.b - tmpB.b); return clamp(1 - d / .75, 0, 1); }
// ======================= v4 · CASTILLO GRANDE =======================
// texturas ricas (canvas) — todas pueden copiarse a la piel de la Mancha
const CV = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
function mkTex(cv, rep) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (rep) t.repeat.set(rep[0], rep[1]); return t; }
function shade(c, k) { tmpA.set(c); if (k > 0) tmpA.lerp(tmpB.set('#ffffff'), k); else tmpA.lerp(tmpB.set('#000000'), -k); return '#' + tmpA.getHexString(); }
let RNG = 1; const rr = () => { RNG = (RNG * 16807) % 2147483647; return (RNG - 1) / 2147483646; }; const rrn = (a, b) => a + rr() * (b - a);
function cached(k, f) { if (texCache.has(k)) return texCache.get(k); const t = f(); texCache.set(k, t); return t; }
function woodTex(c1, c2, planks = 6) { return cached('wood' + c1 + c2 + planks, () => { const S = 512, [cv, x] = CV(S, S); const ph = S / planks; for (let i = 0; i < planks; i++) { x.fillStyle = shade(c1, rrn(-.12, .12)); x.fillRect(0, i * ph, S, ph); x.strokeStyle = c2; x.globalAlpha = .35; for (let k = 0; k < 9; k++) { x.lineWidth = rrn(1, 3); x.beginPath(); const y0 = i * ph + rrn(4, ph - 4); x.moveTo(0, y0); for (let s = 0; s <= 8; s++) x.lineTo(s * 64, y0 + Math.sin(s * rrn(.5, 1.2) + k) * rrn(1, 5)); x.stroke(); } x.globalAlpha = .6; x.fillStyle = shade(c2, -.3); x.fillRect(0, i * ph, S, 2); const off = rrn(0, S); x.fillRect(off, i * ph, 2, ph); x.globalAlpha = .25; x.beginPath(); x.ellipse(rrn(40, 470), i * ph + ph / 2, rrn(6, 14), rrn(3, 6), 0, 0, 7); x.fill(); x.globalAlpha = 1; } return mkTex(cv); }); }
function stoneTex(c1, c2) { return cached('stone' + c1 + c2, () => { const S = 512, [cv, x] = CV(S, S); x.fillStyle = c2; x.fillRect(0, 0, S, S); const bh = 64; for (let j = 0; j < S / bh; j++) { const off = j % 2 ? 64 : 0; for (let i = -1; i < 5; i++) { const bx = i * 128 + off; x.fillStyle = shade(c1, rrn(-.1, .1)); x.fillRect(bx + 3, j * bh + 3, 122, bh - 6); x.globalAlpha = .12; for (let k = 0; k < 14; k++) { x.fillStyle = rr() < .5 ? '#fff' : '#000'; x.fillRect(bx + rrn(6, 118), j * bh + rrn(6, 56), rrn(2, 9), rrn(2, 6)); } x.globalAlpha = 1; } } return mkTex(cv); }); }
function damaskTex(c1, c2) { return cached('dam' + c1 + c2, () => { const S = 256, [cv, x] = CV(S, S); x.fillStyle = c1; x.fillRect(0, 0, S, S); x.fillStyle = c2; const motif = (cx, cy, s) => { x.save(); x.translate(cx, cy); x.scale(s, s); x.beginPath(); x.moveTo(0, -48); x.bezierCurveTo(26, -30, 30, -6, 0, 10); x.bezierCurveTo(-30, -6, -26, -30, 0, -48); x.fill(); x.beginPath(); x.moveTo(0, 10); x.bezierCurveTo(30, 18, 34, 44, 0, 52); x.bezierCurveTo(-34, 44, -30, 18, 0, 10); x.fill(); for (const sx of [-1, 1]) { x.beginPath(); x.ellipse(sx * 30, 0, 12, 5, sx * .6, 0, 7); x.fill(); x.beginPath(); x.arc(sx * 18, -34, 4, 0, 7); x.fill(); } x.restore(); }; motif(64, 64, .9); motif(192, 192, .9); motif(192, 64, .45); motif(64, 192, .45); x.strokeStyle = c2; x.globalAlpha = .35; x.lineWidth = 2; for (let i = 0; i <= S; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke(); } x.globalAlpha = 1; return mkTex(cv); }); }
function panelTex(c1, c2) { return cached('pan' + c1 + c2, () => { const S = 512, [cv, x] = CV(S, 256); x.fillStyle = c1; x.fillRect(0, 0, S, 256); for (let i = 0; i < 4; i++) { const px = i * 128 + 14; x.fillStyle = shade(c1, -.15); x.fillRect(px, 24, 100, 208); x.fillStyle = shade(c1, .08); x.fillRect(px + 8, 32, 84, 192); x.strokeStyle = c2; x.lineWidth = 3; x.strokeRect(px + 16, 40, 68, 176); x.fillStyle = c2; x.beginPath(); x.arc(px + 50, 128, 10, 0, 7); x.fill(); } x.fillStyle = shade(c1, -.3); x.fillRect(0, 0, S, 10); x.fillRect(0, 246, S, 10); return mkTex(cv); }); }
function marbleTex(c1, c2, c3) { return cached('mar' + c1 + c2 + c3, () => { const S = 512, [cv, x] = CV(S, S); const t = 128; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = (i + j) % 2 ? c1 : c2; x.fillRect(i * t, j * t, t, t); x.strokeStyle = c3; x.globalAlpha = .25; for (let k = 0; k < 4; k++) { x.lineWidth = rrn(.5, 2); x.beginPath(); let px = i * t + rrn(0, t), py = j * t; x.moveTo(px, py); for (let s = 0; s < 6; s++) { px += rrn(-20, 20); py += t / 6; x.lineTo(px, py); } x.stroke(); } x.globalAlpha = 1; } x.strokeStyle = shade(c3, -.2); x.lineWidth = 2; for (let i = 0; i <= S; i += t) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); } return mkTex(cv); }); }
function parquetTex(c1, c2) { return cached('par' + c1 + c2, () => { const S = 512, [cv, x] = CV(S, S); const u = 64; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const v = (i + j) % 2; x.fillStyle = shade(v ? c1 : c2, rrn(-.08, .08)); x.fillRect(i * u, j * u, u, u); x.strokeStyle = shade(c2, -.35); x.globalAlpha = .35; for (let k = 1; k < 4; k++) { x.beginPath(); if (v) { x.moveTo(i * u + k * 16, j * u); x.lineTo(i * u + k * 16, j * u + u); } else { x.moveTo(i * u, j * u + k * 16); x.lineTo(i * u + u, j * u + k * 16); } x.stroke(); } x.globalAlpha = 1; } return mkTex(cv); }); }
function rugTex(w, d, pal) { return cached('rug' + w + d + pal.join(), () => { const W = 512, H = Math.round(512 * d / w), [cv, x] = CV(W, H); const [bg, a, b, c] = pal; x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const bw = 46; x.fillStyle = a; x.fillRect(0, 0, W, bw); x.fillRect(0, H - bw, W, bw); x.fillRect(0, 0, bw, H); x.fillRect(W - bw, 0, bw, H);
  x.fillStyle = c; for (let i = 0; i < W; i += 24) { x.beginPath(); x.moveTo(i, bw / 2); x.lineTo(i + 12, bw / 2 - 9); x.lineTo(i + 24, bw / 2); x.lineTo(i + 12, bw / 2 + 9); x.fill(); x.beginPath(); x.moveTo(i, H - bw / 2); x.lineTo(i + 12, H - bw / 2 - 9); x.lineTo(i + 24, H - bw / 2); x.lineTo(i + 12, H - bw / 2 + 9); x.fill(); }
  for (let i = 0; i < H; i += 24) { x.beginPath(); x.moveTo(bw / 2, i); x.lineTo(bw / 2 - 9, i + 12); x.lineTo(bw / 2, i + 24); x.lineTo(bw / 2 + 9, i + 12); x.fill(); x.beginPath(); x.moveTo(W - bw / 2, i); x.lineTo(W - bw / 2 - 9, i + 12); x.lineTo(W - bw / 2, i + 24); x.lineTo(W - bw / 2 + 9, i + 12); x.fill(); }
  x.strokeStyle = b; x.lineWidth = 5; x.strokeRect(bw + 8, bw + 8, W - 2 * bw - 16, H - 2 * bw - 16);
  x.fillStyle = b; x.globalAlpha = .55; for (let j = bw + 30; j < H - bw - 20; j += 40) for (let i = bw + 30; i < W - bw - 20; i += 40) { x.beginPath(); x.arc(i, j, 5, 0, 7); x.fill(); x.fillRect(i - 1, j - 13, 2, 26); x.fillRect(i - 13, j - 1, 26, 2); } x.globalAlpha = 1;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * .3; x.fillStyle = a; x.beginPath(); for (let k = 0; k < 16; k++) { const an = k / 16 * 6.283, rr2 = k % 2 ? R * .78 : R; x.lineTo(cx + Math.cos(an) * rr2, cy + Math.sin(an) * rr2 * (H > W ? 1.3 : .9)); } x.fill();
  x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, R * .55, R * .55 * (H > W ? 1.3 : .9), 0, 0, 7); x.fill(); x.fillStyle = b; for (let k = 0; k < 8; k++) { const an = k / 8 * 6.283; x.beginPath(); x.ellipse(cx + Math.cos(an) * R * .33, cy + Math.sin(an) * R * .33, R * .12, R * .07, an, 0, 7); x.fill(); } x.fillStyle = a; x.beginPath(); x.arc(cx, cy, R * .14, 0, 7); x.fill();
  for (const [qx, qy] of [[bw + 60, bw + 60], [W - bw - 60, bw + 60], [bw + 60, H - bw - 60], [W - bw - 60, H - bw - 60]]) { x.fillStyle = c; x.beginPath(); x.arc(qx, qy, 26, 0, 7); x.fill(); x.fillStyle = a; x.beginPath(); x.arc(qx, qy, 12, 0, 7); x.fill(); }
  x.globalAlpha = .08; for (let i = 0; i < 2500; i++) { x.fillStyle = rr() < .5 ? '#fff' : '#000'; x.fillRect(rr() * W, rr() * H, 2, 2); } x.globalAlpha = 1; return mkTex(cv); }); }
const BOOKC = ['#8e2b3b', '#2d4e8a', '#2f7a4f', '#b3742a', '#6b3a8e', '#c9a227', '#3e3a36', '#a8452d', '#1f6f78', '#7a2a5a', '#d8c9a3', '#4a6b2a'];
function spinesTex(w, seed) { return cached('sp' + w + '_' + seed, () => { RNG = seed * 7919 + 13; const W = Math.round(160 * w), H = 160, [cv, x] = CV(W, H); x.fillStyle = '#2a1608'; x.fillRect(0, 0, W, H); let px = 2; while (px < W - 4) { const bw = rrn(10, 26), bh = rrn(105, 156), col = BOOKC[Math.floor(rr() * BOOKC.length)]; const lean = rr() < .06; if (lean) { x.save(); x.translate(px, H); x.rotate(-.18); x.fillStyle = col; x.fillRect(0, -bh, bw, bh); x.restore(); px += bw + 10; continue; }
    x.fillStyle = col; x.fillRect(px, H - bh, bw, bh); x.fillStyle = shade(col, .25); x.fillRect(px + 1, H - bh, 2, bh); x.fillStyle = shade(col, -.3); x.fillRect(px + bw - 2, H - bh, 2, bh); x.fillStyle = '#e8c35a'; for (const fy of [.15, .8]) x.fillRect(px + 2, H - bh + bh * fy, bw - 4, 2); if (rr() < .6) { x.fillRect(px + bw / 2 - 2, H - bh + bh * .35, 4, bh * .3); } px += bw + rrn(0, 2); }
  return mkTex(cv); }); }
function brassTex() { return cached('brass', () => { const [cv, x] = CV(128, 128); const g = x.createRadialGradient(64, 64, 4, 64, 64, 70); g.addColorStop(0, '#fff6d0'); g.addColorStop(.35, '#ffd27a'); g.addColorStop(.75, '#e8a33a'); g.addColorStop(1, '#a8661a'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return mkTex(cv); }); }
function metalTex(c) { return cached('met' + c, () => { const [cv, x] = CV(256, 256); x.fillStyle = c; x.fillRect(0, 0, 256, 256); x.globalAlpha = .12; for (let i = 0; i < 260; i++) { x.fillStyle = rr() < .5 ? '#fff' : '#000'; x.fillRect(0, rr() * 256, 256, 1); } x.globalAlpha = .5; x.fillStyle = shade(c, -.35); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(16 + i * 64, 16 + j * 64, 3, 0, 7); x.fill(); } x.globalAlpha = 1; return mkTex(cv); }); }
function clothTex(c1, c2) { return cached('cl' + c1 + c2, () => { const [cv, x] = CV(256, 256); x.fillStyle = c1; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 256; i += 16) { const g = x.createLinearGradient(i, 0, i + 16, 0); g.addColorStop(0, shade(c1, -.18)); g.addColorStop(.5, shade(c1, .12)); g.addColorStop(1, shade(c1, -.18)); x.fillStyle = g; x.fillRect(i, 0, 16, 256); } x.fillStyle = c2; x.globalAlpha = .55; for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { x.beginPath(); const cx = i * 64 + (j % 2) * 32 + 16, cy = j * 32 + 16; x.moveTo(cx, cy - 7); x.lineTo(cx + 5, cy); x.lineTo(cx, cy + 7); x.lineTo(cx - 5, cy); x.fill(); } x.globalAlpha = 1; return mkTex(cv); }); }
function heraldTex(c1, c2, sym) { return cached('her' + c1 + c2 + sym, () => { const W = 256, H = 384, [cv, x] = CV(W, H); x.fillStyle = c1; x.fillRect(0, 0, W, H); x.fillStyle = c2; x.fillRect(0, 0, W / 2, H / 2); x.fillRect(W / 2, H / 2, W / 2, H / 2); x.fillStyle = '#ffcf4a'; x.font = '120px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(sym, W / 2, H / 2); x.strokeStyle = '#ffcf4a'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10); return mkTex(cv); }); }
function artTex(kind, pal, seed) { return cached('art' + kind + pal.join() + seed, () => { RNG = seed * 104729 + 7; const W = 512, H = 640, [cv, x] = CV(W, H); const [a, b, c, d] = pal; const dot = (cx, cy, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  if (kind === 'paisaje') { const g = x.createLinearGradient(0, 0, 0, H * .6); g.addColorStop(0, a); g.addColorStop(1, shade(a, .5)); x.fillStyle = g; x.fillRect(0, 0, W, H); dot(W * .75, H * .2, 46, '#fff3b0'); for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(255,255,255,.8)'; const cx = rrn(30, W - 30), cy = rrn(60, 220); for (let q = 0; q < 4; q++) dot(cx + q * 22, cy + Math.sin(q) * 8, rrn(16, 26), 'rgba(255,255,255,.85)'); }
    for (let l = 0; l < 3; l++) { x.fillStyle = shade(b, -l * .15); x.beginPath(); x.moveTo(0, H); for (let s = 0; s <= 10; s++) x.lineTo(s * W / 10, H * (.5 + l * .12) + Math.sin(s * 1.3 + l * 2) * 40); x.lineTo(W, H); x.fill(); } for (let k = 0; k < 14; k++) { const tx = rrn(0, W), ty = rrn(H * .62, H * .95); x.fillStyle = '#6b3a1a'; x.fillRect(tx - 4, ty, 8, 30); dot(tx, ty, rrn(16, 26), shade(c, rrn(-.2, .1))); } for (let k = 0; k < 40; k++) dot(rrn(0, W), rrn(H * .7, H), 4, d); }
  else if (kind === 'retrato') { const g = x.createRadialGradient(W / 2, H * .4, 30, W / 2, H * .4, 380); g.addColorStop(0, shade(a, .3)); g.addColorStop(1, shade(a, -.4)); x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = b; x.beginPath(); x.moveTo(60, H); x.bezierCurveTo(80, 420, 432, 420, 452, H); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(200, 430); x.lineTo(256, 520); x.lineTo(312, 430); x.fill(); dot(256, 300, 110, '#ffd9c2'); x.fillStyle = c; x.beginPath(); x.ellipse(256, 215, 125, 70, 0, Math.PI, 0); x.fill(); x.fillRect(131, 210, 30, 120); x.fillRect(351, 210, 30, 120); x.fillStyle = '#ffcf4a'; x.beginPath(); x.moveTo(170, 170); for (let k = 0; k <= 6; k++) x.lineTo(170 + k * 29, k % 2 ? 120 : 160); x.lineTo(344, 175); x.fill(); dot(256, 135, 9, '#ff5f8f'); dot(215, 300, 13, '#3a2050'); dot(297, 300, 13, '#3a2050'); dot(219, 296, 4, '#fff'); dot(301, 296, 4, '#fff'); dot(195, 335, 16, 'rgba(255,120,150,.45)'); dot(317, 335, 16, 'rgba(255,120,150,.45)'); x.strokeStyle = '#8a3a2a'; x.lineWidth = 6; x.beginPath(); x.arc(256, 340, 26, .3, Math.PI - .3); x.stroke(); }
  else if (kind === 'bodegon') { x.fillStyle = shade(a, -.3); x.fillRect(0, 0, W, H); x.fillStyle = shade(a, -.5); x.fillRect(0, H * .62, W, H); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(256, 450, 200, 40, 0, 0, 7); x.fill(); for (let k = 0; k < 9; k++) dot(rrn(110, 400), rrn(360, 440), rrn(26, 44), pick([b, c, d, '#7ed957', '#ff9f3d'])); x.fillStyle = shade(b, -.2); x.beginPath(); x.moveTo(330, 420); x.lineTo(350, 230); x.lineTo(390, 230); x.lineTo(410, 420); x.fill(); }
  else if (kind === 'criatura') { x.fillStyle = a; x.fillRect(0, 0, W, H); for (let k = 0; k < 30; k++) dot(rrn(0, W), rrn(0, H), rrn(4, 12), shade(a, .35)); dot(256, 360, 160, b); dot(200, 330, 40, '#fff'); dot(312, 330, 40, '#fff'); dot(205, 336, 18, '#1a1030'); dot(317, 336, 18, '#1a1030'); x.strokeStyle = '#1a1030'; x.lineWidth = 8; x.beginPath(); x.arc(256, 400, 34, .2, Math.PI - .2); x.stroke(); for (const sx of [-1, 1]) { x.fillStyle = c; x.beginPath(); x.moveTo(256 + sx * 90, 230); x.lineTo(256 + sx * 150, 120); x.lineTo(256 + sx * 150, 250); x.fill(); } }
  else if (kind === 'abstracto') { x.fillStyle = a; x.fillRect(0, 0, W, H); for (let k = 0; k < 12; k++) { x.fillStyle = pick([b, c, d]); x.globalAlpha = .8; if (rr() < .5) x.fillRect(rrn(0, W - 100), rrn(0, H - 100), rrn(40, 220), rrn(40, 220)); else dot(rrn(0, W), rrn(0, H), rrn(30, 110), pick([b, c, d])); } x.globalAlpha = 1; x.strokeStyle = '#1a1030'; x.lineWidth = 10; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(rrn(0, W), 0); x.lineTo(rrn(0, W), H); x.stroke(); } }
  else if (kind === 'tapiz') { x.fillStyle = a; x.fillRect(0, 0, W, H); x.fillStyle = b; for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) { const cx = i * 128 + 64 + (j % 2) * 64, cy = j * 110 + 55; x.beginPath(); x.moveTo(cx, cy - 40); x.lineTo(cx + 34, cy); x.lineTo(cx, cy + 40); x.lineTo(cx - 34, cy); x.fill(); dot(cx, cy, 12, c); } x.strokeStyle = c; x.lineWidth = 16; x.strokeRect(14, 14, W - 28, H - 28); }
  x.globalAlpha = .07; for (let i = 0; i < 4000; i++) { x.fillStyle = rr() < .5 ? '#fff' : '#000'; x.fillRect(rr() * W, rr() * H, 2, 2); } x.globalAlpha = 1;
  const t = mkTex(cv); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }); }
function avgColor(tex) { if (tex.userData.avg) return tex.userData.avg; let col = new THREE.Color('#888'); try { const [cv, x] = CV(8, 8); x.drawImage(tex.image, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } col = new THREE.Color().setRGB(r / 64 / 255, g / 64 / 255, b / 64 / 255, THREE.SRGBColorSpace); } catch (e) { } tex.userData.avg = col; return col; }

// ---------- superficies copiables + anclajes + plataformas ----------
let surfaces = [], skinMeshes = [], anchors = [], plats = [], obst = [];
// plano con piel: w×h, la textura cubre ru×rv veces. Devuelve la malla (centro en 0, mira a +z)
function skinPlane(w, h, tex, ru, rv, kind, name, mo = {}) { const t = (ru !== 1 || rv !== 1) ? tex.clone() : tex; if (t !== tex) { t.repeat.set(ru, rv); t.needsUpdate = true; } const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: .7 }, mo))); m.receiveShadow = true; const s = { mesh: m, tex, w, h, ru, rv, kind, name, mat4: new THREE.Matrix4(), n: new THREE.Vector3(), rough: mo.roughness ?? .7, emis: mo.emissiveIntensity ? 1 : 0 }; m.userData.surf = s; surfaces.push(s); skinMeshes.push(m); return m; }
function finalizeSurfaces() { world.updateMatrixWorld(true); const inv = new THREE.Matrix4(), q = new THREE.Quaternion(); for (const s of surfaces) { inv.copy(s.mesh.matrixWorld).invert(); s.mat4.set(s.ru / s.w, 0, 0, .5 * s.ru, 0, s.rv / s.h, 0, .5 * s.rv, 0, 0, 1, 0, 0, 0, 0, 1).multiply(inv); s.mesh.getWorldQuaternion(q); s.n.set(0, 0, 1).applyQuaternion(q); s.horiz = Math.abs(s.n.y) > .7; s.avg = avgColor(s.tex); s.mesh.getWorldPosition(s.pos = new THREE.Vector3()); } }
function plat(minx, maxx, minz, maxz, top, name) { plats.push({ minx, maxx, minz, maxz, top, name }); }
function anchor(o) { anchors.push(o); return o; }
// ancla vertical sobre un plano con piel (cuadro, pared, estante…): slide = medio ancho deslizable
function anchorOn(mesh, lx, ly, shape, size, name, kind, slide = 0, prio = 1) { world.updateMatrixWorld(true); const p = new THREE.Vector3(lx, ly, .07).applyMatrix4(mesh.matrixWorld); const q = new THREE.Quaternion(); mesh.getWorldQuaternion(q); const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q); return anchor({ mesh, lx, ly, x: p.x, y: p.y, z: p.z, nx: n.x, nz: n.z, slide, surf: mesh.userData.surf, shape, size, name, kind, prio, room: roomOf(p.x, p.z) }); }
let world = new THREE.Group(); scene.add(world);
let props = [], walls = [], wallMeshes = [], decor = [], hitMeshes = [], lookers = [], rooms = [], cols = [];
const RS = 18, WH = 7, COLS = 3, ROWS = 2, XMIN = -27, XMAX = 27, ZMIN = -18, ZMAX = 18, DOOR = 3.6, DH = 4.3, ZOC = 1.3;
function shadowAll(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); }
const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
function face(g, y, z, s = 1, col = '#3a2050') {
  const e = M(col, { roughness: .3 }); for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(.09 * s, 12, 8), e); m.position.set(sx * .22 * s, y, z); m.scale.z = .5; g.add(m); const ck = new THREE.Mesh(new THREE.CircleGeometry(.07 * s, 12), M('#ff8fb8', { transparent: true, opacity: .7 })); ck.position.set(sx * .36 * s, y - .1 * s, z + .01); g.add(ck); }
  const sm = new THREE.Mesh(new THREE.TorusGeometry(.08 * s, .02 * s, 6, 12, Math.PI), e); sm.rotation.z = Math.PI; sm.position.set(0, y - .07 * s, z); g.add(sm); }
const roomC = (i, j) => [XMIN + RS / 2 + i * RS, ZMIN + RS / 2 + j * RS];
function roomOf(x, z) { return clamp(Math.floor((x - XMIN) / RS), 0, COLS - 1) + COLS * clamp(Math.floor((z - ZMIN) / RS), 0, ROWS - 1); }
const ROOMS = [
  { name: 'Galería del Trono', paper: ['#c8394f', '#e8a33a'], zoc: ['#7a3a1a', '#e8b84a'], floor: () => marbleTex('#f4ead8', '#e2cfa8', '#9a7a5a'), light: '#ffd9a8', build: roomTrono },
  { name: 'Gran Biblioteca', paper: ['#2f6b4f', '#7fbf8a'], zoc: ['#5a3018', '#c9a24a'], floor: () => parquetTex('#b5733d', '#8e5428'), light: '#fff0c0', build: roomBiblio },
  { name: 'Torre de las Estrellas', paper: ['#4a3a8e', '#b49cff'], zoc: ['#3a2a5a', '#ffcf4a'], floor: () => marbleTex('#e6e0ff', '#c9bdf0', '#6a5aa0'), light: '#e8dcff', build: roomTorre },
  { name: 'Comedor de las Tartas', paper: ['#2f7fa8', '#bfe6ff'], zoc: ['#8a4a2a', '#ffd27a'], floor: () => marbleTex('#ffe3f0', '#fff6fa', '#d08aa8'), light: '#fff2d8', build: roomComedor },
  { name: 'Sala de los Cuadros', paper: ['#c99a2a', '#fff0a8'], zoc: ['#6a3a1a', '#ffe08a'], floor: () => parquetTex('#d9a066', '#b27a44'), light: '#fff4d0', build: roomCuadros },
  { name: 'Dormitorio Real', paper: ['#c76a9e', '#ffd6ea'], zoc: ['#7a4a6a', '#ffd6ea'], floor: () => parquetTex('#e8b48a', '#c98f62'), light: '#ffe0f0', build: roomDormi },
];
const GOLD = () => M('#ffcf4a', { metalness: .65, roughness: .3 });
let goldM, woodM, woodD, stoneM, metalM, darkM;
function box(w, h, d, mat, x, y, z, par = world, cast = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; par.add(m); return m; }
function cyl(r0, r1, h, mat, x, y, z, par = world, seg = 12) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; par.add(m); return m; }
// --- colisión: cajas/cilindros con altura (top). top bajo = se puede subir/pisar ---
function collBox(minx, maxx, minz, maxz, top = 99, name) { const c = { box: { minx, maxx, minz, maxz }, top, name }; cols.push(c); return c; }
function collCyl(x, z, r, top = 99) { const c = { x, z, r, top }; cols.push(c); return c; }
// lado: 0 norte(-z) 1 sur(+z) 2 oeste(-x) 3 este(+x). Devuelve marco para colocar cosas pegadas a esa pared
function wallFrame(room, side, along, off = 0) { const [cx, cz] = rooms[room].c, h = RS / 2 - .15 - off; if (side === 0) return { x: cx + along, z: cz - h, ry: 0, nx: 0, nz: 1 }; if (side === 1) return { x: cx - along, z: cz + h, ry: Math.PI, nx: 0, nz: -1 }; if (side === 2) return { x: cx - h, z: cz - along, ry: Math.PI / 2, nx: 1, nz: 0 }; return { x: cx + h, z: cz + along, ry: -Math.PI / 2, nx: -1, nz: 0 }; }
function onWall(room, side, along, y, off, obj) { const f = wallFrame(room, side, along, off); obj.position.set(f.x, y, f.z); obj.rotation.y = f.ry; world.add(obj); return f; }
function wallSeg(room, side, a0, a1, def) { const L = a1 - a0, mid = (a0 + a1) / 2; const zt = panelTex(def.zoc[0], def.zoc[1]), pt = damaskTex(def.paper[0], def.paper[1]);
  const z = skinPlane(L, ZOC, zt, L / 2.4, 1, 'pared', 'el zócalo de madera', { roughness: .6 }); onWall(room, side, mid, ZOC / 2, 0, z); wallMeshes.push(z);
  const ph = WH - ZOC, p = skinPlane(L, ph, pt, L / 2.2, ph / 2.2, 'pared', 'el papel pintado', { roughness: .85 }); onWall(room, side, mid, ZOC + ph / 2, 0, p); wallMeshes.push(p);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(L, .1, .12), goldM); onWall(room, side, mid, ZOC, .04, rail); const crown = new THREE.Mesh(new THREE.BoxGeometry(L, .3, .25), goldM); onWall(room, side, mid, WH - .15, .1, crown); const base = new THREE.Mesh(new THREE.BoxGeometry(L, .16, .1), woodD); onWall(room, side, mid, .08, .03, base);
  const f0 = wallFrame(room, side, a0), f1 = wallFrame(room, side, a1); walls.push({ minx: Math.min(f0.x, f1.x) - .15, maxx: Math.max(f0.x, f1.x) + .15, minz: Math.min(f0.z, f1.z) - .15, maxz: Math.max(f0.z, f1.z) + .15 }); }
function hangArt(room, side, along, y, w, h, kind, pal, seed, opts = {}) { const g = new THREE.Group(); const f = onWall(room, side, along, y, .02, g);
  const pic = skinPlane(w, h, artTex(kind, pal, seed), 1, 1, 'cuadro', opts.name || 'el cuadro', { roughness: .75 }); pic.position.z = .12; g.add(pic); hitMeshes.push(pic);
  if (kind !== 'tapiz') { const fw = .2; [[0, h / 2 + fw / 2, w + fw * 2, fw], [0, -h / 2 - fw / 2, w + fw * 2, fw], [-w / 2 - fw / 2, 0, fw, h], [w / 2 + fw / 2, 0, fw, h]].forEach(([px, py, bw, bh]) => box(bw, bh, .22, goldM, px, py, .11, g, false)); for (const [px, py] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const k = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), goldM); k.position.set(px * (w / 2 + .1), py * (h / 2 + .1), .2); g.add(k); } }
  else { const rod = cyl(.05, .05, w + .5, goldM, 0, h / 2 + .06, .16, g, 8); rod.rotation.z = Math.PI / 2; for (let i = 0; i < 11; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.06, .22, 5), M(pal[2])); t.position.set(-w / 2 + i * w / 10, -h / 2 - .1, .13); t.rotation.z = Math.PI; g.add(t); } }
  if (opts.eyes) { const eyes = []; for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(w * .055, 14, 10), M('#ffffff', { roughness: .15 })); e.position.set(sx * w * .08, h * .03, .15); e.scale.z = .4; g.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(w * .027, 10, 8), M('#1a1030')); p.position.set(sx * w * .08, h * .03, .18); g.add(p); eyes.push({ p, bx: sx * w * .08, by: h * .03 }); } lookers.push({ g, eyes, w }); }
  if (opts.breathe) decor.push({ o: pic, f: (o, tt) => { const k = Math.sin(tt * 1.6 + f.x) * .5 + .5; o.position.z = .12 + k * .05; } });
  anchorOn(pic, 0, 0, 'lamina', [Math.min(w - .3, 1.5), Math.min(h - .3, 1.7), .08], opts.name || 'el cuadro', 'cuadro', 1, 3);
  return pic; }
function lampAt(room, side, along, y) { const g = new THREE.Group(); const f = onWall(room, side, along, y, .02, g);
  const plate = skinPlane(.5, .8, brassTex(), 1, 1, 'lampara', 'la lámpara de pared', { roughness: .35, metalness: .3, emissive: '#ffb84a', emissiveIntensity: .25 }); plate.position.z = .03; g.add(plate);
  const arm = box(.08, .08, .5, goldM, 0, -.1, .3, g, false); const cup = cyl(.16, .08, .16, goldM, 0, -.05, .55, g, 10);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(.24, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffc864', emissiveIntensity: 1.6, roughness: .2 })); globe.position.set(0, .2, .55); g.add(globe); globe.userData.surf = plate.userData.surf; skinMeshes.push(globe);
  const sp = new THREE.Sprite(glowMat); sp.position.set(0, .2, .6); sp.scale.set(1.5, 1.5, 1); g.add(sp);
  const p = new THREE.Vector3(); world.updateMatrixWorld(true); globe.getWorldPosition(p); anchor({ x: p.x, y: p.y, z: p.z, nx: f.nx, nz: f.nz, tx: 0, tz: 0, fixed: true, mesh: plate, lx: 0, ly: .75, surf: plate.userData.surf, shape: 'bola', size: [.5, .5, .5], name: 'la lámpara de pared', kind: 'lampara', prio: 4, room }); }
let glowMat;
function shelf(w, H, rows, seed, name = 'la estantería') { const g = new THREE.Group(); const D = .75;
  box(.12, H, D, woodM, -w / 2 + .06, H / 2, 0, g); box(.12, H, D, woodM, w / 2 - .06, H / 2, 0, g); box(w, .1, D, woodM, 0, .05, 0, g); box(w + .3, .25, D + .2, woodD, 0, H + .1, .05, g); box(w, H, .05, woodD, 0, H / 2, -D / 2 + .03, g, false);
  const crest = box(w * .5, .45, .08, goldM, 0, H + .45, D / 2 - .05, g, false);
  const rh = (H - .3) / rows, rowsM = [];
  for (let r = 0; r < rows; r++) { const y0 = .15 + r * rh; box(w - .2, .06, D, woodD, 0, y0 + rh - .03, .02, g, false);
    const sp = skinPlane(w - .26, rh - .1, spinesTex(w - .26, seed * 10 + r), 1, 1, 'estante', 'los libros de ' + name.replace(/^la /, 'la '), { roughness: .8 }); sp.position.set(0, y0 + (rh - .06) / 2, -.04); g.add(sp); rowsM.push(sp); hitMeshes.push(sp);
    RNG = seed * 31 + r; for (let k = 0; k < 2; k++) { const bw = rrn(.12, .2), bh = (rh - .1) * rrn(.75, .95); box(bw, bh, .5, M(BOOKC[Math.floor(rr() * BOOKC.length)], { roughness: .6 }), rrn(-w / 2 + .5, w / 2 - .5), y0 + bh / 2, .06 + rr() * .1, g, false); } }
  for (let k = 0; k < 4; k++) { const b = box(rrn(.3, .5), .08, .45, M(BOOKC[k * 3 % 12]), rrn(-w / 2 + .5, w / 2 - .5), H + .27 + k * .08, 0, g, false); b.rotation.y = rrn(-.4, .4); }
  g.userData.rows = rowsM; g.userData.rh = rh; return g; }
function shelfAt(room, x, z, ry, w, H, rows, seed, name) { const g = shelf(w, H, rows, seed, name); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g); const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)); const hw = (w * c + .8 * s) / 2, hd = (w * s + .8 * c) / 2; collBox(x - hw, x + hw, z - hd, z + hd); props.push(mkProp(g, x, z, { box: { minx: x - hw, maxx: x + hw, minz: z - hd, maxz: z + hd } }, name, room));
  g.userData.rows.forEach(sp => anchorOn(sp, 0, 0, 'libro', [.24, g.userData.rh * .78, .3], 'un libro de ' + name.replace(/^la /, 'la '), 'libro', 1, 2)); return g; }
function mkProp(g, x, z, shape, name, room) { const p = Object.assign({ x, z, r: shape.r || 0, g, name, room, fade: 1, mats: [] }, shape); g.traverse(m => { if (m.isMesh && m.material && m.userData.surf) { m.material.userData.op = 1; m.material.userData.tr = false; p.mats.push(m.material); } else if (m.isMesh && m.material) { m.material = m.material.clone(); m.material.userData.op = m.material.opacity; m.material.userData.tr = m.material.transparent; p.mats.push(m.material); } if (m.isMesh) { m.userData.prop = p; hitMeshes.push(m); } }); return p; }
function prop(g, x, z, shape, name, room, top, ry = 0) { g.position.set(x, 0, z); g.rotation.y = ry; world.add(g); shadowAll(g); const p = mkProp(g, x, z, shape, name, room); props.push(p); if (shape.box) collBox(shape.box.minx, shape.box.maxx, shape.box.minz, shape.box.maxz, top ?? 99); else collCyl(x, z, shape.r, top ?? 99); return p; }
const bx = (x, z, w, d) => ({ box: { minx: x - w / 2, maxx: x + w / 2, minz: z - d / 2, maxz: z + d / 2 } });
// cara superior con piel (para alfombras de mesa, camas, bancos, escalones)
function topSkin(par, w, d, y, tex, ru, rv, name, kind = 'mueble') { const m = skinPlane(w, d, tex, ru, rv, kind, name, { roughness: .8 }); m.rotation.x = -Math.PI / 2; m.position.y = y + .005; par.add(m); return m; }
function frontSkin(par, w, h, x, y, z, tex, ru, rv, name, ry = 0) { const m = skinPlane(w, h, tex, ru, rv, 'mueble', name, { roughness: .7 }); m.position.set(x, y, z); m.rotation.y = ry; par.add(m); return m; }
function addRug(room, w, d, pal, ox = 0, oz = 0, name = 'la alfombra persa') { const [cx, cz] = rooms[room].c; const m = skinPlane(w, d, rugTex(w, d, pal), 1, 1, 'alfombra', name, { roughness: .97 }); m.rotation.x = -Math.PI / 2; m.position.set(cx + ox, .025, cz + oz); world.add(m); hitMeshes.push(m);
  const fr = M('#f4ecd8'); for (const s of [-1, 1]) for (let i = 0; i < Math.floor(w / .14); i++) { } const fg = new THREE.Mesh(new THREE.BoxGeometry(w, .02, .14), fr); fg.position.set(cx + ox, .02, cz + oz - d / 2 - .07); world.add(fg); const fg2 = fg.clone(); fg2.position.z = cz + oz + d / 2 + .07; world.add(fg2); }
function chandelier(room) { const [cx, cz] = rooms[room].c; const g = new THREE.Group(); g.position.set(cx, WH - .45, cz); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, .07, 8, 32), goldM); ring.rotation.x = Math.PI / 2; g.add(ring); const ring2 = new THREE.Mesh(new THREE.TorusGeometry(.8, .05, 8, 24), goldM); ring2.rotation.x = Math.PI / 2; ring2.position.y = .5; g.add(ring2); cyl(.03, .03, 1.8, goldM, 0, 1.5, 0, g, 6);
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; const c = cyl(.05, .05, .28, M('#fff8e8'), Math.cos(a) * 1.4, .2, Math.sin(a) * 1.4, g, 6); const fl = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); fl.scale.y = 1.7; fl.position.set(Math.cos(a) * 1.4, .4, Math.sin(a) * 1.4); g.add(fl); for (let k = 0; k < 2; k++) { const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.07), M('#e8f6ff', { roughness: .05, metalness: .2, transparent: true, opacity: .8 })); cr.position.set(Math.cos(a + .3) * 1.4, -.2 - k * .16, Math.sin(a + .3) * 1.4); g.add(cr); } }
  world.add(g); const L = new THREE.PointLight(rooms[room].def.light, 34, 30, 1.2); L.position.set(cx, WH - 1.2, cz); world.add(L); decor.push({ o: g, f: (o, tt) => { o.rotation.y = tt * .12; L.intensity = 32 + Math.sin(tt * 7 + cx) * 1.5; } }); }
function vaultTex() { return cached('vault', () => { const [cv, x] = CV(512, 256); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#9fdcff'); g.addColorStop(.5, '#d8f1ff'); g.addColorStop(1, '#9fdcff'); x.fillStyle = g; x.fillRect(0, 0, 512, 256); for (let i = 0; i < 14; i++) { const cx = rr() * 512, cy = 40 + rr() * 176; for (let k2 = 0; k2 < 4; k2++) { x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(cx + k2 * 16, cy + Math.sin(k2) * 6, 14 + rr() * 8, 0, 7); x.fill(); } } x.fillStyle = '#ffe066'; x.font = '20px serif'; for (let i = 0; i < 20; i++) x.fillText('✦', rr() * 512, rr() * 256); return mkTex(cv); }); }
function doorArch(x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const a = new THREE.Mesh(new THREE.TorusGeometry(DOOR / 2, .16, 8, 20, Math.PI), goldM); a.position.y = DH - DOOR / 2; g.add(a); for (const s of [-1, 1]) { cyl(.22, .26, DH - DOOR / 2, goldM, s * DOOR / 2, (DH - DOOR / 2) / 2, 0, g); const wp = new THREE.Vector3(s * DOOR / 2, 0, 0).applyAxisAngle(_up0, ry); collCyl(x + wp.x, z + wp.z, .3); } world.add(g);
  const sx = Math.abs(Math.cos(ry)) > .5; const lt = new THREE.Mesh(new THREE.BoxGeometry(sx ? DOOR : .32, WH - DH, sx ? .32 : DOOR), stoneM); lt.position.set(x, DH + (WH - DH) / 2, z); world.add(lt); wallMeshes.push(lt); }
const _up0 = new THREE.Vector3(0, 1, 0);
function buildCastle() {
  scene.remove(world); world.traverse(o => { if (o.geometry) o.geometry.dispose(); }); world = new THREE.Group(); scene.add(world);
  props = []; walls = []; wallMeshes = []; decor = []; hitMeshes = []; lookers = []; rooms = []; surfaces = []; skinMeshes = []; anchors = []; cols = [];
  RNG = 4242; goldM = GOLD(); woodM = new THREE.MeshStandardMaterial({ map: woodTex('#8a4a22', '#4a2410', 4), roughness: .6 }); woodD = M('#5a2e14', { roughness: .65 }); stoneM = new THREE.MeshStandardMaterial({ map: stoneTex('#e9dcc8', '#b8a488'), roughness: .85 }); metalM = new THREE.MeshStandardMaterial({ map: metalTex('#c9d2e0'), metalness: .75, roughness: .32 }); darkM = M('#2a2238', { roughness: .4 });
  glowMat = new THREE.SpriteMaterial({ map: dotTex(), color: '#ffc870', transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false });
  decor.push({ o: glowMat, f: (o, t) => { o.opacity = .65 + Math.sin(t * 9) * .08 + Math.sin(t * 23) * .05; } });
  scene.fog = null; scene.background = new THREE.Color('#ffe6c8');
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) { const id = i + j * COLS; rooms.push({ id, i, j, c: roomC(i, j), def: ROOMS[id] }); }
  for (const r of rooms) { const d = r.def, [cx, cz] = r.c, h = RS / 2, i = r.i, j = r.j;
    const floor = skinPlane(RS, RS, d.floor(), RS / 4, RS / 4, 'suelo', 'el suelo', { roughness: .4, metalness: .05 }); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); world.add(floor); hitMeshes.push(floor);
    const hasN = [j > 0, j < ROWS - 1, i > 0, i < COLS - 1];
    for (let s = 0; s < 4; s++) { if (hasN[s]) { wallSeg(r.id, s, -h + .15, -DOOR / 2, d); wallSeg(r.id, s, DOOR / 2, h - .15, d); } else wallSeg(r.id, s, -h + .15, h - .15, d); }
    const v = new THREE.Mesh(new THREE.CylinderGeometry(h, h, RS, 24, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ map: vaultTex(), side: THREE.BackSide, roughness: 1, emissive: '#ffffff', emissiveMap: vaultTex(), emissiveIntensity: .35 })); v.rotation.z = Math.PI / 2; v.position.set(cx, WH, cz); world.add(v);
    for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(h, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ map: damaskTex(d.paper[0], d.paper[1]), roughness: .8, side: THREE.DoubleSide })); cap.position.set(cx + s * h * .999, WH, cz); cap.rotation.y = Math.PI / 2; world.add(cap); }
    // columnas en las esquinas (con colisión)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = cx + sx * (h - .6), z = cz + sz * (h - .6); cyl(.28, .32, WH, stoneM, x, WH / 2, z); box(.8, .4, .8, goldM, x, WH - .2, z); box(.85, .35, .85, stoneM, x, .17, z); collCyl(x, z, .5); }
    chandelier(r.id); }
  for (const r of rooms) { const [cx, cz] = r.c; if (r.i < COLS - 1) doorArch(cx + RS / 2, cz, Math.PI / 2); if (r.j < ROWS - 1) doorArch(cx, cz + RS / 2, 0); }
  rooms.forEach(r => { RNG = 1000 + r.id * 77; r.def.build(r.id); });
  finalizeSurfaces(); wallMeshes.forEach(m => m.updateMatrixWorld());
  const n = 200, pg = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rnd(XMIN, XMAX); pos[i * 3 + 1] = rnd(.5, 6); pos[i * 3 + 2] = rnd(ZMIN, ZMAX); } pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: .2, color: '#fff3b0', transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, map: dotTex() })); world.add(pts); decor.push({ o: pts, f: (o, t) => { o.position.y = Math.sin(t * .5) * .3; } });
}
let _dot; function dotTex() { if (_dot) return _dot; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(.4, 'rgba(255,255,220,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _dot = new THREE.CanvasTexture(cv); return _dot; }
const RC = id => rooms[id].c;
// ---------------- muebles ----------------
function knight(c1, c2, sym) { const g = new THREE.Group(); const mm = metalM, dk = darkM;
  box(1.1, .3, 1.1, stoneM, 0, .15, 0, g);
  for (const s of [-1, 1]) { box(.2, .12, .36, mm, s * .17, .36, .06, g); cyl(.11, .1, .75, mm, s * .17, .78, 0, g, 10); const kn = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), mm); kn.position.set(s * .17, 1.18, .03); g.add(kn); cyl(.14, .12, .55, mm, s * .17, 1.46, 0, g, 10); }
  cyl(.4, .34, .38, mm, 0, 1.86, 0, g, 14); const belt = new THREE.Mesh(new THREE.TorusGeometry(.38, .04, 6, 20), goldM); belt.rotation.x = Math.PI / 2; belt.position.y = 2.02; g.add(belt);
  const chest = new THREE.Mesh(lathe([[.36, 0], [.42, .28], [.45, .55], [.4, .8], [.22, .92], [0, .94]], 16), mm); chest.position.y = 2.02; chest.scale.z = .78; g.add(chest);
  const tab = skinPlane(.5, .8, clothTex(c1, c2), 1, 1, 'mueble', 'la túnica del soldado', { roughness: .8 }); tab.position.set(0, 2.2, .37); g.add(tab);
  cyl(.2, .24, .16, mm, 0, 3.0, 0, g, 12);
  for (const s of [-1, 1]) { const pa = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mm); pa.position.set(s * .5, 2.8, 0); pa.scale.set(1.1, .8, 1); g.add(pa); cyl(.09, .09, .5, mm, s * .56, 2.45, 0, g, 8); const el = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), mm); el.position.set(s * .56, 2.18, 0); g.add(el); const fa = cyl(.09, .08, .45, mm, s * .56, 2.05, .2, g, 8); fa.rotation.x = 1.2; box(.16, .16, .2, mm, s * .56, 1.98, .43, g); }
  const hel = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 12), mm); hel.position.y = 3.3; hel.scale.set(1, 1.12, 1.05); g.add(hel); box(.44, .05, .06, dk, 0, 3.32, .29, g, false); box(.4, .05, .06, dk, 0, 3.2, .29, g, false); const ridge = box(.05, .1, .6, goldM, 0, 3.62, 0, g, false);
  for (let k = 0; k < 5; k++) { const pl = new THREE.Mesh(new THREE.SphereGeometry(.12 - k * .012, 8, 6), M(c2, { roughness: .9 })); pl.position.set(0, 3.72 + k * .06, -.05 - k * .1); g.add(pl); }
  const sh = skinPlane(.72, .95, heraldTex(c1, c2, sym), 1, 1, 'escudo', 'el escudo', { roughness: .5 }); sh.position.set(-.68, 2.15, .32); sh.rotation.y = .25; g.add(sh); const rim = box(.78, 1.0, .06, goldM, -.69, 2.15, .29, g, false); rim.rotation.y = .25;
  cyl(.03, .03, 3.8, woodD, .68, 1.95, .4, g, 6); const bl = box(.04, .45, .3, mm, .68, 3.65, .52, g, false); const sp = new THREE.Mesh(new THREE.ConeGeometry(.05, .4, 6), mm); sp.position.set(.68, 4.05, .4); g.add(sp);
  g.userData.shield = sh; return g; }
function knightAt(room, x, z, ry, c1, c2, sym) { const g = knight(c1, c2, sym); prop(g, x, z, { r: .62 }, 'un soldado de armadura', room, 99, ry); world.updateMatrixWorld(true); anchorOn(g.userData.shield, 0, 0, 'lamina', [.5, .7, .08], 'el escudo del soldado', 'escudo', 0, 2); }
function throne() { const g = new THREE.Group(); const red = M('#c8394f', { roughness: .7 }); box(1.8, .9, 1.4, goldM, 0, .45, 0, g); box(1.5, .3, 1.2, red, 0, 1.05, .05, g); box(1.9, 3.4, .35, goldM, 0, 2.2, -.55, g); const bc = skinPlane(1.3, 2.4, clothTex('#c8394f', '#ffcf4a'), 1, 1, 'mueble', 'el respaldo del trono', { roughness: .8 }); bc.position.set(0, 2.25, -.36); g.add(bc); for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 8), goldM); b.position.set(s * .95, 4.0, -.55); g.add(b); box(.25, .5, 1.2, goldM, s * .85, 1.4, .05, g); } const cr = new THREE.Mesh(new THREE.ConeGeometry(.5, .7, 5), goldM); cr.position.set(0, 4.25, -.55); g.add(cr); return g; }
function chestG(c) { const g = new THREE.Group(); box(1.8, .85, .9, woodM, 0, .43, 0, g); const lid = box(1.84, .14, .94, M(c, { roughness: .6 }), 0, .92, 0, g); for (const s of [-.6, 0, .6]) box(.08, .9, .95, goldM, s, .45, 0, g, false); const lk = box(.18, .22, .05, goldM, 0, .7, .47, g, false); frontSkin(g, 1.6, .7, 0, .43, .455, woodTex('#8a4a22', '#4a2410', 4), 1, 1, 'el baúl'); topSkin(g, 1.84, .94, .99, woodTex('#8a4a22', '#4a2410', 4), 1, 1, 'la tapa del baúl'); return g; }
function tableG(w, d, h, tex, name, cloth) { const g = new THREE.Group(); if (cloth) { box(w + .3, h - .15, d + .3, M('#f4ecdf'), 0, (h - .15) / 2 + .15, 0, g); frontSkin(g, w + .3, h - .15, 0, (h - .15) / 2 + .15, d / 2 + .151, tex, (w + .3) / 2, (h - .15) / 2, 'el mantel'); frontSkin(g, w + .3, h - .15, 0, (h - .15) / 2 + .15, -d / 2 - .151, tex, (w + .3) / 2, (h - .15) / 2, 'el mantel', Math.PI); topSkin(g, w + .3, d + .3, h, tex, (w + .3) / 2, (d + .3) / 2, 'el mantel'); }
  else { box(w, .12, d, woodM, 0, h - .06, 0, g); topSkin(g, w, d, h, woodTex('#9a5a2a', '#5a2e14', 5), w / 2, 1, name); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(.07, .05, h - .12, woodD, sx * (w / 2 - .15), (h - .12) / 2, sz * (d / 2 - .15), g, 8); } return g; }
function chairG(c) { const g = new THREE.Group(); box(.7, .1, .7, woodM, 0, .55, 0, g); box(.62, .06, .62, M(c, { roughness: .8 }), 0, .63, 0, g); box(.7, 1.0, .08, woodM, 0, 1.1, -.33, g); for (const [a, b] of [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]]) cyl(.04, .04, .55, woodD, a, .27, b, g, 6); return g; }
function armchair(c) { const g = new THREE.Group(); const t = clothTex(c, shade(c, .4)); const m = new THREE.MeshStandardMaterial({ map: t, roughness: .85 }); box(1.4, .55, 1.1, m, 0, .45, 0, g); box(1.4, 1.2, .3, m, 0, 1.1, -.45, g); for (const s of [-1, 1]) box(.25, .45, 1.1, m, s * .7, .85, 0, g); for (const [a, b] of [[-.55, -.4], [.55, -.4], [-.55, .4], [.55, .4]]) cyl(.05, .04, .2, goldM, a, .1, b, g, 6); frontSkin(g, 1.1, 1.0, 0, 1.15, -.29, t, 1, 1, 'el sillón'); topSkin(g, 1.15, .85, .73, t, 1, 1, 'el cojín del sillón'); return g; }
function globe() { const g = new THREE.Group(); cyl(.1, .4, 1, woodD, 0, .5, 0, g); const s = new THREE.Mesh(new THREE.SphereGeometry(.75, 24, 16), M('#5fa8d8')); s.position.y = 1.6; g.add(s); for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(new THREE.SphereGeometry(.3, 8, 6), M('#7ec957')); c.position.setFromSphericalCoords(.62, rnd(.6, 2.4), rnd(0, 6)); c.scale.set(1, .5, 1.3); c.position.y += 1.6; g.add(c); } const ring = new THREE.Mesh(new THREE.TorusGeometry(.86, .04, 6, 28), goldM); ring.position.y = 1.6; ring.rotation.x = 1.2; g.add(ring); g.userData.spin = s; return g; }
function candelabra() { const g = new THREE.Group(); cyl(.3, .4, .1, goldM, 0, .05, 0, g); cyl(.05, .06, 2.2, goldM, 0, 1.15, 0, g, 8); for (let k = -1; k <= 1; k++) { const a = box(.6, .04, .04, goldM, 0, 2.2, 0, g, false); cyl(.05, .05, .3, M('#fff8e8'), k * .3, 2.4, 0, g, 6); const sp = new THREE.Sprite(glowMat); sp.position.set(k * .3, 2.62, 0); sp.scale.set(.7, .7, 1); g.add(sp); } return g; }
function plantG() { const g = new THREE.Group(); cyl(.35, .26, .65, M('#c9603f', { roughness: .6 }), 0, .32, 0, g); for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(.35, 0), M(k % 2 ? '#4fa85f' : '#6fc87a', { roughness: .8, flatShading: true })); l.position.set(rnd(-.25, .25), .9 + k * .14, rnd(-.25, .25)); g.add(l); } return g; }
function bust() { const g = new THREE.Group(); const w = M('#f6f2ea', { roughness: .35 }); cyl(.42, .5, 1.25, w, 0, .62, 0, g, 14); box(1, .12, 1, w, 0, 1.3, 0, g); const sh = new THREE.Mesh(new THREE.SphereGeometry(.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), w); sh.scale.set(1, .5, .7); sh.position.y = 1.36; g.add(sh); const h = new THREE.Mesh(new THREE.SphereGeometry(.38, 16, 12), w); h.position.y = 1.95; h.scale.set(.9, 1.1, 1); g.add(h); const n = new THREE.Mesh(new THREE.ConeGeometry(.07, .18, 6), w); n.position.set(0, 1.92, .37); n.rotation.x = Math.PI / 2; g.add(n); for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 5), w); c.position.set(Math.cos(k) * .3, 2.2 + Math.sin(k * 2) * .05, Math.sin(k) * .3 - .05); g.add(c); } return g; }
function vase(c1, c2) { const g = new THREE.Group(); const v = new THREE.Mesh(lathe([[0, 0], [.3, 0], [.5, .45], [.46, 1.0], [.24, 1.35], [.32, 1.6], [0, 1.6]], 20), new THREE.MeshStandardMaterial({ map: clothTex(c1, c2), roughness: .25 })); g.add(v); for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.15, 8, 6), M(pick(['#ff5f8f', '#ffd23f', '#5fc8ff', '#ffffff']))); f.position.set(rnd(-.25, .25), 1.9 + rnd(0, .3), rnd(-.25, .25)); g.add(f); } return g; }
function bed() { const g = new THREE.Group(); const bt = clothTex('#a77bff', '#ffffff'); box(3.2, .55, 4.3, woodM, 0, .28, 0, g); box(3.1, .35, 4.1, M('#ffffff'), 0, .72, .05, g); box(3.25, .2, 3.1, new THREE.MeshStandardMaterial({ map: bt }), 0, .95, .55, g); topSkin(g, 3.25, 3.1, 1.05, bt, 2, 2, 'la colcha'); frontSkin(g, 3.25, .5, 0, .8, 2.11, bt, 2, .4, 'la colcha'); for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.SphereGeometry(.5, 12, 8), M('#fff6fb')); pl.scale.set(1.1, .38, .65); pl.position.set(s * .75, 1.05, -1.5); g.add(pl); }
  const hb = box(3.4, 2.6, .25, woodM, 0, 1.3, -2.1, g); const hbs = frontSkin(g, 2.8, 1.6, 0, 1.6, -1.97, clothTex('#ff9fd6', '#ffffff'), 1.5, 1, 'el cabecero'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { cyl(.1, .1, 3.6, woodD, sx * 1.55, 1.8, sz * 2.05, g, 8); const b = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), goldM); b.position.set(sx * 1.55, 3.65, sz * 2.05); g.add(b); } return g; }
function wardrobe() { const g = new THREE.Group(); box(2.6, 4.2, 1, woodM, 0, 2.1, 0, g); box(2.9, .3, 1.15, woodD, 0, 4.3, 0, g); const t = panelTex('#8a4a22', '#e8b84a'); for (const s of [-1, 1]) frontSkin(g, 1.22, 3.6, s * .63, 2.1, .505, t, 1, 1.6, 'el armario'); for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), goldM); k.position.set(s * .1, 2.1, .55); g.add(k); } return g; }
function sideboard(w) { const g = new THREE.Group(); box(w, 1.05, .8, woodM, 0, .53, 0, g); frontSkin(g, w - .1, .95, 0, .53, .405, panelTex('#8a4a2a', '#ffd27a'), w / 2.4, .8, 'el aparador'); topSkin(g, w, .8, 1.06, marbleTex('#ffffff', '#f0e6ff', '#a090c0'), w / 1.6, .5, 'el mármol del aparador'); for (let i = 0; i < 5; i++) { const pl = cyl(.24, .24, .03, M('#ffffff'), -w / 2 + .5 + i * (w - 1) / 4, 1.3, -.2, g, 16); pl.rotation.x = -1.2; } return g; }
function benchG(c) { const g = new THREE.Group(); const t = clothTex(c, '#ffd27a'); box(2.2, .3, .7, new THREE.MeshStandardMaterial({ map: t }), 0, .45, 0, g); topSkin(g, 2.2, .7, .6, t, 2, .7, 'el cojín del banco'); for (const [a, b] of [[-1, -.28], [1, -.28], [-1, .28], [1, .28]]) cyl(.06, .05, .3, goldM, a, .15, b, g, 6); return g; }
function easel(kind, pal, seed) { const g = new THREE.Group(); for (const s of [-1, 1]) { const l = cyl(.04, .04, 2.6, woodD, s * .45, 1.25, .1, g, 6); l.rotation.z = s * .15; } const b = cyl(.04, .04, 2.4, woodD, 0, 1.2, -.4, g, 6); b.rotation.x = -.3; box(1.3, .08, .25, woodD, 0, .9, .2, g); const p = skinPlane(1.2, 1.5, artTex(kind, pal, seed), 1, 1, 'cuadro', 'el cuadro del caballete', { roughness: .75 }); p.position.set(0, 1.72, .26); p.rotation.x = -.12; g.add(p); g.userData.pic = p; return g; }
function jellyBear(c) { const g = new THREE.Group(); const jm = new THREE.MeshPhysicalMaterial({ color: c, transparent: true, opacity: .8, roughness: .1, clearcoat: 1, emissive: c, emissiveIntensity: .2 }); const b = new THREE.Mesh(new THREE.SphereGeometry(.7, 18, 12), jm); b.position.y = .7; g.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(.48, 18, 12), jm); h.position.y = 1.65; g.add(h); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), jm); e.position.set(s * .36, 2.02, 0); g.add(e); } face(g, 1.7, .46, 1.05); return g; }
function stairsImpossible(c1, c2) { const g = new THREE.Group(); cyl(.35, .35, WH, M(c2), 0, WH / 2, 0, g, 12); for (let i = 0; i < 22; i++) { const a = i * .45, y = .15 + i * .3; const st = box(1.3, .18, .55, M(i % 2 ? c1 : c2, { roughness: .4 }), Math.cos(a) * 1.0, y, Math.sin(a) * 1.0, g); st.rotation.y = -a; } return g; }
function cake() { const g = new THREE.Group(); [[1.0, .7, '#ffb3dc'], [.75, .6, '#ffffff'], [.5, .55, '#ffb3dc']].reduce((y, [r, h, c], i) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), new THREE.MeshStandardMaterial({ map: clothTex(c, i % 2 ? '#ff6fb5' : '#ffffff'), roughness: .4 })); t.position.y = y + h / 2; g.add(t); for (let k = 0; k < 10; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 5), M(pick(['#ff5f8f', '#ffd23f', '#5fc8ff']))); s.position.set(Math.cos(k * .63) * r, y + h, Math.sin(k * .63) * r); g.add(s); } return y + h; }, 0); const fl = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); fl.scale.y = 1.6; fl.position.y = 2.2; g.add(fl); cyl(.05, .05, .4, M('#5fc8ff'), 0, 2.0, 0, g, 6); return g; }
function teapot(c) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.55, 18, 12), new THREE.MeshStandardMaterial({ map: clothTex(c, '#ffffff'), roughness: .25 })); b.scale.y = .85; b.position.y = .5; g.add(b); const sp = cyl(.06, .12, .6, M(c), .6, .7, 0, g, 8); sp.rotation.z = -.8; const lid = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), M(c)); lid.position.y = 1.0; g.add(lid);
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 5), M('#c97a3a', { transparent: true, opacity: .85 })); g.add(d); decor.push({ o: d, f: (o, t) => { const k = (t * .6 + i / 6) % 1; o.position.set(.85 + k * .2, 1.0 + k * 2.4, 0); o.scale.setScalar(1 - k * .6); } }); } return g; }
function floatBooks(room, n) { const [cx, cz] = rooms[room].c; for (let i = 0; i < n; i++) { const b = new THREE.Group(); const c = pick(BOOKC); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.5, .04, .7), M(c)); p.position.x = s * .26; p.rotation.z = s * .35; b.add(p); } const x0 = cx + rnd(-6, 6), z0 = cz + rnd(-5, 6), y0 = rnd(4.6, 6), ph = rnd(0, 6); world.add(b); decor.push({ o: b, f: (o, t) => { o.position.set(x0 + Math.sin(t * .4 + ph) * 1.5, y0 + Math.sin(t * 1.3 + ph) * .3, z0 + Math.cos(t * .4 + ph) * 1.5); o.children.forEach((p, k) => p.rotation.z = (k ? 1 : -1) * (.2 + Math.abs(Math.sin(t * 6 + ph)) * .5)); o.rotation.y = t * .4 + ph; } }); } }
function moons(room) { const [cx, cz] = rooms[room].c; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(rnd(.3, .5), 12, 10), M('#fff6a8', { emissive: '#ffe066', emissiveIntensity: .6 })); const a = i / 4 * 6.28; world.add(m); decor.push({ o: m, f: (o, t) => o.position.set(cx + Math.cos(t * .2 + a) * 5, 5.6 + Math.sin(t + a) * .3, cz + 2 + Math.sin(t * .2 + a) * 4) }); } }
// ---------------- salas ----------------
const H9 = RS / 2;
function roomTrono(id) { const [cx, cz] = RC(id);
  addRug(id, 3.6, 12.5, ['#a8202f', '#e8b84a', '#1f3f7a', '#f4ecd8'], 0, 2.4, 'la alfombra roja');
  const st = stoneTex('#e9dcc8', '#b8a488'), mt = marbleTex('#f4ead8', '#e2cfa8', '#9a7a5a');
  [[.3, -4.8, -5.6], [.6, -5.6, -6.4], [.9, -6.4, -8.85]].forEach(([top, z1, z0], k) => { const w = 9 - k * 1.2, g = new THREE.Group(); g.position.set(cx, 0, cz + (z0 + z1) / 2); const d = z1 - z0; box(w, top, d, stoneM, 0, top / 2, 0, g); topSkin(g, w, d, top, mt, w / 4, d / 4, 'el escalón de mármol'); frontSkin(g, w, top, 0, top / 2, d / 2 + .005, st, w / 4, top / 2, 'el escalón de piedra'); world.add(g); collBox(cx - w / 2, cx + w / 2, cz + z0, cz + z1, top, 'escalón'); });
  const th = throne(); prop(th, cx, cz - 7.9, bx(cx, cz - 7.9, 1.9, 1.5), 'el trono', id); th.position.y = .9;
  knightAt(id, cx - 5.6, cz - 6.2, Math.PI / 2 - .3, '#c8394f', '#ffcf4a', '♛'); knightAt(id, cx + 5.6, cz - 6.2, -Math.PI / 2 + .3, '#1f3f7a', '#ffffff', '⚜');
  knightAt(id, cx - 3.4, cz + 1.5, Math.PI / 2, '#2f7a4f', '#ffcf4a', '♞'); knightAt(id, cx + 3.4, cz + 1.5, -Math.PI / 2, '#6b3a8e', '#ffcf4a', '♜');
  prop(candelabra(), cx - 3.2, cz - 4.2, { r: .4 }, 'el candelabro', id); prop(candelabra(), cx + 3.2, cz - 4.2, { r: .4 }, 'el candelabro', id);
  prop(chestG('#c8394f'), cx - 7.6, cz + 6.5, bx(cx - 7.6, cz + 6.5, .9, 1.8), 'el baúl', id, 1.0, Math.PI / 2); prop(plantG(), cx + 7.6, cz + 7.4, { r: .45 }, 'la maceta', id);
  hangArt(id, 0, -3.2, 4.4, 1.6, 2.6, 'tapiz', ['#c8394f', '#ffcf4a', '#1f3f7a'], 1, { name: 'el estandarte rojo' }); hangArt(id, 0, 3.2, 4.4, 1.6, 2.6, 'tapiz', ['#1f3f7a', '#ffffff', '#ffcf4a'], 2, { name: 'el estandarte azul' });
  hangArt(id, 2, 3, 3.0, 2.2, 2.8, 'retrato', ['#7a5cff', '#2f2a6a', '#5a3a1a'], 3, { eyes: true, name: 'el retrato de la Reina' }); hangArt(id, 2, -4.5, 2.4, 2.8, 3.6, 'tapiz', ['#e8455f', '#ffcf4a', '#ffffff'], 4, { name: 'el tapiz real' });
  hangArt(id, 3, 4.5, 3.0, 2.2, 2.8, 'retrato', ['#3fd1b5', '#8e2b3b', '#3a2a1a'], 5, { eyes: true, name: 'el retrato del Rey' }); hangArt(id, 1, 4.5, 2.0, 3.2, 2.4, 'paisaje', ['#7fc8ff', '#7ed957', '#2f7a4f', '#ffd23f'], 6, { breathe: true, name: 'el paisaje del reino' }); hangArt(id, 1, -4.6, 2.0, 2.4, 2.4, 'bodegon', ['#7a3a5a', '#ff5f8f', '#ffd23f', '#7ed957'], 7, { name: 'el bodegón' });
  for (const [s, a] of [[2, -1], [2, 7], [3, -6.5], [3, 7], [0, 0]]) lampAt(id, s, a, 2.9); }
function roomBiblio(id) { const [cx, cz] = RC(id);
  addRug(id, 8, 6, ['#1f3f7a', '#c9a227', '#8e2b3b', '#f4ecd8'], 0, 3.5, 'la alfombra azul');
  [-5.6, 0, 5.6].forEach((ox, k) => shelfAt(id, cx + ox, cz - H9 + .6, 0, 4.8, 4.8, 5, k + 1, 'la estantería grande'));
  for (const s of [-1, 1]) { shelfAt(id, cx - H9 + .6, cz + s * 5.3, Math.PI / 2, 4.2, 4.4, 5, 4 + (s > 0 ? 1 : 0), 'la estantería del oeste'); shelfAt(id, cx + H9 - .6, cz + s * 5.3, -Math.PI / 2, 4.2, 4.4, 5, 6 + (s > 0 ? 1 : 0), 'la estantería del este'); }
  for (const s of [-1, 1]) { shelfAt(id, cx + s * 4.2, cz - 2.4, 0, 3.6, 3.4, 4, 2 + s, 'la estantería del centro'); shelfAt(id, cx + s * 4.2, cz - 3.25, Math.PI, 3.6, 3.4, 4, 5 + s, 'la estantería del centro'); }
  const tb = tableG(3.4, 1.6, 1.0, null, 'la mesa de lectura'); prop(tb, cx, cz + 3.6, bx(cx, cz + 3.6, 3.4, 1.6), 'la mesa de lectura', id, 1.0);
  for (let k = 0; k < 5; k++) { const b = box(rnd(.4, .6), .12, rnd(.3, .45), M(BOOKC[k * 2 % 12]), cx + rnd(-1.3, 1.3), 1.06 + (k % 2) * .12, cz + 3.6 + rnd(-.4, .4)); b.rotation.y = rnd(-.5, .5); }
  const cnd = candelabra(); cnd.scale.setScalar(.35); cnd.position.set(cx + .9, 1.0, cz + 3.4); world.add(cnd);
  for (const s of [-1, 1]) prop(chairG('#2f6b4f'), cx + s * .9, cz + 5.0, { r: .45 }, 'una silla', id, .65, Math.PI);
  prop(armchair('#8e2b3b'), cx - 4.5, cz + 4.6, bx(cx - 4.5, cz + 4.6, 1.5, 1.2), 'el sillón rojo', id, .75, .5); prop(armchair('#1f6f78'), cx + 4.5, cz + 4.6, bx(cx + 4.5, cz + 4.6, 1.5, 1.2), 'el sillón turquesa', id, .75, -.5);
  prop(globe(), cx + 2.6, cz + 7.0, { r: .8 }, 'el globo terráqueo', id); prop(plantG(), cx - 7.4, cz + 7.6, { r: .45 }, 'la maceta', id);
  floatBooks(id, 8);
  for (const a of [-5, 5]) lampAt(id, 1, a, 2.8); lampAt(id, 0, -2.8, 5.6); lampAt(id, 0, 2.8, 5.6);
  hangArt(id, 1, 0, 5.6, 2.2, 1.3, 'paisaje', ['#ffb03d', '#2f7a4f', '#7ed957', '#ffffff'], 8, { name: 'el cuadro del bosque' }); }
function roomTorre(id) { const [cx, cz] = RC(id);
  const gz0 = cz - H9 + .15, gz1 = cz - 5.6, gx0 = cx - H9 + .15, gx1 = cx + 3, GHt = 2.4; const st = stoneTex('#d8d0f0', '#9a90c0'), mt = marbleTex('#e6e0ff', '#c9bdf0', '#6a5aa0');
  { const g = new THREE.Group(); const w = gx1 - gx0, d = gz1 - gz0; g.position.set((gx0 + gx1) / 2, 0, (gz0 + gz1) / 2); box(w, GHt, d, stoneM, 0, GHt / 2, 0, g); topSkin(g, w, d, GHt, mt, w / 4, d / 4, 'el suelo de la galería'); frontSkin(g, w, GHt, 0, GHt / 2, d / 2 + .005, st, w / 4, GHt / 4, 'el muro de la galería'); for (let i = 0; i <= 18; i++) { cyl(.06, .06, .9, goldM, -w / 2 + .2 + i * (w - .4) / 18, GHt + .45, d / 2 - .1, g, 6); } box(w, .1, .14, goldM, 0, GHt + .92, d / 2 - .1, g); world.add(g); collBox(gx0, gx1, gz0, gz1, GHt, 'galería'); collBox(gx0, gx1, gz1 - .2, gz1, 99, 'barandilla'); }
  for (let k = 0; k < 7; k++) { const top = .3 * (k + 1), x1 = gx1 + (7 - k) * .55, x0 = x1 - .55, z0 = gz0, z1 = cz - 6.4; const g = new THREE.Group(); g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); box(.55, top, z1 - z0, stoneM, 0, top / 2, 0, g); topSkin(g, .55, z1 - z0, top, mt, .2, .6, 'el escalón'); frontSkin(g, z1 - z0, top, .276, top / 2, 0, st, .6, top / 3, 'el escalón de piedra', Math.PI / 2); world.add(g); collBox(x0, x1, z0, z1, top, 'escalón'); }
  hangArt(id, 0, -5.5, 4.4, 2.2, 2.4, 'paisaje', ['#1a1040', '#b49cff', '#3a2a6a', '#ffe066'], 9, { name: 'el cuadro de la Luna' }); hangArt(id, 0, -1.5, 4.4, 2.0, 2.4, 'abstracto', ['#2a2a6a', '#ffd23f', '#ff5f8f', '#5fc8ff'], 10, { name: 'el mapa de estrellas' });
  lampAt(id, 0, -3.5, 4.8); lampAt(id, 0, .6, 4.8);
  const tel = new THREE.Group(); const tb = cyl(.22, .32, 2.0, new THREE.MeshStandardMaterial({ map: clothTex('#4a3a8e', '#ffcf4a') }), 0, 1.6, 0, tel, 12); tb.rotation.x = -.8; for (const a of [0, 2.1, 4.2]) { const l = cyl(.04, .04, 1.5, goldM, Math.cos(a) * .35, .7, Math.sin(a) * .35, tel, 6); l.rotation.set(Math.sin(a) * .3, 0, Math.cos(a) * .3); }
  tel.position.y = GHt; prop(tel, cx - 4, cz - 7.2, { r: .55 }, 'el telescopio', id, 99); tel.position.y = GHt;
  addRug(id, 7, 6, ['#2a1a5a', '#ffcf4a', '#b49cff', '#f4ecd8'], -2, 2.5, 'la alfombra de estrellas');
  prop(stairsImpossible('#ffd23f', '#ff9f3d'), cx + 5, cz + 3.5, { r: 1.6 }, 'la escalera imposible', id);
  for (const [ox, oz, c] of [[6.8, -2.5, '#9fdcff'], [-7, 6.5, '#ffd23f']]) prop(jellyBear(c), cx + ox, cz + oz, { r: .75 }, 'un osito de gelatina', id).jelly = true;
  prop(armchair('#4a3a8e'), cx - 2, cz + 6.8, bx(cx - 2, cz + 6.8, 1.5, 1.2), 'el sillón morado', id, .75, Math.PI);
  moons(id);
  hangArt(id, 3, 2.5, 2.2, 2.2, 2.8, 'criatura', ['#4a3a8e', '#ffd23f', '#ff5f8f'], 11, { breathe: true, name: 'el cuadro del Búho' }); hangArt(id, 1, -3, 2.0, 3.0, 2.2, 'tapiz', ['#3fd1b5', '#ffffff', '#1f6f78'], 12, { name: 'el tapiz turquesa' });
  lampAt(id, 3, -2, 2.8); lampAt(id, 3, 6.5, 2.8); lampAt(id, 1, 3, 2.8); }
function roomComedor(id) { const [cx, cz] = RC(id);
  addRug(id, 11, 5.5, ['#7a2a1a', '#ff9f3d', '#ffd27a', '#2f6b4f'], 0, .5, 'la alfombra naranja');
  const lt = clothTex('#ffffff', '#ff6fb5'); prop(tableG(8, 2.2, 1.1, lt, 'el mantel', true), cx, cz + .5, bx(cx, cz + .5, 8.3, 2.5), 'la mesa larga', id, 1.1);
  for (let i = 0; i < 6; i++) { const pl = cyl(.28, .28, .03, M('#fff'), cx - 3.2 + i * 1.28, 1.13, cz + .5 + (i % 2 ? .6 : -.6), world, 16); const fr = new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 6), M(pick(['#ff5f8f', '#ffd23f', '#7ed957']))); fr.position.set(pl.position.x, 1.24, pl.position.z); world.add(fr); }
  const ck = cake(); ck.scale.setScalar(.55); ck.position.set(cx, 1.1, cz + .5); world.add(ck);
  [-3, -1, 1, 3].forEach(ox => { for (const s of [-1, 1]) prop(chairG('#ff6fb5'), cx + ox, cz + .5 + s * 1.75, { r: .42 }, 'una silla', id, .65, s > 0 ? Math.PI : 0); });
  prop(sideboard(4.5), cx - H9 + .75, cz + 1, bx(cx - H9 + .75, cz + 1, .85, 4.5), 'el aparador', id, 1.06, Math.PI / 2);
  prop(teapot('#5fc8ff'), cx + 6.5, cz + 6.5, { r: .6 }, 'la tetera gigante', id); prop(cake(), cx - 6, cz + 6.6, { r: 1.0 }, 'la tarta gigante', id); prop(plantG(), cx + 7.6, cz - 7.4, { r: .45 }, 'la maceta', id);
  hangArt(id, 1, 0, 2.6, 3.4, 2.6, 'bodegon', ['#3a1a2a', '#ff5f8f', '#ffd23f', '#7ed957'], 13, { breathe: true, name: 'el bodegón vivo' }); hangArt(id, 2, -4.5, 3.0, 2.2, 2.8, 'retrato', ['#ffd23f', '#2d4e8a', '#6a3a1a'], 14, { eyes: true, name: 'el retrato del Cocinero' }); hangArt(id, 0, 5.5, 3.2, 2.2, 2.4, 'criatura', ['#7ed957', '#ff9f3d', '#ffffff'], 15, { name: 'el cuadro del Pastelito' }); hangArt(id, 3, -5, 2.4, 2.4, 3.2, 'tapiz', ['#5fc8ff', '#ffffff', '#2d4e8a'], 16, { name: 'el tapiz de cuadros' });
  for (const [s, a] of [[1, -5], [1, 5], [2, 4.5], [0, -5.5], [3, 5]]) lampAt(id, s, a, 2.8); }
function roomCuadros(id) { const [cx, cz] = RC(id);
  addRug(id, 6, 6, ['#5a1a3a', '#ff5f8f', '#ffd23f', '#ffffff'], 0, 0, 'la alfombra rosa');
  const kinds = ['paisaje', 'retrato', 'abstracto', 'criatura', 'bodegon', 'paisaje'];
  [-6, -2, 2, 6].forEach((a, k) => hangArt(id, 1, a, 1.9 + (k % 2) * .4, 2.6, 2.9, kinds[k], [pick(['#ff9fd6', '#7fc8ff', '#ffd23f', '#3fd1b5']), '#7a5cff', '#ff5f8f', '#7ed957'], 20 + k, { breathe: k === 2, eyes: k === 1, name: ['el paisaje que respira', 'el retrato que mira', 'el cuadro moderno', 'el cuadro del Pulpo'][k] }));
  for (const s of [-1, 1]) { hangArt(id, 0, s * 5.5, 3.4, 2.4, 2.0, kinds[3 + (s > 0 ? 1 : 0)], ['#2a6a5a', '#ffd23f', '#ff5f8f', '#ffffff'], 30 + s, { name: s < 0 ? 'el cuadro del Dragoncito' : 'el bodegón de peras' }); hangArt(id, 2, s * 5.5, 2.2, 2.0, 2.6, 'retrato', [s < 0 ? '#ff6fb5' : '#5fc8ff', '#3a2a5a', '#2a1a0a'], 33 + s, { eyes: s < 0, name: s < 0 ? 'el retrato de la Duquesa' : 'el retrato del Duque' }); hangArt(id, 3, s * 5.5, 2.2, 2.0, 2.6, 'abstracto', ['#fff0a8', '#ff5f8f', '#2d4e8a', '#3fd1b5'], 36 + s, { name: 'el cuadro de colores' }); }
  for (let k = 0; k < 4; k++) hangArt(id, 1, -6 + k * 4, 5.2, 1.4, 1.1, 'paisaje', ['#ffb03d', '#7ed957', '#2f7a4f', '#fff'], 40 + k, { name: 'el cuadrito' });
  prop(bust(), cx - 6, cz - 6, { r: .55 }, 'el busto', id); prop(bust(), cx + 6, cz - 6, { r: .55 }, 'el busto', id);
  prop(vase('#ff6fb5', '#ffd23f'), cx - 7.4, cz + 7.4, { r: .55 }, 'un jarrón', id); prop(vase('#7ed957', '#ffffff'), cx + 7.4, cz + 7.4, { r: .55 }, 'un jarrón', id);
  prop(benchG('#7a5cff'), cx - 3.2, cz + 3.6, bx(cx - 3.2, cz + 3.6, 2.2, .7), 'el banco', id, .6); prop(benchG('#ff5f8f'), cx + 3.2, cz + 3.6, bx(cx + 3.2, cz + 3.6, 2.2, .7), 'el banco', id, .6);
  const es = easel('criatura', ['#ffd23f', '#ff6fb5', '#7a5cff'], 50); prop(es, cx + 4, cz - 2, { r: .6 }, 'el caballete', id, 99, -.5); world.updateMatrixWorld(true); anchorOn(es.userData.pic, 0, 0, 'lamina', [1, 1.2, .08], 'el cuadro del caballete', 'cuadro', .1, 3);
  knightAt(id, cx - 2.6, cz - 7.6, 0, '#c99a2a', '#2d4e8a', '♚'); knightAt(id, cx + 2.6, cz - 7.6, 0, '#2d4e8a', '#c99a2a', '♚');
  for (const [s, a] of [[1, 0], [2, -2.8], [2, 2.8], [3, -2.8], [3, 2.8]]) lampAt(id, s, a, 3.6); }
function roomDormi(id) { const [cx, cz] = RC(id);
  addRug(id, 6.5, 4.5, ['#5a2a6a', '#ff9fd6', '#ffd23f', '#ffffff'], -1.5, 2, 'la alfombra lila');
  prop(bed(), cx + 4, cz + 4.4, bx(cx + 4, cz + 4.4, 3.4, 4.4), 'la cama real', id, 1.05, Math.PI);
  prop(wardrobe(), cx - 4.5, cz - H9 + .75, bx(cx - 4.5, cz - H9 + .75, 2.9, 1.15), 'el armario', id);
  { const g = new THREE.Group(); box(2.4, 1.2, .7, woodM, 0, .6, 0, g); frontSkin(g, 2.3, 1.1, 0, .6, .355, panelTex('#c76a9e', '#ffd6ea'), 1, 1, 'la cómoda'); topSkin(g, 2.4, .7, 1.2, marbleTex('#ffffff', '#ffe6f2', '#c08aa8'), 1, .3, 'el mármol de la cómoda'); const mir = new THREE.Mesh(new THREE.CircleGeometry(.8, 24), new THREE.MeshStandardMaterial({ color: '#dff6ff', metalness: .9, roughness: .05 })); mir.position.set(0, 2.3, -.3); g.add(mir); const mf = new THREE.Mesh(new THREE.TorusGeometry(.82, .07, 6, 28), goldM); mf.position.copy(mir.position); g.add(mf); prop(g, cx + 1.5, cz - H9 + .5, bx(cx + 1.5, cz - H9 + .5, 2.4, .7), 'la cómoda', id, 1.2); }
  for (const s of [-1, 1]) { const ns = new THREE.Group(); box(.7, .8, .6, woodM, 0, .4, 0, ns); const lamp = new THREE.Mesh(new THREE.ConeGeometry(.3, .4, 10, 1, true), M('#ffd6ea', { emissive: '#ffb3dc', emissiveIntensity: .5, side: THREE.DoubleSide })); lamp.position.y = 1.25; ns.add(lamp); cyl(.03, .03, .35, goldM, 0, .95, 0, ns, 6); prop(ns, cx + 4 + s * 2.2, cz + 7.9, { r: .45 }, 'la mesilla', id, .8); }
  prop(chestG('#a77bff'), cx + 4, cz + 1.4, bx(cx + 4, cz + 1.4, 1.8, .9), 'el baúl', id, 1.0);
  { const ct = clothTex('#a8205a', '#ffd23f'); for (const s of [-1, 1]) { const cu = skinPlane(1.4, 5.6, ct, 1, 3, 'tela', 'la cortina', { roughness: .9, side: THREE.DoubleSide }); onWall(id, 3, s * 2.6, 3.1, .12, cu); anchorOn(cu, 0, -1.6, 'lamina', [.8, 1.5, .08], 'la cortina', 'cortina', .2, 2); } box(.2, .2, 7, goldM, cx + H9 - .3, 6.0, cz); hangArt(id, 3, 0, 3.4, 3.4, 3.0, 'paisaje', ['#ffb3dc', '#a77bff', '#5a2a6a', '#ffffff'], 60, { breathe: true, name: 'el ventanal pintado' }); }
  prop(armchair('#ff9fd6'), cx - 5.5, cz + 2, bx(cx - 5.5, cz + 2, 1.5, 1.2), 'el sillón rosa', id, .75, Math.PI / 2); prop(jellyBear('#ff6fb5'), cx - 6.6, cz + 6.6, { r: .75 }, 'un osito de gelatina', id).jelly = true;
  hangArt(id, 2, 3.5, 3.0, 2.2, 2.8, 'retrato', ['#ff6fb5', '#ffffff', '#5a2a1a'], 61, { eyes: true, name: 'el retrato de la Princesa' }); hangArt(id, 1, -4, 4.7, 2.6, 1.8, 'paisaje', ['#7fd3ff', '#ffffff', '#7ed957', '#ffd23f'], 62, { name: 'el cuadro de las nubes' }); hangArt(id, 2, -4.5, 2.2, 2.2, 3.0, 'tapiz', ['#a77bff', '#ffd6ea', '#5a2a6a'], 63, { name: 'el tapiz lila' });
  for (const [s, a] of [[2, 6.5], [1, 3], [0, 4.5], [3, -6], [3, 6]]) lampAt(id, s, a, 2.8); }
// ---------- personajes (Manchas moldeables con piel copiada) ----------
const dropGeo = (() => { const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI; const x = .62 * Math.sin(a) * Math.pow(Math.sin(a / 2), .8), y = .66 * (1 + Math.cos(a)); pts.push(new THREE.Vector2(Math.max(x, .0001), y / 1.32)); } pts.reverse(); return new THREE.LatheGeometry(pts, 40); })();
const boxGeoR = (() => { const g = new THREE.BoxGeometry(1, 1, 1, 6, 6, 6), p = g.attributes.position, v = new THREE.Vector3(), r = .14; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const c = new THREE.Vector3(clamp(v.x, -.5 + r, .5 - r), clamp(v.y, -.5 + r, .5 - r), clamp(v.z, -.5 + r, .5 - r)); const d = v.clone().sub(c); if (d.length() > 1e-5) d.setLength(r); v.copy(c).add(d); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); g.translate(0, .5, 0); return g; })();
const SHAPES = { gota: { geo: 'drop', s: [1.05, 1.3, 1.05], n: '💧 Gota' }, chafada: { geo: 'drop', s: [1.9, .16, 1.9], n: '🥞 Chafada' }, lamina: { geo: 'box', s: [1.2, 1.4, .08], n: '📄 Lámina' }, libro: { geo: 'box', s: [.24, .8, .3], n: '📕 Libro' }, bola: { geo: 'drop', s: [.55, .55, .55], n: '🟠 Bola' }, alta: { geo: 'drop', s: [.75, 2.1, .75], n: '🗿 Alta' } };
const MANCHA_COLS = ['#5fc8ff', '#ff8fd0', '#b48cff', '#7fe0a0', '#ffb36b', '#ff6f7f'];
const STEP = .42, GRAV = 22, JUMPV = 7.8;
let manchas = [];
function baseTex(col) { return cached('base' + col, () => { const [cv, x] = CV(128, 128); x.fillStyle = col; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(rnd(0, 128), rnd(0, 128), rnd(4, 10), 0, 7); x.fill(); } return mkTex(cv); }); }
function skinMat(col) { const mat = new THREE.MeshStandardMaterial({ map: baseTex(col), roughness: .35 }); const u = { uSkin: { value: new THREE.Matrix4() }, uMode: { value: 0 } }; mat.userData.u = u;
  mat.onBeforeCompile = sh => { sh.uniforms.uSkin = u.uSkin; sh.uniforms.uMode = u.uMode;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uSkin; varying vec2 vSk;').replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 wq = modelMatrix * vec4(transformed, 1.0); vSk = (uSkin * wq).xy; }');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uMode; varying vec2 vSk;').replace('#include <map_fragment>', '#ifdef USE_MAP\n vec2 suv = uMode > .5 ? vSk : vMapUv; vec4 sampledDiffuseColor = texture2D(map, suv); diffuseColor *= sampledDiffuseColor;\n#endif'); };
  mat.customProgramCacheKey = () => 'skin4'; return mat; }
function makeMancha(col, name, isPlayer) {
  const g = new THREE.Group(); const inner = new THREE.Group(); g.add(inner); const mat = skinMat(col);
  const bodyDrop = new THREE.Mesh(dropGeo, mat), bodyBox = new THREE.Mesh(boxGeoR, mat); bodyBox.position.z = 0; for (const b of [bodyDrop, bodyBox]) { b.castShadow = true; b.receiveShadow = true; inner.add(b); }
  const em = M('#ffffff', { roughness: .15 }), pm = M('#1a1030', { roughness: .2 });
  const eyes = new THREE.Group(); g.add(eyes); const lids = [], deco = [];
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 10), em); e.position.set(sx * .15, 0, 0); e.scale.z = .55; eyes.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 8), pm); p.position.set(sx * .15, -.01, .06); eyes.add(p); const h = new THREE.Mesh(new THREE.SphereGeometry(.026, 6, 5), M('#fff', { emissive: '#fff' })); h.position.set(sx * .15 + .03, .035, .11); eyes.add(h);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(.142, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat); lid.position.set(sx * .15, 0, 0); lid.scale.set(1, 1, .7); lid.rotation.x = -1.6; eyes.add(lid); lids.push(lid);
    const ck = new THREE.Mesh(new THREE.CircleGeometry(.06, 12), M('#ff7fb0', { transparent: true, opacity: .75 })); ck.position.set(sx * .27, -.12, .05); eyes.add(ck); deco.push(ck); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.045, .014, 6, 12, Math.PI), pm); mouth.rotation.z = Math.PI; mouth.position.set(0, -.12, .07); eyes.add(mouth); deco.push(mouth);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .5 })); shine.scale.set(1, .6, .4); shine.position.set(-.22, .62, .3); inner.add(shine); deco.push(shine);
  const drip = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), mat); drip.position.set(.35, .12, .2); inner.add(drip); deco.push(drip);
  world.add(g);
  const m = { g, inner, bodyDrop, bodyBox, mat, eyes, lids, mouth, deco, name, isPlayer, base: col, skin: null, shape: 'gota', geo: 'drop', S: SHAPES.gota.s.slice(), cur: SHAPES.gota.s.slice(), x: 0, y: 0, z: 0, vy: 0, grounded: true, att: null, leap: null, yaw: 0, vx: 0, vz: 0, moving: false, alive: true, caught: false, camo: 0, camoD: null, hop: 0, blink: rnd(1, 4), sneeze: rnd(8, 16), shiver: 0, bot: null, spin: 0, still: 0, aimed: 0, eyeVis: 1, peek: rnd(3, 8), cx: 0, cy: .6, cz: 0, camoT: 0 };
  g.traverse(o => { if (o.isMesh) { o.userData.mancha = m; hitMeshes.push(o); } });
  manchas.push(m); return m;
}
function applySkin(m, s) { m.skin = s; const u = m.mat.userData.u; if (s) { m.mat.map = s.tex; u.uSkin.value.copy(s.mat4); u.uMode.value = 1; m.mat.roughness = s.rough; m.mat.emissive.set(s.emis ? '#ffb050' : '#000000'); m.mat.emissiveIntensity = s.emis ? .9 : 0; } else { m.mat.map = baseTex(m.base); u.uMode.value = 0; m.mat.roughness = .35; m.mat.emissive.set('#000000'); } m.bodyDrop.castShadow = m.bodyBox.castShadow = !s; m.mat.needsUpdate = true; }
function paintCaught(m, col) { m.skin = null; m.mat.map = patTex('lunares', col, '#ffffff', 2); m.mat.userData.u.uMode.value = 0; m.mat.emissive.set('#000'); m.mat.needsUpdate = true; }
function setShape(m, key, size) { const d = SHAPES[key]; m.shape = key; m.geo = d.geo; m.S = (size || d.s).slice(); }
const hh = m => m.cur[1];
// ---------- superficies tocadas ----------
const sRay = new THREE.Raycaster(), _p = new THREE.Vector3(), _d = new THREE.Vector3(), _n3 = new THREE.Matrix3();
function hitSurf(o, d, far, wantHoriz) { sRay.set(o, d); sRay.far = far; const hs = sRay.intersectObjects(skinMeshes, false); for (const h of hs) { const s = h.object.userData.surf; if (!s) continue; if (wantHoriz === true && !s.horiz) continue; if (wantHoriz === false && s.horiz && h.object.geometry.type === 'PlaneGeometry') continue; return { s, h }; } return null; }
const DIRS8 = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(Math.sin(i * Math.PI / 4), 0, Math.cos(i * Math.PI / 4)));
function contactSurf(m) { if (m.att) return { s: m.att.surf, mode: 'ancla' };
  const flat = hh(m) < .55; let best = null;
  if (!flat) { _p.set(m.x, m.y + Math.min(1.2, hh(m) * .5), m.z); const reach = Math.max(m.cur[0], m.cur[2]) * .5 + .45; for (const d of DIRS8) { const r = hitSurf(_p, d, reach, false); if (r && (!best || r.h.distance < best.h.distance)) best = r; } if (best) return { s: best.s, mode: 'pared', d: best.h.distance }; }
  _p.set(m.x, m.y + .4, m.z); const r = hitSurf(_p, _d.set(0, -1, 0), 1.0, true); if (r) return { s: r.s, mode: 'abajo' }; return { s: null, mode: 'nada' }; }
function camoCalc(m) { const c = contactSurf(m), s = c.s; if (!s) return { v: .05, s: null, skin: 0, shape: 0, still: 0 };
  const sk = m.skin; let skin = !sk ? colSimC(tmpA.set(m.base), s.avg) * .45 : sk === s ? 1 : sk.tex === s.tex ? .93 : colSimC(sk.avg, s.avg) * .6 + (sk.kind === s.kind ? .08 : 0);
  const [sx, sy, sz] = m.cur, H = sy; let shape;
  if (c.mode === 'abajo') shape = clamp((.6 - H) / .42, 0, 1) * (Math.min(sx, sz) >= .8 ? 1 : .75);
  else if (s.kind === 'lampara') shape = 1 - clamp(Math.abs(Math.max(sx, sy, sz) - .55) / .45, 0, 1);
  else if (s.kind === 'estante') shape = (sz <= .45 && sx <= .55 && H > .35 && H < 1.3) ? 1 : sz < .2 ? .55 : .2;
  else shape = clamp((.5 - sz) / .35, 0, 1) * (m.att ? 1 : .7) * (H < .5 ? .6 : 1);
  if (c.mode === 'pared' && !m.att) skin *= .9;
  const still = clamp(m.still / 1.2, 0, 1); let v = skin * .55 + shape * .3 + still * .15; if (!sk) v = Math.min(v, .42);
  return { v: clamp(v, 0, 1), s, skin, shape, still, mode: c.mode }; }
function colSimC(a, b) { const d = Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b); return clamp(1 - d / .6, 0, 1); }
function camoOf(m) { return { v: m.camo, ref: m.camoD && m.camoD.s }; }
// ---------- colisiones con altura ----------
function pushOut(o, b, r) { const l = o.x - b.minx, rr2 = b.maxx - o.x, t = o.z - b.minz, bt = b.maxz - o.z, mn = Math.min(l, rr2, t, bt); if (mn === l) o.x = b.minx - r; else if (mn === rr2) o.x = b.maxx + r; else if (mn === t) o.z = b.minz - r; else o.z = b.maxz + r; }
function pushBox(o, b, r) { const cx = clamp(o.x, b.minx, b.maxx), cz = clamp(o.z, b.minz, b.maxz); const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz); if (d < r) { if (d > 1e-5) { o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else pushOut(o, b, r); } }
function collide(o, r) { const y = o.y || 0;
  for (const c of cols) { if (c.top <= y + STEP) continue; if (c.box) pushBox(o, c.box, r); else { const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), mn = c.r + r; if (d < mn && d > 1e-4) { o.x = c.x + dx / d * mn; o.z = c.z + dz / d * mn; } } }
  for (const w of walls) pushBox(o, w, r);
  o.x = clamp(o.x, XMIN + .5, XMAX - .5); o.z = clamp(o.z, ZMIN + .5, ZMAX - .5); }
function groundAt(x, z, y) { let g = 0; for (const c of cols) { if (c.top > y + STEP || c.top > 50) continue; if (c.box) { const b = c.box; if (x > b.minx - .12 && x < b.maxx + .12 && z > b.minz - .12 && z < b.maxz + .12) g = Math.max(g, c.top); } else if (Math.hypot(x - c.x, z - c.z) < c.r) g = Math.max(g, c.top); } return g; }
function propDist(p, x, z) { if (p.box) { const b = p.box; const dx = Math.max(b.minx - x, 0, x - b.maxx), dz = Math.max(b.minz - z, 0, z - b.maxz); return Math.hypot(dx, dz); } return Math.hypot(p.x - x, p.z - z) - p.r; }
// ---------- pegarse a superficies ----------
const _q = new THREE.Quaternion();
function anchorWorld(a, m, out) { if (a.fixed) return out.set(a.x, a.y - hh(m) / 2, a.z); a.mesh.updateWorldMatrix(true, false); return out.set(a.lx, a.ly - hh(m) / 2, .03 + m.cur[2] / 2).applyMatrix4(a.mesh.matrixWorld); }
function anchorNormal(a) { if (a.fixed) return [a.nx, a.nz]; a.mesh.getWorldQuaternion(_q); _d.set(0, 0, 1).applyQuaternion(_q); return [_d.x, _d.z]; }
function attach(m, a, auto) { a = Object.assign({}, a); m.att = a; m.leap = null; m.vy = 0; m.vx = m.vz = 0; if (auto) { if (a.surf) applySkin(m, a.surf); setShape(m, a.shape, a.size); } if (!a.fixed && a.surf) { const s = a.surf, hy = Math.max(0, s.h / 2 - m.S[1] / 2 - .02), hx = Math.max(0, s.w / 2 - Math.min(m.S[0], s.w * .9) / 2); a.ly = clamp(a.ly, -hy, hy); a.lx = clamp(a.lx, -hx, hx); } const [nx, nz] = anchorNormal(a); m.yaw = Math.atan2(nx, nz); }
function detach(m, push = .7) { const a = m.att; if (!a) return; const [nx, nz] = anchorNormal(a); m.att = null; m.x += nx * push; m.z += nz * push; m.vy = 2.5; m.grounded = false; if (m.shape === 'lamina' || m.shape === 'libro' || m.shape === 'bola') setShape(m, 'gota'); }
function leapTo(m, a) { const p = anchorWorld(a, m, new THREE.Vector3()); m.leap = { a, fx: m.x, fy: m.y, fz: m.z, t: 0, dur: clamp(Math.hypot(p.x - m.x, p.z - m.z) / 7, .28, .6) }; S.boing(); }
// ancla dinámica sobre cualquier pared/cuadro/estante delante
function dynAnchor(h) { const s = h.object.userData.surf; const mesh = h.object; if (mesh.geometry.type !== 'PlaneGeometry') { let best = null, bd = 1.2; for (const a of anchors) { if (a.surf !== s) continue; const d = Math.hypot(a.x - h.point.x, a.y - h.point.y, a.z - h.point.z); if (d < bd) { bd = d; best = a; } } return best; }
  const lp = mesh.worldToLocal(h.point.clone()); for (const a of anchors) if (a.mesh === mesh && !a.fixed) { const sz = a.size; return Object.assign({}, a, { lx: a.slide ? lp.x : a.lx, ly: a.slide ? lp.y : a.ly }); }
  const kind = s.kind; const shape = kind === 'estante' ? 'libro' : 'lamina'; const size = shape === 'libro' ? [.24, .8, .3] : [Math.min(1.2, s.w * .8), Math.min(1.4, s.h * .8), .08];
  return { mesh, lx: lp.x, ly: lp.y, slide: 1, surf: s, shape, size, name: s.name, kind, prio: 0 }; }
function findJump(m, fx, fz) { const eye = new THREE.Vector3(m.x, m.y + .7, m.z); let best = null, bs = 1e9;
  for (const a of anchors) { const dx = a.x - m.x, dz = a.z - m.z, dy = a.y - (m.y + .6); const d = Math.hypot(dx, dz); if (d > 3.6 || dy > 3.6 || dy < -2.5) continue; const fwd = (dx * fx + dz * fz) / (d || 1); if (d > 1.4 && fwd < .35) continue; const [nx, nz] = [a.nx, a.nz]; if ((dx * nx + dz * nz) > .3) continue; if (!lineOfSight(m.x, m.z, a.x + a.nx * .3, a.z + a.nz * .3, Math.min(a.y, m.y + 1))) continue; const sc = d + Math.abs(dy) * .4 - a.prio * .35 - fwd * .6; if (sc < bs) { bs = sc; best = a; } }
  for (const up of [0, .45, .9]) { _d.set(fx, up, fz).normalize(); sRay.set(eye, _d); sRay.far = 3.6; const hs = sRay.intersectObjects(skinMeshes, false); const h = hs.find(q => q.object.userData.surf && !q.object.userData.surf.horiz); if (h) { const a = dynAnchor(h); if (a) { const sc = h.distance + (up * 1.2) - (a.prio || 0) * .35 - .2; if (!best || sc < bs) { bs = sc; best = a; } } } }
  return best; }
// deslizarse por la superficie (y pasar a la de al lado: zócalo→papel, estante→estante…)
function slideAtt(m, dl, du) { const a = m.att; if (a.fixed) return false; const s = a.surf; const hx = s.w / 2 - Math.min(m.cur[0], s.w * .45) / 2, hy = s.h / 2 - hh(m) / 2 - .02; let nlx = a.lx + dl, nly = a.ly + du;
  if (nlx < -hx || nlx > hx || nly < -hy || nly > hy) { a.mesh.updateWorldMatrix(true, false); const wp = new THREE.Vector3(clamp(nlx, -s.w / 2 - .4, s.w / 2 + .4) + Math.sign(dl) * .25, clamp(nly, -s.h / 2 - .4, s.h / 2 + .4) + Math.sign(du) * .25, .4).applyMatrix4(a.mesh.matrixWorld); const [nx, nz] = anchorNormal(a); sRay.set(wp, _d.set(-nx, 0, -nz)); sRay.far = 1.0; const hs = sRay.intersectObjects(skinMeshes, false); const h = hs.find(q => q.object !== a.mesh && q.object.userData.surf && !q.object.userData.surf.horiz && q.object.geometry.type === 'PlaneGeometry');
    if (h) { const lp = h.object.worldToLocal(h.point.clone()); const ns = h.object.userData.surf; m.att = { mesh: h.object, lx: lp.x, ly: lp.y, slide: 1, surf: ns, shape: m.shape, size: m.S, name: ns.name, kind: ns.kind }; const hy2 = ns.h / 2 - hh(m) / 2 - .02; m.att.ly = clamp(m.att.ly, -Math.max(0, hy2), Math.max(0, hy2)); return true; }
    nlx = clamp(nlx, -Math.max(0, hx), Math.max(0, hx)); if (nly < -hy && du < 0) { const wpp = anchorWorld(a, m, new THREE.Vector3()); if (wpp.y < .25 + groundAt(wpp.x, wpp.z, wpp.y)) { detach(m, .5); return true; } } nly = clamp(nly, -Math.max(0, hy), Math.max(0, hy)); }
  a.lx = nlx; a.ly = nly; return true; }
function makeCritic() {
  const g = new THREE.Group(); const legM = M('#ff9a6b', { roughness: .4 }), gold = M('#ffcf4a', { metalness: .7, roughness: .22 });
  const legs = []; for (const sx of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(sx * .32, 2.3, 0); const up = new THREE.Mesh(new THREE.CylinderGeometry(.07, .06, 1.15, 8), legM); up.position.y = -.57; hip.add(up); const knee = new THREE.Group(); knee.position.y = -1.15; hip.add(knee); knee.add(new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), legM)); const lo = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, 1.1, 8), legM); lo.position.y = -.55; knee.add(lo); const ft = new THREE.Group(); ft.position.y = -1.12; knee.add(ft); for (const a of [-.5, 0, .5]) { const toe = new THREE.Mesh(new THREE.CylinderGeometry(.04, .03, .4, 6), legM); toe.rotation.x = Math.PI / 2; toe.rotation.y = a; toe.position.set(Math.sin(a) * .18, 0, Math.cos(a) * .18); ft.add(toe); } g.add(hip); legs.push({ hip, knee }); }
  const top = new THREE.Group(); top.position.y = 3.35; g.add(top);
  top.add(new THREE.Mesh(new THREE.TorusGeometry(.95, .14, 16, 48), gold));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(.95, 40), new THREE.MeshPhysicalMaterial({ color: '#cfefff', transparent: true, opacity: .25, roughness: 0, clearcoat: 1 })); glass.position.z = .38; top.add(glass);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.74, 28, 20), M('#ffffff', { roughness: .15 })); eye.scale.z = .5; top.add(eye);
  const iris = new THREE.Group(); iris.position.z = .375; top.add(iris); iris.add(new THREE.Mesh(new THREE.CircleGeometry(.34, 32), M('#7a5cff'))); const pu = new THREE.Mesh(new THREE.CircleGeometry(.17, 24), M('#1a1030')); pu.position.z = .005; iris.add(pu); const hl = new THREE.Mesh(new THREE.CircleGeometry(.07, 12), M('#fff', { emissive: '#fff' })); hl.position.set(.1, .1, .01); iris.add(hl);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(.77, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M('#ffb3dc', { roughness: .4 })); lid.scale.z = .55; lid.rotation.x = -.2; top.add(lid);
  const brow = new THREE.Mesh(new THREE.TorusGeometry(.5, .08, 8, 20, Math.PI * .8), M('#5a2a7e')); brow.position.set(0, .95, .3); brow.rotation.z = Math.PI * .1; top.add(brow);
  const bow = new THREE.Group(); bow.position.set(0, -1.15, .1); for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(.2, .35, 4), M('#ff5f8f')); b.rotation.z = sx * Math.PI / 2; b.position.x = sx * .18; bow.add(b); } top.add(bow);
  const hatG = new THREE.Group(); hatG.position.set(.2, 1.1, 0); hatG.rotation.z = -.3; const beret = new THREE.Mesh(new THREE.SphereGeometry(.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#7a5cff')); beret.scale.y = .45; hatG.add(beret); const nub = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), M('#7a5cff')); nub.position.y = .26; hatG.add(nub); top.add(hatG);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 1.0, 8), gold); neck.position.y = 2.75; g.add(neck);
  const hipB = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), gold); hipB.position.y = 2.3; hipB.scale.set(1.3, .7, 1); g.add(hipB);
  const arm = new THREE.Group(); arm.position.set(.95, 2.9, .1); g.add(arm); const handle = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 1.2, 10), M('#b06a3a')); handle.rotation.x = Math.PI / 2; handle.position.z = .5; arm.add(handle); const fer = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .2, 10), gold); fer.rotation.x = Math.PI / 2; fer.position.z = 1.15; arm.add(fer); const tipM = M('#ff3f8f', { emissive: '#ff3f8f', emissiveIntensity: .6 }); const tip = new THREE.Mesh(new THREE.ConeGeometry(.1, .3, 10), tipM); tip.rotation.x = Math.PI / 2; tip.position.z = 1.4; arm.add(tip);
  shadowAll(g); world.add(g);
  return { g, legs, top, iris, lid, brow, arm, tip, tipM, x: 0, z: 0, yaw: 0, walk: 0, speed: 0, state: 'count', t: 0, target: null, wp: null, aimT: 0, cool: 0, think: 0, fx: 0 };
}
let critic = null;
// ---------- efectos ----------
const confN = 260; const confMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.2, .11), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), confN); confMesh.frustumCulled = false; scene.add(confMesh);
const conf = []; const _o = new THREE.Object3D(), _c = new THREE.Color(); for (let i = 0; i < confN; i++) { conf.push({ p: new THREE.Vector3(0, -99, 0), v: new THREE.Vector3(), r: new THREE.Vector3(), life: 0 }); confMesh.setColorAt(i, _c.set(pick(['#ff5f8f', '#ffd23f', '#3fd1b5', '#7a5cff', '#5fc8ff', '#ff9f3d']))); }
let confI = 0; function confetti(x, y, z, n = 80, pow = 6) { for (let i = 0; i < n; i++) { const c = conf[confI++ % confN]; c.p.set(x, y, z); c.v.set(rnd(-1, 1) * pow, rnd(.6, 1.4) * pow, rnd(-1, 1) * pow); c.r.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); c.life = rnd(2, 3.5); } }
function updConf(dt) { for (let i = 0; i < confN; i++) { const c = conf[i]; if (c.life > 0) { c.life -= dt; c.v.y -= 9 * dt; c.v.multiplyScalar(1 - 1.6 * dt); c.p.addScaledVector(c.v, dt); c.r.x += dt * 8; c.r.y += dt * 6; if (c.p.y < .05) { c.p.y = .05; c.v.set(0, 0, 0); } } else c.p.y = -99; _o.position.copy(c.p); _o.rotation.set(c.r.x, c.r.y, c.r.z); _o.updateMatrix(); confMesh.setMatrixAt(i, _o.matrix); } confMesh.instanceMatrix.needsUpdate = true; }
const shots = [];
const PAINTS = ['#ff3f8f', '#3fd1b5', '#ffd23f', '#7a5cff', '#ff9f3d'];
function fireShot(from, to, col, onHit) { const m = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), M(col, { emissive: col, emissiveIntensity: .8 })); m.position.copy(from); scene.add(m); const trail = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .55 })); scene.add(trail); shots.push({ m, trail, from: from.clone(), to: to.clone(), t: 0, dur: Math.max(.12, from.distanceTo(to) / 45), col, onHit }); S.shoot(); }
const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3();
function updShots(dt) { for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.t += dt; const k = Math.min(1, s.t / s.dur); s.m.position.lerpVectors(s.from, s.to, k); s.m.position.y += Math.sin(k * Math.PI) * .4; s.trail.position.lerpVectors(s.from, s.m.position, .5); const L = s.from.distanceTo(s.m.position); s.trail.scale.set(1, Math.max(.01, L), 1); _dir.subVectors(s.m.position, s.from).normalize(); s.trail.quaternion.setFromUnitVectors(_up, _dir); if (k >= 1) { scene.remove(s.m); scene.remove(s.trail); shots.splice(i, 1); splatAt(s.to, s.col); s.onHit && s.onHit(); } } }
let splatN = 0; function splatAt(p, col) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: splatTex(col), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.rotation.z = rnd(0, 6); m.position.set(p.x, .03 + (splatN++ % 50) * .0006, p.z); world.add(m); S.splat(); burst(p, col); }
const bursts = []; function burst(p, col) { for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(rnd(.06, .14), 8, 6), M(col, { emissive: col, emissiveIntensity: .4 })); b.position.copy(p); world.add(b); bursts.push({ b, v: new THREE.Vector3(rnd(-3, 3), rnd(2, 5), rnd(-3, 3)), l: .8 }); } }
function updBursts(dt) { for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.l -= dt; b.v.y -= 12 * dt; b.b.position.addScaledVector(b.v, dt); if (b.b.position.y < .05) { b.b.position.y = .05; b.v.multiplyScalar(.3); } if (b.l <= 0) { world.remove(b.b); bursts.splice(i, 1); } } }
// ---------- UI ----------
let toastT = 0; function toast(a, b = '', ms = 1400) { const t = $('toast'); t.innerHTML = a + (b ? `<small>${b}</small>` : ''); t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
let bubT = 0; function bub(s, ms = 1800) { const b = $('bub'); b.textContent = s; b.style.display = 'block'; clearTimeout(bubT); bubT = setTimeout(() => b.style.display = 'none', ms); }
function show(id) { document.querySelectorAll('.scr').forEach(s => s.classList.toggle('on', s.id === id)); }
function hud(on) { $('hud').classList.toggle('on', on); $('joy').classList.toggle('on', on); $('touch').classList.toggle('on', on); $('acts').classList.toggle('on', on); if (!on) { $('cross').classList.remove('on'); $('meter').classList.remove('on'); $('bub').style.display = 'none'; } }
const tap = (id, f) => $(id).addEventListener('click', e => { audioInit(); S.tap(); f(e); });
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { S.tap(); show('menu'); }));
$('bMute').textContent = save.muted ? '🔇' : '🔊';
tap('bMute', () => { save.muted = !save.muted; persist(); $('bMute').textContent = save.muted ? '🔇' : '🔊'; if (master) master.gain.value = save.muted ? 0 : .6; });
tap('bHow', () => show('howS'));
function doorBetween(a, b) { const A = rooms[a], B = rooms[b]; const [ax, az] = A.c, [bx, bz] = B.c; return [(ax + bx) / 2, (az + bz) / 2, Math.sign(bx - ax), Math.sign(bz - az)]; }
function nextRoom(a, b) { if (a === b) return b; const prev = { [a]: -1 }, q = [a]; while (q.length) { const c = q.shift(); if (c === b) break; const r = rooms[c]; const nb = []; if (r.i > 0) nb.push(c - 1); if (r.i < COLS - 1) nb.push(c + 1); if (r.j > 0) nb.push(c - COLS); if (r.j < ROWS - 1) nb.push(c + COLS); for (const n of nb) if (prev[n] === undefined) { prev[n] = c; q.push(n); } } let c = b; while (prev[c] !== a && prev[c] !== -1 && prev[c] !== undefined) c = prev[c]; return c; }
function navTarget(o, tx, tz) { const a = roomOf(o.x, o.z), b = roomOf(tx, tz); if (a === b) return [tx, tz]; const n = nextRoom(a, b); const [dx, dz, sx, sz] = doorBetween(a, n); const along = Math.abs((o.x - dx) * (1 - Math.abs(sx)) + (o.z - dz) * (1 - Math.abs(sz))); const dist = Math.hypot(o.x - dx, o.z - dz); if (dist < 1.6 && along < .9) return [dx + sx * 2.2, dz + sz * 2.2]; const off = 1.4; return [dx - sx * off * (dist > 2.5 ? 1 : 0), dz - sz * off * (dist > 2.5 ? 1 : 0)]; }
const losRay = new THREE.Raycaster(); const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function lineOfSight(x0, z0, x1, z1, y = 1) { _a.set(x0, y, z0); _b.set(x1 - x0, 0, z1 - z0); const L = _b.length(); if (L < .1) return true; _b.normalize(); losRay.set(_a, _b); losRay.far = L; return losRay.intersectObjects(wallMeshes, false).length === 0; }
function camClear(fx, fy, fz, tx, ty, tz) { _a.set(fx, fy, fz); _b.set(tx - fx, ty - fy, tz - fz); const L = _b.length(); _b.normalize(); losRay.set(_a, _b); losRay.far = L + .4; const h = losRay.intersectObjects(wallMeshes, false); return h.length ? Math.max(.8, h[0].distance - .45) : L; }
let pendingMode = 'full';
['bPlay', 'bHide', 'bSeek', 'b2p'].forEach((id, i) => tap(id, () => { startMatch(['full', 'hide', 'seek', '2p'][i]); }));
// ---------- controles v2 (joystick flotante analógico + cámara por arrastre, multitáctil) ----------
let joyX = 0, joyY = 0, camYaw = 0, camPitch = .38; const keys = {}; const ptrs = new Map(); let joyId = null, camId = null;
const joy = $('joy'), knob = $('joyK'); const JR = 56;
function joyHome() { joy.style.left = ''; joy.style.top = ''; joy.style.bottom = ''; joy.classList.remove('act', 'float'); knob.style.transform = 'translate(-50%,-50%)'; }
const layer = $('touch');
layer.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); if (!playing) return; const left = e.clientX < innerWidth * .45 && !(role === 'seek' && phase === 'hide');
  if (left && joyId === null) { joyId = e.pointerId; ptrs.set(e.pointerId, { x0: e.clientX, y0: e.clientY, kind: 'joy' }); joy.classList.add('act', 'float'); joy.style.left = (e.clientX - 65) + 'px'; joy.style.top = (e.clientY - 65) + 'px'; joy.style.bottom = 'auto'; }
  else if (camId === null) { camId = e.pointerId; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, kind: 'cam' }); } else return;
  try { layer.setPointerCapture(e.pointerId); } catch (x) { } });
layer.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; e.preventDefault();
  if (p.kind === 'joy') { let dx = e.clientX - p.x0, dy = e.clientY - p.y0; const d = Math.hypot(dx, dy); if (d > JR) { // el joystick sigue al dedo si se pasa
      const k = (d - JR) / d; p.x0 += dx * k; p.y0 += dy * k; joy.style.left = (p.x0 - 65) + 'px'; joy.style.top = (p.y0 - 65) + 'px'; dx = e.clientX - p.x0; dy = e.clientY - p.y0; }
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`; const nd = Math.min(1, Math.hypot(dx, dy) / JR); const dz = .1; const m = nd < dz ? 0 : Math.pow((nd - dz) / (1 - dz), 1.15); const a = Math.atan2(dx, -dy); joyX = Math.sin(a) * m; joyY = Math.cos(a) * m; }
  else { const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; const sens = (role === 'seek' ? .0048 : .0062) * (560 / Math.max(560, Math.min(innerWidth, innerHeight) * 1.2)); camYaw -= dx * sens * 1.2; camPitch = clamp(camPitch + dy * .0042, role === 'seek' ? -.3 : .05, 1.0); } });
function ptrEnd(e) { const p = ptrs.get(e.pointerId); if (!p) return; ptrs.delete(e.pointerId); if (p.kind === 'joy') { joyId = null; joyX = joyY = 0; joyHome(); } else camId = null; }
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => layer.addEventListener(ev, ptrEnd));
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') { if (role === 'hide') doJump(); else playerFire(); } if (e.code === 'KeyC') copySkin(); if (e.code === 'KeyM') toggleMold(); }); addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { ptrs.clear(); joyId = camId = null; joyX = joyY = 0; joyHome(); });
function mkActs(list) { const a = $('acts'); a.innerHTML = ''; list.forEach(([id, ico, txt, cls, f]) => { const b = document.createElement('button'); b.className = 'ab ' + (cls || ''); b.id = id; b.innerHTML = `<span>${ico}</span>${txt}`; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); f(); }); a.appendChild(b); }); }
// ---------- partida ----------
let mode = 'full', role = 'hide', phase = 'idle', phaseT = 0, me = null, playing = false, round = 0, rounds = [], results = [], shotsLeft = 0, bestShot = null, bestPct = 0, slowmo = 1, focus = null, focusT = 0, p2score = [0, 0], lastPct = -1, hider2p = 0, curRoom = -1, actT = 0;
const HIDE_T = 45; const P2 = ['Jugador 1', 'Jugador 2'];
const is2p = () => rounds[round] && rounds[round].startsWith('2p');
function startMatch(md) { mode = md; results = []; round = 0; bestShot = null; bestPct = 0; p2score = [0, 0]; rounds = md === 'full' ? ['hide', 'seek'] : md === 'hide' ? ['hide'] : md === 'seek' ? ['seek'] : ['2p-a', '2p-b']; nextRound(); }
function nextRound() { if (round >= rounds.length) return toMenu(); const r = rounds[round];
  if (r.startsWith('2p')) { const h = r === '2p-a' ? 0 : 1; hider2p = h; $('pT').textContent = `🙈 Se esconde ${P2[h]}`; $('pS').textContent = `${P2[1 - h]}: ¡date la vuelta y no mires! ${HIDE_T} segundos para camuflarse.`; show('pass'); $('pGo').onclick = () => { S.pop(); setupRound(r); }; return; }
  setupRound(r); }
function hideActs() { mkActs([['aJump', '🦘', 'Saltar', 'c3', doJump], ['aCopy', '🎨', 'Copiar', 'c1', copySkin], ['aMold', '✋', 'Moldear', 'c2', toggleMold]]); }
function setupRound(r) {
  transition(() => {
    show(null); manchas = []; buildCastle(); critic = makeCritic(); slowmo = 1; focus = null; focusT = 0; role = r === 'seek' ? 'seek' : 'hide';
    const cols2 = MANCHA_COLS.slice().sort(() => Math.random() - .5); const start = RC(1);
    me = null; if (r !== 'seek') { me = makeMancha(cols2[0], r === 'hide' ? 'Tú' : P2[hider2p], true); me.x = start[0]; me.z = start[1] + 1.2; me.yaw = Math.PI; }
    const nb = r === 'seek' ? 4 : 3; const used = [];
    for (let i = 0; i < nb; i++) { const b = makeMancha(cols2[i + 1], ['Pinti', 'Gotita', 'Borrón', 'Acuarela'][i], false); const a = i / nb * 6.28 + 1; b.x = start[0] + Math.cos(a) * 2.2; b.z = start[1] + 6 + Math.sin(a) * 1.2; botPlan(b, used); }
    manchas.forEach(m => { m.g.position.set(m.x, 0, m.z); setShape(m, 'gota'); });
    phase = 'hide'; phaseT = HIDE_T; playing = true; critic.state = 'count'; const c0 = RC(0); critic.x = c0[0] - 5; critic.z = c0[1] - 3; critic.yaw = Math.PI; critic.y = 0;
    camYaw = Math.PI; camPitch = .38; shotsLeft = 0; lastPct = -1; curRoom = -1; snapCam = true; moldOpen(false);
    hud(true); $('hPhase').textContent = '🙈 ¡A esconderse!';
    if (role === 'hide') { $('meter').classList.add('on'); $('cross').classList.remove('on'); hideActs(); $('hInfo').textContent = '🏰 Castillo de los Cuadros'; toast('¡Camúflate! 🎨', '🦘 Salta a un cuadro, lámpara o estantería · 🎨 Copia su textura · ✋ Moldéate', 3600); }
    else { $('meter').classList.remove('on'); mkActs([]); $('hInfo').textContent = '🧐 Contando…'; toast('Eres El Crítico 🧐', 'Las Manchas se están camuflando… ¡no mires!', 2600); }
    musicMode = 'calm'; });
}
function transition(fn) { const f = $('fade'); f.classList.add('on'); S.boing(); setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 80); }, 380); }
function copySkin() { if (!me || !me.alive || role !== 'hide') return; const c = contactSurf(me); if (!c.s) { bub('🤷 No tocas nada que copiar'); return; } applySkin(me, c.s); S.paint(); bub(`🎨 ¡Copiada la textura de ${c.s.name}!`); me.hop = .5; burst(new THREE.Vector3(me.cx, me.cy, me.cz), '#' + c.s.avg.getHexString()); if (phase === 'seek') { me.still = 0; me.wiggle = .6; } }
function doJump() { if (!me || !me.alive || role !== 'hide' || me.leap) return; if (me.att) { detach(me); S.pop(); bub('🦘 ¡Al suelo!', 900); if (phase === 'seek') me.still = 0; return; }
  const mv = Math.hypot(me.vx, me.vz) > .5; const fx = mv ? Math.sin(me.yaw) : Math.sin(camYaw), fz = mv ? Math.cos(me.yaw) : Math.cos(camYaw);
  const a = findJump(me, fx, fz); if (a) { leapTo(me, a); bub(`🦘 ¡A ${a.name}!`, 1200); if (phase === 'seek') me.still = 0; return; }
  if (me.grounded) { me.vy = JUMPV; me.grounded = false; S.pop(); if (phase === 'seek') me.still = 0; } }
// ---- panel de moldear ----
let moldIsOpen = false;
function moldSync() { if (!me) return; $('mW').value = me.S[0]; $('mH').value = me.S[1]; $('mD').value = me.S[2]; document.querySelectorAll('#mold [data-sh]').forEach(b => b.classList.toggle('sel', b.dataset.sh === me.shape)); }
function moldOpen(on) { moldIsOpen = on; $('mold').classList.toggle('on', on); if (on) moldSync(); }
function toggleMold() { if (!me || role !== 'hide') return; moldOpen(!moldIsOpen); S.pose(); }
document.querySelectorAll('#mold [data-sh]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); if (!me) return; setShape(me, b.dataset.sh); S.pose(); me.hop = .4; moldSync(); if (phase === 'seek') { me.still = 0; me.wiggle = .5; } }));
[['mW', 0], ['mH', 1], ['mD', 2]].forEach(([id, i]) => { const el = $(id); el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('input', () => { if (!me) return; me.S[i] = +el.value; if (phase === 'seek') me.still = 0; }); });
$('mClose').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); moldOpen(false); S.tap(); });
// ---- bots ----
function anchorReach(a) { const fx = a.x + a.nx * 1.0, fz = a.z + a.nz * 1.0; const o = { x: fx, z: fz, y: 0 }; collide(o, .45); if (Math.hypot(o.x - fx, o.z - fz) > .3) return null; const g = groundAt(o.x, o.z, 0); if (a.y - (g + .6) > 3.4) return null; return [o.x, o.z]; }
function botPlan(b, used) { const skill = rnd(0, 1); let plan = null;
  for (let tries = 0; tries < 30 && !plan; tries++) { const r = Math.random(); if (r < .65) { const a = pick(anchors); if (a.room === 0 || used.includes(a)) continue; const fp = anchorReach(a); if (!fp) continue; plan = { a, tx: fp[0], tz: fp[1] }; } else { const rugs = surfaces.filter(s => s.kind === 'alfombra' && roomOf(s.pos.x, s.pos.z) !== 0); const s = Math.random() < .7 && rugs.length ? pick(rugs) : pick(surfaces.filter(q => q.kind === 'suelo' && roomOf(q.pos.x, q.pos.z) !== 0)); const tx = s.pos.x + rnd(-s.w * .35, s.w * .35), tz = s.pos.z + rnd(-s.h * .35, s.h * .35); const o = { x: tx, z: tz, y: 0 }; collide(o, .9); if (Math.hypot(o.x - tx, o.z - tz) > .05 || groundAt(tx, tz, 0) > 0) continue; plan = { floor: s, tx, tz }; } }
  if (!plan) plan = { floor: surfaces.find(s => s.kind === 'suelo'), tx: RC(4)[0], tz: RC(4)[1] };
  used.push(plan.a); const wrong = () => pick(surfaces.filter(s => !s.horiz));
  b.bot = Object.assign(plan, { skinOk: skill > .18, shapeOk: skill > .3, painted: false, delay: rnd(14, 30) }); }
function paintBot(m) { const b = m.bot; if (b.painted) return; b.painted = true; if (b.a) { const a = Object.assign({}, b.a); if (b.a.slide && b.a.mesh) { a.lx = rnd(-.3, .3) * b.a.surf.w; } if (!m.att) { const fp = anchorWorld(a, m, new THREE.Vector3()); m.x = fp.x; m.z = fp.z; } attach(m, a, true); if (!b.skinOk) applySkin(m, pick(surfaces.filter(s => s !== b.a.surf && !s.horiz))); if (!b.shapeOk) setShape(m, pick(['gota', 'bola', 'alta'])); }
  else { applySkin(m, b.skinOk ? b.floor : pick(surfaces.filter(s => s.horiz && s !== b.floor))); setShape(m, b.shapeOk ? 'chafada' : pick(['gota', 'bola'])); }
  m.hop = 1; burst(new THREE.Vector3(m.x, 1, m.z), '#' + (m.skin ? m.skin.avg.getHexString() : 'ffffff')); }
function endHidePhase() {
  manchas.forEach(m => { if (m.bot) { m.x = m.bot.tx; m.z = m.bot.tz; m.vx = m.vz = 0; m.y = 0; paintBot(m); m.still = 5; } });
  moldOpen(false); if (me) { me.camoD = camoCalc(me); me.camo = me.camoD.v; captureHide(); }
  if (is2p() && role === 'hide') { phase = 'pass'; playing = false; hud(false); $('pT').textContent = `🧐 ¡Turno de ${P2[1 - hider2p]}!`; $('pS').textContent = `Eres El Crítico. Busca a ${P2[hider2p]} por el castillo. Fíjate MUCHO: cuadros, libros, lámparas, alfombras… 6 disparos.`; show('pass'); $('pGo').onclick = () => { S.pop(); show(null); playing = true; role = 'seek'; startSeek(); }; return; }
  startSeek(); }
function startSeek() {
  phase = 'seek'; phaseT = role === 'seek' ? 100 : 60; musicMode = 'seek'; critic.state = 'wander'; critic.think = 1.5; S.boing(); hud(true); snapCam = true;
  if (role === 'hide') { $('hPhase').textContent = '🧐 ¡Viene El Crítico!'; toast('¡Llega El Crítico! 🧐', 'Quieta… muy quieta…', 2200); mkActs([['aJump', '🦘', 'Saltar', 'c3', doJump], ['aMold', '✋', 'Moldear', 'c2', toggleMold]]); }
  else { shotsLeft = is2p() ? 6 : 10; $('meter').classList.remove('on'); $('cross').classList.add('on'); $('hPhase').textContent = '🎯 ¡A cazar!'; mkActs([['aFire', '🎯', '', 'fire', playerFire]]); toast('¡A cazar Manchas! 🎯', is2p() ? `Encuentra a ${P2[hider2p]}: mira de cerca cuadros, libros, lámparas y alfombras` : `4 escondidas · ${shotsLeft} disparos · busca ojitos que asoman 👀`, 3200); const c0 = RC(0); critic.x = c0[0]; critic.z = c0[1] + 3; critic.y = 0; camYaw = Math.PI / 2; camPitch = .15; } }
function captureHide() { if (!me) return; const pct = Math.round(me.camo * 100); let a = me.yaw, bd = 0;
  if (me.att) { const [nx, nz] = anchorNormal(me.att); a = Math.atan2(nx, nz); bd = 3.2; } else for (let k = 0; k < 12; k++) { const aa = me.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .5236; const cd = Math.min(camClear(me.x, me.y + 1.2, me.z, me.x + Math.sin(aa) * 3.6, me.y + 2, me.z + Math.cos(aa) * 3.6), clearPropDist(me.x, me.z, Math.sin(aa), Math.cos(aa), 3.6)); if (cd > bd + .01) { bd = cd; a = aa; } if (cd >= 3.5) break; } const R = Math.max(1.6, Math.min(3.6, bd));
  manchas.forEach(m => animMancha(m, 1)); camera.position.set(me.cx + Math.sin(a) * R, me.cy + .5 + R * .2, me.cz + Math.cos(a) * R); camera.lookAt(me.cx, me.cy, me.cz); critic.g.visible = false; renderer.render(scene, camera); critic.g.visible = true;
  try { const img = renderer.domElement.toDataURL('image/jpeg', .9); if (pct >= bestPct || !bestShot) { bestPct = pct; bestShot = { img, pct, cuadro: rooms[roomOf(me.x, me.z)].def.name }; } } catch (e) { } }
function clearPropDist(x, z, dx, dz, maxD) { for (let d = .8; d <= maxD; d += .25) { const px = x + dx * d, pz = z + dz * d; for (const p of props) if (propDist(p, px, pz) < .3) return Math.max(1.6, d - .4); } return maxD; }
const LINES = ['¡Te delataron los ojitos! 👀', '¡Ese libro respiraba!', '¡Pillada con las manos en la pintura!', '¡Atchís! Digo… ¡PILLADA!', '¡Esa lámpara tenía cara!', '¡Demasiado guapa para ser decorado!', '¡Los retratos se chivaron!'];
function catchMancha(m) { if (!m.alive) return; m.alive = false; m.caught = true; m.spin = 1; m.hop = 1.6; if (m.att) detach(m, .3); setShape(m, 'gota'); paintCaught(m, pick(PAINTS)); S.ay(); confetti(m.cx, m.cy + .6, m.cz, 45, 5); shake = .5;
  if (m === me && role === 'hide') { toast('¡TE PILLÓ! 🎨💥', pick(LINES), 2400); focus = m; focusT = 2.2; slowmo = .35; S.fail(); setTimeout(() => endRound(), 2300); }
  else if (m === me) { toast(`¡ENCONTRASTE A ${P2[hider2p].toUpperCase()}! 🎉`, pick(LINES), 2200); focus = m; focusT = 1.8; slowmo = .4; S.fanfare(); setTimeout(() => endRound(), 2100); }
  else if (role === 'seek') { toast('¡PILLADA! 🎉', m.name + ' · ' + pick(LINES), 1800); focus = m; focusT = 1.2; slowmo = .4; if (!is2p() && manchas.every(o => !o.alive)) setTimeout(() => endRound(), 1500); }
  else bub(`😱 ¡Han pillado a ${m.name}!`, 1800); }
const ray = new THREE.Raycaster(), V0 = new THREE.Vector2(0, 0);
function playerFire() { if (phase !== 'seek' || role !== 'seek' || shotsLeft <= 0 || critic.cool > 0 || focusT > 0) return; shotsLeft--; critic.cool = .45; critic.fx = 1; shake = .18;
  ray.setFromCamera(V0, camera); const hits = ray.intersectObjects(hitMeshes, false); let target = null, point = null;
  for (const m of manchas) { if (!m.alive) continue; const c = new THREE.Vector3(m.cx, m.cy, m.cz); const d = ray.ray.distanceToPoint(c); const dist = c.distanceTo(camera.position); const rad = Math.max(.35, Math.min(.8, Math.max(m.cur[0], hh(m)) * .5)); if (d < rad + dist * .02 && dist < 40) { const h = hits[0]; if (!h || h.distance > dist - 1.0 || h.object.userData.mancha === m) { target = m; point = c; break; } } }
  if (!target && hits.length) { point = hits[0].point; const hm = hits[0].object.userData.mancha; if (hm && hm.alive) target = hm; } if (!point) point = ray.ray.at(30, new THREE.Vector3());
  const from = critic.tip.getWorldPosition(new THREE.Vector3()); const col = pick(PAINTS);
  fireShot(from, point, col, () => { if (target) catchMancha(target); else { const o = hits[0] && hits[0].object.userData; const pr = o && o.prop; const sf = o && o.surf; bub(pr ? `🙃 ¡Era ${pr.name} de verdad!` : sf ? `🙃 ¡Era ${sf.name} de verdad!` : '💨 ¡Fallaste!', 1500); if (pr) { pr.g.userData.shake = 1; S.boing(); } } });
  if (shotsLeft === 0) setTimeout(() => { if (phase === 'seek' && focusT <= 0) endRound(); }, 1700); }
// El Crítico: con buen camuflaje solo te ve si se acerca MUCHO y mira con calma
function criticThink(c, alive, dt) {
  c.think -= dt; if (c.think <= 0) { c.think = .4;
    for (const m of alive) { const dx = m.cx - c.x, dz = m.cz - c.z, d = Math.hypot(dx, dz); if (d > 15) continue; const ang = Math.abs(wrap(Math.atan2(dx, dz) - c.yaw)); if (ang > 1.2 && !m.moving) continue; if (!lineOfSight(c.x, c.z, m.cx, m.cz, Math.min(m.cy, 2.5))) continue;
      const vis = Math.pow(1 - m.camo, 2.6) * 1.5 + (m.moving ? .6 : 0) + (m.wiggle > 0 ? .3 : 0) + m.eyeVis * .12; const near = d < 2.6 ? 1.4 : 1 - d / 16; let p = vis * near; if (m.camo > .88 && d > 2.6) p *= .1; if (Math.random() < p * .9) { c.state = 'go'; c.target = m; S.hmm(); if (m === me) bub('😳 ¡El Crítico te ha echado el ojo!', 1500); return; } }
    if (Math.random() < .02) { const pr = props.filter(p => p.room === roomOf(c.x, c.z)); if (pr.length) { c.state = 'go'; c.target = pick(pr); } } }
}
function criticAI(dt) { const c = critic; c.cool -= dt;
  if (c.state === 'count') { c.speed = lerp(c.speed, 0, Math.min(1, dt * 8)); return; }
  const alive = manchas.filter(m => m.alive); if (!alive.length) { c.speed = 0; return; }
  const goTo = (x, z, spd) => { const [nx, nz] = navTarget(c, x, z); const dx = nx - c.x, dz = nz - c.z; const fd = Math.hypot(x - c.x, z - c.z); if (fd > .3) { c.yaw += wrap(Math.atan2(dx, dz) - c.yaw) * (1 - Math.exp(-dt * 6)); c.speed = lerp(c.speed, spd, 1 - Math.exp(-dt * 5)); c.x += Math.sin(c.yaw) * c.speed * dt; c.z += Math.cos(c.yaw) * c.speed * dt; } else c.speed = lerp(c.speed, 0, 1 - Math.exp(-dt * 8)); collide(c, .5); c.y = groundAt(c.x, c.z, c.y || 0); return fd; };
  if (c.state === 'wander') criticThink(c, alive, dt);
  if (c.state === 'wander' && c.lookT > 0) { c.lookT -= dt; c.yaw += dt * 1.8 * (c.lookDir || 1); c.speed = lerp(c.speed, 0, ex(8, dt)); }
  else if (c.state === 'wander') { if (c.wp && Math.hypot(c.wp.x - c.x, c.wp.z - c.z) < 1.5 && !c.looked) { c.lookT = 1.8; c.lookDir = Math.random() < .5 ? -1 : 1; c.looked = true; } if (!c.wp || Math.hypot(c.wp.x - c.x, c.wp.z - c.z) < 1.5 || (c.wpT -= dt) < 0) { c.looked = false; let tx, tz; if (me && me.alive && role === 'hide' && Math.random() < .35) { tx = me.cx; tz = me.cz; } else if (Math.random() < .5) { const a = pick(anchors); tx = a.x + a.nx * 2; tz = a.z + a.nz * 2; } else { const m = pick(alive); tx = m.cx; tz = m.cz; } c.wp = { x: clamp(tx + rnd(-3, 3), XMIN + 1.5, XMAX - 1.5), z: clamp(tz + rnd(-3, 3), ZMIN + 1.5, ZMAX - 1.5) }; c.wpT = 12; }
    if (!(c.lookT > 0)) goTo(c.wp.x, c.wp.z, 3.2); }
  else if (c.state === 'go') { const t = c.target; if (t.alive === false) { c.state = 'wander'; return; } const tx = t.cx ?? t.x, tz = t.cz ?? t.z; const d = goTo(tx, tz, t.moving ? 4.4 : 3.4); if (d < 4.6 && lineOfSight(c.x, c.z, tx, tz)) { c.state = 'aim'; c.aimT = 1.2; S.tension(); if (t === me) bub('😱 ¡Te está mirando! ¿Quieta o huyes?', 1200); } }
  else if (c.state === 'aim') { const t = c.target; const tx = t.cx ?? t.x, tz = t.cz ?? t.z; c.yaw += wrap(Math.atan2(tx - c.x, tz - c.z) - c.yaw) * (1 - Math.exp(-dt * 8)); c.speed = lerp(c.speed, 0, 1 - Math.exp(-dt * 10)); c.aimT -= dt;
    if (c.aimT <= 0) { let hit = false; const isM = t.alive !== undefined; if (isM) { const d = Math.hypot(tx - c.x, tz - c.z); const pc = t.moving ? .6 : clamp((1 - t.camo) * 1.7 - .08, .03, .95); hit = d < 7.5 && Math.random() < pc && lineOfSight(c.x, c.z, tx, tz); }
      const pt = isM ? new THREE.Vector3(hit ? t.cx : tx + rnd(-1.4, 1.4), hit ? t.cy : .05, hit ? t.cz : tz + rnd(-1.4, 1.4)) : new THREE.Vector3((t.box ? (t.box.minx + t.box.maxx) / 2 : t.x) + rnd(-1, 1), .05, (t.box ? (t.box.minz + t.box.maxz) / 2 : t.z) + rnd(-1, 1)); c.fx = 1; const tt = t;
      fireShot(c.tip.getWorldPosition(new THREE.Vector3()), pt, pick(PAINTS), () => { if (hit) catchMancha(tt); else if (isM && tt === me) { bub(pick(['😅 ¡Uf! Por los pelos…', '😎 ¡No te ha distinguido! Sigue quieta…', '🫣 ¡Casi te pinta!']), 1600); S.boing(); } else if (!isM && role === 'hide') { tt.g.userData.shake = 1; bub(pick([`🧐 «¡Ajá!»… era ${tt.name}.`, '🧐 «Juraría que eso me ha guiñado un ojo…»']), 1800); } });
      c.state = 'wander'; c.wp = null; c.think = 1.2; } } }
// ---------- actualización v4 ----------
let last = performance.now(), T = 0, fpsAcc = 0, fpsN = 0, fpsT = 0, shake = 0, snapCam = true, camDist = 7;
const camPos = new THREE.Vector3(0, 6, 12), camLook = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const ex = (k, dt) => 1 - Math.exp(-k * dt);
function moveMancha(m, wantX, wantZ, mag, sdt, sub, h, sp, ix = 0, iy = 0) {
  if (m.leap) { const L = m.leap; L.t += sdt; const k = Math.min(1, L.t / L.dur); const p = anchorWorld(L.a, m, _v); m.x = lerp(L.fx, p.x, k); m.z = lerp(L.fz, p.z, k); m.y = lerp(L.fy, p.y, k) + Math.sin(k * Math.PI) * 1.0; if (k >= 1) { attach(m, L.a, true); S.paint(); if (m === me) bub(`✨ ¡Pegada a ${L.a.name}! Textura copiada`, 1600); } m.moving = true; return; }
  if (m.att) { const a = m.att; if (mag > .05 && !a.fixed) { const [nx, nz] = anchorNormal(a); const tx = nz, tz = -nx; const rx = -Math.cos(camYaw), rz = Math.sin(camYaw); const dl = ix * Math.sign(rx * tx + rz * tz || 1); slideAtt(m, dl * 2.4 * sdt, iy * 2.0 * sdt); m.moving = true; } else m.moving = false; if (m.att) { const p = anchorWorld(m.att, m, _v); m.x = p.x; m.y = p.y; m.z = p.z; const [nx, nz] = anchorNormal(m.att); m.yaw = Math.atan2(nx, nz); } m.vx = m.vz = 0; return; }
  for (let s = 0; s < sub; s++) { const k = mag > .01 ? ex(11, h) : ex(14, h); m.vx += (wantX * sp - m.vx) * k; m.vz += (wantZ * sp - m.vz) * k; m.x += m.vx * h; m.z += m.vz * h; collide(m, .4);
    const g = groundAt(m.x, m.z, m.y); m.vy -= GRAV * h; m.y += m.vy * h; if (m.y <= g) { if (g - m.y > .02 && m.vy < -3) { m.hop = Math.max(m.hop, .3); } m.y = g; m.vy = 0; m.grounded = true; } else m.grounded = m.y - g < .03; }
  const spd = Math.hypot(m.vx, m.vz); m.moving = spd > .6; if (spd > .25) m.yaw += wrap(Math.atan2(m.vx, m.vz) - m.yaw) * ex(12, sdt); }
function update(dt) {
  T += dt; decor.forEach(d => d.f(d.o, T));
  for (const p of props) { if (p.g.userData.spin) p.g.userData.spin.rotation.y = T * .5; if (p.jelly) { const k = Math.sin(T * 3 + p.x); p.g.scale.set(1 + k * .03, 1 - k * .03, 1 + k * .03); } if (p.g.userData.shake) { p.g.userData.shake = Math.max(0, p.g.userData.shake - dt * 2); p.g.rotation.z = Math.sin(T * 40) * .08 * p.g.userData.shake; } }
  const watch = me && role === 'hide' ? me : critic; if (watch) for (const L of lookers) { L.g.worldToLocal(_w.set(watch.cx ?? watch.x, 1, watch.cz ?? watch.z)); const a = Math.atan2(_w.x, Math.max(.5, _w.z)), b = Math.atan2(_w.y - L.eyes[0].by, Math.max(.5, _w.z)); L.eyes.forEach(e => { e.p.position.x = lerp(e.p.position.x, e.bx + clamp(a, -1, 1) * L.w * .025, ex(8, dt)); e.p.position.y = lerp(e.p.position.y, e.by + clamp(b, -1, 1) * L.w * .02, ex(8, dt)); }); }
  if (!playing) { if (phase === 'idle') { const c = RC(0); camPos.set(c[0] + Math.sin(T * .12) * 3, 3.4 + Math.sin(T * .3) * .3, c[1] + 6.5); camera.position.copy(camPos); camera.lookAt(c[0], 2.2, c[1] - 5); sun.position.set(c[0] + 6, 30, c[1] + 6); sun.target.position.set(c[0], 0, c[1]); } updConf(dt); updBursts(dt); return; }
  musicTick(dt);
  if (focusT > 0) { focusT -= dt; if (focusT <= 0) { slowmo = 1; focus = null; } }
  const sdt = dt * slowmo;
  if (phase === 'hide' || phase === 'seek') { const prev = Math.ceil(phaseT); phaseT -= sdt; const sec = Math.ceil(phaseT); $('hTime').textContent = '⏱ ' + Math.max(0, sec); $('hTime').classList.toggle('warn', sec <= 5);
    if (sec !== prev && sec <= 5 && sec >= 1) { S.tick(); if (phase === 'hide' && sec <= 3) toast(String(sec), role === 'hide' ? '¡A tu sitio!' : '', 600); }
    if (phase === 'hide' && phaseT <= 0) endHidePhase(); else if (phase === 'seek' && phaseT <= 0 && focusT <= 0) endRound(); }
  if (role === 'seek' && phase === 'seek') $('hInfo').textContent = `🎯 ${shotsLeft} · 🙈 ${manchas.filter(m => m.alive).length}`;
  if (role === 'hide' && phase === 'seek') $('hInfo').textContent = `🙈 ${manchas.filter(m => m.alive).length} escondidas`;
  let ix = joyX, iy = joyY; const kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), ky = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0); if (kx || ky) { const l = Math.hypot(kx, ky); ix = kx / l; iy = ky / l; }
  const fwX = Math.sin(camYaw), fwZ = Math.cos(camYaw); const rX = -fwZ, rZ = fwX; const wantX = fwX * iy + rX * ix, wantZ = fwZ * iy + rZ * ix; const mag = Math.min(1, Math.hypot(wantX, wantZ));
  const sub = Math.max(1, Math.ceil(sdt / (1 / 120))), h = sdt / sub;
  if (me && me.alive && role === 'hide') { moveMancha(me, wantX, wantZ, mag, sdt, sub, h, 5.4, ix, iy);
    me.still = me.moving ? 0 : me.still + sdt; me.wiggle = Math.max(0, (me.wiggle || 0) - sdt);
    me.camoT -= dt; if (me.camoT <= 0) { me.camoT = .12; me.camoD = camoCalc(me); actT = 0; const s = me.camoD.s; const b = $('aCopy'); if (b) b.innerHTML = `<span>🎨</span>${s ? (me.skin === s ? '✔ ' : 'Copiar ') + s.name.replace(/^(el|la|los|las|un|una) /, '') : 'Copiar'}`; }
    me.camo = lerp(me.camo, me.camoD ? me.camoD.v : 0, ex(6, dt)); const pct = Math.round(me.camo * 100); if (pct !== lastPct) { lastPct = pct; $('mPct').textContent = pct + '%'; $('mFill').style.width = pct + '%'; const D = me.camoD || {}; const ok = v => v > .8 ? '✅' : v > .45 ? '🟡' : '❌'; $('mFace').innerHTML = (pct < 40 ? '🙈 ¡Se te ve!' : pct < 65 ? '🤔 Casi' : pct < 85 ? '😏 ¡Bien!' : pct < 95 ? '🫥 ¡Casi invisible!' : '👻 ¡ERES EL DECORADO!') + ` <small>🎨${ok(D.skin || 0)} ✋${ok(D.shape || 0)} 🧘${ok(D.still || 0)}</small>`; if (pct >= 94 && !me.inv) { me.inv = true; S.fanfare(); } if (pct < 88) me.inv = false; }
    const rid = roomOf(me.x, me.z); if (rid !== curRoom) { if (curRoom >= 0) { bub('📍 ' + rooms[rid].def.name, 1600); S.pop(); } curRoom = rid; } }
  if (role === 'seek') { if (phase === 'seek') { const sp = 5.0; for (let s = 0; s < sub; s++) { const k = ex(9, h); critic.vx = lerp(critic.vx || 0, wantX * sp, k); critic.vz = lerp(critic.vz || 0, wantZ * sp, k); critic.x += critic.vx * h; critic.z += critic.vz * h; collide(critic, .5); critic.y = groundAt(critic.x, critic.z, critic.y || 0); } critic.speed = Math.hypot(critic.vx, critic.vz); critic.yaw += wrap(camYaw - critic.yaw) * ex(14, sdt); critic.cool -= dt; const rid = roomOf(critic.x, critic.z); if (rid !== curRoom) { if (curRoom >= 0) bub('📍 ' + rooms[rid].def.name, 1600); curRoom = rid; } } else critic.speed = 0; }
  else criticAI(sdt);
  for (const m of manchas) { if (!m.alive) { if (!m.att) { m.vy -= GRAV * sdt; m.y += m.vy * sdt; const g = groundAt(m.x, m.z, m.y); if (m.y < g) { m.y = g; m.vy = 0; } } continue; } if (m.bot) { const b = m.bot; if (phase === 'hide' && !b.painted) { const d = Math.hypot(b.tx - m.x, b.tz - m.z); if (d > .25) { const [nx, nz] = navTarget(m, b.tx, b.tz); const dx = nx - m.x, dz = nz - m.z, dl = Math.hypot(dx, dz) || 1; const sp = Math.min(3.8, d * 2); m.vx = lerp(m.vx, dx / dl * sp, ex(8, sdt)); m.vz = lerp(m.vz, dz / dl * sp, ex(8, sdt)); m.x += m.vx * sdt; m.z += m.vz * sdt; collide(m, .4); m.y = groundAt(m.x, m.z, m.y); m.yaw += wrap(Math.atan2(m.vx, m.vz) - m.yaw) * ex(10, sdt); m.moving = true; } else { m.moving = false; m.vx = m.vz = 0; if (HIDE_T - phaseT > b.delay) { if (b.a && !m.leap) { leapTo(m, Object.assign({}, b.a, b.a.slide && b.a.mesh ? { lx: rnd(-.3, .3) * b.a.surf.w } : {})); b.painted = true; b.leapt = true; } else if (!b.a) paintBot(m); } } }
      else if (m.leap) { moveMancha(m, 0, 0, 0, sdt, 1, sdt, 0); if (m.att && b.leapt) { b.leapt = false; if (!b.skinOk) applySkin(m, pick(surfaces.filter(s => s !== b.a.surf && !s.horiz))); if (!b.shapeOk) setShape(m, pick(['gota', 'bola', 'alta'])); } }
      else { m.moving = false; m.vx = m.vz = 0; m.still += sdt; if (m.att) { const p = anchorWorld(m.att, m, _v); m.x = p.x; m.y = p.y; m.z = p.z; } } }
    if (phase === 'seek' && (m !== me || role === 'seek')) { m.sneeze -= sdt; if (m.sneeze <= 0) { m.sneeze = rnd(14, 26); const d = Math.hypot(m.cx - critic.x, m.cz - critic.z); if (d < 14) { m.hop = .5; m.shiver = .5; if (role === 'seek') { S.sneeze(); bub('🤧 ¡Achís! Algo ha estornudado por ahí…', 1500); } } } }
    if (m !== me || role === 'seek') { m.camoT -= dt; if (m.camoT <= 0) { m.camoT = .3 + Math.random() * .2; m.camoD = camoCalc(m); m.camo = m.camoD.v; } } }
  if (role === 'seek' && phase === 'seek') { ray.setFromCamera(V0, camera); let hot = false; for (const m of manchas) { if (!m.alive) continue; _v.set(m.cx, m.cy, m.cz); const dist = _v.distanceTo(camera.position); if (ray.ray.distanceToPoint(_v) < .5 && dist < 30) { m.aimed += dt; if (m.camo < .7 || dist < 4) hot = true; if (m.aimed > .9 && m.camo < .75 && m.shiver <= 0) m.shiver = .3; } else m.aimed = 0; } $('cross').classList.toggle('hot', hot); }
  for (const m of manchas) animMancha(m, sdt);
  animCritic(sdt); updShots(sdt); updBursts(sdt); updConf(sdt);
  const port = innerHeight > innerWidth; const cp = Math.cos(camPitch), spP = Math.sin(camPitch); let tx, ty, tz, want, sh = 0;
  if (focus) { tx = focus.cx; ty = focus.cy + .3; tz = focus.cz; want = 4.5; }
  else if (role === 'hide' && me) { tx = me.cx; ty = me.cy + .7; tz = me.cz; want = port ? 11.8 : 10.2; }
  else { tx = critic.x; ty = (critic.y || 0) + 4.7; tz = critic.z; want = port ? 9.4 : 8.4; sh = port ? 1.7 : 1.9; }
  if (role === 'seek' && phase === 'hide') { const c0 = RC(0); camera.position.set(c0[0] - 5, 2.4, c0[1] - 2.2); camera.lookAt(c0[0] - 5 + Math.sin(T * .3) * 2, 4.5, c0[1] - 8); sun.position.set(c0[0] + 6, 30, c0[1] + 6); sun.target.position.set(c0[0], 0, c0[1]); return; }
  const fa = focus ? T * .6 : camYaw; const fx = Math.sin(fa), fz = Math.cos(fa);
  const dX = -fx * cp, dY = spP, dZ = -fz * cp; const lx = tx - rX * sh, lz = tz - rZ * sh;
  const free = camClear(lx, ty, lz, lx + dX * want, ty + dY * want, lz + dZ * want); const target = Math.min(want, free);
  camDist = target < camDist ? Math.max(target, lerp(camDist, target, ex(18, dt))) : lerp(camDist, target, ex(3, dt)); if (camDist > free + .05) camDist = lerp(camDist, free, ex(25, dt)); if (snapCam) camDist = target;
  _v.set(lx + dX * camDist, Math.min(WH - 1.15, ty + dY * camDist + .4), lz + dZ * camDist);
  const lookAhead = role === 'seek' && !focus ? 10 : 1.2; _w.set(lx + fx * lookAhead * cp, ty + (role === 'seek' && !focus ? -Math.sin(camPitch) * 7 + .3 : .1), lz + fz * lookAhead * cp);
  if (snapCam) { camPos.copy(_v); camLook.copy(_w); snapCam = false; } else { camPos.lerp(_v, ex(focus ? 4 : 12, dt)); camLook.lerp(_w, ex(focus ? 5 : 16, dt)); }
  { const ax = camPos.x, az = camPos.z, bx2 = tx, bz2 = tz, L = Math.hypot(bx2 - ax, bz2 - az) || 1; for (const p of props) { const t = clamp(((p.x - ax) * (bx2 - ax) + (p.z - az) * (bz2 - az)) / (L * L), 0, 1); const px = ax + (bx2 - ax) * t, pz = az + (bz2 - az) * t; const block = t < .9 && propDist(p, px, pz) < .5 && !(role === 'seek' && focus); const f = block ? .28 : 1; if (Math.abs(p.fade - f) > .01) { p.fade = lerp(p.fade, f, ex(10, dt)); for (const m of p.mats) { m.transparent = p.fade < .98 || m.userData.tr; m.opacity = (m.userData.tr ? m.userData.op : 1) * p.fade; m.depthWrite = p.fade > .9; } } } }
  camera.position.copy(camPos); shake = Math.max(0, shake - dt * 1.5); if (shake > 0) camera.position.add(_v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(shake * .25)); camera.lookAt(camLook);
  sun.position.set(camLook.x + 6, 30, camLook.z + 6); sun.target.position.set(camLook.x, 0, camLook.z);
  if (window.__camO) { camera.position.copy(window.__camO.p); camera.lookAt(window.__camO.l); }
}
function animMancha(m, dt) {
  const tg = m.S; for (let i = 0; i < 3; i++) m.cur[i] = lerp(m.cur[i], tg[i], Math.min(1, dt * 10)); m.bodyDrop.visible = m.geo === 'drop'; m.bodyBox.visible = m.geo !== 'drop';
  m.hop = Math.max(0, m.hop - dt * 2.2); const spd = Math.hypot(m.vx, m.vz); const walk = spd > .3 && m.grounded && !m.att ? Math.abs(Math.sin(T * 14 + m.z)) : 0; const breathe = m.skin && !m.moving ? Math.sin(T * 1.6 + m.x) * .006 : Math.sin(T * 2.4 + m.x) * .025;
  const sq = 1 + breathe - walk * .08 + Math.sin(m.hop * 12) * m.hop * .2;
  m.g.position.set(m.x, m.y + walk * .14 + Math.max(0, Math.sin(m.hop * 6)) * m.hop * (m.att ? .05 : .4), m.z); m.g.rotation.y = m.yaw;
  m.inner.scale.set(m.cur[0] / Math.sqrt(sq), m.cur[1] * sq, m.cur[2] / Math.sqrt(sq)); m.inner.rotation.z = spd > .3 ? Math.sin(T * 14) * .06 : 0;
  m.shiver = Math.max(0, m.shiver - dt); m.inner.rotation.x = Math.sin(T * 50) * m.shiver * .12 + (spd > .3 && !m.att ? .1 : 0);
  // ojos: se esconden dentro cuando estás camuflada y quieta; a veces asoman (¡pista para el buscador!)
  const H = m.cur[1]; const hiding = m.skin && m.alive && !m.moving && (phase === 'seek' || m.still > 1.2) && !m.leap;
  let ev = 1; if (m.caught) ev = 1.4; else if (hiding) { m.peek -= dt; const cd = critic ? Math.hypot(m.cx - critic.x, m.cz - critic.z) : 99; if (m.peek < 0) { ev = cd > 6 ? .6 : 0; if (m.peek < -.7) m.peek = rnd(6, 12); } else ev = 0; }
  m.eyeVis = lerp(m.eyeVis, ev, Math.min(1, dt * 10)); const es = clamp(Math.min(m.cur[0] * .9, H * 1.2 + .15, 1), .3, 1) * m.eyeVis;
  m.eyes.visible = m.eyeVis > .02; m.eyes.scale.setScalar(Math.max(.001, es)); m.eyes.position.set(0, m.geo === 'drop' ? Math.max(.08, H * .52) : H * .62, (m.geo === 'drop' ? m.cur[2] * .4 : m.cur[2] / 2) + .02 - (1 - m.eyeVis) * .1);
  m.deco.forEach(d => d.visible = !m.skin && m.geo === 'drop'); m.blink -= dt; if (m.blink < 0) m.blink = rnd(2, 5); const bl = m.blink < .12;
  const lidRot = m.caught ? -1.6 : (bl ? -.05 : hiding ? -.7 : -1.6); m.lids.forEach(l => l.rotation.x = lerp(l.rotation.x, lidRot, Math.min(1, dt * 20)));
  m.mouth.scale.set(1, m.caught ? -2.5 : 1, 1);
  if (m.caught) { m.spin = Math.max(0, m.spin - dt * .4); m.inner.rotation.y += dt * 12 * m.spin; }
  // centro del cuerpo en el mundo
  const lz = m.geo === 'drop' ? 0 : 0; m.cx = m.x + Math.sin(m.yaw) * lz; m.cz = m.z + Math.cos(m.yaw) * lz; m.cy = m.y + H / 2;
}
function animCritic(dt) { const c = critic; c.walk += dt * c.speed * 2.4; const mv = c.speed > .1 ? 1 : 0; c.g.position.set(c.x, (c.y || 0) + Math.abs(Math.sin(c.walk)) * .12 * mv, c.z); c.g.rotation.y = c.yaw;
  c.legs.forEach((l, i) => { const ph = c.walk + i * Math.PI; l.hip.rotation.x = lerp(l.hip.rotation.x, Math.sin(ph) * .55 * mv, Math.min(1, dt * 12)); l.knee.rotation.x = lerp(l.knee.rotation.x, Math.max(0, -Math.cos(ph)) * 1.1 * mv, Math.min(1, dt * 12)); });
  c.top.rotation.z = Math.sin(c.walk * .5) * .08;
  if (c.state === 'count') { c.lid.rotation.x = lerp(c.lid.rotation.x, 1.35, Math.min(1, dt * 6)); c.top.rotation.z = Math.sin(T * 3) * .06; }
  else { const sq = c.state === 'aim' ? .55 : ((T % 3.7) < .12 ? 1.45 : -.2); c.lid.rotation.x = lerp(c.lid.rotation.x, sq, Math.min(1, dt * 14)); c.brow.rotation.z = lerp(c.brow.rotation.z, c.state === 'aim' ? -.25 : Math.PI * .1, Math.min(1, dt * 6)); }
  c.iris.position.x = Math.sin(T * .9) * .14 * (c.state === 'wander' ? 1 : 0); c.iris.position.y = Math.cos(T * 1.3) * .07;
  c.fx = Math.max(0, c.fx - dt * 4); c.arm.rotation.x = -c.fx * .6 + (role === 'seek' && playing ? -camPitch * .5 : 0); c.tipM.emissiveIntensity = .6 + c.fx * 3 + (c.state === 'aim' ? Math.sin(T * 30) * .5 + .5 : 0); }
// ---------- fin de ronda ----------
function endRound() { if (phase !== 'seek' && phase !== 'hide') return; phase = 'reveal'; hud(false); slowmo = 1; focus = null; focusT = 0;
  const r = rounds[round]; const aliveL = manchas.filter(m => m.alive); const total = manchas.length; let title, txt, win;
  if (r !== 'seek') { win = !!(me && me.alive); const pct = Math.round((me ? me.camo : 0) * 100);
    if (r === 'hide') { title = win ? '🏆 ¡NO TE ENCONTRÓ!' : '🎨 ¡Te pilló El Crítico!'; txt = `Camuflaje: <b>${pct}%</b>${win ? ' · ¡Eres arte puro!' : ''}<br>Manchas que aguantaron: ${aliveL.length}/${total}`; }
    else { title = win ? `🏆 ¡${P2[hider2p]} no fue encontrado!` : `🧐 ¡${P2[1 - hider2p]} lo encontró!`; txt = `Camuflaje de ${P2[hider2p]}: <b>${pct}%</b>`; if (win) p2score[hider2p]++; else p2score[1 - hider2p]++; txt += `<br>👯 Marcador: ${P2[0]} ${p2score[0]} – ${p2score[1]} ${P2[1]}`; }
    if (win) { save.wins++; S.fanfare(); confetti(me.x, 2, me.z, 160, 7); } }
  else { const caught = total - aliveL.length; win = aliveL.length === 0; title = win ? '🏆 ¡Las pillaste a TODAS!' : caught ? `🧐 Pillaste ${caught} de ${total}` : '🙈 ¡No pillaste ninguna!'; txt = `Disparos sobrantes: ${shotsLeft}<br>${aliveL.length ? 'Se escondían: ' + aliveL.map(m => `${m.name} (${Math.round(m.camo * 100)}%)`).join(', ') : '¡Ojo de crítico de arte!'}`; if (caught) S.fanfare(); else S.fail(); }
  results.push({ r, win }); if (bestShot && bestShot.pct > save.best) save.best = bestShot.pct; persist();
  // revelar dónde estaban: dan un salto y sacan confeti, y la cámara las enseña
  aliveL.forEach(m => { m.hop = 1.6; confetti(m.x, 1.2, m.z, 25, 4); m.lids.forEach(l => l.rotation.x = -1.6); });
  const rv = aliveL.find(m => m !== me) || aliveL[0]; if (rv) { focus = rv; focusT = 1.2; }
  setTimeout(() => { playing = false; focus = null; showResult(title, txt, r); }, 1300);
}
function showResult(title, txt, r) { $('rT').textContent = title; $('rP').innerHTML = txt + (save.best ? `<br><small>Tu mejor camuflaje: ${save.best}%</small>` : ''); const img = $('shareImg'); if (bestShot && r !== 'seek') { img.src = bestShot.img; img.style.display = 'block'; } else img.style.display = 'none'; $('rShare').style.display = bestShot ? '' : 'none';
  round++; $('rNext').textContent = round < rounds.length ? (rounds[round] === 'seek' ? '🧐 ¡Ahora buscas tú!' : rounds[round].startsWith('2p') ? '🔄 ¡Cambio de papeles!' : 'Siguiente ▶') : '🔁 Otra partida'; show('res'); }
tap('rNext', () => { if (round < rounds.length) nextRound(); else startMatch(mode); });
tap('rMenu', () => toMenu());
tap('hBack', () => toMenu());
tap('rShare', async () => { if (!bestShot) return; const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, '#7a5cff'); g.addColorStop(1, '#ff6fb5'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  const im = new Image(); im.src = bestShot.img; try { await im.decode(); } catch (e) { } x.fillStyle = '#ffcf4a'; x.fillRect(70, 190, 940, 760); x.fillStyle = '#c98a1a'; x.fillRect(95, 215, 890, 710); const iw = 850, ih = 670; const ar = im.width / im.height; let sw = im.width, sh = im.height, sx = 0, sy = 0; if (ar > iw / ih) { sw = im.height * iw / ih; sx = (im.width - sw) / 2; } else { sh = im.width * ih / iw; sy = (im.height - sh) / 2; } try { x.drawImage(im, sx, sy, sw, sh, 115, 235, iw, ih); } catch (e) { }
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '700 76px Fredoka, sans-serif'; x.fillText('Escondite en el Cuadro', 540, 130); x.font = '700 150px Fredoka, sans-serif'; x.fillStyle = '#fff38a'; x.fillText(bestShot.pct + '%', 540, 1110); x.fillStyle = '#fff'; x.font = '600 48px Fredoka, sans-serif'; x.fillText('de camuflaje en ' + bestShot.cuadro, 540, 1190); x.font = '500 40px Fredoka, sans-serif'; x.fillText('¿A que no me encuentras? 🎨', 540, 1265);
  cv.toBlob(async b => { const f = new File([b], 'mi-escondite.png', { type: 'image/png' }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Escondite en el Cuadro', text: `¡Me camuflé al ${bestShot.pct}%! ¿Me encuentras?` }); return; } } catch (e) { } const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'mi-escondite.png'; a.click(); toast('📸 ¡Tarjeta guardada!', '', 1400); window.__lastCard = cv.toDataURL('image/png'); }, 'image/png'); });

// ---------- menú ----------
function toMenu() { transition(() => { playing = false; phase = 'idle'; hud(false); show('menu'); menuWorld(); musicMode = 'calm'; }); }
function menuWorld() { manchas = []; buildCastle(); critic = makeCritic(); critic.state = 'wander'; const c = RC(0); [['#ff8fd0', 'gota'], ['#5fc8ff', 'alta'], ['#ffd23f', 'gota']].forEach(([col, pose], i) => { const m = makeMancha(col, 'm', false); m.x = c[0] - 2 + i * 2; m.z = c[1] - 1 + (i % 2) * .6; setShape(m, pose); m.g.position.set(m.x, 0, m.z); }); $('mBest').textContent = save.best ? `🏅 Mejor camuflaje: ${save.best}% · 🏆 ${save.wins} victorias` : '✨ v4: ¡pégate a cuadros, lámparas y libros y moldéate!'; }
function menuAnim(dt) { const c = RC(0); manchas.forEach((m, i) => { if (Math.sin(T * 1.7 + i * 2.1) > .985 && m.hop <= 0) { m.hop = 1; } m.yaw = Math.sin(T * .7 + i) * .5; animMancha(m, dt); }); if (critic) { critic.speed = 1.6; const a = T * .25; critic.x = c[0] + Math.sin(a) * 4.5; critic.z = c[1] + 1 + Math.cos(a) * 3; critic.yaw = a + Math.PI / 2; animCritic(dt); } }
// ---------- bucle ----------
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.1, (now - last) / 1000); last = now;
  update(dt); if (!playing && phase === 'idle') menuAnim(dt);
  renderer.render(scene, camera);
  fpsAcc += dt; fpsN++; fpsT += dt; if (fpsT > 2.5) { const avg = fpsAcc / fpsN; fpsAcc = fpsN = fpsT = 0; const maxQ = Math.min(DPR, 2.25); if (avg > .024 && quality > .75) { quality = Math.max(.75, quality - .25); renderer.setPixelRatio(quality); resize(); } else if (avg < .0145 && quality < maxQ) { quality = Math.min(maxQ, quality + .25); renderer.setPixelRatio(quality); resize(); } } }
window.__ec = { THREE, get camYaw() { return camYaw; }, get phase() { return phase; }, get role() { return role; }, get me() { return me; }, get manchas() { return manchas; }, get critic() { return critic; }, get props() { return props; }, get anchors() { return anchors; }, get surfaces() { return surfaces; }, get cols() { return cols; }, setPhaseT: v => phaseT = v, camoCalc, contactSurf, applySkin, setShape, attach, findJump, doJump, copySkin, groundAt, get shotsLeft() { return shotsLeft; }, setCam: (y, p) => { camYaw = y; camPitch = p; }, fire: () => playerFire(), get quality() { return quality; }, get playing() { return playing; }, roomOf, lineOfSight, get camPos() { return camera.position.clone(); }, setJoy: (x, y) => { joyX = x; joyY = y; }, snap: () => { snapCam = true; }, renderer, scene, camera };
menuWorld(); requestAnimationFrame(loop);
