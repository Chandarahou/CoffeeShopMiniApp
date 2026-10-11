<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search } from 'lucide-vue-next';
import { api } from '../lib/api.js';
import { formatDateTime, formatMoney } from '../lib/format.js';

const route = useRoute();
const router = useRouter();
const q = ref('');
const result = ref(null);
const error = ref('');

watch(
  () => route.query.q,
  async (value) => {
    q.value = value ?? '';
    try {
      result.value = await api('/admin/customers', { query: { q: q.value } });
    } catch (err) {
      error.value = err.message;
    }
  },
  { immediate: true },
);

const search = () => router.replace({ query: q.value ? { q: q.value } : {} });
</script>

<template>
  <h1 class="text-2xl font-bold">Customers</h1>
  <form class="relative mt-4 max-w-md" @submit.prevent="search">
    <Search class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
    <input v-model="q" class="input pl-9" placeholder="@username, Telegram ID or name" />
  </form>
  <p v-if="error" class="mt-4 text-red-700">{{ error }}</p>

  <div v-if="result" class="card mt-4 overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="border-b text-left text-muted">
        <tr>
          <th class="p-3 font-medium">Customer</th>
          <th class="p-3 font-medium">Telegram ID</th>
          <th class="p-3 text-right font-medium">Orders</th>
          <th class="p-3 text-right font-medium">Paid total</th>
          <th class="p-3 font-medium">Last order</th>
        </tr>
      </thead>
      <tbody class="divide-y">
        <tr v-if="!result.customers.length"><td colspan="5" class="p-6 text-center text-muted">No customers found.</td></tr>
        <tr v-for="c in result.customers" :key="c._id">
          <td class="p-3">
            <RouterLink :to="`/customers/${c._id}`" class="font-medium hover:text-matcha">
              {{ c.telegramUsername ? `@${c.telegramUsername}` : `${c.firstName} ${c.lastName ?? ''}` }}
            </RouterLink>
            <span v-if="c.isRepeatCustomer" class="ml-2 rounded-full bg-matcha-soft px-2 py-0.5 text-[11px] font-bold text-matcha-ink">Repeat</span>
            <p v-if="c.telegramUsername" class="text-xs text-muted">{{ c.firstName }} {{ c.lastName }}</p>
          </td>
          <td class="p-3 tabular-nums">{{ c.telegramUserId }}</td>
          <td class="p-3 text-right tabular-nums">{{ c.totalOrders }}</td>
          <td class="p-3 text-right tabular-nums">{{ formatMoney(c.totalSpent) }}</td>
          <td class="p-3 text-muted">{{ c.lastOrderAt ? formatDateTime(c.lastOrderAt) : '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
