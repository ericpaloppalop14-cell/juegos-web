/* Terminal de Nubes Gruñonas — dibujo (canvas 2D) */
const NGArt=(function(){
'use strict';
const PAL=[
 {n:'Fresa',f:'#ff5d73',d:'#c22f4c'},
 {n:'Limón',f:'#ffd24c',d:'#cf9a10'},
 {n:'Menta',f:'#4fd6a3',d:'#1f9a72'},
 {n:'Cielo',f:'#4fa8ff',d:'#2670cc'},
 {n:'Uva',f:'#a883f8',d:'#6a47c6'},
 {n:'Naranja',f:'#ff9b3e',d:'#cf6518'},
 {n:'Chicle',f:'#ff9fdc',d:'#cf5fa6'}
];
const SKINS=[
 {id:0,n:'Nube clásica',price:0,desc:'La de toda la vida. Gruñona de serie.'},
 {id:1,n:'Algodón de azúcar',price:250,desc:'Pastel y con purpurina. Gruñe, pero dulce.'},
 {id:2,n:'Tormenta eléctrica',price:450,desc:'Más oscura, con chispas. Da un poco de miedo.'},
 {id:3,n:'Gatonube',price:700,desc:'Con orejas y bigotes. Gruñe: ¡miau!'},
 {id:4,n:'Nube real',price:1000,desc:'Corona de oro. Se cree la reina del cielo.'},
 {id:5,n:'Nube guay',price:1400,desc:'Gafas de sol y pose de mala. Muy chula.'},
 {id:6,n:'Helado de nube',price:1900,desc:'Con virutas de colores y una cereza.'}
];
const SYM_NAMES=['corazón','estrella','gota','rombo','luna','rayo','flor'];
function hex(h){h=h.replace('#','');return[parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)];}
function mix(a,b,t){const A=hex(a),B=hex(b);return'#'+A.map((v,i)=>('0'+Math.round(v+(B[i]-v)*t).toString(16)).slice(-2)).join('');}
function rr(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function rng(seed){let a=seed|0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* ---------- símbolos (para daltónicos y decoración) ---------- */
function sym(ctx,k,x,y,s,col){
  ctx.save();ctx.translate(x,y);ctx.fillStyle=col;ctx.beginPath();
  if(k===0){ctx.moveTo(0,s*.9);ctx.bezierCurveTo(-s*1.5,-s*.1,-s*.7,-s*1.1,0,-s*.35);ctx.bezierCurveTo(s*.7,-s*1.1,s*1.5,-s*.1,0,s*.9);}
  else if(k===1){for(let i=0;i<10;i++){const r=i%2?s*.45:s,a=-Math.PI/2+i*Math.PI/5;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}}
  else if(k===2){ctx.moveTo(0,-s);ctx.bezierCurveTo(s*.3,-s*.4,s*.9,.1*s,s*.9,s*.35);ctx.arc(0,s*.35,s*.9,0,Math.PI);ctx.bezierCurveTo(-s*.9,.1*s,-s*.3,-s*.4,0,-s);}
  else if(k===3){ctx.moveTo(0,-s);ctx.lineTo(s*.8,0);ctx.lineTo(0,s);ctx.lineTo(-s*.8,0);}
  else if(k===4){ctx.arc(0,0,s,Math.PI*.35,Math.PI*1.65,false);ctx.arc(s*.45,0,s*.78,Math.PI*1.55,Math.PI*.45,true);}
  else if(k===5){ctx.moveTo(s*.25,-s);ctx.lineTo(-s*.6,s*.15);ctx.lineTo(-s*.05,s*.15);ctx.lineTo(-s*.3,s);ctx.lineTo(s*.65,-s*.2);ctx.lineTo(s*.05,-s*.2);}
  else {for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;ctx.moveTo(Math.cos(a)*s*.55+s*.42,Math.sin(a)*s*.55);ctx.arc(Math.cos(a)*s*.55,Math.sin(a)*s*.55,s*.42,0,7);}}
  ctx.fill();
  if(k===6){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.arc(0,0,s*.22,0,7);ctx.fill();}
  ctx.restore();
}

/* ---------- silueta de nube ---------- */
function cloudPath(ctx,x,y,W,H,u,w,h){
  ctx.beginPath();
  const top=y+H*(h>1?0.34:0.44),rad=Math.min(W,H)*0.24;
  rr(ctx,x+W*0.01,top,W*0.98,y+H-top,rad);
  const nb=2*w+1;
  for(let k=0;k<nb;k++){
    const f=Math.sin(Math.PI*(k+0.5)/nb);
    const r=u*(0.22+0.17*f)*(h>1?1.08:1);
    const cx=x+W*(0.13+0.74*k/(nb-1));
    const cy=top+u*0.06-(h>1?u*0.02:0);
    ctx.moveTo(cx+r,cy);ctx.arc(cx,cy,r,0,Math.PI*2);
  }
  if(h>1){for(let j=0;j<h;j++){const cy=y+H*(0.5+0.5*(j+0.3)/h);for(const sx of[0.08,0.92]){const r=u*0.24,cx=x+W*sx;ctx.moveTo(cx+r,cy);ctx.arc(cx,cy,r,0,Math.PI*2);}}}
}
function tint(color,skin){
  const P=PAL[color];let f=P.f,d=P.d;
  if(skin===1){f=mix(f,'#ffffff',.38);d=mix(d,'#ffffff',.3);}
  else if(skin===2){f=mix(f,'#39415f',.42);d=mix(d,'#1b2038',.45);}
  else if(skin===6){f=mix(f,'#fff6ee',.22);d=mix(d,'#ffd9c4',.2);}
  return{f,d};
}
const spriteCache={};
function cloudSprite(color,w,h,cs,skin,dpr,kind){
  const key=[color,w,h,cs,skin,dpr,kind||''].join('_');
  if(spriteCache[key])return spriteCache[key];
  const pad=Math.round(cs*0.2);
  const u=cs*0.92,W=w*cs-cs*0.06,H=h*cs-cs*0.06;
  const cv=document.createElement('canvas');cv.width=Math.ceil((w*cs+pad*2)*dpr);cv.height=Math.ceil((h*cs+pad*2)*dpr);
  const ctx=cv.getContext('2d');ctx.scale(dpr,dpr);
  const x=pad+cs*0.03,y=pad+cs*0.03;
  let f,d;
  if(kind==='fog'){f='#aab6cc';d='#6e7b96';}else if(kind==='white'){f='#ffffff';d='#cfe6f7';}else{const t=tint(color,skin);f=t.f;d=t.d;}
  // sombra suave
  ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#1d3557';ctx.translate(0,cs*0.05);cloudPath(ctx,x,y,W,H,u,w,h);ctx.fill();ctx.restore();
  cloudPath(ctx,x,y,W,H,u,w,h);
  ctx.lineJoin='round';ctx.lineWidth=Math.max(2.4,cs*0.065);ctx.strokeStyle=d;ctx.stroke();
  ctx.fillStyle=f;ctx.fill();
  ctx.save();ctx.clip();
  let g=ctx.createLinearGradient(0,y,0,y+H);
  g.addColorStop(0,'rgba(255,255,255,.42)');g.addColorStop(.42,'rgba(255,255,255,.04)');g.addColorStop(1,'rgba(0,0,0,.24)');
  ctx.fillStyle=g;ctx.fillRect(x-4,y-4,W+8,H+8);
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(x+W*0.26,y+H*0.22,u*0.13,u*0.07,-0.6,0,7);ctx.fill();
  if(skin===1&&kind!=='fog'&&kind!=='white'){const r=rng(color*17+w);ctx.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<5*w*h;i++){const px=x+r()*W,py=y+H*(0.3+0.6*r());ctx.beginPath();ctx.arc(px,py,cs*0.02+r()*cs*0.02,0,7);ctx.fill();}}
  if(skin===6&&kind!=='fog'&&kind!=='white'){const r=rng(color*31+h);const cc=['#ff5d73','#ffd24c','#4fd6a3','#4fa8ff','#fff'];for(let i=0;i<7*w*h;i++){ctx.save();ctx.translate(x+r()*W,y+H*(0.28+0.62*r()));ctx.rotate(r()*3);ctx.fillStyle=cc[i%5];ctx.fillRect(-cs*0.045,-cs*0.014,cs*0.09,cs*0.028);ctx.restore();}}
  if(skin===2&&kind!=='fog'&&kind!=='white'){ctx.strokeStyle='rgba(255,230,90,.9)';ctx.lineWidth=cs*0.025;ctx.beginPath();ctx.moveTo(x+W*0.78,y+H*0.5);ctx.lineTo(x+W*0.7,y+H*0.64);ctx.lineTo(x+W*0.78,y+H*0.64);ctx.lineTo(x+W*0.7,y+H*0.84);ctx.stroke();}
  ctx.restore();
  // accesorios sobre la silueta
  const cx=x+W/2;
  if(kind!=='fog'&&kind!=='white'){
    if(skin===3){ // orejas de gato
      for(const s of[-1,1]){ctx.beginPath();const bx=cx+s*W*0.3;ctx.moveTo(bx-s*cs*0.13,y+H*0.2);ctx.lineTo(bx+s*cs*0.02,y-cs*0.1);ctx.lineTo(bx+s*cs*0.17,y+H*0.22);ctx.closePath();ctx.fillStyle=f;ctx.fill();ctx.lineWidth=cs*0.05;ctx.strokeStyle=d;ctx.stroke();ctx.fillStyle='#ffb3c7';ctx.beginPath();ctx.moveTo(bx-s*cs*0.04,y+H*0.17);ctx.lineTo(bx+s*cs*0.03,y);ctx.lineTo(bx+s*cs*0.11,y+H*0.18);ctx.fill();}
    }
    if(skin===4){ // corona
      const cy=y-cs*0.02;ctx.fillStyle='#ffd24c';ctx.strokeStyle='#b9830a';ctx.lineWidth=cs*0.04;ctx.beginPath();ctx.moveTo(cx-cs*0.22,cy+cs*0.2);ctx.lineTo(cx-cs*0.25,cy-cs*0.08);ctx.lineTo(cx-cs*0.11,cy+cs*0.05);ctx.lineTo(cx,cy-cs*0.14);ctx.lineTo(cx+cs*0.11,cy+cs*0.05);ctx.lineTo(cx+cs*0.25,cy-cs*0.08);ctx.lineTo(cx+cs*0.22,cy+cs*0.2);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ff5d73';ctx.beginPath();ctx.arc(cx,cy+cs*0.1,cs*0.035,0,7);ctx.fill();
    }
    if(skin===6){ctx.fillStyle='#e8344f';ctx.beginPath();ctx.arc(cx+cs*0.03,y-cs*0.0,cs*0.1,0,7);ctx.fill();ctx.strokeStyle='#8a1a2b';ctx.lineWidth=cs*0.03;ctx.stroke();ctx.strokeStyle='#4f8b3a';ctx.lineWidth=cs*0.04;ctx.beginPath();ctx.moveTo(cx+cs*0.03,y-cs*0.08);ctx.quadraticCurveTo(cx+cs*0.1,y-cs*0.2,cx+cs*0.17,y-cs*0.17);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(cx,y-cs*0.03,cs*0.025,0,7);ctx.fill();}
  }
  const out={cv,pad,w:cv.width/dpr,h:cv.height/dpr};
  spriteCache[key]=out;return out;
}
function drawCloudSprite(ctx,color,w,h,px,py,cs,skin,dpr,kind,scale){
  const s=cloudSprite(color,w,h,cs,skin,dpr,kind);
  scale=scale||1;
  if(scale===1)ctx.drawImage(s.cv,px-s.pad,py-s.pad,s.w,s.h);
  else{const cx=px+w*cs/2,cy=py+h*cs/2;ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);ctx.drawImage(s.cv,-w*cs/2-s.pad,-h*cs/2-s.pad,s.w,s.h);ctx.restore();}
}

