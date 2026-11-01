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

  // Arrecife Burbujeante: casa caracola, corales, peces y burbujas
  mar() {
    let s = defs('mr', [[0, '#1ba0e0'], [0.55, '#52d8e8'], [1, '#b0f6e4']]);
    s += `<g opacity=".22" fill="#fff"><path d="M20 0h14l30 78H34z"/><path d="M82 0h12l34 78H96z"/></g>`;
    s += `<rect y="76" width="${W}" height="24" fill="#ffe0a0"/><path d="M0 78q20 -6 40 0t40 0t40 0t40 0" stroke="#f0c070" stroke-width="3" fill="none"/>`;
    s += `<g class="sway"><path d="M12 80q-6 -16 0 -30q6 14 0 30z" fill="#2fc070"/><path d="M20 82q-5 -12 1 -24q5 12 -1 24z" fill="#3fe08a"/></g><g class="sway"><path d="M142 82q-6 -16 0 -32q6 16 0 32z" fill="#2fc070"/><path d="M150 82q-4 -10 1 -20q4 10 -1 20z" fill="#3fe08a"/></g>`;
    s += `<g class="bob"><path d="M80 80c-34 0 -40 -34 -14 -50c20 -12 46 -4 44 18c-1 14 -16 16 -24 8c-6 -6 -2 -16 6 -14" fill="#ffb0cc"/><path d="M80 80c-34 0 -40 -34 -14 -50" stroke="#ff8ab8" stroke-width="4" fill="none"/><path d="M66 48q10 -12 26 -6M60 60q14 -16 34 -8" stroke="#ffe0ee" stroke-width="3" fill="none" opacity=".9"/><path d="M92 78a10 14 0 0 1 -20 0v-6a10 12 0 0 1 20 0z" fill="#6a3a8a"/><circle cx="88" cy="74" r="1.4" fill="#ffd23f"/><circle cx="106" cy="44" r="6" fill="#fff"/><circle cx="107" cy="44" r="3" fill="#2a1840"/><circle cx="116" cy="38" r="5" fill="#fff"/><circle cx="117" cy="38" r="2.4" fill="#2a1840"/></g>`;
    s += `<g class="bob2"><path d="M40 84l4 -12l4 12z" fill="#ff6b8e"/><path d="M46 84l5 -16l5 16z" fill="#ffa63a"/><path d="M52 84l4 -10l4 10z" fill="#c084ff"/></g><g class="bob"><circle cx="128" cy="78" r="4" fill="#ff6b8e"/><path d="M128 78m-9 0l4 -4l-4 -1m9 5l4 -4l4 1" stroke="#ff6b8e" stroke-width="2" fill="none"/></g>`;
    s += `<g class="fly1"><path d="M30 34q10 -8 20 0q-10 8 -20 0zM30 34l-8 -6v12z" fill="#ffb02a"/><circle cx="44" cy="33" r="1.6" fill="#2a1840"/></g><g class="fly2"><path d="M110 22q8 -6 16 0q-8 6 -16 0zM126 22l7 -5v10z" fill="#ff7ac0"/><circle cx="114" cy="21" r="1.4" fill="#2a1840"/></g>`;
    [[18, 60, 3], [24, 44, 2], [140, 62, 3.4], [146, 40, 2], [100, 28, 2.4], [56, 22, 2.6]].forEach(([x, y, r], i) => { s += `<circle class="bub" style="animation-delay:${i * 0.5}s" cx="${x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity=".35" stroke="#fff" stroke-width="1"/>`; });
    return s + sparkle(70, 16, 3, '#fff', 0.4);
  },
  // Desierto de Caramelo: pirámide de gominola, cactus de menta y dunas de azúcar
  desierto() {
    let s = defs('ds', [[0, '#ff9650'], [0.55, '#ffc27a'], [1, '#fff0b4']]);
    s += `<circle cx="126" cy="26" r="24" fill="#fff6c0" opacity=".4"/><circle cx="126" cy="26" r="15" fill="#fffbd0"/>` + cloud(30, 22, 0.9, '#ffe6f2', 'cd1');
    s += `<path d="M0 70Q30 52 64 66T130 58T160 64V100H0Z" fill="#ffd890"/><path d="M0 82Q40 70 80 82T160 78V100H0Z" fill="#f4b868"/>`;
    s += `<g class="bob">` + ['#4aa8ff', '#b06bff', '#3fe08a', '#ffe66a', '#ffb02a', '#ff4a6e'].map((c, i) => { const w = 62 - i * 9, y = 74 - i * 9; return `<rect x="${80 - w / 2}" y="${y - 9}" width="${w}" height="10" rx="4" fill="${c}"/><rect x="${80 - w / 2 + 3}" y="${y - 8}" width="${w - 6}" height="2.4" rx="1" fill="#fff" opacity=".45"/>`; }).join('') + `<path d="M80 12l-3 6h6z" fill="#ffd23f"/><rect x="73" y="66" width="14" height="8" rx="4" fill="#5a2a0a"/></g>`;
    s += `<g class="sway"><rect x="16" y="56" width="7" height="30" rx="3.5" fill="#4fd8a0"/><rect x="6" y="64" width="12" height="5" rx="2.5" fill="#4fd8a0"/><rect x="6" y="56" width="5" height="12" rx="2.5" fill="#4fd8a0"/><rect x="21" y="68" width="12" height="5" rx="2.5" fill="#4fd8a0"/><rect x="28" y="58" width="5" height="14" rx="2.5" fill="#4fd8a0"/><circle cx="19.5" cy="54" r="3.6" fill="#ff4a8c"/></g>`;
    s += `<g class="bob2"><rect x="132" y="62" width="4" height="26" rx="2" fill="#fff"/><path d="M134 62a8 8 0 0 1 8 8" stroke="#ff3d5e" stroke-width="4" fill="none"/><path d="M134 72l8 -2M134 80l9 -2" stroke="#ff3d5e" stroke-width="3"/></g>`;
    s += [[44, 30], [100, 14], [150, 54], [14, 40]].map(([x, y], i) => `<rect class="tw" style="animation-delay:${i * 0.4}s" x="${x}" y="${y}" width="7" height="2.6" rx="1.3" fill="${['#ff4a8c', '#4aa8ff', '#3fe08a', '#fff'][i]}" transform="rotate(${i * 40} ${x} ${y})"/>`).join('');
    return s + `<circle cx="52" cy="90" r="3.6" fill="#ff4a6e"/><circle cx="62" cy="92" r="3.6" fill="#b06bff"/><circle cx="104" cy="92" r="3.6" fill="#3fe08a"/>` + sparkle(110, 44, 3, '#fff', 0.6);
  },
  // Polo Iglú: iglú gigante, muñeco de nieve, pingüino y aurora
  polo() {
    let s = defs('pl', [[0, '#6ab8ff'], [0.55, '#b4e0ff'], [1, '#f2fbff']]);
    s += `<path d="M0 24Q30 8 60 22T120 16T160 24V46Q130 34 100 46T40 40T0 48Z" fill="#8affd0" opacity=".38" class="glow"/><path d="M0 34Q40 20 80 34T160 30V50Q120 40 80 52T0 46Z" fill="#ff9ae0" opacity=".32" class="glow"/>`;
    s += `<rect y="74" width="${W}" height="26" fill="#f4fbff"/><path d="M0 76q26 -8 52 0t52 0t56 0v24H0z" fill="#fff"/><path d="M0 90q30 -6 60 0t60 0t40 0" stroke="#d0e8ff" stroke-width="3" fill="none"/>`;
    s += `<g class="bob"><path d="M42 80a38 38 0 0 1 76 0z" fill="#fff"/><path d="M42 80a38 38 0 0 1 76 0" stroke="#bcd8f4" stroke-width="2" fill="none"/>` + [[56, 62], [80, 56], [104, 62], [48, 74], [68, 70], [92, 70], [112, 74]].map(([x, y]) => `<path d="M${x - 10} ${y}h20" stroke="#c4def6" stroke-width="2"/>`).join('') + `<path d="M80 44v14M66 50l6 12M94 50l-6 12" stroke="#c4def6" stroke-width="2"/><rect x="68" y="66" width="24" height="14" rx="9" fill="#2a3a6a"/><rect x="70" y="68" width="20" height="12" rx="8" fill="#ffe27a" opacity=".7"/></g>`;
    s += `<g class="bob2"><circle cx="138" cy="74" r="12" fill="#fff" stroke="#d0e8ff" stroke-width="1.5"/><circle cx="138" cy="56" r="8.5" fill="#fff" stroke="#d0e8ff" stroke-width="1.5"/><circle cx="135" cy="54" r="1.3" fill="#2a1840"/><circle cx="141" cy="54" r="1.3" fill="#2a1840"/><path d="M138 56l7 2l-7 1z" fill="#ff8a1f"/><path d="M130 62q8 4 16 0" stroke="#ff3d5e" stroke-width="3" fill="none"/><rect x="132" y="43" width="12" height="7" fill="#2a1840"/><rect x="129" y="49" width="18" height="2.6" rx="1" fill="#2a1840"/></g>`;
    s += `<g class="bob"><ellipse cx="22" cy="84" rx="9" ry="12" fill="#2a3a6a"/><ellipse cx="22" cy="86" rx="5.4" ry="8.6" fill="#fff"/><circle cx="20" cy="76" r="1.2" fill="#fff"/><circle cx="24" cy="76" r="1.2" fill="#fff"/><path d="M22 78l5 2l-5 1z" fill="#ff8a1f"/><ellipse cx="17" cy="95" rx="4" ry="1.8" fill="#ff8a1f"/><ellipse cx="27" cy="95" rx="4" ry="1.8" fill="#ff8a1f"/></g>`;
    s += `<g class="sway"><path d="M150 82l8 -22l8 22z" fill="#2a9a6a" transform="translate(-12 4) scale(.8)"/></g>`;
    s += [[14, 20], [40, 12], [74, 18], [104, 8], [128, 26], [150, 12], [60, 40], [112, 40]].map(([x, y], i) => sparkle(x, y, 2.4 + (i % 3), '#fff', i * 0.3)).join('');
    return s;
  },
  // Selva Frutal: casa del árbol con piña, tucán y flores
  selva() {
    let s = defs('sv', [[0, '#34c8a0'], [0.55, '#98f0b4'], [1, '#fff6a8']]);
    s += `<g opacity=".25" fill="#fff"><path d="M30 0h12l28 70H46z"/><path d="M100 0h10l30 70h-16z"/></g><circle cx="130" cy="20" r="11" fill="#fff070"/>`;
    s += `<g class="sway"><path d="M12 90V46" stroke="#8a5a2a" stroke-width="5"/><path d="M12 46q-18 -4 -26 8M12 46q18 -6 26 4M12 46q-4 -16 -18 -18M12 46q6 -16 22 -16" stroke="#2fc070" stroke-width="5" fill="none" stroke-linecap="round" transform="translate(6 0)"/><circle cx="18" cy="50" r="3.4" fill="#ffe03a"/></g>`;
    s += `<rect y="78" width="${W}" height="22" fill="#4ac850"/><path d="M0 80q20 -6 40 0t40 0t40 0t40 0" stroke="#7ae870" stroke-width="3" fill="none"/>`;
    s += `<g class="bob"><path d="M80 24l-7 -14M80 24l0 -16M80 24l7 -14" stroke="#2fc070" stroke-width="5" stroke-linecap="round"/><ellipse cx="80" cy="54" rx="22" ry="28" fill="#ffc02a"/>` + [[70, 40], [80, 38], [90, 40], [64, 52], [74, 50], [86, 50], [96, 52], [68, 64], [80, 62], [92, 64]].map(([x, y]) => `<path d="M${x - 4} ${y}l4 4l4 -4" stroke="#d08a10" stroke-width="1.8" fill="none"/>`).join('') + `<rect x="73" y="62" width="14" height="18" rx="7" fill="#6a3a1a"/><circle cx="68" cy="48" r="4" fill="#bff3ff"/><circle cx="92" cy="48" r="4" fill="#bff3ff"/></g>`;
    s += `<g class="fly1"><ellipse cx="40" cy="28" rx="8" ry="6" fill="#2a2a3a"/><circle cx="35" cy="26" r="3.4" fill="#fff"/><circle cx="34" cy="26" r="1.4" fill="#2a1840"/><path d="M32 28l-14 3l14 3z" fill="#ff8a1f"/><path d="M32 30l-10 2l10 1z" fill="#ffe03a"/><path d="M48 30l8 5l-8 1z" fill="#1e6ab8"/></g>`;
    s += `<g class="bob2"><circle cx="128" cy="76" r="9" fill="#ff3d8c"/><circle cx="128" cy="76" r="4" fill="#ffe03a"/><path d="M128 85v8" stroke="#2fc070" stroke-width="3"/></g><g class="bob"><path d="M142 84a8 8 0 0 1 16 0z" fill="#ff4a6e"/><rect x="148" y="84" width="4" height="8" fill="#fff0d8"/></g>`;
    s += `<g class="bob"><path d="M30 92q6 -12 14 -4q-4 10 -14 4z" fill="#ffe03a"/></g>`;
    return s + sparkle(100, 30, 3, '#fff', 0.2);
  },
  // Ciudad Lunar: Saturno colosal, cohete, platillo y estrellas
  espacio() {
    let s = defs('es', [[0, '#4a2ae0'], [0.55, '#a060ff'], [1, '#ff9ae0']]);
    s += [[12, 12], [34, 28], [60, 10], [96, 20], [120, 8], [148, 24], [140, 44], [20, 52], [70, 36]].map(([x, y], i) => sparkle(x, y, 2 + (i % 3), '#fff', i * 0.25)).join('');
    s += `<path d="M0 74Q40 64 80 72T160 70V100H0Z" fill="#d8d0f0"/><path d="M0 86Q50 78 100 86T160 84V100H0Z" fill="#b8b0e0"/>` + [[24, 80, 9], [60, 88, 7], [120, 82, 10], [148, 92, 6]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.4}" fill="#a098d0"/><ellipse cx="${x + 1}" cy="${y + 0.8}" rx="${r * 0.7}" ry="${r * 0.26}" fill="#f0ecff"/>`).join('');
    s += `<g class="bob"><circle cx="80" cy="44" r="24" fill="#ffc86a"/><path d="M60 38q20 -6 40 0M58 48q22 -6 44 0" stroke="#ffa63a" stroke-width="4" fill="none"/><g class="spin" style="transform-origin:80px 44px"><ellipse cx="80" cy="44" rx="42" ry="10" fill="none" stroke="#ffe6a8" stroke-width="5" transform="rotate(-16 80 44)"/></g><circle cx="72" cy="40" r="4" fill="#fff"/><circle cx="73" cy="41" r="2" fill="#2a1840"/><circle cx="88" cy="40" r="4" fill="#fff"/><circle cx="89" cy="41" r="2" fill="#2a1840"/><path d="M73 52q7 6 14 0" stroke="#ff4a6e" stroke-width="2.6" fill="none"/></g>`;
    s += `<g class="bob2"><rect x="126" y="58" width="10" height="26" rx="5" fill="#fff"/><path d="M126 62q5 -16 10 0z" fill="#ff4a6e"/><circle cx="131" cy="70" r="2.6" fill="#bfe8ff"/><path d="M126 80l-5 8h5zM136 80l5 8h-5z" fill="#ff4a6e"/><path d="M128 84h6l-3 9z" fill="#ffa63a" class="fl2"/></g>`;
    s += `<g class="fly1"><ellipse cx="34" cy="30" rx="12" ry="4" fill="#b8b0d8"/><ellipse cx="34" cy="26" rx="6" ry="5" fill="#bfe8ff"/><circle cx="26" cy="31" r="1.3" fill="#ffe66a"/><circle cx="34" cy="32" r="1.3" fill="#ffe66a"/><circle cx="42" cy="31" r="1.3" fill="#ffe66a"/></g>`;
    return s;
  },
  // Villa Jersey: jersey-casa gigante, ovillo con ojos, agujas locas y suelo de punto
  jersey() {
    let s = defs('j', [[0, '#4cc4ff'], [0.55, '#b0eeff'], [1, '#fff0d0']]);
    s += cloud(34, 18, 0.9, '#fff', 'cd1') + cloud(130, 12, 0.7, '#fff', 'cd2');
    s += `<path d="M0 30q20 -14 40 0t40 0t40 0t40 0" stroke="#ff4a8c" stroke-width="3" fill="none" opacity=".7"/>`;
    s += `<rect y="74" width="${W}" height="26" fill="#ffb86a"/>` + Array.from({ length: 16 }, (_, i) => `<path d="M${i * 11 + 1} 78l4 8l4 -8M${i * 11 + 1} 90l4 8l4 -8" stroke="#ff8a3a" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('');
    s += `<g class="bob2"><line x1="22" y1="86" x2="62" y2="2" stroke="#2ad0c8" stroke-width="3.6" stroke-linecap="round"/><circle cx="62" cy="2" r="4.6" fill="#ffd23f"/><line x1="140" y1="86" x2="102" y2="6" stroke="#ffc02a" stroke-width="3.6" stroke-linecap="round"/><circle cx="102" cy="6" r="4.6" fill="#ff4a8c"/></g>`;
    s += `<g class="bob"><path d="M58 40Q80 52 102 40L112 52L106 82H54L48 52Z" fill="#ff3d5e"/><path d="M46 52L30 76q-2 4 3 6l8 -2l12 -22z" fill="#ff3d5e"/><path d="M114 52L130 76q2 4 -3 6l-8 -2l-12 -22z" fill="#ff3d5e"/><rect x="52" y="76" width="56" height="8" rx="3" fill="#fff0d8"/><ellipse cx="80" cy="41" rx="14" ry="6" fill="#fff0d8"/><ellipse cx="80" cy="41" rx="9" ry="3.4" fill="#5a2a4a"/>`;
    [66, 80, 94].forEach((x) => { s += `<path d="M${x} 52q4 4 0 8t0 8t0 8" stroke="#ffd0d8" stroke-width="2.6" fill="none" stroke-linecap="round"/>`; });
    s += `<circle cx="70" cy="46" r="0" fill="#fff"/></g>`;
    s += `<g class="bob2"><circle cx="24" cy="80" r="15" fill="#ff8ac8"/><path d="M10 76q14 -10 28 4M10 84q14 -10 28 0M18 68q14 4 12 24" stroke="#ffd0e8" stroke-width="2.4" fill="none"/><circle cx="19" cy="78" r="3.8" fill="#fff"/><circle cx="20" cy="79" r="1.9" fill="#2a1840"/><circle cx="30" cy="78" r="3.8" fill="#fff"/><circle cx="31" cy="79" r="1.9" fill="#2a1840"/><path d="M21 86q4 4 8 0" stroke="#2a1840" stroke-width="1.8" fill="none"/></g>`;
    s += `<g class="sway"><circle cx="136" cy="80" r="11" fill="#9be64a"/><path d="M127 76q9 -6 18 2M127 84q9 -6 18 0" stroke="#e4ffc0" stroke-width="2" fill="none"/><path d="M140 90q8 4 12 -2" stroke="#9be64a" stroke-width="2" fill="none"/></g>`;
    return s + sparkle(44, 40, 4, '#fff', 0) + sparkle(122, 30, 3, '#ffd23f', 0.8) + sparkle(78, 20, 3, '#ff4a8c', 1.4);
  },
  // Volcán Chocolatero: volcán en erupción, lava y brasas
  volcan() {
    let s = defs('vo', [[0, '#ff6a3a'], [0.55, '#ff9a4a'], [1, '#ffe090']]);
    s += `<g class="cd1"><circle cx="76" cy="14" r="9" fill="#b09090" opacity=".8"/><circle cx="88" cy="8" r="11" fill="#c0a8a8" opacity=".8"/><circle cx="102" cy="12" r="8" fill="#b09090" opacity=".75"/></g>`;
    s += `<path d="M0 100V70L28 56L54 70V100Z" fill="#6a3a3a"/><path d="M110 100V74L132 60L160 74V100Z" fill="#7a4444"/>`;
    s += `<g class="bob"><path d="M20 90L66 28H94L140 90Z" fill="#6a3434"/><path d="M62 34H98L94 28H66z" fill="#ff7a1f"/><ellipse cx="80" cy="29" rx="15" ry="4" fill="#ffd23f" class="glow"/><path d="M78 30q-3 14 -8 26q-4 12 -12 22" stroke="#ff7a1f" stroke-width="4" fill="none" stroke-linecap="round" class="glow"/><path d="M84 30q4 12 6 22q3 14 12 26" stroke="#ff9a2a" stroke-width="3.4" fill="none" stroke-linecap="round" class="glow"/><circle cx="70" cy="62" r="3.6" fill="#fff"/><circle cx="71" cy="63" r="1.8" fill="#2a1840"/><circle cx="90" cy="62" r="3.6" fill="#fff"/><circle cx="91" cy="63" r="1.8" fill="#2a1840"/><path d="M72 72q8 7 16 0" stroke="#ffd23f" stroke-width="2.6" fill="none"/></g>`;
    s += `<path d="M0 86q20 -8 40 0t40 0t40 0t40 0V100H0z" fill="#ff7a1f"/><g class="wv"><path d="M-20 90q10 -6 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0" stroke="#ffd23f" stroke-width="3" fill="none"/></g>`;
    [[60, 20, 3], [96, 14, 2.4], [74, 8, 2], [106, 24, 2.6], [50, 34, 2]].forEach(([x, y, r], i) => { s += `<circle class="bub" style="animation-delay:${i * 0.45}s" cx="${x}" cy="${y}" r="${r}" fill="#ffb02a"/>`; });
    s += `<g class="bob2"><path d="M130 84q4 -10 12 -6q4 6 -4 10z" fill="#ff2a2a"/><path d="M142 78l4 -3" stroke="#2aa84a" stroke-width="3"/></g><g class="bob"><circle cx="20" cy="88" r="5" fill="#ff7a1f"/><path d="M20 80l-4 5h8z" fill="#ff7a1f"/><circle cx="18.5" cy="88" r="1.2" fill="#2a1840"/><circle cx="22" cy="88" r="1.2" fill="#2a1840"/></g>`;
    return s;
  },
};
export function citySVG(id) { const f = ART[id]; return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${f ? f() : ''}</svg>`; }
export const CITY_ICON = { muebl: '🏛️', puerto: '🧁', jungla: '🧱', castillo: '🏰', nube: '☁️', halloween: '🎃', mar: '🐚', desierto: '🍬', polo: '🐧', selva: '🍍', espacio: '🪐', volcan: '🌋', jersey: '🧶' };
