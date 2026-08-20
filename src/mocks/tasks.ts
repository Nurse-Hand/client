import type { ApiTask } from '../api/tasks';

const HOUR_MS = 60 * 60 * 1000;

const PATIENT_A_ID = '17830ce2-b050-4ba9-8625-ff5dbbe7e99d';
const PATIENT_B_ID = '7d8718ac-fa97-49ba-9c87-e5ea329f44ef';
const PATIENT_C_ID = 'c3a1f5e2-1111-4aaa-9bbb-000000000003';

function localDateKey(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function dueAt(referenceTime: Date, hours: number) {
    return new Date(referenceTime.getTime() + hours * HOUR_MS).toISOString();
}

export function createMockTasks(referenceTime = new Date()): ApiTask[] {
    const now = referenceTime.toISOString();
    const workDate = localDateKey(referenceTime);

    return [
        {
            taskId: 'mock-1', patientId: PATIENT_A_ID, title: '통증 재사정 필요',
            description: null, dueAt: dueAt(referenceTime, 1),
            workDate, status: 'TODO', source: 'MANUAL',
            aiSuggestion: null, rulePriority: 'CRITICAL', confirmedPriority: null,
            effectivePriority: 'CRITICAL', version: 1,
            createdAt: now, updatedAt: now,
        },
        {
            taskId: 'mock-2', patientId: PATIENT_B_ID, title: '산소포화도 재측정',
            description: null, dueAt: dueAt(referenceTime, 3),
            workDate, status: 'DONE', source: 'AI_EXTRACTED',
            aiSuggestion: { suggestedPriority: 'HIGH', reasons: ['SpO₂ 변동 관찰 필요'], confidence: 'HIGH' },
            rulePriority: 'HIGH', confirmedPriority: null,
            effectivePriority: 'HIGH', version: 1,
            createdAt: now, updatedAt: now,
        },
        {
            taskId: 'mock-3', patientId: null, title: '처치실 소모품 수량 확인',
            description: null, dueAt: dueAt(referenceTime, 9),
            workDate, status: 'DONE', source: 'MANUAL',
            aiSuggestion: null, rulePriority: 'NORMAL', confirmedPriority: null,
            effectivePriority: 'NORMAL', version: 1,
            createdAt: now, updatedAt: now,
        },
        {
            taskId: 'mock-4', patientId: PATIENT_C_ID, title: 'CT 결과 설명 후 퇴원 여부 확인',
            description: null, dueAt: dueAt(referenceTime, 10),
            workDate, status: 'DONE', source: 'MANUAL',
            aiSuggestion: null, rulePriority: 'CRITICAL', confirmedPriority: null,
            effectivePriority: 'CRITICAL', version: 1,
            createdAt: now, updatedAt: now,
        },
        {
            taskId: 'mock-5', patientId: PATIENT_A_ID, title: '진통제 효과 재평가',
            description: null, dueAt: dueAt(referenceTime, 5),
            workDate, status: 'TODO', source: 'AI_EXTRACTED',
            aiSuggestion: { suggestedPriority: 'HIGH', reasons: ['투여 후 통증 재평가 필요'], confidence: 'HIGH' },
            rulePriority: 'HIGH', confirmedPriority: null,
            effectivePriority: 'HIGH', version: 1,
            createdAt: now, updatedAt: now,
        },
    ];
}
