/* CarSign rear-screen display client.
   Connects to the same host that served this page, renders incoming messages,
   auto-reconnects, and (optionally) captures the car's mic via the browser's
   Web Speech API so a message can be spoken from inside the vehicle. */

(function () {
  'use strict';

  // Protocol constants inlined to keep the display a single static bundle.
  const S2C = {
    WELCOME: 'welcome', DISPLAY: 'display', CONFIG: 'config',
    QUEUE: 'queue', PEERS: 'peers', ERROR: 'error', PONG: 'pong',
  };
  const C2S = { HELLO: 'hello', SEND: 'send' };

  const stage = document.getElementById('stage');
  const contentEl = document.getElementById('content');
  const emojiEl = document.getElementById('emoji');
  const textEl = document.getElementById('text');
  const faceEl = document.getElementById('face');
  const idle = document.getElementById('idle');
  const statusEl = document.getElementById('status');
  const hintEl = document.getElementById('hint');
  const micBtn = document.getElementById('micBtn');

  let ws = null;
  let reconnectDelay = 500; // grows on repeated failures, capped below
  let config = { minFontPx: 48, brightness: 1 };

  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}`;
  }

  function connect() {
    statusEl.textContent = 'Connecting…';
    ws = new WebSocket(wsUrl());

    ws.onopen = () => {
      reconnectDelay = 500;
      statusEl.textContent = 'Connected — waiting for messages';
      ws.send(JSON.stringify({ type: C2S.HELLO, role: 'display', name: 'Rear screen' }));
    };

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      handle(msg);
    };

    ws.onclose = () => {
      statusEl.textContent = 'Disconnected — reconnecting…';
      showIdle();
      // Exponential backoff up to 5s so a rebooting server is picked up quickly.
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 5000);
    };

    ws.onerror = () => ws.close();
  }

  function handle(msg) {
    switch (msg.type) {
      case S2C.WELCOME:
        if (msg.config) applyConfig(msg.config);
        render(msg.current || null);
        break;
      case S2C.DISPLAY:
        render(msg.message || null);
        break;
      case S2C.CONFIG:
        applyConfig(msg.config);
        break;
      case S2C.PEERS:
      case S2C.QUEUE:
      case S2C.PONG:
        break; // display doesn't act on these
      case S2C.ERROR:
        console.warn('CarSign:', msg.message);
        break;
    }
  }

  function applyConfig(cfg) {
    config = { ...config, ...cfg };
    document.documentElement.style.setProperty('--brightness', String(config.brightness ?? 1));
  }

  function render(message) {
    if (!message || (!message.text && !message.emoji && !message.face)) {
      showIdle();
      return;
    }
    idle.classList.add('hidden');

    // Animated face message — show the living character instead of text.
    if (message.face) {
      stage.classList.add('blank');
      showFace(message.face);
      return;
    }
    hideFace();

    stage.classList.remove('blank');
    emojiEl.textContent = message.emoji || '';
    textEl.textContent = message.text || '';
    // A message with an emoji but no words renders the emoji extra-large.
    contentEl.classList.toggle('emoji-only', !message.text && !!message.emoji);
    // Enforce the safety minimum font size while still fitting long text.
    fitText(message.text || '');
    // Restart the animation by toggling the attribute on the next frame.
    stage.dataset.animation = 'none';
    requestAnimationFrame(() => {
      stage.dataset.animation = message.animation || 'none';
    });
  }

  function showFace(expression) {
    faceEl.dataset.expression = expression;
    faceEl.hidden = false;
    // Restart the entrance animation on each new face.
    faceEl.style.animation = 'none';
    // eslint-disable-next-line no-unused-expressions
    faceEl.offsetHeight; // force reflow
    faceEl.style.animation = '';
  }

  function hideFace() {
    faceEl.hidden = true;
  }

  // Scale the text down for long messages but never below the configured floor.
  function fitText(text) {
    const len = text.length;
    let vmin = 18;
    if (len > 10) vmin = 14;
    if (len > 18) vmin = 11;
    if (len > 28) vmin = 8;
    const px = Math.max(config.minFontPx || 48, (Math.min(window.innerWidth, window.innerHeight) * vmin) / 100);
    textEl.style.fontSize = `${px}px`;
  }

  function showIdle() {
    stage.classList.add('blank');
    hideFace();
    idle.classList.remove('hidden');
  }

  // --- Car mic (Web Speech API) --------------------------------------------
  // Lets someone in the car speak a message that goes straight to the screen.
  function setupMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      hintEl.textContent = 'Voice input needs a Chromium-based browser.';
      return;
    }
    micBtn.hidden = false;
    const recog = new SR();
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    let listening = false;

    micBtn.addEventListener('click', () => {
      if (listening) { recog.stop(); return; }
      try { recog.start(); } catch { /* already starting */ }
    });

    recog.onstart = () => {
      listening = true;
      micBtn.classList.add('listening');
      micBtn.textContent = '🎤 Listening…';
    };
    recog.onend = () => {
      listening = false;
      micBtn.classList.remove('listening');
      micBtn.textContent = '🎤 Tap to speak';
    };
    recog.onerror = (e) => { hintEl.textContent = `Mic error: ${e.error}`; };
    recog.onresult = (e) => {
      const said = e.results[0][0].transcript.trim();
      if (said && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: C2S.SEND,
          message: { text: said, animation: 'fade' },
        }));
      }
    };
  }

  // Wake Lock keeps the kiosk screen from sleeping while the page is open.
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator) await navigator.wakeLock.request('screen');
    } catch { /* not critical */ }
  }

  connect();
  setupMic();
  keepAwake();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') keepAwake();
  });
})();
