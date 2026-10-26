'use strict';
/* Relojería Rota — v1 */
const M=Matter,{Engine,Bodies,Body,Composite,Events,Sleeping}=M;
const $=id=>document.getElementById(id);
const cv=$('c'),ctx=cv.getContext('2d');
const BRASS='#B87333',TEAL='#3FA7A0',CREAM='#F6ECD2',MAG='#FF3FD0';
const GROUND=800, STEP=1000/60, G=0.001*STEP*STEP;
let W=0,H=0,DPR=1,S=1,TX=0,TY=0,portrait=false,QUAL=2,time=0;
// ---------- guardado ----------
const SAVE_KEY='relojeria-rota-v1';
let save={stars:{},best:{},char:0,muted:false,daily:{},seen:{}};
try{Object.assign(save,JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'))}catch(e){}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}
// ---------- rng ----------
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let R=Math.random;
const rnd=(a,b)=>a+Math.random()*(b-a);
// ---------- audio ----------
let AC=null,master=null,lastGlass=0,glassCount=0;
function audioInit(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=save.muted?0:0.55;master.connect(AC.destination)}catch(e){}}
function env(g,t,a,d,v){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d)}
function osc(type,f,a,d,v,f2){if(!AC||save.muted)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+a+d);env(g,t,a,d,v);o.connect(g);g.connect(master);o.start(t);o.stop(t+a+d+.05)}
let noiseBuf=null;
function noise(d,v,fq,q,type){if(!AC||save.muted)return;if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate*.6,AC.sampleRate);const c=noiseBuf.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=Math.random()*2-1}const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;f.type=type||'bandpass';f.frequency.value=fq;f.Q.value=q||1;env(g,t,.002,d,v);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+d+.05)}
const SFX={
 tick(h){noise(.03,.25,h?5200:3600,8);osc('square',h?1800:1400,.001,.025,.04)},
 glass(p){const n=performance.now();if(n-lastGlass<35)return;lastGlass=n;p=Math.min(1,p);noise(.18+.2*p,.25+.3*p,6000+Math.random()*3000,2,'highpass');for(let i=0;i<3;i++)osc('sine',2000+Math.random()*3500,.002,.12+Math.random()*.25,.05+.06*p)},
 thud(p){noise(.12,.25*Math.min(1,p),300,1,'lowpass');osc('sine',120,.002,.15,.18*Math.min(1,p),50)},
 metal(p){osc('triangle',380+Math.random()*300,.002,.4,.08*Math.min(1,p),300);osc('sine',1250+Math.random()*400,.002,.3,.04)},
 launch(){noise(.35,.25,900,.7);osc('sawtooth',160,.01,.25,.06,520)},
 core(){osc('sine',880,.005,.5,.15,1760);osc('triangle',1320,.005,.6,.1,440);noise(.4,.3,7000,1,'highpass')},
 chime(i){osc('sine',[660,880,1175][i]||660,.005,.7,.2);osc('sine',([660,880,1175][i]||660)*2,.005,.5,.06)},
 freeze(){osc('sine',2400,.01,.8,.12,600);noise(.6,.15,8000,3)},
 rewind(){osc('sawtooth',200,.02,.7,.08,1600);osc('sine',1600,.02,.7,.08,200)},
 fast(){osc('square',300,.01,.3,.05,1200)},
 slow(){osc('sine',220,.02,1.1,.2,55);noise(.9,.12,500,1,'lowpass')},
 boost(){osc('square',900,.002,.06,.06);setTimeout(()=>osc('square',1400,.002,.06,.06),70)},
 lose(){osc('triangle',330,.01,.5,.12,165)}
};
function setMute(m){save.muted=m;persist();if(master)master.gain.value=m?0:.55;$('bMute').textContent=m?'🔇':'🔊'}
// ---------- sprites ----------
const sprites={};
function mk(w,h,f){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));f(c.getContext('2d'),c);return c}
function gearPath(g,r,teeth,depth){g.beginPath();const n=teeth*2;for(let i=0;i<=n*2;i++){const a=i/(n*2)*Math.PI*2;const k=(i%4<2)?r:r-depth;g.lineTo(Math.cos(a)*k,Math.sin(a)*k)}g.closePath()}
function gearSprite(r,teeth,tone){const key='g'+r+'_'+teeth+'_'+tone;if(sprites[key])return sprites[key];
 const s=r*2+6;return sprites[key]=mk(s,s,g=>{g.translate(s/2,s/2);const d=Math.max(3,r*.16);
  const gr=g.createRadialGradient(-r*.35,-r*.35,r*.1,0,0,r);
  const pal=tone==1?['#bff7f1','#3FA7A0','#123f3c']:tone==2?['#ffd6f4','#c0168f','#3d0530']:['#ffe2a8','#B87333','#3c1d07'];
  gr.addColorStop(0,pal[0]);gr.addColorStop(.55,pal[1]);gr.addColorStop(1,pal[2]);
  gearPath(g,r,teeth,d);g.fillStyle=gr;g.fill();g.lineWidth=Math.max(1,r*.03);g.strokeStyle='rgba(0,0,0,.45)';g.stroke();
  g.globalCompositeOperation='destination-out';const sp=r>40?6:4;
  for(let i=0;i<sp;i++){const a=i/sp*Math.PI*2;g.beginPath();g.arc(Math.cos(a)*r*.5,Math.sin(a)*r*.5,r*.18,0,7);g.fill()}
  g.globalCompositeOperation='source-over';
  g.beginPath();g.arc(0,0,r*.72,0,7);g.lineWidth=r*.05;g.strokeStyle='rgba(255,240,200,.35)';g.stroke();
  g.beginPath();g.arc(0,0,r*.2,0,7);g.fillStyle=pal[2];g.fill();g.beginPath();g.arc(-r*.05,-r*.05,r*.1,0,7);g.fillStyle=pal[0];g.fill()})}
function glowSprite(col){const key='glow'+col;if(sprites[key])return sprites[key];return sprites[key]=mk(128,128,g=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,col);gr.addColorStop(.25,col.replace(/[\d.]+\)$/,'0.45)'));gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128)})}
const GLOW_M='rgba(255,63,208,1)',GLOW_T='rgba(110,255,240,1)',GLOW_G='rgba(255,200,110,1)';
function clockFace(g,r,numerals,dark){
 const gr=g.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);gr.addColorStop(0,dark?'#2a4a47':'#fffaf0');gr.addColorStop(.8,dark?'#132624':'#efe0bb');gr.addColorStop(1,dark?'#0a1514':'#c9b07a');
 g.beginPath();g.arc(0,0,r,0,7);g.fillStyle=gr;g.fill();
 g.lineWidth=r*.07;const rg=g.createLinearGradient(-r,-r,r,r);rg.addColorStop(0,'#ffe2a8');rg.addColorStop(.5,BRASS);rg.addColorStop(1,'#4a250a');g.strokeStyle=rg;g.stroke();
 g.fillStyle=dark?'rgba(191,247,241,.5)':'#3a2410';
 for(let i=0;i<60;i++){const a=i/60*Math.PI*2,l=i%5?r*.04:r*.1;g.save();g.rotate(a);g.fillRect(-r*.006-(i%5?0:r*.008),-r*.9,i%5?r*.012:r*.028,l);g.restore()}
 if(numerals){const N=['XII','I','II','III','IIII','V','VI','VII','VIII','IX','X','XI'];g.font='bold '+Math.round(r*.13)+'px Georgia';g.textAlign='center';g.textBaseline='middle';for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.save();g.translate(Math.sin(a)*r*.72,-Math.cos(a)*r*.72);g.rotate(a);g.fillText(N[i],0,0);g.restore()}}
}
function meltSprite(r,seed){const key='melt'+r+'_'+seed;if(sprites[key])return sprites[key];const rr=mulberry(seed);
 return sprites[key]=mk(r*2.6,r*3.2,g=>{g.translate(r*1.3,r*1.1);
  g.save();g.beginPath();g.moveTo(-r,0);g.bezierCurveTo(-r,-r*1.35,r,-r*1.35,r,0);
  const drips=4+Math.floor(rr()*3);for(let i=0;i<drips;i++){const x0=r-(i+.5)/drips*2*r,len=r*(.2+rr()*1.4);g.quadraticCurveTo(x0+r/drips*.6,len*.4,x0+r/drips*.25,len);g.quadraticCurveTo(x0,len+r*.12,x0-r/drips*.25,len);g.quadraticCurveTo(x0-r/drips*.6,len*.3,x0-r/drips,r*.1)}
  g.closePath();g.clip();g.scale(1,.85);clockFace(g,r*1.15,true,false);g.restore();
  g.globalCompositeOperation='source-atop';const sh=g.createLinearGradient(0,-r,0,r*2);sh.addColorStop(0,'rgba(255,255,255,.15)');sh.addColorStop(1,'rgba(90,30,10,.45)');g.fillStyle=sh;g.fillRect(-2*r,-2*r,4*r,5*r)})}
