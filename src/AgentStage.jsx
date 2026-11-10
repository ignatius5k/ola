import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowCounterClockwise, CaretRight, Check, Database, MagnifyingGlass, Pause, Play, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import { money } from './engine';
import './playback.css';

const icons = [Database, MagnifyingGlass, Check, ShieldCheck];

function buildSteps(item) {
  const count = item.candidates.length;
  const requiresAmountReview = Boolean(item.amountReview?.required);
  const safe = item.category === 'auto' && !requiresAmountReview;
  const humanVerified = item.status === 'Reviewed match';
  const match = item.candidates.find(row => row.id === (item.decision?.ledgerId || item.autoLedgerId)) || item.candidates[0];
  const exactCount = item.candidates.filter(row => row.reference === item.collection.reference).length;
  const amountReviewCheck = requiresAmountReview ? {
    label: 'Apply transaction value limit',
    value: `${money(item.amountReview.amount, item.amountReview.currency)} meets or exceeds the ${money(item.amountReview.threshold, item.amountReview.currency)} review threshold. Human verification is required.`,
    kind: humanVerified ? 'pass' : 'alert'
  } : null;
  return [
    { name: 'Intake', action: 'Read the collection record', result: `${item.id} · ${item.collection.reference} · ${item.collection.currency} ${item.collection.amount.toFixed(2)}`, evidence: 'The collection report is the source of this case.', checks: [
      { label: 'Identify the collection', value: `${item.id} · ${item.collection.counterparty}` },
      { label: 'Read the search key', value: item.collection.reference },
      { label: 'Read value and currency', value: `${item.collection.currency} ${item.collection.amount.toFixed(2)}` },
      { label: 'Keep the recorded time', value: new Intl.DateTimeFormat('en-SG', { timeStyle: 'short', timeZone: 'Asia/Singapore' }).format(new Date(item.collection.time)) }
    ] },
    { name: 'Record finder', action: `Search for ${item.collection.reference}`, result: `${count} ledger candidate${count === 1 ? '' : 's'} found`, evidence: count ? item.candidates.map(row => `${row.id} · ${row.currency} ${row.amount.toFixed(2)}`).join('  /  ') : 'No ledger row was found in the processed file.', checks: [
      { label: 'Search the exact reference', value: `${exactCount} exact result${exactCount === 1 ? '' : 's'}`, kind: exactCount === 1 ? 'pass' : 'alert' },
      { label: exactCount ? 'Collect candidate IDs' : 'Try nearby value and time', value: count ? item.candidates.map(row => row.id).join(', ') : 'No candidate in the processed ledger', kind: count ? 'pass' : 'alert' },
      { label: 'Check for ambiguity', value: count > 1 ? 'Multiple postings require review' : count === 1 ? 'One candidate to evaluate' : 'Await another source file', kind: count === 1 ? 'pass' : 'alert' }
    ] },
    { name: 'Evidence checker', action: 'Compare records', result: item.checks.at(-1) || item.explanation, evidence: item.checks.join(' · '), checks: item.checks.map((check, index) => ({ label: check, value: index === item.checks.length - 1 ? item.explanation : '', kind: /failed:|more than one|reversal|differs|unexplained|exceeded|no exact|no nearby|blocked|human verification|review threshold/i.test(check) ? 'alert' : 'pass' })) },
    { name: 'Policy gate', action: 'Apply the closure rule', result: humanVerified ? `Human verified: ${match?.id || 'Recorded match'}` : safe ? `Automatic match: ${item.autoLedgerId || match?.id}` : 'Automatic closure blocked', evidence: humanVerified ? `The reviewer’s match and reason are retained. ${requiresAmountReview ? 'The transaction value threshold requires human verification.' : 'The batch does not replace this decision.'}` : safe ? 'Unique reference, exact amount and currency, valid timing, and transaction value below the review threshold.' : item.suggestion, checks: [
      { label: 'Apply automatic closure rule', value: safe ? 'Every automatic matching condition passed' : requiresAmountReview && item.category === 'high-value' ? 'The records match. Transaction value requires human verification.' : 'At least one required condition is not met', kind: safe ? 'pass' : 'alert' },
      ...(amountReviewCheck ? [amountReviewCheck] : []),
      { label: humanVerified ? 'Retain human verification' : safe ? 'Record matched ledger ID' : 'Route to human review', value: humanVerified ? `${match?.id || 'Recorded match'} · ${item.decision?.actor || 'Reviewer'}${item.decision?.note ? ` · ${item.decision.note}` : ''}` : safe ? item.autoLedgerId || match?.id : item.suggestion, kind: safe || humanVerified ? 'pass' : 'alert' },
      { label: 'Respect reviewer decisions', value: 'A batch run does not overwrite a recorded reviewer outcome', kind: 'pass' }
    ] },
  ];
}

