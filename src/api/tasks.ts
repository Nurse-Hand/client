import { apiGet, apiPost, apiPatch, newIdempotencyKey } from './client';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL';
export type TaskSource = 'MANUAL' | 'AI_EXTRACTED';
export type AiConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TaskAiSuggestion {
    suggestedPriority: TaskPriority;
    reasons: string[];
    confidence: AiConfidence;
}

export interface ApiTask {
    taskId: string;
    patientId: string | null;
    title: string;
    description: string | null;
    dueAt: string | null;
    workDate: string;
    status: TaskStatus;
    source: TaskSource;
    aiSuggestion: TaskAiSuggestion | null;
    rulePriority: TaskPriority;
    confirmedPriority: TaskPriority | null;
    effectivePriority: TaskPriority;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface TaskListData {
    items: ApiTask[];
    nextCursor: string | null;
}

export function fetchTasks(date: string, status?: TaskStatus) {
    const q = new URLSearchParams({ date, sort: 'priority', limit: '50' });
    if (status) q.append('status', status);
    return apiGet<TaskListData>(`/tasks?${q.toString()}`);
}

export function createTask(body: {
    patientId?: string | null;
    title: string;
    description?: string | null;
    dueAt: string;
    priorityOverride?: TaskPriority | null;
}) {
    return apiPost<ApiTask>('/tasks', body, newIdempotencyKey());
}

export function updateTask(
    taskId: string,
    body: {
        version: number;
        title?: string;
        description?: string | null;
        dueAt?: string | null;
        status?: TaskStatus;
        priorityOverride?: TaskPriority | null;
    },
) {
    return apiPatch<ApiTask>(`/tasks/${taskId}`, body);
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
    CRITICAL: '높음',
    HIGH: '보통',
    NORMAL: '낮음',
};

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
    CRITICAL: '#FF4D6D',
    HIGH: '#FFB020',
    NORMAL: '#C9CDD8',
};

export type DueKind = 'NOW' | 'SHIFT' | 'HANDOFF';

export const DUE_LABEL: Record<DueKind, string> = {
    NOW: '즉시',
    SHIFT: '이번 근무 내',
    HANDOFF: '인계 가능',
};

const SHIFT_ENDS = [7, 15, 23];

function nextShiftEnd(from: Date) {
    const d = new Date(from);
    for (const h of SHIFT_ENDS) {
        if (from.getHours() < h) {
            d.setHours(h, 0, 0, 0);
            return d;
        }
    }
    d.setDate(d.getDate() + 1);
    d.setHours(SHIFT_ENDS[0], 0, 0, 0);
    return d;
}

export function dueAtFrom(kind: DueKind) {
    const now = new Date();
    if (kind === 'NOW') {
        now.setHours(now.getHours() + 1);
        return now.toISOString();
    }
    const end = nextShiftEnd(now);
    if (kind === 'HANDOFF') end.setHours(end.getHours() + 8);
    return end.toISOString();
}

export function dueTextOf(dueAt: string | null) {
    if (!dueAt) return null;
    const diff = new Date(dueAt).getTime() - Date.now();
    if (diff <= 0) return '기한 지남';
    const hours = Math.ceil(diff / 3600000);
    if (hours <= 1) return '1시간 내';
    if (hours < 24) return `${hours}시간 내`;
    return `${Math.ceil(hours / 24)}일 내`;
}

export function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}