'use strict';
// ====== EL CHEF IMPOSIBLE ======
const PRUEBAS=/[?&]pruebas=1/.test(location.search)||location.hash==='#pruebas';
const $=id=>document.getElementById(id);
const rnd=Math.random, rndI=n=>Math.floor(rnd()*n), pick=a=>a[rndI(a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v, hyp=Math.hypot;
const CR=21, IR=15, POT_R=60, YMIN=70, XPAD=16;
const PCOL=['#ff5a4d','#3d9bff','#2fcf7b','#b768ff'];
const CHEF_BY={};CHEFS.forEach(c=>CHEF_BY[c.id]=c);

// ---------- Guardado ----------
const SAVE_KEY='chefimp_v1';
let SV;
function loadSave(){
  let s={};try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')}catch(e){}
  SV=Object.assign({coins:0,stars:[0,0,0,0,0,0],chefs:{croqueto:1},slots:null,sound:true,best:{}},s);
  if(PRUEBAS){SV.coins=Math.max(SV.coins,99999);SV.stars=SV.stars.map(x=>x||1);CHEFS.forEach(c=>SV.chefs[c.id]=1);}
  if(!SV.slots)SV.slots=[{m:'h',c:'croqueto'},{m:'ia',c:'pulpa'},{m:'ia',c:'sarten'},{m:'off',c:'pepino'}];
}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(SV))}catch(e){}}
loadSave();
const unlockedLv=i=>PRUEBAS||i===0||SV.stars[i-1]>0;
const hasChef=id=>PRUEBAS||!!SV.chefs[id];

// ---------- Audio ----------
let AC=null,master=null,musicOn=false,musicT=0,musicStep=0;
function audioInit(){
  if(AC)return;
  try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=SV.sound?.55:0;master.connect(AC.destination);}catch(e){AC=null}
}
function setSound(on){SV.sound=on;if(master)master.gain.value=on?.55:0;save();$('bSnd').textContent=on?'🔊':'🔇';$('pSnd').textContent=on?'🔊 Sonido: sí':'🔇 Sonido: no';}
function tone(f,d,type,v,slide,delay){
  if(!AC||!SV.sound)return;
  const t0=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f,t0);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),t0+d);
  g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(v||.2,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+d);
  o.connect(g);g.connect(master);o.start(t0);o.stop(t0+d+.05);
}
function noise(d,v,fq){
  if(!AC||!SV.sound)return;const n=AC.sampleRate*d,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);
  for(let i=0;i<n;i++)a[i]=(rnd()*2-1)*(1-i/n);
  const s=AC.createBufferSource();s.buffer=b;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=fq||1200;const g=AC.createGain();g.gain.value=v||.2;
  s.connect(f);f.connect(g);g.connect(master);s.start();
}
const SFX={
  catch(){tone(520,.12,'square',.12,1.8);tone(780,.1,'triangle',.12,1,.06)},
  drop(){tone(300,.18,'sine',.3,2.2);tone(620,.12,'triangle',.18,1,.08)},
  good(c){const b=520*Math.pow(1.06,Math.min(c||0,8));tone(b,.1,'triangle',.22,1);tone(b*1.5,.14,'triangle',.2,1,.07);tone(b*2,.18,'sine',.16,1,.14)},
  bad(){tone(150,.35,'sawtooth',.2,.5);noise(.25,.2,500)},
  dash(){noise(.14,.14,2200);tone(300,.12,'sine',.1,2.4)},
  throw(){tone(420,.16,'triangle',.14,2.2)},
  hit(){noise(.2,.3,700);tone(180,.2,'square',.16,.5)},
  stun(){tone(250,.3,'sawtooth',.12,.6)},
  order(){[0,4,7,12].forEach((s,i)=>tone(523*Math.pow(2,s/12),.18,'triangle',.22,1,i*.09))},
  lose(){[0,-3,-6,-12].forEach((s,i)=>tone(400*Math.pow(2,s/12),.35,'sawtooth',.2,1,i*.16));noise(.7,.4,900)},
  win(){[0,4,7,12,16,19,24].forEach((s,i)=>tone(440*Math.pow(2,s/12),.22,'triangle',.22,1,i*.1))},
  tick(){tone(900,.07,'square',.1,1)},
  go(){tone(660,.3,'square',.16,1.5)},
  alarm(){tone(880,.12,'square',.1,1);tone(660,.12,'square',.1,1,.13)},
  tp(){tone(300,.25,'sine',.16,3)},
  boom(){noise(.45,.35,500);tone(90,.4,'sawtooth',.2,.4)},
  coin(){tone(988,.08,'square',.1,1);tone(1319,.2,'square',.1,1,.07)},
  click(){tone(600,.05,'triangle',.12,1)}
};
const sfx=(n,a)=>{try{SFX[n](a)}catch(e){}};
function musicTick(dt,tempoK){
  if(!AC||!SV.sound||!musicOn)return;
  musicT-=dt;
  while(musicT<=0){
    const bpm=128*(tempoK||1),step=60/bpm/2;musicT+=step;
    const sc=[0,2,4,7,9,12],bass=[0,0,7,5,0,0,10,7],s=musicStep++;
    if(s%2===0)tone(110*Math.pow(2,bass[(s>>1)%8]/12),step*1.6,'triangle',.11,1);
    if(rnd()<.62)tone(440*Math.pow(2,sc[rndI(6)]/12),step*.9,'square',.035,1);
    if(s%4===0)noise(.05,.07,3000);
  }
}

// ---------- Entrada ----------
const KEYS={},ACT={};
const SCHEMES=[
 {u:'KeyW',d:'KeyS',l:'KeyA',r:'KeyD',a:['Space'],name:'WASD + ESPACIO'},
 {u:'ArrowUp',d:'ArrowDown',l:'ArrowLeft',r:'ArrowRight',a:['Enter','NumpadEnter'],name:'FLECHAS + ENTER'},
 {u:'KeyI',d:'KeyK',l:'KeyJ',r:'KeyL',a:['KeyU'],name:'IJKL + U'},
 {u:'KeyT',d:'KeyG',l:'KeyF',r:'KeyH',a:['KeyR'],name:'TFGH + R'}];
addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(!e.repeat){KEYS[e.code]=1;SCHEMES.forEach((s,i)=>{if(s.a.includes(e.code))ACT[i]=1});
    if(e.code==='ShiftLeft'||e.code==='KeyE'||e.code==='ShiftRight')ACT.any=1;
    if(e.code==='Escape'||e.code==='KeyP')togglePause();}
  audioInit();
});
addEventListener('keyup',e=>{KEYS[e.code]=0});
addEventListener('blur',()=>{for(const k in KEYS)KEYS[k]=0;if(G&&G.state==='play')togglePause(true)});
const TCH={on:false,id:null,bx:0,by:0,x:0,y:0,vx:0,vy:0,aid:null,act:false,seen:false,aHeld:false};
let VW=0,VH=0,DPR=1,cv,cx;
function actBtn(){const compact=VH<520;return {x:VW-(compact?84:78),y:VH-(compact?80:96),r:compact?46:54}}
function onPD(e){
  audioInit();
  if(e.pointerType==='touch')TCH.seen=true;
  if(!G||!['play','intro'].includes(G.state)||S.scene!=='game')return;
  const a=actBtn();
  if(hyp(e.clientX-a.x,e.clientY-a.y)<a.r*1.35&&TCH.aid===null){TCH.aid=e.pointerId;TCH.act=true;TCH.aHeld=true;return;}
  if(TCH.id===null&&e.clientY>HUDH()){TCH.id=e.pointerId;TCH.bx=TCH.x=e.clientX;TCH.by=TCH.y=e.clientY;TCH.vx=TCH.vy=0;TCH.on=true;}
}
function onPM(e){
  if(e.pointerId!==TCH.id)return;
  TCH.x=e.clientX;TCH.y=e.clientY;
  let dx=TCH.x-TCH.bx,dy=TCH.y-TCH.by;const m=hyp(dx,dy),R=52;
  if(m>R){TCH.bx+=dx/m*(m-R);TCH.by+=dy/m*(m-R);dx=TCH.x-TCH.bx;dy=TCH.y-TCH.by}
  TCH.vx=dx/R;TCH.vy=dy/R;
}
function onPU(e){
  if(e.pointerId===TCH.id){TCH.id=null;TCH.on=false;TCH.vx=TCH.vy=0}
  if(e.pointerId===TCH.aid){TCH.aid=null;TCH.aHeld=false}
}
function pads(){try{return navigator.getGamepads?Array.from(navigator.getGamepads()).filter(Boolean):[]}catch(e){return[]}}
const padPrev={};
function humanInput(c){
  // c.hi: índice de humano (0..3)
  let x=0,y=0,act=false;
  const single=G.nHuman===1;
  const sc=SCHEMES[c.hi];
  const chk=(s)=>{x+=(KEYS[s.r]?1:0)-(KEYS[s.l]?1:0);y+=(KEYS[s.d]?1:0)-(KEYS[s.u]?1:0);};
  chk(sc);
  if(ACT[c.hi]){act=true;ACT[c.hi]=0}
  if(single){chk(SCHEMES[c.hi===0?1:0]);if(ACT[1]){act=true;ACT[1]=0}if(ACT.any){act=true;ACT.any=0}}
  if(c.hi===0){x+=TCH.vx;y+=TCH.vy;if(TCH.act){act=true;TCH.act=false}}
  const pl=pads();const p=pl[c.hi];
  if(p){const ax=p.axes[0]||0,ay=p.axes[1]||0;if(Math.abs(ax)>.2)x+=ax;if(Math.abs(ay)>.2)y+=ay;
    if(p.buttons[12]?.pressed)y-=1;if(p.buttons[13]?.pressed)y+=1;if(p.buttons[14]?.pressed)x-=1;if(p.buttons[15]?.pressed)x+=1;
    const pr=!!(p.buttons[0]?.pressed||p.buttons[2]?.pressed||p.buttons[1]?.pressed||p.buttons[7]?.pressed);
    if(pr&&!padPrev[c.hi])act=true;padPrev[c.hi]=pr;}
  return {x,y,act};
}

// ---------- Estado global ----------
const S={scene:'title',t:0};
let G=null;
const HUDH=()=>VH<520?56:138;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);VW=innerWidth;VH=innerHeight;
  cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);cv.style.width=VW+'px';cv.style.height=VH+'px';
  if(G)layoutWorld(G);
}
function layoutWorld(g){
  const y0=HUDH(),aw=VW,ah=VH-y0;
  g.sc=Math.min(aw/g.W,ah/g.H);g.ox=(aw-g.W*g.sc)/2;g.oy=y0+(ah-g.H*g.sc)/2;
}
function worldDims(){
  const y0=HUDH(),aw=VW,ah=VH-y0;let r=clamp(aw/ah,.62,1.8),W,H;
  if(r<1){W=560;H=W/r}else{H=560;W=H*r}
  return{W:Math.round(W),H:Math.round(H)};
}

