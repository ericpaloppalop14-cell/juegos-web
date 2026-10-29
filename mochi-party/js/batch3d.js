// MOCHI PARTY · batch3d (o46): fusiona automáticamente las mallas ESTÁTICAS de un objeto animado en pocas mallas (1 llamada de dibujo por material y por pieza móvil).
// Sin tocar el código de animación: se muestrea la animación en varios instantes y se detectan los nodos que cambian (transformación, visibilidad, material, geometría);
// las mallas que no cambian se hornean en el espacio local de su pieza móvil más cercana y se fusionan por «firma» de material.
import * as THREE from 'three';

const hex = c => (c && c.getHex ? c.getHex() : 0);
const OK = new Set(['MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshToonMaterial', 'MeshBasicMaterial', 'MeshPhongMaterial', 'MeshLambertMaterial']);
// firma del material SIN el color (el color se hornea en los vértices → muchos colores = 1 sola llamada de dibujo)
const matSig = m => [m.type, hex(m.emissive), m.emissiveIntensity, m.opacity, m.transparent ? 1 : 0, m.roughness, m.metalness, m.side, m.depthWrite ? 1 : 0, m.depthTest === false ? 0 : 1, m.blending, m.flatShading ? 1 : 0, m.sheen, hex(m.sheenColor), m.clearcoat, m.iridescence, m.map ? m.map.uuid : '', m.alphaMap ? m.alphaMap.uuid : '', m.gradientMap ? m.gradientMap.uuid : '', m.fog === false ? 0 : 1, m.polygonOffset ? m.polygonOffsetFactor : 0, m.userData && m.userData.rim, m.envMapIntensity, m.shininess].join('|');
function snap(root) {
  const s = new Map();
  root.traverse(o => { const a = [o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z, o.visible ? 1 : 0];
    if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { const m = o.material; a.push(o.geometry ? o.geometry.uuid : '', o.geometry && o.geometry.attributes.position ? o.geometry.attributes.position.version : 0); if (m && !Array.isArray(m)) a.push(m.uuid, m.opacity, hex(m.color), hex(m.emissive), m.emissiveIntensity, m.map && m.map.offset ? m.map.offset.x + m.map.offset.y : 0); }
    s.set(o, a); });
  return s;
}
const differ = (a, b, from = 0, to = a.length) => { if (a.length !== b.length) return true; for (let i = from; i < Math.min(to, a.length); i++) { const x = a[i], y = b[i]; if (typeof x === 'number') { if (Math.abs(x - y) > 1e-5) return true; } else if (x !== y) return true; } return false; };

