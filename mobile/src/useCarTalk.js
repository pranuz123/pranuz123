import { useCallback, useEffect, useRef, useState } from 'react';
import { C2S, S2C, DEFAULT_CONFIG } from './protocol';

/**
 * React hook that owns the WebSocket link to a CarTalk server on the local
 * network. Handles connect/reconnect, heartbeats, and mirrors server state.
 *
 * @param {string|null} url  e.g. "ws://192.168.4.1:8080". Null pauses the link.
 * @returns connection state plus action callbacks.
 */
export function useCarTalk(url) {
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [peers, setPeers] = useState({ displays: 0, controllers: 0 });
  const [lastError, setLastError] = useState(null);

  const wsRef = useRef(null);
  const retryRef = useRef(500);
  const closedByUs = useRef(false);
  const pingRef = useRef(null);

  const connect = useCallback(() => {
    if (!url) return;
    closedByUs.current = false;
    setStatus('connecting');
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      setStatus('error');
      setLastError(String(e.message || e));
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 500;
      setStatus('connected');
      setLastError(null);
      ws.send(JSON.stringify({ type: C2S.HELLO, role: 'controller', name: 'Driver phone' }));
      // Keep-alive so a dropped Wi-Fi link is noticed promptly.
      pingRef.current = setInterval(() => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: C2S.PING }));
      }, 15000);
    };

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      switch (msg.type) {
        case S2C.WELCOME:
          if (msg.config) setConfig(msg.config);
          setCurrent(msg.current || null);
          setQueue(msg.queue || []);
          if (msg.peers) setPeers(msg.peers);
          break;
        case S2C.DISPLAY: setCurrent(msg.message || null); break;
        case S2C.CONFIG: setConfig(msg.config); break;
        case S2C.QUEUE: setQueue(msg.queue || []); break;
        case S2C.PEERS: setPeers(msg.peers || { displays: 0, controllers: 0 }); break;
        case S2C.ERROR: setLastError(msg.message); break;
        default: break;
      }
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (closedByUs.current) { setStatus('idle'); return; }
      setStatus('connecting');
      const delay = retryRef.current;
      retryRef.current = Math.min(delay * 2, 5000);
      setTimeout(() => { if (!closedByUs.current) connect(); }, delay);
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      closedByUs.current = true;
      if (pingRef.current) clearInterval(pingRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = useCallback((type, payload = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type, ...payload }));
      return true;
    }
    setLastError('Not connected.');
    return false;
  }, []);

  // Public actions ----------------------------------------------------------
  const actions = {
    sendMessage: (message) => send(C2S.SEND, { message }),
    sendPreset: (preset) => send(C2S.SEND, { message: preset, isPreset: true }),
    clear: () => send(C2S.CLEAR),
    updateConfig: (partial) => send(C2S.SET_CONFIG, { config: partial }),
    enqueue: (message) => send(C2S.ENQUEUE, { message }),
    dequeue: (id) => send(C2S.DEQUEUE, { id }),
    clearQueue: () => send(C2S.CLEAR_QUEUE),
  };

  return { status, config, current, queue, peers, lastError, clearError: () => setLastError(null), ...actions };
}
