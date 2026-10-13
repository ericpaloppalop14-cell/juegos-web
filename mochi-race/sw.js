const C = 'mcalles-v6';
const FILES = ['./', './index.html', './manifest.json', './fredoka.woff2', './lib/three.module.min.js', './js/main.js', './js/data.js', './js/gfx.js', './js/track.js', './js/race.js', './js/audio.js', './js/surreal.js', './js/vida.js', './js/edificios.js', './js/peds.js', './js/net.js', './lib/peerjs.min.js', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// v2: primero la red (para recibir siempre la última versión) y, sin conexión, la caché
self.addEventListener('fetch', e => { if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }))); });
