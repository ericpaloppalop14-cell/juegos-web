const C = 'encaje-v1';
const FILES = ['./', './index.html', './style.css', './manifest.json', './js/main.js', './js/puzzles.js', './js/views.js', './js/audio.js', './js/levels.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && k.startsWith('encaje-')).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// red primero para HTML/JS/CSS (nunca sirve código viejo con conexión); caché si no hay red
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; const u = new URL(e.request.url); if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))); });
