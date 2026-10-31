// Encaje · lógica de los 8 tipos de prueba (generadores + solucionadores). Sin DOM: se usa en el navegador y en Node.
export function RNG(seed){let a=seed>>>0;const f=()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296};
  return{f,int:n=>Math.floor(f()*n),pick:a=>a[Math.floor(f()*a.length)],chance:p=>f()<p,shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(f()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}}}
export const PALETTE=['#e58f8f','#6fb5a8','#e8c06a','#9a92d2','#78a8d8','#93c590','#d996b8','#dca070','#8fb8c9','#c5a3d9','#b7c97a','#e6a07f'];

function bfs(T,def,st0,cap=250000){
  if(T.isWin(def,st0))return[];
  const seen=new Map();const k0=T.hash(st0);seen.set(k0,null);const q=[[st0,k0]];let qi=0;
  while(qi<q.length){const[s,k]=q[qi++];
    for(const mv of T.moves(def,s)){const n=T.apply(def,s,mv);const kn=T.hash(n);if(seen.has(kn))continue;seen.set(kn,[k,mv]);
      if(T.isWin(def,n)){const path=[mv];let cur=seen.get(k);while(cur){path.push(cur[1]);cur=seen.get(cur[0]);}return path.reverse();}
      q.push([n,kn]);if(seen.size>cap)return null;}}
  return null;}

/* ───────── 1 · DESLIZAR AL HUECO (estilo Rush Hour) ───────── */
const SL_LO=[2,4,6,8,10,12,14,16,18];
function slOcc(def,pos,skip=-1){const g=new Int8Array(def.w*def.h).fill(-1);
  def.pcs.forEach((p,i)=>{if(i===skip)return;for(let k=0;k<p.len;k++){const r=p.d==='h'?p.ln:pos[i]+k,c=p.d==='h'?pos[i]+k:p.ln;g[r*def.w+c]=i;}});return g;}
export const Slide={key:'slide',
  init:def=>def.pcs.map(p=>p.p0),
  range(def,st,i){const g=slOcc(def,st,i),p=def.pcs[i],lim=p.d==='h'?def.w:def.h;let lo=st[i],hi=st[i];
    const free=x=>{const r=p.d==='h'?p.ln:x,c=p.d==='h'?x:p.ln;return g[r*def.w+c]<0};
    while(lo>0&&free(lo-1))lo--;while(hi+p.len<lim&&free(hi+p.len))hi++;return[lo,hi];},
  moves(def,st){const out=[];for(let i=0;i<def.pcs.length;i++){const[lo,hi]=this.range(def,st,i);for(let q=lo;q<=hi;q++)if(q!==st[i])out.push([i,q]);}return out;},
  apply(def,st,mv){const n=st.slice();n[mv[0]]=mv[1];return n;},
  isWin:(def,st)=>st[0]+def.pcs[0].len===def.w,
  hash:st=>st.join(','),
  solve(def,st){return bfs(this,def,st);},
  gen(tier,R){const W=6,H=6,lo=SL_LO[tier],hi=lo+3,n=5+Math.floor(tier*0.8);
    const hr=1+R.int(4);const pcs=[{d:'h',ln:hr,p0:R.int(3),len:2}];
    const tryAdd=()=>{for(let t=0;t<40;t++){const d=R.chance(.5)?'h':'v',len=R.chance(.7)?2:3,ln=R.int(6),p0=R.int(7-len);const np={d,ln,p0,len};
      if(d==='h'&&ln===hr&&p0<pcs[0].p0+2)continue; // no pegada a la ficha
      const test=pcs.concat([np]);const pos=test.map(p=>p.p0);const g=new Int8Array(36).fill(-1);let ok=true;
      test.forEach((p,i)=>{for(let k=0;k<p.len;k++){const r=p.d==='h'?p.ln:p.p0+k,c=p.d==='h'?p.p0+k:p.ln;if(g[r*6+c]>=0)ok=false;g[r*6+c]=i;}});
      if(ok){pcs.push(np);return true;}}return false;};
    while(pcs.length<n&&tryAdd());
    const score=m=>m<0?-1:(m>=lo&&m<=hi?1000:m<lo?m:1000-(m-hi));
    const minOf=ps=>{const def={w:W,h:H,pcs:ps};const s=this.solve(def,this.init(def));return s?s.length:-1};
    let cur=pcs,m=minOf(cur);
    for(let it=0;it<500&&!(m>=lo&&m<=hi);it++){
      const c2=cur.map(p=>({...p}));const i=1+R.int(c2.length-1);const old=c2[i];
      const d=R.chance(.5)?'h':'v',len=R.chance(.7)?2:3,ln=R.int(6),p0=R.int(7-len);c2[i]={d,ln,p0,len};
      const g=new Int8Array(36).fill(-1);let ok=true;
      c2.forEach((p,j)=>{for(let k=0;k<p.len;k++){const r=p.d==='h'?p.ln:p.p0+k,c=p.d==='h'?p.p0+k:p.ln;if(g[r*6+c]>=0)ok=false;g[r*6+c]=j;}});
      if(!ok||(d==='h'&&ln===hr&&p0<c2[0].p0+2))continue;
      const m2=minOf(c2);if(score(m2)>=score(m)){cur=c2;m=m2;}}
    if(!(m>=lo-1))return null;
    return{w:W,h:H,pcs:cur};}};

