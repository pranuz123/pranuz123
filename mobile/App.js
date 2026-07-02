import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

import ConnectionBar from './src/components/ConnectionBar';
import PresetGrid from './src/components/PresetGrid';
import Composer from './src/components/Composer';
import QueuePanel from './src/components/QueuePanel';
import SettingsScreen from './src/screens/SettingsScreen';
import { useCarSign } from './src/useCarSign';
import { theme } from './src/theme';

// Optional persistence — falls back to in-memory if the module isn't linked.
let AsyncStorage = null;
try {
  // eslint-disable-next-line global-require
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = null;
}
const HOST_KEY = 'carsign.host';

export default function App() {
  const [host, setHost] = useState('');
  const [loadedHost, setLoadedHost] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load the last-used server address on first launch.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = AsyncStorage ? await AsyncStorage.getItem(HOST_KEY) : null;
        if (alive && saved) setHost(saved);
      } finally {
        if (alive) setLoadedHost(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const cs = useCarSign(host || null);

  const saveHost = async (value) => {
    setHost(value);
    if (AsyncStorage) { try { await AsyncStorage.setItem(HOST_KEY, value); } catch { /* ignore */ } }
    setSettingsOpen(false);
  };

  const freeTypeDisabled = !cs.config.freeTypeEnabled;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.surface} />
      <ConnectionBar
        status={cs.status}
        peers={cs.peers}
        host={host}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {cs.lastError ? (
        <TouchableOpacity style={styles.errorBar} onPress={cs.clearError}>
          <Text style={styles.errorText}>{cs.lastError}  (tap to dismiss)</Text>
        </TouchableOpacity>
      ) : null}

      {!host && loadedHost ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🚗💬</Text>
          <Text style={styles.emptyTitle}>Connect to your car screen</Text>
          <Text style={styles.emptyBody}>
            Open Settings and enter the address shown on the screen when the
            CarSign server starts, e.g. ws://192.168.4.1:8080
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setSettingsOpen(true)}>
            <Text style={styles.emptyBtnText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <QueuePanel
              current={cs.current}
              queue={cs.queue}
              onClear={cs.clear}
              onDequeue={cs.dequeue}
              onClearQueue={cs.clearQueue}
            />

            <Text style={styles.heading}>Quick messages</Text>
            <PresetGrid onSend={cs.sendPreset} disabled={cs.status !== 'connected'} />

            <Text style={styles.heading}>Compose</Text>
            <Composer
              onSend={cs.sendMessage}
              onEnqueue={cs.enqueue}
              disabled={freeTypeDisabled || cs.status !== 'connected'}
              maxLength={cs.config.maxLength || 60}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <SettingsScreen
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        host={host}
        onSaveHost={saveHost}
        config={cs.config}
        onUpdateConfig={cs.updateConfig}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.space, gap: 8 },
  heading: { color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 14, marginBottom: 4 },
  errorBar: { backgroundColor: theme.danger, paddingHorizontal: 14, paddingVertical: 8 },
  errorText: { color: '#fff', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginTop: 16 },
  emptyBody: { color: theme.textDim, fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  emptyBtn: { marginTop: 22, backgroundColor: theme.accent, paddingHorizontal: 26, paddingVertical: 14, borderRadius: 12 },
  emptyBtnText: { color: theme.accentText, fontSize: 16, fontWeight: '800' },
});
