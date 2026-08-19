import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import { homeSummary, SHIFT_LABEL, SHIFT_EMOJI } from '../mocks/home';
import { QUICK_RECORD_LABEL, QuickRecordType } from '../types';
import { colors, spacing, radius, font } from '../theme';

const QUICK_TYPES = Object.keys(QUICK_RECORD_LABEL) as QuickRecordType[];

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { nurseName, today, duty, summaryNeedsReview } = homeSummary;

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.topBar}>
                <Pressable hitSlop={8}>
                    <Ionicons name="notifications-outline" size={22} color={colors.text} />
                </Pressable>
                <Pressable hitSlop={8}>
                    <Ionicons name="settings-outline" size={22} color={colors.text} />
                </Pressable>
            </View>

            <View style={styles.greeting}>
                <View style={styles.greetingText}>
                    <Text style={styles.date}>{today}</Text>
                    <Text style={styles.hello}>{nurseName}님,{'\n'}좋은 아침이에요!</Text>
                </View>
                <View style={styles.mascot}>
                    <Text style={styles.mascotEmoji}>📋</Text>
                </View>
            </View>

            <Card title="라운딩 기록">
                <View style={styles.dutyRow}>
                    <Text style={styles.dutyLabel}>오늘 근무</Text>
                    <Text style={styles.dutyValue}>
                        {SHIFT_EMOJI[duty.shift]} {SHIFT_LABEL[duty.shift]}
                    </Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.dutyValue}>환자 {duty.patientCount}명</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.dutyValue}>{duty.ward}</Text>
                </View>
                <Pressable style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>라운딩 시작하기</Text>
                </Pressable>
            </Card>

            <Card title="빠른 기록" actionLabel="기록 수정" style={styles.quickCard}>
                <Text style={styles.desc}>유형을 눌러 간단하게 메모 할 수 있어요</Text>
                <View style={styles.chipGrid}>
                    {QUICK_TYPES.map((type) => (
                        <Pressable key={type} style={styles.chip}>
                            <Text style={styles.chipText}>{QUICK_RECORD_LABEL[type]}</Text>
                        </Pressable>
                    ))}
                </View>
            </Card>

            <Card title="오늘 기록 보기" actionLabel="전체 기록보기">
                <Pressable style={styles.listRow}>
                    <Text style={styles.listTitle}>기록 원문</Text>
                    <Text style={styles.listDesc}>가공되지 않은 원문 파일과 기록 내용을 확인할 수 있어요</Text>
                </Pressable>
                <View style={styles.divider} />
                <Pressable style={styles.listRow}>
                    <View style={styles.listTitleRow}>
                        <Text style={styles.listTitle}>요약 정리본</Text>
                        {summaryNeedsReview && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>검토 필요</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.listDesc}>기록을 토대로 AI가 정리한 내용을 볼 수 있어요</Text>
                </Pressable>
            </Card>

            <View style={styles.bottomRow}>
                <Pressable style={styles.subBtn}>
                    <Text style={styles.subBtnEmoji}>🗓</Text>
                    <Text style={styles.subBtnText}>근무표 수정하기</Text>
                </Pressable>
                <Pressable style={styles.subBtn}>
                    <Text style={styles.subBtnEmoji}>🛏</Text>
                    <Text style={styles.subBtnText}>환자 현황 변경</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.lg,
        marginBottom: spacing.md,
    },

    greeting: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
    greetingText: { flex: 1 },
    date: { ...font.small, color: colors.primary, marginBottom: spacing.xs },
    hello: { ...font.h1, color: colors.text },
    mascot: {
        width: 84,
        height: 84,
        borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mascotEmoji: { fontSize: 36 },

    dutyRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg },
    dutyLabel: { ...font.small, color: colors.textDim, marginRight: spacing.xs },
    dutyValue: { ...font.small, color: colors.text },
    dot: { color: colors.textDim },

    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.pill,
        paddingVertical: 15,
        alignItems: 'center',
    },
    primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    quickCard: { marginTop: spacing.sm },
    avatar: {
        position: 'absolute',
        top: -22,
        left: '38%',
        width: 46,
        height: 46,
        borderRadius: radius.pill,
        backgroundColor: colors.accent,
        borderWidth: 3,
        borderColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },

    desc: { ...font.small, color: colors.textSub, marginBottom: spacing.md },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        flexGrow: 1,
        flexBasis: '30%',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingVertical: 11,
        alignItems: 'center',
    },
    chipText: { ...font.small, color: colors.text },

    listRow: { paddingVertical: spacing.sm },
    listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    listTitle: { ...font.body, color: colors.text, marginBottom: 3 },
    listDesc: { ...font.small, color: colors.textDim },
    divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
    badge: {
        backgroundColor: colors.primarySoft,
        borderRadius: radius.sm,
        paddingHorizontal: 7,
        paddingVertical: 3,
        marginBottom: 3,
    },
    badgeText: { ...font.tiny, color: colors.primary },

    bottomRow: { flexDirection: 'row', gap: spacing.md },
    subBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        paddingVertical: 15,
    },
    subBtnEmoji: { fontSize: 15 },
    subBtnText: { ...font.small, color: colors.text },
});