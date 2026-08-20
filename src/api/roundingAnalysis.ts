import { apiGet, apiPost, newIdempotencyKey } from './client';

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
export type SpeakerRole = 'NURSE' | 'PATIENT_CANDIDATE' | 'THIRD_PARTY' | 'UNKNOWN';

export const ROLE_LABEL: Record<SpeakerRole, string> = {
    NURSE: '간호사',
    PATIENT_CANDIDATE: '환자',
    THIRD_PARTY: '제3자',
    UNKNOWN: '미확인',
};

export interface AnalysisUtterance {
    utteranceId: string;
    speakerLabel: string;
    speakerRole: SpeakerRole;
    patientId: string | null;
    startedAtMs: number;
    endedAtMs: number;
    text: string;
    confidence: number | null;
    important: boolean;
}

export interface SpeakerMatch {
    speakerLabel: string;
    rank: number;
    candidatePatientId: string;
    displayName: string;
    similarity: number;
}

export interface AnalysisJob {
    jobId: string;
    status: JobStatus;
    roundingSessionId: string;
    audioFileId: string | null;
    fullText: string | null;
    utterances: AnalysisUtterance[];
    speakerMatches: SpeakerMatch[];
    failureCode: string | null;
    createdAt: string;
    updatedAt: string;
}

export function startAnalysis(sessionId: string, audioFileId: string) {
    return apiPost<AnalysisJob>(
        `/rounding-sessions/${sessionId}/analysis-jobs`,
        { audioFileId },
        newIdempotencyKey(),
    );
}

export function fetchAnalysisJob(jobId: string) {
    return apiGet<AnalysisJob>(`/rounding-analysis-jobs/${jobId}`);
}

export function confirmAnalysis(
    sessionId: string,
    body: {
        jobId: string;
        utterances: {
            utteranceId: string;
            patientId?: string | null;
            speakerRole?: SpeakerRole;
            important?: boolean;
        }[];
    },
) {
    return apiPost<{ job: AnalysisJob; evidences: unknown[]; timelineEventIds: string[] }>(
        `/rounding-sessions/${sessionId}/analysis-confirmation`,
        body,
        newIdempotencyKey(),
    );
}

export function matchesFor(job: AnalysisJob, speakerLabel: string) {
    return job.speakerMatches
        .filter((m) => m.speakerLabel === speakerLabel)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 3);
}

export function msToTime(ms: number) {
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
}