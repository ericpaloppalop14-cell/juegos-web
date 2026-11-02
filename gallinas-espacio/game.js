'use strict';
// ====== GALLINAS AL ESPACIO — motor del juego ======
const $ = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const PRUEBAS = qs.get('pruebas')==='1' || location.hash==='#pruebas';
const KEY = PRUEBAS ? 'gallinas_pruebas_v1' : 'gallinas_v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const fmtN = n => Math.floor(n).toLocaleString('es-ES');

// ---------- Guardado ----------
function defaults(){ return {coins:0,eggs:0,up:{},own:['clueca'],sel:'clueca',unlocked:1,best:{},snd:true,runs:0,planetSel:0}; }
let S = defaults();
try{ const raw=localStorage.getItem(KEY); if(raw) S=Object.assign(defaults(),JSON.parse(raw)); }catch(e){}
if(PRUEBAS){ S.coins=Math.max(S.coins,999999); S.eggs=Math.max(S.eggs,99999); S.own=CHICKENS.map(c=>c.id); S.unlocked=PLANETS.length; }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
const lvl = id => S.up[id]||0;
function chick(){ return CHICKENS.find(c=>c.id===S.sel)||CHICKENS[0]; }
function tierOf(){ const tot=Object.values(S.up).reduce((a,b)=>a+b,0); return tot>=32?2:tot>=12?1:0; }
function stats(){
  const fx=chick().fx;
  return { thrust:620*(1+0.09*lvl('motor'))*(1+(fx.thrust||0)), burn:(3.2+0.95*lvl('fuel'))*(1+(fx.fuel||0)), k:0.30*(1-0.03*lvl('aero')),
    launch:1+0.1*lvl('launch'), magnet:70+32*lvl('magnet')+(fx.magnet||0), shield:lvl('shield')+(fx.shield||0),
    hs:300*(1+0.07*lvl('agile')+(fx.turn||0)), coinMult:(1+0.12*lvl('coinmult'))*(1+(fx.coins||0)) };
}

// ---------- Audio (todo sintetizado) ----------
let AC=null, master=null, noiseBuf=null, engGain=null;
function audioInit(){
  if(AC) { if(AC.state==='suspended') AC.resume(); return; }
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)(); master=AC.createGain(); master.gain.value=S.snd?0.9:0; master.connect(AC.destination);
    noiseBuf=AC.createBuffer(1,AC.sampleRate*1,AC.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const src=AC.createBufferSource(); src.buffer=noiseBuf; src.loop=true; const f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=380; engGain=AC.createGain(); engGain.gain.value=0; src.connect(f); f.connect(engGain); engGain.connect(master); src.start();
  }catch(e){ AC=null; }
}
function tone(f,d,type,vol,slide,delay){ if(!AC||!S.snd) return; const t=AC.currentTime+(delay||0); const o=AC.createOscillator(), g=AC.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),t+d); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol||.15,t+.01); g.gain.exponentialRampToValueAtTime(.0008,t+d); o.connect(g); g.connect(master); o.start(t); o.stop(t+d+.05); }
function noise(d,freq,vol,delay,q){ if(!AC||!S.snd) return; const t=AC.currentTime+(delay||0); const s=AC.createBufferSource(); s.buffer=noiseBuf; const f=AC.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=q||.8; const g=AC.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+d); s.connect(f); f.connect(g); g.connect(master); s.start(t,Math.random()*.5); s.stop(t+d+.05); }
const SFX={
  coin(c){ const b=880*Math.pow(1.0595,Math.min(c,14)); tone(b,.09,'triangle',.13); tone(b*1.5,.14,'sine',.08,1,.05); },
  egg(){ tone(520,.08,'sine',.14); tone(780,.12,'sine',.12,1,.06); tone(1040,.16,'triangle',.08,1,.12); },
  golden(){ [523,659,784,1046,1318].forEach((f,i)=>tone(f,.25,'triangle',.14,1,i*.07)); },
  hit(){ noise(.3,260,.5); tone(150,.25,'sawtooth',.2,.4); },
  shield(){ tone(900,.1,'square',.1,1.8); tone(1400,.18,'sine',.1,.7,.05); },
  flap(){ noise(.12,1800,.12,0,1.2); tone(420,.07,'sine',.05,1.5); },
  launch(){ noise(.9,500,.4,0,.6); tone(110,.8,'sawtooth',.15,3); },
  cluck(){ tone(620,.07,'square',.07,.55); tone(540,.09,'square',.06,.55,.1); },
  fuel(){ tone(300,.08,'square',.1,2); tone(600,.12,'square',.1,1.5,.08); },
  turbo(){ tone(200,.6,'sawtooth',.14,5); noise(.6,1200,.2); },
  magnet(){ tone(400,.3,'sine',.12,2.5); tone(600,.3,'sine',.1,2,.1); },
  buy(){ [660,880,1100].forEach((f,i)=>tone(f,.14,'triangle',.13,1,i*.07)); },
  deny(){ tone(180,.2,'square',.1,.7); },
  land(){ [523,659,784,1046,784,1046,1318].forEach((f,i)=>tone(f,.22,'triangle',.15,1,i*.1)); },
  tick(){ tone(1000,.05,'square',.05); },
  perfect(){ [784,988,1175,1568].forEach((f,i)=>tone(f,.18,'triangle',.15,1,i*.06)); }
};
function vib(ms){ if(S.snd && navigator.vibrate) try{ navigator.vibrate(ms); }catch(e){} }

// ---------- Lienzo ----------
const cv=$('c'), cx=cv.getContext('2d');
const LW=480; let LH=854, SC=1;
function resize(){ const r=$('app').getBoundingClientRect(); const dpr=Math.min(window.devicePixelRatio||1,2); cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr); SC=cv.width/LW; LH=cv.height/SC; }
window.addEventListener('resize',resize); resize();

// ---------- Estado de la partida ----------
let G=null, now=0, lastTime=0;
const RK_SC=.9;
function rocketY(){ return LH*(G?G.cam:.52); }
function target(){ return PLANETS[S.planetSel].dist; }
function P(){ return PLANETS[S.planetSel]; }
const STARS=Array.from({length:110},()=>({x:Math.random(),y:Math.random(),s:.6+Math.random()*2,p:Math.random()*6,f:Math.random()}));
const LINESX=Array.from({length:16},()=>({x:Math.random()*LW,p:Math.random(),l:.5+Math.random()}));

