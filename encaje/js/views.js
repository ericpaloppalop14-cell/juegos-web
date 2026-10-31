// Encaje · vistas (DOM) de cada tipo de prueba
import {PALETTE,Slide,Gravity,Lights,Pipes,Rings,Mirrors,Trace,orients,rotCW,flipH,centerCell,fitSolve,traceBeam,pipeFlow,rotMask,lightsEffect} from './puzzles.js';
export const h=(tag,cls,parent,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(parent)parent.appendChild(e);return e;};
const NS='http://www.w3.org/2000/svg';
const sv=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const px=(e,l,t,w,hh)=>{e.style.left=l+'px';e.style.top=t+'px';if(w!=null){e.style.width=w+'px';e.style.height=hh+'px';}};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export const ICONS={
 slide:'<svg viewBox="0 0 48 48"><rect x="5" y="19" width="22" height="10" rx="5" fill="currentColor"/><rect x="31" y="8" width="10" height="22" rx="5" fill="currentColor" opacity=".45"/><rect x="10" y="34" width="20" height="8" rx="4" fill="currentColor" opacity=".3"/><path d="M33 24 H44 M40 20 L44 24 L40 28" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 fit:'<svg viewBox="0 0 48 48"><path d="M6 6h14v10h10v12H20v14H6z" fill="currentColor" opacity=".85"/><path d="M24 6h18v14H32V10H24z" fill="currentColor" opacity=".4"/><path d="M34 24h8v18H24v-8h10z" fill="currentColor" opacity=".6"/></svg>',
 trace:'<svg viewBox="0 0 48 48"><path d="M8 10 H40 V24 H8 V38 H40" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><circle cx="8" cy="10" r="5" fill="currentColor"/><circle cx="40" cy="38" r="5" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
 mirrors:'<svg viewBox="0 0 48 48"><path d="M4 34 H22 L38 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 5" opacity=".6"/><path d="M26 40 L44 22" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M4 34 H26 L26 10" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M36 8 l2 4 4 .6 -3 3 .8 4.2 -3.8 -2 -3.8 2 .8 -4.2 -3 -3 4 -.6z" fill="currentColor" transform="translate(-8 -4) scale(.9)"/></svg>',
 gravity:'<svg viewBox="0 0 48 48"><circle cx="16" cy="14" r="7" fill="currentColor"/><circle cx="32" cy="24" r="6" fill="currentColor" opacity=".5"/><path d="M12 38 H36" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M16 22 V30 M12 26 L16 30 L20 26" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/></svg>',
 lights:'<svg viewBox="0 0 48 48"><g fill="currentColor"><circle cx="12" cy="12" r="6" opacity=".35"/><circle cx="24" cy="12" r="6"/><circle cx="36" cy="12" r="6" opacity=".35"/><circle cx="12" cy="24" r="6"/><circle cx="24" cy="24" r="6"/><circle cx="36" cy="24" r="6"/><circle cx="12" cy="36" r="6" opacity=".35"/><circle cx="24" cy="36" r="6"/><circle cx="36" cy="36" r="6" opacity=".35"/></g></svg>',
 pipes:'<svg viewBox="0 0 48 48"><path d="M4 14 H24 V34 H44" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><circle cx="24" cy="24" r="4" fill="#fff" opacity=".7"/></svg>',
 rings:'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="20 8" opacity=".5"/><circle cx="24" cy="24" r="11" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="12 6"/><circle cx="24" cy="24" r="3" fill="currentColor"/></svg>'};

/* ───── helpers de color ───── */
export const pc=i=>PALETTE[i%PALETTE.length];

