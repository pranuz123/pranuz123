import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EMERGENCY } from '../protocol';
import { theme } from '../theme';

/**
 * Emergency & hazard broadcasts. These are high-priority: they override the
 * screen, can't be bumped by a normal message, and stay up until cleared.
 *
 * Because they're disruptive, the panel is collapsed behind a single toggle so
 * it can't be triggered by accident, but it's always reachable in one extra tap
 * regardless of driving mode.
 */
export default function EmergencyRow({ onSend, connected }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen((o) => !o)} activeOpacity={0.8}>
        <Text style={styles.headerText}>🆘  Emergency & hazard</Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.grid}>
          {EMERGENCY.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.cell, !connected && styles.cellOff]}
              disabled={!connected}
              activeOpacity={0.7}
              onPress={() => onSend(m)}
            >
              <Text style={styles.cellEmoji}>{m.emoji}</Text>
              <Text style={styles.cellText} numberOfLines={2}>{m.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.surface, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.danger, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.space },
  headerText: { color: theme.danger, fontSize: 16, fontWeight: '800' },
  chevron: { color: theme.danger, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: theme.space, paddingTop: 0 },
  cell: { width: '48%', minHeight: 72, backgroundColor: theme.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: theme.danger, alignItems: 'center', justifyContent: 'center', padding: 8 },
  cellOff: { opacity: 0.4 },
  cellEmoji: { fontSize: 26 },
  cellText: { color: theme.text, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 4 },
});
