<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ProductCard from '../components/ProductCard.vue';
import { useCatalogStore } from '../stores/catalog.js';

const catalog = useCatalogStore();
const route = useRoute();
const router = useRouter();

const activeId = computed(() => route.query.category ?? catalog.categories[0]?._id);
const products = computed(() => catalog.inCategory(activeId.value));

const select = (id) => router.replace({ query: { category: id } });
</script>

<template>
  <div class="sticky top-0 z-10 bg-cream/95 pt-4 backdrop-blur">
    <h1 class="px-4 text-xl font-bold">Menu</h1>
    <div class="mt-3 flex gap-2 overflow-x-auto border-b px-4 pb-3">
      <button
        v-for="category in catalog.categories"
        :key="category._id"
        class="shrink-0 rounded-full px-4 py-2 text-sm font-medium"
        :class="category._id === activeId ? 'bg-matcha text-white' : 'border bg-surface text-ink'"
        @click="select(category._id)"
      >
        {{ category.name }}
      </button>
    </div>
  </div>

  <div v-if="products.length" class="grid grid-cols-2 gap-3 p-4">
    <ProductCard v-for="product in products" :key="product._id" :product="product" />
  </div>
  <p v-else class="p-8 text-center text-muted">Nothing here yet.</p>
</template>
