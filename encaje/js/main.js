import {LEVELS} from './levels.js';
import {TYPES,TYPE_BY_KEY,TYPE_INFO,FIGURES,genLevel,minMoves,starsFor,lightsTarget} from './puzzles.js';
import {makeView,sizeBoard,ICONS,h,pc} from './views.js';
import {createAudio} from './audio.js';
import {fingerStop,fingerLoop,confetti,sparkle} from './fx.js';
import {playTutorial,TUTS} from './tutorial.js';

const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const audio=createAudio();
const ORDER=['slide','fit','trace','mirrors','gravity','lights','pipes','rings'];
const SHORT={slide:'Deslizar',fit:'Encaje',trace:'Trazo',mirrors:'Espejos',gravity:'Gravedad',lights:'Interruptores',pipes:'Tuberías',rings:'Anillos'};
const OPEN_NEEDED=6,PER_TYPE=16,ROUNDS=16;
const TIMED={start:150,bonus:20,skip:10};
/* ───── almacenamiento (misma clave que la v1: el progreso se conserva) ───── */
const KEY='encaje_v1';
const DEF={levels:{},daily:{},streak:{last:'',n:0},seen:{},medals:{},timed:{best:0,runs:0,total:0},set:{music:1,sfx:1,theme:'alba',orient:''}};
const clone=o=>JSON.parse(JSON.stringify(o));
let S=load();
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(!s)return clone(DEF);const o={...clone(DEF),...s};o.set={...DEF.set,...(s.set||{})};o.timed={...DEF.timed,...(s.timed||{})};o.seen=s.seen||{};o.medals=s.medals||{};return o;}catch(e){return clone(DEF);}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
const starsOf=id=>(S.levels[id]&&S.levels[id].stars)||0;
const totalStars=()=>Object.values(S.levels).reduce((a,l)=>a+(l.stars||0),0)+Object.values(S.daily).reduce((a,l)=>a+(l.stars||0),0);
const roundDone=r=>LEVELS.filter(l=>l.round===r&&starsOf(l.id)>0).length;
const roundOpen=r=>r<=1||roundDone(r-1)>=OPEN_NEEDED;
const typeLv=type=>LEVELS.filter(l=>l.type===type).sort((a,b)=>a.tier-b.tier);
const typeDone=type=>typeLv(type).filter(l=>starsOf(l.id)>0).length;
const typeStars=type=>typeLv(type).reduce((a,l)=>a+starsOf(l.id),0);
const typeOpen=l=>l.tier<4||typeDone(l.type)>=l.tier-3;
const levelOpen=l=>roundOpen(l.round)||typeOpen(l);
const solvedCount=()=>LEVELS.filter(l=>starsOf(l.id)>0).length;
/* ───── utilidades ───── */
let toastT=0;function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600);}
function applyTheme(){document.documentElement.dataset.theme=S.set.theme;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=S.set.theme==='dusk'?'#39426a':'#f3eee6';}
const isLand=()=>matchMedia('(orientation:landscape)').matches;
const fmt=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
/* ───── fondo ───── */
(function bg(){const b=$('#bg');const cols=['#e58f8f','#6fb5a8','#e8c06a','#9a92d2','#78a8d8','#d996b8'];
  for(let i=0;i<10;i++){const e=document.createElement('i');const s=40+Math.random()*110;e.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${s}px;height:${s}px;background:${cols[i%6]};border-radius:${[50,22,8][i%3]}%;animation-duration:${22+Math.random()*26}s;animation-delay:-${Math.random()*30}s;${i%4===3?'clip-path:polygon(50% 0,100% 100%,0 100%);border-radius:0':''}`;b.appendChild(e);}})();
/* ───── pantallas ───── */
let cur='cover',curType='slide';
const PARENT={route:'home',home:'cover',pick:'home',tlist:'pick',medals:'home'};
const backOf=()=>G?(G.from==='route'?'route':G.from==='tlist'?'tlist':'home'):'home';
function show(name,push=true){const was=cur;cur=name;$$('.screen').forEach(s=>s.classList.toggle('on',s.id===name));if(push&&was!==name)try{history.pushState({s:name},'');}catch(e){}
  if(name==='home')refreshHome();if(name==='route')renderRoute();if(name==='pick')renderPick();if(name==='tlist')renderTlist();if(name==='medals')renderMedals();}
history.replaceState({s:'cover'},'');
addEventListener('popstate',()=>{closeOverlays();if(cur==='game'){const b=backOf();leaveGame();G=null;show(b,false);return;}const p=PARENT[cur];if(p)show(p,false);else history.pushState({s:'cover'},'');});
function closeOverlays(){['#win','#settings','#tmi','#tres'].forEach(s=>$(s).classList.remove('on'));if($('#tut').classList.contains('on'))closeTut(true);}
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
function nextLevel(){return LEVELS.find(l=>roundOpen(l.round)&&!starsOf(l.id))||LEVELS.find(l=>starsOf(l.id)<3)||LEVELS[0];}
function refreshHome(){$('#hStars').textContent=totalStars();const nl=nextLevel();$('#contSub').textContent=`Ronda ${nl.round} · ${TYPE_INFO[nl.type].name}`;
  $('#routeSub').textContent=`${solvedCount()} de ${LEVELS.length} superadas`;
  $('#pickSub').textContent='Tú escoges: 8 tipos';
  const d=dailyInfo();const ds=S.daily[d.key];$('#dailySub').textContent=`Hoy: ${TYPE_INFO[d.type].name}`+(ds?` · ${'★'.repeat(ds.stars)}${'☆'.repeat(3-ds.stars)}`:'')+(S.streak.n>1?` · racha ${S.streak.n} días`:'');
  $('#timedSub').textContent=S.timed.best?`Tu récord: ${S.timed.best} pruebas`:'2:30 · ¡cuantas más, mejor!';
  $('#medN').textContent=`${medalCount()}/${MEDALS.length}`;checkRot();}
$('#bContinue').onclick=()=>startLevel(nextLevel(),'route');
$('#bPick').onclick=()=>show('pick');
$('#bRoute').onclick=()=>show('route');
$('#bDaily').onclick=()=>startDaily();
$('#bTimed').onclick=()=>openTimedIntro();
$('#bMedals').onclick=()=>show('medals');
$('#bBackCover').onclick=()=>show('cover');
$('#bSettings').onclick=()=>openSettings();
/* ───── ruta mezclada ───── */
function renderRoute(){const list=$('#routeList');list.innerHTML='';$('#rStars').textContent=totalStars();let curEl=null;const nl=nextLevel();
  for(let r=1;r<=ROUNDS;r++){const open=roundOpen(r);const lv=LEVELS.filter(l=>l.round===r);const st=lv.reduce((a,l)=>a+starsOf(l.id),0);
    const card=h('div','ronda'+(open?'':' lock')+(nl.round===r?' cur':''),list);
    h('div','rh',card,`<b>Ronda ${r}</b><span>${roundDone(r)}/8 · ${st}★</span>`);
    if(!open)h('div','lockTag',card,`🔒 Supera ${OPEN_NEEDED} de 8 en la ronda ${r-1}`);
    const nodes=h('div','nodes',card);
    for(const l of lv){const s=starsOf(l.id);const b=h('button','node'+(s?' done':'')+(l.id===nl.id?' next':''),nodes,`<span class="ni">${ICONS[l.type]}</span><span class="nn">${SHORT[l.type]}</span><span class="ns">${'★'.repeat(s)}<u>${'★'.repeat(3-s)}</u></span>`);b.dataset.id=l.id;b.dataset.type=l.type;
      b.onclick=()=>{if(!open){audio.error();toast(`Supera ${OPEN_NEEDED} de las 8 pruebas de la ronda ${r-1} para abrir esta`);return;}startLevel(l,'route');};}
    if(nl.round===r)curEl=card;}
  setTimeout(()=>{if(curEl)list.scrollTop=Math.max(0,curEl.offsetTop-12);},30);}
$('#rBack').onclick=()=>{audio.back();show('home');};
/* ───── elegir prueba ───── */
function renderPick(){$('#pStars').textContent=totalStars();const g=$('#pickGrid');g.innerHTML='';
  for(const type of ORDER){const info=TYPE_INFO[type];const done=typeDone(type),st=typeStars(type);
    const b=h('button','pcard'+(done>=PER_TYPE?' full':''),g,`<span class="pic">${ICONS[type]}</span><span class="pnm">${info.name}</span><span class="psh">${info.short}</span><span class="pbar"><i style="width:${done/PER_TYPE*100}%"></i></span><span class="pst"><span><b>${done}/${PER_TYPE}</b> superadas</span><em>${st}/${PER_TYPE*3} ★</em></span>`);
    b.dataset.type=type;b.onclick=()=>{curType=type;show('tlist');};}}
$('#pBack').onclick=()=>{audio.back();show('home');};
function renderTlist(){const type=curType,info=TYPE_INFO[type];$('#tTitle').textContent=info.name;$('#tStars').textContent=typeStars(type);$('#tGoal').textContent=info.goal;
  const grid=$('#tGrid');grid.innerHTML='';const lv=typeLv(type);let nextL=null;
  for(const l of lv){const open=levelOpen(l),s=starsOf(l.id);if(open&&!s&&!nextL)nextL=l;
    const fig=type==='lights'&&l.def.fig;
    const b=h('button','lv'+(s?' done':'')+(open?'':' lock'),grid,`<span class="lnum">${l.tier+1}</span><span class="lst">${open?('★'.repeat(s)+'<u>'+'★'.repeat(3-s)+'</u>'):'🔒'}</span>${fig?'<em class="lfig">figura</em>':''}`);
    b.dataset.id=l.id;b.dataset.tier=l.tier+1;
    b.onclick=()=>{if(!open){audio.error();toast(`Supera ${Math.max(1,l.tier-3-typeDone(type))} prueba${l.tier-3-typeDone(type)>1?'s':''} más de este tipo para abrir esta`);return;}startLevel(l,'tlist');};}
  const first=nextL||lv.find(l=>starsOf(l.id)<3)||lv[0];$('#tPlayT').textContent=nextL?`Seguir: nivel ${first.tier+1}`:(first&&starsOf(first.id)<3?`Mejorar nivel ${first.tier+1}`:'Jugar de nuevo');$('#tPlay').dataset.id=first.id;
  grid.scrollTop=0;}
$('#tBack').onclick=()=>{audio.back();show('pick');};
$('#tPlay').onclick=()=>{const l=LEVELS.find(x=>x.id==$('#tPlay').dataset.id);startLevel(l,'tlist');};
$('#tHow').onclick=()=>openTut(type2key(curType),()=>{});
const type2key=t=>t;
/* ───── reto del día ───── */
const pad2=n=>String(n).padStart(2,'0');
function dailyInfo(){const d=new Date();const key=`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;const dn=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5);
  const order=['gravity','mirrors','fit','lights','trace','pipes','rings','slide'];const type=order[((dn%8)+8)%8];const tier=type==='slide'?2:3+(dn%4);const seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();return{key,type,tier,seed,dn};}
let dailyCache=null;
function makeDaily(){const d=dailyInfo();if(dailyCache&&dailyCache.key===d.key)return dailyCache;let def=null;for(let a=0;a<40&&!def;a++)def=genLevel(d.type,d.tier,d.seed*7+a);
  if(!def){def=genLevel(d.type,2,d.seed+99);}dailyCache={id:'daily',key:d.key,type:d.type,def,min:minMoves(d.type,def),daily:true};return dailyCache;}
function startDaily(){toast('Preparando el reto de hoy…');setTimeout(()=>{startLevel(makeDaily(),'home');},30);}
/* ───── juego ───── */
let G=null,combo=0;
const extraEl=$('#extra'),boardEl=$('#board');
function C(){return{get def(){return G.def},T:G.T,type:G.type,audio,toast,extra:extraEl,getState:()=>G.st,locked:()=>G.locked,dispatch,commit};}
function isWin(){return G.T.isWin(G.def,G.st);}
function solveFrom(st){return G.T.solve(G.def,st);}
const tutKey=l=>l.type==='lights'&&l.def&&l.def.fig?'lightsfig':l.type;
function figName(def){return FIGURES[def.n][def.fig].n;}
function setHelp(){const info=TYPE_INFO[G.type];let goal=info.goal,help=info.help;
  if(G.type==='lights'&&G.def.fig){goal=`Deja en amarillo SOLO ${figName(G.def)}`;help='Mira el dibujo «Objetivo». Anillo punteado = falta encender. Rojo = sobra. Al tocar una casilla cambian ella y sus vecinas.';}
  G.help=`<b>${goal}</b><span class="sub">${help}</span>`;$('#ghelp').innerHTML=G.help;$('#ghelp').classList.remove('hinting');}
function startLevel(l,from='route',opt={}){if(G)leaveGame(true);closeOverlays();fingerStop();
  const T=TYPE_BY_KEY[l.type];const def=l.def;const st=T.init(def);
  G={lvl:l,type:l.type,T,def,st,hist:[],moves:0,hinted:false,hintsUsed:0,locked:false,daily:!!l.daily,from:l.daily?'home':from,timed:from==='timed',min:l.min,view:null,t0:Date.now()};
  const info=TYPE_INFO[l.type];$('#gTitle').textContent=l.daily?`Reto del día · ${info.name}`:G.timed?`Contrarreloj · ${info.name}`:from==='tlist'?`${info.name} · nivel ${l.tier+1}`:`Ronda ${l.round} · ${info.name}`;
  setHelp();$('#game').dataset.type=l.type;$('#game').classList.toggle('timed',G.timed);$('#tbar').hidden=!G.timed;$('#bHint').hidden=G.timed;$('#bSkip').hidden=!G.timed;
  show('game');updateStats();requestAnimationFrame(()=>requestAnimationFrame(()=>{mountView();}));
  if(!G.timed&&!opt.noTut&&!S.seen[tutKey(l)])setTimeout(()=>{if(G&&G.lvl===l)openTut(tutKey(l));},650);}
function mountView(){if(!G)return;endHintUI();if(G.view&&G.view.destroy)G.view.destroy();extraEl.innerHTML='';extraEl.classList.remove('many');boardEl.innerHTML='';boardEl.className='';boardEl.style.cssText='';
  boardEl.onpointerdown=boardEl.onpointermove=boardEl.onpointerup=boardEl.onpointercancel=null; // los manejadores de la prueba anterior no deben seguir vivos
  const view=makeView(G.type,C());G.view=view;const oc=view.clearHint;view.clearHint=()=>{oc&&oc.call(view);endHintUI();};
  const wrap=$('#boardWrap');G.u=sizeBoard(view,boardEl,wrap.clientWidth-8,wrap.clientHeight-8,G.type);view.mount(boardEl,G.u);}
function relayout(){if(!G||cur!=='game')return;clearTimeout(relayout.t);relayout.t=setTimeout(()=>{if(G&&cur==='game'&&!G.locked)mountView();},140);}
addEventListener('orientationchange',()=>setTimeout(relayout,200));
function leaveGame(keepTimed){if(G&&G.view&&G.view.destroy)G.view.destroy();window.onkeydown=null;endHintUI();if(!keepTimed&&TM&&!TM.over)stopTimed();}
function updateStats(){if(!G)return;if(G.timed&&TM){$('#gStats').innerHTML=`Tiempo <b>${fmt(TM.left)}</b> · Resueltas <b>${TM.solved}</b>`;return;}
  const slack=(G.type==='fit'||G.type==='trace')?0:Math.floor(G.min/6);let extra='';
  if(G.type==='trace'){extra=` · casillas <b>${G.st.length}</b>/${G.def.w*G.def.h-G.def.blocked.length}`;}
  if(G.type==='fit'){extra=` · piezas <b>${Object.keys(G.st.placed).length}</b>/${G.def.pieces.length}`;}
  if(G.type==='lights'&&G.view&&G.view.progress){const p=G.view.progress(G.st);extra=` · casillas bien <b>${p.good}</b>/${p.total}`;}
  else if(G.type==='lights'){extra='';}
  $('#gStats').innerHTML=`Movimientos <b>${G.moves}</b> · ★★★ hasta <b>${G.min+slack}</b>${extra}`;}
function sfxFor(info){const t=G.type;if(info.kind==='place')return audio.ok(info.n);if(info.kind==='lift')return audio.tick();
  if(t==='slide')return audio.whoosh();if(t==='trace')return audio.ok(G.st.length);if(t==='lights')return audio.ok(popcount(G.st));if(t==='gravity')return;if(t==='mirrors')return audio.tick();audio.tick();}
const popcount=x=>{let c=0;x>>>=0;while(x){c+=x&1;x>>>=1;}return c;};
function dispatch(mv){if(!G||G.locked)return false;const ns=G.T.apply(G.def,G.st,mv);if(G.T.hash(ns)===G.T.hash(G.st)){audio.error();return false;}commit(ns,{kind:'move',mv});return true;}
function commit(ns,info={}){if(!G||G.locked)return;endHintUI();G.hist.push({st:G.st,moves:G.moves});G.st=ns;G.moves+=(info.cost??1);
  G.view.update(G.st,info);updateStats();sfxFor(info);
  if(isWin())win();}
$('#bUndo').onclick=()=>{if(!G||G.locked)return;if(!G.hist.length){toast('No hay nada que deshacer');audio.error();return;}const p=G.hist.pop();G.st=p.st;G.moves=p.moves;if(G.view.clearHint)G.view.clearHint();G.view.update(G.st,{kind:'undo'});updateStats();audio.back();};
$('#bReset').onclick=()=>{if(!G||G.locked)return;G.st=G.T.init(G.def);G.hist=[];G.moves=0;if(G.view.reset)G.view.reset();mountView();updateStats();audio.back();toast('Prueba reiniciada');};
/* ───── pistas paso a paso: texto claro + dedo animado + la casilla/pieza que late ───── */
const pt=e=>{if(!e)return null;if(e.rel){const r=e.rel.getBoundingClientRect();return{x:r.left+e.x,y:r.top+e.y};}const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};};
function endHintUI(){fingerStop();const g=$('#ghelp');if(g&&g.classList.contains('hinting')&&G&&G.help){g.innerHTML=G.help;g.classList.remove('hinting');}}
function showHintUI(pl){endHintUI();if(!pl)return;const g=$('#ghelp');g.innerHTML=`<div class="hintBox"><i class="hbulb"></i><span><b>Pista:</b> ${pl.text}</span></div>`;g.classList.add('hinting');
  setTimeout(()=>{if(!G||!g.classList.contains('hinting'))return;const a=pt(pl.from),b=pl.to?pt(pl.to):null;if(a)fingerLoop(a,b);},160);}
