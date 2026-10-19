/* Single-player transport: the existing GameEngine and CPUs run in this tab. */
(function (root) {
  'use strict';
  class LocalOnline {
    constructor({ onState, onInfo, onError, onClosed }) {
      Object.assign(this, { onState, onInfo, onError, onClosed });
      this.ready = false;
      this.room = null;
      this.isHost = true;
      this.id = '';
      this.clock = null;
    }
    async create(name) {
      this.disconnect();
      this.id = 'solo-' + root.crypto.randomUUID();
      this.room = root.GameEngine.create('SOLO123', this.id, String(name || 'プレイヤー').slice(0, 14));
      // A solo match starts as one human plus three CPU opponents.
      for (let i = 0; i < 3; i++) {
        root.GameEngine.apply(this.room, this.id, { type: 'bot', action: 'add' });
      }
      this.ready = true;
      this.onInfo('ソロ対戦（通信不要）');
      this._broadcast();
      this.clock = setInterval(() => {
        if (!this.room) return;
        root.GameEngine.settle(this.room);
        this._broadcast();
      }, 950);
      return this.room.code;
    }
    join() {
      return Promise.reject(Error('ソロ対戦に他の端末から参加することはできません'));
    }
    _broadcast() {
      if (!this.ready || !this.room) return;
      const view = root.GameEngine.view(this.room, this.id);
      if (view) this.onState(view);
    }
    act(action) {
      if (!this.ready || !this.room) throw Error('ソロ対戦が開始されていません');
      root.GameEngine.apply(this.room, this.id, action);
      this._broadcast();
    }
    disconnect() {
      if (this.clock !== null) clearInterval(this.clock);
      this.clock = null;
      this.room = null;
      this.ready = false;
    }
  }
  root.LocalOnline = LocalOnline;
})(typeof window !== 'undefined' ? window : globalThis);
