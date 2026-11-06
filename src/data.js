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
  { id: 'COL-1018', reference: 'QR-241024-108', amount: 320, currency: 'SGD', time: '2026-10-23T13:02:00+08:00', channel: 'PayNow QR', counterparty: 'Marina Print', story: 'A similar posting has a mistyped reference.' },
  { id: 'COL-1019', reference: 'QR-241024-109', amount: 12500, currency: 'SGD', time: '2026-10-23T13:30:00+08:00', channel: 'Bank transfer', counterparty: 'Summit Industrial', story: 'A high-value transaction meets the demo human verification threshold.' },
  { id: 'COL-1020', reference: 'QR-241024-110', amount: 28.5, currency: 'SGD', time: '2026-10-23T14:01:00+08:00', channel: 'PayNow QR', counterparty: 'Orchard Florist', story: 'Straight-through processing: a unique exact-value credit posts within two minutes.' },
  { id: 'COL-1021', reference: 'QR-241024-111', amount: 640, currency: 'SGD', time: '2026-10-23T14:18:00+08:00', channel: 'Bank transfer', counterparty: 'Meridian Tools', story: 'Posting delay: the exact credit falls outside the 30-minute demo window.' },
  { id: 'COL-1022', reference: 'QR-241024-112', amount: 91, currency: 'SGD', time: '2026-10-23T14:37:00+08:00', channel: 'PayNow QR', counterparty: 'Saffron Market', story: 'Unexplained short payment: the ledger credit is lower without a recorded fee.' },
  { id: 'COL-1023', reference: 'QR-241024-113', amount: 73, currency: 'SGD', time: '2026-10-23T15:02:00+08:00', channel: 'Card collection', counterparty: 'Tanjong Hardware', story: 'Unexplained overpayment: the ledger credit exceeds the collected amount.' },
  { id: 'COL-1024', reference: 'QR-241024-114', amount: 19.9, currency: 'SGD', time: '2026-10-23T15:21:00+08:00', channel: 'PayNow QR', counterparty: 'Kallang Coffee', story: 'Missing posting: no corresponding ledger credit is present in either sample file.' },
  { id: 'COL-1025', reference: 'QR-241024-115', amount: 310, currency: 'SGD', time: '2026-10-23T15:42:00+08:00', channel: 'Card collection', counterparty: 'Beacon Stationery', story: 'Net settlement: a recorded merchant fee explains the lower ledger credit.' },
  { id: 'COL-1026', reference: 'QR-241024-116', amount: 48, currency: 'SGD', time: '2026-10-23T16:04:00+08:00', channel: 'PayNow QR', counterparty: 'Clementi Bakery', story: 'Duplicate posting: two credits carry the same collection reference.' },
  { id: 'COL-1027', reference: 'QR-241024-117', amount: 160, currency: 'SGD', time: '2026-10-23T16:23:00+08:00', channel: 'PayNow QR', counterparty: 'Bayshore Crafts', story: 'Reference discrepancy: a same-value nearby credit has a transposed reference.' },
  { id: 'COL-1028', reference: 'QR-241024-118', amount: 250, currency: 'SGD', time: '2026-10-23T16:49:00+08:00', channel: 'Bank transfer', counterparty: 'Atlas Services', story: 'Reversal: a negative reversal entry cannot be treated as a settled credit.' },
  { id: 'COL-1029', reference: 'QR-241024-119', amount: 42, currency: 'SGD', time: '2026-10-23T17:07:00+08:00', channel: 'PayNow QR', counterparty: 'Pine Books', story: 'Straight-through processing: a unique exact-value credit passes every rule.' },
  { id: 'COL-1030', reference: 'QR-241024-120', amount: 118, currency: 'SGD', time: '2026-10-23T17:25:00+08:00', channel: 'Cross-border', counterparty: 'Cobalt Travel', story: 'Currency mismatch: the ledger currency differs from the collection currency.' },
  { id: 'COL-1031', reference: 'QR-241024-121', amount: 15000, currency: 'SGD', time: '2026-10-23T17:48:00+08:00', channel: 'Bank transfer', counterparty: 'North Quay Trading', story: 'High-value verification: exact evidence still requires a reviewer under demo policy.' },
  { id: 'COL-1032', reference: 'QR-241024-122', amount: 39.5, currency: 'SGD', time: '2026-10-23T18:03:00+08:00', channel: 'PayNow QR', counterparty: 'Holland Grocer', story: 'Straight-through processing: unique reference, amount, currency, and timing agree.' },
  { id: 'COL-1033', reference: 'QR-241024-123', amount: 87, currency: 'SGD', time: '2026-10-23T18:19:00+08:00', channel: 'PayNow QR', counterparty: 'Fern Pharmacy', story: 'Boundary case: the credit posts exactly 30 minutes after collection.' },
  { id: 'COL-1034', reference: 'QR-241024-124', amount: 132, currency: 'SGD', time: '2026-10-23T18:54:00+08:00', channel: 'PayNow QR', counterparty: 'Sunset Printworks', story: 'Straight-through processing: a unique exact-value credit closes automatically.' }
];

