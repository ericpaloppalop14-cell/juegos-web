window.PLAY_EXTRAS = { pkg: 'com.ericsoul.mochiparty', name: 'Mochi Party', lang: 'es',
  mountAfter: 'bPj',
  sound: function () { if (window.MPMusica) { MPMusica.start(); MPMusica.sfx('tap'); } },
  isHome: function () { var m = document.getElementById('sMenu'), t = document.getElementById('trl'); return m && m.classList.contains('on') && !t; },
  back: function () { var t = document.getElementById('trl'); if (t) { t.click(); return; }
    var on = function (id) { var e = document.getElementById(id); return e && e.classList.contains('on'); };
    if ((on('sChars') || on('sIntro') || on('sPodio')) && window.__mr) __mr.menu(); },
  tutorial: { key: 'mp_tutorial_visto', skip: 'Saltar', next: 'Siguiente ➜', go: '¡A jugar! 🎉', pages: [
    ['🍡', '¡Hola! Bienvenido a Mochi Party', 'Compite en pruebas locas contra mochis traviesos. ¡Es muy fácil!'],
    ['🏅', 'Elige cómo jugar', 'Olimpiadas, Torneo completo o una prueba suelta. ¡Tú decides!'],
    ['👆', 'Mira la pista de cada prueba', 'Antes de empezar te contamos cómo se juega: tocar, deslizar o mantener.'],
    ['🏆', 'Gana medallas y puntos', 'Sube al podio y presume de mochi. ¡Cambia de mochi cuando quieras!']
  ] }
};
document.addEventListener('DOMContentLoaded', function () { var o = document.getElementById('sPodio'), was = false;
  new MutationObserver(function () { var on = o.classList.contains('on'); if (on && !was && window.PlayExtras) PlayExtras.gameEnded(); was = on; }).observe(o, { attributes: true, attributeFilter: ['class'] }); });
