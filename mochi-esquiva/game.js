// MOCHI ESQUIVA · Motor, controles, oleadas y efectos.
// Three.js y sus addons son la única dependencia externa, fijada en r169.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

// Las fábricas Models y CandyWorld se incorporan a este mismo archivo abajo.

const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const LANE_SPACING=2.2;
const LANE_COUNT=5, LANE_HALF=2;
const LANES = [-2*LANE_SPACING,-LANE_SPACING, 0, LANE_SPACING,2*LANE_SPACING];
const WORLD_SCALE=2.65;
const PLAYER_Z = 0;
const SPAWN_Z = -62*WORLD_SCALE;
const FIXED_DT = 1 / 120;
const KINDS = ['donut', 'gummy', 'cupcake', 'tea', 'lollipop', 'icecream', 'sushi', 'cotton', 'macaron', 'jelly'];
const store = {
  get(key, fallback) { try { return localStorage.getItem('mochi3d.' + key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('mochi3d.' + key, String(value)); } catch { /* Modo privado: la partida sigue funcionando. */ } }
};
const game = {
  state: 'menu', elapsed: 0, distance: 0, bonus: 0, score: 0, rawScore:0,
  best: Math.max(0, Number(store.get('best', '0')) || 0), initialBest: 0,
  speed: 12.5, worldSpeed:12.5*WORLD_SCALE, lane: 0, x: 0, previousX: 0, near: 0, overtaken:0, continues: 0,
  spawnCursor:31, lastSafe: 1, wave: 0, combo: 1, chain: 0, comboTimer: 0,deathId:0,continuedDeath:-1,
  invincible: 0, cheer: 0, shake: 0, count: 0, countFrom: 3, countAction: 'start',
  adTime: 0, adLength: 5, sound: store.get('sound', '1') !== '0',
  quality: ['auto','high','low'].includes(store.get('quality', 'auto')) ? store.get('quality', 'auto') : 'auto'
};

const Audio = (() => {
  let ctx, master, nextBeat = 0, beat = 0;
  function unlock() {
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = game.sound ? 0.16 : 0;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch { /* WebAudio indisponible: no bloquea el juego. */ }
  }
  function tone(freq, duration, type = 'sine', volume = 0.4, delay = 0, endFreq = freq) {
    if (!ctx || !game.sound || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + duration);
    gain.gain.setValueAtTime(0.001, t); gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain); gain.connect(master); osc.start(t); osc.stop(t + duration + 0.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function play(kind) {
    if (kind === 'move') tone(320, 0.10, 'sine', 0.18, 0, 640);
    if (kind === 'dash') tone(260,.3,'sine',.2,0,1250);
    if (kind === 'brake') tone(420,.2,'sine',.15,0,170);
    if (kind === 'star') { tone(880, 0.13, 'sine', 0.32); tone(1320, 0.16, 'sine', 0.22, 0.045); }
    if (kind === 'near') [660, 880, 1320].forEach((n, i) => tone(n, .18, 'triangle', .32, i * .07));
    if (kind === 'crash') { tone(180, .28, 'sawtooth', .32, 0, 42); tone(95, .35, 'triangle', .35); }
    if (kind === 'count') tone(520, .12, 'sine', .30);
    if (kind === 'go') { tone(780, .25, 'triangle', .32); tone(1040, .25, 'sine', .23, .07); }
    if (kind === 'click') tone(580, .07, 'sine', .15, 0, 750);
  }
  function update() {
    if (!ctx || !game.sound || game.state !== 'running' || ctx.state !== 'running') return;
    if (ctx.currentTime > nextBeat) {
      const notes = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 392];
      tone(notes[beat % notes.length], .20, 'sine', .065);
      if (beat % 4 === 0) tone(130.81, .25, 'triangle', .06);
      beat++; nextBeat = ctx.currentTime + .27;
    }
  }
  function mute() {
    if (master && ctx) master.gain.setTargetAtTime(game.sound ? .16 : 0, ctx.currentTime, .03);
  }
  return { unlock, play, update, mute };
})();

let speedBlur, cameraRoll=0;
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer, scene, camera, composer, bloom, world, player, shadow, shadowMat;
let camFollow=0,gradePass=null,autoDowngrades=0;
let ambientParticles, speedLines, sun, environmentTarget, systems, collectibles, originalMenus;
const cameraBase=new THREE.Vector3(0,4.9,9.6);
const hazards = [], stars = [], hazardPool = Object.fromEntries(KINDS.map(k => [k, []])), starPool = [];
const popupNodes = [];
let visualTime = 0, lastTime = 0, hudTime = 0, frameAverage = 16.7;
let qualityLevel = 1, qualityCooldown = 0, renderedFrames = 0, contextLost = false;
const particleCount = 90, sparkCount = 110;
const sparkPositions = new Float32Array(sparkCount * 3);
const sparkColors = new Float32Array(sparkCount * 3);
const sparkLife = new Float32Array(sparkCount);
const sparkVelocity = new Float32Array(sparkCount * 3);
let sparkCursor = 0, sparkPoints, starGeometry, starMaterial,starModel;
let countdownLast = -1, lastSceneEvent=null;
const tmpV = new THREE.Vector3();

function setState(state) {
  game.state = state;
  for (const id of ['menu','select','tutorial','pause','gameover','ad','countdown','podium','lobby']) $(id).hidden = state !== id;
  if(state==='menu'||state==='select'){$('raceHud').hidden=true;}
  for (const id of ['shop','missions']) $(id).hidden=true;
  const originalUI=state==='menu'||state==='select';
  $('menuCanvas').hidden=!originalUI; $('game').style.visibility=originalUI?'hidden':'visible';
  $('hud').hidden=originalUI||state==='tutorial';
  $('powerHud').hidden=true; $('eventBanner').hidden=true; $('dashHud').hidden=state!=='running'&&state!=='countdown';$('streakBox').hidden=$('dashHud').hidden;$('runMission').hidden=$('dashHud').hidden;
  $('gestureHint').hidden = state !== 'running' || game.elapsed > 8;
  $('menuBest').textContent = game.best.toLocaleString('es-ES');
  document.body.dataset.state = state;
  if (state !== 'running') {resetGesture();$('toast').classList.remove('show');}
}

function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.remove('show');
  void $('toast').offsetWidth;
  $('toast').classList.add('show');
}

function makeEnvironment() {
  // Mapa de reflejos generado, sin HDR ni imágenes descargadas.
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#6f70c1'); g.addColorStop(.38, '#e49acf');
  g.addColorStop(.65, '#ffdeb3'); g.addColorStop(1, '#6589ae');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
  for (const [x, y, r, color] of [[150,75,60,'#fff5da'],[380,90,55,'#bafaff'],[290,125,24,'#ffd8f2']]) {
    const light = ctx.createRadialGradient(x,y,0,x,y,r);
    light.addColorStop(0,color); light.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = light; ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  const texture = new THREE.CanvasTexture(c); texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  environmentTarget = pmrem.fromEquirectangular(texture); scene.environment = environmentTarget.texture;
  texture.dispose(); pmrem.dispose();
}

function init() {
  const canvas = $('game');
  renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: 'high-performance'});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = false; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#86579e');
  scene.fog = new THREE.FogExp2('#b0418f', .0052);
  camera = new THREE.PerspectiveCamera(72, 1, .1, 460);
  scene.add(new THREE.HemisphereLight('#c9dcff', '#9a469e', 1.0));
  sun = new THREE.DirectionalLight('#ffdbb4', 1.9); sun.position.set(-9,16,8);
  sun.castShadow = true; sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera, {left:-9,right:9,top:13,bottom:-13,near:1,far:55});
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .035; sun.shadow.radius = 3;
  sun.target.position.set(0,0,-7); scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#8ef5ff', .9); fill.position.set(8,5,-9); scene.add(fill);
  const pink = new THREE.PointLight('#ff70c4', 22, 16, 2); pink.position.set(-4,3,5); scene.add(pink);
  makeEnvironment();
  world = CandyWorld.create(scene, Models);
  // R5: capa lejana pintada (montañas de pastel, luna y nubes) guiada por la referencia, para el acabado fotográfico.
  new THREE.TextureLoader().load('assets/backdrop.png',tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
    const bd=new THREE.Mesh(new THREE.PlaneGeometry(300,69),new THREE.MeshBasicMaterial({map:tex,transparent:true,fog:false,depthWrite:false,toneMapped:false,color:new THREE.Color(1.05,1.0,1.08)}));
    bd.position.set(0,22,-236);bd.renderOrder=-50;scene.add(bd);});
  // Rim light fría a contraluz + luz cálida de relleno: separan personajes y vehículos del fondo.
  const rim=new THREE.DirectionalLight('#7fe9ff',.8);rim.position.set(14,9,-4);scene.add(rim);
  const warm=new THREE.PointLight('#ffb36b',5,14,2);warm.position.set(-5,4,-6);scene.add(warm);
  player = Models.mochi(); player.scale.setScalar(1.1); player.position.set(0,.04,PLAYER_Z); scene.add(player);
  shadowMat = new THREE.MeshBasicMaterial({map: radialTexture(), transparent:true, opacity:.42, depthWrite:false, color:'#522b70'});
  shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.7,2.7),shadowMat);
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0,.028,PLAYER_Z); scene.add(shadow);
  const renderTarget = new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
  renderTarget.samples = 0;
  composer = new EffectComposer(renderer, renderTarget); composer.addPass(new RenderPass(scene,camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(1,1), .22, .42, 1.25);
  composer.addPass(bloom);
  speedBlur=new ShaderPass({uniforms:{tDiffuse:{value:null},strength:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform float strength;varying vec2 vUv;
      void main(){vec2 d=vUv-vec2(.5,.58);float edge=smoothstep(.18,.62,length(d));
      vec2 v=d*strength*edge;vec4 c=texture2D(tDiffuse,vUv)*.4;
      c+=texture2D(tDiffuse,vUv-v)*.25;c+=texture2D(tDiffuse,vUv-v*2.)*.18;
      c+=texture2D(tDiffuse,vUv-v*3.)*.11;c+=texture2D(tDiffuse,vUv-v*4.)*.06;gl_FragColor=c;}`});
  composer.addPass(speedBlur);
  gradePass=new ShaderPass({uniforms:{tDiffuse:{value:null},tint:{value:new THREE.Vector3(1,1,1)},time:{value:0},px:{value:new THREE.Vector2(1/540,1/1170)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform vec3 tint;uniform float time;uniform vec2 px;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){float dof=smoothstep(.62,.80,vUv.y)*(1.-smoothstep(.93,1.,vUv.y))*1.6;vec4 c=texture2D(tDiffuse,vUv);
      if(dof>.01){vec4 b=vec4(0.);for(int i=0;i<8;i++){float a=float(i)*.785;b+=texture2D(tDiffuse,vUv+vec2(cos(a),sin(a))*px*dof*2.2);}c=mix(c,b/8.,min(1.,dof));}
      float l=dot(c.rgb,vec3(.2126,.7152,.0722));vec3 g=mix(vec3(l),c.rgb,1.18);g=pow(max(g,0.),vec3(1.14))*1.08;
      g*=mix(vec3(1.),vec3(1.06,.93,1.08),.6);float v=1.-.28*smoothstep(.35,.95,length(vUv-.5)*1.25);g*=tint;g+= (hash(vUv*1000.+time)-.5)*.022;gl_FragColor=vec4(g*v,c.a);}`});
  composer.addPass(gradePass);composer.addPass(new OutputPass());
  createParticles(); createStarGeometry();initRoadGameplay();initFun();
  systems=GameSystems.create({game,store,Models,notify,setState,onCharacterChange:applyCharacter,
    startGame,startTurbo:()=>startGame(true),backToMenu,Audio});
  applyCharacter(systems.selected);
  collectibles=Collectibles.create({scene,THREE,LANES,WORLD_SCALE,systems,game,burst,Audio});
  originalMenus=OriginalMenus.create({canvas:$('menuCanvas'),OriginalPortraits,systems,game,stage:$('stage'),mochi,Audio});
  bindControls();bindRaceUI();prewarm(); applyQuality(game.quality==='low'?0:game.quality==='high'?2:1); resize(); updateSoundUI(); updateHUD();
  setState('menu'); $('loading').hidden = true;
  setTimeout(()=>{try{const pm=new THREE.PMREMGenerator(renderer);const hidden=[player,shadow];hidden.forEach(o=>o.visible=false);
    const rt=pm.fromScene(scene,.035,.1,400);hidden.forEach(o=>o.visible=true);scene.environment=rt.texture;environmentTarget?.dispose?.();environmentTarget=rt;pm.dispose();}catch(e){console.warn('PMREM escena',e);}},1500);
  lastTime = performance.now(); requestAnimationFrame(frame);
  window.addEventListener('resize',resize); new ResizeObserver(resize).observe($('stage'));
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); contextLost = true; if (game.state === 'running' || game.state === 'countdown') pauseGame();
    $('fatal').hidden = false; $('fatalText').textContent = 'La pantalla 3D se ha desconectado. Recarga para volver a jugar.';
  });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  // API de inspección sin modificar la lógica ni incluir controles de prueba en el juego.
  window.mochiDebug = {get race(){return race&&{kind:race.kind,done:race.done,racers:race.racers.map(r=>({name:r.name,dist:Math.round(r.dist),lane:r.lane,fin:r.fin,ai:!!r.ai,remote:!!r.remote}))};},get net(){return net&&{code:net.code,host:net.host,status:net.status,players:net.players.length};},step(sec){for(let t=0;t<sec&&game.state==='running';t+=1/120){fixedUpdate(1/120);updateOriginalMochi(1/120);visualTime+=1/120;}},get snapshot() { return {
    state:game.state, score:game.score, best:game.best, speed:game.speed,
    elapsed:game.elapsed, lane:mochi.lane, x:mochi.x, worldX:game.x,vx:mochi.vx,continues:game.continues,
    overtaken:game.overtaken,fov:camera.fov,roll:cameraRoll,near:game.near, combo:game.combo, invincible:game.invincible, quality:qualityLevel,
    zone:zoneIdx,zoneW:[...zoneW],jump:jumpT,streak,superT,mission:runMission&&{...runMission},ramps:ramps.length,event:systems?.event?.kind||null,hazards:hazards.map(h=>({kind:h.kind,lane:h.finalLane,x:h.mesh.position.x,z:h.z,wave:h.wave,moving:h.moving,driveSpeed:h.driveSpeed,closingSpeed:game.worldSpeed/WORLD_SCALE-h.driveSpeed,heading:h.mesh.rotation.y})),
    drawCalls:renderer.info.render.calls, triangles:renderer.info.render.triangles,
    motion:{...mochi},world:world.stats,baseY,laneW,W,H,worldSpeed:game.worldSpeed,
    dash:dashK,dashCooldown,plateTime,turboPads:turboPads.map(p=>({lane:p.lane,z:p.z})),brake:brakeK,pixelRatio:renderer.getPixelRatio(),bloom:bloom.enabled,
    character:player.userData.characterId,systems:systems.debug.snapshot(),collectibles:collectibles.stats(),modeTurbo:game.modeTurbo
  }; }};
}

function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(32,32,1,32,32,31);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.38,'rgba(255,255,255,.5)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,64,64); return new THREE.CanvasTexture(c);
}

function resize() {
  if(!renderer)return;
  W=Math.max(1,$('stage').clientWidth);H=Math.max(1,$('stage').clientHeight);
  horizonY=H*.34;laneW=Math.min(W*.29,H*.17);
  const pr=document.createElement('div');
  pr.style.cssText='position:fixed;bottom:0;height:env(safe-area-inset-bottom);width:1px;visibility:hidden';
  document.body.appendChild(pr);const safeBottom=pr.offsetHeight||0;pr.remove();
  baseY=Math.min(H*.80,H-safeBottom-Math.max(118,H*.15));
  // Los carriles conservan el muelle original; esta cámara nueva baja y cercana
  // muestra la avenida mucho más grande, tal como pide la remasterización.
  camera.fov=W/H>.8?64:72;camera.aspect=W/H;
  camera.position.copy(cameraBase);camera.lookAt(0,1,-24);camera.updateProjectionMatrix();
  const cap=qualityLevel===2?(game.quality==='high'?3:2):qualityLevel===1?1.5:1;
  const dpr=Math.min(window.devicePixelRatio||1,cap);
  renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);
  composer.setPixelRatio(dpr);composer.setSize(W,H);
  bloom.setSize(Math.floor(W*dpr*.5),Math.floor(H*dpr*.5));
  originalMenus?.resize(W,H,Math.min(window.devicePixelRatio||1,2));
}

function applyQuality(level) {
  qualityLevel=clamp(level,0,2);
  if(!renderer)return;
  const wantShadows=game.quality==='high';if(renderer.shadowMap.enabled!==wantShadows){renderer.shadowMap.enabled=wantShadows;}
  player?.traverse(object=>{
    const mat=object.material;
    if(!mat?.isMeshPhysicalMaterial)return;
    if(mat.userData.originalTransmission===undefined)mat.userData.originalTransmission=mat.transmission;
    mat.transmission=qualityLevel===2?mat.userData.originalTransmission:0;mat.needsUpdate=true;
  });
  world?.setQuality(qualityLevel);
  if(bloom){bloom.enabled=qualityLevel>0;bloom.strength=qualityLevel===2?.32:.24;}
  if(ambientParticles){ambientParticles.geometry.setDrawRange(0,qualityLevel===2?90:qualityLevel===1?56:24);}
  if(speedLines) speedLines.geometry.setDrawRange(0,qualityLevel===0?48:120);
  if(composer)resize();
  const label=game.quality==='auto'?(qualityLevel===0?'AUTO · ECO':'AUTO'):game.quality==='high'?'HD':'ECO';
  $('qualityButton').textContent=label;$('qualityButton').dataset.level=qualityLevel;
  $('qualityButton').title='Calidad: '+(game.quality==='auto'?'automática':game.quality==='high'?'alta':'ahorro');
  $('qualityButton').setAttribute('aria-label',$('qualityButton').title);
  if($('qualityStatus'))$('qualityStatus').textContent=qualityLevel===0?'Modo ahorro: reflejos, bloom y sombras desactivados.':qualityLevel===1?'Calidad equilibrada, reflejos reducidos.':'Calidad alta.';
}

function createParticles() {
  const texture = radialTexture();
  const pos = new Float32Array(particleCount*3), colors = new Float32Array(particleCount*3);
  for (let i=0;i<particleCount;i++) {
    pos[i*3]=(Math.random()-.5)*36; pos[i*3+1]=Math.random()*19+.2; pos[i*3+2]=Math.random()*130-115;
    const c = new THREE.Color(i%3===0?'#ffd284':i%3===1?'#fda8e0':'#aeffff');
    colors.set([c.r*1.5,c.g*1.5,c.b*1.5],i*3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  ambientParticles = new THREE.Points(geo,new THREE.PointsMaterial({size:.12,map:texture,transparent:true,opacity:.7,vertexColors:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  ambientParticles.frustumCulled=false; scene.add(ambientParticles);
  sparkPositions.fill(-999);
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3)); sparkGeo.setAttribute('color',new THREE.BufferAttribute(sparkColors,3));
  sparkPoints = new THREE.Points(sparkGeo,new THREE.PointsMaterial({size:.20,map:texture,transparent:true,vertexColors:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  sparkPoints.frustumCulled=false; scene.add(sparkPoints);
  const linePos = new Float32Array(60*6);
  for(let i=0;i<60;i++) {
    const x=(i%2?1:-1)*(1.2+Math.random()*9), y=Math.random()*5+.2, z=Math.random()*70-65;
    linePos.set([x,y,z,x,y,z+1.6],i*6);
  }
  const linesGeo = new THREE.BufferGeometry(); linesGeo.setAttribute('position',new THREE.BufferAttribute(linePos,3));
  speedLines = new THREE.LineSegments(linesGeo,new THREE.LineBasicMaterial({color:'#c2f5ff',transparent:true,opacity:.06,blending:THREE.AdditiveBlending,depthWrite:false}));
  speedLines.frustumCulled=false; scene.add(speedLines);
}

function burst(x,y,z,color,count=22) {
  const c = new THREE.Color(color);
  for(let i=0;i<count;i++) {
    const n = sparkCursor++ % sparkCount;
    sparkPositions.set([x,y,z],n*3); sparkColors.set([c.r*2,c.g*2,c.b*2],n*3);
    sparkVelocity.set([(Math.random()-.5)*6,Math.random()*4+1,(Math.random()-.5)*5],n*3);
    sparkLife[n]=.6+Math.random()*.55;
  }
}

function updateEffects(dt) {
  const pos=ambientParticles.geometry.attributes.position.array;
  for(let i=0;i<particleCount;i++) {
    pos[i*3+2]+=dt*(game.state==='running'?game.worldSpeed*.55:1.2);
    pos[i*3+1]+=Math.sin(visualTime+i)*dt*.09;
    if(pos[i*3+2]>17) pos[i*3+2]=-115;
  }
  ambientParticles.geometry.attributes.position.needsUpdate=true;
  ambientParticles.material.opacity=.50+Math.sin(visualTime*.7)*.1;
  for(let i=0;i<sparkCount;i++) {
    if(sparkLife[i]>0) {
      sparkLife[i]-=dt;
      for(let j=0;j<3;j++) sparkPositions[i*3+j]+=sparkVelocity[i*3+j]*dt;
      sparkVelocity[i*3+1]-=dt*4;
      if(sparkLife[i]<=0) sparkPositions[i*3+1]=-999;
    }
  }
  sparkPoints.geometry.attributes.position.needsUpdate=true; sparkPoints.geometry.attributes.color.needsUpdate=true;
  const lines=speedLines.geometry.attributes.position.array;
  for(let i=0;i<60;i++) {
    const move=dt*(game.state==='running'?game.worldSpeed*1.3:3);
    lines[i*6+2]+=move; lines[i*6+5]+=move;
    if(lines[i*6+2]>14) {lines[i*6+2]=-75;lines[i*6+5]=-75+1.5+Math.max(0,game.speed-20)*.12;}
  }
  speedLines.geometry.attributes.position.needsUpdate=true;
  speedLines.material.opacity=game.state==='running'?.05+clamp((game.worldSpeed/WORLD_SCALE-26)/34,0,1)*.32:.0;
  for(let i=popupNodes.length-1;i>=0;i--) {
    const p=popupNodes[i]; p.life-=dt;
    tmpV.set(p.x,p.y+(1.3-p.life)*1.2,p.z).project(camera);
    p.node.style.left=((tmpV.x*.5+.5)*100)+'%'; p.node.style.top=((-tmpV.y*.5+.5)*100)+'%';
    p.node.style.opacity=String(clamp(p.life*2,0,1));
    if(p.life<=0) {p.node.remove();popupNodes.splice(i,1);}
  }
}

function createStarGeometry() {
  // Estrella dorada biselada, con núcleo facetado y un destello aditivo barato.
  const shape=new THREE.Shape();
  for(let i=0;i<10;i++) {
    const a=Math.PI/2+i*Math.PI/5,r=i%2?.27:.65;
    if(i===0)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  shape.closePath();
  starGeometry=new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSize:.07,bevelThickness:.065,bevelSegments:1,steps:1});starGeometry.center();
  starMaterial=new THREE.MeshStandardMaterial({color:'#ffd459',metalness:.85,roughness:.08,emissive:'#ffa41a',emissiveIntensity:.5});
  starModel=new THREE.Group();starModel.add(new THREE.Mesh(starGeometry,starMaterial));
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.25),new THREE.MeshStandardMaterial({color:'#fff1a2',metalness:.8,roughness:.1,emissive:'#ffba32',emissiveIntensity:.18}));
  gem.position.z=.15;gem.scale.z=.5;starModel.add(gem);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:radialTexture(),color:'#ffcf5a',transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending}));
  glow.scale.set(3.0,3.0,1);starModel.add(glow);
}

function spawnStar(lane,z,big=false) {
  const mesh=starPool.pop()||starModel.clone();mesh.visible=true;mesh.scale.setScalar(big?2.7:1.4);
  mesh.position.set(LANES[lane],big?1.8:1.25,z);scene.add(mesh);
  stars.push({mesh,z,lane,big,phase:Math.random()*6});
}
function recycleStar(i) {const s=stars[i];s.mesh.visible=false;scene.remove(s.mesh);starPool.push(s.mesh);stars.splice(i,1);}

function makeArrow() {
  const group=new THREE.Group();const mat=new THREE.MeshBasicMaterial({color:new THREE.Color(2.3,1.3,.16)});
  const shaft=new THREE.Mesh(new THREE.BoxGeometry(.65,.11,.08),mat);
  const head=new THREE.Mesh(new THREE.ConeGeometry(.22,.36,3),mat);head.rotation.z=-Math.PI/2;head.position.x=.46;
  group.add(shaft,head);group.position.y=2.7;group.visible=false;return group;
}
// R4: world heading is -Z for Mochi AND traffic. Positive relative Z means
// the faster player is catching the vehicle, never an oncoming vehicle.
const trafficLampGeometry=new THREE.SphereGeometry(.065,6,4);
const tailMaterial=new THREE.MeshBasicMaterial({color:0xe65b92});
const signalMaterial=new THREE.MeshBasicMaterial({color:0xffb844});
function spawnHazard(kind,lane,finalLane,wave,logicalZ=FAR,needT=1.3,driveSpeed=game.speed*.48) {
  let mesh=hazardPool[kind].pop();
  if(!mesh){
    mesh=Models.obstacle(kind);mesh.userData.arrow=makeArrow();mesh.add(mesh.userData.arrow);
    mesh.userData.signals=[];
    for(const side of [-1,1]) {
      const tail=new THREE.Mesh(trafficLampGeometry,tailMaterial);tail.position.set(side*.43,.42,-.75);tail.scale.set(1.8,1,.6);mesh.add(tail);
      const lamp=new THREE.Mesh(trafficLampGeometry,signalMaterial);lamp.position.set(side*.6,.58,-.75);lamp.visible=false;mesh.add(lamp);mesh.userData.signals.push(lamp);
    }
  }
  const z=-logicalZ*WORLD_SCALE;
  mesh.visible=true;mesh.scale.setScalar(1.35);mesh.position.set(LANES[lane],.03,z);mesh.rotation.set(0,Math.PI,0);scene.add(mesh);
  mesh.userData.arrow.visible=false;mesh.userData.signals.forEach(l=>l.visible=false);
  if(mesh.userData.tint){const c=new THREE.Color().setHSL(Math.random(),.75,.62);mesh.userData.tint.color.copy(c);}
  const h={kind,mesh,lane,finalLane,wave,z,oldZ:z,radius:.87,needT,driveSpeed,
    age:0,moving:lane!==finalLane,passed:false,resolved:false,closest:Infinity,phase:Math.random()*10};
  hazards.push(h);mesh.userData.animate?.(visualTime,0,driveSpeed);return h;
}
// Conservative lane reservations: a merging vehicle reserves BOTH lanes.
// Search a traversable route over the visible horizon, allowing .35s per lane.
// Check normal speed AND sustained boost, so random variations cannot form a wall.
function trafficHasRoute(candidate) {
  const list=hazards.filter(h=>!h.passed).concat(candidate);
  for(const multiplier of [1,1.55]) {
    let reachable=[0,1,2,3,4].map(l=>({l,ready:0}));
    for(let t=0;t<=7;t+=.175) {
      const blocked=new Set();
      for(const h of list) {
        const z=h.z+((game.speed*multiplier-h.driveSpeed)*t+.065*t*t)*WORLD_SCALE;
        if(Math.abs(z)<4.3){blocked.add(h.finalLane);if(h.moving&&h.age+t<2.3)blocked.add(h.lane);}
      }
      const next=[];
      for(let l=0;l<LANE_COUNT;l++)if(!blocked.has(l)) {
        let ready=Infinity;
        for(const prev of reachable)if(prev.l===l)ready=Math.min(ready,prev.ready);
        else if(Math.abs(prev.l-l)===1&&t>=prev.ready&&!blocked.has(prev.l))ready=Math.min(ready,t+.35);
        if(Number.isFinite(ready))next.push({l,ready});
      }
      if(!next.length)return false;reachable=next;
    }
  }
  return true;
}
function spawnWave() {
  // R5: 5 carriles. Fila de 2-4 vehículos casi a la par del jugador, siempre con hueco.
  const options=[game.lastSafe];if(game.lastSafe>0)options.push(game.lastSafe-1);if(game.lastSafe<4)options.push(game.lastSafe+1);
  const safe=game.wave===0?2:options[Math.floor(Math.random()*options.length)];
  const others=[0,1,2,3,4].filter(l=>l!==safe).sort(()=>Math.random()-.5);
  const level=Math.min(1,game.elapsed/90);
  let count=game.wave<2?2:2+Math.floor(Math.random()*(1.6+level*1.6));
  count=Math.min(4,count);
  const blocked=others.slice(0,count);const rowKinds=[];
  const event=systems?.eventForWave(game.wave);
  const eta=game.wave===0?2.6:3.2-level*.5;
  for(const lane of blocked) {
    const kind=nextKind(rowKinds,event?.kind==='donut'&&!rowKinds.includes('donut'));rowKinds.push(kind);
    // Coches más a la par: entre el 58 % y el 86 % de tu velocidad, así los adelantamientos son ajustados.
    const ownSpeed=game.speed*(.58+Math.random()*.28-level*.06);
    const jitter=(Math.random()-.5)*.5;
    const z=-((game.speed*(game.modeTurbo?1.3:1)-ownSpeed)*(eta+jitter)+.065*eta*eta)*WORLD_SCALE-8;
    const free=[lane-1,lane+1].filter(l=>l>=0&&l<5&&l!==safe&&!blocked.includes(l));
    const merging=game.elapsed>8&&free.length&&Math.random()<.22+level*.18;
    const from=merging?lane:lane, to=merging?free[Math.floor(Math.random()*free.length)]:lane;
    const candidate={z,driveSpeed:ownSpeed,finalLane:to,lane:from,moving:merging,age:0};
    if(!trafficHasRoute(candidate))continue;
    spawnHazard(kind,from,to,game.wave,-z/WORLD_SCALE,1.3,ownSpeed);
  }
  const pickupZ=game.speed*(game.wave===0?1.6:2.8)*.55;
  spawnStar(safe,-pickupZ*WORLD_SCALE,game.wave%2===0);
  collectibles?.spawnWave(safe,pickupZ,game.wave,event);
  game.lastSafe=safe;game.wave++;
  return Math.max(.72,1.35-game.elapsed*.006);
}
// R5: bolsa aleatoria con todos los tipos; nunca el mismo dos veces seguidas ni repetido en la fila.
let kindBag=[],lastKind=null;
function nextKind(row=[],forceDonut=false){
  if(forceDonut&&lastKind!=='donut'){lastKind='donut';return 'donut';}
  for(let tries=0;tries<20;tries++){
    if(!kindBag.length){kindBag=[...KINDS];for(let i=kindBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[kindBag[i],kindBag[j]]=[kindBag[j],kindBag[i]];}}
    const idx=kindBag.findIndex(k=>k!==lastKind&&!row.includes(k));
    if(idx<0){kindBag.length=0;continue;}
    const k=kindBag.splice(idx,1)[0];lastKind=k;return k;
  }
  return KINDS.find(k=>!row.includes(k))||KINDS[0];
}
function spawnTraffic() {
  while(game.spawnCursor<=0)game.spawnCursor+=spawnWave();
}

function clearObjects() {
  for(let i=hazards.length-1;i>=0;i--) recycleHazard(i);
  for(let i=stars.length-1;i>=0;i--) recycleStar(i);
  collectibles?.clear();turboPads.length=0;plateTime=0;
  for(const p of popupNodes) p.node.remove();popupNodes.length=0;
  sparkLife.fill(0);sparkPositions.fill(-999);
}
function recycleHazard(i) {
  const h=hazards[i];h.mesh.visible=false;h.mesh.userData.arrow.visible=false;scene.remove(h.mesh);
  hazardPool[h.kind].push(h.mesh);hazards.splice(i,1);
}

function resetRun() {
  clearObjects();resetDash();dCur=game.modeTurbo?.2:0;
  Object.assign(game,{elapsed:0,distance:0,bonus:0,rawScore:0,score:0,initialBest:game.best,speed:28,worldSpeed:28*WORLD_SCALE,
    lane:0,x:0,previousX:0,near:0,overtaken:0,continues:0,spawnCursor:0,lastSafe:2,wave:0,combo:1,chain:0,comboTimer:0,invincible:0,cheer:0,shake:0,deathId:0,continuedDeath:-1});
  Object.assign(mochi,{lane:0,x:0,vx:0,color:0,colPop:0,wob:0,wobV:0,dead:false,deadT:0});
  player.visible=true;player.position.set(0,.04,PLAYER_Z);player.rotation.set(0,0,0);
  systems?.beginRun();funReset();spawnTraffic();$('newRecord').hidden=true;updateHUD();
}
function beginCountdown(action='start',seconds=3) {
  game.countAction=action;game.count=seconds;game.countFrom=seconds;countdownLast=-1;setState('countdown');
}
function startGame(turbo=false) {
  clearRace();game.mode='endless';
  game.modeTurbo=turbo===true; if(systems)systems.profile.turboMode=game.modeTurbo;
  Audio.unlock();Audio.play('click');
  if(store.get('tutorial','0')!=='1'){setState('tutorial');return;}
  resetRun();beginCountdown();
}
function finishTutorial(){store.set('tutorial','1');Audio.unlock();resetRun();beginCountdown();}
function pauseGame() {
  if(!['running','countdown'].includes(game.state))return;
  setState('pause');store.set('best',game.best);
}
function backToMenu() {
  clearRace();closeLobby();
  store.set('best',game.best);clearObjects();resetDash();setState('menu');
  mochi.lane=0;mochi.dead=false;game.invincible=0;player.visible=true;
}

function die() {
  if(game.state!=='running')return;
  mochi.dead=true;mochi.deadT=0;game.deathId++;Audio.play('crash');game.shake=.38;burst(game.x,1.3,PLAYER_Z,'#ffabd9',45);
  if(navigator.vibrate)navigator.vibrate(50);
  systems?.endRun();store.set('best',game.best);setState('gameover');
  $('finalScore').textContent=game.score.toLocaleString('es-ES');$('finalBest').textContent=game.best.toLocaleString('es-ES');
  $('finalPassed').textContent=String(game.overtaken);$('finalNear').textContent=String(game.near);$('newRecord').hidden=game.score<=game.initialBest;
  $('continueButton').hidden=game.continues>=3;
  $('continueInfo').textContent=game.continues>=3?'Has usado las 3 continuaciones de esta partida.':`${3-game.continues} continuaciones disponibles · anuncio simulado`;
}

function startAd() {
  if(game.state!=='gameover'||game.continues>=3||game.continuedDeath===game.deathId)return;
  Audio.unlock();game.adTime=0;$('adContinueButton').disabled=true;
  $('adCountdown').textContent='5';$('adProgress').style.width='0%';$('adContinueButton').textContent='Preparando a Mochi…';setState('ad');
}
function continueRun() {
  if(game.state!=='ad'||game.adTime<game.adLength||game.continues>=3||game.continuedDeath===game.deathId)return;
  game.continues++;game.continuedDeath=game.deathId;game.invincible=3.5;game.lane=0;game.x=0;game.previousX=0;Object.assign(mochi,{lane:0,x:0,vx:0,wob:0,wobV:0,dead:false,deadT:0});resetDash();
  for(let i=hazards.length-1;i>=0;i--)if(hazards[i].z>-game.speed*WORLD_SCALE*3.5)recycleHazard(i);
  for(let i=stars.length-1;i>=0;i--)if(stars[i].z>-35)recycleStar(i);
  game.chain=0;game.combo=1;game.comboTimer=0;player.visible=true;
  Audio.unlock();beginCountdown('continue',2);notify('Reaparición protegida durante 3 segundos');
}

function bonus(points,kind,x=game.x,z=PLAYER_Z) {
  game.chain++;game.comboTimer=4;game.combo=Math.min(5,1+Math.floor(game.chain/5));
  const amount=points*game.combo;game.bonus+=amount;game.rawScore+=amount;
  const node=document.createElement('span');node.className='floating-score '+(kind==='near'?'close':'');node.textContent='+'+amount;
  $('stage').appendChild(node);popupNodes.push({node,life:1.3,x,y:2,z});
  burst(x,1.5,z,kind==='near'?'#ff9cdc':'#ffe895',kind==='near'?32:12);
  Audio.play(kind);
  if(kind==='near') {
    game.near++;systems?.onNearMiss();funOnNear();game.cheer=1.8;game.shake=Math.max(game.shake,.10);notify('¡Por los pelos!');
    $('comboFlash').classList.remove('flash');void $('comboFlash').offsetWidth;$('comboFlash').classList.add('flash');
  }
}

function fixedUpdate(dt) {
  game.elapsed+=dt;
  dCur=lerp(dCur,diffTarget(game.rawScore),1-Math.exp(-dt*.8));
  const d=diff();game.speed=Math.min(60,28+game.elapsed*.22);
  updateDash(dt,d);updateBrake(dt);plateTime=Math.max(0,plateTime-dt);
  systems?.tick(dt);
  const boost=(game.modeTurbo?1.3:1)*(systems?.speedMultiplier||1)*raceSpeedK();
  const padK=Math.max(dashK,1+.32*Math.min(1,plateTime/.18));const logicalMove=game.speed*padK*brakeK*boost*dt,move=logicalMove*WORLD_SCALE;
  game.worldSpeed=game.speed*padK*brakeK*boost*WORLD_SCALE;game.distance+=move;game.rawScore+=logicalMove*.25*(game.modeTurbo?1.5:1)*(feverOn()?2:1);
  systems?.record('distance',logicalMove);
  game.invincible=Math.max(0,game.invincible-dt);game.cheer=Math.max(0,game.cheer-dt);
  game.comboTimer=Math.max(0,game.comboTimer-dt);if(game.comboTimer===0){game.chain=0;game.combo=1;}
  game.spawnCursor-=dt;spawnTraffic();
  const li=clamp(Math.round(mochi.x),-LANE_HALF,LANE_HALF)+LANE_HALF;
  for(let i=hazards.length-1;i>=0;i--) {
    const h=hazards[i];h.age+=dt;h.oldZ=h.z;
    h.z+=(game.worldSpeed-h.driveSpeed*WORLD_SCALE)*dt;h.mesh.position.z=h.z;
    if(h.moving) {
      // Amber indicators precede the smooth merge by 1.25 seconds.
      // Reserve a large headway; cancel a merge if another car occupies it.
      if(h.age<1.25&&hazards.some(o=>o!==h&&o.finalLane===h.finalLane&&Math.abs(o.z-h.z)<9)) {
        h.finalLane=h.lane;h.moving=false;
      }
      const f=sstep(clamp((h.age-1.25)/.9,0,1));
      h.mesh.position.x=lerp(LANES[h.lane],LANES[h.finalLane],f);
      const blink=h.age<2.15&&Math.sin(h.age*15)>0;
      h.mesh.userData.signals.forEach((lamp,n)=>lamp.visible=blink&&n===(h.finalLane>h.lane?0:1));
      if(h.age>=2.15){h.moving=false;h.lane=h.finalLane;h.mesh.userData.signals.forEach(l=>l.visible=false);}
    }
    // Check the WHOLE overtaking overlap, not just a single crossing plane.
    const overlap=h.oldZ<2.8&&h.z> -2.8;
    const dx=Math.abs(game.x-h.mesh.position.x);
    if(overlap){
      h.closest=Math.min(h.closest,dx);
      if(dx<1.30&&!h.resolved&&game.invincible<=0&&jumpT<=0&&!window.__mochiGod){
        h.resolved=true;
        if(systems?.absorbHit()){burst(game.x,1.1,0,'#a8ffff',24);game.invincible=.7;}
        else if(race){raceCrash();}
        else {game.score=Math.floor(game.rawScore);game.best=Math.max(game.best,game.score);die();return;}
      }
    }
    if(h.z>2.8&&!h.passed) {
      h.passed=true;game.overtaken++;systems?.onDodge();funOnPass(h);
      if(!h.resolved&&game.invincible<=0&&h.closest>=1.30&&h.closest<2.3)bonus(25,'near');
      else {game.rawScore+=5;game.chain++;game.comboTimer=4;game.combo=Math.min(5,1+Math.floor(game.chain/5));}
    }
    if(h.z>18)recycleHazard(i);
  }
  for(let i=stars.length-1;i>=0;i--) {
    const s=stars[i],oldZ=s.z;s.z+=move;s.mesh.position.z=s.z;
    if(oldZ<.65&&s.z>-.65&&s.lane===li){bonus(10,'star',LANES[s.lane],PLAYER_Z);recycleStar(i);}
    else if(s.z>15)recycleStar(i);
  }
  collectibles?.update(dt,move,game.x);updateTurboPads(move);funTick(dt,move);
  if(race){raceTick(dt);if(race?.done)return;}
  game.score=Math.floor(game.rawScore);if(game.score>game.best)game.best=game.score;
}
function updateHUD() {
  $('score').textContent=game.score.toLocaleString('es-ES');$('best').textContent=game.best.toLocaleString('es-ES');
  $('speed').textContent=Math.round(game.worldSpeed/WORLD_SCALE*3.6)+' km/h';$('nearCount').textContent=String(game.near);$('passedCount').textContent=String(game.overtaken);
  $('combo').textContent='Combo ×'+game.combo;
  const ready=dashCooldown<=0;
  $('dashMeter').style.width=(100*(1-dashCooldown/DASH.cd))+'%';
  $('dashLabel').textContent=ready?'↑ IMPULSO LISTO':'RECARGA '+dashCooldown.toFixed(1)+' s';
  $('dashHud').dataset.ready=String(ready);
}
function visualUpdate(dt,moved=0) {
  const live=game.state==='running',menu=game.state==='menu'||game.state==='tutorial';
  const ambientSpeed=live?(dt>0?moved/dt:0):menu?5*WORLD_SCALE:0;
  world.update(dt,visualTime,ambientSpeed,game.distance,game.cheer);
  const pose=originalPose();player.userData.pose=pose;
  player.rotation.z=-pose.rot;player.rotation.y=Math.PI;player.scale.setScalar(1.38);
  player.position.set(game.x,.04,PLAYER_Z);
  player.userData.animate?.(visualTime,dt,game.speed);
  player.visible=game.invincible<=0||Math.sin(visualTime*30)<=.3;
  shadow.position.x=game.x;shadow.position.z=PLAYER_Z;
  const size=1-pose.hop*.25;shadow.scale.set(size*1.25,size*.52,1);shadowMat.opacity=.35-pose.hop*.10;
  const shake=live&&!reducedMotion?Math.min(.05,game.shake*.1)+clamp((game.worldSpeed/WORLD_SCALE-34)/30,0,1)*.045:0;
  camera.position.copy(cameraBase);camera.position.x+=Math.sin(visualTime*39)*shake;
  camera.position.y+=Math.cos(visualTime*32)*shake*.65;camFollow=lerp(camFollow,game.x,1-Math.exp(-dt*6));camera.position.x+=camFollow*.62;camera.lookAt(camFollow*.42,1.1,-24);
  const velocity=game.worldSpeed/WORLD_SCALE;
  const rush=live?clamp((velocity-24)/36,0,1):0;
  const targetFov=(W/H>.8?64:72)+rush*24;
  camera.fov=lerp(camera.fov,targetFov,1-Math.exp(-dt*3));camera.updateProjectionMatrix();
  cameraRoll=lerp(cameraRoll,live&&!reducedMotion?clamp(-mochi.vx*.034,-.13,.13):0,1-Math.exp(-dt*10));
  camera.rotation.z+=cameraRoll;funRender(dt);
  speedBlur.uniforms.strength.value=reducedMotion?0:rush*.022;
  speedBlur.enabled=qualityLevel>0&&live&&!reducedMotion;
  $('stage').style.setProperty('--rush',String(live?rush:0));
  const eventKind=systems?.event?.kind||null;
  if(eventKind!==lastSceneEvent){if(eventKind)world.event?.(eventKind,eventKind==='night'?1:.45);lastSceneEvent=eventKind;}
  collectibles?.updateRender(visualTime);
  for(const h of hazards)h.mesh.userData.animate?.(visualTime+h.phase,dt,h.driveSpeed);
  for(const s of stars){s.mesh.rotation.y=visualTime*1.35+s.phase;s.mesh.position.y=(s.big?1.8:1.25)+Math.sin(visualTime*3+s.phase)*.09;}
  if(gradePass){gradePass.uniforms.time.value=visualTime%10;gradePass.uniforms.px.value.set(1/W,1/H);}
  raceRender(dt);renderRoadGameplay();updateZoneDecor(dt,live?moved:0);updateEffects(dt);game.shake=Math.max(0,game.shake-dt*.65);
}
function updateAutoQuality(frameMs,dt) {
  frameAverage=lerp(frameAverage,Math.min(frameMs,100),.08);qualityCooldown+=Math.min(dt,.5);
  if(game.quality!=='auto'||renderedFrames<8||qualityCooldown<3)return;
  // R5: AUTO solo baja de calidad, y solo fuera de la carrera activa o tras un bajón sostenido.
  // Antes subía y bajaba cada ~35 s: cada cambio recompilaba shaders y reasignaba render targets
  // (un parón de ~1 s que se veía como si el mapa se reiniciara).
  if(frameAverage>26&&qualityLevel>0&&qualityCooldown>6&&autoDowngrades<2){applyQuality(qualityLevel-1);qualityCooldown=0;autoDowngrades++;}
}
function frame(now) {
  requestAnimationFrame(frame);if(contextLost)return;
  let dt=(now-lastTime)/1000;lastTime=now;
  if(document.hidden)return;
  const realDt=dt,controlDt=clamp(realDt,0,.25);
  // Copia literal de la cadencia original: recorte a .05 y consumo sin resto.
  if(dt>.05)dt=.05;if(dt<0)dt=0;
  const before=game.distance;
  if(game.state!=='pause') {
    visualTime+=dt;
    let rem=dt;while(rem>0) {
      const st=Math.min(rem,1/120);
      if(game.state==='running')fixedUpdate(st);
      updateOriginalMochi(st);rem-=st;
    }
  }
  if(game.state==='running'){Audio.update();$('gestureHint').hidden=game.elapsed>8;}
  if(game.state==='countdown') {
    game.count-=controlDt;const n=Math.ceil(game.count);
    if(n!==countdownLast&&n>0){$('countdown').textContent=String(n);Audio.play('count');countdownLast=n;}
    if(game.count<=0){setState('running');Audio.play('go');notify('¡A correr!');}
  }
  if(game.state==='ad') {
    game.adTime=Math.min(game.adLength,game.adTime+controlDt);
    $('adCountdown').textContent=game.adTime>=game.adLength?'Listo':String(Math.ceil(game.adLength-game.adTime));
    $('adProgress').style.width=(game.adTime/game.adLength*100)+'%';$('adContinueButton').disabled=game.adTime<game.adLength;
    if(game.adTime>=game.adLength)$('adContinueButton').textContent='¡Volver a correr!';
  }
  if(game.state==='menu'||game.state==='select') {originalMenus?.draw(visualTime);return;}
  visualUpdate(game.state==='pause'?0:dt,game.distance-before);hudTime+=dt;
  if(hudTime>.09){updateHUD();hudTime=0;}
  renderer.info.reset();
  if(qualityLevel===0)renderer.render(scene,camera);else composer.render();
  renderedFrames++;updateAutoQuality(realDt*1000,Math.max(0,realDt));
}

let ptr=null;
function resetGesture(){ptr=null;}
function moveLane(direction){applyOriginalLaneAction(direction<0?'left':'right');}
function onAction(a) {
  Audio.unlock();
  if(game.state==='menu'){if(a==='tap'||a==='start')startGame();return;}
  if(game.state==='gameover'){if(a==='tap'||a==='start'){resetRun();beginCountdown();}return;}
  if(game.state==='pause'){if(a==='start')beginCountdown('resume',2);return;}
  if(!['running','countdown'].includes(game.state))return;
  if(a==='left'||a==='right')applyOriginalLaneAction(a);
  else if(a==='up')tryDash();else if(a==='down')tryBrake();
  else if(a==='tap'||a==='start'){mochi.colPop=1;mochi.wobV+=2.5;Audio.play('click');}
}
function toggleSound(){Audio.unlock();game.sound=!game.sound;store.set('sound',game.sound?'1':'0');Audio.mute();updateSoundUI();Audio.play('click');}
function updateSoundUI() {
  for(const id of ['soundButton','soundHudButton']){$(id).setAttribute('aria-pressed',String(game.sound));$(id).setAttribute('aria-label',game.sound?'Silenciar sonido':'Activar sonido');$(id).classList.toggle('muted',!game.sound);}
}
function bindControls() {
  const actions={playButton:()=>startGame(false),startTutorialButton:finishTutorial,skipTutorialButton:backToMenu,
    tutorialButton:()=>{Audio.unlock();setState('tutorial');},pauseButton:pauseGame,resumeButton:()=>{Audio.unlock();beginCountdown('resume',2);},
    restartPauseButton:()=>{Audio.unlock();resetRun();beginCountdown();},restartButton:()=>{Audio.unlock();resetRun();beginCountdown();},
    menuPauseButton:backToMenu,menuButton:backToMenu,continueButton:startAd,adContinueButton:continueRun,soundButton:toggleSound,soundHudButton:toggleSound,
    qualityButton:()=>{game.quality=game.quality==='auto'?'high':game.quality==='high'?'low':'auto';store.set('quality',game.quality);applyQuality(game.quality==='low'?0:game.quality==='high'?2:1);qualityCooldown=0;},retryButton:()=>location.reload()};
  for(const [id,fn]of Object.entries(actions))$(id)?.addEventListener('click',fn);
  const cv=$('game');
  // Puntero original: conserva x0/y0, el umbral y cuatro veces el umbral al encadenar.
  cv.addEventListener('pointerdown',e=>{
    e.preventDefault();ptr={id:e.pointerId,x0:e.clientX,y0:e.clientY,x:e.clientX,t0:performance.now(),used:false,moved:0};
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
    if(!['running','countdown'].includes(game.state)){onAction('tap');if(ptr)ptr.used=true;return;}
  },{passive:false});
  cv.addEventListener('pointermove',e=>{
    if(!ptr||e.pointerId!==ptr.id||ptr.button)return;
    const dx=e.clientX-ptr.x,th=Math.max(26,Math.min(W,500)*.07);
    ptr.moved=Math.max(ptr.moved,Math.hypot(e.clientX-ptr.x0,e.clientY-ptr.y0));
    const need=ptr.swipes?th*4:th;
    const upY=ptr.y0-e.clientY,totX=Math.abs(e.clientX-ptr.x0);
    if(!ptr.used&&!ptr.up&&upY>Math.max(34,Math.min(W,500)*.08)&&totX<upY*.7&&performance.now()-ptr.t0<500){ptr.up=true;ptr.used=true;onAction('up');return;}
    if(!ptr.used&&!ptr.up&&-upY>Math.max(34,Math.min(W,500)*.08)&&totX< -upY*.7&&performance.now()-ptr.t0<500){ptr.up=true;ptr.used=true;onAction('down');return;}
    if(ptr.up)return;
    if(Math.abs(dx)>need&&Math.abs(dx)>Math.abs(e.clientY-ptr.y0)*.6){onAction(dx<0?'left':'right');ptr.used=true;ptr.x=e.clientX;ptr.swipes=(ptr.swipes||0)+1;}
  });
  const endPtr=e=>{
    if(!ptr||e.pointerId!==ptr.id)return;
    const dtp=performance.now()-ptr.t0;
    if(!ptr.used&&ptr.moved<22&&dtp<450)onAction('tap');ptr=null;
  };
  cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',()=>{ptr=null;});
  window.addEventListener('keydown',e=>{
    const k=e.key;
    if((k==='Escape'||k==='p'||k==='P')&&['running','countdown','pause'].includes(game.state)){game.state==='pause'?beginCountdown('resume',2):pauseGame();e.preventDefault();return;}
    if(k==='ArrowLeft'||k==='a'||k==='A')onAction('left');
    else if(k==='ArrowRight'||k==='d'||k==='D')onAction('right');
    else if(k==='ArrowUp'||k==='w'||k==='W')onAction(['running','countdown'].includes(game.state)?'up':'tap');
    else if(k==='ArrowDown'||k==='s'||k==='S'){if(['running','countdown'].includes(game.state))onAction('down');}
    else if(k===' '||k==='Enter')onAction('tap');else if(k==='m'||k==='M')toggleSound();
    else if(k==='1'||k==='2'||k==='3'){if(game.state==='running'){mochi.color=+k-1;mochi.colPop=1;mochi.wobV+=2.5;}}
    else return;e.preventDefault();
  });
  document.addEventListener('touchmove',e=>{if(e.target.closest('#shop,#missions'))return;e.preventDefault();},{passive:false});
  document.addEventListener('gesturestart',e=>e.preventDefault());document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseGame();store.set('best',game.best);}lastTime=performance.now();});
  window.addEventListener('blur',pauseGame);window.addEventListener('pagehide',()=>store.set('best',game.best));
}



// BOOT se sitúa al final del archivo, después de las fábricas 3D.

function applyCharacter(id) {
  if(!player)return;Models.setCharacter(player,id);player.scale.setScalar(1.1);
  if(renderer)applyQuality(qualityLevel);
}


// Movimiento del Mochi adjunto. Unidades lógicas: carriles -1, 0, +1.
// Los muelles, umbrales, impulsos, dificultad y envolventes conservan sus valores.
const mochi = {
  lane:0, x:0, vx:0, wob:0, wobV:0, colPop:0, color:0,
  hopPh:0, hop:0, earL:-.5, earR:.5, earLV:0, earRV:0,
  blinkT:2, blink:0, dead:false, deadT:0
};
let W=0, H=0, laneW=0, horizonY=0, baseY=0, dCur=0;
const D=6, FAR=62;
const diff = () => dCur;
const d1 = d => Math.min(d,1);
function diffTarget(s) {
  if (s < 1200) return 0.22 * s / 1200;
  if (s < 3000) return 0.22 + 0.28 * (s - 1200) / 1800;
  if (s < 10000) return 0.5 + 0.3 * (s - 3000) / 7000;
  if (s < 30000) return 0.8 + 0.2 * (s - 10000) / 20000;
  return 1 + Math.min(0.35, (s - 30000) / 100000);
}
const reactT = d => Math.max(0.4, lerp(0.95,0.44,d1(d))-.1*Math.max(0,d-1));
const actT = d => lerp(.32,.2,d1(d));
const minGapT = d => Math.max(.5,lerp(1.35,.6,d1(d))-.25*Math.max(0,d-1));
function proj(x,z) {
  const s=D/(D+z);
  return {x:W/2+x*laneW*s,y:horizonY+(baseY-horizonY)*s,s};
}

function updateOriginalMochi(dt) {
  const m = mochi;
  if (game.state === 'menu') m.lane = 0;
  // Copia literal del muelle y la deformación del original.
  const tx = m.lane;
  const k = 260, c = 2 * Math.sqrt(k) * 0.95; // snappy spring
  m.vx += ((tx - m.x) * k - m.vx * c) * dt; m.x += m.vx * dt;
  m.wobV += (-m.wob * 300 - m.wobV * 10) * dt; m.wob += m.wobV * dt;
  m.colPop = Math.max(0, m.colPop - dt * 5);
  if (!m.dead) {
    const hopRate = game.state === 'running' ? 7 + game.speed * 0.28 : 5.5;
    m.hopPh += dt * hopRate;
  }
  const prevHop=m.hop;
  m.hop=Math.abs(Math.sin(m.hopPh));
  const vy=(m.hop-prevHop)/Math.max(dt,1e-4);
  const earBase=game.state==='menu'?.55:.35;
  const tl=-earBase-clamp(vy*.04,-.6,.6)-clamp(m.vx*.06,-.5,.5);
  const tr=earBase+clamp(vy*.04,-.6,.6)-clamp(m.vx*.06,-.5,.5);
  m.earLV+=((tl-m.earL)*120-m.earLV*9)*dt;m.earL+=m.earLV*dt;
  m.earRV+=((tr-m.earR)*120-m.earRV*9)*dt;m.earR+=m.earRV*dt;
  m.blinkT-=dt;if(m.blinkT<0){m.blink=1;m.blinkT=1.8+Math.random()*2.2;}
  m.blink=Math.max(0,m.blink-dt*7);
  if(m.dead)m.deadT+=dt;
  game.previousX=game.x;game.x=m.x*LANE_SPACING;game.lane=m.lane;
}

const emitMotionBurst=(...args)=>burst(...args);
function applyOriginalLaneAction(a) {
  if(!['running','countdown'].includes(game.state))return;
  const Snd={swipe:()=>Audio.play('move')};
  const burst=(x,y,color,count)=>emitMotionBurst(mochi.x*LANE_SPACING,.13,PLAYER_Z,'#e0ffff',count);
  // Copia literal de la acción lateral, incluido el impulso contra los bordes.
  if (a === 'left' || a === 'right') {
    const nl = clamp(mochi.lane + (a === 'left' ? -1 : 1), -LANE_HALF, LANE_HALF);
    if (nl !== mochi.lane) {
      mochi.lane = nl; mochi.wobV -= 2.2; Snd.swipe();
      const p = proj(mochi.x, 0);
      burst(p.x, baseY - 4, [255, 255, 255], 5, { up: true, min: 40, max: 120, g: 300, rmin: 2, rmax: 4, life: 0.4, vx: a === 'left' ? 120 : -120 });
    } else { mochi.wobV += 1.5; mochi.vx += (a === 'left' ? -1 : 1) * 3; }
  }
}

const DASH={up:.12,hold:.65,down:.4,cd:2.4,margin:1.05};
const BRAKE={down:.12,hold:.6,up:.5,cd:.8,cancel:.15};
const dashAmp=d=>lerp(.44,.30,d1(d));
let dashT=-1,dashK=1,dashCap=1,dashChain=0,chainFx=0,lungePos=0;
let brakeT=-1,brakeCd=0,brakeK=1,dashCancelT=-1,dashCancelFrom=1;
const sstep=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const dashExtra=()=>Math.min(3,Math.max(0,dashChain-1))*.05;
function dashEnv(tt) {
  if(tt<0)return 0;
  if(tt<DASH.up)return sstep(tt/DASH.up);
  if(tt<DASH.up+DASH.hold)return 1;
  if(tt<DASH.up+DASH.hold+DASH.down)return 1-sstep((tt-DASH.up-DASH.hold)/DASH.down);
  return 0;
}
function brakeEnv(tt) {
  if(tt<0)return 0;
  if(tt<BRAKE.down)return sstep(tt/BRAKE.down);
  if(tt<BRAKE.down+BRAKE.hold)return 1;
  return 1-sstep((tt-BRAKE.down-BRAKE.hold)/BRAKE.up);
}
let dashCooldown=0;
function resetDash() {
  dashCooldown=0;plateTime=0;
  brakeT=-1;brakeCd=0;brakeK=1;dashCancelT=-1;dashT=-1;
  dashK=1;dashCap=1;dashChain=0;chainFx=0;lungePos=0;
}
function tryDash() {
  if(game.state!=='running'||mochi.dead||dashCooldown>0){if(game.state==='running')notify('Impulso recargando…');return false;}
  dashCooldown=DASH.cd;
  const active=dashT>=0;
  if(brakeT>=0)brakeT=Math.max(brakeT,BRAKE.down+BRAKE.hold);
  dashCancelT=-1;
  if(active){dashChain++;dashT=Math.min(dashT,DASH.up);chainFx=1;}
  else {dashChain=1;dashT=0;}
  mochi.wobV-=active?1.6:2.8;Audio.play('dash');return true;
}
function tryBrake() {
  if(game.state!=='running'||mochi.dead)return false;
  if(brakeT>=0||brakeCd>0){mochi.wobV+=.6;return false;}
  if(dashT>=0){dashCancelFrom=dashK;dashCancelT=0;dashT=-1;dashChain=0;}
  brakeT=0;mochi.wobV+=2.4;Audio.play('brake');return true;
}
function trafficRows() {
  const groups=new Map();
  for(const h of hazards) {
    if(h.z>=PLAYER_Z||h.passed)continue;
    let row=groups.get(h.wave);
    if(!row){row={z:-h.z/WORLD_SCALE,cells:[{t:'e'},{t:'e'},{t:'e'},{t:'e'},{t:'e'}],mover:false,needT:h.needT};groups.set(h.wave,row);}
    row.cells[h.finalLane]={t:'b'};row.mover=row.mover||h.moving;
  }
  return [...groups.values()].sort((a,b)=>a.z-b.z);
}
const DASH_FLOOR=a=>.34+.18*a;
function dashCapNow(d) {
  // El mismo límite de justicia del original, aplicado a filas de tráfico.
  let cap=1+dashAmp(d)+.15,prevZ=0,first=true;
  for(const r of trafficRows()) {
    if(prevZ>game.speed*(1+dashAmp(d)+.15)*1.6)break;
    if(r.mover)return 1;
    const empty=r.cells.flatMap((c,i)=>c.t==='e'?[i-LANE_HALF]:[]);
    const actions=Math.min(...empty.map(l=>Math.abs(l-(first?mochi.lane:r.previousSafe||0))));
    const need=first?(actions===0?0:.1+actions*Math.max(.18,actT(Math.min(d+.35,1.35)))):
      Math.max(DASH_FLOOR(1),.92*Math.min(r.needT,reactT(Math.min(d+.35,1.35))+actT(Math.min(d+.35,1.35))));
    if(need>0)cap=Math.min(cap,Math.max(1,(r.z-prevZ)/(game.speed*need*1.03)));
    prevZ=r.z;first=false;
  }
  return cap;
}
function updateDash(gdt,d) {
  dashCooldown=Math.max(0,dashCooldown-gdt);
  chainFx=Math.max(0,chainFx-gdt*1.5);
  const tg=dashT>=0&&dashT<DASH.up+DASH.hold?1:0;
  lungePos+=(tg-lungePos)*(1-Math.exp(-gdt*(tg>lungePos?14:4)));
  if(dashT>=0) {
    dashT+=gdt;
    if(dashT>DASH.up+DASH.hold+DASH.down){dashT=-1;dashChain=0;mochi.wobV+=3.2;}
  }
  dashCap=dashCapNow(d);
  let want=Math.min(1+(dashAmp(d)+dashExtra())*dashEnv(dashT),dashCap);
  if(dashCancelT>=0)want=Math.max(want,Math.min(dashCap,lerp(dashCancelFrom,1,sstep(dashCancelT/BRAKE.cancel))));
  dashK=want;
}
function updateBrake(gdt) {
  if(brakeCd>0)brakeCd=Math.max(0,brakeCd-gdt);
  if(brakeT>=0){brakeT+=gdt;if(brakeT>BRAKE.down+BRAKE.hold+BRAKE.up){brakeT=-1;brakeCd=BRAKE.cd;mochi.wobV-=1.5;}}
  brakeK=1-(1-(game.modeTurbo?1/1.3:.8))*brakeEnv(brakeT);
  if(dashCancelT>=0){dashCancelT+=gdt;if(dashCancelT>BRAKE.cancel)dashCancelT=-1;}
}
const dashVis=()=>game.state==='running'?Math.max(clamp((dashK-1)/.3,0,1),dashEnv(dashT)*.85)*(1-brakeEnv(brakeT)):0;
const dashLunge=()=>lungePos+.12*Math.sin(chainFx*Math.PI);
function originalPose() {
  const m=mochi,hop=m.hop,land=1-hop;
  let sy=1-Math.pow(land,6)*.14+hop*.05,sx=1/Math.sqrt(sy);
  sy*=1-m.wob;sx*=1+m.wob;
  const pop=Math.sin(m.colPop*Math.PI)*.12;sx*=1+pop;sy*=1+pop*.6;
  sx*=1+Math.min(.18,Math.abs(m.vx)*.025);sy*=1-Math.min(.1,Math.abs(m.vx)*.012);
  if(dashT>=0&&dashT<.06){const q=Math.sin(dashT/.06*Math.PI);sy*=1-.15*q;sx*=1+.12*q;}
  else{const de=dashVis();sy*=1+.25*de;sx*=1-.15*de;}
  const be=brakeEnv(brakeT);sy*=1-.14*be;sx*=1+.12*be;
  let rot=clamp(m.vx*.035,-.3,.3);
  if(m.dead){const e=Math.min(1,m.deadT*5);sy=lerp(1,.5,e)+Math.sin(m.deadT*25)*.05*Math.exp(-m.deadT*4);sx=lerp(1,1.45,e);rot=0;}
  return {sx,sy,rot,earL:m.earL-.55*dashVis()+.35*be,earR:m.earR+.55*dashVis()-.35*be,
    hop:m.dead?0:hop,foot:Math.sin(m.hopPh*(1+dashVis())),arm:Math.sin(m.hopPh)+dashVis()*1.2,
    run:game.state==='running',dead:m.dead,blink:m.blink};
}


// Character definitions for the procedural 3D wardrobe.
// Entries 0–14 preserve the source CH order, identities, descriptions and score unlocks.
// The original game allowed every character to choose rosa / menta / lila: its CH
// contains no character-specific color, rarity, coin price or gem price. The values
// below are the new wardrobe's theme colors and economy, not historical prices.
// Source premium characters 10–14 cost 0.99 EUR and did not unlock by score.
// originalUnlockScore preserves that fact; legacyPriceEUR preserves that price.
const CharacterCatalog = [
  { id: 'mochi', name: 'Mochi', desc: 'Una bolita de gelatina curiosa y saltarina. ¡La de siempre!', color: 0xff9cc8, accent: 0xffe0ee, rarity: 'Común', priceCoins: 0, priceGems: 0, unlockScore: 0, originalIndex: 0, originalUnlockScore: 0, form: 'bunny', ears: 'bunny', accessory: null, interior: 'burbujitas' },
  { id: 'tiovivo', name: 'Tiovivo', desc: 'Lleva una feria dentro y siempre está dando vueltas a las cosas.', color: 0xffc477, accent: 0xff8cb9, rarity: 'Raro', priceCoins: 240, priceGems: 0, unlockScore: 3000, originalIndex: 1, originalUnlockScore: 3000, form: 'fair_bear', ears: 'bear', accessory: 'flag', interior: 'un tiovivo con caballitos' },
  { id: 'atomo', name: 'Átomo', desc: 'Pequeñito pero lleno de energía. Sus electrones no se están quietos.', color: 0x8be7dd, accent: 0xc5a0ff, rarity: 'Raro', priceCoins: 360, priceGems: 0, unlockScore: 6000, originalIndex: 2, originalUnlockScore: 6000, form: 'atom_antenna', ears: 'antenna', accessory: null, interior: 'un átomo con electrones' },
  { id: 'cosmo', name: 'Cosmo', desc: 'Tiene el sistema solar en la barriga. Muy soñador.', color: 0xb9a2f7, accent: 0xffd485, rarity: 'Raro', priceCoins: 500, priceGems: 0, unlockScore: 10000, originalIndex: 3, originalUnlockScore: 10000, form: 'saturn', ears: 'none', accessory: 'ring', interior: 'el sistema solar' },
  { id: 'copito', name: 'Copito', desc: 'Una bola de nieve con patas. Le encantan el frío y los abrazos.', color: 0xc6eeff, accent: 0xb79cf8, rarity: 'Raro', priceCoins: 650, priceGems: 0, unlockScore: 15000, originalIndex: 4, originalUnlockScore: 15000, form: 'snow_beanie', ears: 'none', accessory: 'beanie', interior: 'una bola de nieve' },
  { id: 'burbuja', name: 'Burbuja', desc: 'Un acuario andante con un pececito muy cotilla.', color: 0x81dce9, accent: 0xffad79, rarity: 'Épico', priceCoins: 800, priceGems: 0, unlockScore: 22000, originalIndex: 5, originalUnlockScore: 22000, form: 'fish_fins', ears: 'fins', accessory: null, interior: 'un acuario con peces' },
  { id: 'lava', name: 'Lava', desc: 'Tranquilo y retro. Sus burbujas de lava suben y bajan sin prisa.', color: 0xff9b88, accent: 0xffdd90, rarity: 'Épico', priceCoins: 1000, priceGems: 0, unlockScore: 30000, originalIndex: 6, originalUnlockScore: 30000, form: 'lava_lamp', ears: 'none', accessory: 'lampcap', interior: 'una lámpara de lava' },
  { id: 'tictac', name: 'Tictac', desc: 'Puntual como nadie. Si pegas la oreja, hace tic-tac.', color: 0xe8c98b, accent: 0x92d8c7, rarity: 'Épico', priceCoins: 1250, priceGems: 0, unlockScore: 40000, originalIndex: 7, originalUnlockScore: 40000, form: 'clock_bear', ears: 'bear', accessory: 'key', interior: 'engranajes de reloj' },
  { id: 'trueno', name: 'Trueno', desc: 'Lleva una tormenta dentro… ¡pero es un trozo de pan!', color: 0xa9a3ec, accent: 0xffe28e, rarity: 'Épico', priceCoins: 1500, priceGems: 0, unlockScore: 55000, originalIndex: 8, originalUnlockScore: 55000, form: 'storm_horns', ears: 'horns', accessory: null, interior: 'una tormenta con rayos' },
  { id: 'disco', name: 'Disco', desc: 'La fiesta va con él. ¡Que no pare la música!', color: 0xe4a6eb, accent: 0x81e4dd, rarity: 'Épico', priceCoins: 1800, priceGems: 0, unlockScore: 75000, originalIndex: 9, originalUnlockScore: 75000, form: 'disco_cat', ears: 'cat', accessory: 'shades', interior: 'una bola de discoteca' },
  { id: 'nebula', name: 'Nébula', desc: 'Lleva una galaxia entera dentro… y un agujero negro que se lo traga todo.', color: 0xb88bff, accent: 0xffdd87, rarity: 'Legendario', priceCoins: 0, priceGems: 99, unlockScore: Infinity, originalIndex: 10, originalUnlockScore: Infinity, legacyPriceEUR: 0.99, premium: true, form: 'galaxy_crown', ears: 'none', accessory: 'crown', interior: 'una galaxia con agujero negro' },
  { id: 'volcan', name: 'Volcán', desc: 'Tiene un volcán en la tripa. Cuando se emociona, ¡erupción!', color: 0xff9d66, accent: 0xffdd78, rarity: 'Legendario', priceCoins: 0, priceGems: 99, unlockScore: Infinity, originalIndex: 11, originalUnlockScore: Infinity, legacyPriceEUR: 0.99, premium: true, form: 'volcano_horns', ears: 'horns3d', accessory: null, interior: 'un volcán en erupción' },
  { id: 'caramelo', name: 'Caramelo', desc: 'Una fábrica de golosinas con patas. Huele a fresa.', color: 0xffa5c5, accent: 0x98e9dc, rarity: 'Legendario', priceCoins: 0, priceGems: 99, unlockScore: Infinity, originalIndex: 12, originalUnlockScore: Infinity, legacyPriceEUR: 0.99, premium: true, form: 'candy_bear', ears: 'bear', accessory: 'lolli', interior: 'una fábrica de caramelos' },
  { id: 'aurora', name: 'Aurora', desc: 'Dentro es de noche: auroras boreales y una ballena que vuela.', color: 0x8be8d5, accent: 0xafa0fa, rarity: 'Legendario', priceCoins: 0, priceGems: 99, unlockScore: Infinity, originalIndex: 13, originalUnlockScore: Infinity, legacyPriceEUR: 0.99, premium: true, form: 'aurora_fins', ears: 'fins3d', accessory: null, interior: 'una aurora boreal con ballena' },
  { id: 'prisma', name: 'Prisma', desc: 'Hecho de cristal mágico. Convierte la luz en arcoíris.', color: 0xc9b0ff, accent: 0xa0edf2, rarity: 'Legendario', priceCoins: 0, priceGems: 99, unlockScore: Infinity, originalIndex: 14, originalUnlockScore: Infinity, legacyPriceEUR: 0.99, premium: true, form: 'crystal_cat', ears: 'cat', accessory: 'gem', interior: 'una geoda de cristales arcoíris' },
  { id: 'neko', name: 'Neko', desc: 'Orejas puntiagudas, cascabel y una curiosidad que no cabe en la pista.', color: 0xffd8bc, accent: 0xffa6bb, rarity: 'Común', priceCoins: 180, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'neko' },
  { id: 'panda', name: 'Panda', desc: 'Un oso de leche con orejitas oscuras y su ramita de bambú.', color: 0xf4f2e9, accent: 0x6b667f, rarity: 'Raro', priceCoins: 320, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'panda' },
  { id: 'ajolote', name: 'Ajolote', desc: 'Sus seis branquias de gelatina bailan mientras corre.', color: 0xffb3c7, accent: 0xf27f9f, rarity: 'Raro', priceCoins: 450, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'axolotl' },
  { id: 'kitsune', name: 'Kitsune', desc: 'Zorrito veloz con orejas grandes y una cola de crema.', color: 0xffbb83, accent: 0xffecd6, rarity: 'Raro', priceCoins: 500, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'fox' },
  { id: 'fantasmin', name: 'Fantasmín', desc: 'Flota entre caramelos con una sábana de gelatina ondulada.', color: 0xddeaff, accent: 0xb3a5f6, rarity: 'Raro', priceCoins: 600, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'ghost' },
  { id: 'solito', name: 'Solito', desc: 'Un pequeño sol con rayos dorados y sonrisa de domingo.', color: 0xffd67a, accent: 0xffaf75, rarity: 'Épico', priceCoins: 900, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'sun' },
  { id: 'lunita', name: 'Lunita', desc: 'Luce una media luna y estrellitas para iluminar el camino.', color: 0xc8bcf8, accent: 0xffe6a9, rarity: 'Épico', priceCoins: 950, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'moon' },
  { id: 'astro', name: 'Astro', desc: 'Casco espacial, dos antenitas y una mochila de cohete.', color: 0xb8e5f4, accent: 0xffc6a0, rarity: 'Épico', priceCoins: 1100, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'astro' },
  { id: 'bit', name: 'Bit', desc: 'Robot de esquinas redondas, tornillos de azúcar y corazón luminoso.', color: 0xa7d5df, accent: 0xf8acbf, rarity: 'Épico', priceCoins: 1200, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'robot' },
  { id: 'draculin', name: 'Draculín', desc: 'Dragón de menta con cuernitos, alitas y una cresta traviesa.', color: 0x91dcb4, accent: 0xe4b5ed, rarity: 'Legendario', priceCoins: 0, priceGems: 80, unlockScore: Infinity, originalIndex: null, premium: true, form: 'dragon' },
  { id: 'miel', name: 'Miel', desc: 'Abejita con rayas de cacao, antenas y alas transparentes.', color: 0xffda83, accent: 0xa38572, rarity: 'Raro', priceCoins: 550, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'bee' },
  { id: 'ranita', name: 'Ranita', desc: 'Ojitos saltones, pies anchos y una hojita sobre la cabeza.', color: 0x9edaa0, accent: 0xffc4bf, rarity: 'Común', priceCoins: 250, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'frog' },
  { id: 'unicornio', name: 'Unicornio', desc: 'Cuerno dorado y crin de arcoíris. La magia también sabe correr.', color: 0xf2d9fa, accent: 0x95e4e7, rarity: 'Legendario', priceCoins: 0, priceGems: 85, unlockScore: Infinity, originalIndex: null, premium: true, form: 'unicorn' },
  { id: 'setita', name: 'Setita', desc: 'Sombrero de seta con lunares y dos hojitas de bosque.', color: 0xffd9c8, accent: 0xef9da8, rarity: 'Raro', priceCoins: 480, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'mushroom' },
  { id: 'pingu', name: 'Pingü', desc: 'Aletas cortitas, pico naranja y barriga de nata.', color: 0x9bb3d6, accent: 0xffc38d, rarity: 'Raro', priceCoins: 620, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'penguin' },
  { id: 'pulpi', name: 'Pulpi', desc: 'Ocho tentáculos de gelatina y un gorrito de marinero.', color: 0xcaa5ed, accent: 0xf7cfeb, rarity: 'Épico', priceCoins: 1300, priceGems: 0, unlockScore: Infinity, originalIndex: null, form: 'octopus' },
  { id: 'angelito', name: 'Angelito', desc: 'Alitas de merengue y un aro dorado que nunca se cae.', color: 0xffecd6, accent: 0xffdc93, rarity: 'Legendario', priceCoins: 0, priceGems: 90, unlockScore: Infinity, originalIndex: null, premium: true, form: 'angel' }
];


/* Mochi Esquiva: personajes originales y tráfico de caramelo, sin assets externos. */
const Models = (() => {
  const geometries = new Map(), materials = new Map(), textures = new Set(), instances = new Set();
  const TAU = Math.PI * 2;
  const palette = [0xff65b6, 0x43dddf, 0x9974f5, 0xffc554, 0x70dfa9, 0xf58fd9];
  const geo = (key, build) => {
    if (!geometries.has(key)) geometries.set(key, build());
    return geometries.get(key);
  };
  function material(color, mode = 'candy') {
    const key = `${color}-${mode}`;
    if (!materials.has(key)) {
      let mat;
      if (mode === 'jelly') mat = new THREE.MeshPhysicalMaterial({ color, roughness: .12,
        metalness: .045, clearcoat: 1, clearcoatRoughness: .07, transmission: 0, thickness: .75 });
      else if (mode === 'steam') mat = new THREE.MeshBasicMaterial({color, transparent: true, opacity: .34, depthWrite: false});
      else if (mode === 'glow') mat = new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: .8, roughness: .24});
      else mat = new THREE.MeshStandardMaterial({color, roughness: mode === 'matte' ? .52 : .22,
        metalness: mode === 'metal' ? .38 : .055});
      materials.set(key, mat);
    }
    return materials.get(key);
  }
  const sphere = geo('sphere', () => new THREE.SphereGeometry(1, 12, 8));
  const smallSphere = geo('small-sphere', () => new THREE.SphereGeometry(1, 8, 6));
  const tinySphere = geo('tiny-sphere', () => new THREE.SphereGeometry(1, 6, 4));
  const boxGeometry = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
  function mesh(parent, geometry, color, mode = 'candy', shadow = false) {
    const m = new THREE.Mesh(geometry, material(color, mode));
    m.castShadow = shadow; parent.add(m); return m;
  }
  function ball(parent, color, x, y, z, sx, sy = sx, sz = sx, mode = 'candy', shadow = false) {
    const size=Math.max(sx,sy,sz);
    const m = mesh(parent, size <= .095 ? tinySphere : size <= .25 ? smallSphere : sphere, color, mode, shadow);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m;
  }
  function box(parent, color, x, y, z, sx, sy, sz) {
    const m = mesh(parent, boxGeometry, color); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m;
  }
  function rod(parent, color, radius, length, x, y, z, mode = 'candy', bottom = radius) {
    const g = geo(`rod-${radius}-${length}-${bottom}`, () => new THREE.CylinderGeometry(radius, bottom, length, 10));
    const m = mesh(parent, g, color, mode); m.position.set(x, y, z); return m;
  }
  function ring(parent, color, radius, tube, x, y, z) {
    const g = geo(`ring-${radius}-${tube}`, () => new THREE.TorusGeometry(radius, tube, radius < .23 ? 5 : 6, radius < .23 ? 16 : 24));
    const m = mesh(parent, g, color); m.position.set(x, y, z); return m;
  }
  function curveTube(key, points, radius = .017, segments = 12) {
    return geo(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(...p))), segments, radius, 4, false));
  }
  function happyFace(parent, x, y, z, scale = 1, closed = false) {
    const face = new THREE.Group(); face.position.set(x, y, z); face.scale.setScalar(scale); parent.add(face);
    for (const side of [-1, 1]) {
      if (closed) {
        const eye = mesh(face, curveTube('happy-eye', [[-.065, 0, 0], [0, .043, .006], [.065, 0, 0]], .016, 7), 0x36213f);
        eye.position.set(side * .16, .025, 0);
      } else {
        ball(face, 0x2f223a, side * .16, .025, 0, .045, .062, .03);
        ball(face, 0xffffff, side * .16 - .011, .05, .025, .013);
      }
      ball(face, 0xff5899, side * .245, -.06, 0, .079, .032, .012);
    }
    mesh(face, curveTube('smile', [[-.063, -.068, .01], [-.029, -.103, .015],
      [.029, -.103, .015], [.063, -.068, .01]], .014, 8), 0x442338);
    return face;
  }
  function vertexMaterial(mode = 'candy') {
    const key = `vertex-${mode}`;
    if (!materials.has(key)) {
      let mat;
      if (mode === 'steam') mat = new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, opacity: .32, depthWrite: false});
      else if (mode === 'glow') mat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .25,
        emissive: 0xffffff, emissiveIntensity: .22});
      else mat = new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .25, metalness: .045,
        clearcoat: .85, clearcoatRoughness: .13});
      materials.set(key, mat);
    }
    return materials.get(key);
  }
  function bake(group, key, mode = 'candy') {
    // Un solo dibujo por conjunto animado, incluso si contiene muchos colores.
    // Normales y colores lineales se conservan; no hacen falta addons ni texturas.
    const sources = []; group.traverse(m => { if (m.isMesh && !m.isInstancedMesh) sources.push(m); });
    const geometry = geo(`merged-${key}`, () => {
      group.updateMatrixWorld(true);
      const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert(), transform = new THREE.Matrix4();
      const parts = []; let count = 0;
      for (const source of sources) {
        const g = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry.clone();
        transform.multiplyMatrices(inverse, source.matrixWorld); g.applyMatrix4(transform);
        parts.push({g, color: source.material.color}); count += g.attributes.position.count;
      }
      const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), colors = new Float32Array(count * 3);
      let offset = 0;
      for (const {g, color} of parts) {
        positions.set(g.attributes.position.array, offset * 3); normals.set(g.attributes.normal.array, offset * 3);
        for (let i = 0; i < g.attributes.position.count; i++) {
          const j = (offset + i) * 3; colors[j] = color.r; colors[j + 1] = color.g; colors[j + 2] = color.b;
        }
        offset += g.attributes.position.count; g.dispose();
      }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      merged.computeBoundingSphere(); return merged;
    });
    const result = new THREE.Mesh(geometry, vertexMaterial(mode));
    result.castShadow = sources.some(m => m.castShadow); result.receiveShadow = false;
    for (const source of sources) source.parent.remove(source);
    group.add(result); group.userData.originalCalls = sources.length;
    return result;
  }
  function finish(root, kind) {
    let before = 0, after = 0;
    root.traverse(m => { before += m.userData.originalCalls || 0; if (m.isMesh) after++; });
    root.userData.kind = kind; root.userData.drawCalls = {before: Math.max(before, after), after}; return root;
  }
  function wheelSet(parent, halfWidth = .64, halfDepth = .33, radius = .18) {
    const template = new THREE.Group();
    ring(template, 0x594277, radius * .72, radius * .27, 0, 0, 0).rotation.y = Math.PI / 2;
    rod(template,0xffbbe3,radius*.56,radius*.65,0,0,0,'candy').rotation.z=Math.PI/2;
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3;
      const spoke=box(template,0xffedf4,0,Math.cos(a)*radius*.21,Math.sin(a)*radius*.21,radius*.73,radius*.37,radius*.075);
      spoke.rotation.x=a;
    }
    const source = bake(template, `wheel-${radius}`);
    const wheels = new THREE.InstancedMesh(source.geometry, source.material, 4);
    wheels.instanceMatrix.setUsage(THREE.DynamicDrawUsage); wheels.frustumCulled = false;
    parent.add(wheels); instances.add(wheels);
    const transform = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion();
    const axis = new THREE.Vector3(1, 0, 0), scale = new THREE.Vector3(1, 1, 1);
    const update = (phase) => {
      let index = 0; q.setFromAxisAngle(axis, phase);
      for (const x of [-halfWidth, halfWidth]) for (const z of [-halfDepth, halfDepth]) {
        pos.set(x, radius + .025, z); transform.compose(pos, q, scale); wheels.setMatrixAt(index++, transform);
      }
      wheels.instanceMatrix.needsUpdate = true;
    };
    update(0); return update;
  }
  function chassis(group, color, halfWidth = .70, halfDepth = .43) {
    // Carrocería de juguete: dos volúmenes, taloneras, parrilla, parachoques,
    // faros y luces traseras. Se funde con el modelo en un único dibujo.
    ball(group, color, 0, .35, 0, halfWidth, .22, halfDepth, 'candy', true);
    ball(group, 0xffedf3, 0, .30, 0, halfWidth*.96, .065, halfDepth*.99);
    ball(group, 0xffe7f3, 0, .31, halfDepth*.94, halfWidth*.82, .065, .08);
    ball(group, color, 0, .49, halfDepth*.20, halfWidth*.88, .075, halfDepth*.73);
    box(group, 0x67476c, 0, .35, halfDepth+.025, .27, .075, .02);
    for(let i=0;i<4;i++)box(group,0xffc7d9,(i-1.5)*.061,.35,halfDepth+.039,.012,.041,.008);
    box(group,0xfff4d9,0,.255,halfDepth+.055,.16,.054,.012);
    for(let i=0;i<3;i++)box(group,0x7f5379,(i-1)*.029,.255,halfDepth+.064,.016,.012,.006);
    for (const side of [-1, 1]) {
      ball(group, 0xfff2af, side*halfWidth*.73, .42, halfDepth*.88, .086, .068, .054);
      ring(group,0xffebd4,.069,.011,side*halfWidth*.73,.42,halfDepth+.027).scale.y=.76;
      ball(group,0xfff8ef,side*halfWidth*.73-.022,.441,halfDepth+.040,.024,.015,.014);
      ball(group, 0xff80a4, side*halfWidth*.65, .33, -halfDepth*.95, .070, .047, .024);
      ball(group,0xffc9e9,side*halfWidth*.91,.33,0,.045,.035,halfDepth*.61);
      box(group,0xffe1ef,side*halfWidth*.87,.53,-.09,.025,.015,.09);
    }
  }
  const characters = typeof CharacterCatalog === 'undefined' ? [{id:'mochi',name:'Mochi',color:0xff9cc8,accent:0xffe0ee,form:'bunny',ears:'bunny',originalIndex:0}] : CharacterCatalog;
  const originalProfiles = [[1,1],[1.08,.92],[.96,1.04],[1.02,1],[1.04,.97],[1.04,.98],[.9,1.12],[1,1],[1,1.02],[1.02,1],[1.02,1.02],[1.06,.98],[1.04,.98],[1,1.04],[.98,1.06]];
  function characterInfo(id) {
    return typeof id === 'number' ? characters[Math.max(0,Math.min(characters.length-1,Math.floor(id)))] : characters.find(c=>c.id===id)||characters[0];
  }
  function cone(parent,color,x,y,z,radius,height,mode='candy',sides=8) {
    const m=mesh(parent,geo(`cone-${sides}`,()=>new THREE.ConeGeometry(1,1,sides)),color,mode);
    m.position.set(x,y,z);m.scale.set(radius,height,radius);return m;
  }
  function diamond(parent,color,x,y,z,radius=.10) {
    const m=mesh(parent,geo('diamond',()=>new THREE.OctahedronGeometry(1)),color);
    m.position.set(x,y,z);m.scale.set(radius,radius*1.4,radius);return m;
  }
  function heart(parent,color,x,y,z,radius=.1) {
    const shape=geo('heart-3d',()=>{
      const s=new THREE.Shape();s.moveTo(0,.15);s.bezierCurveTo(-.65,.9,-1,.1,0,-.7);s.bezierCurveTo(1,.1,.65,.9,0,.15);
      const g=new THREE.ExtrudeGeometry(s,{depth:.23,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:1,steps:1,curveSegments:5});g.center();return g;
    });const m=mesh(parent,shape,color);m.position.set(x,y,z);m.scale.setScalar(radius);return m;
  }
  function miniature(parent,index,accent) {
    // Las escenas de los quince Mochis originales conservan su identidad dentro
    // de una pequeña ventana en la barriga. Son geometría 3D, no iconos pintados.
    const g=new THREE.Group();g.position.set(0,.65,.495);g.scale.setScalar(.63);parent.add(g);
    const dark=[0xffcce7,0x77527f,0x334d73,0x504476,0xb7dceb,0x52a6b9,0x824a8d,0x997357,0x5c6084,0x80578e,0x4f3674,0xc67865,0x966190,0x407c8c,0x9980b7][index];
    ball(g,dark,0,0,-.038,.42,.28,.045);
    const rim=ring(g,accent,.34,.021,0,0,-.018);rim.scale.y=.70;
    const tiny=(c,x,y,z,r,sy=r,sz=r)=>ball(g,c,x,y,z,r,sy,sz);
    switch(index) {
      case 0:
        for(let i=0;i<6;i++) {const a=i*2.4;tiny(0xffeff8,Math.sin(a)*.27,Math.cos(a)*.14,.022,.031+i%2*.012);}
        heart(g,0xffb0d8,0,0,.012,.14);break;
      case 1:
        rod(g,0xffdf84,.24,.03,0,-.16,.015);rod(g,0xffdf84,.011,.28,0,-.015,.018);
        cone(g,0xff9eba,0,.145,.015,.28,.10);for(let i=0;i<3;i++){const x=(i-1)*.16;rod(g,0xffedaa,.008,.22,x,-.015,.032);tiny(0xffefdb,x,-.075,.062,.05,.025,.017);tiny(0xffeddb,x+.032,-.038,.062,.022,.038,.017);}
        break;
      case 2:
        tiny(0xffd36d,0,0,.035,.09);for(let i=0;i<3;i++){const o=ring(g,i%2?0xbfa5ff:0x8ef4ee,.23,.01,0,0,.024);o.rotation.z=i*Math.PI/3;o.scale.y=.36;tiny(palette[i],Math.cos(i*2.2)*.23,Math.sin(i*2.2)*.12,.06,.028);}
        break;
      case 3:
        tiny(0xffd272,0,0,.03,.08);for(let i=0;i<4;i++){const a=i*1.9;const x=Math.cos(a)*(.13+i*.05),y=Math.sin(a)*(.06+i*.026);tiny(palette[i],x,y,.045,.036+i*.003);if(i===2){const r=ring(g,0xffe5ba,.061,.008,x,y,.055);r.scale.y=.35;}}
        break;
      case 4:
        tiny(0xffffff,0,-.17,.025,.34,.055,.028);cone(g,0x78c59b,-.14,-.025,.018,.08,.20);tiny(0xffffff,.13,-.08,.05,.075);tiny(0xffffff,.13,.015,.05,.055);cone(g,0xffb575,.18,.017,.103,.018,.06).rotation.z=-Math.PI/2;break;
      case 5:
        tiny(0xffdf9f,0,-.17,.022,.33,.06,.022);for(let i=0;i<3;i++)rod(g,0x73cf9a,.013,.17+i*.024,(i-1)*.21,-.05,.019).rotation.z=(i-1)*.17;
        tiny(0xffb477,-.03,.025,.058,.11,.062,.026);cone(g,0xffbf78,-.14,.025,.051,.052,.07).rotation.z=Math.PI/2;tiny(0x263143,.035,.042,.089,.013);for(let i=0;i<4;i++)tiny(0xd5f5f3,.17+Math.sin(i)*.02,-.1+i*.07,.04,.013);break;
      case 6:
        for(let i=0;i<5;i++)tiny(i%2?0xffa3bc:0xffcd74,Math.sin(i*3)*.2,Math.cos(i*1.8)*.14,.04,.048,.065,.024);
        break;
      case 7:
        for(let i=0;i<3;i++){const x=(i-1)*.18,y=i%2?.07:-.04,r=.09-i*.012;ring(g,i===1?0xffdf8e:0xf1deb7,r,.024,x,y,.045);for(let k=0;k<7;k++)box(g,0xffd88b,x+Math.sin(k*TAU/7)*r,y+Math.cos(k*TAU/7)*r,.035,.034,.034,.025);}
        rod(g,0xffe7c5,.008,.12,0,-.12,.05);tiny(0xffd58b,0,-.18,.05,.036);break;
      case 8:
        tiny(0xa6a9d5,0,.1,.03,.16,.065,.026);tiny(0xbcb5e0,-.12,.07,.027,.08);tiny(0xbcb5e0,.13,.07,.027,.07);
        mesh(g,curveTube('belly-lightning',[[.04,.04,.08],[-.04,-.025,.08],[.03,-.04,.08],[-.055,-.17,.08]],.016,4),0xffdf83);for(let i=0;i<4;i++)rod(g,0xa1d7ee,.007,.055,(i-1.5)*.11,-.10,.045).rotation.z=-.1;break;
      case 9:
        const disco=mesh(g,geo('disco-mini',()=>new THREE.IcosahedronGeometry(.125,1)),0xeae8ff,'metal');disco.position.set(0,.015,.05);
        for(let i=0;i<8;i++)tiny(palette[i%6],Math.sin(i*2.4)*.24,Math.cos(i*2.4)*.13,.05,.018);rod(g,0xffe0fb,.006,.12,0,.17,.026);break;
      case 10:
        tiny(0x292143,0,0,.05,.065);for(let i=0;i<15;i++){const a=i*.9,r=.055+i*.013;tiny(palette[i%6],Math.cos(a)*r,Math.sin(a)*r*.64,.058,.011+i%3*.003);}break;
      case 11:
        cone(g,0xa35d88,0,-.045,.01,.14,.20);ring(g,0xffab72,.060,.013,0,.062,.015).rotation.x=Math.PI/2;
        for(let i=0;i<5;i++)tiny(i%2?0xffd575:0xffa17c,Math.sin(i*3)*.08,.08+i*.025,.027,.021);break;
      case 12:
        box(g,0xffb0d6,0,-.065,.022,.27,.16,.045);cone(g,0xf6d195,0,.045,.03,.20,.08).rotation.x=Math.PI/2;
        for(const s of [-1,1]){rod(g,0xffe8af,.012,.21,s*.20,-.03,.02);tiny(s<0?0x96e9d7:0xf39fd7,s*.20,.10,.025,.068,.068,.027);ring(g,0xffffff,.043,.007,s*.20,.10,.054);}break;
      case 13:
        for(let i=0;i<3;i++) mesh(g,curveTube('belly-aurora-'+i,[[-.27,-.03+i*.065,.027],[-.11,.065+i*.06,.026],[.10,.005+i*.06,.026],[.26,.06+i*.06,.027]],.021,8),palette[(i+1)%6]);
        tiny(0xb0e5ed,.01,-.065,.069,.11,.045,.025);cone(g,0xa8e8de,-.12,-.053,.047,.04,.07).rotation.z=Math.PI/2;break;
      case 14:
        for(let i=0;i<6;i++)diamond(g,palette[i%6],(i-2.5)*.078,-.08+Math.sin(i)*.027,.055,.041+i%2*.013);break;
    }
    bake(g,`hero-belly-${index}`);return g;
  }
  function mochi(id=0) {
    const info=characterInfo(id),form=info.form||'bunny',color=info.color,accent=info.accent;
    const root=new THREE.Group(),body=new THREE.Group();root.add(body);
    root.name='Mochi-'+info.id;body.name='cuerpo';
    const wf=info.originalIndex==null?1:originalProfiles[info.originalIndex][0],hf=info.originalIndex==null?1:originalProfiles[info.originalIndex][1];
    const jelly=ball(body,color,0,.83,0,.55*wf,.54*hf,.47,'jelly',true);jelly.name='gelatina';
    jelly.geometry=geo('hero-main',()=>new THREE.SphereGeometry(1,20,12));
    if(form==='robot'){
      jelly.geometry=geo('hero-robot',()=>{const g=new THREE.SphereGeometry(1,16,10),p=g.attributes.position;
        for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1/Math.max(Math.abs(x),Math.abs(y),Math.abs(z),.001);p.setXYZ(i,x*(.30+.70*k),y*(.30+.70*k),z*(.30+.70*k));}g.computeVertexNormals();return g;});
      jelly.scale.set(.46,.45,.41);
    }
    if(form==='ghost')jelly.scale.set(.53,.62,.45);
    if(form==='penguin')jelly.scale.set(.47,.59,.44);
    if(form==='mushroom')jelly.scale.set(.45,.50,.41);
    if(form==='sun')jelly.scale.set(.51,.51,.43);
    const features=new THREE.Group();features.name='carita-y-marcas';body.add(features);
    const hasScene=info.originalIndex!=null;
    if(!hasScene){ball(features,form==='penguin'?0xfff1df:accent,0,.65,.418,.31,.28,.056);}
    if(form==='panda'){
      for(const s of [-1,1])ball(features,accent,s*.16,1.06,.415,.10,.13,.043).rotation.z=s*.35;
    }
    if(form==='bee')for(let i=0;i<3;i++){
      const stripe=ring(features,accent,.46-i*.017,.04,0,.60+i*.15,0);stripe.rotation.x=Math.PI/2;stripe.scale.z=.77;
    }
    if(form==='fox'||form==='neko')for(const s of [-1,1]){
      for(let j=0;j<2;j++){const whisker=rod(features,0x805b65,.008,.15,s*.35,.99-j*.06,.454);whisker.rotation.z=s*(1.5+j*.16);}
    }
    if(form==='penguin')cone(features,0xffc37b,0,.997,.49,.10,.10).rotation.x=Math.PI/2;
    const face=happyFace(features,0,hasScene?1.06:1.02,.442,1.02,form!=='robot'&&form!=='panda');
    if(form==='robot')box(features,0xf8b5c8,0,-.13,.032,.11,.042,.012);
    else{ball(face,0x783a56,0,-.117,.025,.031,.030,.012);ball(face,0xffb9ca,0,-.135,.036,.019,.008,.009);}
    if(form==='frog')for(const s of [-1,1]){
      ball(features,color,s*.235,1.26,.06,.16,.18,.14);ball(features,0xfff6ed,s*.235,1.30,.19,.090,.10,.018);ball(features,0x54404d,s*.235,1.30,.206,.035,.05,.014);
    }
    if(form==='ghost')for(let i=0;i<5;i++)ball(features,color,(i-2)*.16,.38,.02,.12,.15,.37);
    if(form==='robot'){
      heart(features,0xf8b5c8,0,.68,.452,.12);for(const s of [-1,1])box(features,accent,s*.43,.91,0,.09,.17,.17);
      for(let i=0;i<3;i++)box(features,0x527383,(i-1)*.07,.52,.414,.037,.018,.012);
    }
    if(form==='octopus')for(let i=0;i<6;i++){
      const a=i/6*TAU,leg=ball(features,color,Math.cos(a)*.38,.32,Math.sin(a)*.25,.16,.14,.22);leg.rotation.y=a;
      ball(features,accent,Math.cos(a)*.43,.30,Math.sin(a)*.27+.08,.045,.025,.035);
    }
    ball(features,0xfff9fc,-.28,1.16,.395,.031,.065,.009).rotation.z=-.35;
    bake(features,'hero-features-'+info.id);
    const diorama=hasScene?miniature(body,info.originalIndex,accent):null;
    const ears=[],arms=[],feet=[],styleParts=[];
    const earType=info.ears||({neko:'cat',panda:'bear',axolotl:'gills',fox:'fox',astro:'antenna',dragon:'horns3d',bee:'antenna',unicorn:'unicorn',penguin:'none',octopus:'none',angel:'none'}[form]||'none');
    for(const s of [-1,1]){
      if(earType!=='none'){
        const ear=new THREE.Group();ear.position.set(s*.235,1.21,-.01);ear.name='oreja-'+s;body.add(ear);ears.push(ear);
        if(earType==='bunny'){
          ball(ear,color,0,.23,0,.105,.38,.10,'jelly');ball(ear,accent,0,.245,.079,.05,.285,.025);
        }else if(earType==='cat'||earType==='fox'||earType==='unicorn'){
          cone(ear,color,0,.16,0,.135,earType==='fox'?.37:.25).rotation.z=-s*.18;
          cone(ear,accent,0,.165,.07,.075,.18).scale.z=.035;
        }else if(earType==='bear'){
          ball(ear,form==='panda'?accent:color,s*.01,.065,0,.14,.15,.10);ball(ear,form==='panda'?0xad9fb6:accent,s*.01,.065,.075,.069,.075,.022);
        }else if(earType==='antenna'){
          const antenna=rod(ear,accent,.016,.26,0,.14,0);antenna.rotation.z=s*-.28;ball(ear,form==='bee'?accent:0xffdfa0,s*.033,.277,0,.053);
        }else if(earType==='fins'||earType==='fins3d'){
          for(let i=0;i<3;i++){const fin=ball(ear,i%2?accent:color,s*(.035+i*.025),.06+i*.07,-.02,.13,.047,.028);fin.rotation.z=s*(.5+i*.3);}
        }else if(earType==='gills'){
          ear.position.set(s*.41,.93,0);for(let i=0;i<3;i++){const gill=rod(ear,accent,.025,.20,s*.10,(i-1)*.095,0);gill.rotation.z=s*(1.1+(i-1)*.4);ball(ear,0xffd8df,s*(.17+Math.sin(i)*.025),(i-1)*.13,0,.045,.055,.04);}
        }else{
          cone(ear,form==='dragon'?0xffefb2:accent,0,.12,0,.07,.30).rotation.z=s*-.35;
          if(earType==='horns3d')ring(ear,color,.066,.011,0,.035,0).rotation.x=Math.PI/2;
        }
        bake(ear,'hero-ear-'+info.id+'-'+s);styleParts.push(ear);
      }
      const arm=new THREE.Group();arm.position.set(s*.47,.77,0);arm.name='bracito-'+s;body.add(arm);arms.push(arm);
      ball(arm,form==='penguin'?color:color,0,-.13,.055,form==='penguin'?.10:.10,form==='penguin'?.25:.19,.11);
      if(form==='robot')ball(arm,accent,0,-.28,.04,.105,.085,.09);
      bake(arm,'hero-arm-'+info.id+'-'+s);
      const foot=new THREE.Group();foot.position.set(s*.23,.16,.02);root.add(foot);feet.push(foot);foot.name='patita-'+s;
      ball(foot,form==='penguin'?0xffc17d:accent,0,0,.08,form==='frog'?.21:.16,.11,.22,'jelly');
      if(form==='frog')for(let j=0;j<3;j++)ball(foot,color,(j-1)*.087,0,.23,.06,.053,.08);
      bake(foot,'hero-foot-'+info.id+'-'+s);
    }
    const accessories=new THREE.Group();accessories.name='accesorios-'+form;body.add(accessories);styleParts.push(accessories);
    const acc=info.accessory;
    if(acc==='flag'){
      rod(accessories,0xfff0c1,.013,.36,.17,1.42,0);const flag=box(accessories,accent,.25,1.56,0,.16,.10,.023);flag.rotation.z=-.10;
    }
    if(acc==='ring'){
      const r=ring(accessories,accent,.58,.035,0,.93,0);r.rotation.x=1.22;r.rotation.z=.2;r.scale.y=.7;
    }
    if(acc==='beanie'){
      ball(accessories,accent,0,1.30,0,.34,.13,.30);ring(accessories,0xe8e3ff,.32,.025,0,1.27,0).rotation.x=Math.PI/2;ball(accessories,0xffedf7,0,1.47,0,.09);
    }
    if(acc==='lampcap'){
      rod(accessories,0xddbca1,.22,.08,0,1.45,0,'metal',.29);rod(accessories,0xe9d4b7,.30,.08,0,.34,0,'metal');
    }
    if(acc==='key'){
      rod(accessories,accent,.03,.24,0,.92,-.48).rotation.x=Math.PI/2;
      for(const s of [-1,1])ring(accessories,0xffd578,.085,.022,s*.085,.92,-.59);
    }
    if(acc==='shades'){
      for(const s of [-1,1]){box(accessories,0x634166,s*.16,1.075,.487,.19,.095,.04);box(accessories,0xb9edeb,s*.16-.03,1.095,.512,.035,.012,.01).rotation.z=.35;}
      box(accessories,0xffd1e1,0,1.08,.487,.11,.02,.031);
    }
    if(acc==='crown'){
      ring(accessories,accent,.25,.031,0,1.32,0).rotation.x=Math.PI/2;
      for(let i=0;i<5;i++){const a=i*TAU/5;cone(accessories,accent,Math.sin(a)*.23,1.44,Math.cos(a)*.19,.055,.20);diamond(accessories,palette[i%6],Math.sin(a)*.23,1.55,Math.cos(a)*.19,.033);}
    }
    if(acc==='lolli'){
      rod(accessories,0xfff2e3,.016,.37,.44,.82,.09).rotation.z=-.25;
      ball(accessories,accent,.50,1.03,.09,.12,.12,.032);ring(accessories,0xfffaea,.075,.015,.50,1.03,.125);
    }
    if(acc==='gem')diamond(accessories,0xc2f9f0,0,1.41,.08,.115);
    if(form==='neko'){
      ring(accessories,0xef98aa,.34,.03,0,.53,0).rotation.x=Math.PI/2;ball(accessories,0xffdc9b,0,.54,.46,.065);rod(accessories,0xaf835e,.006,.025,0,.53,.524).rotation.z=Math.PI/2;
      const tail=mesh(accessories,curveTube('neko-tail',[[0,.45,-.34],[.29,.42,-.51],[.45,.58,-.52],[.38,.76,-.5]],.065,10),color);styleParts.push(tail);
    }
    if(form==='panda'){
      rod(accessories,0x8dbb8e,.023,.34,.40,.68,.13).rotation.z=-.25;
      for(let i=0;i<2;i++)ball(accessories,0x96d9a4,.42+i*.025,.79+i*.075,.14,.075,.028,.016).rotation.z=.45;
    }
    if(form==='fox'){
      const tail=ball(accessories,color,.12,.50,-.50,.19,.33,.20);tail.rotation.z=-.75;
      ball(accessories,accent,.27,.72,-.57,.125,.13,.15);ball(accessories,accent,0,.9,.403,.21,.13,.06);
    }
    if(form==='sun')for(let i=0;i<9;i++){
      const a=i/9*TAU,r=.58;const ray=cone(accessories,accent,Math.sin(a)*r,.86+Math.cos(a)*r,-.055,.065,.18);ray.rotation.z=-a;
    }
    if(form==='moon'){
      const crescent=geo('hero-crescent',()=>{const s=new THREE.Shape();s.absarc(0,0,.2,.65,TAU-.65,false);s.bezierCurveTo(.01,-.13,-.04,.10,.16,.13);return new THREE.ExtrudeGeometry(s,{depth:.045,bevelEnabled:false,curveSegments:8});});
      const crescentMesh=mesh(accessories,crescent,accent);crescentMesh.position.set(-.13,1.4,-.03);crescentMesh.rotation.z=-.35;
      for(let i=0;i<3;i++)diamond(accessories,0xffefd0,(i-1)*.22,.65+i*.08,.42,.045);
    }
    if(form==='astro'){
      const frame=ring(accessories,0xf4eeee,.475,.03,0,.96,.1);frame.scale.y=.82;
      ring(accessories,0x7899b9,.33,.047,0,.48,0).rotation.x=Math.PI/2;
      box(accessories,accent,0,.81,-.42,.40,.34,.16);
      for(const s of [-1,1]){rod(accessories,0xffdfb5,.06,.20,s*.23,.67,-.49);cone(accessories,0xffaf95,s*.23,.51,-.49,.047,.12).rotation.z=Math.PI;}
    }
    if(form==='robot'){
      rod(accessories,0x67879b,.018,.21,0,1.37,0);ball(accessories,accent,0,1.48,0,.045);for(const s of [-1,1])box(accessories,0x607d90,s*.40,.67,.09,.036,.036,.04);
    }
    if(form==='dragon'){
      for(let i=0;i<4;i++)cone(accessories,accent,0,.56+i*.15,-.40,.06,.12).rotation.x=-.45;
      for(const s of [-1,1]){const wing=ball(accessories,accent,s*.43,.93,-.29,.20,.26,.025);wing.rotation.z=-s*.5;styleParts.push(wing);}
      ball(accessories,color,0,.45,-.46,.10,.14,.26);
    }
    if(form==='bee'||form==='angel'){
      for(const s of [-1,1]){const wing=ball(accessories,form==='angel'?0xfffaf1:0xc9eef4,s*.41,.96,-.22,.23,.29,.039);wing.rotation.z=-s*.45;}
      if(form==='angel')ring(accessories,accent,.31,.026,0,1.58,0).rotation.x=Math.PI/2;
      else cone(accessories,accent,0,.44,-.40,.07,.16).rotation.x=-.7;
    }
    if(form==='frog')ball(accessories,0x6bae7a,.02,1.36,-.045,.13,.025,.075).rotation.z=.2;
    if(form==='unicorn'){
      cone(accessories,0xffdca6,0,1.48,.06,.075,.34).rotation.x=.1;
      for(let i=0;i<6;i++)ball(accessories,palette[i],Math.sin(i*.6)*.05,1.26-i*.13,-.43,.075,.085,.055);
      for(let i=0;i<3;i++)ball(accessories,palette[i+1],(i-1)*.04,.48,-.48,.07,.10,.15);
    }
    if(form==='mushroom'){
      const cap=ball(accessories,accent,0,1.32,0,.58,.24,.48);
      ring(accessories,0xffeee2,.49,.04,0,1.26,0).rotation.x=Math.PI/2;
      for(let i=0;i<6;i++){const a=i*2.3;ball(accessories,0xffeee8,Math.sin(a)*.39,1.45+Math.cos(a)*.025,Math.cos(a)*.27,.059,.016,.045);}
    }
    if(form==='penguin'){
      ball(accessories,accent,0,.44,.07,.27,.04,.25);box(accessories,accent,.22,.33,.05,.08,.20,.03).rotation.z=.25;
    }
    if(form==='octopus'){
      rod(accessories,0xfff4e6,.25,.08,0,1.36,0);ball(accessories,0xfff4e6,0,1.42,0,.20,.09,.19);box(accessories,0x8c91bb,0,1.35,.236,.08,.065,.012);
    }
    if(accessories.children.length)bake(accessories,'hero-accessories-'+info.id);
    else body.remove(accessories);
    const legs=new THREE.InstancedMesh(geo('hero-legs',()=>new THREE.CapsuleGeometry(.065,.25,3,8)),material(color,'jelly'),2);
    legs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);legs.frustumCulled=false;root.add(legs);instances.add(legs);
    const legTop=new THREE.Vector3(),legBottom=new THREE.Vector3(),direction=new THREE.Vector3(),center=new THREE.Vector3();
    const legScale=new THREE.Vector3(1,1,1),up=new THREE.Vector3(0,1,0),quaternion=new THREE.Quaternion(),matrix=new THREE.Matrix4();
    const updateLegs=()=>{
      body.updateMatrix();feet.forEach((foot,i)=>{
        foot.updateMatrix();legTop.set((i?1:-1)*.23,.39,.012).applyMatrix4(body.matrix);legBottom.set(0,.035,.08).applyMatrix4(foot.matrix);
        direction.subVectors(legTop,legBottom);const length=Math.max(.015,direction.length());direction.divideScalar(length);
        quaternion.setFromUnitVectors(up,direction);center.addVectors(legTop,legBottom).multiplyScalar(.5);legScale.y=length/.38;
        matrix.compose(center,quaternion,legScale);legs.setMatrixAt(i,matrix);
      });legs.instanceMatrix.needsUpdate=true;
    };
    Object.assign(root.userData,{characterId:info.id,characterIndex:characters.indexOf(info),body,jelly,ears,arms,feet,legs,styleParts,diorama,form,baseWidth:1.2});
    let phase=0;
    root.userData.animate=(t,dt,speed=12.5)=>{
      const pose=root.userData.pose;
      if(!pose)phase+=Math.max(0,dt)*(7+Math.max(0,speed)*.28);
      const hop=pose?pose.hop:Math.abs(Math.sin(phase)),footCycle=pose?pose.foot:Math.sin(phase),armCycle=pose?pose.arm:Math.sin(phase);
      body.position.y=.035+hop*.21;body.scale.set(pose?pose.sx:1.045-hop*.06,pose?pose.sy:.93+hop*.12,1.02-hop*.035);
      body.rotation.x=-.07-hop*.035;body.rotation.z=pose?0:Math.sin(phase)*.028;
      feet.forEach((foot,i)=>{const s=footCycle*(i?-1:1);foot.position.y=.145+Math.max(0,s)*.185;foot.position.z=.035+s*.21;foot.rotation.x=-.15+s*.64;});
      arms.forEach((arm,i)=>{arm.rotation.x=armCycle*(i?1:-1)*.60;arm.rotation.z=(i?-1:1)*.22;});
      ears.forEach((ear,i)=>{const side=i?1:-1;ear.rotation.z=pose?-(i?pose.earR:pose.earL):side*(.22+hop*.10);ear.rotation.x=-.17+(pose?armCycle:Math.sin(phase*2-.55))*.12;});
      if(diorama)diorama.rotation.z=Math.sin(t*.8)*.018;
      updateLegs();root.userData.runHop=hop;root.userData.runPhase=phase;
    };
    updateLegs();return finish(root,'character');
  }
  function setCharacter(root,id=0){
    const info=characterInfo(id);if(root.userData.characterId===info.id)return root;
    const pose=root.userData.pose,next=mochi(info.id);
    root.traverse(m=>{if(m.isInstancedMesh){instances.delete(m);m.dispose();}});
    root.clear();for(const child of [...next.children])root.add(child);
    root.name=next.name;root.userData=next.userData;if(pose)root.userData.pose=pose;
    return root;
  }
  function donut() {
    const root = new THREE.Group(), car = new THREE.Group(), dough = new THREE.Group(); root.add(car); car.add(dough);
    chassis(car, 0xff9571); dough.position.y = 1.07;
    mesh(dough, geo('donut', () => new THREE.TorusGeometry(.47, .23, 10, 28)), 0xe99a58, 'candy', true);
    const icing = ring(dough, 0xff65aa, .47, .23, 0, 0, .13); icing.scale.z = .50;
    // Icing has real scalloped drips and a pale bevel, rather than a flat disk.
    for(let i=0;i<11;i++){
      const a=i*TAU/11,r=.535;
      ball(dough,i%3===0?0xffb9da:0xff75b6,Math.cos(a)*r,Math.sin(a)*r,.23,.09,.095,.035);
    }
    const chocolate=ring(dough,0xad6c58,.47,.19,0,0,-.085);chocolate.scale.z=.40;
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4, r = .46 + Math.sin(i * 3) * .11;
      const sprinkle = rod(dough, palette[i % 6], .018, .09, Math.cos(a) * r, Math.sin(a) * r, .25);
      sprinkle.rotation.z = a * 1.8;
    }
    bake(dough, 'donut-dough');
    const face = new THREE.Group(); face.position.set(0, .62, .282); car.add(face);
    happyFace(face, 0, 0, 0, .73); bake(face, 'donut-face');
    for(const side of [-1,1]){
      ball(car,0xffc999,side*.57,.75,-.02,.10,.18,.10).rotation.z=-side*.3;
      ball(car,0xffd9ab,side*.56,.83,.15,.09,.08,.10);
    }
    ball(car,0xfff1d8,0,.50,-.14,.36,.075,.30);
    car.remove(dough, face); bake(car, 'donut-car'); car.add(dough, face);
    const wheels = wheelSet(car, .65, .29, .17);
    root.userData.animate = (t, dt, speed = 12.5) => {
      dough.rotation.z -= dt * (1.8 + speed * .035);
      car.position.y = Math.sin(t * 5) * .015; wheels(t * (4 + speed * .3));
    }; return finish(root, 'donut');
  }
  function gummy() {
    const root = new THREE.Group(), car = new THREE.Group(); root.add(car); chassis(car, 0x39cec9);
    ball(car, 0x56e1d1, 0, .96, -.02, .35, .46, .29, 'candy', true);
    ball(car, 0x65e9da, 0, 1.37, .01, .40, .36, .32);
    ball(car, 0xb8fff2, 0, .99, .242, .21, .25, .055);
    for (const side of [-1, 1]) {
      ball(car, 0x4bd6c9, side * .29, 1.64, 0, .16, .19, .12);
      ball(car, 0xffb1dd, side * .29, 1.64, .10, .073, .10, .024);
      ball(car, 0x43c8c2, side * .32, .93, .18, .13, .26, .13).rotation.z = side * -.55;
    }
    happyFace(car, 0, 1.39, .324, .86);
    ring(car, 0xffe6a3, .16, .032, 0, .91, .37).rotation.x = -.65;
    // The driver is seated behind a curved mint windshield with side mirrors.
    ball(car,0xc1f3ec,0,.69,.26,.48,.18,.055);ball(car,0x69c5c9,0,.65,.303,.44,.075,.013);
    for(const side of [-1,1]){
      rod(car,0xffdfaa,.018,.15,side*.51,.64,.13).rotation.z=-side*.4;
      ball(car,0xfff0b7,side*.56,.70,.13,.067,.040,.038);
      ball(car,0x287f83,side*.45,.69,-.12,.04,.05,.27);
    }
    ball(car,0xffcf8c,0,1.63,0,.30,.09,.26);ball(car,0xffe5af,0,1.73,0,.16,.077,.12);
    box(car,0x78bfbd,0,.57,-.29,.36,.14,.16);box(car,0xffecc1,0,.65,-.29,.12,.024,.17);
    bake(car, 'gummy-car'); const wheels = wheelSet(car);
    root.userData.animate = (t, dt, speed = 12.5) => { car.rotation.z = Math.sin(t * 4) * .025;
      car.position.y = Math.sin(t * 6) * .015; wheels(t * (4 + speed * .3)); };
    return finish(root, 'gummy');
  }
  function cupcake() {
    const root = new THREE.Group(), car = new THREE.Group(); root.add(car); chassis(car, 0xa578ef, .67, .39);
    rod(car, 0xa270df, .43, .53, 0, .74, 0, 'candy', .33).castShadow = true;
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10; rod(car, 0xd8b0ff, .025, .50, Math.cos(a) * .38, .74, Math.sin(a) * .38);
    }
    ball(car, 0xffce9c, 0, 1.00, 0, .45, .13, .42);
    for (let i = 0; i < 4; i++) ring(car, i % 2 ? 0xffc9e8 : 0xff8dc8,
      .31 - i * .068, .105 - i * .014, 0, 1.12 + i * .14, 0).rotation.x = Math.PI / 2;
    for(let i=0;i<12;i++){
      const a=i*TAU/12;ball(car,0xffc0de,Math.sin(a)*.40,1.05,Math.cos(a)*.39,.06,.10+.03*(i%3),.055);
      const sprinkle=rod(car,palette[i%6],.013,.065,Math.sin(a)*.30,1.27+Math.cos(a)*.07,Math.cos(a)*.26);
      sprinkle.rotation.z=a*.7;sprinkle.rotation.x=.4;
    }
    ball(car, 0xff386e, 0, 1.70, 0, .13); rod(car, 0x61cda0, .014, .13, .025, 1.82, 0).rotation.z = -.35;
    happyFace(car, 0, .77, .398, .87); bake(car, 'cupcake-car');
    const feet = new THREE.Group(); car.add(feet);
    ball(feet, 0xff8fc1, -.23, .22, .37, .13, .095, .18);
    ball(feet, 0xff8fc1, .23, .22, .37, .13, .095, .18); bake(feet, 'cupcake-feet');
    const wheels = wheelSet(car, .59, .28, .15);
    root.userData.animate = (t, dt, speed = 12.5) => { car.rotation.z = Math.sin(t * 5) * .025;
      feet.rotation.x = Math.sin(t * 5) * .23; wheels(t * (4 + speed * .3)); };
    return finish(root, 'cupcake');
  }
  function tea() {
    const root = new THREE.Group(), car = new THREE.Group(); root.add(car); chassis(car, 0xffb956);
    rod(car, 0xffb6da, .43, .60, 0, .88, 0, 'candy', .34).castShadow = true;
    ring(car, 0xffedfa, .42, .031, 0, 1.19, 0).rotation.x = Math.PI / 2;
    rod(car, 0xb87b45, .38, .018, 0, 1.185, 0);
    ring(car, 0xffcce5, .20, .058, .48, .91, 0).scale.x = .8;
    rod(car,0xfff0da,.52,.055,0,.56,0,'candy',.45);
    ring(car,0xf1b2d3,.47,.025,0,.59,0).rotation.x=Math.PI/2;
    for(let i=0;i<7;i++){
      const a=i*TAU/7;heart(car,0xffe4ee,Math.sin(a)*.37,.88,Math.cos(a)*.385,.05);
    }
    ball(car,0xffe6be,-.12,1.205,-.10,.10,.018,.058).rotation.y=.35;
    ball(car,0xffd1a2,.11,1.205,.06,.07,.018,.05);
    box(car,0xffe2b3,-.34,.58,-.17,.17,.095,.12);box(car,0xf6b48b,-.34,.62,-.17,.09,.015,.12);
    happyFace(car, 0, .9, .407, .84);
    box(car, 0xfff0ac, .24, .74, .383, .105, .13, .024);
    rod(car, 0xffe8ed, .008, .35, .25, .98, .39);
    box(car, 0xfff1b9, 0, .48, .39, .34, .095, .035);
    for (let i = 0; i < 5; i++) box(car, i % 2 ? 0x574565 : 0xffe8af, (i - 2) * .065, .48, .412, .035, .035, .011);
    bake(car, 'tea-taxi'); const steam = new THREE.Group(); car.add(steam);
    for (let i = 0; i < 3; i++) {
      const puff = mesh(steam, curveTube('tea-steam', [[-.035, 0, 0], [.035, .13, 0], [-.03, .26, 0], [.025, .39, 0]], .024, 14), 0xfff1ff, 'steam');
      puff.position.set((i - 1) * .19, 1.3 + (i % 2) * .055, 0);
    }
    bake(steam, 'tea-steam-merged', 'steam'); const wheels = wheelSet(car, .61, .28, .17);
    root.userData.animate = (t, dt, speed = 12.5) => { car.position.y = Math.abs(Math.sin(t * 4)) * .05;
      steam.rotation.y = Math.sin(t * 2) * .14; steam.position.y = Math.sin(t * 2.3) * .04;
      wheels(t * (4 + speed * .3)); }; return finish(root, 'tea');
  }
  function lollipop() {
    const root = new THREE.Group(), scooter = new THREE.Group(); root.add(scooter);
    chassis(scooter, 0xef8bcf, .60, .32); rod(scooter, 0xfff0d7, .055, .92, 0, .85, 0);
    for(let i=0;i<3;i++)ring(scooter,0xffa9ce,.057,.011,0,.70+i*.13,0).rotation.x=Math.PI/2;
    ball(scooter,0xa9ece1,0,.49,-.12,.39,.065,.20);
    rod(scooter, 0xffbce5, .035, .6, .40, .75, .14).rotation.z = -.12;
    rod(scooter, 0x99f3e9, .042, .28, .43, 1.07, .14).rotation.z = Math.PI / 2;
    bake(scooter, 'lollipop-scooter');
    const candy = new THREE.Group(); candy.position.y = 1.42; scooter.add(candy);
    ball(candy, 0xff66b6, 0, 0, 0, .51, .51, .16, 'candy', true);
    ring(candy,0xffcecf,.47,.04,0,0,.095);
    for(let i=0;i<12;i++){const a=i*TAU/12;ball(candy,0xffe2b7,Math.sin(a)*.495,Math.cos(a)*.495,.017,.023,.023,.029);}
    const points = []; for (let i = 0; i <= 62; i++) {
      const p = i / 62, a = p * TAU * 2.7, r = .025 + p * .435; points.push([Math.cos(a) * r, Math.sin(a) * r, .164]);
    }
    mesh(candy, curveTube('lolly-spiral', points, .027, 56), 0xfff0aa); bake(candy, 'lollipop-candy');
    const face = new THREE.Group(); face.position.set(0, 1.40, .203); scooter.add(face);
    happyFace(face, 0, 0, 0, .78); bake(face, 'lollipop-face');
    const wheels = wheelSet(scooter, .51, .24, .15);
    root.userData.animate = (t, dt, speed = 12.5) => { candy.rotation.z += dt * 1.2;
      scooter.rotation.z = Math.sin(t * 3) * .028; wheels(t * (4 + speed * .3)); };
    return finish(root, 'lollipop');
  }
  function icecream() {
    const root = new THREE.Group(), scooter = new THREE.Group(); root.add(scooter); chassis(scooter, 0x66e1dc, .63, .34);
    rod(scooter, 0xa2fff0, .030, .85, .43, .81, .05).rotation.z = -.12;
    rod(scooter, 0xff9ed2, .041, .27, .48, 1.24, .05).rotation.z = Math.PI / 2;
    bake(scooter, 'icecream-skateboard'); const rider = new THREE.Group(); rider.position.x = -.11; scooter.add(rider);
    rod(rider, 0xe5ad67, .28, .55, 0, .77, 0, 'candy', .055).castShadow = true;
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8; const rib = rod(rider, 0xffd895, .016, .53, Math.cos(a) * .16, .79, Math.sin(a) * .16);
      rib.rotation.z = -Math.cos(a) * .29; rib.rotation.x = Math.sin(a) * .29;
    }
    for(let i=0;i<3;i++)ring(rider,0xd2965a,.11+i*.055,.011,0,.63+i*.11,0).rotation.x=Math.PI/2;
    ball(rider, 0xffdf91, 0, 1.16, 0, .34, .29, .32);
    ball(rider, 0xff86c3, .025, 1.53, 0, .33, .32, .31, 'candy', true); happyFace(rider, .025, 1.54, .31, .78);
    for(let i=0;i<7;i++){
      const a=i*TAU/7;ball(rider,0xff9cce,.025+Math.sin(a)*.27,1.32,Math.cos(a)*.25,.054,.10,.049);
      const sprinkle=rod(rider,palette[i%6],.013,.06,Math.sin(a)*.18,1.79,Math.cos(a)*.17);sprinkle.rotation.z=a;
    }
    ball(rider, 0xfff4e9, -.10, 1.76, .035, .14, .066, .11); ball(rider, 0xff416f, -.09, 1.86, .04, .07);
    const arm = rod(rider, 0xffb7dc, .045, .37, .29, 1.05, .09); arm.rotation.z = -.65;
    bake(rider, 'icecream-rider'); const wheels = wheelSet(scooter, .55, .25, .15);
    root.userData.animate = (t, dt, speed = 12.5) => { rider.rotation.z = Math.sin(t * 3) * .065;
      rider.position.y = Math.sin(t * 5) * .025; wheels(t * (4 + speed * .3)); };
    return finish(root, 'icecream');
  }
  function sushi() {
    const root = new THREE.Group(), scooter = new THREE.Group(); root.add(scooter); chassis(scooter, 0x76d8ae, .69, .39);
    rod(scooter, 0xa6f3e0, .03, .59, .47, .72, -.10).rotation.z = -.10; bake(scooter, 'sushi-scooter');
    const roll = new THREE.Group(); scooter.add(roll);
    box(roll,0xd9a478,0,.45,0,.99,.06,.68);box(roll,0xffdfb5,0,.492,0,1.02,.023,.70);
    ball(roll, 0xfff7ed, 0, .72, 0, .56, .30, .37, 'matte', true); box(roll, 0x245c51, 0, .77, -.02, .23, .56, .74);
    ball(roll, 0xff9277, 0, 1.00, 0, .61, .15, .39);
    for (let i = 0; i < 5; i++) {
      const stripe = mesh(roll, curveTube('salmon-stripe', [[-.025, 0, -.29], [0, .04, 0], [.045, 0, .29]], .012, 8), 0xffd0b7);
      stripe.position.set((i - 2) * .2, 1.11, 0);
    }
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8; ball(roll, 0xffffff, Math.cos(a) * .51, .65 + (i % 2) * .09, Math.sin(a) * .335, .045, .026, .045);
    }
    for(let i=0;i<22;i++){
      const a=i*2.4;ball(roll,i%3?0xfffaf1:0xf8e4cb,Math.sin(a)*.50,.64+(i%3)*.058,Math.cos(a)*.31,.032,.024,.044);
    }
    for(const side of [-1,1]){
      const chopstick=rod(roll,0xbe8063,.014,.67,side*.09,.96,-.24);chopstick.rotation.z=side*.27;chopstick.rotation.x=1.23;
      ball(scooter,0xffc2cf,side*.54,.60,.17,.065,.08,.05);
    }
    happyFace(roll, 0, .78, .378, .93); ball(roll, 0x9ada68, .36, 1.16, -.04, .10, .08, .08);
    bake(roll, 'sushi-rider'); const wheels = wheelSet(scooter, .61, .28, .16);
    root.userData.animate = (t, dt, speed = 12.5) => { roll.position.y = Math.abs(Math.sin(t * 4)) * .10;
      roll.rotation.z = Math.sin(t * 3) * .035; wheels(t * (4 + speed * .3)); }; return finish(root, 'sushi');
  }
  function cotton() {
    const root = new THREE.Group(), car = new THREE.Group(); root.add(car); chassis(car, 0xbc85f0, .72, .43);
    rod(car, 0xffefcd, .041, .65, 0, .68, 0); bake(car, 'cotton-hovercar'); const fluff = new THREE.Group(); car.add(fluff);
    [[0, 1.16, 0, .37], [-.31, 1.1, 0, .27], [.31, 1.1, 0, .28], [-.18, 1.40, 0, .27], [.18, 1.41, 0, .27], [0, 1.55, 0, .20]]
      .forEach((p, i) => ball(fluff, i % 2 ? 0xffa3d7 : 0xe59af0, p[0], p[1], p[2], p[3], p[3], p[3], 'candy', i === 0));
    for(let i=0;i<7;i++){
      const a=i*TAU/7;ball(fluff,i%2?0xffbedf:0xdbb4f4,Math.sin(a)*.35,1.18+Math.cos(a)*.16,-.22,.15,.14,.13);
    }
    for(const side of [-1,1]){
      ball(fluff,0xffd5e8,side*.39,.89,.15,.11,.09,.09);
      diamond(fluff,0xffdfac,side*.38,1.55,0,.054);
    }
    happyFace(fluff, 0, 1.18, .359, .96); bake(fluff, 'cotton-fluff'); const glow = new THREE.Group(); car.add(glow);
    for (const side of [-1, 1]) {
      ball(glow, 0x7bf0ff, side * .48, .11, 0, .15, .045, .24); ring(glow, 0xd3a4ff, .14, .022, side * .48, .07, 0).rotation.x = Math.PI / 2;
    }
    bake(glow, 'cotton-thrusters', 'glow');
    root.userData.animate = (t) => { car.position.y = .14 + Math.sin(t * 3) * .055;
      car.rotation.z = Math.sin(t * 2) * .035; fluff.position.y = Math.sin(t * 2.5) * .035; glow.scale.y = 1 + Math.sin(t * 7) * .15; };
    return finish(root, 'cotton');
  }
  function cheerSign() {
    const root = new THREE.Group(), frame = new THREE.Group(); root.add(frame);
    rod(frame, 0xa0656b, .030, .62, 0, .25, 0); box(frame, 0xffb1df, 0, .70, 0, .90, .40, .055); bake(frame, 'sign-frame');
    if (!materials.has('sign')) {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 112;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff4f8'; ctx.fillRect(0, 0, 256, 112);
      ctx.font = 'bold 43px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#8a307d'; ctx.fillText('¡Mochi!', 128, 56);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      textures.add(texture); materials.set('sign', new THREE.MeshBasicMaterial({map: texture}));
    }
    const text = new THREE.Mesh(geo('sign-plane', () => new THREE.PlaneGeometry(.84, .35)), materials.get('sign'));
    text.position.set(0, .70, .03); root.add(text); return root;
  }
  function spectator(seed = 0) {
    const root = new THREE.Group(), fan = new THREE.Group(); root.add(fan);
    const index = Math.abs(Math.floor(seed)) % 6, color = palette[index], bunny = index % 3 === 0;
    ball(fan, color, 0, .38, 0, .31, .35, .27);
    for (const side of [-1, 1]) {
      const ear = ball(fan, color, side * .19, bunny ? .77 : .63, -.02, bunny ? .066 : .105, bunny ? .21 : .105, .073);
      ear.rotation.z = side * -.13;
      ball(fan, color, side * .31, .41, 0, .085, .13, .08).rotation.z = side * -.75;
      ball(fan, color, side * .13, .09, .06, .12, .06, .125);
    }
    happyFace(fan, 0, .42, .269, .69, index === 0 || index === 4); bake(fan, `spectator-${index}`);
    let sign;
    if (seed % 5 === 0) { sign = cheerSign(); sign.position.set(.43, .12, .04); sign.scale.setScalar(1.1); fan.add(sign); }
    root.userData.cheer = 0;
    root.userData.animate = (t, dt) => {
      root.userData.cheer = Math.max(0, root.userData.cheer - dt * 1.5);
      const energy = root.userData.cheer, phase = t * (3.7 + energy * 3) + seed * 1.77;
      fan.position.y = Math.max(0, Math.sin(phase)) * (.10 + energy * .23); fan.rotation.z = Math.sin(phase * .7) * (.06 + energy * .07);
      if (sign) sign.rotation.z = Math.sin(phase) * .12;
    }; return root;
  }
  function cloud() {
    const root = new THREE.Group();
    [[0, 0, 0, .58], [-.47, -.04, .02, .38], [.45, -.06, .02, .43], [-.21, .20, -.02, .40], [.22, .15, -.08, .40]]
      .forEach(p => ball(root, 0xf4bce7, p[0], p[1], p[2], p[3], p[3] * .70, p[3] * .66, 'matte'));
    bake(root, 'cloud'); root.userData.animate = t => { root.rotation.z = Math.sin(t * .5) * .025; }; return root;
  }
  // R5: dos vehículos nuevos surrealistas kawaii.
  function macaron() {
    const root = new THREE.Group(), car = new THREE.Group(); root.add(car); chassis(car, 0x9ee7d2);
    const m = new THREE.Group(); m.position.y = 1.0; car.add(m);
    ball(m, 0xffa8d2, 0, .2, 0, .55, .2, .5); ball(m, 0xfff1e0, 0, 0, 0, .5, .11, .46); ball(m, 0xc9a7ff, 0, -.2, 0, .55, .2, .5);
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ball(m, 0xffd1e6, Math.cos(a) * .5, .05, Math.sin(a) * .45, .06, .05, .06); }
    bake(m, 'macaron-body'); const face = new THREE.Group(); face.position.set(0, 1.0, .5); car.add(face); happyFace(face, 0, 0, 0, .62); bake(face, 'macaron-face');
    root.userData.animate = (t) => { m.rotation.y = Math.sin(t * 2) * .2; m.position.y = 1.0 + Math.abs(Math.sin(t * 5)) * .06; }; return root;
  }
  function jelly() {
    const root = new THREE.Group(), car = new THREE.Group(); root.add(car); chassis(car, 0xffd36d);
    const j = new THREE.Group(); j.position.y = .95; car.add(j);
    ball(j, 0x8ff0ff, 0, 0, 0, .55, .5, .5); ball(j, 0xff7ab8, 0, .48, 0, .2, .2, .2); ball(j, 0xffffff, -.2, .22, .3, .1, .14, .06);
    bake(j, 'jelly-body'); const face = new THREE.Group(); face.position.set(0, .9, .47); car.add(face); happyFace(face, 0, 0, 0, .7); bake(face, 'jelly-face');
    root.userData.animate = (t) => { const w = Math.sin(t * 7) * .06; j.scale.set(1 + w, 1 - w, 1 + w); }; return root;
  }
  const constructors = {donut, gummy, cupcake, tea, lollipop, icecream, sushi, cotton, macaron, jelly};
  // R5: capa de detalle para todos los vehículos surrealistas: cara trasera (la que ves al adelantar),
  // ruedas grandes con llanta cromada que giran, alerón brillante, neón inferior y tubos con chispas.
  const upgradeGlow = {};
  function obstacle(kind) {
    const root = (constructors[kind] || donut)();
    const hue = {donut:0xff6fb5,gummy:0x7dffb0,cupcake:0xffa6e0,tea:0x9fe8ff,lollipop:0xff7d9c,icecream:0xc4a6ff,sushi:0xffc46b,cotton:0xff9df0}[kind] || 0xff8fd8;
    const outlineMat = upgradeGlow.outline || (upgradeGlow.outline = new THREE.MeshBasicMaterial({color: 0x1a0626, side: THREE.BackSide}));
    root.traverse(o => { if (o.isMesh && !o.userData.outline && o.geometry && (o.geometry.attributes.position?.count || 0) > 200) { const ol = new THREE.Mesh(o.geometry, outlineMat); ol.userData.outline = true; ol.scale.setScalar(1.045); ol.position.set(0, 0, 0); o.add(ol); } });
    const extra = new THREE.Group(); root.add(extra);
    const back = new THREE.Group(); back.position.set(0, .66, -.62); back.rotation.y = Math.PI; extra.add(back);
    happyFace(back, 0, 0, 0, .62, kind === 'cotton' || kind === 'tea');
    const wheels = [];
    const tyreGeo = geo('r5-tyre', () => new THREE.TorusGeometry(.17, .085, 10, 20)), hubGeo = geo('r5-hub', () => new THREE.CylinderGeometry(.13, .13, .09, 14));
    const tyreMat = new THREE.MeshPhysicalMaterial({color: 0x3a2350, roughness: .35, clearcoat: 1, clearcoatRoughness: .12});
    const hubMat = new THREE.MeshStandardMaterial({color: 0xfff2fb, metalness: 1, roughness: .12});
    const capMat = new THREE.MeshStandardMaterial({color: hue, emissive: hue, emissiveIntensity: .5, metalness: .4, roughness: .2});
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(sx * .72, .2, sz * .46); extra.add(w);
      const t = new THREE.Mesh(tyreGeo, tyreMat); t.rotation.y = Math.PI / 2; w.add(t);
      const h = new THREE.Mesh(hubGeo, hubMat); h.rotation.z = Math.PI / 2; w.add(h);
      for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(geo('r5-spoke', () => new THREE.BoxGeometry(.1, .2, .035)), capMat); sp.position.x = sx * .05; sp.rotation.x = i * TAU / 5; sp.position.y = 0; w.add(sp); }
      wheels.push(w);
    }
    const spoilerMat = new THREE.MeshPhysicalMaterial({color: hue, roughness: .12, metalness: .35, clearcoat: 1, clearcoatRoughness: .05});
    root.userData.tint = spoilerMat;
    const spoiler = new THREE.Mesh(geo('r5-spoiler', () => new THREE.BoxGeometry(1.2, .06, .22)), spoilerMat); spoiler.position.set(0, 1.0, -.64); extra.add(spoiler);
    for (const sx of [-.42, .42]) { const st = new THREE.Mesh(geo('r5-strut', () => new THREE.BoxGeometry(.05, .26, .05)), hubMat); st.position.set(sx, .86, -.62); extra.add(st); }
    if (!upgradeGlow[hue]) upgradeGlow[hue] = new THREE.MeshBasicMaterial({color: new THREE.Color(hue).multiplyScalar(1.6), transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
    const glow = new THREE.Mesh(geo('r5-underglow', () => new THREE.PlaneGeometry(1.7, 1.4)), upgradeGlow[hue]); glow.rotation.x = -Math.PI / 2; glow.position.y = .04; extra.add(glow);
    const pipes = [];
    for (const sx of [-.28, .28]) { const pp = new THREE.Mesh(geo('r5-pipe', () => new THREE.CylinderGeometry(.05, .06, .16, 10)), hubMat); pp.rotation.x = Math.PI / 2; pp.position.set(sx, .26, -.7); extra.add(pp);
      const flame = new THREE.Mesh(geo('r5-flame', () => new THREE.ConeGeometry(.06, .3, 8)), upgradeGlow[hue]); flame.rotation.x = -Math.PI / 2; flame.position.set(sx, .26, -.86); extra.add(flame); pipes.push(flame); }
    const base = root.userData.animate;
    root.userData.animate = (t, dt = 0, speed = 12.5) => {
      base?.(t, dt, speed);
      for (const w of wheels) w.rotation.x -= dt * speed * 3.2;
      extra.position.y = Math.abs(Math.sin(t * 6)) * .025;
      back.scale.y = .62 * (Math.sin(t * 2.3) > .97 ? .2 : 1) / .62;
      for (const f of pipes) f.scale.set(1, .7 + Math.random() * .6, 1);
      glow.material.opacity = .45 + Math.sin(t * 4) * .12;
    };
    return root;
  }
  function dispose() {
    instances.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    instances.clear(); geometries.clear(); materials.clear(); textures.clear();
  }
  return {characters, mochi, character:mochi, setCharacter, obstacle, obstacleKinds:Object.keys(constructors), spectator, cloud, dispose};
})();


/* Candy Avenue: a complete procedural sweet city. Geometry templates are baked
   once, then instanced; AUTO keeps a populated landscape even in ECO. */
const CandyWorld = (() => {
  function create(scene, Models) {
    const root = new THREE.Group(); scene.add(root);
    const owned = new Set(), textures = new Set(), materials = [], cache = new Map();
    const moving = [], animated = [], crowd = [], decorative = [], batches = [];
    let quality = 2, frameSerial = 0, lastReflectionFrame = -100, eventTint = 0;
    const TAU = Math.PI * 2;
    const rand = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const geo = (key, factory) => { if (!cache.has(key)) { const g = factory(); cache.set(key, g); owned.add(g); } return cache.get(key); };
    const sphere = geo('sphere', () => new THREE.SphereGeometry(1, 12, 8));
    const bead = geo('bead', () => new THREE.SphereGeometry(1, 8, 6));
    const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
    const cylinder = geo('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 12));
    const taper = geo('taper', () => new THREE.CylinderGeometry(.77, 1, 1, 12));
    const mat = (color, opts = {}) => { const m = new THREE.MeshPhysicalMaterial({color, roughness: .27, metalness: .045, clearcoat: .85, clearcoatRoughness: .16, ...opts}); materials.push(m); return m; };
    const light = (color, intensity = .72) => mat(color, {emissive: color, emissiveIntensity: intensity, roughness: .25});
    const chocolate = mat('#512147'), wafer = mat('#db9670'), cream = mat('#ffdfb6'), icing = mat('#fff0fa');
    const pink = mat('#e970b6'), lilac = mat('#9e70d3'), teal = mat('#52bfc3'), berry = mat('#ba347e');
    const strawberry = mat('#d8285a', {roughness: .28, clearcoat: .8, clearcoatRoughness: .2}), berryPink = mat('#ef5f9e', {roughness: .3, clearcoat: .8, clearcoatRoughness: .2});
    const mint = mat('#8fdec6'), caramel = mat('#d79a54'), red = mat('#eb518e'), dark = mat('#382238');
    const sugarColors = [pink, lilac, teal, berry, mint, caramel];
    const neonPink = light('#ff7cd7', .6), neonCyan = light('#72eee6', .5), amber = light('#ffc367', .82);
    const windowMats = [light('#ffcf5a', 1.6), light('#5ff4ff', 1.6), light('#ff6fcf', 1.5), light('#8dff7a', 1.4)];
    function mesh(parent, geometry, material, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
      const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
    }
    const ball = (p, m, x, y, z, sx, sy = sx, sz = sx) => mesh(p, Math.max(sx, sy, sz) < .4 ? bead : sphere, m, x, y, z, sx, sy, sz);
    const cuboid = (p, m, x, y, z, sx, sy, sz) => mesh(p, box, m, x, y, z, sx, sy, sz);
    function tube(parent, key, points, radius, material, count = 20) {
      return mesh(parent, geo(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), count, radius, 4, false)), material);
    }
    function emissionMaterial(material) {
      material.onBeforeCompile = shader => {
        shader.vertexShader = 'attribute vec3 candyEmission;varying vec3 vCandyEmission;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCandyEmission=candyEmission;');
        shader.fragmentShader = 'varying vec3 vCandyEmission;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vCandyEmission;');
      }; material.customProgramCacheKey = () => 'candy-avenue-v3-emission'; return material;
    }
    const sceneryMat = emissionMaterial(mat('#ffffff', {vertexColors: true, roughness: .24, metalness: .07, envMapIntensity: .64}));
    const sceneryEcoMat = emissionMaterial(new THREE.MeshStandardMaterial({color: '#ffffff', vertexColors: true, roughness: .38, metalness: .025, envMapIntensity: .38})); materials.push(sceneryEcoMat);
    function bake(group, key, material = sceneryMat) {
      const geometry = geo('merged-' + key, () => {
        group.updateMatrixWorld(true);
        const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert(), matrix = new THREE.Matrix4(), nmat = new THREE.Matrix3();
        const v = new THREE.Vector3(), n = new THREE.Vector3();
        const data = {position: [], normal: [], uv: [], color: [], candyEmission: []};
        group.traverse(source => {
          if (!source.isMesh || Array.isArray(source.material)) return;
          const g = source.geometry, m = source.material, p = g.attributes.position, normal = g.attributes.normal, uv = g.attributes.uv;
          const colors = g.attributes.color, emissions = g.attributes.candyEmission;
          matrix.multiplyMatrices(inverse, source.matrixWorld); nmat.getNormalMatrix(matrix);
          const count = g.index ? g.index.count : p.count;
          for (let i = 0; i < count; i++) {
            const j = g.index ? g.index.getX(i) : i; v.fromBufferAttribute(p, j).applyMatrix4(matrix); data.position.push(v.x, v.y, v.z);
            n.set(normal ? normal.getX(j) : 0, normal ? normal.getY(j) : 1, normal ? normal.getZ(j) : 0).applyMatrix3(nmat).normalize(); data.normal.push(n.x, n.y, n.z);
            data.uv.push(uv ? uv.getX(j) : 0, uv ? uv.getY(j) : 0);
            const color = m.color || new THREE.Color(1, 1, 1); data.color.push(color.r * (colors ? colors.getX(j) : 1), color.g * (colors ? colors.getY(j) : 1), color.b * (colors ? colors.getZ(j) : 1));
            const e = m.emissive, s = m.emissiveIntensity || 0; data.candyEmission.push((e ? e.r * s : 0) + (emissions ? emissions.getX(j) : 0), (e ? e.g * s : 0) + (emissions ? emissions.getY(j) : 0), (e ? e.b * s : 0) + (emissions ? emissions.getZ(j) : 0));
          }
        });
        const g = new THREE.BufferGeometry(); for (const name of Object.keys(data)) g.setAttribute(name, new THREE.Float32BufferAttribute(data[name], name === 'uv' ? 2 : 3)); g.computeBoundingSphere(); return g;
      }); group.clear(); group.add(new THREE.Mesh(geometry, material)); group.userData.prefab = key; return group;
    }
    function archGeometry(key, width, height, depth = .07, rim = false) {
      return geo(key, () => {
        const s = new THREE.Shape(), r = width * .5, straight = height - r;
        s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, straight); s.absarc(0, straight, r, 0, Math.PI, false); s.lineTo(-r, 0);
        if (rim) { const hole = new THREE.Path(), h = r - .075; hole.moveTo(-h, .075); hole.lineTo(-h, straight); hole.absarc(0, straight, h, Math.PI, 0, true); hole.lineTo(h, .075); hole.closePath(); s.holes.push(hole); }
        const g = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: false, steps: 1, curveSegments: 8}); return g;
      });
    }
    const windowBack = archGeometry('arched-window-back', .8, 1.2, .05);
    const windowGlass = archGeometry('arched-window-glass', .61, .99, .026);
    const archRim = archGeometry('arched-window-rim', .9, 1.3, .045, true);
    function windowAt(g, seed, x, y, z, scale = 1, balcony = false) {
      const w = new THREE.Group(); w.position.set(x, y, z); w.scale.setScalar(scale); g.add(w);
      mesh(w, windowBack, chocolate); mesh(w, windowGlass, windowMats[seed % 4], 0, .08, .079); mesh(w, archRim, icing, 0, -.045, .10);
      cuboid(w, cream, 0, .62, .12, .035, 1.05, .027); cuboid(w, cream, 0, .62, .13, .69, .035, .025);
      cuboid(w, icing, 0, -.06, .12, .99, .12, .24);
      if (balcony) { cuboid(w, wafer, 0, -.20, .26, 1.22, .15, .55); cuboid(w, icing, 0, .08, .54, 1.18, .065, .07); for (const bx of [-.48, -.24, 0, .24, .48]) cuboid(w, cream, bx, -.04, .54, .028, .24, .045); }
    }
    function icingBand(g, seed, width, y, depth, color = icing) {
      cuboid(g, color, 0, y, 0, width + .17, .20, depth + .14);
      for (let i = 0; i < 11; i++) {
        const x = -width * .48 + i / 10 * width * .96, drip = .13 + rand(seed * 53 + i) * .31;
        ball(g, color, x, y - drip * .39, depth * .5 + .055, .13, drip, .105);
      }
    }
    function cakeShop(seed) {
      const g = new THREE.Group(), color = sugarColors[seed % 6], w = 3.6, d = 2.9, h = seed % 3 === 2 ? 4.65 : 5.3;
      cuboid(g, wafer, 0, .2, 0, w + .24, .4, d + .22);
      cuboid(g, color, 0, h * .5 + .25, 0, w, h, d);
      // Sponge/cream layers, chocolate corners and two rows of glowing arched windows.
      icingBand(g, seed, w, 1.6, d, cream); icingBand(g, seed + 3, w, 3.12, d); icingBand(g, seed + 7, w, h + .25, d);
      for (const x of [-1.72, 1.72]) cuboid(g, chocolate, x, h * .5, d * .5 + .06, .16, h, .14);
      for (let row = 0; row < 2; row++) for (const x of [-1.03, 1.03]) windowAt(g, seed + row, x, 1.78 + row * 1.53, d * .5 + .035, .83, row === 1);
      // Door large enough to read while racing; an illuminated inset and candy knob.
      mesh(g, geo('shop-door-frame', () => archGeometry('door-outer', 1.03, 1.65, .11)), chocolate, 0, .22, d * .5 + .08);
      mesh(g, archGeometry('door-light', .77, 1.40, .04), windowMats[(seed + 1) % 4], 0, .27, d * .5 + .205);
      cuboid(g, icing, 0, .86, d * .5 + .255, .045, 1.17, .035); ball(g, caramel, .18, .85, d * .5 + .28, .056);
      for (let i = 0; i < 7; i++) cuboid(g, i % 2 ? icing : color, (i - 3) * .54, 1.8, d * .5 + .5, .53, .18, .94).rotation.x = -.18;
      // Wafer shingles and a giant confection above each different shop.
      const roof = mesh(g, geo('shop-roof', () => new THREE.ConeGeometry(2.9, 1.0, 4)), wafer, 0, h + .85, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = .82;
      for (let i = 0; i < 9; i++) { const x = (i - 4) * .46; cuboid(g, cream, x, h + .85, .52, .028, .04, 1.8).rotation.x = .27; }
      const sign = new THREE.Group(); sign.position.set(0, h + 1.4, .3); g.add(sign);
      if (seed % 3 === 0) { mesh(sign, geo('roof-donut', () => new THREE.TorusGeometry(.64, .22, 7, 20)), pink); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; ball(sign, cream, Math.cos(a) * .62, Math.sin(a) * .62, .20, .042, .08, .035).rotation.z = -a; } }
      else if (seed % 3 === 1) { ball(sign, red, -.24, .1, 0, .38); ball(sign, red, .24, .1, 0, .38); const tip = mesh(sign, geo('heart-sign-tip', () => new THREE.ConeGeometry(.51, .85, 4)), red, 0, -.29, 0); tip.rotation.x = Math.PI; }
      else { mesh(sign, geo('roof-icecone', () => new THREE.ConeGeometry(.34, .90, 12)), wafer, 0, -.35, 0).rotation.z = Math.PI; ball(sign, mint, 0, .18, 0, .47); ball(sign, pink, -.20, .40, .03, .32); ball(sign, red, .05, .70, .03, .13); }
      // Candy-shop signs are dimensional frames with coloured display candies.
      cuboid(g, chocolate, 0, 3.22, d * .5 + .15, 1.56, .42, .10); cuboid(g, cream, 0, 3.22, d * .5 + .22, 1.38, .30, .03);
      for (let k = 0; k < 4; k++) ball(g, sugarColors[(seed + k) % 6], (k - 1.5) * .27, 3.22, d * .5 + .27, .085);
      return bake(g, 'cake-shop-' + seed % 6);
    }
    function cottonTree(seed) {
      const g = new THREE.Group(), color = sugarColors[seed % 3], trunkMat = seed % 2 ? cream : chocolate;
      mesh(g, cylinder, trunkMat, 0, 1.5, 0, .095, 3.0, .095);
      for (let i = 0; i < 4; i++) { const twig = cuboid(g, trunkMat, (i % 2 ? 1 : -1) * .23, 2.18 + i * .14, 0, .065, .90, .065); twig.rotation.z = (i % 2 ? 1 : -1) * .58; }
      // Irregular overlapping candyfloss lobes avoid the old five-ball silhouette.
      for (let i = 0; i < 12; i++) { const a = i * 2.4, r = .30 + rand(i + seed * 71) * .58; ball(g, color, Math.cos(a) * r, 2.84 + rand(i + 57) * 1.5, Math.sin(a) * r * .72, .43 + rand(i + 13) * .26, .55 + rand(i + 7) * .30, .45); }
      ball(g, icing, -.31, 3.73, .44, .13, .42, .08).rotation.z = -.5;
      return bake(g, 'cotton-tree-' + seed % 3);
    }
    const spiral = geo('lollipop-spiral', () => {
      const points = []; for (let i = 0; i <= 55; i++) { const a = i / 55 * Math.PI * 5.5, r = .035 + i / 55 * .89; points.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, .15)); }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 55, .058, 4, false);
    });
    function lollipop(seed) {
      const g = new THREE.Group(), stalk = new THREE.Group(); g.add(stalk);
      mesh(stalk, cylinder, icing, 0, 1.65, 0, .07, 3.3, .07); for (let i = 0; i < 8; i++) ball(stalk, pink, 0, .25 + i * .37, .051, .071, .055, .025); bake(stalk, 'lollipop-stalk');
      const head = new THREE.Group(); head.position.y = 3.7; g.add(head);
      mesh(head, geo('lollipop-disk', () => new THREE.CylinderGeometry(1.03, 1.03, .18, 24)), seed % 2 ? pink : mint).rotation.x = Math.PI / 2;
      mesh(head, spiral, icing); mesh(head, geo('lollipop-rim', () => new THREE.TorusGeometry(1.02, .07, 5, 24)), cream);
      bake(head, 'lollipop-head-' + seed % 2); animated.push({object: head, kind: 'lollipop', seed}); return g;
    }
    function hillGeometry(frost) {
      return geo('cake-hill-' + frost, () => {
        const vertices = [], indices = [], seg = 24, rings = 12;
        for (let j = 0; j <= rings; j++) for (let i = 0; i <= seg; i++) {
          const a = i / seg * TAU;
          const low = frost ? .56 + .10 * Math.sin(a * 7) + .047 * Math.sin(a * 11 + .7) : 0;
          const y = low + (1 - low) * j / rings;
          const radius = Math.pow(Math.max(0, 1 - y), .54) * (1 + .065 * Math.sin(a * 5 + y * 9) + .035 * Math.cos(a * 9 - y * 4));
          vertices.push(Math.cos(a) * radius * (frost ? 1.03 : 1), y + (frost ? .013 : 0), Math.sin(a) * radius * (frost ? 1.03 : 1));
          if (j < rings && i < seg) { const n = j * (seg + 1) + i; indices.push(n, n + seg + 1, n + 1, n + 1, n + seg + 1, n + seg + 2); }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
      });
    }
    function cakeMountain(seed) {
      const g = new THREE.Group(), color = [strawberry, berryPink, strawberry][seed % 3], r = 5, h = 10;
      mesh(g, hillGeometry(false), color, 0, -.12, 0, r, h, r);
      mesh(g, hillGeometry(true), icing, 0, -.10, 0, r, h, r);
      // Three generous cream-filled sponge terraces, with piped scalloped edges.
      for (let layer = 0; layer < 3; layer++) {
        const y = .85 + layer * 1.6, radius = r * Math.pow(1 - y / h, .54);
        const band = mesh(g, geo('mountain-terrace-' + layer, () => new THREE.TorusGeometry(radius, .105, 4, 30)), layer % 2 ? cream : pink, 0, y, 0); band.rotation.x = Math.PI / 2;
      }
      for (let i = 0; i < 7; i++) {
        const a = .43 + i / 6 * 2.26, y = 1.04 + (i % 3) * 1.1, radius = r * Math.pow(1 - y / h, .54);
        const w = new THREE.Group(); w.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius); w.rotation.y = Math.PI / 2 - a; g.add(w);
        windowAt(w, seed + i, 0, 0, 0, 1.25, i % 3 === 0);
      }
      const door = new THREE.Group(); door.position.set(0, .05, 5.06); g.add(door);
      mesh(door, archGeometry('hill-door-frame', 1.5, 2.0, .09), chocolate); mesh(door, archGeometry('hill-door-glass', 1.20, 1.72, .06), windowMats[seed % 4], 0, .1, .14);
      cuboid(door, cream, 0, .8, .24, .055, 1.55, .07);
      for (let i = 0; i < 3; i++) cuboid(g, wafer, 0, .045 - i * .07, 5.4 + i * .28, 1.7 + i * .25, .1, .42);
      for (let i = 0; i < 20; i++) { const a = i * 2.4, y = 6.6 + rand(i + 82) * 2.2, radius = r * Math.pow(1 - y / h, .54); const sprinkle = cuboid(g, sugarColors[(i + seed) % 6], Math.cos(a) * radius * 1.04, y, Math.sin(a) * radius * 1.04, .10, .30, .08); sprinkle.rotation.z = a; }
      // Cherry and edible swirl tower on the summit.
      ball(g, red, .05, 10.09, .03, .46); tube(g, 'cherry-stem', [[.07, 10.5, .03], [.15, 10.9, -.01], [.48, 11.07, -.04]], .045, chocolate, 9);
      return bake(g, 'cake-mountain-' + seed % 3);
    }
    function tierCakeMountain(seed) {
      const g = new THREE.Group();
      for (let layer = 0; layer < 3; layer++) {
        const radius = 4.6 - layer * 1.10, y = 1.18 + layer * 2.10;
        mesh(g, taper, [strawberry, berryPink][(seed + layer) % 2], 0, y, 0, radius, 2.22, radius);
        mesh(g, cylinder, cream, 0, y - .68, 0, radius * .95, .21, radius * .95);
        mesh(g, cylinder, icing, 0, y + 1.10, 0, radius * .83, .24, radius * .83);
        for (let j = 0; j < 16; j++) { const a = j / 16 * TAU; ball(g, icing, Math.cos(a) * radius * .79, y + .96, Math.sin(a) * radius * .79, .18, .22 + rand(layer * 43 + j) * .29, .18); }
        for (let j = 0; j < 4; j++) {
          const a = .45 + j / 3 * 2.23, w = new THREE.Group(); w.position.set(Math.cos(a) * radius * .91, y - .67, Math.sin(a) * radius * .91); w.rotation.y = Math.PI / 2 - a; g.add(w); windowAt(w, j + seed + layer, 0, 0, 0, .9, layer === 1 && j % 2 === 0);
        }
      }
      ball(g, red, 0, 7.7, 0, .56); tube(g, 'tiercake-cherry-stem', [[0, 8.2, 0], [.10, 8.56, 0], [.43, 8.66, 0]], .05, chocolate, 8);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const spr = cuboid(g, sugarColors[(i + seed) % 6], Math.cos(a) * 1.45, 7.09, Math.sin(a) * 1.45, .12, .10, .34); spr.rotation.y = a; }
      return bake(g, 'terraced-cake-mountain-' + seed % 2);
    }
    function island(seed) {
      const g = new THREE.Group(); const land = mesh(g, geo('floating-cake-bottom', () => new THREE.ConeGeometry(2.35, 1.5, 12)), chocolate, 0, -.63, 0); land.rotation.x = Math.PI;
      mesh(g, cylinder, wafer, 0, .12, 0, 2.15, .45, 2.15); mesh(g, cylinder, icing, 0, .40, 0, 2.23, .20, 2.23);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ball(g, pink, Math.cos(a) * 2.12, .27, Math.sin(a) * 2.12, .21, .31, .21); }
      const house = cakeShop(seed % 6); house.scale.setScalar(.42); house.position.set(.46, .51, -.20); g.add(house);
      const tree = cottonTree(seed % 3); tree.scale.setScalar(.50); tree.position.set(-1.2, .50, .30); g.add(tree);
      for (let i = 0; i < 4; i++) cuboid(g, cream, -.03, .53, .4 + i * .34, .32, .07, .22);
      return bake(g, 'cake-island-' + seed % 2);
    }
    // A high violet sunset canopy, with broad peach/lavender horizon and wispy aurora.
    const skyMat = new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, uniforms: {time: {value: 0}},
      vertexShader: 'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 vPosition;uniform float time;void main(){vec3 n=normalize(vPosition);float h=clamp(n.y*.9+.16,0.,1.);vec3 c=mix(vec3(.92,.32,.66),vec3(.34,.12,.55),pow(h,.6));c+=vec3(.18,.075,.085)*exp(-pow((h-.13)*6.,2.));float ribbon=exp(-pow((n.y-.22-.042*sin(n.x*7.+time*.045))*36.,2.));c+=vec3(.015,.035,.045)*ribbon;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }); materials.push(skyMat);
    const sky = mesh(root, geo('sky-dome', () => new THREE.SphereGeometry(245, 24, 12)), skyMat, 0, 0, -75); sky.renderOrder = -100;
    const wetCanvas = document.createElement('canvas'); wetCanvas.width = wetCanvas.height = 128;
    const wetCtx = wetCanvas.getContext('2d'), wetData = wetCtx.createImageData(128, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const v = 128 + 28 * Math.sin(y * .41 + Math.sin(x * .1) * 2) + 12 * Math.sin(x * .39 + y * .09), p = (y * 128 + x) * 4; wetData.data[p] = wetData.data[p + 1] = wetData.data[p + 2] = v; wetData.data[p + 3] = 255; }
    wetCtx.putImageData(wetData, 0, 0); const wet = new THREE.CanvasTexture(wetCanvas); wet.wrapS = wet.wrapT = THREE.RepeatWrapping; wet.repeat.set(3, 42); textures.add(wet);
    const seaMat = mat('#22475e', {roughness: .20, metalness: .26, bumpMap: wet, bumpScale: .012, envMapIntensity: .5});
    const sea = mesh(root, geo('sea', () => new THREE.PlaneGeometry(240, 300)), seaMat, 0, -.65, -100); sea.rotation.x = -Math.PI / 2;
    const roadMat = mat('#2a0d40', {roughness: .05, metalness: .3, transparent: true, opacity: .30, clearcoatRoughness: .05, bumpMap: wet, bumpScale: .004, envMapIntensity: .82});
    const road = mesh(root, geo('avenue', () => new THREE.BoxGeometry(12, .14, 220)), roadMat, 0, -.077, -85); road.receiveShadow = true;
    const infrastructure = new THREE.Group(); root.add(infrastructure);
    cuboid(infrastructure, chocolate, 0, -.23, -85, 12.02, .20, 220);
    for (const side of [-1, 1]) {
      // Paved promenades are broad enough to ground the audience, shops and trees.
      cuboid(infrastructure, lilac, side * 9.9, -.20, -85, 7.6, .32, 220);
      cuboid(infrastructure, cream, side * 6.04, .012, -85, .15, .07, 220);
      cuboid(infrastructure, side < 0 ? neonCyan : neonPink, side * 6.04, .049, -85, .023, .025, 220);
      cuboid(infrastructure, berry, side * 13.6, -.13, -85, .24, .19, 220);
    }
    bake(infrastructure, 'avenue-foundations');
    for (const side of [-1, 1]) { const railMat=new THREE.MeshBasicMaterial({color:side<0?new THREE.Color(.9,1.6,1.9):new THREE.Color(2.0,.8,1.7),toneMapped:false}); materials.push(railMat);
      const rail=new THREE.Mesh(new THREE.BoxGeometry(.16,.09,220),railMat); rail.position.set(side*5.95,.06,-85); root.add(rail); }
    let reflection = null;
    if (typeof Reflector !== 'undefined') {
      reflection = new Reflector(geo('road-reflection', () => new THREE.PlaneGeometry(12, 220)), {textureWidth: 512, textureHeight: 512, color: '#714065', clipBias: .004, multisample: 0});
      reflection.rotation.x = -Math.PI / 2; reflection.position.set(0, -.020, -85); root.add(reflection);
      const reflect = reflection.onBeforeRender; reflection.material.uniforms.waveTime = {value: 0};
      reflection.material.vertexShader = 'uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vLocal;void main(){vUv=textureMatrix*vec4(position,1.);vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
      reflection.material.fragmentShader = 'uniform sampler2D tDiffuse;uniform float waveTime;varying vec4 vUv;varying vec3 vLocal;void main(){vec4 uv=vUv;uv.xy+=vec2(sin(vLocal.y*1.5+waveTime*.45),cos(vLocal.x*3.+vLocal.y))*uv.w*.00035;vec3 r=texture2DProj(tDiffuse,uv).rgb;gl_FragColor=vec4(mix(vec3(.075,.018,.13),r*vec3(1.1,.62,1.05),.55)+vec3(.05,.0,.07)*(1.-abs(vLocal.x)/6.),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
      reflection.onBeforeRender = (renderer, renderedScene, camera) => { if (quality === 0 || frameSerial - lastReflectionFrame < (quality === 2 ? 6 : 9)) return; lastReflectionFrame = frameSerial; reflect(renderer, renderedScene, camera); };
    }
    // Rose gold circuit paths, far thinner/dimmer than the rejected glaring road.
    let circuitTraces=null; const circuitVertices = [], nodePositions = []; const tr = new THREE.Object3D();
    const line = (ax, az, bx, bz) => circuitVertices.push(ax, .022, az, bx, .022, bz);
    for (let segment = 0; segment < 19; segment++) {
      const z = 24 - segment * 12;
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
        const x = side * (1.60 + i * 1.3), turn = z - 2.4 - i * .7, end = turn - 3.1 - rand(segment * 11 + i) * 2;
        line(x, z, x, turn); line(x, turn, x - side * .25, turn - .45); line(x - side * .25, turn - .45, x - side * .25, end); nodePositions.push([x - side * .25, end]);
      }
      line(-5.9, z - 8, 5.9, z - 8);
    }
    const circuitGeometry = new THREE.BufferGeometry(); circuitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(circuitVertices, 3)); owned.add(circuitGeometry);
    const circuitMat = new THREE.LineBasicMaterial({color: new THREE.Color(2.4,1.1,2.2), toneMapped: false, transparent: true, opacity: .9}); materials.push(circuitMat);
    const circuits = new THREE.LineSegments(circuitGeometry, circuitMat); root.add(circuits);
    // R5: trazos de circuito gruesos y luminosos (las líneas de 1 px no se veían en Full HD).
    { const cv=circuitVertices, n=cv.length/6, traceMat=new THREE.MeshBasicMaterial({color:new THREE.Color(1.9,.75,1.7),toneMapped:false}); materials.push(traceMat);
      const traces=circuitTraces=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),traceMat,n); root.add(traces);
      for(let i=0;i<n;i++){const ax=cv[i*6],az=cv[i*6+2],bx=cv[i*6+3],bz=cv[i*6+5],len=Math.hypot(bx-ax,bz-az);
        tr.position.set((ax+bx)/2,.03,(az+bz)/2);tr.rotation.set(0,Math.atan2(bx-ax,bz-az),0);tr.scale.set(.06,.012,len+.06);tr.updateMatrix();traces.setMatrixAt(i,tr.matrix);} }
    const nodeMesh = new THREE.InstancedMesh(geo('circuit-node', () => new THREE.RingGeometry(.045, .070, 8)), neonPink, nodePositions.length); root.add(nodeMesh);
    for (let i = 0; i < nodePositions.length; i++) { tr.position.set(nodePositions[i][0], .025, nodePositions[i][1]); tr.rotation.set(-Math.PI / 2, 0, 0); tr.scale.setScalar(1); tr.updateMatrix(); nodeMesh.setMatrixAt(i, tr.matrix); }
    const dashed = new THREE.InstancedMesh(box, neonCyan, 152); root.add(dashed);
    for (let i = 0; i < 152; i++) { tr.position.set([-3.3,-1.1,1.1,3.3][i % 4], .026, 24 - Math.floor(i / 4) * 6); tr.rotation.set(0, 0, 0); tr.scale.set(.038, .018, 1.3); tr.updateMatrix(); dashed.setMatrixAt(i, tr.matrix); }
    // R4 directional road studs: one instanced draw call, all pointing -Z.
    const directionGeometry=new THREE.BufferGeometry();
    directionGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.14,0,.18,.14,0,.18,0,0,-.3],3));
    directionGeometry.computeVertexNormals();
    const directions=new THREE.InstancedMesh(directionGeometry,new THREE.MeshBasicMaterial({color:0xbfdce1,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}),60);
    for(let i=0;i<60;i++){tr.position.set((i%5-2)*2.2,.035,18-Math.floor(i/5)*18);tr.rotation.set(0,0,0);tr.scale.set(1,1,1);tr.updateMatrix();directions.setMatrixAt(i,tr.matrix);}
    root.add(directions);
    function place(object, x, z, seed, category, speedFactor = 1, y = 0) { object.position.set(x, y, z); root.add(object); moving.push({object, seed, category, span: 216, speedFactor, baseY: y}); decorative.push(object); return object; }
    // Genuine storefronts fill both sides of the street, staggered to retain sightlines.
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), z = 9 - row * 18;
      const shop = cakeShop((row + (side === 1 ? 3 : 0)) % 6); shop.rotation.y = side * -.38; shop.scale.setScalar(.62 + rand(i + 44) * .16);
      place(shop, side * (12.8 + rand(i + 19) * .60), z - (side === 1 ? 6 : 0), i, 'shop');
    }
    for (let i = 0; i < 36; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), object = i % 3 === 0 ? lollipop(i % 2) : cottonTree(i % 3);
      object.scale.setScalar(.75 + rand(i + 81) * .38); place(object, side * (i % 3 === 0 ? 9.2 : 10.6), 15 - row * 12 - (side > 0 ? 4 : 0), i, i % 3 === 0 ? 'lollipop' : 'tree');
    }
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1, hill = i % 3 === 1 ? tierCakeMountain(i % 2) : cakeMountain(i % 3); hill.scale.set(1.6 + rand(i + 27) * .4, 1.9 + rand(i + 24) * .6, 1.6 + rand(i + 27) * .4);
      place(hill, side * (i % 3 === 1 ? 21 + rand(i + 97) * 2 : 22.5 + rand(i + 97) * 4), -38 - Math.floor(i / 2) * 30 - (side > 0 ? 12 : 0), i, 'mountain', .36);
    }
    // R5: algodones de azúcar gigantes pegados a la carretera, como en la referencia.
    for (let i = 0; i < 10; i++) { const side = i % 2 ? 1 : -1, t = cottonTree(0); t.scale.setScalar(1.35 + rand(i + 333) * .35); place(t, side * (9.6 + rand(i + 334) * .8), 6 - Math.floor(i / 2) * 26 - (side > 0 ? 13 : 0), i + 100, 'tree'); }
    // Promenade lamps have chocolate stems, a spherical sugar lantern and icing cap.
    const lamp = new THREE.Group(); mesh(lamp, cylinder, chocolate, 0, 1.15, 0, .065, 2.3, .065); mesh(lamp, cylinder, icing, 0, .07, 0, .20, .14, .20); ball(lamp, amber, 0, 2.38, 0, .28, .34, .28); mesh(lamp, geo('lamp-cap', () => new THREE.ConeGeometry(.38, .25, 10)), cream, 0, 2.68, 0); bake(lamp, 'sugar-lamp');
    for (let i = 0; i < 28; i++) { const l = lamp.clone(); place(l, (i % 2 ? 1 : -1) * 7.0, 18 - Math.floor(i / 2) * 16, i, 'lamp'); }
    // Crowd remains dense in ECO; their six baked bodies and signs share batches.
    for (let i = 0; i < 48; i++) {
      const side = i % 2 ? 1 : -1, group = Models.spectator(i + 900);
      const o = group instanceof THREE.Object3D ? group : group.group; if (!o) continue;
      o.scale.setScalar(2.0 + rand(i + 73) * .8); o.rotation.y = side * -.32;
      place(o, side * (8.0 + rand(i + 29) * .5), 12 - Math.floor(i / 2) * 9, i, 'spectator'); crowd.push({object: o, seed: i, update: typeof group.update === 'function' ? group.update.bind(group) : null});
    }
    for (let i = 0; i < 6; i++) {
      const o = island(i % 2); o.position.set((i % 2 ? 1 : -1) * (i > 3 ? 13 : 14 + i * 3), i > 3 ? 26 + (i - 4) * 3 : 13 + i % 2 * 3, i > 3 ? -60 - (i - 4) * 16 : -35 - i * 28); o.scale.setScalar(1.15 + i % 2 * .2); root.add(o); decorative.push(o); animated.push({object: o, seed: i, kind: 'island', baseY: o.position.y});
    }
    // Smiling moon is mellow, cream coloured, and has a subtle halo, never white-hot.
    const moon = new THREE.Group(); moon.position.set(-6, 27, -112); moon.scale.setScalar(1.7); root.add(moon);
    const moonMat = light('#ffdba7', .18); moonMat.fog = false; const moonFace = mat('#945267', {fog: false}), cheek = mat('#f0a6b2', {fog: false});
    ball(moon, moonMat, 0, 0, 0, 5.0);
    for (const x of [-1.4, 1.4]) { tube(moon, 'moon-eye-' + x, [[x - .35, .24, 4.66], [x, .62, 4.80], [x + .35, .24, 4.66]], .10, moonFace, 9); ball(moon, cheek, x * 1.25, -.57, 4.66, .49, .25, .09); }
    tube(moon, 'moon-smile', [[-.68, -.66, 4.93], [0, -1.04, 4.93], [.68, -.66, 4.93]], .09, moonFace, 10);
    const moonMergedMat = emissionMaterial(new THREE.MeshStandardMaterial({color: '#ffffff', vertexColors: true, fog: false, roughness: .65, envMapIntensity: .1})); materials.push(moonMergedMat); bake(moon, 'smiling-moon', moonMergedMat);
    // Low-poly cloud banks have warm undersides and lilac crowns, not empty flat sky.
    const cloudBase = mat('#ba8fbf', {roughness: .8, metalness: 0}), cloudCrown = mat('#e4bfd6', {roughness: .8, metalness: 0});
    const cloudTemplate = new THREE.Group();
    for (let j = 0; j < 7; j++) { const x = (j - 3) * 1.75; ball(cloudTemplate, j % 2 ? cloudCrown : cloudBase, x, j % 2 * .75, -.3 + j % 3 * .3, 2.1, 1.35 + j % 2 * .35, 1.55); }
    bake(cloudTemplate, 'sunset-cloud');
    for (let i = 0; i < 16; i++) { if (i % 2 || i > 9) continue; const o = cloudTemplate.clone(); o.position.set((i % 2 ? 1 : -1) * (i > 9 ? 12 + rand(i + 551) * 19 : 13 + rand(i + 551) * 49), i > 9 ? 33 + rand(i + 72) * 21 : 9 + rand(i + 72) * 23, i > 9 ? -73 - rand(i + 54) * 52 : -68 - rand(i + 54) * 99); o.scale.setScalar(.9 + rand(i + 189) * .9); root.add(o); decorative.push(o); animated.push({object: o, seed: i, kind: 'cloud', baseX: o.position.x}); }
    const starsPos = [], sizes = [], phases = [];
    for (let i = 0; i < 150; i++) { starsPos.push((rand(i + 123) - .5) * 160, 6 + rand(i + 752) * 56, -30 - rand(i + 897) * 154); sizes.push(.8 + rand(i + 853) * 1.4); phases.push(rand(i + 76) * TAU); }
    const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsPos, 3)); starGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1)); starGeo.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1)); owned.add(starGeo);
    const starMat = new THREE.ShaderMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: {time: {value: 0}, ratio: {value: 1}},
      vertexShader: 'attribute float size;attribute float phase;uniform float time;uniform float ratio;varying float vBright;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vBright=.40+.25*sin(time*.75+phase);gl_PointSize=clamp(size*ratio*155./-p.z,1.,8.);gl_Position=projectionMatrix*p;}',
      fragmentShader: 'varying float vBright;void main(){vec2 p=gl_PointCoord-.5;float a=exp(-dot(p,p)*56.)*vBright;if(a<.015)discard;gl_FragColor=vec4(.88,.68,.45,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }); materials.push(starMat); const stars = new THREE.Points(starGeo, starMat); root.add(stars);
    const dustPos = []; for (let i = 0; i < 72; i++) dustPos.push((i % 2 ? 1 : -1) * (4.3 + rand(i + 514) * 2.1), .45 + rand(i + 171) * 3.6, 15 - rand(i + 351) * 146);
    const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3)); owned.add(dustGeo);
    const dustMat = new THREE.PointsMaterial({color: '#fbc8c6', size: .043, transparent: true, opacity: .52, depthWrite: false, blending: THREE.AdditiveBlending}); materials.push(dustMat); const dust = new THREE.Points(dustGeo, dustMat); root.add(dust);
    // GPU batching keeps every animated transform alive without submitting its mesh.
    const map = new Map();
    for (const o of decorative) o.traverse(s => {
      if (!s.isMesh || s.isInstancedMesh || !s.visible || Array.isArray(s.material) || s.material.transparent || s.material.isShaderMaterial || s.isSkinnedMesh) return;
      const key = s.geometry.uuid + ':' + s.material.uuid; if (!map.has(key)) map.set(key, {geometry: s.geometry, material: s.material, sources: []}); map.get(key).sources.push(s);
    });
    let bakedSources = 0;
    for (const e of map.values()) {
      if (e.sources.length < 2) continue; const m = new THREE.InstancedMesh(e.geometry, e.material, e.sources.length); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; root.add(m);
      for (const s of e.sources) s.visible = false; batches.push({mesh: m, sources: e.sources, fullMaterial: e.material}); bakedSources += e.sources.length;
    }
    const inverse = new THREE.Matrix4(), matrix = new THREE.Matrix4();
    function syncBatches() {
      root.updateMatrixWorld(true); inverse.copy(root.matrixWorld).invert();
      for (const b of batches) { let count = 0; for (const s of b.sources) { let visible = true; for (let p = s.parent; p && p !== root; p = p.parent) if (!p.visible) { visible = false; break; }
          if (visible) { matrix.multiplyMatrices(inverse, s.matrixWorld); b.mesh.setMatrixAt(count++, matrix); } }
        b.mesh.count = count; b.mesh.visible = count > 0; b.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    syncBatches();
    const stats = {instancedMeshes: batches.length, bakedSources, activeBatches: batches.length, activeInstances: 0, reflectionSize: 384, reflectionCadence: 6};
    return {
      stats,
      update(dt, t, speed, distance, cheer = 0) {
        frameSerial++; skyMat.uniforms.time.value = t; starMat.uniforms.time.value = t;
        circuits.position.z = distance % 12; nodeMesh.position.z = circuits.position.z; if(circuitTraces)circuitTraces.position.z = circuits.position.z; dashed.position.z = distance % 6; directions.position.z = distance % 18;
        circuitMat.opacity = .50 + Math.sin(t * 1.45) * .045 + eventTint * .035; wet.offset.y = -(distance % 500) * .001; dust.position.z = distance % 20;
        if (reflection) reflection.material.uniforms.waveTime.value = t;
        for (const item of moving) {
          item.object.position.z += dt * speed * item.speedFactor; if (item.object.position.z > 29) item.object.position.z -= item.span;
          const z = item.object.position.z; let visible = z > -200;
          if (quality === 1) visible = z > (item.category === 'mountain' ? -195 : -162) && (item.category !== 'spectator' || item.seed % 4 !== 3);
          if (quality === 0) {
            // Important: no empty low-quality world. Retain every shop archetype,
            // all near mountains, crowds, lamps, lollipops and cotton candy.
            visible = z > (item.category === 'mountain' ? -170 : -112);
            if (item.category === 'spectator') visible = visible && item.seed % 3 !== 2;
            if (item.category === 'lamp') visible = visible && item.seed % 4 < 2;
          }
          item.object.visible = visible;
        }
        for (const s of crowd) {
          if (!s.object.visible) continue;
          if (typeof s.object.userData.animate === 'function') { s.object.userData.cheer = Math.max(s.object.userData.cheer || 0, cheer); s.object.userData.animate(t, dt, speed); }
          else if (s.update) s.update(t, cheer); else if (typeof s.object.userData.update === 'function') s.object.userData.update(t, cheer);
          s.object.position.y = Math.max(0, Math.sin(t * (3 + s.seed % 3 * .31) + s.seed * .8)) * (.05 + cheer * .25);
        }
        for (const a of animated) {
          if (a.kind === 'lollipop') a.object.rotation.z = Math.sin(t * .75 + a.seed) * .085;
          if (a.kind === 'island') { a.object.visible = quality === 2 || (quality === 0 ? a.seed === 0 || a.seed === 4 : a.seed < 3 || a.seed === 4); a.object.position.y = a.baseY + Math.sin(t * .52 + a.seed) * .38; a.object.rotation.z = Math.sin(t * .32 + a.seed) * .025; }
          if (a.kind === 'cloud') { a.object.visible = quality === 2 || (quality === 0 ? a.seed < 3 || a.seed === 10 || a.seed === 11 : a.seed < 7 || a.seed === 10 || a.seed === 11); a.object.position.x = a.baseX + Math.sin(t * .035 + a.seed) * 2; }
        }
        eventTint = Math.max(0, eventTint - dt * .12); syncBatches(); stats.activeBatches = 0; stats.activeInstances = 0;
        for (const b of batches) if (b.mesh.visible) { stats.activeBatches++; stats.activeInstances += b.mesh.count; }
      },
      event(eventId, intensity = 1) { eventTint = Math.min(1, intensity); },
      setQuality(level) {
        quality = Math.max(0, Math.min(2, Math.round(level))); starMat.uniforms.ratio.value = Math.min(window.devicePixelRatio || 1, quality === 0 ? 1 : 1.6);
        starGeo.setDrawRange(0, quality === 0 ? 65 : quality === 1 ? 110 : 150); dustGeo.setDrawRange(0, quality === 0 ? 28 : quality === 1 ? 48 : 72);
        nodeMesh.visible = quality > 0; dashed.count = quality === 0 ? 96 : quality === 1 ? 128 : 152;
        circuitGeometry.setDrawRange(0, quality === 0 ? 24 * 13 : Infinity);
        roadMat.opacity = quality === 0 ? .9 : .30; roadMat.roughness = quality === 0 ? .20 : .05;
        infrastructure.children[0].material = quality === 0 ? sceneryEcoMat : sceneryMat;
        for (const b of batches) if (b.fullMaterial === sceneryMat) b.mesh.material = quality === 0 ? sceneryEcoMat : sceneryMat;
        if (reflection) { reflection.visible = quality > 0; reflection.getRenderTarget().setSize(quality === 2 ? 384 : 256, quality === 2 ? 384 : 256); lastReflectionFrame = -100; }
        stats.reflectionSize = quality === 0 ? 0 : quality === 2 ? 384 : 256; stats.reflectionCadence = quality === 0 ? 0 : quality === 2 ? 6 : 9;
      },
      dispose() { scene.remove(root); for (const b of batches) b.mesh.dispose(); if (reflection) reflection.dispose(); owned.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); }
    };
  }
  return {create};
})();


// Original Canvas avatars for menu/selection only. Gameplay rendering stays Three.js.
// drawMochi, all fifteen interiors/accessories, and catalog copied verbatim from uploaded game(1).js.
const OriginalPortraits = (() => {
let t=0,DPR=1;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = n => Math.floor(Math.random() * n);
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbs = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const PAL = [
  { name: 'rosa', base: '#ff9cc8', light: '#ffe0ee', dark: '#ef6fa9', deep: '#c9508a' },
  { name: 'menta', base: '#7ee3c4', light: '#d8fbef', dark: '#45c49f', deep: '#2b9c7c' },
  { name: 'lila', base: '#b9a2f7', light: '#ece4ff', dark: '#8f72e6', deep: '#6b4fc6' },
].map(p => ({ ...p, rgb: hex2rgb(p.base), lrgb: hex2rgb(p.light), drgb: hex2rgb(p.dark), dprgb: hex2rgb(p.deep) }));
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const CH = [
  { id: 'mochi', name: 'Mochi', unlock: 0, ears: 'bunny', acc: null, inner: null, shape: { wf: 1, hf: 1, top: 0.36 },
    desc: 'Una bolita de gelatina curiosa y saltarina. ¡La de siempre!', interior: 'burbujitas' },
  { id: 'tiovivo', name: 'Tiovivo', unlock: 3000, ears: 'bear', acc: 'flag', inner: 'carousel', shape: { wf: 1.08, hf: 0.92, top: 0.42 },
    desc: 'Lleva una feria dentro y siempre está dando vueltas a las cosas.', interior: 'un tiovivo con caballitos' },
  { id: 'atomo', name: 'Átomo', unlock: 6000, ears: 'antenna', acc: null, inner: 'atom', shape: { wf: 0.96, hf: 1.04, top: 0.34 },
    desc: 'Pequeñito pero lleno de energía. Sus electrones no se están quietos.', interior: 'un átomo con electrones' },
  { id: 'cosmo', name: 'Cosmo', unlock: 10000, ears: 'none', acc: 'ring', inner: 'solar', shape: { wf: 1.02, hf: 1, top: 0.46 },
    desc: 'Tiene el sistema solar en la barriga. Muy soñador.', interior: 'el sistema solar' },
  { id: 'copito', name: 'Copito', unlock: 15000, ears: 'none', acc: 'beanie', inner: 'snow', shape: { wf: 1.04, hf: 0.97, top: 0.44 },
    desc: 'Una bola de nieve con patas. Le encantan el frío y los abrazos.', interior: 'una bola de nieve' },
  { id: 'burbuja', name: 'Burbuja', unlock: 22000, ears: 'fins', acc: null, inner: 'aquarium', shape: { wf: 1.04, hf: 0.98, top: 0.4 },
    desc: 'Un acuario andante con un pececito muy cotilla.', interior: 'un acuario con peces' },
  { id: 'lava', name: 'Lava', unlock: 30000, ears: 'none', acc: 'lampcap', inner: 'lava', shape: { wf: 0.9, hf: 1.12, top: 0.26 },
    desc: 'Tranquilo y retro. Sus burbujas de lava suben y bajan sin prisa.', interior: 'una lámpara de lava' },
  { id: 'tictac', name: 'Tictac', unlock: 40000, ears: 'bear', acc: 'key', inner: 'gears', shape: { wf: 1, hf: 1, top: 0.38 },
    desc: 'Puntual como nadie. Si pegas la oreja, hace tic-tac.', interior: 'engranajes de reloj' },
  { id: 'trueno', name: 'Trueno', unlock: 55000, ears: 'horns', acc: null, inner: 'storm', shape: { wf: 1, hf: 1.02, top: 0.4 },
    desc: 'Lleva una tormenta dentro… ¡pero es un trozo de pan!', interior: 'una tormenta con rayos' },
  { id: 'disco', name: 'Disco', unlock: 75000, ears: 'cat', acc: 'shades', inner: 'disco', shape: { wf: 1.02, hf: 1, top: 0.4 },
    desc: 'La fiesta va con él. ¡Que no pare la música!', interior: 'una bola de discoteca' },
  // ---- PREMIUM (solo compra, 0,99 €): borde holográfico, estela propia, baile en reposo y destello al cambiar de color
  { id: 'nebula', name: 'Nébula', premium: true, unlock: Infinity, ears: 'none', acc: 'crown', inner: 'galaxy', shape: { wf: 1.02, hf: 1.02, top: 0.42 },
    trail: [[190, 140, 255], [255, 255, 255], [120, 200, 255]], trailType: 'star',
    desc: 'Lleva una galaxia entera dentro… y un agujero negro que se lo traga todo.', interior: 'una galaxia con agujero negro' },
  { id: 'volcan', name: 'Volcán', premium: true, unlock: Infinity, ears: 'horns3d', acc: null, inner: 'volcano', shape: { wf: 1.06, hf: 0.98, top: 0.4 },
    trail: [[255, 150, 60], [255, 90, 60], [255, 220, 120]], trailType: 'spark',
    desc: 'Tiene un volcán en la tripa. Cuando se emociona, ¡erupción!', interior: 'un volcán en erupción' },
  { id: 'caramelo', name: 'Caramelo', premium: true, unlock: Infinity, ears: 'bear', acc: 'lolli', inner: 'candy', shape: { wf: 1.04, hf: 0.98, top: 0.4 },
    trail: [[255, 130, 190], [120, 220, 255], [255, 220, 90], [150, 240, 160]], trailType: 'confetti',
    desc: 'Una fábrica de golosinas con patas. Huele a fresa.', interior: 'una fábrica de caramelos' },
  { id: 'aurora', name: 'Aurora', premium: true, unlock: Infinity, ears: 'fins3d', acc: null, inner: 'aurora', shape: { wf: 1, hf: 1.04, top: 0.38 },
    trail: [[120, 255, 200], [140, 200, 255], [220, 160, 255]], trailType: 'spark',
    desc: 'Dentro es de noche: auroras boreales y una ballena que vuela.', interior: 'una aurora boreal con ballena' },
  { id: 'prisma', name: 'Prisma', premium: true, unlock: Infinity, ears: 'cat', acc: 'gem', inner: 'crystal', shape: { wf: 0.98, hf: 1.06, top: 0.3 },
    trail: [[255, 120, 120], [255, 220, 100], [120, 240, 160], [120, 180, 255], [210, 140, 255]], trailType: 'star',
    desc: 'Hecho de cristal mágico. Convierte la luz en arcoíris.', interior: 'una geoda de cristales arcoíris' },
];
const isPrem = i => !!(CH[i] && CH[i].premium);
// baile en reposo de los premium: cada ~3,5 s da un giro con saltito
function premIdle(T, i) {
  if (!isPrem(i)) return { sx: 1, lift: 0, rot: 0 };
  const ph = (T + i * 0.7) % 3.5;
  if (ph > 0.9) return { sx: 1, lift: 0, rot: Math.sin(T * 2) * 0.04 };
  const e = ph / 0.9;
  let c = Math.cos(e * Math.PI * 2); if (Math.abs(c) < 0.18) c = c < 0 ? -0.18 : 0.18;
  return { sx: c, lift: Math.sin(e * Math.PI), rot: 0 };
}
const NCH = CH.length;
// New friends use the same jelly brush and face as the original fifteen. The
// original CH entries and drawMochi renderer above/below remain unchanged.
const EXTRA = [
  ['neko','Neko','cat',0xffd8bc,0xffa6bb],['panda','Panda','bear',0xf4f2e9,0x6b667f],
  ['axolotl','Ajolote','none',0xffb3c7,0xf27f9f],['fox','Kitsune','cat',0xffbb83,0xffecd6],
  ['ghost','Fantasmín','none',0xddeaff,0xb3a5f6],['sun','Solito','none',0xffd67a,0xffaf75],
  ['moon','Lunita','none',0xc8bcf8,0xffe6a9],['astro','Astro','antenna',0xb8e5f4,0xffc6a0],
  ['robot','Bit','antenna',0xa7d5df,0xf8acbf],['dragon','Draculín','horns',0x91dcb4,0xe4b5ed],
  ['bee','Miel','antenna',0xffda83,0xa38572],['frog','Ranita','none',0x9edaa0,0xffc4bf],
  ['unicorn','Unicornio','cat',0xf2d9fa,0x95e4e7],['mushroom','Setita','none',0xffd9c8,0xef9da8],
  ['penguin','Pingü','fins',0x9bb3d6,0xffc38d],['octopus','Pulpi','none',0xcaa5ed,0xf7cfeb],
  ['angel','Angelito','none',0xffecd6,0xffdc93]
].map(([form,name,ears,color,accent],j)=>({id:form,name,ears,acc:null,inner:null,
  shape:{wf:form==='ghost'?1.02:1,hf:form==='robot'?.94:1,top:form==='robot'?.47:.36},
  form,color,accent,premium:['dragon','unicorn','angel'].includes(form),unlock:Infinity,
  rgb:[color>>16&255,color>>8&255,color&255],index:NCH+j}));
CH.push(...EXTRA);
const TOTAL=CH.length;
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

function gearPath(g, x, y, r, teeth, rot) {
  g.beginPath();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = rot + i / n * Math.PI * 2, k = i % 4, rr = (k === 1 || k === 2) ? r : r * 0.8;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}
// Interior animations. Local coords: origin at feet, y negative up. T = time.
const INNER = {
  carousel(g, w, h, T) {
    const cx = 0, cy = -h * 0.36, R = w * 0.3;
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5); gl.addColorStop(0, 'rgba(255,240,190,0.75)'); gl.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    // platform
    g.fillStyle = '#e9a94e'; g.beginPath(); g.ellipse(cx, cy + R * 0.66, R * 1.02, R * 0.26, 0, 0, 7); g.fill();
    g.fillStyle = '#ffd36b'; g.beginPath(); g.ellipse(cx, cy + R * 0.58, R, R * 0.24, 0, 0, 7); g.fill();
    const horses = [];
    for (let i = 0; i < 4; i++) {
      const a = T * 1.3 + i * Math.PI / 2, depth = Math.sin(a);
      horses.push({ a, depth, x: cx + Math.cos(a) * R * 0.78, y: cy + R * 0.12 + Math.sin(T * 4.5 + i * 1.7) * R * 0.12, col: ['#ff9cc8', '#7ee3c4', '#b9a2f7', '#ffb98a'][i] });
    }
    const drawHorse = hs => {
      const sc = 0.72 + 0.28 * (hs.depth + 1) / 2, dir = -Math.sin(hs.a) >= 0 ? 1 : -1;
      g.globalAlpha *= hs.depth < 0 ? 0.75 : 1;
      g.strokeStyle = '#fff6d8'; g.lineWidth = Math.max(1, R * 0.05); g.beginPath(); g.moveTo(hs.x, cy - R * 0.5); g.lineTo(hs.x, cy + R * 0.58); g.stroke();
      g.fillStyle = hs.col; g.beginPath(); g.ellipse(hs.x, hs.y, R * 0.24 * sc, R * 0.13 * sc, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(hs.x + dir * R * 0.22 * sc, hs.y - R * 0.12 * sc, R * 0.08 * sc, R * 0.12 * sc, dir * 0.5, 0, 7); g.fill();
      g.strokeStyle = hs.col; g.lineWidth = R * 0.05 * sc; g.lineCap = 'round'; g.beginPath();
      g.moveTo(hs.x - R * 0.12 * sc, hs.y + R * 0.08 * sc); g.lineTo(hs.x - R * 0.16 * sc, hs.y + R * 0.22 * sc);
      g.moveTo(hs.x + R * 0.12 * sc, hs.y + R * 0.08 * sc); g.lineTo(hs.x + R * 0.16 * sc, hs.y + R * 0.22 * sc); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(hs.x - dir * R * 0.25 * sc, hs.y - R * 0.04, R * 0.05 * sc, 0, 7); g.fill();
      g.globalAlpha /= hs.depth < 0 ? 0.75 : 1;
    };
    horses.filter(hs => hs.depth < 0).forEach(drawHorse);
    g.fillStyle = '#fff'; g.fillRect(cx - R * 0.06, cy - R * 0.55, R * 0.12, R * 1.15);
    g.fillStyle = '#ff9cc8'; for (let k = 0; k < 5; k++) g.fillRect(cx - R * 0.06, cy - R * 0.45 + k * R * 0.22, R * 0.12, R * 0.08);
    horses.filter(hs => hs.depth >= 0).forEach(drawHorse);
    // canopy with rotating stripes
    const by = cy - R * 0.52, ay = cy - R * 1.05;
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - R * 1.05, by); g.lineTo(cx, ay); g.lineTo(cx + R * 1.05, by); g.closePath(); g.fill();
    g.fillStyle = '#ff8fbf';
    for (let k = 0; k < 8; k++) {
      const a0 = k / 8 * Math.PI * 2 + T * 1.3, a1 = a0 + Math.PI / 8;
      if (Math.sin(a0 + Math.PI / 16) < 0) continue;
      g.beginPath(); g.moveTo(cx, ay); g.lineTo(cx + Math.cos(a0) * R * 1.05, by); g.lineTo(cx + Math.cos(a1) * R * 1.05, by); g.closePath(); g.fill();
    }
    for (let k = 0; k < 7; k++) {
      const x = cx - R * 0.9 + k * R * 0.3; g.fillStyle = k % 2 ? '#ffd36b' : '#ff8fbf'; g.beginPath(); g.arc(x, by, R * 0.13, 0, Math.PI); g.fill();
      g.fillStyle = `rgba(255,255,220,${0.5 + 0.5 * Math.sin(T * 6 + k)})`; g.beginPath(); g.arc(x, by + R * 0.16, R * 0.04, 0, 7); g.fill();
    }
  },
  atom(g, w, h, T) {
    const cx = 0, cy = -h * 0.34, R = w * 0.34;
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3); gl.addColorStop(0, 'rgba(200,240,255,0.7)'); gl.addColorStop(1, 'rgba(200,240,255,0)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    g.lineWidth = Math.max(1, w * 0.012);
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(cx, cy); g.rotate(i * Math.PI / 3 + T * 0.15);
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(0, 0, R, R * 0.3, 0, 0, 7); g.stroke();
      for (let k = 0; k < 5; k++) {
        const e = T * (2.4 + i * 0.35) + i * 2.1 - k * 0.12;
        const ex = Math.cos(e) * R, ey = Math.sin(e) * R * 0.3;
        g.fillStyle = k ? `rgba(120,220,255,${0.4 - k * 0.07})` : '#5fd0ff';
        g.beginPath(); g.arc(ex, ey, w * (k ? 0.03 - k * 0.004 : 0.042), 0, 7); g.fill();
        if (!k) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - w * 0.012, ey - w * 0.012, w * 0.013, 0, 7); g.fill(); }
      }
      g.restore();
    }
    const nuc = [[0, 0, 0], [0.13, 0.05, 1], [-0.12, 0.06, 1], [0.03, -0.13, 0], [-0.06, 0.13, 0], [0.1, -0.09, 1], [-0.11, -0.08, 0]];
    nuc.forEach(([x, y, k], i) => {
      const jx = Math.sin(T * 9 + i) * w * 0.004, px = cx + x * R + jx, py = cy + y * R;
      const gr = g.createRadialGradient(px - w * 0.015, py - w * 0.015, 1, px, py, w * 0.055);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, k ? '#ff7a95' : '#7ab0ff'); gr.addColorStop(1, k ? '#d94f75' : '#4f7fd9');
      g.fillStyle = gr; g.beginPath(); g.arc(px, py, w * 0.055, 0, 7); g.fill();
    });
  },
  solar(g, w, h, T) {
    const cx = 0, cy = -h * 0.36, R = w * 0.4;
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.7); bg.addColorStop(0, 'rgba(40,30,110,0.6)'); bg.addColorStop(1, 'rgba(30,20,80,0.25)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    g.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { g.globalAlpha *= 0.4 + 0.6 * Math.abs(Math.sin(T * 2 + i)); g.fillRect((hash(i, 1) - 0.5) * w, -h * hash(i, 2), 1.5, 1.5); g.globalAlpha /= 0.4 + 0.6 * Math.abs(Math.sin(T * 2 + i)); }
    const P = [[0.32, 2.4, 0.055, '#ffb3a3'], [0.52, 1.6, 0.075, '#7fd3ff'], [0.74, 1.05, 0.085, '#ffd36b', 1], [0.95, 0.7, 0.06, '#c3a8ff']];
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.28)';
    P.forEach(([o]) => { g.beginPath(); g.ellipse(cx, cy, R * o, R * o * 0.36, 0, 0, 7); g.stroke(); });
    const planet = ([o, sp, r, col, ring], a) => {
      const x = cx + Math.cos(a) * R * o, y = cy + Math.sin(a) * R * o * 0.36, rr = w * r * (0.85 + 0.15 * Math.sin(a));
      const gr = g.createRadialGradient(x - rr * 0.4, y - rr * 0.4, 1, x, y, rr); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, col); gr.addColorStop(1, rgbs(mix(hex2rgb(col), [40, 20, 80], 0.45)));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
      if (ring) { g.strokeStyle = 'rgba(255,230,180,0.9)'; g.lineWidth = Math.max(1, rr * 0.25); g.beginPath(); g.ellipse(x, y, rr * 1.7, rr * 0.45, -0.3, 0, 7); g.stroke(); }
    };
    const pl = P.map(p => ({ p, a: T * p[1] + p[0] * 9 }));
    pl.filter(o => Math.sin(o.a) < 0).forEach(o => planet(o.p, o.a));
    const sr = w * 0.11 * (1 + Math.sin(T * 3) * 0.04);
    const sg = g.createRadialGradient(cx, cy, 0, cx, cy, sr * 2.6); sg.addColorStop(0, 'rgba(255,240,150,0.9)'); sg.addColorStop(0.4, 'rgba(255,190,90,0.45)'); sg.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, sr * 2.6, 0, 7); g.fill();
    const s2 = g.createRadialGradient(cx - sr * 0.3, cy - sr * 0.3, 1, cx, cy, sr); s2.addColorStop(0, '#fffbe0'); s2.addColorStop(1, '#ffb34d');
    g.fillStyle = s2; g.beginPath(); g.arc(cx, cy, sr, 0, 7); g.fill();
    pl.filter(o => Math.sin(o.a) >= 0).forEach(o => planet(o.p, o.a));
  },
  snow(g, w, h, T) {
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, 'rgba(200,230,255,0.45)'); gl.addColorStop(1, 'rgba(230,245,255,0.2)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    // snowy ground with a pine and a snowman
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, -h * 0.08, w * 0.5, h * 0.14, 0, 0, 7); g.fill();
    g.fillStyle = '#5fbf8f'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-w * 0.2 - w * (0.11 - k * 0.025), -h * (0.16 + k * 0.09)); g.lineTo(-w * 0.2, -h * (0.3 + k * 0.09)); g.lineTo(-w * 0.2 + w * (0.11 - k * 0.025), -h * (0.16 + k * 0.09)); g.closePath(); g.fill(); }
    g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(-w * 0.2, -h * 0.49, w * 0.022, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.strokeStyle = 'rgba(150,170,210,0.6)'; g.lineWidth = 1;
    g.beginPath(); g.arc(w * 0.17, -h * 0.2, w * 0.075, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(w * 0.17, -h * 0.31, w * 0.052, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#ff9a5a'; g.beginPath(); g.moveTo(w * 0.17, -h * 0.31); g.lineTo(w * 0.23, -h * 0.3); g.lineTo(w * 0.17, -h * 0.295); g.fill();
    g.fillStyle = '#3d2348'; g.beginPath(); g.arc(w * 0.155, -h * 0.325, w * 0.008, 0, 7); g.arc(w * 0.19, -h * 0.325, w * 0.008, 0, 7); g.fill();
    // snowflakes
    for (let i = 0; i < 26; i++) {
      const sp = 0.12 + hash(i, 3) * 0.18, y = -h + ((hash(i, 4) + T * sp) % 1) * h * 0.95;
      const x = (hash(i, 5) - 0.5) * w * 0.9 + Math.sin(T * 1.6 + i) * w * 0.03, r = w * (0.008 + hash(i, 6) * 0.014);
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  },
  aquarium(g, w, h, T) {
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, 'rgba(140,220,255,0.35)'); gl.addColorStop(1, 'rgba(70,160,230,0.45)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    g.fillStyle = '#ffe2b8'; g.beginPath(); g.ellipse(0, -h * 0.04, w * 0.5, h * 0.1, 0, 0, 7); g.fill();
    g.lineCap = 'round';
    [[-0.25, 0.42, '#4fcf8f'], [0.28, 0.34, '#3fb57f'], [-0.08, 0.26, '#6fe0a8']].forEach(([x, hh, col], i) => {
      g.strokeStyle = col; g.lineWidth = w * 0.035; g.beginPath(); g.moveTo(w * x, -h * 0.06);
      g.quadraticCurveTo(w * x + Math.sin(T * 1.8 + i) * w * 0.08, -h * (0.06 + hh * 0.5), w * x + Math.sin(T * 1.8 + i + 1) * w * 0.05, -h * (0.06 + hh)); g.stroke();
    });
    const fish = (ph, sz, col, yy) => {
      const s = Math.sin(T * 0.75 + ph), x = s * w * 0.3, dir = Math.cos(T * 0.75 + ph) > 0 ? 1 : -1, y = -h * yy + Math.sin(T * 1.7 + ph) * h * 0.03;
      const r = w * sz, wag = Math.sin(T * 12 + ph) * 0.4;
      g.fillStyle = col;
      g.beginPath(); g.moveTo(x - dir * r * 0.8, y); g.lineTo(x - dir * r * 1.5, y - r * (0.5 + wag * 0.3)); g.lineTo(x - dir * r * 1.5, y + r * (0.5 - wag * 0.3)); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(x, y, r, r * 0.62, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(x - dir * r * 0.1, y - r * 0.25, r * 0.35, r * 0.15, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + dir * r * 0.45, y - r * 0.1, r * 0.2, 0, 7); g.fill();
      g.fillStyle = '#24142e'; g.beginPath(); g.arc(x + dir * r * 0.5, y - r * 0.1, r * 0.11, 0, 7); g.fill();
    };
    fish(0, 0.1, '#ff9a4d', 0.3); fish(2.3, 0.07, '#ffd34d', 0.45);
    for (let i = 0; i < 9; i++) {
      const sp = 0.25 + hash(i, 7) * 0.3, y = -((hash(i, 8) + T * sp) % 1) * h * 0.9, x = (hash(i, 9) - 0.5) * w * 0.7 + Math.sin(T * 3 + i) * w * 0.02;
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, w * (0.012 + hash(i, 10) * 0.018), 0, 7); g.stroke();
    }
  },
  lava(g, w, h, T) {
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, 'rgba(120,60,170,0.45)'); gl.addColorStop(1, 'rgba(255,120,140,0.4)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    const cols = [['#ffe07a', '#ff9a3c'], ['#ff9ac8', '#ff5a8a'], ['#ffc06b', '#ff7a4d']];
    g.fillStyle = '#ff8a5a'; g.beginPath(); g.ellipse(0, -h * 0.05, w * 0.45, h * 0.1, 0, 0, 7); g.fill();
    for (let i = 0; i < 6; i++) {
      const ph = i * 1.9, sp = 0.32 + hash(i, 11) * 0.25, u = (Math.sin(T * sp + ph) + 1) / 2;
      const vy = Math.cos(T * sp + ph);
      const x = (hash(i, 12) - 0.5) * w * 0.5 + Math.sin(T * 0.4 + i) * w * 0.05, y = -h * (0.1 + u * 0.72), r = w * (0.07 + hash(i, 13) * 0.06);
      const c = cols[i % 3], gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r * 1.1);
      gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]);
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * (1 - Math.abs(vy) * 0.12), r * (1 + Math.abs(vy) * 0.2), 0, 0, 7); g.fill();
    }
  },
  gears(g, w, h, T) {
    const gl = g.createRadialGradient(0, -h * 0.35, 0, 0, -h * 0.35, w * 0.5); gl.addColorStop(0, 'rgba(255,245,215,0.65)'); gl.addColorStop(1, 'rgba(255,245,215,0.1)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    const G = [[-0.12, 0.36, 0.2, 10, 1, '#ffd36b', '#d9a23a'], [0.17, 0.27, 0.13, 7, -10 / 7, '#e6e0f5', '#a99bc9'], [0.12, 0.52, 0.1, 6, -10 / 6, '#ffb98a', '#d98a5a']];
    G.forEach(([x, y, r, n, ratio, c1, c2], i) => {
      const px = w * x, py = -h * y, rr = w * r, rot = T * 0.9 * ratio + i * 0.3;
      gearPath(g, px, py, rr, n, rot); g.fillStyle = c1; g.fill(); g.strokeStyle = c2; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = c2; g.beginPath(); g.arc(px, py, rr * 0.3, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(px - rr * 0.25, py - rr * 0.3, rr * 0.12, 0, 7); g.fill();
    });
    // pendulum
    const a = Math.sin(T * 3.2) * 0.45, px = 0, py = -h * 0.2, L = h * 0.13;
    g.strokeStyle = '#a99bc9'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.sin(a) * L, py + Math.cos(a) * L); g.stroke();
    g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(px + Math.sin(a) * L, py + Math.cos(a) * L, w * 0.04, 0, 7); g.fill();
  },
  storm(g, w, h, T) {
    const cyc = T % 2.4, fl = cyc < 0.22;
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, fl ? 'rgba(255,255,230,0.55)' : 'rgba(80,90,150,0.45)'); gl.addColorStop(1, 'rgba(120,140,200,0.25)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    // rain
    g.strokeStyle = 'rgba(200,230,255,0.85)'; g.lineWidth = Math.max(1, w * 0.012); g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i < 14; i++) { const y = -h * 0.55 + ((hash(i, 14) + T * 1.4) % 1) * h * 0.52, x = (hash(i, 15) - 0.5) * w * 0.7; g.moveTo(x, y); g.lineTo(x - w * 0.02, y + h * 0.05); }
    g.stroke();
    if (fl) {
      const bx = (hash(Math.floor(T / 2.4), 3) - 0.5) * w * 0.3;
      g.strokeStyle = '#fff36b'; g.lineWidth = w * 0.03; g.lineJoin = 'round'; g.beginPath(); g.moveTo(bx, -h * 0.52); g.lineTo(bx - w * 0.07, -h * 0.36); g.lineTo(bx + w * 0.03, -h * 0.34); g.lineTo(bx - w * 0.05, -h * 0.12); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = w * 0.012; g.stroke();
    }
    // cloud
    const cy = -h * 0.56;
    g.fillStyle = fl ? '#d9d6ff' : '#8e8fc4';
    [[-0.16, 0, 0.11], [0, -0.05, 0.14], [0.16, 0, 0.11], [0.05, 0.03, 0.12], [-0.06, 0.03, 0.11]].forEach(([x, y, r]) => { g.beginPath(); g.arc(w * x + Math.sin(T + x * 9) * w * 0.01, cy + h * y, w * r, 0, 7); g.fill(); });
  },
  disco(g, w, h, T) {
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, 'rgba(60,30,110,0.5)'); gl.addColorStop(1, 'rgba(110,50,140,0.35)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    const cols = ['#ff7ac0', '#7ef0d0', '#ffe36b', '#9fb4ff', '#ffa26b'];
    for (let i = 0; i < 7; i++) {
      const a = T * (0.8 + i * 0.13) + i * 1.3, x = Math.cos(a) * w * 0.32, y = -h * 0.42 + Math.sin(a * 1.3) * h * 0.3;
      g.fillStyle = cols[i % 5]; g.globalAlpha *= 0.55; g.beginPath(); g.arc(x, y, w * 0.05, 0, 7); g.fill(); g.globalAlpha /= 0.55;
    }
    const cx = 0, cy = -h * 0.36, r = w * 0.19;
    g.strokeStyle = 'rgba(220,220,240,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx, -h * 0.98); g.stroke();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
    g.fillStyle = '#9a95b8'; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    const ts = r / 3.2, off = (T * r * 0.9) % ts, fr = Math.floor(T * 5);
    for (let yy = -4; yy <= 4; yy++) for (let xx = -5; xx <= 5; xx++) {
      const hv = hash(xx * 7 + Math.floor((T * r * 0.9) / ts), yy * 13 + fr * 0.0001);
      const b = 150 + hv * 105 | 0; g.fillStyle = hv > 0.93 ? '#ffffff' : `rgb(${b},${b},${Math.min(255, b + 30)})`;
      g.fillRect(cx + xx * ts + off - ts / 2 + 0.6, cy + yy * ts - ts / 2 + 0.6, ts - 1.2, ts - 1.2);
    }
    const sh = g.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 1, cx, cy, r * 1.1); sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(1, 'rgba(40,20,80,0.55)');
    g.fillStyle = sh; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
    for (let i = 0; i < 4; i++) { const tw = Math.max(0, Math.sin(T * 5 + i * 2)); if (tw < 0.3) continue; const x = cx + Math.cos(i * 2.2) * r * 0.7, y = cy + Math.sin(i * 1.7) * r * 0.7, s = w * 0.04 * tw; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.25, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.25, y); g.closePath(); g.moveTo(x - s, y); g.lineTo(x, y + s * 0.25); g.lineTo(x + s, y); g.lineTo(x, y - s * 0.25); g.closePath(); g.fill(); }
  },

  // ===== PREMIUM interiors =====
  galaxy(g, w, h, T) {
    const cx = 0, cy = -h * 0.42, R = w * 0.46;
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.75); bg.addColorStop(0, 'rgba(120,80,190,0.35)'); bg.addColorStop(1, 'rgba(70,50,140,0.18)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    for (let i = 0; i < 14; i++) { const tw = 0.3 + 0.7 * Math.abs(Math.sin(T * 2.3 + i * 1.7)); g.fillStyle = `rgba(255,255,255,${tw})`; g.fillRect((hash(i, 7) - 0.5) * w, -h * hash(i, 8), 1.6, 1.6); }
    // spiral arms of stars being swallowed
    g.save(); g.translate(cx, cy); g.scale(1, 0.55);
    for (let arm = 0; arm < 3; arm++) {
      for (let k = 0; k < 16; k++) {
        const f = ((k / 16) + T * 0.12) % 1, rr2 = R * (1 - f) * 1.05 + R * 0.12, a = arm * 2.094 + f * 5.2 + T * 0.9;
        const col = arm === 0 ? '255,170,240' : arm === 1 ? '150,190,255' : '200,150,255';
        g.fillStyle = `rgba(${col},${0.25 + 0.6 * (1 - f)})`;
        g.beginPath(); g.arc(Math.cos(a) * rr2, Math.sin(a) * rr2, w * (0.012 + 0.022 * (1 - f)), 0, 7); g.fill();
      }
    }
    // accretion disk
    const dk = g.createRadialGradient(0, 0, w * 0.06, 0, 0, w * 0.2); dk.addColorStop(0, 'rgba(255,230,160,0.95)'); dk.addColorStop(0.5, 'rgba(255,120,200,0.6)'); dk.addColorStop(1, 'rgba(160,90,255,0)');
    g.fillStyle = dk; g.beginPath(); g.arc(0, 0, w * 0.2, 0, 7); g.fill();
    g.restore();
    g.fillStyle = '#1a0a2e'; g.beginPath(); g.arc(cx, cy, w * 0.05 * (1 + Math.sin(T * 3) * 0.05), 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,240,200,0.9)'; g.lineWidth = Math.max(1, w * 0.012); g.beginPath(); g.arc(cx, cy, w * 0.056, 0, 7); g.stroke();
  },
  volcano(g, w, h, T) {
    const sky = g.createLinearGradient(0, -h, 0, 0); sky.addColorStop(0, 'rgba(255,170,120,0.45)'); sky.addColorStop(1, 'rgba(255,90,80,0.35)');
    g.fillStyle = sky; g.fillRect(-w, -h, w * 2, h);
    const top = -h * 0.42, er = (T % 2.6) / 2.6, boom = er < 0.35 ? er / 0.35 : 0;
    // smoke puffs
    for (let i = 0; i < 4; i++) { const f = ((T * 0.25 + i / 4) % 1); g.fillStyle = `rgba(120,90,110,${0.45 * (1 - f)})`; g.beginPath(); g.arc(Math.sin(i * 2 + T) * w * 0.08 + f * w * 0.12, top - f * h * 0.45, w * (0.05 + f * 0.1), 0, 7); g.fill(); }
    // mountain
    const mg = g.createLinearGradient(0, top, 0, 0); mg.addColorStop(0, '#8a4a5c'); mg.addColorStop(1, '#5a2d48');
    g.fillStyle = mg; g.beginPath(); g.moveTo(-w * 0.55, 0); g.lineTo(-w * 0.1, top); g.lineTo(w * 0.1, top); g.lineTo(w * 0.55, 0); g.closePath(); g.fill();
    // lava rivers
    g.strokeStyle = '#ff8a3a'; g.lineWidth = w * 0.035; g.lineCap = 'round';
    const flow = 0.4 + 0.6 * Math.min(1, er * 3);
    g.beginPath(); g.moveTo(-w * 0.04, top); g.quadraticCurveTo(-w * 0.12, top * 0.6, -w * 0.2, top * (1 - flow * 0.85)); g.stroke();
    g.beginPath(); g.moveTo(w * 0.05, top); g.quadraticCurveTo(w * 0.15, top * 0.5, w * 0.24, top * (1 - flow * 0.75)); g.stroke();
    const cg = g.createRadialGradient(0, top, 0, 0, top, w * 0.22); cg.addColorStop(0, `rgba(255,230,120,${0.6 + boom * 0.4})`); cg.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = cg; g.beginPath(); g.arc(0, top, w * 0.22, 0, 7); g.fill();
    // lava bombs
    for (let i = 0; i < 9; i++) {
      const lt = (T * 0.9 + hash(i, 11)) % 1, vx = (hash(i, 12) - 0.5) * w * 0.7, vy = h * (0.55 + hash(i, 13) * 0.35);
      const x = vx * lt, y = top - vy * lt + h * 0.9 * lt * lt;
      if (y > top + h * 0.05) continue;
      g.fillStyle = i % 2 ? '#ffd36b' : '#ff6a3a'; g.beginPath(); g.arc(x, y, w * (0.02 + 0.015 * hash(i, 14)), 0, 7); g.fill();
    }
  },
  candy(g, w, h, T) {
    const bg = g.createLinearGradient(0, -h, 0, 0); bg.addColorStop(0, 'rgba(255,220,240,0.5)'); bg.addColorStop(1, 'rgba(255,180,220,0.45)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    // pipes with gear
    g.fillStyle = '#c9b6ff'; g.fillRect(-w * 0.3, -h * 0.82, w * 0.12, h * 0.3); g.fillRect(-w * 0.3, -h * 0.55, w * 0.25, h * 0.08);
    g.fillStyle = '#ffd36b'; gearPath(g, w * 0.22, -h * 0.66, w * 0.12, 8, T * 1.5); g.fill();
    g.fillStyle = '#ffb3d1'; g.beginPath(); g.arc(w * 0.22, -h * 0.66, w * 0.04, 0, 7); g.fill();
    // conveyor belt
    const by = -h * 0.28;
    g.fillStyle = '#7a5aa8'; rr(g, -w * 0.5, by, w, h * 0.07, h * 0.035); g.fill();
    g.fillStyle = '#b79be0'; for (let k = 0; k < 7; k++) { const x = -w * 0.5 + ((k / 7 + T * 0.3) % 1) * w; g.fillRect(x, by + h * 0.02, w * 0.04, h * 0.03); }
    const cols = ['#ff7ab0', '#7fd3ff', '#ffd36b', '#8ff0a8', '#c3a8ff'];
    for (let k = 0; k < 5; k++) {
      const x = -w * 0.55 + ((k / 5 + T * 0.3) % 1) * w * 1.1, y = by - w * 0.045, c = cols[k];
      if (k % 2) { g.fillStyle = c; g.beginPath(); g.arc(x, y, w * 0.045, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - w * 0.045, y); g.lineTo(x - w * 0.09, y - w * 0.03); g.lineTo(x - w * 0.09, y + w * 0.03); g.moveTo(x + w * 0.045, y); g.lineTo(x + w * 0.09, y - w * 0.03); g.lineTo(x + w * 0.09, y + w * 0.03); g.fill(); }
      else { g.strokeStyle = '#fff'; g.lineWidth = w * 0.015; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - w * 0.12); g.stroke(); g.fillStyle = c; g.beginPath(); g.arc(x, y - w * 0.14, w * 0.05, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x, y - w * 0.14, w * 0.025, T * 3, T * 3 + 4); g.stroke(); }
    }
    // candies dropping from pipe
    for (let i = 0; i < 3; i++) { const f = (T * 0.8 + i / 3) % 1; g.fillStyle = cols[i]; g.beginPath(); g.arc(-w * 0.1 + Math.sin(i) * w * 0.02, -h * 0.5 + f * h * 0.2, w * 0.03, 0, 7); g.fill(); }
    // sugar sparkles
    for (let i = 0; i < 6; i++) { const tw = Math.max(0, Math.sin(T * 4 + i * 1.3)); g.fillStyle = `rgba(255,255,255,${tw})`; g.beginPath(); g.arc((hash(i, 21) - 0.5) * w * 0.8, -h * (0.15 + hash(i, 22) * 0.7), w * 0.015, 0, 7); g.fill(); }
  },
  aurora(g, w, h, T) {
    const bg = g.createLinearGradient(0, -h, 0, 0); bg.addColorStop(0, 'rgba(50,70,140,0.4)'); bg.addColorStop(1, 'rgba(80,120,170,0.25)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * Math.abs(Math.sin(T * 1.7 + i))})`; g.fillRect((hash(i, 31) - 0.5) * w, -h * (0.4 + hash(i, 32) * 0.6), 1.5, 1.5); }
    // aurora ribbons
    const rib = [['120,255,200', -0.72, 0], ['140,190,255', -0.6, 1.7], ['220,150,255', -0.8, 3.1]];
    g.lineCap = 'round';
    rib.forEach(([c, yy, ph]) => {
      for (let L = 0; L < 3; L++) {
        g.strokeStyle = `rgba(${c},${0.18 - L * 0.04})`; g.lineWidth = w * (0.16 - L * 0.04);
        g.beginPath();
        for (let k = 0; k <= 10; k++) { const x = -w * 0.55 + k * w * 0.11, y = h * yy + Math.sin(k * 0.8 + T * 1.4 + ph) * h * 0.06 - L * h * 0.03; k ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
    });
    // flying whale
    const wx = Math.sin(T * 0.5) * w * 0.18, wy = -h * 0.38 + Math.sin(T * 1.1) * h * 0.04, dir = Math.cos(T * 0.5) >= 0 ? 1 : -1;
    g.save(); g.translate(wx, wy); g.scale(dir, 1);
    g.fillStyle = '#6f8fe0'; g.beginPath(); g.ellipse(0, 0, w * 0.2, w * 0.1, 0, 0, 7); g.fill();
    g.fillStyle = '#cfe0ff'; g.beginPath(); g.ellipse(w * 0.02, w * 0.04, w * 0.15, w * 0.05, 0, 0, Math.PI); g.fill();
    const tf = Math.sin(T * 4) * w * 0.04;
    g.fillStyle = '#6f8fe0'; g.beginPath(); g.moveTo(-w * 0.18, 0); g.lineTo(-w * 0.3, -w * 0.07 + tf); g.lineTo(-w * 0.27, w * 0.03 + tf); g.closePath(); g.fill();
    g.fillStyle = '#1f1a3a'; g.beginPath(); g.arc(w * 0.12, -w * 0.02, w * 0.017, 0, 7); g.fill();
    g.restore();
    // spout
    for (let i = 0; i < 3; i++) { const f = (T * 1.2 + i / 3) % 1; g.fillStyle = `rgba(200,240,255,${0.8 * (1 - f)})`; g.beginPath(); g.arc(wx + dir * w * 0.06 + (i - 1) * w * 0.03 * f, wy - w * 0.1 - f * h * 0.15, w * 0.02, 0, 7); g.fill(); }
    // snowy hills
    g.fillStyle = 'rgba(230,245,255,0.9)'; g.beginPath(); g.ellipse(-w * 0.2, -h * 0.02, w * 0.4, h * 0.12, 0, Math.PI, 0); g.ellipse(w * 0.25, 0, w * 0.35, h * 0.09, 0, Math.PI, 0); g.fill();
  },
  crystal(g, w, h, T) {
    const bg = g.createRadialGradient(0, -h * 0.4, 0, 0, -h * 0.4, w * 0.7); bg.addColorStop(0, 'rgba(255,255,255,0.55)'); bg.addColorStop(1, 'rgba(200,180,255,0.35)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    // rotating rainbow beams
    g.save(); g.translate(0, -h * 0.5); g.rotate(T * 0.6);
    const rc = ['255,110,110', '255,200,90', '120,235,150', '110,180,255', '200,130,255', '255,130,210'];
    for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.fillStyle = `rgba(${rc[k]},0.28)`; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.7, -w * 0.08); g.lineTo(w * 0.7, w * 0.08); g.closePath(); g.fill(); }
    g.restore();
    // crystal cluster
    const cr = [[-0.22, 0.42, -0.35, '#b9a2f7'], [0.2, 0.46, 0.3, '#7fd3ff'], [0, 0.62, 0, '#ff9cc8'], [-0.08, 0.34, -0.12, '#8ff0d0'], [0.12, 0.36, 0.15, '#ffd36b']];
    cr.forEach(([x, hh, a, c], i) => {
      g.save(); g.translate(w * x, -h * 0.06); g.rotate(a);
      const cw2 = w * 0.08, ch2 = h * hh;
      const gr = g.createLinearGradient(-cw2, 0, cw2, 0); gr.addColorStop(0, c); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, c);
      g.fillStyle = gr; g.globalAlpha *= 0.85;
      g.beginPath(); g.moveTo(-cw2, 0); g.lineTo(-cw2, -ch2 * 0.75); g.lineTo(0, -ch2); g.lineTo(cw2, -ch2 * 0.75); g.lineTo(cw2, 0); g.closePath(); g.fill();
      g.globalAlpha /= 0.85;
      const sh = (T * 0.8 + i * 0.3) % 2; if (sh < 1) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-cw2, -ch2 * sh, cw2 * 2, ch2 * 0.06); }
      g.restore();
    });
    for (let i = 0; i < 4; i++) { const tw = Math.max(0, Math.sin(T * 5 + i * 2)); if (tw < 0.3) continue; const x = (hash(i, 41) - 0.5) * w * 0.7, y = -h * (0.3 + hash(i, 42) * 0.5), s2 = w * 0.05 * tw; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - s2); g.lineTo(x + s2 * 0.25, y); g.lineTo(x, y + s2); g.lineTo(x - s2 * 0.25, y); g.closePath(); g.moveTo(x - s2, y); g.lineTo(x, y + s2 * 0.25); g.lineTo(x + s2, y); g.lineTo(x, y - s2 * 0.25); g.closePath(); g.fill(); }
  },
};


// ================= mini motor 3D (proyección + sombreado plano) para accesorios premium =================
const L3 = (() => { const v = [-0.45, -0.65, 0.62], n = Math.hypot(...v); return v.map(a => a / n); })();
const H3 = (() => { const v = [L3[0], L3[1], L3[2] + 1], n = Math.hypot(...v); return v.map(a => a / n); })();
function rot3(p, o) {
  let [x, y, z] = p;
  if (o.ry) { const c = Math.cos(o.ry), s = Math.sin(o.ry); [x, z] = [x * c + z * s, -x * s + z * c]; }
  if (o.rx) { const c = Math.cos(o.rx), s = Math.sin(o.rx); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (o.rz) { const c = Math.cos(o.rz), s = Math.sin(o.rz); [x, y] = [x * c - y * s, x * s + y * c]; }
  return [x, y, z];
}
// V: vértices [x,y,z] (y hacia abajo, z hacia la cámara). F: {v:[índices], ref:[x,y,z]?, ...}. o: {x,y,s,rx,ry,rz,cull,shade(face,lum,nz,i)}
function mesh3d(g, V, F, o) {
  const P = V.map(p => rot3(p, o));
  const S = P.map(([x, y, z]) => { const f = 1 / (1 - z * 0.12); return [o.x + x * o.s * f, o.y + y * o.s * f]; });
  const cen = o.center ? rot3(o.center, o) : [0, 0, 0];
  const list = [];
  F.forEach((f, i) => {
    const a = P[f.v[0]], b = P[f.v[1]], c = P[f.v[f.v.length > 3 ? 2 : 2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const nl = Math.hypot(...n) || 1; n = n.map(q => q / nl);
    let cx = 0, cy = 0, cz = 0; f.v.forEach(k => { cx += P[k][0]; cy += P[k][1]; cz += P[k][2]; }); const m = f.v.length; cx /= m; cy /= m; cz /= m;
    const r = f.ref ? rot3(f.ref, o) : cen;
    if (n[0] * (cx - r[0]) + n[1] * (cy - r[1]) + n[2] * (cz - r[2]) < 0) n = n.map(q => -q);
    if (o.cull !== false && n[2] < -0.02) return;
    const lum = Math.max(0, n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2]);
    const spec = Math.pow(Math.max(0, n[0] * H3[0] + n[1] * H3[1] + n[2] * H3[2]), 18);
    list.push({ i, f, z: cz, lum, spec, nz: n[2] });
  });
  list.sort((p, q) => p.z - q.z);
  g.lineJoin = 'round';
  for (const it of list) {
    g.beginPath(); it.f.v.forEach((k, j) => j ? g.lineTo(S[k][0], S[k][1]) : g.moveTo(S[k][0], S[k][1])); g.closePath();
    const c = o.shade(it.f, it.lum, it.nz, it.i, it.spec);
    g.fillStyle = c; g.fill(); g.strokeStyle = c; g.lineWidth = 0.6; g.stroke();
  }
  return { P, S };
}
const shadeRGB = (rgb, lum, amb = 0.38, spec = 0) => { const k = amb + (1 - amb) * lum; return `rgb(${Math.min(255, rgb[0] * k + spec * 255) | 0},${Math.min(255, rgb[1] * k + spec * 255) | 0},${Math.min(255, rgb[2] * k + spec * 255) | 0})`; };
// --- mallas
const MESH = {};
(function () {
  // diamante talla brillante: mesa, corona, filetín y pabellón
  const N = 8, V = [], F = [];
  for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * Math.PI * 2; V.push([Math.cos(a) * 0.55, -0.42, Math.sin(a) * 0.55]); } // mesa 0..7
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a), -0.1, Math.sin(a)]); }               // filetín 8..15
  V.push([0, 1.05, 0]);                                                                                                  // culet 16
  F.push({ v: [0, 1, 2, 3, 4, 5, 6, 7], k: 'table' });
  for (let i = 0; i < N; i++) {
    const t0 = i, t1 = (i + 1) % N, g0 = N + i, g1 = N + (i + 1) % N;
    F.push({ v: [t0, g1, t1], k: 'crown' }); F.push({ v: [t0, g0, g1], k: 'star' });
    F.push({ v: [g0, 16, g1], k: 'pav' });
  }
  MESH.diamond = { V, F, center: [0, 0.2, 0] };
})();
(function () {
  // corona: banda abierta con picos
  const N = 10, V = [], F = [];
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a), 0, Math.sin(a)]); }
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a) * 1.04, i % 2 ? -0.55 : -1.05, Math.sin(a) * 1.04]); }
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; F.push({ v: [i, j, N + j, N + i], ref: [0, -0.4, 0] }); }
  MESH.crown = { V, F, center: [0, -0.4, 0] };
})();
(function () {
  // piruleta: disco con grosor
  const N = 16, V = [], F = [], th = 0.22;
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a), Math.sin(a), th]); }
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a), Math.sin(a), -th]); }
  F.push({ v: [...Array(N).keys()], k: 'capF' }); F.push({ v: [...Array(N).keys()].map(i => N + i).reverse(), k: 'capB' });
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; F.push({ v: [i, j, N + j, N + i], k: 'side', s: i }); }
  MESH.lolli = { V, F, center: [0, 0, 0] };
})();
(function () {
  // aleta: perfil extruido
  const pr = [[0, -0.35], [0.55, -0.62], [1.05, -0.5], [0.85, 0.05], [0.95, 0.45], [0, 0.35]], th = 0.07, V = [], F = [], n = pr.length;
  pr.forEach(([x, y]) => V.push([x, y, th])); pr.forEach(([x, y]) => V.push([x, y, -th]));
  F.push({ v: [...Array(n).keys()], k: 'face' }); F.push({ v: [...Array(n).keys()].map(i => n + i), k: 'face' });
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; F.push({ v: [i, j, n + j, n + i], k: 'edge', ref: [0.5, 0, 0] }); }
  MESH.fin = { V, F, center: [0.5, 0, 0] };
})();
const hornCache = {};
function hornMesh(sd) {
  if (hornCache[sd]) return hornCache[sd];
  const K = 7, M = 8, V = [], F = [];
  const C = t => [sd * 0.55 * t * t, -1.1 * t, 0.12 * t];
  for (let k = 0; k <= K; k++) {
    const t = k / K, c = C(t), c2 = C(Math.min(1, t + 0.01)), c1 = C(Math.max(0, t - 0.01));
    let T = [c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]]; const tl = Math.hypot(...T); T = T.map(q => q / tl);
    let u = [T[1], -T[0], 0]; const ul = Math.hypot(...u); u = u.map(q => q / ul);
    const v = [T[1] * u[2] - T[2] * u[1], T[2] * u[0] - T[0] * u[2], T[0] * u[1] - T[1] * u[0]];
    const r = 0.3 * (1 - t) + 0.025;
    for (let m = 0; m < M; m++) { const a = m / M * Math.PI * 2; V.push([c[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r, c[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r, c[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r]); }
  }
  for (let k = 0; k < K; k++) for (let m = 0; m < M; m++) { const m2 = (m + 1) % M; F.push({ v: [k * M + m, k * M + m2, (k + 1) * M + m2, (k + 1) * M + m], k, m, ref: C((k + 0.5) / K) }); }
  return hornCache[sd] = { V, F, K };
}
function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return [f(0), f(8), f(4)]; }
function sparkle(g, x, y, s2, a = 1) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.moveTo(x, y - s2); g.lineTo(x + s2 * 0.22, y); g.lineTo(x, y + s2); g.lineTo(x - s2 * 0.22, y); g.closePath(); g.moveTo(x - s2, y); g.lineTo(x, y + s2 * 0.22); g.lineTo(x + s2, y); g.lineTo(x, y - s2 * 0.22); g.closePath(); g.fill(); }

// x,y = feet point; size = body width in px; m.ch = character index
function drawMochi(g, x, y, size, m) {
  const C = CH[m.ch || 0], S = C.shape;
  const col = m.rgb, light = mix(col, [255, 255, 255], 0.65), dark = mix(col, [170, 70, 150], 0.2), deep = mix(col, [90, 30, 100], 0.45);
  const w = size * S.wf, h = size * 0.95 * S.hf, T = m.T != null ? m.T : t;
  const hasIn = !!C.inner && !m.solid;
  g.save();
  g.translate(x, y);
  g.rotate(m.rot || 0);
  g.scale(m.sx, m.sy);
  g.globalAlpha = m.alpha == null ? 1 : m.alpha;
  const A0 = g.globalAlpha;
  const body = () => {
    const tp = S.top;
    g.beginPath();
    g.moveTo(0, -h);
    g.bezierCurveTo(w * tp, -h, w * 0.5, -h * 0.62, w * 0.5, -h * 0.3);
    g.bezierCurveTo(w * 0.5, -h * 0.02, w * 0.3, -h * 0.02, 0, -h * 0.03);
    g.bezierCurveTo(-w * 0.3, -h * 0.02, -w * 0.5, -h * 0.02, -w * 0.5, -h * 0.3);
    g.bezierCurveTo(-w * 0.5, -h * 0.62, -w * tp, -h, 0, -h);
    g.closePath();
  };
  const fillJelly = (path, a = 1) => { g.fillStyle = rgbs(col, a); path(); g.fill(); };
  // ---- ears / back accessories
  g.lineCap = 'round';
  if (C.ears === 'bunny') {
    const ear = (side, ang) => {
      const bx = side * w * 0.2, by = -h * 0.84, L = w * 0.62;
      const a1 = ang, a2 = ang + side * (m.earBend || 0.5);
      const c1x = bx + Math.sin(a1) * L * 0.55, c1y = by - Math.cos(a1) * L * 0.55;
      const ex = c1x + Math.sin(a2) * L * 0.5, ey = c1y - Math.cos(a2) * L * 0.5;
      const curve = () => { g.beginPath(); g.moveTo(bx, by + h * 0.06); g.quadraticCurveTo(c1x, c1y, ex, ey); };
      curve(); g.strokeStyle = rgbs(deep, 0.55); g.lineWidth = w * 0.2 + 3; g.stroke();
      g.fillStyle = rgbs(deep, 0.55); g.beginPath(); g.arc(ex, ey, w * 0.12 + 1.5, 0, 7); g.fill();
      curve(); g.strokeStyle = rgbs(col); g.lineWidth = w * 0.2; g.stroke();
      g.fillStyle = rgbs(col); g.beginPath(); g.arc(ex, ey, w * 0.12, 0, 7); g.fill();
      g.beginPath(); g.moveTo(bx - side * w * 0.02, by - h * 0.02); g.quadraticCurveTo(c1x - side * w * 0.03, c1y, lerp(c1x, ex, 0.75) - side * w * 0.02, lerp(c1y, ey, 0.75));
      g.strokeStyle = rgbs(light, 0.8); g.lineWidth = w * 0.06; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(ex - side * w * 0.03, ey - w * 0.04, w * 0.035, w * 0.022, -0.5 * side, 0, 7); g.fill();
    };
    ear(-1, m.earL); ear(1, m.earR);
  } else if (C.ears === 'bear') {
    for (const sd of [-1, 1]) {
      const wob = (sd < 0 ? m.earL + 0.45 : m.earR - 0.45) * 0.25;
      const ex = sd * w * 0.3 + wob * w * 0.2, ey = -h * 0.86;
      g.fillStyle = rgbs(deep, 0.55); g.beginPath(); g.arc(ex, ey, w * 0.14 + 1.5, 0, 7); g.fill();
      g.fillStyle = rgbs(col); g.beginPath(); g.arc(ex, ey, w * 0.14, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,170,200,0.7)'; g.beginPath(); g.arc(ex, ey + w * 0.01, w * 0.075, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(ex - w * 0.05, ey - w * 0.05, w * 0.025, 0, 7); g.fill();
    }
  } else if (C.ears === 'cat') {
    for (const sd of [-1, 1]) {
      const wob = (sd < 0 ? m.earL + 0.45 : m.earR - 0.45) * 0.15;
      g.save(); g.translate(sd * w * 0.26, -h * 0.82); g.rotate(sd * 0.35 + wob);
      g.beginPath(); g.moveTo(-w * 0.13, 0); g.quadraticCurveTo(-w * 0.04, -w * 0.3, 0, -w * 0.3); g.quadraticCurveTo(w * 0.04, -w * 0.3, w * 0.13, 0); g.closePath();
      g.fillStyle = rgbs(col); g.fill(); g.strokeStyle = rgbs(deep, 0.5); g.lineWidth = 1.5; g.stroke();
      g.fillStyle = 'rgba(255,170,200,0.65)'; g.beginPath(); g.moveTo(-w * 0.06, -w * 0.02); g.quadraticCurveTo(0, -w * 0.22, w * 0.06, -w * 0.02); g.closePath(); g.fill();
      g.restore();
    }
  } else if (C.ears === 'antenna') {
    for (const sd of [-1, 1]) {
      const a = (sd < 0 ? m.earL : m.earR) * 0.8, bx = sd * w * 0.14, by = -h * 0.92, L = w * 0.42;
      const ex = bx + Math.sin(a) * L, ey = by - Math.cos(a) * L;
      g.strokeStyle = rgbs(deep, 0.7); g.lineWidth = w * 0.035; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.sin(a) * L * 0.3, by - L * 0.6, ex, ey); g.stroke();
      const gr = g.createRadialGradient(ex - w * 0.02, ey - w * 0.02, 1, ex, ey, w * 0.08); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#7fe8ff'); gr.addColorStop(1, 'rgba(90,200,255,0.2)');
      g.fillStyle = gr; g.beginPath(); g.arc(ex, ey, w * 0.08, 0, 7); g.fill();
    }
  } else if (C.ears === 'fins') {
    for (const sd of [-1, 1]) {
      const a = Math.sin(T * 6 + sd) * 0.2;
      g.save(); g.translate(sd * w * 0.46, -h * 0.5); g.rotate(sd * (0.7 + a));
      g.beginPath(); g.moveTo(0, -w * 0.08); g.quadraticCurveTo(sd * w * 0.25, -w * 0.12, sd * w * 0.22, w * 0.1); g.quadraticCurveTo(sd * w * 0.1, w * 0.02, 0, w * 0.08); g.closePath();
      g.fillStyle = rgbs(dark, 0.95); g.fill(); g.restore();
    }
    g.beginPath(); g.moveTo(-w * 0.12, -h * 0.94); g.quadraticCurveTo(w * 0.02 + Math.sin(T * 4) * w * 0.03, -h * 1.22, w * 0.16, -h * 0.95); g.closePath(); g.fillStyle = rgbs(dark, 0.95); g.fill();
  } else if (C.ears === 'horns3d') {
    for (const sd of [-1, 1]) {
      const hm = hornMesh(sd), sway = Math.sin(T * 2.2 + sd) * 0.12;
      const glow = 0.6 + 0.4 * Math.sin(T * 5 + sd * 2);
      mesh3d(g, hm.V, hm.F, { x: sd * w * 0.2, y: -h * 0.86, s: w * 0.36, ry: sd * 0.35 + Math.sin(T * 1.3) * 0.25, rx: 0.15, rz: sway, shade: (f, lum, nz, i, sp) => {
        if (f.k < hm.K - 1 && (f.m + f.k * 3) % 5 === 0) return shadeRGB([255, 110 + 90 * glow, 40], 0.7 + 0.3 * glow, 0.9);
        const t = f.k / hm.K; return shadeRGB([150 + 90 * t, 80 + 120 * t, 90 + 20 * t], lum, 0.45, sp * 0.7);
      } });
    }
  } else if (C.ears === 'fins3d') {
    const base = mix(mix(col, [90, 200, 255], 0.45), [255, 255, 255], 0.15);
    for (const sd of [-1, 1]) {
      const flap = 0.5 + Math.sin(T * 5 + sd * 0.6) * 0.55;
      g.save(); g.translate(sd * w * 0.42, -h * 0.52); g.scale(sd, 1);
      mesh3d(g, MESH.fin.V, MESH.fin.F, { x: 0, y: 0, s: w * 0.3, ry: -flap, rz: -0.35, rx: 0.2, center: MESH.fin.center, cull: false, shade: (f, lum, nz, i, sp) => f.k === 'edge' ? shadeRGB(mix(base, [255, 255, 255], 0.5), lum, 0.45) : shadeRGB(nz > 0 ? mix(base, [140, 255, 220], 0.35) : base, lum, 0.4, sp * 0.5) });
      g.restore();
    }
    g.save(); g.translate(0, -h * 0.94);
    mesh3d(g, MESH.fin.V, MESH.fin.F, { x: 0, y: 0, s: w * 0.24, ry: 1.5 + Math.sin(T * 4) * 0.35, rz: -1.4, cull: false, center: MESH.fin.center, shade: (f, lum, nz, i, sp) => shadeRGB(f.k === 'edge' ? mix(base, [255, 255, 255], 0.5) : base, lum, 0.4, sp * 0.5) });
    g.restore();
  } else if (C.ears === 'horns') {
    for (const sd of [-1, 1]) {
      g.save(); g.translate(sd * w * 0.22, -h * 0.9); g.rotate(sd * 0.3);
      g.beginPath(); g.moveTo(-w * 0.07, 0); g.lineTo(-w * 0.02, -w * 0.13); g.lineTo(-w * 0.07, -w * 0.13); g.lineTo(w * 0.02, -w * 0.28); g.lineTo(0, -w * 0.15); g.lineTo(w * 0.05, -w * 0.15); g.lineTo(w * 0.07, 0); g.closePath();
      g.fillStyle = '#ffe36b'; g.fill(); g.strokeStyle = '#e0a83a'; g.lineWidth = 1.5; g.stroke(); g.restore();
    }
  }
  if (C.acc === 'ring') { g.strokeStyle = 'rgba(255,214,140,0.9)'; g.lineWidth = w * 0.045; g.beginPath(); g.ellipse(0, -h * 0.8, w * 0.62, w * 0.14, -0.15, Math.PI, Math.PI * 2); g.stroke(); }
  // ---- feet
  const fl = m.foot || 0;
  g.fillStyle = rgbs(dark);
  g.beginPath(); g.ellipse(-w * 0.2, -h * 0.05 - Math.max(0, fl) * h * 0.08, w * 0.15, h * 0.085, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(w * 0.2, -h * 0.05 - Math.max(0, -fl) * h * 0.08, w * 0.15, h * 0.085, 0, 0, 7); g.fill();
  // ---- body (more transparent when it has an interior)
  body();
  const bg = g.createRadialGradient(-w * 0.15, -h * 0.72, w * 0.05, 0, -h * 0.45, h * 0.75);
  const ba = hasIn ? 0.5 : 1;
  bg.addColorStop(0, rgbs(light, ba)); bg.addColorStop(0.45, rgbs(col, ba)); bg.addColorStop(1, rgbs(dark, hasIn ? 0.75 : 1));
  g.fillStyle = bg; g.fill();
  g.save(); body(); g.clip();
  if (hasIn && !m.noInner) {
    INNER[C.inner](g, w, h, T);
    g.globalAlpha = A0;
    // jelly tint over the interior so it keeps the colour
    g.fillStyle = rgbs(col, C.premium ? 0.36 : 0.24); g.fillRect(-w, -h * 1.1, w * 2, h * 1.2);
    if (C.premium) { const eg = g.createRadialGradient(0, -h * 0.45, w * 0.2, 0, -h * 0.45, w * 0.62); eg.addColorStop(0, rgbs(col, 0)); eg.addColorStop(1, rgbs(light, 0.5)); g.fillStyle = eg; g.fillRect(-w, -h * 1.1, w * 2, h * 1.2); }
  }
  const ig = g.createRadialGradient(w * 0.05, -h * 0.12, 0, w * 0.05, -h * 0.12, w * 0.45);
  ig.addColorStop(0, rgbs(light, hasIn ? 0.35 : 0.55)); ig.addColorStop(1, rgbs(light, 0));
  g.fillStyle = ig; g.fillRect(-w, -h, w * 2, h);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = w * 0.05;
  g.beginPath(); g.arc(w * 0.0, -h * 0.45, w * 0.47, -0.5, 0.6); g.stroke();
  // edge darkening for a glassy rim
  if (hasIn) { body(); g.strokeStyle = rgbs(dark, 0.55); g.lineWidth = w * 0.07; g.stroke(); }
  g.restore();
  body(); g.lineWidth = Math.max(1.5, w * 0.025); g.strokeStyle = rgbs(deep, 0.5); g.stroke();
  if (C.premium && !m.noInner) {
    // luz de borde fina en el color activo (sustituye al borde arcoíris)
    g.save(); body(); g.clip();
    body(); g.lineWidth = Math.max(3, w * 0.11); g.strokeStyle = rgbs(mix(col, [255, 255, 255], 0.35), 0.55); g.stroke();
    g.restore();
    body(); g.lineWidth = Math.max(1.5, w * 0.03); g.strokeStyle = rgbs(dark, 0.9); g.stroke();
    const sg2 = g.createRadialGradient(-w * 0.2, -h * 0.74, 0, -w * 0.2, -h * 0.74, w * 0.28); sg2.addColorStop(0, 'rgba(255,255,255,0.55)'); sg2.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg2; g.beginPath(); g.arc(-w * 0.2, -h * 0.74, w * 0.28, 0, 7); g.fill();
    const sa = T * 1.8, spx = Math.cos(sa) * w * 0.48, spy = -h * 0.5 + Math.sin(sa) * h * 0.47, ss = w * 0.06 * (0.6 + 0.4 * Math.sin(T * 7));
    g.fillStyle = rgbs(mix(col, [255, 255, 255], 0.55)); g.beginPath(); g.moveTo(spx, spy - ss); g.lineTo(spx + ss * 0.25, spy); g.lineTo(spx, spy + ss); g.lineTo(spx - ss * 0.25, spy); g.closePath(); g.moveTo(spx - ss, spy); g.lineTo(spx, spy + ss * 0.25); g.lineTo(spx + ss, spy); g.lineTo(spx, spy - ss * 0.25); g.closePath(); g.fill();
  }
  // ---- arms
  const as = m.arm || 0;
  g.fillStyle = rgbs(mix(col, light, 0.25), 0.9); g.strokeStyle = rgbs(deep, 0.25); g.lineWidth = Math.max(1, w * 0.012);
  if (m.armsUp) {
    g.beginPath(); g.ellipse(-w * 0.43, -h * 0.62, w * 0.075, h * 0.11, -0.45, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(w * 0.43, -h * 0.62, w * 0.075, h * 0.11, 0.45, 0, 7); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.ellipse(-w * 0.33, -h * 0.2 - as * h * 0.04, w * 0.075, h * 0.05, 0.9 + as * 0.25, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(w * 0.33, -h * 0.2 + as * h * 0.04, w * 0.075, h * 0.05, -0.9 + as * 0.25, 0, 7); g.fill(); g.stroke();
  }
  // ---- gloss
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath(); g.ellipse(-w * 0.23, -h * 0.76, w * 0.1, w * 0.045, -0.75, 0, 7); g.fill();
  g.beginPath(); g.arc(-w * 0.33, -h * 0.62, w * 0.025, 0, 7); g.fill();
  if (!hasIn) {
    g.fillStyle = 'rgba(255,255,255,0.55)';
    [[0.3, 0.7, 0.018], [0.36, 0.22, 0.014], [-0.38, 0.25, 0.016], [0.12, 0.86, 0.012], [0.4, 0.5, 0.012]].forEach(([bx, by, br]) => { g.beginPath(); g.arc(w * bx, -h * by, w * br, 0, 7); g.fill(); });
  }
  // ---- front accessories (head)
  if (C.acc === 'ring') { g.strokeStyle = 'rgba(255,220,150,1)'; g.lineWidth = w * 0.045; g.beginPath(); g.ellipse(0, -h * 0.8, w * 0.62, w * 0.14, -0.15, 0, Math.PI); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-w * 0.45, -h * 0.74 + w * 0.05, w * 0.025, 0, 7); g.fill(); }
  else if (C.acc === 'beanie') {
    const by = -h * 0.84;
    g.fillStyle = '#ff8fbf'; g.beginPath(); g.moveTo(-w * 0.36, by); g.bezierCurveTo(-w * 0.34, -h * 1.12, w * 0.34, -h * 1.12, w * 0.36, by); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = w * 0.02; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * w * 0.12, by); g.quadraticCurveTo(k * w * 0.1, by - h * 0.12, k * w * 0.06, by - h * 0.2); g.stroke(); }
    g.fillStyle = '#fff'; rr(g, -w * 0.4, by - h * 0.05, w * 0.8, h * 0.1, h * 0.05); g.fill();
    const pb = Math.sin(T * 5) * w * 0.02; g.beginPath(); g.arc(pb, -h * 1.1, w * 0.09, 0, 7); g.fill();
  } else if (C.acc === 'lampcap') {
    const gr = g.createLinearGradient(-w * 0.2, 0, w * 0.2, 0); gr.addColorStop(0, '#b9b4cc'); gr.addColorStop(0.4, '#f4f2fb'); gr.addColorStop(1, '#8f8aa8');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-w * 0.22, -h * 0.94); g.lineTo(-w * 0.13, -h * 1.12); g.lineTo(w * 0.13, -h * 1.12); g.lineTo(w * 0.22, -h * 0.94); g.closePath(); g.fill();
  } else if (C.acc === 'key') {
    g.save(); g.translate(0, -h * 0.98); g.scale(Math.cos(T * 2.5), 1);
    g.fillStyle = '#ffd36b'; g.strokeStyle = '#d9a23a'; g.lineWidth = 1.5;
    g.fillRect(-w * 0.025, -h * 0.12, w * 0.05, h * 0.12);
    g.beginPath(); g.ellipse(-w * 0.1, -h * 0.17, w * 0.09, w * 0.07, 0, 0, 7); g.ellipse(w * 0.1, -h * 0.17, w * 0.09, w * 0.07, 0, 0, 7); g.fill(); g.stroke();
    g.restore();
  } else if (C.acc === 'flag') {
    g.strokeStyle = rgbs(deep, 0.7); g.lineWidth = 2; g.beginPath(); g.moveTo(0, -h * 0.98); g.lineTo(0, -h * 1.25); g.stroke();
    g.fillStyle = '#ff7ab0'; g.beginPath(); g.moveTo(0, -h * 1.25); g.quadraticCurveTo(w * 0.1, -h * 1.22 + Math.sin(T * 8) * h * 0.02, w * 0.18, -h * 1.2); g.lineTo(0, -h * 1.14); g.closePath(); g.fill();
  }
  if (C.acc === 'crown') {
    const bob = Math.sin(T * 3) * h * 0.015, gold = [255, 196, 70];
    const r = mesh3d(g, MESH.crown.V, MESH.crown.F, { x: 0, y: -h * 0.9 + bob, s: w * 0.22, ry: T * 1.1, rx: 0.42, cull: false, center: MESH.crown.center,
      shade: (f, lum, nz, i, sp) => nz < 0 ? shadeRGB([235, 160, 60], lum, 0.55) : shadeRGB(gold, lum, 0.7, sp) });
    const gc = [[255, 90, 150], [90, 200, 255], [120, 230, 150]];
    for (let k = 0; k < 10; k += 2) { const a = k / 10 * Math.PI * 2, p = rot3([Math.cos(a) * 1.06, -0.32, Math.sin(a) * 1.06], { ry: T * 1.1, rx: 0.42 }); if (p[2] < 0) continue;
      const x = r.S[0][0] - r.S[0][0] + p[0] * w * 0.2, y = -h * 0.9 + bob + p[1] * w * 0.2, rr2 = w * 0.032 * (0.6 + 0.4 * p[2]);
      const c = gc[(k / 2) % 3], gg = g.createRadialGradient(x - rr2 * 0.3, y - rr2 * 0.3, 0, x, y, rr2); gg.addColorStop(0, '#fff'); gg.addColorStop(0.35, rgbs(c)); gg.addColorStop(1, rgbs(mix(c, [40, 20, 60], 0.5)));
      g.fillStyle = gg; g.beginPath(); g.arc(x, y, rr2, 0, 7); g.fill(); }
    if (Math.sin(T * 3.3) > 0.7) sparkle(g, w * 0.12, -h * 1.05 + bob, w * 0.05);
  } else if (C.acc === 'lolli') {
    g.save(); g.translate(w * 0.34, -h * 0.88); g.rotate(0.35 + Math.sin(T * 3) * 0.08);
    g.strokeStyle = '#d8d0e8'; g.lineWidth = Math.max(2, w * 0.035); g.lineCap = 'round'; g.beginPath(); g.moveTo(0, h * 0.02); g.lineTo(0, -h * 0.22); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, w * 0.014); g.beginPath(); g.moveTo(-w * 0.006, h * 0.01); g.lineTo(-w * 0.006, -h * 0.2); g.stroke();
    const o = { x: 0, y: -h * 0.31, s: w * 0.14, ry: T * 2.2, rx: 0.15, center: [0, 0, 0] };
    mesh3d(g, MESH.lolli.V, MESH.lolli.F, { ...o, shade: (f, lum, nz, i, sp) => f.k === 'side' ? shadeRGB(f.s % 2 ? [255, 255, 255] : [255, 110, 170], lum, 0.45) : shadeRGB([255, 120, 180], lum, 0.5, sp) });
    for (const zc of [0.22, -0.22]) {
      if (rot3([0, 0, 1], o)[2] * Math.sign(zc) <= 0) continue;
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = Math.max(1, w * 0.022); g.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.25) { const r2 = 0.92 * a / (Math.PI * 5), q = rot3([Math.cos(a) * r2, Math.sin(a) * r2, zc * 1.02], o), f = 1 / (1 - q[2] * 0.12); const X = q[0] * o.s * f, Y = o.y + q[1] * o.s * f; a ? g.lineTo(X, Y) : g.moveTo(X, Y); }
      g.stroke();
    }
    g.restore();
  } else if (C.acc === 'gem') {
    const gy = -h * 1.24 + Math.sin(T * 2.5) * h * 0.03, ry = T * 1.4;
    // sombra/halo bajo el diamante
    const hg = g.createRadialGradient(0, gy, 0, 0, gy, w * 0.24); hg.addColorStop(0, 'rgba(255,255,255,0.55)'); hg.addColorStop(1, 'rgba(200,180,255,0)');
    g.fillStyle = hg; g.beginPath(); g.arc(0, gy, w * 0.24, 0, 7); g.fill();
    const D = MESH.diamond;
    mesh3d(g, D.V, D.F, { x: 0, y: gy, s: w * 0.21, ry, rx: -0.4, rz: Math.sin(T * 1.7) * 0.08, center: D.center, shade: (f, lum, nz, i, sp) => {
      const hue = (i * 47 + T * 90) % 360;
      if (f.k === 'table') return shadeRGB(mix(hsl2rgb(hue, 0.5, 0.85), [255, 255, 255], 0.5), lum, 0.6, sp);
      const base = f.k === 'pav' ? hsl2rgb(hue + 180, 0.8, 0.75) : hsl2rgb(hue, 0.7, 0.85);
      return shadeRGB(mix(base, [230, 240, 255], 0.12), 0.35 + lum * 0.65, f.k === 'pav' ? 0.62 : 0.7, sp * 0.9 + (Math.sin(T * 6 + i * 1.3) > 0.93 ? 0.6 : 0));
    } });
    for (let k = 0; k < 3; k++) { const tw = Math.sin(T * 4 + k * 2.1); if (tw > 0.4) sparkle(g, Math.cos(k * 2.4 + T) * w * 0.15, gy + Math.sin(k * 1.9) * w * 0.12, w * 0.05 * tw); }
  }
  // ---- face
  const fy = -h * 0.52, look = m.look || 0, lookX = m.lookX || 0;
  const ex = w * 0.17, erx = w * 0.085, ery = w * 0.105;
  if (m.dead) {
    g.strokeStyle = '#4a2a55'; g.lineWidth = w * 0.035; g.lineCap = 'round';
    for (const sd of [-1, 1]) { const cx = sd * ex; g.beginPath(); g.moveTo(cx - erx * 0.7, fy - erx * 0.7); g.lineTo(cx + erx * 0.7, fy + erx * 0.7); g.moveTo(cx + erx * 0.7, fy - erx * 0.7); g.lineTo(cx - erx * 0.7, fy + erx * 0.7); g.stroke(); }
  } else {
    const bl = m.blink || 0;
    for (const sd of [-1, 1]) {
      const cx = sd * ex + lookX * w * 0.02, cy = fy + look * h * 0.025;
      if (bl > 0.85 || m.happy) {
        g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.03; g.lineCap = 'round';
        g.beginPath(); if (m.happy) g.arc(cx, cy + ery * 0.2, erx * 0.8, Math.PI * 1.15, Math.PI * 1.85); else { g.moveTo(cx - erx, cy + ery * 0.2); g.quadraticCurveTo(cx, cy + ery * 0.6, cx + erx, cy + ery * 0.2); }
        g.stroke();
      } else {
        const ry = ery * (1 - bl);
        const eg = g.createLinearGradient(0, cy - ry, 0, cy + ry);
        eg.addColorStop(0, '#24142e'); eg.addColorStop(0.6, '#3a2246'); eg.addColorStop(1, '#7a4f9a');
        g.fillStyle = eg; g.beginPath(); g.ellipse(cx, cy, erx, ry, 0, 0, 7); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(cx - erx * 0.3, cy - ry * 0.38, erx * 0.38, ry * 0.32, -0.3, 0, 7); g.fill();
        g.beginPath(); g.arc(cx + erx * 0.35, cy + ry * 0.38, erx * 0.16, 0, 7); g.fill();
      }
    }
    if (C.acc === 'shades') {
      // heart/star party glasses
      const star = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.55 : r; i ? g.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2) : g.moveTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } g.closePath(); };
      for (const sd of [-1, 1]) { star(sd * ex, fy, w * 0.13); g.fillStyle = 'rgba(255,90,170,0.55)'; g.fill(); g.strokeStyle = '#ff4fa0'; g.lineWidth = w * 0.025; g.stroke(); }
      g.beginPath(); g.moveTo(-ex + w * 0.11, fy - w * 0.02); g.quadraticCurveTo(0, fy - w * 0.06, ex - w * 0.11, fy - w * 0.02); g.stroke();
    }
    if (C.id === 'tictac') { g.strokeStyle = '#d9a23a'; g.lineWidth = w * 0.018; g.beginPath(); g.arc(ex, fy, w * 0.12, 0, 7); g.stroke(); g.beginPath(); g.moveTo(ex + w * 0.1, fy + w * 0.07); g.quadraticCurveTo(ex + w * 0.2, fy + w * 0.2, ex + w * 0.15, fy + w * 0.3); g.stroke(); }
  }
  g.fillStyle = 'rgba(255,110,150,0.42)';
  g.beginPath(); g.ellipse(-w * 0.3, fy + h * 0.1, w * 0.07, w * 0.04, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(w * 0.3, fy + h * 0.1, w * 0.07, w * 0.04, 0, 0, 7); g.fill();
  const my = fy + h * 0.1 + (m.look || 0) * h * 0.015;
  if (m.dead) {
    g.strokeStyle = '#4a2a55'; g.lineWidth = w * 0.025; g.beginPath();
    g.moveTo(-w * 0.06, my + w * 0.02); g.quadraticCurveTo(-w * 0.03, my - w * 0.01, 0, my + w * 0.02); g.quadraticCurveTo(w * 0.03, my + w * 0.05, w * 0.06, my + w * 0.02); g.stroke();
  } else if (m.mouth === 'o') {
    g.fillStyle = '#7a2a48'; g.beginPath(); g.ellipse(0, my + w * 0.02, w * 0.035, w * 0.045, 0, 0, 7); g.fill();
  } else {
    const mw = w * 0.05;
    g.fillStyle = '#7a2a48'; g.beginPath(); g.moveTo(-mw, my); g.quadraticCurveTo(0, my + mw * 0.15, mw, my); g.quadraticCurveTo(mw * 0.9, my + mw * 1.4, 0, my + mw * 1.4); g.quadraticCurveTo(-mw * 0.9, my + mw * 1.4, -mw, my); g.fill();
    g.fillStyle = '#ff8fae'; g.beginPath(); g.ellipse(0, my + mw * 1.05, mw * 0.5, mw * 0.32, 0, 0, 7); g.fill();
  }
  g.restore();
}
let silCanvas = null;
function drawSilhouette(g, x, y, size, ch, col) {
  const s = Math.ceil(size * 2.2 * DPR);
  if (!silCanvas || silCanvas.width < s) silCanvas = mkCanvas(s, s);
  const sg = silCanvas.getContext('2d');
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, silCanvas.width, silCanvas.height); sg.globalCompositeOperation = 'source-over';
  sg.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawMochi(sg, size * 1.1, size * 1.75, size, { ch, rgb: [200, 200, 200], sx: 1, sy: 1, rot: 0, earL: -0.45, earR: 0.45, earBend: 0.55, foot: 0, arm: 0, blink: 0, look: 0, lookX: 0, noInner: true, T: 0 });
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col || 'rgba(110,80,150,0.85)'; sg.fillRect(0, 0, s, s);
  sg.globalCompositeOperation = 'source-over';
  g.drawImage(silCanvas, 0, 0, s, s, x - size * 1.1, y - size * 1.75, s / DPR, s / DPR);
}


const thumbCache = {};
function thumbImg(i, size, un) {
  const key = i + ':' + Math.round(size) + ':' + (un ? 1 : 0) + ':' + DPR;
  if (thumbCache[key]) return thumbCache[key];
  const s2 = Math.ceil(size * 2.2 * DPR), c = mkCanvas(s2, s2), g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (un && i>=NCH) draw(g,size*1.1,size*1.75,size,i,1.3,{focused:false});
  else if (un) drawMochi(g, size * 1.1, size * 1.75, size, { ch: i, T: 1.3, rgb: PAL[i % 3].rgb, sx: 1, sy: 1, rot: 0, earL: -0.45, earR: 0.45, earBend: 0.55, foot: 0, arm: 0, blink: 0, look: 0.2, lookX: 0 });
  else drawSilhouette(g, size * 1.1, size * 1.75, size, i, 'rgba(150,120,190,0.6)');
  return thumbCache[key] = c;
}

  function extraDecoration(g,x,y,size,ch,time,m,back=false) {
    const C=CH[ch];if(!C?.form)return;
    const f=C.form,w=size*C.shape.wf,h=size*.95*C.shape.hf;
    const col='#'+C.color.toString(16).padStart(6,'0'),ac='#'+C.accent.toString(16).padStart(6,'0');
    g.save();g.translate(x,y);g.rotate(m.rot||0);g.scale(m.sx,m.sy);
    g.lineCap='round';g.lineJoin='round';g.lineWidth=Math.max(1.4,w*.018);
    const oval=(xx,yy,rx,ry,fill,rotation=0)=>{g.fillStyle=fill;g.beginPath();g.ellipse(xx*w,yy*h,rx*w,ry*h,rotation,0,Math.PI*2);g.fill();};
    const line=(pts,fill,stroke)=>{g.beginPath();pts.forEach(([xx,yy],i)=>i?g.lineTo(xx*w,yy*h):g.moveTo(xx*w,yy*h));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.stroke();}};
    const star=(xx,yy,r,fill)=>{const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=r*(i%2?.43:1);pts.push([xx+Math.cos(a)*rad,yy+Math.sin(a)*rad]);}line(pts,fill);};
    if(back){
      if(['bee','angel','dragon'].includes(f))for(const s of [-1,1]){
        if(f==='dragon')line([[s*.4,-.68],[s*.86,-.94],[s*.76,-.56],[s*.83,-.38],[s*.4,-.42]],ac,'#85b7a1');
        else {oval(s*.48,-.64,.24,.22,f==='bee'?'rgba(245,253,255,.82)':'#fff8f0',s*(.22+Math.sin(time*5)*.1));oval(s*.61,-.48,.16,.12,'rgba(255,255,255,.73)',s*.5);}
      }
      if(f==='axolotl')for(const s of [-1,1])for(let i=0;i<3;i++){
        const a=(i-1)*.52+s*Math.sin(time*4+i)*.08,bx=s*.4,by=-.67+i*.105;
        line([[bx,by],[bx+s*.26,by+Math.sin(a)*.22],[bx+s*.24,by+Math.sin(a)*.22+.06]],ac);
        oval(bx+s*.27,by+Math.sin(a)*.22,.058,.075,'#ffe0e8');
      }
      if(f==='sun')for(let i=0;i<12;i++){const a=i*Math.PI/6+Math.sin(time*.7)*.04;g.save();g.translate(Math.cos(a)*w*.51,-h*.49+Math.sin(a)*h*.51);g.rotate(a);rr(g,0,-w*.047,w*.18,w*.095,w*.045);g.fillStyle=ac;g.fill();g.restore();}
      if(f==='fox'){g.save();g.translate(w*.4,-h*.24);g.rotate(-.35+Math.sin(time*3)*.08);g.beginPath();g.moveTo(0,0);g.bezierCurveTo(w*.5,-h*.01,w*.56,-h*.55,w*.25,-h*.66);g.bezierCurveTo(w*.34,-h*.42,w*.26,-h*.25,0,-h*.08);g.closePath();g.fillStyle=col;g.fill();g.beginPath();g.moveTo(w*.25,-h*.66);g.quadraticCurveTo(w*.45,-h*.58,w*.4,-h*.44);g.lineTo(w*.28,-h*.48);g.closePath();g.fillStyle=ac;g.fill();g.restore();}
      if(f==='frog')for(const s of [-1,1]){oval(s*.28,-.98,.165,.18,col);oval(s*.28,-1.03,.105,.09,'#f2fff0');oval(s*.28,-1.04,.044,.06,'#3d5343');oval(s*.298,-1.06,.015,.02,'#fff');}
      if(f==='octopus')for(let i=0;i<8;i++){const a=i/7*Math.PI-.05,xx=Math.cos(a)*.48,yy=-.1+Math.sin(a)*.13;oval(xx,yy,.13,.09,col,-.3+Math.sin(time*4+i)*.2);oval(xx,yy+.015,.08,.03,'rgba(255,239,255,.6)');}
      if(f==='panda')for(const s of [-1,1]){oval(s*.3,-.89,.15,.14,'#66617d');oval(s*.3,-.92,.05,.04,'#b4acc6');}
      g.restore();return;
    }
    if(f==='neko'){g.strokeStyle='#b39082';for(const s of [-1,1])for(let i=0;i<2;i++){g.beginPath();g.moveTo(s*w*.31,-h*(.44+i*.06));g.lineTo(s*w*.48,-h*(.45+i*.07));g.stroke();}oval(0,-.18,.25,.045,ac);oval(0,-.13,.062,.062,'#ffd779');g.strokeStyle='#b58d43';g.beginPath();g.moveTo(0,-h*.155);g.lineTo(0,-h*.11);g.stroke();}
    if(f==='panda'){for(const s of [-1,1]){oval(s*.17,-.514,.122,.14,'rgba(83,72,108,.65)',s*.2);oval(s*.17,-.52,.077,.087,'#31253e');oval(s*.194,-.55,.025,.03,'#fff');}oval(0,-.34,.038,.024,'#544359');g.strokeStyle='#a5cd86';g.lineWidth=w*.025;g.beginPath();g.moveTo(w*.38,-h*.1);g.lineTo(w*.42,-h*.61);g.stroke();for(let i=0;i<3;i++)oval(.39+i*.012,-.22-i*.13,.075,.027,'#a5d69a',-.4);}
    if(f==='fox'||f==='penguin'){oval(0,-.38,.3,.26,f==='fox'?'rgba(255,244,226,.8)':'rgba(250,251,255,.7)');for(const s of [-1,1]){oval(s*.17,-.5,.055,.072,'#3d2f46');oval(s*.183,-.53,.015,.02,'#fff');}if(f==='penguin')line([[0,-.43],[-.085,-.36],[0,-.31],[.085,-.36]],ac);else oval(0,-.39,.039,.026,'#635055');}
    if(f==='ghost')for(let i=0;i<4;i++)oval((i-1.5)*.21,-.037+Math.sin(time*3+i)*.02,.115,.078,'#dce9ff');
    if(f==='moon'){g.save();g.translate(w*.25,-h*1.13);g.rotate(-.3);g.fillStyle=ac;g.beginPath();g.moveTo(w*.073,-w*.152);g.bezierCurveTo(-w*.2,-w*.18,-w*.22,w*.18,w*.055,w*.16);g.bezierCurveTo(-w*.035,w*.11,-w*.042,-w*.075,w*.073,-w*.152);g.closePath();g.fill();g.restore();star(-.24,-.91,.045,'#fff0bc');star(.33,-.26,.04,'#fff0bc');}
    if(f==='astro'){g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=w*.06;g.beginPath();g.ellipse(0,-h*.53,w*.45,h*.48,0,0,Math.PI*2);g.stroke();g.strokeStyle='#acc5dc';g.lineWidth=w*.023;g.stroke();oval(-.34,-.78,.095,.05,'rgba(255,255,255,.7)',-.65);rr(g,-w*.3,-h*.27,w*.6,h*.19,w*.09);g.fillStyle=ac;g.fill();star(0,-.17,.055,'#fff3d7');}
    if(f==='robot'){rr(g,-w*.35,-h*.78,w*.7,h*.4,w*.12);g.strokeStyle='rgba(92,145,155,.48)';g.stroke();for(const s of [-1,1]){oval(s*.4,-.62,.034,.037,'#d9f6f5');g.strokeStyle='#8aabb0';g.beginPath();g.moveTo(s*w*.42,-h*.63);g.lineTo(s*w*.39,-h*.61);g.stroke();}oval(0,-.22,.12,.11,ac);star(0,-.22,.066,'#ffe4ed');}
    if(f==='bee'){g.save();g.beginPath();g.ellipse(0,-h*.19,w*.31,h*.18,0,0,Math.PI*2);g.clip();g.fillStyle='rgba(150,108,71,.7)';for(let i=0;i<3;i++)g.fillRect(-w*.38,-h*(.1+i*.09),w*.76,h*.042);g.restore();}
    if(f==='unicorn'){line([[-.07,-.97],[.055,-1.36],[.13,-.97]],'#ffe19b','#d7b269');g.strokeStyle='rgba(190,158,90,.7)';for(let i=0;i<3;i++){g.beginPath();g.moveTo((-0.01+i*.027)*w,(-1.17+i*.061)*h);g.lineTo((.085+i*.017)*w,(-1.22+i*.074)*h);g.stroke();}for(let i=0;i<4;i++)oval(-.27+i*.065,-.91,.12,.075,['#ffb6d0','#b5b0f7','#9ce3e5','#ffdcb0'][i],.6);}
    if(f==='mushroom'){g.fillStyle=ac;g.beginPath();g.moveTo(-w*.62,-h*.82);g.bezierCurveTo(-w*.53,-h*1.23,w*.47,-h*1.31,w*.62,-h*.82);g.quadraticCurveTo(0,-h*.68,-w*.62,-h*.82);g.fill();g.strokeStyle='#d88294';g.stroke();for(const [xx,yy,rr] of [[-.3,-1.02,.09],[.15,-1.07,.07],[.39,-.93,.08],[-.08,-.86,.06]])oval(xx,yy,rr,rr*.65,'#fff4e7');}
    if(f==='octopus'){rr(g,-w*.25,-h*1.02,w*.5,h*.14,w*.03);g.fillStyle='#faf7ff';g.fill();oval(0,-1.02,.29,.032,'#adc0e1');g.strokeStyle='#8a9dbd';g.beginPath();g.moveTo(0,-h*1.08);g.lineTo(0,-h*1.04);g.stroke();}
    if(f==='angel'){g.strokeStyle='#ffe1a0';g.lineWidth=w*.047;g.beginPath();g.ellipse(0,-h*1.13,w*.29,h*.072,0,0,Math.PI*2);g.stroke();g.strokeStyle='#d6b062';g.lineWidth=w*.011;g.stroke();}
    if(f==='dragon'){oval(0,-.92,.075,.074,ac);for(const s of [-1,1])oval(s*.36,-.2,.061,.047,'#c8a7dc');}
    g.restore();
  }

  // The source menu's dawn palette, candy curbs and soft jelly scenery. Kept
  // separate from the 3D renderer so menu avatars match the uploaded original.
  function drawBackground(g,W,H,time=0) {
    const horizon=H*.34;
    g.save();g.globalAlpha=1;g.globalCompositeOperation='source-over';
    const sky=g.createLinearGradient(0,0,0,horizon);['#c8b6ff','#f4c3e6','#ffd6cc','#ffe9d6'].forEach((c,i)=>sky.addColorStop(i/3,c));g.fillStyle=sky;g.fillRect(0,0,W,H);
    const glow=g.createRadialGradient(W*.74,horizon*.6,0,W*.74,horizon*.6,W*.22);glow.addColorStop(0,'rgba(255,250,235,.85)');glow.addColorStop(1,'rgba(255,250,235,0)');g.fillStyle=glow;g.fillRect(0,0,W,horizon);
    g.fillStyle='#fff8e9';g.beginPath();g.arc(W*.74,horizon*.6,W*.063,0,Math.PI*2);g.fill();
    g.strokeStyle='#c79b91';g.lineWidth=1.5;for(const s of [-1,1]){g.beginPath();g.arc(W*.74+s*W*.022,horizon*.6-W*.01,W*.006,Math.PI,0);g.stroke();}g.beginPath();g.arc(W*.74,horizon*.6+W*.007,W*.014,0,Math.PI);g.stroke();
    const cloud=(x,y,r)=>{g.fillStyle='rgba(255,250,255,.82)';g.beginPath();g.ellipse(x,y,r*1.4,r*.37,0,0,Math.PI*2);g.ellipse(x-r*.5,y-r*.14,r*.57,r*.42,0,0,Math.PI*2);g.ellipse(x+r*.08,y-r*.27,r*.6,r*.55,0,0,Math.PI*2);g.ellipse(x+r*.7,y-r*.05,r*.54,r*.38,0,0,Math.PI*2);g.fill();};
    for(let i=0;i<5;i++)cloud(((i*.29+time*.0015)%1.5-.15)*W,horizon*(.16+(i%3)*.14),W*(.1+(i%2)*.055));
    const hill=(x,y,ww,hh,c,frost)=>{const gr=g.createLinearGradient(0,y-hh,0,y);gr.addColorStop(0,c);gr.addColorStop(1,'#efd3ee');g.fillStyle=gr;g.beginPath();g.moveTo(x-ww,y);g.bezierCurveTo(x-ww*.6,y-hh*.1,x-ww*.6,y-hh,x,y-hh);g.bezierCurveTo(x+ww*.56,y-hh,x+ww*.75,y-hh*.1,x+ww,y);g.closePath();g.fill();if(frost){g.fillStyle='#fff5f7';g.beginPath();g.moveTo(x-ww*.49,y-hh*.56);g.bezierCurveTo(x-ww*.4,y-hh*1.07,x+ww*.4,y-hh*1.1,x+ww*.48,y-hh*.56);g.quadraticCurveTo(x+ww*.28,y-hh*.63,x+ww*.17,y-hh*.56);g.quadraticCurveTo(x,y-hh*.4,x-ww*.09,y-hh*.57);g.quadraticCurveTo(x-ww*.27,y-hh*.71,x-ww*.49,y-hh*.56);g.fill();}};
    for(let i=0;i<7;i++)hill(W*(i*.21-.12),horizon+15,W*.24,horizon*(.25+.16*hash(i,3)),['#c3b0ef','#dfb6e6','#ffb6cd'][i%3],true);
    const ground=g.createLinearGradient(0,horizon,0,H);ground.addColorStop(0,'#e4d5ef');ground.addColorStop(1,'#efedee');g.fillStyle=ground;g.fillRect(0,horizon,W,H-horizon);
    const project=(lane,z)=>({x:W*.5+lane*W*.35/(1+z*.24),y:horizon+(H-horizon)*.92/(1+z*.24)});
    const quad=(a,b,c,d,color)=>{g.fillStyle=color;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.closePath();g.fill();};
    const road=g.createLinearGradient(0,horizon,0,H);road.addColorStop(0,'#ebdae8');road.addColorStop(1,'#f2b7d1');quad(project(-1.55,85),project(1.55,85),project(1.55,-.7),project(-1.55,-.7),road);
    for(let i=0;i<38;i++){const z=i*1.6-(time*1.2%3.2);if(z<-.65)continue;for(const s of [-1,1])quad(project(s*1.55,z),project(s*1.8,z),project(s*1.8,z+1.6),project(s*1.55,z+1.6),i%2?'#fff6f9':'#ffa6ce');if(i%4===0)quad(project(-1.55,z),project(1.55,z),project(1.55,z+.22),project(-1.55,z+.22),'rgba(255,255,255,.2)');}
    for(const lane of [-.5,.5]){g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=2;g.beginPath();const a=project(lane,70),b=project(lane,-.7);g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
    for(let i=0;i<10;i++){const s=i%2?1:-1,z=3+(i>>1)*4,p=project(s*(2.2+hash(i,2)*.7),z),sc=W*.15/(1+z*.24);g.strokeStyle='#c99ab6';g.lineWidth=Math.max(2,sc*.06);g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x,p.y-sc*.65);g.stroke();cloud(p.x,p.y-sc*.72,sc*.34);g.fillStyle=i%3?'#f8bbdb':'#cbb9f1';g.beginPath();g.arc(p.x,p.y-sc*.85,sc*.29,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.65)';g.beginPath();g.ellipse(p.x-sc*.1,p.y-sc*.97,sc*.1,sc*.055,-.5,0,Math.PI*2);g.fill();}
    for(let i=0;i<22;i++){const x=hash(i,1)*W,y=(.25+hash(i,5)*.6)*H+Math.sin(time*.8+i)*7;g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.arc(x,y,1.5+hash(i,9)*2,0,Math.PI*2);g.fill();}
    g.restore();
  }

  // Pure menu API; x/y is the feet point, size is the original body-width unit.
  function draw(g,x,y,size,index=0,time=0,pose={}) {
    t=Number.isFinite(time)?time:0;
    const requested=Number.isInteger(pose.originalIndex)?pose.originalIndex:index;
    const ch=Number.isInteger(requested)&&requested>=0&&requested<TOTAL?requested:0;
    const pi=premIdle(t,ch),focus=pose.focused!==false;
    const m={ch,T:t,rgb:ch>=NCH?CH[ch].rgb:PAL[ch%3].rgb,sx:pi.sx*(1+(focus?Math.sin(t*8)*.02:0)),
      sy:1-(focus?Math.sin(t*8)*.02:0),rot:0,
      earL:-.5+Math.sin(t*3+ch)*.12,earR:.5-Math.sin(t*3+ch)*.12,
      earBend:.55,foot:0,arm:Math.sin(t*4),blink:(t*.7+ch)%3.5<.12?1:0,
      look:.2,lookX:0,happy:false,...pose,ch,T:t};
    const drawY=y-pi.lift*size*.25;
    extraDecoration(g,x,drawY,size,ch,t,m,true);
    drawMochi(g,x,drawY,size,m);
    extraDecoration(g,x,drawY,size,ch,t,m,false);
    return {index:ch,id:CH[ch].id,premium:!!CH[ch].premium};
  }
  function drawRaw(g,x,y,size,pose) {
    t=Number.isFinite(pose?.T)?pose.T:0;
    drawMochi(g,x,y,size,pose);
  }
  function silhouette(g,x,y,size,index=0,color='rgba(110,80,150,0.85)',dpr=1) {
    DPR=Math.max(1,Math.min(3,Number(dpr)||1));
    const ch=Number.isInteger(index)&&index>=0&&index<TOTAL?index:0;
    drawSilhouette(g,x,y,size,ch,color);
  }
  function thumbnail(index,size,unlocked=true,dpr=1) {
    DPR=Math.max(1,Math.min(3,Number(dpr)||1));
    const ch=Number.isInteger(index)&&index>=0&&index<TOTAL?index:0;
    return thumbImg(ch,size,unlocked);
  }
  return {draw,drawRaw,silhouette,thumbnail,drawBackground,idle:premIdle,
    catalog:CH.map(c=>({...c,shape:{...c.shape}})),palette:PAL.map(c=>({...c,rgb:c.rgb.slice()})),
    count:TOTAL,originalCount:NCH};
})();


// Monedero, vestuario, tienda virtual, misiones y poderes de Mochi.
// Los cobros son exclusivamente monedas y gemas obtenidas dentro del juego.
const GameSystems = (() => {
  const POWER = {
    magnet: { name: 'Imán dulce', icon: 'Imán', duration: 8, price: 80, description: 'Recoge monedas y gemas de los tres carriles durante 8 segundos.' },
    shield: { name: 'Escudo de azúcar', icon: 'Escudo', duration: 15, price: 100, description: 'Te protege de un golpe durante 15 segundos.' },
    turbo: { name: 'Turbo confeti', icon: 'Turbo', duration: 5, price: 120, description: '5 segundos de velocidad y protección. ¡A toda nata!' }
  };
  const MISSIONS = [
    { id: 'coins', name: 'Coleccionista dulce', text: 'Recoge 45 monedas.', action: 'coins', goal: 45, coins: 100, gems: 2 },
    { id: 'dodges', name: 'Entre el tráfico', text: 'Adelanta 30 vehículos.', action: 'dodges', goal: 30, coins: 120, gems: 2 },
    { id: 'distance', name: 'Paseo por la avenida', text: 'Recorre 800 metros.', action: 'distance', goal: 800, coins: 100, gems: 3 },
    { id: 'gems', name: 'Brillitos de bolsillo', text: 'Recoge 8 gemas.', action: 'gems', goal: 8, coins: 140, gems: 3 },
    { id: 'nearmisses', name: '¡Por los pelos!', text: 'Consigue 8 esquives cerrados.', action: 'nearmisses', goal: 8, coins: 150, gems: 4 },
    { id: 'turbo', name: 'A toda nata', text: 'Activa 3 turbos.', action: 'turbo', goal: 3, coins: 120, gems: 3 },
    { id: 'shields', name: 'Una dulce salvación', text: 'Evita 3 golpes con un escudo.', action: 'shields', goal: 3, coins: 130, gems: 3 },
    { id: 'score', name: 'Una carrera redonda', text: 'Consigue 500 puntos en una partida.', action: 'score', goal: 500, mode: 'max', coins: 160, gems: 5 },
    { id: 'combo', name: 'Todo encaja', text: 'Alcanza un combo ×4.', action: 'combo', goal: 4, mode: 'max', coins: 150, gems: 4 },
    { id: 'coins100', name: 'Bolsillos de caramelo', text: 'Recoge 100 monedas.', action: 'coins', goal: 100, coins: 200, gems: 5 },
    { id: 'distance2000', name: 'Explora el mundo dulce', text: 'Recorre 2.000 metros.', action: 'distance', goal: 2000, coins: 220, gems: 6 },
    { id: 'magnet', name: 'Atracción irresistible', text: 'Activa 3 imanes.', action: 'magnet', goal: 3, coins: 120, gems: 4 }
  ];
  const EVENTS = [
    { id: 'DonutStampede', label: '¡Estampida de donuts!', kind: 'donut' },
    { id: 'GummyTruck', label: '¡Camión gigante de gominolas!', kind: 'truck' },
    { id: 'GoldFever', label: '¡Modo fiebre dorado!', kind: 'fever' },
    { id: 'NightLights', label: 'Zona nocturna de luces', kind: 'night' },
    { id: 'CoinRain', label: '¡Lluvia de monedas!', kind: 'coins' }
  ];
  function powerIcon(id) {
    const path = id==='magnet'?'M5 4v8a7 7 0 0 0 14 0V4h-5v8a2 2 0 0 1-4 0V4z':id==='shield'?'M12 2 3 6v7c1 6 9 9 9 9s8-3 9-9V6z':'M14 1 3 14h8L9 23l12-14h-8z';
    return '<svg viewBox="0 0 24 24" style="width:36px;height:36px;fill:currentColor;stroke:none"><path d="'+path+'"/></svg>';
  }
  const integer = (n, fallback = 0) => Number.isFinite(Number(n)) ? Math.max(0, Math.floor(Number(n))) : fallback;
  function create({ game, store, Models, notify = () => {}, setState, onCharacterChange = () => {}, startGame, startTurbo, backToMenu, Audio }) {
    const catalog = (Models.characters || CharacterCatalog).map(c => ({ ...c }));
    const el = id => document.getElementById(id);
    const write = (id, value) => { const node = el(id); if (node) node.textContent = value; };
    let saved;
    try { saved = JSON.parse(store.get('progress', '{}')); } catch { saved = {}; }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    const catalogIds = new Set(catalog.map(c => c.id));
    const profile = {
      version: 3,
      coins: integer(saved.coins), gems: integer(saved.gems),
      owned: [...new Set(['mochi', ...(Array.isArray(saved.owned) ? saved.owned : []).filter(id => catalogIds.has(id))])],
      selected: catalogIds.has(saved.selected) ? saved.selected : 'mochi',
      best: Math.max(integer(saved.best), integer(game.best)),
      inventory: Object.fromEntries(Object.keys(POWER).map(id => [id, integer(saved.inventory?.[id])])),
      armed: Object.fromEntries(Object.keys(POWER).map(id => [id, !!saved.armed?.[id] && integer(saved.inventory?.[id]) > 0])),
      totals: saved.totals && typeof saved.totals === 'object' ? saved.totals : {},
      missionCursor: integer(saved.missionCursor, 3),
      missions: [], turboMode: false
    };
    if (Array.isArray(saved.missions) && saved.missions.length === 3) {
      profile.missions = saved.missions.map((m, i) => {
        const definition = MISSIONS.find(def => def.id === m?.id) || MISSIONS[i];
        return { id: definition.id, progress: Math.min(definition.goal, Math.max(0, Number(m?.progress) || 0)), announced: !!m?.announced };
      });
    } else profile.missions = MISSIONS.slice(0, 3).map(m => ({ id: m.id, progress: 0, announced: false }));
    let viewed = Math.max(0, catalog.findIndex(c => c.id === profile.selected));
    let run = freshRun(), runActive = false, session = 0, lastDeath = '', hudClock = 0, saveClock = 0;
    let event = null, lastEventIndex = -1, toastTimer;
    const powers = { magnet: 0, shield: 0, turbo: 0 };
    function freshRun() { return { coins: 0, gems: 0, dodges: 0, nearmisses: 0, distance: 0, score: 0, combo: 1, turbo: 0, shields: 0, magnet: 0 }; }
    function save() {
      store.set('progress', JSON.stringify(profile));
      store.set('character', profile.selected);
      store.set('best', Math.max(profile.best, integer(game.best)));
    }
    function toast(message) {
      const node = el('missionToast');
      if (!node) { notify(message); return; }
      node.textContent = message; node.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, 3000);
    }
    function unlockByScore(announce = false) {
      const best = Math.max(profile.best, integer(game.best)); let changed = false;
      for (const c of catalog) if (!profile.owned.includes(c.id) && Number.isFinite(c.unlockScore) && best >= c.unlockScore) {
        profile.owned.push(c.id); changed = true;
        if (announce) toast('¡' + c.name + ' desbloqueado!');
      }
      if (changed) save();
      return changed;
    }
    function isOwned(id) { return profile.owned.includes(id); }
    unlockByScore();
    if (!isOwned(profile.selected)) profile.selected = 'mochi';
    viewed = Math.max(0, catalog.findIndex(c => c.id === profile.selected));
    function click() { Audio?.unlock?.(); Audio?.play?.('click'); }
    function updateWallet() {
      for (const id of ['walletCoins', 'shopCoins']) write(id, profile.coins.toLocaleString('es-ES'));
      for (const id of ['walletGems', 'shopGems']) write(id, profile.gems.toLocaleString('es-ES'));
      write('coinsRun', run.coins); write('gemsRun', run.gems);
    }
    function updateSelector() {
      unlockByScore();
      const c = catalog[viewed], owned = isOwned(c.id), picked = c.id === profile.selected;
      write('selCount', (viewed + 1) + '/' + catalog.length);
      write('selRecord', 'Récord: ' + Math.max(profile.best, integer(game.best)).toLocaleString('es-ES'));
      write('selName', c.name); write('selInner', c.interior ? 'Dentro lleva ' + c.interior : c.rarity + ' · Nuevo amigo');
      write('selDesc', c.desc); if(el('selDesc'))el('selDesc').hidden=!owned;
      const buy = el('selBuy'), pick = el('selPick');
      if (buy) {
        buy.hidden = owned;
        buy.textContent = c.priceGems ? 'Desbloquear · ' + c.priceGems + ' gemas' : 'Desbloquear · ' + c.priceCoins + ' monedas';
        buy.disabled = !owned && (c.priceGems ? profile.gems < c.priceGems : profile.coins < c.priceCoins);
      }
      if (pick) {
        pick.disabled = !owned; pick.classList.toggle('dis', !owned); pick.classList.toggle('chosen', owned && picked);
        pick.textContent = owned ? '¡Jugar!' : Number.isFinite(c.unlockScore) ? 'Récord de ' + c.unlockScore.toLocaleString('es-ES') : 'Desbloquéalo en la tienda';
      }
      updateWallet();
    }
    function openSelect() {
      click(); viewed = Math.max(0, catalog.findIndex(c => c.id === profile.selected));
      el('shop') && (el('shop').hidden = true); el('missions') && (el('missions').hidden = true);
      setState('select'); updateSelector();
    }
    function closeSelect() {
      click(); el('shop') && (el('shop').hidden = true); el('missions') && (el('missions').hidden = true);
      if (backToMenu) backToMenu(); else setState('menu');
    }
    function shiftView(direction) { click(); viewed = (viewed + direction + catalog.length) % catalog.length; updateSelector(); }
    function buyCharacter() {
      const c = catalog[viewed];
      if (isOwned(c.id)) return false;
      const currency = c.priceGems ? 'gems' : 'coins', price = integer(c.priceGems || c.priceCoins);
      if (profile[currency] < price) { toast('Te faltan ' + (price - profile[currency]) + (currency === 'gems' ? ' gemas.' : ' monedas.')); return false; }
      click(); profile[currency] -= price; profile.owned.push(c.id); save(); updateSelector();
      toast('¡' + c.name + ' ya es tuyo!'); return true;
    }
    function pickCharacter() {
      const c = catalog[viewed]; if (!isOwned(c.id)) return false;
      click(); profile.selected = c.id; profile.turboMode = false; save(); updateSelector();
      onCharacterChange(c.id); startGame?.(); return true;
    }
    function renderShop() {
      updateWallet(); const root = el('shopItems'); if (!root) return;
      root.replaceChildren();
      for (const [id, p] of Object.entries(POWER)) {
        const card = document.createElement('article'); card.className = 'shop-item';
        const icon = document.createElement('span'); icon.className = 'shop-icon'; icon.setAttribute('aria-hidden','true'); icon.innerHTML = powerIcon(id);
        const title = document.createElement('b'); title.className = 'shop-name'; title.textContent = p.name;
        const desc = document.createElement('p'); desc.className = 'shop-description'; desc.textContent = p.description;
        const count = document.createElement('p'); count.className = 'shop-price'; count.textContent = 'Tienes ' + profile.inventory[id] + ' · ' + p.price + ' monedas';
        const buy = document.createElement('button'); buy.className = 'shop-buy'; buy.textContent = 'Comprar 1'; buy.disabled = profile.coins < p.price;
        buy.addEventListener('click', () => {
          if (profile.coins < p.price) return;
          click(); profile.coins -= p.price; profile.inventory[id]++; save(); renderShop(); updateSelector();
        });
        const arm = document.createElement('button'); arm.className = 'pbtn'; arm.textContent = profile.armed[id] ? '✓ Llevar' : 'Llevar'; arm.disabled = profile.inventory[id] < 1;
        arm.setAttribute('aria-pressed', String(profile.armed[id]));
        arm.addEventListener('click', () => {
          if (profile.inventory[id] < 1) return;
          click(); profile.armed[id] = !profile.armed[id]; save(); renderShop();
        });
        card.append(icon, title, desc, count, buy, document.createElement('br'), arm); root.append(card);
      }
      const card = document.createElement('article'); card.className = 'shop-item';
      card.innerHTML = '<span class="shop-icon">★</span><b class="shop-name">32 personajes</b><p class="shop-description">Los clásicos se desbloquean por récord. También puedes usar tus monedas o gemas.</p>';
      const button = document.createElement('button'); button.className = 'pbtn'; button.textContent = 'Ver personajes';
      button.addEventListener('click', () => { click(); el('shop').hidden = true; updateSelector(); });
      card.append(button); root.append(card);
    }
    function renderMissions() {
      const root = el('missionList'); if (!root) return; root.replaceChildren();
      profile.missions.forEach((state, slot) => {
        const def = MISSIONS.find(m => m.id === state.id), complete = state.progress >= def.goal;
        const card = document.createElement('article'); card.className = 'mission-item';
        const title = document.createElement('h3'); title.className = 'mission-title'; title.textContent = (complete ? '✓ ' : '★ ') + def.name;
        const text = document.createElement('p'); text.className = 'mission-description'; text.textContent = def.text;
        const track = document.createElement('div'); track.className = 'mission-progress';
        track.setAttribute('role', 'progressbar'); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(def.goal)); track.setAttribute('aria-valuenow', String(Math.min(def.goal, Math.floor(state.progress))));
        const fill = document.createElement('span'); fill.style.width = Math.min(100, state.progress / def.goal * 100) + '%'; track.append(fill);
        const progress = document.createElement('p'); progress.className = 'mission-description'; progress.textContent = Math.min(def.goal, Math.floor(state.progress)).toLocaleString('es-ES') + ' / ' + def.goal.toLocaleString('es-ES');
        const reward = document.createElement('div'); reward.className = 'mission-reward';
        const amount = document.createElement('span'); amount.textContent = '+' + def.coins + ' monedas +' + def.gems + ' gemas';
        const claim = document.createElement('button'); claim.className = 'pbtn'; claim.disabled = !complete; claim.textContent = complete ? 'Recoger' : 'En marcha';
        claim.addEventListener('click', () => claimMission(slot, state.id));
        reward.append(amount, claim); card.append(title, text, track, progress, reward); root.append(card);
      });
    }
    function claimMission(slot, expectedId) {
      const current = profile.missions[slot], def = MISSIONS.find(m => m.id === current?.id);
      if (!current || current.id !== expectedId || current.progress < def.goal) return false;
      // Replace before saving and rendering. A stale double-click cannot claim again.
      const active = new Set(profile.missions.filter((_, i) => i !== slot).map(m => m.id));
      let next;
      do { next = MISSIONS[profile.missionCursor++ % MISSIONS.length]; } while (active.has(next.id) || next.id === current.id);
      profile.missions[slot] = { id: next.id, progress: 0, announced: false };
      profile.coins += def.coins; profile.gems += def.gems; save(); click();
      updateWallet(); renderMissions(); updateSelector(); toast('¡Misión cobrada! +' + def.coins + ' monedas +' + def.gems + ' gemas'); return true;
    }
    function record(action, value = 1) {
      if (!runActive || !Number.isFinite(value) || value < 0) return;
      const aliases = { near: 'nearmisses', nearMiss: 'nearmisses', dodge: 'dodges', coin: 'coins', gem: 'gems', shield: 'shields' };
      action = aliases[action] || action;
      const max = action === 'score' || action === 'combo';
      if (max) { run[action] = Math.max(Number(run[action]) || 0, value); profile.totals[action] = Math.max(Number(profile.totals[action]) || 0, value); }
      else { run[action] = (Number(run[action]) || 0) + value; profile.totals[action] = (Number(profile.totals[action]) || 0) + value; }
      let completed = false;
      for (const state of profile.missions) {
        const def = MISSIONS.find(m => m.id === state.id); if (def.action !== action) continue;
        state.progress = Math.min(def.goal, def.mode === 'max' ? Math.max(state.progress, value) : state.progress + value);
        if (state.progress >= def.goal && !state.announced) { state.announced = true; completed = true; toast('¡Misión completada! ' + def.name); }
      }
      if (completed) save();
    }
    function beginRun() {
      run = freshRun(); runActive = true; session++; lastDeath = ''; event = null; lastEventIndex = -1;
      for (const id of Object.keys(powers)) powers[id] = 0;
      for (const id of Object.keys(POWER)) if (profile.armed[id] && profile.inventory[id] > 0) {
        profile.inventory[id]--; profile.armed[id] = false; grantPower(id, false);
      }
      save(); updateWallet(); updatePowerHUD();
      const node = el('eventBanner'); if (node) node.hidden = true;
    }
    function collect(kind, amount = 1) {
      if (!runActive) return false;
      amount = integer(amount, 1); if (!amount) return false;
      if (kind in POWER) { grantPower(kind); return true; }
      const currency = kind === 'coin' || kind === 'coins' ? 'coins' : kind === 'gem' || kind === 'gems' ? 'gems' : null;
      if (!currency) return false;
      profile[currency] += amount; record(currency, amount); save(); updateWallet(); Audio?.play?.('star'); return true;
    }
    function grantPower(id, announce = true) {
      if (!POWER[id] || !runActive) return false;
      powers[id] = Math.max(powers[id], POWER[id].duration);
      if (id === 'turbo') record('turbo'); else if (id === 'magnet') record('magnet');
      if (announce) notify('¡' + POWER[id].name + '!');
      Audio?.play?.(id === 'turbo' ? 'dash' : 'star'); updatePowerHUD(); return true;
    }
    function powerActive(id) { return powers[id] > 0 && runActive; }
    function absorbHit() {
      if (powerActive('turbo')) return true;
      if (!powerActive('shield')) return false;
      powers.shield = 0; record('shields'); save(); updatePowerHUD(); notify('¡Escudo salvador!'); return true;
    }
    function useTurbo() {
      if (!runActive || powerActive('turbo') || profile.inventory.turbo < 1) return false;
      profile.inventory.turbo--; grantPower('turbo'); save(); return true;
    }
    function updatePowerHUD() {
      const node = el('powerHud'); if (!node) return;
      const active = Object.keys(POWER).filter(id => powers[id] > 0);
      node.hidden = !active.length || game.state !== 'running';
      node.replaceChildren();
      for (const id of active) { const row = document.createElement('div'); row.textContent = POWER[id].name + ' · ' + Math.ceil(powers[id]) + ' s'; node.append(row); }
    }
    function updateEvent(elapsed) {
      const eventIndex = Math.floor((elapsed - 22) / 22), offset = (elapsed - 22) % 22;
      if (elapsed < 22 || offset >= 8) event = null;
      else {
        const def = EVENTS[eventIndex % EVENTS.length]; event = { ...def, remaining: 8 - offset };
        if (eventIndex !== lastEventIndex) { lastEventIndex = eventIndex; notify(def.label); }
      }
      const node = el('eventBanner'); if (!node) return;
      node.hidden = !event || game.state !== 'running';
      if (event) node.textContent = event.label + ' · ' + Math.ceil(event.remaining) + ' s';
    }
    function tick(dt) {
      if (game.state !== 'running' || !runActive) { updatePowerHUD(); return; }
      for (const id of Object.keys(powers)) powers[id] = Math.max(0, powers[id] - dt);
      record('score', game.score); record('combo', game.combo);
      updateEvent(game.elapsed); hudClock += dt; saveClock += dt;
      if (hudClock >= .1) { hudClock = 0; updatePowerHUD(); }
      if (saveClock >= 2) { saveClock = 0; save(); }
    }
    function endRun() {
      const key = session + ':' + integer(game.deathId);
      if (lastDeath === key) return false;
      lastDeath = key; record('score', game.score); record('combo', game.combo);
      profile.best = Math.max(profile.best, integer(game.best), integer(game.score)); unlockByScore(true); save(); updateSelector();
      const powerNode = el('powerHud'); if (powerNode) powerNode.hidden = true;
      const eventNode = el('eventBanner'); if (eventNode) eventNode.hidden = true;
      // Keep runActive: the authorised continuation belongs to this same run.
      return true;
    }
    function eventForWave(wave, elapsed = game.elapsed) {
      const index = Math.floor((elapsed - 22) / 22), offset = (elapsed - 22) % 22;
      if (elapsed < 22 || offset >= 8) return null;
      return { ...EVENTS[index % EVENTS.length], remaining: 8 - offset };
    }
    function onNearMiss() { record('nearmisses'); record('combo', game.combo); }
    function onDodge() { record('dodges'); }
    function updateUI() { updateSelector(); updateWallet(); renderMissions(); if (!el('shop')?.hidden) renderShop(); }
    const bind = (id, action) => el(id)?.addEventListener('click', action);
    bind('charBtn', openSelect); bind('charBtn2', openSelect); bind('selBack', closeSelect);
    bind('selPrev', () => shiftView(-1)); bind('selNext', () => shiftView(1)); bind('selBuy', buyCharacter); bind('selPick', pickCharacter);
    bind('shopButton', () => { click(); renderShop(); el('shop').hidden = false; });
    bind('closeShopButton', () => { click(); el('shop').hidden = true; });
    bind('missionsButton', () => { click(); renderMissions(); el('missions').hidden = false; });
    bind('closeMissionsButton', () => { click(); el('missions').hidden = true; });
    bind('turboBtn', () => { click(); profile.turboMode = true; startTurbo?.(); });
    write('turboSmall', 'Ritmo rápido desde el inicio');
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    document.addEventListener('keydown', e => {
      if (game.state !== 'select' || !el('shop')?.hidden || !el('missions')?.hidden) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); shiftView(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); shiftView(1); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickCharacter(); }
      if (e.key === 'Escape') { e.preventDefault(); closeSelect(); }
    });
    updateUI(); save();
    return {
      profile, catalog, get viewed() { return viewed; }, get selected() { return profile.selected; },
      get speedMultiplier() { return powerActive('turbo') ? 1.22 : 1; },
      get event() { return event; }, beginRun, tick, collect, grantPower, powerActive,
      save, absorbHit, useTurbo, record, endRun, onNearMiss, onDodge, eventForWave,
      openSelect, closeSelect, updateUI, isOwned,
      debug: { snapshot: () => ({ profile: JSON.parse(JSON.stringify(profile)), run: { ...run }, powers: { ...powers }, runActive, session, lastDeath, event: event ? { ...event } : null }), buyCharacter, claimMission, view: index => { viewed = Math.max(0, Math.min(catalog.length - 1, Math.floor(index))); updateSelector(); } }
    };
  }
  return { create };
})();


// Recogibles 3D agrupados: cinco lotes instanciados, sin crear meshes en las oleadas.
const Collectibles = (() => {
  function create({ scene, THREE, LANES, WORLD_SCALE, systems, game, burst, Audio }) {
    const CAPACITY = { coin: 120, gem: 32, magnet: 12, shield: 12, turbo: 12 };
    const POOLS = Object.fromEntries(Object.keys(CAPACITY).map(type => [type, []]));
    const active = [], batches = {}, scratch = new THREE.Object3D();
    const normalColors = { coin: 0xf3c45e, gem: 0xb5c0fa, magnet: 0xfa99bd, shield: 0x87dacb, turbo: 0xffcc80 };
    let clock = 0, dirty = true, collectedCoins = 0, collectedGems = 0, collectedPowers = 0;
    function raisedShape(points, depth = .09) {
      const shape = new THREE.Shape(); points.forEach((p, i) => i ? shape.lineTo(...p) : shape.moveTo(...p)); shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .025, bevelThickness: .025 });
      geometry.translate(0, 0, -depth / 2); return geometry;
    }
    const coin = new THREE.CylinderGeometry(.31, .31, .095, 12, 1); coin.rotateX(Math.PI / 2);
    const magnet = new THREE.TorusGeometry(.29, .095, 5, 12, Math.PI); magnet.rotateZ(Math.PI);
    const geometries = {
      coin, gem: new THREE.OctahedronGeometry(.37, 0), magnet,
      shield: raisedShape([[-.34, .31], [0, .39], [.34, .31], [.31, -.10], [0, -.43], [-.31, -.10]], .12),
      turbo: raisedShape([[.08, .48], [-.33, -.04], [-.02, -.04], [-.12, -.48], [.34, .10], [.04, .10]], .14)
    };
    for (const [type, capacity] of Object.entries(CAPACITY)) {
      const material = new THREE.MeshStandardMaterial({ color: normalColors[type], metalness: type === 'coin' ? .52 : .20, roughness: type === 'gem' ? .22 : .34,
        emissive: normalColors[type], emissiveIntensity: type === 'coin' ? .025 : .065 });
      const mesh = new THREE.InstancedMesh(geometries[type], material, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.count = 0;
      mesh.name = 'Recogibles ' + type; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
      scene.add(mesh); batches[type] = mesh;
      for (let i = 0; i < capacity; i++) POOLS[type].push({ type, lane: 0, x: 0, y: 1, z: 0, phase: 0, captured: false });
    }
    function add(type, lane, logicalZ, phase) {
      const item = POOLS[type]?.pop(); if (!item) return false;
      lane = Math.max(0, Math.min(LANES.length-1, Math.round(lane)));
      item.lane = lane; item.x = LANES[lane]; item.y = type in normalColors && !['coin', 'gem'].includes(type) ? 1.35 : 1.0;
      item.z = -logicalZ * WORLD_SCALE; item.phase = phase; item.captured = false;
      active.push(item); dirty = true; return true;
    }
    function spawnWave(safe, logicalZ, wave, event) {
      if (!Number.isFinite(logicalZ)) return;
      // Every pickup uses the deliberately open lane of this exact traffic row.
      // The chain stays adjacent to its row, before the next row is generated.
      const raining = event?.id === 'CoinRain' || event?.kind === 'coins' || event?.kind === 'fever';
      const count = raining ? 5 : 3 + (wave % 3);
      const first = logicalZ + .55, step = raining ? .44 : .55;
      for (let i = 0; i < count; i++) add('coin', safe, first + i * step, wave + i * .65);
      if (wave % 4 === 0) add('gem', safe, first + .26, wave * .9);
      if (wave > 0 && wave % 7 === 0) {
        const types = ['magnet', 'shield', 'turbo'];
        add(types[(Math.floor(wave / 7) - 1) % 3], safe, first + .8, wave);
      }
    }
    function remove(index) {
      const item = active[index]; POOLS[item.type].push(item);
      const tail = active.pop(); if (index < active.length) active[index] = tail;
      dirty = true;
    }
    function pickup(item) {
      if (item.captured) return;
      item.captured = true;
      if (item.type === 'coin') { systems.collect('coin', 1); collectedCoins++; }
      else if (item.type === 'gem') { systems.collect('gem', 1); collectedGems++; }
      else { systems.grantPower(item.type); collectedPowers++; }
      burst?.(item.x, item.y, 0, item.type === 'coin' ? '#e4bd68' : item.type === 'gem' ? '#aeb5ef' : '#8bdfcf', item.type === 'coin' ? 3 : 7);
    }
    function update(dt, move, playerX) {
      if (!Number.isFinite(dt) || !Number.isFinite(move)) return;
      clock += dt; const magnet = systems.powerActive('magnet');
      for (let i = active.length - 1; i >= 0; i--) {
        const item = active[i], oldZ = item.z;
        item.z += move;
        const collectible = item.type === 'coin' || item.type === 'gem';
        if (magnet && collectible && item.z > -14 && item.z < 2 && Math.abs(item.x - playerX) < 6) {
          item.x += (playerX - item.x) * (1 - Math.exp(-dt * 15));
          // Attraction closes both axes, so the visual and the pickup agree.
          if (item.z < 0) item.z = Math.min(.1, item.z + dt * (4 + (14 + item.z) * .5));
          item.y += (1.0 - item.y) * (1 - Math.exp(-dt * 12));
        }
        const cross = oldZ < .15 && item.z >= -.15;
        const atPlayer = item.z > -.6 && item.z < .7;
        if ((cross || (magnet && collectible && atPlayer)) && Math.abs(item.x - playerX) < .65) { pickup(item); remove(i); }
        else if (item.z > 12) remove(i);
      }
      dirty = true;
    }
    function updateRender(time = clock) {
      if (!dirty && active.length === 0) return;
      const counts = { coin: 0, gem: 0, magnet: 0, shield: 0, turbo: 0 };
      for (const item of active) {
        const isPower = item.type !== 'coin' && item.type !== 'gem';
        const bob = Math.sin(time * (isPower ? 3.7 : 4.0) + item.phase) * (isPower ? .15 : .065);
        scratch.position.set(item.x, item.y + bob, item.z);
        scratch.rotation.set(isPower ? Math.sin(time * 2 + item.phase) * .14 : 0, time * (item.type === 'coin' ? 2.8 : 1.6) + item.phase, isPower ? Math.sin(time * 2.3 + item.phase) * .11 : 0);
        const scale = isPower ? 1.30 + Math.sin(time * 3 + item.phase) * .06 : item.type === 'gem' ? 1.05 : 1;
        scratch.scale.setScalar(scale); scratch.updateMatrix();
        batches[item.type].setMatrixAt(counts[item.type]++, scratch.matrix);
      }
      for (const [type, mesh] of Object.entries(batches)) {
        mesh.count = counts[type]; mesh.instanceMatrix.needsUpdate = counts[type] > 0;
      }
      dirty = false;
    }
    function clear() {
      for (const item of active) POOLS[item.type].push(item);
      active.length = 0; clock = 0; collectedCoins = collectedGems = collectedPowers = 0;
      for (const mesh of Object.values(batches)) mesh.count = 0;
      dirty = true;
    }
    function stats() {
      const counts = { coin: 0, gem: 0, magnet: 0, shield: 0, turbo: 0 };
      for (const item of active) counts[item.type]++;
      return { active: active.length, counts, collectedCoins, collectedGems, collectedPowers, drawCalls: Object.values(counts).filter(Boolean).length,
        capacities: { ...CAPACITY }, items: active.map(item => ({ type: item.type, lane: item.lane, x: item.x, z: item.z })) };
    }
    return { spawnWave, update, updateRender, clear, stats };
  }
  return { create };
})();


// Las pantallas originales usan sus retratos Canvas; la partida es totalmente 3D.
// El selector mantiene el carrusel y la cuadrícula de 5 × 3 del Mochi adjunto.
const OriginalMenus = (() => {
  const FONT = '"Fredoka", "Arial Rounded MT Bold", system-ui, sans-serif';
  const clampMenu = (n, a, b) => Math.max(a, Math.min(b, n));
  const mixMenu = (a, b, p) => a + (b - a) * p;
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function create({ canvas, OriginalPortraits, systems, game, stage, mochi, Audio }) {
    const g = canvas.getContext('2d', { alpha: false });
    const catalog = systems.catalog;
    let width = 390, height = 844, pixelRatio = 1, safeBottom = 0;
    let previousTime = 0, carousel = systems.viewed, previousState = '', pointer = null;
    let thumbs = [], geometry = null, infoTop = '';
    const node = id => document.getElementById(id);
    const blocked = () => ['shop', 'missions'].some(id => {
      const panel = node(id); return panel && !panel.hidden;
    });
    const owned = index => systems.isOwned(catalog[index].id);
    const portraitIndex = index => Number.isInteger(catalog[index].originalIndex) ? catalog[index].originalIndex : index;
    function portraitPose(index, pose = {}) {
      const originalIndex = catalog[index].originalIndex;
      return Number.isInteger(originalIndex) ? { ...pose, originalIndex } : pose;
    }
    function readSafeBottom() {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none';
      document.body.appendChild(probe); const value = probe.offsetHeight || 0; probe.remove();
      return value;
    }
    function resize(W, H, dpr = 1) {
      width = Math.max(1, Number(W) || 390); height = Math.max(1, Number(H) || 844);
      pixelRatio = Math.max(1, Math.min(3, Number(dpr) || 1));
      canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
      g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      safeBottom = readSafeBottom(); geometry = null;
    }
    function layout() {
      const short = height < 760;
      const big = { x: width / 2, y: height * (short ? .37 : .43),
        size: Math.min(width * (short ? .33 : .36), height * (short ? .165 : .19)) };
      const nextTop = Math.round(big.y + 10) + 'px';
      if (nextTop !== infoTop) { infoTop = nextTop; const info = node('selInfo'); if (info) info.style.top = nextTop; }
      const gw = Math.min(width - 24, 460), cols = 5, rows = 3, cw = gw / cols;
      const chh = Math.min(cw, height * .085), reserve = 108 + safeBottom;
      const gy = Math.min(height * .63, height - reserve - ((rows - 1) * (chh + 6) + chh) - chh * .15);
      const page = Math.floor(systems.viewed / 15), start = page * 15;
      thumbs = catalog.slice(start, start + 15).map((c, position) => ({
        index: start + position, x: (width - gw) / 2 + cw * (position % cols) + cw / 2,
        y: gy + Math.floor(position / cols) * (chh + 6) + chh * .85,
        w: cw, h: chh, size: Math.min(cw * .5, chh * .62)
      }));
      return geometry = { big, thumbs, page, pages: Math.ceil(catalog.length / 15), gridTop: gy, gridBottom: gy + 3 * chh + 12 };
    }
    function crown(x, y, radius) {
      g.save(); g.fillStyle = '#ffc93c'; g.strokeStyle = '#c98a1e'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x - radius, y + radius * .6); g.lineTo(x - radius * 1.1, y - radius * .5);
      g.lineTo(x - radius * .45, y); g.lineTo(x, y - radius * .8); g.lineTo(x + radius * .45, y);
      g.lineTo(x + radius * 1.1, y - radius * .5); g.lineTo(x + radius, y + radius * .6);
      g.closePath(); g.fill(); g.stroke(); g.restore();
    }
    function lock(x, y, radius, time) {
      g.save(); g.translate(x, y); g.rotate(Math.sin(time * 2.2 + x * .05) * .12);
      g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(0, 0, radius * 1.4, 0, Math.PI * 2); g.fill();
      const w = radius * 1.45, h = radius * 1.08, by = -radius * .12;
      g.lineCap = 'round'; g.lineWidth = Math.max(1.6, radius * .32); g.strokeStyle = '#b9a6d1';
      g.beginPath(); g.moveTo(-radius * .46, by + 1); g.lineTo(-radius * .46, by - radius * .22);
      g.arc(0, by - radius * .22, radius * .46, Math.PI, 0); g.lineTo(radius * .46, by + 1); g.stroke();
      const gradient = g.createLinearGradient(0, by, 0, by + h);
      gradient.addColorStop(0, '#ffe7a0'); gradient.addColorStop(.45, '#f6c552'); gradient.addColorStop(1, '#c98a1e');
      roundRect(g, -w / 2, by, w, h, radius * .3); g.fillStyle = gradient; g.fill();
      g.strokeStyle = '#a8701a'; g.lineWidth = Math.max(1, radius * .1); g.stroke();
      g.fillStyle = '#7a4a10'; g.beginPath(); g.arc(0, by + h * .42, radius * .17, 0, Math.PI * 2); g.fill();
      g.fillRect(-radius * .06, by + h * .42, radius * .12, radius * .31); g.restore();
    }
    function fitText(text, weight, size, maxWidth, x, y) {
      let fontSize = size; g.font = weight + ' ' + fontSize + 'px ' + FONT;
      while (fontSize > 8 && g.measureText(text).width > maxWidth) { fontSize -= .5; g.font = weight + ' ' + fontSize + 'px ' + FONT; }
      g.fillText(text, x, y);
    }
    function drawMenu(time) {
      const index = Math.max(0, catalog.findIndex(c => c.id === systems.selected));
      const size = Math.min(width * .42, height * .24), x = width / 2, feetY = height * .64;
      const hop = Number.isFinite(mochi?.hop) ? mochi.hop : Math.abs(Math.sin(time * 5.5));
      const lift = hop * .22 * size, shadow = size * .5 * (1 - hop * .25);
      g.fillStyle = 'rgba(150,90,160,.22)'; g.beginPath(); g.ellipse(x, feetY, shadow, shadow * .22, 0, 0, Math.PI * 2); g.fill();
      const palette = OriginalPortraits.palette, color = palette[Math.floor(time / 1.6) % palette.length].rgb;
      const aura = g.createRadialGradient(x, feetY - size * .45 - lift, size * .2, x, feetY - size * .45 - lift, size * .95);
      aura.addColorStop(0, 'rgba(' + color.join(',') + ',0)'); aura.addColorStop(.6, 'rgba(' + color.join(',') + ',.18)'); aura.addColorStop(1, 'rgba(' + color.join(',') + ',0)');
      g.fillStyle = aura; g.fillRect(x - size, feetY - size * 1.8 - lift, size * 2, size * 2.1);
      const pi = OriginalPortraits.idle(time, portraitIndex(index));
      const sy = 1 - Math.pow(1 - hop, 6) * .14 + hop * .05;
      const pose = { sx: pi.sx / Math.sqrt(sy), sy, rot: pi.rot,
        earL: mochi?.earL ?? -.5, earR: mochi?.earR ?? .5, earBend: .55 + hop * .3,
        foot: Math.sin(mochi?.hopPh ?? time * 5.5), arm: Math.sin(mochi?.hopPh ?? time * 5.5),
        blink: mochi?.blink ?? 0, look: .3, lookX: 0, happy: false };
      if (Number.isInteger(catalog[index].originalIndex)) pose.rgb = color;
      OriginalPortraits.draw(g, x, feetY - lift, size, index, time, portraitPose(index, pose));
    }
    function drawSelect(time) {
      const L = layout(), focused = systems.viewed;
      const veil = g.createLinearGradient(0, 0, 0, height);
      veil.addColorStop(0, 'rgba(255,255,255,.25)'); veil.addColorStop(.5, 'rgba(255,240,248,.55)'); veil.addColorStop(1, 'rgba(255,240,248,.75)');
      g.fillStyle = veil; g.fillRect(0, 0, width, height);
      const spacing = width * .36;
      for (let i = Math.max(0, Math.floor(carousel) - 2); i <= Math.min(catalog.length - 1, Math.ceil(carousel) + 2); i++) {
        const off = i - carousel, distance = Math.abs(off); if (distance > 1.8) continue;
        const scale = mixMenu(1, .52, Math.min(1, distance)), x = L.big.x + off * spacing;
        const y = L.big.y - (1 - Math.min(1, distance)) * 6, size = L.big.size * scale;
        const character = catalog[i], premium = !!character.premium, unlocked = owned(i);
        g.globalAlpha = clampMenu(1.6 - distance * .7, 0, 1);
        g.fillStyle = 'rgba(200,150,220,.25)'; g.beginPath(); g.ellipse(x, y + 4, size * .62, size * .13, 0, 0, Math.PI * 2); g.fill();
        if (unlocked || premium) {
          const hop = distance < .5 ? Math.abs(Math.sin(time * 4)) * size * .08 : 0;
          if (premium && distance < .5) {
            g.save(); g.translate(x, y - size * .5); g.rotate(time * .5); g.fillStyle = 'rgba(255,214,110,.22)';
            for (let ray = 0; ray < 10; ray++) { g.rotate(Math.PI / 5); g.beginPath(); g.moveTo(0, 0); g.lineTo(size * 1.05, -size * .1); g.lineTo(size * 1.05, size * .1); g.closePath(); g.fill(); }
            g.restore();
          }
          const pi = distance < .5 ? OriginalPortraits.idle(time, portraitIndex(i)) : { sx: 1, lift: 0, rot: 0 };
          const pose = { focused: distance < .5, sx: pi.sx * (1 + (distance < .5 ? Math.sin(time * 8) * .02 : 0)),
            sy: 1 - (distance < .5 ? Math.sin(time * 8) * .02 : 0), rot: pi.rot,
            happy: character.id === systems.selected && distance < .5 && time % 4 < .6 };
          if (Number.isInteger(character.originalIndex)) pose.rgb = OriginalPortraits.palette[i === focused ? Math.floor(time * .6) % 3 : i % 3].rgb;
          OriginalPortraits.draw(g, x, y - hop, size, i, time, portraitPose(i, pose));
        } else {
          OriginalPortraits.silhouette(g, x, y, size, portraitIndex(i), undefined, pixelRatio);
          g.fillStyle = 'rgba(255,255,255,.95)'; g.font = '700 ' + Math.round(size * .45) + 'px ' + FONT;
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', x, y - size * .48);
        }
        if (premium && distance < .5) {
          const badgeY = Math.max(y - size * 1.5, height * .16 + 8), badgeH = Math.max(20, size * .2);
          g.font = '700 ' + Math.round(Math.max(12, size * .13)) + 'px ' + FONT;
          const badgeWidth = g.measureText('PREMIUM').width + 34;
          roundRect(g, x - badgeWidth / 2, badgeY - badgeH / 2, badgeWidth, badgeH, badgeH / 2);
          g.fillStyle = '#ffe1a2'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
          crown(x - badgeWidth / 2 + 13, badgeY, badgeH * .28);
          g.fillStyle = '#7a4a10'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PREMIUM', x + 7, badgeY + 1);
          if (!unlocked) lock(x + size * .36, y - size * .08, Math.max(9, size * .09), time);
        }
        g.globalAlpha = 1;
      }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const th of thumbs) {
        const i = th.index, character = catalog[i], unlocked = owned(i), focus = i === focused;
        const chosen = character.id === systems.selected, premium = !!character.premium;
        roundRect(g, th.x - th.w / 2 + 3, th.y - th.h * .85, th.w - 6, th.h, 14);
        if (premium) {
          const gradient = g.createLinearGradient(th.x - th.w / 2, th.y - th.h, th.x + th.w / 2, th.y);
          gradient.addColorStop(0, focus ? '#fff6d6' : 'rgba(255,240,200,.85)'); gradient.addColorStop(1, focus ? '#f1e4ff' : 'rgba(230,215,255,.8)'); g.fillStyle = gradient;
        } else g.fillStyle = focus ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.6)';
        g.fill();
        if (premium) { g.strokeStyle = '#efc560'; g.lineWidth = focus ? 3 : 1.5; g.stroke(); }
        else if (focus) { g.strokeStyle = '#f08cbc'; g.lineWidth = 3; g.stroke(); }
        else if (chosen) { g.strokeStyle = '#7ee3c4'; g.lineWidth = 2; g.stroke(); }
        const image = OriginalPortraits.thumbnail(portraitIndex(i), th.size, unlocked || premium, pixelRatio);
        g.drawImage(image, th.x - th.size * 1.1, th.y - th.h * .2 - th.size * 1.75, th.size * 2.2, th.size * 2.2);
        g.fillStyle = unlocked ? (premium ? '#b07a12' : '#8b5cc2') : '#b49ac8';
        const label = unlocked ? character.name : Number.isFinite(character.unlockScore) ? character.unlockScore.toLocaleString('es-ES') : character.priceGems ? character.priceGems + ' gemas' : character.priceCoins + ' monedas';
        fitText(label, premium ? 700 : 600, 11, th.w - 10, th.x, th.y + th.h * .02);
        if (premium) crown(th.x - th.w / 2 + 13, th.y - th.h * .72, 7);
        if (!unlocked && premium) lock(th.x + th.w / 2 - 13, th.y - th.h * .72, 6, time);
        if (chosen && unlocked) {
          const cx = th.x + th.w / 2 - 12, cy = th.y - th.h * .72;
          g.fillStyle = '#5fc7a6'; g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 3, cy); g.lineTo(cx -.5, cy + 2.2); g.lineTo(cx + 3.5, cy - 2.2); g.stroke();
        }
      }
    }
    function draw(time = 0) {
      const visible = game.state === 'menu' || game.state === 'select';
      canvas.hidden = !visible; canvas.style.pointerEvents = game.state === 'select' && !blocked() ? 'auto' : 'none';
      if (!visible) { pointer = null; previousState = game.state; return; }
      const seconds = Number.isFinite(time) ? time : 0;
      const dt = clampMenu(seconds - previousTime, 0, .05); previousTime = seconds;
      if (game.state !== previousState || Math.abs(carousel - systems.viewed) > catalog.length / 2) carousel = systems.viewed;
      else carousel = mixMenu(carousel, systems.viewed, 1 - Math.exp(-dt * 12));
      previousState = game.state;
      g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); g.globalAlpha = 1;
      OriginalPortraits.drawBackground(g, width, height, seconds);
      if (game.state === 'select') drawSelect(seconds); else drawMenu(seconds);
    }
    function view(index) {
      const next = (index + catalog.length) % catalog.length;
      if (next !== systems.viewed) { Audio?.play?.('move'); systems.debug.view(next); }
    }
    function coordinates(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * width / Math.max(1, rect.width), y: (event.clientY - rect.top) * height / Math.max(1, rect.height) };
    }
    function pointerDown(event) {
      if (game.state !== 'select' || blocked() || event.button > 0) return;
      const p = coordinates(event); pointer = { ...p, id: event.pointerId };
      if (canvas.setPointerCapture && event.pointerId != null) canvas.setPointerCapture(event.pointerId);
      event.preventDefault(); event.stopPropagation();
    }
    function pointerUp(event) {
      if (!pointer || game.state !== 'select' || blocked()) { pointer = null; return; }
      const p = coordinates(event), dx = p.x - pointer.x, dy = p.y - pointer.y; pointer = null;
      event.preventDefault(); event.stopPropagation();
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { view(systems.viewed + (dx < 0 ? 1 : -1)); return; }
      if (Math.hypot(dx, dy) > 20) return;
      const L = layout(), hit = thumbs.find(th => Math.abs(p.x - th.x) < th.w / 2 && p.y > th.y - th.h * .85 && p.y < th.y + th.h * .15);
      if (hit) { if (hit.index === systems.viewed && owned(hit.index)) node('selPick')?.click(); else view(hit.index); return; }
      if (Math.abs(p.y - (L.big.y - L.big.size * .5)) < L.big.size * .8) {
        if (p.x < width / 2 - L.big.size * .7) view(systems.viewed - 1);
        else if (p.x > width / 2 + L.big.size * .7) view(systems.viewed + 1);
        else if (owned(systems.viewed)) node('selPick')?.click();
      }
    }
    const pointerCancel = () => { pointer = null; };
    canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerCancel);
    function dispose() {
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel); pointer = null;
    }
    return { resize, draw, pointerDown, pointerUp, dispose, layout, get geometry() { return geometry; } };
  }
  return { create };
})();

// ===================== R5 · MODOS DE CARRERA (solitario y multijugador) =====================
const RACE_LENGTH=2600, RACE_PRIZES=[200,120,80,40,20];
const AI_NAMES=['Fresi','Choco','Menta','Lima','Caramelo','Nube','Kiwi','Gomi','Pompón','Bizcocho'];
let race=null, net=null, raceRivalModels=[];
function raceRand(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function charCount(){return Math.max(1,Models.characters?.length||32);}
function makeRacerModel(charIndex){
  const m=Models.mochi(charIndex);m.scale.setScalar(1.38);m.rotation.y=Math.PI;scene.add(m);
  const tag=document.createElement('div');tag.className='racer-tag';$('stage').appendChild(tag);
  return {model:m,tag};
}
function clearRace(){
  for(const r of race?.racers||[]){if(r.view){scene.remove(r.view.model);r.view.tag.remove();}}
  race=null;$('raceHud').hidden=true;game.mode='endless';
}
function startRace(kind,roster=null,seed=Date.now()){
  clearRace();game.mode=kind;game.modeTurbo=false;
  Audio.unlock();Audio.play('click');resetRun();
  const rnd=raceRand(seed);const myChar=Number(systems?.profile?.selected??0)||0;
  const used=new Set([myChar]);const pick=()=>{let c;do{c=Math.floor(rnd()*charCount());}while(used.has(c)&&used.size<charCount());used.add(c);return c;};
  const lanes=[-2,-1,1,2];
  race={kind,seed,racers:[],finishOrder:[],done:false,t:0,sendT:0};
  race.racers.push({id:net?.myId||'yo',name:'Tú',char:myChar,isPlayer:true,lane:0,x:0,dist:0,fin:false});
  const remote=(roster||[]).filter(p=>p.id!==(net?.myId));
  remote.forEach((p,i)=>race.racers.push({id:p.id,name:p.name,char:p.char,remote:true,lane:lanes[i]??0,x:lanes[i]??0,dist:0,fin:false,tx:lanes[i]??0}));
  for(let i=race.racers.length-1;i<4;i++){
    const lane=lanes[i];race.racers.push({id:'ia'+i,name:AI_NAMES[(Math.floor(seed%997)+i*3)%AI_NAMES.length]+' (IA)',char:pick(),ai:true,lane,x:lane,dist:0,fin:false,
      skill:.985+rnd()*.07,slow:0,think:rnd(),hop:rnd()*6});
  }
  for(const r of race.racers)if(!r.isPlayer)r.view=makeRacerModel(r.char);
  $('raceHud').hidden=false;beginCountdown();
}
function playerDist(){return game.distance/WORLD_SCALE;}
function raceSpeedK(){return race&&race.slowT>0?.55:1;}
function raceCrash(){
  race.slowT=1.1;game.invincible=1.4;game.shake=.3;Audio.play('crash');burst(game.x,1.2,PLAYER_Z,'#ffabd9',30);
  notify('¡Choque! Pierdes velocidad');if(navigator.vibrate)navigator.vibrate(40);
}
function laneBlockedAhead(laneIdx,zWorld,range){
  for(const h of hazards){const hl=Math.round(h.mesh.position.x/LANE_SPACING);if(hl!==laneIdx&&!(h.moving&&Math.round(LANES[h.lane]/LANE_SPACING)===laneIdx))continue;
    const d=zWorld-h.z;if(d>-3&&d<range)return true;}
  return false;
}
function raceTick(dt){
  if(!race||race.done)return;
  race.t+=dt;race.slowT=Math.max(0,(race.slowT||0)-dt);
  const me=race.racers[0];me.dist=playerDist();me.lane=mochi.lane;me.x=mochi.x;
  for(const r of race.racers){
    if(!r.ai||r.fin)continue;
    const gap=r.dist-me.dist;let k=r.skill;if(gap>70)k*=.94;else if(gap<-70)k*=1.07;
    r.slow=Math.max(0,r.slow-dt);if(r.slow>0)k*=.55;
    const spd=game.speed*k*(game.state==='running'?1:0);r.dist+=spd*dt;r.hop+=dt*(7+spd*.28);
    const zW=PLAYER_Z-(r.dist-me.dist)*WORLD_SCALE;
    r.think-=dt;
    if(r.think<=0&&laneBlockedAhead(r.lane,zW,26+spd*.6)){
      const opts=[r.lane-1,r.lane+1].filter(l=>l>=-2&&l<=2&&!laneBlockedAhead(l,zW,30));
      if(opts.length){r.lane=opts[Math.floor(Math.random()*opts.length)];r.think=.35;}else r.think=.15;
    }
    for(const h of hazards){if(Math.abs(h.z-zW)<2.2&&Math.abs(h.mesh.position.x-r.x*LANE_SPACING)<1.2&&r.slow<=0){r.slow=1.1;}}
    r.x=lerp(r.x,r.lane,1-Math.exp(-dt*9));
    if(r.dist>=RACE_LENGTH){r.fin=true;r.time=race.t;race.finishOrder.push(r.id);}
  }
  if(!me.fin&&me.dist>=RACE_LENGTH){me.fin=true;me.time=race.t;race.finishOrder.push(me.id);netSend({t:'st',id:me.id,dist:me.dist,lane:me.lane,fin:true,time:me.time});finishRace();}
  race.sendT-=dt;if(race.kind==='multi'&&race.sendT<=0){race.sendT=.1;netSend({t:'st',id:me.id,dist:me.dist,lane:me.lane,fin:me.fin,time:me.time});}
}
function raceStandings(){
  return [...race.racers].sort((a,b)=>(a.fin&&b.fin)?a.time-b.time:a.fin?-1:b.fin?1:b.dist-a.dist);
}
function raceRender(dt){
  if(!race)return;const me=race.racers[0];
  for(const r of race.racers){
    if(!r.view)continue;
    if(r.remote){r.x=lerp(r.x,r.lane,1-Math.exp(-dt*8));r.hop=(r.hop||0)+dt*9;}
    const z=PLAYER_Z-(r.dist-me.dist)*WORLD_SCALE,m=r.view.model;
    m.visible=z<14&&z>-170;m.position.set(r.x*LANE_SPACING,.04,z);
    const hop=Math.abs(Math.sin(r.hop||0));
    m.userData.pose={sx:1,sy:1-(1-hop)**6*.14+hop*.05,rot:0,earL:-.4,earR:.4,hop,foot:Math.sin(r.hop||0),arm:Math.sin(r.hop||0),run:true,dead:false,blink:0};
    m.userData.animate?.(visualTime,dt,game.speed);
    const tag=r.view.tag;
    if(m.visible){const v=new THREE.Vector3(m.position.x,2.6,z).project(camera);
      if(v.z<1){tag.hidden=false;tag.style.transform=`translate(${(v.x*.5+.5)*W}px,${(-v.y*.5+.5)*H}px) translate(-50%,-100%)`;tag.textContent=r.name;}else tag.hidden=true;}
    else tag.hidden=true;
  }
  const st=raceStandings(),pos=st.indexOf(me)+1;
  $('racePos').textContent=pos+'º';$('raceTotal').textContent='/'+race.racers.length;
  $('raceBar').style.width=Math.min(100,me.dist/RACE_LENGTH*100)+'%';
  $('raceMeters').textContent=Math.max(0,Math.round(RACE_LENGTH-me.dist))+' m';
  $('raceList').innerHTML=st.map((r,i)=>`<li class="${r.isPlayer?'me':''}"><b>${i+1}</b>${r.name}${r.fin?' 🏁':''}</li>`).join('');
}
function finishRace(){
  if(!race||race.done)return;
  // Los que no han llegado se ordenan por distancia (la IA termina "sobre la marcha").
  race.done=true;const st=raceStandings(),me=race.racers[0],pos=st.indexOf(me)+1,prize=RACE_PRIZES[pos-1]||10;
  if(systems?.profile){systems.profile.coins+=prize;systems.save?.();systems.updateUI?.();}
  Audio.play('go');setState('podium');
  $('podiumTitle').textContent=pos===1?'¡Has ganado!':pos<=3?`¡${pos}º puesto, al podio!`:`Has quedado ${pos}º`;
  $('podiumPrize').textContent='+'+prize+' monedas';
  const top=st.slice(0,3);
  $('podiumSteps').innerHTML=[1,0,2].map(i=>top[i]?`<div class="step s${i+1}"><span class="who">${top[i].name}</span><span class="block">${i+1}</span></div>`:'').join('');
  $('podiumList').innerHTML=st.map((r,i)=>`<li class="${r.isPlayer?'me':''}">${i+1}. ${r.name}</li>`).join('');
}

// ---------- Multijugador P2P (PeerJS, servidor de señalización gratuito) ----------
const PEER_PREFIX='mochi-esquiva-r5-';
function roomCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<5;i++)c+=a[Math.floor(Math.random()*a.length)];return c;}
async function loadPeer(){if(window.Peer)return window.Peer;const mod=await import('https://esm.sh/peerjs@1.5.4?bundle');return window.Peer=mod.Peer||mod.default;}
function lobbyRender(){
  if(!net)return;$('lobbyCode').textContent=net.code||'·····';
  const link=location.origin+location.pathname+'?sala='+(net.code||'');$('lobbyLink').value=link;
  const players=[{id:net.myId,name:net.myName,char:net.myChar,me:true},...net.players.filter(p=>p.id!==net.myId)];
  const rows=[];for(let i=0;i<5;i++){const p=players[i];rows.push(`<li class="${p?.me?'me':''}">${p?(p.name+(p.me?' (tú)':'')+(p.host?' 👑':'')):'<i>Libre · se rellena con IA</i>'}</li>`);}
  $('lobbyPlayers').innerHTML=rows.join('');
  $('lobbyStart').hidden=!net.host;$('lobbyWait').hidden=net.host;
  $('lobbyStatus').textContent=net.status||'';
}
function netSend(msg){if(!net)return;
  if(net.host)for(const c of net.conns)if(c.open)c.send(msg);
  else if(net.conn?.open)net.conn.send(msg);}
function netOnMessage(msg,from){
  if(!net)return;
  if(msg.t==='hello'&&net.host){net.players=net.players.filter(p=>p.id!==msg.id).concat({id:msg.id,name:msg.name,char:msg.char});net.status='Se ha unido '+msg.name;broadcastRoster();lobbyRender();}
  else if(msg.t==='roster'){net.players=msg.players;lobbyRender();}
  else if(msg.t==='start'){net.players=msg.players;startRace('multi',msg.players,msg.seed);}
  else if(msg.t==='st'){
    if(net.host)for(const c of net.conns)if(c!==from&&c.open)c.send(msg);
    const r=race?.racers.find(x=>x.id===msg.id);if(r&&r.remote){r.dist=msg.dist;r.lane=msg.lane;if(msg.fin&&!r.fin){r.fin=true;r.time=msg.time;}}
  }
}
function broadcastRoster(){const players=[{id:net.myId,name:net.myName,char:net.myChar,host:true},...net.players.filter(p=>p.id!==net.myId)];net.players=players;netSend({t:'roster',players});}
async function openLobby(joinCode=null){
  setState('lobby');
  net={host:!joinCode,code:joinCode||roomCode(),players:[],conns:[],myName:'Jugador '+Math.floor(100+Math.random()*900),myChar:Number(systems?.profile?.selected??0)||0,status:'Conectando…'};
  net.myId=net.host?PEER_PREFIX+net.code:PEER_PREFIX+net.code+'-'+Math.random().toString(36).slice(2,7);
  lobbyRender();
  try{
    const Peer=await loadPeer();const peer=new Peer(net.myId);net.peer=peer;
    peer.on('error',e=>{net.status='Error de conexión: '+(e.type||e.message)+(e.type==='unavailable-id'?' (ese código ya existe)':e.type==='peer-unavailable'?' (sala no encontrada)':'');lobbyRender();});
    peer.on('open',()=>{
      if(net.host){net.players=[{id:net.myId,name:net.myName,char:net.myChar,host:true}];net.status='Sala creada. Comparte el código o el enlace.';lobbyRender();
        peer.on('connection',c=>{if(net.conns.length>=4){c.close();return;}net.conns.push(c);c.on('data',m=>netOnMessage(m,c));c.on('close',()=>{net.conns=net.conns.filter(x=>x!==c);net.players=net.players.filter(p=>p.id!==c.peer);broadcastRoster();lobbyRender();});});}
      else{net.status='Buscando la sala '+net.code+'…';lobbyRender();const c=peer.connect(PEER_PREFIX+net.code,{reliable:true});net.conn=c;
        setTimeout(()=>{if(net&&net.conn===c&&!c.open){net.status='No se pudo conectar con la sala. Revisa el código o la red.';lobbyRender();}},15000);
        c.on('open',()=>{net.status='Conectado a la sala '+net.code;c.send({t:'hello',id:net.myId,name:net.myName,char:net.myChar});lobbyRender();});
        c.on('data',m=>netOnMessage(m,c));c.on('close',()=>{net.status='El anfitrión ha cerrado la sala';lobbyRender();});}
    });
  }catch(e){net.status='No se pudo cargar el multijugador: '+e.message;lobbyRender();}
}
function closeLobby(){try{net?.peer?.destroy();}catch{}net=null;}
function hostStart(){if(!net?.host)return;broadcastRoster();const seed=Math.floor(Math.random()*1e9);netSend({t:'start',players:net.players,seed});startRace('multi',net.players,seed);}
function bindRaceUI(){
  const on=(id,f)=>$(id)?.addEventListener('click',e=>{e.stopPropagation();Audio.unlock();f();});
  on('modeEndless',()=>startGame(false));
  on('modeSolo',()=>startRace('solo'));
  on('modeMulti',()=>openLobby());
  on('lobbyJoin',()=>{const c=$('lobbyInput').value.trim().toUpperCase();if(c.length>=4){closeLobby();openLobby(c);}});
  on('lobbyStart',hostStart);
  on('lobbyBack',()=>{closeLobby();setState('menu');});
  on('lobbyShare',async()=>{const url=$('lobbyLink').value;try{if(navigator.share)await navigator.share({title:'Mochi Esquiva',text:'¡Corre conmigo! Sala '+net.code,url});else{await navigator.clipboard.writeText(url);notify('Enlace copiado');}}catch{}});
  on('podiumAgain',()=>{if(race?.kind==='multi'&&net){net.host?hostStart():notify('Espera a que el anfitrión empiece');}else startRace('solo');});
  on('podiumMenu',()=>{clearRace();closeLobby();clearObjects();setState('menu');});
  const code=new URLSearchParams(location.search).get('sala');if(code)setTimeout(()=>openLobby(code.toUpperCase()),400);
}

let plateTime=0;const turboPads=[];let padBases,padArrows,contactShadows,rivalRings;
const roadTransform=new THREE.Object3D();
function initRoadGameplay(){
  const flat=new THREE.PlaneGeometry(1,1);flat.rotateX(-Math.PI/2);
  contactShadows=new THREE.InstancedMesh(flat,new THREE.MeshBasicMaterial({map:radialTexture(),color:0x020617,transparent:true,opacity:.82,depthWrite:false}),128);
  contactShadows.frustumCulled=false;contactShadows.count=0;scene.add(contactShadows);
  const ring=new THREE.RingGeometry(.73,.77,28);ring.rotateX(-Math.PI/2);
  rivalRings=new THREE.InstancedMesh(ring,new THREE.MeshBasicMaterial({color:0x69e7ff,transparent:true,opacity:.65,depthWrite:false}),8);
  rivalRings.frustumCulled=false;rivalRings.count=0;scene.add(rivalRings);
  padBases=new THREE.InstancedMesh(flat,new THREE.MeshBasicMaterial({color:new THREE.Color(.25,.05,.45),transparent:true,opacity:.92,depthWrite:false}),8);
  const vertices=[];
  for(const z of [-.58,0,.58]){
    const a=[[-.63,z+.22],[-.43,z+.35],[0,z-.03],[0,z-.28],[.43,z+.35],[.63,z+.22]];
    for(const ids of [[0,1,2],[0,2,3],[3,2,4],[3,4,5]])for(const i of ids)vertices.push(a[i][0],0,a[i][1]);
  }
  const arrows=new THREE.BufferGeometry();arrows.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  padArrows=new THREE.InstancedMesh(arrows,new THREE.MeshBasicMaterial({color:new THREE.Color(.6,2.2,2.1),toneMapped:false,side:THREE.DoubleSide}),8);
  for(const m of [padBases,padArrows]){m.frustumCulled=false;m.count=0;scene.add(m);}
}
function spawnTurboPad(lane,logicalZ){
  if(turboPads.length>=8)return;
  // The lane was selected as the safe lane of the traffic wave.
  turboPads.push({lane,z:-logicalZ*WORLD_SCALE});
}
function updateTurboPads(move){
  for(let i=turboPads.length-1;i>=0;i--){
    const p=turboPads[i],old=p.z;p.z+=move;
    if(old<1.25&&p.z>=-1.25&&Math.abs(game.x-LANES[p.lane])<.86){
      plateTime=1.6;Audio.play('dash');burst(game.x,.22,0,'#79ffed',20);notify('¡Placa turbo!');turboPads.splice(i,1);
    }else if(p.z>14)turboPads.splice(i,1);
  }
}
function roadInstance(mesh,i,x,z,sx,sz,y=.055){
  roadTransform.position.set(x,y,z);roadTransform.rotation.set(0,0,0);roadTransform.scale.set(sx,1,sz);roadTransform.updateMatrix();mesh.setMatrixAt(i,roadTransform.matrix);
}
function renderRoadGameplay(){
  let n=0,rn=0;
  for(const h of hazards)if(h.mesh.visible&&n<128)roadInstance(contactShadows,n++,h.mesh.position.x,h.z,2.35,2.8);
  for(const r of race?.racers||[])if(r.view?.model.visible){
    const m=r.view.model;if(n<128)roadInstance(contactShadows,n++,m.position.x,m.position.z,2.3,1.8);
    if(rn<8)roadInstance(rivalRings,rn++,m.position.x,m.position.z,1.18,1.18,.063);
  }
  contactShadows.count=n;contactShadows.instanceMatrix.needsUpdate=true;rivalRings.count=rn;rivalRings.instanceMatrix.needsUpdate=true;
  turboPads.forEach((p,i)=>{roadInstance(padBases,i,LANES[p.lane],p.z,1.75,2.7,.045);roadInstance(padArrows,i,LANES[p.lane],p.z,1,1,.052);});
  for(const m of [padBases,padArrows]){m.count=turboPads.length;m.instanceMatrix.needsUpdate=true;}
}

// ===================== R5 · DIVERSIÓN: zonas, eventos, racha, rampas, misiones =====================
const ZONES=[
  {name:'Avenida de fresa',fog:'#b0418f',tint:[1,1,1],exp:.95},
  {name:'Puente de nubes',fog:'#f0c4ec',tint:[1.14,1.1,1.2],exp:1.1},
  {name:'Ciudad de chocolate',fog:'#5e2a1c',tint:[1.22,.86,.7],exp:.9}
];
const ZONE_TIME=35;
let zoneIdx=0,zoneW=[1,0,0],zoneGroups=[],zoneFogTmp=new THREE.Color(),lastZoneShown=-1;
let streak=0,superT=0,jumpT=0,ramps=[],rampMesh=null,truck=null,truckDrop=0,lastEventKind=null;
let runMission=null,missionsDone=0;
const JUMP_TIME=1.15;
function feverOn(){return systems?.event?.kind==='fever';}
function initFun(){
  // Decorado propio de cada zona, instanciado (1 llamada de dibujo por tipo) y en bucle.
  const mk=(geo,mat,n,place)=>{const m=new THREE.InstancedMesh(geo,mat,n);const t=new THREE.Object3D();m.userData.items=[];
    for(let i=0;i<n;i++){const it=place(i);m.userData.items.push(it);}m.frustumCulled=false;return m;};
  const neonA=new THREE.MeshBasicMaterial({color:new THREE.Color(2.2,.6,1.9),toneMapped:false});
  const neonB=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,1.9,2.2),toneMapped:false});
  const arch=new THREE.TorusGeometry(7.6,.16,8,40,Math.PI);
  const tunnel=new THREE.Group();
  if(false)for(const [mat,off] of [[neonA,0],[neonB,6]])tunnel.add(mk(arch,mat,18,i=>({x:0,y:0,z:-i*12-off,s:1,ry:0})));
  const cloudMat=new THREE.MeshStandardMaterial({color:'#fff0fb',roughness:.9,emissive:'#ffc4ec',emissiveIntensity:.15});
  const cloud=new THREE.Group();cloud.add(mk(new THREE.SphereGeometry(1,14,10),cloudMat,70,i=>({x:(i%2?1:-1)*(7.2+Math.random()*4),y:-.6+Math.random()*.8,z:-i*3.1,s:1.6+Math.random()*1.8,ry:0})));
  const chocoMat=new THREE.MeshPhysicalMaterial({color:'#5a2a1e',roughness:.3,clearcoat:.8});
  const creamMat=new THREE.MeshPhysicalMaterial({color:'#ffe8d0',roughness:.35,clearcoat:.6});
  const choco=new THREE.Group();
  choco.add(mk(new THREE.CylinderGeometry(.9,1.1,1,12),chocoMat,24,i=>({x:(i%2?1:-1)*(7.4+Math.random()*1.5),y:3.5,z:-Math.floor(i/2)*18,s:1.4,sy:7+Math.random()*5,ry:0})));
  choco.add(mk(new THREE.SphereGeometry(1.05,12,8),creamMat,24,i=>({x:0,y:0,z:0,s:1,link:i})));
  zoneGroups=[null,cloud,choco];
  for(const g of zoneGroups)if(g){g.visible=false;scene.add(g);}
  // Rampas: cuña rosa con bordes de neón.
  const wedge=new THREE.BufferGeometry();
  const v=[-.85,0,1.4, .85,0,1.4, .85,.75,-1.4, -.85,.75,-1.4, -.85,0,-1.4, .85,0,-1.4];
  wedge.setAttribute('position',new THREE.Float32BufferAttribute(v,3));wedge.setIndex([0,1,2,0,2,3,4,0,3,1,5,2,3,2,5,3,5,4]);wedge.computeVertexNormals();
  rampMesh=new THREE.InstancedMesh(wedge,new THREE.MeshPhysicalMaterial({color:'#ff5fb8',emissive:'#ff3fa0',emissiveIntensity:.6,roughness:.2,clearcoat:1,side:THREE.DoubleSide}),6);
  rampMesh.count=0;rampMesh.frustumCulled=false;scene.add(rampMesh);
}
function updateZoneDecor(dt,move){
  const t=new THREE.Object3D();
  zoneGroups.forEach((g,zi)=>{
    if(!g)return;const w=zoneW[zi];g.visible=w>.01;if(!g.visible)return;
    const meshes=g.children;
    for(const m of meshes){const items=m.userData.items;
      for(let i=0;i<items.length;i++){const it=items[i];
        if(it.link!==undefined){const p=meshes[0].userData.items[it.link];t.position.set(p.x,p.y+p.sy/2+.3,p.z);t.scale.set(1.55,.75*w,1.55);}
        else{it.z+=move;const span=zi===1?217:216;if(it.z>20)it.z-=span;t.position.set(it.x,it.y*w-(1-w)*3,it.z);t.scale.set(it.s,(it.sy||it.s)*w,it.s);}
        t.rotation.set(0,it.ry||0,0);t.updateMatrix();m.setMatrixAt(i,t.matrix);}
      m.instanceMatrix.needsUpdate=true;}
  });
}
function funReset(){streak=0;superT=0;jumpT=0;ramps.length=0;truck=null;truckDrop=0;zoneIdx=0;zoneW=[1,0,0];lastZoneShown=0;missionsDone=0;newMission();updateFunHud();}
function newMission(){
  const kinds=['cupcake','donut','tea','gummy','icecream','lollipop','sushi','cotton','macaron','jelly'];
  const r=Math.random();
  if(r<.6){const k=kinds[Math.floor(Math.random()*kinds.length)];const names={cupcake:'cupcakes',donut:'donuts',tea:'teteras',gummy:'gominolas',icecream:'helados',lollipop:'piruletas',sushi:'sushis',cotton:'algodones',macaron:'macarons',jelly:'gelatinas'};
    runMission={type:'pass',kind:k,goal:4+Math.floor(Math.random()*4)+missionsDone,n:0,text:'Adelanta '+'{g}'+' '+names[k],reward:40+missionsDone*20};}
  else runMission={type:'near',goal:5+missionsDone*2,n:0,text:'Haz {g} esquives cerrados',reward:50+missionsDone*20};
}
function missionProgress(type,kind){
  if(!runMission||runMission.type!==type||(type==='pass'&&runMission.kind!==kind))return;
  runMission.n++;
  if(runMission.n>=runMission.goal){const r=runMission.reward;if(systems?.profile){systems.profile.coins+=r;systems.save?.();}
    notify('¡Misión cumplida! +'+r+' monedas');Audio.play('star');burst(game.x,1.6,PLAYER_Z,'#ffe27a',40);missionsDone++;newMission();}
  updateFunHud();
}
function funOnPass(h){missionProgress('pass',h.kind);}
function funOnNear(){if(superT>0)return;streak=Math.min(1,streak+.2);if(streak>=1){superT=4;streak=0;game.invincible=Math.max(game.invincible,4);plateTime=Math.max(plateTime,4);
  notify('¡SÚPER TURBO!');Audio.play('dash');game.shake=.25;burst(game.x,1.2,PLAYER_Z,'#7ff6ff',50);}updateFunHud();}
function spawnRamp(lane,logicalZ){if(ramps.length<6)ramps.push({lane,z:-logicalZ*WORLD_SCALE});}
function funTick(dt,move){
  // Zonas: cambian cada ZONE_TIME s con transición suave de 3 s.
  const zi=Math.floor(game.elapsed/ZONE_TIME)%ZONES.length;zoneIdx=zi;
  for(let i=0;i<ZONES.length;i++)zoneW[i]=lerp(zoneW[i],i===zi?1:0,1-Math.exp(-dt*1.2));
  if(zi!==lastZoneShown){lastZoneShown=zi;showBanner(ZONES[zi].name);}
  streak=Math.max(0,streak-dt*.012);superT=Math.max(0,superT-dt);
  if(jumpT>0)jumpT=Math.max(0,jumpT-dt);
  for(let i=ramps.length-1;i>=0;i--){const r=ramps[i],old=r.z;r.z+=move;
    if(old<1.4&&r.z>=-1.4&&Math.abs(game.x-LANES[r.lane])<.95&&jumpT<=0){jumpT=JUMP_TIME;Audio.play('dash');notify('¡Salto!');burst(game.x,.4,0,'#ff9de0',26);missionProgress('jump');ramps.splice(i,1);}
    else if(r.z>16)ramps.splice(i,1);}
  // Eventos sorpresa.
  const ek=systems?.event?.kind||null;
  if(ek!==lastEventKind){lastEventKind=ek;if(ek==='truck')spawnTruck();if(ek==='fever')notify('¡Modo fiebre dorado! Puntos ×2');}
  if(truck){truckDrop-=dt;if(truckDrop<=0&&truck.z<-20&&truck.z>-140){truckDrop=.55;const lane=truck.finalLane;
      const nb=[lane-1,lane+1].filter(l=>l>=0&&l<5);collectibles?.spawnWave(nb[Math.floor(Math.random()*nb.length)],-(truck.z-6)/WORLD_SCALE,game.wave,{kind:'coins'});
      truck.mesh.userData.animate?.(visualTime,0,0);}
    if(!hazards.includes(truck))truck=null;}
}
function spawnTruck(){
  const safe=game.lastSafe;const lanes=[0,1,2,3,4].filter(l=>Math.abs(l-safe)>=1);const lane=lanes[Math.floor(Math.random()*lanes.length)];
  const h=spawnHazard('gummy',lane,lane,game.wave,70,1.3,game.speed*.86);h.mesh.scale.set(2.1,2.3,2.4);h.truck=true;truck=h;truckDrop=1;
  notify('¡Camión gigante de gominolas!');
}
function showBanner(text){const n=$('zoneBanner');if(!n)return;n.textContent=text;n.classList.remove('show');void n.offsetWidth;n.classList.add('show');}
function updateFunHud(){
  const s=$('streakFill');if(s)s.style.width=(superT>0?100:streak*100)+'%';
  const sb=$('streakBox');if(sb)sb.dataset.super=String(superT>0);
  const m=$('runMission');if(m&&runMission)m.textContent='🎯 '+runMission.text.replace('{g}',runMission.goal)+' · '+runMission.n+'/'+runMission.goal;
}
function funRender(dt){
  // Mezcla de paletas por zona (niebla, exposición y tinte del etalonaje).
  const fog=new THREE.Color(0,0,0),tint=[0,0,0];let exp=0;
  ZONES.forEach((z,i)=>{const w=zoneW[i];zoneFogTmp.set(z.fog);fog.r+=zoneFogTmp.r*w;fog.g+=zoneFogTmp.g*w;fog.b+=zoneFogTmp.b*w;for(let k=0;k<3;k++)tint[k]+=z.tint[k]*w;exp+=z.exp*w;});
  const sum=zoneW.reduce((a,b)=>a+b,0)||1;fog.multiplyScalar(1/sum);
  if(feverOn()){tint[0]*=1.12;tint[1]*=1.04;tint[2]*=.82;}
  scene.fog.color.copy(fog);renderer.toneMappingExposure=exp/sum;
  if(gradePass?.uniforms.tint)gradePass.uniforms.tint.value.set(tint[0]/sum,tint[1]/sum,tint[2]/sum);
  // Salto: arco, sombra que se separa y cámara que acompaña.
  const a=jumpT>0?Math.sin((1-jumpT/JUMP_TIME)*Math.PI):0;
  player.position.y+=a*3.2;player.rotation.x=-a*.35;
  shadow.scale.multiplyScalar(1-a*.5);shadowMat.opacity*=1-a*.6;
  camera.position.y+=a*1.4;camera.fov+=a*6;camera.updateProjectionMatrix();
  // Rampas instanciadas.
  const t=new THREE.Object3D();ramps.forEach((r,i)=>{t.position.set(LANES[r.lane],.02,r.z);t.rotation.set(0,0,0);t.scale.set(1,1,1);t.updateMatrix();rampMesh.setMatrixAt(i,t.matrix);});
  rampMesh.count=ramps.length;rampMesh.instanceMatrix.needsUpdate=true;
  if(hudFunT===undefined||(hudFunT+=dt)>.2){hudFunT=0;updateFunHud();}
}
let hudFunT=0;
// Precompila los shaders y llena el pool con un vehículo de cada tipo para que no haya tirones al aparecer uno nuevo.
function prewarm(){
  try{for(const k of KINDS){const h=spawnHazard(k,2,2,0,40,1.3,0);}renderer.compile(scene,camera);
    for(let i=hazards.length-1;i>=0;i--)recycleHazard(i);}catch(e){console.warn('prewarm',e);}
}

try {
  init();
} catch (error) {
  console.error('Mochi Esquiva:', error);
  $('loading').hidden = true;
  $('fatal').hidden = false;
  $('fatalText').textContent = 'No se pudo iniciar el mundo 3D. Comprueba que tu navegador admite WebGL 2 y que tienes conexión para cargar Three.js.';
  $('retryButton').onclick = () => location.reload();
}
