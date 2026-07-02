import React, { useState } from 'react';
import {
  Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { theme } from '../theme';

/** A stepper row: label with − / value / + controls, clamped to [min,max]. */
function Stepper({ label, value, min, max, step, format, onChange }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => set(value - step)}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepValue}>{format ? format(value) : value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => set(value + step)}>
          <Text style={styles.stepBtnText}>＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Full settings modal. Server address changes are applied via onSaveHost;
 * safety changes are pushed live to the server via onUpdateConfig.
 */
export default function SettingsScreen({ visible, onClose, host, onSaveHost, config, onUpdateConfig }) {
  const [draftHost, setDraftHost] = useState(host || '');

  const cfg = config || {};

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            <Text style={styles.sectionTitle}>Connection</Text>
            <Text style={styles.help}>
              Address of the car screen server on your local Wi-Fi. Include the port.
            </Text>
            <View style={styles.hostRow}>
              <TextInput
                style={styles.hostInput}
                value={draftHost}
                onChangeText={setDraftHost}
                placeholder="ws://192.168.4.1:8080"
                placeholderTextColor={theme.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity style={styles.saveBtn} onPress={() => onSaveHost(draftHost.trim())}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Safety</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Profanity filter</Text>
              <Switch
                value={!!cfg.profanityFilter}
                onValueChange={(v) => onUpdateConfig({ profanityFilter: v })}
                trackColor={{ true: theme.accent }}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Allow free typing</Text>
              <Switch
                value={!!cfg.freeTypeEnabled}
                onValueChange={(v) => onUpdateConfig({ freeTypeEnabled: v })}
                trackColor={{ true: theme.accent }}
              />
            </View>
            <Text style={styles.help}>
              Turn off to restrict the app to preset messages only — useful for a
              hands-light setup while moving.
            </Text>

            <Stepper
              label="Auto-clear after"
              value={cfg.autoClearMs ?? 8000}
              min={0}
              max={60000}
              step={1000}
              format={(v) => (v === 0 ? 'Never' : `${v / 1000}s`)}
              onChange={(v) => onUpdateConfig({ autoClearMs: v })}
            />

            <Stepper
              label="Min font size"
              value={cfg.minFontPx ?? 48}
              min={24}
              max={200}
              step={8}
              format={(v) => `${v}px`}
              onChange={(v) => onUpdateConfig({ minFontPx: v })}
            />

            <Stepper
              label="Max message length"
              value={cfg.maxLength ?? 60}
              min={10}
              max={140}
              step={10}
              format={(v) => `${v} chars`}
              onChange={(v) => onUpdateConfig({ maxLength: v })}
            />

            <Stepper
              label="Screen brightness"
              value={Math.round((cfg.brightness ?? 1) * 100)}
              min={10}
              max={100}
              step={10}
              format={(v) => `${v}%`}
              onChange={(v) => onUpdateConfig({ brightness: v / 100 })}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: theme.text, fontSize: 22, fontWeight: '800' },
  close: { color: theme.accent, fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: theme.text, fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  help: { color: theme.textDim, fontSize: 13, marginBottom: 10, lineHeight: 18 },
  hostRow: { flexDirection: 'row', gap: 8 },
  hostInput: { flex: 1, color: theme.text, backgroundColor: theme.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, height: 48, fontSize: 15 },
  saveBtn: { paddingHorizontal: 18, height: 48, borderRadius: 10, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: theme.accentText, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border },
  rowLabel: { color: theme.text, fontSize: 16, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: theme.text, fontSize: 22, fontWeight: '700' },
  stepValue: { color: theme.accent, fontSize: 15, fontWeight: '700', minWidth: 64, textAlign: 'center' },
});
