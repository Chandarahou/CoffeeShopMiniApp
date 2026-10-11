import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { escapeRegex } from '../../lib/escapeRegex.js';
import { notFound } from '../../lib/errors.js';

export const adminCustomersRouter = Router();

/**
 * Per-customer order stats. totalSpent only counts orders where cash was
 * actually received (paymentStatus = paid), not unpaid or cancelled ones.
 */
async function statsFor(customerIds) {
  const rows = await Order.aggregate([
    { $match: { customer: { $in: customerIds } } },
    {
      $group: {
        _id: '$customer',
        totalOrders: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, 1, 0] } },
        totalSpent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

function withStats(user, stats) {
  const s = stats.get(String(user._id));
  const totalOrders = s?.totalOrders ?? 0;
  return {
    ...user,
    totalOrders,
    totalSpent: s?.totalSpent ?? 0,
    lastOrderAt: s?.lastOrderAt ?? null,
    isRepeatCustomer: totalOrders > 1,
  };
}

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

adminCustomersRouter.get('/', async (req, res) => {
  const { q, page, limit } = listQuery.parse(req.query);
  const filter = {};
  if (q) {
    const text = q.replace(/^@/, '');
    const rx = new RegExp(escapeRegex(text), 'i');
    filter.$or = [{ telegramUsername: rx }, { firstName: rx }, { lastName: rx }];
    if (/^\d+$/.test(text)) filter.$or.push({ telegramUserId: text });
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ lastSeenAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const stats = await statsFor(users.map((u) => u._id));
  res.json({ customers: users.map((u) => withStats(u, stats)), total, page, limit });
});

adminCustomersRouter.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Customer not found');
  const user = await User.findById(req.params.id).lean();
  if (!user) throw notFound('Customer not found');
  const stats = await statsFor([user._id]);
  res.json(withStats(user, stats));
});

adminCustomersRouter.get('/:id/orders', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Customer not found');
  const orders = await Order.find({ customer: req.params.id }).sort({ createdAt: -1 }).limit(100).select('-history').lean();
  res.json(orders);
});
