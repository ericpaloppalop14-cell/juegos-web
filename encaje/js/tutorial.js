// Encaje · tutoriales animados: cada tipo se explica con un mini-juego que se juega solo, con un dedo y frases muy simples.
import {makeView,sizeBoard,h} from './views.js';
import {TYPE_BY_KEY,Lights,lightsEffect,fullMask,figureMask} from './puzzles.js';
import {fingerOn,fingerStop,fingerAt,fingerGlide,fingerTap,fingerDown} from './fx.js';

export const TUTS={
  slide:{type:'slide',n:5,goal:'Saca la ficha dorada por la salida ›'},
  fit:{type:'fit',n:5,goal:'Rellena toda la silueta gris con las piezas'},
  trace:{type:'trace',n:4,goal:'Dibuja un camino por TODAS las casillas'},
  mirrors:{type:'mirrors',n:3,goal:'Haz que el rayo de luz llegue a las estrellas'},
  gravity:{type:'gravity',n:4,goal:'Mete cada bola en su hueco del mismo color'},
  lights:{type:'lights',n:5,goal:'Pon TODAS las casillas en amarillo'},
  lightsfig:{type:'lights',n:5,goal:'Deja en amarillo SOLO la figura que te piden'},
  pipes:{type:'pipes',n:4,goal:'Conecta todas las tuberías con la fuente'},
  rings:{type:'rings',n:4,goal:'Alinea los colores de los anillos en rayos'}};

