import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

const STORAGE_KEY = 'weeee-cart';

function restore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

/** Price shown in the cart. Only an estimate — the server re-prices everything at checkout. */
export function estimateUnitPrice(product, selections) {
  let price = product.price;
  for (const group of product.optionGroups ?? []) {
    const selected = [selections[group.key] ?? []].flat();
    for (const choice of group.choices) if (selected.includes(choice._id)) price += choice.priceDelta;
  }
  return price;
}

function optionLabels(product, selections) {
  return (product.optionGroups ?? []).flatMap((group) => {
    const selected = [selections[group.key] ?? []].flat();
    return group.choices.filter((c) => selected.includes(c._id)).map((c) => c.label);
  });
}

export const useCartStore = defineStore('cart', () => {
  const lines = ref(restore());
  // Idempotency key for "Place Order": stays the same across retries, resets when the cart changes
  const checkoutKey = ref(crypto.randomUUID());

  watch(
    lines,
    (value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      checkoutKey.value = crypto.randomUUID();
    },
    { deep: true },
  );

  function add(product, selections = {}, quantity = 1) {
    // Identical product + options merge into one line
    const key = `${product._id}:${JSON.stringify(selections, Object.keys(selections).sort())}`;
    const existing = lines.value.find((l) => l.key === key);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, 50);
      return;
    }
    lines.value.push({
      key,
      productId: product._id,
      name: product.name,
      imageUrl: product.imageUrl,
      selections,
      optionLabels: optionLabels(product, selections),
      unitPrice: estimateUnitPrice(product, selections),
      quantity,
    });
  }

  function setQuantity(key, quantity) {
    const line = lines.value.find((l) => l.key === key);
    if (!line) return;
    if (quantity <= 0) remove(key);
    else line.quantity = Math.min(quantity, 50);
  }

  function remove(key) {
    lines.value = lines.value.filter((l) => l.key !== key);
  }

  function clear() {
    lines.value = [];
  }

  const count = computed(() => lines.value.reduce((n, l) => n + l.quantity, 0));
  const subtotal = computed(() => lines.value.reduce((n, l) => n + l.unitPrice * l.quantity, 0));
  const orderItems = computed(() =>
    lines.value.map(({ productId, quantity, selections }) => ({ productId, quantity, selections })),
  );

  return { lines, checkoutKey, add, setQuantity, remove, clear, count, subtotal, orderItems };
});
