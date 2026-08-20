import { useState, useEffect, useMemo } from 'react';
import {
    View, Text, Image, Pressable, ScrollView,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    fetchRoundingRecords, fetchRecordEntries, timeOf, dateTitleOf,
    KIND_LABEL, RecordEntry, ApiRoundingRecord,
} from '../api/roundingRecords';
import { fetchPatients, ApiPatient } from '../api/patients';
import { colors, spacing, radius, font } from '../theme';

type TabKind = 'ALL' | 'BY_PATIENT';
type ReviewFilter = 'ALL' | 'NEEDS_REVIEW' | 'MATCHED';

const REVIEW_FILTERS: { key: ReviewFilter; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'NEEDS_REVIEW', label: '식별 필요자만' },
    { key: 'MATCHED', label: '매칭 완료자만' },
];

interface Props {
    onBack: () => void;
}

export default function RecordTranscriptScreen({ onBack }: Props) {
    const insets = useSafeAreaInsets();

    const [tab, setTab] = useState<TabKind>('ALL');
    const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('ALL');
    const [date, setDate] = useState('');
    const [records, setRecords] = useState<ApiRoundingRecord[]>([]);
    const [entries, setEntries] = useState<RecordEntry[]>([]);
    const [patients, setPatients] = useState<ApiPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [r, e, p] = await Promise.all([
                    fetchRoundingRecords(),
                    fetchRecordEntries(),
                    fetchPatients(),
                ]);
                setDate(r.date);
                setRecords(r.items ?? []);
                setEntries(e);
                setPatients(p.items ?? []);
            } catch (err: any) {
                console.log('기록 조회 실패:', err.code, err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const sorted = useMemo(
        () => [...entries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
        [entries],
    );

    const unmatched = useMemo(
        () => sorted.filter((e) => e.needsReview),
        [sorted],
    );

    const byPatient = useMemo(() => {
        return records.map((rec) => ({
            record: rec,
            entries: sorted.filter((e) => e.patientId === rec.patientId),
        }));
    }, [records, sorted]);

    const filteredByPatient = useMemo(() => {
        if (reviewFilter === 'NEEDS_REVIEW') return [];
        return byPatient;
    }, [byPatient, reviewFilter]);

    if (loading) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.navBar}>
                <Pressable onPress={onBack} hitSlop={12}>
                    <Text style={styles.backIcon}>‹</Text>
                </Pressable>
                <Text style={styles.navTitle}>기록 원문</Text>
                <View style={styles.navSpacer} />
            </View>

            <View style={styles.tabRow}>
                {(['ALL', 'BY_PATIENT'] as TabKind[]).map((t) => {
                    const active = tab === t;
                    return (
                        <Pressable key={t} style={styles.tabItem} onPress={() => setTab(t)}>
                            <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                {t === 'ALL' ? '전체 기록' : '환자별 기록'}
                            </Text>
                            <View style={[styles.tabBar, active && styles.tabBarActive]} />
                        </Pressable>
                    );
                })}
            </View>

            {tab === 'ALL' ? (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.dateTitle}>{dateTitleOf(date)}</Text>

                    {sorted.length === 0 ? (
                        <Text style={styles.emptyText}>오늘 기록이 없어요</Text>
                    ) : (
                        sorted.map((entry) => (
                            <EntryCard
                                key={entry.entryId}
                                entry={entry}
                                expanded={expanded === entry.entryId}
                                onToggle={() =>
                                    setExpanded(expanded === entry.entryId ? null : entry.entryId)
                                }
                            />
                        ))
                    )}
                </ScrollView>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.filterRow}>
                        {REVIEW_FILTERS.map((f, i) => {
                            const active = reviewFilter === f.key;
                            return (
                                <View key={f.key} style={styles.filterItem}>
                                    <Pressable onPress={() => setReviewFilter(f.key)}>
                                        <Text style={[styles.filterText, active && styles.filterTextActive]}>
                                            {f.label}
                                        </Text>
                                    </Pressable>
                                    <Text style={styles.filterDivider}>|</Text>
                                </View>
                            );
                        })}
                    </View>

                    {filteredByPatient.map(({ record, entries: list }) => (
                        <View key={record.recordId} style={styles.card}>
                            <View style={styles.patientHead}>
                                <View style={styles.flex}>
                                    <Text style={styles.patientRoom}>{record.patientRoomLabel ?? '병실 미지정'}</Text>
                                    <Text style={styles.patientName}>{record.patientDisplayName ?? '환자 미지정'}</Text>
                                </View>
                                <Pressable style={styles.editBtn} hitSlop={8}>
                                    <Image
                                        source={require('../../assets/icons/edit.png')}
                                        style={styles.editIcon}
                                        resizeMode="contain"
                                    />
                                </Pressable>
                            </View>

                            <View style={styles.divider} />

                            {list.length === 0 ? (
                                <Text style={styles.emptySmall}>기록이 없어요</Text>
                            ) : (
                                list.map((e) => (
                                    <View key={e.entryId} style={styles.utterance}>
                                        <View style={styles.utterHead}>
                                            <Text style={styles.utterTime}>{timeOf(e.occurredAt)}</Text>
                                            <View style={styles.meBadge}>
                                                <Text style={styles.meBadgeText}>나</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.utterText}>{e.text}</Text>
                                    </View>
                                ))
                            )}

                            <Pressable style={styles.moreBtn}>
                                <Text style={styles.moreText}>자세히 보기 ⌄</Text>
                            </Pressable>
                        </View>
                    ))}

                    {unmatched.length > 0 && reviewFilter !== 'MATCHED' ? (
                        <>
                            <Text style={styles.sectionTitle}>미분류 기록</Text>
                            <Text style={styles.sectionDesc}>발화자 매칭이 필요한 기록이에요.</Text>

                            {unmatched.map((e, i) => (
                                <UnmatchedCard key={e.entryId} entry={e} index={i + 1} patients={patients} />
                            ))}
                        </>
                    ) : null}
                </ScrollView>
            )}
        </View>
    );
}