/* ═════════ 1 · DESLIZAR ═════════ */
function SlideView(C){const{def,T}=C;const W=def.w,H=def.h;let u=0,board,drag=null,ghost=null,els=[];
  const pad=()=>u*.07;
  const setPos=(e,i,pos)=>{const p=def.pcs[i];const l=(p.d==='h'?pos:p.ln)*u+pad(),t=(p.d==='h'?p.ln:pos)*u+pad();px(e,l,t,(p.d==='h'?p.len:1)*u-2*pad(),(p.d==='h'?1:p.len)*u-2*pad());};
  const V={dims:()=>({cols:W,rows:H}),
    mount(b,uu){u=uu;board=b;board.innerHTML='';board.className='slide';
      for(let r=0;r<H;r++)for(let c=0;c<W;c++)px(h('i','gc',board),c*u,r*u,u,u);
      const ex=h('div','exit',board,'<span>›</span>');px(ex,W*u-1,def.pcs[0].ln*u+pad(),u*.7,u-2*pad());
      els=def.pcs.map((p,i)=>{const e=h('div','sp'+(i?'':' hero'),board,i?'':'<b></b>');e.dataset.i=i;e.style.setProperty('--c',i?pc(i*5+2):'#e8c06a');setPos(e,i,C.getState()[i]);return e;});
      board.onpointerdown=e=>{if(C.locked())return;const el=e.target.closest('.sp');if(!el)return;V.clearHint();const i=+el.dataset.i,st=C.getState();const[lo,hi]=T.range(def,st,i);
        drag={i,el,x0:e.clientX,y0:e.clientY,p0:st[i],lo,hi,pos:st[i],last:st[i]};el.classList.add('drag');try{el.setPointerCapture(e.pointerId);}catch(_){}};
      board.onpointermove=e=>{if(!drag)return;const p=def.pcs[drag.i];const d=(p.d==='h'?e.clientX-drag.x0:e.clientY-drag.y0)/u;drag.pos=clamp(drag.p0+d,drag.lo,drag.hi);setPos(drag.el,drag.i,drag.pos);const cell=Math.round(drag.pos);if(cell!==drag.last){drag.last=cell;C.audio.tick();}};
      const end=()=>{if(!drag)return;const d=drag;drag=null;d.el.classList.remove('drag');const snap=Math.round(d.pos);if(snap!==d.p0)C.dispatch([d.i,snap]);else setPos(d.el,d.i,d.p0);};
      board.onpointerup=end;board.onpointercancel=end;},
    update(st){if(drag)return;els.forEach((e,i)=>setPos(e,i,st[i]));},
    hint(mv){V.clearHint();const[i,q]=mv;els[i].classList.add('hint');ghost=h('div','sp ghostp',board);ghost.style.setProperty('--c','transparent');setPos(ghost,i,q);},
    clearHint(){els.forEach(e=>e.classList.remove('hint'));if(ghost){ghost.remove();ghost=null;}},
    celebrate(){const e=els[0];e.style.transition='left .6s cubic-bezier(.5,0,.9,.6),opacity .6s';e.style.left=(W+1)*u+'px';e.style.opacity='0';},
    destroy(){}};
  return V;}