/* ---------- cara gruñona ---------- */
// expr: grumpy, mad, happy, wee, surprised, sad, sleep, proud
function face(ctx,cx,cy,s,expr,look,blink,skin,t){
  look=look||[0,0];
  const ex=s*0.2,ey=cy;
  ctx.save();
  ctx.lineCap='round';ctx.lineJoin='round';
  const dark='#2b2742';
  const closed=blink||expr==='wee'||expr==='sleep'||expr==='proud';
  const glasses=skin===5;
  // mejillas
  ctx.fillStyle='rgba(255,120,150,.38)';
  for(const sx of[-1,1]){ctx.beginPath();ctx.ellipse(cx+sx*s*0.36,cy+s*0.15,s*0.075,s*0.05,0,0,7);ctx.fill();}
  // ojos
  for(const sx of[-1,1]){
    const x=cx+sx*ex;
    if(glasses){continue;}
    if(closed){
      ctx.strokeStyle=dark;ctx.lineWidth=Math.max(1.6,s*0.05);ctx.beginPath();
      if(expr==='wee'||expr==='proud'){ctx.arc(x,ey+s*0.03,s*0.085,Math.PI*1.1,Math.PI*1.9);}else{ctx.moveTo(x-s*0.09,ey+s*0.02);ctx.quadraticCurveTo(x,ey+s*0.09,x+s*0.09,ey+s*0.02);}
      ctx.stroke();
    }else{
      const big=expr==='surprised'?1.25:1;
      ctx.fillStyle='#fff';ctx.strokeStyle='rgba(43,39,66,.55)';ctx.lineWidth=Math.max(1,s*0.025);
      ctx.beginPath();ctx.ellipse(x,ey,s*0.105*big,s*0.125*big,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=dark;ctx.beginPath();ctx.arc(x+look[0]*s*0.05,ey+look[1]*s*0.05+s*0.015,s*0.062*big,0,7);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+look[0]*s*0.05-s*0.02,ey+look[1]*s*0.05-s*0.015,s*0.02,0,7);ctx.fill();
    }
  }
  if(glasses){
    ctx.fillStyle='#1d1a30';
    for(const sx of[-1,1]){rr(ctx,cx+sx*ex-s*0.15,ey-s*0.1,s*0.3,s*0.2,s*0.07);ctx.fill();}
    ctx.strokeStyle='#1d1a30';ctx.lineWidth=s*0.04;ctx.beginPath();ctx.moveTo(cx-ex+s*0.15,ey-s*0.03);ctx.lineTo(cx+ex-s*0.15,ey-s*0.03);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.35)';for(const sx of[-1,1]){ctx.beginPath();ctx.ellipse(cx+sx*ex-s*0.06,ey-s*0.05,s*0.04,s*0.02,-.5,0,7);ctx.fill();}
  }
  // cejas
  ctx.strokeStyle=dark;ctx.lineWidth=Math.max(2,s*0.065);
  if(!glasses||true){
    const by=ey-s*0.2;
    for(const sx of[-1,1]){
      ctx.beginPath();
      if(expr==='grumpy'){ctx.moveTo(cx+sx*(ex+s*0.13),by-s*0.045);ctx.lineTo(cx+sx*(ex-s*0.1),by+s*0.045);}
      else if(expr==='mad'){ctx.moveTo(cx+sx*(ex+s*0.15),by-s*0.07);ctx.lineTo(cx+sx*(ex-s*0.1),by+s*0.09);}
      else if(expr==='sad'){ctx.moveTo(cx+sx*(ex+s*0.12),by+s*0.05);ctx.lineTo(cx+sx*(ex-s*0.1),by-s*0.035);}
      else if(expr==='surprised'){ctx.moveTo(cx+sx*(ex-s*0.1),by-s*0.07);ctx.quadraticCurveTo(cx+sx*ex,by-s*0.14,cx+sx*(ex+s*0.1),by-s*0.07);}
      else if(expr==='sleep'){continue;}
      else{ctx.moveTo(cx+sx*(ex+s*0.1),by);ctx.quadraticCurveTo(cx+sx*ex,by-s*0.05,cx+sx*(ex-s*0.1),by);}
      ctx.stroke();
    }
  }
  // boca
  const my=cy+s*0.28;
  ctx.lineWidth=Math.max(1.8,s*0.055);
  ctx.beginPath();
  if(expr==='grumpy'){ctx.moveTo(cx-s*0.1,my+s*0.03);ctx.quadraticCurveTo(cx,my-s*0.06,cx+s*0.1,my+s*0.03);ctx.stroke();}
  else if(expr==='mad'){ctx.fillStyle=dark;rr(ctx,cx-s*0.12,my-s*0.03,s*0.24,s*0.1,s*0.04);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(cx-s*0.09,my-s*0.03,s*0.18,s*0.035);}
  else if(expr==='happy'||expr==='wee'||expr==='proud'){ctx.fillStyle=dark;ctx.moveTo(cx-s*0.13,my-s*0.03);ctx.quadraticCurveTo(cx,my+s*0.2,cx+s*0.13,my-s*0.03);ctx.closePath();ctx.fill();ctx.fillStyle='#ff7a93';ctx.beginPath();ctx.ellipse(cx,my+s*0.07,s*0.06,s*0.03,0,0,7);ctx.fill();}
  else if(expr==='surprised'){ctx.fillStyle=dark;ctx.ellipse(cx,my+s*0.02,s*0.06,s*0.08,0,0,7);ctx.fill();}
  else if(expr==='sad'){ctx.moveTo(cx-s*0.1,my+s*0.06);ctx.quadraticCurveTo(cx,my-s*0.05,cx+s*0.1,my+s*0.06);ctx.stroke();ctx.fillStyle='#7cc7ff';const ty=(t*0.9)%1;ctx.beginPath();ctx.ellipse(cx-ex,ey+s*0.14+ty*s*0.25,s*0.03,s*0.045,0,0,7);ctx.fill();}
  else if(expr==='sleep'){ctx.moveTo(cx-s*0.06,my+s*0.02);ctx.quadraticCurveTo(cx,my+s*0.07,cx+s*0.06,my+s*0.02);ctx.stroke();}
  if(skin===3){ctx.strokeStyle='rgba(43,39,66,.55)';ctx.lineWidth=s*0.02;for(const sx of[-1,1])for(const k of[-1,0,1]){ctx.beginPath();ctx.moveTo(cx+sx*s*0.42,cy+s*0.17+k*s*0.04);ctx.lineTo(cx+sx*s*0.62,cy+s*0.17+k*s*0.1);ctx.stroke();}}
  ctx.restore();
}

