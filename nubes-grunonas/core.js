/* Terminal de Nubes Gruñonas — lógica pura + solucionador (navegador y Node) */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NGCore=api;})(typeof self!=='undefined'?self:this,function(){
'use strict';
const DX=[0,1,0,-1],DY=[-1,0,1,0]; // 0 arriba,1 derecha,2 abajo,3 izquierda
const SEATS=3; // asientos por celda de nube

// Precalcula todo lo necesario de un nivel. L={cols,rows,clouds:[{x,y,w,h,d,c,hid,lock}],blockers:[{x,y,n}],queue:[colores]}
function prep(L){
  const cols=L.cols,rows=L.rows,n=L.clouds.length;
  const occ=new Array(cols*rows).fill(-1),blk=new Array(cols*rows).fill(-1);
  L.clouds.forEach((c,i)=>{for(let yy=c.y;yy<c.y+c.h;yy++)for(let xx=c.x;xx<c.x+c.w;xx++)occ[yy*cols+xx]=i;});
  (L.blockers||[]).forEach((b,j)=>{blk[b.y*cols+b.x]=j;});
  const P={L,cols,rows,n,occ,blk,sweep:[],need:[],blockCnt:[],lockN:[],stuck:[],cap:[],color:[],queue:L.queue};
  L.clouds.forEach((c,i)=>{
    const cells=[];
    if(c.d===0)for(let yy=c.y-1;yy>=0;yy--)for(let xx=c.x;xx<c.x+c.w;xx++)cells.push([xx,yy]);
    else if(c.d===2)for(let yy=c.y+c.h;yy<rows;yy++)for(let xx=c.x;xx<c.x+c.w;xx++)cells.push([xx,yy]);
    else if(c.d===1)for(let xx=c.x+c.w;xx<cols;xx++)for(let yy=c.y;yy<c.y+c.h;yy++)cells.push([xx,yy]);
    else for(let xx=c.x-1;xx>=0;xx--)for(let yy=c.y;yy<c.y+c.h;yy++)cells.push([xx,yy]);
    let need=0,bc=0,st=false;
    for(const [xx,yy] of cells){
      const o=occ[yy*cols+xx];if(o>=0)need|=(1<<o);
      const b=blk[yy*cols+xx];if(b>=0){const bn=L.blockers[b].n;if(bn===0)st=true;else bc=Math.max(bc,bn);}
    }
    P.sweep.push(cells);P.need.push(need);P.blockCnt.push(bc);P.lockN.push(c.lock||0);P.stuck.push(st);
    P.cap.push(c.w*c.h*SEATS);P.color.push(c.c);
  });
  return P;
}
function init(P,K){return{rm:0,nrm:0,qi:0,slots:[],K:K,peak:0};}
function clone(s){return{rm:s.rm,nrm:s.nrm,qi:s.qi,slots:s.slots.map(x=>({id:x.id,left:x.left})),K:s.K,peak:s.peak};}
// ¿camino despejado (sin contar candado ni huecos)? Sirve también para revelar nubes ocultas.
function pathClear(P,s,i){
  if((s.rm>>i)&1)return false;
  if(P.stuck[i])return false;
  if((s.rm&P.need[i])!==P.need[i])return false;
  return s.nrm>=P.blockCnt[i];
}
function unlocked(P,s,i){return s.nrm>=P.lockN[i];}
function movable(P,s,i){return pathClear(P,s,i)&&unlocked(P,s,i)&&s.slots.length<s.K;}
function resolve(P,s,ev){
  while(s.qi<P.queue.length){
    const col=P.queue[s.qi];let k=-1;
    for(let q=0;q<s.slots.length;q++){if(P.color[s.slots[q].id]===col&&s.slots[q].left>0){k=q;break;}}
    if(k<0)break;
    const sl=s.slots[k];sl.left--;s.qi++;
    if(ev)ev.push({t:'board',id:sl.id,left:sl.left,col:col});
    if(sl.left===0){s.slots.splice(k,1);if(ev)ev.push({t:'depart',id:sl.id});}
  }
}
function send(P,s,i,ev){
  s.rm|=(1<<i);s.nrm++;s.slots.push({id:i,left:P.cap[i]});
  if(ev)ev.push({t:'land',id:i});
  resolve(P,s,ev);
  if(s.slots.length>s.peak)s.peak=s.slots.length;
}
function moves(P,s){const r=[];for(let i=0;i<P.n;i++)if(movable(P,s,i))r.push(i);return r;}
function won(P,s){return s.qi>=P.queue.length;}
function lost(P,s){return !won(P,s)&&moves(P,s).length===0;}

// Solucionador DFS con memoria de estados muertos. Devuelve {sol:[ids]} | {sol:null} | {budget:true}
function solve(P,s0,budget){
  budget=budget||300000;
  const q=P.queue,len=q.length,nc=8;
  const nxt=[];for(let c=0;c<nc;c++){const a=new Int32Array(len+1);a[len]=1e9;for(let j=len-1;j>=0;j--)a[j]=q[j]===c?j:a[j+1];nxt.push(a);}
  const dead=new Set();let nodes=0;const path=[];
  function key(s){let k=s.rm+'|'+s.qi+'|';for(const x of s.slots)k+=x.id+'.'+x.left+',';return k;}
  function dfs(s){
    if(s.qi>=len)return true;
    const k=key(s);if(dead.has(k))return false;
    if(++nodes>budget)throw 'budget';
    const mv=[];
    for(let i=0;i<P.n;i++)if(movable(P,s,i))mv.push(i);
    mv.sort((a,b)=>nxt[P.color[a]][s.qi]-nxt[P.color[b]][s.qi]);
    for(const i of mv){
      const t=clone(s);send(P,t,i,null);
      path.push(i);
      if(dfs(t))return true;
      path.pop();
    }
    dead.add(k);return false;
  }
  try{return dfs(clone(s0))?{sol:path.slice(),nodes}:{sol:null,nodes};}catch(e){if(e==='budget')return{budget:true,nodes};throw e;}
}
// Hueco mínimo con el que el nivel se puede ganar. 0 si no se resolvió en el presupuesto.
function minSlots(P,maxK,budget){
  for(let K=1;K<=maxK;K++){
    const r=solve(P,init(P,K),budget);
    if(r.budget)return -1;
    if(r.sol)return K;
  }
  return 0;
}
return{DX,DY,SEATS,prep,init,clone,pathClear,unlocked,movable,resolve,send,moves,won,lost,solve,minSlots};
});
