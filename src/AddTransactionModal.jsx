import React, { useEffect, useId, useRef, useState } from 'react';
import { WarningCircle, X } from '@phosphor-icons/react';
import './manual-transaction.css';

function singaporeDateTime() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

export default function AddTransactionModal({ onClose, onSubmit }) {
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const errorRef = useRef(null);
  const id = useId();
  const [error, setError] = useState('');
  const [fields, setFields] = useState(() => ({
    counterparty: '', reference: '', amount: '', currency: 'SGD',
    time: singaporeDateTime(), channel: 'Bank transfer'
  }));

  useEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    firstFieldRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  function update(field, value) {
    setFields(current => ({ ...current, [field]: value }));
    if (error) setError('');
  }

  function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const localTime = `${fields.time}${fields.time.length === 16 ? ':00' : ''}+08:00`;
      const recordedTime = new Date(localTime);
      if (!Number.isFinite(recordedTime.getTime())) throw new Error('Enter a valid transaction date and time.');
      onSubmit({
        counterparty: fields.counterparty.trim(), reference: fields.reference.trim(),
        amount: fields.amount, currency: fields.currency,
        time: recordedTime.toISOString(), channel: fields.channel
      });
    } catch (submissionError) {
      setError(submissionError?.message || 'The transaction could not be added. Check the fields and try again.');
    }
  }

  function closeFromBackdrop(event) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }

  return <dialog ref={dialogRef} className="manual-transaction-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onClick={closeFromBackdrop} onCancel={event => { event.preventDefault(); onClose(); }}>
    <form onSubmit={submit} className="manual-transaction-form">
      <header className="manual-transaction-header"><div><h2 id={`${id}-title`}>Add transaction</h2><p id={`${id}-description`}>Create a collection record for reconciliation.</p></div><button type="button" className="manual-transaction-close" onClick={onClose} aria-label="Close add transaction"><X size={18}/></button></header>
      <div className="manual-transaction-fields">
        {error && <div className="manual-transaction-error" role="alert" tabIndex={-1} ref={errorRef}><WarningCircle size={17}/><span>{error}</span></div>}
        <div className="manual-transaction-field"><label htmlFor={`${id}-counterparty`}>Counterparty <span>Required</span></label><input ref={firstFieldRef} id={`${id}-counterparty`} name="counterparty" autoComplete="organization" required maxLength={120} value={fields.counterparty} onChange={event => update('counterparty', event.target.value)} placeholder="Enter the customer or business name"/></div>
        <div className="manual-transaction-field"><label htmlFor={`${id}-reference`}>Payment reference <span>Required</span></label><input id={`${id}-reference`} name="reference" autoComplete="off" required maxLength={100} value={fields.reference} onChange={event => update('reference', event.target.value)} placeholder="Enter the collection reference"/></div>
        <div className="manual-transaction-money-row"><div className="manual-transaction-field"><label htmlFor={`${id}-amount`}>Amount <span>Required</span></label><input id={`${id}-amount`} name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required value={fields.amount} onChange={event => update('amount', event.target.value)} placeholder="0.00"/></div><div className="manual-transaction-field"><label htmlFor={`${id}-currency`}>Currency <span>Required</span></label><select id={`${id}-currency`} name="currency" required value={fields.currency} onChange={event => update('currency', event.target.value)}><option value="SGD">SGD</option><option value="USD">USD</option></select></div></div>
        <div className="manual-transaction-field"><label htmlFor={`${id}-time`}>Transaction date and time <span>Required</span></label><input id={`${id}-time`} name="time" type="datetime-local" step="60" required aria-describedby={`${id}-timezone`} value={fields.time} onChange={event => update('time', event.target.value)}/><p id={`${id}-timezone`} className="manual-transaction-field-help">Singapore time (SGT, UTC+08:00).</p></div>
        <div className="manual-transaction-field"><label htmlFor={`${id}-channel`}>Payment method <span>Required</span></label><select id={`${id}-channel`} name="channel" required value={fields.channel} onChange={event => update('channel', event.target.value)}><option>PayNow QR</option><option>Card collection</option><option>Bank transfer</option><option value="Cross-border">Cross-border</option></select></div>
      </div>
      <footer className="manual-transaction-footer"><p>Recorded in this demo workspace. Matching rules apply automatically.</p><div><button type="button" className="button outline" onClick={onClose}>Cancel</button><button type="submit" className="button primary">Add transaction</button></div></footer>
    </form>
  </dialog>;
}
