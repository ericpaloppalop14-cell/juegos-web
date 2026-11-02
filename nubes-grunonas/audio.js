/* Sonidos sintetizados (WebAudio). Nada de archivos externos. */
const NGSnd=(function(){
'use strict';
let ctx=null,master=null,sfx=null,mus=null,noiseBuf=null,sfxOn=true,musOn=true,musTimer=null,step=0;
const PENT=[0,2,4,7,9];
function ensure(){
  if(!ctx){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    ctx=new AC();master=ctx.createGain();master.gain.value=.9;
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;
    sfx=ctx.createGain();sfx.gain.value=.8;mus=ctx.createGain();mus.gain.value=.5;
    sfx.connect(master);mus.connect(master);master.connect(comp);comp.connect(ctx.destination);
    const n=ctx.sampleRate*1.2;noiseBuf=ctx.createBuffer(1,n,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  }
  if(ctx.state==='suspended')ctx.resume();return true;
}
function tone(f,dur,o){
  if(!sfxOn||!ensure())return;o=o||{};
  const t=ctx.currentTime+(o.delay||0);
  const os=ctx.createOscillator(),g=ctx.createGain();
  os.type=o.type||'sine';os.frequency.setValueAtTime(o.from||f,t);
  if(o.from)os.frequency.exponentialRampToValueAtTime(f,t+(o.slide||dur*.4));
  const v=(o.vol==null?.3:o.vol);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+(o.att||.006));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  let out=g;os.connect(g);
  if(o.lp){const fl=ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=o.lp;g.connect(fl);out=fl;}
  out.connect(o.bus||sfx);os.start(t);os.stop(t+dur+.05);
}
function noise(dur,o){
  if(!sfxOn||!ensure())return;o=o||{};
  const t=ctx.currentTime+(o.delay||0);
  const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;
  const fl=ctx.createBiquadFilter();fl.type=o.type||'bandpass';fl.Q.value=o.q||1;
  fl.frequency.setValueAtTime(o.f0||800,t);if(o.f1)fl.frequency.exponentialRampToValueAtTime(o.f1,t+dur);
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.vol||.2,t+(o.att||.02));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(fl);fl.connect(g);g.connect(sfx);s.start(t);s.stop(t+dur+.05);
}
const hz=(base,semi)=>base*Math.pow(2,semi/12);
function scaleNote(base,k){const o=Math.floor(k/5);return hz(base,PENT[k%5]+12*o);}
const api={
  unlock(){ensure();},
  setSfx(v){sfxOn=v;},
  setMusic(v){musOn=v;if(v)startMusic();else stopMusic();},
  click(){tone(660,.07,{type:'triangle',vol:.18,from:500});},
  tap(){tone(420,.09,{type:'sine',from:300,vol:.25});},
  whoosh(){noise(.4,{f0:350,f1:2200,q:.9,vol:.22,att:.08});tone(300,.35,{type:'sine',from:700,vol:.05,slide:.3});},
  land(){tone(70,.2,{type:'sine',from:150,vol:.4,slide:.12});noise(.14,{type:'lowpass',f0:900,f1:200,vol:.15});},
  pop(k){const f=scaleNote(520,Math.min(k,12));tone(f,.16,{type:'sine',from:f*.62,vol:.34,slide:.035});tone(f*2,.06,{type:'triangle',vol:.07,delay:.01});noise(.03,{type:'highpass',f0:3000,vol:.06,att:.002});},
  ding(){tone(988,.6,{type:'sine',vol:.2});tone(1480,.5,{type:'sine',vol:.1,delay:.05});tone(1976,.4,{type:'sine',vol:.05,delay:.1});},
  coin(){tone(1568,.1,{type:'square',vol:.07});tone(2093,.25,{type:'square',vol:.07,delay:.07});},
  bonk(){tone(120,.2,{type:'triangle',from:230,vol:.4,slide:.08});noise(.12,{type:'lowpass',f0:600,f1:150,vol:.15});},
  lock(){noise(.04,{type:'highpass',f0:2500,vol:.2,att:.002});tone(180,.08,{type:'square',vol:.1});tone(150,.08,{type:'square',vol:.1,delay:.09});},
  unlock_(){tone(900,.08,{type:'triangle',vol:.15});tone(1300,.2,{type:'triangle',vol:.15,delay:.08});},
  zap(){noise(.35,{f0:3500,f1:300,q:2,vol:.25,att:.003});tone(80,.5,{type:'sawtooth',from:200,vol:.12,lp:400,slide:.3});},
  reveal(){noise(.3,{type:'highpass',f0:1500,f1:5000,vol:.1,att:.05});tone(700,.2,{type:'sine',from:400,vol:.15});},
  combo(n){for(let i=0;i<Math.min(n,6);i++)tone(scaleNote(660,i*2),.18,{type:'triangle',vol:.16,delay:i*.07});},
  confetti(){for(let i=0;i<8;i++)tone(1800+Math.random()*2200,.08,{type:'sine',vol:.04,delay:i*.04+Math.random()*.03});noise(.25,{type:'highpass',f0:4000,vol:.1,att:.01});},
  win(){[0,2,4,7,9,12].forEach((s,i)=>tone(hz(523,s),.4,{type:'triangle',vol:.22,delay:i*.1}));this.confetti();},
  fail(){[[392,0],[349,.25],[330,.5],[262,.78]].forEach(([f,d])=>tone(f,.5,{type:'sawtooth',vol:.13,delay:d,lp:900,from:f*1.04}));},
  buy(){tone(784,.1,{type:'triangle',vol:.2});tone(1175,.25,{type:'triangle',vol:.2,delay:.1});},
  boost(){tone(500,.4,{type:'sine',from:200,vol:.2});tone(1000,.3,{type:'triangle',vol:.1,delay:.15});},
  warn(){tone(300,.12,{type:'square',vol:.07});tone(300,.12,{type:'square',vol:.07,delay:.18});}
};
function musicStep(){
  if(!musOn||!ctx||ctx.state!=='running')return;
  const prog=[0,5,7,3];const root=prog[Math.floor(step/8)%4];
  const t=ctx.currentTime;
  if(step%8===0){
    for(const s of[0,4,7]){const os=ctx.createOscillator(),g=ctx.createGain(),fl=ctx.createBiquadFilter();os.type='triangle';os.frequency.value=hz(130.8,root+s);fl.type='lowpass';fl.frequency.value=700;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.8);g.gain.exponentialRampToValueAtTime(.0001,t+3.6);os.connect(fl);fl.connect(g);g.connect(mus);os.start(t);os.stop(t+3.8);}
  }
  if(Math.random()<.62){
    const k=Math.floor(Math.random()*8),f=scaleNote(hz(261.6,root),k);
    const os=ctx.createOscillator(),g=ctx.createGain();os.type='sine';os.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.06,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.9);os.connect(g);g.connect(mus);os.start(t);os.stop(t+1);
  }
  step++;
}
function startMusic(){if(musTimer||!musOn)return;if(!ensure())return;musTimer=setInterval(musicStep,450);}
function stopMusic(){clearInterval(musTimer);musTimer=null;}
api.startMusic=startMusic;api.stopMusic=stopMusic;
return api;
})();
