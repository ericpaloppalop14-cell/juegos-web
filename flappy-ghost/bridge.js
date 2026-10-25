// Browsers never simulate paid purchases or rewarded ads.
(() => {
  const ios=()=>window.webkit?.messageHandlers?.ghostNative;
  const android=()=>window.AndroidNative;
  const modern=()=>ios()||window.AndroidStore;
  const requests=new Map(),prices=new Map();let sequence=0,pendingAd=null,pendingPurchase=null,privacyRequired=false,privacyRevision=0,productsPending=null,rewardedPending=false,lastResumeRefresh=Date.now();
  const nonce=(()=>{try{if(window.crypto?.randomUUID)return window.crypto.randomUUID();if(window.crypto?.getRandomValues)return [...window.crypto.getRandomValues(new Uint32Array(4))].map(n=>n.toString(16).padStart(8,'0')).join('');}catch{}return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);})();
  function call(method,args={},timeoutMs=120000) {
    if(!modern())return Promise.resolve(null);
    const id=nonce+':'+String(++sequence);
    return new Promise(resolve=>{
      const timer=setTimeout(()=>{requests.delete(id);resolve(null);},timeoutMs);
      requests.set(id,{resolve,timer});
      try{const message={id,method,...args}; if(ios())ios().postMessage(message);else window.AndroidStore.postMessage(JSON.stringify(message));}catch{clearTimeout(timer);requests.delete(id);resolve(null);}
    });
  }
  window.onGhostNativeResult=(id,value)=>{
    const p=requests.get(String(id));if(!p)return;
    clearTimeout(p.timer);requests.delete(String(id));p.resolve(value);
  };
  window.onGhostPrivacyStatus=required=>{
    privacyRevision++;
    const next=required===true;if(next===privacyRequired)return;
    privacyRequired=next;window.dispatchEvent(new Event('ghost-privacy-changed'));
  };
  function applyEntitlements(ids) {
    if(!Array.isArray(ids))return;
    let s;try{s=JSON.parse(localStorage.getItem('flappyGhostShop.v1'))||{};}catch{s={};}
    const owned=[];let adsOff=false;
    for(const p of window.FG_PRODUCTS)if(ids.includes(p.id)){
      if(p.skin)owned.push(p.skin);if(p.skins)owned.push(...p.skins);if(p.adsOff)adsOff=true;
    }
    s.owned=[...new Set(owned)];s.adsOff=adsOff;
    try{localStorage.setItem('flappyGhostShop.v1',JSON.stringify(s));}catch{}
    window.dispatchEvent(new Event('ghost-entitlements'));
  }
  window.onGhostEntitlements=applyEntitlements;
  window.onNativeAdResult=ok=>{if(pendingAd){const p=pendingAd;pendingAd=null;p(!!ok);}};
  window.onNativePurchaseResult=(sku,ok)=>{if(pendingPurchase?.sku===sku){const p=pendingPurchase;pendingPurchase=null;p.resolve(!!ok);}};
  function legacyAd(method) {
    if(!android()||pendingAd)return Promise.resolve(false);
    return new Promise(resolve=>{
      const finish=value=>{clearTimeout(timer);if(pendingAd===finish)pendingAd=null;resolve(value);};
      const timer=setTimeout(()=>finish(false),120000);pendingAd=finish;
      try{android()[method]();}catch{finish(false);}
    });
  }
  async function requestRewarded(options={}){
    const purpose=options?.purpose??'trial',roundId=String(options?.roundId??'');
    if(rewardedPending||!['trial','continue'].includes(purpose)||purpose==='continue'&&!/^[0-9]{1,16}$/.test(roundId))return false;
    if(!modern()&&!android())return false;
    rewardedPending=true;window.dispatchEvent(new Event('ghost-ad-start'));
    try{
      return modern()?(await call('rewarded',{purpose,...(purpose==='continue'?{roundId}:{})}))?.ok===true:await legacyAd('showRewarded');
    }finally{rewardedPending=false;window.dispatchEvent(new Event('ghost-ad-end'));}
  }
  window.NativeBridge={
    isModern:()=>!!modern(),
    isNative:()=>!!(modern()||android()),
    storeName:()=>ios()?'App Store':(window.AndroidStore||android())?'Google Play':window.FG_I18N.text('webPreview'),
    shareScore:(score,best,language)=>call('shareScore',{score,best,language},10000),
    // 1.0.17: Rate (Play listing / In-App Review) and Share app. Native only; never tied to rewards.
    shareApp:()=>modern()?call('shareApp',{},10000):Promise.resolve(null),
    rateApp:()=>modern()?call('rateApp',{},10000):Promise.resolve(null),
    requestReview:()=>modern()?call('requestReview',{},20000):Promise.resolve(null),
    syncLanguage(){
      // This one-way local preference uses the same origin-restricted bridge.
      // It never creates a purchase, ad request, entitlement or score update.
      if(!window.AndroidStore||!window.FG_I18N)return false;
      const language=window.FG_I18N.language();
      if(window.FG_I18N.normalizeLanguage(language)!==language)return false;
      try{window.AndroidStore.postMessage(JSON.stringify({id:nonce+':lang:'+String(++sequence),method:'language',language}));return true;}catch{return false;}
    },
    price:sku=>prices.get(sku)||null,
    async purchase(sku){
      if(!window.FG_PRODUCTS.some(p=>p.id===sku))return false;
      if(modern())return (await call('purchase',{sku}))?.ok===true;
      if(!android()||pendingPurchase)return false;
      return new Promise(resolve=>{
        const finish=value=>{clearTimeout(timer);if(pendingPurchase?.resolve===finish)pendingPurchase=null;resolve(value);};
        const timer=setTimeout(()=>finish(false),120000);pendingPurchase={sku,resolve:finish};
        try{android().launchPurchase(sku);}catch{finish(false);}
      });
    },
    async restorePurchases(){const r=await call('restore');if(r?.ok)applyEntitlements(r.ids);await this.refreshProducts();return r?.ok===true;},
    // Death/retry never show an interstitial. Only explicit opt-in rewards remain.
    async showInterstitial(){return false;},
    async showRewarded(options){return requestRewarded(options);},
    privacyOptionsRequired:()=>privacyRequired,
    async refreshPrivacyOptions(){
      const revision=privacyRevision;
      const result=await call('privacyStatus',{},10000);
      if(revision===privacyRevision)window.onGhostPrivacyStatus(result?.ok===true);
      return privacyRequired;
    },
    async privacyOptions(){const ok=(await call('privacy'))?.ok===true;await this.refreshPrivacyOptions();return ok;},
    async refreshProducts(){
      if(productsPending)return productsPending;
      const pending=(async()=>{
        const r=await call('products',{},10000),next=new Map();
        if(Array.isArray(r))for(const p of r)if(p&&window.FG_PRODUCTS.some(product=>product.id===p.id)&&typeof p.price==='string'&&p.price.trim())next.set(p.id,p.price);
        if(!next.size)return false;
        prices.clear();for(const [id,price]of next)prices.set(id,price);
        window.dispatchEvent(new Event('ghost-products-changed'));return true;
      })();
      productsPending=pending;
      try{return await pending;}finally{if(productsPending===pending)productsPending=null;}
    }
  };
  window.NativeBridge.ready=(async()=>{
    if(!modern())return;
    await window.NativeBridge.refreshProducts();
    const r=await call('entitlements');if(r?.ok)applyEntitlements(r.ids);
  })();
  window.addEventListener?.('ghost-native-resume',()=>{window.NativeBridge.refreshPrivacyOptions();if(window.NativeBridge.isNative()&&(!prices.size||Date.now()-lastResumeRefresh>=30000)){lastResumeRefresh=Date.now();void window.NativeBridge.refreshProducts();}});
  window.addEventListener?.('ghost-language-changed',()=>window.NativeBridge.syncLanguage());
  window.NativeBridge.syncLanguage();
  window.NativeBridge.refreshPrivacyOptions();
})();

