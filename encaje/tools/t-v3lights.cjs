// Interruptores v3: TODOS los niveles, solo toques reales, desde estados intermedios aleatorios siguiendo la Pista
const L=require('./t-lib.cjs');const fs=require('fs');
const BASE='http://127.0.0.1:8801/index.html';
const [w,hh]=[+process.argv[2],+process.argv[3]];const REPS=+process.argv[4]||3;
let seed=12345+w;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
(async()=>{const b=await L.launch();const p=await L.newPage(b,w,hh);await p.goto(BASE);await p.waitForTimeout(900);await L.tap(p,w>hh?'#oH':'#oV');await p.waitForTimeout(400);
await p.evaluate(()=>{const S=__enc.state();S.seen={lights:1,lightsfig:1,slide:1,fit:1,trace:1,mirrors:1,gravity:1,pipes:1,rings:1};__enc.setState(S);});
let runs=0,bad=0,hintTaps=0,mism=0;const fail=m=>{bad++;console.log('✗',w+'x'+hh,m);};
const st=()=>p.evaluate(()=>({st:__enc.G.st,locked:__enc.G.locked,hist:__enc.G.hist.length}));
for(let t=0;t<16;t++){const id=t*8+6;
 for(let rep=0;rep<REPS;rep++){
  await p.evaluate(id=>{document.querySelector('#win').classList.remove('on');__enc.startLevel(id);},id);await p.waitForTimeout(550);
  console.log("lvl",id,rep);const info=await p.evaluate(()=>({n:__enc.G.def.n,mode:__enc.G.def.mode,fig:!!__enc.G.def.fig,min:__enc.G.min,st:__enc.G.st,N:__enc.G.def.n**2}));
  if(info.fig||info.mode!=='plus')fail('nivel '+id+' no es plus/todo');
  // 1) la miniatura "Un toque cambia estas" coincide con lo que hace un toque real
  const mini=await p.evaluate(()=>{const g=document.querySelectorAll('.lcol')[1].querySelectorAll('i');return[...g].map(e=>e.classList.contains('on')?1:0);});
  const n=info.n;let k=Math.floor(rnd()*info.N);
  const before=await st();try{await L.tap(p,`.lt[data-i="${k}"]`);}catch(e){console.log(await p.evaluate(()=>({scr:document.querySelector('.screen.on').id,n:document.querySelectorAll('.lt').length,win:document.querySelector('#win').className,G:!!__enc.G})));throw e;}await p.waitForTimeout(200);const after=await st();
  const diff=(before.st^after.st)>>>0;const r0=Math.floor(k/n),c0=k%n;
  for(let j=0;j<info.N;j++){const dr=Math.floor(j/n)-r0,dc=j%n-c0;const expected=(Math.abs(dr)+Math.abs(dc))<=1?1:0;const mi=mini[(dr+1)*3+(dc+1)]; // vecindad en la miniatura 3x3
    const inMini=(Math.abs(dr)<=1&&Math.abs(dc)<=1)?mi:0;if(((diff>>>j)&1)!==expected||inMini!==expected){mism++;fail(`nivel ${id}: toque ${k} casilla ${j} real=${(diff>>>j)&1} esperado=${expected} mini=${inMini}`);break;}}
  if(after.hist!==before.hist+1)fail(`nivel ${id}: un toque registró ${after.hist-before.hist} movimientos (doble toque?)`);
  // 2) toques aleatorios extra → estado intermedio aleatorio
  const extra=Math.floor(rnd()*3);for(let e=0;e<extra;e++){const s=await st();if(s.locked)break;const kk=Math.floor(rnd()*info.N);try{await L.tap(p,`.lt[data-i="${kk}"]`);}catch(er){console.log('DBG',kk,JSON.stringify(info),JSON.stringify(await p.evaluate(()=>({scr:document.querySelector('.screen.on').id,n:document.querySelectorAll('.lt').length,id:__enc.G.lvl.id,def:__enc.G.def}))));throw er;}await p.waitForTimeout(120);}
  // 3) seguir la Pista solo con toques reales
  let guard=0,prevLeft=null;
  while(guard++<40){const s=await st();if(s.locked)break;
    const expSol=await p.evaluate(()=>__enc.solveFrom());if(!expSol||!expSol.length){fail(`nivel ${id}: sin solución desde estado actual`);break;}
    await p.evaluate(()=>document.querySelector('#bHint').click());await p.waitForTimeout(320);
    const h=await p.evaluate(()=>{const e=document.querySelector('.lt.hint');const f=document.querySelector('.finger');const t=document.querySelector('#ghelp').textContent;const will=document.querySelectorAll('.lt.will').length;let fin=null;if(e&&f){const a=e.getBoundingClientRect(),c=f.getBoundingClientRect();fin=[Math.abs((a.x+a.width/2)-(c.x))<a.width*1.2,Math.abs((a.y+a.height/2)-(c.y))<a.height*1.6];}
      return{i:e?+e.dataset.i:-1,txt:t,will,fin,finger:!!f};});
    if(h.i<0){fail(`nivel ${id}: la pista no marca ninguna casilla`);break;}
    if(!h.finger)fail(`nivel ${id}: sin dedo`);if(h.will)fail('quedan casillas azules de "lo que cambia"');
    const left=expSol.length;const m=h.txt.match(/Te quedan (\d+) toques/);const claimed=m?+m[1]:(/último toque/.test(h.txt)?1:-1);
    if(claimed!==left)fail(`nivel ${id}: la pista dice ${claimed}, el solucionador ${left}`);
    if(h.i!==expSol[0][0])fail(`nivel ${id}: pista marca ${h.i}, solución ${expSol[0][0]}`);
    if(prevLeft!==null&&left!==prevLeft-1)fail(`nivel ${id}: tras seguir la pista quedan ${left}, esperado ${prevLeft-1}`);
    await L.tap(p,`.lt[data-i="${h.i}"]`);hintTaps++;await p.waitForTimeout(160);prevLeft=left;}
  const fin=await st();runs++;if(!fin.locked)fail(`nivel ${id}: no se completó`);
  const solved=await p.evaluate(()=>__enc.G.st===(2**(__enc.G.def.n**2)-1));if(!solved)fail(`nivel ${id}: estado final no es todo encendido`);
  if(t===2&&rep===0)await p.screenshot({path:`/workspace/encaje-v3-capturas/dev-fin-${w}x${hh}.png`});
 }}
console.log(`${w}x${hh}: partidas ${runs} (16 niveles x ${REPS}), toques de pista ${hintTaps}, desajustes ${mism}, fallos ${bad}, errores JS`,p.errs);await b.close();process.exit(bad?1:0);})().catch(e=>{console.error(e);process.exit(1)});
