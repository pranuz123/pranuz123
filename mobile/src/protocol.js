/**
 * CarSign wire protocol (mobile copy).
 *
 * This is an ES-module mirror of `shared/protocol.js`. It is duplicated here
 * because the React Native bundler (Metro) does not reliably resolve imports
 * from outside the mobile project root. Keep it in sync with the shared file.
 */

export const C2S = {
  HELLO: 'hello',
  SEND: 'send',
  CLEAR: 'clear',
  SET_CONFIG: 'set_config',
  ENQUEUE: 'enqueue',
  DEQUEUE: 'dequeue',
  CLEAR_QUEUE: 'clear_queue',
  PING: 'ping',
};

export const S2C = {
  WELCOME: 'welcome',
  DISPLAY: 'display',
  CONFIG: 'config',
  QUEUE: 'queue',
  PEERS: 'peers',
  ERROR: 'error',
  PONG: 'pong',
};

export const ANIMATIONS = ['none', 'fade', 'scroll', 'pulse', 'blink'];

export const DEFAULT_CONFIG = {
  autoClearMs: 8000,
  profanityFilter: true,
  maxLength: 60,
  minFontPx: 48,
  freeTypeEnabled: true,
  brightness: 1,
};

export const PRESETS = [
  { id: 'thanks', text: 'THANKS!', emoji: '🙏', animation: 'pulse' },
  { id: 'sorry', text: 'SORRY!', emoji: '😅', animation: 'fade' },
  { id: 'go-ahead', text: 'GO AHEAD', emoji: '👉', animation: 'scroll' },
  { id: 'after-you', text: 'AFTER YOU', emoji: '🙂', animation: 'fade' },
  { id: 'oops', text: 'MY BAD', emoji: '🤦', animation: 'fade' },
  { id: 'baby', text: 'BABY ON BOARD', emoji: '👶', animation: 'blink' },
  { id: 'brake', text: 'CHECK YOUR LIGHTS', emoji: '💡', animation: 'blink' },
  { id: 'love', text: 'HAVE A GREAT DAY', emoji: '☀️', animation: 'scroll' },
];
