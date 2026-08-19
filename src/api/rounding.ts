import { apiPost, apiGet, newIdempotencyKey } from './client';

export interface RoundingSegment {
    id: string;
    patientId: string;
    sequence: number;
    startedAt: string;
    endedAt: string;
    note: string | null;
}

export interface RoundingSession {
    id: string;
    status: 'RECORDING' | 'COMPLETED';
    actorId: string;
    wardId: string;
    startedAt: string;
    completedAt: string | null;
    note: string | null;
    version: number;
    segments: RoundingSegment[];
}

export function startSession(startedAt?: string) {
    return apiPost<RoundingSession>('/rounding-sessions', { startedAt });
}

export function addSegment(
    sessionId: string,
    body: { patientId: string; startedAt: string; endedAt: string; note?: string },
) {
    return apiPost<RoundingSession>(`/rounding-sessions/${sessionId}/patient-segments`, body);
}

export function completeSession(sessionId: string, completedAt?: string) {
    return apiPost<RoundingSession>(`/rounding-sessions/${sessionId}/complete`, { completedAt });
}

export function getSession(sessionId: string) {
    return apiGet<RoundingSession>(`/rounding-sessions/${sessionId}`);
}