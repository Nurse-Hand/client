import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, Image, Pressable, ScrollView,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    fetchPatient, fetchPatientTimeline, admissionDayOf,
    dateKeyOf, timeOf, ApiPatient, ApiTimelineEvent, TimelineEventType,
} from '../api/patients';
import { mockDaySummary, mockAlerts } from '../mocks/patients';
import { colors, spacing, radius, font } from '../theme';

const TYPE_LABEL: Record<TimelineEventType, string> = {
    VITAL_SIGNS: '활력징후',
    RESPIRATION: '호흡',
    MENTAL_STATUS: '의식상태',
    PAIN: '통증',
    TREATMENT: '처치',
    DIET: '식이',
    OBSERVATION: '관찰사항',
};

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
    patientId: string;
    onBack: () => void;
}

export default function PatientDetailScreen({ patientId, onBack }: Props) {
    const insets = useSafeAreaInsets();

    const [patient, setPatient] = useState<ApiPatient | null>(null);
    const [events, setEvents] = useState<ApiTimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedKey, setSelectedKey] = useState(dateKeyOf(new Date().toISOString()));

    const load = useCallback(async () => {
        try {
            setError(null);
            const [p, t] = await Promise.all([
                fetchPatient(patientId),
                fetchPatientTimeline(patientId),
            ]);
            setPatient(p);
            setEvents(t.items ?? []);
        } catch (e: any) {
            setError(e.message ?? '환자 정보를 불러오지 못했어요');
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        load();
    }, [load]);

    const weekDays = useMemo(() => {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        base.setDate(base.getDate() - base.getDay() + weekOffset * 7);

        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            return {
                key: dateKeyOf(d.toISOString()),
                label: WEEKDAY[d.getDay()],
                date: d.getDate(),
                month: d.getMonth() + 1,
            };
        });
    }, [weekOffset]);

    const grouped = useMemo(() => {
        const map: Record<string, ApiTimelineEvent[]> = {};
        for (const e of events) {
            const key = dateKeyOf(e.occurredAt);
            if (!map[key]) map[key] = [];
            map[key].push(e);
        }
        for (const key of Object.keys(map)) {
            map[key].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
        }
        return map;
    }, [events]);

    const dayEvents = grouped[selectedKey] ?? [];
    const weekLabel = `${weekDays[0].month}월 ${weekDays[0].date}일 ~ ${weekDays[6].month}월 ${weekDays[6].date}일`;

    if (loading) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (error || !patient) {
        return (
            <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
                <NavBar onBack={onBack} />
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error ?? '환자를 찾을 수 없어요'}</Text>
                    <Pressable style={styles.retryBtn} onPress={load}>
                        <Text style={styles.retryText}>다시 시도</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const day = admissionDayOf(patient.admittedAt);

    return (
        <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
            <NavBar onBack={onBack} />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <View style={styles.infoTop}>
                        <Text style={styles.bedText}>{patient.roomLabel ?? '병실 미지정'}</Text>
                        <Pressable style={styles.editBtn} hitSlop={8}>
                            <Image
                                source={require('../../assets/icons/edit.png')}
                                style={styles.editIcon}
                                resizeMode="contain"
                            />
                        </Pressable>
                    </View>

                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{patient.displayName}</Text>
                        {patient.statusLabel ? (
                            <View style={styles.flag}>
                                <Text style={styles.flagText}>{patient.statusLabel}</Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.infoGrid}>
                        <InfoCell label="진료과" value={patient.department ?? '-'} />
                        <InfoCell
                            label="입원일"
                            value={patient.admittedAt ? patient.admittedAt.slice(0, 10).replace(/-/g, '.') : '-'}
                        />
                        <InfoCell label="입원 경과" value={day ? `${day}일차` : '-'} />
                    </View>

                    <Text style={styles.infoLabel}>기본정보</Text>
                    <Text style={styles.baseInfo}>
                        {patient.baselineSummary ?? '등록된 기본정보가 없습니다'}
                    </Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.timelineHead}>
                        <View style={styles.flex}>
                            <Text style={styles.sectionTitle}>타임라인</Text>
                            <Text style={styles.sectionDesc}>날짜별 환자의 인수인계 현황을 확인할 수 있어요</Text>
                        </View>
                        <Pressable style={styles.calBtn} hitSlop={8}>
                            <Image
                                source={require('../../assets/icons/calendar.png')}
                                style={styles.calIcon}
                                resizeMode="contain"
                            />
                        </Pressable>
                    </View>

                    <View style={styles.weekNav}>
                        <Pressable hitSlop={12} onPress={() => setWeekOffset((w) => w - 1)}>
                            <Text style={styles.weekArrow}>‹</Text>
                        </Pressable>
                        <Text style={styles.weekLabel}>{weekLabel}</Text>
                        <Pressable hitSlop={12} onPress={() => setWeekOffset((w) => w + 1)}>
                            <Text style={styles.weekArrow}>›</Text>
                        </Pressable>
                    </View>

                    <View style={styles.dayRow}>
                        {weekDays.map((d) => {
                            const active = d.key === selectedKey;
                            const has = (grouped[d.key]?.length ?? 0) > 0;
                            return (
                                <Pressable key={d.key} style={styles.dayCell} onPress={() => setSelectedKey(d.key)}>
                                    <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{d.label}</Text>
                                    <View style={[styles.dayBadge, active && styles.dayBadgeActive]}>
                                        <Text style={[styles.dayDate, active && styles.dayDateActive]}>{d.date}</Text>
                                    </View>
                                    <View style={[styles.dayDot, has && styles.dayDotOn]} />
                                </Pressable>
                            );
                        })}
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.aiHead}>
                        <Text style={styles.sectionTitle}>하루 AI 요약</Text>
                        <Image
                            source={require('../../assets/icons/ai.png')}
                            style={styles.sparkle}
                            resizeMode="contain"
                        />
                    </View>

                    {dayEvents.length === 0 ? (
                        <Text style={styles.aiEmpty}>요약할 기록이 없습니다</Text>
                    ) : (
                        mockDaySummary.map((line, i) => (
                            <Text key={i} style={styles.aiLine}>{line}</Text>
                        ))
                    )}

                    <View style={styles.cardDivider} />

                    <View style={styles.timeline}>
                        {dayEvents.length === 0 ? (
                            <Text style={styles.timelineEmpty}>기록이 없습니다</Text>
                        ) : (
                            dayEvents.map((e, i) => (
                                <TimelineRow
                                    key={e.timelineEventId}
                                    event={e}
                                    isLast={i === dayEvents.length - 1}
                                />
                            ))
                        )}
                    </View>

                    <Pressable style={styles.transcriptBtn}>
                        <Text style={styles.transcriptText}>원문 기록 보러가기 ›</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

function NavBar({ onBack }: { onBack: () => void }) {
    return (
        <View style={styles.navBar}>
            <Pressable onPress={onBack} hitSlop={12}>
                <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.navTitle}>환자 상세</Text>
            <View style={styles.navSpacer} />
        </View>
    );
}

