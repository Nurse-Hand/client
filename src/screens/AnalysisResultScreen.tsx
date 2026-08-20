import { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, Image, Pressable, ScrollView, Modal,
    ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    fetchAnalysisJob, confirmAnalysis, matchesFor, msToTime,
    ROLE_LABEL, AnalysisJob, AnalysisUtterance, SpeakerRole,
} from '../api/roundingAnalysis';
import { fetchPatients, ApiPatient } from '../api/patients';
import { colors, spacing, radius, font } from '../theme';

const POLL_MS = 3000;
const MAX_POLL = 40;

interface Props {
    sessionId: string;
    jobId: string;
    onDone: () => void;
}

export default function AnalysisResultScreen({ sessionId, jobId, onDone }: Props) {
    const insets = useSafeAreaInsets();

    const [job, setJob] = useState<AnalysisJob | null>(null);
    const [patients, setPatients] = useState<ApiPatient[]>([]);
    const [edits, setEdits] = useState<Record<string, string | null>>({});
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [picking, setPicking] = useState<AnalysisUtterance | null>(null);
    const pollCount = useRef(0);

    useEffect(() => {
        fetchPatients()
            .then((p) => setPatients(p.items ?? []))
            .catch((e) => console.log('환자 목록 실패:', e.code, e.message));
    }, []);

    useEffect(() => {
        let alive = true;
        let timer: ReturnType<typeof setTimeout>;

        const poll = async () => {
            if (!alive) return;
            try {
                const j = await fetchAnalysisJob(jobId);
                if (!alive) return;
                setJob(j);

                if (j.status === 'SUCCEEDED') return;
                if (j.status === 'FAILED') {
                    setError(j.failureCode ?? '분석에 실패했어요');
                    return;
                }

                pollCount.current += 1;
                if (pollCount.current > MAX_POLL) {
                    setError('분석이 오래 걸리고 있어요. 잠시 후 다시 확인해주세요.');
                    return;
                }
                timer = setTimeout(poll, POLL_MS);
            } catch (e: any) {
                if (!alive) return;
                setError(e.message ?? '분석 결과를 불러오지 못했어요');
            }
        };

        poll();
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [jobId]);

    const patientMap = useMemo(() => {
        const m: Record<string, ApiPatient> = {};
        for (const p of patients) m[p.patientId] = p;
        return m;
    }, [patients]);

    const patientIdOf = (u: AnalysisUtterance) =>
        u.utteranceId in edits ? edits[u.utteranceId] : u.patientId;

    const needsReview = useMemo(() => {
        if (!job) return 0;
        return job.utterances.filter(
            (u) => u.speakerRole !== 'NURSE' && !patientIdOf(u),
        ).length;
    }, [job, edits]);

    const handleConfirm = async () => {
        if (!job) return;
        setSaving(true);
        try {
            await confirmAnalysis(sessionId, {
                jobId: job.jobId,
                utterances: job.utterances.map((u) => ({
                    utteranceId: u.utteranceId,
                    patientId: patientIdOf(u),
                    speakerRole: u.speakerRole,
                    important: u.important,
                })),
            });
            Alert.alert('저장 완료', '라운딩 기록이 저장되었어요.', [
                { text: '확인', onPress: onDone },
            ]);
        } catch (e: any) {
            console.log('분석 확정 실패:', e.code, e.message);
            Alert.alert('저장 실패', e.message ?? '다시 시도해주세요');
        }
        setSaving(false);
    };

    if (error) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.ghostBtn} onPress={onDone}>
                    <Text style={styles.ghostText}>닫기</Text>
                </Pressable>
            </View>
        );
    }

    if (!job || job.status !== 'SUCCEEDED') {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingTitle}>녹음을 분석하고 있어요</Text>
                <Text style={styles.loadingDesc}>
                    음성을 텍스트로 바꾸고 화자를 구분하는 중이에요.{'\n'}
                    조금만 기다려 주세요.
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.navBar}>
                <Text style={styles.navTitle}>분석 결과 확인</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.pageTitle}>발화별 환자 확인</Text>
                <Text style={styles.pageDesc}>
                    AI가 식별한 내용이라 사실과 다를 수 있어요. 검토 후 저장해 주세요.
                </Text>

                {needsReview > 0 ? (
                    <View style={styles.reviewBanner}>
                        <Text style={styles.reviewText}>⚠ 환자 확인이 필요한 발화 {needsReview}건</Text>
                    </View>
                ) : null}

                {job.utterances.map((u) => {
                    const pid = patientIdOf(u);
                    const patient = pid ? patientMap[pid] : undefined;
                    const isNurse = u.speakerRole === 'NURSE';
                    const unmatched = !isNurse && !pid;

                    return (
                        <View key={u.utteranceId} style={[styles.card, unmatched && styles.cardWarn]}>
                            <View style={styles.cardHead}>
                                <Text style={styles.timeText}>{msToTime(u.startedAtMs)}</Text>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleText}>{ROLE_LABEL[u.speakerRole]}</Text>
                                </View>
                                {u.confidence !== null && u.confidence < 0.7 ? (
                                    <View style={styles.lowBadge}>
                                        <Text style={styles.lowText}>신뢰도 낮음</Text>
                                    </View>
                                ) : null}
                            </View>

                            <Text style={styles.utterText}>{u.text}</Text>

                            {!isNurse ? (
                                <Pressable style={styles.select} onPress={() => setPicking(u)}>
                                    <Image
                                        source={require('../../assets/icons/person.png')}
                                        style={styles.selectIcon}
                                        resizeMode="contain"
                                    />
                                    <Text style={[styles.selectText, !patient && styles.selectPlaceholder]}>
                                        {patient
                                            ? `${patient.roomLabel ?? ''} ${patient.displayName}`.trim()
                                            : '환자 선택'}
                                    </Text>
                                    <Text style={styles.selectChevron}>⌄</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    );
                })}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
                <Pressable
                    style={[styles.primaryBtn, saving && styles.btnDisabled]}
                    onPress={handleConfirm}
                    disabled={saving}
                >
                    <Text style={styles.primaryBtnText}>{saving ? '저장 중...' : '확인 완료'}</Text>
                </Pressable>
            </View>

            <SpeakerPicker
                utterance={picking}
                job={job}
                patients={patients}
                onSelect={(id) => {
                    if (picking) setEdits({ ...edits, [picking.utteranceId]: id });
                    setPicking(null);
                }}
                onClose={() => setPicking(null)}
            />
        </View>
    );
}

