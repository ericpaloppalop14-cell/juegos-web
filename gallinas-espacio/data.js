'use strict';
// ====== DATOS DEL JUEGO: Gallinas al Espacio ======
const PLANETS = [
  { id:'luna',   name:'Luna Quesito',        emoji:'🧀', dist:6000,   coins:150,  eggs:10,  mult:1,
    dusk:['#ff9ec7','#ffd7a8'], space:['#1a2268','#3b3f9c'], base:'#ffe27a', shade:'#e0b83a', hazard:'rock',  hc:['#f3d36b','#c9a021'], tag:'Todo agujeros y olor a nevera.' },
  { id:'frito',  name:'Huevo Frito Prime',   emoji:'🍳', dist:12000,  coins:420,  eggs:25,  mult:1.25,
    dusk:['#ff7a59','#ffc371'], space:['#4a1230','#a8324a'], base:'#fffaf0', shade:'#e6dcc4', hazard:'pan',   hc:['#6b6f80','#3d4152'], tag:'Siempre hace sol... y sartén.' },
  { id:'tortilla',name:'Planeta Tortilla',   emoji:'🥔', dist:20000,  coins:950,  eggs:50,  mult:1.5,
    dusk:['#e8a23a','#fff0a8'], space:['#3b2a0e','#7a5a1c'], base:'#f2c74e', shade:'#c9962b', hazard:'potato',hc:['#c99a5b','#8a5a2b'], tag:'Con cebolla. Sin debate.' },
  { id:'revuelta',name:'Nebulosa Revuelta',  emoji:'🌀', dist:31000,  coins:1900, eggs:90,  mult:1.8,
    dusk:['#b06bff','#ff9ad5'], space:['#2a0f55','#7b2ea8'], base:'#ffd35c', shade:'#ff9ac0', hazard:'whisk', hc:['#d7dbe8','#8b92ab'], tag:'Batida a mano por un gigante.' },
  { id:'gallinero',name:'Gallinero Gigante', emoji:'🏠', dist:46000,  coins:3600, eggs:150, mult:2.2,
    dusk:['#35d6c0','#b8ffe6'], space:['#06303a','#0f7f84'], base:'#ff6b5e', shade:'#c9423a', hazard:'ufo',   hc:['#9be8ff','#3fa6d6'], tag:'Aquí viven las gallinas del Universo.' },
  { id:'dorado', name:'Huevo Cósmico Dorado',emoji:'🥚', dist:66000,  coins:8000, eggs:300, mult:3,
    dusk:['#ffd23f','#fff3b0'], space:['#0a0a1a','#2b2150'], base:'#ffd23f', shade:'#e69a00', hazard:'sat',   hc:['#dfe6ef','#7d8aa5'], tag:'La leyenda: ¡el huevo de todos los huevos!' },
];

const UPGRADES = [
  { id:'motor',  icon:'🔥', name:'Motor de tostadora',  desc:'Más empuje: ¡más rápido y más alto!', cur:'coins', base:40, grow:1.5,  max:10 },
  { id:'fuel',   icon:'🌽', name:'Depósito de maíz',    desc:'Combustible para más segundos de vuelo.', cur:'coins', base:35, grow:1.5, max:10 },
  { id:'aero',   icon:'🪽', name:'Aletas aerodinámicas',desc:'Menos rozamiento con el aire.', cur:'coins', base:45, grow:1.5, max:10 },
  { id:'launch', icon:'🪀', name:'Catapulta de gomas',  desc:'Despegue con más impulso.', cur:'coins', base:30, grow:1.45, max:10 },
  { id:'magnet', icon:'🧲', name:'Imán de huevos',      desc:'Atrae monedas y huevos desde lejos.', cur:'coins', base:30, grow:1.45, max:10 },
  { id:'shield', icon:'🍲', name:'Casco de cazuela',    desc:'Aguanta un golpe más sin perder velocidad.', cur:'coins', base:90, grow:1.9, max:5 },
  { id:'agile',  icon:'🪶', name:'Plumas de maniobra',  desc:'Giras más rápido al tocar.', cur:'eggs', base:8, grow:1.45, max:10 },
  { id:'coinmult',icon:'🐷',name:'Hucha de cerdito',    desc:'Cada moneda vale más.', cur:'eggs', base:12, grow:1.5, max:10 },
];

