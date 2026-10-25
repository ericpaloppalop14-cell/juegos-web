window.PLAY_EXTRAS = { pkg: 'com.ericsoul.mochi', name: 'Mochi',
  sound: function () { if (typeof Snd !== 'undefined') { Snd.init(); Snd.ui(); } },
  isHome: function () { var on = function (id) { var e = document.getElementById(id); return e && e.classList.contains('on'); }; return on('title') && !on('select') && !on('over') && !on('pause') && !on('cont'); },
  back: function () { var on = function (id) { return document.getElementById(id).classList.contains('on'); };
    var press = function (id) { var b = document.getElementById(id); if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); };
    if (on('select')) press('selBack'); else if (on('over')) press('overHome'); else if (on('pause')) press('pResume'); else if (on('cont')) press('contNo');
    else if (window.__mochi && __mochi.state === 'play') __mochi.pause(); }
};
document.addEventListener('DOMContentLoaded', function () { var o = document.getElementById('over'), was = false;
  new MutationObserver(function () { var on = o.classList.contains('on'); if (on && !was && window.PlayExtras) PlayExtras.gameEnded(); was = on; }).observe(o, { attributes: true, attributeFilter: ['class'] }); });
