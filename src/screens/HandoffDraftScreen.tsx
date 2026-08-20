import { useState, useEffect, useMemo } from 'react';
import {
    View, Text, Image, Pressable, ScrollView, TextInput, Modal,
    ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    createHandoff, fetchHandoff, finalizeHandoff, citationsOf, summaryOf,
    filledSectionsOf, citationTime,
    SECTION_LABEL, SectionKey, HandoffDraft, HandoffPatient, HandoffTask,
} from '../api/handoffs';
import { fetchPatients, ApiPatient } from '../api/patients';
import { PRIORITY_COLOR } from '../api/tasks';
import { colors, spacing, radius, font } from '../theme';
import { ensureTodayShift, nextDuty, todayKey } from '../api/schedules';

type Step = 'SECTIONS' | 'TASKS';

interface Props {
    onBack: () => void;
    onComplete: () => void;
}

export default function HandoffDraftScreen({ onBack, onComplete }: Props) {
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState<Step>('SECTIONS');
    const [draft, setDraft] = useState<HandoffDraft | null>(null);
    const [patients, setPatients] = useState<ApiPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [taskOrder, setTaskOrder] = useState<HandoffTask[]>([]);
    const [editing, setEditing] = useState<{
        patientId: string;
        key: SectionKey;
        value: string;
    } | null>(null);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const p = await fetchPatients();
                if (alive) setPatients(p.items ?? []);
            } catch (e: any) {
                console.log('환자 조회 실패:', e.code, e.message);
            }

            try {
                const created = await createHandoff({
                    date: '2026-08-20',
                    shiftId: '71e9f618-dc9a-47ca-9a00-85f138b3f12b',
                    targetDuty: 'EVENING',
                });
                console.log('초안 생성:', created.handoffId, created.status);

                let d = created;
                for (let i = 0; i < 15; i++) {
                    if (!alive) return;
                    if (d.status !== 'GENERATING' && d.patients?.length) break;
                    await new Promise((r) => setTimeout(r, 2000));
                    d = await fetchHandoff(created.handoffId);
                    console.log('초안 상태:', d.status, '환자', d.patients?.length ?? 0);
                }

                if (!alive) return;
                setDraft(d);
                setTaskOrder(d.tasks ?? []);
            } catch (e: any) {
                console.log('초안 생성 실패:', e.code, e.message);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    const patientMap = useMemo(() => {
        const m: Record<string, ApiPatient> = {};
        for (const p of patients) m[p.patientId] = p;
        return m;
    }, [patients]);

    const saveSection = () => {
        if (!editing || !draft) return;
        setDraft({
            ...draft,
            patients: draft.patients.map((p) =>
                p.patientId === editing.patientId
                    ? { ...p, sections: { ...p.sections, [editing.key]: editing.value } }
                    : p,
            ),
        });
        setEditing(null);
    };

    const moveTask = (index: number, dir: -1 | 1) => {
        const next = index + dir;
        if (next < 0 || next >= taskOrder.length) return;
        const copy = [...taskOrder];
        [copy[index], copy[next]] = [copy[next], copy[index]];
        setTaskOrder(copy);
    };

    const handleFinalize = async () => {
        if (!draft) return;
        try {
            await finalizeHandoff(draft.handoffId, draft.version);
        } catch (e: any) {
            console.log('인수인계 확정 실패:', e.code, e.message);
        }
        Alert.alert('인수인계 완료', '인수인계가 확정되었어요.', [
            { text: '확인', onPress: onComplete },
        ]);
    };

    if (loading || !draft) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>인수인계 초안을 만들고 있어요...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.navBar}>
                <Pressable
                    onPress={() => (step === 'TASKS' ? setStep('SECTIONS') : onBack())}
                    hitSlop={12}
                >
                    <Text style={styles.backIcon}>‹</Text>
                </Pressable>
                <Text style={styles.navTitle}>초안 검토</Text>
                <View style={styles.navSpacer} />
            </View>

            {step === 'SECTIONS' ? (
                <>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.pageTitle}>환자별 인수인계</Text>
                        <Text style={styles.pageDesc}>오늘의 기록을 바탕으로 인수인계 초안을 생성했어요.</Text>

                        {(draft.patients ?? []).map((p) => (
                            <PatientCard
                                key={p.patientId}
                                patient={p}
                                info={patientMap[p.patientId]}
                                summary={summaryOf(p, draft.warnings)}
                                expanded={expanded === p.patientId}
                                onToggle={() =>
                                    setExpanded(expanded === p.patientId ? null : p.patientId)
                                }
                                onEdit={(key, value) => setEditing({ patientId: p.patientId, key, value })}
                            />
                        ))}
                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
                        <Pressable style={styles.primaryBtn} onPress={() => setStep('TASKS')}>
                            <Text style={styles.primaryBtnText}>다음으로</Text>
                        </Pressable>
                    </View>
                </>
            ) : (
                <>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.pageTitle}>다음 듀티 전달 업무</Text>
                        <Text style={styles.pageDesc}>업무의 인계 필요도를 분석하여 우선순위를 배치했어요.</Text>

                        {taskOrder.map((t, i) => (
                            <View key={t.taskId} style={styles.taskRow}>
                                <View style={styles.rankWrap}>
                                    <View style={styles.rankCircle}>
                                        <Text style={styles.rankText}>{i + 1}</Text>
                                    </View>
                                    {i < taskOrder.length - 1 ? <View style={styles.rankLine} /> : null}
                                </View>

                                <View style={styles.taskCard}>
                                    <View style={styles.flex}>
                                        <Text style={styles.taskMeta}>
                                            {patientMap[t.patientId]?.displayName ?? '환자 미지정'}
                                            {'  '}
                                            <Text style={styles.taskRoom}>
                                                {patientMap[t.patientId]?.roomLabel ?? ''}
                                            </Text>
                                        </Text>
                                        <View style={styles.taskTitleRow}>
                                            <Text style={styles.taskTitle}>{t.title}</Text>
                                            <View
                                                style={[
                                                    styles.priorityDot,
                                                    { backgroundColor: PRIORITY_COLOR[t.effectivePriority] },
                                                ]}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.moveCol}>
                                        <Pressable onPress={() => moveTask(i, -1)} hitSlop={6}>
                                            <Text style={[styles.moveIcon, i === 0 && styles.moveIconOff]}>⌃</Text>
                                        </Pressable>
                                        <Pressable onPress={() => moveTask(i, 1)} hitSlop={6}>
                                            <Text
                                                style={[
                                                    styles.moveIcon,
                                                    i === taskOrder.length - 1 && styles.moveIconOff,
                                                ]}
                                            >
                                                ⌄
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
                        <Pressable style={styles.primaryBtn} onPress={handleFinalize}>
                            <Text style={styles.primaryBtnText}>인수인계 완료</Text>
                        </Pressable>
                    </View>
                </>
            )}

            <SectionEditor
                editing={editing}
                onChange={(v) => editing && setEditing({ ...editing, value: v })}
                onSave={saveSection}
                onClose={() => setEditing(null)}
            />
        </View>
    );
}