// ---------- Utilidades de mundo ----------
function segHitsRect(x0,y0,x1,y1,r){
  let t0=0,t1=1;const dx=x1-x0,dy=y1-y0;
  for(const[p,q]of[[-dx,x0-r.x],[dx,r.x+r.w-x0],[-dy,y0-r.y],[dy,r.y+r.h-y0]]){
    if(p===0){if(q<0)return false}else{const t=q/p;if(p<0){if(t>t1)return false;if(t>t0)t0=t}else{if(t<t0)return false;if(t<t1)t1=t}}
  }
  return true;
}
function pushRect(e,r,rad){
  const cx_=clamp(e.x,r.x,r.x+r.w),cy_=clamp(e.y,r.y,r.y+r.h);
  let dx=e.x-cx_,dy=e.y-cy_;const d=hyp(dx,dy);
  if(d<rad){
    if(d<.001){ // dentro
      const l=e.x-r.x,rr_=r.x+r.w-e.x,t=e.y-r.y,b=r.y+r.h-e.y,m=Math.min(l,rr_,t,b);
      if(m===l)e.x=r.x-rad;else if(m===rr_)e.x=r.x+r.w+rad;else if(m===t)e.y=r.y-rad;else e.y=r.y+r.h+rad;
    }else{e.x=cx_+dx/d*rad;e.y=cy_+dy/d*rad}
    return true;
  }
  return false;
}
function moveEnt(g,e,rad,dt,solidPot){
  e.x+=e.vx*dt;e.y+=e.vy*dt;
  let hit=false;
  for(const r of g.cts)if(pushRect(e,r,rad))hit=true;
  if(solidPot){const dx=e.x-g.pot.x,dy=e.y-g.pot.y,d=hyp(dx,dy),m=POT_R-6+rad-4;if(d<m&&d>.01){e.x=g.pot.x+dx/d*m;e.y=g.pot.y+dy/d*m;hit=true}}
  if(e.x<XPAD+rad*.5){e.x=XPAD+rad*.5;e.vx=Math.abs(e.vx)*.2;hit=true}
  if(e.x>g.W-XPAD-rad*.5){e.x=g.W-XPAD-rad*.5;e.vx=-Math.abs(e.vx)*.2;hit=true}
  if(e.y<YMIN){e.y=YMIN;e.vy=Math.abs(e.vy)*.2;hit=true}
  if(e.y>g.H-12){e.y=g.H-12;e.vy=-Math.abs(e.vy)*.2;hit=true}
  return hit;
}
function inOil(g,e){for(const o of g.oil)if(hyp(e.x-o.x,e.y-o.y)<o.r)return true;for(const p of g.puddles)if(p.k==='tears'&&hyp(e.x-p.x,e.y-p.y)<p.r)return true;return false;}
function inStink(g,e){for(const p of g.puddles)if(p.k==='stink'&&hyp(e.x-p.x,e.y-p.y)<p.r)return true;return false;}
function envPush(g,e,dt){
  for(const b of g.belts)if(e.x>b.x&&e.x<b.x+b.w&&e.y>b.y&&e.y<b.y+b.h){e.x+=b.dx*88*dt;e.y+=b.dy*88*dt;}
  if(g.portals.length&&!(e.tp>0)){
    for(const pr of g.portals)for(let k=0;k<2;k++){const a=pr[k],b=pr[1-k];
      if(hyp(e.x-a.x,e.y-a.y)<30){const dx=e.vx,dy=e.vy,m=hyp(dx,dy)||1;e.x=b.x+dx/m*44;e.y=b.y+dy/m*44;e.tp=1.1;
        e.x=clamp(e.x,XPAD+10,g.W-XPAD-10);e.y=clamp(e.y,YMIN,g.H-14);
        fxBurst(g,a.x,a.y,10,pr.col);fxBurst(g,e.x,e.y,10,pr.col);sfx('tp');return;}}
  }
  if(e.tp>0)e.tp-=dt;
}

// ---------- Efectos ----------
function fxBurst(g,x,y,n,col,spd,up){
  for(let i=0;i<n;i++){const a=rnd()*7,s=(spd||90)*(.4+rnd());
    g.fx.push({k:'p',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(up||40),g:260,t:0,life:.5+rnd()*.4,col:col||'#fff',r:2.5+rnd()*3.5});}
}
function fxText(g,x,y,txt,col,size,life){g.fx.push({k:'txt',x,y,txt,col:col||'#fff',size:size||20,t:0,life:life||1.1});}
function fxRing(g,x,y,r,col,life){g.fx.push({k:'ring',x,y,r,col,t:0,life:life||.45});}
function say(g,x,y,txt,col,who,dur){
  if(g.say.length>=3)return;
  const bx=who&&who.x!==undefined?who.x:x,by=who&&who.y!==undefined?who.y:y;
  for(const s of g.say){const sx=s.who&&s.who.x!==undefined?s.who.x:s.x,sy=s.who&&s.who.y!==undefined?s.who.y:s.y;if(Math.abs(sx-bx)<150&&Math.abs(sy-by)<60)return;}
  g.say.push({x,y,txt,t:0,life:dur||1.9,col:col||'#fff',who});
}
function chefSay(g,c,kind,p){
  if(rnd()>(p==null?1:p)||c.sayCd>0)return;
  const L=c.def.L[kind];if(!L)return;c.sayCd=2.2;
  say(g,c.x,c.y-82,pick(L),'#fff',c);
}
function setMood(c,m,t){c.mood=m;c.moodT=t||.8}

// ---------- Crear partida ----------
function newGame(li,slots,opt){
  opt=opt||{};
  const L=LEVELS[li],d=worldDims(),W=d.W,H=d.H;
  const g={li,L,W,H,t:0,state:'intro',cd:3.4,heat:16,maxHeat:16,chefs:[],ings:[],puddles:[],fx:[],say:[],warns:[],scorch:[],
    pot:{x:W/2,y:YMIN+(H-YMIN)*.5+6,mood:null,moodT:0,bounce:0,fill:0},order:null,orderDelay:0,done:0,expired:0,spawnT:.8,shake:0,flash:0,endT:0,
    hazT:3.5,nIng:0,idc:1,sim:!!opt.sim,alarmT:0,tip:li===0,hotSaid:0,msgs:[]};
  g.cts=L.cts.map(a=>({x:a[0]*W,y:Math.max(YMIN-6,a[1]*H),w:a[2]*W,h:a[3]*H}));
  g.belts=(L.belts||[]).map(b=>({x:b[0]*W,y:b[1]*H,w:b[2]*W,h:b[3]*H,dx:b[4],dy:b[5]}));
  g.oil=(L.oil||[]).map(o=>({x:o[0]*W,y:Math.max(YMIN+20,o[1]*H),r:o[2]}));
  g.portals=(L.portals||[]).map((p,i)=>{const o=[{x:p[0][0]*W,y:p[0][1]*H},{x:p[1][0]*W,y:p[1][1]*H}];o.col=['#4de3ff','#ff7be5'][i%2];return o});
  g.nHuman=slots.filter(s=>s.m==='h').length;
  const sp=[[.18,.74],[.82,.8],[.16,.28],[.84,.3]];
  let hi=0,k=0;
  slots.forEach((s,i)=>{
    if(s.m==='off')return;
    const def=CHEF_BY[s.c];const human=s.m==='h';
    const c={i,slot:i,def,human,hi:human?hi++:-1,x:sp[k][0]*W,y:Math.max(YMIN+10,sp[k][1]*H),vx:0,vy:0,face:k%2?-1:1,aimx:k%2?-1:1,aimy:0,
      carry:null,carryT:0,stun:0,dash:0,dashCd:0,dashHit:null,pts:0,combo:0,lastDrop:-99,anim:rnd()*9,mood:'idle',moodT:0,sayCd:0,sq:0,
      auto:!!opt.auto&&human,tp:0,ai:null,drops:0,wrong:0,hits:0,run:0};
    for(const r of g.cts)pushRect(c,r,CR+4);
    if(!human||c.auto){const sk=clamp(L.aiS*(.9+rnd()*.12),.5,1.05);c.ai={t:0,tgt:null,skill:sk,dis:0,wx:0,wy:0,lx:c.x,ly:c.y,stuck:0,willThrow:false,dumb:rnd()<.22};}
    g.chefs.push(c);k++;
  });
  layoutWorld(g);
  return g;
}

// ---------- Pedidos ----------
function newOrder(g){
  const L=g.L;let n=2+(g.done>=2?1:0)+(g.li>=2?1:0)+(rnd()<.35?1:0);n=clamp(n,2,5);
  const items=[];for(let i=0;i<n;i++){let t=pick(L.ings),tries=0;while(items.filter(x=>x===t).length>=2&&tries++<8)t=pick(L.ings);items.push(t);}
  g.order={name:pick(RECIPE_NAMES),items:items.slice(),need:items.slice(),t:0,pat:(11+7*n)*L.pat,flash:0,popT:0};
}
function nearestChefDist(g,x,y){let m=1e9;for(const c of g.chefs){const d=hyp(c.x-x,c.y-y);if(d<m)m=d}return m}

// ---------- Ingredientes ----------
function spawnIng(g,type){
  const door={x:g.W/2+(rnd()*80-40),y:YMIN+6};
  const a=Math.PI/2+(rnd()-.5)*1.6;
  const i={id:g.idc++,type,x:door.x,y:door.y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,state:'free',t:rnd()*9,dazed:.5,mood:'idle',lx:0,ly:.3,run:0,
    s1:rnd()*3,s2:0,s3:0,tp:0,say:rnd()*3,fm:0,thr:null,sq:0};
  g.ings.push(i);fxBurst(g,door.x,door.y,6,'#fff6c8',70);
}
function spawnLogic(g,dt){
  g.spawnT-=dt;
  const free=g.ings.filter(i=>i.state!=='carried').length;
  if(g.spawnT>0||free>=g.L.max)return;
  g.spawnT=g.L.spawn*(.8+rnd()*.4);
  const need=g.order?g.order.need:[];
  let type;
  if(g.heat>45&&!g.ings.some(i=>i.type==='hielo')&&rnd()<.22)type='hielo';
  else if(need.length&&rnd()<.62){
    // preferir los que faltan y no hay en pista
    const miss=need.filter(t=>g.ings.filter(i=>i.type===t).length<need.filter(x=>x===t).length);
    type=pick(miss.length?miss:need);
  }else type=pick(g.L.ings);
  spawnIng(g,type);
}
function updIng(g,i,dt){
  if(i.state==='carried')return;
  i.t+=dt;i.say-=dt;i.sq*=Math.pow(.001,dt);
  if(i.state==='thrown'){
    const th=i.thr;th.age=(th.age||0)+dt;i.x+=i.vx*dt;i.y+=i.vy*dt;th.life-=dt;i.rot=(i.rot||0)+dt*14;
    i.y=clamp(i.y,YMIN-10,g.H-10);
    const p=g.pot;
    if(hyp(i.x-p.x,i.y-p.y)<POT_R+IR-8){deposit(g,th.by,i.type,i.x,i.y);i.dead=true;return}
    for(const c of g.chefs){
      if(c===th.by||c.stun>0||th.age<.06)continue;
      if(hyp(i.x-c.x,i.y-(c.y-22))<CR+IR){
        c.stun=.8*th.by.def.pow;setMood(c,'dizzy',c.stun);c.vx=i.vx*.5;c.vy=i.vy*.5;
        if(c.carry)dropCarry(g,c,i.vx*.4,i.vy*.4);
        th.by.pts+=5;th.by.hits++;fxText(g,c.x,c.y-70,'¡PUM!','#ffd23f',22);fxBurst(g,c.x,c.y-20,10,'#fff',120);sfx('hit');g.shake=Math.max(g.shake,5);
        chefSay(g,c,'hit',.7);chefSay(g,th.by,'good',.3);
        i.state='free';i.dazed=1;i.vx*=-.2;i.vy*=-.2;i.thr=null;return;
      }
    }
    if(i.x<XPAD||i.x>g.W-XPAD||i.y<YMIN-8||i.y>g.H-12||th.life<=0){i.state='free';i.dazed=1.1;i.vx*=.2;i.vy*=.2;i.thr=null;i.rot=0;}
    return;
  }
  const info=ING[i.type];
  if(i.dazed>0){i.dazed-=dt;i.mood='dizzy';i.vx*=Math.pow(.05,dt);i.vy*=Math.pow(.05,dt);i.run=0;
    moveEnt(g,i,IR,dt,true);envPush(g,i,dt);return;}
  // chef más cercano
  let nc=null,nd=1e9;
  for(const c of g.chefs){const d=hyp(c.x-i.x,c.y-i.y);if(d<nd){nd=d;nc=c}}
  const beh=info.beh;
  let spd=info.sp*g.L.isp,flee=info.fl*(.9+.1*g.L.isp);
  let fx_=0,fy_=0,fleeing=nc&&nd<flee;
  if(beh==='dormilona'){
    i.s2+=dt;
    if(i.s3===0){ // dormida
      fleeing=nc&&nd<70;i.mood='happy';i.zT=(i.zT||0)+dt;
      if(i.zT>.7){i.zT=0;g.fx.push({k:'z',x:i.x+8,y:i.y-44,t:0,life:1.4})}
      if(fleeing||i.s2>5){i.s3=1;i.s2=0;i.mood='scared';fxText(g,i.x,i.y-48,'¡¿?!','#fff',18)}
      else{i.vx*=Math.pow(.01,dt);i.vy*=Math.pow(.01,dt);i.run=0;moveEnt(g,i,IR,dt,true);envPush(g,i,dt);return}
    }else{ spd=250;fleeing=true;if(i.s2>1.1){i.s3=0;i.s2=0;} }
  }
  if(fleeing){
    fx_=i.x-nc.x;fy_=i.y-nc.y;const m=hyp(fx_,fy_)||1;fx_/=m;fy_/=m;
    if(g.L.haz==='nave'){}
    // comportamientos
    switch(beh){
      case 'zigzag':{const s=Math.sin(i.t*7)*1.1;const px=-fy_,py=fx_;fx_+=px*s;fy_+=py*s;break}
      case 'serpiente':{const s=Math.sin(i.t*3.2)*1.5;const px=-fy_,py=fx_;fx_+=px*s;fy_+=py*s;break}
      case 'salto':{i.s1+=dt;const ph=i.s1%1.15;spd*=ph<.28?2.1:.55;i.sq=ph<.28?-.12:0;break}
      case 'sprint':{i.s1+=dt;const ph=i.s1%2.1;if(ph<.55){spd*=2.3;if(rnd()<.5)g.fx.push({k:'p',x:i.x,y:i.y-8,vx:rnd()*40-20,vy:-30-rnd()*30,g:-30,t:0,life:.4,col:'#ff9f1a',r:3+rnd()*3})}else spd*=.8;break}
      case 'teleport':{i.s1-=dt;if(i.s1<=0&&nd<130){i.s1=2.4+rnd();const a=Math.atan2(fy_,fx_)+(rnd()-.5)*1.4;
        fxBurst(g,i.x,i.y-16,12,'#e6a8ff',100);i.x=clamp(i.x+Math.cos(a)*150,XPAD+14,g.W-XPAD-14);i.y=clamp(i.y+Math.sin(a)*150,YMIN,g.H-14);
        for(const r of g.cts)pushRect(i,r,IR+2);fxBurst(g,i.x,i.y-16,12,'#e6a8ff',100);sfx('tp');}break}
      case 'peste':{i.s1-=dt;if(i.s1<=0){i.s1=1.3;g.puddles.push({k:'stink',x:i.x,y:i.y,r:42,t:0,life:4.5})}break}
      case 'lagrimas':{i.s1-=dt;if(i.s1<=0){i.s1=1.1;g.puddles.push({k:'tears',x:i.x,y:i.y,r:30,t:0,life:5});}if(rnd()<.2)g.fx.push({k:'p',x:i.x+rnd()*10-5,y:i.y-30,vx:rnd()*50-25,vy:-20,g:300,t:0,life:.5,col:'#8fd8ff',r:2.5});break}
      case 'hielo':{if(rnd()<.2)g.fx.push({k:'p',x:i.x,y:i.y-20,vx:rnd()*30-15,vy:rnd()*30-15,g:0,t:0,life:.6,col:'#e8fbff',r:2});break}
    }
    // paredes: empujar hacia el centro y tangente
    let wx=0,wy=0;const mg=60;
    if(i.x<XPAD+mg)wx+=1-(i.x-XPAD)/mg;if(i.x>g.W-XPAD-mg)wx-=1-(g.W-XPAD-i.x)/mg;
    if(i.y<YMIN+mg)wy+=1-(i.y-YMIN)/mg;if(i.y>g.H-12-mg)wy-=1-(g.H-12-i.y)/mg;
    fx_+=wx*1.6;fy_+=wy*1.6;
    // esquivar pote
    const pdx=i.x-g.pot.x,pdy=i.y-g.pot.y,pd=hyp(pdx,pdy);if(pd<POT_R+50){fx_+=pdx/pd*.8;fy_+=pdy/pd*.8;}
    // esquivar mostradores cercanos
    for(const r of g.cts){const cxr=clamp(i.x,r.x,r.x+r.w),cyr=clamp(i.y,r.y,r.y+r.h),dd=hyp(i.x-cxr,i.y-cyr);if(dd<34&&dd>.1){fx_+=(i.x-cxr)/dd*.7;fy_+=(i.y-cyr)/dd*.7;}}
    const m2=hyp(fx_,fy_)||1;fx_/=m2;fy_/=m2;
    if(i.mood!=='happy')i.mood='scared';
    if(i.say<=0&&nd<110&&rnd()<.5){i.say=5+rnd()*4;say(g,i.x,i.y-48,pick(info.barks),ING[i.type].col,i,1.7);}
  }else{
    // vagar
    i.s1=i.s1||0;i.fm-=dt;if(i.fm<=0){i.fm=.8+rnd()*1.6;const a=rnd()*7;i.wx=Math.cos(a);i.wy=Math.sin(a);if(rnd()<.35){i.wx=0;i.wy=0}}
    fx_=i.wx||0;fy_=i.wy||0;spd*=.32;i.mood='idle';
    if(i.x<80)fx_=.7;if(i.x>g.W-80)fx_=-.7;if(i.y<YMIN+60)fy_=.7;if(i.y>g.H-70)fy_=-.7;
    if(hyp(i.x-g.pot.x,i.y-g.pot.y)<POT_R+40){fx_=(i.x-g.pot.x);fy_=(i.y-g.pot.y)}
    if(beh==='lagrimas'||beh==='peste'){i.s1-=dt}
  }
  const tvx=fx_*spd,tvy=fy_*spd,k=beh==='hielo'?4:9;
  i.vx+=(tvx-i.vx)*(1-Math.exp(-k*dt));i.vy+=(tvy-i.vy)*(1-Math.exp(-k*dt));
  const sp=hyp(i.vx,i.vy);i.run=Math.min(1,sp/110);
  if(sp>20){i.lx=i.vx/sp;i.ly=i.vy/sp*.6}
  moveEnt(g,i,IR,dt,true);envPush(g,i,dt);
}

