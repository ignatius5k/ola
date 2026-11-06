import React, { useState } from 'react';
import { ArrowRight, ArrowsClockwise, CaretDown, CheckCircle, ClockCounterClockwise, Flag, Info } from '@phosphor-icons/react';
import { displayTime, money } from './engine';
import CumulativeChart from './CumulativeChart';
import './dashboard.css';

function ReviewBadge({ status }) {
  const tone = status === 'Needs review' ? 'warning' : status === 'Escalated' ? 'danger' : 'neutral';
  return <span className={`badge ${tone}`}>{status}</span>;
}

export default function Dashboard({
  currency, currencies = [], onCurrencyChange, period, records = [], cases = [],
  matchedCases = [], attentionCases = [], largePending = [], nextReview, audit = [],
  totalValue = 0, matchedValue = 0, onRun, onOpenCase, onOpenList, onActivity
}) {
  const [metric, setMetric] = useState('review');
  const metrics = {
    review: {
      label: 'Amount requiring review', value: totalValue - matchedValue,
      count: `${attentionCases.length} open transaction${attentionCases.length === 1 ? '' : 's'}`,
      records: attentionCases.map(item => item.collection),
      description: 'Cumulative unresolved collection value by collection time.',
      chartLabel: `Cumulative unresolved collection value in ${currency}, by collection time.`,
      link: 'View review queue', target: { review: true }
    },
    collection: {
      label: 'Collection volume', value: totalValue,
      count: `${records.length} collection record${records.length === 1 ? '' : 's'}`,
      records,
      description: 'Cumulative collection value by collection time.',
      chartLabel: `Cumulative collection value in ${currency}, by collection time.`,
      link: 'View transactions', target: {}
    },
    matched: {
      label: 'Matched amount', value: matchedValue,
      count: `${matchedCases.length} automatic or reviewed ${matchedCases.length === 1 ? 'match' : 'matches'}`,
      records: matchedCases.map(item => item.collection),
      description: 'Cumulative matched collection value by collection time.',
      chartLabel: `Cumulative matched collection value in ${currency}, by collection time.`,
      link: 'View matched transactions', target: { matched: true }
    }
  };
  const selectedMetric = metrics[metric];
  const next = nextReview || null;
  const matchedPercent = cases.length ? matchedCases.length / cases.length * 100 : 0;

  return <div className="dashboard-overview">
    <div className="page-heading"><h1>Overview</h1><div className="heading-actions">{currencies.length > 1 && <label className="overview-currency-control">Currency<select aria-label="Dashboard currency" value={currency} onChange={event => onCurrencyChange(event.target.value)}>{currencies.map(code => <option key={code} value={code}>{code}</option>)}</select></label>}<button className="button outline" onClick={onRun}><ArrowsClockwise size={14}/>Run check again</button></div></div>

    <div className="today-layout"><section className="today-summary" aria-label="Reconciliation metric"><div className="today-labels"><label className="dashboard-metric-control"><span className="sr-only">Overview metric</span><select aria-label="Overview metric" value={metric} onChange={event => setMetric(event.target.value)}>{Object.entries(metrics).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select><CaretDown size={12} aria-hidden="true"/></label><span>{period}</span></div><div className="dashboard-metric-readout" key={`${metric}-${currency}`}><div aria-live="polite" aria-atomic="true"><strong className="today-volume">{money(selectedMetric.value, currency)}</strong><span className="metric-subtitle">{selectedMetric.count}</span></div><CumulativeChart records={selectedMetric.records} timeline={records} currency={currency} label={selectedMetric.chartLabel}/></div><div className="dashboard-metric-context"><span>{selectedMetric.description}</span><button className="text-button" onClick={() => onOpenList(selectedMetric.target)}>{selectedMetric.link}<ArrowRight size={12}/></button></div></section>
      <aside className="today-recommendations dashboard-next-review"><h3>Next review {next && <ReviewBadge status={next.status}/>}</h3>{next ? <><strong className="dashboard-next-merchant">{next.collection.counterparty}</strong><strong className="widget-value">{money(next.collection.amount, currency)}</strong><p className="dashboard-next-reason">{next.category === 'high-value' && next.amountReview?.threshold != null ? `Human verification required at ${money(next.amountReview.threshold, currency)}.` : next.title || next.explanation}</p><button className="button primary dashboard-review-button" onClick={() => onOpenCase(next.id)}>Review transaction<ArrowRight size={13}/></button><button className="text-button dashboard-all-reviews" onClick={() => onOpenList({ review: true })}>View all reviews<ArrowRight size={12}/></button></> : <div className="dashboard-next-empty"><CheckCircle size={20}/><strong>{cases.length ? 'All transactions reconciled' : 'No transactions to review'}</strong><p>{cases.length ? `Every ${currency} transaction has a recorded match.` : `No collection records are available in ${currency}.`}</p></div>}</aside>
    </div>

    <div className="overview-heading"><h2>Your overview</h2><span className="date-chip">{currency}</span></div>
    <div className="overview-widget-grid">
      <section className="overview-widget dashboard-review-widget"><h3>Transactions requiring review<Info size={12}/></h3>{attentionCases.length ? <div className="widget-list">{attentionCases.slice(0,3).map(item => <button key={item.id} onClick={() => onOpenCase(item.id)}><span><strong>{item.collection.counterparty}</strong><small title={item.explanation}>{item.title}</small></span><span className="dashboard-review-row-meta"><strong>{money(item.collection.amount, currency)}</strong><ReviewBadge status={item.status}/></span></button>)}</div> : <p className="widget-description">{cases.length ? 'All transactions in this currency are reconciled.' : 'No collection records in this currency.'}</p>}<button className="widget-link" onClick={() => onOpenList({ review: true })}>View all reviews</button></section>

      <section className="overview-widget"><h3>Large transactions<Flag size={12}/></h3><strong className="widget-value">{largePending.length} awaiting verification</strong><p className="widget-description">{largePending.length ? 'Amounts at or above the configured threshold require a reviewer before closure.' : 'No large transactions require verification.'}</p>{largePending.slice(0,1).map(item => <button className="widget-transaction" onClick={() => onOpenCase(item.id)} key={item.id}><span>{item.collection.counterparty}<small>{item.title}</small></span><strong>{money(item.collection.amount, currency)}</strong></button>)}{largePending.length > 0 && <button className="widget-link" onClick={() => onOpenList({ review: true, large: true })}>Review large transactions</button>}</section>

      <section className="overview-widget"><h3>Recent activity<ClockCounterClockwise size={12}/></h3>{audit.length ? <div className="widget-activity">{audit.slice(0,3).map(event => <div key={event.id}><strong>{event.action}</strong><span>{event.caseId || 'Batch'}</span><small>{displayTime(event.time)}</small></div>)}</div> : <p className="widget-description">No activity has been recorded.</p>}<button className="widget-link" onClick={onActivity}>View all activity</button></section>

      <section className="overview-widget"><h3>Reconciliation summary<Info size={12}/></h3><strong className="widget-value">{matchedCases.length} of {cases.length} matched</strong><div className="status-distribution" role="progressbar" aria-label="Matched transactions" aria-valuemin={0} aria-valuemax={Math.max(cases.length,1)} aria-valuenow={matchedCases.length} aria-valuetext={`${matchedCases.length} of ${cases.length} transactions matched`}><span style={{width:`${matchedPercent}%`}}/></div><div className="widget-stat-row"><span><i/>Matched</span><strong>{matchedCases.length}</strong></div><div className="widget-stat-row"><span><i className="amber"/>Requires review</span><strong>{attentionCases.length}</strong></div><button className="widget-link" onClick={() => onOpenList({})}>View all transactions</button></section>
    </div>
  </div>;
}
