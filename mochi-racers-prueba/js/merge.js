// ======================================================================
//  MOCHI RACERS v13 · fusión de geometría estática
//  La pista tenía 600-900 mallas sueltas (cada una, un draw call). Las que no se
//  mueven nunca se juntan por material y por tramo de pista (para que el recorte
//  por cámara siga funcionando). Lo animado (obstáculos, cajas, decorados que
//  flotan o giran) se detecta probando las animaciones y se deja tal cual.
// ======================================================================
import * as THREE from 'three';

export function mergeStatic(race) {
  const T = race.track, root = T.group; root.updateMatrixWorld(true);
  const all = []; root.traverse(o => { if (o.isMesh) all.push(o); });
  const snap = () => all.map(m => { const e = m.matrixWorld.clone(); e.vis = m.visible; return e; });
  const s0 = snap(); const moved = new Set();
  // 1) excluir lo que sabemos que se anima
  const excl = new Set(); const mark = o => o && o.traverse(x => excl.add(x));
  for (const o of T.obstacles) mark(o.g); for (const b of T.boxes) mark(b.mesh);
  // 2) probar las animaciones en varios instantes y ver qué se mueve
  try { for (const t of [0.37, 1.9, 4.2, 7.7]) { for (const o of T.obstacles) o.update(t, 0.016); for (const a of T.anims || []) a(t, 0.016, race); race.surreal && race.surreal.update(t, 0.016, race); root.updateMatrixWorld(true); const s = snap(); all.forEach((m, i) => { if (!s[i].equals(s0[i]) || s[i].vis !== s0[i].vis) moved.add(m); }); } } catch (e) { return 0; }
  const groups = new Map(); let merged = 0;
  for (const m of all) {
    if (excl.has(m) || moved.has(m) || m.isInstancedMesh || m.isSkinnedMesh || !m.visible || m.userData.noMerge) continue;
    let vis = true; for (let p = m.parent; p && p !== root; p = p.parent) if (!p.visible) vis = false; if (!vis) continue;
    const mat = m.material; if (!mat || Array.isArray(mat) || mat.transparent || m.morphTargetInfluences) continue;
    const g = m.geometry; if (!g.attributes.position || g.morphAttributes.position) continue;
    const sig = Object.keys(g.attributes).sort().map(k => k + g.attributes[k].itemSize + (g.attributes[k].normalized ? 'n' : '')).join(',');
    if (!g.attributes.normal) continue;
    const c = m.getWorldPosition(new THREE.Vector3()); const chunk = T.nearestGlobal ? Math.floor(T.nearestGlobal(c.x, c.z) / 45) : 0;
    const key = mat.uuid + '|' + sig + '|' + chunk + '|' + m.castShadow + m.receiveShadow + '|' + m.renderOrder + '|' + (m.matrixWorld.determinant() < 0);
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m);
  }
  const nm = new THREE.Matrix3();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const attrs = Object.keys(list[0].geometry.attributes); const out = {}; attrs.forEach(k => out[k] = []); let count = 0;
    for (const m of list) { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry; const n = g.attributes.position.count; nm.getNormalMatrix(m.matrixWorld);
      for (const k of attrs) { const a = g.attributes[k], sz = a.itemSize, arr = out[k];
        for (let i = 0; i < n; i++) {
          if (k === 'position') { const v = new THREE.Vector3(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(m.matrixWorld); arr.push(v.x, v.y, v.z); }
          else if (k === 'normal') { const v = new THREE.Vector3(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix3(nm).normalize(); arr.push(v.x, v.y, v.z); }
          else for (let j = 0; j < sz; j++) arr.push(a.getComponent(i, j)); } }
      count += n; if (g !== m.geometry) g.dispose(); }
    const geo = new THREE.BufferGeometry(); for (const k of attrs) { const a = list[0].geometry.attributes[k]; geo.setAttribute(k, new THREE.Float32BufferAttribute(out[k], a.itemSize, a.normalized)); }
    geo.computeBoundingSphere(); const M = new THREE.Mesh(geo, list[0].material); M.castShadow = list[0].castShadow; M.receiveShadow = list[0].receiveShadow; M.renderOrder = list[0].renderOrder; M.matrixAutoUpdate = false; M.name = 'merged';
    root.add(M); M.updateMatrixWorld(true);
    // la malla original deja de dibujarse (se conserva por si algún código la referencia)
    for (const m of list) { m.layers.set(31); merged++; } // capa que no dibuja ninguna cámara; sus hijos no se ven afectados
  }
  return merged;
}
