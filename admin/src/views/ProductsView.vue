<script setup>
import { computed, onMounted, ref } from 'vue';
import { Plus, Trash2 } from 'lucide-vue-next';
import ConfirmModal from '../components/ConfirmModal.vue';
import { api } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';

const products = ref([]);
const categories = ref([]);
const categoryFilter = ref('');
const error = ref('');

onMounted(async () => {
  try {
    [products.value, categories.value] = await Promise.all([api('/admin/products'), api('/admin/categories')]);
  } catch (err) {
    error.value = err.message;
  }
});

const visible = computed(() =>
  categoryFilter.value ? products.value.filter((p) => p.category?._id === categoryFilter.value) : products.value,
);

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
  deleting.value = true;
  error.value = '';
  try {
    await api(`/admin/products/${toDelete.value._id}`, { method: 'DELETE' });
    products.value = products.value.filter((p) => p._id !== toDelete.value._id);
  } catch (err) {
    error.value = err.message;
  } finally {
    deleting.value = false;
    toDelete.value = null;
  }
}

async function toggle(product, field) {
  error.value = '';
  try {
    const updated = await api(`/admin/products/${product._id}`, { method: 'PATCH', body: { [field]: !product[field] } });
    product[field] = updated[field];
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-2xl font-bold">Products</h1>
    <div class="flex gap-2">
      <select v-model="categoryFilter" class="input w-auto">
        <option value="">All categories</option>
        <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
      </select>
      <RouterLink to="/products/new" class="btn-primary"><Plus class="size-4" /> New product</RouterLink>
    </div>
  </div>
  <p v-if="error" class="mt-4 text-red-700">{{ error }}</p>

  <div class="card mt-4 overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="border-b text-left text-muted">
        <tr>
          <th class="p-3 font-medium">Product</th>
          <th class="p-3 font-medium">Category</th>
          <th class="p-3 text-right font-medium">Price</th>
          <th class="p-3 text-center font-medium">Sold out</th>
          <th class="p-3 text-center font-medium">Active</th>
          <th class="w-12 p-3"><span class="sr-only">Delete</span></th>
        </tr>
      </thead>
      <tbody class="divide-y">
        <tr v-for="p in visible" :key="p._id" :class="{ 'text-muted': !p.isActive }">
          <td class="p-3">
            <RouterLink :to="`/products/${p._id}`" class="font-medium hover:text-matcha">{{ p.name }}</RouterLink>
            <span v-if="p.isPopular" class="ml-2 rounded-full bg-honey px-2 py-0.5 text-[11px] font-bold text-white">Popular</span>
            <span v-if="p.isFeatured" class="ml-1 rounded-full bg-matcha-soft px-2 py-0.5 text-[11px] font-bold text-matcha-ink">Featured</span>
          </td>
          <td class="p-3">{{ p.category?.name }}</td>
          <td class="p-3 text-right tabular-nums">{{ formatMoney(p.price) }}</td>
          <td class="p-3 text-center"><input type="checkbox" class="size-4 accent-honey" :checked="p.isSoldOut" @change="toggle(p, 'isSoldOut')" /></td>
          <td class="p-3 text-center"><input type="checkbox" class="size-4 accent-matcha" :checked="p.isActive" @change="toggle(p, 'isActive')" /></td>
          <td class="p-3 text-right">
            <button class="p-1.5 text-muted hover:text-red-700" :aria-label="`Delete ${p.name}`" @click="toDelete = p"><Trash2 class="size-4" /></button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <ConfirmModal
    :open="Boolean(toDelete)"
    title="Delete product?"
    :message="`“${toDelete?.name}” will be permanently deleted. Past orders keep their details. To hide it from the menu without deleting, untick Active instead.`"
    confirm-label="Delete"
    :busy="deleting"
    @confirm="confirmDelete"
    @cancel="toDelete = null"
  />
</template>
