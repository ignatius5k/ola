import { addAudit, canReviewMatch, getCases } from '../../engine.js';

export const getHandoff = (state, caseId) => state.handoffs?.[caseId] || null;

export function submitInvestigation(state, { caseId, ledgerId, findings }) {
  if (state.role !== 'Analyst') throw new Error('Select Analyst to send an investigation for review.');
  const item = getCases(state).find(row => row.id === caseId);
  if (!item || item.status !== 'Needs review') throw new Error('This case is not ready for a review handoff.');
  const posting = item.candidates.find(row => row.id === ledgerId);
  if (!posting || !canReviewMatch({ ...item, candidates: [posting] })) {
    throw new Error('Choose an eligible ledger posting before sending this case.');
  }
  const summary = findings.trim();
  if (!summary) throw new Error('Summarize the evidence before sending this case.');
  const previous = getHandoff(state, caseId);
  if (previous?.status === 'submitted') throw new Error('This case has already been sent for review.');
  const handoff = {
    status: 'submitted', ledgerId, findings: summary,
    submittedAt: new Date().toISOString(),
    revision: (previous?.revision || 0) + 1,
    returnReason: null
  };
  return addAudit({ ...state, handoffs: { ...state.handoffs, [caseId]: handoff } }, {
    caseId, actor: 'Analyst (demo)', action: 'Sent for review',
    detail: `Proposed ${ledgerId}. Evidence summary: ${summary}`
  });
}

export function returnInvestigation(state, { caseId, reason }) {
  if (state.role !== 'Reviewer') throw new Error('Select Reviewer to return an investigation.');
  const current = getHandoff(state, caseId);
  if (current?.status !== 'submitted') throw new Error('There is no Analyst submission to return.');
  const note = reason.trim();
  if (!note) throw new Error('Explain what further evidence is needed.');
  return addAudit({
    ...state,
    handoffs: { ...state.handoffs, [caseId]: { ...current, status: 'returned', returnReason: note, returnedAt: new Date().toISOString() } }
  }, { caseId, actor: 'Reviewer (demo)', action: 'Returned for evidence', detail: note });
}

export function markHandoffDecided(state, caseId) {
  const current = getHandoff(state, caseId);
  if (current?.status !== 'submitted') return state;
  return { ...state, handoffs: { ...state.handoffs, [caseId]: { ...current, status: 'decided' } } };
}
