import { config } from '../config.js';
import { Order } from '../models/Order.js';
import { khqrEnabled } from './khqr.js';
import { checkTransactionByMd5, markDailyLimitReached, releaseDailyRequest, requestsUsedToday, reserveDailyRequest } from './bakong.js';
import { applyPaymentStatus, canTransitionPayment } from './orderWorkflow.js';
import { notifyPaymentReceived } from './bot.js';

// Automatic KHQR payment confirmation.
//
// After a customer is shown a QR code, the server asks Bakong whether it has been paid
// at these moments (seconds after the code was shown). The last check lands when the
// code expires. Checking stops as soon as a payment is found.
//
// Bakong allows 100 requests per day, so each code gets at most these six checks, and a
// daily counter in the database (services/bakong.js) stops all checks once the limit is
// reached. Progress is saved on the order after every check, so pending checks resume
// after a restart or redeploy instead of starting over.
export const CHECK_SCHEDULE_SECONDS = [10, 20, 30, 60, 90, 120];

// How the order history names the automatic confirmation
const BAKONG_ACTOR = { _id: undefined, name: 'Bakong (automatic)' };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_WARNING_DAYS = 14;
const SAVE_ATTEMPTS = 3;

// md5 -> timer for the next check of that QR code
const scheduledChecks = new Map();

// Set when automatic checks can't work (no token, expired token, token rejected).
// While set, no requests are sent and staff confirm KHQR payments by hand.
let disabledReason = null;
let shuttingDown = false;

// ---------------------------------------------------------------------------
// Start-up and shut-down
// ---------------------------------------------------------------------------

export function initKhqrVerification() {
  if (!khqrEnabled()) {
    return;
  }

  if (!config.khqr.bakongToken) {
    disabledReason = 'no Bakong token configured';
    console.warn('[khqr] KHQR_BAKONG_TOKEN not set — staff must confirm KHQR payments by hand');
    return;
  }

  const expiresAt = readTokenExpiry(config.khqr.bakongToken);
  if (expiresAt === null) {
    console.log('[khqr] automatic payment checks on');
  } else {
    const daysLeft = Math.floor((expiresAt.getTime() - Date.now()) / ONE_DAY_MS);
    if (daysLeft < 0) {
      disabledReason = 'the Bakong token has expired';
      console.error(`[khqr] Bakong token expired on ${expiresAt.toISOString()} — renew it to turn automatic checks back on`);
      return;
    }
    if (daysLeft <= TOKEN_WARNING_DAYS) {
      console.warn(`[khqr] Bakong token expires in ${daysLeft} day(s), on ${expiresAt.toISOString()} — renew it soon`);
    }
    console.log(`[khqr] automatic payment checks on (token valid until ${expiresAt.toISOString().slice(0, 10)})`);
  }

  resumePendingChecks().catch((error) => {
    console.error('[khqr] could not resume pending payment checks:', error);
  });
}

export function stopKhqrVerification() {
  shuttingDown = true;
  for (const timer of scheduledChecks.values()) {
    clearTimeout(timer);
  }
  scheduledChecks.clear();
}

/** Whether new QR codes should get automatic checks. */
export function automaticChecksAvailable() {
  return khqrEnabled() && disabledReason === null;
}

/** For the admin dashboard. */
export async function bakongUsageToday() {
  return {
    automaticChecks: automaticChecksAvailable(),
    disabledReason: disabledReason,
    requestsUsed: await requestsUsedToday(),
    dailyLimit: config.khqr.bakongDailyRequestLimit,
  };
}

/** Starts the checks for a QR code that was just shown to a customer. */
export function startPaymentChecks(orderId, md5) {
  scheduleNextCheck(orderId, md5).catch((error) => {
    console.error(`[khqr] could not schedule payment checks for ${md5}:`, error);
  });
}

// ---------------------------------------------------------------------------
// The check cycle: schedule → claim → ask Bakong → record → schedule the next one
// ---------------------------------------------------------------------------