/* ---------- pasajero (gotita) ---------- */
function passenger(ctx,x,y,r,color,idx,t,showSym){
  const P=PAL[color];
  ctx.save();ctx.translate(x,y);
  const bob=Math.sin(t*3+idx*1.7)*r*0.04;ctx.translate(0,bob);
  ctx.beginPath();ctx.moveTo(0,-r*1.38);ctx.bezierCurveTo(r*.25,-r*.95,r,-r*.5,r,r*.12);ctx.arc(0,r*.12,r,0,Math.PI,false);ctx.bezierCurveTo(-r,-r*.5,-r*.25,-r*.95,0,-r*1.38);ctx.closePath();
  ctx.fillStyle='rgba(30,50,90,.18)';ctx.save();ctx.translate(0,r*.18);ctx.fill();ctx.restore();
  ctx.lineWidth=Math.max(1.6,r*.14);ctx.lineJoin='round';ctx.strokeStyle=P.d;ctx.stroke();
  const g=ctx.createLinearGradient(0,-r*1.2,0,r*1.1);g.addColorStop(0,mix(P.f,'#ffffff',.35));g.addColorStop(.5,P.f);g.addColorStop(1,mix(P.f,P.d,.35));
  ctx.fillStyle=g;ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(-r*.45,-r*.12,r*.14,r*.26,.35,0,7);ctx.fill();
  const ey=r*.02;
  ctx.fillStyle='#2b2742';for(const sx of[-1,1]){ctx.beginPath();ctx.ellipse(sx*r*.32,ey,r*.1,r*.14,0,0,7);ctx.fill();}
  ctx.fillStyle='#fff';for(const sx of[-1,1]){ctx.beginPath();ctx.arc(sx*r*.32-r*.03,ey-r*.04,r*.035,0,7);ctx.fill();}
  ctx.strokeStyle='#2b2742';ctx.lineWidth=Math.max(1.2,r*.09);ctx.lineCap='round';ctx.beginPath();ctx.arc(0,r*.16,r*.2,.15*Math.PI,.85*Math.PI);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.35)';for(const sx of[-1,1]){ctx.beginPath();ctx.ellipse(sx*r*.58,r*.2,r*.12,r*.07,0,0,7);ctx.fill();}
  if(showSym)sym(ctx,color,0,r*.66,r*.2,'rgba(255,255,255,.95)');
  ctx.restore();
}