// ---------- Soltar / olla ----------
function dropCarry(g,c,vx,vy){
  const i=c.carry;if(!i)return;
  i.state='free';i.dazed=1;i.x=c.x;i.y=c.y+4;i.vx=vx||0;i.vy=vy||0;c.carry=null;c.carryT=0;
}
function deposit(g,c,type,x,y){
  const p=g.pot,o=g.order;
  g.fx.push({k:'plop',type,x0:x,y0:y-24,x1:p.x,y1:p.y-36,t:0,life:.28});
  p.bounce=1;
  if(type==='hielo'){
    g.heat=Math.max(0,g.heat-34);c.pts+=15;c.drops++;fxText(g,p.x,p.y-90,'¡FRESQUITO! -34°','#9fe7ff',24);fxBurst(g,p.x,p.y-40,24,'#d8f6ff',150);
    p.mood='happy';p.moodT=1;sfx('good',3);chefSay(g,c,'good',.6);fxRing(g,p.x,p.y-30,80,'#bff0ff');return;
  }
  const idx=o?o.need.indexOf(type):-1;
  if(idx>=0){
    o.need.splice(idx,1);
    const since=g.t-c.lastDrop;c.combo=since<5.5?c.combo+1:1;c.lastDrop=g.t;
    const mult=Math.min(c.combo,5),gain=10*mult;c.pts+=gain;c.drops++;
    g.heat=Math.max(0,g.heat-9);
    p.mood='happy';p.moodT=.9;sfx('good',c.combo);
    fxBurst(g,p.x,p.y-40,14,ING[type].col,140);
    fxText(g,p.x+rnd()*30-15,p.y-95,'+'+gain,'#ffe066',24);
    if(mult>=2){fxText(g,c.x,c.y-96,'COMBO x'+mult+'!','#ff9ad5',22);}
    setMood(c,'happy',.9);chefSay(g,c,'good',.5);
    if(!o.need.length)completeOrder(g,c);
  }else{
    c.combo=0;c.pts=Math.max(0,c.pts-5);c.wrong++;
    g.heat=Math.min(100,g.heat+14);p.mood='dizzy';p.moodT=1;sfx('bad');g.shake=Math.max(g.shake,6);
    fxText(g,p.x,p.y-95,'¡PUAJ! +14°','#9be86b',24);fxBurst(g,p.x,p.y-40,16,'#8bd45a',130);
    setMood(c,'scared',1);chefSay(g,c,'bad',.9);
    g.flash=.25;g.flashCol='rgba(120,255,80,';
  }
}
function completeOrder(g,c){
  const o=g.order;g.done++;g.heat=Math.max(0,g.heat-22);c.pts+=50;
  sfx('order');fxText(g,g.pot.x,g.pot.y-130,'¡PEDIDO LISTO!','#7af0c4',30,1.5);
  fxBurst(g,g.pot.x,g.pot.y-50,36,'#ffe066',200);fxBurst(g,g.pot.x,g.pot.y-50,24,'#ff9ad5',160);fxRing(g,g.pot.x,g.pot.y-40,120,'#7af0c4',.6);
  g.pot.mood='happy';g.pot.moodT=1.4;g.pot.bounce=1.4;
  chefSay(g,c,'good',1);
  if(g.done>=g.L.target){g.state='win';g.endT=0;sfx('win');g.order=null;
    for(const ch of g.chefs){setMood(ch,'happy',99);ch.carry&&dropCarry(g,ch)}
    for(let i=0;i<60;i++)g.fx.push({k:'p',x:rnd()*g.W,y:-10-rnd()*120,vx:rnd()*60-30,vy:60+rnd()*120,g:30,t:0,life:2.4,col:pick(['#ff5a4d','#ffc93c','#3ed6a6','#3d9bff','#ff9ad5']),r:3+rnd()*3});
    const w=winner(g);chefSay(g,w,'win',1);
    return}
  g.orderDelay=1.1;g.order=null;
}
function winner(g){return g.chefs.slice().sort((a,b)=>b.pts-a.pts)[0]}

// ---------- Cocineros ----------
function throwRange(c){return 340*(c.def.id==='tostadora'?1.35:1)}
function doAction(g,c){
  if(c.stun>0)return;
  if(c.carry){
    const i=c.carry;let ax=c.aimx,ay=c.aimy;
    const rng=throwRange(c);
    // ayuda de puntería: olla
    const px=g.pot.x-c.x,py=g.pot.y-(c.y-10),pd=hyp(px,py);
    const ang=(x1,y1,x2,y2)=>Math.abs(Math.atan2(x1*y2-y1*x2,x1*x2+y1*y2));
    if(pd<rng+POT_R&&ang(ax,ay,px,py)<.62){ax=px/pd;ay=py/pd}
    else{let best=null,bd=1e9;for(const o of g.chefs){if(o===c)continue;const dx=o.x-c.x,dy=o.y-c.y,d=hyp(dx,dy);if(d<rng&&ang(ax,ay,dx,dy)<.4&&d<bd){bd=d;best={dx,dy,d}}}
      if(best){ax=best.dx/best.d;ay=best.dy/best.d}}
    i.state='thrown';i.x=c.x+ax*26;i.y=c.y-8+ay*14;
    const sp=700*(c.def.id==='tostadora'?1.28:1);i.vx=ax*sp;i.vy=ay*sp;i.thr={by:c,life:rng/sp};i.dazed=0;
    c.carry=null;c.carryT=0;c.sq=-.12;sfx('throw');c.throwV=0;fxBurst(g,i.x,i.y,4,'#fff',60);
    if(pd>POT_R)c.aimLock=0;return;
  }
  if(c.dashCd<=0&&c.dash<=0){
    c.dash=.2;c.dashCd=1.25/Math.max(.8,c.def.dash**.5);c.dashHit=new Set();
    let ax=c.aimx,ay=c.aimy;const m=hyp(ax,ay)||1;c.dx=ax/m;c.dy=ay/m;sfx('dash');c.sq=.12;
    for(let k=0;k<5;k++)g.fx.push({k:'p',x:c.x,y:c.y-8,vx:-c.dx*60+rnd()*40-20,vy:-c.dy*60+rnd()*40-20,g:0,t:0,life:.35,col:'rgba(255,255,255,.8)',r:4});
  }
}
function updChef(g,c,dt){
  c.anim+=dt;c.sayCd-=dt;c.dashCd-=dt;c.sq*=Math.pow(.0005,dt);
  if(c.moodT>0){c.moodT-=dt;if(c.moodT<=0)c.mood='idle'}
  const def=c.def;
  if(c.stun>0){
    c.stun-=dt;c.mood='dizzy';c.vx*=Math.pow(.02,dt);c.vy*=Math.pow(.02,dt);moveEnt(g,c,CR,dt,true);c.run=0;
    if(rnd()<.15)g.fx.push({k:'p',x:c.x+Math.cos(c.anim*9)*18,y:c.y-68,vx:0,vy:0,g:0,t:0,life:.3,col:'#ffd23f',r:3});
    return;
  }
  let inp;
  if(c.human&&!c.auto)inp=humanInput(c);else inp=aiInput(g,c,dt);
  let ix=inp.x,iy=inp.y;const mag=hyp(ix,iy);
  if(mag>1){ix/=mag;iy/=mag}
  const real=Math.min(1,mag);
  if(real>.18){c.aimx=ix/Math.max(mag,.001)*1;c.aimy=iy/Math.max(mag,.001);const am=hyp(c.aimx,c.aimy)||1;c.aimx/=am;c.aimy/=am;if(Math.abs(ix)>.2)c.face=ix>0?1:-1}
  if(inp.aim){c.aimx=inp.aim[0];c.aimy=inp.aim[1]}
  if(inp.act)doAction(g,c);
  const slip=def.id!=='fantasma'&&(inOil(g,c)||g.L.haz==='nave');
  let spd=235*def.spd*(c.carry?.9:1)*(c.ai?(.8+.2*c.ai.skill):1);
  if(inStink(g,c))spd*=.55;
  if(c.dash>0){
    c.dash-=dt;const ds=640*def.dash;c.vx=c.dx*ds;c.vy=c.dy*ds;
    // golpear a otros
    for(const o of g.chefs){if(o===c||o.stun>0||c.dashHit.has(o))continue;
      if(hyp(o.x-c.x,o.y-c.y)<CR*2+4){c.dashHit.add(o);o.stun=.7*def.pow;setMood(o,'dizzy',o.stun);o.vx=c.dx*260;o.vy=c.dy*260;sfx('hit');g.shake=Math.max(g.shake,5);c.hits++;c.pts+=3;
        fxText(g,o.x,o.y-70,'¡BONK!','#ffd23f',22);fxBurst(g,o.x,o.y-20,10,'#fff',120);chefSay(g,o,'hit',.7);
        if(o.carry){const it=o.carry;dropCarry(g,o,c.dx*80,c.dy*80);if(!c.carry){it.state='carried';c.carry=it;c.carryT=0;it.x=c.x;it.y=c.y;fxText(g,c.x,c.y-76,'¡ROBADO!','#ff9ad5',20);}}}}
  }else{
    const k=slip?(g.L.haz==='nave'?4.5:2.2):13;
    c.vx+=(ix*real*spd-c.vx)*(1-Math.exp(-k*dt));c.vy+=(iy*real*spd-c.vy)*(1-Math.exp(-k*dt));
  }
  moveEnt(g,c,CR,dt,true);envPush(g,c,dt);
  c.run=Math.min(1,hyp(c.vx,c.vy)/150);
  if(c.dash>0)c.run=1;
  // atrapar
  if(!c.carry){
    let best=null,bd=1e9;const reach=CR+IR+def.reach+(c.dash>0?16:6);
    for(const i of g.ings){if(i.state!=='free')continue;const d=hyp(i.x-c.x,i.y-c.y);if(d<reach&&d<bd){bd=d;best=i}}
    if(best){best.state='carried';c.carry=best;c.carryT=0;c.sq=.14;sfx('catch');fxBurst(g,best.x,best.y-16,8,ING[best.type].col,90);
      const info=ING[best.type];if(rnd()<.55)say(g,best.x,best.y-50,pick(info.barks),info.col,best,1.6);
      chefSay(g,c,'catch',.28);best.mood='scared';}
  }else{
    c.carryT+=dt;
    if(c.carryT>6.5){const i=c.carry;dropCarry(g,c,rnd()*200-100,rnd()*200-100);say(g,i.x,i.y-50,'¡ME ESCAPÉ!',ING[i.type].col,i,1.4);fxText(g,c.x,c.y-80,'¡Se escapa!','#fff',18);}
    const pd=hyp(c.x-g.pot.x,c.y-g.pot.y);
    if(pd<POT_R+CR+12){const i=c.carry;c.carry=null;c.carryT=0;sfx('drop');deposit(g,c,i.type,c.x,c.y);i.dead=true;c.sq=-.1}
  }
}
function separate(g){
  const cs=g.chefs;
  for(let a=0;a<cs.length;a++)for(let b=a+1;b<cs.length;b++){
    const p=cs[a],q=cs[b];let dx=q.x-p.x,dy=q.y-p.y;const d=hyp(dx,dy),m=CR*1.7;
    if(d<m&&d>.01){const o=(m-d)/2;dx/=d;dy/=d;
      if(p.dash<=0||true){p.x-=dx*o;p.y-=dy*o;q.x+=dx*o;q.y+=dy*o;}
    }
  }
}

