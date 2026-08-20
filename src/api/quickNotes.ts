import { apiPost, newIdempotencyKey } from './client';

export type NoteType =
    | 'VITAL_SIGNS' | 'RESPIRATION' | 'MENTAL_STATUS'
    | 'PAIN' | 'TREATMENT' | 'DIET' | 'OBSERVATION';

export const NOTE_TYPE_LABEL: Record<NoteType, string> = {
    VITAL_SIGNS: '활력징후',
    RESPIRATION: '호흡',
    MENTAL_STATUS: '의식상태',
    PAIN: '통증',
    TREATMENT: '처치',
    DIET: '식이',
    OBSERVATION: '관찰사항',
};

export const NOTE_TYPES: NoteType[] = [
    'VITAL_SIGNS', 'RESPIRATION', 'MENTAL_STATUS',
    'PAIN', 'TREATMENT', 'DIET', 'OBSERVATION',
];

export interface ApiQuickNote {
    quickNoteId: string;
    patientId: string;
    noteType: NoteType;
    text: string | null;
    occurredAt: string;
    keywords: string[];
    evidenceStatus: string;
    createdAt: string;
    updatedAt: string;
}

export function createQuickNote(body: {
    patientId: string;
    noteType: NoteType;
    text?: string | null;
    audioFileId?: string;
    photoFileIds?: string[];
    occurredAt: string;
}) {
    return apiPost<ApiQuickNote>('/quick-notes', body, newIdempotencyKey());
}