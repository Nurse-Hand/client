import { HomeSummary } from '../types';

export const homeSummary: HomeSummary = {
    nurseName: '김멋사',
    today: '26년 8월 18일',
    duty: { shift: 'DAY', patientCount: 8, ward: '내과 병동' },
    hasTranscript: true,
    summaryNeedsReview: true,
};

export const SHIFT_LABEL = {
    DAY: 'Day Shift',
    EVENING: 'Evening Shift',
    NIGHT: 'Night Shift',
} as const;

export const SHIFT_EMOJI = {
    DAY: '☀️',
    EVENING: '🌇',
    NIGHT: '🌙',
} as const;