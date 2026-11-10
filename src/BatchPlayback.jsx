import React, { useEffect, useRef, useState } from 'react';
import { Check, X, Database, FileCsv, Pause, Play, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import { money } from './engine';
import './playback.css';

const isAutomaticMatch = item => item.status === 'Auto matched' && item.category === 'auto' && !item.amountReview?.required;
const isHumanVerified = item => item.status === 'Reviewed match';
const isMatched = item => isAutomaticMatch(item) || isHumanVerified(item);
const outcomeLabel = item => isHumanVerified(item) ? 'Human verified' : item.amountReview?.required && item.status === 'Needs review' ? 'Verify large amount' : item.status;
const ROW_DURATION_MS = 280;
const SOURCE_DURATION_MS = 250;

export default function BatchPlayback({ cases, ledgerCount, newFileProcessed, onClose }) {
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const closeRef = useRef(null);
  const toggleRef = useRef(null);
  const continueRef = useRef(null);
  const dialogRef = useRef(null);
  const resultsRef = useRef(null);
  const activeRowRef = useRef(null);
  const remaining = useRef(SOURCE_DURATION_MS);
  const complete = cases.length === 0 || step >= cases.length;
  const checkedCount = Math.max(0, Math.min(step + 1, cases.length));
  const progress = cases.length ? checkedCount / cases.length * 100 : 0;
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
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = event => setReducedMotion(event.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!reducedMotion) return;
    if (document.activeElement === toggleRef.current) continueRef.current?.focus({ preventScroll: true });
    setStep(cases.length);
    setPlaying(false);
  }, [reducedMotion, cases.length]);
  useEffect(() => {
    if (!playing || reducedMotion || complete) return;
    const deadline = performance.now() + remaining.current;
    let completed = false;
    const timer = window.setTimeout(() => {
      completed = true;
      remaining.current = ROW_DURATION_MS;
      const next = step + 1;
      if (next >= cases.length) {
        if (document.activeElement === toggleRef.current) continueRef.current?.focus({ preventScroll: true });
        setPlaying(false);
      }
      setStep(next);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (!completed) remaining.current = Math.max(0, deadline - performance.now());
    };
  }, [step, cases.length, reducedMotion, playing, complete]);
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
      <div className="batch-progress" role="progressbar" aria-valuenow={checkedCount} aria-valuemin="0" aria-valuemax={Math.max(cases.length, 1)} aria-valuetext={`${checkedCount} of ${cases.length} collections checked${!complete && !playing ? '. Playback paused.' : ''}`} aria-label="Collections checked"><span style={{ width: `${progress}%` }} /></div>
      <div className="batch-progress-label"><span>{complete ? 'All collections checked' : !playing ? step < 0 ? 'Paused before reading the source files' : `Paused at ${current.id} · ${current.collection.counterparty}` : step < 0 ? 'Reading the source files' : `Checking ${current.id} · ${current.collection.counterparty}`}</span><strong>{checkedCount} / {cases.length}</strong></div>
      <div ref={resultsRef} className="batch-results"><div className="batch-table-head"><span>Collection</span><span>Amount</span><span>Outcome</span></div>{cases.map((item, index) => <div ref={index === step ? activeRowRef : null} key={item.id} className={`batch-result ${index <= step ? 'revealed' : ''} ${index === step && !complete ? 'current' : ''}`}><span className="batch-result-icon">{index <= step ? isMatched(item) ? <Check size={14} weight="bold" /> : <WarningCircle size={15} /> : <span />}</span><span className="batch-result-name"><strong>{item.id}</strong><small>{item.collection.counterparty}</small></span><span className="batch-result-amount">{money(item.collection.amount, item.collection.currency)}</span><span className={`batch-result-status ${isMatched(item) ? 'matched' : 'review'}`}>{index <= step ? outcomeLabel(item) : 'Waiting'}</span></div>)}</div>
      <div className="batch-playback-foot"><div className="batch-summary"><ShieldCheck size={20} /><span><strong>{complete ? `${matched} matched · ${cases.length - matched} need attention` : newFileProcessed ? 'Checking the newly received ledger file' : 'Reviewer decisions are preserved'}</strong><small>{complete ? `${automatic} automatic · ${humanVerified} human verified${newFileProcessed ? ' · New ledger file included' : ''}` : 'Large transactions require human verification.'}</small></span></div><div className="batch-playback-actions">{!complete && <button key="toggle" ref={toggleRef} type="button" className="button outline" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause batch playback' : 'Resume batch playback'}>{playing ? <Pause size={13} weight="fill"/> : <Play size={13} weight="fill"/>}{playing ? 'Pause' : 'Resume'}</button>}<button key="continue" ref={continueRef} className="button primary" onClick={onClose}>{complete ? 'View updated workspace' : 'Skip playback'}</button></div></div>
      <p className="batch-demo-note">Playback visualizes this demo’s rule results. It does not connect to a bank system.</p>
    </section>
  </div>;
}
