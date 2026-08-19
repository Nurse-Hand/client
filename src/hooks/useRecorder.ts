import { useEffect, useState } from 'react';
import {
    useAudioRecorder,
    useAudioRecorderState,
    RecordingPresets,
    setAudioModeAsync,
    requestRecordingPermissionsAsync,
} from 'expo-audio';

const SPEECH_THRESHOLD_DB = -35;

export function useRecorder() {
    const recorder = useAudioRecorder({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
    });
    const state = useAudioRecorderState(recorder, 100);

    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [levels, setLevels] = useState<number[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const perm = await requestRecordingPermissionsAsync();
                if (!perm.granted) {
                    setError('마이크 권한이 필요해요');
                    return;
                }
                await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
                setReady(true);
            } catch (e: any) {
                setError(String(e?.message ?? e));
            }
        })();
    }, []);

    useEffect(() => {
        if (!state.isRecording) return;
        const db = state.metering ?? -160;
        const norm = Math.max(0, Math.min(1, (db + 60) / 60));
        setLevels((prev) => [...prev.slice(-29), norm]);
    }, [state.metering, state.isRecording]);

    const start = async () => {
        try {
            setLevels([]);
            await recorder.prepareToRecordAsync();
            recorder.record();
        } catch (e: any) {
            setError(String(e?.message ?? e));
        }
    };

    const pause = () => recorder.pause();
    const resume = () => recorder.record();

    const stop = async () => {
        try {
            await recorder.stop();
            return recorder.uri;
        } catch (e: any) {
            setError(String(e?.message ?? e));
            return null;
        }
    };

    const reset = () => setLevels([]);

    return {
        ready,
        error,
        levels,
        isRecording: state.isRecording,
        isSpeech: state.isRecording && (state.metering ?? -160) > SPEECH_THRESHOLD_DB,
        durationMs: state.durationMillis ?? 0,
        start,
        pause,
        resume,
        stop,
        reset,
    };
}

export function formatDuration(ms: number) {
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
}