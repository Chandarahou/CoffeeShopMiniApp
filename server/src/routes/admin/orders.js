import { Router } from 'express';
import { z } from 'zod';
import { Order } from '../../models/Order.js';
import { escapeRegex } from '../../lib/escapeRegex.js';
import { badRequest, notFound } from '../../lib/errors.js';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  applyOrderStatus,
  applyPaymentStatus,
  availableActions,
  canTransitionOrder,
  canTransitionPayment,
} from '../../services/orderWorkflow.js';
import { notifyOrderStatus } from '../../services/bot.js';

export const adminOrdersRouter = Router();

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  customer: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/** Search by order number, Telegram user ID, Telegram username or customer name. */
export function buildOrderSearch(q) {
  const text = q.replace(/^[@#]/, '');
  const rx = new RegExp(escapeRegex(text), 'i');
  const or = [
    { orderNumber: new RegExp(`^${escapeRegex(text)}$`, 'i') },
    { orderNumber: new RegExp(`^ORD-${escapeRegex(text)}$`, 'i') },
    { 'customerSnapshot.telegramUsername': rx },
    { 'customerSnapshot.firstName': rx },
    { 'customerSnapshot.lastName': rx },
  ];
  if (/^\d+$/.test(text)) or.push({ 'customerSnapshot.telegramUserId': text });
  return { $or: or };
}

const withActions = (order) => ({ ...order, availableActions: availableActions(order) });

adminOrdersRouter.get('/', async (req, res) => {
  const query = listQuery.parse(req.query);
  const filter = {};
  if (query.q) Object.assign(filter, buildOrderSearch(query.q));
  if (query.status) filter.orderStatus = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.customer) filter.customer = query.customer;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lt = query.to;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .select('-history')
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ orders: orders.map(withActions), total, page: query.page, limit: query.limit });
});

adminOrdersRouter.get('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw notFound('Order not found');
  res.json(withActions(order));
});

const statusBody = z.object({ status: z.enum(ORDER_STATUSES), note: z.string().trim().max(300).optional() });

adminOrdersRouter.patch('/:id/status', async (req, res) => {
  const { status, note } = statusBody.parse(req.body);
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order not found');
  if (!canTransitionOrder(order, status)) {
    throw badRequest(`Cannot change order from ${order.orderStatus} to ${status}`);
  }

  applyOrderStatus(order, status, req.admin, note);
  await order.save(); // optimisticConcurrency rejects concurrent edits with 409

  notifyOrderStatus(order);
  res.json(withActions(order.toObject()));
});

const paymentBody = z.object({ paymentStatus: z.enum(PAYMENT_STATUSES), note: z.string().trim().max(300).optional() });

adminOrdersRouter.patch('/:id/payment-status', async (req, res) => {
  const { paymentStatus, note } = paymentBody.parse(req.body);
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order not found');
  if (!canTransitionPayment(order, paymentStatus)) {
    throw badRequest(`Cannot change payment from ${order.paymentStatus} to ${paymentStatus}`);
  }

  applyPaymentStatus(order, paymentStatus, req.admin, note);
  await order.save();

  res.json(withActions(order.toObject()));
});