function InfoCell({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

function TimelineRow({ event, isLast }: { event: ApiTimelineEvent; isLast: boolean }) {
    const highlight = event.source !== 'MANUAL';
    const alert = mockAlerts[event.type];

    return (
        <View style={styles.tlRow}>
            <View style={styles.tlRail}>
                <View style={[styles.tlDot, highlight && styles.tlDotFilled]} />
                {!isLast && <View style={styles.tlLine} />}
            </View>

            <View style={styles.tlBody}>
                <View style={[styles.tlCard, highlight && styles.tlCardHighlight]}>
                    <View style={styles.tlHead}>
                        <Text style={styles.tlTitle}>{TYPE_LABEL[event.type] ?? event.type}</Text>
                        <Text style={styles.tlTime}>{timeOf(event.occurredAt)}</Text>
                    </View>
                    <Text style={styles.tlLineText}>{event.summary}</Text>
                </View>

                {alert ? (
                    <View style={styles.alertBox}>
                        <Text style={styles.alertText}>⚠ {alert}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },

    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    backIcon: { fontSize: 30, color: colors.text, lineHeight: 32 },
    navTitle: { flex: 1, textAlign: 'center', ...font.h2, color: colors.text },
    navSpacer: { width: 20 },

    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
    },
    cardDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg },

    infoTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    bedText: { ...font.body, color: colors.textDim },
    editBtn: {
        width: 32, height: 32, borderRadius: radius.pill,
        backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
    },
    editIcon: { width: 16, height: 16 },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
    name: { fontSize: 22, fontWeight: '700', color: colors.text },
    flag: {
        backgroundColor: colors.primarySoft, borderRadius: radius.sm,
        paddingHorizontal: 7, paddingVertical: 3,
    },
    flagText: { ...font.tiny, color: colors.primary },

    infoGrid: { flexDirection: 'row', marginBottom: spacing.lg },
    infoCell: { flex: 1 },
    infoLabel: { ...font.small, color: colors.textDim, marginBottom: spacing.xs },
    infoValue: { ...font.body, color: colors.text },
    baseInfo: { ...font.body, color: colors.text, lineHeight: 21 },

    timelineHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
    sectionTitle: { fontSize: 19, fontWeight: '700', color: colors.text },
    sectionDesc: { ...font.small, color: colors.textDim, marginTop: spacing.xs },
    calBtn: {
        width: 38, height: 38, borderRadius: radius.md,
        alignItems: 'center', justifyContent: 'center',
    },
    calIcon: { width: 24, height: 24 },

    weekNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    weekArrow: { fontSize: 22, color: colors.textSub, paddingHorizontal: spacing.md },
    weekLabel: { fontSize: 15, fontWeight: '700', color: colors.text },

    dayRow: { flexDirection: 'row' },
    dayCell: { flex: 1, alignItems: 'center', gap: spacing.xs },
    dayLabel: { ...font.small, color: colors.textDim },
    dayLabelActive: { color: colors.primary },
    dayBadge: {
        width: 30, height: 30, borderRadius: radius.pill,
        alignItems: 'center', justifyContent: 'center',
    },
    dayBadgeActive: { backgroundColor: colors.primarySoft },
    dayDate: { ...font.body, color: colors.textSub },
    dayDateActive: { color: colors.primary, fontWeight: '700' },
    dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
    dayDotOn: { backgroundColor: colors.primary },

    aiHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    sparkle: { width: 18, height: 18 },
    aiLine: { fontSize: 13, fontWeight: '400', color: colors.textSub, lineHeight: 20 },
    aiEmpty: { ...font.small, color: colors.textDim },

    timeline: { paddingLeft: spacing.xs },
    timelineEmpty: {
        ...font.small, color: colors.textDim,
        textAlign: 'center', paddingVertical: spacing.xxl,
    },
    tlRow: { flexDirection: 'row' },
    tlRail: { width: 22, alignItems: 'center' },
    tlDot: {
        width: 11, height: 11, borderRadius: radius.pill, marginTop: spacing.lg,
        borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.card,
    },
    tlDotFilled: { backgroundColor: colors.primary },
    tlLine: { flex: 1, width: 2, backgroundColor: colors.primary },

    tlBody: { flex: 1, marginLeft: spacing.md, marginBottom: spacing.md },
    tlCard: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg },
    tlCardHighlight: { backgroundColor: colors.primarySoft },
    tlHead: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: spacing.sm,
    },
    tlTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    tlTime: { fontSize: 11, fontWeight: '500', color: colors.textDim },
    tlLineText: { fontSize: 12, fontWeight: '400', color: colors.textSub, lineHeight: 18 },

    alertBox: {
        flexDirection: 'row', alignSelf: 'flex-start', marginTop: spacing.sm,
        borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill,
        paddingHorizontal: spacing.md, paddingVertical: 6,
    },
    alertText: { fontSize: 11, fontWeight: '600', color: colors.primary },

    transcriptBtn: { alignItems: 'center', paddingTop: spacing.lg },
    transcriptText: { ...font.body, color: colors.text },

    errorText: { ...font.small, color: colors.danger, textAlign: 'center' },
    retryBtn: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    },
    retryText: { ...font.small, fontWeight: '600', color: colors.text },
});