import * as THREE from 'three';
import * as CANNON from 'cannon';
'use strict';
const VERSION=2;
const $=id=>document.getElementById(id);
// ---------- auto-update ----------
fetch('./version.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(j=>{if(j.v>VERSION&&sessionStorage.getItem('rr_rl')!==String(j.v)){sessionStorage.setItem('rr_rl',String(j.v));toast('✨ Versión nueva… ¡actualizando!',1500);setTimeout(()=>location.replace(location.pathname+'?v='+j.v),1200)}}).catch(()=>{});
// ---------- guardado ----------
const SAVE_KEY='relojeria-rota-3d';
let save={stars:{},best:{},char:0,muted:false};
try{Object.assign(save,JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'))}catch(e){}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// ---------- audio alegre ----------
let AC,master,musicG,noiseBuf,musicOn=false;
function audioInit(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=save.muted?0:.6;master.connect(AC.destination);musicG=AC.createGain();musicG.gain.value=.16;musicG.connect(master);startMusic()}catch(e){}}
function env(g,t,a,d,v){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)}
function osc(type,f,a,d,v,f2,dest,t0){if(!AC)return;const t=t0||AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+a+d);env(g,t,a,d,v);o.connect(g);g.connect(dest||master);o.start(t);o.stop(t+a+d+.05)}
function noise(d,v,fq,q){if(!AC)return;if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate*.5,AC.sampleRate);const c=noiseBuf.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=Math.random()*2-1}const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=fq;f.Q.value=q||1;env(g,t,.002,d,v);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+d+.05)}
const SFX={
 stretch:p=>osc('triangle',300+p*500,.01,.05,.05),
 boing:()=>{osc('sine',260,.01,.25,.3,780);osc('triangle',520,.01,.15,.12,1200)},
 glass:v=>{const f=1400+Math.random()*900;osc('sine',f,.002,.35,.22*v+.05);osc('sine',f*1.5,.002,.25,.12*v);noise(.12,.2*v+.05,5000,3)},
 jelly:v=>{osc('sine',180,.01,.25,.3*v+.08,420);osc('sine',300,.01,.18,.12,700)},
 bonk:v=>{osc('square',220,.002,.08,.08*v+.02,140);noise(.08,.15*v,900,2)},
 core:()=>{[784,988,1175,1568].forEach((f,i)=>osc('triangle',f,.005,.2,.18,0,0,AC&&AC.currentTime+i*.06));noise(.25,.25,3000,1)},
 yay:()=>{[523,659,784,1047,1319].forEach((f,i)=>osc('triangle',f,.005,.3,.2,0,0,AC&&AC.currentTime+i*.09))},
 aww:()=>{osc('triangle',440,.01,.4,.15,300)},
 freeze:()=>{for(let i=0;i<5;i++)osc('sine',1800+i*300,.005,.3,.06,0,0,AC&&AC.currentTime+i*.04)},
 rew:()=>osc('sawtooth',900,.01,.45,.08,200),
 fast:()=>osc('square',300,.01,.25,.06,1400),
 pop:()=>osc('sine',600,.003,.12,.15,1200),
 tick:()=>osc('sine',1500,.001,.03,.05)
};
function startMusic(){if(musicOn||!AC)return;musicOn=true;const bpm=128,b=60/bpm/2;let next=AC.currentTime+.1,step=0;
 const prog=[[60,64,67],[65,69,72],[67,71,74],[60,64,67],[57,60,64],[65,69,72],[67,71,74],[67,71,74]];
 const mel=[72,74,76,79,76,74,72,0, 77,76,74,72,74,0,72,0, 74,76,79,81,79,76,74,0, 72,76,74,71,72,0,0,0];
 const hz=m=>440*Math.pow(2,(m-69)/12);
 (function sch(){while(next<AC.currentTime+.3){const ch=prog[(step>>3)%8];
   if(step%2==0)osc('triangle',hz(ch[0]-12),.005,b*1.6,.25,0,musicG,next);
   osc('sine',hz(ch[(step%4==1?1:step%4==3?2:0)]),.005,b*.7,.12,0,musicG,next);
   const m=mel[step%32];if(m&&(step>>5)%2==0)osc('square',hz(m),.01,b*.8,.05,0,musicG,next);
   if(step%4==2){const s=AC.createBufferSource();}
   next+=b;step++}setTimeout(sch,80)})()}
function setMute(m){save.muted=m;persist();if(master)master.gain.value=m?0:.6;$('bMute').textContent=m?'🔇':'🔊'}
// ---------- render ----------
const cv=$('c');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
let QUAL=(navigator.hardwareConcurrency||4)>=8&&devicePixelRatio>=2?2:1;
function applyQual(){renderer.setPixelRatio(Math.min(devicePixelRatio,QUAL==2?2:QUAL==1?1.25:.85));renderer.shadowMap.enabled=QUAL>0;sun.castShadow=QUAL>0;const s=QUAL==2?2048:1024;if(sun.shadow.mapSize.x!=s){sun.shadow.mapSize.set(s,s);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}scene.traverse(o=>{if(o.material)o.material.needsUpdate=true});resize()}
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(45,1,.1,600);
scene.fog=new THREE.Fog(0xcfefff,120,340);
const hemi=new THREE.HemisphereLight(0xdff4ff,0xffd9ec,1.25);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff3d6,2.4);sun.position.set(-10,30,20);sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-24,right:24,top:22,bottom:-6,near:1,far:90});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;
sun.target.position.set(14,2,0);scene.add(sun,sun.target);
// helpers
const OUT=new Map();function outline(m,col='#7a4a9e',k=1.06){if(!OUT.has(col))OUT.set(col,new THREE.MeshBasicMaterial({color:col,side:THREE.BackSide}));const o=new THREE.Mesh(m.geometry,OUT.get(col));o.scale.setScalar(k);m.add(o);return o}
const MC=new Map();function mat(c,o={}){const k=c+JSON.stringify(o);if(MC.has(k))return MC.get(k);const m=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.45,metalness:0},o));MC.set(k,m);return m}
function M(geo,m,p,pos,scl){const x=new THREE.Mesh(geo,m);if(pos)x.position.set(...pos);if(scl!=null)(typeof scl=='number'?x.scale.setScalar(scl):x.scale.set(...scl));if(p)p.add(x);return x}
const SPH=new THREE.SphereGeometry(1,24,18),SPHL=new THREE.SphereGeometry(1,12,8),CYL=new THREE.CylinderGeometry(1,1,1,20),BOX=new THREE.BoxGeometry(1,1,1),TOR=new THREE.TorusGeometry(1,.18,8,24),CONE=new THREE.ConeGeometry(1,1,16);
function canvasTex(w,h,f){const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),c);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
// cielo
let skyMat;function skyTex(w2){return canvasTex(8,256,g=>{const gr=g.createLinearGradient(0,0,0,256);if(w2){gr.addColorStop(0,'#9fc8ff');gr.addColorStop(.45,'#ffc8ef');gr.addColorStop(.62,'#fff0c8');gr.addColorStop(1,'#ffd6f0')}else{gr.addColorStop(0,'#2fa0ff');gr.addColorStop(.4,'#7fd0ff');gr.addColorStop(.58,'#fff0b0');gr.addColorStop(1,'#bff0ff')}g.fillStyle=gr;g.fillRect(0,0,8,256)})}
const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),new THREE.MeshBasicMaterial({side:THREE.BackSide,fog:false,depthWrite:false}));scene.add(sky);
const glowT=canvasTex(128,128,g=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,240,1)');gr.addColorStop(.3,'rgba(255,240,180,.7)');gr.addColorStop(1,'rgba(255,230,160,0)');g.fillStyle=gr;g.fillRect(0,0,128,128)});
const sunSpr=new THREE.Sprite(new THREE.SpriteMaterial({map:glowT,fog:false,depthWrite:false,transparent:true}));sunSpr.position.set(-60,90,-250);sunSpr.scale.setScalar(110);scene.add(sunSpr);
// suelo: gran esfera de reloj alegre
const faceT=canvasTex(1024,1024,g=>{g.fillStyle='#fff6e0';g.beginPath();g.arc(512,512,512,0,7);g.fill();
 const cols=['#ff8cc6','#6fd6ff','#ffe14d','#8fe87a','#c29bff','#ffad6b'];for(let i=0;i<12;i++){g.fillStyle=cols[i%6];g.beginPath();g.moveTo(512,512);g.arc(512,512,500,i/12*Math.PI*2,(i+1)/12*Math.PI*2);g.fill()}
 g.fillStyle='#fff3a8';g.beginPath();g.arc(512,512,330,0,7);g.fill();for(let i=0;i<60;i++){const a=i/60*Math.PI*2;g.fillStyle=i%5?'#ffc2e0':'#ff6fb5';g.beginPath();g.arc(512+Math.cos(a)*305,512+Math.sin(a)*305,i%5?6:11,0,7);g.fill()}g.fillStyle='#ffe08a';g.beginPath();g.arc(512,512,60,0,7);g.fill();
 g.font='700 90px Fredoka,sans-serif';g.textAlign='center';g.textBaseline='middle';
 for(let i=1;i<=12;i++){const a=i/12*Math.PI*2-Math.PI/2;g.fillStyle='#ff6fb5';g.fillText(i,512+Math.cos(a)*415,512+Math.sin(a)*415)}
 g.strokeStyle='#ffd0e8';g.lineWidth=14;g.beginPath();g.arc(512,512,500,0,7);g.stroke()});