/* ═════════ 2 · ENCAJE PERFECTO ═════════ */
function FitView(C){const{def}=C;const ors=def.pieces.map(p=>orients(p.shape));const W=def.w,H=def.h;
  const ori=def.pieces.map(()=>0);let sel=-1,u=0,board,drag=null,ghostEl=null,prevEl=null,hintCells=[],extra,tray,hintTimer=0;
  const cellSet=new Set(def.cells.map(c=>c[0]*W+c[1]));
  const J=JSON.stringify;
  const nextRot=(pid,oi)=>{const t=J(rotCW(ors[pid][oi]));return ors[pid].findIndex(o=>J(o)===t);};
  const nextFlip=(pid,oi)=>{const t=J(flipH(ors[pid][oi]));return ors[pid].findIndex(o=>J(o)===t);};
  const occ=(placed,skip=-1)=>{const m=new Map();for(const id in placed){if(+id===skip)continue;const p=placed[id];for(const[dr,dc]of ors[id][p.o])m.set((p.r+dr)*W+p.c+dc,+id);}return m;};
  const fits=(pid,o,r0,c0,placed)=>{const m=occ(placed,pid);for(const[dr,dc]of ors[pid][o]){const r=r0+dr,c=c0+dc;if(r<0||c<0||r>=H||c>=W||!cellSet.has(r*W+c)||m.has(r*W+c))return false;}return true;};
  const anchor=(pid,o,row,col,placed)=>{const ce=centerCell(ors[pid][o]);const base=[row-ce[0],col-ce[1]];if(fits(pid,o,base[0],base[1],placed))return{r:base[0],c:base[1],ok:true};
    let best=null;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;if(fits(pid,o,base[0]+dr,base[1]+dc,placed)){const d=Math.abs(dr)+Math.abs(dc);if(!best||d<best.d)best={d,r:base[0]+dr,c:base[1]+dc};}}
    return best?{r:best.r,c:best.c,ok:true}:{r:base[0],c:base[1],ok:false};};
  const cellAtPoint=(x,y)=>{const rc=board.getBoundingClientRect();return{row:Math.floor((y-rc.top)/u),col:Math.floor((x-rc.left)/u)};};
  const miniShape=(parent,o,size,col,cls)=>{const hh=Math.max(...o.map(c=>c[0]))+1,ww=Math.max(...o.map(c=>c[1]))+1;const box=h('div',cls,parent);box.style.width=ww*size+'px';box.style.height=hh*size+'px';
    for(const[r,c]of o){const k=h('i','pcell',box);px(k,c*size,r*size,size,size);k.style.setProperty('--c',col);}return box;};
  function layoutTray(){const avW=tray.clientWidth||300,avH=tray.clientHeight||150;const rem=def.pieces.filter(p=>!(p.id in C.getState().placed));if(!rem.length)return 20;
    for(let t=Math.min(Math.floor(u*.62),38);t>=13;t--){let x=0,rowH=0,tot=0,ok=true;const gap=10;
      for(const p of rem){const o=ors[p.id][ori[p.id]];const w=(Math.max(...o.map(c=>c[1]))+1)*t,hh=(Math.max(...o.map(c=>c[0]))+1)*t;
        if(x>0&&x+w>avW){tot+=rowH+gap;x=0;rowH=0;}x+=w+gap+8;rowH=Math.max(rowH,hh);}
      tot+=rowH;if(tot<=avH)return t;}
    return 13;}
  function renderTray(){tray.innerHTML='';const st=C.getState();const t=layoutTray();
    for(const p of def.pieces){if(p.id in st.placed)continue;const box=miniShape(tray,ors[p.id][ori[p.id]],t,pc(p.id*5+1),'tp'+(sel===p.id?' sel':''));box.dataset.id=p.id;box.style.padding='0';
      box.onpointerdown=e=>{if(C.locked())return;e.preventDefault();startDrag(e,p.id,'tray');};}
    if(!tray.children.length)tray.innerHTML='<div class="trayDone">¡Todas colocadas!</div>';}
  function renderBoard(){board.querySelectorAll('.fp,.fprev,.fhint').forEach(e=>e.remove());const st=C.getState();
    for(const id in st.placed){const p=st.placed[id];const g=h('div','fp',board);g.dataset.id=id;for(const[dr,dc]of ors[id][p.o]){const k=h('i','pcell',g);px(k,(p.c+dc)*u,(p.r+dr)*u,u,u);k.style.setProperty('--c',pc(id*5+1));}
      g.onpointerdown=e=>{if(C.locked())return;e.preventDefault();const pid=+id;ori[pid]=p.o;const ns=JSON.parse(JSON.stringify(st));delete ns.placed[pid];sel=pid;C.commit(ns,{kind:'lift'});startDrag(e,pid,'board');};}}
  function refresh(){renderBoard();renderTray();}
  function showPrev(pid,o,r0,c0,ok){clearPrev();prevEl=h('div','fprev '+(ok?'ok':'bad'),board);for(const[dr,dc]of ors[pid][o]){const k=h('i','pcell',prevEl);px(k,(c0+dc)*u,(r0+dr)*u,u,u);k.style.setProperty('--c',ok?pc(pid*5+1):'#e58f8f');}}
  function clearPrev(){if(prevEl){prevEl.remove();prevEl=null;}}
  function mkGhost(pid){const o=ors[pid][ori[pid]];ghostEl=h('div','fghost',document.body);const box=miniShape(ghostEl,o,u,pc(pid*5+1),'gbox');return box;}
  function startDrag(e,pid,from){V.clearHint();sel=pid;drag={pid,from,x0:e.clientX,y0:e.clientY,moved:false,lift:u*1.15};C.audio.tick();
    const mv=ev=>{const d=drag;if(!d)return;if(!d.moved&&Math.hypot(ev.clientX-d.x0,ev.clientY-d.y0)>8){d.moved=true;d.gb=mkGhost(pid);}
      if(d.moved){const o=ors[pid][ori[pid]];const ce=centerCell(o);d.gb.style.transform=`translate(${ev.clientX-(ce[1]+.5)*u}px,${ev.clientY-d.lift-(ce[0]+.5)*u}px)`;
        const{row,col}=cellAtPoint(ev.clientX,ev.clientY-d.lift);const a=anchor(pid,ori[pid],row,col,C.getState().placed);d.t=a;if(row>=-1&&row<=H&&col>=-1&&col<=W)showPrev(pid,ori[pid],a.r,a.c,a.ok);else clearPrev();}};
    const up=ev=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);const d=drag;drag=null;clearPrev();if(d.gb){d.gb.parentNode.remove();}
      if(d.moved){const{row,col}=cellAtPoint(ev.clientX,ev.clientY-d.lift);const a=anchor(pid,ori[pid],row,col,C.getState().placed);
        if(a.ok&&row>=-1&&row<=H&&col>=-1&&col<=W)place(pid,a.r,a.c);else{C.audio.error();refresh();}}
      else{ // toque
        if(d.from==='tray'){if(d.wasSel){rotate();}else refresh();}else refresh();}};
    drag.wasSel=false;
    // si ya estaba seleccionada, un toque la gira
    drag.wasSel=C._fitPrevSel===pid&&from==='tray';C._fitPrevSel=pid;
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);refresh();}
  function place(pid,r,c){const ns=JSON.parse(JSON.stringify(C.getState()));ns.placed[pid]={o:ori[pid],r,c};sel=-1;C._fitPrevSel=-1;C.commit(ns,{kind:'place',n:Object.keys(ns.placed).length});}
  function rotate(){if(sel<0){C.toast('Primero toca una pieza de abajo');C.audio.error();return;}ori[sel]=nextRot(sel,ori[sel]);C.audio.tick();refresh();}
  function flip(){if(sel<0){C.toast('Primero toca una pieza de abajo');C.audio.error();return;}ori[sel]=nextFlip(sel,ori[sel]);C.audio.tick();refresh();}
  const V={dims:()=>({cols:W,rows:H}),
    mount(b,uu){u=uu;board=b;board.innerHTML='';board.className='fit';for(const[r,c]of def.cells){const k=h('i','fc',board);px(k,c*u,r*u,u,u);k.dataset.r=r;k.dataset.c=c;}
      board.onpointerdown=e=>{if(C.locked()||e.target.closest('.fp'))return;if(sel<0)return;const{row,col}=cellAtPoint(e.clientX,e.clientY);const a=anchor(sel,ori[sel],row,col,C.getState().placed);if(a.ok)place(sel,a.r,a.c);else{C.audio.error();C.toast('Ahí no cabe: gírala o cambia de sitio');}};
      this.mountExtra();refresh();},
    mountExtra(){extra=C.extra;extra.innerHTML='';extra.classList.toggle('many',def.pieces.length>=6);const wrap=h('div','fitWrap',extra);tray=h('div','tray',wrap);
      const bt=h('div','fitBtns',wrap);const b1=h('button','tool',bt,'<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.4-5.3M19 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Girar</span>');b1.id='bRot';
      const b2=h('button','tool',bt,'<svg viewBox="0 0 24 24"><path d="M12 3v18M8 7 3 12l5 5zM16 7l5 5-5 5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Voltear</span>');b2.id='bFlip';
      b1.onclick=rotate;b2.onclick=flip;},
    update(){drag=null;if(sel>=0&&(sel in C.getState().placed))sel=-1;refresh();},
    hint(sol){V.clearHint();sel=sol.id;ori[sol.id]=sol.o;C._fitPrevSel=sol.id;refresh();
      const g=h('div','fhint',board);for(const[dr,dc]of ors[sol.id][sol.o]){const k=h('i','pcell',g);px(k,(sol.c+dc)*u,(sol.r+dr)*u,u,u);k.style.setProperty('--c',pc(sol.id*5+1));}
      clearTimeout(hintTimer);hintTimer=setTimeout(()=>V.clearHint(),6000);},
    clearHint(){clearTimeout(hintTimer);board&&board.querySelectorAll('.fhint').forEach(e=>e.remove());},
    reset(){sel=-1;C._fitPrevSel=-1;ori.fill(0);},
    celebrate(){board.classList.add('done');},
    // API de pruebas
    api:{orient:id=>ori[id],orientations:id=>ors[id].map(o=>o),select:id=>{sel=id;C._fitPrevSel=id;refresh();},nextRot,nextFlip,sel:()=>sel,centerOf:(id,o)=>centerCell(ors[id][o]),setOri:(id,o)=>{ori[id]=o;refresh();}},
    destroy(){V.clearHint();clearPrev();}};
  return V;}

