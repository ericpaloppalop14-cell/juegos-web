import { run } from './core3d.js';
const p = new URLSearchParams(location.search).get('p') || 'planetas';
const mod = await import(`./ev-${['planetas', 'vallas', 'caida', 'nado'].includes(p) ? p : 'planetas'}.js?v=m2`);
run(mod.default);