// ---------- fondo ----------
let bgCan=null,WORLD=1;
function buildBg(){
 bgCan=mk(W*DPR,H*DPR,g=>{g.scale(DPR,DPR);
  const sk=g.createLinearGradient(0,0,0,H);
  if(WORLD==1){sk.addColorStop(0,'#071211');sk.addColorStop(.45,'#123331');sk.addColorStop(.8,'#2f3a2a');sk.addColorStop(1,'#3a2612')}
  else{sk.addColorStop(0,'#14051c');sk.addColorStop(.45,'#3a0e44');sk.addColorStop(.8,'#1d4a3c');sk.addColorStop(1,'#2a1230')}
  g.fillStyle=sk;g.fillRect(0,0,W,H);
  // gran esfera del reloj de bolsillo (la ciudad está dentro)
  const R0=Math.max(W,H)*.62,cx=W*.5,cy=H*(portrait?.42:.55);
  g.save();g.translate(cx,cy);g.globalAlpha=.32;clockFace(g,R0,true,true);g.restore();
  g.save();g.translate(cx,cy);g.globalAlpha=.5;g.lineWidth=R0*.05;g.strokeStyle=WORLD==1?'#7a4216':'#7d1a6a';g.beginPath();g.arc(0,0,R0*1.04,0,7);g.stroke();g.restore();
  // estrellas / polvo de tiempo
  const rr=mulberry(7);for(let i=0;i<120;i++){g.fillStyle=`rgba(${rr()<.5?'255,220,170':'160,255,240'},${.15+rr()*.4})`;g.beginPath();g.arc(rr()*W,rr()*H*.7,rr()*1.6,0,7);g.fill()}
  // ciudad dentro del reloj
  const base=TY+GROUND*S;
  for(let layer=0;layer<2;layer++){const rl=mulberry(11+layer);g.fillStyle=layer?(WORLD==1?'#1a2b22':'#2b0f33'):(WORLD==1?'#10201c':'#1c0824');
   let x=-20;while(x<W+40){const w=(30+rl()*70)*(layer?1.1:.8),h=(80+rl()*260)*(layer?.8:1.15)*(portrait?1.3:1);const top=base-h-(layer?0:30);
    g.fillRect(x,top,w,base-top+200);
    if(rl()<.5){g.beginPath();g.moveTo(x-4,top);g.lineTo(x+w/2,top-w*.9);g.lineTo(x+w+4,top);g.fill()}
    else if(rl()<.6){g.beginPath();g.arc(x+w/2,top,w/2,Math.PI,0);g.fill()}
    if(rl()<.55){g.save();g.translate(x+w/2,top+w*.55);g.globalAlpha=.6;g.beginPath();g.arc(0,0,w*.3,0,7);g.fillStyle=WORLD==1?'rgba(255,214,140,.55)':'rgba(140,255,200,.5)';g.fill();g.globalAlpha=1;g.restore();g.fillStyle=layer?(WORLD==1?'#1a2b22':'#2b0f33'):(WORLD==1?'#10201c':'#1c0824')}
    for(let k=0;k<4;k++)if(rl()<.5){g.fillStyle=`rgba(255,${190+rl()*60|0},120,${.25+rl()*.4})`;g.fillRect(x+4+rl()*(w-10),top+20+rl()*(h-30),4,6);g.fillStyle=layer?(WORLD==1?'#1a2b22':'#2b0f33'):(WORLD==1?'#10201c':'#1c0824')}
    x+=w+rl()*14}}
  const vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=vg;g.fillRect(0,0,W,H);
 });
}
const bgGears=[],melts=[];
function initDeco(){bgGears.length=0;melts.length=0;const rr=mulberry(3);
 const n=QUAL>1?9:5;for(let i=0;i<n;i++)bgGears.push({x:rr(),y:rr()*.8,r:40+rr()*110,teeth:10+(rr()*14|0),sp:(rr()-.5)*.6,par:.15+rr()*.35,tone:rr()<.25?1:(WORLD==2&&rr()<.5?2:0),a:.18+rr()*.25});
 for(let i=0;i<(QUAL>1?5:3);i++)melts.push({x:rr(),y:.06+rr()*.4,r:(18+rr()*24)*(portrait?.8:1),seed:(rr()*999)|0,ph:rr()*7,rot:(rr()-.5)*.8})}
let shake=0,aimPar=0;
function drawBackground(){
 ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bgCan,0,0);ctx.setTransform(DPR,0,0,DPR,0,0);
 const px=aimPar+Math.sin(time*.15)*10;
 // manecillas gigantes
 const R0=Math.max(W,H)*.62,cx=W*.5,cy=H*(portrait?.42:.55);
 ctx.save();ctx.translate(cx-px*.1,cy);ctx.globalAlpha=.28;ctx.strokeStyle=WORLD==1?'#ffd08a':'#ff9be6';ctx.lineCap='round';
 ctx.lineWidth=R0*.025;ctx.rotate(time*.05);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-R0*.55);ctx.stroke();
 ctx.rotate(time*.6);ctx.lineWidth=R0*.01;ctx.beginPath();ctx.moveTo(0,R0*.1);ctx.lineTo(0,-R0*.8);ctx.stroke();ctx.restore();
 for(const gq of bgGears){const sp=gearSprite(Math.round(gq.r),gq.teeth,gq.tone);ctx.save();ctx.globalAlpha=gq.a;ctx.translate(gq.x*W-px*gq.par,gq.y*H);ctx.rotate(time*gq.sp);ctx.drawImage(sp,-sp.width/2,-sp.height/2);ctx.restore()}
 if(WORLD==2)drawJellyBen(px);
 for(const m of melts){const sp=meltSprite(Math.round(m.r),m.seed);ctx.save();ctx.translate(m.x*W-px*.5,m.y*H+Math.sin(time*.5+m.ph)*12);ctx.rotate(m.rot+Math.sin(time*.3+m.ph)*.1);ctx.transform(1,0,Math.sin(time*.4+m.ph)*.12,1,0,0);ctx.globalAlpha=.5;ctx.drawImage(sp,-sp.width/2,-sp.height*.35);ctx.restore()}
}
function drawJellyBen(px){const bx=W*(portrait?.78:.86)-px*.3,base=TY+GROUND*S,h=Math.min(H*.75,base-20),w=h*.2;const wob=1+Math.sin(time*2.2)*.025;
 ctx.save();ctx.translate(bx,base);ctx.scale(1/wob,wob);ctx.globalAlpha=.55;
 const gr=ctx.createLinearGradient(-w,0,w,0);gr.addColorStop(0,'rgba(90,255,170,.55)');gr.addColorStop(.5,'rgba(200,255,220,.75)');gr.addColorStop(1,'rgba(40,160,110,.55)');
 ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(-w/2,0);ctx.lineTo(-w/2,-h*.7);ctx.lineTo(-w*.62,-h*.72);ctx.lineTo(-w*.62,-h*.82);ctx.lineTo(0,-h);ctx.lineTo(w*.62,-h*.82);ctx.lineTo(w*.62,-h*.72);ctx.lineTo(w/2,-h*.7);ctx.lineTo(w/2,0);ctx.closePath();ctx.fill();
 ctx.translate(0,-h*.77);ctx.globalAlpha=.8;clockFace(ctx,w*.42,true,false);
 ctx.rotate(time*.8);ctx.fillStyle='#5a0b46';ctx.fillRect(-2,-w*.35,4,w*.35);ctx.restore()}
// ---------- materiales ----------
const MAT={
 glass:{density:.0012,friction:.6,restitution:.05,hp:6},
 brass:{density:.005,friction:.7,restitution:.02,hp:24},
 jelly:{density:.0016,friction:.9,restitution:.55,hp:10},
 gear:{density:.004,friction:.5,restitution:.1,hp:18},
 core:{density:.0022,friction:.6,restitution:.1,hp:4}
};
// ---------- estado ----------
let engine,world,live=[],cores=[],removeQ=[],parts=[];
let G0={};const st={mode:'menu',lvl:0,shots:0,score:0,phase:'idle',simT:0,breaks:[],slow:0,frozen:0,fast:false,uses:{},proj:null,aim:null,settleT:0};
let rec=null,bestRec=null,replay=null,snapshot=null;
function newEngine(){engine=Engine.create({enableSleeping:true});engine.gravity.y=1;world=engine.world;live=[];cores=[];removeQ=[];parts=[];
 const gnd=Bodies.rectangle(650,GROUND+60,4000,120,{isStatic:true,friction:.9});gnd.plugin.info={kind:'ground'};Composite.add(world,gnd);
 Events.on(engine,'collisionStart',onCollide)}
let LABEL=0;
function addBody(b,info){b.plugin.info=info;info.id=b.id;b.plugin.hp=info.hp||1e9;b.plugin.max=b.plugin.hp;b.plugin.sy=b.position.y;Composite.add(world,b);if(!b.isStatic){live.push(b);Sleeping.set(b,true)}if(info.kind=='core')cores.push(b);return b}
function block(x,y,w,h,mat){if(Array.isArray(mat))mat=mat[(LABEL+(x|0))%mat.length];const m=MAT[mat];const b=Bodies.rectangle(x,y,w,h,{density:m.density,friction:m.friction,restitution:m.restitution,chamfer:{radius:mat=='jelly'?6:2},sleepThreshold:40});
 const lab=mat=='glass'||mat=='jelly'?String((LABEL++*7)%60).padStart(2,'0'):'';return addBody(b,{kind:'block',mat,w,h,hp:m.hp*(st.mode=='level'&&st.lvl==0?.45:1)*(Math.min(w,h)<24?.8:1)*(w*h>6000?1.4:1),label:lab,cr:Math.random()*999|0})}
function gearB(x,y,r){const m=MAT.gear;const b=Bodies.circle(x,y,r,{density:m.density,friction:m.friction,restitution:m.restitution,sleepThreshold:40});return addBody(b,{kind:'gear',mat:'gear',r,hp:m.hp,teeth:Math.max(8,Math.round(r/3.2)),tone:Math.random()<.3?1:0})}
function core(x,y){const m=MAT.core;const b=Bodies.circle(x,y,21,{density:m.density,friction:m.friction,restitution:.1,sleepThreshold:40});return addBody(b,{kind:'core',mat:'core',r:21,hp:m.hp,ph:Math.random()*7})}
function pedestal(x,h,w){const b=Bodies.rectangle(x,GROUND-h/2,w,h,{isStatic:true,friction:.9});b.plugin.info={kind:'ped',w,h};Composite.add(world,b);return GROUND-h}
// ---------- estructuras ----------
function S_pb(x,floors,width,mat,ped,opt){opt=opt||{};let base=ped?pedestal(x,ped,width+70):GROUND;const ph=opt.ph||88,pw=opt.pw||22;
 for(let i=0;i<floors;i++){const m=Array.isArray(mat)?mat[i%mat.length]:mat;block(x-width/2+pw/2,base-ph/2,pw,ph,m);block(x+width/2-pw/2,base-ph/2,pw,ph,m);
  if(opt.mid&&i%2==0)block(x,base-ph/2,pw,ph,m);
  block(x,base-ph-10,width+16,20,opt.beam||(m=='glass'&&i%2?'brass':m));
  if(opt.coreEvery&&i<floors-1&&i%opt.coreEvery==opt.coreEvery-1)core(x,base-ph/2+ (ph/2-21));
  base-=ph+20}
 if(opt.weight){block(x,base-22,width*.7,44,'brass');base-=44}
 if(!opt.noTop)core(x,base-21);return base}