async function scheduleNextCheck(orderId, md5) {
  if (shuttingDown) {
    return;
  }
  // Each code has a single chain of checks; never start a second one
  if (scheduledChecks.has(md5)) {
    return;
  }

  const order = await Order.findById(orderId).select('khqrPayments').lean();
  const payment = findPayment(order, md5);
  if (!payment || payment.checkStatus !== 'pending') {
    return;
  }

  if (payment.checksDone >= CHECK_SCHEDULE_SECONDS.length) {
    await finishChecks(orderId, md5, 'not_found', 'Bakong did not report a payment');
    return;
  }

  const secondsAfterShown = CHECK_SCHEDULE_SECONDS[payment.checksDone];
  const dueAt = new Date(payment.shownAt).getTime() + secondsAfterShown * 1000;
  // A check that is already overdue (for example after a restart) runs straight away
  const delay = Math.max(0, dueAt - Date.now());

  const timer = setTimeout(() => {
    scheduledChecks.delete(md5);
    runCheck(orderId, md5).catch((error) => {
      console.error(`[khqr] payment check failed for ${md5}:`, error);
    });
  }, delay);
  scheduledChecks.set(md5, timer);
}

async function runCheck(orderId, md5) {
  if (shuttingDown) {
    return;
  }

  const order = await Order.findById(orderId).select('orderNumber paymentStatus orderStatus khqrPayments').lean();
  const payment = findPayment(order, md5);
  if (!payment || payment.checkStatus !== 'pending') {
    return;
  }

  // Don't spend a Bakong request on an order that is already settled
  if (order.paymentStatus !== 'unpaid') {
    await finishChecks(orderId, md5, 'stopped', 'The order was already marked paid');
    return;
  }
  if (order.orderStatus === 'cancelled') {
    await finishChecks(orderId, md5, 'stopped', 'The order was cancelled');
    return;
  }
  if (disabledReason !== null) {
    await finishChecks(orderId, md5, 'stopped', `Automatic checks are off: ${disabledReason}`);
    return;
  }

  // Take a request from today's allowance first, so `checksDone` only ever counts
  // requests that were really sent to Bakong.
  const allowed = await reserveDailyRequest();
  if (!allowed) {
    const limit = config.khqr.bakongDailyRequestLimit;
    console.warn(`[khqr] daily Bakong limit of ${limit} requests reached — #${order.orderNumber} needs a manual check`);
    await finishChecks(orderId, md5, 'stopped', `Daily Bakong limit of ${limit} requests reached`);
    return;
  }

  // Claim this check before making the request. The filter only matches if nobody else has
  // done this check yet, so the same check can never be sent twice.
  const checkIndex = payment.checksDone;
  const claim = await Order.updateOne(
    {
      _id: orderId,
      khqrPayments: { $elemMatch: { md5: md5, checkStatus: 'pending', checksDone: checkIndex } },
    },
    {
      $inc: { 'khqrPayments.$.checksDone': 1 },
      $set: { 'khqrPayments.$.lastCheckedAt': new Date() },
    },
  );
  if (claim.modifiedCount === 0) {
    // Someone else already did this check, so no request will be sent: give the allowance back
    await releaseDailyRequest();
    return;
  }

  const checkNumber = checkIndex + 1;
  const result = await checkTransactionByMd5(md5);
  console.log(`[khqr] #${order.orderNumber} check ${checkNumber}/${CHECK_SCHEDULE_SECONDS.length}: ${result.outcome}`);

  if (result.outcome === 'paid') {
    await recordPayment(orderId, md5, result.transaction);
    return;
  }

  if (result.outcome === 'unauthorized') {
    disabledReason = `Bakong rejected the token (${result.message})`;
    console.error(`[khqr] ${disabledReason} — automatic checks are off until the token is fixed and the server restarts`);
    await finishChecks(orderId, md5, 'stopped', disabledReason);
    return;
  }

  if (result.outcome === 'rate_limited') {
    await markDailyLimitReached();
    console.warn(`[khqr] ${result.message} — no more checks today`);
    await finishChecks(orderId, md5, 'stopped', result.message);
    return;
  }

  if (result.outcome === 'unsupported') {
    await finishChecks(orderId, md5, 'stopped', result.message);
    return;
  }

  // 'not_found', 'failed' or 'error': not paid yet, so keep to the schedule
  await saveCheckNote(orderId, md5, result.message);
  if (checkNumber >= CHECK_SCHEDULE_SECONDS.length) {
    await finishChecks(orderId, md5, 'not_found', `No payment found after ${checkNumber} checks. Last reply: ${result.message}`);
    return;
  }
  await scheduleNextCheck(orderId, md5);
}