/* ───────── 2 · ENCAJE PERFECTO (tangram / pentominós) ───────── */
export const SHAPES={I3:[[0,0],[0,1],[0,2]],L3:[[0,0],[1,0],[1,1]],I4:[[0,0],[0,1],[0,2],[0,3]],O4:[[0,0],[0,1],[1,0],[1,1]],T4:[[0,0],[0,1],[0,2],[1,1]],S4:[[0,1],[0,2],[1,0],[1,1]],L4:[[0,0],[1,0],[2,0],[2,1]],
  F:[[0,1],[0,2],[1,0],[1,1],[2,1]],I5:[[0,0],[0,1],[0,2],[0,3],[0,4]],L5:[[0,0],[1,0],[2,0],[3,0],[3,1]],N:[[0,1],[1,1],[2,0],[2,1],[3,0]],P:[[0,0],[0,1],[1,0],[1,1],[2,0]],
  T:[[0,0],[0,1],[0,2],[1,1],[2,1]],U:[[0,0],[0,2],[1,0],[1,1],[1,2]],V:[[0,0],[1,0],[2,0],[2,1],[2,2]],W:[[0,0],[1,0],[1,1],[2,1],[2,2]],X:[[0,1],[1,0],[1,1],[1,2],[2,1]],Y:[[0,1],[1,0],[1,1],[2,1],[3,1]],Z:[[0,0],[0,1],[1,1],[2,1],[2,2]]};
const norm=cs=>{const mr=Math.min(...cs.map(c=>c[0])),mc=Math.min(...cs.map(c=>c[1]));return cs.map(([r,c])=>[r-mr,c-mc]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);};
export const rotCW=cs=>norm(cs.map(([r,c])=>[c,-r]));
export const flipH=cs=>norm(cs.map(([r,c])=>[r,-c]));
const skey=cs=>cs.map(c=>c.join(':')).join(';');
export function orients(shape){const out=[],seen=new Set();let s=norm(shape);for(let f=0;f<2;f++){for(let r=0;r<4;r++){const k=skey(s);if(!seen.has(k)){seen.add(k);out.push(s);}s=rotCW(s);}s=flipH(s);}return out;}
export function centerCell(o){const mr=o.reduce((a,c)=>a+c[0],0)/o.length,mc=o.reduce((a,c)=>a+c[1],0)/o.length;let bi=0,bd=1e9;o.forEach((c,i)=>{const d=(c[0]-mr)**2+(c[1]-mc)**2;if(d<bd){bd=d;bi=i;}});return o[bi];}
const ORC=new Map();const orOf=shape=>{const k=skey(norm(shape));let v=ORC.get(k);if(!v){v=orients(shape);ORC.set(k,v);}return v;};
export function fitSolve(def,placed,cap=1,maxNodes=300000){
  const W=def.w,H=def.h;const g=new Uint8Array(W*H).fill(2);for(const[r,c]of def.cells)g[r*W+c]=0;
  for(const id in placed){const p=placed[id];const o=orOf(def.pieces.find(x=>x.id==id).shape)[p.o];for(const[dr,dc]of o){const r=p.r+dr,c=p.c+dc;if(r<0||c<0||r>=H||c>=W||g[r*W+c]!==0)return{count:0,sols:[]};g[r*W+c]=1;}}
  const rem=def.pieces.filter(p=>!(p.id in placed));const used=new Array(rem.length).fill(false);const sols=[];let nodes=0;const cur=[];
  const rec=()=>{if(sols.length>=cap||nodes++>maxNodes)return;let e=-1;for(let i=0;i<g.length;i++)if(g[i]===0){e=i;break;}
    if(e<0){sols.push(cur.slice());return;}
    const er=Math.floor(e/W),ec=e%W;
    for(let pi=0;pi<rem.length;pi++){if(used[pi])continue;const os=orOf(rem[pi].shape);
      for(let oi=0;oi<os.length;oi++){const o=os[oi];const r0=er-o[0][0],c0=ec-o[0][1];let ok=true;
        for(const[dr,dc]of o){const r=r0+dr,c=c0+dc;if(r<0||c<0||r>=H||c>=W||g[r*W+c]!==0){ok=false;break;}}
        if(!ok)continue;for(const[dr,dc]of o)g[(r0+dr)*W+c0+dc]=1;used[pi]=true;cur.push({id:rem[pi].id,o:oi,r:r0,c:c0});
        rec();cur.pop();used[pi]=false;for(const[dr,dc]of o)g[(r0+dr)*W+c0+dc]=0;if(sols.length>=cap)return;}}};
  rec();return{count:sols.length,sols};}
