'use strict';
// ====== ARTE PROCEDURAL ======
const INK='#3b2433';
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function ell(c,x,y,rx,ry){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);}
function fs(c,fill,stroke,lw){if(fill){c.fillStyle=fill;c.fill();}if(stroke!==false){c.strokeStyle=stroke||INK;c.lineWidth=lw||2.5;c.lineJoin='round';c.lineCap='round';c.stroke();}}
function shade(hex,k){ // k -1..1
  const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;
  if(k>=0){r+=(255-r)*k;g+=(255-g)*k;b+=(255-b)*k}else{r*=1+k;g*=1+k;b*=1+k}
  return 'rgb('+(r|0)+','+(g|0)+','+(b|0)+')';
}
function mix(a,b,t){return a+(b-a)*t}
function lerpCol(h1,h2,t){const a=parseInt(h1.slice(1),16),b=parseInt(h2.slice(1),16);
  const r=mix(a>>16,b>>16,t)|0,g=mix((a>>8)&255,(b>>8)&255,t)|0,bl=mix(a&255,b&255,t)|0;return 'rgb('+r+','+g+','+bl+')';}

function eyes(c,x,y,gap,r,lx,ly,mood,t){
  for(const s of [-1,1]){
    const ex=x+s*gap;
    if(mood==='dizzy'){c.strokeStyle=INK;c.lineWidth=2.4;c.lineCap='round';c.beginPath();c.moveTo(ex-r*.7,y-r*.7);c.lineTo(ex+r*.7,y+r*.7);c.moveTo(ex+r*.7,y-r*.7);c.lineTo(ex-r*.7,y+r*.7);c.stroke();continue;}
    if(mood==='happy'){c.strokeStyle=INK;c.lineWidth=2.6;c.lineCap='round';c.beginPath();c.arc(ex,y+r*.35,r*.8,Math.PI*1.1,Math.PI*1.9);c.stroke();continue;}
    const blink=(Math.sin(t*1.3+gap*3)>.985);
    if(blink){c.strokeStyle=INK;c.lineWidth=2.4;c.beginPath();c.moveTo(ex-r*.8,y);c.lineTo(ex+r*.8,y);c.stroke();continue;}
    const rr_=mood==='scared'?r*1.25:r;
    ell(c,ex,y,rr_,rr_*1.08);c.fillStyle='#fff';c.fill();c.strokeStyle=INK;c.lineWidth=1.8;c.stroke();
    c.fillStyle=INK;c.beginPath();c.arc(ex+lx*rr_*.45,y+ly*rr_*.45,rr_*(mood==='scared'?.34:.5),0,7);c.fill();
    c.fillStyle='#fff';c.beginPath();c.arc(ex+lx*rr_*.45-rr_*.15,y+ly*rr_*.45-rr_*.18,rr_*.15,0,7);c.fill();
    if(mood==='angry'){c.strokeStyle=INK;c.lineWidth=2.6;c.lineCap='round';c.beginPath();c.moveTo(ex-s*rr_*1.1,y-rr_*1.55);c.lineTo(ex+s*rr_*.9,y-rr_*.85);c.stroke();}
    if(mood==='scared'){c.strokeStyle=INK;c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(ex-s*rr_*.9,y-rr_*1.2);c.lineTo(ex+s*rr_*.9,y-rr_*1.7);c.stroke();}
  }
}
function mouth(c,x,y,w,mood,t){
  c.lineCap='round';c.lineJoin='round';
  if(mood==='scared'||mood==='shout'){ell(c,x,y+2,w*.5,w*.62);c.fillStyle='#7a1f3a';c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();
    c.fillStyle='#ff7aa0';ell(c,x,y+w*.35,w*.28,w*.2);c.fill();return;}
  if(mood==='happy'){c.beginPath();c.moveTo(x-w*.7,y-1);c.quadraticCurveTo(x,y+w*1.3,x+w*.7,y-1);c.closePath();c.fillStyle='#7a1f3a';c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();
    c.save();c.clip();c.fillStyle='#ff7aa0';ell(c,x,y+w*.75,w*.45,w*.3);c.fill();c.restore();return;}
  if(mood==='angry'){c.strokeStyle=INK;c.lineWidth=2.4;c.beginPath();c.moveTo(x-w*.55,y+w*.35);c.quadraticCurveTo(x,y-w*.3,x+w*.55,y+w*.35);c.stroke();return;}
  if(mood==='dizzy'){c.strokeStyle=INK;c.lineWidth=2.2;c.beginPath();for(let i=0;i<=8;i++){const px=x-w*.6+w*1.2*i/8;const py=y+(i%2?2:-2);i?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();return;}
  if(mood==='smug'){c.strokeStyle=INK;c.lineWidth=2.4;c.beginPath();c.moveTo(x-w*.5,y+2);c.quadraticCurveTo(x+w*.2,y+w*.55,x+w*.6,y-w*.15);c.stroke();return;}
  c.strokeStyle=INK;c.lineWidth=2.4;c.beginPath();c.moveTo(x-w*.5,y);c.quadraticCurveTo(x,y+w*.55,x+w*.5,y);c.stroke();
}
function cheeks(c,x,y,gap,r,col){c.fillStyle=col||'rgba(255,90,120,.35)';for(const s of[-1,1]){ell(c,x+s*gap,y,r,r*.65);c.fill();}}
function shadow(c,x,y,rx,ry,a){c.fillStyle='rgba(30,10,30,'+(a||.28)+')';ell(c,x,y,rx,ry);c.fill();}
function feet(c,t,run,col,spread,y){
  const s=Math.sin(t*14)*run;
  c.fillStyle=col||INK;
  ell(c,-spread,(y||0)-Math.max(0,s)*4,6,4);c.fill();
  ell(c,spread,(y||0)-Math.max(0,-s)*4,6,4);c.fill();
}
function star(c,x,y,r,r2,n,rot){c.beginPath();for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n,rr_=i%2?r2:r;i?c.lineTo(x+Math.cos(a)*rr_,y+Math.sin(a)*rr_):c.moveTo(x+Math.cos(a)*rr_,y+Math.sin(a)*rr_);}c.closePath();}

