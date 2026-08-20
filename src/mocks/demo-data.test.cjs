const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
        },
        fileName: filename,
    }).outputText;
    module._compile(output, filename);
};

const { createMockTasks } = require('./tasks.ts');
const {
    dateKeyOf,
    fetchPatientTimeline,
    fetchPatients,
} = require('../api/patients.ts');

function countBy(items, key) {
    return items.reduce((counts, item) => {
        counts[item[key]] = (counts[item[key]] ?? 0) + 1;
        return counts;
    }, {});
}

test('시연 환자 3명과 오늘 Timeline 임상 분류를 고정한다', async () => {
    const { items: patients } = await fetchPatients();

    assert.equal(patients.length, 3);
    for (const key of ['roomLabel', 'department', 'admittedAt', 'baselineSummary', 'statusLabel']) {
        assert.equal(new Set(patients.map((patient) => patient[key])).size, 3);
    }
    assert.match(patients[2].roomLabel, /^212호/);
    assert.match(patients[2].baselineSummary, /CT 결과상 큰 이상 없어/);

    const timelines = await Promise.all(
        patients.map((patient) => fetchPatientTimeline(patient.patientId)),
    );
    const populated = timelines.filter(({ items }) => items.length > 0);
    assert.equal(populated.length, 2);

    const today = dateKeyOf(new Date().toISOString());
    for (const { items } of populated) {
        assert.ok(items.length >= 5 && items.length <= 7);
        assert.ok(items.every((event) => dateKeyOf(event.occurredAt) === today));
    }

    const categories = new Set(
        populated.flatMap(({ items }) => items.map((event) => event.clinicalCategory)),
    );
    assert.deepEqual([...categories].sort(), [
        'DIET',
        'MENTAL_STATUS',
        'OBSERVATION',
        'PAIN',
        'RESPIRATION',
        'TREATMENT',
        'VITAL_SIGNS',
    ]);
});

test('시연 업무 5건의 상태, 출처, 우선순위, 마감 분포를 고정한다', () => {
    const referenceTime = new Date('2026-08-21T00:00:00.000Z');
    const tasks = createMockTasks(referenceTime);

    assert.equal(tasks.length, 5);
    assert.deepEqual(countBy(tasks, 'status'), { TODO: 2, DONE: 3 });
    assert.deepEqual(countBy(tasks, 'source'), { MANUAL: 3, AI_EXTRACTED: 2 });
    assert.deepEqual(countBy(tasks, 'effectivePriority'), {
        CRITICAL: 2,
        HIGH: 2,
        NORMAL: 1,
    });

    const dueHours = tasks.map((task) =>
        (new Date(task.dueAt).getTime() - referenceTime.getTime()) / 3600000,
    );
    assert.deepEqual(dueHours, [1, 3, 9, 10, 5]);
    assert.ok(dueHours.every((hours) => hours >= 1 && hours <= 10));
});
