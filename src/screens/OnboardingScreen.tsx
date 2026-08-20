import { useRef, useState } from 'react';
import {
    View, Text, Image, Pressable, ScrollView,
    Dimensions, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDES = [
    {
        image: require('../../assets/onboarding/1.png'),
        title: '라운딩 돌기 전, 녹음을 시작해요',
        desc: '라운딩 중에 메모를 쓰거나 사진을 첨부할 수도 있어요.\nAI가 내용을 분석해서 정리해줄게요.',
    },
    {
        image: require('../../assets/onboarding/2.png'),
        title: '녹음 에티켓을 지켜주세요',
        desc: '환자와의 녹음을 진행할 때는\n반드시 상대방의 동의를 받고 진행해주세요',
    },
    {
        image: require('../../assets/onboarding/3.png'),
        title: '인수인계 내용을 정리해요',
        desc: '기록된 내용을 바탕으로,\n다음 근무자에게 전달할 인수인계를 생성할 수 있어요',
    },
    {
        image: require('../../assets/onboarding/4.png'),
        title: '인계내용을 전달 받아요',
        desc: '우선순위가 정리된 업무 목록까지 전달받아,\n일처리가 쉬워져요',
    },
];

interface Props {
    onStart: () => void;
}

export default function OnboardingScreen({ onStart }: Props) {
    const insets = useSafeAreaInsets();
    const [index, setIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
                }}
            >
                {SLIDES.map((slide, i) => (
                    <View key={i} style={styles.slide}>
                        <View style={styles.imageWrap}>
                            <Image source={slide.image} style={styles.image} resizeMode="contain" />
                        </View>

                        <Text style={styles.title}>{slide.title}</Text>
                        <Text style={styles.desc}>{slide.desc}</Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.dots}>
                {SLIDES.map((_, i) => (
                    <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
            </View>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
                <Pressable style={styles.primaryBtn} onPress={onStart}>
                    <Text style={styles.primaryBtnText}>시작하기</Text>
                </Pressable>

                <Pressable style={styles.ghostBtn} onPress={onStart}>
                    <Text style={styles.ghostBtnText}>로그인하기</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    slide: {
        width: SCREEN_W,
        alignItems: 'center',
        paddingHorizontal: spacing.xxl,
    },
    imageWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: { width: SCREEN_W * 0.66, height: SCREEN_W * 0.66 },

    title: {
        fontSize: 21,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    desc: {
        ...font.small,
        color: colors.textDim,
        textAlign: 'center',
        lineHeight: 20,
    },

    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xxl,
    },
    dot: {
        width: 7, height: 7, borderRadius: radius.pill,
        backgroundColor: colors.border,
    },
    dotActive: { backgroundColor: colors.primary },

    footer: { paddingHorizontal: spacing.xl, gap: spacing.sm },
    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: 16,
        alignItems: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    ghostBtn: { alignItems: 'center', paddingVertical: spacing.md },
    ghostBtnText: { ...font.small, color: colors.textSub },
});