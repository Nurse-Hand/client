export type ScheduleDuty = 'DAY' | 'EVENING' | 'NIGHT' | 'OFF';

export interface ScheduleEntry {
    date: string;
    duty: ScheduleDuty;
    shiftId?: string | null;
}

export interface MonthlySchedule {
    yearMonth: string;
    version: number;
    entries: ScheduleEntry[];
    totals: Record<ScheduleDuty, number>;
}

export type CalendarImportStatus = 'MATCHED' | 'UNKNOWN' | 'CONFLICT';
export type CalendarCandidateDecision = ScheduleDuty | 'EXCLUDED';

export interface CalendarImportCandidate {
    date: string;
    status: CalendarImportStatus;
    suggestedDuty: ScheduleDuty | null;
}
