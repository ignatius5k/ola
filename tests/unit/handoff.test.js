import test from 'node:test';
import assert from 'node:assert/strict';
import { canReviewMatch, createInitialState, getCases, recordDecision } from '../../src/engine.js';
import { selectRoleQueue } from '../../src/features/dashboard/dashboardMetricsModel.js';
import { getHandoff, markHandoffDecided, returnInvestigation, submitInvestigation } from '../../src/features/handoff/handoffModel.js';

function feeCase(state) {
  const item = getCases(state).find(row => row.id === 'COL-1013');
  const posting = item.candidates.find(row => canReviewMatch({ ...item, candidates: [row] }));
  assert.ok(posting);
  return { item, posting };
}

test('Analyst handoff moves a case to Reviewer and return brings it back', () => {
  const initial = createInitialState();
  const { item, posting } = feeCase(initial);
  const submitted = submitInvestigation(initial, {
    caseId: item.id, ledgerId: posting.id,
    findings: 'Collection reference and ledger fee explain the difference.'
  });
  assert.equal(getHandoff(submitted, item.id).status, 'submitted');
  assert.equal(selectRoleQueue(getCases(submitted), 'Analyst', submitted.handoffs).some(row => row.id === item.id), false);
  const reviewerState = { ...submitted, role: 'Reviewer' };
  assert.equal(selectRoleQueue(getCases(reviewerState), 'Reviewer', reviewerState.handoffs)[0].id, item.id);

  const returned = returnInvestigation(reviewerState, { caseId: item.id, reason: 'Please confirm the recorded fee against the source record.' });
  assert.equal(getHandoff(returned, item.id).status, 'returned');
  assert.equal(selectRoleQueue(getCases(returned), 'Reviewer', returned.handoffs).some(row => row.id === item.id), false);
  assert.equal(selectRoleQueue(getCases(returned), 'Analyst', returned.handoffs)[0].id, item.id);

  const resubmitted = submitInvestigation({ ...returned, role: 'Analyst' }, {
    caseId: item.id, ledgerId: posting.id,
    findings: 'Confirmed the fee in both collection and ledger source records.'
  });
  assert.equal(getHandoff(resubmitted, item.id).revision, 2);
  assert.equal(getHandoff(resubmitted, item.id).returnReason, null);
  const decided = markHandoffDecided(recordDecision({ ...resubmitted, role: 'Reviewer' }, {
    caseId: item.id, status: 'Reviewed match', ledgerId: posting.id,
    note: 'I independently verified the collection, posting, and fee.'
  }), item.id);
  assert.equal(getHandoff(decided, item.id).status, 'decided');
  assert.equal(selectRoleQueue(getCases(decided), 'Reviewer', decided.handoffs).some(row => row.id === item.id), false);
});

test('handoff rejects unsupported roles, incomplete evidence and duplicate submission', () => {
  const initial = createInitialState();
  const { item, posting } = feeCase(initial);
  assert.throws(() => submitInvestigation(initial, { caseId: item.id, ledgerId: posting.id, findings: '  ' }), /Summarize/);
  assert.throws(() => submitInvestigation(initial, { caseId: item.id, ledgerId: 'missing', findings: 'Evidence checked.' }), /eligible/);
  assert.throws(() => submitInvestigation({ ...initial, role: 'Reviewer' }, { caseId: item.id, ledgerId: posting.id, findings: 'Evidence checked.' }), /Analyst/);
  const submitted = submitInvestigation(initial, { caseId: item.id, ledgerId: posting.id, findings: 'Evidence checked.' });
  assert.throws(() => submitInvestigation(submitted, { caseId: item.id, ledgerId: posting.id, findings: 'Evidence checked.' }), /already/);
  assert.throws(() => returnInvestigation(submitted, { caseId: item.id, reason: 'Need proof.' }), /Reviewer/);
  assert.throws(() => returnInvestigation({ ...submitted, role: 'Reviewer' }, { caseId: item.id, reason: ' ' }), /Explain/);
});
