<script setup>
import { House, Coffee, ShoppingBag, Receipt } from 'lucide-vue-next';
import { useCartStore } from '../stores/cart.js';

const cart = useCartStore();

const items = [
  { to: '/', label: 'Home', icon: House },
  { to: '/menu', label: 'Menu', icon: Coffee },
  { to: '/cart', label: 'Cart', icon: ShoppingBag, badge: true },
  { to: '/orders', label: 'Orders', icon: Receipt },
];
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-20 border-t bg-surface pb-[env(safe-area-inset-bottom)]">
    <div class="mx-auto grid max-w-md grid-cols-4">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="relative flex flex-col items-center gap-0.5 py-2 text-xs text-muted"
        exact-active-class="!text-matcha font-semibold"
      >
        <component :is="item.icon" class="size-6" />
        {{ item.label }}
        <span
          v-if="item.badge && cart.count"
          class="absolute top-1 left-1/2 ml-2 min-w-5 rounded-full bg-honey px-1.5 text-center text-[11px] leading-5 font-bold text-white"
        >
          {{ cart.count }}
        </span>
      </RouterLink>
    </div>
  </nav>
</template>
