import { run } from './core3d.js?v=m15';
const p = new URLSearchParams(location.search).get('p') || 'planetas';
const mod = await import(`./ev-${['planetas', 'vallas', 'caida', 'nado', 'anillos'].includes(p) ? p : 'planetas'}.js?v=m15`);
run(mod.default);
