// v10: miniaturas 3D en vivo de los 12 personajes (un solo renderer, render-to-texture pequeño y a baja frecuencia)
import * as THREE from 'three';
const W = 112, H = 124;
export function makeThumbs(renderer, makeModel, players) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xffd9b8, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.3); sun.position.set(-2.5, 4, 5); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbfd8ff, 0.7); fill.position.set(4, 1.5, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffa8e4, 1.4); rim.position.set(2, 3, -4); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(24, W / H, 0.1, 60);
  const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, colorSpace: THREE.SRGBColorSpace, depthBuffer: true });
  const buf = new Uint8Array(W * H * 4);
  const items = players.map((p, i) => {
    const model = makeModel(p.id); model.visible = false; scene.add(model); model.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(model), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const fv = (cam.fov * Math.PI) / 360, dist = Math.max((sz.y * 0.56) / Math.tan(fv), (sz.x * 0.6) / (Math.tan(fv) * (W / H))) + sz.z * 0.5 + 0.2;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(W, H);
    return { id: p.id, model, ud: model.userData, cy: c.y, dist, canvas, ctx, img, ph: i * 0.83, blinkT: 1 + i * 0.3, blinkP: 0, base: model.userData.arms ? model.userData.arms.map((a) => a.rotation.z) : [], hover: model.userData.hover || 0, ready: false };
  });
  let rr = 0, acc = 0;
  function pose(it, t) {
    const ud = it.ud, s = t + it.ph;
    it.model.position.y = it.hover + Math.abs(Math.sin(s * 3.1)) * 0.03 * (ud.h || 1.6);
    it.model.rotation.y = 0.34 + Math.sin(s * 0.9) * 0.42;
    if (ud.arms) ud.arms.forEach((a, i) => { a.rotation.z = it.base[i] + Math.sin(s * 3.1 + i * 2.2) * 0.14 * (i ? -1 : 1); });
    if (ud.legs) ud.legs.forEach((l, i) => { l.rotation.x = Math.sin(s * 3.1 + i * Math.PI) * 0.12; });
    if (ud.head) { ud.head.rotation.z = Math.sin(s * 1.7) * 0.06; ud.head.rotation.x = Math.sin(s * 2.3) * 0.04; }
    if (ud.extra) ud.extra(s, { speed: 0 });
    if (ud.lids) { it.blinkP = Math.max(0, it.blinkP - 0.016); it.blinkT -= 0.016; if (it.blinkT < 0) { it.blinkP = 0.17; it.blinkT = 1.8 + (Math.sin(s * 91) * 0.5 + 0.5) * 3; } const bl = it.blinkP > 0 ? Math.sin((1 - it.blinkP / 0.17) * Math.PI) : 0; for (const l of ud.lids) { l.visible = bl > 0.05; l.scale.y = 0.3 + bl; } }
  }
  function draw(i, t) {
    const it = items[i]; pose(it, t); it.model.visible = true; it.model.updateMatrixWorld(true);
    cam.position.set(0, it.cy + it.dist * 0.08, it.dist); cam.lookAt(0, it.cy, 0);
    const pr = renderer.getRenderTarget(), ac = renderer.getClearAlpha(), cc = new THREE.Color(); renderer.getClearColor(cc); const sh = renderer.shadowMap.enabled; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); renderer.setRenderTarget(pr); renderer.setClearColor(cc, ac); renderer.shadowMap.autoUpdate = true;
    it.model.visible = false; it.img.data.set(buf); it.ctx.putImageData(it.img, 0, 0); it.ready = true;
  }
  return {
    canvases: items.map((it) => it.canvas),
    // la seleccionada se anima cada frame; las demás se reparten (≈ 12 fps cada una)
    update(dt, t, sel) { acc += dt; draw(sel, t); const n = 2; for (let k = 0; k < n; k++) { rr = (rr + 1) % items.length; if (rr !== sel) draw(rr, t); } },
    drawAll(t) { for (let i = 0; i < items.length; i++) draw(i, t); },
    items,
  };
}