// ---------- IA de los cocineros ----------
function pathVec(g,c,tx,ty){
  let blocking=null;
  for(const r of g.cts){const e={x:r.x-CR-4,y:r.y-CR-4,w:r.w+2*CR+8,h:r.h+2*CR+8};if(segHitsRect(c.x,c.y,tx,ty,e)){blocking=e;break}}
  let wx=tx,wy=ty;
  if(blocking){
    let best=1e9;
    for(const [px,py]of[[blocking.x-6,blocking.y-6],[blocking.x+blocking.w+6,blocking.y-6],[blocking.x-6,blocking.y+blocking.h+6],[blocking.x+blocking.w+6,blocking.y+blocking.h+6]]){
      if(px<XPAD||px>g.W-XPAD||py<YMIN||py>g.H-12)continue;
      let ok=true;for(const r of g.cts){const e={x:r.x-CR+2,y:r.y-CR+2,w:r.w+2*CR-4,h:r.h+2*CR-4};if(segHitsRect(c.x,c.y,px,py,e)){ok=false;break}}
      if(!ok)continue;const d=hyp(px-c.x,py-c.y)+hyp(tx-px,ty-py);if(d<best){best=d;wx=px;wy=py}
    }
  }
  const dx=wx-c.x,dy=wy-c.y,m=hyp(dx,dy)||1;return [dx/m,dy/m,m];
}
function aiInput(g,c,dt){
  const a=c.ai;a.t-=dt;
  if(g.state!=='play')return{x:0,y:0,act:false};
  // peligros
  for(const w of g.warns){const d=hyp(c.x-w.x,c.y-w.y);if(d<w.r+34){const m=d||1;return{x:(c.x-w.x)/m,y:(c.y-w.y)/m,act:false}}}
  a.dis-=dt;
  if(a.dis>0)return{x:a.wx,y:a.wy,act:false};
  // atascado
  a.stuck+=dt;if(a.stuck>.8){const mv=hyp(c.x-a.lx,c.y-a.ly);a.lx=c.x;a.ly=c.y;a.stuck=0;
    if(mv<9&&c.stun<=0){const an=rnd()*7;a.dis=.45;a.wx=Math.cos(an);a.wy=Math.sin(an);return{x:a.wx,y:a.wy,act:false}}}
  if(c.carry&&g.order&&c.carry.type!=='hielo'&&!g.order.need.includes(c.carry.type)&&!a.dumb){
    const i=c.carry;dropCarry(g,c,rnd()*120-60,rnd()*120-60);i.dazed=1.6;a.dis=.35;a.wx=rnd()*2-1;a.wy=rnd()*2-1;a.tgt=null;a.t=0;
    if(rnd()<.5)say(g,c.x,c.y-82,pick(['¡Este no pega!','Mmm, no es el del pedido…','¡Fuera, intruso!']),'#fff',c,1.5);
    return{x:0,y:0,act:false};
  }
  if(a.t<=0){
    a.t=.22+rnd()*.2;
    if(!c.carry&&rnd()<(.02+(1-a.skill)*.12)){a.dis=.5+rnd()*.5;const an=rnd()*7;a.wx=Math.cos(an)*.6;a.wy=Math.sin(an)*.6;if(rnd()<.4)chefSay(g,c,'bad',.5);return{x:a.wx,y:a.wy,act:false}}
    if(c.carry){a.tgt=null;a.tx=g.pot.x;a.ty=g.pot.y;}
    else{
      let best=null,bs=1e9;const need=g.order?g.order.need:[];
      for(const i of g.ings){if(i.state!=='free')continue;
        const d=hyp(i.x-c.x,i.y-c.y);let s=d;
        const needed=need.includes(i.type);
        if(i.type==='hielo')s+=g.heat>52?-300:260;
        else if(needed)s-=170;else s+=(a.dumb&&rnd()<.5)?0:(need.length?330:0);
        if(i.dazed>0)s-=35;
        for(const o of g.chefs){if(o===c||o.carry)continue;if(o.ai&&o.ai.tgt===i&&hyp(o.x-i.x,o.y-i.y)<d*.85)s+=150;}
        if(s<bs){bs=s;best=i}
      }
      a.tgt=best;if(best){a.tx=best.x;a.ty=best.y}else{a.tx=g.pot.x+(rnd()-.5)*200;a.ty=g.pot.y+130}
    }
    if(c.carry)a.willThrow=a.willThrow||rnd()<.35*a.skill;
  }
  if(a.tgt&&a.tgt.state==='free'){a.tx=a.tgt.x+a.tgt.vx*.22*a.skill;a.ty=a.tgt.y+a.tgt.vy*.22*a.skill}
  else if(a.tgt&&a.tgt.state!=='free'){a.tgt=null;a.t=0}
  let tx=a.tx,ty=a.ty;
  const dd=hyp(tx-c.x,ty-c.y);
  let act=false;
  if(c.carry){
    const pd=hyp(g.pot.x-c.x,g.pot.y-c.y);
    if(a.willThrow&&pd>150&&pd<throwRange(c)-30&&!g.cts.some(r=>segHitsRect(c.x,c.y,g.pot.x,g.pot.y,r))){
      c.aimx=(g.pot.x-c.x)/pd;c.aimy=(g.pot.y-c.y)/pd;act=true;a.willThrow=false;
    }
  }else if(a.tgt&&dd<112&&c.dashCd<=0&&rnd()<dt*2.2*a.skill){
    c.aimx=(a.tx-c.x)/dd;c.aimy=(a.ty-c.y)/dd;act=true;
  }
  const pv=pathVec(g,c,tx,ty);
  let vx=pv[0],vy=pv[1];
  if(dd<10){vx=0;vy=0}
  return{x:vx,y:vy,act};
}

// ---------- Peligros ----------
function updHazards(g,dt){
  const h=g.L.haz;
  for(const p of g.puddles){p.t+=dt}
  g.puddles=g.puddles.filter(p=>p.t<p.life);
  if(h==='volcan'||h==='nave'){
    g.hazT-=dt;
    if(g.hazT<=0){
      g.hazT=(h==='volcan'?2.9:2.5)*(1-Math.min(.35,g.t/260))*(.8+rnd()*.4);
      let x,y;
      if(rnd()<.5&&g.chefs.length){const c=pick(g.chefs);x=c.x+c.vx*.4;y=c.y+c.vy*.4}else{x=XPAD+60+rnd()*(g.W-2*XPAD-120);y=YMIN+40+rnd()*(g.H-YMIN-80)}
      x=clamp(x,XPAD+40,g.W-XPAD-40);y=clamp(y,YMIN+20,g.H-30);
      g.warns.push({x,y,r:h==='volcan'?62:54,t:0,warn:1.4,burst:.55,kind:h==='volcan'?'fire':'meteor',hit:false});
    }
  }
  for(const w of g.warns){
    w.t+=dt;
    if(!w.hit&&w.t>=w.warn){
      w.hit=true;g.shake=Math.max(g.shake,7);sfx('boom');
      fxBurst(g,w.x,w.y,26,w.kind==='fire'?'#ff7a1a':'#ffe3a0',200,100);fxRing(g,w.x,w.y,w.r*1.5,w.kind==='fire'?'#ffb347':'#fff',.5);
      if(w.kind==='meteor')g.scorch.push({x:w.x,y:w.y,r:w.r*.8,t:0});
      for(const c of g.chefs){if(hyp(c.x-w.x,c.y-w.y)<w.r+8&&c.stun<=0){c.stun=1.3;setMood(c,'dizzy',1.3);if(c.carry)dropCarry(g,c,rnd()*160-80,rnd()*160-80);
        c.vx=(c.x-w.x)*4;c.vy=(c.y-w.y)*4;fxText(g,c.x,c.y-76,w.kind==='fire'?'¡AAY, QUEMA!':'¡PLAF!','#ff7a1a',22);chefSay(g,c,'hit',.8);}}
      for(const i of g.ings){if(i.state==='free'&&hyp(i.x-w.x,i.y-w.y)<w.r+4){i.dead=true;fxText(g,i.x,i.y-30,'¡Churrascado!','#ffb347',16);fxBurst(g,i.x,i.y-16,10,'#555',90);}}
    }
  }
  g.warns=g.warns.filter(w=>w.t<w.warn+w.burst);
  for(const s of g.scorch)s.t+=dt;g.scorch=g.scorch.filter(s=>s.t<8);
}

