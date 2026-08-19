import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { patients, patientDetails, daySummary, weekDays } from '../mocks/patients';
import { PATIENT_FLAG_LABEL, TimelineEvent } from '../types';
import { colors, spacing, radius, font} from '../theme';

interface Props {
    patientId: string;
    onBack: () => void;
}

export default function PatientDetailScreen({ patientId, onBack }: Props) {
    const insets = useSafeAreaInsets();
    const [selectedDate, setSelectedDate] = useState(9);

    const base = patients.find((p) => p.id === patientId)!;
    const detail = patientDetails[patientId];

    return (
        <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.navBar}>
                <Pressable onPress={onBack} hitSlop={12}>
                    <Text style={styles.backIcon}>‹</Text>
                </Pressable>
                <Text style={styles.navTitle}>환자 상세</Text>
                <View style={styles.navSpacer} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <View style={styles.infoTop}>
                        <Text style={styles.bedText}>{base.room}호  {base.bedNo}번 침상</Text>
                        <Pressable style={styles.editBtn} hitSlop={8}>
                            <Text style={styles.editIcon}>✎</Text>
                        </Pressable>
                    </View>

                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{base.name}</Text>
                        {base.flags.map((flag) => (
                            <View key={flag} style={styles.flag}>
                                <Text style={styles.flagText}>{PATIENT_FLAG_LABEL[flag]}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.infoGrid}>
                        <InfoCell label="환자 번호" value={detail?.patientNo ?? '-'} />
                        <InfoCell label="진료과" value={base.department} />
                        <InfoCell label="입원일" value={detail?.admittedAt ?? '-'} />
                    </View>

                    <Text style={styles.infoLabel}>기본정보</Text>
                    <Text style={styles.baseInfo}>{detail?.baseInfo ?? base.condition}</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.timelineHead}>
                        <View style={styles.flex}>
                            <Text style={styles.sectionTitle}>타임라인</Text>
                            <Text style={styles.sectionDesc}>날짜별 환자의 인수인계 현황을 확인할 수 있어요</Text>
                        </View>
                        <Pressable style={styles.calBtn} hitSlop={8}>
                            <Text style={styles.calIcon}>📅</Text>
                        </Pressable>
                    </View>

                    <View style={styles.weekNav}>
                        <Pressable hitSlop={12}><Text style={styles.weekArrow}>‹</Text></Pressable>
                        <Text style={styles.weekLabel}>8월 첫째 주</Text>
                        <Pressable hitSlop={12}><Text style={styles.weekArrow}>›</Text></Pressable>
                    </View>

                    <View style={styles.dayRow}>
                        {weekDays.map((d) => {
                            const active = d.date === selectedDate;
                            return (
                                <Pressable key={d.date} style={styles.dayCell} onPress={() => setSelectedDate(d.date)}>
                                    <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{d.label}</Text>
                                    <View style={[styles.dayBadge, active && styles.dayBadgeActive]}>
                                        <Text style={[styles.dayDate, active && styles.dayDateActive]}>{d.date}</Text>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.aiHead}>
                        <Text style={styles.sectionTitle}>하루 AI 요약</Text>
                        <Text style={styles.sparkle}>✦</Text>
                    </View>
                    {daySummary.aiSummary.map((line, i) => (
                        <Text key={i} style={styles.aiLine}>{line}</Text>
                    ))}

                    <View style={styles.cardDivider} />

                    <View style={styles.timeline}>
                        {daySummary.events.map((e, i) => (
                            <TimelineRow key={e.id} event={e} isLast={i === daySummary.events.length - 1} />
                        ))}
                    </View>

                    <Pressable style={styles.transcriptBtn}>
                        <Text style={styles.transcriptText}>원문 기록 보러가기 ›</Text>
                    </Pressable>
                </View>
            </ScrollView>
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

function TimelineRow({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
    const highlight = event.kind === 'HANDOFF';
    return (
        <View style={styles.tlRow}>
            <View style={styles.tlRail}>
                <View style={[styles.tlDot, highlight && styles.tlDotFilled]} />
                {!isLast && <View style={styles.tlLine} />}
            </View>

            <View style={[styles.tlCard, highlight && styles.tlCardHighlight]}>
                <View style={styles.tlHead}>
                    <Text style={styles.tlTitle}>{event.title}</Text>
                    <Text style={styles.tlTime}>{event.time}</Text>
                </View>
                {event.lines.map((line, i) => (
                    <Text key={i} style={styles.tlLineText}>{line}</Text>
                ))}
                {event.alert && (
                    <View style={styles.alertBox}>
                        <Text style={styles.alertText}>⚠ {event.alert}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },

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
    editIcon: { fontSize: 13, color: colors.textSub },

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
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    calIcon: { fontSize: 16 },

    weekNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.xl, marginBottom: spacing.lg,
    },
    weekArrow: { fontSize: 22, color: colors.textSub },
    weekLabel: { ...font.h2, color: colors.text },

    dayRow: { flexDirection: 'row' },
    dayCell: { flex: 1, alignItems: 'center', gap: spacing.sm },
    dayLabel: { ...font.small, color: colors.textDim },
    dayLabelActive: { color: colors.primary },
    dayBadge: {
        width: 30, height: 30, borderRadius: radius.pill,
        alignItems: 'center', justifyContent: 'center',
    },
    dayBadgeActive: { backgroundColor: colors.primarySoft },
    dayDate: { ...font.body, color: colors.textSub },
    dayDateActive: { color: colors.primary, fontWeight: '700' },

    aiHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    sparkle: { fontSize: 15, color: colors.primary },
    aiLine: { ...font.body, color: colors.textSub, lineHeight: 22 },

    timeline: { paddingLeft: spacing.xs },
    tlRow: { flexDirection: 'row' },
    tlRail: { width: 22, alignItems: 'center' },
    tlDot: {
        width: 11, height: 11, borderRadius: radius.pill, marginTop: spacing.lg,
        borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.card,
    },
    tlDotFilled: { backgroundColor: colors.primary },
    tlLine: { flex: 1, width: 2, backgroundColor: colors.primary },

    tlCard: {
        flex: 1, marginLeft: spacing.md, marginBottom: spacing.md,
        backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg,
    },
    tlCardHighlight: { backgroundColor: colors.primarySoft },
    tlHead: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: spacing.sm,
    },
    tlTitle: { ...font.h2, color: colors.text },
    tlTime: { ...font.small, color: colors.textDim },
    tlLineText: { ...font.small, color: colors.textSub, lineHeight: 20 },

    alertBox: {
        flexDirection: 'row', alignSelf: 'flex-start', marginTop: spacing.md,
        backgroundColor: colors.card, borderRadius: radius.pill,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    alertText: { ...font.tiny, color: colors.primary },

    transcriptBtn: { alignItems: 'center', paddingTop: spacing.lg },
    transcriptText: { ...font.body, color: colors.text },
});