const FIT_N=[3,3,4,4,5,5,6,7,8];
export const Fit={key:'fit',
  init:()=>({placed:{}}),isWin:(def,st)=>Object.keys(st.placed).length===def.pieces.length,hash:st=>JSON.stringify(st.placed),
  gen(tier,R){const n=FIT_N[tier];
    const small=['I3','L3','O4','T4','L4','S4','I4'],pent=['F','L5','N','P','T','U','V','W','X','Y','Z','I5'];
    let names;
    if(tier===0)names=R.shuffle(small).slice(0,3);else if(tier===1)names=R.shuffle(['L3','O4','T4','L4','S4','I4']).slice(0,3).concat(R.shuffle(pent).slice(0,0));
    else if(tier===2)names=R.shuffle(pent).slice(0,3).concat(R.shuffle(small).slice(0,1));
    else if(tier===3)names=R.shuffle(pent).slice(0,3).concat(R.shuffle(small).slice(0,1));
    else names=R.shuffle(pent).slice(0,Math.min(n,12));
    if(tier>=4&&tier<=5)names=names.slice(0,n-0);
    while(names.length<n)names.push(R.pick(pent.filter(x=>!names.includes(x))));
    names=names.slice(0,n);
    const G=12;let best=null;
    for(let att=0;att<25;att++){
      const grid=new Int8Array(G*G).fill(-1);const placedCells=[];
      const o0=R.pick(orOf(SHAPES[names[0]]));for(const[dr,dc]of o0){grid[(4+dr)*G+4+dc]=0;placedCells.push([4+dr,4+dc]);}
      let ok=true;
      for(let k=1;k<names.length&&ok;k++){const cands=[];
        for(const o of orOf(SHAPES[names[k]]))for(let r0=0;r0<G-4;r0++)for(let c0=0;c0<G-4;c0++){let fine=true,touch=false;
          for(const[dr,dc]of o){const r=r0+dr,c=c0+dc;if(grid[r*G+c]>=0){fine=false;break;}
            if((r>0&&grid[(r-1)*G+c]>=0)||(r<G-1&&grid[(r+1)*G+c]>=0)||(c>0&&grid[r*G+c-1]>=0)||(c<G-1&&grid[r*G+c+1]>=0))touch=true;}
          if(!fine||!touch)continue;
          let mnr=99,mxr=-1,mnc=99,mxc=-1;for(const[r,c]of placedCells.concat(o.map(([a,b])=>[r0+a,c0+b]))){mnr=Math.min(mnr,r);mxr=Math.max(mxr,r);mnc=Math.min(mnc,c);mxc=Math.max(mxc,c);}
          const hh=mxr-mnr+1,ww=mxc-mnc+1;if(hh>8||ww>8)continue;cands.push({o,r0,c0,area:hh*ww+Math.abs(hh-ww)*.5+R.f()*2.5});}
        if(!cands.length){ok=false;break;}
        cands.sort((a,b)=>a.area-b.area);const c=cands[Math.min(R.int(3),cands.length-1)];
        for(const[dr,dc]of c.o){grid[(c.r0+dr)*G+c.c0+dc]=k;placedCells.push([c.r0+dr,c.c0+dc]);}}
      if(!ok)continue;
      const mnr=Math.min(...placedCells.map(c=>c[0])),mnc=Math.min(...placedCells.map(c=>c[1])),mxr=Math.max(...placedCells.map(c=>c[0])),mxc=Math.max(...placedCells.map(c=>c[1]));
      const def={w:mxc-mnc+1,h:mxr-mnr+1,cells:placedCells.map(([r,c])=>[r-mnr,c-mnc]),pieces:names.map((nm,i)=>({id:i,name:nm,shape:SHAPES[nm]}))};
      const sc=fitSolve(def,{},60).count;if(sc<1)continue;
      const score=tier<2?-sc*0.1:sc;
      if(!best||score<best.score){best={def,score};}
      if(tier>=3&&sc<=2)break;if(tier<3&&att>3)break;}
    return best?best.def:null;},
  solve(def,st){const r=fitSolve(def,(st&&st.placed)||{},1);return r.sols[0]||null;}};

