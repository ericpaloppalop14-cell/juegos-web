'use strict';
// ====== DATOS: ingredientes, cocineros, cocinas ======
const ING = {
  tomate:{n:'Tomás Tomate',sp:165,fl:215,beh:'cobarde',col:'#ff4d3d',
    barks:['¡No me pilláis!','¡Soy muy joven para ser salsa!','¡Socorro, un cuchillo!','¡Yo quería ser ensalada!']},
  huevo:{n:'Huevolino',sp:125,fl:175,beh:'salto',col:'#fff3dc',
    barks:['¡Cuidado, soy frágil!','¡Rueda que rueda!','¡Prefiero ser pollo!','¡Yo no me rompo… creo!']},
  queso:{n:'Don Queso',sp:98,fl:150,beh:'peste',col:'#ffd23f',
    barks:['¿Huelo mal? ¡Es elegancia!','¡Soy un manjar, señor!','¡Qué agujeros tan distinguidos!','¡Brie o no brie!']},
  pez:{n:'Pez Fernando',sp:150,fl:185,beh:'zigzag',col:'#4db8ff',
    barks:['¡Glu glu, adiós!','¡Fuera del agua soy más rápido!','¡Me voy al mar!','¡Esta es mi mejor cara!']},
  zanahoria:{n:'Zoila Zanahoria',sp:205,fl:150,beh:'recta',col:'#ff8a1f',
    barks:['¡A que no me pillas!','¡Corro por las vitaminas!','¡Veo en la oscuridad y corro más!','¡Soy puro Beta Caroteno!']},
  cebolla:{n:'Cebollón',sp:125,fl:175,beh:'lagrimas',col:'#d9a3ee',
    barks:['¡Buaaa, no me peles!','¡Lloro por dentro y por fuera!','Snif… ¡adiós, mundo cruel!','¡Soy sensible, vale!']},
  seta:{n:'Seta Loca',sp:110,fl:170,beh:'teleport',col:'#ff6f6f',
    barks:['¡Puf, magia!','¡Estoy en todas partes!','¡Soy de las buenas, lo juro!','¡Ahora me ves, ahora no!']},
  pimiento:{n:'Pimi Picante',sp:118,fl:185,beh:'sprint',col:'#e83b3b',
    barks:['¡Pico y me voy!','¡Quemo más que tu suegra!','¡Fuego, fuego!','¡Cuidado, que repito!']},
  patata:{n:'Patatín',sp:90,fl:125,beh:'dormilona',col:'#cf9d62',
    barks:['Zzz… cinco minutitos más…','¿Eh? ¿Ya es hora?','¡Ay, qué sueño tengo!','Soy una patata de sofá…']},
  salchicha:{n:'Salchi',sp:158,fl:190,beh:'serpiente',col:'#e0746b',
    barks:['¡Ssssalchichón huyendo!','¡No soy un perrito caliente!','¡Culebreo y me voy!','¡Soy de pueblo, de Burgos!']},
  hielo:{n:'Cubito Polar',sp:85,fl:160,beh:'hielo',col:'#9fe7ff',
    barks:['¡Brrr, qué fresquito!','¡Soy el héroe de la olla!','¡Enfríame de una vez!','¡Me derrito por ti!']}
};
const ING_ORDER=['tomate','huevo','queso','pez','zanahoria','cebolla','seta','pimiento','patata','salchicha'];

const RECIPE_NAMES=['Sopa Sorpresa','Tortilla Cósmica','Guiso del Abuelo Turbo','Paella Disparatada','Estofado Sospechoso',
 'Ensalada Gritona','Puré Pirata','Caldo Cuántico','Cocido Espacial','Fideuá Fantasma','Revuelto Rebelde','Crema de Pesadilla',
 'Cazuela Chiflada','Potaje Patoso','Menestra Magnética','Tarta de Calcetín','Gazpacho Galáctico','Migas Misteriosas'];

