import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, newIdempotencyKey } from '../api/client';
import { getMonthlySchedule, putMonthlySchedule } from '../api/schedules';
import {
    buildCalendarCandidates,
    mergeScheduleEntries,
    monthDateKeys,
    resolveCalendarCandidates,
    scheduleSaveSignature,
    selectScheduleSaveAttempt,
} from '../features/schedules/calendar-import';
import {
    readCalendarEvents,
    requestEventCalendars,
    type EventCalendarOption,
} from '../features/schedules/calendar-device';
import { colors, font, radius, spacing } from '../theme';
import type {
    CalendarCandidateDecision,
    CalendarImportCandidate,
    MonthlySchedule,
    ScheduleDuty,
} from '../types/schedules';

const DUTIES: ScheduleDuty[] = ['DAY', 'EVENING', 'NIGHT', 'OFF'];
const DUTY_LABEL: Record<ScheduleDuty, string> = {
    DAY: 'D',
    EVENING: 'E',
    NIGHT: 'N',
    OFF: 'OFF',
};

function currentYearMonth(): string {
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return now.toISOString().slice(0, 7);
}

function moveMonth(yearMonth: string, amount: number): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const result = new Date(Date.UTC(year, month - 1 + amount, 1));
    return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(yearMonth: string): string {
    const [year, month] = yearMonth.split('-');
    return `${year}년 ${Number(month)}월`;
}

function errorMessage(error: unknown): string {
    if (error instanceof ApiError || error instanceof Error) return error.message;
    return '요청을 처리하지 못했어요.';
}

