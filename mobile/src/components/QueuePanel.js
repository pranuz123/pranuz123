import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';

/** Shows what's live on the screen plus the scheduled queue, with quick edits. */
export default function QueuePanel({ current, queue, onClear, onDequeue, onClearQueue }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.nowRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>On screen now</Text>
          {current ? (
            <Text style={styles.nowText} numberOfLines={1}>
              {current.emoji ? `${current.emoji} ` : ''}{current.text || '—'}
            </Text>
          ) : (
            <Text style={styles.blank}>Screen is blank</Text>
          )}
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={onClear} disabled={!current}>
          <Text style={[styles.clearText, !current && { opacity: 0.4 }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {queue.length > 0 && (
        <>
          <View style={styles.queueHeader}>
            <Text style={styles.label}>Up next ({queue.length})</Text>
            <TouchableOpacity onPress={onClearQueue}>
              <Text style={styles.clearAll}>Clear all</Text>
            </TouchableOpacity>
          </View>
          {queue.map((m, i) => (
            <View key={m.id} style={styles.item}>
              <Text style={styles.idx}>{i + 1}</Text>
              <Text style={styles.itemText} numberOfLines={1}>
                {m.emoji ? `${m.emoji} ` : ''}{m.text}
              </Text>
              <TouchableOpacity onPress={() => onDequeue(m.id)} hitSlop={10}>
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.surface, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border, padding: theme.space },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: theme.textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  nowText: { color: theme.accent, fontSize: 20, fontWeight: '800' },
  blank: { color: theme.textDim, fontSize: 16, fontStyle: 'italic' },
  clearBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
  clearText: { color: theme.danger, fontWeight: '700' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 4 },
  clearAll: { color: theme.danger, fontSize: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
  idx: { color: theme.textDim, width: 18, textAlign: 'center', fontWeight: '700' },
  itemText: { color: theme.text, flex: 1, fontSize: 16 },
  remove: { color: theme.danger, fontSize: 18, paddingHorizontal: 6 },
});