// Cocineros jugables (originales y surrealistas)
const CHEFS = [
 {id:'croqueto',n:'Croqueto',t:'La croqueta con bigote',body:'croqueta',c1:'#e9a447',c2:'#c77a22',price:0,
  spd:1.0,reach:0,dash:1.0,pow:1.0,d:'Equilibrado y crujiente.',
  L:{catch:['¡Al saco, croqueta!','¡Mmm, crujiente!','¡Te tengo, rebozado!'],good:['¡Olé mi bechamel!','¡A la olla!','¡Perfecto, mi niño!'],bad:['¡Eso no iba!','¡Mi bigote lo sabía!','¡Puaj!'],hit:['¡Ay, mi rebozado!','¡Me has aplastado!'],win:['¡Soy croquetamente genial!','¡Un aplauso para el bigote!'],lose:['Me he quemado por fuera…','¡Qué sopa tan amarga!']}},
 {id:'pulpa',n:'Madame Pulpa',t:'Pulpo con ocho cucharones',body:'pulpo',c1:'#b36ee0',c2:'#8a43b8',price:120,
  spd:0.96,reach:12,dash:0.9,pow:1.0,d:'Brazos largos: atrapa desde más lejos.',
  L:{catch:['¡Mis ocho brazos te abrazan!','¡Tentáculo al ataque!','¡Cazado, mon chéri!'],good:['¡Magnifique!','¡Ocho cucharones, ocho aciertos!','¡Ooh la la!'],bad:['¡Quelle horreur!','¡Mis ventosas lloran!','¡Eso es un crimen!'],hit:['¡Mis tentáculos!','¡Ay, qué bruto!'],win:['¡La Reina del Océano!','¡Aplaudid con las ocho manos!'],lose:['¡Mi reputación se hunde!','Esto sabe a mar muerto…']}},
 {id:'cucharon',n:'Sir Cucharón',t:'Caballero de la Cuchara',body:'caballero',c1:'#aab7c8',c2:'#7b8aa0',price:250,
  spd:0.92,reach:0,dash:1.1,pow:1.6,d:'Pesado: sus lanzamientos aturden mucho.',
  L:{catch:['¡Por el reino de la sopa!','¡Rendíos, ingredientes!','¡Prendido en nombre del caldo!'],good:['¡Honor y sazón!','¡Victoria cucharil!','¡Por mi armadura!'],bad:['¡Deshonra!','¡Villano ingrediente!','¡Mis escudos lloran!'],hit:['¡Clanc! ¡Eso dolió!','¡Mi yelmo!'],win:['¡Caballero del Caldo!','¡Ganamos con honor!'],lose:['¡La olla ha caído!','Ay, mi gloria quemada…']}},
 {id:'turbo',n:'Abuela Turbo',t:'Abuela con ruedas',body:'abuela',c1:'#ff8fb8',c2:'#d9568a',price:400,
  spd:1.18,reach:0,dash:0.85,pow:0.9,d:'Rapidísima, pero no frena bien.',
  L:{catch:['¡Pa\' la cesta, nieto!','¡Corre que te pillo!','¡Más rápida que tu madre!'],good:['¡Así se hace, rica!','¡Con cariño y gasolina!','¡Ni el Cordero Pascual!'],bad:['¡Ay, qué asco, hijo!','¡Eso no se echa, criatura!','¡Cielo santo!'],hit:['¡Ay mi cadera!','¡Respeta a tus mayores!'],win:['¡A mi edad y ganando!','¡Gané! ¡Pago yo el café!'],lose:['¡Se me ha pasado la olla!','Ay, Dios mío…']}},
 {id:'sarten',n:'Gnomo Sartenín',t:'Gnomo con sartén',body:'gnomo',c1:'#ff5f5f',c2:'#c93a3a',price:600,
  spd:1.05,reach:4,dash:1.45,pow:1.0,d:'Pequeñito: zambullida rapidísima.',
  L:{catch:['¡Sartenazo y al saco!','¡Pillado, pillín!','¡Pam! ¡Cazado!'],good:['¡Chimpún!','¡Soy diminuto y genial!','¡A la olla, jejeje!'],bad:['¡Eso no, so zoquete!','¡Hasta mi barba protesta!','¡Cof, qué peste!'],hit:['¡Boing!','¡Soy pequeño, no de goma!'],win:['¡El gnomo manda!','¡Chiquitín pero matón!'],lose:['¡Mi sartén se derrite!','Cabeza gacha, gorro caído…']}},
 {id:'fantasma',n:'Fantasma Pinche',t:'Pinche con sábana',body:'fantasma',c1:'#f4f6ff',c2:'#c3c9ee',price:800,
  spd:1.04,reach:6,dash:1.0,pow:1.0,d:'Flota: no se resbala nunca.',
  L:{catch:['¡Buuu! ¡Cazado!','¡Te tengo, te tengo!','¡Te embrujo el estofado!'],good:['¡Buenísimo, buuuu!','¡Aplausos fantasmales!','¡Qué escalofrío de sabor!'],bad:['¡Hasta un muerto lo rechaza!','¡Buuuhh, qué mal!','¡Eso da más miedo que yo!'],hit:['¡Me has atravesado!','¡Uuuh, qué susto!'],win:['¡Un fantasma triunfa!','¡Viva el más allá!'],lose:['¡Me muero… otra vez!','Se quemó, y yo ya estoy muerto…']}},
 {id:'tostadora',n:'Tostadora Gertrudis',t:'Robot de tostadas',body:'tostadora',c1:'#c7ccd9',c2:'#8b92a8',price:1100,
  spd:1.0,reach:0,dash:1.0,pow:1.25,d:'Lanza más lejos: ¡tostada-misil!',
  L:{catch:['¡BIP! ¡INGREDIENTE CAPTURADO!','Tostando… ¡cazado!','¡Calculando captura: 100%!'],good:['¡Tostada perfecta!','¡BIP BOP, PUNTO ÓPTIMO!','¡Sistema gourmet activado!'],bad:['¡ERROR 404: SABOR!','¡Eso no cuadra en mi circuito!','¡PUAJ.EXE!'],hit:['¡Cortocircuito!','¡Me sacudo las migas!'],win:['¡GANADORA.EXE!','¡Pan comido!'],lose:['¡Me he fundido!','Error: sopa quemada.']}},
 {id:'pepino',n:'Pepino Ninja',t:'El sigiloso Pepino',body:'pepino',c1:'#58c46a',c2:'#2e9446',price:1500,
  spd:1.08,reach:2,dash:1.5,pow:1.1,d:'Sigiloso: zambullida larguísima.',
  L:{catch:['¡Ninja-cazado!','¡Ni lo viste venir!','¡Zas, en silencio!'],good:['¡Corte perfecto!','¡Sin hacer ruido!','¡Silencioso y letal!'],bad:['¡Deshonor!','¡Mi katana llora!','¡Esto es un insulto!'],hit:['¡Sorprendido por un cebollino!','¡Me han visto!'],win:['¡Ninja Maestro del Wok!','¡Ni me visteis ganar!'],lose:['Mi honor se quemó…','Me desvanezco con el humo…']}}
];

