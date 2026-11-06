import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  House, List, CheckCircle, ClockCounterClockwise, Database, MagnifyingGlass,
  ArrowRight, ArrowsClockwise, DownloadSimple, ShieldCheck, WarningCircle,
  Info, ArrowLeft, UserCircle, CaretRight, CaretDown, SlidersHorizontal,
  Check, X, ArrowSquareOut, Receipt, Play, GearSix, Question, Plus, TerminalWindow, Flag
} from '@phosphor-icons/react';
import { collections, originalLedger, laterLedger, sourceLinks, BATCH_ID, REPORT_DATE } from './data';
import { addAudit, canReviewMatch, createInitialState, displayTime, getCases, getLedger, money, recordDecision, runBatch } from './engine';
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
import './stripe.css';
import './approval.css';
import './monitoring.css';

const STORE_KEY = 'exception-desk-reconciliation-v2';
const navItems = [
  { id: 'overview', label: 'Home', icon: House },
  { id: 'exceptions', label: 'Transactions', icon: ArrowsClockwise },
  { id: 'review', label: 'Reviews', icon: ShieldCheck },
  { id: 'audit', label: 'Activity', icon: ClockCounterClockwise },
  { id: 'data', label: 'Sources & rules', icon: Database }
];
const resolved = item => ['Auto matched', 'Reviewed match'].includes(item.status);
const statusText = status => ({ 'Auto matched': 'Matched', 'Reviewed match': 'Verified', 'Needs review': 'Needs review', 'Awaiting evidence': 'Awaiting evidence', Escalated: 'Escalated' }[status] || status);
const dateOnly = iso => new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }).format(new Date(iso));

function loadState() {
  try { const saved = JSON.parse(localStorage.getItem(STORE_KEY)); return saved?.version === 2 ? saved : createInitialState(); }
  catch { return createInitialState(); }
}
function Badge({ status }) {
  const cls = ['Auto matched', 'Reviewed match'].includes(status) ? 'success' : status === 'Needs review' ? 'warning' : status === 'Escalated' ? 'danger' : 'neutral';
  return <span className={`badge ${cls}`}>{statusText(status)}</span>;
}
function SectionTitle({ title, description, action }) {
  return <div className="section-title"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}
