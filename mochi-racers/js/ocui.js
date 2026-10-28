// ======================================================================
//  v50 · Pantallas y flujo de las COPAS ONLINE (menú, sala privada, partida pública, resultados, rango)
// ======================================================================
import { OCSession, OC_MAX, PUB_WAIT, LADDER, rankInfo, cupOpen, openIds, nextCup, raceRP, cupRP, newCode, cleanCode, inviteLink, pointsFor } from './onlinecup.js';

const EMO = { gominola: '🍬', girasol: '🌻', helada: '❄️', galaxia: '🌌', tormenta: '⛈️', cielo: '☁️', sueno: '💤', ballena: '🐋', biblioteca: '📚' };
const NEXT_S = 18; // segundos hasta que la siguiente carrera arranca sola

export function initOcUI(X) {
  const { app, save, $, btn, CUPS, CHARS, Audio, esc, persist } = X;
  const prog = () => (save.oc ||= { rp: 0, races: 0, wins: 0, cups: 0 });
  const cupBy = id => CUPS.find(c => c.id === id) || CUPS[0];
  const ORDER = CUPS.slice().sort((a, b) => (LADDER[a.id] ?? 0) - (LADDER[b.id] ?? 0));
  const shortName = c => c.name.replace('Copa ', '');
  let S = null, cache = {}, nextT = 0, newly = [], lastU = null, noHostT = 0;
  const setHTML = (id, h) => { if (cache[id] !== h) { cache[id] = h; $(id).innerHTML = h; } };
  const toast = (t, c) => app.ui.toast(t, c || '#ffffff');
  const chip = (c, o) => { const open = cupOpen(prog().rp, c.id);
    return `<button class="occ${open ? '' : ' lock'}${o.sel === c.id ? ' sel' : ''}${o.dim ? ' dim' : ''}" data-c="${c.id}"><i style="background:${c.color}">${EMO[c.id] || '🏁'}</i><span>${shortName(c)}</span><small>${o.badge(c, open)}</small></button>`; };

  // ---------------- menú ----------------
  function openMenu() {
    if (S) { S.close(); S = null; } app.oc = null; app.mode = null;
    $('ocName').value = save.nick; show('ocmenu'); renderMenu();
  }
  function show(id) { X.show(id); }
  function renderMenu() {
    const rp = prog().rp, R = rankInfo(rp), nx = nextCup(rp), pct = R.to ? Math.min(100, (rp - R.from) / (R.to - R.from) * 100) : 100;
    setHTML('ocRank', `<div class="ri">${R.icon}</div><div class="rt"><b>${R.name}</b><span>${rp} 🍬 puntos online</span><div class="rb"><u style="width:${pct}%"></u></div><small>${nx ? `Próxima copa: <b>${shortName(ORDER.find(c => c.id === nx[0]))}</b> a los ${nx[1]} 🍬 (te faltan ${nx[1] - rp})` : '¡Tienes todas las copas online abiertas!'}</small></div>`);
    setHTML('ocCups', ORDER.map(c => chip(c, { badge: (c, open) => open ? '✔ abierta' : `🔒 ${LADDER[c.id]} 🍬` })).join(''));
  }
  $('ocName').addEventListener('input', () => { save.nick = $('ocName').value.replace(/[<>]/g, '').slice(0, 14) || 'Piloto'; persist(); });
  $('ocCups').addEventListener('click', e => { const b = e.target.closest('.occ'); if (!b) return; const c = cupBy(b.dataset.c); if (!cupOpen(prog().rp, c.id)) { Audio.sfxPlay('boing'); toast(`🔒 ${c.name}: se abre con ${LADDER[c.id]} 🍬 (¡corre online para ganarlos!)`); } else toast(`✔ ${c.name} abierta en online`); });
  btn('ocPriv', () => lobby('priv', newCode(), true));
  btn('ocPub', () => lobby('pub', '', false));
  const joinCode = () => { const c = cleanCode($('ocCode').value); if (c.length < 4) { Audio.sfxPlay('boing'); toast('Escribe el código de 5 letras de tu amigo'); return; } lobby('priv', c, false); };
  btn('ocJoin', joinCode);
  $('ocCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinCode(); });
  $('ocCode').addEventListener('input', () => { $('ocCode').value = cleanCode($('ocCode').value); });
  btn('ocOla', () => X.openModes());
  btn('ocBack', () => X.openCups());

  // ---------------- sala de espera ----------------
  function lobby(kind, code, host) {
    if (S) { S.close(); S = null; }
    const me = X.meInfo(); S = new OCSession(); app.oc = S; app.mode = 'oc'; app.match = null; cache = {}; noHostT = Date.now(); lastU = null;
    S.cb.res = onRes;
    show('oclobby'); $('olTitle').textContent = kind === 'priv' ? '👥 Sala privada' : '⚡ Partida pública';
    $('olCodeBox').style.display = kind === 'priv' ? '' : 'none'; $('olCode').textContent = code; $('olOpts').style.display = 'none'; $('olStart').style.display = 'none';
    $('olInfo').textContent = 'Conectando…';
    S.lobby({ kind, code, host, me, uc: openIds(prog().rp), onUpdate: renderLobby, onStart: m => startMatch(m) }).catch(e => { console.warn(e); toast('Sin conexión online'); leave(); });
  }
  function renderLobby(u) {
    lastU = u; const rp = prog().rp, priv = u.kind === 'priv', isHost = priv && u.host, T = u.tally || {};
    const players = u.list.slice(0, OC_MAX), n = players.length;
    setHTML('olList', players.map(p => { const c = CHARS.find(c => c.id === p.ch) || CHARS[0]; return `<div class="lp${p.me ? ' me' : ''}"><b style="background:${c.color}"></b>${p.host ? '👑 ' : ''}${esc(p.name)}${p.me ? ' (tú)' : ''}${!priv && p.vote ? ` <em>${EMO[p.vote] || ''}</em>` : ''}</div>`; }).join('') + (n < OC_MAX ? `<div class="lp ghost">+ ${OC_MAX - n} más…</div>` : ''));
    let info;
    if (priv) {
      if (isHost) info = n > 1 ? `${n} pilotos en tu sala · tú eliges la copa` : '¡Comparte el código o el enlace! Puedes empezar cuando quieras';
      else if (u.full && u.myIdx >= OC_MAX) info = '😕 Sala llena (6 pilotos)';
      else if (u.hostE) info = `Sala de <b>${esc(u.hostE.name)}</b> · espera a que empiece`;
      else info = Date.now() - noHostT > 20000 ? `No encuentro la sala <b>${esc(u.code)}</b>… ¿está bien el código? ¿Tu amigo ya la ha creado?` : `Buscando la sala ${esc(u.code)}…`;
    } else info = n > 1 ? `🗳️ Vota una copa · ${n} pilotos · salimos en ${Math.ceil(u.left)} s` : `🗳️ Vota una copa · buscando pilotos… ${Math.ceil(u.left)} s (si no llega nadie, corres con bots)`;
    $('olInfo').innerHTML = info;
    $('olNote').textContent = priv ? (isHost ? '🎟️ Tus amigos corren la copa que elijas aunque no la tengan abierta' : '🎟️ Corres la copa del anfitrión aunque aún no la tengas abierta') : '🎟️ Si gana una copa que aún no tienes abierta, ¡la corres con pase de invitado!';
    // copas: el anfitrión elige · en pública se vota · los invitados ven la elegida
    const sel = priv ? (isHost ? S.sel.pick : (u.hostE && u.hostE.pick)) : S.sel.vote;
    setHTML('olCups', ORDER.map(c => chip(c, { sel, dim: priv && !isHost, badge: (c, open) => priv ? (isHost ? (open ? (sel === c.id ? '✔ elegida' : 'tocar') : `🔒 ${LADDER[c.id]} 🍬`) : (sel === c.id ? '✔ elegida' : '')) : `${T[c.id] ? '🗳️ ' + T[c.id] + ' · ' : ''}${open ? (S.sel.vote === c.id ? 'tu voto' : 'votar') : '🔒'}` })).join(''));
    $('olCupsT').textContent = priv ? (isHost ? 'Elige la copa (las tuyas abiertas)' : 'Copa elegida por el anfitrión') : 'Vota una copa (solo las tuyas abiertas) · gana la más votada';
    $('olOpts').style.display = isHost ? '' : 'none'; $('olStart').style.display = isHost ? '' : 'none';
    if (isHost) { for (const b of $('olOpts').querySelectorAll('[data-r]')) b.classList.toggle('on', +b.dataset.r === S.sel.races); $('olBots').classList.toggle('on', S.sel.bots); $('olBots').textContent = S.sel.bots ? '🤖 Con bots' : '🚫 Sin bots'; }
  }
  $('olCups').addEventListener('click', e => { const b = e.target.closest('.occ'); if (!b || !S || !lastU) return; const c = cupBy(b.dataset.c), open = cupOpen(prog().rp, c.id), priv = lastU.kind === 'priv';
    if (priv && !lastU.host) { toast('La copa la elige el anfitrión'); return; }
    if (!open) { Audio.sfxPlay('boing'); toast(`🔒 ${c.name}: te faltan ${LADDER[c.id] - prog().rp} 🍬 para abrirla (puedes correrla si la gana el voto)`); return; }
    Audio.sfxPlay('select'); if (priv) S.set('pick', c.id); else S.set('vote', S.sel.vote === c.id ? null : c.id); });
  for (const b of $('olOpts').querySelectorAll('[data-r]')) b.addEventListener('click', () => { Audio.sfxPlay('select'); S && S.set('races', +b.dataset.r); });
  btn('olBots', () => { if (S) S.set('bots', !S.sel.bots); });
  btn('olStart', () => { if (S && lastU && lastU.host) S.hostStart(); });
  const copyText = async t => { try { await navigator.clipboard.writeText(t); return true; } catch (e) { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {} ta.remove(); return ok; } };
  btn('olCopy', async () => { const ok = await copyText(inviteLink(S ? S.code : '')); toast(ok ? '📋 ¡Enlace copiado! Pégalo en el chat' : 'Enlace: ' + inviteLink(S.code)); });
  btn('olShare', async () => { const l = inviteLink(S.code), t = `¡Corre conmigo en Mochi Racers! Código ${S.code}`; if (navigator.share) { try { await navigator.share({ title: 'Mochi Racers', text: t, url: l }); return; } catch (e) { if (e && e.name === 'AbortError') return; } } const ok = await copyText(t + ' ' + l); toast(ok ? '📋 Enlace copiado' : l); });
  btn('olLeave', () => leave());
  function leave() {
    clearInterval(nextT); if (app.race) { app.race.dispose(); app.race = null; } Audio.stopSong();
    if (S) { S.close(); S = null; } app.oc = null; app.mode = null; $('rMenu').style.display = 'none'; $('rMenu').textContent = 'Menú'; openMenu();
  }

  // ---------------- partida ----------------
  function startMatch(m) {
    m.rp0 = prog().rp; m.awarded = {}; m.hostRes = null; m.shown = -1; m.auth = false; app.points = {}; app.lastOrder = null;
    toast(`${cupBy(m.cup).name} · ${m.humans > 1 ? m.humans + ' pilotos de verdad' : 'contra bots'}`, '#ffffff');
    X.startOcRace(m, 0, m.grid);
  }
  // el móvil que simula los bots (el de menor puesto vivo) manda los resultados «oficiales»
  function raceEnd(order) {
    const M = S.m; if (!M) return; clearInterval(nextT);
    const prev = M.tot.slice(); M.prev = prev; M.time = {}; for (const o of order) M.time[o.slot] = o.time;
    const hr = M.hostRes && M.hostRes.n === M.n ? M.hostRes : null;
    M.ord = hr ? hr.ord.slice() : order.slice().sort((a, b) => a.place - b.place).map(o => o.slot);
    if (hr) { M.tot = hr.tot.slice(); Object.assign(M.time, hr.tm); } else M.ord.forEach((s, i) => { M.tot[s] += pointsFor(i); });
    if (S.m.simBots) S.sendRes({ ord: M.ord, tot: M.tot, tm: M.time });
    M.shown = M.n; setTimeout(showRes, 400);
  }
  function onRes(m) { const M = S && S.m; if (!M) return; M.hostRes = m; if (M.shown === M.n && m.n === M.n && !M.advanced) { M.ord = m.ord.slice(); M.tot = m.tot.slice(); Object.assign(M.time, m.tm); if (app.state === 'results') showRes(true); } }
  function showRes(keepTimer) {
    const M = S && S.m; if (!M) return; Audio.stopSong(); X.show('results');
    const last = M.n >= M.races - 1, myPlace = M.ord.indexOf(M.me) + 1, hum = M.humans, priv = M.kind === 'priv', rp = raceRP(myPlace, hum, priv);
    $('rTitle').innerHTML = `${esc(cupBy(M.cup).name)} · Carrera ${M.n + 1}/${M.races}<div style="font-size:15px;color:#8b5cc2;-webkit-text-stroke:0;text-shadow:none;margin-top:2px">${myPlace}º · +${rp} 🍬 puntos online${hum < 2 ? ' (contra bots suma poco: ¡invita a alguien!)' : ''}</div>`;
    let h = '<tr><td></td><td>Piloto</td><td class="n">Tiempo</td><td class="n">+Pts</td><td class="n">Total</td></tr>';
    M.ord.forEach((s, i) => { const r = M.roster[s], c = CHARS.find(c => c.id === r.ch) || CHARS[0], me = s === M.me; h += `<tr class="${me ? 'me' : ''}"><td>${i + 1}º</td><td><span class="dot" style="background:${c.color}"></span>${esc(r.name)}${me ? ' (tú)' : ''}${r.bot ? ' 🤖' : ''}</td><td class="n">${M.time[s] != null && M.time[s] < 900 ? X.fmtT(M.time[s]) : '—'}</td><td class="n">+${M.tot[s] - M.prev[s]}</td><td class="n">${M.tot[s]}</td></tr>`; });
    $('rTable').innerHTML = h; $('rMenu').style.display = ''; $('rMenu').textContent = 'Salir';
    if (keepTimer === true) return;
    let t = NEXT_S; const lab = () => { $('rNext').textContent = (last ? '🏆 Ver podio' : 'Siguiente carrera ›') + ` (${t})`; }; lab();
    clearInterval(nextT); nextT = setInterval(() => { if (app.state !== 'results' || !S) { clearInterval(nextT); return; } t--; if (t <= 0) { clearInterval(nextT); next(); } else lab(); }, 1000);
  }
  function award(M, n) { if (M.awarded[n]) return 0; M.awarded[n] = 1; const p = M.ord.indexOf(M.me) + 1, rp = raceRP(p, M.humans, M.kind === 'priv'); const P = prog(); P.rp += rp; P.races++; if (p === 1) P.wins++; persist(); return rp; }
  function next() {
    const M = S && S.m; if (!M || M.advanced === M.n) return; M.advanced = M.n; clearInterval(nextT); award(M, M.n);
    const grid = M.ord.slice().reverse(); S.stopRace();
    if (M.n >= M.races - 1) return podium();
    M.n++; M.prevGrid = grid; M.hostRes = null; X.startOcRace(M, M.n, grid);
  }
  function podium() {
    const M = S.m, P = prog(), priv = M.kind === 'priv';
    const ranking = M.roster.map((r, i) => ({ slot: i, ch: CHARS.find(c => c.id === r.ch) || CHARS[0], p: M.tot[i], r })).sort((a, b) => b.p - a.p || M.ord.indexOf(a.slot) - M.ord.indexOf(b.slot));
    const myPlace = ranking.findIndex(r => r.slot === M.me), bonus = cupRP(myPlace + 1, M.humans, priv);
    P.rp += bonus; P.cups++; persist();
    const was = openIds(M.rp0), now = openIds(P.rp); newly = now.filter(id => !was.includes(id));
    const tier = myPlace <= 2 ? myPlace : -1, cup = cupBy(M.cup), gained = P.rp - M.rp0, R = rankInfo(P.rp);
    X.showOcPodium({ cup, ranking: ranking.map(r => ({ ch: r.ch, p: r.p })), myPlace, tier, title: `¡${cup.name}!`, place: `${['🥇', '🥈', '🥉'][myPlace] || ''} ${myPlace + 1}º con ${ranking[myPlace].p} puntos`,
      sub: `+${gained} 🍬 · ${R.icon} ${R.name}` + (newly.length ? ` · ¡Copa nueva: ${newly.map(id => shortName(cupBy(id))).join(', ')}!` : bonus ? '' : ' · ¡al podio suma más!') });
  }
  return { openMenu, joinCode: code => { if (!X.meInfo) return; lobby('priv', cleanCode(code), false); }, raceEnd, next, leave, afterPodium() { if (newly.length) { X.celebrateOc(newly.slice()); newly = []; } else leave(); }, pending: () => S && S.m, get session() { return S; } };
}
