/* Original, locally synthesized score. No recordings, downloads or tracking. */
(function(root){
  'use strict';
  if(root.GhostMusic)return;
  const KEY='flappyGhostMusic.v1',BEAT=60/76,LOOK_AHEAD=.25,TICK_MS=100;
  // Four original eight-beat phrases. The second pass varies the melody's
  // voicing and rhythm; all notes are scheduled against the audio clock.
  const PHRASES=Object.freeze([
    {chord:[50,57,61,66],melody:[66,69,73,71,69,66,64,null]},
    {chord:[47,54,57,62],melody:[66,69,74,73,69,66,62,null]},
    {chord:[43,50,54,59],melody:[67,71,74,78,76,74,71,null]},
    {chord:[45,52,57,59],melody:[69,73,76,74,73,71,69,null]}
  ].map(phrase=>Object.freeze({chord:Object.freeze(phrase.chord),melody:Object.freeze(phrase.melody)})));
  const frequency=midi=>440*Math.pow(2,(midi-69)/12);
  function createMusicEngine(host){
    let game=null,context=null,master=null,ownContext=false,enabled=true,unlocked=false;
    let running=false,starting=false,unavailable=false,timer=null,generation=0,beat=0,nextTime=0;
    const blocks=new Set(),voices=new Set(),listeners=[];
    try{enabled=host.localStorage?.getItem(KEY)!=='off';}catch{}
    if(host.document?.hidden)blocks.add('hidden');
    const mode=()=>game?.mode||'ready';
    const eligible=()=>enabled&&unlocked&&!blocks.size&&game?.assetsReady!==false&&(mode()==='ready'||mode()==='play');
    function changed(){host.dispatchEvent?.(new host.Event('ghost-music-changed'));}
    function graph(){
      if(master)return true;
      try{
        context=game?.audio;
        if(game&&!context)return false;
        if(!context){const Audio=host.AudioContext||host.webkitAudioContext;if(!Audio)return false;context=new Audio();ownContext=true;}
        master=context.createGain();master.gain.value=0;master.connect(context.destination);return true;
      }catch{master=null;context=null;return false;}
    }
    function release(voice){
      voices.delete(voice);try{voice.osc.disconnect();voice.gain.disconnect();}catch{}
    }
    function note(midi,time,duration,volume,pad=false){
      if(midi===null)return;
      const osc=context.createOscillator(),gain=context.createGain();
      const voice={osc,gain};voices.add(voice);
      osc.type=pad?'sine':'triangle';osc.frequency.setValueAtTime(frequency(midi),time);
      gain.gain.setValueAtTime(0,time);
      gain.gain.linearRampToValueAtTime(volume,time+(pad ? .32 : .055));
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.22),time+duration*.72);
      gain.gain.linearRampToValueAtTime(0,time+duration);
      osc.connect(gain);gain.connect(master);osc.onended=()=>release(voice);
      osc.start(time);osc.stop(time+duration+.02);
    }
    function scheduleBeat(index,time){
      const phraseNumber=Math.floor(index/8),phrase=PHRASES[phraseNumber%PHRASES.length],position=index%8;
      const variation=Math.floor(phraseNumber/PHRASES.length)%2;
      // Only two soft chords per phrase; no per-frame synthesis or polling.
      if(position===0||position===4)for(const midi of phrase.chord)note(midi,time,BEAT*3.85,.037,true);
      const pitch=phrase.melody[position];
      if(pitch!==null){
        const melodyPitch=variation&&position===2?pitch-12:pitch;
        note(melodyPitch,time+(variation&&position%2?BEAT*.18:0),BEAT*(position===6?1.45:.92),.105);
      }
    }
    function tick(){
      if(!running)return;
      if(!eligible()||context.state==='closed'){stop(true);return;}
      const now=context.currentTime;
      // Never replay a burst of missed notes after a stalled tab or device.
      if(nextTime<now-.1)nextTime=now+.035;
      while(nextTime<now+LOOK_AHEAD){scheduleBeat(beat++,nextTime);nextTime+=BEAT;}
    }
    function stop(hard=false){
      generation++;starting=false;running=false;
      if(timer!==null){host.clearInterval(timer);timer=null;}
      if(context&&master){
        const now=context.currentTime;
        try{master.gain.cancelScheduledValues(now);if(hard)master.gain.setValueAtTime(0,now);else master.gain.setTargetAtTime(0,now,.012);}catch{}
        for(const voice of voices){try{voice.osc.stop(now+(hard?0:.05));}catch{}release(voice);}
        // Never suspend a shared game context: muting music leaves game effects
        // intact. Its native WebView lifecycle owns platform audio focus.
        if(ownContext&&context.state==='running')context.suspend?.().catch?.(()=>{});
      }
    }
    function sync(){
      if(!eligible()){if(running||starting||timer!==null)stop(blocks.size>0);changed();return;}
      if(running||starting)return;
      if(!graph()){unavailable=true;changed();return;}
      unavailable=false;starting=true;const request=++generation;
      let resumed;try{resumed=context.state==='running'?Promise.resolve():context.resume();}catch{starting=false;unavailable=true;changed();return;}
      Promise.resolve(resumed).then(()=>{
        if(request!==generation||!eligible()||context.state!=='running')return;
        starting=false;running=true;nextTime=context.currentTime+.045;
        master.gain.cancelScheduledValues(context.currentTime);master.gain.setValueAtTime(0,context.currentTime);master.gain.linearRampToValueAtTime(.16,context.currentTime+.35);
        tick();timer=host.setInterval(tick,TICK_MS);changed();
      }).catch(()=>{if(request===generation){starting=false;unavailable=true;changed();}});
    }
    function block(reason,value){
      const had=blocks.has(reason);if(value)blocks.add(reason);else blocks.delete(reason);
      if(had!==value)sync();
    }
    function gesture(event){
      // Scripted clicks, timers and ad callbacks never unlock initial playback.
      if(event?.isTrusted!==true||event.repeat||event.isPrimary===false||event.metaKey||event.ctrlKey||event.altKey)return;
      unlocked=true;sync();
    }
    function listen(target,name,handler,options){target?.addEventListener?.(name,handler,options);listeners.push(()=>target?.removeEventListener?.(name,handler,options));}
    listen(host,'pointerdown',gesture,{capture:true,passive:true});listen(host,'keydown',gesture,{capture:true});
    listen(host.document,'visibilitychange',()=>block('hidden',!!host.document.hidden));
    listen(host,'blur',()=>block('browser-focus',true));listen(host,'focus',()=>block('browser-focus',false));
    listen(host,'ghost-native-pause',()=>block('native-pause',true));listen(host,'ghost-native-resume',()=>block('native-pause',false));
    listen(host,'ghost-native-focus',event=>block('native-focus',event.detail?.focused!==true));
    listen(host,'ghost-ad-start',()=>block('ad',true));listen(host,'ghost-ad-end',()=>block('ad',false));
    listen(host,'pagehide',()=>stop(true));
    const api={KEY,
      attach(value){if(game===value)return;stop(true);if(master){try{master.disconnect();}catch{}}if(ownContext)context?.close?.().catch?.(()=>{});context=null;master=null;ownContext=false;game=value;sync();},
      setMode(){sync();},block,
      setEnabled(value,event){gesture(event);enabled=value===true;try{host.localStorage?.setItem(KEY,enabled?'on':'off');}catch{}sync();return enabled;},
      toggle(event){return api.setEnabled(!enabled,event);},
      enabled:()=>enabled,
      status:()=>({enabled,unlocked,running,starting,state:unavailable?'unavailable':!enabled?'muted':!unlocked?'waiting':!eligible()?'suspended':running?'playing':'starting',mode:mode(),blocks:[...blocks],timerActive:timer!==null,voices:voices.size,phrase:Math.floor(beat/8)%PHRASES.length,beat,audioState:context?.state||'not-created',sharedContext:!!context&&context===game?.audio}),
      dispose(){stop(true);for(const remove of listeners)remove();listeners.length=0;if(master){try{master.disconnect();}catch{}}if(ownContext)context?.close?.().catch?.(()=>{});master=null;context=null;game=null;}
    };
    return api;
  }
  root.GhostMusic=createMusicEngine(root);
  if(typeof module!=='undefined')module.exports={createMusicEngine,PHRASES,BEAT,KEY};
})(typeof window!=='undefined'?window:globalThis);
