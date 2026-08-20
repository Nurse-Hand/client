import type {
    CalendarImportCandidate,
    ScheduleDuty,
    ScheduleEntry,
} from '../../types/schedules';

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DUTY_BY_ALIAS: Readonly<Record<string, ScheduleDuty>> = {
    D: 'DAY',
    DAY: 'DAY',
    'DAY SHIFT': 'DAY',
    데이: 'DAY',
    주간: 'DAY',
    E: 'EVENING',
    EVENING: 'EVENING',
    'EVENING SHIFT': 'EVENING',
    이브닝: 'EVENING',
    초번: 'EVENING',
    N: 'NIGHT',
    NIGHT: 'NIGHT',
    'NIGHT SHIFT': 'NIGHT',
    나이트: 'NIGHT',
    야간: 'NIGHT',
    OFF: 'OFF',
    오프: 'OFF',
    휴무: 'OFF',
};

export interface CalendarEventForImport {
    title: string;
    startDate: Date | string;
}

export function normalizeCalendarTitle(title: string): string {
    return title.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
}

export function dutyFromCalendarTitle(title: string): ScheduleDuty | null {
    return DUTY_BY_ALIAS[normalizeCalendarTitle(title)] ?? null;
}

export function seoulDateKey(value: Date | string): string | null {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Date(date.getTime() + SEOUL_OFFSET_MS).toISOString().slice(0, 10);
}

export function calendarFetchRange(yearMonth: string): { startDate: Date; endDate: Date } {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(yearMonth);
    if (!match) throw new Error('올바른 YYYY-MM 형식이 필요합니다.');

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const monthStartUtc = Date.UTC(year, monthIndex, 1) - SEOUL_OFFSET_MS;
    const nextMonthStartUtc = Date.UTC(year, monthIndex + 1, 1) - SEOUL_OFFSET_MS;

    return {
        startDate: new Date(monthStartUtc - ONE_DAY_MS),
        endDate: new Date(nextMonthStartUtc + ONE_DAY_MS),
    };
}

export function buildCalendarCandidates(
    events: CalendarEventForImport[],
    yearMonth: string,
): CalendarImportCandidate[] {
    const byDate = new Map<string, { duties: Set<ScheduleDuty>; hasUnknown: boolean }>();

    for (const event of events) {
        const date = seoulDateKey(event.startDate);
        if (!date || !date.startsWith(`${yearMonth}-`)) continue;

        const current = byDate.get(date) ?? { duties: new Set<ScheduleDuty>(), hasUnknown: false };
        const duty = dutyFromCalendarTitle(event.title);
        if (duty) current.duties.add(duty);
        else current.hasUnknown = true;
        byDate.set(date, current);
    }

    return [...byDate.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, value]) => {
            const duties = [...value.duties];
            if (duties.length > 1) {
                return { date, status: 'CONFLICT', suggestedDuty: null };
            }
            if (value.hasUnknown || duties.length === 0) {
                return {
                    date,
                    status: 'UNKNOWN',
                    suggestedDuty: duties[0] ?? null,
                };
            }
            return { date, status: 'MATCHED', suggestedDuty: duties[0] };
        });
}

export function mergeScheduleEntries(
    existing: ScheduleEntry[],
    imported: ScheduleEntry[],
): ScheduleEntry[] {
    const merged = new Map(existing.map((entry) => [entry.date, entry.duty]));
    for (const entry of imported) merged.set(entry.date, entry.duty);

    return [...merged.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, duty]) => ({ date, duty }));
}

export function scheduleSaveSignature(
    yearMonth: string,
    expectedVersion: number,
    entries: ScheduleEntry[],
): string {
    return JSON.stringify({
        yearMonth,
        expectedVersion,
        entries: [...entries].sort((left, right) => left.date.localeCompare(right.date)),
    });
}