// advance(k): pone el objeto en la pose de la muestra k. Cada PIEZA MÓVIL (nodo animado) pasa a ser un hueso; todas las mallas estáticas con el mismo material
// se funden en UNA SkinnedMesh por material (1 llamada de dibujo) cuyos vértices siguen a su hueso. El código de animación no cambia.
export function bakeStatic(root, advance, { samples = 6, keep = null } = {}) {
  const snaps = []; for (let k = 0; k < samples; k++) { advance(k); root.updateMatrixWorld(true); snaps.push(snap(root)); }
  const animated = new Set(), dyn = new Set(), vis = new Set(); // animated = se mueve (hueso); vis = cambia de visibilidad (hueso «con puerta»: se anula su matriz cuando está oculto); dyn = cambia geometría/material (no se puede fundir)
  root.traverse(o => { const a0 = snaps[0].get(o); for (let k = 1; k < samples; k++) { const a1 = snaps[k].get(o); if (differ(a0, a1, 0, 10)) animated.add(o); if (a0[10] !== a1[10]) vis.add(o); if (differ(a0, a1, 11)) dyn.add(o); } if (o.name === 'detalle') vis.add(o); });
  advance(0); root.updateMatrixWorld(true);
  const visibleChain = o => { for (let q = o; q; q = q.parent) { if (dyn.has(q) || (!q.visible && !vis.has(q))) return false; } return true; };
  const list = []; root.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.material && !Array.isArray(o.material) && OK.has(o.material.type) && o.geometry && o.geometry.attributes.position && o.geometry.attributes.normal && !(keep && keep(o)) && !o.userData.noBake && visibleChain(o)) list.push(o); });
  const bones = [root], bi = new Map([[root, 0]]); const boneOf = o => { let q = o; while (q && q !== root && !animated.has(q) && !vis.has(q)) q = q.parent; q = q || root; if (!bi.has(q)) { bi.set(q, bones.length); bones.push(q); } return bi.get(q); };
  const groups = new Map();
  for (const m of list) { const g = m.geometry, sig = ['position', 'normal', 'uv'].filter(k => g.attributes[k]).join(',') + (g.attributes.uv ? '' : '');
    const key = matSig(m.material) + '#' + m.renderOrder + '#' + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0) + '#' + sig + '#' + (m.material.vertexColors ? 1 : 0);
    let G = groups.get(key); if (!G) groups.set(key, G = { src: m.material, ro: m.renderOrder, cs: m.castShadow, rs: m.receiveShadow, uv: !!g.attributes.uv, list: [] }); G.list.push(m); }
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), rel = new THREE.Matrix4(); let after = 0, before = list.length; const made = [];
  for (const G of groups.values()) { if (G.list.length < 2) { after++; continue; }
    const P = [], N = [], U = [], C = [], BI = []; let total = 0;
    for (const m of G.list) { let g = m.geometry; g = g.index ? g.toNonIndexed() : g.clone(); rel.multiplyMatrices(inv, m.matrixWorld); g.applyMatrix4(rel); const flip = rel.determinant() < 0, cnt = g.attributes.position.count, bone = boneOf(m);
      const pos = g.attributes.position.array.slice(), nor = g.attributes.normal.array.slice(), uv = G.uv ? g.attributes.uv.array.slice() : null, col = new Float32Array(cnt * 3), src = m.material.vertexColors && m.geometry.attributes.color ? (m.geometry.index ? null : m.geometry.attributes.color.array) : null; let vc = null;
      if (m.material.vertexColors && m.geometry.attributes.color) { const g0 = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry; vc = g0.attributes.color.array; }
      const mc = m.material.color; for (let i = 0; i < cnt; i++) { col[i * 3] = (vc ? vc[i * 3] : 1) * mc.r; col[i * 3 + 1] = (vc ? vc[i * 3 + 1] : 1) * mc.g; col[i * 3 + 2] = (vc ? vc[i * 3 + 2] : 1) * mc.b; }
      if (flip) for (let t = 0; t < cnt; t += 3) { for (const [arr, sz] of [[pos, 3], [nor, 3], [col, 3], [uv, 2]]) { if (!arr) continue; for (let c = 0; c < sz; c++) { const a = arr[(t + 1) * sz + c]; arr[(t + 1) * sz + c] = arr[(t + 2) * sz + c]; arr[(t + 2) * sz + c] = a; } } }
      P.push(pos); N.push(nor); if (uv) U.push(uv); C.push(col); BI.push([bone, cnt]); total += cnt; g.dispose(); }
    const cat = (arrs, sz) => { const out = new Float32Array(total * sz); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(cat(P, 3), 3)); mg.setAttribute('normal', new THREE.BufferAttribute(cat(N, 3), 3)); if (G.uv) mg.setAttribute('uv', new THREE.BufferAttribute(cat(U, 2), 2)); mg.setAttribute('color', new THREE.BufferAttribute(cat(C, 3), 3));
    const si = new Uint16Array(total * 4), sw = new Float32Array(total * 4); let o = 0; for (const [b, c] of BI) for (let i = 0; i < c; i++, o++) { si[o * 4] = b; sw[o * 4] = 1; }
    mg.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); mg.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    const mat = G.src.clone(); mat.color.setRGB(1, 1, 1); mat.vertexColors = true; mat.onBeforeCompile = G.src.onBeforeCompile; if (G.src.customProgramCacheKey) mat.customProgramCacheKey = G.src.customProgramCacheKey; mat.userData = { ...G.src.userData }; mat.needsUpdate = true;
    const mm = new THREE.SkinnedMesh(mg, mat); mm.renderOrder = G.ro; mm.castShadow = G.cs; mm.receiveShadow = G.rs; mm.frustumCulled = false; mm.userData.baked = true; made.push(mm);
    for (const m of G.list) { let gated = false; for (let q = m; q && q !== root; q = q.parent) if (vis.has(q)) gated = true; if (gated) m.layers.set(31); else m.visible = false; if (!animated.has(m)) m.matrixAutoUpdate = false; } after++; } // se ocultan (no se quitan): el código de animación puede seguir refiriéndose a ellas
  if (made.length) { for (const mm of made) root.add(mm); root.updateMatrixWorld(true); const sk = new THREE.Skeleton(bones); for (const mm of made) mm.bind(sk);
    const gates = []; bones.forEach((b, i) => { if (b === root) return; const ch = []; for (let q = b; q && q !== root; q = q.parent) if (vis.has(q)) ch.push(q); if (ch.length) gates.push([i, ch]); });
    sk.userData = { gates, root }; if (gates.length) { const off = new THREE.Matrix4(); sk.update = function () { const bs = this.bones, iv = this.boneInverses, m = this.boneMatrices, tx = this.boneTexture;
      for (let i = 0; i < bs.length; i++) { off.multiplyMatrices(bs[i] ? bs[i].matrixWorld : off.identity(), iv[i]); off.toArray(m, i * 16); }
      for (let g = 0; g < gates.length; g++) { const ch = gates[g][1]; for (let j = 0; j < ch.length; j++) if (!ch[j].visible) { m.fill(0, gates[g][0] * 16, gates[g][0] * 16 + 16); break; } }
      if (tx !== null) tx.needsUpdate = true; }; } }
  let dynEx = 0; root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.visible && dyn.size && (() => { for (let q = o; q; q = q.parent) if (dyn.has(q)) return true; return false; })()) dynEx++; });
  return { meshesBefore: before, meshesAfter: after, animatedNodes: animated.size, bones: bones.length, dynNodes: dyn.size, dynExcluded: dynEx, groups: groups.size };
}

