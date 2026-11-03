import React, { useEffect, useMemo, useState } from 'react';
import { ArrowCounterClockwise, CaretRight, Check, Database, MagnifyingGlass, Pause, Play, ShieldCheck, WarningCircle } from '@phosphor-icons/react';

const icons = [Database, MagnifyingGlass, Check, ShieldCheck];

function buildSteps(item) {
  const count = item.candidates.length;
  const safe = item.status === 'Auto matched' || item.category === 'auto';
  const match = item.candidates.find(row => row.id === item.autoLedgerId) || item.candidates[0];
  const exactCount = item.candidates.filter(row => row.reference === item.collection.reference).length;
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
    { name: 'Evidence checker', action: 'Compare records', result: item.checks.at(-1) || item.explanation, evidence: item.checks.join(' · '), checks: item.checks.map((check, index) => ({ label: check, value: index === item.checks.length - 1 ? item.explanation : '', kind: !safe && (index === item.checks.length - 1 || /more than one|reversal|differs|unexplained|exceeded|no exact|no nearby/i.test(check)) ? 'alert' : 'pass' })) },
    { name: 'Policy gate', action: 'Apply the closure rule', result: safe ? `Safe match: ${item.autoLedgerId || match?.id}` : 'Automatic closure blocked', evidence: safe ? 'Unique reference, exact amount and currency, and valid timing.' : item.suggestion, checks: [
      { label: 'Apply automatic closure rule', value: safe ? 'Unique reference, exact value and currency, valid time window' : 'At least one required condition is not met', kind: safe ? 'pass' : 'alert' },
      { label: safe ? 'Record matched ledger ID' : 'Leave the case open', value: safe ? item.autoLedgerId || match?.id : item.suggestion, kind: safe ? 'pass' : 'alert' },
      { label: 'Respect reviewer decisions', value: 'A batch run does not overwrite a recorded reviewer outcome', kind: 'pass' }
    ] },
  ];
}

export default function AgentStage({ item, startKey = 0 }) {
  const steps = useMemo(() => buildSteps(item), [item]);
  const [phase, setPhase] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!startKey) return;
    setPhase(reduced ? 3 : -1);
    setActive(0);
    setPlaying(!reduced);
  }, [startKey, reduced]);
  useEffect(() => {
    if (!playing) return;
    if (phase >= 3) { setPlaying(false); return; }
    const timer = setTimeout(() => {
      setPhase(value => value + 1);
      setActive(Math.min(phase + 1, 3));
    }, phase < 0 ? 250 : 1250);
    return () => clearTimeout(timer);
  }, [playing, phase]);

  const run = () => { setPhase(reduced ? 3 : -1); setActive(0); setPlaying(!reduced); };
  const finished = phase === 3;
  const safe = item.status === 'Auto matched' || item.category === 'auto';
  return <section className="agent-stage" aria-label="Simulated agent investigation">
    <div className="agent-stage-top">
      <div><span className="stage-kicker"><span className={`stage-live ${playing ? 'on' : ''}`} /> INVESTIGATION PLAYBACK · SYNTHETIC DATA</span><h2>Watch the case unfold</h2><p>Each specialist gets one narrow task. The policy gate controls the final action.</p></div>
      <button className="stage-play" onClick={playing ? () => setPlaying(false) : run} aria-label={playing ? 'Pause investigation' : finished ? 'Replay investigation' : 'Run investigation'}>{playing ? <Pause size={17} weight="fill" /> : finished ? <ArrowCounterClockwise size={17} /> : <Play size={17} weight="fill" />}{playing ? 'Pause' : finished ? 'Replay' : 'Run investigation'}</button>
    </div>
    <div className="agent-lanes">
      {steps.map((step, index) => { const Icon = icons[index]; const state = index < phase || (index === 3 && finished) ? 'done' : index === phase ? 'current' : 'waiting'; return <React.Fragment key={step.name}><button className={`agent-node ${state} ${active === index ? 'selected' : ''}`} onClick={() => setActive(index)} aria-label={`${step.name}: ${state}`}><span className="agent-node-head"><span className="agent-index">0{index + 1}</span><Icon size={22} weight="duotone" /></span><strong>{step.name}</strong><small>{step.action}</small><span className="node-state">{state === 'done' ? <><Check size={13} /> Complete</> : state === 'current' ? 'Working…' : 'Waiting'}</span></button>{index < 3 && <div className={`agent-connector ${phase > index ? 'lit' : ''}`} aria-hidden="true"><span /><CaretRight size={16} /></div>}</React.Fragment>; })}
    </div>
    <div className={`agent-readout ${phase >= active ? 'revealed' : ''}`} aria-live="polite"><div><span className="readout-label">{steps[active].name.toUpperCase()} / OUTPUT</span><strong>{phase >= active ? steps[active].result : 'Waiting for this step'}</strong><p>{phase >= active ? steps[active].evidence : 'Run the investigation to reveal the evidence.'}</p></div><span className="readout-icon">{phase >= active ? active === 3 && !safe ? <WarningCircle size={24} /> : <Check size={24} /> : <span className="readout-wait" />}</span></div>
    <div className="agent-checklist" aria-live="polite"><div className="agent-checklist-head"><div><span>STEP 0{active + 1} / 04</span><h3>What {steps[active].name.toLowerCase()} checked</h3></div><span className={`agent-checklist-state ${phase >= active ? 'ready' : ''}`}>{phase >= active ? 'Evidence shown' : 'Waiting'}</span></div>{phase >= active ? <ol>{steps[active].checks.map((check, index) => <li key={`${check.label}-${index}`} className={check.kind === 'alert' ? 'alert' : 'pass'}><span className="agent-check-icon">{check.kind === 'alert' ? <WarningCircle size={16} /> : <Check size={15} weight="bold" />}</span><span><strong>{check.label}</strong>{check.value && <small>{check.value}</small>}</span></li>)}</ol> : <p className="agent-checklist-wait">Run the investigation to reveal this step's checks and evidence.</p>}</div>
    {finished && <div className={`agent-conclusion ${safe ? 'safe' : 'review'}`}><strong>{safe ? 'Resolved by rule' : 'Reviewer action required'}</strong><span>{safe ? 'The records meet every automatic-match condition.' : item.suggestion}</span></div>}
    <div className="stage-footnote">Demo playback uses the case’s mock records and matching rule results. The specialists are simulated; no agents are deployed.</div>
  </section>;
}