const ground=new THREE.Group();scene.add(ground);
const grass=M(new THREE.CircleGeometry(220,48),mat('#6fdc72',{roughness:.85}),ground,[14,-.02,0]);grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;
const plate=M(new THREE.CylinderGeometry(24,24.6,.6,64),[mat('#ffd1ea'),new THREE.MeshStandardMaterial({map:faceT,roughness:.6}),mat('#ffd1ea')],ground,[16,-.3,0]);plate.rotation.y=Math.PI/2;plate.receiveShadow=true;
// fondo con profundidad
const deco=new THREE.Group();scene.add(deco);const spinners=[],floaters=[];
function hill(x,z,r,c){const h=M(SPHL,mat(c,{roughness:.9}),deco,[x,-r*.55,z],[r,r*.6,r]);h.receiveShadow=true}
function smileFace(col){return canvasTex(256,256,g=>{g.fillStyle=col;g.beginPath();g.arc(128,128,124,0,7);g.fill();g.strokeStyle='#ffffff';g.lineWidth=10;g.stroke();g.fillStyle='#5a3a6e';g.beginPath();g.ellipse(90,110,12,18,0,0,7);g.ellipse(166,110,12,18,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(94,103,5,0,7);g.arc(170,103,5,0,7);g.fill();g.strokeStyle='#5a3a6e';g.lineWidth=8;g.lineCap='round';g.beginPath();g.arc(128,140,30,.3,Math.PI-.3);g.stroke();g.fillStyle='rgba(255,120,170,.5)';g.beginPath();g.ellipse(60,150,18,11,0,0,7);g.ellipse(196,150,18,11,0,0,7);g.fill();
 g.strokeStyle='#ff6fb5';g.lineWidth=6;g.beginPath();g.moveTo(128,128);g.lineTo(128,44);g.moveTo(128,128);g.lineTo(186,128);g.stroke()})}
function clockTower(x,z,h,col,roof){const t=new THREE.Group();t.position.set(x,0,z);deco.add(t);const r=h*.16;
 const b=M(CYL,mat(col),t,[0,h/2,0],[r,h,r]);b.castShadow=QUAL>0;
 const f=M(new THREE.CircleGeometry(r*1.25,32),new THREE.MeshStandardMaterial({map:smileFace('#fffaf0'),roughness:.6}),t,[0,h*.78,r*1.02]);
 M(CONE,mat(roof),t,[0,h+r*1.1,0],[r*1.5,r*2.4,r*1.5]);M(SPHL,mat('#fff19a'),t,[0,h+r*2.5,0],r*.4);floaters.push({o:t,b:0,ph:x});return t}
function gearMesh(r,col,teeth=10){const sh=new THREE.Shape();const n=teeth*4;for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;const k=(i%4<2)?r:r*.82;i?sh.lineTo(Math.cos(a)*k,Math.sin(a)*k):sh.moveTo(k,0)}const hole=new THREE.Path();hole.absarc(0,0,r*.3,0,Math.PI*2,true);sh.holes.push(hole);
 const g=new THREE.ExtrudeGeometry(sh,{depth:r*.25,bevelEnabled:true,bevelSize:r*.05,bevelThickness:r*.05,bevelSegments:2,curveSegments:4});g.center();return new THREE.Mesh(g,mat(col))}
function cloud(x,y,z,s){const c=new THREE.Group();c.position.set(x,y,z);c.scale.setScalar(s);for(const[a,b,r]of[[0,0,1.4],[1.4,-.2,1.1],[-1.4,-.25,1],[.6,.6,1],[-.6,.5,.9]])M(SPHL,mat('#ffffff',{roughness:1,emissive:'#ffffff',emissiveIntensity:.25}),c,[a,b,0],r);deco.add(c);floaters.push({o:c,b:y,ph:x,drift:.3+Math.random()*.4});return c}
let worldDeco=null;
function buildDeco(w2){sky.material.map=skyTex(w2);sky.material.needsUpdate=true;scene.fog.color.set(w2?0xffe0f4:0xcff0ff);
 if(worldDeco)deco.remove(worldDeco);spinners.length=0;floaters.length=0;while(deco.children.length)deco.remove(deco.children[0]);
 const hc=w2?['#ff9fd6','#d2a8ff','#ffc08a','#9fdcff']:['#5fd86a','#8ee87a','#3fcf8a','#a8f07a'];
 for(let i=0;i<16;i++){const a=i/16;hill(-50+a*140+Math.sin(i*7)*10,-70-Math.cos(i*3)*25,18+((i*37)%14),hc[i%4])}
 for(let i=0;i<10;i++)hill(-30+i*12,-38-(i%3)*6,6+(i*13)%6,hc[(i+1)%4]);
 const tc=w2?['#ff7fc8','#ffcf2e','#6fc8ff']:['#ff8cc6','#5fd0ff','#ffe14d','#b48aff'];
 clockTower(-6,-34,16,tc[0],'#ff6fb5');clockTower(40,-46,22,tc[1],'#b07cff');clockTower(64,-30,13,tc[2],'#3fd1b5');clockTower(18,-62,28,tc[3%tc.length],'#ff8f6b');
 if(w2){const ben=new THREE.Group();ben.position.set(30,0,-28);deco.add(ben);const jm=mat('#ff7fc8',{transparent:true,opacity:.75,roughness:.15});M(BOX,jm,ben,[0,9,0],[5,18,5]);M(BOX,jm,ben,[0,19.5,0],[6,3,6]);M(new THREE.CircleGeometry(2.6,32),new THREE.MeshStandardMaterial({map:smileFace('#fff4fb')}),ben,[0,19.5,3.05]);M(CONE,mat('#ffd66b'),ben,[0,24,0],[4,6,4]);floaters.push({o:ben,b:0,ph:0,jelly:1})}
 const gc=['#ffcf2e','#ff6fb5','#4fc8ff','#6fe07a','#b48aff'];
 for(let i=0;i<9;i++){const g=gearMesh(2+(i%3)*1.3,gc[i%5]);g.position.set(-14+i*9,12+((i*5)%9),-30-(i%4)*7);deco.add(g);spinners.push({o:g,s:(i%2?1:-1)*(.3+i%3*.15)})}
 for(let i=0;i<9;i++)cloud(-40+i*16,22+(i%3)*6,-60-(i%4)*20,2+(i%3));
 // globos
 for(let i=0;i<6;i++){const b=new THREE.Group();b.position.set(-8+i*9,8+i%3*3,-14-i%3*5);M(SPHL,mat(gc[i%5],{roughness:.25}),b,[0,0,0],[.9,1.1,.9]);M(CYL,mat('#ffffff'),b,[0,-1.9,0],[.02,2,.02]);deco.add(b);floaters.push({o:b,b:b.position.y,ph:i*2})}
 // flores en primer plano
 for(let i=0;i<26;i++){const x=-12+Math.random()*60,z=6+Math.random()*14;if(Math.abs(z)<4)continue;const f=new THREE.Group();f.position.set(x,0,z);M(CYL,mat('#6fd08a'),f,[0,.35,0],[.05,.7,.05]);M(SPHL,mat(gc[i%5]),f,[0,.75,0],[.32,.2,.32]);M(SPHL,mat('#fff6a8'),f,[0,.8,0],.13);deco.add(f)}
}
// ---------- física ----------
let world,objs=[],removeQ=[];
const PM={glass:new CANNON.Material('g'),jelly:new CANNON.Material('j'),hard:new CANNON.Material('h')};
const S=1/40, GPX=800;
const MAT={glass:{dens:1.6,hp:7,col:'#9fe8ff',pm:'glass'},jelly:{dens:1.2,hp:10,col:'#ff9fd6',pm:'jelly'},brass:{dens:4,hp:30,col:'#ffd66b',pm:'hard'},gear:{dens:3.5,hp:22,col:'#ffb36b',pm:'hard'},core:{dens:1.5,hp:5,col:'#fff'}};
function newWorld(){world=new CANNON.World({gravity:new CANNON.Vec3(0,-14,0)});world.allowSleep=true;world.broadphase=new CANNON.SAPBroadphase(world);world.solver.iterations=14;world.defaultContactMaterial.friction=.55;world.defaultContactMaterial.restitution=.08;
 world.addContactMaterial(new CANNON.ContactMaterial(PM.jelly,PM.jelly,{friction:.6,restitution:.45}));
 world.addContactMaterial(new CANNON.ContactMaterial(PM.jelly,PM.hard,{friction:.6,restitution:.35}));
 const gb=new CANNON.Body({mass:0,shape:new CANNON.Plane()});gb.quaternion.setFromEuler(-Math.PI/2,0,0);gb.userData={kind:'ground'};world.addBody(gb)}
