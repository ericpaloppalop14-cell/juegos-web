// Encaje · música relajante generativa + sonidos, todo con WebAudio (sin archivos).
const mtof=m=>440*Math.pow(2,(m-69)/12);
const CH={maj9:[0,4,7,11,14],min9:[0,3,7,10,14],add9:[0,4,7,9,14],sus:[0,5,7,10,14],min7:[0,3,7,10,12],maj7:[0,4,7,11,12]};
const PROGS=[
  [[0,'maj9'],[9,'min9'],[5,'maj9'],[7,'add9']],
  [[2,'min9'],[7,'sus'],[0,'maj9'],[9,'min7']],
  [[5,'maj9'],[4,'min7'],[9,'min9'],[7,'sus']],
  [[0,'add9'],[7,'add9'],[9,'min9'],[5,'maj7']],
];
const RHY=[[0,3,6,8,11,14],[0,4,8,10,12],[0,2,6,8,12,15],[2,5,8,13],[0,6,8,14],[1,4,7,10,13]];
const PENTA=[0,2,4,7,9];

export function makeGraph(ctx,{offline=false}={}){
  const master=ctx.createGain();master.gain.value=0.9;
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=18;comp.ratio.value=3.5;comp.attack.value=0.01;comp.release.value=0.35;
  master.connect(comp);comp.connect(ctx.destination);
  const musicBus=ctx.createGain(),sfxBus=ctx.createGain();musicBus.gain.value=1;sfxBus.gain.value=1.5;musicBus.connect(master);sfxBus.connect(master);
  // reverb
  const len=Math.floor(ctx.sampleRate*3.2),ir=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);let lp=0;for(let i=0;i<len;i++){const t=i/ctx.sampleRate;const n=(Math.random()*2-1);lp+=(n-lp)*0.35;d[i]=lp*Math.pow(1-i/len,2.4)*(t<0.02?t/0.02:1);}}
  const rev=ctx.createConvolver();rev.buffer=ir;const revIn=ctx.createGain();revIn.gain.value=0.55;revIn.connect(rev);const revOut=ctx.createGain();revOut.gain.value=0.9;rev.connect(revOut);revOut.connect(master);
  // eco punteado suave
  const dl=ctx.createDelay(2);dl.delayTime.value=0.7;const fb=ctx.createGain();fb.gain.value=0.33;const dlf=ctx.createBiquadFilter();dlf.type='lowpass';dlf.frequency.value=2400;
  const echoIn=ctx.createGain();echoIn.gain.value=0.5;echoIn.connect(dl);dl.connect(dlf);dlf.connect(fb);fb.connect(dl);dlf.connect(revIn);dlf.connect(master);
  const S={ctx,musicBus,sfxBus,keyRoot:0};
  const out=(bus,g,wet=0.3,echo=0)=>{g.connect(bus);const w=ctx.createGain();w.gain.value=wet;g.connect(w);w.connect(revIn);if(echo){const e=ctx.createGain();e.gain.value=echo;g.connect(e);e.connect(echoIn);}};
  function pluck(bus,t,f,vel=.6,dur=1.2,{wet=.35,echo=0,bright=1}={}){
    const g=ctx.createGain();const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=Math.min(7000,f*5*bright+800);lp.connect(g);
    const o1=ctx.createOscillator();o1.type='sine';o1.frequency.value=f;
    const o2=ctx.createOscillator();o2.type='sine';o2.frequency.value=f*2.002;const g2=ctx.createGain();g2.gain.value=.22;
    const o3=ctx.createOscillator();o3.type='triangle';o3.frequency.value=f*0.999;const g3=ctx.createGain();g3.gain.value=.3;
    // FM suave tipo piano eléctrico
    const m=ctx.createOscillator();m.type='sine';m.frequency.value=f;const mg=ctx.createGain();mg.gain.setValueAtTime(f*0.9*vel,t);mg.gain.exponentialRampToValueAtTime(f*0.05,t+0.5);m.connect(mg);mg.connect(o1.frequency);
    o1.connect(lp);o2.connect(g2);g2.connect(lp);o3.connect(g3);g3.connect(lp);
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vel*.32,t+.012);g.gain.exponentialRampToValueAtTime(vel*.12,t+.25);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    out(bus,g,wet,echo);
    for(const o of [o1,o2,o3,m]){o.start(t);o.stop(t+dur+.05);}}
  function pad(bus,t,notes,dur,vol=.05){
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(500,t);lp.frequency.linearRampToValueAtTime(1100,t+dur*.5);lp.frequency.linearRampToValueAtTime(600,t+dur);lp.Q.value=.4;
    const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+Math.min(2.2,dur*.4));g.gain.setValueAtTime(vol,t+dur-.6);g.gain.linearRampToValueAtTime(0.0001,t+dur+2.2);lp.connect(g);
    for(const n of notes)for(const det of[-6,6]){const o=ctx.createOscillator();o.type=det<0?'triangle':'sawtooth';o.frequency.value=mtof(n);o.detune.value=det;const og=ctx.createGain();og.gain.value=o.type==='sawtooth'?.35:1;o.connect(og);og.connect(lp);o.start(t);o.stop(t+dur+2.4);}
    out(bus,g,.5,0);}
  function bass(bus,t,n,dur,vol=.2){const o=ctx.createOscillator();o.type='sine';o.frequency.value=mtof(n);const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+.06);g.gain.exponentialRampToValueAtTime(vol*.5,t+dur*.6);g.gain.exponentialRampToValueAtTime(0.0001,t+dur+.4);o.connect(g);out(bus,g,.1,0);o.start(t);o.stop(t+dur+.5);}
  S.pluck=pluck;S.pad=pad;S.bass=bass;

  /* ── Compositor generativo ── */
  const M={step:0,t:0,prog:0,chordIx:0,loop:0,key:0,melIx:6,started:false,rhy:RHY[0],lastNotes:[]};
  S.M=M;
  function chordInfo(){const P=PROGS[M.prog%PROGS.length][M.chordIx];const root=48+((M.key+P[0])%12);return{root,ch:CH[P[1]]};}
  S.scheduleMusic=function(upTo){
    const eighth=60/62/2; // 62 bpm
    if(!M.started){M.started=true;M.t=ctx.currentTime+.15;M.prog=Math.floor(Math.random()*PROGS.length);}
    while(M.t<upTo){
      const s=M.step%16;const{root,ch}=chordInfo();S.keyRoot=M.key;
      if(s===0){
        const dur=eighth*16;
        // voicing abierto: raíz, quinta, novena... en registro medio
        const notes=[root+12+ch[0],root+12+ch[1],root+12+ch[2],root+12+ch[3]].map(n=>n);
        pad(musicBus,M.t,notes,dur,.05);
        bass(musicBus,M.t,root-12,dur*.9,.22);
        bass(musicBus,M.t+eighth*8,root-12+ (M.chordIx%2?7:0),dur*.45,.14);
        M.rhy=RHY[Math.floor(Math.random()*RHY.length)];
        if(Math.random()<.5)pluck(musicBus,M.t+eighth*.5,mtof(root+36+ch[2]),.22,3.2,{wet:.55,echo:.5,bright:1.4});
      }
      // arpegio suave
      if(s%2===0&&((s/2)%8!==7)&&Math.random()<.75){const arp=[ch[0],ch[2],ch[1],ch[3],ch[4],ch[3],ch[1],ch[2]];const k=(s/2)%8;
        pluck(musicBus,M.t,mtof(root+12+arp[k]+(k>4?12:0)),.17+Math.random()*.06,1.6,{wet:.5,echo:.15,bright:.8});}
      // melodía
      if(M.rhy.includes(s)){const pool=[];for(const o of[24,36,48])for(const c of ch.slice(0,5))pool.push(root+o+c);
        // añadir notas de la pentatónica para fluidez
        pool.sort((a,b)=>a-b);const uniq=[...new Set(pool)].filter(n=>n>=66&&n<=88);
        const steps=[-2,-1,-1,0,1,1,2,3,-3];M.melIx=Math.max(0,Math.min(uniq.length-1,M.melIx+steps[Math.floor(Math.random()*steps.length)]));
        if(M.melIx>=uniq.length)M.melIx=uniq.length-1;
        const n=uniq[M.melIx];const vel=.5+Math.random()*.35;
        pluck(musicBus,M.t,mtof(n),vel,2.6+Math.random()*1.2,{wet:.55,echo:.35,bright:1.1});
        if(Math.random()<.15)pluck(musicBus,M.t+eighth*1.5,mtof(n+12),.25,2.2,{wet:.6,echo:.5,bright:1.4});}
      M.t+=eighth;M.step++;
      if(M.step%16===0){M.chordIx++;if(M.chordIx>=4){M.chordIx=0;M.loop++;if(M.loop%2===0){M.prog=(M.prog+1+Math.floor(Math.random()*3))%PROGS.length;}
          if(M.loop%3===0)M.key=(M.key+[7,5,2,7,5][Math.floor(Math.random()*5)])%12;}}
    }};
  /* ── Efectos ── */
  const scaleMidi=(deg,oct=5)=>12*(oct+1)+((S.keyRoot||0)%12)+PENTA[((deg%5)+5)%5]+12*Math.floor(deg/5);
  S.sfx={
    click(){const t=ctx.currentTime;pluck(sfxBus,t,mtof(scaleMidi(3,5)),.45,.45,{wet:.4,bright:1.4});},
    back(){const t=ctx.currentTime;pluck(sfxBus,t,mtof(scaleMidi(2,5)),.4,.4,{wet:.4});pluck(sfxBus,t+.08,mtof(scaleMidi(0,5)),.35,.5,{wet:.4});},
    tick(){const t=ctx.currentTime;pluck(sfxBus,t,mtof(scaleMidi(1,6)),.35,.28,{wet:.3,bright:1.6});},
    ok(i=0){const t=ctx.currentTime;pluck(sfxBus,t,mtof(scaleMidi(i%10,5)),.6,1,{wet:.5,echo:.2,bright:1.3});},
    hit(i=0){const t=ctx.currentTime;pluck(sfxBus,t,mtof(scaleMidi(2+i,6)),.5,1.4,{wet:.6,echo:.3,bright:1.6});},
    drop(){const t=ctx.currentTime;pluck(sfxBus,t,mtof(scaleMidi(5,5)),.5,.9,{wet:.5,bright:1.2});pluck(sfxBus,t+.09,mtof(scaleMidi(7,5)),.5,1.2,{wet:.55,echo:.25,bright:1.4});},
    thud(){const t=ctx.currentTime;const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(70,t+.14);const g=ctx.createGain();g.gain.setValueAtTime(.3,t);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(g);out(sfxBus,g,.15);o.start(t);o.stop(t+.25);},
    whoosh(){const t=ctx.currentTime;const n=ctx.createBufferSource();const b=ctx.createBuffer(1,ctx.sampleRate*.3,ctx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;n.buffer=b;const f=ctx.createBiquadFilter();f.type='bandpass';f.Q.value=.8;f.frequency.setValueAtTime(500,t);f.frequency.exponentialRampToValueAtTime(1600,t+.22);const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.09,t+.06);g.gain.exponentialRampToValueAtTime(.0001,t+.28);n.connect(f);f.connect(g);out(sfxBus,g,.3);n.start(t);n.stop(t+.32);},
    error(){const t=ctx.currentTime;const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(170,t+.22);const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.14,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(g);out(sfxBus,g,.25);o.start(t);o.stop(t+.35);},
    star(i){const t=ctx.currentTime;[0,4,7].forEach((d,k)=>pluck(sfxBus,t+k*.035,mtof(scaleMidi(5+i*2+k,5)),.5,2,{wet:.6,echo:.3,bright:1.5}));},
    win(stars=3){const t=ctx.currentTime;const seq=[0,2,4,5,7,9,10];seq.slice(0,4+stars).forEach((d,k)=>pluck(sfxBus,t+k*.11,mtof(scaleMidi(d,5)),.42,2.4,{wet:.65,echo:.35,bright:1.3}));
      pad(sfxBus,t,[scaleMidi(0,4),scaleMidi(2,4),scaleMidi(4,4)],1.6,.05);}
  };
  return S;}

