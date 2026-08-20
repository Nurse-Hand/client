import { apiGet, apiPost, apiPatch, newIdempotencyKey } from './client';
import { ShiftType } from '../types';

export type PrecheckStatus = 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
export type PrecheckSeverity = 'CRITICAL' | 'RECOMMENDED';
export type PrecheckAnswer =
    | 'NO_ISSUE'
    | 'INCLUDE_HANDOFF'
    | 'UNVERIFIED'
    | 'NOT_APPLICABLE';

export interface PrecheckEvidence {
    sourceType: 'TIMELINE_EVENT' | 'TASK';
    sourceId: string;
    sourceReference: string;
    occurredAt: string | null;
    excerptKind: 'UTTERANCE' | 'SUMMARY' | 'TASK_TITLE';
    excerpt: string;
}

export interface PrecheckItem {
    itemId: string;
    patientId: string;
    severity: PrecheckSeverity;
    question: string;
    reason: string;
    evidence: PrecheckEvidence[];
    answer?: PrecheckAnswer | null;
    comment?: string | null;
    version: number;
}

export interface PrecheckData {
    precheckId: string;
    version: number;
    jobId: string;
    status: PrecheckStatus;
    failureCode: string | null;
    retryable: boolean | null;
    summary?: { critical: number; recommended: number };
    items?: PrecheckItem[];
}

export function createPrecheck(body: {
    shiftId: string;
    targetDuty: ShiftType;
    date: string;
}) {
    return apiPost<{ precheckId: string; status: 'QUEUED' }>(
        '/handoff-prechecks',
        body,
        newIdempotencyKey(),
    );
}

export function fetchPrecheck(precheckId: string) {
    return apiGet<PrecheckData>(`/handoff-prechecks/${precheckId}`);
}

export function answerPrecheckItem(
    precheckId: string,
    itemId: string,
    body: { answer: PrecheckAnswer; comment?: string | null; version: number },
) {
    return apiPatch<{ itemId: string; answer: PrecheckAnswer; version: number }>(
        `/handoff-prechecks/${precheckId}/items/${itemId}`,
        body,
    );
}

export function formatEvidenceTime(iso: string | null) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    if (isToday) return `오늘 ${time}`;
    if (isYesterday) return `어제 ${time}`;
    return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}