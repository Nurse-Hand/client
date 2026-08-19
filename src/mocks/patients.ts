import { Patient, PatientDetail, DaySummary } from '../types';

export const patients: Patient[] = [
    {
        id: 'p1', room: '301', bedNo: '1', name: '환자 A',
        department: '정형외과', admissionDay: 10,
        condition: '우측 대퇴골 골절', flags: ['CAUTION'],
    },
    {
        id: 'p2', room: '302', bedNo: '1', name: '환자 B',
        department: '호흡기내과', admissionDay: 12,
        condition: '폐렴, 산소 치료 중', flags: [],
    },
    {
        id: 'p3', room: '302', bedNo: '4', name: '환자 C',
        department: '순환기내과', admissionDay: 4,
        condition: '심부전, 호흡곤란', flags: ['CAUTION'],
    },
    {
        id: 'p4', room: '303', bedNo: '2', name: '환자 D',
        department: '신경과', admissionDay: 1,
        condition: '뇌경색 의심, 경과 관찰', flags: ['NEW'],
    },
    {
        id: 'p5', room: '303', bedNo: '3', name: '환자 E',
        department: '내분비내과', admissionDay: 6,
        condition: '당뇨 조절 중', flags: [],
    },
    {
        id: 'p6', room: '304', bedNo: '1', name: '환자 F',
        department: '정형외과', admissionDay: 15,
        condition: '슬관절 치환술 후 재활', flags: ['DISCHARGE_SOON'],
    },
    {
        id: 'p7', room: '304', bedNo: '2', name: '환자 G',
        department: '소화기내과', admissionDay: 2,
        condition: '급성 위장염', flags: ['NEW', 'CAUTION'],
    },
    {
        id: 'p8', room: '305', bedNo: '1', name: '환자 H',
        department: '호흡기내과', admissionDay: 3,
        condition: 'COPD 급성 악화', flags: ['NEW', 'CAUTION'],
    },
];

export const patientDetails: Record<string, PatientDetail> = {
    p1: {
        ...patients[0],
        patientNo: 'P-301-01',
        admittedAt: '2026.07.30',
        baseInfo: '우측 대퇴골 골절 수술 후 통증 조절 및 보행 재활 중',
    },
};

export const daySummary: DaySummary = {
    date: '2026-08-09',
    aiSummary: [
        '오늘 환자는 진통제 투여 후 통증이 감소하였고,',
        '보행 훈련을 안정적으로 수행했습니다.',
        '수술 부위 이상 소견은 관찰되지 않았습니다.',
    ],
    events: [
        { id: 'e1', kind: 'HANDOFF', title: '야간 인계', time: '08:30', lines: ['수술 부위 드레싱 유지, 특이사항 없음'] },
        { id: 'e2', kind: 'EVENT', title: '오전 라운딩', time: '09:15', lines: ['보행기 사용 가능, 수술 부위 출혈 없음'] },
        { id: 'e3', kind: 'EVENT', title: '환자 호소', time: '10:40', lines: ['체위 변경 시 우측 고관절 통증 호소', '통증 NRS 5점'] },
        { id: 'e4', kind: 'EVENT', title: '처치', time: '11:20', lines: ['진통제 투여'] },
        { id: 'e5', kind: 'EVENT', title: '재활 치료', time: '13:30', lines: ['보행 훈련 시행, 어지럼증 없음', '이동거리 약 50m'] },
        { id: 'e6', kind: 'HANDOFF', title: '주간 인계', time: '15:02', lines: ['통증 NRS 5→3으로 감소', '재활치료 진행 중, 보행기 사용 가능'] },
        {
            id: 'e7', kind: 'HANDOFF', title: '저녁 인계', time: '18:10',
            lines: ['활력징후 안정적', '수술 부위 이상 소견 없음'],
            alert: '지속적인 통증 모니터링 필요',
        },
    ],
};

export const weekDays = [
    { label: '일', date: 7 },
    { label: '월', date: 8 },
    { label: '화', date: 9 },
    { label: '수', date: 10 },
    { label: '목', date: 11 },
    { label: '금', date: 12 },
    { label: '토', date: 13 },
];