export const originalLedger = [
  { id: 'LED-5001', reference: 'QR-241024-101', amount: 125, currency: 'SGD', time: '2026-10-23T09:07:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5002', reference: 'QR-241024-102', amount: 80, currency: 'SGD', time: '2026-10-23T09:15:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5003', reference: 'QR-241024-102', amount: 80, currency: 'SGD', time: '2026-10-23T09:16:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5004', reference: 'QR-241024-103', amount: 198.75, currency: 'SGD', time: '2026-10-23T10:06:00+08:00', type: 'credit', fee: 1.25 },
  { id: 'LED-5005', reference: 'QR-241024-105', amount: -45, currency: 'SGD', time: '2026-10-23T11:20:00+08:00', type: 'reversal', fee: 0 },
  { id: 'LED-5006', reference: 'QR-241024-106', amount: 145, currency: 'SGD', time: '2026-10-23T11:38:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5007', reference: 'QR-241024-107', amount: 76, currency: 'USD', time: '2026-10-23T12:10:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5008', reference: 'QR-241024-180', amount: 320, currency: 'SGD', time: '2026-10-23T13:06:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5010', reference: 'QR-241024-109', amount: 12500, currency: 'SGD', time: '2026-10-23T13:32:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5011', reference: 'QR-241024-110', amount: 28.5, currency: 'SGD', time: '2026-10-23T14:03:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5012', reference: 'QR-241024-111', amount: 640, currency: 'SGD', time: '2026-10-23T15:03:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5013', reference: 'QR-241024-112', amount: 89, currency: 'SGD', time: '2026-10-23T14:40:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5014', reference: 'QR-241024-113', amount: 75, currency: 'SGD', time: '2026-10-23T15:05:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5015', reference: 'QR-241024-115', amount: 307.5, currency: 'SGD', time: '2026-10-23T15:45:00+08:00', type: 'credit', fee: 2.5 },
  { id: 'LED-5016', reference: 'QR-241024-116', amount: 48, currency: 'SGD', time: '2026-10-23T16:06:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5017', reference: 'QR-241024-116', amount: 48, currency: 'SGD', time: '2026-10-23T16:07:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5018', reference: 'QR-241024-171', amount: 160, currency: 'SGD', time: '2026-10-23T16:26:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5019', reference: 'QR-241024-118', amount: -250, currency: 'SGD', time: '2026-10-23T16:53:00+08:00', type: 'reversal', fee: 0 },
  { id: 'LED-5020', reference: 'QR-241024-119', amount: 42, currency: 'SGD', time: '2026-10-23T17:09:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5021', reference: 'QR-241024-120', amount: 118, currency: 'USD', time: '2026-10-23T17:28:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5022', reference: 'QR-241024-121', amount: 15000, currency: 'SGD', time: '2026-10-23T17:50:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5023', reference: 'QR-241024-122', amount: 39.5, currency: 'SGD', time: '2026-10-23T18:05:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5024', reference: 'QR-241024-123', amount: 87, currency: 'SGD', time: '2026-10-23T18:49:00+08:00', type: 'credit', fee: 0 },
  { id: 'LED-5025', reference: 'QR-241024-124', amount: 132, currency: 'SGD', time: '2026-10-23T18:56:00+08:00', type: 'credit', fee: 0 }
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
