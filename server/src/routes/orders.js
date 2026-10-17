import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { nextSequence } from '../models/Counter.js';
import { priceItems } from '../services/pricing.js';
import { notifyOrderPlaced } from '../services/bot.js';
import { HttpError, notFound, unauthorized } from '../lib/errors.js';
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
  note: z.string().trim().max(300).optional(),
});

/** Strip staff-only fields before returning an order to a customer. */
function toCustomerOrder(order) {
  const { history, clientOrderId, __v, ...rest } = order.toObject ? order.toObject() : order;
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

  const priced = await priceItems(body.items);
  const seq = await nextSequence('order');

  let order;
  try {
    order = await Order.create({
      orderNumber: `ORD-${seq}`,
      customer: user._id,
      customerSnapshot: {
        telegramUserId: user.telegramUserId,
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...priced,
      note: body.note,
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
    .select('-history -clientOrderId -__v')
    .lean();
  res.json(orders);
});

ordersRouter.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Order not found');
  // Scoped to the authenticated customer — other customers' orders are simply "not found"
  const order = await Order.findOne({ _id: req.params.id, customer: req.customerId, ...visibleToCustomer() }).lean();
  if (!order) throw notFound('Order not found');
  res.json(toCustomerOrder(order));
});
