'use strict';
/* Las 4 pruebas 2D de Mochi Rivals + el marco común (cuenta atrás, HUD, meta, resultados) */
(() => {
const { drawMochi, nameTag, input, rnd, clamp, lerp, pick, SFX, fxText, fxBurst, drawFX, hint, AUTO } = MR;
const X = MR.X();
const W = () => MR.W, H = () => MR.H;

// =============== PLANETAS ===============
const PAL = [['#ffb3d9', '#ff7fbf'], ['#a6f0d2', '#4fcfa4'], ['#c8b6ff', '#8f72e6'], ['#ffd59e', '#ffa64d'], ['#9fdcff', '#4fa8e8'], ['#fff09a', '#f2c73a']];
const planetas = {
  id: 'planetas', name: 'Saltos Planetarios', icon: '🪐', maxT: 70,
  desc: 'Salta de planeta en planeta hasta la Estrella Meta. Los planetas giran: toca justo cuando apuntes al siguiente.',
  how: 'Toca la pantalla para saltar en la dirección de la flecha.',
  init(E) {
    const N = 12, P = [];
    for (let i = 0; i < N; i++) {
      const last = i === N - 1;
      P.push({ x: i === 0 ? 0 : last ? 0 : (i % 2 ? 1 : -1) * rnd(55, 105), y: -i * rnd(175, 200), r: last ? 62 : rnd(32, 46), rot: rnd(0, 6), w: (i % 2 ? 1 : -1) * rnd(0.85, 1.25) * (1 + i * 0.05), pal: PAL[i % PAL.length], ring: Math.random() < .4, face: Math.random() < .7, last });
    }
    E.P = P; E.stars = Array.from({ length: 120 }, () => ({ x: rnd(-260, 260), y: rnd(-2600, 400), z: rnd(.2, 1), s: rnd(.6, 2.2) }));
    E.camY = 0;
    E.racers.forEach((r, k) => { r.idx = 0; r.ang = -Math.PI / 2 + (k - 2.5) * 0.35; r.fly = null; r.stun = 0; r.timer = rnd(0.8, 1.6); r.hop = null; });
  },
  pos(E, r) { const p = E.P[r.idx], a = p.rot + r.ang, d = p.r + 14; return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, a }; },
  update(E, dt) {
    for (const p of E.P) p.rot += p.w * dt;
    for (const r of E.racers) {
      if (r.fin) continue;
      if (r.me) {
        if (r.stun > 0) { r.stun -= dt; continue; }
        if (r.fly) {
          const f = r.fly; f.x += f.vx * dt; f.y += f.vy * dt; f.t += dt;
          for (let j = r.idx + 1; j < Math.min(E.P.length, r.idx + 3); j++) { const p = E.P[j]; const dx = f.x - p.x, dy = f.y - p.y; if (Math.hypot(dx, dy) < p.r + 16) { r.idx = j; r.ang = Math.atan2(dy, dx) - p.rot; r.fly = null; SFX.land(); fxBurst(f.x, f.y, p.pal[0], 12); if (j - 1 > f.from) fxText(f.x, f.y - 30, '¡Doble salto! ✨', '#8f72e6'); if (p.last) E.finish(r); break; } }
          if (r.fly && f.t > 0.9) { r.fly = null; r.stun = 0.45; fxText(f.x, f.y, '¡Uy! Al espacio…', '#7a5ce0'); SFX.boing(); r.ang = -Math.PI / 2 - E.P[r.idx].rot; }
        } else {
          let tap = E.taps.length > 0;
          if (AUTO) { const p = E.P[r.idx], q = E.P[r.idx + 1]; if (q) { const ps = this.pos(E, r); const want = Math.atan2(q.y - ps.y, q.x - ps.x); let d = ((ps.a - want) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; tap = Math.abs(d) < 0.09; } }
          if (tap) { const ps = this.pos(E, r); r.fly = { x: ps.x, y: ps.y, vx: Math.cos(ps.a) * 620, vy: Math.sin(ps.a) * 620, t: 0, from: r.idx }; SFX.jump(); }
        }
        r.prog = r.idx / (E.P.length - 1);
      } else {
        r.timer -= dt; if (r.hop) { r.hop.t += dt * 3; if (r.hop.t >= 1) r.hop = null; }
        if (r.timer <= 0) {
          r.timer = rnd(1.0, 2.0) * (1.25 - r.skill * 0.35);
          if (Math.random() < 0.58 + r.skill * 0.35) { r.hop = { from: r.idx, t: 0 }; r.idx++; r.ang = -Math.PI / 2 - E.P[r.idx].rot + rnd(-.8, .8); if (E.P[r.idx].last) E.finish(r); }
          else if (Math.random() < 0.3) E.say(r, pick(['¡Me he pasado de largo!', '¡Uy, uy, uy!', '¡Planeta traicionero!']));
        }
        r.prog = r.idx / (E.P.length - 1);
      }
    }
    const me = E.me, ps = me.fly ? me.fly : this.pos(E, me);
    E.camY = lerp(E.camY, ps.y, Math.min(1, dt * 3));
  },
  draw(E, dt) {
    const w = W(), h = H(), cx = w / 2, sy = y => y - E.camY + h * 0.62, sx = x => cx + x;
    const g = X.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b0f3d'); g.addColorStop(.6, '#3b2a7a'); g.addColorStop(1, '#7a4fb0'); X.fillStyle = g; X.fillRect(0, 0, w, h);
    // nebulosas
    for (let i = 0; i < 4; i++) { const ny = ((i * 700 - E.camY * 0.3) % 1400 + 1400) % 1400 - 300; const rg = X.createRadialGradient(cx + (i % 2 ? 120 : -120), ny, 10, cx + (i % 2 ? 120 : -120), ny, 260); rg.addColorStop(0, ['rgba(255,120,200,.35)', 'rgba(120,220,255,.3)', 'rgba(255,220,120,.25)', 'rgba(160,255,200,.25)'][i]); rg.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = rg; X.fillRect(0, 0, w, h); }
    for (const s of E.stars) { const y = ((s.y - E.camY * s.z) % 2400 + 2400) % 2400 - 300 + h * .3; X.fillStyle = `rgba(255,255,255,${.4 + .6 * Math.abs(Math.sin(performance.now() / 600 + s.x))})`; X.beginPath(); X.arc(cx + s.x * (w / 390), y, s.s, 0, 7); X.fill(); }
    // camino punteado entre planetas
    X.setLineDash([4, 10]); X.strokeStyle = 'rgba(255,255,255,.25)'; X.lineWidth = 2; X.beginPath(); E.P.forEach((p, i) => { i ? X.lineTo(sx(p.x), sy(p.y)) : X.moveTo(sx(p.x), sy(p.y)); }); X.stroke(); X.setLineDash([]);
    for (const p of E.P) {
      const x = sx(p.x), y = sy(p.y); if (y < -120 || y > h + 120) continue;
      const gl = X.createRadialGradient(x, y, p.r * .5, x, y, p.r * 1.9); gl.addColorStop(0, p.pal[0] + '88'); gl.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = gl; X.beginPath(); X.arc(x, y, p.r * 1.9, 0, 7); X.fill();
      if (p.ring) { X.strokeStyle = 'rgba(255,240,180,.7)'; X.lineWidth = 5; X.beginPath(); X.ellipse(x, y, p.r * 1.55, p.r * .38, -.35, Math.PI, 0); X.stroke(); }
      const pg = X.createRadialGradient(x - p.r * .35, y - p.r * .35, 2, x, y, p.r); pg.addColorStop(0, '#fff'); pg.addColorStop(.25, p.pal[0]); pg.addColorStop(1, p.pal[1]); X.fillStyle = pg; X.beginPath(); X.arc(x, y, p.r, 0, 7); X.fill();
      X.save(); X.beginPath(); X.arc(x, y, p.r, 0, 7); X.clip(); X.fillStyle = 'rgba(255,255,255,.25)';
      for (let k = 0; k < 4; k++) { const a = p.rot + k * 1.7; X.beginPath(); X.arc(x + Math.cos(a) * p.r * .55, y + Math.sin(a) * p.r * .55, p.r * (.12 + k * .03), 0, 7); X.fill(); }
      X.restore();
      if (p.ring) { X.strokeStyle = 'rgba(255,240,180,.9)'; X.lineWidth = 5; X.beginPath(); X.ellipse(x, y, p.r * 1.55, p.r * .38, -.35, 0, Math.PI); X.stroke(); }
      if (p.face || p.last) { X.fillStyle = '#4a2a4a'; X.beginPath(); X.arc(x - p.r * .3, y - p.r * .05, p.r * .07, 0, 7); X.arc(x + p.r * .3, y - p.r * .05, p.r * .07, 0, 7); X.fill(); X.strokeStyle = '#4a2a4a'; X.lineWidth = 2; X.beginPath(); X.arc(x, y + p.r * .05, p.r * .12, .3, Math.PI - .3); X.stroke(); X.fillStyle = 'rgba(255,100,150,.4)'; X.beginPath(); X.arc(x - p.r * .45, y + p.r * .12, p.r * .1, 0, 7); X.arc(x + p.r * .45, y + p.r * .12, p.r * .1, 0, 7); X.fill(); }
      if (p.last) { X.font = '700 16px Fredoka'; X.fillStyle = '#fff'; X.textAlign = 'center'; X.fillText('⭐ ESTRELLA META ⭐', x, y - p.r - 28); X.strokeStyle = '#fff'; X.lineWidth = 3; X.beginPath(); X.moveTo(x, y - p.r); X.lineTo(x, y - p.r - 18); X.stroke(); X.fillStyle = '#ff6fae'; X.fillRect(x, y - p.r - 18, 14, 9); }
    }
    for (const r of E.racers) {
      if (r.me) continue; const p = E.P[r.idx]; let x, y, a = p.rot + r.ang;
      x = p.x + Math.cos(a) * (p.r + 12); y = p.y + Math.sin(a) * (p.r + 12);
      if (r.hop) { const q = E.P[r.hop.from]; const k = r.hop.t; x = lerp(q.x, x, k); y = lerp(q.y, y, k) - Math.sin(k * Math.PI) * 40; a = -Math.PI / 2; }
      drawMochi(X, sx(x), sy(y), 13, { ch: r.ch, rot: a + Math.PI / 2, alpha: .75, noShadow: true, seed: r.k });
      nameTag(X, sx(x), sy(y) - 26, r.ch.name, r.ch.color);
    }
    const me = E.me;
    if (me.fly) { drawMochi(X, sx(me.fly.x), sy(me.fly.y), 17, { ch: me.ch, rot: Math.atan2(me.fly.vy, me.fly.vx) + Math.PI / 2, squish: -.12, noShadow: true }); X.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 1; i < 6; i++) { X.beginPath(); X.arc(sx(me.fly.x - me.fly.vx * i * .012), sy(me.fly.y - me.fly.vy * i * .012), 5 - i * .7, 0, 7); X.fill(); } }
    else { const ps = this.pos(E, me); const x = sx(ps.x), y = sy(ps.y);
      X.setLineDash([6, 8]); X.strokeStyle = 'rgba(255,255,255,.85)'; X.lineWidth = 3; X.beginPath(); X.moveTo(x, y); X.lineTo(x + Math.cos(ps.a) * 130, y + Math.sin(ps.a) * 130); X.stroke(); X.setLineDash([]);
      X.fillStyle = '#fff'; X.save(); X.translate(x + Math.cos(ps.a) * 140, y + Math.sin(ps.a) * 140); X.rotate(ps.a); X.beginPath(); X.moveTo(10, 0); X.lineTo(-6, -7); X.lineTo(-6, 7); X.fill(); X.restore();
      drawMochi(X, x, y, 17, { ch: me.ch, rot: ps.a + Math.PI / 2, noShadow: true, mood: me.stun > 0 ? 'ouch' : 'ok' }); }
    drawFX(dt, -cx, E.camY - h * 0.62);
  }
};

// =============== VALLAS SERPIENTE ===============
const vallas = {
  id: 'vallas', name: 'Vallas Serpiente', icon: '🐍', maxT: 70,
  desc: 'Atletismo… pero las vallas son serpientes que ondulan. Salta cuando estén bajitas y no te dejes morder el culete.',
  how: 'Toca para saltar. Salta cerca de la serpiente para un ¡Perfecto! con acelerón.',
  init(E) {
    E.L = 300; E.S = []; for (let x = 22; x < E.L - 12; x += rnd(19, 25)) E.S.push(x);
    E.racers.forEach((r, k) => { r.lane = r.me ? 0 : k + (k >= E.racers.indexOf(E.me) ? 0 : 1); r.x = 0; r.y = 0; r.vy = 0; r.v = 0; r.stun = 0; r.boost = 0; r.next = 0; r.plan = null; });
    let l = 1; E.racers.forEach(r => { if (!r.me) r.lane = l++; });
    E.camX = 0;
  },
  sh(E, k, lane, t) { return 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(2.1 * t + k * 1.9 + lane * 1.1)); },
  update(E, dt) {
    const t = E.t;
    for (const r of E.racers) {
      if (r.fin) continue;
      const vmax = (r.me ? 10 : 9.7 + r.skill * 0.9) + (r.boost > 0 ? 2 : 0);
      if (r.stun > 0) r.stun -= dt; else r.v = Math.min(vmax, r.v + 7 * dt);
      r.boost -= dt;
      const ground = r.y <= 0 && r.vy <= 0;
      const nk = E.S.findIndex(s => s > r.x - 0.3), ns = E.S[nk];
      let jump = false;
      if (r.me) { jump = E.taps.length > 0; if (AUTO && ns != null) { const d = ns - r.x; jump = d > 1.9 && d < 2.5; } }
      else if (ns != null && ground && r.stun <= 0) {
        if (r.plan == null || r.plan.k !== nk) r.plan = { k: nk, d: Math.random() < 0.62 + r.skill * 0.33 ? rnd(1.8, 2.6) : pick([0.4, 4.6]) };
        const d = ns - r.x; if (d < r.plan.d && !r.plan.done) { jump = true; r.plan.done = true; }
      }
      if (jump && ground && r.stun <= 0) { r.vy = 5.4; r.jx = r.x; if (r.me) SFX.jump(); if (ns != null && ns - r.x > 1.6 && ns - r.x < 2.8) r.pk = nk; else r.pk = -1; }
      r.vy -= 14 * dt; r.y = Math.max(0, r.y + r.vy * dt);
      const ox = r.x; r.x += r.v * dt;
      for (let k = 0; k < E.S.length; k++) { const s = E.S[k]; if (ox < s && r.x >= s) {
        const hh = this.sh(E, k, r.lane, t);
        if (r.y < hh) { r.v = 2.2; r.stun = 0.55; r.y = 0; r.vy = 0; if (r.me) { SFX.boing(); fxText(0, 0, '¡Ñam! ¡Mordisco! 🐍', '#ff4f6a'); E.shake = .3; } else if (Math.random() < .4) E.say(r, pick(['¡Ay, mi culete!', '¡Serpiente maleducada!', '¡Eso no vale!'])); }
        else if (r.pk === k) { r.boost = 1.0; if (r.me) { SFX.perfect(); fxText(0, 0, '¡Perfecto! ⚡', '#8f72e6'); } }
      } }
      r.prog = clamp(r.x / E.L, 0, 1); if (r.x >= E.L) E.finish(r);
    }
    E.camX = E.me.x;
  },
  draw(E, dt) {
    const w = W(), h = H(), t = E.t, ppm = w / 12;
    const sk = X.createLinearGradient(0, 0, 0, h * .5); sk.addColorStop(0, '#ffc2e2'); sk.addColorStop(1, '#ffe9c9'); X.fillStyle = sk; X.fillRect(0, 0, w, h);
    // sol-donut y nubes
    X.fillStyle = '#ffb36b'; X.beginPath(); X.arc(w * .78, h * .14, 46, 0, 7); X.fill(); X.fillStyle = '#ff7fbf'; X.beginPath(); X.arc(w * .78, h * .14, 40, 0, 7); X.fill(); X.fillStyle = '#ffc2e2'; X.beginPath(); X.arc(w * .78, h * .14, 15, 0, 7); X.fill();
    for (let i = 0; i < 6; i++) { const x = ((i * 170 - E.camX * 6) % (w + 200) + w + 200) % (w + 200) - 100; X.fillStyle = 'rgba(255,255,255,.85)'; X.beginPath(); X.arc(x, h * (.08 + (i % 3) * .05), 24, 0, 7); X.arc(x + 26, h * (.08 + (i % 3) * .05) + 6, 18, 0, 7); X.arc(x - 24, h * (.08 + (i % 3) * .05) + 8, 16, 0, 7); X.fill(); }
    // grada con público gelatina
    const gy = h * .26; X.fillStyle = '#b9a2f7'; X.fillRect(0, gy, w, h * .1);
    for (let i = -1; i < w / 22 + 2; i++) { const wx = i * 22 - ((E.camX * ppm * .5) % 22); const col = ['#ff9cc8', '#7ee3c4', '#ffd98a', '#9fc3ff', '#ff8fd8'][(i + 100 + Math.floor(E.camX * ppm * .5 / 22)) % 5]; const jy = Math.abs(Math.sin(t * 6 + i)) * 5; X.fillStyle = col; X.beginPath(); X.ellipse(wx, gy + 18 - jy, 9, 8, 0, 0, 7); X.fill(); X.fillStyle = '#4a2a4a'; X.fillRect(wx - 4, gy + 15 - jy, 2, 2); X.fillRect(wx + 2, gy + 15 - jy, 2, 2); }
    X.fillStyle = '#8f72e6'; X.fillRect(0, gy + 34, w, h * .1 - 34);
    // pista
    const lanes = E.racers.length, base = h * .86, rowH = (h * .86 - h * .4) / lanes;
    for (let l = lanes - 1; l >= 0; l--) {
      const y = base - l * rowH, s = 1 - l * .08;
      X.fillStyle = l % 2 ? '#ff9a7a' : '#ff8a6a'; X.fillRect(0, y - rowH * .9, w, rowH); X.fillStyle = '#fff'; X.fillRect(0, y + rowH * .1 - 2, w, 2);
      const r = E.racers.find(q => q.lane === l);
      const sx = x => w * .55 + (x - E.camX) * ppm * s;
      // líneas de distancia y meta
      for (let m = Math.floor(E.camX - 4); m < E.camX + 10; m++) { if (m % 10 === 0 && m > 0) { X.fillStyle = 'rgba(255,255,255,.35)'; X.fillRect(sx(m), y - rowH * .9, 2, rowH); } }
      if (sx(E.L) < w + 40) { for (let j = 0; j < 6; j++) { X.fillStyle = j % 2 ? '#fff' : '#4a2a4a'; X.fillRect(sx(E.L), y - rowH * .9 + j * rowH / 6, 8, rowH / 6); } }
      // serpientes
      E.S.forEach((s0, k) => { const x0 = sx(s0); if (x0 < -60 || x0 > w + 60) return; const hh = this.sh(E, k, l, t) * ppm * s; const cols = ['#7ee3c4', '#45c49f'];
        X.lineCap = 'round'; X.lineWidth = 9 * s; X.strokeStyle = cols[1]; X.beginPath(); X.moveTo(x0 - 16 * s, y); X.quadraticCurveTo(x0 - 30 * s, y + 4 * s, x0 - 40 * s + Math.sin(t * 6 + k) * 4, y - 2 * s); X.stroke();
        // cuerpo que se levanta (la parte que hay que saltar)
        X.lineWidth = 15 * s; X.strokeStyle = cols[0]; X.beginPath(); X.moveTo(x0 - 16 * s, y); X.quadraticCurveTo(x0, y - hh * 2, x0 + 16 * s, y); X.stroke();
        X.lineWidth = 4 * s; X.strokeStyle = '#ffe27a'; X.setLineDash([4 * s, 6 * s]); X.beginPath(); X.moveTo(x0 - 16 * s, y); X.quadraticCurveTo(x0, y - hh * 2, x0 + 16 * s, y); X.stroke(); X.setLineDash([]);
        const hx = x0 + 18 * s, hy = y - 4 * s; X.fillStyle = cols[0]; X.beginPath(); X.ellipse(hx, hy, 10 * s, 8 * s, 0, 0, 7); X.fill(); X.fillStyle = '#fff'; X.beginPath(); X.arc(hx + 2 * s, hy - 3 * s, 3 * s, 0, 7); X.fill(); X.fillStyle = '#222'; X.beginPath(); X.arc(hx + 3 * s, hy - 3 * s, 1.5 * s, 0, 7); X.fill();
        if (Math.sin(t * 8 + k) > .3) { X.strokeStyle = '#ff4f6a'; X.lineWidth = 2 * s; X.beginPath(); X.moveTo(hx + 9 * s, hy); X.lineTo(hx + 16 * s, hy - 2 * s); X.stroke(); }
        X.lineCap = 'butt'; });
      if (r) { const x = sx(r.x), yy = y - r.y * ppm * s - 16 * s; drawMochi(X, x, yy, 17 * s, { ch: r.ch, mood: r.stun > 0 ? 'ouch' : r.boost > 0 ? 'happy' : 'ok', squish: r.y > 0 ? -.08 : Math.abs(Math.sin(t * 14)) * .06, seed: l }); nameTag(X, x, yy - 30 * s, r.me ? 'Tú' : r.ch.name, r.ch.color, r.me); if (r.boost > 0) { X.fillStyle = 'rgba(255,230,120,.8)'; for (let i = 0; i < 3; i++) X.fillRect(x - 30 - i * 10, yy - 6 + i * 6, 18, 3); } }
    }
    drawFX(dt, -w * .55, -base + 70);
  }
};