function SpeakerPicker({
    utterance, job, patients, onSelect, onClose,
}: {
    utterance: AnalysisUtterance | null;
    job: AnalysisJob;
    patients: ApiPatient[];
    onSelect: (id: string | null) => void;
    onClose: () => void;
}) {
    const top3 = utterance ? matchesFor(job, utterance.speakerLabel) : [];
    const topIds = new Set(top3.map((m) => m.candidatePatientId));
    const rest = patients.filter((p) => !topIds.has(p.patientId));

    return (
        <Modal
            visible={!!utterance}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.sheet}>
                    <View style={styles.sheetHandle} />
                    <Text style={styles.sheetTitle}>환자 선택</Text>

                    <ScrollView style={styles.sheetList}>
                        {top3.length > 0 ? (
                            <>
                                <Text style={styles.sheetSection}>음성 매칭 후보</Text>
                                {top3.map((m) => (
                                    <Pressable
                                        key={m.candidatePatientId}
                                        style={styles.sheetRow}
                                        onPress={() => onSelect(m.candidatePatientId)}
                                    >
                                        <View style={styles.flex}>
                                            <Text style={styles.sheetName}>{m.displayName}</Text>
                                            <Text style={styles.sheetSim}>
                                                일치율 {Math.round(m.similarity * 100)}%
                                            </Text>
                                        </View>
                                        <View style={styles.rankBadge}>
                                            <Text style={styles.rankText}>{m.rank}</Text>
                                        </View>
                                    </Pressable>
                                ))}
                                <View style={styles.sheetDivider} />
                            </>
                        ) : null}

                        <Text style={styles.sheetSection}>전체 환자</Text>
                        {rest.map((p) => (
                            <Pressable
                                key={p.patientId}
                                style={styles.sheetRow}
                                onPress={() => onSelect(p.patientId)}
                            >
                                <View style={styles.flex}>
                                    <Text style={styles.sheetRoom}>{p.roomLabel ?? '병실 미지정'}</Text>
                                    <Text style={styles.sheetName}>{p.displayName}</Text>
                                </View>
                            </Pressable>
                        ))}

                        <Pressable style={styles.sheetRow} onPress={() => onSelect(null)}>
                            <Text style={styles.sheetNone}>환자 없음 (간호사·제3자)</Text>
                        </Pressable>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xxl },

    loadingTitle: { fontSize: 19, fontWeight: '700', color: colors.text, marginTop: spacing.md },
    loadingDesc: { ...font.small, color: colors.textDim, textAlign: 'center', lineHeight: 20 },

    navBar: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
    navTitle: { textAlign: 'center', ...font.h2, color: colors.text },

    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    pageTitle: { fontSize: 21, fontWeight: '700', color: colors.text },
    pageDesc: { ...font.small, color: colors.textDim, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 19 },

    reviewBanner: {
        backgroundColor: colors.primarySoft, borderRadius: radius.md,
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        marginBottom: spacing.lg,
    },
    reviewText: { ...font.small, fontWeight: '600', color: colors.primary },

    card: {
        backgroundColor: colors.card, borderRadius: radius.xl,
        padding: spacing.xl, marginBottom: spacing.md,
    },
    cardWarn: { borderWidth: 1, borderColor: colors.primary },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    timeText: { ...font.small, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
    roleBadge: {
        backgroundColor: colors.bg, borderRadius: radius.sm,
        paddingHorizontal: spacing.sm, paddingVertical: 3,
    },
    roleText: { ...font.tiny, color: colors.textSub },
    lowBadge: {
        backgroundColor: colors.primarySoft, borderRadius: radius.sm,
        paddingHorizontal: spacing.sm, paddingVertical: 3,
    },
    lowText: { ...font.tiny, color: colors.primary },

    utterText: { ...font.body, color: colors.text, lineHeight: 22 },

    select: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        paddingHorizontal: spacing.lg, height: 46, marginTop: spacing.md,
    },
    selectIcon: { width: 18, height: 18 },
    selectText: { flex: 1, ...font.small, color: colors.text },
    selectPlaceholder: { color: colors.textDim },
    selectChevron: { fontSize: 15, color: colors.textDim },

    footer: { paddingHorizontal: spacing.lg },
    primaryBtn: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 17, alignItems: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    btnDisabled: { opacity: 0.5 },
    ghostBtn: { paddingVertical: spacing.md },
    ghostText: { ...font.body, color: colors.textSub },
    errorText: { ...font.body, color: colors.danger, textAlign: 'center' },

    backdrop: { flex: 1, backgroundColor: 'rgba(20,20,30,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, maxHeight: '75%',
    },
    sheetHandle: {
        width: 38, height: 4, borderRadius: radius.pill,
        backgroundColor: colors.border, alignSelf: 'center', marginVertical: spacing.md,
    },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    sheetSection: { ...font.small, fontWeight: '600', color: colors.textSub, marginTop: spacing.md, marginBottom: spacing.sm },
    sheetList: { marginBottom: spacing.md },
    sheetRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderRadius: radius.md,
    },
    sheetRoom: { ...font.small, color: colors.textDim },
    sheetName: { ...font.body, color: colors.text, marginTop: 2 },
    sheetSim: { ...font.small, color: colors.primary, marginTop: 2 },
    sheetNone: { ...font.body, color: colors.textDim },
    sheetDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
    rankBadge: {
        width: 24, height: 24, borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
        alignItems: 'center', justifyContent: 'center',
    },
    rankText: { ...font.tiny, fontWeight: '700', color: colors.primary },
});