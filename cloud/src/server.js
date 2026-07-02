'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const config = require('./config');
const { SignStore } = require('./signStore');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const store = new SignStore();

// --- Static server for the live map page -----------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, app: 'CarTalk Cloud', live: store.all().length }));
    return;
  }
  // Runtime config for the map page (tile provider is deployer-configured).
  if (req.url === '/config.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tiles: { url: config.tiles.url, attribution: config.tiles.attribution } }));
    return;
  }
  const urlPath = req.url === '/' ? '/map.html' : decodeURI(req.url.split('?')[0]);
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

// --- WebSocket relay --------------------------------------------------------
const wss = new WebSocketServer({ server: httpServer });

// Cloud protocol (distinct from the local screen protocol).
const C2S = { HELLO: 'hello', SIGN: 'sign', CLEAR: 'clear', PING: 'ping' };
const S2C = { WELCOME: 'welcome', ADD: 'add', REMOVE: 'remove', PONG: 'pong' };

function send(ws, type, payload = {}) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...payload }));
}

function broadcastViewers(type, payload) {
  const frame = JSON.stringify({ type, ...payload });
  for (const c of wss.clients) {
    if (c.readyState === c.OPEN && c.role === 'viewer') c.send(frame);
  }
}

store.on('add', (sign) => broadcastViewers(S2C.ADD, { sign }));
store.on('remove', (id) => broadcastViewers(S2C.REMOVE, { id }));

let seq = 0;

function kindOf(sign) {
  if (sign && sign.priority === 'high') return 'hazard';
  if (sign && (sign.face || (sign.emoji && !sign.text))) return 'reaction';
  return 'message';
}

// Round coordinates so we never store or expose a car's exact position.
function coarse(n) {
  return Math.round(Number(n) * 1e4) / 1e4; // ~11 m precision
}

wss.on('connection', (ws) => {
  ws.role = 'viewer';
  ws.pubId = `p${Date.now().toString(36)}_${(seq += 1)}`;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case C2S.HELLO:
        ws.role = msg.role === 'publisher' ? 'publisher' : 'viewer';
        ws.name = String(msg.name || '').slice(0, 40);
        if (ws.role === 'viewer') send(ws, S2C.WELCOME, { signs: store.all() });
        break;

      case C2S.SIGN: {
        if (ws.role !== 'publisher') return;
        const lat = Number(msg.lat);
        const lng = Number(msg.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return; // no location, no pin
        const s = msg.sign || {};
        const kind = kindOf(s);
        const now = Date.now();
        store.upsert({
          id: ws.pubId,
          name: ws.name || 'A car',
          text: String(s.text || '').slice(0, 60),
          emoji: String(s.emoji || '').slice(0, 8),
          face: String(s.face || '').slice(0, 16),
          kind,
          lat: coarse(lat),
          lng: coarse(lng),
          heading: Number.isFinite(msg.heading) ? Math.round(msg.heading) : null,
          createdAt: now,
          expiresAt: now + (config.ttl[kind] || config.ttl.message),
        });
        break;
      }

      case C2S.CLEAR:
        if (ws.role === 'publisher') store.remove(ws.pubId);
        break;

      case C2S.PING:
        send(ws, S2C.PONG);
        break;

      default:
        break;
    }
  });

  ws.on('close', () => {
    if (ws.role === 'publisher') store.remove(ws.pubId);
  });
});

httpServer.listen(config.port, config.host, () => {
  console.log(`CarTalk Cloud relay on http://${config.host}:${config.port}`);
  console.log(`  Live map:   open the above URL in a browser`);
  console.log(`  Publishers: connect the app to ws://<this-host>:${config.port}`);
  if (config.tiles.usingDefaultOsm) {
    console.warn(
      '\n  ⚠ Using the default OpenStreetMap tile server, which is NOT licensed\n' +
      '    for commercial or heavy use. Set TILE_URL/TILE_ATTRIBUTION to a\n' +
      '    licensed provider before production. See docs/SETUP.md.'
    );
  }
});

process.on('SIGINT', () => {
  wss.close();
  httpServer.close(() => process.exit(0));
});
