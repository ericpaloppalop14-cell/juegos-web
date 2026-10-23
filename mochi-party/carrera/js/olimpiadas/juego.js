// MOCHI PARTY · OLIMPIADAS — arranque de una prueba (o del podio final)
import { OLIMPIADAS, findEv } from './catalogo.js?v=o31';
const Q0 = new URLSearchParams(location.search);
// el marco común (core3d) no debe volver al menú antiguo: «stay» le deja aquí para la celebración
if (!Q0.has('stay')) history.replaceState(null, '', location.pathname + location.search + (location.search ? '&' : '?') + 'stay');
window.__keys = {}; addEventListener('keydown', e => window.__keys[e.code] = true); addEventListener('keyup', e => window.__keys[e.code] = false);
const { o, i, p } = findEv(Q0.get('o'), Q0.get('e'));
const $ = id => document.getElementById(id);
if (Q0.has('podio')) {
  const THREE = await import('three'); const { podioFinal } = await import('./fiesta.js?v=o31');
  const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true }); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(innerWidth, innerHeight, false);
  podioFinal(o, renderer, new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 500));
} else {
  const core = await import('../core3d.js?v=m18'); const { TIPOS } = await import('./tipos.js?v=o31'); const { NUEVOS } = await import('./nuevos.js?v=o31'); const { NUEVOS2 } = await import('./nuevos2.js?v=o31'); Object.assign(TIPOS, NUEVOS, NUEVOS2); const { fiesta } = await import('./fiesta.js?v=o31');
  $('load').textContent = `${p.icon} ${p.name}…`;
  let EV; if (p.base) { EV = { ...(await import(`../ev-${p.base}.js?v=m18`)).default }; EV.mode = 'tiempo'; if (p.base === 'nado') EV.noFeet = true; } else EV = TIPOS[p.tipo]({ ...p, mundo: o.id });
  // cartel de presentación de la prueba (se ve durante la cuenta atrás)
  const ol = Q0.has('stay') || true; const S = JSON.parse(localStorage.getItem('mo_olimp') || 'null'); const n = S && S.oid === o.id && S.mode === 'olimpiada' ? `Prueba ${i + 1}/${o.pruebas.length} · ` : '';
  const pr = $('pres'); pr.innerHTML = `<div class="pIc">${p.icon}</div><div class="pNm">${p.name}</div><div class="pOl">${n}${o.icon} ${o.name}</div>`; pr.classList.add('on'); setTimeout(() => pr.classList.remove('on'), 2600);
  const E = core.run(EV);
  // dificultad FÁCIL: rivales flojos con azar por prueba, para que quien juegue razonablemente gane a menudo
  E.racers.forEach(r => { if (!r.me) r.skill = +(0.08 + Math.random() * 0.37).toFixed(2); });
  // GALAXIA: escafandra de cristal con antena luminosa, estela brillante y cámara algo más cercana
  if (o.id === 'espacio') { const T3 = core.THREE, gm = new T3.MeshPhysicalMaterial ? null : null;
    for (const r of E.racers) { const c = r.obj.userData.char; if (!c) continue; c.updateMatrixWorld(true); const bb = new T3.Box3().setFromObject(c), sz = bb.getSize(new T3.Vector3()), ce = bb.getCenter(new T3.Vector3()); c.worldToLocal(ce);
      const ps = r.obj.userData.pivot.scale.x || 1, R = Math.min(sz.x, sz.y) * .55 / ps, h = new T3.Group(); ce.y += sz.y * .12 / ps;
      const glass = new T3.Mesh(new T3.SphereGeometry(1, 24, 16), new T3.MeshBasicMaterial({ color: '#bfeaff', transparent: true, opacity: .18, depthWrite: false })); glass.scale.setScalar(R); h.add(glass);
      const rim = new T3.Mesh(new T3.TorusGeometry(R * .62, R * .06, 8, 28), core.toon('#e8e4ff', { rim: .6 })); rim.rotation.x = Math.PI / 2; rim.position.y = -R * .78;
      const hi = new T3.Mesh(new T3.SphereGeometry(R * .16, 10, 8), new T3.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7 })); hi.position.set(-R * .45, R * .5, R * .55); h.add(hi);
      const ant = new T3.Mesh(new T3.CylinderGeometry(R * .03, R * .03, R * .5, 6), core.toon('#e8e4ff')); ant.position.y = R * 1.2; h.add(ant); const tip = core.glowSprite(r.ch.color, R * .7, 1); tip.position.y = R * 1.5; h.add(tip); r._tip = tip;
      h.position.copy(ce); c.add(h); }
    const rnd = (a, b) => a + Math.random() * (b - a); let last = { };
    const r0 = EV.render.bind(EV); EV.render = (E2, dt) => { r0(E2, dt); if (!p.base && !E2.celeb) { core.camera.fov *= .86; core.camera.updateProjectionMatrix(); }
      for (const r of E2.racers) { if (r._tip) r._tip.material.opacity = .6 + .4 * Math.sin(performance.now() / 180 + r.k); const q = r.obj.position, l = last[r.id]; if (l && E2.phase === 'run') { const v = Math.hypot(q.x - l.x, q.z - l.z) / Math.max(dt, 1e-3); if (v > 2 && Math.random() < (r.me ? .9 : .35)) E2.burst(q.clone().add(new core.THREE.Vector3(rnd(-.2, .2), .4, rnd(-.2, .2))), r.me ? '#bfe0ff' : r.ch.color, 1, .8, .45, .35, 0); } last[r.id] = q.clone(); } };
  }
  // SUMO EN LA DUNA: suelo dibujado y grada con público animado
  if (p.id === 'duna') { const { sumoExtra } = await import('./sumo-extra.js?v=o31'); let tk = null; const r0 = EV.render.bind(EV);
    EV.render = (E2, dt) => { if (!tk && EV.A) tk = sumoExtra(E2, EV.A, p.R || 9.5); r0(E2, dt); tk && tk(dt); }; }
  // joystick visible cuando arrastras en las pruebas de arena
  const st = $('stick'), kn = st.firstElementChild, usesStick = EV.stick || (['recoge', 'superv', 'empuje'].includes(p.tipo) && p.modo !== 'barrido');
  // en empuje (sumo) el joystick se queda SIEMPRE a la vista, en reposo abajo a la izquierda
  const restStick = p.tipo === 'empuje';
  let done = false;
  (function watch() {
    const I = E.input; if (usesStick && I.down && I.sx != null && E.phase === 'run') { st.style.opacity = 1; st.style.display = 'block'; st.style.left = I.sx + 'px'; st.style.top = I.sy + 'px'; const dx = I.px - I.sx, dy = I.py - I.sy, d = Math.hypot(dx, dy), k = d > 50 ? 50 / d : 1; kn.style.transform = `translate(${dx * k}px,${dy * k}px)`; } else if (restStick && (E.phase === 'run' || E.phase === 'count')) { st.style.display = 'block'; st.style.opacity = .75; const port = innerHeight > innerWidth; st.style.left = (port ? 90 : 110) + 'px'; st.style.top = (innerHeight - (port ? 190 : 110)) + 'px'; kn.style.transform = 'none'; } else st.style.display = 'none';
    if (E.phase === 'done' && !done) { done = true; st.style.display = 'none'; EV.dispose && EV.dispose(); setTimeout(() => fiesta(E, EV, o, i), 300); }
    if (!done) requestAnimationFrame(watch);
  })();
  window.__olimp = { E, EV, o, p, i };
}