function newRun(){
  G={ mode:'idle', t:0, alt:0, vy:0, x:LW/2, vx:0, dir:1, fuel:0, fuelMax:0, shield:0, shieldMax:0, coins:0, eggs:0, combo:0, comboT:0, maxAlt:0, hits:0,
    items:[], hazards:[], parts:[], texts:[], shake:0, flash:0, flashCol:'255,60,60', speechT:0, speech:'', speechAt:-9, squash:0, turbo:0, magT:0, inv:0, nextChunk:0, midT:6,
    st:stats(), cam:.52,launchP:0, launchZ:.65, power:0, landT:0, endT:0, mile:0, picks:0, perfect:false, tapT:0, mood:'happy', moodT:0, hop:0, nearMiss:0 };
  for(let i=0;i<3;i++) spawnChunk(G.nextChunk++);
}

// ---------- Generación de coleccionables y obstáculos ----------
const CH_H=560;
function patPoints(kind,cxx,y0){
  const pts=[]; let i;
  switch(kind){
    case 'arc': for(i=0;i<9;i++){ const a=Math.PI*i/8; pts.push([cxx+Math.cos(a)*115,y0+Math.sin(a)*140]); } break;
    case 'wave': for(i=0;i<12;i++) pts.push([cxx+Math.sin(i*.75)*115,y0+i*38]); break;
    case 'col': for(i=0;i<8;i++) pts.push([cxx,y0+i*44]); break;
    case 'zig': for(i=0;i<10;i++) pts.push([cxx+(((i>>1)%2)?1:-1)*(i%2?70:40),y0+i*40]); break;
    case 'ring': for(i=0;i<10;i++){ const a=i/10*TAU; pts.push([cxx+Math.cos(a)*78,y0+Math.sin(a)*78]); } pts.push([cxx,y0]); break;
    case 'heart': for(i=0;i<20;i++){ const t=i/20*TAU; pts.push([cxx+16*Math.pow(Math.sin(t),3)*6.2,y0+(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*6.2+100]); } break;
    case 'diag': { const dir=cxx<240?1:-1; for(i=0;i<10;i++) pts.push([cxx-dir*120+dir*i*27,y0+i*40]); break; }
    case 'vee': for(i=0;i<9;i++) pts.push([cxx+(i-4)*30,y0+Math.abs(i-4)*34]); break;
  }
  return pts.map(p=>[clamp(p[0],36,LW-36),p[1]]);
}
const KINDS=['arc','wave','col','zig','ring','heart','diag','vee'];
function addItem(type,x,y,col){ G.items.push({type,x,y,r:type==='golden'?20:type==='corn'?20:type==='turbo'?22:type==='magnet'?20:type==='egg'?17:15,ph:Math.random()*6,col:col||0,sy:0,got:false}); }
function spawnChunk(i){
  const base=130+i*CH_H, T=target(), tt=base/T, p=P();
  const npat=i===0?2:(Math.random()<.65?2:1);
  let side=Math.random()<.5?-1:1; let firstCx=240;
  for(let k=0;k<npat;k++){
    const cxx=clamp(240+side*(60+Math.random()*80)*(k?1:1),90,390); side=-side; if(k===0) firstCx=cxx;
    const kind=i===0?(k?'ring':'arc'):KINDS[Math.floor(Math.random()*KINDS.length)];
    const y0=base+k*(CH_H*.5)+Math.random()*30;
    const eggs=i>0&&Math.random()<.3, ec=Math.floor(Math.random()*5);
    const pts=patPoints(kind,cxx,y0);
    pts.forEach((pt,j)=>{ if(kind==='ring'&&j===pts.length-1){ addItem(i===0||Math.random()<.35?'golden':'egg',pt[0],pt[1],ec); } else addItem(eggs?'egg':'coin',pt[0],pt[1],eggs?(ec+j)%5:0); });
  }
  const opp=firstCx<240?1:-1;
  if(i%3===1) addItem('corn',clamp(240+opp*110,50,430),base+CH_H*.45);
  if(i%7===4) addItem('turbo',clamp(240+opp*60,50,430),base+CH_H*.2);
  if(i%6===3) addItem('magnet',clamp(240-opp*80,50,430),base+CH_H*.3);
  if(i>=2&&i%5!==0&&Math.random()<.15) addItem('golden',clamp(240+opp*120,50,430),base+CH_H*.35);
  // obstáculos (desde el 2º tramo)
  if(i>=2){
    const n=i<5?1:i<12?2:3;
    for(let h=0;h<n;h++){
      const pool=[]; if(tt<.3) pool.push('pigeon'); if(tt>.05&&tt<.55) pool.push('storm'); if(tt>.1) pool.push(p.hazard,p.hazard); if(tt>.45) pool.push('ufo','sat');
      const type=pool[Math.floor(Math.random()*pool.length)];
      const r={pigeon:30,storm:46,rock:44,potato:46,pan:46,whisk:42,ufo:46,sat:34}[type]+Math.random()*8;
      const x=h===0?clamp(240+opp*(90+Math.random()*90),r+10,LW-r-10):40+r+Math.random()*(LW-80-2*r);
      const y=base+80+h*190+Math.random()*120;
      const mv=(type==='pigeon'?(80+Math.random()*50):type==='ufo'?(50+Math.random()*40):0)*(Math.random()<.5?-1:1);
      G.hazards.push({type,x,y,x0:x,r,vx:mv,ph:Math.random()*6,spin:(Math.random()-.5)*1.6,sy:0,dead:false,wob:type==='storm'||type==='pan'?20:0});
    }
  }
}

// ---------- Partículas / textos / habla ----------
function burst(x,y,n,col,o){ o=o||{}; for(let i=0;i<n;i++){ const a=Math.random()*TAU, sp=(o.sp||200)*(.3+Math.random()); G.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp+(o.up||0),life:(o.life||.6)*(.6+Math.random()*.6),max:(o.life||.6),size:(o.size||6)*(.6+Math.random()*.8),col:Array.isArray(col)?col[i%col.length]:col,type:o.type||'circle',g:o.g===undefined?-300:o.g,rot:Math.random()*6,vr:(Math.random()-.5)*12}); } }
function floatText(x,y,txt,col,size){ G.texts.push({x,y,txt,col:col||'#fff',life:.9,size:size||22}); }
function say(txt,dur,force){ if(!force && G.speechT>0 && now-G.speechAt<1.2) return; G.speech=txt; G.speechT=dur||2.4; G.speechAt=now; }
let bannerTO=0;
function banner(txt,ms){ const b=$('banner'); b.textContent=txt; b.classList.add('on'); clearTimeout(bannerTO); bannerTO=setTimeout(()=>b.classList.remove('on'),ms||1500); }

