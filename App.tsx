import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';

// 이 값보다 크면 "말하는 중"으로 판정. 병동에서 실측 후 조정 필요.
const SPEECH_THRESHOLD_DB = -35;

export default function App() {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true, // 이거 없으면 metering이 undefined
  });
  const state = useAudioRecorderState(recorder, 100); // 100ms마다 갱신

  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          setError('마이크 권한이 거부됨');
          return;
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true, // iOS 무음 스위치 대응
        });
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();
  }, []);

  const start = async () => {
    try {
      setUri(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const stop = async () => {
    try {
      await recorder.stop();
      setUri(recorder.uri);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const metering = state.metering ?? -160;
  const isSpeech = state.isRecording && metering > SPEECH_THRESHOLD_DB;
  const seconds = Math.floor((state.durationMillis ?? 0) / 1000);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>녹음 테스트</Text>

      <View style={[styles.indicator, isSpeech && styles.indicatorActive]}>
        <Text style={styles.indicatorText}>
          {!state.isRecording ? '대기' : isSpeech ? '발화 감지 중' : '조용함'}
        </Text>
      </View>

      <Text style={styles.mono}>경과 {seconds}초</Text>
      <Text style={styles.mono}>metering {metering.toFixed(1)} dB</Text>

      <View style={styles.row}>
        <Pressable
          onPress={start}
          disabled={state.isRecording}
          style={[styles.btn, state.isRecording && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>시작</Text>
        </Pressable>
        <Pressable
          onPress={stop}
          disabled={!state.isRecording}
          style={[styles.btn, !state.isRecording && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>정지</Text>
        </Pressable>
      </View>

      {uri && <Text style={styles.uri}>저장됨:{'\n'}{uri}</Text>}
      {error && <Text style={styles.error}>에러: {error}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  indicator: { paddingVertical: 18, paddingHorizontal: 36, borderRadius: 999, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#334155' },
  indicatorActive: { backgroundColor: '#065F46', borderColor: '#10B981' },
  indicatorText: { color: '#F8FAFC', fontSize: 18, fontWeight: '600' },
  mono: { color: '#94A3B8', fontSize: 14, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 14, marginTop: 12 },
  btn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, backgroundColor: '#2563EB' },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  uri: { color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 12 },
  error: { color: '#F87171', fontSize: 13, textAlign: 'center' },
});
