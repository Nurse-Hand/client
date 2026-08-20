import { apiGet, apiPost, newIdempotencyKey } from './client';
import { TaskAiSuggestion, TaskPriority } from './tasks';

export type ExtractionStatus = 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

export interface ExtractionEvidence {
    evidenceId?: string;
    excerpt?: string;
    occurredAt?: string | null;
    [key: string]: unknown;
}

export interface TaskCandidate {
    candidateId: string;
    patientId: string | null;
    title: string;
    description: string | null;
    dueAt: string | null;
    workDate: string;
    aiSuggestion: TaskAiSuggestion;
    evidence: ExtractionEvidence[];
    duplicateTaskId: string | null;
    appliedTaskId: string | null;
}

export interface ExtractionJob {
    jobId: string;
    status: ExtractionStatus;
    failure: unknown | null;
    candidates: TaskCandidate[];
    createdAt: string;
    updatedAt: string;
}

export function startExtraction(roundingSessionId: string, recordIds: string[]) {
    return apiPost<ExtractionJob>(
        '/task-extraction-jobs',
        { roundingSessionId, recordIds },
        newIdempotencyKey(),
    );
}

export function fetchExtractionJob(jobId: string) {
    return apiGet<ExtractionJob>(`/task-extraction-jobs/${jobId}`);
}

export function applyCandidates(
    jobId: string,
    items: {
        candidateId: string;
        selected: boolean;
        title?: string;
        dueAt?: string | null;
        priorityOverride?: TaskPriority | null;
    }[],
) {
    return apiPost<{ createdTaskIds: string[]; skippedCandidateIds: string[] }>(
        `/task-extraction-jobs/${jobId}/apply`,
        { items },
        newIdempotencyKey(),
    );
}