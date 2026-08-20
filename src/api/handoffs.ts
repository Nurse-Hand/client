import { apiGet, apiPost, apiPatch, newIdempotencyKey } from './client';

export type HandoffStatus = 'GENERATING' | 'DRAFT' | 'FINALIZED' | 'FAILED';

export type SectionKey =
    | 'vitalSigns' | 'respiration' | 'mentalStatus'
    | 'pain' | 'treatment' | 'diet' | 'observation';

export const SECTION_ORDER: SectionKey[] = [
    'vitalSigns', 'respiration', 'mentalStatus',
    'pain', 'treatment', 'diet', 'observation',
];

export const SECTION_LABEL: Record<SectionKey, string> = {
    vitalSigns: '활력징후',
    respiration: '호흡',
    mentalStatus: '의식상태',
    pain: '통증',
    treatment: '처치',
    diet: '식이',
    observation: '관찰사항',
};

export type SectionEnum =
    | 'VITAL_SIGNS' | 'RESPIRATION' | 'MENTAL_STATUS'
    | 'PAIN' | 'TREATMENT' | 'DIET' | 'OBSERVATION';

const SECTION_ENUM_TO_KEY: Record<SectionEnum, SectionKey> = {
    VITAL_SIGNS: 'vitalSigns',
    RESPIRATION: 'respiration',
    MENTAL_STATUS: 'mentalStatus',
    PAIN: 'pain',
    TREATMENT: 'treatment',
    DIET: 'diet',
    OBSERVATION: 'observation',
};

export interface HandoffCitation {
    sourceType: 'TIMELINE_EVENT' | 'TASK';
    sourceId: string;
    sourceReference: string;
    occurredAt: string | null;
    excerptKind: 'UTTERANCE' | 'SUMMARY' | 'TASK_TITLE';
    excerpt: string;
    section: SectionEnum;
    wasModified: boolean;
}

export interface HandoffPatient {
    patientId: string;
    sections: Partial<Record<SectionKey, string | null>>;
    aiOriginalSections: Partial<Record<SectionKey, string | null>>;
    citations: HandoffCitation[];
    unverified: boolean;
    summary?: string | null;
}

export interface HandoffTask {
    taskId: string;
    patientId: string;
    title: string;
    dueAt: string | null;
    effectivePriority: 'CRITICAL' | 'HIGH' | 'NORMAL';
    version: number;
}

export interface HandoffWarning {
    itemId: string;
    patientId?: string | null;
    severity: 'CRITICAL' | 'RECOMMENDED';
    answer: string;
    message: string;
    isIncludedInAiInput: boolean;
}

export interface HandoffDraft {
    handoffId: string;
    status: HandoffStatus;
    version: number;
    date: string;
    senderActorId: string;
    receiverActorId: string | null;
    generationJob: {
        jobId: string;
        status: string;
        failureCode: string | null;
        retryable: boolean;
    } | null;
    templateId: string;
    includeUnverified: boolean;
    patients: HandoffPatient[];
    tasks: HandoffTask[];
    warnings: HandoffWarning[];
    updatedAt: string;
}

const USE_MOCK = true;

export function citationsOf(patient: HandoffPatient, key: SectionKey) {
    return patient.citations.filter((c) => SECTION_ENUM_TO_KEY[c.section] === key);
}

export function summaryOf(patient: HandoffPatient, warnings: HandoffWarning[]) {
    if (patient.summary) return patient.summary;

    const w = warnings.find((x) => x.patientId === patient.patientId);
    if (w) return w.message;

    const filled = SECTION_ORDER.find((k) => patient.sections[k]);
    return filled ? patient.sections[filled]! : '작성된 내용이 없습니다';
}

export function filledSectionsOf(patient: HandoffPatient) {
    return SECTION_ORDER.filter((k) => patient.sections[k]);
}

function cite(
    section: SectionEnum,
    excerpt: string,
    hoursAgo: number,
): HandoffCitation {
    const d = new Date();
    d.setHours(d.getHours() - hoursAgo);
    return {
        sourceType: 'TIMELINE_EVENT',
        sourceId: `src-${section}-${hoursAgo}`,
        sourceReference: `timeline:event:${900 + hoursAgo}`,
        occurredAt: d.toISOString(),
        excerptKind: 'UTTERANCE',
        excerpt,
        section,
        wasModified: false,
    };
}

