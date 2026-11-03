import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  House, List, CheckCircle, ClockCounterClockwise, Database, MagnifyingGlass,
  ArrowRight, ArrowsClockwise, DownloadSimple, ShieldCheck, WarningCircle,
  Info, ArrowLeft, UserCircle, CaretRight, SlidersHorizontal,
  Check, X, ArrowSquareOut, Receipt, Play
} from '@phosphor-icons/react';
import { collections, originalLedger, laterLedger, sourceLinks, BATCH_ID, REPORT_DATE } from './data';
import { addAudit, createInitialState, displayTime, getCases, getLedger, money, runBatch } from './engine';
import AgentStage from './AgentStage';
import BatchPlayback from './BatchPlayback';
import { RULE_SETTINGS, ruleDescriptions } from './rules';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './styles.css';
import './redesign.css';

const STORE_KEY = 'exception-desk-reconciliation-v2';
const navItems = [
  { id: 'overview', label: 'Overview', icon: House },
  { id: 'exceptions', label: 'Cases', icon: List },
  { id: 'review', label: 'Needs review', icon: ShieldCheck },
  { id: 'audit', label: 'Activity', icon: ClockCounterClockwise },
  { id: 'data', label: 'Sources & rules', icon: Database }
];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    return saved?.version === 2 ? saved : createInitialState();
  } catch { return createInitialState(); }
}

function Badge({ status }) {
  const cls = status === 'Auto matched' || status === 'Reviewed match' ? 'success' : status === 'Needs review' ? 'warning' : status === 'Escalated' ? 'danger' : 'neutral';
  return <span className={`badge ${cls}`}><span className="badge-dot" />{status}</span>;
}

function SectionTitle({ title, description, action }) {
  return <div className="section-title"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

function Empty({ title, body }) {
  return <div className="empty"><CheckCircle size={28} weight="duotone" /><strong>{title}</strong><p>{body}</p></div>;
}

function ProoflineMark() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 6h7m2 12h7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M7.5 6v4.5c0 1.1.9 2 2 2h5c1.1 0 2 .9 2 2V18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="7.5" cy="6" r="2" fill="currentColor" /><circle cx="16.5" cy="18" r="2" fill="currentColor" />
  </svg>;
}