// ---------- Actualización principal ----------
function update(g,dt){
  g.t+=dt;
  const p=g.pot;if(p.moodT>0){p.moodT-=dt;if(p.moodT<=0)p.mood=null}p.bounce=Math.max(0,p.bounce-dt*2.5);
  g.shake=Math.max(0,g.shake-dt*20);g.flash=Math.max(0,g.flash-dt);
  if(g.state==='intro'){
    const prev=Math.ceil(g.cd);g.cd-=dt;const now=Math.ceil(g.cd);
    if(now!==prev&&now>=1&&now<=3&&!g.sim)sfx('tick');
    if(g.cd<=0){g.state='play';sfx('go');if(!g.order)newOrder(g);for(let k=0;k<3;k++)spawnIng(g,k<2?pick(g.order.need):pick(g.L.ings));}
    for(const c of g.chefs){c.anim+=dt}
    return;
  }
  if(g.state==='play'){
    // calor
    const rate=g.L.heat*(1+Math.min(1,g.t/200)*.5);
    g.heat=Math.min(100,g.heat+rate*dt);g.maxHeat=Math.max(g.maxHeat,g.heat);
    if(g.heat>=100){g.state='lose';g.endT=0;sfx('lose');g.shake=18;g.flash=.5;g.flashCol='rgba(255,60,30,';
      for(let i=0;i<70;i++)g.fx.push({k:'p',x:p.x+rnd()*60-30,y:p.y-30,vx:rnd()*500-250,vy:-rnd()*420,g:420,t:0,life:1.4+rnd(),col:pick(['#ff5a1a','#ffb347','#7be07b','#555','#ffe066']),r:3+rnd()*6});
      for(const ch of g.chefs){setMood(ch,'scared',99);ch.carry&&dropCarry(g,ch);ch.stun=0}
      chefSay(g,pick(g.chefs),'lose',1);return}
    if(g.heat>80){g.alarmT-=dt;if(g.alarmT<=0){g.alarmT=.6;sfx('alarm');if(!g.hotSaid||g.t-g.hotSaid>9){g.hotSaid=g.t;const c=pick(g.chefs);say(g,c.x,c.y-82,pick(['¡QUE SE QUEMA!','¡LA OLLA, LA OLLA!','¡SOCORRO, HUMO!','¡CORRED, INGREDIENTES!']),'#ff9a8a',c,1.6);}}}
    // pedido
    if(g.order){
      const o=g.order;o.t+=dt;
      if(o.t>=o.pat){g.expired++;g.heat=Math.min(100,g.heat+16);fxText(g,p.x,p.y-130,'¡El cliente se fue! +16°','#ff9a8a',22,1.6);sfx('bad');g.order=null;g.orderDelay=1;g.flash=.2;g.flashCol='rgba(255,90,60,';
        p.mood='angry';p.moodT=1.2}
    }else{g.orderDelay-=dt;if(g.orderDelay<=0)newOrder(g)}
    spawnLogic(g,dt);updHazards(g,dt);
    for(const c of g.chefs)updChef(g,c,dt);
    separate(g);
    for(const i of g.ings)updIng(g,i,dt);
    g.ings=g.ings.filter(i=>!i.dead);
    for(const c of g.chefs)if(c.carry&&c.carry.dead)c.carry=null;
  }
  if(g.state==='win'||g.state==='lose'){
    g.endT+=dt;
    if(g.state==='win')for(const c of g.chefs){c.anim+=dt;c.run=0;if(c.carry)c.carry=null}
    if(g.endT>(g.state==='win'?2.2:2.6)&&!g.shown){g.shown=true;if(!g.sim)showResult(g)}
  }
  // fx (siempre)
  for(const f of g.fx){f.t+=dt;if(f.k==='p'){f.vy+=f.g*dt;f.x+=f.vx*dt;f.y+=f.vy*dt}else if(f.k==='txt')f.y-=30*dt;else if(f.k==='z'){f.y-=18*dt;f.x+=Math.sin(f.t*4)*10*dt}}
  g.fx=g.fx.filter(f=>f.t<f.life);if(g.fx.length>350)g.fx.splice(0,g.fx.length-350);
  for(const s of g.say)s.t+=dt;g.say=g.say.filter(s=>s.t<s.life);
  // vapor
  if(!g.sim&&rnd()<dt*(4+g.heat*.18)){g.fx.push({k:'p',x:p.x+rnd()*80-40,y:p.y-44,vx:rnd()*20-10,vy:-40-rnd()*30,g:-20,t:0,life:.9+rnd()*.6,col:g.heat>70?'rgba(60,40,40,.55)':'rgba(255,255,255,.6)',r:5+rnd()*5,soft:true})}
  if(g.state==='play'){
    const hf=g.heat/100;
    for(const ch of g.chefs){}
  }
}
function stepGame(g,dt){while(dt>0){const s=Math.min(dt,1/45);update(g,s);dt-=s}}

// ---------- Render ----------
function w2s(g,x,y){return[g.ox+x*g.sc,g.oy+y*g.sc]}
function drawFloor(g){
  const L=g.L;
  cx.fillStyle=L.bg;cx.fillRect(0,0,g.W,g.H);
  const T=56;
  for(let y=0;y<Math.ceil(g.H/T)+1;y++)for(let x=0;x<Math.ceil(g.W/T)+1;x++){
    cx.fillStyle=(x+y)%2?L.f1:L.f2;cx.fillRect(x*T,56+y*T,T,T);}
  // sombras bajo el muro
  const gr=cx.createLinearGradient(0,56,0,96);gr.addColorStop(0,'rgba(40,10,30,.35)');gr.addColorStop(1,'rgba(40,10,30,0)');cx.fillStyle=gr;cx.fillRect(0,56,g.W,40);
  // cintas
  for(const b of g.belts){
    cx.save();rr(cx,b.x,b.y,b.w,b.h,10);cx.clip();cx.fillStyle='#4b4458';cx.fillRect(b.x,b.y,b.w,b.h);
    const off=(S.t*88)%34*(b.dx||0)+(S.t*88)%34*(b.dy||0);
    cx.fillStyle='#ffc93c';
    for(let x=b.x-40;x<b.x+b.w+40;x+=34){const xx=x+(off*b.dx);cx.beginPath();const cyy=b.y+b.h/2,hh=b.h*.28;
      cx.moveTo(xx,cyy-hh);cx.lineTo(xx+12*b.dx,cyy);cx.lineTo(xx,cyy+hh);cx.lineTo(xx+7*b.dx,cyy+hh);cx.lineTo(xx+19*b.dx,cyy);cx.lineTo(xx+7*b.dx,cyy-hh);cx.closePath();cx.fill();}
    cx.restore();cx.strokeStyle=INK;cx.lineWidth=3;rr(cx,b.x,b.y,b.w,b.h,10);cx.stroke();
  }
  // aceite
  for(const o of g.oil){
    cx.save();cx.translate(o.x,o.y);cx.scale(1,.72);cx.beginPath();cx.arc(0,0,o.r,0,7);cx.fillStyle='rgba(60,40,20,.55)';cx.fill();
    cx.fillStyle='rgba(255,220,120,.35)';cx.beginPath();cx.arc(-o.r*.25,-o.r*.25,o.r*.5,0,7);cx.fill();
    cx.strokeStyle='rgba(255,255,255,.5)';cx.lineWidth=3;cx.beginPath();cx.arc(0,0,o.r*.8,3.6,4.7);cx.stroke();cx.restore();}
  // puddles
  for(const p of g.puddles){const a=Math.min(1,(p.life-p.t)/1.2);cx.save();cx.globalAlpha=a*.7;cx.translate(p.x,p.y);cx.scale(1,.7);cx.beginPath();cx.arc(0,0,p.r,0,7);
    cx.fillStyle=p.k==='stink'?'#9bd05a':'#8fd8ff';cx.fill();cx.restore();
    if(p.k==='stink'&&((p.t*10)|0)%3===0){cx.save();cx.globalAlpha=a;cx.strokeStyle='#5f8f2a';cx.lineWidth=2;cx.beginPath();cx.moveTo(p.x-8,p.y-4);cx.quadraticCurveTo(p.x-4,p.y-16,p.x-8,p.y-24);cx.moveTo(p.x+6,p.y-2);cx.quadraticCurveTo(p.x+10,p.y-14,p.x+6,p.y-22);cx.stroke();cx.restore();}}
  // portales
  for(const pr of g.portals)for(const a of pr){
    cx.save();cx.translate(a.x,a.y);cx.scale(1,.6);
    for(let k=0;k<3;k++){cx.beginPath();cx.arc(0,0,26-k*7+Math.sin(S.t*4+k)*2,0,7);cx.fillStyle=k%2?'#fff':pr.col;cx.globalAlpha=.85;cx.fill();}
    cx.restore();cx.globalAlpha=1;
  }
  // marcas de meteoritos
  for(const s of g.scorch){cx.save();cx.globalAlpha=Math.min(.6,(8-s.t)/3);cx.translate(s.x,s.y);cx.scale(1,.6);cx.beginPath();cx.arc(0,0,s.r,0,7);cx.fillStyle='#2a2030';cx.fill();cx.restore();}
  // avisos
  for(const w of g.warns){
    const k=w.t<w.warn?w.t/w.warn:1;
    cx.save();cx.translate(w.x,w.y);cx.scale(1,.7);
    if(w.t<w.warn){cx.beginPath();cx.arc(0,0,w.r,0,7);cx.fillStyle='rgba(255,40,30,'+(.15+.2*Math.abs(Math.sin(w.t*10)))+')';cx.fill();
      cx.beginPath();cx.arc(0,0,w.r*k,0,7);cx.strokeStyle='#ff3a2a';cx.lineWidth=5;cx.stroke();cx.restore();
      if(w.kind==='meteor'){const yy=-(1-k)*(g.H*.9);cx.save();cx.translate(w.x,w.y+yy);cx.fillStyle='#8b7a8f';cx.beginPath();cx.arc(0,0,18,0,7);cx.fill();cx.strokeStyle=INK;cx.lineWidth=3;cx.stroke();
        cx.fillStyle='rgba(255,170,60,.7)';cx.beginPath();cx.moveTo(-14,-6);cx.lineTo(0,-60);cx.lineTo(14,-6);cx.fill();cx.restore();}
    }else{
      const kk=(w.t-w.warn)/w.burst;
      for(let i=0;i<5;i++){const hh=70*(1-kk)*(.7+.3*Math.sin(S.t*20+i)),fx_=(i-2)*14;cx.beginPath();cx.moveTo(fx_-12,0);cx.quadraticCurveTo(fx_,-hh,fx_+12,0);cx.fillStyle=i%2?'#ffe066':'#ff7a1a';cx.fill();}
      cx.restore();
    }
  }
  // muro de fondo
  const wg=cx.createLinearGradient(0,0,0,56);wg.addColorStop(0,shade(L.wall,.15));wg.addColorStop(1,L.wall);cx.fillStyle=wg;cx.fillRect(0,0,g.W,56);
  cx.fillStyle='rgba(0,0,0,.2)';cx.fillRect(0,50,g.W,6);
  // ventanas/estantes
  const n=Math.max(2,Math.floor(g.W/190));
  for(let k=0;k<n;k++){const wx=(k+.5)*g.W/n;if(Math.abs(wx-g.W/2)<70)continue;
    rr(cx,wx-34,8,68,32,8);fs(cx,lerpCol('#bfe9ff','#ffffff',.3),INK,3);cx.strokeStyle='rgba(255,255,255,.7)';cx.lineWidth=3;cx.beginPath();cx.moveTo(wx-22,32);cx.lineTo(wx-10,14);cx.stroke();}
  // puerta de la despensa
  const dx=g.W/2;
  rr(cx,dx-48,-4,96,62,16);fs(cx,'#6b3f2a',INK,3.5);rr(cx,dx-38,2,76,54,12);fs(cx,'#2a1520',INK,2.5);
  cx.fillStyle='#ffc93c';rr(cx,dx-34,-2,68,16,6);cx.fill();cx.strokeStyle=INK;cx.lineWidth=2;cx.stroke();
  cx.fillStyle=INK;cx.font='700 11px Fredoka,sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('DESPENSA',dx,6.5);
  cx.fillStyle='rgba(255,255,255,.7)';for(let k=0;k<3;k++){const ey=30+(((S.t*2+k)%1)*4);cx.beginPath();cx.arc(dx-14+k*14,ey,3,0,7);cx.fill()}
  // marco
  cx.strokeStyle=shade(L.wall,-.2);cx.lineWidth=XPAD*.9;cx.strokeRect(XPAD*.45,XPAD*.45+56,g.W-XPAD*.9,g.H-56-XPAD*.9);
}
function drawCounter(g,r){
  const L=g.L,hgt=22;
  cx.fillStyle='rgba(30,10,30,.25)';rr(cx,r.x+4,r.y+6,r.w,r.h,10);cx.fill();
  // cara frontal
  rr(cx,r.x,r.y-hgt+8,r.w,r.h+hgt-8,10);fs(cx,L.ct,INK,3);
  // cara superior
  rr(cx,r.x,r.y-hgt,r.w,r.h,10);fs(cx,L.ctT,INK,3);
  cx.fillStyle='rgba(255,255,255,.35)';rr(cx,r.x+8,r.y-hgt+6,r.w-16,6,3);cx.fill();
  // decoración: tabla y cuchillo
  cx.save();cx.translate(r.x+r.w*.5,r.y-hgt+r.h*.5);
  rr(cx,-r.w*.22,-r.h*.2,r.w*.44,r.h*.4,6);fs(cx,'#e0b074',INK,2);
  cx.restore();
}
function drawEnt(g,e){
  if(e.k==='counter')return drawCounter(g,e.r);
  if(e.k==='pot'){drawPot(cx,g.pot.x,g.pot.y,g.heat,S.t,g.pot.mood,g.pot.bounce,0);return}
  if(e.k==='chef'){
    const c=e.c;const mood=c.mood;
    let lx=c.aimx,ly=c.aimy*.6;
    // aro del jugador
    cx.save();cx.translate(c.x,c.y+2);cx.scale(1,.45);cx.beginPath();cx.arc(0,0,27,0,7);cx.lineWidth=5;cx.strokeStyle=PCOL[c.slot];cx.stroke();cx.restore();
    if(c.dash>0){cx.save();cx.globalAlpha=.4;drawChef(cx,c.def,c.x-c.dx*26,c.y-c.dy*26,{t:c.anim,run:1,face:c.face,mood:'idle',noShadow:true});cx.restore();}
    drawChef(cx,c.def,c.x,c.y,{t:c.anim,run:c.run,face:c.face,mood,lx:lx*c.face,ly,sq:c.sq,rot:c.stun>0?Math.sin(c.anim*14)*.18:0});
    if(c.carry){const i=c.carry;const wob=c.carryT>4?Math.sin(S.t*40)*3:Math.sin(S.t*8)*1.5;
      drawIng(cx,i.type,c.x+wob,c.y-62-(c.def.body==='gnomo'?-6:0)+(c.def.body==='croqueta'?-14:0)-(c.def.body==='caballero'?18:0)-(c.def.body==='gnomo'?20:0),{t:S.t*(c.carryT>4?2:1),run:.8,mood:'scared',sc:.8,noShadow:true,lx:0,ly:0});
      if(c.carryT>4){cx.fillStyle='#fff';cx.font='700 14px Fredoka,sans-serif';cx.textAlign='center';cx.fillText('!',c.x+22,c.y-90);}}
    // etiqueta
    const lab=c.human?(G.nHuman>1?'J'+(c.hi+1):'TÚ'):(c.def.n.split(' ')[0]);
    cx.font='700 12px Fredoka,sans-serif';cx.textAlign='center';cx.textBaseline='middle';
    const tw=cx.measureText(lab).width+12;rr(cx,c.x-tw/2,c.y+10,tw,16,8);cx.fillStyle=PCOL[c.slot];cx.fill();cx.strokeStyle=INK;cx.lineWidth=2;cx.stroke();
    cx.fillStyle='#fff';cx.fillText(lab,c.x,c.y+18.5);
    if(c.dashCd>0&&c.human){}
    return;
  }
  if(e.k==='ing'){
    const i=e.i;
    let o={t:i.t,run:i.run,mood:i.mood,lx:i.lx,ly:i.ly,sq:i.sq};
    if(i.state==='thrown'){o.rot=i.rot;o.run=0;o.mood='scared'}
    drawIng(cx,i.type,i.x,i.y+(i.state==='thrown'?-4:0),o);
    if(i.type==='hielo'&&i.state==='free'){cx.fillStyle='rgba(255,255,255,.8)';cx.font='700 11px Fredoka';cx.textAlign='center';}
  }
}
function drawFx(g){
  for(const f of g.fx){
    const k=f.t/f.life;
    if(f.k==='p'){cx.globalAlpha=f.soft?Math.min(.7,(1-k)):1-k*k;cx.fillStyle=f.col;cx.beginPath();cx.arc(f.x,f.y,f.r*(f.soft?1+k:1-k*.5),0,7);cx.fill();cx.globalAlpha=1}
    else if(f.k==='txt'){cx.globalAlpha=Math.min(1,(1-k)*2.2);const s=f.size*(1+Math.max(0,.3-f.t)*1.4);cx.font='700 '+s+'px Fredoka,sans-serif';cx.textAlign='center';cx.textBaseline='middle';
      cx.lineWidth=5;cx.strokeStyle=INK;cx.lineJoin='round';cx.strokeText(f.txt,f.x,f.y);cx.fillStyle=f.col;cx.fillText(f.txt,f.x,f.y);cx.globalAlpha=1}
    else if(f.k==='ring'){cx.globalAlpha=1-k;cx.strokeStyle=f.col;cx.lineWidth=6*(1-k);cx.save();cx.translate(f.x,f.y);cx.scale(1,.6);cx.beginPath();cx.arc(0,0,f.r*k,0,7);cx.stroke();cx.restore();cx.globalAlpha=1}
    else if(f.k==='plop'){const x=mix(f.x0,f.x1,k),y=mix(f.y0,f.y1,k)-Math.sin(k*Math.PI)*50;drawIng(cx,f.type,x,y+20,{t:S.t,sc:1-k*.5,noShadow:true,run:0,mood:'scared'})}
    else if(f.k==='z'){cx.globalAlpha=1-k;cx.fillStyle='#fff';cx.font='700 '+(14+k*10)+'px Fredoka';cx.textAlign='center';cx.strokeStyle=INK;cx.lineWidth=3;cx.strokeText('Z',f.x,f.y);cx.fillText('Z',f.x,f.y);cx.globalAlpha=1}
  }
}
function drawBubbles(g){
  for(const s of g.say){
    const k=s.t/s.life,a=Math.min(1,s.t*8,(1-k)*4);
    let x=s.x,y=s.y;if(s.who&&s.who.x!==undefined){x=s.who.x;y=s.who.y-(s.who.def?82:50)}
    cx.save();cx.globalAlpha=a;cx.font='700 14px Fredoka,sans-serif';cx.textAlign='center';cx.textBaseline='middle';
    const words=s.txt.split(' ');let lines=[''];for(const w of words){const t=(lines[lines.length-1]+' '+w).trim();if(cx.measureText(t).width>150&&lines[lines.length-1]){lines.push(w)}else lines[lines.length-1]=t}
    const lw=Math.max(...lines.map(l=>cx.measureText(l).width))+18,lh=lines.length*17+10;
    x=clamp(x,lw/2+4,g.W-lw/2-4);y=Math.max(y,lh+8);
    const sc=.7+Math.min(.3,s.t*3);cx.translate(x,y);cx.scale(sc,sc);
    rr(cx,-lw/2,-lh-6,lw,lh,12);cx.fillStyle='#fff';cx.fill();cx.strokeStyle=INK;cx.lineWidth=2.5;cx.stroke();
    cx.beginPath();cx.moveTo(-6,-7);cx.lineTo(0,2);cx.lineTo(6,-7);cx.fillStyle='#fff';cx.fill();cx.stroke();
    cx.fillStyle='#fff';cx.fillRect(-5,-8,10,3);
    cx.fillStyle=INK;lines.forEach((l,i)=>cx.fillText(l,0,-lh-6+5+i*17+9));
    cx.restore();
  }
}
function drawWorld(g){
  cx.save();
  const sh=g.shake*(rnd()-.5),sh2=g.shake*(rnd()-.5);
  cx.translate(g.ox+sh,g.oy+sh2);cx.scale(g.sc,g.sc);
  cx.save();cx.beginPath();cx.rect(-4,-4,g.W+8,g.H+8);cx.clip();
  drawFloor(g);
  const list=[];
  for(const r of g.cts)list.push({k:'counter',r,y:r.y+r.h});
  list.push({k:'pot',y:g.pot.y+34});
  for(const c of g.chefs)list.push({k:'chef',c,y:c.y});
  for(const i of g.ings)if(i.state!=='carried')list.push({k:'ing',i,y:i.y});
  list.sort((a,b)=>a.y-b.y);
  for(const e of list)drawEnt(g,e);
  drawFx(g);drawBubbles(g);
  cx.restore();
  cx.restore();
  // viñeta de calor
  if(g.state==='play'&&g.heat>70){
    const k=(g.heat-70)/30,pul=.5+.5*Math.sin(S.t*(6+k*6));
    const gr=cx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*.35,VW/2,VH/2,Math.max(VW,VH)*.75);gr.addColorStop(0,'rgba(255,40,20,0)');gr.addColorStop(1,'rgba(255,40,20,'+(k*.45*(.5+pul*.5))+')');
    cx.fillStyle=gr;cx.fillRect(0,0,VW,VH);
  }
  if(g.flash>0){cx.fillStyle=g.flashCol+Math.min(.45,g.flash*1.6)+')';cx.fillRect(0,0,VW,VH)}
}

