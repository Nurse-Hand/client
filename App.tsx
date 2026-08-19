import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomTabBar from './src/components/BottomTabBar';
import HomeScreen from './src/screens/HomeScreen';
import { TabKey } from './src/types';
import { colors, font } from './src/theme';

function Placeholder({ label }: { label: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{label}</Text>
    </View>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabKey>('home');

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <View style={styles.body}>
          {tab === 'home' && <HomeScreen />}
          {tab === 'patient' && <Placeholder label="환자" />}
          {tab === 'task' && <Placeholder label="업무" />}
          {tab === 'handoff' && <Placeholder label="인수인계" />}
          {tab === 'my' && <Placeholder label="마이" />}
        </View>
        <BottomTabBar current={tab} onChange={setTab} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  placeholderText: { ...font.h2, color: colors.textDim },
});