const numTex={};function blockTex(mt,n){const k=mt+n;if(numTex[k])return numTex[k];return numTex[k]=canvasTex(128,128,g=>{const base={glass:'#bff2ff',jelly:'#ffc2e6',brass:'#ffe48a'}[mt];g.fillStyle=base;g.fillRect(0,0,128,128);g.fillStyle='rgba(255,255,255,.55)';g.fillRect(8,8,112,18);g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=8;g.strokeRect(4,4,120,120);
 if(n!==''){g.font='700 54px Fredoka,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle={glass:'#3aa0d8',jelly:'#e0409a',brass:'#d08a10'}[mt];g.fillText(n,64,72)}})}
const crackMat=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false});
let LABEL=0;
function addObj(body,mesh,info){body.userData=info;info.body=body;info.mesh=mesh;info.alive=true;info.max=info.hp;world.addBody(body);scene.add(mesh);mesh.traverse(o=>{if(o.isMesh&&o.material&&!o.material.side)o.castShadow=true});mesh.castShadow=QUAL>0;mesh.receiveShadow=true;
 body.addEventListener('collide',e=>onHit(info,e));body.sleepSpeedLimit=.25;body.sleepTimeLimit=.4;objs.push(info);body.sleep();return info}
const DEPTH=1.3;
function block(x,y,w,h,mt){if(Array.isArray(mt))mt=mt[(LABEL+(x|0))%mt.length];const m=MAT[mt];const W=w*S,H=h*S,D=Math.max(DEPTH,Math.min(W,H)*1.1);
 const body=new CANNON.Body({mass:W*H*D*m.dens,material:PM[m.pm],shape:new CANNON.Box(new CANNON.Vec3(W/2,H/2,D/2)),position:new CANNON.Vec3((x-175)*S,(GPX-y)*S,0)});
 const lab=mt!='brass'&&Math.min(W,H)>.45?String((LABEL++*7)%60).padStart(2,'0'):'';
 const tm=mt=='glass'?new THREE.MeshStandardMaterial({map:blockTex(mt,lab),roughness:.12,metalness:.05,transparent:true,opacity:.88,emissive:'#5fd0ff',emissiveIntensity:.12}):new THREE.MeshStandardMaterial({map:blockTex(mt,lab),roughness:mt=='jelly'?.2:.35,metalness:mt=='brass'?.15:0});
 const geo=new THREE.BoxGeometry(W,H,D);const mesh=new THREE.Mesh(geo,tm);
 const hp=m.hp*(st.mode=='level'&&st.lvl==0?.5:1)*(W*H>3?1.4:1);
 return addObj(body,mesh,{kind:'block',mat:mt,hp,w:W,h:H,d:D})}
function gearB(x,y,r){const R=r*S,m=MAT.gear;const sh=new CANNON.Cylinder(R,R,.5,14);const body=new CANNON.Body({mass:Math.PI*R*R*.5*m.dens*2,material:PM.hard,position:new CANNON.Vec3((x-175)*S,(GPX-y)*S,0)});const q=new CANNON.Quaternion();q.setFromEuler(Math.PI/2,0,0);body.addShape(sh,new CANNON.Vec3(),q);
 const g=gearMesh(R*1.05,['#ffb36b','#ffd66b','#b6e3ff'][Math.random()*3|0],Math.max(8,Math.round(r/3.2)));g.scale.z=.5/(R*.35);const gr=new THREE.Group();gr.add(g);g.castShadow=true;
 return addObj(body,gr,{kind:'gear',mat:'gear',hp:m.hp})}
// núcleo: bolita-reloj kawaii con cara
function coreMesh(){const g=new THREE.Group();const b=M(SPH,mat('#fff6a8',{emissive:'#ffcf3d',emissiveIntensity:.35,roughness:.3}),g,[0,0,0],.52);outline(b,'#ff8fbf',1.07);
 const f=M(new THREE.CircleGeometry(.36,24),new THREE.MeshBasicMaterial({map:smileFace('#fffdf2')}),g,[0,0,.5]);M(TOR,mat('#ff6fb5'),g,[0,0,.47],[.38,.38,.6]);
 M(CYL,mat('#ff6fb5'),g,[0,.6,0],[.08,.15,.08]);M(SPHL,mat('#ff6fb5'),g,[0,.7,0],.1);g.userData.face=f;return g}
function core(x,y){const R=.52;const body=new CANNON.Body({mass:1.2,material:PM.jelly,shape:new CANNON.Sphere(R),position:new CANNON.Vec3((x-175)*S,(GPX-y-21+21)*S,0),angularDamping:.6,linearDamping:.05});
 return addObj(body,coreMesh(),{kind:'core',mat:'core',hp:MAT.core.hp})}
function pedestal(x,h,w){const H=h*S,W=w*S;const body=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(W/2,H/2,1.2)),position:new CANNON.Vec3((x-175)*S,H/2,0)});body.userData={kind:'ped'};world.addBody(body);
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(W,H,2.4),[mat('#ffc4e6'),mat('#ffc4e6'),mat('#fff6e0'),mat('#ffc4e6'),mat('#ffd9ef'),mat('#ffd9ef')]);mesh.position.set(body.position.x,H/2,0);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);peds.push(mesh);
 // volantito de nata
 const r=M(CYL,mat('#ffffff'),mesh,[0,H/2,0],[W/2+.05,.12,1.25]);return GPX-h}
let peds=[];
// estructuras (en px, como la v1)
function S_pb(x,floors,width,mat,ped,opt){opt=opt||{};let base=ped?pedestal(x,ped,width+70):GPX;const ph=opt.ph||88,pw=opt.pw||22;
 for(let i=0;i<floors;i++){const m=Array.isArray(mat)?mat[i%mat.length]:mat;block(x-width/2+pw/2,base-ph/2,pw,ph,m);block(x+width/2-pw/2,base-ph/2,pw,ph,m);if(opt.mid&&i%2==0)block(x,base-ph/2,pw,ph,m);
  block(x,base-ph-10,width+16,20,opt.beam||(m=='glass'&&i%2?'brass':m));if(opt.coreEvery&&i<floors-1&&i%opt.coreEvery==opt.coreEvery-1)core(x,base-21);base-=ph+20}
 if(opt.weight){block(x,base-22,width*.7,44,'brass');base-=44}if(!opt.noTop)core(x,base-21);return base}
