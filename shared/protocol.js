/**
 * CarSign wire protocol — shared by the server and both clients.
 *
 * Transport: JSON text frames over a single WebSocket connection on the local
 * network. Every frame is an object with a `type` field; the remaining fields
 * depend on the type. This file is the single source of truth for those types
 * and for the shapes of the domain objects (messages, config) they carry.
 *
 * The mobile app keeps a copy at `mobile/src/protocol.js` because the React
 * Native bundler (Metro) does not reliably resolve imports from outside its
 * project root. Keep the two files in sync — they are intentionally identical.
 */

// Client -> Server ----------------------------------------------------------
const C2S = {
  HELLO: 'hello', // { role: 'display' | 'controller', name?: string }
  SEND: 'send', // { message: Message }        show now (respecting priority)
  CLEAR: 'clear', // {}                          clear the screen immediately
  SET_CONFIG: 'set_config', // { config: Partial<Config> }
  ENQUEUE: 'enqueue', // { message: Message }    add to the schedule queue
  DEQUEUE: 'dequeue', // { id: string }          remove a queued message
  CLEAR_QUEUE: 'clear_queue', // {}
  PING: 'ping', // {}
};

// Server -> Client ----------------------------------------------------------
const S2C = {
  WELCOME: 'welcome', // { clientId, config, current, queue, peers }
  DISPLAY: 'display', // { message: Message | null }  null == blank screen
  CONFIG: 'config', // { config: Config }
  QUEUE: 'queue', // { queue: Message[] }
  PEERS: 'peers', // { peers: { displays: number, controllers: number } }
  ERROR: 'error', // { message: string }
  PONG: 'pong', // {}
};

const ANIMATIONS = ['none', 'fade', 'scroll', 'pulse', 'blink'];

// Sensible, safety-first defaults. The server owns the authoritative copy and
// broadcasts changes to everyone.
const DEFAULT_CONFIG = {
  autoClearMs: 8000, // blank the screen this long after a message shows (0 = never)
  profanityFilter: true, // mask flagged words before they ever reach a screen
  maxLength: 60, // hard cap on message length
  minFontPx: 48, // display never renders text smaller than this
  freeTypeEnabled: true, // when false, controllers may only send presets
  brightness: 1, // 0..1 display dimmer
};

// The curated set of one-tap messages. `text` is what shows; `emoji` decorates.
const PRESETS = [
  { id: 'thanks', text: 'THANKS!', emoji: '🙏', animation: 'pulse' },
  { id: 'sorry', text: 'SORRY!', emoji: '😅', animation: 'fade' },
  { id: 'go-ahead', text: 'GO AHEAD', emoji: '👉', animation: 'scroll' },
  { id: 'after-you', text: 'AFTER YOU', emoji: '🙂', animation: 'fade' },
  { id: 'oops', text: 'MY BAD', emoji: '🤦', animation: 'fade' },
  { id: 'baby', text: 'BABY ON BOARD', emoji: '👶', animation: 'blink' },
  { id: 'brake', text: 'CHECK YOUR LIGHTS', emoji: '💡', animation: 'blink' },
  { id: 'love', text: 'HAVE A GREAT DAY', emoji: '☀️', animation: 'scroll' },
];

// Expressive animated faces rendered on the display as living, blinking CSS
// characters (the "emoji car" attention-grabber). `emoji` is the fallback shown
// on the phone's control button and if a display can't draw the face.
const FACES = [
  { id: 'happy', label: 'Happy', emoji: '🙂' },
  { id: 'laugh', label: 'Laughing', emoji: '😆' },
  { id: 'wink', label: 'Wink', emoji: '😉' },
  { id: 'love', label: 'Love', emoji: '😍' },
  { id: 'cool', label: 'Cool', emoji: '😎' },
  { id: 'surprised', label: 'Whoa', emoji: '😮' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'angry', label: 'Grr', emoji: '😠' },
  { id: 'sleepy', label: 'Sleepy', emoji: '😴' },
];
const FACE_IDS = new Set(FACES.map((f) => f.id));

// A curated palette of big, friendly emoji for one-tap reactions.
const EMOJI_GALLERY = [
  '👍', '🙏', '❤️', '😂', '😉', '😎', '🤩', '🥰', '😅', '🙌',
  '👏', '✌️', '🤝', '😮', '🎉', '☀️', '👋', '🫶', '💯', '🚗',
];

// High-priority, attention-grabbing messages. These use `priority: 'high'` so
// they override whatever is on screen and cannot be bumped by a normal message,
// and a long duration so they stay up until the driver clears them.
const EMERGENCY = [
  { id: 'e-help', text: 'HELP', emoji: '🆘', animation: 'blink', priority: 'high', durationMs: 600000 },
  { id: 'e-call911', text: 'CALL 911', emoji: '📞', animation: 'blink', priority: 'high', durationMs: 600000 },
  { id: 'e-medical', text: 'MEDICAL EMERGENCY', emoji: '🚑', animation: 'blink', priority: 'high', durationMs: 600000 },
  { id: 'e-baby', text: 'BABY IN CAR', emoji: '👶', animation: 'blink', priority: 'high', durationMs: 600000 },
  { id: 'e-hazard', text: 'HAZARD AHEAD', emoji: '⚠️', animation: 'blink', priority: 'high', durationMs: 60000 },
];

/**
 * Normalize an arbitrary payload into a valid Message. Never throws — callers
 * (especially the server, which sees untrusted input) rely on this to sanitize.
 */
function makeMessage(input = {}, cfg = DEFAULT_CONFIG) {
  const animation = ANIMATIONS.includes(input.animation) ? input.animation : 'none';
  const text = String(input.text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, cfg.maxLength);
  return {
    id: input.id || `m_${Math.random().toString(36).slice(2, 10)}`,
    text,
    emoji: typeof input.emoji === 'string' ? input.emoji.slice(0, 8) : '',
    face: FACE_IDS.has(input.face) ? input.face : '',
    animation,
    // duration <= 0 means "use the server's autoClear default"
    durationMs: Number.isFinite(input.durationMs) ? Math.max(0, input.durationMs) : 0,
    priority: input.priority === 'high' ? 'high' : 'normal',
    createdAt: input.createdAt || Date.now(),
  };
}

// CommonJS export — this copy is consumed by the Node server. The mobile app
// uses its own ES-module copy at mobile/src/protocol.js.
module.exports = {
  C2S, S2C, ANIMATIONS, DEFAULT_CONFIG, PRESETS, EMERGENCY, FACES, EMOJI_GALLERY, makeMessage,
};
