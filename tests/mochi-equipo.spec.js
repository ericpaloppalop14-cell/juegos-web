let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require('/tmp/pw/node_modules/playwright-core')); }
const OUT = '/opt/cursor/artifacts/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
    p.on('pageerror', e => errs.push('PAGE ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text()); });
    await p.goto('http://127.0.0.1:8767/mochi/?v=37&lang=es', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__onl && window.__onl.team, null, { timeout: 20000 });
    const frame = () => p.evaluate(() => {
      const onc = document.querySelector('#onl .onc');
      const list = document.getElementById('onList');
      if (onc && list) onc.scrollTop += list.getBoundingClientRect().top - onc.getBoundingClientRect().top - 12;
    });
    await p.evaluate(() => window.__onl.team.demo(2));
    const sala = await p.evaluate(() => {
      const btn = document.getElementById('onTeam');
      const r = btn.getBoundingClientRect();
      return {
        text: btn.innerText, shown: r.width > 0 && r.height > 0 && getComputedStyle(btn).display !== 'none',
        names: [...document.querySelectorAll('#onList .onp')].map(n => n.textContent),
        chat: (document.getElementById('chQ1') || {}).textContent || '',
        share: (document.querySelector('#onShare .shTx') || {}).textContent || '',
        start: document.getElementById('onStart').style.display !== 'none'
      };
    });
    if (!sala.shown || !sala.text.includes('Buscar carrera pública en equipo') || !sala.text.includes('El grupo entra junto contra jugadores de todo el mundo')) throw new Error('botón de equipo no visible: ' + JSON.stringify(sala));
    if (!sala.names.some(n => n.includes('Ana')) || !sala.names.some(n => n.includes('Yo'))) throw new Error('faltan jugadores: ' + sala.names.join('|'));
    if (sala.chat !== '¡Buena carrera!') throw new Error('chat cambiado: ' + sala.chat);
    if (sala.share !== 'Compartir invitación') throw new Error('share cambiado: ' + sala.share);
    await frame();
    await p.screenshot({ path: OUT + 'mochi-equipo-sala.png' });
    const hidden = await p.evaluate(() => { window.__onl.team.demo(5); const b = document.getElementById('onTeam'); return getComputedStyle(b).display; });
    if (hidden !== 'none') throw new Error('con 5 jugadores el botón debería ocultarse, display=' + hidden);
    await p.evaluate(() => window.__onl.team.demo(4));
    const four = await p.evaluate(() => getComputedStyle(document.getElementById('onTeam')).display);
    if (four === 'none') throw new Error('con 4 jugadores el botón debería verse');
    await p.evaluate(() => window.__onl.team.demo(2));
    await p.click('#onTeam');
    await p.waitForFunction(() => {
      const t = document.getElementById('onTeam').innerText;
      return t.includes('Cancelar') && document.getElementById('onWait').textContent.includes('Buscando');
    });
    await p.waitForTimeout(900);
    const seeking = await p.evaluate(() => ({
      open: window.__onl.team.open,
      text: document.getElementById('onTeam').innerText,
      wait: document.getElementById('onWait').textContent,
      players: window.__onl.team.players(),
      slots: document.querySelectorAll('#onList .slot').length,
      start: document.getElementById('onStart').style.display
    }));
    if (!seeking.open) throw new Error('no está buscando');
    if (!seeking.players.some(p => p.name === 'Ana' && p.team) || !seeking.players.some(p => p.name === 'Yo' && p.team)) throw new Error('el grupo se marcó mal ' + JSON.stringify(seeking.players));
    if (seeking.start !== 'none') throw new Error('empezar debería ocultarse mientras busca');
    await frame();
    await p.screenshot({ path: OUT + 'mochi-equipo-buscando.png' });
    await p.click('#onTeam');
    await p.waitForFunction(() => !window.__onl.team.open && document.getElementById('onTeam').innerText.includes('Buscar carrera pública en equipo'));
    const back = await p.evaluate(() => window.__onl.team.players());
    if (back.some(p => p.bot || p.pub) || back.length !== 2 || !back.every(p => p.name === 'Yo' || p.name === 'Ana')) throw new Error('al cancelar el grupo no volvió limpio ' + JSON.stringify(back));
    await p.click('#onTeam');
    await p.waitForFunction(() => window.__onl.O.active === true, null, { timeout: 12000 });
    const racing = await p.evaluate(() => ({ active: window.__onl.O.active, mode: window.__onl.O.mode, teamRace: window.__onl.O.teamRace, players: window.__onl.team.players() }));
    const team = racing.players.filter(p => p.team).map(p => p.name).sort();
    if (racing.mode !== 'priv' || !racing.teamRace) throw new Error('la carrera de equipo no quedó privada ' + JSON.stringify(racing));
    if (team.join(',') !== 'Ana,Yo') throw new Error('el grupo se separó en la carrera ' + JSON.stringify(racing.players));
    if (!racing.players.some(p => p.bot) || racing.players.length < 5) throw new Error('no se rellenaron huecos ' + JSON.stringify(racing.players));
    await p.evaluate(() => window.__onl.team.home());
    await p.waitForFunction(() => document.getElementById('onl').classList.contains('on') && !window.__onl.team.open);
    const home = await p.evaluate(() => ({
      players: window.__onl.team.players(),
      text: document.getElementById('onTeam').innerText,
      lobby: document.getElementById('onl').classList.contains('on'),
      active: window.__onl.O.active
    }));
    if (!home.lobby || home.active) throw new Error('no volvió a la sala ' + JSON.stringify(home));
    if (home.players.length !== 2 || home.players.some(p => p.bot || p.pub) || !home.players.every(p => p.name === 'Yo' || p.name === 'Ana')) throw new Error('el grupo no volvió unido ' + JSON.stringify(home.players));
    if (!home.text.includes('Buscar carrera pública en equipo')) throw new Error('el botón no volvió a buscar ' + home.text);
    console.log('OK equipo', { sala: sala.names, seeking: seeking.wait, racing: racing.players.map(p => p.name), home: home.players.map(p => p.name), errs });
  } finally { await b.close(); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