$('#bHint').onclick=()=>{if(!G||G.locked)return;
  const sol=solveFrom(G.st);if(!sol||(Array.isArray(sol)&&!sol.length)){toast('Por aquí no hay salida: prueba con «Deshacer»');const b=$('#bUndo');b.classList.add('pulse');setTimeout(()=>b.classList.remove('pulse'),1900);audio.error();return;}
  const mv=Array.isArray(sol)?sol[0]:sol;G.hinted=true;G.hintsUsed++;audio.ok(4);G.view.hint(mv);
  showHintUI(G.view.plan?G.view.plan(mv,sol):{text:'Mira lo que brilla.',from:null});};
$('#gBack').onclick=()=>{audio.back();if(cur==='game'){const b=backOf();leaveGame();G=null;show(b);}};
$('#gHelp').onclick=()=>{if(G)openTut(tutKey(G.lvl));};
/* ───── victoria ───── */
function win(){G.locked=true;if(G.view.clearHint)G.view.clearHint();const stars=starsFor(G.type,G.min,G.moves,G.hinted);G.stars=stars;
  if(G.timed){winTimed(stars);return;}
  audio.win(stars);if(G.view.celebrate)G.view.celebrate();
  const id=G.lvl.id;combo=stars===3?combo+1:0;
  if(G.daily){const k=G.lvl.key;const prev=S.daily[k];if(!prev||stars>prev.stars)S.daily[k]={stars,moves:G.moves};S.dailyWon=(S.dailyWon||0)+1;
    if(S.streak.last!==k){const y=new Date();y.setDate(y.getDate()-1);const yk=`${y.getFullYear()}-${pad2(y.getMonth()+1)}-${pad2(y.getDate())}`;S.streak.n=S.streak.last===yk?S.streak.n+1:1;S.streak.last=k;}}
  else{const p=S.levels[id];const nh=!G.hinted;if(!p||stars>p.stars)S.levels[id]={stars,best:Math.min(G.moves,p?p.best:99999),nh:nh||(p&&p.nh)?1:0};else{if(G.moves<p.best)p.best=G.moves;if(nh)p.nh=1;}}
  save();
  setTimeout(()=>confetti(stars===3?1.2:stars===2?.8:.5),250);
  setTimeout(()=>{if(!G)return;const t=stars===3?'¡Perfecto!':stars===2?'¡Muy bien!':'¡Resuelto!';$('#winT').textContent=t;
    let info=`Movimientos: <b>${G.moves}</b> · Mejor posible: <b>${G.min}</b>`;if(G.hinted&&stars===2&&G.moves<=G.min)info+='<br>Con pista, el máximo son 2 estrellas';else if(stars<3)info+='<br>Prueba a repetirla para conseguir 3 estrellas';
    $('#winInfo').innerHTML=info;const cb=$('#winCombo');if(combo>=2){cb.hidden=false;cb.innerHTML=`Racha de <b>${combo}</b> pruebas perfectas seguidas`;}else cb.hidden=true;
    const st=$$('#winStars i');st.forEach(i=>i.classList.remove('on'));$('#win').classList.add('on');
    st.forEach((e,i)=>{if(i<stars)setTimeout(()=>{e.classList.add('on');audio.star(i);sparkle(e,8);},350+i*420);});
    const nx=nextAfter();G.next=nx;$('#wNextT').textContent=nx?(G.from==='tlist'?`Siguiente: nivel ${nx.tier+1}`:`Siguiente: ${SHORT[nx.type]}`):(G.daily?'Volver al inicio':G.from==='tlist'?'Volver a los niveles':'Volver a la ruta');
    $('#wRoute').textContent=G.daily?'☰ Inicio':G.from==='tlist'?'☰ Niveles':'☰ Ruta';
    checkMedals();},G.type==='slide'?900:750);}