/* ═════════ 3 · UN SOLO TRAZO ═════════ */
function TraceView(C){const{def,T}=C;const W=def.w,H=def.h;let u=0,board,svg,line,head,cellEls=[],hintEl=null,down=false;
  const cellAt=(x,y)=>{const rc=board.getBoundingClientRect();const c=Math.floor((x-rc.left)/u),r=Math.floor((y-rc.top)/u);if(r<0||c<0||r>=H||c>=W)return -1;return r*W+c;};
  const pos=i=>[(i%W+.5)*u,(Math.floor(i/W)+.5)*u];
  function handle(i){if(i<0||C.locked())return;const st=C.getState();const hd=st[st.length-1];if(i===hd||def.blocked.includes(i))return;
    const k=st.indexOf(i);
    if(k>=0){if(k===st.length-2)C.dispatch([-1]);else C.commit(st.slice(0,k+1),{kind:'retract'});return;}
    const legal=T.moves(def,st).some(m=>m[0]===i);if(legal)C.dispatch([i]);else if(Math.abs((hd%W)-(i%W))+Math.abs(Math.floor(hd/W)-Math.floor(i/W))===1){/* vecina pero no permitida */if(i===def.goal){C.toast('La meta es lo último: pasa antes por todas');}}}
  const V={dims:()=>({cols:W,rows:H}),
    mount(b,uu){u=uu;board=b;board.innerHTML='';board.className='trace';cellEls=[];
      for(let i=0;i<W*H;i++){const r=Math.floor(i/W),c=i%W;const k=h('i',def.blocked.includes(i)?'tb':'tc',board);px(k,c*u,r*u,u,u);cellEls.push(k);
        if(i===def.goal){k.classList.add('goal');k.innerHTML='<s></s>';}if(i===def.start)k.classList.add('start');}
      svg=sv('svg',{width:W*u,height:H*u,class:'tpath'},board);line=sv('polyline',{fill:'none','stroke-linecap':'round','stroke-linejoin':'round','stroke-width':u*.34},svg);
      head=h('div','thead',board);head.style.width=head.style.height=u*.62+'px';
      board.onpointerdown=e=>{down=true;V.clearHint();try{board.setPointerCapture(e.pointerId);}catch(_){}handle(cellAt(e.clientX,e.clientY));};
      board.onpointermove=e=>{if(down)handle(cellAt(e.clientX,e.clientY));};
      board.onpointerup=board.onpointercancel=()=>{down=false;};
      V.update(C.getState());},
    update(st){line.setAttribute('points',st.map(i=>pos(i).join(',')).join(' '));const hp=pos(st[st.length-1]);head.style.transform=`translate(${hp[0]-u*.31}px,${hp[1]-u*.31}px)`;
      cellEls.forEach((k,i)=>{k.classList.toggle('vis',st.includes(i));});},
    hint(mv){V.clearHint();hintEl=cellEls[mv[0]];hintEl.classList.add('hint');},
    clearHint(){if(hintEl){hintEl.classList.remove('hint');hintEl=null;}},
    celebrate(){board.classList.add('done');},destroy(){}};
  return V;}

