<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { Check, Minus, Plus, X } from 'lucide-vue-next';
import { estimateUnitPrice } from '../lib/pricing.js';
import { formatMoney } from '../lib/format.js';

// Lets staff pick size / ice / sugar / add-ons for one product before adding it to the order.
const props = defineProps({ product: { type: Object, default: null } });
const emit = defineEmits(['add', 'close']);

const selections = reactive({});
const quantity = ref(1);

// Start from the product's default choices each time a product is opened
watch(
  () => props.product,
  (product) => {
    for (const key of Object.keys(selections)) delete selections[key];
    quantity.value = 1;
    for (const group of product?.optionGroups ?? []) {
      const defaults = group.choices.filter((c) => c.isDefault).map((c) => c._id);
      selections[group.key] = group.type === 'single' ? (defaults[0] ?? null) : defaults;
    }
  },
  { immediate: true },
);

function isSelected(group, choice) {
  const value = selections[group.key];
  return Array.isArray(value) ? value.includes(choice._id) : value === choice._id;
}

function toggle(group, choice) {
  if (group.type === 'single') {
    selections[group.key] = !group.required && selections[group.key] === choice._id ? null : choice._id;
    return;
  }
  const set = new Set(selections[group.key]);
  set.has(choice._id) ? set.delete(choice._id) : set.add(choice._id);
  selections[group.key] = [...set].sort();
}

const cleanSelections = computed(() =>
  Object.fromEntries(Object.entries(selections).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length))),
);
const missing = computed(() => props.product?.optionGroups.filter((g) => g.required && !cleanSelections.value[g.key]) ?? []);
const unitPrice = computed(() => (props.product ? estimateUnitPrice(props.product, cleanSelections.value) : 0));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="product"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <div role="dialog" aria-modal="true" class="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold">{{ product.name }}</h2>
            <p class="text-sm text-muted">{{ formatMoney(product.price) }} base price</p>
          </div>
          <button type="button" class="p-1 text-muted hover:text-ink" aria-label="Close" @click="emit('close')"><X class="size-5" /></button>
        </div>

        <section v-for="group in product.optionGroups" :key="group._id" class="mt-4">
          <div class="flex items-baseline justify-between">
            <h3 class="text-sm font-semibold">{{ group.name }}</h3>
            <span class="text-xs text-muted">{{ group.required ? 'Required' : group.type === 'multiple' ? 'Optional · any' : 'Optional' }}</span>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="choice in group.choices"
              :key="choice._id"
              type="button"
              class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm"
              :class="isSelected(group, choice) ? 'border-matcha bg-matcha-soft font-semibold text-matcha-ink' : 'bg-surface hover:bg-cream'"
              @click="toggle(group, choice)"
            >
              <Check v-if="isSelected(group, choice)" class="size-4" />
              {{ choice.label }}
              <span v-if="choice.priceDelta" class="text-muted">+{{ formatMoney(choice.priceDelta) }}</span>
            </button>
          </div>
        </section>

        <div class="mt-6 flex items-center gap-3">
          <div class="inline-flex items-center rounded-full border">
            <button type="button" class="p-2 text-matcha disabled:opacity-30" :disabled="quantity <= 1" aria-label="Decrease" @click="quantity--"><Minus class="size-4" /></button>
            <span class="w-7 text-center font-semibold tabular-nums">{{ quantity }}</span>
            <button type="button" class="p-2 text-matcha disabled:opacity-30" :disabled="quantity >= 50" aria-label="Increase" @click="quantity++"><Plus class="size-4" /></button>
          </div>
          <button
            type="button"
            class="btn-primary flex-1"
            :disabled="missing.length > 0"
            @click="emit('add', { ...cleanSelections }, quantity)"
          >
            {{ missing.length ? `Choose ${missing[0].name}` : `Add · ${formatMoney(unitPrice * quantity)}` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