function EntryCard({
    entry, expanded, onToggle,
}: {
    entry: RecordEntry;
    expanded: boolean;
    onToggle: () => void;
}) {
    return (
        <View style={styles.card}>
            <View style={styles.entryHead}>
                <Text style={styles.entryTime}>{timeOf(entry.occurredAt)}</Text>
                <View style={styles.kindBadge}>
                    <Text style={styles.kindText}>{KIND_LABEL[entry.kind]}</Text>
                </View>
                <View style={styles.flex} />
                <Pressable hitSlop={8}>
                    <Image
                        source={require('../../assets/icons/edit.png')}
                        style={styles.editIcon}
                        resizeMode="contain"
                    />
                </Pressable>
            </View>

            <Text style={styles.entryText}>{entry.text}</Text>

            {entry.photoUri ? (
                <Image source={{ uri: entry.photoUri }} style={styles.photo} resizeMode="cover" />
            ) : null}

            {entry.audioFileId ? (
                <>
                    <View style={styles.divider} />
                    <Pressable style={styles.audioToggle} onPress={onToggle}>
                        <Text style={styles.audioToggleText}>원본 음성 재생 {expanded ? '⌃' : '⌄'}</Text>
                    </Pressable>

                    {expanded ? (
                        <View style={styles.player}>
                            <View style={styles.playerHead}>
                                <View style={styles.flex}>
                                    <Text style={styles.playerTitle}>원본 음성 재생</Text>
                                    <Text style={styles.playerTime}>
                                        오전 {timeOf(entry.occurredAt)}
                                    </Text>
                                </View>
                                <Pressable style={styles.playBtn}>
                                    <Text style={styles.playIcon}>▶</Text>
                                </Pressable>
                            </View>

                            <View style={styles.progressTrack}>
                                <View style={styles.progressFill} />
                                <View style={styles.progressThumb} />
                            </View>

                            <View style={styles.playerFoot}>
                                <Text style={styles.playerTime}>00:04</Text>
                                <Text style={styles.playerTime}>00:08</Text>
                            </View>
                        </View>
                    ) : null}
                </>
            ) : null}
        </View>
    );
}

