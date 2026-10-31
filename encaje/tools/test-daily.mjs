import {genLevel,minMoves,TYPE_BY_KEY} from '../js/puzzles.js';
const order=['gravity','mirrors','fit','lights','trace','pipes','rings','slide'];
let worst=0,bad=0,sum=0,n=0;const byType={};
for(let k=0;k<400;k++){const d=new Date(Date.UTC(2026,9,31)+k*864e5);const y=d.getUTCFullYear(),m=d.getUTCMonth(),day=d.getUTCDate();
  const dn=Math.floor(Date.UTC(y,m,day)/864e5);const type=order[((dn%8)+8)%8];const tier=type==='slide'?2:3+(dn%4);const seed=y*10000+(m+1)*100+day;
  const t0=Date.now();let def=null;for(let a=0;a<40&&!def;a++)def=genLevel(type,tier,seed*7+a);if(!def)def=genLevel(type,2,seed+99);
  const dt=Date.now()-t0;const min=def?minMoves(type,def):null;const T=TYPE_BY_KEY[type];
  let ok=false;if(def&&min){if(type==='fit')ok=T.solve(def,T.init(def))!==null;else{let st=T.init(def);const s=T.solve(def,st);if(s){for(const mv of s)st=T.apply(def,st,mv);ok=T.isWin(def,st);}}}
  if(!ok)bad++;worst=Math.max(worst,dt);sum+=dt;n++;(byType[type]=byType[type]||[]).push(dt);}
console.log('días',n,'fallos',bad,'peor ms',worst,'media ms',(sum/n).toFixed(1));
for(const t in byType)console.log(t,'max',Math.max(...byType[t]),'ms');
