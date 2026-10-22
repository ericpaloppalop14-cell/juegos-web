// MOCHI PARTY · OLIMPIADAS — arranque de una prueba (o del podio final)
import { OLIMPIADAS, findEv } from './catalogo.js?v=o15';
const Q0 = new URLSearchParams(location.search);
// el marco común (core3d) no debe volver al menú antiguo: «stay» le deja aquí para la celebración
if (!Q0.has('stay')) history.replaceState(null, '', location.pathname + location.search + (location.search ? '&' : '?') + 'stay');
window.__keys = {}; addEventListener('keydown', e => window.__keys[e.code] = true); addEventListener('keyup', e => window.__keys[e.code] = false);
const { o, i, p } = findEv(Q0.get('o'), Q0.get('e'));
const $ = id => document.getElementById(id);
if (Q0.has('podio')) {
  const THREE = await import('three'); const { podioFinal } = await import('./fiesta.js?v=o15');
  const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true }); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(innerWidth, innerHeight, false);
  podioFinal(o, renderer, new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 500));
} else {
  const core = await import('../core3d.js?v=m15'); const { TIPOS } = await import('./tipos.js?v=o15'); const { NUEVOS } = await import('./nuevos.js?v=o15'); const { NUEVOS2 } = await import('./nuevos2.js?v=o15'); Object.assign(TIPOS, NUEVOS, NUEVOS2); const { fiesta } = await import('./fiesta.js?v=o15');
  $('load').textContent = `${p.icon} ${p.name}…`;
  let EV; if (p.base) { EV = { ...(await import(`../ev-${p.base}.js?v=m15`)).default }; EV.mode = 'tiempo'; if (p.base === 'nado') EV.noFeet = true; } else EV = TIPOS[p.tipo]({ ...p, mundo: o.id });
  // cartel de presentación de la prueba (se ve durante la cuenta atrás)
  const ol = Q0.has('stay') || true; const S = JSON.parse(localStorage.getItem('mo_olimp') || 'null'); const n = S && S.oid === o.id && S.mode === 'olimpiada' ? `Prueba ${i + 1}/${o.pruebas.length} · ` : '';
  const pr = $('pres'); pr.innerHTML = `<div class="pIc">${p.icon}</div><div class="pNm">${p.name}</div><div class="pOl">${n}${o.icon} ${o.name}</div>`; pr.classList.add('on'); setTimeout(() => pr.classList.remove('on'), 2600);
  const E = core.run(EV);
  // dificultad FÁCIL: rivales flojos con azar por prueba, para que quien juegue razonablemente gane a menudo
  E.racers.forEach(r => { if (!r.me) r.skill = +(0.08 + Math.random() * 0.37).toFixed(2); });
  // joystick visible cuando arrastras en las pruebas de arena
  const st = $('stick'), kn = st.firstElementChild, usesStick = EV.stick || (['recoge', 'superv', 'empuje'].includes(p.tipo) && p.modo !== 'barrido');
  let done = false;
  (function watch() {
    const I = E.input; if (usesStick && I.down && I.sx != null && E.phase === 'run') { st.style.display = 'block'; st.style.left = I.sx + 'px'; st.style.top = I.sy + 'px'; const dx = I.px - I.sx, dy = I.py - I.sy, d = Math.hypot(dx, dy), k = d > 50 ? 50 / d : 1; kn.style.transform = `translate(${dx * k}px,${dy * k}px)`; } else st.style.display = 'none';
    if (E.phase === 'done' && !done) { done = true; st.style.display = 'none'; EV.dispose && EV.dispose(); setTimeout(() => fiesta(E, EV, o, i), 300); }
    if (!done) requestAnimationFrame(watch);
  })();
  window.__olimp = { E, EV, o, p, i };
}