// ---------- HUD ----------
function remainingFlags(o){
  const need=o.need.slice();return o.items.map(t=>{const k=need.indexOf(t);if(k>=0){need.splice(k,1);return false}return true});
}
function drawFlame(x,y,s,col){cx.save();cx.translate(x,y);cx.scale(s,s);cx.beginPath();cx.moveTo(0,-14);cx.quadraticCurveTo(10,-4,8,6);cx.quadraticCurveTo(6,14,0,14);cx.quadraticCurveTo(-8,14,-8,5);cx.quadraticCurveTo(-8,-2,-2,-6);cx.quadraticCurveTo(-2,-2,2,0);cx.quadraticCurveTo(4,-6,0,-14);cx.fillStyle=col||'#ff7a1a';cx.fill();cx.strokeStyle=INK;cx.lineWidth=2;cx.stroke();cx.restore();}
function drawHUD(g){
  const compact=VH<520;
  const font=(w,s)=>w+' '+s+'px Fredoka,sans-serif';
  cx.textBaseline='middle';
  // tarjeta del pedido
  let ox=compact?50:54,oy=compact?4:6,ow=compact?Math.min(VW*.5,420)-ox:VW-ox-8,oh=compact?48:66;
  rr(cx,ox,oy,ow,oh,16);cx.fillStyle='rgba(255,250,240,.96)';cx.fill();cx.strokeStyle=INK;cx.lineWidth=3;cx.stroke();
  const o=g.order;
  if(o){
    const flags=remainingFlags(o);
    cx.fillStyle=INK;cx.textAlign='left';cx.font=font(700,compact?12:13);
    cx.fillText('PEDIDO: '+o.name,ox+12,oy+(compact?11:13));
    const isz=compact?30:36;let ix=ox+12;
    o.items.forEach((t,k)=>{
      const done=flags[k],cxx=ix+isz/2,cyy=oy+(compact?31:38);
      cx.beginPath();cx.arc(cxx,cyy,isz/2,0,7);cx.fillStyle=done?'#b7f2d4':'#fff';cx.fill();cx.strokeStyle=done?'#2fcf9b':INK;cx.lineWidth=2.5;cx.stroke();
      cx.save();cx.beginPath();cx.arc(cxx,cyy,isz/2-1,0,7);cx.clip();cx.globalAlpha=done?.45:1;
      drawIng(cx,t,cxx,cyy+isz*.34,{sc:isz/54,t:S.t+k,noShadow:true,run:0,mood:done?'happy':'idle'});cx.restore();
      if(done){cx.strokeStyle='#0a8a5c';cx.lineWidth=4;cx.lineCap='round';cx.beginPath();cx.moveTo(cxx-7,cyy);cx.lineTo(cxx-2,cyy+6);cx.lineTo(cxx+8,cyy-6);cx.stroke();}
      ix+=isz+7;
    });
    // paciencia
    const pk=1-o.t/o.pat,bx=ix+4,bw=ox+ow-12-bx;
    if(bw>40){
      cx.fillStyle='rgba(59,36,51,.15)';rr(cx,bx,oy+oh-(compact?17:20),bw,10,5);cx.fill();
      cx.fillStyle=pk>.5?'#3ed6a6':pk>.25?'#ffc93c':'#ff5a4d';if(pk>0){rr(cx,bx,oy+oh-(compact?17:20),Math.max(6,bw*pk),10,5);cx.fill();}
      cx.font=font(600,10);cx.fillStyle=INK;cx.textAlign='right';cx.fillText(Math.ceil(o.pat-o.t)+'s',ox+ow-12,oy+(compact?11:13));
    }
  }else{
    cx.fillStyle=INK;cx.textAlign='center';cx.font=font(700,15);cx.fillText(g.state==='intro'?'Preparando la cocina…':g.state==='win'?'¡Todos los pedidos servidos!':g.state==='lose'?'¡La olla ha explotado!':'Llega un nuevo cliente…',ox+ow/2,oy+oh/2);
  }
  // barra de calor
  let hx=compact?Math.min(VW*.5,420)+10:10,hy=compact?12:76,hw=compact?VW-hx-10:VW-20,hh=compact?28:24;
  rr(cx,hx,hy,hw,hh,hh/2);cx.fillStyle='rgba(40,20,40,.78)';cx.fill();cx.strokeStyle=INK;cx.lineWidth=3;cx.stroke();
  const hf=clamp(g.heat/100,0,1),fw=Math.max(hh-6,(hw-6)*hf);
  const gr=cx.createLinearGradient(hx,0,hx+hw,0);gr.addColorStop(0,'#3ed6a6');gr.addColorStop(.5,'#ffc93c');gr.addColorStop(.8,'#ff7a1a');gr.addColorStop(1,'#ff2a1a');
  cx.save();rr(cx,hx+3,hy+3,hw-6,hh-6,(hh-6)/2);cx.clip();cx.fillStyle=gr;cx.fillRect(hx+3,hy+3,fw,hh-6);
  cx.fillStyle='rgba(255,255,255,.25)';cx.fillRect(hx+3,hy+3,fw,(hh-6)*.4);cx.restore();
  const pulse=g.heat>80?(1+.18*Math.sin(S.t*14)):1;
  drawFlame(hx+hh/2+4,hy+hh/2,.62*pulse*(hh/24),g.heat>70?'#ff3b1f':'#ffb02e');
  cx.font=font(700,compact?13:12);cx.textAlign='center';cx.fillStyle='#fff';cx.strokeStyle=INK;cx.lineWidth=3;
  const lab=g.heat>85?'¡¡PELIGRO!! '+Math.round(g.heat)+'°':'OLLA '+Math.round(g.heat)+'°';
  cx.strokeText(lab,hx+hw/2,hy+hh/2+1);cx.fillText(lab,hx+hw/2,hy+hh/2+1);
  cx.textAlign='right';cx.font=font(700,compact?13:12);const prog=g.done+'/'+g.L.target+' pedidos';cx.strokeText(prog,hx+hw-12,hy+hh/2+1);cx.fillText(prog,hx+hw-12,hy+hh/2+1);
  // fichas de jugadores
  const n=g.chefs.length;
  let cyy=compact?VH-30:104,cw=compact?Math.min(140,(VW-200)/n):(VW-20)/n-6,ch=compact?30:32;
  let sx=compact?(VW-(cw+6)*n)/2:10;
  const top=Math.max(...g.chefs.map(c=>c.pts));
  g.chefs.forEach((c,k)=>{
    const x=sx+k*(cw+6);
    rr(cx,x,cyy,cw,ch,16);cx.fillStyle='rgba(255,250,240,.92)';cx.fill();cx.strokeStyle=PCOL[c.slot];cx.lineWidth=3.5;cx.stroke();
    cx.save();cx.beginPath();cx.arc(x+16,cyy+ch/2,13,0,7);cx.clip();cx.fillStyle='#fff';cx.fillRect(x+3,cyy,26,ch);
    drawChef(cx,c.def,x+16,cyy+ch/2+17,{sc:.3,noShadow:true,t:0,mood:'idle'});cx.restore();
    cx.fillStyle=INK;cx.textAlign='left';cx.font=font(700,14);cx.fillText(String(c.pts),x+34,cyy+ch/2+1);
    if(c.pts>0&&c.pts===top&&n>1){cx.fillStyle='#e6a800';cx.font=font(700,11);cx.fillText('★',x+34+cx.measureText(String(c.pts)).width+4,cyy+ch/2);}
    if(c.combo>1&&g.t-c.lastDrop<5.5){cx.fillStyle='#ff4fa0';cx.textAlign='right';cx.font=font(700,13);cx.fillText('x'+Math.min(c.combo,5),x+cw-8,cyy+ch/2+1)}
    else if(cw>86){cx.fillStyle='rgba(59,36,51,.5)';cx.textAlign='right';cx.font=font(500,10);cx.fillText(c.human?(g.nHuman>1?'J'+(c.hi+1):'TÚ'):'IA',x+cw-8,cyy+ch/2+1)}
  });
  // controles táctiles
  if(g.state==='play'||g.state==='intro'){
    const showT=TCH.seen||matchMedia('(pointer:coarse)').matches;
    if(TCH.on){
      cx.globalAlpha=.55;cx.beginPath();cx.arc(TCH.bx,TCH.by,52,0,7);cx.fillStyle='rgba(255,255,255,.35)';cx.fill();cx.strokeStyle='#fff';cx.lineWidth=3;cx.stroke();
      cx.beginPath();cx.arc(TCH.bx+TCH.vx*40,TCH.by+TCH.vy*40,24,0,7);cx.fillStyle='#fff';cx.fill();cx.globalAlpha=1;
    }else if(showT&&g.state!=='intro'){
      cx.globalAlpha=.28;cx.beginPath();cx.arc(80,VH-100,44,0,7);cx.strokeStyle='#fff';cx.lineWidth=4;cx.setLineDash([8,8]);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1;
    }
    const me=g.chefs.find(c=>c.human&&c.hi===0);
    if(showT&&me){
      const a=actBtn(),cd=me.carry?0:clamp(me.dashCd/1.25,0,1);
      cx.globalAlpha=TCH.aHeld?1:.88;
      cx.beginPath();cx.arc(a.x,a.y+(TCH.aHeld?3:0),a.r,0,7);cx.fillStyle=me.carry?'#ff9a3d':'#3d9bff';cx.fill();cx.strokeStyle='#fff';cx.lineWidth=5;cx.stroke();
      if(cd>0){cx.beginPath();cx.moveTo(a.x,a.y);cx.arc(a.x,a.y,a.r-3,-Math.PI/2,-Math.PI/2+cd*Math.PI*2);cx.fillStyle='rgba(0,0,0,.4)';cx.fill();}
      cx.globalAlpha=1;cx.fillStyle='#fff';cx.textAlign='center';cx.font=font(700,me.carry?17:14);cx.strokeStyle='rgba(0,0,0,.35)';cx.lineWidth=3;
      const tx=me.carry?'LANZAR':'ZAMBULLIR';cx.strokeText(tx,a.x,a.y+1);cx.fillText(tx,a.x,a.y+1);
    }
  }
  // intro
  if(g.state==='intro'){
    cx.fillStyle='rgba(30,10,30,.45)';cx.fillRect(0,HUDH(),VW,VH);
    const k=g.cd,cyy2=VH*.42,num=Math.ceil(g.cd);
    cx.textAlign='center';
    rr(cx,VW/2-Math.min(VW*.44,260),cyy2-110,Math.min(VW*.88,520),70,22);cx.fillStyle='#fff6e6';cx.fill();cx.strokeStyle=INK;cx.lineWidth=4;cx.stroke();
    cx.fillStyle=INK;cx.font=font(700,Math.min(26,VW/14));cx.fillText(g.L.n,VW/2,cyy2-84);
    cx.font=font(500,Math.min(15,VW/26));cx.fillText(g.L.desc,VW/2,cyy2-58);
    const s=1+(k%1)*.5;cx.font=font(700,Math.round(96*s));cx.lineWidth=10;cx.strokeStyle=INK;cx.lineJoin='round';
    const txt=num>0&&g.cd>.35?String(num):'¡YA!';cx.strokeText(txt,VW/2,cyy2+30);cx.fillStyle=num===1?'#ffc93c':'#fff';cx.fillText(txt,VW/2,cyy2+30);
    if(g.tip){const lines=['¡Atrapa los ingredientes del PEDIDO y llévalos a la olla!','Joystick para moverte · botón: zambullida o lanzar','Mira la olla: ¡si se pone roja, se quema!'];
      cx.font=font(600,Math.min(15,VW/26));lines.forEach((l,i)=>{const w=cx.measureText(l).width+24;rr(cx,VW/2-w/2,cyy2+84+i*30,w,26,13);cx.fillStyle='rgba(255,255,255,.92)';cx.fill();cx.fillStyle=INK;cx.fillText(l,VW/2,cyy2+97+i*30)});}
  }
  if(g.state==='win'||g.state==='lose'){
    const k=Math.min(1,g.endT*3);
    cx.save();cx.translate(VW/2,VH*.4);cx.scale(.5+.5*k,.5+.5*k);cx.textAlign='center';cx.font=font(700,Math.min(54,VW/11));cx.lineWidth=9;cx.strokeStyle=INK;cx.lineJoin='round';
    const t1=g.state==='win'?'¡SOPA PERFECTA!':'¡SE QUEMÓ!';
    cx.strokeText(t1,0,0);cx.fillStyle=g.state==='win'?'#7af0c4':'#ff7a5a';cx.fillText(t1,0,0);cx.restore();
  }
}

