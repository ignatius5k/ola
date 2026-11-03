import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, getCases, runBatch } from './engine.js';
import { RULE_SETTINGS, evaluateAutoRules, ruleDescriptions } from './rules.js';

test('only unambiguous exact-value cases auto-match', () => {
  const cases = getCases(createInitialState());
  assert.equal(cases.length, 8);
  assert.deepEqual(cases.filter(item => item.status === 'Auto matched').map(item => item.id), ['COL-1011', 'COL-1016']);
  assert.equal(cases.find(item => item.id === 'COL-1012').category, 'duplicate');
  assert.equal(cases.find(item => item.id === 'COL-1012').candidates.length, 2);
  assert.equal(cases.find(item => item.id === 'COL-1013').category, 'fee');
  assert.equal(cases.find(item => item.id === 'COL-1014').status, 'Awaiting evidence');
  assert.equal(cases.find(item => item.id === 'COL-1015').category, 'reversal');
  assert.equal(cases.find(item => item.id === 'COL-1017').category, 'currency');
  assert.equal(cases.find(item => item.id === 'COL-1018').category, 'reference');
});

test('late ledger row resolves only after the next reconciliation run', () => {
  const received = { ...createInitialState(), laterFileReceived: true };
  assert.equal(getCases(received).find(item => item.id === 'COL-1014').status, 'Awaiting evidence');
  const processed = runBatch(received);
  assert.equal(getCases(processed).find(item => item.id === 'COL-1014').status, 'Auto matched');
  assert.equal(processed.audit.filter(event => event.caseId === 'COL-1014' && event.action === 'Auto matched').length, 1);
  const rerun = runBatch(processed);
  assert.equal(rerun.audit.filter(event => event.caseId === 'COL-1014' && event.action === 'Auto matched').length, 1);
});

test('review decisions remain in place when a batch is rerun', () => {
  const initial = createInitialState();
  initial.decisions['COL-1012'] = { status: 'Reviewed match', ledgerId: 'LED-5002', note: 'Checked original source.' };
  assert.equal(getCases(runBatch(initial)).find(item => item.id === 'COL-1012').status, 'Reviewed match');
});

test('editing the posting window changes automatic matching and the displayed rule', () => {
  const stricter = { ...RULE_SETTINGS, maxPostingDelayMinutes: 5 };
  const cases = getCases(createInitialState(stricter), stricter);
  assert.equal(cases.find(item => item.id === 'COL-1011').category, 'timing');
  assert.equal(cases.find(item => item.id === 'COL-1016').category, 'auto');
  assert.match(ruleDescriptions(stricter).find(rule => rule.id === 'time-window').description, /5 minutes/);
  assert.equal(createInitialState(stricter).audit.some(event => event.caseId === 'COL-1011' && event.action === 'Auto matched'), false);
  const next = runBatch({ ...createInitialState(), laterFileReceived: true }, stricter);
  assert.equal(getCases(next, stricter).find(item => item.id === 'COL-1014').category, 'timing');
  assert.equal(next.audit.some(event => event.caseId === 'COL-1014' && event.action === 'Auto matched'), false);
});

test('all automatic rule predicates must pass', () => {
  const collection = { reference: 'X', amount: 50, currency: 'SGD' };
  const row = { reference: 'X', amount: 50, currency: 'SGD', type: 'credit' };
  assert.equal(evaluateAutoRules({ collection, row, exactReference: [row], delayMinutes: 3 }).every(rule => rule.passed), true);
  assert.equal(evaluateAutoRules({ collection, row: { ...row, type: 'reversal' }, exactReference: [row], delayMinutes: 3 }).find(rule => rule.id === 'credit-only').passed, false);
  assert.equal(evaluateAutoRules({ collection, row, exactReference: [row, row], delayMinutes: 3 }).find(rule => rule.id === 'unique-reference').passed, false);
});
