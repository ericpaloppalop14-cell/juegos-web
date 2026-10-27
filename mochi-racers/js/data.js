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
  // v19: pilotos premium (de pago; aún sin compra real)
  { id: 'capitan', name: 'Capitán Aletas', color: '#ffb36b', ears: 'fins', inner: 'aquarium', vehicle: 'whale', vname: 'Ballenita de Montar', premium: true, price: '1,99 €',
    stats: { vel: 4, acel: 3, man: 3, peso: 4 }, desc: 'Un pez muy elegante con chistera y monóculo que cabalga su ballenita.', unlock: null },
  { id: 'tostadin', name: 'Sir Tostadín', color: '#ffd98a', ears: 'bear', inner: 'gears', vehicle: 'toaster', vname: 'Tostadora Voladora', premium: true, price: '1,99 €',
    stats: { vel: 4, acel: 4, man: 2, peso: 3 }, desc: 'Rey del desayuno. Su tostadora aletea y lanza tostadas.', unlock: null },
  { id: 'madame', name: 'Madame Llovizna', color: '#c9a0ff', ears: 'cat', inner: 'snow', vehicle: 'umbrella', vname: 'Paraguas Navegante', premium: true, price: '1,99 €',
    stats: { vel: 3, acel: 4, man: 5, peso: 1 }, desc: 'Navega en un paraguas del revés sobre su propia nube de lluvia.', unlock: null },
  { id: 'tecla', name: 'Maestro Tecla', color: '#9fc3ff', ears: 'antenna', inner: 'disco', vehicle: 'piano', vname: 'Piano Corredor', premium: true, price: '1,99 €',
    stats: { vel: 3, acel: 3, man: 4, peso: 4 }, desc: 'Dirige la orquesta mientras su piano corre con patitas.', unlock: null },
  { id: 'duquesa', name: 'Duquesa Espuma', color: '#ffb3d1', ears: 'bunny', inner: 'bubbles', vehicle: 'bathtub', vname: 'Bañera con Patas', premium: true, price: '1,99 €',
    stats: { vel: 3, acel: 5, man: 3, peso: 2 }, desc: 'Corre dándose un baño de espuma con su patito de goma.', unlock: null },
  { id: 'farito', name: 'Farito', color: '#9fe8a8', ears: 'antenna', inner: 'atom', vehicle: 'snailhouse', vname: 'Caracol Faro', premium: true, price: '1,99 €',
    stats: { vel: 2, acel: 4, man: 5, peso: 3 }, desc: 'Su caracol lleva un faro de concha que ilumina la pista.', unlock: null },
  { id: 'tarta', name: 'Tarta Feliz', color: '#ff9cc8', ears: 'bear', inner: 'lava', vehicle: 'cake', vname: 'Tarta sobre Patines', premium: true, price: '1,99 €',
    stats: { vel: 4, acel: 3, man: 3, peso: 3 }, desc: 'Cada carrera es su cumpleaños. ¡Velas encendidas!', unlock: null },
  { id: 'grullita', name: 'Grullita', color: '#8fe3f0', ears: 'bunny', inner: 'solar', vehicle: 'paperplane', vname: 'Avión de Papel Gigante', premium: true, price: '1,99 €',
    stats: { vel: 5, acel: 3, man: 3, peso: 1 }, desc: 'Vuela bajito en un avión de papel que no se arruga nunca.', unlock: null },
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
      { t: 0.07, type: 'boxes' }, { t: 0.3, type: 'boxes' }, { t: 0.6, type: 'boxes' }, { t: 0.86, type: 'boxes' }, { t: 0.12, type: 'boost', off: 0 }, { t: 0.48, type: 'boost', off: -3 }, { t: 0.8, type: 'boost', off: 3 }, { t: 0.18, type: 'ramp' }, { t: 0.66, type: 'ramp' }, { t: 0.93, type: 'ramp' }, { t: 0.29, type: 'shortcut', t2: 0.445, label: 'Atajo de regaliz' }, { t: 0.39, type: 'obstacle', kind: 'gumdrop' }, { t: 0.53, type: 'obstacle', kind: 'gumdrop' }, { t: 0.76, type: 'obstacle', kind: 'gumdrop' } ] },
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
    // v44: Copa Tormenta rehecha: curvas amplias (radio mínimo 61 m, antes 2 m), colinas suaves, 5 rampas y atajo
    pts: [[169.3, 0.0, 0.5, 22.0], [204.6, 66.5, 3.4, 21.1], [230.3, 167.3, 6.8, 19.2], [203.8, 280.5, 7.8, 18.0], [104.9, 322.8, 5.7, 18.7], [0.0, 263.2, 2.1, 20.6], [-60.4, 185.9, 0.0, 21.9], [-107.5, 148.0, 1.2, 21.5], [-156.6, 113.8, 4.6, 19.7], [-188.5, 61.2, 7.5, 18.2], [-214.2, 0.0, 7.4, 18.3], [-233.4, -75.8, 4.5, 20.0], [-209.9, -152.5, 1.1, 21.7], [-150.1, -206.6, 0.1, 21.8], [-84.4, -259.7, 2.2, 20.3], [-0.0, -308.1, 5.8, 18.5], [92.3, -284.1, 7.8, 18.1], [134.0, -184.4, 6.7, 19.4], [128.7, -93.5, 3.3, 21.3], [137.1, -44.5, 0.4, 22.0]],
    feats: [{t:  0.05, type:  'boxes'}, {t:  0.3, type:  'boxes'}, {t:  0.55, type:  'boxes'}, {t:  0.8, type:  'boxes'}, {t:  0.675, type:  'ramp'}, {t:  0.49, type:  'ramp'}, {t:  0.91, type:  'ramp'}, {t:  0.4, type:  'ramp'}, {t:  0.615, type:  'ramp'}, {t:  0.38, type:  'boost', off:  0}, {t:  0.47, type:  'boost', off:  3}, {t:  0.72, type:  'boost', off:  -3}, {t:  0.97, type:  'boost', off:  0}, {t:  0.34, type:  'boost', off:  3}, {t:  0.44, type:  'boost', off:  -3}, {t:  0.119, type:  'shortcut', t2:  0.29, label:  'Atajo del rayo'}, {t:  0.86, type:  'obstacle', kind:  'lightning'}] },
];

