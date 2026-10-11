<script setup>
import { Megaphone, ChevronRight } from 'lucide-vue-next';
import ProductCard from '../components/ProductCard.vue';
import { useAuthStore } from '../stores/auth.js';
import { useCatalogStore } from '../stores/catalog.js';

const auth = useAuthStore();
const catalog = useCatalogStore();
</script>

<template>
  <header class="flex items-center gap-3 px-4 pt-5 pb-2">
    <img src="/logo.svg" alt="Weeee Cafe" class="size-11" />
    <div>
      <h1 class="text-xl font-bold text-matcha">Weeee Cafe</h1>
      <p class="text-sm text-muted">Hi {{ auth.user?.firstName || 'there' }}, what are you craving today?</p>
    </div>
  </header>

  <!-- TODO: load announcements from the Promotion collection once promotions are implemented -->
  <section class="mx-4 mt-3 flex items-start gap-3 rounded-2xl bg-matcha p-4 text-white">
    <Megaphone class="mt-0.5 size-5 shrink-0 text-honey" />
    <div>
      <p class="font-semibold">Order ahead, skip the queue</p>
      <p class="text-sm text-white/80">Place your order here and pay with cash when you pick it up at the counter.</p>
    </div>
  </section>

  <section class="mt-5">
    <h2 class="px-4 text-lg font-bold">Categories</h2>
    <div class="mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
      <RouterLink
        v-for="category in catalog.categories"
        :key="category._id"
        :to="{ path: '/menu', query: { category: category._id } }"
        class="shrink-0 rounded-full border bg-surface px-4 py-2 text-sm font-medium"
      >
        {{ category.name }}
      </RouterLink>
    </div>
  </section>

  <section v-if="catalog.popular.length" class="mt-5 px-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold">Popular</h2>
      <RouterLink to="/menu" class="flex items-center text-sm font-medium text-matcha">
        Full menu <ChevronRight class="size-4" />
      </RouterLink>
    </div>
    <div class="mt-2 grid grid-cols-2 gap-3">
      <ProductCard v-for="product in catalog.popular" :key="product._id" :product="product" />
    </div>
  </section>

  <section v-if="catalog.featured.length" class="mt-6 px-4">
    <h2 class="text-lg font-bold">Featured</h2>
    <div class="mt-2 grid grid-cols-2 gap-3">
      <ProductCard v-for="product in catalog.featured" :key="product._id" :product="product" />
    </div>
  </section>
</template>