function S_pyr(x,rows,mat,ped,bs){bs=bs||44;let base=ped?pedestal(x,ped,rows*bs+40):GPX;for(let r=0;r<rows;r++){const n=rows-r;for(let i=0;i<n;i++){const m=Array.isArray(mat)?mat[(r+i)%mat.length]:mat;block(x+(i-(n-1)/2)*bs,base-bs/2,bs,bs,m)}base-=bs}core(x,base-21)}
function S_wall(x,h,mat,ped){let base=ped?pedestal(x,ped,60):GPX;let y=base;while(y>base-h){block(x,y-30,30,60,mat);y-=60}}
function S_gears(x,n,ped){let base=ped?pedestal(x,ped,160):GPX;block(x-60,base-30,20,60,'brass');block(x+60,base-30,20,60,'brass');block(x,base-70,150,20,'glass');base-=80;for(let i=0;i<n;i++){const r=26+((i*13)%14);gearB(x+((i%2)?-10:10),base-r,r);base-=2*r}core(x,base-21)}
function S_needle(x,h,mat,ped){let base=ped?pedestal(x,ped,90):GPX;let k=0;while(h>0){block(x,base-35,26,70,Array.isArray(mat)?mat[k%mat.length]:mat);block(x,base-79,70,18,'brass');base-=88;h-=88;k++}core(x,base-21)}
function S_castle(x,mat,ped){let base=ped?pedestal(x,ped,380):GPX;for(const dx of[-150,0,150]){let b=base;for(let i=0;i<(dx?2:3);i++){block(x+dx-28,b-40,18,80,mat);block(x+dx+28,b-40,18,80,mat);block(x+dx,b-90,80,20,'brass');b-=100}core(x+dx,b-21)}}
function S_balance(x,mat,ped){let base=ped?pedestal(x,ped,60):GPX;block(x,base-60,24,120,'brass');block(x,base-130,300,18,mat);block(x-120,base-161,44,44,mat);block(x+120,base-161,44,44,mat);core(x-120,base-204);core(x+120,base-204);block(x,base-160,30,40,'glass')}
const BUILD={pb:S_pb,pyr:S_pyr,wall:S_wall,gears:S_gears,needle:S_needle,castle:S_castle,bal:S_balance};
const LEVELS=[
 {n:'El primer segundo',shots:3,s:[['pb',930,3,150,'glass',0,{mid:1}]],tut:'aim'},
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
function dailyDef(seed,shots){const rr=mulberry(seed);const T=['pb','pyr','needle','gears','castle','bal'];const mats=['glass','jelly',['glass','brass'],['jelly','glass']];const out=[];const n=rr()<.5?2:3;const xs=n==2?[880,1140]:[800,1000,1200];
 for(let i=0;i<n;i++){let t=T[rr()*T.length|0];if((t=='castle'||t=='bal')&&!(n==2&&i==0))t='needle';const m=mats[rr()*mats.length|0],ped=rr()<.35?(60+rr()*120|0):0,x=xs[i];
  if(t=='pb')out.push([t,x,3+(rr()*3|0),110+(rr()*40|0),m,ped,{weight:rr()<.4,coreEvery:rr()<.3?2:0}]);else if(t=='pyr')out.push([t,x,4+(rr()*2|0),m,ped]);else if(t=='needle')out.push([t,x,250+(rr()*300|0),m,ped]);else if(t=='gears')out.push([t,x,2+(rr()*3|0),ped]);else out.push([t,x,m,ped])}
 return {n:'Torre del día',shots:shots||3,s:out,w2:rr()<.5}}
function todaySeed(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
// ---------- personajes Mochi ----------
const CHARS=[
 {id:'pendulo',name:'Péndulo',em:'🔔',col:'#d9c4ff',desc:'Mochi lila con péndulo en la cabeza. ¡Cuanto más estiras, más balancea y más fuerte sale!',R:.75,mass:3,vmax:23},
 {id:'arena',name:'Señora Arena',em:'⏳',col:'#ffe38a',desc:'Mochi de arena dorada. Pesadita: toca en vuelo y estalla en 5 granitos.',R:.9,mass:6,vmax:21},
 {id:'tic',name:'Tic',em:'🦉',col:'#9ff0d8',desc:'Búho mochi de cuerda. Ve la trayectoria larga. Toca en vuelo: ¡picado!',R:.7,mass:2.6,vmax:23}
];
function eyeT(){return canvasTex(64,64,g=>{g.fillStyle='#3a2a4e';g.beginPath();g.ellipse(32,34,22,28,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(24,22,9,0,7);g.fill();g.beginPath();g.arc(40,44,4,0,7);g.fill()})}
const EYE=eyeT();const eyeM=new THREE.MeshBasicMaterial({map:EYE,transparent:true});
const blushM=new THREE.MeshBasicMaterial({map:canvasTex(64,40,g=>{const gr=g.createRadialGradient(32,20,0,32,20,30);gr.addColorStop(0,'rgba(255,120,170,.85)');gr.addColorStop(1,'rgba(255,120,170,0)');g.fillStyle=gr;g.fillRect(0,0,64,40)}),transparent:true,depthWrite:false});
const mouthM=new THREE.MeshBasicMaterial({map:canvasTex(64,48,g=>{g.fillStyle='#7a2a4e';g.beginPath();g.moveTo(8,10);g.quadraticCurveTo(32,52,56,10);g.closePath();g.fill();g.fillStyle='#ff7fa8';g.beginPath();g.ellipse(32,30,12,7,0,0,7);g.fill()}),transparent:true});
function makeChar(c){const g=new THREE.Group();const body=new THREE.Group();g.add(body);const R=c.R;
 const b=M(SPH,mat(c.col,{roughness:.55}),body,[0,0,0],[R,R*.9,R]);outline(b,'#8a5aa8',1.05);b.castShadow=true;
 const fz=R*.95;const P=new THREE.PlaneGeometry(1,1);
 const e1=M(P,eyeM,body,[-R*.33,R*.12,fz],[R*.26,R*.32,1]),e2=M(P,eyeM,body,[R*.33,R*.12,fz],[R*.26,R*.32,1]);
 M(P,blushM,body,[-R*.55,-R*.12,fz*.88],[R*.4,R*.25,1]).rotation.y=-.5;M(P,blushM,body,[R*.55,-R*.12,fz*.88],[R*.4,R*.25,1]).rotation.y=.5;
 const mo=M(P,mouthM,body,[0,-R*.18,fz*1.01],[R*.3,R*.22,1]);
 if(c.id=='pendulo'){const arm=new THREE.Group();arm.position.set(0,R*.85,0);body.add(arm);M(CYL,mat('#ffd66b'),arm,[0,R*.4,0],[.04,R*.8,.04]);M(TOR,mat('#ffd66b'),arm,[0,R*.85,0],[.12,.12,.12]);
  const pen=new THREE.Group();pen.position.set(0,R*.85,0);arm.add(pen);M(CYL,mat('#ff9fd6'),pen,[0,-.25,0],[.025,.5,.025]);M(SPH,mat('#ff6fb5',{roughness:.3}),pen,[0,-.5,0],.13);g.userData.pen=pen;
  M(SPHL,mat('#c9a8ff'),body,[-R*.95,-R*.2,0],[R*.22,R*.18,R*.22]);M(SPHL,mat('#c9a8ff'),body,[R*.95,-R*.2,0],[R*.22,R*.18,R*.22])}
 else if(c.id=='arena'){M(CYL,mat('#ff9fd6'),body,[0,R*.95,0],[R*.55,.08,R*.55]);M(new THREE.CylinderGeometry(.04,.3,.35,12),mat('#bff2ff',{transparent:true,opacity:.7}),body,[0,R*1.15,0]);M(new THREE.CylinderGeometry(.3,.04,.35,12),mat('#bff2ff',{transparent:true,opacity:.7}),body,[0,R*1.5,0]);M(CYL,mat('#ff9fd6'),body,[0,R*1.72,0],[R*.4,.07,R*.4]);M(SPHL,mat('#ffc23d'),body,[0,R*1.12,0],[.18,.12,.18]);
  M(SPHL,mat('#fff19a'),body,[R*.2,-R*.85,R*.3],[R*.3,R*.15,R*.3])}
 else {M(CONE,mat('#5fd8b8'),body,[-R*.5,R*.9,0],[R*.22,R*.45,R*.22]).rotation.z=.4;M(CONE,mat('#5fd8b8'),body,[R*.5,R*.9,0],[R*.22,R*.45,R*.22]).rotation.z=-.4;
  M(CONE,mat('#ffb43a'),body,[0,-R*.02,fz*1.02],[.07,.12,.07]).rotation.x=Math.PI;M(SPHL,mat('#ffffff'),body,[0,-R*.45,R*.6],[R*.45,R*.35,R*.3]);
  const key=new THREE.Group();key.position.set(0,0,-R*1.02);body.add(key);M(CYL,mat('#ffd66b'),key,[0,0,-.12],[.05,.25,.05]).rotation.x=Math.PI/2;M(TOR,mat('#ffd66b'),key,[.14,0,-.25],[.12,.12,.12]).rotation.y=Math.PI/2;M(TOR,mat('#ffd66b'),key,[-.14,0,-.25],[.12,.12,.12]).rotation.y=Math.PI/2;g.userData.key=key;
  M(SPHL,mat('#7ee3c4'),body,[-R*.95,-R*.1,0],[R*.15,R*.4,R*.3]);M(SPHL,mat('#7ee3c4'),body,[R*.95,-R*.1,0],[R*.15,R*.4,R*.3])}
 body.scale.setScalar(1.25);g.userData.body=body;g.userData.c=c;g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g}
function animChar(g,t,k=1,mode=''){const b=g.userData.body;const sq=mode=='cheer'?Math.abs(Math.sin(t*9)):Math.sin(t*3)*.5+.5;
 b.scale.set(1.25*(1+sq*.06*k),1.25*(1-sq*.08*k),1.25*(1+sq*.06*k));if(mode=='cheer')b.position.y=Math.abs(Math.sin(t*9))*.5;else b.position.y=0;
 if(g.userData.pen)g.userData.pen.rotation.z=Math.sin(t*(mode=='aim'?9:3))*(mode=='aim'?.9:.4);if(g.userData.key)g.userData.key.rotation.z=t*4}
// ---------- tirachinas ----------
const ANCHOR=new THREE.Vector3(0,3.0,0);
const sling=new THREE.Group();scene.add(sling);sling.scale.setScalar(1.15);
{const pm=mat('#ff9fd6',{roughness:.35});const st1=M(CYL,pm,sling,[0,.9,0],[.22,1.8,.22]);st1.castShadow=true;
 for(const s of[-1,1]){const a=M(CYL,pm,sling,[0,2.1,s*.45],[.16,1,.16]);a.rotation.x=s*.45;a.castShadow=true;M(SPH,mat('#fff19a'),sling,[0,2.55,s*.68],.22)}
 M(TOR,mat('#ffd66b'),sling,[0,1.2,0],[.3,.3,.3]).rotation.x=Math.PI/2;}
const bandM=new THREE.LineBasicMaterial({color:'#ff4fa0'});const bandG=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(9),3));const band=new THREE.Line(bandG,bandM);scene.add(band);
const dots=[];const dotM=mat('#ffffff',{emissive:'#ffffff',emissiveIntensity:.6});for(let i=0;i<40;i++){const d=M(SPHL,dotM,scene,[0,0,0],.08);d.visible=false;dots.push(d)}
// ---------- partículas: confeti y esquirlas ----------
const PART=[];const pGeo=new THREE.BoxGeometry(1,1,1),cGeo=new THREE.PlaneGeometry(1,.6);const CONF=['#ff6fb5','#ffd66b','#6fd8ff','#9ff0a8','#c9a8ff','#ff9f6b'];
function partCap(){return QUAL==2?260:QUAL==1?160:80}
function spawn(pos,col,n,conf,sp){n=Math.round(n*(QUAL==2?1:QUAL==1?.65:.4));for(let i=0;i<n;i++){if(PART.length>partCap()){const o=PART.shift();scene.remove(o.m)}
 const m=new THREE.Mesh(conf?cGeo:pGeo,mat(conf?CONF[Math.random()*6|0]:col,conf?{side:THREE.DoubleSide,emissive:'#ffffff',emissiveIntensity:.15}:{transparent:true,opacity:.9}));const s=conf?.22:.1+Math.random()*.22;m.scale.setScalar(s);m.position.copy(pos);scene.add(m);
 const v=new THREE.Vector3((Math.random()-.5),Math.random()*.9+.3,(Math.random()-.5)).multiplyScalar(sp||7);PART.push({m,v,w:new THREE.Vector3(Math.random()*9,Math.random()*9,Math.random()*9),l:conf?3+Math.random()*2:1.4+Math.random(),conf})}}
function confettiRain(n){for(let i=0;i<n;i++){const p=camera.position.clone().add(new THREE.Vector3((Math.random()-.5)*24,6+Math.random()*6,-12-Math.random()*10));spawn(p,'',1,true,2)}}
function stepParts(dt){for(let i=PART.length-1;i>=0;i--){const p=PART[i];p.l-=dt;if(p.l<=0){scene.remove(p.m);PART.splice(i,1);continue}
 if(p.conf){p.v.y=Math.max(p.v.y-6*dt,-2.2);p.v.x*=.98;p.v.z*=.98;p.m.position.x+=Math.sin(p.l*4)*dt}else p.v.y-=14*dt;p.m.position.addScaledVector(p.v,dt);if(p.m.position.y<.05){p.m.position.y=.05;p.v.y*=-.3;p.v.x*=.6;p.v.z*=.6}
 p.m.rotation.x+=p.w.x*dt;p.m.rotation.y+=p.w.y*dt;if(!p.conf&&p.l<.5)p.m.scale.multiplyScalar(.95)}}
// textos flotantes 3D (sprites)
const POPS=[];function popText(txt,pos,col){const t=canvasTex(256,96,g=>{g.font='700 58px Fredoka,sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=10;g.strokeStyle='#fff';g.strokeText(txt,128,50);g.fillStyle=col||'#ff5fa8';g.fillText(txt,128,50)});
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(2.6,1,1);s.position.copy(pos);scene.add(s);POPS.push({s,l:1.2})}
function stepPops(dt){for(let i=POPS.length-1;i>=0;i--){const p=POPS[i];p.l-=dt;p.s.position.y+=dt*1.6;p.s.material.opacity=Math.min(1,p.l*2);if(p.l<=0){scene.remove(p.s);p.s.material.map.dispose();POPS.splice(i,1)}}}
// ---------- estado ----------
const st={mode:'level',lvl:0,phase:'menu',shots:3,score:0,uses:{},char:null};
let curDef=null,proj=null,simT=0,slowT=0,frozenT=0,fast=false,breaksWin=[],snapshot=null,duel=null,camMode='aim',camT=new THREE.Vector3(),camP=new THREE.Vector3();
let idleChar=null,cheerChars=[];
function chr(){return CHARS[st.char!=null?st.char:save.char]}
function clearScene(){for(const o of objs){if(o.mesh)scene.remove(o.mesh)}for(const p of peds)scene.remove(p);peds=[];objs=[];removeQ=[];if(proj){scene.remove(proj.mesh)}proj=null;for(const c of cheerChars)scene.remove(c);cheerChars=[];if(idleChar)scene.remove(idleChar);idleChar=null}
let lastW2=null;
function loadLevel(def,mode){clearScene();newWorld();LABEL=0;curDef=def;st.mode=mode;st.shots=def.shots;st.score=0;st.phase='aim';simT=0;slowT=0;frozenT=0;fast=false;snapshot=null;
 const w2=def.w2!=null?def.w2:(mode=='level'&&st.lvl>=10);if(w2!==lastW2){buildDeco(w2);lastW2=w2}
 const L=st.lvl;st.uses=mode=='level'?{freeze:L>=UNLOCK.freeze?1:0,rew:L>=UNLOCK.rew?1:0,fast:L>=UNLOCK.fast?1:0}:{freeze:1,rew:mode=='duel'?0:1,fast:1};
 for(const s of def.s)BUILD[s[0]](...s.slice(1));
 for(const o of objs){o.mesh.position.copy(o.body.position);o.mesh.quaternion.copy(o.body.quaternion)}
 // cámara encuadra
 let mx=0,my=0;for(const o of objs){mx=Math.max(mx,o.body.position.x);my=Math.max(my,o.body.position.y)}curDef.maxX=mx;curDef.maxY=my;
 setupChar();show(null);$('hud').classList.add('on');updHud();camMode='aim';snapCam();
 $('hName').textContent=(mode=='level'?(L+1)+'. ':'')+def.n+(duel?' · '+duel.names[duel.turn]:'');
 const tips={aim:'👆 Arrastra hacia atrás y suelta para lanzar',freeze:'❄ ¡Nuevo! Congela el tiempo en pleno vuelo',rew:'⏪ ¡Nuevo! Rebobina un tiro que salió mal',fast:'⏩ ¡Nuevo! Acelera el tiempo'};
 tip(mode=='level'&&def.tut?tips[def.tut]:(mode=='duel'&&duel.bot&&duel.turn==1?'🤖 Turno del bot…':'👆 Arrastra y suelta. Toca en vuelo para el poder'));
 if(mode=='duel'&&duel.bot&&duel.turn==1)setTimeout(botShot,1200)}
function setupChar(){if(idleChar)scene.remove(idleChar);idleChar=makeChar(chr());idleChar.position.copy(ANCHOR);idleChar.rotation.y=-Math.PI/2+.5;scene.add(idleChar);if(st.shots<=0)idleChar.visible=false}
function updHud(){const n=curDef.shots;$('hShots').textContent=chr().em+' '+'●'.repeat(st.shots)+'○'.repeat(Math.max(0,n-st.shots));$('hScore').textContent='⭐ '+st.score;
 for(const[k,id]of[['freeze','pFreeze'],['rew','pRew'],['fast','pFast']]){const b=$(id);b.querySelector('i').textContent=st.uses[k]||0;b.classList.toggle('off',!(st.uses[k]>0));b.style.display=(st.mode=='level'&&!(st.lvl>=UNLOCK[k]))?'none':''}}
function isW(){return innerWidth>innerHeight}
function snapCam(){aimCam();camera.position.copy(camP);camera.lookAt(camT)}
function aimCam(){const mx=curDef?curDef.maxX:22,my=curDef?curDef.maxY:5;const cx=mx*.5,cy=Math.max(3,my*.45)+(innerWidth<innerHeight?3.5:0);const asp=innerWidth/innerHeight;const span=mx+6;
 const dist=asp>1?Math.max(span*.95,(my+4)*1.5):span/(asp*.95)*.95;camT.set(cx,cy,0);camP.set(cx-3,cy+dist*.16,dist)}
// ---------- daño ----------
function onHit(info,e){if(!info.alive||simT<.35)return;const v=Math.abs(e.contact.getImpactVelocityAlongNormal());if(v<1.4)return;const ob=e.body;const ou=ob.userData||{};
 const om=ob.mass>0?Math.min(ob.mass,8):6;let dmg=(v-1.2)*Math.sqrt(om)*(ou.kind=='proj'?2.2:1);if(info.kind=='core')dmg*=1.3;
 if(ou.kind=='proj'&&!ou.hit){ou.hit=1;if(v>4)SFX.boing()}
 if(v>3&&Math.random()<.5){if(info.mat=='glass')SFX.glass(Math.min(1,v/12)*.4);else if(info.mat=='jelly')SFX.jelly(.4);else SFX.bonk(.5)}
 info.hp-=dmg;if(info.hp<=0)removeQ.push(info);else if(info.mesh.material&&info.kind=='block'){info.mesh.material.emissive=new THREE.Color('#ffffff');info.mesh.material.emissiveIntensity=.5*(1-info.hp/info.max)}}
function breakObj(o){if(!o.alive)return;o.alive=false;world.removeBody(o.body);scene.remove(o.mesh);const p=o.mesh.position.clone();
 if(o.kind=='core'){SFX.core();spawn(p,'',30,true,8);spawn(p,'#fff19a',10);st.score+=5000;popText('+5000',p.clone().add(new THREE.Vector3(0,1,0)),'#ff9f1a');camShake=.5}
 else{const c=MAT[o.mat].col;spawn(p,c,o.mat=='brass'?8:14);if(o.mat=='glass')SFX.glass(.8);else if(o.mat=='jelly')SFX.jelly(.8);else SFX.bonk(1);st.score+=o.mat=='brass'?800:500;if(Math.random()<.5)popText(o.mat=='brass'?'+800':'+500',p,'#b07cff')}
 breaksWin.push(simT);updHud()}
let camShake=0;
// ---------- disparo ----------
let aim=null;const G=14;
function launchVel(){if(!aim)return null;const dx=aim.sx-aim.cx,dy=aim.sy-aim.cy;const L=Math.hypot(dx,dy);if(L<10)return null;const md=Math.min(innerWidth,innerHeight)*.33;const p=Math.min(1,L/md);const c=chr();const v=c.vmax*p*(c.id=='pendulo'?1+.12*p:1);return{vx:-dx/L*v,vy:dy/L*v,p}}
function fire(vx,vy){if(st.phase!='aim'||st.shots<=0)return;audioInit();snapshot=takeSnap();st.shots--;st.phase='fly';simT=0;breaksWin=[];const c=chr();
 const body=new CANNON.Body({mass:c.mass,material:PM.jelly,shape:new CANNON.Sphere(c.R),position:new CANNON.Vec3(ANCHOR.x,ANCHOR.y,0),linearDamping:.01,angularDamping:.3});body.velocity.set(vx,vy,0);body.angularVelocity.set(0,0,-vx*.6);body.userData={kind:'proj'};world.addBody(body);
 const mesh=idleChar;idleChar=null;proj={body,mesh,c,used:false,extra:[]};SFX.boing();hideDots();tip('');camMode='follow';updHud();
 for(const o of objs)if(o.alive)o.body.wakeUp()}
function useAbility(){if(!proj||proj.used||st.phase!='fly')return;const c=proj.c,b=proj.body;proj.used=true;
 if(c.id=='tic'){b.velocity.set(b.velocity.x*1.2+4,-22,0);SFX.fast();popText('¡PICADO!',proj.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)),'#3fd1b5')}
 else if(c.id=='arena'){SFX.pop();popText('¡GRANITOS!',proj.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)),'#ff9f1a');for(let i=0;i<5;i++){const gb=new CANNON.Body({mass:1.6,material:PM.jelly,shape:new CANNON.Sphere(.3),position:b.position.clone()});gb.velocity.set(b.velocity.x*(.85+i*.07),b.velocity.y+(i-2)*2.6,(i-2)*.4);gb.userData={kind:'proj'};world.addBody(gb);const gm=M(SPH,mat('#ffe38a',{roughness:.5}),scene,[0,0,0],.3);gm.castShadow=true;proj.extra.push({body:gb,mesh:gm})}}
 else{b.velocity.scale(1.35,b.velocity);SFX.fast();popText('¡DONG!',proj.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)),'#b07cff')}}
