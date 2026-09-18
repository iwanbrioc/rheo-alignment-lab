import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from './AppButton';
import { RheoBrand } from './RheoBrand';
import { hasBetaAccess, privateBeta, removeBetaAccess, saveBetaAccess } from '../services/betaAccess';
import { colors } from '../theme';

export function BetaAccessPanel({ disabled = false }: { disabled?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    if (!privateBeta) return;
    let alive = true;
    void hasBetaAccess().then((found) => { if (alive) { setConnected(found); setVisible(!found); } })
      .catch(() => { if (alive) { setVisible(true); setMessage('Secure storage could not be read. Please try again.'); } });
    const listener = AppState.addEventListener('change', (state) => { if (state !== 'active') request.current?.abort(); });
    return () => { alive = false; request.current?.abort(); listener.remove(); };
  }, []);
  if (!privateBeta) return null;
  const close = () => { if (saving.current) return; request.current?.abort(); setCode(''); setVisible(false); };
  async function connect() {
    if (saving.current) return;
    saving.current = true; setBusy(true); setMessage(null);
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try { await saveBetaAccess(code, controller.signal); setConnected(true); setCode(''); setVisible(false); }
    catch (error) { setMessage(controller.signal.aborted ? 'Connection stopped or took too long. Please try again.' : error instanceof Error ? error.message : 'Could not connect. Please try again.'); }
    finally { clearTimeout(timeout); request.current = null; saving.current = false; setBusy(false); }
  }
  async function disconnect() {
    if (saving.current) return;
    saving.current = true; setBusy(true); setMessage(null);
    try { await removeBetaAccess(); setConnected(false); setCode(''); setMessage('Access removed. Your saved notes have not been deleted.'); }
    catch { setMessage('Access could not be removed. Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <>
    <AppButton label="Private test access" variant="quiet" disabled={disabled} onPress={() => setVisible(true)} />
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <RheoBrand />
          <Text accessibilityRole="header" style={styles.title}>Private test access</Text>
          <Text style={styles.body}>This is an early test. Rheo can be wrong. Use made-up or non-sensitive situations for now.</Text>
          <Text style={styles.body}>Your questions go through our server to OpenAI when you ask. Saved decisions and pathways stay on this phone, but they are not encrypted storage.</Text>
          <Text style={styles.body}>Voice may be processed by Apple or your Android speech provider. Location is optional and approximate.</Text>
          <Text style={styles.label}>Test access code</Text>
          <TextInput accessibilityLabel="Test access code" style={styles.input} value={code} onChangeText={setCode}
            secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={80} editable={!busy}
            returnKeyType="done" submitBehavior="blurAndSubmit" />
          {message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
          <AppButton label={busy ? 'Please wait...' : 'Connect'} variant="primary" disabled={busy || !code.trim()} onPress={() => { void connect(); }} />
          {busy ? <AppButton label="Stop connecting" onPress={() => request.current?.abort()} /> : null}
          {connected ? <AppButton label="Remove access from this phone" variant="danger" disabled={busy} onPress={() => { void disconnect(); }} /> : null}
          <AppButton label="Back to Rheo" disabled={busy} onPress={close} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 18 },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, lineHeight: 24, color: colors.body },
  label: { fontSize: 16, fontWeight: '600', color: colors.ink },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12, color: colors.ink, backgroundColor: colors.surface, fontSize: 16 },
  message: { fontSize: 16, lineHeight: 24, color: colors.danger },
});
