// v39: vistas previas 3D en directo de los 4 circuitos en «Elige copa».
// Un único WebGLRenderer pequeño (pixel ratio bajo) con scissor/viewport para las 4 casillas.
// Reutiliza buildTrack + cielo/luces de la carrera; karts simplificados sobre la línea de carrera;
// cámara de persecución elevada detrás del líder. ~30 fps, en pausa si no se ve, escenas liberadas al cambiar de copa.
import * as THREE from 'three';
import { CHARS } from './data.js';
import { cupForRace, raceNames } from './tracks2.js';
import { buildTrack } from './track.js';
import { Race } from './race.js';
import { makeKart, animKart } from './gfx.js';

const V3 = THREE.Vector3;
const FRAME_MS = 1000 / 30;

function disposeScene(sc) {
  sc.traverse(o => { if (o.geometry) o.geometry.dispose(); });
}

export function createTrackMinis(host) {
  let tiles = [], scenes = [], raf = 0, last = 0, seen = true, gen = 0, hiddenSince = 0, fpsN = 0, fpsT = 0;
  const canvas = document.createElement('canvas'); canvas.className = 'tm3d';
  const isTouch = matchMedia('(pointer:coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = false;
  const PR = Math.min(devicePixelRatio || 1, isTouch ? 1 : 1.25); renderer.setPixelRatio(PR);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { seen = es.some(e => e.isIntersecting); kick(); }) : null;
  if (io) io.observe(host);
  document.addEventListener('visibilitychange', kick);
  const stats = { fps: 0, builds: [] }; window.__tm3d = stats;

  function setHost(h) { if (h === host) return; if (io) { io.unobserve(host); io.observe(h); } host = h; seen = true; }
  function freeAll() { for (const s of scenes) if (s && s.scene) { disposeScene(s.scene); } scenes = []; renderer.renderLists.dispose(); }

  function setCup(c, locked) {
    gen++; freeAll(); tiles = [];
    host.innerHTML = ''; host.appendChild(canvas);
    raceNames(c).forEach((name, i) => {
      const d = document.createElement('div'); d.className = 'tmini' + (locked ? ' lk' : ''); d.style.setProperty('--cc', c.color); d.style.animationDelay = (i * 0.06) + 's';
      d.innerHTML = `<div class="tmload"></div><div class="tmn"><b>${i + 1}</b><span>${name}</span></div>`;
      host.appendChild(d); tiles.push({ el: d, i, cup: cupForRace(c, i), rev: i === 1, scene: null, cam: new THREE.PerspectiveCamera(58, 1.6, 0.5, 1500), karts: [], camPos: new V3(), camLook: new V3(), snap: true, locked });
    });
    // construir de una en una, en fotogramas distintos (la vuelta reutiliza la escena de la ida)
    const my = gen; let k = 0; const order = [0, 2, 3];
    const next = () => { if (my !== gen || k >= order.length) return; const ti = order[k++];
      const t0 = performance.now();
      try { buildScene(ti, tiles[ti].cup); if (ti === 0) shareScene(1); } catch (e) { console.warn('trackmini', e); }
      stats.builds.push(Math.round(performance.now() - t0));
      setTimeout(() => requestAnimationFrame(next), 30); };
    setTimeout(() => requestAnimationFrame(next), 350); // espera breve: si se cambian copas rápido no se construye nada
    kick();
  }
  function buildScene(ti, cup) {
    const scene = new THREE.Scene(), lod0 = window.__mrLod; window.__mrLod = 0.35; let T; try { T = buildTrack(cup, false, { hi: false }); } finally { window.__mrLod = lod0; }
    scene.add(T.group);
    const fake = { cup, scene, quality: { hi: false }, track: T }; Race.prototype.setupSky.call(fake);
    scene.traverse(o => { if (o.isLight) o.castShadow = false; if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    scenes.push({ scene, T });
    attach(tiles[ti], scene, T);
  }
  function shareScene(ti) { const s = scenes[scenes.length - 1]; attach(tiles[ti], s.scene, s.T); }
  function attach(tile, scene, T) {
    tile.scene = scene; tile.T = T; tile.snap = true;
    const pool = CHARS.slice(); tile.karts = [];
    for (let j = 0; j < 5; j++) {
      const ch = pool[(j * 3 + tile.i * 5 + 1) % pool.length]; const m = makeKart(ch, j);
      m.traverse(o => { if (o.isMesh) o.castShadow = false; });
      scene.add(m); m.visible = false;
      tile.karts.push({ m, d: -j * 9 - (j % 2) * 3, sp: 36 + j * -1.2 + ((tile.i * 7 + j * 3) % 5) * 0.5, lane: (j % 2 ? 1 : -1) * (0.15 + (j % 3) * 0.18), ph: j * 1.9 });
    }
    tile.el.classList.add('ready');
  }
  function placeKart(tile, k, dt, t) {
    const T = tile.T, N = T.N, L = N * T.STEP;
    k.d += k.sp * (tile.locked ? 0.5 : 1) * dt;
    const dd = ((tile.rev ? -k.d : k.d) % L + L) % L, f = dd / T.STEP, a = Math.floor(f) % N, b = (a + 1) % N, e = f - Math.floor(f);
    const A = T.S[a], B = T.S[b], lane = (k.lane + Math.sin(t * 0.7 + k.ph) * 0.12) * A.w;
    const m = k.m; m.visible = true;
    m.position.set(A.p.x + (B.p.x - A.p.x) * e + A.right.x * lane, A.p.y + (B.p.y - A.p.y) * e, A.p.z + (B.p.z - A.p.z) * e + A.right.z * lane);
    const fx = tile.rev ? -A.fl.x : A.fl.x, fz = tile.rev ? -A.fl.z : A.fl.z;
    m.rotation.y = Math.atan2(fx, fz);
    animKart(m, t, k.sp, '');
    return { fx, fz };
  }
  function draw(now, dt) {
    const t = now / 1000, cr = canvas.getBoundingClientRect();
    const W = Math.round(cr.width), H = Math.round(cr.height); if (W < 2 || H < 2) return;
    const sz = renderer.getSize(new THREE.Vector2()); if (sz.x !== W || sz.y !== H) { renderer.setSize(W, H, false); renderer.setViewport(0, 0, W, H); renderer.clear(); }
    const resized = sz.x !== W || sz.y !== H;
    renderer.setScissorTest(true); renderer.setClearColor(0x000000, 0);
    // modo ligero adaptativo: si el dibujo cuesta mucho, se pintan 2 casillas por fotograma (alternas)
    const t0 = performance.now(); tick++;
    const done = new Set();
    for (const tile of tiles) {
      if (!tile.scene) continue;
      if (rr && !resized && (tile.i + tick) % 2) { tile.skip = (tile.skip || 0) + dt; continue; }
      const tdt = dt + (tile.skip || 0); tile.skip = 0;
      const r = tile.el.getBoundingClientRect(), x = r.left - cr.left, y = r.top - cr.top, w = r.width, h = r.height;
      if (w < 2 || h < 2) continue;
      // karts de otras casillas que comparten escena: ocultar
      for (const o of tiles) if (o !== tile && o.scene === tile.scene) o.karts.forEach(k => k.m.visible = false);
      let lead = null, ld = -1e9, dir = null;
      for (const k of tile.karts) { const dv = placeKart(tile, k, tdt, t); if (k.d > ld) { ld = k.d; lead = k; dir = dv; } }
      if (!done.has(tile.scene) && tile.T.anims) { for (const fn of tile.T.anims) try { fn(t, tdt); } catch (e) {} done.add(tile.scene); }
      const p = lead.m.position, want = new V3(p.x - dir.fx * 10, p.y + 5.2, p.z - dir.fz * 10), look = new V3(p.x + dir.fx * 7, p.y + 1.2, p.z + dir.fz * 7);
      if (tile.snap) { tile.camPos.copy(want); tile.camLook.copy(look); tile.snap = false; }
      else { const kf = 1 - Math.exp(-tdt * 4); tile.camPos.lerp(want, kf); tile.camLook.lerp(look, kf); }
      const cam = tile.cam; cam.aspect = w / h; cam.updateProjectionMatrix(); cam.position.copy(tile.camPos); cam.lookAt(tile.camLook);
      const vy = H - y - h; renderer.setViewport(x, vy, w, h); renderer.setScissor(x, vy, w, h);
      renderer.render(tile.scene, cam);
    }
    renderer.setScissorTest(false);
    const ms = performance.now() - t0; drawMs = drawMs * 0.9 + ms * 0.1; stats.drawMs = Math.round(drawMs * 10) / 10;
    if (!rr && drawMs > 14) rr = true; else if (rr && drawMs < 4) rr = false; stats.rr = rr;
  }
  function visibleNow() { return seen && !document.hidden && host.isConnected && host.offsetParent !== null && tiles.length; }
  function kick() { if (!raf && visibleNow()) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function loop(now) {
    raf = 0;
    if (!visibleNow()) { // pantalla fuera: liberar escenas tras 1,5 s
      if (!hiddenSince) hiddenSince = now; if (now - hiddenSince > 1500 && scenes.length && !(host.offsetParent !== null)) { gen++; freeAll(); tiles.forEach(t => { t.scene = null; t.el.classList.remove('ready'); }); needRebuild = true; }
      if (host.isConnected) setTimeout(() => requestAnimationFrame(loop), 250); return;
    }
    hiddenSince = 0;
    if (needRebuild && cur) { needRebuild = false; setCup(cur.c, cur.locked); }
    if (now - last >= FRAME_MS - 2) { const dt = Math.min(0.1, (now - last) / 1000); last = now; draw(now, dt); fpsN++; }
    if (now - fpsT > 1000) { stats.fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now; }
    raf = requestAnimationFrame(loop);
  }
  let needRebuild = false, cur = null, tick = 0, rr = false, drawMs = 0;
  return { setHost, setCup: (c, locked) => { cur = { c, locked }; needRebuild = false; setCup(c, locked); }, free: () => { gen++; freeAll(); tiles = []; } };
}
