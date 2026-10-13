(function(root){
  const GUIDE_KEY='flappyGhostTutorial.v1',VERSION=1;
  const SUPPORT_EMAIL='ericpaloppalop14@hotmail.com';
  const PLAY_URL='https://play.google.com/store/apps/details?id=com.ericsoul.flappyghost';
  const cleanScore=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(2147483647,Math.floor(Number(value)))):0;
  function shareData(score,best,language=root.FG_I18N.language()){
    const values={score:cleanScore(score),best:cleanScore(best)};values.best=Math.max(values.score,values.best);
    const locale=root.FG_I18N.normalizeLanguage(language)||'en';
    return {...values,language:locale,title:'Flappy Ghost',text:root.FG_I18N.text('shareText',values,locale),url:PLAY_URL};
  }
  async function share(data,{native=root.NativeBridge,navigator=root.navigator}={}){
    if(native?.isModern?.()){
      let result;try{result=await native.shareScore(data.score,data.best,data.language);}catch{}
      if(result?.ok&&result.status==='opened')return 'opened';
      if(result?.status==='cancelled')return 'cancelled';
    }
    if(typeof navigator?.share!=='function')return 'fallback';
    try{await navigator.share({title:data.title,text:data.text,url:data.url});return 'opened';}
    catch(error){return error?.name==='AbortError'?'cancelled':'fallback';}
  }
  async function copy(text,navigator=root.navigator){try{if(typeof navigator?.clipboard?.writeText!=='function')return false;await navigator.clipboard.writeText(text);return true;}catch{return false;}}
  function feedbackMail(message,language=root.FG_I18N.language()){
    const body=String(message).trim();if(body.length<15||body.length>2000)return null;
    return 'mailto:'+SUPPORT_EMAIL+'?subject='+encodeURIComponent(root.FG_I18N.text('feedbackSubject',{},language))+'&body='+encodeURIComponent(body);
  }
  function seen(storage){try{storage??=root.localStorage;const data=JSON.parse(storage?.getItem(GUIDE_KEY));return data?.version===VERSION&&['done','skipped'].includes(data.status);}catch{return false;}}
  function mark(status,storage){if(!['done','skipped'].includes(status))return false;try{storage??=root.localStorage;if(typeof storage?.setItem!=='function')return false;storage.setItem(GUIDE_KEY,JSON.stringify({version:VERSION,status}));return true;}catch{return false;}}
  // A separate practice world. No storage, economics, achievements or native hooks.
  class Practice {
    constructor(){this.phase=0;this.taps=0;this.time=0;this.y=160;this.vy=0;this.doorX=420;this.retry=false;}
    flap(){if(this.phase===2)return;this.vy=-300;this.taps++;this.retry=false;if(this.phase===0&&this.taps>=3){this.phase=1;this.y=160;this.doorX=420;}}
    step(dt){
      if(this.phase===2||this.taps===0)return;
      dt=Math.max(0,Math.min(1/30,dt));this.time+=dt;this.vy=Math.min(500,this.vy+1100*dt);this.y+=this.vy*dt;
      if(this.phase===1)this.doorX-=125*dt;
      const hit=this.y<18||this.y>302||(this.phase===1&&this.doorX<124&&this.doorX+72>92&&(this.y<94||this.y>226));
      if(hit){this.y=160;this.vy=0;this.doorX=420;this.retry=true;}
      if(this.phase===1&&this.doorX+72<92)this.phase=2;
    }
  }
  const api={GUIDE_KEY,VERSION,SUPPORT_EMAIL,PLAY_URL,cleanScore,shareData,share,copy,feedbackMail,seen,mark,Practice};
  root.GhostExperienceModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
