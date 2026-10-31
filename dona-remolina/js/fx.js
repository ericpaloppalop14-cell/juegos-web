import * as THREE from 'three';

// ---------- partículas ----------
const VS = `
attribute vec4 aColor; attribute float aSize; attribute float aShape; attribute float aRot;
varying vec4 vColor; varying float vShape; varying float vRot; uniform float uScale;
void main(){ vColor=aColor; vShape=aShape; vRot=aRot; vec4 mv=modelViewMatrix*vec4(position,1.0);
 gl_PointSize=min(aSize*uScale/max(0.1,-mv.z),220.0); gl_Position=projectionMatrix*mv; }`;
const FS = `
precision highp float; varying vec4 vColor; varying float vShape; varying float vRot;
void main(){
 vec2 p=gl_PointCoord-0.5; float c=cos(vRot), s=sin(vRot); p=mat2(c,-s,s,c)*p; float r=length(p)*2.0; float a=0.0; vec3 col=vColor.rgb;
 if(vShape<0.5){ a=1.0-smoothstep(0.7,1.0,r); }
 else if(vShape<1.5){ float ang=atan(p.y,p.x); float k=0.55+0.45*cos(ang*5.0); a=1.0-smoothstep(k*0.8,k*1.0,r); col*=1.0+0.25*(1.0-r); }
 else if(vShape<2.5){ a=1.0-smoothstep(0.82,0.95,r); float rim=smoothstep(0.55,0.7,r); col=mix(col*1.12,col*0.72,rim); col+=0.18*smoothstep(0.35,0.0,length(p+vec2(0.12,0.12))*2.0); if(abs(p.x)<0.07&&abs(p.y)<0.28) col*=0.7; }
 else if(vShape<3.5){ float ax=abs(p.x), ay=abs(p.y); float v=max(1.0-smoothstep(0.0,0.1,ax)*1.0-ay*2.2,0.0)+max(1.0-smoothstep(0.0,0.1,ay)*1.0-ax*2.2,0.0); a=clamp(v+ (1.0-smoothstep(0.1,0.5,r))*0.6,0.0,1.0); col=mix(col,vec3(1.0),0.5); }
 else { a=pow(1.0-clamp(r,0.0,1.0),1.6)*0.9; }
 a*=vColor.a; if(a<0.01) discard; gl_FragColor=vec4(col,a); }`;

