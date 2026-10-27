// Sala online con código (PREPARADO, sin servidor desplegado).
// Protocolo pensado: el anfitrión crea sala de 4 letras; mensajes JSON:
//  {t:'hola',nombre} {t:'empieza',cuadro,semilla,roles} {t:'estado',id,x,z,yaw,c1,c2,pat,pose}
//  {t:'disparo',x,y,z,dx,dy,dz} {t:'pillada',id} {t:'fin',resultados}
// La partida es autoritativa en el anfitrión (El Crítico valida los disparos).
export const ONLINE_DISPONIBLE = false;
export class SalaOnline {
  constructor(url) { this.url = url; this.ws = null; this.on = {}; }
  static codigo() { const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += L[Math.floor(Math.random() * L.length)]; return s; }
  conectar(codigo) { if (!ONLINE_DISPONIBLE) return Promise.reject(new Error('próximamente')); this.ws = new WebSocket(this.url + '?sala=' + codigo); this.ws.onmessage = e => { const m = JSON.parse(e.data); (this.on[m.t] || (() => {}))(m); }; return new Promise((ok, ko) => { this.ws.onopen = ok; this.ws.onerror = ko; }); }
  enviar(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); }
}
