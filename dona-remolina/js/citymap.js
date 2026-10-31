// v14: ilustraciones SVG animadas de cada ciudad (miniaturas del mapa de ciudades) y su construcción icónica
const W = 160, H = 100;
const sparkle = (x, y, s, c = '#fff', d = 0) => `<path class="tw" style="animation-delay:${d}s" fill="${c}" d="M${x} ${y - s}L${x + s * 0.28} ${y - s * 0.28}L${x + s} ${y}L${x + s * 0.28} ${y + s * 0.28}L${x} ${y + s}L${x - s * 0.28} ${y + s * 0.28}L${x - s} ${y}L${x - s * 0.28} ${y - s * 0.28}Z"/>`;
const cloud = (x, y, s, c = '#fff', cls = 'cd1') => `<g class="${cls}"><g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><ellipse cx="0" cy="0" rx="14" ry="6"/><circle cx="-6" cy="-5" r="6"/><circle cx="3" cy="-8" r="8"/><circle cx="10" cy="-3" r="5"/></g></g>`;
const defs = (id, stops, extra = '') => `<defs><linearGradient id="sk${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>${extra}</defs><rect width="${W}" height="${H}" fill="url(#sk${id})"/>`;

const ART = {
  // Mueblópolis: ayuntamiento loco con reloj y cúpula, sofá y árbol
  muebl() {
    let s = defs('m', [[0, '#5cb8ff'], [0.6, '#b4e6ff'], [1, '#ffeedd']]);
    s += cloud(30, 20, 1, '#fff', 'cd1') + cloud(128, 14, 0.8, '#fff', 'cd2');
    [[4, 44, 18, 36, '#c8a0ff'], [20, 38, 14, 42, '#ffb0c0'], [118, 40, 16, 40, '#9fe0c0'], [136, 46, 20, 34, '#ffd27a']].forEach(([x, y, w, h, c], i) => { s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}" transform="rotate(${i % 2 ? 3 : -3} ${x + w / 2} ${y + h})"/>`; });
    s += `<rect y="76" width="${W}" height="24" fill="#ffd9b8"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i * 22 - 6}" y="${i % 2 ? 84 : 78}" width="11" height="8" fill="#ffc08a" opacity=".7" transform="skewX(-20)"/>`).join('');
    s += `<g class="bob"><path d="M54 33Q80 6 106 33Z" fill="#ffd23f"/><path d="M80 12L80 33M66 20L68 33M94 20L92 33" stroke="#8a5be0" stroke-width="3" opacity=".8"/><rect x="50" y="31" width="60" height="5" rx="2" fill="#f4dcb0"/><rect x="52" y="35" width="56" height="44" rx="3" fill="#8a5be0"/>`;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) s += `<rect x="${56 + c * 13}" y="${40 + r * 12}" width="9" height="8" rx="1.5" fill="${['#ffb27a', '#7fd8d0', '#ffd23f', '#9fc8ff'][(r + c) % 4]}"/>`;
    s += `<circle cx="80" cy="27" r="7" fill="#fff6e0" stroke="#d9b070" stroke-width="1.6"/><path d="M80 27V22M80 27L84 29" stroke="#4a2a6b" stroke-width="1.5" stroke-linecap="round"/><path d="M70 79h20l-3 -6h-14z" fill="#f4dcb0"/><rect x="75" y="68" width="10" height="11" rx="5" fill="#4a2a6b"/></g>`;
    s += `<g><rect x="6" y="80" width="38" height="12" rx="5" fill="#ff7a59"/><rect x="8" y="70" width="34" height="14" rx="6" fill="#ff9070"/><rect x="2" y="76" width="9" height="16" rx="4" fill="#ff6a45"/><rect x="39" y="76" width="9" height="16" rx="4" fill="#ff6a45"/><rect x="12" y="76" width="12" height="7" rx="3" fill="#ffd9c8"/></g>`;
    s += `<g class="sway"><rect x="132" y="68" width="5" height="22" rx="2" fill="#8a5a3a"/><circle cx="134" cy="62" r="13" fill="#3fc070"/><circle cx="128" cy="68" r="8" fill="#52d484"/></g>`;
    return s + sparkle(24, 52, 4, '#fff', 0) + sparkle(112, 22, 3, '#ffd23f', 0.8);
  },
  // Puerto Pastelero: cupcake gigante sobre un muelle de galleta y olas de chocolate
  puerto() {
    let s = defs('p', [[0, '#ff9fd0'], [0.6, '#ffd6ea'], [1, '#fff6e8']]);
    s += `<circle cx="132" cy="22" r="11" fill="#fff0b8"/><circle cx="132" cy="22" r="16" fill="#fff0b8" opacity=".35"/>` + cloud(32, 22, 1, '#fff6fa', 'cd1') + cloud(96, 14, 0.7, '#fff6fa', 'cd2');
    s += `<rect y="66" width="${W}" height="34" fill="#9a5f3c"/><g class="wv">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<circle cx="${i * 20 - 10}" cy="66" r="10" fill="#b57c4e"/><circle cx="${i * 20 - 10}" cy="66" r="6" fill="#fff0e0" opacity=".85"/>`).join('')}</g>`;
    s += `<rect x="0" y="78" width="46" height="8" rx="3" fill="#e0a45a"/><rect x="0" y="84" width="46" height="16" fill="#c9893f"/><path d="M8 84v16M20 84v16M32 84v16" stroke="#a86d2c" stroke-width="2"/>`;
    s += `<g class="bob"><path d="M58 52h44l-6 30H64z" fill="#9fe8d0"/>${[0, 1, 2, 3].map((i) => `<path d="M${66 + i * 9} 52l-2 30" stroke="#fff" stroke-width="2.4" opacity=".8"/>`).join('')}<ellipse cx="80" cy="52" rx="27" ry="8" fill="#ffb3d6"/><ellipse cx="80" cy="44" rx="22" ry="9" fill="#ff9ec8"/><ellipse cx="80" cy="36" rx="16" ry="8" fill="#ff86bb"/><ellipse cx="80" cy="29" rx="9" ry="6" fill="#ff74ae"/><path d="M70 40q10 6 20 0" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/><circle cx="80" cy="20" r="7" fill="#e8283c"/><circle cx="77.5" cy="17.5" r="2.2" fill="#fff" opacity=".85"/><path d="M80 14q3 -6 8 -7" stroke="#3a7a3a" stroke-width="2" fill="none"/>${[[66, 46, '#ffd23f'], [92, 47, '#4aa8ff'], [74, 36, '#fff'], [88, 33, '#9fe8d0'], [80, 47, '#b06bff']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="4" height="1.8" rx=".9" fill="${c}" transform="rotate(${x * 7} ${x} ${y})"/>`).join('')}</g>`;
    s += `<g><rect x="128" y="40" width="3" height="30" fill="#fff"/><circle cx="129.5" cy="36" r="8" fill="#ff74c4"/><path d="M129.5 36m-5 0a5 5 0 1 0 10 0" stroke="#fff" stroke-width="2" fill="none"/><circle cx="129.5" cy="36" r="2" fill="#ffd23f"/></g>`;
    return s + sparkle(44, 44, 4, '#fff', 0.3) + sparkle(116, 52, 3, '#fff', 1);
  },
  // Jungla de Juguetes: torre de bloques con bandera, palmera y dino de peluche
  jungla() {
    let s = defs('j', [[0, '#36c4e8'], [0.55, '#a8f0d0'], [1, '#fff5c0']]);
    s += cloud(30, 20, 0.9, '#f4fff4', 'cd1') + cloud(120, 24, 0.7, '#f4fff4', 'cd2');
    s += `<path d="M0 70Q30 50 60 66T120 62T160 68V100H0Z" fill="#5fcf70"/><path d="M0 80Q40 68 80 78T160 76V100H0Z" fill="#3fbf5a"/>`;
    s += [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i * 22 - 4}" y="${i % 2 ? 90 : 84}" width="12" height="9" fill="${i % 2 ? '#ffd23f' : '#2fae4a'}" opacity=".75" transform="skewX(-20)"/>`).join('');
    s += `<g class="bob"><rect x="56" y="62" width="48" height="20" rx="3" fill="#8a4be0"/><rect x="61" y="42" width="38" height="22" rx="3" fill="#e8453c"/><rect x="66" y="26" width="28" height="18" rx="3" fill="#2a7bd9"/>`;
    [[60, 60, 5], [72, 60, 5], [84, 60, 5], [95, 60, 5]].forEach(([x, y]) => { s += `<rect x="${x - 2}" y="${y}" width="6" height="3" rx="1.5" fill="#a070f0"/>`; });
    [[66, 40], [78, 40], [90, 40]].forEach(([x, y]) => { s += `<rect x="${x - 1}" y="${y}" width="6" height="3" rx="1.5" fill="#ff7a6e"/>`; });
    [[70, 24], [82, 24]].forEach(([x, y]) => { s += `<rect x="${x}" y="${y}" width="6" height="3" rx="1.5" fill="#5aa0f0"/>`; });
    [[64, 68], [90, 68], [64, 48], [88, 48], [72, 32], [82, 32]].forEach(([x, y]) => { s += `<rect x="${x}" y="${y}" width="7" height="7" rx="1.5" fill="#ffd23f"/>`; });
    s += `<rect x="79" y="8" width="2.4" height="19" fill="#4a2a6b"/><path class="flag" d="M81 9h16l-4 4.5l4 4.5H81z" fill="#ff4a4a"/></g>`;
    s += `<g class="sway"><path d="M24 90Q22 66 30 50" stroke="#a8683a" stroke-width="5" fill="none" stroke-linecap="round"/>${[[-14, -6], [-8, -14], [4, -14], [12, -6], [0, -2]].map(([dx, dy]) => `<path d="M30 50q${dx * 0.6} ${dy - 2} ${dx * 1.6} ${dy + 4}q${-dx * 0.1} -${6} ${-dx * 1.6} ${-4}z" fill="#1fa84a"/>`).join('')}<circle cx="29" cy="52" r="3" fill="#8a5a2a"/></g>`;
    s += `<g class="bob2"><ellipse cx="128" cy="80" rx="14" ry="10" fill="#4fd06a"/><circle cx="140" cy="70" r="8" fill="#5fe07a"/><circle cx="142" cy="68" r="2.2" fill="#fff"/><circle cx="142.6" cy="68" r="1.1" fill="#222"/><path d="M114 82q-8 2 -10 -6q6 2 10 0z" fill="#4fd06a"/>${[0, 1, 2].map((i) => `<path d="M${122 + i * 7} 71l3 -7l3 7z" fill="#ffd23f"/>`).join('')}<rect x="120" y="86" width="5" height="7" rx="2" fill="#3fb85a"/><rect x="132" y="86" width="5" height="7" rx="2" fill="#3fb85a"/></g>`;
    return s + sparkle(110, 40, 3.5, '#fff', 0.2);
  },
  // Castillo de Lavandería: torres con tejados cónicos, sábanas al viento y burbujas
  castillo() {
    let s = defs('c', [[0, '#7f9cff'], [0.6, '#c4d2ff'], [1, '#f0ecff']]);
    s += cloud(28, 18, 1, '#fff', 'cd1') + cloud(130, 26, 0.75, '#fff', 'cd2');
    s += `<rect y="82" width="${W}" height="18" fill="#9fe0f4"/><g class="wv">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<circle cx="${i * 22 - 6}" cy="84" r="5.5" fill="#d8f8ff"/><circle cx="${i * 22 + 5}" cy="90" r="4" fill="#fff" opacity=".8"/>`).join('')}</g>`;
    s += `<g class="bob"><rect x="56" y="42" width="48" height="42" fill="#c4d0ea"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="${56 + i * 10}" y="36" width="7" height="8" fill="#c4d0ea"/>`).join('')}`;
    for (let r = 0; r < 4; r++) s += `<path d="M56 ${48 + r * 10}h48" stroke="#a8b6d6" stroke-width="1"/>`;
    s += `<path d="M72 84V68a8 8 0 0 1 16 0V84z" fill="#4a3a8a"/><rect x="76" y="52" width="8" height="10" rx="4" fill="#ffe58a"/>`;
    [[36, '#7b8cf0'], [124, '#ff9ec8']].forEach(([x, c]) => { s += `<rect x="${x - 10}" y="40" width="20" height="44" fill="#aebfe0"/><path d="M${x - 13} 42L${x} 14L${x + 13} 42z" fill="${c}"/><rect x="${x - 3}" y="52" width="6" height="9" rx="3" fill="#ffe58a"/><rect x="${x - 3}" y="68" width="6" height="9" rx="3" fill="#4a3a8a"/><rect x="${x - 0.8}" y="4" width="1.8" height="11" fill="#4a2a6b"/><path class="flag" d="M${x + 1} 5h10l-3 3l3 3H${x + 1}z" fill="#ff5a7a"/>`; });
    s += `<path d="M46 44Q80 56 114 44" stroke="#8a7ab8" stroke-width="1.2" fill="none"/>${[['#ff9ec8', 58], ['#fff', 68], ['#9fe8d0', 80], ['#ffe27a', 92], ['#fff', 102]].map(([c, x], i) => `<path class="sw" style="animation-delay:${i * 0.2}s" d="M${x} ${48 + Math.sin(x) * 0 + (x > 80 ? 0 : 1)}l0 8h-6z" fill="${c}" opacity=".9"/>`).join('')}</g>`;
    s += [[14, 70, 6, 0], [150, 58, 5, 0.8], [96, 24, 4, 1.4], [20, 40, 4, 0.4], [60, 10, 3.5, 1.1]].map(([x, y, r, d]) => `<g class="bub" style="animation-delay:${d}s"><circle cx="${x}" cy="${y}" r="${r}" fill="#e8fbff" fill-opacity=".45" stroke="#fff" stroke-width="1.2"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.22}" fill="#fff"/></g>`).join('');
    return s + sparkle(72, 28, 3, '#fff', 0.5);
  },
  // Ciudad Nube: arcoíris, nubes con cara, estrella y torre de algodón
  nube() {
    let s = defs('n', [[0, '#4f93ff'], [0.65, '#a9cbff'], [1, '#ffe8a8']]);
    s += `<g class="rb">${['#ff5a5a', '#ff9a3a', '#ffd23f', '#5fd870', '#4aa8ff', '#b06bff'].map((c, i) => `<path d="M${22 + i * 3.6} 74A${58 - i * 3.6} ${58 - i * 3.6} 0 0 1 ${138 - i * 3.6} 74" stroke="${c}" stroke-width="4" fill="none"/>`).join('')}</g>`;
    s += `<g class="bob"><g fill="#fff"><circle cx="80" cy="30" r="10"/><circle cx="72" cy="42" r="12"/><circle cx="90" cy="42" r="12"/><circle cx="80" cy="54" r="14"/><circle cx="66" cy="62" r="11"/><circle cx="94" cy="62" r="11"/></g><path d="M80 12l6 10h-12z" fill="#cfe0ff"/><circle cx="80" cy="8" r="3" fill="#ffd23f"/><g fill="#9ab4e8" opacity=".5"><circle cx="72" cy="46" r="8"/><circle cx="90" cy="58" r="8"/></g><circle cx="76" cy="36" r="1.8" fill="#4a2a6b"/><circle cx="85" cy="36" r="1.8" fill="#4a2a6b"/><path d="M77 40q3 3 6 0" stroke="#4a2a6b" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="73" cy="39" r="2" fill="#ffb3c8" opacity=".8"/><circle cx="88" cy="39" r="2" fill="#ffb3c8" opacity=".8"/></g>`;
    s += `<g fill="#fff"><ellipse cx="22" cy="84" rx="30" ry="12"/><ellipse cx="60" cy="90" rx="30" ry="13"/><ellipse cx="108" cy="90" rx="32" ry="13"/><ellipse cx="146" cy="84" rx="26" ry="12"/></g><g fill="#e0ecff"><ellipse cx="40" cy="95" rx="24" ry="6"/><ellipse cx="124" cy="96" rx="26" ry="6"/></g>`;
    s += cloud(24, 24, 0.9, '#fff', 'cd1') + cloud(132, 18, 0.8, '#fff', 'cd2');
    s += `<g class="spin" style="transform-origin:140px 46px"><path fill="#ffd23f" stroke="#ffb300" stroke-width="1" d="M140 36l3 7l8 .6l-6 5l2 8l-7-4l-7 4l2-8l-6-5l8-.6z"/></g>`;
    return s + sparkle(24, 52, 3.5, '#fff', 0.2) + sparkle(110, 20, 3, '#fff', 0.9) + sparkle(50, 14, 2.5, '#fff', 0.5);
  },
  // Barrio Halloween: luna enorme, calabaza con dientes encendida, casas embrujadas y murciélagos
  halloween() {
    let s = defs('h', [[0, '#4a2a98'], [0.5, '#a56ee0'], [1, '#ff9a5a']]);
    s += [[16, 12, 1.2, 0], [50, 22, 1, 0.6], [100, 10, 1.3, 1.1], [150, 30, 1, 0.3], [128, 50, 1, 0.9], [30, 44, 0.9, 1.4]].map(([x, y, r, d]) => `<circle class="tw" style="animation-delay:${d}s" cx="${x}" cy="${y}" r="${r}" fill="#fff6c8"/>`).join('');
    s += `<circle cx="120" cy="30" r="22" fill="#fff0a8" opacity=".25"/><circle cx="120" cy="30" r="16" fill="#fff2b0"/><circle cx="114" cy="26" r="3" fill="#f0d880"/><circle cx="126" cy="36" r="2.4" fill="#f0d880"/><circle cx="125" cy="22" r="1.8" fill="#f0d880"/>`;
    s += `<path d="M0 66Q30 50 60 64T120 60T160 64V100H0Z" fill="#6a3fa0"/>`;
    s += `<g fill="#3a2060"><rect x="6" y="48" width="22" height="30"/><path d="M3 49L17 30L31 49z"/><rect x="128" y="44" width="26" height="34"/><path d="M125 45L141 24L157 45z"/><rect x="136" y="26" width="3" height="10"/></g><g fill="#ffb02a" class="fl2"><rect x="11" y="56" width="5" height="7" rx="1"/><rect x="19" y="64" width="5" height="7" rx="1"/><rect x="133" y="52" width="6" height="8" rx="1"/><rect x="144" y="62" width="6" height="8" rx="1"/></g>`;
    s += `<rect y="82" width="${W}" height="18" fill="#4a2a78"/><path d="M0 86h160" stroke="#ff9a3a" stroke-width="2" opacity=".6"/>`;
    s += `<g class="bob"><rect x="78" y="22" width="5" height="12" rx="2" fill="#4aa04a" transform="rotate(8 80 30)"/><ellipse cx="80" cy="60" rx="34" ry="26" fill="#ff8a1f"/><ellipse cx="62" cy="60" rx="14" ry="26" fill="#ff9a35"/><ellipse cx="98" cy="60" rx="14" ry="26" fill="#ff9a35"/><ellipse cx="80" cy="60" rx="9" ry="26" fill="#ffa84a"/><path d="M46 52Q80 34 114 52" stroke="#e06a00" stroke-width="1.5" fill="none" opacity=".4"/><g class="glow"><path d="M60 52l10 -4l2 10z" fill="#ffe040"/><path d="M100 52l-10 -4l-2 10z" fill="#ffe040"/><path d="M80 58l5 7h-10z" fill="#ffe040"/><path d="M58 70l8 4l6 -4l8 5l8 -5l6 4l8 -4l-3 9q-24 8 -42 0z" fill="#ffe040"/></g></g>`;
    s += `<g class="fly1"><path d="M30 24q-5 -6 -10 -2q3 1 4 4q-3 -1 -6 1q6 1 8 5q2 -4 4 -3z" fill="#2a1450" transform="scale(1.2)"/></g><g class="fly2"><path d="M96 30q-5 -6 -10 -2q3 1 4 4q-3 -1 -6 1q6 1 8 5q2 -4 4 -3z" fill="#2a1450"/></g>`;
    s += `<g class="bob2"><path d="M20 94v-14a8 8 0 0 1 16 0v14l-3 -3l-2.7 3l-2.7 -3l-2.7 3l-2.7 -3z" fill="#fff" opacity=".95"/><circle cx="25" cy="82" r="1.5" fill="#2a1450"/><circle cx="31" cy="82" r="1.5" fill="#2a1450"/><ellipse cx="28" cy="87" rx="2" ry="2.4" fill="#2a1450"/></g>`;
    return s;
  },
};
export function citySVG(id) { const f = ART[id]; return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${f ? f() : ''}</svg>`; }
export const CITY_ICON = { muebl: '🏛️', puerto: '🧁', jungla: '🧱', castillo: '🏰', nube: '☁️', halloween: '🎃' };