/* ═════════ 4 · ESPEJOS DE LUZ ═════════ */
function MirrorsView(C){const{def,T}=C;const n=def.n;let u=0,board,svg,beam,mirEls=[],starEls=[],ang=[],lit=new Set(),hintEl=null;
  const cp=(r,c)=>[clamp((c+.5)*u,0,n*u),clamp((r+.5)*u,0,n*u)];
  function draw(st,anim){const b=traceBeam(def,st);beam.setAttribute('points',b.pts.map(p=>cp(p[0],p[1]).join(',')).join(' '));
    if(anim){const L=beam.getTotalLength?beam.getTotalLength():0;beam.style.transition='none';beam.style.strokeDasharray=L;beam.style.strokeDashoffset=L;beam.getBoundingClientRect();beam.style.transition='stroke-dashoffset .42s ease-out';beam.style.strokeDashoffset=0;setTimeout(()=>{beam.style.strokeDasharray='none';},460);}
    const s=new Set(b.cells);let nl=0;starEls.forEach((e,i)=>{const on=s.has(def.targets[i]);e.classList.toggle('lit',on);if(on&&!lit.has(def.targets[i])){nl++;}});
    if(anim&&nl)setTimeout(()=>C.audio.hit(lit.size),200);lit=new Set(def.targets.filter(t=>s.has(t)));}
  const V={dims:()=>({cols:n,rows:n}),
    mount(b,uu){u=uu;board=b;board.innerHTML='';board.className='mirrors';mirEls=[];starEls=[];lit=new Set();
      for(let r=0;r<n;r++)for(let c=0;c<n;c++){const k=h('i','gc',board);px(k,c*u,r*u,u,u);}
      for(const w of def.walls){const e=h('i','wall',board);px(e,(w%n)*u+u*.08,Math.floor(w/n)*u+u*.08,u*.84,u*.84);}
      svg=sv('svg',{width:n*u,height:n*u,class:'beamsvg'},board);beam=sv('polyline',{class:'beam',fill:'none','stroke-linecap':'round','stroke-linejoin':'round','stroke-width':Math.max(4,u*.1)},svg);
      const sc=h('div','emit',board,'<b></b>');px(sc,def.src.c*u+u*.1,def.src.r*u+u*.1,u*.8,u*.8);
      def.targets.forEach(t=>{const e=h('div','star',board,'<svg viewBox="0 0 40 40"><path d="M20 4l4.6 10.2 11 1.2-8.2 7.6 2.3 10.9L20 28l-9.7 5.9 2.3-10.9-8.2-7.6 11-1.2z"/></svg>');px(e,(t%n)*u+u*.12,Math.floor(t/n)*u+u*.12,u*.76,u*.76);starEls.push(e);});
      const st=C.getState();ang=def.mirrors.map((m,i)=>st[i]*90);
      def.mirrors.forEach((m,i)=>{const e=h('button','mir'+(m.fixed?' fixed':''),board,'<svg viewBox="0 0 100 100"><line x1="18" y1="82" x2="82" y2="18" class="mb"/><line x1="18" y1="82" x2="82" y2="18" class="mh"/></svg>'+(m.fixed?'':'<em></em>'));
        px(e,m.c*u+u*.04,m.r*u+u*.04,u*.92,u*.92);e.style.transform=`rotate(${ang[i]}deg)`;e.dataset.i=i;
        if(!m.fixed)e.onclick=()=>{if(C.locked())return;V.clearHint();C.dispatch([i]);};mirEls.push(e);});
      draw(st,true);},
    update(st,info){const want=st.map(v=>v);def.mirrors.forEach((m,i)=>{if(((ang[i]/90)&1)!==want[i]){ang[i]+=90;mirEls[i].style.transform=`rotate(${ang[i]}deg)`;}});draw(st,true);},
    hint(mv){V.clearHint();hintEl=mirEls[mv[0]];hintEl.classList.add('hint');},
    clearHint(){if(hintEl){hintEl.classList.remove('hint');hintEl=null;}},
    celebrate(){board.classList.add('done');},destroy(){}};
  return V;}

