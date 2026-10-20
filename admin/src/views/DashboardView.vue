<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { Clock, CookingPot, Bell, CircleCheck, Banknote, Receipt, TrendingUp } from 'lucide-vue-next';
import { api } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';

const summary = ref(null);
const error = ref('');

async function load() {
  try {
    summary.value = await api('/admin/dashboard/summary');
    error.value = '';
  } catch (err) {
    error.value = err.message;
  }
}

onMounted(load);
const timer = setInterval(load, 30_000);
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <h1 class="text-2xl font-bold">Dashboard</h1>
  <p v-if="error" class="mt-4 text-red-700">{{ error }}</p>

  <template v-if="summary">
    <div class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      <RouterLink to="/orders" class="card p-4">
        <Receipt class="size-5 text-muted" />
        <p class="mt-2 text-2xl font-bold">{{ summary.today.totalOrders }}</p>
        <p class="text-sm text-muted">Today's orders</p>
      </RouterLink>
      <RouterLink :to="{ path: '/orders', query: { status: 'pending' } }" class="card p-4">
        <Clock class="size-5 text-honey" />
        <p class="mt-2 text-2xl font-bold">{{ summary.today.pending }}</p>
        <p class="text-sm text-muted">Pending</p>
      </RouterLink>
      <RouterLink :to="{ path: '/orders', query: { status: 'preparing' } }" class="card p-4">
        <CookingPot class="size-5 text-honey" />
        <p class="mt-2 text-2xl font-bold">{{ summary.today.preparing }}</p>
        <p class="text-sm text-muted">Preparing</p>
      </RouterLink>
      <RouterLink :to="{ path: '/orders', query: { status: 'ready' } }" class="card p-4">
        <Bell class="size-5 text-matcha" />
        <p class="mt-2 text-2xl font-bold">{{ summary.today.ready }}</p>
        <p class="text-sm text-muted">Ready for collection</p>
      </RouterLink>
      <RouterLink :to="{ path: '/orders', query: { status: 'completed' } }" class="card p-4">
        <CircleCheck class="size-5 text-matcha" />
        <p class="mt-2 text-2xl font-bold">{{ summary.today.completed }}</p>
        <p class="text-sm text-muted">Completed</p>
      </RouterLink>
      <RouterLink :to="{ path: '/orders', query: { paymentStatus: 'unpaid' } }" class="card p-4">
        <Banknote class="size-5 text-honey" />
        <p class="mt-2 text-2xl font-bold">{{ summary.unpaid.count }}</p>
        <p class="text-sm text-muted">Unpaid · {{ formatMoney(summary.unpaid.amount) }} outstanding</p>
      </RouterLink>
      <div class="card col-span-2 p-4">
        <TrendingUp class="size-5 text-matcha" />
        <p class="mt-2 text-2xl font-bold">{{ formatMoney(summary.allTime.salesAmount) }}</p>
        <p class="text-sm text-muted">All-time sales · cash received for {{ summary.allTime.paidOrders }} orders</p>
      </div>
      <div class="card col-span-2 bg-matcha p-4 text-white">
        <TrendingUp class="size-5 text-honey" />
        <p class="mt-2 text-2xl font-bold">{{ formatMoney(summary.today.salesAmount) }}</p>
        <p class="text-sm text-white/80">Today's sales · cash received for {{ summary.today.paidOrders }} orders</p>
      </div>
    </div>

    <section v-if="summary.bakong" class="card mt-4 flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
      <div>
        <p class="font-semibold">KHQR automatic checks</p>
        <p v-if="summary.bakong.automaticChecks" class="text-muted">On — payments are confirmed with Bakong</p>
        <p v-else class="text-red-700">Off — {{ summary.bakong.disabledReason }}. Confirm KHQR payments by hand.</p>
      </div>
      <p class="tabular-nums">
        <span class="text-lg font-bold">{{ summary.bakong.requestsUsed }}</span>
        <span class="text-muted"> / {{ summary.bakong.dailyLimit }} Bakong requests today</span>
      </p>
    </section>

    <section class="card mt-6 p-4">
      <h2 class="font-semibold">Popular products <span class="text-sm font-normal text-muted">· last 30 days</span></h2>
      <p v-if="!summary.popularProducts.length" class="mt-3 text-sm text-muted">No orders yet.</p>
      <table v-else class="mt-3 w-full text-sm">
        <thead class="text-left text-muted">
          <tr><th class="py-1 font-medium">Product</th><th class="py-1 text-right font-medium">Sold</th><th class="py-1 text-right font-medium">Revenue</th></tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="p in summary.popularProducts" :key="p.name">
            <td class="py-2">{{ p.name }}</td>
            <td class="py-2 text-right tabular-nums">{{ p.quantity }}</td>
            <td class="py-2 text-right tabular-nums">{{ formatMoney(p.revenue) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </template>
</template>
