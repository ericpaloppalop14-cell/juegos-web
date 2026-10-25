// Simulación local: node test/sim.mjs [URL]   (con "npm run dev" encendido)
import WebSocket from 'ws';
const BASE = process.argv[2] || 'http://127.0.0.1:8787', WS = BASE.replace(/^http/, 'ws');
let ok = 0, bad = 0; const check = (c, m) => { c ? ok++ : bad++; console.log((c ? '✅ ' : '❌ ') + m); };
const wait = ms => new Promise(r => setTimeout(r, ms));
function client(q) {
  const ws = new WebSocket(WS + '/ws?' + new URLSearchParams(q), { headers: { Origin: 'https://ericpaloppalop14-cell.github.io' } });
  const c = { ws, msgs: [], ev: [], err: null };
  ws.on('message', b => { const s = b.toString(); if (s === 'pong') return c.ev.push('pong'); const m = JSON.parse(s); if (m.t === 'msg') c.msgs.push(m); else if (m.t === 'error') c.err = m.code; else c.ev.push(m); });
  c.open = new Promise(r => { ws.on('open', r); ws.on('error', r); });
  c.send = o => ws.send(typeof o === 'string' ? o : JSON.stringify(o)); return c;
}
const R = 'T' + Date.now();
// 1) 8 clientes en una sala, todos se ven y reciben broadcast
const cs = []; for (let i = 0; i < 8; i++) { cs.push(client({ game: 'tierra-que-se-hunde', room: R, id: 'p' + i, name: 'J' + i, host: i === 0 ? '1' : '' })); await wait(60); }
await Promise.all(cs.map(c => c.open)); await wait(400);
check(cs[7].ev.find(e => e.t === 'welcome')?.peers.length === 7, '8 jugadores: el último ve a los otros 7');
check(cs[0].ev.filter(e => e.t === 'join').length === 7, 'el anfitrión recibe 7 avisos de entrada');
cs[3].send({ t: 'all', d: { x: 1 } }); await wait(300);
check(cs.filter((c, i) => i !== 3 && c.msgs.some(m => m.from === 'p3' && m.d.x === 1)).length === 7, 'broadcast llega a los 7');
cs[5].send({ t: 'to', to: 'p0', d: { hola: 1 } }); await wait(300);
check(cs[0].msgs.some(m => m.from === 'p5') && !cs[1].msgs.some(m => m.from === 'p5'), 'mensaje directo solo al destinatario');
// 2) sala llena (max 8)
const extra = client({ game: 'tierra-que-se-hunde', room: R, id: 'p9' }); await wait(500); check(extra.err === 'full', 'el 9º recibe "full"');
// 3) id de anfitrión ocupado
const h2 = client({ game: 'tierra-que-se-hunde', room: R, id: 'otro', host: '1' }); await wait(500); check(h2.err === 'taken' || h2.err === 'full', 'segundo anfitrión rechazado');
// 4) sala sin anfitrión
const nh = client({ game: 'mochi', room: 'NADIE' + Date.now(), id: 'g1', need: 'host' }); await wait(500); check(nh.err === 'nohost', 'unirse a sala inexistente -> "nohost"');
// 5) latido
cs[1].send('ping'); await wait(300); check(cs[1].ev.includes('pong'), 'latido ping/pong');
// 6) reconexión: p2 se cae y vuelve con el mismo id dentro del margen -> nadie ve "leave"
cs[2].ws.terminate(); await wait(1500);
const back = client({ game: 'tierra-que-se-hunde', room: R, id: 'p2', name: 'J2' }); await back.open; await wait(500);
check(back.ev.find(e => e.t === 'welcome')?.back === true, 'reconexión reconocida (mismo sitio)');
check(!cs[0].ev.some(e => e.t === 'leave' && e.id === 'p2'), 'nadie ve salir a p2 al reconectar');
// 7) salida real -> "leave" tras el margen
cs[6].ws.close(); await wait(14500);
check(cs[0].ev.some(e => e.t === 'leave' && e.id === 'p6'), 'salida real avisada tras 12 s');
// 8) anti-abuso: mensaje gigante y ráfaga
cs[4].send({ t: 'all', d: 'x'.repeat(20000) }); await wait(300); check(cs[4].err === 'big', 'mensaje >16 KB rechazado');
const before = cs[1].msgs.length; for (let i = 0; i < 400; i++) cs[4].send({ t: 'all', d: i }); await wait(800);
const got = cs[1].msgs.length - before; check(got < 400 && got >= 100, `ráfaga de 400 limitada (${got} pasan)`);
// 9) emparejamiento rápido: 4 piden sala y caen en la misma; el 5º en otra
const q = []; for (let i = 0; i < 5; i++) q.push(await (await fetch(BASE + '/quick?game=mochi-racers&max=4')).json());
check(new Set(q.slice(0, 4).map(x => x.room)).size === 1 && q[4].room !== q[0].room, 'partida rápida agrupa de 4 en 4');
// 10) ranking
const H = { 'Content-Type': 'application/json', Origin: 'https://ericpaloppalop14-cell.github.io' };
const g = 'test-' + Date.now();
for (const [n, s] of [['Ana', 10], ['Eric', 50], ['Leo', 30]]) await fetch(BASE + '/score', { method: 'POST', headers: H, body: JSON.stringify({ game: g, name: n, score: s }) });
const top = (await (await fetch(BASE + '/top?game=' + g)).json()).top;
check(top.map(x => x.name).join() === 'Eric,Leo,Ana', 'ranking ordenado (Eric, Leo, Ana)');
const evil = await fetch(BASE + '/ws?game=mochi&room=X', { headers: { Origin: 'https://malo.example' } }); check(evil.status === 403, 'web no permitida rechazada (403)');
for (const c of cs) try { c.ws.close(); } catch (e) { }
console.log(`\n${ok} bien, ${bad} mal`); process.exit(bad ? 1 : 0);