/* ═════════ 5 · GRAVEDAD ═════════ */
function GravityView(C){const{def,T}=C;const W=def.w,Hh=def.h;let u=0,board,balls=[],holes=[],btns={},hintBtn=null,sw=null;
  const place=(e,idx,scale=1)=>{const r=Math.floor(idx/W),c=idx%W;e.style.transform=`translate(${c*u+u*.14}px,${r*u+u*.14}px) scale(${scale})`;};
  const DIRN=['right','down','left','up'];
  function tilt(d){board.style.transform=['perspective(700px) rotateY(5deg)','perspective(700px) rotateX(-5deg)','perspective(700px) rotateY(-5deg)','perspective(700px) rotateX(5deg)'][d];setTimeout(()=>{board.style.transform='';},320);}
  const V={dims:()=>({cols:W,rows:Hh}),
    mount(b,uu){u=uu;board=b;board.innerHTML='';board.className='gravity';balls=[];holes=[];
      for(let r=0;r<Hh;r++)for(let c=0;c<W;c++)px(h('i','gc',board),c*u,r*u,u,u);
      for(const w of def.walls){const e=h('i','wall',board);px(e,(w%W)*u+u*.06,Math.floor(w/W)*u+u*.06,u*.88,u*.88);}
      def.holes.forEach((x,i)=>{const e=h('div','hole',board,'<b></b>');e.style.setProperty('--c',pc(i*3+1));px(e,x.c*u+u*.1,x.r*u+u*.1,u*.8,u*.8);holes.push(e);});
      const st=C.getState();
      def.balls.forEach((x,i)=>{const e=h('div','ball',board,'<b></b>');e.style.setProperty('--c',pc(i*3+1));e.style.width=e.style.height=u*.72+'px';place(e,st[i]);balls.push(e);});
      // controles
      const ex=C.extra;ex.innerHTML='';const pad=h('div','dpad',ex);
      const mk=(d,txt,cls)=>{const bt=h('button','arrow '+cls,pad,txt);bt.dataset.d=d;bt.setAttribute('aria-label','Inclinar '+['derecha','abajo','izquierda','arriba'][d]);bt.onclick=()=>{if(C.locked())return;V.clearHint();V.tiltTo(d);};btns[d]=bt;};
      mk(3,'▲','up');mk(2,'◀','left');mk(0,'▶','right');mk(1,'▼','down');
      board.onpointerdown=e=>{sw={x:e.clientX,y:e.clientY};};
      board.onpointerup=e=>{if(!sw)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;sw=null;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;if(C.locked())return;V.clearHint();V.tiltTo(Math.abs(dx)>Math.abs(dy)?(dx>0?0:2):(dy>0?1:3));};
      board.onpointercancel=()=>{sw=null;};
      window.onkeydown=e=>{const m={ArrowRight:0,ArrowDown:1,ArrowLeft:2,ArrowUp:3}[e.key];if(m!=null&&C.type==='gravity'&&!C.locked()){V.tiltTo(m);}};},
    tiltTo(d){const st=C.getState();const ns=T.apply(def,st,[d]);if(same(ns,st)){C.audio.error();board.classList.remove('shake');board.getBoundingClientRect();board.classList.add('shake');return;}tilt(d);C.audio.whoosh();C.dispatch([d]);},
    update(st,info){const prev=V._prev||C.getState();
      balls.forEach((e,i)=>{const hole=def.holes[i];
        if(st[i]<0){const idx=hole.r*W+hole.c;const dist=V._prevPos&&V._prevPos[i]>=0?Math.abs(Math.floor(V._prevPos[i]/W)-hole.r)+Math.abs(V._prevPos[i]%W-hole.c):1;e.style.transition=`transform ${.12*dist+.2}s cubic-bezier(.4,0,.7,1),opacity .25s ${.12*dist+.1}s`;place(e,idx,.25);e.style.opacity='0';holes[i].classList.add('full');
          if(info&&info.kind==='move')setTimeout(()=>C.audio.drop(),120*dist+80);}
        else{const pp=V._prevPos?V._prevPos[i]:st[i];const dist=pp>=0?Math.abs(Math.floor(pp/W)-Math.floor(st[i]/W))+Math.abs(pp%W-st[i]%W):1;e.style.transition=`transform ${.1*dist+.18}s cubic-bezier(.45,0,.75,1),opacity .2s`;e.style.opacity='1';place(e,st[i],1);holes[i].classList.remove('full');
          if(info&&info.kind==='move'&&pp!==st[i])setTimeout(()=>C.audio.thud(),(.1*dist+.18)*1000-30);}});
      V._prevPos=st.slice();},
    hint(mv){V.clearHint();hintBtn=btns[mv[0]];hintBtn.classList.add('hint');},
    clearHint(){if(hintBtn){hintBtn.classList.remove('hint');hintBtn=null;}},
    celebrate(){board.classList.add('done');},destroy(){window.onkeydown=null;}};
  V._prevPos=C.getState().slice();
  return V;}

/* ═════════ 6 · INTERRUPTORES ═════════ */
function LightsView(C){const{def}=C;const n=def.n;let u=0,board,cells=[],hintEl=null;
  const V={dims:()=>({cols:n,rows:n}),
    mount(b,uu){u=uu;board=b;board.innerHTML='';board.className='lights';cells=[];const st=C.getState();
      for(let i=0;i<n*n;i++){const e=h('button','lt',board,'<b></b>');px(e,(i%n)*u+u*.05,Math.floor(i/n)*u+u*.05,u*.9,u*.9);e.dataset.i=i;e.setAttribute('aria-label','Interruptor');e.onclick=()=>{if(C.locked())return;V.clearHint();C.dispatch([i]);};cells.push(e);}
      const ex=C.extra;ex.innerHTML='<div class="lhint"><span>Cada toque cambia:</span><div class="lmini"></div></div>';const mini=ex.querySelector('.lmini');
      const cen=n>=3?4:0;const eff=lightsEffect({n:3,mode:def.mode},4);for(let i=0;i<9;i++)h('i',(eff>>>i)&1?'on':'',mini);
      V.update(st,{kind:'init'});},
    update(st,info){cells.forEach((e,i)=>{const on=(st>>>i)&1;const was=e.classList.contains('on');e.classList.toggle('on',!!on);});
      if(info&&info.mv){const i=info.mv[0];const eff=lightsEffect(def,i);cells.forEach((e,j)=>{if((eff>>>j)&1){e.classList.remove('pop');e.getBoundingClientRect();e.classList.add('pop');}});}},
    hint(mv){V.clearHint();hintEl=cells[mv[0]];hintEl.classList.add('hint');},
    clearHint(){if(hintEl){hintEl.classList.remove('hint');hintEl=null;}},
    celebrate(){board.classList.add('done');},destroy(){}};
  return V;}

