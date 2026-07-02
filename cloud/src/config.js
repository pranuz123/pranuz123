'use strict';

/** Cloud relay startup config. Defaults let `npm start` run locally as-is. */
module.exports = {
  port: Number(process.env.PORT) || 9090,
  host: process.env.HOST || '0.0.0.0',
  // Per-kind time-to-live (ms) for a pin before it fades from the map. A car
  // re-publishes to keep its pin alive; these bound how long a stale sign lingers.
  ttl: {
    hazard: Number(process.env.TTL_HAZARD) || 90000,
    message: Number(process.env.TTL_MESSAGE) || 25000,
    reaction: Number(process.env.TTL_REACTION) || 15000,
  },

  // Map tiles. IMPORTANT for commercial use: the default OpenStreetMap public
  // tile server is NOT licensed for commercial or heavy traffic. Before you
  // ship, set TILE_URL (and TILE_ATTRIBUTION) to a provider you have licensed —
  // e.g. MapTiler, Mapbox, Thunderforest — usually with an access token baked
  // into the URL template. See docs/SETUP.md.
  tiles: {
    url: process.env.TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: process.env.TILE_ATTRIBUTION || '© OpenStreetMap contributors',
    usingDefaultOsm: !process.env.TILE_URL,
  },
};