// =============== CAÍDA AL CENTRO DE LA TIERRA ===============
const LAYERS = [
  { n: 'Raíces y gusanos', top: '#8a5a3a', bot: '#6b4430', ob: '#5a3a22', acc: '#7ec850' },
  { n: 'Fósiles', top: '#b08a5a', bot: '#8a6a44', ob: '#f3e6c8', acc: '#e8d3a8' },
  { n: 'Cuevas de cristal', top: '#3b2a6a', bot: '#2a1a50', ob: '#b9a2f7', acc: '#7ef0ff' },
  { n: 'Mar de magma', top: '#7a2a1a', bot: '#a8381a', ob: '#ff7a2a', acc: '#ffd23a' },
  { n: 'Núcleo de la Tierra', top: '#ffb23a', bot: '#fff0a0', ob: '#ffffff', acc: '#ff5aa0' },
];
const caida = {
  id: 'caida', name: 'Caída al Centro de la Tierra', icon: '🌋', maxT: 75,
  desc: 'Tírate por el agujero y llega el primero al núcleo. Atraviesa raíces, fósiles, cristales y magma.',
  how: 'Arrastra el dedo a izquierda y derecha. Coge las gotas de gelatina para acelerar.',
  init(E) {
    E.D = 13000; E.LH = E.D / LAYERS.length; E.O = []; E.B = [];
    for (let d = 500; d < E.D - 300; d += rnd(210, 290)) {
      const L = Math.min(LAYERS.length - 1, Math.floor(d / E.LH));
      if (Math.random() < .35) { const gap = rnd(-120, 120); E.O.push({ d, L, wall: true, gap, gw: 120 }); }
      else { const w = rnd(70, 150); E.O.push({ d, L, x: rnd(-150, 150), w, vx: L === 3 ? rnd(-60, 60) : 0 }); }
      if (Math.random() < .35) E.B.push({ d: d + 110, x: rnd(-150, 150), taken: new Set() });
    }
    E.layer = -1;
    E.racers.forEach((r, k) => { r.d = 0; r.x = (k - 2.5) * 50; r.tx = r.x; r.v = 0; r.stun = 0; r.boost = 0; r.dec = {}; });
    E.camD = 0;
  },
  hits(E, o, x, r = 16) { if (o.wall) return Math.abs(x - o.gap) > o.gw / 2 - r * .6; return Math.abs(x - o.x) < o.w / 2 + r * .6; },
  safeX(E, o) { if (o.wall) return o.gap; const l = o.x - o.w / 2 - 30, rr = o.x + o.w / 2 + 30; return (l < -170 ? rr : rr > 170 ? l : (Math.random() < .5 ? l : rr)); },
  update(E, dt) {
    for (const o of E.O) if (o.vx) { o.x += o.vx * dt; if (Math.abs(o.x) > 150) o.vx *= -1; }
    for (const r of E.racers) {
      if (r.fin) continue;
      const vmax = (r.me ? 420 : 405 + r.skill * 40) + (r.boost > 0 ? 220 : 0);
      if (r.stun > 0) r.stun -= dt; else r.v = Math.min(vmax, r.v + 320 * dt);
      r.boost -= dt;
      const ahead = E.O.find(o => o.d > r.d + 10 && o.d < r.d + 300);
      if (r.me) {
        if (AUTO) { if (ahead && this.hits(E, ahead, r.tx)) r.tx = this.safeX(E, ahead); const b = E.B.find(b => b.d > r.d && b.d < r.d + 250 && !b.taken.has(r.id)); if (b && (!ahead || !this.hits(E, ahead, b.x))) r.tx = b.x; }
        else if (input.down && input.px != null) r.tx = clamp((input.px - W() / 2) * (390 / W()), -170, 170);
        r.x = lerp(r.x, r.tx, Math.min(1, dt * 9));
      } else {
        if (ahead) { const key = E.O.indexOf(ahead); if (!(key in r.dec)) r.dec[key] = Math.random() < 0.72 + r.skill * 0.26 ? this.safeX(E, ahead) : r.tx; if (this.hits(E, ahead, r.tx) || r.dec[key] !== r.tx) r.tx = r.dec[key]; }
        const dx = r.tx - r.x; r.x += clamp(dx, -330 * dt, 330 * dt);
      }
      const od = r.d; r.d += r.v * dt;
      for (const o of E.O) if (od < o.d && r.d >= o.d && this.hits(E, o, r.x)) { r.v = 80; r.stun = .45; if (r.me) { SFX.boing(); fxText(r.x, o.d, pick(['¡Cataplof!', '¡Ay, una raíz!', '¡Boing!']), '#ff4f6a'); E.shake = .3; fxBurst(r.x, o.d, LAYERS[o.L].ob); } else if (Math.random() < .25) E.say(r, pick(['¡Mi cara!', '¡Eso estaba ahí antes!', '¡Puaj, tierra!'])); }
      for (const b of E.B) if (od < b.d && r.d >= b.d && Math.abs(r.x - b.x) < 34 && !b.taken.has(r.id)) { b.taken.add(r.id); r.boost = 1.6; if (r.me) { SFX.perfect(); fxText(r.x, b.d, '¡Gelatina turbo! 💧', '#2b9c7c'); } }
      r.prog = clamp(r.d / E.D, 0, 1); if (r.d >= E.D) E.finish(r);
    }
    E.camD = E.me.d;
    const L = Math.min(LAYERS.length - 1, Math.floor(E.me.d / E.LH)); if (L !== E.layer) { E.layer = L; E.banner = { s: (L + 1) + '/5 · ' + LAYERS[L].n, t: 0 }; }
  },
  draw(E, dt) {
    const w = W(), h = H(), k = w / 390, cx = w / 2, py = h * .3, sy = d => (d - E.camD) * k + py, sx = x => cx + x * k, t = E.t;
    const f = E.me.d / E.LH, L = Math.min(LAYERS.length - 1, Math.floor(f)), Ln = LAYERS[Math.min(LAYERS.length - 1, L + 1)];
    const g = X.createLinearGradient(0, 0, 0, h); g.addColorStop(0, LAYERS[L].top); g.addColorStop(1, (f % 1) > .7 ? Ln.top : LAYERS[L].bot); X.fillStyle = g; X.fillRect(0, 0, w, h);
    // decorado por capa (parallax)
    for (let i = 0; i < 26; i++) { const dd = i * 260 + 60; const y = ((dd - E.camD * .6) % 6760 + 6760) % 6760 - 300; if (y > h + 60) continue; const x = (i * 97 % 360 - 180) * k + cx; const LL = LAYERS[L];
      X.globalAlpha = .45;
      if (L === 0) { X.strokeStyle = LL.acc; X.lineWidth = 3; X.beginPath(); X.moveTo(x, y); X.bezierCurveTo(x + 30, y + 20, x - 20, y + 40, x + 10, y + 70); X.stroke(); X.fillStyle = '#ff9cc8'; X.beginPath(); X.ellipse(x + 40, y + 30, 12, 5, Math.sin(t * 3 + i), 0, 7); X.fill(); }
      if (L === 1) { X.strokeStyle = LL.acc; X.lineWidth = 3; X.beginPath(); for (let a = 0; a < 12; a += .3) X.lineTo(x + Math.cos(a) * a * 1.6, y + Math.sin(a) * a * 1.6); X.stroke(); }
      if (L === 2) { X.fillStyle = i % 2 ? '#7ef0ff' : '#ff9cf0'; X.beginPath(); X.moveTo(x, y); X.lineTo(x + 10, y + 30); X.lineTo(x, y + 44); X.lineTo(x - 10, y + 30); X.fill(); }
      if (L === 3) { X.fillStyle = LL.acc; X.beginPath(); X.arc(x, y + Math.sin(t * 2 + i) * 10, 8 + i % 5, 0, 7); X.fill(); }
      if (L === 4) { X.strokeStyle = '#fff'; X.lineWidth = 2; X.beginPath(); X.arc(x, y, 14 + (t * 30 + i * 9) % 30, 0, 7); X.stroke(); }
      X.globalAlpha = 1; }
    // paredes laterales
    X.fillStyle = 'rgba(0,0,0,.18)'; X.fillRect(0, 0, cx - 190 * k, h); X.fillRect(cx + 190 * k, 0, w, h);
    // meta: núcleo
    const yc = sy(E.D); if (yc < h + 300) { const rg = X.createRadialGradient(cx, yc + 120, 20, cx, yc + 120, 260); rg.addColorStop(0, '#fff'); rg.addColorStop(.4, '#ffe27a'); rg.addColorStop(1, 'rgba(255,120,60,0)'); X.fillStyle = rg; X.fillRect(0, yc - 140, w, 520); X.font = '700 20px Fredoka'; X.fillStyle = '#ff3d8a'; X.textAlign = 'center'; X.fillText('💛 NÚCLEO · META 💛', cx, yc - 10); }
    // obstáculos
    for (const o of E.O) { const y = sy(o.d); if (y < -40 || y > h + 40) continue; const LL = LAYERS[o.L]; X.fillStyle = LL.ob;
      const seg = (x0, x1) => { X.beginPath(); X.roundRect(sx(x0), y - 13 * k, (x1 - x0) * k, 26 * k, 13 * k); X.fill(); };
      if (o.wall) { seg(-195, o.gap - o.gw / 2); seg(o.gap + o.gw / 2, 195); } else seg(o.x - o.w / 2, o.x + o.w / 2);
      X.fillStyle = 'rgba(255,255,255,.35)'; X.fillRect(sx(o.wall ? -190 : o.x - o.w / 2 + 6), y - 9 * k, 18 * k, 4 * k);
      if (o.L === 2 && !o.wall) { X.fillStyle = '#7ef0ff'; for (let j = -1; j <= 1; j++) { X.beginPath(); X.moveTo(sx(o.x + j * o.w / 3) - 8, y - 12 * k); X.lineTo(sx(o.x + j * o.w / 3), y - 34 * k); X.lineTo(sx(o.x + j * o.w / 3) + 8, y - 12 * k); X.fill(); } }
      if (o.L === 1 && !o.wall) { X.fillStyle = '#4a3a2a'; X.beginPath(); X.arc(sx(o.x + o.w / 2) - 10 * k, y - 2, 3, 0, 7); X.fill(); }
      if (o.L === 0) { X.strokeStyle = LAYERS[0].acc; X.lineWidth = 3; X.beginPath(); X.moveTo(sx(o.wall ? o.gap - o.gw / 2 - 30 : o.x), y + 12 * k); X.quadraticCurveTo(sx(o.wall ? o.gap - o.gw / 2 - 40 : o.x - 10), y + 30 * k, sx(o.wall ? o.gap - o.gw / 2 - 25 : o.x + 6), y + 40 * k); X.stroke(); }
    }
    for (const b of E.B) { if (b.taken.has('me')) continue; const y = sy(b.d); if (y < -30 || y > h + 30) continue; const pulse = 1 + Math.sin(t * 8) * .1; X.fillStyle = '#7ee3c4'; X.beginPath(); X.ellipse(sx(b.x), y, 14 * pulse, 17 * pulse, 0, 0, 7); X.fill(); X.fillStyle = 'rgba(255,255,255,.7)'; X.beginPath(); X.arc(sx(b.x) - 4, y - 6, 4, 0, 7); X.fill(); }
    // corredores
    for (const r of E.racers) { const y = sy(r.d), x = sx(r.x);
      if (y < -20 || y > h + 20) { if (!r.me) { const yy = y < 0 ? 46 + 40 : h - 30; X.font = '700 12px Fredoka'; X.fillStyle = r.ch.color; X.textAlign = 'center'; X.fillText((y < 0 ? '▲ ' : '▼ ') + r.ch.name, clamp(x, 40, w - 40), yy); } continue; }
      if (r.boost > 0) { X.fillStyle = 'rgba(126,227,196,.6)'; X.beginPath(); X.ellipse(x, y - 26, 10, 22, 0, 0, 7); X.fill(); }
      X.strokeStyle = 'rgba(255,255,255,.5)'; X.lineWidth = 2; for (let i = -1; i <= 1; i++) { X.beginPath(); X.moveTo(x + i * 8, y - 22); X.lineTo(x + i * 8, y - 22 - r.v * .08); X.stroke(); }
      drawMochi(X, x, y, r.me ? 18 : 14, { ch: r.ch, rot: Math.PI + Math.sin(t * 4 + (r.k || 0)) * .2, alpha: r.me ? 1 : .8, noShadow: true, mood: r.stun > 0 ? 'ouch' : r.boost > 0 ? 'happy' : 'ok', squish: -.1 });
      nameTag(X, x, y + 28, r.me ? 'Tú' : r.ch.name, r.ch.color, r.me); }
    drawFX(dt, -cx + 0, (E.camD) - py);
    // banda de profundidad (barra lateral)
    X.fillStyle = 'rgba(255,255,255,.3)'; X.fillRect(w - 14, 80, 6, h - 140); LAYERS.forEach((Lr, i) => { X.fillStyle = Lr.ob; X.fillRect(w - 14, 80 + (h - 140) * i / 5, 6, (h - 140) / 5); });
    for (const r of E.racers) { X.fillStyle = r.ch.color; X.beginPath(); X.arc(w - 11, 80 + (h - 140) * r.prog, r.me ? 7 : 4.5, 0, 7); X.fill(); }
    if (E.banner) { E.banner.t += dt; const a = clamp(2.2 - E.banner.t, 0, 1); if (a > 0) { X.globalAlpha = a; X.font = '700 24px Fredoka'; X.textAlign = 'center'; X.lineWidth = 6; X.strokeStyle = 'rgba(60,20,60,.6)'; X.strokeText(E.banner.s, cx, h * .62); X.fillStyle = '#fff'; X.fillText(E.banner.s, cx, h * .62); X.globalAlpha = 1; } }
  }
};

