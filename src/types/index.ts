export type TabKey = 'home' | 'patient' | 'task' | 'handoff' | 'my';

export type ShiftType = 'DAY' | 'EVENING' | 'NIGHT';

export type SessionStatus =
    | 'RECORDING'
    | 'UPLOADED'
    | 'ANALYZING'
    | 'REVIEWING'
    | 'COMPLETED'
    | 'FAILED';

export type HandoffSection =
    | 'PATIENT_STATUS'
    | 'PAIN'
    | 'TREATMENT'
    | 'DIET'
    | 'ACTIVITY'
    | 'OBSERVATION';

export const HANDOFF_SECTION_LABEL: Record<HandoffSection, string> = {
    PATIENT_STATUS: '활력징후',
    PAIN: '통증',
    TREATMENT: '처치',
    DIET: '식이',
    ACTIVITY: '활동',
    OBSERVATION: '관찰사항',
};

export type QuickRecordType =
    | 'FALL'
    | 'EMERGENCY'
    | 'CALL_DOCTOR'
    | 'FAMILY_REQUEST'
    | 'TREATMENT_REQUEST'
    | 'ETC';

export const QUICK_RECORD_LABEL: Record<QuickRecordType, string> = {
    FALL: '낙상',
    EMERGENCY: '응급 상황',
    CALL_DOCTOR: '의사 호출',
    FAMILY_REQUEST: '보호자 요청',
    TREATMENT_REQUEST: '처치 요청',
    ETC: '기타',
};

export interface DutyInfo {
    shift: ShiftType;
    patientCount: number;
    ward: string;
}

export interface HomeSummary {
    nurseName: string;
    today: string;
    duty: DutyInfo;
    hasTranscript: boolean;
    summaryNeedsReview: boolean;
}

export type PatientFlag = 'CAUTION' | 'NEW' | 'DISCHARGE_SOON';

export const PATIENT_FLAG_LABEL: Record<PatientFlag, string> = {
    CAUTION: '주의',
    NEW: '신규',
    DISCHARGE_SOON: '퇴원 예정',
};

export interface Patient {
    id: string;
    room: string;
    bedNo: string;
    name: string;
    department: string;
    admissionDay: number;
    condition: string;
    flags: PatientFlag[];
}

export interface PatientDetail extends Patient {
    patientNo: string;
    admittedAt: string;
    baseInfo: string;
}

export type TimelineKind = 'HANDOFF' | 'EVENT';

export interface TimelineEvent {
    id: string;
    kind: TimelineKind;
    title: string;
    time: string;
    lines: string[];
    alert?: string;
}

export interface DaySummary {
    date: string;
    aiSummary: string[];
    events: TimelineEvent[];
}

export type HandoffSendStatus = 'NOT_SENT' | 'SENT';

export interface HandoffRecord {
    id: string;
    date: string;
    weekday: string;
    shift: ShiftType;
    receiverName: string | null;
    sendStatus: HandoffSendStatus;
    isToday: boolean;
}

export const SHIFT_LABEL: Record<ShiftType, string> = {
    DAY: 'Day',
    EVENING: 'Evening',
    NIGHT: 'Night',
};

export const SHIFT_EMOJI: Record<ShiftType, string> = {
    DAY: '☀️',
    EVENING: '🌇',
    NIGHT: '🌙',
};

export type PendingCheckKind = 'PATIENT_MATCH' | 'AI_GUESS';

export interface PendingCheck {
    kind: PendingCheckKind;
    label: string;
    count: number;
}