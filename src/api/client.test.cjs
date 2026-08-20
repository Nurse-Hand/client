const assert = require('node:assert/strict');
const test = require('node:test');

process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.invalid/api/v1';

const { ApiError, apiPut } = require('./client.ts');

test('PUT이 월별 근무표 body와 멱등성 header를 그대로 전송한다', async (context) => {
    const originalFetch = global.fetch;
    context.after(() => {
        global.fetch = originalFetch;
    });

    let request;
    global.fetch = async (url, init) => {
        request = { url, init };
        return new Response(JSON.stringify({
            data: { yearMonth: '2026-08', version: 1, entries: [], totals: {} },
        }), { status: 200 });
    };

    await apiPut(
        '/me/schedules/2026-08',
        { expectedVersion: 0, entries: [{ date: '2026-08-01', duty: 'DAY' }] },
        'schedule-save-key',
    );

    assert.equal(request.url, 'https://example.invalid/api/v1/me/schedules/2026-08');
    assert.equal(request.init.method, 'PUT');
    assert.equal(request.init.headers['X-Idempotency-Key'], 'schedule-save-key');
    assert.deepEqual(JSON.parse(request.init.body), {
        expectedVersion: 0,
        entries: [{ date: '2026-08-01', duty: 'DAY' }],
    });
});

test('409 응답의 VERSION_CONFLICT를 호출 화면이 구분할 수 있게 유지한다', async (context) => {
    const originalFetch = global.fetch;
    context.after(() => {
        global.fetch = originalFetch;
    });

    global.fetch = async () => new Response(JSON.stringify({
        error: {
            code: 'VERSION_CONFLICT',
            message: '최신 상태를 다시 조회해 주세요.',
        },
    }), { status: 409 });

    await assert.rejects(
        () => apiPut('/me/schedules/2026-08', { expectedVersion: 1, entries: [] }, 'stale-key'),
        (error) => error instanceof ApiError
            && error.code === 'VERSION_CONFLICT'
            && error.status === 409,
    );
});
