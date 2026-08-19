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