<script setup>
import { ref } from 'vue';
import { api } from '../lib/api.js';
import { confirmDialog } from '../lib/confirm.js';
import { formatMoney } from '../lib/format.js';

// The server decides which transitions are valid (order.availableActions); we only render them.
const props = defineProps({ order: { type: Object, required: true }, compact: Boolean });
const emit = defineEmits(['updated']);

const busy = ref(false);
const error = ref('');

const ORDER_ACTIONS = {
  confirmed: { label: 'Confirm Order', primary: true },
  preparing: { label: 'Start Preparing', primary: true },
  ready: { label: 'Mark Ready', primary: true },
  completed: { label: 'Mark Completed', primary: true },
  cancelled: {
    label: 'Cancel Order',
    danger: true,
    confirm: { title: 'Cancel this order?', text: 'This cannot be undone.', confirmText: 'Yes, cancel order', icon: 'warning' },
  },
};
const PAYMENT_ACTIONS = {
  paid: {
    label: 'Mark Payment Received',
    confirm: (o) => ({
      title: 'Payment received?',
      // KHQR payments are normally confirmed by Bakong automatically; marking one paid by hand
      // should only happen after staff have seen the money arrive
      html:
        o.paymentMethod === 'khqr'
          ? `KHQR payments are usually confirmed automatically. Only continue if you can see <b>${formatMoney(o.total)}</b> for order <b>#${o.orderNumber}</b> in your Bakong or bank app.`
          : `Confirm you received <b>${formatMoney(o.total)}</b> in cash for order <b>#${o.orderNumber}</b>.`,
      confirmText: 'Yes, payment received',
    }),
  },
  refunded: {
    label: 'Mark Refunded',
    danger: true,
    confirm: { title: 'Mark as refunded?', text: 'Only do this once the cash has been returned.', confirmText: 'Yes, mark refunded', icon: 'warning' },
  },
};

async function run(kind, to, action) {
  if (action.confirm) {
    const options = typeof action.confirm === 'function' ? action.confirm(props.order) : action.confirm;
    if (!(await confirmDialog({ ...options, danger: action.danger }))) return;
  }
  busy.value = true;
  error.value = '';
  try {
    const updated =
      kind === 'order'
        ? await api(`/admin/orders/${props.order._id}/status`, { method: 'PATCH', body: { status: to } })
        : await api(`/admin/orders/${props.order._id}/payment-status`, { method: 'PATCH', body: { paymentStatus: to } });
    emit('updated', updated);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="to in order.availableActions.orderStatus.filter((s) => !compact || s !== 'cancelled')"
        :key="to"
        :class="ORDER_ACTIONS[to].danger ? 'btn-danger' : 'btn-primary'"
        :disabled="busy"
        @click="run('order', to, ORDER_ACTIONS[to])"
      >
        {{ ORDER_ACTIONS[to].label }}
      </button>
      <button
        v-for="to in order.availableActions.paymentStatus.filter((s) => !compact || s === 'paid')"
        :key="to"
        :class="PAYMENT_ACTIONS[to].danger ? 'btn-danger' : 'btn border-honey text-amber-800 hover:bg-honey-soft'"
        :disabled="busy"
        @click="run('payment', to, PAYMENT_ACTIONS[to])"
      >
        {{ PAYMENT_ACTIONS[to].label }}
      </button>
    </div>
    <p v-if="error" class="mt-2 text-sm text-red-700">{{ error }}</p>
  </div>
</template>