function S_pyr(x,rows,mat,ped,bs){bs=bs||44;let base=ped?pedestal(x,ped,rows*bs+40):GROUND;
 for(let r=0;r<rows;r++){const n=rows-r;for(let i=0;i<n;i++){const m=Array.isArray(mat)?mat[(r+i)%mat.length]:mat;block(x+(i-(n-1)/2)*bs,base-bs/2,bs,bs,m)}base-=bs}
 core(x,base-21)}
function S_wall(x,h,mat,ped){let base=ped?pedestal(x,ped,60):GROUND;let y=base;while(y>base-h){block(x,y-30,30,60,mat);y-=60}}
function S_gears(x,n,ped){let base=ped?pedestal(x,ped,160):GROUND;
 block(x-60,base-30,20,60,'brass');block(x+60,base-30,20,60,'brass');block(x,base-70,150,20,'glass');base-=80;
 for(let i=0;i<n;i++){const r=26+((i*13)%14);gearB(x+((i%2)?-18:18),base-r,r);base-=2*r}
 core(x,base-21)}
function S_needle(x,h,mat,ped){let base=ped?pedestal(x,ped,90):GROUND;let k=0;
 while(h>0){block(x,base-35,26,70,Array.isArray(mat)?mat[k%mat.length]:mat);block(x,base-79,70,18,'brass');base-=88;h-=88;k++}
 core(x,base-21)}
function S_castle(x,mat,ped){let base=ped?pedestal(x,ped,380):GROUND;
 for(const dx of[-150,0,150]){let b=base;for(let i=0;i<(dx?2:3);i++){block(x+dx-28,b-40,18,80,mat);block(x+dx+28,b-40,18,80,mat);block(x+dx,b-90,80,20,'brass');b-=100}core(x+dx,b-21)}
 block(x-75,base-210,110,16,'glass');block(x+75,base-210,110,16,'glass')}
function S_balance(x,mat,ped){let base=ped?pedestal(x,ped,60):GROUND;block(x,base-60,24,120,'brass');block(x,base-130,300,18,mat);
 block(x-120,base-161,44,44,mat);block(x+120,base-161,44,44,mat);core(x-120,base-204);core(x+120,base-204);block(x,base-160,30,40,'glass');gearB(x,base-210,28)}
const BUILD={pb:S_pb,pyr:S_pyr,wall:S_wall,gears:S_gears,needle:S_needle,castle:S_castle,bal:S_balance};
// ---------- niveles ----------
const LEVELS=[
 {n:'El primer segundo',shots:3,s:[['pb',930,5,150,'glass',0,{weight:1,mid:1}]],tut:'aim'},
 {n:'Gemelas',shots:3,s:[['pb',820,3,120,'glass'],['pb',1100,3,120,'glass']]},
 {n:'Pirámide de minutos',shots:3,s:[['pyr',1000,6,'glass']],tut:'freeze'},
 {n:'Muralla de latón',shots:3,s:[['wall',820,180,'brass'],['pb',1020,3,140,'glass']]},
 {n:'Engranajes sueltos',shots:3,s:[['gears',950,3],['needle',1180,260,'glass']]},
 {n:'El pedestal',shots:3,s:[['pb',1000,3,150,['glass','brass'],180]],tut:'rew'},
 {n:'Castillo del tic-tac',shots:4,s:[['castle',990,'glass']]},
 {n:'Aguja de medianoche',shots:3,s:[['needle',900,520,'glass'],['needle',1150,380,['glass','brass']]]},
 {n:'La balanza',shots:3,s:[['bal',980,'glass',90],['wall',760,120,'glass']],tut:'fast'},
 {n:'Corona del Reloj',shots:5,s:[['castle',900,['glass','brass']],['pb',1200,5,110,'glass',0,{coreEvery:2}]]},
 {n:'Flan de las horas',shots:3,s:[['pb',980,4,150,'jelly',0,{weight:1}]]},
 {n:'Temblor gelatinoso',shots:3,s:[['pyr',900,5,'jelly'],['needle',1170,300,'jelly']]},
 {n:'Cuco de fresa',shots:3,s:[['pb',1000,4,130,['jelly','glass'],120]]},
 {n:'Engranajes en almíbar',shots:3,s:[['gears',880,4,60],['pb',1120,3,120,'jelly']]},
 {n:'Muralla temblona',shots:3,s:[['wall',780,240,'jelly'],['wall',840,180,'brass'],['castle',1080,'jelly']]},
 {n:'Péndulo de gominola',shots:3,s:[['bal',900,'jelly',160],['needle',1180,440,['jelly','brass']]]},
 {n:'Torre de los cuartos',shots:4,s:[['pb',1000,6,130,['jelly','glass'],0,{coreEvery:2,mid:1}]]},
 {n:'Campanario blando',shots:4,s:[['castle',940,['jelly','glass'],60],['pyr',1230,4,'brass']]},
 {n:'Tormenta de segundos',shots:4,s:[['needle',800,420,'glass'],['pb',1000,5,120,'jelly'],['needle',1210,520,['glass','jelly']]]},
 {n:'El Big Ben de Gelatina',shots:5,s:[['castle',880,['jelly','brass']],['pb',1180,6,140,['jelly','glass'],100,{coreEvery:2}]]}
];
const UNLOCK={freeze:2,rew:5,fast:8};
function dailyDef(seed,shots){const rr=mulberry(seed);const T=['pb','pyr','needle','gears','castle','bal'];const mats=['glass','jelly',['glass','brass'],['jelly','glass']];
 const out=[];const n=rr()<.5?2:3;const xs=n==2?[880,1140]:[800,1000,1200];
 for(let i=0;i<n;i++){let t=T[rr()*T.length|0];if((t=='castle'||t=='bal')&&!(n==2&&i==0))t='needle';const m=mats[rr()*mats.length|0],ped=rr()<.35?(60+rr()*120|0):0,x=xs[i];
  if(t=='pb')out.push([t,x,3+(rr()*3|0),110+(rr()*40|0),m,ped,{weight:rr()<.4,coreEvery:rr()<.3?2:0}]);
  else if(t=='pyr')out.push([t,x,4+(rr()*2|0),m,ped]);else if(t=='needle')out.push([t,x,250+(rr()*300|0),m,ped]);
  else if(t=='gears')out.push([t,x,2+(rr()*3|0),ped]);else if(t=='castle')out.push([t,x,m,ped]);else out.push([t,x,m,ped])}
 return {n:'Torre del día',shots:shots||3,s:out}}
