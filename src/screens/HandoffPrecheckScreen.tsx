import { useState, useEffect, useMemo } from 'react';
import {
    View, Text, Image, Pressable, ScrollView,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    answerPrecheckItem, formatEvidenceTime, PrecheckItem,
} from '../api/handOffChecks';
import { mockPrecheckItems } from '../mocks/precheck';
import { fetchPatients, ApiPatient } from '../api/patients';
import { colors, spacing, radius, font } from '../theme';

const USE_MOCK = true;

interface Props {
    precheckId?: string;
    onBack: () => void;
    onDone: () => void;
}

export default function HandoffPrecheckScreen({ precheckId, onBack, onDone }: Props) {
    const insets = useSafeAreaInsets();

    const [items, setItems] = useState<PrecheckItem[]>([]);
    const [patients, setPatients] = useState<ApiPatient[]>([]);
    const [index, setIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const p = await fetchPatients();
                setPatients(p.items ?? []);
            } catch (e: any) {
                console.log('환자 목록 실패:', e.code, e.message);
            }

            if (USE_MOCK) {
                setItems(mockPrecheckItems);
            }
            setLoading(false);
        })();
    }, []);

    const patientMap = useMemo(() => {
        const m: Record<string, ApiPatient> = {};
        for (const p of patients) m[p.patientId] = p;
        return m;
    }, [patients]);

    const current = items[index];

    const submit = async (answer: 'INCLUDE_HANDOFF' | 'NO_ISSUE') => {
        if (!current || submitting) return;
        setSubmitting(true);

        if (!USE_MOCK && precheckId) {
            try {
                await answerPrecheckItem(precheckId, current.itemId, {
                    answer,
                    version: current.version,
                });
            } catch (e: any) {
                console.log('답변 저장 실패:', e.code, e.message);
            }
        }

        setSubmitting(false);

        if (index + 1 < items.length) {
            setIndex(index + 1);
        } else {
            onDone();
        }
    };

    if (loading) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!current) {
        return (
            <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
                <NavBar onBack={onBack} />
                <View style={styles.center}>
                    <Text style={styles.emptyText}>확인이 필요한 항목이 없어요</Text>
                    <Pressable style={styles.primaryBtn} onPress={onDone}>
                        <Text style={styles.primaryBtnText}>초안 만들기</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const patient = patientMap[current.patientId];

    return (
        <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
            <NavBar onBack={onBack} />

            <View style={styles.counter}>
                <Text style={styles.counterText}>{index + 1} of {items.length}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.question}>{current.question}</Text>

                    <Text style={styles.patientLine}>
                        {patient
                            ? `${patient.displayName}  ${patient.roomLabel ?? ''}`.trim()
                            : '환자 정보 없음'}
                    </Text>

                    <View style={styles.divider} />

                    <Image
                        source={require('../../assets/icons/ai.png')}
                        style={styles.sparkle}
                        resizeMode="contain"
                    />
                    <Text style={styles.reason}>{current.reason}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.evidenceTitle}>관련 기록</Text>

                    {current.evidence.map((ev, i) => (
                        <Pressable key={`${ev.sourceId}-${i}`} style={styles.evidenceRow}>
                            <View style={styles.flex}>
                                <Text style={styles.evidenceTime}>{formatEvidenceTime(ev.occurredAt)}</Text>
                                <Text style={styles.evidenceText}>{ev.excerpt}</Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
                <Pressable
                    style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                    onPress={() => submit('INCLUDE_HANDOFF')}
                    disabled={submitting}
                >
                    <Text style={styles.primaryBtnText}>인계에 반영</Text>
                </Pressable>

                <Pressable
                    style={styles.ghostBtn}
                    onPress={() => submit('NO_ISSUE')}
                    disabled={submitting}
                >
                    <Text style={styles.ghostBtnText}>반영 안 함</Text>
                </Pressable>
            </View>
        </View>
    );
}

function NavBar({ onBack }: { onBack: () => void }) {
    return (
        <View style={styles.navBar}>
            <Pressable onPress={onBack} hitSlop={12}>
                <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.navTitle}>인계 전 확인 사항</Text>
            <View style={styles.navSpacer} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },

    navBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    },
    backIcon: { fontSize: 30, color: colors.text, lineHeight: 32 },
    navTitle: { flex: 1, textAlign: 'center', ...font.h2, color: colors.text },
    navSpacer: { width: 20 },

    counter: { alignItems: 'center', marginBottom: spacing.lg },
    counterText: {
        ...font.small, color: colors.textSub,
        backgroundColor: colors.card, borderRadius: radius.pill,
        paddingHorizontal: spacing.lg, paddingVertical: 6,
        overflow: 'hidden',
    },

    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xxl,
    },
    question: { fontSize: 21, fontWeight: '700', color: colors.text, lineHeight: 29 },
    patientLine: { ...font.small, color: colors.textDim, marginTop: spacing.md },

    divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xl },

    sparkle: { width: 18, height: 18, marginBottom: spacing.md },
    reason: { ...font.body, color: colors.text, lineHeight: 23 },

    evidenceTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
    evidenceRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: spacing.md,
    },
    evidenceTime: { ...font.small, color: colors.textDim, marginBottom: spacing.xs },
    evidenceText: { ...font.body, color: colors.text },
    chevron: { fontSize: 20, color: colors.textDim },

    footer: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: 17,
        alignItems: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    btnDisabled: { opacity: 0.5 },

    ghostBtn: { alignItems: 'center', paddingVertical: spacing.md },
    ghostBtnText: { ...font.body, color: colors.textSub },

    emptyText: { ...font.body, color: colors.textDim },
});