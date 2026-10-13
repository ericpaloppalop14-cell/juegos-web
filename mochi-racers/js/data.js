// ======================================================================
//  MOCHI RACERS · datos del juego (personajes, copas, objetos)
//  El nombre del juego se cambia SOLO aquí (CONFIG.title).
// ======================================================================
export const CONFIG = {
  title: 'Mochi Racers',
  laps: 3,
  racers: 8,
  points: [15, 12, 10, 8, 6, 4, 2, 1],
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
    stats: { vel: 4, acel: 3, man: 3, peso: 3 }, desc: 'Rápido y eléctrico. Truena al derrapar.', unlock: { cup: 'galaxia', text: 'Consigue la Copa Galaxia' } },
  { id: 'disco', name: 'Disco', color: '#ff8fd8', ears: 'cat', acc: 'shades', inner: 'disco', vehicle: 'discoball', vname: 'Bola de Discoteca',
    stats: { vel: 4, acel: 4, man: 3, peso: 2 }, desc: 'La fiesta sobre ruedas. ¡Que no pare!', unlock: { cup: 'tormenta', text: 'Consigue la Copa Tormenta' } },
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
};

// ---------------- Copas y circuitos ----------------
// Puntos de control: [x, z, altura, anchoCalzada]
// feats: t = fracción de la vuelta (0..1)
export const CUPS = [
  { id: 'gominola', name: 'Copa Gominola', color: '#ff8fc0', trophy: '#ff7fb6', track: 'Avenida Gominola', unlock: null,
    theme: 'candy', sky: ['#9fd8ff', '#ffd6ec'], fog: '#ffe3f1', ground: '#bff2d6', ground2: '#ffd7ea', road: '#ffe3f0', curbA: '#ff7fb6', curbB: '#ffffff',
    grip: 1, grav: 1, music: { bpm: 132, root: 60, scale: 'major' },
    pts: [[0, 0, 0, 20], [140, 0, 0, 20], [220, -40, 2, 18], [260, -120, 6, 17], [225, -195, 8, 17], [155, -205, 8, 16], [120, -150, 6, 16], [150, -90, 4, 17], [100, -55, 2, 17], [40, -100, 4, 17], [-40, -95, 8, 17], [-110, -145, 12, 17], [-190, -125, 10, 18], [-225, -50, 6, 18], [-185, 20, 3, 19], [-100, 40, 0, 20]],
    feats: [
      { t: 0.07, type: 'boxes' }, { t: 0.3, type: 'boxes' }, { t: 0.6, type: 'boxes' }, { t: 0.86, type: 'boxes' }, { t: 0.12, type: 'boost', off: 0 }, { t: 0.48, type: 'boost', off: -3 }, { t: 0.8, type: 'boost', off: 3 }, { t: 0.18, type: 'ramp' }, { t: 0.66, type: 'ramp' }, { t: 0.93, type: 'ramp' }, { t: 0.29, type: 'shortcut', t2: 0.445, label: 'Atajo de regaliz' }, { t: 0.53, type: 'obstacle', kind: 'gumdrop' }, { t: 0.76, type: 'obstacle', kind: 'gumdrop' } ] },
  { id: 'girasol', name: 'Copa Girasol', color: '#ffd24a', trophy: '#ffc928', track: 'Campos de Girasol', unlock: null,
    theme: 'sunflower', sky: ['#8fd3ff', '#fff3c4'], fog: '#fff5d6', ground: '#a6e07c', ground2: '#ffe680', road: '#f3dcb0', curbA: '#ffbf2a', curbB: '#ffffff',
    grip: 1, grav: 1, music: { bpm: 120, root: 62, scale: 'major' },
    pts: [[0, 0, 0, 20], [200, 0, 0, 20], [300, 20, 2, 19], [335, 100, 6, 18], [285, 165, 8, 18], [185, 150, 4, 18], [130, 190, 2, 17], [150, 250, 4, 17], [80, 295, 8, 17], [-60, 285, 10, 18], [-200, 255, 6, 19], [-285, 170, 2, 19], [-265, 80, 0, 18], [-185, 60, 0, 18], [-150, 10, 0, 19], [-80, -10, 0, 20]],
    feats: [
      { t: 0.06, type: 'boxes' }, { t: 0.3, type: 'boxes' }, { t: 0.55, type: 'boxes' }, { t: 0.8, type: 'boxes' }, { t: 0.13, type: 'boost', off: -4 }, { t: 0.5, type: 'boost', off: 4 }, { t: 0.62, type: 'boost', off: 0 }, { t: 0.94, type: 'boost', off: 0 }, { t: 0.09, type: 'ramp' }, { t: 0.58, type: 'ramp' }, { t: 0.76, type: 'ramp' }, { t: 0.31, type: 'shortcut', t2: 0.46, label: 'Atajo del panal' }, { t: 0.22, type: 'obstacle', kind: 'bee' }, { t: 0.4, type: 'obstacle', kind: 'bee' }, { t: 0.7, type: 'obstacle', kind: 'bee' } ] },
  { id: 'helada', name: 'Copa Helada', color: '#8fe0ff', trophy: '#6fd3ff', track: 'Pista Cucurucho', unlock: null,
    theme: 'ice', sky: ['#a8c8ff', '#f0f7ff'], fog: '#eef6ff', ground: '#f4f9ff', ground2: '#dcecff', road: '#a9d4ff', curbA: '#ff8fc0', curbB: '#ffffff',
    grip: 0.55, grav: 1, music: { bpm: 112, root: 65, scale: 'major' },
    pts: [[0, 0, 20, 20], [100, 10, 18, 19], [170, 60, 14, 18], [150, 130, 10, 17], [80, 150, 8, 17], [60, 210, 10, 17], [130, 250, 12, 17], [200, 230, 10, 17], [235, 290, 6, 17], [160, 345, 4, 18], [40, 335, 2, 18], [-50, 285, 4, 17], [-60, 200, 8, 17], [-130, 170, 12, 17], [-175, 100, 18, 18], [-120, 40, 22, 19], [-60, -10, 22, 20]],
    feats: [
      { t: 0.04, type: 'boxes' }, { t: 0.27, type: 'boxes' }, { t: 0.55, type: 'boxes' }, { t: 0.82, type: 'boxes' }, { t: 0.12, type: 'boost', off: 0 }, { t: 0.5, type: 'boost', off: 3 }, { t: 0.88, type: 'boost', off: -3 }, { t: 0.17, type: 'ramp' }, { t: 0.6, type: 'ramp' }, { t: 0.72, type: 'ramp' }, { t: 0.285, type: 'shortcut', t2: 0.375, label: 'Atajo de barquillo' }, { t: 0.2, type: 'obstacle', kind: 'snowball' }, { t: 0.45, type: 'obstacle', kind: 'snowball' }, { t: 0.66, type: 'obstacle', kind: 'snowball' }, { t: 0.92, type: 'obstacle', kind: 'snowball' } ] },
  { id: 'galaxia', name: 'Copa Galaxia', color: '#b48cff', trophy: '#a77bff', track: 'Anillo de Saturnino', unlock: { needs: ['gominola', 'girasol'], text: 'Sube al podio en las copas Gominola y Girasol' },
    theme: 'space', sky: ['#120a33', '#3b1f6e'], fog: '#2a1758', ground: null, road: '#d9ccff', curbA: '#7ff5ff', curbB: '#ff8fe0',
    grip: 0.9, grav: 0.45, music: { bpm: 126, root: 57, scale: 'dorian' },
    pts: [[270, 0, 28, 17], [230, -80, 32, 16], [140, -105, 34, 17], [70, -70, 34, 18], [0, 0, 34, 18], [-70, 70, 32, 18], [-150, 110, 28, 17], [-240, 80, 24, 17], [-270, 0, 20, 16], [-230, -80, 16, 16], [-140, -105, 13, 17], [-70, -70, 11, 18], [0, 0, 10, 18], [70, 70, 12, 18], [150, 110, 18, 17], [240, 80, 24, 17]],
    feats: [
      { t: 0.05, type: 'boxes' }, { t: 0.3, type: 'boxes' }, { t: 0.55, type: 'boxes' }, { t: 0.8, type: 'boxes' }, { t: 0.1, type: 'boost', off: 0 }, { t: 0.35, type: 'boost', off: 3 }, { t: 0.6, type: 'boost', off: -3 }, { t: 0.88, type: 'boost', off: 0 }, { t: 0.2, type: 'ramp' }, { t: 0.45, type: 'ramp' }, { t: 0.7, type: 'ramp' }, { t: 0.95, type: 'ramp' }, { t: 0.44, type: 'shortcut', t2: 0.54, label: 'Atajo del cometa' }, { t: 0.15, type: 'obstacle', kind: 'asteroid' }, { t: 0.62, type: 'obstacle', kind: 'asteroid' }, { t: 0.84, type: 'obstacle', kind: 'asteroid' } ] },
  { id: 'tormenta', name: 'Copa Tormenta', color: '#6f8bff', trophy: '#5a7cff', track: 'Discoteca Relámpago', unlock: { needs: ['helada', 'galaxia'], text: 'Sube al podio en las copas Helada y Galaxia' },
    theme: 'storm', sky: ['#0b0820', '#33205c'], fog: '#1c1240', ground: '#2a1f4a', ground2: '#3a2a66', road: '#3b3266', curbA: '#ff5fd2', curbB: '#5ff5ff',
    grip: 0.95, grav: 1, music: { bpm: 138, root: 58, scale: 'minor' },
    pts: [[0, 0, 0, 18], [160, 0, 0, 18], [185, 20, 0, 17], [185, 120, 2, 17], [165, 142, 2, 17], [105, 140, 4, 16], [80, 162, 4, 16], [102, 185, 4, 16], [102, 240, 6, 17], [80, 262, 6, 17], [-60, 262, 8, 17], [-82, 240, 8, 17], [-82, 165, 6, 16], [-140, 142, 4, 16], [-182, 120, 2, 17], [-182, 20, 0, 17], [-160, 0, 0, 18]],
    feats: [
      { t: 0.05, type: 'boxes' }, { t: 0.27, type: 'boxes' }, { t: 0.5, type: 'boxes' }, { t: 0.79, type: 'boxes' }, { t: 0.1, type: 'boost', off: 0 }, { t: 0.21, type: 'boost', off: 0 }, { t: 0.55, type: 'boost', off: 3 }, { t: 0.93, type: 'boost', off: -3 }, { t: 0.07, type: 'ramp' }, { t: 0.46, type: 'ramp' }, { t: 0.82, type: 'ramp' }, { t: 0.295, type: 'shortcut', t2: 0.37, label: 'Atajo de neón' }, { t: 0.18, type: 'obstacle', kind: 'lightning' }, { t: 0.4, type: 'obstacle', kind: 'lightning' }, { t: 0.62, type: 'obstacle', kind: 'lightning' }, { t: 0.88, type: 'obstacle', kind: 'lightning' } ] },
];
// Cada copa: 2 carreras (ida y vuelta, el mismo circuito en sentido contrario)
export const RACES_PER_CUP = 2;
