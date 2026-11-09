import React, { useId, useState } from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { buildCumulativeSeries } from './features/dashboard/dashboardMetricsModel.js';
import './chart.css';

const dateKey = time => new Intl.DateTimeFormat('en-SG', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore'
}).format(time);

export default function CumulativeChart({ records, label, currency = 'SGD', timeline = records }) {
  const [replay, setReplay] = useState(0);
  const revealId = `chart-reveal-${useId().replaceAll(':', '')}`;
  const series = buildCumulativeSeries(records, timeline);
  if (!series) return <div className="metric-chart chart-empty">No collection records to display.</div>;
  const { batchTimes, start, end, scaleMinor, yTicks, points } = series;
  const multipleDays = new Set(batchTimes.map(dateKey)).size > 1;
  const axisTime = time => new Intl.DateTimeFormat('en-GB', {
    ...(multipleDays ? { day: 'numeric', month: 'short' } : {}),
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Singapore'
  }).format(time);
  const ratio = value => Number(value * 1000000n / scaleMinor) / 1000000;
  const formatAmount = value => {
    const whole = new Intl.NumberFormat('en-SG').format(value / 100n);
    const cents = value % 100n;
    return cents ? `${whole}.${String(cents).padStart(2, '0')}` : whole;
  };
  const xTicks = Array.from({ length: 5 }, (_, index) => ({
    position: index * 25, time: start + (end - start) * index / 4
  }));

  return <div className="metric-chart labeled-chart">
    <div className="chart-heading"><div className="chart-y-title chart-axis-title" key={replay}>Cumulative amount ({currency})</div><button type="button" className="chart-replay" onClick={() => setReplay(value => value + 1)} aria-label="Replay chart animation"><ArrowCounterClockwise size={12} aria-hidden="true"/>Replay</button></div>
    <div className="chart-motion-scene" key={replay}>
      <div className="chart-plot-layout">
        <div className="chart-y-ticks" aria-hidden="true">{yTicks.map((value, index) => <span key={index} style={{ top: `${100 - ratio(value) * 100}%` }}><span className="chart-axis-label">{formatAmount(value)}</span></span>)}</div>
        <div className="chart-plot"><svg viewBox="0 0 400 130" preserveAspectRatio="none" role="img" aria-label={label}>
          <defs><clipPath id={revealId} clipPathUnits="userSpaceOnUse"><rect className="chart-reveal-mask" x="-2" y="-3" width="404" height="136"/></clipPath></defs>
          {yTicks.map((value, index) => <line key={index} className="chart-grid-line" x1="0" x2="400" y1={130 - ratio(value) * 130} y2={130 - ratio(value) * 130} stroke="currentColor" />)}
          <line className="chart-axis-line" x1="0" x2="0" y1="0" y2="130" />
          <line className="chart-axis-line" x1="0" x2="400" y1="130" y2="130" />
          {xTicks.map(({ position }) => <line key={position} className="chart-axis-line" x1={position * 4} x2={position * 4} y1="130" y2="134" />)}
          <g clipPath={`url(#${revealId})`}><polyline className="chart-series" points={points.map(point => point.join(',')).join(' ')} fill="none" stroke="var(--stripe-purple)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></g>
        </svg></div>
      </div>
      <div className={`chart-axis chart-x-ticks ${multipleDays ? 'chart-multiday' : ''}`} aria-hidden="true">{xTicks.map(({ position, time }, index) => <span key={position} className={`chart-x-tick tick-${index}`} style={{ left: `${position}%` }}><span className="chart-axis-label">{axisTime(time)}</span></span>)}</div>
      <div className="chart-x-title chart-axis-title">Collection time (SGT)</div>
    </div>
  </div>;
}
