export const formatMoney = (cents) => `$${(cents / 100).toFixed(2)}`;

export const formatDateTime = (value) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS = { unpaid: 'Unpaid', paid: 'Paid', refunded: 'Refunded' };

export const PAYMENT_METHOD_LABELS = { cash_at_counter: 'Cash at Counter', khqr: 'KHQR' };

export function displayName(customer) {
  return customer?.telegramUsername
    ? `@${customer.telegramUsername}`
    : [customer?.firstName, customer?.lastName].filter(Boolean).join(' ');
}
