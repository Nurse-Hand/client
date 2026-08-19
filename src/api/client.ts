//임시
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
console.log('BASE_URL:', BASE_URL);

//const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) {
        super(message);
    }
}

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

let demoSessionId: string | null = null;

export function setDemoSession(id: string) {
    demoSessionId = id;
}

function baseHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'X-Request-Id': uuid() };
    if (demoSessionId) h['X-Demo-Session-Id'] = demoSessionId;
    return h;
}

async function handle<T>(res: Response): Promise<T> {
    const text = await res.text();
    let body: any = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        throw new ApiError('INVALID_RESPONSE', text.slice(0, 200), res.status);
    }

    if (!res.ok) {
        const err = body?.error;
        throw new ApiError(err?.code ?? 'UNKNOWN', err?.message ?? '요청에 실패했어요', res.status);
    }
    return body?.data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, { headers: baseHeaders() });
    return handle<T>(res);
}

export async function apiPost<T>(
    path: string,
    body?: unknown,
    idempotencyKey?: string,
): Promise<T> {
    const headers: Record<string, string> = {
        ...baseHeaders(),
        'Content-Type': 'application/json',
    };
    if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;

    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    return handle<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'PATCH',
        headers: { ...baseHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return handle<T>(res);
}

export async function apiUpload<T>(path: string, fileUri: string, mimeType: string, name: string): Promise<T> {
    const form = new FormData();
    form.append('file', { uri: fileUri, type: mimeType, name } as any);

    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: baseHeaders(),
        body: form,
    });
    return handle<T>(res);
}

export function newIdempotencyKey() {
    return uuid();
}