// ---------- INGREDIENTES (origen en el suelo; centro del cuerpo a y=-20) ----------
function drawIng(c,type,x,y,o){
  o=o||{};const t=o.t||0,run=o.run||0,sc=o.sc||1,mood=o.mood||'idle',lx=o.lx||0,ly=o.ly||0.2;
  c.save();c.translate(x,y);
  if(!o.noShadow)shadow(c,0,2,15*sc,6*sc);
  const bob=run?Math.abs(Math.sin(t*14))*4*run:Math.sin(t*3)*1;
  c.translate(0,-bob);c.scale(sc,sc);if(o.rot)c.rotate(o.rot);
  if(o.sq){c.scale(1+o.sq,1-o.sq)}
  const col=ING[type].col;
  if(type!=='hielo')feet(c,t,run,INK,8,0);
  c.save();c.translate(0,-20);
  let fy=-1,fgap=6.5;
  switch(type){
  case 'tomate':
    ell(c,0,0,19,17);fs(c,col);c.fillStyle='rgba(255,255,255,.35)';ell(c,-8,-8,5,3);c.fill();
    c.fillStyle='#4cae4c';star(c,0,-16,9,3.5,5,-Math.PI/2);c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();fy=0;break;
  case 'huevo':
    c.beginPath();c.ellipse(0,0,15,20,0,0,7);fs(c,'#fff6e4');c.fillStyle='rgba(255,200,120,.35)';c.beginPath();c.ellipse(5,6,8,12,0,0,7);c.fill();
    c.fillStyle='#fff';ell(c,-6,-10,3,5);c.fill();fy=-3;fgap=5.5;break;
  case 'queso':
    c.beginPath();c.moveTo(-21,12);c.lineTo(-21,-8);c.lineTo(-5,-20);c.lineTo(21,-20);c.lineTo(21,12);c.closePath();fs(c,'#ffd23f');
    c.beginPath();c.moveTo(-21,-8);c.lineTo(-5,-20);c.lineTo(21,-20);c.lineTo(5,-8);c.closePath();fs(c,'#ffe97f',INK,2);
    c.fillStyle='#e8a91c';for(const[hx,hy,hr]of[[-14,6,3],[12,5,4],[15,-4,2.5],[-1,9,2.5]]){c.beginPath();c.arc(hx,hy,hr,0,7);c.fill();}
    fy=-1;fgap=6;break;
  case 'pez':
    c.beginPath();c.moveTo(-14,0);c.lineTo(-30,-12);c.lineTo(-30,12);c.closePath();fs(c,shade(col,-.15));
    ell(c,0,0,21,15);fs(c,col);c.fillStyle='rgba(255,255,255,.4)';ell(c,0,-8,14,4);c.fill();
    c.beginPath();c.moveTo(-3,-14);c.quadraticCurveTo(2,-26,10,-13);c.closePath();fs(c,shade(col,-.2),INK,2);
    fy=-2;fgap=5;break;
  case 'zanahoria':
    c.fillStyle='#4cae4c';for(const a of[-.5,0,.5]){c.save();c.translate(0,-21);c.rotate(a);ell(c,0,-8,4,10);c.fill();c.strokeStyle=INK;c.lineWidth=1.8;c.stroke();c.restore();}
    c.beginPath();c.moveTo(-13,-20);c.quadraticCurveTo(0,-26,13,-20);c.lineTo(3,22);c.quadraticCurveTo(0,26,-3,22);c.closePath();fs(c,col);
    c.strokeStyle='rgba(180,70,0,.5)';c.lineWidth=2;for(const yy of[-4,6,14]){c.beginPath();c.moveTo(-5,yy);c.lineTo(-1,yy+1);c.stroke();}
    fy=-10;fgap=5.5;break;
  case 'cebolla':
    c.beginPath();c.moveTo(-3,-16);c.quadraticCurveTo(0,-30,6,-27);c.quadraticCurveTo(2,-22,3,-16);c.closePath();fs(c,'#7ec96a',INK,2);
    ell(c,0,0,19,17);fs(c,'#e9c3f5');c.strokeStyle='rgba(150,80,170,.55)';c.lineWidth=1.8;
    for(const k of[-9,0,9]){c.beginPath();c.moveTo(k*.5,-16);c.quadraticCurveTo(k*1.6,0,k*.5,16);c.stroke();}
    fy=2;break;
  case 'seta':
    rr(c,-8,-2,16,20,7);fs(c,'#fff1dc');
    c.beginPath();c.moveTo(-23,0);c.quadraticCurveTo(-24,-24,0,-25);c.quadraticCurveTo(24,-24,23,0);c.quadraticCurveTo(0,6,-23,0);fs(c,col);
    c.fillStyle='#fff';for(const[hx,hy,hr]of[[-11,-12,4],[3,-18,3.5],[13,-8,4],[-2,-6,2.5]]){c.beginPath();c.arc(hx,hy,hr,0,7);c.fill();}
    fy=9;fgap=5;break;
  case 'pimiento':
    c.beginPath();c.moveTo(-4,-18);c.quadraticCurveTo(0,-30,7,-26);c.quadraticCurveTo(3,-22,4,-18);c.closePath();fs(c,'#4cae4c',INK,2);
    c.beginPath();c.moveTo(-17,-12);c.quadraticCurveTo(0,-24,17,-12);c.quadraticCurveTo(22,6,10,16);c.quadraticCurveTo(0,22,-10,16);c.quadraticCurveTo(-22,6,-17,-12);c.closePath();fs(c,col);
    c.fillStyle='rgba(255,255,255,.35)';ell(c,-9,-6,3,6);c.fill();fy=0;break;
  case 'patata':
    c.beginPath();c.moveTo(-18,2);c.quadraticCurveTo(-20,-17,-3,-16);c.quadraticCurveTo(18,-20,19,-3);c.quadraticCurveTo(22,15,2,16);c.quadraticCurveTo(-16,19,-18,2);fs(c,col);
    c.fillStyle='#a9763f';for(const[hx,hy]of[[-12,10],[13,8],[10,-12],[-14,-8]]){c.beginPath();c.arc(hx,hy,2,0,7);c.fill();}
    fy=-1;break;
  case 'salchicha':
    c.save();c.rotate(-.35);rr(c,-13,-24,26,50,13);fs(c,col);c.fillStyle='rgba(255,255,255,.3)';rr(c,-8,-20,5,36,3);c.fill();
    c.restore();fy=-6;fgap=5.5;break;
  case 'hielo':
    rr(c,-17,-17,34,34,8);fs(c,'#bff0ff');c.fillStyle='rgba(255,255,255,.55)';rr(c,-13,-13,10,22,4);c.fill();
    c.fillStyle='rgba(120,200,240,.4)';c.beginPath();c.moveTo(17,-17);c.lineTo(17,17);c.lineTo(8,17);c.closePath();c.fill();fy=0;break;
  }
  // cara
  const fm=mood;
  eyes(c,0,fy-1,fgap,3.7,lx,ly,fm==='idle'?'idle':fm,t);
  mouth(c,0,fy+8,6.5,fm,t);
  if(type==='tomate'||type==='huevo'||type==='patata')cheeks(c,0,fy+5,10,3);
  c.restore();
  c.restore();
}