function CasesTable({ cases, openCase, compact = false }) {
  if (!cases.length) return <Empty title="No cases in this view" body="Try another filter or search term." />;
  return <div className="table-wrap"><table className="case-table"><thead><tr><th>Case</th><th>Collection</th><th>Amount</th><th>Status</th>{!compact && <th>Best evidence</th>}<th><span className="sr-only">Open</span></th></tr></thead><tbody>
    {cases.map(item => <tr key={item.id} onClick={() => openCase(item.id)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') openCase(item.id); }} aria-label={`Open ${item.id}, ${item.title}`}>
      <td><span className="table-id">{item.id}</span><strong>{item.title}</strong></td>
      <td><strong>{item.collection.counterparty}</strong><small>{item.collection.reference}</small></td>
      <td className="amount">{money(item.collection.amount)}</td>
      <td><Badge status={item.status} /></td>
      {!compact && <td className="evidence-cell">{item.candidates.length} candidate{item.candidates.length === 1 ? '' : 's'} · {item.collection.channel}</td>}
      <td><CaretRight size={16} /></td>
    </tr>)}
  </tbody></table></div>;
}

function App() {
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState('overview');
  const [caseId, setCaseId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [note, setNote] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [toast, setToast] = useState('');
  const [stageRun, setStageRun] = useState(0);
  const [batchPlayback, setBatchPlayback] = useState(null);
  const cases = useMemo(() => getCases(state), [state]);
  const selected = cases.find(item => item.id === caseId);
  const attention = cases.filter(item => !['Auto matched', 'Reviewed match'].includes(item.status));
  const reviewCases = cases.filter(item => ['Needs review', 'Escalated', 'Awaiting evidence'].includes(item.status));
  const matched = cases.length - attention.length;
  const ledger = getLedger(state);

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { if (stageRun && page === 'case') document.querySelector('.agent-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [stageRun, page]);
  function navigate(target) { setPage(target); setCaseId(null); window.scrollTo({ top: 0 }); }
  function openCase(id) { setCaseId(id); setPage('case'); setNote(''); setCandidateId(''); window.scrollTo({ top: 0 }); }
  function watchCase(id) { openCase(id); setStageRun(value => value + 1); }
  function run() {
    const newFileProcessed = state.laterFileReceived && !state.processedLaterFile;
    const next = runBatch(state);
    setState(next);
    setBatchPlayback({ cases: getCases(next), ledgerCount: getLedger(next).length, newFileProcessed });
  }
  function receiveLaterFile() {
    if (state.laterFileReceived) return;
    setState(current => addAudit({ ...current, laterFileReceived: true }, { actor: current.role, action: 'Sample file received', detail: 'A second synthetic ledger file with LED-5009 is ready. Run reconciliation to process it.' }));
    setToast('Second sample file received. Run reconciliation to check it.');
  }
  function decide(status) {
    if (!selected || state.role !== 'Reviewer') { setToast('Switch to Reviewer to record a decision.'); return; }
    if (status === 'Reviewed match' && !RULE_SETTINGS.reviewerMatchCategories.includes(selected.category)) { setToast('This case needs more evidence before a match can be recorded.'); return; }
    const reason = note.trim();
    if (reason.length < 8) { setToast('Please add a reason of at least eight characters.'); return; }
    if (status === 'Reviewed match' && !candidateId) { setToast('Choose a ledger candidate first.'); return; }
    const detail = status === 'Reviewed match' ? `Matched ${candidateId}. Reviewer reason: ${reason}` : `Escalated for further investigation. Reason: ${reason}`;
    setState(current => addAudit({ ...current, decisions: { ...current.decisions, [selected.id]: { status, ledgerId: candidateId || null, note: reason, actor: current.role } } }, { caseId: selected.id, actor: current.role, action: status, detail }));
    setNote(''); setCandidateId(''); setToast(status === 'Reviewed match' ? 'Reviewed match recorded.' : 'Case escalated.');
  }
  function reopen() {
    if (!selected || state.role !== 'Reviewer') { setToast('Switch to Reviewer to reopen this case.'); return; }
    if (note.trim().length < 8) { setToast('Please add a reason of at least eight characters.'); return; }
    const reason = note.trim();
    setState(current => { const decisions = { ...current.decisions }; delete decisions[selected.id]; return addAudit({ ...current, decisions }, { caseId: selected.id, actor: current.role, action: 'Reopened', detail: reason }); });
    setNote(''); setToast('Case reopened.');
  }
  function reset() {
    if (!window.confirm('Reset all sample decisions and audit entries?')) return;
    setState(createInitialState()); navigate('overview'); setToast('Sample data reset.');
  }
  function exportAudit() {
    const columns = ['Time', 'Case ID', 'Actor', 'Action', 'Detail'];
    const lines = [columns, ...state.audit.map(row => [displayTime(row.time), row.caseId || '', row.actor, row.action, row.detail])];
    const csv = lines.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'proofline-audit.csv'; link.click(); URL.revokeObjectURL(url);
    setToast('Audit CSV downloaded.');
  }

  const filtered = cases.filter(item => {
    const haystack = `${item.id} ${item.title} ${item.collection.reference} ${item.collection.counterparty}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (filter === 'All' || item.status === filter);
  });
  const currentNav = page === 'case' ? 'exceptions' : page;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="logo"><div className="logo-mark"><ProoflineMark /></div><div><strong>Proofline</strong><small>Evidence-led reconciliation</small></div></div>
      <nav aria-label="Main navigation">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${currentNav === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}><Icon size={19} weight={currentNav === item.id ? 'fill' : 'regular'} /><span>{item.label}</span>{item.id === 'review' && reviewCases.length > 0 && <em>{reviewCases.length}</em>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="demo-label"><span className="live-dot" /> SYNTHETIC DEMO</div><p>Built for the OCBC Intelligent Operations challenge. No real bank data or live systems.</p></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Operations <CaretRight size={12} /> <strong>{page === 'case' ? 'Case investigation' : navItems.find(item => item.id === page)?.label}</strong></div><div className="top-actions"><span className="batch-chip">Batch {BATCH_ID}</span><div className="role-control"><UserCircle size={17} /><label htmlFor="role">Act as</label><select id="role" value={state.role} onChange={e => setState(current => ({ ...current, role: e.target.value }))}><option>Analyst</option><option>Reviewer</option></select></div></div></header>
      <main className="main-content">
        {page === 'overview' && <>
          <div className="workspace-heading"><div><span className="workspace-kicker">Daily collection batch · {REPORT_DATE}</span><h1>{attention.length} payment{attention.length === 1 ? ' needs' : 's need'} review</h1><p>Review the supporting records and resolve cases that do not meet automatic matching criteria.</p></div><button className="button outline" onClick={run}><ArrowsClockwise size={16} /> Run check again</button></div>
          <div className="overview-strip"><div><span>Collections checked</span><strong>{cases.length}</strong></div><div><span>Matched automatically or reviewed</span><strong>{matched}</strong></div><div><span>Require action</span><strong>{attention.length}</strong></div><div className="overview-strip-action"><span>Current batch</span><strong>{BATCH_ID}</strong></div></div>
          <div className="overview-workspace"><section className="spotlight" aria-label="Featured investigation"><div className="spotlight-top"><span className="workspace-kicker">CASE COL-1012 · DUPLICATE REFERENCE</span><Badge status={cases.find(item => item.id === 'COL-1012')?.status || 'Needs review'} /></div><h2>One collection.<br />Two ledger postings.</h2><p>Both postings have the same reference and amount. Automatic matching is blocked until the duplicate postings are resolved.</p><div className="compare-board"><div className="compare-source"><span>COLLECTION</span><strong>East Coast Café</strong><small>QR-241024-102</small><b>S$80.00</b></div><div className="compare-link" aria-hidden="true"><span /><span /><span /></div><div className="compare-candidates"><div><span>LEDGER · LED-5002</span><strong>S$80.00</strong></div><div><span>LEDGER · LED-5003</span><strong>S$80.00</strong></div></div></div><div className="spotlight-bottom"><button className="showcase-primary" onClick={() => watchCase('COL-1012')}><Play size={16} weight="fill" /> Watch investigation</button><span>4 steps · simulated specialists</span></div></section><section className="surface priority-surface"><SectionTitle title="Attention queue" description="Cases that did not meet automatic closure criteria." action={<button className="text-button" onClick={() => navigate('exceptions')}>All cases <ArrowRight size={15} /></button>} /><div className="queue-list">{attention.slice(0,5).map(item => <button key={item.id} className="queue-row" onClick={() => openCase(item.id)}><span className="queue-row-main"><small>{item.id}</small><strong>{item.title}</strong><span>{item.collection.counterparty}</span></span><span className="queue-row-end"><strong>{money(item.collection.amount)}</strong><CaretRight size={16} /></span></button>)}</div></section></div>
          <div className="overview-footer"><span><ShieldCheck size={18} /> Automatic closure requires one unique reference, exact amount and currency, and a valid time window.</span><button className="text-button" onClick={() => navigate('data')}>View matching rules <ArrowRight size={15} /></button></div>
        </>}

        {page === 'exceptions' && <>
          <SectionTitle title="Payment cases" description="Eight synthetic collection records checked against the ledger." />
          <div className="surface"><div className="toolbar"><div className="search-field"><MagnifyingGlass size={18} /><input aria-label="Search cases" placeholder="Search by case, reference, or business" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="filter-field"><SlidersHorizontal size={17} /><select aria-label="Filter by status" value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Needs review</option><option>Awaiting evidence</option><option>Auto matched</option><option>Reviewed match</option><option>Escalated</option></select></div><span className="result-count">{filtered.length} case{filtered.length === 1 ? '' : 's'}</span></div><CasesTable cases={filtered} openCase={openCase} /></div>
        </>}

        {page === 'case' && selected && <>
          <button className="back-button" onClick={() => navigate('exceptions')}><ArrowLeft size={17} /> All cases</button>
          <div className="case-head"><div><h1>{selected.title}</h1><p><span className="case-reference">{selected.id} · {selected.collection.channel}</span> · {selected.collection.story}</p></div><Badge status={selected.status} /></div>
          <AgentStage key={selected.id} item={selected} startKey={selected.id === 'COL-1012' ? stageRun : 0} />
          <div className="case-layout"><div className="case-primary"><section className="surface evidence-section"><SectionTitle title="Source records" description="Compare the collection with the ledger candidates." /><div className="source-card"><div className="source-card-title"><Receipt size={18} /><strong>Collection report</strong><span>Source of exception</span></div><div className="detail-grid"><Detail label="Collection ID" value={selected.id} /><Detail label="Reference" value={selected.collection.reference} /><Detail label="Amount" value={money(selected.collection.amount, selected.collection.currency)} /><Detail label="Recorded" value={displayTime(selected.collection.time)} /><Detail label="Business" value={selected.collection.counterparty} /><Detail label="Channel" value={selected.collection.channel} /></div></div>
            <div className="candidate-heading"><h3>Ledger candidate{selected.candidates.length === 1 ? '' : 's'}</h3><span>{selected.candidates.length} found</span></div>
            {selected.candidates.length ? selected.candidates.map(row => <div className="source-card candidate" key={row.id}><div className="source-card-title"><Database size={18} /><strong>{row.id}</strong><span>{row.type}</span></div><div className="detail-grid"><Detail label="Reference" value={row.reference} /><Detail label="Amount" value={money(row.amount, row.currency)} /><Detail label="Recorded" value={displayTime(row.time)} /><Detail label="Recorded fee" value={money(row.fee, row.currency)} /></div></div>) : <div className="no-candidate"><Info size={19} /><span>No ledger candidate exists in the processed file. Receive the second sample file on the Sources & rules page, then run reconciliation.</span></div>}
          </section></div><div className="case-side"><section className="surface checks"><SectionTitle title="Matching checks" />{selected.checks.map((check, i) => { const alert = selected.category !== 'auto' && (i === selected.checks.length - 1 || /more than one|reversal|differs|difference|unexplained|exceeded|no exact|no nearby|awaiting/i.test(check)); return <div className="check-row" key={check}><span className={alert ? 'check-alert' : 'check-good'}>{alert ? <Info size={14} /> : <Check size={14} weight="bold" />}</span>{check}</div>; })}<div className="recommendation"><strong>Next step</strong><p>{selected.suggestion}</p></div></section>
          <section className="surface decision-panel"><SectionTitle title="Record an outcome" />
            {selected.status === 'Auto matched' && <div className="resolved-note"><CheckCircle size={19} /> Automatically matched with {selected.autoLedgerId}. No reviewer action is needed.</div>}
            {selected.status === 'Reviewed match' && <div className="resolved-note"><CheckCircle size={19} /> Reviewed match recorded with {selected.decision?.ledgerId}.</div>}
            {selected.status === 'Escalated' && <div className="resolved-note caution"><WarningCircle size={19} /> Escalated for further investigation.</div>}
            {selected.status !== 'Auto matched' && <>
              {state.role !== 'Reviewer' && <div className="role-hint"><ShieldCheck size={17} /> Switch “Act as” to Reviewer to record a decision.</div>}
              {selected.status === 'Needs review' && RULE_SETTINGS.reviewerMatchCategories.includes(selected.category) && <div className="candidate-select"><label htmlFor="candidate">Ledger posting to match</label><select id="candidate" value={candidateId} onChange={e => setCandidateId(e.target.value)}><option value="">Choose a candidate</option>{selected.candidates.map(row => <option key={row.id} value={row.id}>{row.id} · {money(row.amount, row.currency)}</option>)}</select></div>}
              <label className="note-label" htmlFor="decision-note">Reason for decision <span>required</span></label><textarea id="decision-note" rows="3" placeholder="Explain the evidence behind this decision..." value={note} onChange={e => setNote(e.target.value)} />
              <div className="decision-actions">{selected.status === 'Needs review' && RULE_SETTINGS.reviewerMatchCategories.includes(selected.category) && <button className="button primary" disabled={state.role !== 'Reviewer'} onClick={() => decide('Reviewed match')}><Check size={17} /> Record reviewed match</button>}{!['Reviewed match', 'Escalated'].includes(selected.status) && <button className="button outline" disabled={state.role !== 'Reviewer'} onClick={() => decide('Escalated')}>Escalate case</button>}{['Reviewed match', 'Escalated'].includes(selected.status) && <button className="button outline" disabled={state.role !== 'Reviewer'} onClick={reopen}>Reopen case</button>}</div>
              <p className="smallprint">A recorded match changes this demo’s case status only. It does not post to a real ledger or move funds.</p>
            </>}
          </section></div></div>
          <section className="surface timeline"><SectionTitle title="Case history" description="Every decision records an actor, a reason, and a timestamp." />{state.audit.filter(event => event.caseId === selected.id).map(event => <div className="timeline-row" key={event.id}><span className="timeline-dot" /><div><strong>{event.action}</strong><p>{event.detail}</p><small>{event.actor} · {displayTime(event.time)}</small></div></div>)}</section>
        </>}

        {page === 'review' && <><SectionTitle title="Needs review" description="These cases require reviewer action or additional evidence before closure." /><div className="review-summary"><div><strong>{reviewCases.length}</strong><span>open cases</span></div><p><ShieldCheck size={19} /> Open a case to compare records and record a decision.</p></div><div className="surface"><CasesTable cases={reviewCases} openCase={openCase} /></div></>}

        {page === 'audit' && <><SectionTitle title="Activity" description="A record of files, automatic matches and reviewer decisions." action={<button className="button outline" onClick={exportAudit}><DownloadSimple size={17} /> Export CSV</button>} /><div className="surface"><div className="table-wrap"><table className="audit-table"><thead><tr><th>Time</th><th>Case</th><th>Actor</th><th>Action</th><th>Reason or result</th></tr></thead><tbody>{state.audit.map(event => <tr key={event.id}><td>{displayTime(event.time)}</td><td>{event.caseId || '—'}</td><td>{event.actor}</td><td><strong>{event.action}</strong></td><td>{event.detail}</td></tr>)}</tbody></table></div></div></>}

        {page === 'data' && <><SectionTitle title="Sources & rules" description="Synthetic source files and the criteria used for automatic matching." /><div className="data-grid"><section className="surface"><div className="data-card-head"><div><h3>Daily collections</h3><p>Source 1 · Eight synthetic collection records.</p></div><span className="file-tag">Sample CSV</span></div><div className="mini-table">{collections.slice(0, 4).map(row => <div key={row.id}><span>{row.reference}</span><strong>{money(row.amount)}</strong></div>)}</div><a className="download-link" href="/mock-data/collections.csv" download><DownloadSimple size={15} /> Download collection CSV</a></section><section className="surface"><div className="data-card-head"><div><h3>Ledger postings</h3><p>Source 2 · {ledger.length} processed ledger rows.</p></div><span className="file-tag">Sample CSV</span></div><div className="mini-table">{ledger.slice(0, 4).map(row => <div key={row.id}><span>{row.id}</span><strong>{money(row.amount, row.currency)}</strong></div>)}</div><a className="download-link" href="/mock-data/ledger-initial.csv" download><DownloadSimple size={15} /> Download ledger CSV</a></section></div>
          <div className="surface next-file"><div><h3>Receive a later ledger file</h3><p>The first ledger file does not contain {laterLedger.reference}. Receive the second sample file and run reconciliation to evaluate the new posting.</p><span className="file-status">{state.processedLaterFile ? 'Processed and matched' : state.laterFileReceived ? 'Received, awaiting reconciliation' : 'Not yet received'}</span></div><div className="next-file-actions"><button className="button outline" disabled={state.laterFileReceived} onClick={receiveLaterFile}><Database size={17} /> Receive sample file</button><button className="button primary" onClick={run}><ArrowsClockwise size={17} /> Run reconciliation</button></div></div>
          <div className="two-col rules-grid"><section className="surface"><SectionTitle title="Rules for automatic matching" />{ruleDescriptions().map(rule => <div className="rule" key={rule.id}><CheckCircle size={18} /><div><strong>{rule.label}</strong><p>{rule.description}</p></div></div>)}<div className="rule-settings"><strong>Review-only settings</strong><p>Nearby candidate search: {RULE_SETTINGS.nearbyCandidateWindowMinutes} minutes · Fee explanation tolerance: {RULE_SETTINGS.feeExplanationTolerance} · Reviewer match categories: {RULE_SETTINGS.reviewerMatchCategories.join(', ')}</p></div><p className="rule-config-note">Policy source: <code>src/rules.js</code>. Edit the settings and rule tests there, then run <code>npm test</code>.</p></section><section className="surface"><SectionTitle title="Sample data reference" description="Goldman Sachs publishes sample ISO 20022 payment statuses and statements. The demo CSV files use synthetic names, values, and IDs." /><p className="field-map">Payment reference <strong>EndToEndId</strong> · Status <strong>TxSts</strong> · Posting reference <strong>AcctSvcrRef</strong> · Amount <strong>Amt / Ccy</strong></p>{sourceLinks.map(link => <a className="source-link" href={link.url} target="_blank" rel="noreferrer" key={link.url}><span><strong>{link.name}</strong><small>{link.detail}</small></span><ArrowSquareOut size={16} /></a>)}</section></div><button className="reset-link" onClick={reset}>Reset the entire demo</button>
        </>}
      </main>
    </div>
    {batchPlayback && <BatchPlayback {...batchPlayback} onClose={() => setBatchPlayback(null)} />}
    {toast && <div className="toast" role="status"><Info size={17} />{toast}<button aria-label="Dismiss message" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>;
}

function Detail({ label, value }) { return <div className="detail"><span>{label}</span><strong>{value}</strong></div>; }

createRoot(document.getElementById('root')).render(<App />);