function todaySeed(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
// ---------- personajes ----------
const CHARS=[
 {id:'pendulo',name:'Péndulo',desc:'Cuanto más se balancea antes del tiro, más fuerte dispara.',r:20,dens:.005,vmax:21,prev:16},
 {id:'arena',name:'Señora Arena',desc:'Dispara dunas pesadas que revientan en granos de tiempo.',r:27,dens:.013,vmax:19.5,prev:16},
 {id:'tic',name:'Tic',desc:'Búho de cuerda: cámara lenta y trayectoria larga al apuntar. Toca en vuelo: ¡picado!',r:18,dens:.0045,vmax:21,prev:70}
];
const ANCHOR={x:175,y:640};
function chr(){return CHARS[st.char!=null?st.char:save.char]}
function drawChar(g,id,x,y,sc,t,o){o=o||{};g.save();g.translate(x,y);g.scale(sc,sc);
 const brass=(y0,y1)=>{const gr=g.createLinearGradient(-30,y0,30,y1);gr.addColorStop(0,'#ffe2a8');gr.addColorStop(.45,BRASS);gr.addColorStop(1,'#3c1d07');return gr};
 if(id=='pendulo'){
  // cuerpo de latón con chaleco turquesa
  g.fillStyle=brass(0,60);g.beginPath();g.moveTo(-22,60);g.lineTo(-16,0);g.lineTo(16,0);g.lineTo(22,60);g.closePath();g.fill();
  g.fillStyle=TEAL;g.fillRect(-12,8,24,40);g.fillStyle='#ffe2a8';for(let i=0;i<3;i++){g.beginPath();g.arc(0,16+i*11,2.5,0,7);g.fill()}
  g.strokeStyle='#5a2e10';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(-16,8);g.lineTo(-30,32+Math.sin(t*3)*4);g.moveTo(16,8);g.lineTo(32,26-Math.sin(t*3)*4);g.stroke();
  // arco y cabeza-péndulo
  g.strokeStyle=brass(-90,0);g.lineWidth=5;g.beginPath();g.moveTo(-18,0);g.lineTo(-18,-70);g.quadraticCurveTo(0,-92,18,-70);g.lineTo(18,0);g.stroke();
  const amp=.25+(o.swing||0)*.9,a=Math.sin(t*(3+(o.swing||0)*3))*amp;
  g.save();g.translate(0,-80);g.rotate(a);g.strokeStyle='#ffe2a8';g.lineWidth=3;g.beginPath();g.moveTo(0,0);g.lineTo(0,52);g.stroke();
  g.translate(0,62);const bg=g.createRadialGradient(-5,-6,2,0,0,17);bg.addColorStop(0,'#fff6d6');bg.addColorStop(.5,'#e8b061');bg.addColorStop(1,'#5a2e10');g.fillStyle=bg;g.beginPath();g.arc(0,0,16,0,7);g.fill();
  g.fillStyle='#14201f';g.beginPath();g.ellipse(-5,-2,3,4.5,0,0,7);g.ellipse(6,-2,3,4.5,0,0,7);g.fill();g.fillStyle=MAG;g.beginPath();g.arc(-5,-3,1.2,0,7);g.arc(6,-3,1.2,0,7);g.fill();
  g.strokeStyle='#3c1d07';g.lineWidth=1.5;g.beginPath();g.arc(0,5,5,.2,Math.PI-.2);g.stroke();g.restore();
  if(o.swing>0){g.globalCompositeOperation='lighter';g.globalAlpha=o.swing*.8;g.drawImage(glowSprite(GLOW_M),-40,-60,80,80);g.globalCompositeOperation='source-over';g.globalAlpha=1}
 } else if(id=='arena'){
  const fl=(t*.15)%1;
  g.fillStyle=brass(-90,-80);g.fillRect(-30,-92,60,10);g.fillRect(-30,52,60,10);
  g.strokeStyle='#7a4216';g.lineWidth=4;for(const sx of[-26,26]){g.beginPath();g.moveTo(sx,-82);g.lineTo(sx,52);g.stroke()}
  g.fillStyle='rgba(190,250,245,.25)';g.strokeStyle='rgba(220,255,250,.8)';g.lineWidth=2;
  g.beginPath();g.moveTo(-22,-82);g.bezierCurveTo(-22,-30,-3,-20,-3,-15);g.lineTo(-3,-12);g.bezierCurveTo(-3,-6,-22,0,-22,52);g.lineTo(22,52);g.bezierCurveTo(22,0,3,-6,3,-12);g.lineTo(3,-15);g.bezierCurveTo(3,-20,22,-30,22,-82);g.closePath();g.fill();g.stroke();
  g.save();g.clip();const sand=g.createLinearGradient(0,-80,0,52);sand.addColorStop(0,'#ffd98a');sand.addColorStop(1,'#c98a3a');g.fillStyle=sand;
  const top=-60+fl*30;g.fillRect(-25,top,50,-15-top+2);g.beginPath();g.moveTo(-25,52);g.lineTo(-25,40-fl*14);g.quadraticCurveTo(0,20-fl*20,25,40-fl*14);g.lineTo(25,52);g.fill();
  g.fillRect(-1.2,-15,2.4,55);g.restore();
  g.fillStyle='#14201f';g.beginPath();g.ellipse(-8,-48,3.5,5,0,0,7);g.ellipse(8,-48,3.5,5,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-7,-50,1.3,0,7);g.arc(9,-50,1.3,0,7);g.fill();
  g.strokeStyle=MAG;g.lineWidth=2;g.beginPath();g.arc(0,-38,5,.3,Math.PI-.3);g.stroke();
  g.fillStyle=MAG;g.beginPath();g.moveTo(-30,-92);g.quadraticCurveTo(0,-125,30,-92);g.fill();g.fillStyle='#ffe2a8';g.beginPath();g.arc(0,-108,4,0,7);g.fill();
  g.strokeStyle='#5a2e10';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(-26,10);g.lineTo(-42,-6+Math.sin(t*2)*6);g.moveTo(26,10);g.lineTo(42,20+Math.sin(t*2+1)*4);g.stroke();
 } else {
  // Tic: búho de cuerda
  const bl=(Math.sin(t*1.3)>.96)?.15:1;
  g.save();g.translate(30,-10);g.rotate(t*2);g.fillStyle=brass(-10,10);g.fillRect(-3,-14,6,28);g.beginPath();g.ellipse(0,-18,9,6,0,0,7);g.ellipse(0,18,9,6,0,0,7);g.fill();g.restore();
  const bg=g.createRadialGradient(-10,-25,5,0,0,52);bg.addColorStop(0,'#ffcf8f');bg.addColorStop(.5,BRASS);bg.addColorStop(1,'#3c1d07');g.fillStyle=bg;
  g.beginPath();g.ellipse(0,0,34,46,0,0,7);g.fill();
  g.beginPath();g.moveTo(-30,-30);g.lineTo(-34,-62);g.lineTo(-12,-40);g.moveTo(30,-30);g.lineTo(34,-62);g.lineTo(12,-40);g.fill();
  g.strokeStyle='rgba(60,25,5,.6)';g.lineWidth=1.5;for(let r=0;r<3;r++)for(let i=-2;i<=2;i++){g.beginPath();g.arc(i*10,14+r*9,5,0,Math.PI);g.stroke()}
  for(const sx of[-15,15]){g.fillStyle='#2a1406';g.beginPath();g.arc(sx,-18,15,0,7);g.fill();const eg=g.createRadialGradient(sx-3,-21,1,sx,-18,12);eg.addColorStop(0,'#e8fffb');eg.addColorStop(.4,'#6fe6dc');eg.addColorStop(1,'#124a46');g.fillStyle=eg;g.beginPath();g.ellipse(sx,-18,11,11*bl,0,0,7);g.fill();
   if(bl>.5){g.fillStyle='#071010';g.beginPath();g.arc(sx+(o.lx||0)*3,-18+(o.ly||0)*3,4.5,0,7);g.fill();g.fillStyle=MAG;g.beginPath();g.arc(sx+(o.lx||0)*3-1.5,-19.5,1.4,0,7);g.fill()}
   g.strokeStyle='#ffe2a8';g.lineWidth=2.5;g.beginPath();g.arc(sx,-18,13,0,7);g.stroke()}
  g.fillStyle='#ffb43a';g.beginPath();g.moveTo(-4,-6);g.lineTo(4,-6);g.lineTo(0,4);g.fill();
  g.strokeStyle='#ffe2a8';g.lineWidth=3;g.beginPath();g.moveTo(-8,46);g.lineTo(-8,54);g.moveTo(8,46);g.lineTo(8,54);g.stroke();
 }
 g.restore()}
// ---------- colisiones / daño ----------
function eff(b){return b.isStatic?(b.plugin.m0||1e6):b.mass}
function onCollide(e){if(st.simT<.25&&st.phase!='fly')return;
 for(const p of e.pairs){const A=p.bodyA,B=p.bodyB,n=p.collision.normal;const rv=Math.abs((A.velocity.x-B.velocity.x)*n.x+(A.velocity.y-B.velocity.y)*n.y);if(rv<1.6)continue;
  hurt(A,B,rv);hurt(B,A,rv);
  const ia=A.plugin.info||{},ib=B.plugin.info||{};
  if(ia.kind=='proj'||ib.kind=='proj'){const pr=ia.kind=='proj'?A:B;if(!pr.plugin.hit){pr.plugin.hit=1;shake=Math.min(14,rv*.6);if(pr.plugin.info.ch=='arena'&&rv>5)removeQ.push([pr,'dune'])}}
  if(rv>3){const m=(ia.mat=='brass'||ib.mat=='brass'||ia.kind=='gear'||ib.kind=='gear');if(m)SFX.metal(rv/15);else if(ia.kind=='ground'||ib.kind=='ground')SFX.thud(rv/12)}}}
function hurt(me,other,rv){const i=me.plugin.info;if(!i||!i.hp||me.plugin.dead)return;if(i.kind=='proj'||i.kind=='grain')return;
 const ratio=Math.max(.35,Math.min(3.2,eff(other)/(me.plugin.m0||me.mass)));let d=rv*Math.sqrt(ratio);if(me.plugin.frz)d*=1.8;if(d<2.2)return;
 me.plugin.hp-=d;if(me.plugin.hp<=0){me.plugin.dead=1;removeQ.push([me,'break'])}}
function breakBody(b,how){if(b.plugin.gone)return;b.plugin.gone=1;const i=b.plugin.info;Composite.remove(world,b);live=live.filter(x=>x!==b);
 const x=b.position.x,y=b.position.y;
 if(how=='dune'){SFX.thud(1);for(let k=0;k<7;k++){const gr=Bodies.circle(x+rnd(-12,12),y+rnd(-12,12),8,{density:.007,friction:.4,restitution:.1,frictionAir:0});addBody(gr,{kind:'grain',mat:'sand',r:8});Sleeping.set(gr,false);Body.setVelocity(gr,{x:b.velocity.x*.7+rnd(-4,4),y:b.velocity.y*.5+rnd(-6,1)})}
  burst(x,y,'sand',26);return}
 if(i.kind=='proj'||i.kind=='grain')return;
 const big=i.kind=='core';st.score+=big?1000:(i.mat=='brass'?150:i.kind=='gear'?120:100);
 st.breaks.push(st.simT);if(rec)rec.ev.push([rec.f.length,x,y,i.mat||i.kind]);
 burst(x,y,i.mat||i.kind,big?60:22);
 if(big){SFX.core();cores=cores.filter(c=>c!==b);shake=16;toastPop(cores.length?'¡Núcleo roto!':'¡TIEMPO ROTO!',900);if(!cores.length){st.slow=Math.max(st.slow,1.4);SFX.slow()}}
 else if(i.mat=='glass'||i.mat=='jelly')SFX.glass(.6);else SFX.metal(.8);
 for(const o of live)if(o.isSleeping&&Math.abs(o.position.x-x)<170&&Math.abs(o.position.y-y)<260)Sleeping.set(o,false);
 // reacción en cadena
 const recent=st.breaks.filter(t=>st.simT-t<.6).length;
 if(recent>=4&&st.slow<=0&&st.phase=='fly'){st.slow=1.5;st.chain=(st.chain||0)+1;SFX.slow();toastPop('¡REACCIÓN EN CADENA!',1100);st.score+=500}}
// ---------- partículas ----------
const DIG='0123456789';
function cap(){return QUAL>1?420:QUAL>0?220:110}
function burst(x,y,mat,n){n=Math.round(n*(QUAL>1?1:QUAL>0?.6:.35));
 const pal=mat=='glass'?['#bff7f1','#6fe6dc','#fff8e6',MAG]:mat=='jelly'?['#ff7ad6','#a8ffd9','#fff',MAG]:mat=='core'?[MAG,'#ffd36b','#fff','#bff7f1']:mat=='sand'?['#ffd98a','#e8b061','#c98a3a']:['#ffe2a8',BRASS,'#ffd36b','#fff'];
 for(let k=0;k<n&&parts.length<cap();k++){const a=Math.random()*7,v=rnd(2,mat=='core'?11:8);const t=mat=='sand'?'sand':Math.random()<.55?'num':'shard';
  parts.push({t,x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,a:Math.random()*7,va:rnd(-.3,.3),l:1,d:rnd(.012,.025),c:pal[k%pal.length],s:rnd(.6,1.4)*(mat=='core'?1.4:1),ch:mat=='core'?['XII','III','VI','IX',':','∞'][k%6]:DIG[k%10]})}
 parts.push({t:'ring',x,y,l:1,d:.05,s:mat=='core'?1.8:1,c:mat=='core'?MAG:'#bff7f1'})}
function stepParts(k){for(const p of parts){if(p.t=='ring'){p.l-=p.d*k;continue}p.vy+=.25*k;p.x+=p.vx*k;p.y+=p.vy*k;p.a+=p.va*k;p.l-=p.d*k;if(p.y>GROUND-3&&p.vy>0){p.y=GROUND-3;p.vy*=-.35;p.vx*=.7}}parts=parts.filter(p=>p.l>0)}
function drawParts(){for(const p of parts){ctx.globalAlpha=Math.max(0,Math.min(1,p.l*1.4));
  if(p.t=='ring'){const r=(1-p.l)*90*p.s;ctx.strokeStyle=p.c;ctx.lineWidth=4*p.l;ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);ctx.stroke();continue}
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.c;
  if(p.t=='num'){ctx.font='bold '+Math.round(18*p.s)+'px Georgia';ctx.fillText(p.ch,0,0)}
  else if(p.t=='sand'){ctx.fillRect(-2,-2,4*p.s,4*p.s)}
  else{ctx.beginPath();ctx.moveTo(-7*p.s,-4*p.s);ctx.lineTo(8*p.s,-2*p.s);ctx.lineTo(-1,7*p.s);ctx.closePath();ctx.fill()}
  ctx.restore()}ctx.globalAlpha=1}
