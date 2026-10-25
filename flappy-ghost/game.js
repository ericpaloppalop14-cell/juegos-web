(() => {
  const t=(key,params)=>window.FG_I18N.text(key,params);
  const nameOf=c=>window.FG_I18N.character(c);
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../tmp/fg-pack/ghost-economy.ts
  var BUY_MIN_UNLOCK = 75;
  var PACK_IDS = ["cristal", "umbra", "algodon", "rey", "diablo"];
  var KEY = "flappyGhostShop.v1";
  var EMPTY = {
    owned: [],
    adsOff: false,
    games: 0,
    deaths: 0,
    trial: null
  };
  function loadShop() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...EMPTY, owned: [] };
      const p = JSON.parse(raw);
      return {
        owned: Array.isArray(p.owned) ? p.owned.filter((id) => typeof id === "string") : [],
        adsOff: !!p.adsOff,
        games: Number(p.games) || 0,
        deaths: Number(p.deaths) || 0,
        trial: typeof p.trial === "string" ? p.trial : null
      };
    } catch {
      return { ...EMPTY, owned: [] };
    }
  }
  function saveShop(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
    }
  }
  function canBuyId(unlock, id) {
    if (id === "corona") return false;
    return CHARACTERS.find(c=>c.id===id)?.purchaseOnly || (unlock >= BUY_MIN_UNLOCK || PACK_IDS.includes(id));
  }
  function bumpGame(s) {
    const next = { ...s, games: s.games + 1 };
    saveShop(next);
    return next;
  }
  function bumpDeath(s) {
    const next = { ...s, deaths: s.deaths + 1 };
    saveShop(next);
    return next;
  }
  function setTrial(s, id) {
    const next = { ...s, trial: id };
    saveShop(next);
    return next;
  }
  // ../tmp/fg-pack/flappy-ghost.ts
  var BEST_KEY = "flappyGhostBest.v1";
  var PLAY_TIME_KEY = "flappyGhostPlayTimeSeconds.v1";
  var SKIN_KEY = "flappyGhostSkin.v1";
  var LW = 420;
  var LH = 760;
  var STEP = 1 / 60;
  var DOOR_W = 108;
  var DOOR_SPACING = 440;
  var BASE_SPEED = 230;
  var SPEED_PER = 1.5;
  var MAX_SPEED = 325;
  var GRAVITY = 2100;
  var FLAP = -620;
  var MAX_FALL = 900;
  var GAP0 = 250;
  var GAP_MIN = 214;
  var GHOST_RADIUS = 24;
  var MIN_TRANSFER_SECONDS = 1.12;
  var RECOVERY_SECONDS = 3;
  var RECOVERY_APPROACH_SECONDS = 1.7;
  var CHARACTERS = [
    { id: "brillo", name: "Brillo", unlock: 0 },
    { id: "cosmos", name: "Cosmos", unlock: 15 },
    { id: "lunar", name: "Lunar", unlock: 30 },
    { id: "conde", name: "Conde", unlock: 50 },
    { id: "bruja", name: "Bruja", unlock: 75 },
    { id: "angel", name: "Angel", unlock: 100 },
    { id: "cristal", name: "Cristal", unlock: 150 },
    { id: "umbra", name: "Umbra", unlock: 200 },
    { id: "algodon", name: "Algodon", unlock: 300 },
    { id: "rey", name: "Rey 301", unlock: 400 },
    { id: "diablo", name: "Diablillo", unlock: 500 },
    { id: "corona", name: "Corona 301", unlock: 1e3 },
    ...["Prisma","Aurora","Noctis","Rubí","Helios"].map((name,i)=>({id:["prisma","aurora","noctis","rubi","helios"][i],name,unlock:null,purchaseOnly:true}))
  ];
  function loadBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  }
  function saveBest(n) {
    try {
      localStorage.setItem(BEST_KEY, String(n));
    } catch {
    }
  }
  function loadPlayTimeSeconds() {
    try {
      return Number(localStorage.getItem(PLAY_TIME_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  }
  function savePlayTimeSeconds(n) {
    try {
      localStorage.setItem(PLAY_TIME_KEY, String(Math.floor(n)));
    } catch {
    }
  }
  function playGames() {
    return window.PlayGamesBridge || null;
  }
  function submitRecord(score) {
    try {
      playGames()?.submitRecord(Math.max(0, Math.floor(score)));
    } catch {
    }
  }
  function submitPlayTime(seconds) {
    try {
      playGames()?.submitPlayTimeSeconds(Math.max(0, Math.floor(seconds)));
    } catch {
    }
  }
  function loadSkin() {
    try {
      const n = Number(localStorage.getItem(SKIN_KEY) || 0);
      return Number.isInteger(n) && n >= 0 && n < CHARACTERS.length ? n : 0;
    } catch {
      return 0;
    }
  }
  function saveSkin(n) {
    try {
      localStorage.setItem(SKIN_KEY, String(n));
    } catch {
    }
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function saleLabel(i, best) {
    const c = CHARACTERS[i];
    if(c.purchaseOnly)return window.NativeBridge.price("skin_"+c.id)||t('exclusive');
    if (canBuyId(c.unlock,c.id) && best<c.unlock) return window.NativeBridge.price("skin_"+c.id) || t('points',{score:c.unlock});
    return String(c.unlock);
  }
  var FlappyGhost = class {
    constructor(canvas2, hooks) {
      __publicField(this, "canvas");
      __publicField(this, "ctx");
      __publicField(this, "mode", "ready");
      __publicField(this, "score", 0);
      __publicField(this, "best", 0);
      __publicField(this, "running", false);
      __publicField(this, "raf", 0);
      __publicField(this, "acc", 0);
      __publicField(this, "last", 0);
      __publicField(this, "t", 0);
      __publicField(this, "shake", 0);
      __publicField(this, "flash", 0);
      __publicField(this, "ghost", { x: 118, y: LH * 0.48, vy: 0, rot: 0, flap: 0 });
      __publicField(this, "doors", []);
      __publicField(this, "particles", []);
      __publicField(this, "gems", []);
      __publicField(this, "stars", []);
      __publicField(this, "clouds", []);
      __publicField(this, "bats", []);
      __publicField(this, "view", { scale: 1, ox: 0, oy: 0, cssW: LW, cssH: LH });
      __publicField(this, "audio", null);
      __publicField(this, "unsubs", []);
      __publicField(this, "art", {});
      __publicField(this, "charImgs", []);
      __publicField(this, "selected", 0);
      __publicField(this, "hint", "");
      __publicField(this, "hintT", 0);
      __publicField(this, "unlockedNow", []);
      __publicField(this, "trail", []);
      __publicField(this, "rush", 0);
      __publicField(this, "loadTimer", 0);
      __publicField(this, "alive", true);
      __publicField(this, "usedContinue", false);
      __publicField(this, "continuePending", false);
      __publicField(this, "roundId", 0);
      __publicField(this, "recoveryRemaining", 0);
      __publicField(this, "renderAlpha", 1);
      __publicField(this, "totalPlayTimeSeconds", 0);
      __publicField(this, "playTimeSubmitAcc", 0);
      __publicField(this, "shop", loadShop());
      __publicField(this, "hooks");
      const ctx = canvas2.getContext("2d");
      if (!ctx) throw new Error(t('loadError'));
      this.canvas = canvas2;
      this.ctx = ctx;
      this.hooks = hooks;
      this.best = loadBest();
      this.shop = loadShop();
      this.selected = loadSkin();
      this.totalPlayTimeSeconds = loadPlayTimeSeconds();
      if (!this.isUnlocked(this.selected)) this.selected = 0;
      this.pickerPage = Math.floor(this.selected / 12);
      this.makeDecor();
      this.skyTime = 0;
      this.skyEffects = new window.GhostSkyEffects();
      this.assetsReady = false;
      this.artReady = this.loadArt();
      this.reset(true);
    }
    async loadArt() {
      // Decode before the first playable frame, including the character menu.
      const load = (src) => new Promise((resolve) => {
        const im = new Image();
        im.decoding = "async";
        im.onload = async () => {
          try { await im.decode(); } catch {}
          resolve(im);
        };
        im.onerror = () => resolve(null);
        im.src = src;
      });
      const entries = [
        ["sky", "game/sky-premium.png"], ["moon", "game/moon.png"],
        ["doorTop", "game/door-top.png"], ["doorBottom", "game/door-bottom.png"],
        ["coronaBody", "game/corona-body.png?v=3"],
        ["coronaWings", "game/corona-wings.png?v=1"],
        ["coronaNebula", "game/corona-nebula.png?v=2"]
      ];
      await Promise.all(entries.map(async ([key, src]) => {
        const im = await load(src);
        if (this.alive && im) this.art[key] = im;
      }));
      this.charImgs = await Promise.all(CHARACTERS.map((_, i) => load('game/chars/' + i + '.png?v=6')));
      this.art.ghost = this.charImgs[this.selected];
      await window.CrystalGhosts.prepare();
      // Rasterize the backdrop once at the maximum useful mobile resolution.
      if (this.art.sky && this.alive) {
        const cache = document.createElement("canvas");
        cache.width = 900;
        cache.height = Math.round(900 * LH / LW);
        const c = cache.getContext("2d");
        if (c) {
          c.imageSmoothingQuality = "high";
          c.drawImage(this.art.sky, 0, 0, cache.width, cache.height);
          this.art.sky = cache;
        }
      }
      // One upload replaces up to five radial-gradient fills every frame.
      const glow = document.createElement("canvas");
      glow.width = glow.height = 192;
      const gc = glow.getContext("2d");
      if (gc) {
        const gradient = gc.createRadialGradient(96, 104, 12, 96, 104, 96);
        gradient.addColorStop(0, "rgba(190,210,255,0.28)");
        gradient.addColorStop(1, "rgba(200,230,255,0)");
        gc.fillStyle = gradient;
        gc.fillRect(0, 0, 192, 192);
        this.art.ghostGlow = glow;
      }
    }
    async start() {
      if (this.running || this.starting) return;
      this.starting = true;
      await this.artReady;
      if (document.fonts) await Promise.race([Promise.all([document.fonts.load('700 22px Fredoka'),document.fonts.load('600 16px Nunito')]), new Promise(r => setTimeout(r, 1500))]);
      if (!this.alive) return;
      // Create the audio graph before input; resume remains in the user gesture.
      try { this.audio = new AudioContext(); } catch {}
      this.shop = loadShop();
      this.running = true;
      this.bind();
      this.layout();
      // Touch every texture on the render surface while the loading cover is up.
      // Doors otherwise enter the viewport for the first time during play.
      for (const im of [...Object.values(this.art), ...this.charImgs]) {
        if (im) this.ctx.drawImage(im, 0, 0, 8, 8);
      }
      this.draw();
      await new Promise(requestAnimationFrame);
      this.draw();
      await new Promise(requestAnimationFrame);
      if (!this.alive) return;
      this.assetsReady = true;
      document.getElementById("loading")?.remove();
      this.last = performance.now();
      const tick = (now) => {
        if (!this.running) return;
        try {
          this.advanceFrame(now);
          this.draw(this.acc / STEP);
        } catch {
          this.acc = 0;
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    advanceFrame(now) {
      let dt = (now - this.last) / 1e3;
      this.last = now;
      if (!Number.isFinite(dt) || dt < 0) dt = STEP;
      // Actual background/native transitions pause; a visible GC/render hitch
      // drops unseen elapsed time without unexpectedly opening the pause UI.
      if (document.hidden || this.nativeSuspended) {
        if (this.mode === "play") this.mode = "pause";
        this.acc = 0;
        this.snapRenderState();
        return;
      }
      if (dt > 0.2) {
        this.acc = 0;
        this.snapRenderState();
        return;
      }
      this.acc += Math.min(dt, 0.08);
      let n = 0;
      while (this.acc + 1e-9 >= STEP && n < 5) {
        this.step(STEP);
        this.acc = Math.max(0, this.acc - STEP);
        n += 1;
      }
      if (this.acc >= STEP) this.acc %= STEP;
    }
    destroy() {
      this.alive = false;
      this.running = false;
      cancelAnimationFrame(this.raf);
      clearTimeout(this.loadTimer);
      for (const u of this.unsubs) u();
      this.unsubs = [];
    }
    bind() {
      const onPointer = (e) => {
        if(window.GhostUI.hasOverlay())return;
        // Ignora dedos "extra" (palma de la otra mano, segundo dedo apoyado sin
        // querer): solo el toque principal debe poder hacer aletear al fantasma.
        if (e.isPrimary === false) return;
        e.preventDefault();
        e.stopPropagation();
        const pt = this.toLogical(e.clientX, e.clientY);
        if (this.mode === "play" || this.mode === "pause") {
          if (pt.x > LW - 68 && pt.x < LW - 14 && pt.y > 16 && pt.y < 70) {
            this.togglePause();
            return;
          }
        }
        if (this.mode === "ready") {
          if (this.hitShop(pt.x, pt.y)) {
            this.hooks.openShop();
            return;
          }
          if (this.hitCharacter(pt.x, pt.y)) return;
        }
        if (this.mode === "dead") {
          if (this.hitContinue(pt.x, pt.y)) {
            void this.tryContinue();
            return;
          }
          if (this.hitShop(pt.x, pt.y)) {
            this.hooks.openShop();
            return;
          }
          if (this.hitRecordLeaderboard(pt.x, pt.y)) {
            try { playGames()?.showRecordLeaderboard(); } catch {}
            return;
          }
          if (this.hitTimeLeaderboard(pt.x, pt.y)) {
            try { playGames()?.showPlayTimeLeaderboard(); } catch {}
            return;
          }
        }
        this.flap();
      };
      const onKey = (e) => {
        if(window.GhostUI.hasOverlay()||e.target?.closest?.('button,input,textarea,select,a'))return;
        if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          this.flap();
        }
        if (e.key === "p" || e.key === "P") this.togglePause();
        if (e.key === "r" || e.key === "R") this.reset(true);
      };
      const block = (e) => e.preventDefault();
      // Evita que una pulsación larga saque el menú contextual/lupa de selección
      // de algunos WebView de Android en medio de una partida.
      const onContextMenu = (e) => e.preventDefault();
      const onResize = () => this.layout();
      const onVis = () => {
        if (document.hidden && (this.mode==='play'||this.mode==='pause')) {
          if(this.mode==='play')this.mode='pause';
          savePlayTimeSeconds(this.totalPlayTimeSeconds);
          submitPlayTime(this.totalPlayTimeSeconds);
        }
        this.last = performance.now();
        this.acc = 0;
        this.snapRenderState();
      };
      this.canvas.addEventListener("pointerdown", onPointer, { passive: false });
      this.canvas.addEventListener("touchmove", block, { passive: false });
      this.canvas.addEventListener("contextmenu", onContextMenu);
      window.addEventListener("keydown", onKey, { passive: false });
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVis);
      const ro = new ResizeObserver(() => this.layout());
      ro.observe(this.canvas.parentElement || this.canvas);
      this.unsubs.push(() => this.canvas.removeEventListener("pointerdown", onPointer));
      this.unsubs.push(() => this.canvas.removeEventListener("touchmove", block));
      this.unsubs.push(() => this.canvas.removeEventListener("contextmenu", onContextMenu));
      this.unsubs.push(() => window.removeEventListener("keydown", onKey));
      this.unsubs.push(() => window.removeEventListener("resize", onResize));
      this.unsubs.push(() => document.removeEventListener("visibilitychange", onVis));
      this.unsubs.push(() => ro.disconnect());
      const onEntitlements = () => this.syncShop();
      window.addEventListener("ghost-entitlements", onEntitlements);
      this.unsubs.push(() => window.removeEventListener("ghost-entitlements", onEntitlements));
      const pauseNative = () => {
        this.nativeSuspended = true;
        if(this.mode==='play'||this.mode==='pause'){
          savePlayTimeSeconds(this.totalPlayTimeSeconds);
          submitPlayTime(this.totalPlayTimeSeconds);
        }
        if (this.mode === "play") this.mode = "pause";
        this.acc = 0;
      };
      const resumeNative = () => {
        this.nativeSuspended = false;
        this.last = performance.now();
        this.acc = 0;
        this.snapRenderState();
      };
      window.addEventListener("ghost-native-pause", pauseNative);
      window.addEventListener("ghost-native-resume", resumeNative);
      this.unsubs.push(() => window.removeEventListener("ghost-native-pause", pauseNative));
      this.unsubs.push(() => window.removeEventListener("ghost-native-resume", resumeNative));
    }
    layout() {
      const rect = this.canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.round(cssW * dpr);
      const bh = Math.round(cssH * dpr);
      if (this.canvas.width !== bw || this.canvas.height !== bh) {
        this.canvas.width = bw;
        this.canvas.height = bh;
      }
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Fit the entire playfield: tall iPhones must not crop shop/pause controls.
      const scale = Math.min(cssW / LW, cssH / LH);
      this.view = {
        scale,
        ox: (cssW - LW * scale) / 2,
        oy: (cssH - LH * scale) / 2,
        cssW,
        cssH
      };
    }
    toLogical(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (clientX - rect.left - this.view.ox) / this.view.scale;
      const y = (clientY - rect.top - this.view.oy) / this.view.scale;
      return { x, y };
    }
    reset(keepReady) {
      // An outstanding reward belongs to the current round, never the next one.
      if (this.continuePending) return false;
      this.roundId += 1;
      this.score = 0;
      this.t = 0;
      this.shake = 0;
      this.flash = 0;
      this.acc = 0;
      this.ghost = { x: 96, y: this.mode === "ready" || keepReady ? 250 : LH * 0.46, vy: 0, rot: 0, flap: 0 };
      this.particles = [];
      this.gems = [];
      this.trail = [];
      this.doors = [];
      this.unlockedNow = [];
      this.rush = 0;
      this.usedContinue = false;
      this.recoveryRemaining = 0;
      this.invuln = 0;
      this.shop = setTrial(this.shop, null);
      if (!this.isUnlocked(this.selected)) this.selected = 0;
      this.spawnDoor(520, 301);
      this.spawnDoor(520 + DOOR_SPACING, 303);
      this.mode = keepReady ? "ready" : "play";
      this.snapRenderState();
      return true;
    }
    makeDecor() {
      this.stars = Array.from({ length: 18 }, () => ({
        x: Math.random() * LW,
        y: Math.random() * LH,
        s: rand(0.6, 2.1),
        p: Math.random() * 6
      }));
      this.clouds = Array.from({ length: 8 }, (_, i) => ({
        x: i * 140 + rand(-20, 40),
        y: rand(40, LH - 80),
        s: rand(0.7, 1.4),
        a: rand(0.18, 0.38),
        v: rand(18, 40)
      }));
      this.bats = Array.from({ length: 6 }, () => ({
        x: rand(0, LW),
        y: rand(50, 280),
        v: rand(28, 70),
        p: Math.random() * 6
      }));
    }
    spawnDoor(x, num) {
      const difficulty = Math.max(0, this.score - 5);
      const gap = Math.max(GAP_MIN, GAP0 - difficulty * 0.4);
      const margin = 86 + gap * 0.5;
      const previous = this.doors[this.doors.length - 1];
      // Independent random heights could demand a 356px climb in 0.635s.
      // Bound the change and preserve time after leaving the preceding panel.
      const maxShift = Math.min(105, 62 + difficulty * 0.65);
      const holeY = previous
        ? rand(Math.max(margin, previous.holeY - maxShift), Math.min(LH - margin, previous.holeY + maxShift))
        : LH * 0.5;
      if (previous) x = Math.max(x, previous.x + this.doorSpacing());
      this.doors.push({ x, prevX: x, num, holeY, gap, w: DOOR_W, passed: false, alive: true });
    }
    speed() {
      return Math.min(MAX_SPEED, BASE_SPEED + Math.max(0, this.score - 5) * SPEED_PER);
    }
    doorSpacing() {
      return Math.max(DOOR_SPACING, DOOR_W + 2 * GHOST_RADIUS + this.speed() * MIN_TRANSFER_SECONDS);
    }
    snapRenderState() {
      this.ghost.prevY = this.ghost.y;
      this.ghost.prevRot = this.ghost.rot;
      for (const door of this.doors) door.prevX = door.x;
      this.renderAlpha = 1;
    }
    displayGhost() {
      const g = this.ghost, a = this.renderAlpha;
      return { x: g.x, y: (g.prevY ?? g.y) + (g.y - (g.prevY ?? g.y)) * a,
        rot: (g.prevRot ?? g.rot) + (g.rot - (g.prevRot ?? g.rot)) * a };
    }
    beginRecovery() {
      this.mode = "recovery";
      this.recoveryRemaining = RECOVERY_SECONDS;
      this.ghost.vy = 0;
      this.ghost.rot = 0;
      this.acc = 0;
      this.last = performance.now();
      this.snapRenderState();
    }
    finishRecovery() {
      if (this.mode !== "recovery" || this.recoveryRemaining > 0 || this.continuePending) return;
      this.mode = "play";
      this.last = performance.now();
      this.acc = 0;
      this.ghost.vy = FLAP;
      this.ghost.flap = 0.16;
      this.snapRenderState();
      this.beep(520, 0.08, "sine", 0.045);
    }
    isUnlocked(i) {
      const c = CHARACTERS[i];
      if (!c) return false;
      if (c.id === "corona") return this.best >= c.unlock;
      if(c.purchaseOnly)return this.shop.owned.includes(c.id);
      if (this.best >= c.unlock) return true;
      if (this.shop.owned.includes(c.id)) return true;
      if (this.shop.trial === c.id) return true;
      return false;
    }
    syncShop(s) {
      this.shop = s ?? loadShop();
      if (!this.isUnlocked(this.selected)) this.selected = 0;
    }
    hitShop(x, y) {
      if (this.mode === "ready") return x >= 16 && x <= 108 && y >= 18 && y <= 66;
      if (this.mode === "dead") return x >= LW / 2 - 140 && x <= LW / 2 + 140 && y >= LH / 2 + 62 && y <= LH / 2 + 104;
      return false;
    }
    hitRecordLeaderboard(x, y) {
      return this.mode === "dead" && x >= LW / 2 - 140 && x <= LW / 2 - 4 && y >= LH / 2 + 112 && y <= LH / 2 + 150;
    }
    hitTimeLeaderboard(x, y) {
      return this.mode === "dead" && x >= LW / 2 + 4 && x <= LW / 2 + 140 && y >= LH / 2 + 112 && y <= LH / 2 + 150;
    }
    hitContinue(x, y) {
      if (this.mode !== "dead" || this.usedContinue || this.shop.adsOff || !window.NativeBridge.isNative()) return false;
      return x >= LW / 2 - 130 && x <= LW / 2 + 130 && y >= LH / 2 + 14 && y <= LH / 2 + 54;
    }
    charCell(i) {
      const local = i % 12;
      const col = local % 4;
      const row = Math.floor(local / 4);
      const w = 88;
      const h = 86;
      const count = Math.min(12, CHARACTERS.length - this.pickerPage * 12);
      const lastRow = Math.floor((count - 1) / 4);
      const lastCount = count - lastRow * 4;
      const extra = row === lastRow && lastCount < 4 ? (4 - lastCount) * 48 : 0;
      const x = 20 + extra + col * 96;
      const y = 318 + row * 86;
      return { x, y, w, h };
    }
    hitCharacter(x, y) {
      if (y >= 596 && y <= 650 && x >= 35 && x <= 385) {this.pickerPage = this.pickerPage ? 0 : 1;return true;}
      for (let i = this.pickerPage * 12; i < Math.min(CHARACTERS.length,(this.pickerPage+1)*12); i++) {
        const c = this.charCell(i);
        if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          if (this.isUnlocked(i)) {
            this.selected = i;
            saveSkin(i);
            this.hint = nameOf(CHARACTERS[i]);
            this.hintT = 1.2;
            this.beep(640, 0.08, "sine", 0.05);
          } else if (canBuyId(CHARACTERS[i].unlock, CHARACTERS[i].id)) {
            this.hint = CHARACTERS[i].purchaseOnly ? t('exclusiveHint',{name:nameOf(CHARACTERS[i])}) : t('scoreOrShop',{name:nameOf(CHARACTERS[i]),score:CHARACTERS[i].unlock});
            this.hintT = 1.8;
            this.beep(180, 0.1, "triangle", 0.04);
          } else {
            this.hint = t('unlockHint',{name:nameOf(CHARACTERS[i]),score:CHARACTERS[i].unlock});
            this.hintT = 1.6;
            this.beep(180, 0.1, "triangle", 0.04);
          }
          return true;
        }
      }
      return false;
    }
    flap() {
      if(window.GhostUI.hasOverlay())return;
      if (!this.assetsReady) return;
      if (this.continuePending) return;
      this.unlockAudio();
      if (this.mode === "recovery") {
        this.finishRecovery();
        return;
      }
      if (this.mode === "ready") {
        this.shop = bumpGame(this.shop);
        this.mode = "play";
        this.last = performance.now();
        this.acc = 0;
        this.ghost.y = LH * 0.46;
        this.ghost.vy = FLAP;
        this.ghost.flap = 0.16;
        this.snapRenderState();
        this.beep(520, 0.08, "sine", 0.045);
        return;
      }
      if (this.mode === "dead") {
        this.reset(true);
        return;
      }
      if (this.mode === "pause") {
        this.beginRecovery();
        return;
      }
      if (this.mode === "play") {
        this.ghost.vy = FLAP;
        this.ghost.flap = 0.14;
        this.beep(560 + Math.random() * 40, 0.07, "sine", 0.04);
        this.burst(this.ghost.x - 8, this.ghost.y + 10, "rgba(255,255,255,0.85)", 6);
        if (window.FGParallax) window.FGParallax.flap(this.ghost.x, this.ghost.y);
      }
    }
    togglePause() {
      if (this.mode === "play") this.mode = "pause";
      else if (this.mode === "pause") this.beginRecovery();
    }
    die() {
      if (this.mode !== "play") return;
      this.mode = "dead";
      this.shake = 0.22;
      this.flash = 0.16;
      this.beep(140, 0.22, "triangle", 0.06);
      this.burst(this.ghost.x, this.ghost.y, "#ffffff", 22);
      this.burst(this.ghost.x, this.ghost.y, "#c9a6ff", 10);
      const prevBest = this.best;
      if (this.score > this.best) {
        this.best = this.score;
        saveBest(this.best);
      }
      submitRecord(this.best);
      savePlayTimeSeconds(this.totalPlayTimeSeconds);
      submitPlayTime(this.totalPlayTimeSeconds);
      this.unlockedNow = CHARACTERS.filter((c) => !c.purchaseOnly && c.unlock > prevBest && c.unlock <= this.best).map((c) => c.id);
      if (this.unlockedNow.length) this.beep(880, 0.18, "sine", 0.05);
      this.shop = bumpDeath(this.shop);
      this.snapRenderState();
    }
    async tryContinue() {
      if (this.mode !== "dead" || this.usedContinue || this.continuePending || this.shop.adsOff) return;
      const roundId = this.roundId;
      this.continuePending = true;
      let ok = false;
      try { ok = await this.hooks.showAd("continue"); }
      catch {}
      finally { this.continuePending = false; }
      if (!ok || this.mode !== "dead" || roundId !== this.roundId) {
        if (this.mode === "dead" && roundId === this.roundId) {
          this.hint = t('adUnavailable');
          this.hintT = 3;
        }
        return;
      }
      this.usedContinue = true;
      this.ghost.x = 96;
      this.ghost.vy = 0;
      this.ghost.flap = 0;
      this.ghost.rot = 0;
      // Drop the crashed/passed panel without awarding a point. Keep X stable;
      // moving the player past a panel could put it inside the next one.
      const nearest = this.doors.find(d => !d.passed && d.x + d.w > this.ghost.x - GHOST_RADIUS);
      this.ghost.y = Math.max(180, Math.min(LH - 180, nearest?.holeY ?? LH * 0.46));
      this.doors = this.doors.filter(d => d.x > this.ghost.x + GHOST_RADIUS + 52);
      const firstX = this.ghost.x + GHOST_RADIUS + this.speed() * RECOVERY_APPROACH_SECONDS;
      if (this.doors.length) {
        const shift = Math.max(0, firstX - this.doors[0].x);
        for (const d of this.doors) d.x += shift;
        this.ghost.y = this.doors[0].holeY;
      } else {
        this.spawnDoor(firstX, nearest ? nearest.num + 2 : 301 + this.score * 2);
        this.ghost.y = this.doors[0].holeY;
      }
      this.invuln = 1;
      this.beginRecovery();
      this.beep(640, 0.1, "sine", 0.05);
    }
    startTrial(id) {
      if(CHARACTERS.find(c=>c.id===id)?.purchaseOnly)return;
      this.shop = setTrial(this.shop, id);
      const i = CHARACTERS.findIndex((c) => c.id === id);
      if (i >= 0) {
        this.selected = i;
        saveSkin(i);
      }
    }
    step(dt) {
      this.ghost.prevY = this.ghost.y;
      this.ghost.prevRot = this.ghost.rot;
      for (const d of this.doors) d.prevX = d.x;
      this.t += dt;
      this.skyEffects.update(dt, this.mode === "play");
      if (this.mode === "play") {
        this.totalPlayTimeSeconds += dt;
        this.playTimeSubmitAcc += dt;
        if (this.playTimeSubmitAcc >= 30) {
          this.playTimeSubmitAcc = 0;
          savePlayTimeSeconds(this.totalPlayTimeSeconds);
          submitPlayTime(this.totalPlayTimeSeconds);
        }
      }
      if (this.mode !== "pause" && !this.skyEffects.motionQuery.matches) this.skyTime += dt;
      this.shake = Math.max(0, this.shake - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.ghost.flap = Math.max(0, this.ghost.flap - dt);
      this.hintT = Math.max(0, this.hintT - dt);
      if (this.mode === "play" && this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
      if (this.mode === "recovery" && !document.hidden && !this.nativeSuspended && !window.GhostUI.hasOverlay()) {
        this.recoveryRemaining = Math.max(0, this.recoveryRemaining - dt);
      }
      const moving = this.mode === "play" ? 1 : 0.22;
      for (const c of this.clouds) {
        c.x -= c.v * dt * moving;
        if (c.x < -160) c.x = LW + 80;
      }
      for (const b of this.bats) {
        b.x -= b.v * dt * moving;
        b.p += dt * 4.8;
        if (b.x < -30) {
          b.x = LW + 20;
          b.y = rand(40, 260);
        }
      }
      for (const p of this.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.grav * dt;
        p.life -= dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0 && Number.isFinite(p.x));
      if (this.particles.length > 36) this.particles.length = 36;
      for (const g of this.gems) {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.rot += g.spin * dt;
        g.life -= dt;
      }
      this.gems = this.gems.filter((g) => g.life > 0 && Number.isFinite(g.x));
      if (this.gems.length > 56) this.gems.length = 56;
      if (this.mode !== "play") {
        if (this.mode === "ready") {
          this.ghost.y = 250 + (this.skyEffects.motionQuery.matches?0:Math.sin(this.t * 3.4) * 8);
          this.ghost.vy = 0;
          this.ghost.rot += (0 - this.ghost.rot) * 8 * dt;
          if (this.isCorona() && this.gems.length < 18 && Math.random() < 0.35) {
            const pal = Math.random() > 0.5 ? { fill: "#d9fbff", edge: "#ffffff" } : { fill: "#3dce7a", edge: "#c8ffd9" };
            this.gems.push({
              x: this.ghost.x - rand(8, 28),
              y: this.ghost.y + rand(-14, 16),
              vx: -rand(40, 90),
              vy: rand(-20, 20),
              life: rand(0.4, 0.8),
              max: 0.8,
              rot: Math.random() * Math.PI,
              spin: rand(-6, 6),
              size: rand(3, 6),
              fill: pal.fill,
              edge: pal.edge
            });
          }
        }
        return;
      }
      const speed = this.speed();
      const rushTarget = Math.min(1, 0.28 + (speed - BASE_SPEED) / 170);
      this.rush += (rushTarget - this.rush) * 6 * dt;
      this.ghost.vy = Math.min(MAX_FALL, this.ghost.vy + GRAVITY * dt);
      this.ghost.y += this.ghost.vy * dt;
      const targetRot = Math.max(-0.6, Math.min(0.75, this.ghost.vy / MAX_FALL));
      this.ghost.rot += (targetRot - this.ghost.rot) * 12 * dt;
      if (this.rush > 0.12 && this.particles.length < 36 && Math.random() < 0.45 + this.rush * 0.25) {
        this.particles.push({
          x: this.ghost.x - rand(8, 22),
          y: this.ghost.y + rand(-20, 20),
          vx: -speed * rand(1.2, 2),
          vy: rand(-40, 40),
          life: rand(0.12, 0.26),
          max: 0.26,
          r: rand(1.2, 2.6),
          color: Math.random() > 0.5 ? "rgba(255,255,255,0.95)" : "rgba(220,200,255,0.9)",
          grav: 0
        });
      }
      if (this.isCorona() && this.gems.length < 56) {
        const n = this.mode === "play" ? Math.random() < 0.7 ? 2 : 1 : 0;
        const palette = [
          { fill: "#d9fbff", edge: "#ffffff" },
          { fill: "#8ef0c2", edge: "#e9fff4" },
          { fill: "#3dce7a", edge: "#c8ffd9" },
          { fill: "#6eb6ff", edge: "#e3f2ff" },
          { fill: "#ff6ea0", edge: "#ffd4e4" },
          { fill: "#ffe56b", edge: "#fff6c8" },
          { fill: "#c9a6ff", edge: "#f0e4ff" }
        ];
        for (let i = 0; i < n; i++) {
          const pal = palette[Math.random() * palette.length | 0];
          this.gems.push({
            x: this.ghost.x - rand(6, 18),
            y: this.ghost.y + rand(-16, 18),
            vx: -speed * rand(1.1, 2.2),
            vy: rand(-90, 90),
            life: rand(0.5, 1.05),
            max: 1.05,
            rot: Math.random() * Math.PI,
            spin: rand(-8, 8),
            size: rand(2.8, 6.6),
            fill: pal.fill,
            edge: pal.edge
          });
        }
      }
      const r = GHOST_RADIUS;
      if (this.invuln <= 0 && (this.ghost.y - r < 8 || this.ghost.y + r > LH - 8)) { this.die(); return; }
      for (const d of this.doors) {
        d.x -= speed * dt;
        if (!d.passed && d.x + d.w < this.ghost.x) {
          d.passed = true;
          this.score += 1;
          this.beep(720, 0.09, "triangle", 0.045);
          this.burst(this.ghost.x + 20, this.ghost.y, "#ffe56b", 10);
          if (window.FGParallax) window.FGParallax.score(this.ghost.x + 20, this.ghost.y);
        }
        if (this.invuln <= 0 && this.hitsDoor(d, r)) { this.die(); return; }
      }
      this.doors = this.doors.filter((d) => d.x + d.w > -60);
      let rightmost = this.doors.reduce((m, d) => Math.max(m, d.x), -DOOR_SPACING);
      let guard = 0;
      while (rightmost < LW + 80 && guard < 3) {
        const nextNum = this.doors.length ? Math.max(...this.doors.map((d) => d.num)) + 2 : 301;
        const nx = (this.doors.length ? rightmost : 520) + this.doorSpacing();
        this.spawnDoor(nx, nextNum);
        rightmost = nx;
        guard += 1;
      }
    }
    hitsDoor(d, r) {
      const gx = this.ghost.x;
      const gy = this.ghost.y;
      if (gx + r < d.x || gx - r > d.x + d.w) return false;
      const topBottom = d.holeY - d.gap / 2;
      const botTop = d.holeY + d.gap / 2;
      if (gy - r < topBottom) return true;
      if (gy + r > botTop) return true;
      return false;
    }
    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(40, 220);
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 40,
          life: rand(0.3, 0.6),
          max: 0.6,
          r: rand(1.4, 3.2),
          color,
          grav: 180
        });
      }
    }
    unlockAudio() {
      try {
        if (!this.audio) this.audio = new AudioContext();
        if (this.audio.state === "suspended") void this.audio.resume();
      } catch {
      }
    }
    beep(freq, dur, type, vol) {
      try {
        if (!this.audio) return;
        const ctx = this.audio;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(Math.max(1e-4, vol), t);
        g.gain.exponentialRampToValueAtTime(1e-4, t + Math.max(0.05, dur));
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + Math.max(0.05, dur) + 0.02);
        o.onended = () => {
          try {
            o.disconnect();
            g.disconnect();
          } catch {
          }
        };
      } catch {
      }
    }
    roundRect(ctx, x, y, w, h, r) {
      if (w <= 0 || h <= 0) {
        ctx.beginPath();
        return;
      }
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }
    draw(alpha = 1) {
      this.renderAlpha = this.mode === "play" ? Math.max(0, Math.min(1, alpha)) : 1;
      const ctx = this.ctx;
      const { scale, ox, oy, cssW, cssH } = this.view;
      ctx.save();
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
      ctx.imageSmoothingEnabled = true;
      if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "medium";
      // The sky fills the viewport; gameplay retains its original fitted world.
      this.drawSky(ctx);
      if (this.mode === "pause") this.fillOutsidePlayfield(ctx, "rgba(40,20,60,0.35)");
      if (this.mode === "dead") this.fillOutsidePlayfield(ctx, "rgba(40,16,40,0.32)");
      if (this.flash > 0 && !this.skyEffects.motionQuery.matches) {
        this.fillOutsidePlayfield(ctx, `rgba(255,220,230,${this.flash / 0.16})`);
      }
      ctx.beginPath();
      ctx.rect(0, 0, LW, LH);
      ctx.clip();
      if (this.shake > 0 && !this.skyEffects.motionQuery.matches) {
        ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
      }
      this.drawDoors(ctx);
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      this.drawGems(ctx);
      this.drawGhost(ctx);
      if (window.FGParallax) window.FGParallax.front(ctx);
      this.drawHud(ctx);
      if (this.flash > 0 && !this.skyEffects.motionQuery.matches) {
        ctx.fillStyle = `rgba(255,220,230,${this.flash / 0.16})`;
        ctx.fillRect(0, 0, LW, LH);
      }
      ctx.restore();
    }
    fillOutsidePlayfield(ctx, color) {
      const { scale, ox, oy, cssW, cssH } = this.view;
      if (ox === 0 && oy === 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-ox / scale, -oy / scale, cssW / scale, cssH / scale);
      ctx.rect(0, 0, LW, LH);
      ctx.fillStyle = color;
      ctx.fill("evenodd");
      ctx.restore();
    }
    drawSky(ctx) {
      window.GhostUI.sync();
      const sky = this.art.sky;
      const { scale, ox, oy, cssW, cssH } = this.view;
      const visibleX = -ox / scale, visibleY = -oy / scale;
      const visibleW = cssW / scale, visibleH = cssH / scale;
      ctx.fillStyle = "#c5a0de";
      ctx.fillRect(visibleX, visibleY, visibleW, visibleH);
      if (sky && (sky instanceof HTMLCanvasElement || (sky.complete && sky.naturalWidth > 0))) {
        // El dibujo es más grande que la pantalla y deriva con una onda suave.
        // Nunca se duplica, así no aparece el corte entre capas.
        const imageW = sky.naturalWidth || sky.width;
        const imageH = sky.naturalHeight || sky.height;
        const cover = Math.max(visibleW / imageW, visibleH / imageH) * 1.06;
        const skyW = imageW * cover, skyH = imageH * cover;
        const period = 80;
        const py = (Math.sin(this.skyTime * Math.PI * 2 / period) + 1) / 2;
        const px = (Math.sin(this.skyTime * 0.045) + 1) / 2;
        ctx.drawImage(
          sky,
          visibleX - (skyW - visibleW) * px,
          visibleY - (skyH - visibleH) * py,
          skyW,
          skyH
        );
      }
      this.drawMoon(ctx);
      if (window.FGParallax) window.FGParallax.back(ctx, visibleX, visibleY, visibleW, visibleH, LW, LH, this.mode === "play", this.mode === "pause" || this.skyEffects.motionQuery.matches);
      this.skyEffects.draw(ctx);
      // Quiet, slow shimmer: no per-frame gradients or distracting speed streaks.
      for (const s of this.stars) {
        ctx.globalAlpha = 0.15 + (1 + Math.sin(this.skyTime * 0.7 + s.p)) * 0.12;
        this.spark(ctx, s.x, s.y, s.s * 1.25, "#fff5e4");
      }
      ctx.globalAlpha = 1;
      if (!this.art.sky) {
        for (const c of this.clouds) {
          ctx.globalAlpha = c.a;
          ctx.fillStyle = "#fff";
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.scale(c.s, c.s);
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.arc(24, 4, 18, 0, Math.PI * 2);
          ctx.arc(-20, 6, 16, 0, Math.PI * 2);
          ctx.arc(8, -10, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    }
    drawMoon(ctx) {
      this.skyEffects.drawMoon(ctx);
    }
    spark(ctx, x, y, r, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.fill();
      ctx.restore();
    }
    drawGems(ctx) {
      for (const g of this.gems) {
        const a = Math.max(0, g.life / g.max);
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rot);
        ctx.globalAlpha = a;
        this.diamondGem(ctx, g.size, g.fill, g.edge);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    diamondGem(ctx, size, fill, edge) {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.62, -size * 0.12);
      ctx.lineTo(size * 0.78, size * 0.18);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.78, size * 0.18);
      ctx.lineTo(-size * 0.62, -size * 0.12);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(0.6, size * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.55);
      ctx.lineTo(size * 0.28, -size * 0.08);
      ctx.lineTo(0, size * 0.12);
      ctx.lineTo(-size * 0.28, -size * 0.08);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fill();
    }
    drawDoors(ctx) {
      for (const d of this.doors) {
        if (d.x > LW + 20 || d.x + d.w < -20) continue;
        const x = (d.prevX ?? d.x) + (d.x - (d.prevX ?? d.x)) * this.renderAlpha;
        const topH = d.holeY - d.gap / 2;
        const botY = d.holeY + d.gap / 2;
        const botH = LH - botY;
        for (let i = 0; i < 8; i++) {
          const sx = x + 18 + (i * 41 + this.t * 40) % Math.max(1, d.w - 24);
          const sy = d.holeY + Math.sin(this.t * 2.2 + i) * (d.gap * 0.28);
          ctx.globalAlpha = 0.35 + Math.sin(this.t * 4 + i) * 0.25;
          this.spark(ctx, sx, sy, 3.2, i % 2 ? "#ffe56b" : "#ffffff");
        }
        ctx.globalAlpha = 1;
        this.drawDoorPanel(ctx, x, -8, d.w, topH + 8, d.num, true);
        this.drawDoorPanel(ctx, x, botY, d.w, botH + 8, d.num + 1, false);
      }
    }
    drawDoorPanel(ctx, x, y, w, h, num, isTop) {
      if (h < 10 || w < 4 || !Number.isFinite(h) || !Number.isFinite(w)) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 6, y, w + 12, h);
      ctx.clip();
      const img = isTop ? this.art.doorTop : this.art.doorBottom;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x - 10, y - 4, w + 20, h + 10);
      } else {
        const wood = ctx.createLinearGradient(x, y, x + w, y);
        wood.addColorStop(0, "#6a4228");
        wood.addColorStop(0.5, "#8a5a36");
        wood.addColorStop(1, "#5c3923");
        ctx.fillStyle = wood;
        this.roundRect(ctx, x, y, w, h, 16);
        ctx.fill();
        ctx.strokeStyle = "#c9a15a";
        ctx.lineWidth = 5;
        this.roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 12);
        ctx.stroke();
      }
      ctx.restore();
      const py = isTop ? y + h - 38 : y + 16;
      ctx.fillStyle = "#e6c36a";
      this.roundRect(ctx, x + w / 2 - 42, py, 84, 28, 8);
      ctx.fill();
      ctx.strokeStyle = "#b8862f";
      ctx.lineWidth = 2.2;
      this.roundRect(ctx, x + w / 2 - 42, py, 84, 28, 8);
      ctx.stroke();
      ctx.fillStyle = "#6a3e12";
      ctx.font = "700 17px Fredoka, Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(num), x + w / 2, py + 15);
    }
    isCorona() {
      return CHARACTERS[this.selected]?.id === "corona";
    }
    drawGust(ctx) {
      if (this.mode !== "play" || this.rush < 0.08) return;
      if (this.isCorona()) return;
      const { x, y, rot } = this.displayGhost();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot * 0.35);
      ctx.strokeStyle = "#ffffff";
      ctx.lineCap = "round";
      const n = 10;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1) - 0.5;
        const wob = Math.sin(this.t * 28 + i * 1.7);
        const len = (22 + this.rush * 54 + wob * 8) * (0.7 + Math.abs(k));
        const oy = k * 42 + wob * 3;
        ctx.globalAlpha = (0.18 + this.rush * 0.45) * (1 - Math.abs(k) * 0.45);
        ctx.lineWidth = 1.2 + this.rush * 1.8;
        ctx.beginPath();
        ctx.moveTo(-14, oy);
        ctx.lineTo(-14 - len, oy + k * 10);
        ctx.stroke();
      }
      ctx.restore();
    }
    skinImage() {
      const im = this.charImgs[this.selected];
      if (im && im.complete && im.naturalWidth > 0) return im;
      return this.art.ghost;
    }
    blitGhost(ctx, x, y, rot, alpha, stretch = 1) {
      const { flap } = this.ghost;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rot);
      const squash = 1 + Math.sin((0.16 - flap) * 18) * (flap > 0 ? 0.08 : 0);
      const bob = this.mode === "play" || this.skyEffects.motionQuery.matches ? 0 : Math.sin(this.t * 5.2) * 2.2;
      ctx.scale(1 / Math.max(0.85, squash) * stretch, squash);
      ctx.translate(0, bob);
      if (this.selected >= 12) {
        const image = this.charImgs[this.selected];
        if (image) ctx.drawImage(image,-48,-48,96,96);
        window.CrystalGhosts.draw(ctx,this.selected,this.mode === "ready" ? this.skyTime : this.skyEffects.time);
        ctx.restore();return;
      }
      if (this.isCorona() && this.art.coronaBody) {
        this.blitCorona(ctx, x, y, rot, alpha, stretch);
        ctx.restore();
        return;
      }
      if (stretch <= 1) {
        if (this.art.ghostGlow) ctx.drawImage(this.art.ghostGlow, -48, -48, 96, 96);
      }
      const img = this.skinImage();
      if (img && img.complete && img.naturalWidth > 1 && img.naturalHeight > 1) {
        const gh = 92;
        const gw = gh * (img.naturalWidth / img.naturalHeight);
        if (Number.isFinite(gw) && gw > 2) ctx.drawImage(img, -gw / 2, -gh / 2, gw, gh);
      } else {
        ctx.fillStyle = "#eef7ff";
        ctx.beginPath();
        ctx.ellipse(0, -2, 24, 27, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    drawGhost(ctx) {
      this.drawGust(ctx);
      const ghost = this.displayGhost();
      if (this.mode === "play" && this.rush > 0.1 && !this.isCorona()) {
        const n = 4;
        for (let i = n; i >= 1; i--) {
          const k = i / n;
          this.blitGhost(
            ctx,
            ghost.x - i * (8 + this.rush * 7),
            ghost.y,
            ghost.rot,
            0.05 * this.rush + 0.08 * (1 - k) * this.rush,
            1 + k * 0.28 * this.rush
          );
        }
      }
      const blinkAlpha = this.invuln > 0 ? (Math.floor(this.t * 10) % 2 === 0 ? 1 : 0.25) : 1;
      this.blitGhost(ctx, ghost.x, ghost.y, ghost.rot, blinkAlpha);
    }
    blitCorona(ctx, x, y, rot, alpha, stretch) {
      const body = this.art.coronaBody;
      const wings = this.art.coronaWings;
      const nebula = this.art.coronaNebula;
      const flap = this.ghost.flap;
      const beat = Math.sin(this.t * 20 + flap * 14);
      const wingRot = beat * (0.32 + flap * 1.35);
      const wingSy = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(this.t * 24));
      const play = this.mode === "play" ? 1 : 0.55;
      if (nebula && nebula.complete && nebula.naturalWidth > 1) {
        const play2 = this.mode === "play" ? 1 : 0.65;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.globalAlpha = alpha * (0.38 - i * 0.07) * play2;
          ctx.translate(-90 - i * (58 + play2 * 28), Math.sin(this.t * 2.2 + i * 1.6) * (18 + i * 10));
          ctx.rotate(-0.08 + Math.sin(this.t * 1.8 + i) * 0.12);
          ctx.scale(1.15 + i * 0.28, 0.95 + Math.sin(this.t * 3 + i) * 0.12);
          const nw = 190;
          const nh = 80;
          ctx.drawImage(nebula, -nw * 0.5, -nh / 2, nw, nh);
          ctx.restore();
        }
        for (let i = 0; i < 10; i++) {
          const px = -36 - i * (18 + play2 * 12) - Math.sin(this.t * 5 + i * 2.1) * 14;
          const py = Math.sin(this.t * 3.4 + i * 1.7) * (22 + i * 3);
          ctx.globalAlpha = alpha * (0.28 + 0.22 * Math.sin(this.t * 7 + i));
          this.spark(ctx, px, py, 1.8 + i % 3, i % 3 === 0 ? "#ffe56b" : i % 3 === 1 ? "#8ef0c2" : "#d9fbff");
        }
        ctx.globalAlpha = alpha;
      }
      if (wings && wings.complete && wings.naturalWidth > 1) {
        const ww = 108 * stretch;
        const wh = ww * (wings.naturalHeight / wings.naturalWidth);
        ctx.save();
        ctx.translate(-8, -14);
        ctx.rotate(wingRot);
        ctx.scale(1, wingSy);
        ctx.globalAlpha = alpha;
        if (Number.isFinite(wh) && wh > 2) ctx.drawImage(wings, -ww / 2, -wh / 2, ww, wh);
        ctx.restore();
      }
      if (body && body.complete && body.naturalWidth > 1) {
        const bh = 90;
        const bw = bh * (body.naturalWidth / body.naturalHeight);
        ctx.save();
        ctx.translate(8, 6);
        ctx.globalAlpha = alpha;
        if (Number.isFinite(bw) && bw > 2) ctx.drawImage(body, -bw / 2, -bh / 2, bw, bh);
        ctx.restore();
      }
    }
    pill(ctx, x, y, w, h) {
      ctx.fillStyle = "#fff6e8";
      this.roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
      ctx.fill();
      ctx.strokeStyle = "#e7c36a";
      ctx.lineWidth = 3;
      this.roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
      ctx.stroke();
    }
    drawHud(ctx) {
      this.pill(ctx, LW / 2, 42, 210, 44);
      ctx.fillStyle = "#c45a8c";
      ctx.font = "700 22px Fredoka, Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t('score',{score:this.score}), LW / 2, 43, 264);
      ctx.fillStyle = "#fff6e8";
      this.roundRect(ctx, LW - 62, 22, 42, 42, 12);
      ctx.fill();
      ctx.strokeStyle = "#e7c36a";
      ctx.lineWidth = 3;
      this.roundRect(ctx, LW - 62, 22, 42, 42, 12);
      ctx.stroke();
      ctx.fillStyle = "#c45a8c";
      if (this.mode === "pause") {
        ctx.beginPath();
        ctx.moveTo(LW - 46, 33);
        ctx.lineTo(LW - 46, 53);
        ctx.lineTo(LW - 28, 43);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(LW - 47, 33, 6, 20);
        ctx.fillRect(LW - 35, 33, 6, 20);
      }
      if (this.mode === "ready") {
        this.pill(ctx, 62, 42, 88, 40);
        ctx.fillStyle = "#c45a8c";
        ctx.font = "700 14px Fredoka, Trebuchet MS, sans-serif";
        ctx.fillText(t('shop'), 62, 43, 82);
        ctx.fillStyle = "rgba(91,58,120,0.92)";
        ctx.font = "700 28px Fredoka, Trebuchet MS, sans-serif";
        ctx.fillText("FLAPPY GHOST", LW / 2, 92);
        ctx.font = "600 14px Nunito, sans-serif";
        ctx.fillText(nameOf(CHARACTERS[this.selected]), LW / 2, 118, 360);
        ctx.fillText(t('chooseGhost',{best:this.best}), LW / 2, 138, 360);
        this.drawPicker(ctx);
        this.pill(ctx, LW / 2, LH - 44, 248, 42);
        ctx.fillStyle = "#c45a8c";
        ctx.font = "700 18px Fredoka, Trebuchet MS, sans-serif";
        ctx.fillText(t('tapFlap'), LW / 2, LH - 43, 380);
        if (this.hintT > 0) {
          ctx.globalAlpha = Math.min(1, this.hintT * 2);
          this.pill(ctx, LW / 2, 312, 300, 36);
          ctx.fillStyle = "#c45a8c";
          ctx.font = "700 14px Nunito, sans-serif";
          ctx.fillText(this.hint, LW / 2, 313,280);
          ctx.globalAlpha = 1;
        }
      }
      if (this.mode === "pause") {
        ctx.fillStyle = "rgba(40,20,60,0.35)";
        ctx.fillRect(0, 0, LW, LH);
        this.pill(ctx, LW / 2, LH / 2, 200, 64);
        ctx.fillStyle = "#c45a8c";
        ctx.font = "700 26px Fredoka, Trebuchet MS, sans-serif";
        ctx.fillText(t('pause'), LW / 2, LH / 2 + 1, 280);
      }
      if (this.mode === "recovery") {
        ctx.fillStyle = "rgba(40,20,60,0.25)";
        ctx.fillRect(0, 0, LW, LH);
        this.pill(ctx, LW / 2, LH / 2, 320, 144);
        ctx.fillStyle = "#6b4a86";
        ctx.font = "700 22px Fredoka, Trebuchet MS, sans-serif";
        ctx.fillText(t('recoveryTitle'), LW / 2, LH / 2 - 43, 280);
        ctx.fillStyle = "#c45a8c";
        ctx.font = "700 32px Fredoka, Trebuchet MS, sans-serif";
        ctx.fillText(this.recoveryRemaining > 0 ? t('recoveryCountdown', {seconds: Math.ceil(this.recoveryRemaining)}) : t('recoveryTap'), LW / 2, LH / 2, 280);
        ctx.fillStyle = "#6b4a86";
        ctx.font = "600 13px Nunito, sans-serif";
        ctx.fillText(t('recoveryHint'), LW / 2, LH / 2 + 40, 280);
      }
      if (this.mode === "dead") {
        ctx.fillStyle = "rgba(40,16,40,0.32)";
        ctx.fillRect(0, 0, LW, LH);
        const extra = this.unlockedNow.length ? 28 : 0;
        this.pill(ctx, LW / 2, LH / 2 - 36, 300, 118 + extra);
        ctx.fillStyle = "#c45a8c";
        ctx.font = "700 26px Fredoka, Trebuchet MS, sans-serif";
        ctx.fillText(t('ouch'), LW / 2, LH / 2 - 72, 280);
        ctx.fillStyle = "#6b4a86";
        ctx.font = "600 16px Nunito, sans-serif";
        ctx.fillText(t('result',{score:this.score,best:this.best}), LW / 2, LH / 2 - 40, 300);
        if (this.unlockedNow.length) {
          ctx.fillStyle = "#c45a8c";
          ctx.font = "700 15px Fredoka, Trebuchet MS, sans-serif";
          ctx.fillText(this.unlockedNow.length>2 ? t('unlockedMany',{count:this.unlockedNow.length}) : t('unlocked',{names:this.unlockedNow.map(nameOf).join(', ')}), LW/2, LH/2-16,280);
        }
        if (!this.usedContinue && !this.shop.adsOff && window.NativeBridge.isNative()) {
          this.pill(ctx, LW / 2, LH / 2 + 34, 280, 40);
          ctx.fillStyle = "#c45a8c";
          ctx.font = "700 15px Fredoka, Trebuchet MS, sans-serif";
          ctx.fillText(t('adContinue'), LW / 2, LH / 2 + 35, 236);
        }
        this.pill(ctx, LW / 2, LH / 2 + 82, 280, 40);
        ctx.fillStyle = "#c45a8c";
        ctx.font = "700 15px Fredoka, Trebuchet MS, sans-serif";
        ctx.fillText(t('ghostShop'), LW / 2, LH / 2 + 83, 252);
        this.pill(ctx, LW / 2 - 72, LH / 2 + 131, 132, 36);
        this.pill(ctx, LW / 2 + 72, LH / 2 + 131, 132, 36);
        ctx.fillStyle = "#c45a8c";
        ctx.font = "700 13px Fredoka, Trebuchet MS, sans-serif";
        ctx.fillText(t('rankScore'), LW / 2 - 72, LH / 2 + 132, 120);
        ctx.fillText(t('rankTime'), LW / 2 + 72, LH / 2 + 132, 120);
        ctx.font = "600 13px Nunito, sans-serif";
        ctx.fillStyle = "#6b4a86";
        ctx.fillText(t('retryOutside'), LW / 2, LH / 2 + 174, 340);
        if (this.hintT > 0) {
          this.pill(ctx, LW / 2, LH / 2 + 220, 340, 40);
          ctx.fillStyle = "#c45a8c";
          ctx.font = "600 13px Nunito, sans-serif";
          ctx.fillText(this.hint, LW / 2, LH / 2 + 220, 315);
        }
      }
    }
    drawPicker(ctx) {
      this.pill(ctx,LW/2,622,330,40);
      ctx.fillStyle="#76538d";ctx.font="700 13px Nunito, sans-serif";ctx.textAlign="center";
      ctx.fillText(t(this.pickerPage?'crystalPage':'classicPage'),LW/2,623,360);
      if(this.pickerPage){ctx.font="600 12px Nunito, sans-serif";ctx.fillText(t('crystalExclusive'),LW/2,668,360);}
      for (let i = this.pickerPage * 12; i < Math.min(CHARACTERS.length,(this.pickerPage+1)*12); i++) {
        const cell = this.charCell(i);
        const open = this.isUnlocked(i);
        const chosen = i === this.selected;
        const cx = cell.x + cell.w / 2;
        const cy = cell.y + cell.h / 2 - 8;
        if (chosen) {
          const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 40);
          g.addColorStop(0, "rgba(255,230,250,0.9)");
          g.addColorStop(1, "rgba(255,230,250,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.fill();
        }
        const im = this.charImgs[i];
        if (im && im.complete && im.naturalWidth > 0) {
          ctx.save();
          if (!open) ctx.globalAlpha = 0.32;
          const maxW = cell.w - 6;
          const maxH = cell.h - 20;
          const s = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight);
          if (!Number.isFinite(s) || s <= 0) {
            ctx.restore();
            continue;
          }
          const dw = im.naturalWidth * s;
          const dh = im.naturalHeight * s;
          ctx.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh);
          if(i>=12){ctx.translate(cx,cy);ctx.scale(dw/96,dh/96);window.CrystalGhosts.draw(ctx,i,this.skyTime);}
          ctx.restore();
        }
        ctx.fillStyle = open ? chosen ? "#c45a8c" : "#7a4e8a" : "#8a6a9a";
        ctx.font = "700 10px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(open ? nameOf(CHARACTERS[i]) : saleLabel(i, this.best), cx, cell.y + cell.h - 6,cell.w-4);
      }
    }
  };

  // ../tmp/fg-pack/main.ts
  window.FG_CHARACTERS = CHARACTERS;
  var canvas = document.getElementById("game");
  if (!canvas) throw new Error("No hay canvas");
  var game = new FlappyGhost(canvas, {
    openShop: () => {
      if (typeof window.openGhostShop === "function") window.openGhostShop(game);
    },
    showAd: async (kind) => {
      if (!window.NativeBridge) return true;
      if (kind === "interstitial") return window.NativeBridge.showInterstitial();
      return window.NativeBridge.showRewarded({ purpose: 'continue', roundId: String(game.roundId) });
    }
  });
  window.__fg = game;
  window.GhostUI.attach(game);
  game.start().then(()=>window.GhostUI.ready()).catch(()=>{
    const cover=document.getElementById('loading');if(!cover)return;
    cover.textContent=t('loadError');cover.setAttribute('role','alert');
    const retry=document.createElement('button');retry.textContent=t('retry');retry.onclick=()=>location.reload();cover.append(retry);
  });
})();
