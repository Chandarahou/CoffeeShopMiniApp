<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Minus, Plus, Search, Trash2, X } from 'lucide-vue-next';
import ProductOptionsModal from '../components/ProductOptionsModal.vue';
import { api } from '../lib/api.js';
import { displayName, formatMoney } from '../lib/format.js';
import { estimateUnitPrice, optionLabels } from '../lib/pricing.js';

const router = useRouter();

const products = ref([]);
const categories = ref([]);
const loadError = ref('');
const search = ref('');
const categoryFilter = ref('');

const lines = ref([]);
const optionsProduct = ref(null);

const customerMode = ref('walkin'); // 'walkin' | 'telegram'
const walkInName = ref('');
const customerQuery = ref('');
const customerResults = ref([]);
const selectedCustomer = ref(null);
const note = ref('');
const paid = ref(false);

const busy = ref(false);
const error = ref('');
// Idempotency key: a double click (or a retry after a lost response) returns the same order.
// It changes whenever the order contents change, so an edited retry is treated as a new order.
const clientOrderId = ref(crypto.randomUUID());
watch([lines, customerMode, selectedCustomer, walkInName, note, paid], () => (clientOrderId.value = crypto.randomUUID()), { deep: true });

onMounted(async () => {
  try {
    [products.value, categories.value] = await Promise.all([api('/admin/products'), api('/admin/categories')]);
  } catch (err) {
    loadError.value = err.message;
  }
});

// Only categories that are switched on are orderable (the server enforces the same rule)
const activeCategories = computed(() => categories.value.filter((c) => c.isActive));
const orderable = computed(() => {
  const ids = new Set(activeCategories.value.map((c) => c._id));
  return products.value.filter((p) => p.isActive && ids.has(p.category?._id));
});
const visibleProducts = computed(() => {
  const q = search.value.trim().toLowerCase();
  return orderable.value.filter(
    (p) => (!categoryFilter.value || p.category._id === categoryFilter.value) && (!q || p.name.toLowerCase().includes(q)),
  );
});

function pick(product) {
  if (product.isSoldOut) return;
  if (product.optionGroups.length) optionsProduct.value = product;
  else addLine(product);
}

function addLine(product, selections = {}, quantity = 1) {
  // The same product with the same options merges into one line
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
    selections,
    labels: optionLabels(product, selections),
    unitPrice: estimateUnitPrice(product, selections),
    quantity,
  });
}

function onOptionsAdd(selections, quantity) {
  addLine(optionsProduct.value, selections, quantity);
  optionsProduct.value = null;
}

function setQuantity(line, quantity) {
  if (quantity <= 0) lines.value = lines.value.filter((l) => l !== line);
  else line.quantity = Math.min(quantity, 50);
}

