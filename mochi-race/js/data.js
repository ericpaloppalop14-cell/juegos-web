// ======================================================================
//  MOCHI RACE · datos del juego (personajes, rutas urbanas, objetos, peatones)
//  El nombre del juego se cambia SOLO aquí (CONFIG.title).
// ======================================================================
export const CONFIG = {
  title: 'Mochi Race',       // nombre del juego (se muestra en título, pestaña y PWA)
  subtitle: '¡Carreras locas por la ciudad gelatina!',
  laps: 2,                      // vueltas por carrera (v3: circuitos de ~2 km)
  racers: 6,                    // corredores por carrera (online: humanos + bots hasta completar)
  maxOnline: 6,                 // jugadores humanos máximos por sala
  peerPrefix: 'mochicalles-v1-', // prefijo de las salas en el broker público de PeerJS
  points: [10, 8, 6, 4, 2, 1],
};

// stats 1..5: vel (punta), acel, manejo, peso
export const CHARS = [
  { id: 'mochi', name: 'Mochi', color: '#ff9cc8', ears: 'bunny', inner: 'bubbles', vehicle: 'teacup', vname: 'Taza Saltarina',
    stats: { vel: 3, acel: 3, man: 3, peso: 3 }, desc: 'Equilibrada en todo. ¡La de siempre!', unlock: null },
  { id: 'tiovivo', name: 'Tiovivo', color: '#7ee3c4', ears: 'bear', acc: 'flag', inner: 'carousel', vehicle: 'carousel', vname: 'Tiovivo Giratorio',
    stats: { vel: 3, acel: 4, man: 3, peso: 2 }, desc: 'Arranca rápido y no deja de dar vueltas.', unlock: null },
  { id: 'atomo', name: 'Átomo', color: '#9fc3ff', ears: 'antenna', inner: 'atom', vehicle: 'atom', vname: 'Núcleo Eléctrico',
    stats: { vel: 2, acel: 5, man: 4, peso: 1 }, desc: 'Ligerísimo y nervioso. Acelera como un rayo.', unlock: null },
  { id: 'cosmo', name: 'Cosmo', color: '#b9a2f7', acc: 'ring', inner: 'solar', vehicle: 'planet', vname: 'Miniplaneta Anillado',
    stats: { vel: 4, acel: 2, man: 3, peso: 4 }, desc: 'Lento al salir, imparable en las rectas.', unlock: null },
  { id: 'copito', name: 'Copito', color: '#e8f4ff', acc: 'beanie', inner: 'snow', vehicle: 'sled', vname: 'Trineo Bola de Nieve',
    stats: { vel: 3, acel: 3, man: 5, peso: 2 }, desc: 'Gira como nadie, incluso sobre hielo.', unlock: null },
  { id: 'burbuja', name: 'Burbuja', color: '#8fe3f0', ears: 'fins', inner: 'aquarium', vehicle: 'fishbowl', vname: 'Pecera con Aletas',
    stats: { vel: 3, acel: 4, man: 4, peso: 2 }, desc: 'Ágil y escurridiza como un pez.', unlock: null },
  { id: 'lava', name: 'Lava', color: '#ffb36b', acc: 'lampcap', inner: 'lava', vehicle: 'rocket', vname: 'Cohete Lámpara de Lava',
    stats: { vel: 5, acel: 2, man: 2, peso: 3 }, desc: 'La punta más alta. Cuesta domarlo.', unlock: null },
  { id: 'tictac', name: 'Tictac', color: '#ffd98a', ears: 'bear', acc: 'key', inner: 'gears', vehicle: 'clock', vname: 'Reloj con Ruedas',
    stats: { vel: 3, acel: 3, man: 3, peso: 5 }, desc: 'Pesado y puntual: aparta a todo el mundo.', unlock: null },
  { id: 'trueno', name: 'Trueno', color: '#a9b4d6', ears: 'horns', inner: 'storm', vehicle: 'cloud', vname: 'Nube de Tormenta',
    stats: { vel: 4, acel: 3, man: 3, peso: 3 }, desc: 'Rápido y eléctrico. Truena al meter turbo.', unlock: null },
  { id: 'disco', name: 'Disco', color: '#ff8fd8', ears: 'cat', acc: 'shades', inner: 'disco', vehicle: 'discoball', vname: 'Bola de Discoteca',
    stats: { vel: 4, acel: 4, man: 3, peso: 2 }, desc: 'La fiesta sobre ruedas. ¡Que no pare!', unlock: null },
];

