// SOLO PARA PRUEBAS (?localnet): imita PeerJS con BroadcastChannel entre pestañas del mismo navegador.
(function () {
  const bc = new BroadcastChannel('fakepeer'); const peers = new Map();
  class Emitter { constructor() { this.h = {}; } on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); } }
  class Conn extends Emitter { constructor(me, peer, cid) { super(); this.me = me; this.peer = peer; this.cid = cid; this.open = false; }
    send(d) { bc.postMessage({ k: 'data', to: this.peer, from: this.me, cid: this.cid, d: JSON.parse(JSON.stringify(d)) }); }
    close() { if (!this.open) return; this.open = false; bc.postMessage({ k: 'close', to: this.peer, from: this.me, cid: this.cid }); this.emit('close'); } }
  class Peer extends Emitter {
    constructor(id) { super(); if (typeof id !== 'string') id = 'anon-' + Math.random().toString(36).slice(2); this.id = id; this.conns = new Map();
      const q = 'q' + Math.random(); const onq = ev => { if (ev.data.k === 'taken?' && ev.data.id === id && peers.has(id)) bc.postMessage({ k: 'taken', q: ev.data.q }); }; bc.addEventListener('message', onq);
      let taken = false; const ont = ev => { if (ev.data.k === 'taken' && ev.data.q === q) taken = true; }; bc.addEventListener('message', ont);
      bc.postMessage({ k: 'taken?', id, q });
      setTimeout(() => { bc.removeEventListener('message', ont); if (taken) { this.emit('error', { type: 'unavailable-id' }); return; } peers.set(id, this); this.emit('open', id); }, 150);
      bc.addEventListener('message', this._m = ev => { const m = ev.data; if (m.to !== this.id) return;
        if (m.k === 'conn') { const c = new Conn(this.id, m.from, m.cid); c.open = true; this.conns.set(m.cid, c); this.emit('connection', c); bc.postMessage({ k: 'ack', to: m.from, from: this.id, cid: m.cid }); setTimeout(() => c.emit('open'), 0); }
        const c = this.conns.get(m.cid); if (!c) return;
        if (m.k === 'ack') { c.open = true; c.emit('open'); } if (m.k === 'data') c.emit('data', m.d); if (m.k === 'close') { c.open = false; c.emit('close'); } }); }
    connect(id) { const cid = Math.random().toString(36).slice(2); const c = new Conn(this.id, id, cid); this.conns.set(cid, c); bc.postMessage({ k: 'conn', to: id, from: this.id, cid });
      setTimeout(() => { if (!c.open) this.emit('error', { type: 'peer-unavailable' }); }, 3000); return c; }
    reconnect() { } destroy() { for (const c of this.conns.values()) c.close(); peers.delete(this.id); bc.removeEventListener('message', this._m); }
  }
  window.Peer = Peer;
})();