function nextAfter(){if(G.daily||G.timed)return null;const l=G.lvl;let nx=null;
  if(G.from==='tlist'){nx=typeLv(l.type).find(x=>x.tier===l.tier+1);}else nx=LEVELS.find(x=>x.id===l.id+1);
  return nx&&levelOpen(nx)?nx:null;}
$('#wNext').onclick=()=>{audio.click();$('#win').classList.remove('on');const nx=G.next;if(nx)startLevel(nx,G.from);else{const b=backOf();leaveGame();G=null;show(b);}};
$('#wAgain').onclick=()=>{$('#win').classList.remove('on');startLevel(G.lvl,G.from);};
$('#wRoute').onclick=()=>{$('#win').classList.remove('on');const b=backOf();leaveGame();G=null;show(b);};
/* ───── contrarreloj ───── */
let TM=null;
function openTimedIntro(){$('#tmiRec').innerHTML=S.timed.best?`Tu récord: <b>${S.timed.best}</b> pruebas · Partidas: ${S.timed.runs}`:'¡Todavía no tienes récord!';$('#tmi').classList.add('on');}
$('#tmNo').onclick=()=>$('#tmi').classList.remove('on');
$('#tmGo').onclick=()=>{$('#tmi').classList.remove('on');startTimed();};
$('#trAgain').onclick=()=>{$('#tres').classList.remove('on');startTimed();};
$('#trMenu').onclick=()=>{$('#tres').classList.remove('on');if(G){leaveGame(true);G=null;}show('home');};
function startTimed(){if(TM)stopTimed();TM={left:TIMED.start,solved:0,t:Date.now(),over:false,used:new Set(),bag:[],iv:null};TM.iv=setInterval(tickTimed,200);nextTimed();}
function stopTimed(){if(!TM)return;clearInterval(TM.iv);if(!TM.over&&TM.solved>S.timed.best){S.timed.best=TM.solved;save();}TM.over=true;TM=null;}
function pickTimed(){if(!TM.bag.length)TM.bag=ORDER.slice().sort(()=>Math.random()-.5);const type=TM.bag.pop();const hi=Math.min(Math.floor(TM.solved/2),9),lo=Math.max(0,hi-2);
  let pool=LEVELS.filter(l=>l.type===type&&l.tier>=lo&&l.tier<=hi&&!TM.used.has(l.id));if(!pool.length){TM.used.clear();pool=LEVELS.filter(l=>l.type===type&&l.tier>=lo&&l.tier<=hi);}
  const l=pool[Math.floor(Math.random()*pool.length)];TM.used.add(l.id);return l;}
