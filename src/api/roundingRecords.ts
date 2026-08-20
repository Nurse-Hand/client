import { apiGet } from './client';

export interface ApiRoundingRecord {
    recordId: string;
    sessionId: string;
    patientId: string | null;
    patientDisplayName: string | null;
    patientRoomLabel: string | null;
    actorId: string;
    wardId: string;
    sequence: number;
    workDate: string;
    startedAt: string;
    endedAt: string;
    note: string | null;
    audioFileId: string | null;
    createdAt: string;
}

export type SpeakerRole = 'NURSE' | 'PATIENT' | 'GUARDIAN' | 'UNKNOWN';

export interface ApiUtterance {
    utteranceId: string;
    speakerLabel: string;
    speakerRole: SpeakerRole;
    patientId: string | null;
    startedAtMs: number;
    endedAtMs: number;
    text: string;
    confidence: number;
    important: boolean;
}

export interface ApiSpeakerMatch {
    speakerLabel: string;
    rank: number;
    candidatePatientId: string;
    displayName: string;
    similarity: number;
}

export interface ApiAnalysisJob {
    jobId: string;
    status: 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
    roundingSessionId: string;
    audioFileId: string | null;
    fullText: string | null;
    utterances: ApiUtterance[];
    speakerMatches: ApiSpeakerMatch[];
    failureCode: string | null;
    createdAt: string;
    updatedAt: string;
}

// 화면 표시용. API에 종류 구분이 없어 프론트에서 파생
export type RecordKind = 'QUICK_NOTE' | 'ROUNDING' | 'PHOTO' | 'MEMO';

export const KIND_LABEL: Record<RecordKind, string> = {
    QUICK_NOTE: '빠른 기록',
    ROUNDING: '라운딩 녹음',
    PHOTO: '사진',
    MEMO: '메모',
};

export interface RecordEntry {
    entryId: string;
    kind: RecordKind;
    occurredAt: string;
    text: string;
    photoUri?: string;
    audioFileId?: string | null;
    patientId?: string | null;
    needsReview?: boolean;
}

const USE_MOCK = true;

function todayAt(h: number, m: number) {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
}

const MOCK_RECORDS: ApiRoundingRecord[] = [
    {
        recordId: 'rec-1',
        sessionId: 'sess-1',
        patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
        patientDisplayName: '환자 A',
        patientRoomLabel: '403호 1번 침상',
        actorId: 'actor-1',
        wardId: 'ward-1',
        sequence: 1,
        workDate: new Date().toISOString().slice(0, 10),
        startedAt: todayAt(9, 12),
        endedAt: todayAt(9, 16),
        note: null,
        audioFileId: 'audio-1',
        createdAt: todayAt(9, 16),
    },
    {
        recordId: 'rec-2',
        sessionId: 'sess-1',
        patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
        patientDisplayName: '환자 B',
        patientRoomLabel: '301호 1번 침상',
        actorId: 'actor-1',
        wardId: 'ward-1',
        sequence: 2,
        workDate: new Date().toISOString().slice(0, 10),
        startedAt: todayAt(9, 20),
        endedAt: todayAt(9, 24),
        note: null,
        audioFileId: 'audio-2',
        createdAt: todayAt(9, 24),
    },
];

const MOCK_ENTRIES: RecordEntry[] = [
    {
        entryId: 'en-1', kind: 'QUICK_NOTE', occurredAt: todayAt(9, 1),
        text: '오늘 신규 입원 환자 한 분 있습니다. 검사 일정 확인하고 보호자 문의 사항 있는지 같이 확인하겠습니다.',
        audioFileId: 'audio-q1',
    },
    {
        entryId: 'en-2', kind: 'PHOTO', occurredAt: todayAt(9, 10),
        text: '혈압 113에 84, 맥박 66, 산소포화도 98',
        photoUri: 'https://placehold.co/600x400/1a1a2e/eee?text=Monitor',
    },
    {
        entryId: 'en-3', kind: 'PHOTO', occurredAt: todayAt(9, 10),
        text: '403호 환자 드레싱 교체 필요, 상처 부위 삼출물 관찰돼서 담당의 확인 요청 예정',
        photoUri: 'https://placehold.co/600x400/2a1a2e/eee?text=Wound',
    },
    {
        entryId: 'en-4', kind: 'ROUNDING', occurredAt: todayAt(9, 12),
        text: '환자분 어제 밤은 좀 어떠셨어요?',
        audioFileId: 'audio-1',
        patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
    },
    {
        entryId: 'en-5', kind: 'ROUNDING', occurredAt: todayAt(9, 14),
        text: '잠은 잘 들었는데, 상처 난 곳이 욱신거려서 새벽에 한 번 깼어요.',
        audioFileId: 'audio-1',
        patientId: null,
        needsReview: true,
    },
    {
        entryId: 'en-6', kind: 'ROUNDING', occurredAt: todayAt(9, 14),
        text: '통증 점수로 하면 어느 정도 되세요?',
        audioFileId: 'audio-1',
        patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
    },
    {
        entryId: 'en-7', kind: 'ROUNDING', occurredAt: todayAt(9, 14),
        text: '한 4점 정도 되는 것 같아요.',
        audioFileId: 'audio-1',
        patientId: null,
        needsReview: true,
    },
    {
        entryId: 'en-8', kind: 'ROUNDING', occurredAt: todayAt(9, 15),
        text: '상처 부위 확인하겠습니다.',
        audioFileId: 'audio-1',
        patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
    },
    {
        entryId: 'en-9', kind: 'MEMO', occurredAt: todayAt(9, 22),
        text: '보호자 오후 방문 예정, 퇴원 일정 문의 있었음',
        patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
    },
];

export function fetchRoundingRecords() {
    if (USE_MOCK) {
        return Promise.resolve({
            date: new Date().toISOString().slice(0, 10),
            items: MOCK_RECORDS,
        });
    }
    return apiGet<{ date: string; items: ApiRoundingRecord[] }>('/rounding-records');
}

export function fetchRecordEntries() {
    if (USE_MOCK) return Promise.resolve(MOCK_ENTRIES);
    return Promise.resolve([]);
}

export function fetchAnalysisJob(jobId: string) {
    return apiGet<ApiAnalysisJob>(`/rounding-analysis-jobs/${jobId}`);
}

export function timeOf(iso: string) {
    return new Date(iso).toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

export function dateTitleOf(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}