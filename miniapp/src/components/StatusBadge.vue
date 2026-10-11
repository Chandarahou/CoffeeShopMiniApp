<script setup>
import { computed } from 'vue';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../lib/format.js';

const props = defineProps({ status: String, kind: { type: String, default: 'order' } });

const STYLES = {
  pending: 'bg-honey-soft text-amber-800',
  confirmed: 'bg-blue-50 text-blue-700',
  preparing: 'bg-honey-soft text-amber-800',
  ready: 'bg-matcha text-white',
  completed: 'bg-matcha-soft text-matcha-dark',
  cancelled: 'bg-red-50 text-red-700',
  unpaid: 'bg-honey text-white',
  paid: 'bg-matcha-soft text-matcha-dark',
  refunded: 'bg-gray-100 text-muted',
};

const label = computed(() => (props.kind === 'payment' ? PAYMENT_STATUS_LABELS : ORDER_STATUS_LABELS)[props.status] ?? props.status);
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="STYLES[status]">
    {{ label }}
  </span>
</template>
