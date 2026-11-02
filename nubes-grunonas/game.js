/* Terminal de Nubes Gruñonas — juego */
(()=>{
'use strict';
const C=NGCore,A=NGArt,S=NGSnd,LV=window.NG_LEVELS;
const $=id=>document.getElementById(id);
const PRUEBAS=/[?&]pruebas=1/.test(location.search);
const KEY='nubes-grunonas-v1'+(PRUEBAS?'-pruebas':'');
const FLIGHT=.55,HOP=.24,GAP=.085;
const T=()=>performance.now()/1000;
const ANDENES=[
 {n:'Llovizna',a:1,b:8,sky:['#86d2ff','#e4f6ff'],rain:0,flash:0},
 {n:'Chubasco',a:9,b:16,sky:['#9ab8ff','#e9efff'],rain:0,flash:0},
 {n:'Nubarrón',a:17,b:26,sky:['#ffb59a','#fff0df'],rain:0,flash:0},
 {n:'Tormenta',a:27,b:38,sky:['#6f86b8','#cdd8ee'],rain:1,flash:0},
 {n:'Huracán',a:39,b:52,sky:['#4b6a9a','#a9c3de'],rain:1,flash:1,dark:1},
 {n:'Ciclón final',a:53,b:65,sky:['#3a3470','#9a8fd4'],rain:1,flash:1,dark:1}
];
const andenOf=n=>ANDENES.find(a=>n>=a.a&&n<=a.b)||ANDENES[0];
const PRICE={undo:30,slot:50,shuf:40};
const BNAME={undo:'Deshacer',slot:'Hueco extra',shuf:'Barajar cola'};

/* ---------- guardado ---------- */
function defSave(){return{coins:PRUEBAS?99999:60,max:PRUEBAS?65:1,stars:{},boost:{undo:2,slot:2,shuf:2},skin:0,skins:PRUEBAS?[0,1,2,3,4,5,6]:[0],set:{sfx:true,music:true,sym:true,vib:true},daily:{day:'',streak:0},seen:{},won:0,sent:0,v:1};}
let save=(()=>{try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&s.v===1){const d=defSave();return Object.assign(d,s,{boost:Object.assign(d.boost,s.boost),set:Object.assign(d.set,s.set)});}}catch(e){}return defSave();})();
if(PRUEBAS){save.max=65;save.coins=Math.max(save.coins,99999);save.skins=[0,1,2,3,4,5,6];}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}}

/* ---------- frases de Trueno ---------- */
const LINES={
 start:['¡Atención, pasajeros! Esta terminal sale a su hora. O sea, cuando yo lo diga.','Las nubes primero, las quejas después. ¡A trabajar!','Aquí manda un servidor. Y tú manejas las nubes. ¡Vamos!','He visto tormentas más organizadas que este andén. ¡Ordénalo!','¡Silbato listo! Cada nube a su sitio, cada gotita a su asiento.','Hoy no quiero atascos. Ni excusas. Bueno, las excusas sí.'],
 ok:['¡Eso es! Casi parece que sabes lo que haces.','¡Bien! No se lo digas a nadie, pero estoy impresionado.','¡Pasajeros felices, jefe sin migrañas!','Salida limpia. Apúntale una al jefe.','Trueno aprueba. Con un ojo cerrado, pero aprueba.'],
 blocked:['¡Esa está atascada! Libera su camino primero.','¿Atravesar otra nube? ¡Qué falta de educación!','Hay alguien en medio. Mira bien la flechita.','Gruñe porque no puede salir. ¡Aparta lo que le estorba!'],
 combo:['¡COMBO! ¡Qué pasajeros tan coordinados!','¡Eso va sobre ruedas! Bueno, sobre vapor.','¡Racha! Me voy a emocionar y todo.'],
 warn:['¡Solo queda un hueco! Piensa antes de tocar.','Andén casi lleno… ¡me sudan los truenos!','Cuidado: un hueco más y esto es una sardinera.'],
 fail:['¡Atasco monumental! Y yo sin paraguas.','El andén está lleno. Respira y vuelve a pensar.'],
 win:['¡Andén despejado! Esta vez no tengo quejas.','Perfecto. Te ascendería, pero no hay presupuesto.','¡Otra salida impecable! Mis bigotes lo aprueban.'],
 idle:['¿Te has dormido? Mira ese brillito…','Pista de jefe: toca la nube que brilla.'],
 lock:['Candado: se abre cuando hayan salido más nubes.','¡Paciencia! Ese candado no se abre con prisas.'],
 hid:['No se ve ni gota. Despeja su camino y se asomará.','Esa nube va de misteriosa. Libérale el paso.'],
 slot:['¡Un hueco extra! Se lo quito al presupuesto de pinzas.'],
 undo:['Marcha atrás. Fingiré que no he visto nada.'],
 shuf:['¡Cola barajada! Y sigue habiendo solución, que soy un jefe justo.']
};
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------- estado global ---------- */
const cv=$('c'),ctx=cv.getContext('2d');
let DPR=1,W=0,H=0;
let mode='menu';          // menu | levels | game
let G=null;               // partida actual
let lay=null;
let parts=[],texts=[];
let bgClouds=[];
let rainOffs=0,flashT=0,nextFlash=T()+6;
let coinShown=save.coins;
let modalOpen=false;
let bubbleMood='bossy',bubbleUntil=0;