/* ───────── 3 · UN SOLO TRAZO (camino que cubre todas las casillas) ───────── */
const TR_SIZE=[[3,3,0],[3,4,0],[4,4,0],[4,4,2],[4,5,2],[5,5,0],[5,5,3],[5,6,3],[6,6,4]];
function trNb(def,i){const{w,h}=def;const r=Math.floor(i/w),c=i%w,o=[];if(r>0)o.push(i-w);if(c<w-1)o.push(i+1);if(r<h-1)o.push(i+w);if(c>0)o.push(i-1);return o.filter(j=>!def.blocked.includes(j));}
function trSearch(def,path,limit=400000,R=null){
  const N=def.w*def.h,open=N-def.blocked.length;const vis=new Uint8Array(N);def.blocked.forEach(b=>vis[b]=2);path.forEach(p=>vis[p]=1);
  const nbs=[];for(let i=0;i<N;i++)nbs.push(trNb(def,i));let nodes=0;const res=path.slice();
  const connected=(head)=>{const seen=new Uint8Array(N);const st=[];let cnt=0,total=0;for(let i=0;i<N;i++)if(vis[i]===0)total++;
    for(const j of nbs[head])if(vis[j]===0&&!seen[j]){seen[j]=1;st.push(j);cnt++;}
    while(st.length){const x=st.pop();for(const j of nbs[x])if(vis[j]===0&&!seen[j]){seen[j]=1;st.push(j);cnt++;}}
    if(cnt!==total)return false;
    // callejones: casillas libres con ≤1 salida (aparte de la cabeza y la meta)
    let dead=0;for(let i=0;i<N;i++)if(vis[i]===0){let d=0;for(const j of nbs[i])if(vis[j]===0||j===head)d++;if(d<=1&&i!==def.goal)dead++;if(d===0)return false;}
    return dead<=(def.goal>=0?0:1);};
  const rec=()=>{if(nodes++>limit)return false;const head=res[res.length-1];
    if(res.length===open)return def.goal<0||head===def.goal;
    let cand=nbs[head].filter(j=>vis[j]===0&&(j!==def.goal||res.length===open-1));
    if(R)cand=R.shuffle(cand);
    for(const j of cand){vis[j]=1;res.push(j);if(connected(j)&&rec())return true;res.pop();vis[j]=0;}
    return false;};
  return rec()?res.slice():null;}
export const Trace={key:'trace',
  init:def=>[def.start],
  moves(def,st){const open=def.w*def.h-def.blocked.length;const head=st[st.length-1];return trNb(def,head).filter(j=>!st.includes(j)&&(j!==def.goal||st.length===open-1)).map(j=>[j]);},
  apply(def,st,mv){if(mv[0]===-1)return st.length>1?st.slice(0,-1):st;return st.concat([mv[0]]);},
  isWin:(def,st)=>st.length===def.w*def.h-def.blocked.length&&st[st.length-1]===def.goal,
  hash:st=>st.join(','),
  solve(def,st){const p=trSearch(def,st);return p?p.slice(st.length).map(j=>[j]):null;},
  gen(tier,R){const[w,h,nb]=TR_SIZE[tier];
    for(let att=0;att<80;att++){const N=w*h;const blocked=[];
      while(blocked.length<nb){const b=R.int(N);if(!blocked.includes(b))blocked.push(b);}
      const open=[];for(let i=0;i<N;i++)if(!blocked.includes(i))open.push(i);
      const start=R.pick(open);const def={w,h,blocked,start,goal:-1};
      const p=trSearch(def,[start],60000,R);if(!p)continue;
      def.goal=p[p.length-1];if(def.goal===start)continue;
      // al menos que haya más de una salida posible desde el inicio en niveles altos y que no sea una línea recta trivial
      const sol=trSearch(def,[start],200000);if(!sol)continue;
      return def;}
    return null;}};

/* ───────── 4 · ESPEJOS DE LUZ ───────── */
const DIRS=[[0,1],[1,0],[0,-1],[-1,0]]; // 0 derecha,1 abajo,2 izquierda,3 arriba
const REF=[[3,1],[0,2]]; // orient0 '/': der→arriba(3), abajo→izq(2), izq→abajo(1), arriba→der(0). orient1 '\'
const REFL=[{0:3,1:2,2:1,3:0},{0:1,1:0,2:3,3:2}];
export function traceBeam(def,st){const{n}=def;const mir=new Map();def.mirrors.forEach((m,i)=>mir.set(m.r*n+m.c,i));const walls=new Set(def.walls);
  let r=def.src.r,c=def.src.c,d=def.src.d;const pts=[[r,c]],cells=[r*n+c],seen=new Set();let end='edge';
  for(let s=0;s<300;s++){r+=DIRS[d][0];c+=DIRS[d][1];
    if(r<0||c<0||r>=n||c>=n){pts.push([r,c]);end='edge';break;}
    const idx=r*n+c;if(walls.has(idx)){end='wall';break;}
    if(idx===def.src.r*n+def.src.c){end='src';break;}
    pts.push([r,c]);cells.push(idx);
    if(mir.has(idx)){const i=mir.get(idx);d=REFL[st[i]][d];}
    const k=idx*4+d;if(seen.has(k)){end='loop';break;}seen.add(k);}
  return{pts,cells,end};}
