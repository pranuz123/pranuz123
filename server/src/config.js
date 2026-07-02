'use strict';

/**
 * Server startup configuration, sourced from environment variables with safe
 * defaults so `npm start` works out of the box on a Raspberry Pi kiosk.
 */
module.exports = {
  // Single port serves both the display web page (HTTP) and the WebSocket.
  port: Number(process.env.PORT) || 8080,
  host: process.env.HOST || '0.0.0.0',
  // Drop a client that hasn't answered a heartbeat within this window.
  heartbeatMs: Number(process.env.HEARTBEAT_MS) || 30000,
};
