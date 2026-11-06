import React, { useEffect, useRef, useState } from 'react';
import { Check, X, Database, FileCsv, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import { money } from './engine';
import './playback.css';

const isAutomaticMatch = item => item.status === 'Auto matched' && item.category === 'auto' && !item.amountReview?.required;
const isHumanVerified = item => item.status === 'Reviewed match';
const isMatched = item => isAutomaticMatch(item) || isHumanVerified(item);
const outcomeLabel = item => isHumanVerified(item) ? 'Human verified' : item.amountReview?.required && item.status === 'Needs review' ? 'Verify large amount' : item.status;

export default function BatchPlayback({ cases, ledgerCount, newFileProcessed, onClose }) {
  const [step, setStep] = useState(-1);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const resultsRef = useRef(null);
  const activeRowRef = useRef(null);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const complete = step >= cases.length;
  const automatic = cases.filter(isAutomaticMatch).length;
  const humanVerified = cases.filter(isHumanVerified).length;
  const matched = automatic + humanVerified;
  const current = cases[Math.min(Math.max(step, 0), cases.length - 1)];

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (reducedMotion) { setStep(cases.length); return; }
    if (step >= cases.length) return;
    const timer = window.setTimeout(() => setStep(value => value + 1), step < 0 ? 800 : 540);
    return () => window.clearTimeout(timer);
  }, [step, cases.length, reducedMotion]);
  useEffect(() => {
    const container = resultsRef.current;
    const row = activeRowRef.current;
    if (!container || !row) return;
    const containerBounds = container.getBoundingClientRect();
    const rowBounds = row.getBoundingClientRect();
    const headerHeight = container.firstElementChild?.offsetHeight || 0;
    const bottomOverflow = rowBounds.bottom - containerBounds.bottom;
    const topOverflow = rowBounds.top - containerBounds.top - headerHeight;
    if (bottomOverflow > 0) container.scrollBy({ top: bottomOverflow + 4, behavior: reducedMotion ? 'auto' : 'smooth' });
    else if (topOverflow < 0) container.scrollBy({ top: topOverflow - 4, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [step, reducedMotion]);
  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return <div className="batch-backdrop stripe-batch-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="batch-playback" role="dialog" aria-modal="true" aria-labelledby="batch-title">
      <div className="batch-playback-head"><div><span className="batch-playback-kicker">Reconciliation run <span>Simulation</span></span><h2 id="batch-title">{complete ? 'Check complete' : 'Checking the batch'}</h2><p>{complete ? 'Each collection has a recorded outcome.' : 'Comparing collection references, amounts, currencies, times, and review thresholds.'}</p></div><button ref={closeRef} className="batch-close" aria-label="Close playback" onClick={onClose}><X size={19} /></button></div>
      <div className="batch-inputs"><div><FileCsv size={19} /><span>Collection report</span><strong>{cases.length} records</strong></div><span className="batch-input-line" /><div><Database size={19} /><span>Ledger postings</span><strong>{ledgerCount} records</strong></div></div>
      <div className="batch-progress" role="progressbar" aria-valuenow={Math.max(0, Math.min(step + 1, cases.length))} aria-valuemin="0" aria-valuemax={cases.length} aria-label="Collections checked"><span style={{ width: `${Math.max(0, Math.min((step + 1) / cases.length, 1)) * 100}%` }} /></div>
      <div className="batch-progress-label"><span>{complete ? 'All collections checked' : step < 0 ? 'Reading the source files' : `Checking ${current.id} · ${current.collection.counterparty}`}</span><strong>{Math.max(0, Math.min(step + 1, cases.length))} / {cases.length}</strong></div>
      <div ref={resultsRef} className="batch-results"><div className="batch-table-head"><span>Collection</span><span>Amount</span><span>Outcome</span></div>{cases.map((item, index) => <div ref={index === step ? activeRowRef : null} key={item.id} className={`batch-result ${index <= step ? 'revealed' : ''} ${index === step && !complete ? 'current' : ''}`}><span className="batch-result-icon">{index <= step ? isMatched(item) ? <Check size={14} weight="bold" /> : <WarningCircle size={15} /> : <span />}</span><span className="batch-result-name"><strong>{item.id}</strong><small>{item.collection.counterparty}</small></span><span className="batch-result-amount">{money(item.collection.amount, item.collection.currency)}</span><span className={`batch-result-status ${isMatched(item) ? 'matched' : 'review'}`}>{index <= step ? outcomeLabel(item) : 'Waiting'}</span></div>)}</div>
      <div className="batch-playback-foot"><div className="batch-summary"><ShieldCheck size={20} /><span><strong>{complete ? `${matched} matched · ${cases.length - matched} need attention` : newFileProcessed ? 'Checking the newly received ledger file' : 'Reviewer decisions are preserved'}</strong><small>{complete ? `${automatic} automatic · ${humanVerified} human verified${newFileProcessed ? ' · New ledger file included' : ''}` : 'Large transactions require human verification.'}</small></span></div><button className="button primary" onClick={onClose}>{complete ? 'View updated workspace' : 'Skip playback'}</button></div>
      <p className="batch-demo-note">Playback visualizes this demo’s rule results. It does not connect to a bank system.</p>
    </section>
  </div>;
}
