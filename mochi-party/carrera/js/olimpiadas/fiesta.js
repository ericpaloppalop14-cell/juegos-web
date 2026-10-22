// ======================================================================
//  MOCHI PARTY · OLIMPIADAS — celebración al final de cada prueba (alegría del ganador,
//  derrota de los demás), clasificación animada, sesión de la olimpiada y podio final 3D
// ======================================================================
import * as THREE from 'three';
import { CHARS } from '../data.js';
import { makeCharacter, animCharacter, toon, outline, mesh, glowTex, shadowMat, makeTrophy } from '../gfx.js?v=m10';
import { Audio } from '../audio.js';
import { OLIMPIADAS, PTS } from './catalogo.js?v=o23';

const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const rnd = (a, b) => a + Math.random() * (b - a), lerp = (a, b, t) => a + (b - a) * t, pick = a => a[Math.random() * a.length | 0];
const charOf = id => CHARS.find(c => c.id === id) || CHARS[0];
export const KEY = 'mo_olimp';
export function loadS() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
export function saveS(S) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
export function evURL(S, oid, eid, extra = '') { return `olimpiada.html?o=${oid}&e=${eid}&pj=${S.pj}&rv=${S.rv.join(',')}&sk=${S.rv.map(id => (S.skill[id] || .6).toFixed(2)).join(',')}${Q.has('auto') ? '&auto' : ''}${Q.get('x') ? '&x=' + Q.get('x') : ''}${Q.get('q') ? '&q=' + Q.get('q') : ''}${extra}`; }
const nm = (S, id) => id === 'me' ? 'Tú' : charOf(id).name;
const chOf = (S, id) => charOf(id === 'me' ? S.pj : id);

// ---------------- piezas 3D ----------------
function textSprite(txt, bg = '#f0609f', fg = '#fff', w = 3.2) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d');
  x.font = '700 64px Fredoka, sans-serif'; const tw = Math.min(500, x.measureText(txt).width + 60), l = (512 - tw) / 2;
  x.fillStyle = bg; x.beginPath(); x.roundRect(l, 14, tw, 100, 50); x.fill(); x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 6; x.stroke();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 256, 66);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w, w / 4, 1); s.renderOrder = 20; return s;
}
function runner(ch, k, s = 1) { const g = new THREE.Group(), pv = new THREE.Group(); g.add(pv); const c = makeCharacter(ch); c.userData.seed = k; pv.add(c); pv.scale.setScalar(s); const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), shadowMat()); sh.rotation.x = -Math.PI / 2; sh.position.y = .03; sh.scale.setScalar(1.1 * s); g.add(sh); g.userData = { pv, c, sh, s }; return g; }
function skyGrad(scene, a, b) { const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
const confM = ['#ff9cc8', '#7ee3c4', '#ffe27a', '#b9a2f7', '#8fd0ff'].map(c => toon(c, { rim: .3 }));
function fx(scene) {
  const P = [];
  return {
    confetti(p, n = 50) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.22, .36), confM[i % 5]); m.material.side = THREE.DoubleSide; m.position.copy(p).add(new THREE.Vector3(rnd(-2.5, 2.5), rnd(0, 2), rnd(-1.5, 1.5))); m.userData = { v: new THREE.Vector3(rnd(-3, 3), rnd(4, 9), rnd(-2, 2)), t: 0, life: 3, c: 1, sp: rnd(4, 9) }; scene.add(m); P.push(m); } },
    firework(p, color) { const mat = new THREE.SpriteMaterial({ map: glowTex(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); for (let i = 0; i < 34; i++) { const s = new THREE.Sprite(mat.clone()); s.position.copy(p); const a = rnd(0, 6.28), b = rnd(-1.5, 1.5); s.userData = { v: new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).multiplyScalar(rnd(4, 7)), t: 0, life: rnd(1, 1.6), g: 1 }; s.scale.setScalar(.5); scene.add(s); P.push(s); } },
    rain(p) { const s = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 4), toon('#8fd0ff', { rim: 0 })); s.position.copy(p).add(new THREE.Vector3(rnd(-.5, .5), 0, rnd(-.3, .3))); s.userData = { v: new THREE.Vector3(0, -6, 0), t: 0, life: .35, r: 1 }; scene.add(s); P.push(s); },
    tick(dt) { for (let i = P.length - 1; i >= 0; i--) { const s = P[i], u = s.userData; u.t += dt; if (u.t > u.life) { scene.remove(s); P.splice(i, 1); continue; }
      if (u.c) { u.v.y -= 9 * dt; u.v.multiplyScalar(.98); s.position.addScaledVector(u.v, dt); s.rotation.x += u.sp * dt; s.rotation.y += u.sp * .7 * dt; }
      else if (u.g) { u.v.y -= 3 * dt; u.v.multiplyScalar(.97); s.position.addScaledVector(u.v, dt); s.material.opacity = 1 - u.t / u.life; }
      else s.position.addScaledVector(u.v, dt); } }
  };
}
// alegría: el ganador salta con giro y cara feliz; los demás aplauden (nunca tristes)
function animWinner(o, t, k) { const u = o.userData, j = Math.abs(Math.sin(t * 4.2)); o.position.y = (o.userData.by || 0) + j * 1.3; u.pv.rotation.y = (t * 4.2 / Math.PI | 0) % 2 ? Math.min(1, (t * 4.2 / Math.PI) % 1 * 1.6) * 6.283 : 0; const sq = j < .15 ? (1 - j / .15) * .22 : 0; u.pv.scale.set(u.s * (1 + sq), u.s * (1 - sq + (j > .5 ? .06 : 0)), u.s * (1 + sq)); animCharacter(u.c, t + k, 1, 'happy'); }
function animClap(o, t, k) { const u = o.userData, j = Math.abs(Math.sin(t * 6 + k)); o.position.y = (o.userData.by || 0) + j * .3; u.pv.rotation.z = Math.sin(t * 6 + k) * .12; animCharacter(u.c, t + k, 1, k % 2 ? 'happy' : ''); }

