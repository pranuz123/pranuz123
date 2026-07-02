import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FACES, EMOJI_GALLERY } from '../protocol';
import { theme } from '../theme';

/**
 * The customer-attracting panel: tap an animated face to make the car screen
 * come alive with a big blinking expression, or fling a giant emoji. Both send
 * as presets (curated, no free text) so they work in every driving mode.
 */
export default function FacesGallery({ onSendFace, onSendEmoji, disabled }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sub}>Animated faces</Text>
      <View style={styles.grid}>
        {FACES.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.faceCell, disabled && styles.off]}
            disabled={disabled}
            activeOpacity={0.7}
            onPress={() => onSendFace(f)}
          >
            <Text style={styles.faceEmoji}>{f.emoji}</Text>
            <Text style={styles.faceLabel}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sub}>Big emoji</Text>
      <View style={styles.emojiWrap}>
        {EMOJI_GALLERY.map((e) => (
          <TouchableOpacity
            key={e}
            style={[styles.emojiCell, disabled && styles.off]}
            disabled={disabled}
            activeOpacity={0.7}
            onPress={() => onSendEmoji(e)}
          >
            <Text style={styles.emojiChar}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.surface, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border, padding: theme.space },
  sub: { color: theme.textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  faceCell: {
    width: '31%', minHeight: 78, backgroundColor: theme.surfaceAlt, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  off: { opacity: 0.4 },
  faceEmoji: { fontSize: 32 },
  faceLabel: { color: theme.textDim, fontSize: 11, marginTop: 4, fontWeight: '600' },
  emojiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiCell: {
    width: 52, height: 52, backgroundColor: theme.surfaceAlt, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center',
  },
  emojiChar: { fontSize: 28 },
});