function vib(ms){if(save.set.vib&&navigator.vibrate)try{navigator.vibrate(ms);}catch(e){}}
function toast(t,ms){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('on'),ms||1700);}
function say(t,mood,ms){$('bText').textContent=t;const b=$('bText');b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');bubbleMood=mood||'bossy';bubbleUntil=T()+(ms||2.2);}
function addCoins(n){save.coins+=n;persist();}

/* ---------- lógica de partida ---------- */
function cloneLevel(L){return{cols:L.cols,rows:L.rows,clouds:L.clouds,blockers:L.blockers,queue:L.queue.slice()};}
function startLevel(n){
  n=Math.max(1,Math.min(LV.length,n));
  const L=LV[n-1];
  const P=C.prep(cloneLevel(L));
  G={n,L,P,K:L.slots,st:C.init(P,L.slots),hist:[],boostUsed:0,revived:false,freeRevive:true,taps:0,ended:false,sched:[],cursor:T(),paid:new Set(),earned:0,lastAct:T(),hint:null,warnT:0,press:null,pathFx:null,combos:0,failShown:false};
  G.st.K=L.slots;
  mode='game';
  rebuildView(true);
  $('menu').classList.add('hide');$('levels').classList.add('hide');$('hud').classList.remove('hide');
  updateHud();layout();
  $('hud').classList.toggle('dark',!!andenOf(n).dark);
  $('hLvl').textContent='Nivel '+n;$('hSub').textContent='Andén '+andenOf(n).n+(L.n%10===0?' · ¡Jefe!':'');
  const tips={1:'Toca una nube cuyo camino esté libre: mira hacia dónde apunta su flechita.',2:'Si hay otra nube en el camino, primero tienes que sacar esa.',3:'Los pasajeros de la cola suben a la nube de su color. Si no tienes nube de su color, esperan.'};
  say(tips[n]||pick(LINES.start),'bossy',4);
  setTimeout(()=>{if(G&&G.n===n)maybeTip(n);},350);
}
function rebuildView(first){
  const g=G,P=g.P,st=g.st;
  g.cv=P.L.clouds.map((c,i)=>({id:i,shake:0,sq:0,flash:0,expr:'grumpy',exprT:0,seed:Math.random()*20,vis:(st.rm>>i)&1?'gone':'lot'}));
  g.rev=P.L.clouds.map((c,i)=>!c.hid||C.pathClear(P,st,i));
  g.lockOpen=P.L.clouds.map(c=>st.nrm>=(c.lock||0));
  g.bGone=(P.L.blockers||[]).map(b=>b.n>0&&st.nrm>=b.n);
  g.vSlots=st.slots.map((s,k)=>({id:s.id,idx:k,left:s.left,cap:P.cap[s.id],bump:0,expr:'grumpy',exprT:0,land:T()}));
  g.vQi=st.qi;g.qShift=0;g.flights=[];g.hops=[];g.departs=[];g.sched=[];g.cursor=T();
  g.ready=[];refresh(false);
}
function refresh(fx){
  const g=G,P=g.P,st=g.st;
  P.L.clouds.forEach((c,i)=>{
    if(c.hid&&!g.rev[i]&&C.pathClear(P,st,i)){g.rev[i]=true;if(fx){poof(cloudCenter(i),A.PAL[3].f);S.reveal();g.cv[i].sq=1;}}
    g.ready[i]=C.movable(P,st,i);
    if(!g.lockOpen[i]&&st.nrm>=(c.lock||0)){g.lockOpen[i]=true;if(fx){S.unlock_();const p=cloudCenter(i);sparks(p.x,p.y,10,'#ffd24c');g.cv[i].sq=1;}}
  });
  (P.L.blockers||[]).forEach((b,j)=>{if(!g.bGone[j]&&b.n>0&&st.nrm>=b.n){g.bGone[j]=true;if(fx){const p=cellCenter(b.x,b.y);S.zap();sparks(p.x,p.y,16,'#ffe14a');flashT=.25;}}});
}
function at(t,fn){const g=G;g.sched.push({t,fn:()=>{if(G===g)fn();}});g.sched.sort((a,b)=>a.t-b.t);}
function snapshot(){return{st:C.clone(G.st),q:G.P.queue.slice(),K:G.K};}
function onTap(i){
  const g=G;if(!g||g.ended||modalOpen)return;
  const P=g.P,st=g.st,c=P.L.clouds[i];
  g.lastAct=T();g.hint=null;
  if((st.rm>>i)&1)return;
  S.unlock();
  const k=g.cv[i];
  if(!C.pathClear(P,st,i)){
    k.shake=1;k.expr='mad';k.exprT=T()+.9;S.bonk();vib(25);
    // quién estorba
    const blockers=[];
    for(let j=0;j<P.n;j++)if((P.need[i]>>j&1)&&!((st.rm>>j)&1)){blockers.push(j);g.cv[j].flash=1;}
    (P.L.blockers||[]).forEach((b,j)=>{if(!g.bGone[j]&&P.sweep[i].some(([x,y])=>x===b.x&&y===b.y))(g.bFlash=g.bFlash||{})[j]=1;});
    g.pathFx={id:i,t0:T()};
    puffs(cloudCenter(i),'#ffffff',6);
    g.blockedN=(g.blockedN||0)+1;
    if(c.hid&&!g.rev[i])say(pick(LINES.hid),'shout');
    else if(g.blockedN%3===1)say(pick(LINES.blocked),'shout');
    return;
  }
  if(!C.unlocked(P,st,i)){
    k.shake=.8;S.lock();vib(25);k.lockWob=1;
    say('Candado: se abre cuando hayan salido '+(c.lock-st.nrm)+' nubes más.','bossy');
    return;
  }
  if(st.slots.length>=st.K){S.bonk();toast('¡No quedan huecos!');return;}
  // jugada válida
  g.hist.push(snapshot());if(g.hist.length>40)g.hist.shift();
  g.taps++;
  const ev=[];C.send(P,st,i,ev);
  save.sent++;
  S.tap();vib(12);
  playEvents(i,ev);
  refresh(true);
  g.hint=null;
  // fin de partida
  if(C.won(P,st)){g.ended=true;at(g.cursor+.5,onWin);}
  else if(C.lost(P,st)){g.ended=true;at(g.cursor+.7,onLose);}
  else{
    if(st.slots.length===st.K-1&&T()-g.warnT>8){g.warnT=T();at(g.cursor+.1,()=>{say(pick(LINES.warn),'shout');S.warn();});}
  }
}
function playEvents(i,ev){
  const g=G,now=T();
  const land=Math.max(now+FLIGHT,g.cursor+.05);
  const kk=g.cv[i];kk.vis='flying';kk.expr='wee';
  g.flights.push({id:i,t0:now,t1:land,p0:cloudCenter(i)});
  S.whoosh();
  at(land,()=>landCloud(i));
  let cur=land+.12,k=0,boards=0,departs=0,lastEnd=land;
  for(const e of ev){
    if(e.t==='board'){
      const tb=cur,kc=k;
      at(tb,()=>startHop(e,kc));at(tb+HOP,()=>endHop(e,kc));
      lastEnd=tb+HOP;cur+=GAP;k++;boards++;
    }else if(e.t==='depart'){
      const td=lastEnd+.1;at(td,()=>startDepart(e.id));cur=Math.max(cur,td+.15);departs++;
    }
  }
  g.cursor=cur;
  if(boards>=4||departs>=2){
    g.combos++;const n=Math.max(departs,Math.floor(boards/2));
    at(land+.35,()=>{S.combo(n+1);say(pick(LINES.combo),'proud');const l=slotRect();addText('¡COMBO ×'+(boards>=4?boards:departs)+'!',W/2,lay.queue.y-6,'#ffd24c',30);addCoinsFx(l,Math.min(8,2+n));addCoins(Math.min(8,2+n));g.earned+=Math.min(8,2+n);});
  }else if(boards>0&&g.taps%4===0)at(land+.2,()=>say(pick(LINES.ok),'proud'));
}
function freeIdx(){const used=new Set(G.vSlots.map(s=>s.idx));const r=[];for(let i=0;i<G.st.K;i++)if(!used.has(i))r.push(i);return r;}
function landCloud(i){
  const g=G;const fr=freeIdx();const idx=fr.length?fr[0]:g.vSlots.length;
  g.flights=g.flights.filter(f=>f.id!==i);
  g.cv[i].vis='gone';
  g.vSlots.push({id:i,idx,left:g.P.cap[i],cap:g.P.cap[i],bump:1,expr:'grumpy',exprT:0,land:T()});
  S.land();const p=slotPos(idx);puffs(p,'#ffffff',5);
}
function startHop(e,k){
  const g=G;g.vQi++;g.qShift=lay.qsp;
  const vs=g.vSlots.find(s=>s.id===e.id);if(!vs)return;
  g.hops.push({col:e.col,t0:T(),dur:HOP,id:e.id,x0:lay.queue.x0,y0:lay.queue.cy,k});
}
function endHop(e,k){
  const g=G,vs=g.vSlots.find(s=>s.id===e.id);if(!vs)return;
  g.hops=g.hops.filter(h=>!(h.id===e.id&&h.k===k));
  vs.left=Math.max(0,vs.left-1);vs.bump=1;vs.expr='happy';vs.exprT=T()+.45;
  S.pop(k);const p=slotPos(vs.idx);sparks(p.x,p.y-lay.slotCs*.2,4,A.PAL[g.P.color[e.id]].f);
}
function startDepart(id){
  const g=G,vs=g.vSlots.find(s=>s.id===id);if(!vs)return;
  g.vSlots=g.vSlots.filter(s=>s!==vs);
  const p=slotPos(vs.idx);
  g.departs.push({id,x:p.x,y:p.y,t0:T(),dur:.7});
  S.ding();vib(18);
  confetti(p.x,p.y-10,16);
  const n=g.P.L.clouds[id];const c=n.w*n.h;
  if(!g.paid.has(id)){g.paid.add(id);addCoins(c);g.earned+=c;addCoinsFx(p,c);}
}
function onWin(){
  const g=G;S.win();
  const st=g.st,ms=g.L.ms;
  let stars=1;
  if(st.peak<=ms+1&&!g.revived)stars=2;
  if(st.peak<=ms&&!g.revived&&g.boostUsed===0)stars=3;
  const first=!(save.stars[g.n]>0);
  const reward=first?20+stars*8:5+stars*2;
  addCoins(reward);g.earned+=reward;
  save.stars[g.n]=Math.max(save.stars[g.n]||0,stars);
  save.max=Math.max(save.max,Math.min(LV.length,g.n+1));save.won++;
  let gift=null;
  if(first&&g.n%5===0){gift=pick(['undo','slot','shuf']);save.boost[gift]++;}
  persist();
  say(pick(LINES.win),'proud',5);
  bigConfetti();flashT=.15;
  setTimeout(()=>showWin(stars,reward,first,gift),700);
}
function onLose(){
  S.fail();vib(60);
  G.cv.forEach(k=>{if(k.vis==='lot')k.expr='sad';});
  G.vSlots.forEach(s=>s.expr='sad');
  say(pick(LINES.fail),'shout',4);
  setTimeout(showFail,900);
}

/* ---------- potenciadores ---------- */
function useBoost(kind){
  const g=G;if(!g||modalOpen)return;
  S.unlock();
  if(g.ended&&!g.failShown)return;
  if(kind==='undo'&&!g.hist.length){toast('Aún no hay jugadas que deshacer');return;}
  if(kind==='slot'&&g.st.K>=8){toast('Ya hay 8 huecos, ¡el máximo!');return;}
  if(kind==='shuf'&&g.P.queue.length-g.st.qi<3){toast('Ya queda muy poca cola');return;}
  if(save.boost[kind]<=0){
    if(save.coins>=PRICE[kind]){save.coins-=PRICE[kind];save.boost[kind]++;persist();S.buy();toast('Comprado: '+BNAME[kind]+' (−'+PRICE[kind]+' monedas)');}
    else{toast('Te faltan monedas. ¡Mira la tienda!');return;}
  }
  if(kind==='shuf'){if(!doShuffle())return;}
  else if(kind==='undo')doUndo();
  else doSlot();
  save.boost[kind]--;g.boostUsed++;persist();S.boost();updateHud();
}
function doUndo(){
  const g=G,h=g.hist.pop();
  g.st=h.st;g.P.queue=h.q;g.K=h.K;g.st.K=h.K;g.ended=false;g.failShown=false;
  rebuildView();say(pick(LINES.undo),'bossy');layout();
}
function doSlot(){
  const g=G;g.st.K++;g.K=g.st.K;g.ended=false;g.failShown=false;
  g.vSlots.forEach(s=>s.expr='grumpy');
  g.cv.forEach(k=>{if(k.vis==='lot')k.expr='grumpy';});
  layout();refresh(false);say(pick(LINES.slot),'proud');
  const p=slotPos(g.st.K-1);sparks(p.x,p.y,10,'#ffffff');
}
function doShuffle(){
  const g=G,st=g.st,q=g.P.queue,qi=st.qi;
  const rest=q.slice(qi);
  let found=null;
  for(let t=0;t<80&&!found;t++){
    const r=rest.slice();for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}
    if(r.join()===rest.join())continue;
    const nq=q.slice(0,qi).concat(r);
    const P2=Object.assign({},g.P,{queue:nq});
    // la cola barajada no puede dejar a los pasajeros de delante embarcando sin control: se comprueba que sigue resoluble
    const s2=C.clone(st);
    const res=C.solve(P2,s2,40000);
    if(res.sol)found=nq;
  }
  if(!found){toast('No he encontrado una mezcla mejor. No gastas nada.');return false;}
  g.hist.push({st:C.clone(st),q:q.slice(),K:g.K}); // permite deshacer también el barajado
  g.P.queue=found;
  g.qShift=lay.qsp;g.hint=null;
  // si ahora el primero de la cola ya tiene nube de su color, sube
  const ev=[];C.resolve(g.P,g.st,ev);
  for(const e of ev)if(e.t==='depart'&&!g.paid.has(e.id)){g.paid.add(e.id);const c=g.P.L.clouds[e.id];addCoins(c.w*c.h);g.earned+=c.w*c.h;}
  rebuildView();
  say(pick(LINES.shuf),'proud');S.confetti();
  return true;
}

