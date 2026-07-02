'use strict';

const { EventEmitter } = require('events');
const { DEFAULT_CONFIG, makeMessage } = require('../../shared/protocol');
const profanity = require('./profanity');

/**
 * Owns all authoritative state and the rules around it. The transport layer
 * (server.js) is intentionally dumb: it forwards client intents here and
 * broadcasts whatever this emitter tells it to.
 *
 * Events:
 *   'display' (message|null) — the screen should now show this (null = blank)
 *   'config'  (config)       — config changed
 *   'queue'   (queue[])      — the scheduled queue changed
 */
class MessageManager extends EventEmitter {
  constructor() {
    super();
    this.config = { ...DEFAULT_CONFIG };
    this.current = null; // Message currently on screen, or null
    this.queue = []; // scheduled Messages waiting their turn
    this._clearTimer = null; // auto-clear timeout handle
  }

  getState() {
    return { config: this.config, current: this.current, queue: this.queue };
  }

  /**
   * Sanitize an inbound payload into a safe, display-ready Message. Applies the
   * profanity filter and enforces the minimum-length text rule. Returns null if
   * the message is empty after cleaning (nothing worth showing).
   */
  _sanitize(payload, { isPreset = false } = {}) {
    const msg = makeMessage(payload, this.config);
    if (!msg.text && !msg.emoji) return null;
    if (this.config.profanityFilter && !isPreset) {
      msg.text = profanity.filter(msg.text).clean;
    }
    return msg;
  }

  /** Show a message immediately (subject to priority + free-type policy). */
  send(payload, { isPreset = false } = {}) {
    if (!isPreset && !this.config.freeTypeEnabled) {
      throw new Error('Free typing is disabled. Use a preset message.');
    }
    // A normal-priority request never interrupts a high-priority message.
    if (this.current && this.current.priority === 'high' && payload.priority !== 'high') {
      throw new Error('A high-priority message is currently showing.');
    }
    const msg = this._sanitize(payload, { isPreset });
    if (!msg) throw new Error('Message is empty after filtering.');
    this._show(msg);
    return msg;
  }

  _show(msg) {
    this.current = msg;
    this.emit('display', msg);
    this._armAutoClear(msg);
  }

  /** Schedule the blank-out that keeps stale text off the road. */
  _armAutoClear(msg) {
    if (this._clearTimer) clearTimeout(this._clearTimer);
    this._clearTimer = null;
    // Per-message duration wins; otherwise fall back to the global autoClear.
    const ms = msg.durationMs > 0 ? msg.durationMs : this.config.autoClearMs;
    if (ms > 0) {
      this._clearTimer = setTimeout(() => this._onAutoClear(), ms);
      if (this._clearTimer.unref) this._clearTimer.unref();
    }
  }

  /** When a message times out, advance to the next queued item or go blank. */
  _onAutoClear() {
    this._clearTimer = null;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.emit('queue', this.queue);
      this._show(next);
    } else {
      this.clear();
    }
  }

  clear() {
    if (this._clearTimer) clearTimeout(this._clearTimer);
    this._clearTimer = null;
    this.current = null;
    this.emit('display', null);
  }

  enqueue(payload) {
    const msg = this._sanitize(payload);
    if (!msg) throw new Error('Message is empty after filtering.');
    this.queue.push(msg);
    this.emit('queue', this.queue);
    // If nothing is showing, promote it straight to the screen.
    if (!this.current) {
      this.queue.shift();
      this.emit('queue', this.queue);
      this._show(msg);
    }
    return msg;
  }

  dequeue(id) {
    const before = this.queue.length;
    this.queue = this.queue.filter((m) => m.id !== id);
    if (this.queue.length !== before) this.emit('queue', this.queue);
  }

  clearQueue() {
    if (this.queue.length) {
      this.queue = [];
      this.emit('queue', this.queue);
    }
  }

  /** Merge a partial config, clamping values into safe ranges. */
  setConfig(partial = {}) {
    const next = { ...this.config };
    if (Number.isFinite(partial.autoClearMs)) next.autoClearMs = clamp(partial.autoClearMs, 0, 120000);
    if (typeof partial.profanityFilter === 'boolean') next.profanityFilter = partial.profanityFilter;
    if (Number.isFinite(partial.maxLength)) next.maxLength = clamp(partial.maxLength, 1, 200);
    if (Number.isFinite(partial.minFontPx)) next.minFontPx = clamp(partial.minFontPx, 16, 400);
    if (typeof partial.freeTypeEnabled === 'boolean') next.freeTypeEnabled = partial.freeTypeEnabled;
    if (Number.isFinite(partial.brightness)) next.brightness = clamp(partial.brightness, 0.1, 1);
    this.config = next;
    this.emit('config', this.config);
    // A shorter auto-clear should apply to whatever is on screen right now.
    if (this.current) this._armAutoClear(this.current);
    return this.config;
  }
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

module.exports = { MessageManager };
