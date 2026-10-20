import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { nextSequence } from '../models/Counter.js';
import { priceItems } from '../services/pricing.js';
import { notifyOrderPlaced } from '../services/bot.js';
import { HttpError, badRequest, conflict, notFound, unauthorized } from '../lib/errors.js';
import { createKhqrPayment, khqrEnabled, toKhqrResponse } from '../services/khqr.js';
import { automaticChecksAvailable, startPaymentChecks } from '../services/khqrVerification.js';
import { PAYMENT_METHODS } from '../services/orderWorkflow.js';
import { requireCustomer } from '../middleware/auth.js';
import { shopDayRange } from '../lib/time.js';
import { itemsSchema } from '../lib/cartSchema.js';

const OPEN_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];
const MAX_OPEN_ORDERS = 5;

/**
 * Customers only see today's orders (shop timezone), plus any order still in progress so
 * someone waiting at midnight doesn't lose sight of theirs. Older orders stay in the
 * database for staff but are not served to the customer at all.
 */
function visibleToCustomer() {
  return { $or: [{ createdAt: { $gte: shopDayRange().start } }, { orderStatus: { $in: OPEN_STATUSES } }] };
}

export const ordersRouter = Router();
ordersRouter.use(requireCustomer);

const placeOrderLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

const placeOrderBody = z.object({
  clientOrderId: z.uuid(),
  items: itemsSchema,
  paymentMethod: z.enum(PAYMENT_METHODS).default('cash_at_counter'),
  note: z.string().trim().max(300).optional(),
});

/** Strip staff-only fields before returning an order to a customer. */
function toCustomerOrder(order) {
  const { history, clientOrderId, khqrPayments, __v, ...rest } = order.toObject ? order.toObject() : order;
  return rest;
}

// Price a cart without placing an order (used by the checkout screen)
ordersRouter.post('/quote', async (req, res) => {
  const items = itemsSchema.parse(req.body.items);
  res.json(await priceItems(items));
});

ordersRouter.post('/', placeOrderLimiter, async (req, res) => {
  const body = placeOrderBody.parse(req.body);
  const user = await User.findById(req.customerId);
  if (!user) throw unauthorized();

  // Same idempotency key = same order (double taps, retries after network errors)
  const existing = await Order.findOne({ customer: user._id, clientOrderId: body.clientOrderId });
  if (existing) return res.status(200).json(toCustomerOrder(existing));

  const openOrders = await Order.countDocuments({
    customer: user._id,
    orderStatus: { $in: OPEN_STATUSES },
  });
  if (openOrders >= MAX_OPEN_ORDERS) {
    throw new HttpError(429, 'You have several orders in progress. Please collect them before placing another.');
  }

  if (body.paymentMethod === 'khqr' && !khqrEnabled()) throw badRequest('KHQR payments are not available right now');

  const priced = await priceItems(body.items);
  const seq = await nextSequence('order');
  const orderNumber = `ORD-${seq}`;

  let order;
  try {
    order = await Order.create({
      orderNumber,
      customer: user._id,
      customerSnapshot: {
        telegramUserId: user.telegramUserId,
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...priced,
      note: body.note,
      // KHQR orders get their QR code when the customer opens the payment popup (see below),
      // so the code's 120 seconds start when it is actually shown
      paymentMethod: body.paymentMethod,
      clientOrderId: body.clientOrderId,
    });
  } catch (err) {
    // Lost a race with a concurrent identical submission
    if (err?.code === 11000 && err.keyPattern?.clientOrderId) {
      const dup = await Order.findOne({ customer: user._id, clientOrderId: body.clientOrderId });
      return res.status(200).json(toCustomerOrder(dup));
    }
    throw err;
  }

  notifyOrderPlaced(order);
  res.status(201).json(toCustomerOrder(order));
});

ordersRouter.get('/my-orders', async (req, res) => {
  const orders = await Order.find({ customer: req.customerId, ...visibleToCustomer() })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('-history -clientOrderId -khqrPayments -__v')
    .lean();
  res.json(orders);
});

const khqrLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

// Each QR code can cost up to six Bakong requests, and Bakong allows 100 a day,
// so one order can't be shown more than this many codes.
const MAX_QR_CODES_PER_ORDER = 3;

// The KHQR popup. Returns the order's current code while it can still be paid, or creates a
// new one (valid for 120 seconds from now) and starts the automatic payment checks for it.
ordersRouter.post('/:id/khqr', khqrLimiter, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw notFound('Order not found');
  }
  const order = await Order.findOne({ _id: req.params.id, customer: req.customerId, ...visibleToCustomer() });
  if (!order) {
    throw notFound('Order not found');
  }
  if (order.paymentMethod !== 'khqr') {
    throw badRequest('This order is not paid by KHQR');
  }
  if (order.paymentStatus !== 'unpaid') {
    throw conflict('This order is already paid');
  }
  if (order.orderStatus === 'cancelled') {
    throw conflict('This order was cancelled');
  }

  // Reopening the popup shows the same code again; its checks are already running
  const latestPayment = order.khqrPayments[order.khqrPayments.length - 1];
  if (latestPayment && latestPayment.expiresAt.getTime() > Date.now()) {
    res.json(await toKhqrResponse(order, latestPayment));
    return;
  }

  if (order.khqrPayments.length >= MAX_QR_CODES_PER_ORDER) {
    throw conflict('This order has used all of its QR codes. Please pay in cash at the counter.');
  }

  const automaticChecks = automaticChecksAvailable();
  const payment = createKhqrPayment(order, { automaticChecks: automaticChecks });
  order.khqrPayments.push(payment);
  await order.save();

  if (automaticChecks) {
    startPaymentChecks(order._id, payment.md5);
  }
  res.json(await toKhqrResponse(order, payment));
});

ordersRouter.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Order not found');
  // Scoped to the authenticated customer — other customers' orders are simply "not found"
  const order = await Order.findOne({ _id: req.params.id, customer: req.customerId, ...visibleToCustomer() }).lean();
  if (!order) throw notFound('Order not found');
  res.json(toCustomerOrder(order));
});
