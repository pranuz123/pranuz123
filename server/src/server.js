'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const config = require('./config');
const { C2S, S2C } = require('../../shared/protocol');
const { MessageManager } = require('./messageManager');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const manager = new MessageManager();

// --- Static file server for the display web page ---------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const httpServer = http.createServer((req, res) => {
  // A tiny health/info endpoint the mobile app can hit to confirm the address.
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, app: 'CarTalk', peers: peerCounts() }));
    return;
  }
  const urlPath = req.url === '/' ? '/index.html' : decodeURI(req.url.split('?')[0]);
  // Resolve inside PUBLIC_DIR and reject any path traversal attempt.
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

// --- WebSocket transport ----------------------------------------------------
const wss = new WebSocketServer({ server: httpServer });

function send(ws, type, payload = {}) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...payload }));
}

function broadcast(type, payload = {}, roleFilter) {
  const frame = JSON.stringify({ type, ...payload });
  for (const client of wss.clients) {
    if (client.readyState !== client.OPEN) continue;
    if (roleFilter && client.role !== roleFilter) continue;
    client.send(frame);
  }
}

function peerCounts() {
  let displays = 0;
  let controllers = 0;
  for (const c of wss.clients) {
    if (c.role === 'display') displays += 1;
    else if (c.role === 'controller') controllers += 1;
  }
  return { displays, controllers };
}

function broadcastPeers() {
  broadcast(S2C.PEERS, { peers: peerCounts() });
}

// Relay manager state changes to the right audience.
manager.on('display', (message) => broadcast(S2C.DISPLAY, { message }, 'display'));
manager.on('config', (cfg) => broadcast(S2C.CONFIG, { config: cfg }));
manager.on('queue', (queue) => broadcast(S2C.QUEUE, { queue }));

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.role = 'controller'; // assumed until a HELLO says otherwise
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send(ws, S2C.ERROR, { message: 'Invalid JSON frame.' });
    }
    try {
      handle(ws, msg);
    } catch (err) {
      send(ws, S2C.ERROR, { message: err.message || 'Request failed.' });
    }
  });

  ws.on('close', broadcastPeers);
});

function handle(ws, msg) {
  switch (msg.type) {
    case C2S.HELLO: {
      ws.role = msg.role === 'display' ? 'display' : 'controller';
      ws.name = String(msg.name || '').slice(0, 40);
      const { config: cfg, current, queue } = manager.getState();
      send(ws, S2C.WELCOME, { clientId: `c_${Date.now().toString(36)}`, config: cfg, current, queue, peers: peerCounts() });
      broadcastPeers();
      break;
    }
    case C2S.SEND:
      manager.send(msg.message || {}, { isPreset: !!msg.isPreset });
      break;
    case C2S.CLEAR:
      manager.clear();
      break;
    case C2S.SET_CONFIG:
      manager.setConfig(msg.config || {});
      break;
    case C2S.ENQUEUE:
      manager.enqueue(msg.message || {});
      break;
    case C2S.DEQUEUE:
      manager.dequeue(msg.id);
      break;
    case C2S.CLEAR_QUEUE:
      manager.clearQueue();
      break;
    case C2S.PING:
      send(ws, S2C.PONG);
      break;
    default:
      send(ws, S2C.ERROR, { message: `Unknown message type: ${msg.type}` });
  }
}

// Heartbeat: terminate connections that stop answering pings.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, config.heartbeatMs);
heartbeat.unref();

httpServer.listen(config.port, config.host, () => {
  console.log(`CarTalk server listening on http://${config.host}:${config.port}`);
  console.log(`  Display page:  open the above URL in the car screen's browser`);
  console.log(`  Mobile app:    connect to ws://<this-device-ip>:${config.port}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down…');
  wss.close();
  httpServer.close(() => process.exit(0));
});
