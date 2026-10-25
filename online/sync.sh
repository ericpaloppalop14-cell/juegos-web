#!/bin/sh
# Copia el cliente online común a cada juego (para que también vaya dentro de los APK)
cd "$(dirname "$0")/.."
for d in mochi mochi-party/carrera mochi-racers flappy-ghost mochi-esquiva mochi-olimpiadas pegoton-arena tierra-que-se-hunde operacion-en-la-frente pompotropa; do
  cp online/online-cf.js online/online-config.js "$d/"
done
