const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const D = '/workspace/mp-totems-seleccion-capturas/'; let ok = true;
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 try { for (const [w, h, o] of [[390, 844, 'v'], [844, 390, 'h']]) { const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/mochi-party/carrera/olimpiada.html?o=selva&e=totems&stay'); await p.waitForFunction(() => window.__olimp && window.__olimp.E.phase === 'run', null, { timeout: 90000 });
    await p.waitForTimeout(3000); await p.screenshot({ path: D + `totems-${o}-jugando.png` });
    // Escenario: todos caen con torres altas menos un rival, que queda el último en pie con la torre MÁS BAJA
    const lastId = await p.evaluate(() => { const { E } = window.__olimp; const hs = [12, 9, 7, 5, 4]; let i = 0; let last = null;
      E.racers.forEach(r => { if (!r.me && !last) { last = r; r.score = 1; r.err = 50; return; } r.score = hs[i++]; r.st = 'done'; if (r.cur) { E.scene.remove(r.cur.m); r.cur = null; } });
      last.tt = 0; window.__last = last; setInterval(() => { last.err = 50; }, 50); return last.id; });
    await p.waitForTimeout(2500); await p.screenshot({ path: D + `totems-${o}-cuenta-atras.png` });
    await p.waitForFunction(() => window.__olimp.E.fins.length === 6, null, { timeout: 30000 });
    const res = await p.evaluate(() => { const { E } = window.__olimp; return E.fins.map(r => ({ id: r.id, me: !!r.me, score: r.score, standing: r.st !== 'done', label: r.label })); });
    await p.waitForTimeout(1500); await p.screenshot({ path: D + `totems-${o}-final.png` });
    const max = Math.max(...res.map(r => r.score)), win = res[0], last = res.find(r => r.id === lastId);
    const pass = win.score === max && win.id !== lastId && last.score < max; ok = ok && pass && !errs.length;
    console.log(o, pass ? 'OK' : 'FALLO', 'ganador', win.id, win.score, '| último en pie', lastId, last.score, 'puesto', res.indexOf(last) + 1, '| errores', errs); console.log(JSON.stringify(res));
  } } finally { await b.close(); } process.exit(ok ? 0 : 1); })();
