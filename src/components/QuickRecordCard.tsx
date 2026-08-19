import { useState } from 'react';
import { View, Text, Image, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useRecorder, formatDuration } from '../hooks/useRecorder';
import { patients } from '../mocks/patients';
import { colors, spacing, radius, font } from '../theme';
import { uploadAudio } from '../api/files';

type Phase = 'IDLE' | 'RECORDING' | 'PAUSED';

export default function QuickRecordCard() {
    const rec = useRecorder();
    const [phase, setPhase] = useState<Phase>('IDLE');
    const [patientId, setPatientId] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    const selected = patients.find((p) => p.id === patientId);

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
        const uri = await rec.stop();
        if (!uri) return;

        try {
            const file = await uploadAudio(uri);
            console.log('업로드 성공:', file.id, file.sizeBytes);
        } catch (e: any) {
            console.log('업로드 실패:', e.code, e.message, e.status);
        }

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
                {rec.error && <Text style={styles.error}>{rec.error}</Text>}
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

            <Text style={styles.fieldLabel}>환자 지정 (선택)</Text>
            <Pressable style={styles.select} onPress={() => setPickerOpen(true)}>
                <Image
                    source={require('../../assets/icons/person.png')}
                    style={styles.selectIcon}
                    resizeMode="contain"
                />
                <Text style={[styles.selectText, !selected && styles.selectPlaceholder]}>
                    {selected ? `${selected.room}호 ${selected.name}` : '환자 선택'}
                </Text>
                <Text style={styles.selectChevron}>⌄</Text>
            </Pressable>

            <Pressable style={styles.completeBtn} onPress={handleComplete}>
                <Text style={styles.completeText}>기록 완료</Text>
            </Pressable>

            <PatientPicker
                visible={pickerOpen}
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
    selectedId,
    onSelect,
    onClose,
}: {
    visible: boolean;
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
                        {patients.map((p) => {
                            const active = p.id === selectedId;
                            return (
                                <Pressable
                                    key={p.id}
                                    style={[styles.sheetRow, active && styles.sheetRowActive]}
                                    onPress={() => onSelect(p.id)}
                                >
                                    <View style={styles.flex}>
                                        <Text style={styles.sheetRoom}>{p.room}호 {p.bedNo}번 침상</Text>
                                        <Text style={styles.sheetName}>{p.name}</Text>
                                    </View>
                                    {active && <Text style={styles.check}>✓</Text>}
                                </Pressable>
                            );
                        })}
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
    selectIcon: { width: 24, height:24 },
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
    sheetRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
        borderRadius: radius.md,
    },
    sheetRowActive: { backgroundColor: colors.primarySoft },
    sheetRoom: { ...font.small, color: colors.textDim },
    sheetName: { ...font.body, color: colors.text, marginTop: 2 },
    check: { fontSize: 16, color: colors.primary },
});