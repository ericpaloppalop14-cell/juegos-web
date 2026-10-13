// Decorative effects in logical game coordinates. No gameplay or collision state.
(() => {
  class GhostSkyEffects {
    constructor() {
      this.time = 0;
      this.meteors = [];
      this.bats = [];
      this.nextMeteor = 2.5;
      this.nextBats = 5;
      this.nextLightning = 12;
      this.lightning = null;
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.halo = document.createElement('canvas');
      this.halo.width = this.halo.height = 192;
      const c = this.halo.getContext('2d');
      const g = c.createRadialGradient(96, 96, 12, 96, 96, 96);
      g.addColorStop(0, 'rgba(255,234,202,.38)');
      g.addColorStop(.4, 'rgba(255,226,226,.15)');
      g.addColorStop(1, 'rgba(255,226,226,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 192, 192);
      this.craters = [[-11,-8,4],[8,12,6],[13,-13,3],[-13,13,2],[2,-3,2.5]];
      this.moonSurface = document.createElement('canvas');
      this.moonSurface.width = this.moonSurface.height = 128;
      const m = this.moonSurface.getContext('2d');
      m.translate(64,64);m.scale(2.56,2.56);
      const surface = m.createRadialGradient(-8,-9,1,0,0,27);
      surface.addColorStop(0,'#fff3d4');surface.addColorStop(.65,'#f8dfb2');
      surface.addColorStop(1,'#d9b4a1');
      m.fillStyle=surface;m.beginPath();m.arc(0,0,25,0,Math.PI*2);m.fill();
      for(const [cx,cy,cr] of this.craters) {
        const crater=m.createRadialGradient(cx-1,cy-1,.2,cx,cy,cr);
        crater.addColorStop(0,'rgba(190,147,148,.16)');
        crater.addColorStop(.7,'rgba(190,147,148,.10)');
        crater.addColorStop(1,'rgba(190,147,148,0)');
        m.fillStyle=crater;m.beginPath();m.arc(cx,cy,cr,0,Math.PI*2);m.fill();
      }
    }
    update(dt, playing) {
      if (!playing) return;
      this.time += dt;
      const reduced = this.motionQuery.matches;
      if (this.time >= this.nextMeteor) {
        if (!reduced && this.meteors.length < 2) this.meteors.push({
          x: 100 + Math.random() * 300, y: 65 + Math.random() * 120,
          age: 0, life: 1.5, vx: -145, vy: 98
        });
        this.nextMeteor = this.time + 6 + Math.random() * 5;
      }
      if (this.time >= this.nextBats) {
        if (!reduced && this.bats.length === 0) {
          const direction = Math.random() < .5 ? 1 : -1;
          const y = 115 + Math.random() * 155;
          for (let i = 0; i < 3; i++) this.bats.push({
            x: direction === 1 ? -30 - i * 28 : 450 + i * 28,
            y: y + i * 16, direction, speed: 38 + i * 3,
            phase: i * 1.7, size: .65 + i * .12
          });
        }
        this.nextBats = this.time + 19 + Math.random() * 10;
      }
      if (this.time >= this.nextLightning) {
        if (!reduced) {
          const x = Math.random() < .5 ? 36 : 360;
          this.lightning = { age: 0, points: [[x,355],[x-10,383],[x+5,380],[x-13,418],[x-5,398]] };
        }
        this.nextLightning = this.time + 26 + Math.random() * 14;
      }
      for (const m of this.meteors) { m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; }
      this.meteors = this.meteors.filter(m => m.age < m.life);
      for (const b of this.bats) b.x += b.direction * b.speed * dt;
      this.bats = this.bats.filter(b => b.direction === 1 ? b.x < 500 : b.x > -80);
      if (this.lightning && (this.lightning.age += dt) > 1.2) this.lightning = null;
    }
    drawMoon(ctx) {
      const x = 122 + Math.sin(this.time * .025) * 12;
      const y = 169 + Math.sin(this.time * .018) * 7;
      const r = 25;
      // Continuous 100-second synodic cycle, beginning with a waxing crescent.
      const phase = (this.time / 100 + .16) % 1;
      const light = (1 - Math.cos(phase * Math.PI * 2)) / 2;
      ctx.save();
      ctx.globalAlpha = .55 + light * .4;
      ctx.drawImage(this.halo, x - 82, y - 82, 164, 164);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#b89acb';
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      ctx.save();
      ctx.translate(x,y);
      // The terminator is an ellipse, not a crossfade between moon pictures.
      const side = phase < .5 ? 1 : -1;
      const k = Math.cos(phase * Math.PI * 2);
      ctx.beginPath();
      // Two native curves replace 98 line segments and 196 trig calls/frame.
      // Match the same illuminated semicircle and elliptical terminator.
      ctx.arc(0,0,r,-Math.PI/2,Math.PI/2,side<0);
      ctx.ellipse(0,0,Math.max(.0001,Math.abs(k)*r),r,0,Math.PI/2,-Math.PI/2,side*k>=0);
      ctx.closePath();ctx.clip();
      ctx.drawImage(this.moonSurface,-r,-r,r*2,r*2);
      ctx.restore();ctx.restore();
    }
    draw(ctx) {
      ctx.save();
      ctx.lineCap='round';
      for(const m of this.meteors) {
        const fade=Math.sin(Math.PI*m.age/m.life);
        for(let i=12;i>0;i--) {
          ctx.globalAlpha=fade*(1-i/13)*.65;
          ctx.strokeStyle='#fff1dc';ctx.lineWidth=1.1;
          ctx.beginPath();ctx.moveTo(m.x+i*5,m.y-i*3.38);
          ctx.lineTo(m.x+(i-1)*5,m.y-(i-1)*3.38);ctx.stroke();
        }
        ctx.globalAlpha=fade*.9;ctx.fillStyle='#fff9e9';
        ctx.beginPath();ctx.arc(m.x,m.y,1.6,0,Math.PI*2);ctx.fill();
      }
      for(const b of this.bats) {
        ctx.save();
        ctx.globalAlpha=.38;
        ctx.translate(b.x,b.y+Math.sin(this.time*1.8+b.phase)*7);
        ctx.scale(b.size*b.direction,b.size);
        const wing=Math.sin(this.time*10+b.phase)*6;
        ctx.fillStyle='#76628f';ctx.beginPath();
        ctx.moveTo(-2,0);
        ctx.quadraticCurveTo(-8,-8+wing,-17,-5+wing);
        ctx.quadraticCurveTo(-13,0,-12,5);
        ctx.quadraticCurveTo(-7,1,-5,6);
        ctx.lineTo(0,4);ctx.lineTo(5,6);
        ctx.quadraticCurveTo(7,1,12,5);
        ctx.quadraticCurveTo(13,0,17,-5+wing);
        ctx.quadraticCurveTo(8,-8+wing,2,0);
        ctx.lineTo(2,-4);ctx.lineTo(0,-2);ctx.lineTo(-2,-4);
        ctx.closePath();ctx.fill();ctx.restore();
      }
      if(this.lightning && !this.motionQuery.matches) {
        const pulse=Math.pow(Math.sin(Math.PI*this.lightning.age/1.2),3);
        const points=this.lightning.points;
        ctx.globalAlpha=pulse*.4;
        ctx.drawImage(this.halo,points[0][0]-120,300,240,220);
        ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
        ctx.strokeStyle='#f6e6ff';ctx.lineWidth=5;ctx.globalAlpha=pulse*.1;ctx.stroke();
        ctx.lineWidth=1.2;ctx.globalAlpha=pulse*.42;ctx.stroke();
      }
      ctx.restore();
    }
  }
  window.GhostSkyEffects=GhostSkyEffects;
})();
