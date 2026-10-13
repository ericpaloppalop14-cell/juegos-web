/* Store prices/ownership originate in the existing native bridge. Browser never pays. */
(function(){
  const KEY='flappyGhostShop.v1',PACK=['cristal','umbra','algodon','rey','diablo'];
  const t=(key,params)=>window.FG_I18N.text(key,params);
  function load(){try{const p=JSON.parse(localStorage.getItem(KEY))||{};return {owned:Array.isArray(p.owned)?p.owned.filter(id=>typeof id==='string'):[],adsOff:!!p.adsOff,games:Number(p.games)||0,deaths:Number(p.deaths)||0,trial:typeof p.trial==='string'?p.trial:null};}catch{return {owned:[],adsOff:false,games:0,deaths:0,trial:null};}}
  const save=s=>{try{localStorage.setItem(KEY,JSON.stringify(s));}catch{}};
  function node(tag,parent,content){const n=document.createElement(tag);if(content!=null)n.textContent=content;parent?.append(n);return n;}
  function button(parent,key,fn,disabled=false){const b=node('button',parent,t(key));b.type='button';b.disabled=disabled;b.onclick=fn;return b;}
  const style=document.createElement('style');style.textContent='.fg-store-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #dcc4e5}.fg-store-row img{width:44px;height:44px;object-fit:contain}.fg-store-info{flex:1;min-width:0}.fg-store-name{font:700 17px Fredoka,system-ui}.fg-store-detail{font-size:12px}.fg-store-actions{display:flex;flex-direction:column;gap:5px}.fg-store-purchase{max-width:125px}.fg-store-links{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}';document.head.append(style);
  window.openGhostShop=function(game){
    let busy=false,shop=load(),statusKey=null;
    const panel=window.GhostUI.openPanel('shop',()=>{window.removeEventListener('ghost-entitlements',refresh);window.removeEventListener('ghost-privacy-changed',refresh);window.removeEventListener('ghost-products-changed',refresh);});
    const characters=window.FG_CHARACTERS;
    function status(key){statusKey=key;refresh();}
    function priced(parent,sku,run){const b=button(parent,'unavailable',run);const price=window.NativeBridge.price(sku);b.textContent=price||t('unavailable');b.disabled=busy||!price;b.className='fg-store-purchase';return b;}
    function row(title,detail,image){const r=node('div',panel.body);r.className='fg-store-row';if(image){const im=node('img',r);im.src=image;im.alt='';}const info=node('div',r);info.className='fg-store-info';node('div',info,title).className='fg-store-name';node('div',info,detail).className='fg-store-detail';return r;}
    async function operation(run,success,failure){if(busy)return;busy=true;statusKey='buying';refresh();let ok=false;try{ok=await run();}catch{}busy=false;if(ok)success?.();statusKey=ok?'restoreOK':failure;refresh();}
    async function buy(sku,ids=[],adsOff=false){
      if(busy)return;busy=true;statusKey='buying';refresh();let ok=false;try{ok=await window.NativeBridge.purchase(sku);}catch{}busy=false;
      if(ok){const next=load();next.owned=[...new Set([...next.owned,...ids])];if(adsOff)next.adsOff=true;save(next);game.syncShop(next);statusKey=null;}
      else statusKey=window.NativeBridge.isNative()?'purchaseIncomplete':'purchaseWeb';refresh();
    }
    async function trial(character){
      if(busy||character.purchaseOnly)return;busy=true;statusKey='buying';refresh();let ok=false;try{ok=await window.NativeBridge.showRewarded();}catch{}busy=false;
      if(ok){
        // Prepare the next run before granting the trial. A retry from a dead
        // screen resets its old trial; it must not clear the newly earned one.
        if(game.mode==='dead')game.reset(true);
        const next=load();next.trial=character.id;save(next);game.syncShop(next);game.selected=characters.findIndex(c=>c.id===character.id);try{localStorage.setItem('flappyGhostSkin.v1',String(game.selected));}catch{}statusKey=null;
      }else statusKey='adIncomplete';refresh();
    }
    function refresh(){
      if(!panel.dialog.isConnected)return;shop=load();panel.body.replaceChildren();
      node('p',panel.body,window.NativeBridge.isNative()?t('storeManaged',{store:window.NativeBridge.storeName()}):t('webCommerce'));
      const statusNode=node('p',panel.body,statusKey?t(statusKey):'');statusNode.className='fg-status';statusNode.setAttribute('role','status');
      const links=node('div',panel.body);links.className='fg-store-links';
      button(links,'restore',()=>operation(()=>window.NativeBridge.restorePurchases(),()=>game.syncShop(),'restoreError'),busy||!window.NativeBridge.isNative());
      if(window.NativeBridge.isNative()&&window.NativeBridge.privacyOptionsRequired())button(links,'privacyOptions',async()=>{
        if(busy)return;busy=true;refresh();let ok=false;
        try{ok=await window.NativeBridge.privacyOptions();}catch{}finally{busy=false;}
        if(!ok)statusKey='privacyUnavailable';refresh();
      },busy);
      const policy=node('a',links,t('privacyPolicy'));policy.href='politica-privacidad.html';policy.className='fg-action secondary';policy.onclick=event=>{event.preventDefault();window.GhostUI.openPolicy();};
      const ads=row(t('removeAds'),t(shop.adsOff?'active':'adsOffDescription'));if(!shop.adsOff)priced(ads,'remove_ads',()=>buy('remove_ads',[],true));
      const complete=PACK.every(id=>shop.owned.includes(id));const pack=row(t('rarityPack'),t(complete?'complete':'rarityNames'));if(!complete)priced(pack,'rarity_pack',()=>buy('rarity_pack',PACK));
      for(let i=0;i<characters.length;i++){
        const c=characters[i],byScore=!c.purchaseOnly&&game.best>=c.unlock,owned=shop.owned.includes(c.id),open=game.isUnlocked(i);
        const detail=open?t(owned&&!byScore?'purchased':'yours'):c.purchaseOnly?t('exclusivePurchase'):t('scoreUnlock',{score:c.unlock});
        const r=row(window.FG_I18N.character(c),detail,'game/chars/'+i+'.png');
        if(open)button(r,game.selected===i?'chosen':'use',()=>{if(busy)return;game.selected=i;try{localStorage.setItem('flappyGhostSkin.v1',String(i));}catch{}refresh();},busy);
        else if(c.id!=='corona'&&(c.purchaseOnly||c.unlock>=75||PACK.includes(c.id))){const actions=node('div',r);actions.className='fg-store-actions';priced(actions,'skin_'+c.id,()=>buy('skin_'+c.id,[c.id]));if(!c.purchaseOnly)button(actions,'trialAd',()=>trial(c),busy||!window.NativeBridge.isNative()||shop.adsOff);}
      }
    }
    const update=panel.updateLanguage;panel.updateLanguage=()=>{update();refresh();};
    window.addEventListener('ghost-entitlements',refresh);window.addEventListener('ghost-privacy-changed',refresh);window.addEventListener('ghost-products-changed',refresh);refresh();window.NativeBridge.ready.then(refresh);window.NativeBridge.refreshPrivacyOptions();if(window.NativeBridge.isNative())void window.NativeBridge.refreshProducts();
  };
})();
