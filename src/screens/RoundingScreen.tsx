import { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Image,
  Modal, ActivityIndicator, StyleSheet, Alert,
  Platform, Animated, PanResponder, Dimensions, Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRecorder, formatDuration } from '../hooks/useRecorder';
import { startSession, addSegment, saveRecord, completeSession } from '../api/rounding';
import { uploadAudio, uploadPhoto } from '../api/files';
import { fetchPatients, ApiPatient } from '../api/patients';
import { LocalSegment, ChatItem } from '../types';
import { colors, spacing, radius, font } from '../theme';
import { startAnalysis } from '../api/roundingAnalysis';

type Phase = 'IDLE' | 'RECORDING' | 'PAUSED' | 'FINISHING';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_COLLAPSED = 96;
const SHEET_EXPANDED = SCREEN_H * 0.66;

const DEMO_NOTES = [
  '어제보다 숨쉬기 편해졌고 산소포화도는 97%로 확인되었습니다.',
  '통증은 NRS 3점으로 감소했고 진통제 투여 후 안정적입니다.',
  '식사량은 절반 정도이며 연하곤란 증상은 없습니다.',
  '보행 훈련을 시행했고 어지럼증 없이 50m 이동 가능했습니다.',
];

interface Props {
  onBack: () => void;
  onAnalysisStart: (sessionId: string, jobId: string) => void;
}

