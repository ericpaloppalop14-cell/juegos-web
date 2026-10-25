/* play-extras.js · Valorar, Compartir, Atrás con "¿Seguro que quieres salir?" y tutorial (opcional).
   Solo se activa en la app Android (Capacitor) o con ?extras=1 para probar en navegador. Sin anuncios. */
(function () {
  'use strict';
  var C = window.PLAY_EXTRAS || {}; var Q = new URLSearchParams(location.search);
  var cap = window.Capacitor, NATIVE = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  if (!NATIVE && !Q.has('extras')) return;
  var PKG = C.pkg, URL_ = 'https://play.google.com/store/apps/details?id=' + PKG;
  var L = (C.lang || (window.I18N && I18N.lang) || navigator.language || 'es').slice(0, 2).toLowerCase();
  var TX = {
    es: { rate: 'Valorar', share: 'Compartir', q: '¿Seguro que quieres salir?', yes: 'Sí, salir', no: 'No, ¡a jugar!', msg: '¡Juega conmigo a {n}! 🍡✨', copied: '¡Enlace copiado! 💖' },
    en: { rate: 'Rate', share: 'Share', q: 'Are you sure you want to leave?', yes: 'Yes, exit', no: 'No, keep playing!', msg: 'Play {n} with me! 🍡✨', copied: 'Link copied! 💖' },
    pt: { rate: 'Avaliar', share: 'Compartilhar', q: 'Tem certeza de que quer sair?', yes: 'Sim, sair', no: 'Não, vamos jogar!', msg: 'Jogue {n} comigo! 🍡✨', copied: 'Link copiado! 💖' },
    fr: { rate: 'Noter', share: 'Partager', q: 'Tu veux vraiment quitter ?', yes: 'Oui, quitter', no: 'Non, on joue !', msg: 'Joue à {n} avec moi ! 🍡✨', copied: 'Lien copié ! 💖' },
    de: { rate: 'Bewerten', share: 'Teilen', q: 'Möchtest du wirklich beenden?', yes: 'Ja, beenden', no: 'Nein, weiterspielen!', msg: 'Spiel {n} mit mir! 🍡✨', copied: 'Link kopiert! 💖' },
    it: { rate: 'Valuta', share: 'Condividi', q: 'Vuoi davvero uscire?', yes: 'Sì, esci', no: 'No, si gioca!', msg: 'Gioca a {n} con me! 🍡✨', copied: 'Link copiato! 💖' },
    ja: { rate: '評価', share: 'シェア', q: '本当に終了しますか？', yes: 'はい、終了', no: 'いいえ、遊ぶ！', msg: 'いっしょに{n}で遊ぼう！🍡✨', copied: 'リンクをコピーしました💖' },
    ko: { rate: '평가', share: '공유', q: '정말 나가시겠어요?', yes: '네, 나갈래요', no: '아니요, 계속할래요!', msg: '나랑 {n} 같이 하자! 🍡✨', copied: '링크 복사 완료! 💖' },
    zh: { rate: '评分', share: '分享', q: '确定要退出吗？', yes: '是，退出', no: '不，继续玩！', msg: '和我一起玩{n}吧！🍡✨', copied: '链接已复制！💖' },
    hi: { rate: 'रेट करें', share: 'शेयर करें', q: 'क्या आप सच में बाहर निकलना चाहते हैं?', yes: 'हाँ, बाहर', no: 'नहीं, खेलते हैं!', msg: 'मेरे साथ {n} खेलो! 🍡✨', copied: 'लिंक कॉपी हो गया! 💖' }
  };
  var T = TX[L] || TX.en; window.PLAY_EXTRAS_T = T;
  function nat(m, o) { try { if (NATIVE) return cap.nativePromise('MochiExtras', m, o || {}); } catch (e) {} return Promise.reject('web'); }
  function snd() { try { C.sound && C.sound(); } catch (e) {} }
  var css = document.createElement('style');
  css.textContent =
    '#pxBar{position:fixed;z-index:60;display:flex;gap:8px;' + (C.barCss || 'left:calc(12px + env(safe-area-inset-left));top:calc(12px + env(safe-area-inset-top))') + '}' +
    '#pxBar button{display:flex;align-items:center;gap:5px;height:40px;padding:0 13px;border:none;border-radius:20px;background:rgba(255,255,255,.88);color:#8b5cc2;font:700 14px Fredoka,system-ui,sans-serif;box-shadow:0 3px 0 rgba(180,120,190,.35);cursor:pointer;touch-action:manipulation;transition:transform .12s}' +
    '#pxBar button:active{transform:scale(.92)}#pxBar b{font-size:18px}' +
    '#pxDlg,#pxTut{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;background:rgba(255,214,236,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}' +
    '#pxDlg.on,#pxTut.on{display:flex}' +
    '.pxCard{width:min(86vw,340px);background:#fff;border-radius:28px;padding:22px 20px 18px;text-align:center;box-shadow:0 8px 0 rgba(220,140,190,.4),0 14px 40px rgba(170,90,160,.25);font-family:Fredoka,system-ui,sans-serif;color:#7a4f9e;animation:pxPop .35s cubic-bezier(.3,1.6,.5,1)}' +
    '@keyframes pxPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}' +
    '.pxBlob{width:64px;height:54px;margin:0 auto 10px;border-radius:50% 50% 44% 44%;background:radial-gradient(circle at 35% 30%,#fff 0 12%,#ffc4de 13% 100%);position:relative;animation:pxB 1s ease-in-out infinite}' +
    '.pxBlob i{position:absolute;top:21px;width:7px;height:10px;border-radius:50%;background:#5a3a6a}.pxBlob i:nth-child(1){left:18px}.pxBlob i:nth-child(2){right:18px}' +
    '.pxBlob s{position:absolute;top:33px;width:12px;height:6px;border-radius:50%;background:#ff8fbf;opacity:.7}.pxBlob s:nth-of-type(1){left:6px}.pxBlob s:nth-of-type(2){right:6px}' +
    '@keyframes pxB{50%{transform:translateY(-4px) scaleX(1.04)}}' +
    '.pxCard h3{margin:0 0 14px;font-size:20px;line-height:1.25}.pxCard p{margin:0 0 14px;font-size:16px;line-height:1.35}' +
    '.pxRow{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}' +
    '.pxRow button{flex:1;min-width:110px;height:46px;border:none;border-radius:23px;font:700 16px Fredoka,system-ui,sans-serif;cursor:pointer;touch-action:manipulation}' +
    '.pxY{background:#f2e6ff;color:#8b5cc2}.pxN{background:#ff8fbf;color:#fff;box-shadow:0 4px 0 #e06a9e}' +
    '#pxToast{position:fixed;left:50%;bottom:calc(70px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100001;background:#fff;color:#8b5cc2;padding:9px 18px;border-radius:20px;font:700 15px Fredoka,system-ui,sans-serif;box-shadow:0 4px 0 rgba(180,120,200,.35);display:none}' +
    '.pxDots{display:flex;gap:6px;justify-content:center;margin:0 0 12px}.pxDots i{width:8px;height:8px;border-radius:50%;background:#eedcff}.pxDots i.on{background:#ff8fbf}' +
    '.pxEmo{font-size:44px;margin-bottom:6px}';
  document.head.appendChild(css);
  function el(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstChild; }
  function tap(b, fn) { ['pointerdown', 'touchstart', 'mousedown'].forEach(function (e) { b.addEventListener(e, function (ev) { ev.stopPropagation(); }, { passive: true }); }); b.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); snd(); fn(); }); }
  var bar = el('<div id="pxBar"><button id="pxRate" aria-label="' + T.rate + '"><b>⭐</b>' + T.rate + '</button><button id="pxShare" aria-label="' + T.share + '"><b>💌</b>' + T.share + '</button></div>');
  var dlg = el('<div id="pxDlg" role="dialog"><div class="pxCard"><div class="pxBlob"><i></i><i></i><s></s><s></s></div><h3>' + T.q + '</h3><div class="pxRow"><button class="pxY" id="pxYes">' + T.yes + '</button><button class="pxN" id="pxNo">' + T.no + '</button></div></div></div>');
  var toast = el('<div id="pxToast"></div>');
  [dlg, toast].forEach(function (n) { document.body.appendChild(n); });
  var mt = C.mountAfter && document.getElementById(C.mountAfter);
  if (mt) { bar.style.cssText = 'position:relative;left:auto;top:auto;right:auto;bottom:auto;justify-content:center;margin:12px auto 4px;z-index:2'; mt.insertAdjacentElement('afterend', bar); } else document.body.appendChild(bar);
  ['pointerdown', 'touchstart', 'mousedown'].forEach(function (e) { dlg.addEventListener(e, function (ev) { ev.stopPropagation(); }, { passive: true }); });
  function say(t) { toast.textContent = t; toast.style.display = 'block'; clearTimeout(say.t); say.t = setTimeout(function () { toast.style.display = 'none'; }, 1800); }
  function rateManual() { nat('openStore', { id: PKG }).catch(function () { window.open(URL_, '_blank'); }); }
  function share() {
    var text = T.msg.replace('{n}', C.name) + ' ' + URL_;
    nat('share', { text: text, title: C.name }).catch(function () {
      if (navigator.share) navigator.share({ title: C.name, text: text }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { say(T.copied); });
    });
  }
  tap(bar.querySelector('#pxRate'), rateManual); tap(bar.querySelector('#pxShare'), share);
  function openExit() { dlg.classList.add('on'); }
  function closeExit() { dlg.classList.remove('on'); }
  tap(dlg.querySelector('#pxNo'), closeExit);
  tap(dlg.querySelector('#pxYes'), function () { closeExit(); nat('exit').catch(function () { say('👋'); }); });
  // reseña dentro de la app (In-App Review API) en un momento neutro: tras la partida N
  var KR = 'px_ends_' + PKG;
  function gameEnded() {
    var n = (+localStorage.getItem(KR) || 0) + 1; localStorage.setItem(KR, n);
    if ((C.reviewAt || [3, 12, 40]).indexOf(n) >= 0) setTimeout(function () { nat('review').catch(function () {}); window.__pxReviewAsked = n; }, 1400);
  }
  // Atrás (lo llama MainActivity): devuelve 'ok' si lo hemos gestionado
  window.MochiBack = function () {
    var tut = document.getElementById('pxTut');
    if (tut && tut.classList.contains('on')) { tut.__close && tut.__close(); return 'ok'; }
    if (dlg.classList.contains('on')) { closeExit(); return 'ok'; }
    if (C.isHome()) { snd(); openExit(); return 'ok'; }
    try { C.back && C.back(); } catch (e) {}
    return 'ok';
  };
  (function loop() { var h = C.isHome(); bar.style.display = h ? 'flex' : 'none'; if (!h && dlg.classList.contains('on') && !C.keepDlg) closeExit(); setTimeout(loop, 250); })();
  // tutorial corto y saltable (solo la primera vez)
  function startTut() {
    var P = C.tutorial.pages, i = 0, sk = C.tutorial.skip, nx = C.tutorial.next, go = C.tutorial.go;
    var tut = el('<div id="pxTut" class="on" role="dialog"><div class="pxCard"><div class="pxDots"></div><div class="pxEmo"></div><h3></h3><p></p><div class="pxRow"><button class="pxY" id="pxSkip">' + sk + '</button><button class="pxN" id="pxNext"></button></div></div></div>');
    document.body.appendChild(tut);
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (e) { tut.addEventListener(e, function (ev) { ev.stopPropagation(); }, { passive: true }); });
    var draw = function () { var p = P[i]; tut.querySelector('.pxEmo').textContent = p[0]; tut.querySelector('h3').textContent = p[1]; tut.querySelector('p').textContent = p[2]; tut.querySelector('#pxNext').textContent = i === P.length - 1 ? go : nx; tut.querySelector('.pxDots').innerHTML = P.map(function (_, j) { return '<i' + (j === i ? ' class="on"' : '') + '></i>'; }).join(''); tut.querySelector('.pxCard').style.animation = 'none'; void tut.offsetWidth; tut.querySelector('.pxCard').style.animation = ''; };
    tut.__close = function () { localStorage.setItem(C.tutorial.key, '1'); tut.classList.remove('on'); };
    tap(tut.querySelector('#pxSkip'), tut.__close);
    tap(tut.querySelector('#pxNext'), function () { if (i < P.length - 1) { i++; draw(); } else tut.__close(); });
    draw();
  }
  if (C.tutorial && !localStorage.getItem(C.tutorial.key) && !Q.has('auto')) (function w() { if (C.isHome()) setTimeout(function () { if (C.isHome()) startTut(); else w(); }, 600); else setTimeout(w, 300); })();
  window.PlayExtras = { gameEnded: gameEnded, openExit: openExit, share: share, rate: rateManual };
})();