const MI_N=[5,5,6,6,6,7,7,7,8],MI_LO=[1,2,3,3,4,5,5,6,6];
export const Mirrors={key:'mirrors',
  init:def=>def.mirrors.map(m=>m.o0),
  moves:(def,st)=>def.mirrors.map((m,i)=>m.fixed?null:[i]).filter(Boolean),
  apply(def,st,mv){const n=st.slice();n[mv[0]]^=1;return n;},
  isWin(def,st){const b=traceBeam(def,st);const s=new Set(b.cells);return def.targets.every(t=>s.has(t));},
  hash:st=>st.join(''),
  solve(def,st){return bfs(this,def,st,70000);},
  gen(tier,R){const n=MI_N[tier],k=Math.min(3+tier+Math.floor(tier/2),13);
    for(let att=0;att<300;att++){
      const occ=new Set();const sr=1+R.int(n-2);const src={r:sr,c:0,d:0};occ.add(sr*n);
      const walls=[];const nw=Math.floor(tier/2);
      while(walls.length<nw){const x=R.int(n*n);if(!occ.has(x)&&x%n!==0){walls.push(x);occ.add(x);}}
      const mirrors=[];while(mirrors.length<k){const x=R.int(n*n);if(occ.has(x)||x%n===0&&false)continue;occ.add(x);mirrors.push({r:Math.floor(x/n),c:x%n,o0:R.int(2),fixed:false});}
      const def0={n,src,walls,mirrors,targets:[]};
      const sol=mirrors.map(m=>m.o0);
      const b=traceBeam(def0,sol);const mset=new Set(mirrors.map(m=>m.r*n+m.c));
      let hit=0;b.cells.forEach(c=>{if(mset.has(c))hit++;});
      if(hit<Math.min(2+Math.floor(tier*0.6),k-1))continue;
      const free=b.cells.filter((c,i)=>i>0&&!mset.has(c));if(free.length<4)continue;
      const nt=1+Math.floor(tier/3);const targets=[];
      // objetivos repartidos a lo largo del rayo, preferiblemente tras giros
      const idxs=free.map((c,i)=>i);const tail=free.slice(Math.floor(free.length*0.35));
      const pool=R.shuffle(tail);for(const c of pool){if(targets.length>=nt)break;if(!targets.includes(c))targets.push(c);}
      const def={n,src,walls,mirrors:mirrors.map(m=>({...m})),targets};
      // desordenar
      const used=new Set();b.cells.forEach(c=>{if(mset.has(c))used.add(c)});
      const flips=mirrors.map((m,i)=>i).filter(i=>used.has(mirrors[i].r*n+mirrors[i].c));
      const sh=R.shuffle(flips).slice(0,Math.max(1,Math.min(flips.length,MI_LO[tier]+R.int(2))));
      def.mirrors.forEach((m,i)=>{m.o0=sol[i]^(sh.includes(i)?1:0);});
      // fijos en niveles altos: espejos que no hace falta tocar
      if(tier>=5){def.mirrors.forEach((m,i)=>{if(!sh.includes(i)&&R.chance(.5)&&used.has(m.r*n+m.c)){m.fixed=true;}});}
      const s0=this.init(def);if(this.isWin(def,s0))continue;
      const s=this.solve(def,s0);if(!s||s.length<MI_LO[tier]||s.length>MI_LO[tier]+3)continue;
      return def;}
    return null;}};

/* ───────── 5 · GRAVEDAD ───────── */
const GR_SIZE=[[4,4,2,1],[4,4,3,2],[5,4,4,2],[5,5,5,2],[5,5,5,3],[6,5,6,3],[6,6,7,3],[6,6,8,4],[7,6,9,4]];
const GR_LO=[2,3,4,5,6,7,8,9,10];
export const Gravity={key:'gravity',
  init:def=>def.balls.map(b=>b.r*def.w+b.c),
  moves:()=>[[0],[1],[2],[3]],
  apply(def,st,mv){const{w,h}=def;const d=DIRS[mv[0]];const walls=new Set(def.walls);const n=st.slice();
    const order=n.map((p,i)=>i).filter(i=>n[i]>=0);
    const key=i=>{const r=Math.floor(n[i]/w),c=n[i]%w;return d[0]*r+d[1]*c;};order.sort((a,b)=>key(b)-key(a));
    const holeAt=new Map(def.holes.map((x,i)=>[x.r*w+x.c,i]));
    for(const i of order){let r=Math.floor(n[i]/w),c=n[i]%w;
      for(;;){const nr=r+d[0],nc=c+d[1];if(nr<0||nc<0||nr>=h||nc>=w)break;const idx=nr*w+nc;if(walls.has(idx))break;
        let blocked=false;for(let j=0;j<n.length;j++)if(j!==i&&n[j]===idx)blocked=true;if(blocked)break;
        r=nr;c=nc;if(holeAt.has(idx)&&holeAt.get(idx)===i){n[i]=-1;break;}n[i]=idx;}}
    return n;},
  isWin:(def,st)=>st.every(p=>p<0),
  hash:st=>st.join(','),
  solve(def,st){return bfs(this,def,st,200000);},
  gen(tier,R){const[w,h,nw,nb]=GR_SIZE[tier];
    for(let att=0;att<500;att++){const occ=new Set();const pick=()=>{for(;;){const x=R.int(w*h);if(!occ.has(x)){occ.add(x);return x;}}};
      const walls=[];for(let i=0;i<nw;i++)walls.push(pick());
      const balls=[],holes=[];for(let i=0;i<nb;i++){const p=pick();balls.push({r:Math.floor(p/w),c:p%w,col:i});}
      for(let i=0;i<nb;i++){const p=pick();holes.push({r:Math.floor(p/w),c:p%w,col:i});}
      const def={w,h,walls,balls,holes};const s=this.solve(def,this.init(def));
      if(s&&s.length>=GR_LO[tier]&&s.length<=GR_LO[tier]+1)return def;}
    return null;}};

