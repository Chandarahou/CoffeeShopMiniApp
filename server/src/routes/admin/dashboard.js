import { Router } from 'express';
import { Order } from '../../models/Order.js';
import { shopDayRange } from '../../lib/time.js';
import { khqrEnabled } from '../../services/khqr.js';
import { bakongUsageToday } from '../../services/khqrVerification.js';

export const adminDashboardRouter = Router();

adminDashboardRouter.get('/summary', async (_req, res) => {
  const { start, end } = shopDayRange();
  const today = { createdAt: { $gte: start, $lt: end } };
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000);

  const [statusCounts, salesToday, salesAllTime, unpaid, popular] = await Promise.all([
    Order.aggregate([{ $match: today }, { $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),

    // Sales = cash actually received today
    Order.aggregate([
      { $match: { paymentStatus: 'paid', paidAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, amount: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),

    // All-time sales = cash received on every order still marked paid (refunds excluded)
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, amount: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),

    // Open orders still awaiting cash (any day, excluding cancelled)
    Order.aggregate([
      { $match: { paymentStatus: 'unpaid', orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, amount: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),

    Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productName', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
  ]);

  let bakong = null;
  if (khqrEnabled()) {
    bakong = await bakongUsageToday();
  }

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  res.json({
    today: {
      totalOrders: statusCounts.reduce((sum, s) => sum + s.count, 0),
      pending: byStatus.pending ?? 0,
      confirmed: byStatus.confirmed ?? 0,
      preparing: byStatus.preparing ?? 0,
      ready: byStatus.ready ?? 0,
      completed: byStatus.completed ?? 0,
      cancelled: byStatus.cancelled ?? 0,
      salesAmount: salesToday[0]?.amount ?? 0,
      paidOrders: salesToday[0]?.count ?? 0,
    },
    allTime: { salesAmount: salesAllTime[0]?.amount ?? 0, paidOrders: salesAllTime[0]?.count ?? 0 },
    unpaid: { count: unpaid[0]?.count ?? 0, amount: unpaid[0]?.amount ?? 0 },
    bakong: bakong,
    popularProducts: popular.map((p) => ({ name: p._id, quantity: p.quantity, revenue: p.revenue })),
  });
});
