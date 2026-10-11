<script setup>
import { computed, onUnmounted, ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { CircleCheck } from 'lucide-vue-next';
import StatusBadge from '../components/StatusBadge.vue';
import { api } from '../lib/api.js';
import { displayName, formatDateTime, formatMoney, PAYMENT_METHOD_LABELS } from '../lib/format.js';

const route = useRoute();
const order = ref(null);
const error = ref('');
const justPlaced = computed(() => route.query.placed === '1');

async function load() {
  try {
    order.value = await api(`/orders/${route.params.id}`);
  } catch (err) {
    error.value = err.message;
  }
}

watchEffect(load);

// Light polling so the status updates while the customer waits
const timer = setInterval(() => {
  if (order.value && !['completed', 'cancelled'].includes(order.value.orderStatus)) load();
}, 15_000);
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <p v-if="error" class="p-8 text-center text-muted">{{ error }}</p>

  <div v-else-if="order" class="p-4">
    <div v-if="justPlaced" class="mb-4 flex flex-col items-center gap-2 rounded-2xl bg-matcha p-5 text-center text-white">
      <CircleCheck class="size-10 text-honey" />
      <p class="font-semibold">Your order has been placed successfully!</p>
      <p class="text-sm text-white/85">
        Please pay {{ formatMoney(order.total) }} in cash at the counter when collecting your order.
      </p>
    </div>

    <div class="text-center">
      <p class="text-sm text-muted">Order</p>
      <h1 class="text-3xl font-bold tracking-tight">#{{ order.orderNumber }}</h1>
      <p class="mt-1 text-xs text-muted">{{ formatDateTime(order.createdAt) }}</p>
    </div>

    <dl class="card mt-4 divide-y text-sm">
      <div class="flex items-center justify-between p-3"><dt class="text-muted">Order status</dt><dd><StatusBadge :status="order.orderStatus" /></dd></div>
      <div class="flex items-center justify-between p-3"><dt class="text-muted">Payment status</dt><dd><StatusBadge :status="order.paymentStatus" kind="payment" /></dd></div>
      <div class="flex items-center justify-between p-3"><dt class="text-muted">Payment</dt><dd class="font-medium">{{ PAYMENT_METHOD_LABELS[order.paymentMethod] }}</dd></div>
      <div class="flex items-center justify-between p-3"><dt class="text-muted">Customer</dt><dd class="font-medium">{{ displayName(order.customerSnapshot) }}</dd></div>
    </dl>

    <section class="card mt-3 divide-y text-sm">
      <div v-for="(item, i) in order.items" :key="i" class="flex justify-between gap-3 p-3">
        <div>
          <p class="font-medium">{{ item.quantity }} × {{ item.productName }}</p>
          <p v-if="item.options.length" class="text-xs text-muted">{{ item.options.map((o) => o.label).join(' · ') }}</p>
        </div>
        <span>{{ formatMoney(item.lineTotal) }}</span>
      </div>
      <div v-if="order.discount" class="flex justify-between p-3 text-matcha"><span>Discount</span><span>−{{ formatMoney(order.discount) }}</span></div>
      <div class="flex justify-between p-3 text-base font-bold">
        <span>{{ order.paymentStatus === 'unpaid' ? 'Total due' : 'Total' }}</span>
        <span>{{ formatMoney(order.total) }}</span>
      </div>
    </section>

    <p v-if="order.note" class="mt-3 text-sm text-muted">Note: {{ order.note }}</p>

    <RouterLink to="/orders" class="mt-4 block py-2 text-center text-sm font-medium text-matcha">View all orders</RouterLink>
  </div>
</template>
