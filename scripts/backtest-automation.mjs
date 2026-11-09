import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { analyse, buildLedgerIndex, createInitialState, getCases, recordDecision, runBatch } from '../src/engine.js';
import { RULE_SETTINGS } from '../src/rules.js';

const untilArg = process.argv.find(value => value.startsWith('--until='));
const outputArg = process.argv.find(value => value.startsWith('--output='));
const deadline = untilArg ? Date.parse(untilArg.slice(8)) : Date.now() + 60_000;
const output = outputArg?.slice(9) || 'automation-backtest-result.json';
if (!Number.isFinite(deadline) || deadline <= Date.now()) throw new Error('Provide a future --until ISO timestamp.');
const started = new Date().toISOString();
const thresholds = [100, 500, 1000, 5000, 10000, 20000];
const postingWindows = [5, 15, 30, 60];
const result = { started, deadline: new Date(deadline).toISOString(), cycles: 0, scenarios: 0, safetyFailures: [], fixtureMatrix: [], performanceMs: [] };

function rng(seed) {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

function scenarioSweep(seed) {
  const random = rng(seed);
  for (let index = 0; index < 300; index++) {
    const currency = random() < 0.5 ? 'SGD' : 'USD';
    const threshold = thresholds[Math.floor(random() * thresholds.length)];
    const window = postingWindows[Math.floor(random() * postingWindows.length)];
    const amountOptions = [threshold - 0.01, threshold - 1e-9, threshold, threshold + 1e-9, threshold + 0.01, 12.35, 199.99];
    const amount = amountOptions[Math.floor(random() * amountOptions.length)];
    const delay = [-5, -1, 0, 1, 5, 15, 30, 31, 60][Math.floor(random() * 9)];
    const defect = Math.floor(random() * 11);
    const time = Date.parse('2026-10-23T09:00:00Z') + index * 120_000;
    const collection = { id: `COL-${seed}-${index}`, reference: `REF-${seed}-${index}`, amount, currency, time: new Date(time).toISOString() };
    const row = { id: `LED-${seed}-${index}`, reference: collection.reference, amount, currency, time: new Date(time + delay * 60_000).toISOString(), type: 'credit', fee: 0 };
    if (defect === 1) row.type = 'reversal';
    if (defect === 2) row.currency = currency === 'SGD' ? 'USD' : 'SGD';
    if (defect === 3) row.amount = amount - 1;
    if (defect === 4) { row.amount = amount - 1; row.fee = 1; }
    if (defect === 5) row.reference = `OTHER-${seed}-${index}`;
    if (defect === 6) row.fee = 0.001;
    if (defect === 7) row.time = 'not-a-time';
    if (defect === 9) row.time = '2026-10-23T09:00:00';
    if (defect === 10) row.time = '2026-02-30T09:00:00Z';
    const ledger = defect === 8 ? [row, { ...row, id: `${row.id}-DUP` }] : [row];
    const settings = { ...RULE_SETTINGS, maxPostingDelayMinutes: window, largeTransactionThresholds: { ...RULE_SETTINGS.largeTransactionThresholds, [currency]: threshold } };
    const baseline = analyse(collection, ledger, settings);
    const indexed = analyse(collection, ledger, settings, buildLedgerIndex(ledger));
    const expectedAuto = defect === 0 && Math.round(amount * 100) < Math.round(threshold * 100) && delay >= 0 && delay <= window;
    assert.equal(baseline.category === 'auto', expectedAuto, `seed ${seed}, scenario ${index}, defect ${defect}, ${currency} ${amount}, threshold ${threshold}, lag ${delay}`);
    assert.equal(indexed.category, baseline.category, `index category mismatch, seed ${seed}, scenario ${index}`);
    assert.deepEqual(indexed.candidates.map(candidate => candidate.id), baseline.candidates.map(candidate => candidate.id), `index candidates mismatch, seed ${seed}, scenario ${index}`);
    result.scenarios++;
  }
}

function fixtureSweep() {
  for (const threshold of thresholds) for (const window of postingWindows) {
    const settings = { ...RULE_SETTINGS, maxPostingDelayMinutes: window, largeTransactionThresholds: { SGD: threshold, USD: threshold } };
    const cases = getCases(createInitialState(settings), settings);
    const automatic = cases.filter(item => item.status === 'Auto matched');
    for (const item of automatic) {
      assert.equal(item.category, 'auto');
      assert.ok(item.collection.amount < threshold);
      assert.equal(item.candidates.length, 1);
      assert.equal(item.autoLedgerId, item.candidates[0].id);
      assert.equal(item.amountReview, null);
    }
    result.fixtureMatrix.push({ threshold, window, auto: automatic.length, flagged: cases.filter(item => item.amountReview?.required).length, review: cases.filter(item => item.status === 'Needs review').length });
  }
}

function auditSweep() {
  const approved = recordDecision({ ...createInitialState(), role: 'Reviewer' }, {
    caseId: 'COL-1019', status: 'Reviewed match', ledgerId: 'LED-5010', note: 'Source and amount checked against ledger.', verifiedLargeAmount: true
  });
  const approval = approved.audit.find(event => event.caseId === 'COL-1019' && event.action === 'Reviewed match');
  assert.ok(approval?.evidence?.policy?.version);
  assert.equal(getCases(approved).find(item => item.id === 'COL-1019').status, 'Reviewed match');
  const changed = { ...RULE_SETTINGS, largeTransactionThresholds: { SGD: 5000, USD: 10000 } };
  const rerun = runBatch(approved, changed);
  assert.equal(getCases(rerun, changed).find(item => item.id === 'COL-1019').status, 'Needs review');
  assert.ok(rerun.audit.some(event => event.caseId === 'COL-1019' && event.action === 'Approval requires re-verification'));
  assert.ok(rerun.audit.some(event => event.id === approval.id), 'Approval history must survive policy changes.');
  const lower = { ...RULE_SETTINGS, largeTransactionThresholds: { SGD: 100, USD: 10000 } };
  const demoted = runBatch(createInitialState(), lower);
  assert.equal(getCases(demoted, lower).find(item => item.id === 'COL-1011').status, 'Needs review');
  assert.ok(demoted.audit.some(event => event.caseId === 'COL-1011' && event.action === 'Automatic match requires review'));
}

function speedSweep(size, workload = 'exact') {
  const start = Date.parse('2026-10-23T09:00:00Z');
  const collections = Array.from({ length: size }, (_, index) => ({ id: `C-${index}`, reference: `R-${index}`, amount: 20 + index / 100, currency: 'SGD', time: new Date(start + index * 60_000).toISOString() }));
  const ledger = collections.map((collection, index) => ({ id: `L-${index}`, reference: workload === 'nearby' ? `OTHER-${index}` : collection.reference, amount: collection.amount, currency: 'SGD', time: new Date(Date.parse(collection.time) + 60_000).toISOString(), type: 'credit', fee: 0 }));
  let startedAt = performance.now();
  const baseline = collections.map(collection => analyse(collection, ledger));
  const baselineMs = performance.now() - startedAt;
  startedAt = performance.now();
  const index = buildLedgerIndex(ledger);
  const indexed = collections.map(collection => analyse(collection, ledger, RULE_SETTINGS, index));
  const indexedMs = performance.now() - startedAt;
  assert.deepEqual(indexed.map(item => item.category), baseline.map(item => item.category));
  assert.deepEqual(indexed.map(item => item.candidates.map(row => row.id)), baseline.map(item => item.candidates.map(row => row.id)));
  result.performanceMs.push({ workload, size, baselineMs: Number(baselineMs.toFixed(3)), indexedMs: Number(indexedMs.toFixed(3)) });
}

function persist() {
  result.finished = new Date().toISOString();
  result.elapsedSeconds = Math.round((Date.parse(result.finished) - Date.parse(started)) / 1000);
  writeFileSync(output, JSON.stringify(result, null, 2));
}

fixtureSweep();
speedSweep(5000);
speedSweep(2000, 'nearby');
while (Date.now() < deadline) {
  try {
    scenarioSweep(result.cycles + 1);
    auditSweep();
    if (result.cycles % 4 === 0) {
      speedSweep(2000);
      speedSweep(2000, 'nearby');
    }
    result.cycles++;
    persist();
    if (result.cycles % 10 === 0) process.stdout.write(`cycle ${result.cycles}: ${result.scenarios} scenarios, ${result.safetyFailures.length} failures\n`);
  } catch (error) {
    result.safetyFailures.push({ cycle: result.cycles, message: String(error) });
    persist();
    throw error;
  }
  await new Promise(resolve => setTimeout(resolve, Math.min(30_000, Math.max(0, deadline - Date.now()))));
}
persist();
process.stdout.write(`completed ${result.cycles} cycles and ${result.scenarios} scenarios in ${result.elapsedSeconds}s\n`);