/* ───────── 6 · INTERRUPTORES (Lights Out) ───────── */
const LI=[[3,'plus',2],[3,'plus',3],[4,'plus',4],[4,'plus',5],[5,'plus',6],[5,'x',6],[5,'plus',8],[5,'box',9],[5,'plus',12]];
const LI_LO=[2,3,4,5,5,5,6,6,8];
export function lightsEffect(def,i){const n=def.n,r=Math.floor(i/n),c=i%n;let m=0;const add=(rr,cc)=>{if(rr>=0&&cc>=0&&rr<n&&cc<n)m|=1<<(rr*n+cc);};
  add(r,c);if(def.mode==='plus'){add(r-1,c);add(r+1,c);add(r,c-1);add(r,c+1);}
  else if(def.mode==='x'){add(r-1,c-1);add(r-1,c+1);add(r+1,c-1);add(r+1,c+1);}
  else if(def.mode==='box'){for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)add(r+a,c+b);}
  return m>>>0;}
export const Lights={key:'lights',
  init:def=>def.start,
  moves:def=>Array.from({length:def.n*def.n},(_,i)=>[i]),
  apply:(def,st,mv)=>(st^lightsEffect(def,mv[0]))>>>0,
  isWin:(def,st)=>st===((1<<(def.n*def.n))-1)>>>0||(def.n*def.n===32&&false),
  hash:st=>st,
  solve(def,st){const N=def.n*def.n;const full=N===32?0xFFFFFFFF:((1<<N)-1)>>>0;const b=(st^full)>>>0;
    // filas: ecuación por casilla j: Σ_i efecto_i[j]·x_i = b_j
    const eff=Array.from({length:N},(_,i)=>lightsEffect(def,i));const rows=[];
    for(let j=0;j<N;j++){let m=0;for(let i=0;i<N;i++)if((eff[i]>>>j)&1)m|=(1<<i);rows.push({m:m>>>0,b:(b>>>j)&1});}
    const piv=[];let rk=0;
    for(let col=0;col<N;col++){let p=-1;for(let r=rk;r<N;r++)if((rows[r].m>>>col)&1){p=r;break;}if(p<0)continue;[rows[rk],rows[p]]=[rows[p],rows[rk]];
      for(let r=0;r<N;r++)if(r!==rk&&((rows[r].m>>>col)&1)){rows[r].m=(rows[r].m^rows[rk].m)>>>0;rows[r].b^=rows[rk].b;}piv.push(col);rk++;}
    for(let r=rk;r<N;r++)if(rows[r].b)return null;
    const free=[];for(let c=0;c<N;c++)if(!piv.includes(c))free.push(c);if(free.length>12)return null;
    let best=null;
    for(let mask=0;mask<(1<<free.length);mask++){const x=new Array(N).fill(0);free.forEach((f,k)=>{x[f]=(mask>>k)&1;});
      for(let r=0;r<rk;r++){let v=rows[r].b;for(const f of free)if(((rows[r].m>>>f)&1)&&x[f])v^=1;x[piv[r]]=v;}
      const wgt=x.reduce((a,v)=>a+v,0);if(!best||wgt<best.w)best={w:wgt,x};}
    return best.x.map((v,i)=>v?[i]:null).filter(Boolean);},
  gen(tier,R){const[n,mode,m]=LI[tier];const N=n*n;const full=((1<<N)-1)>>>0;
    for(let att=0;att<200;att++){const def={n,mode,start:full};let st=full;const used=new Set();
      while(used.size<m){const i=R.int(N);if(used.has(i))continue;used.add(i);st=this.apply(def,st,[i]);}
      def.start=st;if(st===full)continue;const s=this.solve(def,st);if(!s)continue;
      if(s.length>=LI_LO[tier]||att>190)return def;}
    return null;}};

