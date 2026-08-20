import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, Image, Pressable, ScrollView, TextInput, Modal,
    ActivityIndicator, RefreshControl, StyleSheet, Alert,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    fetchTasks, createTask, updateTask, todayKey, dueAtFrom, dueTextOf,
    PRIORITY_LABEL, PRIORITY_COLOR, DUE_LABEL,
    ApiTask, TaskPriority, DueKind,
} from '../api/tasks';
import { fetchPatients, ApiPatient } from '../api/patients';
import { colors, spacing, radius, font, layout } from '../theme';
//commit 전에 false로 만들어야 함!!
const USE_MOCK = true;

const MOCK_TASKS: ApiTask[] = [
    {
        taskId: 'mock-1', patientId: null, title: '통증 재사정 필요',
        description: null, dueAt: new Date(Date.now() + 3600000).toISOString(),
        workDate: todayKey(), status: 'TODO', source: 'MANUAL',
        aiSuggestion: null, rulePriority: 'CRITICAL', confirmedPriority: null,
        effectivePriority: 'CRITICAL', version: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
        taskId: 'mock-2', patientId: null, title: '산소 포화도 재측정',
        description: null, dueAt: new Date(Date.now() + 3 * 3600000).toISOString(),
        workDate: todayKey(), status: 'DONE', source: 'AI_EXTRACTED',
        aiSuggestion: { suggestedPriority: 'HIGH', reasons: ['SpO2 88% 반복'], confidence: 'HIGH' },
        rulePriority: 'HIGH', confirmedPriority: null,
        effectivePriority: 'HIGH', version: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
        taskId: 'mock-3', patientId: null, title: '의사 보고 결과 확인',
        description: null, dueAt: new Date(Date.now() + 9 * 3600000).toISOString(),
        workDate: todayKey(), status: 'DONE', source: 'MANUAL',
        aiSuggestion: null, rulePriority: 'NORMAL', confirmedPriority: null,
        effectivePriority: 'NORMAL', version: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
        taskId: 'mock-4', patientId: null, title: 'CT 결과 확인 후 인계',
        description: null, dueAt: new Date(Date.now() + 10 * 3600000).toISOString(),
        workDate: todayKey(), status: 'DONE', source: 'MANUAL',
        aiSuggestion: null, rulePriority: 'CRITICAL', confirmedPriority: null,
        effectivePriority: 'CRITICAL', version: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
        taskId: 'mock-5', patientId: null, title: 'PCA 효과 재평가',
        description: null, dueAt: new Date(Date.now() + 5 * 3600000).toISOString(),
        workDate: todayKey(), status: 'TODO', source: 'MANUAL',
        aiSuggestion: null, rulePriority: 'HIGH', confirmedPriority: null,
        effectivePriority: 'HIGH', version: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
];

// 여기까지!

type FilterKey = 'ALL' | 'TODO' | 'DONE';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'TODO', label: '미완료' },
    { key: 'DONE', label: '완료' },
];

const PRIORITIES: TaskPriority[] = ['CRITICAL', 'HIGH', 'NORMAL'];
const DUES: DueKind[] = ['NOW', 'SHIFT', 'HANDOFF'];

