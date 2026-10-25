const C='mochi-v23';
const FILES=['./','./index.html','./config.js','./monet.js','./game.js','./fx-noche.js','./peerjs.min.js','./i18n.js','./fonts/cjk-ja.woff2','./fonts/cjk-ko.woff2','./fonts/cjk-sc.woff2','./fonts/cjk-tc.woff2','./fredoka.woff2','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});