// ---------- dibujo de piezas ----------
function rr4(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function drawPiece(i,x,y,a,hpf,frz,id){if(!i)return;ctx.save();ctx.translate(x,y);ctx.rotate(a);
 if(i.kind=='block'){const w=i.w,h=i.h;
  if(i.mat=='glass'){const gr=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);gr.addColorStop(0,'rgba(190,255,248,.78)');gr.addColorStop(.5,'rgba(63,167,160,.55)');gr.addColorStop(1,'rgba(20,90,95,.7)');
   rr4(ctx,-w/2,-h/2,w,h,3);ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle='rgba(230,255,252,.9)';ctx.lineWidth=1.6;ctx.stroke();
   ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(-w/2+3,-h/2+3);ctx.lineTo(-w/2+3+Math.min(w,h)*.45,-h/2+3);ctx.lineTo(-w/2+3,-h/2+3+Math.min(w,h)*.8);ctx.fill();
   if(w>=26&&h>=26||w>60||h>60){ctx.fillStyle='rgba(255,248,225,.8)';ctx.font='bold '+Math.round(Math.min(w,h)*.42)+'px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';if(h>w*1.6){ctx.rotate(-Math.PI/2)}ctx.fillText(i.label,0,1);if(h>w*1.6)ctx.rotate(Math.PI/2)}
  } else if(i.mat=='jelly'){const wob=1+Math.sin(time*9+id)*.03;ctx.scale(wob,2-wob);const pink=(id%2)==0;const gr=ctx.createLinearGradient(0,-h/2,0,h/2);
   gr.addColorStop(0,pink?'rgba(255,170,230,.85)':'rgba(190,255,215,.85)');gr.addColorStop(1,pink?'rgba(200,20,140,.7)':'rgba(30,170,110,.7)');
   rr4(ctx,-w/2,-h/2,w,h,6);ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.4;ctx.stroke();
   ctx.fillStyle='rgba(255,255,255,.45)';rr4(ctx,-w/2+4,-h/2+3,w*.5,Math.min(6,h*.2),3);ctx.fill();
   if(w>=26&&h>=26){ctx.fillStyle='rgba(80,0,60,.45)';ctx.font='bold '+Math.round(Math.min(w,h)*.4)+'px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i.label,0,1)}
  } else {const gr=ctx.createLinearGradient(0,-h/2,0,h/2);gr.addColorStop(0,'#ffe2a8');gr.addColorStop(.35,'#d99050');gr.addColorStop(.7,BRASS);gr.addColorStop(1,'#4a250a');
   ctx.fillStyle=gr;ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeStyle='#2a1406';ctx.lineWidth=1.5;ctx.strokeRect(-w/2,-h/2,w,h);
   ctx.strokeStyle='rgba(255,230,180,.35)';ctx.beginPath();ctx.moveTo(-w/2+4,-h/2+4);ctx.lineTo(w/2-4,-h/2+4);ctx.stroke();
   ctx.fillStyle='#fff0c8';const rv=[[-1,-1],[1,-1],[-1,1],[1,1]];for(const[sx,sy]of rv){ctx.beginPath();ctx.arc(sx*(w/2-5),sy*(h/2-5),1.8,0,7);ctx.fill()}}
  if(hpf<.99){ctx.strokeStyle=i.mat=='brass'?'rgba(30,10,0,.7)':'rgba(255,255,255,.9)';ctx.lineWidth=1.2;const rr=mulberry(i.cr);const n=Math.ceil((1-hpf)*6);
   for(let k=0;k<n;k++){let px=(rr()-.5)*w*.6,py=(rr()-.5)*h*.6;ctx.beginPath();ctx.moveTo(px,py);for(let j=0;j<3;j++){px+=(rr()-.5)*w*.5;py+=(rr()-.5)*h*.5;ctx.lineTo(Math.max(-w/2,Math.min(w/2,px)),Math.max(-h/2,Math.min(h/2,py)))}ctx.stroke()}}
  if(frz){ctx.fillStyle='rgba(255,63,208,.28)';ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeStyle='rgba(255,190,240,.9)';ctx.lineWidth=2;ctx.strokeRect(-w/2-1,-h/2-1,w+2,h+2)}
 } else if(i.kind=='gear'){const sp=gearSprite(i.r,i.teeth,i.tone);ctx.drawImage(sp,-sp.width/2,-sp.height/2);if(frz){ctx.fillStyle='rgba(255,63,208,.3)';ctx.beginPath();ctx.arc(0,0,i.r,0,7);ctx.fill()}}
 else if(i.kind=='core'){ctx.rotate(-a);ctx.globalCompositeOperation='lighter';const gl=glowSprite(GLOW_M),pul=1+Math.sin(time*5+i.ph)*.12;ctx.drawImage(gl,-48*pul,-48*pul,96*pul,96*pul);ctx.globalCompositeOperation='source-over';ctx.rotate(a);
  clockFace(ctx,i.r,false,false);ctx.fillStyle=MAG;ctx.beginPath();ctx.arc(0,0,i.r*.22,0,7);ctx.fill();
  ctx.strokeStyle='#3a0630';ctx.lineCap='round';ctx.lineWidth=2.5;ctx.save();ctx.rotate(time*1.5+i.ph);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-i.r*.55);ctx.stroke();ctx.restore();
  ctx.lineWidth=1.3;ctx.strokeStyle=MAG;ctx.save();ctx.rotate(time*9+i.ph);ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(0,-i.r*.8);ctx.stroke();ctx.restore();
  if(hpf<.99){ctx.strokeStyle='rgba(80,0,60,.8)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-i.r*.6,-i.r*.3);ctx.lineTo(0,0);ctx.lineTo(i.r*.5,i.r*.6);ctx.stroke()}}
 else if(i.kind=='proj'||i.kind=='grain'){drawProj(i)}
 ctx.restore()}
function drawProj(i){const r=i.r;
 if(i.ch=='arena'||i.kind=='grain'){const gr=ctx.createRadialGradient(-r*.3,-r*.4,1,0,0,r);gr.addColorStop(0,'#fff0c0');gr.addColorStop(.5,'#e8b061');gr.addColorStop(1,'#8a5523');ctx.fillStyle=gr;ctx.beginPath();for(let k=0;k<=12;k++){const a=k/12*Math.PI*2,rr=r*(1+Math.sin(k*2.7)*.08);ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.fill();
  ctx.fillStyle='rgba(90,40,10,.5)';for(let k=0;k<6;k++)ctx.fillRect(Math.cos(k*1.7)*r*.5,Math.sin(k*2.3)*r*.5,2,2)}
 else if(i.ch=='tic'){ctx.rotate(-Math.PI/2*0);const bg=ctx.createRadialGradient(-5,-6,2,0,0,r);bg.addColorStop(0,'#ffcf8f');bg.addColorStop(.6,BRASS);bg.addColorStop(1,'#3c1d07');ctx.fillStyle=bg;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
  for(const sx of[-6,6]){ctx.fillStyle='#6fe6dc';ctx.beginPath();ctx.arc(sx,-3,5,0,7);ctx.fill();ctx.fillStyle='#071010';ctx.beginPath();ctx.arc(sx+1,-3,2,0,7);ctx.fill()}
  ctx.fillStyle='#ffb43a';ctx.beginPath();ctx.moveTo(-2,2);ctx.lineTo(2,2);ctx.lineTo(0,7);ctx.fill();ctx.fillStyle='#7a4216';ctx.beginPath();ctx.moveTo(-r,-2);ctx.lineTo(-r-10,-8+Math.sin(time*30)*6);ctx.lineTo(-r+2,6);ctx.moveTo(r,-2);ctx.lineTo(r+10,-8-Math.sin(time*30)*6);ctx.lineTo(r-2,6);ctx.fill()}
 else {const bg=ctx.createRadialGradient(-6,-7,2,0,0,r);bg.addColorStop(0,'#fff6d6');bg.addColorStop(.45,'#e8b061');bg.addColorStop(1,'#4a250a');ctx.fillStyle=bg;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
  ctx.strokeStyle='rgba(60,25,5,.6)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,r*.65,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.65,0);ctx.lineTo(r*.65,0);ctx.moveTo(0,-r*.65);ctx.lineTo(0,r*.65);ctx.stroke()}}
function drawGroundAndPeds(){
 const gr=ctx.createLinearGradient(0,GROUND,0,GROUND+80);gr.addColorStop(0,WORLD==1?'#e8b061':'#ff9be6');gr.addColorStop(.15,WORLD==1?BRASS:'#a3167a');gr.addColorStop(1,'#1a0c04');
 ctx.fillStyle=gr;ctx.fillRect(-800,GROUND,3000,3000);ctx.fillStyle='rgba(255,240,200,.5)';
 for(let x=-600;x<2000;x+=50){ctx.fillRect(x,GROUND+2,2,x%250==0?16:8)}
 ctx.fillStyle='rgba(30,15,5,.5)';for(let x=-575;x<2000;x+=100){ctx.beginPath();ctx.arc(x,GROUND+30,3,0,7);ctx.fill()}
 for(const b of world.bodies){const i=b.plugin.info;if(i&&i.kind=='ped'){ctx.save();ctx.translate(b.position.x,b.position.y);const pg=ctx.createLinearGradient(-i.w/2,0,i.w/2,0);pg.addColorStop(0,'#3c1d07');pg.addColorStop(.3,BRASS);pg.addColorStop(.5,'#ffd08a');pg.addColorStop(.7,BRASS);pg.addColorStop(1,'#3c1d07');
  ctx.fillStyle=pg;ctx.fillRect(-i.w/2,-i.h/2,i.w,i.h);ctx.fillStyle='rgba(20,10,0,.35)';for(let y=-i.h/2+14;y<i.h/2;y+=24)ctx.fillRect(-i.w/2+6,y,i.w-12,3);ctx.strokeStyle='#ffe2a8';ctx.lineWidth=2;ctx.strokeRect(-i.w/2,-i.h/2,i.w,i.h);ctx.restore()}}}
// ---------- partida ----------
let curDef=null,duel=null,tutHand=0;
function loadLevel(def,mode){replay=null;$('rep').style.display='none';paused=false;newEngine();LABEL=0;curDef=def;st.mode=mode;st.shots=def.shots;st.score=0;st.phase='aim';st.simT=0;st.breaks=[];st.slow=0;st.frozen=0;st.fast=false;st.chain=0;st.proj=null;st.aim=null;st.firstShot=true;st.ended=false;
 st.uses={freeze:mode=='level'&&st.lvl<UNLOCK.freeze?0:(st.lvl>=12||mode!='level'?2:1),rew:mode=='level'&&st.lvl<UNLOCK.rew?0:1,fast:!(mode=='level'&&st.lvl<UNLOCK.fast)};
 const nw=(mode=='level'&&st.lvl>=10)||(mode!='level'&&def.s.some(x=>JSON.stringify(x).includes('jelly')))?2:1;if(nw!=WORLD){WORLD=nw;buildBg();initDeco()}
 for(const s of def.s)BUILD[s[0]](...s.slice(1));
 bestRec=null;rec=null;snapshot=null;parts=[];tutHand=def.tut=='aim'&&!save.seen.aim?1:0;
 $('lvName').textContent=mode=='level'?(st.lvl+1)+'. '+def.n:mode=='daily'?'🕰 Torre del día':('⚔ '+duel.names[duel.turn]);
 showScr(null);$('hud').classList.add('on');$('powers').classList.add('on');updHud();
 if(mode=='level'){for(const k of['freeze','rew','fast'])if(st.lvl==UNLOCK[k]&&!save.seen[k]){save.seen[k]=1;persist();setTimeout(()=>toastPop({freeze:'¡Nuevo poder: CONGELAR!',rew:'¡Nuevo poder: REBOBINAR!',fast:'¡Nuevo poder: ACELERAR!'}[k],1800),400);st.hint=k}}
 SFX.tick(true)}
function updHud(){$('shots').textContent='●'.repeat(st.shots)+'○'.repeat(Math.max(0,curDef.shots-st.shots));$('score').textContent=st.score;
 const f=$('pFreeze'),r=$('pRew'),q=$('pFast');
 f.classList.toggle('hide',st.mode=='level'&&st.lvl<UNLOCK.freeze);r.classList.toggle('hide',st.mode=='level'&&st.lvl<UNLOCK.rew);q.classList.toggle('hide',st.mode=='level'&&st.lvl<UNLOCK.fast);
 f.querySelector('.n').textContent=st.uses.freeze;r.querySelector('.n').textContent=st.uses.rew;
 f.classList.toggle('off',!(st.uses.freeze>0&&st.phase=='fly'&&!st.frozen));r.classList.toggle('off',!(st.uses.rew>0&&snapshot&&!st.ended));q.classList.toggle('off',!(st.phase=='fly'));q.style.borderColor=st.fast?'#6fe6dc':'';
 f.classList.toggle('hint',st.hint=='freeze'&&st.phase=='fly'&&st.uses.freeze>0);r.classList.toggle('hint',st.hint=='rew'&&!!snapshot&&st.phase=='aim'&&st.uses.rew>0);q.classList.toggle('hint',st.hint=='fast'&&st.phase=='fly')}
function takeSnapshot(){snapshot={score:st.score,shots:st.shots,bodies:live.filter(b=>{const k=b.plugin.info.kind;return k!='proj'&&k!='grain'}).map(b=>({b,x:b.position.x,y:b.position.y,a:b.angle,hp:b.plugin.hp}))}}
function fire(vx,vy){const c=chr();takeSnapshot();st.shots--;st.phase='fly';st.simT=0;st.settleT=0;st.breaks=[];st.chain=0;st.tapBoost=c.id=='tic';
 const b=Bodies.circle(ANCHOR.x,ANCHOR.y-40,c.r,{density:c.dens,frictionAir:0,friction:.4,restitution:.2});addBody(b,{kind:'proj',ch:c.id,r:c.r});Sleeping.set(b,false);Body.setVelocity(b,{x:vx,y:vy});st.proj=b;
 rec={f:[],ev:[],info:{},score0:st.score};SFX.launch();if(tutHand){tutHand=0;save.seen.aim=1;persist()}updHud()}
function aimVec(){const a=st.aim;if(!a)return null;const c=chr();let dx=a.sx-a.cx,dy=a.sy-a.cy;const md=Math.min(W,H)*.32;let L=Math.hypot(dx,dy);if(L<8)return null;const p=Math.min(1,L/md);
 let mult=1;if(c.id=='pendulo')mult=.72+.6*Math.min(1,a.hold/1.4);const v=c.vmax*p*mult;return{vx:dx/L*v,vy:dy/L*v,p}}
function preview(v,steps){const pts=[];let x=ANCHOR.x,y=ANCHOR.y-40,vx=v.vx,vy=v.vy;for(let i=0;i<steps;i++){for(let k=0;k<3;k++){vy+=G;x+=vx;y+=vy}pts.push([x,y]);if(y>GROUND)break}return pts}
function settled(){if(st.simT<1.3)return false;if(st.simT>9)return true;for(const b of live){if(b.isSleeping||b.isStatic)continue;if(b.speed>.35||Math.abs(b.angularVelocity)>.02)return false}return true}
function endShot(){const breaks=rec?rec.ev.length:0;if(rec&&(!bestRec||breaks>=bestRec.ev.length))bestRec=rec;rec=null;st.proj=null;
 for(const b of live.slice()){const k=b.plugin.info.kind;if(k=='proj'||k=='grain'){Composite.remove(world,b);live=live.filter(x=>x!==b)}}
 if(!cores.length)return finish(true);if(st.shots<=0)return finish(false);st.phase='aim';updHud()}
function starsFor(win){if(!win)return 0;return st.shots>=2?3:st.shots==1?2:1}
function finish(win){st.phase='done';st.ended=true;const bonus=win?st.shots*1500:0;st.score+=bonus;updHud();
 setTimeout(()=>{if(st.mode=='duel')return duelNext();const s=starsFor(win);let txt='';
  if(st.mode=='level'){const k=st.lvl;if(s>(save.stars[k]||0))save.stars[k]=s;if(st.score>(save.best[k]||0))save.best[k]=st.score;persist();txt=win?`Puntos: <b>${st.score}</b>${bonus?' (bonus tiros +'+bonus+')':''}`:'Se acabaron los tiros… el tiempo sigue en pie.'}
  else{const d=todaySeed();const prev=save.daily[d]||0;if(st.score>prev)save.daily[d]=st.score;persist();txt=`Puntos: <b>${st.score}</b> · tu mejor hoy: ${Math.max(prev,st.score)}<br><small>Torre ${d} — mañana cambia</small>`}
  $('rTitle').textContent=win?(s==3?'¡Tiempo hecho añicos!':'¡Tiempo roto!'):'El reloj resiste';$('rText').innerHTML=txt;
  const ss=[...$('rStars').children];ss.forEach(e=>e.classList.remove('on'));ss.forEach((e,i)=>{if(i<s)setTimeout(()=>{e.classList.add('on');SFX.chime(i)},350+i*380)});
  $('rStars').style.display=st.mode=='daily'?'none':'';$('rNext').style.display=st.mode=='level'&&win&&st.lvl<LEVELS.length-1?'':'none';$('rRep').style.display=bestRec&&bestRec.f.length?'':'none';
  showScr('sResult');if(!win)SFX.lose()},win?1400:600)}
// ---------- poderes ----------
function doFreeze(){if(!(st.uses.freeze>0&&st.phase=='fly'&&!st.frozen))return;st.uses.freeze--;st.frozen=2;SFX.freeze();toastPop('❄ ¡CONGELADO!',700);
 for(const b of live){const k=b.plugin.info.kind;if(k=='proj'||k=='grain')continue;b.plugin.fv={x:b.velocity.x,y:b.velocity.y,w:b.angularVelocity};b.plugin.m0=b.mass;Body.setStatic(b,true);b.plugin.frz=1}
 st.hint=null;updHud()}
function unfreeze(){for(const b of live){if(!b.plugin.frz)continue;Body.setStatic(b,false);b.plugin.frz=0;Sleeping.set(b,false);const v=b.plugin.fv;if(v){Body.setVelocity(b,{x:v.x,y:v.y});Body.setAngularVelocity(b,v.w)}}st.frozen=0;updHud()}
function doRewind(){if(!(st.uses.rew>0&&snapshot&&!st.ended))return;st.uses.rew--;if(st.frozen)unfreeze();SFX.rewind();
 for(const b of live.slice())if(!b.isStatic||b.plugin.frz)Composite.remove(world,b);for(const b of world.bodies.slice()){if(b.plugin.info&&(b.plugin.info.kind=='proj'||b.plugin.info.kind=='grain'))Composite.remove(world,b)}
 live=[];cores=[];for(const s of snapshot.bodies){const b=s.b;b.plugin.gone=0;b.plugin.dead=0;b.plugin.hp=s.hp;Body.setPosition(b,{x:s.x,y:s.y});Body.setAngle(b,s.a);Body.setVelocity(b,{x:0,y:0});Body.setAngularVelocity(b,0);Composite.add(world,b);live.push(b);Sleeping.set(b,true);if(b.plugin.info.kind=='core')cores.push(b)}
 st.score=snapshot.score;st.shots=snapshot.shots;st.phase='aim';st.proj=null;rec=null;st.slow=0;parts=[];snapshot=null;st.hint=null;rewFx=1;toastPop('⏪ ¡Rebobinado!',800);updHud()}
function doFast(){if(st.phase!='fly')return;st.fast=!st.fast;SFX.fast();st.hint=null;updHud()}
let rewFx=0;
// ---------- duelo ----------
function startDuel(vsBot){const seed=(Math.random()*1e9)|0;duel={seed,vsBot,turn:0,scores:[0,0],names:['Jugador 1',vsBot?'Relojero Loco 🤖':'Jugador 2'],chars:[save.char,vsBot?(Math.random()*3|0):save.char]};duelTurn()}
function duelTurn(){st.char=duel.chars[duel.turn];const def=dailyDef(duel.seed,3);loadLevel(def,'duel');st.uses.fast=true;toastPop('Turno: '+duel.names[duel.turn],1200);if(duel.vsBot&&duel.turn==1)botPlan()}
function duelNext(){duel.scores[duel.turn]=st.score;if(duel.turn==0){duel.turn=1;showScr(null);setTimeout(duelTurn,300);return}
 st.char=null;const[a,b]=duel.scores;$('rTitle').textContent=a==b?'¡Empate temporal!':(a>b?duel.names[0]:duel.names[1])+' gana';
 $('rText').innerHTML=`${duel.names[0]}: <b>${a}</b><br>${duel.names[1]}: <b>${b}</b>`;$('rStars').style.display='none';$('rNext').style.display='none';$('rRep').style.display=bestRec?'':'none';showScr('sResult');SFX.chime(2)}
let bot=null;
function botPlan(){bot={t:0,shot:null}}
function botThink(dt){if(!bot||st.mode!='duel'||duel.turn!=1)return;if(st.phase=='fly'){if(st.uses.freeze>0&&st.simT>.5&&Math.random()<.004)doFreeze();return}if(st.phase!='aim')return;
 bot.t+=dt;if(!bot.shot){const tg=cores[Math.random()*cores.length|0];if(!tg)return;let best=null,bd=1e9;const c=chr();
  for(let k=0;k<160;k++){const ang=-.2-Math.random()*1.25,p=.55+Math.random()*.45,v=c.vmax*p*(c.id=='pendulo'?1.2:1);const vv={vx:Math.cos(ang)*v,vy:Math.sin(ang)*v};const pts=preview(vv,80);let d=1e9;for(const q of pts)d=Math.min(d,Math.hypot(q[0]-tg.position.x,q[1]-tg.position.y+10));if(d<bd){bd=d;best=vv}}
  const err=.92+Math.random()*.14;bot.shot={vx:best.vx*err,vy:best.vy*err};bot.t=0}
 const k=Math.min(1,bot.t/1.1);const md=Math.min(W,H)*.32,c=chr();const v=bot.shot;const sp=Math.hypot(v.vx,v.vy);const p=Math.min(1,sp/(c.vmax*(c.id=='pendulo'?1.32:1)));
 const sx=W*.3,sy=H*.5;st.aim={sx,sy,cx:sx-v.vx/sp*md*p*k,cy:sy-v.vy/sp*md*p*k,hold:1.5*k,bot:1};
 if(bot.t>1.4){st.aim=null;fire(v.vx,v.vy);bot.shot=null}}
// ---------- repetición ----------
function recordFrame(){if(!rec)return;const fr=[];for(const b of world.bodies){const i=b.plugin.info;if(!i||i.kind=='ground'||i.kind=='ped')continue;rec.info[b.id]=i;fr.push(b.id,b.position.x,b.position.y,b.angle,b.plugin.hp/(b.plugin.max||1))}if(rec.f.length<1400)rec.f.push(fr)}
function startReplay(){if(!bestRec)return;replay={r:bestRec,t:0,ev:0,parts:[]};parts=[];showScr(null);$('rep').style.display='block';$('hud').classList.remove('on');$('powers').classList.remove('on')}
function stopReplay(){replay=null;$('rep').style.display='none';parts=[];showScr('sResult')}
// ---------- cámara ----------
function camera(){const vw=portrait?1170:1500;S=Math.min(W/vw,H/(portrait?900:860));TX=portrait?-95*S+(W-1170*S)/2:(W-1300*S)/2-20*S;TY=portrait?H*.8-GROUND*S:H-845*S}
function toWorld(x,y){return{x:(x-TX)/S,y:(y-TY)/S}}
// ---------- render ----------
function render(dt){
 drawBackground();
 ctx.save();const sh=shake>0?shake:0;ctx.translate(TX+(Math.random()-.5)*sh,TY+(Math.random()-.5)*sh);ctx.scale(S,S);
 drawGroundAndPeds();
 if(st.mode!='menu'&&world){
  const c=chr();
  // lanzador
  const lx=ANCHOR.x,ly=ANCHOR.y;let o={};const av=aimVec();if(av){o.lx=av.vx/20;o.ly=av.vy/20}
  if(st.aim&&c.id=='pendulo')o.swing=Math.min(1,st.aim.hold/1.4);
  ctx.save();ctx.fillStyle='#2a1406';ctx.fillRect(lx-50,ly+60,100,GROUND-ly-60);const pg=ctx.createLinearGradient(lx-50,0,lx+50,0);pg.addColorStop(0,'#3c1d07');pg.addColorStop(.5,'#e8b061');pg.addColorStop(1,'#3c1d07');ctx.fillStyle=pg;ctx.fillRect(lx-58,ly+56,116,14);ctx.restore();
  if(!(replay))drawChar(ctx,c.id,lx,ly-6,1.3,time,o);
  if(av&&st.phase=='aim'&&!replay){const pts=preview(av,c.prev);ctx.fillStyle=c.id=='tic'?'rgba(111,230,220,.9)':'rgba(255,240,200,.85)';pts.forEach((q,k)=>{ctx.globalAlpha=1-k/pts.length*.8;ctx.beginPath();ctx.arc(q[0],q[1],4.5-k/pts.length*2.5,0,7);ctx.fill()});ctx.globalAlpha=1;
   ctx.strokeStyle=MAG;ctx.lineWidth=3;ctx.beginPath();ctx.arc(lx,ly-40,30,-Math.PI/2,-Math.PI/2+av.p*Math.PI*2);ctx.stroke()}
  if(replay){const r=replay.r,fi=Math.min(r.f.length-1,replay.t|0),fr=r.f[fi];for(let k=0;k<fr.length;k+=5)drawPiece(r.info[fr[k]],fr[k+1],fr[k+2],fr[k+3],fr[k+4],0,fr[k])}
  else for(const b of world.bodies){const i=b.plugin.info;if(!i||i.kind=='ground'||i.kind=='ped')continue;drawPiece(i,b.position.x,b.position.y,b.angle,b.plugin.hp/(b.plugin.max||1),b.plugin.frz,b.id)}
  if(st.proj&&!replay){const p=st.proj;if(QUAL>0&&parts.length<cap())parts.push({t:'shard',x:p.position.x,y:p.position.y,vx:0,vy:0,a:Math.random()*7,va:0,l:.6,d:.04,c:Math.random()<.5?MAG:'#ffd36b',s:.5})}
  ctx.globalCompositeOperation='lighter';drawParts();ctx.globalCompositeOperation='source-over';
  if(tutHand&&st.phase=='aim'){const k=(time*.7)%1,e=Math.min(1,k*1.6);const hx=lx+60-e*110,hy=ly-30+e*70;ctx.strokeStyle='rgba(255,240,200,.7)';ctx.setLineDash([8,8]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(lx+60,ly-30);ctx.lineTo(hx,hy);ctx.stroke();ctx.setLineDash([]);
   ctx.font='54px serif';ctx.globalAlpha=k<.85?1:(1-k)*6;ctx.fillText('👆',hx-20,hy+40);ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.font='bold 30px Georgia';ctx.textAlign='center';ctx.fillText('Arrastra atrás ✦ suelta',lx+150,ly-150);ctx.textAlign='left'}
 }
 ctx.restore();
 // efectos de tiempo a pantalla
 if(st.slow>0||replay){const a=replay?.35:Math.min(.5,st.slow*.4);const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.7);vg.addColorStop(0,'rgba(255,63,208,0)');vg.addColorStop(1,`rgba(255,63,208,${a})`);ctx.fillStyle=vg;ctx.fillRect(0,0,W,H)}
 if(st.frozen>0){ctx.fillStyle='rgba(255,180,240,.08)';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(255,63,208,.7)';ctx.lineWidth=6;ctx.strokeRect(3,3,W-6,H-6)}
 if(rewFx>0){ctx.fillStyle=`rgba(110,255,240,${rewFx*.35})`;ctx.fillRect(0,0,W,H);for(let i=0;i<10;i++){ctx.fillStyle=`rgba(255,255,255,${rewFx*.3})`;ctx.fillRect(0,Math.random()*H,W,2)}}
 if(st.aim&&chr().id=='tic'&&st.phase=='aim'){ctx.fillStyle='rgba(63,167,160,.12)';ctx.fillRect(0,0,W,H)}
}
// ---------- bucle ----------
let acc=0,last=performance.now(),fpsT=0,fpsN=0,lowStreak=0;
function loop(now){requestAnimationFrame(loop);let dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;
 fpsT+=dt;fpsN++;if(fpsT>2){const fps=fpsN/fpsT;fpsT=0;fpsN=0;if(fps<48&&QUAL>0&&st.mode!='menu'){lowStreak++;if(lowStreak>=1){QUAL--;resize();lowStreak=0}}else lowStreak=0;$('qNote').textContent='Calidad: '+['baja','media','alta'][QUAL]+' · '+Math.round(fps)+' fps'}
 shake=Math.max(0,shake-dt*40);rewFx=Math.max(0,rewFx-dt*2);if(st.aim)st.aim.hold+=dt;
 if(replay){replay.t+=dt*60*.38;const r=replay.r;while(replay.ev<r.ev.length&&r.ev[replay.ev][0]<=replay.t){const e=r.ev[replay.ev++];burst(e[1],e[2],e[3],22);SFX.glass(.4)}stepParts(.38);if(replay.t>=r.f.length+30)stopReplay();render(dt);return}
 if(world&&st.mode!='menu'&&!paused){botThink(dt);
  let ts=1;if(st.slow>0){st.slow-=dt;ts=.28}else if(st.fast)ts=2.4;if(st.aim&&chr().id=='tic'&&st.phase=='aim')ts=.25;
  if(st.frozen>0){st.frozen-=dt;if(st.frozen<=0)unfreeze()}
  acc+=dt*ts*60;let n=0;while(acc>=1&&n<6){acc-=1;n++;
   if(st.proj&&st.firstShot&&st.mode=='level'&&st.lvl==0&&cores[0]&&!st.proj.plugin.hit){const p=st.proj,tg=cores[0].position;const dx=tg.x-p.position.x;if(dx>0&&dx<520){const ty=tg.y+230;Body.setVelocity(p,{x:p.velocity.x,y:p.velocity.y+(ty-p.position.y)*.004})}}
   Engine.update(engine,STEP);if(st.phase=='fly')st.simT+=STEP/1000;
   while(removeQ.length){const[b,how]=removeQ.shift();breakBody(b,how)}
   for(const c of cores.slice())if(c.position.y-c.plugin.sy>90||c.position.x>1750||c.position.x<-300){c.plugin.dead=1;breakBody(c,'fall')}
   for(const b of live.slice())if(b.position.y>1300||b.position.x>2200||b.position.x<-600){Composite.remove(world,b);live=live.filter(x=>x!==b)}
   if(st.phase=='fly'){recordFrame();if(settled()||(!cores.length&&st.simT>2.2)){st.firstShot=false;endShot()}}
   stepParts(1)}
  if(acc>6)acc=0;
  $('score').textContent=st.score}
 if(st.mode=='menu')stepParts(dt*60);
 if(st.phase=='fly'||st.phase=='aim')updHudThrottle();
 render(dt)}
let hudT=0;function updHudThrottle(){if(time-hudT>.2){hudT=time;updHud()}}
// ---------- entrada ----------
let paused=false;
cv.addEventListener('pointerdown',e=>{audioInit();if(AC&&AC.state=='suspended')AC.resume();
 if(st.mode=='menu'||paused||replay)return;if(st.mode=='duel'&&duel.vsBot&&duel.turn==1)return;
 if(st.phase=='fly'&&st.tapBoost&&st.proj&&!st.proj.plugin.hit){st.tapBoost=false;const p=st.proj;Body.setVelocity(p,{x:p.velocity.x*1.55,y:p.velocity.y*1.3+2});SFX.boost();burst(p.position.x,p.position.y,'core',10);toastPop('¡PICADO!',500);return}
 if(st.phase!='aim')return;cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);st.aim={sx:e.clientX,sy:e.clientY,cx:e.clientX,cy:e.clientY,hold:0,id:e.pointerId};SFX.tick()});
cv.addEventListener('pointermove',e=>{if(!st.aim||st.aim.bot||e.pointerId!==st.aim.id)return;st.aim.cx=e.clientX;st.aim.cy=e.clientY;aimPar=(st.aim.sx-e.clientX)*.08});
function release(e){if(!st.aim||st.aim.bot||e.pointerId!==st.aim.id)return;const v=aimVec();st.aim=null;aimPar=0;if(v&&v.p>.12&&st.phase=='aim')fire(v.vx,v.vy)}
cv.addEventListener('pointerup',release);cv.addEventListener('pointercancel',e=>{if(st.aim&&!st.aim.bot)st.aim=null});
function tap(id,f){$(id).addEventListener('click',e=>{audioInit();if(AC&&AC.state=='suspended')AC.resume();SFX.tick(true);f(e)})}
// ---------- UI ----------
let toastTm=0;function toastPop(t,ms){const el=$('toast');el.textContent=t;el.classList.add('on');clearTimeout(toastTm);toastTm=setTimeout(()=>el.classList.remove('on'),ms||900)}
function showScr(id){document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id==id))}
function goMenu(){st.mode='menu';st.char=null;duel=null;bot=null;paused=false;$('hud').classList.remove('on');$('powers').classList.remove('on');
 if(WORLD!=1){WORLD=1;buildBg();initDeco()}newEngine();
 const tot=Object.values(save.stars).reduce((a,b)=>a+b,0);$('mStars').textContent='★ '+tot+' / '+LEVELS.length*3+(save.daily[todaySeed()]?' · Torre de hoy: '+save.daily[todaySeed()]:'');$('charName').textContent=CHARS[save.char].name;showScr('sMenu')}
let mapW=1;
function showMap(w){mapW=w;const g=$('lvGrid');g.innerHTML='';g.parentElement.classList.toggle('w2',w==2);$('wTitle').textContent=w==1?'Mundo 1 · Reloj de Bolsillo':'Mundo 2 · Big Ben de Gelatina';
 for(let i=(w-1)*10;i<w*10;i++){const ok=i==0||(save.stars[i-1]||0)>0;const d=document.createElement('div');d.className='lv'+(ok?'':' lock');const s=save.stars[i]||0;
  d.innerHTML=(ok?(i+1):'🔒')+'<small>'+'★'.repeat(s)+'☆'.repeat(3-s)+'</small>';if(ok)d.onclick=()=>{audioInit();SFX.tick(true);st.lvl=i;st.char=null;loadLevel(LEVELS[i],'level')};g.appendChild(d)}
 showScr('sMap')}
function buildChars(){const L=$('charList');L.innerHTML='';CHARS.forEach((c,i)=>{const d=document.createElement('div');d.className='ch'+(i==save.char?' sel':'');d.innerHTML=`<canvas width="300" height="300"></canvas><b>${c.name}</b><p>${c.desc}</p>`;d.onclick=()=>{save.char=i;persist();SFX.tick(true);buildChars()};L.appendChild(d)})}
function animChars(){if(!$('sChars').classList.contains('on'))return;document.querySelectorAll('#charList canvas').forEach((cn,i)=>{const g=cn.getContext('2d');g.clearRect(0,0,300,300);const gr=g.createRadialGradient(150,150,10,150,150,150);gr.addColorStop(0,'rgba(255,63,208,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,300,300);
  const sp=gearSprite(70,18,1);g.save();g.globalAlpha=.35;g.translate(150,150);g.rotate(time*.4);g.drawImage(sp,-sp.width/2,-sp.height/2);g.restore();drawChar(g,CHARS[i].id,150,170,1.55,time+i,{swing:i==0?(Math.sin(time)*.5+.5):0,lx:Math.sin(time),ly:Math.cos(time*.7)*.5})});requestAnimationFrame(animChars)}
tap('mPlay',()=>showMap(mapW));tap('mapBack',goMenu);tap('tW1',()=>showMap(1));tap('tW2',()=>showMap(2));
tap('mChar',()=>{buildChars();showScr('sChars');animChars()});tap('chOk',goMenu);
tap('mDaily',()=>{st.char=null;st.lvl=-1;loadLevel(dailyDef(todaySeed(),3),'daily')});
tap('mDuel',()=>showScr('sDuel'));tap('duelBack',goMenu);tap('dBot',()=>startDuel(true));tap('dLocal',()=>startDuel(false));tap('dOnline',()=>toastPop('Salas online: muy pronto',1200));
tap('rRep',startReplay);tap('rMenu',goMenu);
tap('rRetry',()=>{if(st.mode=='level')loadLevel(LEVELS[st.lvl],'level');else if(st.mode=='daily')loadLevel(dailyDef(todaySeed(),3),'daily');else startDuel(duel.vsBot)});
tap('rNext',()=>{st.lvl++;loadLevel(LEVELS[st.lvl],'level')});
tap('bPause',()=>{if(st.mode=='menu')return;paused=true;showScr('sPause')});tap('pzGo',()=>{paused=false;showScr(null)});
tap('pzRetry',()=>{paused=false;$('rRetry').click()});tap('pzMenu',goMenu);
tap('bMute',()=>setMute(!save.muted));
['pFreeze','pRew','pFast'].forEach(id=>$(id).addEventListener('pointerdown',e=>{e.stopPropagation();audioInit();({pFreeze:doFreeze,pRew:doRewind,pFast:doFast})[id]()}));
// ---------- tamaño ----------
function resize(){W=innerWidth;H=innerHeight;portrait=H>W;DPR=Math.min(devicePixelRatio||1,QUAL>1?2:QUAL>0?1.5:1);cv.width=W*DPR|0;cv.height=H*DPR|0;ctx.setTransform(DPR,0,0,DPR,0,0);camera();buildBg();initDeco()}
addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&st.mode!='menu'&&!replay&&st.phase!='done'){paused=true;showScr('sPause')}});
QUAL=(navigator.hardwareConcurrency||4)<=4?1:2;
resize();setMute(save.muted);goMenu();requestAnimationFrame(loop);
window.__rr={st,get cores(){return cores},get live(){return live},LEVELS,loadLevel,fire,get QUAL(){return QUAL},get S(){return S},get TX(){return TX},get TY(){return TY},ANCHOR};
