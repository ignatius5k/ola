import React, { useId, useState } from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import './chart.css';

const dateKey = time => new Intl.DateTimeFormat('en-SG', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore'
}).format(time);

export default function CumulativeChart({ records, label, currency = 'SGD', timeline = records }) {
  const [replay, setReplay] = useState(0);
  const revealId = `chart-reveal-${useId().replaceAll(':', '')}`;
  const ordered = [...records].sort((a, b) => new Date(a.time) - new Date(b.time));
  const batchTimes = timeline.map(row => new Date(row.time).getTime()).filter(Number.isFinite);
  if (!batchTimes.length) return <div className="metric-chart chart-empty">No collection records to display.</div>;

  let total = 0;
  const values = ordered.map(row => (total += row.amount));
  const start = Math.floor(Math.min(...batchTimes) / 3600000) * 3600000;
  const end = Math.max(start + 3600000, Math.ceil(Math.max(...batchTimes) / 3600000) * 3600000);
  const multipleDays = new Set(batchTimes.map(dateKey)).size > 1;
  const axisTime = time => new Intl.DateTimeFormat('en-GB', {
    ...(multipleDays ? { day: 'numeric', month: 'short' } : {}),
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Singapore'
  }).format(time);
  const rawStep = (total || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = Math.max(0.01, [1, 2, 2.5, 5, 10].find(value => value >= rawStep / magnitude) * magnitude);
  const scale = Math.ceil((total || 1) / step) * step;
  const tickCount = Math.round(scale / step);
  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => index * step);
  const formatAmount = new Intl.NumberFormat('en-SG', {
    notation: scale >= 1_000_000 ? 'compact' : 'standard',
    minimumFractionDigits: step < 1 ? 2 : 0,
    maximumFractionDigits: scale >= 1_000_000 || step < 1 || step % 1 ? 2 : 0
  });
  const points = ['0,130', ...ordered.map((row, index) =>
    `${Math.max(0, Math.min(400, (new Date(row.time).getTime() - start) / (end - start) * 400))},${130 - values[index] / scale * 130}`
  ), `400,${130 - total / scale * 130}`];
  const xTicks = Array.from({ length: 5 }, (_, index) => ({
    position: index * 25, time: start + (end - start) * index / 4
  }));

  return <div className="metric-chart labeled-chart">
    <div className="chart-heading"><div className="chart-y-title chart-axis-title" key={replay}>Cumulative amount ({currency})</div><button type="button" className="chart-replay" onClick={() => setReplay(value => value + 1)} aria-label="Replay chart animation"><ArrowCounterClockwise size={12} aria-hidden="true"/>Replay</button></div>
    <div className="chart-motion-scene" key={replay}>
      <div className="chart-plot-layout">
        <div className="chart-y-ticks" aria-hidden="true">{yTicks.map(value => <span key={value} style={{ top: `${100 - value / scale * 100}%` }}><span className="chart-axis-label">{formatAmount.format(value)}</span></span>)}</div>
        <div className="chart-plot"><svg viewBox="0 0 400 130" preserveAspectRatio="none" role="img" aria-label={label}>
          <defs><clipPath id={revealId} clipPathUnits="userSpaceOnUse"><rect className="chart-reveal-mask" x="-2" y="-3" width="404" height="136"/></clipPath></defs>
          {yTicks.map(value => <line key={value} className="chart-grid-line" x1="0" x2="400" y1={130 - value / scale * 130} y2={130 - value / scale * 130} stroke="currentColor" />)}
          <line className="chart-axis-line" x1="0" x2="0" y1="0" y2="130" />
          <line className="chart-axis-line" x1="0" x2="400" y1="130" y2="130" />
          {xTicks.map(({ position }) => <line key={position} className="chart-axis-line" x1={position * 4} x2={position * 4} y1="130" y2="134" />)}
          <g clipPath={`url(#${revealId})`}><polyline className="chart-series" points={points.join(' ')} fill="none" stroke="var(--stripe-purple)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></g>
        </svg></div>
      </div>
      <div className={`chart-axis chart-x-ticks ${multipleDays ? 'chart-multiday' : ''}`} aria-hidden="true">{xTicks.map(({ position, time }, index) => <span key={position} className={`chart-x-tick tick-${index}`} style={{ left: `${position}%` }}><span className="chart-axis-label">{axisTime(time)}</span></span>)}</div>
      <div className="chart-x-title chart-axis-title">Collection time (SGT)</div>
    </div>
  </div>;
}
