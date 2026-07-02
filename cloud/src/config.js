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
};
