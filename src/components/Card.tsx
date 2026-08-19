import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, font } from '../theme';

interface Props {
    title?: string;
    actionLabel?: string;
    onAction?: () => void;
    children: React.ReactNode;
    style?: ViewStyle;
}

export default function Card({ title, actionLabel, onAction, children, style }: Props) {
    return (
        <View style={[styles.card, style]}>
            {title && (
                <View style={styles.head}>
                    <Text style={styles.title}>{title}</Text>
                    {actionLabel && (
                        <Pressable style={styles.action} onPress={onAction} hitSlop={8}>
                            <Text style={styles.actionText}>{actionLabel}</Text>
                            <Ionicons name="chevron-forward" size={13} color={colors.textDim} />
                        </Pressable>
                    )}
                </View>
            )}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
    },
    head: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    title: { ...font.h2, color: colors.text },
    action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    actionText: { ...font.small, color: colors.textDim },
});