/* ---------- ayuda ---------- */
function computeHint(){
  const g=G;if(!g||g.ended||g.hint||T()<g.cursor+.5)return;
  const r=C.solve(g.P,g.st,150000);
  if(r.sol&&r.sol.length){g.hint={id:r.sol[0],t0:T()};if(g.n>3)say(pick(LINES.idle),'bossy');}
  else g.lastAct=T();
}

/* ---------- geometría ---------- */
function layout(){
  const app=$('app');W=app.clientWidth;H=app.clientHeight;DPR=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  if(!G||mode!=='game'){lay=null;return;}
  const g=G,L=g.L;
  const short=H<700;
  const topY=$('bubble').getBoundingClientRect().bottom-app.getBoundingClientRect().top+6;
  const botY=$('boosters').getBoundingClientRect().top-app.getBoundingClientRect().top-6;
  const PH=short?88:104,QH=short?52:62;
  const plat={x:8,y:botY-PH,w:W-16,h:PH};
  const queue={x:8,y:plat.y-QH-6,w:W-16,h:QH};
  const lotTop=topY,lotBot=queue.y-8;
  const cs=Math.floor(Math.min((W-28)/L.cols,(lotBot-lotTop-14)/L.rows,78));
  const gw=cs*L.cols,gh=cs*L.rows;
  const gx=Math.round((W-gw)/2),gy=Math.round(lotTop+(lotBot-lotTop-gh)/2);
  const K=g.st.K;
  const slotW=Math.min(80,(plat.w-18)/K);
  const slotCs=Math.min(slotW*0.92,plat.h*0.6);
  const rq=Math.min(16,(queue.h-14)/2.1);
  const qsp=rq*2+5;
  queue.x0=queue.x+14+rq*1.15;queue.cy=queue.y+queue.h/2+rq*.25;queue.rq=rq;
  queue.n=Math.max(3,Math.floor((queue.w-30-rq*2)/qsp));
  lay={cs,gx,gy,gw,gh,plat,queue,K,slotW,slotCs,qsp,rq,lot:{x:gx-8,y:gy-8,w:gw+16,h:gh+16}};
}
function cellCenter(x,y){return{x:lay.gx+(x+.5)*lay.cs,y:lay.gy+(y+.5)*lay.cs};}
function cloudCenter(i){const c=G.P.L.clouds[i];return{x:lay.gx+(c.x+c.w/2)*lay.cs,y:lay.gy+(c.y+c.h/2)*lay.cs};}
function slotPos(idx){
  const K=G.st.K,sw=lay.slotW,p=lay.plat;
  return{x:p.x+(p.w-K*sw)/2+(idx+.5)*sw,y:p.y+p.h*0.5};
}
function slotRect(){return{x:W/2,y:lay.plat.y+lay.plat.h/2};}

/* ---------- efectos ---------- */
function confetti(x,y,n){const cols=['#ff5d73','#ffd24c','#4fd6a3','#4fa8ff','#a883f8','#ff9b3e','#ff9fdc'];for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*2.4,v=160+Math.random()*260;parts.push({k:'conf',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:620,life:1.2+Math.random()*.7,t:0,col:cols[i%7],sz:5+Math.random()*5,rot:Math.random()*6,vr:(Math.random()-.5)*14});}}
function bigConfetti(){const n=140;for(let i=0;i<n;i++){const x=Math.random()*W;parts.push({k:'conf',x,y:-20-Math.random()*H*.35,vx:(Math.random()-.5)*80,vy:80+Math.random()*160,g:260,life:3.5,t:0,col:['#ff5d73','#ffd24c','#4fd6a3','#4fa8ff','#a883f8','#ff9b3e','#ff9fdc'][i%7],sz:6+Math.random()*6,rot:Math.random()*6,vr:(Math.random()-.5)*10});}confetti(W*.2,H*.55,30);confetti(W*.8,H*.55,30);}
function sparks(x,y,n,col){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=40+Math.random()*120;parts.push({k:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:60,life:.45+Math.random()*.35,t:0,col,sz:2+Math.random()*3});}}
function puffs(p,col,n){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=20+Math.random()*50;parts.push({k:'puff',x:p.x,y:p.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-14,g:0,life:.5+Math.random()*.3,t:0,col,sz:5+Math.random()*7});}}
function poof(p,col){puffs(p,'#dfe7f3',12);sparks(p.x,p.y,10,'#ffffff');}
function addText(txt,x,y,col,size){texts.push({txt,x,y,vy:-40,t:0,life:1.3,col:col||'#fff',size:size||22});}
function addCoinsFx(p,n){
  const tgt=coinTarget();
  for(let i=0;i<Math.min(n,8);i++)parts.push({k:'coin',x:p.x+(Math.random()-.5)*20,y:p.y+(Math.random()-.5)*10,t:-i*.06,life:.8,tx:tgt.x,ty:tgt.y,sx:p.x,sy:p.y,sz:8});
  texts.push({txt:'+'+n,x:p.x,y:p.y-16,vy:-34,t:0,life:.9,col:'#ffe27a',size:20,stroke:'#8a5d00'});
}
function coinTarget(){const r=$('hCoinPill').getBoundingClientRect(),a=$('app').getBoundingClientRect();return{x:r.left-a.left+18,y:r.top-a.top+r.height/2};}