// ---------------------------------------------------------------------------
// Recording the result
// ---------------------------------------------------------------------------

async function recordPayment(orderId, md5, transaction) {
  // The md5 already ties the payment to this exact QR code, but double-check that Bakong's
  // amount and currency match before marking anything paid.
  const paidCents = Math.round(Number(transaction.amount) * 100);
  const paidCurrency = String(transaction.currency).toUpperCase();

  for (let attempt = 1; attempt <= SAVE_ATTEMPTS; attempt++) {
    const order = await Order.findById(orderId);
    if (!order) {
      return;
    }
    const payment = order.khqrPayments.find((candidate) => candidate.md5 === md5);
    if (!payment || payment.checkStatus !== 'pending') {
      return;
    }

    if (paidCents !== payment.amount || paidCurrency !== payment.currency) {
      const expected = `${(payment.amount / 100).toFixed(2)} ${payment.currency}`;
      const reported = `${transaction.amount} ${transaction.currency}`;
      console.warn(`[khqr] #${order.orderNumber}: Bakong reported ${reported} but ${expected} was expected — not marking paid`);
      payment.checkStatus = 'mismatch';
      payment.checkNote = `Bakong reported ${reported}, expected ${expected}. Check the payment by hand.`;
    } else {
      payment.checkStatus = 'paid';
      payment.bakongHash = transaction.hash;
      payment.verifiedAt = new Date();
      payment.checkNote = `Paid from ${transaction.fromAccountId}`;
    }

    let markedPaid = false;
    if (payment.checkStatus === 'paid') {
      if (canTransitionPayment(order, 'paid')) {
        applyPaymentStatus(order, 'paid', BAKONG_ACTOR, `KHQR payment confirmed by Bakong (transaction ${shortHash(transaction.hash)})`);
        markedPaid = true;
      } else if (order.orderStatus === 'cancelled') {
        payment.checkNote = `Paid from ${transaction.fromAccountId}, but the order was cancelled — a refund may be needed.`;
        console.warn(`[khqr] #${order.orderNumber} was paid by KHQR after being cancelled — a refund may be needed`);
      }
    }

    try {
      await order.save();
    } catch (error) {
      // Someone else changed the order at the same moment (e.g. staff updating its status). Reload and retry.
      if (error.name === 'VersionError' && attempt < SAVE_ATTEMPTS) {
        continue;
      }
      throw error;
    }

    if (markedPaid) {
      console.log(`[khqr] #${order.orderNumber} marked paid automatically (Bakong ${shortHash(transaction.hash)})`);
      notifyPaymentReceived(order);
    }
    return;
  }
}

async function finishChecks(orderId, md5, status, note) {
  await Order.updateOne(
    { _id: orderId, khqrPayments: { $elemMatch: { md5: md5, checkStatus: 'pending' } } },
    { $set: { 'khqrPayments.$.checkStatus': status, 'khqrPayments.$.checkNote': note } },
  );
}

async function saveCheckNote(orderId, md5, note) {
  await Order.updateOne(
    { _id: orderId, khqrPayments: { $elemMatch: { md5: md5, checkStatus: 'pending' } } },
    { $set: { 'khqrPayments.$.checkNote': note } },
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resumePendingChecks() {
  const orders = await Order.find({ 'khqrPayments.checkStatus': 'pending' }).select('khqrPayments.md5 khqrPayments.checkStatus').lean();

  let resumed = 0;
  for (const order of orders) {
    for (const payment of order.khqrPayments) {
      if (payment.checkStatus === 'pending') {
        await scheduleNextCheck(order._id, payment.md5);
        resumed++;
      }
    }
  }
  if (resumed > 0) {
    console.log(`[khqr] resumed payment checks for ${resumed} QR code(s)`);
  }
}

function findPayment(order, md5) {
  if (!order) {
    return null;
  }
  const payment = order.khqrPayments.find((candidate) => candidate.md5 === md5);
  if (!payment) {
    return null;
  }
  return payment;
}

function shortHash(hash) {
  if (!hash) {
    return 'unknown';
  }
  return String(hash).slice(0, 8);
}

/** Reads the expiry date from the token (a JWT) without contacting Bakong. */
function readTokenExpiry(token) {
  try {
    const payloadPart = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number') {
      return null;
    }
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}
