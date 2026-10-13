(function(){
  const I=window.FG_I18N,M=window.GhostExperienceModel,t=(key,params)=>I.text(key,params);
  const panels=[],musicControls=new Set();let game=null,tools=null,lastMode=null,feedbackDraft='';
  const text=(node,key,params)=>{node.textContent=t(key,params);return node;};
  const element=(tag,key,parent)=>{const node=document.createElement(tag);if(key)text(node,key);parent?.append(node);return node;};
  function action(parent,key,run,secondary=false){const b=element('button',key,parent);b.type='button';if(secondary)b.className='secondary';b.onclick=run;return b;}
  function pause(){if(game?.mode==='play'){game.mode='pause';game.acc=0;game.last=performance.now();window.GhostMusic?.setMode();}}
  function updateMusic(){
    const music=window.GhostMusic;if(!music)return;
    for(const button of musicControls){
      if(!button.isConnected){musicControls.delete(button);continue;}
      const on=music.enabled(),label=t(on?'musicMute':'musicUnmute');button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(on));button.title=label;button.dataset.musicState=music.status().state;
      button.textContent=button.classList.contains('fg-music-floating')?(on?'♫':'♫×'):t(music.status().state==='unavailable'?'musicUnavailable':on?'musicOn':'musicOff');
    }
  }
  function musicButton(parent,floating=false){
    const button=action(parent,null,event=>window.GhostMusic?.toggle(event),true);button.className=floating?'fg-music-floating':'fg-music-setting secondary';musicControls.add(button);updateMusic();return button;
  }
  function openPanel(title,onClose){
    window.GhostMusic?.block('dialog',true);pause();const previous=document.activeElement;
    const dialog=element('dialog');dialog.className='fg-dialog';
    const head=element('div',null,dialog);head.className='fg-dialog-head';
    const heading=element('h2',title,head);heading.id='fg-panel-title-'+Date.now();dialog.setAttribute('aria-labelledby',heading.id);
    const body=element('div',null,dialog);let closed=false;
    const panel={dialog,body,heading,title,close,updateLanguage:()=>{text(heading,title);text(closeButton,'close');}};
    const closeButton=action(head,'close',close);closeButton.className='fg-close';
    function close(){if(closed)return;closed=true;const index=panels.indexOf(panel);if(index>=0)panels.splice(index,1);if(!panels.length){document.documentElement.classList.remove('fg-overlay-open');window.GhostMusic?.block('dialog',false);}dialog.close();dialog.remove();onClose?.();if(previous?.isConnected)previous.focus({preventScroll:true});updateMusic();}
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(panels.at(-1)===panel)close();});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
    document.body.append(dialog);panels.push(panel);document.documentElement.classList.add('fg-overlay-open');dialog.showModal();return panel;
  }
  function languagePicker(parent){
    const label=element('label','language',parent);const select=element('select',null,label);select.setAttribute('aria-label',t('language'));
    I.populateLanguagePicker(select);
    select.value=I.language();select.onchange=()=>I.setLanguage(select.value);return select;
  }
  function help(){
    const panel=openPanel('helpTitle');const select=languagePicker(panel.body);musicButton(panel.body);const musicHint=element('p','musicHint',panel.body);musicHint.className='fg-music-hint';
    const paragraphs=['helpControls','helpGoal','helpCollection','helpProgress'].map(key=>({key,node:element('p',key,panel.body)}));
    const actions=element('div',null,panel.body);actions.className='fg-actions';
    const practice=action(actions,'practice',()=>{panel.close();tutorial();});
    const feedback=action(actions,'feedback',()=>openFeedback(),true);
    const share=action(actions,'share',()=>openShare(),true);
    const policy=element('a','privacyPolicy',panel.body);policy.href='politica-privacidad.html';policy.className='fg-action secondary';policy.onclick=event=>{event.preventDefault();openPolicy();};
    const update=panel.updateLanguage;panel.updateLanguage=()=>{update();select.value=I.language();select.setAttribute('aria-label',t('language'));select.parentElement.firstChild.textContent=t('language');text(musicHint,'musicHint');updateMusic();paragraphs.forEach(p=>text(p.node,p.key));text(practice,'practice');text(feedback,'feedback');text(share,'share');text(policy,'privacyPolicy');};
  }
  function openPolicy(){
    const panel=openPanel('privacyPolicy');const frame=element('iframe',null,panel.body);frame.src='politica-privacidad.html#embedded';frame.title=t('privacyPolicy');frame.style.cssText='display:block;width:100%;height:60dvh;border:0;border-radius:14px;margin-top:12px';
    const update=panel.updateLanguage;panel.updateLanguage=()=>{update();frame.title=t('privacyPolicy');try{frame.contentWindow.FG_I18N?.setLanguage(I.language());}catch{}};
  }
  function tutorial(){
    const session=new M.Practice();let raf=0,last=0,phase=-1,taps=-1,hidden=document.hidden;
    const panel=openPanel('practiceTitle',()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('ghost-native-pause',nativePause);window.removeEventListener('ghost-native-resume',nativeResume);M.mark(session.phase===2?'done':'skipped');});
    const heading=element('h3',null,panel.body);heading.setAttribute('role','status');
    const hint=element('p','practiceHint',panel.body);const canvas=element('canvas',null,panel.body);canvas.width=420;canvas.height=320;canvas.className='fg-practice';canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('aria-label',t('practiceArea'));
    const count=element('p',null,panel.body);const note=element('p','practiceFooter',panel.body);note.className='fg-practice-note';
    const actions=element('div',null,panel.body);actions.className='fg-actions';const skip=action(actions,'skip',()=>panel.close(),true);const done=action(actions,'play',()=>panel.close());done.hidden=true;
    const ctx=canvas.getContext('2d');
    function flap(event){if(event?.isPrimary===false||event?.repeat)return;event?.preventDefault();session.flap();update();}
    canvas.addEventListener('pointerdown',flap);canvas.addEventListener('keydown',e=>{if([' ','ArrowUp','w','W'].includes(e.key))flap(e);});
    function update(force=false){if(force||phase!==session.phase||taps!==session.taps){phase=session.phase;taps=session.taps;text(heading,phase===0?'practiceTap':phase===1?'practiceGoal':'practiceDone');text(count,phase===2?'practiceSuccess':'practiceCount',{count:Math.min(3,taps)});done.hidden=phase!==2;skip.hidden=phase===2;}}
    function visibility(){hidden=document.hidden;last=0;}function nativePause(){hidden=true;last=0;}function nativeResume(){hidden=document.hidden;last=0;}
    document.addEventListener('visibilitychange',visibility);window.addEventListener('ghost-native-pause',nativePause);window.addEventListener('ghost-native-resume',nativeResume);
    canvas.addEventListener('focus',()=>{hidden=document.hidden;last=0;});
    function frame(now){if(!panel.dialog.isConnected)return;const dt=last?(now-last)/1000:0;last=now;if(!hidden)session.step(dt);update();
      ctx.fillStyle='#e4c4f6';ctx.fillRect(0,0,420,320);
      if(game?.art.sky){const image=game.art.sky;const h=image.height||image.naturalHeight,w=image.width||image.naturalWidth;ctx.drawImage(image,0,h*.3,w,w*320/420,0,0,420,320);}
      if(session.phase>0){const x=session.doorX;ctx.fillStyle='#926441';ctx.fillRect(x,0,72,80);ctx.fillRect(x,240,72,80);ctx.fillStyle='#fff6e8';ctx.fillRect(x,76,72,8);ctx.fillRect(x,236,72,8);}
      const image=game?.charImgs[game.selected];if(image){const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height,s=48/Math.max(w,h);ctx.drawImage(image,108-w*s/2,session.y-h*s/2,w*s,h*s);}else{ctx.fillStyle='#fff6e8';ctx.beginPath();ctx.arc(108,session.y,18,0,Math.PI*2);ctx.fill();}
      if(session.phase!==2)raf=requestAnimationFrame(frame);
    }
    const updatePanel=panel.updateLanguage;panel.updateLanguage=()=>{updatePanel();text(hint,'practiceHint');text(note,'practiceFooter');text(skip,'skip');text(done,'play');canvas.setAttribute('aria-label',t('practiceArea'));update(true);};
    update();raf=requestAnimationFrame(frame);
  }
  function openFeedback(){
    const panel=openPanel('feedbackTitle');const hint=element('p','feedbackHint',panel.body);const label=element('label','feedbackLabel',panel.body);const input=element('textarea',null,label);input.maxLength=2000;input.value=feedbackDraft;input.setAttribute('aria-label',t('feedbackLabel'));
    const status=element('p',null,panel.body);status.className='fg-status';status.setAttribute('role','status');let statusKey=null;
    const prepare=action(panel.body,'prepareMail',()=>{const mail=M.feedbackMail(input.value);statusKey=mail?'mailPrepared':'feedbackError';text(status,statusKey);link.hidden=!mail;if(mail)link.href=mail;});
    const link=element('a','openMail',panel.body);link.className='fg-action secondary';link.hidden=true;
    const support=element('p',null,panel.body);support.textContent=M.SUPPORT_EMAIL;
    input.oninput=()=>{feedbackDraft=input.value;link.hidden=true;link.removeAttribute('href');status.textContent='';statusKey=null;};
    const update=panel.updateLanguage;panel.updateLanguage=()=>{update();text(hint,'feedbackHint');label.firstChild.textContent=t('feedbackLabel');input.setAttribute('aria-label',t('feedbackLabel'));text(prepare,'prepareMail');text(link,'openMail');if(statusKey)text(status,statusKey);if(!link.hidden)link.href=M.feedbackMail(input.value);};
  }
  async function openShare(){
    const data=M.shareData(game?.score||0,game?.best||0);const panel=openPanel('shareTitle');const intro=element('p','shareReady',panel.body);const label=element('label','shareLabel',panel.body);const area=element('textarea',null,label);area.readOnly=true;area.value=data.text+'\n'+data.url;area.setAttribute('aria-label',t('shareLabel'));
    const status=element('p','shareFallback',panel.body);status.className='fg-status';status.setAttribute('role','status');let statusKey='shareFallback';
    const copy=action(panel.body,'shareCopy',async()=>{const ok=await M.copy(area.value);if(!panel.dialog.isConnected)return;statusKey=ok?'shareCopied':'shareCopyError';text(status,statusKey);if(!ok){area.focus();area.select();}});
    const update=panel.updateLanguage;panel.updateLanguage=()=>{update();text(intro,'shareReady');label.firstChild.textContent=t('shareLabel');area.setAttribute('aria-label',t('shareLabel'));const translated=M.shareData(data.score,data.best);area.value=translated.text+'\n'+translated.url;text(copy,'shareCopy');text(status,statusKey);};
    // Sharing is reached only by the user's explicit Share action, never by a score event.
    const result=await M.share(data);if(!panel.dialog.isConnected)return;
    statusKey=result==='opened'?'shareOpened':result==='cancelled'?'shareCancelled':'shareFallback';text(status,statusKey);
  }
  window.GhostUI={openPanel,openPolicy,hasOverlay:()=>panels.length>0,help,tutorial,
    sync(){if(!tools||lastMode===game.mode)return;lastMode=game.mode;window.GhostMusic?.setMode();tools.hidden=game.mode==='play'||game.mode==='recovery';const share=tools.querySelector('.fg-share');if(share)share.hidden=game.mode!=='dead';},
    ready(){window.GhostMusic?.setMode();if(!M.seen())tutorial();},
    status:()=>({mode:game?.mode,score:game?.score,best:game?.best,overlays:panels.length}),
  };
  // Keep DOM controls outside the canvas' centre action; no gameplay hit boxes change.
  window.GhostUI.attach=value=>{game=value;window.GhostMusic?.attach(game);tools=element('nav');tools.className='fg-tools';tools.setAttribute('aria-label',t('help'));document.body.append(tools);const language=element('button',null,tools);language.type='button';language.textContent=I.languageShort();language.setAttribute('aria-label',t('language'));language.onclick=help;const share=action(tools,'share',openShare);share.className='fg-share';share.hidden=true;action(tools,'help',help);musicButton(document.body,true);};
  window.addEventListener('ghost-language-changed',()=>{for(const panel of panels)panel.updateLanguage();updateMusic();if(tools){tools.setAttribute('aria-label',t('help'));const buttons=tools.querySelectorAll('button');buttons[0].textContent=I.languageShort();buttons[0].setAttribute('aria-label',t('language'));text(buttons[1],'share');text(buttons[2],'help');}if(game){game.hint='';game.draw();}});
  window.addEventListener('ghost-music-changed',updateMusic);
  window.addEventListener('ghost-native-back',event=>{if(panels.length){event.preventDefault();panels.at(-1).close();return;}pause();});
})();
