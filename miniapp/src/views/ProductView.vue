<script setup>
import { computed, reactive, ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Check } from 'lucide-vue-next';
import ProductImage from '../components/ProductImage.vue';
import QuantityStepper from '../components/QuantityStepper.vue';
import { api } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import { hapticSuccess } from '../lib/telegram.js';
import { estimateUnitPrice, useCartStore } from '../stores/cart.js';
import { useCatalogStore } from '../stores/catalog.js';

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();
const cart = useCartStore();

const product = ref(null);
const error = ref('');
const quantity = ref(1);
const selections = reactive({});

watchEffect(async () => {
  const id = route.params.id;
  try {
    product.value = catalog.byId.get(id) ?? (await api(`/products/${id}`));
  } catch (err) {
    error.value = err.message;
    return;
  }
  for (const group of product.value.optionGroups) {
    const defaults = group.choices.filter((c) => c.isDefault).map((c) => c._id);
    selections[group.key] = group.type === 'single' ? (defaults[0] ?? null) : defaults;
  }
});

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
const missing = computed(() => product.value?.optionGroups.filter((g) => g.required && !cleanSelections.value[g.key]) ?? []);
const unitPrice = computed(() => (product.value ? estimateUnitPrice(product.value, cleanSelections.value) : 0));

function addToCart() {
  cart.add(product.value, { ...cleanSelections.value }, quantity.value);
  hapticSuccess();
  router.back();
}
</script>

<template>
  <p v-if="error" class="p-8 text-center text-muted">{{ error }}</p>

  <template v-else-if="product">
    <ProductImage :src="product.imageUrl" :alt="product.name" class="aspect-[4/3] w-full" />

    <div class="p-4">
      <h1 class="text-2xl font-bold">{{ product.name }}</h1>
      <p class="mt-1 text-muted">{{ product.description }}</p>
      <p class="mt-2 text-lg font-semibold text-matcha">{{ formatMoney(product.price) }}</p>
    </div>

    <section v-for="group in product.optionGroups" :key="group._id" class="border-t px-4 py-4">
      <div class="flex items-baseline justify-between">
        <h2 class="font-semibold">{{ group.name }}</h2>
        <span class="text-xs text-muted">{{ group.required ? 'Required' : group.type === 'multiple' ? 'Optional · choose any' : 'Optional' }}</span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="choice in group.choices"
          :key="choice._id"
          type="button"
          class="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm"
          :class="isSelected(group, choice) ? 'border-matcha bg-matcha-soft font-semibold text-matcha-dark' : 'bg-surface'"
          @click="toggle(group, choice)"
        >
          <Check v-if="isSelected(group, choice)" class="size-4" />
          {{ choice.label }}
          <span v-if="choice.priceDelta" class="text-muted">+{{ formatMoney(choice.priceDelta) }}</span>
        </button>
      </div>
    </section>

    <div class="fixed inset-x-0 bottom-0 z-20 border-t bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div class="mx-auto flex max-w-md items-center gap-3">
        <QuantityStepper v-model="quantity" />
        <button class="btn-primary flex-1" :disabled="product.isSoldOut || missing.length > 0" @click="addToCart">
          <template v-if="product.isSoldOut">Sold out</template>
          <template v-else-if="missing.length">Choose {{ missing[0].name }}</template>
          <template v-else>Add to cart · {{ formatMoney(unitPrice * quantity) }}</template>
        </button>
      </div>
    </div>
  </template>
</template>
