export const REPORT_DATE = '24 Oct 2026';
export const BATCH_ID = 'OC-241024-01';

// Fictional records. Patterns are adapted from published reconciliation guidance,
// not from customer records or an actual OCBC incident.
export const collections = [
  { id: 'COL-1011', reference: 'QR-241024-101', amount: 125, currency: 'SGD', time: '2026-10-23T09:01:00+08:00', channel: 'PayNow QR', counterparty: 'Harbour Books', story: 'A unique ledger posting arrived six minutes after the collection.' },
  { id: 'COL-1012', reference: 'QR-241024-102', amount: 80, currency: 'SGD', time: '2026-10-23T09:14:00+08:00', channel: 'PayNow QR', counterparty: 'East Coast Café', story: 'Two ledger entries carry the same reference and amount.' },
  { id: 'COL-1013', reference: 'QR-241024-103', amount: 200, currency: 'SGD', time: '2026-10-23T10:03:00+08:00', channel: 'Card collection', counterparty: 'Civic Supplies', story: 'The ledger amount is lower by a recorded processing fee.' },
  { id: 'COL-1014', reference: 'QR-241024-104', amount: 55, currency: 'SGD', time: '2026-10-23T10:42:00+08:00', channel: 'PayNow QR', counterparty: 'North Garden', story: 'The first ledger file has no corresponding posting.' },
  { id: 'COL-1015', reference: 'QR-241024-105', amount: 45, currency: 'SGD', time: '2026-10-23T11:11:00+08:00', channel: 'Card collection', counterparty: 'River Pharmacy', story: 'A reversal exists for the same reference.' },
  { id: 'COL-1016', reference: 'QR-241024-106', amount: 145, currency: 'SGD', time: '2026-10-23T11:37:00+08:00', channel: 'PayNow QR', counterparty: 'Westfield Studio', story: 'A straightforward one-to-one match.' },
  { id: 'COL-1017', reference: 'QR-241024-107', amount: 76, currency: 'SGD', time: '2026-10-23T12:08:00+08:00', channel: 'Cross-border', counterparty: 'Arbor Travel', story: 'The reference agrees but the currency does not.' },
  { id: 'COL-1018', reference: 'QR-241024-108', amount: 320, currency: 'SGD', time: '2026-10-23T13:02:00+08:00', channel: 'PayNow QR', counterparty: 'Marina Print', story: 'A similar posting has a mistyped reference.' }
];

export const originalLedger = [
  { id: 'LED-5001', reference: 'QR-241024-101', amount: 125, currency: 'SGD', time: '2026-10-23T09:07:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5002', reference: 'QR-241024-102', amount: 80, currency: 'SGD', time: '2026-10-23T09:15:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5003', reference: 'QR-241024-102', amount: 80, currency: 'SGD', time: '2026-10-23T09:16:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5004', reference: 'QR-241024-103', amount: 198.75, currency: 'SGD', time: '2026-10-23T10:06:00+08:00', type: 'credit', fee: 1.25 },
  { id: 'LED-5005', reference: 'QR-241024-105', amount: -45, currency: 'SGD', time: '2026-10-23T11:20:00+08:00', type: 'reversal', fee: 0 },
  { id: 'LED-5006', reference: 'QR-241024-106', amount: 145, currency: 'SGD', time: '2026-10-23T11:38:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5007', reference: 'QR-241024-107', amount: 76, currency: 'USD', time: '2026-10-23T12:10:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5008', reference: 'QR-241024-180', amount: 320, currency: 'SGD', time: '2026-10-23T13:06:00+08:00', type: 'credit', fee: 0 }
];

export const laterLedger = {
  id: 'LED-5009', reference: 'QR-241024-104', amount: 55, currency: 'SGD',
  time: '2026-10-23T10:59:00+08:00', type: 'credit', fee: 0
};

export const sourceLinks = [
  { name: 'Goldman Sachs ISO 20022 samples', url: 'https://developer.gs.com/docs/services/transaction-banking/iso20022samples/', detail: 'Public payment-status and statement examples inform the mock field structure.' },
  { name: 'Sample payment status (pain.002)', url: 'https://developer.gs.com/docs/services/transaction-banking/pain002paymentstatusV3sample', detail: 'End-to-end ID, transaction status, reason and instructed amount.' },
  { name: 'Sample account statement (camt.053)', url: 'https://developer.gs.com/docs/services/transaction-banking/camt-053-us-sample', detail: 'Entry reference, booking time, amount and account-servicer reference.' },
  { name: 'OCBC OneCollect help', url: 'https://www.ocbc.com/business-banking/help-and-support/payment-collection-transactions/one-collect.page', detail: 'Unique QR references, daily transaction and exception reports.' },
  { name: 'Stripe payment reconciliation guidance', url: 'https://stripe.com/guides/payment-processing-best-practices', detail: 'Matching by IDs, amounts and dates; duplicate and short payments.' },
  { name: 'Stripe payout differences', url: 'https://support.stripe.com/questions/payout-was-a-different-amount-than-expected?locale=en-GB', detail: 'Timing, refunds and fees can explain apparent differences.' }
];