// Objetos
export const ITEMS = {
  seta:   { name: 'Seta Gigante',      icon: '🍄', hint: '¡Hazte enorme y chafa a los demás!' },
  turbo:  { name: 'Turbo Arcoíris',    icon: '🌈', hint: '¡Acelerón!' },
  osito:  { name: 'Osito Rebotón',     icon: '🧸', hint: 'Lánzalo hacia delante: rebota en las paredes' },
  misil:  { name: 'Misil de Caramelo', icon: '🍭', hint: 'Persigue al que va delante' },
  charco: { name: 'Charco de Gelatina',icon: '💧', hint: 'Déjalo detrás: ¡resbalan!' },
  escudo: { name: 'Escudo Burbuja',    icon: '🫧', hint: 'Te protege de un golpe' },
  iman:   { name: 'Imán',              icon: '🧲', hint: 'Te arrastra hacia el de delante' },
  nube:   { name: 'Nube Estrellada',   icon: '✨', hint: 'Deslumbra a todos los que van delante' },
  triple: { name: 'Triple Gominola',   icon: '🍬', hint: 'Tres ositos en abanico hacia delante' },
  bomba:  { name: 'Bomba de Gelatina', icon: '🟢', hint: 'Lánzala por delante: ¡explota y salpica!' },
  rayo:   { name: 'Rayo Chiquitín',    icon: '⚡', hint: 'Encoge y frena a todos los de delante' },
  nata:   { name: 'Nata Pegajosa',     icon: '🍦', hint: 'Llena de nata la pantalla de los dos de delante' },
  chupa:  { name: 'Chupa-Turbo',       icon: '🌀', hint: 'Roba el turbo del rival más cercano y llena el tuyo' },
};
export const ITEM_KEYS = Object.keys(ITEMS);
// pesos por posición: [delante, mitad, detrás]
export const ITEM_W = {
  seta:   [0, 1, 4],
  turbo:  [1, 3, 3],
  osito:  [4, 3, 0.5],
  misil:  [0.3, 2, 3],
  charco: [4, 2, 0.3],
  escudo: [3, 2, 0.5],
  iman:   [0, 2, 3],
  nube:   [0, 1, 2.5],
  triple: [2, 3, 1.5],
  bomba:  [2, 2.5, 1.5],
  rayo:   [0, 0.4, 2],
  nata:   [0.3, 2.5, 2],
  chupa:  [1, 2, 2],
};