// ---------------- resultados de la prueba ----------------
function orderOf(E, EV) {
  const rs = E.racers.map(r => ({ id: r.id, label: r.label, score: r.score || 0, time: r.fin ? r.time : null, prog: r.prog || 0, fin: r.fin }));
  if (EV.mode === 'puntos') rs.sort((a, b) => b.score - a.score);
  else rs.sort((a, b) => (b.fin - a.fin) || (a.fin ? a.time - b.time : b.prog - a.prog));
  return rs;
}
function applyResult(S, o, idx, res) {
  const key = o.id + ':' + idx + ':' + S.sid; S.applied = S.applied || [];
  if (S.applied.includes(key)) return false; S.applied.push(key);
  res.forEach((r, i) => S.pts[r.id] = (S.pts[r.id] || 0) + (S.mode === 'olimpiada' ? PTS[i] : 0));
  S.res = S.res || []; S.res.push({ ev: o.pruebas[idx].id, ids: res.map(r => r.id) }); saveS(S); return true;
}
const resTxt = (EV, r) => r.label ? r.label : EV.mode === 'puntos' ? r.score + ' pts' : r.time != null ? r.time.toFixed(1) + ' s' : Math.round(r.prog * 100) + ' %';

// Una sola celebración por prueba: la del propio escenario (core3d: el ganador salta y los demás aplauden).
// Después solo aparece el panel animado de clasificación, encima de la escena congelada.
export function fiesta(E, EV, o, idx) {
  let S = loadS();
  if (!S || S.oid !== o.id) S = { sid: Date.now(), mode: 'suelta', oid: o.id, idx, pj: Q.get('pj') || 'mochi', rv: (Q.get('rv') || 'tiovivo,atomo,cosmo,lava,disco').split(','), skill: {}, pts: {} };
  let res = orderOf(E, EV);
  try { const m = JSON.parse(localStorage.getItem('mr_res') || 'null'); if (m && m.ev === EV.id && m.order && m.order.length === res.length) { const ids = m.order.map(x => x.id); res.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); } } catch (e) {}
  const before = { ...S.pts }; applyResult(S, o, idx, res);
  ['ctl', 'hint', 'say', 'meter', 'perf', 'hTop', 'hBoard', 'toast', 'stick', 'celeb', 'banner'].forEach(id => { const e = $(id); if (e) e.style.display = 'none'; });
  tabla(S, o, idx, EV, res, before);
  window.__fiesta = { res, S, shown: true };
}

