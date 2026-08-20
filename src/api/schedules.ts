import { ApiError, apiGet, apiPut } from './client';
import type { MonthlySchedule, ScheduleEntry } from '../types/schedules';

function emptySchedule(yearMonth: string): MonthlySchedule {
    return {
        yearMonth,
        version: 0,
        entries: [],
        totals: { DAY: 0, EVENING: 0, NIGHT: 0, OFF: 0 },
    };
}

export async function getMonthlySchedule(yearMonth: string): Promise<MonthlySchedule> {
    try {
        return await apiGet<MonthlySchedule>(`/me/schedules/${yearMonth}`);
    } catch (error) {
        if (error instanceof ApiError && error.code === 'MONTHLY_SCHEDULE_NOT_FOUND') {
            return emptySchedule(yearMonth);
        }
        throw error;
    }
}

export function putMonthlySchedule(
    yearMonth: string,
    expectedVersion: number,
    entries: ScheduleEntry[],
    idempotencyKey: string,
): Promise<MonthlySchedule> {
    return apiPut<MonthlySchedule>(
        `/me/schedules/${yearMonth}`,
        { expectedVersion, entries },
        idempotencyKey,
    );
}