// ---- fusión ENTRE objetos (o46): todas las SkinnedMesh horneadas de la escena (varios personajes, camellos, medusas…) con el mismo material → UNA sola malla + UN esqueleto.
// Los vértices se pasan a coordenadas del mundo en la pose de horneado (bindMatrix de cada malla) y el esqueleto combinado usa bindMode «detached» con identidad.
export function megaMerge(scene, filter = null) {
  const metas = new Map(); // esqueleto → {root, meshes}
  scene.traverse(o => { if (o.isSkinnedMesh && o.userData.baked && o.visible && o.skeleton && o.skeleton.userData && o.skeleton.userData.root && (!filter || filter(o))) { let m = metas.get(o.skeleton); if (!m) metas.set(o.skeleton, m = { sk: o.skeleton, root: o.skeleton.userData.root, meshes: [] }); m.meshes.push(o); } });
  const list = [...metas.values()]; if (!list.length) return { dispose() {}, merged: 0, before: 0 };
  const bones = [], invs = [], entries = []; for (const m of list) { m.off = bones.length; for (let i = 0; i < m.sk.bones.length; i++) { bones.push(m.sk.bones[i]); invs.push(m.sk.boneInverses[i]); } entries.push(m); }
  const groups = new Map(); let before = 0;
  for (const m of list) for (const mesh of m.meshes) { before++; const g = mesh.geometry, key = matSig(mesh.material) + '#' + mesh.renderOrder + '#' + (mesh.castShadow ? 1 : 0) + (mesh.receiveShadow ? 1 : 0) + '#' + (g.attributes.uv ? 1 : 0) + (mesh.material.vertexColors ? 1 : 0) + (mesh.material.map ? 1 : 0);
    let G = groups.get(key); if (!G) groups.set(key, G = { src: mesh, list: [] }); G.list.push([m, mesh]); }
  const made = [], hidden = [], v3 = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const G of groups.values()) { if (G.list.length < 2) continue;
    let total = 0; for (const [, me] of G.list) total += me.geometry.attributes.position.count;
    const uv = !!G.src.geometry.attributes.uv, P = new Float32Array(total * 3), N = new Float32Array(total * 3), C = new Float32Array(total * 3), U = uv ? new Float32Array(total * 2) : null, SI = new Uint16Array(total * 4), SW = new Float32Array(total * 4); let o = 0;
    for (const [m, me] of G.list) { const g = me.geometry, n = g.attributes.position.count, pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color, ua = g.attributes.uv, si = g.attributes.skinIndex; nm.setFromMatrix4(me.bindMatrix);
      for (let i = 0; i < n; i++, o++) { v3.fromBufferAttribute(pa, i).applyMatrix4(me.bindMatrix); P[o * 3] = v3.x; P[o * 3 + 1] = v3.y; P[o * 3 + 2] = v3.z; v3.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N[o * 3] = v3.x; N[o * 3 + 1] = v3.y; N[o * 3 + 2] = v3.z;
        if (ca) { C[o * 3] = ca.getX(i); C[o * 3 + 1] = ca.getY(i); C[o * 3 + 2] = ca.getZ(i); } else { C[o * 3] = C[o * 3 + 1] = C[o * 3 + 2] = 1; } if (U) { U[o * 2] = ua.getX(i); U[o * 2 + 1] = ua.getY(i); }
        SI[o * 4] = si.getX(i) + m.off; SW[o * 4] = 1; } }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(N, 3)); mg.setAttribute('color', new THREE.BufferAttribute(C, 3)); if (U) mg.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    mg.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); mg.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    const mm = new THREE.SkinnedMesh(mg, G.src.material); mm.renderOrder = G.src.renderOrder; mm.castShadow = G.src.castShadow; mm.receiveShadow = G.src.receiveShadow; mm.frustumCulled = false; mm.name = 'megaBatch'; made.push(mm); for (const [, me] of G.list) hidden.push(me); }
  if (!made.length) return { dispose() {}, merged: 0, before };
  const sk = new THREE.Skeleton(bones, invs), off = new THREE.Matrix4(), I = new THREE.Matrix4(); const gates = [];
  for (const m of list) for (const [i, ch] of m.sk.userData.gates) gates.push([m.off + i, ch]);
  sk.update = function () { const bs = this.bones, iv = this.boneInverses, mat = this.boneMatrices, tx = this.boneTexture;
    for (let r = 0; r < entries.length; r++) { const e = entries[r], n = e.sk.bones.length; let live = true; for (let q = e.root; q; q = q.parent) { if (!q.visible) { live = false; break; } if (q === scene) break; }
      if (!live) { mat.fill(0, e.off * 16, (e.off + n) * 16); continue; }
      for (let i = e.off; i < e.off + n; i++) { off.multiplyMatrices(bs[i].matrixWorld, iv[i]); off.toArray(mat, i * 16); } }
    for (let g = 0; g < gates.length; g++) { const ch = gates[g][1]; for (let j = 0; j < ch.length; j++) if (!ch[j].visible) { mat.fill(0, gates[g][0] * 16, gates[g][0] * 16 + 16); break; } }
    if (tx !== null) tx.needsUpdate = true; };
  for (const mm of made) { mm.bindMode = THREE.DetachedBindMode; scene.add(mm); mm.bind(sk, I); } scene.updateMatrixWorld(true);
  for (const me of hidden) me.visible = false;
  return { merged: made.length, before, meshes: made, dispose() { for (const mm of made) { scene.remove(mm); mm.geometry.dispose(); } for (const me of hidden) me.visible = true; } };
}
