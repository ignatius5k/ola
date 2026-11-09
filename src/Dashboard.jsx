import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowsClockwise } from '@phosphor-icons/react';
import { displayTime, money } from './engine';
import { formatMinorMoney } from './features/dashboard/dashboardMetricsModel.js';
import './dashboard.css';

const WORK_CARDS = {
  Analyst: [
    { id: 'investigate', label: 'Needs investigation', hint: 'Cases you can advance now', action: 'Investigate cases' },
    { id: 'returned', label: 'Returned for evidence', hint: 'Reviewer requested a follow-up', action: 'Address requests' },
    { id: 'awaiting', label: 'Awaiting evidence', hint: 'Source or rule evidence is still missing', action: 'Check waiting cases' }
  ],
  Reviewer: [
    { id: 'submitted', label: 'Analyst submissions', hint: 'Prepared cases ready for your decision', action: 'Review submissions' },
    { id: 'demo', label: 'Other demo candidates', hint: 'Rule-eligible without an Analyst handoff', action: 'Explore candidates' },
    { id: 'waiting', label: 'Waiting on Analyst', hint: 'Returned for further evidence', action: 'View return requests' }
  ]
};

function caseState(item, role, handoff) {
  if (role === 'Reviewer') return handoff?.status === 'returned' ? 'waiting' : handoff?.status === 'submitted' ? 'submitted' : 'demo';
  return handoff?.status === 'returned' ? 'returned' : item.status === 'Awaiting evidence' ? 'awaiting' : 'investigate';
}

function caseCopy(item, role, handoff) {
  const state = caseState(item, role, handoff);
  if (state === 'returned') return {
    eyebrow: 'Selected case · returned for evidence', status: 'Returned', tone: 'amber',
    detailLabel: 'Proposed posting', detail: handoff?.ledgerId || 'Not selected',
    next: 'Check the requested evidence and revise your findings',
    noteTitle: 'Reviewer asked', note: handoff?.returnReason || 'Review the return request in the case history.',
    subcopy: 'The shared case keeps its source records and audit history.'
  };
  if (state === 'awaiting') return {
    eyebrow: 'Selected case · awaiting evidence', status: 'Awaiting evidence', tone: 'gray',
    detailLabel: 'Current blocker', detail: item.title,
    next: 'Check whether the missing source is available',
    noteTitle: 'Waiting on evidence', note: item.explanation,
    subcopy: 'No posting can be recommended until the required evidence is available.'
  };
  if (state === 'submitted') return {
    eyebrow: 'Selected case · Analyst submission', status: 'Submitted', tone: 'purple',
    detailLabel: 'Proposed posting', detail: handoff.ledgerId || 'See case',
    next: 'Verify the evidence and record your decision',
    noteTitle: 'Analyst summary', note: handoff.findings || 'Open the case to inspect the Analyst findings.',
    subcopy: 'Approve, return for evidence, or escalate in the shared case.'
  };
  if (state === 'waiting') return {
    eyebrow: 'Selected case · waiting on Analyst', status: 'Returned', tone: 'amber',
    detailLabel: 'Current status', detail: 'Returned for evidence',
    next: 'Wait for the Analyst to revise and resubmit',
    noteTitle: 'Your return request', note: handoff?.returnReason || 'The Analyst is gathering more evidence.',
    subcopy: 'This case is outside your decision queue until it is resubmitted.'
  };
  if (state === 'demo') return {
    eyebrow: 'Selected case · demo candidate', status: 'Demo candidate', tone: 'gray',
    detailLabel: 'Current status', detail: 'No Analyst handoff',
    next: item.amountReview?.required ? 'Verify the source and transaction amount' : 'Inspect the source and rule results',
    noteTitle: 'Why it appears here', note: `${item.explanation} No Analyst evidence has been submitted for this case.`,
    subcopy: 'This candidate is separate from Analyst submissions.'
  };
  return {
    eyebrow: 'Selected case · needs investigation', status: 'Investigate', tone: 'investigate',
    detailLabel: 'Evidence to check', detail: item.title,
    next: 'Compare the source and ledger records',
    noteTitle: 'Why this needs work', note: item.explanation,
    subcopy: 'The case screen shows source records, rule results, and audit history.'
  };
}

