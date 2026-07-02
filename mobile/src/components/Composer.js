import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ANIMATIONS } from '../protocol';
import { theme } from '../theme';
import { useVoice } from '../voice';

/**
 * Free-text composer with voice dictation, an animation picker, and two send
 * modes (show now / add to queue). Disabled when the server locks free typing.
 */
export default function Composer({ onSend, onEnqueue, disabled, maxLength }) {
  const [text, setText] = useState('');
  const [animation, setAnimation] = useState('fade');

  // Dictation appends the final transcript into the text box for review/edit
  // before it is sent — safer than firing straight to the screen.
  const voice = useVoice((finalText) => {
    setText((prev) => (prev ? `${prev} ${finalText}` : finalText).slice(0, maxLength));
  });

  const trimmed = text.trim();
  const canSend = !disabled && trimmed.length > 0;

  const build = () => ({ text: trimmed, animation });
  const doSend = () => { if (canSend) { onSend(build()); setText(''); } };
  const doQueue = () => { if (canSend) { onEnqueue(build()); setText(''); } };

  return (
    <View style={[styles.wrap, disabled && styles.disabled]}>
      {disabled && (
        <Text style={styles.lockNote}>🔒 Free typing is turned off in Settings. Use presets.</Text>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(t) => setText(t.slice(0, maxLength))}
          placeholder={voice.listening ? 'Listening…' : 'Type a message for the screen'}
          placeholderTextColor={theme.textDim}
          editable={!disabled}
          multiline
          maxLength={maxLength}
        />
        {voice.available && (
          <TouchableOpacity
            style={[styles.mic, voice.listening && styles.micOn]}
            onPress={() => (voice.listening ? voice.stop() : voice.start())}
            disabled={disabled}
          >
            <Text style={styles.micText}>{voice.listening ? '⏹' : '🎤'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.count}>{trimmed.length}/{maxLength}</Text>
        {!voice.available && <Text style={styles.count}>Voice: build required</Text>}
      </View>

      <Text style={styles.sectionLabel}>Animation</Text>
      <View style={styles.animRow}>
        {ANIMATIONS.map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.animChip, animation === a && styles.animChipOn]}
            onPress={() => setAnimation(a)}
          >
            <Text style={[styles.animChipText, animation === a && styles.animChipTextOn]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.queueBtn, !canSend && styles.btnOff]} onPress={doQueue} disabled={!canSend}>
          <Text style={styles.queueText}>＋ Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.sendBtn, !canSend && styles.btnOff]} onPress={doSend} disabled={!canSend}>
          <Text style={styles.sendText}>Show now ▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.surface, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border, padding: theme.space },
  disabled: { opacity: 0.75 },
  lockNote: { color: theme.accent, marginBottom: 8, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, minHeight: 56, maxHeight: 120, color: theme.text, fontSize: 18,
    backgroundColor: theme.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
  },
  mic: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  micOn: { backgroundColor: theme.danger, borderColor: theme.danger },
  micText: { fontSize: 22 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  count: { color: theme.textDim, fontSize: 12 },
  sectionLabel: { color: theme.textDim, fontSize: 12, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  animRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  animChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border },
  animChipOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  animChipText: { color: theme.textDim, fontSize: 13 },
  animChipTextOn: { color: theme.accentText, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnOff: { opacity: 0.4 },
  queueBtn: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border },
  queueText: { color: theme.text, fontSize: 16, fontWeight: '700' },
  sendBtn: { backgroundColor: theme.accent },
  sendText: { color: theme.accentText, fontSize: 16, fontWeight: '800' },
});