// ---------- Flujo ----------
function goMenu(){ newRun(); $('menu').classList.remove('hide'); $('hud').classList.add('hide'); $('launch').classList.add('hide'); $('results').classList.add('hide'); updateMenu(); }
function beginLaunch(){
  if(S.planetSel>=S.unlocked) { toast('🔒 Llega primero al planeta anterior'); SFX.deny(); return; }
  audioInit(); newRun(); G.mode='launch'; G.launchZ=.5+Math.random()*.35;
  $('zone').style.left=((G.launchZ-.1)*100)+'%'; $('zone').style.width='20%';
  $('pgIcon').textContent=P().emoji; $('menu').classList.add('hide'); $('launch').classList.remove('hide'); $('hud').classList.add('hide'); $('panel').classList.add('hide');
  say(rnd(['¡Toca cuando la plumita esté en lo verde!','Respira hondo... y cacarea.','Cinturón puesto. ¿Qué cinturón?']),2.6,true);
}
function doLaunch(){
  const p=G.launchP; const perfect=Math.abs(p-G.launchZ)<.1; G.perfect=perfect;
  G.power=perfect?1.12:.5+.5*p; const st=G.st;
  G.vy=415*G.power*st.launch; G.fuel=G.fuelMax=st.burn; G.shield=G.shieldMax=st.shield;
  G.mode='fly'; G.t=0; $('launch').classList.add('hide'); $('hud').classList.remove('hide'); buildShields(); G.dir=Math.random()<.5?-1:1;
  burst(LW/2,-30,26,['#ffffff','#e8e4ff','#ffd9a0'],{sp:260,life:1.0,size:16,g:20,type:'puff'}); G.shake=perfect?16:10; SFX.launch(); SFX.cluck(); vib(40);
  say(perfect?rnd(LINES.perfect):rnd(LINES.launch),2.2,true); if(perfect){ banner('¡PERFECTO!',1100); SFX.perfect(); burst(LW/2,0,22,['#ffd23f','#ff5fa8','#1fc9c0'],{sp:330,type:'star',size:9,life:.9}); }
  G.hop=1;
}
function tap(){
  audioInit();
  if(!G) return;
  if(G.mode==='launch'){ doLaunch(); return; }
  if(G.mode==='fly'||G.mode==='end'){ if(now-G.tapT<.07) return; G.tapT=now; G.dir*=-1; G.squash=1; SFX.flap();
    burst(G.x-G.dir*-30,G.alt-10,4,['#fff','#ffe9a8'],{sp:140,life:.5,size:7,type:'feather',g:-80});
    if(Math.random()<.06) say(rnd(LINES.tap),1.4); return; }
  if(G.mode==='idle'){ G.hop=1; SFX.cluck(); say(rnd(['¡Cocoricó! ¡Dale a despegar!','¿Ya? ¡Que me da el ataque!','Toca el botón rosa, anda.','Cloc, cloc, ¡vamos!']),2,true); burst(G.x,40,8,['#fff','#ffe9a8'],{sp:160,type:'feather',size:8}); }
}
function finishRun(landed){
  const p=P(), m=G.maxAlt/4; const distBonus=Math.floor(m/10*p.mult);
  let coins=Math.floor(G.coins)+distBonus, eggs=Math.floor(G.eggs), bonusTxt=[];
  if(distBonus>0) bonusTxt.push('Bonus de altura: +'+distBonus+' monedas');
  let unlockedName=null;
  if(landed){ coins+=p.coins; eggs+=p.eggs; bonusTxt.push('¡Bonus de planeta! +'+fmtN(p.coins)+' 🪙 +'+p.eggs+' 🥚'); if(S.planetSel+1<PLANETS.length && S.unlocked<=S.planetSel+1){ S.unlocked=S.planetSel+2; unlockedName=PLANETS[S.planetSel+1].name; bonusTxt.push('🔓 ¡Desbloqueado: '+unlockedName+'!'); } }
  S.coins+=coins; S.eggs+=eggs; S.runs++; S.best[p.id]=Math.max(S.best[p.id]||0,G.maxAlt); save();
  $('hud').classList.add('hide'); $('results').classList.remove('hide');
  $('rTitle').textContent=landed?'¡PLANETA ALCANZADO!':'¡Aterrizaje de emergencia!';
  $('rLine').textContent=landed?rnd(LINES.land)+' ('+p.name+')':rnd(LINES.fail)+' Te faltaron '+fmtN((p.dist-G.maxAlt)/4)+' m para '+p.name+'.';
  const holder=$('rPlanet'); holder.innerHTML=''; const pc=document.createElement('canvas'); pc.width=pc.height=240; holder.appendChild(pc); const c2=pc.getContext('2d'); drawPlanet(c2,120,120,86,p,0); if(!landed){ c2.globalCompositeOperation='source-atop'; c2.fillStyle='rgba(40,25,90,.35)'; c2.fillRect(0,0,240,240); }
  $('rAlt').textContent=fmtM(G.maxAlt);
  countUp($('rCoins'),coins); countUp($('rEggs'),eggs);
  $('rBonus').innerHTML=bonusTxt.join('<br>');
  if(landed){ SFX.land(); } else SFX.cluck();
  G.mode='done';
}
function countUp(el,v){ const t0=performance.now(); const f=()=>{ const k=clamp((performance.now()-t0)/900,0,1); el.textContent=fmtN(v*(1-Math.pow(1-k,3))); if(k<1) requestAnimationFrame(f); }; f(); }
function fmtM(alt){ const m=alt/4; return m<1000?Math.floor(m)+' m':(m/1000).toFixed(1).replace('.',',')+' km'; }

