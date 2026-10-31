// v15: muchas frases por personaje (≥25 cada uno), por situación, sin repetir hasta agotarlas.
// start = al empezar · gen = charla / subir de tamaño · big = al tragar algo enorme · hit = al recibir un golpe · clear = al limpiar la ciudad · gold = objeto dorado
export const PHR = {
  dona: {
    start: ['¡A limpiar!', '¡Rulos al viento y escoba en mano!', '¡Que empiece el festival del polvo!'],
    gen: ['¡Qué desorden!', '¡Todo para dentro!', '¡Hasta el último calcetín!', '¡En mis tiempos esto estaba ordenado!', '¡Ay, cuánto polvo!', '¡Me lo llevo todo!', '¡Con esta escoba no hay quien pueda!', '¡Esto lo arreglo yo con un paño y mucha fe!', '¡Los rulos me dan poderes!', '¡Mi nieto nunca recoge nada!', '¡Que me quiten lo bailado… y lo barrido!'],
    big: ['¡Ese armario se viene a mi bolso!', '¡Ay, qué bocado más grande!', '¡Hasta el sofá cabe, hija!', '¡Esto pesa más que mi suegra!', '¡Eso es un mueble o un edificio!'],
    hit: ['¡Ay, mi espalda!', '¡Eso es abuso municipal!', '¡Qué falta de respeto a una señora!', '¡Me han arrugado el delantal!', '¡Ay, que se me caen los rulos!'],
    clear: ['¡Todo limpio! ¡Ni una mota de polvo!', '¡Ya puedes comer en el suelo, cariño!', '¡Y ahora, a tomar un cafelito!', '¡Más limpio que los chorros del oro!', '¡Lo que queda, para dentro!'],
    gold: ['¡Oro! ¡Para el bolso de la abuela!', '¡Reluce más que mi dentadura!']
  },
  gato: {
    start: ['¡Miau-spirando!', '¡Siete vidas, cero bolsas!', '¡Modo succión, activado, miau!'],
    gen: ['¡Miauuu! ¡Todo para dentro!', '¡Esto es mío, y esto, y esto!', '¡Ronroneo a máxima potencia!', '¡Succión de gato experto!', '¡Me como los ovillos de un solo bocado!', '¡Soy gato, soy aspiradora y soy guapo!', '¡Hoy toca siesta después del polvo!', '¡Nada se esconde de mis bigotes!', '¡Más hambre que un gato en una pescadería!', '¡Mi cola tiene turbo!', '¡Ñam, ñam, miau!'],
    big: ['¡Ese ratón es gigante, miau!', '¡Voy a necesitar una siesta después de esto!', '¡Esto no cabe… ¡sí cabe!', '¡Qué pedazo de bola de pelo!', '¡Me lo trago, aunque sea un sofá!'],
    hit: ['¡Miau! ¡Mi cola!', '¡Eso me ha quitado una vida!', '¡Me he erizado entero!', '¡Grrr, me las pagarás!', '¡Auuu! ¡Qué zarpazo!'],
    clear: ['¡Ciudad limpia, bigotes brillantes!', '¡Misión cumplida, ahora me lamo!', '¡Ni un pelo fuera de sitio… salvo los míos!', '¡Miau-ravilloso! ¡Todo limpio!', '¡A dormir veinte horas, me lo he ganado!'],
    gold: ['¡Miau! ¡Una croqueta dorada!', '¡Brilla más que mi pelaje!']
  },
  fregona: {
    start: ['¡Al abordaje de la mugre!', '¡Icen las velas y mojen la fregona!', '¡Zarpamos hacia el siguiente charco!'],
    gen: ['¡Por mil barquillos!', '¡Leeeevad anclas, que hay polvo!', '¡Tierra a la vista… y sucia!', '¡Esto es una limpieza de altamar!', '¡Yo, ho, ho y una botella de lejía!', '¡Mi loro dice que hay más mugre!', '¡Ni el kraken se me resiste!', '¡Marinero, a fregar la cubierta!', '¡Con esta fregona domino los siete mares!', '¡Arrr! ¡Qué charco más hermoso!', '¡Todo a babor, el polvo a estribor!'],
    big: ['¡Un galeón entero a mi barriga!', '¡Eso es más grande que el Kraken!', '¡Por las barbas de Neptuno, qué mole!', '¡Ese cofre me lo llevo yo!', '¡A la bodega con él!'],
    hit: ['¡Me han abierto una vía de agua!', '¡Arrr, un balazo de cañón!', '¡Que me parto el palo mayor!', '¡Ay, mi pata de palo… que no tengo!', '¡Hombre al agua!'],
    clear: ['¡Cubierta limpia como una patena!', '¡Tesoro encontrado: un suelo reluciente!', '¡Ciudad limpia, ron de ración doble!', '¡Fregona y victoria!', '¡Arrr! ¡Ni una mota para el Kraken!'],
    gold: ['¡Doblones de oro, arrr!', '¡El tesoro del capitán!']
  },
  bruja: {
    start: ['¡Abracadabra, a barrer!', '¡Escoba, escoba, haz tu magia!', '¡Pata de gallo, a limpiar sin descanso!'],
    gen: ['¡Pim, pam, pum, fuera polvo!', '¡Uy, creo que me ha salido un conjuro al revés!', '¡Mi gato dice que esto es un caos!', '¡Hechizo de limpieza versión beta!', '¡Ojo de sapo y cepillo de pelo!', '¡Se me ha caído el sombrero otra vez!', '¡La escoba corre más que yo!', '¡Hoy se me da muy bien la magia!', '¡Más magia que un conejo en su chistera!', '¡Esto lo arreglo con un poco de purpurina!', '¡Brujita presente, polvo ausente!'],
    big: ['¡Pócima de tamaño XXL!', '¡Ese mueble se convertirá en rana!', '¡Eso no estaba en el libro de hechizos!', '¡Glups! ¡Qué trago mágico!', '¡Convierto lo gigante en bolsillo!'],
    hit: ['¡Ay, mi sombrero!', '¡Me han hecho un maleficio!', '¡Pum! ¡Mi varita!', '¡Eso no estaba en mi horóscopo!', '¡Me he quedado verde del susto!'],
    clear: ['¡Ciudad limpia por arte de magia!', '¡Ta-chán! ¡Desaparecieron las motas!', '¡Esto merece una poción de celebración!', '¡Brillo, brillo, brillo… y limpio!', '¡Nunca me había salido tan bien!'],
    gold: ['¡Un caldero de oro, qué hechizo!', '¡Magia dorada, a mi bolsillo!']
  },
  robo: {
    start: ['¡BIP BOP! ¡Limpieza al cien por cien!', '¡Iniciando secuencia de succión!', '¡Cargando 100%… A BARRER!'],
    gen: ['¡BIP BIP! Suciedad localizada.', '¡Procesando mugre: 99%!', '¡Mi batería está llena de valor!', '¡Detectado un calcetín enemigo!', '¡Soy un robot, pero siento el polvo!', '¡Bip bop, desorden eliminado!', '¡Calculando ruta más limpia!', '¡Modo superhéroe activado!', '¡Mis circuitos bailan con el polvo!', '¡Error 404: suciedad no encontrada!', '¡Ruedas listas, brazos listos!'],
    big: ['¡ALERTA! OBJETO DE TAMAÑO EXTREMO.', '¡Memoria llena, ingiriendo mueble!', '¡Mis cálculos no incluían esto!', '¡Procesando… procesando… ¡TRAGADO!', '¡Capacidad aumentada, bip bop!'],
    hit: ['¡Ay, mi tornillo!', '¡Error! ¡Daños en el casco!', '¡BIP BOP! ¡Me han descolocado!', '¡Cortocircuito de bolsillo!', '¡Mis ruedas patinan!'],
    clear: ['¡Misión cumplida al 100%!', '¡Ciudad limpia, apagando motores!', '¡Bip bop! ¡Sin una mota!', '¡Superhéroe de bolsillo reportándose!', '¡Fin de la transmisión… y del polvo!'],
    gold: ['¡Pieza de oro detectada!', '¡Bip bop! ¡Tornillo de oro!']
  },
  calcetin: {
    start: ['¡Por el honor del par perdido!', '¡Mi par y yo lo hemos jurado!', '¡Calcetín al ataque!'],
    gen: ['¡Por mi pareja desaparecida!', '¡Mi espada es una aguja de coser!', '¡La lavadora me tiene miedo!', '¡Soy el calcetín más valiente del cesto!', '¡Mi agujero es mi medalla!', '¡Caballeros de la lana, a limpiar!', '¡Juro encontrar a mi par!', '¡Al ataque, con mucho olor!', '¡Un poco de lejía y todo será gloria!', '¡Estoy hecho de lana y de valor!', '¡Un calcetín nunca se rinde!'],
    big: ['¡Un dragón! ¡O un sofá!', '¡Eso se traga con honor!', '¡Gloria y mueble, a mi buche!', '¡El enemigo es grande, pero mi lana es mayor!', '¡Por mi dama calcetina, vaya mole!'],
    hit: ['¡Auch, mi agujero!', '¡Me han descosido!', '¡Qué villano, qué villano!', '¡Mi honor está por los suelos!', '¡Ay, mis cordones!'],
    clear: ['¡Ciudad limpia y honor intacto!', '¡Mi par estaría orgulloso!', '¡Victoria calcetinada!', '¡Brindo con detergente!', '¡Ni una mota resistió a mi lana!'],
    gold: ['¡Un calcetín dorado, por fin mi par!', '¡Oro para mi armadura de lana!']
  },
  pulpo: {
    start: ['¡Ocho brazos, ocho plumeros!', '¡Tinta, plumero y acción!', '¡Todos los tentáculos a la obra!'],
    gen: ['¡Tengo más manos que ideas!', '¡Esto es una limpieza de tinta china!', '¡Ocho plumeros y cero vergüenza!', '¡Un brazo para el polvo, otro para la tele!', '¡Calamares, qué buen día!', '¡Mis ventosas son aspiradoras!', '¡Pulpo a la gallega… no, a la limpiega!', '¡Un brazo me pica, ¿lo rasco?!', '¡Qué bien se barre con ocho manos!', '¡Soy el pulpo más hacendoso!', '¡Aquí hay tela que sacudir!'],
    big: ['¡Ese mueble entra en los ocho brazos!', '¡Glub! ¡Qué mole!', '¡Hasta con ocho brazos me cuesta!', '¡Abrazo de pulpo y adentro!', '¡Tinta de la emoción!'],
    hit: ['¡Glub! ¡Un tentáculo menos!', '¡Me he hecho un nudo!', '¡Tinta! ¡Tinta! ¡Qué susto!', '¡Mis ventosas! ¡Ay!', '¡Eso me ha dejado frito, y soy de mar!'],
    clear: ['¡Ocho brazos, ciudad limpia!', '¡Una limpieza de campeonato!', '¡A descansar los tentáculos!', '¡Tinta de victoria!', '¡Más limpio que el fondo marino!'],
    gold: ['¡Una perla dorada!', '¡Tesoro del océano!']
  },
  jamon: {
    start: ['¡Olé! ¡Jamón y limpieza!', '¡Salero y escoba, vámonos!', '¡A limpiar con arte y mucha sal!'],
    gen: ['¡Esto está de pata negra!', '¡A limpiar con salero y sal gorda!', '¡Más fino que una loncha!', '¡Con esta pezuña me sobra!', '¡Curado en el polvo, qué arte!', '¡Olé tu limpieza!', '¡Un buen jamón no se rinde!', '¡Hay más polvo que en un secadero!', '¡Esto es limpieza de bellota!', '¡Con mucho arte y poca vergüenza!', '¡Que viva la tapa… y la fregona!'],
    big: ['¡Eso es un jamón de la mejor calidad… y tamaño!', '¡Olé! ¡Un mueble de bellota!', '¡Me lo como en una sola loncha!', '¡Un bocado digno de rey!', '¡Madre mía, qué pedazo!'],
    hit: ['¡Ay, mi corteza!', '¡Me han dejado hecho una loncha!', '¡Que me parto el hueso!', '¡Eso es de mala educación!', '¡Me duele hasta el jamón serrano!'],
    clear: ['¡Olé! ¡Ciudad curada y limpia!', '¡Brindemos con vino y fregona!', '¡Más limpio que una patena castiza!', '¡Esto merece unas tapitas!', '¡A tomar el vermú, que lo hemos ganado!'],
    gold: ['¡Jamón de oro, olé!', '¡Eso sí que es bellota de lujo!']
  },
  croqueta: {
    start: ['¡Croqueta ciclón, a por todas!', '¡Bechamel lista, rebozado listo!', '¡A rodar, que me frío!'],
    gen: ['¡Crujiente por fuera, limpia por dentro!', '¡Rebozada en polvo y a freír!', '¡Que no me falte el pan rallado!', '¡Bechamel de la buena, mamá!', '¡Rueda que te rueda!', '¡Qué bien me envuelve el rebozado!', '¡Estoy a punto de freírme de la emoción!', '¡Hoy me siento de jamón y pollo!', '¡Soy una croqueta con propósito!', '¡Aceite caliente, ánimo caliente!', '¡Mi interior es suave, mi exterior es firme!'],
    big: ['¡Rebozo hasta ese mueble!', '¡Una croqueta gigante necesita comida gigante!', '¡Glups! ¡A bechamelizarlo!', '¡Nunca había rebozado tan grande!', '¡Ahí va el sofá, con su pan rallado!'],
    hit: ['¡Ay, me he roto la corteza!', '¡Me escurre la bechamel!', '¡Pum! ¡Me he aplastado!', '¡Cuidado, que me desmorono!', '¡Eso ha sido un sartenazo!'],
    clear: ['¡Ciudad limpia, croqueta feliz!', '¡Rebozado y reluciente!', '¡Crujiente victoria!', '¡Menudo festín de limpieza!', '¡A servirme con una cañita!'],
    gold: ['¡Una croqueta de oro, familia!', '¡Brilla más que el aceite nuevo!']
  },
  genio: {
    start: ['¡Deseo concedido: suelo limpio!', '¡Frota la lámpara y limpio sin parar!', '¡Tres deseos y todos de limpieza!'],
    gen: ['¡Frotad la lámpara… y la sartén también!', '¡Primer deseo: ni una mota!', '¡Ya está hecho, amo!', '¡Qué gran deseo, qué gran suelo!', '¡Soy un genio, pero también un fregón!', '¡Mi lámpara se ha quedado sin aceite!', '¡Concedido, concedido y concedido!', '¡Quiero un baño de burbujas… y limpieza!', '¡Ábrete, polvo, y vete!', '¡Hasta los genios barremos!', '¡No hay deseo imposible con fregona!'],
    big: ['¡Deseo concedido: un mueble menos!', '¡Eso se me va a la lámpara!', '¡Cuarto deseo: ¡tragarlo todo!', '¡Qué pedazo de peticionario!', '¡Abracadabra, adentro con él!'],
    hit: ['¡Ay, mi lámpara!', '¡Eso no estaba en el contrato!', '¡Me han roto un deseo!', '¡Auch, mi turbante!', '¡Me han desinflado la nube de humo!'],
    clear: ['¡Deseo cumplido: ciudad limpia!', '¡Fin de los tres deseos!', '¡Qué brillo, qué esplendor!', '¡A volver a la lámpara con honores!', '¡Concedido, y con lazo!'],
    gold: ['¡Un deseo de oro, qué lujo!', '¡Brilla más que mi lámpara!']
  },
  fantasma: {
    start: ['¡Buuu! ¡A limpiar de ultratumba!', '¡Sábana al viento!', '¡Buu-enos días, mugre!'],
    gen: ['¡Buuu… perdón, buenas!', '¡Soy un fantasma muy limpio!', '¡Me han lavado a 40 grados y me han encogido!', '¡Atravieso paredes, pero no el polvo!', '¡Buuu, qué miedo… para el polvo!', '¡Mi sábana está de oferta!', '¡Hoy me siento transparente!', '¡Asusto a la mugre con mucha delicadeza!', '¡Uuuh! ¡Qué buena limpieza fantasmal!', '¡Hasta el más allá se ensucia!', '¡Prometo no pasarme de espeluznante!'],
    big: ['¡Buuu! ¡Qué mueble más espeluznante!', '¡Eso me da un escalofrío… de gusto!', '¡Lo atravieso y me lo llevo!', '¡Mi sábana se estira para esto!', '¡Uuuh, qué pedazo de bocado!'],
    hit: ['¡Buuu-ya! ¡Qué golpe!', '¡Me han hecho un agujero en la sábana!', '¡Ay, que me desvanezco!', '¡Eso ha atravesado hasta mi alma!', '¡Uuuf, me ha dolido el más allá!'],
    clear: ['¡Ciudad limpia, almas tranquilas!', '¡Buuu-enísimo trabajo!', '¡Hasta los vivos pueden descansar!', '¡Misión espectral cumplida!', '¡A flotar a la nevera, que me lo merezco!'],
    gold: ['¡Un alma dorada, buuu!', '¡Brillo del más allá!']
  },
  disco: {
    start: ['¡A bailar la mugre, nena!', '¡Que empiece la fiesta, DJ polvo!', '¡Luces, bola de espejos y escoba!'],
    gen: ['¡Sábado noche, polvo noche!', '¡Brillo, brillo, brillo… y limpieza!', '¡Mueve el esqueleto, mueve la fregona!', '¡Esta mugre no sabe bailar!', '¡Yo no limpio, yo desfilo!', '¡Que suene la música de la aspiradora!', '¡Más brillo que una bola de discoteca!', '¡Hasta el polvo me sigue el ritmo!', '¡Con tacones y escoba, no hay quien me pare!', '¡Esto es un baile de limpieza!', '¡Al ritmo del remolino, nena!'],
    big: ['¡Ese mueble tiene ritmo!', '¡Gran final de baile con esto!', '¡Me lo llevo a la pista!', '¡Qué solo de aspiradora, nena!', '¡Este bocado es de platino!'],
    hit: ['¡Ay, mis tacones!', '¡Eso me ha cortado el ritmo!', '¡Me han pisado la bola de espejos!', '¡Auch, mi peinado!', '¡Se me ha ido el ritmo!'],
    clear: ['¡Fin de fiesta, ciudad limpia!', '¡Aplausos para la reina del brillo!', '¡Qué baile, qué limpieza!', '¡Luces fuera, polvo fuera!', '¡Nena, hemos arrasado la pista!'],
    gold: ['¡Disco de oro, nena!', '¡Brilla más que mi vestido!']
  }
};
// bolsa sin repetición por personaje y situación
const bags = {};
export function phrase(charId, kind) {
  const P = PHR[charId] || PHR.dona; let arr = P[kind]; if (!arr || !arr.length) arr = P.gen;
  const k = charId + '/' + kind; let b = bags[k];
  if (!b || !b.l.length) { const l = arr.slice(); for (let i = l.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [l[i], l[j]] = [l[j], l[i]]; } if (b && l.length > 1 && l[l.length - 1] === b.last) { l.unshift(l.pop()); } b = bags[k] = { l, last: null }; }
  b.last = b.l.pop(); return b.last;
}
// bolsa común de todas las situaciones de un personaje (para el contador y los tests)
export const countPhrases = (id) => { const P = PHR[id]; return Object.values(P).reduce((a, l) => a + l.length, 0); };
