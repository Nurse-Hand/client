import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabKey } from '../types';
import { colors, spacing, font } from '../theme';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'home', label: '홈', icon: 'home' },
    { key: 'patient', label: '환자', icon: 'people' },
    { key: 'task', label: '업무', icon: 'checkbox' },
    { key: 'handoff', label: '인수인계', icon: 'swap-horizontal' },
];

interface Props {
    current: TabKey;
    onChange: (key: TabKey) => void;
}

export default function BottomTabBar({ current, onChange }: Props) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
            {TABS.map((tab) => {
                const active = tab.key === current;
                return (
                    <Pressable key={tab.key} style={styles.item} onPress={() => onChange(tab.key)}>
                        <Ionicons
                            name={active ? tab.icon : (`${tab.icon}-outline` as keyof typeof Ionicons.glyphMap)}
                            size={22}
                            color={active ? colors.primary : colors.textDim}
                        />
                        <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.sm,
    },
    item: { flex: 1, alignItems: 'center', gap: 3 },
    label: { ...font.tiny, color: colors.textDim },
    labelActive: { color: colors.primary },
});