/* ---------- personajes ---------- */
function bubbleCloud(ctx,x,y,W,H,fill,outline,lw){
  const u=Math.min(W,H)*0.95;cloudPath(ctx,x,y,W,H,u,Math.max(1,Math.round(W/H)),1);
  ctx.lineJoin='round';ctx.lineWidth=lw;ctx.strokeStyle=outline;ctx.stroke();ctx.fillStyle=fill;ctx.fill();
  ctx.save();ctx.clip();const g=ctx.createLinearGradient(0,y,0,y+H);g.addColorStop(0,'rgba(255,255,255,.4)');g.addColorStop(.5,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,0,.22)');ctx.fillStyle=g;ctx.fillRect(x-5,y-5,W+10,H+10);ctx.restore();
}
function eyeBig(ctx,x,y,rx,ry,look,iris){
  ctx.fillStyle='#fff';ctx.strokeStyle='rgba(43,39,66,.6)';ctx.lineWidth=rx*.12;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle=iris||'#2b2742';ctx.beginPath();ctx.ellipse(x+look*rx*.25,y+ry*.1,rx*.55,ry*.62,0,0,7);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+look*rx*.25-rx*.2,y-ry*.12,rx*.17,0,7);ctx.fill();
}
function trueno(ctx,cx,cy,s,mood,t){
  t=t||0;ctx.save();ctx.translate(cx,cy);ctx.scale(s/100,s/100);
  const W=96,H=74,x=-W/2,y=-H/2+4;
  ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#1d3557';ctx.beginPath();ctx.ellipse(0,H/2+10,36,5,0,0,7);ctx.fill();ctx.restore();
  bubbleCloud(ctx,x,y,W,H,'#7d8db8','#3f4b78',3.4);
  // gorra de jefe de estación
  ctx.fillStyle='#26325b';ctx.strokeStyle='#161e3b';ctx.lineWidth=2.6;ctx.lineJoin='round';
  rr(ctx,-28,y-6,56,22,9);ctx.fill();ctx.stroke();
  ctx.fillStyle='#34447a';rr(ctx,-34,y+11,68,8,4);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffd24c';ctx.strokeStyle='#b9830a';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,y+5,6.5,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#b9830a';ctx.beginPath();ctx.moveTo(1.5,y+1);ctx.lineTo(-3,y+6);ctx.lineTo(-.2,y+6);ctx.lineTo(-1.5,y+10);ctx.lineTo(3.2,y+4.5);ctx.lineTo(.6,y+4.5);ctx.fill();
  const shout=mood==='shout';
  // ojos
  const ey=y+H*0.44;
  eyeBig(ctx,-17,ey,9.5,11,Math.sin(t*1.4)*.6,'#2b2742');eyeBig(ctx,17,ey,9.5,11,Math.sin(t*1.4)*.6,'#2b2742');
  ctx.strokeStyle='#1d1a30';ctx.lineWidth=5;ctx.lineCap='round';
  const bw=mood==='proud'?-1:1;
  ctx.beginPath();ctx.moveTo(-30,ey-16-(bw<0?2:0));ctx.lineTo(-8,ey-8+(bw<0?-5:0));ctx.moveTo(30,ey-16-(bw<0?2:0));ctx.lineTo(8,ey-8+(bw<0?-5:0));ctx.stroke();
  // bigote rayo
  ctx.fillStyle='#ffd24c';ctx.strokeStyle='#b9830a';ctx.lineWidth=2.2;
  for(const sx of[-1,1]){ctx.beginPath();ctx.moveTo(0,ey+17);ctx.quadraticCurveTo(sx*14,ey+8,sx*30,ey+20);ctx.lineTo(sx*24,ey+22);ctx.lineTo(sx*27,ey+27);ctx.quadraticCurveTo(sx*12,ey+26,0,ey+25);ctx.closePath();ctx.fill();ctx.stroke();}
  // boca
  ctx.fillStyle='#2b2742';
  if(shout){ctx.beginPath();ctx.ellipse(0,ey+33,9,7+Math.abs(Math.sin(t*9))*3,0,0,7);ctx.fill();}
  else if(mood==='proud'){ctx.beginPath();ctx.moveTo(-8,ey+29);ctx.quadraticCurveTo(0,ey+40,8,ey+29);ctx.fill();}
  else{ctx.strokeStyle='#2b2742';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-7,ey+33);ctx.quadraticCurveTo(0,ey+28,7,ey+33);ctx.stroke();}
  // silbato
  ctx.strokeStyle='#e8e8f0';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-26,ey+27);ctx.quadraticCurveTo(-34,ey+42,-20,ey+50);ctx.stroke();
  ctx.fillStyle='#ffd24c';ctx.strokeStyle='#b9830a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-18,ey+50,6.5,0,7);ctx.fill();ctx.stroke();ctx.fillRect(-12,ey+47,10,5);
  ctx.restore();
}
function cumulo(ctx,cx,cy,s,mood,t){
  t=t||0;ctx.save();ctx.translate(cx,cy);ctx.scale(s/100,s/100);
  const W=100,H=76,x=-W/2,y=-H/2;
  ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#1d3557';ctx.beginPath();ctx.ellipse(0,H/2+8,38,5,0,0,7);ctx.fill();ctx.restore();
  bubbleCloud(ctx,x,y,W,H,'#d4e8ff','#7ea7d6',3.4);
  const ey=y+H*0.5;
  const happy=mood==='happy';
  for(const sx of[-1,1]){
    if(happy){ctx.strokeStyle='#2b2742';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(sx*19,ey,9,Math.PI*1.1,Math.PI*1.9);ctx.stroke();}
    else{eyeBig(ctx,sx*19,ey,12,14,0,'#3b6fb6');ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(sx*19-4,ey-5,3.4,0,7);ctx.fill();}
    ctx.fillStyle='rgba(255,120,150,.45)';ctx.beginPath();ctx.ellipse(sx*31,ey+15,7,4.5,0,0,7);ctx.fill();
    // lágrimas
    if(!happy){for(let k=0;k<2;k++){const ph=((t*1.1+k*.5+(sx>0?.25:0))%1);ctx.fillStyle='rgba(110,190,255,.85)';ctx.beginPath();ctx.ellipse(sx*(24+k*3),ey+14+ph*30,3,4.5,0,0,7);ctx.fill();}}
  }
  ctx.strokeStyle='#2b2742';ctx.lineWidth=3.4;ctx.lineCap='round';ctx.beginPath();
  if(happy){ctx.fillStyle='#2b2742';ctx.moveTo(-9,ey+17);ctx.quadraticCurveTo(0,ey+34,9,ey+17);ctx.closePath();ctx.fill();}
  else{ctx.moveTo(-9,ey+27);ctx.quadraticCurveTo(-4,ey+19+Math.sin(t*8)*1.4,0,ey+23);ctx.quadraticCurveTo(4,ey+19-Math.sin(t*8)*1.4,9,ey+27);ctx.stroke();}
  ctx.strokeStyle='#2b2742';ctx.lineWidth=3;if(!happy){ctx.beginPath();for(const sx of[-1,1]){ctx.moveTo(sx*30,ey-19);ctx.lineTo(sx*10,ey-25);}ctx.stroke();}
  // pañuelo
  ctx.fillStyle='#fff';ctx.strokeStyle='#9bb7d9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(30,y+H-2);ctx.lineTo(46,y+H-12);ctx.lineTo(50,y+H+4);ctx.lineTo(34,y+H+8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.restore();
}
function granizo(ctx,cx,cy,s,t){
  t=t||0;ctx.save();ctx.translate(cx,cy);ctx.scale(s/100,s/100);
  const kids=[{x:-30,y:6,r:30,k:'papa'},{x:22,y:10,r:25,k:'mama'},{x:-2,y:-30,r:15,k:'peque'}];
  ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#1d3557';ctx.beginPath();ctx.ellipse(0,40,52,5,0,0,7);ctx.fill();ctx.restore();
  kids.forEach((o,i)=>{
    ctx.save();ctx.translate(o.x,o.y+Math.sin(t*3+i*2)*1.6);
    const g=ctx.createRadialGradient(-o.r*.3,-o.r*.35,o.r*.1,0,0,o.r);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#bfe3f7');
    ctx.fillStyle=g;ctx.strokeStyle='#6fb0d6';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,o.r,0,7);ctx.fill();ctx.stroke();
    const e=o.r*.32;ctx.fillStyle='#2b2742';for(const sx of[-1,1]){ctx.beginPath();ctx.ellipse(sx*e,-o.r*.1,o.r*.1,o.r*.14,0,0,7);ctx.fill();}
    ctx.strokeStyle='#2b2742';ctx.lineWidth=o.r*.09;ctx.lineCap='round';ctx.beginPath();
    for(const sx of[-1,1]){ctx.moveTo(sx*(e+o.r*.16),-o.r*.38);ctx.lineTo(sx*(e-o.r*.12),-o.r*.28);}ctx.stroke();
    ctx.beginPath();ctx.arc(0,o.r*.2,o.r*.18,.15*Math.PI,.85*Math.PI);ctx.stroke();
    if(o.k==='papa'){ctx.fillStyle='#6b4a2e';ctx.beginPath();ctx.ellipse(-o.r*.16,o.r*.12,o.r*.17,o.r*.07,.1,0,7);ctx.ellipse(o.r*.16,o.r*.12,o.r*.17,o.r*.07,-.1,0,7);ctx.fill();
      ctx.strokeStyle='#b9830a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e,-o.r*.1,o.r*.2,0,7);ctx.stroke();}
    if(o.k==='mama'){ctx.fillStyle='#ff7aa8';ctx.beginPath();ctx.moveTo(0,-o.r*.95);ctx.lineTo(-o.r*.4,-o.r*1.15);ctx.lineTo(-o.r*.4,-o.r*.7);ctx.closePath();ctx.moveTo(0,-o.r*.95);ctx.lineTo(o.r*.4,-o.r*1.15);ctx.lineTo(o.r*.4,-o.r*.7);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(0,-o.r*.95,o.r*.1,0,7);ctx.fillStyle='#ff4f86';ctx.fill();}
    if(o.k==='peque'){ctx.fillStyle='#4fa8ff';ctx.beginPath();ctx.arc(0,-o.r*.85,o.r*.5,Math.PI,0);ctx.fill();ctx.save();ctx.translate(0,-o.r*1.38);ctx.rotate(t*8);ctx.fillStyle='#ff5d73';ctx.fillRect(-o.r*.9,-1.5,o.r*1.8,3);ctx.restore();ctx.fillStyle='#2b2742';ctx.fillRect(-1,-o.r*1.38,2,o.r*.6);}
    ctx.restore();
  });
  ctx.restore();
}
function arcoiris(ctx,cx,cy,s,t){
  t=t||0;ctx.save();ctx.translate(cx,cy);ctx.scale(s/100,s/100);
  ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#1d3557';ctx.beginPath();ctx.ellipse(0,42,38,5,0,0,7);ctx.fill();ctx.restore();
  const cols=['#ff5d73','#ff9b3e','#ffd24c','#4fd6a3','#4fa8ff','#a883f8'];
  ctx.lineCap='butt';
  cols.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=5.2;ctx.beginPath();ctx.arc(0,-6,52-i*5,Math.PI*1.04,Math.PI*1.96);ctx.stroke();});
  const W=76,H=64,x=-W/2,y=-H/2+8;
  bubbleCloud(ctx,x,y,W,H,'#ffffff','#a9b6d6',3.2);
  const ey=y+H*0.5;
  for(const sx of[-1,1]){
    eyeBig(ctx,sx*14,ey,7.5,8.6,0,'#7a4bd0');
    ctx.strokeStyle='#2b2742';ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(sx*14+sx*6,ey-6);ctx.lineTo(sx*14+sx*12,ey-11);ctx.moveTo(sx*14+sx*7,ey-3);ctx.lineTo(sx*14+sx*14,ey-6);ctx.stroke();
    ctx.fillStyle='rgba(255,120,150,.5)';ctx.beginPath();ctx.ellipse(sx*25,ey+11,5.5,3.6,0,0,7);ctx.fill();
  }
  ctx.fillStyle='#e8344f';ctx.beginPath();ctx.moveTo(-7,ey+17);ctx.quadraticCurveTo(0,ey+13,7,ey+17);ctx.quadraticCurveTo(0,ey+27,-7,ey+17);ctx.fill();
  ctx.fillStyle='#fff';ctx.strokeStyle='#d9c27a';ctx.lineWidth=1.4;for(let i=0;i<7;i++){const a=Math.PI*(0.15+0.7*i/6);ctx.beginPath();ctx.arc(Math.cos(a)*24,y+H-4+Math.sin(a)*6,2.6,0,7);ctx.fill();ctx.stroke();}
  // bolso con monedas de colores
  ctx.fillStyle='#ffb3d9';ctx.strokeStyle='#cf5fa6';ctx.lineWidth=2.2;rr(ctx,26,y+H-8,22,18,5);ctx.fill();ctx.stroke();
  cols.slice(0,3).forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(31+i*6,y+H+1,3.2,0,7);ctx.fill();});
  for(let i=0;i<3;i++){const a=t*2+i*2.1;ctx.fillStyle='rgba(255,255,255,.95)';const px=Math.cos(a)*50,py=-10+Math.sin(a*1.3)*26;ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.fillRect(-3,-.8,6,1.6);ctx.fillRect(-.8,-3,1.6,6);ctx.restore();}
  ctx.restore();
}
function portrait(canvas,who,mood){
  const dpr=Math.min(2,window.devicePixelRatio||1);const w=canvas.clientWidth||64,h=canvas.clientHeight||64;
  if(canvas.width!==Math.round(w*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const t=performance.now()/1000;const s=Math.min(w,h)*0.92;
  if(who==='trueno')trueno(ctx,w/2,h/2,s,mood,t);else if(who==='cumulo')cumulo(ctx,w/2,h/2,s,mood,t);else if(who==='granizo')granizo(ctx,w/2,h/2,s,t);else arcoiris(ctx,w/2,h/2,s,t);
}

/* ---------- varios ---------- */
function coin(ctx,x,y,r,t){
  const sq=Math.abs(Math.cos((t||0)*4));
  ctx.save();ctx.translate(x,y);ctx.scale(0.35+0.65*sq,1);
  ctx.fillStyle='#ffd24c';ctx.strokeStyle='#b9830a';ctx.lineWidth=Math.max(1.5,r*.18);ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(185,131,10,.7)';ctx.lineWidth=Math.max(1,r*.12);ctx.beginPath();ctx.arc(0,0,r*.62,0,7);ctx.stroke();
  ctx.restore();
}
function padlock(ctx,x,y,r,n,wob){
  ctx.save();ctx.translate(x,y);ctx.rotate(wob||0);
  ctx.fillStyle='#ffd24c';ctx.strokeStyle='#8a5d00';ctx.lineWidth=Math.max(1.6,r*.16);
  ctx.beginPath();ctx.arc(0,-r*.35,r*.52,Math.PI,0);ctx.stroke();
  rr(ctx,-r*.8,-r*.3,r*1.6,r*1.2,r*.3);ctx.fill();ctx.stroke();
  ctx.fillStyle='#5b3b00';ctx.font='700 '+Math.round(r*1.05)+'px Fredoka, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,0,r*.32);
  ctx.restore();
}
function bolt(ctx,x,y,s,col,alpha){
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=col||'#ffe14a';ctx.strokeStyle='#b8860b';ctx.lineWidth=s*.08;ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(s*.2,-s*.6);ctx.lineTo(-s*.4,s*.1);ctx.lineTo(-s*.02,s*.1);ctx.lineTo(-s*.22,s*.62);ctx.lineTo(s*.42,-s*.14);ctx.lineTo(s*.04,-s*.14);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function arrow(ctx,x,y,s,dir,col){
  ctx.save();ctx.translate(x,y);ctx.rotate(dir*Math.PI/2);
  ctx.fillStyle=col||'#fff';ctx.strokeStyle='rgba(43,39,66,.55)';ctx.lineWidth=Math.max(1.2,s*.2);ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.95,s*.55);ctx.quadraticCurveTo(0,s*.15,-s*.95,s*.55);ctx.closePath();ctx.stroke();ctx.fill();
  ctx.restore();
}
return{PAL,SKINS,SYM_NAMES,mix,rr,sym,cloudPath,cloudSprite,drawCloudSprite,face,passenger,portrait,trueno,cumulo,granizo,arcoiris,coin,padlock,bolt,arrow,rng};
})();