function UnmatchedCard({
    entry, index, patients,
}: {
    entry: RecordEntry;
    index: number;
    patients: ApiPatient[];
}) {
    const [patientId, setPatientId] = useState<string | null>(null);
    const selected = patients.find((p) => p.patientId === patientId);

    return (
        <View style={styles.card}>
            <View style={styles.entryHead}>
                <Text style={styles.recordNo}>기록 {index}</Text>
                <View style={styles.reviewBadge}>
                    <Text style={styles.reviewText}>검토 필요</Text>
                </View>
            </View>

            <Text style={styles.entryText}>{entry.text}</Text>

            <View style={styles.divider} />

            <View style={styles.playerHead}>
                <View style={styles.flex}>
                    <Text style={styles.playerTitle}>원본 음성 재생</Text>
                    <Text style={styles.playerTime}>오전 {timeOf(entry.occurredAt)}</Text>
                </View>
                <Pressable style={styles.playBtn}>
                    <Text style={styles.playIcon}>▶</Text>
                </Pressable>
            </View>

            <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
                <View style={styles.progressThumb} />
            </View>

            <View style={styles.playerFoot}>
                <Text style={styles.playerTime}>00:04</Text>
                <Text style={styles.playerTime}>00:08</Text>
            </View>

            <Text style={styles.fieldLabel}>환자 지정</Text>
            <Pressable style={styles.select}>
                <Image
                    source={require('../../assets/icons/person.png')}
                    style={styles.selectIcon}
                    resizeMode="contain"
                />
                <Text style={[styles.selectText, !selected && styles.selectPlaceholder]}>
                    {selected ? selected.displayName : '환자 선택'}
                </Text>
                <Text style={styles.selectChevron}>⌄</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    navBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    },
    backIcon: { fontSize: 30, color: colors.text, lineHeight: 32 },
    navTitle: { flex: 1, textAlign: 'center', ...font.h2, color: colors.text },
    navSpacer: { width: 20 },

    tabRow: { flexDirection: 'row' },
    tabItem: { flex: 1, alignItems: 'center', gap: spacing.md },
    tabText: { ...font.body, color: colors.textDim },
    tabTextActive: { color: colors.primary, fontWeight: '700' },
    tabBar: { height: 2, width: '100%', backgroundColor: colors.divider },
    tabBarActive: { backgroundColor: colors.primary },

    content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, paddingBottom: spacing.xxl },

    dateTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },

    filterRow: { flexDirection: 'row', marginBottom: spacing.lg },
    filterItem: { flexDirection: 'row', alignItems: 'center' },
    filterText: { ...font.small, color: colors.textDim },
    filterTextActive: { color: colors.primary, fontWeight: '600' },
    filterDivider: { ...font.small, color: colors.border, marginHorizontal: spacing.sm },

    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.md,
    },
    divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },

    entryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    entryTime: { ...font.small, fontWeight: '600', color: colors.text },
    kindBadge: {
        backgroundColor: colors.primarySoft, borderRadius: radius.pill,
        paddingHorizontal: spacing.md, paddingVertical: 3,
    },
    kindText: { ...font.tiny, color: colors.primary },
    entryText: { ...font.body, color: colors.text, lineHeight: 22 },
    editIcon: { width: 15, height: 15 },

    photo: { width: '100%', height: 180, borderRadius: radius.md, marginTop: spacing.md },

    audioToggle: { alignItems: 'center', paddingVertical: spacing.xs },
    audioToggleText: { ...font.small, color: colors.textDim },

    player: { marginTop: spacing.md, gap: spacing.sm },
    playerHead: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
    playerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    playerTime: { ...font.small, color: colors.textDim },
    playBtn: {
        width: 44, height: 44, borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
        alignItems: 'center', justifyContent: 'center',
    },
    playIcon: { fontSize: 15, color: colors.primary },

    progressTrack: {
        height: 4, borderRadius: radius.pill, backgroundColor: colors.border,
        marginTop: spacing.md, justifyContent: 'center',
    },
    progressFill: {
        position: 'absolute', left: 0, width: '35%', height: 4,
        borderRadius: radius.pill, backgroundColor: colors.primary,
    },
    progressThumb: {
        position: 'absolute', left: '35%',
        width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.primary,
    },
    playerFoot: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm,
    },

    patientHead: { flexDirection: 'row', alignItems: 'flex-start' },
    patientRoom: { ...font.small, color: colors.textDim },
    patientName: { fontSize: 19, fontWeight: '700', color: colors.text, marginTop: 2 },
    editBtn: {
        width: 30, height: 30, borderRadius: radius.pill,
        backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
    },

    utterance: { marginBottom: spacing.lg },
    utterHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    utterTime: { ...font.small, color: colors.textDim },
    meBadge: {
        backgroundColor: colors.bg, borderRadius: radius.sm,
        paddingHorizontal: 7, paddingVertical: 2,
    },
    meBadgeText: { ...font.tiny, color: colors.textSub },
    utterText: { ...font.body, color: colors.text, lineHeight: 22 },

    moreBtn: { alignItems: 'center', paddingTop: spacing.md },
    moreText: { ...font.small, color: colors.textDim },

    sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.xl },
    sectionDesc: { ...font.small, color: colors.textDim, marginTop: spacing.xs, marginBottom: spacing.lg },

    recordNo: { fontSize: 16, fontWeight: '700', color: colors.text },
    reviewBadge: {
        backgroundColor: colors.primarySoft, borderRadius: radius.sm,
        paddingHorizontal: spacing.sm, paddingVertical: 3,
    },
    reviewText: { ...font.tiny, color: colors.primary },

    fieldLabel: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
    select: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        paddingHorizontal: spacing.lg, height: 48,
    },
    selectIcon: { width: 18, height: 18 },
    selectText: { flex: 1, ...font.body, color: colors.text },
    selectPlaceholder: { color: colors.textDim },
    selectChevron: { fontSize: 15, color: colors.textDim },

    emptyText: { ...font.small, color: colors.textDim, textAlign: 'center', marginTop: spacing.xxl },
    emptySmall: { ...font.small, color: colors.textDim, textAlign: 'center', paddingVertical: spacing.lg },
});