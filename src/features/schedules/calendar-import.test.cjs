const assert = require('node:assert/strict');
const test = require('node:test');
const {
    buildCalendarCandidates,
    calendarFetchRange,
    dutyFromCalendarTitle,
    mergeScheduleEntries,
    monthDateKeys,
    normalizeCalendarTitle,
    resolveCalendarCandidates,
    scheduleSaveSignature,
    selectScheduleSaveAttempt,
    seoulDateKey,
} = require('./calendar-import.ts');

test('NFKC와 공백 정규화 후 전체 일치 별칭만 근무로 변환한다', () => {
    assert.equal(normalizeCalendarTitle('  ＤＡＹ　ＳＨＩＦＴ  '), 'DAY SHIFT');
    assert.equal(dutyFromCalendarTitle('데이'), 'DAY');
    assert.equal(dutyFromCalendarTitle(' evening shift '), 'EVENING');
    assert.equal(dutyFromCalendarTitle('야간'), 'NIGHT');
    assert.equal(dutyFromCalendarTitle('휴무'), 'OFF');
    assert.equal(dutyFromCalendarTitle('O'), null);
    assert.equal(dutyFromCalendarTitle('DAY 교육'), null);
});

test('Asia/Seoul 시작일을 사용하고 월 경계 밖 일정은 제외한다', () => {
    assert.equal(seoulDateKey('2026-07-31T15:30:00.000Z'), '2026-08-01');
    const range = calendarFetchRange('2026-08');
    assert.equal(range.startDate.toISOString(), '2026-07-30T15:00:00.000Z');
    assert.equal(range.endDate.toISOString(), '2026-09-01T15:00:00.000Z');

    assert.deepEqual(
        buildCalendarCandidates([
            { title: 'D', startDate: '2026-07-31T15:30:00.000Z' },
            { title: 'E', startDate: '2026-08-31T15:30:00.000Z' },
        ], '2026-08'),
        [{ date: '2026-08-01', status: 'MATCHED', suggestedDuty: 'DAY' }],
    );
});

test('같은 날짜 같은 근무는 합치고 다른 근무와 미인식 제목은 검토 대상으로 둔다', () => {
    assert.deepEqual(
        buildCalendarCandidates([
            { title: 'D', startDate: '2026-08-01T01:00:00.000Z' },
            { title: 'DAY', startDate: '2026-08-01T02:00:00.000Z' },
            { title: 'D', startDate: '2026-08-02T01:00:00.000Z' },
            { title: 'N', startDate: '2026-08-02T02:00:00.000Z' },
            { title: '교육', startDate: '2026-08-03T01:00:00.000Z' },
        ], '2026-08'),
        [
            { date: '2026-08-01', status: 'MATCHED', suggestedDuty: 'DAY' },
            { date: '2026-08-02', status: 'CONFLICT', suggestedDuty: null },
            { date: '2026-08-03', status: 'UNKNOWN', suggestedDuty: null },
        ],
    );
});

test('종일 일정과 야간 일정도 종료일이 아닌 서울 시작일에 배치한다', () => {
    assert.deepEqual(
        buildCalendarCandidates([
            { title: 'OFF', startDate: '2026-08-10T00:00:00+09:00' },
            { title: 'N', startDate: '2026-08-11T23:00:00+09:00' },
        ], '2026-08'),
        [
            { date: '2026-08-10', status: 'MATCHED', suggestedDuty: 'OFF' },
            { date: '2026-08-11', status: 'MATCHED', suggestedDuty: 'NIGHT' },
        ],
    );
});

test('가져온 날짜만 덮어쓰고 기존의 나머지 근무는 유지한다', () => {
    assert.deepEqual(
        mergeScheduleEntries(
            [
                { date: '2026-08-01', duty: 'DAY' },
                { date: '2026-08-02', duty: 'OFF' },
            ],
            [
                { date: '2026-08-02', duty: 'NIGHT' },
                { date: '2026-08-03', duty: 'EVENING' },
            ],
        ),
        [
            { date: '2026-08-01', duty: 'DAY' },
            { date: '2026-08-02', duty: 'NIGHT' },
            { date: '2026-08-03', duty: 'EVENING' },
        ],
    );
});

test('UNKNOWN과 CONFLICT 제외는 기존 서버 근무를 유지하고 신규 날짜를 만들지 않는다', () => {
    const candidates = [
        { date: '2026-08-02', status: 'UNKNOWN', suggestedDuty: null },
        { date: '2026-08-03', status: 'CONFLICT', suggestedDuty: null },
    ];
    const resolved = resolveCalendarCandidates(candidates, {
        '2026-08-02': 'EXCLUDED',
        '2026-08-03': 'EXCLUDED',
    });

    assert.deepEqual(resolved, []);
    assert.deepEqual(
        mergeScheduleEntries([{ date: '2026-08-02', duty: 'NIGHT' }], resolved),
        [{ date: '2026-08-02', duty: 'NIGHT' }],
    );
});

test('수동 입력용 월 날짜는 실제 말일까지만 만들고 기존 날짜 수정과 신규 추가를 병합한다', () => {
    assert.equal(monthDateKeys('2026-02').length, 28);
    assert.equal(monthDateKeys('2028-02').at(-1), '2028-02-29');
    assert.deepEqual(
        mergeScheduleEntries(
            [{ date: '2026-08-01', duty: 'DAY' }],
            [
                { date: '2026-08-01', duty: 'OFF' },
                { date: '2026-08-02', duty: 'NIGHT' },
            ],
        ),
        [
            { date: '2026-08-01', duty: 'OFF' },
            { date: '2026-08-02', duty: 'NIGHT' },
        ],
    );
});

test('같은 body는 같은 저장 서명을 만들고 version 또는 값 변경은 다른 서명을 만든다', () => {
    const entries = [{ date: '2026-08-01', duty: 'DAY' }];
    const first = scheduleSaveSignature('2026-08', 1, entries);
    assert.equal(first, scheduleSaveSignature('2026-08', 1, [...entries]));
    assert.notEqual(first, scheduleSaveSignature('2026-08', 2, entries));
    assert.notEqual(
        first,
        scheduleSaveSignature('2026-08', 1, [{ date: '2026-08-01', duty: 'OFF' }]),
    );
});

test('같은 body 서명은 같은 멱등성 key를 재사용하고 변경된 body는 새 key를 만든다', () => {
    let sequence = 0;
    const createKey = () => `key-${++sequence}`;
    const first = selectScheduleSaveAttempt(null, 'same-body', createKey);
    const retry = selectScheduleSaveAttempt(first, 'same-body', createKey);
    const changed = selectScheduleSaveAttempt(retry, 'changed-body', createKey);

    assert.equal(retry, first);
    assert.equal(retry.key, 'key-1');
    assert.equal(changed.key, 'key-2');
});