// ---------- Fondo de menús ----------
const MB={ings:[],chefs:[],t:0};
function menuInit(){
  MB.ings=[];for(let i=0;i<9;i++)MB.ings.push({type:pick(Object.keys(ING)),x:rnd()*VW,y:rnd()*VH,vx:(rnd()-.5)*120,vy:(rnd()-.5)*120,t:rnd()*9});
}
function drawMenuBG(dt){
  MB.t+=dt;const L=LEVELS[(S.lv!=null&&S.scene!=='title')?S.lv:0];
  const T=70,off=(MB.t*14)%(T*2);
  cx.fillStyle='#4a1f3d';cx.fillRect(0,0,VW,VH);
  const th=S.scene==='title'?LEVELS[0]:L;
  for(let y=-2;y<VH/T+2;y++)for(let x=-2;x<VW/T+2;x++){cx.fillStyle=(x+y)&1?th.f1:th.f2;cx.fillRect(x*T+off,y*T+off*.5,T,T);}
  const g=cx.createLinearGradient(0,0,0,VH);g.addColorStop(0,'rgba(40,10,40,.55)');g.addColorStop(.5,'rgba(40,10,40,.2)');g.addColorStop(1,'rgba(40,10,40,.6)');cx.fillStyle=g;cx.fillRect(0,0,VW,VH);
  for(const i of MB.ings){
    i.t+=dt;i.x+=i.vx*dt;i.y+=i.vy*dt;
    if(i.x<20||i.x>VW-20)i.vx*=-1;if(i.y<40||i.y>VH-10)i.vy*=-1;
    drawIng(cx,i.type,i.x,i.y,{t:i.t,run:1,mood:'scared',sc:1.15,lx:i.vx>0?1:-1});
  }
  if(S.scene==='title'){
    const py=VH*(VH<520?.62:.5);
    cx.save();cx.translate(VW/2,py);const s=Math.min(1.7,VW/300,VH/360);cx.scale(s,s);drawPot(cx,0,0,40+Math.sin(MB.t*.8)*30+30,MB.t,null,0,0);cx.restore();
    const cs=[CHEFS[0],CHEFS[3],CHEFS[1],CHEFS[2]];
    cs.forEach((c,k)=>{const x=VW*(.14+k*.24),y=py+VH*.1+Math.abs(Math.sin(MB.t*3+k))*-6+(k%2)*10;drawChef(cx,c,x,y,{t:MB.t+k,run:.4,sc:Math.min(1.2,VW/380,VH/520),mood:k%2?'happy':'idle',face:k<2?1:-1});});
  }
}

// ---------- Interfaz ----------
const SCREENS=['sTitle','sLevels','sLobby','sChefs','sResult','sPause'];
function showScreen(n){
  S.scene=n==='game'?'game':n;
  for(const id of SCREENS)$(id).classList.add('hide');
  $('bPause').classList.toggle('hide',n!=='game');
  if(n==='title')$('sTitle').classList.remove('hide');
  if(n==='levels'){buildLevels();$('sLevels').classList.remove('hide')}
  if(n==='lobby'){buildLobby();$('sLobby').classList.remove('hide')}
  if(n==='chefs'){buildChefs();$('sChefs').classList.remove('hide')}
  $('tCoins').textContent=SV.coins;document.querySelectorAll('.coinN').forEach(e=>e.textContent=SV.coins);
}
function toast(t){const e=$('toast');e.textContent=t;e.classList.remove('hide');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.add('hide'),2600);}
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w*2;c.height=h*2;c.style.aspectRatio=w+'/'+h;c._w=w;c._h=h;return c}
function paintOn(c,fn){const x=c.getContext('2d');x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,c._w,c._h);fn(x);}
function chefPortrait(c,def,mood){paintOn(c,x=>{const g=x.createRadialGradient(c._w/2,c._h*.5,5,c._w/2,c._h*.5,c._w*.7);g.addColorStop(0,'#fff8ea');g.addColorStop(1,lerpCol(def.c1,'#ffffff',.55));x.fillStyle=g;x.fillRect(0,0,c._w,c._h);
  const s=c._h/105;drawChef(x,def,c._w/2,c._h*.93,{sc:s,mood:mood||'happy',t:0,noShadow:false});});}