// ---------------- panel de clasificación animada ----------------
function tabla(S, o, idx, EV, res, before) {
  const p = o.pruebas[idx], ol = S.mode === 'olimpiada', last = idx >= o.pruebas.length - 1;
  const box = $('rank'); box.style.display = 'flex';
  const tot = Object.entries(S.pts).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  box.innerHTML = `<div class="rk"><h3>${p.icon} ${p.name}</h3><div class="rkSub">${ol ? `Prueba ${idx + 1}/${o.pruebas.length} · ${o.icon} ${o.name}` : 'Prueba suelta'}</div>
    <div class="rkTabs"><b class="on" id="tabA">Esta prueba</b>${ol ? '<b id="tabB">Olimpiada</b>' : ''}</div>
    <div class="rkList" id="rkList">${res.map((r, i) => `<div class="row ${r.id === 'me' ? 'me' : ''}" data-id="${r.id}" style="animation-delay:${i * .12}s"><span class="ps">${['🥇', '🥈', '🥉'][i] || (i + 1) + 'º'}</span><i style="background:${chOf(S, r.id).color}"></i><span class="nm">${nm(S, r.id)}</span><span class="rs">${resTxt(EV, r)}</span>${ol ? `<span class="pt" style="animation-delay:${.6 + i * .12}s">+${PTS[i]}</span><span class="tt" data-from="${before[r.id] || 0}" data-to="${S.pts[r.id]}">${before[r.id] || 0}</span>` : ''}</div>`).join('')}</div>
    <div class="rkBtns">${ol ? `<button class="btn" id="bNx">${last ? '🏆 Ver el podio final' : `Siguiente prueba (${idx + 2}/${o.pruebas.length}) ▶`}</button>` : `<button class="btn" id="bRep">🔁 Repetir</button>`}<button class="btn s" id="bMenu">Menú</button></div></div>`;
  // los totales cuentan hacia arriba y luego la lista se reordena por la clasificación de la olimpiada
  if (ol) setTimeout(() => { box.querySelectorAll('.tt').forEach(e => { const a = +e.dataset.from, b = +e.dataset.to, t0 = performance.now(); const f = n => { const k = Math.min(1, (n - t0) / 700); e.textContent = Math.round(a + (b - a) * k); if (k < 1) requestAnimationFrame(f); else e.classList.add('pop'); }; requestAnimationFrame(f); }); }, 1100);
  const reorder = (ids, label) => { const L = $('rkList'), rows = [...L.children], first = new Map(rows.map(r => [r.dataset.id, r.getBoundingClientRect().top]));
    ids.forEach(id => { const r = rows.find(x => x.dataset.id === id); if (r) L.appendChild(r); });
    [...L.children].forEach((r, i) => { const dy = first.get(r.dataset.id) - r.getBoundingClientRect().top; r.style.animation = 'none'; r.style.opacity = 1; r.style.transform = `translateY(${dy}px)`; requestAnimationFrame(() => { r.style.transition = 'transform .7s cubic-bezier(.3,1.4,.5,1)'; r.style.transform = ''; }); r.querySelector('.ps').textContent = label(i, r.dataset.id); }); };
  if (ol) { const toB = () => { $('tabA').classList.remove('on'); $('tabB').classList.add('on'); reorder(tot, i => ['🥇', '🥈', '🥉'][i] || (i + 1) + 'º'); }; const toA = () => { $('tabB').classList.remove('on'); $('tabA').classList.add('on'); reorder(res.map(r => r.id), i => ['🥇', '🥈', '🥉'][i] || (i + 1) + 'º'); };
    setTimeout(toB, 2600); $('tabB').onclick = toB; $('tabA').onclick = toA; }
  const go = u => { location.href = u; };
  if ($('bNx')) $('bNx').onclick = () => { if (last) go(evURL(S, o.id, 'podio', '&podio=1')); else { S.idx = idx + 1; saveS(S); go(evURL(S, o.id, o.pruebas[idx + 1].id)); } };
  if ($('bRep')) $('bRep').onclick = () => go(evURL(S, o.id, p.id));
  $('bMenu').onclick = () => go('olimpiadas.html' + (Q.has('auto') ? '?auto' : ''));
}

