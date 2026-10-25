// v21: joystick flotante compartido (sala y carrera). Aparece donde pones el dedo en tu mitad de la pantalla
// (derecha; izquierda en modo zurdo), zona muerta pequeña, respuesta analógica suave y, si el dedo se sale
// del círculo, la base le sigue: nunca se pierde el control. Cada dedo va por su pointerId (multitáctil).
export function floatJoy({ joy, knob, active, onStart, R = 56, DZ = 5 }) {
  const S = { x: 0, y: 0, m: 0, held: false, id: null };
  let bx = 0, by = 0, hadOn = false;
  const place = () => { for (const [k, v] of [['left', bx + 'px'], ['top', by + 'px'], ['right', 'auto'], ['bottom', 'auto'], ['margin', `-${joy.offsetHeight / 2 || 56}px 0 0 -${joy.offsetWidth / 2 || 56}px`]]) joy.style.setProperty(k, v, 'important'); };
  const reset = () => { ['left', 'top', 'right', 'bottom', 'margin'].forEach(k => joy.style.removeProperty(k)); knob.style.transform = 'translate(-50%,-50%)'; };
  const upd = (cx, cy) => {
    let dx = cx - bx, dy = cy - by, d = Math.hypot(dx, dy);
    // v22: la base se queda FIJA donde pusiste el dedo; si te sales del círculo, el botón se queda en el borde y la dirección sigue siendo la del dedo
    const kc = d > R ? R / d : 1; knob.style.transform = `translate(calc(-50% + ${dx * kc * 0.8}px),calc(-50% + ${dy * kc * 0.8}px))`; if (d > R) d = R;
    if (d <= DZ) { S.x = S.y = S.m = 0; return; }
    const m = Math.min(1, (d - DZ) / (R * 0.85 - DZ)); S.m = m * m * (3 - 2 * m) * 0.35 + m * 0.65; // curva suave: fino cerca del centro, lleno al borde
    S.m = Math.min(1, S.m); S.x = (cx - bx) / Math.hypot(cx - bx, cy - by) * S.m; S.y = -(cy - by) / Math.hypot(cx - bx, cy - by) * S.m;
  };
  addEventListener('pointerdown', e => {
    if (S.held || !active()) return;
    const t = e.target; if (t.closest && t.closest('button,#nums,.scr.on,.card,a,input,#crownBoard,#mm')) return;
    
    if (e.clientY < 64) return;
    e.preventDefault(); S.held = true; S.id = e.pointerId; bx = e.clientX; by = e.clientY; place(); hadOn = joy.classList.contains('on'); joy.classList.add('on', 'act');
    onStart && onStart(); upd(e.clientX, e.clientY);
  }, { passive: false });
  addEventListener('pointermove', e => { if (S.held && e.pointerId === S.id) { e.preventDefault(); upd(e.clientX, e.clientY); } }, { passive: false });
  const end = e => { if (!S.held || (e && e.pointerId !== S.id)) return; S.held = false; S.id = null; S.x = S.y = S.m = 0; joy.classList.remove('act'); if (!hadOn) joy.classList.remove('on'); reset(); };
  addEventListener('pointerup', end); addEventListener('pointercancel', end); addEventListener('blur', () => end());
  S.cancel = () => end();
  return S;
}