// =============== NADO EN GELATINA (prueba inventada) ===============
const nado = {
  id: 'nado', name: 'Nado en Gelatina', icon: '🍮', maxT: 70,
  desc: 'Una piscina de gelatina de fresa con medusas de nata. Brazada izquierda, brazada derecha… ¡y buceo!',
  how: 'Toca izquierda y derecha alternando para nadar. Desliza hacia abajo para bucear bajo las medusas.',
  init(E) {
    E.L = 160; E.J = [];
    E.racers.forEach(() => {}); for (let x = 18; x < E.L - 8; x += rnd(14, 20)) E.J.push({ x, ph: rnd(0, 6) });
    let l = 1; E.racers.forEach(r => { r.lane = r.me ? 0 : l++; r.x = 0; r.v = 0; r.last = null; r.dive = 0; r.stun = 0; r.sr = 0; r.st = 0; r.dec = {}; });
  },
  up(E, j, lane, t) { return Math.sin(t * 1.7 + j.ph + lane * 1.3) > 0.25; }, // medusa en la superficie
  update(E, dt) {
    const t = E.t;
    for (const r of E.racers) {
      if (r.fin) continue;
      r.dive -= dt; if (r.stun > 0) r.stun -= dt;
      if (r.me) {
        let taps = E.taps.map(p => p.x < W() / 2 ? 'L' : 'R');
        if (AUTO) { taps = []; r.at = (r.at || 0) - dt; if (r.at <= 0) { r.at = 0.19; taps.push(r.last === 'L' ? 'R' : 'L'); } const j = E.J.find(j => j.x > r.x && j.x - r.x < 2.2); if (j && r.dive <= 0 && this.up(E, j, 0, t + (j.x - r.x) / Math.max(1, r.v))) E.swipe = true; }
        if (E.swipe && r.dive <= 0) { r.dive = 0.9; SFX.splash(); fxText(0, 0, '¡Al fondo! 🫧', '#2b9c7c'); }
        for (const s of taps) { if (r.stun > 0) continue; if (s !== r.last) { r.v = Math.min(8.6, r.v + 1.25); SFX.splash(); r.st = .25; r.side = s; } else { r.v *= .6; fxText(0, 0, '¡Chof! Alterna', '#ff4f6a'); } r.last = s; }
      } else {
        r.at = (r.at || 0) - dt; if (r.at <= 0 && r.stun <= 0) { r.at = 0.17 + (1 - r.skill) * 0.06 + rnd(0, .05); r.v = Math.min(8.6, r.v + 1.25); r.st = .25; r.side = r.side === 'L' ? 'R' : 'L'; }
        const ji = E.J.findIndex(j => j.x > r.x && j.x - r.x < 2); if (ji >= 0 && !(ji in r.dec)) { r.dec[ji] = Math.random() < .5 + r.skill * .45; } if (ji >= 0 && r.dec[ji] && r.dive <= 0 && this.up(E, E.J[ji], r.lane, t + .3)) r.dive = .9;
      }
      r.st -= dt; r.v -= r.v * 0.9 * dt;
      const ox = r.x; r.x += r.v * dt;
      for (const j of E.J) if (ox < j.x && r.x >= j.x && r.dive <= 0 && this.up(E, j, r.lane, t)) { r.v = 1.2; r.stun = .5; if (r.me) { SFX.boing(); fxText(0, 0, '¡Pica, pica! 🪼', '#ff4f6a'); E.shake = .25; } else if (Math.random() < .3) E.say(r, pick(['¡Medusa pegajosa!', '¡Me ha dado calambre!', '¡Uuuh, cosquillas!'])); }
      r.prog = clamp(r.x / E.L, 0, 1); if (r.x >= E.L) E.finish(r);
    }
    E.swipe = false;
  },
  draw(E, dt) {
    const w = W(), h = H(), t = E.t, ppm = w / 13, cam = E.me.x;
    const sk = X.createLinearGradient(0, 0, 0, h * .35); sk.addColorStop(0, '#bfe8ff'); sk.addColorStop(1, '#ffe3f1'); X.fillStyle = sk; X.fillRect(0, 0, w, h);
    // arcoíris y montañas de flan
    const rc = ['#ff9cc8', '#ffc38a', '#ffe27a', '#7ee3c4', '#8fd0ff', '#b9a2f7']; rc.forEach((c, i) => { X.strokeStyle = c; X.lineWidth = 8; X.beginPath(); X.arc(w * .5, h * .38, w * .55 - i * 8, Math.PI, 0); X.stroke(); });
    for (let i = 0; i < 5; i++) { const x = ((i * 200 - cam * 8) % (w + 300) + w + 300) % (w + 300) - 150; X.fillStyle = '#ffcf7a'; X.beginPath(); X.moveTo(x - 70, h * .36); X.lineTo(x - 45, h * .24); X.lineTo(x + 45, h * .24); X.lineTo(x + 70, h * .36); X.fill(); X.fillStyle = '#a85a2a'; X.fillRect(x - 45, h * .24, 90, 8); }
    const lanes = E.racers.length, top = h * .36, rowH = (h * .92 - top) / lanes;
    for (let l = lanes - 1; l >= 0; l--) {
      const y0 = top + (lanes - 1 - l) * rowH, s = 1 - l * .07, ymid = y0 + rowH * .5;
      const g = X.createLinearGradient(0, y0, 0, y0 + rowH); g.addColorStop(0, 'rgba(255,120,170,.75)'); g.addColorStop(1, 'rgba(230,70,130,.85)'); X.fillStyle = g; X.fillRect(0, y0, w, rowH);
      X.fillStyle = 'rgba(255,255,255,.3)'; X.beginPath(); X.moveTo(0, y0 + 4); for (let x = 0; x <= w; x += 12) X.lineTo(x, y0 + 4 + Math.sin(x * .05 + t * 3 + l) * 3); X.lineTo(w, y0 + 10); X.lineTo(0, y0 + 10); X.fill();
      for (let x = 0; x < w; x += 16) { X.fillStyle = (Math.floor((x + cam * ppm * s) / 16)) % 2 ? '#fff' : '#ffe27a'; X.beginPath(); X.arc(x - ((cam * ppm * s) % 16), y0 + rowH - 2, 4, 0, 7); X.fill(); }
      const sx = x => w * .55 + (x - cam) * ppm * s;
      if (sx(E.L) < w + 20) { X.fillStyle = '#fff'; X.fillRect(sx(E.L), y0, 6, rowH); }
      for (const j of E.J) { const x = sx(j.x); if (x < -40 || x > w + 40) continue; const up = this.up(E, j, l, t); const yy = up ? ymid - 4 : ymid + rowH * .3; X.globalAlpha = up ? .95 : .4;
        X.fillStyle = '#fff6fb'; X.beginPath(); X.arc(x, yy, 13 * s, Math.PI, 0); X.fill(); X.strokeStyle = '#fff6fb'; X.lineWidth = 2; for (let k = -2; k <= 2; k++) { X.beginPath(); X.moveTo(x + k * 5 * s, yy); X.quadraticCurveTo(x + k * 5 * s + Math.sin(t * 6 + k) * 4, yy + 10 * s, x + k * 5 * s, yy + 18 * s); X.stroke(); }
        X.fillStyle = '#4a2a4a'; X.fillRect(x - 5 * s, yy - 6 * s, 2, 2); X.fillRect(x + 3 * s, yy - 6 * s, 2, 2); X.globalAlpha = 1; }
      const r = E.racers.find(q => q.lane === l);
      if (r) { const x = sx(r.x), dive = r.dive > 0, yy = dive ? ymid + rowH * .25 : ymid - 2;
        if (!dive) { X.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 1; i < 4; i++) { X.beginPath(); X.arc(x - i * 14 * s, ymid + 6, 4 - i, 0, 7); X.fill(); } }
        drawMochi(X, x, yy, 16 * s, { ch: r.ch, rot: Math.PI / 2 * .55, alpha: dive ? .55 : 1, noShadow: true, mood: r.stun > 0 ? 'ouch' : 'ok', seed: l });
        if (r.st > 0 && !dive) { X.strokeStyle = r.ch.color; X.lineWidth = 5 * s; X.lineCap = 'round'; X.beginPath(); const sd = r.side === 'L' ? -1 : 1; X.arc(x, yy, 22 * s, -Math.PI / 2 + sd * .5, -Math.PI / 2 + sd * 1.6); X.stroke(); X.lineCap = 'butt'; }
        nameTag(X, x, yy - 30 * s, r.me ? 'Tú' : r.ch.name, r.ch.color, r.me); }
    }
    // botones de brazada
    if (E.phase === 'run') { X.globalAlpha = .55; X.fillStyle = '#fff'; X.font = '700 18px Fredoka'; X.textAlign = 'center'; X.fillText('⬅ Brazada', w * .25, h - 16); X.fillText('Brazada ➡', w * .75, h - 16); X.globalAlpha = 1; }
    drawFX(dt, -w * .55, -(h * .92 - rowH * .5) + 60);
  }
};