function takeSnap(){return{score:st.score,shots:st.shots,o:objs.map(o=>({o,alive:o.alive,hp:o.hp,p:o.body.position.clone(),q:o.body.quaternion.clone()}))}}
function doRewind(){if(!(st.uses.rew>0)||!snapshot||st.phase=='aim'&&st.shots==curDef.shots)return;st.uses.rew--;SFX.rew();toast('⏪ ¡Rebobinado!',800);killProj();
 for(const s of snapshot.o){const o=s.o;o.hp=s.hp;o.body.position.copy(s.p);o.body.quaternion.copy(s.q);o.body.velocity.set(0,0,0);o.body.angularVelocity.set(0,0,0);if(s.alive&&!o.alive){o.alive=true;world.addBody(o.body);scene.add(o.mesh)}else if(!s.alive&&o.alive){o.alive=false;world.removeBody(o.body);scene.remove(o.mesh)}o.body.sleep();if(o.mesh.material&&o.mesh.material.emissiveIntensity!=null&&o.kind=='block')o.mesh.material.emissiveIntensity=o.mat=='glass'?.12:0}
 st.score=snapshot.score;st.shots=snapshot.shots;snapshot=null;unfreeze();st.phase='aim';camMode='aim';setupChar();updHud()}
function doFreeze(){if(!(st.uses.freeze>0)||st.phase!='fly'||frozenT>0)return;st.uses.freeze--;frozenT=2.2;SFX.freeze();toast('❄ ¡Tiempo congelado!',800);for(const o of objs)if(o.alive){o.fv=[o.body.velocity.clone(),o.body.angularVelocity.clone()];o.body.type=CANNON.Body.KINEMATIC;o.body.velocity.set(0,0,0);o.body.angularVelocity.set(0,0,0);if(o.mesh.material&&o.kind=='block'){o.mesh.material.emissive=new THREE.Color('#9fe8ff');o.mesh.material.emissiveIntensity=.6}}updHud()}
function unfreeze(){if(frozenT<=0&&!objs.some(o=>o.fv))return;frozenT=0;for(const o of objs){if(!o.fv)continue;o.body.type=CANNON.Body.DYNAMIC;o.body.updateMassProperties();o.body.wakeUp();o.body.velocity.copy(o.fv[0]);o.body.angularVelocity.copy(o.fv[1]);o.fv=null;if(o.mesh.material&&o.kind=='block'){o.mesh.material.emissiveIntensity=o.mat=='glass'?.12:0;o.mesh.material.emissive=new THREE.Color(o.mat=='glass'?'#5fd0ff':'#000')}}}
function doFast(){if(!(st.uses.fast>0)||st.phase!='fly'||fast)return;st.uses.fast--;fast=true;SFX.fast();toast('⏩ ¡Turbo!',700);updHud()}
function killProj(){if(!proj)return;world.removeBody(proj.body);scene.remove(proj.mesh);for(const e of proj.extra){world.removeBody(e.body);scene.remove(e.mesh)}proj=null}
function coresLeft(){return objs.filter(o=>o.kind=='core'&&o.alive).length}
function settled(){if(simT<1.6)return false;if(simT>10)return true;if(proj){const p=proj.body.position;if(p.x<40&&p.x>-10&&p.y>-2&&proj.body.velocity.length()>.6)return false}
 for(const o of objs){if(!o.alive)continue;if(o.body.sleepState!==CANNON.Body.SLEEPING&&o.body.velocity.length()>.3)return false}return true}