// ---------- Actualización ----------
function update(dt){
  G.t+=dt; G.cam=lerp(G.cam,G.mode==='idle'?.52:G.mode==='launch'?.58:.65,Math.min(1,dt*(G.mode==='fly'?3:6))); const st=G.st=G.mode==='fly'||G.mode==='end'||G.mode==='land'?G.st:stats();
  G.speechT-=dt; G.shake=Math.max(0,G.shake-dt*40); G.flash=Math.max(0,G.flash-dt*2.2); G.squash=Math.max(0,G.squash-dt*5); G.hop=Math.max(0,G.hop-dt*2.2); G.moodT-=dt; if(G.moodT<=0) G.mood='happy';
  G.inv=Math.max(0,G.inv-dt); G.turbo=Math.max(0,G.turbo-dt); G.magT=Math.max(0,G.magT-dt); G.comboT-=dt; if(G.comboT<=0) G.combo=0;
  const m=G.mode;
  if(m==='launch'){ G.launchP=Math.abs(((G.t*.95)%2)-1); $('marker').style.left=(G.launchP*100)+'%'; if(Math.random()<.5) G.parts.push({x:G.x+(Math.random()-.5)*20,y:-40,vx:(Math.random()-.5)*60,vy:20+Math.random()*30,life:.5,max:.5,size:8,col:'#fff',type:'puff',g:0,rot:0,vr:0}); }
  if(m==='fly'||m==='end'||m==='land'){
    const T=target(), tt=G.alt/T;
    // física vertical
    if(m==='fly'){
      const g=240*Math.max(.1,1-G.alt/40000); let acc=-g-st.k*G.vy; const th=G.fuel>0;
      if(th){ acc+=st.thrust*(G.turbo>0?1.8:1); G.fuel-=dt; }
      G.vy+=acc*dt; if(G.fuel<=0&&G.vy<80){ G.mode='end'; G.endT=0; G.vy=Math.min(G.vy,60); say(rnd(LINES.apex),2.2,true); banner('¡Sin maíz!',1100); SFX.cluck(); }
      if(G.alt>=T-140){ G.mode='land'; G.landT=0; say(rnd(LINES.land),2.6,true); banner('¡PLANETA A LA VISTA!',1500); SFX.land(); vib(60); }
    } else if(m==='end'){ G.endT+=dt; G.vy=lerp(G.vy,-150,Math.min(1,dt*2.5)); if(G.alt<=0){ G.alt=0; } if(G.endT>2.0){ finishRun(false); return; } }
    else if(m==='land'){ G.landT+=dt; { const d=T+90-G.alt; const cap=Math.max(25,d*3); G.vy=Math.min(lerp(G.vy,cap,Math.min(1,dt*9)),cap); } if(Math.random()<.5) burst(Math.random()*LW,G.alt+Math.random()*500,2,['#ffd23f','#ff5fa8','#1fc9c0','#8a5cff','#fff'],{sp:200,type:'confetti',size:9,life:1.6,g:-160}); if(G.landT>2.7){ finishRun(true); return; } }
    G.alt+=G.vy*dt; G.maxAlt=Math.max(G.maxAlt,G.alt);
    // horizontal
    const hs=st.hs; G.vx+=((G.dir*hs)-G.vx)*Math.min(1,dt*9); G.x+=G.vx*dt; if(G.x<42){ G.x=42; G.dir=1; } if(G.x>LW-42){ G.x=LW-42; G.dir=-1; }
    // humo / llama
    if(m==='fly'&&G.fuel>0||m==='land'){ const n=G.turbo>0?3:1; for(let i=0;i<n;i++) G.parts.push({x:G.x+(Math.random()-.5)*14,y:G.alt-70*RK_SC,vx:(Math.random()-.5)*70-G.vx*.1,vy:-120-Math.random()*120-Math.max(0,G.vy)*.1,life:.55,max:.55,size:10+Math.random()*8,col:G.turbo>0?'#ff9ad5':(Math.random()<.5?'#ffd9a0':'#fff'),type:'puff',g:0,rot:0,vr:0}); }
    // spawn
    while(G.alt+LH*1.6>130+G.nextChunk*CH_H && 130+G.nextChunk*CH_H<T+400){ spawnChunk(G.nextChunk++); }
    // mover hazards
    for(const h of G.hazards){ if(h.vx){ h.x+=h.vx*dt; if(h.x<h.r||h.x>LW-h.r) h.vx*=-1; } if(h.wob) h.x=h.x0+Math.sin(G.t*1.6+h.ph)*h.wob; }
    // imán
    const mR=st.magnet*(G.magT>0?2.4:1);
    // colisiones con coleccionables
    for(const it of G.items){ if(it.got) continue; const dx=G.x-it.x, dy=G.alt-it.y; const d=Math.hypot(dx,dy);
      if((it.type==='coin'||it.type==='egg'||it.type==='golden'||it.type==='corn')&&d<mR+(G.magT>0?60:0)){ const pull=clamp(1-d/(mR+40),.15,1)*(900+Math.abs(G.vy)*1.2)*dt; it.x+=dx/d*Math.min(pull,d); it.y+=dy/d*Math.min(pull,d); }
      if(d<it.r+34) collect(it); }
    for(const h of G.hazards){ if(h.dead||m==='land') continue; const d=Math.hypot(G.x-h.x,G.alt-h.y); if(d<h.r*.82+24){ hitHazard(h); } else if(d<h.r*.82+55 && !h.near){ h.near=true; G.nearMiss++; } }
    // hitos y charla
    const marks=[.25,.5,.8]; if(G.mile<3&&tt>marks[G.mile]){ banner(['¡Adiós, atmósfera!','¡Mitad de camino!','¡Ya casi llegamos!'][G.mile],1300); G.mile++; }
    G.midT-=dt; if(G.midT<=0&&m==='fly'){ say(rnd(LINES.mid),2.6); G.midT=7+Math.random()*4; }
    if(G.speed===undefined) G.speed=0; G.speed=lerp(G.speed,Math.max(0,G.vy),Math.min(1,dt*4));
    G.items=G.items.filter(i=>!i.got&&i.y>G.alt-LH*.9); G.hazards=G.hazards.filter(h=>!h.dead&&h.y>G.alt-LH*.9);
    G.mood=G.moodT>0?G.mood:(G.vy>900?'panic':'happy');
    // HUD
    $('hAlt').textContent=fmtM(G.alt); $('hCoins').textContent=fmtN(G.coins); $('hEggs').textContent=fmtN(G.eggs);
    $('pgBar').style.height=(clamp(G.alt/T,0,1)*100)+'%'; $('fuelBar').style.width=(clamp(G.fuel/G.fuelMax,0,1)*100)+'%';
    if(engGain&&AC) engGain.gain.value=S.snd?(m==='fly'&&G.fuel>0?(.16+.12*Math.min(1,G.vy/2000)+(G.turbo>0?.12:0)):0):0;
  } else { if(engGain&&AC) engGain.gain.value=0; }
  if(m==='idle'){ G.dir=1; }
  // partículas
  for(const p of G.parts){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=p.g*dt; p.rot+=p.vr*dt; }
  G.parts=G.parts.filter(p=>p.life>0); if(G.parts.length>400) G.parts.splice(0,G.parts.length-400);
  for(const t of G.texts){ t.life-=dt; t.y+=70*dt; } G.texts=G.texts.filter(t=>t.life>0);
}
function collect(it){
  it.got=true; const st=G.st, p=P(); G.picks++;
  if(it.type==='coin'){ G.combo++; G.comboT=1.3; const cm=Math.min(5,1+Math.floor(G.combo/8)); const v=st.coinMult*cm*p.mult; G.coins+=v; SFX.coin(G.combo%15); burst(it.x,it.y,5,['#ffd23f','#fff7b0'],{sp:140,life:.4,size:5,type:'star',g:0});
    if(G.combo%4===1) floatText(it.x,it.y+20,'+'+Math.max(1,Math.round(v)),'#fff3a0',20); if(cm>1&&G.combo%8===0){ banner('COMBO x'+cm+'!',700); } if(G.picks%23===0) say(rnd(LINES.coin),1.8); }
  else if(it.type==='egg'){ G.eggs+=1; SFX.egg(); burst(it.x,it.y,8,EGGCOL[it.col%5],{sp:170,life:.5,size:6,type:'star',g:-100}); if(G.eggs%2===1) floatText(it.x,it.y+20,'+1 🥚','#fff',22); if(Math.random()<.18) say(rnd(LINES.egg),1.8); }
  else if(it.type==='golden'){ G.eggs+=10; G.coins+=50*st.coinMult*p.mult; SFX.golden(); vib(30); burst(it.x,it.y,26,['#ffd23f','#fff7b0','#ff9d2e','#fff'],{sp:320,life:.9,size:9,type:'star',g:-80}); floatText(it.x,it.y+30,'+10 🥚','#ffe36b',30); G.flash=.5; G.flashCol='255,225,110'; say(rnd(LINES.golden),2.2,true); banner('¡HUEVO DORADO!',900); G.shake=8; }
  else if(it.type==='corn'){ G.fuel=Math.min(G.fuelMax*1.25,G.fuel+.9+G.fuelMax*.05); if(G.mode==='end'&&G.fuel>0){ G.mode='fly'; } SFX.fuel(); burst(it.x,it.y,10,['#ffe36b','#ffb300','#5fcf5a'],{sp:180,life:.5,size:6,g:-200}); floatText(it.x,it.y+20,'¡Maíz!','#ffe36b',22); say(rnd(LINES.fuel),1.8); }
  else if(it.type==='turbo'){ G.turbo=1.6; G.vy+=180; SFX.turbo(); vib(50); G.flash=.6; G.flashCol='255,120,200'; G.shake=12; burst(it.x,it.y,24,['#ff5fa8','#ffc2ea','#fff'],{sp:380,life:.7,size:8,type:'star',g:0}); say(rnd(LINES.turbo),2,true); banner('¡TURBO!',900); if(G.mode==='end'){ G.fuel=Math.max(G.fuel,1.5); G.mode='fly'; } }
  else if(it.type==='magnet'){ G.magT=6; SFX.magnet(); burst(it.x,it.y,14,['#ff4f5e','#fff','#3aa0ff'],{sp:240,life:.6,size:7,type:'star',g:0}); say(rnd(LINES.magnet),1.8,true); banner('¡IMÁN!',800); }
}
function hitHazard(h){
  if(G.inv>0&&G.turbo<=0) return;
  h.dead=true; burst(h.x,h.y,14,['#fff','#ffe9a8','#b7b3d6'],{sp:260,life:.7,size:9,type:'feather',g:-200});
  if(G.turbo>0){ SFX.hit(); G.shake=6; floatText(h.x,h.y+20,'¡PUM!','#ff9ad5',26); return; }
  if(G.shield>0){ G.shield--; buildShields(); SFX.shield(); G.flash=.35; G.flashCol='120,220,255'; G.inv=.8; say(rnd(LINES.shield),1.8,true); floatText(G.x,G.alt+80,'¡Escudo!','#9be8ff',26); burst(G.x,G.alt,14,['#9be8ff','#fff'],{sp:240,life:.6,size:7,type:'star',g:0}); return; }
  G.hits++; G.vy*=.5; G.inv=1.1; G.shake=18; G.flash=.6; G.flashCol='255,70,70'; G.mood='hurt'; G.moodT=.9; SFX.hit(); vib(80);
  say(rnd(LINES.hit),2,true); floatText(G.x,G.alt+80,'¡AUCH!','#ff8a8a',30);
  burst(G.x,G.alt,12,['#fff','#ffe9a8'],{sp:300,life:.9,size:10,type:'feather',g:-260});
  if(G.mode==='end'){ G.endT+=.6; }
}
function buildShields(){ const s=$('shields'); s.textContent=''; for(let i=0;i<G.shield;i++){ const e=document.createElement('span'); e.textContent='🍲'; s.appendChild(e); } }

