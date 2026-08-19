import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { patients } from '../mocks/patients';
import { Patient, PatientFlag, PATIENT_FLAG_LABEL } from '../types';
import { colors, spacing, radius, font, layout } from '../theme';

type FilterKey = 'ALL' | PatientFlag;

interface Props {
    onSelect: (patientId: string) => void;
}

export default function PatientListScreen({ onSelect }: Props) {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<FilterKey>('ALL');
    const [discharged, setDischarged] = useState<string[]>([]);

    const active = useMemo(
        () => patients.filter((p) => !discharged.includes(p.id)),
        [discharged],
    );

    const counts = useMemo(() => ({
        ALL: active.length,
        CAUTION: active.filter((p) => p.flags.includes('CAUTION')).length,
        NEW: active.filter((p) => p.flags.includes('NEW')).length,
        DISCHARGE_SOON: active.filter((p) => p.flags.includes('DISCHARGE_SOON')).length,
    }), [active]);

    const filtered = useMemo(() => {
        return active.filter((p) => {
            const matchFilter = filter === 'ALL' || p.flags.includes(filter);
            const q = query.trim();
            const matchQuery = !q || p.name.includes(q) || p.room.includes(q);
            return matchFilter && matchQuery;
        });
    }, [active, query, filter]);

    const handleDischarge = (patient: Patient) => {
        Alert.alert('퇴원 처리', `${patient.room}호 ${patient.name}을 퇴원 처리할까요?`, [
            { text: '취소', style: 'cancel' },
            {
                text: '퇴원',
                style: 'destructive',
                onPress: () => setDischarged((prev) => [...prev, patient.id]),
            },
        ]);
    };

    const filterKeys: FilterKey[] = ['ALL', 'CAUTION', 'NEW', 'DISCHARGE_SOON'];

    return (
        <View style={[styles.root, { paddingTop: insets.top + layout.screenTopGap }]}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>환자</Text>
                <Pressable hitSlop={8}>
                    <Text style={styles.headerAction}>환자 추가 +</Text>
                </Pressable>
            </View>

            <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="환자명, 등록 번호로 검색"
                    placeholderTextColor={colors.textDim}
                    value={query}
                    onChangeText={setQuery}
                />
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}
            >
                {filterKeys.map((key) => {
                    const isActive = filter === key;
                    const label = key === 'ALL' ? '전체' : PATIENT_FLAG_LABEL[key];
                    return (
                        <Pressable
                            key={key}
                            style={[styles.filterChip, isActive && styles.filterChipActive]}
                            onPress={() => setFilter(key)}
                        >
                            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                {label}
                            </Text>
                            <Text style={[styles.filterCount, isActive && styles.filterTextActive]}>
                                {counts[key]}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                {filtered.map((p) => (
                    <PatientRow
                        key={p.id}
                        patient={p}
                        onPress={() => onSelect(p.id)}
                        onDischarge={() => handleDischarge(p)}
                    />
                ))}

                {filtered.length === 0 ? (
                    <Text style={styles.emptyText}>표시할 환자가 없어요</Text>
                ) : null}
            </ScrollView>
        </View>
    );
}

function PatientRow({
    patient, onPress, onDischarge,
}: {
    patient: Patient;
    onPress: () => void;
    onDischarge: () => void;
}) {
    return (
        <View style={styles.card}>
            <Pressable onPress={onPress}>
                <View style={styles.cardTop}>
                    <Text style={styles.bedText}>
                        {patient.room}호  {patient.bedNo}번 침상
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                </View>

                <View style={styles.nameRow}>
                    <Text style={styles.name}>{patient.name}</Text>
                    {patient.flags.map((flag) => (
                        <View key={flag} style={styles.flag}>
                            <Text style={styles.flagText}>{PATIENT_FLAG_LABEL[flag]}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.metaRow}>
                    <Text style={styles.meta}>{patient.department}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.meta}>입원 {patient.admissionDay}일차</Text>
                </View>

                <View style={styles.cardDivider} />
                <Text style={styles.condition}>{patient.condition}</Text>
            </Pressable>

            <Pressable style={styles.dischargeBtn} onPress={onDischarge}>
                <Text style={styles.dischargeText}>퇴원 처리</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

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
        marginBottom: spacing.sm,
    },
    searchIcon: { fontSize: 14 },
    searchInput: { flex: 1, ...font.body, color: colors.text },

    chipScroll: {
        flexGrow: 0,
        marginBottom: spacing.sm,
    },
    chipRow: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        alignItems: 'center',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.lg,
        paddingVertical: 6,
        backgroundColor: colors.card,
        height: 34,
    },
    filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    filterText: { ...font.body, color: colors.textSub },
    filterCount: { ...font.small, color: colors.textDim },
    filterTextActive: { color: colors.primary },

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
});