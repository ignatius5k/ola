import test from 'node:test';
import assert from 'node:assert/strict';
import { canReviewMatch, createInitialState, getCases, recordDecision } from '../../src/engine.js';
import {
  amountToMinor, buildCumulativeSeries, buildDashboardModel, formatMinorMoney, selectRoleQueue
} from '../../src/features/dashboard/dashboardMetricsModel.js';
import { returnInvestigation, submitInvestigation } from '../../src/features/handoff/handoffModel.js';

test('the demo cohort has exact, partitioned amounts and distinct role queues', () => {
  const cases = getCases(createInitialState());
  const analyst = buildDashboardModel(cases, 'SGD', 'Analyst');
  const reviewer = buildDashboardModel(cases, 'SGD', 'Reviewer');
  assert.equal(analyst.collectionMinor, 3058490n);
  assert.equal(analyst.matchedMinor, 59900n);
  assert.equal(analyst.unresolvedMinor, 2998590n);
  assert.equal(analyst.matchedMinor + analyst.unresolvedMinor, analyst.collectionMinor);
  assert.equal(analyst.roleQueue.length, 17);
  assert.equal(reviewer.roleQueue.length, 6);
  assert.equal(analyst.queueMinor, analyst.unresolvedMinor);
  assert.equal(reviewer.queueMinor, 2849000n);
  assert.deepEqual(reviewer.queueBreakdown.map(item => item.count), [2, 2, 2]);
  assert.equal(analyst.queueBreakdown.reduce((total, item) => total + item.count, 0), analyst.roleQueue.length);
  assert.deepEqual(reviewer.roleQueue.slice(0, 2).map(item => item.id), ['COL-1019', 'COL-1031']);
  assert.ok(!reviewer.roleQueue.some(item => ['COL-1012', 'COL-1014'].includes(item.id)));
});

test('currency scope is preserved in totals, queue and next action', () => {
  const time = '2026-10-23T09:00:00+08:00';
  const cases = [
    { id: 'SGD-1', status: 'Auto matched', collection: { currency: 'SGD', amount: 50, time } },
    { id: 'USD-1', status: 'Auto matched', collection: { currency: 'USD', amount: 1.25, time } },
    { id: 'USD-2', status: 'Awaiting evidence', collection: { currency: 'USD', amount: 2.10, time } }
  ];
  const usd = buildDashboardModel(cases, 'USD', 'Analyst');
  assert.equal(usd.collectionMinor, 335n);
  assert.equal(usd.matchedMinor, 125n);
  assert.equal(usd.unresolvedMinor, 210n);
  assert.equal(usd.queueMinor, 210n);
  assert.deepEqual(usd.roleQueue.map(item => item.id), ['USD-2']);
  assert.deepEqual(selectRoleQueue(cases, 'Reviewer'), []);
});

test('dashboard work cards follow submission and return handoffs', () => {
  const initial = createInitialState();
  const beforeAnalyst = buildDashboardModel(getCases(initial), 'SGD', 'Analyst', initial.handoffs);
  const beforeReviewer = buildDashboardModel(getCases(initial), 'SGD', 'Reviewer', initial.handoffs);
  assert.deepEqual(Object.fromEntries(Object.entries(beforeAnalyst.workStates).map(([key, rows]) => [key, rows.length])), {
    returned: 0, investigate: 15, awaiting: 2
  });
  assert.deepEqual(Object.fromEntries(Object.entries(beforeReviewer.workStates).map(([key, rows]) => [key, rows.length])), {
    submitted: 0, demo: 6, waiting: 0
  });
  const item = getCases(initial).find(row => row.id === 'COL-1013');
  const posting = item.candidates.find(row => canReviewMatch({ ...item, candidates: [row] }));
  const submitted = submitInvestigation(initial, { caseId: item.id, ledgerId: posting.id, findings: 'Fee evidence checked against both records.' });
  const analystAfterSend = buildDashboardModel(getCases(submitted), 'SGD', 'Analyst', submitted.handoffs);
  const reviewerAfterSend = buildDashboardModel(getCases(submitted), 'SGD', 'Reviewer', submitted.handoffs);
  assert.ok(!analystAfterSend.roleQueue.some(row => row.id === item.id));
  assert.deepEqual(reviewerAfterSend.workStates.submitted.map(row => row.id), [item.id]);
  assert.ok(!reviewerAfterSend.workStates.demo.some(row => row.id === item.id));
  const returned = returnInvestigation({ ...submitted, role: 'Reviewer' }, { caseId: item.id, reason: 'Confirm the source fee before resubmitting.' });
  const analystAfterReturn = buildDashboardModel(getCases(returned), 'SGD', 'Analyst', returned.handoffs);
  const reviewerAfterReturn = buildDashboardModel(getCases(returned), 'SGD', 'Reviewer', returned.handoffs);
  assert.deepEqual(analystAfterReturn.workStates.returned.map(row => row.id), [item.id]);
  assert.deepEqual(reviewerAfterReturn.workStates.waiting.map(row => row.id), [item.id]);
  assert.ok(!reviewerAfterReturn.roleQueue.some(row => row.id === item.id));
});

test('approval and reopening move the current amount between matched and unresolved', () => {
  const initial = createInitialState();
  const before = buildDashboardModel(getCases(initial), 'SGD', 'Reviewer');
  const approved = recordDecision({ ...initial, role: 'Reviewer' }, {
    caseId: 'COL-1013', status: 'Reviewed match', ledgerId: 'LED-5004',
    note: 'Recorded fee explains the difference.'
  });
  const after = buildDashboardModel(getCases(approved), 'SGD', 'Reviewer');
  assert.equal(after.matchedMinor - before.matchedMinor, 20000n);
  assert.equal(before.unresolvedMinor - after.unresolvedMinor, 20000n);
  assert.ok(!after.roleQueue.some(item => item.id === 'COL-1013'));
  assert.equal(before.queueMinor - after.queueMinor, 20000n);
  const { 'COL-1013': decision, ...otherDecisions } = approved.decisions;
  assert.ok(decision);
  const reopened = buildDashboardModel(getCases({ ...approved, decisions: otherDecisions }), 'SGD', 'Reviewer');
  assert.equal(reopened.matchedMinor, before.matchedMinor);
  assert.equal(reopened.unresolvedMinor, before.unresolvedMinor);
});

test('minor-unit formatting and cumulative endpoints avoid floating point totals', () => {
  assert.equal(amountToMinor('90071992547409.91'), 9007199254740991n);
  assert.equal(formatMinorMoney(9007199254740991n, 'SGD'), '$90,071,992,547,409.91');
  const time = '2026-10-23T09:00:00+08:00';
  const timeline = [{ time, amountMinor: '125' }, { time, amountMinor: '210' }];
  const zero = buildCumulativeSeries([], timeline);
  assert.deepEqual(zero.points.at(-1), [400, 130]);
  const series = buildCumulativeSeries(timeline, timeline);
  assert.equal(series.totalMinor, 335n);
  assert.deepEqual(series.points.at(-1), [400, 0]);
  assert.ok(series.points.every(point => point.every(Number.isFinite)));
  const penny = buildCumulativeSeries([{ time, amountMinor: '1' }], timeline);
  assert.deepEqual(penny.yTicks, [0n, 1n, 2n, 3n, 4n]);
  assert.equal(buildCumulativeSeries([], []), null);
});