// Cocinas (niveles). Fracciones del tamaño del campo.
// haz: tipo de peligro. 'ct': mostradores [x,y,w,h]
const LEVELS = [
 {n:'Cocina de la Abuela',sub:'Para calentar motores',f1:'#ffeccb',f2:'#ffdca8',wall:'#a8683f',ct:'#d98d5a',ctT:'#f6c88f',bg:'#7a4a2c',
  ings:['tomate','huevo','patata','zanahoria'],target:4,heat:2.3,pat:1.15,max:6,spawn:1.8,isp:0.88,aiS:0.8,
  cts:[[.05,.34,.15,.13],[.8,.55,.15,.13]],haz:null,desc:'Sin trucos: solo ingredientes huyendo.'},
 {n:'Pizzería Cinta Loca',sub:'Las cintas te empujan',f1:'#ffe3d6',f2:'#ffc9b4',wall:'#9c3d3d',ct:'#c95b4a',ctT:'#f2998a',bg:'#6a2430',
  ings:['tomate','queso','salchicha','seta','huevo'],target:5,heat:2.7,pat:1.05,max:7,spawn:1.6,isp:0.95,aiS:0.86,
  cts:[[.06,.16,.18,.07],[.76,.8,.18,.07]],haz:'cinta',
  belts:[[.12,.3,.76,.08,1,0],[.12,.62,.76,.08,-1,0]],desc:'¡Cuidado! Las cintas te llevan donde quieren.'},
 {n:'Freiduría Resbalosa',sub:'Charcos de aceite',f1:'#e4f7ff',f2:'#c4ecfb',wall:'#2f7ea8',ct:'#3fa3c9',ctT:'#9fe0f5',bg:'#1e4f6e',
  ings:['pez','cebolla','patata','pimiento','huevo'],target:5,heat:3.0,pat:1.0,max:7,spawn:1.5,isp:1.0,aiS:0.9,
  cts:[[.08,.5,.12,.12],[.8,.3,.12,.12]],haz:'aceite',
  oil:[[.25,.3,78],[.75,.7,78],[.5,.88,64],[.78,.2,56]],desc:'Charcos de aceite: ¡patinas sin control!'},
 {n:'Bistró de los Portales',sub:'Teletransporte cocinero',f1:'#ece3ff',f2:'#d7c8ff',wall:'#6b45b8',ct:'#8a63d8',ctT:'#c7b0ff',bg:'#3a2570',
  ings:['seta','salchicha','zanahoria','pez','queso','cebolla'],target:6,heat:3.2,pat:0.98,max:8,spawn:1.4,isp:1.02,aiS:0.92,
  cts:[[.22,.2,.1,.13],[.68,.62,.1,.13]],haz:'portal',
  portals:[[[.13,.45],[.87,.45]],[[.25,.86],[.75,.86]]],desc:'Entra en un portal y sal por el otro.'},
 {n:'Parrilla del Volcán',sub:'Géiseres de fuego',f1:'#ffd9b0',f2:'#ffbf86',wall:'#7a2a14',ct:'#4a3a3a',ctT:'#8a7070',bg:'#3a1208',
  ings:['pimiento','salchicha','tomate','zanahoria','patata','pez'],target:6,heat:3.4,pat:0.95,max:8,spawn:1.4,isp:1.05,aiS:0.95,
  cts:[[.06,.55,.12,.12],[.82,.3,.12,.12]],haz:'volcan',desc:'Si ves un círculo rojo… ¡sal de ahí!'},
 {n:'Nave Espacial Cocinera',sub:'Meteoritos y gravedad rara',f1:'#cfd8ff',f2:'#b4c0f2',wall:'#2a2f78',ct:'#4f58b8',ctT:'#99a3f5',bg:'#10123a',
  ings:['seta','pez','huevo','queso','cebolla','pimiento','salchicha'],target:7,heat:3.0,pat:0.92,max:9,spawn:1.3,isp:1.1,aiS:1.0,
  cts:[[.4,.17,.2,.07],[.07,.42,.1,.16],[.83,.42,.1,.16],[.4,.8,.2,.07]],haz:'nave',desc:'Meteoritos y suelo resbaladizo. ¡Sobrevive!'}
];