export default function Dashboard({
  role, currency, currencies = [], onCurrencyChange, period, model, handoffs = {}, audit = [],
  onRun, onOpenCase, onOpenList, onActivity
}) {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const reviewer = role === 'Reviewer';
  const { cohortCases, matchedCases, unresolvedCases, roleQueue, workStates, unresolvedMinor } = model;
  const cards = WORK_CARDS[role] || WORK_CARDS.Analyst;
  const currentFilter = cards.some(card => card.id === filter) ? filter : 'all';
  const visibleCases = currentFilter === 'all' ? roleQueue : workStates[currentFilter] || [];
  const preview = visibleCases.slice(0, 4);
  const selected = preview.find(item => item.id === selectedId) || preview[0] || null;
  const selectedCopy = selected ? caseCopy(selected, role, handoffs[selected.id]) : null;
  const activeCard = cards.find(card => card.id === currentFilter);
  const matchedPercent = cohortCases.length ? matchedCases.length / cohortCases.length * 100 : 0;
  const latestActivity = audit[0] || null;

  useEffect(() => { setFilter('all'); setSelectedId(null); }, [role, currency]);

  function chooseFilter(nextFilter) { setFilter(nextFilter); setSelectedId(null); }

  return <div className="dashboard-overview ola-dashboard">
    <div className="page-heading">
      <div><h1>Overview</h1><p className="dashboard-role-copy">{reviewer ? 'Reviewer view · Verify prepared evidence and record a decision.' : 'Analyst view · Investigate exceptions and prepare evidence for review.'}</p></div>
      <div className="heading-actions">{currencies.length > 1 && <label className="overview-currency-control">Currency<select aria-label="Dashboard currency" value={currency} onChange={event => onCurrencyChange(event.target.value)}>{currencies.map(code => <option key={code} value={code}>{code}</option>)}</select></label>}<button className="button outline" onClick={onRun}><ArrowsClockwise size={14}/>Run check again</button></div>
    </div>

    <section className="ola-dashboard-cards" aria-label={`${role} work states`}>
      {cards.map((card, index) => <button key={card.id} type="button" className={`ola-dashboard-card ${index === 0 ? 'ola-dashboard-card-primary' : ''} ${currentFilter === card.id ? 'is-selected' : ''}`} onClick={() => chooseFilter(card.id)} aria-pressed={currentFilter === card.id}>
        <span className="ola-dashboard-count">{workStates[card.id]?.length || 0}</span>
        <span className="ola-dashboard-card-label">{card.label}</span>
        <span className="ola-dashboard-card-hint">{card.hint}</span>
        <span className="ola-dashboard-card-action">{card.action} <ArrowRight size={12}/></span>
      </button>)}
    </section>

    <section className="ola-dashboard-work" aria-label={reviewer ? 'Reviewer decisions' : 'Analyst work'}>
      <div className="ola-dashboard-work-heading"><h2>{reviewer ? 'Decisions' : 'Your work'}</h2><span>{reviewer ? 'Analyst submissions first, then eligible demo candidates' : 'Returned requests first, then oldest unresolved collection'}</span></div>
      <div className="ola-dashboard-work-layout">
        <div className="ola-dashboard-queue">
          <div className="ola-dashboard-queue-head"><strong>{activeCard ? `${activeCard.label} · preview` : reviewer ? 'Review queue preview' : 'Work queue preview'}</strong>{currentFilter !== 'all' && <button type="button" className="ola-dashboard-text-action" onClick={() => chooseFilter('all')}>Show all preview cases <ArrowRight size={12}/></button>}</div>
          {preview.length ? <div className="ola-dashboard-queue-list">
            {reviewer && currentFilter === 'all' && !workStates.submitted.length && <p className="ola-dashboard-queue-caption">No Analyst submissions yet. These are eligible demo candidates.</p>}
            {preview.map((item, index) => {
              const copy = caseCopy(item, role, handoffs[item.id]);
              const previous = preview[index - 1];
              const showGroup = reviewer && currentFilter === 'all' && workStates.submitted.length > 0 && (index === 0 || (handoffs[previous.id]?.status === 'submitted' && handoffs[item.id]?.status !== 'submitted'));
              return <React.Fragment key={item.id}>
                {showGroup && <div className="ola-dashboard-group-label">{handoffs[item.id]?.status === 'submitted' ? 'Analyst submissions' : 'Other demo candidates'}</div>}
                <button type="button" className={`ola-dashboard-queue-row ${selected?.id === item.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(item.id)} aria-pressed={selected?.id === item.id} aria-controls="ola-dashboard-selected-case" aria-label={`Select ${item.collection.counterparty} case ${item.id}: ${item.title}, ${money(item.collection.amount, currency)}`}>
                  <span className="ola-dashboard-row-main"><strong>{item.collection.counterparty}</strong><small>{item.title}{copy.status === 'Returned' && handoffs[item.id]?.returnReason ? ' · Reviewer requested more evidence' : copy.status === 'Submitted' ? ` · Proposed ${handoffs[item.id]?.ledgerId || 'posting'}` : ''}</small></span>
                  <span className="ola-dashboard-row-side"><strong>{money(item.collection.amount, currency)}</strong><span className={`ola-dashboard-badge ${copy.tone}`}>{copy.status}</span></span>
                </button>
              </React.Fragment>;
            })}
          </div> : <div className="ola-dashboard-empty"><strong>{activeCard ? 'No cases in this state' : reviewer ? 'No review candidates' : 'No cases in your work queue'}</strong><p>{reviewer && currentFilter === 'submitted' ? 'Analyst submissions will appear here after evidence is sent for review.' : currentFilter === 'waiting' ? 'No cases are currently waiting for an Analyst response.' : 'Cases in this state will appear here when they need attention.'}</p></div>}
          <div className="ola-dashboard-queue-footer"><span>Showing {preview.length} of {visibleCases.length} cases{activeCard ? ` · ${activeCard.label}` : ''}</span><button type="button" className="ola-dashboard-text-action" onClick={() => onOpenList(currentFilter === 'waiting' ? {} : { review: true })}>{currentFilter === 'waiting' ? 'View all transactions' : reviewer ? 'Open review candidates' : 'Open work queue'} <ArrowRight size={12}/></button></div>
        </div>

        <aside id="ola-dashboard-selected-case" className="ola-dashboard-focus" aria-live="polite">
          {selected ? <>
            <span className="ola-dashboard-eyebrow">{selectedCopy.eyebrow}</span>
            <h3>{selected.collection.counterparty}</h3>
            <strong className="ola-dashboard-amount">{money(selected.collection.amount, currency)} {currency}</strong>
            <dl><div><dt>Issue</dt><dd>{selected.title}</dd></div><div><dt>{selectedCopy.detailLabel}</dt><dd>{selectedCopy.detail}</dd></div><div><dt>Next step</dt><dd>{selectedCopy.next}</dd></div></dl>
            <p className="ola-dashboard-note"><strong>{selectedCopy.noteTitle}</strong>{selectedCopy.note}</p>
            <button type="button" className="button primary ola-dashboard-primary-action" onClick={() => onOpenCase(selected.id)}>Open case<ArrowRight size={13}/></button>
            <span className="ola-dashboard-subcopy">{selectedCopy.subcopy}</span>
          </> : <><span className="ola-dashboard-eyebrow">Selected case</span><h3>Nothing to open here</h3><p className="ola-dashboard-focus-empty">Choose another work state or use the full queue to explore cases.</p></>}
        </aside>
      </div>
    </section>

    <section className="ola-dashboard-health" aria-label="Shared operations health">
      <div className="ola-dashboard-health-heading"><h2>Operations health</h2><p>Shared context · {period}</p></div>
      <div className="ola-dashboard-health-grid">
        <div className="ola-dashboard-health-card"><span>Reconciliation</span><strong>{matchedCases.length} of {cohortCases.length} matched</strong><div className="ola-dashboard-progress" role="progressbar" aria-label="Matched transactions" aria-valuemin={0} aria-valuemax={Math.max(cohortCases.length, 1)} aria-valuenow={matchedCases.length} aria-valuetext={`${matchedCases.length} of ${cohortCases.length} transactions matched`}><span style={{ width: `${matchedPercent}%` }}/></div><p>{unresolvedCases.length} collection{unresolvedCases.length === 1 ? '' : 's'} remain unresolved in {currency}.</p><button type="button" onClick={() => onOpenList({ matched: true })}>View matched records <ArrowRight size={12}/></button></div>
        <div className="ola-dashboard-health-card"><span>Unresolved collection value</span><strong>{formatMinorMoney(unresolvedMinor, currency)} {currency}</strong><p>Financial context for this currency, separate from task counts.</p><button type="button" onClick={() => onOpenList({ unresolved: true })}>Inspect unresolved collections <ArrowRight size={12}/></button></div>
        <div className="ola-dashboard-health-card"><span>Recent activity</span><strong>{latestActivity?.action || 'No activity yet'}</strong><p>{latestActivity ? `${latestActivity.caseId || 'Workspace event'} · ${displayTime(latestActivity.time)}` : 'Case actions will appear in the audit history.'}</p><button type="button" onClick={onActivity}>View activity <ArrowRight size={12}/></button></div>
      </div>
    </section>
  </div>;
}
