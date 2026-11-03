import React, { useEffect, useState } from 'react';
import { Check, X, Database, FileCsv, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import { money } from './engine';

export default function BatchPlayback({ cases, ledgerCount, newFileProcessed, onClose }) {
  const [step, setStep] = useState(-1);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const complete = step >= cases.length;
  const matched = cases.filter(item => ['Auto matched', 'Reviewed match'].includes(item.status)).length;
  const current = cases[Math.min(Math.max(step, 0), cases.length - 1)];

  useEffect(() => {
    if (reducedMotion) { setStep(cases.length); return; }
    if (step >= cases.length) return;
    const timer = window.setTimeout(() => setStep(value => value + 1), step < 0 ? 800 : 540);
    return () => window.clearTimeout(timer);
  }, [step, cases.length, reducedMotion]);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return <div className="batch-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="batch-playback" role="dialog" aria-modal="true" aria-labelledby="batch-title">
      <div className="batch-playback-head"><div><span className="batch-playback-kicker">RECONCILIATION RUN · SYNTHETIC DATA</span><h2 id="batch-title">{complete ? 'Check complete' : 'Checking the batch'}</h2><p>{complete ? 'Each collection has a recorded outcome.' : 'Comparing collection references, amounts, currencies, and times with the ledger.'}</p></div><button className="batch-close" aria-label="Close playback" onClick={onClose}><X size={19} /></button></div>
      <div className="batch-inputs"><div><FileCsv size={19} /><span>Collection report</span><strong>{cases.length} records</strong></div><span className="batch-input-line" /><div><Database size={19} /><span>Ledger postings</span><strong>{ledgerCount} records</strong></div></div>
      <div className="batch-progress" role="progressbar" aria-valuenow={Math.max(0, Math.min(step + 1, cases.length))} aria-valuemin="0" aria-valuemax={cases.length} aria-label="Collections checked"><span style={{ width: `${Math.max(0, Math.min((step + 1) / cases.length, 1)) * 100}%` }} /></div>
      <div className="batch-progress-label"><span>{complete ? 'All collections checked' : step < 0 ? 'Reading the source files' : `Checking ${current.id} · ${current.collection.counterparty}`}</span><strong>{Math.max(0, Math.min(step + 1, cases.length))} / {cases.length}</strong></div>
      <div className="batch-results">{cases.map((item, index) => <div key={item.id} className={`batch-result ${index <= step ? 'revealed' : ''} ${index === step && !complete ? 'current' : ''}`}><span className="batch-result-icon">{index <= step ? ['Auto matched', 'Reviewed match'].includes(item.status) ? <Check size={15} weight="bold" /> : <WarningCircle size={15} /> : <span />}</span><span className="batch-result-name"><strong>{item.id}</strong><small>{item.collection.counterparty}</small></span><span className="batch-result-amount">{money(item.collection.amount)}</span><span className={`batch-result-status ${['Auto matched', 'Reviewed match'].includes(item.status) ? 'matched' : 'review'}`}>{index <= step ? item.status : 'Waiting'}</span></div>)}</div>
      <div className="batch-playback-foot"><div className="batch-summary"><ShieldCheck size={20} /><span><strong>{complete ? `${matched} matched · ${cases.length - matched} need attention` : newFileProcessed ? 'Checking the newly received ledger file' : 'Reviewer decisions are preserved'}</strong><small>{complete && newFileProcessed ? 'The later ledger posting has been included in this run.' : complete ? 'Uncertain cases stay open for review.' : 'Automatic closure requires one unique, exact match.'}</small></span></div><button className="button primary" onClick={onClose}>{complete ? 'View updated workspace' : 'Skip playback'}</button></div>
      <p className="batch-demo-note">Playback visualizes this demo’s rule results. It does not connect to a bank system.</p>
    </section>
  </div>;
}
