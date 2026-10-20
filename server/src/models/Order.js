import mongoose from 'mongoose';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../services/orderWorkflow.js';

const { Schema } = mongoose;

// Everything below is a snapshot at order time so history stays accurate
// even if products, prices or the customer's Telegram profile change later.
const selectedOptionSchema = new Schema(
  {
    groupKey: String,
    groupName: String,
    choiceId: Schema.Types.ObjectId,
    label: String,
    priceDelta: Number,
  },
  { _id: false },
);

// The automatic payment checks for one QR code (see services/khqrVerification.js):
//   pending   – checks are scheduled or running
//   paid      – Bakong confirmed the payment and the order was marked paid
//   not_found – all checks ran and Bakong never saw a payment
//   stopped   – checks ended early (order paid by staff, daily limit reached, token problem…)
//   mismatch  – Bakong saw a payment, but its amount or currency didn't match the order
//   disabled  – no Bakong token configured, so staff confirm the payment by hand
export const KHQR_CHECK_STATUSES = ['pending', 'paid', 'not_found', 'stopped', 'mismatch', 'disabled'];

// One KHQR payment request. A new one is issued when the previous one expires. All are kept,
// because a customer could pay an older code just before it expired.
const khqrPaymentSchema = new Schema(
  {
    md5: { type: String, required: true },
    qrString: { type: String, required: true },
    amount: { type: Number, required: true }, // cents
    currency: { type: String, default: 'USD' },
    shownAt: { type: Date, required: true }, // when the customer was shown the code
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },

    checkStatus: { type: String, enum: KHQR_CHECK_STATUSES, default: 'pending' },
    checksDone: { type: Number, default: 0 },
    lastCheckedAt: Date,
    checkNote: String, // why checks stopped, or what Bakong last said
    bakongHash: String, // Bakong's transaction hash once paid
    verifiedAt: Date,
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    imageUrl: String,
    basePrice: { type: Number, required: true },
    options: { type: [selectedOptionSchema], default: [] },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const historySchema = new Schema(
  {
    type: { type: String, enum: ['order_status', 'payment_status'], required: true },
    from: String,
    to: { type: String, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'Admin' },
    byName: String,
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    // Orders placed in Telegram always have a customer. Counter orders created by staff for a
    // walk-in don't: they carry just a name (customerSnapshot.firstName) and no Telegram identity.
    customer: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customerSnapshot: {
      telegramUserId: { type: String, index: true },
      telegramUsername: { type: String, index: true },
      firstName: String,
      lastName: String,
    },
    // Where the order came from. Orders saved before this field existed are Telegram orders.
    source: { type: String, enum: ['telegram', 'staff'], default: 'telegram' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    createdByName: String,
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    promoCode: String,
    total: { type: Number, required: true },
    note: { type: String, maxlength: 300 },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash_at_counter' },
    khqrPayments: { type: [khqrPaymentSchema], default: [] },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid', index: true },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },

    confirmedAt: Date,
    preparingAt: Date,
    readyAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    paidAt: Date,
    refundedAt: Date,

    history: { type: [historySchema], default: [] },

    // Client-generated idempotency key to prevent duplicate submissions
    clientOrderId: { type: String, required: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

orderSchema.index({ customer: 1, clientOrderId: 1 }, { unique: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'khqrPayments.md5': 1 }, { sparse: true });
orderSchema.index({ 'khqrPayments.checkStatus': 1 }, { sparse: true });

export const Order = mongoose.model('Order', orderSchema);
