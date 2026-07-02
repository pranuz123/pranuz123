import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PRESETS } from '../protocol';
import { theme } from '../theme';

/** One-tap safe messages — the primary, glanceable control while driving. */
export default function PresetGrid({ onSend, disabled }) {
  return (
    <View style={styles.grid}>
      {PRESETS.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.cell, disabled && styles.cellDisabled]}
          activeOpacity={0.7}
          disabled={disabled}
          onPress={() => onSend(p)}
        >
          <Text style={styles.emoji}>{p.emoji}</Text>
          <Text style={styles.label} numberOfLines={2}>{p.text}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  cell: {
    width: '48%',
    minHeight: 92,
    backgroundColor: theme.surfaceAlt,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  cellDisabled: { opacity: 0.4 },
  emoji: { fontSize: 34 },
  label: { color: theme.text, fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 6 },
});