// v7: dos circuitos surrealistas surrealistas: gravedad normal, rampas enormes y piruetas en el aire (solo visual)
const floatyFeats = () => [0.05, 0.3, 0.55, 0.8].map(t => ({ t, type: 'boxes' })).concat([0.12, 0.42, 0.68, 0.9].map((t, i) => ({ t, type: 'boost', off: [0, 3, -3, 0][i] })), [0.18, 0.36, 0.5, 0.62, 0.75, 0.95].map(t => ({ t, type: 'ramp' })), [0.25, 0.43, 0.86].map(t => ({ t, type: 'obstacle', kind: 'critter' })));
CUPS.push(
  { id: 'cielo', name: 'Copa Cielo', color: '#7fd8ff', trophy: '#5fcfff', track: 'Archipiélago de Gominola', unlock: null, look: 'sky',
    theme: 'space', sky: ['#5fb8ff', '#ffd0f0'], fog: '#e8d6ff', ground: null, road: '#fff0fa', curbA: '#7fd8ff', curbB: '#ffb3e0',
    grip: 0.95, grav: 1, music: { bpm: 118, root: 64, scale: 'major' },
    pts: [[0, 0, 20, 19], [120, -10, 26, 18], [210, -60, 36, 17], [230, -150, 48, 17], [170, -215, 58, 17], [90, -190, 64, 17], [70, -120, 70, 17], [120, -80, 74, 17], [170, -110, 76, 17], [150, -170, 74, 16], [40, -250, 62, 17], [-80, -250, 50, 18], [-180, -190, 40, 18], [-230, -100, 32, 18], [-200, -20, 26, 18], [-110, 20, 22, 19]],
    feats: floatyFeats() },
  { id: 'sueno', name: 'Copa Sueño', color: '#ffb36b', trophy: '#ffa94d', track: 'Sueño de Relojes Derretidos', unlock: null, look: 'dream',
    theme: 'space', sky: ['#2c1a5a', '#ff9f7a'], fog: '#7a4a8a', ground: null, road: '#ffe2b8', curbA: '#ffb36b', curbB: '#8b5cc2',
    grip: 0.9, grav: 1, music: { bpm: 104, root: 55, scale: 'dorian' },
    pts: [[0, 0, 30, 19], [110, 20, 22, 18], [200, -20, 34, 17], [220, -110, 48, 17], [150, -170, 30, 17], [60, -140, 18, 17], [10, -200, 34, 17], [-70, -250, 52, 17], [-170, -220, 40, 18], [-230, -140, 26, 18], [-180, -70, 44, 17], [-210, 10, 30, 18], [-130, 60, 20, 18], [-60, 40, 26, 19]],
    feats: floatyFeats() },
);
// v14: dos copas nuevas, surrealistas con su propia lógica (decorado en wonder.js)
CUPS.push(
  { id: 'ballena', name: 'Copa Ballena', color: '#3fb6e8', trophy: '#36b3e0', topper: 'whale', track: 'Océano Volador', unlock: null, look: 'ocean',
    theme: 'space', sky: ['#1f7fd0', '#ffd9b8'], fog: '#9fd8f0', ground: null, road: '#e8fbff', curbA: '#3fb6e8', curbB: '#ffd36b',
    grip: 0.95, grav: 1, music: { bpm: 112, root: 62, scale: 'dorian' },
    pts: [[0, 0, 24, 19], [130, 15, 30, 18], [230, -30, 40, 17], [260, -130, 52, 17], [190, -200, 60, 17], [80, -180, 54, 17], [30, -240, 44, 17], [-80, -260, 38, 18], [-190, -210, 48, 17], [-250, -110, 56, 17], [-210, -20, 44, 18], [-120, 30, 32, 19]],
    feats: floatyFeats() },
  { id: 'biblioteca', name: 'Copa Biblioteca', color: '#c86fff', trophy: '#b46cf0', topper: 'book', track: 'Biblioteca Infinita', unlock: null, look: 'book',
    theme: 'space', sky: ['#4a2f8e', '#ffcf9a'], fog: '#e8c8e8', ground: null, road: '#fff3dc', curbA: '#c0392b', curbB: '#ffd24a',
    grip: 0.95, grav: 1, music: { bpm: 124, root: 60, scale: 'major' },
    pts: [[0, 0, 10, 19], [150, 0, 14, 18], [230, 60, 22, 17], [200, 160, 34, 17], [100, 180, 40, 17], [40, 250, 30, 17], [-60, 280, 22, 18], [-170, 230, 30, 17], [-240, 130, 42, 17], [-180, 40, 28, 18], [-90, -10, 16, 19]],
    feats: floatyFeats() },
);
// Cada copa: 2 carreras (ida y vuelta, el mismo circuito en sentido contrario)
export const RACES_PER_CUP = 4; // v23: ida, vuelta y dos circuitos nuevos (tracks2.js)
