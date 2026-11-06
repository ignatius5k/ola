import { collections, originalLedger, laterLedger } from './data.js';
import { RULE_SETTINGS, evaluateAutoRules, getAmountReview, largeTransactionThreshold } from './rules.js';

export const money = (amount, currency = 'SGD') =>
  new Intl.NumberFormat('en-SG', { style: 'currency', currency }).format(amount);
export const displayTime = iso => new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' }).format(new Date(iso));
const minutesApart = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;

export function getLedger(state) {
  return state.processedLaterFile ? [...originalLedger, laterLedger] : originalLedger;
}

export function analyse(collection, ledger, settings = RULE_SETTINGS) {
  const exactReference = ledger.filter(row => row.reference === collection.reference);
  const nearby = ledger.filter(row => row.currency === collection.currency && row.amount === collection.amount && minutesApart(row.time, collection.time) <= settings.nearbyCandidateWindowMinutes);
  const candidates = exactReference.length ? exactReference : nearby;
  const amountReview = getAmountReview(collection, settings);
  const base = { collection, candidates, amountReview, checks: [], category: '', title: '', explanation: '', suggestion: '', autoLedgerId: null };

  if (exactReference.length > 1) return {
    ...base, category: 'duplicate', title: 'Duplicate reference',
    explanation: 'Two ledger rows share the reference and amount. Automatic matching is blocked because the records are indistinguishable under the current rules.',
    suggestion: 'Escalate and obtain a source record that distinguishes the two ledger postings.',
    checks: ['Reference found in ledger', 'More than one candidate', 'Automatic matching blocked']
  };
  if (exactReference.length === 1) {
    const row = exactReference[0];
    const delay = minutesApart(row.time, collection.time);
    const autoRuleResults = evaluateAutoRules({ collection, row, exactReference, delayMinutes: delay }, settings);
    if (autoRuleResults.every(rule => rule.passed)) return {
      ...base, category: 'auto', title: delay > 2 ? 'Late posting matched' : 'Exact match',
      explanation: delay > 2 ? `One ledger row passed every automatic rule. It arrived ${Math.round(delay)} minutes later.` : 'One ledger row passed every automatic matching rule.',
      suggestion: 'Close automatically with the matched ledger ID and rule checks in the audit history.',
      autoLedgerId: row.id,
      checks: autoRuleResults.map(rule => `Passed: ${rule.label}`)
    };
    if (row.type === 'reversal' || row.amount < 0) return {
      ...base, category: 'reversal', title: 'Reversal detected',
      explanation: 'A reversal is linked to this reference. The case requires review of the original posting and reversal.',
      suggestion: 'Escalate to investigate the original payment and reversal together.',
      checks: ['Reference found in ledger', 'Reversal event detected', 'Automatic matching blocked']
    };
    if (row.currency !== collection.currency) return {
      ...base, category: 'currency', title: 'Currency mismatch',
      explanation: `The collection is ${collection.currency}, while the ledger row is ${row.currency}.`,
      suggestion: 'Escalate and verify the transaction currency and foreign exchange records.',
      checks: ['Reference found in ledger', 'Currency differs', 'Automatic matching blocked']
    };
    if (row.amount !== collection.amount) {
      const explainedFee = Math.abs(row.amount + row.fee - collection.amount) < settings.feeExplanationTolerance && row.fee > 0;
      return {
        ...base, category: explainedFee ? 'fee' : 'amount', title: explainedFee ? 'Fee difference' : 'Amount mismatch',
        explanation: explainedFee ? `The ${money(row.fee)} fee explains the net amount, but a reviewer must confirm its treatment.` : 'The amounts do not match and no recorded fee fully explains the difference.',
        suggestion: explainedFee ? 'Review the fee entry, then record the match with a reason.' : 'Escalate for investigation of the value difference.',
        checks: ['Unique reference found', 'Currency matches', explainedFee ? 'Fee explains the difference' : 'Amount remains unexplained', 'Automatic matching blocked']
      };
    }
    if (delay > settings.maxPostingDelayMinutes) return {
      ...base, category: 'timing', title: 'Outside time window',
      explanation: `The posting is more than ${settings.maxPostingDelayMinutes} minutes from the collection event.`,
      suggestion: 'Verify the transaction identity and document the reason for the posting delay.',
      checks: ['Unique reference found', 'Amount and currency match', 'Time window exceeded']
    };
    if (amountReview) return {
      ...base, category: 'high-value', title: 'Large transaction verification',
      explanation: `The collection of ${money(collection.amount, collection.currency)} meets the ${money(amountReview.threshold, collection.currency)} human verification threshold. The matching evidence passes, but a reviewer must verify the transaction before closure.`,
      suggestion: 'Verify the transaction amount and ledger posting, then record the reviewed match with a reason.',
      checks: [...autoRuleResults.filter(rule => rule.id !== 'large-transaction-review').map(rule => `Passed: ${rule.label}`), 'Large transaction requires human verification', 'Automatic matching blocked']
    };
    return {
      ...base, category: 'policy', title: 'Policy check failed',
      explanation: largeTransactionThreshold(collection.currency, settings) === null ? `No valid human verification threshold is configured for ${collection.currency}. Automatic matching is blocked.` : 'At least one automatic matching rule failed.',
      suggestion: largeTransactionThreshold(collection.currency, settings) === null ? 'Configure an approved threshold for this currency before processing the case.' : 'Review the failed rule before recording an outcome.',
      checks: autoRuleResults.map(rule => `${rule.passed ? 'Passed' : 'Failed'}: ${rule.label}`)
    };
  }
  if (nearby.length) return {
    ...base, category: 'reference', title: 'Reference discrepancy',
    explanation: 'A nearby ledger row has the same amount and currency, but a different reference.',
    suggestion: 'Verify the source references before recording a match.',
    checks: ['No exact reference', 'Nearby amount and currency match', 'Automatic matching blocked']
  };
  return {
    ...base, category: 'missing', title: 'Ledger posting missing',
    explanation: 'No ledger entry matches the reference or a nearby amount in the processed file.',
    suggestion: 'Keep the case open and process the next ledger file when received.',
    checks: ['No exact reference', 'No nearby value match', 'Awaiting new evidence']
  };
}

