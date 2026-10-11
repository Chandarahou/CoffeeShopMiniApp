<script setup>
import { ShoppingBag, Trash2 } from 'lucide-vue-next';
import ProductImage from '../components/ProductImage.vue';
import QuantityStepper from '../components/QuantityStepper.vue';
import { formatMoney } from '../lib/format.js';
import { useCartStore } from '../stores/cart.js';

const cart = useCartStore();
</script>

<template>
  <h1 class="px-4 pt-5 text-xl font-bold">Your cart</h1>

  <div v-if="!cart.lines.length" class="flex flex-col items-center gap-3 p-10 text-center text-muted">
    <ShoppingBag class="size-12 text-line" />
    <p>Your cart is empty.</p>
    <RouterLink to="/menu" class="btn-primary">Browse the menu</RouterLink>
  </div>

  <template v-else>
    <ul class="mt-3 space-y-3 px-4">
      <li v-for="line in cart.lines" :key="line.key" class="card flex gap-3 p-3">
        <ProductImage :src="line.imageUrl" :alt="line.name" class="size-16 shrink-0 rounded-xl" />
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <h2 class="font-semibold">{{ line.name }}</h2>
            <button class="p-1 text-muted" :aria-label="`Remove ${line.name}`" @click="cart.remove(line.key)">
              <Trash2 class="size-4" />
            </button>
          </div>
          <p v-if="line.optionLabels.length" class="text-xs text-muted">{{ line.optionLabels.join(' · ') }}</p>
          <div class="mt-2 flex items-center justify-between">
            <QuantityStepper :model-value="line.quantity" :min="0" @update:model-value="cart.setQuantity(line.key, $event)" />
            <span class="font-semibold">{{ formatMoney(line.unitPrice * line.quantity) }}</span>
          </div>
        </div>
      </li>
    </ul>

    <div class="mx-4 mt-4 flex justify-between text-lg font-semibold">
      <span>Subtotal</span>
      <span>{{ formatMoney(cart.subtotal) }}</span>
    </div>

    <div class="mt-4 flex flex-col gap-2 px-4">
      <RouterLink to="/checkout" class="btn-primary">Checkout</RouterLink>
      <RouterLink to="/menu" class="py-2 text-center text-sm font-medium text-matcha">Continue shopping</RouterLink>
    </div>
  </template>
</template>
