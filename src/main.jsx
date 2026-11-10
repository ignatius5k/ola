import React, { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { createRoot } from 'react-dom/client';
import {
  House, List, CheckCircle, ClockCounterClockwise, Database, MagnifyingGlass,
  ArrowRight, ArrowsClockwise, DownloadSimple, ShieldCheck, WarningCircle,
  Info, ArrowLeft, UserCircle, CaretRight, SlidersHorizontal,
  Check, X, ArrowSquareOut, Receipt, Play, GearSix, Question, Plus, TerminalWindow, Flag
} from '@phosphor-icons/react';
import { collections, originalLedger, laterLedger, sourceLinks, BATCH_ID } from './data';
import { addAudit, addManualTransaction, canReviewMatch, createInitialState, displayTime, getCases, getCollections, getLedger, money, recordDecision, runBatch } from './engine';
import AgentStage from './AgentStage';
import BatchPlayback from './BatchPlayback';
import AddTransactionModal from './AddTransactionModal';
import Dashboard from './Dashboard';
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
import './ola-brand.css';

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

function Badge({ status }) {
  const cls = ['Auto matched', 'Reviewed match'].includes(status) ? 'success' : status === 'Needs review' ? 'warning' : status === 'Escalated' ? 'danger' : 'neutral';
  return <span className={`badge ${cls}`}>{statusText(status)}</span>;
}
function SectionTitle({ title, description, action }) {
  return <div className="section-title"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}
function Empty({ title, body }) { return <div className="empty"><CheckCircle size={24} /><strong>{title}</strong><p>{body}</p></div>; }
function OlaMark() {
  return <img src="/ola-mark.svg" alt="" aria-hidden="true" width="30" height="30" />;
}
function AmountFlag({ item }) { return item.amountReview?.required ? <span className="amount-flag"><Flag size={11} weight="fill" />{item.amountReview.threshold == null ? 'Amount policy' : 'Large amount'}</span> : null; }
function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(cell => {
    const value = typeof cell === 'string' && /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : String(cell ?? '');
    return `"${value.replaceAll('"', '""')}"`;
  }).join(',')).join('\n');
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
    <td><div className="transaction-description"><span>{item.title}</span><AmountFlag item={item} /></div><small className="table-reference">{item.id}{item.collection.source === 'Manual entry' ? ' · Manual entry' : ''}</small></td>
    <td>{item.collection.counterparty}</td><td className="date-cell">{dateOnly(item.collection.time)}</td>
  </tr>)}</tbody></table></div>;
}
function Detail({ label, value }) { return <div className="detail"><span>{label}</span><strong>{value}</strong></div>; }
function SignInScreen() {
  const { signIn, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <h1>Ola</h1>
        <p>Sign in to access your reconciliation workspace.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          {authError && (
            <p className="auth-error" role="alert">{authError}</p>
          )}

          <button
            className="button primary"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

function AuthGate() {
  const {
    user,
    membership,
    memberships,
    loading,
    status,
    authError,
    selectWorkspace,
    refreshMembership,
    signOut
  } = useAuth();

  if (loading) {
    return <main className="auth-screen">Checking your access...</main>;
  }

  if (!user) {
    return <SignInScreen />;
  }

  if (status === 'error') {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <h1>Unable to verify access</h1>
          <p>{authError}</p>
          <button className="button primary" onClick={refreshMembership}>
            Try again
          </button>
          <button className="button outline" onClick={signOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  if (status === 'forbidden') {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <h1>Workspace access unavailable</h1>
          <p>
            Your account does not have an active workspace membership.
            Contact your administrator.
          </p>
          <button className="button outline" onClick={signOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  if (!membership && memberships.length > 1) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <h1>Select a workspace</h1>
          <p>Choose the workspace you want to access.</p>
          {memberships.map(item => (
            <button
              key={item.workspace_id}
              className="button outline"
              onClick={() => selectWorkspace(item.workspace_id)}
            >
              {item.workspaces?.name || 'Workspace'} ? {item.role}
            </button>
          ))}
          <button className="button outline" onClick={signOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  if (!membership || !membership.active ||
      !['analyst', 'reviewer'].includes(membership.role)) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <h1>Workspace access unavailable</h1>
          <p>Contact your administrator to check your account permissions.</p>
          <button className="button outline" onClick={signOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return <App key={user.id + ':' + membership.workspace_id} />;
}
function App() {
  const { user, role, signOut } = useAuth();

  const isReviewer = role === 'reviewer';
  const displayRole = isReviewer ? 'Reviewer' : 'Analyst';

  const [state, setState] = useState(() => ({ ...createInitialState(), role: displayRole }));
  const [page, setPage] = useState('overview');
  const [caseId, setCaseId] = useState(null);
  const [caseOrigin, setCaseOrigin] = useState({ page: 'exceptions', search: '', filter: 'All', largeOnly: false, currency: '', selectedIds: [], scrollY: 0 });
  const [search, setSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [largeOnly, setLargeOnly] = useState(false);
  const [listCurrency, setListCurrency] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [note, setNote] = useState('');
  const [coachNote, setCoachNote] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [verifiedLargeAmount, setVerifiedLargeAmount] = useState(false);
  const [toast, setToast] = useState('');
  const [stageRun, setStageRun] = useState(0);
  const [playbackCaseId, setPlaybackCaseId] = useState(null);
  const [batchPlayback, setBatchPlayback] = useState(null);
  const [addingTransaction, setAddingTransaction] = useState(false);
  const [dashboardCurrency, setDashboardCurrency] = useState('SGD');
  const [dataTab, setDataTab] = useState('rules');
  const cases = useMemo(() => getCases(state), [state]);
  const collectionRecords = useMemo(() => getCollections(state), [state]);
  const manualCollections = state.manualCollections || [];
  const collectionCurrencies = [...new Set(collectionRecords.map(row => row.currency))];
  const activeDashboardCurrency = collectionCurrencies.includes(dashboardCurrency) ? dashboardCurrency : collectionCurrencies[0] || 'SGD';
  const overviewCases = cases.filter(item => item.collection.currency === activeDashboardCurrency);
  const overviewRecords = overviewCases.map(item => item.collection);
  const overviewMatched = overviewCases.filter(resolved);
  const overviewAttention = overviewCases.filter(item => !resolved(item));
  const overviewLargePending = overviewAttention.filter(item => item.amountReview?.required);
  const nextOverviewReview = overviewLargePending.find(item => item.status === 'Needs review' && canReviewMatch(item))
    || overviewAttention.find(item => item.status === 'Needs review') || overviewAttention[0];
  const overviewIds = new Set(overviewCases.map(item => item.id));
  const overviewAudit = state.audit.filter(event => !event.caseId || overviewIds.has(event.caseId));
  const overviewTimes = overviewRecords.map(row => new Date(row.time).getTime());
  const periodStart = overviewTimes.length ? dateOnly(Math.min(...overviewTimes)) : null;
  const periodEnd = overviewTimes.length ? dateOnly(Math.max(...overviewTimes)) : null;
  const overviewPeriod = periodStart ? periodStart === periodEnd ? periodStart : `${periodStart} – ${periodEnd}` : 'No collection records';
  const selected = cases.find(item => item.id === caseId);
  const attention = cases.filter(item => !resolved(item));
  const reviewCases = attention;
  const matchedCases = cases.filter(resolved);
  const largeCases = cases.filter(item => item.amountReview?.required);
  const largePending = largeCases.filter(item => !resolved(item));
  const ledger = getLedger(state);
  const caseRows = page === 'review' ? reviewCases : cases;
  const currencyCases = caseRows.filter(item => !listCurrency || item.collection.currency === listCurrency);
  const filtered = currencyCases.filter(item => `${item.id} ${item.title} ${item.collection.reference} ${item.collection.counterparty} ${item.collection.currency}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All' || (filter === 'Matched' ? resolved(item) : item.status === filter)) && (!largeOnly || item.amountReview?.required));
  const totalValue = overviewCases.reduce((sum, item) => sum + item.collection.amount, 0);
  const matchedValue = overviewMatched.reduce((sum, item) => sum + item.collection.amount, 0);
  const currentNav = page === 'case' ? caseOrigin.page : page;
  const backLabel = `Back to ${{ overview: 'home', exceptions: 'transactions', review: 'reviews', audit: 'activity' }[caseOrigin.page] || 'transactions'}`;
  const eligibleReviewCandidates = selected?.candidates.filter(row => canReviewMatch({ ...selected, candidates: [row] })) || [];
  const requiresReopening = selected && ['Reviewed match', 'Escalated'].includes(selected.status);
  const approvalAvailable = selected?.status === 'Needs review' && canReviewMatch(selected);
  const reviewerReady = isReviewer;
  const reasonReady = note.trim().length >= 8;
  const candidateReady = eligibleReviewCandidates.some(row => row.id === candidateId);
  const amountReady = !selected?.amountReview?.required || verifiedLargeAmount;
  const approvalReady = approvalAvailable && reviewerReady && reasonReady && candidateReady && amountReady;
  const decisionReady = reviewerReady && reasonReady;
  const actionStatus = selected?.status === 'Auto matched' ? 'Automatically matched'
    : requiresReopening ? (selected.status === 'Reviewed match' ? 'Match approved' : 'Case escalated')
      : approvalAvailable ? (approvalReady ? 'Ready for approval' : 'Complete verification') : 'Further review required';
  const actionHelp = selected?.status === 'Auto matched' ? `Matched with ${selected.autoLedgerId}. No reviewer action required.`
    : !reviewerReady ? 'Sign in with a Reviewer account to record a decision.'
      : requiresReopening ? (reasonReady ? 'Ready to reopen this case for review.' : 'Enter a reason of at least eight characters to reopen.')
        : approvalAvailable ? (!candidateReady ? 'Choose the ledger posting to approve.' : !reasonReady ? 'Enter a reason of at least eight characters.' : !amountReady ? 'Confirm the transaction amount and source records.' : 'The posting, reason, and required checks are complete.')
          : reasonReady ? 'Escalate this transaction for further investigation.' : 'Approval is blocked by policy. Enter a reason to escalate.';

  useEffect(() => {
    setState(current => current.role === displayRole
      ? current
      : { ...current, role: displayRole });
  }, [displayRole]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4200); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { if (page === 'case' && playbackCaseId === caseId && stageRun) document.querySelector('.agent-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [page, playbackCaseId, caseId, stageRun]);
  function navigate(target) { setPage(target); setCaseId(null); setSelectedIds([]); window.scrollTo({ top: 0 }); }
  function openCase(id) {
    if (page !== 'case') setCaseOrigin({ page, search, filter, largeOnly, currency: listCurrency, selectedIds, scrollY: window.scrollY });
    setCaseId(id); setPage('case'); setNote(''); setCoachNote(''); setCandidateId(''); setVerifiedLargeAmount(false); setPlaybackCaseId(null); window.scrollTo({ top: 0 });
  }
  function backToOrigin() {
    setSearch(caseOrigin.search); setFilter(caseOrigin.filter); setLargeOnly(caseOrigin.largeOnly); setListCurrency(caseOrigin.currency || ''); setSelectedIds(caseOrigin.selectedIds);
    setPage(caseOrigin.page); setCaseId(null); setPlaybackCaseId(null);
    window.requestAnimationFrame(() => window.scrollTo({ top: caseOrigin.scrollY }));
  }
  function openReview(large = false) { setFilter('All'); setSearch(''); setLargeOnly(large); setListCurrency(''); navigate('review'); }
  function openOverviewList({ review = false, large = false, matched = false } = {}) {
    setFilter(matched ? 'Matched' : 'All'); setSearch(''); setLargeOnly(large); setListCurrency(activeDashboardCurrency);
    navigate(review ? 'review' : 'exceptions');
  }
  function watchCase(id) {
    if (page !== 'case' || caseId !== id) openCase(id);
    setPlaybackCaseId(id);
    setStageRun(value => value + 1);

    const item = cases.find(row => row.id === id);

    setState(current => addAudit(current, {
      caseId: id,
      actor: `${user.email ?? user.id} (${displayRole})`,
      action: 'Investigation viewed',
      detail: `Opened simulated investigation. Candidates: ${item?.candidates.map(row => row.id).join(', ') || 'none'}. Checks: ${item?.checks.join('; ') || 'unavailable'}. Outcome: ${item?.status || 'unknown'}.`
    }));
  }
  function saveCoachNote() {
    if (!selected || !isReviewer || coachNote.trim().length < 8) return;

    setState(current => addAudit(current, {
      caseId: selected.id,
      actor: `${user.email ?? user.id} (${displayRole})`,
      action: 'Coach note',
      detail: coachNote.trim()
    }));

    setCoachNote('');
    setToast('Coach note recorded in the activity log.');
  }
  function createManualTransaction(input) {
    const next = addManualTransaction(state, input);
    const added = next.manualCollections.at(-1);
    setState(next);
    setAddingTransaction(false);
    setDashboardCurrency(added.currency);
    setSearch(''); setGlobalSearch(''); setFilter('All'); setLargeOnly(false); setListCurrency(''); setSelectedIds([]);
    setCaseOrigin({ page: 'exceptions', search: '', filter: 'All', largeOnly: false, currency: '', selectedIds: [], scrollY: 0 });
    setCaseId(added.id); setPage('case'); setPlaybackCaseId(null);
    setNote(''); setCoachNote(''); setCandidateId(''); setVerifiedLargeAmount(false);
    window.scrollTo({ top: 0 });
    setToast(`Transaction ${added.id} added and checked against the ledger.`);
  }
  function exportManualCollections() {
    downloadCsv('ola-manual-transactions.csv', [['Collection ID', 'Reference', 'Amount', 'Currency', 'Recorded time', 'Payment method', 'Counterparty', 'Source', 'Added by', 'Added at'], ...manualCollections.map(row => [row.id, row.reference, row.amount, row.currency, row.time, row.channel, row.counterparty, row.source, row.createdBy, row.createdAt])]);
  }
  function run() { const newFileProcessed = state.laterFileReceived && !state.processedLaterFile; const next = runBatch(state); setState(next); setBatchPlayback({ cases: getCases(next), ledgerCount: getLedger(next).length, newFileProcessed }); }
  function receiveLaterFile() {
    if (state.laterFileReceived) return;
    setState(current => addAudit({ ...current, laterFileReceived: true }, { actor: `${user.email ?? user.id} (${displayRole})`, action: 'Sample file received', detail: 'A second synthetic ledger file with LED-5009 is ready. Run reconciliation to process it.' }));
    setToast('Sample file received. Run reconciliation to process it.');
  }
    function decide(status) {
    if (!selected || !isReviewer) {
      setToast('Only an authenticated Reviewer can record a decision.');
      return;
    }

    try {
      const next = recordDecision(state, {
        caseId: selected.id,
        status,
        ledgerId: candidateId,
        note,
        verifiedLargeAmount
      });

      setState(next);
      setNote('');
      setCandidateId('');
      setVerifiedLargeAmount(false);

      setToast(
        status === 'Reviewed match'
          ? 'Match approved. The reviewer decision is recorded.'
          : 'Case escalated.'
      );
    } catch (error) {
      setToast(error.message);
    }
  }

  function reopen() {
    if (!selected || !isReviewer) {
      setToast('Only an authenticated Reviewer can reopen a case.');
      return;
    }

    if (note.trim().length < 8) {
      setToast('Enter a reason of at least eight characters.');
      return;
    }

    setState(current => {
      const decisions = { ...current.decisions };

      delete decisions[selected.id];

      return addAudit({ ...current, decisions }, {
        caseId: selected.id,
        actor: `${user.email ?? user.id} (${displayRole})`,
        action: 'Reopened',
        detail: note.trim()
      });
    });

    setNote('');
    setVerifiedLargeAmount(false);
    setToast('Case reopened. Verification is required again.');
  }
  function reset() { if (!window.confirm('Reset all manual transactions, sample decisions, and audit entries?')) return; setState({ ...createInitialState(), role: displayRole }); setDashboardCurrency('SGD'); setFilter('All'); setSearch(''); setLargeOnly(false); setListCurrency(''); navigate('overview'); setToast('Demo reset.'); }
  function exportAudit() { downloadCsv('ola-audit.csv', [['Time', 'Case ID', 'Actor', 'Action', 'Detail'], ...state.audit.map(row => [displayTime(row.time), row.caseId, row.actor, row.action, row.detail])]); setToast('Activity CSV downloaded.'); }
  function exportCases() { const rows = selectedIds.length ? filtered.filter(item => selectedIds.includes(item.id)) : filtered; downloadCsv('ola-transactions.csv', [['Case ID', 'Amount', 'Currency', 'Status', 'Reference', 'Customer', 'Large amount', 'Source'], ...rows.map(item => [item.id, item.collection.amount, item.collection.currency, item.status, item.collection.reference, item.collection.counterparty, item.amountReview?.required ? 'Yes' : 'No', item.collection.source || 'Synthetic collection report'])]); setToast(`${rows.length} transaction${rows.length === 1 ? '' : 's'} exported.`); }
  const tableProps = { openCase, selectedIds, onSelect: (id, checked) => setSelectedIds(current => checked ? [...new Set([...current, id])] : current.filter(value => value !== id)), onSelectAll: (rows, checked) => setSelectedIds(current => checked ? [...new Set([...current, ...rows.map(row => row.id)])] : current.filter(id => !rows.some(row => row.id === id))) };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="workspace-brand"><div className="logo-mark"><OlaMark /></div><div><strong>Ola</strong></div></div>
      <nav aria-label="Main navigation">{navItems.map((item, index) => { const Icon = item.icon; return <React.Fragment key={item.id}>{index === 3 && <div className="nav-group-label">Operations</div>}<button className={`nav-item ${currentNav === item.id ? 'active' : ''}`} aria-current={currentNav === item.id ? 'page' : undefined} onClick={() => { if (item.id === 'review') openReview(); else { setSearch(''); setFilter('All'); setLargeOnly(false); setListCurrency(''); navigate(item.id); } }}><Icon size={19} /><span>{item.label}</span>{item.id === 'review' && reviewCases.length > 0 && <em>{reviewCases.length}</em>}</button></React.Fragment>; })}</nav>
      <div className="sidebar-bottom"><span className="demo-environment"><span /> Test environment</span><p>Synthetic transactions<br />Intelligent Automation prototype</p></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><form className="global-search" onSubmit={e => { e.preventDefault(); setSearch(globalSearch); setFilter('All'); setLargeOnly(false); setListCurrency(''); navigate('exceptions'); }}><MagnifyingGlass size={16} /><input aria-label="Search all transactions" placeholder="Search" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} /><kbd>↵</kbd></form><div className="top-actions"><button className="icon-button" title="View sources and rules" aria-label="View help" onClick={() => { setDataTab('references'); navigate('data'); }}><Question size={19} /></button><button className="icon-button" title="View activity" aria-label="View activity" onClick={() => navigate('audit')}><ClockCounterClockwise size={19} /></button><button className="icon-button" title="View policy settings" aria-label="View policy settings" onClick={() => { setDataTab('rules'); navigate('data'); }}><GearSix size={19} /></button>
        <div className="role-control">
          <UserCircle size={19} />
          <span>{displayRole}</span>
          <button
            type="button"
            className="button outline"
            onClick={signOut}
          >
            Sign out
          </button>
        </div><button className="icon-button create-button" aria-label="Add transaction" title="Add transaction" aria-haspopup="dialog" onClick={() => setAddingTransaction(true)}><Plus size={17} weight="bold" /></button></div></header>
      <main className={`main-content page-${page}`}>
        {page === 'overview' && <Dashboard
          currency={activeDashboardCurrency} currencies={collectionCurrencies}
          onCurrencyChange={setDashboardCurrency} period={overviewPeriod}
          records={overviewRecords} cases={overviewCases} matchedCases={overviewMatched}
          attentionCases={overviewAttention} largePending={overviewLargePending}
          nextReview={nextOverviewReview} audit={overviewAudit}
          totalValue={totalValue} matchedValue={matchedValue}
          onRun={run} onOpenCase={openCase} onOpenList={openOverviewList}
          onActivity={() => navigate('audit')}
        />}

        {(page === 'exceptions' || page === 'review') && <>
          <div className="page-heading"><h1>{page === 'review' ? 'Reviews' : 'Transactions'}</h1><div className="heading-actions"><button className="button outline" onClick={exportCases}><DownloadSimple size={14} /> Export{selectedIds.length ? ` (${selectedIds.length})` : ''}</button><button className="button outline" onClick={run}><ArrowsClockwise size={14} /> Run check again</button></div></div>
          <div className="page-tabs"><button className={!largeOnly ? 'active' : ''} onClick={() => setLargeOnly(false)}>{page === 'review' ? 'All reviews' : 'Collections'}</button><button className={largeOnly ? 'active' : ''} onClick={() => setLargeOnly(true)}>Large transactions <span>{currencyCases.filter(item => item.amountReview?.required).length}</span></button></div>
          <div className="transaction-toolbar"><div className="status-filters">{['All', 'Matched', 'Reviewed match', 'Needs review', 'Awaiting evidence', 'Escalated'].map(status => <button key={status} className={`filter-chip ${filter === status ? 'selected' : ''}`} onClick={() => setFilter(status)}>{status === 'All' ? 'All' : statusText(status)}</button>)}</div><div className="table-controls">{collectionCurrencies.length > 1 && <select className="transaction-currency-control" aria-label="Transaction currency" value={listCurrency} onChange={event => { setListCurrency(event.target.value); setSelectedIds([]); }}><option value="">All currencies</option>{collectionCurrencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}</select>}<div className="table-search"><MagnifyingGlass size={14} /><input aria-label="Search cases" placeholder="Search transactions" value={search} onChange={e => setSearch(e.target.value)} /></div></div></div>
          {largeOnly && <div className="inline-notice"><Flag size={15} />Large transactions require a recorded human verification before closure.</div>}
          <CasesTable cases={filtered} {...tableProps} /><div className="table-result-count">{filtered.length ? `1–${filtered.length} of ${filtered.length}` : '0'} results{selectedIds.length > 0 && ` · ${selectedIds.length} selected`}</div>
        </>}

        {page === 'case' && selected && <>
          <div className="transaction-header"><div><button className="back-button case-back-button" onClick={backToOrigin}><ArrowLeft size={15} aria-hidden="true" />{backLabel}</button><div className="transaction-title"><h1>{money(selected.collection.amount, selected.collection.currency)} <span>{selected.collection.currency}</span></h1><Badge status={selected.status} /><AmountFlag item={selected} /></div><p>Collected from <button className="text-button" onClick={() => { setSearch(selected.collection.counterparty); setFilter('All'); setLargeOnly(false); setListCurrency(''); navigate('exceptions'); }}>{selected.collection.counterparty}</button></p></div><button className="button outline" onClick={() => watchCase(selected.id)}><Play size={13} /> Run investigation</button></div>
          {selected.amountReview?.required && <div className={`large-transaction-notice ${resolved(selected) ? 'verified' : ''}`}><ShieldCheck size={20} /><div><strong>{resolved(selected) ? 'Human verification recorded' : 'Human verification required'}</strong><p>{selected.amountReview.threshold == null ? 'No amount threshold is configured for this currency. Automatic closure is blocked.' : `${money(selected.collection.amount, selected.collection.currency)} meets the ${money(selected.amountReview.threshold, selected.collection.currency)} review threshold. ${resolved(selected) ? 'The reviewer decision is recorded in the case history.' : 'Verify the source records and transaction amount before recording a match.'}`}</p></div></div>}
          <div className="transaction-detail-layout"><div className="transaction-main">
            <section className="flat-section"><SectionTitle title="Recent activity" /><div className="detail-timeline">{state.audit.filter(event => event.caseId === selected.id).length ? state.audit.filter(event => event.caseId === selected.id).map(event => <div key={event.id}><span className="activity-dot" /><div><strong>{event.action}</strong><p>{event.detail}</p></div><time>{displayTime(event.time)}</time></div>) : <div><span className="activity-dot" /><div><strong>Transaction received</strong><p>{selected.explanation}</p></div><time>{displayTime(selected.collection.time)}</time></div>}</div></section>
            <section className="flat-section"><SectionTitle title="Payment breakdown" /><div className="breakdown-row"><span>Collection amount</span><strong>{money(selected.collection.amount, selected.collection.currency)}</strong></div>{selected.candidates.map(row => <div className="breakdown-row" key={row.id}><span>Ledger posting <code>{row.id}</code></span><strong>{money(row.amount, row.currency)}</strong></div>)}{!selected.candidates.length && <p className="muted-copy">No ledger posting found in the processed file.</p>}</section>
            <section className="flat-section"><SectionTitle title="Matching checks" /><p className="section-description">{selected.explanation}</p><div className="rule-check-list">{selected.checks.map((check, index) => { const failed = selected.category !== 'auto' && (index === selected.checks.length - 1 || /more than one|reversal|differs|difference|unexplained|exceeded|no exact|no nearby|awaiting|threshold|blocked|requires human/i.test(check)); return <div key={check}><span className={failed ? 'check-alert' : 'check-good'}>{failed ? <Info size={13} /> : <Check size={13} />}</span><span>{check}</span></div>; })}</div><p className="next-action"><strong>Required action</strong>{selected.suggestion}</p></section>
            <section className="flat-section"><AgentStage key={selected.id} item={selected} startKey={playbackCaseId === selected.id ? stageRun : 0} /></section>
            <section className="flat-section monitoring-panel" aria-labelledby="monitoring-title"><SectionTitle title="Monitoring & guardrails" description="A reviewable decision summary for this synthetic case." /><div className="monitor-grid"><div><span className="monitor-label">Task and context</span><strong id="monitoring-title">Reconcile {selected.id}</strong><p>{selected.explanation}</p><small>{selected.candidates.length} ledger candidate{selected.candidates.length === 1 ? '' : 's'} · {money(selected.collection.amount, selected.collection.currency)}</small></div><div><span className="monitor-label">Risk and control</span><strong>{selected.category === 'auto' ? 'Low · automatic closure allowed' : selected.amountReview?.required || ['duplicate', 'reversal', 'currency', 'amount'].includes(selected.category) ? 'High · human intervention' : 'Elevated · human review'}</strong><p>{selected.category === 'auto' ? 'All configured matching rules passed.' : selected.suggestion}</p><small>{selected.status === 'Reviewed match' ? 'Reviewer verified and recorded a reason' : selected.status === 'Escalated' ? 'Escalated for investigation' : selected.category === 'auto' ? 'Rules engine closed the case' : 'Automatic closure blocked'}</small></div></div><div className="monitor-trace"><h3>Decision trace</h3><ol>{selected.checks.map(check => <li key={check}>{check}</li>)}</ol><p>This records observable inputs, rule results, and actions. It does not claim to expose private model reasoning.</p></div><div className="coach-notes"><h3>Coach notes</h3><p className="muted-copy">Demo reviewer annotations for an OCBC coach to discuss during evaluation. No OCBC employee notes are preloaded.</p>{state.audit.filter(event => event.caseId === selected.id && event.action === 'Coach note').map(event => <div className="coach-entry" key={event.id}><p>{event.detail}</p><small>{event.actor} · {displayTime(event.time)}</small></div>)}<label htmlFor="coach-note">Add a coaching observation</label><textarea id="coach-note" rows="3" value={coachNote} onChange={e => setCoachNote(e.target.value)} placeholder="What evidence or intervention would improve this decision?" disabled={!isReviewer} /><button className="button outline" onClick={saveCoachNote} disabled={!isReviewer || coachNote.trim().length < 8}>Save note to audit log</button></div></section>
            <section className="flat-section"><SectionTitle title="Source records" /><div className="source-record"><h3>{selected.collection.source === 'Manual entry' ? 'Manual collection record' : 'Collection report'}</h3><div className="detail-grid"><Detail label="Collection ID" value={selected.id} /><Detail label="Reference" value={selected.collection.reference} /><Detail label="Amount" value={money(selected.collection.amount, selected.collection.currency)} /><Detail label="Recorded" value={displayTime(selected.collection.time)} /></div></div>{selected.candidates.map(row => <div className="source-record" key={row.id}><h3>Ledger posting · {row.id}</h3><div className="detail-grid"><Detail label="Reference" value={row.reference} /><Detail label="Amount" value={money(row.amount, row.currency)} /><Detail label="Posting type" value={row.type} /><Detail label="Recorded fee" value={money(row.fee, row.currency)} /></div></div>)}</section>
          </div><aside className="transaction-details"><section><h2>Details</h2><Detail label="Transaction ID" value={selected.id} /><Detail label="Payment method" value={selected.collection.channel} /><div className="detail"><span>Review level</span><strong>{selected.amountReview?.required ? <AmountFlag item={selected} /> : <span className="badge success">Standard</span>}</strong></div><Detail label="Description" value={selected.title} /><Detail label="Reference" value={selected.collection.reference} /><Detail label="Date" value={displayTime(selected.collection.time)} /><Detail label="Source" value={selected.collection.source || 'Synthetic collection report'} />{selected.collection.createdBy && <Detail label="Added by" value={selected.collection.createdBy} />}</section>
              <section className="decision-panel persistent-review-panel" id="approval-panel" aria-labelledby="review-panel-title"><h2 id="review-panel-title">Review transaction</h2><dl className="review-amount-summary"><div><dt>Amount</dt><dd>{money(selected.collection.amount, selected.collection.currency)} <span>{selected.collection.currency}</span></dd></div><div><dt>Review threshold</dt><dd>{RULE_SETTINGS.largeTransactionThresholds[selected.collection.currency] ? money(RULE_SETTINGS.largeTransactionThresholds[selected.collection.currency], selected.collection.currency) : 'Not configured'}</dd></div></dl>{approvalAvailable && <p className="approval-guidance">Verify the posting and record your reason for approval.</p>}{selected.status === 'Auto matched' ? <p className="resolved-note"><CheckCircle size={16} />Automatically matched with {selected.autoLedgerId}.</p> : <>
                {selected.status === 'Reviewed match' && <p className="resolved-note"><CheckCircle size={16} />Verified match: {selected.decision?.ledgerId}.</p>}{selected.status === 'Escalated' && <p className="resolved-note caution">Escalated for investigation.</p>}
                {!isReviewer && <p className="role-hint"><ShieldCheck size={15} />Sign in with a Reviewer account to record a decision.</p>}
                {approvalAvailable && <div className="candidate-select"><label htmlFor="candidate">Ledger posting <span>Required</span></label><select id="candidate" disabled={!isReviewer} aria-required="true" value={candidateId} onChange={e => setCandidateId(e.target.value)}><option value="">Choose a posting</option>{eligibleReviewCandidates.map(row => <option key={row.id} value={row.id}>{row.id} · {money(row.amount, row.currency)}</option>)}</select></div>}
                <label className="note-label" htmlFor="decision-note">{requiresReopening ? 'Reason for reopening' : 'Reason'} <span>Required</span></label><textarea id="decision-note" disabled={!isReviewer} rows="4" aria-required="true" aria-describedby="decision-note-help" placeholder={requiresReopening ? 'Record why this case needs another review.' : 'Record the evidence supporting this decision.'} value={note} onChange={e => setNote(e.target.value)} /><p id="decision-note-help" className="review-field-help">Enter at least eight characters.</p>
                {approvalAvailable && selected.amountReview?.required && <label className="verification-checkbox"><input type="checkbox" disabled={!isReviewer} checked={verifiedLargeAmount} onChange={e => setVerifiedLargeAmount(e.target.checked)} aria-required="true" /><span>I have verified the transaction amount, source record, and ledger posting.</span></label>}
              </>}<p className="smallprint" id="approval-scope">Approval confirms the reconciliation match. No funds are moved.</p></section>
              <section><h2>Customer</h2><Detail label="Name" value={selected.collection.counterparty} /><Detail label="Channel" value={selected.collection.channel} /></section>
            </aside></div>
          <section className="approval-action-bar" aria-label="Transaction review actions"><div className="approval-transaction-summary"><strong>{money(selected.collection.amount, selected.collection.currency)} <span>{selected.collection.currency}</span></strong><span>{selected.collection.counterparty}</span></div><div className={`approval-readiness ${approvalReady || selected.status === 'Auto matched' || selected.status === 'Reviewed match' ? 'is-ready' : ''}`}><span className="approval-readiness-icon">{approvalReady || resolved(selected) ? <CheckCircle size={18} /> : <ShieldCheck size={18} />}</span><div><strong>{actionStatus}</strong><p id="approval-status" aria-live="polite">{actionHelp}</p></div></div>{selected.status !== 'Auto matched' && <div className="approval-bar-actions">{requiresReopening ? <button className="button outline" disabled={!decisionReady} aria-describedby="approval-status" onClick={reopen}>Reopen case</button> : <><button className="button outline" disabled={!decisionReady} aria-describedby="approval-status" onClick={() => decide('Escalated')}>Escalate</button>{approvalAvailable && <button className="button primary" disabled={!approvalReady} aria-describedby="approval-status approval-scope" onClick={() => decide('Reviewed match')}><CheckCircle size={16} weight="bold" />Approve match</button>}</>}</div>}</section>
        </>}

        {page === 'audit' && <>
          <div className="page-heading"><h1>Activity</h1><button className="button outline" onClick={exportAudit}><DownloadSimple size={14} />Export</button></div><div className="page-tabs"><button className="active">All events <span>{state.audit.length}</span></button></div><div className="audit-intro"><span><span className="environment-dot" />Test environment</span><span>Batch {BATCH_ID}</span></div><div className="audit-event-list">{state.audit.map(event => <div key={event.id} className="audit-event"><span className="event-icon"><CheckCircle size={16} /></span><div><strong>{event.action}</strong><p>{event.detail}</p><span>{event.actor} · {event.caseId ? <button className="text-button" onClick={() => openCase(event.caseId)}>{event.caseId}</button> : BATCH_ID}</span></div><time>{displayTime(event.time)}</time></div>)}</div>
        </>}

        {page === 'data' && <>
          <div className="page-heading"><h1>Sources & rules</h1><span className="environment-label">Test environment</span></div><div className="page-tabs">{[['rules', 'Matching rules'], ['sources', 'Data sources'], ['references', 'References']].map(([id, label]) => <button key={id} className={dataTab === id ? 'active' : ''} onClick={() => setDataTab(id)}>{label}</button>)}</div>
          {dataTab === 'rules' && <div className="settings-layout"><div><section className="flat-section"><SectionTitle title="Automatic matching" description="Every condition must pass before a transaction closes automatically." />{ruleDescriptions().map(rule => <div className="settings-row" key={rule.id}><div><h3>{rule.label}</h3><p>{rule.description}</p></div><span className="enabled-status"><Check size={12} />Enabled</span></div>)}</section><section className="flat-section"><SectionTitle title="Large transaction verification" description="Amounts at or above these thresholds require human verification." />{Object.entries(RULE_SETTINGS.largeTransactionThresholds).map(([currency, threshold]) => <div className="settings-row" key={currency}><div><h3>{currency}</h3><p>Minimum transaction amount requiring review</p></div><strong>{money(threshold, currency)}</strong></div>)}<p className="settings-note">Thresholds are configurable demo policy values. They do not represent a bank or regulatory reporting requirement.</p></section><section className="flat-section"><SectionTitle title="Review settings" /><div className="settings-row"><div><h3>Candidate search window</h3><p>Used to identify records for manual review</p></div><strong>{RULE_SETTINGS.nearbyCandidateWindowMinutes} minutes</strong></div><div className="settings-row"><div><h3>Fee tolerance</h3><p>Used to explain a difference for review</p></div><strong>{RULE_SETTINGS.feeExplanationTolerance}</strong></div></section></div><aside className="settings-aside"><h3>Policy configuration</h3><p>Matching rules and thresholds are defined in <code>src/rules.js</code>.</p><p>Edit the settings in code, then run <code>npm test</code> to validate the policy.</p><ShieldCheck size={23} /></aside></div>}
          {dataTab === 'sources' && <><div className="source-files-grid">{[['Collection report', `${collections.length} collection records`, '/mock-data/collections.csv', collections], ['Initial ledger file', `${originalLedger.length} ledger records`, '/mock-data/ledger-initial.csv', originalLedger], ...(manualCollections.length ? [['Manual transactions', `${manualCollections.length} manually entered collection record${manualCollections.length === 1 ? '' : 's'}`, null, manualCollections]] : [])].map(([title, description, url, rows]) => <section className="source-file" key={title}><Receipt size={22} /><h2>{title}</h2><p>{description}</p><div className="source-file-rows">{rows.slice(0, 4).map(row => <div key={row.id}><span>{row.id}</span><strong>{money(row.amount, row.currency)}</strong></div>)}</div><>{url ? <a className="button outline" href={url} download><DownloadSimple size={14} />Download CSV</a> : <button className="button outline" onClick={exportManualCollections}><DownloadSimple size={14} />Export CSV</button>}</></section>)}</div><section className="late-file-panel"><div><h2>Later ledger file</h2><p>The additional file contains posting {laterLedger.id} for reference {laterLedger.reference}.</p><span className="badge neutral">{state.processedLaterFile ? 'Processed' : state.laterFileReceived ? 'Ready to process' : 'Not received'}</span></div><div><button className="button outline" disabled={state.laterFileReceived} onClick={receiveLaterFile}>Receive sample file</button><button className="button primary" onClick={run}>Run reconciliation</button></div></section><button className="reset-link" onClick={reset}>Reset the entire demo</button></>}
          {dataTab === 'references' && <div className="reference-page"><SectionTitle title="Sample data references" description="Public documentation supports the scenario and field structure. All transactions in this demo are synthetic." />{sourceLinks.map(link => <a className="reference-row" href={link.url} target="_blank" rel="noreferrer" key={link.url}><span><strong>{link.name}</strong><small>{link.detail}</small></span><ArrowSquareOut size={15} /></a>)}<div className="reference-note">Payment reference: <code>EndToEndId</code> · Posting reference: <code>AcctSvcrRef</code> · Amount: <code>Amt / Ccy</code></div></div>}
        </>}
      </main>
      <footer className="console-footer"><span><TerminalWindow size={15} />Demo environment</span><span>Batch {BATCH_ID}<span className="console-separator">·</span>Rules engine</span></footer>
    </div>
    {addingTransaction && <AddTransactionModal onClose={() => setAddingTransaction(false)} onSubmit={createManualTransaction} />}
    {batchPlayback && <BatchPlayback {...batchPlayback} onClose={() => setBatchPlayback(null)} />}
    {toast && <div className="toast" role="status"><Info size={16} />{toast}<button aria-label="Dismiss message" onClick={() => setToast('')}><X size={14} /></button></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <AuthGate>
      <App />
    </AuthGate>
  </AuthProvider>
);