// =============== MARCO COMÚN ===============
function runEvent(def, racers, onEnd) {
  const E = { def, racers, t: 0, phase: 'count', cnt: 3.2, taps: [], swipe: false, fins: [], quotes: [], shake: 0 };
  E.me = racers.find(r => r.me);
  racers.forEach((r, k) => { r.k = k; r.prog = 0; r.fin = false; r.time = null; });
  E.finish = r => { if (r.fin) return; r.fin = true; r.time = E.t; E.fins.push(r); if (r.me) { SFX.perfect(); E.meDone = E.t; hint(`¡Meta! Llegas ${E.fins.length}º`, 2000); } };
  E.say = (r, s) => { if (E.quotes.length < 2) E.quotes.push({ r, s, t: 0 }); };
  def.init(E);
  hint(def.how, 4200);
  let last = performance.now(), stop = false;
  function end() {
    stop = true;
    const res = racers.map(r => ({ id: r.id, time: r.fin ? r.time : E.t + (1 - r.prog) * Math.max(4, E.t / Math.max(.15, r.prog)), fin: r.fin }));
    res.sort((a, b) => a.time - b.time); onEnd(res);
  }
  function frame(now) {
    if (stop) return;
    let dt = Math.min(.05, (now - last) / 1000) * MR.TS; last = now;
    E.taps = input.taps.splice(0); if (input.swipes.length) { input.swipes.length = 0; E.swipe = true; }
    if (E.phase === 'count') { const c0 = Math.ceil(E.cnt); E.cnt -= dt; if (Math.ceil(E.cnt) !== c0 && E.cnt > 0) SFX.tick(); if (E.cnt <= 0) { E.phase = 'run'; SFX.go(); } E.taps = []; E.swipe = false; }
    else if (E.phase === 'run') {
      // el marco resuelve varios subpasos para que la física sea estable
      const n = Math.ceil(dt / 0.02); for (let i = 0; i < n; i++) { def.update(E, dt / n); E.taps = []; E.swipe = false; E.t += dt / n; }
      if ((E.meDone != null && E.t - E.meDone > 2.2) || E.fins.length === racers.length || E.t > def.maxT) E.phase = 'end';
    } else { end(); return; }
    // dibujo
    const X0 = MR.X(); X0.setTransform(devicePixelRatio > 1 ? Math.min(2, devicePixelRatio) : 1, 0, 0, Math.min(2, devicePixelRatio || 1), 0, 0);
    if (E.shake > 0) { E.shake -= dt; X0.translate(rnd(-4, 4), rnd(-4, 4)); }
    def.draw(E, dt); hud(E, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return E;
}
function hud(E, dt) {
  const w = W(), h = H(), top = 8 + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0);
  X.fillStyle = 'rgba(255,255,255,.88)'; X.beginPath(); X.roundRect(54, top, w - 64, 52, 18); X.fill();
  X.fillStyle = '#7a4fb0'; X.font = '700 15px Fredoka'; X.textAlign = 'left'; X.textBaseline = 'middle'; X.fillText(E.def.icon + ' ' + E.def.name, 66, top + 15);
  const pos = 1 + E.racers.filter(r => r !== E.me && (r.fin && (!E.me.fin || r.time < E.me.time) || (!r.fin && !E.me.fin && r.prog > E.me.prog))).length;
  X.textAlign = 'right'; X.fillStyle = '#ff4f9a'; X.font = '700 20px Fredoka'; X.fillText(pos + 'º', w - 20, top + 16); X.font = '600 13px Fredoka'; X.fillStyle = '#9a72c8'; X.fillText(E.t.toFixed(1) + ' s', w - 52, top + 16);
  const x0 = 70, x1 = w - 26, yb = top + 38; X.fillStyle = '#f0dff2'; X.beginPath(); X.roundRect(x0, yb - 3, x1 - x0, 6, 3); X.fill(); X.fillStyle = '#ffd23a'; X.fillRect(x1 - 3, yb - 8, 4, 16);
  for (const r of [...E.racers].sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0))) drawMochi(X, lerp(x0, x1, r.prog), yb - 2, r.me ? 9 : 6.5, { ch: r.ch, noShadow: true, alpha: r.me ? 1 : .85 });
  // frases de los rivales
  E.quotes = E.quotes.filter(q => (q.t += dt) < 2.4);
  E.quotes.forEach((q, i) => { const y = top + 72 + i * 34; X.globalAlpha = Math.min(1, 2.4 - q.t); X.fillStyle = 'rgba(255,255,255,.92)'; X.font = '600 13px Fredoka'; const txt = q.r.ch.name + ': ' + q.s; const tw = X.measureText(txt).width + 40; X.beginPath(); X.roundRect(10, y, tw, 28, 14); X.fill(); drawMochi(X, 24, y + 15, 9, { ch: q.r.ch, noShadow: true }); X.fillStyle = '#6a3f9a'; X.textAlign = 'left'; X.fillText(txt, 38, y + 15); X.globalAlpha = 1; });
  if (E.phase === 'count') { const n = Math.ceil(E.cnt); X.font = '700 90px Fredoka'; X.textAlign = 'center'; X.lineWidth = 10; X.strokeStyle = '#fff'; X.strokeText(n > 0 ? n : '¡YA!', w / 2, h * .45); X.fillStyle = '#ff6fae'; X.fillText(n > 0 ? n : '¡YA!', w / 2, h * .45); }
  X.textBaseline = 'alphabetic';
}

window.PRUEBAS = { planetas, vallas, caida, nado, runEvent };
})();