function validReviewCandidate(item, row, settings) {
  if (!row || row.type !== 'credit' || !Number.isFinite(row.amount) || row.amount < 0 || row.currency !== item.collection.currency) return false;
  const delay = minutesApart(row.time, item.collection.time);
  if (!Number.isFinite(delay) || delay > settings.maxPostingDelayMinutes) return false;
  if (item.category === 'fee') return row.fee > 0 && Math.abs(row.amount + row.fee - item.collection.amount) < settings.feeExplanationTolerance;
  return row.amount === item.collection.amount;
}

export function canReviewMatch(item, settings = RULE_SETTINGS) {
  return Boolean(item && ['fee', 'reference', 'high-value'].includes(item.category) && settings.reviewerMatchCategories.includes(item.category) && item.candidates.some(row => validReviewCandidate(item, row, settings)));
}

function hasCurrentLargeVerification(item, decision, settings) {
  const current = item.amountReview;
  const recorded = decision?.amountReview;
  const candidate = item.candidates.find(row => row.id === decision?.ledgerId);
  return Boolean(decision?.verifiedLargeAmount === true && recorded?.required === true &&
    recorded.amount === current.amount && recorded.currency === current.currency && recorded.threshold === current.threshold &&
    canReviewMatch(item, settings) && validReviewCandidate(item, candidate, settings));
}

export function recordDecision(state, { caseId, status, ledgerId, note, verifiedLargeAmount = false }, settings = RULE_SETTINGS) {
  if (state.role !== 'Reviewer') throw new Error('Switch to Reviewer to record a decision.');
  const item = getCases(state, settings).find(candidate => candidate.id === caseId);
  if (!item) throw new Error('The selected case does not exist.');
  if (!['Reviewed match', 'Escalated'].includes(status)) throw new Error('Choose a reviewed match or escalation outcome.');
  if (['Reviewed match', 'Escalated'].includes(item.status)) throw new Error('Reopen the case before recording another decision.');
  const reason = String(note ?? '').trim();
  if (reason.length < 8) throw new Error('Please add a reason of at least eight characters.');
  let candidate = null;
  if (status === 'Reviewed match') {
    if (!canReviewMatch(item, settings)) throw new Error('This case needs more evidence before a match can be recorded.');
    candidate = item.candidates.find(row => row.id === ledgerId);
    if (!validReviewCandidate(item, candidate, settings)) throw new Error('Choose an eligible ledger candidate for this case.');
    if (item.amountReview && verifiedLargeAmount !== true) throw new Error('Verify the large transaction amount before recording the match.');
  }
  const amountDetail = item.amountReview
    ? ` Large transaction amount: ${item.amountReview.currency} ${item.amountReview.amount.toFixed(2)}; human verification threshold: ${item.amountReview.currency} ${item.amountReview.threshold.toFixed(2)}.`
    : '';
  const detail = status === 'Reviewed match'
    ? `Matched ${candidate.id}.${amountDetail}${item.amountReview ? ' Transaction amount explicitly verified.' : ''} Reviewer reason: ${reason}`
    : `Escalated for further investigation.${amountDetail} Reviewer reason: ${reason}`;
  const decision = { status, ledgerId: candidate?.id || null, note: reason, actor: state.role, verifiedLargeAmount: Boolean(candidate && item.amountReview && verifiedLargeAmount === true), amountReview: item.amountReview };
  return addAudit({ ...state, decisions: { ...state.decisions, [item.id]: decision } }, { caseId: item.id, actor: state.role, action: status, detail });
}

