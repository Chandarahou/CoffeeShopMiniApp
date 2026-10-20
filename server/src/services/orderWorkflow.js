export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'];
export const PAYMENT_METHODS = ['cash_at_counter', 'khqr'];

// Order status and payment status are deliberately independent: completing an
// order never marks it paid, and payment is only recorded when staff confirm cash.
const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const PAYMENT_TRANSITIONS = {
  unpaid: ['paid'],
  paid: ['refunded'],
  refunded: [],
};

const ORDER_TIMESTAMP_FIELD = {
  confirmed: 'confirmedAt',
  preparing: 'preparingAt',
  ready: 'readyAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
};

const PAYMENT_TIMESTAMP_FIELD = { paid: 'paidAt', refunded: 'refundedAt' };

export function canTransitionOrder(order, to) {
  return ORDER_TRANSITIONS[order.orderStatus]?.includes(to) ?? false;
}

export function canTransitionPayment(order, to) {
  if (!PAYMENT_TRANSITIONS[order.paymentStatus]?.includes(to)) return false;
  // Cash can't be collected for an order that was cancelled
  if (to === 'paid' && order.orderStatus === 'cancelled') return false;
  return true;
}

/** Actions the admin UI should offer for an order's current state. */
export function availableActions(order) {
  return {
    orderStatus: ORDER_TRANSITIONS[order.orderStatus].filter((s) => canTransitionOrder(order, s)),
    paymentStatus: PAYMENT_TRANSITIONS[order.paymentStatus].filter((s) => canTransitionPayment(order, s)),
  };
}

export function applyOrderStatus(order, to, admin, note) {
  const from = order.orderStatus;
  order.orderStatus = to;
  order[ORDER_TIMESTAMP_FIELD[to]] = new Date();
  order.history.push({ type: 'order_status', from, to, by: admin._id, byName: admin.name, note });
}

export function applyPaymentStatus(order, to, admin, note) {
  const from = order.paymentStatus;
  order.paymentStatus = to;
  order[PAYMENT_TIMESTAMP_FIELD[to]] = new Date();
  order.history.push({ type: 'payment_status', from, to, by: admin._id, byName: admin.name, note });
}