function buildLevels(){
  const gr=$('lvGrid');gr.innerHTML='';
  LEVELS.forEach((L,i)=>{
    const open=unlockedLv(i),d=document.createElement('div');d.className='lv'+(open?'':' lock');
    const cv2=mkCanvas(150,96);
    paintOn(cv2,x=>{const T=24;for(let yy=0;yy<5;yy++)for(let xx=0;xx<7;xx++){x.fillStyle=(xx+yy)&1?L.f1:L.f2;x.fillRect(xx*T,yy*T,T,T)}
      x.fillStyle=L.wall;x.fillRect(0,0,150,14);
      for(const r of L.cts){x.fillStyle=L.ct;rr(x,r[0]*150,14+r[1]*82,Math.max(10,r[2]*150),Math.max(8,r[3]*82),4);x.fill();x.strokeStyle=INK;x.lineWidth=1.5;x.stroke();}
      x.save();x.translate(75,56);x.scale(.5,.5);drawPot(x,0,0,20+i*10,0,null,0,0);x.restore();
      L.ings.slice(0,3).forEach((t,k)=>drawIng(x,t,26+k*49,34+((k*17)%11),{sc:.7,mood:'scared',t:k}));
    });
    d.appendChild(cv2);
    const st=SV.stars[i]||0;
    d.insertAdjacentHTML('beforeend','<b>'+(i+1)+'. '+L.n+'</b><small>'+L.sub+'</small><div class="stars">'+[1,2,3].map(k=>'<span class="'+(k<=st?'':'off')+'">★</span>').join('')+'</div>');
    if(!open)d.insertAdjacentHTML('beforeend','<div class="lockm">🔒</div>');
    d.onclick=()=>{audioInit();sfx('click');if(!open){toast('Supera la cocina anterior para desbloquear esta');return}S.lv=i;showScreen('lobby')};
    gr.appendChild(d);
  });
}
function nextFree(slotIdx,dir,ia){
  const cur=SV.slots[slotIdx].c;let k=CHEFS.findIndex(c=>c.id===cur);
  const used=SV.slots.filter((s,i)=>i!==slotIdx&&s.m!=='off').map(s=>s.c);
  for(let n=0;n<CHEFS.length;n++){k=(k+dir+CHEFS.length)%CHEFS.length;const c=CHEFS[k];
    if(used.includes(c.id))continue;if(!ia&&!hasChef(c.id))continue;return c.id}
  return cur;
}
function buildLobby(){
  const L=LEVELS[S.lv];$('lbTitle').textContent=L.n;$('lbDesc').textContent='Elige quién cocina. Tú eres J1; los demás pueden ser humanos (mismo teclado) o IA.';
  const el=$('slots');el.innerHTML='';
  const modeTxt={h:'👤 Humano',ia:'🤖 IA',off:'— Vacío'};
  SV.slots.forEach((s,i)=>{
    if(i===0)s.m='h';
    if(s.m!=='off'&&!(s.m==='h'?hasChef(s.c):true)){s.c=CHEFS.find(c=>hasChef(c.id)).id}
    const d=document.createElement('div');d.className='slot'+(s.m==='off'?' off':'');d.style.setProperty('--tc',PCOL[i]);
    const c=mkCanvas(110,120);chefPortrait(c,CHEF_BY[s.c],s.m==='off'?'idle':'happy');
    d.appendChild(c);
    const nm=document.createElement('div');nm.className='nm';nm.textContent=s.m==='off'?'Sin jugador':CHEF_BY[s.c].n;d.appendChild(nm);
    const row=document.createElement('div');row.className='row';
    const l=document.createElement('button');l.className='slotb';l.textContent='◀';const r=document.createElement('button');r.className='slotb';r.textContent='▶';
    const m=document.createElement('button');m.className='slotb mode';m.textContent=modeTxt[s.m];
    l.onclick=()=>{sfx('click');if(s.m==='off')return;s.c=nextFree(i,-1,s.m==='ia');save();buildLobby()};
    r.onclick=()=>{sfx('click');if(s.m==='off')return;s.c=nextFree(i,1,s.m==='ia');save();buildLobby()};
    m.onclick=()=>{sfx('click');if(i===0)return;s.m=s.m==='ia'?'h':s.m==='h'?'off':'ia';
      if(s.m!=='off'){const used=SV.slots.filter((q,k)=>k!==i&&q.m!=='off').map(q=>q.c);if(used.includes(s.c)||(s.m==='h'&&!hasChef(s.c)))s.c=nextFree(i,1,s.m==='ia');}
      save();buildLobby()};
    row.append(l,m,r);d.appendChild(row);
    const sm=document.createElement('small');
    let hn=0;for(let k=0;k<i;k++)if(SV.slots[k].m==='h')hn++;
    sm.textContent=s.m==='h'?(TCH.seen&&hn===0?'Pantalla táctil':SCHEMES[hn].name):s.m==='ia'?CHEF_BY[s.c].d:'Toca “Vacío” para añadir';
    d.appendChild(sm);el.appendChild(d);
  });
  const act=SV.slots.filter(s=>s.m!=='off').length;
  $('bStart').disabled=act<2;$('lbHint').textContent=act<2?'Necesitas al menos 2 cocineros':'Teclado, mando o táctil. ¡Hasta 4 jugadores en la misma pantalla!';
}
function buildChefs(){
  const gr=$('chGrid');gr.innerHTML='';
  CHEFS.forEach(def=>{
    const own=hasChef(def.id),d=document.createElement('div');d.className='chc'+(own?'':' lock');
    const c=mkCanvas(150,130);chefPortrait(c,def,own?'happy':'idle');d.appendChild(c);
    d.insertAdjacentHTML('beforeend','<b>'+def.n+'</b><small>'+def.t+'</small><small>'+def.d+'</small>');
    if(own){d.insertAdjacentHTML('beforeend','<span class="price" style="background:#c8f5de">✓ Contratado</span>');}
    else{const b=document.createElement('button');b.className='buy';b.innerHTML='Fichar · '+def.price+' <i class="ic coin"></i>';b.disabled=SV.coins<def.price;
      b.onclick=ev=>{ev.stopPropagation();if(SV.coins<def.price)return;SV.coins-=def.price;SV.chefs[def.id]=1;save();sfx('coin');toast('¡'+def.n+' se une a la cocina!');showScreen('chefs')};d.appendChild(b);}
    d.onclick=()=>{audioInit();sfx('click');if(own)toast('“'+pick(def.L.win)+'” — '+def.n)};
    gr.appendChild(d);
  });
}
function startGame(li,slots,opt){
  S.lv=li;S.paused=false;G=newGame(li,slots,opt);S.scene='game';
  for(const id of SCREENS)$(id).classList.add('hide');$('bPause').classList.remove('hide');
  TCH.id=null;TCH.on=false;TCH.vx=TCH.vy=0;TCH.aid=null;TCH.act=false;
  musicOn=true;audioInit();if(AC&&AC.state==='suspended')AC.resume();
  // intro: un par de ingredientes ya en pista para dar vida
  return G;
}
function stars(g){
  let s=1;if(g.expired<=1)s=2;if(g.expired===0&&g.maxHeat<88)s=3;return s;
}
function showResult(g){
  const win=g.state==='win',st=win?stars(g):0;
  const humans=g.chefs.filter(c=>c.human),hp=humans.reduce((a,c)=>a+c.pts,0);
  const coins=Math.round(hp/5+(win?40+g.li*15+st*10:6));
  SV.coins+=coins;
  if(win)SV.stars[g.li]=Math.max(SV.stars[g.li]||0,st);save();
  $('rTitle').textContent=win?'¡Sopa perfecta!':'¡Olla quemada!';
  $('rStars').innerHTML=win?[1,2,3].map(k=>'<span class="'+(k<=st?'':'off')+'">★</span>').join(''):'';
  const w=winner(g);
  $('rSub').textContent=win?(g.chefs.length>1?'¡'+w.def.n+' se lleva la cuchara de oro!':'¡Todos los pedidos listos!')+(st<3?' Pista: '+(g.expired>0?'no dejes que se vayan clientes.':'mantén la olla por debajo de 88°.'):' ¡Cocina de tres estrellas!'):'La olla llegó a 100°. ¡Hay que ir soltando ingredientes a tiempo!';
  const rk=$('rRank');rk.innerHTML='';
  g.chefs.slice().sort((a,b)=>b.pts-a.pts).forEach((c,k)=>{
    const d=document.createElement('div');d.className='rk'+(k===0&&win?' win':'');const cc=mkCanvas(42,42);paintOn(cc,x=>{x.save();x.beginPath();x.arc(21,21,20,0,7);x.clip();x.fillStyle=PCOL[c.slot];x.globalAlpha=.25;x.fillRect(0,0,42,42);x.globalAlpha=1;drawChef(x,c.def,21,50,{sc:.46,mood:k===0&&win?'happy':'idle',noShadow:true});x.restore();x.strokeStyle=PCOL[c.slot];x.lineWidth=3;x.beginPath();x.arc(21,21,19,0,7);x.stroke()});
    d.appendChild(cc);d.insertAdjacentHTML('beforeend','<span>'+(k===0&&win&&c.pts>0?'👑 ':'')+c.def.n+(c.human?' ('+(g.nHuman>1?'J'+(c.hi+1):'tú')+')':'')+'</span><b>'+c.pts+'</b>');rk.appendChild(d);
  });
  $('rCoins').textContent=coins;
  const cheap=CHEFS.filter(c=>!hasChef(c.id)).sort((a,b)=>a.price-b.price)[0];
  $('rUnlock').textContent=win&&g.li<LEVELS.length-1&&!SV.stars[g.li+1]&&!PRUEBAS?'🔓 ¡Nueva cocina desbloqueada!':(cheap&&SV.coins>=cheap.price?'💰 ¡Ya puedes fichar a '+cheap.n+'!':'');
  $('rNext').classList.toggle('hide',!(win&&g.li<LEVELS.length-1));
  $('sResult').classList.remove('hide');S.scene='result';$('bPause').classList.add('hide');
  musicOn=false;
}
function togglePause(force){
  if(S.scene!=='game'||!G||!['play','intro'].includes(G.state))return;
  const on=force===true?true:!S.paused;S.paused=on;$('sPause').classList.toggle('hide',!on);
}
function gameSlots(){return SV.slots.map(s=>({m:s.m,c:s.c}))}

// ---------- Bucle ----------
let lastTs=0;
function frame(ts){
  const dt=Math.min(.05,(ts-lastTs)/1000||.016);lastTs=ts;S.t+=dt;
  cx.setTransform(DPR,0,0,DPR,0,0);
  if(S.scene==='game'||S.scene==='result'){
    if(G){
      if(S.scene==='game'&&!S.paused){stepGame(G,dt);musicTick(dt,G.state==='play'?1+G.heat/250:1)}
      else if(S.scene==='result')stepGame(G,dt);
      cx.fillStyle='#2a1530';cx.fillRect(0,0,VW,VH);
      drawWorld(G);drawHUD(G);
    }
  }else{drawMenuBG(dt)}
  requestAnimationFrame(frame);
}
function boot(){
  cv=$('c');cx=cv.getContext('2d');resize();addEventListener('resize',resize);
  cv.addEventListener('pointerdown',onPD);addEventListener('pointermove',onPM);addEventListener('pointerup',onPU);addEventListener('pointercancel',onPU);
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{audioInit();sfx('click');showScreen(b.dataset.go)});
  $('bPlay').onclick=()=>{audioInit();sfx('click');showScreen('levels')};
  $('bChefs').onclick=()=>{audioInit();sfx('click');showScreen('chefs')};
  $('bSnd').onclick=()=>{audioInit();setSound(!SV.sound)};$('pSnd').onclick=()=>setSound(!SV.sound);
  $('bStart').onclick=()=>{audioInit();startGame(S.lv,gameSlots())};
  $('bPause').onclick=()=>{audioInit();togglePause()};
  $('pResume').onclick=()=>togglePause(false);
  $('pAgain').onclick=()=>{$('sPause').classList.add('hide');startGame(S.lv,gameSlots())};
  $('pMenu').onclick=()=>{$('sPause').classList.add('hide');S.paused=false;G=null;musicOn=false;showScreen('levels')};
  $('rAgain').onclick=()=>{$('sResult').classList.add('hide');startGame(S.lv,gameSlots())};
  $('rNext').onclick=()=>{$('sResult').classList.add('hide');S.lv++;startGame(S.lv,gameSlots())};
  $('rMenu').onclick=()=>{$('sResult').classList.add('hide');G=null;showScreen('levels')};
  setSound(SV.sound);menuInit();showScreen('title');
  if(PRUEBAS)$('tHint').textContent='🧪 MODO PRUEBAS: todo desbloqueado y monedas de sobra';
  requestAnimationFrame(frame);
}
// API de pruebas
function simGame(li,mode,maxT,slots){
  const g=newGame(li,slots||[{m:'ia',c:'croqueto'},{m:'ia',c:'pulpa'},{m:'ia',c:'sarten'},{m:'ia',c:'pepino'}],{sim:true});
  g.cd=0;g.state='intro';update(g,.02);let n=0;
  while(g.state==='play'&&g.t<maxT&&n++<400000)update(g,1/30);
  return{state:g.state,t:+g.t.toFixed(1),done:g.done,target:g.L.target,expired:g.expired,maxHeat:+g.maxHeat.toFixed(0),pts:g.chefs.map(c=>c.pts),drops:g.chefs.map(c=>c.drops),wrong:g.chefs.map(c=>c.wrong)};
}
window.CE={get G(){return G},S,SV,startGame,simGame,newGame,update,stepGame,LEVELS,showScreen,showResult};
if(document.fonts&&document.fonts.load){document.fonts.load('700 20px Fredoka').finally(boot)}else boot();
