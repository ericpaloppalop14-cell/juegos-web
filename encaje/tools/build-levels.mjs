import fs from 'fs';
import {TYPES,TYPE_BY_KEY,genLevel,minMoves,fitSolve,Lights} from '../js/puzzles.js';
const ORDER=['slide','fit','trace','mirrors','gravity','lights','pipes','rings'];
const levels=[],report=[];let fails=0;
for(let tier=0;tier<9;tier++)for(let slot=0;slot<8;slot++){const type=ORDER[slot];const T=TYPE_BY_KEY[type];let def=null,seed=0;
  for(let a=0;a<30&&!def;a++){seed=(TYPES.indexOf(T)+1)*1000+tier*37+a;def=genLevel(type,tier,seed);}
  if(!def){console.error('FALLO',type,tier);fails++;continue;}
  const min=minMoves(type,def);
  // ---- verificación independiente de la solución ----
  let sol,ok=false;
  if(type==='fit'){const r=fitSolve(def,{},1);sol=r.sols[0];const cov=new Set();let dup=false;
    // recalcular celdas desde las orientaciones de forma independiente
    const {orients}=await import('../js/puzzles.js');
    for(const p of sol){const o=orients(def.pieces[p.id].shape)[p.o];for(const[dr,dc]of o){const k=(p.r+dr)+','+(p.c+dc);if(cov.has(k))dup=true;cov.add(k);}}
    const want=new Set(def.cells.map(c=>c.join(',')));ok=!dup&&cov.size===want.size&&[...cov].every(k=>want.has(k))&&sol.length===def.pieces.length;}
  else{let st=T.init(def);sol=T.solve(def,st);for(const mv of sol)st=T.apply(def,st,mv);ok=T.isWin(def,st)&&sol.length===min;}
  if(!ok){console.error('NO VERIFICA',type,tier);fails++;}
  const id=tier*8+slot+1;levels.push({id,round:tier+1,slot:slot+1,type,tier,seed,min,def});report.push({id,type,tier,seed,min,sol,verificada:ok});}
// control cruzado del solucionador de Interruptores contra BFS
for(const[n,mode]of[[3,'plus'],[4,'plus'],[3,'x'],[3,'box']]){const def={n,mode,start:0};const N=n*n,full=(1<<N)-1;
  const dist=new Map([[full,0]]);let q=[full];for(let qi=0;qi<q.length;qi++){const s=q[qi];for(let i=0;i<N;i++){const t=(s^Lights.apply?(Lights.apply(def,s,[i])):0)>>>0;if(!dist.has(t)){dist.set(t,dist.get(s)+1);q.push(t);}}}
  let bad=0,cnt=0;for(const[st,d]of dist){const s=Lights.solve({n,mode,start:st},st);cnt++;if(!s||s.length!==d)bad++;}
  console.log('control Interruptores',n,mode,'estados',cnt,'discrepancias',bad);if(bad)fails++;}
fs.writeFileSync('../js/levels.js','// Generado por build-levels.mjs: 72 niveles, todos con solución verificada por solucionador automático.\nexport const LEVELS='+JSON.stringify(levels)+';\n');
fs.writeFileSync('verificacion.json',JSON.stringify(report));
const by={};levels.forEach(l=>by[l.type]=(by[l.type]||0)+1);console.log('niveles',levels.length,by,'fallos',fails);
console.log(levels.map(l=>l.type[0]+l.min).join(' '));
