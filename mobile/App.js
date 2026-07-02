import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

import ConnectionBar from './src/components/ConnectionBar';
import DriveStatusBar from './src/components/DriveStatusBar';
import PresetGrid from './src/components/PresetGrid';
import FacesGallery from './src/components/FacesGallery';
import Composer from './src/components/Composer';
import QueuePanel from './src/components/QueuePanel';
import EmergencyRow from './src/components/EmergencyRow';
import SettingsScreen from './src/screens/SettingsScreen';
import { useCarTalk } from './src/useCarTalk';
import { useDriveState } from './src/useDriveState';
import { useCloudShare } from './src/useCloudShare';
import { PRESETS } from './src/protocol';
import { theme } from './src/theme';

// Optional persistence — falls back to in-memory if the module isn't linked.
let AsyncStorage = null;
try {
  // eslint-disable-next-line global-require
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = null;
}
const HOST_KEY = 'cartalk.host';
const APP_KEY = 'cartalk.app';

// Phone-local settings (the driving lock is driven by this phone's sensors, so
// it isn't part of the shared server config).
const DEFAULT_APP = {
  driveLock: true, autoReact: true, movingKmh: 5, fastKmh: 40,
  cloudShare: false, cloudUrl: '',
};

const SORRY = PRESETS.find((p) => p.id === 'sorry');

export default function App() {
  const [host, setHost] = useState('');
  const [appCfg, setAppCfg] = useState(DEFAULT_APP);
  const [loaded, setLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passengerMode, setPassengerMode] = useState(false); // in-memory only

  // Load persisted host + app settings on first launch.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (AsyncStorage) {
          const [savedHost, savedApp] = await Promise.all([
            AsyncStorage.getItem(HOST_KEY),
            AsyncStorage.getItem(APP_KEY),
          ]);
          if (alive && savedHost) setHost(savedHost);
          if (alive && savedApp) setAppCfg({ ...DEFAULT_APP, ...JSON.parse(savedApp) });
        }
      } catch { /* ignore */ } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const cs = useCarTalk(host || null);
  const connected = cs.status === 'connected';

  // Auto-reaction: a detected hard brake flashes SORRY! to the car behind.
  const handleHardBrake = useCallback(() => {
    if (connected && SORRY) cs.sendPreset(SORRY);
  }, [connected, cs]);

  const drive = useDriveState({
    enabled: appCfg.driveLock,
    passengerMode,
    movingKmh: appCfg.movingKmh,
    fastKmh: appCfg.fastKmh,
    autoReact: appCfg.autoReact,
    onHardBrake: handleHardBrake,
  });

  // Live-map sharing (opt-in). Publish whatever is on the screen, with location.
  const cloud = useCloudShare(appCfg.cloudUrl || null, appCfg.cloudShare);
  const lastPublished = useRef(null);
  useEffect(() => {
    const cur = cs.current;
    if (!appCfg.cloudShare) return;
    if (cur && cur.id !== lastPublished.current) {
      lastPublished.current = cur.id;
      cloud.publish(cur, drive.coords);
    } else if (!cur && lastPublished.current) {
      lastPublished.current = null;
      cloud.retract();
    }
  }, [cs.current, appCfg.cloudShare, cloud, drive.coords]);

  const saveHost = async (value) => {
    setHost(value);
    if (AsyncStorage) { try { await AsyncStorage.setItem(HOST_KEY, value); } catch { /* ignore */ } }
    setSettingsOpen(false);
  };

  const updateApp = async (partial) => {
    const next = { ...appCfg, ...partial };
    setAppCfg(next);
    if (AsyncStorage) { try { await AsyncStorage.setItem(APP_KEY, JSON.stringify(next)); } catch { /* ignore */ } }
  };

  // Effective control gating: the server's free-type lock AND the driving mode.
  const serverLocked = !cs.config.freeTypeEnabled;
  const composerDisabled = !connected || serverLocked || !drive.restrictions.typing;

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

      {!host && loaded ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🚗💬</Text>
          <Text style={styles.emptyTitle}>Connect to your car screen</Text>
          <Text style={styles.emptyBody}>
            Open Settings and enter the address shown on the screen when the
            CarTalk server starts, e.g. ws://192.168.4.1:8080
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
            <DriveStatusBar
              mode={drive.mode}
              restrictions={drive.restrictions}
              speedKmh={drive.speedKmh}
              gpsAvailable={drive.gpsAvailable}
              gpsPermission={drive.gpsPermission}
              lockEnabled={appCfg.driveLock}
              passengerMode={passengerMode}
              onTogglePassenger={setPassengerMode}
              connected={connected}
              onVoiceSend={cs.sendMessage}
            />

            <QueuePanel
              current={cs.current}
              queue={cs.queue}
              onClear={cs.clear}
              onDequeue={cs.dequeue}
              onClearQueue={cs.clearQueue}
            />

            <Text style={styles.heading}>Quick messages</Text>
            <PresetGrid onSend={cs.sendPreset} disabled={!connected} />

            <Text style={styles.heading}>Faces & reactions</Text>
            <FacesGallery
              onSendFace={(f) => cs.sendPreset({ id: `face-${f.id}`, face: f.id, animation: 'pulse' })}
              onSendEmoji={(e) => cs.sendPreset({ id: `emo-${e}`, emoji: e, text: '', animation: 'pulse' })}
              disabled={!connected}
            />

            <Text style={styles.heading}>Compose</Text>
            <Composer
              onSend={cs.sendMessage}
              onEnqueue={cs.enqueue}
              disabled={composerDisabled}
              maxLength={cs.config.maxLength || 60}
            />

            <View style={{ marginTop: 6 }}>
              <EmergencyRow onSend={cs.sendPreset} connected={connected} />
            </View>
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
        appSettings={appCfg}
        onUpdateApp={updateApp}
        drive={drive}
        cloudStatus={cloud.status}
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
