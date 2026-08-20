const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.invalid/api/v1';

require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
        fileName: filename,
    }).outputText;
    module._compile(output, filename);
};

const { ApiError } = require('./client.ts');
const { getMonthlySchedule, putMonthlySchedule } = require('./schedules.ts');

test('GET 404는 새 월 저장에 사용할 version 0 빈 근무표로 변환한다', async (context) => {
    const originalFetch = global.fetch;
    context.after(() => {
        global.fetch = originalFetch;
    });

    global.fetch = async () => new Response(JSON.stringify({
        error: {
            code: 'MONTHLY_SCHEDULE_NOT_FOUND',
            message: '등록된 월별 근무표를 찾을 수 없습니다.',
        },
    }), { status: 404 });

    assert.deepEqual(await getMonthlySchedule('2026-08'), {
        yearMonth: '2026-08',
        version: 0,
        entries: [],
        totals: { DAY: 0, EVENING: 0, NIGHT: 0, OFF: 0 },
    });
});

test('IDEMPOTENCY_KEY_REUSED를 호출 화면이 새 key 경계로 구분할 수 있게 유지한다', async (context) => {
    const originalFetch = global.fetch;
    context.after(() => {
        global.fetch = originalFetch;
    });

    global.fetch = async () => new Response(JSON.stringify({
        error: {
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: '다른 요청에서 사용된 식별자입니다.',
        },
    }), { status: 409 });

    await assert.rejects(
        () => putMonthlySchedule('2026-08', 0, [], 'reused-key'),
        (error) => error instanceof ApiError
            && error.code === 'IDEMPOTENCY_KEY_REUSED'
            && error.status === 409,
    );
});