export function getCases(state, settings = RULE_SETTINGS) {
  const ledger = getLedger(state);
  return collections.map(collection => {
    const analysis = analyse(collection, ledger, settings);
    const decision = state.decisions[collection.id];
    const needsLargeVerification = analysis.amountReview?.required && decision?.status === 'Reviewed match' && !hasCurrentLargeVerification(analysis, decision, settings);
    const status = needsLargeVerification ? 'Needs review' : decision?.status || (analysis.category === 'auto' ? 'Auto matched' : analysis.category === 'missing' ? 'Awaiting evidence' : 'Needs review');
    return { ...analysis, id: collection.id, status, decision };
  });
}

function largeTransactionFlagDetail(review) {
  return `${review.currency} ${review.amount.toFixed(2)} meets the ${review.currency} ${review.threshold.toFixed(2)} human verification threshold. Reviewer verification is required before closure.`;
}

function sameAmountReview(recorded, current) {
  return recorded?.amount === current.amount && recorded?.currency === current.currency && recorded?.threshold === current.threshold;
}

export function createInitialState(settings = RULE_SETTINGS) {
  const started = '2026-10-24T09:00:00+08:00';
  const initial = {
    version: 2, role: 'Analyst', runs: 1, laterFileReceived: false, processedLaterFile: false,
    decisions: {},
    audit: []
  };
  const cases = getCases(initial, settings);
  const automatic = cases.filter(item => item.category === 'auto');
  const flagged = cases.filter(item => item.amountReview);
  return { ...initial, audit: [
    ...automatic.map((item, index) => ({ id: `E-${index + 1}`, caseId: item.id, actor: 'Rules engine', action: 'Auto matched', detail: `Matched ${item.autoLedgerId}. All automatic matching rules passed.`, time: started })),
    ...flagged.map((item, index) => ({ id: `E-${automatic.length + index + 1}`, caseId: item.id, actor: 'Rules engine', action: 'Large transaction flagged', detail: largeTransactionFlagDetail(item.amountReview), amountReview: { ...item.amountReview }, time: started })),
    { id: `E-${automatic.length + flagged.length + 1}`, caseId: null, actor: 'Rules engine', action: 'Batch completed', detail: `${collections.length} collections compared with the first ledger file; ${automatic.length} matched automatically; ${flagged.length} flagged for large transaction verification.`, time: started }
  ] };
}

export function addAudit(state, { caseId = null, actor, action, detail, amountReview }) {
  return {
    ...state,
    audit: [{ id: `E-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, caseId, actor, action, detail, ...(amountReview ? { amountReview: { ...amountReview } } : {}), time: new Date().toISOString() }, ...state.audit]
  };
}

export function runBatch(state, settings = RULE_SETTINGS) {
  const newlyProcessed = state.laterFileReceived && !state.processedLaterFile;
  let next = { ...state, runs: state.runs + 1, processedLaterFile: state.laterFileReceived };
  const lateCaseMatched = newlyProcessed && getCases(next, settings).find(item => item.id === 'COL-1014')?.status === 'Auto matched';
  if (lateCaseMatched) next = addAudit(next, { actor: 'Rules engine', action: 'Auto matched', caseId: 'COL-1014', detail: `New ledger file supplied LED-5009. All automatic matching rules passed, including the ${settings.maxPostingDelayMinutes}-minute window.` });
  for (const item of getCases(next, settings).filter(candidate => candidate.amountReview?.required)) {
    const detail = largeTransactionFlagDetail(item.amountReview);
    const logged = next.audit.some(event => event.caseId === item.id && event.action === 'Large transaction flagged' &&
      (event.amountReview ? sameAmountReview(event.amountReview, item.amountReview) : event.detail === detail));
    if (!logged) next = addAudit(next, { caseId: item.id, actor: 'Rules engine', action: 'Large transaction flagged', detail, amountReview: item.amountReview });
  }
  next = addAudit(next, { actor: state.role, action: 'Batch run', detail: newlyProcessed ? lateCaseMatched ? 'Second ledger file processed; one waiting case resolved.' : 'Second ledger file processed; the waiting case still requires review under the current rules.' : 'Batch rechecked. Existing decisions were preserved.' });
  return next;
}
