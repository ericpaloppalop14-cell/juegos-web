// ======================================================================
//  GLOBO DE LOS SUEÑOS (o32) — carrera en globo por un cielo de sueño.
//  Mueve el globo con ⬅ ➡ (lados) y ⬆ ⬇ (subir / bajar). Métete en la CORRIENTE VERDE 💨
//  (flechas que vuelan hacia la meta) para ir mucho más rápido; evita el VIENTO ROJO en contra.
//  Nada atraviesa nada: globos que se apartan entre sí, ovejas dormilonas que te empujan (boing) y
//  el paisaje (islas, arcoíris, nubes) siempre fuera del pasillo de vuelo.
// ======================================================================
import { THREE, camera, toon, outline, mesh, glowSprite, rnd, clamp, lerp, pick, Audio } from '../core3d.js?v=m18';
import { buildWorld, prop, arch, SPH, CYL } from './mundos.js?v=o32';
import { T, GL, v3, $, sk, setButtons, racers, hitFx, base } from './tipos.js?v=o32';

const L = 320, XW = 11, YMIN = 2.5, YMAX = 24, FR = 3.4; // largo, medio ancho, alturas, radio de la corriente
const BASEV = 5, FAVV = 14, CONV = 2.2;
// corriente a favor (verde) y viento en contra (rojo): cintas que serpentean por el cielo
const fav = z => ({ x: 7.5 * Math.sin(z * .019 + .4), y: 12 + 7 * Math.sin(z * .026 + 1.3) });
const con = z => { const f = fav(z); return { x: -f.x * .85 + Math.sin(z * .05) * 1.5, y: 26 - f.y }; };
const port = () => innerHeight > innerWidth;

function cloudPuff(parent, x, y, z, s, col = '#ffffff') { const g = new THREE.Group(); const m = toon(col, { rim: .5 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(SPH(), m, g, [Math.cos(a) * 1.3, Math.sin(i * 1.7) * .3, Math.sin(a) * .6], null, rnd(.9, 1.4)); }
  mesh(SPH(), m, g, [0, .6, 0], null, 1.6); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g); return g; }
function island(parent, x, y, z, s) { const g = new THREE.Group();
  mesh(new THREE.ConeGeometry(2.2, 3.2, 9), T('#b88ad8'), g, [0, -1.6, 0], [Math.PI, 0, 0]);
  mesh(new THREE.CylinderGeometry(2.4, 2.2, .6, 12), T('#9be8b0'), g, [0, .1, 0]);
  const tr = mesh(SPH(), T(pick(['#ff9ad8', '#ffd36b', '#9ad8ff'])), g, [.6, 1.9, 0], null, [1, 1.1, 1]); mesh(CYL(), T('#a87850'), g, [.6, .9, 0], null, [.15, 1.2, .15]);
  mesh(SPH(), T('#ffffff'), g, [-1, .7, .6], null, .45); mesh(SPH(), T('#ff8fc8'), g, [-1.2, .55, -.6], null, .35);
  const cas = mesh(new THREE.ConeGeometry(.5, 1, 8), T('#ff6fae'), g, [-.8, 1.6, -.2]); mesh(new THREE.CylinderGeometry(.4, .4, .9, 8), T('#fff0d8'), g, [-.8, .7, -.2]);
  g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g); g.userData.tr = tr; g.userData.cas = cas; return g; }
function rainbow(parent, x, y, z, r, ry = 0) { const g = new THREE.Group(); ['#ff6f8a', '#ffb05a', '#ffe27a', '#8fe88a', '#6ac8ff', '#a88aff'].forEach((c, i) =>
  mesh(new THREE.TorusGeometry(r - i * .55, .3, 6, 40, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .8, fog: false }), g));
  cloudPuff(g, r - 1.4, 0, 0, 1.1); cloudPuff(g, -r + 1.4, 0, 0, 1.1); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
// flecha (chevron) plana para las corrientes
function chevronGeo() { const s = new THREE.Shape(); s.moveTo(0, .9); s.lineTo(.8, -.2); s.lineTo(.45, -.2); s.lineTo(0, .35); s.lineTo(-.45, -.2); s.lineTo(-.8, -.2); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g; }

