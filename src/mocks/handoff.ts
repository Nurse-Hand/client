import { HandoffRecord, PendingCheck } from '../types';

export const hasIncomingHandoff = false;

export const pendingChecks: PendingCheck[] = [
    { kind: 'PATIENT_MATCH', label: '환자 미매칭 기록', count: 1 },
    { kind: 'AI_GUESS', label: 'AI 추정 기록', count: 2 },
];

export const handoffRecords: HandoffRecord[] = [
    {
        id: 'h1', date: '26.08.10', weekday: '수요일', shift: 'DAY',
        receiverName: null, sendStatus: 'NOT_SENT', isToday: true,
    },
    {
        id: 'h2', date: '26.08.09', weekday: '화요일', shift: 'EVENING',
        receiverName: '이멋쟁 간호사', sendStatus: 'SENT', isToday: false,
    },
    {
        id: 'h3', date: '26.08.07', weekday: '월요일', shift: 'NIGHT',
        receiverName: '박사자 간호사', sendStatus: 'SENT', isToday: false,
    },
];