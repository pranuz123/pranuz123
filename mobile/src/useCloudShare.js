import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Optional connection to the CarTalk live-map relay. When enabled and given a
 * relay URL, this maintains a lightweight "publisher" WebSocket that the app
 * uses to push the sign currently on the car's screen — together with the
 * phone's GPS location — so it appears on the shared live map.
 *
 * Privacy: this is strictly opt-in (off by default). Nothing is published
 * unless the user turns sharing on AND a location is available. The relay
 * coarsens coordinates and stores no identity.
 *
 * @param {string|null} url    e.g. "ws://192.168.1.50:9090"; null/empty = off
 * @param {boolean} enabled    master opt-in switch
 */
export function useCloudShare(url, enabled) {
  const [status, setStatus] = useState('off'); // off | connecting | live | error
  const wsRef = useRef(null);
  const closedByUs = useRef(false);
  const retryRef = useRef(500);

  useEffect(() => {
    if (!enabled || !url) {
      setStatus('off');
      closedByUs.current = true;
      if (wsRef.current) wsRef.current.close();
      return undefined;
    }

    closedByUs.current = false;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setStatus('connecting');
      let ws;
      try {
        ws = new WebSocket(url);
      } catch {
        setStatus('error');
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        retryRef.current = 500;
        setStatus('live');
        ws.send(JSON.stringify({ type: 'hello', role: 'publisher', name: 'CarTalk' }));
      };
      ws.onerror = () => setStatus('error');
      ws.onclose = () => {
        if (closedByUs.current || cancelled) { setStatus('off'); return; }
        setStatus('connecting');
        const d = retryRef.current;
        retryRef.current = Math.min(d * 2, 5000);
        setTimeout(connect, d);
      };
    };
    connect();

    return () => {
      cancelled = true;
      closedByUs.current = true;
      if (wsRef.current) wsRef.current.close();
    };
  }, [url, enabled]);

  /** Publish a sign with location. No-ops unless connected and coords exist. */
  const publish = useCallback((sign, coords) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1 || !coords) return;
    ws.send(JSON.stringify({
      type: 'sign',
      lat: coords.lat,
      lng: coords.lng,
      heading: coords.heading,
      sign: { text: sign.text, emoji: sign.emoji, face: sign.face, priority: sign.priority },
    }));
  }, []);

  /** Remove our pin from the map (e.g., when the screen is cleared). */
  const retract = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'clear' }));
  }, []);

  return { status, publish, retract };
}
