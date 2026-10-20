import { config } from '../config.js';
import { Counter } from '../models/Counter.js';
import { shopDateString } from '../lib/time.js';

// Client for the one Bakong Open API endpoint we use: "check transaction by md5".
// Reference: Bakong Open API documentation v1.0.2 (National Bank of Cambodia), section 5.
//
// Every response has `responseCode` (0 = success, 1 = failure) and, on failure, an
// `errorCode` that explains why. A successful lookup means the QR code was paid.

const ERROR_TRANSACTION_NOT_FOUND = 1;
const ERROR_STATIC_QR_NOT_SUPPORTED = 2;
const ERROR_TRANSACTION_FAILED = 3;
const ERROR_UNAUTHORIZED = 6;
const ERROR_RATE_LIMIT_EXCEEDED = 17;

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Asks Bakong whether the QR code with this md5 has been paid.
 *
 * Always resolves (never throws) with an object whose `outcome` is one of:
 *   'paid'          – Bakong found the transaction; details are in `transaction`
 *   'not_found'     – not paid yet
 *   'failed'        – the customer tried to pay but the transaction failed
 *   'unauthorized'  – the token is missing, wrong or expired
 *   'rate_limited'  – today's request allowance is used up
 *   'unsupported'   – Bakong does not support this kind of QR code
 *   'error'         – network problem or an unexpected reply; worth trying again later
 */
export async function checkTransactionByMd5(md5) {
  const url = `${config.khqr.bakongApiUrl}/v1/check_transaction_by_md5`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.khqr.bakongToken}`,
      },
      body: JSON.stringify({ md5: md5 }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return { outcome: 'error', message: `Could not reach Bakong (${error.message})` };
  }

  if (response.status === 401 || response.status === 403) {
    return { outcome: 'unauthorized', message: `Bakong refused the request (HTTP ${response.status})` };
  }
  if (response.status === 429) {
    return { outcome: 'rate_limited', message: 'Bakong says the daily request limit is used up (HTTP 429)' };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { outcome: 'error', message: `Bakong sent an unreadable reply (HTTP ${response.status})` };
  }

  if (body.responseCode === 0 && body.data) {
    return { outcome: 'paid', transaction: body.data };
  }

  const message = body.responseMessage || `HTTP ${response.status}`;
  switch (body.errorCode) {
    case ERROR_TRANSACTION_NOT_FOUND:
      return { outcome: 'not_found', message: message };
    case ERROR_TRANSACTION_FAILED:
      return { outcome: 'failed', message: message };
    case ERROR_UNAUTHORIZED:
      return { outcome: 'unauthorized', message: message };
    case ERROR_RATE_LIMIT_EXCEEDED:
      return { outcome: 'rate_limited', message: message };
    case ERROR_STATIC_QR_NOT_SUPPORTED:
      return { outcome: 'unsupported', message: message };
    default:
      return { outcome: 'error', message: `Unexpected reply from Bakong: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Daily request budget
//
// Bakong allows a fixed number of requests per day. The count is kept in the
// database (not in memory) so it survives restarts and redeploys. Bakong's exact
// reset time isn't documented; we reset at midnight in the shop's timezone.
// ---------------------------------------------------------------------------

function todaysCounterId() {
  return `bakong-requests-${shopDateString()}`;
}

/**
 * Takes one request from today's allowance.
 * Returns true if a request may be made, false if the allowance is used up.
 */
export async function reserveDailyRequest() {
  const limit = config.khqr.bakongDailyRequestLimit;
  try {
    // Only increments while the count is below the limit. When the limit is reached the
    // filter no longer matches, the upsert tries to create a second document with the same
    // id, and MongoDB rejects it with a duplicate-key error (code 11000).
    await Counter.findOneAndUpdate(
      { _id: todaysCounterId(), seq: { $lt: limit } },
      { $inc: { seq: 1 } },
      { upsert: true },
    );
    return true;
  } catch (error) {
    if (error.code === 11000) {
      return false;
    }
    throw error;
  }
}

/** Gives back a request that was reserved but never sent. */
export async function releaseDailyRequest() {
  await Counter.updateOne({ _id: todaysCounterId(), seq: { $gt: 0 } }, { $inc: { seq: -1 } });
}

/** Marks today's allowance as fully used (after Bakong tells us it is). */
export async function markDailyLimitReached() {
  await Counter.updateOne(
    { _id: todaysCounterId() },
    { $max: { seq: config.khqr.bakongDailyRequestLimit } },
    { upsert: true },
  );
}

export async function requestsUsedToday() {
  const counter = await Counter.findById(todaysCounterId()).lean();
  if (counter) {
    return counter.seq;
  }
  return 0;
}
