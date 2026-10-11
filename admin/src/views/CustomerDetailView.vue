<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import StatusBadge from '../components/StatusBadge.vue';
import { api } from '../lib/api.js';
import { formatDateTime, formatMoney } from '../lib/format.js';

const route = useRoute();
const customer = ref(null);
const orders = ref([]);
const error = ref('');

onMounted(async () => {
  try {
    [customer.value, orders.value] = await Promise.all([
      api(`/admin/customers/${route.params.id}`),
      api(`/admin/customers/${route.params.id}/orders`),
    ]);
  } catch (err) {
    error.value = err.message;
  }
});
</script>

<template>
  <RouterLink to="/customers" class="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft class="size-4" /> Customers</RouterLink>
  <p v-if="error" class="mt-4 text-red-700">{{ error }}</p>

  <template v-if="customer">
    <div class="mt-3 flex flex-wrap items-baseline gap-3">
      <h1 class="text-2xl font-bold">{{ customer.firstName }} {{ customer.lastName }}</h1>
      <span v-if="customer.telegramUsername" class="text-muted">@{{ customer.telegramUsername }}</span>
      <span v-if="customer.isRepeatCustomer" class="rounded-full bg-matcha-soft px-2 py-0.5 text-xs font-bold text-matcha-ink">Repeat customer</span>
    </div>
    <p class="text-sm text-muted">Telegram ID {{ customer.telegramUserId }} · first seen {{ formatDateTime(customer.createdAt) }}</p>

    <div class="mt-4 grid max-w-xl grid-cols-2 gap-3">
      <div class="card p-4"><p class="text-2xl font-bold">{{ customer.totalOrders }}</p><p class="text-sm text-muted">Orders (excl. cancelled)</p></div>
      <div class="card p-4"><p class="text-2xl font-bold">{{ formatMoney(customer.totalSpent) }}</p><p class="text-sm text-muted">Total spent (paid orders)</p></div>
    </div>

    <h2 class="mt-6 font-semibold">Order history</h2>
    <div class="card mt-2 divide-y">
      <p v-if="!orders.length" class="p-4 text-sm text-muted">No orders yet.</p>
      <RouterLink v-for="o in orders" :key="o._id" :to="`/orders/${o._id}`" class="flex flex-wrap items-center gap-3 p-3 text-sm hover:bg-cream">
        <span class="font-semibold">#{{ o.orderNumber }}</span>
        <span class="text-muted">{{ formatDateTime(o.createdAt) }}</span>
        <span class="min-w-0 flex-1 truncate">{{ o.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ') }}</span>
        <StatusBadge :status="o.orderStatus" />
        <StatusBadge :status="o.paymentStatus" kind="payment" />
        <span class="font-medium tabular-nums">{{ formatMoney(o.total) }}</span>
      </RouterLink>
    </div>
  </template>
</template>
