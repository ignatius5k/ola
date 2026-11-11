import test from 'node:test';
import assert from 'node:assert/strict';
import { addManualTransaction, analyse, canReviewMatch, createInitialState, getCases, getCollections, getLedger, recordDecision, runBatch } from './engine.js';
import { RULE_SETTINGS, evaluateAutoRules, ruleDescriptions } from './rules.js';

test('only unambiguous exact-value cases auto-match', () => {
  const cases = getCases(createInitialState());
  assert.equal(cases.length, 24);
  assert.deepEqual(cases.filter(item => item.status === 'Auto matched').map(item => item.id), ['COL-1011', 'COL-1016', 'COL-1020', 'COL-1029', 'COL-1032', 'COL-1033', 'COL-1034']);
  assert.equal(cases.find(item => item.id === 'COL-1012').category, 'duplicate');
  assert.equal(cases.find(item => item.id === 'COL-1012').candidates.length, 2);
  assert.equal(cases.find(item => item.id === 'COL-1013').category, 'fee');
  assert.equal(cases.find(item => item.id === 'COL-1014').status, 'Awaiting evidence');
  assert.equal(cases.find(item => item.id === 'COL-1015').category, 'reversal');
  assert.equal(cases.find(item => item.id === 'COL-1017').category, 'currency');
  assert.equal(cases.find(item => item.id === 'COL-1018').category, 'reference');
  assert.equal(cases.find(item => item.id === 'COL-1019').category, 'high-value');
  assert.equal(cases.find(item => item.id === 'COL-1019').status, 'Needs review');
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

function matchingRecords(amount, currency = 'SGD') {
  const collection = { id: 'COL-TEST', reference: 'TEST-REF', amount, currency, time: '2026-10-23T13:30:00+08:00' };
  const row = { id: 'LED-TEST', reference: collection.reference, amount, currency, time: '2026-10-23T13:32:00+08:00', type: 'credit', fee: 0 };
  return { collection, row };
}

test('large transaction thresholds are inclusive and configured per currency', () => {
  for (const currency of ['SGD', 'USD']) {
    for (const [amount, category] of [[9999.99, 'auto'], [10000, 'high-value'], [10000.01, 'high-value']]) {
      const { collection, row } = matchingRecords(amount, currency);
      const item = analyse(collection, [row]);
      assert.equal(item.category, category, `${currency} ${amount}`);
      assert.equal(Boolean(item.amountReview), amount >= 10000);
      if (item.amountReview) assert.deepEqual(item.amountReview, { required: true, amount, currency, threshold: 10000 });
    }
  }
  const settings = { ...RULE_SETTINGS, largeTransactionThresholds: { SGD: 100, USD: 500 } };
  const sgd = matchingRecords(200, 'SGD');
  const usd = matchingRecords(200, 'USD');
  assert.equal(analyse(sgd.collection, [sgd.row], settings).category, 'high-value');
  assert.equal(analyse(usd.collection, [usd.row], settings).category, 'auto');
  assert.match(ruleDescriptions(settings).find(rule => rule.id === 'large-transaction-review').description, /SGD 100 or USD 500/);
  const euro = matchingRecords(200, 'EUR');
  assert.equal(analyse(euro.collection, [euro.row], settings).category, 'policy');
  assert.equal(analyse(euro.collection, [euro.row], settings).autoLedgerId, null);
});

test('large amount flags do not replace other exception blockers', () => {
  const { collection, row } = matchingRecords(12500);
  const variations = [
    { ledger: [row, { ...row, id: 'LED-DUPLICATE' }], category: 'duplicate', reviewable: false },
    { ledger: [{ ...row, type: 'reversal', amount: -12500 }], category: 'reversal', reviewable: false },
    { ledger: [{ ...row, currency: 'USD' }], category: 'currency', reviewable: false },
    { ledger: [{ ...row, amount: 12400 }], category: 'amount', reviewable: false },
    { ledger: [{ ...row, time: '2026-10-23T14:30:00+08:00' }], category: 'timing', reviewable: false },
    { ledger: [], category: 'missing', reviewable: false },
    { ledger: [{ ...row, amount: 12499, fee: 1 }], category: 'fee', reviewable: true },
    { ledger: [{ ...row, reference: 'MISTYPED-REF' }], category: 'reference', reviewable: true }
  ];
  for (const { ledger, category, reviewable } of variations) {
    const item = analyse(collection, ledger);
    assert.equal(item.category, category);
    assert.equal(item.amountReview.required, true);
    assert.equal(canReviewMatch(item), reviewable);
    assert.equal(item.autoLedgerId, null);
  }
  const reversedNearby = analyse(collection, [{ ...row, reference: 'OTHER', type: 'reversal' }]);
  assert.equal(canReviewMatch(reversedNearby), false);
});

test('large transaction approval enforces reviewer permissions, evidence, reason, and explicit verification', () => {
  const initial = createInitialState();
  const input = { caseId: 'COL-1019', status: 'Reviewed match', ledgerId: 'LED-5010', note: 'Verified the source transaction.', verifiedLargeAmount: true };
  assert.throws(() => recordDecision(initial, input), /Switch to Reviewer/);
  const reviewer = { ...initial, role: 'Reviewer' };
  assert.throws(() => recordDecision(reviewer, { ...input, note: 'Short' }), /eight characters/);
  assert.throws(() => recordDecision(reviewer, { ...input, ledgerId: 'LED-5001' }), /eligible ledger candidate/);
  assert.throws(() => recordDecision(reviewer, { ...input, verifiedLargeAmount: false }), /Verify the large transaction amount/);
  assert.throws(() => recordDecision(reviewer, { ...input, verifiedLargeAmount: 'true' }), /Verify the large transaction amount/);
  for (const caseId of ['COL-1012', 'COL-1014', 'COL-1015', 'COL-1017']) {
    assert.throws(() => recordDecision(reviewer, { ...input, caseId }), /needs more evidence/);
  }
  const approved = recordDecision(reviewer, input);
  const item = getCases(approved).find(candidate => candidate.id === 'COL-1019');
  assert.equal(item.status, 'Reviewed match');
  assert.equal(item.decision.verifiedLargeAmount, true);
  assert.equal(item.decision.ledgerId, 'LED-5010');
  assert.equal(item.decision.amountReview.threshold, 10000);
  assert.match(approved.audit[0].detail, /SGD 12500\.00/);
  assert.match(approved.audit[0].detail, /SGD 10000\.00/);
  assert.match(approved.audit[0].detail, /LED-5010/);
  assert.match(approved.audit[0].detail, /Verified the source transaction/);
  assert.equal(initial.audit.some(event => event.caseId === 'COL-1019' && event.action === 'Auto matched'), false);
  assert.equal(initial.audit.some(event => event.caseId === 'COL-1019' && event.action === 'Large transaction flagged'), true);
});

test('large transaction decisions survive reruns and reopening restores verification', () => {
  const initial = { ...createInitialState(), role: 'Reviewer' };
  const approved = recordDecision(initial, { caseId: 'COL-1019', status: 'Reviewed match', ledgerId: 'LED-5010', note: 'Amount and source verified.', verifiedLargeAmount: true });
  const rerun = runBatch(approved);
  assert.equal(getCases(rerun).find(item => item.id === 'COL-1019').status, 'Reviewed match');
  assert.equal(rerun.audit.filter(event => event.caseId === 'COL-1019' && event.action === 'Reviewed match').length, 1);
  assert.equal(rerun.audit.some(event => event.caseId === 'COL-1019' && event.action === 'Auto matched'), false);
  assert.throws(() => recordDecision(rerun, { caseId: 'COL-1019', status: 'Escalated', note: 'Request another investigation.' }), /Reopen the case/);
  const decisions = { ...rerun.decisions };
  delete decisions['COL-1019'];
  const reopened = { ...rerun, decisions };
  assert.equal(getCases(reopened).find(item => item.id === 'COL-1019').status, 'Needs review');
  assert.throws(() => recordDecision(reopened, { caseId: 'COL-1019', status: 'Reviewed match', ledgerId: 'LED-5010', note: 'Rechecked the transaction.' }), /Verify the large transaction amount/);
  const escalated = recordDecision(initial, { caseId: 'COL-1019', status: 'Escalated', note: 'Requested source documentation.' });
  assert.equal(getCases(runBatch(escalated)).find(item => item.id === 'COL-1019').status, 'Escalated');
  assert.equal(escalated.decisions['COL-1019'].verifiedLargeAmount, false);
});

test('lowering the threshold requires new verification of previously reviewed ordinary transactions', () => {
  for (const [caseId, ledgerId] of [['COL-1013', 'LED-5004'], ['COL-1018', 'LED-5008']]) {
    const initial = { ...createInitialState(), role: 'Reviewer' };
    const approved = recordDecision(initial, { caseId, status: 'Reviewed match', ledgerId, note: 'Reviewed the source evidence.' });
    assert.equal(getCases(approved).find(item => item.id === caseId).status, 'Reviewed match');
    assert.equal(approved.decisions[caseId].verifiedLargeAmount, false);
    const settings = { ...RULE_SETTINGS, largeTransactionThresholds: { SGD: 100, USD: 10000 } };
    const flagged = getCases(approved, settings).find(item => item.id === caseId);
    assert.equal(flagged.status, 'Needs review');
    assert.equal(flagged.amountReview.required, true);
    assert.equal(flagged.decision, approved.decisions[caseId], 'The previous decision remains available as history.');
    assert.equal(getCases(runBatch(approved, settings), settings).find(item => item.id === caseId).status, 'Needs review');
    assert.throws(() => recordDecision(approved, { caseId, status: 'Reviewed match', ledgerId, note: 'Rechecked under the new policy.' }, settings), /Verify the large transaction amount/);
    const verified = recordDecision(approved, { caseId, status: 'Reviewed match', ledgerId, note: 'Rechecked under the new policy.', verifiedLargeAmount: true }, settings);
    assert.equal(getCases(verified, settings).find(item => item.id === caseId).status, 'Reviewed match');
    assert.equal(verified.decisions[caseId].amountReview.threshold, 100);
    assert.equal(verified.audit.filter(event => event.caseId === caseId && event.action === 'Reviewed match').length, 2);
  }
});

test('a large transaction approval must match the current verification snapshot', () => {
  const initial = { ...createInitialState(), role: 'Reviewer' };
  const approved = recordDecision(initial, { caseId: 'COL-1019', status: 'Reviewed match', ledgerId: 'LED-5010', note: 'Amount and source verified.', verifiedLargeAmount: true });
  const decision = approved.decisions['COL-1019'];
  const tightened = { ...RULE_SETTINGS, largeTransactionThresholds: { SGD: 5000, USD: 10000 } };
  assert.equal(getCases(approved, tightened).find(item => item.id === 'COL-1019').status, 'Needs review');
  for (const stale of [
    { ...decision, verifiedLargeAmount: false },
    { ...decision, amountReview: null },
    { ...decision, amountReview: { ...decision.amountReview, amount: 12000 } },
    { ...decision, amountReview: { ...decision.amountReview, currency: 'USD' } },
    { ...decision, amountReview: { ...decision.amountReview, threshold: 5000 } },
    { ...decision, ledgerId: 'LED-5001' }
  ]) {
    const staleState = { ...approved, decisions: { ...approved.decisions, 'COL-1019': stale } };
    assert.equal(getCases(staleState).find(item => item.id === 'COL-1019').status, 'Needs review');
  }
  assert.equal(getCases(runBatch(approved)).find(item => item.id === 'COL-1019').status, 'Reviewed match');
});

test('a later ledger posting cannot automatically close a flagged transaction', () => {
  const settings = { ...RULE_SETTINGS, largeTransactionThresholds: { SGD: 50, USD: 10000 } };
  const initial = createInitialState(settings);
  assert.equal(getCases(initial, settings).find(item => item.id === 'COL-1014').status, 'Awaiting evidence');
  const processed = runBatch({ ...initial, laterFileReceived: true }, settings);
  const lateCase = getCases(processed, settings).find(item => item.id === 'COL-1014');
  assert.equal(lateCase.category, 'high-value');
  assert.equal(lateCase.status, 'Needs review');
  assert.equal(lateCase.amountReview.required, true);
  assert.equal(processed.audit.some(event => event.caseId === 'COL-1014' && event.action === 'Auto matched'), false);
});

test('batch reruns backfill missing large transaction audit flags without duplicate snapshots', () => {
  const initial = createInitialState();
  const legacyState = { ...initial, audit: initial.audit.filter(event => event.action !== 'Large transaction flagged') };
  const backfilled = runBatch(legacyState);
  const flags = state => state.audit.filter(event => event.action === 'Large transaction flagged');
  assert.deepEqual(flags(backfilled).map(event => event.caseId).sort(), ['COL-1019', 'COL-1031']);
  assert.deepEqual(flags(backfilled).find(event => event.caseId === 'COL-1019').amountReview, { required: true, amount: 12500, currency: 'SGD', threshold: 10000 });
  assert.equal(flags(runBatch(backfilled)).length, 2);

  const tightened = { ...RULE_SETTINGS, largeTransactionThresholds: { SGD: 5000, USD: 10000 } };
  const changedPolicy = runBatch(backfilled, tightened);
  assert.equal(flags(changedPolicy).length, 4, 'A new threshold receives its own flag snapshot.');
  assert.equal(flags(runBatch(changedPolicy, tightened)).length, 4);

  const legacyDetails = { ...initial, audit: initial.audit.map(({ amountReview, ...event }) => event) };
  assert.equal(flags(runBatch(legacyDetails)).length, 2, 'Existing legacy flag details prevent duplicate events.');
});


test('expanded batch covers operational exception categories and the time boundary', () => {
  const cases = getCases(createInitialState());
  const category = id => cases.find(item => item.id === id).category;
  for (const [id, expected] of Object.entries({ 'COL-1021': 'timing', 'COL-1022': 'amount', 'COL-1023': 'amount', 'COL-1024': 'missing', 'COL-1025': 'fee', 'COL-1026': 'duplicate', 'COL-1027': 'reference', 'COL-1028': 'reversal', 'COL-1030': 'currency', 'COL-1031': 'high-value', 'COL-1033': 'auto' })) assert.equal(category(id), expected, id);
});

const manualInput = {
  counterparty: 'New Harbour Services', reference: 'MANUAL-NEW-001', amount: '47.35', currency: 'SGD',
  time: '2026-10-23T20:00:00+08:00', channel: 'Bank transfer'
};

test('manual collection entry supports legacy state, persistence, and pure state updates', () => {
  const { manualCollections, ...legacy } = createInitialState();
  const original = JSON.stringify(legacy);
  const ledger = getLedger(legacy);
  const added = addManualTransaction(legacy, { ...manualInput, counterparty: '  New Harbour Services  ', currency: 'sgd' });
  const collection = added.manualCollections[0];
  assert.equal(JSON.stringify(legacy), original);
  assert.equal(getCollections(legacy).length, 24);
  assert.equal(getCollections(added).length, 25);
  assert.equal(getLedger(added), ledger, 'Adding a collection does not create a ledger posting.');
  assert.equal(collection.counterparty, 'New Harbour Services');
  assert.equal(collection.currency, 'SGD');
  assert.equal(collection.amount, 47.35);
  assert.equal(collection.time, '2026-10-23T12:00:00.000Z');
  assert.match(collection.id, /^COL-M-/);
  assert.equal(collection.source, 'Manual entry');
  assert.equal(collection.createdBy, 'Analyst');
  assert.equal(Number.isFinite(Date.parse(collection.createdAt)), true);
  assert.deepEqual(added.decisions, legacy.decisions);
  const restored = JSON.parse(JSON.stringify(added));
  const item = getCases(restored).find(candidate => candidate.id === collection.id);
  assert.equal(item.category, 'missing');
  assert.equal(item.status, 'Awaiting evidence');
  assert.equal(item.candidates.length, 0);
  assert.equal(item.decision, undefined);
  assert.equal(restored.audit.filter(event => event.caseId === collection.id && event.action === 'Manual transaction added').length, 1);
  assert.equal(restored.audit.some(event => event.caseId === collection.id && event.action === 'Auto matched'), false);
  const second = addManualTransaction(restored, { ...manualInput, reference: 'MANUAL-NEW-002' });
  assert.notEqual(second.manualCollections[1].id, collection.id);
  assert.equal(getCases(second).length, 26);
  assert.match(runBatch(second).audit[0].detail, /26 collections/);
});

test('manual references are unique and cannot reuse another case’s ledger evidence', () => {
  const initial = createInitialState();
  assert.throws(() => addManualTransaction(initial, { ...manualInput, reference: '  qr-241024-101  ' }), /reference already exists/);
  const added = addManualTransaction(initial, manualInput);
  assert.throws(() => addManualTransaction(added, { ...manualInput, reference: ' manual-new-001 ' }), /reference already exists/);
  assert.throws(() => addManualTransaction(initial, { ...manualInput, reference: 'QR-241024-180', amount: 320, time: '2026-10-23T13:02:00+08:00' }), /Supporting ledger posting is already associated/);
  assert.throws(() => addManualTransaction(initial, { ...manualInput, reference: 'UNCLAIMED-REF', amount: 125, time: '2026-10-23T09:01:00+08:00' }), /Supporting ledger posting is already associated/);
  assert.equal(getCollections(initial).length, 24);
});

test('manual entry validates role, required fields, currency, channel, and timestamp', () => {
  const initial = createInitialState();
  assert.throws(() => addManualTransaction({ ...initial, role: 'Reviewer' }, manualInput), /Only an Analyst/);
  assert.throws(() => addManualTransaction({ ...initial, role: 'Administrator' }, manualInput), /Only an Analyst/);
  for (const input of [
    { ...manualInput, counterparty: '' }, { ...manualInput, counterparty: 'A'.repeat(121) },
    { ...manualInput, counterparty: 'First\nSecond' }, { ...manualInput, reference: '  ' },
    { ...manualInput, reference: 'R'.repeat(101) }, { ...manualInput, channel: 'Cash' },
    { ...manualInput, currency: 'EUR' }, { ...manualInput, time: '2026-10-23T20:00' },
    { ...manualInput, time: '2026-02-30T20:00:00+08:00' },
    { ...manualInput, time: '2026-10-23T24:00:00+08:00' },
    { ...manualInput, time: 'not-a-time' }
  ]) assert.throws(() => addManualTransaction(initial, input));
  const settings = { ...RULE_SETTINGS, largeTransactionThresholds: { ...RULE_SETTINGS.largeTransactionThresholds, EUR: 5000, XYZ: 1000 } };
  assert.doesNotThrow(() => addManualTransaction(initial, { ...manualInput, currency: 'EUR' }, settings));
  assert.throws(() => addManualTransaction(initial, { ...manualInput, currency: 'XYZ' }, settings), /configured review threshold/);
});

test('manual monetary values are positive and preserve two-decimal precision', () => {
  const initial = createInitialState();
  for (const amount of [0, -1, Infinity, NaN, null, true, '', '1e3', '1.001', 0.1 + 0.2, '90071992547409.90', '90071992547409.92']) {
    assert.throws(() => addManualTransaction(initial, { ...manualInput, amount }), undefined, String(amount));
  }
  for (const [amount, expected] of [['0.29', 0.29], ['.50', 0.5], ['0001.20', 1.2], [12.34, 12.34]]) {
    assert.equal(addManualTransaction(initial, { ...manualInput, amount }).manualCollections[0].amount, expected);
  }
});

test('manual large transactions retain evidence requirements and create one flag audit entry', () => {
  const initial = createInitialState();
  const added = addManualTransaction(initial, { ...manualInput, amount: '10000.00' });
  const collection = added.manualCollections[0];
  const item = getCases(added).find(candidate => candidate.id === collection.id);
  assert.equal(item.category, 'missing');
  assert.equal(item.status, 'Awaiting evidence');
  assert.deepEqual(item.amountReview, { required: true, amount: 10000, currency: 'SGD', threshold: 10000 });
  assert.equal(canReviewMatch(item), false);
  assert.throws(() => recordDecision({ ...added, role: 'Reviewer' }, { caseId: item.id, status: 'Reviewed match', ledgerId: 'LED-5010', note: 'Checked the transaction amount.', verifiedLargeAmount: true }), /needs more evidence/);
  const flags = state => state.audit.filter(event => event.caseId === item.id && event.action === 'Large transaction flagged');
  assert.equal(flags(added).length, 1);
  assert.deepEqual(flags(added)[0].amountReview, item.amountReview);
  assert.equal(flags(runBatch(added)).length, 1);
  assert.equal(added.audit.filter(event => event.caseId === item.id && event.action === 'Manual transaction added').length, 1);
});

test('later ledger evidence cannot be reused by a manual transaction', () => {
  const added = addManualTransaction(createInitialState(), { ...manualInput, reference: 'MANUAL-LATE-001', amount: 55, time: '2026-10-23T10:59:00+08:00' });
  const manualId = added.manualCollections[0].id;
  assert.equal(getCases(added).find(item => item.id === manualId).status, 'Awaiting evidence');
  const processed = runBatch({ ...added, laterFileReceived: true });
  const cases = getCases(processed);
  const manual = cases.find(item => item.id === manualId);
  assert.equal(cases.find(item => item.id === 'COL-1014').status, 'Auto matched');
  assert.equal(manual.category, 'ledger-conflict');
  assert.equal(manual.status, 'Needs review');
  assert.equal(manual.autoLedgerId, null);
  assert.deepEqual(manual.ledgerConflict, { ledgerIds: ['LED-5009'], caseIds: ['COL-1014'] });
  assert.equal(canReviewMatch(manual), false);
  assert.throws(() => recordDecision({ ...processed, role: 'Reviewer' }, { caseId: manualId, status: 'Reviewed match', ledgerId: 'LED-5009', note: 'Attempt to reuse the existing posting.' }), /needs more evidence/);
  const conflicts = state => state.audit.filter(event => event.caseId === manualId && event.action === 'Ledger posting conflict');
  assert.equal(conflicts(processed).length, 1);
  assert.deepEqual(conflicts(processed)[0].ledgerConflict, manual.ledgerConflict);
  assert.equal(conflicts(runBatch(processed)).length, 1);
  assert.equal(getLedger(processed).some(row => row.id === 'LED-5009'), true);

  const oldDecision = { status: 'Reviewed match', ledgerId: 'LED-5009', note: 'Legacy review before the conflict guard.', actor: 'Reviewer' };
  const legacy = { ...processed, decisions: { ...processed.decisions, [manualId]: oldDecision } };
  const rechecked = getCases(legacy).find(item => item.id === manualId);
  assert.equal(rechecked.status, 'Needs review');
  assert.equal(rechecked.decision, oldDecision);
  assert.equal(getCases({ ...legacy, decisions: { ...legacy.decisions, [manualId]: { ...oldDecision, status: 'Escalated' } } }).find(item => item.id === manualId).status, 'Escalated');

  const settings = { ...RULE_SETTINGS, largeTransactionThresholds: { SGD: 50, USD: 10000 } };
  const highValue = getCases(processed, settings).find(item => item.id === manualId);
  assert.equal(highValue.category, 'ledger-conflict');
  assert.deepEqual(highValue.amountReview, { required: true, amount: 55, currency: 'SGD', threshold: 50 });
  assert.equal(canReviewMatch(highValue, settings), false);
});
