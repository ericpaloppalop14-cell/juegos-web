// v33: bolsa barajada por jugador. Todos los objetos tienen exactamente la misma probabilidad (sin depender de la
// posición): cada bolsa contiene una vez cada objeto, se baraja (Fisher-Yates con crypto) y se va vaciando.
// Así no hay rachas ni repeticiones seguidas (tampoco entre el final de una bolsa y el principio de la siguiente).
const C = typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues ? globalThis.crypto : null;
const buf = new Uint32Array(1);
export function rnd(n) { // entero uniforme en [0, n) sin sesgo de módulo
  if (!C) return Math.floor(Math.random() * n);
  const lim = Math.floor(0x100000000 / n) * n; let x;
  do { C.getRandomValues(buf); x = buf[0]; } while (x >= lim);
  return x % n;
}
export function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function drawFromBag(state, keys) {
  if (!state.bag || !state.bag.length || state.bagKeys !== keys.join()) {
    state.bag = shuffle(keys.slice()); state.bagKeys = keys.join();
    if (state.last && state.bag.length > 1 && state.bag[state.bag.length - 1] === state.last) { const j = rnd(state.bag.length - 1); [state.bag[j], state.bag[state.bag.length - 1]] = [state.bag[state.bag.length - 1], state.bag[j]]; }
  }
  return (state.last = state.bag.pop());
}
