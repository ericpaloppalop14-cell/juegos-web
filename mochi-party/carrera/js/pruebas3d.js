import { run } from './core3d.js?v=o39';
const p = new URLSearchParams(location.search).get('p') || 'planetas';
const mod = await import(`./ev-${['planetas', 'vallas', 'caida', 'nado', 'anillos'].includes(p) ? p : 'planetas'}.js?v=o39`);
run(mod.default);
