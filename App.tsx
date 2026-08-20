import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomTabBar from './src/components/BottomTabBar';
import HomeScreen from './src/screens/HomeScreen';
import PatientListScreen from './src/screens/PatientListScreen';
import PatientDetailScreen from './src/screens/PatientDetailScreen';
import HandoffScreen from './src/screens/HandoffScreen';
import RoundingScreen from './src/screens/RoundingScreen';
import TaskScreen from './src/screens/TaskScreen';
import HandoffPrecheckScreen from './src/screens/HandoffPrecheckScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import RecordTranscriptScreen from './src/screens/RecordTranscriptScreen';
import HandoffDraftScreen from './src/screens/HandoffDraftScreen';
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
  const [roundingOpen, setRoundingOpen] = useState(false);
  const [precheckOpen, setPrecheckOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);

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

  if (!onboardingDone) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OnboardingScreen onStart={() => setOnboardingDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <View style={styles.body}>
          {roundingOpen ? (
            <RoundingScreen onBack={() => setRoundingOpen(false)} />
          ) : (
            <>
              {tab === 'home' && (
                transcriptOpen ? (
                  <RecordTranscriptScreen onBack={() => setTranscriptOpen(false)} />
                ) : (
                  <HomeScreen
                    onStartRounding={() => setRoundingOpen(true)}
                    onOpenTranscript={() => setTranscriptOpen(true)}
                  />
                )
              )}
              {tab === 'patient' && renderPatientTab()}
              {tab === 'handoff' && (
                draftOpen ? (
                  <HandoffDraftScreen
                    onBack={() => setDraftOpen(false)}
                    onComplete={() => setDraftOpen(false)}
                  />
                ) : precheckOpen ? (
                  <HandoffPrecheckScreen
                    onBack={() => setPrecheckOpen(false)}
                    onDone={() => {
                      setPrecheckOpen(false);
                      setDraftOpen(true);
                    }}
                  />
                ) : (
                  <HandoffScreen
                    onGoPrecheck={() => setPrecheckOpen(true)}
                    onGoDraft={() => setDraftOpen(true)}
                  />
                )
              )}
              {tab === 'task' && <TaskScreen />}
            </>
          )}
        </View>
        {!roundingOpen && <BottomTabBar current={tab} onChange={changeTab} />}
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