/* ───────── 7 · TUBERÍAS ───────── */
const PI_SIZE=[[3,3],[3,3],[3,4],[3,4],[4,4],[4,4],[4,5],[5,5],[5,5]];
// bits: 1 arriba,2 derecha,4 abajo,8 izquierda
export const rotMask=(m,r)=>{for(let i=0;i<(r&3);i++)m=((m<<1)|(m>>3))&15;return m;};
const bitCount=m=>(m&1)+((m>>1)&1)+((m>>2)&1)+((m>>3)&1);
function pipeMasks(def,rot){return def.tiles.map((t,i)=>rotMask(t.m,rot[i]));}
function pipeCheck(def,masks){const{w,h}=def;
  for(let r=0;r<h;r++)for(let c=0;c<w;c++){const m=masks[r*w+c];
    if(((m&1)&&(r===0||!(masks[(r-1)*w+c]&4)))||((m&2)&&(c===w-1||!(masks[r*w+c+1]&8)))||((m&4)&&(r===h-1||!(masks[(r+1)*w+c]&1)))||((m&8)&&(c===0||!(masks[r*w+c-1]&2))))return false;}
  return true;}
export function pipeFlow(def,st){const{w,h}=def;const masks=pipeMasks(def,st);const seen=new Uint8Array(w*h);const stack=[def.src];seen[def.src]=1;
  while(stack.length){const i=stack.pop();const r=Math.floor(i/w),c=i%w,m=masks[i];
    const go=(bit,nr,nc,back)=>{if(!(m&bit)||nr<0||nc<0||nr>=h||nc>=w)return;const j=nr*w+nc;if(!(masks[j]&back)||seen[j])return;seen[j]=1;stack.push(j);};
    go(1,r-1,c,4);go(2,r,c+1,8);go(4,r+1,c,1);go(8,r,c-1,2);}
  return seen;}
function pipeSolutions(def,cap=400){const{w,h}=def;const N=w*h;const cand=def.tiles.map(t=>{const s=new Set();for(let r=0;r<4;r++)s.add(rotMask(t.m,r));return[...s];});
  const sols=[];const cur=new Array(N);let nodes=0;
  const rec=(i)=>{if(sols.length>=cap||nodes++>400000)return;if(i===N){if(pipeCheck(def,cur)){const flow=pipeFlowM(def,cur);if(flow)sols.push(cur.slice());}return;}
    const r=Math.floor(i/w),c=i%w;
    for(const m of cand[i]){if(((m&1)>0)!==(r>0&&(cur[i-w]&4)>0))continue;if(((m&8)>0)!==(c>0&&(cur[i-1]&2)>0))continue;cur[i]=m;rec(i+1);}};
  rec(0);return sols;}
function pipeFlowM(def,masks){const{w,h}=def;const seen=new Uint8Array(w*h);const st=[def.src];seen[def.src]=1;let cnt=1;
  while(st.length){const i=st.pop();const r=Math.floor(i/w),c=i%w,m=masks[i];
    const go=(bit,nr,nc,back)=>{if(!(m&bit)||nr<0||nc<0||nr>=h||nc>=w)return;const j=nr*w+nc;if(!(masks[j]&back)||seen[j])return;seen[j]=1;cnt++;st.push(j);};
    go(1,r-1,c,4);go(2,r,c+1,8);go(4,r+1,c,1);go(8,r,c-1,2);}
  return cnt===w*h;}
export const Pipes={key:'pipes',
  init:def=>def.tiles.map(()=>0),
  moves:(def,st)=>def.tiles.map((t,i)=>[i]),
  apply(def,st,mv){const n=st.slice();n[mv[0]]=(n[mv[0]]+1)&3;return n;},
  isWin(def,st){const masks=pipeMasks(def,st);return pipeCheck(def,masks)&&pipeFlowM(def,masks);},
  hash:st=>st.join(''),
  solve(def,st){const sols=pipeSolutions(def);if(!sols.length)return null;const cur=pipeMasks(def,st);let best=null;
    for(const s of sols){const mv=[];let cost=0;for(let i=0;i<s.length;i++){let k=0;while(rotMask(cur[i],k)!==s[i])k++;cost+=k;for(let j=0;j<k;j++)mv.push([i]);}if(!best||cost<best.cost)best={cost,mv};}
    return best.mv;},
  solCount(def){return pipeSolutions(def,50).length;},
  gen(tier,R){const[w,h]=PI_SIZE[tier];const N=w*h;
    for(let att=0;att<120;att++){
      // árbol aleatorio por recorrido en profundidad
      const adj=new Array(N).fill(0);const vis=new Uint8Array(N);const root=R.int(N);const stack=[root];vis[root]=1;
      while(stack.length){const i=stack[stack.length-1];const r=Math.floor(i/w),c=i%w;
        const opts=[];if(r>0&&!vis[i-w])opts.push([1,i-w,4]);if(c<w-1&&!vis[i+1])opts.push([2,i+1,8]);if(r<h-1&&!vis[i+w])opts.push([4,i+w,1]);if(c>0&&!vis[i-1])opts.push([8,i-1,2]);
        if(!opts.length){stack.pop();continue;}
        // mezclar con prim para que haya ramas
        const[b,j,back]=R.pick(opts);adj[i]|=b;adj[j]|=back;vis[j]=1;stack.push(R.chance(.55)?j:stack[R.int(stack.length)]);}
      if(adj.some(m=>bitCount(m)===4))continue;
      const frac=0.3+tier*0.04;const rot=adj.map(()=>R.chance(frac)?1+R.int(3):0);
      const def={w,h,src:root,tiles:adj.map((m,i)=>({m:rotMask(m,(4-rot[i])&3)}))};
      const sc=pipeSolutions(def,30).length;if(sc<1)continue;
      const st0=this.init(def);if(this.isWin(def,st0))continue;
      const s=this.solve(def,st0);if(s.length<2+Math.floor(tier*0.8))continue;
      if(sc<=(tier<3?20:tier<6?4:2)||att>100)return def;}
    return null;}};

