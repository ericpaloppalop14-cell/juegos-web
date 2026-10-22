# Estado de la revisión de las Olimpiadas de Mochi Party (fase A)

Base: commit d356f81. «Rehecha» = la prueba usa una mecánica nueva (nuevos.js) o se rediseñó respecto a la versión publicada (5804efc).

| Olimpiada | # | Prueba | Mecánica (tipo) | ¿Rehecha? |
|---|---|---|---|---|
| Espacio | 1 | Saltos Planetarios | planetas (base) | No (original tanda 3) |
| Espacio | 2 | Lluvia de Meteoritos | superv/lluvia | No (única «lluvia» que queda) |
| Espacio | 3 | Golf Lunar | golf | Sí (nueva) |
| Espacio | 4 | Cazaestrellas | recoge (hielo) | No |
| Espacio | 5 | Karts en el Anillo | circuito | Sí (nueva) |
| Desierto | 1 | Carrera de Camellos | machaca | No |
| Desierto | 2 | Laberinto de las Pirámides | laberinto | Sí (nueva) |
| Desierto | 3 | Tirachinas de Cactus | tirachinas | Sí (nueva) |
| Desierto | 4 | Sumo en la Duna | empuje | No |
| Desierto | 5 | Baile del Oasis | ritmo | No |
| Nieve | 1 | Salto de Esquí Pingüino | esqui (saltar en el borde + telemark) | Sí (fase B) |
| Nieve | 2 | Hielo que se Rompe | superv/baldosas | No (única de baldosas que queda) |
| Nieve | 3 | Saltos de Iglú | salto (doble) | No |
| Nieve | 4 | Bolos de Nieve | bolos | Sí (nueva) |
| Nieve | 5 | Hockey Hexagonal | hockey | Sí (nueva) |
| Mar | 1 | Nado con Medusas | nado (base) | Mejorada en tanda 4 |
| Mar | 2 | Pesca Loca | pesca | Sí (nueva) |
| Mar | 3 | Burbujas Voladoras | vuelo | No |
| Mar | 4 | Memoria de Conchas | memoria | Sí (nueva) |
| Mar | 5 | Cuenta Peces | cuenta (contar y elegir número) | Sí (fase B) |
| Selva | 1 | Lianas de la Selva | lianas (balanceo, soltarse a tiempo) | Sí (fase B) |
| Selva | 2 | Bumerán de Plátano | bumeran (apuntar, lanzar y que vuelva) | Sí (fase B) |
| Selva | 3 | Rebanar Fruta | rebanar | Sí (nueva) |
| Selva | 4 | Torre de Tótems | torre | Sí (nueva) |
| Selva | 5 | ¡Que no te vea el Mono! | acecho (luz roja / luz verde) | Sí (fase B) |
| Dulces | 1 | Vallas Serpiente | vallas (base) | Final añadido en tanda 4 |
| Dulces | 2 | Vuelo de Anillos | anillos (base) | No |
| Dulces | 3 | Pinta la Tarta | pinta | Sí (nueva) |
| Dulces | 4 | Fútbol de Gominola | futbol | Sí (nueva) |
| Dulces | 5 | ¿Cuál es Distinto? | distinto (búsqueda visual, tocar) | Sí (fase B) |
| Sueños | 1 | Globo de los Sueños | globo | Sí (nueva) |
| Sueños | 2 | Lluvia de Almohadas | esquiva (deriva) | No |
| Sueños | 3 | Caza de Mariposas | mariposas | Sí (nueva) |
| Sueños | 4 | Equilibrio sobre la Luna | equilibrio | Sí (nueva) |
| Sueños | 5 | Para el Reloj Derretido | parareloj (contar el tiempo a ciegas) | Sí (fase B) |
| Volcán | 1 | Caída al Centro de la Tierra | caida (base) | Mejorada en tanda 4 |
| Volcán | 2 | Topos de Lava | topos (aplastar en 3 agujeros) | Sí (fase B) |
| Volcán | 3 | Chiles al Dragón | punteria | No |
| Volcán | 4 | Bola Caliente del Cráter | caliente (patata caliente) | Sí (fase B) |
| Volcán | 5 | Moldes de Lava | moldes (verter y parar en la raya) | Sí (fase B) |

Rehechas o nuevas: 28 de 40 (19 en fase A + 10 en fase B; Bolos de Lava ya contaba).

## Mecánicas repetidas
Tras la fase B, cada mecánica aparece **una sola vez**, salvo **superv**: Meteoritos (lluvia) y Hielo que se Rompe (baldosas) comparten el marco de «supervivencia en arena», aunque se juegan distinto.
Nuevas en la fase B (nuevos2.js): bumeran, topos, cuenta, acecho, caliente, esqui, moldes, distinto, lianas y parareloj.

## Puntos de la revisión
| Punto | Estado |
|---|---|
| Tirones de las nubes | Hecho: nubes opacas instanciadas (sesión anterior) + ahora acompañan a la cámara con parallax; los obstáculos (nubes, almohadas, vallas, aros) aparecen a 140 m dentro de la niebla en vez de a 80-90 m de golpe |
| Control lateral Sueños (Equilibrio, prueba 4) y Almohadas | Hecho y probado con toques reales (CDP): ⬅ ➡ llegan, cambian de carril / inclinación; Equilibrio responde más (fuerza 3,6→4,4) |
| Sin tristeza | Hecho en todas partes: olimpiadas, celebración común (core3d), podio de la tanda 4 (escena3d: los perdedores ahora aplauden) y choque en Anillos (cara aplastada, no triste) |
| Una sola celebración por prueba | Hecho: solo la celebración del escenario + panel de clasificación (fiesta.js) |
| Personajes no atraviesan el suelo | Hecho: decorado apoyado en el suelo; prueba de 40 pruebas: peor valor −0,020 (aplastado de aterrizaje, tolerancia −0,06), ninguno hundido |
| Escenarios detallados | Parcial: decorado instanciado rico por mundo (sesión anterior); falta pulir por prueba (fase B) |