// ---------- COCINEROS (origen en el suelo) ----------
function drawChef(c,def,x,y,o){
  o=o||{};const t=o.t||0,run=o.run||0,face=o.face||1,mood=o.mood||'idle',sc=o.sc||1;
  const lx=o.lx||0,ly=o.ly||0.15;
  c.save();c.translate(x,y);
  if(!o.noShadow)shadow(c,0,2,24*sc,8*sc,.3);
  const hover=def.body==='fantasma'||def.body==='abuela'?0:0;
  const bob=run?Math.abs(Math.sin(t*13))*4*run:Math.sin(t*2.5)*1.2;
  c.translate(0,-bob);c.scale(sc*face,sc);
  if(o.sq){c.scale(1+o.sq,1-o.sq)}
  if(o.rot)c.rotate(o.rot);
  const c1=def.c1,c2=def.c2;
  const fm=mood==='idle'?(run>.1?'idle':'idle'):mood;
  switch(def.body){
  case 'croqueta': {
    feet(c,t,run,INK,9,0);
    rr(c,-23,-60,46,56,22);fs(c,c1);
    c.fillStyle=c2;for(const[hx,hy]of[[-14,-20],[12,-14],[-6,-8],[15,-34],[-16,-40]]){c.beginPath();c.arc(hx,hy,2.4,0,7);c.fill();}
    c.fillStyle='rgba(255,255,255,.3)';rr(c,-17,-54,8,22,4);c.fill();
    // brazos
    c.strokeStyle=INK;c.lineWidth=2.4;ell(c,-25,-26+Math.sin(t*14)*run*3,5,7);fs(c,c1);ell(c,25,-26-Math.sin(t*14)*run*3,5,7);fs(c,c1);
    eyes(c,0,-37,7,4.2,lx,ly,fm,t);cheeks(c,0,-30,12,3.4);mouth(c,0,-26,6.5,fm,t);
    // bigote
    c.beginPath();c.moveTo(0,-30);c.quadraticCurveTo(-12,-36,-17,-27);c.quadraticCurveTo(-8,-29,0,-27);c.quadraticCurveTo(8,-29,17,-27);c.quadraticCurveTo(12,-36,0,-30);fs(c,'#4a2a1a',INK,1.5);
    // gorro
    rr(c,-14,-72,28,18,6);fs(c,'#fff');ell(c,-9,-74,10,9);fs(c,'#fff');ell(c,9,-74,10,9);fs(c,'#fff');ell(c,0,-78,11,10);fs(c,'#fff');
    rr(c,-15,-58,30,7,3);fs(c,'#fff');
    break;}
  case 'pulpo': {
    // tentáculos
    for(let i=0;i<4;i++){const a=(i-1.5)*13,w=Math.sin(t*(run?10:3)+i*1.6)*(run?5:3);
      c.beginPath();c.moveTo(a-6,-14);c.quadraticCurveTo(a+w*2+(i<2?-6:6),-6,a+w*3+(i<2?-9:9),2);c.lineWidth=11;c.strokeStyle=INK;c.lineCap='round';c.stroke();
      c.lineWidth=7.5;c.strokeStyle=c1;c.stroke();}
    ell(c,0,-38,26,28);fs(c,c1);
    c.fillStyle='rgba(255,255,255,.28)';ell(c,-11,-52,6,10);c.fill();
    c.fillStyle=c2;for(const[hx,hy]of[[14,-52],[-16,-30],[18,-34]]){c.beginPath();c.arc(hx,hy,3,0,7);c.fill();}
    // cucharones en dos tentáculos
    for(const s of[-1,1]){c.save();c.translate(s*27,-22);c.rotate(s*(.6+Math.sin(t*(run?12:4)+s)*.25));
      c.beginPath();c.moveTo(0,0);c.lineTo(0,-24);c.lineWidth=3.4;c.strokeStyle=INK;c.stroke();ell(c,0,-30,7,9);fs(c,'#d8dde8');c.restore();}
    eyes(c,0,-40,9,5,lx,ly,fm,t);cheeks(c,0,-31,15,4);mouth(c,0,-28,7,fm,t);
    // gorro ladeado
    c.save();c.translate(10,-66);c.rotate(.28);rr(c,-12,-12,24,16,5);fs(c,'#fff');ell(c,-6,-15,8,8);fs(c,'#fff');ell(c,7,-15,8,8);fs(c,'#fff');ell(c,0,-19,9,8);fs(c,'#fff');c.restore();
    break;}
  case 'caballero': {
    feet(c,t,run,INK,10,0);
    rr(c,-25,-50,50,46,16);fs(c,c1);c.fillStyle='rgba(255,255,255,.35)';rr(c,-19,-46,9,28,4);c.fill();
    c.fillStyle=c2;rr(c,-25,-26,50,7,3);c.fill();
    // escudo (tapa)
    ell(c,-27,-26,10,13);fs(c,'#ffd23f');c.fillStyle=INK;ell(c,-27,-26,4,6);c.fill();
    // cucharón-espada
    c.save();c.translate(28,-30);c.rotate(-.5+Math.sin(t*14)*run*.3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-28);c.lineWidth=4;c.strokeStyle=INK;c.stroke();ell(c,0,-36,8,11);fs(c,'#e8edf5');c.restore();
    // yelmo en forma de cuchara
    ell(c,0,-62,23,21);fs(c,c1);
    rr(c,-16,-66,32,13,6);fs(c,'#27303f');
    eyes(c,0,-60,7,3.8,lx,ly,fm==='idle'?'idle':fm,t);
    // penacho
    c.beginPath();c.moveTo(0,-82);c.quadraticCurveTo(-8,-98,6,-100);c.quadraticCurveTo(0,-92,10,-82);c.closePath();fs(c,'#ff4f5e',INK,2);
    mouth(c,0,-42,6,fm==='idle'?'smug':fm,t);
    break;}
  case 'abuela': {
    // ruedas
    for(const s of[-1,1]){c.save();c.translate(s*14,-6);c.beginPath();c.arc(0,0,9,0,7);fs(c,'#2d2d3a');c.rotate(t*run*14*s);c.strokeStyle='#999';c.lineWidth=2;c.beginPath();c.moveTo(-6,0);c.lineTo(6,0);c.moveTo(0,-6);c.lineTo(0,6);c.stroke();c.restore();}
    if(run>.3){c.fillStyle='rgba(255,170,40,'+(.55+Math.sin(t*40)*.3)+')';c.beginPath();c.moveTo(-34,-14);c.lineTo(-52-Math.random()*6,-10);c.lineTo(-34,-4);c.closePath();c.fill();}
    ell(c,0,-34,24,24);fs(c,c1);
    // moño y pelo
    c.beginPath();c.arc(0,-66,10,0,7);fs(c,'#dcdcec');c.beginPath();c.arc(0,-74,8,0,7);fs(c,'#dcdcec');
    c.beginPath();c.arc(0,-58,19,Math.PI,0);fs(c,'#dcdcec');
    // delantal
    rr(c,-14,-26,28,22,8);fs(c,'#fff');
    // gafas
    for(const s of[-1,1]){c.beginPath();c.arc(s*8,-44,8,0,7);c.fillStyle='rgba(180,230,255,.45)';c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();}
    c.beginPath();c.moveTo(-1,-44);c.lineTo(1,-44);c.stroke();
    eyes(c,0,-44,8,3.4,lx,ly,fm,t);cheeks(c,0,-34,14,3.5);mouth(c,0,-32,6,fm==='idle'?'happy':fm,t);
    break;}
  case 'gnomo': {
    c.scale(.9,.9);
    feet(c,t,run,INK,8,0);
    rr(c,-19,-34,38,32,14);fs(c,'#4d8fe0');
    ell(c,0,-44,19,17);fs(c,'#ffd9bd');
    // barba
    c.beginPath();c.moveTo(-19,-42);c.quadraticCurveTo(-18,-14,0,-12);c.quadraticCurveTo(18,-14,19,-42);c.quadraticCurveTo(0,-30,-19,-42);fs(c,'#fff');
    // sombrero
    c.beginPath();c.moveTo(-21,-52);c.quadraticCurveTo(-4,-60,-4,-88);c.quadraticCurveTo(14,-70,21,-52);c.quadraticCurveTo(0,-46,-21,-52);fs(c,c1);
    c.beginPath();c.moveTo(-21,-52);c.quadraticCurveTo(0,-46,21,-52);c.lineWidth=5;c.strokeStyle=c2;c.stroke();
    eyes(c,0,-47,7,3.6,lx,ly,fm,t);
    ell(c,0,-42,4,3.2);fs(c,'#ff9c8a',INK,1.5);
    // sartén
    c.save();c.translate(24,-22);c.rotate(.5+Math.sin(t*12)*run*.4);c.beginPath();c.moveTo(0,0);c.lineTo(14,0);c.lineWidth=4;c.strokeStyle=INK;c.stroke();ell(c,-6,0,12,10);fs(c,'#555a66');ell(c,-6,0,7,6);fs(c,'#2c2f38',false);c.restore();
    mouth(c,0,-33,5,fm==='idle'?'happy':fm,t);
    break;}
  case 'fantasma': {
    const w=Math.sin(t*3)*2;c.translate(0,-8+Math.sin(t*2.4)*3);
    c.beginPath();c.moveTo(-24,-4);c.quadraticCurveTo(-28,-58,0,-60);c.quadraticCurveTo(28,-58,24,-4);
    c.quadraticCurveTo(18,4+w,12,-4);c.quadraticCurveTo(6,6-w,0,-4);c.quadraticCurveTo(-6,6+w,-12,-4);c.quadraticCurveTo(-18,4-w,-24,-4);c.closePath();fs(c,c1);
    c.fillStyle='rgba(120,140,220,.25)';c.beginPath();c.moveTo(24,-4);c.quadraticCurveTo(28,-58,6,-58);c.quadraticCurveTo(20,-30,12,-4);c.closePath();c.fill();
    ell(c,-26,-24+Math.sin(t*5)*3,6,5);fs(c,c1);ell(c,26,-24-Math.sin(t*5)*3,6,5);fs(c,c1);
    eyes(c,0,-36,8,4.6,lx,ly,fm,t);cheeks(c,0,-27,14,4,'rgba(255,120,160,.45)');mouth(c,0,-24,6.5,fm==='idle'?'scared':fm,t);
    // gorrito
    rr(c,-11,-76,22,14,5);fs(c,'#fff');ell(c,0,-79,12,9);fs(c,'#fff');
    break;}
  case 'tostadora': {
    feet(c,t,run,INK,10,0);
    rr(c,-27,-46,54,42,12);fs(c,c1);c.fillStyle='rgba(255,255,255,.4)';rr(c,-21,-42,8,28,4);c.fill();
    c.fillStyle=c2;rr(c,-27,-14,54,10,4);c.fill();
    // tostadas saliendo (sombrero)
    rr(c,-18,-46,14,5,2);fs(c,'#2a2230');rr(c,4,-46,14,5,2);fs(c,'#2a2230');
    const up=Math.max(0,Math.sin(t*2.2))*8;
    c.save();c.translate(-11,-48-up);rr(c,-8,-20,16,20,5);fs(c,'#f2c27a');c.fillStyle='#e49b3a';rr(c,-5,-17,10,14,3);c.fill();c.restore();
    c.save();c.translate(11,-48-Math.max(0,Math.sin(t*2.2+1.5))*8);rr(c,-8,-20,16,20,5);fs(c,'#f2c27a');c.fillStyle='#e49b3a';rr(c,-5,-17,10,14,3);c.fill();c.restore();
    // pantalla/cara
    rr(c,-19,-38,38,20,6);fs(c,'#1c2a3a');
    c.fillStyle='#7dffb0';for(const s of[-1,1]){ if(fm==='dizzy'){c.fillRect(s*8-3,-31,6,2);c.fillRect(s*8-1,-33,2,6)}else if(fm==='happy'){c.fillRect(s*8-3,-30,6,2);c.fillRect(s*8-3,-32,2,2);c.fillRect(s*8+1,-32,2,2)}else{rr(c,s*8-3+lx*2,-33,6,7,2);c.fill();}}
    c.strokeStyle='#7dffb0';c.lineWidth=2;c.beginPath();if(fm==='scared'||fm==='shout'){c.arc(0,-22,3,0,7)}else if(fm==='angry'){c.moveTo(-5,-21);c.lineTo(5,-21)}else{c.arc(0,-24,5,.2,Math.PI-.2)}c.stroke();
    // palanca
    c.strokeStyle=INK;c.lineWidth=4;c.beginPath();c.moveTo(27,-30);c.lineTo(36,-34);c.stroke();c.fillStyle='#ff4f5e';c.beginPath();c.arc(37,-35,4,0,7);c.fill();
    // brazos
    ell(c,-30,-20+Math.sin(t*14)*run*3,5,7);fs(c,c2);
    break;}
  case 'pepino': {
    feet(c,t,run,INK,9,0);
    rr(c,-19,-70,38,66,19);fs(c,c1);
    c.fillStyle=c2;for(const[hx,hy]of[[-10,-20],[10,-34],[-8,-52],[9,-12],[-11,-36]]){c.beginPath();c.arc(hx,hy,2.2,0,7);c.fill();}
    c.fillStyle='rgba(255,255,255,.3)';rr(c,-14,-64,6,34,3);c.fill();
    // antifaz ninja
    rr(c,-19,-54,38,15,7);fs(c,'#26262e');
    eyes(c,0,-47,7,3.7,lx,ly,fm==='idle'?'idle':fm,t);
    // cinta
    c.fillStyle='#ff4f5e';rr(c,-19,-62,38,6,2);c.fill();c.strokeStyle=INK;c.lineWidth=1.8;c.stroke();
    c.beginPath();c.moveTo(-16,-59);c.quadraticCurveTo(-34,-58+Math.sin(t*8)*4,-38,-48+Math.sin(t*8)*6);c.lineWidth=5;c.strokeStyle=INK;c.stroke();c.lineWidth=3;c.strokeStyle='#ff4f5e';c.stroke();
    mouth(c,0,-33,5,fm==='idle'?'smug':fm,t);
    // brazos
    ell(c,-22,-28+Math.sin(t*14)*run*3,4.5,6.5);fs(c,c1);ell(c,22,-28-Math.sin(t*14)*run*3,4.5,6.5);fs(c,c1);
    break;}
  }
  c.restore();
}