export default function TaskScreen({ onGoExtraction }: { onGoExtraction: () => void }) {
    const insets = useSafeAreaInsets();

    const [tasks, setTasks] = useState<ApiTask[]>([]);
    const [patients, setPatients] = useState<ApiPatient[]>([]);
    const [filter, setFilter] = useState<FilterKey>('ALL');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [composerOpen, setComposerOpen] = useState(false);
    const [editing, setEditing] = useState<ApiTask | null>(null);

    // const load = useCallback(async () => {
    //     try {
    //         setError(null);
    //         const [t, p] = await Promise.all([fetchTasks(todayKey()), fetchPatients()]);
    //         setTasks(t.items ?? []);
    //         setPatients(p.items ?? []);
    //     } catch (e: any) {
    //         setError(e.message ?? '업무를 불러오지 못했어요');
    //     } finally {
    //         setLoading(false);
    //         setRefreshing(false);
    //     }
    // }, []);

    //commit 전에 되돌리기!
    const load = useCallback(async () => {
        try {
            setError(null);
            const p = await fetchPatients();
            setPatients(p.items ?? []);

            if (USE_MOCK) {
                setTasks(MOCK_TASKS);
            } else {
                const t = await fetchTasks(todayKey());
                setTasks(t.items ?? []);
            }
        } catch (e: any) {
            setError(e.message ?? '업무를 불러오지 못했어요');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    //여기까징

    useEffect(() => {
        load();
    }, [load]);

    const patientMap = useMemo(() => {
        const m: Record<string, ApiPatient> = {};
        for (const p of patients) m[p.patientId] = p;
        return m;
    }, [patients]);

    const filtered = useMemo(() => {
        if (filter === 'ALL') return tasks;
        if (filter === 'DONE') return tasks.filter((t) => t.status === 'DONE');
        return tasks.filter((t) => t.status !== 'DONE');
    }, [tasks, filter]);

    const toggleDone = async (task: ApiTask) => {
        const next = task.status === 'DONE' ? 'TODO' : 'DONE';

        setTasks((prev) =>
            prev.map((t) => (t.taskId === task.taskId ? { ...t, status: next } : t)),
        );
        //아래 지우기
        if (USE_MOCK) return;

        try {
            const updated = await updateTask(task.taskId, {
                version: task.version,
                status: next,
            });
            setTasks((prev) => prev.map((t) => (t.taskId === updated.taskId ? updated : t)));
        } catch (e: any) {
            console.log('업무 상태 변경 실패:', e.code, e.message);
            setTasks((prev) =>
                prev.map((t) => (t.taskId === task.taskId ? { ...t, status: task.status } : t)),
            );
        }
    };

    const handleSubmit = async (payload: {
        title: string;
        patientId: string | null;
        priority: TaskPriority;
        due: DueKind;
    }) => {
        setComposerOpen(false);
        const target = editing;
        setEditing(null);
        //여기부터
        if (USE_MOCK) {
            if (target) {
                setTasks((prev) =>
                    prev.map((t) =>
                        t.taskId === target.taskId ? { ...t, title: payload.title, effectivePriority: payload.priority } : t,
                    ),
                );
            } else {
                setTasks((prev) => [
                    {
                        ...MOCK_TASKS[0],
                        taskId: `mock-${Date.now()}`,
                        title: payload.title,
                        patientId: payload.patientId,
                        dueAt: dueAtFrom(payload.due),
                        effectivePriority: payload.priority,
                        status: 'TODO',
                        source: 'MANUAL',
                    },
                    ...prev,
                ]);
            }
            return;
        }
        //여기까지 지우깅

        try {
            if (target) {
                const updated = await updateTask(target.taskId, {
                    version: target.version,
                    title: payload.title,
                    dueAt: dueAtFrom(payload.due),
                    priorityOverride: payload.priority,
                });
                setTasks((prev) => prev.map((t) => (t.taskId === updated.taskId ? updated : t)));
            } else {
                const created = await createTask({
                    title: payload.title,
                    patientId: payload.patientId,
                    dueAt: dueAtFrom(payload.due),
                    priorityOverride: payload.priority,
                });
                setTasks((prev) => [created, ...prev]);
            }
        } catch (e: any) {
            console.log('업무 저장 실패:', e.code, e.message);
            Alert.alert('저장 실패', e.message ?? '다시 시도해주세요');
        }
    };

    const handleExtract = () => {
        Alert.alert(
            '라운딩에서 추출',
            '라운딩 기록에서 업무 후보를 추출하는 기능입니다. 아직 연동 중이에요.',
        );
    };

    return (
        <View style={[styles.root, { paddingTop: insets.top + layout.screenTopGap }]}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>업무</Text>
                <Pressable style={styles.extractBtn} onPress={handleExtract} hitSlop={8}>
                    <Image
                        source={require('../../assets/icons/ai.png')}
                        style={styles.extractIcon}
                        resizeMode="contain"
                    />
                    <Text style={styles.extractText}>라운딩에서 추출</Text>
                </Pressable>
            </View>

            <View style={styles.chipRow}>
                {FILTERS.map((f) => {
                    const active = filter === f.key;
                    return (
                        <Pressable
                            key={f.key}
                            style={[styles.filterChip, active && styles.filterChipActive]}
                            onPress={() => setFilter(f.key)}
                        >
                            <Text style={[styles.filterText, active && styles.filterTextActive]}>
                                {f.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retryBtn} onPress={load}>
                        <Text style={styles.retryText}>다시 시도</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                load();
                            }}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {filtered.map((task) => (
                        <TaskRow
                            key={task.taskId}
                            task={task}
                            patient={task.patientId ? patientMap[task.patientId] : undefined}
                            onToggle={() => toggleDone(task)}
                            onEdit={() => {
                                setEditing(task);
                                setComposerOpen(true);
                            }}
                        />
                    ))}

                    {filtered.length === 0 ? (
                        <Text style={styles.emptyText}>등록된 업무가 없어요</Text>
                    ) : null}
                </ScrollView>
            )}

            <Pressable
                style={[styles.fab, { bottom: Math.max(insets.bottom, spacing.lg) + spacing.md }]}
                onPress={() => {
                    setEditing(null);
                    setComposerOpen(true);
                }}
            >
                <Text style={styles.fabIcon}>+</Text>
            </Pressable>

            <TaskComposer
                visible={composerOpen}
                editing={editing}
                patients={patients}
                onSubmit={handleSubmit}
                onClose={() => {
                    setComposerOpen(false);
                    setEditing(null);
                }}
            />
        </View>
    );
}

function TaskRow({
    task, patient, onToggle, onEdit,
}: {
    task: ApiTask;
    patient?: ApiPatient;
    onToggle: () => void;
    onEdit: () => void;
}) {
    const done = task.status === 'DONE';
    const due = dueTextOf(task.dueAt);

    return (
        <View style={styles.card}>
            <Pressable style={styles.checkBtn} onPress={onToggle} hitSlop={8}>
                <View style={[styles.checkCircle, done && styles.checkCircleOn]}>
                    {done ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
            </Pressable>

            <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                    <Text style={[styles.taskTitle, done && styles.taskTitleDone]} numberOfLines={2}>
                        {task.title}
                    </Text>
                    <View
                        style={[
                            styles.priorityDot,
                            { backgroundColor: PRIORITY_COLOR[task.effectivePriority] },
                        ]}
                    />
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

                {due ? (
                    <View style={styles.dueRow}>
                        <Text style={styles.dueClock}>◷</Text>
                        <Text style={styles.dueText}>{due}</Text>
                    </View>
                ) : null}

                {task.source === 'AI_EXTRACTED' ? (
                    <View style={styles.sourceBadge}>
                        <Text style={styles.sourceText}>라운딩 추출</Text>
                    </View>
                ) : null}
            </View>

            <Pressable onPress={onEdit} hitSlop={8}>
                <Image
                    source={require('../../assets/icons/edit.png')}
                    style={styles.editIcon}
                    resizeMode="contain"
                />
            </Pressable>
        </View>
    );
}

function TaskComposer({
    visible, editing, patients, onSubmit, onClose,
}: {
    visible: boolean;
    editing: ApiTask | null;
    patients: ApiPatient[];
    onSubmit: (p: {
        title: string;
        patientId: string | null;
        priority: TaskPriority;
        due: DueKind;
    }) => void;
    onClose: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState('');
    const [patientId, setPatientId] = useState<string | null>(null);
    const [priority, setPriority] = useState<TaskPriority>('HIGH');
    const [due, setDue] = useState<DueKind>('SHIFT');
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setTitle(editing?.title ?? '');
        setPatientId(editing?.patientId ?? null);
        setPriority(editing?.effectivePriority ?? 'HIGH');
        setDue('SHIFT');
    }, [visible, editing]);

    const selected = patients.find((p) => p.patientId === patientId);
    const selectedLabel = selected
        ? `${selected.roomLabel ?? ''} ${selected.displayName}`.trim()
        : null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.composerRoot}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Pressable style={styles.flex} onPress={onClose} />

                <View
                    style={[
                        styles.composerSheet,
                        { paddingBottom: Math.max(insets.bottom, spacing.xl) },
                    ]}
                >
                    <View style={styles.composerHead}>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <Text style={styles.closeIcon}>✕</Text>
                        </Pressable>
                        <Text style={styles.composerTitle}>
                            {editing ? '업무 수정' : '새 항목 추가'}
                        </Text>
                        <Pressable
                            onPress={() => onSubmit({ title: title.trim(), patientId, priority, due })}
                            disabled={!title.trim()}
                            hitSlop={10}
                        >
                            <Text style={[styles.saveText, !title.trim() && styles.saveTextOff]}>
                                저장
                            </Text>
                        </Pressable>
                    </View>

                    <TextInput
                        style={styles.titleInput}
                        placeholder="할 일을 입력하세요..."
                        placeholderTextColor={colors.textDim}
                        value={title}
                        onChangeText={setTitle}
                    />

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

                    <Text style={styles.fieldLabel}>업무 우선순위</Text>
                    <View style={styles.optionRow}>
                        {PRIORITIES.map((p) => {
                            const active = priority === p;
                            return (
                                <Pressable
                                    key={p}
                                    style={[styles.optionChip, active && styles.optionChipActive]}
                                    onPress={() => setPriority(p)}
                                >
                                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                                        {PRIORITY_LABEL[p]}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Text style={styles.fieldLabel}>처리 기한</Text>
                    <View style={styles.optionRow}>
                        {DUES.map((d) => {
                            const active = due === d;
                            return (
                                <Pressable
                                    key={d}
                                    style={[styles.optionChip, active && styles.optionChipActive]}
                                    onPress={() => setDue(d)}
                                >
                                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                                        {DUE_LABEL[d]}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

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
            </KeyboardAvoidingView>
        </Modal>
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
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
    extractBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    extractIcon: { width: 15, height: 15 },
    extractText: { ...font.small, fontWeight: '600', color: colors.primary },

    chipRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    filterChip: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.lg,
        paddingVertical: 7,
        backgroundColor: colors.card,
    },
    filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    filterText: { ...font.small, color: colors.textSub },
    filterTextActive: { color: colors.primary, fontWeight: '600' },

    list: { flex: 1 },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },

    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.md,
    },
    checkBtn: { paddingTop: 2 },
    checkCircle: {
        width: 22, height: 22, borderRadius: radius.pill,
        borderWidth: 2, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    checkCircleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkMark: { fontSize: 12, fontWeight: '700', color: '#fff' },

    cardBody: { flex: 1, gap: spacing.xs },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    taskTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
    taskTitleDone: { color: colors.textDim },
    priorityDot: { width: 7, height: 7, borderRadius: radius.pill },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    meta: { ...font.small, color: colors.textSub },
    metaDot: { color: colors.textDim, fontSize: 10 },

    dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
    dueClock: { fontSize: 11, color: colors.textDim },
    dueText: { ...font.small, color: colors.textDim },

    sourceBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primarySoft,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        marginTop: spacing.sm,
    },
    sourceText: { ...font.tiny, color: colors.primary },

    editIcon: { width: 16, height: 16, marginTop: 3 },

    emptyText: {
        ...font.small, color: colors.textDim,
        textAlign: 'center', marginTop: spacing.xxl,
    },
    errorText: { ...font.small, color: colors.danger, textAlign: 'center' },
    retryBtn: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    },
    retryText: { ...font.small, fontWeight: '600', color: colors.text },

    fab: {
        position: 'absolute',
        right: spacing.xl,
        width: 56, height: 56, borderRadius: radius.pill,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    fabIcon: { fontSize: 30, fontWeight: '300', color: '#fff', lineHeight: 34 },

    composerRoot: { flex: 1, backgroundColor: 'rgba(20,20,30,0.35)' },
    composerSheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    composerHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    closeIcon: { fontSize: 18, color: colors.textSub },
    composerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    saveText: { fontSize: 15, fontWeight: '700', color: colors.primary },
    saveTextOff: { color: colors.border },

    titleInput: {
        backgroundColor: colors.bg,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        height: 52,
        ...font.body,
        color: colors.text,
        marginBottom: spacing.md,
    },

    select: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.bg, borderRadius: radius.md,
        paddingHorizontal: spacing.lg, height: 52,
        marginBottom: spacing.xl,
    },
    selectIcon: { width: 20, height: 20 },
    selectText: { flex: 1, ...font.body, color: colors.text },
    selectPlaceholder: { color: colors.textDim },
    selectChevron: { fontSize: 15, color: colors.textDim },

    fieldLabel: {
        ...font.small, fontWeight: '600',
        color: colors.textSub, marginBottom: spacing.md,
    },
    optionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    optionChip: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.lg,
        paddingVertical: 8,
    },
    optionChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    optionText: { ...font.small, color: colors.textSub },
    optionTextActive: { color: colors.primary, fontWeight: '600' },

    backdrop: { flex: 1, backgroundColor: 'rgba(20,20,30,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, maxHeight: '70%',
    },
    sheetHandle: {
        width: 38, height: 4, borderRadius: radius.pill,
        backgroundColor: colors.border, alignSelf: 'center', marginVertical: spacing.md,
    },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
    sheetList: { marginBottom: spacing.md },
    sheetEmpty: {
        ...font.small, color: colors.textDim,
        textAlign: 'center', paddingVertical: spacing.xl,
    },
    sheetRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderRadius: radius.md,
    },
    sheetRowActive: { backgroundColor: colors.primarySoft },
    sheetRoom: { ...font.small, color: colors.textDim },
    sheetName: { ...font.body, color: colors.text, marginTop: 2 },
    check: { fontSize: 16, color: colors.primary },
});