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
    | 'PATIENT_STATUS'
    | 'PAIN'
    | 'TREATMENT'
    | 'DIET'
    | 'ACTIVITY'
    | 'OBSERVATION';

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

// 서버 복구 시 false로 변경
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

function yesterdayAt(hour: number, minute = 0) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

const MOCK_PATIENTS: ApiPatient[] = [
    {
        patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
        displayName: '환자 A',
        roomLabel: '403호 1번 침상',
        statusLabel: '주의',
        department: '정형외과',
        admittedAt: daysAgo(10),
        baselineSummary: '우측 대퇴골 골절 수술 후 통증 조절 및 보행 재활 중',
        createdAt: daysAgo(10),
    },
    {
        patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
        displayName: '환자 B',
        roomLabel: '301호 1번 침상',
        statusLabel: null,
        department: '호흡기내과',
        admittedAt: daysAgo(12),
        baselineSummary: '폐렴, 산소 치료 중',
        createdAt: daysAgo(12),
    },
    {
        patientId: 'c3a1f5e2-1111-4aaa-9bbb-000000000003',
        displayName: '환자 C',
        roomLabel: '201호 3번 침상',
        statusLabel: '주의',
        department: '순환기내과',
        admittedAt: daysAgo(4),
        baselineSummary: '심부전, 호흡곤란 관찰 중',
        createdAt: daysAgo(4),
    },
    {
        patientId: 'c3a1f5e2-1111-4aaa-9bbb-000000000004',
        displayName: '환자 D',
        roomLabel: '201호 4번 침상',
        statusLabel: '신규',
        department: '신경과',
        admittedAt: daysAgo(1),
        baselineSummary: '뇌경색 의심, 경과 관찰 중',
        createdAt: daysAgo(1),
    },
    {
        patientId: 'c3a1f5e2-1111-4aaa-9bbb-000000000005',
        displayName: '환자 E',
        roomLabel: '308호 2번 침상',
        statusLabel: null,
        department: '소화기내과',
        admittedAt: daysAgo(6),
        baselineSummary: 'CT 결과 확인 대기 중',
        createdAt: daysAgo(6),
    },
    {
        patientId: 'c3a1f5e2-1111-4aaa-9bbb-000000000006',
        displayName: '환자 F',
        roomLabel: '406호 2번 침상',
        statusLabel: '퇴원 예정',
        department: '정형외과',
        admittedAt: daysAgo(15),
        baselineSummary: '슬관절 치환술 후 재활, PCA 적용 중',
        createdAt: daysAgo(15),
    },
];

const MOCK_TIMELINE: Record<string, ApiTimelineEvent[]> = {
    '17830ce2-b050-4ba9-8625-ff5dbbe7e99d': [
        {
            timelineEventId: 'tl-a-1',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(8, 30),
            type: 'PATIENT_STATUS',
            source: 'AI_EXTRACTED',
            summary: '수술 부위 드레싱 유지, 특이사항 없음',
            version: 1,
            sourceReference: 'timeline:event:801',
        },
        {
            timelineEventId: 'tl-a-2',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(9, 15),
            type: 'ACTIVITY',
            source: 'MANUAL',
            summary: '보행기 사용 가능, 수술 부위 출혈 없음',
            version: 1,
            sourceReference: 'timeline:event:802',
        },
        {
            timelineEventId: 'tl-a-3',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(10, 40),
            type: 'PAIN',
            source: 'MANUAL',
            summary: '체위 변경 시 우측 고관절 통증 호소, NRS 5점',
            version: 1,
            sourceReference: 'timeline:event:803',
        },
        {
            timelineEventId: 'tl-a-4',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(11, 20),
            type: 'TREATMENT',
            source: 'MANUAL',
            summary: '진통제 투여',
            version: 1,
            sourceReference: 'timeline:event:804',
        },
        {
            timelineEventId: 'tl-a-5',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(13, 30),
            type: 'ACTIVITY',
            source: 'AI_EXTRACTED',
            summary: '보행 훈련 시행, 어지럼증 없음. 이동거리 약 50m',
            version: 1,
            sourceReference: 'timeline:event:805',
        },
        {
            timelineEventId: 'tl-a-6',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: todayAt(15, 2),
            type: 'OBSERVATION',
            source: 'AI_EXTRACTED',
            summary: '통증 NRS 5→3으로 감소, 재활치료 진행 중',
            version: 1,
            sourceReference: 'timeline:event:806',
        },
        {
            timelineEventId: 'tl-a-7',
            patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
            occurredAt: yesterdayAt(18, 10),
            type: 'PATIENT_STATUS',
            source: 'AI_EXTRACTED',
            summary: '활력징후 안정적, 수술 부위 이상 소견 없음',
            version: 1,
            sourceReference: 'timeline:event:807',
        },
    ],
    '7d8718ac-fa97-49ba-9c87-e5ea329f44ef': [
        {
            timelineEventId: 'tl-b-1',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: yesterdayAt(11, 25),
            type: 'PATIENT_STATUS',
            source: 'MANUAL',
            summary: 'SpO₂ 88%, 산소 2L 적용',
            version: 1,
            sourceReference: 'timeline:event:811',
        },
        {
            timelineEventId: 'tl-b-2',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: yesterdayAt(21, 11),
            type: 'PATIENT_STATUS',
            source: 'MANUAL',
            summary: 'SpO₂ 88%, 산소 적용 유지',
            version: 1,
            sourceReference: 'timeline:event:812',
        },
        {
            timelineEventId: 'tl-b-3',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: todayAt(9, 40),
            type: 'PATIENT_STATUS',
            source: 'AI_EXTRACTED',
            summary: 'SpO₂ 90% 전후 유지',
            version: 1,
            sourceReference: 'timeline:event:813',
        },
        {
            timelineEventId: 'tl-b-4',
            patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
            occurredAt: todayAt(12, 5),
            type: 'DIET',
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
            source: 'AI_EXTRACTED',
            summary: '야간 기침 증상 잦아짐, 수면 방해 호소',
            version: 1,
            sourceReference: 'timeline:event:815',
        },
    ],
    'c3a1f5e2-1111-4aaa-9bbb-000000000003': [
        {
            timelineEventId: 'tl-c-1',
            patientId: 'c3a1f5e2-1111-4aaa-9bbb-000000000003',
            occurredAt: todayAt(10, 15),
            type: 'PATIENT_STATUS',
            source: 'MANUAL',
            summary: '혈압 138/86, 맥박 92회',
            version: 1,
            sourceReference: 'timeline:event:821',
        },
        {
            timelineEventId: 'tl-c-2',
            patientId: 'c3a1f5e2-1111-4aaa-9bbb-000000000003',
            occurredAt: todayAt(16, 45),
            type: 'OBSERVATION',
            source: 'AI_EXTRACTED',
            summary: '보호자 문의 있었음, 퇴원 일정 안내',
            version: 1,
            sourceReference: 'timeline:event:822',
        },
    ],
};

export function fetchPatients() {
    if (USE_MOCK) return Promise.resolve({ items: MOCK_PATIENTS });
    return apiGet<{ items: ApiPatient[] }>('/patients');
}

export function fetchPatient(patientId: string) {
    if (USE_MOCK) {
        const found = MOCK_PATIENTS.find((p) => p.patientId === patientId);
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