function Empty({ title, body }) { return <div className="empty"><CheckCircle size={24} /><strong>{title}</strong><p>{body}</p></div>; }
function MatchMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9h12M6 15h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}
function AmountFlag({ item }) { return item.amountReview?.required ? <span className="amount-flag"><Flag size={11} weight="fill" />{item.amountReview.threshold == null ? 'Amount policy' : 'Large amount'}</span> : null; }
function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
function CasesTable({ cases, openCase, selectedIds, onSelect, onSelectAll }) {
  if (!cases.length) return <Empty title="No transactions found" body="Adjust the filters or search to view transactions." />;
  return <div className="table-wrap"><table className="case-table"><thead><tr>
    <th className="select-cell"><input type="checkbox" aria-label="Select all visible transactions" checked={cases.every(item => selectedIds.includes(item.id))} onChange={e => onSelectAll(cases, e.target.checked)} /></th>
    <th className="amount-heading">Amount</th><th>Status</th><th>Payment method</th><th>Description</th><th>Customer</th><th>Date</th>
  </tr></thead><tbody>{cases.map(item => <tr key={item.id} onClick={() => openCase(item.id)} tabIndex={0} onKeyDown={e => { if (e.target === e.currentTarget && e.key === 'Enter') openCase(item.id); }} aria-label={`Open ${item.id}, ${item.title}`}>
    <td className="select-cell" onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${item.id}`} checked={selectedIds.includes(item.id)} onChange={e => onSelect(item.id, e.target.checked)} /></td>
    <td className="amount"><strong>{money(item.collection.amount, item.collection.currency)}</strong><span className="currency-code">{item.collection.currency}</span></td>
    <td><Badge status={item.status} /></td><td><span className="payment-method"><Receipt size={15} />{item.collection.channel}</span></td>
    <td><div className="transaction-description"><span>{item.title}</span><AmountFlag item={item} /></div><small className="table-reference">{item.id}</small></td>
    <td>{item.collection.counterparty}</td><td className="date-cell">{dateOnly(item.collection.time)}</td>
  </tr>)}</tbody></table></div>;
}
function CumulativeChart({ records, label }) {
  const ordered = [...records].sort((a, b) => new Date(a.time) - new Date(b.time));
  let total = 0;
  const values = ordered.map(row => (total += row.amount));
  const batchTimes = collections.map(row => new Date(row.time).getTime());
  const start = Math.floor(Math.min(...batchTimes) / 3600000) * 3600000;
  const end = Math.ceil(Math.max(...batchTimes) / 3600000) * 3600000;
  const axisTime = time => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Singapore' }).format(time);
  const points = ['0,118', ...ordered.map((row, index) => `${Math.max(0, Math.min(400, (new Date(row.time).getTime() - start) / (end - start) * 400))},${118 - values[index] / Math.max(total, 1) * 100}`), `400,${total ? 18 : 118}`];
  return <div className="metric-chart"><svg viewBox="0 0 400 130" preserveAspectRatio="none" role="img" aria-label={label}>{[18,68,118].map(y => <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="currentColor" />)}<polyline points={points.join(' ')} fill="none" stroke="var(--stripe-purple)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg><div className="chart-axis"><span>{axisTime(start)}</span><span>{axisTime(end)}</span></div></div>;
}
function Detail({ label, value }) { return <div className="detail"><span>{label}</span><strong>{value}</strong></div>; }

function App() {
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState('overview');
  const [caseId, setCaseId] = useState(null);
  const [caseOrigin, setCaseOrigin] = useState({ page: 'exceptions', search: '', filter: 'All', largeOnly: false, selectedIds: [], scrollY: 0 });
  const [search, setSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [largeOnly, setLargeOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [note, setNote] = useState('');
  const [coachNote, setCoachNote] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [verifiedLargeAmount, setVerifiedLargeAmount] = useState(false);
  const [toast, setToast] = useState('');
  const [stageRun, setStageRun] = useState(0);
  const [playbackCaseId, setPlaybackCaseId] = useState(null);
  const [batchPlayback, setBatchPlayback] = useState(null);
  const [dataTab, setDataTab] = useState('rules');
  const cases = useMemo(() => getCases(state), [state]);
  const selected = cases.find(item => item.id === caseId);
  const attention = cases.filter(item => !resolved(item));
  const reviewCases = attention;
  const matchedCases = cases.filter(resolved);
  const largeCases = cases.filter(item => item.amountReview?.required);
  const largePending = largeCases.filter(item => !resolved(item));
  const ledger = getLedger(state);
  const caseRows = page === 'review' ? reviewCases : cases;
  const filtered = caseRows.filter(item => `${item.id} ${item.title} ${item.collection.reference} ${item.collection.counterparty}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All' || (filter === 'Matched' ? resolved(item) : item.status === filter)) && (!largeOnly || item.amountReview?.required));
  const totalValue = cases.reduce((sum, item) => sum + item.collection.amount, 0);
  const matchedValue = matchedCases.reduce((sum, item) => sum + item.collection.amount, 0);
  const currentNav = page === 'case' ? caseOrigin.page : page;
  const backLabel = `Back to ${{ overview: 'home', exceptions: 'transactions', review: 'reviews', audit: 'activity' }[caseOrigin.page] || 'transactions'}`;
  const eligibleReviewCandidates = selected?.candidates.filter(row => canReviewMatch({ ...selected, candidates: [row] })) || [];
  const requiresReopening = selected && ['Reviewed match', 'Escalated'].includes(selected.status);
  const approvalAvailable = selected?.status === 'Needs review' && canReviewMatch(selected);
  const reviewerReady = state.role === 'Reviewer';
  const reasonReady = note.trim().length >= 8;
  const candidateReady = eligibleReviewCandidates.some(row => row.id === candidateId);
  const amountReady = !selected?.amountReview?.required || verifiedLargeAmount;
  const approvalReady = approvalAvailable && reviewerReady && reasonReady && candidateReady && amountReady;
  const decisionReady = reviewerReady && reasonReady;
  const actionStatus = selected?.status === 'Auto matched' ? 'Automatically matched'
    : requiresReopening ? (selected.status === 'Reviewed match' ? 'Match approved' : 'Case escalated')
    : approvalAvailable ? (approvalReady ? 'Ready for approval' : 'Complete verification') : 'Further review required';
  const actionHelp = selected?.status === 'Auto matched' ? `Matched with ${selected.autoLedgerId}. No reviewer action required.`
    : !reviewerReady ? 'Select Reviewer in the top bar to record a decision.'
    : requiresReopening ? (reasonReady ? 'Ready to reopen this case for review.' : 'Enter a reason of at least eight characters to reopen.')
    : approvalAvailable ? (!candidateReady ? 'Choose the ledger posting to approve.' : !reasonReady ? 'Enter a reason of at least eight characters.' : !amountReady ? 'Confirm the transaction amount and source records.' : 'The posting, reason, and required checks are complete.')
    : reasonReady ? 'Escalate this transaction for further investigation.' : 'Approval is blocked by policy. Enter a reason to escalate.';

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4200); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { if (page === 'case' && playbackCaseId === caseId && stageRun) document.querySelector('.agent-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [page, playbackCaseId, caseId, stageRun]);
  function navigate(target) { setPage(target); setCaseId(null); setSelectedIds([]); window.scrollTo({ top: 0 }); }
  function openCase(id) {
    if (page !== 'case') setCaseOrigin({ page, search, filter, largeOnly, selectedIds, scrollY: window.scrollY });
    setCaseId(id); setPage('case'); setNote(''); setCoachNote(''); setCandidateId(''); setVerifiedLargeAmount(false); setPlaybackCaseId(null); window.scrollTo({ top: 0 });
  }
  function backToOrigin() {
    setSearch(caseOrigin.search); setFilter(caseOrigin.filter); setLargeOnly(caseOrigin.largeOnly); setSelectedIds(caseOrigin.selectedIds);
    setPage(caseOrigin.page); setCaseId(null); setPlaybackCaseId(null);
    window.requestAnimationFrame(() => window.scrollTo({ top: caseOrigin.scrollY }));
  }
  function openReview(large = false) { setFilter('All'); setSearch(''); setLargeOnly(large); navigate('review'); }
  function watchCase(id) { if (page !== 'case' || caseId !== id) openCase(id); setPlaybackCaseId(id); setStageRun(value => value + 1); const item = cases.find(row => row.id === id); setState(current => addAudit(current, { caseId: id, actor: current.role, action: 'Investigation viewed', detail: `Opened simulated investigation. Candidates: ${item?.candidates.map(row => row.id).join(', ') || 'none'}. Checks: ${item?.checks.join('; ') || 'unavailable'}. Outcome: ${item?.status || 'unknown'}.` })); }
  function saveCoachNote() {
    if (!selected || state.role !== 'Reviewer' || coachNote.trim().length < 8) return;
    setState(current => addAudit(current, { caseId: selected.id, actor: 'Coach (demo Reviewer)', action: 'Coach note', detail: coachNote.trim() }));
    setCoachNote(''); setToast('Coach note recorded in the activity log.');
  }
  function run() { const newFileProcessed = state.laterFileReceived && !state.processedLaterFile; const next = runBatch(state); setState(next); setBatchPlayback({ cases: getCases(next), ledgerCount: getLedger(next).length, newFileProcessed }); }
  function receiveLaterFile() {
    if (state.laterFileReceived) return;
    setState(current => addAudit({ ...current, laterFileReceived: true }, { actor: current.role, action: 'Sample file received', detail: 'A second synthetic ledger file with LED-5009 is ready. Run reconciliation to process it.' }));
    setToast('Sample file received. Run reconciliation to process it.');
  }
  function decide(status) {
    if (!selected) return;
    try { const next = recordDecision(state, { caseId: selected.id, status, ledgerId: candidateId, note, verifiedLargeAmount }); setState(next); setNote(''); setCandidateId(''); setVerifiedLargeAmount(false); setToast(status === 'Reviewed match' ? 'Match approved. The reviewer decision is recorded.' : 'Case escalated.'); }
    catch (error) { setToast(error.message); }
  }
  function reopen() {
    if (!selected || state.role !== 'Reviewer') { setToast('Select the Reviewer role to reopen a case.'); return; }
    if (note.trim().length < 8) { setToast('Enter a reason of at least eight characters.'); return; }
    setState(current => { const decisions = { ...current.decisions }; delete decisions[selected.id]; return addAudit({ ...current, decisions }, { caseId: selected.id, actor: current.role, action: 'Reopened', detail: note.trim() }); });
    setNote(''); setVerifiedLargeAmount(false); setToast('Case reopened. Verification is required again.');
  }
  function reset() { if (!window.confirm('Reset all sample decisions and audit entries?')) return; setState(createInitialState()); setFilter('All'); setSearch(''); setLargeOnly(false); navigate('overview'); setToast('Demo reset.'); }
  function exportAudit() { downloadCsv('match-audit.csv', [['Time', 'Case ID', 'Actor', 'Action', 'Detail'], ...state.audit.map(row => [displayTime(row.time), row.caseId, row.actor, row.action, row.detail])]); setToast('Activity CSV downloaded.'); }
  function exportCases() { const rows = selectedIds.length ? filtered.filter(item => selectedIds.includes(item.id)) : filtered; downloadCsv('match-transactions.csv', [['Case ID','Amount','Currency','Status','Reference','Customer','Large amount'],...rows.map(item => [item.id,item.collection.amount,item.collection.currency,item.status,item.collection.reference,item.collection.counterparty,item.amountReview?.required ? 'Yes' : 'No'])]); setToast(`${rows.length} transaction${rows.length === 1 ? '' : 's'} exported.`); }
  const tableProps = { openCase, selectedIds, onSelect: (id, checked) => setSelectedIds(current => checked ? [...new Set([...current, id])] : current.filter(value => value !== id)), onSelectAll: (rows, checked) => setSelectedIds(current => checked ? [...new Set([...current, ...rows.map(row => row.id)])] : current.filter(id => !rows.some(row => row.id === id))) };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="workspace-brand"><div className="logo-mark"><MatchMark /></div><div><strong>Match</strong><small>Demo workspace</small></div></div>
      <nav aria-label="Main navigation">{navItems.map((item, index) => { const Icon = item.icon; return <React.Fragment key={item.id}>{index === 3 && <div className="nav-group-label">Operations</div>}<button className={`nav-item ${currentNav === item.id ? 'active' : ''}`} aria-current={currentNav === item.id ? 'page' : undefined} onClick={() => { if(item.id === 'review') openReview(); else { setSearch(''); setFilter('All'); setLargeOnly(false); navigate(item.id); } }}><Icon size={19} /><span>{item.label}</span>{item.id === 'review' && reviewCases.length > 0 && <em>{reviewCases.length}</em>}</button></React.Fragment>; })}</nav>
      <div className="sidebar-bottom"><span className="demo-environment"><span /> Test environment</span><p>Synthetic transactions<br />Intelligent Automation prototype</p></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><form className="global-search" onSubmit={e => { e.preventDefault(); setSearch(globalSearch); setFilter('All'); setLargeOnly(false); navigate('exceptions'); }}><MagnifyingGlass size={16} /><input aria-label="Search all transactions" placeholder="Search" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} /><kbd>↵</kbd></form><div className="top-actions"><button className="icon-button" title="View sources and rules" aria-label="View help" onClick={() => {setDataTab('references');navigate('data');}}><Question size={19} /></button><button className="icon-button" title="View activity" aria-label="View activity" onClick={() => navigate('audit')}><ClockCounterClockwise size={19} /></button><button className="icon-button" title="View policy settings" aria-label="View policy settings" onClick={() => {setDataTab('rules');navigate('data');}}><GearSix size={19} /></button><div className="role-control"><UserCircle size={19} /><label className="sr-only" htmlFor="role">Act as</label><select id="role" value={state.role} onChange={e => setState(current => ({ ...current, role: e.target.value }))}><option>Analyst</option><option>Reviewer</option></select></div><button className="icon-button create-button" aria-label="Run reconciliation" title="Run reconciliation" onClick={run}><Plus size={17} weight="bold" /></button></div></header>
      <main className={`main-content page-${page}`}>
        {page === 'overview' && <>
          <div className="page-heading"><h1>Today</h1><button className="button outline" onClick={run}><ArrowsClockwise size={14} /> Run check again</button></div>
          <div className="today-layout"><section className="today-summary"><div className="today-labels"><span>Collection volume <CaretDown size={12} /></span><span>{REPORT_DATE}</span></div><strong className="today-volume">{money(totalValue)}</strong><span className="metric-subtitle">{cases.length} collection records</span><CumulativeChart records={collections} label="Cumulative collection amounts during the synthetic batch" /><div className="today-balance"><div><span>Matched amount</span><strong>{money(matchedValue)}</strong></div><button className="text-button" onClick={() => {setFilter('Matched');setSearch('');setLargeOnly(false);navigate('exceptions');}}>View <ArrowRight size={12} /></button></div></section><aside className="today-recommendations"><h3>Action required <span>{attention.length}</span></h3><p>Resolve transactions held by the matching policy.</p><button className="text-button" onClick={() => openReview()}>View reviews <ArrowRight size={12} /></button><div className="recommendation-divider" /><h3>Large transactions <Flag size={14} /></h3><p>{largePending.length} transaction{largePending.length === 1 ? '' : 's'} require{largePending.length === 1 ? 's' : ''} human verification.</p><button className="text-button" onClick={() => openReview(true)}>Review large transactions <ArrowRight size={12} /></button><div className="recommendation-divider" /><div className="batch-meta"><span>Current batch</span><strong>{BATCH_ID}</strong></div></aside></div>
          <div className="overview-heading"><h2>Your overview</h2><span className="date-chip">Batch date <strong>{REPORT_DATE}</strong></span></div>
          <div className="overview-widget-grid">
            <section className="overview-widget"><h3>Reconciliation <Info size={12} /></h3><strong className="widget-value">{cases.length} transactions</strong><div className="status-distribution"><span style={{width:`${matchedCases.length/cases.length*100}%`}} /></div>{[['Matched',matchedCases.length,'purple'],['Requires review',reviewCases.length,'amber']].map(([label,count,tone]) => <div className="widget-stat-row" key={label}><span><i className={tone} />{label}</span><strong>{count}</strong></div>)}<button className="widget-link" onClick={() => navigate('exceptions')}>View all</button></section>
            <section className="overview-widget"><h3>Matched amount <Info size={12} /></h3><strong className="widget-value">{money(matchedValue)}</strong><span className="metric-subtitle">{matchedCases.length} automatic or reviewed matches</span><CumulativeChart records={matchedCases.map(item => item.collection)} label="Cumulative value of matched synthetic collections" /><button className="widget-link" onClick={() => navigate('exceptions')}>More details</button></section>
            <section className="overview-widget"><h3>Amount requiring review <Info size={12} /></h3><strong className="widget-value">{money(totalValue-matchedValue)}</strong><span className="metric-subtitle">{attention.length} open transactions</span><CumulativeChart records={attention.map(item => item.collection)} label="Cumulative value of synthetic collections requiring review" /><button className="widget-link" onClick={() => openReview()}>More details</button></section>
            <section className="overview-widget"><h3>Transactions requiring review <Info size={12} /></h3><div className="widget-list">{attention.slice(0,3).map(item => <button key={item.id} onClick={() => openCase(item.id)}><span><strong>{money(item.collection.amount,item.collection.currency)}</strong><small>{item.collection.counterparty}</small></span><Badge status={item.status} /></button>)}</div><button className="widget-link" onClick={() => openReview()}>View all</button></section>
            <section className="overview-widget"><h3>Large transactions <Flag size={12} /></h3><strong className="widget-value">{largePending.length} awaiting verification</strong><p className="widget-description">Amounts at or above the configured threshold require a reviewer before closure.</p>{(largePending.length ? largePending : largeCases).slice(0,1).map(item => <button className="widget-transaction" onClick={() => openCase(item.id)} key={item.id}><span>{item.collection.counterparty}<small>{item.id}</small></span><strong>{money(item.collection.amount,item.collection.currency)}</strong></button>)}<button className="widget-link" onClick={() => openReview(true)}>Review transactions</button></section>
            <section className="overview-widget"><h3>Recent activity <ClockCounterClockwise size={12} /></h3><div className="widget-activity">{state.audit.slice(0,3).map(event => <div key={event.id}><strong>{event.action}</strong><span>{event.caseId || BATCH_ID}</span></div>)}</div><button className="widget-link" onClick={() => navigate('audit')}>View all</button></section>
          </div>
        </>}

        {(page === 'exceptions' || page === 'review') && <>
          <div className="page-heading"><h1>{page === 'review' ? 'Reviews' : 'Transactions'}</h1><div className="heading-actions"><button className="button outline" onClick={exportCases}><DownloadSimple size={14} /> Export{selectedIds.length ? ` (${selectedIds.length})` : ''}</button><button className="button outline" onClick={run}><Plus size={14} /> Run check again</button></div></div>
          <div className="page-tabs"><button className={!largeOnly ? 'active' : ''} onClick={() => setLargeOnly(false)}>{page === 'review' ? 'All reviews' : 'Collections'}</button><button className={largeOnly ? 'active' : ''} onClick={() => setLargeOnly(true)}>Large transactions <span>{(page === 'review' ? largePending : largeCases).length}</span></button></div>
          <div className="transaction-toolbar"><div className="status-filters">{['All','Matched','Reviewed match','Needs review','Awaiting evidence','Escalated'].map(status => <button key={status} className={`filter-chip ${filter === status ? 'selected' : ''}`} onClick={() => setFilter(status)}>{status === 'All' ? 'All' : statusText(status)}</button>)}</div><div className="table-search"><MagnifyingGlass size={14} /><input aria-label="Search cases" placeholder="Search transactions" value={search} onChange={e => setSearch(e.target.value)} /></div></div>
          {largeOnly && <div className="inline-notice"><Flag size={15} />Large transactions require a recorded human verification before closure.</div>}
          <CasesTable cases={filtered} {...tableProps} /><div className="table-result-count">{filtered.length ? `1–${filtered.length} of ${filtered.length}` : '0'} results{selectedIds.length > 0 && ` · ${selectedIds.length} selected`}</div>
        </>}

        {page === 'case' && selected && <>
          <div className="transaction-header"><div><button className="back-button case-back-button" onClick={backToOrigin}><ArrowLeft size={15} aria-hidden="true" />{backLabel}</button><div className="transaction-title"><h1>{money(selected.collection.amount,selected.collection.currency)} <span>{selected.collection.currency}</span></h1><Badge status={selected.status} /><AmountFlag item={selected} /></div><p>Collected from <button className="text-button" onClick={() => {setSearch(selected.collection.counterparty);setFilter('All');setLargeOnly(false);navigate('exceptions');}}>{selected.collection.counterparty}</button></p></div><button className="button outline" onClick={() => watchCase(selected.id)}><Play size={13} /> Run investigation</button></div>
          {selected.amountReview?.required && <div className={`large-transaction-notice ${resolved(selected) ? 'verified' : ''}`}><ShieldCheck size={20} /><div><strong>{resolved(selected) ? 'Human verification recorded' : 'Human verification required'}</strong><p>{selected.amountReview.threshold == null ? 'No amount threshold is configured for this currency. Automatic closure is blocked.' : `${money(selected.collection.amount, selected.collection.currency)} meets the ${money(selected.amountReview.threshold, selected.collection.currency)} review threshold. ${resolved(selected) ? 'The reviewer decision is recorded in the case history.' : 'Verify the source records and transaction amount before recording a match.'}`}</p></div></div>}
          <div className="transaction-detail-layout"><div className="transaction-main">
            <section className="flat-section"><SectionTitle title="Recent activity" /><div className="detail-timeline">{state.audit.filter(event => event.caseId === selected.id).length ? state.audit.filter(event => event.caseId === selected.id).map(event => <div key={event.id}><span className="activity-dot" /><div><strong>{event.action}</strong><p>{event.detail}</p></div><time>{displayTime(event.time)}</time></div>) : <div><span className="activity-dot" /><div><strong>Transaction received</strong><p>{selected.explanation}</p></div><time>{displayTime(selected.collection.time)}</time></div>}</div></section>
            <section className="flat-section"><SectionTitle title="Payment breakdown" /><div className="breakdown-row"><span>Collection amount</span><strong>{money(selected.collection.amount,selected.collection.currency)}</strong></div>{selected.candidates.map(row => <div className="breakdown-row" key={row.id}><span>Ledger posting <code>{row.id}</code></span><strong>{money(row.amount,row.currency)}</strong></div>)}{!selected.candidates.length && <p className="muted-copy">No ledger posting found in the processed file.</p>}</section>
            <section className="flat-section"><SectionTitle title="Matching checks" /><p className="section-description">{selected.explanation}</p><div className="rule-check-list">{selected.checks.map((check,index) => {const failed=selected.category!=='auto' && (index===selected.checks.length-1 || /more than one|reversal|differs|difference|unexplained|exceeded|no exact|no nearby|awaiting|threshold|blocked|requires human/i.test(check));return <div key={check}><span className={failed?'check-alert':'check-good'}>{failed?<Info size={13}/>:<Check size={13}/>}</span><span>{check}</span></div>;})}</div><p className="next-action"><strong>Required action</strong>{selected.suggestion}</p></section>
            <section className="flat-section"><AgentStage key={selected.id} item={selected} startKey={playbackCaseId === selected.id ? stageRun : 0} /></section>
            <section className="flat-section monitoring-panel" aria-labelledby="monitoring-title"><SectionTitle title="Monitoring & guardrails" description="A reviewable decision summary for this synthetic case."/><div className="monitor-grid"><div><span className="monitor-label">Task and context</span><strong id="monitoring-title">Reconcile {selected.id}</strong><p>{selected.explanation}</p><small>{selected.candidates.length} ledger candidate{selected.candidates.length === 1 ? '' : 's'} · {money(selected.collection.amount, selected.collection.currency)}</small></div><div><span className="monitor-label">Risk and control</span><strong>{selected.category === 'auto' ? 'Low · automatic closure allowed' : selected.amountReview?.required || ['duplicate','reversal','currency','amount'].includes(selected.category) ? 'High · human intervention' : 'Elevated · human review'}</strong><p>{selected.category === 'auto' ? 'All configured matching rules passed.' : selected.suggestion}</p><small>{selected.status === 'Reviewed match' ? 'Reviewer verified and recorded a reason' : selected.status === 'Escalated' ? 'Escalated for investigation' : selected.category === 'auto' ? 'Rules engine closed the case' : 'Automatic closure blocked'}</small></div></div><div className="monitor-trace"><h3>Decision trace</h3><ol>{selected.checks.map(check => <li key={check}>{check}</li>)}</ol><p>This records observable inputs, rule results, and actions. It does not claim to expose private model reasoning.</p></div><div className="coach-notes"><h3>Coach notes</h3><p className="muted-copy">Demo reviewer annotations for an OCBC coach to discuss during evaluation. No OCBC employee notes are preloaded.</p>{state.audit.filter(event => event.caseId === selected.id && event.action === 'Coach note').map(event => <div className="coach-entry" key={event.id}><p>{event.detail}</p><small>{event.actor} · {displayTime(event.time)}</small></div>)}<label htmlFor="coach-note">Add a coaching observation</label><textarea id="coach-note" rows="3" value={coachNote} onChange={e => setCoachNote(e.target.value)} placeholder="What evidence or intervention would improve this decision?" disabled={state.role !== 'Reviewer'}/><button className="button outline" onClick={saveCoachNote} disabled={state.role !== 'Reviewer' || coachNote.trim().length < 8}>Save note to audit log</button></div></section>
            <section className="flat-section"><SectionTitle title="Source records" /><div className="source-record"><h3>Collection report</h3><div className="detail-grid"><Detail label="Collection ID" value={selected.id}/><Detail label="Reference" value={selected.collection.reference}/><Detail label="Amount" value={money(selected.collection.amount,selected.collection.currency)}/><Detail label="Recorded" value={displayTime(selected.collection.time)}/></div></div>{selected.candidates.map(row => <div className="source-record" key={row.id}><h3>Ledger posting · {row.id}</h3><div className="detail-grid"><Detail label="Reference" value={row.reference}/><Detail label="Amount" value={money(row.amount,row.currency)}/><Detail label="Posting type" value={row.type}/><Detail label="Recorded fee" value={money(row.fee,row.currency)}/></div></div>)}</section>
          </div><aside className="transaction-details"><section><h2>Details</h2><Detail label="Transaction ID" value={selected.id}/><Detail label="Payment method" value={selected.collection.channel}/><div className="detail"><span>Review level</span><strong>{selected.amountReview?.required ? <AmountFlag item={selected}/> : <span className="badge success">Standard</span>}</strong></div><Detail label="Description" value={selected.title}/><Detail label="Reference" value={selected.collection.reference}/><Detail label="Date" value={displayTime(selected.collection.time)}/><Detail label="Source" value="Synthetic collection report"/></section>
            <section className="decision-panel persistent-review-panel" id="approval-panel" aria-labelledby="review-panel-title"><h2 id="review-panel-title">Review transaction</h2><dl className="review-amount-summary"><div><dt>Amount</dt><dd>{money(selected.collection.amount, selected.collection.currency)} <span>{selected.collection.currency}</span></dd></div><div><dt>Review threshold</dt><dd>{RULE_SETTINGS.largeTransactionThresholds[selected.collection.currency] ? money(RULE_SETTINGS.largeTransactionThresholds[selected.collection.currency], selected.collection.currency) : 'Not configured'}</dd></div></dl>{approvalAvailable && <p className="approval-guidance">Verify the posting and record your reason for approval.</p>}{selected.status === 'Auto matched' ? <p className="resolved-note"><CheckCircle size={16}/>Automatically matched with {selected.autoLedgerId}.</p> : <>
              {selected.status === 'Reviewed match' && <p className="resolved-note"><CheckCircle size={16}/>Verified match: {selected.decision?.ledgerId}.</p>}{selected.status === 'Escalated' && <p className="resolved-note caution">Escalated for investigation.</p>}
              {state.role !== 'Reviewer' && <p className="role-hint"><ShieldCheck size={15}/>Select Reviewer in the top bar to record a decision.</p>}
              {approvalAvailable && <div className="candidate-select"><label htmlFor="candidate">Ledger posting <span>Required</span></label><select id="candidate" aria-required="true" value={candidateId} onChange={e => setCandidateId(e.target.value)}><option value="">Choose a posting</option>{eligibleReviewCandidates.map(row => <option key={row.id} value={row.id}>{row.id} · {money(row.amount,row.currency)}</option>)}</select></div>}
              <label className="note-label" htmlFor="decision-note">{requiresReopening ? 'Reason for reopening' : 'Reason'} <span>Required</span></label><textarea id="decision-note" rows="4" aria-required="true" aria-describedby="decision-note-help" placeholder={requiresReopening ? 'Record why this case needs another review.' : 'Record the evidence supporting this decision.'} value={note} onChange={e => setNote(e.target.value)}/><p id="decision-note-help" className="review-field-help">Enter at least eight characters.</p>
              {approvalAvailable && selected.amountReview?.required && <label className="verification-checkbox"><input type="checkbox" checked={verifiedLargeAmount} onChange={e => setVerifiedLargeAmount(e.target.checked)} aria-required="true"/><span>I have verified the transaction amount, source record, and ledger posting.</span></label>}
            </>}<p className="smallprint" id="approval-scope">Approval confirms the reconciliation match. No funds are moved.</p></section>
            <section><h2>Customer</h2><Detail label="Name" value={selected.collection.counterparty}/><Detail label="Channel" value={selected.collection.channel}/></section>
          </aside></div>
          <section className="approval-action-bar" aria-label="Transaction review actions"><div className="approval-transaction-summary"><strong>{money(selected.collection.amount, selected.collection.currency)} <span>{selected.collection.currency}</span></strong><span>{selected.collection.counterparty}</span></div><div className={`approval-readiness ${approvalReady || selected.status === 'Auto matched' || selected.status === 'Reviewed match' ? 'is-ready' : ''}`}><span className="approval-readiness-icon">{approvalReady || resolved(selected) ? <CheckCircle size={18}/> : <ShieldCheck size={18}/>}</span><div><strong>{actionStatus}</strong><p id="approval-status" aria-live="polite">{actionHelp}</p></div></div>{selected.status !== 'Auto matched' && <div className="approval-bar-actions">{requiresReopening ? <button className="button outline" disabled={!decisionReady} aria-describedby="approval-status" onClick={reopen}>Reopen case</button> : <><button className="button outline" disabled={!decisionReady} aria-describedby="approval-status" onClick={() => decide('Escalated')}>Escalate</button>{approvalAvailable && <button className="button primary" disabled={!approvalReady} aria-describedby="approval-status approval-scope" onClick={() => decide('Reviewed match')}><CheckCircle size={16} weight="bold"/>Approve match</button>}</>}</div>}</section>
        </>}

        {page === 'audit' && <>
          <div className="page-heading"><h1>Activity</h1><button className="button outline" onClick={exportAudit}><DownloadSimple size={14}/>Export</button></div><div className="page-tabs"><button className="active">All events <span>{state.audit.length}</span></button></div><div className="audit-intro"><span><span className="environment-dot"/>Test environment</span><span>Batch {BATCH_ID}</span></div><div className="audit-event-list">{state.audit.map(event => <div key={event.id} className="audit-event"><span className="event-icon"><CheckCircle size={16}/></span><div><strong>{event.action}</strong><p>{event.detail}</p><span>{event.actor} · {event.caseId ? <button className="text-button" onClick={() => openCase(event.caseId)}>{event.caseId}</button> : BATCH_ID}</span></div><time>{displayTime(event.time)}</time></div>)}</div>
        </>}

        {page === 'data' && <>
          <div className="page-heading"><h1>Sources & rules</h1><span className="environment-label">Test environment</span></div><div className="page-tabs">{[['rules','Matching rules'],['sources','Data sources'],['references','References']].map(([id,label]) => <button key={id} className={dataTab===id?'active':''} onClick={() => setDataTab(id)}>{label}</button>)}</div>
          {dataTab === 'rules' && <div className="settings-layout"><div><section className="flat-section"><SectionTitle title="Automatic matching" description="Every condition must pass before a transaction closes automatically."/>{ruleDescriptions().map(rule => <div className="settings-row" key={rule.id}><div><h3>{rule.label}</h3><p>{rule.description}</p></div><span className="enabled-status"><Check size={12}/>Enabled</span></div>)}</section><section className="flat-section"><SectionTitle title="Large transaction verification" description="Amounts at or above these thresholds require human verification."/>{Object.entries(RULE_SETTINGS.largeTransactionThresholds).map(([currency,threshold]) => <div className="settings-row" key={currency}><div><h3>{currency}</h3><p>Minimum transaction amount requiring review</p></div><strong>{money(threshold,currency)}</strong></div>)}<p className="settings-note">Thresholds are configurable demo policy values. They do not represent a bank or regulatory reporting requirement.</p></section><section className="flat-section"><SectionTitle title="Review settings"/><div className="settings-row"><div><h3>Candidate search window</h3><p>Used to identify records for manual review</p></div><strong>{RULE_SETTINGS.nearbyCandidateWindowMinutes} minutes</strong></div><div className="settings-row"><div><h3>Fee tolerance</h3><p>Used to explain a difference for review</p></div><strong>{RULE_SETTINGS.feeExplanationTolerance}</strong></div></section></div><aside className="settings-aside"><h3>Policy configuration</h3><p>Matching rules and thresholds are defined in <code>src/rules.js</code>.</p><p>Edit the settings in code, then run <code>npm test</code> to validate the policy.</p><ShieldCheck size={23}/></aside></div>}
          {dataTab === 'sources' && <><div className="source-files-grid">{[['Collection report',`${collections.length} collection records`,'/mock-data/collections.csv',collections],['Initial ledger file',`${originalLedger.length} ledger records`,'/mock-data/ledger-initial.csv',originalLedger]].map(([title,description,url,rows]) => <section className="source-file" key={title}><Receipt size={22}/><h2>{title}</h2><p>{description}</p><div className="source-file-rows">{rows.slice(0,4).map(row => <div key={row.id}><span>{row.id}</span><strong>{money(row.amount,row.currency)}</strong></div>)}</div><a className="button outline" href={url} download><DownloadSimple size={14}/>Download CSV</a></section>)}</div><section className="late-file-panel"><div><h2>Later ledger file</h2><p>The additional file contains posting {laterLedger.id} for reference {laterLedger.reference}.</p><span className="badge neutral">{state.processedLaterFile ? 'Processed' : state.laterFileReceived ? 'Ready to process' : 'Not received'}</span></div><div><button className="button outline" disabled={state.laterFileReceived} onClick={receiveLaterFile}>Receive sample file</button><button className="button primary" onClick={run}>Run reconciliation</button></div></section><button className="reset-link" onClick={reset}>Reset the entire demo</button></>}
          {dataTab === 'references' && <div className="reference-page"><SectionTitle title="Sample data references" description="Public documentation supports the scenario and field structure. All transactions in this demo are synthetic."/>{sourceLinks.map(link => <a className="reference-row" href={link.url} target="_blank" rel="noreferrer" key={link.url}><span><strong>{link.name}</strong><small>{link.detail}</small></span><ArrowSquareOut size={15}/></a>)}<div className="reference-note">Payment reference: <code>EndToEndId</code> · Posting reference: <code>AcctSvcrRef</code> · Amount: <code>Amt / Ccy</code></div></div>}
        </>}
      </main>
      <footer className="console-footer"><span><TerminalWindow size={15}/>Demo environment</span><span>Batch {BATCH_ID}<span className="console-separator">·</span>Rules engine</span></footer>
    </div>
    {batchPlayback && <BatchPlayback {...batchPlayback} onClose={() => setBatchPlayback(null)}/>}
    {toast && <div className="toast" role="status"><Info size={16}/>{toast}<button aria-label="Dismiss message" onClick={() => setToast('')}><X size={14}/></button></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