// ---------- Dibujo ----------
function screenY(wy,zoomed){ return rocketY()-(wy-G.alt); }
function render(){
  const c=cx; c.setTransform(SC,0,0,SC,0,0); const W=LW,H=LH;
  const p=P(), T=p.dist, tt=clamp(G.alt/T,0,1.2);
  // cielo
  const [top,bot]=skyColors(tt,p); const sg=c.createLinearGradient(0,0,0,H); sg.addColorStop(0,rgb(top)); sg.addColorStop(1,rgb(bot)); c.fillStyle=sg; c.fillRect(0,0,W,H);
  // estrellas
  const sa=clamp((tt-.28)/.35,0,1);
  if(sa>0.01){ c.fillStyle='#fff'; for(const s of STARS){ const y=((s.y*H+G.alt*.06*s.s)%H); const tw=.5+.5*Math.sin(G.t*3+s.p); c.globalAlpha=sa*(.4+.6*tw)*(s.f<.12?1:.75); if(s.f<.18){ sparkle(c,s.x*W,y,s.s*2.6,G.t*.5+s.p); } else { c.beginPath(); c.arc(s.x*W,y,s.s,0,TAU); c.fill(); } } c.globalAlpha=1; }
  // mini planeta lejano
  if(tt>.3&&tt<.97&&G.mode!=='idle'&&G.mode!=='launch'){ c.save(); c.globalAlpha=clamp((tt-.3)*3,0,.9); drawPlanet(c,W*.2,150-tt*40,16+50*Math.pow(tt,2.2),p,G.t); c.restore(); }
  // nubes (parallax)
  const ca=1-clamp((tt-.38)/.3,0,1);
  if(ca>.01){ const b0=Math.floor((G.alt*.6-200)/380)-1; for(let b=b0;b<b0+7;b++){ for(let k=0;k<2;k++){ const h=Math.abs(Math.sin(b*12.9898+k*78.233)*43758.5453)%1, h2=Math.abs(Math.sin(b*4.1+k*9.7)*9301.7)%1; const wy=b*380+k*190+h*120; const sy=rocketY()-(wy-G.alt*.6)*.9+0; if(sy<-100||sy>H+80) continue; drawCloud(c,h2*(W+60)-70+Math.sin(G.t*.2+b)*10,sy,.7+h*.9,ca*(k?.55:.9)); } } }
  // mundo con zoom
  const z=1-clamp((G.speed||0)-700,0,4500)/4500*.16; c.save(); c.translate(W/2,rocketY()); c.scale(z,z); c.translate(-W/2,-rocketY());
  if(G.shake>0) c.translate((Math.random()-.5)*G.shake,(Math.random()-.5)*G.shake);
  const groundY=rocketY()+G.alt+47; drawGround(c,W,H,groundY,G.t);
  // planeta destino
  const py=screenY(T+330); if(py>-420&&py<H+420){ drawPlanet(c,W/2+Math.sin(G.t*.6)*8,py,300,p,G.t); }
  // coleccionables y obstáculos
  const vis=(wy)=>{ const sy=screenY(wy); return sy>-90/z&&sy<H+90/z+120; };
  for(const h of G.hazards){ if(!vis(h.y)) continue; h.sy=screenY(h.y); drawHazard(c,h,G.t,p); }
  for(const it of G.items){ if(!vis(it.y)) continue; it.sy=screenY(it.y); drawItem(c,it,G.t); }
  // partículas
  for(const q of G.parts){ const sy=screenY(q.y); if(sy<-50||sy>H+50) continue; const k=clamp(q.life/q.max,0,1);
    c.save(); c.translate(q.x,sy); c.globalAlpha=q.type==='puff'?k*.8:Math.min(1,k*1.6);
    if(q.type==='puff'){ c.fillStyle=q.col; c.beginPath(); c.arc(0,0,q.size*(1.6-k*.8),0,TAU); c.fill(); }
    else if(q.type==='star'){ c.fillStyle=q.col; sparkle(c,0,0,q.size*(.5+k),q.rot); }
    else if(q.type==='feather'){ c.rotate(q.rot); c.fillStyle=q.col; c.beginPath(); c.ellipse(0,0,q.size*.8,q.size*.3,0,0,TAU); c.fill(); }
    else if(q.type==='confetti'){ c.rotate(q.rot); c.fillStyle=q.col; c.fillRect(-q.size/2,-q.size/4,q.size,q.size/2*Math.abs(Math.cos(q.rot*2))+1); }
    else { c.fillStyle=q.col; c.beginPath(); c.arc(0,0,q.size*k,0,TAU); c.fill(); }
    c.restore(); }
  // imán visual
  if(G.magT>0&&(G.mode==='fly')){ c.save(); c.globalAlpha=.25+.15*Math.sin(G.t*10); c.strokeStyle='#ff6b8e'; c.lineWidth=4; c.setLineDash([10,10]); c.lineDashOffset=-G.t*60; c.beginPath(); c.arc(G.x,rocketY(),G.st.magnet*2.4*.7,0,TAU); c.stroke(); c.restore(); }
  // cohete
  drawPlayer(c);
  // textos flotantes
  for(const t of G.texts){ const sy=screenY(t.y); c.save(); c.globalAlpha=clamp(t.life*2,0,1); c.font='700 '+t.size+'px Fredoka,sans-serif'; c.textAlign='center'; c.lineWidth=5; c.strokeStyle='rgba(58,42,107,.75)'; c.strokeText(t.txt,t.x,sy); c.fillStyle=t.col; c.fillText(t.txt,t.x,sy); c.restore(); }
  c.restore();
  // líneas de velocidad
  if((G.speed||0)>650){ const a=clamp(((G.speed||0)-650)/1800,0,.55); c.strokeStyle='rgba(255,255,255,'+a+')'; c.lineWidth=3; c.lineCap='round'; for(const l of LINESX){ const y=((l.p*H+G.alt*1.3*l.l)%H); const len=20+G.speed*.03*l.l; c.beginPath(); c.moveTo(l.x,y); c.lineTo(l.x,y+len); c.stroke(); } }
  // destello
  if(G.flash>0){ c.fillStyle='rgba('+G.flashCol+','+(G.flash*.4)+')'; c.fillRect(0,0,W,H); }
  // viñeta
  const vg=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.8); vg.addColorStop(0,'rgba(30,10,70,0)'); vg.addColorStop(1,'rgba(30,10,70,'+(.18+(G.turbo>0?.12:0))+')'); c.fillStyle=vg; c.fillRect(0,0,W,H);
  // burbuja de habla
  if(G.speechT>0&&G.mode!=='done') drawBubble(c,G.speech,clamp(G.x,150,W-150),rocketY()-150*RK_SC-(G.mode==='idle'||G.mode==='launch'?G.hop*0:0)-6);
}
function drawPlayer(c){
  const st=G.st; const x=G.x; let y=rocketY(); let sc=RK_SC; const moving=G.mode==='fly'||G.mode==='land'||G.mode==='end';
  const idleBob=G.mode==='idle'?Math.sin(G.t*2.4)*3:0; const hop=G.hop>0?Math.sin(G.hop*Math.PI)*28:0; y+=-idleBob-(G.mode==='idle'?hop:0);
  if(G.mode==='land') sc*=lerp(1,.45,clamp(G.landT/2.6,0,1));
  const sq=G.squash; const tilt=moving?clamp(G.vx/st.hs,-1,1)*.24:(G.mode==='launch'?Math.sin(G.t*60)*.012:0);
  const thrust=G.mode==='fly'||G.mode==='land'?(G.fuel>0||G.mode==='land'?clamp(.45+G.vy/2500,.4,1)+(G.turbo>0?.5:0):0):0;
  c.save(); if(G.inv>0&&G.mode!=='land'&&Math.floor(G.t*16)%2) c.globalAlpha=.55;
  c.translate(x,y); c.scale(1-.08*sq,1+.1*sq); c.translate(-x,-y);
  if(G.mode==='launch') { c.translate(Math.sin(G.t*70)*1.2,0); }
  drawRocket(c,x,y,sc,tierOf(),G.t,G.mode==='launch'?.12:thrust,chick(),G.mood,{tilt});
  // paracaídas
  if(G.mode==='end'){ const k=clamp(G.endT/.4,0,1); c.save(); c.globalAlpha=k; c.translate(x,y-130*sc*(.6+.4*k)); c.fillStyle='#ff5fa8'; c.beginPath(); c.arc(0,0,64,Math.PI,0); c.quadraticCurveTo(48,18,32,0); c.quadraticCurveTo(16,16,0,0); c.quadraticCurveTo(-16,16,-32,0); c.quadraticCurveTo(-48,18,-64,0); c.fill(); c.strokeStyle='rgba(58,42,107,.4)'; c.lineWidth=3; c.stroke(); c.fillStyle='#ffd23f'; c.beginPath(); c.arc(-20,-30,14,Math.PI,0); c.arc(20,-30,14,Math.PI,0); c.fill(); c.strokeStyle='#fff'; c.lineWidth=2; for(const px of [-60,-30,30,60]){ c.beginPath(); c.moveTo(px,0); c.lineTo(px*.2,84*(.6+.4*k)); c.stroke(); } c.restore(); }
  // escudo
  if(G.shield>0&&moving){ c.strokeStyle='rgba(155,232,255,.8)'; c.lineWidth=5; c.fillStyle='rgba(155,232,255,.16)'; c.beginPath(); c.arc(x,y,78*sc+Math.sin(G.t*6)*2,0,TAU); c.fill(); c.stroke(); }
  c.restore();
}
function drawBubble(c,txt,x,y){
  c.save(); c.font='700 17px Fredoka,sans-serif'; c.textAlign='center'; c.textBaseline='middle';
  const maxW=300; const words=txt.split(' '); const lines=[]; let cur='';
  for(const w of words){ const t=cur?cur+' '+w:w; if(c.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t; } lines.push(cur);
  const w=Math.max(...lines.map(l=>c.measureText(l).width))+30, h=lines.length*22+18; const bx=clamp(x-w/2,8,LW-w-8), by=y-h-14;
  const a=clamp(G.speechT*5,0,1), pop=1+(1-clamp((now-G.speechAt)*8,0,1))*.15; c.globalAlpha=a; c.translate(x,y); c.scale(pop,pop); c.translate(-x,-y);
  c.fillStyle='#fff'; c.strokeStyle='#3a2a6b'; c.lineWidth=3.5; rr(c,bx,by,w,h,16); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(x-9,by+h-1); c.lineTo(x,y-2); c.lineTo(x+9,by+h-1); c.closePath(); c.fillStyle='#fff'; c.fill(); c.beginPath(); c.moveTo(x-9,by+h+1); c.lineTo(x,y-2); c.lineTo(x+9,by+h+1); c.stroke(); c.fillStyle='#fff'; c.fillRect(x-8,by+h-3,16,6);
  c.fillStyle='#3a2a6b'; lines.forEach((l,i)=>c.fillText(l,bx+w/2,by+9+11+i*22)); c.restore();
}

// ---------- Interfaz ----------
let toastTO=0;
function toast(t){ const e=$('toast'); e.textContent=t; e.classList.add('on'); clearTimeout(toastTO); toastTO=setTimeout(()=>e.classList.remove('on'),1800); }
function updateMenu(){
  const p=P(), i=S.planetSel, locked=i>=S.unlocked;
  $('mCoins').textContent=fmtN(S.coins); $('mEggs').textContent=fmtN(S.eggs);
  $('pName').textContent=(locked?'🔒 ':'')+p.name; $('pDist').textContent='Meta: '+fmtM(p.dist)+' · x'+p.mult+' monedas';
  const best=S.best[p.id]||0; $('pStat').textContent=locked?'Llega al planeta anterior para abrirlo':(best>=p.dist*0.999?'¡Visitado! 🌟':'Mejor: '+fmtM(best));
  const ic=$('pIcon').getContext('2d'); ic.clearRect(0,0,120,120); drawPlanet(ic,60,62,40,p,0); $('pIcon').style.filter=locked?'grayscale(1) brightness(.7)':'none';
  $('pPrev').disabled=i===0; $('pNext').disabled=i===PLANETS.length-1;
  $('bGo').textContent=locked?'🔒 BLOQUEADO':'¡DESPEGAR!';
  $('subtitle').textContent=S.runs===0?'Una gallina, un cohete y cero dudas.':rnd(LINES.title);
  $('tip').textContent=PRUEBAS?'🧪 MODO PRUEBAS: todo desbloqueado':rnd(LINES.menuTips);
  $('bSound').textContent=S.snd?'🔊':'🔇';
}
function cost(u){ const l=lvl(u.id); return Math.round(u.base*Math.pow(u.grow,l)); }
function openPanel(kind){
  audioInit(); const pn=$('panel'); pn.classList.remove('hide'); pn.dataset.kind=kind; renderPanel(); }
function renderPanel(){
  const kind=$('panel').dataset.kind; const list=$('pList'); const sc=list.scrollTop; list.innerHTML='';
  $('pTitle').textContent=kind==='shop'?'🔧 Taller':'🐔 Gallinas'; $('pCoins').textContent=fmtN(S.coins); $('pEggs').textContent=fmtN(S.eggs); $('mCoins').textContent=fmtN(S.coins); $('mEggs').textContent=fmtN(S.eggs);
  if(kind==='shop'){
    UPGRADES.forEach(u=>{ const l=lvl(u.id), max=l>=u.max, cc=cost(u), have=u.cur==='coins'?S.coins:S.eggs, ok=!max&&have>=cc;
      const row=document.createElement('div'); row.className='row'; row.dataset.id=u.id;
      row.innerHTML='<div class="em">'+u.icon+'</div><div class="tx"><b>'+u.name+'</b><small>'+u.desc+'</small><div class="pips">'+Array.from({length:u.max},(_,i)=>'<i class="'+(i<l?'on':'')+'"></i>').join('')+'</div></div>';
      const b=document.createElement('button'); b.className='buy'+(u.cur==='eggs'?' egg-c':'')+(max?' max':''); b.disabled=!ok&&!max; b.innerHTML=max?'MÁX ⭐':'<i class="ic '+(u.cur==='coins'?'coin':'egg')+'"></i>'+fmtN(cc);
      if(max) b.disabled=true;
      b.onclick=()=>{ if(!ok){ SFX.deny(); toast(u.cur==='coins'?'Te faltan monedas 🪙':'Te faltan huevos 🥚'); return; } S[u.cur]-=cc; S.up[u.id]=l+1; save(); SFX.buy(); vib(20); renderPanel(); const r=$('pList').querySelector('[data-id="'+u.id+'"]'); if(r) r.classList.add('pop'); toast('¡'+u.name+' nivel '+(l+1)+'!'); };
      row.appendChild(b); list.appendChild(row); });
    const st=stats(); const info=document.createElement('div'); info.className='row'; info.innerHTML='<div class="em">🚀</div><div class="tx"><b>Tu nave ahora</b><small>Empuje '+Math.round(st.thrust)+' · Maíz '+st.burn.toFixed(1)+' s · Imán '+Math.round(st.magnet)+' · Escudos '+st.shield+' · Moneda x'+st.coinMult.toFixed(2)+'</small></div>'; list.appendChild(info);
  } else {
    const grid=document.createElement('div'); grid.className='grid';
    CHICKENS.forEach(ch=>{ const own=S.own.includes(ch.id), sel=S.sel===ch.id;
      const card=document.createElement('div'); card.className='ccard'+(sel?' sel':'');
      const cvs=document.createElement('canvas'); cvs.width=cvs.height=168; const c2=cvs.getContext('2d'); drawChicken(c2,ch,84,92,88,0.4,'happy',true);
      card.appendChild(cvs); card.insertAdjacentHTML('beforeend','<b>'+ch.name+'</b><small>'+ch.bonus+'</small>');
      const b=document.createElement('button'); b.className='buy'+(own?'':' egg-c'); b.innerHTML=sel?'✔ Equipada':own?'Equipar':'<i class="ic egg"></i>'+fmtN(ch.cost);
      b.disabled=sel||(!own&&S.eggs<ch.cost);
      b.onclick=()=>{ if(own){ S.sel=ch.id; save(); SFX.cluck(); renderPanel(); toast(ch.name+' al mando 🐔'); } else if(S.eggs>=ch.cost){ S.eggs-=ch.cost; S.own.push(ch.id); S.sel=ch.id; save(); SFX.buy(); vib(20); renderPanel(); toast('¡Nueva gallina: '+ch.name+'!'); } else { SFX.deny(); } };
      card.appendChild(b); grid.appendChild(card); });
    list.appendChild(grid);
  }
  list.scrollTop=sc;
}
function closePanel(){ $('panel').classList.add('hide'); updateMenu(); newRun(); }

// ---------- Eventos ----------
$('bGo').onclick=beginLaunch;
$('bShop').onclick=()=>openPanel('shop'); $('bChick').onclick=()=>openPanel('chick'); $('pClose').onclick=closePanel;
$('pPrev').onclick=()=>{ S.planetSel=Math.max(0,S.planetSel-1); save(); SFX.tick(); updateMenu(); newRun(); };
$('pNext').onclick=()=>{ S.planetSel=Math.min(PLANETS.length-1,S.planetSel+1); save(); SFX.tick(); updateMenu(); newRun(); };
$('bSound').onclick=()=>{ S.snd=!S.snd; save(); audioInit(); if(master) master.gain.value=S.snd?.9:0; updateMenu(); };
$('rAgain').onclick=()=>{ $('results').classList.add('hide'); beginLaunch(); };
$('rShop').onclick=()=>{ goMenu(); openPanel('shop'); };
$('app').addEventListener('pointerdown',e=>{ if(e.target.closest('button,#panel,#results,#menu #mBottom,#mTop')) return; if(G&&(G.mode==='launch'||G.mode==='fly'||G.mode==='end'||G.mode==='idle')){ e.preventDefault(); tap(); } });
window.addEventListener('keydown',e=>{ if(e.code==='Space'||e.code==='ArrowLeft'||e.code==='ArrowRight'||e.code==='ArrowUp'){ if(G&&G.mode!=='idle'){ e.preventDefault(); tap(); } else if(e.code==='Space'&&!$('menu').classList.contains('hide')&&$('panel').classList.contains('hide')){ beginLaunch(); } } });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&engGain) engGain.gain.value=0; });

// ---------- Bucle ----------
function frame(ts){
  const dt=Math.min(.05,(ts-lastTime)/1000||0); lastTime=ts; now=ts/1000;
  update(dt); render(); requestAnimationFrame(frame);
}
document.fonts&&document.fonts.load('700 20px Fredoka').catch(()=>{});
goMenu(); requestAnimationFrame(t=>{ lastTime=t; requestAnimationFrame(frame); });
window.GE={ S, get G(){return G;}, tap, beginLaunch, stats, goMenu, PRUEBAS };
