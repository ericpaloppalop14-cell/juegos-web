import {LEVELS} from './js/levels.js';import {TYPE_BY_KEY,Lights} from './js/puzzles.js';
let seed=777;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const res={};
for(const l of LEVELS){const T=TYPE_BY_KEY[l.type];if(l.type==='fit')continue;
  for(let rep=0;rep<4;rep++){let st=T.init(l.def);const k=Math.floor(rnd()*6);
    for(let i=0;i<k;i++){const mv=T.moves(l.def,st);if(!mv||!mv.length)break;const m=mv[Math.floor(rnd()*mv.length)];st=T.apply(l.def,st,m);}
    const r=res[l.type]||(res[l.type]={runs:0,dead:0,bad:0,already:0});r.runs++;
    if(T.isWin(l.def,st)){r.already++;continue;}
    let sol=T.solve(l.def,st);if(!sol||!sol.length){r.dead++;continue;}
    let guard=0,left=sol.length,ok=true;
    while(!T.isWin(l.def,st)&&guard++<200){sol=T.solve(l.def,st);if(!sol||!sol.length){ok=false;break;}st=T.apply(l.def,st,sol[0]);
      const nx=T.isWin(l.def,st)?0:(T.solve(l.def,st)||[]).length;if(l.type!=='trace'&&nx>sol.length)ok=false;}
    if(!ok||!T.isWin(l.def,st))r.bad++;}}
console.log(res);
