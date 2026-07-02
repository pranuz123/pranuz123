import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { DRIVE_MODES } from '../useDriveState';
import { theme } from '../theme';
import { useVoice } from '../voice';

const MODE_META = {
  [DRIVE_MODES.PARKED]: { emoji: '🅿️', color: theme.ok, title: 'Parked' },
  [DRIVE_MODES.MOVING]: { emoji: '🚗', color: theme.accent, title: 'Moving' },
  [DRIVE_MODES.FAST]: { emoji: '💨', color: theme.danger, title: 'Fast' },
};

/**
 * Shows the current driving mode (from GPS speed) and what it permits, offers a
 * passenger override that unlocks full control, and — while moving — a
 * hands-free "hold to speak" button that sends dictated text straight to the
 * screen without any typing.
 */
export default function DriveStatusBar({
  mode, restrictions, speedKmh, gpsAvailable, gpsPermission,
  lockEnabled, passengerMode, onTogglePassenger, connected, onVoiceSend,
}) {
  const meta = MODE_META[mode] || MODE_META[DRIVE_MODES.PARKED];

  // Hands-free voice is offered only while moving (parked uses the composer;
  // fast is presets-only). On a final transcript we send immediately.
  const voice = useVoice((finalText) => {
    if (finalText && connected) onVoiceSend({ text: finalText, animation: 'fade' });
  });
  const showHandsFree = lockEnabled && restrictions.voice && !restrictions.typing && voice.available;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.badge, { borderColor: meta.color }]}>
          <Text style={styles.badgeEmoji}>{meta.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {lockEnabled ? restrictions.label : 'Safety lock off'}
            {lockEnabled && gpsAvailable ? `  •  ${speedKmh} km/h` : ''}
          </Text>
          <Text style={styles.sub}>
            {!lockEnabled
              ? 'All controls available'
              : gpsAvailable
                ? 'Auto-adjusting to your speed'
                : gpsPermission === 'granted'
                  ? 'Waiting for GPS…'
                  : 'Location off — assuming moving'}
          </Text>
        </View>
        <View style={styles.passenger}>
          <Text style={styles.passengerLabel}>Passenger</Text>
          <Switch
            value={passengerMode}
            onValueChange={onTogglePassenger}
            trackColor={{ true: theme.accent }}
          />
        </View>
      </View>

      {showHandsFree && (
        <TouchableOpacity
          style={[styles.voiceBtn, voice.listening && styles.voiceBtnOn]}
          onPress={() => (voice.listening ? voice.stop() : voice.start())}
        >
          <Text style={styles.voiceText}>
            {voice.listening ? '⏹  Listening… tap to send' : '🎤  Hands-free — tap to speak'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.surface, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border, padding: theme.space },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeEmoji: { fontSize: 22 },
  title: { color: theme.text, fontSize: 16, fontWeight: '800' },
  sub: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  passenger: { alignItems: 'center' },
  passengerLabel: { color: theme.textDim, fontSize: 11, marginBottom: 2 },
  voiceBtn: { marginTop: 12, height: 52, borderRadius: 12, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  voiceBtnOn: { backgroundColor: theme.danger, borderColor: theme.danger },
  voiceText: { color: theme.text, fontSize: 16, fontWeight: '700' },
});
