'use strict';
// ====== ARTE (todo dibujado con canvas: formas suaves y redondeadas) ======
const TAU = Math.PI*2;
function hex(c){ if(c[0]==='#'){ const n=parseInt(c.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; } return [255,255,255]; }
function mix(a,b,t){ const A=hex(a),B=hex(b); return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'; }
function mixArr(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function rgb(a){ return 'rgb('+a.map(v=>Math.round(v)).join(',')+')'; }
function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function eggPath(c,x,y,w,h){ c.beginPath(); c.moveTo(x,y-h); c.bezierCurveTo(x+w*.9,y-h,x+w,y+h*.25,x+w*.55,y+h*.8); c.bezierCurveTo(x+w*.3,y+h*1.05,x-w*.3,y+h*1.05,x-w*.55,y+h*.8); c.bezierCurveTo(x-w,y+h*.25,x-w*.9,y-h,x,y-h); c.closePath(); }
function sparkle(c,x,y,r,rot){ c.save(); c.translate(x,y); c.rotate(rot||0); c.beginPath(); for(let i=0;i<4;i++){ const a=i*Math.PI/2; c.lineTo(Math.cos(a)*r,Math.sin(a)*r); c.lineTo(Math.cos(a+Math.PI/4)*r*.28,Math.sin(a+Math.PI/4)*r*.28);} c.closePath(); c.fill(); c.restore(); }
function star5(c,x,y,r,rot){ c.save(); c.translate(x,y); c.rotate(rot||0); c.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rad=i%2?r*.45:r; c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);} c.closePath(); c.fill(); c.restore(); }

// ---------- GALLINA ----------
// (x,y) = centro del cuerpo; s = ancho del cuerpo. mood: 'happy' | 'panic' | 'hurt'
function drawChicken(c,ch,x,y,s,t,mood,feet){
  c.save(); c.translate(x,y);
  const bob=Math.sin(t*6)*s*.02, flap=Math.sin(t*14);
  c.lineJoin='round'; c.lineCap='round';
  // accesorios traseros
  if(ch.acc==='afro'){ c.fillStyle='#5b2fa0'; c.beginPath(); c.arc(0,-s*.42,s*.46,0,TAU); c.fill(); c.fillStyle='#7b45cc'; c.beginPath(); c.arc(-s*.16,-s*.55,s*.2,0,TAU); c.fill(); }
  if(ch.acc==='spikes'){ c.fillStyle='#4fbf59'; for(let i=0;i<4;i++){ const px=(-.18+i*.2)*s; c.beginPath(); c.moveTo(px-s*.1,-s*.46+i*s*.01); c.lineTo(px,-s*.7+(i%2)*s*.05); c.lineTo(px+s*.1,-s*.46); c.fill(); } }
  // cola
  c.fillStyle=ch.body; c.strokeStyle='rgba(58,42,107,.28)'; c.lineWidth=s*.035;
  for(let i=-1;i<=1;i++){ c.beginPath(); c.ellipse(-s*.42,-s*.05+i*s*.12-(Math.abs(flap)*s*.01),s*.16,s*.08,-.6+i*.5,0,TAU); c.fill(); c.stroke(); }
  // cuerpo
  const g=c.createRadialGradient(-s*.15,-s*.2,s*.05,0,0,s*.65);
  g.addColorStop(0,'#fff'); g.addColorStop(.25,ch.body); g.addColorStop(1,mix(ch.body,'#a67aff',.28));
  c.fillStyle=g; c.beginPath(); c.ellipse(0,bob,s*.5,s*.5,0,0,TAU); c.fill();
  c.lineWidth=s*.04; c.strokeStyle='rgba(58,42,107,.3)'; c.stroke();
  // cresta
  c.fillStyle=ch.comb; c.strokeStyle='rgba(58,42,107,.28)'; c.lineWidth=s*.03;
  if(ch.acc!=='crown'&&ch.acc!=='afro'){ for(let i=-1;i<=1;i++){ c.beginPath(); c.arc(i*s*.12,-s*.5+Math.abs(i)*s*.05+bob,s*.1,0,TAU); c.fill(); c.stroke(); } }
  // mejillas
  c.fillStyle='rgba(255,105,140,.45)'; c.beginPath(); c.arc(-s*.3,s*.1+bob,s*.07,0,TAU); c.arc(s*.3,s*.1+bob,s*.07,0,TAU); c.fill();
  // ojos
  const ey=-s*.08+bob, ex=s*.17;
  if(mood==='hurt'){ c.strokeStyle='#2b1d4d'; c.lineWidth=s*.045; for(const sx of [-1,1]){ c.beginPath(); c.moveTo(sx*ex-s*.05,ey-s*.05); c.lineTo(sx*ex+s*.05,ey+s*.05); c.moveTo(sx*ex+s*.05,ey-s*.05); c.lineTo(sx*ex-s*.05,ey+s*.05); c.stroke(); } }
  else { const er=mood==='panic'?s*.115:s*.085; for(const sx of [-1,1]){ c.fillStyle='#fff'; c.beginPath(); c.arc(sx*ex,ey,er,0,TAU); c.fill(); c.lineWidth=s*.02; c.strokeStyle='rgba(58,42,107,.4)'; c.stroke(); c.fillStyle='#2b1d4d'; c.beginPath(); c.arc(sx*ex+(mood==='panic'?0:s*.015),ey+s*.005,er*(mood==='panic'?.42:.58),0,TAU); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(sx*ex-er*.15,ey-er*.25,er*.2,0,TAU); c.fill(); } }
  // pico
  c.fillStyle='#ffa530'; c.strokeStyle='#d9741a'; c.lineWidth=s*.025;
  const open=mood==='panic'?s*.07:s*.015;
  c.beginPath(); c.moveTo(-s*.1,s*.03+bob); c.quadraticCurveTo(0,-s*.04+bob,s*.1,s*.03+bob); c.quadraticCurveTo(s*.06,s*.13+bob,0,s*.14+bob+open); c.quadraticCurveTo(-s*.06,s*.13+bob,-s*.1,s*.03+bob); c.fill(); c.stroke();
  if(open>s*.03){ c.fillStyle='#c4344a'; c.beginPath(); c.ellipse(0,s*.12+bob,s*.04,open*.5,0,0,TAU); c.fill(); }
  // moflete / barbilla
  c.fillStyle=ch.comb; c.beginPath(); c.ellipse(0,s*.2+bob,s*.05,s*.07,0,0,TAU); c.fill();
  // ala
  c.save(); c.translate(s*.34,s*.2+bob); c.rotate(.5+flap*.35*(mood==='panic'?1.6:.6));
  c.fillStyle=mix(ch.body,'#ffffff',.2); c.strokeStyle='rgba(58,42,107,.3)'; c.lineWidth=s*.03;
  c.beginPath(); c.ellipse(0,0,s*.2,s*.11,0,0,TAU); c.fill(); c.stroke(); c.restore();
  c.save(); c.translate(-s*.34,s*.2+bob); c.rotate(-.5-flap*.35*(mood==='panic'?1.6:.6));
  c.fillStyle=mix(ch.body,'#ffffff',.2); c.strokeStyle='rgba(58,42,107,.3)'; c.lineWidth=s*.03;
  c.beginPath(); c.ellipse(0,0,s*.2,s*.11,0,0,TAU); c.fill(); c.stroke(); c.restore();
  // accesorios delanteros
  const A=ch.acc;
  if(A==='goggles'){ c.strokeStyle='#5a3b1e'; c.lineWidth=s*.04; c.beginPath(); c.moveTo(-s*.46,ey-s*.02); c.lineTo(s*.46,ey-s*.02); c.stroke(); for(const sx of [-1,1]){ c.fillStyle='rgba(120,220,255,.65)'; c.beginPath(); c.arc(sx*ex,ey,s*.13,0,TAU); c.fill(); c.strokeStyle='#d98a2b'; c.lineWidth=s*.04; c.stroke(); } }
  if(A==='bandana'){ c.fillStyle='#e8262f'; c.beginPath(); c.moveTo(-s*.5,-s*.24+bob); c.quadraticCurveTo(0,-s*.34+bob,s*.5,-s*.24+bob); c.lineTo(s*.5,-s*.13+bob); c.quadraticCurveTo(0,-s*.22+bob,-s*.5,-s*.13+bob); c.closePath(); c.fill(); c.beginPath(); c.moveTo(s*.46,-s*.2+bob); c.lineTo(s*.66,-s*.1+Math.sin(t*10)*s*.04); c.lineTo(s*.5,-s*.1+bob); c.fill(); }
  if(A==='afro'){ c.fillStyle='#14102b'; for(const sx of [-1,1]){ rr(c,sx*ex-s*.12,ey-s*.08,s*.24,s*.17,s*.07); c.fill(); } c.fillRect(-s*.05,ey-s*.05,s*.1,s*.04); c.fillStyle='rgba(255,255,255,.5)'; c.beginPath(); c.arc(-ex-s*.04,ey-s*.03,s*.025,0,TAU); c.fill(); }
  if(A==='antenna'){ c.strokeStyle='#8aa2c0'; c.lineWidth=s*.04; c.beginPath(); c.moveTo(0,-s*.5+bob); c.quadraticCurveTo(s*.08,-s*.68,s*.04,-s*.78); c.stroke(); c.fillStyle='#ff4f5e'; c.beginPath(); c.arc(s*.04,-s*.8+Math.sin(t*8)*s*.01,s*.07,0,TAU); c.fill(); }
  if(A==='ninja'){ c.fillStyle='#232338'; c.beginPath(); c.moveTo(-s*.5,ey-s*.14); c.quadraticCurveTo(0,ey-s*.24,s*.5,ey-s*.14); c.lineTo(s*.5,ey+s*.1); c.quadraticCurveTo(0,ey+s*.02,-s*.5,ey+s*.1); c.closePath(); c.fill(); c.fillStyle='#fff'; for(const sx of [-1,1]){ c.beginPath(); c.ellipse(sx*ex,ey-s*.01,s*.08,s*.055,sx*-.2,0,TAU); c.fill(); c.fillStyle='#2b1d4d'; c.beginPath(); c.arc(sx*ex+s*.01,ey-s*.01,s*.035,0,TAU); c.fill(); c.fillStyle='#fff'; } c.fillStyle='#232338'; c.beginPath(); c.moveTo(s*.45,ey-s*.05); c.lineTo(s*.7,ey-s*.15+Math.sin(t*9)*s*.05); c.lineTo(s*.6,ey+s*.02); c.lineTo(s*.75,ey+s*.08+Math.sin(t*9+1)*s*.05); c.lineTo(s*.45,ey+s*.05); c.fill(); }
  if(A==='crown'){ c.fillStyle='#ffd23f'; c.strokeStyle='#c98400'; c.lineWidth=s*.03; c.beginPath(); c.moveTo(-s*.2,-s*.46+bob); c.lineTo(-s*.24,-s*.7+bob); c.lineTo(-s*.1,-s*.58+bob); c.lineTo(0,-s*.76+bob); c.lineTo(s*.1,-s*.58+bob); c.lineTo(s*.24,-s*.7+bob); c.lineTo(s*.2,-s*.46+bob); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#ff4f9a'; c.beginPath(); c.arc(0,-s*.54+bob,s*.04,0,TAU); c.fill(); }
  if(feet){ c.strokeStyle='#ffa530'; c.lineWidth=s*.05; for(const sx of [-1,1]){ c.beginPath(); c.moveTo(sx*s*.14,s*.48); c.lineTo(sx*s*.14,s*.62); c.moveTo(sx*s*.14-s*.08,s*.66); c.lineTo(sx*s*.14,s*.62); c.lineTo(sx*s*.14+s*.08,s*.66); c.stroke(); } }
  c.restore();
}

// ---------- COHETE CASERO ----------
// (x,y)=centro. tier 0..2. thrust 0..1. escala sc.
function drawRocket(c,x,y,sc,tier,t,thrust,ch,mood,opts){
  opts=opts||{};
  c.save(); c.translate(x,y); c.scale(sc,sc); if(opts.tilt) c.rotate(opts.tilt);
  c.lineJoin='round'; c.lineCap='round';
  // llama
  if(thrust>0.02){
    const fl=(50+95*thrust)*(0.85+0.15*Math.sin(t*50)+0.1*Math.random());
    c.save(); c.globalCompositeOperation='lighter';
    const flame=(w,l,col)=>{ c.fillStyle=col; c.beginPath(); c.moveTo(-w,62); c.quadraticCurveTo(-w*1.1,62+l*.55,0,62+l); c.quadraticCurveTo(w*1.1,62+l*.55,w,62); c.closePath(); c.fill(); };
    flame(26,fl,'rgba(255,90,40,.85)'); flame(18,fl*.78,'rgba(255,190,50,.9)'); flame(9,fl*.5,'rgba(255,255,230,.95)');
    if(tier>=1){ for(const sx of [-1,1]){ c.save(); c.translate(sx*52,18); flame(9,fl*.55,'rgba(255,170,60,.85)'); c.restore(); } }
    c.restore();
  }
  // latas laterales (tier1+)
  if(tier>=1){ for(const sx of [-1,1]){ c.fillStyle='#d9dde8'; rr(c,sx*52-12,-10,24,76,10); c.fill(); c.strokeStyle='rgba(58,42,107,.35)'; c.lineWidth=3; c.stroke(); c.fillStyle=sx<0?'#ff6b5e':'#3aa0ff'; rr(c,sx*52-12,6,24,26,6); c.fill(); c.fillStyle='#5a5f78'; c.beginPath(); c.moveTo(sx*52-9,66); c.lineTo(sx*52+9,66); c.lineTo(sx*52+12,76); c.lineTo(sx*52-12,76); c.fill(); c.fillStyle='#ff8bd0'; c.beginPath(); c.arc(sx*52,-10,12,Math.PI,0); c.fill(); } }
  // aletas (tostadoras)
  for(const sx of [-1,1]){ c.save(); c.scale(sx,1); c.fillStyle='#ff5f6d'; c.strokeStyle='rgba(58,42,107,.35)'; c.lineWidth=3.5; c.beginPath(); c.moveTo(28,8); c.quadraticCurveTo(66,22,60,62); c.quadraticCurveTo(40,66,28,52); c.closePath(); c.fill(); c.stroke(); c.fillStyle='rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(46,40,5,12,.3,0,TAU); c.fill(); c.restore(); }
  // tobera
  c.fillStyle='#5a5f78'; c.beginPath(); c.moveTo(-20,54); c.lineTo(20,54); c.lineTo(27,70); c.lineTo(-27,70); c.closePath(); c.fill(); c.strokeStyle='rgba(30,20,60,.5)'; c.lineWidth=3; c.stroke();
  c.fillStyle='#8c92ad'; c.fillRect(-27,66,54,5);
  // barril de madera
  const gr=c.createLinearGradient(-36,0,36,0); gr.addColorStop(0,'#b9733a'); gr.addColorStop(.35,'#e3a35e'); gr.addColorStop(.7,'#d08a48'); gr.addColorStop(1,'#a2602d');
  c.fillStyle=gr; rr(c,-36,-42,72,100,22); c.fill(); c.strokeStyle='rgba(70,35,10,.55)'; c.lineWidth=3.5; c.stroke();
  c.strokeStyle='rgba(90,50,20,.4)'; c.lineWidth=2; for(const px of [-18,0,18]){ c.beginPath(); c.moveTo(px,-36); c.lineTo(px,54); c.stroke(); }
  // aros metálicos
  for(const by of [-18,34]){ const g2=c.createLinearGradient(0,by,0,by+10); g2.addColorStop(0,'#eef1f8'); g2.addColorStop(1,'#9097b0'); c.fillStyle=g2; rr(c,-37,by,74,11,5); c.fill(); c.strokeStyle='rgba(58,42,107,.35)'; c.lineWidth=2; c.stroke(); }
  // clavos
  c.fillStyle='#6a6f88'; for(const [px,py] of [[-27,-12],[27,-12],[-27,40],[27,40]]){ c.beginPath(); c.arc(px,py,2.3,0,TAU); c.fill(); }
  // cinta americana
  c.save(); c.fillStyle='rgba(160,168,185,.92)'; c.translate(-4,13); c.rotate(-.2); rr(c,-34,-6,50,12,3); c.fill(); c.rotate(.5); rr(c,-6,-8,48,12,3); c.fill(); c.restore();
  // escotilla
  c.fillStyle='#ffe9a8'; c.strokeStyle='#8a5a20'; c.lineWidth=3.5; c.beginPath(); c.arc(0,10,0,0,TAU); 
  // dibujo "huevo" decorativo
  c.fillStyle='#fff6e6'; eggPath(c,0,18,9,11); c.fill(); c.strokeStyle='rgba(58,42,107,.4)'; c.lineWidth=2.5; c.stroke();
  c.fillStyle='#ff5fa8'; c.beginPath(); c.arc(-3,17,2,0,TAU); c.arc(3,21,2,0,TAU); c.fill();
  if(tier>=2){ c.fillStyle='#ffd23f'; c.strokeStyle='#c98400'; c.lineWidth=2; for(const by of [-18,34]){ rr(c,-37,by,74,11,5); c.fill(); c.stroke(); } c.fillStyle='#fff'; star5(c,0,44,7,0); }
  // cúpula de pecera + gallina
  c.save(); c.beginPath(); c.arc(0,-46,36,Math.PI,0); c.lineTo(36,-40); c.lineTo(-36,-40); c.closePath(); c.clip();
  c.fillStyle='rgba(180,235,255,.55)'; c.fillRect(-40,-90,80,60);
  drawChicken(c,ch,0,-54,54,t,mood||'happy');
  c.restore();
  c.fillStyle='rgba(180,235,255,.28)'; c.beginPath(); c.arc(0,-46,36,Math.PI,0); c.lineTo(36,-40); c.lineTo(-36,-40); c.closePath(); c.fill();
  c.strokeStyle='#eaf8ff'; c.lineWidth=4; c.beginPath(); c.arc(0,-46,36,Math.PI,0); c.stroke();
  c.strokeStyle='rgba(255,255,255,.85)'; c.lineWidth=5; c.beginPath(); c.arc(0,-46,28,Math.PI*1.15,Math.PI*1.45); c.stroke();
  c.fillStyle='#d9dde8'; rr(c,-40,-44,80,9,4); c.fill(); c.strokeStyle='rgba(58,42,107,.35)'; c.lineWidth=2.5; c.stroke();
  // banderín
  c.strokeStyle='#8c92ad'; c.lineWidth=3; c.beginPath(); c.moveTo(0,-82); c.lineTo(0,-104); c.stroke();
  c.fillStyle='#ff5fa8'; c.beginPath(); c.moveTo(0,-104); c.quadraticCurveTo(14,-103+Math.sin(t*12)*3,24,-96+Math.sin(t*12+1)*3); c.quadraticCurveTo(12,-92,0,-92); c.fill();
  c.restore();
}

// ---------- PLANETAS-HUEVO ----------
function drawPlanet(c,x,y,r,P,t){
  c.save(); c.translate(x,y); t=t||0;
  const h=r*1.14;
  // halo
  const halo=c.createRadialGradient(0,0,r*.8,0,0,r*1.5); halo.addColorStop(0,'rgba(255,255,255,.28)'); halo.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=halo; c.beginPath(); c.arc(0,0,r*1.5,0,TAU); c.fill();
  c.save(); c.beginPath(); c.ellipse(0,0,r,h,0,0,TAU); c.clip();
  const g=c.createRadialGradient(-r*.35,-h*.4,r*.1,0,0,r*1.25); g.addColorStop(0,'#ffffff'); g.addColorStop(.2,P.base); g.addColorStop(1,P.shade); c.fillStyle=g; c.fillRect(-r,-h,r*2,h*2);
  const id=P.id;
  if(id==='luna'){ c.fillStyle='rgba(190,140,20,.55)'; for(const [a,b,rad] of [[-.35,-.4,.2],[.3,-.1,.25],[-.2,.35,.16],[.45,.45,.12],[-.5,.05,.1],[.1,-.65,.1]]){ c.beginPath(); c.arc(a*r,b*h,rad*r,0,TAU); c.fill(); c.fillStyle='rgba(255,246,170,.55)'; c.beginPath(); c.arc(a*r-rad*r*.2,b*h-rad*r*.2,rad*r*.7,0,TAU); c.fill(); c.fillStyle='rgba(190,140,20,.55)'; } }
  if(id==='frito'){ c.fillStyle='rgba(255,255,255,.0)'; const yg=c.createRadialGradient(-r*.1,h*.05,r*.05,0,h*.1,r*.5); yg.addColorStop(0,'#fff6a0'); yg.addColorStop(.35,'#ffc21a'); yg.addColorStop(1,'#ff8a00'); c.fillStyle=yg; c.beginPath(); c.arc(0,h*.1,r*.46,0,TAU); c.fill(); c.fillStyle='rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-r*.17,-h*.05,r*.1,r*.06,-.6,0,TAU); c.fill(); c.fillStyle='rgba(255,170,60,.35)'; c.beginPath(); c.arc(-r*.5,-h*.55,r*.14,0,TAU); c.arc(r*.55,h*.6,r*.12,0,TAU); c.fill(); }
  if(id==='tortilla'){ c.fillStyle='rgba(138,90,43,.55)'; for(const [a,b,rad] of [[-.4,-.45,.14],[.35,-.3,.18],[.05,.2,.16],[-.45,.4,.12],[.5,.5,.15],[-.1,-.75,.1]]){ c.beginPath(); c.ellipse(a*r,b*h,rad*r*1.3,rad*r,a,0,TAU); c.fill(); } c.fillStyle='rgba(255,246,170,.5)'; for(const [a,b] of [[.2,-.6],[-.3,.05],[.4,.2]]){ c.beginPath(); c.arc(a*r,b*h,r*.07,0,TAU); c.fill(); } }
  if(id==='revuelta'){ c.lineWidth=r*.12; c.lineCap='round'; for(let i=0;i<5;i++){ c.strokeStyle=i%2?'rgba(255,255,255,.55)':'rgba(255,100,160,.6)'; c.beginPath(); for(let a=0;a<9;a+=.2){ const rad=r*(.1+a*.1); c.lineTo(Math.cos(a+i*1.256+t*.3)*rad,Math.sin(a+i*1.256+t*.3)*rad*1.1); } c.stroke(); } }
  if(id==='gallinero'){ c.fillStyle='#ffffff'; c.fillRect(-r,-h*.1,r*2,h*.14); c.fillRect(-r,h*.3,r*2,h*.14); c.fillStyle='#ffd23f'; for(const sx of [-.45,.05,.5]) { rr(c,sx*r-r*.12,-h*.62,r*.24,r*.3,r*.05); c.fill(); } c.fillStyle='#7a2a20'; c.beginPath(); c.moveTo(-r*.7,-h*.4); c.lineTo(0,-h*.95); c.lineTo(r*.7,-h*.4); c.fill(); }
  if(id==='dorado'){ const sh=c.createLinearGradient(-r,-h,r,h); sh.addColorStop(0,'rgba(255,255,255,.6)'); sh.addColorStop(.35,'rgba(255,255,255,0)'); sh.addColorStop(.7,'rgba(255,255,255,.25)'); sh.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=sh; c.fillRect(-r,-h,r*2,h*2); }
  c.restore();
  c.strokeStyle='rgba(58,42,107,.35)'; c.lineWidth=Math.max(2,r*.035); c.beginPath(); c.ellipse(0,0,r,h,0,0,TAU); c.stroke();
  // carita simpática
  c.fillStyle='#2b1d4d'; c.beginPath(); c.arc(-r*.22,-h*.28,r*.055,0,TAU); c.arc(r*.22,-h*.28,r*.055,0,TAU); c.fill(); c.strokeStyle='#2b1d4d'; c.lineWidth=r*.03; c.beginPath(); c.arc(0,-h*.22,r*.1,.2,Math.PI-.2); c.stroke();
  c.fillStyle='rgba(255,100,140,.4)'; c.beginPath(); c.arc(-r*.36,-h*.2,r*.06,0,TAU); c.arc(r*.36,-h*.2,r*.06,0,TAU); c.fill();
  if(id==='dorado'){ c.fillStyle='#fff'; for(let i=0;i<4;i++) sparkle(c,Math.cos(t*1.5+i*1.6)*r*.9,Math.sin(t*1.2+i*1.9)*h*.9,r*(.08+.05*Math.sin(t*5+i)),t+i); }
  c.restore();
}

// ---------- COLECCIONABLES ----------
const EGGCOL=[['#fff6e6','#ffd1a8'],['#c8f0ff','#6fc7f0'],['#ffd6f0','#ff8cc8'],['#d9ffd0','#7ee07a'],['#e6d9ff','#a98aff']];
function drawItem(c,it,t){
  const y=it.sy, x=it.x; c.save(); c.translate(x,y);
  const ty=it.type;
  if(ty==='coin'){ const sx=Math.max(.22,Math.abs(Math.cos(t*4+it.ph))); c.scale(sx,1); const r=it.r;
    const g=c.createRadialGradient(-r*.3,-r*.35,r*.1,0,0,r); g.addColorStop(0,'#fff9c4'); g.addColorStop(.5,'#ffd23f'); g.addColorStop(1,'#e69a00'); c.fillStyle=g; c.beginPath(); c.arc(0,0,r,0,TAU); c.fill(); c.strokeStyle='#b97800'; c.lineWidth=2.5; c.stroke(); c.strokeStyle='rgba(255,255,255,.7)'; c.lineWidth=2; c.beginPath(); c.arc(0,0,r*.62,0,TAU); c.stroke(); c.fillStyle='rgba(185,120,0,.8)'; c.font='700 '+(r*1.1)+'px Fredoka,sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('★',0,1); }
  else if(ty==='egg'){ const r=it.r, col=EGGCOL[it.col%EGGCOL.length]; c.rotate(Math.sin(t*3+it.ph)*.25); const g=c.createLinearGradient(-r,-r,r,r); g.addColorStop(0,col[0]); g.addColorStop(1,col[1]); c.fillStyle=g; eggPath(c,0,0,r*.85,r*1.0); c.fill(); c.strokeStyle='rgba(58,42,107,.45)'; c.lineWidth=2.5; c.stroke(); c.fillStyle='rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(-r*.3,-r*.35,r*.14,r*.26,.5,0,TAU); c.fill(); c.fillStyle=col[1]; c.beginPath(); c.arc(r*.2,r*.15,r*.13,0,TAU); c.arc(-r*.15,r*.4,r*.09,0,TAU); c.fill(); }
  else if(ty==='golden'){ const r=it.r, p=1+Math.sin(t*6)*.07; c.scale(p,p);
    const halo=c.createRadialGradient(0,0,r*.3,0,0,r*2.4); halo.addColorStop(0,'rgba(255,230,120,.8)'); halo.addColorStop(1,'rgba(255,230,120,0)'); c.fillStyle=halo; c.beginPath(); c.arc(0,0,r*2.4,0,TAU); c.fill();
    c.rotate(Math.sin(t*2.5)*.18); const g=c.createLinearGradient(-r,-r,r,r); g.addColorStop(0,'#fff7b0'); g.addColorStop(.45,'#ffd23f'); g.addColorStop(1,'#e08a00'); c.fillStyle=g; eggPath(c,0,0,r*.85,r); c.fill(); c.strokeStyle='#a56a00'; c.lineWidth=3; c.stroke(); c.fillStyle='rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-r*.3,-r*.35,r*.15,r*.3,.5,0,TAU); c.fill(); c.fillStyle='#fff'; sparkle(c,r*.7,-r*.7,r*.4,t*2); sparkle(c,-r*.8,r*.4,r*.25,-t*2); }
  else if(ty==='corn'){ const r=it.r; c.rotate(Math.sin(t*4+it.ph)*.15+.3); c.fillStyle='#5fcf5a'; c.beginPath(); c.moveTo(0,r*.1); c.quadraticCurveTo(-r*.9,r*.2,-r*.55,r*1.1); c.quadraticCurveTo(-r*.1,r*.7,0,r*.5); c.fill(); c.beginPath(); c.moveTo(0,r*.1); c.quadraticCurveTo(r*.9,r*.2,r*.55,r*1.1); c.quadraticCurveTo(r*.1,r*.7,0,r*.5); c.fill(); const g=c.createLinearGradient(-r*.4,0,r*.4,0); g.addColorStop(0,'#ffe36b'); g.addColorStop(1,'#ffb300'); c.fillStyle=g; c.strokeStyle='#b57a00'; c.lineWidth=2.5; c.beginPath(); c.ellipse(0,-r*.2,r*.42,r*.85,0,0,TAU); c.fill(); c.stroke(); c.fillStyle='rgba(181,122,0,.5)'; for(let i=0;i<9;i++){ c.beginPath(); c.arc(((i%3)-1)*r*.22,-r*.75+Math.floor(i/3)*r*.42,r*.07,0,TAU); c.fill(); } const glow=c.createRadialGradient(0,0,r*.4,0,0,r*1.6); glow.addColorStop(0,'rgba(255,240,150,.35)'); glow.addColorStop(1,'rgba(255,240,150,0)'); c.fillStyle=glow; c.beginPath(); c.arc(0,0,r*1.6,0,TAU); c.fill(); }
  else if(ty==='turbo'){ const r=it.r, p=1+Math.sin(t*9)*.09; c.scale(p,p); const g=c.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r); g.addColorStop(0,'#ffc2ea'); g.addColorStop(1,'#ff3f9a'); c.fillStyle=g; c.beginPath(); c.arc(0,0,r,0,TAU); c.fill(); c.strokeStyle='#fff'; c.lineWidth=4; c.stroke(); c.fillStyle='#fff'; c.beginPath(); c.moveTo(r*.2,-r*.7); c.lineTo(-r*.45,r*.1); c.lineTo(-r*.05,r*.1); c.lineTo(-r*.2,r*.7); c.lineTo(r*.45,-r*.1); c.lineTo(r*.05,-r*.1); c.closePath(); c.fill(); const halo=c.createRadialGradient(0,0,r,0,0,r*2); halo.addColorStop(0,'rgba(255,100,190,.4)'); halo.addColorStop(1,'rgba(255,100,190,0)'); c.fillStyle=halo; c.beginPath(); c.arc(0,0,r*2,0,TAU); c.fill(); }
  else if(ty==='magnet'){ const r=it.r; c.rotate(Math.sin(t*5+it.ph)*.2); c.lineWidth=r*.5; c.lineCap='butt'; c.strokeStyle='#ff4f5e'; c.beginPath(); c.arc(0,0,r*.6,Math.PI,0); c.lineTo(r*.6,r*.4); c.moveTo(-r*.6,0); c.lineTo(-r*.6,r*.4); c.stroke(); c.strokeStyle='#e9eef8'; c.beginPath(); c.moveTo(r*.6,r*.4); c.lineTo(r*.6,r*.85); c.moveTo(-r*.6,r*.4); c.lineTo(-r*.6,r*.85); c.stroke(); c.fillStyle='rgba(255,255,255,.8)'; for(let i=0;i<3;i++) sparkle(c,Math.cos(t*4+i*2.1)*r*1.1,Math.sin(t*4+i*2.1)*r*1.1,5,t); }
  c.restore();
}

// ---------- OBSTÁCULOS ----------
function drawHazard(c,h,t,P){
  c.save(); c.translate(h.x,h.sy); const r=h.r; const ty=h.type;
  c.lineJoin='round'; c.lineCap='round';
  const out=()=>{ c.strokeStyle='rgba(40,20,80,.55)'; c.lineWidth=3.5; c.stroke(); };
  if(ty==='rock'||ty==='potato'){ c.rotate(t*h.spin+h.ph); const col=(P||PLANETS[0]).hc; const g=c.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r*1.1); g.addColorStop(0,col[0]); g.addColorStop(1,col[1]); c.fillStyle=g; c.beginPath(); for(let i=0;i<10;i++){ const a=i/10*TAU, rad=r*(0.86+0.14*Math.sin(i*2.7+h.ph*3)); c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad); } c.closePath(); c.fill(); out(); c.fillStyle='rgba(0,0,0,.2)'; c.beginPath(); c.arc(r*.25,r*.2,r*.17,0,TAU); c.arc(-r*.3,r*.3,r*.1,0,TAU); c.arc(-r*.1,-r*.35,r*.12,0,TAU); c.fill();
    c.rotate(-(t*h.spin+h.ph)); c.fillStyle='#fff'; for(const sx of [-1,1]){ c.beginPath(); c.arc(sx*r*.28,-r*.05,r*.15,0,TAU); c.fill(); } c.fillStyle='#2b1d4d'; for(const sx of [-1,1]){ c.beginPath(); c.arc(sx*r*.28+Math.sin(t*3)*2,-r*.03,r*.07,0,TAU); c.fill(); } c.strokeStyle='#2b1d4d'; c.lineWidth=3; c.beginPath(); c.moveTo(-r*.4,-r*.28); c.lineTo(-r*.12,-r*.2); c.moveTo(r*.4,-r*.28); c.lineTo(r*.12,-r*.2); c.stroke(); c.beginPath(); c.arc(0,r*.38,r*.18,Math.PI*1.1,Math.PI*1.9); c.stroke(); }
  else if(ty==='pan'){ c.rotate(Math.sin(t*2+h.ph)*.4); const col=(P||PLANETS[1]).hc; c.fillStyle=col[1]; rr(c,r*.6,-r*.12,r*1.1,r*.24,r*.12); c.fill(); out(); const g=c.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r); g.addColorStop(0,col[0]); g.addColorStop(1,col[1]); c.fillStyle=g; c.beginPath(); c.arc(0,0,r*.85,0,TAU); c.fill(); out(); c.fillStyle='#fffaf0'; c.beginPath(); c.arc(0,0,r*.58,0,TAU); c.fill(); c.fillStyle='#ffc21a'; c.beginPath(); c.arc(0,0,r*.25,0,TAU); c.fill(); c.fillStyle='#2b1d4d'; c.beginPath(); c.arc(-r*.1,-r*.04,r*.04,0,TAU); c.arc(r*.1,-r*.04,r*.04,0,TAU); c.fill(); }
  else if(ty==='whisk'){ c.rotate(t*h.spin+h.ph); const col=(P||PLANETS[3]).hc; c.strokeStyle=col[1]; c.lineWidth=r*.12; for(let i=0;i<5;i++){ c.beginPath(); c.ellipse(0,-r*.1,r*(.18+i*.15),r*.8,0,0,TAU); c.stroke(); } c.strokeStyle=col[0]; c.lineWidth=r*.06; for(let i=0;i<5;i++){ c.beginPath(); c.ellipse(0,-r*.1,r*(.18+i*.15),r*.8,0,0,TAU); c.stroke(); } c.fillStyle='#ff6b5e'; rr(c,-r*.14,r*.62,r*.28,r*.55,r*.12); c.fill(); out(); }
  else if(ty==='ufo'){ c.rotate(Math.sin(t*3+h.ph)*.1); const col=(P||PLANETS[4]).hc; c.fillStyle='rgba(155,232,255,.8)'; c.beginPath(); c.arc(0,-r*.1,r*.5,Math.PI,0); c.fill(); out(); c.fillStyle='#b9ffcf'; c.beginPath(); c.arc(0,-r*.35,r*.17,0,TAU); c.fill(); c.fillStyle='#2b1d4d'; c.beginPath(); c.arc(-r*.06,-r*.37,r*.035,0,TAU); c.arc(r*.06,-r*.37,r*.035,0,TAU); c.fill(); const g=c.createLinearGradient(0,-r*.2,0,r*.4); g.addColorStop(0,'#e9eef8'); g.addColorStop(1,'#8b92ab'); c.fillStyle=g; c.beginPath(); c.ellipse(0,r*.1,r,r*.34,0,0,TAU); c.fill(); out(); for(let i=-2;i<=2;i++){ c.fillStyle=(Math.floor(t*6)+i)%2?'#ffd23f':'#ff5fa8'; c.beginPath(); c.arc(i*r*.3,r*.13+Math.abs(i)*r*.02,r*.07,0,TAU); c.fill(); } }
  else if(ty==='sat'){ c.rotate(t*h.spin*.5+h.ph); c.fillStyle='#3aa0ff'; c.strokeStyle='#fff'; c.lineWidth=2; for(const sx of [-1,1]){ rr(c,sx>0?r*.4:-r*1.25,-r*.3,r*.85,r*.6,r*.1); c.fill(); out(); c.strokeStyle='rgba(255,255,255,.6)'; c.lineWidth=2; c.beginPath(); c.moveTo(sx*r*.8,-r*.3); c.lineTo(sx*r*.8,r*.3); c.moveTo(sx*r*1.05,-r*.3); c.lineTo(sx*r*1.05,r*.3); c.stroke(); } c.fillStyle='#f4f6fb'; rr(c,-r*.4,-r*.4,r*.8,r*.8,r*.2); c.fill(); out(); c.fillStyle='#ff5fa8'; c.beginPath(); c.arc(0,0,r*.2,0,TAU); c.fill(); }
  else if(ty==='pigeon'){ const f=Math.sin(t*14+h.ph); c.scale(h.vx<0?1:-1,1); c.fillStyle='#b7b3d6'; c.beginPath(); c.ellipse(0,0,r*.75,r*.5,0,0,TAU); c.fill(); out(); c.save(); c.translate(-r*.1,-r*.2); c.rotate(-.4-f*.6); c.fillStyle='#9a96c4'; c.beginPath(); c.ellipse(0,-r*.3,r*.3,r*.6,0,0,TAU); c.fill(); out(); c.restore(); c.fillStyle='#b7b3d6'; c.beginPath(); c.arc(-r*.7,-r*.18,r*.34,0,TAU); c.fill(); out(); c.fillStyle='#ffa530'; c.beginPath(); c.moveTo(-r*1.0,-r*.2); c.lineTo(-r*1.3,-r*.1); c.lineTo(-r*1.0,-r*.05); c.fill(); c.fillStyle='#ff3b3b'; c.beginPath(); c.arc(-r*.75,-r*.25,r*.08,0,TAU); c.fill(); c.strokeStyle='#2b1d4d'; c.lineWidth=3; c.beginPath(); c.moveTo(-r*.95,-r*.4); c.lineTo(-r*.6,-r*.32); c.stroke(); }
  else if(ty==='storm'){ const g=c.createLinearGradient(0,-r,0,r*.6); g.addColorStop(0,'#8d86b8'); g.addColorStop(1,'#4e4783'); c.fillStyle=g; c.beginPath(); c.arc(-r*.5,0,r*.5,0,TAU); c.arc(0,-r*.3,r*.62,0,TAU); c.arc(r*.5,0,r*.5,0,TAU); c.arc(0,r*.1,r*.5,0,TAU); c.fill(); if(Math.floor(t*5+h.ph)%2){ c.fillStyle='#fff36b'; c.strokeStyle='#e0a800'; c.lineWidth=3; c.beginPath(); c.moveTo(r*.15,r*.2); c.lineTo(-r*.25,r*.85); c.lineTo(0,r*.8); c.lineTo(-r*.2,r*1.4); c.lineTo(r*.35,r*.65); c.lineTo(r*.1,r*.7); c.closePath(); c.fill(); c.stroke(); } c.fillStyle='#fff'; for(const sx of [-1,1]){ c.beginPath(); c.arc(sx*r*.22,-r*.2,r*.13,0,TAU); c.fill(); } c.fillStyle='#2b1d4d'; for(const sx of [-1,1]){ c.beginPath(); c.arc(sx*r*.22,-r*.18,r*.06,0,TAU); c.fill(); } c.strokeStyle='#2b1d4d'; c.lineWidth=3; c.beginPath(); c.arc(0,0,r*.12,Math.PI*1.15,Math.PI*1.85,true); c.stroke(); }
  c.restore();
}

// ---------- FONDO ----------
function skyColors(t,P){
  // t = progreso 0..1 hacia el planeta
  const stops=[
    [0,   [92,200,255],[205,243,255]],
    [.22, [60,160,245],[170,225,255]],
    [.45, hex(P.dusk[0]),hex(P.dusk[1])],
    [.7,  mixArr(hex(P.dusk[0]),hex(P.space[0]),.6), mixArr(hex(P.dusk[1]),hex(P.space[1]),.5)],
    [1,   hex(P.space[0]),hex(P.space[1])]
  ];
  t=Math.max(0,Math.min(1,t));
  for(let i=0;i<stops.length-1;i++){ const a=stops[i],b=stops[i+1]; if(t<=b[0]){ const k=(t-a[0])/(b[0]-a[0]); return [mixArr(a[1],b[1],k),mixArr(a[2],b[2],k)]; } }
  const l=stops[stops.length-1]; return [l[1],l[2]];
}
function drawGround(c,W,H,groundY,t){
  // groundY: y en pantalla de la línea del suelo
  if(groundY>H+260) return;
  c.save();
  // colinas lejanas
  c.fillStyle='#7be08a'; c.beginPath(); c.moveTo(0,groundY+40); for(let x=0;x<=W;x+=20){ c.lineTo(x,groundY-34+Math.sin(x*.016+1)*26); } c.lineTo(W,groundY+300); c.lineTo(0,groundY+300); c.fill();
  c.fillStyle='#55cf72'; c.beginPath(); c.moveTo(0,groundY+40); for(let x=0;x<=W;x+=20){ c.lineTo(x,groundY-8+Math.sin(x*.02+3)*18); } c.lineTo(W,groundY+300); c.lineTo(0,groundY+300); c.fill();
  // granero
  const bx=70, by=groundY-6; c.fillStyle='#ff6b5e'; rr(c,bx-50,by-78,100,78,8); c.fill(); c.strokeStyle='rgba(58,42,107,.35)'; c.lineWidth=3; c.stroke();
  c.fillStyle='#c9423a'; c.beginPath(); c.moveTo(bx-58,by-70); c.lineTo(bx,by-122); c.lineTo(bx+58,by-70); c.closePath(); c.fill(); c.stroke();
  c.fillStyle='#fff'; rr(c,bx-20,by-44,40,44,6); c.fill(); c.strokeStyle='#fff'; c.lineWidth=4; c.beginPath(); c.moveTo(bx-20,by-44); c.lineTo(bx+20,by); c.moveTo(bx+20,by-44); c.lineTo(bx-20,by); c.stroke();
  // molino
  const mx=W-70; c.fillStyle='#fff6e6'; c.beginPath(); c.moveTo(mx-16,by); c.lineTo(mx-9,by-100); c.lineTo(mx+9,by-100); c.lineTo(mx+16,by); c.fill(); c.strokeStyle='rgba(58,42,107,.35)'; c.lineWidth=3; c.stroke();
  c.save(); c.translate(mx,by-100); c.rotate(t*1.4); c.fillStyle='#ffd23f'; for(let i=0;i<4;i++){ c.rotate(Math.PI/2); rr(c,-6,-4,12,-56,4); c.fill(); } c.restore(); c.fillStyle='#ff5fa8'; c.beginPath(); c.arc(mx,by-100,7,0,TAU); c.fill();
  // valla
  c.strokeStyle='#fff'; c.lineWidth=5; for(let x=130;x<W-130;x+=26){ c.beginPath(); c.moveTo(x,groundY+4); c.lineTo(x,groundY-20); c.stroke(); } c.beginPath(); c.moveTo(125,groundY-14); c.lineTo(W-125,groundY-14); c.moveTo(125,groundY-4); c.lineTo(W-125,groundY-4); c.stroke();
  // césped delantero
  c.fillStyle='#3fbf5f'; c.fillRect(0,groundY+30,W,2000);
  c.fillStyle='#35ad54'; for(let x=10;x<W;x+=44){ c.beginPath(); c.arc(x,groundY+34,10,Math.PI,0); c.fill(); }
  // plataforma de lanzamiento
  const px=W/2; c.fillStyle='#b9bfd6'; rr(c,px-76,groundY+16,152,22,10); c.fill(); c.strokeStyle='rgba(58,42,107,.4)'; c.lineWidth=3; c.stroke(); c.fillStyle='#ffd23f'; for(let i=-3;i<=3;i+=2){ c.fillRect(px+i*20-8,groundY+22,16,10); }
  // fardos
  c.fillStyle='#ffe17a'; for(const [hx,hy] of [[W*.2,groundY+60],[W*.82,groundY+70]]){ rr(c,hx-22,hy-16,44,32,10); c.fill(); c.strokeStyle='rgba(180,130,20,.6)'; c.lineWidth=2.5; c.stroke(); c.beginPath(); c.moveTo(hx-8,hy-16); c.lineTo(hx-8,hy+16); c.moveTo(hx+8,hy-16); c.lineTo(hx+8,hy+16); c.stroke(); }
  c.restore();
}
function drawCloud(c,x,y,s,a){ c.save(); c.globalAlpha=a; c.fillStyle='#fff'; c.beginPath(); c.arc(x,y,24*s,0,TAU); c.arc(x+28*s,y-12*s,30*s,0,TAU); c.arc(x+62*s,y,26*s,0,TAU); c.arc(x+30*s,y+8*s,28*s,0,TAU); c.fill(); c.fillStyle='rgba(120,160,230,.2)'; c.beginPath(); c.ellipse(x+30*s,y+22*s,50*s,9*s,0,0,TAU); c.fill(); c.restore(); }
