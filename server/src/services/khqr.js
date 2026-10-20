import { BakongKHQR, khqrData, IndividualInfo } from 'bakong-khqr';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { HttpError } from '../lib/errors.js';

// Generates dynamic KHQR codes (fixed amount, short expiry) with NBC's official SDK.
// Generating a code is fully offline. Whether it was paid is checked separately with
// the Bakong Open API (see khqrVerification.js), using the md5 stored on the order.

let enabled = false;

/** Validates the configured account once at startup; KHQR stays off if anything is wrong. */
export function initKhqr() {
  if (!config.khqr.accountId) {
    console.warn('[khqr] KHQR_BAKONG_ACCOUNT_ID not set — KHQR payments disabled, cash only');
    return;
  }

  const probe = generate({ amount: 0.01, billNumber: 'STARTUP-CHECK', expiresAt: new Date(Date.now() + 60_000) });
  if (probe.status.code !== 0) {
    console.error(`[khqr] configuration rejected (${probe.status.message}) — KHQR payments disabled`);
    return;
  }

  enabled = true;
  console.log(`[khqr] enabled for ${config.khqr.accountId}`);
}

export function khqrEnabled() {
  return enabled;
}

function generate({ amount, billNumber, expiresAt }) {
  const { accountId, merchantName, merchantCity } = config.khqr;
  const information = new IndividualInfo(accountId, merchantName, merchantCity, {
    currency: khqrData.currency.usd,
    amount: amount,
    billNumber: billNumber,
    storeLabel: merchantName,
    terminalLabel: 'Telegram',
    expirationTimestamp: expiresAt.getTime(),
  });

  // The SDK reports problems in `status` rather than throwing
  return new BakongKHQR().generateIndividual(information);
}

/**
 * Creates a new KHQR payment request for the order's total, at the moment it is shown to
 * the customer. Amounts are stored in cents; the QR carries dollars with two decimals.
 *
 * `automaticChecks` says whether the Bakong checks will run for this code. When they won't
 * (no token configured), the code is marked 'disabled' and staff confirm payment by hand.
 */
export function createKhqrPayment(order, { automaticChecks }) {
  if (!enabled) {
    throw new HttpError(400, 'KHQR payments are not available right now');
  }

  const shownAt = new Date();
  const expiresAt = new Date(shownAt.getTime() + config.khqr.qrLifetimeSeconds * 1000);
  const amountInDollars = Number((order.total / 100).toFixed(2));

  const result = generate({ amount: amountInDollars, billNumber: order.orderNumber, expiresAt: expiresAt });
  if (result.status.code !== 0) {
    console.error(`[khqr] could not generate for ${order.orderNumber}: ${result.status.message}`);
    throw new HttpError(502, 'Could not create the KHQR code. Please try again or pay at the counter.');
  }

  let checkStatus = 'disabled';
  if (automaticChecks) {
    checkStatus = 'pending';
  }

  return {
    qrString: result.data.qr,
    md5: result.data.md5,
    amount: order.total,
    currency: 'USD',
    shownAt: shownAt,
    expiresAt: expiresAt,
    checkStatus: checkStatus,
    checksDone: 0,
  };
}

/** What the Mini App needs to show the payment popup. */
export async function toKhqrResponse(order, payment) {
  const qrImage = await QRCode.toDataURL(payment.qrString, { errorCorrectionLevel: 'M', margin: 1, width: 480 });

  return {
    orderNumber: order.orderNumber,
    merchantName: config.khqr.merchantName,
    amount: payment.amount,
    currency: payment.currency,
    expiresAt: payment.expiresAt,
    qrString: payment.qrString,
    qrImage: qrImage,
    automaticVerification: payment.checkStatus !== 'disabled',
  };
}