/* ═════════ 7 · TUBERÍAS ═════════ */
function PipesView(C){const{def}=C;const W=def.w,H=def.h;let u=0,board,tiles=[],ang=[],hintEl=null,wetPrev=new Set();
  const armPath=m=>{const a=[];if(m&1)a.push('M50 50V-2');if(m&2)a.push('M50 50H102');if(m&4)a.push('M50 50V102');if(m&8)a.push('M50 50H-2');return a.join('');};
  const V={dims:()=>({cols:W,rows:H}),
    mount(b,uu){u=uu;board=b;board.innerHTML='';board.className='pipes';tiles=[];const st=C.getState();ang=st.map(r=>r*90);
      def.tiles.forEach((t,i)=>{const cell=h('button','pt',board);px(cell,(i%W)*u+u*.04,Math.floor(i/W)*u+u*.04,u*.92,u*.92);cell.dataset.i=i;cell.setAttribute('aria-label','Girar tubería');
        const deg=[1,2,4,8].filter(b=>t.m&b).length;
        cell.innerHTML=`<svg viewBox="0 0 100 100" class="pipesvg"><path class="pp" d="${armPath(t.m)}"/>${i===def.src?'<circle class="srcc" cx="50" cy="50" r="24"/><path class="drop" d="M50 36 C44 46 42 50 42 54 a8 8 0 0 0 16 0 C58 50 56 46 50 36z"/>':deg===1?'<circle class="lamp" cx="50" cy="50" r="19"/>':'<circle class="hub" cx="50" cy="50" r="13"/>'}</svg>`;
        cell.querySelector('svg').style.transform=`rotate(${ang[i]}deg)`;
        if(i===def.src)cell.classList.add('source');
        cell.onclick=()=>{if(C.locked())return;V.clearHint();C.dispatch([i]);};tiles.push(cell);});
      V.update(st,{kind:'init'});},
    update(st,info){const flow=pipeFlow(def,st);
      tiles.forEach((cell,i)=>{const want=st[i];if((((ang[i]/90)%4)+4)%4!==want){const diff=((want-(((ang[i]/90)%4)+4)%4)+4)%4;ang[i]+=diff===3?-90:diff*90;cell.querySelector('svg').style.transform=`rotate(${ang[i]}deg)`;}
        cell.classList.toggle('wet',!!flow[i]);});
      const now=new Set();flow.forEach((v,i)=>v&&now.add(i));if(info&&info.kind==='move'&&now.size>wetPrev.size)setTimeout(()=>C.audio.hit(now.size%8),180);wetPrev=now;},
    hint(mv){V.clearHint();hintEl=tiles[mv[0]];hintEl.classList.add('hint');},
    clearHint(){if(hintEl){hintEl.classList.remove('hint');hintEl=null;}},
    celebrate(){board.classList.add('done');},destroy(){}};
  return V;}