export default function ScheduleImportScreen({ onClose }: { onClose: () => void }) {
    const insets = useSafeAreaInsets();
    const [yearMonth, setYearMonth] = useState(currentYearMonth);
    const [schedule, setSchedule] = useState<MonthlySchedule | null>(null);
    const [calendars, setCalendars] = useState<EventCalendarOption[]>([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<CalendarImportCandidate[]>([]);
    const [candidateDecisions, setCandidateDecisions] = useState<
        Record<string, CalendarCandidateDecision | undefined>
    >({});
    const [manualEntries, setManualEntries] = useState<Record<string, ScheduleDuty>>({});
    const [selectedManualDate, setSelectedManualDate] = useState(`${currentYearMonth()}-01`);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [canAskPermissionAgain, setCanAskPermissionAgain] = useState(true);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [loadingCalendars, setLoadingCalendars] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [saving, setSaving] = useState(false);
    const saveAttemptRef = useRef<{ signature: string; key: string } | null>(null);
    const scheduleRequestRef = useRef(0);

    const loadSchedule = async (targetMonth: string) => {
        const requestId = scheduleRequestRef.current + 1;
        scheduleRequestRef.current = requestId;
        setLoadingSchedule(true);
        try {
            const loaded = await getMonthlySchedule(targetMonth);
            if (scheduleRequestRef.current === requestId) setSchedule(loaded);
        } catch (error) {
            if (scheduleRequestRef.current === requestId) {
                setSchedule(null);
                Alert.alert('근무표 조회 실패', errorMessage(error));
            }
        } finally {
            if (scheduleRequestRef.current === requestId) setLoadingSchedule(false);
        }
    };

    useEffect(() => {
        setCandidates([]);
        setCandidateDecisions({});
        setManualEntries({});
        setSelectedManualDate(`${yearMonth}-01`);
        saveAttemptRef.current = null;
        void loadSchedule(yearMonth);
    }, [yearMonth]);

    const handleCalendarPermission = async () => {
        setLoadingCalendars(true);
        try {
            const result = await requestEventCalendars();
            setPermissionDenied(!result.granted);
            setCanAskPermissionAgain(result.canAskAgain);
            setCalendars(result.calendars);
            setSelectedCalendarId(result.calendars[0]?.id ?? null);
            if (result.granted && result.calendars.length === 0) {
                Alert.alert('캘린더 없음', '가져올 수 있는 일정 캘린더가 없어요.');
            }
        } catch (error) {
            Alert.alert('캘린더 조회 실패', errorMessage(error));
        } finally {
            setLoadingCalendars(false);
        }
    };

    const handleImport = async () => {
        if (!selectedCalendarId) return;

        setLoadingEvents(true);
        try {
            const events = await readCalendarEvents(selectedCalendarId, yearMonth);
            const nextCandidates = buildCalendarCandidates(events, yearMonth);
            setCandidates(nextCandidates);
            setCandidateDecisions(
                Object.fromEntries(
                    nextCandidates.map((candidate) => [
                        candidate.date,
                        candidate.status === 'MATCHED'
                            ? candidate.suggestedDuty ?? undefined
                            : undefined,
                    ]),
                ),
            );
            saveAttemptRef.current = null;
            if (nextCandidates.length === 0) {
                Alert.alert('가져올 근무 없음', '선택한 월에서 D/E/N/OFF 근무 후보를 찾지 못했어요.');
            }
        } catch (error) {
            Alert.alert('일정 불러오기 실패', errorMessage(error));
        } finally {
            setLoadingEvents(false);
        }
    };

    const changeCandidateDecision = (date: string, decision: CalendarCandidateDecision) => {
        setCandidateDecisions((current) => ({ ...current, [date]: decision }));
        saveAttemptRef.current = null;
    };

    const changeManualDuty = (duty: ScheduleDuty) => {
        setManualEntries((current) => ({ ...current, [selectedManualDate]: duty }));
        saveAttemptRef.current = null;
    };

    const refreshAfterConflict = async () => {
        const latest = await getMonthlySchedule(yearMonth);
        setSchedule(latest);
        saveAttemptRef.current = null;
        Alert.alert(
            '최신 근무표 확인 필요',
            '다른 변경 내용을 다시 불러왔어요. 가져온 후보를 확인한 뒤 다시 저장해 주세요.',
        );
    };

    const handleSave = async () => {
        if (!schedule) {
            Alert.alert('근무표 조회 필요', '서버 근무표를 먼저 불러와 주세요.');
            return;
        }

        const imported = resolveCalendarCandidates(candidates, candidateDecisions);
        if (!imported) {
            Alert.alert('확인 필요', 'UNKNOWN 또는 CONFLICT 항목의 근무를 선택하거나 제외해 주세요.');
            return;
        }
        const manual = Object.entries(manualEntries).map(([date, duty]) => ({ date, duty }));
        if (imported.length === 0 && manual.length === 0) return;

        const entries = mergeScheduleEntries(schedule.entries, [...imported, ...manual]);
        const signature = scheduleSaveSignature(yearMonth, schedule.version, entries);
        saveAttemptRef.current = selectScheduleSaveAttempt(
            saveAttemptRef.current,
            signature,
            newIdempotencyKey,
        );

        setSaving(true);
        try {
            const saved = await putMonthlySchedule(
                yearMonth,
                schedule.version,
                entries,
                saveAttemptRef.current.key,
            );
            setSchedule(saved);
            setCandidates([]);
            setCandidateDecisions({});
            setManualEntries({});
            saveAttemptRef.current = null;
            Alert.alert('저장 완료', `${monthLabel(yearMonth)} 근무표를 저장했어요.`);
        } catch (error) {
            if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
                try {
                    await refreshAfterConflict();
                } catch (refreshError) {
                    Alert.alert('최신 근무표 조회 실패', errorMessage(refreshError));
                }
            } else if (error instanceof ApiError && error.code === 'IDEMPOTENCY_KEY_REUSED') {
                saveAttemptRef.current = null;
                Alert.alert('다시 저장해 주세요', '저장 요청 식별자를 새로 만들었어요. 내용을 확인해 주세요.');
            } else {
                Alert.alert('저장 실패', `${errorMessage(error)}\n같은 내용으로 다시 시도할 수 있어요.`);
            }
        } finally {
            setSaving(false);
        }
    };

    const unresolvedCount = candidates.filter((candidate) => !candidateDecisions[candidate.date]).length;
    const includedCandidateCount = candidates.filter(
        (candidate) => candidateDecisions[candidate.date] !== 'EXCLUDED',
    ).length;
    const busy = loadingSchedule || loadingCalendars || loadingEvents || saving;
    const existingDutyByDate = new Map(
        schedule?.entries.map((entry) => [entry.date, entry.duty]) ?? [],
    );
    const monthDates = monthDateKeys(yearMonth);
    const selectedManualDuty = manualEntries[selectedManualDate]
        ?? existingDutyByDate.get(selectedManualDate);
    const hasChanges = Object.keys(manualEntries).length > 0 || includedCandidateCount > 0;

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Pressable hitSlop={8} onPress={onClose} accessibilityRole="button">
                    <Ionicons name="close" size={26} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>근무표 입력</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.monthRow}>
                    <Pressable
                        style={[styles.iconButton, busy && styles.disabled]}
                        onPress={() => setYearMonth(moveMonth(yearMonth, -1))}
                        disabled={busy}
                    >
                        <Ionicons name="chevron-back" size={20} color={colors.text} />
                    </Pressable>
                    <Text style={styles.monthText}>{monthLabel(yearMonth)}</Text>
                    <Pressable
                        style={[styles.iconButton, busy && styles.disabled]}
                        onPress={() => setYearMonth(moveMonth(yearMonth, 1))}
                        disabled={busy}
                    >
                        <Ionicons name="chevron-forward" size={20} color={colors.text} />
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>1. 직접 입력</Text>
                    <Text style={styles.helpText}>
                        캘린더 권한 없이도 날짜를 누르고 D/E/N/OFF를 선택해 추가하거나 수정할 수 있어요.
                    </Text>
                    <View style={styles.dayGrid}>
                        {monthDates.map((date) => {
                            const duty = manualEntries[date] ?? existingDutyByDate.get(date);
                            return (
                                <Pressable
                                    key={date}
                                    style={[
                                        styles.dayButton,
                                        selectedManualDate === date && styles.dayButtonSelected,
                                    ]}
                                    onPress={() => setSelectedManualDate(date)}
                                >
                                    <Text style={styles.dayNumber}>{Number(date.slice(-2))}</Text>
                                    <Text style={styles.dayDuty}>{duty ? DUTY_LABEL[duty] : '-'}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <Text style={styles.selectedDateText}>{selectedManualDate}</Text>
                    <View style={styles.dutyRow}>
                        {DUTIES.map((duty) => (
                            <Pressable
                                key={duty}
                                style={[
                                    styles.dutyButton,
                                    selectedManualDuty === duty && styles.dutyButtonSelected,
                                ]}
                                onPress={() => changeManualDuty(duty)}
                            >
                                <Text style={[
                                    styles.dutyText,
                                    selectedManualDuty === duty && styles.dutyTextSelected,
                                ]}>
                                    {DUTY_LABEL[duty]}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>2. 일정 캘린더 선택</Text>
                    <Text style={styles.helpText}>
                        권한은 이 버튼을 누를 때만 요청해요. 일정 제목·메모·위치·참석자 정보는 서버에 보내지 않아요.
                    </Text>
                    <Pressable
                        style={[styles.primaryButton, loadingCalendars && styles.disabled]}
                        onPress={handleCalendarPermission}
                        disabled={loadingCalendars}
                    >
                        {loadingCalendars ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.primaryButtonText}>캘린더 목록 보기</Text>
                        )}
                    </Pressable>
                    {permissionDenied && (
                        <View style={styles.notice}>
                            <Text style={styles.noticeText}>캘린더 접근 권한이 필요해요.</Text>
                            {!canAskPermissionAgain && (
                                <Pressable onPress={() => void Linking.openSettings()}>
                                    <Text style={styles.linkText}>설정 열기</Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                    {calendars.map((calendar) => (
                        <Pressable
                            key={calendar.id}
                            style={[
                                styles.calendarRow,
                                selectedCalendarId === calendar.id && styles.calendarRowSelected,
                            ]}
                            onPress={() => setSelectedCalendarId(calendar.id)}
                        >
                            <Ionicons
                                name={selectedCalendarId === calendar.id ? 'radio-button-on' : 'radio-button-off'}
                                size={19}
                                color={colors.primary}
                            />
                            <Text style={styles.calendarTitle}>{calendar.title}</Text>
                        </Pressable>
                    ))}
                    {calendars.length > 0 && (
                        <Pressable
                            style={[styles.secondaryButton, (!selectedCalendarId || loadingEvents) && styles.disabled]}
                            onPress={handleImport}
                            disabled={!selectedCalendarId || loadingEvents}
                        >
                            {loadingEvents ? <ActivityIndicator color={colors.primary} /> : (
                                <Text style={styles.secondaryButtonText}>선택한 캘린더 불러오기</Text>
                            )}
                        </Pressable>
                    )}
                </View>

                {candidates.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>3. 변환 결과 확인</Text>
                        <Text style={styles.helpText}>
                            UNKNOWN·CONFLICT는 근무를 직접 선택하거나 로컬에서 제외해야 저장할 수 있어요.
                        </Text>
                        {candidates.map((candidate) => (
                            <View key={candidate.date} style={styles.candidateRow}>
                                <View style={styles.candidateHeader}>
                                    <Text style={styles.candidateDate}>{candidate.date}</Text>
                                    <View style={styles.candidateMeta}>
                                        {existingDutyByDate.has(candidate.date) && (
                                            <Text style={styles.existingDutyText}>
                                                서버 기존 {DUTY_LABEL[existingDutyByDate.get(candidate.date)!]}
                                            </Text>
                                        )}
                                        <Text style={[
                                            styles.statusText,
                                            candidate.status !== 'MATCHED' && styles.warningText,
                                        ]}>
                                            {candidate.status}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.dutyRow}>
                                    {DUTIES.map((duty) => (
                                        <Pressable
                                            key={duty}
                                            style={[
                                                styles.dutyButton,
                                                candidateDecisions[candidate.date] === duty && styles.dutyButtonSelected,
                                            ]}
                                            onPress={() => changeCandidateDecision(candidate.date, duty)}
                                        >
                                            <Text style={[
                                                styles.dutyText,
                                                candidateDecisions[candidate.date] === duty && styles.dutyTextSelected,
                                            ]}>
                                                {DUTY_LABEL[duty]}
                                            </Text>
                                        </Pressable>
                                    ))}
                                    {candidate.status !== 'MATCHED' && (
                                        <Pressable
                                            style={[
                                                styles.excludeButton,
                                                candidateDecisions[candidate.date] === 'EXCLUDED'
                                                    && styles.excludeButtonSelected,
                                            ]}
                                            onPress={() => changeCandidateDecision(candidate.date, 'EXCLUDED')}
                                        >
                                            <Text style={[
                                                styles.excludeText,
                                                candidateDecisions[candidate.date] === 'EXCLUDED'
                                                    && styles.excludeTextSelected,
                                            ]}>
                                                제외
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>4. 서버 근무표에 저장</Text>
                    <Text style={styles.helpText}>
                        기존 {schedule?.entries.length ?? 0}일은 유지하고, 확인한 날짜만 반영해요. 자동 동기화하지 않아요.
                    </Text>
                    <Pressable
                        style={[
                            styles.primaryButton,
                            (busy || !schedule || !hasChanges || unresolvedCount > 0) && styles.disabled,
                        ]}
                        onPress={handleSave}
                        disabled={busy || !schedule || !hasChanges || unresolvedCount > 0}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.primaryButtonText}>
                                {unresolvedCount > 0 ? `${unresolvedCount}개 항목 확인 필요` : '확정한 근무표 저장'}
                            </Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
    },
    headerTitle: { ...font.h2, flex: 1, textAlign: 'center', color: colors.text },
    headerSpacer: { width: 26 },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    monthText: { ...font.h2, minWidth: 110, textAlign: 'center', color: colors.text },
    iconButton: { padding: spacing.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
    sectionTitle: { ...font.h2, color: colors.text },
    helpText: { ...font.small, color: colors.textSub, lineHeight: 19 },
    dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    dayButton: {
        width: '12%',
        minHeight: 48,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    dayNumber: { ...font.small, color: colors.text },
    dayDuty: { ...font.tiny, color: colors.primary, marginTop: 2 },
    selectedDateText: { ...font.body, color: colors.text },
    primaryButton: {
        minHeight: 48,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
    },
    primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    secondaryButton: {
        minHeight: 46,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: { ...font.body, color: colors.primary },
    disabled: { opacity: 0.45 },
    notice: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    noticeText: { ...font.small, color: colors.danger },
    linkText: { ...font.small, color: colors.accent, textDecorationLine: 'underline' },
    calendarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
    },
    calendarRowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    calendarTitle: { ...font.body, flex: 1, color: colors.text },
    candidateRow: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, gap: spacing.sm },
    candidateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    candidateMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    candidateDate: { ...font.body, color: colors.text },
    existingDutyText: { ...font.tiny, color: colors.textSub },
    statusText: { ...font.tiny, color: colors.primary },
    warningText: { color: colors.warn },
    dutyRow: { flexDirection: 'row', gap: spacing.sm },
    dutyButton: {
        flex: 1,
        minHeight: 38,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dutyButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    dutyText: { ...font.small, color: colors.textSub },
    dutyTextSelected: { color: '#fff', fontWeight: '700' },
    excludeButton: {
        minWidth: 54,
        minHeight: 38,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
    },
    excludeButtonSelected: { borderColor: colors.textSub, backgroundColor: colors.textSub },
    excludeText: { ...font.small, color: colors.textSub },
    excludeTextSelected: { color: '#fff', fontWeight: '700' },
});