// ---------------- podio final de la olimpiada ----------------
export function podioFinal(o, renderer, camera) {
  const S = loadS() || { pts: { me: 0 }, pj: 'mochi', rv: [] };
  const order = Object.entries(S.pts).sort((a, b) => b[1] - a[1]).map(([id, p]) => ({ id, p }));
  const meP = order.findIndex(r => r.id === 'me') + 1;
  try { const m = JSON.parse(localStorage.getItem('mo_medallas') || '{}'); if (!m[o.id] || meP < m[o.id]) m[o.id] = meP; localStorage.setItem('mo_medallas', JSON.stringify(m)); } catch (e) {}
  const sc = new THREE.Scene(); skyGrad(sc, o.color[0], o.color[1]);
  sc.add(new THREE.HemisphereLight('#ffffff', o.color[0], 1.1)); const d = new THREE.DirectionalLight('#fff4e8', 1.8); d.position.set(5, 10, 8); sc.add(d);
  mesh(new THREE.CircleGeometry(16, 48), toon(o.color[1], { rim: 0 }), sc, null, [-Math.PI / 2, 0, 0]);
  // rayos de luz giratorios detrás
  const rays = new THREE.Group(); rays.position.set(0, 4, -6); sc.add(rays); for (let i = 0; i < 12; i++) { const m = mesh(new THREE.PlaneGeometry(1.4, 22), new THREE.MeshBasicMaterial({ color: i % 2 ? '#fff6c0' : '#ffd6ec', transparent: true, opacity: .35, depthWrite: false }), rays, null, [0, 0, i * Math.PI / 6]); m.geometry.translate(0, 11, 0); }
  const steps = [{ i: 1, x: -3, h: 1.6, c: '#dfe6f0' }, { i: 0, x: 0, h: 2.4, c: '#ffd84a' }, { i: 2, x: 3, h: 1.1, c: '#e8a46a' }];
  const F = fx(sc), figs = [];
  for (const s of steps) { const b = mesh(new THREE.BoxGeometry(2.8, s.h, 2.4), toon(s.c, { rim: .6, emissive: s.c, ei: .1 }), sc, [s.x, s.h / 2, 0]); outline(b, '#5a3a6e', 1.02); const n = textSprite(String(s.i + 1), 'rgba(0,0,0,0)', '#fff', 2.4); n.position.set(s.x, s.h / 2, 1.3); n.material.depthTest = true; sc.add(n);
    const r = order[s.i]; if (!r) continue; const g = runner(chOf(S, r.id), s.i, s.i === 0 ? 1.15 : .95); g.position.set(s.x, s.h, 0); g.userData.by = s.h; sc.add(g); const tag = textSprite(`${nm(S, r.id)} · ${r.p} pts`, r.id === 'me' ? '#f0609f' : 'rgba(90,50,130,.85)', '#fff', 3.6); tag.position.y = s.i === 0 ? 4.6 : 2.6; g.add(tag); figs.push([g, s.i]); }
  const tro = makeTrophy('#ffd84a', 0); tro.scale.setScalar(.75); sc.add(tro);
  order.slice(3).forEach((r, k) => { const g = runner(chOf(S, r.id), k + 3, .7); g.position.set((k - 1) * 2.4, 0, 3.4); sc.add(g); const tag = textSprite(`${k + 4}º ${nm(S, r.id)}`, r.id === 'me' ? '#f0609f' : 'rgba(90,50,130,.8)', '#fff', 2.6); tag.position.y = 2; g.add(tag); figs.push([g, k + 3]); });
  const box = $('rank'); box.style.display = 'flex'; box.classList.add('final');
  box.innerHTML = `<div class="rk"><h3>${meP === 1 ? '🏆 ¡Campeón de la ' + o.name + '!' : meP <= 3 ? `🎉 ¡Podio! ${meP}º en la ${o.name}` : `${o.icon} ${o.name}: ${meP}º`}</h3>
    <div class="rkList">${order.map((r, i) => `<div class="row ${r.id === 'me' ? 'me' : ''}" style="animation-delay:${1 + i * .12}s"><span class="ps">${['🥇', '🥈', '🥉'][i] || (i + 1) + 'º'}</span><i style="background:${chOf(S, r.id).color}"></i><span class="nm">${nm(S, r.id)}</span><span class="tt">${r.p} pts</span></div>`).join('')}</div>
    <div class="rkBtns"><button class="btn" id="bOtra">🏅 Otra olimpiada</button><button class="btn s" id="bRe">🔁 Repetir</button></div></div>`;
  $('bOtra').onclick = () => location.href = 'olimpiadas.html' + (Q.has('auto') ? '?auto' : '');
  $('bRe').onclick = () => location.href = 'olimpiadas.html?o=' + o.id + (Q.has('auto') ? '&auto' : '');
  $('load').style.display = 'none'; $('hud').style.display = 'none';
  addEventListener('pointerdown', () => { Audio.init(); Audio.sfxPlay('fanfare'); }, { once: true });
  try { Audio.init(); Audio.sfxPlay('fanfare'); } catch (e) {}
  let t0 = performance.now(), last = t0, fw = 0;
  function loop(now) { const dt = Math.min(.05, (now - last) / 1000), t = (now - t0) / 1000; last = now;
    rays.rotation.z = t * .15;
    for (const [g, i] of figs) { if (i === 0) { const u = g.userData; const j = Math.abs(Math.sin(t * 3)); g.position.y = u.by + j * .6; animCharacter(u.c, t, 1, 'happy'); u.pv.rotation.y = Math.sin(t * 1.5) * .3; } else animClap(g, t, i); }
    const w = figs.find(f => f[1] === 0); if (w) { tro.position.set(0, w[0].position.y + 2.3 + Math.sin(t * 3) * .1, .2); tro.rotation.y = t * 1.5; }
    if ((fw -= dt) <= 0) { fw = rnd(.25, .6); F.firework(new THREE.Vector3(rnd(-7, 7), rnd(6, 10), rnd(-8, -3)), pick(['#ffe27a', '#ff9cf0', '#7ee3c4', '#8fd0ff', '#ffb36b'])); }
    if (Math.random() < .05) F.confetti(new THREE.Vector3(0, 7, 0), 14); F.tick(dt);
    const port = innerHeight > innerWidth; camera.fov = port ? 74 : 48; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    const a = Math.sin(t * .2) * .25, dist = port ? 19 : 12.5; const ox = port ? 0 : 4.5; camera.position.set(Math.sin(a) * dist + ox, port ? 4 : 4.4, Math.cos(a) * dist); camera.lookAt(ox, port ? -1.5 : 2.6, 0);
    renderer.setSize(innerWidth, innerHeight, false); renderer.render(sc, camera); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  window.__podio = { order };
}
