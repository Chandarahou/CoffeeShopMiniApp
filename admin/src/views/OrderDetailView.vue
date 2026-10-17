<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import StatusBadge from '../components/StatusBadge.vue';
import OrderActions from '../components/OrderActions.vue';
import { api } from '../lib/api.js';
import { formatDateTime, formatMoney, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../lib/format.js';

const route = useRoute();
const order = ref(null);
const error = ref('');

onMounted(async () => {
  try {
    order.value = await api(`/admin/orders/${route.params.id}`);
  } catch (err) {
    error.value = err.message;
  }
});

const historyLabel = (h) =>
  h.type === 'payment_status'
    ? `Payment: ${PAYMENT_STATUS_LABELS[h.from]} → ${PAYMENT_STATUS_LABELS[h.to]}`
    : `Status: ${ORDER_STATUS_LABELS[h.from]} → ${ORDER_STATUS_LABELS[h.to]}`;
</script>

<template>
  <RouterLink to="/orders" class="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft class="size-4" /> Orders</RouterLink>
  <p v-if="error" class="mt-4 text-red-700">{{ error }}</p>

  <div v-if="order" class="mt-3 grid gap-4 lg:grid-cols-[2fr_1fr]">
    <div class="space-y-4">
      <section class="card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h1 class="text-2xl font-bold">Order #{{ order.orderNumber }}</h1>
          <div class="flex gap-2">
            <StatusBadge :status="order.orderStatus" />
            <StatusBadge :status="order.paymentStatus" kind="payment" />
          </div>
        </div>
        <p class="text-sm text-muted">Placed {{ formatDateTime(order.createdAt) }}</p>
        <OrderActions class="mt-4" :order="order" @updated="order = $event" />
      </section>

      <section class="card divide-y">
        <div v-for="(item, i) in order.items" :key="i" class="flex justify-between gap-4 p-4">
          <div>
            <p class="font-semibold">{{ item.quantity }} × {{ item.productName }}</p>
            <ul v-if="item.options.length" class="text-sm text-muted">
              <li v-for="o in item.options" :key="o.groupKey + o.label">
                {{ o.groupName }}: {{ o.label }} <span v-if="o.priceDelta">(+{{ formatMoney(o.priceDelta) }})</span>
              </li>
            </ul>
            <p class="text-sm text-muted">{{ formatMoney(item.unitPrice) }} each</p>
          </div>
          <span class="font-medium tabular-nums">{{ formatMoney(item.lineTotal) }}</span>
        </div>
        <div class="space-y-1 p-4 text-sm">
          <div class="flex justify-between text-muted"><span>Subtotal</span><span>{{ formatMoney(order.subtotal) }}</span></div>
          <div v-if="order.discount" class="flex justify-between text-muted"><span>Discount</span><span>−{{ formatMoney(order.discount) }}</span></div>
          <div class="flex justify-between text-lg font-bold"><span>Total</span><span>{{ formatMoney(order.total) }}</span></div>
        </div>
      </section>
      <p v-if="order.note" class="card bg-honey-soft p-4 text-sm text-amber-900">Customer note: {{ order.note }}</p>
    </div>

    <div class="space-y-4">
      <section class="card p-5 text-sm">
        <h2 class="mb-2 font-semibold">Customer</h2>
        <p v-if="order.customerSnapshot.telegramUsername">@{{ order.customerSnapshot.telegramUsername }}</p>
        <p>{{ order.customerSnapshot.firstName }} {{ order.customerSnapshot.lastName }}</p>
        <p v-if="order.customerSnapshot.telegramUserId" class="text-muted">Telegram ID: {{ order.customerSnapshot.telegramUserId }}</p>
        <p v-else class="text-muted">Walk-in customer (no Telegram account)</p>
        <RouterLink v-if="order.customer" :to="`/customers/${order.customer}`" class="mt-2 inline-block font-medium text-matcha">View customer →</RouterLink>
        <p v-if="order.source === 'staff'" class="mt-2 text-xs text-muted">Counter order entered by {{ order.createdByName }}</p>
      </section>

      <section class="card p-5 text-sm">
        <h2 class="mb-2 font-semibold">Payment</h2>
        <p>{{ PAYMENT_METHOD_LABELS[order.paymentMethod] }}</p>
        <p v-if="order.paidAt" class="text-muted">Paid {{ formatDateTime(order.paidAt) }}</p>
      </section>

      <section class="card p-5 text-sm">
        <h2 class="mb-2 font-semibold">History</h2>
        <p v-if="!order.history.length" class="text-muted">No changes yet.</p>
        <ol class="space-y-2">
          <li v-for="(h, i) in order.history" :key="i">
            <p class="font-medium">{{ historyLabel(h) }}</p>
            <p class="text-muted">{{ h.byName }} · {{ formatDateTime(h.at) }}</p>
            <p v-if="h.note" class="text-muted italic">{{ h.note }}</p>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>