function nextTimed(){if(!TM||TM.over)return;startLevel(pickTimed(),'timed',{noTut:true});}
function tickTimed(){if(!TM||TM.over)return;const now=Date.now();const dt=(now-TM.t)/1000;TM.t=now;
  if(document.hidden||$('#tut').classList.contains('on')||cur!=='game')return;
  TM.left-=dt;const bar=$('#tbar i');if(bar)bar.style.width=Math.max(0,Math.min(100,TM.left/TIMED.start*100))+'%';$('#tbar').classList.toggle('low',TM.left<20);
  if(G&&G.timed)$('#gStats').innerHTML=`Tiempo <b>${fmt(TM.left)}</b> · Resueltas <b>${TM.solved}</b>`;
  if(TM.left<=0)endTimed();}
function winTimed(stars){TM.solved++;TM.left+=TIMED.bonus;audio.win(stars);if(G.view.celebrate)G.view.celebrate();confetti(.45);toast(`+${TIMED.bonus} s`);updateStats();S.timed.total=(S.timed.total||0)+1;save();checkMedals();
  setTimeout(()=>{if(TM&&!TM.over&&G&&G.timed)nextTimed();},950);}
$('#bSkip').onclick=()=>{if(!G||!G.timed||!TM||G.locked)return;TM.left-=TIMED.skip;toast(`−${TIMED.skip} s`);audio.error();if(TM.left<=0)endTimed();else nextTimed();};
function endTimed(){if(!TM||TM.over)return;clearInterval(TM.iv);TM.over=true;if(G)G.locked=true;endHintUI();const n=TM.solved;const rec=n>S.timed.best;if(rec)S.timed.best=n;S.timed.runs++;save();
  audio.win(n>=5?3:n>=2?2:1);$('#trT').textContent=rec&&n>0?'¡Nuevo récord!':'¡Se acabó el tiempo!';$('#trNum').textContent=n;
  $('#trInfo').innerHTML=(n===1?'prueba resuelta':'pruebas resueltas')+`<br>Récord: <b>${S.timed.best}</b>`;$('#tres').classList.add('on');if(n>0)setTimeout(()=>confetti(rec?1.2:.6),200);checkMedals();}
