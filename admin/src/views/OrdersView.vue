<script setup>
import { onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, RefreshCw, Search } from 'lucide-vue-next';
import StatusBadge from '../components/StatusBadge.vue';
import OrderActions from '../components/OrderActions.vue';
import PaginationBar from '../components/PaginationBar.vue';
import { api } from '../lib/api.js';
import { displayName, formatDateTime, formatMoney, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../lib/format.js';

const route = useRoute();
const router = useRouter();

// Filters live in the URL so they survive refreshes and can be linked to from the dashboard
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZES = [10, 25, 50, 100];
const filters = reactive({ q: '', status: '', paymentStatus: '', date: '', page: 1, limit: DEFAULT_PAGE_SIZE });
const result = ref(null);
const error = ref('');
const loading = ref(false);

function dayRange(date) {
  if (!date) return {};
  const from = new Date(`${date}T00:00:00`);
  return { from: from.toISOString(), to: new Date(from.getTime() + 86_400_000).toISOString() };
}

async function load() {
  loading.value = true;
  try {
    const { date, ...rest } = filters;
    result.value = await api('/admin/orders', { query: { ...rest, ...dayRange(date) } });
    error.value = '';
    // A stale link (or the last order on a page being filtered out) can point past the end
    const lastPage = Math.ceil(result.value.total / result.value.limit);
    if (result.value.total && filters.page > lastPage) apply({ page: lastPage });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.query,
  (q) => {
    Object.assign(filters, { q: q.q ?? '', status: q.status ?? '', paymentStatus: q.paymentStatus ?? '', date: q.date ?? '',
      page: Math.max(1, Math.trunc(Number(q.page)) || 1),
      limit: PAGE_SIZES.includes(Number(q.limit)) ? Number(q.limit) : DEFAULT_PAGE_SIZE,
    });
    load();
  },
  { immediate: true },
);

function apply(changes = {}) {
  const next = { ...filters, page: 1, ...changes };
  // Defaults are left out of the URL to keep it clean
  const isDefault = (k, v) => (k === 'page' && v === 1) || (k === 'limit' && v === DEFAULT_PAGE_SIZE);
  router.replace({ query: Object.fromEntries(Object.entries(next).filter(([k, v]) => v && !isDefault(k, v))) });
}

function replaceOrder(updated) {
  const i = result.value.orders.findIndex((o) => o._id === updated._id);
  if (i !== -1) result.value.orders[i] = updated;
}

// Keep the incoming-orders list fresh
const timer = setInterval(load, 20_000);
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Orders</h1>
    <div class="flex items-center gap-2">
      <RouterLink to="/orders/new" class="btn-primary"><Plus class="size-4" /> New order</RouterLink>
      <button class="btn" :disabled="loading" @click="load"><RefreshCw class="size-4" :class="{ 'animate-spin': loading }" /> Refresh</button>
    </div>
  </div>

  <form class="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]" @submit.prevent="apply()">
    <div class="relative">
      <Search class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
      <input v-model="filters.q" class="input pl-9" placeholder="Order #, @username, Telegram ID or name" />
    </div>
    <select v-model="filters.status" class="input" @change="apply()">
      <option value="">All statuses</option>
      <option v-for="(label, value) in ORDER_STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
    </select>
    <select v-model="filters.paymentStatus" class="input" @change="apply()">
      <option value="">All payments</option>
      <option v-for="(label, value) in PAYMENT_STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
    </select>
    <input v-model="filters.date" type="date" class="input" @change="apply()" />
  </form>

  <p v-if="error" class="mt-4 text-red-700">{{ error }}</p>

  <div v-if="result" class="mt-4 space-y-3">
    <p v-if="!result.orders.length" class="card p-8 text-center text-muted">No orders found.</p>
    <article v-for="order in result.orders" :key="order._id" class="card p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <RouterLink :to="`/orders/${order._id}`" class="text-lg font-bold hover:text-matcha">#{{ order.orderNumber }}</RouterLink>
          <p class="text-sm text-muted">
            {{ displayName(order.customerSnapshot) }}
            <template v-if="order.customerSnapshot.telegramUserId">· ID {{ order.customerSnapshot.telegramUserId }}</template>
            · {{ formatDateTime(order.createdAt) }}
            <span v-if="order.source === 'staff'" class="ml-1 rounded-full bg-honey-soft px-2 py-0.5 text-[11px] font-bold text-amber-800">Counter</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <StatusBadge :status="order.orderStatus" />
          <StatusBadge :status="order.paymentStatus" kind="payment" />
          <span class="font-bold tabular-nums">{{ formatMoney(order.total) }}</span>
        </div>
      </div>
      <p class="mt-2 text-sm">
        <span v-for="(item, i) in order.items" :key="i" class="mr-3 inline-block">
          <strong>{{ item.quantity }}×</strong> {{ item.productName }}
          <span v-if="item.options.length" class="text-muted">({{ item.options.map((o) => o.label).join(', ') }})</span>
        </span>
      </p>
      <p v-if="order.note" class="mt-1 text-sm text-amber-800">Note: {{ order.note }}</p>
      <OrderActions class="mt-3" :order="order" compact @updated="replaceOrder" />
    </article>

    <PaginationBar
      :page="result.page"
      :page-size="result.limit"
      :total="result.total"
      :page-sizes="PAGE_SIZES"
      @update:page="apply({ page: $event })"
      @update:page-size="apply({ limit: $event, page: 1 })"
    />
  </div>
</template>