/* ═════════ 8 · ANILLOS ═════════ */
function RingsView(C){const{def,T}=C;const n=def.n,k=def.k;let u=0,board,svg,groups=[],cum=[],selR=0,hintEl=null,drag=null,btnL,btnR,linkEls=[];
  const R0=47,Rin=13,thick=(R0-Rin)/k;
  const arc=(ro,ri,a0,a1)=>{const p=(r,a)=>[50+r*Math.cos(a),50+r*Math.sin(a)];const A=p(ro,a0),B=p(ro,a1),Cc=p(ri,a1),D=p(ri,a0);const f=v=>v.toFixed(2);
    return`M${f(A[0])} ${f(A[1])}A${ro} ${ro} 0 0 1 ${f(B[0])} ${f(B[1])}L${f(Cc[0])} ${f(Cc[1])}A${ri} ${ri} 0 0 0 ${f(D[0])} ${f(D[1])}Z`;};
  const RC=['#e58f8f','#6fb5a8','#e8c06a','#9a92d2','#78a8d8'];const colorOf=ci=>RC[ci%5];
  const ringAt=(x,y)=>{const rc=board.getBoundingClientRect();const dx=(x-rc.left)/rc.width*100-50,dy=(y-rc.top)/rc.height*100-50;const rad=Math.hypot(dx,dy);if(rad>R0+1||rad<Rin-2)return -1;return clamp(Math.floor((R0-rad)/thick),0,k-1);};
  const angOf=(x,y)=>{const rc=board.getBoundingClientRect();return Math.atan2((y-rc.top)/rc.height*100-50,(x-rc.left)/rc.width*100-50)*180/Math.PI;};
  function select(i){selR=i;groups.forEach((g,j)=>{g.classList.toggle('sel',j===i);const lk=def.links.some(l=>(l[0]===i&&l[1]===j)||(l[1]===i&&l[0]===j));g.classList.toggle('linked',lk);});}
  const V={dims:()=>({cols:6,rows:6}),
    mount(b,uu){u=uu;board=b;board.innerHTML='';board.className='rings';groups=[];const st=C.getState();cum=st.map(o=>-o*360/n);
      svg=sv('svg',{viewBox:'0 0 100 100',class:'ringsvg'},board);
      sv('circle',{cx:50,cy:50,r:49,class:'rbase'},svg);
      for(let i=0;i<k;i++){const ro=R0-i*thick,ri=ro-thick+1.4;const g=sv('g',{class:'ring'},svg);g.style.transformOrigin='50px 50px';g.style.transformBox='view-box';g.style.transform=`rotate(${cum[i]}deg)`;
        for(let j=0;j<n;j++){const a0=(j*360/n-90)*Math.PI/180+.018,a1=((j+1)*360/n-90)*Math.PI/180-.018;sv('path',{d:arc(ro,ri,a0,a1),fill:colorOf(def.pat[j]),class:'sec'},g);}
        sv('circle',{cx:50,cy:50,r:ro-.3,class:'rline',fill:'none'},g);groups.push(g);}
      sv('circle',{cx:50,cy:50,r:Rin-2.5,class:'rhub'},svg);
      // marcador superior
      sv('path',{d:'M50 0.6 L53 4.6 L47 4.6Z',class:'rmark'},svg);
      def.links.forEach(l=>{const ri=Math.min(l[0],l[1])+1;const r=R0-ri*thick+.2;const e=sv('g',{class:'rlink'},svg);sv('circle',{cx:50,cy:50-r,r:2.1},e);sv('circle',{cx:50,cy:50-r,r:.9,class:'in'},e);linkEls.push(e);});
      board.onpointerdown=e=>{if(C.locked())return;V.clearHint();const i=ringAt(e.clientX,e.clientY);if(i<0)return;select(i);C.audio.tick();drag={i,a0:angOf(e.clientX,e.clientY),d:0,base:cum[i]};groups[i].style.transition='none';try{board.setPointerCapture(e.pointerId);}catch(_){}};
      board.onpointermove=e=>{if(!drag)return;let d=angOf(e.clientX,e.clientY)-drag.a0;while(d>180)d-=360;while(d<-180)d+=360;drag.d=d;groups[drag.i].style.transform=`rotate(${drag.base+d}deg)`;};
      const end=()=>{if(!drag)return;const dr=drag;drag=null;groups[dr.i].style.transition='';const steps=Math.round(dr.d/(360/n));groups[dr.i].style.transform=`rotate(${dr.base}deg)`;
        for(let s=0;s<Math.abs(steps);s++)C.dispatch([dr.i,steps>0?-1:1]);};
      board.onpointerup=end;board.onpointercancel=end;
      const ex=C.extra;ex.innerHTML='<div class="rbtns"></div><div class="rnote"></div>';const rb=ex.querySelector('.rbtns');
      btnL=h('button','arrow rl',rb,'◀ <small>Izquierda</small>');btnR=h('button','arrow rr',rb,'<small>Derecha</small> ▶');btnL.id='bRingL';btnR.id='bRingR';
      btnL.onclick=()=>{if(!C.locked()){V.clearHint();C.dispatch([selR,1]);}};btnR.onclick=()=>{if(!C.locked()){V.clearHint();C.dispatch([selR,-1]);}};
      ex.querySelector('.rnote').innerHTML=(def.links.length?'Los anillos con <b>●●</b> giran a la vez, en sentido contrario. ':'')+'Toca un anillo y gíralo con los botones.';
      select(0);V.update(st);},
    update(st){if(drag)return;st.forEach((o,i)=>{const target=-o*360/n;let diff=target-cum[i];diff=((diff%360)+540)%360-180;if(Math.abs(diff)>0.01){cum[i]+=diff;groups[i].style.transform=`rotate(${cum[i]}deg)`;}});},
    selected:()=>selR,select,
    hint(mv){V.clearHint();select(mv[0]);hintEl=mv[1]>0?btnL:btnR;hintEl.classList.add('hint');groups[mv[0]].classList.add('hintring');},
    clearHint(){if(hintEl){hintEl.classList.remove('hint');hintEl=null;}groups.forEach(g=>g.classList.remove('hintring'));},
    celebrate(){board.classList.add('done');},destroy(){}};
  return V;}

export function makeView(type,C){return{slide:SlideView,fit:FitView,trace:TraceView,mirrors:MirrorsView,gravity:GravityView,lights:LightsView,pipes:PipesView,rings:RingsView}[type](C);}