const EXTRA_H={lights:104,lightsfig:118,rings:70};
export function playTutorial(key,{stage,cap,dots,audio}){
  const tok={dead:false,timers:[]};
  const wait=ms=>new Promise(r=>{if(tok.dead)return;tok.timers.push(setTimeout(r,ms));});
  const info=TUTS[key];
  const mkDots=()=>{dots.innerHTML='';for(let i=0;i<info.n;i++)h('i','',dots);};
  const say=(t,k)=>{cap.innerHTML='<span>'+t+'</span>';cap.classList.remove('pulse');void cap.offsetWidth;cap.classList.add('pulse');[...dots.children].forEach((d,i)=>d.classList.toggle('on',i<=k));};
  const xy=el=>{if(el.rel){const r=el.rel.getBoundingClientRect();return{x:r.left+el.x,y:r.top+el.y};}const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};};
  const glide=async(el,ms=650)=>{const p=xy(el);if(!fingerOn())fingerAt(p.x+34,p.y+80);await fingerGlide(p.x,p.y,ms);};
  const tap=async(el,after=420)=>{if(tok.dead)return;await glide(el);if(tok.dead)return;fingerTap();await wait(180);return wait(after);};
  const drag=async(a,b,ms=950)=>{if(tok.dead)return;await glide(a);if(tok.dead)return;fingerDown(true);await wait(120);const p=xy(b);await fingerGlide(p.x,p.y,ms);fingerDown(false);};
  // monta un mini-tablero real
  function mount(type,def,k){const T=TYPE_BY_KEY[type];let st=T.init(def);stage.innerHTML='';const wrap=h('div','dwrap',stage);const board=h('div','',wrap);const extra=h('div','dextra',wrap);
    let view;const C={get def(){return def},T,type,audio,toast(){},extra,getState:()=>st,locked:()=>true,dispatch(mv){const ns=T.apply(def,st,mv);st=ns;view.update(st,{kind:'move',mv});return true;},commit(ns,info){st=ns;view.update(st,info);}};
    view=makeView(type,C);const d=view.dims();const W=stage.clientWidth-8,Hh=stage.clientHeight-8-(EXTRA_H[k]||0);
    const u=sizeBoard(view,board,W,Hh,type,{min:18,max:type==='rings'?64:60});view.mount(board,u);if(type==='gravity')extra.style.display='none';
    return{view,board,extra,C,get st(){return st;},u};}
  const demos={
    async lights(){const def={n:3,mode:'plus',start:0};let s=fullMask(3);s=Lights.apply(def,s,[0]);s=Lights.apply(def,s,[8]);def.start=s;const m=mount('lights',def,'lights');const cell=i=>m.board.children[i];
      say('Mira: hay casillas <b>grises</b> (apagadas). Hay que ponerlas <b>todas en amarillo</b>.',0);await wait(2600);
      say('<b>1.</b> Toca una casilla gris…',1);const e0=lightsEffect(def,0);for(let j=0;j<9;j++)if((e0>>>j)&1)cell(j).classList.add('will');await wait(700);await tap(cell(0),300);
      for(let j=0;j<9;j++)cell(j).classList.remove('will');m.C.dispatch([0]);say('…y <b>ella y sus vecinas</b> cambian: las grises se encienden.',2);await wait(2200);
      say('<b>2.</b> Toca la otra casilla gris',3);const e8=lightsEffect(def,8);for(let j=0;j<9;j++)if((e8>>>j)&1)cell(j).classList.add('will');await wait(500);await tap(cell(8),300);
      for(let j=0;j<9;j++)cell(j).classList.remove('will');m.C.dispatch([8]);m.view.celebrate();audio.ok(6);say('¡Todo amarillo! <b>Prueba superada</b>.',4);await wait(2400);},
    async lightsfig(){const def={n:3,mode:'plus',fig:'cruz',start:0};const tg=figureMask(3,'cruz');let s=tg;s=Lights.apply(def,s,[1]);s=Lights.apply(def,s,[7]);def.start=s;const m=mount('lights',def,'lightsfig');const cell=i=>m.board.children[i];
      say('Aquí te piden una <b>figura</b>. Fíjate en el dibujo <b>«Objetivo»</b> de abajo.',0);await wait(2800);
      say('Los <b>anillos punteados</b> son las casillas que faltan. Las <b>rojas</b> sobran.',1);await wait(3000);
      say('<b>Toca esta</b> casilla…',2);await tap(cell(1),300);m.C.dispatch([1]);await wait(900);
      say('…y <b>esta otra</b>.',3);await tap(cell(7),300);m.C.dispatch([7]);m.view.celebrate();audio.ok(6);await wait(500);
      say('¡Quedó <b>igual que la figura</b>! Prueba superada.',4);await wait(2400);},
    async slide(){const def={w:6,h:4,pcs:[{d:'h',ln:2,p0:0,len:2},{d:'v',ln:3,p0:1,len:2},{d:'h',ln:3,p0:1,len:2},{d:'v',ln:5,p0:0,len:2}]};const m=mount('slide',def,'slide');const el=i=>m.board.querySelector('.sp[data-i="'+i+'"]');
      say('Quieres sacar la <b>ficha dorada</b> por la salida de la derecha ›',0);await wait(2400);
      say('Pero hay una pieza que le <b>tapa el paso</b>.',1);el(1).classList.add('hint');await wait(2200);el(1).classList.remove('hint');
      say('<b>Arrastra</b> esa pieza hacia arriba para quitarla.',2);const r=el(1).getBoundingClientRect();await drag(el(1),{x:r.left+r.width/2,y:r.top+r.height/2-m.u,getBoundingClientRect(){return{left:this.x,top:this.y,width:0,height:0};}});m.C.dispatch([1,0]);await wait(800);
      say('Ahora <b>arrastra la ficha dorada</b> hasta la salida.',3);const r2=el(0).getBoundingClientRect();await drag(el(0),{x:r2.left+r2.width/2+m.u*4,y:r2.top+r2.height/2,getBoundingClientRect(){return{left:this.x,top:this.y,width:0,height:0};}},1100);m.C.dispatch([0,4]);m.view.celebrate();audio.ok(6);
      say('¡Sale! <b>Prueba superada</b>.',4);await wait(2600);},
    async fit(){stage.innerHTML='';const wrap=h('div','dwrap fitdemo',stage);const W=stage.clientWidth-8,Hh=stage.clientHeight-8;const u=Math.max(20,Math.min(58,Math.floor(Math.min(W/4.6,Hh/4.4))));
      const box=h('div','dfbox',wrap);box.style.width=(5*u)+'px';box.style.height=(2*u+1.2*u+2*u)+'px';box.style.setProperty('--u',u+'px');
      const sil=h('div','dsil',box);sil.style.cssText=`left:${u}px;top:0;width:${3*u}px;height:${2*u}px`;for(let r=0;r<2;r++)for(let c=0;c<3;c++){const k=h('i','fc',sil);k.style.cssText=`left:${c*u}px;top:${r*u}px;width:${u}px;height:${u}px`;}
      const mk=(cells,col,x,y)=>{const g=h('div','dp',box);g.style.cssText=`left:${x}px;top:${y}px;width:${2*u}px;height:${2*u}px`;for(const[r,c]of cells){const k=h('i','pcell',g);k.style.cssText=`left:${c*u}px;top:${r*u}px;width:${u}px;height:${u}px;--c:${col}`;}return g;};
      const ty=3.2*u;const A=mk([[0,0],[0,1],[1,0]],'#e58f8f',0.2*u,ty);const B=mk([[0,0],[1,0],[1,1]],'#6fb5a8',2.8*u,ty);
      const move=(g,x,y)=>{g.style.left=x+'px';g.style.top=y+'px';};
      say('Hay que <b>rellenar toda la silueta gris</b> con las piezas de colores.',0);await wait(2600);
      say('<b>Arrastra</b> una pieza hasta la silueta.',1);{const sr=sil.getBoundingClientRect();
        if(tok.dead)return;await glide(A.children[0]);fingerDown(true);await wait(100);fingerGlide(sr.left+u*.5,sr.top+u*.5,900);A.style.transition='left .9s ease-in-out,top .9s ease-in-out';move(A,u,0);await wait(950);fingerDown(false);audio.ok(2);A.style.transition='';}
      await wait(500);
      say('Si no cabe, <b>toca la pieza</b> para <b>girarla</b> (o usa «Girar»).',2);await tap(B.children[0],200);fingerTap();B.style.transition='transform .6s cubic-bezier(.3,1.3,.5,1)';B.style.transform='rotate(-90deg)';audio.tick&&audio.tick();await wait(1800);
      say('Ahora <b>arrástrala</b> al hueco que queda.',3);{await glide(B.children[1]);fingerDown(true);await wait(100);const sr=sil.getBoundingClientRect();fingerGlide(sr.left+2.5*u,sr.top+1.5*u,900);B.style.transition='left .9s ease-in-out,top .9s ease-in-out,transform .6s';move(B,2*u,0);await wait(950);fingerDown(false);audio.ok(4);}
      box.classList.add('done');say('¡Todo relleno! <b>Prueba superada</b>.',4);await wait(2600);},
    async trace(){const def={w:3,h:3,blocked:[],start:0,goal:8};const m=mount('trace',def,'trace');const cell=i=>m.board.children[i];
      say('Hay que dibujar <b>un solo camino</b> que pase por <b>todas</b> las casillas.',0);await wait(2600);
      say('Pon el dedo en la <b>bolita</b> y arrástralo, <b>sin repetir</b> casillas.',1);if(tok.dead)return;await glide(cell(0));fingerDown(true);await wait(200);
      const path=[1,2,5,4,3,6,7,8];for(const i of path){if(tok.dead)return;await glide(cell(i),330);m.C.dispatch([i]);audio.ok&&audio.ok(m.st.length);}
      fingerDown(false);say('Termina en la <b>meta</b> ◎ y…',2);await wait(900);m.view.celebrate();say('¡Pasaste por todas! <b>Prueba superada</b>.',3);await wait(2600);},
    async mirrors(){const def={n:5,src:{r:2,c:0,d:0},walls:[],mirrors:[{r:2,c:3,o0:1,fixed:false}],targets:[3]};const m=mount('mirrors',def,'mirrors');
      say('Del <b>círculo dorado</b> sale un rayo de luz. Debe llegar a la <b>estrella</b> ★',0);await wait(3000);
      say('Hoy el rayo se va por otro lado. <b>Toca el espejo</b> para girarlo.',1);await tap(m.board.querySelector('.mir'),250);m.C.dispatch([0]);
      await wait(900);say('¡El rayo cambia de camino y la estrella se <b>ilumina</b>!',2);m.view.celebrate();audio.ok(6);await wait(2800);
      say('Cuando <b>todas las estrellas brillan</b>, ya está.',3);await wait(2000);},
    async gravity(){const def={w:4,h:4,walls:[],balls:[{r:0,c:0,col:0}],holes:[{r:3,c:3,col:0}]};const m=mount('gravity',def,'gravity');const br=m.board.getBoundingClientRect();
      const pt=(fx,fy)=>({x:fx*m.board.offsetWidth,y:fy*m.board.offsetHeight,rel:m.board});
      say('La bola tiene que caer en el <b>hueco de su color</b>.',0);await wait(2400);
      say('<b>Desliza el dedo</b> hacia la derecha: la bola corre hasta el borde.',1);await glide(pt(.25,.5));fingerDown(true);await wait(100);fingerGlide(...(()=>{const p=xy(pt(.75,.5));return[p.x,p.y,700];})());await wait(520);m.view.tiltTo(0);await wait(150);fingerDown(false);await wait(1200);
      say('Ahora desliza <b>hacia abajo</b>: ¡cae en el hueco!',2);await glide(pt(.5,.25));fingerDown(true);await wait(100);fingerGlide(...(()=>{const p=xy(pt(.5,.75));return[p.x,p.y,700];})());await wait(520);m.view.tiltTo(1);await wait(150);fingerDown(false);await wait(900);
      m.view.celebrate();audio.ok(6);say('¡Dentro! <b>Prueba superada</b>. (Con varias bolas, todas se mueven a la vez.)',3);await wait(3000);},
    async pipes(){const def={w:2,h:2,src:0,tiles:[{m:6},{m:12},{m:1},{m:1}]};const m=mount('pipes',def,'pipes');const t=i=>m.board.children[i];
      say('La <b>gota</b> es la fuente de agua. Hay que <b>conectar todas</b> las tuberías.',0);await wait(2700);
      say('<b>Toca una pieza</b> para girarla.',1);await tap(t(2),250);m.C.dispatch([2]);audio.ok(2);await wait(1000);
      say('Las piezas <b>mojadas</b> (azules) ya tienen agua. Gira la que falta.',2);await tap(t(3),250);m.C.dispatch([3]);m.view.celebrate();audio.ok(6);await wait(1000);
      say('¡Todo conectado! <b>Prueba superada</b>.',3);await wait(2600);},
    async rings(){const def={n:6,k:3,pat:[0,1,2,0,1,2],links:[],off0:[0,1,0]};const m=mount('rings',def,'rings');
      say('Cada anillo tiene colores. Hay que <b>alinearlos en rayos</b> del mismo color.',0);await wait(2800);
      const bb=m.board.getBoundingClientRect();const rad=.30*bb.width;
      say('<b>Toca un anillo</b> para elegirlo…',1);await tap({x:bb.width/2,y:bb.height/2-rad,rel:m.board},200);m.view.select(1);await wait(500);
      say('…y <b>gíralo</b> con los botones.',2);const bR=m.extra.querySelector('#bRingR');await tap(bR,200);m.C.dispatch([1,-1]);await wait(1100);
      m.view.celebrate();audio.ok(6);say('¡Rayos del mismo color! <b>Prueba superada</b>.',3);await wait(2600);}
  };
  (async()=>{mkDots();await wait(500);while(!tok.dead){try{await demos[key]();}catch(e){console.warn('tutorial',e);}if(tok.dead)break;fingerStop();await wait(900);}})();
  return{stop(){tok.dead=true;tok.timers.forEach(clearTimeout);fingerStop();stage.innerHTML='';}};
}
