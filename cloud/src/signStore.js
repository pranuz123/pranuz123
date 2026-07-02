'use strict';

const { EventEmitter } = require('events');

/**
 * In-memory store of the signs currently "live" on the map.
 *
 * Keyed by publisher id (one car → one active pin), so a car's newest sign
 * replaces its previous one rather than piling up. Each sign has a TTL; when it
 * expires it's removed and the map is told, which is what makes the map feel
 * live. A car keeps its pin alive by re-publishing (the app does this while a
 * message is on its screen).
 *
 * Nothing here is persisted — this is a real-time relay, not a database.
 *
 * Events: 'add' (sign), 'remove' (id).
 */
class SignStore extends EventEmitter {
  constructor() {
    super();
    this.signs = new Map(); // publisherId -> sign
    this.timers = new Map(); // publisherId -> timeout handle
  }

  all() {
    return [...this.signs.values()];
  }

  /** Insert or replace a publisher's sign and (re)arm its expiry. */
  upsert(sign) {
    const existing = this.timers.get(sign.id);
    if (existing) clearTimeout(existing);
    this.signs.set(sign.id, sign);
    const ms = Math.max(250, sign.expiresAt - Date.now());
    const t = setTimeout(() => this.remove(sign.id), ms);
    if (t.unref) t.unref();
    this.timers.set(sign.id, t);
    this.emit('add', sign);
  }

  remove(id) {
    const t = this.timers.get(id);
    if (t) clearTimeout(t);
    this.timers.delete(id);
    if (this.signs.delete(id)) this.emit('remove', id);
  }
}

module.exports = { SignStore };