export class Particles {
  constructor(scene, max = 1100) {
    this.max = max; this.i = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max); this.shape = new Float32Array(max); this.rot = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.spin = new Float32Array(max); this.fade = new Float32Array(max);
    for (let k = 0; k < max; k++) this.pos[k * 3 + 1] = -999;
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage); this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage); this.aShape = new THREE.BufferAttribute(this.shape, 1); this.aRot = new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aColor', this.aCol); g.setAttribute('aSize', this.aSize); g.setAttribute('aShape', this.aShape); g.setAttribute('aRot', this.aRot);
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, uniforms: { uScale: { value: 800 } } });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 10; scene.add(this.pts);
    this.tmp = new THREE.Color();
  }
  emit(o) {
    const k = this.i; this.i = (this.i + 1) % this.max;
    this.pos[k * 3] = o.x; this.pos[k * 3 + 1] = o.y; this.pos[k * 3 + 2] = o.z;
    this.vel[k * 3] = o.vx || 0; this.vel[k * 3 + 1] = o.vy || 0; this.vel[k * 3 + 2] = o.vz || 0;
    this.life[k] = this.maxLife[k] = o.life || 1; this.s0[k] = o.size || 0.3; this.s1[k] = o.size1 == null ? this.s0[k] : o.size1;
    this.tmp.set(o.color == null ? 0xffffff : o.color); this.col[k * 4] = this.tmp.r; this.col[k * 4 + 1] = this.tmp.g; this.col[k * 4 + 2] = this.tmp.b; this.col[k * 4 + 3] = o.alpha == null ? 1 : o.alpha;
    this.grav[k] = o.g == null ? 0 : o.g; this.drag[k] = o.drag == null ? 0.5 : o.drag; this.shape[k] = o.shape || 0; this.aShape.needsUpdate = true;
    this.rot[k] = Math.random() * 6.28; this.spin[k] = o.spin == null ? (Math.random() - 0.5) * 6 : o.spin; this.fade[k] = o.alpha == null ? 1 : o.alpha;
  }
  burst(x, y, z, n, o) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, e = o.flat ? (Math.random() * 0.3) : (Math.random() * 1.2 - 0.1), sp = (o.speed || 4) * (0.35 + Math.random() * 0.8);
      const colr = Array.isArray(o.color) ? o.color[(Math.random() * o.color.length) | 0] : o.color;
      this.emit({ x: x + (Math.random() - 0.5) * (o.spread || 0), y, z: z + (Math.random() - 0.5) * (o.spread || 0), vx: Math.cos(a) * sp * (1 - e * 0.4), vy: (o.up == null ? 2 : o.up) + e * sp, vz: Math.sin(a) * sp * (1 - e * 0.4),
        life: (o.life || 0.9) * (0.7 + Math.random() * 0.6), size: (o.size || 0.3) * (0.7 + Math.random() * 0.6), size1: o.size1, color: colr, g: o.g == null ? 9 : o.g, drag: o.drag, shape: o.shape, alpha: o.alpha });
    }
  }
  update(dt) {
    for (let k = 0; k < this.max; k++) {
      let l = this.life[k]; if (l <= 0) continue;
      l -= dt; this.life[k] = l;
      if (l <= 0) { this.size[k] = 0; this.pos[k * 3 + 1] = -999; continue; }
      const t = 1 - l / this.maxLife[k], d = Math.exp(-this.drag[k] * dt);
      this.vel[k * 3] *= d; this.vel[k * 3 + 2] *= d; this.vel[k * 3 + 1] = this.vel[k * 3 + 1] * d - this.grav[k] * dt;
      this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      if (this.pos[k * 3 + 1] < 0.05 && this.grav[k] > 0) { this.pos[k * 3 + 1] = 0.05; this.vel[k * 3 + 1] *= -0.4; }
      this.size[k] = this.s0[k] + (this.s1[k] - this.s0[k]) * t; this.rot[k] += this.spin[k] * dt;
      this.col[k * 4 + 3] = this.fade[k] * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
    }
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aRot.needsUpdate = true;
  }
}

// ---------- anillos de onda ----------
export class Rings {
  constructor(scene, n = 8) {
    this.list = []; const geo = new THREE.RingGeometry(0.86, 1, 48); geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.renderOrder = 5; scene.add(m); this.list.push({ m, t: 1, dur: 1, r0: 1, r1: 2, op: 1 }); }
    this.i = 0;
  }
  spawn(x, z, r0, r1, color, dur = 0.7, op = 0.9, y = 0.35) {
    const o = this.list[this.i]; this.i = (this.i + 1) % this.list.length; o.t = 0; o.dur = dur; o.r0 = r0; o.r1 = r1; o.op = op; o.m.material.color.set(color); o.m.position.set(x, y, z); o.m.visible = true;
  }
  update(dt) {
    for (const o of this.list) { if (o.t >= 1) continue; o.t += dt / o.dur; if (o.t >= 1) { o.m.visible = false; continue; } const e = 1 - Math.pow(1 - o.t, 3); const r = o.r0 + (o.r1 - o.r0) * e; o.m.scale.set(r, 1, r); o.m.material.opacity = o.op * (1 - o.t); }
  }
}