export default function RoundingScreen({ onBack, onAnalysisStart }: Props) {
  const insets = useSafeAreaInsets();
  const rec = useRecorder();

  const [phase, setPhase] = useState<Phase>('IDLE');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [helpVisible, setHelpVisible] = useState(true);
  const [tipVisible, setTipVisible] = useState(true);

  const [patients, setPatients] = useState<ApiPatient[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [segments, setSegments] = useState<LocalSegment[]>([]);
  const segmentStartRef = useRef<string>('');

  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [memoText, setMemoText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
  const expandedRef = useRef(false);
  const startHeightRef = useRef(SHEET_COLLAPSED);

  useEffect(() => {
    fetchPatients()
      .then((res) => setPatients(res.items ?? []))
      .catch((e) => console.log('환자 목록 실패:', e.code, e.message));
  }, []);

  const snapTo = (expanded: boolean) => {
    expandedRef.current = expanded;
    setSheetExpanded(expanded);
    Animated.spring(sheetHeight, {
      toValue: expanded ? SHEET_EXPANDED : SHEET_COLLAPSED,
      useNativeDriver: false,
      friction: 9,
      tension: 60,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        startHeightRef.current = expandedRef.current ? SHEET_EXPANDED : SHEET_COLLAPSED;
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(
          SHEET_EXPANDED,
          Math.max(SHEET_COLLAPSED, startHeightRef.current - g.dy),
        );
        sheetHeight.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const current = startHeightRef.current - g.dy;
        const mid = (SHEET_COLLAPSED + SHEET_EXPANDED) / 2;
        if (Math.abs(g.vy) > 0.5) snapTo(g.vy < 0);
        else snapTo(current > mid);
      },
    }),
  ).current;

  const selected = patients.find((p) => p.patientId === patientId);
  const selectedLabel = selected
    ? `${selected.roomLabel ?? ''} ${selected.displayName}`.trim()
    : null;

  const nowIso = () => new Date().toISOString();
  const nowTime = () =>
    new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

  const scrollChatToEnd = () => {
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const handleStart = async () => {
    const startedAt = nowIso();
    try {
      const session = await startSession(startedAt);
      setSessionId(session.id);
    } catch (e: any) {
      console.log('세션 시작 실패:', e.code, e.message);
    }
    segmentStartRef.current = startedAt;
    await rec.start();
    setPhase('RECORDING');
  };

  const handleTogglePause = () => {
    if (phase === 'RECORDING') {
      rec.pause();
      setPhase('PAUSED');
    } else {
      rec.resume();
      setPhase('RECORDING');
    }
  };

  const closeCurrentSegment = async () => {
    const endedAt = nowIso();
    const startedAt = segmentStartRef.current;
    const sequence = segments.length + 1;
    const note = DEMO_NOTES[segments.length % DEMO_NOTES.length];

    let synced = false;
    let recordId: string | undefined;

    if (sessionId && patientId) {
      try {
        await addSegment(sessionId, { patientId, startedAt, endedAt, note });
        console.log('세그먼트 저장:', sequence, note.slice(0, 18));
        synced = true;
      } catch (e: any) {
        console.log('세그먼트 저장 실패:', e.code, e.message);
      }

      try {
        const rec = await saveRecord(sessionId, { patientId, startedAt, endedAt, note });
        recordId = rec.recordId;
        console.log('기록 저장:', rec.recordId);
      } catch (e: any) {
        console.log('기록 저장 실패:', e.code, e.message);
      }
    }

    setSegments((prev) => [
      ...prev,
      { sequence, patientId, startedAt, endedAt, synced, recordId },
    ]);
    segmentStartRef.current = endedAt;
    setPatientId(null);
  };

  const handleFinish = async () => {
    setPhase('FINISHING');

    const endedAt = nowIso();
    const startedAt = segmentStartRef.current;
    const lastPatientId = patientId;

    const uri = await rec.stop();
    console.log('세션 파일 uri:', uri);

    let audioFileId: string | undefined;

    try {
      if (uri) {
        const file = await uploadAudio(uri);
        audioFileId = file.id;
        console.log('세션 오디오 업로드 성공:', file.id);
      }
    } catch (e: any) {
      console.log('오디오 업로드 실패:', e.code, e.message);
    }

    if (sessionId && lastPatientId) {
      const note = DEMO_NOTES[segments.length % DEMO_NOTES.length];

      try {
        await addSegment(sessionId, { patientId: lastPatientId, startedAt, endedAt, note });
        console.log('마지막 세그먼트 저장:', note.slice(0, 18));
      } catch (e: any) {
        console.log('마지막 세그먼트 저장 실패:', e.code, e.message);
      }

      try {
        const record = await saveRecord(sessionId, {
          patientId: lastPatientId,
          startedAt,
          endedAt,
          note,
        });
        console.log('마지막 기록 저장:', record.recordId);
      } catch (e: any) {
        console.log('마지막 기록 저장 실패:', e.code, e.message);
      }
    }

    try {
      if (sessionId) {
        await completeSession(sessionId, endedAt);
        console.log('세션 종료 완료');
      }
    } catch (e: any) {
      console.log('세션 종료 실패:', e.code, e.message);
    }

    if (sessionId && audioFileId) {
      try {
        const job = await startAnalysis(sessionId, audioFileId);
        console.log('분석 시작:', job.jobId);
        onAnalysisStart(sessionId, job.jobId);
        return;
      } catch (e: any) {
        console.log('분석 시작 실패:', e.code, e.message);
      }
    }

    onBack();
  };

  const confirmFinish = () => {
    Alert.alert('라운딩 종료', '녹음을 종료하고 서버로 전송할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: handleFinish },
    ]);
  };

  const submitMemo = () => {
    const text = memoText.trim();
    if (!text) return;

    if (editingId) {
      setChatItems((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, content: text } : c)),
      );
      setEditingId(null);
    } else {
      setChatItems((prev) => [
        ...prev,
        {
          id: `m${Date.now()}`,
          kind: 'MEMO',
          content: text,
          patientLabel: selectedLabel ?? undefined,
          createdAt: nowTime(),
        },
      ]);
      if (!expandedRef.current) snapTo(true);
      scrollChatToEnd();
    }

    setMemoText('');
  };

  const closeComposer = () => {
    setComposerOpen(false);
    if (editingId) {
      setEditingId(null);
      setMemoText('');
    }
  };

  const startEditMemo = (item: ChatItem) => {
    setEditingId(item.id);
    setMemoText(item.content);
    setComposerOpen(true);
  };

  const pickPhoto = async (replaceId?: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const result = perm.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (result.canceled) return;
    const asset = result.assets[0];

    let targetId = replaceId;

    if (replaceId) {
      setChatItems((prev) =>
        prev.map((c) =>
          c.id === replaceId ? { ...c, content: asset.uri, fileId: undefined } : c,
        ),
      );
    } else {
      targetId = `p${Date.now()}`;
      setChatItems((prev) => [
        ...prev,
        { id: targetId as string, kind: 'PHOTO', content: asset.uri, createdAt: nowTime() },
      ]);
      if (!expandedRef.current) snapTo(true);
      scrollChatToEnd();
    }

    try {
      const file = await uploadPhoto(asset.uri);
      setChatItems((prev) => prev.map((c) => (c.id === targetId ? { ...c, fileId: file.id } : c)));
    } catch (e: any) {
      console.log('사진 업로드 실패:', e.code, e.message);
    }
  };

  const confirmRemove = (item: ChatItem) => {
    const label = item.kind === 'PHOTO' ? '사진을' : '메모를';
    Alert.alert('삭제', `${label} 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => setChatItems((prev) => prev.filter((c) => c.id !== item.id)),
      },
    ]);
  };

  if (phase === 'IDLE') {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
        <NavBar onBack={onBack} />

        {helpVisible ? (
          <View style={[styles.card, styles.cardSide]}>
            <View style={styles.rowBetween}>
              <Text style={styles.brandTitle}>✦ NurseHand</Text>
              <Pressable onPress={() => setHelpVisible(false)} hitSlop={10}>
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.helpText}>
              녹음을 시작하고, 필요한 내용은 메모나 사진으로 추가해 보세요.
              NurseHand AI가 실시간으로 분석하여 라운딩 기록을 정리해 드려요.
            </Text>
          </View>
        ) : null}

        <View style={styles.idleCenter}>
          <Text style={styles.idleText}>녹음 시작</Text>
          <Pressable style={styles.micOuter} onPress={handleStart} disabled={!rec.ready}>
            <View style={styles.micMid}>
              <View style={styles.micInner}>
                <Image
                  source={require('../../assets/icons/mic2.png')}
                  style={styles.micIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
          </Pressable>
          {rec.error ? <Text style={styles.error}>{rec.error}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <NavBar onBack={onBack} />

      {sheetExpanded ? (
        <View style={styles.compactWrap}>
          <View style={styles.compactCard}>
            <View style={styles.compactTop}>
              <View style={styles.recDot} />
              <Text style={styles.compactTimer}>{formatDuration(rec.durationMs)}</Text>
            </View>

            <Waveform levels={rec.levels} />

            <View style={styles.compactBtnRow}>
              <Pressable style={styles.compactPause} onPress={handleTogglePause}>
                <Text style={styles.compactPauseIcon}>
                  {phase === 'RECORDING' ? '❚❚' : '▶'}
                </Text>
              </Pressable>
              <Pressable style={styles.compactStop} onPress={confirmFinish}>
                <View style={styles.stopSquare} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.upper}
          contentContainerStyle={styles.upperContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('ko-KR', {
                  year: '2-digit', month: '2-digit', day: '2-digit',
                })}
              </Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI 식별</Text>
              </View>
            </View>

            <View style={[styles.speechChip, rec.isSpeech && styles.speechChipActive]}>
              <Text style={[styles.speechText, rec.isSpeech && styles.speechTextActive]}>
                {rec.isSpeech ? '발화 중' : '대기 중'}
              </Text>
            </View>

            <Waveform levels={rec.levels} />

            <View style={styles.rowBetween}>
              <Text style={styles.timer}>{formatDuration(rec.durationMs)}</Text>
              <Pressable style={styles.pauseBtn} onPress={handleTogglePause}>
                <Text style={styles.pauseIcon}>{phase === 'RECORDING' ? '❚❚' : '▶'}</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>환자 지정 (선택)</Text>
            <Pressable style={styles.select} onPress={() => setPickerOpen(true)}>
              <Image
                source={require('../../assets/icons/person.png')}
                style={styles.selectIcon}
                resizeMode="contain"
              />
              <Text style={[styles.selectText, !selected && styles.selectPlaceholder]}>
                {selectedLabel ?? '환자 선택'}
              </Text>
              <Text style={styles.selectChevron}>⌄</Text>
            </Pressable>

            <Text style={styles.hintText}>버튼을 누르면 자동으로 다음 환자 녹음이 시작돼요</Text>

            <Pressable style={styles.primaryBtn} onPress={closeCurrentSegment}>
              <Text style={styles.primaryBtnText}>현재 환자 종료</Text>
            </Pressable>

            <Pressable style={styles.finishBtn} onPress={confirmFinish}>
              <Text style={styles.finishText}>라운딩 종료</Text>
            </Pressable>

            {segments.length > 0 ? (
              <Text style={styles.segCount}>기록된 환자 구간 {segments.length}건</Text>
            ) : null}
          </View>

          {tipVisible ? (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.brandTitle}>✦ Tip</Text>
                <Pressable onPress={() => setTipVisible(false)} hitSlop={10}>
                  <Text style={styles.closeIcon}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.tipText}>환자를 지정해주시면 더 정확한 기록이 가능해요!</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Animated.View style={[styles.sheetWrap, { height: sheetHeight }]}>
        <View {...panResponder.panHandlers} style={styles.grabArea}>
          <View style={styles.handleBar} />
        </View>

        <ScrollView
          ref={chatScrollRef}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {chatItems.length === 0 ? (
            <Text style={styles.emptyText}>메모나 사진으로 필요한 내용을 추가하세요</Text>
          ) : (
            chatItems.map((item) => (
              <View key={item.id} style={styles.chatItem}>
                <Text style={styles.timeChip}>{item.createdAt}</Text>

                <View style={styles.itemActions}>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      item.kind === 'PHOTO' ? pickPhoto(item.id) : startEditMemo(item)
                    }
                  >
                    <Image
                      source={require('../../assets/icons/edit.png')}
                      style={styles.actionIcon}
                      resizeMode="contain"
                    />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => confirmRemove(item)}>
                    <Image
                      source={require('../../assets/icons/trash.png')}
                      style={styles.actionIcon}
                      resizeMode="contain"
                    />
                  </Pressable>
                </View>

                {item.kind === 'PHOTO' ? (
                  <Image source={{ uri: item.content }} style={styles.photo} resizeMode="cover" />
                ) : (
                  <View style={styles.bubble}>
                    <Text style={styles.bubbleText}>
                      {item.patientLabel ? `@${item.patientLabel}, ` : ''}
                      {item.content}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable style={styles.cameraBtn} onPress={() => pickPhoto()} hitSlop={6}>
            <Image
              source={require('../../assets/icons/camera.png')}
              style={styles.cameraIcon}
              resizeMode="contain"
            />
          </Pressable>

          <Pressable style={styles.inputFake} onPress={() => setComposerOpen(true)}>
            <Text style={styles.inputFakeText} numberOfLines={1}>
              {memoText ? memoText : '메모나 사진으로 필요한 내용을 추가하세요'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <Modal
        visible={composerOpen}
        transparent
        animationType="fade"
        onRequestClose={closeComposer}
      >
        <KeyboardAvoidingView
          style={styles.composerRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.flex} onPress={closeComposer} />

          <View style={[styles.composerBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            {editingId ? (
              <View style={styles.editingChip}>
                <Text style={styles.editingText}>메모 수정 중</Text>
              </View>
            ) : null}

            <View style={styles.composerRow}>
              <Pressable
                style={styles.cameraBtn}
                onPress={() => {
                  setComposerOpen(false);
                  setTimeout(() => pickPhoto(), 220);
                }}
                hitSlop={6}
              >
                <Image
                  source={require('../../assets/icons/camera.png')}
                  style={styles.cameraIcon}
                  resizeMode="contain"
                />
              </Pressable>

              <TextInput
                style={styles.input}
                placeholder="메모나 사진으로 필요한 내용을 추가하세요"
                placeholderTextColor={colors.textDim}
                value={memoText}
                onChangeText={setMemoText}
                autoFocus
                multiline
              />

              <Pressable
                style={[styles.sendBtn, !memoText.trim() && styles.sendBtnOff]}
                onPress={() => {
                  submitMemo();
                  Keyboard.dismiss();
                  setComposerOpen(false);
                }}
                disabled={!memoText.trim()}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {phase === 'FINISHING' ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.overlayText}>라운딩을 저장하고 있어요...</Text>
        </View>
      ) : null}

      <PatientPicker
        visible={pickerOpen}
        patients={patients}
        selectedId={patientId}
        onSelect={(id) => {
          setPatientId(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function NavBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.navBar}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>
      <Text style={styles.navTitle}>라운딩 기록</Text>
      <View style={styles.navSpacer} />
    </View>
  );
}

function Waveform({ levels }: { levels: number[] }) {
  return (
    <View style={styles.waveArea}>
      {Array.from({ length: 40 }).map((_, i) => {
        const level = levels[i] ?? 0;
        const active = i < levels.length;
        return (
          <View
            key={i}
            style={[
              styles.waveBar,
              {
                height: active ? Math.max(4, level * 52) : 4,
                backgroundColor: active ? colors.primary : colors.border,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function PatientPicker({
  visible, patients, selectedId, onSelect, onClose,
}: {
  visible: boolean;
  patients: ApiPatient[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>환자 선택</Text>
          <ScrollView style={styles.sheetList}>
            {patients.length === 0 ? (
              <Text style={styles.sheetEmpty}>담당 환자가 없어요</Text>
            ) : (
              patients.map((p) => {
                const active = p.patientId === selectedId;
                return (
                  <Pressable
                    key={p.patientId}
                    style={[styles.sheetRow, active && styles.sheetRowActive]}
                    onPress={() => onSelect(p.patientId)}
                  >
                    <View style={styles.flex}>
                      <Text style={styles.sheetRoom}>{p.roomLabel ?? '병실 미지정'}</Text>
                      <Text style={styles.sheetName}>{p.displayName}</Text>
                    </View>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backIcon: { fontSize: 30, color: colors.text, lineHeight: 32 },
  navTitle: { flex: 1, textAlign: 'center', ...font.h2, color: colors.text },
  navSpacer: { width: 20 },

  upper: { flex: 1 },
  upperContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },

  compactWrap: { flex: 1, paddingHorizontal: spacing.lg },
  compactCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg },
  compactTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  recDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.primary },
  compactTimer: { ...font.body, color: colors.text, fontVariant: ['tabular-nums'] },
  compactBtnRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  compactPause: {
    width: 74, height: 38, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  compactPauseIcon: { fontSize: 13, color: colors.primary },
  compactStop: {
    width: 44, height: 38, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stopSquare: { width: 13, height: 13, borderRadius: 3, backgroundColor: colors.primary },

  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl },
  cardSide: { marginHorizontal: spacing.lg },
  brandTitle: { ...font.h2, color: colors.primary },
  closeIcon: { fontSize: 17, color: colors.textDim },
  helpText: { ...font.small, color: colors.textSub, lineHeight: 21, marginTop: spacing.md },
  tipText: { ...font.small, color: colors.textSub, marginTop: spacing.xs },

  idleCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl },
  idleText: { fontSize: 19, fontWeight: '600', color: colors.textDim },
  micOuter: {
    width: 156, height: 156, borderRadius: radius.pill,
    backgroundColor: '#FFDCEB', alignItems: 'center', justifyContent: 'center',
  },
  micMid: {
    width: 124, height: 124, borderRadius: radius.pill,
    backgroundColor: '#FFC2DC', alignItems: 'center', justifyContent: 'center',
  },
  micInner: {
    width: 92, height: 92, borderRadius: radius.pill,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  micIcon: { width: 40, height: 40 },

  dateText: { ...font.body, color: colors.textDim },
  aiBadge: {
    backgroundColor: colors.primarySoft, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  aiBadgeText: { ...font.tiny, color: colors.primary },

  speechChip: {
    alignSelf: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: 6,
    marginTop: spacing.md,
  },
  speechChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  speechText: { ...font.small, color: colors.textDim },
  speechTextActive: { color: colors.primary },

  waveArea: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 2, marginVertical: spacing.md },
  waveBar: { flex: 1, borderRadius: radius.pill },

  timer: { fontSize: 32, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  pauseBtn: {
    width: 74, height: 44, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pauseIcon: { fontSize: 14, color: colors.primary },

  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg },

  fieldLabel: { ...font.small, color: colors.textSub, marginBottom: spacing.sm },
  select: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, height: 48,
  },
  selectIcon: { width: 24, height: 24 },
  selectText: { flex: 1, ...font.body, color: colors.text },
  selectPlaceholder: { color: colors.textDim },
  selectChevron: { fontSize: 15, color: colors.textDim },

  hintText: { ...font.tiny, color: colors.textDim, textAlign: 'center', marginVertical: spacing.md },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  finishBtn: { alignItems: 'center', paddingVertical: spacing.md },
  finishText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  segCount: { ...font.tiny, color: colors.textDim, textAlign: 'center' },

  sheetWrap: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  grabArea: { paddingVertical: spacing.md, alignItems: 'center' },
  handleBar: { width: 90, height: 5, borderRadius: radius.pill, backgroundColor: colors.border },

  chatList: { flex: 1 },
  chatContent: { paddingBottom: spacing.md, gap: spacing.lg },
  emptyText: { ...font.small, color: colors.textDim, textAlign: 'center', marginTop: spacing.lg },

  chatItem: { alignItems: 'flex-end', gap: spacing.sm },
  timeChip: { ...font.tiny, color: colors.textDim, alignSelf: 'center' },

  itemActions: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.xs },
  actionIcon: { width: 16, height: 16 },

  bubble: {
    alignSelf: 'flex-end', maxWidth: '88%',
    backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg,
  },
  bubbleText: { ...font.body, color: colors.text, lineHeight: 22 },

  photo: { width: 230, height: 172, borderRadius: radius.md },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingTop: spacing.sm },
  cameraBtn: {
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  cameraIcon: { width: 22, height: 22 },

  inputFake: {
    flex: 1, minHeight: 44, justifyContent: 'center',
    backgroundColor: colors.bg, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  inputFakeText: { ...font.body, color: colors.textDim },

  composerRoot: { flex: 1, backgroundColor: 'rgba(20,20,30,0.35)' },
  composerBar: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  editingChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  editingText: { ...font.tiny, color: colors.primary },

  input: {
    flex: 1, minHeight: 44, maxHeight: 104,
    backgroundColor: colors.bg, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 12,
    ...font.body, color: colors.text,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: colors.border },
  sendIcon: { fontSize: 19, fontWeight: '700', color: '#fff' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(253,246,248,0.94)',
    alignItems: 'center', justifyContent: 'center', gap: spacing.lg,
  },
  overlayText: { ...font.body, color: colors.textSub },

  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,30,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, maxHeight: '70%',
  },
  sheetHandle: { width: 38, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, alignSelf: 'center', marginVertical: spacing.md },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  sheetList: { marginBottom: spacing.md },
  sheetEmpty: { ...font.small, color: colors.textDim, textAlign: 'center', paddingVertical: spacing.xl },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderRadius: radius.md },
  sheetRowActive: { backgroundColor: colors.primarySoft },
  sheetRoom: { ...font.small, color: colors.textDim },
  sheetName: { ...font.body, color: colors.text, marginTop: 2 },
  check: { fontSize: 16, color: colors.primary },

  error: { ...font.small, color: colors.danger },
});