// ---------------- Rutas urbanas ----------------
// poly: vértices de la calle [x, z, altura, anchoCalzada, radioEsquina?]; se redondean con fillet()
// feats: t = fracción de la vuelta (0..1)
//   boxes · boost(off) · ramp · shortcut(t2,label) = callejón · cross(kind) = paso de peatones con semáforo
//   jay(kind) = peatón que cruza a mitad de calle (con señal de aviso) · plaza = rotonda/fuente en la curva
export const PED_KINDS = {
  familia: 'Familia gelatina', caracol: 'Caracol con casa', helado: 'Helado paseando a su perro-donut',
  ositos: 'Desfile de ositos de goma', jirafa: 'Jirafa-piruleta', camarero: 'Camarero de tartas voladoras',
};
function fillet(poly, rDef = 95, rMin = 70) {
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const A = poly[(i + n - 1) % n], V = poly[i], B = poly[(i + 1) % n], r = Math.max(rMin, V[4] ?? rDef);
    const ux = A[0] - V[0], uz = A[1] - V[1], vx = B[0] - V[0], vz = B[1] - V[1];
    const lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz);
    const cos = (ux * vx + uz * vz) / (lu * lv), phi = Math.acos(Math.max(-1, Math.min(1, cos)));
    if (phi > 2.8 || r <= 0) { out.push([V[0], V[1], V[2], V[3]]); continue; }
    const d = Math.min(r / Math.tan(phi / 2), lu * 0.45, lv * 0.45);
    const P1 = [V[0] + ux / lu * d, V[1] + uz / lu * d], P2 = [V[0] + vx / lv * d, V[1] + vz / lv * d];
    const q = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    for (const t of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]) out.push([q(P1[0], V[0], P2[0], t), q(P1[1], V[1], P2[1], t), V[2], V[3]]);
  }
  return out;
}
export const CUPS = [
  { id: 'gominola', name: 'Barrio Gominola', short: 'Gominola', color: '#ff8fc0', trophy: '#ff7fb6', track: 'Calles de caramelo · mañana', unlock: null,
    theme: 'candy', city: true, sky: ['#7cc8ff', '#ffe0f0', '#ffd0e8'], fog: '#ffe3f1', ground: '#ffe9d6', ground2: '#ffd2e6', road: '#c9b6d9', walk: '#fff1f7', curbA: '#ff7fb6', curbB: '#ffffff',
    bld: ['#ff9ec7', '#ffd36b', '#9fe3c9', '#c9b2ff', '#ffb38a', '#8fe3f0'], grip: 1, grav: 1, music: { bpm: 134, root: 60, scale: 'major' },
    poly: [[0, 0, 0, 16], [150, 0, 0, 16], [190, -30, 1, 15, 14], [190, -110, 3, 14], [130, -150, 4, 14, 18], [60, -150, 4, 14], [40, -110, 3, 13, 10], [-20, -110, 3, 13, 10], [-40, -160, 5, 14], [-140, -160, 6, 15], [-170, -90, 4, 15, 20], [-140, -30, 1, 15, 22]],
    feats: [{ t: 0.05, type: 'boxes' }, { t: 0.36, type: 'boxes' }, { t: 0.62, type: 'boxes' }, { t: 0.86, type: 'boxes' },
      { t: 0.15, type: 'boost', off: 0 }, { t: 0.55, type: 'boost', off: -3 }, { t: 0.79, type: 'boost', off: 3 }, { t: 0.7, type: 'ramp' },
      { t: 0.1, type: 'cross', kind: 'familia' }, { t: 0.3, type: 'cross', kind: 'ositos' }, { t: 0.58, type: 'jay', kind: 'jirafa' }, { t: 0.9, type: 'cross', kind: 'camarero' }, { t: 0.22, type: 'plaza' }] },
  { id: 'girasol', name: 'Mercado Girasol', short: 'Girasol', color: '#ffc23d', trophy: '#ffc928', track: 'Puestos y cuestas · atardecer', unlock: null,
    theme: 'sunflower', city: true, sky: ['#5a7ae0', '#ffb36b', '#ff7f8f'], fog: '#ffc79a', ground: '#f3dcb0', ground2: '#ffe680', road: '#b9a48f', walk: '#fff3d6', curbA: '#ffbf2a', curbB: '#ffffff',
    bld: ['#ffcf5a', '#ff9f6a', '#fff0c4', '#9fd46a', '#ffb3c9', '#f3a85a'], grip: 1, grav: 1, music: { bpm: 126, root: 62, scale: 'major' },
    poly: [[0, 0, 0, 17], [220, 0, 0, 17], [260, 40, 3, 15, 20], [230, 100, 8, 14, 16], [160, 110, 10, 14], [120, 160, 10, 13, 12], [40, 160, 7, 13, 12], [0, 120, 5, 14], [-90, 140, 3, 15, 18], [-170, 90, 1, 15, 24], [-160, 20, 0, 16, 24]],
    feats: [{ t: 0.04, type: 'boxes' }, { t: 0.33, type: 'boxes' }, { t: 0.6, type: 'boxes' }, { t: 0.82, type: 'boxes' },
      { t: 0.12, type: 'boost', off: -4 }, { t: 0.5, type: 'boost', off: 3 }, { t: 0.93, type: 'boost', off: 0 }, { t: 0.42, type: 'ramp' },
      { t: 0.08, type: 'cross', kind: 'caracol' }, { t: 0.26, type: 'jay', kind: 'camarero' }, { t: 0.48, type: 'cross', kind: 'helado' }, { t: 0.74, type: 'cross', kind: 'familia' }, { t: 0.88, type: 'jay', kind: 'ositos' }, { t: 0.82, type: 'plaza' }] },
  { id: 'helada', name: 'Puerto Helado', short: 'Helado', color: '#6fd3ff', trophy: '#8fe3ff', track: 'Muelles y puente · aurora', unlock: null,
    theme: 'ice', city: true, sky: ['#1a2a6a', '#7f9fff', '#ffb0d8'], fog: '#a8b8f0', ground: '#e8f2ff', ground2: '#cfe4ff', road: '#8fa6c9', walk: '#f4f9ff', curbA: '#ff8fc0', curbB: '#ffffff',
    bld: ['#bfe6ff', '#ffd0e6', '#ffffff', '#c9b2ff', '#9fe3d9', '#ffe7a8'], grip: 0.8, grav: 1, music: { bpm: 120, root: 57, scale: 'minor' }, aurora: true,
    poly: [[0, 0, 0, 16], [170, 0, 2, 16], [230, -20, 8, 15, 14], [290, 0, 9, 15, 14], [300, 80, 5, 15], [240, 130, 2, 14, 18], [150, 120, 1, 14], [90, 170, 3, 13, 12], [0, 150, 2, 14], [-80, 150, 1, 15, 18], [-130, 70, 0, 15, 22], [-90, 10, 0, 16, 20]],
    feats: [{ t: 0.05, type: 'boxes' }, { t: 0.3, type: 'boxes' }, { t: 0.58, type: 'boxes' }, { t: 0.84, type: 'boxes' },
      { t: 0.11, type: 'boost', off: 0 }, { t: 0.44, type: 'boost', off: 3 }, { t: 0.9, type: 'boost', off: -3 }, { t: 0.255, type: 'ramp' },
      { t: 0.07, type: 'cross', kind: 'ositos' }, { t: 0.4, type: 'cross', kind: 'caracol' }, { t: 0.68, type: 'jay', kind: 'helado' }, { t: 0.78, type: 'cross', kind: 'jirafa' }, { t: 0.95, type: 'jay', kind: 'familia' }, { t: 0.5, type: 'plaza' }] },
  { id: 'tormenta', name: 'Avenida Neón', short: 'Neón', color: '#ff5fd2', trophy: '#ff5fd2', track: 'Ciudad de noche · neones', unlock: null,
    theme: 'storm', city: true, night: true, sky: ['#070420', '#3a1f7a', '#ff4fa8'], fog: '#2a1450', ground: '#2a2050', ground2: '#3a2a66', road: '#3a3366', walk: '#5a4a8a', curbA: '#ff5fd2', curbB: '#5ff5ff',
    bld: ['#3a2a6a', '#2a3a7a', '#4a2a6a', '#2a2a5a', '#5a2a7a', '#203a6a'], grip: 1, grav: 1, music: { bpm: 140, root: 57, scale: 'minor' }, aurora: true,
    poly: [[0, 0, 0, 16], [140, 0, 0, 16, 12], [140, -90, 2, 15, 12], [60, -90, 2, 14, 12], [60, -170, 4, 14, 14], [-60, -170, 4, 14, 14], [-60, -110, 2, 13, 10], [-120, -110, 2, 13, 10], [-160, -60, 1, 15, 20], [-120, 0, 0, 16, 16]],
    feats: [{ t: 0.05, type: 'boxes' }, { t: 0.3, type: 'boxes' }, { t: 0.55, type: 'boxes' }, { t: 0.8, type: 'boxes' },
      { t: 0.12, type: 'boost', off: 0 }, { t: 0.42, type: 'boost', off: 3 }, { t: 0.68, type: 'boost', off: -3 }, { t: 0.5, type: 'ramp' },
      { t: 0.09, type: 'cross', kind: 'camarero' }, { t: 0.22, type: 'jay', kind: 'familia' }, { t: 0.46, type: 'cross', kind: 'jirafa' }, { t: 0.62, type: 'cross', kind: 'ositos' }, { t: 0.92, type: 'jay', kind: 'caracol' }, { t: 0.82, type: 'plaza' }] },
];
// v3: circuitos 2,3 veces más grandes, calzada un 35 % más ancha y curvas amplias (radio mínimo 70 m)
export const TRACK_SCALE = 2.05, ROAD_WIDEN = 1.35;
for (const c of CUPS) { c.poly = c.poly.map(([x, z, y, w, r]) => [x * TRACK_SCALE, z * TRACK_SCALE, y * 1.6, w * ROAD_WIDEN, r != null ? r * TRACK_SCALE : undefined]); c.pts = fillet(c.poly); }
export const RACES_PER_CUP = 1;
