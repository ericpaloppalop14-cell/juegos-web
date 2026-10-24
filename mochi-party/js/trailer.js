'use strict';
/* Tráiler de entrada (Party / Olimpiadas): vídeo con planos reales de todas las pruebas.
   La primera vez sale solo; después se puede volver a ver con el botón «🎬 Tráiler». Un toque lo salta. */
(() => {
  const s = document.currentScript, kind = s.dataset.kind, base = s.src.replace(/js\/trailer\.js.*$/, 'trailer/'), KEY = 'mp_trailer_' + kind + '_v1';
  const Q = new URLSearchParams(location.search);
  const css = document.createElement('style');
  css.textContent = `#trl{position:fixed;inset:0;z-index:99;background:#2a1640;display:flex;align-items:center;justify-content:center;transition:opacity .45s;touch-action:none}
#trl video{width:100%;height:100%;object-fit:cover}
#trl .snd{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top));border:none;border-radius:16px;padding:9px 14px;font:700 15px Fredoka,sans-serif;color:#8b5cc2;background:rgba(255,255,255,.9);box-shadow:0 3px 0 rgba(120,60,160,.35)}
#trl .skip{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);font:700 13px Fredoka,sans-serif;color:#fff;background:rgba(60,20,80,.45);padding:6px 12px;border-radius:12px;pointer-events:none;white-space:nowrap}
#trlBtn{position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:30;border:none;border-radius:16px;padding:8px 12px;font:700 14px Fredoka,sans-serif;color:#8b5cc2;background:rgba(255,255,255,.88);box-shadow:0 3px 0 rgba(170,110,200,.35)}`;
  document.head.appendChild(css);
  function play() {
    if (document.getElementById('trl')) return;
    const port = innerHeight >= innerWidth, d = document.createElement('div'); d.id = 'trl';
    d.innerHTML = `<video playsinline preload="auto" poster="${base}${kind}-${port ? 'v' : 'h'}.jpg?v=o35" src="${base}${kind}-${port ? 'v' : 'h'}.mp4?v=o35"></video><button class="snd" style="display:none">🔊 Activar sonido</button><div class="skip">Toca para saltar ⏭</div>`;
    document.body.appendChild(d); const v = d.querySelector('video'), snd = d.querySelector('.snd'); let done = false;
    const end = () => { if (done) return; done = true; try { localStorage.setItem(KEY, '1'); } catch (e) {} d.style.opacity = 0; v.pause(); setTimeout(() => d.remove(), 460); };
    const stop = e => e.stopPropagation();
    ['pointerdown', 'touchstart', 'mousedown'].forEach(ev => d.addEventListener(ev, stop));
    d.addEventListener('click', e => { e.stopPropagation(); if (e.target === snd) { v.muted = false; snd.remove(); return; } end(); });
    v.onended = end; v.onerror = end;
    v.play().catch(() => { v.muted = true; snd.style.display = ''; v.play().catch(end); });
    window.__trailer = { v, end };
  }
  const btn = document.createElement('button'); btn.id = 'trlBtn'; btn.textContent = '🎬 Tráiler'; btn.onclick = e => { e.stopPropagation(); play(); };
  const ready = () => {
    document.body.appendChild(btn);
    if (kind === 'party') setInterval(() => { const m = document.getElementById('sMenu'); btn.style.display = m && m.classList.contains('on') ? '' : 'none'; }, 400);
    let seen = false; try { seen = !!localStorage.getItem(KEY); } catch (e) {}
    if (!seen && !Q.has('auto') && !Q.has('notrailer')) play();
  };
  if (document.body) ready(); else addEventListener('DOMContentLoaded', ready);
  window.MPTrailer = { play };
})();
