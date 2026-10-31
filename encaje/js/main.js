import {LEVELS} from './levels.js';
import {TYPES,TYPE_BY_KEY,TYPE_INFO,genLevel,minMoves,starsFor} from './puzzles.js';
import {makeView,ICONS,h,pc} from './views.js';
import {createAudio} from './audio.js';

const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const audio=createAudio();
const SHORT={slide:'Deslizar',fit:'Encaje',trace:'Trazo',mirrors:'Espejos',gravity:'Gravedad',lights:'Interruptores',pipes:'Tuberías',rings:'Anillos'};
const OPEN_NEEDED=6;
/* ───── almacenamiento ───── */
const KEY='encaje_v1';
const DEF={levels:{},daily:{},streak:{last:'',n:0},set:{music:1,sfx:1,theme:'alba',orient:''}};
let S=load();
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(!s)return JSON.parse(JSON.stringify(DEF));return{...DEF,...s,set:{...DEF.set,...(s.set||{})}};}catch(e){return JSON.parse(JSON.stringify(DEF));}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
const starsOf=id=>(S.levels[id]&&S.levels[id].stars)||0;
const totalStars=()=>Object.values(S.levels).reduce((a,l)=>a+(l.stars||0),0)+Object.values(S.daily).reduce((a,l)=>a+(l.stars||0),0);
const roundDone=r=>LEVELS.filter(l=>l.round===r&&starsOf(l.id)>0).length;
const roundOpen=r=>r<=1||roundDone(r-1)>=OPEN_NEEDED;
const levelOpen=l=>roundOpen(l.round);
/* ───── utilidades ───── */
let toastT=0;function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600);}
function applyTheme(){document.documentElement.dataset.theme=S.set.theme;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=S.set.theme==='dusk'?'#39426a':'#f3eee6';}
const isLand=()=>matchMedia('(orientation:landscape)').matches;
/* ───── fondo ───── */
(function bg(){const b=$('#bg');const cols=['#e58f8f','#6fb5a8','#e8c06a','#9a92d2','#78a8d8','#d996b8'];
  for(let i=0;i<10;i++){const e=document.createElement('i');const s=40+Math.random()*110;e.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${s}px;height:${s}px;background:${cols[i%6]};border-radius:${[50,22,8][i%3]}%;animation-duration:${22+Math.random()*26}s;animation-delay:-${Math.random()*30}s;${i%4===3?'clip-path:polygon(50% 0,100% 100%,0 100%);border-radius:0':''}`;b.appendChild(e);}})();
/* ───── pantallas ───── */
let cur='cover';const PARENT={game:'route',route:'home',home:'cover',daily:'home'};
function show(name,push=true){cur=name;$$('.screen').forEach(s=>s.classList.toggle('on',s.id===name));if(push)try{history.pushState({s:name},'');}catch(e){}
  if(name==='home')refreshHome();if(name==='route')renderRoute();}
history.replaceState({s:'cover'},'');
addEventListener('popstate',()=>{closeOverlays();if(cur==='game'){leaveGame();show(G&&G.daily?'home':'route',false);G=null;return;}const p=PARENT[cur];if(p)show(p,false);else history.pushState({s:'cover'},'');});
function closeOverlays(){$('#win').classList.remove('on');$('#settings').classList.remove('on');}
/* ───── portada ───── */
function chooseOrient(o){audio.start();setTimeout(()=>audio.click(),150);S.set.orient=o;save();
  try{if(matchMedia('(pointer:coarse)').matches&&!navigator.webdriver&&document.documentElement.requestFullscreen){document.documentElement.requestFullscreen().then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock(o==='h'?'landscape':'portrait').catch(()=>{})).catch(()=>{});}}catch(e){}
  show('home');checkRot();}
$('#oV').onclick=()=>chooseOrient('v');$('#oH').onclick=()=>chooseOrient('h');
$('#coverSnd').onclick=()=>{S.set.music=S.set.music?0:1;save();audio.start();audio.setMusic(!!S.set.music);$('#coverSnd').classList.toggle('off',!S.set.music);};
function checkRot(){const want=S.set.orient;const box=$('#rotHint');if(!want||cur!=='home'){box.hidden=true;return;}const ok=(want==='h')===isLand();if(ok||rotDismissed){box.hidden=true;return;}$('#rotTxt').textContent=want==='h'?'Gira el móvil para jugar en horizontal':'Gira el móvil para jugar en vertical';box.hidden=false;}
let rotDismissed=false;$('#rotOk').onclick=()=>{rotDismissed=true;checkRot();};
addEventListener('resize',()=>{rotDismissed=false;checkRot();if(cur==='game'&&G)relayout();});
/* ───── inicio ───── */
function nextLevel(){return LEVELS.find(l=>levelOpen(l)&&!starsOf(l.id))||LEVELS.find(l=>starsOf(l.id)<3)||LEVELS[0];}
function refreshHome(){$('#hStars').textContent=totalStars();const nl=nextLevel();$('#contSub').textContent=`Ronda ${nl.round} · ${TYPE_INFO[nl.type].name}`;
  const done=LEVELS.filter(l=>starsOf(l.id)>0).length;$('#routeSub').textContent=`${done} de ${LEVELS.length} superadas`;
  const d=dailyInfo();const ds=S.daily[d.key];$('#dailySub').textContent=`Hoy: ${TYPE_INFO[d.type].name}`+(ds?` · ${'★'.repeat(ds.stars)}${'☆'.repeat(3-ds.stars)}`:'')+(S.streak.n>1?` · racha ${S.streak.n} días`:'');checkRot();}
$('#bContinue').onclick=()=>startLevel(nextLevel());
$('#bRoute').onclick=()=>show('route');
$('#bDaily').onclick=()=>startDaily();
$('#bBackCover').onclick=()=>show('cover');
$('#bSettings').onclick=()=>openSettings();
/* ───── ruta ───── */
function renderRoute(){const list=$('#routeList');list.innerHTML='';$('#rStars').textContent=totalStars();let curEl=null;const nl=nextLevel();
  for(let r=1;r<=9;r++){const open=roundOpen(r);const lv=LEVELS.filter(l=>l.round===r);const st=lv.reduce((a,l)=>a+starsOf(l.id),0);
    const card=h('div','ronda'+(open?'':' lock')+(nl.round===r?' cur':''),list);
    h('div','rh',card,`<b>Ronda ${r}</b><span>${roundDone(r)}/8 · ${st}★</span>`);
    if(!open)h('div','lockTag',card,`🔒 Supera ${OPEN_NEEDED} de 8 en la ronda ${r-1}`);
    const nodes=h('div','nodes',card);
    for(const l of lv){const s=starsOf(l.id);const b=h('button','node'+(s?' done':'')+(l.id===nl.id?' next':''),nodes,`<span class="ni">${ICONS[l.type]}</span><span class="nn">${SHORT[l.type]}</span><span class="ns">${'★'.repeat(s)}<u>${'★'.repeat(3-s)}</u></span>`);b.dataset.id=l.id;b.dataset.type=l.type;
      b.onclick=()=>{if(!open){audio.error();toast(`Supera ${OPEN_NEEDED} de las 8 pruebas de la ronda ${r-1} para abrir esta`);return;}startLevel(l);};}
    if(nl.round===r)curEl=card;}
  setTimeout(()=>{if(curEl)list.scrollTop=Math.max(0,curEl.offsetTop-12);},30);}
$('#rBack').onclick=()=>{audio.back();show('home');};
/* ───── reto del día ───── */
const pad2=n=>String(n).padStart(2,'0');
function dailyInfo(){const d=new Date();const key=`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;const dn=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5);
  const order=['gravity','mirrors','fit','lights','trace','pipes','rings','slide'];const type=order[((dn%8)+8)%8];const tier=type==='slide'?2:3+(dn%4);const seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();return{key,type,tier,seed,dn};}
let dailyCache=null;
function makeDaily(){const d=dailyInfo();if(dailyCache&&dailyCache.key===d.key)return dailyCache;let def=null;for(let a=0;a<40&&!def;a++)def=genLevel(d.type,d.tier,d.seed*7+a);
  if(!def){def=genLevel(d.type,2,d.seed+99);}dailyCache={id:'daily',key:d.key,type:d.type,def,min:minMoves(d.type,def),daily:true};return dailyCache;}
function startDaily(){toast('Preparando el reto de hoy…');setTimeout(()=>{startLevel(makeDaily());},30);}
/* ───── juego ───── */
let G=null;
const extraEl=$('#extra'),boardEl=$('#board');
function C(){return{get def(){return G.def},T:G.T,type:G.type,audio,toast,extra:extraEl,getState:()=>G.st,locked:()=>G.locked,dispatch,commit};}
function isWin(){return G.T.isWin(G.def,G.st);}
function solveFrom(st){return G.T.solve(G.def,st);}
function startLevel(l){if(G)leaveGame();closeOverlays();
  const T=TYPE_BY_KEY[l.type];const def=l.def;const st=T.init(def);
  G={lvl:l,type:l.type,T,def,st,hist:[],moves:0,hints:3,hinted:false,locked:false,daily:!!l.daily,min:l.min,view:null,t0:Date.now()};
  const info=TYPE_INFO[l.type];$('#gTitle').textContent=l.daily?`Reto del día · ${info.name}`:`Ronda ${l.round} · ${info.name}`;$('#ghelp').textContent=info.help;
  $('#game').dataset.type=l.type;show('game');updateStats();updateHintBtn();requestAnimationFrame(()=>requestAnimationFrame(()=>mountView()));}
function mountView(){if(!G)return;if(G.view&&G.view.destroy)G.view.destroy();extraEl.innerHTML='';extraEl.classList.remove('many');boardEl.innerHTML='';boardEl.className='';boardEl.style.cssText='';
  const view=makeView(G.type,C());G.view=view;const d=view.dims();const wrap=$('#boardWrap');const W=wrap.clientWidth-8,Hh=wrap.clientHeight-8;
  const extraCols=G.type==='slide'?.8:0;let u=Math.floor(Math.min(W/(d.cols+extraCols),Hh/d.rows));u=Math.max(24,Math.min(u,84));
  boardEl.style.width=d.cols*u+'px';boardEl.style.height=d.rows*u+'px';boardEl.style.setProperty('--u',u+'px');if(extraCols)boardEl.style.marginRight=extraCols*u+'px';
  view.mount(boardEl,u);G.u=u;}
function relayout(){if(!G||cur!=='game')return;clearTimeout(relayout.t);relayout.t=setTimeout(()=>{const wasFit=G.type==='fit';mountView();},120);}
addEventListener('orientationchange',()=>setTimeout(relayout,200));
function leaveGame(){if(G&&G.view&&G.view.destroy)G.view.destroy();window.onkeydown=null;}
function updateStats(){if(!G)return;const slack=(G.type==='fit'||G.type==='trace')?0:Math.floor(G.min/6);let extra='';
  if(G.type==='trace'){extra=` · casillas <b>${G.st.length}</b>/${G.def.w*G.def.h-G.def.blocked.length}`;}
  if(G.type==='fit'){extra=` · piezas <b>${Object.keys(G.st.placed).length}</b>/${G.def.pieces.length}`;}
  $('#gStats').innerHTML=`Movimientos <b>${G.moves}</b> · ★★★ hasta <b>${G.min+slack}</b>${extra}`;}
function updateHintBtn(){$('#hintN').textContent=G?G.hints:0;}
function sfxFor(info){const t=G.type;if(info.kind==='place')return audio.ok(info.n);if(info.kind==='lift')return audio.tick();
  if(t==='slide')return audio.whoosh();if(t==='trace')return audio.ok(G.st.length);if(t==='lights')return audio.ok(popcount(G.st));if(t==='gravity')return;if(t==='mirrors')return audio.tick();audio.tick();}
const popcount=x=>{let c=0;x>>>=0;while(x){c+=x&1;x>>>=1;}return c;};
function dispatch(mv){if(!G||G.locked)return false;const ns=G.T.apply(G.def,G.st,mv);if(G.T.hash(ns)===G.T.hash(G.st)){audio.error();return false;}commit(ns,{kind:'move',mv});return true;}
function commit(ns,info={}){if(!G||G.locked)return;G.hist.push({st:G.st,moves:G.moves});G.st=ns;G.moves+=(info.cost??1);if(info.kind==='lift'){}
  G.view.update(G.st,info);updateStats();sfxFor(info);
  if(isWin())win();}
$('#bUndo').onclick=()=>{if(!G||G.locked)return;if(!G.hist.length){toast('No hay nada que deshacer');audio.error();return;}const p=G.hist.pop();G.st=p.st;G.moves=p.moves;if(G.view.clearHint)G.view.clearHint();G.view.update(G.st,{kind:'undo'});updateStats();audio.back();};
$('#bReset').onclick=()=>{if(!G||G.locked)return;G.st=G.T.init(G.def);G.hist=[];G.moves=0;if(G.view.reset)G.view.reset();mountView();updateStats();audio.back();toast('Prueba reiniciada');};
$('#bHint').onclick=()=>{if(!G||G.locked)return;if(G.hints<=0){toast('Ya no te quedan pistas en esta prueba');audio.error();return;}
  const sol=solveFrom(G.st);if(!sol||(Array.isArray(sol)&&!sol.length)){toast('Por aquí no hay salida: prueba con «Deshacer»');const b=$('#bUndo');b.classList.add('pulse');setTimeout(()=>b.classList.remove('pulse'),1900);audio.error();return;}
  G.hints--;G.hinted=true;updateHintBtn();audio.ok(4);G.view.hint(Array.isArray(sol)?sol[0]:sol);toast(G.type==='fit'?'Te muestro una pieza y dónde va':'Mira lo que brilla. Con pista, máximo 2 estrellas');};
$('#gBack').onclick=()=>{audio.back();if(cur==='game'){leaveGame();const d=G&&G.daily;G=null;show(d?'home':'route');}};
/* ───── victoria ───── */
function win(){G.locked=true;if(G.view.clearHint)G.view.clearHint();const stars=starsFor(G.type,G.min,G.moves,G.hinted);G.stars=stars;audio.win(stars);if(G.view.celebrate)G.view.celebrate();
  const id=G.lvl.id;
  if(G.daily){const k=G.lvl.key;const prev=S.daily[k];if(!prev||stars>prev.stars)S.daily[k]={stars,moves:G.moves};
    if(S.streak.last!==k){const y=new Date();y.setDate(y.getDate()-1);const yk=`${y.getFullYear()}-${pad2(y.getMonth()+1)}-${pad2(y.getDate())}`;S.streak.n=S.streak.last===yk?S.streak.n+1:1;S.streak.last=k;}}
  else{const p=S.levels[id];if(!p||stars>p.stars)S.levels[id]={stars,best:Math.min(G.moves,p?p.best:99999)};else if(G.moves<p.best)p.best=G.moves;}
  save();
  setTimeout(()=>{if(!G)return;const t=stars===3?'¡Perfecto!':stars===2?'¡Muy bien!':'¡Resuelto!';$('#winT').textContent=t;
    let info=`Movimientos: <b>${G.moves}</b> · Mejor posible: <b>${G.min}</b>`;if(G.hinted&&stars===2&&G.moves<=G.min)info+='<br>Con pista, el máximo son 2 estrellas';else if(stars<3)info+='<br>Prueba a repetirla para conseguir 3 estrellas';
    $('#winInfo').innerHTML=info;const st=$$('#winStars i');st.forEach(i=>i.classList.remove('on'));$('#win').classList.add('on');
    st.forEach((e,i)=>{if(i<stars)setTimeout(()=>{e.classList.add('on');audio.star(i);},350+i*420);});
    const nx=nextAfter();$('#wNextT').textContent=nx?`Siguiente: ${SHORT[nx.type]}`:(G.daily?'Volver al inicio':'Volver a la ruta');G.next=nx;},G.type==='slide'?900:750);}
function nextAfter(){if(G.daily)return null;const l=G.lvl;const nx=LEVELS.find(x=>x.id===l.id+1);if(nx&&levelOpen(nx))return nx;return null;}
$('#wNext').onclick=()=>{audio.click();$('#win').classList.remove('on');const nx=G.next;if(nx)startLevel(nx);else{const d=G.daily;leaveGame();G=null;show(d?'home':'route');}};
$('#wAgain').onclick=()=>{$('#win').classList.remove('on');startLevel(G.lvl);};
$('#wRoute').onclick=()=>{$('#win').classList.remove('on');const d=G.daily;leaveGame();G=null;show(d?'home':'route');};
/* ───── ajustes ───── */
function openSettings(){syncSeg();$('#settings').classList.add('on');}
function syncSeg(){$$('#settings .seg').forEach(sg=>{const k=sg.dataset.k;sg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',String(S.set[k])===b.dataset.v));});}
$$('#settings .seg button').forEach(b=>b.onclick=()=>{const k=b.parentNode.dataset.k;let v=b.dataset.v;if(k==='music'||k==='sfx')v=+v;S.set[k]=v;save();
  if(k==='music'){audio.start();audio.setMusic(!!v);$('#coverSnd').classList.toggle('off',!v);}if(k==='sfx'){audio.setSfx(!!v);}if(k==='theme')applyTheme();if(k==='orient'){rotDismissed=false;}syncSeg();checkRot();});
$('#sClose').onclick=()=>$('#settings').classList.remove('on');
$('#bWipe').onclick=()=>{if(confirm('¿Seguro que quieres borrar todo tu progreso?')){S={...JSON.parse(JSON.stringify(DEF)),set:S.set};save();refreshHome();toast('Progreso borrado');}};
/* ───── sonidos de botones ───── */
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('button');if(!b||b.disabled)return;if(b.matches('.lt,.mir,.pt,.arrow,.orient'))return;if(b.matches('.iconbtn:not(.corner),.seg button'))return audio.tick();audio.click();},true);
$('#bUndo').addEventListener('pointerdown',()=>{});
/* ───── arranque ───── */
applyTheme();$('#coverSnd').classList.toggle('off',!S.set.music);audio.setMusic(!!S.set.music);audio.setSfx(!!S.set.sfx);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){addEventListener('load',()=>navigator.serviceWorker.register('sw.js?v=1',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{}));}
/* API para pruebas automáticas */
window.__enc={audio,get G(){return G},LEVELS,startLevel:id=>startLevel(typeof id==='object'?id:LEVELS.find(l=>l.id===id)),startDaily,makeDaily,dailyInfo,state:()=>S,save:()=>save(),setState:s=>{S=s;save();},solveFrom:()=>G&&solveFrom(G.st),show};