const total = computed(() => lines.value.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
const itemCount = computed(() => lines.value.reduce((sum, l) => sum + l.quantity, 0));
const needsCustomer = computed(() => customerMode.value === 'telegram' && !selectedCustomer.value);
const canSubmit = computed(() => lines.value.length > 0 && !needsCustomer.value && !busy.value);

// Customer lookup by @username, Telegram ID or name
let searchTimer;
watch(customerQuery, (query) => {
  clearTimeout(searchTimer);
  if (query.trim().length < 2) {
    customerResults.value = [];
    return;
  }
  searchTimer = setTimeout(async () => {
    try {
      customerResults.value = (await api('/admin/customers', { query: { q: query.trim(), limit: 8 } })).customers;
    } catch (err) {
      error.value = err.message;
    }
  }, 250);
});
onUnmounted(() => clearTimeout(searchTimer));

function chooseCustomer(customer) {
  selectedCustomer.value = customer;
  customerQuery.value = '';
  customerResults.value = [];
}

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    const order = await api('/admin/orders', {
      method: 'POST',
      body: {
        clientOrderId: clientOrderId.value,
        items: lines.value.map(({ productId, quantity, selections }) => ({ productId, quantity, selections })),
        note: note.value.trim() || undefined,
        paid: paid.value,
        ...(customerMode.value === 'telegram'
          ? { customerId: selectedCustomer.value._id }
          : { walkInName: walkInName.value.trim() || undefined }),
      },
    });
    router.push(`/orders/${order._id}`);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <RouterLink to="/orders" class="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft class="size-4" /> Orders</RouterLink>
  <h1 class="mt-2 text-2xl font-bold">New order</h1>
  <p class="text-sm text-muted">Enter an order for a customer at the counter. It starts as <strong>confirmed</strong>.</p>

  <p v-if="loadError" class="mt-4 text-red-700">{{ loadError }}</p>

  <div v-else class="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
    <!-- Menu -->
    <section class="space-y-3">
      <div class="relative">
        <Search class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
        <input v-model="search" class="input pl-9" placeholder="Search the menu" />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm font-medium"
          :class="!categoryFilter ? 'border-matcha bg-matcha text-white' : 'bg-surface hover:bg-cream'"
          @click="categoryFilter = ''"
        >
          All
        </button>
        <button
          v-for="c in activeCategories"
          :key="c._id"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm font-medium"
          :class="categoryFilter === c._id ? 'border-matcha bg-matcha text-white' : 'bg-surface hover:bg-cream'"
          @click="categoryFilter = c._id"
        >
          {{ c.name }}
        </button>
      </div>

      <p v-if="!visibleProducts.length" class="card p-6 text-center text-sm text-muted">No products match.</p>
      <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="p in visibleProducts"
          :key="p._id"
          type="button"
          class="card p-3 text-left transition hover:border-matcha disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line"
          :disabled="p.isSoldOut"
          @click="pick(p)"
        >
          <p class="font-medium leading-tight">{{ p.name }}</p>
          <p class="mt-1 text-sm font-semibold text-matcha">{{ formatMoney(p.price) }}</p>
          <p class="mt-0.5 text-xs text-muted">
            {{ p.isSoldOut ? 'Sold out' : p.optionGroups.length ? 'Choose options' : p.category.name }}
          </p>
        </button>
      </div>
    </section>

    <!-- Order summary -->
    <aside class="card space-y-4 p-4 lg:sticky lg:top-4">
      <h2 class="font-semibold">Order <span v-if="itemCount" class="font-normal text-muted">· {{ itemCount }} item{{ itemCount === 1 ? '' : 's' }}</span></h2>

      <p v-if="!lines.length" class="rounded-lg border border-dashed p-4 text-center text-sm text-muted">Tap products on the left to add them.</p>
      <ul v-else class="divide-y">
        <li v-for="line in lines" :key="line.key" class="flex items-start gap-2 py-2 first:pt-0">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">{{ line.name }}</p>
            <p v-if="line.labels.length" class="text-xs text-muted">{{ line.labels.join(' · ') }}</p>
            <div class="mt-1 inline-flex items-center rounded-full border">
              <button type="button" class="p-1.5 text-matcha" aria-label="Decrease" @click="setQuantity(line, line.quantity - 1)"><Minus class="size-3.5" /></button>
              <span class="w-6 text-center text-sm font-semibold tabular-nums">{{ line.quantity }}</span>
              <button type="button" class="p-1.5 text-matcha disabled:opacity-30" :disabled="line.quantity >= 50" aria-label="Increase" @click="setQuantity(line, line.quantity + 1)"><Plus class="size-3.5" /></button>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium tabular-nums">{{ formatMoney(line.unitPrice * line.quantity) }}</p>
            <button type="button" class="mt-1 p-1 text-muted hover:text-red-700" :aria-label="`Remove ${line.name}`" @click="setQuantity(line, 0)"><Trash2 class="size-4" /></button>
          </div>
        </li>
      </ul>

      <div class="flex justify-between border-t pt-3 text-lg font-bold">
        <span>Total</span><span class="tabular-nums">{{ formatMoney(total) }}</span>
      </div>

      <div>
        <p class="label">Customer</p>
        <div class="grid grid-cols-2 gap-1 rounded-lg border p-1 text-sm">
          <button type="button" class="rounded-md px-2 py-1.5 font-medium" :class="customerMode === 'walkin' ? 'bg-matcha text-white' : 'text-muted hover:bg-cream'" @click="customerMode = 'walkin'">Walk-in</button>
          <button type="button" class="rounded-md px-2 py-1.5 font-medium" :class="customerMode === 'telegram' ? 'bg-matcha text-white' : 'text-muted hover:bg-cream'" @click="customerMode = 'telegram'">Telegram customer</button>
        </div>

        <input v-if="customerMode === 'walkin'" v-model="walkInName" class="input mt-2" maxlength="60" placeholder="Name (optional)" />

        <div v-else class="mt-2">
          <div v-if="selectedCustomer" class="flex items-center justify-between gap-2 rounded-lg border bg-matcha-soft p-2 text-sm">
            <div class="min-w-0">
              <p class="truncate font-medium">{{ displayName(selectedCustomer) }}</p>
              <p class="text-xs text-muted">{{ selectedCustomer.firstName }} {{ selectedCustomer.lastName }} · ID {{ selectedCustomer.telegramUserId }}</p>
            </div>
            <button type="button" class="p-1 text-muted hover:text-ink" aria-label="Choose a different customer" @click="selectedCustomer = null"><X class="size-4" /></button>
          </div>
          <template v-else>
            <input v-model="customerQuery" class="input" placeholder="Search @username, Telegram ID or name" />
            <ul v-if="customerResults.length" class="mt-1 divide-y rounded-lg border">
              <li v-for="c in customerResults" :key="c._id">
                <button type="button" class="w-full p-2 text-left text-sm hover:bg-cream" @click="chooseCustomer(c)">
                  <span class="font-medium">{{ displayName(c) }}</span>
                  <span class="block text-xs text-muted">{{ c.firstName }} {{ c.lastName }} · ID {{ c.telegramUserId }}</span>
                </button>
              </li>
            </ul>
            <p v-else-if="customerQuery.trim().length >= 2" class="mt-1 text-xs text-muted">No customers found. Customers appear here after they've opened the Mini App once.</p>
          </template>
        </div>
      </div>

      <div>
        <label class="label" for="note">Note (optional)</label>
        <textarea id="note" v-model="note" class="input" rows="2" maxlength="300" placeholder="e.g. less ice, pick up at 3pm" />
      </div>

      <label class="flex items-start gap-2 rounded-lg bg-honey-soft p-3 text-sm text-amber-900">
        <input v-model="paid" type="checkbox" class="mt-0.5 size-4 accent-matcha" />
        <span><strong>Cash received now.</strong> Tick only if you've already taken the money. Otherwise the order stays unpaid until you mark it paid.</span>
      </label>

      <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
      <button type="button" class="btn-primary w-full" :disabled="!canSubmit" @click="submit">
        {{ busy ? 'Creating…' : needsCustomer ? 'Choose a customer' : !lines.length ? 'Add items first' : `Create order · ${formatMoney(total)}` }}
      </button>
    </aside>
  </div>

  <ProductOptionsModal :product="optionsProduct" @add="onOptionsAdd" @close="optionsProduct = null" />
</template>
