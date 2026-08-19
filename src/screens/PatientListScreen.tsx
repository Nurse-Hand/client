import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, Image, Pressable, ScrollView, TextInput,
    ActivityIndicator, RefreshControl, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchPatients, admissionDayOf, ApiPatient } from '../api/patients';
import { colors, spacing, radius, font, layout } from '../theme';

interface Props {
    onSelect: (patientId: string) => void;
}

export default function PatientListScreen({ onSelect }: Props) {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<ApiPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [discharged, setDischarged] = useState<string[]>([]);

    const load = useCallback(async () => {
        try {
            setError(null);
            const res = await fetchPatients();
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e.message ?? '환자 목록을 불러오지 못했어요');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const active = useMemo(
        () => items.filter((p) => !discharged.includes(p.patientId)),
        [items, discharged],
    );

    const filtered = useMemo(() => {
        const q = query.trim();
        if (!q) return active;
        return active.filter(
            (p) => p.displayName.includes(q) || (p.roomLabel ?? '').includes(q),
        );
    }, [active, query]);

    const handleDischarge = (patient: ApiPatient) => {
        Alert.alert('퇴원 처리', `${patient.displayName}을 퇴원 처리할까요?`, [
            { text: '취소', style: 'cancel' },
            {
                text: '퇴원',
                style: 'destructive',
                onPress: () => setDischarged((prev) => [...prev, patient.patientId]),
            },
        ]);
    };

    return (
        <View style={[styles.root, { paddingTop: insets.top + layout.screenTopGap }]}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>환자</Text>
                <Pressable hitSlop={8}>
                    <Text style={styles.headerAction}>환자 추가 +</Text>
                </Pressable>
            </View>

            <View style={styles.searchBox}>
                <Image
                    source={require('../../assets/icons/search.png')}
                    style={styles.searchIcon}
                    resizeMode="contain"
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="환자명, 등록 번호로 검색"
                    placeholderTextColor={colors.textDim}
                    value={query}
                    onChangeText={setQuery}
                />
            </View>

            <View style={styles.countRow}>
                <Text style={styles.countText}>전체 {active.length}명</Text>
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
                    {filtered.map((p) => (
                        <PatientRow
                            key={p.patientId}
                            patient={p}
                            onPress={() => onSelect(p.patientId)}
                            onDischarge={() => handleDischarge(p)}
                        />
                    ))}

                    {filtered.length === 0 ? (
                        <Text style={styles.emptyText}>표시할 환자가 없어요</Text>
                    ) : null}
                </ScrollView>
            )}
        </View>
    );
}

function PatientRow({
    patient, onPress, onDischarge,
}: {
    patient: ApiPatient;
    onPress: () => void;
    onDischarge: () => void;
}) {
    const day = admissionDayOf(patient.admittedAt);

    return (
        <View style={styles.card}>
            <Pressable onPress={onPress}>
                <View style={styles.cardTop}>
                    <Text style={styles.bedText}>{patient.roomLabel ?? '병실 미지정'}</Text>
                    <Text style={styles.chevron}>›</Text>
                </View>

                <View style={styles.nameRow}>
                    <Text style={styles.name}>{patient.displayName}</Text>
                    {patient.statusLabel ? (
                        <View style={styles.flag}>
                            <Text style={styles.flagText}>{patient.statusLabel}</Text>
                        </View>
                    ) : null}
                </View>

                {patient.department || day ? (
                    <View style={styles.metaRow}>
                        {patient.department ? (
                            <Text style={styles.meta}>{patient.department}</Text>
                        ) : null}
                        {patient.department && day ? <Text style={styles.metaDot}>•</Text> : null}
                        {day ? <Text style={styles.meta}>입원 {day}일차</Text> : null}
                    </View>
                ) : null}

                {patient.baselineSummary ? (
                    <>
                        <View style={styles.cardDivider} />
                        <Text style={styles.condition}>{patient.baselineSummary}</Text>
                    </>
                ) : null}
            </Pressable>

            <Pressable style={styles.dischargeBtn} onPress={onDischarge}>
                <Text style={styles.dischargeText}>퇴원 처리</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
    headerAction: { ...font.body, color: colors.primary },

    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.card,
        marginHorizontal: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        height: 56,
        marginTop: spacing.md,
    },
    searchIcon: { width: 20, height: 20 },
    searchInput: { flex: 1, ...font.body, color: colors.text },

    countRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
    countText: { ...font.small, color: colors.textSub },

    list: { flex: 1 },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.md,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bedText: { ...font.body, color: colors.text },
    chevron: { fontSize: 20, color: colors.textDim },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
    name: { fontSize: 19, fontWeight: '700', color: colors.text },
    flag: {
        backgroundColor: colors.primarySoft,
        borderRadius: radius.sm,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    flagText: { ...font.tiny, color: colors.primary },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
    meta: { ...font.small, color: colors.textDim },
    metaDot: { color: colors.primary, fontSize: 10 },

    cardDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
    condition: { ...font.small, color: colors.textSub },

    dischargeBtn: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingVertical: 13,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    dischargeText: { ...font.small, fontWeight: '600', color: colors.textSub },

    emptyText: {
        ...font.small,
        color: colors.textDim,
        textAlign: 'center',
        marginTop: spacing.xxl,
    },
    errorText: { ...font.small, color: colors.danger, textAlign: 'center' },
    retryBtn: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    retryText: { ...font.small, fontWeight: '600', color: colors.text },
});