// ---------- el torbellino (embudo con remolino) ----------
const FUN_VS = `varying vec2 vUv; varying vec3 vN; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;
const FUN_FS = `precision highp float; varying vec2 vUv; varying vec3 vN; uniform float uTime; uniform float uDir; uniform float uSpeed; uniform float uAlpha; uniform vec3 uA; uniform vec3 uB; uniform float uFreq;
void main(){ float a=fract(vUv.x*uFreq + vUv.y*2.4*uDir - uTime*uSpeed*uDir); float band=smoothstep(0.0,0.3,a)*smoothstep(0.85,0.45,a);
 float fres=1.0-abs(normalize(vN).z); float top=smoothstep(1.0,0.78,vUv.y); float bot=smoothstep(0.0,0.1,vUv.y);
 float alpha=(0.06+0.5*band+0.18*fres)*mix(0.3,1.0,fres)*top*bot*uAlpha; vec3 col=mix(uA,uB,vUv.y)+band*0.25; gl_FragColor=vec4(col,alpha); }`;

export function makeTornado(scene) {
  const g = new THREE.Group(); scene.add(g);
  const funnels = [];
  const defs = [{ s: 1.0, dir: 1, speed: 1.1, a: [1.0, 0.82, 0.95], b: [0.72, 0.94, 1.0], al: 0.95, f: 3 }, { s: 0.78, dir: -1, speed: 1.6, a: [1.0, 0.93, 0.62], b: [1.0, 0.8, 0.95], al: 0.8, f: 4 }, { s: 0.55, dir: 1, speed: 2.4, a: [1, 1, 1], b: [0.8, 0.95, 1], al: 0.7, f: 5 }];
  for (const d of defs) {
    const geo = new THREE.CylinderGeometry(1.5 * d.s, 0.42 * d.s, 3.7, 36, 1, true); geo.translate(0, 1.85, 0);
    const mat = new THREE.ShaderMaterial({ vertexShader: FUN_VS, fragmentShader: FUN_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 }, uDir: { value: d.dir }, uSpeed: { value: d.speed }, uAlpha: { value: d.al }, uA: { value: new THREE.Vector3(...d.a) }, uB: { value: new THREE.Vector3(...d.b) }, uFreq: { value: d.f } } });
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 6; g.add(m); funnels.push(m);
  }
  // anillo y mancha del suelo
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1.0, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff74c4, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.position.y = 0.3; ring.renderOrder = 4; scene.add(ring);
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, 'rgba(255,120,200,.55)'); gr.addColorStop(0.55, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); glow.position.y = 0.28; glow.renderOrder = 3; scene.add(glow);
  // escombros que giran (puntitos de colores)
  const N = 70, pa = new Float32Array(N * 3), pc = new Float32Array(N * 3), seeds = [];
  const cols = [0xff6b5e, 0xffd23f, 0x3fe0b0, 0x4aa8ff, 0xff74c4, 0xffffff];
  const tc = new THREE.Color();
  for (let i = 0; i < N; i++) { seeds.push({ a: Math.random() * 6.28, h: Math.random(), sp: 2.5 + Math.random() * 4 }); tc.set(cols[i % cols.length]); pc[i * 3] = tc.r; pc[i * 3 + 1] = tc.g; pc[i * 3 + 2] = tc.b; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pa, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const pm = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, sizeAttenuation: true, depthWrite: false });
  const bits = new THREE.Points(pg, pm); bits.frustumCulled = false; scene.add(bits);
  return {
    group: g, ring, glow, bits, funnels,
    update(t, R, px, py, pz, lean, pulse = 1) {
      g.position.set(px, py, pz); g.scale.setScalar(R * pulse * 1.12); g.rotation.set(lean.x, 0, lean.z);
      ring.position.set(px, 0.3, pz); ring.scale.set(R, 1, R); glow.position.set(px, 0.28, pz); glow.scale.setScalar(R * 1.9);
      for (const f of funnels) f.material.uniforms.uTime.value = t;
      for (let i = 0; i < N; i++) {
        const s = seeds[i]; s.a += s.sp * 0.016 * (1.1 - s.h * 0.4); const hh = s.h * 3.2, rr = (0.55 + 1.0 * (hh / 3.7)) * (0.7 + 0.5 * ((i * 37) % 10) / 10) * R * pulse;
        pa[i * 3] = px + Math.cos(s.a) * rr + lean.z * -hh * R; pa[i * 3 + 1] = py + hh * R * pulse; pa[i * 3 + 2] = pz + Math.sin(s.a) * rr + lean.x * hh * R;
      }
      pg.attributes.position.needsUpdate = true; pm.size = 0.16 * R + 0.08;
    },
  };
}
