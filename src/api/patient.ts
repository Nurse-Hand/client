import { apiGet } from './client';

export interface ApiPatient {
    patientId: string;
    displayName: string;
    roomLabel: string | null;
    statusLabel: string | null;
    department: string | null;
    admittedAt: string | null;
    baselineSummary: string | null;
    createdAt: string;
}

export type TimelineEventType =
    | 'PATIENT_STATUS' | 'PAIN' | 'TREATMENT'
    | 'DIET' | 'ACTIVITY' | 'OBSERVATION';

export interface ApiTimelineEvent {
    timelineEventId: string;
    patientId: string;
    occurredAt: string;
    type: TimelineEventType;
    source: string;
    summary: string;
    version: number;
    sourceReference: string;
}

export function fetchPatients() {
    return apiGet<{ items: ApiPatient[] }>('/patients');
}

export function fetchPatient(patientId: string) {
    return apiGet<ApiPatient>(`/patients/${patientId}`);
}

export function fetchPatientTimeline(patientId: string) {
    return apiGet<{ items: ApiTimelineEvent[] }>(`/patients/${patientId}/timeline`);
}

export function admissionDayOf(admittedAt: string | null) {
    if (!admittedAt) return null;
    const start = new Date(admittedAt);
    if (Number.isNaN(start.getTime())) return null;
    const days = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    return days > 0 ? days : null;
}

export function dateKeyOf(iso: string) {
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

export function timeOf(iso: string) {
    return new Date(iso).toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
}