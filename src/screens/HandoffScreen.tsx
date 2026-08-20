import { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { handoffRecords, pendingChecks, hasIncomingHandoff } from '../mocks/handoff';
import { colors, spacing, radius, font, layout } from '../theme';
import { fetchHandoffs, dateOf, HandoffListItem } from '../api/handoffs';

export default function HandoffScreen({
    onGoPrecheck,
    onGoDraft,
}: {
    onGoPrecheck: () => void;
    onGoDraft: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [checkModalOpen, setCheckModalOpen] = useState(false);

    const [items, setItems] = useState<HandoffListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHandoffs()
            .then((r) => setItems(r.items ?? []))
            .catch((e) => console.log('인수인계 목록 실패:', e.code, e.message))
            .finally(() => setLoading(false));
    }, []);

    const handleCreate = () => {
        if (pendingChecks.length > 0) {
            setCheckModalOpen(true);
            return;
        }
        // 확인 항목 없으면 바로 생성
    };

    return (
        <View style={[styles.root, { paddingTop: insets.top + layout.screenTopGap }]}>
            <Text style={styles.pageTitle}>인수인계</Text>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {hasIncomingHandoff && (
                    <Pressable style={styles.noticeCard}>
                        <View style={styles.bellWrap}>
                            <Image
                                source={require('../../assets/icons/bell.png')}
                                style={styles.bellIcon}
                                resizeMode="contain"
                            />
                            <View style={styles.noticeDot} />
                        </View>
                        <Text style={styles.noticeText}>이전 근무자가 보낸 인계 사항이 있어요.</Text>
                    </Pressable>
                )}

                <View style={styles.banner}>
                    <View style={styles.bannerText}>
                        <Text style={styles.bannerTitle}>오늘의 인수인계</Text>
                        <Text style={styles.bannerDesc}>기록된 라운딩 내역을 바탕으로{'\n'}인수인계를 생성해요</Text>
                        <Pressable style={styles.bannerBtn} onPress={handleCreate}>
                            <Text style={styles.bannerBtnText}>생성하기</Text>
                        </Pressable>
                    </View>
                    <Image
                        source={require('../../assets/mascot2.png')}
                        style={styles.bannerMascot}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.card}>
                    <View style={styles.cardHead}>
                        <Text style={styles.sectionTitle}>작성한 인수인계</Text>
                        <Pressable hitSlop={8}>
                            <Text style={styles.cardAction}>전체 보기 ›</Text>
                        </Pressable>
                    </View>

                    {loading ? (
                        <Text style={styles.emptyText}>불러오는 중...</Text>
                    ) : items.length === 0 ? (
                        <Text style={styles.emptyText}>작성한 인수인계가 없어요</Text>
                    ) : (
                        items.map((item, i) => (
                            <HandoffRow
                                key={item.handoffId}
                                item={item}
                                isLast={i === items.length - 1}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            <PendingCheckModal
                visible={checkModalOpen}
                onDismiss={() => {
                    setCheckModalOpen(false);
                    onGoDraft();
                }}
                onConfirm={() => {
                    setCheckModalOpen(false);
                    onGoPrecheck();
                }}
            />
        </View>
    );
}

function HandoffRow({ item, isLast }: { item: HandoffListItem; isLast: boolean }) {
    const { date, weekday } = dateOf(item.updatedAt);
    const isDraft = item.status === 'DRAFT';

    return (
        <>
            <Pressable style={styles.row}>
                <View style={styles.rowText}>
                    <Text style={styles.rowDate}>{date} {weekday}</Text>
                    <Text style={styles.rowReceiver}>
                        환자 {item.patientCount}명 · 업무 {item.taskCount}건
                    </Text>
                </View>

                {isDraft ? (
                    <View style={styles.statusChip}>
                        <Text style={styles.statusText}>작성 중</Text>
                    </View>
                ) : (
                    <Text style={styles.chevron}>›</Text>
                )}
            </Pressable>

            {!isLast && <View style={styles.rowDivider} />}
        </>
    );
}

function PendingCheckModal({
    visible,
    onDismiss,
    onConfirm,
}: {
    visible: boolean;
    onDismiss: () => void;
    onConfirm: () => void;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.modal}>
                    <Text style={styles.modalTitle}>생성 전에,{'\n'}확인이 필요한 항목이 있어요!</Text>
                    <Text style={styles.modalDesc}>
                        AI가 식별한 내용이라 사실과 다를 수 있어요.{'\n'}검토 후 초안 만들기를 권장 드려요.
                    </Text>

                    <View style={styles.checkList}>
                        {pendingChecks.map((check) => (
                            <View key={check.kind} style={styles.checkChip}>
                                <Text style={styles.checkText}>⚠ {check.label} {check.count}건</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.modalBtnRow}>
                        <Pressable style={styles.ghostBtn} onPress={onDismiss}>
                            <Text style={styles.ghostBtnText}>무시하기</Text>
                        </Pressable>
                        <Pressable style={styles.primaryBtn} onPress={onConfirm}>
                            <Text style={styles.primaryBtnText}>확인하러 가기</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    pageTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

    noticeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        marginBottom: spacing.lg,
        gap: spacing.md,
    },
    noticeText: { flex: 1, ...font.body, color: colors.text },

    bellWrap: { position: 'relative' },
    bellIcon: { width: 20, height: 20 },
    noticeDot: {
        position: 'absolute',
        top: -1, right: -1,
        width: 7, height: 7,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
    },

    banner: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
    },
    bannerText: { flex: 1 },
    bannerTitle: { fontSize: 19, fontWeight: '700', color: '#fff' },
    bannerDesc: { ...font.small, color: '#FFE4F1', marginTop: spacing.sm, lineHeight: 18 },
    bannerBtn: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primarySoft,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.md,
        marginTop: spacing.xl,
    },
    bannerBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },
    bannerMascot: { width: 150, height: 150, alignSelf: 'flex-end' },

    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xl,
    },
    cardHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    sectionTitle: { fontSize: 19, fontWeight: '700', color: colors.text },
    cardAction: { ...font.small, color: colors.textDim },

    todayBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primarySoft,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        marginBottom: spacing.md,
    },
    todayText: { ...font.tiny, color: colors.primary },

    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
    rowText: { flex: 1 },
    rowDate: { fontSize: 16, fontWeight: '700', color: colors.text },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    shiftIcon: { width: 14, height: 14 },
    rowReceiver: { ...font.small, color: colors.textDim, marginTop: spacing.xs },

    statusChip: {
        backgroundColor: colors.bg,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 7,
    },
    statusText: { ...font.small, color: colors.textSub },
    chevron: { fontSize: 20, color: colors.textDim },

    rowDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },

    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(20,20,30,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    modal: {
        width: '100%',
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xxl,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 28 },
    modalDesc: { ...font.small, color: colors.textSub, lineHeight: 19, marginTop: spacing.md },

    checkList: { gap: spacing.sm, marginTop: spacing.xl },
    checkChip: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primarySoft,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    checkText: { ...font.small, color: colors.primary },

    modalBtnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl },
    ghostBtn: {
        flex: 1,
        backgroundColor: colors.bg,
        borderRadius: radius.pill,
        paddingVertical: 15,
        alignItems: 'center',
    },
    ghostBtnText: { fontSize: 15, fontWeight: '600', color: colors.textSub },
    primaryBtn: {
        flex: 1.6,
        backgroundColor: colors.primary,
        borderRadius: radius.pill,
        paddingVertical: 15,
        alignItems: 'center',
    },
    primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    emptyText: { ...font.small, color: colors.textDim, textAlign: 'center', paddingVertical: spacing.xl },
});