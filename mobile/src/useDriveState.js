import { useEffect, useRef, useState } from 'react';

/**
 * Speed-aware safety lock + accelerometer auto-reactions — CarSign's flagship
 * differentiators. This turns the app from a novelty into a device that adapts
 * to how the car is actually moving.
 *
 * It reads the phone's GPS speed and derives a *driving mode*:
 *   - parked  (~0):        full control, free typing allowed
 *   - moving  (< fastKmh): presets + hands-free voice only
 *   - fast    (>= fastKmh): presets only, no composing
 *
 * It also watches the accelerometer for a hard-braking spike and, when enabled,
 * fires `onHardBrake` so the app can auto-flash "SORRY!" to the car behind.
 *
 * Both sensors are optional. `expo-location` and `expo-sensors` work in Expo Go,
 * but if they're missing (or permission is denied) the hook degrades to a safe
 * default and reports what's available so the UI can explain itself.
 */

let Location = null;
let Sensors = null;
try {
  // eslint-disable-next-line global-require
  Location = require('expo-location');
} catch { Location = null; }
try {
  // eslint-disable-next-line global-require
  Sensors = require('expo-sensors');
} catch { Sensors = null; }

export const DRIVE_MODES = { PARKED: 'parked', MOVING: 'moving', FAST: 'fast' };

/** What each mode permits. The UI reads this to enable/disable controls. */
export function driveRestrictions(mode) {
  switch (mode) {
    case DRIVE_MODES.FAST:
      return { typing: false, voice: false, presets: true, label: 'Fast — presets only' };
    case DRIVE_MODES.MOVING:
      return { typing: false, voice: true, presets: true, label: 'Moving — voice & presets' };
    case DRIVE_MODES.PARKED:
    default:
      return { typing: true, voice: true, presets: true, label: 'Parked — full control' };
  }
}

export function useDriveState({
  enabled = true,
  passengerMode = false,
  movingKmh = 5,
  fastKmh = 40,
  autoReact = true,
  onHardBrake,
}) {
  const [speedKmh, setSpeedKmh] = useState(0);
  const [coords, setCoords] = useState(null); // { lat, lng, heading } | null
  const [gps, setGps] = useState({ available: false, permission: 'unknown' });
  const [accelAvailable, setAccelAvailable] = useState(false);

  const onBrakeRef = useRef(onHardBrake);
  onBrakeRef.current = onHardBrake;
  const lastBrakeRef = useRef(0);
  const movingRef = useRef(false); // gates brake detection to when we're rolling

  // --- GPS speed ------------------------------------------------------------
  useEffect(() => {
    if (!enabled || !Location) {
      setGps({ available: false, permission: Location ? 'unknown' : 'unsupported' });
      return undefined;
    }
    let sub = null;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setGps({ available: false, permission: status });
          return;
        }
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 1000, distanceInterval: 1 },
          (loc) => {
            // coords.speed is m/s, or -1/undefined when unknown.
            const mps = loc.coords.speed;
            const kmh = mps && mps > 0 ? mps * 3.6 : 0;
            setSpeedKmh(kmh);
            setCoords({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              heading: Number.isFinite(loc.coords.heading) ? loc.coords.heading : null,
            });
            movingRef.current = kmh >= movingKmh;
          }
        );
        setGps({ available: true, permission: 'granted' });
      } catch {
        setGps({ available: false, permission: 'error' });
      }
    })();
    return () => {
      cancelled = true;
      if (sub && sub.remove) sub.remove();
    };
  }, [enabled, movingKmh]);

  // --- Accelerometer hard-brake detection -----------------------------------
  useEffect(() => {
    if (!enabled || !autoReact || !Sensors || !Sensors.Accelerometer) {
      setAccelAvailable(false);
      return undefined;
    }
    const Accelerometer = Sensors.Accelerometer;
    setAccelAvailable(true);
    Accelerometer.setUpdateInterval(200);
    // At rest total acceleration magnitude ≈ 1g. A hard brake produces a spike;
    // we treat a sustained deviation as a braking event. This is a heuristic —
    // phone orientation isn't calibrated — so we also require that GPS says we
    // were moving, and we debounce to avoid repeats from a single stop.
    const BRAKE_G = 1.35;
    const COOLDOWN_MS = 6000;
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (magnitude < BRAKE_G) return;
      if (!movingRef.current) return;
      const now = Date.now();
      if (now - lastBrakeRef.current < COOLDOWN_MS) return;
      lastBrakeRef.current = now;
      if (onBrakeRef.current) onBrakeRef.current();
    });
    return () => sub && sub.remove();
  }, [enabled, autoReact]);

  // --- Derive the effective mode -------------------------------------------
  let mode;
  if (!enabled || passengerMode) {
    mode = DRIVE_MODES.PARKED; // lock off, or a passenger is driving the app
  } else if (!gps.available) {
    mode = DRIVE_MODES.MOVING; // can't measure speed → assume moving, stay safe
  } else if (speedKmh >= fastKmh) {
    mode = DRIVE_MODES.FAST;
  } else if (speedKmh >= movingKmh) {
    mode = DRIVE_MODES.MOVING;
  } else {
    mode = DRIVE_MODES.PARKED;
  }

  return {
    mode,
    restrictions: driveRestrictions(mode),
    speedKmh: Math.round(speedKmh),
    coords,
    gpsAvailable: gps.available,
    gpsPermission: gps.permission,
    accelAvailable,
    sensorsSupported: !!Location,
  };
}