function endShot(){killProj();unfreeze();fast=false;if(coresLeft()==0)return finish(true);if(st.shots<=0)return finish(false);st.phase='aim';camMode='aim';setupChar();updHud();if(st.mode=='duel'&&duel.bot&&duel.turn==1)setTimeout(botShot,900)}
function finish(win){st.phase='done';const bonus=win?st.shots*1500:0;st.score+=bonus;updHud();
 const stars=win?(st.shots>=2?3:st.shots==1?2:1):0;
 if(win){SFX.yay();confettiRain(QUAL?90:40);celebrate()}else SFX.aww();
 setTimeout(()=>{if(st.mode=='duel')return duelNext();
  $('rT').textContent=win?['¡Genial!','¡Increíble!','¡Tic-tac-tástico!'][Math.random()*3|0]+' 🎉':'¡Casi! 💪';
  $('rS').textContent=win?'★'.repeat(stars)+'☆'.repeat(3-stars):'';$('rP').textContent='⭐ '+st.score+' puntos'+(bonus?' (+'+bonus+' por tiros sobrantes)':'');
  if(st.mode=='level'&&win){const k=st.lvl;save.stars[k]=Math.max(save.stars[k]||0,stars);save.best[k]=Math.max(save.best[k]||0,st.score);persist()}
  if(st.mode=='daily'){const k='d'+todaySeed();save.best[k]=Math.max(save.best[k]||0,st.score);persist();$('rP').textContent+=' · Récord de hoy: '+save.best[k]}
  $('rNext').style.display=st.mode=='level'&&win&&st.lvl<19?'':'none';show('res')},win?1400:900)}