const CHICKENS = [
  { id:'clueca',  name:'Clueca Clotilde',   cost:0,    body:'#fff6e6', comb:'#ff4f5e', acc:'none',     bonus:'Sin bonus... pero con mucho amor.', fx:{} },
  { id:'piloto',  name:'Pollito Piloto',    cost:30,   body:'#ffe36b', comb:'#ff7a3d', acc:'goggles',  bonus:'+12% de combustible', fx:{fuel:.12} },
  { id:'rambo',   name:'Gallo Rambo',       cost:80,   body:'#f2d2a0', comb:'#e8262f', acc:'bandana',  bonus:'+1 golpe aguantado', fx:{shield:1} },
  { id:'disco',   name:'Gallina Disco',     cost:150,  body:'#ffb6e6', comb:'#8a5cff', acc:'afro',     bonus:'+25% de monedas', fx:{coins:.25} },
  { id:'astro',   name:'Gallina Astronauta',cost:300,  body:'#eaf6ff', comb:'#3aa0ff', acc:'antenna',  bonus:'+15% de empuje', fx:{thrust:.15} },
  { id:'ninja',   name:'Gallo Ninja',       cost:500,  body:'#c9b8ff', comb:'#2b2b44', acc:'ninja',    bonus:'Imán +40 y giro rápido', fx:{magnet:40,turn:.2} },
  { id:'dino',    name:'Gallinosaurio',     cost:900,  body:'#8fe08a', comb:'#ff9d2e', acc:'spikes',   bonus:'+1 golpe y +10% de empuje', fx:{shield:1,thrust:.1} },
  { id:'reina',   name:'Reina Huevolina',   cost:1600, body:'#fff0b8', comb:'#ffd23f', acc:'crown',    bonus:'+15% todo (¡reina!)', fx:{fuel:.15,coins:.15,thrust:.15,magnet:20} },
];

const LINES = {
  launch:['¡Cocorico-despegue!','¡Que alguien apague el horno!','¡Mamá, me voy a la Luna!','¡Pío-pío-PROPULSIÓN!','Esto no venía en el manual del corral.','¡Agárrense las plumas!'],
  coin:['¡Pasta gansa!','¡Para la hucha!','¡Qué rico el dinero!','¡Cocó-monedas!','¡Soy rica, soy rica!'],
  egg:['¡Un huevito!','¡Tortilla asegurada!','¡Huevos a mí!','¡Ese lo pongo en la cesta!','¡Y sin freír!'],
  golden:['¡HUEVO DORADO! ¡Soy una diva!','¡Cacarea el oro!','¡El huevo del millón!'],
  hit:['¡Mis plumas!','¡Ay, mi cresta!','¡Eso dolió más que el gallinero!','¡Pero si yo iba por la derecha!','¡Cloc-cloc-cloc-AUCH!','¡Mi peinado!'],
  shield:['¡Casco al rescate!','¡Ni un rasguño!','¡Cazuela power!'],
  fuel:['¡Maíz! ¡Mi favorito!','¡Chof, chof, qué sabroso!','¡Gasolina con sabor a maíz!'],
  turbo:['¡¡¡CO-CO-CO-RRIIIDA!!!','¡TURBO PICOTAZO!','¡Más rápido que un zorro!'],
  magnet:['¡Imán de huevos activado!','¡Todo viene hacia mí!'],
  mid:['¿Eso era una nube o un flan?','Veo mi casa... y un zorro.','Me estoy despeinando.','Si me oyes, granjero: ¡DIMITO!','¡Qué vistas! ¡Qué plumas!','Tengo el pico lleno de aire.','¿Falta mucho? Es que tengo que poner.','Nunca un pollo llegó tan alto.','Creo que he cacareado en el espacio.'],
  tap:['¡Giro a la izquierda!','¡Giro a la derecha!','¡Zigzag!','¡Mareo mareo!'],
  apex:['Se acabó el maíz... ¡puf!','Sin gasolina: ¡a planear, cluck!','¡Paracaídas de emergencia!'],
  land:['¡Hemos llegado! ¡Ahora a poner huevos!','¡Aterrizamos! ¡Qué huevada!','¡Ponemos bandera! Y un huevo.'],
  fail:['¡Casi! Más maíz y llegas.','Los pollos también caen... con estilo.','La próxima vez ponemos más tostadoras.','Eso no era un rebote, era una aterrizada.'],
  perfect:['¡PERFECTO! ¡Cacareo de campeona!','¡Despegue de libro!'],
  menuTips:['Toca para girar: ¡esquiva y recoge todo!','Cada toque cambia de lado. ¡Zigzag!','Los huevos mejoran la nave y desbloquean gallinas.','Llega al planeta para desbloquear el siguiente.','El maíz 🌽 rellena el depósito.'],
  title:['¡Cocoricó, cohetes caseros!','Una gallina, un cohete y cero dudas.','Ponemos huevos en el espacio.']
};
const rnd = a => a[Math.floor(Math.random()*a.length)];
