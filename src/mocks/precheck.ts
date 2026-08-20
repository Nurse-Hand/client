import { PrecheckItem } from '../api/handOffChecks';

export const mockPrecheckItems: PrecheckItem[] = [
    {
        itemId: 'pc-1',
        patientId: '17830ce2-b050-4ba9-8625-ff5dbbe7e99d',
        severity: 'CRITICAL',
        question: '산소포화도 경과 확인 필요',
        reason: '최근 3교대 동안 SpO₂ 88% 이하 기록과 산소 적용 기록이 반복되었습니다.',
        evidence: [
            {
                sourceType: 'TIMELINE_EVENT', sourceId: 'e1', sourceReference: 'timeline:event:801',
                occurredAt: new Date(Date.now() - 34 * 3600000).toISOString(),
                excerptKind: 'SUMMARY', excerpt: 'SpO₂ 88%, 산소 2L 적용',
            },
            {
                sourceType: 'TIMELINE_EVENT', sourceId: 'e2', sourceReference: 'timeline:event:802',
                occurredAt: new Date(Date.now() - 24 * 3600000).toISOString(),
                excerptKind: 'SUMMARY', excerpt: 'SpO₂ 88%, 산소 적용 유지',
            },
            {
                sourceType: 'TIMELINE_EVENT', sourceId: 'e3', sourceReference: 'timeline:event:803',
                occurredAt: new Date(Date.now() - 4 * 3600000).toISOString(),
                excerptKind: 'SUMMARY', excerpt: 'SpO₂ 90% 전후 유지',
            },
        ],
        version: 1,
    },
    {
        itemId: 'pc-2',
        patientId: '7d8718ac-fa97-49ba-9c87-e5ea329f44ef',
        severity: 'RECOMMENDED',
        question: '통증 재사정 기록 누락',
        reason: '진통제 투여 후 재사정 기록이 확인되지 않았습니다.',
        evidence: [
            {
                sourceType: 'TIMELINE_EVENT', sourceId: 'e4', sourceReference: 'timeline:event:811',
                occurredAt: new Date(Date.now() - 6 * 3600000).toISOString(),
                excerptKind: 'SUMMARY', excerpt: '진통제 투여, NRS 5점',
            },
        ],
        version: 1,
    },
];