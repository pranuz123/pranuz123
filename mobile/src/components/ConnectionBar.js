import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';

const LABELS = {
  idle: 'Offline',
  connecting: 'Connecting…',
  connected: 'Connected',
  error: 'Connection error',
};

const COLORS = {
  idle: theme.textDim,
  connecting: theme.accent,
  connected: theme.ok,
  error: theme.danger,
};

/** Persistent header showing link status, connected screen count, and settings. */
export default function ConnectionBar({ status, peers, host, onOpenSettings }) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: COLORS[status] || theme.textDim }]} />
        <View>
          <Text style={styles.status}>{LABELS[status] || status}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {host ? host : 'No server set'}
            {status === 'connected' ? `  •  ${peers.displays} screen${peers.displays === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.gear} onPress={onOpenSettings} accessibilityLabel="Settings">
        <Text style={styles.gearText}>⚙︎</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space + 4,
    paddingVertical: theme.space,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  status: { color: theme.text, fontSize: 16, fontWeight: '700' },
  sub: { color: theme.textDim, fontSize: 12, maxWidth: 240 },
  gear: { padding: 8 },
  gearText: { color: theme.text, fontSize: 22 },
});