/* ───── medallas ───── */
(function(){const d=document.createElement('div');d.id='mgdef';d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';d.innerHTML='<svg width="0" height="0"><defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8dc8c"/><stop offset="1" stop-color="#dfa93e"/></linearGradient></defs></svg>';document.body.appendChild(d);})();
const medalIcon=(c)=>`<svg viewBox="0 0 64 64"><path d="M20 4 L32 26 L44 4" fill="none" stroke="var(--accent2)" stroke-width="7" stroke-linejoin="round"/><circle cx="32" cy="40" r="20" fill="url(#mg)" stroke="#c99a2e" stroke-width="3"/><circle cx="32" cy="40" r="14" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="2"/><g transform="translate(32 40)" fill="#fff" color="#fff" class="micon">${c}</g></svg>`;
const STAR_P='<path d="M0 -9 L2.6 -3 L9 -2.4 L4.2 1.8 L5.6 8.2 L0 5 L-5.6 8.2 L-4.2 1.8 L-9 -2.4 L-2.6 -3z"/>';
const MEDALS=[
 {id:'first',n:'Primer paso',d:'Supera tu primera prueba',t:()=>solvedCount()>=1},
 {id:'ten',n:'Calentando motores',d:'Supera 10 pruebas',t:()=>solvedCount()>=10},
 {id:'fifty',n:'Mente en marcha',d:'Supera 50 pruebas',t:()=>solvedCount()>=50},
 {id:'hund',n:'Cerebro de oro',d:'Supera 100 pruebas',t:()=>solvedCount()>=100},
 {id:'all',n:'Maestro de Encaje',d:'Supera las 128 pruebas',t:()=>solvedCount()>=LEVELS.length},
 {id:'s25',n:'Estrellitas',d:'Consigue 25 estrellas',t:()=>totalStars()>=25},
 {id:'s100',n:'Constelación',d:'Consigue 100 estrellas',t:()=>totalStars()>=100},
 {id:'s250',n:'Cielo estrellado',d:'Consigue 250 estrellas',t:()=>totalStars()>=250},
 {id:'p10',n:'Perfeccionista',d:'10 pruebas con 3 estrellas',t:()=>LEVELS.filter(l=>starsOf(l.id)===3).length>=10},
 {id:'p50',n:'Precisión de reloj',d:'50 pruebas con 3 estrellas',t:()=>LEVELS.filter(l=>starsOf(l.id)===3).length>=50},
 {id:'nh',n:'Sin ayuda',d:'Supera 10 pruebas sin usar pistas',t:()=>LEVELS.filter(l=>S.levels[l.id]&&S.levels[l.id].nh).length>=10},
 {id:'fig',n:'Dibujando con luz',d:'Supera una prueba de Interruptores con figura',t:()=>LEVELS.some(l=>l.type==='lights'&&l.def.fig&&starsOf(l.id)>0)},
 {id:'daily',n:'Cita diaria',d:'Supera el reto del día',t:()=>(S.dailyWon||0)>=1||Object.keys(S.daily).length>=1},
 {id:'st3',n:'Constancia',d:'Juega el reto del día 3 días seguidos',t:()=>S.streak.n>=3},
 {id:'st7',n:'Hábito de hierro',d:'Juega el reto del día 7 días seguidos',t:()=>S.streak.n>=7},
 {id:'tm1',n:'Relámpago',d:'Resuelve 5 pruebas en una contrarreloj',t:()=>S.timed.best>=5||(TM&&TM.solved>=5)},
 {id:'tm2',n:'Rayo veloz',d:'Resuelve 10 pruebas en una contrarreloj',t:()=>S.timed.best>=10||(TM&&TM.solved>=10)},
 {id:'cb',n:'En racha',d:'5 pruebas perfectas seguidas',t:()=>combo>=5},
 ...ORDER.map(t=>({id:'t_'+t,n:'Maestro: '+TYPE_INFO[t].name,d:'Supera las 16 pruebas de '+TYPE_INFO[t].name,ty:t,t:()=>typeDone(t)>=PER_TYPE}))];
const medalCount=()=>MEDALS.filter(m=>S.medals[m.id]).length;
let medalQ=[],medalBusy=false;
function checkMedals(){for(const m of MEDALS){if(!S.medals[m.id]&&m.t()){S.medals[m.id]=Date.now();medalQ.push(m);}}if(medalQ.length)save();popMedal();}
function popMedal(){if(medalBusy||!medalQ.length)return;const m=medalQ.shift();medalBusy=true;const el=$('#mpop');el.innerHTML=`<span class="mpi">${medalIcon(m.ty?`<g transform="scale(.9)">${TYPE_ICON_MINI(m.ty)}</g>`:STAR_P)}</span><span class="mpt"><small>¡Nueva medalla!</small><b>${m.n}</b></span>`;el.classList.add('on');audio.star(2);setTimeout(()=>audio.star(4),180);sparkle(el.querySelector('.mpi'),10);
  setTimeout(()=>{el.classList.remove('on');setTimeout(()=>{medalBusy=false;popMedal();},400);},3200);}
function renderMedals(){const g=$('#medalGrid');g.innerHTML='';$('#mCount').textContent=medalCount();$('#mTotal').textContent=MEDALS.length;
  for(const m of MEDALS){const got=!!S.medals[m.id];const c=h('div','medal'+(got?' got':''),g,`<span class="mi">${medalIcon(m.ty?`<g transform="scale(.9)">${TYPE_ICON_MINI(m.ty)}</g>`:STAR_P)}</span><b>${m.n}</b><small>${m.d}</small>`);c.dataset.id=m.id;}}
const TYPE_ICON_MINI=t=>({slide:'<rect x="-10" y="-3" width="13" height="6" rx="3"/><rect x="5" y="-9" width="5" height="12" rx="2.5" opacity=".6"/>',fit:'<path d="M-9 -9h10v6h6v8h-6v6h-10z"/>',trace:'<path d="M-9 -6H9V0H-9V6H9" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',mirrors:'<path d="M-9 8 L9 -8" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',gravity:'<circle cx="-3" cy="-4" r="5"/><rect x="-9" y="7" width="18" height="3" rx="1.5"/>',lights:'<circle cx="-5" cy="-5" r="3.4"/><circle cx="5" cy="-5" r="3.4"/><circle cx="-5" cy="5" r="3.4"/><circle cx="5" cy="5" r="3.4"/>',pipes:'<path d="M-9 -4H0V5H9" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',rings:'<circle r="8" fill="none" stroke="#fff" stroke-width="3"/><circle r="2.6"/>'}[t]);
$('#mBack').onclick=()=>{audio.back();show('home');};
/* ───── cómo se juega ───── */
let tutP=null,tutKeyCur=null,tutAfter=null;
function openTut(key,after){const info=TUTS[key];if(!info)return;closeTut(true);tutKeyCur=key;tutAfter=after;const ty=info.type;
  $('#tutIc').innerHTML=ICONS[ty];$('#tutName').textContent=TYPE_INFO[ty].name+(key==='lightsfig'?' · figura':'');$('#tutGoal').textContent=info.goal;
  $('#tut').classList.add('on');fingerStop();startTutPlayer();}
function startTutPlayer(){if(tutP)tutP.stop();tutP=playTutorial(tutKeyCur,{stage:$('#tutStage'),cap:$('#tutCap'),dots:$('#tutDots'),audio});}
function closeTut(silent){if(tutP){tutP.stop();tutP=null;}$('#tut').classList.remove('on');if(tutKeyCur&&!silent){S.seen[tutKeyCur]=1;save();}tutKeyCur=null;}
$('#tutGo').onclick=()=>{audio.click();const k=tutKeyCur;closeTut(false);};
$('#tutAgain').onclick=()=>{audio.click();startTutPlayer();};
/* ───── ajustes ───── */
function openSettings(){syncSeg();$('#settings').classList.add('on');}
function syncSeg(){$$('#settings .seg').forEach(sg=>{const k=sg.dataset.k;sg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',String(S.set[k])===b.dataset.v));});}
$$('#settings .seg button').forEach(b=>b.onclick=()=>{const k=b.parentNode.dataset.k;let v=b.dataset.v;if(k==='music'||k==='sfx')v=+v;S.set[k]=v;save();
  if(k==='music'){audio.start();audio.setMusic(!!v);$('#coverSnd').classList.toggle('off',!v);}if(k==='sfx'){audio.setSfx(!!v);}if(k==='theme')applyTheme();if(k==='orient'){rotDismissed=false;}syncSeg();checkRot();});
$('#sClose').onclick=()=>$('#settings').classList.remove('on');
$('#bWipe').onclick=()=>{if(confirm('¿Seguro que quieres borrar todo tu progreso?')){S={...clone(DEF),set:S.set};save();refreshHome();toast('Progreso borrado');}};
/* ───── sonidos de botones ───── */
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('button');if(!b||b.disabled)return;if(b.matches('.lt,.mir,.pt,.arrow,.orient'))return;if(b.matches('.iconbtn:not(.corner),.seg button'))return audio.tick();audio.click();},true);
/* ───── arranque ───── */
applyTheme();$('#coverSnd').classList.toggle('off',!S.set.music);audio.setMusic(!!S.set.music);audio.setSfx(!!S.set.sfx);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){addEventListener('load',()=>navigator.serviceWorker.register('sw.js?v=2',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{}));}
/* API para pruebas automáticas */
window.__enc={audio,get G(){return G},get TM(){return TM},LEVELS,MEDALS,startLevel:(id,from)=>startLevel(typeof id==='object'?id:LEVELS.find(l=>l.id===id),from||'route'),startDaily,makeDaily,dailyInfo,state:()=>S,save:()=>save(),setState:s=>{S=s;save();},solveFrom:()=>G&&solveFrom(G.st),show,setCurType:t=>{curType=t;},openTut,closeTut,checkMedals,startTimed,endTimed,combo:()=>combo,setCombo:n=>{combo=n;}};
