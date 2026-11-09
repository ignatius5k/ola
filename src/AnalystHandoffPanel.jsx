import React from 'react';
import { displayTime, money } from './engine';
import './handoff.css';

export function HandoffSummary({ handoff, currency }) {
  if (!handoff || handoff.status === 'returned') return null;
  return <div className="handoff-summary" aria-label="Analyst submission">
    <span className="handoff-eyebrow">Analyst submission · demo</span>
    <strong>Proposed match: {handoff.ledgerId}</strong>
    <p>{handoff.findings}</p>
    <small>Sent {displayTime(handoff.submittedAt)} · Revision {handoff.revision} · {currency}</small>
  </div>;
}

export default function AnalystHandoffPanel({ item, handoff, eligibleCandidates, ledgerId, onLedgerIdChange, findings, onFindingsChange, onSubmit }) {
  const submitted = handoff?.status === 'submitted';
  const ready = item.status === 'Needs review' && eligibleCandidates.length > 0;
  const canSend = ready && eligibleCandidates.some(row => row.id === ledgerId) && Boolean(findings.trim());
  return <section className="decision-panel persistent-review-panel analyst-handoff-panel" aria-labelledby="handoff-panel-title">
    <h2 id="handoff-panel-title">Investigation handoff</h2>
    <p className="handoff-intro">Compare the source records, then send your proposed match and evidence summary to the Reviewer.</p>
    <p className="handoff-case-brief"><strong>{item.title}</strong><span>{item.explanation}</span></p>
    <a className="text-button handoff-source-link" href="#source-records">View source records</a>
    {handoff?.status === 'returned' && <div className="handoff-return" role="status"><strong>Returned for more evidence</strong><p>{handoff.returnReason}</p></div>}
    {submitted ? <><HandoffSummary handoff={handoff} currency={item.collection.currency}/><p className="handoff-helper">This demo handoff is saved in this browser. Switch to Reviewer to test the decision step.</p></>
      : !ready ? <p className="handoff-blocked">This case has no eligible posting to recommend yet. Inspect the matching checks and source records for the missing evidence.</p>
        : <form onSubmit={event => { event.preventDefault(); onSubmit(); }}>
          <label htmlFor="handoff-candidate">Proposed ledger posting <span>Required</span></label>
          <select id="handoff-candidate" value={ledgerId} onChange={event => onLedgerIdChange(event.target.value)} required>
            <option value="">Choose a posting</option>
            {eligibleCandidates.map(row => <option key={row.id} value={row.id}>{row.id} · {money(row.amount, row.currency)}</option>)}
          </select>
          <label htmlFor="handoff-findings">Evidence summary <span>Required</span></label>
          <textarea id="handoff-findings" rows="5" value={findings} onChange={event => onFindingsChange(event.target.value)} placeholder="What did you compare? What supports this proposed match?" required/>
          <p className="handoff-helper">The Reviewer will see this summary alongside the same source records and rule checks.</p>
          <button className="button primary" type="submit" disabled={!canSend}>Send for review</button>
        </form>}
  </section>;
}