/* ---------- dibujo ---------- */
const bgSizes=[44,64,90];
for(let i=0;i<7;i++)bgClouds.push({x:Math.random(),y:.06+Math.random()*.86,s:bgSizes[i%3],v:.004+Math.random()*.01,a:.35+Math.random()*.3});
function drawBg(t,dt){
  const an=G&&mode==='game'?andenOf(G.n):ANDENES[0];
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,an.sky[0]);g.addColorStop(1,an.sky[1]);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const sg=ctx.createRadialGradient(W*.82,H*.1,4,W*.82,H*.1,H*.35);sg.addColorStop(0,'rgba(255,248,200,.95)');sg.addColorStop(.18,'rgba(255,236,150,.55)');sg.addColorStop(1,'rgba(255,236,150,0)');
  ctx.fillStyle=sg;ctx.fillRect(0,0,W,H);
  for(const b of bgClouds){b.x+=b.v*dt*(an.rain?2:1);if(b.x>1.25)b.x=-.25;ctx.globalAlpha=b.a*.7;A.drawCloudSprite(ctx,0,2,1,b.x*W,b.y*H,b.s,0,DPR,'white');ctx.globalAlpha=1;}
  if(an.rain){ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1.4;ctx.beginPath();rainOffs=(rainOffs+dt*520)%60;for(let x=-20;x<W+20;x+=30){for(let y=-60;y<H;y+=60){const yy=y+rainOffs+((x*7)%23);ctx.moveTo(x+(y%11),yy);ctx.lineTo(x+(y%11)-5,yy+16);}}ctx.stroke();}
  if(an.flash&&t>nextFlash){flashT=.28;nextFlash=t+6+Math.random()*9;if(mode==='game')S.zap&&0;}
}
function cloudProps(i){const g=G,c=g.P.L.clouds[i],k=g.cv[i];return{c,k,hidden:c.hid&&!g.rev[i]};}
function drawCloudFull(i,px,py,cs,opts){
  // dibuja nube con cara; px,py esquina sup-izq de la huella
  const g=G,P=g.P,{c,k,hidden}=cloudProps(i);
  const w=c.w,h=c.h;
  A.drawCloudSprite(ctx,c.c,w,h,px,py,cs,save.skin,DPR,hidden?'fog':'');
  const cx=px+w*cs/2,cy=py+h*cs*(h>1?0.5:0.5)+cs*(h>1?0.1:0);
  const fs=cs*(0.95+0.2*(Math.max(w,h)-1));
  const t=T();
  const blink=((t*0.7+k.seed*3.1)%4.3)<0.11;
  let expr=k.expr;if(k.exprT&&t>k.exprT){k.expr=expr='grumpy';k.exprT=0;}
  const look=[C.DX[c.d]*.9,C.DY[c.d]*.9];
  if(hidden){
    ctx.save();ctx.font='700 '+Math.round(cs*.62*Math.max(.9,Math.min(w,h)))+'px Fredoka,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=cs*.1;ctx.strokeStyle='#5e6b86';ctx.fillStyle='#fff';ctx.strokeText('?',cx,cy-cs*.02);ctx.fillText('?',cx,cy-cs*.02);ctx.restore();
  }else A.face(ctx,cx,cy,fs,expr,look,blink,save.skin,t);
  // símbolo
  if(!hidden&&save.set.sym){const bx=px+cs*.2,by=py+cs*.28,r=cs*.115;ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.arc(bx,by,r,0,7);ctx.fill();A.sym(ctx,c.c,bx,by+.5,r*.62,A.PAL[c.c].d);}
  // flecha de salida
  {const e=cs*.02,ax=cx+C.DX[c.d]*(w*cs/2-cs*.1)*(C.DX[c.d]?1:0),ay=cy+C.DY[c.d]*(h*cs/2-cs*.1);
   const axx=C.DX[c.d]?cx+C.DX[c.d]*(w*cs/2-cs*.1):cx, ayy=C.DY[c.d]?(py+h*cs/2)+C.DY[c.d]*(h*cs/2-cs*.07):cy;
   A.arrow(ctx,axx,ayy,cs*.125,c.d,'#ffffff');}
  // asientos
  const cap=P.cap[i],rows=cap>6?2:1,per=Math.ceil(cap/rows);
  if(!hidden){for(let q=0;q<cap;q++){const r=Math.floor(q/per),n=r===rows-1?cap-per*(rows-1):per,col=q-r*per;const x=cx+(col-(n-1)/2)*cs*.085,y=py+h*cs-cs*(.125+(rows-1-r)*.075);ctx.fillStyle='rgba(255,255,255,.9)';ctx.strokeStyle='rgba(43,39,66,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,cs*.027,0,7);ctx.fill();ctx.stroke();}}
  // candado
  if(!g.lockOpen[i]){A.padlock(ctx,px+w*cs-cs*.2,py+cs*.24,cs*.17,c.lock-g.st.nrm,k.lockWob?Math.sin(t*40)*k.lockWob*.4:0);}
}
function drawLot(t,dt){
  const g=G,L=g.L,{gx,gy,cs,lot}=lay,P=g.P,st=g.st;
  ctx.fillStyle=andenOf(g.n).dark?'rgba(30,25,80,.28)':'rgba(70,120,200,.20)';A.rr(ctx,lot.x,lot.y,lot.w,lot.h,24);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=3;ctx.stroke();
  for(let y=0;y<L.rows;y++)for(let x=0;x<L.cols;x++){ctx.fillStyle=(x+y)%2?'rgba(255,255,255,.26)':'rgba(255,255,255,.14)';A.rr(ctx,gx+x*cs+2,gy+y*cs+2,cs-4,cs-4,Math.min(12,cs*.2));ctx.fill();}
  // camino rojo del bloqueo
  if(g.pathFx){const u=(t-g.pathFx.t0)/.8;if(u>=1)g.pathFx=null;else{ctx.fillStyle='rgba(255,70,90,'+(.42*(1-u))+')';for(const [x,y] of P.sweep[g.pathFx.id]){A.rr(ctx,gx+x*cs+4,gy+y*cs+4,cs-8,cs-8,10);ctx.fill();}}}
  // bloqueos (rayos)
  (L.blockers||[]).forEach((b,j)=>{
    const p=cellCenter(b.x,b.y);
    if(b.n===0){drawPylon(p.x,p.y,cs,g.bFlash&&g.bFlash[j]);}
    else if(!g.bGone[j]){drawSparkOrb(p.x,p.y,cs,b.n-st.nrm,t,g.bFlash&&g.bFlash[j]);}
    if(g.bFlash&&g.bFlash[j]){g.bFlash[j]=Math.max(0,g.bFlash[j]-dt*1.6);}
  });
  // nubes
  for(let i=0;i<P.n;i++){
    const k=g.cv[i];if(k.vis!=='lot')continue;
    const c=P.L.clouds[i];
    let px=gx+c.x*cs,py=gy+c.y*cs;
    // resplandor de nube lista
    const ready=g.ready[i];
    if(g.hint&&g.hint.id===i){const u=(t-g.hint.t0);const pulse=.5+.5*Math.sin(u*6);ctx.fillStyle='rgba(255,246,150,'+(.35+.35*pulse)+')';ctx.beginPath();ctx.ellipse(px+c.w*cs/2,py+c.h*cs/2,c.w*cs*(.62+.06*pulse),c.h*cs*(.6+.06*pulse),0,0,7);ctx.fill();}
    if(k.flash>0){ctx.fillStyle='rgba(255,60,90,'+(.55*k.flash)+')';ctx.beginPath();ctx.ellipse(px+c.w*cs/2,py+c.h*cs/2,c.w*cs*.62,c.h*cs*.6,0,0,7);ctx.fill();k.flash=Math.max(0,k.flash-dt*1.6);}
    let ox=0,oy=0,sc=1;
    if(ready&&!(g.ended)){oy=Math.sin(t*3+k.seed)*cs*.018;}
    if(k.shake>0){ox=Math.sin(t*55)*k.shake*cs*.07;k.shake=Math.max(0,k.shake-dt*2.2);}
    if(k.sq>0){sc=1+.12*Math.sin((1-k.sq)*Math.PI*2)*k.sq;k.sq=Math.max(0,k.sq-dt*2.5);}
    if(k.lockWob>0)k.lockWob=Math.max(0,k.lockWob-dt*2.5);
    ctx.save();ctx.translate(px+c.w*cs/2+ox,py+c.h*cs/2+oy);ctx.scale(sc,sc);ctx.translate(-(px+c.w*cs/2),-(py+c.h*cs/2));
    drawCloudFull(i,px,py,cs);
    ctx.restore();
  }
  // pista: flecha que rebota
  if(g.hint){const c=P.L.clouds[g.hint.id];const p=cloudCenter(g.hint.id);const b=Math.abs(Math.sin((t-g.hint.t0)*5))*cs*.16;ctx.fillStyle='#fff';ctx.strokeStyle='#e0a100';ctx.lineWidth=3;ctx.beginPath();const yy=p.y-c.h*cs/2-cs*.02-b;ctx.moveTo(p.x,yy);ctx.lineTo(p.x-cs*.16,yy-cs*.22);ctx.lineTo(p.x+cs*.16,yy-cs*.22);ctx.closePath();ctx.stroke();ctx.fill();}
}
function drawPylon(x,y,cs,fl){
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(30,40,80,.2)';ctx.beginPath();ctx.ellipse(0,cs*.34,cs*.28,cs*.07,0,0,7);ctx.fill();
  ctx.fillStyle='#59658a';ctx.strokeStyle='#2c3552';ctx.lineWidth=3;A.rr(ctx,-cs*.3,cs*.18,cs*.6,cs*.16,5);ctx.fill();ctx.stroke();
  ctx.fillStyle='#78859f';A.rr(ctx,-cs*.07,-cs*.3,cs*.14,cs*.5,4);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffd24c';ctx.beginPath();ctx.moveTo(0,-cs*.42);ctx.lineTo(cs*.1,-cs*.28);ctx.lineTo(-cs*.1,-cs*.28);ctx.closePath();ctx.fill();ctx.stroke();
  for(const[yy,col]of[[-.12,'#ffd24c'],[.02,'#2c3552']]){ctx.fillStyle=col;ctx.fillRect(-cs*.07,cs*yy,cs*.14,cs*.06);}
  if(fl){ctx.strokeStyle='rgba(255,60,90,'+fl+')';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,cs*.42,0,7);ctx.stroke();}
  ctx.restore();
}
function drawSparkOrb(x,y,cs,n,t,fl){
  ctx.save();ctx.translate(x,y);
  const r=cs*.36;
  const g=ctx.createRadialGradient(0,0,2,0,0,r*1.5);g.addColorStop(0,'rgba(255,240,140,.9)');g.addColorStop(.35,'rgba(150,110,255,.65)');g.addColorStop(1,'rgba(110,70,220,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*1.5,0,7);ctx.fill();
  ctx.fillStyle='#5b3fc4';ctx.strokeStyle='#2b1a78';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*.78,0,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#ffe96a';ctx.lineWidth=2;ctx.lineCap='round';
  const seed=Math.floor(t*10);const rn=A.rng(seed+Math.floor(x));
  for(let q=0;q<5;q++){const a=rn()*6.28;ctx.beginPath();ctx.moveTo(0,0);let px=0,py=0;for(let s=0;s<3;s++){px+=Math.cos(a+(rn()-.5))*r*.4;py+=Math.sin(a+(rn()-.5))*r*.4;ctx.lineTo(px,py);}ctx.stroke();}
  A.bolt(ctx,0,-1,r*.9,'#ffe14a');
  ctx.fillStyle='#fff';ctx.strokeStyle='#2b1a78';ctx.lineWidth=3;ctx.beginPath();ctx.arc(r*.62,-r*.62,cs*.13,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#2b1a78';ctx.font='700 '+Math.round(cs*.18)+'px Fredoka,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,r*.62,-r*.62+1);
  if(fl){ctx.strokeStyle='rgba(255,60,90,'+fl+')';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,cs*.46,0,7);ctx.stroke();}
  ctx.restore();
}
function drawPlatform(t,dt){
  const g=G,p=lay.plat,K=g.st.K,sw=lay.slotW;
  const full=g.vSlots.length>=K-1&&K>0;
  // base
  const gr=ctx.createLinearGradient(0,p.y,0,p.y+p.h);gr.addColorStop(0,'#fff8e6');gr.addColorStop(1,'#f0d49c');
  ctx.save();ctx.shadowColor='rgba(40,50,100,.25)';ctx.shadowBlur=14;ctx.shadowOffsetY=6;ctx.fillStyle=gr;A.rr(ctx,p.x,p.y,p.w,p.h,24);ctx.fill();ctx.restore();
  ctx.strokeStyle=full&&g.vSlots.length>=K-1?'rgba(255,93,115,'+(.55+.45*Math.sin(t*7))+')':'#c9a76a';ctx.lineWidth=full?4:3;A.rr(ctx,p.x,p.y,p.w,p.h,24);ctx.stroke();
  ctx.fillStyle='#8a6a3a';ctx.font='600 11px Fredoka,system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('ANDÉN · '+g.vSlots.length+'/'+K+' HUECOS',p.x+16,p.y+7);
  for(let i=0;i<K;i++){
    const c=slotPos(i);
    ctx.fillStyle='rgba(120,90,40,.12)';ctx.strokeStyle='rgba(120,90,40,.35)';ctx.lineWidth=2;ctx.setLineDash([5,5]);A.rr(ctx,c.x-sw/2+4,p.y+22,sw-8,p.h-30,14);ctx.fill();ctx.stroke();ctx.setLineDash([]);
  }
  // nubes en el andén
  for(const vs of g.vSlots){
    const c=slotPos(vs.idx),cs2=Math.round(lay.slotCs),cl=g.P.L.clouds[vs.id];
    let sc=1;if(vs.bump>0){sc=1+.14*vs.bump;vs.bump=Math.max(0,vs.bump-dt*4);}
    const bob=Math.sin(t*2.5+vs.id)*1.2;
    const top=p.y+24+bob,pxx=c.x-cs2/2;
    ctx.save();ctx.translate(c.x,top+cs2*.55);ctx.scale(sc,sc);ctx.translate(-c.x,-(top+cs2*.55));
    A.drawCloudSprite(ctx,cl.c,1,1,pxx,top,cs2,save.skin,DPR,'');
    if(vs.exprT&&t>vs.exprT){vs.expr='grumpy';vs.exprT=0;}
    const blink=((t*.7+vs.id*1.3)%4.3)<.11;
    A.face(ctx,c.x,top+cs2*.5,cs2*.95,vs.expr,[0,-.6],blink,save.skin,t);
    if(save.set.sym){const bx=pxx+cs2*.2,by=top+cs2*.28,r=cs2*.115;ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.arc(bx,by,r,0,7);ctx.fill();A.sym(ctx,cl.c,bx,by+.5,r*.62,A.PAL[cl.c].d);}
    if(cl.w*cl.h>1){ctx.fillStyle='#ff9b3e';ctx.strokeStyle='#a2540b';ctx.lineWidth=2;A.rr(ctx,pxx+cs2*.62,top+cs2*.02,cs2*.4,cs2*.26,8);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='700 '+Math.round(cs2*.2)+'px Fredoka,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('×'+cl.w*cl.h,pxx+cs2*.82,top+cs2*.16);}
    ctx.restore();
    // asientos
    const cap=vs.cap,rows=cap>5?2:1,per=Math.ceil(cap/rows);const pr=Math.min(4.5,sw/13);
    for(let q=0;q<cap;q++){const r=Math.floor(q/per),n=r===rows-1?cap-per*(rows-1):per,col=q-r*per;const x=c.x+(col-(n-1)/2)*(pr*2.5),y=top+cs2+6+r*(pr*2.4);const filled=q<cap-vs.left;ctx.fillStyle=filled?A.PAL[cl.c].f:'rgba(255,255,255,.85)';ctx.strokeStyle=filled?A.PAL[cl.c].d:'rgba(120,90,40,.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,pr,0,7);ctx.fill();ctx.stroke();}
  }
}
function drawQueue(t,dt){
  const g=G,q=lay.queue,P=g.P,len=P.queue.length;
  ctx.fillStyle='rgba(255,255,255,.62)';A.rr(ctx,q.x,q.y,q.w,q.h,22);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=3;ctx.stroke();
  ctx.save();A.rr(ctx,q.x+2,q.y+2,q.w-4,q.h-4,20);ctx.clip();
  if(g.qShift>0.2)g.qShift*=Math.pow(.0009,dt);else g.qShift=0;
  const rem=len-g.vQi;
  const n=Math.min(q.n,rem);
  for(let j=n-1;j>=0;j--){
    const col=P.queue[g.vQi+j];
    const x=q.x0+j*lay.qsp+(j>0?lay.rq*.5:0)+g.qShift;
    const r=j===0?lay.rq*1.14:lay.rq*.94;
    if(j===0){ctx.fillStyle='rgba(255,226,122,.75)';ctx.beginPath();ctx.ellipse(x,q.cy+r*.2,r*1.32,r*1.7,0,0,7);ctx.fill();}
    A.passenger(ctx,x,q.cy+r*.2,r,col,g.vQi+j,t,save.set.sym);
  }
  ctx.restore();
  if(rem>0){const extra=rem-n;if(extra>0){ctx.fillStyle='#fff';ctx.strokeStyle='rgba(58,53,96,.25)';ctx.lineWidth=2;const tx=q.x+q.w-34;A.rr(ctx,tx-24,q.cy-13,48,26,13);ctx.fill();ctx.stroke();ctx.fillStyle='#3a3560';ctx.font='700 14px Fredoka,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+'+extra,tx,q.cy+1);}}
  else{ctx.fillStyle='#3a3560';ctx.font='600 15px Fredoka,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('¡Todos a bordo!',q.x+q.w/2,q.cy);}
  if(rem>0){ctx.fillStyle='#7a5a1a';ctx.font='600 10px Fredoka,system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('SIGUIENTE ▸',q.x+10,q.y+3);}
}
const ease=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
function drawFlights(t){
  const g=G;
  const pend=g.flights.slice().sort((a,b)=>a.t1-b.t1);
  const fr=freeIdx();
  pend.forEach((f,rank)=>{
    const c=g.P.L.clouds[f.id];
    const u=Math.max(0,Math.min(1,(t-f.t0)/(f.t1-f.t0)));
    const idx=fr[rank]!=null?fr[rank]:Math.min(g.st.K-1,g.vSlots.length+rank);
    const dst=slotPos(idx);dst.y=lay.plat.y+24+lay.slotCs*.5;
    const p0=f.p0,cs=lay.cs;
    const dx=C.DX[c.d],dy=C.DY[c.d];
    let dist;if(dx>0)dist=lay.gx+lay.gw-p0.x;else if(dx<0)dist=p0.x-lay.gx;else if(dy>0)dist=lay.gy+lay.gh-p0.y;else dist=p0.y-lay.gy;
    const p1={x:p0.x+dx*(dist+cs*.9),y:p0.y+dy*(dist+cs*.9)};
    // el punto de control se acerca al centro horizontal para curvas suaves
    if(dy!==0)p1.x=p0.x+(dst.x-p0.x)*.25;
    const e=ease(u);
    const x=(1-e)*(1-e)*p0.x+2*(1-e)*e*p1.x+e*e*dst.x,y=(1-e)*(1-e)*p0.y+2*(1-e)*e*p1.y+e*e*dst.y;
    const sc=1+(lay.slotCs/(Math.max(c.w,c.h)*cs)-1)*e;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(u*Math.PI)*.35*(dx>=0?1:-1));ctx.scale(sc,sc);
    const k=g.cv[f.id];
    A.drawCloudSprite(ctx,c.c,c.w,c.h,-c.w*cs/2,-c.h*cs/2,cs,save.skin,DPR,'');
    A.face(ctx,0,cs*(c.h>1?.1:0),cs*(.95+.2*(Math.max(c.w,c.h)-1)),'wee',[0,0],false,save.skin,t);
    ctx.restore();
    // estela
    if(Math.random()<.5)parts.push({k:'puff',x,y,vx:0,vy:0,g:0,life:.35,t:0,col:'#ffffff',sz:4+Math.random()*4});
  });
}
function drawHops(t){
  const g=G;
  for(const h of g.hops){
    const vs=g.vSlots.find(s=>s.id===h.id);if(!vs)continue;
    const u=Math.min(1,(t-h.t0)/h.dur);const e=ease(u);
    const d=slotPos(vs.idx);const x0=h.x0,y0=h.y0,x1=d.x,y1=lay.plat.y+24+lay.slotCs*.55;
    const x=x0+(x1-x0)*e,y=y0+(y1-y0)*e-Math.sin(u*Math.PI)*40;
    A.passenger(ctx,x,y,lay.rq*(1.1-.4*u),h.col,h.k,t,false);
  }
}
function drawDeparts(t){
  const g=G;
  for(let i=g.departs.length-1;i>=0;i--){
    const d=g.departs[i],u=(t-d.t0)/d.dur;if(u>=1){g.departs.splice(i,1);continue;}
    const c=g.P.L.clouds[d.id],cs2=Math.round(lay.slotCs);
    const e=u*u;const y=d.y-e*110-Math.sin(u*Math.PI)*8,sc=1+.18*Math.sin(Math.min(1,u*2)*Math.PI);
    ctx.save();ctx.globalAlpha=Math.max(0,1-Math.pow(u,2.2));ctx.translate(d.x,y);ctx.scale(sc,sc);
    A.drawCloudSprite(ctx,c.c,1,1,-cs2/2,-cs2*.5,cs2,save.skin,DPR,'');
    A.face(ctx,0,0,cs2*.95,'proud',[0,0],false,save.skin,t);
    ctx.restore();
  }
}
function drawParts(t,dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.t+=dt;
    if(p.t<0)continue;
    if(p.k==='coin'){
      const u=Math.min(1,p.t/p.life);if(u>=1){parts.splice(i,1);if(t-(drawParts.lastCoin||0)>.05){S.coin();drawParts.lastCoin=t;}coinPulse=1;continue;}
      const e=ease(u);const x=p.sx+(p.tx-p.sx)*e,y=p.sy+(p.ty-p.sy)*e-Math.sin(u*Math.PI)*50;
      A.coin(ctx,x,y,p.sz*(1-.3*u),t*2+i);continue;
    }
    if(p.t>p.life){parts.splice(i,1);continue;}
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    const u=p.t/p.life;
    if(p.k==='conf'){p.rot+=p.vr*dt;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=Math.min(1,(1-u)*3);ctx.fillStyle=p.col;ctx.fillRect(-p.sz/2,-p.sz/4,p.sz,p.sz/2);ctx.restore();}
    else if(p.k==='spark'){ctx.globalAlpha=1-u;ctx.fillStyle=p.col;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(u*4);ctx.fillRect(-p.sz,-p.sz/4,p.sz*2,p.sz/2);ctx.fillRect(-p.sz/4,-p.sz,p.sz/2,p.sz*2);ctx.restore();ctx.globalAlpha=1;}
    else if(p.k==='puff'){ctx.globalAlpha=.7*(1-u);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.sz*(1+u*1.2),0,7);ctx.fill();ctx.globalAlpha=1;}
  }
  for(let i=texts.length-1;i>=0;i--){
    const x=texts[i];x.t+=dt;if(x.t>x.life){texts.splice(i,1);continue;}
    x.y+=x.vy*dt;const u=x.t/x.life;const sc=u<.15?.6+u/.15*.6:1.2-.2*Math.min(1,(u-.15)*3);
    ctx.save();ctx.translate(x.x,x.y);ctx.scale(sc,sc);ctx.globalAlpha=u>.7?1-(u-.7)/.3:1;ctx.font='700 '+x.size+'px Fredoka,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=5;ctx.strokeStyle=x.stroke||'#3a3560';ctx.lineJoin='round';ctx.strokeText(x.txt,0,0);ctx.fillStyle=x.col;ctx.fillText(x.txt,0,0);ctx.restore();
  }
}
let coinPulse=0;
/* ---------- bucle ---------- */
let lastT=T(),lastBubble='';
function frame(){
  const t=T();let dt=Math.min(.05,t-lastT);lastT=t;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  drawBg(t,dt);
  if(mode==='game'&&G&&lay){
    const g=G;
    while(g.sched.length&&g.sched[0].t<=t){const s=g.sched.shift();s.fn();}
    drawLot(t,dt);drawPlatform(t,dt);drawQueue(t,dt);drawFlights(t);drawHops(t);drawDeparts(t);
    drawParts(t,dt);
    if(!g.ended&&!modalOpen&&t-g.lastAct>(g.n<=3?3.2:9)&&!g.hint)computeHint();
    // retrato de Trueno
    A.portrait($('pTrueno'),'trueno',t<bubbleUntil?(bubbleMood==='shout'?'shout':bubbleMood==='proud'?'proud':'bossy'):'bossy');
  }else{
    drawParts(t,dt);
    if(mode==='menu')drawMenuCast(t);
  }
  if(flashT>0){ctx.fillStyle='rgba(255,255,255,'+Math.min(.8,flashT*2.5)+')';ctx.fillRect(0,0,W,H);flashT=Math.max(0,flashT-dt);}
  // contador de monedas animado
  if(coinShown!==save.coins){const d=save.coins-coinShown;coinShown+=Math.abs(d)<=2?d:Math.ceil(d*Math.min(1,dt*8));}
  if(coinPulse>0)coinPulse=Math.max(0,coinPulse-dt*4);
  const txt=String(coinShown);
  for(const id of['hCoins','mCoins','lCoins']){const e=$(id);if(e.textContent!==txt)e.textContent=txt;}
  $('hCoinPill').style.transform=coinPulse?'scale('+(1+.18*coinPulse)+')':'';
  if(modalOpen)document.querySelectorAll('#modal canvas.portrait[data-who]').forEach(c=>A.portrait(c,c.dataset.who,c.dataset.mood));
  requestAnimationFrame(frame);
}
function drawMenuCast(t){
  const mc=$('menuCast'),w=mc.clientWidth,h=mc.clientHeight;if(!w||!h)return;
  if(mc.width!==Math.round(w*DPR)){mc.width=Math.round(w*DPR);mc.height=Math.round(h*DPR);}
  const c2=mc.getContext('2d');c2.setTransform(DPR,0,0,DPR,0,0);c2.clearRect(0,0,w,h);
  const m=Math.min(w,h);
  const floaters=[[.13,.13,3,1.2],[.56,.05,5,2.1],[.5,.93,1,.4],[.93,.55,0,3.1]];
  floaters.forEach(([fx,fy,col,ph])=>{const s=Math.round(m*.17),x=fx*w-s/2,y=fy*h-s/2+Math.sin(t*1.6+ph)*5;A.drawCloudSprite(c2,col,1,1,x,y,s,save.skin,DPR,'');A.face(c2,x+s/2,y+s*.5,s*.95,(Math.floor(t/3+ph)%2)?'mad':'grumpy',[Math.sin(t+ph),0],false,save.skin,t);});
  A.trueno(c2,w*.5,h*.47+Math.sin(t*1.8)*4,m*.66,'bossy',t);
  A.cumulo(c2,w*.2,h*.79+Math.sin(t*2)*3,m*.33,'sad',t);
  A.granizo(c2,w*.8,h*.79+Math.sin(t*2.2)*3,m*.33,t);
  A.arcoiris(c2,w*.82,h*.24+Math.sin(t*1.5)*3,m*.3,t);
}
function onPointer(e){
  if(mode!=='game'||!G||!lay||modalOpen)return;
  const r=cv.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
  const cx=Math.floor((x-lay.gx)/lay.cs),cy=Math.floor((y-lay.gy)/lay.cs);
  if(cx<0||cy<0||cx>=G.L.cols||cy>=G.L.rows)return;
  const id=G.P.occ[cy*G.L.cols+cx];
  if(id>=0&&!((G.st.rm>>id)&1))onTap(id);
}
cv.addEventListener('pointerdown',e=>{e.preventDefault();onPointer(e);});

/* ---------- interfaz ---------- */
function nextLevel(){for(let n=1;n<=LV.length;n++)if(!(save.stars[n]>0))return n;return LV.length;}
function updateHud(){
  for(const[k,id]of[['undo','nUndo'],['slot','nSlot'],['shuf','nShuf']]){
    const e=$(id),n=save.boost[k];
    if(n>0){e.textContent=n;e.classList.remove('buy');}else{e.textContent=PRICE[k];e.classList.add('buy');}
  }
  $('mPlayLvl').textContent='Nivel '+nextLevel();
}
function openModal(html,onClose){
  const m=$('modal');m.innerHTML=html;m.classList.remove('hide');modalOpen=true;m._onClose=onClose||null;
  m.querySelectorAll('canvas.portrait').forEach(c=>A.portrait(c,c.dataset.who,c.dataset.mood));
  return m;
}
function closeModal(){const m=$('modal');m.classList.add('hide');m.innerHTML='';modalOpen=false;const f=m._onClose;m._onClose=null;if(f)f();}
function star(on,i){return '<svg viewBox="0 0 24 24" class="'+(on?'on':'')+'" style="animation-delay:'+(i*.18)+'s"><path d="M12 2.2l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17l-6 3.3 1.3-6.6L2.4 9.1l6.7-.8z" fill="'+(on?'#ffd24c':'#d6dbe8')+'" stroke="'+(on?'#c98400':'#aab2c8')+'" stroke-width="1.4" stroke-linejoin="round"/></svg>';}
function showWin(stars,reward,first,gift){
  const g=G;const last=g.n>=LV.length;
  const GL={undo:'Deshacer',slot:'Hueco extra',shuf:'Barajar cola'};
  const lines=['«Te pago en colores, cielo. El dinero es tan gris…»','«¡Qué elegancia de andén! Toma, un arcoíris de monedas.»','«Los pasajeros de hoy van de gala, gracias a ti.»'];
  const m=openModal('<div class="card"><canvas class="portrait" data-who="arcoiris"></canvas><h2>'+(last?'¡Terminal completada!':'¡Andén despejado!')+'</h2><div class="stars">'+[1,2,3].map(i=>star(i<=stars,i)).join('')+'</div><div class="reward"><i class="coinic"></i>+'+g.earned+'</div><div class="say">Señora Arcoíris: '+pick(lines)+'</div>'+(gift?'<div class="say" style="background:#e5ffef">¡Regalo! Un potenciador gratis: <b>'+GL[gift]+'</b></div>':'')+(stars<3?'<div class="say" style="background:#fff7de">Truco: '+(stars===1?'usa menos huecos para ganar 2 estrellas.':'3 estrellas = sin potenciadores y con el mínimo de huecos.')+'</div>':'')+'<div class="btns">'+(last?'':'<button class="btn green" id="wNext">Siguiente nivel</button>')+'<div class="row"><button class="btn ghost" id="wRe">Repetir</button><button class="btn ghost" id="wMenu">Niveles</button></div></div></div>');
  const nx=m.querySelector('#wNext');if(nx)nx.onclick=()=>{S.click();closeModal();startLevel(g.n+1);};
  m.querySelector('#wRe').onclick=()=>{S.click();closeModal();startLevel(g.n);};
  m.querySelector('#wMenu').onclick=()=>{S.click();closeModal();goLevels();};
  updateHud();
}
function showFail(){
  const g=G;g.failShown=true;
  const un=save.boost.undo;
  const m=openModal('<div class="card"><canvas class="portrait" data-who="cumulo" data-mood="sad"></canvas><h2>¡Atasco en la estación!</h2><p>Todos los huecos están llenos y los pasajeros no pueden subir. ¡Buaaa!</p><div class="btns">'+(g.freeRevive?'<button class="btn green" id="fRev">Hueco de emergencia · GRATIS<small>Trueno te lo perdona esta vez</small></button>':'')+'<button class="btn blue" id="fUndo">Deshacer jugada<small>'+(un>0?'Tienes '+un:'Cuesta '+PRICE.undo+' monedas')+'</small></button><div class="row"><button class="btn ghost" id="fRe">Reintentar</button><button class="btn ghost" id="fMenu">Niveles</button></div></div></div>');
  const rev=m.querySelector('#fRev');
  if(rev)rev.onclick=()=>{S.click();g.freeRevive=false;g.revived=true;closeModal();doSlot();S.boost();updateHud();};
  m.querySelector('#fUndo').onclick=()=>{S.click();closeModal();useBoost('undo');};
  m.querySelector('#fRe').onclick=()=>{S.click();closeModal();startLevel(g.n);};
  m.querySelector('#fMenu').onclick=()=>{S.click();closeModal();goLevels();};
}
function demo(kind){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.scale(2,2);
  if(kind==='big'){A.drawCloudSprite(x,3,2,1,4,14,28,0,2,'');A.face(x,32,38,26,'grumpy',[0,0],false,0,0);}
  else if(kind==='hid'){A.drawCloudSprite(x,0,1,1,6,8,48,0,2,'fog');x.font='700 30px Fredoka,sans-serif';x.fillStyle='#fff';x.strokeStyle='#5e6b86';x.lineWidth=5;x.textAlign='center';x.textBaseline='middle';x.strokeText('?',30,36);x.fillText('?',30,36);}
  else if(kind==='lock'){A.drawCloudSprite(x,5,1,1,6,8,48,0,2,'');A.face(x,30,32,46,'grumpy',[0,0],false,0,0);A.padlock(x,48,16,10,3,0);}
  else if(kind==='zap'){x.save();x.translate(32,32);const g=x.createRadialGradient(0,0,2,0,0,28);g.addColorStop(0,'rgba(255,240,140,.9)');g.addColorStop(.4,'rgba(150,110,255,.65)');g.addColorStop(1,'rgba(110,70,220,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,28,0,7);x.fill();x.fillStyle='#5b3fc4';x.strokeStyle='#2b1a78';x.lineWidth=2.4;x.beginPath();x.arc(0,0,17,0,7);x.fill();x.stroke();A.bolt(x,0,0,17);x.restore();}
  else if(kind==='pylon'){x.save();x.translate(32,34);x.fillStyle='#59658a';x.strokeStyle='#2c3552';x.lineWidth=2.4;A.rr(x,-18,10,36,10,5);x.fill();x.stroke();x.fillStyle='#78859f';A.rr(x,-4,-18,8,30,3);x.fill();x.stroke();x.fillStyle='#ffd24c';x.beginPath();x.moveTo(0,-26);x.lineTo(6,-17);x.lineTo(-6,-17);x.closePath();x.fill();x.stroke();x.restore();}
  return c;
}
const TIPS={
 3:{t:'¡Ojo con los huecos!',x:'Cada nube que sacas espera en el andén hasta llenarse de pasajeros. Si se llenan todos los huecos, ¡atasco! Aquí no hay reloj: piensa con calma.'},
 4:{t:'Tus potenciadores',x:'Deshacer te devuelve una jugada. Hueco extra añade un hueco al andén. Barajar cola reordena a los pasajeros (¡siempre con solución!). Los ganas jugando y en la tienda.'},
 6:{t:'¡Nubes grandes!',d:'big',x:'Ocupan varias casillas y llevan más pasajeros, pero solo gastan un hueco. ¡Rentables, pero estorban mucho!'},
 11:{t:'Nubes ocultas',d:'hid',x:'No se ve de qué color son hasta que su camino está libre. Despéjalo y se asomarán.'},
 17:{t:'Candados',d:'lock',x:'Una nube con candado no sale hasta que hayan salido tantas nubes como dice el número.'},
 24:{t:'¡Rayos!',d:'zap',x:'Un rayo bloquea el paso hasta que hayan salido tantas nubes como dice su número. Luego se descarga solo.'},
 34:{t:'Pararrayos',d:'pylon',x:'Estos no se mueven nunca. Las nubes tienen que esquivarlos, así que fíjate bien en las flechas.'}
};
function maybeTip(n){
  const tp=TIPS[n];if(!tp||save.seen['t'+n]||modalOpen)return;
  save.seen['t'+n]=1;persist();
  const m=openModal('<div class="card"><canvas class="portrait" data-who="trueno" data-mood="shout"></canvas><h2>'+tp.t+'</h2><div class="tip" id="tipD"></div><p>'+tp.x+'</p><div class="btns"><button class="btn green" id="tOk">¡Entendido!</button></div></div>');
  if(tp.d){const d=demo(tp.d);d.style.width=d.style.height='84px';m.querySelector('#tipD').appendChild(d);}
  m.querySelector('#tOk').onclick=()=>{S.click();closeModal();G&&(G.lastAct=T());};
}
function showPause(){
  if(!G)return;
  const m=openModal('<div class="card"><h2>Pausa</h2><p>Jefe Trueno: «Cinco minutos. Ni uno más.»</p><div class="setRow"><span>Sonidos</span><div class="sw '+(save.set.sfx?'on':'')+'" data-k="sfx"></div></div><div class="setRow"><span>Música</span><div class="sw '+(save.set.music?'on':'')+'" data-k="music"></div></div><div class="btns"><button class="btn green" id="pGo">Seguir jugando</button><div class="row"><button class="btn ghost" id="pRe">Reiniciar</button><button class="btn ghost" id="pMenu">Niveles</button></div></div></div>');
  wireSwitches(m);
  m.querySelector('#pGo').onclick=()=>{S.click();closeModal();};
  m.querySelector('#pRe').onclick=()=>{S.click();closeModal();startLevel(G.n);};
  m.querySelector('#pMenu').onclick=()=>{S.click();closeModal();goLevels();};
}
function wireSwitches(m){
  m.querySelectorAll('.sw').forEach(sw=>sw.onclick=()=>{const k=sw.dataset.k;save.set[k]=!save.set[k];sw.classList.toggle('on',save.set[k]);persist();applySettings();S.click();});
}
function applySettings(){S.setSfx(save.set.sfx);S.setMusic(save.set.music);}
function showSettings(){
  const m=openModal('<div class="card"><h2>Ajustes</h2><div class="setRow"><span>Sonidos</span><div class="sw '+(save.set.sfx?'on':'')+'" data-k="sfx"></div></div><div class="setRow"><span>Música</span><div class="sw '+(save.set.music?'on':'')+'" data-k="music"></div></div><div class="setRow"><span>Símbolos en los colores</span><div class="sw '+(save.set.sym?'on':'')+'" data-k="sym"></div></div><div class="setRow"><span>Vibración</span><div class="sw '+(save.set.vib?'on':'')+'" data-k="vib"></div></div><p style="font-size:13px;opacity:.7">Los símbolos ayudan si te cuesta distinguir colores. Todo se guarda en este dispositivo.</p><div class="btns"><button class="btn ghost" id="sReset">Borrar mi progreso</button><button class="btn green" id="sOk">Listo</button></div></div>');
  wireSwitches(m);
  let armed=false;
  m.querySelector('#sReset').onclick=function(){if(!armed){armed=true;this.textContent='¿Seguro? Toca otra vez';return;}localStorage.removeItem(KEY);save=defSave();if(PRUEBAS){save.max=65;}persist();coinShown=save.coins;closeModal();updateHud();toast('Progreso borrado');};
  m.querySelector('#sOk').onclick=()=>{S.click();closeModal();};
}
function showCast(){
  const who=[['trueno','Jefe de Estación Trueno','Manda más que nadie y se queja de todo. Su bigote es un rayo y su silbato, un arma.'],['cumulo','Nube Cumulonimbo Sensible','Se emociona con todo y llora a mares. Cuando hay atasco, ya sabes quién gimotea.'],['granizo','Familia Granizo','Papá, mamá y el peque: siempre viajan juntos, siempre llegan tarde y siempre discuten por el asiento.'],['arcoiris','Señora Arcoíris','Elegante y generosa. No paga con dinero: te paga en colores (y en monedas, que también valen).']];
  const m=openModal('<div class="card"><h2>Personajes</h2>'+who.map(w=>'<div class="cast"><canvas class="portrait" data-who="'+w[0]+'" data-mood="bossy"></canvas><div><b>'+w[1]+'</b>'+w[2]+'</div></div>').join('')+'<div class="btns"><button class="btn green" id="cOk">¡Qué elenco!</button></div></div>');
  m.querySelector('#cOk').onclick=()=>{S.click();closeModal();};
}
const BINFO={undo:['Deshacer','Devuelve la última jugada. Úsalo cuando te hayas liado.'],slot:['Hueco extra','Añade un hueco al andén para este nivel.'],shuf:['Barajar cola','Reordena los pasajeros que quedan. Siempre con solución.']};
const BICON={undo:'<svg viewBox="0 0 24 24"><path d="M9 7H15a5 5 0 0 1 0 10H8" fill="none" stroke="#3a3560" stroke-width="2.6" stroke-linecap="round"/><path d="M12 3L7 7l5 4z" fill="#3a3560"/></svg>',slot:'<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="10" rx="3" fill="none" stroke="#3a3560" stroke-width="2.4"/><path d="M12 2v6M9 5h6" stroke="#3a3560" stroke-width="2.6" stroke-linecap="round"/></svg>',shuf:'<svg viewBox="0 0 24 24"><path d="M3 7h4c6 0 6 10 12 10h2M3 17h4c2.5 0 4-2 5-4M14 9c1.2-1.2 2.6-2 5-2h2" fill="none" stroke="#3a3560" stroke-width="2.4" stroke-linecap="round"/><path d="M20 4l3 3-3 3zM20 14l3 3-3 3z" fill="#3a3560"/></svg>'};
function showShop(tab){
  tab=tab||'b';
  let h='<div class="card"><h2>Tienda</h2><div class="pill" style="display:inline-flex;margin:2px 0 4px"><i class="coinic"></i><b>'+save.coins+'</b></div><div class="tabs"><button data-tab="b" class="'+(tab==='b'?'on':'')+'">Potenciadores</button><button data-tab="s" class="'+(tab==='s'?'on':'')+'">Skins de nube</button></div>';
  if(tab==='b'){
    for(const k of['undo','slot','shuf'])h+='<div class="shopRow"><div class="ic">'+BICON[k]+'</div><div class="t"><b>'+BINFO[k][0]+' ×'+save.boost[k]+'</b><span>'+BINFO[k][1]+'</span></div><button class="btn sun" data-buy="'+k+'"><i class="coinic"></i>'+PRICE[k]+'</button></div>';
    h+='<p style="font-size:13px;opacity:.75;margin:6px 0 0">También ganas potenciadores gratis cada 5 niveles y con el premio diario.</p>';
  }else{
    for(const s of A.SKINS){const own=save.skins.includes(s.id),eq=save.skin===s.id;h+='<div class="shopRow'+(eq?' eq':'')+'"><div class="ic"><canvas data-skin="'+s.id+'"></canvas></div><div class="t"><b>'+s.n+'</b><span>'+s.desc+'</span></div>'+(eq?'<button class="btn ghost" disabled>Puesta</button>':own?'<button class="btn green" data-eq="'+s.id+'">Poner</button>':'<button class="btn sun" data-sk="'+s.id+'"><i class="coinic"></i>'+s.price+'</button>')+'</div>';}
  }
  h+='<div class="btns"><button class="btn green" id="shOk">Cerrar</button></div></div>';
  const m=openModal(h);
  m.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{S.click();closeModal();showShop(b.dataset.tab);});
  m.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const k=b.dataset.buy;if(save.coins<PRICE[k]){S.bonk();toast('Te faltan monedas');return;}save.coins-=PRICE[k];save.boost[k]++;persist();S.buy();closeModal();showShop('b');updateHud();});
  m.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{const s=A.SKINS[+b.dataset.sk];if(save.coins<s.price){S.bonk();toast('Te faltan monedas');return;}save.coins-=s.price;save.skins.push(s.id);save.skin=s.id;persist();S.buy();closeModal();showShop('s');});
  m.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{save.skin=+b.dataset.eq;persist();S.click();closeModal();showShop('s');});
  m.querySelectorAll('canvas[data-skin]').forEach(c=>{c.width=c.height=112;const x=c.getContext('2d');x.scale(2,2);const sk=+c.dataset.skin;A.drawCloudSprite(x,3,1,1,6,10,44,sk,2,'');A.face(x,28,32,42,'grumpy',[0,0],false,sk,0);});
  m.querySelector('#shOk').onclick=()=>{S.click();closeModal();};
}
function today(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function dayDiff(a,b){const pa=a.split('-').map(Number),pb=b.split('-').map(Number);return Math.round((new Date(pb[0],pb[1]-1,pb[2])-new Date(pa[0],pa[1]-1,pa[2]))/864e5);}
function giftReady(){return save.daily.day!==today();}
function showGift(){
  if(!giftReady())return;
  const streak=save.daily.day&&dayDiff(save.daily.day,today())===1?save.daily.streak+1:1;
  const coins=25+Math.min(streak-1,6)*10;
  let extra='';
  if(streak%7===0){const k=pick(['undo','slot','shuf']);save.boost[k]++;extra='<div class="say" style="background:#e5ffef">¡Día '+streak+'! Regalo extra: <b>'+BINFO[k][0]+'</b></div>';}
  save.daily={day:today(),streak};addCoins(coins);persist();S.coin();updateHud();
  const m=openModal('<div class="card"><canvas class="portrait" data-who="arcoiris"></canvas><h2>¡Premio diario!</h2><div class="reward"><i class="coinic"></i>+'+coins+'</div><div class="say">Señora Arcoíris: «Hoy te pago en colores. Racha de '+streak+(streak===1?' día':' días')+', ¡vuelve mañana!»</div>'+extra+'<div class="btns"><button class="btn green" id="gOk">¡Gracias, señora!</button></div></div>');
  confetti(W/2,H*.45,24);
  m.querySelector('#gOk').onclick=()=>{S.click();closeModal();$('mGift').classList.add('hide');};
}
function showIntro(){
  const m=openModal('<div class="card"><canvas class="portrait" data-who="trueno" data-mood="shout"></canvas><h2>¡Bienvenido a la Terminal!</h2><p>Soy el Jefe Trueno y aquí mando yo. <b>Toca una nube</b> con el camino libre y mándala al andén. Los pasajeros de la cola subirán a la nube de su color.</p><p>Cuando una nube se llena, se marcha. <b>No dejes que se llenen todos los huecos.</b> Sin reloj, sin prisas… pero sin quejas.</p><div class="btns"><button class="btn green" id="iOk">¡A trabajar!</button></div></div>');
  m.querySelector('#iOk').onclick=()=>{S.click();S.unlock();closeModal();save.seen.intro=1;persist();startLevel(nextLevel());};
}
/* ---------- pantallas ---------- */
function goMenu(){
  mode='menu';G=null;lay=null;
  $('hud').classList.add('hide');$('levels').classList.add('hide');$('menu').classList.remove('hide');
  updateHud();$('mGift').classList.toggle('hide',!giftReady());
}
function goLevels(){
  mode='levels';G=null;lay=null;
  $('hud').classList.add('hide');$('menu').classList.add('hide');$('levels').classList.remove('hide');
  let h='';
  for(const a of ANDENES){
    const done=Object.keys(save.stars).filter(k=>k>=a.a&&k<=a.b&&save.stars[k]>0).length;
    h+='<div class="anden"><span>Andén '+(ANDENES.indexOf(a)+1)+' · '+a.n+'</span><small>'+done+'/'+(a.b-a.a+1)+'</small></div><div class="grid">';
    for(let n=a.a;n<=a.b;n++){
      const locked=n>save.max,cur=n===save.max&&!save.stars[n],s=save.stars[n]||0;
      h+='<button class="lv'+(locked?' lock':'')+(cur?' cur':'')+(n%10===0?' boss':'')+'" data-n="'+n+'">'+(locked?'<svg viewBox="0 0 24 24" width="22" height="22"><rect x="5" y="11" width="14" height="10" rx="3" fill="#8a96ad"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#8a96ad" stroke-width="2.4"/></svg>':n+'<i>'+(s?'★'.repeat(s)+'☆'.repeat(3-s):'')+'</i>')+'</button>';
    }
    h+='</div>';
  }
  const list=$('lvlList');list.innerHTML=h;
  list.querySelectorAll('.lv').forEach(b=>b.onclick=()=>{const n=+b.dataset.n;if(n>save.max){S.bonk();toast('Supera el nivel '+(n-1)+' para abrir este');return;}S.click();S.unlock();startLevel(n);});
  const cur=list.querySelector('.cur')||list.querySelector('.lv:not(.lock):last-of-type');
  if(cur)setTimeout(()=>cur.scrollIntoView({block:'center'}),30);
}

/* ---------- arranque ---------- */
$('mPlay').onclick=()=>{S.unlock();S.click();applySettings();if(!save.seen.intro&&save.max<=1){showIntro();return;}startLevel(nextLevel());};
$('mLevels').onclick=()=>{S.unlock();S.click();applySettings();goLevels();};
$('mShop').onclick=()=>{S.unlock();S.click();showShop('b');};
$('mCast').onclick=()=>{S.unlock();S.click();showCast();};
$('mSet').onclick=()=>{S.unlock();S.click();showSettings();};
$('mGift').onclick=()=>{S.unlock();showGift();};
$('lBack').onclick=()=>{S.click();goMenu();};
$('bPause').onclick=()=>{S.click();showPause();};
$('bUndo').onclick=()=>useBoost('undo');
$('bSlot').onclick=()=>useBoost('slot');
$('bShuf').onclick=()=>useBoost('shuf');
$('hCoinPill').onclick=()=>{if(G&&!modalOpen){S.click();showShop('b');}};
$('modal').addEventListener('pointerdown',e=>{if(e.target===$('modal')&&!$('modal').querySelector('#wNext,#wRe,#fUndo,#iOk,#gOk'))closeModal();});
window.addEventListener('resize',()=>{layout();});
window.addEventListener('orientationchange',()=>setTimeout(layout,200));
document.addEventListener('visibilitychange',()=>{if(document.hidden)S.stopMusic();else if(save.set.music&&mode!=='menu'||0)S.startMusic();});
window.addEventListener('pointerdown',()=>{S.unlock();if(save.set.music)S.startMusic();},{once:true});
applySettings();
if(PRUEBAS)$('menu').classList.add('pruebas');
layout();goMenu();
requestAnimationFrame(frame);
// ganchos de prueba (también útiles para depurar)
window.NGDBG={G:()=>G,save:()=>save,start:startLevel,tap:onTap,core:C,
  pos:i=>{const p=cloudCenter(i),r=cv.getBoundingClientRect();return{x:r.left+p.x,y:r.top+p.y};},
  menu:goMenu,levels:goLevels,shop:showShop,win:onWin,fail:onLose,cast:showCast,gift:showGift,settings:showSettings,pause:showPause,
  speed:()=>{},lay:()=>lay};
})();
