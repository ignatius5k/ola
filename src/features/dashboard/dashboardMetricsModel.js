import { canReviewMatch } from '../../engine.js';

const MATCHED_STATUSES = new Set(['Auto matched', 'Reviewed match']);

export const isMatched = item => MATCHED_STATUSES.has(item.status);

export function amountToMinor(amount) {
  const text = String(amount);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) {
    throw new Error(`Invalid collection amount: ${text}`);
  }
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function formatMinorMoney(amountMinor, currency) {
  if (!['SGD', 'USD'].includes(currency)) throw new Error(`Unsupported currency: ${currency}`);
  const minor = BigInt(amountMinor);
  const sign = minor < 0n ? '-' : '';
  const absolute = minor < 0n ? -minor : minor;
  const whole = absolute / 100n;
  const cents = String(absolute % 100n).padStart(2, '0');
  const formattedWhole = new Intl.NumberFormat('en-SG', {
    style: 'currency', currency, currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(whole);
  return `${sign}${formattedWhole}.${cents}`;
}

const collectionTime = item => Date.parse(item.collection.time);
const oldestFirst = (left, right) => collectionTime(left) - collectionTime(right) || left.id.localeCompare(right.id);

export function selectRoleQueue(cases, role, handoffs = {}) {
  if (role === 'Reviewer') {
    return cases.filter(item => item.status === 'Needs review' && canReviewMatch(item) && handoffs[item.id]?.status !== 'returned')
      .sort((left, right) => Number(handoffs[right.id]?.status === 'submitted') - Number(handoffs[left.id]?.status === 'submitted') || Number(Boolean(right.amountReview?.required)) - Number(Boolean(left.amountReview?.required)) || oldestFirst(left, right));
  }
  return cases.filter(item => !isMatched(item) && handoffs[item.id]?.status !== 'submitted')
    .sort((left, right) => Number(handoffs[right.id]?.status === 'returned') - Number(handoffs[left.id]?.status === 'returned') || oldestFirst(left, right));
}

export function groupDashboardWork(cohortCases, role, handoffs = {}) {
  const roleQueue = selectRoleQueue(cohortCases, role, handoffs);
  if (role === 'Reviewer') {
    return {
      roleQueue,
      workStates: {
        submitted: roleQueue.filter(item => handoffs[item.id]?.status === 'submitted'),
        demo: roleQueue.filter(item => handoffs[item.id]?.status !== 'submitted'),
        waiting: cohortCases
          .filter(item => !isMatched(item) && handoffs[item.id]?.status === 'returned')
          .sort(oldestFirst)
      }
    };
  }
  return {
    roleQueue,
    workStates: {
      returned: roleQueue.filter(item => handoffs[item.id]?.status === 'returned'),
      investigate: roleQueue.filter(item => handoffs[item.id]?.status !== 'returned' && item.status !== 'Awaiting evidence'),
      awaiting: roleQueue.filter(item => handoffs[item.id]?.status !== 'returned' && item.status === 'Awaiting evidence')
    }
  };
}

export function buildDashboardModel(cases, currency, role, handoffs = {}) {
  if (!['SGD', 'USD'].includes(currency)) throw new Error(`Unsupported currency: ${currency}`);
  const cohortCases = cases.filter(item => item.collection.currency === currency);
  const matchedCases = cohortCases.filter(isMatched);
  const unresolvedCases = cohortCases.filter(item => !isMatched(item));
  const { roleQueue, workStates } = groupDashboardWork(cohortCases, role, handoffs);
  const largePending = unresolvedCases.filter(item => item.amountReview?.required);
  const asChartRecord = item => ({ ...item.collection, amountMinor: String(amountToMinor(item.collection.amount)) });
  const sum = items => items.reduce((total, item) => total + amountToMinor(item.collection.amount), 0n);
  const collectionMinor = sum(cohortCases);
  const matchedMinor = sum(matchedCases);
  const unresolvedMinor = sum(unresolvedCases);
  const queueMinor = sum(roleQueue);
  const queueGroups = role === 'Reviewer'
    ? [
      ['Large verification', item => item.amountReview?.required],
      ['Fee difference', item => item.category === 'fee'],
      ['Reference discrepancy', item => item.category === 'reference']
    ]
    : [
      ['Needs review', item => item.status === 'Needs review'],
      ['Awaiting evidence', item => item.status === 'Awaiting evidence'],
      ['Escalated', item => item.status === 'Escalated']
    ];
  const queueBreakdown = queueGroups.map(([label, matches]) => ({
    label, count: roleQueue.filter(matches).length
  }));
  if (collectionMinor !== matchedMinor + unresolvedMinor) throw new Error('Dashboard amounts do not partition');
  return {
    cohortCases, matchedCases, unresolvedCases, roleQueue, workStates, largePending,
    queueMinor, queueBreakdown,
    records: cohortCases.map(asChartRecord),
    matchedRecords: matchedCases.map(asChartRecord),
    unresolvedRecords: unresolvedCases.map(asChartRecord),
    collectionMinor, matchedMinor, unresolvedMinor
  };
}

export function buildCumulativeSeries(records, timeline = records) {
  const timeOf = row => {
    const time = Date.parse(row.time);
    if (!Number.isFinite(time)) throw new Error(`Invalid collection time: ${row.time}`);
    return time;
  };
  const batchTimes = timeline.map(timeOf);
  if (!batchTimes.length) return null;
  const ordered = [...records].sort((left, right) => timeOf(left) - timeOf(right));
  const start = Math.floor(Math.min(...batchTimes) / 3600000) * 3600000;
  const end = Math.max(start + 3600000, Math.ceil(Math.max(...batchTimes) / 3600000) * 3600000);
  let totalMinor = 0n;
  const values = ordered.map(row => (totalMinor += row.amountMinor == null ? amountToMinor(row.amount) : BigInt(row.amountMinor)));
  const scaleMinor = totalMinor > 0n ? (totalMinor < 4n ? 4n : totalMinor) : 100n;
  const ratio = value => Number(value * 1000000n / scaleMinor) / 1000000;
  const points = [[0, 130], ...ordered.map((row, index) => [
    Math.max(0, Math.min(400, (timeOf(row) - start) / (end - start) * 400)),
    130 - ratio(values[index]) * 130
  ]), [400, 130 - ratio(totalMinor) * 130]];
  return {
    batchTimes, start, end, totalMinor, scaleMinor, points,
    yTicks: Array.from({ length: 5 }, (_, index) => scaleMinor * BigInt(index) / 4n)
  };
}
