/* CarTalk live map viewer.
   Connects to the relay as a 'viewer', renders each live sign as a pin, and
   adds/removes pins in real time as signs arrive and expire. */

(function () {
  'use strict';

  const S2C = { WELCOME: 'welcome', ADD: 'add', REMOVE: 'remove', PONG: 'pong' };

  const statusEl = document.getElementById('status');
  const countEl = document.getElementById('count');

  // Map centered on a neutral world view until the first sign arrives.
  const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([20, 0], 3);

  // Tile provider is configured by the deployer (see docs/SETUP.md); fetch it at
  // runtime so no key is hardcoded. Falls back to OSM only if the fetch fails.
  fetch('config.json')
    .then((r) => r.json())
    .then((cfg) => addTiles(cfg.tiles))
    .catch(() => addTiles({ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors' }));

  function addTiles(tiles) {
    L.tileLayer(tiles.url, { maxZoom: 19, attribution: tiles.attribution }).addTo(map);
  }

  const markers = new Map(); // sign id -> Leaflet marker
  let fittedOnce = false;

  function pinIcon(sign) {
    const glyph = sign.emoji || faceEmoji(sign.face) || '💬';
    const label = sign.text ? `<span class="label">${escapeHtml(sign.text)}</span>` : '';
    return L.divIcon({
      className: '',
      html: `<div class="sign-pin ${sign.kind}"><span class="glyph">${glyph}</span>${label}</div>`,
      iconSize: null,
      iconAnchor: [16, 16],
    });
  }

  function faceEmoji(face) {
    const map = {
      happy: '🙂', laugh: '😆', wink: '😉', love: '😍', cool: '😎',
      surprised: '😮', sad: '😢', angry: '😠', sleepy: '😴',
    };
    return face ? map[face] || '🙂' : '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function addSign(sign) {
    const existing = markers.get(sign.id);
    if (existing) map.removeLayer(existing);
    const marker = L.marker([sign.lat, sign.lng], { icon: pinIcon(sign) }).addTo(map);
    const when = new Date(sign.createdAt).toLocaleTimeString();
    marker.bindPopup(
      `<b>${escapeHtml(sign.name || 'A car')}</b><br>` +
      `${escapeHtml(sign.text || sign.emoji || sign.face || '')}<br>` +
      `<small>${sign.kind} · ${when}</small>`
    );
    markers.set(sign.id, marker);
    updateCount();
    // Zoom to the action the first time we see any sign.
    if (!fittedOnce) {
      map.setView([sign.lat, sign.lng], 14);
      fittedOnce = true;
    }
  }

  function removeSign(id) {
    const m = markers.get(id);
    if (m) { map.removeLayer(m); markers.delete(id); updateCount(); }
  }

  function updateCount() {
    countEl.textContent = String(markers.size);
  }

  // --- Live connection with auto-reconnect ---
  let ws = null;
  let delay = 500;

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}`);

    ws.onopen = () => {
      delay = 500;
      statusEl.textContent = 'Live';
      ws.send(JSON.stringify({ type: 'hello', role: 'viewer' }));
    };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === S2C.WELCOME) {
        markers.forEach((m) => map.removeLayer(m));
        markers.clear();
        (msg.signs || []).forEach(addSign);
      } else if (msg.type === S2C.ADD) {
        addSign(msg.sign);
      } else if (msg.type === S2C.REMOVE) {
        removeSign(msg.id);
      }
    };
    ws.onclose = () => {
      statusEl.textContent = 'Reconnecting…';
      setTimeout(connect, delay);
      delay = Math.min(delay * 2, 5000);
    };
    ws.onerror = () => ws.close();
  }

  connect();
})();