function celebrate(){for(let i=0;i<3;i++){const g=makeChar(CHARS[i]);g.position.set(-1.6+i*1.6,0,2.2);g.rotation.y=.3;scene.add(g);g.userData.ph=i*.7;cheerChars.push(g)}camMode='cheer'}
// ---------- duelo ----------
function startDuel(bot){const seed=(Date.now()/1000|0);duel={bot,seed,turn:0,scores:[0,0],names:bot?['Tú','Bot 🤖']:['Jugador 1','Jugador 2']};st.lvl=0;passScreen()}
function passScreen(){const d=duel;$('pT').textContent=d.turn==0?'⚔ ¡Empieza '+d.names[0]+'!':d.bot?'🤖 Ahora juega el bot':'👯 ¡Turno de '+d.names[1]+'!';$('pS').textContent=d.turn==0?'3 tiros para sacar el máximo de puntos':(d.bot?'':'Pasa el móvil. ')+'Puntos a batir: '+d.scores[0];show('pass')}
function duelNext(){duel.scores[duel.turn]=st.score;if(duel.turn==0){duel.turn=1;passScreen();return}
 const[a,b]=duel.scores;const w=a==b?'¡Empate! 🤝':(a>b?(duel.bot?'¡Has ganado!':'¡Gana '+duel.names[0]+'!'):(duel.bot?'¡Gana el bot!':'¡Gana '+duel.names[1]+'!'))+' 🏆';$('rT').textContent=w;$('rS').textContent='';$('rP').textContent=duel.names[0]+': '+a+' · '+duel.names[1]+': '+b;$('rNext').style.display='none';if(a!=b&&!(duel.bot&&b>a)){SFX.yay();confettiRain(80)}show('res')}
function botShot(){if(st.phase!='aim'||st.mode!='duel')return;const cs=objs.filter(o=>o.kind=='core'&&o.alive);const t=cs.length?cs[Math.random()*cs.length|0].body.position:new CANNON.Vec3(20,3,0);
 const v=chr().vmax*.92,dx=t.x-ANCHOR.x,dy=t.y-ANCHOR.y;const disc=v**4-G*(G*dx*dx+2*dy*v*v);let th=disc>0?Math.atan((v*v-Math.sqrt(disc))/(G*dx)):Math.PI/4;th+=(Math.random()-.5)*.06;
 fire(Math.cos(th)*v,Math.sin(th)*v);if(Math.random()<.5)setTimeout(useAbility,700+Math.random()*400)}