const MOCK_DRAFT: HandoffDraft = {
    handoffId: 'ho-1',
    status: 'DRAFT',
    version: 1,
    date: new Date().toISOString().slice(0, 10),
    senderActorId: 'actor-1',
    receiverActorId: null,
    generationJob: null,
    templateId: 'NURSING_HANDOFF_V1',
    includeUnverified: true,
    patients: [
        {
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            summary: '산소포화도 모니터링 필요',
            sections: {
                vitalSigns: '혈압 118/76, 맥박 82회로 안정적',
                respiration: 'SpO₂ 88→90% 변동, 산소 2L 유지 중',
                mentalStatus: '명료, 지남력 정상',
                treatment: '산소 2L 적용 유지',
                diet: '식사량 절반 섭취, 연하곤란 없음',
                observation: '야간 기침 잦아짐, 수면 방해 호소',
            },
            aiOriginalSections: {},
            citations: [
                cite('RESPIRATION', '어제 밤에 기침이 계속 나와서 힘들었어요', 20),
                cite('RESPIRATION', 'SpO₂ 88%, 산소 2L 적용', 26),
                cite('VITAL_SIGNS', '혈압 118에 76, 맥박 66', 5),
                cite('OBSERVATION', '밤새 기침 때문에 잠도 잘 못 주무셨어요', 20),
                cite('DIET', '식사는 반 정도 드셨어요', 4),
            ],
            unverified: false,
        },
        {
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            summary: '의사 보고 결과 확인 필요',
            sections: {
                pain: '통증 NRS 5→3점으로 감소, 진통제 투여 후 안정',
                treatment: '진통제 투여, 수술 부위 드레싱 유지',
                observation: '보행 훈련 시행, 이동거리 약 50m',
            },
            aiOriginalSections: {},
            citations: [
                cite('PAIN', '체위 변경 시 우측 고관절이 욱신거려요', 7),
                cite('PAIN', '한 4점 정도 되는 것 같아요', 7),
                cite('TREATMENT', '진통제 투여했습니다', 6),
            ],
            unverified: false,
        },
        {
            patientId: 'c3a1f5e2-1111-4aaa-9bbb-000000000005',
            summary: 'CT 결과 확인 후 인계',
            sections: {
                vitalSigns: '활력징후 안정적',
                observation: 'CT 결과 대기 중, 확인 후 담당의 보고 필요',
            },
            aiOriginalSections: {},
            citations: [cite('OBSERVATION', 'CT 결과 아직 안 나왔습니다', 3)],
            unverified: true,
        },
    ],
    tasks: [
        {
            taskId: 'ht-1',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            title: '산소포화도 재측정',
            dueAt: new Date(Date.now() + 3600000).toISOString(),
            effectivePriority: 'CRITICAL',
            version: 1,
        },
        {
            taskId: 'ht-2',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            title: '통증 재사정',
            dueAt: new Date(Date.now() + 3 * 3600000).toISOString(),
            effectivePriority: 'HIGH',
            version: 1,
        },
        {
            taskId: 'ht-3',
            patientId: 'c3a1f5e2-1111-4aaa-9bbb-000000000005',
            title: 'CT 결과 확인 후 담당의 보고',
            dueAt: new Date(Date.now() + 5 * 3600000).toISOString(),
            effectivePriority: 'HIGH',
            version: 1,
        },
        {
            taskId: 'ht-4',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            title: '드레싱 교체',
            dueAt: new Date(Date.now() + 8 * 3600000).toISOString(),
            effectivePriority: 'NORMAL',
            version: 1,
        },
    ],
    warnings: [
        {
            itemId: 'pc-1',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            severity: 'CRITICAL',
            answer: 'INCLUDE_HANDOFF',
            message: '산소포화도 모니터링 필요',
            isIncludedInAiInput: true,
        },
    ],
    updatedAt: new Date().toISOString(),
};

export function createHandoff(body: { date: string; precheckId?: string }) {
    if (USE_MOCK) return Promise.resolve(MOCK_DRAFT);
    return apiPost<HandoffDraft>('/handoffs', body, newIdempotencyKey());
}

export function fetchHandoff(handoffId: string) {
    if (USE_MOCK) return Promise.resolve(MOCK_DRAFT);
    return apiGet<HandoffDraft>(`/handoffs/${handoffId}`);
}

export function updateHandoff(
    handoffId: string,
    body: { version: number; patients?: unknown[]; taskIds?: string[] },
) {
    if (USE_MOCK) return Promise.resolve(MOCK_DRAFT);
    return apiPatch<HandoffDraft>(`/handoffs/${handoffId}`, body);
}

export function finalizeHandoff(handoffId: string, version: number) {
    if (USE_MOCK) return Promise.resolve({ ...MOCK_DRAFT, status: 'FINALIZED' as const });
    return apiPost<HandoffDraft>(`/handoffs/${handoffId}/finalize`, { version });
}

export function citationTime(iso: string | null) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === y.toDateString();

    const time = d.toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit', hour12: true,
    });

    if (isToday) return `오늘 ${time}`;
    if (isYesterday) return `어제 ${time}`;
    return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}