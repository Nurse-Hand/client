import { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, Pressable, ScrollView,
    ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    startExtraction, fetchExtractionJob, applyCandidates,
    ExtractionJob, TaskCandidate,
} from '../api/taskExtraction';
import { fetchRoundingRecords, ApiRoundingRecord } from '../api/roundingRecords';
import { fetchPatients, ApiPatient } from '../api/patients';
import { PRIORITY_LABEL, PRIORITY_COLOR, dueTextOf } from '../api/tasks';
import { colors, spacing, radius, font } from '../theme';

const POLL_MS = 3000;
const MAX_POLL = 30;

interface Props {
    onBack: () => void;
    onApplied: () => void;
}

export default function TaskExtractionScreen({ onBack, onApplied }: Props) {
    const insets = useSafeAreaInsets();

    const [job, setJob] = useState<ExtractionJob | null>(null);
    const [patients, setPatients] = useState<ApiPatient[]>([]);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [applying, setApplying] = useState(false);
    const pollCount = useRef(0);

    useEffect(() => {
        (async () => {
            try {
                const [recs, ps] = await Promise.all([fetchRoundingRecords(), fetchPatients()]);
                setPatients(ps.items ?? []);

                const items = recs.items ?? [];
                if (items.length === 0) {
                    setError('오늘 라운딩 기록이 없어요');
                    return;
                }

                const sessionId = items[0].sessionId;
                const recordIds = items
                    .filter((r: ApiRoundingRecord) => r.sessionId === sessionId)
                    .map((r: ApiRoundingRecord) => r.recordId);

                const started = await startExtraction(sessionId, recordIds);
                setJob(started);
                poll(started.jobId);
            } catch (e: any) {
                setError(e.message ?? '업무 추출을 시작하지 못했어요');
            }
        })();
    }, []);

    const poll = (jobId: string) => {
        const tick = async () => {
            try {
                const j = await fetchExtractionJob(jobId);
                setJob(j);

                if (j.status === 'SUCCEEDED') {
                    const init: Record<string, boolean> = {};
                    for (const c of j.candidates) {
                        init[c.candidateId] = !c.duplicateTaskId && !c.appliedTaskId;
                    }
                    setSelected(init);
                    return;
                }
                if (j.status === 'FAILED') {
                    setError('업무 추출에 실패했어요');
                    return;
                }

                pollCount.current += 1;
                if (pollCount.current > MAX_POLL) {
                    setError('추출이 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.');
                    return;
                }
                setTimeout(tick, POLL_MS);
            } catch (e: any) {
                setError(e.message ?? '결과를 불러오지 못했어요');
            }
        };
        tick();
    };

    const patientMap = useMemo(() => {
        const m: Record<string, ApiPatient> = {};
        for (const p of patients) m[p.patientId] = p;
        return m;
    }, [patients]);

    const selectedCount = useMemo(
        () => Object.values(selected).filter(Boolean).length,
        [selected],
    );

    const handleApply = async () => {
        if (!job) return;
        setApplying(true);
        try {
            const res = await applyCandidates(
                job.jobId,
                job.candidates.map((c) => ({
                    candidateId: c.candidateId,
                    selected: !!selected[c.candidateId],
                })),
            );
            Alert.alert('반영 완료', `업무 ${res.createdTaskIds.length}건이 추가되었어요.`, [
                { text: '확인', onPress: onApplied },
            ]);
        } catch (e: any) {
            console.log('업무 반영 실패:', e.code, e.message);
            Alert.alert('반영 실패', e.message ?? '다시 시도해주세요');
        }
        setApplying(false);
    };

    if (error) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.ghostBtn} onPress={onBack}>
                    <Text style={styles.ghostText}>닫기</Text>
                </Pressable>
            </View>
        );
    }

    if (!job || job.status !== 'SUCCEEDED') {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingTitle}>라운딩 기록을 분석하고 있어요</Text>
                <Text style={styles.loadingDesc}>
                    대화 내용에서 처리할 업무를 찾는 중이에요.
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.navBar}>
                <Pressable onPress={onBack} hitSlop={12}>
                    <Text style={styles.backIcon}>‹</Text>
                </Pressable>
                <Text style={styles.navTitle}>업무 후보</Text>
                <View style={styles.navSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.pageTitle}>추출된 업무 {job.candidates.length}건</Text>
                <Text style={styles.pageDesc}>
                    AI가 라운딩 기록에서 찾은 업무예요. 필요한 것만 선택해 주세요.
                </Text>

                {job.candidates.length === 0 ? (
                    <Text style={styles.emptyText}>추출된 업무가 없어요</Text>
                ) : (
                    job.candidates.map((c) => (
                        <CandidateCard
                            key={c.candidateId}
                            candidate={c}
                            patient={c.patientId ? patientMap[c.patientId] : undefined}
                            checked={!!selected[c.candidateId]}
                            onToggle={() =>
                                setSelected({ ...selected, [c.candidateId]: !selected[c.candidateId] })
                            }
                        />
                    ))
                )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
                <Pressable
                    style={[styles.primaryBtn, (applying || selectedCount === 0) && styles.btnDisabled]}
                    onPress={handleApply}
                    disabled={applying || selectedCount === 0}
                >
                    <Text style={styles.primaryBtnText}>
                        {applying ? '반영 중...' : `${selectedCount}건 업무에 추가`}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

function CandidateCard({
    candidate, patient, checked, onToggle,
}: {
    candidate: TaskCandidate;
    patient?: ApiPatient;
    checked: boolean;
    onToggle: () => void;
}) {
    const [open, setOpen] = useState(false);
    const dup = !!candidate.duplicateTaskId;
    const due = dueTextOf(candidate.dueAt);
    const priority = candidate.aiSuggestion?.suggestedPriority;

    return (
        <View style={[styles.card, dup && styles.cardDim]}>
            <View style={styles.cardTop}>
                <Pressable onPress={onToggle} hitSlop={8}>
                    <View style={[styles.checkCircle, checked && styles.checkCircleOn]}>
                        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                </Pressable>

                <View style={styles.flex}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={2}>{candidate.title}</Text>
                        {priority ? (
                            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[priority] }]} />
                        ) : null}
                    </View>

                    <View style={styles.metaRow}>
                        <Text style={styles.meta}>{patient?.displayName ?? '환자 미지정'}</Text>
                        {patient?.roomLabel ? (
                            <>
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.meta}>{patient.roomLabel}</Text>
                            </>
                        ) : null}
                    </View>

                    {due ? <Text style={styles.dueText}>◷ {due}</Text> : null}

                    {dup ? (
                        <View style={styles.dupBadge}>
                            <Text style={styles.dupText}>이미 등록된 업무</Text>
                        </View>
                    ) : null}
                </View>
            </View>

            {candidate.aiSuggestion?.reasons?.length ? (
                <>
                    <View style={styles.divider} />
                    <Pressable onPress={() => setOpen(!open)} hitSlop={6}>
                        <Text style={styles.reasonToggle}>
                            추천 근거 {open ? '⌃' : '⌄'}
                        </Text>
                    </Pressable>

                    {open ? (
                        <View style={styles.reasonBox}>
                            {candidate.aiSuggestion.reasons.map((r, i) => (
                                <Text key={i} style={styles.reasonText}>· {r}</Text>
                            ))}
                            {priority ? (
                                <Text style={styles.confidence}>
                                    제안 우선순위 {PRIORITY_LABEL[priority]} · 신뢰도{' '}
                                    {candidate.aiSuggestion.confidence}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        gap: spacing.lg, paddingHorizontal: spacing.xxl,
    },

    loadingTitle: { fontSize: 19, fontWeight: '700', color: colors.text, marginTop: spacing.md },
    loadingDesc: { ...font.small, color: colors.textDim, textAlign: 'center' },

    navBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    },
    backIcon: { fontSize: 30, color: colors.text, lineHeight: 32 },
    navTitle: { flex: 1, textAlign: 'center', ...font.h2, color: colors.text },
    navSpacer: { width: 20 },

    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    pageTitle: { fontSize: 21, fontWeight: '700', color: colors.text },
    pageDesc: {
        ...font.small, color: colors.textDim,
        marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 19,
    },

    card: {
        backgroundColor: colors.card, borderRadius: radius.xl,
        padding: spacing.xl, marginBottom: spacing.md,
    },
    cardDim: { opacity: 0.55 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },

    checkCircle: {
        width: 22, height: 22, borderRadius: radius.pill,
        borderWidth: 2, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    checkCircleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkMark: { fontSize: 12, fontWeight: '700', color: '#fff' },

    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
    priorityDot: { width: 7, height: 7, borderRadius: radius.pill },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
    meta: { ...font.small, color: colors.textSub },
    metaDot: { color: colors.textDim, fontSize: 10 },
    dueText: { ...font.small, color: colors.textDim, marginTop: 2 },

    dupBadge: {
        alignSelf: 'flex-start', backgroundColor: colors.bg,
        borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3,
        marginTop: spacing.sm,
    },
    dupText: { ...font.tiny, color: colors.textSub },

    divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
    reasonToggle: { ...font.small, color: colors.primary, textAlign: 'center' },
    reasonBox: {
        backgroundColor: colors.bg, borderRadius: radius.md,
        padding: spacing.md, marginTop: spacing.sm, gap: spacing.xs,
    },
    reasonText: { ...font.small, color: colors.textSub, lineHeight: 19 },
    confidence: { ...font.tiny, color: colors.textDim, marginTop: spacing.xs },

    footer: { paddingHorizontal: spacing.lg },
    primaryBtn: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 17, alignItems: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    btnDisabled: { opacity: 0.4 },
    ghostBtn: { paddingVertical: spacing.md },
    ghostText: { ...font.body, color: colors.textSub },

    emptyText: { ...font.small, color: colors.textDim, textAlign: 'center', marginTop: spacing.xxl },
    errorText: { ...font.body, color: colors.danger, textAlign: 'center' },
});