function drawPot(c,x,y,heat,t,mood,bounce,fillN){
  const h=heat/100;
  c.save();c.translate(x,y);
  const shake=h>.7?Math.sin(t*50)*(h-.7)*10:0;c.translate(shake,0);
  shadow(c,0,36,80,22,.3);
  // llamas
  const nf=5,fh=10+h*34;
  for(let i=0;i<nf;i++){const fx=-52+i*26,ph=t*9+i*1.7;const hh=fh*(.7+.3*Math.sin(ph));
    c.beginPath();c.moveTo(fx-12,34);c.quadraticCurveTo(fx-6,34-hh*.5,fx+Math.sin(ph)*5,34-hh);c.quadraticCurveTo(fx+7,34-hh*.5,fx+12,34);c.closePath();
    c.fillStyle=h>.6?'#ff3b1f':'#ff9f1a';c.fill();
    c.beginPath();c.moveTo(fx-6,34);c.quadraticCurveTo(fx-3,34-hh*.35,fx+Math.sin(ph)*3,34-hh*.6);c.quadraticCurveTo(fx+4,34-hh*.3,fx+6,34);c.closePath();c.fillStyle='#ffe066';c.fill();}
  // patas
  c.fillStyle='#2c2f3d';rr(c,-50,28,14,12,4);c.fill();rr(c,36,28,14,12,4);c.fill();
  // cuerpo
  const body=lerpCol('#5a6078','#b02b2b',Math.max(0,h-.35)/.65);
  c.save();c.translate(0,bounce?-bounce*8:0);
  rr(c,-62,-34,124,72,32);fs(c,body);
  c.fillStyle='rgba(255,255,255,.18)';rr(c,-52,-26,12,46,6);c.fill();
  // asas
  for(const s of[-1,1]){c.beginPath();c.arc(s*66,-8,13,0,7);c.lineWidth=7;c.strokeStyle=INK;c.stroke();c.lineWidth=4;c.strokeStyle='#8a90a8';c.stroke();}
  // borde y caldo
  ell(c,0,-34,66,22);fs(c,'#8a90a8');
  const liq=lerpCol('#7be07b','#ff4d3d',Math.min(1,h*1.1));
  ell(c,0,-34,57,16);fs(c,liq,INK,2);
  c.save();ell(c,0,-34,57,16);c.clip();
  c.fillStyle='rgba(255,255,255,.35)';
  for(let i=0;i<6;i++){const bx=Math.sin(t*1.7+i*2.1)*40,by=-34+Math.cos(t*2.3+i*1.3)*8,br=3+((t*2+i*.7)%1)*5;c.beginPath();c.arc(bx,by,br,0,7);c.stroke();}
  c.restore();
  // ingredientes flotando
  if(fillN>0){c.fillStyle='rgba(255,255,255,.5)';}
  // cara
  const pm=h>.88?'shout':h>.65?'angry':h>.4?'scared':'happy';
  const pe=mood||pm;
  eyes(c,0,0,17,7.5,0,.2,pe==='shout'?'scared':pe,t);
  mouth(c,0,22,10,pe,t);
  cheeks(c,0,14,30,6);
  c.restore();
  c.restore();
}