function PatientCard({
    patient, info, summary, expanded, onToggle, onEdit,
}: {
    patient: HandoffPatient;
    info?: ApiPatient;
    summary: string;
    expanded: boolean;
    onToggle: () => void;
    onEdit: (key: SectionKey, value: string) => void;
}) {
    const keys = filledSectionsOf(patient);

    return (
        <View style={styles.card}>
            <View style={styles.cardHead}>
                <View style={styles.flex}>
                    <Text style={styles.patientMeta}>
                        {info?.displayName ?? '환자'}
                        {'  '}
                        <Text style={styles.patientRoom}>{info?.roomLabel ?? ''}</Text>
                    </Text>
                    <Text style={styles.summary}>{summary}</Text>
                </View>

                {expanded ? (
                    <Pressable style={styles.editBtn} hitSlop={8}>
                        <Image
                            source={require('../../assets/icons/edit.png')}
                            style={styles.editIcon}
                            resizeMode="contain"
                        />
                    </Pressable>
                ) : null}
            </View>

            {patient.unverified ? (
                <View style={styles.unverifiedBadge}>
                    <Text style={styles.unverifiedText}>확인 필요</Text>
                </View>
            ) : null}

            <View style={styles.divider} />

            {expanded ? (
                <>
                    {keys.map((key) => {
                        const cites = citationsOf(patient, key);
                        return (
                            <View key={key} style={styles.sectionRow}>
                                <View style={styles.sectionHead}>
                                    <View style={styles.sectionBadge}>
                                        <Text style={styles.sectionBadgeText}>{SECTION_LABEL[key]}</Text>
                                    </View>
                                    <Pressable
                                        hitSlop={8}
                                        onPress={() => onEdit(key, patient.sections[key] ?? '')}
                                    >
                                        <Image
                                            source={require('../../assets/icons/edit.png')}
                                            style={styles.sectionEditIcon}
                                            resizeMode="contain"
                                        />
                                    </Pressable>
                                </View>

                                <Text style={styles.sectionText}>{patient.sections[key]}</Text>

                                {cites.length > 0 ? <CitationList citations={cites} /> : null}
                            </View>
                        );
                    })}

                    <Pressable style={styles.toggleBtn} onPress={onToggle}>
                        <Text style={styles.toggleText}>접기 ⌃</Text>
                    </Pressable>
                </>
            ) : (
                <Pressable style={styles.toggleBtn} onPress={onToggle}>
                    <Text style={styles.toggleText}>펼치기 ⌄</Text>
                </Pressable>
            )}
        </View>
    );
}

function CitationList({ citations }: { citations: ReturnType<typeof citationsOf> }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Pressable onPress={() => setOpen(!open)} hitSlop={6}>
                <Text style={styles.citeToggle}>원문보기 {open ? '⌃' : '›'}</Text>
            </Pressable>

            {open
                ? citations.map((c, i) => (
                    <View key={`${c.sourceId}-${i}`} style={styles.citeBox}>
                        <Text style={styles.citeTime}>{citationTime(c.occurredAt)}</Text>
                        <Text style={styles.citeText}>{c.excerpt}</Text>
                    </View>
                ))
                : null}
        </>
    );
}