export function globo(cfg) {
  return base(cfg, { mode: 'tiempo', maxT: cfg.maxT || 90,
    init(E) {
      const sc = E.scene; this.W = buildWorld(E, cfg.mundo, { track: { z0: 20, z1: -L - 40, half: 14 }, noAmb: true }); setButtons(null);
      const g = arch(sc, -L, 14, '¡META!', '#ff6fae'); g.scale.setScalar(1.7); this.goalArch = g;
      // ---- corrientes: tubo translúcido + flechas que vuelan + partículas
      const tube = (fn, col, op) => { const pts = []; for (let z = 25; z >= -L - 30; z -= 6) { const c = fn(z); pts.push(v3(c.x, c.y, z)); }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, FR * .8, 12, false), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); sc.add(m); return m; };
      this.favTube = tube(fav, '#7dffc8', .13); this.conTube = tube(con, '#ff7a8a', .1);
      const cg = chevronGeo(); const mk = (n, col) => { const im = new THREE.InstancedMesh(cg, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .95, side: THREE.DoubleSide, depthWrite: false }), n); im.frustumCulled = false; sc.add(im); return im; };
      this.fA = mk(150, '#3dffb0'); this.cA = mk(90, '#ff4a6a'); this.fArr = []; this.cArr = [];
      for (let i = 0; i < 150; i++) this.fArr.push({ z: 20 - i * (L + 50) / 150, a: rnd(0, 6.28), r: rnd(0, FR * .7), s: rnd(.5, .8) });
      for (let i = 0; i < 90; i++) this.cArr.push({ z: 20 - i * (L + 50) / 90, a: rnd(0, 6.28), r: rnd(0, FR * .7), s: rnd(.5, .75) });
      // partículas brillantes de viento (estelas)
      const sg = new THREE.BoxGeometry(.08, .08, 2.6); this.fP = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .85 }), 160); this.fP.frustumCulled = false; sc.add(this.fP);
      this.fPa = []; for (let i = 0; i < 160; i++) this.fPa.push({ z: rnd(-L - 20, 20), a: rnd(0, 6.28), r: rnd(.3, FR), sp: rnd(1, 1.6) });
      // rachas sueltas por todo el cielo (líneas blancas que cruzan)
      this.gP = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, .05, 4), new THREE.MeshBasicMaterial({ color: '#f0e8ff', transparent: true, opacity: .45 }), 90); this.gP.frustumCulled = false; sc.add(this.gP);
      this.gPa = []; for (let i = 0; i < 90; i++) this.gPa.push({ x: rnd(-30, 30), y: rnd(2, 32), z: rnd(-L - 20, 20), sp: rnd(8, 16) });
      // ---- paisaje onírico (todo fuera del pasillo de vuelo |x| > 17)
      this.deco = new THREE.Group(); sc.add(this.deco); this.clouds = []; this.isl = []; this.rbs = [];
      for (let z = 20; z > -L - 60; z -= 9) for (const sd of [-1, 1]) { const c = cloudPuff(this.deco, sd * rnd(18, 45), rnd(-2, 34), z + rnd(-4, 4), rnd(1.2, 2.8), pick(['#ffffff', '#ffe8f6', '#efe4ff', '#e4f2ff'])); c.userData.sp = rnd(.3, 1) * sd; c.userData.x0 = c.position.x; this.clouds.push(c); }
      for (let i = 0; i < 9; i++) cloudPuff(this.deco, rnd(-9, 9), -1.5, 10 - i * 38, rnd(2.2, 3.2), '#fff4fc'); // mar de algodón bajo el pasillo (por debajo de YMIN)
      for (let z = -10; z > -L - 40; z -= 26) { const sd = Math.random() < .5 ? -1 : 1; this.isl.push(island(this.deco, sd * rnd(20, 32), rnd(4, 22), z, rnd(1, 1.7))); }
      for (let k = 0; k < 4; k++) this.rbs.push(rainbow(this.deco, (k % 2 ? 1 : -1) * 24, 0, -40 - k * 75, 14, (k % 2 ? -1 : 1) * .5));
      this.rbs.push(rainbow(this.deco, 0, 0, -L - 18, 22)); // arcoíris gigante tras la meta
      this.moon = prop('luna'); this.moon.scale.setScalar(7); this.moon.position.set(-38, 48, -L - 60); sc.add(this.moon);
      // estrellas titilantes
      { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-90, 90); pos[i * 3 + 1] = rnd(18, 90); pos[i * 3 + 2] = rnd(-L - 120, 40); }
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.stars = new THREE.Points(gg, new THREE.PointsMaterial({ color: '#fff8c8', size: .8, transparent: true, opacity: .9, depthWrite: false })); sc.add(this.stars); }
      this.sstars = []; for (let i = 0; i < 18; i++) { const s = glowSprite(pick(['#fff4a8', '#ffc8f0', '#c8f0ff']), rnd(1.4, 2.6), .9); s.position.set(rnd(-40, 40), rnd(20, 45), rnd(-L, 10)); sc.add(s); this.sstars.push(s); }
      // ---- ovejas dormilonas (obstáculos suaves) fuera de la corriente verde la mayoría del tiempo
      this.sheep = []; for (let z = -30; z > -L + 15; z -= rnd(16, 24)) { const f = fav(z); let x, y, k = 0; do { x = rnd(-XW + 1, XW - 1); y = rnd(YMIN + 2, YMAX - 2); k++; } while (Math.hypot(x - f.x, y - f.y) < FR + 1.2 && k < 20);
        const m = prop(pick(['oveja', 'oveja', 'almohada'])); m.scale.setScalar(1.2); sc.add(m); this.sheep.push({ m, x, y0: y, y, z, ph: rnd(0, 6), amp: rnd(.6, 1.4), R: 1.6 }); }
      // ---- globos
      racers(E, .45); const start = [[-5, 4], [-2, 7], [1, 4], [4, 7], [-6, 9.5], [6, 4]];
      E.racers.forEach((r, k) => { const s = start[k % 6]; r.x = s[0]; r.y = s[1]; r.z = 0; r.vx = 0; r.vy = 0; r.v = BASEV; r.stun = 0; r.zone = 0;
        const b = new THREE.Group(); r.obj.add(b);
        const bal = mesh(SPH(), T(r.ch.color, { rim: .6 }), b, [0, 3.4, 0], null, [1.5, 1.7, 1.5]); outline(bal, '#3a2050', 1.04);
        for (let i = 0; i < 4; i++) mesh(SPH(), T('#ffffff', { rim: .4 }), b, [0, 3.4, 0], [0, i * .785, 0], [1.52, 1.72, .25]);
        mesh(new THREE.TorusGeometry(1.05, .12, 6, 20), T('#ffe27a'), b, [0, 2.1, 0], [Math.PI / 2, 0, 0]);
        mesh(CYL(), T('#c8904a'), b, [0, .3, 0], null, [.75, .6, .75]); for (const [x, z] of [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]]) mesh(CYL(), T('#8a5a3a'), b, [x * .9, 1.3, z * .9], null, [.03, 1.6, .03]);
        r.flame = glowSprite('#ffb030', 1.6, 0); r.flame.position.y = 1.8; b.add(r.flame); r.obj.userData.pivot.position.y = .3; r.bal = b;
        if (r.me) { const ring = glowSprite('#ffe27a', 5.5, .35); ring.position.y = 3.4; b.add(ring); r.halo = ring; } });
      this.hud(E); this.ctl(E);
      window.__globo = { ph: 'count' };
    },
    // ---------- interfaz propia: objetivo, aviso de viento, guía, progreso, tutorial ----------
    hud(E) { const h = $('hud'); const mkEl = (id, css) => { let e = $(id); if (!e) { e = document.createElement('div'); e.id = id; h.appendChild(e); } e.style.cssText = css; e.style.display = 'block'; return e; };
      this.gGoal = mkEl('gbGoal', 'position:absolute;left:50%;transform:translateX(-50%);top:calc(84px + env(safe-area-inset-top));background:rgba(90,50,170,.78);color:#fff;font:700 14px Fredoka;padding:5px 12px;border-radius:14px;border:2px solid #fff;text-align:center;pointer-events:none;z-index:12;white-space:nowrap');
      this.gGoal.innerHTML = '🏁 Llega a la <b style="color:#ffe27a">META</b> · métete en la corriente <b style="color:#7dffb0">VERDE 💨</b>';
      this.gWind = mkEl('gbWind', 'position:absolute;left:50%;transform:translateX(-50%);top:calc(120px + env(safe-area-inset-top));font:800 22px Fredoka;color:#fff;padding:6px 18px;border-radius:20px;border:3px solid #fff;pointer-events:none;z-index:12;white-space:nowrap;transition:background .2s,transform .2s;text-shadow:0 2px 0 rgba(0,0,0,.25)');
      this.gGuide = mkEl('gbGuide', 'position:absolute;left:50%;transform:translateX(-50%);top:calc(166px + env(safe-area-inset-top));font:700 15px Fredoka;color:#fff;background:rgba(0,0,0,.3);padding:3px 12px;border-radius:12px;pointer-events:none;z-index:12;white-space:nowrap');
      this.gProg = mkEl('gbProg', 'position:absolute;right:calc(10px + env(safe-area-inset-right));top:calc(84px + env(safe-area-inset-top));width:34px;height:42vh;border-radius:17px;background:linear-gradient(#ffe27a 0 6%,rgba(255,255,255,.35) 6%);border:3px solid #fff;pointer-events:none;z-index:12');
      this.gProg.innerHTML = '<div style="position:absolute;top:-24px;left:0;right:0;text-align:center;font-size:18px">🏁</div>' + E.racers.map(r => `<div data-id="${r.id}" style="position:absolute;left:50%;width:${r.me ? 26 : 16}px;height:${r.me ? 26 : 16}px;margin-left:-${r.me ? 13 : 8}px;border-radius:50%;background:${r.ch.color};border:${r.me ? 3 : 2}px solid ${r.me ? '#ffe27a' : '#fff'};box-shadow:0 2px 6px rgba(0,0,0,.3);z-index:${r.me ? 2 : 1};font:800 11px Fredoka;color:#fff;text-align:center;line-height:20px">${r.me ? 'TÚ' : ''}</div>`).join('');
      this.gTut = mkEl('gbTut', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(40,20,90,.45);z-index:40;pointer-events:none;font-family:Fredoka,system-ui');
      this.gTut.style.display = 'flex';
      this.gTut.innerHTML = '<div id="gbCard" style="background:#fff8ff;color:#5a2b8a;border-radius:24px;padding:14px 18px;max-width:340px;text-align:center;border:4px solid #8a6aff;box-shadow:0 10px 30px rgba(0,0,0,.35)"><div style="font:800 21px Fredoka;margin-bottom:6px">🎈 ¿Cómo se juega?</div><div style="font:600 15px Fredoka;line-height:1.45;text-align:left">🏁 Llega a la <b>META</b> antes que nadie.<br>🕹️ <b>⬅ ➡</b> mueven el globo a los lados; <b>⬆ ⬇</b> lo suben y bajan.<br>💨 Métete en la corriente <b style="color:#14b07a">VERDE</b> (las flechas que vuelan hacia delante): ¡vas el triple de rápido!<br>🌬️ El viento <b style="color:#e0405a">ROJO</b> va en contra: ¡sal de ahí!</div><div id="gbDemo" style="margin-top:8px;font:800 17px Fredoka;color:#14b07a">👀 Mira: tu globo entra en la corriente…</div></div>';
      this.place(true); const hb = $('hBoard'); if (hb) { this._hb = hb.style.display; hb.style.display = 'none'; } },
    ctl(E) { const h = $('hud'); let c = $('gbCtl'); if (!c) { c = document.createElement('div'); c.id = 'gbCtl'; h.appendChild(c); }
      c.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:30'; c.style.display = 'block';
      const B = 'position:absolute;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;width:84px;height:84px;border-radius:50%;border:4px solid rgba(255,255,255,.95);background:rgba(140,100,255,.45);font:800 36px Fredoka;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 0 rgba(90,50,150,.35),0 8px 18px rgba(60,20,120,.3)';
      c.innerHTML = ['L⬅', 'R➡', 'U⬆', 'D⬇'].map(s => `<div id="gb${s[0]}" data-k="${s[0]}" style="${B}">${s.slice(1)}</div>`).join('');
      this.keys = {}; for (const el of c.children) { const k = el.dataset.k;
        el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Audio.init && Audio.init(); this.keys[k] = (this.keys[k] || 0) + 1; el._p = (el._p || new Set()).add(e.pointerId); el.style.transform = 'scale(.9)'; el.style.background = 'rgba(125,255,200,.6)'; try { el.setPointerCapture(e.pointerId); } catch (_) {} });
        const up = e => { if (!el._p || !el._p.has(e.pointerId)) return; el._p.delete(e.pointerId); this.keys[k] = el._p.size; el.style.transform = ''; el.style.background = 'rgba(140,100,255,.45)'; };
        for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, up); }
      this.placeCtl(true); },
    placeCtl(force) { const pr = port(); if (!force && this._cp === pr) return; this._cp = pr; const S = (id, o) => Object.assign($(id).style, o);
      const sb = 'calc(22px + env(safe-area-inset-bottom))', s2 = 'calc(116px + env(safe-area-inset-bottom))';
      // izquierda: ⬅ ➡ uno al lado del otro · derecha: ⬆ encima de ⬇
      S('gbL', { left: 'calc(14px + env(safe-area-inset-left))', bottom: sb, top: '' }); S('gbR', { left: 'calc(108px + env(safe-area-inset-left))', bottom: sb, top: '' });
      S('gbU', { right: 'calc(14px + env(safe-area-inset-right))', bottom: s2, top: '' }); S('gbD', { right: 'calc(14px + env(safe-area-inset-right))', bottom: sb, top: '' }); },
    place(force) { const pr = port(); if (!force && this._pp === pr) return; this._pp = pr; const S = (e, o) => Object.assign(e.style, o);
      S(this.gGoal, { fontSize: pr ? '13px' : '14px', top: pr ? 'calc(112px + env(safe-area-inset-top))' : 'calc(96px + env(safe-area-inset-top))' });
      S(this.gWind, { fontSize: pr ? '22px' : '19px', top: pr ? 'calc(146px + env(safe-area-inset-top))' : 'calc(128px + env(safe-area-inset-top))' });
      S(this.gGuide, { top: pr ? 'calc(194px + env(safe-area-inset-top))' : 'calc(170px + env(safe-area-inset-top))' });
      // barra de progreso: a la derecha en vertical, a la izquierda en horizontal (lejos de los botones)
      S(this.gProg, pr ? { right: 'calc(10px + env(safe-area-inset-right))', left: '', top: 'calc(250px + env(safe-area-inset-top))', height: '38vh' } : { left: 'calc(16px + env(safe-area-inset-left))', right: '', top: 'calc(118px + env(safe-area-inset-top))', height: '40vh' });
      const cd = $('gbCard'); if (cd) { cd.style.transform = pr ? '' : 'scale(.82)'; } },
    input(E) { const K = window.__keys || {}, k = this.keys || {};
      let x = ((k.R ? 1 : 0) || (K.ArrowRight || K.KeyD ? 1 : 0)) - ((k.L ? 1 : 0) || (K.ArrowLeft || K.KeyA ? 1 : 0));
      let y = ((k.U ? 1 : 0) || (K.ArrowUp || K.KeyW || K.Space ? 1 : 0)) - ((k.D ? 1 : 0) || (K.ArrowDown || K.KeyS ? 1 : 0)); return { x, y }; },
    // fuerza del viento en un punto: +1 dentro de la verde, −1 dentro de la roja
    zone(x, y, z) { const f = fav(z), c = con(z); const df = Math.hypot(x - f.x, y + 2.2 - f.y), dc = Math.hypot(x - c.x, y + 2.2 - c.y);
      const a = clamp(1.25 - df / FR, 0, 1), b = clamp(1.25 - dc / FR, 0, 1); return { f: a, c: b, df, dc, tx: f.x, ty: f.y - 2.2 }; },
    steerAI(E, r, dt) { const s0 = sk(E, r); if ((r.rt = (r.rt || 0) - dt) <= 0) { r.rt = .45 + (1.1 - s0) * .9; const look = r.z - 6 - 8 * s0; const f = fav(look); const err = (1.25 - s0) * 5.5; r.tx = f.x + rnd(-1, 1) * err; r.ty = f.y - 2.2 + rnd(-1, 1) * err; }
      return { x: clamp((r.tx - r.x) * .6, -1, 1), y: clamp((r.ty - r.y) * .6, -1, 1) }; },
    move(E, r, u, dt) { if (r.stun > 0) { r.stun -= dt; u = { x: 0, y: 0 }; if (r.stun <= 0) r.expr = ''; }
      const kk = r.me ? 8 : 3; r.vx = lerp(r.vx, u.x * 7.5, Math.min(1, dt * kk)); r.vy = lerp(r.vy, u.y * 6.5, Math.min(1, dt * kk)); r.heat = u.y > .2; r.ux = u.x;
      r.x = clamp(r.x + r.vx * dt, -XW, XW); r.y = clamp(r.y + r.vy * dt, YMIN, YMAX);
      const zn = this.zone(r.x, r.y, r.z); const tv = (BASEV + (FAVV - BASEV) * zn.f - (BASEV - CONV) * zn.c) * (r.stun > 0 ? .5 : 1); r.v = lerp(r.v, tv, Math.min(1, dt * 1.8)); r.z -= r.v * dt; r.zn = zn;
      r.zone = zn.f > .35 ? 1 : zn.c > .35 ? -1 : 0; },
    idle(E, dt) { // demo durante la cuenta atrás: tu globo se mete solo en la corriente verde
      this.place(); this.placeCtl(); const me = E.me; this.dm = (this.dm || 0) + dt;
      for (const r of E.racers) { const u = r.me ? { x: clamp((fav(r.z - 4).x - r.x) * .5, -1, 1), y: clamp((fav(r.z - 4).y - 2.2 - r.y) * .5, -1, 1) } : { x: 0, y: 0 }; r.vx = lerp(r.vx, u.x * 7, Math.min(1, dt * 4)); r.vy = lerp(r.vy, u.y * 6, Math.min(1, dt * 4)); r.x = clamp(r.x + r.vx * dt, -XW, XW); r.y = clamp(r.y + r.vy * dt, YMIN, YMAX); r.heat = u.y > .2; r.ux = u.x; }
      this.sepAll(E); const zn = this.zone(me.x, me.y, me.z), el = $('gbDemo');
      const hl = ['gbL', 'gbR', 'gbU', 'gbD']; hl.forEach(id => { const e = $(id); if (e) e.style.boxShadow = '0 6px 0 rgba(90,50,150,.35)'; });
      const act = Math.abs(me.vx) > .6 ? (me.vx > 0 ? 'gbR' : 'gbL') : Math.abs(me.vy) > .6 ? (me.vy > 0 ? 'gbU' : 'gbD') : null; if (act && $(act)) $(act).style.boxShadow = '0 0 0 6px #7dffb0,0 0 24px #7dffb0';
      if (el) el.textContent = zn.f > .35 ? '💨 ¡Dentro! Así vas el triple de rápido' : `👀 Mira: tu globo va hacia la corriente ${act === 'gbL' ? '⬅' : act === 'gbR' ? '➡' : act === 'gbU' ? '⬆' : act === 'gbD' ? '⬇' : ''}`;
      this.feedback(E); window.__globo = { ph: 'count', x: me.x, y: me.y, z: me.z, zone: me.zone }; },
    sepAll(E) { const R = E.racers; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j]; const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz), m = 3.3;
      if (d < m && d > 1e-4) { const k = (m - d) / d * .5; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; if (Math.abs(dz) > .5) { a.z -= dz * k * .3; b.z += dz * k * .3; } }
      else if (d <= 1e-4) { a.x -= .5; b.x += .5; } a.x = clamp(a.x, -XW, XW); b.x = clamp(b.x, -XW, XW); a.y = clamp(a.y, YMIN, YMAX); b.y = clamp(b.y, YMIN, YMAX); } },
    feedback(E) { const me = E.me, z = me.zn || this.zone(me.x, me.y, me.z), w = this.gWind;
      const st = me.fin ? 'fin' : me.stun > 0 ? 'boing' : me.zone > 0 ? 'fav' : me.zone < 0 ? 'con' : 'nada';
      if (w._s !== st) { w._s = st; const M = { fav: ['¡Corriente a favor! 💨', 'linear-gradient(#3dd89a,#14b07a)', 'scale(1.1)'], con: ['En contra 🌬️ ¡sal de ahí!', 'linear-gradient(#ff7a8a,#e0405a)', 'scale(1)'], nada: ['Busca la corriente verde 🔎', 'rgba(110,80,200,.75)', 'scale(1)'], boing: ['¡Boing! Oveja dormilona 🐑', 'rgba(255,170,80,.9)', 'scale(1.05)'], fin: ['¡Meta! 🏁', 'linear-gradient(#ffd36b,#ff9a3a)', 'scale(1.1)'] }[st];
        w.textContent = M[0]; w.style.background = M[1]; w.style.transform = 'translateX(-50%) ' + M[2];
        if (E.phase === 'run' && st === 'fav') { Audio.sfxPlay('shield'); E.burst(me.obj.position.clone().add(v3(0, 3, 0)), '#7dffb0', 18, 5, .6, .6); } if (E.phase === 'run' && st === 'con') Audio.sfxPlay('pop'); }
      // guía: hacia dónde está la corriente verde
      let gtxt = ''; if (st === 'fav') gtxt = `⚡ Velocidad ×${(me.v / BASEV).toFixed(1)}`; else { const dx = z.tx - me.x, dy = z.ty - me.y; const ax = Math.abs(dx) > 1.2 ? (dx > 0 ? '➡' : '⬅') : '', ay = Math.abs(dy) > 1.2 ? (dy > 0 ? '⬆' : '⬇') : ''; gtxt = `Corriente verde: ${ax}${ay || ''}${!ax && !ay ? '¡aquí!' : ''}`; }
      if (this.gGuide._t !== gtxt) { this.gGuide._t = gtxt; this.gGuide.textContent = gtxt; } },
    update(E, dt) {
      this.place(); this.placeCtl(); const t = E.t, me = E.me;
      if (!this.started) { this.started = true; ['gbL', 'gbR', 'gbU', 'gbD'].forEach(id => $(id).style.boxShadow = '0 6px 0 rgba(90,50,150,.35),0 8px 18px rgba(60,20,120,.3)'); }
      if (this.gTut.style.display !== 'none' && (E.t > 2.2 || (E.t > .4 && (E.taps.length || Object.values(this.keys).some(Boolean))))) this.gTut.style.display = 'none';
      for (const o of this.sheep) o.y = o.y0 + Math.sin(t * .8 + o.ph) * o.amp;
      for (const r of E.racers) {
        if (r.fin) { r.v = lerp(r.v, 3, dt); r.z -= r.v * dt; r.vy = 0; r.heat = false; continue; }
        const u = r.me && !E.AUTO ? this.input(E) : this.steerAI(E, r, dt); this.move(E, r, u, dt);
        // ovejas: choque suave, el globo rebota y nunca la atraviesa
        for (const o of this.sheep) { const dx = r.x - o.x, dy = r.y + 3 - o.y, dz = r.z - o.z, d = Math.hypot(dx, dy, dz), m = o.R + 1.6;
          if (d < m) { const k = (m - d) / Math.max(d, 1e-3); r.x += dx * k; r.y += dy * k; r.z += Math.max(0, dz * k); r.x = clamp(r.x, -XW, XW); r.y = clamp(r.y, YMIN, YMAX);
            if (r.stun <= 0) { r.stun = .7; r.v *= .4; r.expr = 'squash'; if (r.me) { hitFx(E, r, '#ffffff'); } } } }
        r.prog = clamp(-r.z / L, 0, 1); if (r.z <= -L) { r.prog = 1; E.finish(r); } }
      this.sepAll(E); this.feedback(E);
      // marcadores de progreso
      for (const el of this.gProg.children) { const id = el.dataset && el.dataset.id; if (id == null) continue; const r = E.racers.find(q => String(q.id) === id); if (r) el.style.top = `calc(${(1 - r.prog) * 94 + 6}% - ${r.me ? 13 : 8}px)`; }
      const pos = [...E.racers].sort((a, b) => (b.fin && a.fin ? a.time - b.time : b.prog - a.prog)).indexOf(me) + 1;
      window.__globo = { ph: 'run', x: me.x, y: me.y, z: me.z, prog: me.prog, zone: me.zone, v: me.v, pos, fin: !!me.fin, stun: me.stun };
    },
    render(E, dt) { const t = E.t, W = this.W; W.tick(dt, camera); const live = E.phase === 'run' || E.phase === 'count';
      for (const id of ['gbGoal', 'gbWind', 'gbGuide', 'gbProg', 'gbCtl']) { const e = $(id); if (e) e.style.display = live ? 'block' : 'none'; } if (!live && this.gTut) this.gTut.style.display = 'none';
      const ob = new THREE.Object3D(), cz = camera.position.z;
      // flechas: verdes vuelan hacia la meta, rojas vienen hacia ti
      this.fArr.forEach((a, i) => { a.z -= 16 * dt; if (a.z < -L - 30) a.z += L + 50; const f = fav(a.z), f2 = fav(a.z - 2); ob.position.set(f.x + Math.cos(a.a + t * .6) * a.r, f.y + Math.sin(a.a + t * .6) * a.r, a.z); ob.rotation.set(.75, Math.atan2(f.x - f2.x, 2), 0, 'YXZ'); ob.scale.setScalar(a.s * (1 + .15 * Math.sin(t * 6 + i))); ob.updateMatrix(); this.fA.setMatrixAt(i, ob.matrix); });
      this.cArr.forEach((a, i) => { a.z += 9 * dt; if (a.z > 20) a.z -= L + 50; const c = con(a.z); ob.position.set(c.x + Math.cos(a.a) * a.r, c.y + Math.sin(a.a) * a.r, a.z); ob.rotation.set(.75, Math.PI, 0, 'YXZ'); ob.scale.setScalar(a.s); ob.updateMatrix(); this.cA.setMatrixAt(i, ob.matrix); });
      this.fA.instanceMatrix.needsUpdate = this.cA.instanceMatrix.needsUpdate = true; this.fA.material.opacity = .8 + .2 * Math.sin(t * 5);
      ob.rotation.set(0, 0, 0); ob.scale.setScalar(1);
      this.fPa.forEach((p, i) => { p.z -= 26 * p.sp * dt; if (p.z < -L - 25) p.z += L + 45; const f = fav(p.z); ob.position.set(f.x + Math.cos(p.a + t) * p.r, f.y + Math.sin(p.a + t) * p.r, p.z); ob.updateMatrix(); this.fP.setMatrixAt(i, ob.matrix); }); this.fP.instanceMatrix.needsUpdate = true;
      this.gPa.forEach((p, i) => { p.z -= p.sp * dt; p.x += Math.sin(t + i) * dt; if (p.z < cz - 140) p.z = cz + 10; if (p.z > cz + 12) p.z = cz - 130; ob.position.set(p.x, p.y, p.z); ob.updateMatrix(); this.gP.setMatrixAt(i, ob.matrix); }); this.gP.instanceMatrix.needsUpdate = true;
      this.favTube.material.opacity = .11 + .05 * Math.sin(t * 3); this.conTube.material.opacity = .08 + .04 * Math.sin(t * 4 + 1);
      // paisaje vivo
      for (const c of this.clouds) { c.position.x = c.userData.x0 + Math.sin(t * .25 + c.userData.x0) * 3 * c.userData.sp; c.position.y += Math.sin(t * .7 + c.userData.x0) * .004; }
      this.isl.forEach((g, i) => { g.position.y += Math.sin(t * .8 + i) * .01; g.rotation.y = Math.sin(t * .2 + i) * .3; g.userData.tr.scale.y = 1.1 + Math.sin(t * 2 + i) * .06; });
      this.rbs.forEach((g, i) => g.children.forEach((m, j) => { if (m.material && m.material.opacity != null && j < 6) m.material.opacity = .65 + .2 * Math.sin(t * 1.5 + j * .5 + i); }));
      this.sstars.forEach((s, i) => { s.material.opacity = .5 + .5 * Math.abs(Math.sin(t * 2 + i)); }); this.stars.material.opacity = .7 + .25 * Math.sin(t * 1.7); this.moon.rotation.z = Math.sin(t * .4) * .1;
      for (const o of this.sheep) { o.m.position.set(o.x, o.y, o.z); o.m.rotation.y = Math.sin(t + o.ph) * .4; o.m.rotation.z = Math.sin(t * .9 + o.ph) * .12; }
      for (const r of E.racers) { r.obj.position.set(r.x, r.y, r.z); r.obj.rotation.y = Math.PI; r.flame.material.opacity = r.heat ? .95 : .25; r.bal.rotation.z = Math.sin(t * 1.2 + r.k) * .05 - (r.ux || 0) * .18; r.bal.rotation.x = r.zone > 0 ? -.12 : 0; if (r.halo) r.halo.material.opacity = .25 + .15 * Math.sin(t * 4); }
      // cámara cercana e inmersiva: detrás y un poco por encima de tu globo
      const me = E.me, pr = port(); const cp = v3(me.x * .75, me.y + (pr ? 4.6 : 3.6), me.z + (pr ? 11.5 : 9)), lk = v3(me.x * .85, me.y + 2.6, me.z - 10);
      E._cp = E._cp || cp.clone(); E._cl = E._cl || lk.clone(); E._cp.lerp(cp, Math.min(1, dt * 5)); E._cl.lerp(lk, Math.min(1, dt * 5));
      camera.fov = pr ? 68 : 56; camera.updateProjectionMatrix(); camera.position.copy(E._cp); camera.lookAt(E._cl);
    },
    dispose() { const hb = $('hBoard'); if (hb) hb.style.display = this._hb || ''; for (const id of ['perf', 'gbGoal', 'gbWind', 'gbGuide', 'gbProg', 'gbTut', 'gbCtl']) { const e = $(id); if (e) e.remove(); } },
  });
}
