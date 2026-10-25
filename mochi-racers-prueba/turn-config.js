// ======================================================================
//  CONFIGURACIÓN OPCIONAL DE TURN (Cloudflare Realtime TURN u otro)
//  ----------------------------------------------------------------------
//  Por defecto el juego conecta los móviles directamente (P2P) usando
//  solo servidores STUN públicos (Google y Cloudflare). Eso funciona en
//  la mayoría de redes (wifi de casa, 4G/5G...). En algunas redes muy
//  cerradas (wifis de colegio o empresa, algunos operadores con CGNAT
//  estricto) dos móviles no se pueden ver directamente y hace falta un
//  servidor TURN que reenvíe el tráfico.
//
//  Para activar Cloudflare TURN (plan gratuito, 1.000 GB/mes):
//   1. Entra en https://dash.cloudflare.com → Realtime → TURN Server
//      y crea una "TURN key" (te da un Key ID y un API Token).
//   2. Las credenciales TURN de Cloudflare caducan: lo ideal es un
//      Cloudflare Worker pequeño (gratis) que llame a
//        POST https://rtc.live.cloudflare.com/v1/turn/keys/<KEY_ID>/credentials/generate-ice-servers
//        (Authorization: Bearer <API_TOKEN>, body {"ttl": 86400})
//      y devuelva el JSON. Pon su URL en `credentialsUrl` y el juego
//      pedirá credenciales nuevas en cada partida.
//   3. O, para probar, pega aquí directamente el contenido "iceServers"
//      que devuelve esa llamada (caduca según el ttl que pidas).
//  NUNCA pongas el API Token de Cloudflare en este archivo: es público.
// ======================================================================
window.MR_TURN = {
  credentialsUrl: '',   // p. ej. 'https://mochi-turn.<tu-subdominio>.workers.dev'
  iceServers: [],       // p. ej. [{ urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:5349?transport=tcp'], username: '...', credential: '...' }]
};