const STAGE_DURATION_MS = 2800;
const TOTAL_STAGES = 4;

export default function AgentStage({ item, startKey = 0 }) {
  const steps = useMemo(() => buildSteps(item), [item]);
  // A phase from 0–3 is processing; 4 means all stages have completed.
  const [phase, setPhase] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  const [runId, setRunId] = useState(0);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const remaining = useRef(STAGE_DURATION_MS);
  const followLive = useRef(true);
  const generation = useRef(0);
  const lastStartKey = useRef(0);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = event => setReduced(event.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!startKey || startKey === lastStartKey.current) return;
    lastStartKey.current = startKey;
    generation.current += 1;
    remaining.current = STAGE_DURATION_MS;
    followLive.current = true;
    setRunId(value => value + 1);
    setPhase(reduced ? TOTAL_STAGES : 0);
    setActive(reduced ? TOTAL_STAGES - 1 : 0);
    setPlaying(!reduced);
  }, [startKey, reduced]);

  useEffect(() => {
    if (reduced && phase >= 0 && phase < TOTAL_STAGES) {
      setPhase(TOTAL_STAGES);
      setActive(TOTAL_STAGES - 1);
      setPlaying(false);
    }
  }, [reduced, phase]);

  useEffect(() => {
    if (!playing || phase < 0 || phase >= TOTAL_STAGES) return;
    const currentGeneration = generation.current;
    const deadline = performance.now() + remaining.current;
    let completed = false;
    const timer = window.setTimeout(() => {
      if (currentGeneration !== generation.current) return;
      completed = true;
      remaining.current = STAGE_DURATION_MS;
      const nextPhase = phase + 1;
      setPhase(nextPhase);
      if (followLive.current) setActive(Math.min(nextPhase, TOTAL_STAGES - 1));
      if (nextPhase === TOTAL_STAGES) setPlaying(false);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (!completed && currentGeneration === generation.current) remaining.current = Math.max(0, deadline - performance.now());
    };
  }, [playing, phase, runId]);

  function start() {
    generation.current += 1;
    remaining.current = STAGE_DURATION_MS;
    followLive.current = true;
    setRunId(value => value + 1);
    setPhase(reduced ? TOTAL_STAGES : 0);
    setActive(reduced ? TOTAL_STAGES - 1 : 0);
    setPlaying(!reduced);
  }
  const finished = phase === TOTAL_STAGES;
  const paused = !playing && phase >= 0 && !finished;
  const completedCount = Math.max(0, Math.min(phase, TOTAL_STAGES));
  const shown = phase >= active;
  const selectedDone = active < completedCount;
  const selectedCurrent = active === phase && !finished;
  const safe = item.category === 'auto' && !item.amountReview?.required;
  const humanVerified = item.status === 'Reviewed match';
  const playbackLabel = playing ? 'Pause' : paused ? 'Resume' : finished ? 'Replay' : 'Run investigation';
  const progressLabel = finished ? 'Investigation complete' : phase < 0 ? 'Ready to investigate' : `${steps[phase].name} · ${playing ? 'In progress' : 'Paused'}`;

  return <section className={`agent-stage stripe-agent-stage investigation-motion ${playing ? 'is-playing' : ''} ${paused ? 'is-paused' : ''}`} aria-label="Simulated agent investigation">
    <div className="agent-stage-top">
      <div><span className="stage-kicker"><span className={`stage-live ${playing ? 'on' : ''}`} /> Investigation playback <span className="stage-simulation">Simulation</span></span><h2>Investigation</h2><p>Follow the evidence and review the checks at each stage.</p></div>
      <button className="stage-play" onClick={playing ? () => setPlaying(false) : paused ? () => setPlaying(true) : start} aria-label={`${playbackLabel}${['Pause', 'Resume', 'Replay'].includes(playbackLabel) ? ' investigation' : ''}`}>{playing ? <Pause size={17} weight="fill" /> : finished ? <ArrowCounterClockwise size={17} /> : <Play size={17} weight="fill" />}{playbackLabel}</button>
    </div>
    <div className="investigation-progress">
      <div className="investigation-progress-meta"><span className={playing ? 'running' : ''}>{playing && <span className="investigation-status-dot" />}{progressLabel}</span><span>{completedCount} of {TOTAL_STAGES} stages complete</span></div>
      <div className="investigation-progress-track" role="progressbar" aria-label="Investigation progress" aria-valuemin={0} aria-valuemax={TOTAL_STAGES} aria-valuenow={completedCount} aria-valuetext={progressLabel}>
        <span className="investigation-progress-complete" style={{ width: `${completedCount / TOTAL_STAGES * 100}%` }} />
        {phase >= 0 && !finished && <span className="investigation-progress-current" key={`${runId}-${phase}`} style={{ left: `${phase / TOTAL_STAGES * 100}%`, width: `${100 / TOTAL_STAGES}%`, animationDuration: `${STAGE_DURATION_MS}ms`, animationPlayState: playing ? 'running' : 'paused' }} />}
      </div>
      <span className="sr-only" role="status">{progressLabel}</span>
    </div>
    <div className="agent-lanes">
      {steps.map((step, index) => {
        const Icon = icons[index];
        const state = index < completedCount ? 'done' : index === phase ? 'current' : 'waiting';
        return <React.Fragment key={step.name}>
          <button className={`agent-node ${state} ${active === index ? 'selected' : ''}`} onClick={() => { followLive.current = false; setActive(index); }} aria-label={`${step.name}: ${state === 'current' && paused ? 'paused' : state}`} aria-pressed={active === index}>
            <span className="agent-node-head"><span className="agent-index">{state === 'done' ? <Check size={12} weight="bold" /> : index + 1}</span><Icon size={18} /></span><strong>{step.name}</strong><small>{step.action}</small>
            <span className="node-state">{state === 'done' ? <><Check size={12} weight="bold" /> Complete</> : state === 'current' ? <><span className="node-working-dot" />{paused ? 'Paused' : 'In progress'}</> : 'Waiting'}</span>
          </button>
          {index < TOTAL_STAGES - 1 && <div className={`agent-connector ${completedCount > index ? 'lit' : ''} ${playing && phase === index ? 'flowing' : ''}`} aria-hidden="true"><span /><CaretRight size={14} /></div>}
        </React.Fragment>;
      })}
    </div>
    {playing && active !== phase && <button className="follow-investigation" onClick={() => { followLive.current = true; setActive(phase); }}>Follow live stage <CaretRight size={13} /></button>}
    <div className={`agent-readout ${shown ? 'revealed' : ''}`}><div className="investigation-readout-content" key={`${runId}-${active}-${shown}`}><span className="readout-label">{steps[active].name} · {selectedDone ? 'Result' : selectedCurrent ? 'Evidence under review' : 'Output'}</span><strong>{shown ? steps[active].result : 'Waiting for this step'}</strong><p>{shown ? steps[active].evidence : 'Run the investigation to reveal the evidence.'}</p></div><span className="readout-icon">{shown ? active === TOTAL_STAGES - 1 && !safe && !humanVerified ? <WarningCircle size={21} /> : <Check size={21} /> : <span className="readout-wait" />}</span></div>
    <div className="agent-checklist"><div className="agent-checklist-head"><div><span>Step {active + 1} of {TOTAL_STAGES}</span><h3>{steps[active].name} checks</h3></div><span className={`agent-checklist-state ${shown ? 'ready' : ''}`}>{selectedDone ? 'Complete' : selectedCurrent ? paused ? 'Paused' : 'In review' : 'Pending'}</span></div>{shown ? <ol key={`${runId}-${active}`}>{steps[active].checks.map((check, index) => <li key={`${check.label}-${index}`} style={{ '--check-order': index }} className={check.kind === 'alert' ? 'alert' : 'pass'}><span className="agent-check-icon">{check.kind === 'alert' ? <WarningCircle size={16} /> : <Check size={14} weight="bold" />}</span><span><strong>{check.label}<span className="sr-only">{check.kind === 'alert' ? ' — Requires review' : ' — Passed'}</span></strong>{check.value && <small>{check.value}</small>}</span></li>)}</ol> : <p className="agent-checklist-wait">Run the investigation to display this step’s checks and evidence.</p>}</div>
    {finished && <div className={`agent-conclusion ${safe || humanVerified ? 'safe' : 'review'}`}><strong>{humanVerified ? 'Human verified' : safe ? 'Matched automatically' : 'Human verification required'}</strong><span>{humanVerified ? 'The reviewer’s decision and supporting reason are recorded.' : safe ? 'The records meet every automatic matching condition.' : item.suggestion}</span></div>}
    <div className="stage-footnote">Demo playback uses the case’s mock records and matching rule results. The specialists are simulated; no agents are deployed.</div>
  </section>;
}
