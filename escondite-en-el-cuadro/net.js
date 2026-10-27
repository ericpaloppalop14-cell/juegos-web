// =====================================================================
//  Escondite en el Cuadro · SALA ONLINE (cliente común online-cf.js)
//  Sin URL de servidor (online-config.js vacío) => botón gris "pronto".
//  Con URL y /health = ok => se activa solo.
//
//  Partida: 2-6 jugadores por código de 4 letras. Por rondas: 1 jugador
//  es El Crítico (buscador) y el resto Manchas disfrazadas de objetos; el papel de
//  Crítico rota cada ronda. El ANFITRIÓN manda el reloj y las fases.
//  Mensajes (van dentro de {t:'all'|'to', d:...} del servidor relé):
//   {t:'hola', nombre}                       al entrar
//   {t:'ronda', n, critico:id, salida:[[x,z,yaw]...], ids:[...]} anfitrión
//   {t:'fase', fase:'seek'|'fin', tiempo}    anfitrión
//   {t:'st', x,y,z, o:idObjeto|-1, e:[tono,clar,sat,ancho,alto,giro,patron,rot]|null,
//           w:tambaleo 0/1, v:vivo}                cada 100 ms (escondidos)
//   {t:'cr', x,y,z,yaw}                       El Crítico, cada 100 ms
//   {t:'toque', ok:0}                         El Crítico falla un objeto
//   {t:'pillada', id}                        El Crítico (él decide)
//   {t:'silbo', x,z}                         un escondido silba (pista)
//  El disfraz viaja como id del objeto copiado + los ajustes (tono, claridad,
//  saturación, ancho, alto, giro, patrón): la biblioteca es igual en todos.
// =====================================================================
export const GAME_ID = 'escondite-en-el-cuadro';
export function onlineURL() { const O = window.OnlineCF; return O ? O.base() : ''; }
export let ONLINE_DISPONIBLE = false;
export async function comprobarOnline() { const O = window.OnlineCF; if (!O || !O.base()) return (ONLINE_DISPONIBLE = false); try { ONLINE_DISPONIBLE = await O.check(8000); } catch (e) { ONLINE_DISPONIBLE = false; } return ONLINE_DISPONIBLE; }
export class SalaOnline {
  constructor() { this.room = null; this.on = {}; this.peers = new Map(); this.host = false; this.id = null; this.code = ''; }
  static codigo() { return window.OnlineCF ? window.OnlineCF.code(4) : 'ABCD'; }
  conectar(code, nombre, crear) {
    if (!ONLINE_DISPONIBLE) return Promise.reject(new Error('pronto'));
    this.code = code; const R = window.OnlineCF.Room; const r = this.room = new R({ game: GAME_ID, room: code, name: nombre, host: !!crear, max: 6 });
    this.id = r.id; this.nombre = nombre;
    r.on('join', m => { this.peers.set(m.id, { id: m.id, nombre: m.name || 'Mancha' }); this._e('peers'); });
    r.on('leave', m => { this.peers.delete(m.id); this._e('leave', m.id); this._e('peers'); });
    r.on('host', id => { this.host = id === this.id; this._e('host'); });
    r.on('msg', (d, from) => { if (!d || !d.t) return; if (d.t === 'hola') { this.peers.set(from, { id: from, nombre: d.nombre }); this._e('peers'); } this._e(d.t, d, from); });
    r.on('close', e => this._e('cerrada', e));
    return new Promise((ok, ko) => { r.on('open', () => { this.host = r.host === this.id || !!crear; for (const [id, p] of r.peers) this.peers.set(id, { id, nombre: p.name || 'Mancha' }); this.enviar({ t: 'hola', nombre }); this._e('peers'); ok(this); }); r.on('error', ko); setTimeout(() => ko(new Error('tiempo')), 8000); });
  }
  _e(k, ...a) { (this.on[k] || (() => { }))(...a); }
  enviar(m) { if (this.room) this.room.send(m); }
  salir() { if (this.room) this.room.close(); this.room = null; this.peers.clear(); }
  jugadores() { return [{ id: this.id, nombre: this.nombre }, ...this.peers.values()].sort((a, b) => a.id < b.id ? -1 : 1); }
}
