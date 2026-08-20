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
    | 'OBSERVATION'
    | 'MEDICATION'
    | 'PROCEDURE'
    | 'REPORT'
    | 'TASK';

export type TimelineClinicalCategory =
    | 'VITAL_SIGNS'
    | 'RESPIRATION'
    | 'MENTAL_STATUS'
    | 'PAIN'
    | 'TREATMENT'
    | 'DIET'
    | 'OBSERVATION';

export interface ApiTimelineEvent {
    timelineEventId: string;
    patientId: string;
    occurredAt: string;
    type: TimelineEventType;
    clinicalCategory?: TimelineClinicalCategory | null;
    source: 'MANUAL' | 'AI_AUDIO';
    summary: string;
    version: number;
    sourceReference: string;
}

// 시연 영상에서는 서버 데이터 편차와 미배포 상태에 영향받지 않도록 mock을 고정한다.
const USE_MOCK = true;

function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
}

function todayAt(hour: number, minute = 0) {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

const MOCK_PATIENTS: ApiPatient[] = [
    {
        patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
        displayName: '환자 A',
        roomLabel: '301호 1번 침상',
        statusLabel: '주의',
        department: '정형외과',
        admittedAt: daysAgo(10),
        baselineSummary: '우측 대퇴골 골절 수술 후 통증 조절 및 보행 재활 중',
        createdAt: daysAgo(10),
    },
    {
        patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
        displayName: '환자 B',
        roomLabel: '405호 2번 침상',
        statusLabel: '안정',
        department: '호흡기내과',
        admittedAt: daysAgo(12),
        baselineSummary: '폐렴 치료 후 산소포화도와 호흡곤란 여부 관찰 중',
        createdAt: daysAgo(12),
    },
    {
        patientId: 'c3a1f5e2-1111-4aaa-9bbb-000000000003',
        displayName: '환자 C',
        roomLabel: '212호',
        statusLabel: '신규',
        department: '소화기내과',
        admittedAt: daysAgo(0),
        baselineSummary: 'CT 결과상 큰 이상 없어 담당의 설명 후 퇴원 가능성 검토 중',
        createdAt: daysAgo(0),
    },
];

const MOCK_TIMELINE: Record<string, ApiTimelineEvent[]> = {
    '17830ce2-b050-4ba9-8625-ff5dbbe7e99d': [
        {
            timelineEventId: 'tl-a-1',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(8, 30),
            type: 'OBSERVATION',
            clinicalCategory: 'VITAL_SIGNS',
            source: 'AI_AUDIO',
            summary: '활력징후 안정적, 체온 36.7℃',
            version: 1,
            sourceReference: 'timeline:event:801',
        },
        {
            timelineEventId: 'tl-a-2',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(9, 15),
            type: 'OBSERVATION',
            clinicalCategory: 'OBSERVATION',
            source: 'MANUAL',
            summary: '수술 부위 드레싱 유지, 출혈 없음',
            version: 1,
            sourceReference: 'timeline:event:802',
        },
        {
            timelineEventId: 'tl-a-3',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(10, 40),
            type: 'OBSERVATION',
            clinicalCategory: 'PAIN',
            source: 'MANUAL',
            summary: '체위 변경 시 우측 고관절 통증 호소, NRS 5점',
            version: 1,
            sourceReference: 'timeline:event:803',
        },
        {
            timelineEventId: 'tl-a-4',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(11, 20),
            type: 'OBSERVATION',
            clinicalCategory: 'TREATMENT',
            source: 'MANUAL',
            summary: '진통제 투여',
            version: 1,
            sourceReference: 'timeline:event:804',
        },
        {
            timelineEventId: 'tl-a-5',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(12, 20),
            type: 'OBSERVATION',
            clinicalCategory: 'DIET',
            source: 'AI_AUDIO',
            summary: '점심 식사량 80%, 오심 없음',
            version: 1,
            sourceReference: 'timeline:event:805',
        },
        {
            timelineEventId: 'tl-a-6',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(14, 10),
            type: 'OBSERVATION',
            clinicalCategory: 'MENTAL_STATUS',
            source: 'AI_AUDIO',
            summary: '의식 명료하고 시간·장소·사람 지남력 유지',
            version: 1,
            sourceReference: 'timeline:event:806',
        },
    ],
    '7d8718ac-fa97-49ba-9c87-e5ea329f44ef': [
        {
            timelineEventId: 'tl-b-1',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: todayAt(8, 20),
            type: 'OBSERVATION',
            clinicalCategory: 'VITAL_SIGNS',
            source: 'MANUAL',
            summary: '체온 37.1℃, 맥박 82회, 혈압 안정적',
            version: 1,
            sourceReference: 'timeline:event:811',
        },
        {
            timelineEventId: 'tl-b-2',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: todayAt(9, 40),
            type: 'OBSERVATION',
            clinicalCategory: 'RESPIRATION',
            source: 'AI_AUDIO',
            summary: 'SpO₂ 94%, 산소 2L 적용 중 호흡곤란 없음',
            version: 1,
            sourceReference: 'timeline:event:812',
        },
        {
            timelineEventId: 'tl-b-3',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: todayAt(10, 30),
            type: 'OBSERVATION',
            clinicalCategory: 'TREATMENT',
            source: 'MANUAL',
            summary: '네뷸라이저 치료 시행, 이상 반응 없음',
            version: 1,
            sourceReference: 'timeline:event:813',
        },
        {
            timelineEventId: 'tl-b-4',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: todayAt(12, 5),
            type: 'OBSERVATION',
            clinicalCategory: 'DIET',
            source: 'MANUAL',
            summary: '식사량 절반 섭취, 연하곤란 없음',
            version: 1,
            sourceReference: 'timeline:event:814',
        },
        {
            timelineEventId: 'tl-b-5',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: todayAt(14, 20),
            type: 'OBSERVATION',
            clinicalCategory: 'OBSERVATION',
            source: 'AI_AUDIO',
            summary: '야간 기침 증상 잦아짐, 수면 방해 호소',
            version: 1,
            sourceReference: 'timeline:event:815',
        },
        {
            timelineEventId: 'tl-b-6',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: todayAt(15, 10),
            type: 'OBSERVATION',
            clinicalCategory: 'MENTAL_STATUS',
            source: 'MANUAL',
            summary: '의식 명료, 호흡 불편에 대한 불안 감소함',
            version: 1,
            sourceReference: 'timeline:event:816',
        },
    ],
};

export function fetchPatients() {
    if (USE_MOCK) return Promise.resolve({ items: MOCK_PATIENTS });
    return apiGet<{ items: ApiPatient[] }>('/patients');
}

export function fetchPatient(patientId: string) {
    if (USE_MOCK) {
        const found = MOCK_PATIENTS.find((patient) => patient.patientId === patientId);
        if (!found) return Promise.reject(new Error('환자를 찾을 수 없어요'));
        return Promise.resolve(found);
    }
    return apiGet<ApiPatient>(`/patients/${patientId}`);
}

export function fetchPatientTimeline(patientId: string) {
    if (USE_MOCK) {
        return Promise.resolve({ items: MOCK_TIMELINE[patientId] ?? [] });
    }
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
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}