/* ───────── 8 · ANILLOS ───────── */
const RI=[[6,2,0,3],[6,3,0,4],[8,3,0,5],[8,3,1,5],[8,4,1,7],[10,4,1,8],[10,4,2,9],[12,4,2,10],[12,5,3,11]];
export const Rings={key:'rings',
  init:def=>def.off0.slice(),
  moves:def=>{const o=[];for(let i=0;i<def.k;i++){o.push([i,1]);o.push([i,-1]);}return o;},
  apply(def,st,mv){const n=st.slice();const[i,d]=mv;const N=def.n;n[i]=((n[i]+d)%N+N)%N;for(const[a,b]of def.links){if(a===i)n[b]=((n[b]-d)%N+N)%N;else if(b===i)n[a]=((n[a]-d)%N+N)%N;}return n;},
  isWin:(def,st)=>st.every(o=>o===st[0]),
  hash:st=>st.join(','),
  solve(def,st){return bfs(this,def,st,120000);},
  gen(tier,R){const[n,k,nl,m]=RI[tier];
    for(let att=0;att<300;att++){
      const colors=Math.min(3+Math.floor(tier/3),5);let pat;
      for(;;){pat=Array.from({length:n},()=>R.int(colors));if(new Set(pat).size<Math.min(colors,3))continue;
        let per=false;for(let s=1;s<n;s++)if(n%s===0&&pat.every((v,i)=>v===pat[(i+s)%n])){per=true;break;}
        if(!per)break;}
      const links=[];const ids=R.shuffle(Array.from({length:k-1},(_,i)=>i));for(let i=0;i<nl&&i<ids.length;i++)links.push([ids[i],ids[i]+1]);
      const def={n,k,pat,links,off0:new Array(k).fill(0)};let st=def.off0.slice();
      for(let s=0;s<m+3;s++){st=this.apply(def,st,[R.int(k),R.chance(.5)?1:-1]);}
      def.off0=st;if(this.isWin(def,st))continue;const sol=this.solve(def,st);
      if(sol&&sol.length>=m-1&&sol.length<=m+2)return def;}
    return null;}};

export const TYPES=[Slide,Fit,Trace,Mirrors,Gravity,Lights,Pipes,Rings];
export const TYPE_BY_KEY=Object.fromEntries(TYPES.map(t=>[t.key,t]));
export const TYPE_INFO={
  slide:{name:'Deslizar al hueco',help:'Desliza las piezas y deja salir la ficha dorada por la derecha.'},
  fit:{name:'Encaje perfecto',help:'Rellena la silueta con todas las piezas. Puedes girarlas y voltearlas.'},
  trace:{name:'Un solo trazo',help:'Dibuja un camino por todas las casillas, sin repetir, hasta la meta.'},
  mirrors:{name:'Espejos de luz',help:'Toca los espejos para girarlos y lleva el rayo hasta todas las estrellas.'},
  gravity:{name:'Gravedad',help:'Inclina el tablero: cada bola debe caer en el hueco de su color.'},
  lights:{name:'Interruptores',help:'Enciende todas las casillas. Al tocar una, cambian ella y sus vecinas.'},
  pipes:{name:'Tuberías',help:'Toca las piezas para girarlas y conectar todo con la fuente.'},
  rings:{name:'Anillos',help:'Gira los anillos hasta que los colores queden alineados en rayos.'}};
export function genLevel(type,tier,seed){const T=TYPE_BY_KEY[type];return T.gen(tier,RNG(seed));}
export function starsFor(type,min,moves,hinted){const slack=(type==='fit'||type==='trace')?0:Math.floor(min/6);let s=moves<=min+slack?3:moves<=Math.ceil(min*1.6)+2?2:1;if(hinted)s=Math.min(s,2);return s;}
export function minMoves(type,def){const T=TYPE_BY_KEY[type];if(type==='fit')return def.pieces.length;if(type==='trace')return def.w*def.h-def.blocked.length-1;const st=T.init(def);const s=T.solve(def,st);return s?s.length:null;}
