<script setup>
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps({
  page: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  total: { type: Number, required: true },
  pageSizes: { type: Array, default: () => [10, 25, 50, 100] },
});
const emit = defineEmits(['update:page', 'update:pageSize']);

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const from = computed(() => (props.total ? (props.page - 1) * props.pageSize + 1 : 0));
const to = computed(() => Math.min(props.page * props.pageSize, props.total));

// 1 … 4 5 [6] 7 8 … 20 — always shows first, last and the pages around the current one
const items = computed(() => {
  const last = pageCount.value;
  const wanted = new Set([1, last, props.page - 1, props.page, props.page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? [`gap-${p}`, p] : [p]));
});

const go = (p) => p >= 1 && p <= pageCount.value && p !== props.page && emit('update:page', p);
</script>

<template>
  <div v-if="total" class="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
    <p class="text-muted">
      Showing <span class="font-medium text-ink">{{ from }}–{{ to }}</span> of
      <span class="font-medium text-ink">{{ total }}</span>
    </p>

    <nav v-if="pageCount > 1" class="flex items-center gap-1" aria-label="Pagination">
      <button class="btn !px-2" :disabled="page <= 1" aria-label="Previous page" @click="go(page - 1)">
        <ChevronLeft class="size-4" />
      </button>
      <template v-for="item in items" :key="item">
        <span v-if="typeof item === 'string'" class="px-1 text-muted">…</span>
        <button
          v-else
          class="min-w-9 rounded-lg border px-2 py-2 text-sm font-medium tabular-nums transition"
          :class="item === page ? 'border-matcha bg-matcha text-white' : 'bg-surface hover:bg-cream'"
          :aria-current="item === page ? 'page' : undefined"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </template>
      <button class="btn !px-2" :disabled="page >= pageCount" aria-label="Next page" @click="go(page + 1)">
        <ChevronRight class="size-4" />
      </button>
    </nav>

    <label class="flex items-center gap-2 text-muted">
      Per page
      <select class="input !w-auto !py-1.5" :value="pageSize" @change="emit('update:pageSize', Number($event.target.value))">
        <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
      </select>
    </label>
  </div>
</template>