export function createAudio(){
  let G=null,timer=null,musicOn=true,sfxOn=true;const A={ready:false};
  A.setMusic=on=>{musicOn=on;if(G)G.musicBus.gain.setTargetAtTime(on?.55:0,G.ctx.currentTime,.4);};
  A.setSfx=on=>{sfxOn=on;if(G)G.sfxBus.gain.setTargetAtTime(on?1.5:0,G.ctx.currentTime,.05);};
  A.start=()=>{
    try{
      if(!G){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=new AC({latencyHint:'playback'});G=makeGraph(ctx);A.G=G;A.setMusic(musicOn);A.setSfx(sfxOn);
        G.musicBus.gain.value=0;G.musicBus.gain.setTargetAtTime(musicOn?.55:0,ctx.currentTime+.1,1.6);
        const run=()=>{if(G.ctx.state==='running')G.scheduleMusic(G.ctx.currentTime+2.5);};timer=setInterval(run,400);
        document.addEventListener('visibilitychange',()=>{if(document.hidden)G.ctx.suspend();else G.ctx.resume();});}
      if(G.ctx.state!=='running')G.ctx.resume();A.ready=true;
    }catch(e){console.warn('audio',e);}};
  const wrap=n=>(...a)=>{if(!G||!sfxOn||G.ctx.state!=='running')return;try{G.sfx[n](...a);}catch(e){}};
  for(const n of['click','back','tick','ok','hit','drop','thud','whoosh','error','star','win'])A[n]=wrap(n);
  return A;}
