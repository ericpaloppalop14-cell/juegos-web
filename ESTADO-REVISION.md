# Estado de la revisión de las Olimpiadas de Mochi Party (fase A)

Base: commit d356f81. «Rehecha» = la prueba usa una mecánica nueva (nuevos.js) o se rediseñó respecto a la versión publicada (5804efc).

| Olimpiada | # | Prueba | Mecánica (tipo) | ¿Rehecha? |
|---|---|---|---|---|
| Espacio | 1 | Saltos Planetarios | planetas (base) | No (original tanda 3) |
| Espacio | 2 | Lluvia de Meteoritos | superv/lluvia | No |
| Espacio | 3 | Golf Lunar | golf | Sí (nueva) |
| Espacio | 4 | Cazaestrellas | recoge (hielo) | No |
| Espacio | 5 | Karts en el Anillo | circuito | Sí (nueva) |
| Desierto | 1 | Carrera de Camellos | machaca | No |
| Desierto | 2 | Laberinto de las Pirámides | laberinto | Sí (nueva) |
| Desierto | 3 | Tirachinas de Cactus | tirachinas | Sí (nueva) |
| Desierto | 4 | Sumo en la Duna | empuje | No |
| Desierto | 5 | Baile del Oasis | ritmo | No |
| Nieve | 1 | Trineo en el Circuito Helado | circuito (trineo) | Sí (antes esquiva) |
| Nieve | 2 | Hielo que se Rompe | superv/baldosas | No |
| Nieve | 3 | Saltos de Iglú | salto (doble) | No |
| Nieve | 4 | Bolos de Nieve | bolos | Sí (nueva) |
| Nieve | 5 | Hockey Hexagonal | hockey | Sí (nueva) |
| Mar | 1 | Nado con Medusas | nado (base) | Mejorada en tanda 4 |
| Mar | 2 | Pesca Loca | pesca | Sí (nueva) |
| Mar | 3 | Burbujas Voladoras | vuelo | No |
| Mar | 4 | Memoria de Conchas | memoria | Sí (nueva) |
| Mar | 5 | Concierto de Ballenas | ritmo | No |
| Selva | 1 | Estampida de Piñas | esquiva | No |
| Selva | 2 | Lluvia de Cocos | superv/lluvia | No |
| Selva | 3 | Rebanar Fruta | rebanar | Sí (nueva) |
| Selva | 4 | Torre de Tótems | torre | Sí (nueva) |
| Selva | 5 | Caracoles Turbo | machaca | No |
| Dulces | 1 | Vallas Serpiente | vallas (base) | Final añadido en tanda 4 |
| Dulces | 2 | Vuelo de Anillos | anillos (base) | No |
| Dulces | 3 | Pinta la Tarta | pinta | Sí (nueva) |
| Dulces | 4 | Fútbol de Gominola | futbol | Sí (nueva) |
| Dulces | 5 | Lluvia de Caramelos | recoge | No |
| Sueños | 1 | Globo de los Sueños | globo | Sí (nueva) |
| Sueños | 2 | Lluvia de Almohadas | esquiva (deriva) | No |
| Sueños | 3 | Caza de Mariposas | mariposas | Sí (nueva) |
| Sueños | 4 | Equilibrio sobre la Luna | equilibrio | Sí (nueva) |
| Sueños | 5 | El Reloj Derretido | superv/barrido | No |
| Volcán | 1 | Caída al Centro de la Tierra | caida (base) | Mejorada en tanda 4 |
| Volcán | 2 | El Suelo es Lava | superv/baldosas | No |
| Volcán | 3 | Chiles al Dragón | punteria | No |
| Volcán | 4 | Sumo en el Cráter | empuje | No |
| Volcán | 5 | Bolos de Lava | bolos | Sí (nueva) |

Rehechas o nuevas: 19 de 40.

## Mecánicas que siguen repetidas (para la fase B)
- **superv** ×5: Meteoritos y Cocos (lluvia, casi idénticas), Hielo y Suelo es Lava (baldosas, casi idénticas), Reloj (barrido, distinta en la práctica).
- **ritmo** ×2: Oasis y Ballenas.
- **machaca** ×2: Camellos y Caracoles.
- **empuje** ×2: Duna y Cráter (casi idénticas).
- **circuito** ×2: Karts y Trineo (el trineo resbala).
- **bolos** ×2: Nieve y Lava.
- **recoge** ×2: Cazaestrellas y Caramelos.
- **esquiva** ×2: Piñas y Almohadas.

## Puntos de la revisión
| Punto | Estado |
|---|---|
| Tirones de las nubes | Hecho: nubes opacas instanciadas (sesión anterior) + ahora acompañan a la cámara con parallax; los obstáculos (nubes, almohadas, vallas, aros) aparecen a 140 m dentro de la niebla en vez de a 80-90 m de golpe |
| Control lateral Sueños (Equilibrio, prueba 4) y Almohadas | Hecho y probado con toques reales (CDP): ⬅ ➡ llegan, cambian de carril / inclinación; Equilibrio responde más (fuerza 3,6→4,4) |
| Sin tristeza | Hecho en todas partes: olimpiadas, celebración común (core3d), podio de la tanda 4 (escena3d: los perdedores ahora aplauden) y choque en Anillos (cara aplastada, no triste) |
| Una sola celebración por prueba | Hecho: solo la celebración del escenario + panel de clasificación (fiesta.js) |
| Personajes no atraviesan el suelo | Hecho: decorado apoyado en el suelo; prueba de 40 pruebas: peor valor −0,020 (aplastado de aterrizaje, tolerancia −0,06), ninguno hundido |
| Escenarios detallados | Parcial: decorado instanciado rico por mundo (sesión anterior); falta pulir por prueba (fase B) |
