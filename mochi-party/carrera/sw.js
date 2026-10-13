// Mochi Rivals: service worker mínimo (sin caché) para la carrera
self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