function SectionEditor({
    editing, onChange, onSave, onClose,
}: {
    editing: { patientId: string; key: SectionKey; value: string } | null;
    onChange: (v: string) => void;
    onSave: () => void;
    onClose: () => void;
}) {
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={!!editing} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.editorRoot}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Pressable style={styles.flex} onPress={onClose} />

                <View style={[styles.editorSheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
                    <View style={styles.editorHead}>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <Text style={styles.closeIcon}>✕</Text>
                        </Pressable>
                        <Text style={styles.editorTitle}>
                            {editing ? SECTION_LABEL[editing.key] : ''} 수정
                        </Text>
                        <Pressable onPress={onSave} hitSlop={10}>
                            <Text style={styles.saveText}>저장</Text>
                        </Pressable>
                    </View>

                    <TextInput
                        style={styles.editorInput}
                        value={editing?.value ?? ''}
                        onChangeText={onChange}
                        multiline
                        autoFocus
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    loadingText: { ...font.small, color: colors.textSub },

    navBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    },
    backIcon: { fontSize: 30, color: colors.text, lineHeight: 32 },
    navTitle: { flex: 1, textAlign: 'center', ...font.h2, color: colors.text },
    navSpacer: { width: 20 },

    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    pageTitle: { fontSize: 21, fontWeight: '700', color: colors.text },
    pageDesc: { ...font.small, color: colors.textDim, marginTop: spacing.xs, marginBottom: spacing.lg },

    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.md,
    },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
    patientMeta: { ...font.small, color: colors.textSub },
    patientRoom: { color: colors.textDim },
    summary: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
    editBtn: {
        width: 28, height: 28, borderRadius: radius.pill,
        backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
    },
    editIcon: { width: 14, height: 14 },

    unverifiedBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primarySoft,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm, paddingVertical: 3,
        marginTop: spacing.sm,
    },
    unverifiedText: { ...font.tiny, color: colors.primary },

    divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },

    sectionRow: { marginBottom: spacing.lg },
    sectionHead: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: spacing.sm,
    },
    sectionBadge: {
        backgroundColor: colors.primarySoft, borderRadius: radius.sm,
        paddingHorizontal: spacing.md, paddingVertical: 3,
    },
    sectionBadgeText: { ...font.tiny, color: colors.primary },
    sectionEditIcon: { width: 13, height: 13 },
    sectionText: { ...font.body, color: colors.text, lineHeight: 21 },

    citeToggle: { ...font.small, color: colors.primary, marginTop: spacing.xs },
    citeBox: {
        backgroundColor: colors.bg, borderRadius: radius.md,
        padding: spacing.md, marginTop: spacing.sm,
    },
    citeTime: { ...font.tiny, color: colors.textDim, marginBottom: 2 },
    citeText: { ...font.small, color: colors.textSub, lineHeight: 19 },

    toggleBtn: { alignItems: 'center', paddingTop: spacing.sm },
    toggleText: { ...font.small, fontWeight: '600', color: colors.primary },

    taskRow: { flexDirection: 'row', marginBottom: spacing.sm },
    rankWrap: { width: 40, alignItems: 'center' },
    rankCircle: {
        width: 30, height: 30, borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
        alignItems: 'center', justifyContent: 'center',
        marginTop: spacing.lg,
    },
    rankText: { ...font.small, fontWeight: '700', color: colors.primary },
    rankLine: {
        flex: 1, width: 2, marginVertical: spacing.xs,
        backgroundColor: colors.primarySoft,
    },

    taskCard: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.card, borderRadius: radius.xl,
        padding: spacing.xl, marginBottom: spacing.sm,
    },
    taskMeta: { ...font.small, color: colors.textSub },
    taskRoom: { color: colors.textDim },
    taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
    taskTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
    priorityDot: { width: 7, height: 7, borderRadius: radius.pill },

    moveCol: { gap: spacing.xs, paddingLeft: spacing.md },
    moveIcon: { fontSize: 17, color: colors.textSub },
    moveIconOff: { color: colors.border },

    footer: { paddingHorizontal: spacing.lg },
    primaryBtn: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 17, alignItems: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    editorRoot: { flex: 1, backgroundColor: 'rgba(20,20,30,0.35)' },
    editorSheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        paddingHorizontal: spacing.xl, paddingTop: spacing.lg,
    },
    editorHead: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: spacing.lg,
    },
    closeIcon: { fontSize: 18, color: colors.textSub },
    editorTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    saveText: { fontSize: 15, fontWeight: '700', color: colors.primary },
    editorInput: {
        backgroundColor: colors.bg, borderRadius: radius.md,
        padding: spacing.lg, minHeight: 110,
        ...font.body, color: colors.text, textAlignVertical: 'top',
    },
});