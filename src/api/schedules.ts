import { ApiError, apiGet, apiPut, newIdempotencyKey } from './client';
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

export function currentYearMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

export function nextDuty(duty: string): 'DAY' | 'EVENING' | 'NIGHT' {
    if (duty === 'DAY') return 'EVENING';
    if (duty === 'EVENING') return 'NIGHT';
    return 'DAY';
}

export async function ensureTodayShift() {
    const ym = currentYearMonth();
    const today = todayKey();

    try {
        const cur = await getMonthlySchedule(ym);
        const found = cur.entries?.find((e) => e.date === today);
        if (found?.shiftId) {
            return { shiftId: found.shiftId, duty: found.duty };
        }

        const entries = [
            ...(cur.entries ?? []).filter((e) => e.date !== today),
            { date: today, duty: 'DAY' as const },
        ];

        const saved = await putMonthlySchedule(
            ym,
            cur.version ?? 0,
            entries,
            newIdempotencyKey(),
        );

        const entry = saved.entries?.find((e) => e.date === today);
        console.log('근무표 저장 결과 shiftId:', entry?.shiftId);
        return entry?.shiftId ? { shiftId: entry.shiftId, duty: entry.duty } : null;
    } catch (e: any) {
        console.log('근무표 확보 실패:', e.code, e.message);
        return null;
    }
}
