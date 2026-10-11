<script setup>
import { computed, onMounted, ref } from 'vue';
import { ChevronRight, Receipt } from 'lucide-vue-next';
import StatusBadge from '../components/StatusBadge.vue';
import { api } from '../lib/api.js';
import { formatDateTime, formatMoney } from '../lib/format.js';

const orders = ref(null);
const error = ref('');

onMounted(async () => {
  try {
    orders.value = await api('/orders/my-orders');
  } catch (err) {
    error.value = err.message;
  }
});

const isOpen = (o) => !['completed', 'cancelled'].includes(o.orderStatus);
const current = computed(() => orders.value?.filter(isOpen) ?? []);
const past = computed(() => orders.value?.filter((o) => !isOpen(o)) ?? []);
</script>

<template>
  <h1 class="px-4 pt-5 text-xl font-bold">Today's orders</h1>
  <p class="px-4 text-xs text-muted">Orders are shown for the day they were placed.</p>

  <p v-if="error" class="p-8 text-center text-muted">{{ error }}</p>

  <div v-else-if="orders && !orders.length" class="flex flex-col items-center gap-3 p-10 text-center text-muted">
    <Receipt class="size-12 text-line" />
    <p>You haven't ordered anything today.</p>
    <RouterLink to="/menu" class="btn-primary">Start an order</RouterLink>
  </div>

  <template v-else-if="orders">
    <template v-for="group in [{ title: 'Current', list: current }, { title: 'Earlier today', list: past }]" :key="group.title">
      <section v-if="group.list.length" class="mt-4 px-4">
        <h2 class="mb-2 text-sm font-semibold text-muted uppercase">{{ group.title }}</h2>
        <ul class="space-y-2">
          <li v-for="order in group.list" :key="order._id">
            <RouterLink :to="`/orders/${order._id}`" class="card flex items-center gap-3 p-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">#{{ order.orderNumber }}</span>
                  <StatusBadge :status="order.orderStatus" />
                </div>
                <p class="truncate text-xs text-muted">
                  {{ order.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ') }}
                </p>
                <p class="text-xs text-muted">{{ formatDateTime(order.createdAt) }}</p>
              </div>
              <div class="text-right">
                <p class="font-semibold">{{ formatMoney(order.total) }}</p>
                <StatusBadge :status="order.paymentStatus" kind="payment" />
              </div>
              <ChevronRight class="size-4 text-muted" />
            </RouterLink>
          </li>
        </ul>
      </section>
    </template>
  </template>
</template>
