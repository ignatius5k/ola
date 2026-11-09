// Edit this file to change the demo's matching policy. Every automatic rule must pass.
// The evaluators are code rather than UI switches so policy changes are reviewable in Git.
export const RULE_SETTINGS = Object.freeze({
  maxPostingDelayMinutes: 30,
  nearbyCandidateWindowMinutes: 30,
  largeTransactionThresholds: Object.freeze({ SGD: 10000, USD: 10000 }),
  reviewerMatchCategories: Object.freeze(['fee', 'reference', 'high-value'])
});

export const AUTOMATION_POLICY_VERSION = 'SCRUM-9-v1';

export function minorUnits(value, { allowZero = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || (allowZero ? cents < 0 : cents <= 0) || Math.abs(value * 100 - cents) > 0.000001) return null;
  return cents;
}

export function largeTransactionThreshold(currency, settings = RULE_SETTINGS) {
  const threshold = settings.largeTransactionThresholds?.[currency];
  return minorUnits(threshold) !== null ? threshold : null;
}

export function getAmountReview(collection, settings = RULE_SETTINGS) {
  const threshold = largeTransactionThreshold(collection.currency, settings);
  return threshold !== null && minorUnits(collection.amount) !== null && minorUnits(collection.amount) >= minorUnits(threshold)
    ? { required: true, amount: collection.amount, currency: collection.currency, threshold }
    : null;
}

export const AUTO_MATCH_RULES = Object.freeze([
  {
    id: 'valid-money',
    label: 'Valid positive amounts and recorded fee',
    description: 'Collection and posting amounts must be positive, finite, and have cent precision; the recorded fee must be valid.',
    test: ({ collection, row }) => minorUnits(collection.amount) !== null && minorUnits(row?.amount) !== null && minorUnits(row?.fee, { allowZero: true }) !== null
  },
  {
    id: 'unique-reference',
    label: 'One exact reference',
    description: 'The collection reference must identify exactly one ledger posting.',
    test: ({ exactReference }) => exactReference.length === 1
  },
  {
    id: 'credit-only',
    label: 'Credit posting only',
    description: 'A reversal or negative posting cannot close automatically.',
    test: ({ row }) => row?.type === 'credit' && row.amount >= 0
  },
  {
    id: 'same-currency',
    label: 'Same currency',
    description: 'The collection and ledger currencies must be identical.',
    test: ({ collection, row }) => row?.currency === collection.currency
  },
  {
    id: 'exact-amount',
    label: 'Exact amount',
    description: 'The posted amount must equal the collected amount; fees need review.',
    test: ({ collection, row }) => minorUnits(row?.amount) !== null && minorUnits(row.amount) === minorUnits(collection.amount) && row.fee === 0
  },
  {
    id: 'time-window',
    label: 'Within the posting window',
    description: settings => `The posting must occur at or after collection and within ${settings.maxPostingDelayMinutes} minutes.`,
    test: ({ delayMinutes }, settings) => Number.isFinite(delayMinutes) && delayMinutes >= 0 && delayMinutes <= settings.maxPostingDelayMinutes
  },
  {
    id: 'large-transaction-review',
    label: 'Below the human verification threshold',
    description: settings => `Transactions at or above ${Object.entries(settings.largeTransactionThresholds || {}).map(([currency, threshold]) => `${currency} ${threshold.toLocaleString('en-SG')}`).join(' or ')} require reviewer verification. Currencies without a configured threshold cannot close automatically. These are demo policy thresholds.`,
    test: ({ collection }, settings) => {
      const threshold = largeTransactionThreshold(collection.currency, settings);
      const amount = minorUnits(collection.amount);
      return threshold !== null && amount !== null && amount < minorUnits(threshold);
    }
  }
]);

export function evaluateAutoRules(context, settings = RULE_SETTINGS) {
  return AUTO_MATCH_RULES.map(rule => ({ id: rule.id, label: rule.label, passed: rule.test(context, settings) }));
}

export function ruleDescriptions(settings = RULE_SETTINGS) {
  return AUTO_MATCH_RULES.map(rule => ({ id: rule.id, label: rule.label, description: typeof rule.description === 'function' ? rule.description(settings) : rule.description }));
}
