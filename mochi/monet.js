/* Mochi · monetización: compras (Google Play Billing) + anuncio bonificado (AdMob)
   Modos:
     native → dentro de la app Android (Capacitor): Play Billing + AdMob reales
     debug  → web con ?debug=1: todo simulado (para probar)
     off    → web normal: sin compras ni anuncios (se ocultan) */
(function () {
  const CFG = window.MOCHI_CONFIG;
  const Cap = window.Capacitor;
  const NATIVE = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const DEBUG = /[?&]debug=/.test(location.search);
  const mode = NATIVE ? 'native' : DEBUG ? 'debug' : 'web'; // web: compras ocultas, anuncios SIMULADOS
  const KEY = 'mochi_ent';
  let owned = new Set();
  try { owned = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...owned])); } catch (e) {} };
  const prices = {};
  const listeners = [];
  const changed = () => listeners.forEach(f => { try { f(); } catch (e) {} });
  const allIds = () => [CFG.products.noAds, ...Object.values(CFG.products.chars)];
  let AdMob = null, Purch = null, adReady = false, adLoading = null, consentOk = !NATIVE, privacyRequired = false;

  // ---------- overlay helpers (debug simulation + messages)
  function overlay(html) {
    const d = document.createElement('div');
    d.className = 'mon-ov'; d.innerHTML = `<div class="mon-box">${html}</div>`;
    document.body.appendChild(d); return d;
  }
  function toast(msg, ms = 2200) {
    const d = document.createElement('div'); d.className = 'mon-toast'; d.textContent = msg; document.body.appendChild(d);
    setTimeout(() => d.classList.add('on'), 10); setTimeout(() => { d.classList.remove('on'); setTimeout(() => d.remove(), 400); }, ms);
  }
  const btnHandler = (el, fn) => el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });

  // ---------- native init
  async function initNative() {
    AdMob = Cap.registerPlugin('AdMob');
    Purch = Cap.registerPlugin('NativePurchases');
    // 1) Purchases: sync entitlements from Google Play (source of truth)
    try { await syncPurchases(); } catch (e) { console.warn('billing sync', e); }
    try {
      const r = await Purch.getProducts({ productIdentifiers: allIds(), productType: 'inapp' });
      (r.products || []).forEach(p => { if (p.identifier) prices[p.identifier] = p.priceString; });
      changed();
    } catch (e) { console.warn('products', e); }
    // 2) AdMob + UMP consent (GDPR) before any ad request
    try {
      await AdMob.initialize({ initializeForTesting: !!CFG.admob.testing });
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await AdMob.showConsentForm();
      consentOk = info.canRequestAds !== false;
      privacyRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
      changed();
      if (consentOk && !owned.has(CFG.products.noAds)) preloadAd();
    } catch (e) { console.warn('admob init', e); consentOk = false; }
  }
  async function syncPurchases() {
    const r = await Purch.getPurchases({ productType: 'inapp' });
    let n = 0;
    (r.purchases || []).forEach(p => { if (p.productIdentifier && (p.purchaseState == null || String(p.purchaseState) === '1')) { if (!owned.has(p.productIdentifier)) n++; owned.add(p.productIdentifier); } });
    save(); changed(); return n;
  }
  let intReady = false, intLoading = null;
  function preloadInt() {
    if (!AdMob || !CFG.admob.interstitialAndroid || intReady || intLoading) return intLoading;
    intLoading = AdMob.prepareInterstitial({ adId: CFG.admob.interstitialAndroid, isTesting: !!CFG.admob.testing })
      .then(() => { intReady = true; }).catch(e => { console.warn('int load', e); intReady = false; }).finally(() => { intLoading = null; });
    return intLoading;
  }
  function preloadAd() { preloadInt();
    if (!AdMob || adReady || adLoading) return adLoading;
    adLoading = AdMob.prepareRewardVideoAd({ adId: CFG.admob.rewardedAndroid, isTesting: !!CFG.admob.testing })
      .then(() => { adReady = true; }).catch(e => { console.warn('ad load', e); adReady = false; })
      .finally(() => { adLoading = null; });
    return adLoading;
  }

  // ---------- public API
  const Monet = {
    mode, native: NATIVE, available: mode === 'native' || mode === 'debug', adsAvailable: true,
    onChange(f) { listeners.push(f); },
    owns(id) { return owned.has(id); },
    noAds() { return owned.has(CFG.products.noAds); },
    ownsChar(charId) { const id = CFG.products.chars[charId]; return !!id && owned.has(id); },
    charProduct(charId) { return CFG.products.chars[charId]; },
    price(id) { return prices[id] || (id === CFG.products.noAds ? CFG.refPrices.noAds : CFG.refPrices.char); },
    get privacyRequired() { return privacyRequired || mode === 'debug'; },
    toast,
    async buy(id, label) {
      if (owned.has(id)) return true;
      if (mode === 'debug') {
        return new Promise(res => {
          const o = overlay(`<div class="mon-t">Google Play <small>${T('mSim')}</small></div><div class="mon-p">${label || id}</div><div class="mon-price">${Monet.price(id)}</div><div class="mon-row"><button class="mon-b no" data-a="0">${T('mCancel')}</button><button class="mon-b" data-a="1">${T('mBuy')}</button></div>`);
          o.querySelectorAll('button').forEach(b => btnHandler(b, () => { o.remove(); if (b.dataset.a === '1') { owned.add(id); save(); changed(); toast(T('mDone')); res(true); } else res(false); }));
        });
      }
      if (mode !== 'native') return false;
      try {
        const tx = await Purch.purchaseProduct({ productIdentifier: id, productType: 'inapp', quantity: 1 });
        const st = tx && tx.purchaseState != null ? String(tx.purchaseState) : '1';
        if (st === '1') { owned.add(id); save(); changed(); toast(T('mDone')); return true; }
        toast(T('mPending'), 3200); return false;
      } catch (e) {
        const m = String(e && (e.message || e)); if (!/cancel/i.test(m)) toast(T('mFail'));
        return false;
      }
    },
    async restore() {
      if (mode === 'debug') { toast(owned.size ? T('mRestored', { n: owned.size }) : T('mNone')); changed(); return owned.size; }
      if (mode !== 'native') return 0;
      try { try { await Purch.restorePurchases(); } catch (e) {} const n = await syncPurchases(); toast(owned.size ? T('mRestored', { n: owned.size }) : T('mNone')); return n; }
      catch (e) { toast(T('mRestoreFail')); return 0; }
    },
    async privacyForm() {
      if (mode === 'debug') { toast(T('mPrivSim')); return; }
      if (AdMob) try { await AdMob.showPrivacyOptionsForm(); } catch (e) {}
    },
    // Intersticial (solo entre partidas; el ritmo lo decide el juego). Siempre resuelve, nunca bloquea.
    async showInterstitial() {
      if (owned.has(CFG.products.noAds)) return false;
      if (mode === 'debug' || mode === 'web') {
        return new Promise(res => {
          const o = overlay(`<div class="mon-t">Anuncio <small>(simulado · ${mode})</small></div><div class="mon-ad">AD</div><div class="mon-p" id="monIc">Puedes cerrarlo en 5…</div><div class="mon-row"><button class="mon-b no" data-a="0" style="visibility:hidden">✕ Cerrar</button></div>`);
          o.dataset.kind = 'interstitial'; let n = 5; const cd = o.querySelector('#monIc'), b = o.querySelector('button');
          const iv = setInterval(() => { n--; if (n > 0) cd.textContent = `Puedes cerrarlo en ${n}…`; else { clearInterval(iv); cd.textContent = '¡Gracias por apoyar a Mochi! 💕'; b.style.visibility = ''; } }, 1000);
          btnHandler(b, () => { if (n > 0) return; o.remove(); res(true); });
        });
      }
      if (mode !== 'native' || !AdMob || !consentOk || !CFG.admob.interstitialAndroid) return false;
      if (!intReady) { preloadInt(); return false; } // si no está cargado, no se espera: se juega
      intReady = false;
      try { await AdMob.showInterstitial(); } catch (e) { }
      preloadInt(); return true;
    },
    // Rewarded ad. Resolves true only if the reward was earned.
    async showRewarded() {
      if (mode === 'debug' || mode === 'web') {
        return new Promise(res => {
          const o = overlay(`<div class="mon-t">${T('mAdTest')} <small>${mode === 'web' ? '(simulado · web)' : T('mSim')}</small></div><div class="mon-ad">AD</div><div class="mon-p" id="monCd">${T('mAdEnds', { n: 3 })}</div><div class="mon-row"><button class="mon-b no" data-a="0">${T('mClose')}</button></div>`);
          let n = 3; const cd = o.querySelector('#monCd');
          const iv = setInterval(() => { n--; if (n > 0) cd.textContent = T('mAdEnds', { n }); else { clearInterval(iv); o.remove(); res(true); } }, 700);
          btnHandler(o.querySelector('button'), () => { clearInterval(iv); o.remove(); res(false); });
        });
      }
      if (mode !== 'native' || !AdMob) return false;
      if (!consentOk) { toast(T('mAdsNA')); return false; }
      if (!adReady) { await preloadAd(); }
      if (!adReady) { toast(T('mNoAd')); preloadAd(); return false; }
      adReady = false;
      // Reward is granted only via the "Reward" event; resolve when the ad is closed.
      return new Promise(async res => {
        let rewarded = false, done = false, hs = [];
        const finish = ok => { if (done) return; done = true; hs.forEach(h => h && h.remove && h.remove()); preloadAd(); res(ok); };
        try {
          hs.push(await AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; }));
          hs.push(await AdMob.addListener('onRewardedVideoAdDismissed', () => setTimeout(() => finish(rewarded), 150)));
          hs.push(await AdMob.addListener('onRewardedVideoAdFailedToShow', () => { toast(T('mAdFail')); finish(false); }));
          const r = await AdMob.showRewardVideoAd();
          if (r && (r.amount != null || r.type)) rewarded = true;
        } catch (e) { toast(T('mAdFail')); finish(false); }
      });
    }
  };
  window.Monet = Monet;
  if (NATIVE) { document.documentElement.classList.add('native'); initNative(); }
})();
