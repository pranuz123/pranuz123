/**
 * Thin wrapper around on-device speech-to-text for the phone mic.
 *
 * Uses `@react-native-voice/voice` when it is available (a custom dev build or
 * production build). In Expo Go — where the native module isn't linked — this
 * degrades gracefully: `isAvailable()` returns false and the UI falls back to
 * manual text entry instead of crashing.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

let Voice = null;
try {
  // Lazy require so a missing native module doesn't crash the bundle at import.
  // eslint-disable-next-line global-require
  Voice = require('@react-native-voice/voice').default;
} catch {
  Voice = null;
}

export function isVoiceAvailable() {
  return !!Voice;
}

/**
 * Hook exposing { available, listening, partial, start, stop }.
 * @param onFinal called with the final transcript string when recognition ends.
 */
export function useVoice(onFinal) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const finalRef = useRef('');

  useEffect(() => {
    if (!Voice) return undefined;
    Voice.onSpeechStart = () => { finalRef.current = ''; setListening(true); };
    Voice.onSpeechEnd = () => setListening(false);
    Voice.onSpeechError = () => setListening(false);
    Voice.onSpeechPartialResults = (e) => {
      const t = e.value && e.value[0];
      if (t) setPartial(t);
    };
    Voice.onSpeechResults = (e) => {
      const t = e.value && e.value[0];
      if (t) { finalRef.current = t; onFinal && onFinal(t); }
    };
    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, [onFinal]);

  const start = useCallback(async () => {
    if (!Voice) return;
    setPartial('');
    try { await Voice.start('en-US'); } catch { setListening(false); }
  }, []);

  const stop = useCallback(async () => {
    if (!Voice) return;
    try { await Voice.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  return { available: !!Voice, listening, partial, start, stop };
}
