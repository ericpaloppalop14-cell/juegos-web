/* Telegrafía de obstáculos: flechas en el suelo + icono flotante (verde = SALTA, naranja = AGÁCHATE) */
import { THREE, bendMat } from './util.js?v=5';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function chevrons(up, col1, col2) {
  const c = cv(128, 256), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, col1 + '00'); g.addColorStop(0.5, col1 + '55'); g.addColorStop(1, col1 + '00');
  x.fillStyle = g; x.beginPath(); x.roundRect(10, 0, 108, 256, 24); x.fill();
  x.lineJoin = 'round'; x.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const y0 = 20 + i * 128, y1 = y0 + 62;
    x.beginPath(); if (up) { x.moveTo(20, y1); x.lineTo(64, y0); x.lineTo(108, y1); } else { x.moveTo(20, y0); x.lineTo(64, y1); x.lineTo(108, y0); }
    x.strokeStyle = 'rgba(20,24,60,.85)'; x.lineWidth = 34; x.stroke();
    x.strokeStyle = col2; x.lineWidth = 22; x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function badge(up, c1, c2) {
  const c = cv(128, 128), x = c.getContext('2d');
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 8; x.shadowOffsetY = 4;
  const g = x.createLinearGradient(0, 8, 0, 120); g.addColorStop(0, c1); g.addColorStop(1, c2);
  x.fillStyle = g; x.beginPath(); x.roundRect(10, 8, 108, 108, 30); x.fill(); x.shadowColor = 'transparent';
  x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
  x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = '#fff'; x.lineWidth = 15;
  x.beginPath(); if (up) { x.moveTo(36, 78); x.lineTo(64, 46); x.lineTo(92, 78); } else { x.moveTo(36, 46); x.lineTo(64, 78); x.lineTo(92, 46); } x.stroke();
  x.beginPath(); if (up) { x.moveTo(36, 100); x.lineTo(64, 68); x.lineTo(92, 100); } else { x.moveTo(36, 28); x.lineTo(64, 60); x.lineTo(92, 28); }
  x.globalAlpha = 0.55; x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let T = null, G = null;
function init() {
  if (T) return;
  T = { jump: chevrons(true, '#7dff3a', '#b6ff4a'), slide: chevrons(false, '#ff8a1a', '#ffd23c') };
  const mk = m => { const mm = bendMat(new THREE.MeshBasicMaterial({ map: m, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false })); return mm; };
  const mi = t => bendMat(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  G = {
    dg: new THREE.PlaneGeometry(2.2, 6.2), ig: new THREE.PlaneGeometry(1.5, 1.5),
    dm: { jump: mk(T.jump), slide: mk(T.slide) },
    im: { jump: mi(badge(true, '#7bea34', '#2fae1f')), slide: mi(badge(false, '#ffb02a', '#ff6a1a')) },
  };
  T.jump.repeat.set(1, 1); T.slide.repeat.set(1, 1);
}
export const TELE = {
  need(cls) { return cls === 'low' ? 'jump' : (cls === 'high' || cls === 'bird') ? 'slide' : null; },
  attach(e) {
    init(); const kind = this.need(e.cls); if (!kind) return;
    if (!e.tele) {
      const dec = new THREE.Mesh(G.dg, G.dm[kind]); dec.rotation.x = -Math.PI / 2; dec.renderOrder = 3; dec.frustumCulled = false;
      const ico = new THREE.Mesh(G.ig, G.im[kind]); ico.renderOrder = 9; ico.frustumCulled = false;
      e.obj.add(dec); e.obj.add(ico); e.tele = { dec, ico, kind };
    }
    e.tele.dec.position.set(0, 0.035, e.len / 2 + 2.9); e.tele.base = Math.min(4.1, Math.max(1.9, e.y1 + 0.95)); e.tele.dec.visible = e.tele.ico.visible = true;
  },
  hide(e) { if (e.tele) e.tele.dec.visible = e.tele.ico.visible = false; },
  /* por frame: ahead = distancia al jugador */
  update(e, ahead, t) {
    const k = e.tele; if (!k) return;
    const far = Math.min(1, Math.max(0, (ahead - 6) / 55)); const sc = (1 + far * 1.25) * Math.min(1, Math.max(0.0, (ahead - 1) / 5));
    k.ico.scale.setScalar(sc * (1 + Math.sin(t * 7 + e.ph) * 0.06)); k.ico.position.set(0, k.base + Math.sin(t * 4 + e.ph) * 0.12 + far * 0.6, e.len / 2 * 0 + 0.4);
    const a = Math.min(1, Math.max(0, (ahead - 2) / 6)); k.dec.material.opacity = 1; k.dec.visible = ahead > 1.5; k.ico.visible = ahead > 1;
  },
  tick(t) { if (!T) return; T.jump.offset.y = -((t * 1.4) % 1); T.slide.offset.y = ((t * 1.4) % 1); },
};