// ---------- input ----------
function onDown(e){audioInit();if(st.phase=='fly'){useAbility();return}if(st.phase!='aim'||(st.mode=='duel'&&duel.bot&&duel.turn==1))return;aim={cx:e.clientX,cy:e.clientY,sx:e.clientX,sy:e.clientY};tip('')}
function onMove(e){if(!aim)return;aim.sx=e.clientX;aim.sy=e.clientY;const v=launchVel();if(v&&Math.random()<.2)SFX.stretch(v.p);drawAim(v)}
function onUp(){if(!aim)return;const v=launchVel();aim=null;hideDots();if(v)fire(v.vx,v.vy);else if(idleChar)idleChar.position.copy(ANCHOR)}
cv.addEventListener('pointerdown',onDown);addEventListener('pointermove',onMove);addEventListener('pointerup',onUp);addEventListener('pointercancel',onUp);
function hideDots(){for(const d of dots)d.visible=false;bandG.attributes.position.array.fill(0);bandG.attributes.position.needsUpdate=true}
function drawAim(v){if(!v){hideDots();return}const c=chr();const L=Math.hypot(v.vx,v.vy);const pull=new THREE.Vector3(-v.vx/L,-v.vy/L,0).multiplyScalar(1.3*v.p);const cp=ANCHOR.clone().add(pull);if(idleChar)idleChar.position.copy(cp);
 const a=bandG.attributes.position.array;a.set([0,2.93,-.78,cp.x,cp.y,cp.z,0,2.93,.78]);bandG.attributes.position.needsUpdate=true;
 const n=c.id=='tic'?40:14,dtp=.06;for(let i=0;i<dots.length;i++){const d=dots[i];if(i>=n){d.visible=false;continue}const t=(i+1)*dtp;const y=ANCHOR.y+v.vy*t-G*t*t/2;d.visible=y>0;d.position.set(ANCHOR.x+v.vx*t,y,0);d.scale.setScalar(.1-i*.0015)}}
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>show('menu'));
$('pFreeze').onclick=doFreeze;$('pRew').onclick=doRewind;$('pFast').onclick=doFast;
$('hBack').onclick=()=>{killProj();clearScene();st.phase='menu';duel=null;show('menu')};
$('bPlay').onclick=()=>{audioInit();renderLevels();show('levels')};
$('bDaily').onclick=()=>{audioInit();duel=null;st.lvl=0;loadLevel(dailyDef(todaySeed()),'daily')};
$('bDuel').onclick=()=>{audioInit();show('duel')};$('dBot').onclick=()=>startDuel(true);$('d2p').onclick=()=>startDuel(false);
$('pGo').onclick=()=>loadLevel(dailyDef(duel.seed,3),'duel');
$('bChars').onclick=()=>{renderChars();show('chars')};$('bMute').onclick=()=>setMute(!save.muted);setMute(save.muted);
$('rAgain').onclick=()=>{if(st.mode=='duel'){startDuel(duel.bot)}else if(st.mode=='daily')loadLevel(dailyDef(todaySeed()),'daily');else loadLevel(LEVELS[st.lvl],'level')};
$('rNext').onclick=()=>{st.lvl++;loadLevel(LEVELS[st.lvl],'level')};$('rMenu').onclick=()=>{clearScene();duel=null;st.phase='menu';show('menu')};
function unlocked(i){return i==0||(save.stars[i-1]||0)>0||new URLSearchParams(location.search).has('all')}
function renderLevels(){for(const w of[0,1]){const g=$('g'+(w+1));g.innerHTML='';for(let i=w*10;i<w*10+10;i++){const b=document.createElement('button');b.className='lv'+(unlocked(i)?'':' lock');const s=save.stars[i]||0;b.innerHTML=(i+1)+'<small>'+(unlocked(i)?'★'.repeat(s)+'☆'.repeat(3-s):'🔒')+'</small>';b.onclick=()=>{if(!unlocked(i))return;duel=null;st.lvl=i;loadLevel(LEVELS[i],'level')};g.appendChild(b)}}}
function renderChars(){const l=$('chl');l.innerHTML='';CHARS.forEach((c,i)=>{const d=document.createElement('div');d.className='ch'+(save.char==i?' sel':'');d.innerHTML=`<div class="em">${c.em}</div><b>${c.name}</b><p>${c.desc}</p>`;d.onclick=()=>{save.char=i;persist();SFX.pop();renderChars();showcase()};l.appendChild(d)})}
function show(id){for(const s of document.querySelectorAll('.scr'))s.classList.toggle('on',s.id==id);if(id){$('hud').classList.remove('on');tip('')}if(id=='menu'||id=='levels'||id=='chars'||id=='duel')showcase()}
let tt;function toast(t,ms){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),ms||900)}
function tip(t){const e=$('tip');e.textContent=t;e.style.display=t?'block':'none'}
// escaparate del menú
function showcase(){if(st.phase=='aim'||st.phase=='fly')return;clearScene();if(lastW2!==false){buildDeco(false);lastW2=false}newWorld();curDef=null;
 for(let i=0;i<3;i++){const g=makeChar(CHARS[i]);g.position.set(8+i*2.2,0,3);g.scale.setScalar(1.5);g.rotation.y=-.2;g.userData.ph=i*.8;scene.add(g);cheerChars.push(g)}
 const cm=coreMesh();cm.position.set(12,3.4,-2);cm.scale.setScalar(1.5);const o={mesh:cm,kind:'deco',alive:false};scene.add(cm);objs.push({mesh:cm,body:{position:cm.position},alive:false,kind:'deco'});
 camMode='menu'}
// ---------- bucle ----------
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth>innerHeight?42:58;camera.updateProjectionMatrix();if(st.phase=='aim')aimCam()}
addEventListener('resize',resize);
let last=performance.now(),time=0,ft=0,fn=0,qT=0;
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;
 ft+=dt;fn++;if(ft>2.5){const avg=ft/fn;if(avg>.024&&QUAL>0&&time-qT>4){QUAL--;qT=time;applyQual()}else if(avg<.0135&&QUAL<2&&time-qT>12&&(navigator.hardwareConcurrency||4)>=6){QUAL++;qT=time;applyQual()}ft=0;fn=0}
 let ts=1;if(st.phase=='fly'){
  const recent=breaksWin.filter(t=>t>simT-.7).length;if(recent>=3&&slowT<=0){slowT=1.3;toast(['¡Reacción en cadena!','¡Combo!','¡Tic-tac-BOOM!'][Math.random()*3|0],1000);breaksWin=[]}
  if(slowT>0){slowT-=dt;ts=.3}if(fast)ts*=2.2;
  if(frozenT>0){frozenT-=dt;if(frozenT<=0)unfreeze()}
  const sdt=dt*ts;simT+=sdt;world.step(1/60,sdt,4);
  for(const o of removeQ)breakObj(o);removeQ=[];
  for(const o of objs){if(!o.alive)continue;const p=o.body.position;if(o.kind=='core'&&(p.y<-1||Math.abs(p.x)>60))breakObj(o)}
  if(settled()||(coresLeft()==0&&simT>1.2&&simT<9&&slowT<=0))endShot()}
 else if(st.phase=='done'&&world){world.step(1/60,dt,3);for(const o of removeQ)breakObj(o);removeQ=[]}
 for(const o of objs){if(!o.alive||!o.body.quaternion)continue;o.mesh.position.copy(o.body.position);o.mesh.quaternion.copy(o.body.quaternion);
  if(o.kind=='core'){const f=o.mesh.userData.face;if(f){f.parent.position.y+=Math.sin(time*4+o.mesh.id)*.0}}}
 if(proj){proj.mesh.position.copy(proj.body.position);proj.mesh.quaternion.copy(proj.body.quaternion);animChar(proj.mesh,time,1.5);for(const e of proj.extra){e.mesh.position.copy(e.body.position)}}
 if(idleChar){animChar(idleChar,time,aim?2:1,aim?'aim':'');if(!aim)idleChar.position.lerp(ANCHOR,.25)}
 for(const c of cheerChars){animChar(c,time+(c.userData.ph||0),1.5,'cheer');c.rotation.y+=Math.sin(time*2+(c.userData.ph||0))*.01}
 for(const o of objs)if(o.kind=='deco'){o.mesh.rotation.y=time*.8;o.mesh.position.y=3.4+Math.sin(time*2)*.3}
 for(const s of spinners)s.o.rotation.z+=s.s*dt;for(const f of floaters){if(f.jelly){f.o.scale.set(1+Math.sin(time*3)*.02,1-Math.sin(time*3)*.025,1);continue}if(f.drift){f.o.position.x+=f.drift*dt;if(f.o.position.x>110)f.o.position.x=-60}else if(f.b)f.o.position.y=f.b+Math.sin(time*1.3+f.ph)*.4}
 stepParts(dt);stepPops(dt);
 // cámara
 if(camMode=='menu'){camT.set(10.2,2.4,1);camP.set(10.2+Math.sin(time*.2)*3,4.2,isW()?14:19)}
 else if(camMode=='follow'&&proj){aimCam();const p=proj.body.position;camT.x=THREE.MathUtils.clamp(Math.max(camT.x,p.x),0,40);camT.y=Math.max(camT.y,p.y*.6)}
 else if(camMode=='cheer'){aimCam();camT.set(2,1.6,2);camP.set(3.5,3.5,isW()?10:14)}
 else if(curDef)aimCam();
 const k=1-Math.pow(.02,dt);camera.position.lerp(camP,k);const look=camera.userData.look||(camera.userData.look=camT.clone());look.lerp(camT,k);
 if(camShake>0){camShake-=dt;camera.position.x+=(Math.random()-.5)*camShake*.6;camera.position.y+=(Math.random()-.5)*camShake*.6}
 camera.lookAt(look);sun.target.position.set(look.x,0,0);sun.position.set(look.x-12,30,20);
 renderer.render(scene,camera)}
const sunF=sun;applyQual();showcase();requestAnimationFrame(frame);
window.__rr={st,LEVELS,CHARS,loadLevel:(i)=>{duel=null;st.lvl=i;loadLevel(LEVELS[i],'level')},fire,useAbility,doFreeze,doRewind,doFast,coresLeft,objs:()=>objs,get QUAL(){return QUAL},botAim:()=>{const cs=objs.filter(o=>o.kind=='core'&&o.alive);return cs.map(o=>[o.body.position.x,o.body.position.y])}};
