// Encaje · efectos: dedo animado de ayuda y confeti de celebración
const HAND='<svg viewBox="0 0 64 64"><path d="M27 5c-3.2 0-5.5 2.3-5.5 5.5V33l-3.6-3.6c-2.2-2.2-5.6-2.2-7.6 0-2 2-2 5.1 0 7.1L27 54c2.6 2.8 6.2 4.5 10 4.500h4.5C49 58.5 55 52.5 55 44V31c0-2.800-2.2-5-5-5-.9 0-1.8.2-2.500.7-.7-1.900-2.600-3.200-4.700-3.200-1.200 0-2.300.4-3.200 1.100-.8-1.600-2.500-2.600-4.400-2.600-.7 0-1.300.1-1.900.4V10.500C32.500 7.300 30.200 5 27 5z" fill="#fff" stroke="#33404f" stroke-width="3" stroke-linejoin="round"/></svg>';
let fe=null,hand=null,cur={x:0,y:0},run=[];
const T=(x,y)=>`translate(${x}px,${y}px)`;
const reduce=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
function make(){if(fe)return;fe=document.createElement('div');fe.className='finger';fe.innerHTML='<i class="fr"></i><span class="fh">'+HAND+'</span>';document.body.appendChild(fe);hand=fe.querySelector('.fh');}
export const fingerOn=()=>!!fe;
export function fingerStop(){run.forEach(a=>{try{a.cancel();}catch(e){}});run=[];if(fe){fe.remove();fe=null;hand=null;}}
export function fingerAt(x,y){make();run.forEach(a=>{try{a.cancel();}catch(e){}});run=[];cur={x,y};fe.style.transform=T(x,y);fe.style.opacity=1;}
export function fingerGlide(x,y,ms=600){make();fe.style.opacity=1;const a=fe.animate([{transform:T(cur.x,cur.y)},{transform:T(x,y)}],{duration:ms,easing:'ease-in-out',fill:'forwards'});run.push(a);cur={x,y};
  return a.finished.then(()=>{if(fe){fe.style.transform=T(x,y);}try{a.cancel();}catch(e){}}).catch(()=>{});}
export function fingerTap(){make();const fr=fe.querySelector('.fr');fr.classList.remove('go');void fr.offsetWidth;fr.classList.add('go');hand.animate([{transform:'scale(1)'},{transform:'scale(.8)'},{transform:'scale(1)'}],{duration:340});}
export function fingerDown(on){make();fe.classList.toggle('down',!!on);}
// bucle de ayuda: si no hay destino, "toca aquí" repetido; si lo hay, arrastra de A a B
export function fingerLoop(a,b){make();fe.classList.add('loop');run.forEach(x=>{try{x.cancel();}catch(e){}});run=[];fe.style.opacity=1;
  if(!b){cur=a;fe.style.transform=T(a.x,a.y);run.push(hand.animate([{transform:'scale(1)'},{transform:'scale(.8)'},{transform:'scale(1)'}],{duration:1100,iterations:Infinity}));}
  else{cur=b;run.push(fe.animate([{transform:T(a.x,a.y),opacity:0,offset:0},{transform:T(a.x,a.y),opacity:1,offset:.12},{transform:T(a.x,a.y),opacity:1,offset:.24},{transform:T(b.x,b.y),opacity:1,offset:.72},{transform:T(b.x,b.y),opacity:1,offset:.86},{transform:T(b.x,b.y),opacity:0,offset:1}],{duration:2400,iterations:Infinity,easing:'ease-in-out'}));
    run.push(hand.animate([{transform:'scale(1)',offset:0},{transform:'scale(.82)',offset:.2},{transform:'scale(.82)',offset:.74},{transform:'scale(1)',offset:.9}],{duration:2400,iterations:Infinity}));}}

/* ───── confeti ───── */
const COL=['#e58f8f','#6fb5a8','#e8c06a','#9a92d2','#78a8d8','#93c590','#d996b8','#f4cd72'];
export function confetti(power=1,{x=.5,y=.38}={}){if(reduce())return;let box=document.getElementById('fx');if(!box){box=document.createElement('div');box.id='fx';document.body.appendChild(box);}
  const N=Math.round(18+34*power);const W=innerWidth,H=innerHeight;
  for(let i=0;i<N;i++){const e=document.createElement('i');const s=7+Math.random()*9;const shape=i%4;e.style.cssText=`left:${x*W}px;top:${y*H}px;width:${s}px;height:${shape===1?s*.5:s}px;background:${COL[i%COL.length]};border-radius:${shape===0?'50%':shape===2?'2px':'1px'};`;
    box.appendChild(e);const ang=Math.random()*Math.PI*2,v=(.35+Math.random()*.65)*Math.min(W,H)*.75;const vx=Math.cos(ang)*v,vy=Math.sin(ang)*v*.8-H*.12,rot=(Math.random()-.5)*900;
    const an=e.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${vx*.55}px,${vy*.55}px) rotate(${rot*.5}deg)`,opacity:1,offset:.42},{transform:`translate(${vx*.8}px,${vy*.8+H*.55}px) rotate(${rot}deg)`,opacity:0}],{duration:1500+Math.random()*1100,easing:'cubic-bezier(.2,.7,.4,1)'});
    an.onfinish=()=>e.remove();}}
export function sparkle(el,n=8){if(reduce()||!el)return;const r=el.getBoundingClientRect();let box=document.getElementById('fx');if(!box){box=document.createElement('div');box.id='fx';document.body.appendChild(box);}
  for(let i=0;i<n;i++){const e=document.createElement('i');e.style.cssText=`left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;width:6px;height:6px;border-radius:50%;background:#f4cd72;`;box.appendChild(e);const a=i/n*Math.PI*2,d=r.width*.7+10;const an=e.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(.2)`,opacity:0}],{duration:700,easing:'ease-out'});an.onfinish=()=>e.remove();}}
