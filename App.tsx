import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomTabBar from './src/components/BottomTabBar';
import HomeScreen from './src/screens/HomeScreen';
import PatientListScreen from './src/screens/PatientListScreen';
import PatientDetailScreen from './src/screens/PatientDetailScreen';
import HandoffScreen from './src/screens/HandOffScreen';
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
  const [detailPatientId, setDetailPatientId] = useState<string | null>(null);

  const changeTab = (next: TabKey) => {
    setDetailPatientId(null);
    setTab(next);
  };

  const renderPatientTab = () =>
    detailPatientId ? (
      <PatientDetailScreen
        patientId={detailPatientId}
        onBack={() => setDetailPatientId(null)}
      />
    ) : (
      <PatientListScreen onSelect={setDetailPatientId} />
    );

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <View style={styles.body}>
          {tab === 'home' && <HomeScreen />}
          {tab === 'patient' && renderPatientTab()}
          {tab === 'task' && <Placeholder label="업무" />}
          {tab === 'handoff' && <HandoffScreen />}
          {tab === 'my' && <Placeholder label="마이" />}
        </View>
        <BottomTabBar current={tab} onChange={changeTab} />
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