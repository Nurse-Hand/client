import { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, Modal, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRecorder, formatDuration } from '../hooks/useRecorder';
import { fetchPatients, ApiPatient } from '../api/patients';
import { uploadAudio } from '../api/files';
import { colors, spacing, radius, font } from '../theme';
import { createQuickNote, NOTE_TYPES, NOTE_TYPE_LABEL, NoteType } from '../api/quickNotes';

type Phase = 'IDLE' | 'RECORDING' | 'PAUSED';

export default function QuickRecordCard() {
    const rec = useRecorder();
    const [phase, setPhase] = useState<Phase>('IDLE');
    const [patients, setPatients] = useState<ApiPatient[]>([]);
    const [patientId, setPatientId] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [noteType, setNoteType] = useState<NoteType>('OBSERVATION');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPatients()
            .then((res) => setPatients(res.items ?? []))
            .catch((e) => console.log('환자 목록 실패:', e.code, e.message));
    }, []);

    const selected = patients.find((p) => p.patientId === patientId);
    const selectedLabel = selected
        ? `${selected.roomLabel ?? ''} ${selected.displayName}`.trim()
        : null;

    const handleMicPress = async () => {
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

    const handleComplete = async () => {
        if (!patientId) {
            Alert.alert('환자 선택 필요', '기록할 환자를 선택해주세요.');
            return;
        }

        setSaving(true);
        const uri = await rec.stop();

        try {
            let audioFileId: string | undefined;
            if (uri) {
                const file = await uploadAudio(uri);
                audioFileId = file.id;
                console.log('빠른기록 오디오 업로드:', file.id);
            }

            const note = await createQuickNote({
                patientId,
                noteType,
                audioFileId,
                occurredAt: new Date().toISOString(),
            });
            console.log('빠른 기록 저장 성공:', note.quickNoteId);
        } catch (e: any) {
            console.log('빠른 기록 저장 실패:', e.code, e.message);
            Alert.alert('저장 실패', e.message ?? '다시 시도해주세요');
        }

        setSaving(false);
        setPhase('IDLE');
        setPatientId(null);
        rec.reset();
    };

    if (phase === 'IDLE') {
        return (
            <View style={styles.card}>
                <Text style={styles.title}>빠른 기록</Text>
                <View style={styles.idleRow}>
                    <Text style={styles.idleDesc}>음성 녹음으로 빠르게 기록해보세요</Text>
                    <Pressable style={styles.micBtn} onPress={handleMicPress} disabled={!rec.ready}>
                        <Image
                            source={require('../../assets/icons/mic1.png')}
                            style={styles.micIcon}
                            resizeMode="contain"
                        />
                    </Pressable>
                </View>
                {rec.error ? <Text style={styles.error}>{rec.error}</Text> : null}
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <Text style={styles.title}>빠른 기록</Text>

            <View style={styles.recordRow}>
                <Pressable style={styles.pauseBtn} onPress={handleTogglePause}>
                    <Text style={styles.pauseIcon}>{phase === 'RECORDING' ? '❚❚' : '▶'}</Text>
                </Pressable>

                <View style={styles.waveArea}>
                    {Array.from({ length: 30 }).map((_, i) => {
                        const level = rec.levels[i] ?? 0;
                        const active = i < rec.levels.length;
                        return (
                            <View
                                key={i}
                                style={[
                                    styles.waveBar,
                                    {
                                        height: active ? Math.max(3, level * 30) : 3,
                                        backgroundColor: active ? colors.primary : colors.border,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                <Text style={styles.timer}>{formatDuration(rec.durationMs)}</Text>
            </View>
            <Text style={styles.fieldLabel}>환자 지정</Text>
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

            <Text style={styles.fieldLabel}>기록 유형</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.typeScroll}
                contentContainerStyle={styles.typeRow}
            >
                {NOTE_TYPES.map((t) => {
                    const active = noteType === t;
                    return (
                        <Pressable
                            key={t}
                            style={[styles.typeChip, active && styles.typeChipActive]}
                            onPress={() => setNoteType(t)}
                        >
                            <Text style={[styles.typeText, active && styles.typeTextActive]}>
                                {NOTE_TYPE_LABEL[t]}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <Pressable
                style={[styles.completeBtn, saving && styles.btnDisabled]}
                onPress={handleComplete}
                disabled={saving}
            >
                <Text style={styles.completeText}>{saving ? '저장 중...' : '기록 완료'}</Text>
            </Pressable>

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

function PatientPicker({
    visible,
    patients,
    selectedId,
    onSelect,
    onClose,
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
                                            <Text style={styles.sheetRoom}>
                                                {p.roomLabel ?? '병실 미지정'}
                                            </Text>
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
    flex: { flex: 1 },
    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
    },
    title: { fontSize: 19, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },

    idleRow: { flexDirection: 'row', alignItems: 'center' },
    idleDesc: { flex: 1, ...font.small, color: colors.textDim },
    micBtn: {
        width: 52, height: 52,
        alignItems: 'center', justifyContent: 'center',
    },
    micIcon: { width: 52, height: 52 },

    recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
    pauseBtn: {
        width: 46, height: 46, borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
        alignItems: 'center', justifyContent: 'center',
    },
    pauseIcon: { fontSize: 14, color: colors.primary },

    waveArea: {
        flex: 1, height: 34,
        flexDirection: 'row', alignItems: 'center', gap: 2,
    },
    waveBar: { flex: 1, borderRadius: radius.pill },
    timer: { ...font.small, color: colors.textDim, fontVariant: ['tabular-nums'] },

    fieldLabel: { ...font.small, color: colors.textSub, marginBottom: spacing.sm },
    select: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg, height: 48,
        marginBottom: spacing.lg,
    },
    selectIcon: { width: 24, height: 24 },
    selectText: { flex: 1, ...font.body, color: colors.text },
    selectPlaceholder: { color: colors.textDim },
    selectChevron: { fontSize: 15, color: colors.textDim },

    completeBtn: {
        backgroundColor: colors.primarySoft,
        borderRadius: radius.md,
        paddingVertical: 15,
        alignItems: 'center',
    },
    completeText: { fontSize: 15, fontWeight: '700', color: colors.primary },

    error: { ...font.small, color: colors.danger, marginTop: spacing.md },

    backdrop: { flex: 1, backgroundColor: 'rgba(20,20,30,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl,
        maxHeight: '70%',
    },
    sheetHandle: {
        width: 38, height: 4, borderRadius: radius.pill,
        backgroundColor: colors.border,
        alignSelf: 'center', marginVertical: spacing.md,
    },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
    sheetList: { marginBottom: spacing.md },
    sheetEmpty: { ...font.small, color: colors.textDim, textAlign: 'center', paddingVertical: spacing.xl },
    sheetRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
        borderRadius: radius.md,
    },
    sheetRowActive: { backgroundColor: colors.primarySoft },
    sheetRoom: { ...font.small, color: colors.textDim },
    sheetName: { ...font.body, color: colors.text, marginTop: 2 },
    check: { fontSize: 16, color: colors.primary },

    typeScroll: { flexGrow: 0, marginBottom: spacing.lg },
    typeRow: { gap: spacing.sm },
    typeChip: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.lg,
        paddingVertical: 7,
    },
    typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    typeText: { ...font.small, color: colors.textSub },
    typeTextActive: { color: colors.primary, fontWeight: '600' },
    btnDisabled: { opacity: 0.5 },
});